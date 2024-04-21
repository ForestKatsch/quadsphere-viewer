import { Texture, Vector2 } from "three";

const FACE_NAMES: Record<FaceNumber, string> = ["Z+", "X+", "Y+", "Z-", "X-", "Y-"];

export type FaceNumber = 0 | 1 | 2 | 3 | 4 | 5;

export const getFaceName = (face: FaceNumber) => FACE_NAMES[face];

export interface TileCoordinate {
  face: FaceNumber;
  level: number;
  offset: Vector2;
}

export interface TileData {
  albedo?: Texture;
  normal?: Texture;

  textureResolution: number;

  /** Number of vertices, X and Y, for this tile height. */
  resolution: number;

  /** The height, in meters, for each vertex of the tile. Must be of length `resolution * resolution`. */
  height: number[];

  /** The tile level of albedo and normal textures. Must be the level of this tile or lower (i.e. larger.) */
  textureLevel: number;
}

export interface QuadsphereOptions {
  /** Nominal radius of the quadsphere, in meters. */
  radius: number;
}

export interface QuadsphereBudget {
  subdivide: number;
}
