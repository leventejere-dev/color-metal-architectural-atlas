/**
 * Frumoasa Monastery, Iași — main church "Sf. Voievozi" (1836–1839), OSM way 203267860.
 *
 * Modelling specification derived from the 12 reference photographs (drone views
 * 01–08 of the church; 04/05 show the separate gate bell tower, 09–12 the
 * precinct — not modelled), calibrated on the OSM outline (44.6 × 16.9 m,
 * long axis 74.8°). Real metres. +X = main axis towards the altar apse (east),
 * the western tetrastyle portico (main entrance) at −X.
 *
 *  - PLAN: single-nave hall 34.7 × 16.8 m; polygonal (half-octagon) altar apse
 *    12.6 m wide closing the east end; prostyle portico (2.3 m deep) on the
 *    west front.
 *  - ELEVATIONS: tall dressed-stone socle (3 m) with a dark sheet-metal drip
 *    band; cream plaster walls with pilasters; relief (garland) frieze under a
 *    profiled cornice at ~14 m. Flanks in 5 bays: narthex bay with two small
 *    stacked windows, two tall round-arched windows high in the wall, a central
 *    tall arched niche with a side door, a small arched window near the apse.
 *    Apse: large arched window on the east face, small ones on the diagonals.
 *  - PORTICO: four giant columns (paired outer, wide central intercolumn),
 *    entablature with relief panels, triangular pediment whose small gable
 *    roof runs back into the main roof.
 *  - ROOF (COLOR METAL scope: KME copper): low hipped roof (≈30°) with
 *    polygonal facets over the apse, standing seams; four "false" towers clad
 *    entirely in sheet metal on the ridge line: two large ones (≈10 m wide
 *    lobed bulbs, flared skirt, bell tier, octagonal lantern, ogee cap, ball,
 *    cross) over the nave and two small lobed ones at the west hip and over
 *    the apse. The photographs show the copper aged dark brown (roof slightly
 *    greyer than the towers).
 * Approximations: wall/socle heights and roof pitch estimated from the photos,
 * tower stations measured on photo 06 (±0.5 m), axial tower positions ±1 m,
 * relief frieze and capitals simplified, north side assumed like the south.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, helm, cross, window_, door, faceFrame, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

const T30 = Math.tan((30 * Math.PI) / 180)
const WALL = 'plasterCream'
const TRIM = 'trim'
const CU = 'cuRoof'
const CUT = 'cuTower'
const SEAM = seams(CU, 0.5, 0.045, 0.045)

const NAVE = { x0: -20.0, x1: 14.7, hw: 8.4 }
const APSE = { xc: 16.05, a: 6.3 } // octagon centre and apothem (walls)
const H = { socle: 3.0, band: 3.2, frieze0: 12.7, frieze1: 13.4, eave: 14.1 }
const PORT = { xf: -22.3, colTop: 12.6, floor: 1.2 }

const out = (face: Face, plane: number, n: number) => plane + (face[0] === '+' ? n : -n)
const U = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)
const onFace = (face: Face, plane: number, u: number, local: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(faceFrame(face, plane, u, 0, 0), local)

/** Plan ring of the apse walls, offset outwards by g (loft-ordered). */
function apseRing(g: number, y: number) {
  const a = APSE.a + g
  const R = a / Math.cos(Math.PI / 8)
  const c = APSE.xc
  const p = (deg: number) => V(c + R * Math.cos((deg * Math.PI) / 180), y, R * Math.sin((deg * Math.PI) / 180))
  return [V(NAVE.x1 - 0.5, y, -a), p(-67.5), p(-22.5), p(22.5), p(67.5), V(NAVE.x1 - 0.5, y, a)]
}
const apseBand = (g: number, y0: number, y1: number) => loft([apseRing(g, y0), apseRing(g, y1)], { capTop: true, capBottom: true, flat: true })

function column(b: Builder, x: number, z: number, y0: number, h: number, r: number) {
  b.add(TRIM, metricBox(r * 2.7, r * 0.5, r * 2.7), mat(x, y0 + r * 0.25, z))
  b.add(TRIM, new THREE.CylinderGeometry(r * 1.1, r * 1.15, r * 0.35, 14, 1, true), mat(x, y0 + r * 0.67, z))
  b.add(WALL, new THREE.CylinderGeometry(r * 0.88, r, h - r * 1.6, 16, 1, true), mat(x, y0 + r * 0.85 + (h - r * 1.6) / 2, z))
  b.add(TRIM, new THREE.CylinderGeometry(r * 1.2, r * 0.9, r * 0.5, 14, 1, true), mat(x, y0 + h - r * 0.5, z))
  b.add(TRIM, metricBox(r * 2.6, r * 0.28, r * 2.6), mat(x, y0 + h - r * 0.14, z))
}

/** One sheet-metal tower: faceted loft through [r, y] stations, ball and cross. */
function roofTower(b: Builder, x: number, yb: number, n: number, stations: [number, number][], ball: [number, number], crossS: number) {
  helm(b, CUT, { x, z: 0, n, stations: stations.map(([r, y]) => [r, yb + y] as [number, number]), phase: Math.PI / n, flat: false })
  // standing-seam ribs on the facet edges (lobes)
  const rh = n > 8 ? 0.05 : 0.06
  for (let k = 0; k < n; k++) {
    const a = Math.PI / n + (k / n) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < stations.length - 1; i++) {
      const [r0, y0] = stations[i]
      const [r1, y1] = stations[i + 1]
      if (Math.abs(y1 - y0) < 0.05 || r0 < 0.6) continue
      b.beam(CUT, V(x + c * (r0 + rh / 2), yb + y0, s * (r0 + rh / 2)), V(x + c * (r1 + rh / 2), yb + y1, s * (r1 + rh / 2)), rh * 1.3, rh, V(c, 0, s))
    }
  }
  b.add(CUT, new THREE.SphereGeometry(ball[0], 14, 10), mat(x, yb + ball[1], 0))
  cross(b, 'iron', x, yb + ball[1] + ball[0] * 0.7, 0, crossS, true, Math.PI / 2)
}

const BIG: [number, number][] = [
  [3.9, -1.2], [4.4, 0], [4.85, 0.9], [5.05, 2.0], [4.85, 3.0], [4.4, 3.7], [3.75, 4.3], [3.7, 4.35],
  [4.15, 4.38], [4.1, 4.6], [3.95, 5.6], [3.8, 6.5], [3.72, 6.8],
  [3.85, 6.82], [3.82, 7.1], [3.62, 7.6], [3.3, 8.1], [2.8, 8.65], [2.15, 9.25], [1.55, 9.85], [1.25, 10.25], [1.2, 10.3],
  [1.2, 11.75], [1.36, 11.78], [1.3, 12.0], [1.05, 12.4], [0.7, 12.85], [0.48, 13.15], [0.42, 13.25], [0.42, 14.15],
]
const SMALL: [number, number][] = [
  [2.1, -0.9], [2.35, 0], [2.55, 0.8], [2.62, 1.6], [2.5, 2.5], [2.2, 3.3], [1.95, 3.75], [1.9, 3.8],
  [2.3, 3.82], [2.25, 4.1], [2.1, 4.8], [2.02, 5.05],
  [2.12, 5.07], [2.05, 5.35], [1.75, 5.8], [1.35, 6.25], [1.0, 6.6], [0.95, 6.62],
  [0.95, 8.15], [1.06, 8.18], [1.0, 8.4], [0.7, 8.8], [0.42, 9.15], [0.36, 9.25], [0.36, 9.85],
]

function build(): Builder {
  const b = new Builder()
  const nx = (NAVE.x0 + NAVE.x1) / 2
  const nl = NAVE.x1 - NAVE.x0

  /* ---------------- walls, socle, frieze, cornice ---------------- */
  b.block(WALL, nl, H.eave, 2 * NAVE.hw, nx, 0, 0)
  b.add(WALL, apseBand(0, 0, H.eave))
  b.block('stoneWarm', nl + 0.24, H.socle, 2 * NAVE.hw + 0.24, nx, 0, 0)
  b.add('stoneWarm', apseBand(0.12, 0, H.socle))
  b.block('zincGraphite', nl + 0.4, H.band - H.socle, 2 * NAVE.hw + 0.4, nx, H.socle, 0)
  b.add('zincGraphite', apseBand(0.2, H.socle, H.band))
  // stone coursing lines on the socle
  for (const y of [1.0, 2.0]) {
    b.block('stoneGrey', nl + 0.27, 0.04, 2 * NAVE.hw + 0.27, nx, y, 0)
    b.add('stoneGrey', apseBand(0.135, y, y + 0.04))
  }
  b.block(TRIM, nl + 0.14, H.frieze1 - H.frieze0, 2 * NAVE.hw + 0.14, nx, H.frieze0, 0)
  b.add(TRIM, apseBand(0.07, H.frieze0, H.frieze1))
  b.block(TRIM, nl + 0.5, 0.25, 2 * NAVE.hw + 0.5, nx, H.frieze1, 0)
  b.add(TRIM, apseBand(0.25, H.frieze1, H.frieze1 + 0.25))
  b.block(TRIM, nl + 1.1, H.eave - H.frieze1 - 0.25, 2 * NAVE.hw + 1.1, nx, H.frieze1 + 0.25, 0)
  b.add(TRIM, apseBand(0.55, H.frieze1 + 0.25, H.eave))

  /* ---------------- flanks (5 bays) ---------------- */
  const pil = [14.3, 8.0, 1.5, -4.4, -11.8, -19.6]
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? NAVE.hw : -NAVE.hw
    for (const x of pil) {
      b.add(TRIM, metricBox(0.95, H.frieze0 - H.band, 0.2), onFace(face, plane, U(face, x, 0), mat(0, (H.frieze0 + H.band) / 2, 0.1)))
      b.add(TRIM, metricBox(1.2, 0.3, 0.3), onFace(face, plane, U(face, x, 0), mat(0, H.frieze0 - 0.15, 0.15)))
    }
    // relief garland hints on the frieze
    for (let x = NAVE.x0 + 0.8; x < NAVE.x1 - 0.5; x += 1.25) b.add(TRIM, metricBox(0.75, 0.3, 0.08), onFace(face, plane, U(face, x, 0), mat(0, (H.frieze0 + H.frieze1) / 2, 0.1)))
    const w = (x: number, y0: number, s: { w: number; h: number; type: 'round' | 'rect' }) =>
      window_(b, face, plane, U(face, x, 0), y0, { ...s, frame: 0.22, frameKey: TRIM, bars: [2, 3], sill: true })
    w(11.3, 8.6, { w: 1.1, h: 2.1, type: 'round' })
    w(4.6, 7.2, { w: 1.7, h: 4.6, type: 'round' })
    w(-7.4, 7.2, { w: 1.7, h: 4.6, type: 'round' })
    w(-16.2, 8.9, { w: 1.0, h: 1.9, type: 'round' })
    w(-16.2, 4.4, { w: 1.0, h: 1.6, type: 'rect' })
    // central tall arched niche with two small windows
    const un = U(face, -1.4, 0)
    window_(b, face, plane, un, H.band + 0.4, { type: 'round', w: 2.5, h: 8.4, frame: 0.25, frameKey: TRIM, glassKey: 'plasterSand' })
    window_(b, face, out(face, plane, 0.04), un, 4.4, { type: 'rect', w: 1.1, h: 1.6, frame: 0.15, frameKey: TRIM, bars: [2, 2] })
    window_(b, face, out(face, plane, 0.04), un, 7.8, { type: 'round', w: 1.2, h: 2.8, frame: 0.15, frameKey: TRIM, bars: [2, 3] })
    // dark downpipes
    for (const x of [14.0, 4.6 + 1.6, -7.4 - 1.6, -19.3]) b.rod('zincGraphite', V(x, 0.3, plane + (plane > 0 ? 0.25 : -0.25)), V(x, H.eave - 0.2, plane + (plane > 0 ? 0.25 : -0.25)), 0.07, 6)
  }

  /* ---------------- apse openings & pilasters ---------------- */
  {
    const R = APSE.a / Math.cos(Math.PI / 8)
    // east face: large arched window
    const xe = APSE.xc + APSE.a
    window_(b, '+x', xe, 0, 6.9, { type: 'round', w: 1.9, h: 4.6, frame: 0.3, frameKey: TRIM, bars: [2, 4], sill: true })
    // diagonals: small arched windows
    for (const s of [-1, 1]) {
      const a = s * 45
      const ry = Math.atan2(Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180))
      const px = APSE.xc + APSE.a * Math.cos((a * Math.PI) / 180)
      const pz = APSE.a * Math.sin((a * Math.PI) / 180)
      const m = mat(px, 0, pz, ry)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 8.8), new THREE.Vector2(0.5, 8.8), new THREE.Vector2(0.5, 10.2), new THREE.Vector2(0, 10.7), new THREE.Vector2(-0.5, 10.2)])), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.04)))
      b.add(TRIM, metricBox(1.4, 0.18, 0.25), new THREE.Matrix4().multiplyMatrices(m, mat(0, 8.7, 0.1)))
    }
    // pilasters at the apse angles
    for (const deg of [-67.5, -22.5, 22.5, 67.5]) {
      const r = (deg * Math.PI) / 180
      const ry = Math.atan2(Math.cos(r), Math.sin(r))
      b.add(TRIM, metricBox(0.8, H.frieze0 - H.band, 0.4), mat(APSE.xc + R * Math.cos(r), (H.frieze0 + H.band) / 2, R * Math.sin(r), ry))
    }
  }

  /* ---------------- west front behind the portico ---------------- */
  door(b, '-x', NAVE.x0, 0, { w: 2.0, h: 3.6, type: 'rect', frame: 0.35, frameKey: 'stoneWarm', y0: PORT.floor, leafKey: 'wood' })
  b.add(TRIM, metricBox(0.3, 0.45, 3.0), mat(NAVE.x0 - 0.2, PORT.floor + 3.95, 0))
  window_(b, '-x', NAVE.x0, 0, 6.6, { type: 'round', w: 1.8, h: 3.1, frame: 0.3, frameKey: TRIM, bars: [2, 3] })
  b.add(TRIM, new THREE.TorusGeometry(1.35, 0.14, 4, 20, Math.PI), mat(NAVE.x0 - 0.12, 8.8, 0, -Math.PI / 2))
  for (const z of [-6.0, -2.6, 2.6, 6.0]) b.add(TRIM, metricBox(0.2, H.frieze0 - PORT.floor, 0.9), mat(NAVE.x0 - 0.1, (H.frieze0 + PORT.floor) / 2, z))

  /* ---------------- portico ---------------- */
  {
    const xc = PORT.xf + 0.7
    b.block('stoneWarm', NAVE.x0 - PORT.xf + 0.3, PORT.floor, 14.0, (PORT.xf + NAVE.x0) / 2 - 0.15, 0, 0)
    b.block('stoneWarm', 1.6, PORT.floor * 0.5, 4.0, PORT.xf - 0.9, 0, 0) // front steps
    b.block('stoneWarm', 0.8, PORT.floor * 0.5, 4.0, PORT.xf - 0.4, PORT.floor * 0.5, 0)
    for (const z of [-5.75, -2.55, 2.55, 5.75]) {
      b.block('stoneWarm', 1.9, 0.5, 1.9, xc, PORT.floor, z)
      column(b, xc, z, PORT.floor + 0.5, PORT.colTop - PORT.floor - 0.5, 0.68)
    }
    const depth = NAVE.x0 - PORT.xf + 0.25
    const cxe = PORT.xf - 0.25 + depth / 2
    b.block(TRIM, depth, 0.55, 13.6, cxe, PORT.colTop, 0)
    b.block(WALL, depth, 0.75, 13.6, cxe, PORT.colTop + 0.55, 0)
    for (const z of [-4.1, 4.1]) b.add(TRIM, metricBox(0.1, 0.5, 3.0), mat(PORT.xf - 0.3, PORT.colTop + 0.92, z))
    b.block(TRIM, depth + 0.5, H.eave - PORT.colTop - 1.3, 14.4, cxe - 0.25, PORT.colTop + 1.3, 0)
    // pediment with tympanum and raking cornice
    const rise = 3.3
    const hw = 7.1
    const ped = new THREE.Shape([new THREE.Vector2(-hw + 0.3, 0), new THREE.Vector2(hw - 0.3, 0), new THREE.Vector2(0, rise - 0.15)])
    b.add(WALL, extrude(ped, depth - 0.2), mat(NAVE.x0, H.eave, 0, -Math.PI / 2))
    for (const s of [-1, 1]) b.beam(TRIM, V(PORT.xf - 0.45, H.eave + 0.05, s * hw), V(PORT.xf - 0.45, H.eave + rise, 0), 0.5, 0.35, V(1, 0, 0))
    b.add(TRIM, new THREE.CircleGeometry(0.45, 16), mat(PORT.xf - 0.12, H.eave + 1.2, 0, -Math.PI / 2))
    // pediment roof running back into the main west hip
    const tp = rise / hw
    const ve = hw + 0.15
    const xr = -20.5 + (ve * tp) / T30 // where the ridge meets the hip face
    for (const s of [-1, 1]) facet(b, CU, [V(PORT.xf - 0.7, H.eave, s * ve), V(-20.0, H.eave, s * ve), V(xr, H.eave + ve * tp, 0), V(PORT.xf - 0.7, H.eave + ve * tp, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, V(PORT.xf - 0.7, H.eave + ve * tp + 0.05, 0), V(xr, H.eave + ve * tp + 0.05, 0), 0.24, 0.14)
  }

  /* ---------------- main hipped roof with apse facets ---------------- */
  const ov = 0.5
  const ye = H.eave - ov * T30
  const W0 = NAVE.hw + ov
  const Xw = NAVE.x0 - ov
  const Xe = NAVE.x1 + ov
  const yr = ye + W0 * T30
  const rW = Xw + W0
  const rE = Xe - W0
  const V0 = APSE.a + ov
  const ya = ye + V0 * T30
  const opt = { seams: SEAM, thickness: 0.12 }
  facet(b, CU, [V(Xw, ye, W0), V(Xe, ye, W0), V(rE, yr, 0), V(rW, yr, 0)], opt)
  facet(b, CU, [V(Xe, ye, -W0), V(Xw, ye, -W0), V(rW, yr, 0), V(rE, yr, 0)], opt)
  facet(b, CU, [V(Xw, ye, -W0), V(Xw, ye, W0), V(rW, yr, 0)], opt)
  for (const s of [-1, 1]) facet(b, CU, [V(Xe, ye, s * W0), V(Xe, ye, s * V0), V(Xe - V0, ya, 0), V(rE, yr, 0)], opt)
  // apse roof: side planes + polygonal facets to the apex
  const Ro = V0 / Math.cos(Math.PI / 8)
  const ap = (deg: number) => V(APSE.xc + Ro * Math.cos((deg * Math.PI) / 180), ye, Ro * Math.sin((deg * Math.PI) / 180))
  const apex = V(APSE.xc, ya, 0)
  for (const s of [-1, 1]) facet(b, CU, [V(Xe, ye, s * V0), ap(s * 67.5), apex, V(Xe - V0, ya, 0)], opt)
  const angs = [-67.5, -22.5, 22.5, 67.5]
  for (let i = 0; i < 3; i++) facet(b, CU, [ap(angs[i]), ap(angs[i + 1]), apex], opt)
  // ridge and hip caps
  const cap = (a: THREE.Vector3, c: THREE.Vector3) => b.beam(CU, a.clone().add(V(0, 0.06, 0)), c.clone().add(V(0, 0.06, 0)), 0.24, 0.13)
  cap(V(rW, yr, 0), V(rE, yr, 0))
  cap(V(Xe - V0, ya, 0), apex)
  for (const s of [-1, 1]) {
    cap(V(Xw, ye, s * W0), V(rW, yr, 0))
    cap(V(Xe, ye, s * W0), V(rE, yr, 0))
    cap(V(Xe, ye, s * V0), V(Xe - V0, ya, 0))
  }
  for (const a of angs) cap(ap(a), apex)
  // eaves gutters
  for (const s of [-1, 1]) b.beam(CU, V(Xw, ye - 0.08, s * (W0 + 0.08)), V(Xe, ye - 0.08, s * (W0 + 0.08)), 0.2, 0.18)

  /* ---------------- four sheet-metal towers on the ridge line ---------------- */
  roofTower(b, -11.4, 17.2, 8, SMALL, [0.4, 10.25], 1.8)
  roofTower(b, -2.7, 15.7, 16, BIG, [0.6, 14.7], 2.4)
  roofTower(b, 8.2, 15.7, 16, BIG, [0.6, 14.7], 2.4)
  roofTower(b, APSE.xc, 16.2, 8, SMALL, [0.4, 10.25], 1.8)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2.7, 21, 3],
  materials: (base) => {
    const cu = (tint: string, metalness: number, roughness: number) => {
      const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color(tint)
      m.metalness = metalness
      m.roughness = roughness
      return m
    }
    return { cuRoof: cu('#7c828e', 0.6, 0.58), cuTower: cu('#8a8290', 0.66, 0.52) }
  },
  notes: 'Frumoasa Monastery church: hipped copper roof with four sheet-metal bulb towers, western portico and polygonal apse. Heights, roof pitch and tower profiles estimated from drone photographs; frieze and capitals simplified.',
}

export default model
