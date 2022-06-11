const axios = require('axios');
const http = require('http');
const fs = require('fs');

let isDev = !!process.env.TOUCH_GRASS_DEV;
let cfg = JSON.parse(fs.readFileSync("touch_grass.config.json"))
let port = cfg.port;
let placesKey = cfg.apiKey;
let placesRoot = "https://maps.googleapis.com/maps/api/place";

function fileLoader(path, mime) {
  let thunk;
  if (isDev) {
    fs.readFileSync(path); // make sure it exists
    thunk = () => fs.readFileSync(path); // reload every time
  } else {
    const contents = fs.readFileSync(path);
    thunk = () => contents;
  }
  return async (res, params) => {
    res.writeHead(200, {"Content-Type": mime});
    res.write(thunk());
    res.end();
  };
}

async function grassLoader(res, params) {
  let sparams = new URLSearchParams(params);
  let longitude = sparams.get("longitude");
  let latitude = sparams.get("latitude");
  if (!longitude || !latitude) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    res.write("400 Bad Request");
    res.end();
  } else {
    let parks = await getParks(longitude, latitude);
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

const index = fileLoader("client/index.html", "text/html");
const endpoints = new Map([
  ["", index], ["/", index], ["/index.html", index],
  ["/main.css", fileLoader("dist/main.css", "text/css")],
  ["/index.js", fileLoader("dist/bundle.js", "text/javascript")],
  ["/grass.json", grassLoader],
]);

async function getParks(longitude, latitude) {
  let url = `${placesRoot}/nearbysearch/json?location=${latitude}%2C${longitude}&rankby=distance&type=park&key=${placesKey}`;
  return await axios.get(url);
}

let server = http.createServer(async function(req, res) {
  try {
    let [path, params] = req.url.split("?", 2);
    if (path === "/touch_grass") {
      res.writeHead(301, { 'Location': `http://${req.headers.host}/touch_grass/` });
      res.end();
    } else {
      let endpoint = endpoints.get(path);
      if (endpoint) {
        await endpoint(res, params);
      } else {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not Found");
        res.end();
      }
    }
  } catch(e) {
    res.writeHead(504, {"Content-Type": "text/plain"});
    res.write("504 Internal Server Error");
    res.end();
    console.error(e);
  }
});

console.log(
  isDev
    ? "Running in development mode, files will be synchronously re-read for each request."
    : "Running in production mode, files will be stored in memory."
)
server.listen(port);
console.log(`Listening on port: ${port}`);
