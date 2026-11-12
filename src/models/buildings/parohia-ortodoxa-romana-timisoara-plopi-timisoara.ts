/**
 * Orthodox church „Sfinții Apostoli Petru și Pavel", Timișoara-Plopi —
 * built 1969 (Mitropolia Banatului deanery list), Strada Jókai Mór 35, OSM
 * way 881227660 (11-point outline 16.5 × 10.2 m, long axis 68.7°).
 *
 * Modelling specification derived from four public reference photographs
 * published by the archdiocese (a frontal 2023 street-level view of the
 * whole west front, three views of the porch and entrance 2015–2021) and the
 * OSM outline; real metres, +X = east (polygonal altar apse), front at −X:
 *  - Simple hall church 10.2 m wide, 12.2 m long, with a narrower (≈6 m)
 *    three-sided altar apse with its own lower hipped roof.
 *  - West front: pale yellow plaster with broad white corner pilasters, a
 *    gable whose white-coped edges rise with a slight concave curve to a
 *    slender bell-cote; round window in the gable apex, arched icon niche
 *    over the porch.
 *  - Porch (pridvor) on two white posts with a red clay-tile hipped roof and
 *    a wooden soffit; double wooden door.
 *  - Bell-cote ≈2.6 m wide with white corner strips, a louvred arched
 *    opening, wooden eaves and a bell-cast pyramidal roof carrying a
 *    three-bar cross (≈15.6 m).
 *  - METAL: the COLOR METAL records list copper sheet for this parish
 *    (2022). The 2023 photograph shows the bell-cote roof dark brown; the
 *    nave and apse roofs are not visible on any available photograph. The
 *    nave, apse and bell-cote roofs are shown in weathered copper standing
 *    seam (≈0.5 m pans) — which surfaces were done is not documented.
 * Approximations: the sides and the apse are not photographed — window
 * rhythm (three arched windows per side, as seen from inside) and roof pitch
 * (≈30°) assumed; heights measured on the frontal photo (eave ≈7.6 m,
 * bell-cote cornice ≈12.9 m), ±10 %.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, cross, faceFrame, seams, polygonalApse } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XW = -8.27 // west front
const XE = 3.96 // east gable of the nave
const HW = 5.1
const EAVE = 7.6
const PITCH = 30
const TP = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * TP
const OV = 0.4
const AP = { x0: 4.85, hw: 3.0, eave: 6.2, pitch: 35 }
const BC = { x0: XW, x1: XW + 2.6, hw: 1.3, top: 12.9 }

const WALL = 'plYellow'
const WHITE = 'plasterWhite'
const ROOF = 'copperBrown'
const SEAM: SeamSpec = seams(ROOF, 0.5, 0.05, 0.045)

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; frame?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(o.frame ?? 'wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.06, 0, y0), 0.05), m)
  const sw = o.surround ?? 0.15
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.06, h + 0.04, sw, 0, y0 - 0.04), 0.08), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.15, 0.1, 0.2), M(m, mat(0, y0 - sw - 0.02, 0.08)))
}

function pil(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.14) {
  b.add(WHITE, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave ---------------- */
  const nl = XE - XW
  const xm = (XW + XE) / 2
  b.block(WALL, nl, EAVE, HW * 2, xm, 0, 0)
  b.block('plSocle', nl + 0.14, 0.5, HW * 2 + 0.14, xm, 0, 0)
  b.block(WHITE, nl + 0.2, 0.25, HW * 2 + 0.26, xm, EAVE - 0.3, 0)
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    for (const x of [-5.0, -1.4, 2.2]) win(b, at(x), 'round', 1.15, 2.5, 3.4)
    for (const x of [XW + 0.3, XE - 0.3]) pil(b, at(x), 0, 0.6, 0.5, EAVE - 0.3)
    // gutter + downpipe
    const gy = EAVE - OV * TP - 0.08
    b.beam(ROOF, V(XW - 0.1, gy, s * (HW + OV + 0.04)), V(XE + 0.3, gy, s * (HW + OV + 0.04)), 0.13, 0.13)
    b.rod(ROOF, V(XE - 0.6, 0.3, s * (HW + 0.1)), V(XE - 0.6, gy, s * (HW + 0.1)), 0.05, 8)
  }
  // east gable wall above the apse roof
  {
    const tri = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.2), new THREE.Vector2(HW, EAVE - 0.2), new THREE.Vector2(0, RIDGE - 0.05)])
    b.add(WALL, extrude(tri, 0.4), mat(XE - 0.4, 0, 0, Math.PI / 2))
  }

  /* ---------------- roofs (copper) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = HW + OV
    const xa = XW + 0.3
    const xb = XE + 0.35
    facet(b, ROOF, [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [V(xb, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ROOF, V(xa, RIDGE + 0.06, 0), V(xb, RIDGE + 0.06, 0), 0.24, 0.12)
    // east verge flashing
    for (const sz of [-1, 1]) b.beam(ROOF, V(xb, ye, sz * he), V(xb, RIDGE + 0.05, 0), 0.22, 0.3, V(1, 0, 0))
  }

  /* ---------------- polygonal apse with a short straight bay ---------------- */
  {
    const t = Math.tan(AP.pitch * D2R)
    const aRidge = AP.eave + AP.hw * t
    b.block(WALL, AP.x0 - XE + 0.1, AP.eave, AP.hw * 2, (XE + AP.x0) / 2, 0, 0)
    b.block('plSocle', AP.x0 - XE + 0.1, 0.5, AP.hw * 2 + 0.14, (XE + AP.x0) / 2, 0, 0)
    polygonalApse(b, { x0: AP.x0, hw: AP.hw, y: AP.eave, sides: 3, wallKey: WALL, roofKey: ROOF, pitch: AP.pitch, seams: SEAM, overhang: 0.35 })
    const ye = AP.eave - 0.35 * t
    const he = AP.hw + 0.35
    facet(b, ROOF, [V(XE, ye, he), V(AP.x0, ye, he), V(AP.x0, aRidge, 0), V(XE, aRidge, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, ROOF, [V(AP.x0, ye, -he), V(XE, ye, -he), V(XE, aRidge, 0), V(AP.x0, aRidge, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(ROOF, V(XE, aRidge + 0.05, 0), V(AP.x0, aRidge + 0.05, 0), 0.2, 0.1)
    // one small window on each oblique apse face and on the axis
    const R = AP.hw / Math.cos(Math.PI / 6)
    for (const a of [-60, 0, 60]) {
      const r = R * Math.cos(Math.PI / 6)
      const ang = (a * Math.PI) / 180
      win(b, mat(AP.x0 + Math.cos(ang) * r, 0, Math.sin(ang) * r, Math.PI / 2 - ang), 'round', 0.7, 1.6, 2.6)
    }
    b.add(WHITE, new THREE.SphereGeometry(0.12, 10, 8), mat(AP.x0, aRidge + 0.12, 0))
    cross(b, 'trim', AP.x0, aRidge + 0.1, 0, 0.9, true, Math.PI / 2)
  }

  /* ---------------- west front: gable, porch, bell-cote ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    for (const u of [-HW + 0.3, HW - 0.3]) pil(b, m, u, 0.6, 0.5, EAVE + 0.05, 0.18)
    // gable rising with a slight concave curve to the bell-cote
    const g: [number, number][] = []
    // parapet gable: just above the roof plane, curving up more steeply towards the bell-cote
    const run = HW + 0.1 - BC.hw
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const u = -HW - 0.1 + t * run
      const y = EAVE + 0.2 + (t * run - 0.1) * TP + 0.85 * t * t
      g.push([u, y])
    }
    const yTop = g[g.length - 1][1]
    const pts: [number, number][] = [...g, ...g.map(([u, y]) => [-u, y] as [number, number]).reverse()]
    b.add(WALL, extrude(new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u, y))), 0.45), M(m, mat(0, 0, -0.45)))
    for (let i = 0; i < g.length - 1; i++) {
      for (const sg of [-1, 1]) {
        const [u1, y1] = g[i]
        const [u2, y2] = g[i + 1]
        b.beam(WHITE, V(XW - 0.06, y1 + 0.06, sg * u1), V(XW - 0.06, y2 + 0.06, sg * u2), 0.14, 0.32, V(-1, 0, 0))
      }
    }
    b.add(WALL, metricBox(2 * BC.hw, 0.6, 0.45), M(m, mat(0, yTop - 0.2, -0.225)))
    // round window under the bell-cote, icon niche above the porch
    b.add('glassC', new THREE.CircleGeometry(0.36, 20), M(m, mat(0, 9.9, 0.03)))
    b.add(WHITE, new THREE.TorusGeometry(0.42, 0.08, 6, 20), M(m, mat(0, 9.9, 0.06)))
    win(b, m, 'round', 0.8, 1.35, 6.95, { fill: 'plIcon', surround: 0.14 })
    // portal
    win(b, m, 'rect', 1.9, 2.75, 0.3, { fill: 'wood', sill: false, surround: 0.12 })
    for (const u of [-1.45, 1.45]) b.add('plIcon', metricBox(0.55, 1.6, 0.04), M(m, mat(u, 1.6, 0.03)))

    // porch: two posts, tiled hipped roof, wooden soffit
    const pd = 2.4
    const pw = 2.55
    const px0 = XW - pd
    const ph = 3.9
    b.block('plSocle', pd + 0.2, 0.3, pw * 2 + 0.6, XW - pd / 2 + 0.1, 0, 0)
    for (const sz of [-1, 1]) {
      b.block(WHITE, 0.4, ph, 0.4, px0 + 0.35, 0.3, sz * (pw - 0.45))
      b.block(WHITE, 0.55, 0.25, 0.55, px0 + 0.35, 0.3, sz * (pw - 0.45))
    }
    b.block('plSoffit', pd + 0.1, 0.35, pw * 2 + 0.2, XW - pd / 2, ph + 0.3, 0)
    const pt = Math.tan(38 * D2R)
    const ye = ph + 0.55
    const xo = px0 - 0.35
    const zo = pw + 0.3
    const rr = zo * pt
    const xr = xo + zo
    facet(b, 'tileRed', [V(xo, ye, zo), V(XW, ye, zo), V(XW, ye + rr, 0), V(xr, ye + rr, 0)], { thickness: 0.08, hint: V(0, 1, 1) })
    facet(b, 'tileRed', [V(XW, ye, -zo), V(xo, ye, -zo), V(xr, ye + rr, 0), V(XW, ye + rr, 0)], { thickness: 0.08, hint: V(0, 1, -1) })
    facet(b, 'tileRed', [V(xo, ye, -zo), V(xo, ye, zo), V(xr, ye + rr, 0)], { thickness: 0.08, hint: V(-1, 1, 0) })
    b.beam('plRidge', V(xr, ye + rr + 0.05, 0), V(XW, ye + rr + 0.05, 0), 0.22, 0.14)
    for (const sz of [-1, 1]) b.beam('plRidge', V(xo, ye + 0.05, sz * zo), V(xr, ye + rr + 0.05, 0), 0.2, 0.12)
    b.beam('plSoffit', V(xo, ye - 0.08, -zo), V(xo, ye - 0.08, zo), 0.12, 0.16)

    // bell-cote
    const cx = (BC.x0 + BC.x1) / 2
    const hw = BC.hw
    b.block(WALL, hw * 2, BC.top - EAVE, hw * 2, cx, EAVE, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? hw : -hw) : face[0] === '+' ? hw : -hw
      const fm = faceFrame(face, plane, face === '+z' ? cx : face === '-z' ? -cx : 0)
      for (const su of [-1, 1]) pil(b, fm, su * (hw - 0.17), 0.34, yTop, BC.top, 0.1)
      win(b, fm, 'round', 0.7, 1.35, 11.15, { fill: 'wood', surround: 0.14 })
      for (let k = 0; k < 4; k++) b.add('wood', metricBox(0.66, 0.05, 0.08), M(fm, mat(0, 11.3 + k * 0.26, 0.05, 0, 0.5)))
    }
    // wooden eaves and bell-cast pyramid roof (copper)
    b.block('plSoffit', hw * 2 + 0.9, 0.22, hw * 2 + 0.9, cx, BC.top, 0)
    const y0 = BC.top + 0.22
    const q = Math.SQRT2
    const st: [number, number][] = [
      [(hw + 0.5) * q, y0],
      [(hw + 0.25) * q, y0 + 0.18],
      [(hw - 0.05) * q, y0 + 0.42],
      [0.62 * q, y0 + 0.95],
      [0.06, y0 + 1.6],
    ]
    helm(b, ROOF, { x: cx, z: 0, n: 4, phase: Math.PI / 4, stations: st, flat: true })
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let i = 0; i < st.length - 1; i++) {
        const [r0, h0] = st[i]
        const [r1, h1] = st[i + 1]
        b.beam(ROOF, V(cx + (sx * r0) / q, h0 + 0.03, (sz * r0) / q), V(cx + (sx * r1) / q, h1 + 0.03, (sz * r1) / q), 0.07, 0.06)
      }
    }
    const top = y0 + 1.6
    b.add('trim', new THREE.SphereGeometry(0.12, 10, 8), mat(cx, top + 0.02, 0))
    cross(b, 'trim', cx, top, 0, 1.35, true, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1.5, 9.4, -2.6],
  materials: (base) => ({
    plYellow: (() => {
      const m = (base.plasterYellow as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color('#efe0a6')
      return m
    })(),
    plSocle: new THREE.MeshStandardMaterial({ color: '#d9d4c9', roughness: 0.85 }),
    plSoffit: new THREE.MeshStandardMaterial({ color: '#8a5a36', roughness: 0.7 }),
    plRidge: new THREE.MeshStandardMaterial({ color: '#a4502f', roughness: 0.8 }),
    plIcon: new THREE.MeshStandardMaterial({ color: '#c7a45f', roughness: 0.5, metalness: 0.2 }),
  }),
  notes: 'Front and porch from photographs; sides, apse and roof not photographed (assumed); copper roofs from the records, surfaces not documented.',
}
export default model
