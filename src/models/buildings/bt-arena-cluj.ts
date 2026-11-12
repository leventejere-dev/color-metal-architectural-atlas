/**
 * BT Arena (Sala Polivalentă), Cluj-Napoca — Dico și Țigănaș, opened 2014.
 *
 * COLOR METAL supplied aluminium façade profiles. Modelling specification
 * from the two web photographs of the west corner (01, 02) and the OSM
 * outline (way 210654887: a 112.9 × 88 m rectangle, long axis 56.6°/236.6°):
 *  - A single rectangular box. Base storey ≈ 7 m of translucent
 *    (polycarbonate-like) panels with slender vertical joints and glazed
 *    entrance groups, set back under the upper façade.
 *  - Upper façade ≈ 26 m: a deep three-dimensional grid of folded natural
 *    aluminium frames (≈ 3.1 m wide × 3.7 m high, 7 rows; 36 bays on the long
 *    sides, 28 on the short sides). Each frame is a pyramidal frustum folded
 *    back ≈ 1 m to a smaller opening, which reads as rows of diagonal "fins"
 *    when the façade is seen obliquely. Five rows are glazed behind; the
 *    second row from the top shows the dark steel roof structure; the top row
 *    is an open screen against the sky.
 *  - Roof: not visible in the photographs — modelled as a low vault concealed
 *    below the top of the screen.
 * Approximations: heights scaled from the entrance doors (≈ 3 m with
 * transom); module size and counts estimated from the photographs; entrance
 * positions on the unphotographed sides, the roof form and the steel
 * structure behind the screen are assumptions; frames modelled as plain
 * frusta (the real folds are slightly twisted).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const LX = 112.9
const LZ = 88.0
const HX = LX / 2
const HZ = LZ / 2
const BASE_H = 7.0
const ROW_H = 3.7
const ROWS = 7
const TOP = BASE_H + ROWS * ROW_H
const GLAZED_ROWS = 5
const ROOF_Y = BASE_H + GLAZED_ROWS * ROW_H
const BASE_SET = 0.9 // base set back under the upper façade
const DEPTH = 1.0 // depth of the folded frames

/**
 * One folded frame in façade-local coordinates (x along the façade, y up,
 * z outward; outer rim at z = 0). Four trapezoids with a back face; UVs are
 * collapsed onto one panel strip so the palette sheet reads as plain metal.
 */
function frameGeometry(W: number, H: number) {
  const iw = W * 0.6
  const ih = H * 0.66
  const ox = W / 2
  const ix = iw / 2
  const yb = (H - ih) / 2
  const o = [V(-ox, 0, 0), V(ox, 0, 0), V(ox, H, 0), V(-ox, H, 0)]
  const i = [V(-ix, yb, -DEPTH), V(ix, yb, -DEPTH), V(ix, yb + ih, -DEPTH), V(-ix, yb + ih, -DEPTH)]
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    let n = V().subVectors(b, a).cross(V().subVectors(c, a)).normalize()
    let pts = [a, b, c, d]
    if (n.z < 0) {
      pts = [d, c, b, a]
      n = n.negate()
    }
    const tri = [0, 1, 2, 0, 2, 3]
    for (const k of tri) {
      pos.push(pts[k].x, pts[k].y, pts[k].z)
      nor.push(n.x, n.y, n.z)
      uv.push(0.27, 3.5)
    }
    // back face, 4 cm behind
    const off = n.clone().multiplyScalar(-0.04)
    for (const k of [0, 2, 1, 0, 3, 2]) {
      const p = pts[k].clone().add(off)
      pos.push(p.x, p.y, p.z)
      nor.push(-n.x, -n.y, -n.z)
      uv.push(0.27, 3.5)
    }
  }
  quad(o[0], o[1], i[1], i[0]) // bottom
  quad(o[1], o[2], i[2], i[1]) // right
  quad(o[2], o[3], i[3], i[2]) // top
  quad(o[3], o[0], i[0], i[3]) // left
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}

interface Side {
  face: Face
  plane: number
  len: number
  bays: number
}
const SIDES: Side[] = [
  { face: '+z', plane: HZ, len: LX, bays: 36 },
  { face: '-z', plane: -HZ, len: LX, bays: 36 },
  { face: '+x', plane: HX, len: LZ, bays: 28 },
  { face: '-x', plane: -HX, len: LZ, bays: 28 },
]

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

function upperFacade(b: Builder) {
  for (const s of SIDES) {
    const W = s.len / s.bays
    const geo = frameGeometry(W, ROW_H)
    const fm = faceFrame(s.face, s.plane, 0, 0, 0)
    for (let r = 0; r < ROWS; r++) {
      const y0 = BASE_H + r * ROW_H
      for (let c = 0; c < s.bays; c++) {
        const u = -s.len / 2 + W * (c + 0.5)
        b.add('aluNatural', geo, M(fm, mat(u, y0, 0)))
      }
    }
    // flat rims of the frame grid (horizontal and vertical joints)
    for (let r = 0; r <= ROWS; r++) b.add('aluNatural', metricBox(s.len + 0.3, 0.16, 0.18), M(fm, mat(0, BASE_H + r * ROW_H, -0.05)))
    for (let c = 0; c <= s.bays; c++) b.add('aluNatural', metricBox(0.16, ROWS * ROW_H, 0.18), M(fm, mat(-s.len / 2 + W * c, BASE_H + (ROWS * ROW_H) / 2, -0.05)))
    // soffit of the cantilevered upper façade
    b.add('aluNatural', metricBox(s.len, 0.12, BASE_SET + 0.4), M(fm, mat(0, BASE_H - 0.06, -(BASE_SET + 0.4) / 2)))
    // glazed envelope behind the frames (five rows)
    b.add('arenaGlass', new THREE.PlaneGeometry(s.len - 0.2, GLAZED_ROWS * ROW_H), M(fm, mat(0, BASE_H + (GLAZED_ROWS * ROW_H) / 2, -DEPTH - 0.25)))
    // transoms / mullions of the glazing, one per frame
    for (let r = 1; r < GLAZED_ROWS; r++) b.add('stadDark', metricBox(s.len - 0.2, 0.12, 0.1), M(fm, mat(0, BASE_H + r * ROW_H, -DEPTH - 0.2)))
    for (let c = 0; c <= s.bays; c++) b.add('stadDark', metricBox(0.12, GLAZED_ROWS * ROW_H, 0.1), M(fm, mat(-s.len / 2 + W * c, BASE_H + (GLAZED_ROWS * ROW_H) / 2, -DEPTH - 0.2)))
    // steel roof structure behind the second row from the top
    b.add('stadDark', new THREE.PlaneGeometry(s.len - 4, ROW_H - 0.4), M(fm, mat(0, ROOF_Y + ROW_H / 2 - 0.2, -2.6)))
    for (let c = 0; c < s.bays; c += 2) {
      const u = -s.len / 2 + W * (c + 1)
      b.add('steel', metricBox(0.3, ROW_H * 1.4, 0.3), M(fm, mat(u, ROOF_Y + ROW_H * 0.7, -2.3)))
    }
    b.add('steel', metricBox(s.len - 3, 0.3, 0.3), M(fm, mat(0, ROOF_Y + ROW_H - 0.3, -2.3)))
    // top coping strip
    b.add('aluNatural', metricBox(s.len + 0.3, 0.12, 0.5), M(fm, mat(0, TOP + 0.06, -0.2)))
  }
}

function base(b: Builder) {
  const bx = HX - BASE_SET
  const bz = HZ - BASE_SET
  b.block('polycarb', 2 * bx, BASE_H, 2 * bz, 0, 0, 0)
  b.block('concrete', 2 * bx + 0.2, 0.35, 2 * bz + 0.2, 0, 0, 0)
  // vertical panel joints every ≈ 1.25 m and a head rail
  for (const s of SIDES) {
    const plane = s.plane - Math.sign(s.plane) * BASE_SET
    const len = (s.face.endsWith('z') ? bx : bz) * 2
    const fm = faceFrame(s.face, plane, 0, 0, 0)
    const n = Math.round(len / 1.25)
    for (let k = 1; k < n; k++) b.add('helm', metricBox(0.06, BASE_H - 0.4, 0.05), M(fm, mat(-len / 2 + (len * k) / n, 0.35 + (BASE_H - 0.35) / 2, 0.02)))
    b.add('helm', metricBox(len, 0.25, 0.08), M(fm, mat(0, BASE_H - 0.3, 0.03)))
  }
  // glazed entrance groups (positions from photo 01; others assumed symmetric)
  const entrance = (face: Face, plane: number, u: number, w: number, h = 3.0) => {
    const fm = faceFrame(face, plane, 0, 0, 0)
    b.add('glassC', new THREE.PlaneGeometry(w, h), M(fm, mat(u, 0.35 + h / 2, 0.06)))
    b.add('steel', metricBox(w + 0.3, 0.2, 0.12), M(fm, mat(u, 0.35 + h + 0.1, 0.06)))
    const n = Math.round(w / 1.2)
    for (let k = 0; k <= n; k++) b.add('steel', metricBox(0.08, h, 0.1), M(fm, mat(u - w / 2 + (w * k) / n, 0.35 + h / 2, 0.08)))
    b.add('steel', metricBox(w, 0.06, 0.1), M(fm, mat(u, 0.35 + 2.3, 0.08)))
  }
  const zf = HZ - BASE_SET
  const xf = HX - BASE_SET
  entrance('+z', zf, 27, 7.5)
  entrance('+z', zf, -27, 6.5, 3.4)
  entrance('-z', -zf, -27, 7.5)
  entrance('-z', -zf, 27, 6.5, 3.4)
  entrance('+x', xf, -32, 2.6) // u = −z on the +x face
  entrance('+x', xf, -14, 1.6)
  entrance('-x', -xf, 32, 2.6)
  entrance('-x', -xf, 14, 1.6)
  // louvre panels on the short side (photo 01)
  b.add('stadDark', metricBox(2.2, 1.0, 0.1), mat(xf + 0.06, 3.9, 32))
}

function roof(b: Builder) {
  const w = LX - 2 * (DEPTH + 0.4)
  const d = LZ - 2 * (DEPTH + 0.4)
  b.block('membrane', w, 0.3, d, 0, ROOF_Y - 0.3, 0)
  // low vault across the short span, crest kept below the top of the screen
  const rise = 3.4
  const segs = 18
  const R = ((d / 2) * (d / 2) + rise * rise) / (2 * rise)
  const a0 = Math.asin(d / 2 / R)
  for (let i = 0; i < segs; i++) {
    const t0 = -a0 + (2 * a0 * i) / segs
    const t1 = -a0 + (2 * a0 * (i + 1)) / segs
    const p0 = [R * Math.sin(t0), ROOF_Y + rise - R + R * Math.cos(t0)]
    const p1 = [R * Math.sin(t1), ROOF_Y + rise - R + R * Math.cos(t1)]
    const g = new THREE.BufferGeometry()
    const hw = w / 2 - 0.5
    const P = [V(-hw, p0[1], p0[0]), V(hw, p0[1], p0[0]), V(hw, p1[1], p1[0]), V(-hw, p1[1], p1[0])]
    const pos: number[] = []
    const nn = V(0, Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2))
    for (const k of [0, 2, 1, 0, 3, 2]) pos.push(P[k].x, P[k].y, P[k].z)
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(18).fill(0).map((_, k) => [nn.x, nn.y, nn.z][k % 3]), 3))
    b.add('membrane', g)
  }
  // vault end walls
  for (const sx of [-1, 1]) {
    const s = new THREE.Shape()
    s.moveTo(-d / 2, ROOF_Y)
    for (let i = 0; i <= segs; i++) {
      const t = -a0 + (2 * a0 * i) / segs
      s.lineTo(R * Math.sin(t), ROOF_Y + rise - R + R * Math.cos(t))
    }
    s.lineTo(d / 2, ROOF_Y)
    b.add('stadDark', new THREE.ShapeGeometry(s, 1), mat(sx * (w / 2 - 0.5), 0, 0, sx * (Math.PI / 2)))
  }
}

function build(): Builder {
  const b = new Builder()
  base(b)
  upperFacade(b)
  roof(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [HX - 6, 18, HZ],
  materials: () => ({
    polycarb: new THREE.MeshStandardMaterial({ color: '#dfe6ec', roughness: 0.35, metalness: 0.08, emissive: '#1d2328', emissiveIntensity: 0.3 }),
    arenaGlass: new THREE.MeshStandardMaterial({ color: '#56697a', metalness: 0.5, roughness: 0.18, envMapIntensity: 1.2 }),
  }),
  notes:
    'Box of 112.9 × 88 m (OSM) with a deep grid of folded natural-aluminium frames over a translucent base; height, module counts and the concealed roof are estimates from two photographs.',
}
export default model
