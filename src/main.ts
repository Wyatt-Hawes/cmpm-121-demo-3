import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

const ORIGIN = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const PLAYER_LOCATION = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});
const MADE_PITS: Record<string, number> = {};

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = createLeaflet(mapContainer);

addLeafletToMap(map);

let playerMarker = moveMarker(null, PLAYER_LOCATION);
playerMarker = moveMarker(playerMarker, PLAYER_LOCATION);
map.setView(playerMarker.getLatLng());

generateNeighborhood(PLAYER_LOCATION);

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

createSensorButton();
createResetButton();

//-------------------------------------
//-------------------------------------
//--------------FUNCTIONS--------------
//-------------------------------------
//-------------------------------------

function makePit(i: number, j: number) {
  if (pitAlreadyMade(i, j)) {
    return;
  }
  markPitAsMade(i, j);

  const bounds = leaflet.latLngBounds([
    [ORIGIN.lat + i * TILE_DEGREES, ORIGIN.lng + j * TILE_DEGREES],
    [ORIGIN.lat + (i + 1) * TILE_DEGREES, ORIGIN.lng + (j + 1) * TILE_DEGREES],
  ]);

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(() => {
    let value = getPitValue(i, j);
    const container = document.createElement("div");
    container.innerHTML = `
                <div>Pit Location (${i} , ${j}). </br>Capacity: <span id="value">${value}</span></div>
                <button id="grab">grab</button><button id="deposit">deposit</button>`;

    const grab = container.querySelector<HTMLButtonElement>("#grab")!;
    grab.addEventListener("click", () => {
      if (value <= 0) {
        return;
      }

      value--;
      updatePitValue(i, j, value);

      points++;

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();

      updateStatusPanel();
    });

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (points <= 0) {
        return;
      }

      value++;
      updatePitValue(i, j, value);

      points--;

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      updateStatusPanel();
    });

    return container;
  });
  pit.addTo(map);
}

function getPitKey(i: number, j: number) {
  return i + "|" + j;
}

function markPitAsMade(i: number, j: number) {
  const key = getPitKey(i, j);
  MADE_PITS[key] = Math.floor(luck([i, j, "initialValue"].toString()) * 4 + 1);
  //console.log("Marking ", i, ",", j);
}

function pitAlreadyMade(i: number, j: number) {
  const key = getPitKey(i, j);
  if (MADE_PITS[key]) {
    //console.log("Pit ", i, ",", j, " already made.");
    return true;
  }
  return false;
}

function getPitValue(i: number, j: number) {
  const key = getPitKey(i, j);
  return MADE_PITS[key];
}

function updatePitValue(i: number, j: number, value: number) {
  const key = getPitKey(i, j);
  MADE_PITS[key] = value;
}

function generateNeighborhood(center: leaflet.LatLng) {
  const I_OFFSET = Math.floor((center.lat - ORIGIN.lat) / TILE_DEGREES);
  const J_OFFSET = Math.floor((center.lng - ORIGIN.lng) / TILE_DEGREES);
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (
        luck([i + I_OFFSET, j + J_OFFSET].toString()) < PIT_SPAWN_PROBABILITY
      ) {
        makePit(i + I_OFFSET, j + J_OFFSET);
      }
    }
  }
}

function getBoxCordsOfPosition(center: leaflet.LatLng) {
  const I = Math.floor((center.lat - ORIGIN.lat) / TILE_DEGREES);
  const J = Math.floor((center.lng - ORIGIN.lng) / TILE_DEGREES);
  return { i: I, j: J };
}

// navigator.geolocation.watchPosition() calls internal function when the position changes
function createSensorButton() {
  const sensorButton = document.querySelector("#sensor")!;
  sensorButton.addEventListener("click", () => {
    console.log("click");
    navigator.geolocation.getCurrentPosition((position) => {
      moveMarker(
        playerMarker,
        leaflet.latLng({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      );
      map.setView(playerMarker.getLatLng());
      generateNeighborhood(playerMarker.getLatLng());
    });
  });
}

function createResetButton() {
  const resetButton = document.querySelector("#reset")!;
  resetButton.addEventListener("click", () => {
    playerMarker.setLatLng(ORIGIN);
    moveMarker(playerMarker, ORIGIN);
    map.setView(playerMarker.getLatLng());
    generateNeighborhood(playerMarker.getLatLng());
  });
}

function createLeaflet(mapCont: string | HTMLElement) {
  const map = leaflet.map(mapCont, {
    center: ORIGIN,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false,
  });
  return map;
}

function addLeafletToMap(map: leaflet.Map | leaflet.LayerGroup) {
  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        // eslint-disable-next-line @typescript-eslint/quotes
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);
}

function moveMarker(marker: leaflet.Marker | null, location: leaflet.LatLng) {
  let MARKER = marker;
  if (MARKER == null) {
    MARKER = leaflet.marker(location);
  } else {
    MARKER.setLatLng(location);
  }
  const cL = getBoxCordsOfPosition(location);
  MARKER.bindTooltip("That's you! You're in (" + cL.i + " , " + cL.j + ")");
  MARKER.addTo(map);
  return MARKER;
}

function updateStatusPanel() {
  statusPanel.innerHTML = `${points} points accumulated`;
}
