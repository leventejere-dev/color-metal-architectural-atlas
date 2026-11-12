/**
 * Palatul Băncii Comerțului – Primăria Municipiului Craiova, Str. Alexandru Ioan
 * Cuza 7. OSM way 215379214 (39.3 × 37.3 m, long axis 85.5°).
 *
 * Modelling specification (real metres, +X = OSM long axis ≈ east, +Z = the main
 * façade (south, towards A.I. Cuza); photos 01 (oblique), 02 (detail of the
 * east part), 03 (frontal elevation), 2011–2017):
 *  - Plan after the OSM outline: main block x −19.7…11.4, z −18.5…15.0; the
 *    main façade line at z = 15.0 runs on into a lower south-east wing that
 *    turns the corner with a chamfered face (OSM vertices (16.1, 15.1),
 *    (19.7, 11.2), (15.8, 7.6)).
 *  - Main façade composition measured on photo 03 and fitted to the OSM width:
 *    left pavilion (8.7 m) · central risalit (15.4 m, projecting 1.8 m, steps in
 *    front) · right pavilion (7.0 m) · two-bay wing + chamfered corner bay.
 *  - Storeys: raised semi-basement (small grilled windows), ground floor with
 *    tall grilled windows to the string course at ≈ 5.8 m, piano nobile with
 *    twin round-arched windows (pavilions), three tall arched windows and the
 *    clock (central risalit) and pedimented windows (wing); ring frieze and
 *    crenellated cornice at ≈ 12.1 m (central risalit ≈ 13.4 m).
 *  - Roofs: steep pavilion roofs (≈ 62°) with ox-eye dormers and a small
 *    domed lantern + finial on each pavilion (≈ 17.5 m); a tall steep central
 *    roof with a cresting along its flat top (≈ 19 m) and three pointed
 *    gabled dormers between four octagonal turrets with domed caps; hipped
 *    roofs with ox-eyes on the wing; a lower truncated hip over the rear block
 *    with a glazed lantern over the council hall (interior photos show a
 *    glazed ceiling).
 * METAL (client rule): the available photographs predate the 2020–2023
 * rehabilitation and show grey standing-seam sheet metal; all roof surfaces,
 * domes, turret caps, dormers and crestings are shown in natural titanium-zinc,
 * the material supplied by COLOR METAL according to its records (2021),
 * standing seams ≈ 0.5 m.
 * Approximations: exact heights (estimated from photo 03 with the façade width
 * as scale), the rear block and courtyard arrangement (not photographed), the
 * west, north and east elevations (regular windows assumed); stone ornament
 * (coats of arms, tracery, ring frieze) simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, seams, prismOutline, dome } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ROOF = 'zincNatural'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
type P2 = [number, number]

const FZ = 15.0 // main façade line
const BZ = -18.5 // rear façade
const XW = -19.7
const XE = 11.4 // east façade of the main block
const CEN = { x0: -11.0, x1: 4.4, fz: 16.8, h: 13.4 }
const LP = { x0: XW, x1: CEN.x0 }
const RP = { x0: CEN.x1, x1: XE }
const WING: P2[] = [
  [XE, 7.4],
  [15.8, 7.6],
  [19.7, 11.2],
  [16.1, FZ],
  [XE, FZ],
]
const BASE = 1.2 // ground-floor level above the semi-basement
const STR = 5.8 // string course
const COR = 12.1 // main cornice

function offsetPoly(pts: P2[], d: number): P2[] {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i]
    const [x1, z1] = pts[(i + 1) % pts.length]
    area += x0 * z1 - x1 * z0
  }
  const sgn = area > 0 ? 1 : -1
  const n = pts.length
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]
    const c = pts[(i + 1) % n]
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1
    const l2 = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1
    const n1 = [(sgn * (p[1] - a[1])) / l1, (-sgn * (p[0] - a[0])) / l1]
    const n2 = [(sgn * (c[1] - p[1])) / l2, (-sgn * (c[0] - p[0])) / l2]
    const m = [n1[0] + n2[0], n1[1] + n2[1]]
    const ml = Math.hypot(m[0], m[1]) || 1
    const k = d / Math.max(0.35, (m[0] * n1[0] + m[1] * n1[1]) / ml)
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k] as P2
  })
}

const rect = (x0: number, x1: number, z0: number, z1: number): P2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
]

/** Truncated hip ("pavilion" / mansard) roof over any convex polygon; returns the curb ring and its height. */
function polyRoof(b: Builder, poly: P2[], y: number, pitch: number, rise: number, ov = 0.45, top: 'flat' | 'none' = 'flat') {
  const t = Math.tan(pitch * D2R)
  const eave = offsetPoly(poly, ov)
  const curb = offsetPoly(poly, ov - (rise + ov * t) / t)
  const yE = y - ov * t
  const yC = y + rise
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    facet(b, ROOF, [V(eave[i][0], yE, eave[i][1]), V(eave[j][0], yE, eave[j][1]), V(curb[j][0], yC, curb[j][1]), V(curb[i][0], yC, curb[i][1])], { seams: SEAM, thickness: 0.1 })
    b.beam(ROOF, V(eave[i][0], yE + 0.04, eave[i][1]), V(curb[i][0], yC + 0.04, curb[i][1]), 0.18, 0.12)
    b.beam(ROOF, V(eave[i][0], yE - 0.06, eave[i][1]), V(eave[j][0], yE - 0.06, eave[j][1]), 0.2, 0.2) // gutter
    b.beam(ROOF, V(curb[i][0], yC + 0.05, curb[i][1]), V(curb[j][0], yC + 0.05, curb[j][1]), 0.18, 0.14)
  }
  if (top === 'flat') prismOutline(b, ROOF, curb, yC - 0.12, 0.14)
  return { curb, yC, yE, t, eave }
}

/** Point on a roof slope above the façade edge (x along façade at plane z, outward +z): returns the slope point at height yy. */
function cresting(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 0.7) {
  const n = Math.max(2, Math.floor(a.distanceTo(c) / 0.45))
  b.beam(ROOF, a.clone().setY(a.y + 0.1), c.clone().setY(c.y + 0.1), 0.12, 0.12)
  for (let k = 0; k <= n; k++) {
    const p = a.clone().lerp(c, k / n)
    b.add(ROOF, metricBox(0.14, h * (k % 2 ? 0.75 : 1), 0.14), mat(p.x, p.y + (h * (k % 2 ? 0.75 : 1)) / 2 + 0.1, p.z, Math.atan2(c.x - a.x, c.z - a.z)))
    if (k % 2 === 0) b.add(ROOF, new THREE.SphereGeometry(0.09, 6, 4), mat(p.x, p.y + h + 0.15, p.z))
  }
}

function finial(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [
    [0.25, 0],
    [0.18, 0.25],
    [0.3, 0.55],
    [0.18, 0.85],
    [0.08, 1.05],
    [0.04, 1.9],
    [0.0, 2.1],
  ]
  b.add(ROOF, new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r * s, yy * s)), 10), mat(x, y, z))
}

/** Ox-eye dormer on a slope: position on the slope, ry = facing direction. */
function oxEye(b: Builder, p: THREE.Vector3, ry: number) {
  const m = mat(p.x, p.y, p.z, ry)
  b.add(ROOF, new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16, 1, false, -Math.PI / 2, Math.PI), M(m, mat(0, 0.1, -0.15, 0, Math.PI / 2)))
  b.add('prTrim', new THREE.CylinderGeometry(0.5, 0.5, 0.9, 16, 1, false, Math.PI / 2, Math.PI), M(m, mat(0, 0.1, -0.15, 0, Math.PI / 2)))
  b.add('prTrim', new THREE.TorusGeometry(0.5, 0.09, 6, 16), M(m, mat(0, 0.1, 0.28)))
  b.add('glassC', new THREE.CircleGeometry(0.43, 16), M(m, mat(0, 0.1, 0.26)))
}

/** Facade window set on a frame m (local +z outward). */
function arched(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, frame = 0.25, key = 'prTrim') {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  s.lineTo(r, y0 + h - r)
  s.absarc(0, y0 + h - r, r, 0, Math.PI, false)
  s.lineTo(-r, y0)
  b.add('glassC', new THREE.ShapeGeometry(s, 10), M(m, mat(0, 0, 0.03)))
  if (frame > 0) {
    const o = new THREE.Shape()
    const R = r + frame
    o.moveTo(-R, y0 - 0.12)
    o.lineTo(R, y0 - 0.12)
    o.lineTo(R, y0 + h - r)
    o.absarc(0, y0 + h - r, R, 0, Math.PI, false)
    o.lineTo(-R, y0 - 0.12)
    o.holes.push(new THREE.Path(s.getPoints(10)))
    b.add(key, extrude(o, 0.15, 10), m)
  }
}
function rectWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, pediment = false) {
  b.add('glassC', metricBox(w, h, 0.04), M(m, mat(0, y0 + h / 2, 0.02)))
  const f = 0.2
  b.add('prTrim', metricBox(w + 2 * f, f, 0.14), M(m, mat(0, y0 + h + f / 2, 0.07)))
  b.add('prTrim', metricBox(f, h, 0.14), M(m, mat(-w / 2 - f / 2, y0 + h / 2, 0.07)))
  b.add('prTrim', metricBox(f, h, 0.14), M(m, mat(w / 2 + f / 2, y0 + h / 2, 0.07)))
  b.add('prTrim', metricBox(w + 0.6, 0.14, 0.3), M(m, mat(0, y0 - 0.07, 0.12)))
  if (pediment) {
    const p = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.35, 0), new THREE.Vector2(w / 2 + 0.35, 0), new THREE.Vector2(0, 0.6)])
    b.add('prTrim', extrude(p, 0.25), M(m, mat(0, y0 + h + 0.25, 0.02)))
    b.add('prOrn', new THREE.SphereGeometry(0.2, 8, 6), M(m, mat(0, y0 + h + 0.48, 0.25)))
  }
  // grille / glazing bars
  b.add('prIron', metricBox(0.05, h, 0.05), M(m, mat(0, y0 + h / 2, 0.07)))
  b.add('prIron', metricBox(w, 0.05, 0.05), M(m, mat(0, y0 + h * 0.62, 0.07)))
}

/** Ring frieze + crenellated cornice along a façade segment (frame m, length L centred). */
function frieze(b: Builder, m: THREE.Matrix4, L: number, yTop: number) {
  b.add('prTrim', metricBox(L + 0.4, 0.3, 0.5), M(m, mat(0, yTop - 0.15, 0.25)))
  b.add('prTrim', metricBox(L + 0.2, 0.2, 0.3), M(m, mat(0, yTop - 1.25, 0.15)))
  const n = Math.floor(L / 0.7)
  for (let i = 0; i < n; i++) {
    const u = -L / 2 + (i + 0.5) * (L / n)
    b.add('prOrn', new THREE.TorusGeometry(0.2, 0.06, 4, 10), M(m, mat(u, yTop - 0.75, 0.08)))
    b.add('prTrim', metricBox(0.28, 0.3, 0.32), M(m, mat(u, yTop + 0.15, 0.3)))
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= masses ================= */
  const main = rect(XW, XE, BZ, FZ)
  prismOutline(b, 'prWall', main, 0, COR)
  prismOutline(b, 'prWall', WING, 0, COR)
  prismOutline(b, 'prWall', rect(CEN.x0, CEN.x1, FZ - 0.5, CEN.fz), 0, CEN.h)
  // socle (rusticated stone) and string course
  for (const poly of [main, WING, rect(CEN.x0, CEN.x1, FZ - 0.5, CEN.fz)]) {
    prismOutline(b, 'prStone', offsetPoly(poly, 0.12), 0, BASE + 0.5)
    prismOutline(b, 'prTrim', offsetPoly(poly, 0.15), STR - 0.2, 0.35)
    prismOutline(b, 'prTrim', offsetPoly(poly, 0.25), COR - 0.35, 0.3)
  }
  // entrance steps and landing
  for (let i = 0; i < 5; i++) b.block('prStone', 7.5 - i * 0.4, (BASE * (i + 1)) / 5, 0.4, -3.3, 0, 18.4 - i * 0.4)

  /* ================= façade frames ================= */
  const S = (x: number, z = FZ) => mat(x, 0, z, 0)
  // pavilions: frieze, twin arched window, two ground-floor windows, basement windows, quoins
  for (const p of [LP, RP]) {
    const cx = (p.x0 + p.x1) / 2
    const w = p.x1 - p.x0
    frieze(b, S(cx), w, COR)
    const m = S(cx)
    for (const du of [-0.75, 0.75]) arched(b, M(m, mat(du, 0, 0)), 1.05, 2.9, 6.6, 0.12)
    arched(b, M(m, mat(0, 0, -0.01)), 3.2, 3.9, 6.35, 0.3)
    b.add('prTrim', new THREE.CylinderGeometry(0.1, 0.1, 2.3, 8), M(m, mat(0, 6.6 + 1.15, 0.12)))
    b.add('prTrim', metricBox(3.8, 0.25, 0.4), M(m, mat(0, 6.35, 0.2)))
    for (const du of [-w / 4 - 0.2, w / 4 + 0.2]) {
      arched(b, M(m, mat(du, 0, 0)), 1.35, 3.2, BASE + 0.6, 0.22)
      b.add('prIron', metricBox(1.3, 3.0, 0.05), M(m, mat(du, BASE + 0.6 + 1.5, 0.06)))
      b.add('glassC', metricBox(0.9, 0.45, 0.04), M(m, mat(du, 0.55, 0.03)))
    }
    for (const du of [-w / 2 + 0.3, w / 2 - 0.3]) b.add('prStone', metricBox(0.6, COR - BASE - 0.5, 0.12), M(m, mat(du, BASE + 0.5 + (COR - BASE - 0.5) / 2, 0.06)))
  }
  // central risalit
  {
    const cx = (CEN.x0 + CEN.x1) / 2
    const m = S(cx, CEN.fz)
    frieze(b, m, CEN.x1 - CEN.x0, CEN.h)
    b.add('prTrim', metricBox(CEN.x1 - CEN.x0 + 0.3, 0.6, 0.3), M(m, mat(0, CEN.h + 0.6, 0.0)))
    const bays = [-4.5, 0, 4.5]
    for (const du of bays) {
      arched(b, M(m, mat(du, 0, 0)), 2.4, 4.4, 6.6, 0.32)
      b.add('prIron', metricBox(0.06, 4.0, 0.06), M(m, mat(du, 6.6 + 2.0, 0.07)))
      b.add('prTrim', metricBox(3.0, 0.9, 0.5), M(m, mat(du, 6.15, 0.25))) // balcony parapet
    }
    // portal and side arched windows
    arched(b, m, 2.9, 5.2, BASE, 0.45, 'prStone')
    b.add('prDoor', metricBox(2.8, 4.9, 0.05), M(m, mat(0, BASE + 2.45, 0.02)))
    for (const du of [-4.5, 4.5]) arched(b, M(m, mat(du, 0, 0)), 1.7, 3.6, BASE + 0.6, 0.3, 'prStone')
    // clock with pointed hood
    b.add('white', new THREE.CylinderGeometry(0.45, 0.45, 0.08, 20), M(m, mat(0, 10.0, 0.25, 0, Math.PI / 2)))
    b.add('prTrim', metricBox(1.4, 1.6, 0.3), M(m, mat(0, 10.0, 0.1)))
    // coats of arms on the piers
    for (const du of [-6.7, -2.3, 2.3, 6.7]) {
      b.add('prIron', new THREE.SphereGeometry(0.55, 10, 8), M(m, mat(du, 5.0, 0.15, 0, 0, 0, 0.9, 1.3, 0.35)))
      b.add('prStone', metricBox(1.2, CEN.h - BASE - 0.6, 0.2), M(m, mat(du, BASE + 0.6 + (CEN.h - BASE - 0.6) / 2, 0.1)))
    }
    b.add('prOrn', metricBox(4.0, 0.5, 0.12), M(m, mat(-4.0, 11.6, 0.15)))
    b.add('prOrn', metricBox(4.0, 0.5, 0.12), M(m, mat(3.6, 11.6, 0.15)))
    // side returns of the risalit
    for (const s of [-1, 1]) {
      const sx = s < 0 ? CEN.x0 : CEN.x1
      arched(b, mat(sx, 0, FZ + 0.9, s * (Math.PI / 2)), 0.6, 2.6, 7.2, 0.12)
    }
  }
  // wing: two bays on the main façade, one on the chamfer, one on the north-east face
  {
    // chamfered south-east face (outward normal ≈ (0.73, 0.69)) and north-east face (≈ (0.68, −0.73))
    const chm = mat((16.1 + 19.7) / 2, 0, (FZ + 11.2) / 2, Math.atan2(0.726, 0.688))
    const nem = mat((19.7 + 15.8) / 2, 0, (11.2 + 7.6) / 2, Math.atan2(0.678, -0.735))
    const bays: THREE.Matrix4[] = [mat(12.6, 0, FZ, 0), mat(14.9, 0, FZ, 0), chm, nem]
    for (const m of bays) {
      rectWin(b, m, 1.25, 2.6, 6.8, true)
      arched(b, m, 1.4, 3.3, BASE + 0.6, 0.22)
      b.add('prIron', metricBox(1.35, 3.1, 0.05), M(m, mat(0, BASE + 0.6 + 1.55, 0.06)))
      b.add('glassC', metricBox(0.9, 0.45, 0.04), M(m, mat(0, 0.55, 0.03)))
    }
    frieze(b, mat(13.75, 0, FZ, 0), 4.7, COR)
    frieze(b, chm, 5.2, COR)
  }
  // other elevations: regular windows (not photographed)
  for (let i = 0; i < 9; i++) {
    const z = -16.4 + i * 3.6
    if (z > 13) continue
    const m = mat(XW, 0, z, -Math.PI / 2)
    rectWin(b, m, 1.2, 2.6, 6.9)
    rectWin(b, m, 1.2, 2.8, BASE + 0.8)
  }
  for (let i = 0; i < 9; i++) {
    const x = -17.6 + i * 3.5
    const m = mat(x, 0, BZ, Math.PI)
    rectWin(b, m, 1.2, 2.6, 6.9)
    rectWin(b, m, 1.2, 2.8, BASE + 0.8)
  }
  for (let i = 0; i < 7; i++) {
    const z = -16.0 + i * 3.4
    const m = mat(XE, 0, z, Math.PI / 2)
    rectWin(b, m, 1.2, 2.6, 6.9)
    rectWin(b, m, 1.2, 2.8, BASE + 0.8)
  }

  /* ================= roofs (natural titanium-zinc) ================= */
  // rear block: lower truncated hip with a glazed lantern
  {
    const r = polyRoof(b, rect(XW, XE, BZ, 5.5), COR, 38, 3.4)
    const c = r.curb
    const cx = (c[0][0] + c[1][0]) / 2
    const cz = (c[0][1] + c[2][1]) / 2
    b.block('prTrim', 9.0, 0.6, 7.0, cx, r.yC, cz)
    const lz = r.yC + 0.6
    for (const s of [-1, 1]) facet(b, 'glassG', [V(cx - 4.4, lz, cz + s * 3.4), V(cx + 4.4, lz, cz + s * 3.4), V(cx + 4.4, lz + 1.6, cz), V(cx - 4.4, lz + 1.6, cz)], { thickness: 0.05 })
    for (const s of [-1, 1]) facet(b, 'glassG', [V(cx + s * 4.4, lz, cz - 3.4), V(cx + s * 4.4, lz, cz + 3.4), V(cx + s * 4.4, lz + 1.6, cz)])
    for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) b.beam('prIron', V(cx + k, lz, cz + s * 3.4), V(cx + k, lz + 1.6, cz), 0.06, 0.06)
  }
  // pavilions: steep pavilion roofs, ox-eyes, domed lanterns, finials
  for (const p of [LP, RP]) {
    const pw = p.x1 - p.x0
    const z0 = FZ - pw
    const pitch = Math.atan(4.0 / ((pw - 3.6) / 2)) / D2R
    const r = polyRoof(b, rect(p.x0, p.x1, z0, FZ), COR, pitch, 4.0, 0.45, 'none')
    const cx = (p.x0 + p.x1) / 2
    const cz = (z0 + FZ) / 2
    const cw = 3.6
    // lantern: square base, ribbed bell cap, finial
    b.block(ROOF, cw + 0.1, 0.25, cw + 0.1, cx, r.yC - 0.1, cz)
    b.block('prTrim', cw - 0.6, 0.9, cw - 0.6, cx, r.yC + 0.15, cz)
    const top = dome(b, ROOF, { x: cx, z: cz, y: r.yC + 1.05, r: cw / 2 - 0.3, h: 1.75, profile: 'hemi', seg: 24, ribs: 12, ribH: 0.06 })
    finial(b, cx, top - 0.05, cz, 0.9)
    // ox-eyes and a small dormer on the front slope, ox-eyes on the side slopes
    const yD = COR + 1.4
    const ins = (yD - (COR - 0.45 * r.t)) / r.t - 0.45
    for (const du of [-2.1, 2.1]) oxEye(b, V(cx + du, yD, FZ - ins), 0)
    b.block('prTrim', 1.3, 1.6, 1.0, cx, yD - 0.6, FZ - ins - 0.2)
    b.add('glassC', metricBox(0.7, 0.9, 0.04), mat(cx, yD + 0.2, FZ - ins + 0.31))
    facet(b, ROOF, [V(cx - 0.8, yD + 1.0, FZ - ins + 0.35), V(cx + 0.8, yD + 1.0, FZ - ins + 0.35), V(cx, yD + 1.6, FZ - ins + 0.35)], { hint: V(0, 0, 1) })
    for (const s of [-1, 1]) oxEye(b, V(cx + s * ((p.x1 - p.x0) / 2 - ins), yD, cz), s * (Math.PI / 2))
  }
  // central roof: tall steep truncated hip, cresting along the flat top, finials
  {
    const r = polyRoof(b, rect(CEN.x0 + 0.6, CEN.x1 - 0.6, 3.0, CEN.fz - 0.4), CEN.h + 0.6, 66, 5.4, 0.4)
    const c = r.curb
    cresting(b, V(c[0][0], r.yC, (c[0][1] + c[2][1]) / 2), V(c[1][0], r.yC, (c[0][1] + c[2][1]) / 2), 0.8)
    for (const k of [0, 1, 2, 3]) cresting(b, V(c[k][0], r.yC, c[k][1]), V(c[(k + 1) % 4][0], r.yC, c[(k + 1) % 4][1]), 0.45)
    finial(b, c[3][0], r.yC, c[3][1], 1.0)
    finial(b, c[2][0], r.yC, c[2][1], 1.0)
    // three pointed gabled dormers on the front slope
    const yD = CEN.h + 1.6
    const ins = (yD - r.yE) / r.t - 0.4
    for (const x of [-7.6, -3.3, 1.0]) {
      const z = CEN.fz - 0.4 - ins
      b.block('prTrim', 1.6, 2.0, 1.4, x, yD - 0.6, z - 0.4)
      arched(b, mat(x, 0, z + 0.31, 0), 0.75, 1.5, yD - 0.3, 0.1)
      const g = new THREE.Shape([new THREE.Vector2(-1.0, 0), new THREE.Vector2(1.0, 0), new THREE.Vector2(0, 1.5)])
      b.add('prTrim', extrude(g, 0.25), mat(x, yD + 1.4, z + 0.06))
      for (const s of [-1, 1]) facet(b, ROOF, [V(x + s * 1.1, yD + 1.35, z + 0.4), V(x + s * 1.1, yD + 1.35, z - 1.6), V(x, yD + 3.0, z - 1.6), V(x, yD + 3.0, z + 0.4)], { thickness: 0.06 })
      b.rod(ROOF, V(x, yD + 2.9, z + 0.35), V(x, yD + 3.8, z + 0.35), 0.04, 6)
    }
  }
  // four octagonal turrets with domed caps on the central risalit
  for (const x of [-9.85, -5.45, -1.15, 3.25]) {
    const z = CEN.fz + 0.1
    const y0 = CEN.h - 1.5
    b.add('prTrim', new THREE.CylinderGeometry(1.05, 0.7, 1.2, 8, 1, false, Math.PI / 8), mat(x, y0 + 0.6, z))
    b.add('prWall', new THREE.CylinderGeometry(1.0, 1.0, 2.6, 8, 1, false, Math.PI / 8), mat(x, y0 + 2.5, z))
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2
      arched(b, mat(x + Math.cos(a) * 0.93, 0, z + Math.sin(a) * 0.93, Math.PI / 2 - a), 0.45, 1.5, y0 + 1.75, 0.08)
    }
    b.add('prTrim', new THREE.CylinderGeometry(1.25, 1.05, 0.35, 8, 1, false, Math.PI / 8), mat(x, y0 + 3.95, z))
    const top = dome(b, ROOF, { x, z, y: y0 + 4.1, r: 1.15, h: 1.3, profile: 'bell', seg: 16, ribs: 8, ribH: 0.04 })
    finial(b, x, top - 0.05, z, 0.75)
  }
  // south-east wing: hipped roof with ox-eyes
  {
    const r = polyRoof(b, WING, COR, 45, 2.3, 0.45)
    const ins = 0.9 / r.t
    oxEye(b, V(12.6, COR + 0.9, FZ - ins), 0)
    oxEye(b, V(14.9, COR + 0.9, FZ - ins), 0)
    oxEye(b, V(17.9 - 0.726 * ins, COR + 0.9, 13.1 - 0.688 * ins), Math.atan2(0.726, 0.688))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-3.3, 18, 9],
  materials: () => ({
    prWall: new THREE.MeshStandardMaterial({ color: '#ddd3bd', roughness: 0.9 }),
    prTrim: new THREE.MeshStandardMaterial({ color: '#e9e1cd', roughness: 0.85 }),
    prStone: new THREE.MeshStandardMaterial({ color: '#cdbfa3', roughness: 0.9 }),
    prOrn: new THREE.MeshStandardMaterial({ color: '#b9a888', roughness: 0.85 }),
    prIron: new THREE.MeshStandardMaterial({ color: '#2c2d2f', roughness: 0.5, metalness: 0.5 }),
    prDoor: new THREE.MeshStandardMaterial({ color: '#3d2a1f', roughness: 0.7 }),
  }),
  notes:
    'Eclectic bank palace with steep pavilion roofs, domed lanterns, four domed turrets and a crested central roof; all roofs shown in natural titanium-zinc standing seam (register 2021), the photographs predate the rehabilitation.',
}
export default model
