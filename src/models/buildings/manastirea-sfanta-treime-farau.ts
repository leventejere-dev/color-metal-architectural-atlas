/**
 * Mănăstirea «Sfânta Treime» Fărău (Alba) — the monastery church: the Holy Trinity
 * wooden church moved here from Șilea (log church on a high stone plinth).
 *
 * Modelling specification (real metres; origin = centre of the church walls at ground):
 *  - Axis: OSM way 512605871 is a coarse 10-node trace, long axis 27.7°. Its rounded
 *    end lies at the NNE, and the sun in the November photos lights the stair side in
 *    the morning (01) and the opposite side in the afternoon (03, 04), so the axis runs
 *    NNE–SSW: +X = 27.7° towards the polygonal apse, the turret end faces −X and the
 *    entrance side with the large stone stair is +Z (117.7°, front = [0, 1]).
 *  - Plan (photos 01–05; the OSM trace includes the stair and is not used for detail):
 *    nave + pronaos 12.2 × 6.8 m of horizontal logs, narrower three-sided apse (5.2 m)
 *    3.6 m deep; total ≈ 15.8 m (OSM 16.9 m with the eaves).
 *  - Whitewashed limestone rubble plinth ≈ 1.3 m (the ground falls towards the
 *    entrance side; levelled here), log walls ≈ 2.4 m with projecting corner notches
 *    and vertical posts, small square windows with orange-painted frames, door with an
 *    iron grille reached by a broad seven-step stone stair with railings (photos 01, 02).
 *  - Roof: hipped, ≈ 45° on the long sides and steeper (≈ 58°) hip ends, deep eaves;
 *    lower polygonal hipped roof over the apse; brick chimney on the north side at the
 *    nave/apse junction (photos 03, 04).
 *  - Square sheet-clad turret on the ridge near the west end (≈ 1.7 m, 1.9 m above the
 *    ridge), flared pyramidal cap, ball and three-bar cross.
 *  - METAL (client rule): all available photographs (Nov 2011) predate the works and
 *    show galvanised sheet; the roofs, the turret cladding and cap are shown in the
 *    copper supplied by COLOR METAL according to its records (2019), weathered brown,
 *    as standing seams 0.55 m. Which surfaces were re-covered is not documented.
 * Approximations: wall height and width scaled from the photographs (the OSM outline is
 * coarse); log courses and notches stylised; the separate bell tower is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, polyRing, faceFrame, seams, cross, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'copperBrown'
const SEAM = seams(CU, 0.55, 0.045, 0.04)
const LOG = 'frLog'
const LOGD = 'frLogDark'
const PLINTH = 'frPlinth'
const STEP = 'frStep'
const WFRAME = 'frWin'

/* plan */
const X0 = -8.0 // west wall
const X1 = 4.2 // nave east wall / apse start
const HW = 3.4 // nave half width
const AHW = 2.6 // apse half width
const AS = 1.25 // straight return of the apse
const XE = X1 + AS + AHW * (1 - Math.tan(22.5 * D2R)) // apse east face
const AF = AHW * Math.tan(22.5 * D2R) // half length of the apse east face

/* heights */
const PL = 1.3
const WALL = 2.4
const EAVE = PL + WALL
const OV = 0.75
const PS = 45 // side pitch
const PE = 58 // hip-end pitch
const TS = Math.tan(PS * D2R)
const TE = Math.tan(PE * D2R)

/** Apse plan outline from the nave wall (−z side → east face → +z side), grown by g. */
function apseRing(y: number, g = 0) {
  const k = Math.tan(22.5 * D2R)
  return [
    V(X1, y, -AHW - g),
    V(X1 + AS + g * k, y, -AHW - g),
    V(XE + g, y, -AF - g * k),
    V(XE + g, y, AF + g * k),
    V(X1 + AS + g * k, y, AHW + g),
    V(X1, y, AHW + g),
  ]
}

function logCourses(b: Builder, pts: THREE.Vector3[], closed: boolean) {
  // dark joints between the log courses (0.3 m), drawn as thin strips just proud of the wall
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const d = V().subVectors(c, a).normalize()
    const out = V(d.z, 0, -d.x).multiplyScalar(0.015)
    for (let y = PL + 0.3; y < EAVE - 0.05; y += 0.3) b.beam(LOGD, a.clone().add(out).setY(y), c.clone().add(out).setY(y), 0.03, 0.035, out.clone().normalize())
  }
}

function smallWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(WFRAME, metricBox(w + 0.16, h + 0.16, 0.08), M(m, mat(0, y0 + h / 2, 0.04)))
  b.add('frGlass', metricBox(w - 0.06, h - 0.06, 0.04), M(m, mat(0, y0 + h / 2, 0.08)))
  b.add(WFRAME, metricBox(0.04, h - 0.06, 0.05), M(m, mat(0, y0 + h / 2, 0.1)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= plinth ================= */
  b.block(PLINTH, X1 - X0 + 0.3, PL, 2 * HW + 0.3, (X0 + X1) / 2, 0, 0)
  b.add(PLINTH, loft([apseRing(0, 0.15), apseRing(PL, 0.15)], { capTop: true, flat: true }))
  // concrete cap of the plinth
  b.block('frCap', X1 - X0 + 0.4, 0.08, 2 * HW + 0.4, (X0 + X1) / 2, PL - 0.06, 0)

  /* ================= log walls ================= */
  b.block(LOG, X1 - X0, WALL, 2 * HW, (X0 + X1) / 2, PL, 0)
  b.add(LOG, loft([apseRing(PL), apseRing(EAVE)], { capTop: true, flat: true }))
  logCourses(b, [V(X0, 0, -HW), V(X1, 0, -HW)], false)
  logCourses(b, [V(X1, 0, HW), V(X0, 0, HW)], false)
  logCourses(b, [V(X0, 0, HW), V(X0, 0, -HW)], false)
  logCourses(b, apseRing(0).slice(0, 6), false)
  // projecting log ends at the corners (notched joints) and the sill beam
  for (const [x, z] of [[X0, -HW], [X0, HW], [X1, -HW], [X1, HW]]) {
    for (let y = PL + 0.15; y < EAVE; y += 0.3) {
      b.box(LOG, 0.5, 0.26, 0.26, x + (x < 0 ? -0.12 : 0.12), y, z)
      b.box(LOG, 0.26, 0.26, 0.5, x, y + 0.15, z + (z < 0 ? -0.12 : 0.12))
    }
  }
  b.block(LOG, X1 - X0 + 0.5, 0.3, 2 * HW + 0.5, (X0 + X1) / 2, PL, 0)
  // vertical posts (clamps) on the long walls
  for (const x of [-6.2, -2.0, 1.2, 3.4])
    for (const s of [-1, 1]) b.block(LOGD, 0.16, WALL - 0.4, 0.1, x, PL + 0.3, s * (HW + 0.05))

  /* ================= openings ================= */
  // entrance (+z): door with an iron grille, windows with orange frames
  {
    const m = faceFrame('+z', HW, -4.2, 0, 0)
    b.add('frDoor', metricBox(1.15, 2.0, 0.06), M(m, mat(0, PL + 1.0, 0.04)))
    b.add(WFRAME, metricBox(1.35, 0.1, 0.1), M(m, mat(0, PL + 2.05, 0.06)))
    for (let i = 0; i < 6; i++) b.add('iron', metricBox(0.025, 1.9, 0.03), M(m, mat(-0.5 + i * 0.2, PL + 1.0, 0.09)))
    for (let j = 0; j < 4; j++) b.add('iron', metricBox(1.1, 0.025, 0.03), M(m, mat(0, PL + 0.3 + j * 0.5, 0.09)))
    // icon banner beside the door
    b.add('frBanner', metricBox(0.95, 1.25, 0.03), M(m, mat(-1.9, PL + 1.15, 0.04)))
    b.add('frIcon', metricBox(0.55, 0.75, 0.035), M(m, mat(-1.9, PL + 1.3, 0.055)))
  }
  smallWindow(b, '+z', HW, -2.4, PL + 0.85, 0.72, 0.95)
  smallWindow(b, '+z', HW, 0.6, PL + 0.95, 0.46, 0.62)
  smallWindow(b, '+z', HW, 2.7, PL + 0.95, 0.46, 0.62)
  {
    // apse window on the south-east facet
    const p = V(X1 + AS + 0.62, 0, AHW - 0.25)
    const m = mat(p.x, 0, p.z, 22.5 * D2R + 0.0)
    b.add(WFRAME, metricBox(0.6, 0.78, 0.08), M(m, mat(0, PL + 1.2, 0.04)))
    b.add('frGlass', metricBox(0.4, 0.58, 0.04), M(m, mat(0, PL + 1.2, 0.08)))
  }
  smallWindow(b, '-z', -HW, 2.0, PL + 0.95, 0.46, 0.62)

  /* ================= entrance stair (+z) ================= */
  {
    const xc = -4.2
    const steps = 7
    const rise = PL / steps
    for (let i = 0; i < steps; i++) {
      const w = 5.2 - i * 0.35
      const zf = HW + 0.15 + (steps - i) * 0.4
      const d = zf - HW
      b.block(STEP, w, rise * (i + 1), d, xc, 0, HW + d / 2)
    }
    // railings
    for (const s of [-1, 1]) {
      const x = xc + s * 1.25
      const a = V(x, PL + 0.95, HW + 0.4)
      const c = V(x, 0.35 + 0.95, HW + 0.15 + steps * 0.4)
      b.beam('iron', a, c, 0.04, 0.04)
      for (const t of [0.0, 0.5, 1.0]) {
        const p = a.clone().lerp(c, t)
        b.rod('iron', p.clone().setY(p.y - 0.95), p, 0.02, 6)
      }
    }
  }

  /* ================= roofs (copper) ================= */
  const eY = EAVE - OV * TS
  const hwO = HW + OV
  const ridgeY = EAVE + HW * TS
  // hip ends: steeper pitch, run = rise / tan(PE)
  const run = (ridgeY - eY) / TE
  const xw = X0 - OV
  const xe = X1 + OV * 0.4
  const rW = xw + run
  const rE = xe - run
  const c1 = V(xw, eY, -hwO)
  const c2 = V(xe, eY, -hwO)
  const c3 = V(xe, eY, hwO)
  const c4 = V(xw, eY, hwO)
  const r1 = V(rW, ridgeY, 0)
  const r2 = V(rE, ridgeY, 0)
  facet(b, CU, [c4, c3, r2, r1], { seams: SEAM, thickness: 0.1 })
  facet(b, CU, [c2, c1, r1, r2], { seams: SEAM, thickness: 0.1 })
  facet(b, CU, [c1, c4, r1], { seams: SEAM, thickness: 0.1 })
  facet(b, CU, [c3, c2, r2], { seams: SEAM, thickness: 0.1 })
  for (const [a, c] of [[r1, r2], [c1, r1], [c4, r1], [c2, r2], [c3, r2]] as [THREE.Vector3, THREE.Vector3][]) b.beam(CU, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.14, 0.09)
  // soffit boards under the eaves
  b.block('frSoffit', X1 - X0 + 2 * OV, 0.06, 2 * hwO, (X0 + X1) / 2, eY - 0.02, 0)

  // apse roof: lower ridge, polygonal hip
  {
    const ahO = AHW + OV
    const aRidge = EAVE + AHW * TS
    const apexX = XE - AHW // so that the end facet keeps the side pitch
    const ring = apseRing(eY, OV).slice(1, 5)
    ring[0].z = -ahO
    ring[3].z = ahO
    const x0 = X1 - 0.6
    const apex = V(apexX, aRidge, 0)
    facet(b, CU, [V(x0, eY, ahO), ring[3], apex, V(x0, aRidge, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [ring[0], V(x0, eY, -ahO), V(x0, aRidge, 0), apex], { seams: SEAM, thickness: 0.1 })
    for (let i = 0; i < 3; i++) facet(b, CU, [ring[i], ring[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    for (const p of ring) b.beam(CU, p.clone().setY(p.y + 0.05), apex.clone().setY(apex.y + 0.05), 0.13, 0.08)
    b.beam(CU, V(x0, aRidge + 0.05, 0), apex.clone().setY(aRidge + 0.05), 0.14, 0.09)
  }

  /* ================= chimney (north side, nave/apse junction) ================= */
  b.block('frBrick', 0.55, ridgeY + 0.3, 0.55, X1 - 0.3, 0, -HW - 0.45)
  b.block('frBrick', 0.7, 0.12, 0.7, X1 - 0.3, ridgeY + 0.3, -HW - 0.45)
  b.block('iron', 0.3, 0.35, 0.3, X1 - 0.3, ridgeY + 0.42, -HW - 0.45)

  /* ================= turret near the west end ================= */
  {
    const tx = rW + 1.05
    const hw = 0.85
    const y0 = ridgeY - 1.2
    const yt = ridgeY + 1.9
    // copper-clad shaft with vertical seams on each face
    b.block(CU, 2 * hw, yt - y0, 2 * hw, tx, y0, 0)
    for (const [face, plane, u0] of [['+z', hw, tx], ['-z', -hw, -tx], ['+x', tx + hw, 0], ['-x', tx - hw, 0]] as [Face, number, number][]) {
      const m = faceFrame(face, plane, u0, 0, 0)
      for (const u of [-0.42, 0.0, 0.42]) b.add(CU, metricBox(0.04, yt - ridgeY + 0.1, 0.04), M(m, mat(u, (yt + ridgeY) / 2, 0.02)))
    }
    // flared pyramidal cap
    const capY = yt
    const capR = (hw + 0.42) * Math.SQRT2
    const eaveRing = polyRing(4, capR, capY - 0.12, Math.PI / 4, tx, 0)
    const apex = V(tx, capY + 1.35, 0)
    for (let i = 0; i < 4; i++) {
      facet(b, CU, [eaveRing[i], eaveRing[(i + 1) % 4], apex], { seams: seams(CU, 0.45, 0.035, 0.035), thickness: 0.06 })
      b.beam(CU, eaveRing[i], apex, 0.09, 0.07)
    }
    b.block(CU, 2 * hw + 0.2, 0.14, 2 * hw + 0.2, tx, capY - 0.1, 0)
    // ball and three-bar cross (light metal)
    b.add('frCross', new THREE.SphereGeometry(0.17, 14, 10), mat(tx, apex.y + 0.12, 0))
    b.rod('frCross', V(tx, apex.y - 0.1, 0), V(tx, apex.y + 0.35, 0), 0.035, 6)
    cross(b, 'frCross', tx, apex.y + 0.3, 0, 1.4, true, Math.PI / 2)
  }
  // small cross on the apse roof end (photos 01, 02)
  cross(b, 'frCross', XE - AHW, EAVE + AHW * TS + 0.05, 0, 0.9, true, Math.PI / 2)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-1.5, 6.0, 1.8],
  materials: () => ({
    frLog: new THREE.MeshStandardMaterial({ color: '#3e3226', roughness: 0.85 }),
    frLogDark: new THREE.MeshStandardMaterial({ color: '#1c1712', roughness: 0.9 }),
    frPlinth: new THREE.MeshStandardMaterial({ color: '#e1ddd2', roughness: 0.92 }),
    frCap: new THREE.MeshStandardMaterial({ color: '#bdb8ad', roughness: 0.9 }),
    frStep: new THREE.MeshStandardMaterial({ color: '#c9c4b8', roughness: 0.9 }),
    frWin: new THREE.MeshStandardMaterial({ color: '#c06a2c', roughness: 0.6 }),
    frGlass: new THREE.MeshStandardMaterial({ color: '#3a3027', metalness: 0.4, roughness: 0.25 }),
    frDoor: new THREE.MeshStandardMaterial({ color: '#2a2119', roughness: 0.8 }),
    frSoffit: new THREE.MeshStandardMaterial({ color: '#3b3026', roughness: 0.85 }),
    frBrick: new THREE.MeshStandardMaterial({ color: '#8e4c39', roughness: 0.9 }),
    frBanner: new THREE.MeshStandardMaterial({ color: '#d79b86', roughness: 0.8 }),
    frIcon: new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.6 }),
    frCross: new THREE.MeshStandardMaterial({ color: '#cfd2d4', metalness: 0.7, roughness: 0.35 }),
  }),
  notes: 'Log church on a stone plinth with hipped roofs and a sheet-clad turret; roofs and turret shown in the weathered copper supplied by COLOR METAL according to its records, because the photographs predate the works.',
}
export default model
