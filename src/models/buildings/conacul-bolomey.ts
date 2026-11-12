/**
 * Conacul Bolomey, Cosâmbești (Ialomița) — eclectic manor of 1898 ("Micul Peleș
 * din Bărăgan"), restored with EU funds; roofs re-covered in elZinc Slate
 * (pre-weathered dark grey titanium-zinc) supplied by COLOR METAL.
 *
 * Modelling specification (real metres, +X = east along the OSM long axis 90.2°,
 * +Z = south = main façade facing the DN2A road; OSM way 369896595, 23.5 × 20.2 m):
 *  - Near-square two-storey block 22.4 × 18.8 m on a raised basement: socle to
 *    1.3 m, ground floor to the string course at ≈ 6.8 m (= terrace level),
 *    upper floor to the main entablature, cornice top (eave) at 13.0 m.
 *    Heights scaled from the frontal photos 01 (2021) and 03 (2013) using the
 *    façade width between the corner turrets.
 *  - Four round corner turrets ("open bow windows"): corbelled out at the
 *    upper-floor level, an open loggia with five columns on a balustrade, a
 *    cornice continuing the main cornice, a short drum and a tall ogee/bell cap
 *    with a ball-and-spike finial (photos 02, 03, 05).
 *  - Central belvedere (≈ 10.4 × 8 m) rising ≈ 3.8 m above the eave with two
 *    windows per long side and its own low hipped roof (photos 03, 04).
 *  - Main façade (+Z): two window bays each side of a central porch with four
 *    Corinthian columns on pedestals carrying the first-floor terrace with a
 *    balustrade; three French windows open onto the terrace (02, 03).
 *  - Rear (−Z): shallow central risalit with a tall arched staircase window,
 *    flanked by two chimneys (04); sides with four bays per floor.
 *  - Restored state (05, 2025): cream render, white stucco window surrounds
 *    with pilasters and cornice hoods, balconettes under the upper windows,
 *    dark-brown timber windows.
 *  - COLOR METAL scope: low hipped main roof (≈ 17°), belvedere roof, turret
 *    caps and cornice cappings in elZinc Slate standing seam (0.5 m pans); the
 *    finished roof itself is not visible in the available photographs (01 shows
 *    the new timber structure under scaffolding), so pitch and coverage are
 *    interpreted; the turret caps follow the restored cap in photo 05.
 * Approximations: exact heights, rear/side window counts, porch column count,
 * stucco ornament and the loggia arcades simplified; OSM chamfers at the rear
 * corners read as the rear turrets.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, window_, door, seams, faceFrame, hippedRoof, dome, lathe, type Face } from '../kit'
import type { ModelModule } from '../registry'

const HX = 11.2
const HZ = 9.4
const SOCLE = 1.3
const STRING = 6.8
const EAVE = 13.0
const PITCH = 17
const R_T = 1.75 // turret radius
const T_OFF = 0.45 // turret centre offset beyond the corner (each axis)
const BEL = { hx: 5.2, hz: 4.0, top: 16.8 }

const Z = 'zincSlate'
const SEAM = seams(Z, 0.5, 0.05, 0.045)
const REN = 'bolRender'
const STU = 'bolStucco'
const FR = 'bolFrame'
const SOC = 'bolSocle'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** Window with stucco surround, dark timber frame and glazing bars, framing pilasters, hood and optional balconette. */
function bolWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, o: { hood?: boolean; balc?: boolean; arch?: boolean } = {}) {
  const type = o.arch ? 'round' : 'rect'
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.16, frameKey: STU, glassKey: 'glassC', inset: 0.03, sill: !o.balc })
  window_(b, face, plane, u, y0, { type, w: w - 0.1, h: h - 0.05, frame: 0.06, frameKey: FR, glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  // framing pilasters with small capitals
  for (const s of [-1, 1]) {
    b.add(STU, metricBox(0.3, h + 0.3, 0.12), M(m, mat(s * (w / 2 + 0.4), y0 - 0.1 + (h + 0.3) / 2, 0.06)))
    b.add(STU, metricBox(0.42, 0.18, 0.2), M(m, mat(s * (w / 2 + 0.4), y0 + h + 0.12, 0.1)))
  }
  if (o.hood) {
    b.add(STU, metricBox(w + 1.1, 0.34, 0.12), M(m, mat(0, y0 + h + 0.38, 0.06)))
    b.add(STU, metricBox(w + 1.4, 0.16, 0.34), M(m, mat(0, y0 + h + 0.62, 0.17)))
    b.add(Z, metricBox(w + 1.44, 0.03, 0.38), M(m, mat(0, y0 + h + 0.715, 0.19)))
  }
  if (o.balc) {
    // balconette: slab + balusters + rail spanning the pilasters
    const bw = w + 1.0
    b.add(STU, metricBox(bw + 0.2, 0.16, 0.5), M(m, mat(0, y0 - 0.12, 0.25)))
    for (let i = 0; i <= 6; i++) b.add(STU, new THREE.CylinderGeometry(0.05, 0.07, 0.55, 6), M(m, mat(-bw / 2 + (i * bw) / 6, y0 + 0.24, 0.4)))
    b.add(STU, metricBox(bw + 0.1, 0.1, 0.18), M(m, mat(0, y0 + 0.56, 0.4)))
  }
}

/** Round corner turret: corbel, open columned loggia, cornice, drum, ogee cap with finial. */
function turret(b: Builder, sx: number, sz: number) {
  const cx = sx * (HX + T_OFF)
  const cz = sz * (HZ + T_OFF)
  const a0 = Math.atan2(sz, sx) // outward diagonal (x = cos, z = sin)
  const a1 = a0 - (3 * Math.PI) / 4
  const a2 = a0 + (3 * Math.PI) / 4
  const arc = (r: number, h: number, y: number, key: string, open = true) =>
    b.add(key, new THREE.CylinderGeometry(r, r, h, 28, 1, open, Math.PI / 2 - a2, a2 - a1), mat(cx, y + h / 2, cz))
  // corbel (moulded inverted cone)
  const corbel: [number, number][] = [
    [0.0, 4.4],
    [0.35, 4.45],
    [0.6, 4.9],
    [0.95, 5.6],
    [1.35, 6.2],
    [1.6, 6.55],
    [R_T + 0.12, 6.75],
    [R_T + 0.2, 6.95],
    [0.0, 6.95],
  ]
  b.add(STU, lathe(corbel, 28), mat(cx, 0, cz))
  // loggia floor + balustrade
  b.add(STU, new THREE.CylinderGeometry(R_T + 0.22, R_T + 0.22, 0.28, 28), mat(cx, 7.09, cz))
  arc(R_T + 0.05, 0.14, 7.23, STU, false)
  for (let k = 0; k <= 18; k++) {
    const a = a1 + ((a2 - a1) * k) / 18
    b.add(STU, new THREE.CylinderGeometry(0.05, 0.075, 0.62, 6), mat(cx + Math.cos(a) * (R_T - 0.05), 7.68, cz + Math.sin(a) * (R_T - 0.05)))
  }
  arc(R_T + 0.02, 0.14, 7.99, STU, false)
  // dark loggia interior (back wall of the open bow)
  b.add('glassC', new THREE.CylinderGeometry(R_T - 0.75, R_T - 0.75, 3.9, 20), mat(cx, 7.23 + 1.95, cz))
  // five columns with capitals
  for (let k = 0; k <= 4; k++) {
    const a = a1 + ((a2 - a1) * k) / 4
    const x = cx + Math.cos(a) * (R_T - 0.22)
    const z = cz + Math.sin(a) * (R_T - 0.22)
    b.add(STU, new THREE.CylinderGeometry(0.15, 0.17, 2.75, 12), mat(x, 8.13 + 1.375, z))
    b.add(STU, metricBox(0.42, 0.22, 0.42), mat(x, 10.98, z))
  }
  // arcade spandrel band + cornice + frieze
  arc(R_T, 1.35, 11.08, REN, false)
  b.add(STU, new THREE.CylinderGeometry(R_T + 0.12, R_T + 0.12, 0.22, 28, 1, false), mat(cx, 12.5, cz))
  b.add(STU, new THREE.CylinderGeometry(R_T + 0.35, R_T + 0.2, 0.42, 28, 1, false), mat(cx, 12.8, cz))
  b.add(Z, new THREE.CylinderGeometry(R_T + 0.37, R_T + 0.37, 0.04, 28, 1, false), mat(cx, 13.03, cz))
  // drum
  b.add(REN, new THREE.CylinderGeometry(R_T - 0.05, R_T - 0.05, 0.85, 28, 1, false), mat(cx, 13.05 + 0.425, cz))
  b.add(STU, new THREE.CylinderGeometry(R_T + 0.08, R_T + 0.08, 0.16, 28, 1, false), mat(cx, 13.9, cz))
  // ogee cap (photo 05): flared skirt, slight swell, long point
  const prof: [number, number][] = [
    [1.06, 0.0],
    [0.97, 0.04],
    [0.86, 0.1],
    [0.77, 0.19],
    [0.74, 0.3],
    [0.74, 0.4],
    [0.69, 0.5],
    [0.58, 0.61],
    [0.44, 0.72],
    [0.29, 0.83],
    [0.15, 0.92],
    [0.05, 0.98],
    [0.02, 1.0],
  ]
  dome(b, Z, { x: cx, y: 13.98, z: cz, r: R_T, h: 3.6, profile: prof, seg: 32, ribs: 16, ribH: 0.035 })
  // finial: collar, ball, spike
  b.add(Z, new THREE.CylinderGeometry(0.08, 0.14, 0.35, 10), mat(cx, 17.7, cz))
  b.add(Z, new THREE.SphereGeometry(0.17, 12, 8), mat(cx, 18.02, cz))
  b.rod(Z, V(cx, 18.1, cz), V(cx, 19.4, cz), 0.035, 6)
  b.add(Z, new THREE.SphereGeometry(0.07, 8, 6), mat(cx, 18.75, cz))
}

function build(): Builder {
  const b = new Builder()

  /* ================= main block ================= */
  b.block(REN, 2 * HX, EAVE - 0.9, 2 * HZ, 0, 0, 0)
  b.block(SOC, 2 * HX + 0.16, SOCLE, 2 * HZ + 0.16, 0, 0, 0)
  b.block(STU, 2 * HX + 0.2, 0.12, 2 * HZ + 0.2, 0, SOCLE, 0)
  // string course at terrace level
  b.block(STU, 2 * HX + 0.24, 0.36, 2 * HZ + 0.24, 0, STRING - 0.18, 0)
  b.block(Z, 2 * HX + 0.28, 0.03, 2 * HZ + 0.28, 0, STRING + 0.18, 0)
  // entablature: architrave, frieze, modillion cornice, zinc capping
  b.block(STU, 2 * HX + 0.1, 0.3, 2 * HZ + 0.1, 0, EAVE - 1.3, 0)
  b.block(REN, 2 * HX + 0.04, 0.45, 2 * HZ + 0.04, 0, EAVE - 1.0, 0)
  b.block(STU, 2 * HX + 0.5, 0.2, 2 * HZ + 0.5, 0, EAVE - 0.55, 0)
  b.block(STU, 2 * HX + 0.9, 0.35, 2 * HZ + 0.9, 0, EAVE - 0.35, 0)
  b.block(Z, 2 * HX + 0.96, 0.04, 2 * HZ + 0.96, 0, EAVE - 0.02, 0)
  for (let x = -HX + 1.6; x <= HX - 1.5; x += 0.75) {
    for (const s of [-1, 1]) b.block(STU, 0.14, 0.2, 0.32, x, EAVE - 0.75, s * (HZ + 0.15))
  }
  for (let z = -HZ + 1.6; z <= HZ - 1.5; z += 0.75) {
    for (const s of [-1, 1]) b.block(STU, 0.32, 0.2, 0.14, s * (HX + 0.15), EAVE - 0.75, z)
  }
  // rusticated corner strips (between the turrets' corbels and the socle)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let y = SOCLE + 0.2; y < 4.3; y += 0.55) {
        b.block(STU, 0.9, 0.42, 0.1, sx * (HX - 0.45), y, sz * (HZ + 0.05))
        b.block(STU, 0.1, 0.42, 0.9, sx * (HX + 0.05), y, sz * (HZ - 0.45))
      }
    }
  }

  /* ================= turrets ================= */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turret(b, sx, sz)

  /* ================= main façade (+Z) ================= */
  const GF = 2.35 // ground-floor sill
  const FF = 7.75 // first-floor sill
  for (const x of [-8.1, -5.5, 5.5, 8.1]) {
    bolWindow(b, '+z', HZ, x, GF, 1.25, 2.75, { hood: true })
    bolWindow(b, '+z', HZ, x, FF, 1.25, 2.75, { hood: true, balc: true })
  }
  // behind the porch: door + two windows (ground), three French windows (terrace)
  door(b, '+z', HZ, 0, { w: 1.7, h: 3.4, y0: SOCLE, leafKey: FR, frameKey: STU, frame: 0.22 })
  for (const x of [-2.5, 2.5]) bolWindow(b, '+z', HZ, x, GF, 1.2, 2.75)
  for (const x of [-2.5, 0, 2.5]) bolWindow(b, '+z', HZ, x, STRING + 0.25, 1.25, 3.3, { hood: true })

  /* ================= porch with terrace ================= */
  {
    const z0 = HZ
    const z1 = HZ + 3.7
    const hx = 4.5
    // low porch platform; inner flight up to the raised entrance between the middle columns
    b.block(SOC, 2 * hx + 0.3, 0.18, z1 - z0 + 0.3, 0, 0, (z0 + z1) / 2 + 0.15)
    for (let i = 0; i < 5; i++) b.block(SOC, 2.3, 0.18 + ((SOCLE - 0.18) * (i + 1)) / 5, 0.36, 0, 0, z0 + 2.0 - i * 0.36)
    b.block(SOC, 2.3, SOCLE, 0.4, 0, 0, z0 + 0.2)
    const colXs = [-3.9, -1.35, 1.35, 3.9]
    const colTop = STRING - 0.75
    for (const x of colXs) {
      for (const z of x === colXs[0] || x === colXs[3] ? [z1 - 0.45, z0 + 0.55] : [z1 - 0.45]) {
        b.block(STU, 0.9, 1.45, 0.9, x, 0.18, z)
        b.block(STU, 1.0, 0.14, 1.0, x, 1.63, z)
        b.add(STU, new THREE.CylinderGeometry(0.27, 0.31, colTop - 1.77 - 0.5, 16), mat(x, 1.77 + (colTop - 2.27) / 2, z))
        // Corinthian capital (bell + abacus)
        b.add(STU, new THREE.CylinderGeometry(0.42, 0.29, 0.5, 14), mat(x, colTop - 0.25, z))
        b.block(STU, 0.88, 0.14, 0.88, x, colTop, z)
      }
    }
    // entablature + terrace slab with zinc capping
    b.block(STU, 2 * hx + 0.2, 0.55, z1 - z0 + 0.1, 0, colTop + 0.14, (z0 + z1) / 2 + 0.05)
    b.block(STU, 2 * hx + 0.5, 0.2, z1 - z0 + 0.35, 0, STRING - 0.06, (z0 + z1) / 2 + 0.15)
    b.block(Z, 2 * hx + 0.54, 0.03, z1 - z0 + 0.38, 0, STRING + 0.14, (z0 + z1) / 2 + 0.15)
    // terrace balustrade with pedestals
    const by = STRING + 0.17
    const runs: [THREE.Vector3, THREE.Vector3][] = [
      [V(-hx, by, z1), V(hx, by, z1)],
      [V(-hx, by, z0 + 0.2), V(-hx, by, z1)],
      [V(hx, by, z0 + 0.2), V(hx, by, z1)],
    ]
    for (const [a, c] of runs) {
      const L = a.distanceTo(c)
      const n = Math.round(L / 0.3)
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(c, i / n)
        b.add(STU, new THREE.CylinderGeometry(0.055, 0.08, 0.68, 6), mat(p.x, by + 0.42, p.z))
      }
      b.beam(STU, a.clone().setY(by + 0.06), c.clone().setY(by + 0.06), 0.28, 0.12)
      b.beam(STU, a.clone().setY(by + 0.84), c.clone().setY(by + 0.84), 0.3, 0.14)
    }
    for (const x of [-hx, -1.35, 1.35, hx]) b.block(STU, 0.42, 1.0, 0.42, x, by, z1)
  }

  /* ================= rear façade (−Z) ================= */
  {
    // central staircase risalit
    b.block(REN, 7.2, EAVE - 1.3, 0.5, 0, 0, -HZ - 0.25)
    b.block(SOC, 7.36, SOCLE, 0.66, 0, 0, -HZ - 0.25)
    b.block(STU, 7.4, 0.36, 0.74, 0, STRING - 0.18, -HZ - 0.25)
    b.block(STU, 7.7, 0.35, 0.9, 0, EAVE - 1.3, -HZ - 0.3)
    bolWindow(b, '-z', -HZ - 0.5, 0, 3.4, 2.1, 7.4, { arch: true })
    door(b, '-z', -HZ - 0.5, 0, { w: 1.5, h: 2.2, y0: 0.0, leafKey: FR, frameKey: STU, frame: 0.18 })
    for (const x of [-8.1, -5.4, 5.4, 8.1]) {
      bolWindow(b, '-z', -HZ, x, GF, 1.25, 2.75, { hood: true })
      bolWindow(b, '-z', -HZ, x, FF, 1.25, 2.75, { hood: true, balc: true })
    }
  }
  /* ================= side façades (±X) ================= */
  for (const f of ['+x', '-x'] as Face[]) {
    for (const u of [-5.3, -1.8, 1.8, 5.3]) {
      bolWindow(b, f, f === '+x' ? HX : -HX, u, GF, 1.25, 2.75, { hood: true })
      bolWindow(b, f, f === '+x' ? HX : -HX, u, FF, 1.25, 2.75, { hood: true, balc: true })
    }
  }
  // basement vents in the socle
  for (const x of [-8.1, -5.5, 5.5, 8.1]) for (const s of [-1, 1]) b.block('glassC', 0.7, 0.4, 0.04, x, 0.5, s * (HZ + 0.09))

  /* ================= roofs (elZinc Slate) ================= */
  hippedRoof(b, Z, { w: 2 * HX, d: 2 * HZ, y: EAVE, pitch: PITCH, overhang: 0.55, seams: SEAM })
  // eave gutters
  {
    const t = Math.tan((PITCH * Math.PI) / 180)
    const ey = EAVE - 0.55 * t - 0.05
    const c = [V(-HX - 0.55, ey, -HZ - 0.55), V(HX + 0.55, ey, -HZ - 0.55), V(HX + 0.55, ey, HZ + 0.55), V(-HX - 0.55, ey, HZ + 0.55)]
    for (let i = 0; i < 4; i++) b.beam(Z, c[i], c[(i + 1) % 4], 0.2, 0.18)
  }
  // belvedere
  {
    const { hx, hz, top } = BEL
    b.block(REN, 2 * hx, top - EAVE + 0.4, 2 * hz, 0, EAVE - 0.4, 0)
    b.block(STU, 2 * hx + 0.2, 0.25, 2 * hz + 0.2, 0, top - 0.9, 0)
    b.block(STU, 2 * hx + 0.55, 0.3, 2 * hz + 0.55, 0, top - 0.3, 0)
    b.block(Z, 2 * hx + 0.6, 0.04, 2 * hz + 0.6, 0, top - 0.02, 0)
    for (const f of ['+z', '-z'] as Face[]) for (const u of [-2.2, 2.2]) bolWindow(b, f, f === '+z' ? hz : -hz, u, EAVE + 0.9, 1.0, 1.6)
    for (const f of ['+x', '-x'] as Face[]) bolWindow(b, f, f === '+x' ? hx : -hx, 0, EAVE + 0.9, 1.0, 1.6)
    hippedRoof(b, Z, { w: 2 * hx, d: 2 * hz, y: top, pitch: 15, overhang: 0.35, seams: SEAM })
    // corner pilasters
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(STU, 0.45, top - EAVE - 0.9, 0.45, sx * (hx - 0.1), EAVE, sz * (hz - 0.1))
  }
  // chimneys flanking the rear risalit (photo 04)
  for (const x of [-4.4, 4.4]) {
    const z = -HZ + 1.6
    b.block(REN, 1.0, 17.6 - EAVE + 0.5, 1.4, x, EAVE - 0.5, z)
    b.block(STU, 1.3, 0.25, 1.7, x, 17.35, z)
    b.block(Z, 1.1, 0.12, 1.5, x, 17.6, z)
  }
  // zinc downpipes beside the turrets
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(Z, V(sx * (HX - 2.0), 0.3, sz * (HZ + 0.12)), V(sx * (HX - 2.0), EAVE - 0.4, sz * (HZ + 0.12)), 0.06, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [5, 14.5, 4],
  materials: () => ({
    bolRender: new THREE.MeshStandardMaterial({ color: '#eadfc6', roughness: 0.88 }),
    bolStucco: new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.8 }),
    bolSocle: new THREE.MeshStandardMaterial({ color: '#d8d1c0', roughness: 0.9 }),
    bolFrame: new THREE.MeshStandardMaterial({ color: '#4a3325', roughness: 0.6 }),
  }),
  notes:
    'Eclectic two-storey manor with four round corner turrets (open loggias, ogee caps), a central belvedere and a columned porch with terrace; restored state, low hipped roofs and turret caps in elZinc Slate standing seam (roof pitch and coverage interpreted).',
}
export default model
