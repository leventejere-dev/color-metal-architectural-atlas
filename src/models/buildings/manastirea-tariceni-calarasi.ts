/**
 * Schitul (Mănăstirea) Tăriceni — church „Sf. Ierarh Nicolae” (c. 1830, LMI
 * CL-II-m-B-14722), Tăriceni, Frăsinet, Călărași: single-nave brick church with
 * a metal-clad tower over the west bay, a low west porch and a rounded east
 * apse under the continuous roof.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 53.1° towards the apse (NE); entrance at −X (SW)):
 *  - Length 19.5 m after OSM way 529004187: porch X −9.75 → −6.4, nave to
 *    X 4.75, semicircular apse of the full width to X 9.75. Width ≈ 10 m — the
 *    OSM polygon is a rough trapezoid (10.6 → 12.4 m); the photographs show a
 *    single nave whose roof rise and tower proportions fit ≈ 10 m better.
 *  - Photo 02 (north side, scaled on the length): ≈ 1 m plinth, eave ≈ 5.8 m,
 *    gable roof ≈ 30° with a gabled west end and a half-conical roof over the
 *    apse; three tall narrow round-headed windows per side plus small square
 *    openings; low west porch (eave ≈ 3.8 m, hipped roof) with two arched
 *    windows per side.
 *  - Tower on the west bay, flush with the west gable: square base ≈ 3.8 m to
 *    ≈ 9.7 m, octagonal drum ≈ 2.3 m high with a small window per face, bell
 *    cupola ≈ 1.7 m, cross ≈ 15.1 m; base and drum clad in sheet metal.
 *  - METAL: the photographs (2012 and earlier) show grey sheet, i.e. they
 *    predate the works; the roofs and the tower cladding and cupola are shown in
 *    weathered copper ('copperBrown', standing seams ≈ 0.5 m) — the copper
 *    COLOR METAL supplied in 2019 according to its records (which surfaces were
 *    covered is not documented).
 * Approximations: nave width (see above), porch front, east end and window
 * counts on the south side partly inferred; heights estimated from photo 02.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, seams, faceFrame, facet, helm, hipRoof, type Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const WALL = 'trWall'
const TRIM = 'trTrim'
const D2R = Math.PI / 180

const XP = -9.75 // porch front
const XW = -6.4 // west gable of the nave
const XA = 4.75 // apse centre / junction
const HW = 5.0
const EAVE = 5.8
const PITCH = 30
const OV = 0.4

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, type: 'round' | 'rect' = 'round') {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add(TRIM, extrude(frameShape(type, w, h, 0.12, u, y0), 0.08, 10), M(m, mat(0, 0, 0.01)))
}

function build(): Builder {
  const b = new Builder()
  const t = Math.tan(PITCH * D2R)

  /* ================= nave + apse ================= */
  b.block(WALL, XA - XW, EAVE, 2 * HW, (XA + XW) / 2, 0, 0)
  b.block('trPlinth', XA - XW + 0.2, 1.0, 2 * HW + 0.2, (XA + XW) / 2, 0, 0)
  b.add(WALL, new THREE.CylinderGeometry(HW, HW, EAVE, 32, 1, false, 0, Math.PI), mat(XA, EAVE / 2, 0))
  b.add('trPlinth', new THREE.CylinderGeometry(HW + 0.1, HW + 0.1, 1.0, 32, 1, false, 0, Math.PI), mat(XA, 0.5, 0))
  // brick-triangle cornice (simplified as a double moulding)
  b.block(TRIM, XA - XW + 0.1, 0.18, 2 * HW + 0.3, (XA + XW) / 2, EAVE - 0.18, 0)
  b.block(TRIM, XA - XW + 0.1, 0.12, 2 * HW + 0.18, (XA + XW) / 2, EAVE - 0.45, 0)
  b.add(TRIM, new THREE.CylinderGeometry(HW + 0.15, HW + 0.15, 0.18, 32, 1, false, 0, Math.PI), mat(XA, EAVE - 0.09, 0))
  b.add(TRIM, new THREE.CylinderGeometry(HW + 0.09, HW + 0.09, 0.12, 32, 1, false, 0, Math.PI), mat(XA, EAVE - 0.39, 0))
  // flat pilaster strips (photo 02)
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HW, 0, 0, 0)
    const U = (x: number) => (sz > 0 ? x : -x)
    for (const x of [XW + 0.2, -2.4, 1.6, XA - 0.1]) b.add(TRIM, metricBox(0.45, EAVE - 1.5, 0.08), M(m, mat(U(x), 1.0 + (EAVE - 1.5) / 2, 0.04)))
    for (const x of [-4.4, -0.4, 3.3]) win(b, m, U(x), 2.0, 0.55, 2.0)
    for (const x of [-5.6, 2.6]) win(b, m, U(x), 2.3, 0.35, 0.4, 'rect')
  }
  for (const a of [-55, 0, 55]) {
    const ar = a * D2R
    win(b, wallAt(XA + Math.cos(ar) * HW, Math.sin(ar) * HW, ar), 0, 2.0, 0.5, 1.8)
  }

  /* ================= roof: gable at the west, half-cone over the apse ================= */
  {
    const ye = EAVE - OV * t
    const yr = EAVE + HW * t
    const H = HW + OV
    const x0 = XW - OV
    facet(b, CU, [V(x0, ye, H), V(XA, ye, H), V(XA, yr, 0), V(x0, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(XA, ye, -H), V(x0, ye, -H), V(x0, yr, 0), V(XA, yr, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, V(x0, yr + 0.04, 0), V(XA, yr + 0.04, 0), 0.18, 0.1)
    b.add(CU, new THREE.LatheGeometry([new THREE.Vector2(H, ye), new THREE.Vector2(0.02, yr)], 32, 0, Math.PI), mat(XA, 0, 0))
    for (let k = 1; k < 20; k++) {
      const a = (k / 20) * Math.PI
      const d = V(Math.sin(a), 0, Math.cos(a))
      b.beam(CU, V(XA + d.x * (H - 0.03), ye + 0.03, d.z * (H - 0.03)), V(XA + d.x * 0.4, yr - 0.4 * t, d.z * 0.4), 0.04, 0.04)
    }
    // west gable wall with moulded rakes
    const tri = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.01), new THREE.Vector2(HW, EAVE - 0.01), new THREE.Vector2(0, yr - 0.05)])
    b.add(WALL, extrude(tri, 0.4), mat(XW, 0, 0, Math.PI / 2))
    b.add(TRIM, metricBox(0.3, 0.2, 2 * HW + 0.3), mat(XW - 0.12, EAVE - 0.1, 0))
    for (const sz of [-1, 1]) b.beam(TRIM, V(XW - 0.15, EAVE, sz * (HW + 0.2)), V(XW - 0.15, yr + 0.1, 0), 0.3, 0.22, V(-1, 0, 0))
  }

  /* ================= west porch ================= */
  {
    const hw = 2.6
    const e = 3.8
    const xc = (XP + XW) / 2
    b.block(WALL, XW - XP, e, 2 * hw, xc, 0, 0)
    b.block('trPlinth', XW - XP + 0.15, 0.8, 2 * hw + 0.15, xc, 0, 0)
    b.block(TRIM, XW - XP + 0.15, 0.15, 2 * hw + 0.15, xc, e - 0.15, 0)
    for (const sz of [-1, 1]) {
      const m = faceFrame(sz > 0 ? '+z' : '-z', sz * hw, 0, 0, 0)
      for (const x of [xc - 0.8, xc + 0.8]) win(b, m, sz > 0 ? x : -x, 1.2, 0.85, 1.9)
    }
    const mf = faceFrame('-x', XP, 0, 0, 0)
    b.add('trDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, 2.4, 0, 0.3, 10))), M(mf, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.2, 2.4, 0.16, 0, 0.3), 0.1, 10), M(mf, mat(0, 0, 0.01)))
    const pt = Math.tan(28 * D2R)
    const r = hipRoof(xc - 0.15, 0, XW - XP + 0.3 + 0.35, 2 * (hw + 0.35), e - 0.35 * pt, 28 * D2R)
    for (const f of r.facets) facet(b, CU, f, { seams: SEAM, thickness: 0.08 })
    for (const [a, c] of r.lines) b.beam(CU, a.clone().add(V(0, 0.04, 0)), c.clone().add(V(0, 0.04, 0)), 0.12, 0.08)
    for (let i = 0; i < 2; i++) b.block('trPlinth', 0.35, 0.3 * (1 - i / 2), 1.8, XP - 0.2 - i * 0.35, 0, 0)
  }

  /* ================= tower on the west bay ================= */
  {
    const s = 3.8
    const x = XW + 0.3 + s / 2
    const ridge = EAVE + HW * t
    const y1 = ridge + 1.0
    const yb = EAVE + (HW - s / 2) * t - 0.15 // base emerges from the roof slope
    // square base clad in metal (vertical seams)
    b.block(CU, s, y1 - yb, s, x, yb, 0)
    for (const [f, plane, u] of [['-x', x - s / 2, 0], ['+x', x + s / 2, 0], ['+z', s / 2, x], ['-z', -s / 2, -x]] as [Face, number, number][]) {
      const m = faceFrame(f, plane, u, 0, 0)
      const lo = f.endsWith('z') ? yb + 0.1 : ridge - 0.1
      for (let k = -s / 2 + 0.45; k < s / 2 - 0.2; k += 0.5) b.add(CU, metricBox(0.04, y1 - lo - 0.1, 0.05), M(m, mat(k, lo + (y1 - lo) / 2, 0.02)))
    }
    // sloped cap of the base
    const ho = s / 2 + 0.15
    const P = (sx: number, sz: number, h: number, y: number) => V(x + sx * h, y, sz * h)
    const cs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cs[i]
      const [bx, bz] = cs[(i + 1) % 4]
      facet(b, CU, [P(bx, bz, ho, y1 - 0.05), P(ax, az, ho, y1 - 0.05), P(ax, az, 1.45, y1 + 0.4), P(bx, bz, 1.45, y1 + 0.4)], { seams: SEAM, thickness: 0.06 })
    }
    // octagonal drum clad in metal, small windows
    const a = 1.25
    const R = a / Math.cos(Math.PI / 8)
    const d0 = y1 + 0.3
    const d1 = d0 + 2.3
    prism(b, CU, { x, n: 8, r: R, y0: d0, h: d1 - d0 })
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      const m = wallAt(x + Math.cos(ang) * a, Math.sin(ang) * a, ang)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.32, 0.7, 0, d0 + 0.8, 8))), M(m, mat(0, 0, 0.03)))
      const c = ang + Math.PI / 8
      b.beam(CU, V(x + Math.cos(c) * (R + 0.02), d0, Math.sin(c) * (R + 0.02)), V(x + Math.cos(c) * (R + 0.02), d1, Math.sin(c) * (R + 0.02)), 0.08, 0.06, V(Math.cos(c), 0, Math.sin(c)))
    }
    // eave ring and bell cupola
    prism(b, CU, { x, n: 8, r: R + 0.3, y0: d1 - 0.05, h: 0.12 })
    const st: [number, number][] = [[R + 0.3, d1 + 0.07], [R + 0.05, d1 + 0.25], [R * 0.92, d1 + 0.75], [R * 0.68, d1 + 1.2], [R * 0.32, d1 + 1.55], [0.1, d1 + 1.7]]
    helm(b, CU, { x, n: 8, stations: st })
    for (let k = 0; k < 8; k++) {
      const ang = Math.PI / 8 + (k * Math.PI) / 4
      for (let i = 0; i < st.length - 1; i++) b.beam(CU, V(x + Math.cos(ang) * st[i][0], st[i][1], Math.sin(ang) * st[i][0]), V(x + Math.cos(ang) * st[i + 1][0], st[i + 1][1], Math.sin(ang) * st[i + 1][0]), 0.06, 0.05, V(Math.cos(ang), 0, Math.sin(ang)))
    }
    const yc = d1 + 1.7
    b.add('trCross', metricBox(0.08, 1.1, 0.08), mat(x, yc + 0.55, 0))
    b.add('trCross', metricBox(0.08, 0.08, 0.55), mat(x, yc + 0.8, 0))
  }
  // small cross on the apse end of the ridge
  b.add('trCross', metricBox(0.06, 0.7, 0.06), mat(XA, EAVE + HW * t + 0.4, 0))
  b.add('trCross', metricBox(0.06, 0.06, 0.35), mat(XA, EAVE + HW * t + 0.55, 0))

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [0, 7.5, 3],
  materials: () => ({
    trWall: new THREE.MeshStandardMaterial({ color: '#f0ece2', roughness: 0.92 }),
    trTrim: new THREE.MeshStandardMaterial({ color: '#e6e0d3', roughness: 0.88 }),
    trPlinth: new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.95 }),
    trDoor: new THREE.MeshStandardMaterial({ color: '#5a3d2a', roughness: 0.7 }),
    trCross: new THREE.MeshStandardMaterial({ color: '#8a8f93', roughness: 0.4, metalness: 0.7 }),
  }),
  notes:
    'Single-nave church of c. 1830 with a metal-clad tower over the west bay, a low west porch and a rounded apse; roofs and tower shown in copper supplied in 2019 (the photographs predate the works); nave width and south side partly inferred.',
}
export default model
