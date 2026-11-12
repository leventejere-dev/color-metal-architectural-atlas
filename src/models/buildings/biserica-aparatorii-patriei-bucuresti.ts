/**
 * Biserica Parohiei Apărătorii Patriei I („Sf. Nicolae”), Str. Panselelor 31,
 * București — interwar neo-Romanian church (OSM start_date 1935) with a low
 * ambulatory/porch block wrapped around a taller nave, a narthex tower and a
 * taller naos tower in line, and a polygonal apse.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 107.1° towards the apse (ESE); entrance front at −X):
 *  - Footprint after OSM way 80540040: rectangle 21 × 13.2 m (X −12.25 → 8.75)
 *    plus a three-sided apse to X 12.3 (end facet ≈ 4.7 m wide).
 *  - Photo 01 (front, slightly from the left) and photo 04 (side): a LOW BLOCK
 *    of the full width (eave ≈ 5.6 m) forms the front porch and the side
 *    annexes, with a lean-to roof and wide timber-lined eaves; front: central
 *    gold-mosaic panel with three icon medallions over three arched doorways on
 *    stone columns (photo 03), side bays with icons in arched niches; sides: a
 *    row of arched icon niches under a gold mosaic band (photo 04).
 *  - UPPER NAVE BODY ≈ 9.6 m wide (scaled from photo 01 against the 13.2 m
 *    front), eave ≈ 9.4 m, white render with a frieze of shallow red-outlined
 *    blind arches, brick dentil cornice and deep timber soffits; hipped roof
 *    ≈ 24°, the apse roofed with hipped facets.
 *  - TOWERS in the axis (photo 01: the two drums overlap in the oblique view,
 *    the rear one stands higher on a two-stage base): narthex tower — square
 *    base with oculus, octagonal drum with arched windows, flared octagonal cap,
 *    cross ≈ 17 m; naos tower — square base + smaller square stage with oculus,
 *    larger octagonal drum, flared cap, cross ≈ 19.3 m. Caps with deep
 *    timber-lined eaves and brick dentils (photo 02).
 *  - METAL as photographed (Sept 2019, just after the works): mid-grey
 *    pre-patinated titanium-zinc ('zincNatural') with standing seams ≈ 0.5 m on
 *    all roofs and tower caps — the material COLOR METAL supplied in 2019
 *    according to its records.
 * Approximations: rear (apse) side and the north elevation not photographed —
 * mirrored from the documented side; all heights estimated from photo 01;
 * tower positions along the axis and window counts inferred.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, helm, loft, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.04, 0.04)
const WALL = 'apWall'
const TRIM = 'apTrim'
const BRICK = 'apBrick'
const GOLD = 'apGold'
const ICON = 'apIcon'
const SOFFIT = 'apSoffit'
const D2R = Math.PI / 180

const X0 = -12.25 // front face of the low block
const XU0 = -10.8 // front face of the upper body
const XA = 8.75 // apse junction
const XE = 12.25 // apse end facet
const HW = 6.6 // half width of the low block
const UHW = 4.8 // half width of the upper body
const AHW = 2.35 // half width of the apse end facet
const LOW = 5.6 // low block eave
const EAVE = 9.4 // upper body eave
const PITCH = 24
const OV = 1.0 // eave overhang of the upper roof
const LOV = 0.85 // eave overhang of the low roof

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, glass = 'glassC', f = 0.14, fk = TRIM) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(fk, extrude(frameShape('round', w, h, f, u, y0), 0.08, 10), M(m, mat(0, 0, 0.01)))
}

/** frieze of shallow red-outlined blind arches between u0 and u1 */
function arcade(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y0: number, h: number, n: number) {
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    b.add(BRICK, extrude(frameShape('round', step - 0.3, h, 0.09, u, y0), 0.05, 10), M(m, mat(0, 0, 0.01)))
  }
  b.add(TRIM, metricBox(u1 - u0, 0.12, 0.1), M(m, mat((u0 + u1) / 2, y0 - 0.1, 0.05)))
}

/** brick dentil band along u0..u1 at y */
function dentils(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number) {
  b.add(BRICK, metricBox(u1 - u0, 0.1, 0.16), M(m, mat((u0 + u1) / 2, y, 0.08)))
  for (let u = u0 + 0.15; u < u1 - 0.1; u += 0.32) b.add(BRICK, metricBox(0.14, 0.14, 0.14), M(m, mat(u, y + 0.12, 0.07)))
}

/** square tower stage with a flared timber-soffit eave skirt; returns top y */
function squareStage(b: Builder, x: number, s: number, y0: number, y1: number, skirt: number, oculus: boolean) {
  b.block(WALL, s, y1 - y0, s, x, y0, 0)
  const faces: [Face, number, number][] = [['-x', x - s / 2, 0], ['+x', x + s / 2, 0], ['+z', s / 2, x], ['-z', -s / 2, -x]]
  for (const [f, plane, u] of faces) {
    const m = faceFrame(f, plane, u, 0, 0)
    dentils(b, m, -s / 2 + 0.1, s / 2 - 0.1, y1 - 0.45)
    if (oculus) {
      b.add('glassC', new THREE.CircleGeometry(0.32, 16), M(m, mat(0, (y0 + y1) / 2 - 0.1, 0.03)))
      b.add(BRICK, new THREE.TorusGeometry(0.38, 0.06, 6, 20), M(m, mat(0, (y0 + y1) / 2 - 0.1, 0.03)))
    }
  }
  // flared skirt roof (hipped ring) with timber soffit
  const t = Math.tan(30 * D2R)
  const ho = s / 2 + skirt
  const yo = y1 - skirt * t * 0.6
  const yi = y1 + 0.35
  const hi = s / 2 - 0.25
  const P = (sx: number, sz: number, h: number, y: number) => V(x + sx * h, y, sz * h)
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i]
    const [bx, bz] = corners[(i + 1) % 4]
    facet(b, ZN, [P(bx, bz, ho, yo), P(ax, az, ho, yo), P(ax, az, hi, yi), P(bx, bz, hi, yi)], { seams: SEAM, thickness: 0.08 })
  }
  b.block(SOFFIT, 2 * ho - 0.05, 0.08, 2 * ho - 0.05, x, yo - 0.1, 0)
  b.block(BRICK, s + 0.06, 0.18, s + 0.06, x, y1 - 0.2, 0)
  return yi
}

/** octagonal drum with arched windows, red arch frieze and flared octagonal cap */
function drum(b: Builder, x: number, a: number, y0: number, y1: number, capH: number, crossS: number) {
  const R = a / Math.cos(Math.PI / 8)
  prism(b, WALL, { x, n: 8, r: R, y0, h: y1 - y0 })
  ringBand(b, TRIM, { x, n: 8, r: R, y: y0, h: 0.25, grow: 0.08 })
  const wh = (y1 - y0) * 0.55
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4
    const m = wallAt(x + Math.cos(ang) * a, Math.sin(ang) * a, ang)
    arched(b, m, 0, y0 + 0.45, 0.42, wh, 'glassC', 0.08, BRICK)
    b.add(BRICK, extrude(frameShape('round', 0.62, 0.42, 0.06, 0, y1 - 0.75), 0.04, 8), M(m, mat(0, 0, 0.01)))
  }
  ringBand(b, BRICK, { x, n: 8, r: R, y: y1 - 0.25, h: 0.25, grow: 0.06 })
  // flared cap with deep soffit
  const st: [number, number][] = [[R + 0.85, y1 - 0.15], [R + 0.55, y1 + 0.1], [R * 0.72, y1 + capH * 0.45], [R * 0.32, y1 + capH * 0.85], [0.14, y1 + capH]]
  helm(b, ZN, { x, n: 8, stations: st })
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4
    for (let i = 0; i < st.length - 1; i++) b.beam(ZN, V(x + Math.cos(ang) * st[i][0], st[i][1], Math.sin(ang) * st[i][0]), V(x + Math.cos(ang) * st[i + 1][0], st[i + 1][1], Math.sin(ang) * st[i + 1][0]), 0.07, 0.05, V(Math.cos(ang), 0, Math.sin(ang)))
  }
  prism(b, SOFFIT, { x, n: 8, r: R + 0.8, y0: y1 - 0.24, h: 0.08 })
  // ornate cross on a small knob
  const yc = y1 + capH
  b.add(ZN, new THREE.SphereGeometry(0.2, 12, 8), mat(x, yc + 0.12, 0))
  b.add('helm', metricBox(0.09, crossS, 0.09), mat(x, yc + 0.2 + crossS / 2, 0))
  b.add('helm', metricBox(0.09, 0.09, crossS * 0.5), mat(x, yc + 0.2 + crossS * 0.68, 0))
  b.add('helm', metricBox(0.07, 0.07, crossS * 0.3), mat(x, yc + 0.2 + crossS * 0.88, 0))
  b.add('helm', new THREE.TorusGeometry(crossS * 0.16, 0.03, 4, 14), mat(x, yc + 0.2 + crossS * 0.68, 0, Math.PI / 2))
}

function build(): Builder {
  const b = new Builder()
  const t = Math.tan(PITCH * D2R)

  /* ================= low block (porch + side annexes) ================= */
  const lx = (X0 + XA) / 2
  const ll = XA - X0
  b.block(WALL, ll, LOW, 2 * HW, lx, 0, 0)
  b.block(TRIM, ll + 0.16, 0.55, 2 * HW + 0.16, lx, 0, 0)
  b.block(GOLD, ll + 0.06, 0.5, 2 * HW + 0.06, lx, LOW - 0.75, 0)
  b.block(TRIM, ll + 0.14, 0.18, 2 * HW + 0.14, lx, LOW - 0.25, 0)
  // side elevations: arched icon niches with windows below in alternate bays
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HW, 0, 0, 0)
    const n = 9
    const step = (XA - 0.5 - (X0 + 0.6)) / n
    for (let i = 0; i < n; i++) {
      const x = X0 + 0.6 + step * (i + 0.5)
      const u = sz > 0 ? x : -x
      b.add(TRIM, extrude(frameShape('round', step - 0.55, 3.6, 0.16, u, 1.1), 0.1, 10), M(m, mat(0, 0, 0.01)))
      b.add(ICON, new THREE.ShapeGeometry(new THREE.Shape(opening('round', step - 0.75, 1.55, u, 3.05, 10))), M(m, mat(0, 0, 0.025)))
      if (i % 2 === 1) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.8, 1.4, u, 1.35))), M(m, mat(0, 0, 0.025)))
    }
  }
  // front: gold mosaic panel with medallions over three arched doorways, icon niches in the side bays
  {
    const m = faceFrame('-x', X0, 0, 0, 0)
    const pw = 6.4
    b.add(GOLD, metricBox(pw, LOW - 0.9, 0.06), M(m, mat(0, 0.55 + (LOW - 0.9) / 2, 0.03)))
    for (const u of [-2.0, 0, 2.0]) {
      b.add('apDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.55, 2.75, u, 0.55, 10))), M(m, mat(0, 0, 0.07)))
      b.add(TRIM, extrude(frameShape('round', 1.55, 2.75, 0.14, u, 0.55), 0.1, 10), M(m, mat(0, 0, 0.06)))
      b.add(WALL, new THREE.CircleGeometry(0.5, 18), M(m, mat(u, 4.25, 0.08)))
      b.add(ICON, new THREE.CircleGeometry(0.38, 18), M(m, mat(u, 4.25, 0.09)))
    }
    for (const u of [-3.0, -1.0, 1.0, 3.0]) b.add('apStone', new THREE.CylinderGeometry(0.17, 0.19, 2.2, 12), mat(X0 - 0.2, 0.55 + 1.1, u))
    for (const u of [-3.2, 3.2]) b.add(TRIM, metricBox(0.4, LOW - 0.6, 0.18), M(m, mat(u, 0.55 + (LOW - 0.6) / 2, 0.09)))
    for (const s of [-1, 1]) {
      for (const k of [0, 1]) {
        const u = s * (3.95 + k * 1.4)
        b.add(TRIM, extrude(frameShape('round', 1.0, 2.9, 0.16, u, 1.3), 0.1, 10), M(m, mat(0, 0, 0.01)))
        b.add(ICON, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.85, 2.0, u, 2.1, 10))), M(m, mat(0, 0, 0.025)))
      }
    }
    // steps
    for (let i = 0; i < 3; i++) b.block(TRIM, 0.35, 0.55 * (1 - i / 3), 7.2, X0 - 0.2 - i * 0.35, 0, 0)
  }
  // low lean-to roof around the front and the sides, timber soffit
  {
    const ye = LOW - LOV * Math.tan(25 * D2R)
    const yi = LOW + 0.85
    const Zo = HW + LOV
    const xo = X0 - LOV
    facet(b, ZN, [V(xo, ye, -Zo), V(xo, ye, Zo), V(XU0, yi, UHW), V(XU0, yi, -UHW)], { seams: SEAM, thickness: 0.08 })
    facet(b, ZN, [V(xo, ye, Zo), V(XA, ye, Zo), V(XA, yi, UHW), V(XU0, yi, UHW)], { seams: SEAM, thickness: 0.08 })
    facet(b, ZN, [V(XA, ye, -Zo), V(xo, ye, -Zo), V(XU0, yi, -UHW), V(XA, yi, -UHW)], { seams: SEAM, thickness: 0.08 })
    b.block(SOFFIT, XA - xo, 0.08, 2 * Zo, (XA + xo) / 2, ye - 0.1, 0)
    for (const sz of [-1, 1]) b.beam(ZN, V(xo, ye + 0.03, sz * Zo), V(XA, ye + 0.03, sz * Zo), 0.12, 0.12)
    b.beam(ZN, V(xo, ye + 0.03, -Zo), V(xo, ye + 0.03, Zo), 0.12, 0.12)
    // closing triangles at the apse junction
    for (const sz of [-1, 1]) {
      // shape x maps to −Z, extrusion along +X (ry = 90°)
      const tri = new THREE.Shape([new THREE.Vector2(-sz * UHW, LOW - 0.1), new THREE.Vector2(-sz * HW, LOW - 0.1), new THREE.Vector2(-sz * UHW, yi)])
      b.add(WALL, extrude(tri, 0.25), mat(XA - 0.25, 0, 0, Math.PI / 2))
    }
  }

  /* ================= upper nave body ================= */
  {
    const ux = (XU0 + XA) / 2
    const ul = XA - XU0
    b.block(WALL, ul, EAVE, 2 * UHW, ux, 0, 0)
    for (const sz of [-1, 1]) {
      const f: Face = sz > 0 ? '+z' : '-z'
      const m = faceFrame(f, sz * UHW, 0, 0, 0)
      const u0 = sz > 0 ? XU0 + 0.2 : -(XA - 0.2)
      const u1 = sz > 0 ? XA - 0.2 : -(XU0 + 0.2)
      arcade(b, m, u0, u1, 7.25, 1.25, 13)
      dentils(b, m, u0, u1, EAVE - 0.5)
      for (const x of [-7.6, -3.0, 1.2, 5.4]) arched(b, m, sz > 0 ? x : -x, 7.3, 0.55, 1.05, 'glassC', 0.08, BRICK)
    }
    const fm = faceFrame('-x', XU0, 0, 0, 0)
    arcade(b, fm, -UHW + 0.2, UHW - 0.2, 7.25, 1.25, 7)
    dentils(b, fm, -UHW + 0.2, UHW - 0.2, EAVE - 0.5)
    b.add('glassC', new THREE.CircleGeometry(0.45, 18), M(fm, mat(0, 7.85, 0.03)))
    b.add(BRICK, new THREE.TorusGeometry(0.52, 0.07, 6, 20), M(fm, mat(0, 7.85, 0.03)))
  }

  /* ================= apse (three-sided, from the OSM outline) ================= */
  const apsePts = (grow: number, y: number) => {
    const g = grow
    return [V(XA, y, -UHW - g), V(XE + g * 0.6, y, -AHW - g * 0.6), V(XE + g * 0.6, y, AHW + g * 0.6), V(XA, y, UHW + g)]
  }
  b.add(WALL, loft([apsePts(0, 0), apsePts(0, EAVE)], { capTop: true, flat: true }))
  b.add(TRIM, loft([apsePts(0.08, 0), apsePts(0.08, 0.55)], { capTop: true, flat: true }))
  b.add(BRICK, loft([apsePts(0.06, EAVE - 0.55), apsePts(0.06, EAVE - 0.35)], { capTop: true, flat: true }))
  {
    const ring = apsePts(0, 0)
    for (let i = 0; i < 3; i++) {
      const a = ring[i]
      const c = ring[i + 1]
      const mid = a.clone().add(c).multiplyScalar(0.5)
      const ang = Math.atan2(-(c.x - a.x), c.z - a.z) // outward normal angle in XZ
      const m = wallAt(mid.x, mid.z, ang)
      arched(b, m, 0, 3.3, 0.85, 2.6, 'glassC', 0.14, TRIM)
      arched(b, m, 0, 7.3, 0.55, 1.05, 'glassC', 0.08, BRICK)
    }
  }

  /* ================= main hipped roof + apse roof ================= */
  {
    const ye = EAVE - OV * t
    const yr = EAVE + UHW * t
    const H = UHW + OV
    const xf = XU0 - OV
    const xr = XU0 + UHW
    facet(b, ZN, [V(xf, ye, H), V(XA, ye, H), V(XA, yr, 0), V(xr, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, ZN, [V(XA, ye, -H), V(xf, ye, -H), V(xr, yr, 0), V(XA, yr, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, ZN, [V(xf, ye, -H), V(xf, ye, H), V(xr, yr, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(ZN, V(xr, yr + 0.05, 0), V(XA, yr + 0.05, 0), 0.2, 0.12)
    for (const sz of [-1, 1]) b.beam(ZN, V(xf, ye + 0.04, sz * H), V(xr, yr + 0.04, 0), 0.16, 0.1)
    // apse: hipped facets meeting at the ridge end
    const ap = apsePts(OV, ye)
    const apex = V(XA, yr, 0)
    for (let i = 0; i < 3; i++) {
      facet(b, ZN, [ap[i], ap[i + 1], apex], { seams: SEAM, thickness: 0.1 })
      if (i > 0) b.beam(ZN, ap[i].clone().add(V(0, 0.04, 0)), apex.clone().add(V(0, 0.04, 0)), 0.16, 0.1)
    }
    // timber soffits (visible rim under the eaves)
    b.block(SOFFIT, XA - xf, 0.1, 2 * H, (XA + xf) / 2, ye - 0.14, 0)
    b.add(SOFFIT, loft([apsePts(OV - 0.05, ye - 0.14), apsePts(OV - 0.05, ye - 0.04)], { capTop: true, capBottom: true, flat: true }))
  }

  /* ================= towers in the axis ================= */
  // narthex tower
  {
    const x = -7.4
    const top = squareStage(b, x, 3.7, EAVE - 0.6, 11.4, 0.75, true)
    drum(b, x, 1.15, top - 0.1, top + 2.8, 1.55, 1.3)
  }
  // naos tower (two square stages)
  {
    const x = 1.3
    const top1 = squareStage(b, x, 4.6, EAVE - 0.6, 11.0, 0.85, false)
    const top2 = squareStage(b, x, 3.6, top1 - 0.1, 12.4, 0.65, true)
    drum(b, x, 1.35, top2 - 0.1, top2 + 3.1, 1.75, 1.5)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1, 10.5, 3.5],
  materials: () => ({
    apWall: new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.9 }),
    apTrim: new THREE.MeshStandardMaterial({ color: '#e4dfd3', roughness: 0.86 }),
    apBrick: new THREE.MeshStandardMaterial({ color: '#a45a3c', roughness: 0.85 }),
    apGold: new THREE.MeshStandardMaterial({ color: '#c39a52', roughness: 0.55, metalness: 0.35 }),
    apIcon: new THREE.MeshStandardMaterial({ color: '#7d6a58', roughness: 0.7 }),
    apSoffit: new THREE.MeshStandardMaterial({ color: '#6a4631', roughness: 0.8 }),
    apDoor: new THREE.MeshStandardMaterial({ color: '#3b3a36', roughness: 0.5 }),
    apStone: new THREE.MeshStandardMaterial({ color: '#8d8f90', roughness: 0.6 }),
  }),
  notes:
    'Interwar neo-Romanian church: low porch/ambulatory block around a taller nave, narthex and naos towers in the axis, three-sided apse; roofs and tower caps in grey pre-patinated titanium-zinc as photographed in 2019; rear and north side inferred.',
}
export default model
