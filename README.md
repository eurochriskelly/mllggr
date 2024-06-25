# ML Logger Extension for Visual Studio Code

_View log files in real time from the server across multiple hosts in a cluster_

[Visual Studio Code](https://code.visualstudio.com) is a free, cross-platform code editor and development tool from Microsoft. The free, open-source [**ML Logger extension for VS Code**](https://marketplace.visualstudio.com/items?itemName=mllggr.mllggr) integrates real-time log viewing across multiple hosts into this modern development environment.

## Features

* Real-time log file tracking across multiple hosts in a cluster
* Color-coded lines per host for easy data source identification
* Efficient tracking of the last received data

## Getting started

Install this tool using the VS Code built-in [marketplace](https://marketplace.visualstudio.com/items?itemName=mllggr.mllggr). Search “ML Logger” from the Extension tab of the activity bar. Click “Install” to download and install the extension.

### Configuration

The ML Logger extension exposes several configuration options from the standard VS Code `settings.json` file (<kbd>Cmd</kbd>-<kbd>,</kbd>),

```json
{
  "mllggr.hosts": [
    {
      "host": "log-server1.example.com",
      "port": 8080,
      "username": "username",
      "password": "****************"
    },
    {
      "host": "log-server2.example.com",
      "port": 8080,
      "username": "username",
      "password": "****************"
    }
  ],
  "mllggr.refreshInterval": 3000
}
```

### Viewing logs

To view logs in real-time:

1. Open the command palette (<kbd>Shift</kbd>+<kbd>Cmd</kbd>+<kbd>P</kbd>)
2. Select `ML Logger: Start Log Viewer`
3. Choose the host from which you want to start viewing logs

The log output will open in a new document in the current workspace, with color-coded lines per host.

### SSL Configuration

You can turn on SSL with the `mllggr.ssl` configuration property. If the CA is not in your chain of trust (for example, if the certificate is self-signed), you need to point to the CA in your configuration as well using `mllggr.pathToCa`. The configuration will look something like this:

```json
{
  "mllggr.ssl": true,
  "mllggr.pathToCa": "/Users/myself/certs/my.own.ca.crt"
}
```

Alternatively, you can turn off client certificate checks altogether by setting `mllggr.rejectUnauthorized` to `false` in your VS Code configuration. This is less secure but may be useful for situations where you can't obtain or use your own CA.

### Per-log configuration override

You can override your VS Code configured settings by using a block comment as the first language token in a log viewing session. The comment should conform to the following:

- First line includes the string `mllggr:settings`
- The rest of the comment is valid JSON
- Includes at least one of the following keys: `host`, `port`, `user`, `pwd`, `ssl`, `pathToCa`
- The corresponding value should be of the right type for the configuration (number for `port`, boolean for `ssl`, string otherwise)

For example:

```json
/* mllggr:settings
{
  "host": "test-log-server",
  "port": 8090,
  "ssl": true,
  "pathToCa": "/Users/test/certs/test.ca.crt"
}
*/
```

When this configuration is used, it will override VS Code's ML Logger client configuration for the specified host and settings.

## Notes

### Required Privileges for Log Viewing

To view logs with the ML Logger, a user will need access privileges on the log server. Ensure the log server allows the specified user to view logs in real-time.

## Credit

Aside from excellent development and extension support from Visual Studio Code,

- Portions of Josh Johnson's [vscode-xml](https://github.com/DotJoshJohnson/vscode-xml) project are re-used for XML formatting. The MIT license and source code are kept in the `client/xmlFormatting` folder of this project.
- Paxton Hare's [marklogic-sublime](https://github.com/paxtonhare/MarkLogic-Sublime) `xquery-ml.tmLanguage` code is used for XQuery-ML syntax and snippets, and the MarkLogic Sublime project inspired this one.


