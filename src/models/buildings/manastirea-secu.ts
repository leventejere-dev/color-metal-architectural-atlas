/**
 * Mănăstirea Secu – church „Tăierea Capului Sf. Ioan Botezătorul” (1602),
 * Vânători-Neamț, jud. Neamț; OSM way 218412862 (34.4 × 11.5 m).
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = OSM
 * long axis 68.5° towards the altar (ENE), +Z = south), from five photographs of
 * October 2025 (01 north-west, 02/03 north-east, 04 east, 05 aerial):
 *  - Long single-nave body 28.4 × 10.8 m ending in a ten-sided altar apse
 *    (r ≈ 5.5 m); walls ≈ 10 m on a low plinth, white render with two registers
 *    of blind arcades (tall arches with red-brick archivolts below, slender
 *    niches with small brick arches above), a red-brick band at mid-height and a
 *    deep brick cornice frieze; a few slit windows and stone-framed doors.
 *  - Small square annex with a pyramid roof and cross against the north side of
 *    the altar apse (photos 02–04).
 *  - Main tower over the naos: octagonal base stage with a roof skirt, brick-
 *    banded octagonal drum with arcades, wide flared eave and a pointed octagonal
 *    helm. West tower over the pronaos: octagonal base, tall drum with arched
 *    niches, flattened bulbous cap with a small lantern and cap.
 *  - Metal (copper supplied by COLOR METAL in 2021–2022 according to its records;
 *    the 2025 photos post-date the works): hipped roofs with ≈ 1.2 m eaves and
 *    timber soffits, the apse cone, both tower roofs and the annex roof are shown
 *    as photographed — very dark, oxidised copper with standing seams ≈ 0.5 m.
 * Approximations: no published dimensions; heights scaled from photo 04 (people
 * ≈ 1.75 m): walls ≈ 10 m, ridge ≈ 14.5 m, main tower cross ≈ 28 m, west tower
 * cross ≈ 26 m. Tower positions read from the aerial photo 05; the south side is
 * mirrored from the north; brick ornament simplified to bands and archivolts.
 * Ensemble: the precinct bell tower at the west gate (OSM way 689038918), whose
 * helm carries the same dark standing-seam copper in photos 02, 03 and 05, is
 * added in low detail (≈ 8 m square, eave ≈ 15 m, helm ≈ 9.6 m).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const UP = V(0, 1, 0)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'secuCu'
const WALL = 'plasterWhite'
const BRICK = 'secuBrick'
const PLINTH = 'stoneLight'
const WOOD = 'timber'
const SHADE = 'secuShade'
const SEAM = { key: CU, spacing: 0.5, h: 0.04, w: 0.04 }

const X0 = -17.0
const XA = 11.4 // apse centre
const HW = 5.4
const RA = 5.5
const NA = 10
const H = 10.0
const OV = 1.2
const TM = 6.0 // main tower axis
const TW = -8.0 // west tower axis

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
/** Blind arch: shade panel + archivolt ring (brick or plaster). */
function niche(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, archKey = BRICK, f = 0.16) {
  b.add(SHADE, new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 7, u))), M(m, mat(0, 0, 0.01)))
  const ys = y0 + h - w / 2
  const s = new THREE.Shape()
  s.moveTo(u + w / 2 + f, ys)
  s.absarc(u, ys, w / 2 + f, 0, Math.PI, false)
  s.lineTo(u - w / 2, ys)
  s.absarc(u, ys, w / 2, Math.PI, 0, true)
  s.lineTo(u + w / 2 + f, ys)
  b.add(archKey, extrude(s, 0.1, 8), M(m, mat(0, 0, 0.01)))
  // lesene strips either side
  b.add(WALL, metricBox(0.14, h - w / 2, 0.08), M(m, mat(u - w / 2 - 0.07, y0 + (h - w / 2) / 2, 0.04)))
  b.add(WALL, metricBox(0.14, h - w / 2, 0.08), M(m, mat(u + w / 2 + 0.07, y0 + (h - w / 2) / 2, 0.04)))
}
/** Two arcade registers + brick bands along a straight wall segment (local u0..u1). */
function arcades(b: Builder, m: THREE.Matrix4, u0: number, u1: number, skip: (u: number) => boolean = () => false) {
  const L = u1 - u0
  const nL = Math.max(1, Math.round(L / 1.95))
  const sL = L / nL
  for (let i = 0; i < nL; i++) {
    const u = u0 + sL * (i + 0.5)
    if (!skip(u)) niche(b, m, u, 1.5, sL - 0.55, 4.0)
  }
  const nU = Math.max(1, Math.round(L / 0.95))
  const sU = L / nU
  for (let i = 0; i < nU; i++) niche(b, m, u0 + sU * (i + 0.5), 6.35, sU - 0.36, 2.15, BRICK, 0.1)
  b.add(BRICK, metricBox(L, 0.16, 0.12), M(m, mat((u0 + u1) / 2, 5.75, 0.06)))
  b.add(BRICK, metricBox(L, 0.16, 0.12), M(m, mat((u0 + u1) / 2, 6.05, 0.06)))
  // deep brick cornice: solid band with a row of small arches and dentil courses
  b.add(BRICK, metricBox(L, 1.2, 0.08), M(m, mat((u0 + u1) / 2, 9.2, 0.04)))
  const nC = Math.max(1, Math.round(L / 0.62))
  const sC = L / nC
  for (let i = 0; i < nC; i++) niche(b, m, u0 + sC * (i + 0.5), 8.8, sC - 0.22, 0.7, WALL, 0.07)
  b.add(BRICK, metricBox(L, 0.12, 0.22), M(m, mat((u0 + u1) / 2, 9.62, 0.11)))
}
function slitWindow(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 5, u))), M(m, mat(0, 0, 0.04)))
  b.add(PLINTH, metricBox(w + 0.4, h + 0.3, 0.06), M(m, mat(u, y0 + h / 2, 0.02)))
}
function door(b: Builder, m: THREE.Matrix4, u: number, w: number, h: number) {
  b.add('wood', metricBox(w, h, 0.05), M(m, mat(u, 0.45 + h / 2, 0.03)))
  b.add(PLINTH, metricBox(w + 0.6, h + 0.35, 0.04), M(m, mat(u, 0.45 + (h + 0.35) / 2, 0.01)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bl = XA - X0
  b.block(WALL, bl, H, HW * 2, (X0 + XA) / 2, 0, 0)
  b.block(PLINTH, bl + 0.3, 0.45, HW * 2 + 0.3, (X0 + XA) / 2, 0, 0)
  const ring = (r: number, y: number) => polyRing(NA, r, y, Math.PI / NA, XA, 0)
  b.add(WALL, loft([ring(RA, 0), ring(RA, H)], { capTop: true, flat: true }))
  b.add(PLINTH, loft([ring(RA + 0.15, 0), ring(RA + 0.15, 0.45)], { capTop: true, flat: true }))

  /* ================= façades ================= */
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * HW, 0, sz)
    const s = sz // u = s * x
    const xs = [X0 + 0.15, XA]
    arcades(b, m, Math.min(s * xs[0], s * xs[1]), Math.max(s * xs[0], s * xs[1]), (u) => Math.abs(u - s * -13.6) < 1.2)
    for (const x of [-4.6, 2.8, 8.6]) slitWindow(b, m, s * x, 3.0, 0.42, 2.2)
    door(b, m, s * -13.6, 1.25, 2.4)
  }
  {
    const m = faceM(X0, 0, -1, 0)
    arcades(b, m, -HW, HW, (u) => Math.abs(u) < 1.2)
    door(b, m, 0, 1.4, 2.6)
  }
  const ap = RA * Math.cos(Math.PI / NA)
  const fw = 2 * RA * Math.sin(Math.PI / NA)
  for (let i = 0; i < NA; i++) {
    const a = (i * 2 * Math.PI) / NA
    if (Math.cos(a) < 0.05) continue
    const m = faceM(XA + ap * Math.cos(a), ap * Math.sin(a), Math.cos(a), Math.sin(a))
    arcades(b, m, -fw / 2 + 0.05, fw / 2 - 0.05)
    if (i === 0) slitWindow(b, m, 0, 3.0, 0.42, 2.2)
  }

  /* ================= north annex ================= */
  {
    const ax0 = 9.4
    const ax1 = 14.6
    const az0 = -HW + 0.4
    const az1 = -HW - 4.4
    const ah = 5.0
    const cx = (ax0 + ax1) / 2
    const cz = (az0 + az1) / 2
    b.block(WALL, ax1 - ax0, ah, az0 - az1, cx, 0, cz)
    b.block(PLINTH, ax1 - ax0 + 0.3, 0.45, az0 - az1 + 0.3, cx, 0, cz)
    b.block(WALL, ax1 - ax0 + 0.3, 0.3, az0 - az1 + 0.3, cx, ah - 0.3, cz)
    const mn = faceM(cx, az1, 0, -1)
    for (const u of [-1.9, -0.95, 0, 0.95, 1.9]) niche(b, mn, u, 1.4, 0.7, 3.0, WALL, 0.08)
    slitWindow(b, mn, 0.95, 1.6, 0.4, 0.5)
    const me = faceM(ax1, cz, 1, 0)
    for (const u of [-1.4, 0, 1.4]) niche(b, me, u, 1.4, 0.95, 3.0, WALL, 0.08)
    // pyramid roof
    const ov = 0.7
    const t = Math.tan(34 * D2R)
    const hx = (ax1 - ax0) / 2 + ov
    const hz = (az0 - az1) / 2 + ov
    const top = ah + Math.min(hx, hz) * t
    seamedLoft(b, CU, [rectRing(hx, hz, ah - 0.1, cx, cz), rectRing(Math.max(0.05, hx - hz), 0.05, top, cx, cz)], 0.45)
    b.add(WOOD, loft([rectRing((ax1 - ax0) / 2, (az0 - az1) / 2, ah, cx, cz), rectRing(hx - 0.02, hz - 0.02, ah - 0.18, cx, cz)]))
    cross(b, 'iron', cx, top, cz, 1.3, true, Math.PI / 2)
  }

  /* ================= roofs ================= */
  const t = Math.tan(28 * D2R)
  const ye = H - OV * t
  const hwR = HW + OV
  const ridge = H + HW * t
  {
    const xw = X0 - OV
    const xr0 = xw + hwR
    const xr1 = XA - 1.0
    for (const sz of [-1, 1]) facet(b, CU, [V(xw, ye, sz * hwR), V(XA, ye, sz * hwR), V(xr1, ridge, 0), V(xr0, ridge, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(xw, ye, -hwR), V(xr0, ridge, 0), V(xw, ye, hwR)], { seams: SEAM, thickness: 0.1, hint: V(-1, 1, 0) })
    b.beam(CU, V(xr0, ridge + 0.05, 0), V(xr1, ridge + 0.05, 0), 0.24, 0.14)
    for (const sz of [-1, 1]) b.beam(CU, V(xw, ye + 0.05, sz * hwR), V(xr0, ridge + 0.05, 0), 0.2, 0.12)
    b.add(WOOD, loft([rectRing((XA - X0) / 2, HW, H, (X0 + XA) / 2, 0), rectRing((XA - xw) / 2, hwR - 0.02, ye - 0.14, (xw + XA) / 2, 0)]))
    b.block(CU, XA - xw, 0.16, 0.16, (xw + XA) / 2, ye - 0.16, hwR)
    b.block(CU, XA - xw, 0.16, 0.16, (xw + XA) / 2, ye - 0.16, -hwR)
  }
  // apse: conical roof joining the main roof
  {
    const rr = (r: number, y: number) => polyRing(NA, r, y, Math.PI / NA, XA, 0)
    const r0 = RA / Math.cos(Math.PI / NA) + OV
    const st: P2[] = [
      [r0, ye],
      [r0 - 0.6, ye + 0.35],
      [0.05, ye + 0.35 + (r0 - 0.65) * Math.tan(30 * D2R)],
    ]
    seamedLoft(b, CU, st.map(([r, y]) => rr(r, y)))
    b.add(WOOD, loft([rr(RA, H), rr(r0 - 0.02, ye - 0.14)]))
    const top = st[2][1]
    cross(b, 'iron', XA, top, 0, 1.6, true, Math.PI / 2)
  }

  /* ================= main tower (naos) ================= */
  {
    const ph = Math.PI / 8
    const P = (r: number, y: number) => polyRing(8, r, y, ph, TM, 0)
    // octagonal base with small arch frieze
    b.add(WALL, loft([P(3.25, 12.0), P(3.25, 15.6)], { capTop: true, flat: true }))
    const ap1 = 3.25 * Math.cos(Math.PI / 8)
    const fw1 = 2 * 3.25 * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = faceM(TM + ap1 * Math.cos(a), ap1 * Math.sin(a), Math.cos(a), Math.sin(a))
      for (const u of [-fw1 / 4, fw1 / 4]) niche(b, m, u, 14.2, fw1 / 2 - 0.35, 1.1, WALL, 0.07)
    }
    seamedLoft(b, CU, [P(3.75, 15.5), P(3.3, 15.85), P(2.7, 16.6)], 0.45)
    // brick-banded drum
    const R2 = 2.6
    b.add(WALL, loft([P(R2, 16.3), P(R2, 20.2)], { capTop: true, flat: true }))
    const ap2 = R2 * Math.cos(Math.PI / 8)
    const fw2 = 2 * R2 * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = faceM(TM + ap2 * Math.cos(a), ap2 * Math.sin(a), Math.cos(a), Math.sin(a))
      niche(b, m, 0, 16.9, fw2 - 0.45, 2.7, BRICK, 0.1)
      if (k % 2 === 0) slitWindow(b, m, 0, 17.6, 0.35, 1.4)
    }
    for (const y of [16.45, 17.3, 18.2, 19.1, 19.75, 20.0]) b.add(BRICK, loft([P(R2 + 0.06, y), P(R2 + 0.06, y + 0.14)], { capTop: true, capBottom: true, flat: true }))
    // wide eave + pointed helm
    const hst: P2[] = [
      [3.7, 20.05],
      [3.1, 20.4],
      [2.5, 21.0],
      [0.05, 26.2],
    ]
    seamedLoft(b, CU, hst.map(([r, y]) => P(r, y)), 0.42)
    b.add(WOOD, loft([P(R2 + 0.05, 20.2), P(3.68, 19.92)]))
    cross(b, 'iron', TM, 26.2, 0, 2.0, true, Math.PI / 2)
  }

  /* ================= west tower (pronaos) ================= */
  {
    const ph = Math.PI / 8
    const P = (r: number, y: number) => polyRing(8, r, y, ph, TW, 0)
    b.add(WALL, loft([P(3.1, 12.0), P(3.1, 15.6)], { capTop: true, flat: true }))
    const ap1 = 3.1 * Math.cos(Math.PI / 8)
    const fw1 = 2 * 3.1 * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = faceM(TW + ap1 * Math.cos(a), ap1 * Math.sin(a), Math.cos(a), Math.sin(a))
      for (const u of [-fw1 / 4, fw1 / 4]) niche(b, m, u, 14.3, fw1 / 2 - 0.35, 1.0, WALL, 0.07)
    }
    seamedLoft(b, CU, [P(3.55, 15.5), P(3.1, 15.85), P(2.6, 16.5)], 0.45)
    const R2 = 2.45
    b.add(WALL, loft([P(R2, 16.2), P(R2, 20.0)], { capTop: true, flat: true }))
    const ap2 = R2 * Math.cos(Math.PI / 8)
    const fw2 = 2 * R2 * Math.sin(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = faceM(TW + ap2 * Math.cos(a), ap2 * Math.sin(a), Math.cos(a), Math.sin(a))
      niche(b, m, 0, 16.7, fw2 - 0.4, 2.8, WALL, 0.09)
      if (k % 2 === 0) slitWindow(b, m, 0, 17.4, 0.4, 1.2)
    }
    b.add(WALL, loft([P(R2 + 0.25, 19.75), P(R2 + 0.25, 20.15)], { capTop: true, capBottom: true, flat: true }))
    // flattened bulb
    const bulb: P2[] = []
    for (let i = 0; i <= 12; i++) {
      const tt = i / 12
      const r = tt < 0.35 ? 2.85 + 0.25 * Math.sin((tt / 0.35) * (Math.PI / 2)) : 3.1 * Math.cos(((tt - 0.35) / 0.65) * (Math.PI / 2)) ** 0.9
      bulb.push([Math.max(0.55, r), 20.1 + tt * 2.4])
    }
    b.add(CU, lathe(bulb, 32), mat(TW, 0, 0))
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      for (let i = 0; i < bulb.length - 1; i++) {
        const [r0, y0] = bulb[i]
        const [r1, y1] = bulb[i + 1]
        b.beam(CU, V(TW + Math.cos(a) * (r0 + 0.02), y0, Math.sin(a) * (r0 + 0.02)), V(TW + Math.cos(a) * (r1 + 0.02), y1, Math.sin(a) * (r1 + 0.02)), 0.05, 0.04, V(Math.cos(a), 0, Math.sin(a)))
      }
    }
    // lantern + small cap
    b.add(CU, loft([P(0.6, 22.4), P(0.6, 23.5)], { capTop: true }))
    const cap: P2[] = [
      [0.9, 23.45],
      [0.95, 23.7],
      [0.7, 24.1],
      [0.25, 24.5],
      [0.06, 24.9],
    ]
    b.add(CU, lathe(cap, 16), mat(TW, 0, 0))
    cross(b, 'iron', TW, 24.85, 0, 1.6, true, Math.PI / 2)
  }

  /* ================= precinct bell tower (west gate) ================= */
  // OSM way 689038918 (bell_tower, ≈ 9.4 × 7.5 m) in the west precinct wall on
  // the church axis; its steep pyramid helm carries the same dark, standing-seam
  // copper as the church in the 2025 photos 02, 03 and 05. Low detail.
  b.merge(bellTower(), mat(BT.x, 0, BT.z, BT.ry))

  return b
}

/** Precinct bell tower: stone shaft with the gate passage, belfry and copper helm (local origin = tower centre). */
const BT = { x: -44.5, z: 2.6, ry: -4 * D2R, hw: 4.0, eave: 15.0 }
function bellTower(): Builder {
  const t = new Builder()
  const { hw, eave } = BT
  const STONE = 'secuStone'
  t.block(STONE, 2 * hw, eave, 2 * hw, 0, 0, 0)
  t.block(PLINTH, 2 * hw + 0.3, 0.6, 2 * hw + 0.3, 0, 0, 0)
  for (const y of [6.4, 10.4]) t.block(STONE, 2 * hw + 0.24, 0.3, 2 * hw + 0.24, 0, y, 0)
  t.block(BRICK, 2 * hw + 0.1, 0.5, 2 * hw + 0.1, 0, eave - 0.75, 0)
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as P2[]) {
    const m = faceM(nx * hw, nz * hw, nx, nz)
    // thin red-brick panel frame (photo 02)
    for (const [w, h, y] of [[2 * hw - 1.0, 0.1, 10.7], [2 * hw - 1.0, 0.1, 14.1]] as [number, number, number][]) t.add(BRICK, metricBox(w, h, 0.04), M(m, mat(0, y, 0.02)))
    for (const s of [-1, 1]) t.add(BRICK, metricBox(0.1, 3.4, 0.04), M(m, mat(s * (hw - 0.55), 12.4, 0.02)))
    // belfry: one large arched opening per face, dark interior and stone surround
    t.add('black', new THREE.ShapeGeometry(new THREE.Shape(archPts(2.3, 3.3, 10.9, 8))), M(m, mat(0, 0, 0.03)))
    t.add(PLINTH, extrude(ringArch(2.3, 3.3, 10.9, 0.25), 0.1, 8), M(m, mat(0, 0, 0.01)))
    if (nx !== 0) {
      // gate passage through the tower (outside −X, courtyard +X)
      t.add('black', new THREE.ShapeGeometry(new THREE.Shape(archPts(3.2, 4.4, 0.0, 10))), M(m, mat(0, 0, 0.03)))
      t.add(PLINTH, extrude(ringArch(3.2, 4.4, 0.0, 0.35), 0.12, 10), M(m, mat(0, 0, 0.01)))
      slitWindow(t, m, 0, 7.6, 0.4, 1.4)
    } else {
      slitWindow(t, m, 0, 3.4, 0.4, 1.4)
      slitWindow(t, m, 0, 7.6, 0.4, 1.4)
    }
  }
  // steep pyramid helm with a bell-cast eave on a timber soffit (photos 02, 03)
  const st: P2[] = [
    [hw + 1.05, eave - 0.25],
    [hw + 0.55, eave + 0.15],
    [hw - 0.15, eave + 0.95],
    [0.06, eave + 9.6],
  ]
  seamedLoft(t, CU, st.map(([r, y]) => rectRing(r, r, y)), 0.45)
  t.add(WOOD, loft([rectRing(hw, hw, eave), rectRing(hw + 1.03, hw + 1.03, eave - 0.37)]))
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as P2[]) for (let i = 0; i < st.length - 1; i++) t.beam(CU, V(sx * st[i][0], st[i][1] + 0.05, sz * st[i][0]), V(sx * st[i + 1][0], st[i + 1][1] + 0.05, sz * st[i + 1][0]), 0.12, 0.1)
  cross(t, 'iron', 0, eave + 9.55, 0, 2.0, true, Math.PI / 2)
  return t
}
/** Arch-shaped frame ring (surround of width f around an arched opening). */
function ringArch(w: number, h: number, y0: number, f: number) {
  const s = new THREE.Shape(archPts(w + 2 * f, h + f, y0, 10))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 10)))
  return s
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [-4, 12.5, -5],
  materials: (base) => {
    // copper darkened to the near-black oxidised tone of the 2025 photographs
    const cu = (base.zincGraphite as THREE.MeshStandardMaterial).clone()
    cu.color = new THREE.Color('#7f8682')
    cu.roughness = 0.45
    return {
      secuCu: cu,
      secuShade: new THREE.MeshStandardMaterial({ color: '#e2ded5', roughness: 0.92 }),
      secuBrick: new THREE.MeshStandardMaterial({ color: '#8f5040', roughness: 0.88 }),
      secuStone: new THREE.MeshStandardMaterial({ color: '#dcd0b6', roughness: 0.9 }),
    }
  },
  notes: 'Single-nave church with a ten-sided altar apse, two towers (pointed helm over the naos, bulbous cap over the pronaos) and blind brick-trimmed arcades; heights scaled from photographs; roofs shown as photographed in dark oxidised copper supplied by COLOR METAL; the west-gate bell tower with the same copper helm is included in simplified form.',
}
export default model
