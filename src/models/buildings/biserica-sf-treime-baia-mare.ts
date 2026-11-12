/**
 * Biserica romano-catolică „Sfânta Treime” (former Jesuit church), Piața
 * Cetății, Baia Mare — OSM way 467723691.
 *
 * Modelling specification (real metres). +X = OSM long axis 160.9° towards the
 * narrower sanctuary block; the twin-tower front faces −X (north-north-west).
 * +Z = 250.9°.
 *  - Plan after the OSM outline: front block 27.5 × 28.6 m (twin towers 7.6 m
 *    wide flanking a 13.4 m central bay; nave behind with lower side chapels
 *    filling the full width), sanctuary block 15 × 16.3 m at +X (choir with
 *    flanking sacristies). The sanctuary is centred on the nave axis (the OSM
 *    outline places it ≈2 m to one side).
 *  - Front (photos 01, 02, Aug 2025, after the façade renovation): giant first
 *    order to the main entablature at ≈15 m (stone plinth, portal with red
 *    marble columns and gilded broken pediment, statues in niches, segment-
 *    headed windows, Trinity relief), second order to ≈20.5 m, central attic
 *    with a segment-arched window, volutes and a pediment with an oculus and
 *    a gilded glory at ≈27.5 m; towers with oval and round-arched windows,
 *    belfry stage to ≈29.5 m; bulbous onion caps, octagonal lanterns, small
 *    upper onions, ball and cross at ≈40 m. Heights from the photographs with
 *    the tower width as the scale.
 *  - Nave, chapels and sanctuary are not visible in any photograph: simple
 *    rendered volumes, nave eave ≈16 m, roof ≈52°.
 *  - METAL: COLOR METAL's records list copper roofing and rainwater goods for
 *    2025 ("façade works"). The tower caps and lanterns are photographed in
 *    Aug 2025 already clad in dark-brown copper and are shown as photographed;
 *    the nave, chapel and sanctuary roofs (not photographed) and the gutters
 *    are shown in new copper with standing seams 0.5 m. Which surfaces the
 *    2025 copper covers is not documented.
 * Approximations: everything behind the front (plan from OSM only), ornament
 * (capitals, statues, volutes, glory) simplified; the adjoining former Jesuit
 * residence is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, faceFrame, seams, cross, dome, helm, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const CU = 'copperNew'
const DOME = 'tmDome'
const SEAM = seams(CU, 0.5, 0.05, 0.045)

const X0 = -21.3 // front plane
const TD = 7.6 // tower depth (x) and width (z)
const CB = 6.7 // half-width of the central bay = nave half-width
const ZT = 14.3 // outer face of the towers
const O1 = 15.0
const O2 = 20.5
const TTOP = 29.5
const NAVE = { x1: 6.2, eave: 16.0, pitch: 52 }
const NRIDGE = NAVE.eave + CB * Math.tan(NAVE.pitch * D2R)
const SAN = { x1: 21.3 }

const U = (face: Face, w: number) => (face === '+z' || face === '-x' ? w : -w)
const FF = (face: Face, plane: number, w: number) => faceFrame(face, plane, U(face, w), 0, 0)

function win(b: Builder, m: THREE.Matrix4, type: 'round' | 'segment' | 'rect', w: number, h: number, y0: number, louvre = false) {
  b.add('tmWhite', extrude(frameShape(type, w, h, 0.22, 0, y0), 0.12), m)
  b.add(louvre ? 'tmShutter' : 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  if (louvre) for (let k = 1; k < Math.floor(h / 0.3); k++) b.add('tmShutterDk', metricBox(w, 0.04, 0.04), M(m, mat(0, y0 + k * 0.3, 0.05)))
  else {
    b.add('tmFrame', metricBox(0.06, h - 0.1, 0.05), M(m, mat(0, y0 + h / 2, 0.06)))
    for (let j = 1; j < 4; j++) b.add('tmFrame', metricBox(w, 0.05, 0.05), M(m, mat(0, y0 + (j * h) / 4, 0.06)))
  }
  b.add('tmWhite', metricBox(w + 0.45, 0.12, 0.25), M(m, mat(0, y0 - 0.1, 0.1)))
}

function ovalWin(b: Builder, m: THREE.Matrix4, y: number, rx: number, ry: number) {
  b.add('tmWhite', new THREE.TorusGeometry(1, 0.13 / rx, 8, 28), M(m, mat(0, y, 0.06, 0, 0, 0, rx, ry, 1)))
  b.add('glassC', new THREE.CircleGeometry(1, 28), M(m, mat(0, y, 0.03, 0, 0, 0, rx, ry, 1)))
}

function niche(b: Builder, m: THREE.Matrix4, y0: number, w = 1.4, h = 3.2) {
  b.add('tmWhite', extrude(frameShape('round', w, h, 0.22, 0, y0), 0.14), m)
  b.add('tmNiche', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(m, mat(0, 0, 0.02)))
  b.add('tmWhite', metricBox(w + 0.3, 0.3, 0.5), M(m, mat(0, y0 + 0.05, 0.2)))
  // statue
  b.add('tmStatue', new THREE.CylinderGeometry(0.28, 0.36, h * 0.62, 10), M(m, mat(0, y0 + 0.2 + h * 0.31, 0.3)))
  b.add('tmStatue', new THREE.SphereGeometry(0.2, 10, 8), M(m, mat(0, y0 + 0.2 + h * 0.68, 0.3)))
}

/** Pilaster strip with base and capital. */
function pil(b: Builder, m: THREE.Matrix4, u: number, y0: number, y1: number, w = 0.8, d = 0.25) {
  b.add('tmWhite', metricBox(w + 0.2, 0.5, d + 0.1), M(m, mat(u, y0 + 0.25, d / 2)))
  b.add('tmWhite', metricBox(w, y1 - y0 - 1.0, d), M(m, mat(u, y0 + 0.5 + (y1 - y0 - 1.0) / 2, d / 2)))
  b.add('tmWhite', metricBox(w + 0.3, 0.5, d + 0.12), M(m, mat(u, y1 - 0.25, d / 2 + 0.03)))
}

/** Entablature band around a rectangle (x0..x1, z0..z1) at height y. */
function band(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, h: number, grow: number) {
  b.block('tmWhite', x1 - x0 + 2 * grow, h, z1 - z0 + 2 * grow, (x0 + x1) / 2, y, (z0 + z1) / 2)
  b.block('tmWhite', x1 - x0 + 2 * grow + 0.3, h * 0.3, z1 - z0 + 2 * grow + 0.3, (x0 + x1) / 2, y + h * 0.7, (z0 + z1) / 2)
}

function tower(b: Builder, s: 1 | -1) {
  const zc = s * (ZT - TD / 2)
  const xc = X0 + TD / 2
  const hw = TD / 2
  // body: two orders + belfry (slightly set back)
  b.block('tmRender', TD, O2, TD, xc, 0, zc)
  b.block('tmRender', TD - 0.6, TTOP - O2, TD - 0.6, xc, O2, zc)
  b.block('tmPlinth', TD + 0.3, 1.3, TD + 0.3, xc, 0, zc)
  band(b, X0, X0 + TD, zc - hw, zc + hw, O1 - 0.9, 0.9, 0.35)
  band(b, X0, X0 + TD, zc - hw, zc + hw, O2 - 0.6, 0.6, 0.25)
  band(b, X0 + 0.3, X0 + TD - 0.3, zc - hw + 0.3, zc + hw - 0.3, TTOP - 0.8, 0.8, 0.4)
  // pilasters on the front and the outer side
  const mf = FF('-x', X0, zc)
  for (const u of [-hw + 0.45, -hw + 1.3, hw - 1.3, hw - 0.45]) pil(b, mf, u, 1.3, O1 - 0.9, 0.7)
  for (const u of [-hw + 0.5, hw - 0.5]) pil(b, mf, u, O1, O2 - 0.6, 0.8)
  const mt = FF('-x', X0 + 0.3, zc)
  for (const u of [-hw + 0.75, hw - 0.75]) pil(b, mt, u, O2, TTOP - 0.8, 0.7)
  const sideFace: Face = s > 0 ? '+z' : '-z'
  const ms = FF(sideFace, s * ZT, xc)
  for (const u of [-hw + 0.5, hw - 0.5]) pil(b, ms, u, 1.3, O1 - 0.9, 0.8)
  // openings: front
  win(b, mf, 'round', 1.2, 1.9, 2.4)
  niche(b, mf, 6.4, 1.5, 3.4)
  ovalWin(b, mf, 17.6, 0.85, 0.55)
  win(b, mt, 'round', 1.4, 2.8, 22.0, true)
  b.add('tmWhite', new THREE.TorusGeometry(0.9, 0.1, 8, 28), M(mt, mat(0, 26.6, 0.06)))
  // openings: outer side and inner side above the nave roof
  win(b, ms, 'round', 1.3, 2.6, 8.0)
  ovalWin(b, ms, 17.6, 0.85, 0.55)
  win(b, FF(sideFace, s * (ZT - 0.3), xc), 'round', 1.4, 2.8, 22.0, true)
  b.add('tmWhite', new THREE.TorusGeometry(0.9, 0.1, 8, 28), M(FF(sideFace, s * (ZT - 0.3), xc), mat(0, 26.6, 0.06)))
  const innerFace: Face = s > 0 ? '-z' : '+z'
  win(b, FF(innerFace, s * (CB + 0.3), xc), 'round', 1.4, 2.8, 22.0, true)
  win(b, FF('+x', X0 + TD - 0.3, zc), 'round', 1.4, 2.8, 22.0, true)

  // cap: metal skirt over the cornice, bulbous onion, lantern, small onion, cross
  const y0 = TTOP + 0.05
  const sk = (h: number, y: number) => [V(xc - h, y, zc - h), V(xc + h, y, zc - h), V(xc + h, y, zc + h), V(xc - h, y, zc + h)]
  const a = sk(hw + 0.15, y0)
  const c = sk(hw - 0.7, y0 + 0.4)
  for (let i = 0; i < 4; i++) facet(b, DOME, [a[i], a[(i + 1) % 4], c[(i + 1) % 4], c[i]], { thickness: 0.06 })
  b.block(DOME, 2 * (hw - 0.7), 0.05, 2 * (hw - 0.7), xc, y0 + 0.36, zc)
  const onion: [number, number][] = [
    [0.86, 0],
    [0.98, 0.1],
    [1.04, 0.24],
    [1.02, 0.38],
    [0.92, 0.52],
    [0.74, 0.66],
    [0.53, 0.78],
    [0.38, 0.88],
    [0.34, 1.0],
  ]
  dome(b, DOME, { x: xc, y: y0 + 0.4, z: zc, r: 2.6, h: 3.8, profile: onion, seg: 32, ribs: 16 })
  const ly = y0 + 0.4 + 3.8
  helm(b, DOME, { x: xc, z: zc, n: 8, stations: [[0.95, ly], [0.95, ly + 1.7]], flat: true })
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI / 8 + (k * Math.PI) / 4 + Math.PI / 8
    b.add('black', new THREE.PlaneGeometry(0.32, 0.9), mat(xc + Math.cos(ang) * 0.9, ly + 0.85, zc + Math.sin(ang) * 0.9, Math.PI / 2 - ang))
  }
  helm(b, DOME, { x: xc, z: zc, n: 8, stations: [[1.25, ly + 1.7], [1.25, ly + 1.9], [1.0, ly + 2.0]], flat: true })
  const onion2: [number, number][] = [
    [0.7, 0],
    [0.95, 0.18],
    [1.0, 0.36],
    [0.82, 0.58],
    [0.45, 0.8],
    [0.18, 0.92],
    [0.12, 1.0],
  ]
  dome(b, DOME, { x: xc, y: ly + 2.0, z: zc, r: 1.25, h: 2.1, profile: onion2, seg: 24, ribs: 12 })
  b.add(DOME, new THREE.SphereGeometry(0.28, 14, 10), mat(xc, ly + 4.35, zc))
  b.rod(DOME, V(xc, ly + 4.0, zc), V(xc, ly + 5.0, zc), 0.06, 8)
  cross(b, DOME, xc, ly + 4.7, zc, 1.9, false, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= towers ================= */
  tower(b, 1)
  tower(b, -1)

  /* ================= central bay of the front ================= */
  {
    const xc = X0 + TD / 2
    b.block('tmRender', TD, O2, 2 * CB, xc, 0, 0)
    b.block('tmPlinth', TD + 0.3, 1.3, 2 * CB + 0.3, xc, 0, 0)
    band(b, X0, X0 + TD, -CB, CB, O1 - 0.9, 0.9, 0.35)
    band(b, X0, X0 + TD, -CB, CB, O2 - 0.6, 0.6, 0.25)
    const m = FF('-x', X0, 0)
    for (const u of [-CB + 0.6, CB - 0.6]) pil(b, m, u, 1.3, O1 - 0.9, 0.9)
    // portal: red marble columns, gilded broken pediment
    for (const u of [-1.75, -1.15, 1.15, 1.75]) {
      b.add('tmMarble', new THREE.CylinderGeometry(0.25, 0.27, 4.2, 14), M(m, mat(u, 1.3 + 2.1, 0.45)))
      b.add('gilt', metricBox(0.62, 0.3, 0.62), M(m, mat(u, 5.65, 0.45)))
    }
    b.add('tmMarble', metricBox(4.4, 0.55, 0.9), M(m, mat(0, 6.05, 0.45)))
    for (const sx of [-1, 1]) b.add('gilt', metricBox(1.6, 0.26, 0.8), M(m, mat(sx * 1.25, 6.75, 0.45, 0, 0, sx * -0.42)))
    b.add('gilt', metricBox(0.8, 1.0, 0.25), M(m, mat(0, 6.9, 0.35)))
    b.add('tmFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('segment', 1.8, 3.7, 0, 1.3, 10))), M(m, mat(0, 0, 0.03)))
    b.add('tmWhite', extrude(frameShape('segment', 1.8, 3.7, 0.18, 0, 1.3), 0.1), m)
    // statue niche, Trinity relief, two segment-headed windows
    niche(b, m, 8.0, 1.4, 3.2)
    b.add('tmWhite', metricBox(1.9, 1.5, 0.15), M(m, mat(0, 12.6, 0.08)))
    b.add('gilt', new THREE.CircleGeometry(0.45, 16), M(m, mat(0, 12.6, 0.17)))
    for (const u of [-3.4, 3.4]) {
      win(b, M(m, mat(u, 0, 0)), 'segment', 1.5, 3.3, 8.2)
      win(b, M(m, mat(u, 0, 0)), 'round', 1.0, 1.4, 3.0)
    }
    // second order: segment-arched window between volutes
    for (const u of [-CB + 0.6, CB - 0.6]) pil(b, m, u, O1, O2 - 0.6, 0.8)
    win(b, M(m, mat(0, 0, 0)), 'segment', 2.2, 1.7, 16.6)
    // attic with volutes and pediment
    const attic = new THREE.Shape([new THREE.Vector2(-4.6, O2 - 0.01), new THREE.Vector2(4.6, O2 - 0.01), new THREE.Vector2(4.6, 23.4), new THREE.Vector2(0, 27.4), new THREE.Vector2(-4.6, 23.4)])
    b.add('tmRender', extrude(attic, 1.2), M(m, mat(0, 0, -1.2)))
    b.add('tmWhite', metricBox(9.6, 0.4, 0.4), M(m, mat(0, 23.2, 0.15)))
    for (const sx of [-1, 1]) {
      b.beam('tmWhite', V(0, 23.5, 0.2).applyMatrix4(m), V(sx * 4.8, 23.5, 0.2).applyMatrix4(m), 0.4, 0.4)
      b.beam('tmWhite', V(sx * 4.9, 23.45, 0.15).applyMatrix4(m), V(0, 27.55, 0.15).applyMatrix4(m), 0.45, 0.35, V(1, 0, 0))
      b.add('tmWhite', new THREE.TorusGeometry(0.55, 0.16, 8, 18, Math.PI * 1.5), M(m, mat(sx * 5.3, 21.4, 0.1, 0, 0, sx > 0 ? Math.PI : 0)))
      b.add('tmWhite', metricBox(0.4, 2.6, 0.3), M(m, mat(sx * 4.4, 21.9, 0.12)))
    }
    win(b, m, 'segment', 1.9, 1.3, 20.9)
    ovalWin(b, m, 24.6, 0.48, 0.48)
    // gilded glory on the apex
    b.add('gilt', new THREE.CircleGeometry(0.55, 20), M(m, mat(0, 28.6, 0.0)))
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2
      b.add('gilt', metricBox(0.06, k % 2 ? 0.7 : 1.05, 0.04), M(m, mat(Math.cos(ang) * 0.85, 28.6 + Math.sin(ang) * 0.85, 0, 0, 0, ang - Math.PI / 2)))
    }
    b.add('tmWhite', metricBox(0.5, 0.6, 0.5), M(m, mat(0, 27.6, -0.4)))
  }

  /* ================= nave, side chapels, sanctuary ================= */
  const xn0 = X0 + TD
  {
    const L = NAVE.x1 - xn0
    b.block('tmRender', L, NAVE.eave, 2 * CB, (xn0 + NAVE.x1) / 2, 0, 0)
    b.block('tmRender', SAN.x1 - NAVE.x1, NAVE.eave, 2 * CB, (NAVE.x1 + SAN.x1) / 2, 0, 0)
    b.block('tmWhite', SAN.x1 - xn0 + 0.2, 0.6, 2 * CB + 0.6, (xn0 + SAN.x1) / 2, NAVE.eave - 0.6, 0)
    for (const s of [-1, 1]) {
      // side chapels (front block) and sacristies (sanctuary block)
      const zc = s * (CB + ZT) / 2
      b.block('tmRender', L, 10.0, ZT - CB, (xn0 + NAVE.x1) / 2, 0, zc)
      b.block('tmWhite', L + 0.2, 0.45, ZT - CB + 0.3, (xn0 + NAVE.x1) / 2, 9.55, zc + s * 0.15)
      const zs = s * (CB + 8.15) / 2
      b.block('tmRender', SAN.x1 - NAVE.x1 - 1.0, 7.0, 8.15 - CB, (NAVE.x1 + SAN.x1 - 1.0) / 2, 0, zs)
      // lean-to roofs
      const t = Math.tan(24 * D2R)
      const zo = s * (ZT + 0.35)
      facet(b, CU, [V(xn0, 10.0 - 0.35 * t, zo), V(NAVE.x1, 10.0 - 0.35 * t, zo), V(NAVE.x1, 10.0 + (ZT - CB) * t, s * CB), V(xn0, 10.0 + (ZT - CB) * t, s * CB)], { seams: SEAM, thickness: 0.1 })
      b.beam(CU, V(xn0, 9.75, zo + s * 0.08), V(NAVE.x1, 9.75, zo + s * 0.08), 0.18, 0.16)
      const zo2 = s * (8.15 + 0.3)
      facet(b, CU, [V(NAVE.x1, 7.0 - 0.3 * t, zo2), V(SAN.x1 - 0.7, 7.0 - 0.3 * t, zo2), V(SAN.x1 - 0.7, 7.0 + (8.15 - CB) * t, s * CB), V(NAVE.x1, 7.0 + (8.15 - CB) * t, s * CB)], { seams: SEAM, thickness: 0.1 })
      // windows of chapels and nave clerestory
      for (let x = xn0 + 3.2; x < NAVE.x1 - 1; x += 6.2) {
        win(b, FF(s > 0 ? '+z' : '-z', s * ZT, x), 'round', 1.6, 3.6, 3.8)
        win(b, FF(s > 0 ? '+z' : '-z', s * CB, x), 'round', 1.8, 3.2, 11.6)
        b.rod(CU, V(x + 3.1, 0.5, s * (ZT + 0.2)), V(x + 3.1, 9.7, s * (ZT + 0.2)), 0.06, 8)
      }
      for (const x of [10.0, 15.5]) win(b, FF(s > 0 ? '+z' : '-z', s * CB, x), 'round', 1.8, 3.6, 9.6)
    }
    // main roof: gable at the front (behind the attic), hipped over the sanctuary
    const t = Math.tan(NAVE.pitch * D2R)
    const ov = 0.45
    const eY = NAVE.eave - ov * t
    const hw = CB + ov
    const xa = xn0 - 0.2
    const xr = SAN.x1 + ov - hw
    const xe = SAN.x1 + ov
    facet(b, CU, [V(xa, eY, hw), V(xe, eY, hw), V(xr, NRIDGE, 0), V(xa, NRIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xe, eY, -hw), V(xa, eY, -hw), V(xa, NRIDGE, 0), V(xr, NRIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xe, eY, hw), V(xe, eY, -hw), V(xr, NRIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(xa, NRIDGE + 0.07, 0), V(xr, NRIDGE + 0.07, 0), 0.28, 0.16)
    for (const s of [-1, 1]) {
      b.beam(CU, V(xe, eY + 0.07, s * hw), V(xr, NRIDGE + 0.07, 0), 0.22, 0.13)
      b.beam(CU, V(xa, eY - 0.1, s * (hw + 0.08)), V(xe, eY - 0.1, s * (hw + 0.08)), 0.2, 0.18)
    }
    b.beam(CU, V(xe + 0.08, eY - 0.1, -hw), V(xe + 0.08, eY - 0.1, hw), 0.2, 0.18)
    const g = new THREE.Shape([new THREE.Vector2(-CB, NAVE.eave - 0.02), new THREE.Vector2(CB, NAVE.eave - 0.02), new THREE.Vector2(0, NRIDGE - 0.05)])
    b.add('tmRender', extrude(g, 0.5), mat(xn0 - 0.5, 0, 0, Math.PI / 2))
    // ridge turret base / cross at the sanctuary hip
    cross(b, 'iron', xr, NRIDGE + 0.1, 0, 1.8, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 21, 3],
  materials: (base) => {
    // dark bronze-brown copper of the tower caps as photographed in Aug 2025
    const domeMat = new THREE.MeshStandardMaterial({ color: '#6c5646', metalness: 0.7, roughness: 0.38, envMapIntensity: 1.1 })
    void base
    return {
      tmDome: domeMat,
      tmRender: new THREE.MeshStandardMaterial({ color: '#ddd1bb', roughness: 0.9 }),
      tmWhite: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.82 }),
      tmPlinth: new THREE.MeshStandardMaterial({ color: '#a4927a', roughness: 0.92 }),
      tmMarble: new THREE.MeshStandardMaterial({ color: '#b2554a', roughness: 0.45 }),
      tmFrame: new THREE.MeshStandardMaterial({ color: '#3d3128', roughness: 0.6 }),
      tmNiche: new THREE.MeshStandardMaterial({ color: '#d8ccb6', roughness: 0.9 }),
      tmStatue: new THREE.MeshStandardMaterial({ color: '#8c5b3e', roughness: 0.7 }),
      tmShutter: new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.7 }),
      tmShutterDk: new THREE.MeshStandardMaterial({ color: '#3b2d23', roughness: 0.7 }),
    }
  },
  notes:
    'Baroque twin-tower front of the former Jesuit church with copper onion caps as photographed (2025); nave and sanctuary roofs, not photographed, shown in new copper per the COLOR METAL register.',
}
export default model
