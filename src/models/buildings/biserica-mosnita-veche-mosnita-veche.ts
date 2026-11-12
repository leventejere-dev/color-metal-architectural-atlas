/**
 * Orthodox church „Înălțarea Domnului", Moșnița Veche (Timiș) — rebuilt 1912
 * (Mitropolia Banatului deanery list), OSM way 540270856 (11-point outline
 * 23.0 × 10.5 m, long axis 68.8°).
 *
 * Modelling specification derived from three public reference photographs
 * published by the archdiocese (August 2022: the west front at ground level
 * and the new copper tower helm standing in the churchyard before it was
 * lifted; May 2023: part of a side elevation) and the OSM outline; real
 * metres, +X = east (rounded altar end), tower at −X:
 *  - Hall church 10.5 m wide whose east end is a full-width semicircle (the
 *    rounded end of the outline), one continuous eave.
 *  - West front in three sections separated by broad pilasters: the tower
 *    section in the middle (arched portal, moulding, arched icon niche) and
 *    a tall arched icon niche in each side section; gable shoulders rising
 *    into the tower.
 *  - Side elevations: recessed round-headed panels between pilaster strips,
 *    each with a tall round-arched window; light grey-white plaster.
 *  - Tower ≈4.0 m square with stepped corner pilasters, louvred belfry
 *    openings, clocks under segmental „eyebrows".
 *  - NEW HELM (photographed, 2022): baroque helm in new copper laid as
 *    diamond shingles — concave skirt with arched cut-outs over the clock
 *    eyebrows, octagonal bulb, louvred lantern, small bulb and pointed spire,
 *    cross; total ≈7.1 m (measured against the priest standing beside it).
 *  - METAL: the helm is shown as photographed (new copper). The nave and
 *    apse roofs are not visible on any available photograph; following the
 *    COLOR METAL records for the same campaign (copper, 2022) they are shown
 *    in copper standing seam (≈0.5 m pans) — which surfaces were done is not
 *    documented. Copper-coloured gutters and downpipes as photographed.
 * Approximations: no overall view exists — tower height, eave and roof pitch
 * are estimated from the façade photo and the regional type (eave ≈7.0 m,
 * tower cornice ≈18 m, cross ≈26.6 m); the diamond shingle pattern of the
 * helm is suggested by bands, not modelled shingle by shingle; the north
 * side and the apse are assumed.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, cross, faceFrame, seams, polyRing, loft } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XW = -11.5 // west front
const XA = 6.3 // centre of the rounded east end
const HW = 5.25
const EAVE = 7.0
const PITCH = 40
const TP = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * TP
const OV = 0.45
const TW = { x0: XW, x1: XW + 4.0, hw: 2.0, top: 18.0 }

const WALL = 'mvPlaster'
const WHITE = 'plasterWhite'
const ROOF = 'copperNew'
const SEAM: SeamSpec = seams(ROOF, 0.5, 0.05, 0.045)

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; frame?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(o.frame ?? 'wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.07, 0, y0), 0.06), m)
  const sw = o.surround ?? 0.16
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.06, h + 0.04, sw, 0, y0 - 0.04), 0.08), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.15, 0.1, 0.2), M(m, mat(0, y0 - sw - 0.02, 0.08)))
}

function pil(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.16, key = WALL) {
  b.add(key, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

/** Recessed round-headed panel: a raised frame (pilaster strips + arch) around a flat field. */
function panel(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number) {
  const outer = new THREE.Shape(opening('round', w + 0.5, y1 - y0 + 0.25, u, y0 - 0.25, 16))
  outer.holes.push(new THREE.Path(opening('round', w, y1 - y0, u, y0, 16)))
  b.add(WALL, extrude(outer, 0.12), m)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- walls ---------------- */
  const nl = XA - XW
  b.block(WALL, nl, EAVE, HW * 2, (XW + XA) / 2, 0, 0)
  b.add(WALL, new THREE.CylinderGeometry(HW, HW, EAVE, 44, 1, false, 0, Math.PI), mat(XA, EAVE / 2, 0))
  b.block('socle', nl + 0.16, 0.55, HW * 2 + 0.16, (XW + XA) / 2, 0, 0)
  b.add('socle', new THREE.CylinderGeometry(HW + 0.08, HW + 0.08, 0.55, 44, 1, false, 0, Math.PI), mat(XA, 0.275, 0))
  b.block(WHITE, nl + 0.3, 0.3, HW * 2 + 0.34, (XW + XA) / 2 - 0.15, EAVE - 0.42, 0)
  b.add(WHITE, new THREE.CylinderGeometry(HW + 0.17, HW + 0.17, 0.3, 44, 1, false, 0, Math.PI), mat(XA, EAVE - 0.27, 0))
  b.block(WALL, nl + 0.36, 0.14, HW * 2 + 0.44, (XW + XA) / 2 - 0.18, EAVE - 0.12, 0)

  /* ---------------- side elevations ---------------- */
  const pils = [XW + 0.35, -7.2, -2.9, 1.4, 5.9]
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    for (const x of pils) pil(b, at(x), 0, 0.8, 0.55, EAVE - 0.42, 0.18)
    for (let i = 0; i < pils.length - 1; i++) {
      const xm = (pils[i] + pils[i + 1]) / 2
      const w = pils[i + 1] - pils[i] - 1.5
      panel(b, at(xm), 0, w, 1.0, EAVE - 0.9)
      win(b, at(xm), 'round', 1.15, 2.7, 2.6)
    }
    // copper gutter + downpipes
    const gy = EAVE - OV * TP - 0.08
    b.beam(ROOF, V(XW - 0.1, gy, s * (HW + OV + 0.05)), V(XA, gy, s * (HW + OV + 0.05)), 0.14, 0.14)
    for (const x of [XW + 0.75, XA - 0.2]) b.rod(ROOF, V(x, 0.3, s * (HW + 0.12)), V(x, gy, s * (HW + 0.12)), 0.055, 8)
  }
  // rounded east end: pilasters and two small windows
  for (const a of [Math.PI / 2 - 1.0, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, Math.PI / 2 + 1.0]) {
    const m = mat(XA + HW * Math.sin(a), 0, HW * Math.cos(a), a)
    pil(b, m, 0, 0.7, 0.55, EAVE - 0.42, 0.14)
  }
  for (const a of [Math.PI / 2 - 0.68, Math.PI / 2 + 0.68]) win(b, mat(XA + HW * Math.sin(a), 0, HW * Math.cos(a), a), 'round', 0.9, 2.0, 3.0)

  /* ---------------- west front ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    for (const u of [-HW + 0.45, HW - 0.45]) pil(b, m, u, 0.9, 0.55, EAVE - 0.42, 0.2)
    for (const u of [-TW.hw - 0.2, TW.hw + 0.2]) pil(b, m, u, 0.55, 0.55, TW.top - 0.4, 0.22)
    // tower section: portal, moulding, icon niche
    win(b, m, 'round', 1.4, 2.7, 0.2, { fill: 'wood', sill: false, surround: 0.2 })
    b.add(WHITE, metricBox(3.2, 0.22, 0.24), M(m, mat(0, 3.45, 0.12)))
    win(b, m, 'round', 0.85, 1.6, 4.1, { fill: 'mvIcon', sill: false, surround: 0.12 })
    // side sections: tall arched icon niches
    for (const u of [-3.55, 3.55]) win(b, M(m, mat(u, 0, 0)), 'round', 0.95, 2.9, 1.6, { fill: 'mvIcon', surround: 0.14 })
    // gable shoulders rising into the tower
    const g: [number, number][] = [
      [-HW - 0.05, EAVE - 0.05],
      [-4.4, EAVE + 0.5],
      [-3.7, EAVE + 1.3],
      [-3.1, EAVE + 2.3],
      [-TW.hw, EAVE + 3.4],
    ]
    const pts = [...g, [-TW.hw, EAVE - 0.05] as [number, number]]
    for (const sg of [-1, 1]) {
      const shape = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(sg * u, y)))
      b.add(WALL, extrude(shape, 0.5), M(m, mat(0, 0, -0.5)))
      for (let i = 0; i < g.length - 1; i++) {
        const [u1, y1] = g[i]
        const [u2, y2] = g[i + 1]
        b.beam(WHITE, V(XW - 0.1, y1 + 0.08, sg * u1), V(XW - 0.1, y2 + 0.08, sg * u2), 0.18, 0.32, V(-1, 0, 0))
      }
    }
  }

  /* ---------------- roofs (copper standing seam) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = HW + OV
    const xa = XW + 0.3
    facet(b, ROOF, [V(xa, ye, he), V(XA, ye, he), V(XA, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [V(XA, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(XA, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ROOF, V(xa, RIDGE + 0.06, 0), V(XA, RIDGE + 0.06, 0), 0.24, 0.12)
    // half-cone over the rounded east end, ribbed
    const apex = V(XA, RIDGE, 0)
    const n = 32
    const ring: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      ring.push(V(XA + Math.sin(a) * he, ye, Math.cos(a) * he))
    }
    for (let i = 0; i < n; i++) {
      facet(b, ROOF, [ring[i], ring[i + 1], apex], { thickness: 0.08 })
      b.beam(ROOF, ring[i].clone().add(V(0, 0.03, 0)), apex.clone().add(V(0, 0.03, 0)), 0.05, 0.05)
      b.beam(ROOF, ring[i].clone().add(V(0, -0.08, 0)), ring[i + 1].clone().add(V(0, -0.08, 0)), 0.14, 0.14)
    }
    b.add(ROOF, new THREE.SphereGeometry(0.2, 12, 8), mat(XA, RIDGE + 0.2, 0))
    cross(b, 'gilt', XA, RIDGE + 0.2, 0, 1.1, false, Math.PI / 2)
  }

  /* ---------------- tower ---------------- */
  {
    const cx = (TW.x0 + TW.x1) / 2
    const hw = TW.hw
    const yb = EAVE - 0.4
    b.block(WALL, hw * 2, TW.top - yb, hw * 2, cx, yb, 0)
    b.block(WHITE, hw * 2 + 0.3, 0.4, hw * 2 + 0.3, cx, RIDGE + 0.15, 0)
    b.block(WHITE, hw * 2 + 0.36, 0.3, hw * 2 + 0.36, cx, TW.top - 0.3, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? hw : -hw) : face[0] === '+' ? hw : -hw
      const m = faceFrame(face, plane, face === '+z' ? cx : face === '-z' ? -cx : 0)
      const y0 = RIDGE + 0.55
      for (const su of [-1, 1]) {
        pil(b, m, su * (hw - 0.27), 0.54, y0, TW.top - 0.3, 0.12, WHITE)
        pil(b, m, su * (hw - 0.66), 0.24, y0 + 0.3, TW.top - 0.7, 0.06, WHITE)
      }
      // louvred belfry opening
      win(b, m, 'round', 1.0, 2.3, 12.9, { fill: 'black', surround: 0.15 })
      for (let k = 0; k < 5; k++) b.add('wood', metricBox(0.95, 0.06, 0.1), M(m, mat(0, 13.2 + k * 0.36, 0.05, 0, 0.5)))
      // clock under a segmental eyebrow (cornice raised over it)
      b.add('clock', new THREE.CylinderGeometry(0.48, 0.48, 0.08, 24), M(m, mat(0, 16.75, 0.05, 0, Math.PI / 2)))
      b.add('gilt', new THREE.TorusGeometry(0.48, 0.04, 4, 24), M(m, mat(0, 16.75, 0.09)))
      const eb = new THREE.Shape()
      eb.moveTo(-hw - 0.18, 0)
      eb.lineTo(hw + 0.18, 0)
      eb.lineTo(hw + 0.18, 0.3)
      eb.lineTo(0.95, 0.3)
      eb.quadraticCurveTo(0, 1.25, -0.95, 0.3)
      eb.lineTo(-hw - 0.18, 0.3)
      eb.lineTo(-hw - 0.18, 0)
      b.add(WHITE, extrude(eb, 0.3, 10), M(m, mat(0, TW.top, -0.12)))
    }

    /* new copper helm (as photographed, Aug 2022) */
    const y0 = TW.top + 0.3
    const H = ROOF
    const skirt: [number, number][] = [
      [2.3, y0],
      [2.05, y0 + 0.25],
      [1.7, y0 + 0.65],
      [1.38, y0 + 1.1],
      [1.15, y0 + 1.55],
      [1.05, y0 + 1.9],
    ]
    helm(b, H, { x: cx, z: 0, n: 8, stations: skirt })
    // (the clock eyebrows of the tower cornice cut into the skirt as arches)
    b.add(H, loft([polyRing(8, 1.12, y0 + 1.9, Math.PI / 8, cx, 0), polyRing(8, 1.12, y0 + 2.05, Math.PI / 8, cx, 0)], { capTop: true, capBottom: true, flat: true }))
    const bulb: [number, number][] = [
      [1.0, y0 + 2.05],
      [1.2, y0 + 2.35],
      [1.22, y0 + 2.7],
      [1.05, y0 + 3.05],
      [0.75, y0 + 3.35],
      [0.62, y0 + 3.55],
      [0.66, y0 + 3.7],
    ]
    helm(b, H, { x: cx, z: 0, n: 8, stations: bulb })
    // diamond-shingle bands (suggested): thin horizontal rings on the skirt and bulb
    for (const [r, y] of [[1.92, y0 + 0.35], [1.55, y0 + 0.85], [1.25, y0 + 1.35], [1.16, y0 + 2.3], [1.2, y0 + 2.85]] as [number, number][]) {
      b.add(H, loft([polyRing(8, r + 0.02, y, Math.PI / 8, cx, 0), polyRing(8, r + 0.02, y + 0.04, Math.PI / 8, cx, 0)], { capTop: true, capBottom: true, flat: true }))
    }
    // lantern with louvred arched openings
    const ly = y0 + 3.7
    const lw = 0.65
    const lh = 1.45
    b.block(H, lw * 2, lh, lw * 2, cx, ly, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? lw : -lw) : face[0] === '+' ? lw : -lw
      const m = faceFrame(face, plane, face === '+z' ? cx : face === '-z' ? -cx : 0)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.45, 0.95, 0, ly + 0.25, 8))), M(m, mat(0, 0, 0.02)))
      b.add(H, extrude(frameShape('round', 0.45, 0.95, 0.06, 0, ly + 0.25), 0.05), m)
      for (const su of [-1, 1]) b.add(H, metricBox(0.14, lh, 0.06), M(m, mat(su * (lw - 0.07), ly + lh / 2, 0.03)))
    }
    b.block(H, lw * 2 + 0.34, 0.16, lw * 2 + 0.34, cx, ly + lh, 0)
    const sy = ly + lh + 0.16
    const sp: [number, number][] = [
      [0.55, sy],
      [0.45, sy + 0.2],
      [0.38, sy + 0.45],
      [0.24, sy + 0.62],
      [0.2, sy + 0.7],
      [0.02, sy + 1.75],
    ]
    helm(b, H, { x: cx, z: 0, n: 8, stations: sp })
    const top = sy + 1.75
    b.add('gilt', new THREE.SphereGeometry(0.14, 12, 8), mat(cx, top + 0.05, 0))
    cross(b, 'gilt', cx, top + 0.05, 0, 1.45, true, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-9.5, 21.5, 0],
  materials: (base) => ({
    mvPlaster: (() => {
      const m = (base.plasterWhite as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color('#e3e5e4')
      return m
    })(),
    mvIcon: new THREE.MeshStandardMaterial({ color: '#c9a35e', roughness: 0.5, metalness: 0.2 }),
  }),
  notes: 'No overall photograph: massing from the OSM outline, the west front and side photos; the new copper helm as photographed in 2022; nave roof copper assumed from the records.',
}
export default model
