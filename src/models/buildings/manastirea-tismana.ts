/**
 * Mănăstirea Tismana — catholicon „Adormirea Maicii Domnului” (rebuilt 1855,
 * enclosed porch rebuilt 1983). Copper roofs per the COLOR METAL project record.
 *
 * Modelling specification (real metres; origin = footprint centre at ground,
 * +X = OSM long axis towards the altar apse, ESE; west front towards −X).
 * Sources: three small third-party photographs — ground view of the west front
 * (02), drone view of the courtyard (03), distant valley view (01) — plus the
 * OSM outline (29.1 × 13.5 m). ro.wikipedia clarifies what the photos show:
 * triconch plan with three towers, over the naos, the pronaos and the porch.
 *  - Enclosed porch (pridvor) wrapping the pronaos: wide single-storey block
 *    (≈ 16 × 13.4 m, walls ≈ 6 m) with deep-set round-arched windows; west front
 *    with a stone-framed door, icon panel and small bell-shaped metal hood,
 *    two windows either side (02, 03). Low hipped roof.
 *  - Pronaos + naos body (≈ 9.4 m wide, walls ≈ 10 m) rising out of the porch
 *    roof, gable roof along the axis; lateral conchs of the naos (triconch) and a
 *    polygonal altar apse at the east end (OSM taper).
 *  - Three towers on square bases with cross-gabled tops: small octagonal drum
 *    over the porch, two larger octagonal drums over the pronaos and the naos
 *    (the naos tower highest), round-arched windows, eave cornice, low saucer
 *    domes, Orthodox crosses (02, 03).
 *  - Roofs and domes modelled in copper (standing seams ≈ 0.5 m).
 *  - Ensemble (low detail): the precinct ranges whose roofs show new copper in
 *    drone photo 03 — north range and angled north-east range (mitred bend),
 *    two-storey south range with a copper corner pavilion and a short southern
 *    projection — placed from the OSM precinct outlines; the tower at the north
 *    bend and the north-east pavilion (grey roofs) as neutral massing only.
 * Approximations: the photographs show the church with a light grey sheet roof
 * (before / outside the documented copper work) — the copper finish follows the
 * project record; heights are estimated from the ground photo (no survey data);
 * east end, apse and lateral conchs are not photographed and follow the OSM
 * outline and the typical triconch layout; buttresses omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, hippedRoof, gableRoof, polygonalApse, helm, seams, faceFrame, facet, prismOutline } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copper'
const WALL = 'plasterWhite'
const TRIM = 'stoneLight'
const SEAM = seams(CU, 0.5, 0.04, 0.04)

/** enclosed porch (pridvor) */
const PR = { x0: -14.6, x1: 1.5, hw: 6.7, top: 6.0 }
/** pronaos + naos body */
const BODY = { x0: -7.6, x1: 9.0, hw: 4.7, top: 10.2 }
const TOWERS = [
  // porch tower, pronaos tower, naos tower
  { x: -10.7, base: 4.8, y0: PR.top, yb: 8.0, r: 2.3, yd: 10.6, domeH: 1.15, cross: 1.5, win: [0.42, 1.2] as [number, number] },
  { x: -3.3, base: 6.6, y0: BODY.top, yb: 13.5, r: 3.55, yd: 17.2, domeH: 1.75, cross: 1.9, win: [0.6, 1.9] as [number, number] },
  { x: 4.6, base: 6.8, y0: BODY.top, yb: 13.9, r: 3.7, yd: 17.9, domeH: 1.85, cross: 2.0, win: [0.6, 2.0] as [number, number] },
]

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

interface Op {
  w: number
  h: number
  y0: number
  u?: number
  type?: OpeningType
  glass?: string
  frame?: number
  frameKey?: string
  depth?: number
  off?: number
}

/** Deep-set opening: dark glass slightly behind a plain reveal ring. */
function op(b: Builder, m: THREE.Matrix4, o: Op) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.14
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? 'trim', extrude(frameShape(type, o.w, o.h, f, u, o.y0), o.depth ?? 0.16, 10), mul(m, mat(0, 0, off)))
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', new THREE.SphereGeometry(s * 0.07, 10, 8), mat(0, s * 0.05, 0))
  g.add('iron', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('iron', metricBox(s * 0.56, t, t), mat(0, s * 0.74, 0))
  g.add('iron', metricBox(s * 0.3, t * 0.8, t), mat(0, s * 0.9, 0))
  g.add('iron', metricBox(s * 0.36, t * 0.8, t), mat(0, s * 0.4, 0, 0, 0, 0.35))
  g.add('gilt', new THREE.SphereGeometry(s * 0.04, 8, 6), mat(0, s, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** Square tower base with a cross-gabled top (four small pediments). */
function towerBase(b: Builder, x: number, w: number, y0: number, y1: number) {
  b.block(WALL, w, y1 - y0, w, x, y0, 0)
  b.block(TRIM, w + 0.3, 0.25, w + 0.3, x, y1 - 0.25, 0)
  for (const ridge of ['x', 'z'] as const) gableRoof(b, CU, { x, z: 0, w, d: w, y: y1, pitch: 20, ridge, overhang: 0.25, seams: SEAM, wallKey: WALL })
}

/* ------------------------------------------------------------------ */
/* Precinct ranges with new copper roofs (drone photo 03)               */
/* ------------------------------------------------------------------ */
// Positions from the OSM precinct outlines (ways 1432713919, 1432717713/14),
// converted to this model's frame (origin = catholicon outline centre, +X = 123.5°).
type P2 = [number, number]
const D2R = Math.PI / 180
const add2 = (a: P2, c: P2, k = 1): P2 => [a[0] + c[0] * k, a[1] + c[1] * k]
const dir2 = (deg: number): P2 => [Math.cos(deg * D2R), Math.sin(deg * D2R)]
/** intersection of the line a + t·da with the line c + s·dc */
function meet(a: P2, da: P2, c: P2, dc: P2): P2 {
  const den = da[0] * dc[1] - da[1] * dc[0]
  const t = ((c[0] - a[0]) * dc[1] - (c[1] - a[1]) * dc[0]) / den
  return add2(a, da, t)
}

interface Wing {
  s: P2 // axis start (plan)
  e: P2 // axis end
  hw: number // half width of the walls
  ov: number // eave overhang
  eave: number // wall top
  pitch: number
  /** mitre line directions through the axis start / end (square end with a gable when omitted) */
  mitreS?: P2
  mitreE?: P2
  floors: number[] // window sill heights
  win?: [number, number]
  skipWin?: (s: number, side: number) => boolean
}

/** Gabled copper-roofed range on an arbitrary axis; mitred ends meet a neighbouring range of equal section. */
function wing(b: Builder, w: Wing) {
  const L = Math.hypot(w.e[0] - w.s[0], w.e[1] - w.s[1])
  const d: P2 = [(w.e[0] - w.s[0]) / L, (w.e[1] - w.s[1]) / L]
  const n: P2 = [-d[1], d[0]] // +side normal
  const t = Math.tan(w.pitch * D2R)
  const ridge = w.eave + w.hw * t
  const eY = w.eave - w.ov * t
  const endPt = (p: P2, off: number, m: P2 | undefined, sgn: number, ext: number): P2 => {
    const q = add2(p, n, off)
    return m ? meet(q, d, p, m) : add2(q, d, sgn * ext)
  }
  // walls (mitred where the ranges meet)
  const wallPts = [endPt(w.s, -w.hw, w.mitreS, -1, 0), endPt(w.e, -w.hw, w.mitreE, 1, 0), endPt(w.e, w.hw, w.mitreE, 1, 0), endPt(w.s, w.hw, w.mitreS, -1, 0)]
  prismOutline(b, WALL, wallPts, 0, w.eave)
  const so = [endPt(w.s, -w.hw - 0.12, w.mitreS, -1, 0.12), endPt(w.e, -w.hw - 0.12, w.mitreE, 1, 0.12), endPt(w.e, w.hw + 0.12, w.mitreE, 1, 0.12), endPt(w.s, w.hw + 0.12, w.mitreS, -1, 0.12)]
  prismOutline(b, 'socle', so, 0, 0.5)
  // roof: two slopes, mitred or with gable overhang
  const ext = w.ov * 0.6
  const rS = w.mitreS ? w.s : add2(w.s, d, -ext)
  const rE = w.mitreE ? w.e : add2(w.e, d, ext)
  for (const side of [-1, 1]) {
    const off = side * (w.hw + w.ov)
    const a = endPt(w.s, off, w.mitreS, -1, ext)
    const c = endPt(w.e, off, w.mitreE, 1, ext)
    facet(b, CU, [V(a[0], eY, a[1]), V(c[0], eY, c[1]), V(rE[0], ridge, rE[1]), V(rS[0], ridge, rS[1])], { seams: SEAM, thickness: 0.12 })
  }
  b.beam(CU, V(rS[0], ridge + 0.05, rS[1]), V(rE[0], ridge + 0.05, rE[1]), 0.24, 0.14)
  // eave cornice and gable walls at square ends
  for (const side of [-1, 1]) {
    const a = endPt(w.s, side * w.hw, w.mitreS, -1, 0)
    const c = endPt(w.e, side * w.hw, w.mitreE, 1, 0)
    b.beam(TRIM, V(a[0], w.eave - 0.15, a[1]), V(c[0], w.eave - 0.15, c[1]), 0.5, 0.3)
  }
  const ang = Math.atan2(d[1], d[0])
  for (const [p, m, k] of [
    [w.s, w.mitreS, 0],
    [w.e, w.mitreE, -0.3],
  ] as [P2, P2 | undefined, number][]) {
    if (m) continue
    // triangle in the end-wall plane, extruded 0.3 m inwards along the axis
    const g = new THREE.Shape([new THREE.Vector2(-w.hw, w.eave - 0.01), new THREE.Vector2(w.hw, w.eave - 0.01), new THREE.Vector2(0, ridge - 0.1)])
    b.add(WALL, extrude(g, 0.3), mat(p[0] + d[0] * k, 0, p[1] + d[1] * k, Math.PI / 2 - ang))
  }
  // window rows on both long façades
  const [ww, wh] = w.win ?? [0.95, 1.45]
  const cnt = Math.max(1, Math.floor((L - 3) / 3.3))
  const step = (L - 3) / cnt
  for (const side of [-1, 1]) {
    const nn: P2 = [n[0] * side, n[1] * side]
    for (let i = 0; i < cnt; i++) {
      const sAx = 1.5 + step * (i + 0.5)
      if (w.skipWin?.(sAx, side)) continue
      const p = add2(add2(w.s, d, sAx), n, side * w.hw)
      const m = mat(p[0], 0, p[1], Math.PI / 2 - Math.atan2(nn[1], nn[0]))
      for (const y0 of w.floors) op(b, m, { w: ww, h: wh, y0, type: 'rect', frame: 0.12, depth: 0.12 })
    }
  }
  return ridge
}

/** Square pavilion with a hipped/pyramid roof (rotated by deg). */
function pavilion(b: Builder, c: P2, deg: number, hx: number, hz: number, eave: number, pitch: number, roofKey: string, ov = 0.5) {
  const g = new Builder()
  g.block(WALL, 2 * hx, eave, 2 * hz, 0, 0, 0)
  g.block('socle', 2 * hx + 0.24, 0.5, 2 * hz + 0.24, 0, 0, 0)
  g.block(TRIM, 2 * hx + 0.5, 0.3, 2 * hz + 0.5, 0, eave - 0.3, 0)
  hippedRoof(g, roofKey, { w: 2 * hx, d: 2 * hz, y: eave, pitch, overhang: ov, seams: roofKey === CU ? SEAM : false })
  b.merge(g, mat(c[0], 0, c[1], -deg * D2R))
}

function precinct(b: Builder) {
  // north range (towards the north-west corner tower) and the angled north-east range meet at a mitred bend
  const bend: P2 = [0.36, -22.9]
  const dN: P2 = [bend[0] + 42.5, bend[1] + 12.0]
  const lN = Math.hypot(dN[0], dN[1])
  const uN: P2 = [dN[0] / lN, dN[1] / lN]
  const uE = dir2(26.9)
  const sum: P2 = [uN[0] + uE[0], uN[1] + uE[1]]
  const ls = Math.hypot(sum[0], sum[1])
  const mitre: P2 = [-sum[1] / ls, sum[0] / ls]
  const sec = { hw: 4.55, ov: 0.5, eave: 6.0, pitch: 26 }
  wing(b, { s: [-42.5, -12.0], e: bend, ...sec, mitreE: mitre, floors: [1.1, 3.75], win: [0.9, 1.3] })
  wing(b, { s: bend, e: add2(bend, uE, 22), ...sec, mitreS: mitre, floors: [1.1, 3.75], win: [0.9, 1.3] })
  // south range (two storeys) with the copper pavilion at its east end and a short south projection
  const s0: P2 = [-28, 23.94]
  const s1: P2 = [24, 12.94]
  const degS = (Math.atan2(s1[1] - s0[1], s1[0] - s0[0]) * 180) / Math.PI
  wing(b, { s: s0, e: s1, hw: 4.0, ov: 0.5, eave: 8.0, pitch: 28, floors: [1.2, 4.6], win: [1.0, 1.6] })
  // three copper-clad vent hoods on the courtyard slope (photo 03)
  {
    const lS = Math.hypot(s1[0] - s0[0], s1[1] - s0[1])
    const u: P2 = [(s1[0] - s0[0]) / lS, (s1[1] - s0[1]) / lS]
    const nC: P2 = [u[1], -u[0]] // courtyard side (towards the church)
    const t28 = Math.tan(28 * D2R)
    for (const sAx of [24, 33, 42]) {
      const p = add2(add2(s0, u, sAx), nC, 2.0)
      const y = 8.0 + (4.0 - 2.0) * t28
      b.add(CU, metricBox(1.0, 0.9, 0.7), mat(p[0], y + 0.25, p[1], -Math.atan2(u[1], u[0])))
      b.add(CU, metricBox(1.15, 0.08, 0.85), mat(p[0], y + 0.72, p[1], -Math.atan2(u[1], u[0])))
    }
  }
  pavilion(b, [29.0, 12.9], degS, 4.5, 4.5, 8.3, 30, CU)
  wing(b, { s: [13.94, 19.59], e: [17.06, 29.05], hw: 2.7, ov: 0.45, eave: 7.0, pitch: 28, floors: [1.2, 4.2], win: [0.9, 1.4], skipWin: (s) => s < 3 })
  // neutral massing attached to the copper ranges (roofs not copper in photo 03): tower at the bend, NE pavilion
  pavilion(b, [-1.4, -27.6], 6, 3.3, 3.3, 10.0, 42, 'plasterGrey', 0.4)
  pavilion(b, add2(add2(bend, uE, 22), uE, 4.6), 26.9, 4.6, 4.5, 6.6, 24, 'plasterGrey', 0.4)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- enclosed porch (pridvor) ---------------- */
  {
    const { x0, x1, hw, top } = PR
    const len = x1 - x0
    const xm = (x0 + x1) / 2
    b.block(WALL, len, top, 2 * hw, xm, 0, 0)
    b.block('socle', len + 0.2, 0.55, 2 * hw + 0.2, xm, 0, 0)
    b.block(TRIM, len + 0.5, 0.28, 2 * hw + 0.5, xm, top - 0.28, 0)
    hippedRoof(b, CU, { x: xm, z: 0, w: len, d: 2 * hw, y: top, pitch: 17, overhang: 0.45, seams: SEAM })
    // west front: door with stone frame, icon, bell-shaped hood; two windows either side
    const fw = faceFrame('-x', x0, 0, 0, 0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 2.6, 0, 0.15, 10))), mul(fw, mat(0, 0, 0.03)))
    const frame = new THREE.Shape(opening('rect', 2.5, 3.4, 0, 0.0))
    frame.holes.push(new THREE.Path(opening('round', 1.5, 2.6, 0, 0.15, 10)))
    b.add(TRIM, extrude(frame, 0.14), mul(fw, mat(0, 0, 0.01)))
    op(b, fw, { u: 0, w: 1.3, h: 1.0, y0: 3.75, type: 'rect', glass: 'icon', frame: 0.12, frameKey: TRIM })
    const hood: [number, number][] = [
      [1.15, 0],
      [1.05, 0.12],
      [0.85, 0.3],
      [0.7, 0.55],
      [0.55, 0.8],
      [0.3, 1.0],
      [0.05, 1.08],
    ]
    b.add(CU, new THREE.LatheGeometry(hood.map(([r, y]) => new THREE.Vector2(r, y)), 14, Math.PI, Math.PI), mat(x0, top - 0.75, 0))
    for (const u of [-4.5, -2.6, 2.6, 4.5]) op(b, fw, { u, w: 0.95, h: 2.5, y0: 1.6 })
    // side façades: five round-arched windows
    for (const s of [-1, 1]) {
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * hw, 0, 0, 0)
      for (const x of [-12.4, -9.3, -6.2, -3.1, 0]) op(b, fm, { u: s * x, w: 0.85, h: 2.6, y0: 1.5 })
    }
  }

  /* ---------------- pronaos + naos body ---------------- */
  {
    const { x0, x1, hw, top } = BODY
    const xm = (x0 + x1) / 2
    b.block(WALL, x1 - x0, top, 2 * hw, xm, 0, 0)
    b.block('socle', x1 - x0 + 0.2, 0.55, 2 * hw + 0.2, xm, 0, 0)
    b.block(TRIM, x1 - x0 + 0.4, 0.26, 2 * hw + 0.5, xm, top - 0.26, 0)
    gableRoof(b, CU, { x: xm, z: 0, w: x1 - x0, d: 2 * hw, y: top, pitch: 28, ridge: 'x', overhang: 0.35, seams: SEAM, wallKey: WALL })
    // windows above the porch roof (pronaos) and in the naos east bay
    for (const s of [-1, 1]) {
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * hw, 0, 0, 0)
      for (const x of [-5.6, -1.0]) op(b, fm, { u: s * x, w: 0.7, h: 1.6, y0: 7.6 })
      for (const x of [7.6]) op(b, fm, { u: s * x, w: 0.8, h: 2.4, y0: 4.0 })
    }
    op(b, faceFrame('-x', x0, 0, 0, 0), { u: 0, w: 0.7, h: 1.4, y0: 8.0 })

    // lateral conchs of the naos (triconch): half-polygonal walls with half-cone roofs
    for (const s of [-1, 1]) {
      const cx = TOWERS[2].x
      const cz = s * hw
      const r = 2.3
      const yt = 7.8
      const a = s * (Math.PI / 2)
      const half = (key: string, pts: [number, number][], seg = 6) =>
        b.add(key, new THREE.LatheGeometry(pts.map(([rr, y]) => new THREE.Vector2(Math.max(rr, 0.01), y)), seg, -a, Math.PI), mat(cx, 0, cz))
      half(WALL, [[r, 0], [r, yt]])
      half('socle', [[r - 0.05, 0], [r + 0.1, 0], [r + 0.1, 0.55], [r - 0.05, 0.55]])
      half(TRIM, [[r - 0.05, yt - 0.26], [r + 0.22, yt - 0.26], [r + 0.22, yt], [r - 0.05, yt]])
      half(CU, [[r + 0.4, yt - 0.1], [0.02, yt + 1.9]])
      for (let k = 0; k <= 6; k++) {
        const ph = a - Math.PI / 2 + (k / 6) * Math.PI
        b.beam(CU, V(cx + Math.cos(ph) * (r + 0.4), yt - 0.06, cz + Math.sin(ph) * (r + 0.4)), V(cx, yt + 1.94, cz), 0.1, 0.07)
      }
      op(b, wallAt(cx, s * (hw + r * 0.96), a), { w: 0.75, h: 2.2, y0: 3.4, off: 0.03 })
    }

    // polygonal altar apse at the east end
    const ahw = 3.8
    polygonalApse(b, { x0: x1, hw: ahw, y: 8.0, sides: 5, wallKey: WALL, roofKey: CU, pitch: 30, seams: SEAM, overhang: 0.35 })
    const R = ahw / Math.cos(Math.PI / 10)
    const ap = R * Math.cos(Math.PI / 10)
    for (const a of [-36, 0, 36]) {
      const t = (a * Math.PI) / 180
      op(b, wallAt(x1 + Math.cos(t) * ap, Math.sin(t) * ap, t), { w: 0.75, h: 2.4, y0: 3.6, off: 0.02 })
    }
    b.block(TRIM, 0.4, 0.26, 2 * hw + 0.5, x1 - 0.2, top - 0.26, 0)
  }

  /* ---------------- three towers ---------------- */
  TOWERS.forEach((t, i) => {
    towerBase(b, t.x, t.base, i === 0 ? PR.top - 0.5 : BODY.top - 0.5, t.yb)
    prism(b, WALL, { x: t.x, n: 8, r: t.r, y0: t.yb, h: t.yd - t.yb })
    const ap = t.r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      op(b, wallAt(t.x + Math.cos(a) * ap, Math.sin(a) * ap, a), { w: t.win[0], h: t.win[1], y0: t.yb + (t.yd - t.yb - t.win[1]) * 0.45, frame: 0.1, off: 0.01 })
    }
    ringBand(b, TRIM, { x: t.x, n: 8, r: t.r, y: t.yd - 0.22, h: 0.22, grow: 0.12 })
    ringBand(b, TRIM, { x: t.x, n: 8, r: t.r, y: t.yd, h: 0.2, grow: 0.3 })
    // shallow octagonal eave roof, then a smaller round dome (02, 03)
    const sk0 = t.yd + 0.2
    const sk1 = sk0 + 0.32 * t.r
    const rd = 0.66 * t.r
    helm(b, CU, { x: t.x, n: 8, stations: [[t.r + 0.42, sk0], [rd / Math.cos(Math.PI / 8) + 0.05, sk1]], phase: Math.PI / 8 })
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4
      b.beam(CU, V(t.x + Math.cos(a) * (t.r + 0.42), sk0 + 0.03, Math.sin(a) * (t.r + 0.42)), V(t.x + Math.cos(a) * rd, sk1 + 0.03, Math.sin(a) * rd), 0.1, 0.06)
    }
    const prof: [number, number][] = []
    for (let j = 0; j <= 10; j++) {
      const s = j / 10
      prof.push([rd * Math.cos((s * Math.PI) / 2) ** 0.85, sk1 + t.domeH * Math.sin((s * Math.PI) / 2)])
    }
    b.add(CU, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.01), y)), 32), mat(t.x, 0, 0))
    const ribs = i === 0 ? 10 : 16
    for (let k = 0; k < ribs; k++) {
      const a = (k / ribs) * Math.PI * 2
      const d = V(Math.cos(a), 0, Math.sin(a))
      for (let j = 0; j < prof.length - 2; j++) {
        const [r0, y0] = prof[j]
        const [r1, y1] = prof[j + 1]
        b.beam(CU, V(t.x + d.x * (r0 + 0.02), y0, d.z * (r0 + 0.02)), V(t.x + d.x * (r1 + 0.02), y1, d.z * (r1 + 0.02)), 0.04, 0.04, d)
      }
    }
    const top = sk1 + t.domeH
    b.add(CU, new THREE.CylinderGeometry(0.1, 0.22, 0.4, 10), mat(t.x, top + 0.1, 0))
    orthoCross(b, t.x, top + 0.25, 0, t.cross)
  })

  /* ---------------- precinct ranges with copper roofs ---------------- */
  precinct(b)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [4.6, 18.6, -2],
  materials: () => ({
    icon: new THREE.MeshStandardMaterial({ color: '#7b6a4c', roughness: 0.55, metalness: 0.25 }),
  }),
  notes:
    'Preliminary model from three small photographs and the OSM outline: heights estimated, east end and conchs interpreted; the photos show a grey sheet roof — the copper finish follows the project record. Precinct ranges with new copper roofs (drone photo) included at low detail.',
}
export default model
