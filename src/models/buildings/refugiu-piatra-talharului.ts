/**
 * Refugiul Montan „Piatra Tâlharului” (CAR Cluj, opened September 2025),
 * Culmea Vlădesei, Bihor.
 *
 * COLOR METAL supplied the PREFA anthracite aluminium standing-seam roof.
 * Modelling specification derived from the 12 reference photographs (drone
 * top/oblique views 01, 04, 07; front elevations 03, 08, 09; end and back
 * views 02, 05, 06, 10, 11, 12). No OSM outline exists, so all sizes are
 * read from the photographs (door ≈ 2.0 m, four-riser stair, square window
 * ≈ 1.0 m) — real metres, origin at the footprint centre, +X = long axis,
 * +Z = entrance front (photovoltaic slope and glazed roof lantern).
 *  - Compact timber volume ≈ 7.8 × 4.6 m on a timber frame raised ≈ 0.9 m on
 *    log stumps; dark-stained vertical boards (the photographs show timber
 *    walls — the aluminium is the roof), a corner porch at the front-left
 *    with a post, exposed light-timber rafters under the corner skirts, a
 *    front deck with a four-riser stair.
 *  - One continuous steep "skirt" roof in PREFA anthracite standing seam that
 *    reaches far down: a short ridge carrying a glazed lantern (three panes,
 *    sloping to the front), a planar steep back slope (≈ 66°) down to a low
 *    back eave (≈ 1.3 m above the floor), a planar front slope (≈ 51°) with
 *    the photovoltaic field ending at the door head (≈ 2.1 m), and conical
 *    corner fans whose seams radiate from the lantern's lower front corners
 *    and wrap the gable ends; the front corners droop to ≈ 1.1 m above the
 *    deck so the front eave rises in a broken line towards the middle.
 *  - Seams 0.55 m on the planes and along the eave of the fans (tapering
 *    panels converge at the fan apex as photographed).
 * Approximations: overall dimensions ±10 % (scaled from people-free photos),
 * the exact eave polyline in plan and the lantern section, the door recess,
 * porch depth and window sizes; back and right end assumed windowless (as in
 * photos 05, 11, 12); the PV module layout simplified to 2 × 5 modules.
 */
import * as THREE from 'three'
import { Builder, V, facet, mat, metricBox, door, window_ } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3

const FLOOR = 0.9 // floor / deck level above ground
const WALL_BOT = 0.42 // bottom of the board cladding (covers the floor frame)
const SEAM = { key: 'alu', spacing: 0.55, h: 0.045, w: 0.032 }
const SOFFIT = 0.24 // roof build-up shown at the eaves

/* ---------------- plan ---------------- */
const WX = 3.9 // half wall length
const ZB = -2.45 // back wall
const ZF = 2.17 // front wall
const PORCH = { x1: -2.2, z0: 1.0 } // recessed corner porch (front-left)

/* ---------------- roof key points ---------------- */
const y = (h: number) => FLOOR + h
const BL = V(-4.78, y(1.3), -2.92)
const BR = V(4.78, y(1.3), -2.92)
const FLc = V(-4.78, y(1.1), 2.2)
const FRc = V(4.78, y(1.1), 2.2)
const FCL = V(-1.6, y(2.1), 3.05)
const FCR = V(1.6, y(2.1), 3.05)
const LX = 1.75 // lantern half length
const RL = V(-LX, y(6.0), -0.8) // ridge = lantern top back edge
const RR = V(LX, y(6.0), -0.8)
const CL = V(-LX, y(6.0), -0.36) // cap front edge
const CR = V(LX, y(6.0), -0.36)
const AL = V(-LX, y(5.42), 0.4) // glazing foot = apex of the corner fans
const AR = V(LX, y(5.42), 0.4)

/** Top-surface triangles of the roof, used to fit walls/posts underneath. */
const roofTris: [P3, P3, P3][] = []

function roofY(x: number, z: number) {
  let best = -Infinity
  for (const [a, b, c] of roofTris) {
    const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
    if (Math.abs(d) < 1e-9) continue
    const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d
    const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d
    const l3 = 1 - l1 - l2
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue
    best = Math.max(best, l1 * a.y + l2 * b.y + l3 * c.y)
  }
  return best
}

function planeNormal(pts: P3[]) {
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  return n.y < 0 ? n.negate() : n
}

/** Planar roof face: seamed anthracite top, timber soffit underneath. */
function plane(b: Builder, pts: P3[], withSeams = true) {
  facet(b, 'alu', pts, { seams: withSeams ? SEAM : undefined })
  const n = planeNormal(pts)
  const off = n.clone().multiplyScalar(-SOFFIT)
  facet(b, 'soffit', pts.map((p) => p.clone().add(off)), { hint: V(0, -1, 0) })
  for (let i = 1; i < pts.length - 1; i++) roofTris.push([pts[0], pts[i], pts[i + 1]])
}

/** Resample a polyline at ≈ step, keeping its vertices. Returns points + arc length. */
function resample(poly: P3[], step: number) {
  const pts: P3[] = [poly[0].clone()]
  const s: number[] = [0]
  let acc = 0
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]
    const c = poly[i + 1]
    const L = a.distanceTo(c)
    const n = Math.max(1, Math.round(L / step))
    for (let k = 1; k <= n; k++) {
      pts.push(a.clone().lerp(c, k / n))
      s.push(acc + (L * k) / n)
    }
    acc += L
  }
  return { pts, s, len: acc }
}

/**
 * Conical fan from an apex to an eave polyline (a ruled surface; every ruling
 * is a straight panel joint). Smooth normals, UV u = eave arc length so the
 * panel texture tapers with the panels, seams every 0.55 m along the eave.
 */
function fan(b: Builder, apex: P3, eave: P3[], seamFrom = 0.2, seamTo = 0.2) {
  const { pts, s, len } = resample(eave, 0.16)
  const triN: P3[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const n = V().subVectors(pts[i], apex).cross(V().subVectors(pts[i + 1], apex)).normalize()
    triN.push(n.y < 0 ? n.negate() : n)
  }
  const vN = pts.map((_, i) => {
    const a = triN[Math.max(0, i - 1)]
    const c = triN[Math.min(triN.length - 1, i)]
    return a.dot(c) > 0.86 ? a.clone().add(c).normalize() : null
  })
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const pos2: number[] = []
  const nor2: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const E0 = pts[i]
    const E1 = pts[i + 1]
    const n0 = vN[i] ?? triN[i]
    const n1 = vN[i + 1] ?? triN[i]
    const nA = n0.clone().add(n1).normalize()
    // keep the winding consistent with the (upward) normal
    const raw = V().subVectors(E0, apex).cross(V().subVectors(E1, apex))
    const flip = raw.y < 0
    const verts: [P3, P3, number, number][] = flip
      ? [
          [apex, nA, (s[i] + s[i + 1]) / 2, 0],
          [E1, n1, s[i + 1], E1.distanceTo(apex)],
          [E0, n0, s[i], E0.distanceTo(apex)],
        ]
      : [
          [apex, nA, (s[i] + s[i + 1]) / 2, 0],
          [E0, n0, s[i], E0.distanceTo(apex)],
          [E1, n1, s[i + 1], E1.distanceTo(apex)],
        ]
    for (const [p, n, u, v] of verts) {
      pos.push(p.x, p.y, p.z)
      nor.push(n.x, n.y, n.z)
      uv.push(u, v)
    }
    // soffit (offset underside, reversed)
    for (const [p, n] of [verts[0], verts[2], verts[1]]) {
      const q = p.clone().addScaledVector(n, -SOFFIT)
      pos2.push(q.x, q.y, q.z)
      nor2.push(-n.x, -n.y, -n.z)
    }
    roofTris.push([apex, E0, E1])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add('alu', g)
  const g2 = new THREE.BufferGeometry()
  g2.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3))
  g2.setAttribute('normal', new THREE.Float32BufferAttribute(nor2, 3))
  b.add('soffit', g2)

  // standing seams along the rulings
  const at = (ss: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      if (ss <= s[i + 1] + 1e-9) {
        const t = (ss - s[i]) / (s[i + 1] - s[i])
        return { p: pts[i].clone().lerp(pts[i + 1], t), n: triN[i] }
      }
    }
    return { p: pts[pts.length - 1].clone(), n: triN[triN.length - 1] }
  }
  for (let k = 1; k * SEAM.spacing < len; k++) {
    const ss = k * SEAM.spacing
    if (ss < seamFrom || ss > len - seamTo) continue
    const { p, n } = at(ss)
    const lift = n.clone().multiplyScalar(SEAM.h / 2)
    const a = apex.clone().lerp(p, 0.06).add(lift)
    b.beam('alu', a, p.clone().add(lift), SEAM.w * 0.85, SEAM.h * 0.85, n)
  }
}

/** Eave drip edge + fascia along a polyline. */
function eaveEdge(b: Builder, poly: P3[]) {
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]
    const c = poly[i + 1]
    b.beam('alu', a.clone().add(V(0, -0.09, 0)), c.clone().add(V(0, -0.09, 0)), 0.05, 0.22)
  }
}

/* ------------------------------------------------------------------ */

function roof(b: Builder) {
  // planar faces
  plane(b, [BL, BR, RR, RL]) // steep back slope
  plane(b, [FCL, FCR, AR, AL]) // photovoltaic front slope
  plane(b, [BL, RL, AL], false) // end triangles below the lantern ends
  plane(b, [BR, AR, RR], false)
  // their panels run parallel to the fold towards the fan apex
  for (const [B0, R0, A0] of [
    [BL, RL, AL],
    [BR, RR, AR],
  ] as [P3, P3, P3][]) {
    const dir = V().subVectors(A0, B0).normalize()
    const toR = V().subVectors(R0, B0)
    const h = toR.clone().sub(dir.clone().multiplyScalar(toR.dot(dir))).length()
    const n = planeNormal([B0, R0, A0])
    for (let f = SEAM.spacing / h; f < 0.97; f += SEAM.spacing / h) {
      const P = A0.clone().lerp(R0, f).addScaledVector(n, SEAM.h / 2)
      const Q = B0.clone().lerp(R0, f).addScaledVector(n, SEAM.h / 2)
      b.beam('alu', P, Q, SEAM.w, SEAM.h, n)
    }
  }
  // conical corner fans (wrapping the gable ends and the front corners)
  fan(b, AL, [BL, FLc, FCL])
  fan(b, AR, [FCR, FRc, BR])
  // hips, folds and ridge cappings
  // hip cappings laid on the fold (up = mean of the two face normals), covering the seam ends
  const nBack = planeNormal([BL, BR, RR])
  const cap = (a: P3, c: P3, nSide: P3) => {
    const up = nBack.clone().add(nSide).normalize()
    b.beam('alu', a.clone().addScaledVector(up, 0.035), c.clone().addScaledVector(up, 0.035), 0.17, 0.05, up)
  }
  cap(BL, RL, planeNormal([BL, RL, AL]))
  cap(BR, RR, planeNormal([BR, AR, RR]))
  for (const [a, c] of [
    [AL, BL],
    [AR, BR],
    [AL, FCL],
    [AR, FCR],
  ] as [P3, P3][])
    b.beam('alu', a.clone().add(V(0, 0.03, 0)), c.clone().add(V(0, 0.03, 0)), SEAM.w * 1.4, SEAM.h * 1.2)
  eaveEdge(b, [BR, BL])
  eaveEdge(b, [BL, FLc, FCL, FCR, FRc, BR])

  /* glazed lantern on the short ridge */
  facet(b, 'alu', [RL, RR, CR, CL]) // flat cap
  b.beam('alu', RL.clone().add(V(0, 0.05, -0.02)), RR.clone().add(V(0, 0.05, -0.02)), 0.08, 0.16)
  b.beam('alu', CL.clone().add(V(0, 0.05, 0.02)), CR.clone().add(V(0, 0.05, 0.02)), 0.08, 0.16)
  for (const sx of [-1, 1]) {
    const R = sx < 0 ? RL : RR
    const C = sx < 0 ? CL : CR
    const A = sx < 0 ? AL : AR
    const o = V(sx * 0.05, 0, 0)
    facet(b, 'alu', [R.clone().add(o), C.clone().add(o), A.clone().add(o)], { hint: V(sx, 0, 0) })
    b.beam('alu', C.clone().add(V(sx * 0.02, 0.03, 0)), A.clone().add(V(sx * 0.02, 0.03, 0)), 0.12, 0.12, V(0, 1, 0.6))
  }
  roofTris.push([RL, RR, CR], [RL, CR, CL], [CL, CR, AR], [CL, AR, AL])
  facet(b, 'glassC', [AL, AR, CR, CL]) // dark backing behind the panes
  // three glazed panes sloping to the front, aluminium frame and mullions
  const gn = planeNormal([AL, AR, CR])
  const lift = gn.clone().multiplyScalar(0.03)
  const g0 = AL.clone().lerp(CL, 0.06)
  const g1 = AL.clone().lerp(CL, 0.94)
  const xs = [-1.62, -0.56, 0.5, 1.56].map((x) => x - 0.03)
  for (let i = 0; i < 3; i++) {
    const xa = xs[i] + 0.04
    const xb = xs[i + 1] - 0.04
    facet(b, 'lanternGlass', [V(xa, g0.y, g0.z).add(lift), V(xb, g0.y, g0.z).add(lift), V(xb, g1.y, g1.z).add(lift), V(xa, g1.y, g1.z).add(lift)])
  }
  for (const x of [-1.66, -0.59, 0.47, 1.6]) b.beam('alu', V(x, AL.y, AL.z).add(lift), V(x, CL.y, CL.z).add(lift), 0.08, 0.07, gn)
  b.beam('alu', V(-LX, AL.y, AL.z).add(lift), V(LX, AL.y, AL.z).add(lift), 0.1, 0.09, gn)

  /* photovoltaic field on the front slope: 2 rows × 5 modules */
  const pn = planeNormal([FCL, FCR, AR])
  const up = V().subVectors(AL.clone().lerp(AR, 0.5), FCL.clone().lerp(FCR, 0.5))
  const slopeLen = up.length()
  up.normalize()
  const base = FCL.clone().lerp(FCR, 0.5).addScaledVector(pn, 0.09)
  const mw = 0.47
  const ml = (slopeLen - 0.55) / 2
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      const cx = (c - 2) * (mw + 0.025)
      const centre = base.clone().add(V(cx, 0, 0)).addScaledVector(up, 0.2 + ml * (r + 0.5) + r * 0.03)
      const m = new THREE.Matrix4().makeBasis(V(1, 0, 0), up, pn).setPosition(centre)
      b.add('pvModule', metricBox(mw, ml - 0.02, 0.035), m)
    }
  }
  // clamp rails across the modules
  for (const t of [0.24, 0.24 + ml - 0.05, 0.27 + ml + 0.05, 0.2 + 2 * ml - 0.05]) {
    const p = base.clone().addScaledVector(up, t).addScaledVector(pn, 0.03)
    b.beam('alu', p.clone().add(V(-1.27, 0, 0)), p.clone().add(V(1.27, 0, 0)), 0.04, 0.05, pn)
  }
}

/* ------------------------------------------------------------------ */

/** Wall outline (x, z), counter-clockwise seen from above with outward normal n = (−dz, dx). */
const OUTLINE: [number, number][] = [
  [WX, ZF],
  [WX, ZB],
  [-WX, ZB],
  [-WX, PORCH.z0],
  [PORCH.x1, PORCH.z0],
  [PORCH.x1, ZF],
]

function walls(b: Builder) {
  for (let i = 0; i < OUTLINE.length; i++) {
    const [x0, z0] = OUTLINE[i]
    const [x1, z1] = OUTLINE[(i + 1) % OUTLINE.length]
    const L = Math.hypot(x1 - x0, z1 - z0)
    const dx = (x1 - x0) / L
    const dz = (z1 - z0) / L
    const nx = -dz
    const nz = dx
    const n = Math.max(2, Math.ceil(L / 0.2))
    const pos: number[] = []
    const nor: number[] = []
    const uv: number[] = []
    const top = (t: number) => roofY(x0 + dx * t, z0 + dz * t) - 0.04
    for (let k = 0; k < n; k++) {
      const ta = (L * k) / n
      const tb = (L * (k + 1)) / n
      const A = [x0 + dx * ta, z0 + dz * ta]
      const B = [x0 + dx * tb, z0 + dz * tb]
      const ya = top(ta)
      const yb = top(tb)
      const quad: [number[], number, number][] = [
        [A, WALL_BOT, ta],
        [B, WALL_BOT, tb],
        [B, yb, tb],
        [A, WALL_BOT, ta],
        [B, yb, tb],
        [A, ya, ta],
      ]
      for (const [P, yy, u] of quad) {
        pos.push(P[0], yy, P[1])
        nor.push(nx, 0, nz)
        uv.push(u, yy)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    b.add('boards', g)
    // vertical board battens (≈ 0.18 m boards)
    const nb = Math.floor(L / 0.18)
    for (let k = 1; k < nb; k++) {
      const t = (L * k) / nb
      const yt = top(t) - 0.03
      const px = x0 + dx * t + nx * 0.012
      const pz = z0 + dz * t + nz * 0.012
      b.add('boardsDark', metricBox(0.028, yt - WALL_BOT, 0.024), mat(px, (yt + WALL_BOT) / 2, pz, Math.atan2(nx, nz)))
    }
    // corner boards
    b.add('boardsDark', metricBox(0.09, top(0) - WALL_BOT, 0.09), mat(x0 + nx * 0.03, (top(0) + WALL_BOT) / 2, z0 + nz * 0.03))
  }
  // floor plate closing the underside
  b.block('under', 2 * WX - 0.1, 0.06, ZF - ZB - 0.1, 0, WALL_BOT - 0.04, (ZF + ZB) / 2)

  /* openings */
  const win = { glassKey: 'glassC', frameKey: 'iron', frame: 0.055 }
  window_(b, '+z', ZF + 0.03, -0.62, FLOOR + 0.58, { ...win, w: 0.96, h: 0.98 })
  window_(b, '+z', ZF + 0.03, 1.36, FLOOR + 1.08, { ...win, w: 0.66, h: 0.66 })
  // entrance door in a shallow recess
  b.block('under', 1.0, 2.12, 0.05, 0.6, FLOOR, ZF + 0.005)
  door(b, '+z', ZF - 0.02, 0.6, { w: 0.86, h: 2.02, y0: FLOOR, leafKey: 'iron', frameKey: 'boardsDark', frame: 0.06 })
  // left end: window near the porch
  window_(b, '-x', -WX - 0.03, 0.15, FLOOR + 0.9, { ...win, w: 0.62, h: 0.92 })
  // porch corner post
  const pt = roofY(-WX + 0.08, ZF - 0.06) - SOFFIT - 0.12
  b.block('boardsDark', 0.13, pt - FLOOR, 0.13, -WX + 0.08, FLOOR, ZF - 0.06)
}

/** Exposed light-timber rafters under the drooping front corners (photos 09, 10). */
function rafters(b: Builder) {
  for (const sx of [-1, 1]) {
    const apex = sx < 0 ? AL : AR
    const eave = sx < 0 ? [FCL, FLc, BL.clone().lerp(FLc, 0.62)] : [FCR, FRc, BR.clone().lerp(FRc, 0.62)]
    const { pts } = resample(eave, 0.55)
    for (const E of pts.slice(1, -1)) {
      const d = V().subVectors(apex, E).normalize()
      const a = E.clone().addScaledVector(d, 0.12)
      const c = E.clone().addScaledVector(d, 2.2)
      const n = V().crossVectors(d, V(-d.z, 0, d.x)).normalize()
      const nn = n.y < 0 ? n.negate() : n
      b.beam('timber', a.addScaledVector(nn, -SOFFIT - 0.07), c.addScaledVector(nn, -SOFFIT - 0.07), 0.07, 0.14, nn)
    }
  }
  // small rafter ends along the front wall head (orange blocks in photo 09)
  for (let x = -1.45; x <= 1.46; x += 0.58) b.block('timber', 0.08, 0.12, 0.3, x, FLOOR + 2.0, ZF + 0.12)
}

function deck(b: Builder) {
  const top = FLOOR
  const zf = 3.55
  // front deck
  b.block('deckTop', 8.2, 0.05, zf - ZF, 0, top - 0.05, (zf + ZF) / 2)
  // porch floor (recessed corner)
  b.block('deckTop', PORCH.x1 + 4.1, 0.05, ZF - PORCH.z0, (PORCH.x1 - 4.1) / 2, top - 0.05, (ZF + PORCH.z0) / 2)
  // fascia boards
  b.block('boards', 8.2, top - 0.05 - WALL_BOT, 0.06, 0, WALL_BOT, zf - 0.03)
  b.block('boards', 0.06, top - 0.05 - WALL_BOT, zf - PORCH.z0, -4.07, WALL_BOT, (zf + PORCH.z0) / 2)
  b.block('boards', 0.06, top - 0.05 - WALL_BOT, zf - ZF, 4.07, WALL_BOT, (zf + ZF) / 2)
  for (let x = -4.0; x < 4.1; x += 0.16) b.block('boardsDark', 0.026, top - 0.08 - WALL_BOT, 0.02, x, WALL_BOT, zf + 0.005)
  b.block('under', 8.1, 0.05, zf - ZF, 0, WALL_BOT, (zf + ZF) / 2)
  // stair: four risers, open stringers
  const sx0 = -1.08
  const rise = top / 4
  for (let i = 1; i <= 3; i++) {
    const zc = zf + 0.14 + (i - 1) * 0.26
    b.block('deckTop', 0.96, 0.045, 0.24, sx0, top - i * rise - 0.045, zc)
  }
  for (const s of [-1, 1]) b.beam('iron', V(sx0 + s * 0.5, top - 0.05, zf), V(sx0 + s * 0.5, 0.0, zf + 0.92), 0.05, 0.16)
  // log stumps / blocks under the frame
  const stump = (x: number, z: number) => b.add('stump', new THREE.CylinderGeometry(0.17, 0.18, WALL_BOT, 12), mat(x, WALL_BOT / 2, z))
  for (const x of [-3.7, -2.2, -0.7, 0.7, 2.2, 3.7]) {
    stump(x, ZB + 0.25)
    stump(x, ZF - 0.25)
    stump(x, zf - 0.3)
  }
  for (const z of [-0.9, 0.6]) {
    stump(-3.7, z)
    stump(3.7, z)
  }
}

function build(): Builder {
  const b = new Builder()
  roofTris.length = 0
  roof(b)
  walls(b)
  rafters(b)
  deck(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [3.4, 3.9, 0.9],
  materials: () => ({
    boards: new THREE.MeshStandardMaterial({ color: '#363b40', roughness: 0.86 }),
    boardsDark: new THREE.MeshStandardMaterial({ color: '#2b2f33', roughness: 0.88 }),
    deckTop: new THREE.MeshStandardMaterial({ color: '#3c4146', roughness: 0.9 }),
    under: new THREE.MeshStandardMaterial({ color: '#1f2224', roughness: 0.95 }),
    soffit: new THREE.MeshStandardMaterial({ color: '#c99a62', roughness: 0.78, side: THREE.DoubleSide }),
    stump: new THREE.MeshStandardMaterial({ color: '#b08a5c', roughness: 0.85 }),
    pvModule: new THREE.MeshStandardMaterial({ color: '#16191e', metalness: 0.45, roughness: 0.22, envMapIntensity: 1.2 }),
    lanternGlass: new THREE.MeshStandardMaterial({ color: '#c3d0d8', metalness: 0.55, roughness: 0.08, envMapIntensity: 1.5 }),
  }),
  notes:
    'Steep PREFA anthracite standing-seam roof with conical corner fans, glazed ridge lantern and PV field; timber walls on log stumps. Sizes estimated from photographs (no OSM outline).',
}
export default model
