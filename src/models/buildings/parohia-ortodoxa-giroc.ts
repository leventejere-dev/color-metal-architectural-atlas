/**
 * Old Orthodox church „Sf. Mucenic Dimitrie", Giroc (Timiș) — 1759, OSM way
 * 223846005 (coarse 4-point outline 19.0 × 9.5 m, long axis 80.7°).
 *
 * Modelling specification derived from the 8 reference photographs (3 drone
 * views, 5 ground details); real metres, +X = liturgical east (apse):
 *  - Baroque hall church: narrow nave (7.4 m) with a west tower built into
 *    the façade; at the east end a slightly wider choir bay (9.0 m, the two
 *    shallow lateral projections seen on the drone photos) and a broad
 *    semicircular altar apse.
 *  - Roofs: steep (≈40°) gable roof over nave and choir; each lateral choir
 *    projection carries a small hipped roof wing reaching mid-slope; the
 *    apse has a half-cone roof whose apex closes the ridge, with a gilded
 *    globe and cross. Grey double-lock standing seam (~0.5 m) with staggered
 *    cross joints; dark-brown gutters and downpipes.
 *  - West front: three round-headed openings (door between two windows)
 *    framed by white pilasters, main cornice, baroque gable with curved
 *    shoulders and a mosaic icon, rising into the tower.
 *  - Tower (3.3 m square): white plinth band at ridge height, cream shaft with
 *    stepped white corner pilasters, one round-arched louvred belfry opening
 *    and a clock per face, cornice raised in a segmental „eyebrow" over each
 *    clock; octagonal baroque helm: concave foot, bulb (dated 2020), neck,
 *    louvred lantern, slender spire, gilded globe and cross.
 *  - Walls cream/pale yellow with white pilasters and window surrounds.
 *  - METAL (as photographed): nave/choir/apse roofs grey (rendered with the
 *    pre-weathered slate-zinc swatch; the register lists copper for this
 *    parish, which may be the dark-brown helm — not verifiable from the
 *    photographs); tower helm and lantern dark-brown aged copper.
 * Approximations: the OSM outline is a coarse rectangle — length and the
 * choir/apse proportions were re-measured on the drone photos (model ≈ 21.6
 * × 9.0 m); heights estimated (no survey); north side mirrored; the modern
 * glazed side canopy and temporary awnings are omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, spire, cross, faceFrame, seams } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/* ---------------- dimensions (m) ---------------- */
const XW = -10.8 // west façade
const XC = 2.6 // nave → choir
const XA = 6.6 // choir → apse (apse centre line)
const NHW = 3.7 // nave half width
const CHW = 4.5 // choir half width
const AR = 4.2 // apse radius (walls)
const EAVE = 6.0
const TP = Math.tan((40 * Math.PI) / 180)
const RIDGE = EAVE + NHW * TP
const OV = 0.4 // eave overhang
const TW = { x0: XW, x1: XW + 3.3, hw: 1.65, base: RIDGE - 0.15, top: 14.4 }

const ROOF = 'oldRoof'
const SEAM: SeamSpec = seams('oldRoof', 0.5, 0.045, 0.04)
const WALL = 'plasterYellow'
const WHITE = 'plasterWhite'
const CU = 'oldCopper'

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; frame?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(o.frame ?? 'wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.06, 0, y0), 0.06), m)
  const sw = o.surround ?? 0.2
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.08, h + 0.04, sw, 0, y0 - 0.04), 0.09), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.2, 0.12, 0.22), M(m, mat(0, y0 - sw - 0.02, 0.1)))
}

/** White pilaster strip on a facade frame at local u. */
function pilaster(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.1) {
  b.add(WHITE, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- walls ---------------- */
  const nl = XA - XW
  b.block(WALL, nl, EAVE, NHW * 2, (XW + XA) / 2, 0, 0)
  b.block(WALL, XA - XC, EAVE, CHW * 2, (XC + XA) / 2, 0, 0)
  b.add(WALL, new THREE.CylinderGeometry(AR, AR, EAVE - 0.15, 40, 1, false, 0, Math.PI), mat(XA, (EAVE - 0.15) / 2, 0))
  // socle
  b.block('socle', nl + 0.2, 0.55, NHW * 2 + 0.2, (XW + XA) / 2, 0, 0)
  b.block('socle', XA - XC + 0.2, 0.55, CHW * 2 + 0.2, (XC + XA) / 2, 0, 0)
  b.add('socle', new THREE.CylinderGeometry(AR + 0.1, AR + 0.1, 0.55, 40, 1, false, 0, Math.PI), mat(XA, 0.275, 0))
  // main cornice (white) with dark metal flashing
  b.block(WHITE, XC - XW + 0.3, 0.3, NHW * 2 + 0.36, (XW + XC) / 2 - 0.15, EAVE - 0.5, 0)
  b.block(WHITE, XA - XC, 0.3, CHW * 2 + 0.36, (XC + XA) / 2, EAVE - 0.5, 0)
  b.add(WHITE, new THREE.CylinderGeometry(AR + 0.16, AR + 0.16, 0.3, 40, 1, false, 0, Math.PI), mat(XA, EAVE - 0.45, 0))
  b.block(CU, XC - XW + 0.36, 0.06, NHW * 2 + 0.5, (XW + XC) / 2 - 0.15, EAVE - 0.13, 0)

  /* ---------------- side elevations ---------------- */
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const nave = (x: number) => faceFrame(face, s * NHW, s > 0 ? x : -x)
    const choir = (x: number) => faceFrame(face, s * CHW, s > 0 ? x : -x)
    for (const x of [-6.4, -2.9, 0.6]) win(b, nave(x), 'segment', 1.1, 2.1, 2.5)
    for (const x of [XW + 0.25, -8.2, -4.65, -1.15, XC - 0.25]) pilaster(b, nave(x), 0, 0.5, 0.55, EAVE - 0.45)
    win(b, choir((XC + XA) / 2), 'segment', 1.1, 2.1, 2.5)
    for (const x of [XC + 0.25, XA - 0.25]) pilaster(b, choir(x), 0, 0.5, 0.55, EAVE - 0.45)
    // gutters + downpipes (dark brown)
    b.beam(CU, V(XW - 0.2, EAVE - OV * TP - 0.08, s * (NHW + OV + 0.06)), V(XC, EAVE - OV * TP - 0.08, s * (NHW + OV + 0.06)), 0.14, 0.14)
    b.beam(CU, V(XC - OV, EAVE - OV * TP - 0.08, s * (CHW + OV + 0.06)), V(XA + OV, EAVE - OV * TP - 0.08, s * (CHW + OV + 0.06)), 0.14, 0.14)
    for (const x of [XW + 0.6, XC - 0.6]) b.rod(CU, V(x, 0.3, s * (NHW + 0.12)), V(x, EAVE - 0.5, s * (NHW + 0.12)), 0.055, 8)
  }
  // apse: white pilasters, one small axial window
  for (const a of [Math.PI / 2 - 0.75, Math.PI / 2 + 0.75]) {
    const m = mat(XA + AR * Math.sin(a), 0, AR * Math.cos(a), a)
    pilaster(b, m, 0, 0.55, 0.55, EAVE - 0.45, 0.12)
  }
  win(b, mat(XA + AR, 0, 0, Math.PI / 2), 'segment', 0.8, 1.3, 1.2)

  /* ---------------- west front: openings, pilasters, baroque gable, mosaic ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    win(b, m, 'round', 1.4, 2.9, 0.55, { fill: 'wood', frame: 'black', sill: false })
    for (const u of [-2.25, 2.25]) win(b, M(m, mat(u, 0, 0)), 'round', 1.0, 1.9, 1.5)
    for (const u of [-3.45, -1.15, 1.15, 3.45]) pilaster(b, m, u, 0.5, 0.55, EAVE - 0.45, 0.12)
    // gable with curved shoulders rising into the tower
    const g: [number, number][] = [
      [-NHW - 0.1, EAVE - 0.05],
      [-3.55, EAVE + 0.35],
      [-3.25, EAVE + 0.75],
      [-2.75, EAVE + 1.05],
      [-2.3, EAVE + 1.5],
      [-2.05, EAVE + 2.2],
      [-1.95, RIDGE + 0.1],
    ]
    const pts = [...g, ...g.map(([u, y]) => [-u, y] as [number, number]).reverse()]
    const shape = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u, y)))
    b.add(WALL, extrude(shape, 0.45), M(m, mat(0, 0, -0.45)))
    // white coping following the gable outline
    for (let i = 0; i < g.length - 1; i++) {
      for (const sg of [-1, 1]) {
        const [u1, y1] = g[i]
        const [u2, y2] = g[i + 1]
        b.beam(WHITE, V(XW + 0.17, y1 + 0.06, sg * u1), V(XW + 0.17, y2 + 0.06, sg * u2), 0.14, 0.58, V(1, 0, 0))
      }
    }
    // mosaic icon panel
    b.add('trim', metricBox(2.75, 1.75, 0.08), M(m, mat(0, EAVE + 1.1, 0.04)))
    b.add('oldMosaic', metricBox(2.55, 1.55, 0.06), M(m, mat(0, EAVE + 1.1, 0.08)))
  }

  /* ---------------- roofs (grey double-lock standing seam) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = NHW + OV
    const xa = XW - 0.12
    const xb = XA
    // main gable over nave + choir (west end hidden behind the parapet gable)
    facet(b, ROOF, [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, ROOF, [V(xb, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(ROOF, V(xa, RIDGE + 0.05, 0), V(xb, RIDGE + 0.05, 0), 0.22, 0.12)
    // hipped roof wings over the lateral choir projections
    const xm = (XC + XA) / 2
    const half = (XA - XC) / 2 + OV
    const yr = ye + half * TP
    const zo = CHW + OV
    const zApex = zo - half
    const zIn = NHW - (yr - EAVE) / TP - 0.2
    for (const s of [-1, 1]) {
      const W = V(XC - OV, ye, 0)
      const E = V(XA + OV, ye, 0)
      facet(b, ROOF, [V(W.x, ye, s * zIn), V(W.x, ye, s * zo), V(xm, yr, s * zApex), V(xm, yr, s * zIn)], { seams: SEAM, thickness: 0.08, hint: V(-1, 1, 0) })
      facet(b, ROOF, [V(E.x, ye, s * zo), V(E.x, ye, s * zIn), V(xm, yr, s * zIn), V(xm, yr, s * zApex)], { seams: SEAM, thickness: 0.08, hint: V(1, 1, 0) })
      facet(b, ROOF, [V(W.x, ye, s * zo), V(E.x, ye, s * zo), V(xm, yr, s * zApex)], { seams: SEAM, thickness: 0.08, hint: V(0, 1, s) })
      b.beam(ROOF, V(xm, yr + 0.04, s * zIn), V(xm, yr + 0.04, s * zApex), 0.16, 0.1)
      for (const ex of [W.x, E.x]) b.beam(ROOF, V(ex, ye + 0.04, s * zo), V(xm, yr + 0.04, s * zApex), 0.14, 0.09)
    }
    // half-cone over the apse; its apex closes the ridge
    const apex = V(XA, RIDGE, 0)
    const n = 28
    const ring: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      ring.push(V(XA + Math.sin(a) * (AR + OV), ye, Math.cos(a) * (AR + OV)))
    }
    for (let i = 0; i < n; i++) {
      facet(b, ROOF, [ring[i], ring[i + 1], apex], { thickness: 0.08 })
      b.beam(ROOF, ring[i].clone().add(V(0, 0.03, 0)), apex.clone().add(V(0, 0.03, 0)), 0.05, 0.05)
    }
    for (let i = 0; i < n; i++) b.beam(CU, ring[i].clone().add(V(0, -0.08, 0)), ring[i + 1].clone().add(V(0, -0.08, 0)), 0.14, 0.14)
    // finial: copper cone, gilded globe and cross
    b.add(CU, new THREE.ConeGeometry(0.22, 0.6, 10), mat(XA, RIDGE + 0.25, 0))
    b.add('gilt', new THREE.SphereGeometry(0.26, 14, 10), mat(XA, RIDGE + 0.75, 0))
    cross(b, 'gilt', XA, RIDGE + 0.75, 0, 1.3, false, Math.PI / 2)
  }

  /* ---------------- tower ---------------- */
  {
    const cx = (TW.x0 + TW.x1) / 2
    const hw = TW.hw
    // shaft rising from inside the nave (west face flush with the façade)
    b.block(WALL, hw * 2, TW.top - EAVE, hw * 2, cx, EAVE, 0)
    b.block(WHITE, hw * 2 + 0.3, 0.55, hw * 2 + 0.3, cx, TW.base, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? hw : -hw) : face[0] === '+' ? hw : -hw
      const u = face === '+z' ? cx : face === '-z' ? -cx : 0
      const m = faceFrame(face, plane, u)
      const y0 = TW.base + 0.55
      // stepped white corner pilasters
      for (const su of [-1, 1]) {
        b.add(WHITE, metricBox(0.55, TW.top - y0, 0.1), M(m, mat(su * (hw - 0.27), (y0 + TW.top) / 2, 0.05)))
        b.add(WHITE, metricBox(0.25, TW.top - y0 - 0.9, 0.06), M(m, mat(su * (hw - 0.66), (y0 + 0.45 + TW.top - 0.45) / 2, 0.03)))
      }
      // belfry opening (louvres), imposts and sill
      win(b, m, 'round', 0.95, 1.85, 11.2, { fill: 'wood', frame: 'black', surround: 0 })
      b.add(WHITE, metricBox(1.5, 0.14, 0.18), M(m, mat(0, 12.6, 0.07)))
      b.add(WHITE, metricBox(1.45, 0.12, 0.2), M(m, mat(0, 11.1, 0.08)))
      // clock face
      b.add('clock', new THREE.CylinderGeometry(0.36, 0.36, 0.08, 24), M(m, mat(0, 13.75, 0.05, 0, Math.PI / 2)))
      b.add('gilt', new THREE.TorusGeometry(0.36, 0.03, 4, 24), M(m, mat(0, 13.75, 0.09)))
      // cornice with a segmental "eyebrow" over the clock
      const eb = new THREE.Shape()
      eb.moveTo(-hw - 0.2, 0)
      eb.lineTo(hw + 0.2, 0)
      eb.lineTo(hw + 0.2, 0.35)
      eb.lineTo(0.85, 0.35)
      eb.quadraticCurveTo(0, 1.05, -0.85, 0.35)
      eb.lineTo(-hw - 0.2, 0.35)
      eb.lineTo(-hw - 0.2, 0)
      b.add(WHITE, extrude(eb, 0.3, 10), M(m, mat(0, TW.top, -0.12)))
      b.beam(CU, V(-hw - 0.22, TW.top + 0.38, 0.1).applyMatrix4(m), V(hw + 0.22, TW.top + 0.38, 0.1).applyMatrix4(m), 0.18, 0.05)
    }
    b.block(WHITE, hw * 2 + 0.2, 0.35, hw * 2 + 0.2, cx, TW.top - 0.05, 0)
    b.block(CU, hw * 2 + 0.5, 0.1, hw * 2 + 0.5, cx, TW.top + 0.3, 0)

    /* octagonal baroque helm (dark-brown aged copper) */
    const y0 = TW.top + 0.4
    const st: [number, number][] = [
      [1.78, y0],
      [1.5, y0 + 0.3],
      [1.3, y0 + 0.65],
      [1.36, y0 + 0.95],
      [1.5, y0 + 1.25],
      [1.42, y0 + 1.55],
      [1.08, y0 + 1.9],
      [0.66, y0 + 2.15],
      [0.6, y0 + 2.3],
    ]
    helm(b, CU, { x: cx, z: 0, n: 8, stations: st })
    // lantern with louvres
    const ly = y0 + 2.3
    const lh = 1.5
    b.block(CU, 1.15, lh, 1.15, cx, ly, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? 0.575 : -0.575) : face[0] === '+' ? 0.575 : -0.575
      const m = faceFrame(face, plane, face === '+z' ? cx : face === '-z' ? -cx : 0)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.42, 0.85, 0, ly + 0.3, 8))), M(m, mat(0, 0, 0.02)))
    }
    b.block(CU, 1.4, 0.14, 1.4, cx, ly + lh, 0)
    const sy = spire(b, CU, { x: cx, z: 0, y0: ly + lh + 0.14, r: 0.86, h: 1.7, n: 8 })
    b.add('gilt', new THREE.SphereGeometry(0.2, 14, 10), mat(cx, sy + 0.12, 0))
    cross(b, 'gilt', cx, sy + 0.1, 0, 1.25, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1.5, 7.6, 2.4],
  materials: (base) => {
    // weathered mid-grey standing seam as photographed (slate-zinc swatch, toned darker)
    const roof = (base.zincSlate as THREE.MeshStandardMaterial).clone()
    roof.color = new THREE.Color('#a3a7ab')
    roof.roughness = 0.55
    // dark-brown aged copper of the 2020 helm (oxidised-copper swatch, toned down)
    const cu = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    cu.color = new THREE.Color('#877b76')
    cu.metalness = 0.6
    cu.roughness = 0.48
    return {
      oldRoof: roof,
      oldCopper: cu,
      oldMosaic: new THREE.MeshStandardMaterial({ color: '#b98f4e', roughness: 0.5, metalness: 0.2 }),
    }
  },
  notes: 'Coarse OSM outline: length and choir/apse proportions re-measured on the drone photos; heights estimated; north side mirrored.',
}
export default model
