/**
 * Orthodox church „Sfinții Apostoli Petru și Pavel", Jdioara (comuna
 * Criciova, Timiș) — 1907 (Mitropolia Banatului deanery list), OSM way
 * 672363695 (9-point outline 31.8 × 13.9 m, long axis 14.4°).
 *
 * Modelling specification derived from the only public exterior reference
 * photograph found (archdiocese news, October 2019: the west front and the
 * tower at an angle, with part of the nave side and roof) and the OSM
 * outline; real metres, +X = the polygonal altar end of the outline (NNE),
 * tower at −X (SSW):
 *  - Large hall church (modelled 13.0 m wide) with a polygonal (half-
 *    octagon) altar apse, slightly narrower and lower.
 *  - Nave sides: broad pilaster strips framing round-headed recessed panels,
 *    each with a tall arched window; white plaster.
 *  - West front: tower projecting from the façade; lower tower stage with an
 *    arched portal, a round window and a triangular dentilled pediment at
 *    eave level; side bays with arched icon niches under raking cornices.
 *  - Tower: intermediate stage with corner scroll buttresses, belfry with
 *    louvred arched openings and clocks, main cornice ≈20 m; baroque helm
 *    (not visible on the photograph — regional Banat type assumed: bell,
 *    bulb, lantern, spire) with cross.
 *  - METAL: the photograph (2019) predates the copper works recorded by
 *    COLOR METAL (2022 and 2023); the roofs (nave, apse) and the tower helm
 *    are shown in the register's copper (new copper, latest phase 2023) with
 *    standing seams ≈0.5 m — which surfaces were done is not documented.
 * Approximations: tier C — one partial photograph only. The OSM outline is
 * simplified (13.9 m wide, a step on one side near the apse); the model is
 * symmetrical and 13.0 m wide. All heights, the bay rhythm, the apse and the
 * helm are estimated from the regional type; the east end and the north side
 * are not documented.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, cross, faceFrame, seams, polyRing, loft, polygonalApse } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XF = -15.9 // tower front
const XW = -15.1 // façade plane of the nave
const XE = 10.5 // nave → apse
const HW = 6.5
const EAVE = 7.5
const PITCH = 40
const TP = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * TP
const OV = 0.45
const AP = { hw: 5.0, eave: 7.0 }
const TW = { x0: XF, x1: XF + 4.6, hw: 2.3, top: 19.6 }

const WALL = 'jdPlaster'
const WHITE = 'plasterWhite'
const ROOF = 'copperNew'
const SEAM: SeamSpec = seams(ROOF, 0.5, 0.05, 0.045)

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add('wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.06, 0, y0), 0.05), m)
  const sw = o.surround ?? 0.16
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.06, h + 0.04, sw, 0, y0 - 0.04), 0.08), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.15, 0.1, 0.2), M(m, mat(0, y0 - sw - 0.02, 0.08)))
}

function pil(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.16, key = WALL) {
  b.add(key, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

function panel(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number) {
  const outer = new THREE.Shape(opening('round', w + 0.44, y1 - y0 + 0.22, u, y0 - 0.22, 16))
  outer.holes.push(new THREE.Path(opening('round', w, y1 - y0, u, y0, 16)))
  b.add(WALL, extrude(outer, 0.12), m)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave ---------------- */
  const nl = XE - XW
  const xm = (XW + XE) / 2
  b.block(WALL, nl, EAVE, HW * 2, xm, 0, 0)
  b.block('socle', nl + 0.16, 0.6, HW * 2 + 0.16, xm, 0, 0)
  b.block(WALL, nl + 0.3, 0.3, HW * 2 + 0.34, xm, EAVE - 0.42, 0)
  b.block(WALL, nl + 0.42, 0.14, HW * 2 + 0.46, xm, EAVE - 0.12, 0)
  const pils = [XW + 0.4, -10.0, -5.0, 0.0, 5.0, XE - 0.4]
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    for (const x of pils) pil(b, at(x), 0, 0.85, 0.6, EAVE - 0.42, 0.18)
    for (let i = 0; i < pils.length - 1; i++) {
      const c = (pils[i] + pils[i + 1]) / 2
      panel(b, at(c), 0, pils[i + 1] - pils[i] - 1.6, 1.0, EAVE - 0.95)
      win(b, at(c), 'round', 1.3, 3.0, 2.9)
    }
    const gy = EAVE - OV * TP - 0.08
    b.beam(ROOF, V(XW, gy, s * (HW + OV + 0.05)), V(XE + 0.3, gy, s * (HW + OV + 0.05)), 0.14, 0.14)
    for (const x of [XW + 0.9, XE - 0.6]) b.rod(ROOF, V(x, 0.3, s * (HW + 0.12)), V(x, gy, s * (HW + 0.12)), 0.055, 8)
  }
  // east gable of the nave above the apse roof
  {
    const tri = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.2), new THREE.Vector2(HW, EAVE - 0.2), new THREE.Vector2(0, RIDGE - 0.05)])
    b.add(WALL, extrude(tri, 0.45), mat(XE - 0.45, 0, 0, Math.PI / 2))
  }

  /* ---------------- roofs (copper standing seam) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = HW + OV
    const xa = XW + 0.3
    const xb = XE + 0.35
    facet(b, ROOF, [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [V(xb, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ROOF, V(xa, RIDGE + 0.06, 0), V(xb, RIDGE + 0.06, 0), 0.26, 0.14)
    for (const sz of [-1, 1]) b.beam(ROOF, V(xb, ye, sz * he), V(xb, RIDGE + 0.05, 0), 0.22, 0.32, V(1, 0, 0))
  }

  /* ---------------- apse (half octagon) ---------------- */
  {
    const top = polygonalApse(b, { x0: XE, hw: AP.hw, y: AP.eave, sides: 4, wallKey: WALL, roofKey: ROOF, pitch: PITCH, seams: SEAM, overhang: 0.4 })
    b.block('socle', 0.6, 0.6, AP.hw * 2 + 0.16, XE + 0.3, 0, 0)
    const R = AP.hw / Math.cos(Math.PI / 8)
    for (const a of [-45, 0, 45]) {
      const ang = (a * Math.PI) / 180
      const ap = R * Math.cos(Math.PI / 8)
      win(b, mat(XE + Math.cos(ang) * ap, 0, Math.sin(ang) * ap, Math.PI / 2 - ang), 'round', 1.0, 2.4, 3.0)
    }
    b.add(ROOF, new THREE.SphereGeometry(0.18, 12, 8), mat(XE, top + 0.18, 0))
    cross(b, 'gilt', XE, top + 0.18, 0, 1.1, false, Math.PI / 2)
  }

  /* ---------------- west front ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    for (const u of [-HW + 0.4, HW - 0.4]) pil(b, m, u, 0.85, 0.6, EAVE - 0.42, 0.2)
    for (const u of [-4.4, 4.4]) win(b, M(m, mat(u, 0, 0)), 'round', 1.0, 2.8, 2.0, { fill: 'jdIcon', surround: 0.15 })
    // raking cornices from the façade corners up to the tower
    const g: [number, number][] = [
      [-HW - 0.05, EAVE - 0.05],
      [-TW.hw, EAVE + (HW - TW.hw) * TP],
    ]
    const pts: [number, number][] = [g[0], g[1], [-TW.hw, EAVE - 0.05]]
    for (const sg of [-1, 1]) {
      b.add(WALL, extrude(new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(sg * u, y))), 0.5), M(m, mat(0, 0, -0.5)))
      b.beam(WHITE, V(XW - 0.12, g[0][1] + 0.12, sg * g[0][0]), V(XW - 0.12, g[1][1] + 0.12, sg * g[1][0]), 0.3, 0.36, V(-1, 0, 0))
    }
  }

  /* ---------------- tower ---------------- */
  {
    const cx = (TW.x0 + TW.x1) / 2
    const hw = TW.hw
    const s1 = EAVE + 0.4 // top of the lower stage (pediment base)
    const s2 = RIDGE + 0.6 // top of the intermediate stage
    b.block(WALL, hw * 2, s1, hw * 2, cx, 0, 0)
    b.block('socle', hw * 2 + 0.2, 0.6, hw * 2 + 0.2, cx, 0, 0)
    b.block(WALL, hw * 2 - 0.3, s2 - s1, hw * 2 - 0.3, cx + 0.15, s1, 0)
    b.block(WALL, hw * 2 - 0.5, TW.top - s2, hw * 2 - 0.5, cx + 0.25, s2, 0)
    // cornices
    b.block(WHITE, hw * 2 + 0.3, 0.32, hw * 2 + 0.3, cx, s1 - 0.32, 0)
    b.block(WHITE, hw * 2, 0.3, hw * 2, cx + 0.15, s2 - 0.3, 0)
    b.block(WHITE, hw * 2 - 0.1, 0.3, hw * 2 - 0.1, cx + 0.25, TW.top - 0.3, 0)
    b.block(WHITE, hw * 2 + 0.25, 0.22, hw * 2 + 0.25, cx + 0.25, TW.top, 0)
    // lower stage front: portal, round window, dentilled pediment
    const f1 = faceFrame('-x', XF, 0)
    for (const u of [-hw + 0.3, hw - 0.3]) pil(b, f1, u, 0.6, 0.6, s1 - 0.32, 0.14)
    win(b, f1, 'round', 1.6, 3.2, 0.25, { fill: 'wood', sill: false, surround: 0.22 })
    b.add('glassC', new THREE.CircleGeometry(0.45, 20), M(f1, mat(0, 5.2, 0.03)))
    b.add(WALL, new THREE.TorusGeometry(0.52, 0.1, 6, 20), M(f1, mat(0, 5.2, 0.08)))
    const pr = 1.5
    const ped = new THREE.Shape([new THREE.Vector2(-hw - 0.15, 0), new THREE.Vector2(hw + 0.15, 0), new THREE.Vector2(0, pr)])
    b.add(WALL, extrude(ped, 0.45), M(f1, mat(0, s1, -0.3)))
    for (const sg of [-1, 1]) b.beam(WHITE, V(XF - 0.12, s1 + 0.05, sg * (hw + 0.2)), V(XF - 0.12, s1 + pr + 0.12, 0), 0.26, 0.3, V(-1, 0, 0))
    for (let i = -7; i <= 7; i++) b.add(WHITE, metricBox(0.13, 0.15, 0.12), M(f1, mat(i * 0.29, s1 - 0.42, 0.06)))
    // intermediate stage: corner scroll buttresses (quarter-round volutes)
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const x = cx + 0.15 + sx * (hw - 0.15)
      const z = sz * (hw - 0.15)
      const sh = new THREE.Shape()
      sh.moveTo(0, 0)
      sh.lineTo(0.75, 0)
      sh.quadraticCurveTo(0.1, 0.5, 0, 2.4)
      sh.lineTo(0, 0)
      const ang = Math.atan2(sz, sx)
      b.add(WALL, extrude(sh, 0.3), M(mat(x, s1, z, -ang), mat(0, 0, -0.15)))
    }
    // belfry and intermediate-stage openings on all faces
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const bw = hw - 0.25
      const plane = face.endsWith('x') ? cx + 0.25 + (face[0] === '+' ? bw : -bw) : face[0] === '+' ? bw : -bw
      const bm = faceFrame(face, plane, face === '+z' ? cx + 0.25 : face === '-z' ? -(cx + 0.25) : 0)
      for (const su of [-1, 1]) pil(b, bm, su * (bw - 0.25), 0.5, s2, TW.top - 0.3, 0.12)
      win(b, bm, 'round', 1.05, 2.6, s2 + 0.8, { fill: 'black', surround: 0.16 })
      for (let k = 0; k < 6; k++) b.add('wood', metricBox(1.0, 0.06, 0.1), M(bm, mat(0, s2 + 1.1 + k * 0.36, 0.05, 0, 0.5)))
      b.add('clock', new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), M(bm, mat(0, TW.top - 1.25, 0.05, 0, Math.PI / 2)))
      b.add('gilt', new THREE.TorusGeometry(0.55, 0.04, 4, 24), M(bm, mat(0, TW.top - 1.25, 0.09)))
      const im = faceFrame(face, face.endsWith('x') ? cx + 0.15 + (face[0] === '+' ? hw - 0.15 : -(hw - 0.15)) : face[0] === '+' ? hw - 0.15 : -(hw - 0.15), face === '+z' ? cx + 0.15 : face === '-z' ? -(cx + 0.15) : 0)
      if (face !== '+x') win(b, im, 'round', 0.7, 1.6, s1 + 1.6, { surround: 0.12 })
    }

    /* baroque helm (copper, regional type) */
    const hx = cx + 0.25
    const y0 = TW.top + 0.22
    const st: [number, number][] = [
      [2.35, y0],
      [2.15, y0 + 0.3],
      [1.75, y0 + 0.8],
      [1.35, y0 + 1.3],
      [1.15, y0 + 1.7],
      [1.1, y0 + 1.85],
      [1.32, y0 + 2.2],
      [1.42, y0 + 2.6],
      [1.25, y0 + 3.0],
      [0.85, y0 + 3.35],
      [0.62, y0 + 3.55],
    ]
    helm(b, ROOF, { x: hx, z: 0, n: 8, stations: st })
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2
      for (let i = 0; i < st.length - 1; i++) {
        const [r0, h0] = st[i]
        const [r1, h1] = st[i + 1]
        b.beam(ROOF, V(hx + Math.cos(a) * r0, h0, Math.sin(a) * r0), V(hx + Math.cos(a) * r1, h1, Math.sin(a) * r1), 0.06, 0.06)
      }
    }
    const ly = y0 + 3.55
    const lr = 0.72
    const lh = 1.6
    b.add(ROOF, loft([polyRing(8, lr, ly, Math.PI / 8, hx, 0), polyRing(8, lr, ly + lh, Math.PI / 8, hx, 0)], { capTop: true, flat: true }))
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2
      const ap = lr * Math.cos(Math.PI / 8)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.32, 0.9, 0, ly + 0.35, 8))), M(mat(hx + Math.cos(a) * ap, 0, Math.sin(a) * ap, Math.PI / 2 - a), mat(0, 0, 0.02)))
    }
    b.add(ROOF, loft([polyRing(8, lr + 0.2, ly + lh, Math.PI / 8, hx, 0), polyRing(8, lr + 0.2, ly + lh + 0.15, Math.PI / 8, hx, 0)], { capTop: true, capBottom: true, flat: true }))
    const sy = ly + lh + 0.15
    const sp: [number, number][] = [
      [0.78, sy],
      [0.55, sy + 0.3],
      [0.42, sy + 0.55],
      [0.3, sy + 0.75],
      [0.03, sy + 2.4],
    ]
    helm(b, ROOF, { x: hx, z: 0, n: 8, stations: sp })
    const top = sy + 2.4
    b.add('gilt', new THREE.SphereGeometry(0.18, 12, 8), mat(hx, top + 0.05, 0))
    cross(b, 'gilt', hx, top + 0.05, 0, 1.4, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 11, 4],
  materials: (base) => ({
    jdPlaster: (() => {
      const m = (base.plasterWhite as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color('#e9e6dc')
      return m
    })(),
    jdIcon: new THREE.MeshStandardMaterial({ color: '#b9a477', roughness: 0.5, metalness: 0.15 }),
  }),
  notes: 'Tier C: one partial photograph (west front and tower, 2019); apse, east end, helm and heights assumed from the Banat type; copper from the records.',
}
export default model
