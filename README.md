### About

`pushover-desktop-client` is a tool written in [node.js](https://node.js) to display [Pushover](https://pushover.net)
notifications on your desktop. It uses [node-notifier](https://github.com/mikaelbr/node-notifier) so it should work
with many different desktop notification providers on many different operating systems.

This project uses the undocumented Pushover websocket API to receive notifications about new notifications. You may need
to paying to enable the [desktop service](https://pushover.net/clients/desktop) to use this project.

### Using it

First install `pushover-desktop-client` globally with `npm`

    npm install -g pushover-desktop-client

Then set up your settings file at `~/.pdc-settings.json`

    {
        "secret": "secret obtained from pushover.net"
      , "deviceId": "device id obtained from pushover.net"
      , "imageCache": "path to a directory to store app icons"
    }

You can override the location of the settings file with the `PUSHOVER_SETTINGS_PATH` environment variable.

Alternatively you can use `PUSHOVER_DEVICE_ID`, `PUSHOVER_SECRET`, `PUSHOVER_IMAGE_CACHE` instead of using the settings
file at all.

Now you are ready to run:

    pushover-desktop-client

### Finding Your deviceId and secret

I had to find mine by viewing the source over at the [desktop web client](https://client.pushover.net). At the time they
were at the bottom of the file in the variables `Pushover.deviceId` and `Pushover.userSecret`

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
