/**
 * Schitul Berca (former Berca monastery, Buzău) — church „Sfinții Arhangheli
 * Mihail și Gavriil” (OSM way 217354519, LMI BZ-II-m-A-02363.01).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 93.4° towards the altar (east), +Z = south; the west front
 * with the door faces −X). Sources: five Commons photographs 2015–2016 (01 and
 * 04 north-west corner, 02 north side, 03 south side, 05 distant view from the
 * north) and the OSM outline (24.2 × 11.7 m).
 *  - Trefoil plan after the OSM outline: rectangular pronaos x −12.05 … −1.45,
 *    8.0 m wide; naos with shallow polygonal lateral apses (out to ±5.6 m) and a
 *    wide polygonal altar end closing at x ≈ +11.9.
 *  - Walls ≈ 6.4 m to the eave on a low stone plinth, divided at ≈ 3.7 m by a
 *    cable moulding (brâu); plain upper register under a small cornice.
 *  - Lower register: blind lobed arcade on engaged colonettes on the west front
 *    (blind arch – door – blind arch) and on the western bays of both sides
 *    (two arches), small slit windows in dark stone frames further east, one
 *    window in each lateral apse and in the altar.
 *  - Roof: hipped over the pronaos (≈ 25°, timber soffit), polygonal hips over
 *    the trefoil east end, small crosses on the west hip and on the altar apex.
 *  - Tower over the naos: square base rising ≈ 1 m above the roof with its own
 *    low hipped skirt, octagonal drum with stepped arched panels and slit
 *    windows on every face, broad eave cornice and a low faceted bell cap with an
 *    openwork cross (01–04).
 *  - METAL: the photographs predate the 2020 works and show a grey sheet roof;
 *    roofs, tower skirt and cap are shown in pre-weathered titanium-zinc
 *    (zincSlate, standing seams ≈ 0.5 m) supplied by COLOR METAL according to
 *    its records — which surfaces were done is not documented.
 * Approximations: heights estimated from the photographs (no survey); the OSM
 * outline is symmetrised about the axis; lobed arches simplified to round
 * arches; drum dimensions, cap profile and the hidden roof valleys estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, loft, polyRing, prism, ringBand, facet, seams } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const ZN = 'zincSlate'
const WALL = 'bercaRender'
const ORN = 'bercaTrim'
const STONE = 'stoneGrey'
const SOFF = 'timber'
const SEAM = seams(ZN, 0.5, 0.04, 0.04)
const D2R = Math.PI / 180
const PITCH = 25
const T = Math.tan(PITCH * D2R)
const OV = 0.75
const EAVE = 6.4
const BAND = 3.7

const PRON = { x0: -12.05, x1: -1.45, hw: 4.0 }
/** trefoil east body (naos + lateral apses + altar), ordered by increasing angle (x → z) */
const EAST: P2[] = [
  [11.9, -1.6], [11.9, 1.6], [8.4, 4.05], [4.0, 5.6], [0.4, 5.6], [-1.45, 4.0],
  [-1.45, -4.0], [0.4, -5.6], [4.0, -5.6], [8.4, -4.05],
]
const TW = { x: 2.2, base: 5.0, top: 9.7, d0: 10.05, d1: 13.85, r: 1.92 }

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

/** slit window in a dark stone frame (frame = rectangle panel) */
function slit(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: OpeningType = 'round') {
  b.add(STONE, metricBox(w + 0.55, h + 0.55, 0.1), mul(m, mat(0, y0 + h / 2, 0.05)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.11)))
  b.add(ORN, extrude(frameShape(type, w, h, 0.07, 0, y0), 0.06, 6), mul(m, mat(0, 0, 0.1)))
}

/** blind lobed arch (simplified to round) between colonettes, u = centre, w = width */
function blindArch(b: Builder, m: THREE.Matrix4, w: number, y0: number, h: number) {
  b.add(ORN, extrude(frameShape('round', w, h, 0.14, 0, y0), 0.12, 10), m)
  b.add(WALL, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), mul(m, mat(0, 0, -0.02)))
  // trefoil hint: two small lobes at the springing of the head
  for (const s of [-1, 1]) b.add(ORN, new THREE.TorusGeometry(w * 0.16, 0.05, 4, 10, Math.PI), mul(m, mat(s * w * 0.3, y0 + h - w * 0.62, 0.06)))
}

function colonette(b: Builder, m: THREE.Matrix4, u: number, y0: number, h: number) {
  b.add(ORN, new THREE.CylinderGeometry(0.17, 0.19, h, 10), mul(m, mat(u, y0 + h / 2, 0.08)))
  b.add(ORN, metricBox(0.48, 0.18, 0.3), mul(m, mat(u, y0 + h + 0.09, 0.1)))
  b.add(ORN, metricBox(0.48, 0.2, 0.3), mul(m, mat(u, y0 + 0.1, 0.1)))
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number, key = 'gilt') {
  const g = new Builder()
  const t = s * 0.05
  g.add(key, new THREE.SphereGeometry(s * 0.08, 10, 8), mat(0, s * 0.05, 0))
  g.add(key, metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add(key, metricBox(s * 0.62, t, t), mat(0, s * 0.7, 0))
  g.add(key, metricBox(s * 0.36, t * 0.8, t), mat(0, s * 0.87, 0))
  g.add(key, new THREE.TorusGeometry(s * 0.17, t * 0.35, 4, 16), mat(0, s * 0.7, 0))
  // crescent at the foot (photos 01, 02)
  g.add(key, new THREE.TorusGeometry(s * 0.13, t * 0.4, 4, 12, Math.PI), mat(0, s * 0.2, 0, 0, 0, Math.PI))
  for (const [u, v] of [[0.31, 0.7], [-0.31, 0.7], [0, 0.98]]) g.add(key, new THREE.SphereGeometry(t * 0.9, 6, 4), mat(u * s, v * s, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
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
  b.block(STONE, L + 0.3, 0.55, 2 * hw + 0.3, px, 0, 0)
  polyPrism(b, STONE, EAST, 0, 0.55, 0.15)
  // cable moulding (brâu) and small eave cornice
  b.block(ORN, L + 0.26, 0.26, 2 * hw + 0.26, px, BAND, 0)
  polyPrism(b, ORN, EAST, BAND, 0.26, 0.13)
  b.block(WALL, L + 0.14, 0.12, 2 * hw + 0.14, px, BAND - 0.12, 0)
  b.block(ORN, L + 0.3, 0.25, 2 * hw + 0.3, px, EAVE - 0.25, 0)
  polyPrism(b, ORN, EAST, EAVE - 0.25, 0.25, 0.15)
  // twisted-rope hint on the band: short diagonal ribs
  for (let x = x0 + 0.2; x < x1; x += 0.32) for (const s of [-1, 1]) b.add(ORN, metricBox(0.06, 0.3, 0.05), mat(x, BAND + 0.13, s * (hw + 0.14), 0, 0, 0.6))

  /* ---------------- west front (−X): blind arch – door – blind arch ---------------- */
  {
    const m = (u: number) => wallAt(x0, u, Math.PI)
    // face −X: wallAt(x0, z, π) → local x along −z … use explicit frames
    const fw = (z: number) => mul(m(z), mat(0, 0, 0))
    const us = [-2.6, 0, 2.6]
    for (const z of us) {
      if (z === 0) {
        const mm = fw(0)
        b.add(ORN, extrude(frameShape('round', 1.3, 2.75, 0.2, 0, 0.55), 0.14, 10), mm)
        b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.75, 0, 0.55, 10))), mul(mm, mat(0, 0, 0.03)))
        b.add(STONE, metricBox(2.2, 0.18, 0.7), mat(x0 - 0.35, 0.09, 0))
      } else blindArch(b, fw(z), 1.7, 0.9, 2.55)
    }
    for (const z of [-3.75, -1.35, 1.35, 3.75]) colonette(b, fw(0), z, 0.6, 2.5)
    // framed panel in the upper register (photo 01)
    b.add(ORN, extrude(frameShape('rect', 1.1, 1.7, 0.12, 0, 4.35), 0.08, 4), fw(0))
    b.add(WALL, metricBox(1.1, 1.7, 0.04), mul(fw(0), mat(0, 5.2, 0.02)))
  }

  /* ---------------- pronaos sides ---------------- */
  for (const s of [-1, 1]) {
    const a = s > 0 ? Math.PI / 2 : -Math.PI / 2
    const fm = (x: number) => wallAt(x, s * hw, a)
    // two blind arches on the western bays
    for (const x of [-10.55, -8.35]) blindArch(b, fm(x), 1.75, 0.9, 2.55)
    for (const x of [-11.65, -9.45, -7.25]) colonette(b, fm(x), 0, 0.6, 2.5)
    // slit windows in dark frames
    for (const x of [-5.5, -3.4]) slit(b, fm(x), 0.32, 1.15, 1.45)
  }

  /* ---------------- east body openings ---------------- */
  {
    const n = EAST.length
    for (let i = 0; i < n; i++) {
      const p = EAST[i]
      const q = EAST[(i + 1) % n]
      const mx = (p[0] + q[0]) / 2
      const mz = (p[1] + q[1]) / 2
      const len = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (Math.abs(mx - -1.45) < 0.01) continue
      let a = Math.atan2(q[0] - p[0], -(q[1] - p[1]))
      if (Math.cos(a) * (mx - 5) + Math.sin(a) * mz < 0) a += Math.PI
      const m = wallAt(mx, mz, a)
      if (len > 3.0) slit(b, m, 0.32, 1.15, 1.45)
      // shallow blind niches in the upper register of the long facets
      if (len > 3.0) b.add(ORN, extrude(frameShape('round', 1.2, 1.6, 0.08, 0, 4.25), 0.05, 8), m)
    }
  }

  /* ---------------- roofs ---------------- */
  // pronaos: hip at the west, sides running into the trefoil roof / tower base
  {
    const he = hw + OV
    const ye = EAVE - OV * T
    const yr = EAVE + hw * T
    const xw = x0 - OV
    const xr0 = x0 + hw
    const xe = TW.x
    for (const s of [-1, 1]) {
      facet(b, ZN, [V(xw, ye, s * he), V(xe, ye, s * he), V(xe, yr, 0), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.1 })
      b.beam(ZN, V(xw, ye + 0.05, s * he), V(xr0, yr + 0.05, 0), 0.16, 0.07)
      facet(b, SOFF, [V(x0, EAVE - 0.12, s * hw), V(x1, EAVE - 0.12, s * hw), V(x1, ye - 0.12, s * he), V(xw, ye - 0.12, s * he)], { hint: V(0, -1, 0) })
    }
    facet(b, ZN, [V(xw, ye, -he), V(xw, ye, he), V(xr0, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, SOFF, [V(x0, EAVE - 0.12, -hw), V(x0, EAVE - 0.12, hw), V(xw, ye - 0.12, he), V(xw, ye - 0.12, -he)], { hint: V(0, -1, 0) })
    b.beam(ZN, V(xr0, yr + 0.06, 0), V(xe, yr + 0.06, 0), 0.2, 0.08)
    orthoCross(b, xr0, yr + 0.05, 0, 1.6)
  }
  // trefoil east end
  convexHip(b, ZN, EAST, EAVE, PITCH, OV, SEAM)
  orthoCross(b, 9.6, EAVE + 1.1, 0, 1.4)

  /* ---------------- tower ---------------- */
  {
    const { x: tx, base, top, d0, d1, r } = TW
    const hb = base / 2
    b.block(WALL, base, top - 6.0, base, tx, 6.0, 0)
    b.block(ORN, base + 0.3, 0.22, base + 0.3, tx, top - 0.3, 0)
    // low hipped skirt from the base to the drum
    {
      const ov = 0.45
      const t = Math.tan(24 * D2R)
      const ye = top - ov * t
      const ri = r * Math.cos(Math.PI / 8) + 0.05
      const yi = top + (hb - ri) * t
      const c = [V(tx - hb - ov, ye, -hb - ov), V(tx + hb + ov, ye, -hb - ov), V(tx + hb + ov, ye, hb + ov), V(tx - hb - ov, ye, hb + ov)]
      const ci = [V(tx - ri, yi, -ri), V(tx + ri, yi, -ri), V(tx + ri, yi, ri), V(tx - ri, yi, ri)]
      for (let i = 0; i < 4; i++) {
        facet(b, ZN, [c[i], c[(i + 1) % 4], ci[(i + 1) % 4], ci[i]], { seams: SEAM, thickness: 0.08 })
        b.rod(ZN, c[i].clone().add(V(0, 0.05, 0)), ci[i].clone().add(V(0, 0.05, 0)), 0.05, 6)
        b.beam(ZN, c[i].clone().add(V(0, -0.05, 0)), c[(i + 1) % 4].clone().add(V(0, -0.05, 0)), 0.12, 0.12)
      }
      b.add(SOFF, metricBox(base + 2 * ov - 0.1, 0.04, base + 2 * ov - 0.1), mat(tx, ye - 0.08, 0))
    }
    // octagonal drum
    prism(b, WALL, { x: tx, n: 8, r, y0: top - 0.4, h: d1 - top + 0.4 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d0, h: 0.22, grow: 0.08 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d1 - 0.35, h: 0.18, grow: 0.1 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d1 - 0.17, h: 0.17, grow: 0.2 })
    const ap = r * Math.cos(Math.PI / 8)
    const fwid = 2 * r * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(tx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      // stepped arched panel (two archivolts) with a slit window
      b.add(ORN, extrude(frameShape('round', fwid - 0.55, 2.95, 0.1, 0, d0 + 0.35), 0.06, 8), mul(m, mat(0, 0, 0.0)))
      b.add(ORN, extrude(frameShape('round', fwid - 0.85, 2.7, 0.08, 0, d0 + 0.45), 0.1, 8), mul(m, mat(0, 0, 0.0)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.36, 1.8, 0, d0 + 0.75, 8))), mul(m, mat(0, 0, 0.04)))
      // corner pilaster strips
      const c = Math.PI / 8 + (k * Math.PI) / 4
      b.add(ORN, metricBox(0.2, d1 - d0 - 0.5, 0.2), mat(tx + Math.cos(c) * (r - 0.02), (d0 + d1) / 2 - 0.1, Math.sin(c) * (r - 0.02), Math.PI / 2 - c))
    }
    // broad eave: timber soffit ring and faceted bell cap
    const R = r + 0.55
    b.add(SOFF, loft([polyRing(8, R, d1 - 0.02, Math.PI / 8, tx, 0), polyRing(8, r, d1 + 0.12, Math.PI / 8, tx, 0)], { flat: true }))
    const st: [number, number][] = [[R, d1], [R - 0.04, d1 + 0.14], [R - 0.2, d1 + 0.42], [R - 0.5, d1 + 0.82], [R - 0.95, d1 + 1.2], [R - 1.55, d1 + 1.5], [0.32, d1 + 1.68], [0.12, d1 + 1.72]]
    b.add(ZN, loft(st.map(([rr, y]) => polyRing(8, rr, y, Math.PI / 8, tx, 0)), { capBottom: true, capTop: true }))
    // standing seams: corner ribs + two seams per face, following the profile
    for (let k = 0; k < 24; k++) {
      const f = Math.floor(k / 3)
      const sub = (k % 3) / 3
      const a0 = Math.PI / 8 + (f * Math.PI) / 4
      const a1 = a0 + Math.PI / 4
      for (let i = 0; i < st.length - 2; i++) {
        const p = (j: number) => {
          const [rr, y] = st[j]
          const P0 = V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr)
          const P1 = V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr)
          const q = P0.lerp(P1, sub)
          const out = q.clone().normalize().multiplyScalar(0.03)
          return V(tx + q.x + out.x, y + 0.02, q.z + out.z)
        }
        b.beam(ZN, p(i), p(i + 1), sub === 0 ? 0.07 : 0.045, 0.045)
      }
    }
    b.add(ZN, new THREE.CylinderGeometry(0.08, 0.16, 0.3, 8), mat(tx, d1 + 1.85, 0))
    orthoCross(b, tx, d1 + 1.95, 0, 1.9)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, -0.45],
  materialFocus: [-6, 8.2, 2.5],
  materials: () => ({
    bercaRender: new THREE.MeshStandardMaterial({ color: '#e4ddcb', roughness: 0.92 }),
    bercaTrim: new THREE.MeshStandardMaterial({ color: '#ece6d6', roughness: 0.88 }),
  }),
  notes:
    'Trefoil church with an octagonal tower over the naos, interpreted from 2015–2016 photographs and the OSM outline; heights estimated. The photographs show the earlier grey sheet roof — roofs and tower cap are shown in elZinc Slate per the COLOR METAL record (surfaces not documented).',
}
export default model
