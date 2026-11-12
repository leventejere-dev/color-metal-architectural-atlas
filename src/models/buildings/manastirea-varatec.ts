/**
 * Mănăstirea Văratec – main church „Adormirea Maicii Domnului” (early 19th c.),
 * Văratec, com. Agapia, jud. Neamț; OSM way 267206319 (32.6 × 17.3 m).
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = OSM
 * long axis 70.5° towards the rounded altar end (ENE), +Z = south), from the
 * photographs 01–03 (south-east side, 2006–2009); photo 04 shows the cells and
 * gate building of the precinct and is used for context only:
 *  - White rendered body 26.3 × 12 m on a ≈ 1.2 m stone plinth, walls ≈ 9 m,
 *    closed by a semicircular altar apse as wide as the body; a row of shallow
 *    panels under the eave, arched windows with moulded (trefoil-headed) frames.
 *  - Semicircular lateral apses (r ≈ 3.4 m) with their own lower flared conical
 *    roofs carrying double-bulb finials and crosses; a small round side porch
 *    with a bell roof near the west end of the south wall; two brick chimneys.
 *  - Low hipped roof with ≈ 1.2 m bracketed eaves, rounded over the apse.
 *  - Two towers on the axis (pronaos and naos): octagonal lower stage, round
 *    drum with small windows, painted frieze, wide bracketed eave and a tall
 *    bell-shaped cap with stacked bulbs and a gilded cross.
 *  - Metal: COLOR METAL supplied natural titanium-zinc (elZinc Natural) in 2023
 *    according to its records; the photographs predate the works, so all church
 *    roofs, apse cones, tower caps and finials are shown in natural titanium-zinc
 *    with standing seams ≈ 0.5 m. The recorded quantity is larger than this roof,
 *    so other precinct buildings (e.g. the cells and gate building) were probably
 *    roofed as well; only the main church is modelled.
 * Approximations: no published dimensions; the OSM outline is a coarse rectangle
 * with a rounded end, so the lateral apses are placed from the photographs;
 * heights scaled from photos 01/02 (walls ≈ 9 m, naos tower cross ≈ 25 m); the
 * north side and the west front (not photographed) are mirrored / interpreted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const UP = V(0, 1, 0)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const ZN = 'zincNatural'
const WALL = 'plasterWhite'
const STONE = 'stoneWarm'
const WOOD = 'timber'

const X0 = -16.0
const XA = 10.3 // apse centre
const HW = 6.0
const H = 9.0
const OV = 1.2
const LATX = 2.5
const LATR = 3.4
const TN = 2.5 // naos tower
const TP = -7.5 // pronaos tower

function seamedLoft(b: Builder, key: string, rings: THREE.Vector3[][], spacing = 0.5) {
  const sp = { key, spacing, h: 0.035, w: 0.04 }
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i]
    const B = rings[i + 1]
    for (let k = 0; k < A.length; k++) {
      const k1 = (k + 1) % A.length
      const q = [A[k], A[k1], B[k1], B[k]]
      const pts = q.filter((p, j) => p.distanceTo(q[(j + 1) % 4]) > 1e-4)
      if (pts.length >= 3) facet(b, key, pts, { seams: sp })
    }
  }
}
function faceM(cx: number, cz: number, nx: number, nz: number) {
  const n = V(nx, 0, nz).normalize()
  return new THREE.Matrix4().makeBasis(V().crossVectors(UP, n), UP, n).setPosition(cx, 0, cz)
}
function archPts(w: number, h: number, y0: number, seg = 6, u = 0) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(u - hw, y0), new THREE.Vector2(u + hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(u + Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
/** Window with a moulded white frame (ornate arched head) and brown joinery. */
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, ornate = true) {
  b.add('glassC', metricBox(w, h, 0.04), M(m, mat(u, y0 + h / 2, 0.02)))
  b.add('wood', metricBox(w + 0.12, 0.1, 0.06), M(m, mat(u, y0 + h * 0.62, 0.05)))
  b.add('wood', metricBox(0.08, h, 0.06), M(m, mat(u, y0 + h / 2, 0.05)))
  for (const s of [-1, 1]) b.add('wood', metricBox(0.08, h, 0.06), M(m, mat(u + (s * w) / 2, y0 + h / 2, 0.05)))
  if (ornate) {
    const f = 0.22
    const s = new THREE.Shape(archPts(w + 2 * f + 0.2, h + w * 0.9 + f, y0 - f, 8, u))
    s.holes.push(new THREE.Path([new THREE.Vector2(u - w / 2, y0), new THREE.Vector2(u + w / 2, y0), new THREE.Vector2(u + w / 2, y0 + h), new THREE.Vector2(u - w / 2, y0 + h)]))
    b.add('varTrim', extrude(s, 0.12, 8), M(m, mat(0, 0, 0.01)))
    // trefoil hint in the arched head
    b.add('varShade', new THREE.CircleGeometry(w * 0.32, 12), M(m, mat(u, y0 + h + w * 0.42, 0.14)))
  } else {
    b.add('varTrim', metricBox(w + 0.3, 0.12, 0.2), M(m, mat(u, y0 - 0.1, 0.08)))
  }
  b.add(STONE, metricBox(w + 0.5, 0.1, 0.3), M(m, mat(u, y0 - 0.25, 0.12)))
}
/** Plan ring: straight hipped west end at xW, semicircular east end centred at xE; offset r. */
function hullRing(xW: number, xE: number, r: number, y: number, seg = 14) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * Math.PI
    pts.push(V(xE + r * Math.cos(a), y, r * Math.sin(a)))
  }
  pts.push(V(xW - r, y, r))
  pts.push(V(xW - r, y, -r))
  return pts
}
function bell(r0: number, y0: number, finalDeg: number, rTop: number, flare: P2[]): P2[] {
  const out: P2[] = [[r0, y0]]
  let r = r0
  let y = y0
  for (const [du, deg] of flare) {
    r -= du
    y += du * Math.tan(deg * D2R)
    out.push([r, y])
  }
  out.push([rTop, y + (r - rTop) * Math.tan(finalDeg * D2R)])
  return out
}
/** Ring of small eave brackets under a round / straight eave. */
function bracketsRound(b: Builder, cx: number, cz: number, r0: number, r1: number, y: number, n: number, a0 = 0, a1 = Math.PI * 2) {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n
    const c = Math.cos(a)
    const s = Math.sin(a)
    b.beam(WOOD, V(cx + c * r0, y - 0.05, cz + s * r0), V(cx + c * r1, y - 0.05, cz + s * r1), 0.12, 0.16)
  }
}
/** Stacked bulbs + cross finial. */
function finial(b: Builder, x: number, y: number, z: number, s: number, crossKey = 'gilt') {
  const prof: P2[] = [
    [0.06, 0],
    [0.22, 0.12],
    [0.3, 0.32],
    [0.18, 0.55],
    [0.07, 0.68],
    [0.16, 0.8],
    [0.36, 1.05],
    [0.34, 1.3],
    [0.12, 1.55],
    [0.04, 1.7],
  ]
  b.add(ZN, lathe(prof.map(([r, yy]) => [r * s, yy * s]), 14), mat(x, y, z))
  cross(b, crossKey, x, y + 1.62 * s, z, 1.3 * s, false, Math.PI / 2)
}
/** Tower: octagonal stage, round drum, frieze, bracketed eave, bell cap, finial. */
function tower(b: Builder, x: number, o: { y0: number; yo: number; yd: number; R: number; capH: number; s: number }) {
  const ph = Math.PI / 8
  const Ro = o.R + 0.35
  b.add(WALL, loft([polyRing(8, Ro, o.y0, ph, x, 0), polyRing(8, Ro, o.yo, ph, x, 0)], { capTop: true, flat: true }))
  b.add('varShade', loft([polyRing(8, Ro + 0.02, o.yo - 0.25, ph, x, 0), polyRing(8, Ro + 0.02, o.yo, ph, x, 0)], { flat: true }))
  b.add(WALL, loft([polyRing(32, o.R, o.yo, 0, x, 0), polyRing(32, o.R, o.yd, 0, x, 0)], { capTop: true }))
  b.add('varFrieze', loft([polyRing(32, o.R + 0.02, o.yd - 0.75, 0, x, 0), polyRing(32, o.R + 0.02, o.yd - 0.15, 0, x, 0)]))
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const m = faceM(x + Math.cos(a) * o.R, Math.sin(a) * o.R, Math.cos(a), Math.sin(a))
    b.add('glassC', metricBox(0.42, 0.95, 0.06), M(m, mat(0, o.yd - 2.2, 0.0)))
    b.add('varTrim', metricBox(0.6, 1.12, 0.03), M(m, mat(0, o.yd - 2.2, -0.02)))
  }
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const m = faceM(x + Math.cos(a) * Ro * Math.cos(ph), Math.sin(a) * Ro * Math.cos(ph), Math.cos(a), Math.sin(a))
    b.add('glassC', metricBox(0.4, 0.9, 0.05), M(m, mat(0, o.yo - 1.5, 0.02)))
  }
  // wide bracketed eave
  const re = o.R + 1.15
  const ye = o.yd + 0.05
  bracketsRound(b, x, 0, o.R, re - 0.1, ye, 28)
  b.add(WOOD, loft([polyRing(32, o.R, o.yd - 0.05, 0, x, 0), polyRing(32, re - 0.05, ye - 0.05, 0, x, 0)]))
  b.add(ZN, loft([polyRing(32, re, ye - 0.05, 0, x, 0), polyRing(32, re, ye + 0.12, 0, x, 0)]))
  // flared skirt + tall bell cap
  const cap: P2[] = [[re, ye + 0.12]]
  const r1 = o.R - 0.05
  cap.push([o.R + 0.45, ye + 0.42])
  cap.push([r1, ye + 0.75])
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    cap.push([Math.max(0.12, r1 * (1 - t ** 2.4) ** 0.5), ye + 0.75 + o.capH * t])
  }
  b.add(ZN, lathe(cap, 32), mat(x, 0, 0))
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2
    for (let i = 2; i < cap.length - 2; i++) {
      const [ra, ya] = cap[i]
      const [rb, yb] = cap[i + 1]
      b.beam(ZN, V(x + Math.cos(a) * (ra + 0.02), ya, Math.sin(a) * (ra + 0.02)), V(x + Math.cos(a) * (rb + 0.02), yb, Math.sin(a) * (rb + 0.02)), 0.05, 0.04, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  finial(b, x, ye + 0.75 + o.capH - 0.05, 0, o.s)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bl = XA - X0
  b.block(WALL, bl, H, HW * 2, (X0 + XA) / 2, 0, 0)
  b.block(STONE, bl + 0.3, 1.2, HW * 2 + 0.3, (X0 + XA) / 2, 0, 0)
  const half = (r: number, y: number, n = 16) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI
      pts.push(V(XA + r * Math.cos(a), y, r * Math.sin(a)))
    }
    return pts
  }
  b.add(WALL, loft([half(HW, 0), half(HW, H)], { capTop: true }))
  b.add(STONE, loft([half(HW + 0.15, 0), half(HW + 0.15, 1.2)], { capTop: true }))
  // lateral apses
  for (const sz of [-1, 1]) {
    const cz = sz * HW
    b.add(WALL, loft([polyRing(24, LATR, 0, 0, LATX, cz), polyRing(24, LATR, 6.6, 0, LATX, cz)], { capTop: true }))
    b.add(STONE, loft([polyRing(24, LATR + 0.15, 0, 0, LATX, cz), polyRing(24, LATR + 0.15, 1.2, 0, LATX, cz)], { capTop: true }))
    for (const da of [-50, 0, 50]) {
      const a = (sz * 90 + da) * D2R
      win(b, faceM(LATX + Math.cos(a) * LATR, cz + Math.sin(a) * LATR, Math.cos(a), Math.sin(a)), 0, 2.6, 0.75, 1.3, false)
    }
    // flared conical roof with double-bulb finial
    const st = bell(LATR + 1.0, 6.45, 40, 0.15, [
      [0.5, 14],
      [0.5, 28],
    ])
    seamedLoft(b, ZN, st.map(([r, y]) => polyRing(24, r, y, 0, LATX, cz)), 0.45)
    b.add(WOOD, loft([polyRing(24, LATR, 6.6, 0, LATX, cz), polyRing(24, LATR + 0.95, 6.35, 0, LATX, cz)]))
    bracketsRound(b, LATX, cz, LATR, LATR + 0.9, 6.45, 16, sz > 0 ? 0 : Math.PI, sz > 0 ? Math.PI : Math.PI * 2)
    finial(b, LATX, st[st.length - 1][1] - 0.05, cz, 0.9)
  }

  /* ================= façades ================= */
  // row of shallow panels under the eave
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * HW, 0, sz)
    for (let x = X0 + 0.9; x < XA - 0.2; x += 1.25) {
      if (Math.abs(x - LATX) < LATR + 0.3) continue
      b.add('varShade', metricBox(0.8, 0.95, 0.02), M(m, mat(sz * x, H - 0.85, 0.0)))
    }
    for (const x of [-12.8, -5.8, 7.4]) win(b, m, sz * x, 3.2, 0.8, 1.7)
  }
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 18) * Math.PI
    const m = faceM(XA + Math.cos(a) * HW, Math.sin(a) * HW, Math.cos(a), Math.sin(a))
    b.add('varShade', metricBox(0.8, 0.95, 0.04), M(m, mat(0, H - 0.85, 0.0)))
  }
  for (const da of [-40, 40]) {
    const a = da * D2R
    win(b, faceM(XA + Math.cos(a) * HW, Math.sin(a) * HW, Math.cos(a), Math.sin(a)), 0, 3.6, 0.85, 1.7)
  }
  {
    const m = faceM(X0, 0, -1, 0)
    b.add('wood', metricBox(1.6, 2.8, 0.06), M(m, mat(0, 1.2 + 1.4, 0.03)))
    b.add('varTrim', metricBox(2.3, 3.3, 0.04), M(m, mat(0, 1.2 + 1.55, 0.01)))
    for (const u of [-3.4, 3.4]) win(b, m, u, 3.4, 0.8, 1.7)
    for (let u = -HW + 0.8; u < HW - 0.3; u += 1.25) b.add('varShade', metricBox(0.8, 0.95, 0.02), M(m, mat(u, H - 0.85, 0.0)))
  }
  // small round side porch (south, near the west end)
  {
    const px = -12.0
    const pz = HW + 1.2
    const pr = 2.0
    b.add(WALL, loft([polyRing(24, pr, 0, 0, px, pz), polyRing(24, pr, 3.4, 0, px, pz)], { capTop: true }))
    b.add(STONE, loft([polyRing(24, pr + 0.1, 0, 0, px, pz), polyRing(24, pr + 0.1, 0.6, 0, px, pz)], { capTop: true }))
    const md = faceM(px - pr * 0.7, pz + pr * 0.7, -0.7, 0.7)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(archPts(1.0, 2.2, 0.6, 8))), M(md, mat(0, 0, 0.06)))
    const mw = faceM(px + pr * 0.7, pz + pr * 0.7, 0.7, 0.7)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(0.45, 1.0, 1.6, 6))), M(mw, mat(0, 0, 0.06)))
    const st = bell(pr + 0.85, 3.3, 0, 0.1, [
      [0.45, 12],
      [0.3, 30],
    ])
    st.pop()
    const yb = st[st.length - 1][1]
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      st.push([Math.max(0.1, (pr + 0.1) * Math.cos((t * Math.PI) / 2) ** 0.6), yb + 1.9 * Math.sin((t * Math.PI) / 2)])
    }
    b.add(ZN, lathe(st, 28), mat(px, 0, pz))
    b.add(WOOD, loft([polyRing(24, pr, 3.4, 0, px, pz), polyRing(24, pr + 0.8, 3.2, 0, px, pz)]))
    finial(b, px, yb + 1.85, pz, 0.7)
  }

  /* ================= main roof ================= */
  {
    const r0 = HW + OV
    const ye = H - 0.25
    const st = bell(r0, ye, 26, 0, [[0.6, 14]])
    const xW = X0 + HW
    seamedLoft(b, ZN, st.map(([r, y]) => hullRing(xW, XA, r, y)))
    b.add(ZN, loft([hullRing(xW, XA, r0, ye - 0.16), hullRing(xW, XA, r0, ye)]))
    b.add(WOOD, loft([hullRing(xW, XA, HW, H), hullRing(xW, XA, r0 - 0.02, ye - 0.16)]))
    const ridge = st[st.length - 1][1]
    b.beam(ZN, V(xW, ridge + 0.04, 0), V(XA, ridge + 0.04, 0), 0.2, 0.1)
    // eave brackets
    for (const sz of [-1, 1]) for (let x = X0 + 0.3; x <= XA; x += 0.8) b.beam(WOOD, V(x, H - 0.25, sz * HW), V(x, H - 0.35, sz * (r0 - 0.15)), 0.12, 0.16)
    for (let z = -HW + 0.3; z <= HW; z += 0.8) b.beam(WOOD, V(X0, H - 0.25, z), V(X0 - OV + 0.15, H - 0.35, z), 0.12, 0.16)
    bracketsRound(b, XA, 0, HW, r0 - 0.15, H - 0.25, 22, -Math.PI / 2, Math.PI / 2)
    finial(b, XA, ridge - 0.1, 0, 1.0)
    // brick chimneys on the south slope
    for (const x of [-10.2, -4.4]) {
      const zc = 3.6
      const yRoof = ye + (r0 - zc) * Math.tan(26 * D2R)
      b.block('brickRed', 0.6, ridge + 0.6 - yRoof + 0.4, 0.6, x, yRoof - 0.4, zc)
      b.block('brickRed', 0.8, 0.15, 0.8, x, ridge + 0.6, zc)
    }
  }

  /* ================= towers ================= */
  tower(b, TN, { y0: 10.0, yo: 14.9, yd: 18.4, R: 2.2, capH: 3.7, s: 1.15 })
  tower(b, TP, { y0: 10.0, yo: 14.5, yd: 17.8, R: 2.0, capH: 3.4, s: 1.05 })

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [6, 10.5, 4],
  materials: () => ({
    varTrim: new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.85 }),
    varShade: new THREE.MeshStandardMaterial({ color: '#e1ded6', roughness: 0.92 }),
    varFrieze: new THREE.MeshStandardMaterial({ color: '#a8624c', roughness: 0.8 }),
  }),
  notes: 'White church with rounded altar end, lateral apses with their own cones and two bell-capped towers; heights scaled from photographs; roofs shown in natural titanium-zinc (elZinc Natural) supplied by COLOR METAL in 2023, as the photographs predate the works.',
}
export default model
