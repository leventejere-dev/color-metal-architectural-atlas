/**
 * Mănăstirea Almaș – main church, Almaș, com. Gârcina, jud. Neamț;
 * OSM way 688423052 (29.9 × 16.2 m).
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = OSM
 * long axis 92.4° towards the altar (east), +Z = south), from photographs 01–03
 * (south and south-east sides, October 2020); photo 04 shows the gate tower and
 * a cells building and is used for context only:
 *  - White rendered church on a rubble-stone plinth: low west narthex
 *    (5.4 × 7.2 m, eave ≈ 6.5 m), main body 24.6 × 12 m (walls ≈ 10 m) divided
 *    into bays by flat pilasters, with an ornamental band at ≈ 7 m and a dentil
 *    frieze under the eave; lower annexes (≈ 6.4 × 2.6 m) against both sides of
 *    the east end, as the wider east part of the OSM outline shows; round-arched
 *    windows with stone surrounds.
 *  - Hipped roofs with bracketed eaves (≈ 1.1 m) and a slight bell cast; pyramid
 *    roofs with a ball-and-cross finial on the annexes.
 *  - Three slim octagonal drums on the ridge (x ≈ −3.2, 2.2 and 8.5 m, the
 *    middle one tallest), each with a flared eave and a two-tier onion cap
 *    (lower bulb, neck with a small eave, upper bulb, ball and cross).
 *  - Metal: COLOR METAL supplied copper sheet in 2023 according to its records,
 *    without naming the surfaces; the 2020 photographs predate the works (they
 *    show brown roofs and caps), so all church roofs, drum eaves and onion caps
 *    are shown in new copper with standing seams ≈ 0.5 m.
 * Approximations: no published dimensions; heights scaled from photos 01/02
 * (walls ≈ 10 m, middle drum cross ≈ 29 m); tower positions measured on photos
 * 01 and 02; the north side and the west front are not photographed and are
 * interpreted (north mirrored from south).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const UP = V(0, 1, 0)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'copperNew'
const WALL = 'plasterWhite'
const STONE = 'stoneWarm'
const WOOD = 'timber'

const BX0 = -9.6
const BX1 = 15.0
const HW = 6.0
const H = 10.0
const OV = 1.1
const NAR = { x0: -15.0, z: -0.6, hw: 3.6, h: 6.5 }
const ANX = { x0: 8.6, x1: 15.0, d: 2.6, h: 6.6 }

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
function archPts(w: number, h: number, y0: number, seg = 8, u = 0) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(u - hw, y0), new THREE.Vector2(u + hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(u + Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  const f = 0.24
  const s = new THREE.Shape(archPts(w + 2 * f, h + f, y0 - f, 8, u))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 8, u)))
  b.add('almasTrim', extrude(s, 0.1, 8), M(m, mat(0, 0, 0.01)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 8, u))), M(m, mat(0, 0, 0.02)))
  const g = new THREE.Shape(archPts(w - 0.04, h - 0.02, y0, 8, u))
  g.holes.push(new THREE.Path(archPts(w - 0.2, h - 0.12, y0 + 0.08, 8, u)))
  b.add('wood', extrude(g, 0.05, 8), M(m, mat(0, 0, 0.02)))
  b.add('wood', metricBox(0.07, h - w / 2, 0.05), M(m, mat(u, y0 + (h - w / 2) / 2, 0.05)))
}
/** Dentil frieze + ornamental band + pilasters along a straight wall. */
function wallDecor(b: Builder, m: THREE.Matrix4, u0: number, u1: number, h: number, pil: number[], band = 7.0) {
  const L = u1 - u0
  const uc = (u0 + u1) / 2
  b.add('almasTrim', metricBox(L, 0.42, 0.08), M(m, mat(uc, band, 0.04)))
  b.add('almasShade', metricBox(L, 0.16, 0.1), M(m, mat(uc, band, 0.05)))
  b.add('almasTrim', metricBox(L, 0.2, 0.14), M(m, mat(uc, h - 0.85, 0.07)))
  const n = Math.max(1, Math.round(L / 0.55))
  for (let i = 0; i < n; i++) b.add('almasTrim', metricBox(0.26, 0.32, 0.14), M(m, mat(u0 + (L * (i + 0.5)) / n, h - 0.6, 0.07)))
  for (const u of pil) b.add(WALL, metricBox(0.7, h - 1.0, 0.18), M(m, mat(u, (h - 1.0) / 2 + 0.6, 0.09)))
}
/** Hipped roof over a rectangle with flared eave (stations). */
function hip(b: Builder, cx: number, cz: number, hx: number, hz: number, y: number, pitch: number, ov: number, flare = 0.5) {
  const t = Math.tan(pitch * D2R)
  const a = hx + ov
  const c = hz + ov
  const y0 = y - 0.2
  const y1 = y0 + flare * Math.tan(16 * D2R)
  const a1 = a - flare
  const c1 = c - flare
  const rise = c1 * t
  const rings = [rectRing(a, c, y0, cx, cz), rectRing(a1, c1, y1, cx, cz), rectRing(Math.max(0.03, a1 - c1), 0.03, y1 + rise, cx, cz)]
  seamedLoft(b, CU, rings)
  b.add(WOOD, loft([rectRing(hx, hz, y, cx, cz), rectRing(a - 0.02, c - 0.02, y0 - 0.12, cx, cz)]))
  // eave brackets
  for (let x = cx - hx + 0.3; x <= cx + hx; x += 0.75) for (const s of [-1, 1]) b.beam(WOOD, V(x, y - 0.25, cz + s * hz), V(x, y - 0.35, cz + s * (c - 0.15)), 0.1, 0.14)
  for (let z = cz - hz + 0.3; z <= cz + hz; z += 0.75) for (const s of [-1, 1]) b.beam(WOOD, V(cx + s * hx, y - 0.25, z), V(cx + s * (a - 0.15), y - 0.35, z), 0.1, 0.14)
  return y1 + rise
}
/** Slim octagonal drum with flared eave and two-tier onion cap. */
function drum(b: Builder, x: number, y0: number, y1: number, R: number, s: number) {
  const ph = Math.PI / 8
  b.add(WALL, loft([polyRing(8, R, y0, ph, x, 0), polyRing(8, R, y1, ph, x, 0)], { capTop: true, flat: true }))
  b.add('almasTrim', loft([polyRing(8, R + 0.06, y1 - 0.5, ph, x, 0), polyRing(8, R + 0.06, y1 - 0.2, ph, x, 0)], { flat: true }))
  for (let k = 0; k < 8; k += 2) {
    const a = (k * Math.PI) / 4
    const ap = R * Math.cos(Math.PI / 8)
    const m = faceM(x + Math.cos(a) * ap, Math.sin(a) * ap, Math.cos(a), Math.sin(a))
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(0.4 * s, 1.1 * s, y1 - 2.4 * s, 6))), M(m, mat(0, 0, 0.02)))
  }
  // flared eave (octagonal)
  const re = R + 0.75 * s
  seamedLoft(b, CU, [polyRing(8, re, y1 - 0.05, ph, x, 0), polyRing(8, re - 0.35 * s, y1 + 0.18 * s, ph, x, 0), polyRing(8, R * 0.92, y1 + 0.45 * s, ph, x, 0)], 0.4)
  b.add(WOOD, loft([polyRing(8, R, y1 - 0.02, ph, x, 0), polyRing(8, re - 0.02, y1 - 0.18, ph, x, 0)]))
  b.add(CU, loft([polyRing(8, re, y1 - 0.2, ph, x, 0), polyRing(8, re, y1 - 0.05, ph, x, 0)]))
  // two-tier onion (octagonal facets, like the photographed caps)
  const u = R * 0.92
  const st: P2[] = [
    [u * 0.95, y1 + 0.4 * s],
    [u * 1.18, y1 + 0.9 * s],
    [u * 1.2, y1 + 1.4 * s],
    [u * 1.02, y1 + 1.9 * s],
    [u * 0.62, y1 + 2.3 * s],
    [u * 0.42, y1 + 2.4 * s],
  ]
  const yN = y1 + 2.4 * s
  const st2: P2[] = [
    [u * 0.42, yN],
    [u * 0.42, yN + 0.55 * s],
    [u * 0.75, yN + 0.55 * s],
    [u * 0.55, yN + 0.75 * s],
    [u * 0.6, yN + 1.1 * s],
    [u * 0.55, yN + 1.45 * s],
    [u * 0.3, yN + 1.75 * s],
    [u * 0.12, yN + 1.9 * s],
  ]
  b.add(CU, loft(st.map(([r, y]) => polyRing(8, r, y, ph, x, 0)), { flat: false }))
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4
    for (let i = 0; i < st.length - 1; i++) b.beam(CU, V(x + Math.cos(a) * st[i][0], st[i][1], Math.sin(a) * st[i][0]), V(x + Math.cos(a) * st[i + 1][0], st[i + 1][1], Math.sin(a) * st[i + 1][0]), 0.06, 0.05, V(Math.cos(a), 0, Math.sin(a)))
  }
  // horizontal shingle courses on the lower bulb
  for (const f of [0.35, 0.55, 0.75]) {
    const i = Math.floor(f * (st.length - 1))
    const tt = f * (st.length - 1) - i
    const r = st[i][0] + (st[i + 1][0] - st[i][0]) * tt
    const y = st[i][1] + (st[i + 1][1] - st[i][1]) * tt
    b.add(CU, loft([polyRing(8, r + 0.03, y - 0.03, ph, x, 0), polyRing(8, r + 0.03, y + 0.03, ph, x, 0)], { flat: true }))
  }
  b.add(CU, loft(st2.map(([r, y]) => polyRing(8, r, y, ph, x, 0)), { capTop: true }))
  b.add(CU, new THREE.SphereGeometry(0.2 * s, 10, 8), mat(x, yN + 2.0 * s, 0))
  cross(b, 'iron', x, yN + 2.05 * s, 0, 2.0 * s, false, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bc = (BX0 + BX1) / 2
  const bl = BX1 - BX0
  b.block(WALL, bl, H, HW * 2, bc, 0, 0)
  b.block(STONE, bl + 0.3, 0.9, HW * 2 + 0.3, bc, 0, 0)
  // wider eastern half (pilaster step)
  b.block(WALL, BX1 - 0.4, H, HW * 2 + 0.4, (BX1 + 0.4) / 2, 0, 0)
  // narthex
  const nc = (NAR.x0 + BX0) / 2
  b.block(WALL, BX0 - NAR.x0, NAR.h, NAR.hw * 2, nc, 0, NAR.z)
  b.block(STONE, BX0 - NAR.x0 + 0.3, 0.9, NAR.hw * 2 + 0.3, nc, 0, NAR.z)
  // east annexes
  const ac = (ANX.x0 + ANX.x1) / 2
  for (const sz of [-1, 1]) {
    const zc = sz * (HW + ANX.d / 2)
    b.block(WALL, ANX.x1 - ANX.x0, ANX.h, ANX.d + 0.4, ac, 0, zc - sz * 0.2)
    b.block(STONE, ANX.x1 - ANX.x0 + 0.3, 0.9, ANX.d + 0.7, ac, 0, zc - sz * 0.2)
  }

  /* ================= façades ================= */
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * (HW + 0.2), 0, sz)
    const s = sz
    wallDecor(b, m, Math.min(s * BX0, s * ANX.x0), Math.max(s * BX0, s * ANX.x0), H, [s * -5.6, s * 0.4, s * 5.0])
    for (const x of [-7.4, -5.0, 1.6, 3.7, 6.6]) win(b, m, s * x, 2.4, 0.85, 1.75)
    for (const x of [-2.0]) win(b, m, s * x, 6.1, 0.75, 1.5)
    // annex outer face
    const ma = faceM(ac, sz * (HW + ANX.d), 0, sz)
    wallDecor(b, ma, -(ANX.x1 - ANX.x0) / 2, (ANX.x1 - ANX.x0) / 2, ANX.h, [], 4.6)
    for (const u of [-1.4, 1.4]) win(b, ma, u, 2.2, 0.85, 1.75)
    // narthex
    const mn = faceM(nc, NAR.z + sz * NAR.hw, 0, sz)
    win(b, mn, 0, 2.4, 0.75, 1.6)
  }
  {
    const me = faceM(BX1, 0, 1, 0)
    wallDecor(b, me, -HW - 0.2, HW + 0.2, H, [])
    win(b, me, 0, 3.0, 0.9, 1.9)
    // emblem triangle on the east gable wall
    const tri = new THREE.Shape([new THREE.Vector2(-0.9, 7.9), new THREE.Vector2(0.9, 7.9), new THREE.Vector2(0, 9.0)])
    b.add('almasShade', extrude(tri, 0.06, 1), me)
    for (const sz of [-1, 1]) {
      const mae = faceM(BX1, sz * (HW + ANX.d / 2), 1, 0)
      win(b, mae, 0, 2.4, 0.7, 1.6)
    }
    const mw = faceM(NAR.x0, NAR.z, -1, 0)
    b.add('wood', metricBox(1.5, 2.6, 0.06), M(mw, mat(0, 0.9 + 1.3, 0.03)))
    b.add('almasTrim', metricBox(2.1, 3.1, 0.04), M(mw, mat(0, 0.9 + 1.45, 0.01)))
    wallDecor(b, mw, -NAR.hw, NAR.hw, NAR.h, [], 4.6)
    const mbw = faceM(BX0, 0, -1, 0)
    for (const u of [-4.8, 4.8]) win(b, mbw, u, 6.0, 0.75, 1.5)
  }

  /* ================= roofs ================= */
  const ridge = hip(b, (BX0 + BX1) / 2, 0, bl / 2, HW + 0.2, H, 28, OV, 0.55)
  hip(b, nc - 0.3, NAR.z, (BX0 - NAR.x0) / 2 + 0.3, NAR.hw, NAR.h, 32, 0.9, 0.4)
  for (const sz of [-1, 1]) {
    const zc = sz * (HW + ANX.d / 2 + 0.2)
    const top = hip(b, ac, zc, (ANX.x1 - ANX.x0) / 2, ANX.d / 2 + 0.6, ANX.h, 30, 0.9, 0.4)
    b.add(CU, new THREE.SphereGeometry(0.32, 12, 8), mat(ac, top + 0.25, zc))
    cross(b, 'iron', ac, top + 0.35, zc, 1.4, false, Math.PI / 2)
  }
  // small roof vent (photo 01)
  {
    const x = 4.0
    const z = 3.0
    const yR = H - 0.2 + (HW + 0.2 + OV - 0.55 - z) * Math.tan(28 * D2R) + 0.15
    b.block(CU, 1.0, 0.5, 0.8, x, yR, z)
    b.block(CU, 1.2, 0.08, 1.0, x, yR + 0.5, z)
  }

  /* ================= drums ================= */
  drum(b, -3.2, ridge - 1.0, 18.2, 1.55, 0.95)
  drum(b, 2.2, ridge - 1.0, 20.8, 1.8, 1.15)
  drum(b, 8.5, ridge - 1.0, 19.9, 1.8, 1.05)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [2.2, 22, 0],
  materials: () => ({
    almasTrim: new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.85 }),
    almasShade: new THREE.MeshStandardMaterial({ color: '#dcd8cf', roughness: 0.92 }),
  }),
  notes: 'White church with a low narthex, east annexes and three slim drums with two-tier onion caps; heights scaled from photographs; roofs and caps shown in new copper supplied by COLOR METAL in 2023, as the 2020 photographs predate the works.',
}
export default model
