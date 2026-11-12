/**
 * Școala Gimnazială nr. 95 („Școala comercială”), Str. Foișorului 111-113,
 * București — historic monument (OSM relation 17046698, start_date 1893).
 *
 * Modelling specification derived from the reference photographs (real metres):
 *  - Neo-Romanian perimeter block around a narrow courtyard (OSM multipolygon:
 *    outer ring ≈ 54 × 35 m + stepped east end, inner courtyard ≈ 35 × 11 m with
 *    a half-round stair projecting into it). Two storeys on a semi-basement,
 *    white render with grey window surrounds and recessed grey panels.
 *  - Street front faces west onto Str. Foișorului (−X, photo 01): a long
 *    façade with two raised risalits — a narrow north one with a pyramid
 *    roof over a band of five attic windows, a wider and taller south one with
 *    a short-ridged hip roof over its attic band; arched portals with small
 *    columns, a large arched window and the inscription panel
 *    (“ȘCOALA COMUNALĂ ȘI CĂMINUL CULTURAL”) between them.
 *  - Roofs — elZinc® Slate (pre-weathered mid-grey titanium-zinc), standing seams
 *    ≈ 0.5 m: hipped roofs over the four wings (front wing deeper and higher,
 *    side wings running into it), very deep eaves (≈ 1.2 m) on timber brackets
 *    with dark boarded soffits, light-grey zinc gutters and snow-guard rails;
 *    gabled dormers on the long side roofs; tall white chimneys with red-brick
 *    bands and blind-arcaded caps (photos 02, 04, 05).
 * Approximations: the façade is set square to the long axis (the real west
 * front is skewed ≈ 6°); the east end (stepped in plan) and the courtyard
 * elevations are not photographed and are simplified; dormer and chimney
 * counts, storey heights and roof pitches estimated from the photographs.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, faceFrame, opening, window_, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3
const D2R = Math.PI / 180

/* ---------------- dimensions ---------------- */
const XW = -30.3 // west (street) facade
const XC = -15.0 // courtyard face of the front wing
const XE = 22.6 // east face of the side wings
const ZN = -17.4 // north facade
const ZS = 17.3 // south facade
const ZCI = 5.6 // courtyard faces of the side wings (|z|)
const XCE = 19.7 // courtyard face of the east block
const E = 9.6 // wall top under the eaves
const OV = 1.2 // eave overhang
const PITCH = 34
const TP = Math.tan(PITCH * D2R)
const YE = E - OV * TP
const ROOF = 'zincSlate'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
const CAP = 's95Cap' // plain zinc for caps and dormer bodies
const WALL = 'plasterWhite'
const GREY = 's95Grey'
const TIMBER = 's95Timber'
const FRAME = 's95Frame'
const RIS_N = { z0: -13.4, z1: -8.6, x1: -26.0, top: 10.9 }
const RIS_S = { z0: 4.4, z1: 9.8, x1: -26.3, top: 12.8 }
const XR = XW - 0.5 // risalit fronts

/* ---------------- helpers ---------------- */

function clip(poly: P3[], axis: 'x' | 'z', c: number, keepLess: boolean): P3[] {
  const out: P3[] = []
  const val = (p: P3) => (axis === 'x' ? p.x : p.z) - c
  const inside = (p: P3) => (keepLess ? val(p) <= 1e-9 : val(p) >= -1e-9)
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const n = poly[(i + 1) % poly.length]
    const ia = inside(a)
    if (ia) out.push(a)
    if (ia !== inside(n)) out.push(a.clone().lerp(n, val(a) / (val(a) - val(n))))
  }
  return out
}

interface WingRoof {
  x0: number
  x1: number
  z0: number
  z1: number
  ye: number
  axis: 'x' | 'z'
  pitch: number
  end0: number | 'open'
  end1: number | 'open'
}

function wingRoof(w: WingRoof) {
  const alongX = w.axis === 'x'
  const a0 = alongX ? w.x0 : w.z0
  const a1 = alongX ? w.x1 : w.z1
  const c0 = alongX ? w.z0 : w.x0
  const c1 = alongX ? w.z1 : w.x1
  const P = (a: number, y: number, c: number) => (alongX ? V(a, y, c) : V(c, y, a))
  const cc = (c0 + c1) / 2
  const yr = w.ye + ((c1 - c0) / 2) * Math.tan(w.pitch * D2R)
  const rise = yr - w.ye
  let ra = w.end0 === 'open' ? a0 : a0 + rise / Math.tan(w.end0 * D2R)
  let rb = w.end1 === 'open' ? a1 : a1 - rise / Math.tan(w.end1 * D2R)
  if (ra > rb) ra = rb = (ra + rb) / 2
  const e00 = P(a0, w.ye, c0)
  const e01 = P(a0, w.ye, c1)
  const e10 = P(a1, w.ye, c0)
  const e11 = P(a1, w.ye, c1)
  const ra3 = P(ra, yr, cc)
  const rb3 = P(rb, yr, cc)
  const faces: { pts: P3[]; side: 'c1' | 'c0' | 'a0' | 'a1' }[] = [
    { pts: [e01, e11, rb3, ra3], side: 'c1' },
    { pts: [e10, e00, ra3, rb3], side: 'c0' },
  ]
  const hips: [P3, P3][] = []
  if (w.end0 !== 'open') {
    faces.push({ pts: [e00, e01, ra3], side: 'a0' })
    hips.push([e00, ra3], [e01, ra3])
  }
  if (w.end1 !== 'open') {
    faces.push({ pts: [e11, e10, rb3], side: 'a1' })
    hips.push([e10, rb3], [e11, rb3])
  }
  return { faces, ridge: [ra3, rb3] as [P3, P3], hips, yr, eaves: { e00, e01, e10, e11 } }
}

function roofFace(b: Builder, pts: P3[]) {
  if (pts.length >= 3) facet(b, ROOF, pts, { seams: SEAM, thickness: 0.08 })
}

function caps(b: Builder, r: ReturnType<typeof wingRoof>, ridge = true) {
  const up = V(0, 0.05, 0)
  if (ridge && r.ridge[0].distanceTo(r.ridge[1]) > 0.05) b.beam(CAP, r.ridge[0].clone().add(up), r.ridge[1].clone().add(up), 0.26, 0.12)
  for (const [p, q] of r.hips) b.beam(CAP, p.clone().add(up), q.clone().add(up), 0.2, 0.1)
}

/** Dark boarded soffit under the overhang part of a roof face (wall line given as half-space). */
function soffit(b: Builder, pts: P3[], axis: 'x' | 'z', wall: number, outsideIsLess: boolean) {
  const s = clip(pts, axis, wall, outsideIsLess)
  if (s.length < 3) return
  facet(b, TIMBER, s.map((p) => p.clone().add(V(0, -0.1, 0))), { hint: V(0, -1, 0) })
}

/** Timber brackets under an eave: from the wall top out to the eave edge. n = outward unit (x or z). */
function brackets(b: Builder, a: P3, c: P3, n: P3, step = 1.25, reach = OV - 0.15, slope = TP) {
  const L = a.distanceTo(c)
  const k = Math.max(1, Math.round(L / step))
  for (let i = 0; i <= k; i++) {
    const p = a.clone().lerp(c, i / k)
    const w0 = p.clone().add(V(0, -0.55, 0))
    const w1 = p.clone().add(n.clone().multiplyScalar(reach)).add(V(0, -reach * slope - 0.22, 0))
    b.beam(TIMBER, w0, w1, 0.12, 0.2)
  }
}

const uOf = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** Window with grey surround and sill. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: 'rect' | 'round' = 'rect') {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.07, frameKey: FRAME, inset: 0.06, bars: [2, 3], sill: false })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(GREY, extrude(frameShape(type, w, h, 0.2, 0, y0), 0.08), M(m, mat(0, 0, 0.01)))
  b.add(GREY, metricBox(w + 0.5, 0.12, 0.24), M(m, mat(0, y0 - 0.22, 0.1)))
}

/** Recessed grey panel framed by a white border (the façade rhythm of photos 02, 04). */
function panel(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(GREY, metricBox(w, h, 0.04), M(m, mat(0, y0 + h / 2, 0.02)))
  b.add('plasterWhite', extrude(frameShape('rect', w, h, 0.16, 0, y0), 0.07), M(m, mat(0, 0, 0.0)))
  b.add(GREY, extrude(frameShape('rect', w + 0.32, h + 0.32, 0.08, 0, y0 - 0.16), 0.08), M(m, mat(0, 0, 0.0)))
}

function chimney(b: Builder, x: number, z: number, yBase: number, top: number, w = 1.0, d = 0.8) {
  b.block(WALL, w, top - yBase, d, x, yBase, z)
  for (const y of [top - 1.55, top - 0.95]) b.block('brickRed', w + 0.04, 0.12, d + 0.04, x, y, z)
  for (const s of [-1, 1]) b.block('brickRed', 0.22, 0.12, d + 0.05, x + s * (w / 2 - 0.11), top - 1.25, z)
  b.block(WALL, w + 0.16, 0.7, d + 0.16, x, top - 0.75, z)
  for (let i = 0; i < 4; i++) {
    const u = -w / 2 + 0.2 + i * ((w - 0.4) / 3)
    b.add(GREY, metricBox(0.1, 0.32, 0.02), mat(x + u, top - 0.42, z + d / 2 + 0.09))
    b.add(GREY, metricBox(0.1, 0.32, 0.02), mat(x + u, top - 0.42, z - d / 2 - 0.09))
  }
  b.block(GREY, w + 0.3, 0.12, d + 0.3, x, top - 0.05, z)
  b.block(ROOF, w + 0.1, 0.12, d + 0.1, x, top + 0.07, z)
}

/** Gabled dormer on a roof face (local frame: u along facade, z outward, wall plane z = 0 where the roof is at yWall). */
function gabledDormer(b: Builder, m: THREE.Matrix4, yWall: number, t: number, s0: number) {
  const g = new Builder()
  const w = 1.35
  const hF = 1.25
  const y0 = yWall + s0 * t
  const yE = y0 + hF
  const gp = Math.tan(45 * D2R)
  const yR = yE + (w / 2 + 0.25) * gp
  const sBack = (yR - yWall) / t + 0.3
  // cheeks and front
  g.add(CAP, metricBox(w, hF + 0.4, 0.1), mat(0, y0 + (hF - 0.4) / 2, -s0))
  g.add('black', metricBox(w - 0.45, hF - 0.45, 0.04), mat(0, y0 + 0.2 + (hF - 0.45) / 2, -s0 + 0.06))
  g.add(TIMBER, metricBox(w - 0.35, 0.08, 0.06), mat(0, y0 + 0.2, -s0 + 0.08))
  for (const s of [-1, 1]) {
    const sTop = (yE - yWall) / t
    facet(g, CAP, [V((s * w) / 2, y0 - 0.1, -s0), V((s * w) / 2, yE, -s0), V((s * w) / 2, yE, -sTop)], { hint: V(s, 0, 0) })
  }
  // timber gable infill
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, yE), new THREE.Vector2(w / 2, yE), new THREE.Vector2(0, yR - 0.1)])
  g.add(TIMBER, extrude(tri, 0.06), mat(0, 0, -s0 - 0.02))
  // gable roof with overhang
  const ow = w / 2 + 0.25
  for (const s of [-1, 1]) {
    facet(g, CAP, [V(0, yR, -s0 + 0.35), V(s * ow, yR - ow * gp, -s0 + 0.35), V(s * ow, yR - ow * gp, -sBack), V(0, yR, -sBack)], { thickness: 0.06 })
  }
  g.beam(CAP, V(0, yR + 0.04, -s0 + 0.35), V(0, yR + 0.04, -sBack), 0.12, 0.08)
  b.merge(g, m)
}

function downpipe(b: Builder, x: number, z: number) {
  b.rod(ROOF, V(x, 0.3, z), V(x, E - 0.15, z), 0.065, 8)
}

/* ---------------- model ---------------- */

function build(): Builder {
  const b = new Builder()

  /* ---------- masses ---------- */
  const blocks: [number, number, number, number][] = [
    [XW, XC + 0.1, ZN, ZS], // front (west) wing
    [XC, XE, ZN, -ZCI], // north wing
    [XC, XE, ZCI, ZS], // south wing
    [XCE, 25.6, -12.7, 13.3], // east block (stepped end, simplified)
    [25.6, 31.3, -8.6, 9.8],
  ]
  for (const [x0, x1, z0, z1] of blocks) {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    b.block(WALL, x1 - x0, E, z1 - z0, cx, 0, cz)
    b.block(GREY, x1 - x0 + 0.14, 1.25, z1 - z0 + 0.14, cx, 0, cz) // plinth (semi-basement)
    b.block(GREY, x1 - x0 + 0.1, 0.16, z1 - z0 + 0.1, cx, 5.35, cz) // floor band
    b.block(GREY, x1 - x0 + 0.12, 0.28, z1 - z0 + 0.12, cx, E - 0.75, cz) // frieze band
  }
  // half-round stair projecting into the courtyard
  b.add(WALL, new THREE.CylinderGeometry(3.3, 3.3, E - 0.4, 24, 1, false, Math.PI, Math.PI), mat(XCE, (E - 0.4) / 2, 1.2))
  b.add(ROOF, new THREE.CylinderGeometry(0.1, 3.6, 1.6, 24, 1, false, Math.PI, Math.PI), mat(XCE, E - 0.4 + 0.8, 1.2))
  // risalits
  for (const r of [RIS_N, RIS_S]) {
    const cz = (r.z0 + r.z1) / 2
    b.block(WALL, r.x1 - XR, r.top, r.z1 - r.z0, (XR + r.x1) / 2, 0, cz)
    b.block(GREY, 0.2, 1.25, r.z1 - r.z0 + 0.14, XR - 0.04, 0, cz)
    b.block(GREY, r.x1 - XR + 0.12, 0.28, r.z1 - r.z0 + 0.12, (XR + r.x1) / 2, r.top - 0.75, cz)
    b.block(GREY, 0.1, 0.16, r.z1 - r.z0 + 0.1, XR - 0.02, 5.35, cz)
  }

  /* ---------- street front (−X) ---------- */
  const F: Face = '-x'
  const u = (z: number) => uOf(F, 0, z)
  // north part: twin arched windows, upper window with panels
  for (const z of [-16.1, -15.0]) win(b, F, XW, u(z), 2.2, 0.8, 2.6, 'round')
  win(b, F, XW, u(-15.55), 6.3, 1.3, 2.1)
  panel(b, F, XW, u(-16.8), 6.2, 0.9, 2.2)
  panel(b, F, XW, u(-14.3), 6.2, 0.9, 2.2)
  // risalits: arched portals with colonnettes, window above, attic band
  const portal = (zc: number, plane: number) => {
    const m = faceFrame(F, plane, u(zc), 0, 0)
    b.add('s95Door', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.3, 4.0, 0, 0.3, 12))), M(m, mat(0, 0, 0.03)))
    b.add(GREY, extrude(frameShape('round', 2.3, 4.0, 0.42, 0, 0.3), 0.18), m)
    b.add(GREY, extrude(frameShape('round', 3.1, 4.6, 0.12, 0, 0.0), 0.1), m)
    for (const s of [-1, 1]) {
      b.add('plasterWhite', new THREE.CylinderGeometry(0.11, 0.12, 2.6, 10), M(m, mat(s * 1.35, 1.6, 0.25)))
      b.add(GREY, metricBox(0.34, 0.24, 0.34), M(m, mat(s * 1.35, 3.0, 0.25)))
      b.add(GREY, metricBox(0.34, 0.24, 0.34), M(m, mat(s * 1.35, 0.3, 0.25)))
    }
  }
  for (const r of [RIS_N, RIS_S]) {
    const zc = (r.z0 + r.z1) / 2
    portal(zc, XR)
    win(b, F, XR, u(zc), 6.3, 1.25, 2.1)
    b.add(GREY, metricBox(1.5, 0.35, 0.3), M(faceFrame(F, XR, u(zc), 0, 0), mat(0, 6.0, 0.15)))
    // attic band
    const n = 5
    const width = r.z1 - r.z0 - 0.9
    const yA = r === RIS_N ? 9.55 : 10.75
    const hA = r === RIS_N ? 0.85 : 1.25
    for (let i = 0; i < n; i++) {
      const zz = r.z0 + 0.45 + (width / n) * (i + 0.5)
      window_(b, F, XR, u(zz), yA, { w: width / n - 0.3, h: hA, frame: 0.06, frameKey: FRAME, inset: 0.06, bars: [1, 2] })
      b.add(GREY, extrude(frameShape('rect', width / n - 0.3, hA, 0.12, 0, yA), 0.06), M(faceFrame(F, XR, u(zz), 0, 0), mat(0, 0, 0.01)))
    }
    b.add(GREY, metricBox(0.12, 0.16, r.z1 - r.z0), mat(XR - 0.06, yA - 0.3, zc))
    // the risalit attic also shows on the side walls above the main roof
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '+z' : '-z'
      const plane = s > 0 ? r.z1 : r.z0
      const xm = (XR + r.x1) / 2 - 0.4
      window_(b, face, plane, uOf(face, xm, 0), yA, { w: 0.6, h: hA, frame: 0.06, frameKey: FRAME })
    }
  }
  // middle: big arched window, ground windows, inscription panel, upper panels
  win(b, F, XW, u(0.7), 2.4, 2.8, 3.5, 'round')
  for (const z of [-6.9, -4.6, 3.3]) win(b, F, XW, u(z), 2.4, 0.9, 2.1)
  {
    const m = faceFrame(F, XW, u(-1.6), 0, 0)
    b.add(GREY, metricBox(9.4, 1.0, 0.06), M(m, mat(0, 7.55, 0.03)))
    b.add('s95Panel', metricBox(9.0, 0.7, 0.04), M(m, mat(0, 7.55, 0.07)))
    for (let i = 0; i < 26; i++) b.add(GREY, metricBox(0.2, 0.34, 0.03), M(m, mat(-4.1 + i * 0.33 + (i > 5 ? 0.15 : 0) + (i > 14 ? 0.15 : 0) + (i > 16 ? 0.15 : 0), 7.55, 0.1)))
  }
  for (const z of [-7.4, 3.5]) panel(b, F, XW, u(z), 6.2, 1.4, 1.9)
  win(b, F, XW, u(1.3), 6.4, 1.2, 1.4)
  // south part: wide window with panels, ground windows
  win(b, F, XW, u(13.4), 6.3, 2.6, 2.1)
  panel(b, F, XW, u(11.2), 6.2, 1.0, 2.2)
  panel(b, F, XW, u(15.8), 6.2, 1.0, 2.2)
  for (const z of [11.3, 13.4, 15.6]) win(b, F, XW, u(z), 2.4, 1.1, 2.3)
  // basement windows
  for (const z of [-16.4, -14.6, -6.5, -3.0, 0.7, 3.4, 12.0, 14.8]) b.add('black', metricBox(0.04, 0.5, 1.0), mat(XW - 0.03, 0.75, z))

  /* ---------- long side façades (±Z) & east, courtyard ---------- */
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = s > 0 ? ZS : ZN
    for (let x = XW + 3.2; x < XE - 1; x += 3.05) {
      win(b, face, plane, uOf(face, x, 0), 2.2, 1.15, 2.3)
      win(b, face, plane, uOf(face, x, 0), 6.15, 1.15, 2.3)
      b.add('black', metricBox(0.9, 0.45, 0.04), M(faceFrame(face, plane, uOf(face, x, 0), 0, 0), mat(0, 0.75, 0.02)))
      if (x + 1.52 < XE - 1) {
        panel(b, face, plane, uOf(face, x + 1.52, 0), 2.1, 1.1, 2.4)
        panel(b, face, plane, uOf(face, x + 1.52, 0), 6.05, 1.1, 2.4)
      }
    }
    // courtyard faces of the side wings
    const cf: Face = s > 0 ? '-z' : '+z'
    for (let x = XC + 2.2; x < 15.5; x += 3.4) {
      win(b, cf, s * ZCI, uOf(cf, x, 0), 2.2, 1.15, 2.3)
      win(b, cf, s * ZCI, uOf(cf, x, 0), 6.15, 1.15, 2.3)
    }
  }
  for (const z of [-3.4, 0, 3.4]) {
    win(b, '+x', XC, uOf('+x', 0, z), 2.2, 1.15, 2.3)
    win(b, '+x', XC, uOf('+x', 0, z), 6.15, 1.15, 2.3)
  }
  // east end
  for (const z of [-11.2, -14.6]) {
    win(b, '+x', XE, uOf('+x', 0, z), 2.2, 1.15, 2.3)
    win(b, '+x', XE, uOf('+x', 0, z), 6.15, 1.15, 2.3)
    win(b, '+x', XE, uOf('+x', 0, -z + 1.0), 2.2, 1.15, 2.3)
    win(b, '+x', XE, uOf('+x', 0, -z + 1.0), 6.15, 1.15, 2.3)
  }
  for (const z of [-6.0, -2.5, 1.0, 4.5, 8.0]) {
    win(b, '+x', 31.3, uOf('+x', 0, z), 2.2, 1.15, 2.3)
    win(b, '+x', 31.3, uOf('+x', 0, z), 6.15, 1.15, 2.3)
  }

  /* ---------- roofs (elZinc Slate) ---------- */
  const oEnd = (E - YE) / Math.tan(40 * D2R)
  // front wing: ridge along Z, steeper end hips, eave overhang everywhere
  const front = wingRoof({ x0: XW - OV, x1: XC + OV, z0: ZN - oEnd, z1: ZS + oEnd, ye: YE, axis: 'z', pitch: PITCH, end0: 40, end1: 40 })
  for (const f of front.faces) {
    if (f.side === 'c0') {
      // west face: cut out in front of the two risalits
      let rest = f.pts
      const parts: P3[][] = []
      for (const r of [RIS_N, RIS_S]) {
        parts.push(clip(rest, 'z', r.z0, true))
        parts.push(clip(clip(clip(rest, 'z', r.z0, false), 'z', r.z1, true), 'x', XR + 0.2, false))
        rest = clip(rest, 'z', r.z1, false)
      }
      parts.push(rest)
      for (const p of parts) {
        roofFace(b, p)
        soffit(b, p, 'x', XW, true)
      }
    } else {
      roofFace(b, f.pts)
      if (f.side === 'a0') soffit(b, f.pts, 'z', ZN, true)
      if (f.side === 'a1') soffit(b, f.pts, 'z', ZS, false)
    }
  }
  caps(b, front)
  // side wings: ridge along X, open west end (into the front-wing roof), east hip
  const sides = [-1, 1].map((s) => {
    const z0 = s < 0 ? ZN - OV : ZCI - OV
    const z1 = s < 0 ? -ZCI + OV : ZS + OV
    const r = wingRoof({ x0: -22, x1: XE + OV, z0, z1, ye: YE, axis: 'x', pitch: PITCH, end0: 'open', end1: PITCH })
    for (const f of r.faces) {
      roofFace(b, f.pts)
      if (f.side === 'c0') soffit(b, f.pts, 'z', s < 0 ? ZN : ZCI, true)
      if (f.side === 'c1') soffit(b, f.pts, 'z', s < 0 ? -ZCI : ZS, false)
      if (f.side === 'a1') soffit(b, f.pts, 'x', XE, false)
    }
    caps(b, r)
    return r
  })
  // east block (lower, ridge along Z) and its projection
  const east = wingRoof({ x0: XCE - OV, x1: 25.6 + OV, z0: -12.7 - OV, z1: 13.3 + OV, ye: YE, axis: 'z', pitch: PITCH, end0: PITCH, end1: PITCH })
  for (const f of east.faces) roofFace(b, f.pts)
  caps(b, east)
  const eastP = wingRoof({ x0: XCE - OV, x1: 31.3 + OV, z0: -8.6 - OV, z1: 9.8 + OV, ye: YE, axis: 'z', pitch: PITCH, end0: PITCH, end1: PITCH })
  for (const f of eastP.faces) roofFace(b, f.pts)
  caps(b, eastP)
  // risalit roofs: pyramid (north), short-ridged hip (south)
  for (const r of [RIS_N, RIS_S]) {
    const ye = r.top - OV * Math.tan(33 * D2R)
    const rr = wingRoof({ x0: XR - OV, x1: r.x1 + OV, z0: r.z0 - OV, z1: r.z1 + OV, ye, axis: 'z', pitch: 33, end0: 33, end1: 33 })
    for (const f of rr.faces) {
      roofFace(b, f.pts)
      if (f.side === 'c0') soffit(b, f.pts, 'x', XR, true)
      if (f.side === 'a0') soffit(b, f.pts, 'z', r.z0, true)
      if (f.side === 'a1') soffit(b, f.pts, 'z', r.z1, false)
    }
    caps(b, rr)
    const e = rr.eaves
    brackets(b, V(XR, r.top, r.z0 + 0.3), V(XR, r.top, r.z1 - 0.3), V(-1, 0, 0), 0.9)
    for (const [p, q] of [[e.e00, e.e01], [e.e00, e.e10], [e.e01, e.e11]] as [P3, P3][]) b.rod(ROOF, p.clone().add(V(0, -0.08, 0)), q.clone().add(V(0, -0.08, 0)), 0.09, 8)
  }

  /* ---------- eave brackets, gutters, rails ---------- */
  const gut = (p: P3, q: P3) => b.rod(ROOF, p.clone().add(V(0, -0.08, 0)), q.clone().add(V(0, -0.08, 0)), 0.1, 8)
  // street front
  brackets(b, V(XW, E, ZN + 0.4), V(XW, E, RIS_N.z0 - 0.3), V(-1, 0, 0))
  brackets(b, V(XW, E, RIS_N.z1 + 0.3), V(XW, E, RIS_S.z0 - 0.3), V(-1, 0, 0))
  brackets(b, V(XW, E, RIS_S.z1 + 0.3), V(XW, E, ZS - 0.4), V(-1, 0, 0))
  gut(V(XW - OV, YE, ZN - oEnd), V(XW - OV, YE, RIS_N.z0))
  gut(V(XW - OV, YE, RIS_N.z1), V(XW - OV, YE, RIS_S.z0))
  gut(V(XW - OV, YE, RIS_S.z1), V(XW - OV, YE, ZS + oEnd))
  // long sides
  for (const s of [-1, 1]) {
    const z = s < 0 ? ZN : ZS
    brackets(b, V(XC + 0.6, E, z), V(XE - 0.4, E, z), V(0, 0, s))
    brackets(b, V(XW + 0.4, E, z), V(XC - 0.4, E, z), V(0, 0, s), 1.25, (E - YE) / Math.tan(40 * D2R) - 0.12, Math.tan(40 * D2R))
    gut(V(XW - OV, YE, z + s * OV), V(XE + OV, YE, z + s * OV))
    gut(V(XC + OV, YE, s * (ZCI - OV)), V(XCE - OV, YE, s * (ZCI - OV)))
    // snow-guard rails
    const yr = YE + 1.3 * TP + 0.12
    b.rod('aluNatural', V(XW + 1.5, yr, z + s * (OV - 1.3)), V(XE - 1.5, yr, z + s * (OV - 1.3)), 0.03, 5)
    b.rod('aluNatural', V(XW + 1.5, yr + 0.13, z + s * (OV - 1.3)), V(XE - 1.5, yr + 0.13, z + s * (OV - 1.3)), 0.03, 5)
  }
  b.rod('aluNatural', V(XW - OV + 1.3, YE + 1.3 * TP + 0.12, ZN + 1), V(XW - OV + 1.3, YE + 1.3 * TP + 0.12, ZS - 1), 0.03, 5)
  // downpipes
  for (const z of [ZN + 0.3, RIS_N.z0 - 0.25, RIS_N.z1 + 0.25, RIS_S.z0 - 0.25, RIS_S.z1 + 0.25, ZS - 0.3]) downpipe(b, XW - 0.15, z)
  for (const s of [-1, 1]) for (const x of [-22, -10, 2, 14]) downpipe(b, x, s * ((s < 0 ? -ZN : ZS) + 0.15))

  /* ---------- dormers & chimneys ---------- */
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = s > 0 ? ZS : ZN
    for (const x of [-8.5, -1.5, 5.5, 12.5]) gabledDormer(b, faceFrame(face, plane, uOf(face, x, 0), 0, 0), E, TP, 2.2)
    // chimneys near the ridge of the side wings
    const zr = s * ((ZCI + (s < 0 ? -ZN : ZS)) / 2)
    for (const x of [-12, -5, 2, 9, 16]) chimney(b, x, zr + s * 0.9, 11.5, sides[0].yr + 2.1)
  }
  chimney(b, -24.5, -11.0, 12.0, front.yr + 1.9, 1.1, 0.85)
  chimney(b, -24.5, 12.6, 12.0, front.yr + 2.3, 1.1, 0.85)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-26, 12.5, 0],
  materials: () => ({
    s95Grey: new THREE.MeshStandardMaterial({ color: '#9da0a2', roughness: 0.85 }),
    s95Cap: new THREE.MeshStandardMaterial({ color: '#868b90', roughness: 0.62, metalness: 0.3 }),
    s95Timber: new THREE.MeshStandardMaterial({ color: '#4a3528', roughness: 0.8 }),
    s95Frame: new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: 0.65 }),
    s95Door: new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.7 }),
    s95Panel: new THREE.MeshStandardMaterial({ color: '#e6e4df', roughness: 0.88 }),
  }),
  notes: 'elZinc Slate hipped roofs with deep bracketed eaves; west street front from the photographs, east end and courtyard simplified.',
}
export default model
