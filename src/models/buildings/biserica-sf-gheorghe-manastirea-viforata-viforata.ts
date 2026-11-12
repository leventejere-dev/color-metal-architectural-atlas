/**
 * Mănăstirea Viforâta (Aninoasa, Dâmbovița) — monastery church „Nașterea Maicii
 * Domnului” / „Sf. Mare Mucenic Gheorghe” (OSM way 259073456), restored and
 * re-roofed in copper, re-consecrated in October 2022.
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 88.8° towards the altar (east), +Z = south; the porch and
 * the west gable face −X). Sources: five post-restoration photographs from the
 * monastery website (01 east end from the south-east, 02 south side and porch,
 * 03 south-east, 04 north side from above, 05 porch front from the north-west)
 * and the OSM outline (23.2 × 14.7 m).
 *  - Plan after the OSM outline (symmetrised): open porch x −11.6 … −8.6
 *    (6.4 m wide), pronaos x −8.6 … −2.5 (10.6 m wide), trefoil naos with
 *    polygonal lateral apses out to ±7.35 m and a polygonal altar apse to x 11.6.
 *  - White walls ≈ 8.6 m high on a plinth: Tuscan pilasters (≈ 1.4 m rhythm) up
 *    to an entablature band at ≈ 6.3 m with short upper pilasters, dentilled
 *    eave cornice; small round-arched windows with timber frames, one door on
 *    the south-east facet (01, 02).
 *  - Roof: gable over the pronaos with a plain triangular west pediment (02, 05),
 *    one polygonal hip roof (≈ 30°) over the whole trefoil east end (01, 03).
 *  - Porch: three round arches on two columns and corner piers at the front,
 *    one large arch on each side, icon band above, own hipped roof (02, 05).
 *  - Two towers on the ridge (pronaos x ≈ −4.6, naos x ≈ 1.6): cylindrical base
 *    and drum separated by a ring cornice, four small rectangular windows,
 *    eave ring, ribbed copper bell domes with a small top bulb and crosses (01–05).
 *  - METAL: the photographs show the new copper roof (2022): all roofs, tower
 *    domes and cornice flashings in bright new copper (copperNew), standing
 *    seams ≈ 0.5 m, ribbed domes — as photographed.
 * Approximations: heights estimated from the photographs (no survey); north side
 * mirrored from the south; the lateral-apse/altar junction smoothed to a convex
 * outline; pilaster count and capitals simplified; porch depth estimated (the
 * OSM outline length is kept, the porch is included in it).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, loft, facet, dome, seams } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const CU = 'copperNew'
const WALL = 'plasterWhite'
const ORN = 'vifTrim'
const SOFF = 'vifSoffit'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const D2R = Math.PI / 180
const PITCH = 30
const T = Math.tan(PITCH * D2R)
const OV = 0.6
const EAVE = 8.6
const BAND = 6.3

const PORCH = { x0: -11.6, x1: -8.6, hw: 3.2, eave: 6.3 }
const PRON = { x0: -8.6, x1: -2.5, hw: 5.3 }
/** trefoil east body, ordered by increasing angle (x → z) */
const EAST: P2[] = [
  [11.6, 0], [11.35, 1.65], [10.5, 3.05], [8.4, 4.6], [3.9, 7.0], [1.6, 7.35], [-0.6, 7.0], [-2.5, 5.3],
  [-2.5, -5.3], [-0.6, -7.0], [1.6, -7.35], [3.9, -7.0], [8.4, -4.6], [10.5, -3.05], [11.35, -1.65],
]
const TOWERS = [-4.6, 1.6]

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
/** wall frame: local z = outward normal at angle a (x→z), local x along the wall */
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

/* ------------------------------------------------------------------ */
/* details                                                             */
/* ------------------------------------------------------------------ */

/** round-arched window with timber frame and plaster surround */
function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: OpeningType = 'round') {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.03)))
  b.add('vifFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.06, 0, y0 + 0.03), 0.06, 8), mul(m, mat(0, 0, 0.02)))
  b.add('vifFrame', metricBox(0.06, h - w / 2, 0.05), mul(m, mat(0, y0 + (h - w / 2) / 2, 0.06)))
  b.add(ORN, extrude(frameShape(type, w, h, 0.12, 0, y0), 0.06, 8), m)
  b.add(ORN, metricBox(w + 0.4, 0.1, 0.22), mul(m, mat(0, y0 - 0.13, 0.08)))
}

/** pilaster with base and Tuscan capital along a wall segment; upper short pilaster above the band */
function pil(b: Builder, m: THREE.Matrix4, u: number, w = 0.55) {
  b.add(ORN, metricBox(w, BAND - 0.7, 0.12), mul(m, mat(u, 0.7 + (BAND - 0.7) / 2, 0.06)))
  b.add(ORN, metricBox(w + 0.14, 0.3, 0.2), mul(m, mat(u, 0.75, 0.1)))
  b.add(ORN, metricBox(w + 0.18, 0.22, 0.22), mul(m, mat(u, BAND - 0.4, 0.11)))
  b.add(ORN, metricBox(w + 0.06, 0.12, 0.17), mul(m, mat(u, BAND - 0.56, 0.085)))
  b.add(ORN, metricBox(w - 0.05, EAVE - BAND - 1.15, 0.1), mul(m, mat(u, BAND + 0.45 + (EAVE - BAND - 1.15) / 2, 0.05)))
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number, key = 'gilt') {
  const g = new Builder()
  const t = s * 0.05
  g.add(key, new THREE.SphereGeometry(s * 0.08, 10, 8), mat(0, s * 0.05, 0))
  g.add(key, metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add(key, metricBox(s * 0.62, t, t), mat(0, s * 0.7, 0))
  g.add(key, metricBox(s * 0.36, t * 0.8, t), mat(0, s * 0.87, 0))
  g.add(key, metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.4, 0, 0, 0, 0.35))
  for (const [u, v] of [[0.31, 0.7], [-0.31, 0.7], [0, 0.98]]) g.add(key, new THREE.SphereGeometry(t * 0.9, 6, 4), mat(u * s, v * s, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** iterate the façade segments of a convex outline: callback(matrix, length, edge index) */
function eachFace(o: P2[], cx: number, fn: (m: THREE.Matrix4, len: number, i: number, mid: P2) => void) {
  const n = o.length
  for (let i = 0; i < n; i++) {
    const p = o[i]
    const q = o[(i + 1) % n]
    const mx = (p[0] + q[0]) / 2
    const mz = (p[1] + q[1]) / 2
    let a = Math.atan2(q[0] - p[0], -(q[1] - p[1]))
    if (Math.cos(a) * (mx - cx) + Math.sin(a) * mz < 0) a += Math.PI
    fn(wallAt(mx, mz, a), Math.hypot(q[0] - p[0], q[1] - p[1]), i, [mx, mz])
  }
}

/* ------------------------------------------------------------------ */

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw } = PRON
  const px = (x0 + x1) / 2
  const L = x1 - x0

  /* ---------------- walls ---------------- */
  b.block(WALL, L + 0.02, EAVE, 2 * hw, px, 0, 0)
  polyPrism(b, WALL, EAST, 0, EAVE)
  // plinth
  b.block(ORN, L + 0.2, 0.6, 2 * hw + 0.2, px, 0, 0)
  polyPrism(b, ORN, EAST, 0, 0.6, 0.1)
  // entablature band and eave cornice (stepped)
  b.block(ORN, L + 0.24, 0.42, 2 * hw + 0.24, px, BAND, 0)
  polyPrism(b, ORN, EAST, BAND, 0.42, 0.12)
  b.block(ORN, L + 0.2, 0.3, 2 * hw + 0.2, px, EAVE - 0.55, 0)
  polyPrism(b, ORN, EAST, EAVE - 0.55, 0.3, 0.1)
  b.block(ORN, L + 0.5, 0.25, 2 * hw + 0.5, px, EAVE - 0.25, 0)
  polyPrism(b, ORN, EAST, EAVE - 0.25, 0.25, 0.25)

  /* ---------------- pilasters + openings ---------------- */
  // pronaos sides
  for (const s of [-1, 1]) {
    const m = (x: number) => wallAt(x, s * hw, s > 0 ? Math.PI / 2 : -Math.PI / 2)
    for (const x of [x0 + 0.35, -7.0, -5.6, -4.2, -2.85]) pil(b, m(x), 0)
    for (const x of [-6.3, -3.55]) win(b, m(x), 0.75, 1.7, 3.0)
  }
  // trefoil facets: pilasters at both ends of each facet, windows on the main facets
  eachFace(EAST, 4, (m, len, i, mid) => {
    if (Math.abs(mid[0] - -2.5) < 0.01) return
    pil(b, m, -len / 2 + 0.35, 0.5)
    if (len > 3.5) pil(b, m, 0, 0.5)
    if (i === 3) {
      // door on the south-east facet (02) + window
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 2.4, -len / 4, 0.6, 10))), mul(m, mat(0, 0, 0.03)))
      b.add(ORN, extrude(frameShape('round', 1.1, 2.4, 0.16, -len / 4, 0.6), 0.08, 8), m)
      win(b, mul(m, mat(len / 4, 0, 0)), 0.7, 1.6, 3.1)
    } else if (i === 11) win(b, mul(m, mat(-len / 4, 0, 0)), 0.7, 1.6, 3.1)
    else if ([0, 2, 4, 10, 12].includes(i)) win(b, m, 0.7, 1.6, 3.1)
  })

  /* ---------------- west gable (pediment) ---------------- */
  {
    const yr = EAVE + (hw + OV) * T
    const tri = new THREE.Shape([new THREE.Vector2(-hw, EAVE - 0.02), new THREE.Vector2(hw, EAVE - 0.02), new THREE.Vector2(0, yr - 0.25)])
    b.add(WALL, extrude(tri, 0.4), mat(x0 + 0.4, 0, 0, -Math.PI / 2))
    // raking cornices
    for (const s of [-1, 1]) b.beam(ORN, V(x0 - 0.25, EAVE - 0.05, s * (hw + 0.4)), V(x0 - 0.25, yr - 0.05, 0), 0.5, 0.3, V(-1, 0, 0))
    b.block(ORN, 0.5, 0.3, 2 * hw + 0.8, x0 - 0.05, EAVE - 0.3, 0)
    // small round window in the tympanum
    b.add(ORN, new THREE.TorusGeometry(0.42, 0.09, 6, 20), mat(x0 - 0.05, EAVE + 1.25, 0, Math.PI / 2))
    b.add('glassC', new THREE.CircleGeometry(0.4, 18), mat(x0 - 0.03, EAVE + 1.25, 0, -Math.PI / 2))
  }

  /* ---------------- roofs ---------------- */
  {
    const he = hw + OV
    const ye = EAVE - OV * T
    const yr = EAVE + hw * T
    const xw = x0 - 0.35
    const xe = TOWERS[1]
    for (const s of [-1, 1]) {
      facet(b, CU, [V(xw, ye, s * he), V(xe, ye, s * he), V(xe, yr, 0), V(xw, yr, 0)], { seams: SEAM, thickness: 0.1 })
      facet(b, SOFF, [V(x0, EAVE - 0.1, s * hw), V(x1, EAVE - 0.1, s * hw), V(x1, ye - 0.1, s * he), V(xw, ye - 0.1, s * he)], { hint: V(0, -1, 0) })
      b.beam(CU, V(xw, ye - 0.08, s * (he + 0.04)), V(x1, ye - 0.08, s * (he + 0.04)), 0.12, 0.12)
      // verge flashing on the west gable
      b.beam(CU, V(xw, ye + 0.04, s * he), V(xw, yr + 0.06, 0), 0.22, 0.1)
    }
    b.beam(CU, V(xw, yr + 0.06, 0), V(xe, yr + 0.06, 0), 0.22, 0.09)
    orthoCross(b, xw + 0.2, yr + 0.05, 0, 1.3)
  }
  convexHip(b, CU, EAST, EAVE, PITCH, OV, SEAM)

  /* ---------------- porch ---------------- */
  {
    const { x0: qx0, x1: qx1, hw: qh, eave: qe } = PORCH
    const qx = (qx0 + qx1) / 2
    const pod = 0.75
    const imp = 4.0
    // podium + steps
    b.block(ORN, qx1 - qx0 + 0.3, pod, 2 * qh + 0.3, qx, 0, 0)
    for (let i = 0; i < 3; i++) b.block(ORN, 0.35, pod * (1 - (i + 1) / 4), 2.2, qx0 - 0.15 - i * 0.35 - 0.18, 0, 0)
    // front: three arches on two columns + corner piers
    const front = new THREE.Shape()
    const arches: [number, number][] = [[-2.05, 1.5], [0, 1.75], [2.05, 1.5]]
    front.moveTo(-qh, imp)
    for (const [c, w] of arches) {
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI - (i / 12) * Math.PI
        front.lineTo(c + Math.cos(a) * w / 2, imp + Math.sin(a) * w / 2)
      }
    }
    front.lineTo(qh, imp)
    front.lineTo(qh, qe)
    front.lineTo(-qh, qe)
    b.add(WALL, extrude(front, 0.45), mat(qx0 + 0.45, 0, 0, -Math.PI / 2))
    // piers and columns
    for (const s of [-1, 1]) b.block(WALL, 0.6, imp - pod, 0.6, qx0 + 0.3, pod, s * (qh - 0.3))
    for (const z of [-1.05, 1.05]) {
      b.add(ORN, new THREE.CylinderGeometry(0.2, 0.22, imp - pod - 0.4, 14), mat(qx0 + 0.25, pod + 0.2 + (imp - pod - 0.4) / 2, z))
      b.block(ORN, 0.55, 0.22, 0.55, qx0 + 0.25, imp - 0.22, z)
      b.block(ORN, 0.5, 0.2, 0.5, qx0 + 0.25, pod, z)
    }
    // sides: one large arch each, wall above
    for (const s of [-1, 1]) {
      const side = new THREE.Shape()
      const len = qx1 - qx0
      side.moveTo(-len / 2, 0)
      side.lineTo(-len / 2 + 0.5, 0)
      side.lineTo(-len / 2 + 0.5, imp)
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI - (i / 12) * Math.PI
        side.lineTo(Math.cos(a) * (len / 2 - 0.5), imp + Math.sin(a) * (len / 2 - 0.5) * 0.9)
      }
      side.lineTo(len / 2 - 0.5, 0)
      side.lineTo(len / 2, 0)
      side.lineTo(len / 2, qe)
      side.lineTo(-len / 2, qe)
      b.add(WALL, extrude(side, 0.45), mat(qx, 0, s * qh - (s > 0 ? 0.45 : 0)))
      // balustrade under the side arch
      b.block(ORN, len - 1.0, 0.9, 0.3, qx, pod, s * (qh - 0.2))
    }
    // icon band and cornice
    for (const z of [-1.3, 0, 1.3]) b.add('vifIcon', metricBox(0.04, 0.95, 0.8), mat(qx0 - 0.01, qe - 0.85, z))
    b.block(ORN, qx1 - qx0 + 0.3, 0.25, 2 * qh + 0.3, qx, qe - 0.25, 0)
    // inner wall (painted) + door
    b.add('vifIcon', metricBox(0.05, imp - pod, 2 * qh - 1.2), mat(qx1 - 0.03, pod + (imp - pod) / 2, 0))
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, 2.5, 0, pod, 10))), mat(qx1 - 0.06, 0, 0, -Math.PI / 2))
    // hipped roof: hip at the west, running into the pronaos gable
    const ov = 0.45
    const t = T
    const ye = qe - ov * t
    const yr = qe + qh * t
    const xw = qx0 - ov
    const xr0 = qx0 + qh
    const xe = qx1 + 0.4
    for (const s of [-1, 1]) {
      facet(b, CU, [V(xw, ye, s * (qh + ov)), V(xe, ye, s * (qh + ov)), V(xe, yr, 0), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.1 })
      b.beam(CU, V(xw, ye + 0.04, s * (qh + ov)), V(xr0, yr + 0.05, 0), 0.16, 0.07)
      facet(b, SOFF, [V(qx0, qe - 0.08, s * qh), V(qx1, qe - 0.08, s * qh), V(qx1, ye - 0.08, s * (qh + ov)), V(xw, ye - 0.08, s * (qh + ov))], { hint: V(0, -1, 0) })
    }
    facet(b, CU, [V(xw, ye, -qh - ov), V(xw, ye, qh + ov), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, V(xr0, yr + 0.05, 0), V(xe, yr + 0.05, 0), 0.18, 0.08)
    orthoCross(b, xr0, yr + 0.05, 0, 0.9)
  }

  /* ---------------- towers ---------------- */
  {
    const yr = EAVE + (hw + OV) * T - OV * T
    for (const tx of TOWERS) {
      const rb = 2.15
      const rd = 1.95
      const yb = yr + 1.4
      const yd = yb + 4.1
      b.add(WALL, new THREE.CylinderGeometry(rb, rb, yb - 7.5, 32), mat(tx, (yb + 7.5) / 2, 0))
      b.add(ORN, new THREE.CylinderGeometry(rb + 0.18, rb + 0.12, 0.3, 32), mat(tx, yb - 0.1, 0))
      b.add(CU, new THREE.CylinderGeometry(rb + 0.08, rb + 0.24, 0.12, 32), mat(tx, yb + 0.1, 0))
      b.add(WALL, new THREE.CylinderGeometry(rd, rd, yd - yb, 32), mat(tx, (yb + yd) / 2, 0))
      b.add(ORN, new THREE.CylinderGeometry(rd + 0.06, rd + 0.06, 0.25, 32), mat(tx, yb + 0.3, 0))
      // top ring cornice with copper flashing
      b.add(ORN, new THREE.CylinderGeometry(rd + 0.25, rd + 0.1, 0.32, 32), mat(tx, yd - 0.1, 0))
      b.add(CU, new THREE.CylinderGeometry(rd + 0.3, rd + 0.36, 0.12, 32), mat(tx, yd + 0.1, 0))
      // four small windows
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2
        const m = wallAt(tx + Math.cos(a) * (rd - 0.02), Math.sin(a) * (rd - 0.02), a)
        b.add('glassC', metricBox(0.55, 1.15, 0.06), mul(m, mat(0, yb + 1.9, 0.02)))
        b.add('vifFrame', extrude(frameShape('rect', 0.55, 1.15, 0.07, 0, yb + 1.32), 0.06, 4), mul(m, mat(0, 0, 0.03)))
      }
      // ribbed copper bell dome with a small top bulb
      const prof: [number, number][] = [
        [1.0, 0], [0.97, 0.06], [0.93, 0.2], [0.87, 0.34], [0.76, 0.48], [0.6, 0.6], [0.4, 0.69], [0.2, 0.74], [0.13, 0.77],
        [0.17, 0.82], [0.19, 0.88], [0.16, 0.94], [0.06, 0.99], [0.01, 1.0],
      ]
      dome(b, CU, { x: tx, y: yd + 0.15, z: 0, r: rd + 0.25, h: 3.6, profile: prof, seg: 32, ribs: 16, ribH: 0.05 })
      orthoCross(b, tx, yd + 0.15 + 3.6, 0, 1.5)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0.75],
  materialFocus: [6, 10.5, 3],
  materials: () => ({
    vifTrim: new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.85 }),
    vifSoffit: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.9 }),
    vifFrame: new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.6 }),
    vifIcon: new THREE.MeshStandardMaterial({ color: '#8d6a4a', roughness: 0.8 }),
  }),
  notes:
    'Trefoil monastery church with two cylindrical towers, interpreted from post-restoration photographs and the OSM outline; heights estimated. Roofs and tower domes in new copper as photographed (2022).',
}
export default model
