import { Object3D, Vector2 } from "three";
import { Tile } from "./tile";
import { QuadsphereBudget, QuadsphereOptions, TileCoordinate, TileData } from "./types";
import GUI from "lil-gui";

export abstract class Quadsphere extends Object3D {
  tileRoot = new Object3D();
  faceTiles: Tile[];

  options: QuadsphereOptions;

  current: QuadsphereBudget = {
    subdivide: 0,
  };

  limit: QuadsphereBudget = {
    subdivide: 4,
  };

  renderOptions = {
    displayLevelColors: false,
    displayWireframe: false,
  };

  constructor(options: QuadsphereOptions, gui?: GUI) {
    super();

    this.options = options;

    this.faceTiles = [
      new Tile(this, { face: 0, level: 0, offset: new Vector2() }),
      new Tile(this, { face: 1, level: 0, offset: new Vector2() }),
      new Tile(this, { face: 2, level: 0, offset: new Vector2() }),
      new Tile(this, { face: 3, level: 0, offset: new Vector2() }),
      new Tile(this, { face: 4, level: 0, offset: new Vector2() }),
      new Tile(this, { face: 5, level: 0, offset: new Vector2() }),
    ];

    this.faceTiles.forEach((tile) => this.tileRoot.add(tile));
    this.add(this.tileRoot);

    if (gui != null) {
      gui.add(this.limit, "subdivide").name("Subd Limit");

      gui.add(this.renderOptions, "displayWireframe").name("Wireframe");
      gui.add(this.renderOptions, "displayLevelColors").name("Colors");
    }
  }

  updateQuadsphere(camera: Object3D) {
    Object.keys(this.current).forEach((key) => (this.current[key as keyof QuadsphereBudget] = 0));

    this.tileRoot.visible = !this.faceTiles.some((t) => !t.isReady);
    this.faceTiles.forEach((tile) => tile.updateQuadsphere(camera));
  }

  /** Called when a new tile is created to fetch texture and height information. */
  abstract fetchTile(info: TileCoordinate): Promise<TileData>;
}
