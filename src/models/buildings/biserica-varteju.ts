/**
 * Biserica „Sfinții Ioachim și Ana”, Vârteju (Măgurele, Ilfov), LMI
 * IF-II-m-B-15320 — white hall church with two west towers, a central dome and
 * a semicircular apse. COLOR METAL: elZinc Slate pre-weathered titanium-zinc
 * (2017, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 53.2° towards the apse (NE); entrance front at −X (SW)):
 *  - Footprint after OSM way 1171542832: 29.4 × 10.9 m; nave walls straight to
 *    X 9.3, semicircular apse of the full width (R ≈ 5.45 m) to X 14.7.
 *  - Entrance front (photo 01, porch ≈ 10.9 m wide as scale): open porch of
 *    three round arches on piers (X −14.7 → −11.7), gable pediment with the
 *    Eye-of-God fresco (eaves ≈ 5.6 m, apex ≈ 7.2 m); behind it the main gable
 *    (eaves ≈ 9.4 m, apex ≈ 12.3 m) edged with a brick-red coping band over a
 *    crenellated blind-arcade frieze and a central cross ornament.
 *  - Two west towers at the corners of the narthex: square lower stage with a
 *    cross relief to ≈ 12.3 m, octagonal belfry with arched windows to ≈ 15.3 m,
 *    flared octagonal zinc roof with a small domed lantern and cross (≈ 18.7 m).
 *  - Central octagonal drum over the naos on a square base, ribbed zinc dome,
 *    cross (≈ 17.5 m); nave eaves ≈ 8.8 m, gable roof ≈ 28°; half-conical apse
 *    roof. Horizontally grooved white render, brick-red band and small
 *    crenellated cornice (photo 02).
 *  - METAL as photographed (Oct 2026): dark grey pre-weathered titanium-zinc
 *    ('zincSlate') on all roofs, tower roofs and the dome; standing seam ≈ 0.5 m.
 * Approximations: only the entrance front is documented by a full photograph —
 * side elevations, window counts, apse and drum details are inferred from the
 * typology and the partial side photo 02; all heights estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, helm, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincSlate'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const WALL = 'vjWall'
const TRIM = 'vjTrim'
const BRICK = 'vjBrick'
const D2R = Math.PI / 180

const HW = 5.45
const EAVE = 8.8
const PITCH = 28
const PORCH = { x0: -14.7, x1: -11.7, eave: 5.6 }
const NARTHEX = { x0: -11.7, x1: -7.3, eave: 9.4 }
const NAVE = { x0: -7.3, x1: 9.3 }
const APSE = { x: 9.3, r: HW }
const TWR = { s: 3.4, y1: 12.3, a: 1.45, y2: 15.3 }
const DOME = { x: 2.0, base: 5.0, y0: 11.6, a: 2.0, y1: 14.4 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, glass = 'glassC', f = 0.14) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, u, y0), 0.1, 10), M(m, mat(0, 0, 0.01)))
}

/** crenellated blind-arcade frieze (small arches with merlons) along u0..u1 at y */
function crenel(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number, step = 0.62) {
  b.add(TRIM, metricBox(u1 - u0, 0.12, 0.14), M(m, mat((u0 + u1) / 2, y, 0.07)))
  for (let u = u0 + step / 2; u < u1; u += step) {
    b.add(TRIM, metricBox(step * 0.42, 0.42, 0.12), M(m, mat(u, y + 0.27, 0.06)))
    b.add(WALL, new THREE.CircleGeometry(step * 0.16, 8, 0, Math.PI), M(m, mat(u + step / 2, y + 0.1, 0.02)))
  }
  b.add(TRIM, metricBox(u1 - u0, 0.14, 0.18), M(m, mat((u0 + u1) / 2, y + 0.55, 0.09)))
}

/** gable roof along X with dark zinc seams */
function gableX(b: Builder, x0: number, x1: number, hw: number, y: number, pitch: number, ov = 0.45) {
  const t = Math.tan(pitch * D2R)
  const ry = y + hw * t
  const ey = y - ov * t
  const h = hw + ov
  facet(b, ZN, [V(x0, ey, h), V(x1, ey, h), V(x1, ry, 0), V(x0, ry, 0)], { seams: SEAM, thickness: 0.1 })
  facet(b, ZN, [V(x1, ey, -h), V(x0, ey, -h), V(x0, ry, 0), V(x1, ry, 0)], { seams: SEAM, thickness: 0.1 })
  b.beam(ZN, V(x0, ry + 0.05, 0), V(x1, ry + 0.05, 0), 0.2, 0.12)
  return ry
}

/** gable end wall (triangle) facing −X at x, with brick coping band along the rakes */
function gableEnd(b: Builder, x: number, hw: number, y: number, pitch: number, brick: boolean) {
  const t = Math.tan(pitch * D2R)
  const tri = new THREE.Shape([new THREE.Vector2(-hw, y - 0.01), new THREE.Vector2(hw, y - 0.01), new THREE.Vector2(0, y + hw * t)])
  b.add(WALL, extrude(tri, 0.5), mat(x + 0.5, 0, 0, -Math.PI / 2))
  for (const s of [-1, 1]) {
    const a = V(x - 0.12, y - 0.05, s * (hw + 0.4))
    const c = V(x - 0.12, y + hw * t + 0.25, 0)
    b.beam(brick ? BRICK : TRIM, a, c, 0.75, 0.35, V(-1, 0, 0))
    if (brick) b.beam(TRIM, a.clone().add(V(-0.02, -0.38, 0)), c.clone().add(V(-0.02, -0.38, 0)), 0.14, 0.32, V(-1, 0, 0))
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= nave + narthex walls ================= */
  const walls = (x0: number, x1: number, eave: number) => {
    const w = x1 - x0
    const x = (x0 + x1) / 2
    b.block(WALL, w, eave, 2 * HW, x, 0, 0)
    b.block(TRIM, w + 0.16, 0.7, 2 * HW + 0.16, x, 0, 0)
    // horizontal render grooves (rustication) on the lower wall
    for (let y = 1.0; y < 4.2; y += 0.5) b.block(TRIM, w + 0.04, 0.06, 2 * HW + 0.04, x, y, 0)
    b.block(BRICK, w + 0.08, 0.3, 2 * HW + 0.08, x, 4.35, 0)
    b.block(TRIM, w + 0.4, 0.22, 2 * HW + 0.4, x, eave - 0.22, 0)
  }
  walls(NAVE.x0, NAVE.x1, EAVE)
  walls(NARTHEX.x0, NARTHEX.x1, NARTHEX.eave)
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HW, 0, 0, 0)
    const U = (x: number) => (sz > 0 ? x : -x)
    crenel(b, m, U(sz > 0 ? NAVE.x0 : NAVE.x1), U(sz > 0 ? NAVE.x1 : NAVE.x0), EAVE - 0.95)
    for (const x of [-4.8, -1.0, 4.6]) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 3.0, U(x), 4.9, 10))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 1.1, 3.0, 0.18, U(x), 4.9), 0.1, 10), M(m, mat(0, 0, 0.01)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.9, 1.6, U(x), 1.6))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('rect', 0.9, 1.6, 0.14, U(x), 1.6), 0.08), M(m, mat(0, 0, 0.01)))
    }
    // narthex side window
    arched(b, faceFrame(f, sz * HW, 0, 0, 0), U(-9.5), 4.9, 0.9, 2.6)
  }
  gableX(b, NAVE.x0 - 0.2, NAVE.x1, HW, EAVE, PITCH)
  gableX(b, NARTHEX.x0 - 0.2, NARTHEX.x1 + 0.4, HW, NARTHEX.eave, PITCH)

  /* ================= main west gable ================= */
  {
    const x = NARTHEX.x0
    gableEnd(b, x, HW, NARTHEX.eave, PITCH, true)
    const fw = faceFrame('-x', x, 0, 0, 0)
    // crenellated blind-arcade frieze under the gable
    crenel(b, fw, -HW + 0.4, HW - 0.4, NARTHEX.eave - 1.1)
    for (const u of [-HW + 0.25, HW - 0.25]) b.add(TRIM, metricBox(0.55, NARTHEX.eave, 0.2), M(fw, mat(u, NARTHEX.eave / 2, 0.1)))
    // cross ornament in the gable
    b.add('gilt', metricBox(0.18, 1.0, 0.06), M(fw, mat(0, NARTHEX.eave + 0.85, 0.05)))
    b.add('gilt', metricBox(0.8, 0.16, 0.06), M(fw, mat(0, NARTHEX.eave + 0.95, 0.05)))
    for (const u of [-2.6, 2.6]) arched(b, fw, u, 6.4, 0.7, 1.6)
  }

  /* ================= porch ================= */
  {
    const { x0, x1, eave } = PORCH
    const px = (x0 + x1) / 2
    b.block(TRIM, x1 - x0 + 0.6, 0.5, 2 * HW + 0.4, px - 0.2, 0, 0)
    for (let i = 0; i < 2; i++) b.block(TRIM, 0.4, 0.5 * (1 - (i + 1) / 3), 4.2, x0 - 0.3 - i * 0.4, 0, 0)
    // front wall with three round arches
    const s = new THREE.Shape([new THREE.Vector2(-HW, 0.5), new THREE.Vector2(HW, 0.5), new THREE.Vector2(HW, eave), new THREE.Vector2(-HW, eave)])
    for (const u of [-3.3, 0, 3.3]) s.holes.push(new THREE.Path(opening('round', 2.5, 3.7, u, 0.5, 12)))
    b.add(WALL, extrude(s, 0.7), mat(x0 + 0.7, 0, 0, -Math.PI / 2))
    for (const u of [-3.3, 0, 3.3]) b.add(TRIM, extrude(frameShape('round', 2.5, 3.7, 0.18, u, 0.5), 0.1, 12), mat(x0 - 0.02, 0, 0, -Math.PI / 2))
    // column shafts on the piers
    for (const u of [-1.65, 1.65]) b.add(TRIM, new THREE.CylinderGeometry(0.2, 0.22, 2.6, 12), mat(x0 - 0.15, 0.5 + 1.3, u))
    // sides (one arch each)
    for (const sz of [-1, 1]) {
      const ss = new THREE.Shape([new THREE.Vector2(x0, 0.5), new THREE.Vector2(x1, 0.5), new THREE.Vector2(x1, eave), new THREE.Vector2(x0, eave)])
      ss.holes.push(new THREE.Path(opening('round', 1.6, 3.4, px - 0.1, 0.5, 12)))
      b.add(WALL, extrude(ss, 0.5), mat(0, 0, sz > 0 ? HW - 0.5 : -HW, 0))
    }
    b.block(TRIM, x1 - x0 + 0.3, 0.3, 2 * HW + 0.4, px, eave - 0.3, 0)
    gableX(b, x0 - 0.4, x1 + 0.2, HW, eave, 17)
    // pediment with the Eye-of-God fresco
    const t = Math.tan(17 * D2R)
    const tri = new THREE.Shape([new THREE.Vector2(-HW, eave), new THREE.Vector2(HW, eave), new THREE.Vector2(0, eave + HW * t)])
    b.add(WALL, extrude(tri, 0.3), mat(x0 + 0.3, 0, 0, -Math.PI / 2))
    const fresco = new THREE.Shape([new THREE.Vector2(-2.6, eave + 0.2), new THREE.Vector2(2.6, eave + 0.2), new THREE.Vector2(0, eave + 0.2 + 2.6 * t)])
    b.add('vjFresco', new THREE.ShapeGeometry(fresco), mat(x0 - 0.02, 0, 0, -Math.PI / 2))
    for (const sz of [-1, 1]) b.beam(TRIM, V(x0 - 0.1, eave - 0.05, sz * (HW + 0.45)), V(x0 - 0.1, eave + HW * t + 0.15, 0), 0.3, 0.3, V(-1, 0, 0))
    b.add(TRIM, metricBox(0.4, 0.3, 2 * HW + 0.8), mat(x0 - 0.1, eave - 0.15, 0))
    // entrance door
    const fw = faceFrame('-x', NARTHEX.x0, 0, 0, 0)
    b.add('vjDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 3.0, 0, 0.5, 10))), M(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.6, 3.0, 0.2, 0, 0.5), 0.1, 10), M(fw, mat(0, 0, 0.01)))
  }

  /* ================= west towers ================= */
  for (const sz of [-1, 1]) {
    const tx = NARTHEX.x0 + TWR.s / 2 + 0.2
    const tz = sz * (HW - TWR.s / 2)
    const y0 = NARTHEX.eave - 0.5
    b.block(WALL, TWR.s, TWR.y1 - y0, TWR.s, tx, y0, tz)
    b.block(TRIM, TWR.s + 0.3, 0.25, TWR.s + 0.3, tx, TWR.y1 - 0.25, tz)
    for (const [f, plane, u] of [['-x', tx - TWR.s / 2, tz], ['+x', tx + TWR.s / 2, -tz], ['+z', tz + TWR.s / 2, tx], ['-z', tz - TWR.s / 2, -tx]] as [Face, number, number][]) {
      const m = faceFrame(f, plane, u, 0, 0)
      b.add(TRIM, metricBox(0.3, 1.1, 0.06), M(m, mat(0, TWR.y1 - 1.3, 0.03)))
      b.add(TRIM, metricBox(1.1, 0.3, 0.06), M(m, mat(0, TWR.y1 - 1.3, 0.03)))
      crenel(b, m, -TWR.s / 2 + 0.1, TWR.s / 2 - 0.1, TWR.y1 - 0.8, 0.5)
    }
    // octagonal belfry
    const R = TWR.a / Math.cos(Math.PI / 8)
    prism(b, WALL, { x: tx, z: tz, n: 8, r: R, y0: TWR.y1, h: TWR.y2 - TWR.y1 })
    ringBand(b, TRIM, { x: tx, z: tz, n: 8, r: R, y: TWR.y2 - 0.3, h: 0.3, grow: 0.12 })
    for (let k = 0; k < 8; k += 2) {
      const ang = (k * Math.PI) / 4
      arched(b, wallAt(tx + Math.cos(ang) * TWR.a, tz + Math.sin(ang) * TWR.a, ang), 0, TWR.y1 + 0.55, 0.5, 1.9, 'vjDark', 0.08)
    }
    // flared octagonal roof with small domed lantern
    const y = TWR.y2
    helm(b, ZN, { x: tx, z: tz, n: 8, stations: [[R + 0.75, y - 0.1], [R + 0.45, y + 0.15], [R * 0.75, y + 0.7], [R * 0.35, y + 1.25], [0.32, y + 1.4]] })
    prism(b, WALL, { x: tx, z: tz, n: 8, r: 0.38, y0: y + 1.3, h: 0.45 })
    b.add(ZN, new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(tx, y + 1.75, tz))
    b.add('gilt', metricBox(0.07, 1.1, 0.07), mat(tx, y + 2.7, tz))
    b.add('gilt', metricBox(0.07, 0.07, 0.6), mat(tx, y + 2.9, tz))
    b.add('gilt', new THREE.TorusGeometry(0.22, 0.03, 4, 12), mat(tx, y + 2.9, tz, Math.PI / 2))
  }

  /* ================= central drum + dome ================= */
  {
    const x = DOME.x
    const bh = DOME.y0 - EAVE + 0.5
    b.block(WALL, DOME.base, bh, DOME.base, x, EAVE - 0.5, 0)
    b.block(TRIM, DOME.base + 0.35, 0.25, DOME.base + 0.35, x, DOME.y0 - 0.25, 0)
    const R = DOME.a / Math.cos(Math.PI / 8)
    prism(b, WALL, { x, n: 8, r: R, y0: DOME.y0, h: DOME.y1 - DOME.y0 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: DOME.y1 - 0.3, h: 0.3, grow: 0.15 })
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      arched(b, wallAt(x + Math.cos(ang) * DOME.a, Math.sin(ang) * DOME.a, ang), 0, DOME.y0 + 0.5, 0.5, 1.8, 'glassC', 0.08)
    }
    const y = DOME.y1
    const st: [number, number][] = [[R + 0.35, y], [R + 0.3, y + 0.25], [R * 0.9, y + 0.8], [R * 0.66, y + 1.35], [R * 0.36, y + 1.75], [0.12, y + 1.95]]
    helm(b, ZN, { x, n: 8, stations: st })
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4
      for (let i = 0; i < st.length - 1; i++) b.beam(ZN, V(x + Math.cos(a) * st[i][0], st[i][1], Math.sin(a) * st[i][0]), V(x + Math.cos(a) * st[i + 1][0], st[i + 1][1], Math.sin(a) * st[i + 1][0]), 0.08, 0.06, V(Math.cos(a), 0, Math.sin(a)))
    }
    b.add('gilt', metricBox(0.08, 1.4, 0.08), mat(x, y + 2.6, 0))
    b.add('gilt', metricBox(0.08, 0.08, 0.8), mat(x, y + 2.9, 0))
    b.add('gilt', new THREE.TorusGeometry(0.28, 0.035, 4, 12), mat(x, y + 2.9, 0, Math.PI / 2))
  }

  /* ================= apse ================= */
  {
    const seg = 24
    b.add(WALL, new THREE.CylinderGeometry(APSE.r, APSE.r, EAVE, seg, 1, true, 0, Math.PI), mat(APSE.x, EAVE / 2, 0))
    b.add(TRIM, new THREE.CylinderGeometry(APSE.r + 0.08, APSE.r + 0.08, 0.7, seg, 1, false, 0, Math.PI), mat(APSE.x, 0.35, 0))
    b.add(BRICK, new THREE.CylinderGeometry(APSE.r + 0.04, APSE.r + 0.04, 0.3, seg, 1, false, 0, Math.PI), mat(APSE.x, 4.5, 0))
    b.add(TRIM, new THREE.CylinderGeometry(APSE.r + 0.2, APSE.r + 0.2, 0.22, seg, 1, false, 0, Math.PI), mat(APSE.x, EAVE - 0.11, 0))
    for (let y = 1.0; y < 4.2; y += 0.5) b.add(TRIM, new THREE.CylinderGeometry(APSE.r + 0.02, APSE.r + 0.02, 0.06, seg, 1, true, 0, Math.PI), mat(APSE.x, y, 0))
    const t = Math.tan(PITCH * D2R)
    const rise = (APSE.r + 0.45) * t
    b.add(ZN, new THREE.LatheGeometry([new THREE.Vector2(APSE.r + 0.45, EAVE - 0.45 * t), new THREE.Vector2(0.02, EAVE + APSE.r * t)], seg, 0, Math.PI), mat(APSE.x, 0, 0))
    for (let k = 1; k < 18; k++) {
      const a = (k / 18) * Math.PI
      const d = V(Math.sin(a), 0, Math.cos(a))
      b.beam(ZN, V(APSE.x + d.x * (APSE.r + 0.43), EAVE - 0.4 * t + 0.03, d.z * (APSE.r + 0.43)), V(APSE.x + d.x * 0.3, EAVE - 0.45 * t + rise - 0.3 * t, d.z * 0.3), 0.045, 0.045)
    }
    for (const a of [-55, 0, 55]) {
      const ar = a * D2R
      arched(b, wallAt(APSE.x + Math.cos(ar) * APSE.r, Math.sin(ar) * APSE.r, ar), 0, 4.9, 0.9, 2.6)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [0, 11, 3],
  materials: () => ({
    vjWall: new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.9 }),
    vjTrim: new THREE.MeshStandardMaterial({ color: '#e7e3da', roughness: 0.86 }),
    vjBrick: new THREE.MeshStandardMaterial({ color: '#a65a3e', roughness: 0.85 }),
    vjFresco: new THREE.MeshStandardMaterial({ color: '#7f9cc4', roughness: 0.7 }),
    vjDoor: new THREE.MeshStandardMaterial({ color: '#5a3b26', roughness: 0.7 }),
    vjDark: new THREE.MeshStandardMaterial({ color: '#35383c', roughness: 0.7 }),
  }),
  notes:
    'White hall church with two west belfries, a central dome and a semicircular apse; roofs, tower roofs and dome in dark grey pre-weathered titanium-zinc (elZinc Slate) as photographed; side elevations and apse inferred.',
}
export default model
