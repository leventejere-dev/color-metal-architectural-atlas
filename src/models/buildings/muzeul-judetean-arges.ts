/**
 * Muzeul Județean Argeș, Pitești — the former Administrative Palace / Prefecture
 * (1898–1899), restored 2018–2025 with EU funds and reopened in October 2025.
 * Roofs re-covered in natural titanium-zinc standing seam supplied by
 * COLOR METAL (2021).
 *
 * Modelling specification (real metres; OSM way 136267182, 45.7 × 27.5 m,
 * long axis 138.5°; +X = 318.5° (north-west), +Z = 48.5° = the main façade
 * towards Str. Armand Călinescu and the park):
 *  - U-shaped plan after the OSM outline: front block 45.7 × 16.5 m, two rear
 *    wings (12 m and 10.9 m wide) enclosing a small courtyard to the south-west.
 *  - Main façade (photos 01, 02, 04): thirteen bays — two five-bay wings and a
 *    slightly projecting three-bay central pavilion. Stone socle with basement
 *    windows (to 1.6 m), banded-rusticated ground floor with round-arched
 *    windows (to 7.0 m), balcony string with balustraded balconettes,
 *    upper floor with engaged Corinthian columns between the windows,
 *    full entablature, cornice top ≈ 14.2 m (heights scaled from the frontal
 *    photo 02 with the OSM façade length).
 *  - Central pavilion: three arched entrance openings above a wide flight of
 *    steps, four giant Corinthian columns and corner pilasters on the upper
 *    floor, inscribed frieze, pediment with relief (apex ≈ 19 m) and an eagle
 *    acroterion (simplified).
 *  - Roofs: low hipped roofs (≈ 20°) over the front block and both rear wings,
 *    a gabled roof behind the pediment over the central pavilion; natural
 *    titanium-zinc standing seam (0.5 m pans). The roofs are hardly visible in
 *    the available photographs (2011, and the restored façade of 2025 seen from
 *    street level), so their geometry is interpreted and the whole roof is shown
 *    in the zinc supplied by COLOR METAL according to its records.
 * Approximations: courtyard and rear elevations (not photographed) given a
 * plain window rhythm, ornament (capitals, relief, frieze) simplified, heights
 * estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, window_, seams, faceFrame, hippedRoof, pediment, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.05, 0.045)
const REN = 'muzRender'
const STO = 'muzStone'
const TRM = 'muzTrim'
const FR = 'muzFrame'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan (model frame) */
const X0 = -22.86
const X1 = 22.86
const ZF = 13.2 // wing front wall
const ZP = 14.4 // central pavilion front
const ZB = -2.78 // back wall of the front block (courtyard)
const PAV = 6.6 // half width of the central pavilion
const NWW = { x0: 10.8, x1: X1, z0: -13.78 } // rear wing on +X (north-west)
const SEW = { x0: X0, x1: -12.0, z0: -11.05 } // rear wing on −X (south-east)

/* heights */
const SOCLE = 1.6
const GF_TOP = 7.0
const UF_TOP = 12.6
const EAVE = 14.2
const PITCH = 15

function archWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, frame: 0.22, frameKey: TRM, glassKey: 'glassC', inset: 0.07 })
  window_(b, face, plane, u, y0, { type: 'round', w: w - 0.08, h: h - 0.04, frame: 0.07, frameKey: FR, glassKey: 'glassC', inset: 0.08, bars: [2, 2] })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(TRM, metricBox(0.5, 0.7, 0.16), M(m, mat(0, y0 + h + 0.05, 0.1))) // keystone
}
function rectWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, hood = true) {
  window_(b, face, plane, u, y0, { w, h, frame: 0.2, frameKey: TRM, glassKey: 'glassC', inset: 0.03 })
  window_(b, face, plane, u, y0, { w: w - 0.08, h: h - 0.04, frame: 0.07, frameKey: FR, glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
  if (hood) {
    const m = faceFrame(face, plane, u, 0, 0)
    b.add(TRM, metricBox(w + 0.6, 0.3, 0.1), M(m, mat(0, y0 + h + 0.32, 0.05)))
    b.add(TRM, metricBox(w + 0.9, 0.16, 0.3), M(m, mat(0, y0 + h + 0.55, 0.15)))
  }
}
/** Balustraded balconette on a façade frame (u centre, width w) at height y. */
function balconette(b: Builder, m: THREE.Matrix4, u: number, w: number, y: number) {
  b.add(TRM, metricBox(w, 0.2, 0.7), M(m, mat(u, y + 0.1, 0.35)))
  const n = Math.round(w / 0.28)
  for (let i = 0; i <= n; i++) b.add(TRM, new THREE.CylinderGeometry(0.06, 0.085, 0.62, 6), M(m, mat(u - w / 2 + 0.1 + ((w - 0.2) * i) / n, y + 0.51, 0.6)))
  b.add(TRM, metricBox(w, 0.13, 0.26), M(m, mat(u, y + 0.88, 0.6)))
}
/** Corinthian column (engaged or free) at façade-local u, from y0 to y1, offset t from the wall. */
function column(b: Builder, m: THREE.Matrix4, u: number, y0: number, y1: number, r: number, t: number) {
  b.add(TRM, metricBox(r * 2.6, 0.32, r * 2.6), M(m, mat(u, y0 + 0.16, t)))
  b.add(TRM, new THREE.CylinderGeometry(r * 0.86, r, y1 - y0 - 1.2, 16), M(m, mat(u, y0 + 0.32 + (y1 - y0 - 1.2) / 2, t)))
  b.add(TRM, new THREE.CylinderGeometry(r * 1.35, r * 0.88, 0.75, 14), M(m, mat(u, y1 - 0.58, t)))
  b.add(TRM, metricBox(r * 2.9, 0.18, r * 2.9), M(m, mat(u, y1 - 0.12, t)))
}
/** Entablature band along a façade (architrave, frieze, cornice, zinc capping). */
function entablature(b: Builder, m: THREE.Matrix4, L: number, y0: number, out = 0) {
  b.add(TRM, metricBox(L, 0.45, 0.24 + out), M(m, mat(0, y0 + 0.22, (0.24 + out) / 2)))
  b.add(REN, metricBox(L, 0.55, 0.12 + out), M(m, mat(0, y0 + 0.72, (0.12 + out) / 2)))
  b.add(TRM, metricBox(L + 0.3, 0.22, 0.5 + out), M(m, mat(0, y0 + 1.1, (0.5 + out) / 2)))
  b.add(TRM, metricBox(L + 0.5, 0.36, 0.85 + out), M(m, mat(0, y0 + 1.42, (0.85 + out) / 2)))
  b.add(ZN, metricBox(L + 0.54, 0.04, 0.9 + out), M(m, mat(0, y0 + 1.62, (0.9 + out) / 2)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= volumes ================= */
  const block = (x0: number, x1: number, z0: number, z1: number) => {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    b.block(REN, x1 - x0, EAVE - 1.6, z1 - z0, cx, 0, cz)
    b.block(STO, x1 - x0 + 0.24, SOCLE, z1 - z0 + 0.24, cx, 0, cz)
    // banded rustication grooves on the ground floor
    for (let y = SOCLE + 0.55; y < GF_TOP - 0.2; y += 0.55) b.block(TRM, x1 - x0 + 0.1, 0.4, z1 - z0 + 0.1, cx, y - 0.4, cz)
    b.block(TRM, x1 - x0 + 0.36, 0.42, z1 - z0 + 0.36, cx, GF_TOP, cz) // balcony string
    b.block(TRM, x1 - x0 + 0.12, 0.45, z1 - z0 + 0.12, cx, UF_TOP, cz)
    b.block(REN, x1 - x0 + 0.04, 0.55, z1 - z0 + 0.04, cx, UF_TOP + 0.45, cz)
    b.block(TRM, x1 - x0 + 0.5, 0.22, z1 - z0 + 0.5, cx, EAVE - 0.6, cz)
    b.block(TRM, x1 - x0 + 0.9, 0.36, z1 - z0 + 0.9, cx, EAVE - 0.38, cz)
    b.block(ZN, x1 - x0 + 0.94, 0.04, z1 - z0 + 0.94, cx, EAVE - 0.02, cz)
  }
  block(X0, X1, ZB, ZF)
  block(NWW.x0, NWW.x1, NWW.z0, ZB + 0.01)
  block(SEW.x0, SEW.x1, SEW.z0, ZB + 0.01)
  // central pavilion projection
  b.block(REN, 2 * PAV, EAVE - 1.6, ZP - ZF + 0.01, 0, 0, (ZF + ZP) / 2)
  b.block(STO, 2 * PAV + 0.24, SOCLE, ZP - ZF + 0.24, 0, 0, (ZF + ZP) / 2)

  /* ================= main façade (+Z) ================= */
  const wingBays = (sx: number) => [0, 1, 2, 3, 4].map((i) => sx * (PAV + 1.75 + i * 3.25))
  const fm = mat(0, 0, ZF, 0)
  for (const sx of [-1, 1]) {
    const bays = wingBays(sx)
    for (const x of bays) {
      archWin(b, '+z', ZF, x, 2.6, 1.55, 3.4)
      rectWin(b, '+z', ZF, x, 8.0, 1.45, 2.7)
      balconette(b, fm, x, 2.2, GF_TOP + 0.42)
      b.add('glassC', metricBox(0.9, 0.5, 0.04), mat(x, 0.6, ZF + 0.14)) // basement window
    }
    // engaged columns between and at the ends of the bays
    for (let i = 0; i <= 5; i++) {
      const x = sx * (PAV + 0.12 + i * 3.25)
      column(b, fm, x, GF_TOP + 0.42, UF_TOP, 0.34, 0.42)
    }
    // wing end piers (photo 01)
    b.block(TRM, 1.1, UF_TOP - GF_TOP - 0.4, 0.3, sx * (X1 - 0.55), GF_TOP + 0.42, ZF + 0.15)
  }
  entablature(b, fm, 2 * X1, UF_TOP)
  // remove doubled wing cornice under the pavilion: pavilion front gets its own
  const pm = mat(0, 0, ZP, 0)
  {
    // ground floor: three arched entrance openings between rusticated piers
    for (const x of [-3.3, 0, 3.3]) {
      window_(b, '+z', ZP, x, SOCLE + 0.1, { type: 'round', w: 2.3, h: 4.6, frame: 0.3, frameKey: TRM, glassKey: 'muzShade', inset: 0.08 })
    }
    for (let y = SOCLE + 0.55; y < GF_TOP - 0.2; y += 0.55) b.block(TRM, 2 * PAV + 0.1, 0.4, ZP - ZF + 0.1, 0, y - 0.4, (ZF + ZP) / 2)
    b.block(TRM, 2 * PAV + 0.4, 0.42, ZP - ZF + 0.4, 0, GF_TOP, (ZF + ZP) / 2)
    // upper floor: four giant columns in front, corner pilasters, three windows with balconettes
    for (const x of [-4.6, -1.55, 1.55, 4.6]) column(b, pm, x, GF_TOP + 0.42, UF_TOP + 0.4, 0.42, 0.75)
    for (const x of [-6.2, 6.2]) b.add(TRM, metricBox(0.75, UF_TOP - GF_TOP, 0.3), M(pm, mat(x, (GF_TOP + UF_TOP) / 2 + 0.2, 0.15)))
    for (const x of [-3.1, 0, 3.1]) {
      rectWin(b, '+z', ZP, x, 8.0, 1.5, 3.0, false)
      balconette(b, pm, x, 2.1, GF_TOP + 0.42)
    }
    entablature(b, pm, 2 * PAV + 0.4, UF_TOP + 0.4, 0.9)
    // inscription panel in the frieze
    b.add('muzLetters', metricBox(6.5, 0.32, 0.04), mat(0, UF_TOP + 1.12, ZP + 1.03))
    // pediment with relief and acroterion
    const py = EAVE + 0.4
    pediment(b, TRM, '+z', ZP + 0.9, { u: 0, w: 2 * PAV + 0.8, y: py, rise: 4.0, depth: 1.0 })
    b.add('muzRelief', metricBox(4.5, 1.2, 0.12), mat(0, py + 1.0, ZP + 0.85))
    const rake = Math.atan2(4.0, PAV + 0.4)
    for (const s of [-1, 1]) {
      const a = V(s * (PAV + 0.6), py + 0.05, ZP + 0.95)
      const c = V(0, py + 4.25, ZP + 0.95)
      b.beam(TRM, a, c, 0.55, 0.42, V(0, 0, 1))
      const o = V(0, 0.3 / Math.cos(rake), 0)
      b.beam(ZN, a.clone().add(o).add(V(0, 0, -0.6)), c.clone().add(o).add(V(0, 0, -0.6)), 0.6, 1.4, V(0, 0, 1))
    }
    b.block(TRM, 0.9, 0.9, 0.9, 0, py + 4.0, ZP + 0.6)
    b.add('muzBronze', new THREE.SphereGeometry(0.45, 10, 8), mat(0, py + 5.25, ZP + 0.6, 0, 0, 0, 1.3, 1, 0.8))
    for (const s of [-1, 1]) b.add('muzBronze', metricBox(1.1, 0.12, 0.35), mat(s * 0.6, py + 5.45, ZP + 0.6, 0, 0, s * 0.35))
    // wide flight of steps
    for (let i = 0; i < 9; i++) b.block(STO, 10.0 + i * 0.5, SOCLE * (1 - i / 9), 0.36, 0, 0, ZP + 0.2 + i * 0.36)
    for (const s of [-1, 1]) b.block(STO, 0.8, SOCLE + 0.3, 3.6, s * 5.6, 0, ZP + 1.8)
  }

  /* ================= side and courtyard façades ================= */
  for (const [f, plane, us] of [
    ['+x', X1, [-11.0, -7.5, -4.0, -0.5, 3.0, 6.5, 10.0]],
    ['-x', X0, [-10.0, -6.5, -3.0, 0.5, 4.0, 7.5, 11.0]],
  ] as [Face, number, number[]][]) {
    for (const u of us) {
      const zc = f === '+x' ? -u : u
      if (f === '+x' && zc < NWW.z0 + 0.8) continue
      if (f === '-x' && zc < SEW.z0 + 0.8) continue
      archWin(b, f, plane, u, 2.6, 1.45, 3.3)
      rectWin(b, f, plane, u, 8.0, 1.4, 2.6)
    }
  }
  // courtyard / rear façades (plain rhythm)
  for (const x of [-9.0, -5.5, -2.0, 1.5, 5.0, 8.5]) {
    archWin(b, '-z', ZB, -x, 2.6, 1.4, 3.2)
    rectWin(b, '-z', ZB, -x, 8.0, 1.4, 2.6, false)
  }
  for (const x of [13.2, 16.8, 20.4]) {
    archWin(b, '-z', NWW.z0, -x, 2.6, 1.4, 3.2)
    rectWin(b, '-z', NWW.z0, -x, 8.0, 1.4, 2.6, false)
  }
  for (const x of [-20.4, -17.0, -13.6]) {
    archWin(b, '-z', SEW.z0, -x, 2.6, 1.4, 3.2)
    rectWin(b, '-z', SEW.z0, -x, 8.0, 1.4, 2.6, false)
  }
  for (const z of [-10.5, -6.5]) {
    archWin(b, '-x', NWW.x0, z, 2.6, 1.4, 3.2)
    rectWin(b, '-x', NWW.x0, z, 8.0, 1.4, 2.6, false)
  }
  for (const z of [-8.5, -5.2]) {
    archWin(b, '+x', SEW.x1, -z, 2.6, 1.4, 3.2)
    rectWin(b, '+x', SEW.x1, -z, 8.0, 1.4, 2.6, false)
  }

  /* ================= roofs (natural titanium-zinc) ================= */
  const OH = 0.5
  hippedRoof(b, ZN, { x: 0, z: (ZB + ZF) / 2, w: X1 - X0, d: ZF - ZB, y: EAVE, pitch: PITCH, overhang: OH, seams: SEAM })
  hippedRoof(b, ZN, { x: (NWW.x0 + NWW.x1) / 2, z: (NWW.z0 + 2.0) / 2, w: NWW.x1 - NWW.x0, d: 2.0 - NWW.z0, y: EAVE, pitch: PITCH, overhang: OH, seams: SEAM })
  hippedRoof(b, ZN, { x: (SEW.x0 + SEW.x1) / 2, z: (SEW.z0 + 2.0) / 2, w: SEW.x1 - SEW.x0, d: 2.0 - SEW.z0, y: EAVE, pitch: PITCH, overhang: OH, seams: SEAM })
  // pavilion: gabled roof running back from the pediment into the main roof
  {
    const t = Math.tan((24 * Math.PI) / 180)
    const hw = PAV + 0.4
    const y0 = EAVE + 0.4
    const ridge = y0 + hw * t
    const z1 = ZP + 0.4
    const z0 = 3.0
    facet(b, ZN, [V(-hw, y0, z1), V(-hw, y0, z0), V(0, ridge, z0), V(0, ridge, z1)], { seams: SEAM, thickness: 0.1 })
    facet(b, ZN, [V(hw, y0, z0), V(hw, y0, z1), V(0, ridge, z1), V(0, ridge, z0)], { seams: SEAM, thickness: 0.1 })
    b.beam(ZN, V(0, ridge + 0.05, z0), V(0, ridge + 0.05, z1), 0.24, 0.14)
    b.block(REN, 2 * hw, 0.4, z1 - z0, 0, EAVE, (z0 + z1) / 2)
    // rear gable end
    const tri = new THREE.Shape([new THREE.Vector2(-hw, y0 - 0.01), new THREE.Vector2(hw, y0 - 0.01), new THREE.Vector2(0, ridge - 0.05)])
    b.add(REN, new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), mat(0, 0, z0))
  }
  // eave gutters (front)
  {
    const t = Math.tan((PITCH * Math.PI) / 180)
    const ey = EAVE - OH * t - 0.05
    for (const [a, c] of [
      [V(X0 - OH, ey, ZF + OH), V(-PAV - 0.6, ey, ZF + OH)],
      [V(PAV + 0.6, ey, ZF + OH), V(X1 + OH, ey, ZF + OH)],
    ] as [THREE.Vector3, THREE.Vector3][])
      b.beam(ZN, a, c, 0.22, 0.2)
  }
  // roof vents / chimney stacks (photo 02)
  for (const x of [-12.5, 12.5]) {
    b.block(REN, 1.0, 2.4, 1.0, x, EAVE + 1.2, 6.0)
    b.add(ZN, new THREE.ConeGeometry(0.85, 0.7, 4), mat(x, EAVE + 3.95, 6.0, Math.PI / 4))
  }
  // zinc downpipes on the façade
  for (const x of [-PAV - 0.45, PAV + 0.45, X0 + 0.4, X1 - 0.4]) b.rod(ZN, V(x, 0.4, ZF + 0.18), V(x, EAVE - 0.4, ZF + 0.18), 0.07, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-12, 16.5, 6],
  materials: () => ({
    muzRender: new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.9 }),
    muzTrim: new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.8 }),
    muzStone: new THREE.MeshStandardMaterial({ color: '#d8d0bf', roughness: 0.9 }),
    muzFrame: new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.6 }),
    muzShade: new THREE.MeshStandardMaterial({ color: '#5c5a57', roughness: 0.95 }),
    muzLetters: new THREE.MeshStandardMaterial({ color: '#3a3833', roughness: 0.6 }),
    muzRelief: new THREE.MeshStandardMaterial({ color: '#e7e1d3', roughness: 0.85 }),
    muzBronze: new THREE.MeshStandardMaterial({ color: '#5d5040', roughness: 0.5, metalness: 0.6 }),
  }),
  notes:
    'Neoclassical former Administrative Palace (U-plan): rusticated ground floor with arched windows, upper colonnade, pedimented central pavilion with entrance arcade; low hipped roofs in natural titanium-zinc standing seam (roof geometry interpreted, hardly visible in the photographs).',
}
export default model
