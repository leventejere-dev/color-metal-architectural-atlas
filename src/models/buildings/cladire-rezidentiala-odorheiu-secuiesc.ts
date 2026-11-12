/**
 * Residential building, Strada Pantei (Lejtő utca), Odorheiu Secuiesc.
 *
 * COLOR METAL supplied the aluminium roofing: anthracite standing-seam
 * aluminium with snow-guard rails, gutters and edge trims, as photographed
 * (12 drone/camera photos, taken while the shell was being finished: raw
 * brick infill, concrete frame, waterproofing; no windows yet).
 *
 * Modelling specification (real metres; sized from the top-down drone photo 02
 * using the standing-seam pitch ≈ 0.55 m and the 114 cm roof windows,
 * ≈ 31 px/m; storeys ≈ 2.9 m; +X = image right of photo 02, +Z = image down):
 *  - Cross-shaped plan ≈ 22 × 16.8 m over the roof edges: a central volume
 *    7.35 × 16.1 m with its ridge along Z, a west wing 6.3 × 5.4 m and an east
 *    wing 7.65 × 6.7 m (offset southwards) with ridges along X, all gable
 *    roofs ≈ 22° meeting in valleys; eaves at one level, the wing ridges lower
 *    than the central ridge.
 *  - The house is cut into a slope: on the west (street) side a lower storey
 *    is exposed — open bays under a roof terrace with a brick parapet in the
 *    north-west corner; on the east the main floor is at ground level (the
 *    buried lower walls are shown in their black waterproofing).
 *  - Main floor: concrete frame (corner columns, ring beams, slab edges) with
 *    orange ceramic-block infill and raw window openings; a covered loggia in
 *    the north-west corner of the central volume opening onto the terrace;
 *    concrete gable triangles.
 *  - Roof: anthracite aluminium standing seam (seams ≈ 0.55 m), thick edge
 *    trims, half-round gutters, twin-tube snow guards along the eaves, two
 *    roof windows on the east slope of the central volume, small vents.
 * Approximations: absolute size from the seam pitch (±10 %); the building is
 * not geolocated, so the compass orientation is an assumption (photo 02 taken
 * north-up); opening positions on faces hidden by scaffolding are estimated;
 * the terrain is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, seams } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const T = Math.tan(22 * D2R)
const U = 2.9 // main floor level above the west (street-side) ground
const EAVE = 5.8 // wall top / eave level
const OHE = 0.45 // eave overhang
const OHG = 0.35 // gable (verge) overhang
const SEAM = seams('alu', 0.55, 0.035, 0.04)

/** wall rectangles of the three volumes */
const B = { x0: -4.35, x1: 3.0, z0: -8.05, z1: 8.05 } // central, ridge along Z
const A = { x0: -10.65, x1: B.x0, z0: -0.36, z1: 5.03 } // west wing, ridge along X
const C = { x0: B.x1, x1: 10.65, z0: 0.93, z1: 7.61 } // east wing, ridge along X
const TERR = { x0: A.x0, x1: B.x0, z0: -7.6, z1: A.z0 } // roof terrace over the lower storey
const LOGGIA = { x1: -2.35, z1: -1.2 } // open loggia in the NW corner of B
const xB = (B.x0 + B.x1) / 2
const zA = (A.z0 + A.z1) / 2
const zC = (C.z0 + C.z1) / 2
const ridgeB = EAVE + ((B.x1 - B.x0) / 2) * T
const ridgeA = EAVE + ((A.z1 - A.z0) / 2) * T
const ridgeC = EAVE + ((C.z1 - C.z0) / 2) * T

type Face = '+x' | '-x' | '+z' | '-z'

/** Matrix for façade-local coordinates (u along the face seen from outside, y up, n outwards). */
function frame(face: Face, plane: number, u: number, y: number, n: number) {
  switch (face) {
    case '+z':
      return mat(u, y, plane + n, 0)
    case '-z':
      return mat(-u, y, plane - n, Math.PI)
    case '+x':
      return mat(plane + n, y, -u, Math.PI / 2)
    default:
      return mat(plane - n, y, u, -Math.PI / 2)
  }
}
/** u coordinate of a world position along a face. */
const uOf = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)

/** Raw opening in a wall: dark void, concrete lintel, reveal sides. */
function opening(b: Builder, face: Face, plane: number, x: number, z: number, w: number, y0: number, y1: number) {
  const u = uOf(face, x, z)
  b.add('void', new THREE.PlaneGeometry(w, y1 - y0), frame(face, plane, u, (y0 + y1) / 2, 0.025))
  b.add('concreteRaw', metricBox(w + 0.5, 0.25, 0.06), frame(face, plane, u, y1 + 0.125, 0.03))
  b.add('concreteRaw', metricBox(w + 0.05, 0.05, 0.1), frame(face, plane, u, y0 - 0.02, 0.04))
}

/** Concrete frame on a wall: corner / intermediate columns, slab edge and ring beam. */
function frameBands(b: Builder, face: Face, plane: number, a: number, c: number, y0: number, y1: number, cols: number[]) {
  const len = c - a
  const mid = (a + c) / 2
  b.add('concreteRaw', metricBox(len + 0.04, 0.3, 0.04), frame(face, plane, mid, y1 - 0.15, 0.02))
  b.add('concreteRaw', metricBox(len + 0.04, 0.3, 0.04), frame(face, plane, mid, y0 + 0.15, 0.02))
  for (const u of cols) b.add('concreteRaw', metricBox(0.3, y1 - y0, 0.04), frame(face, plane, u, (y0 + y1) / 2, 0.02))
}

/** Gable triangle (concrete) between eave and ridge, in a plane. */
function gable(b: Builder, face: Face, plane: number, centreU: number, halfW: number, ridge: number) {
  const s = new THREE.Shape([new THREE.Vector2(-halfW, 0), new THREE.Vector2(halfW, 0), new THREE.Vector2(0, ridge - EAVE - 0.05)])
  b.add('concreteRaw', extrude(s, 0.3), new THREE.Matrix4().multiplyMatrices(frame(face, plane, centreU, EAVE, -0.3), mat(0, 0, 0)))
}

/** Snow guard (two tubes on brackets) along an eave, `inset` metres up the slope. */
function snowGuard(b: Builder, a: THREE.Vector3, c: THREE.Vector3, upSlope: THREE.Vector3) {
  const n = V(0, 1, 0).sub(upSlope.clone().multiplyScalar(upSlope.y)).normalize() // roughly the roof normal
  const pa = a.clone().addScaledVector(upSlope, 0.9)
  const pc = c.clone().addScaledVector(upSlope, 0.9)
  for (const h of [0.07, 0.16]) b.rod('aluTrim', pa.clone().addScaledVector(n, h), pc.clone().addScaledVector(n, h), 0.02, 6)
  const L = pa.distanceTo(pc)
  const k = Math.max(1, Math.round(L / 1.1))
  for (let i = 0; i <= k; i++) {
    const p = pa.clone().lerp(pc, i / k)
    b.beam('aluTrim', p, p.clone().addScaledVector(n, 0.19), 0.03, 0.05)
  }
}

/** Gable roof (two facets) with gutters, fascias and snow guards. ridgeAxis: 'x' or 'z'. */
function gableRoof(
  b: Builder,
  axis: 'x' | 'z',
  o: { a0: number; a1: number; c: number; half: number; ridge: number; cut0?: boolean; cut1?: boolean; free?: (side: number) => [number, number, boolean, boolean][] },
) {
  // a0..a1 = extent along the ridge (incl. verge overhang); c = ridge position across; half = half-span of the walls.
  // free(side) lists the eave stretches [from, to, valleyAtStart, valleyAtEnd] that carry gutters and snow guards.
  const ye = EAVE - OHE * T
  const he = o.half + OHE
  const P = (along: number, y: number, across: number) => (axis === 'z' ? V(o.c + across, y, along) : V(along, y, o.c + across))
  for (const s of [-1, 1]) {
    facet(b, 'alu', [P(o.a0, ye, s * he), P(o.a1, ye, s * he), P(o.a1, o.ridge, 0), P(o.a0, o.ridge, 0)], { seams: SEAM, thickness: 0.2 })
    const up = P(0, o.ridge - ye, -s * he).sub(P(0, 0, 0)).normalize()
    const runs = o.free ? o.free(s) : [[o.a0, o.a1, !!o.cut0, !!o.cut1] as [number, number, boolean, boolean]]
    for (const [f0, f1, v0, v1] of runs) {
      if (f1 - f0 < 0.5) continue
      // half-round gutter and eave fascia trim
      b.rod('aluTrim', P(f0 + 0.05, ye - 0.12, s * (he + 0.06)), P(f1 - 0.05, ye - 0.12, s * (he + 0.06)), 0.075, 8)
      b.beam('aluTrim', P(f0, ye - 0.06, s * (he + 0.01)), P(f1, ye - 0.06, s * (he + 0.01)), 0.04, 0.24)
      // snow guard, kept clear of the valleys
      const g0 = f0 + (v0 ? 1.1 : 0.3)
      const g1 = f1 - (v1 ? 1.1 : 0.3)
      if (g1 - g0 > 0.5) snowGuard(b, P(g0, ye, s * he), P(g1, ye, s * he), up)
    }
  }
  b.beam('alu', P(o.a0, o.ridge + 0.06, 0), P(o.a1, o.ridge + 0.06, 0), 0.3, 0.14)
  // verge trims at free gable ends
  for (const [at, free] of [
    [o.a0, !o.cut0],
    [o.a1, !o.cut1],
  ] as [number, boolean][]) {
    if (!free) continue
    for (const s of [-1, 1]) b.beam('aluTrim', P(at, ye - 0.04, s * he), P(at, o.ridge - 0.02, 0), 0.06, 0.3)
  }
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- lower storey (exposed west, buried east) ---------------- */
  const lower = (x0: number, x1: number, z0: number, z1: number) => b.block('concreteRaw', x1 - x0, U, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
  lower(B.x0, B.x1, B.z0, B.z1)
  lower(A.x0, A.x1 + 0.01, A.z0, A.z1)
  lower(C.x0 - 0.01, C.x1, C.z0, C.z1)
  // terrace: open lower bays behind columns on the west and north
  b.block('void', TERR.x1 - TERR.x0 - 1.2, U - 0.35, TERR.z1 - TERR.z0 - 1.2, (TERR.x0 + TERR.x1) / 2 + 0.6, 0, (TERR.z0 + TERR.z1) / 2 + 0.6)
  b.block('concreteRaw', TERR.x1 - TERR.x0, 0.3, TERR.z1 - TERR.z0, (TERR.x0 + TERR.x1) / 2, U - 0.3, (TERR.z0 + TERR.z1) / 2)
  for (const [x, z] of [
    [TERR.x0 + 0.15, TERR.z0 + 0.15],
    [TERR.x0 + 0.15, -4.0],
    [TERR.x0 + 0.15, TERR.z1 - 0.15],
    [-7.5, TERR.z0 + 0.15],
  ]) b.block('concreteRaw', 0.3, U - 0.3, 0.3, x, 0, z)
  // waterproofing on the lower walls: low band on the west, full height on the east (below ground)
  const mem = (x0: number, x1: number, z0: number, z1: number, h: number) => b.block('membrane', x1 - x0 + 0.04, h, z1 - z0 + 0.04, (x0 + x1) / 2, 0, (z0 + z1) / 2)
  mem(A.x0, A.x1, A.z0, A.z1, 1.1)
  mem(B.x0, B.x1, B.z0, B.z1, 1.1)
  mem(-0.6, B.x1, B.z0, B.z1, U - 0.45)
  mem(C.x0, C.x1, C.z0, C.z1, U - 0.45)
  // pink XPS insulation strip at the main floor slab edge (as photographed)
  b.block('xps', A.x1 - A.x0 + 0.06, 0.45, A.z1 - A.z0 + 0.06, (A.x0 + A.x1) / 2, U - 0.5, (A.z0 + A.z1) / 2)
  // lower-storey openings on the exposed west gable of the west wing
  opening(b, '-x', A.x0 - 0.02, A.x0, 1.0, 2.6, 1.3, 2.4)

  /* ---------------- main floor walls ---------------- */
  const wall = (x0: number, x1: number, z0: number, z1: number) => b.block('brickRaw', x1 - x0, EAVE - U, z1 - z0, (x0 + x1) / 2, U, (z0 + z1) / 2)
  wall(A.x0, A.x1 + 0.01, A.z0, A.z1)
  wall(LOGGIA.x1, B.x1, B.z0, LOGGIA.z1)
  wall(B.x0, B.x1, LOGGIA.z1, B.z1)
  wall(C.x0 - 0.01, C.x1, C.z0, C.z1)
  // loggia: corner columns, beam under the roof, pink floor edge
  for (const z of [B.z0 + 0.15, (B.z0 + LOGGIA.z1) / 2]) b.block('concreteRaw', 0.3, EAVE - U, 0.3, B.x0 + 0.15, U, z)
  b.block('concreteRaw', 0.3, 0.35, LOGGIA.z1 - B.z0, B.x0 + 0.15, EAVE - 0.35, (B.z0 + LOGGIA.z1) / 2)
  b.block('concreteRaw', LOGGIA.x1 - B.x0, 0.35, 0.3, (B.x0 + LOGGIA.x1) / 2, EAVE - 0.35, B.z0 + 0.15)
  b.block('concreteRaw', LOGGIA.x1 - B.x0, 0.05, LOGGIA.z1 - B.z0, (B.x0 + LOGGIA.x1) / 2, U - 0.05, (B.z0 + LOGGIA.z1) / 2)
  b.block('xps', 0.06, 0.35, LOGGIA.z1 - B.z0 - 0.4, LOGGIA.x1 - 0.03, U, (B.z0 + LOGGIA.z1) / 2)
  b.block('concreteRaw', LOGGIA.x1 - B.x0, 0.06, LOGGIA.z1 - B.z0, (B.x0 + LOGGIA.x1) / 2, EAVE - 0.41, (B.z0 + LOGGIA.z1) / 2) // ceiling

  // terrace slab and brick parapet (west and north edges)
  b.block('concreteRaw', TERR.x1 - TERR.x0, 0.06, TERR.z1 - TERR.z0, (TERR.x0 + TERR.x1) / 2, U - 0.06, (TERR.z0 + TERR.z1) / 2)
  b.block('brickRaw', 0.25, 1.0, TERR.z1 - TERR.z0, TERR.x0 + 0.125, U, (TERR.z0 + TERR.z1) / 2)
  b.block('brickRaw', TERR.x1 - TERR.x0 + 2.0, 1.0, 0.25, (TERR.x0 + TERR.x1) / 2 + 1.0, U, TERR.z0 + 0.125)
  b.block('concreteRaw', 0.3, 0.12, TERR.z1 - TERR.z0, TERR.x0 + 0.125, U + 1.0, (TERR.z0 + TERR.z1) / 2)
  b.block('concreteRaw', TERR.x1 - TERR.x0 + 2.0, 0.12, 0.3, (TERR.x0 + TERR.x1) / 2 + 1.0, U + 1.0, TERR.z0 + 0.125)
  b.block('xps', 0.06, 0.4, TERR.z1 - TERR.z0, TERR.x0 - 0.03, U - 0.5, (TERR.z0 + TERR.z1) / 2)
  // the parapet also closes the loggia's north side up to the slab edge of B
  b.block('concreteRaw', LOGGIA.x1 - B.x0, 0.3, 0.6, (B.x0 + LOGGIA.x1) / 2, U - 0.3, B.z0 + 0.3)

  /* ---------------- concrete frame bands & gables ---------------- */
  // west wing
  frameBands(b, '-x', A.x0, A.z0, A.z1, U, EAVE, [A.z0 + 0.15, 2.55, A.z1 - 0.15])
  frameBands(b, '+z', A.z1, A.x0, A.x1, U, EAVE, [A.x0 + 0.15, -7.5])
  frameBands(b, '-z', A.z0, -A.x1, -A.x0, U, EAVE, [-(A.x0 + 0.15), 7.5])
  // central volume
  frameBands(b, '+x', B.x1, -B.z1, -C.z1, U, EAVE, [-(B.z1 - 0.15)])
  frameBands(b, '+x', B.x1, -C.z0, -B.z0, U, EAVE, [-(C.z0 - 0.15), 4.0, -(B.z0 + 0.15)])
  frameBands(b, '+z', B.z1, B.x0, B.x1, U, EAVE, [B.x0 + 0.15, B.x1 - 0.15, -0.7])
  frameBands(b, '-z', B.z0, -B.x1, -LOGGIA.x1, U, EAVE, [-(B.x1 - 0.15), 0.7])
  frameBands(b, '-x', B.x0, A.z1, B.z1, U, EAVE, [B.z1 - 0.15])
  // east wing
  frameBands(b, '+x', C.x1, -C.z1, -C.z0, U, EAVE, [-(C.z0 + 0.15), -zC, -(C.z1 - 0.15)])
  frameBands(b, '+z', C.z1, C.x0, C.x1, U, EAVE, [C.x1 - 0.15, 6.9])
  frameBands(b, '-z', C.z0, -C.x1, -C.x0, U, EAVE, [-(C.x1 - 0.15), -6.9])
  // gable triangles
  gable(b, '-x', A.x0, uOf('-x', A.x0, zA), (A.z1 - A.z0) / 2, ridgeA)
  gable(b, '+x', C.x1, uOf('+x', C.x1, zC), (C.z1 - C.z0) / 2, ridgeC)
  gable(b, '+z', B.z1, uOf('+z', xB, B.z1), (B.x1 - B.x0) / 2, ridgeB)
  gable(b, '-z', B.z0, uOf('-z', xB, B.z0), (B.x1 - B.x0) / 2, ridgeB)

  /* ---------------- raw window / door openings (main floor) ---------------- */
  const sill = U + 0.9
  const head = EAVE - 0.35
  // west wing: big opening in the north half of the gable (brick parapet below), side windows
  opening(b, '-x', A.x0, A.x0, 1.1, 2.3, U + 1.0, head)
  opening(b, '+z', A.z1, -8.6, A.z1, 0.9, sill, head)
  opening(b, '+z', A.z1, -6.0, A.z1, 0.9, sill, head)
  opening(b, '-z', A.z0, -6.0, A.z0, 1.0, U + 0.05, head) // door to the terrace
  // central volume
  opening(b, '-z', B.z0, 0.8, B.z0, 1.2, sill, head)
  opening(b, '+z', B.z1, -2.0, B.z1, 1.2, sill, head)
  opening(b, '+z', B.z1, 1.4, B.z1, 0.8, sill + 0.5, head)
  opening(b, '+x', B.x1, B.x1, -6.2, 1.2, sill, head)
  opening(b, '+x', B.x1, B.x1, -3.6, 1.2, sill, head)
  opening(b, '+x', B.x1, B.x1, -1.0, 1.0, U + 0.05, head)
  opening(b, '-x', B.x0, B.x0, 6.6, 1.0, sill, head)
  opening(b, '-x', LOGGIA.x1, LOGGIA.x1, -5.6, 1.0, U + 0.05, head) // door from the loggia
  opening(b, '-x', LOGGIA.x1, LOGGIA.x1, -2.9, 1.4, U + 0.05, head)
  // east wing
  for (const x of [4.6, 6.6, 9.0]) opening(b, '-z', C.z0, x, C.z0, 1.0, sill, head)
  for (const z of [2.6, 6.0]) opening(b, '+x', C.x1, C.x1, z, 1.1, sill, head)
  for (const x of [5.0, 7.6, 9.6]) opening(b, '+z', C.z1, x, C.z1, 1.0, sill, head)

  /* ---------------- roofs ---------------- */
  const zb0 = B.z0 - OHG
  const zb1 = B.z1 + OHG
  gableRoof(b, 'z', {
    a0: zb0,
    a1: zb1,
    c: xB,
    half: (B.x1 - B.x0) / 2,
    ridge: ridgeB,
    // west eave interrupted by the west wing, east eave by the east wing
    free: (s) =>
      s < 0
        ? [
            [zb0, A.z0 - OHE, false, true],
            [A.z1 + OHE, zb1, true, false],
          ]
        : [
            [zb0, C.z0 - OHE, false, true],
            [C.z1 + OHE, zb1, true, false],
          ],
  })
  gableRoof(b, 'x', { a0: A.x0 - OHG, a1: xB, c: zA, half: (A.z1 - A.z0) / 2, ridge: ridgeA, cut1: true, free: () => [[A.x0 - OHG, B.x0 - OHE, false, true]] })
  gableRoof(b, 'x', { a0: xB, a1: C.x1 + OHG, c: zC, half: (C.z1 - C.z0) / 2, ridge: ridgeC, cut0: true, free: () => [[B.x1 + OHE, C.x1 + OHG, true, false]] })
  // valley flashings where the wings meet the central roof
  for (const [w, sgn] of [
    [A, -1],
    [C, 1],
  ] as [typeof A, number][]) {
    const zc = (w.z0 + w.z1) / 2
    const half = (w.z1 - w.z0) / 2
    const xe = sgn < 0 ? B.x0 - OHE : B.x1 + OHE
    const ye = EAVE - OHE * T
    const xr = sgn < 0 ? B.x0 + half : B.x1 - half
    const yr = EAVE + half * T
    for (const s of [-1, 1]) b.beam('alu', V(xe, ye + 0.03, zc + s * (half + OHE)), V(xr, yr + 0.03, zc), 0.25, 0.05)
  }

  /* roof windows on the east slope of the central volume, vents */
  const yAt = (x: number) => ridgeB - (x - xB) * T
  for (const zc of [-2.17, -0.65]) {
    const x0 = 1.75
    const x1 = 2.85
    const pts = [V(x0, yAt(x0) + 0.14, zc - 0.57), V(x1, yAt(x1) + 0.14, zc - 0.57), V(x1, yAt(x1) + 0.14, zc + 0.57), V(x0, yAt(x0) + 0.14, zc + 0.57)]
    facet(b, 'skylight', pts)
    const f = [V(x0 - 0.06, yAt(x0 - 0.06) + 0.1, zc - 0.63), V(x1 + 0.06, yAt(x1 + 0.06) + 0.1, zc - 0.63), V(x1 + 0.06, yAt(x1 + 0.06) + 0.1, zc + 0.63), V(x0 - 0.06, yAt(x0 - 0.06) + 0.1, zc + 0.63)]
    for (let i = 0; i < 4; i++) b.beam('frameGrey', f[i], f[(i + 1) % 4], 0.1, 0.12)
  }
  for (const [x, z, y] of [
    [4.66, 3.97, ridgeC - (zC - 3.97) * T],
    [1.2, -6.8, yAt(1.2)],
  ]) b.add('white', new THREE.CylinderGeometry(0.11, 0.11, 0.35, 12), mat(x, y + 0.1, z))

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [1.5, 6.5, -3],
  materials: () => ({
    brickRaw: new THREE.MeshStandardMaterial({ color: '#c87a52', roughness: 0.92 }),
    concreteRaw: new THREE.MeshStandardMaterial({ color: '#aeaca6', roughness: 0.92 }),
    membrane: new THREE.MeshStandardMaterial({ color: '#2b2e31', roughness: 0.55, metalness: 0.1 }),
    xps: new THREE.MeshStandardMaterial({ color: '#e7a9c6', roughness: 0.85 }),
    void: new THREE.MeshStandardMaterial({ color: '#1d1c1b', roughness: 1 }),
    aluTrim: new THREE.MeshStandardMaterial({ color: '#3b4248', metalness: 0.5, roughness: 0.42 }),
    frameGrey: new THREE.MeshStandardMaterial({ color: '#4a4f54', metalness: 0.4, roughness: 0.45 }),
  }),
  notes: 'Cross-plan house on a slope with anthracite standing-seam aluminium roofs; shown as photographed during construction (raw brick infill, concrete frame). Size from the seam pitch; orientation assumed.',
}
export default model
