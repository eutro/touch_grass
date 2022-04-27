# Touch Grass

This is the source code for [[https://eutro.dev/touch_grass]], server and client.

# Running
## Setup
Create a file `touch_grass.config.json` in the root directory,
with the following contents:

```json
{
  "port": "<the port to serve on>",
  "apiKey": "<your Google Cloud API key>"
}
```

Where `"apiKey"` is your Google Cloud API key for the [Places
API](https://developers.google.com/maps/documentation/javascript/places).

Install the dependencies:

Build the client js and css files:

```shell
npm run build
```

## Running
To actually run the server:

```shell
npm run start
```
