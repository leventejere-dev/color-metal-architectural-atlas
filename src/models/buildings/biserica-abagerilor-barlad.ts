/**
 * Biserica „Sf. Gheorghe” a breslei abagerilor, Bârlad (Str. Popa Șapcă 11, OSM way
 * 226737067) — church with three slender sheet-clad towers; roofs, tower cladding and
 * caps shown in copper (copper roofing, gutters and snow guards supplied by COLOR METAL
 * according to its records; the reference photographs predate the works).
 *
 * Modelling specification (real metres; origin = outline centre at ground):
 *  - Axis: crude 4-node OSM rectangle 28.8 × 13.8 m at 95.5°; +X points east to the
 *    altar apse, the west front at −X, +Z = 185.5° (south).
 *  - Only two street photos exist (2011, 2013), both taken from beside the separate
 *    gate tower, showing the long south wall and the towers over the roof (photo 01)
 *    and two of the towers (photo 02). The tower arrangement is read as two west
 *    towers over the pronaos (the far one smaller in 01/02) and a larger naos tower,
 *    as in the research record.
 *  - Body: nave 23.8 × 12.4 m (the crude outline width 13.8 includes the eaves) and a
 *    semicircular altar apse (r ≈ 5 m); walls ≈ 6.6 m, white plaster on a low socle,
 *    a continuous blind arcade of tall round-arched niches under the cornice,
 *    round-arched windows set in some niches, west portal (interpreted).
 *  - Low hipped roof (≈ 22°) with a half-cone over the apse; standing seams, eave
 *    gutters with downpipes and a snow-guard rail.
 *  - Towers: white square bases with blind arches standing on the roof, octagonal
 *    sheet-clad shafts with small windows, flared octagonal bell caps, slim lanterns
 *    with a pointed knob and iron crosses (west ≈ 18.6 m, naos ≈ 20.2 m).
 * Heights estimated from photo 01 (tower shaft ≈ 3 m as scale). Approximations: the
 * west front, north side and east end are not photographed (interpreted, mirrored);
 * tower positions and the plan are interpretations; the separate gate bell tower is
 * not modelled. Which surfaces were re-covered is not itemised: the roofs, tower
 * shafts and caps are all shown in copper.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, polyRing, helm, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'baWall'
const DECO = 'baDeco'
const SEAM = seams(CU, 0.55, 0.05, 0.045)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const at = (x: number, z: number, a: number) => mat(x, 0, z, Math.atan2(Math.cos(a), Math.sin(a)))

/* plan */
const X0 = -14.4
const XA = 9.4 // apse centre / end of the nave walls
const RA = 5.0
const HW = 6.2

/* heights */
const SOCLE = 0.5
const H = 6.6
const PITCH = 22
const T = Math.tan(PITCH * D2R)
const OV = 0.6
const LIFT = 0.22
const EAVE = H + LIFT - OV * T
const RIDGE = EAVE + (HW + OV) * T

function outline(y: number, g = 0): THREE.Vector3[] {
  const p: THREE.Vector3[] = []
  const n = 14
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    p.push(V(XA + Math.cos(a) * (RA + g), y, Math.sin(a) * (RA + g)))
  }
  p.push(V(XA + g * 0, y, HW + g), V(X0 - g, y, HW + g), V(X0 - g, y, -HW - g), V(XA, y, -HW - g))
  return p
}

/** Tower: square white base with blind arches, octagonal clad shaft, bell cap, lantern, cross. */
function tower(b: Builder, cx: number, cz: number, s: number, yBase: number, shaftH: number) {
  const bw = 1.9 * s // half width of the base
  const ap = 1.45 * s // shaft apothem
  const k = 1 / Math.cos(Math.PI / 8)
  const yB1 = yBase + 1.3 * s
  b.block(WALL, 2 * bw, yB1 - yBase + 1.0, 2 * bw, cx, yBase - 1.0, cz)
  b.block(DECO, 2 * bw + 0.24, 0.22, 2 * bw + 0.24, cx, yB1 - 0.22, cz)
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const m = at(cx + nx * bw, cz + nz * bw, Math.atan2(nz, nx))
    for (const u of [-bw * 0.5, 0, bw * 0.5]) b.add('baShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.45 * s, 0.95 * s, u, yB1 - 1.35 * s, 8))), M(m, mat(0, 0, 0.02)))
  }
  // octagonal sheet-clad shaft with small windows
  const y1 = yB1 + shaftH
  b.add(CU, loft([polyRing(8, ap * k, yB1, Math.PI / 8, cx, cz), polyRing(8, ap * k, y1, Math.PI / 8, cx, cz)], { capTop: true, flat: true }))
  // horizontal sheet courses (shingle cladding)
  for (let y = yB1 + 0.35; y < y1 - 0.1; y += 0.34) {
    const r = polyRing(8, ap * k + 0.012, y, Math.PI / 8, cx, cz)
    for (let j = 0; j < 8; j++) b.beam(CU, r[j], r[(j + 1) % 8], 0.025, 0.02)
  }
  const corners = polyRing(8, ap * k + 0.015, 0, Math.PI / 8, cx, cz)
  for (const c of corners) b.beam(CU, V(c.x, yB1, c.z), V(c.x, y1, c.z), 0.06, 0.06)
  for (let j = 0; j < 8; j += 2) {
    const a = (j / 8) * Math.PI * 2 + Math.PI / 4
    const m = at(cx + Math.cos(a) * ap, cz + Math.sin(a) * ap, a)
    b.add('glassC', metricBox(0.42 * s, 0.85 * s, 0.03), M(m, mat(0, yB1 + shaftH * 0.48, 0.02)))
    b.add('baFrame', extrude(frameShape('rect', 0.42 * s, 0.85 * s, 0.07, 0, yB1 + shaftH * 0.48 - 0.42 * s), 0.05), m)
  }
  // cornice ring
  b.add(CU, loft([polyRing(8, (ap + 0.05) * k, y1 - 0.15, Math.PI / 8, cx, cz), polyRing(8, (ap + 0.3) * k, y1 + 0.02, Math.PI / 8, cx, cz), polyRing(8, (ap + 0.3) * k, y1 + 0.12, Math.PI / 8, cx, cz)], { capTop: true, capBottom: true, flat: true }))
  // flared octagonal bell cap (pinched waist, bulging shoulder)
  const yc = y1 + 0.12
  const st = (r: number, y: number) => [r * k * s, yc + y * s] as [number, number]
  const cap = [st(1.78, 0), st(1.72, 0.12), st(1.5, 0.32), st(1.62, 0.62), st(1.6, 0.9), st(1.32, 1.22), st(0.82, 1.48), st(0.36, 1.62)]
  helm(b, CU, { x: cx, z: cz, n: 8, stations: cap })
  for (let i = 0; i < cap.length - 1; i++) {
    const r0 = polyRing(8, cap[i][0] + 0.02, cap[i][1], Math.PI / 8, cx, cz)
    const r1 = polyRing(8, cap[i + 1][0] + 0.02, cap[i + 1][1], Math.PI / 8, cx, cz)
    for (let j = 0; j < 8; j++) b.beam(CU, r0[j], r1[j], 0.05, 0.05)
  }
  // slim lantern: neck, small bulb, pointed knob
  helm(b, CU, { x: cx, z: cz, n: 8, stations: [st(0.36, 1.62), st(0.26, 1.75), st(0.26, 2.15), st(0.42, 2.3), st(0.44, 2.5), st(0.3, 2.68), st(0.12, 2.95), st(0.05, 3.25)] })
  b.add(CU, new THREE.SphereGeometry(0.12 * s, 10, 8), mat(cx, yc + 3.3 * s, cz))
  cross(b, 'baCross', cx, yc + 3.35 * s, cz, 1.3 * s, false, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  b.add(WALL, loft([outline(0), outline(H)], { capTop: true }))
  b.add('baSocle', loft([outline(0, 0.08), outline(SOCLE, 0.08)], { capTop: true }))
  b.add(DECO, loft([outline(H - 0.4, 0.05), outline(H - 0.18, 0.18), outline(H, 0.3)], { capTop: true, capBottom: true }))
  b.add(DECO, loft([outline(2.75, 0.04), outline(2.95, 0.04)], { capTop: true, capBottom: true }))

  // blind arcade of tall arched niches under the cornice (photo 01)
  const niche = (m: THREE.Matrix4, win: boolean) => {
    b.add('baShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.85, 3.0, 0, 3.1, 10))), M(m, mat(0, 0, 0.015)))
    b.add(DECO, extrude(frameShape('round', 0.85, 3.0, 0.1, 0, 3.1), 0.06), m)
    if (win) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.7, 1.75, 0, 3.4, 10))), M(m, mat(0, 0, 0.03)))
      for (let i = 1; i < 4; i++) b.add('baFrame', metricBox(0.7, 0.03, 0.03), M(m, mat(0, 3.4 + i * 0.38, 0.05)))
      b.add('baFrame', metricBox(0.03, 1.4, 0.03), M(m, mat(0, 4.1, 0.05)))
    }
  }
  for (const s of [1, -1]) {
    const a = s > 0 ? Math.PI / 2 : -Math.PI / 2
    const n = 17
    for (let i = 0; i < n; i++) {
      const x = X0 + 0.9 + i * ((XA - X0 - 1.5) / (n - 1))
      niche(at(x, s * HW, a), i === 4 || i === 10 || i === 14)
    }
    // lower windows
    for (const x of [-8.5, -1.6, 4.6]) {
      const m = at(x, s * HW, a)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 1.5, 0, 1.0, 10))), M(m, mat(0, 0, 0.02)))
      b.add(DECO, extrude(frameShape('round', 0.75, 1.5, 0.12, 0, 1.0), 0.06), m)
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 9) * Math.PI
    niche(at(XA + Math.cos(a) * RA, Math.sin(a) * RA, a), i === 4)
  }
  // west front: portal and niches (interpreted)
  {
    const m = at(X0, 0, Math.PI)
    for (const u of [-4.6, -3.2, 3.2, 4.6]) niche(M(m, mat(u, 0, 0)), false)
    b.add('baDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 2.8, 0, SOCLE, 12))), M(m, mat(0, 0, 0.03)))
    b.add(DECO, extrude(frameShape('round', 1.5, 2.8, 0.28, 0, SOCLE), 0.14), m)
    b.add('baIcon', metricBox(1.0, 1.2, 0.04), M(m, mat(0, 4.6, 0.04)))
    for (let i = 0; i < 3; i++) b.block('baSocle', 0.4, SOCLE - i * 0.16, 3.0, X0 - 0.2 - i * 0.4, 0, 0)
  }

  /* ================= roof ================= */
  {
    const hw = HW + OV
    const xw = X0 - OV
    const r0 = xw + hw
    const xe = XA
    facet(b, CU, [V(xw, EAVE, hw), V(xe, EAVE, hw), V(xe, RIDGE, 0), V(r0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xe, EAVE, -hw), V(xw, EAVE, -hw), V(r0, RIDGE, 0), V(xe, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xw, EAVE, -hw), V(xw, EAVE, hw), V(r0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(r0, RIDGE + 0.06, 0), V(xe, RIDGE + 0.06, 0), 0.22, 0.1)
    for (const s of [-1, 1]) b.beam(CU, V(xw, EAVE + 0.05, s * hw), V(r0, RIDGE + 0.05, 0), 0.18, 0.08)
    // apse: shoulders + half cone to the ridge end
    const ra = RA + OV
    const apex = V(XA, RIDGE, 0)
    for (const s of [1, -1]) facet(b, CU, [V(XA, EAVE, s * hw), V(XA, EAVE, s * ra), apex], { seams: SEAM, thickness: 0.1 })
    const n = 16
    const arc: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI
      arc.push(V(XA + Math.cos(a) * ra, EAVE, Math.sin(a) * ra))
    }
    for (let i = 0; i < n; i++) facet(b, CU, [arc[i], arc[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    // copper gutters, downpipes and snow-guard rails
    const eo = outline(EAVE - 0.08, OV - 0.05)
    for (let i = 0; i < eo.length; i++) b.beam(CU, eo[i], eo[(i + 1) % eo.length], 0.16, 0.15)
    for (const [x, z] of [[X0 + 0.4, HW + 0.25], [X0 + 0.4, -HW - 0.25], [-3.0, HW + 0.25], [-3.0, -HW - 0.25], [XA - 0.2, HW + 0.25], [XA - 0.2, -HW - 0.25], [XA + RA + 0.25, 0]]) b.rod(CU, V(x, 0.2, z), V(x, EAVE - 0.12, z), 0.06, 8)
    for (const s of [1, -1]) {
      const d = 1.1
      const y = EAVE + d * T + 0.18
      const z = s * (hw - d)
      b.beam(CU, V(xw + d + 0.4, y, z), V(xe, y, z), 0.04, 0.04)
      b.beam(CU, V(xw + d + 0.4, y + 0.12, z), V(xe, y + 0.12, z), 0.04, 0.04)
      for (let x = xw + d + 0.6; x < xe; x += 1.6) b.beam(CU, V(x, y - 0.18, z), V(x, y + 0.14, z), 0.04, 0.04)
    }
  }

  /* ================= towers ================= */
  const roofY = (z: number) => EAVE + (HW + OV - Math.abs(z)) * T
  tower(b, -10.6, 3.2, 1.0, roofY(3.2 - 1.9), 4.0)
  tower(b, -10.6, -3.2, 1.0, roofY(3.2 - 1.9), 4.0)
  tower(b, 2.4, 0, 1.15, RIDGE - 0.3, 4.0)

  return b
}

const model: ModelModule = {
  build,
  front: [-0.45, 0.89],
  materialFocus: [-2.0, 9.6, 3.6],
  materials: () => ({
    baWall: new THREE.MeshStandardMaterial({ color: '#e8e5dc', roughness: 0.9 }),
    baDeco: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.86 }),
    baShadow: new THREE.MeshStandardMaterial({ color: '#d2cec3', roughness: 0.92 }),
    baSocle: new THREE.MeshStandardMaterial({ color: '#b9b3a6', roughness: 0.9 }),
    baFrame: new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.7 }),
    baDoor: new THREE.MeshStandardMaterial({ color: '#5b3d2a', roughness: 0.7 }),
    baIcon: new THREE.MeshStandardMaterial({ color: '#7d6a43', roughness: 0.6 }),
    baCross: new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 0.45, metalness: 0.6 }),
  }),
  notes:
    'Church with two west towers and a naos tower, low hipped roof and apse half-cone; roofs, sheet-clad tower shafts and caps shown in copper with gutters and snow guards; west front, north and east sides interpreted from two street photos.',
}
export default model
