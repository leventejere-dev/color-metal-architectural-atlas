/**
 * Biserica „Nașterea Maicii Domnului”, Vârtop (Albești), Constanța — small
 * Dobrogean village church built 1937-1947 of exposed stone masonry: cross plan
 * with a west porch, a short tower over the crossing and a semicircular apse.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 84.1° towards the apse (E); entrance front at −X (W)):
 *  - Footprint after OSM way 288611805: 19.1 × 9.2 m — body X −9.6 → 6.4 and a
 *    semicircular apse (R ≈ 3.2 m) to X 9.6; the transept arms reach the full
 *    9.1 m width, the nave ≈ 7.2 m wide (photo 01: the porch ≈ 4.6 m wide
 *    against the wider stone body behind it).
 *  - Photo 01 (west, axial; door ≈ 2.3 m as scale): ≈ 1 m stone plinth with a
 *    flight of steps, porch with a painted round-arched portal under a
 *    timber-bracketed eave (≈ 4.9 m), exposed stone gable wall, nave eave
 *    ≈ 6.4 m with deep timber-bracketed eaves; behind it a low tower: square
 *    base, low octagonal drum with small windows, flat dome, cross ≈ 12.5 m.
 *  - Photo 02 (archival, oblique): stone walls with quoins and narrow windows,
 *    low hipped roofs over the arms, the tower over the crossing.
 *  - METAL: the photographs (2021 and older) show galvanised sheet, which
 *    predates the works; roofs, tower roof and dome are therefore shown in
 *    natural aluminium sheet ('aluNatural', standing seams ≈ 0.5 m) — the
 *    aluminium COLOR METAL supplied in 2022 according to its records.
 * Approximations: only the entrance front (partly hidden by trees) and an old
 * oblique view are available — arm lengths, window counts, roof pitches and the
 * tower proportions are estimated; the porch roof form is simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, seams, faceFrame, facet, helm, hipRoof, type Face } from '../kit'
import type { ModelModule } from '../registry'

const AL = 'aluNatural'
const SEAM = seams(AL, 0.5, 0.04, 0.04)
const STONE = 'stoneWarm'
const QUOIN = 'vtQuoin'
const WOOD = 'vtWood'
const D2R = Math.PI / 180

const PL = 1.0 // plinth
const XP0 = -9.6 // porch front
const XN0 = -7.9 // nave front
const XA = 6.4 // apse junction
const NHW = 3.6
const THW = 4.55
const XT0 = -1.2
const XT1 = 2.8
const XC = (XT0 + XT1) / 2
const EAVE = 6.4
const AEAVE = 5.8
const OV = 0.8

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function narrow(b: Builder, m: THREE.Matrix4, u: number, y0: number, w = 0.45, h = 1.3) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 8))), M(m, mat(0, 0, 0.03)))
  b.add(QUOIN, extrude(frameShape('round', w, h, 0.16, u, y0), 0.08, 8), M(m, mat(0, 0, 0.01)))
}

/** hipped roof over a rectangle with timber-bracketed eaves */
function hip(b: Builder, x0: number, x1: number, hw: number, y: number, pitch: number) {
  const w = x1 - x0 + 2 * OV
  const d = 2 * (hw + OV)
  const t = Math.tan(pitch * D2R)
  const r = hipRoof((x0 + x1) / 2, 0, w, d, y - OV * t, pitch * D2R)
  for (const f of r.facets) facet(b, AL, f, { seams: SEAM, thickness: 0.08 })
  for (const [a, c] of r.lines) b.beam(AL, a.clone().add(V(0, 0.04, 0)), c.clone().add(V(0, 0.04, 0)), 0.14, 0.08)
  brackets(b, x0, x1, hw, y - OV * t)
}

/** timber soffit board and rafter ends along the eaves of a rectangle */
function brackets(b: Builder, x0: number, x1: number, hw: number, ye: number) {
  b.block(WOOD, x1 - x0 + 2 * OV - 0.05, 0.08, 2 * (hw + OV) - 0.05, (x0 + x1) / 2, ye - 0.12, 0)
  for (let x = x0 + 0.3; x < x1; x += 0.6) for (const sz of [-1, 1]) b.beam(WOOD, V(x, ye - 0.3, sz * (hw - 0.05)), V(x, ye - 0.08, sz * (hw + OV - 0.1)), 0.1, 0.14)
}

function build(): Builder {
  const b = new Builder()

  /* ================= plinth ================= */
  b.block(QUOIN, XA - XN0 + 0.3, PL, 2 * NHW + 0.3, (XA + XN0) / 2, 0, 0)
  b.block(QUOIN, XT1 - XT0 + 0.3, PL, 2 * THW + 0.3, XC, 0, 0)
  b.block(QUOIN, XN0 - XP0 + 0.3, PL, 2 * 2.3 + 0.3, (XN0 + XP0) / 2 - 0.15, 0, 0)
  for (let i = 0; i < 5; i++) b.block(QUOIN, 0.36, PL * (1 - i / 5), 4.4 + i * 0.4, XP0 - 0.3 - i * 0.36, 0, 0)

  /* ================= nave, arms, apse ================= */
  b.block(STONE, XA - XN0, EAVE, 2 * NHW, (XA + XN0) / 2, 0, 0)
  b.block(STONE, XT1 - XT0, AEAVE, 2 * THW, XC, 0, 0)
  // quoins on the nave and arm corners
  const quoins = (x: number, z: number, y1: number) => {
    for (let y = PL; y < y1 - 0.3; y += 0.6) b.block(QUOIN, (Math.round(y / 0.6) % 2 ? 0.7 : 0.45) + 0.02, 0.3, (Math.round(y / 0.6) % 2 ? 0.45 : 0.7) + 0.02, x, y, z)
  }
  for (const sz of [-1, 1]) {
    quoins(XN0, sz * NHW, EAVE)
    quoins(XT0, sz * THW, AEAVE)
    quoins(XT1, sz * THW, AEAVE)
  }
  b.add(STONE, new THREE.CylinderGeometry(3.2, 3.2, AEAVE, 28, 1, false, 0, Math.PI), mat(XA, AEAVE / 2, 0))
  b.add(QUOIN, new THREE.CylinderGeometry(3.3, 3.3, PL, 28, 1, false, 0, Math.PI), mat(XA, PL / 2, 0))
  // windows
  for (const sz of [-1, 1]) {
    const m = faceFrame(sz > 0 ? '+z' : '-z', sz * NHW, 0, 0, 0)
    for (const x of [-5.6, 4.6]) narrow(b, m, sz > 0 ? x : -x, 2.6)
    const ma = faceFrame(sz > 0 ? '+z' : '-z', sz * THW, 0, 0, 0)
    narrow(b, ma, sz > 0 ? XC : -XC, 2.5, 0.6, 1.6)
  }
  for (const a of [-45, 0, 45]) {
    const ar = a * D2R
    narrow(b, wallAt(XA + Math.cos(ar) * 3.2, Math.sin(ar) * 3.2, ar), 0, 2.5)
  }

  /* ================= roofs ================= */
  hip(b, XN0, XA, NHW, EAVE, 24)
  hip(b, XT0, XT1, THW, AEAVE, 24)
  {
    const t = Math.tan(24 * D2R)
    const r = 3.2
    const ry = EAVE + NHW * t
    const ye = AEAVE - OV * t
    b.add(AL, new THREE.LatheGeometry([new THREE.Vector2(r + OV, ye), new THREE.Vector2(0.02, Math.min(ry, AEAVE + r * t))], 28, 0, Math.PI), mat(XA, 0, 0))
    for (let k = 1; k < 14; k++) {
      const a = (k / 14) * Math.PI
      const d = V(Math.sin(a), 0, Math.cos(a))
      b.beam(AL, V(XA + d.x * (r + OV - 0.03), ye + 0.03, d.z * (r + OV - 0.03)), V(XA + d.x * 0.4, AEAVE + (r - 0.4) * t, d.z * 0.4), 0.04, 0.04)
    }
    b.add(WOOD, new THREE.CylinderGeometry(r + OV - 0.05, r + OV - 0.05, 0.08, 28, 1, false, 0, Math.PI), mat(XA, ye - 0.12, 0))
  }

  /* ================= west porch ================= */
  {
    const hw = 2.3
    const e = 4.9
    b.block(STONE, XN0 - XP0 + 0.2, e, 2 * hw, (XN0 + XP0) / 2 + 0.1, 0, 0)
    const m = faceFrame('-x', XP0, 0, 0, 0)
    b.add('vtFresco', metricBox(2 * hw - 0.3, e - PL - 0.5, 0.04), M(m, mat(0, PL + (e - PL - 0.5) / 2, 0.02)))
    b.add('vtDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.6, 0, PL, 10))), M(m, mat(0, 0, 0.05)))
    b.add(QUOIN, extrude(frameShape('round', 2.4, 3.0, 0.22, 0, PL), 0.12, 12), M(m, mat(0, 0, 0.03)))
    for (const u of [-1.55, 1.55]) b.add('vtIcon', metricBox(0.75, 1.9, 0.05), M(m, mat(u, PL + 1.3, 0.05)))
    // low hipped porch roof with brackets
    const t = Math.tan(22 * D2R)
    const r = hipRoof((XN0 + XP0) / 2 - 0.1, 0, XN0 - XP0 + 2 * OV, 2 * (hw + OV), e - OV * t, 22 * D2R)
    for (const f of r.facets) facet(b, AL, f, { seams: SEAM, thickness: 0.08 })
    for (const [a, c] of r.lines) b.beam(AL, a.clone().add(V(0, 0.04, 0)), c.clone().add(V(0, 0.04, 0)), 0.12, 0.08)
    brackets(b, XP0, XN0, hw, e - OV * t)
    for (let u = -hw - 0.4; u <= hw + 0.4; u += 0.6) b.beam(WOOD, V(XP0 + 0.05, e - OV * t - 0.3, u), V(XP0 - OV + 0.1, e - OV * t - 0.08, u), 0.1, 0.14)
    // stone gable wall of the nave above the porch roof with a small window
    const mf = faceFrame('-x', XN0, 0, 0, 0)
    narrow(b, mf, 0, 5.3, 0.4, 0.7)
  }
  // timber brackets along the nave front eave
  {
    const t = Math.tan(24 * D2R)
    const ye = EAVE - OV * t
    for (let u = -NHW - 0.4; u <= NHW + 0.4; u += 0.6) b.beam(WOOD, V(XN0 + 0.05, ye - 0.3, u), V(XN0 - OV + 0.1, ye - 0.08, u), 0.1, 0.14)
  }

  /* ================= crossing tower ================= */
  {
    const s = 4.0
    const t = Math.tan(24 * D2R)
    const ridge = EAVE + NHW * t
    const y1 = ridge + 0.9
    b.block(STONE, s, y1 - EAVE + 0.3, s, XC, EAVE - 0.3, 0)
    for (const [f, plane, u] of [['-x', XC - s / 2, 0], ['+x', XC + s / 2, 0], ['+z', s / 2, XC], ['-z', -s / 2, -XC]] as [Face, number, number][]) {
      narrow(b, faceFrame(f, plane, u, 0, 0), 0, y1 - 1.1, 0.35, 0.6)
    }
    // skirt roof with brackets
    const ho = s / 2 + 0.7
    const yo = y1 - 0.25
    const yi = y1 + 0.3
    const hi = s / 2 - 0.5
    const P = (sx: number, sz: number, h: number, y: number) => V(XC + sx * h, y, sz * h)
    const cs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cs[i]
      const [bx, bz] = cs[(i + 1) % 4]
      facet(b, AL, [P(bx, bz, ho, yo), P(ax, az, ho, yo), P(ax, az, hi, yi), P(bx, bz, hi, yi)], { seams: SEAM, thickness: 0.08 })
    }
    b.block(WOOD, 2 * ho - 0.05, 0.08, 2 * ho - 0.05, XC, yo - 0.12, 0)
    // low octagonal drum
    const a = 1.35
    const R = a / Math.cos(Math.PI / 8)
    const d0 = yi - 0.2
    const d1 = d0 + 1.3
    prism(b, STONE, { x: XC, n: 8, r: R, y0: d0, h: d1 - d0 })
    for (let k = 0; k < 8; k += 2) {
      const ang = (k * Math.PI) / 4
      narrow(b, wallAt(XC + Math.cos(ang) * a, Math.sin(ang) * a, ang), 0, d0 + 0.3, 0.3, 0.7)
    }
    // flat dome with deep eave
    helm(b, AL, { x: XC, n: 16, stations: [[R + 0.55, d1 - 0.12], [R + 0.4, d1 + 0.05], [R * 0.95, d1 + 0.45], [R * 0.7, d1 + 0.85], [R * 0.35, d1 + 1.1], [0.08, d1 + 1.2]] })
    b.add(WOOD, new THREE.CylinderGeometry(R + 0.5, R + 0.5, 0.08, 16), mat(XC, d1 - 0.18, 0))
    const yc = d1 + 1.2
    b.add('vtCross', metricBox(0.08, 1.2, 0.08), mat(XC, yc + 0.6, 0))
    b.add('vtCross', metricBox(0.08, 0.08, 0.6), mat(XC, yc + 0.85, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2, 8, 2],
  materials: () => ({
    vtStone: new THREE.MeshStandardMaterial({ color: '#b8aa91', roughness: 0.95 }),
    vtQuoin: new THREE.MeshStandardMaterial({ color: '#d6ccb8', roughness: 0.9 }),
    vtWood: new THREE.MeshStandardMaterial({ color: '#6a4631', roughness: 0.8 }),
    vtFresco: new THREE.MeshStandardMaterial({ color: '#d7a64e', roughness: 0.8 }),
    vtIcon: new THREE.MeshStandardMaterial({ color: '#5f7fa6', roughness: 0.75 }),
    vtDoor: new THREE.MeshStandardMaterial({ color: '#4c2f22', roughness: 0.7 }),
    vtCross: new THREE.MeshStandardMaterial({ color: '#d0d3d6', roughness: 0.3, metalness: 0.8 }),
  }),
  notes:
    'Small stone church on a cross plan with a west porch, a low tower over the crossing and a semicircular apse; roofs and dome shown in natural aluminium supplied in 2022 (the photographs predate the works); arms, windows and tower proportions estimated.',
}
export default model
