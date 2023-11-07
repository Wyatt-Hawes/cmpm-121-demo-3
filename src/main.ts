import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Token } from "./classes";

const ORIGIN = leaflet.latLng({
  lat: 0,
  lng: 0,
});

let PLAYER_LOCATION = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = createLeaflet(mapContainer);
const pitsOnMap: leaflet.Layer[] = [];

const MOVEMENT_AMOUNT = 0.0001;
const NORTH = leaflet.latLng(MOVEMENT_AMOUNT, 0);
const SOUTH = leaflet.latLng(-MOVEMENT_AMOUNT, 0);
const EAST = leaflet.latLng(0, MOVEMENT_AMOUNT);
const WEST = leaflet.latLng(0, -MOVEMENT_AMOUNT);

let playerMarker = moveMarker(null, PLAYER_LOCATION);
let playerTokens: Token[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No Tokens Yet";

console.log(localStorage);
restoreStateFromLocalStorage();
updateStatusPanel();

addLeafletToMap(map);

playerMarker = moveMarker(playerMarker, PLAYER_LOCATION);
centerMapAround(playerMarker.getLatLng());

generateNeighborhood(PLAYER_LOCATION);

createSensorButton();
createResetButton();

addMovementDirection("north", NORTH);
addMovementDirection("south", SOUTH);
addMovementDirection("east", EAST);
addMovementDirection("west", WEST);

addSaveButton();
addClearLocalStorageButton();

//-------------------------------------
//-------------------------------------
//--------------FUNCTIONS--------------
//-------------------------------------
//-------------------------------------

function makePit(i: number, j: number) {
  const cell = { i, j };
  const bounds = board.getCellBounds(cell);
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  pit.bindPopup(
    () => {
      const container = updatePopupContent(i, j, pit);

      return container;
    }
    //{ closeOnClick: false, autoClose: false }
  );

  addPitToMap(pit);
}

function updatePopupContent(
  i: number,
  j: number,
  pit: leaflet.Layer
): HTMLDivElement {
  const tokens = board.getCellTokens({ i, j });
  const container = document.createElement("div");
  container.innerHTML = `
                <div style="width: 210px">Pit Location (${i} , ${j}). </br>Capacity: <span id="tokens"></div>`;

  //Add grab buttons for each token
  tokens.forEach((token) => {
    addTokenButton(tokens, token, container, i, j, pit);
  });

  //Add deposit function for the box
  playerTokens.forEach((token) => {
    addDepositButton(playerTokens, token, container, i, j, pit);
  });

  // const pUp: leaflet.Popup = pit.getPopup()!;
  // console.log(pUp);
  // pUp.options = { closeOnClick: false };

  //pit.bindPopup(container);
  pit.bindPopup(container, {});
  setTimeout(() => {
    pit.openPopup();
  }, 0);

  return container;
}

function addTokenButton(
  tokens: Token[],
  token: Token,
  container: HTMLDivElement,
  i: number,
  j: number,
  pit: leaflet.Layer
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
    updatePopupContent(i, j, pit);
  });
}

function addDepositButton(
  tokens: Token[],
  token: Token,
  container: HTMLDivElement,
  i: number,
  j: number,
  pit: leaflet.Layer
) {
  const tk = container.querySelector("#tokens");
  const internal = document.createElement("div");

  internal.innerHTML = `<div>(${token.id}). <button id = "tokenDeposit">Deposit</button></div>`;
  tk?.append(internal);

  const btn = internal.querySelector("#tokenDeposit");
  btn?.addEventListener("click", () => {
    console.log("Deposit");
    const index = tokens.indexOf(token);
    const popped = tokens.splice(index, 1)[0];

    internal.style.display = "none";

    board.addTokenToCell({ i, j }, popped);
    updateStatusPanel();
    updatePopupContent(i, j, pit);
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
      centerMapAround(playerMarker.getLatLng());
      generateNeighborhood(playerMarker.getLatLng());
    });
  });
}

function createResetButton() {
  const resetButton = document.querySelector("#reset")!;
  resetButton.addEventListener("click", () => {
    playerMarker.setLatLng(ORIGIN);
    playerMarker = moveMarker(playerMarker, ORIGIN);
    centerMapAround(playerMarker.getLatLng());
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

function addMovementDirection(direction: string, amount: leaflet.LatLng) {
  const dir = "#" + direction;
  const button = document.querySelector<HTMLButtonElement>(dir);

  button?.addEventListener("click", () => {
    const pLocation = playerMarker.getLatLng();
    console.log(direction);
    playerMarker = moveMarker(
      playerMarker,
      leaflet.latLng({
        lat: pLocation.lat + amount.lat,
        lng: pLocation.lng + amount.lng,
      })
    );
    generateNeighborhood(playerMarker.getLatLng());
    centerMapAround(playerMarker.getLatLng());
  });
}

function centerMapAround(point: leaflet.LatLng) {
  map.setView(point);
}

//Use localstorage
function addClearLocalStorageButton() {
  const button = document.querySelector<HTMLButtonElement>("#clear");
  button?.addEventListener("click", () => {
    const reset = confirm("Would you like to reset the game?");
    if (reset) {
      console.log("yes");
      localStorage.clear();
    } else {
      console.log("no");
    }
  });
}

// storeStateToLocalStorage();
// console.log(localStorage);

function addSaveButton() {
  const button = document.querySelector<HTMLButtonElement>("#save");
  button?.addEventListener("click", () => {
    const reset = confirm("Would you like to save your progress?");
    if (reset) {
      console.log("yes");
      storeStateToLocalStorage();
      console.log(localStorage);
    } else {
      console.log("no");
    }
  });
}

function storeStateToLocalStorage() {
  const boardMomento = JSON.stringify(board.toMomento());
  const playerMomento = JSON.stringify(playerTokens);
  const playerPositionMomento = JSON.stringify(playerMarker.getLatLng());

  localStorage.setItem("boardMomento", boardMomento);
  localStorage.setItem("playerMomento", playerMomento);
  localStorage.setItem("playerPositionMomento", playerPositionMomento);
}

function restoreStateFromLocalStorage() {
  const boardMomento = localStorage.getItem("boardMomento");
  const playerMomento = localStorage.getItem("playerMomento");
  const playerPositionMomento = localStorage.getItem("playerPositionMomento");

  if (
    boardMomento == null ||
    playerMomento == null ||
    playerPositionMomento == null
  ) {
    console.log("Past player data doesnt exist, starting new game");
    return;
  }
  console.log("Past player data detected, loading existing data");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const bM: string[] = JSON.parse(boardMomento);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pT: Token[] = JSON.parse(playerMomento);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pP: leaflet.LatLng = JSON.parse(playerPositionMomento);

  board.fromMomento(bM);
  playerTokens = pT;
  PLAYER_LOCATION = pP;
}
