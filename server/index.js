const axios = require('axios');
const http = require('http');
const fs = require('fs');

let cfg = JSON.fromString(fs.readFileSync("touch_grass.config.json"))
let port = cfg.port;
let placesKey = cfg.apiKey;
let placesRoot = 'https://maps.googleapis.com/maps/api/place';

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
      return;
    }
    if (path.startsWith("/touch_grass")) {
      path = path.substr("/touch_grass".length);
    }
    if (path === '' || path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' }); 
      res.write(fs.readFileSync('client/index.html'));
      res.end();    
    } else if (path === '/index.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' }); 
      res.write(fs.readFileSync('dist/bundle.js'));
      res.end();
    } else if (path === '/main.css') {
      res.writeHead(200, { 'Content-Type': 'text/css' }); 
      res.write(fs.readFileSync('dist/main.css'));
      res.end();
    } else if (path === '/grass.json') {
      let sparams = new URLSearchParams(params);
      let longitude = sparams.get("longitude");
      let latitude = sparams.get("latitude");
      if (!longitude || !latitude) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write("400 Bad Request");
        res.end();
      } else {
        let parks = await getParks(longitude, latitude);
        if (parks.status === 200) {
          res.writeHead(200, { 'Content-Type': 'text/json' });
          res.write(JSON.stringify({
            parks: parks.data.results,
            status: parks.data.status,
          }));
          res.end();
        } else {
          console.error(parks);
          res.writeHead(504, { 'Content-Type': 'text/plain' });
          res.write("504 Internal Server Error");
          res.end();
        }
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.write("404 Not Found");
      res.end();
    }
  } catch(e) {
    res.writeHead(504, { 'Content-Type': 'text/plain' });
    res.write("504 Internal Server Error");
    res.end();
    console.error(e);
  }
});

server.listen(port);
console.log(`Listening on port: ${port}`);
