/**
 * Biblioteca Academiei Române, Calea Victoriei 125, București — the zinc-roofed
 * courtyard wing of the library complex.
 *
 * Which wing: the reference photographs (01–07) are taken from an upper floor
 * of the northern library block across a narrow light court; they show a long
 * white wing with a low hipped titanium-zinc roof directly in front of the
 * tall book-depot tower (whose western stair shaft appears on the right).
 * Matching this geometry with the OSM outlines of the complex puts the zinc
 * roofs on the central L-shaped wing (OSM way 405546991, tagged 7 levels) —
 * not on the named street wing 405546989 (flat roof, glass fan pavilion of
 * photos 10–12). Photos 08–09, taken from the tower looking east over the
 * Academy garden, show the low-pitch zinc roof between parapets of the
 * southern part of the same wing. Only this connected wing is modelled; the
 * depot tower, the street wing and the northern/western blocks are not.
 *
 * Modelling specification (real metres, +X = complex axis ≈ 65°):
 *  - North bar ≈ 43 × 18.4 m and an east leg (≈ 11 m wide, then 19.5 m) along
 *    the garden; 7 storeys of white render, regular window grid with ochre
 *    wooden frames and grey repair patches around the openings (photos 01–04).
 *  - Roofs — titanium-zinc, standing seams ≈ 0.55 m: low (≈ 17°) hipped roof
 *    over the north bar, a lower hipped roof over the east leg meeting it in a
 *    valley; half-round zinc gutters and downpipes, roof hatches, a concrete
 *    stair/lift head and a chimney with a copper hood at the junction
 *    (photos 02, 06); the southern part has a near-flat zinc roof inside
 *    parapets with zinc copings (photos 08–09, darker pre-weathered look).
 * Approximations: wing identification from photo geometry vs. OSM outlines;
 * storey count from OSM (7) — the photographs only show the two top floors;
 * storey heights, the walls facing the adjoining library blocks and the
 * ground floor are assumed; the parapet roof's fall direction is estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, faceFrame, window_, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3
const D2R = Math.PI / 180

/* ---------------- dimensions ---------------- */
const A = { x0: -21.5, x1: 21.6, z0: -21.3, z1: -2.9 } // north bar
const B = { x0: 7.2, x1: 18.4, z0: -2.9, z1: 9.4 } // east leg, hipped part
const C = { x0: -1.1, x1: 18.4, z0: 9.4, z1: 21.1 } // east leg, parapet roof
const E = 24.2 // eave (7 storeys)
const PAR = 1.15 // parapet height of part C
const FLOORS = [0.95, 4.85, 8.25, 11.65, 15.05, 18.45, 21.85] // window sills
const OV = 0.55
const PITCH = 17
const TP = Math.tan(PITCH * D2R)
const YE = E - OV * TP
const ROOF = 'zincNatural'
const SEAM = seams(ROOF, 0.55, 0.05, 0.045)
const SEAM_C = seams('zincSlate', 0.55, 0.045, 0.04)
const WALL = 'plasterWhite'

/* ---------------- helpers ---------------- */
const uOf = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

interface WingRoof {
  x0: number
  x1: number
  z0: number
  z1: number
  ye: number
  axis: 'x' | 'z'
  pitch: number
  end0: number | 'open'
  end1: number | 'open'
}

function wingRoof(w: WingRoof) {
  const alongX = w.axis === 'x'
  const a0 = alongX ? w.x0 : w.z0
  const a1 = alongX ? w.x1 : w.z1
  const c0 = alongX ? w.z0 : w.x0
  const c1 = alongX ? w.z1 : w.x1
  const P = (a: number, y: number, c: number) => (alongX ? V(a, y, c) : V(c, y, a))
  const cc = (c0 + c1) / 2
  const yr = w.ye + ((c1 - c0) / 2) * Math.tan(w.pitch * D2R)
  const rise = yr - w.ye
  let ra = w.end0 === 'open' ? a0 : a0 + rise / Math.tan(w.end0 * D2R)
  let rb = w.end1 === 'open' ? a1 : a1 - rise / Math.tan(w.end1 * D2R)
  if (ra > rb) ra = rb = (ra + rb) / 2
  const e00 = P(a0, w.ye, c0)
  const e01 = P(a0, w.ye, c1)
  const e10 = P(a1, w.ye, c0)
  const e11 = P(a1, w.ye, c1)
  const ra3 = P(ra, yr, cc)
  const rb3 = P(rb, yr, cc)
  const faces: P3[][] = [
    [e01, e11, rb3, ra3],
    [e10, e00, ra3, rb3],
  ]
  const hips: [P3, P3][] = []
  if (w.end0 !== 'open') {
    faces.push([e00, e01, ra3])
    hips.push([e00, ra3], [e01, ra3])
  }
  if (w.end1 !== 'open') {
    faces.push([e11, e10, rb3])
    hips.push([e10, rb3], [e11, rb3])
  }
  return { faces, ridge: [ra3, rb3] as [P3, P3], hips, yr, eaves: { e00, e01, e10, e11 } }
}

function roof(b: Builder, r: ReturnType<typeof wingRoof>) {
  for (const f of r.faces) facet(b, ROOF, f, { seams: SEAM, thickness: 0.08 })
  const up = V(0, 0.04, 0)
  b.beam('barCap', r.ridge[0].clone().add(up), r.ridge[1].clone().add(up), 0.24, 0.1)
  for (const [p, q] of r.hips) b.beam('barCap', p.clone().add(up), q.clone().add(up), 0.2, 0.08)
}

/** Window: ochre wooden frame, grey repair patch around the opening. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w = 1.5, h = 1.9) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('barPatch', extrude(frameShape('rect', w + 0.1, h + 0.1, 0.22, 0, y0 - 0.05), 0.03), m)
  window_(b, face, plane, u, y0, { w, h, frame: 0.1, frameKey: 'barFrame', glassKey: 'glassC', bars: [2, 1], inset: 0.07 })
  b.add('barPatch', metricBox(w + 0.3, 0.08, 0.16), M(m, mat(0, y0 - 0.12, 0.08)))
}

function facadeGrid(b: Builder, face: Face, plane: number, from: number, to: number, step: number) {
  const n = Math.max(1, Math.round((to - from) / step))
  const s = (to - from) / n
  for (let i = 0; i < n; i++) {
    const c = from + s * (i + 0.5)
    for (const y of FLOORS) win(b, face, plane, uOf(face, face.endsWith('z') ? c : 0, face.endsWith('x') ? c : 0), y, 1.5, y < 1 ? 2.5 : 1.9)
  }
}

function downpipe(b: Builder, x: number, z: number, key = ROOF) {
  b.rod(key, V(x, 0.4, z), V(x, YE - 0.1, z), 0.06, 8)
  b.rod(key, V(x, YE - 0.1, z), V(x, YE - 0.05, z), 0.07, 8)
}

/* ---------------- model ---------------- */

function build(): Builder {
  const b = new Builder()

  /* ---------- masses ---------- */
  for (const r of [A, B]) {
    b.block(WALL, r.x1 - r.x0, E, r.z1 - r.z0 + 0.1, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)
    b.block('stoneGrey', r.x1 - r.x0 + 0.12, 0.8, r.z1 - r.z0 + 0.12, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)
    b.block('barCornice', r.x1 - r.x0 + 0.16, 0.3, r.z1 - r.z0 + 0.16, (r.x0 + r.x1) / 2, E - 0.3, (r.z0 + r.z1) / 2)
  }
  b.block(WALL, C.x1 - C.x0, E, C.z1 - C.z0, (C.x0 + C.x1) / 2, 0, (C.z0 + C.z1) / 2)
  b.block('stoneGrey', C.x1 - C.x0 + 0.12, 0.8, C.z1 - C.z0 + 0.12, (C.x0 + C.x1) / 2, 0, (C.z0 + C.z1) / 2)
  // parapet box with a near-flat zinc deck inside (falling west), zinc copings
  {
    const t = 0.32
    const yIn = E + 0.08
    const cx = (C.x0 + C.x1) / 2
    const cz = (C.z0 + C.z1) / 2
    b.block(WALL, C.x1 - C.x0, PAR, t, cx, E, C.z0 + t / 2)
    b.block(WALL, C.x1 - C.x0, PAR, t, cx, E, C.z1 - t / 2)
    b.block(WALL, t, PAR, C.z1 - C.z0, C.x0 + t / 2, E, cz)
    b.block(WALL, t, PAR, C.z1 - C.z0, C.x1 - t / 2, E, cz)
    const x0 = C.x0 + t
    const x1 = C.x1 - t
    const z0 = C.z0 + t
    const z1 = C.z1 - t
    const rise = (x1 - x0) * Math.tan(1.6 * D2R)
    facet(b, 'zincSlate', [V(x0, yIn, z0), V(x1, yIn + rise, z0), V(x1, yIn + rise, z1), V(x0, yIn, z1)], { seams: SEAM_C })
    // zinc flashing turned up the inner parapet faces
    b.block('zincSlate', x1 - x0, 0.3, 0.04, cx, yIn, z0 + 0.02)
    b.block('zincSlate', x1 - x0, 0.3, 0.04, cx, yIn, z1 - 0.02)
    // copings
    const yc = E + PAR + 0.02
    const cop = (p: P3, q: P3) => b.beam('zincSlate', p, q, 0.5, 0.08)
    cop(V(C.x0, yc, C.z0 + 0.1), V(C.x1, yc, C.z0 + 0.1))
    cop(V(C.x0, yc, C.z1 - 0.1), V(C.x1, yc, C.z1 - 0.1))
    cop(V(C.x0 + 0.1, yc, C.z0), V(C.x0 + 0.1, yc, C.z1))
    cop(V(C.x1 - 0.1, yc, C.z0), V(C.x1 - 0.1, yc, C.z1))
    // raised wall end at the north-west corner (photos 08–09)
    b.block(WALL, 0.45, 1.4, 4.5, C.x0 + 0.22, E + PAR - 0.05, C.z0 + 2.4)
    b.beam('zincSlate', V(C.x0 + 0.22, E + PAR + 1.38, C.z0 + 0.15), V(C.x0 + 0.22, E + PAR + 1.38, C.z0 + 4.65), 0.6, 0.08)
    // roof hatch on the deck
    b.block("zincSlate", 1.4, 0.35, 1.0, 9.0, yIn + 0.25, 15.0)
  }

  /* ---------- façades ---------- */
  facadeGrid(b, '-z', A.z0, A.x0 + 0.6, A.x1 - 0.6, 3.3) // north, towards the light court (photos 01–04)
  facadeGrid(b, '+x', A.x1, A.z0 + 0.6, A.z1 + 0.3, 3.3)
  facadeGrid(b, '+z', A.z1, -1.1, B.x0 - 0.3, 3.3) // short courtyard stretch east of the depot tower
  // walls built against the adjoining library blocks (west block, depot tower, street wing): shown as plain party walls
  b.block('plasterGrey', 0.04, E - 0.8, A.z1 - A.z0, A.x0 - 0.02, 0.8, (A.z0 + A.z1) / 2)
  b.block('plasterGrey', -1.1 - A.x0, E - 0.8, 0.04, (A.x0 - 1.1) / 2, 0.8, A.z1 + 0.07)
  b.block('plasterGrey', C.x1 - C.x0, E - 0.8, 0.04, (C.x0 + C.x1) / 2, 0.8, C.z1 + 0.02)
  b.block('plasterGrey', 0.04, E - 0.8, C.z1 - C.z0, C.x0 - 0.02, 0.8, (C.z0 + C.z1) / 2)
  facadeGrid(b, '+x', B.x1, B.z0 + 0.3, B.z1, 3.3)
  facadeGrid(b, '-x', B.x0, B.z0 + 0.4, B.z1 - 0.3, 3.3)
  facadeGrid(b, '+x', C.x1, C.z0 + 0.3, C.z1 - 0.6, 3.3)
  facadeGrid(b, '-z', C.z0, C.x0 + 0.4, B.x0 - 0.3, 3.3)
  // a few windows of the north façade have a solid panel instead of glass (photo 01)
  for (const [x, y] of [
    [-6.4, 21.85],
    [9.9, 18.45],
  ] as [number, number][]) b.add('barFrame', metricBox(1.3, 0.9, 0.05), mat(x, y + 0.5, A.z0 - 0.08))

  /* ---------- roofs (titanium-zinc) ---------- */
  const oE = OV
  const rA = wingRoof({ x0: A.x0 - oE, x1: A.x1 + oE, z0: A.z0 - OV, z1: A.z1 + OV, ye: YE, axis: 'x', pitch: PITCH, end0: PITCH + 3, end1: PITCH + 3 })
  roof(b, rA)
  const rB = wingRoof({ x0: B.x0 - OV, x1: B.x1 + OV, z0: -9.0, z1: B.z1 + 0.05, ye: YE, axis: 'z', pitch: PITCH, end0: 'open', end1: PITCH + 3 })
  roof(b, rB)
  // gutters
  const gut = (p: P3, q: P3) => b.rod(ROOF, p.clone().add(V(0, -0.07, 0)), q.clone().add(V(0, -0.07, 0)), 0.09, 8)
  {
    const e = rA.eaves
    gut(e.e00, e.e10)
    gut(e.e00, e.e01)
    gut(e.e10, e.e11)
    gut(e.e01, V(B.x0 - OV, YE, e.e01.z))
    const f = rB.eaves
    gut(V(f.e00.x, YE, A.z1 + OV), V(f.e01.x, YE, B.z1))
    gut(V(f.e10.x, YE, A.z1 + OV), V(f.e11.x, YE, B.z1))
  }
  for (const x of [-16.6, -6.6, 3.4, 13.3]) downpipe(b, x, A.z0 - 0.2)
  for (const z of [-18.5, -6.0]) downpipe(b, A.x1 + 0.2, z)
  downpipe(b, B.x1 + 0.2, 6.5)
  downpipe(b, B.x0 - 0.2, 0.5)
  // roof hatches on the north slope (photos 01, 03, 04)
  for (const x of [-9.5, 3.0, 14.5]) {
    const z = A.z0 + 4.2
    const y = E + (4.2 + 0) * TP
    const hatch = new Builder()
    hatch.add(ROOF, metricBox(1.1, 0.36, 0.9), mat(0, 0.1, 0))
    hatch.add(ROOF, metricBox(1.25, 0.06, 1.05), mat(0, 0.3, 0))
    b.merge(hatch, mat(x, y, z, 0, -PITCH * D2R))
  }
  // stair / lift head at the junction (photos 02, 06)
  {
    const x = 10.6
    const z = -6.4
    b.block('concrete', 3.8, 5.0, 3.6, x, E + 0.2, z)
    b.block('concrete', 4.2, 0.25, 4.0, x, E + 5.2, z)
    b.block(ROOF, 4.0, 0.3, 3.8, x, E + 2.6 - 0.3, z)
  }
  // chimney with copper hood (photos 02, 06)
  {
    const x = 14.6
    const z = -1.0
    const y0 = E + 1.0
    b.block(WALL, 1.3, 2.6, 1.3, x, y0, z)
    b.block(ROOF, 1.36, 0.6, 1.36, x, y0 + 1.6, z)
    b.block('black', 1.1, 0.5, 1.1, x, y0 + 2.6, z)
    const cap = new THREE.ConeGeometry(1.25, 0.55, 4, 1)
    b.add('copperBrown', cap, mat(x, y0 + 3.37, z, Math.PI / 4))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [0, 26, -15],
  materials: () => ({
    barFrame: new THREE.MeshStandardMaterial({ color: '#b37a32', roughness: 0.6 }),
    barPatch: new THREE.MeshStandardMaterial({ color: '#b9b7b1', roughness: 0.92 }),
    barCornice: new THREE.MeshStandardMaterial({ color: '#d9d7d1', roughness: 0.9 }),
    barCap: new THREE.MeshStandardMaterial({ color: '#a9adb0', roughness: 0.45, metalness: 0.6 }),
  }),
  notes: 'Central courtyard wing of the library complex (OSM 405546991) with hipped titanium-zinc roofs; identified from the photo geometry, lower floors assumed.',
}
export default model
