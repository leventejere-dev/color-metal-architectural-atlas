/**
 * Hotel Tușnad, Băile Tușnad (Str. Oltului 87, OSM way 216870290) — the
 * A-frame hotel block of the resort with its restaurant podium.
 *
 * Modelling specification (real metres, origin = OSM footprint centre at
 * ground, +X = OSM long axis 79.7° (≈ E), +Z = 169.7° (≈ S); the main front
 * with the restaurant faces −Z = north, towards the car park and the town):
 *  - Main block with an A-shaped cross-section (photos 01, 02): 48 m wide at
 *    the base, ≈ 17 m deep; two big roof planes (≈ 56°) rise from the
 *    first-floor line (≈ 3.6 m) at x = ±24 to a flat top (±8 m) at ≈ 27.6 m;
 *    small penthouse on the top. Width and depth follow the OSM bounding box
 *    (53.3 × 42.8 m including the podium and terraces).
 *  - Both end façades are stepped: eight storeys of 3 m above a 3.6 m ground
 *    floor, every storey with a continuous balcony (white parapet with a khaki
 *    band) that narrows with the roof slope; the slab ends project through the
 *    roof edge as white "teeth" (photo 01); window rhythm ≈ 2.6 m.
 *  - Restaurant podium in front of the western half (photo 01, right):
 *    ground storey with dark windows, glazed restaurant floor, white fascia
 *    with the RESTAURANT lettering; a one-storey entrance terrace in front of
 *    the eastern half; entrance steps in the middle (photo 02).
 *  - COLOR METAL scope (2021): green-painted aluminium strip ("verde rame
 *    antico") according to its records. The photographs do not show
 *    it clearly (brown roof in photo 01, snow in photo 02), so per the client
 *    rule the two big roof planes are shown as green coated aluminium
 *    standing seam (pans ≈ 0.6 m), with green verge flashings and copings.
 * Approximations: the OSM outline (a T with a northern stem on the east) and
 * the photographs could not be fully reconciled — the podium is placed as
 * photographed; the slight plan angle between the two halves (outline) is
 * ignored; balconies, windows and the podium are simplified; the rear façade
 * is mirrored from the front.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, seams } from '../kit'
import type { ModelModule } from '../registry'

const HW = 24 // half width at the base
const HT = 8 // half width of the flat top
const Y0 = 3.6 // slope foot (first floor line)
const YT = 27.6 // flat top
const ZF = -8.5 // front (north) façade
const ZB = 8.5 // rear façade
const FLOORS = 8
const FH = 3.0
const GREEN = 'tusGreen'
const SEAM = seams(GREEN, 0.6, 0.05, 0.045)
const xEdge = (y: number) => HW - ((y - Y0) * (HW - HT)) / (YT - Y0)
/** Beam between two points with a right-handed basis (w across, h along `up`). */
function beam(b: Builder, key: string, p: THREE.Vector3, q: THREE.Vector3, w: number, h: number, up = V(0, 1, 0)) {
  const d = V().subVectors(q, p)
  const L = d.length()
  if (L < 1e-5) return
  d.normalize()
  let side = V().crossVectors(up, d)
  if (side.lengthSq() < 1e-6) side = V().crossVectors(V(1, 0, 0), d)
  side.normalize()
  const up2 = V().crossVectors(d, side).normalize()
  b.add(key, metricBox(w, h, L), new THREE.Matrix4().makeBasis(side, up2, d).setPosition(V().addVectors(p, q).multiplyScalar(0.5)))
}

/** Stepped end façade at z = zf (sgn = −1 front, +1 rear): balconies and window bands. */
function endFacade(b: Builder, zf: number, sgn: number, skipBelow = 0) {
  for (let k = 0; k < FLOORS; k++) {
    const y = Y0 + k * FH
    const xs = xEdge(y)
    const xt = xEdge(y + FH)
    if (y < skipBelow) continue
    // balcony slab, projecting 1.4 m; its ends stick out through the roof edge
    const bd = 1.4
    const zc = zf + sgn * (bd / 2)
    b.block('tusWall', 2 * (xs + 0.35), 0.24, bd, 0, y - 0.12, zc)
    // parapet: white upright with a khaki band
    b.block('tusWall', 2 * (xs - 0.15), 0.95, 0.14, 0, y + 0.12, zf + sgn * (bd - 0.07))
    b.block('tusBand', 2 * (xs - 0.15) + 0.02, 0.32, 0.16, 0, y + 0.42, zf + sgn * (bd - 0.07))
    // balcony partitions
    for (let x = -xs + 2.6; x < xs - 1; x += 5.2) b.block('tusWall', 0.12, FH - 0.3, bd - 0.1, x, y + 0.12, zc)
    // window / door band on the wall
    const n = Math.max(1, Math.floor((2 * (xt - 0.8)) / 2.6))
    const w0 = -(n * 2.6) / 2
    for (let i = 0; i < n; i++) {
      const x = w0 + 2.6 * (i + 0.5)
      b.block('glassC', 1.5, 2.15, 0.06, x, y + 0.25, zf + sgn * 0.03)
      b.block('tusFrame', 0.06, 2.15, 0.08, x, y + 0.25, zf + sgn * 0.05)
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= main A-block ================= */
  {
    const prof = new THREE.Shape([
      new THREE.Vector2(-HW, 0),
      new THREE.Vector2(HW, 0),
      new THREE.Vector2(HW, Y0),
      new THREE.Vector2(HT, YT),
      new THREE.Vector2(-HT, YT),
      new THREE.Vector2(-HW, Y0),
    ])
    b.add('tusWall', extrude(prof, ZB - ZF), mat(0, 0, ZF))
    // socle / ground-floor band
    b.block('tusSocle', 2 * HW + 0.2, 0.6, ZB - ZF + 0.2, 0, 0, 0)
    // ground-floor windows on the side walls (below the roof planes)
    for (const s of [-1, 1]) {
      for (let z = ZF + 1.6; z < ZB - 1; z += 2.8) b.block('glassC', 0.06, 1.6, 1.5, s * (HW + 0.02), 1.1, z + 0.75)
      b.block('tusWall', 0.3, 0.35, ZB - ZF + 0.3, s * (HW + 0.1), Y0 - 0.35, 0)
    }
    // big roof planes: green coated aluminium standing seam
    const o = 0.6
    const k = (HW - HT) / (YT - Y0)
    for (const s of [-1, 1]) {
      const xFoot = s * (HW + 0.35)
      const yFoot = Y0 - 0.35 / k
      const pts = [V(xFoot, yFoot, ZF - o), V(xFoot, yFoot, ZB + o), V(s * (HT + 0.12), YT + 0.15, ZB + o), V(s * (HT + 0.12), YT + 0.15, ZF - o)]
      facet(b, GREEN, pts, { seams: SEAM, thickness: 0.18, hint: V(s, 0.6, 0) })
      // verge flashings along both end façades and the top edge
      for (const z of [ZF - o, ZB + o]) beam(b, GREEN, V(xFoot, yFoot, z), V(s * (HT + 0.12), YT + 0.15, z), 0.3, 0.22, V(0, 0, 1))
      beam(b, GREEN, V(s * (HT + 0.1), YT + 0.2, ZF - o), V(s * (HT + 0.1), YT + 0.2, ZB + o), 0.35, 0.2)
      // gutter at the foot
      b.rod(GREEN, V(xFoot + s * 0.1, yFoot - 0.1, ZF - o), V(xFoot + s * 0.1, yFoot - 0.1, ZB + o), 0.1, 6)
    }
    // flat top with parapet and penthouse
    b.block('tusWall', 2 * HT + 0.4, 0.5, ZB - ZF + 0.6, 0, YT, 0)
    b.block('tusSlab', 2 * HT + 0.2, 0.06, ZB - ZF + 0.4, 0, YT + 0.5, 0)
    for (const z of [ZF - 0.12, ZB + 0.12]) b.block(GREEN, 2 * HT + 0.6, 0.1, 0.5, 0, YT + 0.5, z)
    b.block('tusWall', 5.5, 2.8, 6.0, -1.0, YT + 0.5, 0.5)
    b.block('tusSlab', 5.8, 0.1, 6.3, -1.0, YT + 3.3, 0.5)
    b.block('tusWall', 1.4, 1.5, 1.4, 5.2, YT + 0.5, 3.0)
    // HOTEL TUȘNAD sign panel at the top of the front
    b.block('tusWall', 12.0, 1.6, 0.4, 0, YT - 1.7, ZF - 0.2)
    b.block('tusSign', 8.4, 0.7, 0.06, 1.0, YT - 1.3, ZF - 0.42)
    // stepped end façades
    endFacade(b, ZF, -1, 7.0) // front: lower floors behind the podium handled below
    endFacade(b, ZB, 1)
    // front floors 1–2 above/behind the podium: windows only
    for (const y of [Y0, Y0 + FH]) {
      const xt = xEdge(y + FH)
      for (let x = -xt + 1.8; x < xt - 1.2; x += 2.6) b.block('glassC', 1.5, 2.1, 0.06, x, y + 0.3, ZF - 0.03)
    }
    // ground floor front: lobby glazing and entrance
    for (let x = 3.0; x < HW - 1; x += 2.6) b.block('glassC', 1.8, 2.4, 0.06, x, 0.6, ZF - 0.03)
    b.block('tusDoor', 3.0, 2.8, 0.08, 1.2, 0.6, ZF - 0.05)
  }

  /* ================= restaurant podium (west half, in front) ================= */
  {
    const x0 = -HW + 0.5
    const x1 = 2.0
    const z0 = ZF - 11.0
    const z1 = ZF
    const xc = (x0 + x1) / 2
    const zc = (z0 + z1) / 2
    // ground storey
    b.block('tusWall', x1 - x0, 3.4, z1 - z0, xc, 0, zc)
    for (let x = x0 + 1.4; x < x1 - 1; x += 2.6) b.block('glassC', 1.8, 2.0, 0.06, x, 0.8, z0 - 0.03)
    for (let x = x0 + 1.0; x < x1; x += 2.6) b.block('tusWall', 0.4, 3.4, 0.4, x - 0.9, 0, z0 - 0.15)
    // glazed restaurant floor (slightly cantilevered)
    b.block('tusSlab', x1 - x0 + 0.8, 0.3, z1 - z0 + 0.6, xc, 3.4, zc - 0.3)
    b.block('glassG', x1 - x0 - 0.2, 2.5, z1 - z0 - 0.4, xc, 3.7, zc - 0.2)
    for (let x = x0 + 0.2; x <= x1; x += 1.3) b.block('tusFrame', 0.07, 2.5, 0.08, x, 3.7, z0 - 0.02)
    for (let z = z0 + 0.2; z <= z1; z += 1.3) b.block('tusFrame', 0.08, 2.5, 0.07, x0 - 0.02, 3.7, z)
    // fascia with lettering and roof slab
    b.block('tusWall', x1 - x0 + 1.0, 1.3, z1 - z0 + 0.8, xc, 6.2, zc - 0.4)
    b.block('tusSign', 7.5, 0.6, 0.06, x0 + 5.0, 6.55, z0 - 0.83)
    b.block('tusSlab', x1 - x0 + 0.9, 0.08, z1 - z0 + 0.7, xc, 7.5, zc - 0.4)
    b.block(GREEN, x1 - x0 + 1.1, 0.12, 0.3, xc, 7.48, z0 - 0.75)
    // side stair/ramp structure at the west end (photo 01, right)
    b.block('tusWall', 2.2, 1.2, 6.0, x0 - 1.4, 0, zc - 2.0)
  }

  /* ================= entrance terrace (east half, in front) ================= */
  {
    const x0 = 2.6
    const x1 = HW - 1.0
    const z0 = ZF - 6.0
    const z1 = ZF
    const xc = (x0 + x1) / 2
    const zc = (z0 + z1) / 2
    b.block('tusWall', x1 - x0, 3.0, z1 - z0, xc, 0, zc)
    for (let x = x0 + 1.5; x < x1 - 1; x += 2.6) b.block('glassC', 1.8, 1.8, 0.06, x, 0.9, z0 - 0.03)
    // terrace parapet
    b.block('tusWall', x1 - x0, 1.0, 0.18, xc, 3.0, z0 + 0.09)
    b.block('tusWall', 0.18, 1.0, z1 - z0, x1 - 0.09, 3.0, zc)
    // entrance canopy and steps (photo 02)
    b.block('tusWall', 5.0, 0.35, 3.0, x0 + 0.2, 3.2, z0 - 1.0)
    for (const x of [x0 - 2.0, x0 + 2.4]) b.block('tusWall', 0.35, 3.2, 0.35, x, 0, z0 - 2.3)
    for (let i = 0; i < 4; i++) b.block('tusSocle', 4.0, 0.15 * (4 - i), 0.4, x0 + 0.2, 0, z0 - 0.4 - i * 0.4)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [-16, 14, 0],
  materials: (base) => ({
    // green-painted aluminium ("verde rame antico"): the palette's natural aluminium sheet, re-coloured
    tusGreen: (() => {
      const m = (base.aluNatural as THREE.MeshStandardMaterial).clone()
      m.color.set('#7fb39b')
      m.metalness = 0.35
      m.roughness = 0.5
      return m
    })(),
    tusWall: new THREE.MeshStandardMaterial({ color: '#f1f0eb', roughness: 0.88 }),
    tusSocle: new THREE.MeshStandardMaterial({ color: '#bdb8ad', roughness: 0.9 }),
    tusBand: new THREE.MeshStandardMaterial({ color: '#b3a47a', roughness: 0.85 }),
    tusSlab: new THREE.MeshStandardMaterial({ color: '#e4e2db', roughness: 0.85 }),
    tusFrame: new THREE.MeshStandardMaterial({ color: '#3d3f42', roughness: 0.6, metalness: 0.3 }),
    tusDoor: new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.7 }),
    tusSign: new THREE.MeshStandardMaterial({ color: '#2f4f8f', roughness: 0.5 }),
  }),
  notes:
    'Hotel Tușnad: A-shaped hotel block with stepped balcony façades and a restaurant podium; the two big roof planes are shown in green coated aluminium standing seam per COLOR METAL records (not clearly visible in the photographs). Plan and heights estimated.',
}
export default model
