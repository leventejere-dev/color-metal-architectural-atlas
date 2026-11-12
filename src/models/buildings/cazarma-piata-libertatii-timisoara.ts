/**
 * Comenduirea Garnizoanei Timișoara (Generalatul Nou, Piața Libertății 5,
 * OSM way 193032540) — two-storey baroque military headquarters with a
 * central risalit, an arched gateway and a balcony, under tall hipped roofs.
 *
 * Modelling specification (real metres; +X = 274.9° = the OSM long axis
 * 94.9° flipped so that +Z = 4.9° = the main façade on Piața Libertății):
 *  - U-shaped plan after the OSM outline: street wing 58.1 × 17.9 m
 *    (x −29…29, z 1.3…19.2); risalit 11.5 m wide projecting 0.7 m
 *    (x −6.8…4.7); two rear wings towards the courtyard: west wing
 *    (x 19.2…29.1) to z −19.9, east wing (x −29.1…−20.5) to z −15.9;
 *    shallow stair projection on the courtyard side.
 *  - Elevation (photos 01–03, 2014–2025): plinth, tall ground floor to
 *    the band at 5.6 m, first floor, main cornice at ≈11.2 m; risalit with
 *    paired lesenes, round-arched gateway, balcony with iron railing over
 *    three bays and a raised cornice at ≈12.6 m. Street front 5 + 3 + 5 bays.
 *  - Roofs: hipped street-wing roof (≈32°, ridge ≈16.8 m — OSM height 15 m),
 *    a taller hipped risalit roof with its hip towards the square, hipped
 *    rear wings running into the main roof; brick chimneys.
 *  - COLOR METAL titanium-zinc: the photographs (2014, 2016, 2025) still show
 *    the old tiles, so all roof surfaces are shown in natural titanium-zinc
 *    standing seam (≈0.5 m pans), the material supplied by COLOR METAL
 *    according to its records (2022); which surfaces were covered is not
 *    documented.
 * Approximations: heights scaled from the frontal photos and the OSM height;
 * courtyard and rear elevations not photographed (regular bays assumed);
 * window surrounds and stucco simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, frameShape, opening, window_, hippedRoof, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

interface Rect { x0: number; x1: number; z0: number; z1: number }

/* plan (OSM, flipped frame) */
const MAIN: Rect = { x0: -29.06, x1: 29.06, z0: 1.3, z1: 19.24 }
const RIS: Rect = { x0: -6.79, x1: 4.74, z0: 18.6, z1: 19.87 }
const RCX = (RIS.x0 + RIS.x1) / 2
const WW: Rect = { x0: 19.16, x1: 29.06, z0: -19.87, z1: 1.31 } // west wing
const EW: Rect = { x0: -29.06, x1: -20.46, z0: -15.85, z1: 1.31 } // east wing

/* heights */
const PLINTH = 0.8
const BAND = 5.6
const EAVE = 11.2
const RIS_EAVE = 12.6

function walls(b: Builder, r: Rect, top = EAVE) {
  const w = r.x1 - r.x0
  const d = r.z1 - r.z0
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  b.block('gcRender', w, top, d, cx, 0, cz)
  b.block('gcPlinth', w + 0.16, PLINTH, d + 0.16, cx, 0, cz)
  b.block('gcTrim', w + 0.14, 0.32, d + 0.14, cx, BAND - 0.16, cz)
  b.block('gcTrim', w + 0.1, 0.14, d + 0.1, cx, 6.25, cz)
  // main cornice (two steps)
  b.block('gcTrim', w + 0.3, 0.35, d + 0.3, cx, top - 0.75, cz)
  b.block('gcTrim', w + 0.7, 0.4, d + 0.7, cx, top - 0.4, cz)
}

/** Window pair (ground + first floor) with stucco surround, sill and ear-hood on the first floor. */
function bay(b: Builder, face: Face, plane: number, u: number, gf = true) {
  if (gf) window_(b, face, plane, u, 1.7, { w: 1.25, h: 2.2, frame: 0.18, frameKey: 'gcTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 3] })
  window_(b, face, plane, u, 6.7, { w: 1.3, h: 2.55, frame: 0.2, frameKey: 'gcTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('gcTrim', metricBox(1.95, 0.22, 0.2), M(m, mat(0, 9.55, 0.1)))
  // framing lesene panel between the floors
  b.add('gcTrim', metricBox(1.5, 0.7, 0.05), M(m, mat(0, 4.55, 0.03)))
}

function bayRow(b: Builder, face: Face, plane: number, u0: number, u1: number, n: number, gf = true) {
  const s = (u1 - u0) / n
  for (let i = 0; i < n; i++) bay(b, face, plane, u0 + s * (i + 0.5), gf)
}

function lesenes(b: Builder, face: Face, plane: number, us: number[], y1 = EAVE - 0.75, w = 0.55) {
  for (const u of us) b.add('gcTrim', metricBox(w, y1 - PLINTH, 0.1), M(faceFrame(face, plane, u, 0, 0), mat(0, PLINTH + (y1 - PLINTH) / 2, 0.05)))
}

function chimney(b: Builder, x: number, y: number, z: number, h = 2.6) {
  b.block('gcRender', 0.9, h, 1.3, x, y, z)
  b.block('gcTrim', 1.15, 0.22, 1.55, x, y + h, z)
}

function build(): Builder {
  const b = new Builder()

  /* ================= volumes ================= */
  walls(b, MAIN)
  walls(b, WW)
  walls(b, EW)
  // stair projection on the courtyard side
  b.block('gcRender', 11.8, EAVE - 0.4, 0.9, -1.17, 0, 0.88)
  // risalit (raised cornice)
  {
    const w = RIS.x1 - RIS.x0
    b.block('gcRender', w, RIS_EAVE, RIS.z1 - RIS.z0, RCX, 0, (RIS.z0 + RIS.z1) / 2)
    b.block('gcPlinth', w + 0.16, PLINTH, RIS.z1 - RIS.z0 + 0.16, RCX, 0, (RIS.z0 + RIS.z1) / 2)
    b.block('gcTrim', w + 0.14, 0.32, 1.6, RCX, BAND - 0.16, RIS.z1 - 0.7)
    b.block('gcRender', w, RIS_EAVE, 1.0, RCX, 0, RIS.z0 - 0.4)
    // frieze & cornice of the risalit
    b.block('gcTrim', w + 0.2, 0.25, 1.9, RCX, EAVE - 0.6, RIS.z1 - 0.8)
    b.block('gcTrim', w + 0.4, 0.35, 2.2, RCX, RIS_EAVE - 0.75, RIS.z1 - 0.9)
    b.block('gcTrim', w + 0.8, 0.4, 2.6, RCX, RIS_EAVE - 0.4, RIS.z1 - 1.0)
  }

  /* ================= main façade (+Z) ================= */
  const F = MAIN.z1
  bayRow(b, '+z', F, MAIN.x0 + 0.6, RIS.x0 - 0.4, 5)
  bayRow(b, '+z', F, RIS.x1 + 0.4, MAIN.x1 - 0.6, 5)
  lesenes(b, '+z', F, [MAIN.x0 + 0.35, MAIN.x1 - 0.35])
  {
    const fz = RIS.z1
    // paired lesenes on the risalit
    lesenes(b, '+z', fz, [RIS.x0 + 0.35, RIS.x0 + 1.1, RIS.x1 - 1.1, RIS.x1 - 0.35], RIS_EAVE - 0.75, 0.45)
    // gateway (round arch) with keystone
    const m = faceFrame('+z', fz, RCX, 0, 0)
    b.add('gcDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.2, 4.4, 0, 0.0, 12))), M(m, mat(0, 0, 0.03)))
    b.add('gcTrim', extrude(frameShape('round', 3.2, 4.4, 0.4, 0, 0.0), 0.16), M(m, mat(0, 0, 0.01)))
    b.add('gcTrim', metricBox(0.55, 0.75, 0.3), M(m, mat(0, 4.55, 0.15)))
    // windows either side of the gate
    for (const du of [-3.6, 3.6]) window_(b, '+z', fz, RCX + du, 1.7, { w: 1.25, h: 2.2, frame: 0.18, frameKey: 'gcTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 3] })
    // first floor: balcony door + two windows with segmental hoods
    for (const du of [-3.6, 0, 3.6]) {
      const isDoor = du === 0
      window_(b, '+z', fz, RCX + du, isDoor ? 6.2 : 6.7, { w: isDoor ? 1.5 : 1.3, h: isDoor ? 3.1 : 2.55, frame: 0.22, frameKey: 'gcTrim', glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
      const s = new THREE.Shape()
      s.absarc(0, -0.7, 1.15, Math.asin(0.7 / 1.15), Math.PI - Math.asin(0.7 / 1.15), false)
      b.add('gcTrim', extrude(s, 0.22, 10), M(faceFrame('+z', fz, RCX + du, 0, 0), mat(0, 9.6, 0.02)))
    }
    // balcony slab on consoles with iron railing
    const by = 6.0
    b.add('gcTrim', metricBox(9.4, 0.28, 1.2), M(m, mat(0, by, 0.6)))
    for (const du of [-4.2, -2.1, 2.1, 4.2]) b.add('gcTrim', metricBox(0.3, 0.7, 1.0), M(m, mat(du, by - 0.45, 0.5)))
    const rail = (a: THREE.Vector3, c: THREE.Vector3) => {
      b.beam('iron', a.clone().setY(by + 1.1), c.clone().setY(by + 1.1), 0.06, 0.06)
      b.beam('iron', a.clone().setY(by + 0.25), c.clone().setY(by + 0.25), 0.05, 0.05)
      const n = Math.floor(a.distanceTo(c) / 0.14)
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(c, i / n)
        b.rod('iron', p.clone().setY(by + 0.15), p.clone().setY(by + 1.1), 0.012, 4)
      }
    }
    const z1 = fz + 1.15
    rail(V(RCX - 4.65, 0, z1), V(RCX + 4.65, 0, z1))
    rail(V(RCX - 4.65, 0, fz), V(RCX - 4.65, 0, z1))
    rail(V(RCX + 4.65, 0, fz), V(RCX + 4.65, 0, z1))
  }

  /* ================= other façades ================= */
  // side elevations
  bayRow(b, '+x', MAIN.x1, -MAIN.z1 + 0.6, -WW.z0 - 0.6, 9)
  bayRow(b, '-x', MAIN.x0, EW.z0 + 0.6, MAIN.z1 - 0.6, 8)
  lesenes(b, '+x', MAIN.x1, [-MAIN.z1 + 0.35, -WW.z0 - 0.35])
  lesenes(b, '-x', MAIN.x0, [EW.z0 + 0.35, MAIN.z1 - 0.35])
  // wing ends
  bayRow(b, '-z', WW.z0, -WW.x1 + 0.5, -WW.x0 - 0.5, 2)
  bayRow(b, '-z', EW.z0, -EW.x1 + 0.5, -EW.x0 - 0.5, 2)
  // courtyard elevations
  bayRow(b, '-z', MAIN.z0, -WW.x0 + 0.5, 7.6, 3)
  bayRow(b, '-z', MAIN.z0, -5.2, -EW.x1 - 0.5, 3)
  bayRow(b, '-x', WW.x0, WW.z0 + 0.5, MAIN.z0 - 0.5, 4)
  bayRow(b, '+x', EW.x1, -MAIN.z0 + 0.5, -EW.z0 - 0.5, 4)
  // courtyard doors
  for (const [f, pl, u] of [
    ['-x', WW.x0, -9.0],
    ['+x', EW.x1, 7.0],
  ] as [Face, number, number][]) {
    const m = faceFrame(f, pl, u, 0, 0)
    b.add('gcDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('segment', 1.6, 2.8, 0, 0.0, 8))), M(m, mat(0, 0, 0.03)))
  }

  /* ================= roofs (natural titanium-zinc, after COLOR METAL's records) ================= */
  const ov = 0.45
  hippedRoof(b, ZN, { x: 0, z: (MAIN.z0 + MAIN.z1) / 2, w: MAIN.x1 - MAIN.x0, d: MAIN.z1 - MAIN.z0, y: EAVE, pitch: 32, overhang: ov, seams: SEAM })
  // rear wings: hipped, running into the main roof (north ends hidden under it)
  for (const r of [WW, EW]) {
    const w = r.x1 - r.x0
    const z1 = MAIN.z0 + w
    hippedRoof(b, ZN, { x: (r.x0 + r.x1) / 2, z: (r.z0 + z1) / 2, w, d: z1 - r.z0, y: EAVE, pitch: 32, overhang: ov, seams: SEAM })
  }
  // risalit roof: taller hip facing the square
  hippedRoof(b, ZN, { x: RCX, z: (RIS.z1 + 9.0) / 2, w: RIS.x1 - RIS.x0, d: RIS.z1 - 9.0, y: RIS_EAVE, pitch: 45, overhang: 0.5, seams: SEAM })
  // eave gutters on the street front
  for (const [x0, x1] of [
    [MAIN.x0 - ov, RIS.x0 - 0.5],
    [RIS.x1 + 0.5, MAIN.x1 + ov],
  ]) b.beam(ZN, V(x0, EAVE - 0.3, MAIN.z1 + ov), V(x1, EAVE - 0.3, MAIN.z1 + ov), 0.2, 0.18)
  // small roof windows on the risalit roof (photo 03)
  for (const dx of [-1.6, 1.6]) {
    const z = 16.4
    const y = RIS_EAVE + (RIS.z1 + 0.5 - z) * Math.tan((45 * Math.PI) / 180) + 0.06
    b.add('skylight', metricBox(0.6, 0.06, 0.8), mat(RCX + dx, y, z, 0, -Math.PI / 4))
  }
  // downpipes (zinc)
  for (const x of [MAIN.x0 + 0.4, RIS.x0 - 0.35, RIS.x1 + 0.35, MAIN.x1 - 0.4]) b.rod(ZN, V(x, 0.3, MAIN.z1 + 0.15), V(x, EAVE - 0.4, MAIN.z1 + 0.15), 0.06, 8)

  /* ================= chimneys ================= */
  const ridgeY = EAVE + ((MAIN.z1 - MAIN.z0) / 2) * Math.tan((32 * Math.PI) / 180)
  chimney(b, -13.5, ridgeY - 1.5, 12.5)
  chimney(b, 10.5, ridgeY - 1.5, 12.5)
  chimney(b, 17.5, ridgeY - 1.2, 8.0)
  chimney(b, -20.0, ridgeY - 1.2, 8.0)
  chimney(b, 24.1, EAVE + 1.8, -9.0, 2.4)
  chimney(b, -24.8, EAVE + 1.8, -7.0, 2.4)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [12, 14, 12],
  materials: () => ({
    gcRender: new THREE.MeshStandardMaterial({ color: '#e2ddd1', roughness: 0.9 }),
    gcTrim: new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.85 }),
    gcPlinth: new THREE.MeshStandardMaterial({ color: '#bdb8ac', roughness: 0.9 }),
    gcDoor: new THREE.MeshStandardMaterial({ color: '#2f2b27', roughness: 0.65 }),
  }),
  notes:
    'Two-storey baroque garrison headquarters with a central risalit, gateway and balcony; the hipped roofs are shown in natural titanium-zinc standing seam (COLOR METAL records) because the photographs predate the works.',
}
export default model
