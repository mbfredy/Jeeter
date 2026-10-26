// Primitive builder for blockout GLBs. Boxes, cylinders and planes only:
// enough to read as a layout, never final art.
import { Document, type Buffer as GBuffer, type Material, type Mesh, type Node as GNode } from '@gltf-transform/core';
import { KHRMaterialsEmissiveStrength } from '@gltf-transform/extensions';
import { Euler, Quaternion } from 'three';

export type V3 = [number, number, number];

export interface MatDef {
  color: string;
  emissive?: string;
  emissiveStrength?: number;
  metal?: number;
  rough?: number;
  opacity?: number;
}

export interface Opts {
  rot?: V3; // Euler XYZ, radians
  parent?: GNode;
  extras?: Record<string, string>;
}

const srgbToLinear = (hex: string) => {
  const c = parseInt(hex.slice(1), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => (v / 255) ** 2.2) as V3;
};

export class Builder {
  doc = new Document();
  buffer: GBuffer = this.doc.createBuffer();
  scene = this.doc.createScene('scene');
  private mats = new Map<string, Material>();
  private palette: Record<string, MatDef>;
  private emissive?: KHRMaterialsEmissiveStrength;

  constructor(palette: Record<string, MatDef>) {
    this.palette = palette;
  }

  material(key: string): Material {
    if (!this.mats.has(key)) {
      const d = this.palette[key];
      if (!d) throw new Error(`unknown material ${key}`);
      const m = this.doc
        .createMaterial(key)
        .setBaseColorFactor([...srgbToLinear(d.color), d.opacity ?? 1])
        .setRoughnessFactor(d.rough ?? 0.85)
        .setMetallicFactor(d.metal ?? 0);
      if (d.opacity !== undefined && d.opacity < 1) m.setAlphaMode('BLEND');
      if (d.emissive) {
        m.setEmissiveFactor(srgbToLinear(d.emissive));
        if (d.emissiveStrength && d.emissiveStrength !== 1) {
          this.emissive ??= this.doc.createExtension(KHRMaterialsEmissiveStrength);
          m.setExtension('KHR_materials_emissive_strength', this.emissive.createEmissiveStrength().setEmissiveStrength(d.emissiveStrength));
        }
      }
      this.mats.set(key, m);
    }
    return this.mats.get(key)!;
  }

  mesh(name: string, pos: number[], nrm: number[], uv: number[], idx: number[], mat: string): Mesh {
    const acc = (type: 'VEC3' | 'VEC2' | 'SCALAR', arr: Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>) =>
      this.doc.createAccessor().setType(type).setArray(arr).setBuffer(this.buffer);
    const prim = this.doc
      .createPrimitive()
      .setAttribute('POSITION', acc('VEC3', new Float32Array(pos)))
      .setAttribute('NORMAL', acc('VEC3', new Float32Array(nrm)))
      .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
      .setIndices(acc('SCALAR', new Uint32Array(idx)))
      .setMaterial(this.material(mat));
    return this.doc.createMesh(name).addPrimitive(prim);
  }

  node(name: string, at: V3, opts: Opts = {}, mesh?: Mesh): GNode {
    const node = this.doc.createNode(name).setTranslation(at);
    if (opts.rot) {
      const q = new Quaternion().setFromEuler(new Euler(...opts.rot));
      node.setRotation([q.x, q.y, q.z, q.w]);
    }
    if (mesh) node.setMesh(mesh);
    if (opts.extras) node.setExtras(opts.extras);
    (opts.parent ?? this.scene).addChild(node);
    return node;
  }

  group(name: string, at: V3 = [0, 0, 0], opts: Opts = {}): GNode {
    return this.node(name, at, opts);
  }

  // Box with its center at `at`.
  box(name: string, size: V3, at: V3, mat: string, opts: Opts = {}): GNode {
    const [x, y, z] = size.map((s) => s / 2);
    const faces: { n: V3; c: V3[] }[] = [
      { n: [1, 0, 0], c: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
      { n: [-1, 0, 0], c: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
      { n: [0, 1, 0], c: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
      { n: [0, -1, 0], c: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
      { n: [0, 0, 1], c: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
      { n: [0, 0, -1], c: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    ];
    const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
    faces.forEach((f, i) => {
      f.c.forEach((c) => (pos.push(...c), nrm.push(...f.n)));
      uv.push(0, 1, 1, 1, 1, 0, 0, 0);
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return this.node(name, at, opts, this.mesh(name, pos, nrm, uv, idx, mat));
  }

  // Cylinder or cone (rTop 0) standing on `at`.
  cylinder(name: string, rTop: number, rBottom: number, h: number, at: V3, mat: string, seg = 12, opts: Opts = {}): GNode {
    const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
    const slope = (rBottom - rTop) / h;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const n = Math.hypot(1, slope);
      pos.push(c * rBottom, 0, s * rBottom, c * rTop, h, s * rTop);
      nrm.push(c / n, slope / n, s / n, c / n, slope / n, s / n);
      uv.push(i / seg, 1, i / seg, 0);
      if (i < seg) {
        const b = i * 2;
        idx.push(b, b + 1, b + 3, b, b + 3, b + 2);
      }
    }
    // Caps
    for (const [y, r, ny] of [[h, rTop, 1], [0, rBottom, -1]] as const) {
      if (r <= 0) continue;
      const center = pos.length / 3;
      pos.push(0, y, 0); nrm.push(0, ny, 0); uv.push(0.5, 0.5);
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r); nrm.push(0, ny, 0); uv.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2);
        if (i < seg) idx.push(...(ny > 0 ? [center, center + i + 2, center + i + 1] : [center, center + i + 1, center + i + 2]));
      }
    }
    return this.node(name, at, opts, this.mesh(name, pos, nrm, uv, idx, mat));
  }

  // Horizontal plane facing +Y.
  floor(name: string, w: number, d: number, at: V3, mat: string, opts: Opts = {}): GNode {
    const [x, z] = [w / 2, d / 2];
    return this.node(name, at, opts, this.mesh(name, [-x, 0, z, x, 0, z, x, 0, -z, -x, 0, -z], Array(4).fill([0, 1, 0]).flat(), [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], mat));
  }

  // Vertical plane facing +Z, glTF UV convention (v=0 at top).
  panel(name: string, w: number, h: number, at: V3, mat: string, opts: Opts = {}): GNode {
    const [x, y] = [w / 2, h / 2];
    return this.node(name, at, opts, this.mesh(name, [-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0], Array(4).fill([0, 0, 1]).flat(), [0, 1, 1, 1, 1, 0, 0, 0], [0, 1, 2, 0, 2, 3], mat));
  }

  // Single double-sided triangle in the XY plane (sails, fronds).
  triangle(name: string, a: V3, b: V3, c: V3, at: V3, mat: string, opts: Opts = {}): GNode {
    const pos = [...a, ...b, ...c, ...a, ...c, ...b];
    const ux = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], vx = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ux[1] * vx[2] - ux[2] * vx[1], ux[2] * vx[0] - ux[0] * vx[2], ux[0] * vx[1] - ux[1] * vx[0]];
    const l = Math.hypot(...n) || 1;
    const nn = n.map((v) => v / l);
    return this.node(name, at, opts, this.mesh(name, pos, [...nn, ...nn, ...nn, ...nn.map((v) => -v), ...nn.map((v) => -v), ...nn.map((v) => -v)], [0, 1, 1, 1, 0.5, 0, 0, 1, 0.5, 0, 1, 1], [0, 1, 2, 3, 4, 5], mat));
  }
}
