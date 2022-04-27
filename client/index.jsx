import React from 'react';
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

class Grass extends React.Component {
  generateLink() {
    let grass = this.props.grass;
    let name = grass.name;
    let plus = grass.plus_code ? "+" + grass.plus_code.compound_code : "";
    return `https://www.google.com/maps/search/${name}${plus}`;
  }
  computeDistance() {
    let srcLoc = this.props.coords;
    let destLoc = this.props.grass.geometry.location;
    if (!srcLoc || !destLoc) return 0;
    let lat1 = srcLoc.latitude;
    let lon1 = srcLoc.longitude;
    let lat2 = destLoc.lat;
    let lon2 = destLoc.lng;
    return getDistance(lat1, lon1, lat2, lon2);
  }
  render() {
    let { icon, name } = this.props.grass;
    return (
      <a className="p-2 bg-green-500 hover:bg-green-600 rounded-lg w-full"
         tabIndex="1"
         href={this.generateLink()}
         target="_blank">
        <div className="flex flex-row">
          <span className="text-left grow">{name}</span>
          <span className="text-right basis-1/4">({this.computeDistance().toFixed(0)}m)</span>
        </div>
      </a>
    );
  }
}

class GrassList extends React.Component {
  render() {
    if (this.props.grass.parks.length === 0) {
      return (
        <div>
          <h2 className="p-2 text-2xl">
            We couldn't find any grass nearby, sorry about that.
          </h2>
        </div>
      );
    }
    return (
      <div>
        <h2 className="p-2 text-2xl">Grass near you</h2>
        <div className="mb-2 grid sm:grid-cols-1 lg:grid-cols-2 gap-1">
          {this.props.grass.parks.map((grass, i) =>
            <Grass key={i}
                   coords={this.props.coords}
                   grass={grass} />)}
        </div>
      </div>
    );
  }
}

class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      coords: null,
      error: null,
      grass: null,
      loading: false,
    };
  }

  render() {
    let locateGrass = () => {
      if (navigator.geolocation) {
        this.setState({
          ...this.state,
          loading: true,
        });
        navigator.geolocation.getCurrentPosition(
          (position) => {
            let { longitude, latitude } = position.coords;
            this.setState({
              ...this.state,
              coords: position.coords,
            });
            fetch(`/touch_grass/grass.json?longitude=${longitude}&latitude=${latitude}`)
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
                this.setState({
                  ...this.state,
                  loading: false,
                  error: null,
                  grass: grass
                });
              })
              .catch(err => {
                this.setState({
                  ...this.state,
                  loading: false,
                  error: err.message,
                });
              });
          },
          (err) => {
            this.setState({
              ...this.state,
              loading: false,
              error: err.message,
            });
          }
        );
      } else {
        this.setState({
          ...this.state,
          error: "Your browser doesn't support geolocation."
        });
      }
    };
    return (
      <section className="p-4 container mx-auto text-center">
        <h1 className="p-2 text-3xl">Touch grass</h1>
        {this.state.grass && <GrassList coords={this.state.coords} grass={this.state.grass} />}
        {this.state.error &&
         <p className="p-2 text-red-600">Grass location failed: {this.state.error}</p>}
        <button className={(this.state.loading ? "cursor-wait animate-pulse bg-blue-700" : "bg-blue-700 hover:bg-blue-800")
                           + " p-2 text-white rounded-full w-full"}
                onClick={this.state.loading ? null : locateGrass}>
            {this.state.loading ? "Locating nearby grass..." : "Locate nearby grass"}
        </button>
      </section>
    );
  }
}

window.addEventListener("load", function() {
  let root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<Root />);
});
