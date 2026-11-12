/**
 * Mănăstirea Piatra Craiului «Sfântul Ioan Iacob Hozevitul» (Bucea, Negreni, Cluj) —
 * the new masonry church of the monastery (the most plausible recipient of the copper;
 * the wooden church and the cell block are not modelled).
 *
 * Modelling specification (real metres; origin = estimated plan centre at ground):
 *  - No OSM building outline and no published dimensions. Orientation assumed: +X =
 *    east (bearing 90°) towards the altar apse, the narthex and the west tower at −X
 *    (front = [−1, 0]).
 *  - Plan read from the photos: triconch — a central square bay (10 m) carrying the
 *    main tower, three polygonal apses (east, north, south; 8.4 m wide, 3.3 m deep) and
 *    a western narthex (7 × 10 m) with the bell tower. Overall ≈ 20.3 × 16.5 m.
 *  - Heights scaled from photos 01 and 03 (the 3-storey cell block next to it as the
 *    yardstick): walls with tall narrow arched windows to the cornice ≈ 9.5 m, a blind
 *    arcade attic band to ≈ 11.6 m (photos 02, 03), ribbed half-domes over the apses,
 *    square tower base to ≈ 18.7 m with a low skirt roof, octagonal drum (≈ 6.7 m)
 *    with eight tall arched windows to ≈ 25.7 m, flared ribbed dome to ≈ 29.6 m and
 *    cross (≈ 33 m). West tower ≈ 4.4 m square with an octagonal open belfry and a small
 *    ribbed dome (≈ 24 m). Low hipped roof over the narthex.
 *  - METAL: the only photograph of the finished church (2023, small, at dusk) shows
 *    dark grey-brown roofs on the domes, the tower caps and the narthex. They are shown
 *    in weathered copper — the material supplied by COLOR METAL according to its
 *    records (2020); which surfaces received it is not documented. Ribs/seams 0.5 m.
 * Approximations: plan form, all dimensions, window counts, the frieze and the west
 * front are interpreted from one small finished view and two construction-period
 * photographs (2016/17, under scaffolding); this is a careful massing model.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.04)
const WALL = 'pcWall'
const TRIM = 'pcTrim'
const PLINTH = 'pcPlinth'

/* plan */
const CX = 1.4 // centre of the square bay
const B = 5.0 // half side of the bay
const AHW = 4.2 // apse half width
const AS = 0.8 // straight return
const K = Math.tan(22.5 * D2R)
const AD = AS + AHW * (1 - K) // apse depth from the bay wall
const XN = CX - B - 7.0 // west front of the narthex

/* heights */
const PL = 0.8
const COR = 9.5
const ATT = 11.6
const TB = 18.7 // top of the square tower base

/** Apse outline in apse-local coords (u along the wall, v outward from the bay wall), grown by g. */
function apseLocal(g = 0): [number, number][] {
  return [
    [-AHW - g, 0],
    [-AHW - g, AS + g * K],
    [-AHW * K - g * K, AD + g],
    [AHW * K + g * K, AD + g],
    [AHW + g, AS + g * K],
    [AHW + g, 0],
  ]
}
type Apse = { o: THREE.Vector3; n: THREE.Vector3 }
const APSES: Apse[] = [
  { o: V(CX + B, 0, 0), n: V(1, 0, 0) },
  { o: V(CX, 0, -B), n: V(0, 0, -1) },
  { o: V(CX, 0, B), n: V(0, 0, 1) },
]
function toWorld(a: Apse, u: number, v: number, y: number) {
  // u axis = n rotated −90° about Y so that the ring runs CCW seen from above
  const t = V(-a.n.z, 0, a.n.x)
  return V(a.o.x + a.n.x * v + t.x * u, y, a.o.z + a.n.z * v + t.z * u)
}
function apseRing(a: Apse, y: number, g = 0) {
  return apseLocal(g).map(([u, v]) => toWorld(a, u, v, y))
}

/** Row of small blind arches (frieze) along a straight segment. */
function frieze(b: Builder, p0: THREE.Vector3, p1: THREE.Vector3, n: THREE.Vector3, y0: number, h: number) {
  const L = p0.distanceTo(p1)
  const cnt = Math.max(1, Math.round(L / 1.05))
  const step = L / cnt
  const ry = Math.atan2(n.x, n.z)
  for (let i = 0; i < cnt; i++) {
    const p = p0.clone().lerp(p1, (i + 0.5) / cnt)
    const m = mat(p.x, 0, p.z, ry)
    b.add(TRIM, extrude(frameShape('round', step - 0.3, h, 0.1, 0, y0), 0.06), m)
    b.add('pcRecess', new THREE.ShapeGeometry(new THREE.Shape(opening('round', step - 0.3, h, 0, y0, 8))), M(m, mat(0, 0, 0.01)))
  }
}

function tallWindow(b: Builder, p: THREE.Vector3, n: THREE.Vector3, y0: number, w: number, h: number) {
  const m = mat(p.x, 0, p.z, Math.atan2(n.x, n.z))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.12, 0, y0), 0.06), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.02)))
}

/** Ribbed half-dome over an apse (lathe over 180°, scaled to the apse). */
function halfDome(b: Builder, a: Apse, y: number, rU: number, rV: number, h: number, ribs = 7) {
  const prof: [number, number][] = []
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    prof.push([Math.max(Math.cos(t), 0.002), Math.sin(t) ** 0.9])
  }
  // lathe: x = r·sin φ, z = r·cos φ ; take φ so that the half faces n
  const phi0 = Math.atan2(a.n.x, a.n.z) - Math.PI / 2
  const g = new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy)), 24, phi0, Math.PI)
  // scale: radial rV along n, rU across, h up
  const s = new THREE.Matrix4().makeScale(Math.abs(a.n.x) > 0.5 ? rV : rU, h, Math.abs(a.n.x) > 0.5 ? rU : rV)
  b.add(CU, g, M(mat(a.o.x, y, a.o.z), s))
  // eave ring (half) and ribs
  for (let k = 0; k <= ribs; k++) {
    const ph = phi0 + (k / ribs) * Math.PI
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      if (r1 < 0.06) continue
      const sx = Math.abs(a.n.x) > 0.5 ? rV : rU
      const sz = Math.abs(a.n.x) > 0.5 ? rU : rV
      const A = V(a.o.x + Math.sin(ph) * r0 * sx * 1.006, y + y0 * h, a.o.z + Math.cos(ph) * r0 * sz * 1.006)
      const C = V(a.o.x + Math.sin(ph) * r1 * sx * 1.006, y + y1 * h, a.o.z + Math.cos(ph) * r1 * sz * 1.006)
      b.beam(CU, A, C, 0.07, 0.06, V(Math.sin(ph), 0, Math.cos(ph)))
    }
  }
}

/** Flared ribbed dome on a ring (bell/hemi with an eave lip). */
function capDome(b: Builder, x: number, z: number, y: number, r: number, h: number, ribs: number) {
  const prof: [number, number][] = [
    [r * 1.12, 0],
    [r * 1.08, 0.04],
    [r * 1.0, 0.1],
  ]
  for (let i = 1; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    prof.push([r * Math.cos(t) + 0.002, 0.1 + 0.9 * Math.sin(t)])
  }
  const pts = prof.map(([rr, yy]) => new THREE.Vector2(rr, yy * h))
  b.add(CU, new THREE.LatheGeometry(pts, 32), mat(x, y, z))
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * Math.PI * 2
    for (let i = 2; i < pts.length - 1; i++) {
      const A = V(x + Math.cos(a) * (pts[i].x + 0.02), y + pts[i].y, z + Math.sin(a) * (pts[i].x + 0.02))
      const C = V(x + Math.cos(a) * (pts[i + 1].x + 0.02), y + pts[i + 1].y, z + Math.sin(a) * (pts[i + 1].x + 0.02))
      b.beam(CU, A, C, 0.07, 0.06, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  return y + h
}

function build(): Builder {
  const b = new Builder()

  /* ================= lower body ================= */
  // central bay + narthex (one block) and the three apses
  const xb0 = CX - B
  const xb1 = CX + B
  const blk = (key: string, y0: number, y1: number, g = 0) => b.block(key, xb1 - XN + 2 * g, y1 - y0, 2 * B + 2 * g, (XN + xb1) / 2, y0, 0)
  blk(WALL, 0, ATT)
  blk(PLINTH, 0, PL, 0.1)
  blk(TRIM, COR - 0.3, COR + 0.05, 0.25) // main cornice
  blk(TRIM, ATT - 0.05, ATT + 0.15, 0.2) // attic coping
  for (const a of APSES) {
    b.add(WALL, loft([apseRing(a, 0), apseRing(a, ATT)], { capTop: true, flat: true }))
    b.add(PLINTH, loft([apseRing(a, 0, 0.1), apseRing(a, PL, 0.1)], { capTop: true, flat: true }))
    b.add(TRIM, loft([apseRing(a, COR - 0.3, 0.25), apseRing(a, COR + 0.05, 0.25)], { capTop: true, capBottom: true, flat: true }))
    b.add(TRIM, loft([apseRing(a, ATT - 0.05, 0.2), apseRing(a, ATT + 0.15, 0.2)], { capTop: true, capBottom: true, flat: true }))
    // facets: tall window on the three polygon faces, frieze on all
    const ring = apseRing(a, 0)
    for (let i = 0; i < ring.length - 1; i++) {
      const p0 = ring[i]
      const p1 = ring[i + 1]
      const d = V().subVectors(p1, p0).normalize()
      const n = V(d.z, 0, -d.x)
      frieze(b, p0.clone().add(n.clone().multiplyScalar(0.02)), p1.clone().add(n.clone().multiplyScalar(0.02)), n, COR + 0.35, 1.45)
      if (i >= 1 && i <= 3) tallWindow(b, p0.clone().lerp(p1, 0.5).add(n.clone().multiplyScalar(0.02)), n, 3.4, 0.62, 3.2)
    }
  }
  // frieze + windows on the straight walls (corners of the bay and the narthex)
  const seg = (x0: number, z0: number, x1: number, z1: number) => {
    const p0 = V(x0, 0, z0)
    const p1 = V(x1, 0, z1)
    const d = V().subVectors(p1, p0).normalize()
    const n = V(d.z, 0, -d.x)
    frieze(b, p0.clone().add(n.clone().multiplyScalar(0.02)), p1.clone().add(n.clone().multiplyScalar(0.02)), n, COR + 0.35, 1.45)
    return { p0, p1, n }
  }
  // segments run counter-clockwise (outward normal = (d.z, 0, −d.x))
  const sN = seg(xb0, B, XN, B)
  seg(CX - AHW, B, xb0, B)
  seg(xb1, B, CX + AHW, B)
  const nN = seg(XN, -B, xb0, -B)
  seg(xb0, -B, CX - AHW, -B)
  seg(CX + AHW, -B, xb1, -B)
  seg(xb1, -B, xb1, -AHW)
  seg(xb1, AHW, xb1, B)
  const wF = seg(XN, B, XN, -B)
  for (const s of [sN, nN]) for (const t of [0.3, 0.7]) tallWindow(b, s.p0.clone().lerp(s.p1, t).add(s.n.clone().multiplyScalar(0.02)), s.n, 3.4, 0.62, 3.0)
  // west front: portal and two windows
  {
    const m = mat(XN - 0.02, 0, 0, -Math.PI / 2)
    b.add('pcDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.8, 3.4, 0, PL))), M(m, mat(0, 0, 0.0)))
    b.add(TRIM, extrude(frameShape('round', 1.8, 3.4, 0.35, 0, PL), 0.15), m)
    b.add(TRIM, extrude(frameShape('round', 3.0, 5.2, 0.12, 0, PL), 0.1), m)
    b.add('pcIcon', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 1.6, 0, 5.0))), M(m, mat(0, 0, 0.03)))
    for (const t of [0.18, 0.82]) tallWindow(b, wF.p0.clone().lerp(wF.p1, t).add(wF.n.clone().multiplyScalar(0.02)), wF.n, 3.4, 0.62, 3.0)
  }

  /* ================= apse half-domes ================= */
  for (const a of APSES) halfDome(b, a, ATT + 0.15, AHW + 0.35, AD + 0.35, 3.0)

  /* ================= narthex roof (low hip) ================= */
  {
    const ov = 0.35
    const p = Math.tan(28 * D2R)
    const x0 = XN - ov
    const x1 = xb0 + 0.6
    const hz = B + ov
    const ey = ATT + 0.15
    const ry = ey + hz * p
    const r0 = V(x0 + hz, ry, 0)
    const r1 = V(x1, ry, 0)
    facet(b, CU, [V(x0, ey, hz), V(x1, ey, hz), r1, r0], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(x1, ey, -hz), V(x0, ey, -hz), r0, r1], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(x0, ey, -hz), V(x0, ey, hz), r0], { seams: SEAM, thickness: 0.1 })
    for (const c of [V(x0, ey, hz), V(x0, ey, -hz)]) b.beam(CU, c, r0, 0.16, 0.1)
    b.beam(CU, r0, r1, 0.2, 0.12)
  }

  /* ================= central tower ================= */
  {
    const hb = B + 0.1
    b.block(WALL, 2 * hb, TB - ATT, 2 * hb, CX, ATT, 0)
    b.block(TRIM, 2 * hb + 0.3, 0.25, 2 * hb + 0.3, CX, 14.9, 0) // mid band
    b.block(TRIM, 2 * hb + 0.4, 0.3, 2 * hb + 0.4, CX, TB - 0.3, 0)
    for (const [x0, z0, x1, z1] of [[CX - hb, -hb, CX + hb, -hb], [CX + hb, -hb, CX + hb, hb], [CX + hb, hb, CX - hb, hb], [CX - hb, hb, CX - hb, -hb]]) {
      const p0 = V(x0, 0, z0)
      const p1 = V(x1, 0, z1)
      const d = V().subVectors(p1, p0).normalize()
      const n = V(d.z, 0, -d.x)
      frieze(b, p0.clone().add(n.clone().multiplyScalar(0.02)), p1.clone().add(n.clone().multiplyScalar(0.02)), n, 15.5, 2.5)
    }
    // low copper skirt roof over the square base
    const sk0 = polyRing(4, (hb + 0.45) * Math.SQRT2, TB - 0.1, Math.PI / 4, CX, 0)
    const sk1 = polyRing(4, 3.6 * Math.SQRT2, TB + 1.4, Math.PI / 4, CX, 0)
    for (let i = 0; i < 4; i++) facet(b, CU, [sk0[i], sk0[(i + 1) % 4], sk1[(i + 1) % 4], sk1[i]], { seams: SEAM, thickness: 0.08 })
    for (let i = 0; i < 4; i++) b.beam(CU, sk0[i], sk1[i], 0.14, 0.1)
    b.block(CU, 7.2, 0.06, 7.2, CX, TB + 1.37, 0)
    // octagonal drum with tall arched windows
    const rd = 3.35
    const yd0 = TB + 1.3
    const yd1 = 25.7
    b.add(WALL, loft([polyRing(8, rd, yd0, Math.PI / 8, CX, 0), polyRing(8, rd, yd1, Math.PI / 8, CX, 0)], { capTop: true, flat: true }))
    b.add(TRIM, loft([polyRing(8, rd + 0.2, yd1 - 0.35, Math.PI / 8, CX, 0), polyRing(8, rd + 0.2, yd1, Math.PI / 8, CX, 0)], { capTop: true, capBottom: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1) / 8) * Math.PI * 2 // face centres of a polyRing with phase π/8
      const ap = rd * Math.cos(Math.PI / 8)
      const n = V(Math.cos(a), 0, Math.sin(a))
      tallWindow(b, V(CX + n.x * (ap + 0.02), 0, n.z * (ap + 0.02)), n, yd0 + 1.2, 0.7, 3.1)
      // corner colonnettes
      const c = (k / 8) * Math.PI * 2 + Math.PI / 8
      b.rod(TRIM, V(CX + Math.cos(c) * rd, yd0, Math.sin(c) * rd), V(CX + Math.cos(c) * rd, yd1 - 0.35, Math.sin(c) * rd), 0.13, 8)
    }
    const top = capDome(b, CX, 0, yd1, rd + 0.25, 3.9, 16)
    b.add(CU, new THREE.CylinderGeometry(0.22, 0.3, 0.5, 12), mat(CX, top + 0.2, 0))
    cross(b, 'pcCross', CX, top + 0.35, 0, 3.2, false, Math.PI / 2)
  }

  /* ================= west tower (over the narthex) ================= */
  {
    const tx = XN + 3.5
    const hw = 2.2
    const y0 = ATT
    const yT = 16.6
    b.block(WALL, 2 * hw, yT - y0, 2 * hw, tx, y0, 0)
    b.block(TRIM, 2 * hw + 0.3, 0.25, 2 * hw + 0.3, tx, yT - 0.25, 0)
    for (const [x0, z0, x1, z1] of [[tx - hw, -hw, tx + hw, -hw], [tx + hw, -hw, tx + hw, hw], [tx + hw, hw, tx - hw, hw], [tx - hw, hw, tx - hw, -hw]]) {
      const p0 = V(x0, 0, z0)
      const p1 = V(x1, 0, z1)
      const d = V().subVectors(p1, p0).normalize()
      const n = V(d.z, 0, -d.x)
      frieze(b, p0.clone().add(n.clone().multiplyScalar(0.02)), p1.clone().add(n.clone().multiplyScalar(0.02)), n, 14.6, 1.5)
    }
    // copper cornice skirt
    const sk0 = polyRing(4, (hw + 0.35) * Math.SQRT2, yT - 0.05, Math.PI / 4, tx, 0)
    const sk1 = polyRing(4, 1.7 * Math.SQRT2, yT + 0.6, Math.PI / 4, tx, 0)
    for (let i = 0; i < 4; i++) facet(b, CU, [sk0[i], sk0[(i + 1) % 4], sk1[(i + 1) % 4], sk1[i]], { thickness: 0.06 })
    b.block(CU, 3.4, 0.05, 3.4, tx, yT + 0.57, 0)
    // octagonal open belfry
    const rb = 1.5
    const yb0 = yT + 0.5
    const yb1 = yb0 + 3.3
    const ring = polyRing(8, rb, 0, Math.PI / 8, tx, 0)
    for (let k = 0; k < 8; k++) {
      // corner piers
      b.block(WALL, 0.42, yb1 - yb0, 0.42, ring[k].x, yb0, ring[k].z)
      // arched head panel between the piers
      const p0 = ring[k]
      const p1 = ring[(k + 1) % 8]
      const c = p0.clone().lerp(p1, 0.5)
      const n = V(c.x - tx, 0, c.z).normalize()
      const w = p0.distanceTo(p1)
      b.add(WALL, extrude(new THREE.Shape([new THREE.Vector2(-w / 2, yb1 - 0.55), new THREE.Vector2(w / 2, yb1 - 0.55), new THREE.Vector2(w / 2, yb1), new THREE.Vector2(-w / 2, yb1)]), 0.3), mat(c.x - n.x * 0.15, 0, c.z - n.z * 0.15, Math.atan2(n.x, n.z)))
      b.add(WALL, metricBox(w, 0.9, 0.3), mat(c.x, yb0 + 0.45, c.z, Math.atan2(n.x, n.z)))
    }
    b.add('pcDark', loft([polyRing(8, rb - 0.25, yb0, Math.PI / 8, tx, 0), polyRing(8, rb - 0.25, yb1, Math.PI / 8, tx, 0)], { flat: true }))
    b.add(TRIM, loft([polyRing(8, rb + 0.28, yb1, Math.PI / 8, tx, 0), polyRing(8, rb + 0.28, yb1 + 0.25, Math.PI / 8, tx, 0)], { capTop: true, capBottom: true, flat: true }))
    const top = capDome(b, tx, 0, yb1 + 0.25, rb + 0.1, 1.6, 12)
    cross(b, 'pcCross', tx, top, 0, 2.2, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [8.0, 12.5, 0],
  materials: () => ({
    pcWall: new THREE.MeshStandardMaterial({ color: '#f0efeb', roughness: 0.9 }),
    pcTrim: new THREE.MeshStandardMaterial({ color: '#e2e0da', roughness: 0.88 }),
    pcRecess: new THREE.MeshStandardMaterial({ color: '#dddad3', roughness: 0.92 }),
    pcPlinth: new THREE.MeshStandardMaterial({ color: '#a9a59c', roughness: 0.9 }),
    pcDoor: new THREE.MeshStandardMaterial({ color: '#4d3626', roughness: 0.7 }),
    pcIcon: new THREE.MeshStandardMaterial({ color: '#b5944f', roughness: 0.6 }),
    pcDark: new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.8 }),
    pcCross: new THREE.MeshStandardMaterial({ color: '#c9c5bb', metalness: 0.6, roughness: 0.4 }),
  }),
  notes: 'Interpreted massing of the new triconch church: central drum tower, apse half-domes, west bell tower; roofs in the weathered copper supplied by COLOR METAL according to its records (consistent with the dark roofs of the 2023 photo).',
}
export default model
