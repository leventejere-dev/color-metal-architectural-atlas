/**
 * Biserica „Adormirea Maicii Domnului”, Neptun (Mangalia), Constanța — modern
 * Orthodox church (built in the 2000s, under construction in 2008): cross plan
 * with a giant arched portal between two west towers, a large drum over the
 * naos, semicircular side apses (strane) and an altar apse.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 87.8° towards the altar (E); entrance front at −X (W)):
 *  - Length 27.8 m and width 11.6 m of the OSM rectangle (way 358120845); the
 *    side apses project beyond it (≈ 16 m across the strane, as the parish
 *    description states).
 *  - West front (photo 01, scaled on the 11.6 m front): square tower shafts
 *    ≈ 3.9 m at the corners, ≈ 10.7 m high; between them a projecting portal
 *    block ≈ 9.4 m wide in bare grey concrete with a giant round archivolt
 *    (crown ≈ 10.3 m) over a recessed arch and the entrance; cylindrical tower
 *    drums Ø ≈ 2.5 m with narrow arched windows to ≈ 14.2 m, onion cupolas,
 *    crosses ≈ 16.9 m.
 *  - Photo 03 (side): narthex roof between the towers, naos on a square base
 *    with semicircular arched gables over the side apses, tall cylindrical drum
 *    Ø ≈ 4 m with narrow windows, onion cupola (cross ≈ 19.4 m); half-domed side
 *    apses; lower chancel with a semicircular apse.
 *  - METAL as photographed (2013 and 2022): all roofs, half-domes and cupolas in
 *    bright natural aluminium sheet ('aluNatural'), standing seams ≈ 0.5 m —
 *    the aluminium COLOR METAL supplied in 2022 according to its records.
 * Approximations: east end and south side not photographed (mirrored /
 * inferred); naos and chancel lengths, roof pitches and drum heights estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, seams, faceFrame, facet, dome, ringBand, type Face } from '../kit'
import type { ModelModule } from '../registry'

const AL = 'aluNatural'
const SEAM = seams(AL, 0.5, 0.04, 0.04)
const WALL = 'npWall'
const TRIM = 'npTrim'
const CONC = 'npConcrete'
const D2R = Math.PI / 180

const XF = -13.9 // front of the portal block
const XT0 = -12.6 // front of the tower shafts
const XT1 = -8.7 // back of the tower shafts
const TS = 3.9 // tower shaft size
const HWF = 5.8 // half width at the towers (OSM)
const TH = 10.7 // tower shaft height
const NHW = 5.0 // nave half width
const EAVE = 8.0
const XC = -1.0 // naos centre
const XCH = 6.0 // start of the chancel
const XAP = 10.9 // altar apse centre

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function slit(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.12, u, y0), 0.12, 10), M(m, mat(0, 0, 0.01)))
}

/** gable roof along X */
function gableX(b: Builder, x0: number, x1: number, hw: number, y: number, pitch: number, ov = 0.35) {
  const t = Math.tan(pitch * D2R)
  const ry = y + hw * t
  const ey = y - ov * t
  const h = hw + ov
  facet(b, AL, [V(x0, ey, h), V(x1, ey, h), V(x1, ry, 0), V(x0, ry, 0)], { seams: SEAM, thickness: 0.1 })
  facet(b, AL, [V(x1, ey, -h), V(x0, ey, -h), V(x0, ry, 0), V(x1, ry, 0)], { seams: SEAM, thickness: 0.1 })
  b.beam(AL, V(x0, ry + 0.04, 0), V(x1, ry + 0.04, 0), 0.16, 0.1)
  return ry
}

/** cylindrical drum with pilaster strips and narrow windows, onion cupola, cross */
function drum(b: Builder, x: number, z: number, r: number, y0: number, y1: number, n: number, cupH: number, crossS: number) {
  b.add(WALL, new THREE.CylinderGeometry(r, r, y1 - y0, 32), mat(x, (y0 + y1) / 2, z))
  ringBand(b, TRIM, { x, z, n: 32, r, y: y0, h: 0.3, grow: 0.12 })
  ringBand(b, TRIM, { x, z, n: 32, r, y: y1 - 0.55, h: 0.18, grow: 0.1 })
  ringBand(b, TRIM, { x, z, n: 32, r, y: y1 - 0.3, h: 0.3, grow: 0.22 })
  const wh = (y1 - y0) * 0.55
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const m = wallAt(x + Math.cos(a) * r, z + Math.sin(a) * r, a)
    slit(b, m, 0, y0 + (y1 - y0) * 0.2, 0.32, wh)
    const a2 = a + Math.PI / n
    b.add(TRIM, metricBox(0.28, y1 - y0 - 0.9, 0.12), M(wallAt(x + Math.cos(a2) * r, z + Math.sin(a2) * r, a2), mat(0, y0 + 0.3 + (y1 - y0 - 0.9) / 2, 0.04)))
  }
  const prof: [number, number][] = [[1.0, 0], [1.08, 0.12], [1.12, 0.28], [1.04, 0.45], [0.82, 0.62], [0.52, 0.78], [0.24, 0.9], [0.08, 0.97], [0.02, 1]]
  const top = dome(b, AL, { x, y: y1, z, r: r + 0.05, h: cupH, profile: prof, seg: 36, ribs: Math.round(r * 12), ribH: 0.04 })
  b.add(AL, new THREE.SphereGeometry(crossS * 0.1, 12, 8), mat(x, top + 0.1, z))
  b.add('npCross', metricBox(0.09, crossS, 0.09), mat(x, top + 0.15 + crossS / 2, z))
  b.add('npCross', metricBox(0.09, 0.09, crossS * 0.55), mat(x, top + 0.15 + crossS * 0.68, z))
  b.add('npCross', new THREE.TorusGeometry(crossS * 0.16, 0.03, 4, 14), mat(x, top + 0.15 + crossS * 0.68, z, Math.PI / 2))
}

/** semicircular arched gable wall facing ±z (centre x, plane z), radius r, springing at y */
function archGable(b: Builder, x: number, z: number, sz: number, r: number, y: number) {
  const s = new THREE.Shape()
  s.moveTo(-r, y - 0.5)
  s.lineTo(r, y - 0.5)
  s.absarc(0, y, r, 0, Math.PI, false)
  s.lineTo(-r, y - 0.5)
  b.add(WALL, extrude(s, 0.4, 24), mat(x, 0, z - (sz > 0 ? 0.4 : 0), 0))
  // archivolt moulding and curved metal capping
  const segs = 20
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI
    const a1 = ((i + 1) / segs) * Math.PI
    const p0 = V(x + Math.cos(a0) * (r + 0.1), y + Math.sin(a0) * (r + 0.1), z)
    const p1 = V(x + Math.cos(a1) * (r + 0.1), y + Math.sin(a1) * (r + 0.1), z)
    b.beam(AL, p0, p1, 0.75, 0.12, V(Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0))
  }
  return y + r
}

function build(): Builder {
  const b = new Builder()

  /* ================= west towers ================= */
  for (const sz of [-1, 1]) {
    const tz = sz * (HWF - TS / 2)
    const tx = (XT0 + XT1) / 2
    b.block(WALL, TS, TH, TS, tx, 0, tz)
    b.block(TRIM, TS + 0.2, 0.6, TS + 0.2, tx, 0, tz)
    b.block(TRIM, TS + 0.35, 0.22, TS + 0.35, tx, TH - 0.22, tz)
    b.block(TRIM, TS + 0.1, 0.18, TS + 0.1, tx, 5.9, tz)
    // flat roof of the shaft (metal)
    b.block(AL, TS + 0.3, 0.08, TS + 0.3, tx, TH, tz)
    // side windows of the shafts
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HWF, 0, 0, 0)
    for (const y of [3.0, 7.0]) slit(b, m, sz > 0 ? tx : -tx, y, 0.6, 1.7)
    // oculus on the front
    const mf = faceFrame('-x', XT0, 0, 0, 0)
    b.add('glassC', new THREE.CircleGeometry(0.28, 16), M(mf, mat(tz, 7.9, 0.03)))
    b.add(TRIM, new THREE.TorusGeometry(0.34, 0.06, 6, 18), M(mf, mat(tz, 7.9, 0.03)))
    drum(b, tx, tz, 1.25, TH, 14.2, 6, 1.35, 1.5)
  }

  /* ================= portal block ================= */
  {
    const hw = 4.7
    const ys = 6.0
    const s = new THREE.Shape()
    s.moveTo(-hw, 0)
    s.lineTo(hw, 0)
    s.lineTo(hw, ys)
    s.absarc(0, ys, hw, 0, Math.PI, false)
    s.lineTo(-hw, 0)
    // shape x maps to −Z (ry = 90°): extrude from XF back to XT0
    b.add(CONC, extrude(s, XT0 - XF + 0.3, 32), mat(XF, 0, 0, Math.PI / 2))
    // archivolt (light trim) along the front
    const segs = 28
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI
      const a1 = ((i + 1) / segs) * Math.PI
      const p0 = V(XF - 0.15, ys + Math.sin(a0) * (hw - 0.25), Math.cos(a0) * (hw - 0.25))
      const p1 = V(XF - 0.15, ys + Math.sin(a1) * (hw - 0.25), Math.cos(a1) * (hw - 0.25))
      b.beam(TRIM, p0, p1, 0.45, 0.5, V(0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)))
      const q0 = V((XF + XT0) / 2, ys + Math.sin(a0) * (hw + 0.02), Math.cos(a0) * (hw + 0.02))
      const q1 = V((XF + XT0) / 2, ys + Math.sin(a1) * (hw + 0.02), Math.cos(a1) * (hw + 0.02))
      b.beam(AL, q0, q1, XT0 - XF + 0.5, 0.08, V(0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)))
    }
    for (const u of [-hw + 0.25, hw - 0.25]) b.add(TRIM, new THREE.CylinderGeometry(0.22, 0.24, ys, 14), mat(XF - 0.15, ys / 2, u))
    // recessed inner arch with the entrance
    const m = faceFrame('-x', XF, 0, 0, 0)
    b.add('npShade', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.4, 6.8, 0, 0.8, 16))), M(m, mat(0, 0, 0.03)))
    b.add(CONC, extrude(frameShape('round', 3.4, 6.8, 0.35, 0, 0.8), 0.15, 16), M(m, mat(0, 0, 0.01)))
    b.add('npDoor', metricBox(2.4, 2.6, 0.05), M(m, mat(0, 0.8 + 1.3, 0.05)))
    b.add(AL, metricBox(3.2, 0.12, 0.9), M(m, mat(0, 3.7, 0.45)))
    for (let i = 0; i < 3; i++) b.block(CONC, 0.4, 0.8 * (1 - i / 3), 5.0, XF - 0.2 - i * 0.4, 0, 0)
    b.block(CONC, 1.2, 0.8, 9.6, XF - 0.3, 0, 0)
  }

  /* ================= narthex between the towers ================= */
  {
    const x0 = XT0 + 0.3
    const x1 = XT1
    b.block(WALL, x1 - x0, EAVE, 2 * (HWF - TS) + 0.2, (x0 + x1) / 2, 0, 0)
    gableX(b, x0 - 0.2, x1 + 0.2, HWF - TS + 0.1, EAVE, 32, 0.2)
  }

  /* ================= nave + naos ================= */
  const nx0 = XT1
  const nx1 = XCH
  b.block(WALL, nx1 - nx0, EAVE, 2 * NHW, (nx0 + nx1) / 2, 0, 0)
  b.block(TRIM, nx1 - nx0 + 0.16, 0.6, 2 * NHW + 0.16, (nx0 + nx1) / 2, 0, 0)
  b.block(TRIM, nx1 - nx0 + 0.3, 0.22, 2 * NHW + 0.3, (nx0 + nx1) / 2, EAVE - 0.22, 0)
  gableX(b, nx0, nx1, NHW, EAVE, 30)
  for (const sz of [-1, 1]) {
    const m = faceFrame(sz > 0 ? '+z' : '-z', sz * NHW, 0, 0, 0)
    for (const x of [-6.6, 4.4]) {
      const u = sz > 0 ? x : -x
      slit(b, m, u - 0.45, 3.0, 0.42, 2.0)
      slit(b, m, u, 3.0, 0.42, 2.3)
      slit(b, m, u + 0.45, 3.0, 0.42, 2.0)
      b.add(TRIM, metricBox(1.8, 0.14, 0.2), M(m, mat(u, 2.85, 0.1)))
    }
  }
  // naos square base with arched gables (four arms)
  const base = 6.6
  b.block(WALL, base, 11.0, base, XC, 0, 0)
  b.block(TRIM, base + 0.4, 0.25, base + 0.4, XC, 10.75, 0)
  b.block(AL, base + 0.3, 0.08, base + 0.3, XC, 11.0, 0)
  for (const sz of [-1, 1]) archGable(b, XC, sz * (base / 2 + 0.01), sz, 3.0, 7.6)
  // side apses (strane) with half-domes
  for (const sz of [-1, 1]) {
    const r = 2.6
    const zc = sz * NHW
    const h = 6.4
    b.add(WALL, new THREE.CylinderGeometry(r, r, h, 28, 1, false, sz > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), mat(XC, h / 2, zc))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.25, 28, 1, false, sz > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), mat(XC, h - 0.12, zc))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.6, 28, 1, false, sz > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), mat(XC, 0.3, zc))
    b.add(AL, new THREE.SphereGeometry(r + 0.3, 28, 10, sz > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2), mat(XC, h, zc, 0, 0, 0, 1, 0.62, 1))
    for (let k = 1; k < 12; k++) {
      const a = (k / 12) * Math.PI + (sz > 0 ? 0 : Math.PI)
      const d = V(Math.cos(a), 0, Math.sin(a))
      for (let i = 0; i < 5; i++) {
        const e0 = (i / 5) * (Math.PI / 2)
        const e1 = ((i + 1) / 5) * (Math.PI / 2)
        const R = r + 0.33
        b.beam(AL, V(XC + d.x * Math.cos(e0) * R, h + Math.sin(e0) * R * 0.62, zc + d.z * Math.cos(e0) * R), V(XC + d.x * Math.cos(e1) * R, h + Math.sin(e1) * R * 0.62, zc + d.z * Math.cos(e1) * R), 0.04, 0.04)
      }
    }
    for (const a of [-50, 0, 50]) {
      const ar = (a * D2R) + (sz > 0 ? Math.PI / 2 : -Math.PI / 2)
      slit(b, wallAt(XC + Math.cos(ar) * r, zc + Math.sin(ar) * r, ar), 0, 2.6, 0.5, 2.2)
    }
  }
  drum(b, XC, 0, 2.0, 11.0, 15.8, 8, 2.0, 1.6)

  /* ================= chancel and altar apse ================= */
  {
    const hw = 4.0
    const e = 7.0
    b.block(WALL, XAP - XCH, e, 2 * hw, (XCH + XAP) / 2, 0, 0)
    b.block(TRIM, XAP - XCH + 0.3, 0.22, 2 * hw + 0.3, (XCH + XAP) / 2, e - 0.22, 0)
    const r = 3.0
    b.add(WALL, new THREE.CylinderGeometry(r, r, e, 28, 1, false, 0, Math.PI), mat(XAP, e / 2, 0))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.25, 28, 1, false, 0, Math.PI), mat(XAP, e - 0.12, 0))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.6, 28, 1, false, 0, Math.PI), mat(XAP, 0.3, 0))
    const t = Math.tan(30 * D2R)
    const ry = gableX(b, XCH - 0.3, XAP, hw, e, 30)
    // half-cone over the apse
    b.add(AL, new THREE.LatheGeometry([new THREE.Vector2(r + 0.35, e - 0.35 * t), new THREE.Vector2(0.02, ry)], 28, 0, Math.PI), mat(XAP, 0, 0))
    for (let k = 1; k < 14; k++) {
      const a = (k / 14) * Math.PI
      const d = V(Math.sin(a), 0, Math.cos(a))
      b.beam(AL, V(XAP + d.x * (r + 0.33), e - 0.3 * t + 0.02, d.z * (r + 0.33)), V(XAP + d.x * 0.3, ry - 0.3 * t, d.z * 0.3), 0.04, 0.04)
    }
    // gable end against the naos
    for (const a of [-40, 0, 40]) {
      const ar = a * D2R
      slit(b, wallAt(XAP + Math.cos(ar) * r, Math.sin(ar) * r, ar), 0, 2.5, 0.45, 2.0)
    }
    for (const sz of [-1, 1]) slit(b, faceFrame(sz > 0 ? '+z' : '-z', sz * hw, 0, 0, 0), sz > 0 ? 8.4 : -8.4, 2.5, 0.45, 2.0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1, 16.5, 0],
  materials: () => ({
    npWall: new THREE.MeshStandardMaterial({ color: '#dddcd5', roughness: 0.9 }),
    npTrim: new THREE.MeshStandardMaterial({ color: '#ecebe5', roughness: 0.85 }),
    npConcrete: new THREE.MeshStandardMaterial({ color: '#a7a6a1', roughness: 0.95 }),
    npShade: new THREE.MeshStandardMaterial({ color: '#8e8d88', roughness: 0.95 }),
    npDoor: new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.7 }),
    npCross: new THREE.MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.3, metalness: 0.8 }),
  }),
  notes:
    'Modern cross-plan church with a giant arched concrete portal between two west towers, a large naos drum and half-domed side apses; roofs, half-domes and cupolas in natural aluminium as photographed; east end and south side inferred.',
}
export default model
