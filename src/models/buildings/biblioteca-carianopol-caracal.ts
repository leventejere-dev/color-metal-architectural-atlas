/**
 * Biblioteca Municipală „Virgil Carianopol”, Caracal (Str. Iancu Jianu 18A) —
 * single-storey eclectic villa on a raised ground floor; roof re-covered in
 * natural titanium-zinc supplied by COLOR METAL (2020–2021).
 *
 * Modelling specification (real metres). Only one usable exterior photograph
 * exists (01: frontal view from the garden, library website banner), so this is
 * a preliminary model:
 *  - Location: the building is not tagged in OSM; the light-grey roof on the
 *    south side of Str. Iancu Jianu next to the address point (untagged OSM
 *    way 1061811396, aerial imagery) is taken as the library. Its street front
 *    runs at ≈ 76°/256°: +X = 256° (WSW), +Z = 346° = the front towards the street.
 *  - Size from the photograph (door ≈ 3.0 m incl. transom, windows ≈ 1.1 m):
 *    front ≈ 22 m, depth assumed 12 m; raised ground floor (socle 1.1 m, six
 *    steps), eave ≈ 5.4 m.
 *  - Symmetrical front: central entrance bay (door with transom, steps) crowned
 *    by a tall bell-shaped (ogee) roof with an arched clock gable; two windows
 *    either side; two slightly projecting end risalits with paired windows and
 *    hipped ends; red-painted segmental hoods and bands over the windows;
 *    eyebrow vents on the front slope, two chimneys, spike finials.
 *  - COLOR METAL scope: the photograph shows the old red-painted sheet roof,
 *    so the main hipped roof (≈ 30°), the risalit roofs and the central bell
 *    roof are shown in natural titanium-zinc standing seam (0.5 m pans)
 *    according to the COLOR METAL records; which surfaces were re-covered is
 *    not documented.
 * Approximations: depth, rear and side elevations (not photographed), exact
 * window count, ornament, roof pitches and the identification of the exact
 * building (±150 m) are uncertain.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, window_, door, seams, faceFrame, hippedRoof, loft, rectRing, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const REN = 'carRender'
const RED = 'carRed'
const TRM = 'carTrim'

const HX = 11.0
const HZ = 6.0
const RIS = { x0: 7.6, z: HZ + 0.5 } // end risalits (|x| from x0 to HX), front at z
const CEN = { hx: 2.0, z: HZ + 0.5 } // central bay
const SOCLE = 1.1
const EAVE = 5.4
const PITCH = 30

/** Window with white frame, glazing bars, red segmental hood and sill. */
function carWindow(b: Builder, face: Face, plane: number, u: number, w = 1.1, h = 2.25, y0 = 1.85) {
  window_(b, face, plane, u, y0, { w, h, frame: 0.14, frameKey: TRM, glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0, { w: w - 0.06, h: h - 0.04, frame: 0.05, frameKey: TRM, glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  // red segmental hood
  const s = new THREE.Shape()
  const r = w / 2 + 0.35
  s.moveTo(-r, y0 + h + 0.05)
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI - (i / 10) * Math.PI
    s.lineTo(Math.cos(a) * r, y0 + h + 0.05 + Math.sin(a) * 0.35)
  }
  s.lineTo(r, y0 + h + 0.05)
  s.lineTo(r, y0 + h - 0.1)
  s.lineTo(-r, y0 + h - 0.1)
  b.add(RED, new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), m)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  b.block(REN, 2 * HX, EAVE, 2 * HZ, 0, 0, 0)
  b.block('carSocle', 2 * HX + 0.16, SOCLE, 2 * HZ + 0.16, 0, 0, 0)
  b.block(TRM, 2 * HX + 0.2, 0.12, 2 * HZ + 0.2, 0, SOCLE, 0)
  // eave cornice + red frieze band
  b.block(RED, 2 * HX + 0.06, 0.32, 2 * HZ + 0.06, 0, EAVE - 0.75, 0)
  b.block(TRM, 2 * HX + 0.45, 0.3, 2 * HZ + 0.45, 0, EAVE - 0.3, 0)
  for (const sx of [-1, 1]) {
    const cx = sx * (RIS.x0 + HX) / 2
    const w = HX - RIS.x0
    b.block(REN, w, EAVE, RIS.z - HZ, cx, 0, (HZ + RIS.z) / 2)
    b.block('carSocle', w + 0.16, SOCLE, RIS.z - HZ + 0.16, cx, 0, (HZ + RIS.z) / 2)
    b.block(RED, w + 0.06, 0.32, RIS.z - HZ + 0.06, cx, EAVE - 0.75, (HZ + RIS.z) / 2)
    b.block(TRM, w + 0.45, 0.3, RIS.z - HZ + 0.45, cx, EAVE - 0.3, (HZ + RIS.z) / 2)
    // corner pilasters
    for (const x of [sx * (RIS.x0 + 0.2), sx * (HX - 0.2)]) b.block(TRM, 0.42, EAVE - SOCLE - 0.75, 0.1, x, SOCLE, RIS.z + 0.05)
  }
  b.block(REN, 2 * CEN.hx, EAVE, CEN.z - HZ, 0, 0, (HZ + CEN.z) / 2)
  b.block('carSocle', 2 * CEN.hx + 0.16, SOCLE, CEN.z - HZ + 0.16, 0, 0, (HZ + CEN.z) / 2)
  b.block(TRM, 2 * CEN.hx + 0.45, 0.3, CEN.z - HZ + 0.45, 0, EAVE - 0.3, (HZ + CEN.z) / 2)
  for (const x of [-CEN.hx + 0.2, CEN.hx - 0.2]) b.block(TRM, 0.4, EAVE - SOCLE - 0.3, 0.1, x, SOCLE, CEN.z + 0.05)

  /* ================= front (+Z) ================= */
  for (const x of [-5.6, -3.7, 3.7, 5.6]) carWindow(b, '+z', HZ, x)
  for (const sx of [-1, 1]) for (const d of [-0.68, 0.68]) carWindow(b, '+z', RIS.z, sx * ((RIS.x0 + HX) / 2) + d, 0.95)
  // entrance: red door with transom, hood, steps
  door(b, '+z', CEN.z, 0, { w: 1.5, h: 2.3, y0: SOCLE, leafKey: 'carDoor', frameKey: TRM, frame: 0.18 })
  window_(b, '+z', CEN.z, 0, SOCLE + 2.38, { w: 1.5, h: 0.6, frame: 0.12, frameKey: TRM, glassKey: 'glassC', bars: [3, 1] })
  b.add(RED, metricBox(2.4, 0.22, 0.3), mat(0, SOCLE + 3.2, CEN.z + 0.15))
  for (let i = 0; i < 6; i++) b.block('carSocle', 2.8, SOCLE * (1 - i / 6), 0.32, 0, 0, CEN.z + 0.16 + i * 0.32)
  // small round ornaments in the frieze (photo 01)
  for (const x of [-1.2, -0.4, 0.4, 1.2]) b.add(TRM, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), mat(x, EAVE - 0.95, CEN.z + 0.03, 0, Math.PI / 2))

  /* ================= sides & rear (not photographed: plain rhythm) ================= */
  for (const f of ['+x', '-x'] as Face[]) for (const u of [-3.2, 0, 3.2]) carWindow(b, f, f === '+x' ? HX : -HX, u)
  for (const x of [-8.5, -5.5, -2.5, 2.5, 5.5, 8.5]) carWindow(b, '-z', -HZ, x)
  door(b, '-z', -HZ, 0, { w: 1.2, h: 2.2, y0: 0.2, leafKey: 'carDoor', frameKey: TRM, frame: 0.15 })

  /* ================= roofs (natural titanium-zinc) ================= */
  const OH = 0.45
  const t = Math.tan((PITCH * Math.PI) / 180)
  hippedRoof(b, ZN, { w: 2 * HX, d: 2 * HZ, y: EAVE, pitch: PITCH, overhang: OH, seams: SEAM })
  // end risalits: hipped projections towards the front
  for (const sx of [-1, 1]) {
    const w = HX - RIS.x0
    const cx = sx * (RIS.x0 + HX) / 2
    const z0 = HZ - 3.2
    hippedRoof(b, ZN, { x: cx, z: (z0 + RIS.z) / 2, w, d: RIS.z - z0, y: EAVE, pitch: 40, overhang: OH, seams: SEAM })
    // spike finial
    const apexY = EAVE + (w / 2) * Math.tan((40 * Math.PI) / 180)
    b.rod(ZN, V(cx, apexY, RIS.z - w / 2), V(cx, apexY + 1.3, RIS.z - w / 2), 0.04, 6)
    b.add(ZN, new THREE.SphereGeometry(0.1, 8, 6), mat(cx, apexY + 0.4, RIS.z - w / 2))
  }
  // eyebrow vents on the front slope
  for (const x of [-5.0, -3.0, 3.0, 5.0]) {
    const z = HZ - 0.9
    const y = EAVE + (HZ - z) * t
    b.add(ZN, new THREE.CylinderGeometry(0.42, 0.42, 0.9, 12, 1, false, -Math.PI / 2, Math.PI), mat(x, y, z + 0.1, 0, Math.PI / 2, 0, 1, 1, 0.7))
    b.add('glassC', new THREE.CircleGeometry(0.33, 12, 0, Math.PI), mat(x, y, z + 0.56))
  }
  // central bell roof with the arched clock gable
  {
    const hw = CEN.hx + 0.1
    const z0 = HZ - 2.2
    const z1 = CEN.z + 0.2
    const cz = (z0 + z1) / 2
    const hd = (z1 - z0) / 2
    const prof: [number, number][] = [
      [1.0, 0],
      [0.94, 0.12],
      [0.86, 0.3],
      [0.84, 0.45],
      [0.74, 0.62],
      [0.52, 0.8],
      [0.26, 0.93],
      [0.08, 1.0],
    ]
    const H = 4.2
    b.add(ZN, loft(prof.map(([f, y]) => rectRing(hw * f + 0.2 * (1 - f), hd * f + 0.2 * (1 - f), EAVE + y * H, 0, cz)), { capTop: true }))
    // ribs on the bell edges
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < prof.length - 1; i++) {
          const p = prof[i]
          const q = prof[i + 1]
          const A = V(sx * (hw * p[0] + 0.2 * (1 - p[0])), EAVE + p[1] * H, cz + sz * (hd * p[0] + 0.2 * (1 - p[0])))
          const B = V(sx * (hw * q[0] + 0.2 * (1 - q[0])), EAVE + q[1] * H, cz + sz * (hd * q[0] + 0.2 * (1 - q[0])))
          b.beam(ZN, A, B, 0.08, 0.06, V(sx, 0, sz).normalize())
        }
      }
    }
    // arched clock gable in front of the bell
    const g = new THREE.Shape()
    g.moveTo(-1.5, EAVE - 0.05)
    g.lineTo(-1.5, EAVE + 1.2)
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI - (i / 16) * Math.PI
      g.lineTo(Math.cos(a) * 1.5, EAVE + 1.2 + Math.sin(a) * 1.5)
    }
    g.lineTo(1.5, EAVE - 0.05)
    b.add(TRM, new THREE.ExtrudeGeometry(g, { depth: 0.45, bevelEnabled: false }), mat(0, 0, CEN.z - 0.2))
    b.add('carClockRim', new THREE.CylinderGeometry(0.72, 0.72, 0.08, 28), mat(0, EAVE + 1.3, CEN.z + 0.29, 0, Math.PI / 2))
    b.add('carClock', new THREE.CylinderGeometry(0.55, 0.55, 0.1, 28), mat(0, EAVE + 1.3, CEN.z + 0.31, 0, Math.PI / 2))
    b.add('iron', metricBox(0.05, 0.42, 0.03), mat(0, EAVE + 1.45, CEN.z + 0.37))
    b.add('iron', metricBox(0.32, 0.05, 0.03), mat(0.13, EAVE + 1.3, CEN.z + 0.37))
    b.rod(ZN, V(0, EAVE + H, cz), V(0, EAVE + H + 1.1, cz), 0.04, 6)
    b.add(ZN, new THREE.SphereGeometry(0.12, 8, 6), mat(0, EAVE + H + 0.3, cz))
  }
  // chimneys
  for (const x of [-6.2, 6.4]) {
    b.block(REN, 0.75, 1.9, 0.75, x, 7.8, -1.2)
    b.block(TRM, 0.95, 0.16, 0.95, x, 9.7, -1.2)
  }
  // gutters & downpipes
  const ey = EAVE - OH * t - 0.05
  b.beam(ZN, V(-HX - OH, ey, -HZ - OH), V(HX + OH, ey, -HZ - OH), 0.18, 0.16)
  for (const x of [-RIS.x0 + 0.2, RIS.x0 - 0.2]) b.rod(ZN, V(x, 0.3, HZ + 0.12), V(x, EAVE - 0.3, HZ + 0.12), 0.05, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [5, 7, 2],
  materials: () => ({
    carRender: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.9 }),
    carTrim: new THREE.MeshStandardMaterial({ color: '#f8f7f3', roughness: 0.82 }),
    carRed: new THREE.MeshStandardMaterial({ color: '#a4473f', roughness: 0.8 }),
    carSocle: new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.9 }),
    carDoor: new THREE.MeshStandardMaterial({ color: '#8a3a33', roughness: 0.6 }),
    carClock: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.6 }),
    carClockRim: new THREE.MeshStandardMaterial({ color: '#4d6b8a', roughness: 0.7 }),
  }),
  notes:
    'Preliminary model from a single frontal photograph: single-storey eclectic villa with a clock-crowned central bay and two end risalits; roofs shown in natural titanium-zinc per the COLOR METAL records (the photograph shows the earlier red-painted roof); depth and rear sides assumed.',
}
export default model
