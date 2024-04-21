import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  ObjectSpaceNormalMap,
  Vector2,
  Vector3,
} from "three";
import type { Quadsphere } from "./quadsphere";
import { TileCoordinate, TileData } from "./types";
import { getParentTileAtLevel, getTileOffsetFromLevel, tileOffsetToSpherical } from "./convert";

const TRIANGLE_VERTICES_FOR_FACE = [
  // A
  [1, 1],
  [0, 1],
  [0, 0],

  // B
  [1, 0],
  [1, 1],
  [0, 0],
] as const;

const LEVEL_COLORS: number[] = [0xffaaaa, 0xffffaa, 0xaaffaa, 0xaaffff, 0xaaaaff, 0xffaaff];

export class Tile extends Object3D {
  quadsphere: Quadsphere;

  coord: TileCoordinate;

  subtiles?: [Tile, Tile, Tile, Tile];

  mesh?: Mesh;

  // The geometric center of this tile. Only valid once the mesh is present.
  center?: Vector3;

  get isReady(): boolean {
    return this.mesh != null;
  }

  get hasSubtiles(): boolean {
    return this.subtiles != null;
  }

  constructor(quadsphere: Quadsphere, coord: TileCoordinate) {
    super();
    this.quadsphere = quadsphere;

    this.coord = coord;

    this.quadsphere
      .fetchTile(this.coord)
      .then((data) => {
        this.createMesh(data);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  private createMesh({
    textureResolution,
    resolution: vertexResolution,
    height: heightMap,
    textureLevel,
    albedo,
    normal,
  }: TileData) {
    const faceResolution = vertexResolution - 1 + 2;
    const gridVertexCount = faceResolution * faceResolution * 6;

    const totalVertexCount = gridVertexCount;

    const positions = new Float32Array(totalVertexCount * 3);
    const normals = new Uint8Array(totalVertexCount * 3);
    const uvs = new Uint16Array(totalVertexCount * 2);

    /** Given a fractional offset within our tile, return the _object-space_ position of this vertex. */
    const getPositionAt = (offset: Vector2, height: number) => {
      const position = tileOffsetToSpherical(this.coord, offset);
      const heightScale = height + this.quadsphere.options.radius;
      return new Vector3(position.x * heightScale, position.y * heightScale, position.z * heightScale);
    };

    const getNormalAt = (offset: Vector2) => {
      const normal = tileOffsetToSpherical(this.coord, offset);
      normal.normalize();
      return normal;
    };

    const getHeightAt = (point: Vector2) => {
      const heightIndex = Math.floor(point.y) * vertexResolution + Math.floor(point.x);
      return heightMap[heightIndex] ?? 0;
    };

    const height = getHeightAt(new Vector2(vertexResolution / 2, vertexResolution / 2));
    this.center = getPositionAt(new Vector2(0.5, 0.5), height);

    const { offset: uvOffset, scale: uvScale } = getTileOffsetFromLevel(
      this.coord,
      getParentTileAtLevel(this.coord, textureLevel)
    );

    const pixelFraction = 1 / textureResolution;

    const clampVertex = (value: number) => {
      return Math.max(0, Math.min(value, vertexResolution - 1));
    };

    for (let rawY = 0; rawY < faceResolution; rawY++) {
      for (let rawX = 0; rawX < faceResolution; rawX++) {
        // For each vertex of this grid cell / face...
        TRIANGLE_VERTICES_FOR_FACE.forEach((faceVertexOffset, vertexFaceIndex) => {
          const x = clampVertex(rawX - 1 + faceVertexOffset[0]);
          const y = clampVertex(rawY - 1 + faceVertexOffset[1]);

          const isEdge = rawX - 1 + faceVertexOffset[0] != x || rawY - 1 + faceVertexOffset[1] != y;

          const elementIndex = (rawY * faceResolution + rawX) * 6 + vertexFaceIndex;
          const vec3Index = elementIndex * 3;
          const vec2Index = elementIndex * 2;

          const height = getHeightAt(new Vector2(y * vertexResolution + x));

          const position = getPositionAt(new Vector2(x / (vertexResolution - 1), y / (vertexResolution - 1)), height);

          position.multiplyScalar(isEdge ? 1 - 0.5 ** this.coord.level / vertexResolution : 1);

          positions[vec3Index + 0] = position.x - this.center!.x;
          positions[vec3Index + 1] = position.y - this.center!.y;
          positions[vec3Index + 2] = position.z - this.center!.z;

          const normal = getNormalAt(new Vector2(x / (vertexResolution - 1), y / (vertexResolution - 1)));
          normals[vec3Index + 0] = normal.x * 127 + 128;
          normals[vec3Index + 1] = normal.y * 127 + 128;
          normals[vec3Index + 2] = normal.z * 127 + 128;

          let u = x / (vertexResolution - 1);
          let v = y / (vertexResolution - 1);

          u = u * (1 - pixelFraction) + pixelFraction / 2;
          v = v * (1 - pixelFraction) + pixelFraction / 2;

          u *= uvScale;
          v *= uvScale;

          u += uvOffset.x;
          v += uvOffset.y;

          uvs[vec2Index + 0] = u * 65535;
          uvs[vec2Index + 1] = (1 - v) * 65535;
        });
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2, true));

    geometry.computeBoundingSphere();

    const material = new MeshStandardMaterial({
      map: albedo,
      roughness: 1,
      dithering: true,
      normalMap: normal,
      normalMapType: ObjectSpaceNormalMap,
      shadowSide: DoubleSide,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.set(...this.center.toArray());

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.add(this.mesh);
  }

  private subdivide() {
    if (this.subtiles != null) {
      return;
    }

    const createSubtile = (relativeOffset: Vector2) => {
      const t = new Tile(this.quadsphere, {
        face: this.coord.face,
        level: this.coord.level + 1,
        offset: this.coord.offset.clone().multiplyScalar(2).add(relativeOffset),
      });

      this.add(t);

      return t;
    };

    this.subtiles = [
      createSubtile(new Vector2(0, 0)),
      createSubtile(new Vector2(0, 1)),
      createSubtile(new Vector2(1, 0)),
      createSubtile(new Vector2(1, 1)),
    ];
  }

  /** The radius of this tile, in meters. */
  private get radius(): number {
    return this.quadsphere.options.radius * 0.5 ** this.coord.level;
  }

  private shouldSubdivide(camera: Object3D) {
    // Should only be true if isReady is also false.
    if (this.center == null) {
      return;
    }

    if (this.coord.level > 9) {
      return false;
    }

    // Respect performance budget.
    if (this.quadsphere.current.subdivide >= this.quadsphere.limit.subdivide) {
      return false;
    }

    const cameraLocal = new Vector3();
    camera.getWorldPosition(cameraLocal);
    this.worldToLocal(cameraLocal);

    const distance = cameraLocal.distanceTo(this.center) - this.radius;

    return distance < 0.5 ** this.coord.level * this.quadsphere.options.radius;
  }

  updateQuadsphere(camera: Object3D) {
    if (this.mesh == null) {
      return;
    }

    if (this.mesh.material instanceof MeshStandardMaterial) {
      this.mesh.material.color.setHex(
        this.quadsphere.renderOptions.displayLevelColors
          ? LEVEL_COLORS[this.coord.level % LEVEL_COLORS.length] ?? 0xffffff
          : 0xffffff
      );
      this.mesh.material.wireframe = this.quadsphere.renderOptions.displayWireframe;
    }

    let subtilesVisible = false;

    // First, compute visibility for children.
    if (this.shouldSubdivide(camera)) {
      if (!this.hasSubtiles) {
        this.subdivide();
      }
      subtilesVisible = true;
    }

    // We should only show subtiles if all subtiles are ready.
    if (this.subtiles?.some(({ isReady }) => isReady === false)) {
      subtilesVisible = false;
    }

    this.mesh.visible = !subtilesVisible;

    this.subtiles?.forEach((subtile) => {
      subtile.visible = subtilesVisible;
      if (subtilesVisible) {
        subtile.updateQuadsphere(camera);
      }
    });
  }
}
