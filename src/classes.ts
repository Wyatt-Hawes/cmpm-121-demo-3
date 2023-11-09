import leaflet from "leaflet";
import luck from "./luck";

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Momento {
  readonly key: string;
  readonly ts: Token[];
}

export class Token {
  readonly id: string;
  constructor(i: number, j: number, serial: number) {
    this.id = i + ":" + j + "#" + serial;
  }
}

interface CellCoordinate {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCellTokens: Map<string, Token[]>;
  //private readonly knownCellTokens: Map<string, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;

    this.knownCellTokens = new Map();

    const obj = localStorage.getItem("map");

    if (obj == null) {
      this.knownCellTokens = new Map();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.knownCellTokens = JSON.parse(obj);
    }
  }

  private getCanonicalTokens(cellCord: CellCoordinate): Token[] {
    const { i, j } = cellCord;
    const key = [i, j].toString();

    if (!this.knownCellTokens.has(key)) {
      console.log("Generating new cell");
      const value: number = this.generateRandomSeededValue(i, j);
      const tokens: Token[] = [];
      for (let index = 0; index < value; index++) {
        tokens.push(new Token(i, j, index));
      }
      this.knownCellTokens.set(key, tokens);
    }
    return this.knownCellTokens.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const I = Math.floor(point.lat / this.tileWidth);
    const J = Math.floor(point.lng / this.tileWidth);
    return { i: I, j: J };
  }

  getPointFromCell(c: Cell): leaflet.LatLng {
    const lat = c.i * this.tileWidth + this.tileWidth / 2;
    const lng = c.j * this.tileWidth + this.tileWidth / 2;

    return leaflet.latLng(lat, lng);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }
  addTokenToCell(cellCord: CellCoordinate, token: Token) {
    const tokens = this.getCanonicalTokens(cellCord);
    tokens.push(token);
  }
  popTokenFromCell(cellCord: CellCoordinate, index: number): Token {
    const tokens = this.getCanonicalTokens(cellCord);
    return tokens.splice(index, 1)[0];
  }

  getCellTokens(cellCord: CellCoordinate): Token[] {
    return this.getCanonicalTokens(cellCord);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const originCell = this.getCellForPoint(point);
    // ...

    //my code
    resultCells.push(originCell);
    return resultCells;
  }
  cellExists(cellCord: CellCoordinate): boolean {
    const { i, j } = cellCord;
    const key = [i, j].toString();
    return this.knownCellTokens.has(key);
  }

  generateRandomSeededValue(i: number, j: number): number {
    return Math.floor(luck([i, j, "initialValue"].toString()) * 3 + 1);
  }

  boardToMomento(): string[] {
    const momentos: string[] = [];
    for (const [key, ts] of this.knownCellTokens) {
      const m: Momento = { key, ts };
      momentos.push(this.toMomento(m));
    }
    return momentos;
  }

  boardFromMomento(momentos: string[]) {
    this.knownCellTokens.clear();
    for (const m of momentos) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.fromMomento(m);
    }
  }

  toMomento(m: Momento) {
    return JSON.stringify(m);
  }
  fromMomento(s: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const m: Momento = JSON.parse(s);
    this.knownCellTokens.set(m.key, m.ts);
  }
  ijFromID(tknID: string) {
    const splitStr = tknID.split(/:|#/);
    const i = parseInt(splitStr[0]);
    const j = parseInt(splitStr[1]);
    return { i, j };
  }
}
