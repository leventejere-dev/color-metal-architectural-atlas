/**
 * Mânăstirea (Călărași) — church „Sf. Dumitru și Sf. Nestor” (1648–1660, the
 * former Cornățel monastery church of Matei Basarab; OSM way 483774044,
 * LMI CL-II-m-A-14691).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 58.6° towards the altar (north-east), +Z = 148.6° (the
 * south-east side); the enclosed porch faces −X). Sources: seven Commons
 * photographs 2013–2014 (01–03, 05, 07 street views of the north-west side and
 * the west end, 04 tower and porch, 06 detail of the south-east façade at the
 * porch/body junction with the tower) and the OSM outline (29.3 × 13.3 m).
 *  - Enclosed porch (pridvor) x −14.65 … −9.0 across the full 12.6 m width,
 *    eave ≈ 6.8 m: tall pointed (ogee-hooded) glazed windows, west door with
 *    icon niche and inscription plaques; low hipped roof running against the
 *    west wall of the church (04, 06).
 *  - Church body (pronaos, naos) x −9.0 … 9.7 and a polygonal altar apse to
 *    x 14.65 (OSM, symmetrised), eave ≈ 9.2 m: lower register of ogee-headed
 *    panels between paired pilasters with grilled windows; double saw-tooth
 *    brick band at ≈ 5.6 m; upper register of blind round arches with medallions
 *    and rosettes; dentil cornice (06). Low hipped roof (≈ 22°).
 *  - Tower over the pronaos: square stage rising above the roof with a dentil
 *    cornice and small blind arches, octagonal belfry with arched panels and
 *    louvred windows, upper register of small arches with rosettes, broad eave
 *    with a timber soffit and a two-tier bell cupola with ball and cross (04, 06).
 *  - METAL: the photographs (2013–2014) predate the 2021–2022 works and show the
 *    earlier grey sheet roof; the roofs, the tower eave and the cupola are shown
 *    in pre-weathered titanium-zinc (zincSlate, standing seams ≈ 0.5 m) supplied
 *    by COLOR METAL according to its records — which surfaces were done is not
 *    documented.
 * Approximations: heights estimated from the photographs (no survey); the
 * south-east side is only seen in a detail (mirrored) and the altar apse is not
 * photographed (OSM outline);
 * brick saw-tooth bands, mouldings and rosettes reduced to bands, teeth and
 * discs; exact window count per bay estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, loft, polyRing, prism, ringBand, facet, seams, faceFrame } from '../kit'
import type { Face } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const ZN = 'zincSlate'
const WALL = 'manWall'
const ORN = 'manTrim'
const SOFF = 'timber'
const SEAM = seams(ZN, 0.5, 0.04, 0.04)
const D2R = Math.PI / 180
const PITCH = 22
const OV = 0.7
const EAVE = 9.2
const BAND = 5.6

const HW = 6.3
const PORCH = { x0: -14.65, x1: -9.0, eave: 6.8 }
/** church body + altar apse, ordered by increasing angle (x → z) */
const BODY: P2[] = [[14.65, 0], [14.1, 2.9], [12.2, 5.2], [9.7, HW], [-9.0, HW], [-9.0, -HW], [9.7, -HW], [12.2, -5.2], [14.1, -2.9]]
const TW = { x: -5.8, hb: 3.25, top: 12.5, r: 2.85, o1: 16.1, d1: 18.1 }

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
/* details                                                             */
/* ------------------------------------------------------------------ */

/** ogee-hooded panel (pointed hood) with optional grilled window */
function ogeePanel(b: Builder, m: THREE.Matrix4, w: number, y0: number, h: number, win: boolean) {
  b.add(ORN, extrude(frameShape('pointed', w, h, 0.1, 0, y0), 0.06, 8), m)
  // ogee tip
  b.add(ORN, metricBox(0.08, 0.35, 0.06), mul(m, mat(0, y0 + h + 0.15, 0.03)))
  if (win) {
    const ww = Math.min(0.95, w - 0.4)
    const wh = 1.7
    const wy = y0 + 0.7
    b.add('glassC', metricBox(ww, wh, 0.04), mul(m, mat(0, wy + wh / 2, 0.03)))
    b.add(ORN, extrude(frameShape('rect', ww, wh, 0.1, 0, wy), 0.08, 4), m)
    for (let i = 1; i < 4; i++) b.add('manFrame', metricBox(0.035, wh, 0.03), mul(m, mat(-ww / 2 + (i * ww) / 4, wy + wh / 2, 0.06)))
    for (let j = 1; j < 5; j++) b.add('manFrame', metricBox(ww, 0.035, 0.03), mul(m, mat(0, wy + (j * wh) / 5, 0.06)))
  }
}

/** blind round arch with a medallion (upper register) */
function medArch(b: Builder, m: THREE.Matrix4, w: number, y0: number, h: number) {
  b.add(ORN, extrude(frameShape('round', w, h, 0.09, 0, y0), 0.06, 10), m)
  b.add(ORN, extrude(frameShape('round', w - 0.3, h - 0.15, 0.05, 0, y0), 0.09, 10), m)
  b.add(ORN, new THREE.TorusGeometry(w * 0.22, 0.05, 5, 16), mul(m, mat(0, y0 + h - w * 0.55, 0.06)))
  b.add(ORN, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), mul(m, mat(0, y0 + h - w * 0.55, 0.06, 0, Math.PI / 2)))
}

/** double saw-tooth brick band along a wall segment (local u0..u1) */
function sawBand(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number) {
  b.add(ORN, metricBox(u1 - u0, 0.12, 0.2), mul(m, mat((u0 + u1) / 2, y - 0.06, 0.1)))
  b.add(ORN, metricBox(u1 - u0, 0.12, 0.2), mul(m, mat((u0 + u1) / 2, y + 0.5, 0.1)))
  b.add(ORN, metricBox(u1 - u0, 0.1, 0.16), mul(m, mat((u0 + u1) / 2, y + 0.95, 0.08)))
  for (let u = u0 + 0.15; u < u1 - 0.1; u += 0.3) {
    for (const yy of [y + 0.22, y + 0.72]) b.add('manTooth', metricBox(0.2, 0.2, 0.12), mul(m, mat(u, yy, 0.06, 0, 0, Math.PI / 4)))
  }
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', new THREE.SphereGeometry(s * 0.09, 10, 8), mat(0, s * 0.05, 0))
  g.add('iron', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('iron', metricBox(s * 0.6, t, t), mat(0, s * 0.72, 0))
  g.add('iron', metricBox(s * 0.34, t * 0.8, t), mat(0, s * 0.88, 0))
  g.add('iron', metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.42, 0, 0, 0, 0.35))
  for (const [u, v] of [[0.3, 0.72], [-0.3, 0.72], [0, 0.99]]) g.add('iron', new THREE.SphereGeometry(t * 0.9, 6, 4), mat(u * s, v * s, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** ribbed octagonal bell from [r, y] stations */
function octBell(b: Builder, key: string, tx: number, st: [number, number][], perFace = 2) {
  b.add(key, loft(st.map(([rr, y]) => polyRing(8, rr, y, Math.PI / 8, tx, 0)), { capBottom: true, capTop: true }))
  const n = perFace + 1
  for (let k = 0; k < 8 * n; k++) {
    const f = Math.floor(k / n)
    const sub = (k % n) / n
    const a0 = Math.PI / 8 + (f * Math.PI) / 4
    const a1 = a0 + Math.PI / 4
    for (let i = 0; i < st.length - 1; i++) {
      const p = (j: number) => {
        const [rr, y] = st[j]
        const q = V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr).lerp(V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr), sub)
        const out = q.clone().normalize().multiplyScalar(0.03)
        return V(tx + q.x + out.x, y + 0.02, q.z + out.z)
      }
      if (st[i][0] < 0.25) continue
      b.beam(key, p(i), p(i + 1), sub === 0 ? 0.07 : 0.045, 0.045)
    }
  }
}

/* ------------------------------------------------------------------ */

function build(): Builder {
  const b = new Builder()

  /* ---------------- church body ---------------- */
  polyPrism(b, WALL, BODY, 0, EAVE)
  polyPrism(b, 'manPlinth', BODY, 0, 0.7, 0.12)
  polyPrism(b, ORN, BODY, EAVE - 0.7, 0.25, 0.08)
  polyPrism(b, ORN, BODY, EAVE - 0.35, 0.35, 0.22)
  // façades of the body and apse
  for (let i = 0; i < BODY.length; i++) {
    const p = BODY[i]
    const q = BODY[(i + 1) % BODY.length]
    if (Math.abs(p[0] - -9.0) < 0.01 && Math.abs(q[0] - -9.0) < 0.01) continue
    const { m, len } = edgeFrame(p, q, [3, 0])
    sawBand(b, m, -len / 2, len / 2, BAND)
    const nb = Math.max(1, Math.round(len / 2.35))
    const step = len / nb
    for (let k = 0; k < nb; k++) {
      const u = -len / 2 + step * (k + 0.5)
      const mm = mul(m, mat(u, 0, 0))
      const long = len > 10
      // tower bays (x < −3) get no window; others alternate
      const xw = (p[0] + q[0]) / 2 + ((q[0] - p[0]) / len) * u
      ogeePanel(b, mm, step - 0.75, 1.2, BAND - 1.75, long ? xw > -2.5 && k % 2 === 1 : k === Math.floor(nb / 2))
      // paired pilasters between bays
      b.add(ORN, metricBox(0.22, BAND - 0.75, 0.1), mul(m, mat(u - step / 2 + 0.05, 0.7 + (BAND - 0.75) / 2, 0.05)))
      b.add(ORN, metricBox(0.22, BAND - 0.75, 0.1), mul(m, mat(u - step / 2 + 0.35, 0.7 + (BAND - 0.75) / 2, 0.05)))
    }
    // upper register: blind arches with medallions (≈ 1.45 m)
    const na = Math.max(1, Math.round(len / 1.45))
    const sa = len / na
    for (let k = 0; k < na; k++) medArch(b, mul(m, mat(-len / 2 + sa * (k + 0.5), 0, 0)), sa - 0.3, BAND + 1.2, EAVE - BAND - 2.1)
  }

  /* ---------------- enclosed porch ---------------- */
  {
    const { x0, x1, eave } = PORCH
    const px = (x0 + x1) / 2
    b.block(WALL, x1 - x0 + 0.02, eave, 2 * HW, px, 0, 0)
    b.block('manPlinth', x1 - x0 + 0.24, 0.7, 2 * HW + 0.24, px, 0, 0)
    b.block(ORN, x1 - x0 + 0.2, 0.25, 2 * HW + 0.2, px, eave - 0.7, 0)
    b.block(ORN, x1 - x0 + 0.44, 0.35, 2 * HW + 0.44, px, eave - 0.35, 0)
    const tall = (m: THREE.Matrix4, u: number, w = 1.25) => {
      const mm = mul(m, mat(u, 0, 0))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, 3.7, 0, 1.3, 10))), mul(mm, mat(0, 0, 0.03)))
      b.add(ORN, extrude(frameShape('pointed', w, 3.7, 0.16, 0, 1.3), 0.1, 8), mm)
      b.add(ORN, extrude(frameShape('pointed', w + 0.65, 4.3, 0.12, 0, 1.0), 0.06, 8), mm)
      for (let j = 1; j < 7; j++) b.add('manFrame', metricBox(w, 0.04, 0.03), mul(mm, mat(0, 1.3 + j * 0.45, 0.05)))
      const nm = w > 1.6 ? 3 : 1
      for (let k = 1; k <= nm; k++) b.add('manFrame', metricBox(0.04, 3.0, 0.03), mul(mm, mat(-w / 2 + (k * w) / (nm + 1), 2.8, 0.05)))
      // pilaster pair
      for (const d of [-(w / 2 + 0.68), w / 2 + 0.68]) b.add(ORN, metricBox(0.3, eave - 1.6, 0.12), mul(m, mat(u + d, 0.7 + (eave - 1.6) / 2, 0.06)))
    }
    for (const s of [-1, 1]) {
      const m = faceFrame(s > 0 ? '+z' : '-z', s * HW, 0, 0, 0)
      for (const x of [-13.1, -10.6]) tall(m, s * x)
      sawBand(b, m, s > 0 ? x0 : -x1, s > 0 ? x1 : -x0, eave - 1.75)
    }
    const fm = faceFrame('-x', x0, 0, 0, 0)
    for (const u of [-3.7, 3.7]) tall(fm, u, 2.1)
    sawBand(b, fm, -HW, HW, eave - 1.75)
    // west door with ogee hood, icon niche and plaques (04, 05)
    b.add('wood', metricBox(1.3, 2.6, 0.05), mul(fm, mat(0, 0.7 + 1.3, 0.03)))
    b.add(ORN, extrude(frameShape('pointed', 1.3, 2.9, 0.22, 0, 0.7), 0.12, 8), fm)
    b.add('manPlaque', metricBox(1.5, 0.9, 0.06), mul(fm, mat(0, 4.3, 0.05)))
    b.add(ORN, extrude(frameShape('pointed', 1.0, 1.5, 0.14, 0, eave - 2.75), 0.08, 8), fm)
    b.add('manIcon', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.0, 1.5, 0, eave - 2.75, 8))), mul(fm, mat(0, 0, 0.03)))
    for (let i = 0; i < 4; i++) b.block('manPlinth', 0.35, 0.7 * (1 - (i + 1) / 5), 2.4, x0 - 0.18 - i * 0.35, 0, 0)
    // hipped roof against the west wall of the church
    const t = Math.tan(20 * D2R)
    const ov = 0.6
    const ye = eave - ov * t
    const yr = eave + HW * t
    const xw = x0 - ov
    const xr0 = x0 + HW
    const xe = x1 + 0.05
    const he = HW + ov
    for (const s of [-1, 1]) {
      facet(b, ZN, [V(xw, ye, s * he), V(xe, ye, s * he), V(xe, yr, 0), V(Math.min(xr0, xe), yr, 0)], { seams: SEAM, thickness: 0.1 })
      b.beam(ZN, V(xw, ye + 0.04, s * he), V(Math.min(xr0, xe), yr + 0.04, 0), 0.16, 0.07)
      facet(b, SOFF, [V(x0, eave - 0.1, s * HW), V(x1, eave - 0.1, s * HW), V(xe, ye - 0.1, s * he), V(xw, ye - 0.1, s * he)], { hint: V(0, -1, 0) })
    }
    facet(b, ZN, [V(xw, ye, -he), V(xw, ye, he), V(Math.min(xr0, xe), yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, SOFF, [V(x0, eave - 0.1, HW), V(x0, eave - 0.1, -HW), V(xw, ye - 0.1, -he), V(xw, ye - 0.1, he)], { hint: V(0, -1, 0) })
    // flashing where the porch roof meets the church wall
    b.beam(ZN, V(x1 + 0.03, ye, -he), V(x1 + 0.03, yr, 0), 0.08, 0.3, V(1, 0, 0))
    b.beam(ZN, V(x1 + 0.03, ye, he), V(x1 + 0.03, yr, 0), 0.08, 0.3, V(1, 0, 0))
  }

  /* ---------------- body roof ---------------- */
  convexHip(b, ZN, BODY, EAVE, PITCH, OV, SEAM)
  orthoCross(b, 11.9, EAVE + 1.45, 0, 1.3)

  /* ---------------- tower ---------------- */
  {
    const { x: tx, hb, top, r, o1, d1 } = TW
    b.block(WALL, 2 * hb, top - 8.0, 2 * hb, tx, 8.0, 0)
    b.block(ORN, 2 * hb + 0.2, 0.22, 2 * hb + 0.2, tx, top - 1.25, 0)
    b.block(ORN, 2 * hb + 0.4, 0.3, 2 * hb + 0.4, tx, top - 0.3, 0)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f.endsWith('x') ? tx + (f[0] === '+' ? hb : -hb) : f[0] === '+' ? hb : -hb
      const off = f.endsWith('x') ? 0 : f === '+z' ? tx : -tx
      const m = faceFrame(f, plane, 0, 0, 0)
      for (let k = 0; k < 6; k++) {
        const u = off - hb + (k + 0.5) * (2 * hb) / 6
        b.add(ORN, extrude(frameShape('round', 0.62, 0.7, 0.06, u, top - 1.0), 0.05, 8), m)
      }
      for (let u = -hb + 0.15; u < hb; u += 0.3) b.add('manTooth', metricBox(0.18, 0.18, 0.1), mul(m, mat(off + u, top - 0.45, 0.06, 0, 0, Math.PI / 4)))
    }
    // short zinc skirt from the square stage to the octagon
    {
      const ri = r * Math.cos(Math.PI / 8) + 0.05
      const t = Math.tan(18 * D2R)
      const ov = 0.35
      const ye = top - ov * t
      const yi = top + (hb - ri) * t
      const c = [V(tx - hb - ov, ye, -hb - ov), V(tx + hb + ov, ye, -hb - ov), V(tx + hb + ov, ye, hb + ov), V(tx - hb - ov, ye, hb + ov)]
      const ci = [V(tx - ri, yi, -ri), V(tx + ri, yi, -ri), V(tx + ri, yi, ri), V(tx - ri, yi, ri)]
      for (let i = 0; i < 4; i++) facet(b, ZN, [c[i], c[(i + 1) % 4], ci[(i + 1) % 4], ci[i]], { seams: SEAM, thickness: 0.06 })
    }
    // octagonal belfry
    prism(b, WALL, { x: tx, n: 8, r, y0: top - 0.2, h: d1 - top + 0.2 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: top + 0.35, h: 0.25, grow: 0.1 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: o1, h: 0.22, grow: 0.12 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: d1 - 0.3, h: 0.3, grow: 0.18 })
    const ap = r * Math.cos(Math.PI / 8)
    const fw = 2 * r * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(tx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      b.add(ORN, extrude(frameShape('round', fw - 0.45, o1 - top - 1.0, 0.1, 0, top + 0.75), 0.08, 10), m)
      if (k % 2 === 0) {
        // louvred arched window
        b.add('manFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 2.3, 0, top + 1.1, 10))), mul(m, mat(0, 0, 0.03)))
        for (let j = 0; j < 8; j++) b.add(ORN, metricBox(0.9, 0.05, 0.05), mul(m, mat(0, top + 1.25 + j * 0.24, 0.06)))
      }
      // upper register: two small arches with a rosette between
      for (const u of [-fw / 4, fw / 4]) b.add(ORN, extrude(frameShape('round', fw / 2 - 0.28, d1 - o1 - 0.75, 0.06, u, o1 + 0.35), 0.06, 8), m)
      b.add(ORN, new THREE.TorusGeometry(0.16, 0.04, 4, 12), mul(m, mat(0, d1 - 0.75, 0.05)))
      const c = Math.PI / 8 + (k * Math.PI) / 4
      b.add(ORN, metricBox(0.18, d1 - top - 0.6, 0.18), mat(tx + Math.cos(c) * (r - 0.03), (top + d1) / 2, Math.sin(c) * (r - 0.03), Math.PI / 2 - c))
    }
    // broad eave with timber soffit (06) and zinc eave cap
    const R = r + 0.85
    b.add(SOFF, loft([polyRing(8, R, d1 - 0.02, Math.PI / 8, tx, 0), polyRing(8, r + 0.05, d1 + 0.22, Math.PI / 8, tx, 0)], { flat: true }))
    // two-tier bell cupola
    const st1: [number, number][] = [[R, d1], [R - 0.03, d1 + 0.12], [R - 0.4, d1 + 0.32], [r * 0.86, d1 + 0.6], [r * 0.82, d1 + 1.0], [r * 0.72, d1 + 1.45], [r * 0.52, d1 + 1.8], [r * 0.4, d1 + 1.92]]
    octBell(b, ZN, tx, st1, 2)
    const y2 = d1 + 1.92
    const st2: [number, number][] = [[r * 0.46, y2], [r * 0.45, y2 + 0.1], [r * 0.43, y2 + 0.42], [r * 0.36, y2 + 0.75], [r * 0.22, y2 + 1.02], [0.12, y2 + 1.12]]
    octBell(b, ZN, tx, st2, 1)
    b.add(ZN, new THREE.SphereGeometry(0.3, 12, 8), mat(tx, y2 + 1.32, 0))
    orthoCross(b, tx, y2 + 1.52, 0, 2.0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-0.7, -1],
  materialFocus: [4, 11, 3.5],
  materials: () => ({
    manWall: new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: 0.92 }),
    manTrim: new THREE.MeshStandardMaterial({ color: '#e7dfca', roughness: 0.88 }),
    manTooth: new THREE.MeshStandardMaterial({ color: '#cdbf9f', roughness: 0.9 }),
    manPlinth: new THREE.MeshStandardMaterial({ color: '#bdb5a3', roughness: 0.92 }),
    manFrame: new THREE.MeshStandardMaterial({ color: '#5b4637', roughness: 0.7 }),
    manPlaque: new THREE.MeshStandardMaterial({ color: '#f0ece2', roughness: 0.6 }),
    manIcon: new THREE.MeshStandardMaterial({ color: '#7d93a8', roughness: 0.7 }),
  }),
  notes:
    'Matei Basarab church (1648–1660) with enclosed porch and tower over the pronaos, interpreted from 2013–2014 photographs and the OSM outline; heights estimated, ornament simplified. The photographs show the earlier grey sheet roof — roofs and tower cupola are shown in elZinc Slate per the COLOR METAL record (surfaces not documented).',
}
export default model
