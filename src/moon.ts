import { ClampToEdgeWrapping, RepeatWrapping, Texture, TextureLoader } from "three";
import { Quadsphere } from "./quadsphere/quadsphere";
import { TileCoordinate, TileData, getFaceName } from "./quadsphere/types";
import { getParentTileAtLevel } from "./quadsphere/convert";
import GUI from "lil-gui";

interface TileDataJson {
  s: number;
  d: number[];
}

const ASSERTIONS = true;

const textureCache = new Map<string, Promise<Texture>>();
const loader = new TextureLoader();

export class Moon extends Quadsphere {
  static textureMaxLevel = 4;
  static vertexMaxLevel = 8;

  constructor(gui?: GUI) {
    super(
      {
        radius: 1_737.4 * 1_000,
      },
      gui
    );
  }

  getTilePath({ face, level, offset }: TileCoordinate): string {
    return `${getFaceName(face)}${level}/${Math.round(offset.x)}-${Math.round(offset.y)}`;
  }

  // Fetches an image and returns a promise for a texture.
  async fetchImage(info: TileCoordinate, suffix: string): Promise<Texture> {
    const imagePath = `/data/${this.getTilePath(info)}${suffix}`;

    const existingPromise = textureCache.get(imagePath);
    if (existingPromise != null) {
      return existingPromise;
    }

    const fetchPromise = loader.loadAsync(imagePath);
    textureCache.set(imagePath, fetchPromise);

    const image = await fetchPromise;
    image.wrapS = ClampToEdgeWrapping;
    image.wrapT = ClampToEdgeWrapping;

    return fetchPromise;
  }

  // Fetches the JSON file.
  async fetchTileData(info: TileCoordinate): Promise<TileDataJson> {
    const jsonPath = `/data/${this.getTilePath(info)}.json`;
    const response = await fetch(jsonPath);
    const data = (await response.json()) as TileDataJson;

    if (ASSERTIONS) {
      if (data.d.length != data.s * data.s) {
        throw new Error("tile heightmap point count doesn't match resolution");
      }
    }

    return data;
  }

  async fetchTile(tile: TileCoordinate): Promise<TileData> {
    if (tile.level > Moon.vertexMaxLevel) {
      throw new Error("unable to fetch vertex data for tile beyond max level");
    }

    const dataPromise = this.fetchTileData(tile);

    const textureTile = getParentTileAtLevel(tile, Moon.textureMaxLevel);

    const albedoPromise = this.fetchImage(textureTile, "-albedo.png");
    const normalPromise = this.fetchImage(textureTile, "-normal.png");

    await Promise.all([dataPromise, albedoPromise, normalPromise]);

    const data = await dataPromise;
    const albedo = await albedoPromise;
    const normal = await normalPromise;

    return {
      textureResolution: (albedo.image as HTMLImageElement).width,
      resolution: data.s,
      height: data.d,
      textureLevel: textureTile.level,
      albedo,
      normal,
    };
  }
}
