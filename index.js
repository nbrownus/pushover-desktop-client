#!/usr/bin/env node

var ws = require('ws')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , querystring = require('querystring')
  , https = require('https')
  , Notification = require('node-notifier')
  , path = require('path')
  , notifier = new Notification()
  , iconHost = 'client.pushover.net'
  , apiHost = 'api.pushover.net'
  , apiPath = '/1'
  , settingsPath = process.env.PUSHOVER_SETTINGS_PATH || path.resolve(process.env.HOME, './.pdc-settings.json')
  , settings = {}

try {
    console.log('Attempting to load settings from', settingsPath)
    settings = require(settingsPath)
} catch (error) {
    //Ignoring the error, hopefully we have env vars
}

settings.deviceId = process.env.PUSHOVER_DEVICE_ID || settings.deviceId
settings.secret = process.env.PUSHOVER_SECRET || settings.secret
settings.imageCache = process.env.PUSHOVER_IMAGE_CACHE || settings.imageCache

if (!settings.deviceId || !settings.secret) {
    console.error('A secret and deviceId must be provided!')
    console.error('View the README at https://github.com/nbrownus/pushover-desktop-client for more info')
    process.exit(1)
}

if (settings.imageCache) {
    console.log('Initializing image cache directory', settings.imageCache)
    mkdirp.sync(settings.imageCache, '0755')
} else {
    console.log('No image cache directory specified')
}

/**
 * Handles the websocket connection
 * Sets up triggered message refreshing as well as an initial refresh to ensure we haven't missed anything
 */
var connect = function () {
    var client = new ws('wss://client.pushover.net/push')

    client.on('open', function () {
        refreshMessages()
        console.log('Websocket client connected, waiting for new messages')
        client.send('login:' + settings.deviceId + ':' + settings.secret + '\n')
    })

    client.on('message', function (event) {
        var message = event.toString('utf8')

        //New message
        if (message === '!') {
            console.log('Got new message event')
            return refreshMessages()
        }

        console.error('Unknown message:', message)
    })

    client.on('close', function () {
        console.log('Websocket connection closed, reconnecting')
        connect()
    })
}

/**
 * Makes an https request to Pushover to get all messages we haven't seen yet
 * Notifications will be generated for any new messages
 */
var refreshMessages = function () {
    console.log('Refreshing messages')
    var options = {
        host: apiHost
      , method: 'GET'
      , path: apiPath + '/messages.json?' + querystring.stringify({ secret: settings.secret, device_id: settings.deviceId })
    }

    var request = https.request(options, function (response) {
        var finalData = ''

        response.on('data', function (data) {
            finalData += data.toString()
        })

        response.on('end', function () {
            if (response.statusCode !== 200) {
                console.error('Error while refreshing messages')
                console.error(finalData)
                return
            }

            try {
                var payload = JSON.parse(finalData)
                notify(payload.messages)
            } catch (error) {
                console.error('Failed to parse message payload')
                console.error(error.stack || error)
            }
        })

    })

    request.on('error', function (error) {
        console.error('Error while refreshing messages')
        console.error(error.stack || error)
    })

    request.end()
}

/**
 * Takes a list of message, prepares them, and sends to the notify subsystem
 * After all notifications are processed updateHead is called to clear them from Pushover for the configured deviceId
 *
 * @param {PushoverMessage[]} messages A list of pushover message objects
 */
var notify = function (messages) {
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

        fetchImage(icon, function (imageFile) {
            var payload = { appIcon: imageFile }

            payload.title = message.title || message.app

            if (message.message) {
                payload.message = message.message
            }

            console.log('Sending notification for', message.id)
            notifier.notify(payload)
        })
    })

    if (lastMessage) {
        updateHead(lastMessage)
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
var fetchImage = function (imageName, callback) {
    if (!settings.imageCache) {
        return callback(false)
    }

    var imageFile = path.join(settings.imageCache, imageName)
    if (fs.existsSync(imageFile)) {
        return callback(imageFile)
    }

    console.log('Caching image for', imageName)

    var options = {
        host: iconHost
      , method: 'GET'
      , path: '/icons/' + imageName
    }

    var request = https.request(options, function (response) {
        try {
            response.pipe(fs.createWriteStream(imageFile))
        } catch (error) {
            console.error('Error while caching image', imageName)
            console.error(error.stack || error)
            return callback(false)
        }

        response.on('end', function () {
            if (response.statusCode !== 200) {
                console.error('Error while caching image', imageName)
                return callback(false)
            }

            callback(imageFile)
        })

    })

    request.on('error', function (error) {
        console.error('Error while caching image', imageName)
        console.error(error.stack || error)
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
var updateHead = function (message) {
    console.log('Updating head position to', message.id)

    var options = {
        host: apiHost
      , method: 'POST'
      , path: apiPath + '/devices/' + settings.deviceId + '/update_highest_message.json'
    }

    var request = https.request(options, function (response) {
        var finalData = ''

        response.on('data', function (data) {
            finalData += data.toString()
        })

        response.on('end', function () {
            if (response.statusCode !== 200) {
                console.error('Error while updating head')
                console.error(finalData)
            }
        })

    })

    request.on('error', function (error) {
        console.error('Error while refreshing messages')
        console.error(error.stack || error)
    })

    request.write(querystring.stringify({
        secret: settings.secret
      , message: message.id
    }) + '\n')

    request.end()
}

connect()

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
