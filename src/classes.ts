import leaflet from "leaflet";
import luck from "./luck";

interface Cell {
  readonly i: number;
  readonly j: number;
  tokens: Token[];
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

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cellCord: CellCoordinate): Cell {
    const { i, j } = cellCord;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      console.log("Generating new cell");
      const value: number = this.generateRandomSeededValue(i, j);
      const tokens: Token[] = [];
      for (let index = 0; index < value; index++) {
        tokens.push(new Token(i, j, index));
      }
      this.knownCells.set(key, { i: i, j: j, tokens: tokens });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const I = Math.floor(point.lat / this.tileWidth);
    const J = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i: I, j: J });
  }

  getCellFromCoordinates(i: number, j: number) {
    return this.getCanonicalCell({ i: i, j: j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }
  addTokenToCell(cellCord: CellCoordinate, token: Token) {
    const cell = this.getCanonicalCell(cellCord);
    cell.tokens.push(token);

    //const key = [cell.i, cell.j].toString();
    //this.knownCells.set(key, cell);
  }
  popTokenFromCell(cellCord: CellCoordinate, index: number): Token {
    const cell = this.getCanonicalCell(cellCord);
    return cell.tokens.splice(index, 1)[0];

    //const key = [cell.i, cell.j].toString();
    //this.knownCells.set(key, cell);
  }

  getCellTokens(cellCord: CellCoordinate): Token[] {
    return this.getCanonicalCell(cellCord).tokens;
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
    return this.knownCells.has(key);
  }

  generateRandomSeededValue(i: number, j: number): number {
    return Math.floor(luck([i, j, "initialValue"].toString()) * 3 + 1);
  }
}
