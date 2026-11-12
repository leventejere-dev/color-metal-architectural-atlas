/**
 * Spitalul Clinic Municipal „Dr. Gavril Curteanu” Oradea — bodies C1 (P+10)
 * and C2 (P+4) after the 2024–26 energy retrofit (OSM way 199191245).
 *
 * Modelling specification (real metres; +X = OSM long axis 34.1°, +Z = 124.1°):
 *  - The OSM way covers the connected hospital blocks (119 × 101 m): an upper
 *    band (x −48.9…25.3, z −44.4…−22.2) with stair/entrance projections on
 *    its −Z side, a 24 m wide connecting spine and a 119 × 14.4 m lower slab
 *    (z 36…50.4). The published built area of C1 + C2 (2,778 m²) and floor
 *    area (19,871 m²) fit C1 = a 74.2 × 14.5 m slab in the upper band (P+10)
 *    and C2 = the 119 m slab (P+4); this assignment is an interpretation.
 *    The remaining strip of the upper band and the spine are shown as plain
 *    two-storey volumes (height not documented).
 *  - Retrofit façade (photo 01, Apr 2026): white vertical fins every
 *    ≈3.5 m framing two windows per floor, yellow / green spandrel panels
 *    in an irregular pattern, dark anthracite window frames and sills, grey
 *    parapet band; ground floor ≈4.2 m with a long flat entrance canopy on
 *    columns; upper floors ≈3.3 m (C1 ≈38.4 m, C2 ≈18.6 m to the parapet).
 *  - COLOR METAL: painted aluminium in RAL 7016 (2022–23, window sills per
 *    the records) — shown as the anthracite window sills and, as a plausible
 *    use of the same strip, the parapet copings. No metal roof is visible.
 * Approximations: one photograph only — C1/C2 identification within the
 * outline, heights, the end elevations, panel colour pattern, the canopy
 * position and the low connecting volumes are interpreted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox } from '../kit'
import { rng } from '../../lib/geo'
import type { ModelModule } from '../registry'

interface Rect { x0: number; x1: number; z0: number; z1: number }

/* plan */
const C1: Rect = { x0: -48.85, x1: 25.35, z0: -44.4, z1: -29.9 }
const STRIP: Rect = { x0: -48.85, x1: 25.35, z0: -29.9, z1: -22.2 }
const SPINE: Rect = { x0: -2.1, x1: 22.0, z0: -22.2, z1: 36.0 }
const C2: Rect = { x0: -59.5, x1: 59.4, z0: 36.0, z1: 50.45 }
const STAIR: Rect = { x0: -41.2, x1: -36.7, z0: -49.7, z1: -44.4 }
const HALL: Rect = { x0: -14.1, x1: -3.9, z0: -50.4, z1: -44.4 }

/* heights */
const GF = 4.2
const FL = 3.3
const MOD = 3.5

const PANELS = ['spYellow', 'spGreen', 'spYellow', 'spLime', 'spGreen', 'spWhite']

/** Parapet coping ring (RAL 7016 aluminium) around a rectangle at height y. */
function coping(b: Builder, r: Rect, y: number, c = 0.45) {
  const w = r.x1 - r.x0 + 0.3
  const d = r.z1 - r.z0 + 0.3
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  b.block('aluRal', w, 0.12, c, cx, y, r.z0 - 0.15 + c / 2)
  b.block('aluRal', w, 0.12, c, cx, y, r.z1 + 0.15 - c / 2)
  b.block('aluRal', c, 0.12, d, r.x0 - 0.15 + c / 2, y, cz)
  b.block('aluRal', c, 0.12, d, r.x1 + 0.15 - c / 2, y, cz)
}

/** Retrofit slab: fins, windows with RAL 7016 sills, coloured spandrels, parapet with coping. */
function slab(b: Builder, r: Rect, floors: number, seed: number) {
  const w = r.x1 - r.x0
  const d = r.z1 - r.z0
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  const top = GF + floors * FL
  const par = top + 1.2
  b.block('spWhite', w, par, d, cx, 0, cz)
  b.block('spBase', w + 0.1, 0.6, d + 0.1, cx, 0, cz)
  // grey parapet band + RAL 7016 coping
  b.block('spGrey', w + 0.12, 1.5, d + 0.12, cx, par - 1.5, cz)
  coping(b, r, par)
  b.block('spRoof', w - 0.6, 0.1, d - 0.6, cx, par - 0.8, cz)
  const R = rng(seed)
  // long façades (±Z) and end façades (±X)
  const sides: { len: number; at: (u: number, y: number, out: number) => THREE.Vector3; ry: number }[] = [
    { len: w, at: (u, y, o) => V(r.x0 + u, y, r.z1 + o), ry: 0 },
    { len: w, at: (u, y, o) => V(r.x1 - u, y, r.z0 - o), ry: Math.PI },
    { len: d, at: (u, y, o) => V(r.x1 + o, y, r.z1 - u), ry: Math.PI / 2 },
    { len: d, at: (u, y, o) => V(r.x0 - o, y, r.z0 + u), ry: -Math.PI / 2 },
  ]
  for (const s of sides) {
    const n = Math.max(1, Math.round(s.len / MOD))
    const m = s.len / n
    const longSide = s.len > 30
    // fins
    for (let i = 0; i <= n; i++) {
      const p = s.at(i * m, 0, 0.18)
      b.add('spWhite', metricBox(0.45, top - 0.2, 0.36), mat(p.x, 0.6 + (top - 0.8) / 2, p.z, s.ry))
    }
    for (let i = 0; i < n; i++) {
      if (!longSide && (i === 0 || i === n - 1) && n > 2) continue
      for (let f = 0; f <= floors; f++) {
        const y0 = f === 0 ? 1.0 : GF + (f - 1) * FL + 1.25
        const wh = f === 0 ? 2.3 : 1.45
        const c = s.at((i + 0.5) * m, 0, 0.02)
        const M = mat(c.x, 0, c.z, s.ry)
        const tm = (x: number, y: number, z: number) => new THREE.Matrix4().multiplyMatrices(M, mat(x, y, z))
        // window pair (dark frame + glass)
        b.add('spFrame', metricBox(m - 0.6, wh + 0.12, 0.08), tm(0, y0 + wh / 2, 0.03))
        for (const du of [-(m - 0.6) / 4, (m - 0.6) / 4]) {
          b.add('glassC', metricBox((m - 0.6) / 2 - 0.16, wh - 0.1, 0.06), tm(du, y0 + wh / 2, 0.06))
          // RAL 7016 aluminium sill (COLOR METAL)
          b.add('aluRal', metricBox((m - 0.6) / 2 + 0.02, 0.05, 0.3), tm(du, y0 - 0.05, 0.14))
        }
        // spandrel panel under the window (upper floors)
        if (f > 0) {
          const key = PANELS[Math.floor(R() * PANELS.length)]
          b.add(key, metricBox(m - 0.46, 1.05, 0.1), tm(0, y0 - 0.68, 0.05))
        }
      }
    }
  }
  return par
}

function lowBlock(b: Builder, r: Rect, h: number) {
  const w = r.x1 - r.x0
  const d = r.z1 - r.z0
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  b.block('spWhite', w, h, d, cx, 0, cz)
  b.block('spBase', w + 0.1, 0.6, d + 0.1, cx, 0, cz)
  coping(b, r, h, 0.4)
  b.block('spRoof', w - 0.6, 0.1, d - 0.6, cx, h - 0.6, cz)
  // ribbon windows on all sides
  for (const y of [1.2, 4.6]) {
    b.block('spFrame', w + 0.06, 1.7, d * 0.0 + 0.05, cx, y, r.z1)
    b.block('spFrame', w + 0.06, 1.7, 0.05, cx, y, r.z0)
    b.block('spFrame', 0.05, 1.7, d + 0.06, r.x0, y, cz)
    b.block('spFrame', 0.05, 1.7, d + 0.06, r.x1, y, cz)
  }
}

function build(): Builder {
  const b = new Builder()

  /* C1 — P+10 slab */
  const c1Top = slab(b, C1, 10, 7)
  // stair tower (full height + lift overrun) and entrance hall on the −Z side
  b.block('spWhite', STAIR.x1 - STAIR.x0, c1Top + 2.4, STAIR.z1 - STAIR.z0 + 0.1, (STAIR.x0 + STAIR.x1) / 2, 0, (STAIR.z0 + STAIR.z1) / 2 - 0.05)
  b.block('spGrey', STAIR.x1 - STAIR.x0 + 0.1, 1.5, STAIR.z1 - STAIR.z0 + 0.2, (STAIR.x0 + STAIR.x1) / 2, c1Top + 0.9, (STAIR.z0 + STAIR.z1) / 2 - 0.05)
  coping(b, STAIR, c1Top + 2.4, 0.4)
  for (let f = 0; f < 10; f++) b.block('glassC', 1.2, 1.4, 0.05, (STAIR.x0 + STAIR.x1) / 2, GF + f * FL + 1.0, STAIR.z0 - 0.03)
  b.block('spWhite', HALL.x1 - HALL.x0, 4.4, HALL.z1 - HALL.z0 + 0.1, (HALL.x0 + HALL.x1) / 2, 0, (HALL.z0 + HALL.z1) / 2 - 0.05)
  b.block('glassC', HALL.x1 - HALL.x0 - 1.0, 3.0, 0.05, (HALL.x0 + HALL.x1) / 2, 0.4, HALL.z0 - 0.03)
  coping(b, HALL, 4.4, 0.4)
  // entrance canopy on slender columns (photo 01)
  {
    const x0 = -36.2
    const x1 = -14.1
    const z0 = C1.z0 - 6.2
    b.block('spWhite', x1 - x0, 0.55, 6.2, (x0 + x1) / 2, 3.7, (C1.z0 + z0) / 2)
    b.block('aluRal', x1 - x0 + 0.1, 0.1, 6.3, (x0 + x1) / 2, 4.25, (C1.z0 + z0) / 2)
    for (let x = x0 + 0.6; x <= x1 - 0.5; x += 5.4) b.add('spGrey', new THREE.CylinderGeometry(0.2, 0.2, 3.7, 12), mat(x, 1.85, z0 + 0.5))
  }
  // rooftop technical box and antenna mast
  b.block('spGrey', 8, 3.0, 6, -20, c1Top, -37)
  b.rod('iron', V(-17, c1Top + 3, -36), V(-17, c1Top + 9, -36), 0.08, 6)

  /* C2 — P+4 slab */
  slab(b, C2, 4, 11)

  /* connecting volumes (not part of C1/C2; simplified) */
  lowBlock(b, STRIP, 8.0)
  lowBlock(b, SPINE, 8.0)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-12, 20, -29.5],
  materials: (base) => {
    const ral = (base.aluDarkGrey as THREE.MeshStandardMaterial).clone()
    ral.color = new THREE.Color('#bfc6cc')
    const std = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness })
    return {
      aluRal: ral,
      spWhite: std('#f0f0ec'),
      spBase: std('#9a9b98'),
      spGrey: std('#8e9296'),
      spRoof: std('#7d8084', 0.95),
      spFrame: std('#3a3f44', 0.6),
      spYellow: std('#e2d05a', 0.75),
      spGreen: std('#86bd4f', 0.75),
      spLime: std('#bcd977', 0.75),
    }
  },
  notes:
    'Hospital slabs C1 (ground + 10) and C2 (ground + 4) after the energy retrofit: white fins, yellow-green spandrel panels and anthracite RAL 7016 aluminium window sills (COLOR METAL); block assignment and heights interpreted from one photograph and the OSM outline.',
}
export default model
