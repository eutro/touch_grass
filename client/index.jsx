import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function getDistance(lat1, lon1, lat2, lon2) {
  // http://www.movable-type.co.uk/scripts/latlong.html
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}

function gmapLink(params) {
  // see https://developers.google.com/maps/documentation/urls/get-started
  return "https://www.google.com/maps/search/?" + new URLSearchParams({ api: 1, ...params });
}

function googleGrass({ name, place_id, geometry: { location: { lat, lng } } }) {
  return {
    name,
    link: gmapLink({ query: name, query_place_id: place_id }),
    loc: [lat, lng],
  };
}

const Grass = ({coords, grass: { name, loc, link }}) => {
  const computeDistance = () => {
    if (!coords || !loc) return 0;
    const { latitude: lat1, longitude: lon1 } = coords;
    const [lat2, lon2] = loc;
    return getDistance(lat1, lon1, lat2, lon2);
  }
  return (
    <a className="p-2 bg-green-500 hover:bg-green-600 rounded-lg w-full"
       title={`${name} on Google Maps`}
       tabIndex="1"
       href={link}>
      <div className="flex flex-row">
        <span className="text-left grow">{name}</span>
        <span className="text-right basis-1/4">({computeDistance().toFixed(0)}m)</span>
      </div>
    </a>
  );
}

const GrassList = ({coords, grass: { parks }, nearYou }) => {
  if (parks?.length === 0) {
    return (
      <div>
        <h2 className="p-2 text-2xl text-red-600">
          No results. Sorry about that.
        </h2>
      </div>
    );
  }
  return (
    <div className="my-2">
      <h2 className="pb-2 text-2xl">{nearYou}</h2>
      <div className={`grid ${parks.length > 1 ? "sm:grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-1`}>
        {parks?.map((grass, i) =>
          <Grass key={i}
                 coords={coords}
                 grass={grass} />)}
      </div>
    </div>
  );
}

function upcase(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.substring(1);
}

function whatReadable(str) {
  return str.split("_").join(" ");
}

function plural(str) {
  switch (str) {
  case "accounting": case "grass": case "hair care": case "laundry": case "lodging":
  case "meal delivery": case "meal takeaway": case "parking": case "police": case "storage":
  case "veterinary care":
  case "me": case "you": case "her": case "him": case "them": case "it": case "us":
    return str;
  }
  if (str.endsWith("s")) return str;
  if (str.endsWith("y")) {
    return str.substring(0, str.length - 1) + "ies";
  } else if (str.endsWith("sh") || str.endsWith("ch")) {
    return str + "es";
  }
  return str + "s";
}

const Root = () => {
  const [error, setError] = useState(null);
  const [{coords, grass}, setGrass] = useState({coords: null, grass: null});
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const what = params.get("what") ?? "grass";
  const whatR = plural(whatReadable(what));
  const title = params.get("title") ?? `Touch ${whatR}`;
  const nearby = params.get("locate") ?? `nearby ${whatR}`;
  const nearYou = params.get("nearYou") ?? `${upcase(whatR)} near you`;
  const preloaded = (() => {
    let preStr = params.get("preload");
    if (!preStr) return null;
    try {
      preStr = atob(preStr);
    } catch (ignored) {}
    try {
      const parsed = JSON.parse(preStr);
      parsed[0];
      return { ok: parsed };
    } catch (err) {
      return { err: err.message }
    }
  })();

  const locateGrass = () => {
    if (navigator.geolocation) {
      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          if (preloaded) {
            setLoading(false);
            if ("ok" in preloaded) {
              setError(null);
              setGrass({
                grass: { parks: preloaded.ok },
                coords: position.coords,
              });
            } else if ("err" in preloaded) {
              setError(preloaded.err);
            }
            return;
          }
          fetch("grass.json", {
            method: "post",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ longitude, latitude, what }),
          })
            .then(resp => {
              if (resp.status !== 200) {
                return resp.text().then(text => {
                  throw Error(text)
                });
              } else {
                return resp.json();
              }
            })
            .then(grass => {
              setLoading(false);
              setError(null);
              setGrass({
                grass: { parks: grass.parks.map(googleGrass) },
                coords: position.coords,
              });
            })
            .catch(err => {
              setLoading(false);
              setError(err.message);
            });
        },
        (err) => {
          setLoading(false);
          if (err.code === 1) { // PERMISSION_DENIED
            setError(true);
          } else {
            setError(err.message);
          }
        }
      );
    } else {
      setError("Your browser doesn't support geolocation.");
    }
  };

  return (
    <section className="p-4 container mx-auto text-center">
      <h1 className="p-2 text-3xl">{title}</h1>
      {grass && <GrassList coords={coords} grass={grass} nearYou={nearYou} />}
      {error &&
       (error === true ?
        (<div className="my-2 lg:w-1/2 md:w-2/3 mx-auto text-left">
           <p className="text-lg text-red-600">
             {upcase(whatR)} location failed: You denied geolocation
           </p>
           <p>
             This may come as a huge shock to you, but I do, in fact,
             need to know your location in order to find you <b>nearby</b> {whatR}.
           </p>
           <p>
             I don't store your location, but if you don't trust me,
             you can take a look at
             the <a href="https://github.com/eutro/touch_grass"
                    className="text-blue-600 hover:text-blue-800">
                   source code
                 </a> and/or
             run this yourself.
           </p>
           <p>
             You might have to refresh the page to try again.
           </p>
         </div>) :
        (<p className="p-2 text-red-600">{upcase(whatR)} location failed: {error}</p>))}
      <button className={(loading ? "cursor-wait animate-pulse bg-blue-700" : "bg-blue-700 hover:bg-blue-800")
                         + " p-2 text-white rounded-full w-full"}
              onClick={loading ? null : locateGrass}>
          {loading ? `Locating ${nearby}...` : `Locate ${nearby}`}
      </button>
    </section>
  );
}

window.addEventListener("load", function() {
  let root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<Root />);
});
