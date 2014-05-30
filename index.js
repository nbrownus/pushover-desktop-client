#!/usr/bin/env node

var ws = require('ws')
  , querystring = require('querystring')
  , https = require('https')
  , Notification = require('node-notifier')
  , path = require('path')
  , notifier = new Notification()
  , iconRoot = 'https://client.pushover.net/icons'
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

if (!settings.deviceId || !settings.secret) {
    console.error('A secret and deviceId must be provided!')
    console.error('View the README at https://github.com/nbrownus/pushover-desktop-client for more info')
    process.exit(1)
}

var connect = function () {
    var client = new ws('wss://client.pushover.net/push')
    client.on('open', function () {
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

var notify = function (messages) {
    var lastMessage

    messages.forEach(function (message) {
        lastMessage = message
        var icon

        if (message.icon) {
            icon = '/' + message.icon + '.png'
        } else if (message.aid === 1) {
            icon = '/pushover.png'
        } else {
            icon = '/default.png'
        }

        var payload = { appIcon: iconRoot + icon }

        payload.title = message.title || 'Pushover'

        if (message.message) {
            payload.message = message.message
        }

        notifier.notify(payload)
    })

    if (lastMessage) {
        updateHead(lastMessage)
    }
}

var updateHead = function (message) {
    console.log('Updating head position')

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
        secret: settings.secret,
        message: message.id
    }) + '\n')

    request.end()
}

connect()
refreshMessages()
