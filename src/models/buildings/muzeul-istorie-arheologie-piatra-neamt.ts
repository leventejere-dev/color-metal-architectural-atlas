/**
 * Muzeul de Istorie și Arheologie, Piatra Neamț (former Administrative Palace,
 * 1910–1912) — Str. Mihai Eminescu 10, OSM way 284997622.
 *
 * COLOR METAL supplied natural titanium-zinc (register). In the photographs the
 * zinc covers the upper (low-pitched) part of the main block roof, the flared
 * skirt and the bell-shaped dome over the entrance risalit (dome in diamond
 * shingles), plus gutters, hip and curb flashings. The steep lower slopes and
 * the wing roofs are orange clay tile.
 *
 * Modelling specification (real metres; +X = OSM long axis, bearing 15.5°;
 * +Z = main façade, facing ESE ≈ 105.5°):
 *  - H-shaped plan from the OSM outline (46.4 × 34 m): two end wings
 *    8.6 × 34 m whose front ends form projecting corner pavilions (5.6 m in
 *    front of the main block, 10.5 m behind it), a main block 28.4 × 17.9 m,
 *    a shallow entrance risalit 10.6 m wide in front and a stair projection
 *    8.4 × 5.7 m behind.
 *  - Two storeys over a grey stone socle; eaves ≈ 13.6 m (scaled from the
 *    drone photos with the façade bay width). White render, cornice, belt
 *    course; ground floor round-arched windows with yellow/white voussoirs,
 *    first floor tall rectangular windows; 3 bays either side of the risalit.
 *  - Entrance risalit: round-arched timber portal over a flight of steps,
 *    triple arched window with balcony and a yellow voussoir arch, blue
 *    majolica frieze, arched clock tympanum under a zinc barrel hood cut into
 *    the zinc skirt; above, a square bell (pointed-profile) dome in zinc
 *    diamond shingles with a small square cap and a mast.
 *  - Main block roof: mansard type — steep tile slopes (≈54° front, ≈44° rear)
 *    up to a curb, low zinc upper roof (15°) with standing seams; wings and
 *    pavilions: steep (56°) hipped tile roofs with zinc hip flashings; the
 *    stair projection has a hipped tile roof running into the main roof.
 *  - Small shed dormers, a wall dormer on each pavilion front, white rendered
 *    chimneys with tile caps.
 * Approximations: heights estimated from the photographs (no published
 * height); rear and outer side elevations only partly photographed — window
 * counts there are assumed; ornament (majolica, voussoirs, balconies) is
 * simplified; the dome's diamond shingles are drawn about twice real size so
 * they stay legible at model scale.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, rectRing, hippedRoof, helm, window_, door, faceFrame, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/* ---------------- plan & section ---------------- */
const EAVE = 13.6
const WING = { cx: 18.5, hw: 4.3, hz: 17 } // wings at x = ±(14.2 … 22.8)
const MAIN = { x: 14.2, zf: 11.4, zr: -6.5 }
const RIS = { hw: 5.3, z: 14.2, top: 14.0 }
const REAR = { hw: 4.2, z: -12.2 }
const CURB = 18.0
const ZF_CURB = 8.2
const ZR_CURB = -1.9
const Z_RIDGE = (ZF_CURB + ZR_CURB) / 2
const ZINC_T = Math.tan(15 * D2R)
const RIDGE = CURB + (ZF_CURB - Z_RIDGE) * ZINC_T
const TF = (CURB - EAVE) / (MAIN.zf - ZF_CURB) // front tile slope
const TR = (CURB - EAVE) / (ZR_CURB - MAIN.zr) // rear tile slope
const WING_T = Math.tan(56 * D2R)
const OH = 0.6 // eave overhang

const SEAM = seams('zincNatural', 0.55, 0.04, 0.045)
const HOOD_R = 2.45 // clock hood radius

/* ---------------- roof height helpers (for chimneys, dormers) ---------------- */
function wingRoofY(x: number, z: number) {
  const dx = Math.abs(Math.abs(x) - WING.cx)
  return EAVE + Math.min(WING.hw - dx, WING.hz - Math.abs(z)) * WING_T
}
function mainRoofY(z: number) {
  if (z > ZF_CURB) return EAVE + (MAIN.zf - z) * TF
  if (z < ZR_CURB) return EAVE + (z - MAIN.zr) * TR
  return CURB + Math.min(ZF_CURB - z, z - ZR_CURB) * ZINC_T
}

/* ---------------- façade elements ---------------- */

/** Plane coordinate moved outwards by d from a façade plane. */
const out = (face: Face, plane: number, d: number) => (face[0] === '+' ? plane + d : plane - d)

/** Arc of alternating yellow / white voussoirs in a façade plane. */
function voussoirs(b: Builder, face: Face, plane: number, cu: number, cy: number, r0: number, r1: number, a0 = 0, a1 = Math.PI, n = 9) {
  const fm = faceFrame(face, plane, 0, 0, 0)
  const rm = (r0 + r1) / 2
  const len = ((a1 - a0) * rm) / n
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) * (a1 - a0)) / n
    b.add(i % 2 === 0 ? 'majYellow' : 'trim', metricBox(len * 0.94, r1 - r0, 0.12), M(fm, mat(cu + Math.cos(a) * rm, cy + Math.sin(a) * rm, 0.06, 0, 0, a + Math.PI / 2)))
  }
}

/** Ground-floor round-arched window with voussoir arch and basement light below. */
function gfWindow(b: Builder, face: Face, plane: number, u: number, w = 1.6) {
  const y0 = 2.2
  const h = 3.25
  window_(b, face, plane, u, y0, { type: 'round', w, h, glassKey: 'glassM', frameKey: 'white', frame: 0.09, bars: [2, 3], sill: true })
  voussoirs(b, face, plane, u, y0 + h - w / 2, w / 2 + 0.1, w / 2 + 0.42)
  // basement light in the socle
  window_(b, face, out(face, plane, 0.12), u, 0.45, { w: w * 0.7, h: 0.55, glassKey: 'glassM', frameKey: 'stoneGrey', frame: 0.08 })
}

/** First-floor rectangular window with transom and sill. */
function ffWindow(b: Builder, face: Face, plane: number, u: number, w = 1.45) {
  window_(b, face, plane, u, 7.4, { w, h: 2.75, glassKey: 'glassM', frameKey: 'white', frame: 0.1, bars: [2, 4], sill: true })
  // small majolica accent under the sill (as photographed on the main façade)
  b.add('majGreen', metricBox(w * 0.7, 0.12, 0.06), M(faceFrame(face, plane, u, 0, 0), mat(0, 6.95, 0.04)))
}

/** Both floors of one bay. */
function bay(b: Builder, face: Face, plane: number, u: number) {
  gfWindow(b, face, plane, u)
  ffWindow(b, face, plane, u)
}

/* ---------------- roof elements ---------------- */

/** Small shed dormer standing on a roof slope; (x, y, z) = front-bottom centre on the roof surface. */
function dormer(b: Builder, x: number, y: number, z: number, dir: Face, pitch: number, w = 1.05, h = 0.95) {
  const t = Math.tan(pitch * D2R)
  const tr = Math.tan(18 * D2R)
  const L = h / (t - tr) + 0.35
  const g = new Builder()
  g.add('tileMuseum', metricBox(w, h + 0.3, L), mat(0, (h - 0.3) / 2, -L / 2))
  g.add('zincNatural', metricBox(w * 0.66, h * 0.62, 0.04), mat(0, h * 0.45, 0.01))
  g.add('glassM', new THREE.PlaneGeometry(w * 0.5, h * 0.42), mat(0, h * 0.45, 0.035))
  const hw = w / 2 + 0.12
  facet(g, 'tileMuseum', [V(-hw, h + 0.05, 0.2), V(hw, h + 0.05, 0.2), V(hw, h + 0.05 + (L + 0.2) * tr, -L), V(-hw, h + 0.05 + (L + 0.2) * tr, -L)], { thickness: 0.08 })
  const ry = dir === '+z' ? 0 : dir === '-z' ? Math.PI : dir === '+x' ? Math.PI / 2 : -Math.PI / 2
  b.merge(g, mat(x, y, z, ry))
}

/** White rendered chimney with a small tile pyramid cap. */
function chimney(b: Builder, x: number, z: number, roofY: number, w = 0.75, d = 0.95) {
  const top = roofY + 1.9
  b.block('trim', w, top - (roofY - 1.2), d, x, roofY - 1.2, z)
  b.block('trim', w + 0.16, 0.18, d + 0.16, x, top - 0.45, z)
  const r = Math.hypot(w, d) / 2 + 0.14
  helm(b, 'tileMuseum', { x, z, n: 4, phase: Math.atan2(d, w), stations: [[r, top], [0.02, top + 0.5]], flat: true })
}

/** Gutter beam along an eave line. */
function gutter(b: Builder, a: THREE.Vector3, c: THREE.Vector3) {
  b.beam('zincNatural', a.clone().add(V(0, -0.08, 0)), c.clone().add(V(0, -0.08, 0)), 0.22, 0.2)
}

/* ---------------- dome ---------------- */
const DOME = { cz: 8.8, hx: 4.9, hz: 5.0, y0: 15.85, rho: 2.0, rTop: 0.14 }

/** Pointed-arch radial profile, unit half-width: r(yn) for yn in [0, apex]. */
const domeR = (yn: number) => Math.sqrt(DOME.rho * DOME.rho - yn * yn) - (DOME.rho - 1)
const DOME_YN_TOP = Math.sqrt(DOME.rho * DOME.rho - (DOME.rho - 1 + DOME.rTop) ** 2)

function domeAndSkirt(b: Builder) {
  /* flared zinc skirt: two-stage truncated hip, the front facets split around the clock hood */
  const z0 = 2.4
  const z1 = RIS.z + 1.25
  const hx0 = RIS.hw + 1.35
  const y0 = 13.85
  const stage = (hxA: number, za0: number, za1: number, yA: number, hxB: number, zb0: number, zb1: number, yB: number) => {
    const e = [V(-hxA, yA, za0), V(hxA, yA, za0), V(hxA, yA, za1), V(-hxA, yA, za1)]
    const c = [V(-hxB, yB, zb0), V(hxB, yB, zb0), V(hxB, yB, zb1), V(-hxB, yB, zb1)]
    facet(b, 'zincNatural', [e[1], e[0], c[0], c[1]], { seams: SEAM, thickness: 0.1 })
    facet(b, 'zincNatural', [e[0], e[3], c[3], c[0]], { seams: SEAM, thickness: 0.1 })
    facet(b, 'zincNatural', [e[2], e[1], c[1], c[2]], { seams: SEAM, thickness: 0.1 })
    // front facet split left / right of the hood (|x| > HOOD_R)
    const at = (p: THREE.Vector3, q: THREE.Vector3, x: number) => p.clone().lerp(q, (x - p.x) / (q.x - p.x))
    for (const s of [-1, 1]) {
      const eo = s < 0 ? e[3] : e[2]
      const co = s < 0 ? c[3] : c[2]
      const ei = at(e[3], e[2], s * HOOD_R)
      const ci = at(c[3], c[2], s * HOOD_R)
      facet(b, 'zincNatural', [eo, ei, ci, co], { seams: SEAM, thickness: 0.1 })
    }
    for (let i = 0; i < 4; i++) b.beam('zincNatural', c[i], e[i], 0.16, 0.1)
  }
  const fl = 1.15 // flare inset
  const yF = y0 + 0.45
  stage(hx0, z0, z1, y0, hx0 - fl, z0 + fl, z1 - fl, yF)
  stage(hx0 - fl, z0 + fl, z1 - fl, yF, DOME.hx, DOME.cz - DOME.hz, DOME.cz + DOME.hz, DOME.y0)
  // skirt eave gutter
  gutter(b, V(-hx0, y0, z1), V(hx0, y0, z1))
  for (const s of [-1, 1]) gutter(b, V(s * hx0, y0, z1), V(s * hx0, y0, MAIN.zf + OH))

  /* dome: lofted rectangles following a pointed profile */
  const N = 16
  const rings: THREE.Vector3[][] = []
  const ys: number[] = []
  const rs: number[] = []
  for (let i = 0; i <= N; i++) {
    const yn = (i / N) * DOME_YN_TOP
    const r = domeR(yn)
    const y = DOME.y0 + yn * DOME.hx
    rings.push(rectRing(DOME.hx * r, DOME.hz * r, y, 0, DOME.cz))
    ys.push(y)
    rs.push(r)
  }
  b.add('zincShingle', loft(rings, { capTop: true }))

  /* diamond shingle joints (drawn ~2× real size) */
  const c = 0.95
  for (let f = 0; f < 4; f++) {
    const C: THREE.Vector3[] = []
    const A: THREE.Vector3[] = []
    const W: number[] = []
    const vs: number[] = []
    let vAcc = 0
    for (let i = 0; i <= N; i++) {
      const a = rings[i][f]
      const d = rings[i][(f + 1) % 4]
      const cc = a.clone().add(d).multiplyScalar(0.5)
      if (i > 0) vAcc += cc.distanceTo(C[i - 1])
      C.push(cc)
      A.push(d.clone().sub(a).normalize())
      W.push(a.distanceTo(d) / 2 - 0.08)
      vs.push(vAcc)
    }
    const nOut = V().crossVectors(A[0], V(0, 1, 0)).normalize().negate()
    for (const sgn of [-1, 1]) {
      for (let k = -24; k <= 24; k++) {
        for (let i = 0; i < N; i++) {
          const u0 = sgn * vs[i] + k * c
          const u1 = sgn * vs[i + 1] + k * c
          if (Math.abs(u0) > W[i] || Math.abs(u1) > W[i + 1]) continue
          // outward offset follows the profile normal roughly (more outward near the base)
          const n0 = nOut.clone().multiplyScalar(0.03).add(V(0, 0.015, 0))
          const p0 = C[i].clone().addScaledVector(A[i], u0).add(n0)
          const p1 = C[i + 1].clone().addScaledVector(A[i + 1], u1).add(n0)
          b.beam('zincJoint', p0, p1, 0.05, 0.04, nOut)
        }
      }
    }
  }
  // corner hip rolls of the dome
  for (let f = 0; f < 4; f++) for (let i = 0; i < N; i++) b.beam('zincNatural', rings[i][f], rings[i + 1][f], 0.14, 0.12)

  /* square cap, finial and mast */
  const yT = ys[N]
  const r0 = rs[N] * DOME.hx * Math.SQRT2
  helm(b, 'zincNatural', {
    z: DOME.cz,
    n: 4,
    phase: Math.PI / 4,
    flat: true,
    stations: [
      [r0 + 0.25, yT - 0.05],
      [r0 + 0.25, yT + 0.1],
      [r0 - 0.05, yT + 0.25],
      [r0 - 0.15, yT + 0.75],
      [r0 + 0.05, yT + 0.85],
      [0.08, yT + 1.45],
    ],
  })
  b.rod('iron', V(0, yT + 1.4, DOME.cz), V(0, yT + 6.5, DOME.cz), 0.045, 6)
  b.add('iron', new THREE.SphereGeometry(0.16, 10, 8), mat(0, yT + 1.6, DOME.cz))

  /* clock tympanum under a zinc barrel hood */
  const cy = RIS.top - 0.1
  const tym = new THREE.Shape()
  tym.absarc(0, 0, HOOD_R - 0.05, 0, Math.PI, false)
  tym.lineTo(HOOD_R - 0.05, 0)
  b.add('plasterMuseum', extrude(tym, 3.2, 24), mat(0, cy, RIS.z + 0.05 - 3.2))
  const ann = new THREE.Shape()
  ann.absarc(0, 0, HOOD_R + 0.22, 0, Math.PI, false)
  ann.absarc(0, 0, HOOD_R - 0.02, Math.PI, 0, true)
  b.add('zincNatural', extrude(ann, 4.4, 24), mat(0, cy, RIS.z + 1.15 - 4.4))
  // ledge under the hood
  b.block('trim', 2 * HOOD_R + 0.5, 0.28, 1.15, 0, RIS.top - 0.28, RIS.z + 0.55)
  // majolica tympanum, voussoir ring, clock face
  b.add('majBlue', new THREE.CircleGeometry(HOOD_R - 0.5, 28, 0, Math.PI), mat(0, cy, RIS.z + 0.07))
  voussoirs(b, '+z', RIS.z + 0.04, 0, cy, HOOD_R - 0.5, HOOD_R - 0.12, 0, Math.PI, 9)
  b.add('white', new THREE.CylinderGeometry(0.62, 0.62, 0.08, 28), mat(0, cy + 0.15 + 0.62, RIS.z + 0.1, 0, Math.PI / 2))
  b.add('iron', new THREE.TorusGeometry(0.64, 0.05, 6, 28), mat(0, cy + 0.77, RIS.z + 0.15))
  b.beam('iron', V(0, cy + 0.77, RIS.z + 0.16), V(0.0, cy + 1.2, RIS.z + 0.16), 0.05, 0.02, V(0, 0, 1))
  b.beam('iron', V(0, cy + 0.77, RIS.z + 0.16), V(0.3, cy + 0.77, RIS.z + 0.16), 0.05, 0.02, V(0, 0, 1))
}

/* ---------------- build ---------------- */

function build(): Builder {
  const b = new Builder()

  /* ---------- masses ---------- */
  const blockPart = (w: number, h: number, d: number, x: number, z: number) => {
    b.block('plasterMuseum', w, h, d, x, 0, z)
    b.block('stoneGrey', w + 0.24, 1.6, d + 0.24, x, 0, z)
    b.block('trim', w + 0.16, 0.32, d + 0.16, x, 6.25, z) // belt course
    b.block('trim', w + 0.5, 0.28, d + 0.5, x, h - 0.75, z) // cornice
    b.block('trim', w + 0.8, 0.22, d + 0.8, x, h - 0.4, z)
  }
  for (const s of [-1, 1]) blockPart(2 * WING.hw, EAVE, 2 * WING.hz, s * WING.cx, 0)
  blockPart(2 * MAIN.x, EAVE, MAIN.zf - MAIN.zr, 0, (MAIN.zf + MAIN.zr) / 2)
  blockPart(2 * REAR.hw, EAVE, MAIN.zr - REAR.z + 0.3, 0, (MAIN.zr + REAR.z) / 2 + 0.15)
  // entrance risalit (slightly taller, majolica frieze)
  b.block('plasterMuseum', 2 * RIS.hw, RIS.top, RIS.z - MAIN.zf + 0.3, 0, 0, (RIS.z + MAIN.zf) / 2 - 0.15)
  b.block('stoneGrey', 2 * RIS.hw + 0.24, 1.6, RIS.z - MAIN.zf + 0.24, 0, 0, (RIS.z + MAIN.zf) / 2)
  b.block('majBlue', 2 * RIS.hw + 0.06, 0.95, RIS.z - MAIN.zf + 0.06, 0, 12.55, (RIS.z + MAIN.zf) / 2)
  b.block('trim', 2 * RIS.hw + 0.5, 0.3, RIS.z - MAIN.zf + 0.5, 0, RIS.top - 0.5, (RIS.z + MAIN.zf) / 2 + 0.25)
  b.block('trim', 2 * RIS.hw + 0.3, 0.3, RIS.z - MAIN.zf + 0.3, 0, 6.25, (RIS.z + MAIN.zf) / 2)
  // corner lesenes of the risalit
  for (const s of [-1, 1]) b.block('trim', 0.55, 10.9, 0.16, s * (RIS.hw - 0.28), 1.6, RIS.z + 0.08)

  /* ---------- main façade (+z) ---------- */
  const uBays = [7.15, 9.75, 12.35]
  for (const s of [-1, 1]) for (const u of uBays) bay(b, '+z', MAIN.zf, s * u)
  // risalit: portal, triple arched window with balcony, voussoir arch
  door(b, '+z', RIS.z, 0, { w: 2.5, h: 4.0, type: 'round', y0: 1.0, leafKey: 'doorWood', frameKey: 'trim', frame: 0.5 })
  voussoirs(b, '+z', RIS.z + 0.12, 0, 1.0 + 4.0 - 1.25, 1.75, 2.05, 0, Math.PI, 11)
  for (const u of [-1.45, 0, 1.45]) window_(b, '+z', RIS.z, u, 7.5, { type: 'round', w: 1.05, h: 2.95, glassKey: 'glassM', frameKey: 'white', frame: 0.09, bars: [2, 4] })
  voussoirs(b, '+z', RIS.z, 0, 6.6, 3.3, 3.75, 0.5, Math.PI - 0.5, 13)
  b.block('trim', 4.9, 0.25, 0.9, 0, 7.05, RIS.z + 0.45)
  b.block('trim', 4.9, 0.95, 0.12, 0, 7.3, RIS.z + 0.84)
  b.block('majBlue', 4.0, 0.55, 0.04, 0, 7.45, RIS.z + 0.92) // banner panel (no text)
  for (const s of [-1, 1]) {
    b.block('trim', 0.12, 0.95, 0.9, s * 2.39, 7.3, RIS.z + 0.45)
    // lanterns either side of the portal
    b.block('iron', 0.22, 0.4, 0.22, s * 2.2, 3.9, RIS.z + 0.35)
  }
  // entrance steps
  for (let i = 0; i < 6; i++) b.block('stoneGrey', 6.2 - i * 0.2, 1.0 - i * 0.167, 0.42, 0, 0, RIS.z + 2.55 - i * 0.4)
  b.block('stoneGrey', 6.2, 0.2, 2.6, 0, 0, RIS.z + 1.3)
  // risalit side windows
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+x' : '-x'
    const u = s > 0 ? -12.8 : 12.8
    window_(b, face, s * RIS.hw, u, 7.6, { w: 0.9, h: 2.4, glassKey: 'glassM', frameKey: 'white', frame: 0.08, bars: [1, 3] })
    window_(b, face, s * RIS.hw, u, 2.6, { w: 0.9, h: 2.4, type: 'round', glassKey: 'glassM', frameKey: 'white', frame: 0.08, bars: [1, 3] })
  }

  /* ---------- pavilions & wings ---------- */
  for (const s of [-1, 1]) {
    const cx = s * WING.cx
    // pavilion front (+z): arched window, balcony window
    gfWindow(b, '+z', WING.hz, cx, 1.7)
    ffWindow(b, '+z', WING.hz, cx, 1.55)
    b.block('trim', 2.3, 0.22, 0.75, cx, 7.0, WING.hz + 0.37)
    b.block('trim', 2.3, 0.9, 0.14, cx, 7.22, WING.hz + 0.68)
    for (const u of [-2.8, 2.8]) window_(b, '+z', WING.hz, cx + u, 7.6, { w: 0.75, h: 2.2, glassKey: 'glassM', frameKey: 'white', frame: 0.08, bars: [1, 3] })
    // pavilion inner side (facing the main façade's forecourt)
    const inner: Face = s > 0 ? '-x' : '+x'
    const innerPlane = s * (WING.cx - WING.hw)
    const uz = (z: number) => (s > 0 ? z : -z) // '-x' face: u = z ; '+x' face: u = -z
    bay(b, inner, innerPlane, uz(14.2))
    // rear wing inner side (towards the courtyard): 3 bays
    for (const z of [-15.0, -11.8, -8.6]) bay(b, inner, innerPlane, uz(z))
    // outer side elevation: 7 bays
    const outer: Face = s > 0 ? '+x' : '-x'
    const uo = (z: number) => (s > 0 ? -z : z)
    for (let i = 0; i < 7; i++) bay(b, outer, s * (WING.cx + WING.hw), uo(-14.4 + i * 4.8))
    // rear end (-z): 2 bays ('-z' face: u = -x)
    for (const dx of [-2.1, 2.1]) bay(b, '-z', -WING.hz, -(cx + dx))
  }

  /* ---------- main block rear & stair projection ---------- */
  for (const s of [-1, 1]) for (const x of [6.0, 8.7, 11.4]) bay(b, '-z', MAIN.zr, -s * x)
  for (const dx of [-2.0, 2.0]) bay(b, '-z', REAR.z, -dx)
  // tall stair window in the middle of the projection
  window_(b, '-z', REAR.z, 0, 4.2, { w: 1.2, h: 5.6, type: 'round', glassKey: 'glassM', frameKey: 'white', frame: 0.1, bars: [2, 6] })
  for (const s of [-1, 1]) bay(b, s > 0 ? '+x' : '-x', s * REAR.hw, s > 0 ? 9.4 : -9.4)

  /* ---------- roofs ---------- */
  // wings & pavilions: steep hipped tile roofs with zinc hip flashings
  for (const s of [-1, 1]) {
    hippedRoof(b, 'tileMuseum', { x: s * WING.cx, w: 2 * WING.hw, d: 2 * WING.hz, y: EAVE, pitch: 56, overhang: OH, seams: false, capKey: 'zincNatural', thickness: 0.15 })
    const ye = EAVE - OH * WING_T
    const xo = s * (WING.cx + WING.hw + OH)
    const xi = s * (WING.cx - WING.hw - OH)
    const zo = WING.hz + OH
    gutter(b, V(xo, ye, -zo), V(xo, ye, zo))
    gutter(b, V(xo, ye, zo), V(xi, ye, zo))
    gutter(b, V(xo, ye, -zo), V(xi, ye, -zo))
    gutter(b, V(xi, ye, zo), V(xi, ye, MAIN.zf + OH))
    gutter(b, V(xi, ye, -zo), V(xi, ye, MAIN.zr - OH))
  }
  // main block mansard: tile lower slopes, zinc upper roof
  {
    const xe = MAIN.x - OH // inner eave corner (valley start)
    const xr = WING.cx - 0.2 // ends buried in the wing roofs
    const yef = EAVE - OH * TF
    const yer = EAVE - OH * TR
    const zf = MAIN.zf + OH
    const zr = MAIN.zr - OH
    facet(b, 'tileMuseum', [V(-xe, yef, zf), V(xe, yef, zf), V(xr, CURB, ZF_CURB), V(-xr, CURB, ZF_CURB)], { thickness: 0.15 })
    facet(b, 'tileMuseum', [V(xe, yer, zr), V(-xe, yer, zr), V(-xr, CURB, ZR_CURB), V(xr, CURB, ZR_CURB)], { thickness: 0.15 })
    facet(b, 'zincNatural', [V(-xr, CURB, ZF_CURB), V(xr, CURB, ZF_CURB), V(xr, RIDGE, Z_RIDGE), V(-xr, RIDGE, Z_RIDGE)], { seams: SEAM, thickness: 0.1 })
    facet(b, 'zincNatural', [V(xr, CURB, ZR_CURB), V(-xr, CURB, ZR_CURB), V(-xr, RIDGE, Z_RIDGE), V(xr, RIDGE, Z_RIDGE)], { seams: SEAM, thickness: 0.1 })
    b.beam('zincNatural', V(-xr, RIDGE + 0.05, Z_RIDGE), V(xr, RIDGE + 0.05, Z_RIDGE), 0.3, 0.14)
    for (const zc of [ZF_CURB, ZR_CURB]) b.beam('zincNatural', V(-xr, CURB + 0.03, zc), V(xr, CURB + 0.03, zc), 0.22, 0.12)
    gutter(b, V(-xe, yef, zf), V(-RIS.hw - 1.0, yef, zf))
    gutter(b, V(RIS.hw + 1.0, yef, zf), V(xe, yef, zf))
    gutter(b, V(-xe, yer, zr), V(-REAR.hw - OH, yer, zr))
    gutter(b, V(REAR.hw + OH, yer, zr), V(xe, yer, zr))
  }
  // stair projection: hipped tile roof running into the main roof
  {
    const t = Math.tan(50 * D2R)
    const hw = REAR.hw + OH
    const ye = EAVE - OH * t
    const yr = ye + hw * t
    const zb = REAR.z - OH
    const zIn = 1.2
    facet(b, 'tileMuseum', [V(hw, ye, zb), V(hw, ye, zIn), V(0, yr, zIn), V(0, yr, zb + hw)], { thickness: 0.15 })
    facet(b, 'tileMuseum', [V(-hw, ye, zIn), V(-hw, ye, zb), V(0, yr, zb + hw), V(0, yr, zIn)], { thickness: 0.15 })
    facet(b, 'tileMuseum', [V(-hw, ye, zb), V(hw, ye, zb), V(0, yr, zb + hw)], { thickness: 0.15 })
    b.beam('zincNatural', V(0, yr + 0.05, zb + hw), V(0, yr + 0.05, zIn), 0.26, 0.14)
    b.beam('zincNatural', V(-hw, ye, zb), V(0, yr, zb + hw), 0.2, 0.12)
    b.beam('zincNatural', V(hw, ye, zb), V(0, yr, zb + hw), 0.2, 0.12)
    gutter(b, V(-hw, ye, zb), V(hw, ye, zb))
    for (const s of [-1, 1]) gutter(b, V(s * hw, ye, zb), V(s * hw, ye, MAIN.zr - OH))
  }

  domeAndSkirt(b)

  /* ---------- dormers ---------- */
  const pf = Math.atan(TF) / D2R
  for (const x of [-11.2, -8.5, 8.5, 11.2]) {
    const z = MAIN.zf - 0.9
    dormer(b, x, mainRoofY(z), z, '+z', pf)
  }
  const pr = Math.atan(TR) / D2R
  for (const x of [-11.5, -7.5, 7.5, 11.5]) {
    const z = MAIN.zr + 1.0
    dormer(b, x, mainRoofY(z), z, '-z', pr)
  }
  for (const s of [-1, 1]) {
    const outer: Face = s > 0 ? '+x' : '-x'
    const inner: Face = s > 0 ? '-x' : '+x'
    const xo = s * (WING.cx + WING.hw - 0.9)
    for (const z of [-11, -4, 3, 10]) dormer(b, xo, wingRoofY(xo, z), z, outer, 56)
    const xi = s * (WING.cx - WING.hw + 0.9)
    for (const z of [13.2, -14.5]) dormer(b, xi, wingRoofY(xi, z), z, inner, 56)
    // rear hip dormer
    dormer(b, s * WING.cx, wingRoofY(s * WING.cx, -WING.hz + 1.0), -WING.hz + 1.0, '-z', 56)
    // wall dormer on the pavilion front hip (window in a small hipped box)
    {
      const cx = s * WING.cx
      const zf = WING.hz - 0.35
      const w = 2.6
      const y0 = EAVE - 0.6
      const h = 2.3
      const depth = 2.6
      b.block('plasterMuseum', w, h, depth, cx, y0, zf - depth / 2)
      window_(b, '+z', zf, cx, y0 + 0.55, { w: 1.3, h: 1.35, glassKey: 'glassM', frameKey: 'white', frame: 0.08, bars: [2, 2] })
      hippedRoof(b, 'tileMuseum', { x: cx, z: zf - depth / 2 - 0.5, w, d: depth + 1.0, y: y0 + h, pitch: 50, overhang: 0.3, seams: false, capKey: 'zincNatural', thickness: 0.1 })
    }
  }

  /* ---------- chimneys ---------- */
  for (const s of [-1, 1]) {
    for (const x of [4.2, 10.5]) chimney(b, s * x, -1.1, mainRoofY(-1.1))
    chimney(b, s * 4.7, 4.9, mainRoofY(4.9))
    chimney(b, s * 12.6, 4.2, mainRoofY(4.2))
    for (const [x, z] of [
      [19.3, -11.8],
      [19.0, -7.2],
      [19.6, -0.5],
      [18.8, 6.0],
      [18.5, 12.2],
    ]) chimney(b, s * x, z, wingRoofY(s * x, z))
    chimney(b, s * 1.6, -7.8, EAVE + (REAR.hw + OH - 1.6) * Math.tan(50 * D2R) - OH * Math.tan(50 * D2R))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [0, 19, 8],
  materials: () => ({
    plasterMuseum: new THREE.MeshStandardMaterial({ color: '#e7eae8', roughness: 0.9 }),
    tileMuseum: new THREE.MeshStandardMaterial({ color: '#c4633b', roughness: 0.8 }),
    majBlue: new THREE.MeshStandardMaterial({ color: '#2f6e8c', roughness: 0.45, metalness: 0.05 }),
    majYellow: new THREE.MeshStandardMaterial({ color: '#d9c64e', roughness: 0.55 }),
    majGreen: new THREE.MeshStandardMaterial({ color: '#9fb94a', roughness: 0.55 }),
    zincShingle: new THREE.MeshStandardMaterial({ color: '#a9b0b4', metalness: 0.8, roughness: 0.42, envMapIntensity: 1.1 }),
    zincJoint: new THREE.MeshStandardMaterial({ color: '#868d92', metalness: 0.75, roughness: 0.45 }),
    doorWood: new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.6 }),
  }),
  notes: 'H-shaped former Administrative Palace; natural titanium-zinc on the dome (diamond shingles), skirt, upper main roof and flashings; tile lower slopes and wing roofs. Heights and rear/side window counts estimated from drone photographs.',
}
export default model
