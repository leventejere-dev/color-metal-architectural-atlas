/**
 * Fostul Hotel Palace (Pallace), Craiova — Str. Alexandru Ioan Cuza 1, today an
 * administrative building of the City Hall. OSM way 172692543 (28.8 × 25.4 m,
 * long axis 85.3°).
 *
 * Modelling specification (real metres, +X = OSM long axis ≈ east, +Z = the
 * A.I. Cuza street façade (south), −X = west street façade; the rounded corner
 * with the dome is the south-west corner; photos 01 (2024, after the
 * rehabilitation), 02–03 (2012–2014)):
 *  - Corner block 28.8 × 25.4 m (OSM), four storeys + mansard. Rounded corner
 *    (rotunda) of radius ≈ 5 m carrying three window axes per floor (the OSM
 *    outline only chamfers it).
 *  - Street façades: A.I. Cuza 7 axes (bay, wide pier, 5 axes, wide pier, bay),
 *    west façade 6 axes, counted on photos 01–03.
 *  - Storeys (estimated from the photographs): ground floor with tall arched
 *    openings between rusticated piers to ≈ 5.6 m; a continuous balcony on
 *    large consoles; 1st floor rectangular windows; 2nd floor horseshoe-arched
 *    windows with oculus heads and bowed wrought-iron balconies; 3rd floor triple
 *    arched lights; frieze and deep bracketed eaves (≈ 1.4 m) at ≈ 18.4 m.
 *  - Mansard ≈ 3.0 m high (70°) with arched dormers on every axis, ox-eye
 *    roundels between them and a cresting with pinnacles along the curb.
 *  - Corner dome: bell-shaped, ≈ 9.2 m diameter on a short drum right above the
 *    curved eave, four arched dormers, eight ribs, shingle courses, tall finial
 *    (top ≈ 30 m).
 * METAL: photo 01 (2024) shows the renewed grey metal mansard, dormers and dome
 *   (shingle pattern); modelled as photographed in natural titanium-zinc, the
 *   material supplied by COLOR METAL according to its records (2022). Shingle
 *   courses are suggested by fine horizontal ribs.
 * Approximations: absolute heights and the rotunda radius are estimated; the
 * east side adjoins the neighbouring cinema (blind party wall) and the north
 * courtyard side is not photographed (simple windows assumed); ornament
 * (stucco reliefs, consoles, medallions) simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, prismOutline, dome } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ROOF = 'zincNatural'

const X0 = -14.4
const X1 = 14.4
const Z0 = -12.7
const Z1 = 12.7
const R = 5.0
const CX = X0 + R // rotunda centre
const CZ = Z1 - R

const GF = 5.6 // top of the ground floor
const F2 = 10.1 // 2nd floor band
const F3 = 14.4 // 3rd floor band
const EAVE = 18.4
const MANS = { pitch: 70, rise: 3.0 }

type P2 = [number, number]

/** Building outline (CCW in x–z) with the rounded south-west corner. */
function outline(): P2[] {
  const pts: P2[] = [
    [X0, Z0],
    [X1, Z0],
    [X1, Z1],
  ]
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push([CX + R * Math.cos(a), CZ + R * Math.sin(a)])
  }
  return pts
}

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

/** Street-front polyline (east end of A.I. Cuza → rotunda → north end of the west façade). */
function streetPath(): P2[] {
  const pts: P2[] = [[X1, Z1]]
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push([CX + R * Math.cos(a), CZ + R * Math.sin(a)])
  }
  pts.push([X0, Z0])
  return pts
}

/** Band (ribbon) along an open polyline, width d outward, as a horizontal slab. */
function ribbon(b: Builder, key: string, path: P2[], d0: number, d1: number, y: number, h: number) {
  const off = (d: number) =>
    path.map((p, i) => {
      const a = path[Math.max(0, i - 1)]
      const c = path[Math.min(path.length - 1, i + 1)]
      const tx = c[0] - a[0]
      const tz = c[1] - a[1]
      const l = Math.hypot(tx, tz) || 1
      // outward normal (path runs clockwise around the building seen from above → right-hand side)
      return [p[0] + (-tz / l) * -d, p[1] + (tx / l) * -d] as P2
    })
  const o = off(d1)
  const inn = off(d0).reverse()
  const shp = [...o, ...inn]
  prismOutline(b, key, shp, y, h)
}

/** Placement frames for the window axes of the street façades (x, z, ry with local +z outward). */
interface Axis {
  x: number
  z: number
  ry: number
  kind: 'bay' | 'mid' | 'rot'
}
function axes(): Axis[] {
  const out: Axis[] = []
  for (const x of [-7.2]) out.push({ x, z: Z1, ry: 0, kind: 'bay' })
  for (const x of [-3.4, -0.8, 1.8, 4.4, 7.0]) out.push({ x, z: Z1, ry: 0, kind: 'mid' })
  out.push({ x: 11.6, z: Z1, ry: 0, kind: 'bay' })
  for (const z of [5.5]) out.push({ x: X0, z, ry: -Math.PI / 2, kind: 'bay' })
  for (const z of [1.7, -0.9, -3.5, -6.1]) out.push({ x: X0, z, ry: -Math.PI / 2, kind: 'mid' })
  out.push({ x: X0, z: -10.3, ry: -Math.PI / 2, kind: 'bay' })
  for (const a of [112.5, 135, 157.5]) {
    const t = (a * Math.PI) / 180
    out.push({ x: CX + R * Math.cos(t), z: CZ + R * Math.sin(t), ry: Math.atan2(Math.cos(t), Math.sin(t)), kind: 'rot' })
  }
  return out
}

function archShape(w: number, h: number, y0: number, horseshoe = false) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  const yc = y0 + h - r
  if (horseshoe) {
    s.lineTo(r * 0.92, yc - 0.15)
    s.absarc(0, yc, r * 1.0, -0.15, Math.PI + 0.15, false)
    s.lineTo(-r, y0)
  } else {
    s.lineTo(r, yc)
    s.absarc(0, yc, r, 0, Math.PI, false)
    s.lineTo(-r, y0)
  }
  return s
}

function opening(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: 'rect' | 'arch' | 'horseshoe', glass = 'glassC') {
  const s = type === 'rect' ? new THREE.Shape([new THREE.Vector2(-w / 2, y0), new THREE.Vector2(w / 2, y0), new THREE.Vector2(w / 2, y0 + h), new THREE.Vector2(-w / 2, y0 + h)]) : archShape(w, h, y0, type === 'horseshoe')
  b.add(glass, new THREE.ShapeGeometry(s, 10), M(m, mat(0, 0, 0.03)))
  // surround
  const f = 0.2
  const o = type === 'rect' ? new THREE.Shape([new THREE.Vector2(-w / 2 - f, y0 - 0.1), new THREE.Vector2(w / 2 + f, y0 - 0.1), new THREE.Vector2(w / 2 + f, y0 + h + f), new THREE.Vector2(-w / 2 - f, y0 + h + f)]) : archShape(w + 2 * f, h + f, y0 - 0.1, type === 'horseshoe')
  o.holes.push(new THREE.Path(s.getPoints(10)))
  b.add('hpStucco', extrude(o, 0.14, 10), m)
  b.add('hpFrame', metricBox(0.07, h * 0.9, 0.05), M(m, mat(0, y0 + h * 0.45, 0.05)))
}

/** Bowed wrought-iron balcony. */
function ironBalcony(b: Builder, m: THREE.Matrix4, y: number, w: number) {
  b.add('hpStucco', new THREE.CylinderGeometry(w / 2 + 0.15, w / 2 + 0.05, 0.22, 16, 1, false, -Math.PI / 2, Math.PI), M(m, mat(0, y, 0, 0, 0, 0, 1, 1, 0.6)))
  for (let k = 0; k <= 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * Math.PI
    b.add('hpIron', new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), M(m, mat((Math.sin(a) * w) / 2, y + 0.55, ((Math.cos(a) * w) / 2) * 0.6)))
  }
  b.add('hpIron', new THREE.TorusGeometry(w / 2, 0.035, 4, 16, Math.PI), M(m, mat(0, y + 1.0, 0, 0, Math.PI / 2, 0, 1, 0.6, 1)))
}

/** Horizontal shingle courses on a planar roof face. */
function courses(b: Builder, pts: THREE.Vector3[], step: number) {
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.y < 0) n.negate()
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of pts) {
    y0 = Math.min(y0, p.y)
    y1 = Math.max(y1, p.y)
  }
  for (let y = y0 + step; y < y1 - step * 0.3; y += step) {
    const hits: THREE.Vector3[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if ((a.y - y) * (c.y - y) < 0) hits.push(a.clone().lerp(c, (y - a.y) / (c.y - a.y)))
    }
    if (hits.length < 2) continue
    const off = n.clone().multiplyScalar(0.03)
    b.beam(ROOF, hits[0].clone().add(off), hits[1].clone().add(off), 0.035, 0.05, n)
  }
}

function build(): Builder {
  const b = new Builder()
  const out = outline()
  const street = streetPath()

  /* ================= walls and horizontal articulation ================= */
  prismOutline(b, 'hpWall', out, 0, EAVE)
  prismOutline(b, 'hpSocle', offsetPoly(out, 0.12), 0, 0.7)
  // rusticated ground floor
  for (let y = 1.0; y < GF - 0.3; y += 0.6) prismOutline(b, 'hpStucco', offsetPoly(out, 0.05), y, 0.08)
  // continuous first-floor balcony on consoles with a solid parapet (street sides)
  ribbon(b, 'hpStucco', street, -0.01, 0.95, GF, 0.35)
  ribbon(b, 'hpStucco', street, 0.75, 0.95, GF + 0.35, 0.85)
  ribbon(b, 'hpStucco', street, 0.7, 1.0, GF + 1.2, 0.12)
  // floor bands
  prismOutline(b, 'hpStucco', offsetPoly(out, 0.16), F2 - 0.25, 0.4)
  prismOutline(b, 'hpStucco', offsetPoly(out, 0.1), F3 - 0.2, 0.3)
  // frieze and deep bracketed eaves with zinc fascia
  prismOutline(b, 'hpStucco', offsetPoly(out, 0.12), EAVE - 1.1, 0.25)
  prismOutline(b, 'hpEave', offsetPoly(out, 1.4), EAVE - 0.05, 0.25)
  prismOutline(b, ROOF, offsetPoly(out, 1.48), EAVE + 0.02, 0.22)
  // eave brackets along the street sides
  for (let i = 0; i < street.length - 1; i++) {
    const [ax, az] = street[i]
    const [cx, cz] = street[i + 1]
    const L = Math.hypot(cx - ax, cz - az)
    const n = Math.max(1, Math.round(L / 1.3))
    const nx = -(cz - az) / L
    const nz = (cx - ax) / L
    const ry = Math.atan2(-nx, -nz)
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n
      const x = ax + (cx - ax) * t - nx * 0.6
      const z = az + (cz - az) * t - nz * 0.6
      b.add('hpEave', metricBox(0.16, 0.5, 1.25), mat(x, EAVE - 0.3, z, ry))
    }
  }

  /* ================= window axes ================= */
  for (const a of axes()) {
    const m = mat(a.x, 0, a.z, a.ry)
    const wide = a.kind === 'mid' ? 1.3 : 1.4
    // ground floor: tall arched openings
    opening(b, m, 2.0, 4.1, 0.8, 'arch', a.kind === 'rot' ? 'hpDoor' : 'glassC')
    // console under the balcony
    b.add('hpStucco', metricBox(0.5, 1.0, 0.9), M(m, mat(-1.4, GF - 0.5, 0.45)))
    // 1st floor: rectangular windows between colonnettes
    opening(b, m, wide, 2.7, 6.7, 'rect')
    for (const du of [-wide / 2 - 0.3, wide / 2 + 0.3]) b.add('hpStucco', new THREE.CylinderGeometry(0.08, 0.08, 2.7, 8), M(m, mat(du, 6.7 + 1.35, 0.12)))
    // 2nd floor: horseshoe arch with oculus head + bowed iron balcony
    opening(b, m, wide, 3.4, F2 + 0.45, 'horseshoe')
    b.add('hpStucco', new THREE.TorusGeometry(0.3, 0.06, 6, 16), M(m, mat(0, F2 + 3.25, 0.1)))
    const o = archShape(wide + 1.1, 4.3, F2 + 0.2, true)
    o.holes.push(new THREE.Path(archShape(wide + 0.7, 4.1, F2 + 0.3, true).getPoints(10)))
    b.add('hpStucco', extrude(o, 0.08, 10), M(m, mat(0, 0, 0.02)))
    ironBalcony(b, m, F2 + 0.25, wide + 0.6)
    // 3rd floor: triple arched lights
    for (const du of [-0.55, 0, 0.55]) opening(b, M(m, mat(du * (a.kind === 'mid' ? 1 : 1.1), 0, 0)), 0.42, 1.6, F3 + 0.55, 'arch')
    // medallion on the frieze
    b.add('hpStucco', new THREE.CylinderGeometry(0.28, 0.28, 0.12, 14), M(m, mat(0, EAVE - 0.7, 0.08, 0, Math.PI / 2)))
  }
  // wide piers with medallion heads on the street façades
  for (const [x, z, ry] of [
    [-5.3, Z1, 0],
    [9.3, Z1, 0],
    [X0, 3.6, -Math.PI / 2],
    [X0, -8.2, -Math.PI / 2],
  ] as [number, number, number][]) {
    const m = mat(x, 0, z, ry)
    b.add('hpStucco', metricBox(1.2, EAVE - 1.3 - GF - 1.4, 0.14), M(m, mat(0, GF + 1.4 + (EAVE - 1.3 - GF - 1.4) / 2, 0.07)))
    b.add('hpStucco', new THREE.CylinderGeometry(0.45, 0.45, 0.16, 16), M(m, mat(0, F3 + 2.1, 0.2, 0, Math.PI / 2)))
    b.add('hpStucco', metricBox(1.0, 1.4, 0.4), M(m, mat(0, GF - 0.7, 0.2)))
  }
  // corner entrance steps
  {
    const t = (135 * Math.PI) / 180
    b.add('hpSocle', metricBox(3.2, 0.5, 1.4), mat(CX + (R + 0.5) * Math.cos(t), 0.25, CZ + (R + 0.5) * Math.sin(t), Math.atan2(Math.cos(t), Math.sin(t))))
  }
  // north (courtyard) façade: simple windows; east side is a party wall
  for (let i = 0; i < 8; i++) {
    const x = -12.0 + i * 3.4
    const m = mat(x, 0, Z0, Math.PI)
    for (const y of [1.8, 6.7, F2 + 0.6, F3 + 0.6]) opening(b, m, 1.2, y > F3 ? 1.8 : 2.6, y, 'rect')
  }

  /* ================= mansard (natural titanium-zinc) ================= */
  const t = Math.tan((MANS.pitch * Math.PI) / 180)
  const yE = EAVE + 0.24
  const yC = yE + MANS.rise
  const ins = MANS.rise / t
  const xa = X0 - 0.25
  const xb = X1 + 0.25
  const za = Z0 - 0.25
  const zb = Z1 + 0.25
  const E = (x: number, z: number) => V(x, yE, z)
  const C = (x: number, z: number) => V(x, yC, z)
  // four slopes; at the rounded corner both wings end with a small hip against the dome
  const slopes = [
    [E(CX, zb), E(xb, zb), C(xb - ins, zb - ins), C(CX + ins, zb - ins)],
    [E(CX, zb), C(CX + ins, zb - ins), E(CX, zb - ins)],
    [E(xb, zb), E(xb, za), C(xb - ins, za + ins), C(xb - ins, zb - ins)],
    [E(xb, za), E(xa, za), C(xa + ins, za + ins), C(xb - ins, za + ins)],
    [E(xa, za), E(xa, CZ), C(xa + ins, CZ - ins), C(xa + ins, za + ins)],
    [E(xa, CZ), C(xa + ins, CZ - ins), E(xa + ins, CZ)],
  ]
  for (const f of slopes) {
    facet(b, ROOF, f, { thickness: 0.1 })
    courses(b, f, 0.4)
  }
  for (const [A, B] of [
    [E(xb, zb), C(xb - ins, zb - ins)],
    [E(xb, za), C(xb - ins, za + ins)],
    [E(xa, za), C(xa + ins, za + ins)],
    [E(CX, zb), C(CX + ins, zb - ins)],
    [E(xa, CZ), C(xa + ins, CZ - ins)],
  ]) b.beam(ROOF, A, B, 0.18, 0.12)
  // gutters along the eaves
  for (const [A, B] of [
    [E(CX, zb), E(xb, zb)],
    [E(xb, zb), E(xb, za)],
    [E(xb, za), E(xa, za)],
    [E(xa, za), E(xa, CZ)],
  ]) b.beam(ROOF, A.clone().setY(yE - 0.05), B.clone().setY(yE - 0.05), 0.2, 0.2)
  // flat (low-pitch) top behind the curb, curb roll
  const curbRing: P2[] = [
    [CX + ins, zb - ins],
    [xb - ins, zb - ins],
    [xb - ins, za + ins],
    [xa + ins, za + ins],
    [xa + ins, CZ - ins],
  ]
  prismOutline(b, ROOF, curbRing, yC - 0.1, 0.15)
  for (let i = 0; i < curbRing.length - 1; i++) {
    const j = i + 1
    b.beam(ROOF, V(curbRing[i][0], yC + 0.08, curbRing[i][1]), V(curbRing[j][0], yC + 0.08, curbRing[j][1]), 0.2, 0.16)
  }
  // cresting with pinnacles along the street-side curb
  {
    const p0 = V(X1 - 1.3, yC + 0.15, Z1 + 0.25 - MANS.rise / t)
    const p1 = V(CX, yC + 0.15, p0.z)
    const p2 = V(X0 + 0.25 - MANS.rise / t, yC + 0.15, CZ)
    const p3 = V(p2.x, yC + 0.15, Z0 + 1.3)
    for (const [A, C] of [
      [p0, p1],
      [p2, p3],
    ]) {
      b.beam('hpIron', A.clone().setY(A.y + 0.6), C.clone().setY(C.y + 0.6), 0.04, 0.04)
      const n = Math.floor(A.distanceTo(C) / 0.3)
      for (let k = 0; k <= n; k++) {
        const p = A.clone().lerp(C, k / n)
        b.rod('hpIron', p, p.clone().setY(p.y + (k % 2 ? 0.6 : 0.8)), 0.02, 4)
      }
    }
    for (const a of axes()) {
      if (a.kind === 'rot') continue
      const nx = Math.sin(a.ry)
      const nz = Math.cos(a.ry)
      const ins = MANS.rise / t - 0.25
      const x = a.x - nx * ins + (a.kind === 'mid' ? (a.ry === 0 ? 1.3 : 0) : 0)
      const z = a.z - nz * ins + (a.kind === 'mid' && a.ry !== 0 ? 1.3 : 0)
      b.add(ROOF, new THREE.CylinderGeometry(0.05, 0.16, 1.1, 6), mat(x, yC + 0.7, z))
      b.add(ROOF, new THREE.SphereGeometry(0.13, 8, 6), mat(x, yC + 1.3, z))
    }
  }
  // dormers: arched dormers on every street axis, ox-eye roundels between the middle ones
  for (const a of axes()) {
    if (a.kind === 'rot') continue
    const nx = Math.sin(a.ry)
    const nz = Math.cos(a.ry)
    const yD = yE + 0.3
    const ins = (yD - yE) / t - 0.25
    const big = a.kind === 'bay'
    const m = mat(a.x - nx * ins, yD, a.z - nz * ins, a.ry)
    const w = big ? 1.5 : 1.1
    const h = big ? 2.2 : 1.7
    b.add('hpStucco', metricBox(w + 0.6, h, 1.2), M(m, mat(0, h / 2, -0.4)))
    opening(b, M(m, mat(0, 0, 0.21)), w, h - 0.25, 0.1, 'arch')
    const hood = archShape(w + 0.9, h + 0.55, -0.05)
    hood.holes.push(new THREE.Path(archShape(w + 0.5, h + 0.3, 0.05).getPoints(10)))
    b.add(ROOF, extrude(hood, 1.3, 10), M(m, mat(0, 0, -1.05)))
    b.add(ROOF, new THREE.SphereGeometry(0.14, 8, 6), M(m, mat(0, h + 0.65, 0.15)))
    if (a.kind === 'mid' && a.ry === 0 && a.x < 6) {
      const mo = mat(a.x + 1.3 - nx * ins, yD + 0.7, a.z - nz * (ins + 0.25), a.ry)
      b.add('hpStucco', new THREE.TorusGeometry(0.32, 0.09, 6, 16), M(mo, mat(0, 0, 0.2)))
      b.add('glassC', new THREE.CircleGeometry(0.25, 16), M(mo, mat(0, 0, 0.17)))
    }
    if (a.kind === 'mid' && a.ry !== 0 && a.z > -5) {
      const mo = mat(a.x - nx * (ins + 0.25), yD + 0.7, a.z - 1.3, a.ry)
      b.add('hpStucco', new THREE.TorusGeometry(0.32, 0.09, 6, 16), M(mo, mat(0, 0, 0.2)))
      b.add('glassC', new THREE.CircleGeometry(0.25, 16), M(mo, mat(0, 0, 0.17)))
    }
  }

  /* ================= corner dome ================= */
  {
    const r = 4.6
    const y0 = EAVE + 1.0
    const h = 7.4
    // short drum behind the curved eave
    b.add('hpWall', new THREE.CylinderGeometry(r - 0.05, r, 1.0, 40), mat(CX, EAVE + 0.5, CZ))
    const prof: [number, number][] = [
      [1.0, 0],
      [1.0, 0.14],
      [0.97, 0.3],
      [0.9, 0.45],
      [0.78, 0.6],
      [0.6, 0.75],
      [0.38, 0.88],
      [0.16, 0.97],
      [0.0, 1.0],
    ]
    b.add(ROOF, new THREE.CylinderGeometry(r + 0.15, r + 0.25, 0.5, 40), mat(CX, y0 + 0.1, CZ))
    const top = dome(b, ROOF, { x: CX, z: CZ, y: y0 + 0.3, r, h, profile: prof, seg: 48, ribs: 8, ribH: 0.14 })
    // shingle courses as rings
    for (let k = 1; k < 14; k++) {
      const ty = k / 14
      // interpolate profile radius
      let rr = 0
      for (let i = 0; i < prof.length - 1; i++) if (ty >= prof[i][1] && ty <= prof[i + 1][1]) rr = prof[i][0] + ((ty - prof[i][1]) / (prof[i + 1][1] - prof[i][1])) * (prof[i + 1][0] - prof[i][0])
      b.add(ROOF, new THREE.TorusGeometry(rr * r + 0.01, 0.025, 3, 48), mat(CX, y0 + 0.3 + ty * h, CZ, 0, Math.PI / 2))
    }
    // four arched dormers facing the corner
    for (const deg of [75, 115, 155, 195]) {
      const a = (deg * Math.PI) / 180
      const ry = Math.atan2(Math.cos(a), Math.sin(a))
      const m = mat(CX + Math.cos(a) * (r - 0.35), y0 + 0.5, CZ + Math.sin(a) * (r - 0.35), ry)
      b.add('hpStucco', metricBox(1.6, 2.2, 1.2), M(m, mat(0, 1.1, 0)))
      opening(b, M(m, mat(0, 0, 0.61)), 1.0, 1.75, 0.2, 'arch')
      const hood = archShape(1.9, 2.75, 0)
      hood.holes.push(new THREE.Path(archShape(1.5, 2.5, 0.08).getPoints(10)))
      b.add(ROOF, extrude(hood, 1.25, 10), M(m, mat(0, 0, -0.6)))
    }
    // finial: stem, urn, spike
    const fin: [number, number][] = [
      [0.55, 0],
      [0.4, 0.3],
      [0.32, 0.8],
      [0.5, 1.1],
      [0.5, 1.4],
      [0.3, 1.6],
      [0.2, 1.9],
      [0.35, 2.15],
      [0.12, 2.5],
      [0.05, 3.1],
      [0.0, 3.3],
    ]
    b.add(ROOF, new THREE.LatheGeometry(fin.map(([x, y]) => new THREE.Vector2(x, y)), 12), mat(CX, top - 0.05, CZ))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-0.7071, 0.7071],
  materialFocus: [-9.4, 23, 7.7],
  materials: () => ({
    hpWall: new THREE.MeshStandardMaterial({ color: '#e9e0cc', roughness: 0.9 }),
    hpStucco: new THREE.MeshStandardMaterial({ color: '#f3ecdc', roughness: 0.85 }),
    hpSocle: new THREE.MeshStandardMaterial({ color: '#cfc5b2', roughness: 0.9 }),
    hpEave: new THREE.MeshStandardMaterial({ color: '#6e5642', roughness: 0.75 }),
    hpFrame: new THREE.MeshStandardMaterial({ color: '#4c3526', roughness: 0.7 }),
    hpDoor: new THREE.MeshStandardMaterial({ color: '#4a3022', roughness: 0.7 }),
    hpIron: new THREE.MeshStandardMaterial({ color: '#25272a', roughness: 0.5, metalness: 0.5 }),
  }),
  notes:
    'Eclectic corner palace with a rounded corner, bell-shaped corner dome and a mansard with arched dormers and cresting; roof and dome modelled as photographed after the rehabilitation (2024) in natural titanium-zinc; ornament simplified.',
}
export default model
