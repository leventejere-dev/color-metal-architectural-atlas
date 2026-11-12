/**
 * Mănăstirea Sitaru (Balamuci), Ilfov — monastery church „Sfântul Nicolae”
 * (OSM way 1108116335, LMI IF-II-m-A-15263.01), restored with a new copper roof.
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 62.4° towards the altar (east-north-east), +Z = 152.4°
 * (south side); the open porch faces −X). Sources: four Commons photographs of
 * 18 Apr 2023 just after the restoration (01 porch corner and south side,
 * 02 west front, 03 towers from the gate, 04 bell tower – not modelled), one of
 * January 2015 (05 west front, before the works) and the OSM outline
 * (24.8 × 12.0 m, taken as the roof outline with the deep eaves).
 *  - Plan: open porch (pridvor) x −12.0 … −6.4 and pronaos + naos x −6.4 … 6.4,
 *    10.0 m wide; polygonal lateral conchs of the naos (to ±6.05 m) centred under
 *    the naos tower; polygonal altar apse to x 11.9.
 *  - Podium ≈ 1.25 m with front steps; eave ≈ 8.8 m; deep eaves (≈ 1.0 m) with a
 *    dark timber soffit and copper fascia; roof pitch ≈ 27°, hipped at the west,
 *    polygonal hips over the conchs and the altar (01).
 *  - Brâncovenesc façades: lower register with painted lobed arches (ochre-red)
 *    and stone-framed windows with grilles; red cable band at ≈ 5.7 m; upper
 *    register with a blind lobed arcade on grey colonettes; St Nicholas icon on
 *    the west front (01, 02).
 *  - Porch: six stone columns with carved capitals on the front (five lobed
 *    arches), three arches on each side, ochre-red spandrels (01, 02, 05).
 *  - Two octagonal towers on square bases (pronaos x ≈ −3.5, naos x ≈ 2.9; the
 *    naos tower slightly larger): tall two-light slit windows in recessed arched
 *    panels with carved archivolts, broad eaves and low ribbed bell caps with
 *    crosses (01–03, 05).
 *  - METAL: the 2023 photographs show the new copper roof, copper tower caps,
 *    fascias, gutters and downpipes — modelled as photographed in warm brown
 *    copper ('copper'), standing seams ≈ 0.5 m, ribbed caps.
 * Approximations: heights estimated from the photographs (no survey); north side
 * mirrored from the south; porch depth and column count of the sides estimated;
 * lobed arches simplified to round arches with lobes; carved and painted
 * ornament reduced to coloured frames and bands; scaffolding ignored.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, loft, polyRing, prism, ringBand, facet, seams, faceFrame } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const CU = 'copper'
const WALL = 'sitWhite'
const ORN = 'sitStone'
const OCH = 'sitOchre'
const RED = 'sitRed'
const COL = 'stoneWarm'
const SOFF = 'sitSoffit'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const D2R = Math.PI / 180
const PITCH = 27
const T = Math.tan(PITCH * D2R)
const OV = 1.0
const EAVE = 8.8
const POD = 1.25
const BAND = 5.6

const PORCH = { x0: -12.0, x1: -6.4, imp: 4.15 }
const BODY = { x0: -6.4, x1: 6.4, hw: 5.0 }
const CONCH: P2[] = [[5.5, 5.0], [4.7, 5.75], [2.9, 6.05], [1.1, 5.75], [0.3, 5.0]]
const ALTAR: P2[] = [[11.9, 0], [11.2, 2.2], [9.3, 3.7], [6.3, 4.2], [6.3, -4.2], [9.3, -3.7], [11.2, -2.2]]
/** roof outline of the east part (convex hull of conchs + altar), ordered x → z */
const EAST: P2[] = [[11.9, 0], [11.2, 2.2], [9.3, 3.7], [4.7, 5.75], [2.9, 6.05], [1.1, 5.75], [0.3, 5.0], [0.3, -5.0], [1.1, -5.75], [2.9, -6.05], [4.7, -5.75], [9.3, -3.7], [11.2, -2.2]]
const TOWERS = [
  { x: -3.5, base: 5.4, top: 12.9, r: 2.12, d1: 18.0 },
  { x: 2.9, base: 5.7, top: 13.2, r: 2.25, d1: 18.7 },
]

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/* ------------------------------------------------------------------ */
/* polygon helpers                                                     */
/* ------------------------------------------------------------------ */

function centroid(o: P2[]): P2 {
  let x = 0
  let z = 0
  for (const p of o) {
    x += p[0]
    z += p[1]
  }
  return [x / o.length, z / o.length]
}

/** outward offset of a convex outline by d */
function offsetPoly(o: P2[], d: number): P2[] {
  const n = o.length
  const c = centroid(o)
  const lines = o.map((p, i) => {
    const q = o[(i + 1) % n]
    let nx = q[1] - p[1]
    let nz = -(q[0] - p[0])
    const L = Math.hypot(nx, nz)
    nx /= L
    nz /= L
    if (nx * (p[0] - c[0]) + nz * (p[1] - c[1]) < 0) {
      nx = -nx
      nz = -nz
    }
    return { nx, nz, k: nx * p[0] + nz * p[1] + d }
  })
  return o.map((_, i) => {
    const a = lines[(i + n - 1) % n]
    const b = lines[i]
    const det = a.nx * b.nz - a.nz * b.nx
    return [(a.k * b.nz - a.nz * b.k) / det, (a.nx * b.k - a.k * b.nx) / det] as P2
  })
}

function ring(o: P2[], y: number) {
  return o.map(([x, z]) => V(x, y, z))
}

/** vertical prism over a convex outline (ordered x → z) */
function polyPrism(b: Builder, key: string, o: P2[], y0: number, h: number, grow = 0) {
  const oo = grow ? offsetPoly(o, grow) : o
  b.add(key, loft([ring(oo, y0), ring(oo, y0 + h)], { capTop: true, capBottom: true, flat: true }))
}

/** clip convex polygon by half-plane a·p ≤ k */
function clip(poly: P2[], ax: number, az: number, k: number): P2[] {
  const out: P2[] = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const fp = ax * p[0] + az * p[1] - k
    const fq = ax * q[0] + az * q[1] - k
    if (fp <= 1e-9) out.push(p)
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq)
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
    }
  }
  return out
}

/**
 * Hip roof over a convex outline (all slopes at the same pitch): facet i is the
 * part of the eave polygon closest to edge i. Adds hip rolls, timber soffit and
 * eave gutter. Returns the apex height.
 */
function convexHip(b: Builder, key: string, o: P2[], eave: number, pitch: number, ov: number, sp: ReturnType<typeof seams>, soff = SOFF) {
  const t = Math.tan(pitch * D2R)
  const Q = offsetPoly(o, ov)
  const ye = eave - ov * t
  const n = Q.length
  const c = centroid(Q)
  const E = Q.map((p, i) => {
    const q = Q[(i + 1) % n]
    let nx = -(q[1] - p[1])
    let nz = q[0] - p[0]
    const L = Math.hypot(nx, nz)
    nx /= L
    nz /= L
    if (nx * (c[0] - p[0]) + nz * (c[1] - p[1]) < 0) {
      nx = -nx
      nz = -nz
    }
    return { nx, nz, k: nx * p[0] + nz * p[1] }
  })
  let top = ye
  const seen = new Set<string>()
  const keyOf = (a: THREE.Vector3, c2: THREE.Vector3) => {
    const s1 = `${a.x.toFixed(2)},${a.z.toFixed(2)}`
    const s2 = `${c2.x.toFixed(2)},${c2.z.toFixed(2)}`
    return s1 < s2 ? s1 + '|' + s2 : s2 + '|' + s1
  }
  for (let i = 0; i < n; i++) {
    let poly: P2[] = Q.slice()
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      poly = clip(poly, E[i].nx - E[j].nx, E[i].nz - E[j].nz, E[i].k - E[j].k)
      if (poly.length < 3) break
    }
    if (poly.length < 3) continue
    const pts = poly.map(([x, z]) => V(x, ye + t * (E[i].nx * x + E[i].nz * z - E[i].k), z))
    for (const p of pts) top = Math.max(top, p.y)
    facet(b, key, pts, { seams: sp, thickness: 0.1 })
    for (let m = 0; m < pts.length; m++) {
      const a = pts[m]
      const c2 = pts[(m + 1) % pts.length]
      if (a.y < ye + 0.02 && c2.y < ye + 0.02) continue
      const kk = keyOf(a, c2)
      if (seen.has(kk)) continue
      seen.add(kk)
      b.beam(key, a.clone().add(V(0, 0.05, 0)), c2.clone().add(V(0, 0.05, 0)), 0.16, 0.07)
    }
  }
  // soffit + gutter
  for (let i = 0; i < n; i++) {
    const a = o[i]
    const a2 = o[(i + 1) % n]
    const qa = Q[i]
    const qb = Q[(i + 1) % n]
    facet(b, soff, [V(a[0], eave - 0.12, a[1]), V(a2[0], eave - 0.12, a2[1]), V(qb[0], ye - 0.12, qb[1]), V(qa[0], ye - 0.12, qa[1])], { hint: V(0, -1, 0) })
  }
  return top
}

/** wall frame on the edge p→q of an outline, local z pointing away from c */
function edgeFrame(p: P2, q: P2, c: P2) {
  const mx = (p[0] + q[0]) / 2
  const mz = (p[1] + q[1]) / 2
  let a = Math.atan2(q[0] - p[0], -(q[1] - p[1]))
  if (Math.cos(a) * (mx - c[0]) + Math.sin(a) * (mz - c[1]) < 0) a += Math.PI
  return { m: wallAt(mx, mz, a), len: Math.hypot(q[0] - p[0], q[1] - p[1]) }
}

/* ------------------------------------------------------------------ */
/* Brâncovenesc details                                                */
/* ------------------------------------------------------------------ */

/** lobed arch frame (round arch + two small lobes) painted / moulded on a wall */
function lobed(b: Builder, key: string, m: THREE.Matrix4, w: number, h: number, y0: number, f = 0.12, d = 0.05) {
  b.add(key, extrude(frameShape('round', w, h, f, 0, y0), d, 10), m)
  for (const s of [-1, 1]) b.add(key, new THREE.TorusGeometry(w * 0.15, f * 0.45, 4, 10, Math.PI), mul(m, mat(s * w * 0.3, y0 + h - w * 0.6, d * 0.5)))
}

/** stone window with grille in a moulded frame */
function stoneWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: OpeningType = 'rect') {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 8))), mul(m, mat(0, 0, 0.03)))
  b.add(ORN, extrude(frameShape(type, w, h, 0.18, 0, y0), 0.1, 6), m)
  for (let i = 1; i < 3; i++) b.add('iron', metricBox(0.03, h, 0.03), mul(m, mat(-w / 2 + (i * w) / 3, y0 + h / 2, 0.05)))
  for (let j = 1; j < 4; j++) b.add('iron', metricBox(w, 0.03, 0.03), mul(m, mat(0, y0 + (j * h) / 4, 0.05)))
}

/** one bay of the façade (lower painted lobed arch + upper blind arcade) at local u on a wall frame */
function bay(b: Builder, m: THREE.Matrix4, u: number, w: number, win: boolean, upperOnly = false) {
  const mm = mul(m, mat(u, 0, 0))
  if (!upperOnly) {
    lobed(b, OCH, mm, w - 0.5, BAND - POD - 0.75, POD + 0.25, 0.14, 0.04)
    b.add(ORN, metricBox(0.18, BAND - POD - 1.2, 0.08), mul(m, mat(u - w / 2, POD + 0.25 + (BAND - POD - 1.2) / 2, 0.04)))
  }
  if (win) stoneWin(b, mm, 0.55, 1.35, POD + 1.15)
  // upper register: blind lobed arch on grey colonettes
  lobed(b, 'sitGrey', mm, w - 0.35, EAVE - BAND - 1.25, BAND + 0.45, 0.1, 0.05)
  b.add('sitGrey', new THREE.CylinderGeometry(0.07, 0.07, EAVE - BAND - 1.5, 6), mul(m, mat(u - w / 2, BAND + 0.45 + (EAVE - BAND - 1.5) / 2, 0.08)))
}

/** stone column with base, carved capital and abacus */
function column(b: Builder, x: number, z: number, y0: number, h: number) {
  b.add(COL, new THREE.CylinderGeometry(0.34, 0.36, 0.5, 12), mat(x, y0 + 0.25, z))
  b.add(COL, metricBox(0.72, 0.12, 0.72), mat(x, y0 + 0.06, z))
  b.add(COL, new THREE.CylinderGeometry(0.22, 0.25, h - 1.15, 12), mat(x, y0 + 0.5 + (h - 1.15) / 2, z))
  b.add(COL, new THREE.CylinderGeometry(0.38, 0.24, 0.5, 12), mat(x, y0 + h - 0.65 + 0.25, z))
  b.add(COL, metricBox(0.8, 0.15, 0.8), mat(x, y0 + h - 0.075, z))
}

/** wall slab above the imposts with lobed arches cut from below (façade-local u) */
function arcadeWall(b: Builder, face: Face, plane: number, u0: number, u1: number, yImp: number, yTop: number, arches: [number, number][], depth = 0.55) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(u0, yImp)]
  for (const [c, w] of [...arches].sort((p, q) => p[0] - q[0])) {
    const r = w / 2
    pts.push(new THREE.Vector2(c - r, yImp))
    // trefoil-ish head: stilted round arch with a small point
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI - (i / 14) * Math.PI
      const k = 1 + 0.18 * Math.max(0, Math.sin(a) - 0.75) * 4
      pts.push(new THREE.Vector2(c + Math.cos(a) * r, yImp + 0.25 + Math.sin(a) * r * 0.95 * k))
    }
    pts.push(new THREE.Vector2(c + r, yImp))
  }
  pts.push(new THREE.Vector2(u1, yImp), new THREE.Vector2(u1, yTop), new THREE.Vector2(u0, yTop))
  const m = faceFrame(face, plane, 0, 0, 0)
  b.add(OCH, extrude(new THREE.Shape(pts), depth, 4), mul(m, mat(0, 0, -depth)))
  for (const [c, w] of arches) lobed(b, ORN, mul(m, mat(c, 0, 0.01)), w + 0.1, w / 2 + 0.55, yImp - 0.05, 0.12, 0.06)
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', new THREE.SphereGeometry(s * 0.09, 10, 8), mat(0, s * 0.05, 0))
  g.add('iron', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('iron', metricBox(s * 0.6, t, t), mat(0, s * 0.72, 0))
  g.add('iron', new THREE.TorusGeometry(s * 0.17, t * 0.35, 4, 16), mat(0, s * 0.72, 0))
  g.add('iron', metricBox(s * 0.34, t * 0.8, t), mat(0, s * 0.88, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/* ------------------------------------------------------------------ */

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw } = BODY
  const bx = (x0 + x1) / 2
  const L = x1 - x0

  /* ---------------- walls ---------------- */
  b.block(WALL, L, EAVE, 2 * hw, bx, 0, 0)
  for (const s of [-1, 1]) {
    const c: P2[] = CONCH.map(([x, z]) => [x, s * z] as P2)
    const poly: P2[] = s > 0 ? [...c, [0.3, 4.6], [5.5, 4.6]] : [[5.5, -4.6], [0.3, -4.6], ...c.reverse()]
    polyPrism(b, WALL, poly, 0, EAVE)
    polyPrism(b, 'sitPlinth', poly, 0, POD, 0.08)
    polyPrism(b, RED, poly, BAND, 0.32, 0.1)
    polyPrism(b, ORN, poly, EAVE - 0.6, 0.3, 0.08)
  }
  polyPrism(b, WALL, ALTAR, 0, EAVE)
  polyPrism(b, 'sitPlinth', ALTAR, 0, POD, 0.08)
  polyPrism(b, RED, ALTAR, BAND, 0.32, 0.1)
  polyPrism(b, ORN, ALTAR, EAVE - 0.6, 0.3, 0.08)
  b.block('sitPlinth', L + 0.16, POD, 2 * hw + 0.16, bx, 0, 0)
  b.block(RED, L + 0.2, 0.32, 2 * hw + 0.2, bx, BAND, 0)
  b.block(ORN, L + 0.16, 0.3, 2 * hw + 0.16, bx, EAVE - 0.6, 0)

  /* ---------------- façade bays ---------------- */
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const m = faceFrame(face, s * hw, 0, 0, 0)
    // façade-local u = s·x on +z, −x on −z
    const us = [-5.6, -4.2, -2.8, -1.4, 6.0]
    for (const x of us) bay(b, m, s * x, 1.4, x === -4.2 || x === -1.4)
  }
  // conch facets
  for (const s of [-1, 1]) {
    for (let i = 0; i < CONCH.length - 1; i++) {
      const p: P2 = [CONCH[i][0], s * CONCH[i][1]]
      const q: P2 = [CONCH[i + 1][0], s * CONCH[i + 1][1]]
      const { m, len } = edgeFrame(p, q, [2.9, 0])
      bay(b, m, 0, Math.min(1.8, len - 0.1), i === 1 || i === 2)
    }
  }
  // altar facets
  for (let i = 0; i < ALTAR.length; i++) {
    const p = ALTAR[i]
    const q = ALTAR[(i + 1) % ALTAR.length]
    if (Math.abs(p[0] - 6.3) < 0.01 && Math.abs(q[0] - 6.3) < 0.01) continue
    const { m, len } = edgeFrame(p, q, [8.5, 0])
    bay(b, m, 0, Math.min(1.8, len - 0.2), Math.abs(p[1] + q[1]) > 2)
  }

  /* ---------------- porch ---------------- */
  {
    const { x0: qx0, x1: qx1, imp } = PORCH
    const qx = (qx0 + qx1) / 2
    // podium + front steps (split by the central flight)
    b.block('sitPlinth', qx1 - qx0 + 0.2, POD, 2 * hw + 0.3, qx, 0, 0)
    for (let i = 0; i < 4; i++) b.block('sitPlinth', 0.32, POD * (1 - (i + 1) / 5), 2.0, qx0 - 0.16 - i * 0.32, 0, 0)
    // west front: six columns, five arches
    const fz = [-4.6, -2.76, -0.92, 0.92, 2.76, 4.6]
    const fa: [number, number][] = []
    for (let i = 0; i < 5; i++) fa.push([(fz[i] + fz[i + 1]) / 2, 1.38])
    arcadeWall(b, '-x', qx0, -hw, hw, imp, BAND, fa.map(([c, w]) => [-c, w] as [number, number]))
    for (const z of fz) column(b, qx0 + 0.4, z, POD, imp - POD)
    // sides: three arches
    const sx = [qx0 + 0.4, -10.05, -8.25, qx1 - 0.35]
    const sa: [number, number][] = []
    for (let i = 0; i < 3; i++) sa.push([(sx[i] + sx[i + 1]) / 2, sx[i + 1] - sx[i] - 0.5])
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '+z' : '-z'
      arcadeWall(b, face, s * hw, s > 0 ? qx0 : -qx1, s > 0 ? qx1 : -qx0, imp, BAND, sa.map(([c, w]) => [s * c, w] as [number, number]))
      for (const x of sx.slice(1, 3)) column(b, x, s * (hw - 0.4), POD, imp - POD)
      // low parapet between the columns
      b.block(WALL, qx1 - qx0 - 0.8, 0.55, 0.3, qx, POD, s * (hw - 0.4))
    }
    // inner (pronaos) west wall: painted, with portal
    b.add('sitFresco', metricBox(0.05, BAND - POD - 0.2, 2 * hw - 1.0), mat(qx1 - 0.03, POD + (BAND - POD - 0.2) / 2, 0))
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 2.9, 0, POD, 10))), mat(qx1 - 0.07, 0, 0, -Math.PI / 2))
    b.add(COL, extrude(frameShape('round', 1.5, 2.9, 0.22, 0, POD), 0.1, 10), mat(qx1 - 0.08, 0, 0, -Math.PI / 2))
    b.box('sitFresco', qx1 - qx0 - 0.8, 0.15, 2 * hw - 0.8, qx + 0.2, BAND - 0.2, 0)
    // band + upper register walls of the porch
    b.block(RED, qx1 - qx0 + 0.2, 0.32, 2 * hw + 0.2, qx, BAND, 0)
    b.block(WALL, qx1 - qx0, EAVE - BAND, 2 * hw, qx, BAND, 0)
    b.block(ORN, qx1 - qx0 + 0.16, 0.3, 2 * hw + 0.16, qx, EAVE - 0.6, 0)
    const fm = faceFrame('-x', qx0, 0, 0, 0)
    for (const u of [-4.25, -3.0, -1.75, 1.75, 3.0, 4.25]) bay(b, fm, u, 1.25, false, true)
    // St Nicholas icon panel in the centre of the upper register
    b.add(ORN, metricBox(1.55, 2.2, 0.08), mul(fm, mat(0, BAND + 1.45, 0.04)))
    b.add('sitIcon', metricBox(1.25, 1.9, 0.06), mul(fm, mat(0, BAND + 1.45, 0.09)))
    for (const s of [-1, 1]) {
      const sm = faceFrame(s > 0 ? '+z' : '-z', s * hw, 0, 0, 0)
      for (const x of [-11.3, -10.0, -8.7, -7.4]) bay(b, sm, s * x, 1.3, false, true)
    }
  }

  /* ---------------- roofs ---------------- */
  {
    const he = hw + OV
    const ye = EAVE - OV * T
    const yr = EAVE + hw * T
    const xw = PORCH.x0 - OV
    const xr0 = PORCH.x0 + hw
    const xe = TOWERS[1].x
    for (const s of [-1, 1]) {
      facet(b, CU, [V(xw, ye, s * he), V(xe, ye, s * he), V(xe, yr, 0), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.12 })
      b.beam(CU, V(xw, ye + 0.05, s * he), V(xr0, yr + 0.05, 0), 0.16, 0.07)
      facet(b, SOFF, [V(PORCH.x0, EAVE - 0.12, s * hw), V(0.3, EAVE - 0.12, s * hw), V(0.3, ye - 0.12, s * he), V(xw, ye - 0.12, s * he)], { hint: V(0, -1, 0) })
      b.beam(CU, V(xw, ye - 0.1, s * (he + 0.02)), V(0.3, ye - 0.1, s * (he + 0.02)), 0.08, 0.3)
    }
    facet(b, CU, [V(xw, ye, -he), V(xw, ye, he), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, SOFF, [V(PORCH.x0, EAVE - 0.12, hw), V(PORCH.x0, EAVE - 0.12, -hw), V(xw, ye - 0.12, -he), V(xw, ye - 0.12, he)], { hint: V(0, -1, 0) })
    b.beam(CU, V(xw - 0.02, ye - 0.1, -he), V(xw - 0.02, ye - 0.1, he), 0.08, 0.3)
    b.beam(CU, V(xr0, yr + 0.06, 0), V(xe, yr + 0.06, 0), 0.2, 0.08)
    convexHip(b, CU, EAST, EAVE, PITCH, OV, SEAM)
    // copper downpipes (01)
    for (const s of [-1, 1]) for (const x of [-6.6, 0.1, 5.7]) b.rod(CU, V(x, POD, s * (hw + 0.12)), V(x, EAVE - 0.4, s * (hw + 0.12)), 0.06, 8)
  }

  /* ---------------- towers ---------------- */
  for (const tw of TOWERS) {
    const { x: tx, base, top, r, d1 } = tw
    const hb = base / 2
    b.block(WALL, base, top - 9.5, base, tx, 9.5, 0)
    b.block(RED, base + 0.12, 0.3, base + 0.12, tx, top - 1.45, 0)
    b.block(ORN, base + 0.3, 0.25, base + 0.3, tx, top - 0.3, 0)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f.endsWith('x') ? tx + (f[0] === '+' ? hb : -hb) : f[0] === '+' ? hb : -hb
      const off = f.endsWith('x') ? 0 : f === '+z' ? tx : -tx
      const m = faceFrame(f, plane, 0, 0, 0)
      for (const u of [-1.4, 0, 1.4]) lobed(b, 'sitGrey', mul(m, mat(off + u, 0, 0)), 0.95, 0.85, top - 1.05, 0.07, 0.04)
    }
    // low copper skirt roof from the base to the drum
    {
      const ov = 0.55
      const t = Math.tan(22 * D2R)
      const ye = top - ov * t
      const ri = r * Math.cos(Math.PI / 8) + 0.05
      const yi = top + (hb - ri) * t
      const c = [V(tx - hb - ov, ye, -hb - ov), V(tx + hb + ov, ye, -hb - ov), V(tx + hb + ov, ye, hb + ov), V(tx - hb - ov, ye, hb + ov)]
      const ci = [V(tx - ri, yi, -ri), V(tx + ri, yi, -ri), V(tx + ri, yi, ri), V(tx - ri, yi, ri)]
      for (let i = 0; i < 4; i++) {
        facet(b, CU, [c[i], c[(i + 1) % 4], ci[(i + 1) % 4], ci[i]], { seams: SEAM, thickness: 0.08 })
        b.beam(CU, c[i].clone().add(V(0, 0.04, 0)), ci[i].clone().add(V(0, 0.04, 0)), 0.12, 0.06)
      }
      b.add(SOFF, metricBox(base + 2 * ov - 0.1, 0.04, base + 2 * ov - 0.1), mat(tx, ye - 0.08, 0))
    }
    // drum
    const d0 = top + 0.35
    prism(b, WALL, { x: tx, n: 8, r, y0: top - 0.2, h: d1 - top + 0.2 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d0, h: 0.22, grow: 0.08 })
    ringBand(b, RED, { x: tx, n: 8, r, y: d1 - 1.0, h: 0.5, grow: 0.03 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d1 - 0.35, h: 0.25, grow: 0.12 })
    const ap = r * Math.cos(Math.PI / 8)
    const fw = 2 * r * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(tx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      const ph = d1 - d0 - 1.55
      b.add(ORN, extrude(frameShape('round', fw - 0.55, ph, 0.12, 0, d0 + 0.3), 0.08, 10), m)
      b.add(ORN, extrude(frameShape('round', fw - 0.9, ph - 0.25, 0.07, 0, d0 + 0.4), 0.12, 10), m)
      // two-tier slit window
      b.add('glassC', metricBox(0.32, ph * 0.42, 0.04), mul(m, mat(0, d0 + 0.6 + ph * 0.21, 0.03)))
      b.add('glassC', metricBox(0.32, ph * 0.32, 0.04), mul(m, mat(0, d0 + 0.7 + ph * 0.42 + ph * 0.16 + 0.1, 0.03)))
      // corner colonettes
      const c = Math.PI / 8 + (k * Math.PI) / 4
      b.add(ORN, new THREE.CylinderGeometry(0.1, 0.1, d1 - d0 - 1.2, 6), mat(tx + Math.cos(c) * (r + 0.02), (d0 + d1 - 1.2) / 2 + 0.1, Math.sin(c) * (r + 0.02)))
    }
    // broad eave + low ribbed bell cap
    const R = r + 0.7
    b.add(SOFF, loft([polyRing(8, R, d1 - 0.05, Math.PI / 8, tx, 0), polyRing(8, r + 0.05, d1 + 0.25, Math.PI / 8, tx, 0)], { flat: true }))
    const st: [number, number][] = [[R, d1], [R - 0.03, d1 + 0.12], [R - 0.5, d1 + 0.38], [r * 0.95, d1 + 0.7], [r * 0.8, d1 + 1.15], [r * 0.55, d1 + 1.55], [r * 0.25, d1 + 1.8], [0.14, d1 + 1.88]]
    b.add(CU, loft(st.map(([rr, y]) => polyRing(8, rr, y, Math.PI / 8, tx, 0)), { capBottom: true, capTop: true }))
    for (let k = 0; k < 24; k++) {
      const f = Math.floor(k / 3)
      const sub = (k % 3) / 3
      const a0 = Math.PI / 8 + (f * Math.PI) / 4
      const a1 = a0 + Math.PI / 4
      for (let i = 1; i < st.length - 2; i++) {
        const p = (j: number) => {
          const [rr, y] = st[j]
          const q = V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr).lerp(V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr), sub)
          const out = q.clone().normalize().multiplyScalar(0.03)
          return V(tx + q.x + out.x, y + 0.02, q.z + out.z)
        }
        b.beam(CU, p(i), p(i + 1), sub === 0 ? 0.07 : 0.045, 0.045)
      }
    }
    b.add(CU, new THREE.SphereGeometry(0.28, 12, 8), mat(tx, d1 + 2.08, 0))
    b.add(CU, new THREE.CylinderGeometry(0.1, 0.18, 0.3, 8), mat(tx, d1 + 1.9, 0))
    orthoCross(b, tx, d1 + 2.23, 0, 2.0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0.7],
  materialFocus: [-8, 10.2, 3.5],
  materials: () => ({
    sitWhite: new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.9 }),
    sitStone: new THREE.MeshStandardMaterial({ color: '#e6d8bf', roughness: 0.85 }),
    sitOchre: new THREE.MeshStandardMaterial({ color: '#c99a7c', roughness: 0.88 }),
    sitRed: new THREE.MeshStandardMaterial({ color: '#b2674e', roughness: 0.85 }),
    sitGrey: new THREE.MeshStandardMaterial({ color: '#8f948f', roughness: 0.85 }),
    sitPlinth: new THREE.MeshStandardMaterial({ color: '#e3d4b8', roughness: 0.9 }),
    sitSoffit: new THREE.MeshStandardMaterial({ color: '#5a3a28', roughness: 0.75 }),
    sitFresco: new THREE.MeshStandardMaterial({ color: '#6e5642', roughness: 0.85 }),
    sitIcon: new THREE.MeshStandardMaterial({ color: '#b58a3c', roughness: 0.6 }),
  }),
  notes:
    'Brâncovenesc monastery church with an open porch and two towers, interpreted from April 2023 photographs and the OSM outline; heights estimated, ornament simplified. Copper roofs, tower caps and rainwater goods as photographed after the restoration.',
}
export default model
