### About

`pushover-desktop-client` is a tool written in [node.js](https://node.js) to display [Pushover](https://pushover.net)
notifications on your desktop. It uses [node-notifier](https://github.com/mikaelbr/node-notifier) so it should work
with many different desktop notification providers on many different operating systems. 
 
This project uses the undocumented Pushover websocket API to receive notifications about new notifications. You may need
to paying to enable the [desktop service](https://pushover.net/clients/desktop) to use this project.

### Using it

First install `pushover-desktop-client` with `npm`

    npm install pushover-desktop-client
    
Then set up your settings file at `~/.pdc-settings.json`

    {
        "secret": "secret obtained from pushover.net"
      , "deviceId": "device id obtained from pushover.net"
    }

You can override the location of the settings file with the `PUSHOVER_SETTINGS_PATH` environment variable.

Alternatively you can use `PUSHOVER_DEVICE_ID` and `PUSHOVER_SECRET` instead of using the settings file at all.

Now you are ready to run:

    pushover-desktop-client
    
### Finding Your deviceId and secret

I had to find mine by viewing the source over at the [desktop web client](https://client.pushover.net). At the time they
were at the bottom of the file in the variables `Pushover.deviceId` and `Pushover.userSecret`
    
### Known Issues

`terminal-notifier` on some versions of OSX 10.9 will not display the specified icon
 
 ### TODO:
 
 Support the custom sound bytes