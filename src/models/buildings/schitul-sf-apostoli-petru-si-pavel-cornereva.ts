/**
 * Skete «Sfinții Apostoli Petru și Pavel», Bogâltin (comuna Cornereva,
 * Caraș-Severin) — church built 1949–1959 (Episcopia Caransebeșului).
 *
 * MASSING MODEL (tier D). No exterior photograph of the skete church could be
 * found: the diocese's press galleries of 2019–2026 show only its interior (a
 * low painted nave with timber posts and small timber windows), the open
 * summer altar with its wooden bell turret, the white cell building and the
 * small paraclis blessed in June 2026. The skete is not mapped in OSM and
 * its position in the valley is not published.
 *
 * Specification (real metres, +X = assumed liturgical east):
 *  - small single-nave mountain church of the regional type: nave 10.5 ×
 *    6.6 m, eaves 4.2 m, polygonal altar apse (half hexagon, 2.6 m apothem),
 *    plain white rendered walls on a stone plinth, a west door under a small
 *    canopy, two small windows per side and one in the apse;
 *  - gable roof (42°) with a hipped apse end, 0.6 m eaves.
 *  - METAL: COLOR METAL supplied copper in 2022 according to its
 *    records; where it was used is not documented, so the roof is shown in
 *    weathered copper ('copperBrown', standing seams ≈ 0.5 m).
 * Everything except the materials is assumed from the building type.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, faceFrame, cross, seams } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

const XW = -6.6
const XE = 3.9 // nave east end
const HW = 3.3
const AAP = 2.6 // apse apothem
const EAVE = 4.2
const PITCH = 42 * D2R
const T = Math.tan(PITCH)
const OV = 0.6
const RIDGE = EAVE + HW * T
const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.04)

function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', w, h, 0, y0))), M(m, mat(0, 0, 0.03)))
  b.add('bogFrame', extrude(frameShape('rect', w, h, 0.08, 0, y0), 0.06), m)
}

function build(): Builder {
  const b = new Builder()
  // nave
  b.block('plasterWhite', XE - XW, EAVE, HW * 2, (XW + XE) / 2, 0, 0)
  b.block('stoneGrey', XE - XW + 0.14, 0.45, HW * 2 + 0.14, (XW + XE) / 2, 0, 0)
  // apse: half hexagon (apothem AAP) on the east wall
  const R = AAP / Math.cos(Math.PI / 6)
  // regular half hexagon with vertices at −90°, −30°, 30°, 90° around (XE, 0)
  const hex: [number, number][] = [-90, -30, 30, 90].map((a) => [XE + R * Math.cos(a * D2R), R * Math.sin(a * D2R)] as [number, number])
  {
    const s = new THREE.Shape(hex.map(([x, z]) => new THREE.Vector2(x, -z)))
    b.add('plasterWhite', extrude(s, EAVE), new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    const s2 = new THREE.Shape(hex.map(([x, z]) => new THREE.Vector2(XE + (x - XE) * 1.03, -z * 1.03)))
    b.add('stoneGrey', extrude(s2, 0.45), new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    // axial window
    win(b, faceFrame('+x', XE + AAP, 0), 0.5, 0.9, 2.0)
  }
  // side windows
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    for (const x of [-3.6, 0.6]) win(b, faceFrame(face, s * HW, s > 0 ? x : -x), 0.7, 1.1, 1.9)
  }
  // west door with a small canopy
  {
    const m = faceFrame('-x', XW, 0)
    b.add('bogDoor', metricBox(1.1, 2.15, 0.06), M(m, mat(0, 0.45 + 1.075, 0.03)))
    b.add('bogFrame', extrude(frameShape('rect', 1.1, 2.15, 0.1, 0, 0.45), 0.06), m)
    win(b, m, 0.5, 0.7, 3.0)
    // canopy
    const y = 3.05
    facet(b, CU, [V(XW - 1.0, y, -0.95), V(XW - 1.0, y, 0.95), V(XW, y + 0.55, 0.95), V(XW, y + 0.55, -0.95)], { seams: SEAM, thickness: 0.06 })
    for (const sz of [-0.8, 0.8]) b.beam('bogFrame', V(XW, y - 0.9, sz), V(XW - 0.9, y - 0.05, sz), 0.1, 0.1, V(0, 0, 1))
    b.block('stoneGrey', 1.8, 0.2, 1.2, XW - 0.6, 0, 0)
  }

  /* roof: gable over the nave, hipped half-hexagon over the apse */
  {
    const ye = EAVE - OV * T
    const he = HW + OV
    const xa = XW - 0.35
    const xb = XE + 0.35
    facet(b, CU, [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(xb, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, V(xa, RIDGE + 0.05, 0), V(xb, RIDGE + 0.05, 0), 0.2, 0.1)
    // gable walls (west front; east gable above the apse roof)
    const g = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.01), new THREE.Vector2(HW, EAVE - 0.01), new THREE.Vector2(0, RIDGE - 0.06)])
    b.add('plasterWhite', extrude(g, 0.3), mat(XW, 0, 0, Math.PI / 2))
    b.add('plasterWhite', extrude(g, 0.3), mat(XE, 0, 0, -Math.PI / 2))
    for (const x of [xa, xb]) for (const sz of [-1, 1]) b.beam(CU, V(x, ye, sz * he), V(x, RIDGE + 0.04, 0), 0.08, 0.26, V(-1, 0, 0))
    // apse hip: apex on the ridge line above the hexagon centre
    const Ro = (AAP + OV) / Math.cos(Math.PI / 6)
    const apex = V(XE, ye + (AAP + OV) * T, 0)
    const ring = [-90, -30, 30, 90].map((a) => V(XE + Ro * Math.cos(a * D2R), ye, Ro * Math.sin(a * D2R)))
    for (let i = 0; i < 3; i++) facet(b, CU, [ring[i], ring[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    for (let i = 1; i < 3; i++) b.beam(CU, ring[i].clone().add(V(0, 0.04, 0)), apex.clone().add(V(0, 0.04, 0)), 0.14, 0.08)
    // gutters
    for (const sz of [-1, 1]) b.rod(CU, V(xa, ye - 0.08, sz * (he + 0.06)), V(xb, ye - 0.08, sz * (he + 0.06)), 0.06, 8)
    cross(b, 'iron', xa + 0.2, RIDGE + 0.05, 0, 1.2, true, Math.PI / 2)
  }
  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1.5, 5.6, 2.2],
  materials: () => ({
    bogFrame: new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.7 }),
    bogDoor: new THREE.MeshStandardMaterial({ color: '#8a5d38', roughness: 0.7 }),
  }),
  notes: 'Massing model only: no exterior photograph of the skete church was found; size, form and orientation are assumed from the building type. Roof shown in the copper supplied by COLOR METAL according to its records.',
}
export default model
