/**
 * Church of the Cultural-Missionary Centre „Familia” (former Lebăda complex),
 * Pantelimon island, Ilfov — new church (2020s) in the Brâncovenesc revival
 * manner: a white rectangular body with a ground-floor column arcade, an upper
 * register of blind arches, very wide flat eaves and a single octagonal drum
 * with a ribbed copper dome.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 48.1° towards the altar (NE); entrance front at −X (SW)):
 *  - Footprint after OSM way 1309357327: body 25.1 × 14.0 m (X −14.3 → 10.8)
 *    and a full-width polygonal apse to X 14.3.
 *  - Photo 03 (front, frontal) scaled on the 14 m front: porch floor ≈ 1.2 m on a
 *    wide flight of steps; eave ≈ 9.4 m; very low hipped roof (≈ 10°) with
 *    ≈ 1.3 m overhang; square drum base with a skirt roof, octagonal drum
 *    ≈ 5 m across, ≈ 4.2 m high, with colonnettes and tall arched windows on all
 *    faces; ribbed bell dome ≈ 2.4 m high; cross ≈ 20.8 m.
 *  - Photos 01/02: ground register = open porch of five lobed arches on columns
 *    (large central arch with fresco) and, along the sides, an engaged column
 *    arcade (≈ 12 bays) with small windows; a double moulded band; upper
 *    register of ≈ 16 blind round arches per side (8 on the front); cornice.
 *  - METAL as photographed (July 2026): dome, drum skirt and the low roofs in
 *    copper with standing seams ≈ 0.5 m, already weathered to a dark brown
 *    ('copperBrown') — the copper COLOR METAL supplied in 2022-2023 according to
 *    its records.
 * Approximations: the apse and the north-east half were not photographed (apse
 * from the OSM outline, registers continued around it); drum position along the
 * axis estimated from photo 01; arch counts approximate; roof pitch estimated
 * (the roof is barely visible in the photographs).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, loft, dome, type Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const WALL = 'ptWall'
const TRIM = 'ptTrim'
const D2R = Math.PI / 180

const X0 = -14.3 // front
const XP = -11.0 // porch back wall (narthex front)
const XA = 10.8 // apse junction
const HW = 7.0
const FLOOR = 1.2 // porch floor / plinth
const ARC = 5.6 // top of the ground register
const EAVE = 9.4
const PITCH = 10
const OV = 1.3

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** apse outline (from the OSM way) grown by g, at height y; ordered −Z → +Z */
const apsePts = (g: number, y: number) => [V(XA, y, -HW - g), V(13.2 + g * 0.8, y, -3.7 - g * 0.6), V(14.3 + g, y, 0), V(13.2 + g * 0.8, y, 3.7 + g * 0.6), V(XA, y, HW + g)]

/** engaged column arcade with lobed-looking arches on a facade frame */
function blindArcade(b: Builder, m: THREE.Matrix4, u0: number, u1: number, n: number, windows: boolean) {
  const step = (u1 - u0) / n
  for (let i = 0; i <= n; i++) {
    const u = u0 + step * i
    b.add(TRIM, new THREE.CylinderGeometry(0.17, 0.19, ARC - FLOOR - 1.0, 10), M(m, mat(u, FLOOR + (ARC - FLOOR - 1.0) / 2, 0.2)))
    b.add(TRIM, metricBox(0.45, 0.2, 0.45), M(m, mat(u, ARC - 1.0 + 0.1, 0.2)))
  }
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    b.add(TRIM, extrude(frameShape('round', step - 0.36, ARC - FLOOR - 0.55, 0.14, u, FLOOR), 0.22, 10), M(m, mat(0, 0, 0.01)))
    if (windows && i % 2 === 0) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.45, 1.0, u, 2.1))), M(m, mat(0, 0, 0.03)))
    }
  }
}

/** upper register of blind round arches */
function upperArches(b: Builder, m: THREE.Matrix4, u0: number, u1: number, n: number) {
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    b.add('ptShade', new THREE.ShapeGeometry(new THREE.Shape(opening('round', step * 0.62, 1.7, u, 6.8, 10))), M(m, mat(0, 0, 0.02)))
    b.add(TRIM, extrude(frameShape('round', step * 0.62, 1.7, 0.1, u, 6.8), 0.08, 10), M(m, mat(0, 0, 0.01)))
  }
}

/** horizontal mouldings of one facade frame between u0 and u1 */
function bands(b: Builder, m: THREE.Matrix4, u0: number, u1: number) {
  const w = u1 - u0
  const c = (u0 + u1) / 2
  b.add(TRIM, metricBox(w, 0.22, 0.3), M(m, mat(c, ARC - 0.1, 0.15)))
  b.add(TRIM, metricBox(w, 0.16, 0.22), M(m, mat(c, ARC + 0.45, 0.11)))
  b.add(TRIM, metricBox(w, 0.12, 0.16), M(m, mat(c, 6.55, 0.08)))
  b.add(TRIM, metricBox(w, 0.3, 0.34), M(m, mat(c, EAVE - 0.2, 0.17)))
  b.add(TRIM, metricBox(w, 0.14, 0.2), M(m, mat(c, EAVE - 0.55, 0.1)))
}

function build(): Builder {
  const b = new Builder()
  const t = Math.tan(PITCH * D2R)

  /* ================= plinth and steps ================= */
  b.block(TRIM, XA - X0 + 0.3, FLOOR, 2 * HW + 0.3, (XA + X0) / 2, 0, 0)
  b.add(TRIM, loft([apsePts(0.15, 0), apsePts(0.15, FLOOR)], { capTop: true, flat: true }))
  for (let i = 0; i < 6; i++) b.block('ptStep', 0.4, FLOOR * (1 - i / 6), 15.5 - i * 0.4, X0 - 0.2 - i * 0.4, 0, 0)

  /* ================= body ================= */
  // lower body behind the porch, upper body over the full length
  b.block(WALL, XA - XP, ARC - FLOOR, 2 * HW, (XA + XP) / 2, FLOOR, 0)
  b.block(WALL, XA - X0, EAVE - ARC, 2 * HW, (XA + X0) / 2, ARC, 0)
  b.block(WALL, XA - X0, 0.35, 2 * HW, (XA + X0) / 2, ARC - 0.35, 0) // porch ceiling slab
  // apse walls
  b.add(WALL, loft([apsePts(0, FLOOR), apsePts(0, EAVE)], { capTop: true, flat: true }))

  // side elevations
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HW, 0, 0, 0)
    const U = (x: number) => (sz > 0 ? x : -x)
    const ua = sz > 0 ? XP : -XA
    const ub = sz > 0 ? XA : -XP
    blindArcade(b, m, ua + 0.2, ub - 0.2, 10, true)
    const ua2 = sz > 0 ? X0 : -XA
    const ub2 = sz > 0 ? XA : -X0
    bands(b, m, ua2, ub2)
    upperArches(b, m, ua2 + 0.2, ub2 - 0.2, 16)
    // porch side: two open arches between columns
    for (const x of [X0 + 0.2, (X0 + XP) / 2, XP]) b.add(TRIM, new THREE.CylinderGeometry(0.2, 0.22, ARC - FLOOR - 0.35, 12), mat(x, FLOOR + (ARC - FLOOR - 0.35) / 2, sz * (HW - 0.25)))
    for (const [xa, xb] of [[X0 + 0.2, (X0 + XP) / 2], [(X0 + XP) / 2, XP]]) {
      b.add(TRIM, extrude(frameShape('round', xb - xa - 0.4, ARC - FLOOR - 0.75, 0.16, U((xa + xb) / 2), FLOOR), 0.3, 10), M(m, mat(0, 0, -0.3)))
    }
  }
  // front: open porch with five arches (large central one)
  {
    const m = faceFrame('-x', X0, 0, 0, 0)
    bands(b, m, -HW, HW)
    upperArches(b, m, -HW + 0.2, HW - 0.2, 8)
    const cols = [-6.75, -4.6, -2.3, 2.3, 4.6, 6.75]
    for (const u of cols) {
      b.add(TRIM, new THREE.CylinderGeometry(0.21, 0.23, ARC - FLOOR - 1.2, 12), mat(X0 + 0.25, FLOOR + (ARC - FLOOR - 1.2) / 2, u))
      b.add(TRIM, metricBox(0.55, 0.22, 0.55), mat(X0 + 0.25, ARC - 1.2 + 0.11, u))
    }
    for (let i = 0; i < cols.length - 1; i++) {
      const a = cols[i]
      const c = cols[i + 1]
      const big = Math.abs(a + c) < 0.01
      const w = c - a - 0.45
      const h = big ? ARC - FLOOR - 0.45 : ARC - FLOOR - 0.75
      b.add(TRIM, extrude(frameShape('round', w, h, 0.2, (a + c) / 2, FLOOR), 0.3, 12), M(m, mat(0, 0, -0.3)))
    }
    // porch back wall with fresco and door
    const mb = faceFrame('-x', XP, 0, 0, 0)
    b.add('ptFresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.6, 3.9, 0, FLOOR + 0.1, 12))), M(mb, mat(0, 0, 0.02)))
    b.add('ptDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 2.6, 0, FLOOR, 10))), M(mb, mat(0, 0, 0.03)))
    for (const u of [-4.6, 4.6]) b.add('ptFresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 2.6, u, FLOOR + 0.5, 10))), M(mb, mat(0, 0, 0.02)))
  }
  // apse registers: bands, arcade, windows
  {
    const ring = apsePts(0, 0)
    for (let i = 0; i < 4; i++) {
      const a = ring[i]
      const c = ring[i + 1]
      const mid = a.clone().add(c).multiplyScalar(0.5)
      const len = a.distanceTo(c)
      const ang = Math.atan2(-(c.x - a.x), c.z - a.z)
      const m = wallAt(mid.x, mid.z, ang)
      bands(b, m, -len / 2, len / 2)
      blindArcade(b, m, -len / 2 + 0.2, len / 2 - 0.2, 2, false)
      upperArches(b, m, -len / 2 + 0.2, len / 2 - 0.2, 3)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.55, 1.5, 0, 2.3, 10))), M(m, mat(0, 0, 0.03)))
    }
  }

  /* ================= low hipped roof with wide eaves ================= */
  {
    const ye = EAVE - OV * t + 0.25
    const yr = EAVE + 0.25 + HW * t
    const H = HW + OV
    const xf = X0 - OV
    const xr = X0 + HW
    facet(b, CU, [V(xf, ye, H), V(XA, ye, H), V(XA, yr, 0), V(xr, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(XA, ye, -H), V(xf, ye, -H), V(xr, yr, 0), V(XA, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(xf, ye, -H), V(xf, ye, H), V(xr, yr, 0)], { seams: SEAM, thickness: 0.1 })
    const ap = apsePts(OV, ye)
    const apex = V(XA, yr, 0)
    for (let i = 0; i < 4; i++) facet(b, CU, [ap[i], ap[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    for (let i = 1; i < 4; i++) b.beam(CU, ap[i].clone().add(V(0, 0.04, 0)), apex.clone().add(V(0, 0.04, 0)), 0.14, 0.08)
    for (const sz of [-1, 1]) b.beam(CU, V(xf, ye + 0.04, sz * H), V(xr, yr + 0.04, 0), 0.14, 0.08)
    b.beam(CU, V(xr, yr + 0.05, 0), V(XA, yr + 0.05, 0), 0.16, 0.1)
    // white fascia and soffit of the deep eaves
    const fh = 0.32
    b.block(TRIM, XA - xf, fh, 2 * H, (XA + xf) / 2, ye - fh, 0)
    b.add(TRIM, loft([apsePts(OV, ye - fh), apsePts(OV, ye)], { capTop: true, capBottom: true, flat: true }))
    for (const sz of [-1, 1]) b.beam(CU, V(xf, ye + 0.02, sz * H), V(XA, ye + 0.02, sz * H), 0.1, 0.1)
    b.beam(CU, V(xf, ye + 0.02, -H), V(xf, ye + 0.02, H), 0.1, 0.1)
  }

  /* ================= drum base, drum and dome ================= */
  {
    const x = 1.0
    const s = 6.2
    const yb = EAVE + 2.2
    b.block(WALL, s, yb - EAVE + 0.3, s, x, EAVE - 0.3, 0)
    b.block(TRIM, s + 0.2, 0.2, s + 0.2, x, yb - 0.2, 0)
    // skirt roof
    const ho = s / 2 + 0.9
    const hi = 2.5
    const ys = yb - 0.35
    const yt = yb + 0.6
    const P = (sx: number, sz: number, h: number, y: number) => V(x + sx * h, y, sz * h)
    const cs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cs[i]
      const [bx, bz] = cs[(i + 1) % 4]
      facet(b, CU, [P(bx, bz, ho, ys), P(ax, az, ho, ys), P(ax, az, hi, yt), P(bx, bz, hi, yt)], { seams: SEAM, thickness: 0.08 })
    }
    // octagonal drum
    const a = 2.35
    const R = a / Math.cos(Math.PI / 8)
    const y0 = yt - 0.2
    const y1 = y0 + 4.2
    prism(b, WALL, { x, n: 8, r: R, y0, h: y1 - y0 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: y0, h: 0.35, grow: 0.12 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: y0 + 0.75, h: 0.12, grow: 0.08 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: y1 - 0.55, h: 0.18, grow: 0.12 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: y1 - 0.3, h: 0.3, grow: 0.25 })
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      const m = wallAt(x + Math.cos(ang) * a, Math.sin(ang) * a, ang)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.55, 2.6, 0, y0 + 0.95, 10))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 0.55, 2.6, 0.12, 0, y0 + 0.95), 0.1, 10), M(m, mat(0, 0, 0.01)))
      for (const u of [-0.75, 0.75]) b.add(TRIM, new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8), M(m, mat(u, y0 + 0.95 + 1.4, 0.12)))
      // colonnette on the corner
      const ca = ang + Math.PI / 8
      b.add(TRIM, new THREE.CylinderGeometry(0.13, 0.13, y1 - y0 - 0.9, 8), mat(x + Math.cos(ca) * (R + 0.05), y0 + 0.35 + (y1 - y0 - 0.9) / 2, Math.sin(ca) * (R + 0.05)))
    }
    // ribbed bell dome
    const prof: [number, number][] = [[1.0, 0], [1.02, 0.08], [0.98, 0.25], [0.88, 0.45], [0.72, 0.64], [0.5, 0.8], [0.26, 0.92], [0.08, 0.99], [0.01, 1]]
    const top = dome(b, CU, { x, y: y1, z: 0, r: R + 0.1, h: 2.4, profile: prof, seg: 40, ribs: 32, ribH: 0.05 })
    prism(b, CU, { x, n: 12, r: 0.22, y0: top - 0.05, h: 0.35 })
    b.add('gilt', new THREE.SphereGeometry(0.2, 12, 8), mat(x, top + 0.45, 0))
    b.add('gilt', metricBox(0.1, 1.6, 0.1), mat(x, top + 1.35, 0))
    b.add('gilt', metricBox(0.1, 0.1, 0.9), mat(x, top + 1.65, 0))
    b.add('gilt', metricBox(0.08, 0.08, 0.45), mat(x, top + 1.95, 0))
  }
  // small gilt cross on the front of the roof
  b.add('gilt', metricBox(0.08, 0.7, 0.08), mat(X0 + 2.2, EAVE + 1.0, 0))
  b.add('gilt', metricBox(0.08, 0.08, 0.4), mat(X0 + 2.2, EAVE + 1.15, 0))

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [1, 16.5, 0],
  materials: () => ({
    ptWall: new THREE.MeshStandardMaterial({ color: '#f6f5f1', roughness: 0.88 }),
    ptTrim: new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 0.84 }),
    ptShade: new THREE.MeshStandardMaterial({ color: '#e2e0da', roughness: 0.9 }),
    ptStep: new THREE.MeshStandardMaterial({ color: '#dcd3c2', roughness: 0.8 }),
    ptFresco: new THREE.MeshStandardMaterial({ color: '#8a7a62', roughness: 0.75 }),
    ptDoor: new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.7 }),
  }),
  notes:
    'New Brâncovenesc-revival church: white body with porch and column arcade, blind-arch upper register, wide flat eaves, octagonal drum; dome and low roofs in copper weathered to dark brown as photographed in 2026; apse and north-east side inferred.',
}
export default model
