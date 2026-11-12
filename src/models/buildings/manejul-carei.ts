/**
 * Manejul (Lovarda) — riding hall of the Károlyi castle park, Carei.
 *
 * TIER C — modelled from ONE photograph of the long south-east façade and the OSM
 * outline (way 175996694, 113.9 × 15.6 m, long axis 49.3°). Listed in the COLOR
 * METAL aluminium selection; product not documented — shown as dark coated
 * aluminium small-format roofing, as the photograph suggests. Real metres;
 * origin = footprint centre; +X = long axis towards the NE; +Z = the photographed
 * SE façade (the straight long side of the OSM outline).
 *
 *  - One long single-storey hall (≈ 6.3 m to the eaves) under a steep (≈ 37°)
 *    gable roof with small-format metal roofing; a regular rhythm of ≈ 4.6 m bays
 *    articulated by white lesenes that rise just above the eaves with small
 *    pyramidal caps; one square barred window per bay; an arched carriage gate in
 *    the fourth bay from the gabled risalit.
 *  - One small gabled dormer per bay on the SE slope (dark metal, white lozenge
 *    opening, spike finial), as photographed and as seen on aerial imagery.
 *  - Near the SW end: a transverse risalit with a white crow-stepped gable, a blind
 *    pointed arch and a steep roof; beyond it a two-storey end bay with smaller
 *    upper windows and a hipped roof.
 *  - NE end: the OSM outline narrows to ≈ 10.6 m for the last ≈ 12 m — modelled as
 *    a lower hipped end block (not photographed).
 * Approximations: everything not visible in the single photograph (NW façade —
 * repeated without gate/dormers, the NE end block, the SW end face), heights scaled
 * from the window/gate sizes, roof pitch, step profile of the gable.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, window_, door, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ROOF = 'aluDarkGrey'
const WALL = 'plasterWhite'
const SOCLE = 'stoneGrey'
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const HW = 7.8 // half depth of the hall
const EAVE = 6.3
const PITCH = 37
const T = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * T
const SW = { x0: -57.0, x1: -48.5, eave: 7.1 }
const RIS = { x0: -48.5, x1: -43.0, front: HW + 0.45, top: 13.1 }
const HALL = { x0: -43.0, x1: 45.0, bays: 19 }
const NE = { x0: 45.0, x1: 57.0, z0: -2.75 }
const OV = 0.45 // eave overhang

/** Gable roof slopes over x0..x1 between z0..z1 (eave e at both sides), with optional hip ends. */
function roofRun(b: Builder, x0: number, x1: number, z0: number, z1: number, e: number, pitch: number, hip: [boolean, boolean]) {
  const t = Math.tan(pitch * D2R)
  const zc = (z0 + z1) / 2
  const hs = (z1 - z0) / 2 + OV
  const ey = e - OV * t
  const ry = ey + hs * t
  const rx0 = hip[0] ? x0 - OV + hs : x0
  const rx1 = hip[1] ? x1 + OV - hs : x1
  const ex0 = hip[0] ? x0 - OV : x0
  const ex1 = hip[1] ? x1 + OV : x1
  facet(b, ROOF, [V(ex0, ey, zc + hs), V(ex1, ey, zc + hs), V(rx1, ry, zc), V(rx0, ry, zc)], { thickness: 0.1 })
  facet(b, ROOF, [V(ex1, ey, zc - hs), V(ex0, ey, zc - hs), V(rx0, ry, zc), V(rx1, ry, zc)], { thickness: 0.1 })
  if (hip[0]) {
    facet(b, ROOF, [V(ex0, ey, zc - hs), V(ex0, ey, zc + hs), V(rx0, ry, zc)], { thickness: 0.1 })
    for (const s of [-1, 1]) b.beam(ROOF, V(ex0, ey + 0.05, zc + s * hs), V(rx0, ry + 0.05, zc), 0.16, 0.1)
  }
  if (hip[1]) {
    facet(b, ROOF, [V(ex1, ey, zc + hs), V(ex1, ey, zc - hs), V(rx1, ry, zc)], { thickness: 0.1 })
    for (const s of [-1, 1]) b.beam(ROOF, V(ex1, ey + 0.05, zc + s * hs), V(rx1, ry + 0.05, zc), 0.16, 0.1)
  }
  b.beam(ROOF, V(rx0, ry + 0.06, zc), V(rx1, ry + 0.06, zc), 0.24, 0.14)
  // shingle courses (small-format roofing) on the long slopes
  const slope = hs / Math.cos(pitch * D2R)
  for (let s = 0.42; s < slope - 0.3; s += 0.42) {
    const d = (s * Math.cos(pitch * D2R))
    const y = ey + d * t + 0.012
    for (const sg of [-1, 1]) {
      const z = zc + sg * (hs - d)
      const xa = hip[0] ? ex0 + d : ex0
      const xb = hip[1] ? ex1 - d : ex1
      b.beam(ROOF, V(xa, y, z), V(xb, y, z), 0.05, 0.022)
    }
  }
  // gutters
  for (const sg of [-1, 1]) b.rod(ROOF, V(ex0, ey - 0.08, zc + sg * (hs - 0.05)), V(ex1, ey - 0.08, zc + sg * (hs - 0.05)), 0.09, 8)
  return ry
}

/** Triangular gable wall in the YZ plane at x (thickness 0.4 towards dir). */
function gableWall(b: Builder, x: number, dir: 1 | -1, z0: number, z1: number, e: number, top: number) {
  const hs = (z1 - z0) / 2
  const tri = new THREE.Shape([new THREE.Vector2(-hs, 0), new THREE.Vector2(hs, 0), new THREE.Vector2(0, top - e)])
  b.add(WALL, extrude(tri, 0.4), mat(dir > 0 ? x - 0.4 : x, e, (z0 + z1) / 2, Math.PI / 2))
}

/** Lesene (pilaster strip) rising slightly above the eave with a pyramidal cap. */
function lesene(b: Builder, face: Face, plane: number, u: number, top: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(WALL, metricBox(0.85, top, 0.32), M(m, mat(0, top / 2, 0.16)))
  b.add(WALL, new THREE.ConeGeometry(0.62, 0.42, 4, 1), M(m, mat(0, top + 0.21, 0.16, Math.PI / 4)))
  b.add(SOCLE, metricBox(0.95, 0.5, 0.42), M(m, mat(0, 0.25, 0.18)))
}

/** Square barred window with a light reveal. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number) {
  window_(b, face, plane, u, y0, { w, h, glassKey: 'glassC', frameKey: 'trim', frame: 0.09, bars: [3, 3], inset: 0.03 })
}

/** Small gabled roof dormer on the +Z slope with white lozenge and spike finial. */
function dormer(b: Builder, x: number) {
  const zf = HW - 1.25 // front face position
  const yb = EAVE + (HW - zf) * T // roof height at the front face
  const w = 1.15
  const wallH = 0.95
  const depth = 1.9
  const pitch = Math.tan(58 * D2R)
  const yr = yb + wallH + (w / 2) * pitch
  // front wall (pentagon) and cheeks
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, -0.4), new THREE.Vector2(w / 2, -0.4), new THREE.Vector2(w / 2, wallH), new THREE.Vector2(0, wallH + (w / 2) * pitch), new THREE.Vector2(-w / 2, wallH)])
  b.add(ROOF, extrude(s, depth), mat(x, yb, zf - depth))
  // little roof
  for (const sg of [-1, 1]) {
    facet(b, ROOF, [V(x + sg * (w / 2 + 0.12), yb + wallH - 0.08, zf + 0.15), V(x, yr + 0.05, zf + 0.15), V(x, yr + 0.05, zf - depth), V(x + sg * (w / 2 + 0.12), yb + wallH - 0.08, zf - depth)], { thickness: 0.05 })
  }
  // white lozenge opening
  b.add('white', new THREE.PlaneGeometry(0.34, 0.34), mat(x, yb + 0.5, zf + 0.012, 0, 0, Math.PI / 4))
  b.add('black', new THREE.PlaneGeometry(0.12, 0.12), mat(x, yb + 0.5, zf + 0.016, 0, 0, Math.PI / 4))
  // finial
  b.rod('iron', V(x, yr, zf + 0.05), V(x, yr + 0.75, zf + 0.05), 0.025, 6)
  b.add('iron', new THREE.SphereGeometry(0.06, 8, 6), mat(x, yr + 0.3, zf + 0.05))
}

function build(): Builder {
  const b = new Builder()
  const bay = (HALL.x1 - HALL.x0) / HALL.bays

  /* ================= main hall ================= */
  b.block(WALL, HALL.x1 - HALL.x0, EAVE, 2 * HW, (HALL.x0 + HALL.x1) / 2, 0, 0)
  b.block(SOCLE, HALL.x1 - HALL.x0, 0.45, 2 * HW + 0.1, (HALL.x0 + HALL.x1) / 2, 0, 0)
  b.block(WALL, HALL.x1 - HALL.x0, 0.22, 2 * HW + 0.3, (HALL.x0 + HALL.x1) / 2, EAVE - 0.22, 0)
  roofRun(b, RIS.x0, HALL.x1, -HW, HW, EAVE, PITCH, [false, false])
  gableWall(b, HALL.x1, 1, -HW, HW, EAVE, RIDGE)
  for (const [face, plane] of [
    ['+z', HW],
    ['-z', -HW],
  ] as [Face, number][]) {
    const sgn = face === '+z' ? 1 : -1
    for (let i = 0; i <= HALL.bays; i++) {
      const x = HALL.x0 + i * bay
      lesene(b, face, plane, sgn * x, EAVE + 0.7)
      if (face === '+z' && i > 0 && i < HALL.bays) b.rod('aluDarkGrey', V(x - 0.55, 0.3, plane + 0.12), V(x - 0.55, EAVE - 0.1, plane + 0.12), 0.055, 6)
    }
    for (let i = 0; i < HALL.bays; i++) {
      const x = HALL.x0 + (i + 0.5) * bay
      if (face === '+z' && i === 3) {
        door(b, face, plane, x, { type: 'round', w: 2.9, h: 4.15, y0: 0.15, leafKey: 'black', frameKey: 'trim', frame: 0.15 })
        continue
      }
      win(b, face, plane, sgn * x, 2.4, 1.26, 1.55)
    }
  }
  for (let i = 0; i < HALL.bays; i++) dormer(b, HALL.x0 + (i + 0.5) * bay)

  /* ================= stepped-gable risalit ================= */
  {
    const { x0, x1, front, top } = RIS
    const w = x1 - x0
    const xc = (x0 + x1) / 2
    b.block(WALL, w, EAVE + 0.2, front + HW, xc, 0, (front - HW) / 2)
    b.block(SOCLE, w + 0.1, 0.45, front + HW + 0.1, xc, 0, (front - HW) / 2)
    // steep transverse roof behind the gable
    const rp = Math.atan2(top - 0.9 - EAVE, w / 2) / D2R
    const t = Math.tan(rp * D2R)
    const yr = EAVE + (w / 2 + 0.3) * t - 0.3 * t
    for (const sg of [-1, 1]) {
      const xe = xc + sg * (w / 2 + 0.3)
      facet(b, ROOF, [V(xe, EAVE - 0.3 * t, front - 0.3), V(xe, EAVE - 0.3 * t, -0.6), V(xc, yr, -0.6), V(xc, yr, front - 0.3)], { thickness: 0.1 })
    }
    // crow-stepped gable wall (front face at z = front)
    // [half width, top of step] from the eave shoulder up to the central pinnacle
    const steps: [number, number][] = [
      [w / 2 + 0.05, 9.5],
      [2.1, 10.7],
      [1.4, 12.1],
      [0.6, top],
    ]
    const left: THREE.Vector2[] = [new THREE.Vector2(-steps[0][0], EAVE - 0.1)]
    steps.forEach(([hx, y], i) => {
      left.push(new THREE.Vector2(-hx, y))
      if (i < steps.length - 1) left.push(new THREE.Vector2(-steps[i + 1][0], y))
    })
    const pts = [...left, ...left.slice().reverse().map((p) => new THREE.Vector2(-p.x, p.y))]
    b.add(WALL, extrude(new THREE.Shape(pts), 0.6), mat(xc, 0, front - 0.6))
    // coping caps on the steps and the pinnacle
    steps.forEach(([hx, y], i) => {
      const inner = i < steps.length - 1 ? steps[i + 1][0] : 0
      const cw = i < steps.length - 1 ? hx - inner + 0.1 : 2 * hx + 0.12
      for (const s of i < steps.length - 1 ? [-1, 1] : [0]) b.block('trim', cw, 0.14, 0.72, xc + s * (hx + inner) / 2, y, front - 0.3)
    })
    // corner pilasters and the blind pointed arch
    for (const s of [-1, 1]) b.block(WALL, 0.6, EAVE + 0.5, 0.2, xc + s * (w / 2 - 0.3), 0, front + 0.1)
    const fm = faceFrame('+z', front, xc, 0, 0)
    b.add('trim', extrude(frameShape('pointed', 3.4, 9.2, 0.16, 0, 1.3), 0.12), M(fm, mat(0, 0, 0.02)))
    win(b, '+z', front, xc, 2.4, 1.15, 1.5)
    win(b, '+z', front, xc, 6.9, 0.85, 1.0)
    // rear face of the risalit on the NW side
    win(b, '-z', -HW, -xc, 2.4, 1.15, 1.5)
  }

  /* ================= two-storey SW end bay ================= */
  {
    const { x0, x1, eave } = SW
    const xc = (x0 + x1) / 2
    b.block(WALL, x1 - x0, eave, 2 * HW, xc, 0, 0)
    b.block(SOCLE, x1 - x0 + 0.1, 0.45, 2 * HW + 0.1, xc, 0, 0)
    b.block(WALL, x1 - x0 + 0.1, 0.22, 2 * HW + 0.3, xc, eave - 0.22, 0)
    roofRun(b, x0, x1, -HW, HW, eave, 33, [true, false])
    for (const [face, plane, sgn] of [
      ['+z', HW, 1],
      ['-z', -HW, -1],
    ] as [Face, number, number][]) {
      for (const x of [x0 + 0.1, x1 - 0.5]) lesene(b, face, plane, sgn * x, eave + 0.5)
      for (const x of [xc - 2.2, xc + 2.2]) {
        win(b, face, plane, sgn * x, 2.3, 1.15, 1.45)
        for (const dx of [-0.45, 0.45]) win(b, face, plane, sgn * (x + dx), 5.15, 0.5, 0.9)
      }
    }
    for (const z of [-4.5, -1.5, 1.5, 4.5]) win(b, '-x', x0, z, 2.3, 1.15, 1.45)
  }

  /* ================= lower NE end block (OSM outline, not photographed) ================= */
  {
    const { x0, x1, z0 } = NE
    const xc = (x0 + x1) / 2
    const zc = (z0 + HW) / 2
    b.block(WALL, x1 - x0, EAVE, HW - z0, xc, 0, zc)
    b.block(SOCLE, x1 - x0 + 0.1, 0.45, HW - z0 + 0.1, xc, 0, zc)
    b.block(WALL, x1 - x0 + 0.1, 0.22, HW - z0 + 0.3, xc, EAVE - 0.22, zc)
    roofRun(b, x0, x1, z0, HW, EAVE, PITCH, [false, true])
    for (const x of [x0 + 2.4, x0 + 6.6, x0 + 10.0]) win(b, '+z', HW, x, 2.4, 1.26, 1.55)
    for (const x of [x0 + 3.0, x0 + 9.0]) win(b, '-z', z0, -x, 2.4, 1.26, 1.55)
    for (const z of [-0.2, 4.8]) win(b, '+x', x1, -z, 2.4, 1.26, 1.55)
    for (const x of [x0 + 2.2, x0 + 6.4]) dormer(b, x)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-5, 9.5, 4.5],
  notes: 'Tier C: one photograph of the SE façade; NW façade, NE end and dimensions approximated.',
}
export default model
