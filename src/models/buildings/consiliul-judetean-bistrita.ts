/**
 * Consiliul Județean Bistrița-Năsăud — Palatul Administrativ, Piața Petru
 * Rareș 1, Bistrița. MASSING MODEL (tier D): no photograph of the building
 * could be found.
 *
 * Basis (real metres):
 *  - Outline: the large unnamed OSM building way 518233004 on the north-east
 *    side of Piața Petru Rareș, next to nr. 1A — the most likely outline of
 *    the palace, but the identification is not confirmed. In the model frame
 *    (+X = azimuth 140.4°, +Z = 230.4° = towards the square): a 70.2 m wing
 *    along the square (13.6 m deep), a corner pavilion at the north-west end
 *    projecting 6.8 m towards the square, a 33 m rear wing at the same end and
 *    a small courtyard projection at the south-east end.
 *  - Height: the façade carried a 37 × 16 m flag in 2018, so it is at least
 *    ≈ 17 m high; drawn as ground floor + four storeys (eave 18 m) for the
 *    square wing and the pavilion, 15 m for the rear wing (assumed).
 *  - Roofs: the aerial imagery shows hipped pitched roofs over all wings
 *    (pitch ≈ 30° assumed).
 *  - COLOR METAL titanium-zinc (register 2022, elZinc Slate band with clips
 *    and ventilation mat, i.e. a standing-seam roof): no photograph of the
 *    works exists, so all roofs are shown in elZinc Slate standing seam
 *    (zincSlate, pans 0.5 m).
 * Everything else — façade rhythm, storey heights, entrances, materials of
 * the walls — is generic typology and not documented.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, hippedRoof, seams, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

const ZS = 'zincSlate'
const SEAM = seams(ZS, 0.5, 0.05, 0.045)
const PITCH = 30

interface Block {
  x0: number
  x1: number
  z0: number
  z1: number
  h: number
}

const FRONT: Block = { x0: -18.0, x1: 35.1, z0: 6.5, z1: 20.1, h: 18.0 }
const PAV: Block = { x0: -35.1, x1: -18.0, z0: -1.0, z1: 26.9, h: 19.0 }
const REAR: Block = { x0: -33.4, x1: -19.6, z0: -26.9, z1: -1.0, h: 15.0 }
const COURT: Block = { x0: 16.4, x1: 27.8, z0: 1.5, z1: 6.5, h: 10.0 }

function walls(b: Builder, k: Block) {
  const w = k.x1 - k.x0
  const d = k.z1 - k.z0
  const cx = (k.x0 + k.x1) / 2
  const cz = (k.z0 + k.z1) / 2
  b.block('bnWall', w, k.h, d, cx, 0, cz)
  b.block('bnSocle', w + 0.12, 1.0, d + 0.12, cx, 0, cz)
  b.block('bnBand', w + 0.3, 0.35, d + 0.3, cx, 4.2, cz)
  b.block('bnBand', w + 0.5, 0.4, d + 0.5, cx, k.h - 0.4, cz)
}

/** Window grid on the four faces of a block (floors from 4.6 m, 3.4 m apart). */
function windows(b: Builder, k: Block, skip: string[] = []) {
  const floors: number[] = []
  for (let y = 5.3; y < k.h - 2.5; y += 3.4) floors.push(y)
  const ground = 1.6
  const faces: [string, number, number, number, number][] = [
    ['+z', k.x0, k.x1, k.z1, 1],
    ['-z', k.x0, k.x1, k.z0, -1],
    ['+x', k.z0, k.z1, k.x1, 1],
    ['-x', k.z0, k.z1, k.x0, -1],
  ]
  for (const [f, a0, a1, plane, s] of faces) {
    if (skip.includes(f)) continue
    const n = Math.floor((a1 - a0 - 2) / 3.2)
    for (let i = 0; i < n; i++) {
      const a = a0 + 1 + (i + 0.5) * ((a1 - a0 - 2) / n)
      for (const y of [ground, ...floors]) {
        const h = y === ground ? 2.4 : 1.9
        const w = 1.5
        if (f.endsWith('z')) b.add('glassC', metricBox(w, h, 0.06), mat(a, y + h / 2, plane + s * 0.03))
        else b.add('glassC', metricBox(0.06, h, w), mat(plane + s * 0.03, y + h / 2, a))
      }
    }
  }
}

function roof(b: Builder, k: Block, ov = 0.6) {
  hippedRoof(b, ZS, { x: (k.x0 + k.x1) / 2, z: (k.z0 + k.z1) / 2, w: k.x1 - k.x0, d: k.z1 - k.z0, y: k.h, pitch: PITCH, overhang: ov, seams: SEAM })
  const t = Math.tan((PITCH * Math.PI) / 180)
  const ey = k.h - ov * t - 0.06
  const c = [V(k.x0 - ov, ey, k.z0 - ov), V(k.x1 + ov, ey, k.z0 - ov), V(k.x1 + ov, ey, k.z1 + ov), V(k.x0 - ov, ey, k.z1 + ov)]
  for (let i = 0; i < 4; i++) b.beam(ZS, c[i], c[(i + 1) % 4], 0.2, 0.18)
}

function build(): Builder {
  const b = new Builder()
  for (const k of [FRONT, PAV, REAR]) walls(b, k)
  walls(b, COURT)
  windows(b, FRONT, ['-x'])
  windows(b, PAV, [])
  windows(b, REAR, ['+z'])
  windows(b, COURT, ['+z'])
  // main entrance in the middle of the square façade: recessed portal + canopy
  {
    const x = 8.5
    const z = FRONT.z1
    b.add('bnDark', metricBox(6.0, 3.6, 0.1), mat(x, 1.8, z + 0.06))
    b.block('bnBand', 8.0, 0.4, 2.6, x, 4.0, z + 1.3)
    for (let i = 0; i < 3; i++) b.block('bnSocle', 7.0 - i * 0.5, 0.17, 0.35, x, i * 0.17, z + 1.9 - i * 0.35)
  }
  // flat roof over the small courtyard projection
  prismOutline(b, ZS, [
    [COURT.x0 - 0.2, COURT.z0 - 0.2],
    [COURT.x1 + 0.2, COURT.z0 - 0.2],
    [COURT.x1 + 0.2, COURT.z1],
    [COURT.x0 - 0.2, COURT.z1],
  ], COURT.h, 0.12)
  // roofs (titanium-zinc standing seam)
  roof(b, FRONT)
  roof(b, PAV)
  roof(b, REAR)
  // flagpoles on the square façade
  for (const x of [5.0, 12.0]) b.rod('bnDark', V(x, FRONT.h - 4.2, FRONT.z1 + 0.3), V(x + 0.0, FRONT.h - 1.5, FRONT.z1 + 1.6), 0.04, 6)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [10.0, 21.0, 12.0],
  materials: () => ({
    bnWall: new THREE.MeshStandardMaterial({ color: '#e4ddcf', roughness: 0.9 }),
    bnBand: new THREE.MeshStandardMaterial({ color: '#cfc7b6', roughness: 0.88 }),
    bnSocle: new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9 }),
    bnDark: new THREE.MeshStandardMaterial({ color: '#3a3c3f', roughness: 0.6 }),
  }),
  notes:
    'Massing model only: no photograph found; outline = most likely OSM building on Piața Petru Rareș (unconfirmed), heights assumed; roofs shown in elZinc Slate titanium-zinc per the register.',
}
export default model
