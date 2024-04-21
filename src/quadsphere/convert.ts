import { Vector2, Vector3 } from "three";
import { TileCoordinate } from "./types";

/** Returns the parent tile of this one if the provided tile is deeper than `level`, or returns the tile unmodified if it's shallower. */
export const getParentTileAtLevel = (tile: TileCoordinate, level: number): TileCoordinate => {
  if (tile.level <= level) {
    return tile;
  }

  const parent: TileCoordinate = {
    face: tile.face,
    level,
    offset: tile.offset.clone(),
  };

  for (let i = level; i < tile.level; i++) {
    parent.offset.x = Math.floor(parent.offset.x / 2);
    parent.offset.y = Math.floor(parent.offset.y / 2);
  }

  return parent;
};

/** Returns a spherical vector direction for a given tile and a fractional (0-to-1) offset within that tile's coordinate space. */
export const tileOffsetToSpherical = (coord: TileCoordinate, offset: Vector2): Vector3 => {
  const sign = coord.face >= 3 ? -1 : 1;
  const position = [
    (((offset.x + coord.offset.x) / 2 ** coord.level) * 2 - 1) * sign,
    ((offset.y + coord.offset.y) / 2 ** coord.level) * 2 - 1,
    sign,
  ];

  const swizzled = new Vector3(
    position[(0 + coord.face) % 3]!,
    position[(1 + coord.face) % 3]!,
    position[(2 + coord.face) % 3]!
  );

  swizzled.normalize();

  return swizzled;
};

export const getTileOffsetFromLevel = (
  tile: TileCoordinate,
  parent: TileCoordinate
): { offset: Vector2; scale: number } => {
  const result = {
    offset: new Vector2(),
    scale: 1,
  };

  result.scale = 0.5 ** (tile.level - parent.level);

  result.offset.x = tile.offset.x * result.scale - parent.offset.x;
  result.offset.y = tile.offset.y * result.scale - parent.offset.y;

  return result;
};
