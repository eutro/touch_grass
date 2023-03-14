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
app.get(/(\/touch_grass)?\/touch_grass_2022-10-06.js$/, fileLoader("dist/bundle.js", "text/javascript"));
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
  const { longitude, latitude, what } = req.body;
  let parks = undefined;
  if (!longitude
      || !latitude
      || !isFinite(longitude)
      || !isFinite(latitude)
      || !(parks = await getNearby(longitude, latitude, what))) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    if (parks === undefined) {
      res.write("400 Bad Request");
    } else {
      res.write("Unsupported type");
    }
    res.end();
  } else {
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

const placeTypes = new Set(
  `accounting airport amusement_park aquarium art_gallery atm bakery
  bank bar beauty_salon bicycle_store book_store bowling_alley
  bus_station cafe campground car_dealer car_rental car_repair
  car_wash casino cemetery church city_hall clothing_store
  convenience_store courthouse dentist department_store doctor
  drugstore electrician electronics_store embassy fire_station florist
  funeral_home furniture_store gas_station gym hair_care
  hardware_store hindu_temple home_goods_store hospital
  insurance_agency jewelry_store laundry lawyer library
  light_rail_station liquor_store local_government_office locksmith
  lodging meal_delivery meal_takeaway mosque movie_rental
  movie_theater moving_company museum night_club painter park parking
  pet_store pharmacy physiotherapist plumber police post_office
  primary_school real_estate_agency restaurant roofing_contractor
  rv_park school secondary_school shoe_store shopping_mall spa stadium
  storage store subway_station supermarket synagogue taxi_stand
  tourist_attraction train_station transit_station travel_agency
  university veterinary_care zoo`
    .split(/\s+/));

function unplural(what) {
  if (what.endsWith("ies")) {
    return what.substring(0, what.length - 3) + "y";
  } else if (what.endsWith("s")) {
    return what.substring(0, what.length - 1);
  }
  return what;
}

async function getNearby(longitude, latitude, what) {
  let gmapType;
  if (what === "grass") gmapType = "park";
  else {
    what = unplural(what);
    if (placeTypes.has(what)) gmapType = what;
    else if (what === "vet") gmapType = "veterinary_care";
    else return false;
  }
  let url = `${placesRoot}/nearbysearch/json?location=`
      + `${latitude}%2C${longitude}&rankby=distance&type=${gmapType}&key=${placesKey}`;
  return await axios.get(url);
}
