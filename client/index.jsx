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

const Grass = ({coords, grass}) => {
  const { name, plus_code, geometry: { location } } = grass;

  const generateLink = () =>  {
    const plus = plus_code ? "+" + plus_code.compound_code : "";
    return `https://www.google.com/maps/search/${name}${plus}`;
  }

  const computeDistance = () => {
    const srcLoc = coords;
    const destLoc = location;
    if (!srcLoc || !destLoc) return 0;
    const {longitude: lon1, latitude: lat1} = srcLoc;
    const {longitude: lat2, latitude: lon2} = srcLoc;

    return getDistance(lat1, lon1, lat2, lon2);
  }

  return (
    <a className="p-2 bg-green-500 hover:bg-green-600 rounded-lg w-full"
       tabIndex="1"
       href={generateLink()}
       target="_blank">
      <div className="flex flex-row">
        <span className="text-left grow">{name}</span>
        <span className="text-right basis-1/4">({computeDistance().toFixed(0)}m)</span>
      </div>
    </a>
  );
}

const GrassList = ({coords, grass: { parks } }) => {
  if (parks?.length === 0) {
    return (
      <div>
        <h2 className="p-2 text-2xl">
          We couldn't find any grass nearby, sorry about that.
        </h2>
      </div>
    );
  }
  return (
    <div className="my-2">
      <h2 className="pb-2 text-2xl">Grass near you</h2>
      <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-1">
        {parks?.map((grass, i) =>
          <Grass key={i}
                 coords={coords}
                 grass={grass} />)}
      </div>
    </div>
  );
}

const Root = () => {
  const [coords, setCoords] = useState({});
  const [error, setError] = useState("");
  const [grass, setGrass] = useState({});
  const [loading, setLoading] = useState(false);

  const locateGrass = () => {
    if (navigator.geolocation) {
      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;

          setCoords(position.coords)

          fetch(`grass.json?longitude=${longitude}&latitude=${latitude}`)
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
              setGrass(grass);
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
      <h1 className="p-2 text-3xl">Touch grass</h1>
      {grass && <GrassList coords={coords} grass={grass} />}
      {error &&
       (error === true ?
        (<div className="my-2 lg:w-1/2 md:w-2/3 mx-auto text-left">
           <p className="text-lg text-red-600">
             Grass location failed: You denied geolocation
           </p>
           <p>
             This may come as a huge shock to you, but I do, in fact,
             need to know your location in order to tell you where <b>nearby</b> grass is.
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
        (<p className="p-2 text-red-600">Grass location failed: {error}</p>))}
      <button className={(loading ? "cursor-wait animate-pulse bg-blue-700" : "bg-blue-700 hover:bg-blue-800")
                         + " p-2 text-white rounded-full w-full"}
              onClick={loading ? null : locateGrass}>
          {loading ? "Locating nearby grass..." : "Locate nearby grass"}
      </button>
    </section>
  );

}

window.addEventListener("load", function() {
  let root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<Root />);
});
