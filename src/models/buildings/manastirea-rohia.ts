/**
 * Mănăstirea „Sfânta Ana” Rohia — main church (OSM way 267015840, the building
 * of the research record).
 *
 * Modelling specification (real metres). +X = OSM long axis 137.5° towards the
 * rounded altar end (south-east); the entrance front with the tower faces −X;
 * +Z = 227.5° (south-west, the side seen in photo 01).
 *  - Plan after the OSM outline: body 26.5 × 13.8 m, straight part to x = 6.3,
 *    altar end closed polygonally (5/8); open entrance porch with four columns
 *    and three arches in the west front (photo 03); small gabled projection on
 *    the south side near the west end (photo 01).
 *  - Heights from photos 01 and 03 (drum diameter ≈5.7 m and the 13.8 m front
 *    as the scale): walls to the eave ≈12 m in neo-Byzantine bands of red brick
 *    and white render, tall blind arcades below, a frieze of small arches and
 *    a band of mosaic saints under the eave, Deesis mosaic above the porch;
 *    wide-eaved hipped roof ≈29° (ridge ≈16 m); square tower base to ≈17.4 m
 *    with its own wide-eaved skirt roof; octagonal base, tall round drum with
 *    eight arched windows to ≈26.4 m, mosaic band, broad flared conical eave,
 *    tall octagonal spire, ball and cross at ≈41.5 m.
 *  - METAL (decision from the photographs): the photos of the church (2007 and
 *    Jan 2018) show grey sheet-metal roofs; the only copper visible at Rohia is
 *    on the new Nicolae Steinhardt centre (Jan 2018, ≈100 m north-east, under
 *    scaffolding, not modelled). COLOR METAL's records list copper for Rohia in
 *    2019, after all church photographs, without naming the building; this
 *    model keeps the record's building (the main church) and, per the client
 *    rule, shows its roofs, tower skirt, flared eave and spire in weathered
 *    copper (≤2022). ROOF = 'helm' would show the grey sheet as photographed.
 * Approximations: all heights, the north and east sides (not photographed),
 * mosaics and arcades simplified, terraces and the wooden bell tower omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, faceFrame, seams, cross, helm, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ROOF = 'copperBrown'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)

const ZC = -0.5
const HW = 6.9
const X0 = -13.1
const XB = X0 + 2.6 // body face behind the open porch
const XC = 6.3
const RC = HW / Math.cos(22.5 * D2R)
const EAVE = 12.0
const PITCH = 29
const TB = { x: -7.6, hw: 3.8, top: 17.4 } // square tower base
const DR = { r: 2.85, y0: 19.7, y1: 26.4 } // drum

const apsePt = (a: number, r: number, y: number) => V(XC + r * Math.cos(a * D2R), y, ZC + r * Math.sin(a * D2R))

/** Outline ring of the church body (straight part + 5/8 altar end). */
function bodyRing(y: number, grow = 0) {
  const hw = HW + grow
  const rc = RC + grow / Math.cos(22.5 * D2R)
  return [V(XB - grow, y, ZC - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(XB - grow, y, ZC + hw)]
}

/** Hipped roof over the body outline: hip at the west end, polygonal hip at the altar end. */
function bodyRoof(b: Builder, eave: number, ov: number) {
  const t = Math.tan(PITCH * D2R)
  const eY = eave - ov * t
  const hw = HW + ov
  const rcO = RC * (hw / HW)
  const ridge = eave + HW * t
  const xw = X0 + HW // west end of the ridge (hip)
  const apex = V(XC, ridge, ZC)
  const W = (x: number, z: number) => V(x, eY, ZC + z)
  facet(b, ROOF, [W(X0 - ov, hw), apsePt(67.5, rcO, eY), apex, V(xw, ridge, ZC)], { seams: SEAM, thickness: 0.12 })
  facet(b, ROOF, [apsePt(-67.5, rcO, eY), W(X0 - ov, -hw), V(xw, ridge, ZC), apex], { seams: SEAM, thickness: 0.12 })
  facet(b, ROOF, [W(X0 - ov, -hw), W(X0 - ov, hw), V(xw, ridge, ZC)], { seams: SEAM, thickness: 0.12 })
  const angs = [67.5, 22.5, -22.5, -67.5]
  for (let i = 0; i < 3; i++) facet(b, ROOF, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex], { seams: SEAM, thickness: 0.12 })
  b.beam(ROOF, V(xw, ridge + 0.07, ZC), V(XC, ridge + 0.07, ZC), 0.26, 0.15)
  for (const a of angs) b.beam(ROOF, apsePt(a, rcO, eY + 0.07), V(XC, ridge + 0.07, ZC), 0.22, 0.12)
  for (const s of [-1, 1]) b.beam(ROOF, W(X0 - ov, s * hw).setY(eY + 0.07), V(xw, ridge + 0.07, ZC), 0.22, 0.12)
  // eave fascia (timber soffit band, photo 03)
  const ring = [W(X0 - ov, -hw), ...[-67.5, -22.5, 22.5, 67.5].map((a) => apsePt(a, rcO, eY)), W(X0 - ov, hw)]
  for (let i = 0; i < ring.length; i++) b.beam('rohWood', ring[i].clone().setY(eY - 0.15), ring[(i + 1) % ring.length].clone().setY(eY - 0.15), 0.25, 0.3)
  return ridge
}

function archNiche(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, withWin: boolean) {
  b.add('rohWhite', extrude(frameShape('round', w, h, 0.22, 0, y0), 0.12), m)
  b.add('rohBrick', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.02)))
  if (withWin) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w * 0.32, h * 0.55, 0, y0 + h * 0.25, 8))), M(m, mat(0, 0, 0.04)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= body with neo-Byzantine banding ================= */
  b.add('rohWhite', loft([bodyRing(0), bodyRing(EAVE)], { capTop: true, flat: true }))
  b.add('stoneGrey', loft([bodyRing(0, 0.15), bodyRing(1.0, 0.15)], { capTop: true, flat: true }))
  // horizontal brick bands (lower zone every 0.7 m, upper frieze denser)
  for (let y = 1.4; y < 7.6; y += 0.7) b.add('rohBrick', loft([bodyRing(y, 0.02), bodyRing(y + 0.28, 0.02)], { flat: true }))
  b.add('rohWhite', loft([bodyRing(7.75, 0.12), bodyRing(8.05, 0.12)], { capTop: true, capBottom: true, flat: true }))
  for (let y = 8.3; y < 9.9; y += 0.42) b.add('rohBrick', loft([bodyRing(y, 0.02), bodyRing(y + 0.18, 0.02)], { flat: true }))
  b.add('rohMosaic', loft([bodyRing(10.2, 0.03), bodyRing(11.4, 0.03)], { flat: true }))
  b.add('rohBrick', loft([bodyRing(11.4, 0.08), bodyRing(12.0, 0.08)], { capTop: true, flat: true }))
  // blind arcades with narrow windows on the long sides and the altar end
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = ZC + s * HW
    for (let x = -8.4; x < 5.5; x += 2.6) {
      const m = faceFrame(face, plane, s > 0 ? x : -x, 0, 0)
      archNiche(b, m, 1.6, 5.6, 1.4, Math.abs(x - 0.7) < 4.5)
      // small arch frieze above
      for (const du of [-0.65, 0.65]) b.add('rohWhite', new THREE.TorusGeometry(0.42, 0.07, 4, 10, Math.PI), M(m, mat(du, 9.9, 0.06)))
    }
  }
  for (const a of [45, 0, -45]) {
    const p = V(XC + HW * Math.cos(a * D2R), 0, ZC + HW * Math.sin(a * D2R))
    const m = mat(p.x, 0, p.z, Math.PI / 2 - a * D2R)
    archNiche(b, m, 1.6, 5.6, 1.4, true)
  }

  /* ================= west front with porch (photo 03) ================= */
  {
    // porch zone X0..XB: side piers full height, upper wall above the arcade
    for (const s of [-1, 1]) {
      const zc = ZC + s * (HW - 0.65)
      b.block('rohWhite', XB - X0, EAVE, 1.3, (X0 + XB) / 2, 0, zc)
      b.block('stoneGrey', XB - X0 + 0.15, 1.0, 1.45, (X0 + XB) / 2 - 0.07, 0, zc + s * 0.07)
      for (let y = 1.4; y < 7.6; y += 0.7) b.block('rohBrick', XB - X0 + 0.04, 0.28, 1.34, (X0 + XB) / 2 - 0.02, y, zc + s * 0.02)
    }
    b.block('rohWhite', XB - X0, EAVE - 7.7, 2 * HW, (X0 + XB) / 2, 7.7, ZC)
    b.block('rohBrick', XB - X0 + 0.16, 0.6, 2 * HW + 0.16, (X0 + XB) / 2 - 0.08, 11.4, ZC)
    b.block('rohWhite', XB - X0 + 0.24, 0.3, 2 * HW + 0.24, (X0 + XB) / 2 - 0.12, 7.75, ZC)
    const m = faceFrame('-x', X0, ZC, 0, 0)
    // porch: recessed loggia 2.6 m deep with four columns and three arches
    b.add('rohStone', metricBox(10.6, 0.5, 2.9), M(m, mat(0, 0.25, -1.3)))
    for (let k = 0; k < 4; k++) b.add('rohStone', metricBox(10.6 + 1.2 - k * 0.3, 0.18, 0.35), M(m, mat(0, 0.09 + k * 0.17, 0.2 + (3 - k) * 0.35)))
    for (const u of [-4.6, -1.55, 1.55, 4.6]) {
      b.add('rohStone', new THREE.CylinderGeometry(0.3, 0.32, 4.0, 14), M(m, mat(u, 2.5, 0.0)))
      b.add('rohStone', metricBox(0.85, 0.35, 0.85), M(m, mat(u, 4.65, 0.0)))
      b.add('rohStone', metricBox(0.8, 0.4, 0.8), M(m, mat(u, 0.7, 0.0)))
    }
    // arcade wall face (cut-out arches) carried by the columns
    const s = new THREE.Shape([new THREE.Vector2(-5.6, 4.8), new THREE.Vector2(5.6, 4.8), new THREE.Vector2(5.6, 7.7), new THREE.Vector2(-5.6, 7.7)])
    for (const [u0, u1] of [[-4.6, -1.55], [-1.55, 1.55], [1.55, 4.6]]) {
      const c = (u0 + u1) / 2
      const r = (u1 - u0) / 2 - 0.4
      const hole = new THREE.Path()
      hole.moveTo(c - r, 4.8)
      hole.lineTo(c + r, 4.8)
      hole.absarc(c, 4.8, r, 0, Math.PI, false)
      hole.lineTo(c - r, 4.8)
      s.holes.push(hole)
    }
    b.add('rohStone', extrude(s, 0.5), M(m, mat(0, 0, -0.25)))
    // wavy white cornice with crosses
    for (const u of [-3.1, 0, 3.1]) {
      b.add('rohStone', new THREE.TorusGeometry(1.45, 0.14, 6, 16, Math.PI), M(m, mat(u, 6.6, 0.3)))
      b.add('rohStone', metricBox(0.12, 0.7, 0.1), M(m, mat(u, 8.0, 0.3)))
      b.add('rohStone', metricBox(0.45, 0.12, 0.1), M(m, mat(u, 8.1, 0.3)))
    }
    // inner wall of the porch: door and mosaics
    b.add('rohWhite', metricBox(11.2, 7.7, 0.4), M(m, mat(0, 3.85, -2.7)))
    b.add('wood', new THREE.PlaneGeometry(1.6, 2.7), M(m, mat(0, 1.85, -2.48)))
    for (const u of [-3.0, 3.0]) b.add('rohMosaic', new THREE.PlaneGeometry(2.0, 3.0), M(m, mat(u, 2.6, -2.48)))
    b.add('rohPorchCeil', metricBox(11.2, 0.2, 2.6), M(m, mat(0, 7.6, -1.3)))
    // Deesis mosaic and saints band above the porch
    b.add('rohWhite', metricBox(4.6, 2.6, 0.12), M(m, mat(0, 9.9, 0.06)))
    b.add('rohMosaic', new THREE.PlaneGeometry(4.2, 2.3), M(m, mat(0, 9.9, 0.13)))
    for (let u = -5.4; u <= 5.41; u += 0.9) b.add('rohMosaicDk', new THREE.PlaneGeometry(0.62, 0.95), M(m, mat(u, 10.8, 0.05)))
  }
  // small gabled projection on the south side near the west end (photo 01)
  {
    const x0 = -12.6
    const x1 = -9.2
    const z0 = ZC + HW
    const z1 = z0 + 1.5
    b.block('rohWhite', x1 - x0, 8.2, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    for (let y = 1.4; y < 7.6; y += 0.7) b.block('rohBrick', x1 - x0 + 0.04, 0.28, z1 - z0 + 0.04, (x0 + x1) / 2, y, (z0 + z1) / 2)
    const g = new THREE.Shape([new THREE.Vector2(-1.9, 8.2), new THREE.Vector2(1.9, 8.2), new THREE.Vector2(0, 9.7)])
    b.add('rohWhite', extrude(g, 0.3), mat((x0 + x1) / 2, 0, z1 - 0.3))
    const t = 1.5 / 1.9
    for (const s of [-1, 1]) facet(b, ROOF, [V((x0 + x1) / 2 + s * 2.1, 8.05, z0), V((x0 + x1) / 2 + s * 2.1, 8.05, z1 + 0.3), V((x0 + x1) / 2, 8.05 + 2.1 * t, z1 + 0.3), V((x0 + x1) / 2, 8.05 + 2.1 * t, z0)], { seams: SEAM, thickness: 0.08, hint: V(s, 1, 0) })
    archNiche(b, mat((x0 + x1) / 2, 0, z1, 0), 1.0, 2.6, 3.0, true)
  }

  /* ================= roofs ================= */
  bodyRoof(b, EAVE, 2.0)

  /* ================= tower ================= */
  {
    const { x, hw, top } = TB
    const y0 = EAVE + 0.5
    b.block('rohWhite', 2 * hw, top - y0, 2 * hw, x, y0, ZC)
    for (let y = y0 + 0.5; y < top - 0.6; y += 0.6) b.block('rohBrick', 2 * hw + 0.04, 0.22, 2 * hw + 0.04, x, y, ZC)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f === '+x' ? x + hw : f === '-x' ? x - hw : f === '+z' ? ZC + hw : ZC - hw
      const m = faceFrame(f, plane, f === '+z' ? x : f === '-z' ? -x : f === '+x' ? -ZC : ZC, 0, 0)
      for (const u of [-1.6, 0, 1.6]) {
        b.add('rohWhite', extrude(frameShape('round', 0.6, 1.15, 0.12, 0, top - 1.55), 0.08), M(m, mat(u, 0, 0)))
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.6, 1.15, 0, top - 1.55, 8))), M(m, mat(u, 0, 0.03)))
      }
    }
    // wide-eaved skirt roof of the square base
    {
      const ov = 1.3
      const eY = top - 0.3
      const c = [V(x - hw - ov, eY, ZC - hw - ov), V(x + hw + ov, eY, ZC - hw - ov), V(x + hw + ov, eY, ZC + hw + ov), V(x - hw - ov, eY, ZC + hw + ov)]
      const r = 3.35
      const d = [V(x - r, top + 0.55, ZC - r), V(x + r, top + 0.55, ZC - r), V(x + r, top + 0.55, ZC + r), V(x - r, top + 0.55, ZC + r)]
      for (let i = 0; i < 4; i++) {
        facet(b, ROOF, [c[i], c[(i + 1) % 4], d[(i + 1) % 4], d[i]], { seams: SEAM, thickness: 0.1 })
        b.beam(ROOF, c[i], d[i], 0.18, 0.12)
        b.beam('rohWood', c[i].clone().setY(eY - 0.15), c[(i + 1) % 4].clone().setY(eY - 0.15), 0.22, 0.25)
      }
    }
    // octagonal base and drum
    b.add('rohBrick', loft([polyRing(8, 3.35, top + 0.5, Math.PI / 8, x, ZC), polyRing(8, 3.35, DR.y0, Math.PI / 8, x, ZC)], { capTop: true, flat: true }))
    b.add('rohWhite', loft([polyRing(8, 3.5, DR.y0 - 0.9, Math.PI / 8, x, ZC), polyRing(8, 3.5, DR.y0 - 0.5, Math.PI / 8, x, ZC)], { capTop: true, capBottom: true, flat: true }))
    b.add('rohMosaicDk', loft([polyRing(8, 3.37, top + 1.0, Math.PI / 8, x, ZC), polyRing(8, 3.37, top + 1.7, Math.PI / 8, x, ZC)], { flat: true }))
    b.add('rohWhite', loft([polyRing(24, DR.r, DR.y0, 0, x, ZC), polyRing(24, DR.r, DR.y1, 0, x, ZC)], { capTop: true }))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      // red brick pier between windows, white engaged colonnettes
      const ap = a + Math.PI / 8
      b.add('rohBrick', metricBox(0.75, DR.y1 - DR.y0 - 0.6, 0.12), mat(x + Math.cos(ap) * (DR.r + 0.02), (DR.y0 + DR.y1) / 2, ZC + Math.sin(ap) * (DR.r + 0.02), Math.PI / 2 - ap))
      for (const da of [-0.17, 0.17]) b.add('rohWhite', new THREE.CylinderGeometry(0.1, 0.1, 4.2, 8), mat(x + Math.cos(a + da) * (DR.r + 0.08), DR.y0 + 0.6 + 2.1, ZC + Math.sin(a + da) * (DR.r + 0.08)))
      const m = mat(x + ca * DR.r, 0, ZC + sa * DR.r, Math.PI / 2 - a)
      b.add('rohWhite', extrude(frameShape('round', 0.75, 3.6, 0.14, 0, DR.y0 + 1.2), 0.1), m)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 3.6, 0, DR.y0 + 1.2, 8))), M(m, mat(0, 0, 0.03)))
    }
    for (const y of [DR.y0 + 0.4, DR.y1 - 0.5]) b.add('rohBrick', loft([polyRing(24, DR.r + 0.05, y, 0, x, ZC), polyRing(24, DR.r + 0.05, y + 0.3, 0, x, ZC)], { capTop: true, capBottom: true }))
    // mosaic band of saints, cornice
    b.add('rohMosaic', loft([polyRing(24, DR.r + 0.08, DR.y1, 0, x, ZC), polyRing(24, DR.r + 0.08, DR.y1 + 1.3, 0, x, ZC)], { capBottom: true }))
    b.add('rohWhite', loft([polyRing(24, DR.r + 0.25, DR.y1 + 1.3, 0, x, ZC), polyRing(24, DR.r + 0.25, DR.y1 + 1.6, 0, x, ZC)], { capTop: true, capBottom: true }))
    // broad flared conical eave and tall octagonal spire
    const ey = DR.y1 + 1.6
    helm(b, ROOF, { x, z: ZC, n: 16, stations: [[3.55, ey], [2.9, ey + 0.45], [2.25, ey + 1.0], [1.7, ey + 1.7], [1.35, ey + 2.4], [1.2, ey + 2.9]] })
    b.add('rohWood', loft([polyRing(16, 3.58, ey - 0.25, Math.PI / 16, x, ZC), polyRing(16, 3.58, ey + 0.02, Math.PI / 16, x, ZC)], { capBottom: true, flat: true }))
    const sy = ey + 2.9
    const ring = polyRing(8, 1.25, sy, Math.PI / 8, x, ZC)
    const apex = V(x, sy + 9.0, ZC)
    for (let i = 0; i < 8; i++) {
      facet(b, ROOF, [ring[i], ring[(i + 1) % 8], apex], { seams: seams(ROOF, 0.45, 0.04, 0.04), hint: V(ring[i].x + ring[(i + 1) % 8].x - 2 * x, 0.2, ring[i].z + ring[(i + 1) % 8].z - 2 * ZC) })
      b.beam(ROOF, ring[i], apex, 0.08, 0.06)
    }
    b.add('gilt', new THREE.SphereGeometry(0.22, 12, 10), mat(x, sy + 9.15, ZC))
    cross(b, 'gilt', x, sy + 9.2, ZC, 1.4, true, Math.PI / 2)
  }
  // small cross on the altar end of the roof (photo 01)
  cross(b, 'gilt', XC, EAVE + HW * Math.tan(PITCH * D2R) + 0.1, ZC, 1.2, true, Math.PI / 2)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1, 14.5, ZC + 4],
  materials: () => ({
    rohWhite: new THREE.MeshStandardMaterial({ color: '#efebe2', roughness: 0.88 }),
    rohBrick: new THREE.MeshStandardMaterial({ color: '#a2533d', roughness: 0.86 }),
    rohStone: new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.75 }),
    rohWood: new THREE.MeshStandardMaterial({ color: '#6b4630', roughness: 0.8 }),
    rohMosaic: new THREE.MeshStandardMaterial({ color: '#c49a4a', roughness: 0.45, metalness: 0.35 }),
    rohMosaicDk: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.5, metalness: 0.2 }),
    rohPorchCeil: new THREE.MeshStandardMaterial({ color: '#4a5a7a', roughness: 0.7 }),
  }),
  notes:
    'Main church of Rohia monastery: neo-Byzantine banded walls, entrance porch, square tower base, tall drum and flared spire; roofs shown in weathered copper per the COLOR METAL register (the church photographs predate the 2019 entry).',
}
export default model
