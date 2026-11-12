/**
 * Panoramic mountain refuge, Cheile Bicazului-Hășmaș National Park
 * (probably the 2021 Piatra Poienii / Mária-kő cabin; OSM node 9230390942).
 *
 * One web photograph. It matches the PREFA reference "Bivouac" (two
 * mini-shelters by Lukács Manufacture, PREFA DS.19 aluminium shingles in P.10
 * stone grey; "the one above the rocks has large windows"): the photographed
 * cabin is fully clad — walls and roof — in small dark-grey rectangular
 * aluminium shingles (≈ 0.42 × 0.22 m courses with slanted, staggered joints),
 * stands on a timber stilt frame at a limestone cliff edge and has one large
 * window towards the gorge.
 *
 * Modelling specification (real metres; +X = long axis, door end at +X,
 * cantilevered end at −X; +Z = the long side with the window):
 *  - Body ≈ 4.6 m long; flared section: floor 2.2 m wide, walls leaning out to
 *    2.6 m at the eaves (2.0 m above the floor), gable roof ≈ 35° to a ridge
 *    2.9 m above the floor (scaled from the door, ≈ 1.95 m).
 *  - The window side is pleated by two vertical triangular folds (fins) that
 *    rise into small pointed caps above the eave; the large window sits in the
 *    bay between them. Plain door in the uphill end wall.
 *  - Shingle courses and joints drawn as fine relief lines; snow-stop hooks in
 *    two rows on the roof; dark ridge and edge trims.
 *  - Timber platform beams; at the cliff end a trestle of timber legs with
 *    black-painted feet, timber knee braces and X-bracing, a timber step;
 *    black steel posts at the uphill end.
 * Approximations: dimensions are estimates from one perspective photo; the
 * back side is not visible (assumed plain, mirrored section); on the flat
 * presentation base the uphill posts are extended to the ground (the real
 * cabin sits on sloping rock); which of the two park refuges the photo shows
 * is not certain.
 */
import * as THREE from 'three'
import { Builder, V, mat, facet, extrude } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const YF = 2.2 // floor level above the base
const HX = 2.3 // half length of the body
const ZB = 1.1 // half width at the floor
const ZE = 1.3 // half width at the eave
const YE = YF + 2.0 // eave
const YR = YE + ZE * Math.tan(35 * D2R) // ridge
const OH = 0.08 // tiny eave/verge overhang of the shingled roof
const FINS = [-1.22, 0.24] // x of the two folds on the window side
const WIN = { x: -0.5, w: 0.78, y0: YF + 0.45, y1: YF + 1.92 }
const DOOR = { z: 0.15, w: 0.82, h: 1.95 }

/** Wall half-width at height y (flared section). */
const zAt = (y: number) => ZB + ((ZE - ZB) * (y - YF)) / (YE - YF)

type Hole = [number, number, number, number] // u0, u1, v0, v1

/**
 * Shingle relief on a planar face: course lines every 0.22 m along vDir and
 * slanted, staggered joints every 0.42 m; urange(v) gives the face width at v.
 */
function shingles(b: Builder, O: THREE.Vector3, uDir: THREE.Vector3, vDir: THREE.Vector3, n: THREE.Vector3, vMax: number, urange: (v: number) => [number, number], holes: Hole[] = []) {
  const P = (u: number, v: number) => O.clone().addScaledVector(uDir, u).addScaledVector(vDir, v).addScaledVector(n, 0.012)
  const inHole = (u: number, v: number) => holes.some(([a, c, d, e]) => u > a - 0.02 && u < c + 0.02 && v > d - 0.02 && v < e + 0.02)
  const row = 0.22
  let r = 0
  for (let v = row; v < vMax - 0.04; v += row, r++) {
    const [ua, ub] = urange(v)
    // course line, split around holes
    let start: number | null = null
    const ns = Math.max(1, Math.ceil((ub - ua) / 0.1))
    const step = (ub - ua) / ns
    for (let i = 0; i <= ns; i++) {
      const uu = ua + i * step
      const blocked = inHole(uu, v)
      if (!blocked && start === null) start = uu
      if ((blocked || i === ns) && start !== null) {
        const end = blocked ? uu - step : uu
        if (end - start > 0.05) b.beam('shingleJoint', P(start, v), P(end, v), 0.022, 0.016, n)
        start = null
      }
    }
    // slanted vertical joints of the course below this line
    const [la, lb] = urange(v - row / 2)
    const off = r % 2 ? 0.21 : 0
    for (let u = la + 0.3 + off; u < lb - 0.12; u += 0.42) {
      if (inHole(u, v - row / 2)) continue
      b.beam('shingleJoint', P(u, v - row), P(u + 0.07, v), 0.018, 0.014, n)
    }
  }
}

function body(b: Builder) {
  /* flared pentagonal section extruded along X */
  const sec = new THREE.Shape([
    new THREE.Vector2(-ZB, YF),
    new THREE.Vector2(ZB, YF),
    new THREE.Vector2(ZE, YE),
    new THREE.Vector2(0, YR),
    new THREE.Vector2(-ZE, YE),
  ])
  // shape x = −z (rotation ry = π/2 maps local x → −z, extrusion z → +x)
  b.add('shingleGrey', extrude(sec, 2 * HX), mat(-HX, 0, 0, Math.PI / 2))
  // floor soffit
  b.block('timberDark', 2 * HX, 0.12, 2 * ZB, 0, YF - 0.12, 0)

  /* roof: shingled planes with a small overhang, ridge and edge trims */
  for (const s of [-1, 1]) {
    const e0 = V(-HX - OH, YE - OH * 0.7, s * (ZE + OH))
    const e1 = V(HX + OH, YE - OH * 0.7, s * (ZE + OH))
    const r1 = V(HX + OH, YR + 0.02, 0)
    const r0 = V(-HX - OH, YR + 0.02, 0)
    facet(b, 'shingleGrey', [e0, e1, r1, r0], { thickness: 0.06 })
    b.beam('trimDark', e0, e1, 0.06, 0.08)
    for (const x of [-HX - OH, HX + OH]) b.beam('trimDark', V(x, YE - OH * 0.7, s * (ZE + OH)), V(x, YR + 0.02, 0), 0.05, 0.08)
    // roof shingles
    const vLen = e0.distanceTo(r0)
    const vDir = r0.clone().sub(e0).normalize()
    const n = V(0, 1, 0).sub(vDir.clone().multiplyScalar(vDir.y)).normalize()
    shingles(b, e0.clone().add(V(0, 0.02, 0)), V(1, 0, 0), vDir, n, vLen, () => [0, 2 * (HX + OH)])
    // snow-stop hooks, two staggered rows
    for (const [k, vv] of [
      [0, 0.45],
      [1, 0.75],
    ]) {
      for (let x = -HX + 0.3 + k * 0.42; x < HX - 0.2; x += 0.84) {
        const p = e0.clone().add(V(x + HX + OH, 0, 0)).addScaledVector(vDir, vv).addScaledVector(n, 0.035)
        b.add('trimDark', new THREE.BoxGeometry(0.035, 0.04, 0.08), new THREE.Matrix4().makeBasis(V(1, 0, 0), n, V(1, 0, 0).cross(n)).setPosition(p))
      }
    }
  }
  b.beam('trimDark', V(-HX - OH, YR + 0.07, 0), V(HX + OH, YR + 0.07, 0), 0.16, 0.08)

  /* long walls: shingle relief (window side with window hole) */
  for (const s of [-1, 1]) {
    const O = V(-HX, YF, s * ZB)
    const top = V(-HX, YE, s * ZE)
    const vLen = O.distanceTo(top)
    const vDir = top.clone().sub(O).normalize()
    const uDir = V(s, 0, 0)
    const n = V(0, 0, s).sub(vDir.clone().multiplyScalar(vDir.z * s)).normalize() // outward normal of the leaning wall
    const holes: Hole[] = s > 0 ? [[WIN.x - WIN.w / 2 + HX, WIN.x + WIN.w / 2 + HX, (WIN.y0 - YF) / Math.cos(Math.atan((ZE - ZB) / 2)), (WIN.y1 - YF) / Math.cos(Math.atan((ZE - ZB) / 2))]] : []
    if (s > 0) shingles(b, O, uDir, vDir, n, vLen, () => [0, 2 * HX], holes)
    else shingles(b, V(HX, YF, -ZB), V(-1, 0, 0), vDir, n, vLen, () => [0, 2 * HX])
  }
  /* end walls */
  for (const s of [-1, 1]) {
    const x = s * HX
    const O = V(x, YF, s * -ZB)
    const uDir = V(0, 0, s)
    const n = V(s, 0, 0)
    const urange = (v: number): [number, number] => {
      const y = YF + v
      const hw = y <= YE ? zAt(y) : ZE * (1 - (y - YE) / (YR - YE))
      return [ZB - hw, ZB + hw]
    }
    const holes: Hole[] = s > 0 ? [[ZB + DOOR.z - DOOR.w / 2 - 0.08, ZB + DOOR.z + DOOR.w / 2 + 0.08, 0, DOOR.h + 0.08]] : []
    shingles(b, O, uDir, V(0, 1, 0), n, YR - YF, urange, holes)
  }

  /* folds (fins) on the window side, with pointed caps above the eave */
  for (const xf of FINS) {
    const tri = (y: number, grow = 0) => {
      const z = zAt(y)
      return [V(xf - 0.26 - grow, y, z - 0.01), V(xf, y, z + 0.36 + grow), V(xf + 0.26 + grow, y, z - 0.01)]
    }
    const lo = tri(YF)
    const hi = tri(YE)
    for (let i = 0; i < 2; i++) facet(b, 'shingleGrey', [lo[i], lo[i + 1], hi[i + 1], hi[i]], { hint: V(i === 0 ? -1 : 1, 0, 0.6) })
    facet(b, 'shingleGrey', lo, { hint: V(0, -1, 0) })
    const apex = V(xf, YE + 0.95, ZE - 0.42)
    facet(b, 'shingleGrey', [hi[0], hi[1], apex])
    facet(b, 'shingleGrey', [hi[1], hi[2], apex])
    facet(b, 'shingleGrey', [hi[2], hi[0], apex], { hint: V(0, 0.3, -1) })
    // edge trims on the fold
    b.beam('trimDark', lo[1], hi[1], 0.05, 0.05)
    b.beam('trimDark', hi[1], apex, 0.05, 0.05)
    b.beam('trimDark', hi[0], apex, 0.04, 0.04)
    b.beam('trimDark', hi[2], apex, 0.04, 0.04)
    // shingle courses across the fin faces
    for (let y = YF + 0.22; y < YE - 0.05; y += 0.22) {
      const t = tri(y, 0.012)
      b.beam('shingleJoint', t[0], t[1], 0.02, 0.014)
      b.beam('shingleJoint', t[1], t[2], 0.02, 0.014)
    }
  }

  /* large window (deep dark frame, reflective glass) */
  {
    const lean = Math.atan((ZE - ZB) / (YE - YF))
    const yc = (WIN.y0 + WIN.y1) / 2
    const m = mat(WIN.x, yc, zAt(yc) + 0.02, 0, lean)
    const h = (WIN.y1 - WIN.y0) / Math.cos(lean)
    b.add('glassG', new THREE.PlaneGeometry(WIN.w, h), m)
    const fr = (lx: number, ly: number, w: number, hh: number) => b.add('trimDark', new THREE.BoxGeometry(w, hh, 0.12), new THREE.Matrix4().multiplyMatrices(m, mat(lx, ly, 0.03)))
    fr(0, h / 2 + 0.04, WIN.w + 0.16, 0.08)
    fr(0, -h / 2 - 0.04, WIN.w + 0.16, 0.08)
    fr(-WIN.w / 2 - 0.04, 0, 0.08, h + 0.16)
    fr(WIN.w / 2 + 0.04, 0, 0.08, h + 0.16)
  }

  /* door in the uphill end wall */
  {
    const x = HX + 0.015
    b.add('doorDark', new THREE.PlaneGeometry(DOOR.w, DOOR.h), mat(x, YF + DOOR.h / 2, DOOR.z, Math.PI / 2))
    for (const dz of [-DOOR.w / 2 - 0.04, DOOR.w / 2 + 0.04]) b.block('trimDark', 0.08, DOOR.h + 0.08, 0.08, x, YF, DOOR.z + dz)
    b.block('trimDark', 0.08, 0.08, DOOR.w + 0.16, x, YF + DOOR.h, DOOR.z)
    for (let i = 1; i < 5; i++) b.block('shingleJoint', 0.02, DOOR.h - 0.1, 0.015, x + 0.01, YF + 0.05, DOOR.z - DOOR.w / 2 + (i * DOOR.w) / 5)
    b.block('trimDark', 0.05, 0.03, 0.14, x + 0.04, YF + 1.0, DOOR.z + DOOR.w / 2 - 0.12)
  }
}

function stilts(b: Builder) {
  const yb = YF - 0.12 // underside of the floor
  // longitudinal platform beams and cross joists
  for (const z of [-ZB + 0.06, ZB - 0.06]) b.block('timber', 2 * HX + 0.1, 0.2, 0.12, -0.05, yb - 0.2, z)
  for (let x = -HX + 0.1; x <= HX; x += 0.9) b.block('timber', 0.1, 0.16, 2 * ZB, x, yb - 0.36, 0)
  // cliff-end trestle: two frames of timber legs with black-painted feet
  const legTop = yb - 0.36
  for (const x of [-2.05, -0.95]) {
    for (const z of [-ZB + 0.08, ZB - 0.08]) {
      b.block('black', 0.14, 1.05, 0.14, x, 0, z)
      b.block('timber', 0.14, legTop - 1.05, 0.14, x, 1.05, z)
    }
    // cross bracing in the frame (black steel flats)
    b.beam('black', V(x, 0.35, -ZB + 0.1), V(x, legTop - 0.1, ZB - 0.1), 0.05, 0.08)
    b.beam('black', V(x, 0.35, ZB - 0.1), V(x, legTop - 0.1, -ZB + 0.1), 0.05, 0.08)
    // timber knee braces to the platform beams
    for (const dx of [-0.55, 0.55]) b.beam('timber', V(x, legTop - 0.85, ZB - 0.02), V(x + dx, legTop, ZB - 0.02), 0.1, 0.1, V(0, 0, 1))
  }
  // longitudinal X-bracing between the two trestle frames on the window side and the back
  for (const z of [ZB + 0.0, -ZB - 0.0]) {
    b.beam('timber', V(-2.05, 0.4, z), V(-0.95, legTop - 0.15, z), 0.1, 0.1, V(0, 0, 1))
    b.beam('black', V(-0.95, 0.4, z), V(-2.05, legTop - 0.15, z), 0.06, 0.08, V(0, 0, 1))
  }
  // timber step between the outer legs
  b.block('timber', 0.95, 0.06, 0.32, -1.5, 0.55, ZB + 0.12)
  b.block('timber', 0.06, 0.25, 0.32, -1.5 - 0.47, 0.3, ZB + 0.12)
  b.block('timber', 0.06, 0.25, 0.32, -1.5 + 0.47, 0.3, ZB + 0.12)
  // uphill end: black steel posts (extended to the base; the real rock rises here)
  for (const x of [0.6, 1.95]) for (const z of [-ZB + 0.1, ZB - 0.1]) b.block('black', 0.12, legTop, 0.12, x, 0, z)
}

function build(): Builder {
  const b = new Builder()
  body(b)
  stilts(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [1.2, YE - 0.6, ZE],
  materials: () => ({
    shingleGrey: new THREE.MeshStandardMaterial({ color: '#555b60', metalness: 0.45, roughness: 0.5, envMapIntensity: 1.05 }),
    shingleJoint: new THREE.MeshStandardMaterial({ color: '#33383c', metalness: 0.4, roughness: 0.55 }),
    trimDark: new THREE.MeshStandardMaterial({ color: '#2c3034', metalness: 0.45, roughness: 0.5 }),
    doorDark: new THREE.MeshStandardMaterial({ color: '#2a2b2c', roughness: 0.7 }),
    timber: new THREE.MeshStandardMaterial({ color: '#c8935a', roughness: 0.75 }),
    timberDark: new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 0.85 }),
  }),
  notes: 'Small panoramic shelter clad entirely in dark grey aluminium shingles (PREFA DS.19 per the manufacturer reference), on a timber stilt frame at the cliff edge. Interpreted from one photograph; dimensions estimated.',
}
export default model
