/**
 * Pensiunea Aster, Câmpu Cetății (com. Eremitu, Mureș) — a small modern
 * barn-type guesthouse; no OSM outline (position known only at village level).
 *
 * Modelling specification (real metres), from the two listing photographs:
 *  - One main volume ≈ 12 × 8 m (scaled from the 2.1 m entrance door, photo
 *    01): white rendered ground floor on the long side with the entrance door
 *    and a small window; above it a timber-clad knee wall to the eave at
 *    ≈ 4.4 m; the gable ends clad in horizontal larch boards (photo 02).
 *  - A two-storey glazed corner at the −X end (photo 02: full-height glass
 *    with the staircase behind it, photo 01: glazed dining room).
 *  - Steep double-pitched roof (45°), ridge ≈ 8.8 m, eaves overhang 0.6 m,
 *    verges 0.45 m.
 *  - COLOR METAL metal (register 2022, elZinc Slate titanium-zinc band): the
 *    listing photographs show a red tile roof and therefore predate the works
 *    or show the state before them; following the register the roof is shown
 *    in pre-weathered slate-grey titanium-zinc standing seam (zincSlate, pans
 *    0.5 m) with matching gutters and verge flashings.
 * Approximations (reference-limited): all dimensions from two small photos;
 * the rear elevation, the second gable and the small annexes beside the house
 * are not shown; orientation unknown (no outline).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, seams, window_, extrude, type Face } from '../kit'
import type { ModelModule } from '../registry'

const L = 12.0
const D = 8.0
const EAVE = 4.4
const PITCH = 45
const T = Math.tan((PITCH * Math.PI) / 180)
const RIDGE = EAVE + (D / 2) * T
const ZS = 'zincSlate'
const SEAM = seams(ZS, 0.5, 0.05, 0.045)
const GL = 3.4 // length of the glazed corner along X

/** Horizontal board cladding on a wall plane (thin dark joints). */
function boards(b: Builder, m: THREE.Matrix4, w: number, y0: number, y1: number) {
  for (let y = y0 + 0.18; y < y1; y += 0.18) b.add('asterJoint', metricBox(w, 0.015, 0.02), new THREE.Matrix4().multiplyMatrices(m, mat(0, y, 0.01)))
}

function build(): Builder {
  const b = new Builder()
  const x0 = -L / 2
  const x1 = L / 2

  /* ================= walls ================= */
  // timber-clad body (whole volume) + white render on the ground floor of the long front
  b.block('asterTimber', L - GL, EAVE, D, (x0 + GL + x1) / 2, 0, 0)
  b.block('asterTimber', GL, EAVE, D - GL, x0 + GL / 2, 0, -GL / 2)
  b.block('asterRender', L - GL - 0.6, 2.6, 0.12, (x0 + GL + x1) / 2 - 0.3, 0.25, D / 2 + 0.06)
  b.block('asterSocle', L + 0.1, 0.25, D + 0.1, 0, 0, 0)
  // gable triangles (timber); the −X gable leaves room for the glazed corner
  {
    const zg = D / 2 - GL
    const full = new THREE.Shape([new THREE.Vector2(-D / 2, EAVE - 0.01), new THREE.Vector2(D / 2, EAVE - 0.01), new THREE.Vector2(0, RIDGE - 0.1)])
    b.add('asterTimber', extrude(full, 0.3), mat(x1 - 0.3, 0, 0, Math.PI / 2))
    // local shape x maps to world −z for ry = π/2
    const part = new THREE.Shape([new THREE.Vector2(-zg, EAVE - 0.01), new THREE.Vector2(D / 2, EAVE - 0.01), new THREE.Vector2(0, RIDGE - 0.1), new THREE.Vector2(-zg, RIDGE - 0.1 - zg * T)])
    b.add('asterTimber', extrude(part, 0.3), mat(x0, 0, 0, Math.PI / 2))
    for (let y = EAVE + 0.18; y < RIDGE - 0.5; y += 0.18) {
      const w = ((RIDGE - y) / T) * 2 - 0.3
      b.add('asterJoint', metricBox(0.02, 0.015, w), mat(x1 + 0.01, y, 0))
    }
  }
  // board joints on the timber walls
  boards(b, mat(0, 0, D / 2, 0), L - 0.2, 2.9, EAVE - 0.1)
  boards(b, mat(0, 0, -D / 2, Math.PI), L - 0.2, 0.3, EAVE - 0.1)
  boards(b, mat(x1, 0, 0, Math.PI / 2), D - 0.2, 0.3, EAVE - 0.1)

  /* ================= glazed corner (two storeys, −X / +Z corner) ================= */
  {
    const gx0 = x0
    const gx1 = x0 + GL
    const gz0 = D / 2 - GL
    const gz1 = D / 2
    const H = EAVE + 2.6
    // glass on the front (to the eave) and on the gable side (up under the roof slope)
    const yTopSide = RIDGE - gz0 * T - 0.25
    b.add('glassG', metricBox(GL, EAVE - 0.5, 0.05), mat((gx0 + gx1) / 2, 0.3 + (EAVE - 0.5) / 2, gz1))
    facet(b, 'glassG', [V(gx0, 0.3, gz0), V(gx0, 0.3, gz1), V(gx0, EAVE - 0.25, gz1), V(gx0, yTopSide - 0.1, gz0)], { hint: V(-1, 0, 0) })
    for (let k = 0; k <= 3; k++) {
      const x = gx0 + (k * GL) / 3
      b.block('asterMetal', 0.08, EAVE - 0.5, 0.12, x, 0.3, gz1)
      const z = gz1 - (k * GL) / 3
      const top = Math.min(RIDGE - z * T - 0.45, H)
      b.block('asterMetal', 0.12, top - 0.3, 0.08, gx0, 0.3, z)
    }
    for (const y of [0.3, 2.9]) {
      b.block('asterMetal', GL + 0.1, 0.1, 0.12, (gx0 + gx1) / 2, y - 0.05, gz1)
      b.block('asterMetal', 0.12, 0.1, GL + 0.1, gx0, y - 0.05, (gz0 + gz1) / 2)
    }
    b.block('asterMetal', GL + 0.1, 0.12, 0.14, (gx0 + gx1) / 2, EAVE - 0.32, gz1)
    b.beam('asterMetal', V(gx0, EAVE - 0.25, gz1), V(gx0, yTopSide - 0.1, gz0), 0.14, 0.12, V(-1, 0, 0))
    // staircase and gallery slab behind the glass
    for (let i = 0; i < 12; i++) b.block('asterTimber', 1.0, 0.05, 0.25, gx1 - 0.6, 0.3 + i * 0.22, gz0 + 0.3 + i * 0.25)
    b.block('asterTimber', GL - 1.2, 0.2, GL - 0.1, gx0 + (GL - 1.2) / 2 + 0.05, 2.8, (gz0 + gz1) / 2)
  }

  /* ================= openings on the rendered front ================= */
  const face: Face = '+z'
  b.add('asterMetal', metricBox(1.1, 2.2, 0.08), mat(3.0, 0.25 + 1.1, D / 2 + 0.12))
  window_(b, face, D / 2 + 0.12, -0.2, 1.3, { w: 0.8, h: 0.8, frame: 0.06, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.02 })
  // upper floor window band in the timber knee wall (photo 01)
  for (const x of [-1.2, 3.0]) window_(b, face, D / 2, x, 3.1, { w: 2.2, h: 0.9, frame: 0.06, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.03 })
  // gable windows (photo 02): louvred window on the ground floor, two in the gable
  window_(b, '-x', x0, -1.5, 1.2, { w: 0.9, h: 0.9, frame: 0.08, frameKey: 'asterMetal', glassKey: 'asterJoint', inset: 0.02, bars: [1, 5] })
  window_(b, '-x', x0, -1.0, 4.9, { w: 0.7, h: 1.1, frame: 0.08, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.02 })
  window_(b, '+x', x1, 0, 1.2, { w: 1.4, h: 1.3, frame: 0.08, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.02 })
  window_(b, '+x', x1, 0, 5.0, { w: 1.0, h: 1.0, frame: 0.08, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.02 })
  for (const x of [-3.5, 0.5, 4.0]) window_(b, '-z', -D / 2, -x, 1.2, { w: 1.2, h: 1.3, frame: 0.08, frameKey: 'asterMetal', glassKey: 'glassC', inset: 0.02 })
  // wall lamps
  for (const x of [1.2, 4.6]) b.add('asterMetal', metricBox(0.15, 0.25, 0.15), mat(x, 2.5, D / 2 + 0.2))

  /* ================= roof (titanium-zinc standing seam) ================= */
  {
    const ov = 0.6
    const vg = 0.45
    const ey = EAVE - ov * T
    const he = D / 2 + ov
    const hl = L / 2 + vg
    facet(b, ZS, [V(-hl, ey, he), V(hl, ey, he), V(hl, RIDGE, 0), V(-hl, RIDGE, 0)], { seams: SEAM, thickness: 0.18 })
    facet(b, ZS, [V(hl, ey, -he), V(-hl, ey, -he), V(-hl, RIDGE, 0), V(hl, RIDGE, 0)], { seams: SEAM, thickness: 0.18 })
    b.beam(ZS, V(-hl, RIDGE + 0.05, 0), V(hl, RIDGE + 0.05, 0), 0.24, 0.12)
    // verge flashings and gutters
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam(ZS, V(sx * hl, ey, sz * he), V(sx * hl, RIDGE + 0.02, 0), 0.08, 0.25, V(sx, 0, 0))
    for (const sz of [-1, 1]) b.rod(ZS, V(-hl, ey - 0.1, sz * (he + 0.05)), V(hl, ey - 0.1, sz * (he + 0.05)), 0.08, 8)
    for (const [x, z] of [
      [x1 - 0.2, D / 2 + 0.15],
      [x1 - 0.2, -D / 2 - 0.15],
    ])
      b.rod(ZS, V(x, 0.2, z), V(x, ey - 0.1, z), 0.05, 8)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [1.0, 7.0, 2.0],
  materials: () => ({
    asterTimber: new THREE.MeshStandardMaterial({ color: '#c08a52', roughness: 0.75 }),
    asterJoint: new THREE.MeshStandardMaterial({ color: '#7a5330', roughness: 0.9 }),
    asterRender: new THREE.MeshStandardMaterial({ color: '#f3f2ee', roughness: 0.92 }),
    asterSocle: new THREE.MeshStandardMaterial({ color: '#9b978f', roughness: 0.9 }),
    asterMetal: new THREE.MeshStandardMaterial({ color: '#2f3234', roughness: 0.5, metalness: 0.3 }),
    asterInside: new THREE.MeshStandardMaterial({ color: '#8a6b4c', roughness: 0.9 }),
  }),
  notes:
    'Barn-type guesthouse with timber cladding, white rendered ground floor and a two-storey glazed corner; roof shown in elZinc Slate titanium-zinc per the register (listing photos show tiles); reference-limited.',
}
export default model
