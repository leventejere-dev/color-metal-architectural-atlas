/**
 * Tisza-kastély, Geszt (Békés, HU) — reconstruction 2021–2023.
 *
 * COLOR METAL supplied elZinc Graphite titanium-zinc (0.7 mm strip, per the
 * supplier card in photo 10). The reference set consists of construction
 * photographs: zinc-clad dormers with flat roofs and cornices (01, 05, 07,
 * 08), a zinc valley (03), a zinc verge capping on a brick gable (09), dark
 * flat roof tiles (01, 04, 05) and one view of the L-shaped single-storey
 * shell with its steep roof, a hipped end and gables (06).
 * Modelling specification (real metres, OSM way 432513265):
 *  - L-plan: a long wing 49.3 × 12.6 m on the main axis (+X = 69.1°, ENE)
 *    and a cross wing 14 × 31.8 m at the east end running NNW, its south
 *    gable flush with the long south façade (+Z = SSE).
 *  - Single storey (eaves ≈ 4.4 m) with an attic under steep (45°) roofs of
 *    dark flat tiles; hipped west end of the long wing; the cross wing is
 *    the higher roof with two gables; zinc valleys where the long-wing roof
 *    runs into it.
 *  - Rows of tall dormers clad entirely in elZinc Graphite standing seam
 *    (cheeks, fronts, flat roofs with a projecting cornice), French windows;
 *    zinc verge cappings on the gables, zinc eave gutters and downpipes.
 * Approximations (tier C): the finished façades are not photographed — plain
 * render, socle and an even window rhythm are assumed; the number and
 * spacing of dormers per slope, the gable positions and the roof pitch are
 * estimated; the historic two-storey centre / mansard pavilion mentioned in
 * public sources is not visible in the photo set and is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, facet, mat, metricBox, seams } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

const EAVE = 4.4
const OV = 0.5 // eave / verge overhang
const ZN = seams('zincGraphite', 0.5, 0.045, 0.035)

// plan (centred on the footprint bounding box)
const A = { x0: -24.65, x1: 10.65, z0: 3.3, z1: 15.9 } // long wing (walls up to the cross wing)
const B = { x0: 10.65, x1: 24.65, z0: -15.9, z1: 15.9 } // cross wing
const AHW = (A.z1 - A.z0) / 2
const AZC = (A.z0 + A.z1) / 2
const BHW = (B.x1 - B.x0) / 2
const BXC = (B.x0 + B.x1) / 2
const A_RIDGE = EAVE + AHW // 45°
const B_RIDGE = EAVE + BHW

function walls(b: Builder) {
  b.block('plasterWhite', A.x1 - A.x0, EAVE, A.z1 - A.z0, (A.x0 + A.x1) / 2, 0, AZC)
  b.block('plasterWhite', B.x1 - B.x0, EAVE, B.z1 - B.z0, BXC, 0, (B.z0 + B.z1) / 2)
  b.block('socle', A.x1 - A.x0 + 0.2, 0.7, A.z1 - A.z0 + 0.2, (A.x0 + A.x1) / 2, 0, AZC)
  b.block('socle', B.x1 - B.x0 + 0.2, 0.7, B.z1 - B.z0 + 0.2, BXC, 0, (B.z0 + B.z1) / 2)
  // eaves cornice
  b.block('trim', A.x1 - A.x0 + 0.3, 0.3, A.z1 - A.z0 + 0.3, (A.x0 + A.x1) / 2, EAVE - 0.3, AZC)
  b.block('trim', B.x1 - B.x0 + 0.3, 0.3, B.z1 - B.z0 + 0.3, BXC, EAVE - 0.3, (B.z0 + B.z1) / 2)
  // gable walls of the cross wing
  for (const zs of [B.z0, B.z1]) {
    const tri = new THREE.Shape([new THREE.Vector2(-BHW, 0), new THREE.Vector2(BHW, 0), new THREE.Vector2(0, BHW - 0.05)])
    const g = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false })
    b.add('plasterWhite', g, mat(BXC, EAVE, zs > 0 ? zs - 0.3 : zs))
    // small attic window in each gable
    const s = zs > 0 ? 1 : -1
    b.add('glassM', new THREE.PlaneGeometry(0.9, 1.3), mat(BXC, EAVE + 2.6, zs + s * 0.06, s > 0 ? 0 : Math.PI))
    b.add('white', metricBox(1.1, 1.5, 0.08), mat(BXC, EAVE + 2.6, zs + s * 0.0))
  }
  // ground-floor windows: even rhythm (finished façades not photographed)
  const win = (x: number, z: number, ry: number) => {
    const m = mat(x, 0, z, ry)
    b.add('trim', metricBox(1.6, 2.5, 0.1), M(m, mat(0, 1.0 + 1.15, 0.04)))
    b.add('glassM', new THREE.PlaneGeometry(1.25, 2.15), M(m, mat(0, 1.0 + 1.15, 0.1)))
    b.add('white', metricBox(0.07, 2.15, 0.06), M(m, mat(0, 1.0 + 1.15, 0.12)))
    b.add('white', metricBox(1.25, 0.07, 0.06), M(m, mat(0, 2.75, 0.12)))
    b.add('trim', metricBox(1.8, 0.12, 0.3), M(m, mat(0, 0.98, 0.12)))
  }
  for (let x = -21.5; x < 8.5; x += 4.2) {
    win(x, A.z1, 0)
    win(x, A.z0, Math.PI)
  }
  for (const x of [13.5, 17.65, 21.8]) win(x, B.z1, 0)
  for (let z = -13.0; z < 14; z += 4.2) win(B.x1, z, Math.PI / 2)
  for (let z = -13.0; z < 1.5; z += 4.2) win(B.x0, z, -Math.PI / 2)
  for (const z of [5.8, 9.6, 13.4]) win(A.x0, z, -Math.PI / 2)
}

function roofs(b: Builder) {
  const tile = { thickness: 0.15 }
  const ey = EAVE - OV
  /* cross wing: gable roof, ridge along Z */
  const bz0 = B.z0 - OV
  const bz1 = B.z1 + OV
  const bw = B.x0 - OV
  const be = B.x1 + OV
  facet(b, 'darkTile', [V(bw, ey, bz0), V(bw, ey, bz1), V(BXC, B_RIDGE, bz1), V(BXC, B_RIDGE, bz0)], tile)
  facet(b, 'darkTile', [V(be, ey, bz1), V(be, ey, bz0), V(BXC, B_RIDGE, bz0), V(BXC, B_RIDGE, bz1)], tile)
  b.beam('darkTile', V(BXC, B_RIDGE + 0.08, bz0), V(BXC, B_RIDGE + 0.08, bz1), 0.4, 0.22)
  // zinc verge cappings (photo 09)
  for (const z of [bz0, bz1]) {
    for (const x of [bw, be]) b.beam('zincGraphite', V(x, ey + 0.05, z), V(BXC, B_RIDGE + 0.12, z), 0.34, 0.2, V(0, 0, 1))
  }

  /* long wing: hipped west end, ridge along X dying into the cross-wing roof */
  const ax0 = A.x0 - OV
  const az0 = A.z0 - OV
  const az1 = A.z1 + OV
  const r0 = V(A.x0 + AHW, A_RIDGE, AZC)
  const r1 = V(B.x0 + AHW, A_RIDGE, AZC) // where the ridge meets the cross-wing slope
  const vx = B.x0 - OV // eave meets the cross-wing eave (valley foot)
  facet(b, 'darkTile', [V(ax0, ey, az0), V(vx, ey, az0), r1, r0], tile)
  facet(b, 'darkTile', [V(vx, ey, az1), V(ax0, ey, az1), r0, r1], tile)
  facet(b, 'darkTile', [V(ax0, ey, az1), V(ax0, ey, az0), r0], tile)
  b.beam('darkTile', r0.clone().add(V(0, 0.08, 0)), r1.clone().add(V(0, 0.08, 0)), 0.4, 0.22)
  for (const z of [az0, az1]) b.beam('darkTile', V(ax0, ey + 0.06, z), r0.clone().add(V(0, 0.06, 0)), 0.36, 0.18)
  // zinc valleys (photo 03)
  for (const z of [az0, az1]) b.beam('zincGraphite', V(vx, ey + 0.02, z), r1.clone().add(V(0, 0.02, 0)), 0.55, 0.04)

  /* zinc eave gutters and downpipes */
  const gutter = (a: P3, c: P3) => b.beam('zincGraphite', a, c, 0.22, 0.2)
  const gy = ey - 0.05
  gutter(V(ax0, gy, az1 + 0.1), V(vx, gy, az1 + 0.1))
  gutter(V(ax0, gy, az0 - 0.1), V(vx, gy, az0 - 0.1))
  gutter(V(ax0 - 0.1, gy, az0), V(ax0 - 0.1, gy, az1))
  gutter(V(bw - 0.1, gy, bz0), V(bw - 0.1, gy, az0))
  gutter(V(be + 0.1, gy, bz0), V(be + 0.1, gy, bz1))
  for (const [x, z] of [
    [ax0 + 0.2, A.z1 + 0.15],
    [ax0 + 0.2, A.z0 - 0.15],
    [-4, A.z1 + 0.15],
    [-4, A.z0 - 0.15],
    [B.x1 + 0.15, B.z0 + 0.6],
    [B.x1 + 0.15, B.z1 - 0.6],
    [B.x0 - 0.15, B.z0 + 0.6],
  ])
    b.rod('zincGraphite', V(x, 0.3, z), V(x, gy, z), 0.06, 8)
}

/**
 * Zinc-clad dormer on a 45° slope. `at(u, d, y)` maps slope-local coordinates
 * (u along the eave, d horizontal distance in from the wall line, y height)
 * to model space; `inward` is the horizontal direction up the slope.
 */
function dormer(b: Builder, origin: P3, along: P3, inward: P3) {
  const at = (u: number, d: number, yy: number) => origin.clone().addScaledVector(along, u).addScaledVector(inward, d).setY(yy)
  const w = 1.8
  const d0 = 0.6
  const yb = EAVE + d0
  const H = 2.6
  const yt = yb + H
  const dBack = yt - EAVE // where the flat roof meets the slope
  const out = inward.clone().negate()
  const frame = new THREE.Matrix4().makeBasis(along, V(0, 1, 0), out).setPosition(at(0, d0, 0))
  // front: zinc surround, French window
  b.add('zincGraphite', metricBox(w, H, 0.14), M(frame, mat(0, yb + H / 2, -0.07)))
  b.add('glassM', new THREE.PlaneGeometry(0.86, 2.0), M(frame, mat(0, yb + 0.25 + 1.0, 0.02)))
  b.add('white', metricBox(0.98, 0.07, 0.07), M(frame, mat(0, yb + 0.25, 0.03)))
  b.add('white', metricBox(0.98, 0.07, 0.07), M(frame, mat(0, yb + 2.25, 0.03)))
  b.add('white', metricBox(0.07, 2.0, 0.07), M(frame, mat(-0.46, yb + 1.25, 0.03)))
  b.add('white', metricBox(0.07, 2.0, 0.07), M(frame, mat(0.46, yb + 1.25, 0.03)))
  b.add('white', metricBox(0.06, 2.0, 0.05), M(frame, mat(0, yb + 1.25, 0.03)))
  b.add('white', metricBox(0.86, 0.05, 0.05), M(frame, mat(0, yb + 1.75, 0.03)))
  // zinc apron at the foot of the front
  b.add('zincGraphite', metricBox(w + 0.2, 0.06, 0.6), M(frame, mat(0, yb - 0.25, 0.1, 0, -Math.PI / 4)))
  // cheeks with standing seams
  for (const s of [-1, 1]) {
    const u = (s * w) / 2
    facet(b, 'zincGraphite', [at(u, d0, yb), at(u, d0, yt), at(u, dBack, yt)], { seams: ZN, hint: along.clone().multiplyScalar(s) })
  }
  // flat roof with projecting cornice
  const roofLen = dBack - d0 + 0.35
  const rc = at(0, d0 + roofLen / 2 - 0.35, yt + 0.06)
  b.add('zincGraphite', metricBox(w + 0.3, 0.12, roofLen), new THREE.Matrix4().makeBasis(along, V(0, 1, 0), out).setPosition(rc))
  b.add('zincGraphite', metricBox(w + 0.45, 0.32, 0.4), M(frame, mat(0, yt - 0.02, 0.12)))
  b.add('zincGraphite', metricBox(w + 0.55, 0.08, 0.5), M(frame, mat(0, yt + 0.16, 0.16)))
}

function dormers(b: Builder) {
  // long wing, both slopes
  for (let x = -16.5; x <= 6.5; x += 4.6) {
    dormer(b, V(x, 0, A.z1), V(1, 0, 0), V(0, 0, -1))
    dormer(b, V(x, 0, A.z0), V(-1, 0, 0), V(0, 0, 1))
  }
  // cross wing: outer (east) slope full length, courtyard (west) slope north of the valley
  for (let z = -12.5; z <= 12.6; z += 4.2) dormer(b, V(B.x1, 0, z), V(0, 0, -1), V(-1, 0, 0))
  for (let z = -12.5; z <= -3.5; z += 4.5) dormer(b, V(B.x0, 0, z), V(0, 0, 1), V(1, 0, 0))
}

function build(): Builder {
  const b = new Builder()
  walls(b)
  roofs(b)
  dormers(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-2.4, 6.6, 14.6],
  materials: (base) => {
    // dark grey flat roof tiles as photographed (01, 04, 05): the exhibition slate courses, darkened
    const t = (base.slate as THREE.MeshStandardMaterial).clone()
    t.color.set('#80858b')
    t.roughness = 0.72
    return { darkTile: t }
  },
  notes:
    'L-shaped single-storey wings (OSM) with steep tiled roofs and rows of elZinc Graphite clad dormers, zinc valleys, verges and gutters; façades and dormer count are assumptions (construction photos only).',
}
export default model
