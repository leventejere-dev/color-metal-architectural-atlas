/**
 * Auto Schunn Arad — Mercedes-Benz showroom and service (Calea Radnei 247,
 * OSM way 200648403).
 *
 * Modelling specification (real metres; +X = OSM long axis 107.3°, +Z =
 * 197.3° = the front towards Calea Radnei):
 *  - Footprint after the coarse 4-node OSM outline: 71.0 × 44.7 m single
 *    high hall with a flat roof covered by PV panels (aerial view noted in
 *    the research record).
 *  - Showroom in the front-left (−X/+Z) corner (photos 01, 02): ≈37.5 m
 *    long glass curtain wall with slim mullions every ≈2.5 m and a transom,
 *    glazed entrance vestibule, slender two-tone columns, and the
 *    corporate thin cantilevered canopy roof — light silver fascia, soffit
 *    with downlights — projecting ≈3 m in front and ≈6.5 m past the glazed
 *    corner; the rest of the front and the workshop hall in dark grey
 *    façade panels with service doors; company lettering on the fascia.
 *  - Heights estimated from people and cars in the photos: glass ≈8 m,
 *    canopy edge ≈8.4–9.2 m, hall parapet ≈8.8 m.
 *  - COLOR METAL copper (2021, per its records): no copper is visible in
 *    the available photographs and its location is not documented. It is
 *    shown where it plausibly goes on such a building — the parapet copings
 *    and roof-edge flashings and the cap of the showroom canopy — in the
 *    weathered brown tone; this placement is an interpretation.
 * Approximations: plan subdivision (showroom / workshop), rear and side
 * elevations, door positions and PV layout are interpreted; heights estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const HW = 35.5
const HD = 22.35
const SR = { x0: -HW, x1: 2.0, z0: 6.0, z1: HD } // showroom
const GLASS_H = 8.0
const PAR = 8.8

function build(): Builder {
  const b = new Builder()

  /* ================= hall (dark panels) ================= */
  // workshop body: everything except the glazed showroom box
  b.block('asPanel', 2 * HW, PAR, SR.z0 + HD, 0, 0, (-HD + SR.z0) / 2)
  b.block('asPanel', HW - SR.x1, PAR, HD - SR.z0, (SR.x1 + HW) / 2, 0, (SR.z0 + HD) / 2)
  b.block('asPlinth', 2 * HW + 0.1, 0.4, 2 * HD + 0.1, 0, 0, 0)
  // panel joints (horizontal) on the long elevations
  for (const y of [2.8, 5.6]) {
    b.block('asJoint', 2 * HW + 0.04, 0.05, 0.04, 0, y, -HD - 0.02)
    b.block('asJoint', HW - SR.x1, 0.05, 0.04, (SR.x1 + HW) / 2, y, HD + 0.02)
    b.block('asJoint', 0.04, 0.05, 2 * HD, HW + 0.02, y, 0)
    b.block('asJoint', 0.04, 0.05, SR.z0 + HD, -HW - 0.02, y, (-HD + SR.z0) / 2)
  }
  // service doors (sectional doors) on the +X end and rear, front service reception
  for (const z of [-15, -7.5, 0, 7.5]) b.block('asDoor', 0.06, 4.6, 4.6, HW + 0.03, 0.3, z)
  for (const x of [-24, -16, 14, 22]) b.block('asDoor', 4.6, 4.6, 0.06, x, 0.3, -HD - 0.03)
  b.block('glassC', 9.0, 3.2, 0.06, 18.0, 0.4, HD + 0.03)
  b.block('asDoor', 4.8, 4.6, 0.06, 28.5, 0.3, HD + 0.03)
  // ribbon windows high up on the workshop
  b.block('glassC', 50, 1.0, 0.05, 0, 6.3, -HD - 0.03)
  b.block('glassC', 0.05, 1.0, 30, HW + 0.03, 6.3, -4)

  /* ================= showroom (glass box) ================= */
  {
    const w = SR.x1 - SR.x0
    const d = SR.z1 - SR.z0
    const cx = (SR.x0 + SR.x1) / 2
    const cz = (SR.z0 + SR.z1) / 2
    b.block('asFloor', w, 0.35, d, cx, 0, cz)
    // glazing on the front (+Z) and the side (−X)
    b.block('glassG', w, GLASS_H - 0.4, 0.06, cx, 0.35, SR.z1 - 0.05)
    b.block('glassG', 0.06, GLASS_H - 0.4, d, SR.x0 + 0.05, 0.35, cz)
    // interior back wall (visible through the glass)
    b.block('asInterior', w, GLASS_H, 0.2, cx, 0, SR.z0 + 0.1)
    b.block('asInterior', 0.2, GLASS_H, d, SR.x1 - 0.1, 0, cz)
    // mullions + transoms
    const mull = (a: THREE.Vector3, c: THREE.Vector3, n: number) => {
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(c, i / n)
        b.add('asMullion', metricBox(0.12, GLASS_H - 0.35, 0.18), mat(p.x, 0.35 + (GLASS_H - 0.35) / 2, p.z))
      }
      for (const y of [0.45, 3.4, 6.2, GLASS_H - 0.1]) b.beam('asMullion', a.clone().setY(y), c.clone().setY(y), 0.18, 0.12)
    }
    mull(V(SR.x0, 0, SR.z1), V(SR.x1, 0, SR.z1), 15)
    mull(V(SR.x0, 0, SR.z0), V(SR.x0, 0, SR.z1), 6)
    // glazed entrance vestibule
    b.block('glassG', 4.2, 3.2, 2.2, -12, 0.35, SR.z1 + 1.1)
    b.block('asMullion', 4.4, 0.2, 2.4, -12, 3.55, SR.z1 + 1.1)
    // upper fascia of the showroom (dark) and the spandrel above the glass
    b.block('asPanel', w, PAR - GLASS_H, d, cx, GLASS_H, cz)
  }

  /* ================= cantilevered canopy roof ================= */
  {
    const x0 = SR.x0 - 6.5
    const x1 = SR.x1 + 6.0
    const z0 = SR.z0 - 0.5
    const z1 = SR.z1 + 3.2
    const y0 = 8.4
    const t = 0.8
    // slab (soffit light) with a sloped prow at the corner
    const s = new THREE.Shape([
      new THREE.Vector2(x0 + 4.0, -z0),
      new THREE.Vector2(x1, -z0),
      new THREE.Vector2(x1, -z1),
      new THREE.Vector2(x0, -z1),
      new THREE.Vector2(x0, -(z1 - 6.5)),
    ])
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false })
    b.add('asSoffit', g, new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, y0, 0)))
    // roof membrane on top of the canopy (grey), soffit stays light
    const top = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false })
    b.add('asRoof', top, new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, y0 + t + 0.005, 0)))
    // silver fascia band around the canopy edge
    const pts = [V(x0 + 4.0, 0, z0), V(x1, 0, z0), V(x1, 0, z1), V(x0, 0, z1), V(x0, 0, z1 - 6.5)]
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if (i === 0) continue
      b.beam('aluNatural', a.clone().setY(y0 + t / 2), c.clone().setY(y0 + t / 2), 0.08, t + 0.1)
      // copper cap flashing on the canopy edge (interpretation)
      b.beam(CU, a.clone().setY(y0 + t + 0.06), c.clone().setY(y0 + t + 0.06), 0.42, 0.08)
    }
    // downlights in the soffit
    for (let x = x0 + 2.5; x < x1 - 1; x += 4.0) {
      for (const z of [z1 - 1.4]) b.add('asLamp', new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), mat(x, y0 - 0.02, z))
    }
    // slender two-tone columns under the projecting corner (photo 02)
    for (const [x, z] of [
      [x0 + 1.4, z1 - 1.4],
      [x0 + 1.4, z1 - 5.2],
      [SR.x0 + 4.0, z1 - 1.0],
    ]) {
      b.add('asColumn', new THREE.CylinderGeometry(0.2, 0.2, 5.0, 12), mat(x, 2.5, z))
      b.add('asMullion', new THREE.CylinderGeometry(0.2, 0.2, y0 - 5.0, 12), mat(x, 5.0 + (y0 - 5.0) / 2, z))
    }
    // company lettering on the fascia (simplified as raised bars)
    b.block('asLetters', 9.5, 0.55, 0.06, x0 + 14, y0 + 0.12, z1 + 0.06)
  }

  /* ================= roof: membrane, PV rows, copper copings ================= */
  b.block('asRoof', 2 * HW - 0.8, 0.1, 2 * HD - 0.8, 0, PAR - 0.5, 0)
  {
    // PV rows (tilted modules) on the workshop roof
    for (let z = -HD + 2.5; z < SR.z0 - 2; z += 2.6) {
      for (const [xa, xb] of [
        [-HW + 2, -2],
        [2, HW - 2],
      ]) {
        const L = xb - xa
        b.add('asPV', metricBox(L, 0.05, 1.7), mat((xa + xb) / 2, PAR - 0.05, z, 0, 0.18))
        b.add('asJoint', metricBox(L, 0.3, 0.06), mat((xa + xb) / 2, PAR - 0.3, z - 0.75))
      }
    }
    // copper parapet copings around the hall (interpretation, see header)
    const c = 0.55
    const y = PAR
    b.block(CU, 2 * HW + 0.3, 0.1, c, 0, y, -HD - 0.15 + c / 2)
    b.block(CU, HW - SR.x1 + 0.15, 0.1, c, (SR.x1 + HW) / 2 + 0.07, y, HD + 0.15 - c / 2)
    b.block(CU, c, 0.1, 2 * HD + 0.3, HW + 0.15 - c / 2, y, 0)
    b.block(CU, c, 0.1, SR.z0 + HD + 0.3, -HW - 0.15 + c / 2, y, (-HD + SR.z0) / 2)
    // drip edges of the copings
    b.block(CU, 2 * HW + 0.3, 0.3, 0.04, 0, y - 0.25, -HD - 0.15)
    b.block(CU, 0.04, 0.3, 2 * HD + 0.3, HW + 0.15, y - 0.25, 0)
    // copper downpipes on the rear and side (interpretation)
    for (const x of [-30, -10, 10, 30]) b.rod(CU, V(x, 0.3, -HD - 0.15), V(x, PAR - 0.2, -HD - 0.15), 0.07, 8)
    for (const z of [-18, 4]) b.rod(CU, V(HW + 0.15, 0.3, z), V(HW + 0.15, PAR - 0.2, z), 0.07, 8)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [HW - 2, 8.9, -HD + 2],
  materials: () => {
    const std = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1d0', emissiveIntensity: 0.8 })
    return {
      asPanel: std('#4a4e53', 0.55, 0.25),
      asJoint: std('#33363a', 0.6),
      asPlinth: std('#8f8f8c', 0.9),
      asDoor: std('#6b7076', 0.5, 0.3),
      asFloor: std('#b9b7b2', 0.6),
      asInterior: std('#d9d6d0', 0.8),
      asMullion: std('#2c2f33', 0.45, 0.4),
      asSoffit: std('#e9e9e6', 0.6),
      asColumn: std('#d8d9da', 0.4, 0.4),
      asLamp: lamp,
      asLetters: std('#2a5db0', 0.5),
      asRoof: std('#7a7c7e', 0.95),
      asPV: std('#1f2a3a', 0.25, 0.4),
    }
  },
  notes:
    'Mercedes-Benz showroom and service hall: glass showroom with a thin cantilevered canopy, dark-panel workshop and PV roof; the COLOR METAL copper is not visible in the photos and is shown, as an interpretation, on the parapet copings, canopy cap and downpipes.',
}
export default model
