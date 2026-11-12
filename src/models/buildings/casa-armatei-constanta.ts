/**
 * Cercul Militar / Casa Armatei, Constanța (former county Prefecture, Str. Traian
 * 29; OSM relation 3071358, LMI CT-II-m-A-02856, OSM start_date 1912).
 *
 * Modelling specification (real metres; origin = OSM outline centre at ground,
 * +X = OSM long axis 11.7° = towards Str. Traian (main façade, front), +Z =
 * 101.7°). Sources: a single early-20th-century public-domain postcard of the
 * main façade ("Constanza. Praefektur") and the OSM multipolygon: outer
 * rectangle 34.4 × 30.6 m with an inner light well ≈ 7.4 × 8.7 m (x −7.2 … 0.3).
 *  - Block of a raised rusticated basement (≈ 2.6 m, double flight of front
 *    steps to the entrance), ground floor and first floor; entablature with
 *    modillions, eave ≈ 13.5 m (heights scaled from the postcard on the 30.6 m
 *    front width).
 *  - Main façade (+X, 30.6 m): slightly projecting side bays with rusticated
 *    quoins and one window per floor; centre with three large round-arched
 *    openings (door in the middle) under archivolts, a continuous balcony on
 *    consoles with a balustrade, three tripartite first-floor windows with small
 *    pediments.
 *  - Roof: hipped (≈ 32°) with a flat top around the light well, small dormers
 *    and tall chimneys as on the postcard.
 *  - METAL: no photograph shows the roof after the 2018–2019 works; the roof
 *    surfaces, dormer cheeks and flashings are shown in natural titanium-zinc
 *    (zincNatural, standing seams ≈ 0.5 m) supplied by COLOR METAL according to
 *    its records — which surfaces were done is not documented.
 * Approximations (tier C, one historic view only): the side and rear façades,
 * the light well and the roof top are not documented and are inferred from the
 * main façade rhythm and the OSM outline; ornament reduced to frames, bands and
 * blocks; present-day colours unknown (neutral light plaster).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, seams, faceFrame, truncatedHip } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const WALL = 'caPlaster'
const ORN = 'caTrim'
const RUST = 'caRustic'
const SEAM = seams(ZN, 0.5, 0.04, 0.045)
const D2R = Math.PI / 180

const HX = 17.18
const HZ = 15.3
const WELL = { x0: -7.2, x1: 0.3, z0: -4.6, z1: 4.1 }
const BASE = 2.6
const STRING = 7.75
const EAVE = 13.5
const PITCH = 32
const RISE = 4.6
const OV = 0.7

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function win(b: Builder, face: Face, plane: number, u: number, w: number, h: number, y0: number, type: OpeningType = 'rect', lights = 2) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.03)))
  b.add(ORN, extrude(frameShape(type, w, h, 0.22, 0, y0), 0.12, 8), m)
  b.add(ORN, metricBox(w + 0.5, 0.14, 0.3), mul(m, mat(0, y0 - 0.12, 0.12)))
  for (let i = 1; i < lights; i++) b.add('caFrame', metricBox(0.08, h * (type === 'rect' ? 1 : 0.8), 0.05), mul(m, mat(-w / 2 + (i * w) / lights, y0 + h * (type === 'rect' ? 0.5 : 0.4), 0.05)))
  b.add('caFrame', metricBox(w, 0.07, 0.05), mul(m, mat(0, y0 + h * 0.72, 0.05)))
}

/** rusticated quoin strip (alternating blocks) */
function quoins(b: Builder, face: Face, plane: number, u: number, y0: number, y1: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  let k = 0
  for (let y = y0; y < y1 - 0.2; y += 0.55) {
    const w = k++ % 2 ? 0.75 : 1.05
    b.add(ORN, metricBox(w, 0.45, 0.14), mul(m, mat(0, y + 0.225, 0.07)))
  }
}

function pediment(b: Builder, m: THREE.Matrix4, w: number, y: number, rise: number) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)])
  b.add(ORN, extrude(s, 0.3, 2), mul(m, mat(0, y, 0.0)))
  b.add(ORN, metricBox(w + 0.15, 0.14, 0.38), mul(m, mat(0, y - 0.07, 0.17)))
}

/** one façade (u from −half to +half), with window rhythm for the upper floor and arched ground floor */
function plainFacade(b: Builder, face: Face, plane: number, half: number, spacing: number) {
  const n = Math.round((2 * half - 3) / spacing)
  const step = (2 * half - 3) / n
  for (let i = 0; i < n; i++) {
    const u = -half + 1.5 + step * (i + 0.5)
    win(b, face, plane, u, 1.4, 2.9, 3.6, 'round', 2)
    win(b, face, plane, u, 1.4, 2.6, 8.7, 'rect', 2)
    const m = faceFrame(face, plane, u, 0, 0)
    b.add(ORN, metricBox(2.0, 0.16, 0.34), mul(m, mat(0, 11.6, 0.15)))
    b.add('glassC', metricBox(0.9, 0.5, 0.04), mul(m, mat(0, 1.2, 0.02)))
  }
  quoins(b, face, plane, -half + 0.55, BASE, EAVE - 1.2)
  quoins(b, face, plane, half - 0.55, BASE, EAVE - 1.2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  b.block(WALL, 2 * HX, EAVE, 2 * HZ, 0, 0, 0)
  // rusticated basement with joints
  b.block(RUST, 2 * HX + 0.16, BASE, 2 * HZ + 0.16, 0, 0, 0)
  for (let y = 0.5; y < BASE; y += 0.5) b.block('caJoint', 2 * HX + 0.18, 0.05, 2 * HZ + 0.18, 0, y, 0)
  b.block(ORN, 2 * HX + 0.3, 0.25, 2 * HZ + 0.3, 0, BASE - 0.05, 0)
  // string course at the balcony level and entablature with modillions
  b.block(ORN, 2 * HX + 0.24, 0.3, 2 * HZ + 0.24, 0, STRING, 0)
  b.block(ORN, 2 * HX + 0.14, 0.35, 2 * HZ + 0.14, 0, EAVE - 1.2, 0)
  b.block(ORN, 2 * HX + 0.4, 0.2, 2 * HZ + 0.4, 0, EAVE - 0.5, 0)
  b.block(ORN, 2 * HX + 0.9, 0.3, 2 * HZ + 0.9, 0, EAVE - 0.3, 0)
  for (let z = -HZ + 0.3; z < HZ; z += 0.75) for (const s of [-1, 1]) b.block(ORN, 0.4, 0.22, 0.16, s * (HX + 0.2), EAVE - 0.52, z, Math.PI / 2)
  for (let x = -HX + 0.3; x < HX; x += 0.75) for (const s of [-1, 1]) b.block(ORN, 0.16, 0.22, 0.4, x, EAVE - 0.52, s * (HZ + 0.2))

  /* ================= main façade (+X) ================= */
  {
    const F: Face = '+x'
    const P = HX
    // side bays (slight projection, quoins, one window per floor)
    for (const s of [-1, 1]) {
      const zc = s * 12.15
      b.block(WALL, 0.3, EAVE - 0.2, 6.3, HX + 0.15, 0, zc)
      b.block(RUST, 0.46, BASE, 6.46, HX + 0.15, 0, zc)
      quoins(b, F, P + 0.3, -(zc - s * 2.9), BASE, EAVE - 1.2)
      quoins(b, F, P + 0.3, -(zc + s * 2.9), BASE, EAVE - 1.2)
      win(b, F, P + 0.3, -zc, 1.7, 3.0, 3.5, 'round', 2)
      win(b, F, P + 0.3, -zc, 1.9, 2.6, 8.7, 'rect', 2)
      const m = faceFrame(F, P + 0.3, -zc, 0, 0)
      b.add(ORN, metricBox(2.5, 0.18, 0.36), mul(m, mat(0, 11.6, 0.17)))
      b.add('glassC', metricBox(1.0, 0.55, 0.04), mul(m, mat(0, 1.25, 0.02)))
    }
    // centre: three large arched openings with archivolts, door in the middle
    for (const z of [-5.0, 0, 5.0]) {
      const m = faceFrame(F, P, -z, 0, 0)
      if (z === 0) {
        b.add('caFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.0, 3.8, 0, BASE, 10))), mul(m, mat(0, 0, 0.03)))
        b.add(ORN, extrude(frameShape('round', 2.0, 3.8, 0.3, 0, BASE), 0.14, 10), m)
      } else {
        win(b, F, P, -z, 2.3, 3.4, 3.6, 'round', 3)
      }
      b.add(ORN, extrude(frameShape('round', 3.0, 4.6, 0.32, 0, BASE + 0.4), 0.1, 12), m)
      // console pairs under the balcony
      for (const d of [-1.6, 1.6]) b.add(ORN, metricBox(0.3, 0.6, 0.6), mul(m, mat(d, STRING - 0.2, 0.3)))
    }
    // continuous balcony with balustrade
    b.block(ORN, 0.9, 0.25, 15.6, HX + 0.45, STRING + 0.05, 0)
    b.block(ORN, 0.2, 0.12, 15.6, HX + 0.8, STRING + 1.1, 0)
    for (let z = -7.6; z <= 7.6; z += 0.32) b.add(ORN, new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6), mat(HX + 0.8, STRING + 0.7, z))
    for (const s of [-1, 1]) b.block(ORN, 0.9, 0.95, 0.2, HX + 0.45, STRING + 0.3, s * 7.8)
    // first floor: three tripartite windows with pediments
    for (const z of [-5.0, 0, 5.0]) {
      win(b, F, P, -z, 3.2, 2.7, 8.7, 'rect', 3)
      const m = faceFrame(F, P, -z, 0, 0)
      pediment(b, m, 3.8, 11.65, z === 0 ? 0.8 : 0.65)
    }
    // double flight of steps to the entrance (postcard)
    b.block(RUST, 1.8, BASE, 4.0, HX + 0.9, 0, 0)
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) b.block(RUST, 1.5, BASE * ((i + 1) / 9), 0.42, HX + 1.05, 0, s * (2.0 + 3.8 - i * 0.42 - 0.21))
      b.beam('iron', V(HX + 1.8, BASE + 0.9, s * 2.0), V(HX + 1.8, 0.9, s * 5.8), 0.05, 0.05)
    }
  }

  /* ================= side and rear façades (inferred) ================= */
  plainFacade(b, '+z', HZ, HX, 3.6)
  plainFacade(b, '-z', -HZ, HX, 3.6)
  plainFacade(b, '-x', -HX, HZ, 3.6)

  /* ================= roof ================= */
  {
    const t = Math.tan(PITCH * D2R)
    const m = truncatedHip(0, 0, 2 * HX + 2 * OV, 2 * HZ + 2 * OV, EAVE - OV * t, PITCH * D2R, RISE + OV * t)
    for (const f of m.facets) facet(b, ZN, f, { seams: SEAM, thickness: 0.12 })
    for (const [a, c] of m.lines) b.beam(ZN, a.clone().add(V(0, 0.05, 0)), c.clone().add(V(0, 0.05, 0)), 0.18, 0.08)
    const yc = m.curb.y
    const cw = m.curb.w
    const cd = m.curb.d
    // flat top around the light well (four slabs) + curb flashing
    const { x0, x1, z0, z1 } = WELL
    const slab = (ax: number, bx: number, az: number, bz: number) => b.block(ZN, bx - ax, 0.12, bz - az, (ax + bx) / 2, yc - 0.12, (az + bz) / 2)
    slab(-cw / 2, cw / 2, -cd / 2, z0)
    slab(-cw / 2, cw / 2, z1, cd / 2)
    slab(-cw / 2, x0, z0, z1)
    slab(x1, cw / 2, z0, z1)
    b.add(ZN, metricBox(cw + 0.2, 0.1, 0.25), mat(0, yc + 0.02, -cd / 2))
    b.add(ZN, metricBox(cw + 0.2, 0.1, 0.25), mat(0, yc + 0.02, cd / 2))
    b.add(ZN, metricBox(0.25, 0.1, cd + 0.2), mat(-cw / 2, yc + 0.02, 0))
    b.add(ZN, metricBox(0.25, 0.1, cd + 0.2), mat(cw / 2, yc + 0.02, 0))
    // light well: inner walls and parapet
    const wy0 = 2.0
    const wh = yc - wy0
    b.block('caWell', x1 - x0, wh, 0.2, (x0 + x1) / 2, wy0, z0 + 0.1)
    b.block('caWell', x1 - x0, wh, 0.2, (x0 + x1) / 2, wy0, z1 - 0.1)
    b.block('caWell', 0.2, wh, z1 - z0, x0 + 0.1, wy0, (z0 + z1) / 2)
    b.block('caWell', 0.2, wh, z1 - z0, x1 - 0.1, wy0, (z0 + z1) / 2)
    b.block('caWellFloor', x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, wy0, (z0 + z1) / 2)
    b.block(ZN, x1 - x0 + 0.4, 0.5, 0.25, (x0 + x1) / 2, yc - 0.1, z0)
    b.block(ZN, x1 - x0 + 0.4, 0.5, 0.25, (x0 + x1) / 2, yc - 0.1, z1)
    b.block(ZN, 0.25, 0.5, z1 - z0, x0, yc - 0.1, (z0 + z1) / 2)
    b.block(ZN, 0.25, 0.5, z1 - z0, x1, yc - 0.1, (z0 + z1) / 2)

    // dormers on the front slope (postcard): central double dormer with a gable, two small pointed ones, two end ones
    const slopeX = (y: number) => HX + OV - (y - (EAVE - OV * t)) / t
    const dormer = (z: number, w: number, gable: boolean, face: 1 | -1 = 1, axis: 'x' | 'z' = 'x') => {
      const y0 = EAVE + 0.5
      const h = 1.6
      const xf = slopeX(y0) - 0.15
      const g = new Builder()
      g.add(WALL, metricBox(1.6, h, w), mat(-0.8, y0 + h / 2, 0))
      g.add('glassC', metricBox(0.04, h - 0.6, w - 0.6), mat(0.02, y0 + h / 2 - 0.05, 0))
      g.add(ORN, metricBox(0.1, h - 0.4, w - 0.3), mat(0.0, y0 + h / 2 - 0.05, 0))
      g.add('glassC', metricBox(0.05, h - 0.65, w - 0.65), mat(0.06, y0 + h / 2 - 0.05, 0))
      const yr = y0 + h
      const top = gable ? 0.9 : 1.4
      for (const s of [-1, 1]) facet(g, ZN, [V(0.2, yr, s * (w / 2 + 0.15)), V(-2.2, yr, s * (w / 2 + 0.15)), V(-2.2, yr + top, 0), V(0.2, yr + top, 0)], { seams: SEAM, thickness: 0.08 })
      if (gable) {
        const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, top - 0.05)])
        g.add(ORN, extrude(tri, 0.15, 2), mat(0.05, yr, 0, Math.PI / 2))
      } else {
        g.add(ZN, new THREE.ConeGeometry(0.06, 0.6, 6), mat(0.0, yr + top + 0.25, 0))
      }
      const ry = axis === 'x' ? (face > 0 ? 0 : Math.PI) : face > 0 ? -Math.PI / 2 : Math.PI / 2
      const pos = axis === 'x' ? mat(face * xf, 0, z, ry) : mat(z, 0, face * (HZ + OV - (y0 - (EAVE - OV * t)) / t - 0.15), ry)
      b.merge(g, pos)
    }
    dormer(0, 2.6, true)
    dormer(-3.6, 1.2, false)
    dormer(3.6, 1.2, false)
    dormer(-11.5, 1.2, false)
    dormer(11.5, 1.2, false)
    for (const z of [-8, 0, 8]) dormer(z, 1.2, false, -1)
    for (const x of [-6, 6]) {
      dormer(x, 1.2, false, 1, 'z')
      dormer(x, 1.2, false, -1, 'z')
    }
    // tall chimneys (postcard)
    for (const [x, z] of [[9.5, -10.5], [9.5, -6.5], [9.0, 6.5], [9.5, 10.5], [-11, -9], [-11, 9]]) {
      b.block('caChimney', 0.9, yc + 2.2 - (EAVE - 1), 0.7, x, EAVE - 1, z)
      b.block(ORN, 1.1, 0.18, 0.9, x, yc + 2.2, z)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [10, 15.2, 6],
  materials: () => ({
    caPlaster: new THREE.MeshStandardMaterial({ color: '#e3ddcf', roughness: 0.9 }),
    caTrim: new THREE.MeshStandardMaterial({ color: '#ece7dc', roughness: 0.85 }),
    caRustic: new THREE.MeshStandardMaterial({ color: '#d2cbbb', roughness: 0.92 }),
    caJoint: new THREE.MeshStandardMaterial({ color: '#b9b1a0', roughness: 0.95 }),
    caFrame: new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 0.65 }),
    caWell: new THREE.MeshStandardMaterial({ color: '#cfc8b8', roughness: 0.92 }),
    caWellFloor: new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.95 }),
    caChimney: new THREE.MeshStandardMaterial({ color: '#8a5a45', roughness: 0.9 }),
  }),
  notes:
    'Former Prefecture / Cercul Militar (1912) interpreted from a single historic postcard of the main façade and the OSM outline (tier C); side and rear façades, light well and roof top inferred. Roof shown in natural titanium-zinc per the COLOR METAL record (no photograph of the present roof available).',
}
export default model
