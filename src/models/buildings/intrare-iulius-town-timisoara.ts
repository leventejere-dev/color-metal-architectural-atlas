/**
 * Intrarea Iulius Town / Iulius Mall, Timișoara — the copper-clad entrance.
 *
 * The two reference photographs show one object only: a four-wing revolving
 * door whose drum is clad in copper sheet (Cu-DHP), set into the mall's glazed
 * front under a granite-clad band. Only that copper entrance is modelled, as a
 * free-standing object (the mall itself is excluded). Specification (metres):
 *  - Drum Ø ≈ 2.8 m: two curved copper walls (≈100° each, full door height
 *    2.4 m) facing each other across the passage axis (+X = outside, −X = inside),
 *    dark bronze edge profiles with brush seals.
 *  - Crown: a 0.55 m copper band all round with one horizontal and a few
 *    vertical panel joints, flat top, polished bronze/copper ceiling inside.
 *  - Four glazed door wings on a central post (bronze frames, push bars), a
 *    circular grating floor mat.
 *  - Copper appearance from the photographs: warm brown, a few years old,
 *    with darker streaks (not patinated).
 * Approximations: diameter and heights estimated from the door proportions (no
 * dimensions known); posters on the wings omitted; the position of this
 * entrance on the mall and therefore its compass orientation are unknown.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

const R_OUT = 1.42
const R_IN = 1.35
const H_WALL = 2.4
const H_TOP = 2.95
const WALL_HALF = 50 // degrees, each curved wall spans 2 × 50°

/** Partial cylinder surface (metric UVs), outward or inward facing. */
function cylinder(b: Builder, key: string, r: number, y0: number, y1: number, a0: number, a1: number, seg: number, inward = false) {
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + ((a1 - a0) * i) / seg
    const t1 = a0 + ((a1 - a0) * (i + 1)) / seg
    const p = (t: number, y: number) => [Math.cos(t) * r, y, Math.sin(t) * r]
    const quad = [
      [t0, y0],
      [t1, y0],
      [t1, y1],
      [t0, y0],
      [t1, y1],
      [t0, y1],
    ]
    // outward winding: counter-clockwise seen from outside
    const order = inward ? [0, 1, 2, 3, 4, 5] : [0, 2, 1, 3, 5, 4]
    for (const k of order) {
      const [t, y] = quad[k]
      pos.push(...p(t, y))
      const s = inward ? -1 : 1
      nor.push(Math.cos(t) * s, 0, Math.sin(t) * s)
      uv.push(t * r, y)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)
}

/** Flat annulus / disc at height y (facing up or down). */
function annulus(b: Builder, key: string, r0: number, r1: number, y: number, up: boolean, seg = 64) {
  const g = new THREE.RingGeometry(r0, r1, seg)
  // metric UVs (the sheet texture is tiled in metres)
  const p = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getY(i))
  b.add(key, g, mat(0, y, 0, 0, up ? -Math.PI / 2 : Math.PI / 2))
}

function build(): Builder {
  const b = new Builder()
  const walls: P2[] = [
    [90 - WALL_HALF, 90 + WALL_HALF],
    [270 - WALL_HALF, 270 + WALL_HALF],
  ]
  /* ---------- curved copper walls ---------- */
  for (const [d0, d1] of walls) {
    const a0 = d0 * D2R
    const a1 = d1 * D2R
    cylinder(b, 'copper', R_OUT, 0.02, H_WALL, a0, a1, 28)
    cylinder(b, 'copperBrown', R_IN, 0.02, H_WALL, a0, a1, 28, true)
    // dark bronze edge profiles with brush seals
    for (const a of [a0, a1]) {
      const rm = (R_OUT + R_IN) / 2
      b.add('aluBronze', metricBox(R_OUT - R_IN + 0.04, H_WALL - 0.02, 0.06), mat(Math.cos(a) * rm, (H_WALL + 0.02) / 2, Math.sin(a) * rm, -a))
      b.add('black', metricBox(0.03, H_WALL - 0.1, 0.03), mat(Math.cos(a) * (R_IN - 0.03), H_WALL / 2, Math.sin(a) * (R_IN - 0.03)))
    }
    // vertical panel joints
    for (let k = 1; k < 3; k++) {
      const a = a0 + ((a1 - a0) * k) / 3
      b.add('copperBrown', metricBox(0.012, H_WALL - 0.04, 0.012), mat(Math.cos(a) * (R_OUT + 0.004), H_WALL / 2, Math.sin(a) * (R_OUT + 0.004)))
    }
    // base shoe
    cylinder(b, 'copperBrown', R_OUT + 0.01, 0.0, 0.08, a0, a1, 28)
  }

  /* ---------- crown band, top and ceiling ---------- */
  cylinder(b, 'copper', R_OUT + 0.02, H_WALL, H_TOP, 0, Math.PI * 2, 72)
  cylinder(b, 'copperBrown', R_OUT + 0.025, H_WALL + 0.31, H_WALL + 0.325, 0, Math.PI * 2, 72) // horizontal joint
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26
    b.add('copperBrown', metricBox(0.012, H_TOP - H_WALL - 0.02, 0.012), mat(Math.cos(a) * (R_OUT + 0.025), (H_WALL + H_TOP) / 2, Math.sin(a) * (R_OUT + 0.025)))
  }
  annulus(b, 'copperBrown', 0, R_OUT + 0.02, H_TOP, true)
  annulus(b, 'copperNew', 0, R_OUT + 0.02, H_WALL, false) // polished soffit
  cylinder(b, 'copperBrown', R_IN, H_WALL - 0.06, H_WALL, 0, Math.PI * 2, 72, true)
  // recessed downlights
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    b.add('lamp', new THREE.CircleGeometry(0.06, 12), mat(Math.cos(a) * 0.85, H_WALL - 0.005, Math.sin(a) * 0.85, 0, Math.PI / 2))
  }

  /* ---------- door wings on a central post ---------- */
  b.rod('aluBronze', V(0, 0.02, 0), V(0, H_WALL, 0), 0.07, 16)
  const wl = R_IN - 0.06
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * D2R
    const c = Math.cos(a)
    const s = Math.sin(a)
    const ry = -a
    const at = (u: number, y: number) => mat(c * u, y, s * u, ry)
    // glass
    b.add('glassG', metricBox(wl - 0.12, H_WALL - 0.22, 0.02), at(0.07 + (wl - 0.12) / 2, 0.11 + (H_WALL - 0.22) / 2))
    // bronze frame
    b.add('aluBronze', metricBox(0.06, H_WALL - 0.05, 0.06), at(wl - 0.03, (H_WALL + 0.03) / 2))
    b.add('aluBronze', metricBox(wl - 0.06, 0.1, 0.06), at(0.07 + (wl - 0.06) / 2 - 0.03, 0.08))
    b.add('aluBronze', metricBox(wl - 0.06, 0.06, 0.06), at(0.07 + (wl - 0.06) / 2 - 0.03, H_WALL - 0.06))
    // push bar
    b.add('aluBronze', metricBox(wl - 0.25, 0.04, 0.12), at(0.12 + (wl - 0.25) / 2, 1.05))
    // brush seal at the wing's outer edge
    b.add('black', metricBox(0.03, H_WALL - 0.1, 0.03), at(wl + 0.015, H_WALL / 2))
  }

  /* ---------- circular grating floor mat ---------- */
  annulus(b, 'iron', 0, R_IN, 0.012, true, 48)
  for (let k = -8; k <= 8; k++) {
    const x = k * 0.16
    const half = Math.sqrt(Math.max(0, R_IN * R_IN - x * x))
    if (half < 0.05) continue
    b.add('steel', metricBox(0.025, 0.01, half * 2 - 0.04), mat(x, 0.02, 0))
  }
  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [0, 1.6, 1.4],
  notes: 'Copper-clad revolving door only (the mall is not modelled); dimensions estimated from the photographs; orientation on the mall unknown.',
}
export default model
