import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Token } from "./classes";

//TODO - Start using the Board class

const ORIGIN = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const PLAYER_LOCATION = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const pitsOnMap: leaflet.Layer[] = [];

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = createLeaflet(mapContainer);

addLeafletToMap(map);

let playerMarker = moveMarker(null, PLAYER_LOCATION);
playerMarker = moveMarker(playerMarker, PLAYER_LOCATION);
map.setView(playerMarker.getLatLng());

generateNeighborhood(PLAYER_LOCATION);

const playerTokens: Token[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No Tokens Yet";

createSensorButton();
createResetButton();

//-------------------------------------
//-------------------------------------
//--------------FUNCTIONS--------------
//-------------------------------------
//-------------------------------------

function makePit(i: number, j: number) {
  const cell = { i, j };
  const bounds = board.getCellBounds(cell);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(() => {
    const tokens = board.getCellTokens({ i, j });
    const container = document.createElement("div");
    container.innerHTML = `
                <div style="width: 210px">Pit Location (${i} , ${j}). </br>Capacity: <span id="tokens"><button id="deposit">deposit</button></div>`;
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

    //Add grab buttons for each token
    tokens.forEach((token) => {
      addTokenButton(tokens, token, container, i, j);
    });

    //Add deposit function for the box
    deposit.addEventListener("click", () => {
      if (playerTokens.length <= 0) {
        return;
      }
      //Remove token from player
      const popped: Token = playerTokens.pop()!;
      //Add it to bin
      board.addTokenToCell({ i, j }, popped);
      addTokenButton(tokens, popped, container, i, j);
      container.offsetHeight;
      updateStatusPanel();
    });

    return container;
  });
  addPitToMap(pit);
}

function addTokenButton(
  tokens: Token[],
  token: Token,
  container: HTMLDivElement,
  i: number,
  j: number
) {
  const tk = container.querySelector("#tokens");
  const internal = document.createElement("div");

  internal.innerHTML = `<div>(${token.id}). <button id = "tokenGrab">Grab</button></div>`;
  tk?.append(internal);

  const btn = internal.querySelector("#tokenGrab");
  btn?.addEventListener("click", () => {
    const popped = board.popTokenFromCell({ i, j }, tokens.indexOf(token));

    internal.style.display = "none";

    playerTokens.push(popped);
    updateStatusPanel();
  });
}

function generateNeighborhood(center: leaflet.LatLng) {
  removeAllPits();
  const { i, j } = board.getCellForPoint(center);
  for (let cellI = -NEIGHBORHOOD_SIZE; cellI < NEIGHBORHOOD_SIZE; cellI++) {
    for (let cellJ = -NEIGHBORHOOD_SIZE; cellJ < NEIGHBORHOOD_SIZE; cellJ++) {
      if (luck([i + cellI, j + cellJ].toString()) < PIT_SPAWN_PROBABILITY) {
        makePit(i + cellI, j + cellJ);
      }
    }
  }
}

function addPitToMap(pit: leaflet.Layer) {
  pit.addTo(map);
  pitsOnMap.push(pit);
}

function removeAllPits() {
  pitsOnMap.forEach((pit) => {
    pit.removeFrom(map);
  });

  //Clear the array
  pitsOnMap.length = 0;
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
  let str = "";
  playerTokens.forEach((tkn) => {
    str += "[" + tkn.id + "] ";
  });
  statusPanel.innerHTML = "Collected Tokens: " + str;
}
