import leaflet from "leaflet";

interface Cell {
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

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const I = Math.floor(point.lat / this.tileWidth);
    const J = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i: I, j: J });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);

    /*
      leaflet.latLngBounds([
        [ORIGIN.lat + i * TILE_DEGREES, ORIGIN.lng + j * TILE_DEGREES],
        [ORIGIN.lat + (i + 1) * TILE_DEGREES, ORIGIN.lng + (j + 1) * TILE_DEGREES],
        ]);
      
      */
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
}
