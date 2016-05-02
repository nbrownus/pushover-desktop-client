[![Build Status](https://travis-ci.org/nbrownus/pushover-desktop-client.svg)](https://travis-ci.org/nbrownus/pushover-desktop-client)

### About

`pushover-desktop-client` is a tool written in [node.js](https://node.js) to display [Pushover](https://pushover.net)
notifications on your desktop. It uses [node-notifier](https://github.com/mikaelbr/node-notifier) so it should work
with many different desktop notification providers on many different operating systems.

This project uses the Pushover websocket API to receive updates about new notifications. You will need
a license for the [desktop service](https://pushover.net/clients/desktop) to use this project.

### Using it

First install `pushover-desktop-client` globally with `npm`

    npm install -g pushover-desktop-client

The first time the client runs, it will need to login to Pushover and retrieve a User Secret that will be used for all 
future connections.  For your first run, therefore, you must provide your username and password - either in a settings file, 
or as environment variables (easier and more secure):

For example

    PUSHOVER_USER_EMAIL=yourname@example.com PUSHOVER_USER_PASSWORD=password pushover-desktop-client
    
After the first run, the `secret` and `deviceId` needed for future authentication are saved in your settings file at `~/.config/pushover-dc/settings.json`
You can override the location of the settings file with the `PUSHOVER_SETTINGS_PATH` environment variable.

Alternatively you can use `PUSHOVER_DEVICE_ID`, `PUSHOVER_SECRET`, `PUSHOVER_IMAGE_CACHE` instead of using the settings
file at all.

For all future executions, you just need to run:

    pushover-desktop-client

### Running as a service on OSX

I use `launchd` to keep this thing running and in the background.

Install the plist below in `~/Library/LaunchAgents/com.github.nbrownus.pushover-desktop-client.plist`

Make sure to replace `{YOUR_USERNAME_HERE}` with your username

    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>com.github.nbrownus.pushover-desktop-client.plist</string>
        <key>OnDemand</key>
        <false/>
        <key>ProgramArguments</key>
        <array>
          <string>/usr/local/bin/node</string>
          <string>/usr/local/share/npm/bin/pushover-desktop-client</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
        <key>ServiceDescription</key>
        <string>Pushover Desktop Client</string>
        <key>ServiceIPC</key>
        <false/>
        <key>StandardErrorPath</key>
        <string>/Users/{YOUR_USERNAME_HERE}/Library/Logs/PushoverDesktopClient/output.log</string>
        <key>StandardOutPath</key>
        <string>/Users/{YOUR_USERNAME_HERE}/Library/Logs/PushoverDesktopClient/output.log</string>
      </dict>
    </plist>

Make sure the log directory exists

    mkdir -p ~/Library/Logs/PushoverDesktopClient/

Then load the plist

    launchctl load ~/Library/LaunchAgents/com.github.nbrownus.pushover-desktop-client.plist

All done!

### TODO:

Support the custom sound bytes
