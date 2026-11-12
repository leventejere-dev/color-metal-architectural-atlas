/**
 * Orthodox church «Sfinții Arhangheli Mihail și Gavriil», Iecea Mare (Timiș)
 * — 1987 (Mitropolia Banatului list); not mapped in OSM.
 *
 * Modelling specification (real metres, +X = assumed liturgical east, tower
 * at the west end; +Z = the side photographed — the slope with the solar
 * panels, taken to face south):
 *  - Single near-orthogonal side view (Commons, May 2026). Scale from a
 *    camera model fitted to the photo with the wall height taken as ≈ 6.8 m:
 *    nave 20 × 9 m (width assumed — not visible), flat east end, hipped roof
 *    of red clay tiles (25°, 0.7 m eaves) with an array of solar panels on
 *    the photographed slope.
 *  - Elevation: pink plaster, terracotta-panel socle (0.75 m), darker corner
 *    pilasters, a cornice band at ≈ 5.1 m under a cream frieze carrying five
 *    painted icon medallions, three groups of three round-headed windows
 *    (taller centre light) in arched surrounds.
 *  - Tower rising from the roof near the west end: square shaft (3.0 m) with
 *    a cornice band at ≈ 9.0 m, belfry stage with three narrow coloured
 *    round-headed lights per face, bell-cast pyramidal roof (eaves ≈ 10.9 m,
 *    4.8 m wide), a broad flattened onion, a louvred lantern and a tall
 *    octagonal spire with cross (≈ 18.4 m).
 *  - METAL (as photographed): the tower roof, onion, lantern and spire are
 *    clad in brown, matte weathered copper — the copper
 *    supplied by COLOR METAL in 2023 according to its records — shown as
 *    'copperBrown' with standing seams on the pyramid and ribs on the onion;
 *    gutters and downpipes (brown in the photo) also in copper. The nave roof
 *    stays clay tile as photographed.
 * Approximations: the church's position and orientation are not known
 * (village-centre coordinates; apse assumed east); width, west front (door)
 * and the unphotographed north side are assumed / mirrored; heights from one
 * photograph.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, polyRing, spire, cross, faceFrame, hipRoof, seams } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

const L = 20.0
const HW = 4.5
const EAVE = 6.8
const PITCH = 25 * D2R
const OV = 0.7
const SOCLE = 0.75
const BAND = 5.1
const TX = -L / 2 + 3.6 // tower axis
const THW = 1.5 // tower shaft half width
const T_CORN = 9.0
const T_EAVE = 10.85

const CU = 'copperBrown'
const WALL = 'iecWall'
const FRIEZE = 'iecFrieze'
const ACC = 'iecAccent'

function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, fill = 'glassC') {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(ACC, extrude(frameShape('round', w, h, 0.08, 0, y0), 0.06), m)
}

/** Group of three round-headed windows (taller centre light) in an arched surround. */
function windowGroup(b: Builder, m: THREE.Matrix4) {
  const y0 = 1.65
  win(b, M(m, mat(-0.78, 0, 0)), 0.58, 1.95, y0 + 0.12)
  win(b, m, 0.62, 2.2, y0)
  win(b, M(m, mat(0.78, 0, 0)), 0.58, 1.95, y0 + 0.12)
  // arched recess surrounds (slightly darker plaster) and a common sill
  for (const [u, w, h, yy] of [[-0.78, 0.58, 1.95, y0 + 0.12], [0, 0.62, 2.2, y0], [0.78, 0.58, 1.95, y0 + 0.12]] as [number, number, number, number][]) {
    b.add('iecSurround', extrude(frameShape('round', w + 0.16, h + 0.08, 0.1, u, yy - 0.08), 0.05), M(m, mat(0, 0, 0.0)))
  }
  b.add('iecSurround', metricBox(2.5, 0.12, 0.16), M(m, mat(0, y0 - 0.16, 0.06)))
}

function build(): Builder {
  const b = new Builder()
  const x0 = -L / 2
  const x1 = L / 2

  /* ---------------- walls ---------------- */
  b.block(WALL, L, EAVE, HW * 2, 0, 0, 0)
  // terracotta-panel socle with joints
  b.block('iecSocle', L + 0.12, SOCLE, HW * 2 + 0.12, 0, 0, 0)
  for (let x = x0 + 1.0; x < x1 - 0.5; x += 1.0) for (const s of [-1, 1]) b.add('iecJoint', metricBox(0.04, SOCLE - 0.06, 0.02), mat(x, SOCLE / 2, s * (HW + 0.065)))
  b.block('iecJoint', L + 0.16, 0.06, HW * 2 + 0.16, 0, SOCLE, 0)
  // frieze (cream) above the cornice band
  b.block(FRIEZE, L + 0.06, EAVE - BAND - 0.05, HW * 2 + 0.06, 0, BAND + 0.05, 0)
  b.block(ACC, L + 0.2, 0.18, HW * 2 + 0.2, 0, BAND - 0.08, 0)
  // corner pilasters
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(ACC, 0.55, EAVE - SOCLE, 0.55, sx * (L / 2 - 0.22), SOCLE, sz * (HW - 0.22))

  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    for (const x of [-5.2, 0, 5.2]) windowGroup(b, at(x))
    // icon medallions in the frieze
    for (const x of [-7.4, -3.7, 0, 3.7, 7.4]) {
      b.add('iecIconFrame', metricBox(0.8, 0.95, 0.04), M(at(x), mat(0, 5.95, 0.07)))
      b.add('iecIcon', metricBox(0.66, 0.8, 0.04), M(at(x), mat(0, 5.95, 0.1)))
    }
  }
  // west door (not photographed — assumed) and an east window
  {
    const m = faceFrame('-x', x0, 0)
    b.add('iecDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 2.8, 0, SOCLE, 12))), M(m, mat(0, 0, 0.03)))
    b.add(ACC, extrude(frameShape('round', 1.6, 2.8, 0.15, 0, SOCLE), 0.08), m)
    b.block('iecSocle', 1.2, 0.25, 2.6, x0 - 0.6, 0, 0)
    win(b, m, 0.62, 1.6, 3.6)
    const me = faceFrame('+x', x1, 0)
    win(b, me, 0.62, 2.0, 2.2)
  }

  /* ---------------- nave roof: red clay tile, hipped ---------------- */
  const ye = EAVE - OV * Math.tan(PITCH)
  const r = hipRoof(0, 0, L + 2 * OV, HW * 2 + 2 * OV, ye, PITCH)
  for (const f of r.facets) facet(b, 'tileRed', f, { thickness: 0.14 })
  for (const [a, c] of r.lines) b.beam('iecRidge', a.clone().add(V(0, 0.06, 0)), c.clone().add(V(0, 0.06, 0)), 0.26, 0.16)
  // tile courses (horizontal lines) on the long slopes
  const run = HW + OV
  for (let d = 0.38; d < run - 0.1; d += 0.38) {
    const y = ye + d * Math.tan(PITCH)
    const half = L / 2 + OV - d
    for (const s of [-1, 1]) b.beam('iecRidge', V(-half, y + 0.03, s * (run - d)), V(half, y + 0.03, s * (run - d)), 0.05, 0.04)
  }
  // eaves fascia and copper gutters / downpipes
  {
    const ex = L / 2 + OV
    const ez = HW + OV
    const corners = [V(-ex, ye - 0.1, -ez), V(ex, ye - 0.1, -ez), V(ex, ye - 0.1, ez), V(-ex, ye - 0.1, ez)]
    for (let i = 0; i < 4; i++) {
      b.beam('iecFascia', corners[i], corners[(i + 1) % 4], 0.06, 0.24)
      b.rod(CU, corners[i].clone().add(V(0, -0.05, 0)), corners[(i + 1) % 4].clone().add(V(0, -0.05, 0)), 0.07, 8)
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(CU, V(sx * (L / 2 + 0.12), 0.2, sz * (HW + 0.12)), V(sx * (L / 2 + 0.12), ye - 0.1, sz * (HW + 0.12)), 0.055, 8)
  }
  // solar panels on the +Z slope (two rows)
  {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 11; i++) {
        const d = 1.7 + row * 1.12 // distance up-slope from the eave
        const x = -4.5 + i * 1.04
        const zz = run - d * Math.cos(PITCH) - 0.5
        const yy = ye + (d * Math.cos(PITCH) + 0.5) * Math.tan(PITCH) + 0.12
        const m = new THREE.Matrix4().makeRotationX(PITCH).setPosition(x, yy, zz)
        b.add('iecPanel', metricBox(1.0, 0.04, 1.08), m)
      }
    }
  }

  /* ---------------- tower ---------------- */
  {
    const yb = 6.0
    b.block(WALL, THW * 2, T_CORN - yb, THW * 2, TX, yb, 0)
    b.block(ACC, THW * 2 + 0.22, 0.2, THW * 2 + 0.22, TX, T_CORN - 0.1, 0)
    b.block(FRIEZE, THW * 2 - 0.06, T_EAVE - T_CORN, THW * 2 - 0.06, TX, T_CORN, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? TX + (face[0] === '+' ? THW - 0.03 : -THW + 0.03) : face[0] === '+' ? THW - 0.03 : -THW + 0.03
      const u = face === '+z' ? TX : face === '-z' ? -TX : 0
      const m = faceFrame(face, plane, u)
      const fills = ['iecGlassB', 'iecGlassO', 'iecGlassR']
      for (let i = 0; i < 3; i++) win(b, M(m, mat((i - 1) * 0.5, 0, 0)), 0.32, 1.25, T_CORN + 0.3, fills[i])
      // corner strips
      for (const su of [-1, 1]) b.add(ACC, metricBox(0.3, T_EAVE - T_CORN, 0.06), M(m, mat(su * (THW - 0.18), (T_CORN + T_EAVE) / 2, 0.03)))
    }
    // bell-cast pyramidal roof (standing seam copper)
    const ov = 0.9
    const eY = T_EAVE + 0.02
    const kick = 0.35
    const hwE = THW + ov
    const hwK = THW + 0.15
    const topY = 12.0
    const topHW = 0.95
    const corners = (hw: number, y: number) => [V(TX - hw, y, -hw), V(TX + hw, y, -hw), V(TX + hw, y, hw), V(TX - hw, y, hw)]
    const cE = corners(hwE, eY)
    const cK = corners(hwK, eY + kick)
    const cT = corners(topHW, topY)
    const sp = seams(CU, 0.45, 0.04, 0.035)
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, CU, [cE[i], cE[j], cK[j], cK[i]], { seams: sp, thickness: 0.08 })
      facet(b, CU, [cK[i], cK[j], cT[j], cT[i]], { seams: sp, thickness: 0.08 })
      b.beam(CU, cE[i], cK[i], 0.1, 0.08)
      b.beam(CU, cK[i], cT[i], 0.1, 0.08)
      b.beam(CU, cE[i].clone().add(V(0, -0.06, 0)), cE[j].clone().add(V(0, -0.06, 0)), 0.08, 0.14)
    }
    // flattened onion ("turban") — octagonal, ribbed
    const st: [number, number][] = [
      [1.0, topY - 0.05],
      [1.3, topY + 0.18],
      [1.52, topY + 0.45],
      [1.5, topY + 0.7],
      [1.25, topY + 0.95],
      [0.9, topY + 1.15],
      [0.72, topY + 1.28],
    ]
    helm(b, CU, { x: TX, z: 0, n: 8, stations: st })
    const rings = st.map(([rr, yy]) => polyRing(8, rr + 0.015, yy, Math.PI / 8, TX, 0))
    for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 1; i++) b.beam(CU, rings[i][k], rings[i + 1][k], 0.05, 0.045)
    // lantern (copper-clad) with louvred openings
    const ly = topY + 1.28
    const lh = 1.2
    const lhw = 0.72
    b.block(CU, lhw * 2, lh, lhw * 2, TX, ly, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? TX + (face[0] === '+' ? lhw : -lhw) : face[0] === '+' ? lhw : -lhw
      const m = faceFrame(face, plane, face === '+z' ? TX : face === '-z' ? -TX : 0)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.5, 0.85, 0, ly + 0.15, 8))), M(m, mat(0, 0, 0.02)))
      for (let y = ly + 0.25; y < ly + 0.85; y += 0.12) b.add(CU, metricBox(0.5, 0.03, 0.05), M(m, mat(0, y, 0.04, 0, 0.5)))
    }
    b.block(CU, lhw * 2 + 0.24, 0.12, lhw * 2 + 0.24, TX, ly + lh, 0)
    // tall octagonal spire
    const sy = spire(b, CU, { x: TX, z: 0, y0: ly + lh + 0.12, r: 0.66, h: 2.45, n: 8, seams: false })
    b.add(CU, new THREE.SphereGeometry(0.12, 10, 8), mat(TX, sy + 0.05, 0))
    cross(b, 'iron', TX, sy, 0, 1.3, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [TX, 11.5, 1.6],
  materials: () => ({
    iecWall: new THREE.MeshStandardMaterial({ color: '#e7bba3', roughness: 0.9 }),
    iecFrieze: new THREE.MeshStandardMaterial({ color: '#f0e3cc', roughness: 0.9 }),
    iecAccent: new THREE.MeshStandardMaterial({ color: '#d29a7d', roughness: 0.88 }),
    iecSurround: new THREE.MeshStandardMaterial({ color: '#d9ab92', roughness: 0.88 }),
    iecSocle: new THREE.MeshStandardMaterial({ color: '#c8876a', roughness: 0.85 }),
    iecJoint: new THREE.MeshStandardMaterial({ color: '#9e6650', roughness: 0.9 }),
    iecIcon: new THREE.MeshStandardMaterial({ color: '#b98c56', roughness: 0.6, metalness: 0.1 }),
    iecIconFrame: new THREE.MeshStandardMaterial({ color: '#d8b46a', roughness: 0.5, metalness: 0.3 }),
    iecRidge: new THREE.MeshStandardMaterial({ color: '#9c4b33', roughness: 0.85 }),
    iecFascia: new THREE.MeshStandardMaterial({ color: '#6a4030', roughness: 0.8 }),
    iecPanel: new THREE.MeshStandardMaterial({ color: '#1f2d45', roughness: 0.25, metalness: 0.5 }),
    iecDoor: new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.7 }),
    iecGlassB: new THREE.MeshStandardMaterial({ color: '#3f78a8', roughness: 0.3, metalness: 0.2 }),
    iecGlassO: new THREE.MeshStandardMaterial({ color: '#d0923c', roughness: 0.3, metalness: 0.2 }),
    iecGlassR: new THREE.MeshStandardMaterial({ color: '#b5463a', roughness: 0.3, metalness: 0.2 }),
  }),
  notes: 'One side photograph (May 2026): width, west front and north side assumed; location/orientation not mapped (apse assumed east). Tower helm in weathered copper as photographed.',
}
export default model
