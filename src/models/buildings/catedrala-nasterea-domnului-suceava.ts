/**
 * Catedrala „Nașterea Domnului”, Suceava (Str. Grigore Ureche / Piața Mărășești,
 * OSM way 233214641) — new Orthodox cathedral, triconch plan, consecrated 2015.
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = the
 * church axis towards the altar/east, +Z = south). Sources: OSM outline
 * (74.6 × 41.4 m, traced ≈ 8° skewed against the nave), ro.wikipedia (≈ 70 m
 * long, ≈ 80 m high, main tower over the naos, two octagonal towers over the
 * western part of the pronaos, semicircular lateral and altar apses, west
 * entrance with open porch and pangars, closed porch with north/south doors),
 * Wikidata height 80 m and seven 2026 drone photographs (01–07):
 *  - Body (closed porch + pronaos) 34 × 27.6 m: outer (aisle) walls ≈ 17 m with
 *    a corbel-arch frieze, six tall arched bays per side with four slit windows,
 *    an arched gable with a mosaic lunette below each west tower; lean-to roofs
 *    up to a clerestory (≈ 22 m) with small windows; steep (≈ 48°) main roof,
 *    hipped to the west.
 *  - Closed porch: large arched lunette window over a small arched side porch
 *    (north and south). West annex: open porch flanked by two low pangars with
 *    vaulted roofs and crosses.
 *  - Naos: cross-in-square block with semicircular gables (barrel arms) to the
 *    north, south and east; projecting semicircular lateral apses (Ø ≈ 10.6 m)
 *    capped by low domes; altar apse (Ø ≈ 13.6 m) with a tall conical roof and
 *    small stepped buttresses.
 *  - Main tower (cross ≈ 80 m): two "crowns" of eight pointed-arch gables with
 *    white trims separated by a glazed ring, an octagonal drum with eight tall
 *    windows and an octagonal spire. West towers (cross ≈ 57 m): square base with
 *    arched gables, small octagonal stage, tall octagonal drum and spire.
 *  - Metal (copper strip and a copper rainwater system supplied by COLOR METAL
 *    according to its records): the 2026 photographs show every roof, dome, crown and
 *    spire in a very dark, oxidised metal tone; shown as photographed (dark
 *    oxidised copper, standing seams ≈ 0.5 m), with copper gutters and downpipes.
 * Approximations: heights scaled from the oblique drone photos against the
 * published 80 m; north and south sides modelled identically; the west front
 * (not photographed) is interpreted from the description; carved ornament,
 * mosaics and window tracery simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, polyRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const UP = V(0, 1, 0)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'sucCu' // dark oxidised copper (roofs, domes, spires)
const WALL = 'plasterWhite'
const SHADE = 'sucShade'
const TRIM = 'sucTrim'
const PLINTH = 'stoneGrey'
const GLASS = 'glassC'
const SEAM = { key: CU, spacing: 0.5, h: 0.045, w: 0.045 }

/* plan */
const ZO = 13.8 // outer walls
const ZC = 9.8 // clerestory walls
const XW = -29 // west wall of the body
const XCW = -25 // west wall of the clerestory
const XB = 5 // east end of the body / west face of the naos block
const NAOS = { x0: 5, x1: 25, z: 14.2 }
const TX = 15 // main tower axis
const LAT = { x: 15, z: 15.6, r: 5.3, h: 19.4 }
const ALT = { x: 30.2, r: 6.8, h: 17.6 }
const WT = { x: -13, z: 6.3 }
/* heights */
const HO = 17 // outer eave
const HC = 22 // clerestory eave
const PITCH = 48

function faceM(cx: number, cz: number, nx: number, nz: number, y = 0) {
  const n = V(nx, 0, nz).normalize()
  return new THREE.Matrix4().makeBasis(V().crossVectors(UP, n), UP, n).setPosition(cx, y, cz)
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
/** Arched recess: proud frame band + shade panel (and optional slit window). */
function bay(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, win?: { w: number; h: number; y0: number }) {
  const f = 0.22
  const s = new THREE.Shape(archPts(w + 2 * f, h + f, y0, 10, u))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 10, u)))
  b.add(TRIM, extrude(s, 0.16, 4), m)
  b.add(SHADE, new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 10, u))), M(m, mat(0, 0, 0.01)))
  if (win) {
    b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(win.w, win.h, win.y0, 6, u))), M(m, mat(0, 0, 0.03)))
    const g = new THREE.Shape(archPts(win.w + 0.24, win.h + 0.12, win.y0 - 0.12, 6, u))
    g.holes.push(new THREE.Path(archPts(win.w, win.h, win.y0, 6, u)))
    b.add(TRIM, extrude(g, 0.1, 3), M(m, mat(0, 0, 0.02)))
  }
}
/** Small corbel-arch frieze along a straight wall (local frame m, u0..u1). */
function frieze(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number, step = 0.95) {
  const n = Math.max(1, Math.floor((u1 - u0) / step))
  const st = (u1 - u0) / n
  b.add(TRIM, metricBox(u1 - u0, 0.22, 0.2), M(m, mat((u0 + u1) / 2, y - 0.11, 0.1)))
  for (let i = 0; i < n; i++) {
    const u = u0 + st * (i + 0.5)
    const s = new THREE.Shape(archPts(st - 0.08, 0.75, y, 4, u))
    s.holes.push(new THREE.Path(archPts(st - 0.3, 0.64, y, 4, u)))
    b.add(TRIM, extrude(s, 0.12, 2), m)
  }
}
/** Frieze around a cylinder (centre cx,cz; radius r) between angles a0..a1 (deg). */
function ringFrieze(b: Builder, cx: number, cz: number, r: number, y: number, a0: number, a1: number) {
  const n = Math.max(2, Math.round(((a1 - a0) * D2R * r) / 0.95))
  for (let i = 0; i < n; i++) {
    const a = (a0 + ((a1 - a0) * (i + 0.5)) / n) * D2R
    const w = (((a1 - a0) * D2R * r) / n) * 0.9
    const s = new THREE.Shape(archPts(w, 0.75, 0, 4))
    s.holes.push(new THREE.Path(archPts(w - 0.22, 0.64, 0, 4)))
    b.add(TRIM, extrude(s, 0.12, 2), faceM(cx + Math.cos(a) * r, cz + Math.sin(a) * r, Math.cos(a), Math.sin(a), y))
  }
}
/** Seamed roof surface from stacked rings (facets with standing seams). */
function seamedLoft(b: Builder, key: string, rings: THREE.Vector3[][], spacing = 0.5) {
  const sp = { key, spacing, h: 0.04, w: 0.04 }
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
/** Barrel roof along Z (axis at x=cx, springing y, radius r) from z0 to z1. */
function barrelZ(b: Builder, cx: number, y: number, r: number, z0: number, z1: number, segs = 14) {
  for (let i = 0; i < segs; i++) {
    const t0 = Math.PI - (i / segs) * Math.PI
    const t1 = Math.PI - ((i + 1) / segs) * Math.PI
    const p = (t: number, z: number) => V(cx + r * Math.cos(t), y + r * Math.sin(t), z)
    const mid = (t0 + t1) / 2
    facet(b, CU, [p(t0, z0), p(t0, z1), p(t1, z1), p(t1, z0)], { seams: SEAM, hint: V(Math.cos(mid), Math.sin(mid), 0) })
  }
}
/** Barrel roof along X (axis at z=cz). */
function barrelX(b: Builder, cz: number, y: number, r: number, x0: number, x1: number, segs = 12) {
  for (let i = 0; i < segs; i++) {
    const t0 = (i / segs) * Math.PI
    const t1 = ((i + 1) / segs) * Math.PI
    const p = (t: number, x: number) => V(x, y + r * Math.sin(t), cz + r * Math.cos(t))
    const mid = (t0 + t1) / 2
    facet(b, CU, [p(t0, x0), p(t0, x1), p(t1, x1), p(t1, x0)], { seams: SEAM, hint: V(0, Math.sin(mid), Math.cos(mid)) })
  }
}
/** Semicircular gable wall (rectangle up to ys + half disc), in local frame m, thickness t. */
function archGable(b: Builder, m: THREE.Matrix4, w: number, y0: number, ys: number, t: number) {
  const hw = w / 2
  const pts = [new THREE.Vector2(-hw, y0), new THREE.Vector2(hw, y0)]
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  b.add(WALL, extrude(new THREE.Shape(pts), t, 18), M(m, mat(0, 0, -t)))
  // white roll moulding on the arch
  const s = new THREE.Shape()
  const ro = hw + 0.35
  const ri = hw - 0.05
  s.moveTo(ro, ys)
  s.absarc(0, ys, ro, 0, Math.PI, false)
  s.lineTo(-ri, ys)
  s.absarc(0, ys, ri, Math.PI, 0, true)
  s.lineTo(ro, ys)
  b.add(TRIM, extrude(s, 0.25, 24), M(m, mat(0, 0, -0.05)))
}
/** Crown of eight pointed-arch gables with white trims around a dark bell. */
function crown(b: Builder, cx: number, y0: number, y1: number, rg: number, rTop: number) {
  const prof: P2[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    prof.push([rTop + (rg + 0.15 - rTop) * Math.cos((t * Math.PI) / 2) ** 0.7, y0 + (y1 - y0) * t])
  }
  b.add(CU, lathe(prof, 32), mat(cx, 0, 0))
  const w = 2 * rg * Math.tan(Math.PI / 8) * 0.98
  const h = y1 - y0 - 0.25
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const m = faceM(cx + Math.cos(a) * rg, Math.sin(a) * rg, Math.cos(a), Math.sin(a))
    b.add(CU, extrude(new THREE.Shape(opening('pointed', w, h, 0, y0 + 0.15, 10)), 0.3, 10), M(m, mat(0, 0, -0.3)))
    b.add(TRIM, extrude(frameShape('pointed', w - 0.5, h - 0.35, 0.28, 0, y0 + 0.4), 0.22, 10), M(m, mat(0, 0, -0.02)))
  }
  b.add(TRIM, loft([polyRing(32, rg + 0.35, y0 - 0.25, 0, cx, 0), polyRing(32, rg + 0.35, y0 + 0.2, 0, cx, 0)], { capTop: true, capBottom: true }))
}
/** Octagonal drum with one tall arched window per face. */
function octDrum(b: Builder, cx: number, cz: number, R: number, y0: number, y1: number, win: { w: number; h: number; y0: number }, recess = true) {
  const ph = Math.PI / 8
  b.add(WALL, loft([polyRing(8, R, y0, ph, cx, cz), polyRing(8, R, y1, ph, cx, cz)], { capTop: true, flat: true }))
  const ap = R * Math.cos(Math.PI / 8)
  const fw = 2 * R * Math.sin(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const m = faceM(cx + Math.cos(a) * ap, cz + Math.sin(a) * ap, Math.cos(a), Math.sin(a))
    if (recess) bay(b, m, 0, win.y0 - 0.6, fw * 0.62, win.h + 1.0, win)
    else {
      b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(win.w, win.h, win.y0, 6))), M(m, mat(0, 0, 0.03)))
      const g = new THREE.Shape(archPts(win.w + 0.3, win.h + 0.15, win.y0 - 0.15, 6))
      g.holes.push(new THREE.Path(archPts(win.w, win.h, win.y0, 6)))
      b.add(TRIM, extrude(g, 0.12, 3), m)
    }
    // corner lesenes
    const va = ph + (k * Math.PI) / 4
    b.add(TRIM, metricBox(0.3, y1 - y0, 0.14), mat(cx + R * Math.cos(va), (y0 + y1) / 2, cz + R * Math.sin(va), Math.PI / 2 - va))
  }
  b.add(TRIM, loft([polyRing(8, R + 0.18, y1 - 0.45, ph, cx, cz), polyRing(8, R + 0.18, y1, ph, cx, cz)], { capTop: true, capBottom: true, flat: true }))
}

function build(): Builder {
  const b = new Builder()

  /* ================= body: outer walls, clerestory ================= */
  const bl = XB - XW
  b.block(WALL, bl, HO, ZO * 2, (XW + XB) / 2, 0, 0)
  b.block(PLINTH, bl + 0.3, 0.7, ZO * 2 + 0.3, (XW + XB) / 2, 0, 0)
  b.block(TRIM, bl + 0.6, 0.35, ZO * 2 + 0.6, (XW + XB) / 2, HO - 0.35, 0)
  b.block(WALL, XB + 4 - XCW, HC, ZC * 2, (XCW + XB + 4) / 2, 0, 0)
  b.block(TRIM, XB + 4 - XCW + 0.4, 0.3, ZC * 2 + 0.4, (XCW + XB + 4) / 2, HC - 0.3, 0)
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * ZO, 0, sz)
    const s = sz // local u = sz * x  (u axis = +X on the south face, -X on the north)
    frieze(b, m, Math.min(s * XW, s * XB) + 0.3, Math.max(s * XW, s * XB) - 0.3, HO - 1.15)
    // six tall arched bays, four with slit windows
    const bx0 = -16
    const bx1 = 9.6
    const bw = (bx1 - bx0) / 6
    for (let i = 0; i < 6; i++) {
      const x = bx0 + bw * (i + 0.5)
      bay(b, m, s * x, 1.2, bw - 0.9, 12.6, i > 0 && i < 5 ? { w: 0.75, h: 7.6, y0: 3.4 } : undefined)
    }
    // clerestory small windows
    const mc = faceM(0, sz * ZC, 0, sz)
    for (let x = -21; x <= 3; x += 3) {
      if (Math.abs(x - WT.x) < 3) continue
      b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(0.6, 1.2, 20.0, 5, s * x))), M(mc, mat(0, 0, 0.03)))
    }
    // arched gable with mosaic lunette under each west tower
    const mg = faceM(WT.x, sz * ZO, 0, sz)
    archGable(b, M(mg, mat(0, 0, 0.35)), 6.6, HO - 0.4, HO - 0.2, 0.6)
    b.add('sucMosaic', new THREE.ShapeGeometry(new THREE.Shape(archPts(5.4, 2.7, HO - 0.2, 12))), M(mg, mat(0, 0, 0.37)))
    // closed porch: large lunette window + small arched side porch
    const xp = -20.6
    const mp = faceM(xp, sz * ZO, 0, sz)
    b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(4.4, 5.6, 8.4, 14))), M(mp, mat(0, 0, 0.03)))
    const lf = new THREE.Shape(archPts(5.0, 5.9, 8.1, 14))
    lf.holes.push(new THREE.Path(archPts(4.4, 5.6, 8.4, 14)))
    b.add(TRIM, extrude(lf, 0.2, 14), mp)
    for (const u of [-1.1, 0, 1.1]) b.add(TRIM, metricBox(0.12, 4.0, 0.12), M(mp, mat(u, 8.4 + 2.0, 0.08)))
    for (const y of [9.7, 11.0, 12.3]) b.add(TRIM, metricBox(4.4, 0.12, 0.12), M(mp, mat(0, y, 0.08)))
    // side porch: arched front, half-barrel roof
    {
      const pw = 5.0
      const pd = 3.0
      const ph = 5.4
      const front = new THREE.Shape([new THREE.Vector2(-pw / 2, 0), new THREE.Vector2(pw / 2, 0), new THREE.Vector2(pw / 2, ph), new THREE.Vector2(-pw / 2, ph)])
      front.holes.push(new THREE.Path(archPts(3.4, 4.3, 0, 10)))
      b.add(WALL, extrude(front, 0.5, 10), M(mp, mat(0, 0, pd - 0.5)))
      for (const su of [-1, 1]) b.add(WALL, metricBox(0.5, ph, pd), M(mp, mat(su * (pw / 2 - 0.25), ph / 2, pd / 2)))
      b.add(TRIM, metricBox(pw + 0.3, 0.3, pd + 0.3), M(mp, mat(0, ph, pd / 2)))
      const rr = pw / 2 + 0.25
      for (let i = 0; i < 10; i++) {
        const t0 = (i / 10) * Math.PI
        const t1 = ((i + 1) / 10) * Math.PI
        const P = (t: number, d: number) => new THREE.Vector3(rr * Math.cos(t), ph + 0.3 + rr * 0.75 * Math.sin(t), d).applyMatrix4(mp)
        facet(b, CU, [P(t0, 0), P(t0, pd + 0.3), P(t1, pd + 0.3), P(t1, 0)], { seams: SEAM, hint: V(0, 1, 0).add(V(0, 0, 0)) })
      }
      b.add('sucMosaic', new THREE.ShapeGeometry(new THREE.Shape(archPts(3.0, 1.4, ph + 0.35, 10))), M(mp, mat(0, 0, pd + 0.32)))
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(archPts(1.8, 3.0, 0, 8))), M(mp, mat(0, 0, 0.02)))
      b.block(PLINTH, pw + 1.6, 0.45, pd + 1.6, 0, 0, 0)
      b.add(PLINTH, metricBox(pw + 1.6, 0.45, pd + 1.6), M(mp, mat(0, 0.22, pd / 2 + 0.3)))
    }
  }
  // west wall: frieze + two bays
  {
    const m = faceM(XW, 0, -1, 0)
    frieze(b, m, -ZO + 0.3, ZO - 0.3, HO - 1.15)
    for (const u of [-8.5, 8.5]) bay(b, m, u, 1.2, 3.4, 12.6, { w: 0.75, h: 7.6, y0: 3.4 })
  }

  /* ================= roofs over the body ================= */
  {
    const t = Math.tan(31 * D2R)
    const ov = 0.5
    const ye = HO - ov * t
    const yi = HO + (ZO - ZC) * t
    for (const sz of [-1, 1]) {
      facet(b, CU, [V(XW - ov, ye, sz * (ZO + ov)), V(XB, ye, sz * (ZO + ov)), V(XB, yi, sz * ZC), V(XCW, yi, sz * ZC)], { seams: SEAM, thickness: 0.12 })
      // copper gutter
      b.beam(CU, V(XW - ov, ye - 0.12, sz * (ZO + ov + 0.1)), V(XB, ye - 0.12, sz * (ZO + ov + 0.1)), 0.24, 0.22)
      for (const x of [-27.5, -10.5, 3.6]) b.rod(CU, V(x, ye - 0.2, sz * (ZO + 0.35)), V(x, 0.6, sz * (ZO + 0.35)), 0.07, 6)
    }
    facet(b, CU, [V(XW - ov, ye, -(ZO + ov)), V(XCW, yi, -ZC), V(XCW, yi, ZC), V(XW - ov, ye, ZO + ov)], { seams: SEAM, thickness: 0.12, hint: V(-1, 1, 0) })
    b.beam(CU, V(XW - ov - 0.1, ye - 0.12, -(ZO + ov)), V(XW - ov - 0.1, ye - 0.12, ZO + ov), 0.24, 0.22)
    for (const sz of [-1, 1]) b.beam(CU, V(XW - ov, ye + 0.05, sz * (ZO + ov)), V(XCW, yi + 0.05, sz * ZC), 0.2, 0.12)
  }
  // steep main roof, hipped to the west
  const T = Math.tan(PITCH * D2R)
  const ovc = 0.6
  const yE = HC - ovc * T
  const RIDGE = HC + ZC * T
  {
    const hw = ZC + ovc
    const xw = XCW - ovc
    const xr0 = xw + hw // west hip apex (ridge start)
    const xr1 = 9
    for (const sz of [-1, 1]) facet(b, CU, [V(xw, yE, sz * hw), V(xr1, yE, sz * hw), V(xr1, RIDGE, 0), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xw, yE, -hw), V(xr0, RIDGE, 0), V(xw, yE, hw)], { seams: SEAM, thickness: 0.12, hint: V(-1, 1, 0) })
    b.beam(CU, V(xr0, RIDGE + 0.08, 0), V(xr1, RIDGE + 0.08, 0), 0.3, 0.18)
    for (const sz of [-1, 1]) b.beam(CU, V(xw, yE + 0.06, sz * hw), V(xr0, RIDGE + 0.06, 0), 0.24, 0.14)
    for (const sz of [-1, 1]) b.beam(CU, V(xw, yE - 0.12, sz * (hw + 0.1)), V(xr1 - 2.5, yE - 0.12, sz * (hw + 0.1)), 0.22, 0.2)
  }

  /* ================= naos block with arched gables ================= */
  {
    const nx = (NAOS.x0 + NAOS.x1) / 2
    b.block(WALL, NAOS.x1 - NAOS.x0, HC, NAOS.z * 2, nx, 0, 0)
    b.block(PLINTH, NAOS.x1 - NAOS.x0 + 0.3, 0.7, NAOS.z * 2 + 0.3, nx, 0, 0)
    const rN = (NAOS.x1 - NAOS.x0) / 2 - 1.0
    for (const sz of [-1, 1]) {
      const m = faceM(nx, sz * NAOS.z, 0, sz)
      archGable(b, m, rN * 2, HC - 0.5, HC - 0.3, 1.0)
      frieze(b, m, -9.6, -5.6, HO - 1.15)
      frieze(b, m, 5.6, 9.6, HO - 1.15)
      // round window in the gable
      b.add(GLASS, new THREE.CircleGeometry(1.1, 20), M(m, mat(0, HC + 3.0, 0.03)))
      b.add(TRIM, new THREE.TorusGeometry(1.25, 0.16, 6, 20), M(m, mat(0, HC + 3.0, 0.06)))
    }
    barrelZ(b, nx, HC - 0.3, rN + 0.45, -NAOS.z - 0.4, NAOS.z + 0.4)
    // east arm
    const rE = 7.0
    const me = faceM(NAOS.x1, 0, 1, 0)
    archGable(b, me, rE * 2, HC - 0.5, HC - 0.3, 0.8)
    barrelX(b, 0, HC - 0.3, rE + 0.4, TX, NAOS.x1 + 0.4)
    b.add(GLASS, new THREE.CircleGeometry(0.9, 18), M(me, mat(0, HC + 2.6, 0.03)))
  }

  /* ================= lateral apses ================= */
  for (const sz of [-1, 1]) {
    const cz = sz * LAT.z
    b.add(WALL, loft([polyRing(32, LAT.r, 0, 0, LAT.x, cz), polyRing(32, LAT.r, LAT.h, 0, LAT.x, cz)], { capTop: true }))
    b.add(PLINTH, loft([polyRing(32, LAT.r + 0.15, 0, 0, LAT.x, cz), polyRing(32, LAT.r + 0.15, 0.7, 0, LAT.x, cz)], { capTop: true }))
    b.add(TRIM, loft([polyRing(32, LAT.r + 0.3, LAT.h - 0.35, 0, LAT.x, cz), polyRing(32, LAT.r + 0.3, LAT.h, 0, LAT.x, cz)], { capTop: true, capBottom: true }))
    const base = sz > 0 ? 90 : -90
    ringFrieze(b, LAT.x, cz, LAT.r, LAT.h - 1.4, base - 80, base + 80)
    for (const da of [-55, -20, 20, 55]) {
      const a = (base + da) * D2R
      const m = faceM(LAT.x + Math.cos(a) * LAT.r, cz + Math.sin(a) * LAT.r, Math.cos(a), Math.sin(a))
      bay(b, m, 0, 2.2, 1.7, 13.2, { w: 0.6, h: 8.4, y0: 4.2 })
    }
    // low dome
    const prof: P2[] = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      prof.push([(LAT.r + 0.35) * Math.cos((t * Math.PI) / 2) ** 0.75, LAT.h + 2.6 * Math.sin((t * Math.PI) / 2)])
    }
    b.add(CU, lathe(prof, 40), mat(LAT.x, 0, cz))
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2
      for (let i = 0; i < prof.length - 2; i++) {
        const [r0, y0] = prof[i]
        const [r1, y1] = prof[i + 1]
        b.beam(CU, V(LAT.x + Math.cos(a) * (r0 + 0.02), y0, cz + Math.sin(a) * (r0 + 0.02)), V(LAT.x + Math.cos(a) * (r1 + 0.02), y1, cz + Math.sin(a) * (r1 + 0.02)), 0.05, 0.05, V(Math.cos(a), 0, Math.sin(a)))
      }
    }
    b.beam(CU, V(LAT.x - LAT.r, LAT.h - 0.1, cz), V(LAT.x + LAT.r, LAT.h - 0.1, cz), 0.1, 0.01)
  }

  /* ================= altar apse ================= */
  {
    const { x, r, h } = ALT
    b.add(WALL, loft([polyRing(36, r, 0, 0, x, 0), polyRing(36, r, h, 0, x, 0)], { capTop: true }))
    b.add(PLINTH, loft([polyRing(36, r + 0.15, 0, 0, x, 0), polyRing(36, r + 0.15, 0.7, 0, x, 0)], { capTop: true }))
    b.add(TRIM, loft([polyRing(36, r + 0.3, h - 0.35, 0, x, 0), polyRing(36, r + 0.3, h, 0, x, 0)], { capTop: true, capBottom: true }))
    ringFrieze(b, x, 0, r, h - 1.4, -95, 95)
    for (const da of [-66, -38, -12, 12, 38, 66]) {
      const a = da * D2R
      const m = faceM(x + Math.cos(a) * r, Math.sin(a) * r, Math.cos(a), Math.sin(a))
      bay(b, m, 0, 3.0, 1.6, 11.8, { w: 0.55, h: 7.6, y0: 5.0 })
    }
    // small stepped buttresses around the base
    for (const da of [-72, -36, 0, 36, 72]) {
      const a = da * D2R
      const n = V(Math.cos(a), 0, Math.sin(a))
      const tg = V().crossVectors(n, UP)
      const prof = new THREE.Shape([
        new THREE.Vector2(-0.3, 0),
        new THREE.Vector2(2.3, 0),
        new THREE.Vector2(2.3, 2.6),
        new THREE.Vector2(1.3, 2.6),
        new THREE.Vector2(1.3, 4.4),
        new THREE.Vector2(-0.3, 4.4),
      ])
      const p = V(x + Math.cos(a) * r, 0, Math.sin(a) * r)
      b.add(WALL, extrude(prof, 1.9, 2), new THREE.Matrix4().makeBasis(n, UP, tg).setPosition(p.clone().sub(tg.clone().multiplyScalar(0.95))))
      const cap = (d0: number, d1: number, y: number) => b.add(CU, metricBox(2.05, 0.16, d1 - d0 + 0.15), new THREE.Matrix4().makeBasis(tg, UP, n).setPosition(p.clone().add(n.clone().multiplyScalar((d0 + d1) / 2)).setY(y + 0.08)))
      cap(1.3, 2.3, 2.6)
      cap(-0.3, 1.3, 4.4)
    }
    // tall conical roof
    const ro = r + 1.0
    const ye = h - 0.35
    const st: P2[] = [
      [ro, ye],
      [ro - 0.6, ye + 0.45],
      [0.12, ye + 14.2],
    ]
    seamedLoft(b, CU, st.map(([rr, yy]) => polyRing(36, rr, yy, 0, x, 0)))
    b.add(CU, loft([polyRing(36, ro, ye - 0.2, 0, x, 0), polyRing(36, ro, ye, 0, x, 0)]))
    b.add(CU, loft([polyRing(36, ro + 0.05, ye - 0.45, 0, x, 0), polyRing(36, ro + 0.05, ye - 0.2, 0, x, 0)])) // gutter
    b.add('gilt', new THREE.SphereGeometry(0.3, 12, 8), mat(x, ye + 14.3, 0))
    cross(b, 'gilt', x, ye + 14.3, 0, 3.0, false, Math.PI / 2)
  }

  /* ================= main tower ================= */
  {
    b.add(WALL, loft([polyRing(40, 8.4, 24, 0, TX, 0), polyRing(40, 8.4, 31.4, 0, TX, 0)], { capTop: true }))
    crown(b, TX, 31.6, 39.0, 8.6, 6.3)
    // glazed ring
    b.add(TRIM, loft([polyRing(32, 6.6, 39.0, 0, TX, 0), polyRing(32, 6.6, 39.4, 0, TX, 0)], { capTop: true, capBottom: true }))
    b.add(GLASS, loft([polyRing(32, 6.35, 39.4, 0, TX, 0), polyRing(32, 6.35, 40.8, 0, TX, 0)]))
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      b.add(TRIM, metricBox(0.3, 1.4, 0.3), mat(TX + Math.cos(a) * 6.42, 40.1, Math.sin(a) * 6.42, -a))
    }
    b.add(TRIM, loft([polyRing(32, 6.7, 40.8, 0, TX, 0), polyRing(32, 6.7, 41.2, 0, TX, 0)], { capTop: true, capBottom: true }))
    crown(b, TX, 41.4, 46.6, 6.6, 5.1)
    // cornice rings under the drum
    b.add(WALL, loft([polyRing(32, 5.4, 46.4, 0, TX, 0), polyRing(32, 5.4, 48.0, 0, TX, 0)], { capTop: true }))
    b.add(TRIM, loft([polyRing(32, 5.75, 46.7, 0, TX, 0), polyRing(32, 5.75, 47.0, 0, TX, 0)], { capTop: true, capBottom: true }))
    b.add(TRIM, loft([polyRing(32, 5.75, 47.6, 0, TX, 0), polyRing(32, 5.75, 48.0, 0, TX, 0)], { capTop: true, capBottom: true }))
    octDrum(b, TX, 0, 5.0, 48.0, 59.4, { w: 0.8, h: 7.6, y0: 49.8 })
    // octagonal spire
    const sp: P2[] = [
      [6.0, 59.3],
      [5.2, 60.1],
      [4.3, 61.5],
      [0.1, 74.6],
    ]
    seamedLoft(b, CU, sp.map(([r, y]) => polyRing(8, r, y, Math.PI / 8, TX, 0)), 0.48)
    b.add(CU, loft([polyRing(8, 6.0, 59.05, Math.PI / 8, TX, 0), polyRing(8, 6.0, 59.3, Math.PI / 8, TX, 0)]))
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4
      b.beam(CU, V(TX + Math.cos(a) * 4.32, 61.5, Math.sin(a) * 4.32), V(TX + Math.cos(a) * 0.12, 74.6, Math.sin(a) * 0.12), 0.12, 0.08)
    }
    b.add('gilt', new THREE.SphereGeometry(0.42, 14, 10), mat(TX, 74.9, 0))
    cross(b, 'gilt', TX, 74.8, 0, 4.5, false, Math.PI / 2)
  }

  /* ================= west towers ================= */
  for (const sz of [-1, 1]) {
    const cx = WT.x
    const cz = sz * WT.z
    const hw = 3.2
    b.block(WALL, hw * 2, 29.6 - 20, hw * 2, cx, 20, cz)
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as P2[]) {
      const m = faceM(cx + nx * hw, cz + nz * hw, nx, nz)
      archGable(b, M(m, mat(0, 0, 0.25)), hw * 2, 29.2, 29.6, 0.5)
      for (const u of [-0.75, 0.75]) {
        b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(0.55, 1.6, 30.0, 5, u))), M(m, mat(0, 0, 0.28)))
        b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(0.6, 1.9, 26.4, 5, u))), M(m, mat(0, 0, 0.03)))
      }
    }
    b.block(TRIM, hw * 2 + 0.3, 0.3, hw * 2 + 0.3, cx, 29.2, cz)
    // dark skirt from the square to the octagon
    const sq = (r: number, y: number) => {
      const out: THREE.Vector3[] = []
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4
        const s = k % 2 ? Math.SQRT2 : 1
        out.push(V(cx + Math.cos(a) * r * s, y, cz + Math.sin(a) * r * s))
      }
      return out
    }
    seamedLoft(b, CU, [sq(hw + 0.45, 29.5), polyRing(8, 3.1, 32.9, 0, cx, cz)], 0.45)
    // small octagonal stage
    const R1 = 2.95
    b.add(WALL, loft([polyRing(8, R1, 32.6, Math.PI / 8, cx, cz), polyRing(8, R1, 35.5, Math.PI / 8, cx, cz)], { capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const ap = R1 * Math.cos(Math.PI / 8)
      const m = faceM(cx + Math.cos(a) * ap, cz + Math.sin(a) * ap, Math.cos(a), Math.sin(a))
      b.add(GLASS, new THREE.ShapeGeometry(new THREE.Shape(archPts(0.45, 1.2, 33.5, 5))), M(m, mat(0, 0, 0.03)))
    }
    seamedLoft(b, CU, [polyRing(8, 3.55, 35.35, Math.PI / 8, cx, cz), polyRing(8, 3.3, 35.75, Math.PI / 8, cx, cz), polyRing(8, 2.8, 36.7, Math.PI / 8, cx, cz)], 0.45)
    octDrum(b, cx, cz, 2.75, 36.5, 43.9, { w: 0.5, h: 4.6, y0: 37.6 }, false)
    const sp: P2[] = [
      [3.35, 43.8],
      [2.85, 44.4],
      [0.07, 53.2],
    ]
    seamedLoft(b, CU, sp.map(([r, y]) => polyRing(8, r, y, Math.PI / 8, cx, cz)), 0.45)
    b.add(CU, loft([polyRing(8, 3.35, 43.6, Math.PI / 8, cx, cz), polyRing(8, 3.35, 43.8, Math.PI / 8, cx, cz)]))
    b.add('gilt', new THREE.SphereGeometry(0.3, 12, 8), mat(cx, 53.4, cz))
    cross(b, 'gilt', cx, 53.3, cz, 3.6, false, Math.PI / 2)
  }

  /* ================= west annex: open porch and pangars ================= */
  {
    const x0 = -36.4
    const x1 = XW
    const xc = (x0 + x1) / 2
    // open porch (centre)
    const ph = 9.0
    const front = new THREE.Shape([new THREE.Vector2(-5, 0), new THREE.Vector2(5, 0), new THREE.Vector2(5, ph), new THREE.Vector2(-5, ph)])
    front.holes.push(new THREE.Path(archPts(5.2, 7.0, 0, 12)))
    b.add(WALL, extrude(front, 0.8, 12), M(faceM(x0, 0, -1, 0), mat(0, 0, -0.8)))
    for (const sz of [-1, 1]) {
      const side = new THREE.Shape([new THREE.Vector2(-3.7, 0), new THREE.Vector2(3.7, 0), new THREE.Vector2(3.7, ph), new THREE.Vector2(-3.7, ph)])
      side.holes.push(new THREE.Path(archPts(3.2, 5.6, 0, 10)))
      b.add(WALL, extrude(side, 0.6, 10), M(faceM(xc, sz * 5, 0, sz), mat(0, 0, -0.6)))
    }
    b.block(TRIM, x1 - x0 + 0.4, 0.3, 10.4, xc, ph - 0.3, 0)
    b.block(SHADE, x1 - x0 - 1.2, 0.2, 8.8, xc, ph - 0.5, 0)
    b.add('sucMosaic', new THREE.ShapeGeometry(new THREE.Shape(archPts(4.2, 1.9, 0, 10))), faceM(x1 - 0.05, 0, -1, 0, 3.5))
    // hipped roof over the open porch
    {
      const ov = 0.4
      const y = ph - 0.1
      const t = Math.tan(38 * D2R)
      const hz = 5 + ov
      const top = y + hz * t
      const xa = x0 - ov
      const xb = x1
      facet(b, CU, [V(xa, y, hz), V(xb, y, hz), V(xb, top, 0), V(xa + hz, top, 0)], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [V(xb, y, -hz), V(xa, y, -hz), V(xa + hz, top, 0), V(xb, top, 0)], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [V(xa, y, -hz), V(xa, y, hz), V(xa + hz, top, 0)], { seams: SEAM, thickness: 0.1, hint: V(-1, 1, 0) })
      b.beam(CU, V(xa + hz, top + 0.05, 0), V(xb, top + 0.05, 0), 0.24, 0.14)
      cross(b, 'gilt', xa + hz, top, 0, 1.8, false, Math.PI / 2)
    }
    // pangars with vaulted roofs
    for (const sz of [-1, 1]) {
      const zc = sz * 8.3
      const hgt = 6.6
      b.block(WALL, x1 - x0 - 0.6, hgt, 6.6, xc + 0.3, 0, zc)
      b.block(PLINTH, x1 - x0, 0.6, 6.9, xc + 0.3, 0, zc)
      b.block(TRIM, x1 - x0 - 0.2, 0.3, 7.0, xc + 0.3, hgt - 0.3, zc)
      const mw = faceM(x0 + 0.6, zc, -1, 0)
      bay(b, mw, 0, 1.0, 2.6, 4.6, { w: 0.6, h: 2.6, y0: 2.0 })
      const ms = faceM(xc + 0.3, zc + sz * 3.3, 0, sz)
      for (const u of [-1.8, 1.8]) bay(b, ms, u, 1.0, 2.2, 4.6, { w: 0.6, h: 2.6, y0: 2.0 })
      barrelX(b, zc, hgt, 3.55, x0 + 0.1, x1, 10)
      // vault end discs (west)
      const disc = new THREE.Shape()
      disc.moveTo(3.3, 0)
      disc.absarc(0, 0, 3.3, 0, Math.PI, false)
      disc.lineTo(3.3, 0)
      b.add(WALL, extrude(disc, 0.3, 14), M(faceM(x0 + 0.3, zc, -1, 0, hgt), mat(0, 0, -0.3)))
      cross(b, 'gilt', x0 + 1.6, hgt + 3.5, zc, 1.6, false, Math.PI / 2)
    }
    // entrance steps
    for (let i = 0; i < 4; i++) b.block(PLINTH, 1.2 + i * 0.0, 0.16, 9 - i * 0.4, x0 - 0.6 - (3 - i) * 0.35, i * 0.16, 0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-14, 26, 6],
  materials: (base) => {
    // copper darkened to the near-black oxidised tone of the 2026 photographs
    const cu = (base.zincGraphite as THREE.MeshStandardMaterial).clone()
    cu.color = new THREE.Color('#8c8079')
    cu.roughness = 0.46
    return {
      sucCu: cu,
      sucTrim: new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.85 }),
      sucShade: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.92 }),
      sucMosaic: new THREE.MeshStandardMaterial({ color: '#5f7fa6', roughness: 0.55, metalness: 0.15 }),
    }
  },
  notes: 'Triconch cathedral with an 80 m main tower, two west towers and a conical altar apse; heights scaled from drone photographs against the published 80 m; roofs shown as photographed in dark oxidised copper (copper strip and copper rainwater system supplied by COLOR METAL).',
}
export default model
