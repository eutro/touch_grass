const axios = require('axios');
const http = require('http');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');

const isDev = !!process.env.TOUCH_GRASS_DEV;
const cfg = JSON.parse(fs.readFileSync("touch_grass.config.json"))
const port = cfg.port;
const placesKey = cfg.apiKey;
const placesRoot = "https://maps.googleapis.com/maps/api/place";

const app = express();

app.get("/touch_grass$", (req, res) => {
  res.writeHead(301, { 'Location': `http://${req.headers.host}/touch_grass/` });
  res.end();
})

app.get(/(\/touch_grass)?\/main.css$/, fileLoader("dist/main.css", "text/css"));
app.get(/(\/touch_grass)?\/touch_grass_2022-09-19.js$/, fileLoader("dist/bundle.js", "text/javascript"));
app.post(/(\/touch_grass)?\/grass.json$/, bodyParser.json(), errorHandling(grassLoader));
app.get(/(\/touch_grass)?\/(index.html)?$/, fileLoader("client/index.html", "text/html"));
app.get(/.*/, (req, res) => res.status(404).send("Not Found"));

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send("Internal Server Error")
})

console.log(
  isDev
    ? "Running in development mode, files will be synchronously re-read for each request."
    : "Running in production mode, files will be stored in memory."
)
app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});

function errorHandling(f) {
  return async (req, res, next) => {
    try {
      await f(req, res, next);
    } catch (e) {
      next(e);
    }
  }
}

function fileLoader(path, mime) {
  let thunk;
  if (isDev) {
    fs.readFileSync(path); // make sure it exists
    thunk = () => fs.readFileSync(path); // reload every time
  } else {
    const contents = fs.readFileSync(path);
    thunk = () => contents;
  }
  return (req, res) => {
    res.writeHead(200, {"Content-Type": mime});
    res.write(thunk());
    res.end();
  };
}

async function grassLoader(req, res, next) {
  const { longitude, latitude } = req.body;
  if (!longitude
      || !latitude
      || !isFinite(longitude)
      || !isFinite(latitude)) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    res.write("400 Bad Request");
    res.end();
  } else {
    const parks = await getParks(longitude, latitude);
    if (parks.status === 200) {
      if (parks.data.status === "ZERO_RESULTS" || parks.data.status === "OK") {
        res.writeHead(200, {"Content-Type": "text/json"});
        res.write(JSON.stringify({
          parks: parks.data.results,
          status: parks.data.status,
        }));
        res.end();
      } else {
        throw new Error(`Grass location failed: ${JSON.stringify(parks.data, 2)}`);
      }
    } else {
      throw new Error(`Grass location failed, status: ${parks.status}`);
    }
  }
}

async function getParks(longitude, latitude) {
  let url = `${placesRoot}/nearbysearch/json?location=${latitude}%2C${longitude}&rankby=distance&type=park&key=${placesKey}`;
  return await axios.get(url);
}
