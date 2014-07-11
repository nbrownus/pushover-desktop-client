var ws = require('ws')
  , fs = require('fs')
  , querystring = require('querystring')
  , https = require('https')
  , Notification = require('node-notifier')
  , path = require('path')

var Client = function (settings) {
    this.settings = settings

    this.notifier = new Notification()
    this.https = settings.https || https
    this.logger = settings.logger || console
}

module.exports = Client

/**
 * Handles the websocket connection
 * Sets up triggered message refreshing as well as an initial refresh to ensure we haven't missed anything
 */
Client.prototype.connect = function () {
    var self = this

    self.wsClient = new ws(self.settings.wsHost)

    self.wsClient.on('open', function () {
        self.refreshMessages()
        self.logger.log('Websocket client connected, waiting for new messages')
        self.wsClient.send('login:' + self.settings.deviceId + ':' + self.settings.secret + '\n')
    })

    self.wsClient.on('message', function (event) {
        var message = event.toString('utf8')

        //New message
        if (message === '!') {
            self.logger.log('Got new message event')
            return self.refreshMessages()
        }

        self.logger.error('Unknown message:', message)
    })

    self.wsClient.on('close', function () {
        self.logger.log('Websocket connection closed, reconnecting')
        self.connect()
    })
}

/**
 * Makes an https request to Pushover to get all messages we haven't seen yet
 * Notifications will be generated for any new messages
 */
Client.prototype.refreshMessages = function () {
    var self = this

    self.logger.log('Refreshing messages')


    var options = {
        host: self.settings.apiHost
      , method: 'GET'
      , path: self.settings.apiPath + '/messages.json?' + querystring.stringify({
            secret: self.settings.secret
          , device_id: self.settings.deviceId
        })
    }

    var request = self.https.request(options, function (response) {
        var finalData = ''

        response.on('data', function (data) {
            finalData += data.toString()
        })

        response.on('end', function () {
            if (response.statusCode !== 200) {
                self.logger.error('Error while refreshing messages')
                self.logger.error(finalData)
                return
            }

            try {
                var payload = JSON.parse(finalData)
                self.notify(payload.messages)
            } catch (error) {
                self.logger.error('Failed to parse message payload')
                self.logger.error(error.stack || error)
            }
        })

    })

    request.on('error', function (error) {
        self.logger.error('Error while refreshing messages')
        self.logger.error(error.stack || error)
    })

    request.end()
}

/**
 * Takes a list of message, prepares them, and sends to the notify subsystem
 * After all notifications are processed updateHead is called to clear them from Pushover for the configured deviceId
 *
 * @param {PushoverMessage[]} messages A list of pushover message objects
 */
Client.prototype.notify = function (messages) {
    var lastMessage

    messages.forEach(function (message) {
        lastMessage = message
        var icon

        if (message.icon) {
            icon = message.icon + '.png'
        } else if (message.aid === 1) {
            icon = 'pushover.png'
        } else {
            icon = 'default.png'
        }

        self.fetchImage(icon, function (imageFile) {
            var payload = { appIcon: imageFile }

            payload.title = message.title || message.app

            if (message.message) {
                payload.message = message.message
            }

            self.logger.log('Sending notification for', message.id)
            self.notifier.notify(payload)
        })
    })

    if (lastMessage) {
        self.updateHead(lastMessage)
    }
}

/**
 * Fetches an image from Pushover and stuffs it in a cache dir
 * If the image already exists in the cache dir the fetch is skipped
 *
 * @param {String} imageName The name of the image, from the message object
 * @param {FetchCallback} callback A function to call once this has completed, the image path is provided or false if no
 *      image could be fetched
 */
Client.prototype.fetchImage = function (imageName, callback) {
    var self = this

    if (!self.settings.imageCache) {
        return callback(false)
    }

    var imageFile = path.join(self.settings.imageCache, imageName)
    if (fs.existsSync(imageFile)) {
        return callback(imageFile)
    }

    self.logger.log('Caching image for', imageName)

    var options = {
        host: self.settings.iconHost
      , method: 'GET'
      , path: '/icons/' + imageName
    }

    var request = self.https.request(options, function (response) {
        try {
            response.pipe(fs.createWriteStream(imageFile))
        } catch (error) {
            self.logger.error('FS error while caching image', imageName)
            self.logger.error(error.stack || error)
            return callback(false)
        }

        response.on('end', function () {
            if (response.statusCode !== 200) {
                self.logger.error('HTTP error while caching image', imageName, 'statusCode:', response.statusCode)
                return callback(false)
            }

            callback(imageFile)
        })

    })

    request.on('error', function (error) {
        self.logger.error('Request error while caching image', imageName)
        self.logger.error(error.stack || error)
        callback(false)
    })

    request.end()
}

/**
 * Updates the last seen message with Pushover
 * Any messages below this id will *not* be re-synced
 *
 * @param {PushoverMessage} message The last message received from an update
 */
Client.prototype.updateHead = function (message) {
    var self = this

    self.logger.log('Updating head position to', message.id)

    var options = {
        host: self.settings.apiHost
      , method: 'POST'
      , path: self.settings.apiPath + '/devices/' + self.settings.deviceId + '/update_highest_message.json'
    }

    var request = self.https.request(options, function (response) {
        var finalData = ''

        response.on('data', function (data) {
            finalData += data.toString()
        })

        response.on('end', function () {
            if (response.statusCode !== 200) {
                self.logger.error('Error while updating head')
                self.logger.error(finalData)
            }
        })

    })

    request.on('error', function (error) {
        self.logger.error('Error while refreshing messages')
        self.logger.error(error.stack || error)
    })

    request.write(querystring.stringify({
        secret: self.settings.secret
      , message: message.id
    }) + '\n')

    request.end()
}

/**
 * A Pushover message
 * Contains everything needed to prepare and display a notification
 *
 * @typedef {Object} PushoverMessage
 *
 * @property {Number} id Unique ID of the message
 * @property {String} message Actual message to be displayed
 * @property {String} app Name of the app that send the message
 * @property {Number} aid Id of the app that sent the message
 * @property {String} icon Name of the icon for the app that sent the message.
 *      Seems to always be a png on Pushovers servers
 * @property {Number} date Unix time stamp representing the date the message was sent
 * @property {Number} priority Message priority
 * @property {Number} acked Whether or not the message has been acked by some other client
 * @property {Number} umid No idea
 */

/**
 * @callback FetchCallback
 *
 * @param {String|boolean} Either the path to the image on disk or false if no image could be provided
 */
