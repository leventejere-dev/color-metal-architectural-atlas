/**
 * Liceul Teoretic „Ady Endre”, Bd. Ferdinand I 89, București (OSM way 132404249).
 *
 * Modelling specification derived from the reference photographs (real metres):
 *  - Historic two-storey school, white render with grey trim, on a low plinth.
 *    OSM outline 34.6 × 27.7 m (long axis 59.3°); the street front faces SE onto
 *    Bd. Ferdinand I (+Z). Plan read as a U: a front wing along the boulevard
 *    (≈ 14.5 m deep) and two rear wings (≈ 12.5 m wide) flush with the side
 *    elevations, enclosing a small rear courtyard.
 *  - Front (photos 04, 05): central risalit of three bays, slightly projecting,
 *    raised by ≈ 2 m with a frieze band (“LICEUL ADY ENDRE LICEUM”) under its
 *    own deep eave; three bays on either side. Ground floor: rectangular
 *    windows, central entrance; first floor: round-arched windows with grey
 *    archivolts, impost band, grey panels between the floors.
 *  - Roofs — elZinc® Graphite (dark pre-weathered titanium-zinc), standing
 *    seams ≈ 0.5 m, graphite rainwater system: tall hipped roof over the front
 *    wing (≈ 42°, steeper end hips); a cross roof over the risalit ending in a
 *    front hip and running back into the main roof (photo 03: side face +
 *    valley); hipped rear wings whose lower ridges die into the front-wing roof
 *    — the stepped corner with the long diagonal hip seen in photos 01, 06, 07,
 *    10, 12. Box (shed) dormers with paired windows, a small dormer at the top
 *    of the risalit roof, snow-guard rails, lightning rod on the main ridge,
 *    graphite gutters and downpipes.
 * Approximations: the plan (U-shape, wing depths) is interpreted from the
 * photographs and a coarse aerial view — the OSM outline is a plain rectangle;
 * the courtyard elevations and rear-wing ends are not photographed (window
 * rhythm repeated); ornament (fretwork valance, lettering, mouldings) simplified;
 * storey heights estimated from window sizes.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, faceFrame, window_, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3
const D2R = Math.PI / 180

/* ---------------- dimensions ---------------- */
const XH = 17.3 // half length (X)
const ZF = 13.4 // front facade of the side parts
const ZR = 13.85 // front face of the risalit
const ZB = -13.85 // rear end of the rear wings
const ZW = -1.15 // rear facade of the front wing
const XI = 4.8 // courtyard faces of the rear wings (|x|)
const RW = 5.2 // risalit half width
const E = 10.6 // wall top / eave line of the main roof
const ER = 12.5 // wall top of the risalit
const OV = 0.85 // eave overhang (horizontal) of the 42° faces
const T42 = Math.tan(42 * D2R)
const YE = E - OV * T42 // eave height of the roof edges
const ROOF = 'zincGraphite'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
const CAP = 'adyCap' // plain graphite for caps, dormer bodies and flashings
const GREY = 'adyGrey'
const FRAME = 'adyFrame'
const WALL = 'plasterWhite'

/* ---------------- helpers ---------------- */

/** Clip a convex polygon by the half-space  axis ≤ c  (keepLess) or  axis ≥ c. */
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
  /** roof rectangle at eave height (overhang included) */
  x0: number
  x1: number
  z0: number
  z1: number
  ye: number
  axis: 'x' | 'z'
  pitch: number
  /** end pitches (deg) or 'open' (roof runs on into another roof) */
  end0: number | 'open'
  end1: number | 'open'
}

/** Hipped / open-ended wing roof → planar faces + ridge & hip lines. */
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
  if (pts.length >= 3) facet(b, ROOF, pts, { seams: SEAM, thickness: 0.1 })
}

function caps(b: Builder, r: ReturnType<typeof wingRoof>, ridge = true) {
  const up = V(0, 0.05, 0)
  if (ridge) b.beam(CAP, r.ridge[0].clone().add(up), r.ridge[1].clone().add(up), 0.24, 0.12)
  for (const [p, q] of r.hips) b.beam(CAP, p.clone().add(up), q.clone().add(up), 0.2, 0.1)
}

/** Facade-local u coordinate of a world position along the facade. */
const uOf = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)

/** Shed (box) dormer on a roof face. Local frame: u along the facade, z outward, wall plane at z = 0 where the roof is at yWall. */
function shedDormer(b: Builder, m: THREE.Matrix4, o: { yWall: number; t: number; s0: number; w: number; hF: number; panes?: number }) {
  const g = new Builder()
  const { yWall, t, s0, w, hF } = o
  const td = Math.tan(12 * D2R)
  const y0 = yWall + s0 * t
  const s1 = s0 + hF / (t - td)
  const yTop = y0 + hF
  // front wall (zinc-clad box) with paired windows
  g.add(CAP, metricBox(w, hF + 0.35, 0.12), mat(0, y0 + (hF - 0.35) / 2, -s0))
  const panes = o.panes ?? 2
  const pw = (w - 0.5) / panes
  for (let i = 0; i < panes; i++) {
    const u = -w / 2 + 0.25 + pw * (i + 0.5)
    g.add(FRAME, metricBox(pw - 0.06, hF - 0.32, 0.08), mat(u, y0 + 0.16 + (hF - 0.32) / 2, -s0 + 0.07))
    g.add('glassC', metricBox(pw - 0.22, hF - 0.48, 0.02), mat(u, y0 + 0.16 + (hF - 0.32) / 2, -s0 + 0.115))
  }
  // cheeks
  for (const s of [-1, 1]) facet(g, CAP, [V((s * w) / 2, y0 - 0.05, -s0), V((s * w) / 2, yTop, -s0), V((s * w) / 2, yWall + s1 * t, -s1)], { hint: V(s, 0, 0) })
  // dormer roof (shallow shed)
  const ow = w / 2 + 0.12
  facet(g, CAP, [V(-ow, yTop + 0.04, -s0 + 0.18), V(ow, yTop + 0.04, -s0 + 0.18), V(ow, yWall + s1 * t + 0.03, -s1 - 0.1), V(-ow, yWall + s1 * t + 0.03, -s1 - 0.1)], { thickness: 0.06 })
  g.add(CAP, metricBox(2 * ow + 0.04, 0.1, 0.1), mat(0, yTop + 0.02, -s0 + 0.2))
  b.merge(g, m)
}

/** Ground-floor rectangular window. */
function groundWin(b: Builder, face: Face, plane: number, u: number) {
  window_(b, face, plane, u, 1.55, { w: 1.45, h: 2.45, frame: 0.08, frameKey: FRAME, inset: 0.06, bars: [2, 3], sill: false })
  // plain grey surround + sill
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(GREY, extrude(frameShape('rect', 1.45, 2.45, 0.16, 0, 1.55), 0.06), m)
  b.add(GREY, metricBox(1.95, 0.12, 0.22), new THREE.Matrix4().multiplyMatrices(m, mat(0, 1.4, 0.1)))
}

/** First-floor round-arched window with grey archivolt and sill panel. */
function upperWin(b: Builder, face: Face, plane: number, u: number, y0 = 5.75) {
  window_(b, face, plane, u, y0, { type: 'round', w: 1.45, h: 2.95, frame: 0.08, frameKey: FRAME, inset: 0.06, bars: [2, 2], sill: false })
  const m = faceFrame(face, plane, u, 0, 0)
  const M = (x: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(m, x)
  b.add(GREY, extrude(frameShape('round', 1.45, 2.95, 0.34, 0, y0), 0.1), M(mat(0, 0, 0.01)))
  b.add(GREY, metricBox(2.05, 0.14, 0.26), M(mat(0, y0 - 0.12, 0.12)))
  // grey panel under the window (between the floors)
  b.add(GREY, metricBox(1.75, 0.62, 0.05), M(mat(0, y0 - 0.95, 0.03)))
}

function downpipe(b: Builder, x: number, z: number, y1 = YE + 0.05) {
  b.rod(ROOF, V(x, 0.25, z), V(x, y1 - 0.25, z), 0.06, 8)
}

/* ---------------- model ---------------- */

function build(): Builder {
  const b = new Builder()

  /* ---------- masses ---------- */
  // front wing
  b.block(WALL, 2 * XH, E, ZF - ZW, 0, 0, (ZF + ZW) / 2)
  // rear wings
  for (const s of [-1, 1]) b.block(WALL, XH - XI, E, ZW - ZB + 0.1, (s * (XH + XI)) / 2, 0, (ZW + ZB) / 2 + 0.05)
  // risalit (raised, slightly projecting)
  b.block(WALL, 2 * RW, ER, ZR - 11.0, 0, 0, (ZR + 11.0) / 2)

  // plinth, bands (front wing + rear wings as one outline)
  const outline: [number, number, number, number][] = [
    [-XH, XH, ZW, ZF], // front wing
    [-XH, -XI, ZB, ZW],
    [XI, XH, ZB, ZW],
  ]
  for (const [x0, x1, z0, z1] of outline) {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const w = x1 - x0
    const d = z1 - z0
    b.block('adyPlinth', w + 0.16, 0.9, d + 0.16, cx, 0, cz)
    b.block(GREY, w + 0.12, 0.2, d + 0.12, cx, 4.75, cz) // string course
    b.block(GREY, w + 0.08, 0.14, d + 0.08, cx, 7.25, cz) // impost band
    b.block(GREY, w + 0.2, 0.32, d + 0.2, cx, E - 0.62, cz) // frieze under the eave
    b.block('adyFrame', w + 0.3, 0.12, d + 0.3, cx, E - 0.3, cz) // dark eave board
  }
  // risalit: plinth, bands, frieze panel
  b.block('adyPlinth', 2 * RW + 0.16, 0.9, 0.4, 0, 0, ZR - 0.12)
  b.block(GREY, 2 * RW + 0.12, 0.2, 0.3, 0, 4.75, ZR - 0.1)
  b.block(GREY, 2 * RW + 0.08, 0.14, 0.3, 0, 7.25, ZR - 0.1)
  for (const s of [-1, 1]) b.block(GREY, 0.55, ER - 0.9, 0.12, s * (RW - 0.28), 0.9, ZR + 0.05) // corner pilaster strips
  b.block(GREY, 2 * RW + 0.1, 0.16, 0.2, 0, 10.0, ZR + 0.02)
  b.block('adyFrieze', 2 * RW - 1.4, 1.0, 0.06, 0, 10.35, ZR + 0.03) // inscription panel
  for (let i = 0; i < 13; i++) {
    // lettering hint: small dark marks in three groups
    const u = [-3.6, -3.2, -2.8, -2.4, -1.4, -0.9, -0.4, 0.1, 0.6, 1.1, 2.4, 2.8, 3.2][i]
    b.add('adyFrame', metricBox(0.22, 0.32, 0.03), mat(u, 10.85, ZR + 0.075))
  }
  b.block(GREY, 2 * RW + 0.3, 0.36, 0.5, 0, ER - 0.66, ZR - 0.1)
  // risalit side walls above the main eave carry the frieze too
  for (const s of [-1, 1]) b.block(GREY, 0.12, 0.36, ZR - 11.0, s * (RW + 0.02), ER - 0.66, (ZR + 11.0) / 2)

  /* ---------- windows ---------- */
  const sideBays = [7.9, 11.3, 14.7]
  for (const s of [-1, 1]) {
    for (const x of sideBays) {
      groundWin(b, '+z', ZF, s * x)
      upperWin(b, '+z', ZF, s * x)
    }
  }
  for (const x of [-3.25, 3.25]) groundWin(b, '+z', ZR, x)
  for (const x of [-3.25, 0, 3.25]) upperWin(b, '+z', ZR, x)
  // entrance
  {
    const m = faceFrame('+z', ZR, 0, 0, 0)
    b.add('adyDoor', metricBox(1.9, 3.3, 0.06), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0.9 + 1.65, 0.02)))
    b.add(GREY, extrude(frameShape('rect', 1.9, 3.3, 0.22, 0, 0.9), 0.1), m)
    b.add(FRAME, metricBox(1.9, 0.1, 0.08), new THREE.Matrix4().multiplyMatrices(m, mat(0, 3.15, 0.06)))
    for (let i = 0; i < 3; i++) b.block('adyPlinth', 3.2 - i * 0.4, 0.3 * (i + 1), 0.4, 0, 0, ZR + 1.1 - i * 0.4)
  }
  // side elevations (±X): front wing + rear wing, continuous
  const sideZ = [11.6, 8.1, 4.6, 1.1, -2.9, -6.1, -9.3, -12.4]
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+x' : '-x'
    for (const z of sideZ) {
      groundWin(b, face, s * XH, uOf(face, 0, z))
      upperWin(b, face, s * XH, uOf(face, 0, z))
    }
  }
  // rear-wing ends (−Z) and courtyard faces
  for (const s of [-1, 1]) {
    for (const x of [6.55, 9.55, 12.55, 15.55]) {
      groundWin(b, '-z', ZB, uOf('-z', s * x, 0))
      upperWin(b, '-z', ZB, uOf('-z', s * x, 0))
    }
    const face: Face = s > 0 ? '-x' : '+x'
    for (const z of [-3.6, -6.8, -10.0]) {
      groundWin(b, face, s * XI, uOf(face, 0, z))
      upperWin(b, face, s * XI, uOf(face, 0, z))
    }
  }
  for (const x of [-2.6, 2.6]) {
    groundWin(b, '-z', ZW, uOf('-z', x, 0))
    upperWin(b, '-z', ZW, uOf('-z', x, 0))
  }

  /* ---------- roofs (elZinc Graphite) ---------- */
  // front wing: 42° long faces, 50° end hips, eave edges level at YE
  const oE = (E - YE) / Math.tan(50 * D2R)
  const front = wingRoof({ x0: -XH - oE, x1: XH + oE, z0: ZW - OV, z1: ZF + OV, ye: YE, axis: 'x', pitch: 42, end0: 50, end1: 50 })
  for (const f of front.faces) {
    if (f.side === 'c1') {
      // the risalit interrupts the lower front face
      roofFace(b, clip(f.pts, 'x', -RW, true))
      roofFace(b, clip(f.pts, 'x', RW, false))
      roofFace(b, clip(clip(clip(f.pts, 'x', -RW, false), 'x', RW, true), 'z', ZR - 0.25, true))
    } else roofFace(b, f.pts)
  }
  caps(b, front)
  // rear wings: ridge along Z, rear hip 46°, open front end running into the front-wing roof
  const oR = (E - YE) / Math.tan(46 * D2R)
  const rear = [-1, 1].map((s) => {
    const xa = s < 0 ? -XH - OV : XI - OV
    const xb = s < 0 ? -XI + OV : XH + OV
    return wingRoof({ x0: xa, x1: xb, z0: ZB - oR, z1: 6.0, ye: YE, axis: 'z', pitch: 42, end0: 46, end1: 'open' })
  })
  for (const r of rear) {
    for (const f of r.faces) roofFace(b, f.pts)
    caps(b, r)
  }
  // risalit cross roof: 38° sides, 45° front hip, ridge running back into the main roof
  const YER = ER - OV * Math.tan(38 * D2R)
  const oF = (ER - YER) / Math.tan(45 * D2R)
  const ris = wingRoof({ x0: -RW - OV, x1: RW + OV, z0: 6.1, z1: ZR + oF, ye: YER, axis: 'z', pitch: 38, end0: 'open', end1: 45 })
  for (const f of ris.faces) roofFace(b, f.pts)
  caps(b, ris)

  /* ---------- gutters, snow guards, downpipes ---------- */
  const gut = (p: P3, q: P3) => {
    b.rod(ROOF, p.clone().add(V(0, -0.06, 0)), q.clone().add(V(0, -0.06, 0)), 0.09, 8)
    // dark fretwork valance hanging under the eave edge (photos 03, 09)
    b.beam(FRAME, p.clone().add(V(0, -0.27, 0)), q.clone().add(V(0, -0.27, 0)), 0.035, 0.26)
  }
  const zf = ZF + OV
  gut(V(-XH - oE, YE, zf), V(-RW, YE, zf))
  gut(V(RW, YE, zf), V(XH + oE, YE, zf))
  for (const s of [-1, 1]) gut(V(s * (XH + oE), YE, ZW - OV), V(s * (XH + oE), YE, zf))
  gut(V(-XI + OV, YE, ZW - OV), V(XI - OV, YE, ZW - OV))
  for (const r of rear) {
    const { e00, e01, e10 } = r.eaves
    gut(e00, e10) // rear end (−Z)
    gut(e00, e01) // x0 side
    gut(e10, r.eaves.e11)
  }
  {
    const { e01, e11, e10 } = ris.eaves
    gut(e01, e11)
    gut(e11, V(e11.x, e11.y, ZF + 0.3))
    gut(e01.clone(), V(e01.x, e01.y, ZF + 0.3))
    void e10
  }
  // snow-guard rails ≈ 1.1 m up the slope
  const rail = (p: P3, q: P3) => {
    b.rod('iron', p, q, 0.025, 5)
    b.rod('iron', p.clone().add(V(0, 0.12, 0)), q.clone().add(V(0, 0.12, 0)), 0.025, 5)
  }
  const sR = 1.1
  const yRail = YE + sR * T42 + 0.12
  rail(V(-XH + 1, yRail, zf - sR), V(-RW - 0.6, yRail, zf - sR))
  rail(V(RW + 0.6, yRail, zf - sR), V(XH - 1, yRail, zf - sR))
  for (const s of [-1, 1]) rail(V(s * (XH + OV - sR), yRail, ZB + 1.5), V(s * (XH + OV - sR), yRail, ZW - 1.0))
  // downpipes
  for (const x of [-XH + 0.25, -RW - 0.25, RW + 0.25, XH - 0.25]) downpipe(b, x, ZF + 0.18)
  for (const s of [-1, 1]) {
    for (const z of [9.8, 2.8, -4.5, -11.0]) downpipe(b, s * (XH + 0.18), z)
    for (const x of [XI + 0.35, XH - 0.35]) downpipe(b, s * x, ZB - 0.18)
  }

  /* ---------- dormers ---------- */
  const t = T42
  for (const s of [-1, 1]) {
    // front face of the side parts
    shedDormer(b, faceFrame('+z', ZF, s * 11.3, 0, 0), { yWall: E, t, s0: 1.9, w: 2.1, hF: 1.15 })
    // outer faces of the rear wings
    const face: Face = s > 0 ? '+x' : '-x'
    for (const z of [-4.6, -10.0]) shedDormer(b, faceFrame(face, s * XH, uOf(face, 0, z), 0, 0), { yWall: E, t, s0: 2.5, w: 2.1, hF: 1.15 })
  }
  // small dormer high on the risalit's front hip (photo 05)
  shedDormer(b, faceFrame('+z', ZR, 0, 0, 0), { yWall: ER, t: 1.0, s0: 2.9, w: 1.7, hF: 0.85 })

  /* ---------- lightning rod ---------- */
  {
    const x = -2.6
    const zc = (ZW + ZF) / 2
    const y = front.yr
    b.rod('iron', V(x, y, zc), V(x, y + 4.2, zc), 0.035, 6)
    for (const a of [0, 2.1, 4.2]) b.rod('iron', V(x + Math.cos(a) * 0.55, y - 0.05, zc + Math.sin(a) * 0.55), V(x, y + 0.9, zc), 0.025, 5)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [9, 14.5, 9],
  materials: () => ({
    adyGrey: new THREE.MeshStandardMaterial({ color: '#a7a6a2', roughness: 0.85 }),
    adyCap: new THREE.MeshStandardMaterial({ color: '#46494c', roughness: 0.7, metalness: 0.25 }),
    adyFrame: new THREE.MeshStandardMaterial({ color: '#3d4145', roughness: 0.55, metalness: 0.2 }),
    adyDoor: new THREE.MeshStandardMaterial({ color: '#4a4e52', roughness: 0.6, metalness: 0.15 }),
    adyPlinth: new THREE.MeshStandardMaterial({ color: '#cfccc5', roughness: 0.9 }),
    adyFrieze: new THREE.MeshStandardMaterial({ color: '#e3e1dc', roughness: 0.88 }),
  }),
  notes: 'Hipped elZinc Graphite roofs over a U-shaped plan interpreted from the photographs; courtyard side and rear-wing ends not photographed.',
}
export default model
