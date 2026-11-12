/**
 * Universitatea Națională de Muzică București — main building ("corp A"),
 * Str. Știrbei Vodă 33, OSM way 232297325. Two storeys over a raised
 * basement, render in imitation stone, hipped roofs with deep timber eaves;
 * roof of corp A rebuilt in 2021–22 with titanium-zinc.
 *
 * Modelling specification (real metres, origin = centre of the OSM bounding
 * box, +X = OSM long axis flipped to 353.8° (north) = towards Str. Știrbei
 * Vodă: the photographed main façade is the +X face; +Z = 83.8° (east)):
 *  - North range after the OSM outline: 49.9 m front, ≈ 16.4 m deep; rear
 *    L-shaped part, an east annex and a 60 m diagonal wing towards the
 *    Cișmigiu garden (OSM outline, not photographed) as simpler volumes.
 *  - Main façade (photos 01–03; GF arched window ≈ 3.4 m used for scale):
 *    rusticated raised basement to ≈ 3 m with basement windows, ground floor
 *    with arched windows under moulded archivolts, first floor with large
 *    rectangular windows, frieze (inscription panel on the centre), eave
 *    ≈ 15.4 m with ≈ 1.2 m timber overhang on rafter ends. Five bays on each
 *    wing, a slightly projecting 11 m centre with three bays and a portico of
 *    four columns carrying a balustraded balcony, entrance stairs.
 *  - Roofs: hip of ≈ 30° on the north range with small gabled dormers (one on
 *    the centre, photos 01–02); low hip-like roofs on the rear parts.
 *  - Roof metal: the photographs (2013) show the old tile covering; following
 *    the records the rebuilt roof of corp A (north range, rear part and east
 *    annex) is shown in natural titanium-zinc with standing seams 0.5 m, zinc
 *    gutters and dormer cheeks. The diagonal wing, whose roof is not
 *    documented, keeps a tile roof like the one photographed in 2013.
 * Approximations: which block is "corp A" is inferred (the historic main
 * building on Știrbei Vodă); rear, east annex and diagonal wing heights, roof
 * forms and window rhythms are assumed; ornament simplified; trees, fence and
 * the front garden omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, prismOutline, hippedRoof, faceFrame, lathe, seams, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

/* plan */
const XF = 39.43 // Știrbei Vodă façade
const XB = 23.0 // back of the north range
const ZE = 18.47 // east end of the north range
const ZW = -31.9 // west end
const UC = 6.45 // centre of the façade in façade coordinates (u = −z)
const RIS = { u0: 0.95, u1: 11.95, d: 0.6 }
const REAR: P2[] = [[23.0, -29.9], [22.8, -29.89], [4.95, -31.92], [4.11, -26.62], [-0.3, -27.15], [-2.69, -10.88], [1.61, -10.18], [0.94, -4.55], [18.75, -1.66], [17.39, 14.71], [23.0, 14.7]]
const EAST: P2[] = [[13.46, 14.69], [23.0, 14.7], [23.0, 18.47], [30.6, 18.47], [30.22, 31.75], [12.72, 32.35], [12.79, 27.61]]
const DIAG: P2[] = [[13.46, 14.69], [12.79, 27.61], [8.87, 27.58], [-39.43, -9.93], [-33.64, -17.5], [-30.92, -16.92], [-27.9, -16.12]]

/* heights */
const BASE = 3.0
const BAND = 7.6
const FRIEZE = 13.2
const EAVE = 15.4
const OH = 1.2

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: OpeningType = 'rect', f = 0.2, bars: [number, number] = [2, 3], z = 0) {
  const m = faceFrame(face, plane, u, 0, z)
  b.add('unStucco', extrude(frameShape(type, w, h, f, 0, y0), 0.12), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(m, mat(0, 0, 0.025)))
  b.add('unFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.07, 0, y0 + 0.03), 0.06), M(m, mat(0, 0, 0.02)))
  for (let i = 1; i < bars[0]; i++) b.add('unFrame', metricBox(0.07, h - 0.1, 0.05), M(m, mat(-w / 2 + (i * w) / bars[0], y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < bars[1]; j++) b.add('unFrame', metricBox(w - 0.1, 0.06, 0.05), M(m, mat(0, y0 + (j * h * (type === 'rect' ? 1 : 0.72)) / bars[1], 0.05)))
  b.add('unStucco', metricBox(w + 2 * f + 0.2, 0.14, 0.26), M(m, mat(0, y0 - f - 0.05, 0.12)))
}

/** Signed area (x, z): positive means offsetPoly's (dz, −dx) normal points outwards. */
function area(poly: P2[]) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}
function offsetPoly(poly: P2[], d: number): P2[] {
  const n = poly.length
  const s = area(poly) > 0 ? 1 : -1
  const lines = poly.map((a, i) => {
    const c = poly[(i + 1) % n]
    const dx = c[0] - a[0]
    const dz = c[1] - a[1]
    const L = Math.hypot(dx, dz)
    return { p: [a[0] + s * (dz / L) * d, a[1] - s * (dx / L) * d] as P2, dir: [dx / L, dz / L] as P2 }
  })
  return poly.map((_, i) => {
    const l1 = lines[(i - 1 + n) % n]
    const l2 = lines[i]
    const cr = l1.dir[0] * l2.dir[1] - l1.dir[1] * l2.dir[0]
    if (Math.abs(cr) < 1e-4) return l2.p
    const t = ((l2.p[0] - l1.p[0]) * l2.dir[1] - (l2.p[1] - l1.p[1]) * l2.dir[0]) / cr
    return [l1.p[0] + l1.dir[0] * t, l1.p[1] + l1.dir[1] * t] as P2
  })
}

/** Hip-like roof over any outline: slopes from the eave (with overhang) to an inset curb, flat top. */
function outlineRoof(b: Builder, poly: P2[], y: number, inset: number, pitch: number, key: string, sp?: ReturnType<typeof seams>, oh = 0.8) {
  const t = Math.tan((pitch * Math.PI) / 180)
  const outer = offsetPoly(poly, oh)
  const inner = offsetPoly(poly, -inset)
  const y0 = y - oh * t
  const y1 = y + inset * t
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const pts = [V(outer[i][0], y0, outer[i][1]), V(outer[j][0], y0, outer[j][1]), V(inner[j][0], y1, inner[j][1]), V(inner[i][0], y1, inner[i][1])]
    facet(b, key, pts, { seams: sp, thickness: 0.1 })
    b.beam(key, pts[0], pts[3], 0.14, 0.09)
  }
  b.add(key, new THREE.ShapeGeometry(new THREE.Shape(inner.map(([px, pz]) => new THREE.Vector2(px, -pz)))), mat(0, y1 + 0.01, 0, 0, -Math.PI / 2))
  // soffit and gutter
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    b.beam('wood', V(poly[i][0], y - 0.08, poly[i][1]).lerp(V(outer[i][0], y - 0.08, outer[i][1]), 0.5), V(poly[j][0], y - 0.08, poly[j][1]).lerp(V(outer[j][0], y - 0.08, outer[j][1]), 0.5), oh, 0.05)
    if (key === ZN) b.beam(ZN, V(outer[i][0], y0 - 0.05, outer[i][1]), V(outer[j][0], y0 - 0.05, outer[j][1]), 0.18, 0.16)
  }
}

/** Plain windows along an outline edge (frame built on the edge, outward away from `inside`). */
function edgeWindows(b: Builder, pa: P2, pc: P2, inside: P2, floors: number[], step = 3.6, w = 1.4, h = 2.4) {
  const dx = pc[0] - pa[0]
  const dz = pc[1] - pa[1]
  const L = Math.hypot(dx, dz)
  const n = V(dz / L, 0, -dx / L)
  const mid = V((pa[0] + pc[0]) / 2, 0, (pa[1] + pc[1]) / 2)
  if (n.x * (inside[0] - mid.x) + n.z * (inside[1] - mid.z) > 0) n.negate()
  const m = new THREE.Matrix4().makeBasis(V(n.z, 0, -n.x), V(0, 1, 0), n).setPosition(mid)
  const k = Math.max(1, Math.floor((L - 1.5) / step))
  for (let i = 0; i < k; i++) {
    const u = -L / 2 + 0.75 + ((L - 1.5) / k) * (i + 0.5)
    for (const y of floors) {
      const mm = M(m, mat(u, 0, 0))
      b.add('unStucco', extrude(frameShape('rect', w, h, 0.14, 0, y), 0.1), mm)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', w, h, 0, y, 4))), M(mm, mat(0, 0, 0.02)))
      b.add('unFrame', metricBox(0.07, h - 0.1, 0.05), M(mm, mat(0, y + h / 2, 0.04)))
      b.add('unFrame', metricBox(w - 0.1, 0.06, 0.05), M(mm, mat(0, y + h * 0.7, 0.04)))
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= north range (photographed) ================= */
  const W = XF - XB
  const D = ZE - ZW
  const cz = (ZE + ZW) / 2
  b.block('unWall', W, EAVE, D, (XF + XB) / 2, 0, cz)
  b.block('unSocle', W + 0.2, BASE, D + 0.2, (XF + XB) / 2, 0, cz)
  b.block('unStucco', W + 0.3, 0.3, D + 0.3, (XF + XB) / 2, BASE - 0.15, cz)
  b.block('unStucco', W + 0.24, 0.35, D + 0.24, (XF + XB) / 2, BAND, cz)
  b.block('unStucco', W + 0.16, 0.2, D + 0.16, (XF + XB) / 2, FRIEZE - 0.2, cz)
  b.block('unStucco', W + 0.3, 0.25, D + 0.3, (XF + XB) / 2, EAVE - 0.35, cz)
  // central projection
  const rz0 = -RIS.u1
  const rz1 = -RIS.u0
  b.block('unWall', RIS.d, EAVE, rz1 - rz0, XF + RIS.d / 2, 0, (rz0 + rz1) / 2)
  b.block('unSocle', RIS.d + 0.1, BASE, rz1 - rz0 + 0.2, XF + RIS.d / 2, 0, (rz0 + rz1) / 2)
  b.block('unStucco', RIS.d + 0.25, 0.35, rz1 - rz0 + 0.24, XF + RIS.d / 2, BAND, (rz0 + rz1) / 2)
  b.block('unStucco', RIS.d + 0.25, 0.25, rz1 - rz0 + 0.3, XF + RIS.d / 2, EAVE - 0.35, (rz0 + rz1) / 2)
  // basement rustication bands and corner strips
  for (let y = 0.5; y < BASE - 0.4; y += 0.5) b.block('unSocle', W + 0.26, 0.07, D + 0.26, (XF + XB) / 2, y, cz)
  for (const [x, z] of [
    [XF, ZE],
    [XF, ZW],
    [XF + RIS.d, rz0],
    [XF + RIS.d, rz1],
  ]) for (let y = BASE + 0.3; y < FRIEZE - 0.3; y += 0.6) b.block('unStucco', 0.7, 0.45, 0.7, x, y, z)
  {
    const F: Face = '+x'
    const wingU = [-16.5, -12.62, -8.74, -4.86, -0.98, 13.88, 17.76, 21.64, 25.52, 29.4]
    for (const u of wingU) {
      win(b, F, XF, u, 1.0, 1.4, 1.1, 'rect', 0.14, [2, 1], 0.16)
      win(b, F, XF, u, 3.6, 1.7, 3.4, 'round', 0.32, [2, 3])
      win(b, F, XF, u, 9.0, 1.9, 3.0, 'rect', 0.2, [3, 3])
    }
    // centre: three bays behind the portico, inscription panel
    const RX = XF + RIS.d
    for (const k of [-1, 0, 1]) {
      const u = UC + k * 3.1
      if (k === 0) win(b, F, RX, u, BASE, 2.1, 4.6, 'round', 0.25, [2, 4])
      else win(b, F, RX, u, 3.5, 1.7, 3.4, 'round', 0.3, [2, 3])
      win(b, F, RX, u, 9.1, 2.0, 2.8, 'rect', 0.2, [3, 3])
    }
    b.add('unStucco', metricBox(8.6, 0.85, 0.1), M(faceFrame(F, RX, UC, 0, 0), mat(0, FRIEZE + 0.95, 0.05)))
    b.add('unStucco', metricBox(9.6, 0.25, 0.3), M(faceFrame(F, RX, UC, 0, 0), mat(0, FRIEZE + 0.3, 0.15)))
    // portico: podium, four columns, entablature with balustraded balcony, stairs
    const pm = faceFrame(F, RX, UC, 0, 0)
    const PD = 3.2
    b.add('unSocle', metricBox(9.4, BASE, PD), M(pm, mat(0, BASE / 2, PD / 2)))
    for (let i = 0; i < 6; i++) b.add('unSocle', metricBox(4.6, BASE - i * 0.5, 0.4), M(pm, mat(0, (BASE - i * 0.5) / 2, PD + 0.2 + i * 0.4)))
    const colH = 4.6
    for (const u of [-3.9, -1.3, 1.3, 3.9]) {
      b.add('unStucco', new THREE.CylinderGeometry(0.3, 0.34, colH, 16), M(pm, mat(u, BASE + colH / 2, PD - 0.45)))
      b.add('unStucco', metricBox(0.8, 0.3, 0.8), M(pm, mat(u, BASE + 0.15, PD - 0.45)))
      b.add('unStucco', metricBox(0.85, 0.3, 0.85), M(pm, mat(u, BASE + colH - 0.15, PD - 0.45)))
    }
    for (const u of [-3.9, 3.9]) b.add('unStucco', metricBox(0.6, colH, 0.3), M(pm, mat(u, BASE + colH / 2, 0.15)))
    b.add('unStucco', metricBox(9.6, 0.7, PD + 0.3), M(pm, mat(0, BASE + colH + 0.35, PD / 2)))
    b.add(ZN, metricBox(9.7, 0.04, PD + 0.35), M(pm, mat(0, BASE + colH + 0.72, PD / 2)))
    const by = BASE + colH + 0.74
    const bal = lathe([[0, 0], [0.09, 0], [0.05, 0.12], [0.1, 0.36], [0.04, 0.6], [0.07, 0.68], [0, 0.68]], 6)
    for (let u = -4.5; u <= 4.51; u += 0.32) b.add('unStucco', bal, M(pm, mat(u, by, PD - 0.1)))
    for (let d = 0.3; d < PD - 0.2; d += 0.32) for (const u of [-4.6, 4.6]) b.add('unStucco', bal, M(pm, mat(u, by, d)))
    b.add('unStucco', metricBox(9.5, 0.14, 0.3), M(pm, mat(0, by + 0.74, PD - 0.1)))
    for (const u of [-4.6, -1.3, 1.3, 4.6]) b.add('unStucco', metricBox(0.4, 0.82, 0.4), M(pm, mat(u, by + 0.41, PD - 0.1)))
  }
  // west end of the north range (towards the neighbouring garden)
  for (const x of [26.5, 30.5, 34.5]) {
    win(b, '-z', ZW, -x, 3.6, 1.6, 3.2, 'round', 0.28, [2, 3])
    win(b, '-z', ZW, -x, 9.0, 1.8, 2.9, 'rect', 0.2, [3, 3])
  }

  /* ================= rear part, east annex, diagonal wing (OSM, not photographed) ================= */
  prismOutline(b, 'unWall', REAR, 0, 14.0)
  prismOutline(b, 'unSocle', offsetPoly(REAR, 0.1), 0, BASE)
  prismOutline(b, 'unStucco', offsetPoly(REAR, 0.12), 13.6, 0.4)
  prismOutline(b, 'unWall', EAST, 0, 12.5)
  prismOutline(b, 'unSocle', offsetPoly(EAST, 0.1), 0, 1.2)
  prismOutline(b, 'unStucco', offsetPoly(EAST, 0.12), 12.1, 0.4)
  prismOutline(b, 'unWallB', DIAG, 0, 10.5)
  prismOutline(b, 'unSocle', offsetPoly(DIAG, 0.1), 0, 1.0)
  prismOutline(b, 'unStucco', offsetPoly(DIAG, 0.12), 10.1, 0.4)
  const RIN: P2 = [12, -18]
  edgeWindows(b, [4.95, -31.92], [22.8, -29.89], RIN, [3.6, 8.6])
  edgeWindows(b, [4.11, -26.62], [4.95, -31.92], RIN, [3.6, 8.6])
  edgeWindows(b, [-0.3, -27.15], [-2.69, -10.88], RIN, [3.6, 8.6])
  edgeWindows(b, [0.94, -4.55], [18.75, -1.66], RIN, [3.6, 8.6])
  edgeWindows(b, [18.75, -1.66], [17.39, 14.71], RIN, [3.6, 8.6])
  const EIN: P2 = [24, 25]
  edgeWindows(b, [30.22, 31.75], [12.72, 32.35], EIN, [1.6, 6.4])
  edgeWindows(b, [30.6, 18.47], [30.22, 31.75], EIN, [1.6, 6.4])
  edgeWindows(b, [39.41, 18.47], [30.6, 18.47], [31, 0], [3.6, 9.0], 3.9, 1.6, 2.9)
  const DIN: P2 = [-12, 3]
  edgeWindows(b, [-39.43, -9.93], [8.87, 27.58], DIN, [1.5, 6.0], 3.4)
  edgeWindows(b, [13.46, 14.69], [-27.9, -16.12], DIN, [1.5, 6.0], 3.4)
  edgeWindows(b, [-33.64, -17.5], [-39.43, -9.93], DIN, [1.5, 6.0], 3.4)

  /* ================= roofs ================= */
  // north range: hipped titanium-zinc roof, deep eaves on rafter ends
  {
    const pitch = 30
    const t = Math.tan((pitch * Math.PI) / 180)
    hippedRoof(b, ZN, { x: (XF + XB) / 2 + 0.15, z: cz, w: W + 0.3, d: D, y: EAVE + OH * t, pitch, overhang: OH, seams: SEAM })
    // soffit, rafter ends and zinc gutter along the front and the west end
    b.add('wood', metricBox(OH, 0.06, D + 2 * OH), mat(XF + 0.15 + OH / 2, EAVE - 0.05, cz))
    b.add('wood', metricBox(W + 2 * OH, 0.06, OH), mat((XF + XB) / 2, EAVE - 0.05, ZW - OH / 2))
    for (let z = ZW - OH; z <= ZE + OH; z += 0.9) b.add('wood', metricBox(OH, 0.18, 0.12), mat(XF + 0.15 + OH / 2, EAVE - 0.17, z))
    for (let x = XB; x <= XF + OH; x += 0.9) b.add('wood', metricBox(0.12, 0.18, OH), mat(x, EAVE - 0.17, ZW - OH / 2))
    b.beam(ZN, V(XF + 0.15 + OH, EAVE - 0.02, ZW - OH), V(XF + 0.15 + OH, EAVE - 0.02, ZE + OH), 0.2, 0.18)
    b.beam(ZN, V(XB - OH, EAVE - 0.02, ZW - OH), V(XF + 0.15 + OH, EAVE - 0.02, ZW - OH), 0.2, 0.18)
    // gabled dormers: one on the centre (photos 01–02), two on each wing
    const dormer = (z: number, x: number, s = 1) => {
      const y = EAVE + (XF + 0.15 - x) * t
      const g = new Builder()
      g.add(ZN, metricBox(1.8 * s, 1.5 * s, 2.0 * s), mat(0, 0.75 * s, -0.6 * s))
      g.add('unStucco', metricBox(1.9 * s, 1.6 * s, 0.12), mat(0, 0.8 * s, 0.42 * s))
      g.add('glassC', metricBox(1.0 * s, 0.9 * s, 0.05), mat(0, 0.85 * s, 0.5 * s))
      g.add('unFrame', metricBox(0.06, 0.9 * s, 0.06), mat(0, 0.85 * s, 0.52 * s))
      const half = 1.15 * s
      const rise = 0.9 * s
      for (const sd of [-1, 1]) {
        const p0 = V(sd * half, 1.55 * s, 0.6 * s)
        const p1 = V(0, 1.55 * s + rise, 0.6 * s)
        facet(g, ZN, [p0, p1, p1.clone().setZ(-1.8 * s), p0.clone().setZ(-1.8 * s)], { seams: SEAM, thickness: 0.06 })
      }
      const tri = new THREE.Shape([new THREE.Vector2(-half + 0.15, 0), new THREE.Vector2(half - 0.15, 0), new THREE.Vector2(0, rise - 0.1)])
      g.add('unStucco', extrude(tri, 0.1), mat(0, 1.55 * s, 0.4 * s))
      b.merge(g, mat(x, y - 0.3, z, Math.PI / 2))
    }
    dormer(-UC, XF - 4.2, 1.15)
    for (const z of [-21.6, -27.5, 8.7, 14.6]) dormer(z, XF - 1.4)
  }
  // corp A rear part and east annex: titanium-zinc; diagonal wing: tiles (undocumented)
  outlineRoof(b, REAR, 14.0, 2.4, 30, ZN, SEAM)
  outlineRoof(b, EAST, 12.5, 2.6, 28, ZN, SEAM)
  outlineRoof(b, DIAG, 10.5, 4.6, 32, 'tileRed')
  // downpipes (zinc)
  for (const z of [ZE - 0.4, -0.3, 12.8, ZW + 0.4]) b.rod(ZN, V(XF + 0.25, 0.3, z), V(XF + 0.25, EAVE - 0.2, z), 0.06, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [35.5, 17.6, -12],
  materials: () => ({
    unWall: new THREE.MeshStandardMaterial({ color: '#bbb6ab', roughness: 0.9 }),
    unWallB: new THREE.MeshStandardMaterial({ color: '#c4bfb4', roughness: 0.9 }),
    unStucco: new THREE.MeshStandardMaterial({ color: '#d2cdc2', roughness: 0.85 }),
    unSocle: new THREE.MeshStandardMaterial({ color: '#a5a096', roughness: 0.92 }),
    unFrame: new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.6 }),
  }),
  notes:
    'Main building of the music university: raised basement, arched ground-floor windows, portico with balcony, hipped roofs with deep timber eaves; the roof of corp A is shown in natural titanium-zinc according to the records (the 2013 photographs show the old tiles).',
}
export default model
