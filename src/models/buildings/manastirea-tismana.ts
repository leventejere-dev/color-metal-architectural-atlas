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
 * Approximations: the photographs show the church with a light grey sheet roof
 * (before / outside the documented copper work) — the copper finish follows the
 * project record; heights are estimated from the ground photo (no survey data);
 * east end, apse and lateral conchs are not photographed and follow the OSM
 * outline and the typical triconch layout; buttresses omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, hippedRoof, gableRoof, polygonalApse, helm, seams, faceFrame } from '../kit'
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
    'Preliminary model from three small photographs and the OSM outline: heights estimated, east end and conchs interpreted; the photos show a grey sheet roof — the copper finish follows the project record.',
}
export default model
