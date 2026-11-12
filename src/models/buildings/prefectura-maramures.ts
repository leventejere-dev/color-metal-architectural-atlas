/**
 * Instituția Prefectului – Județul Maramureș: Palatul Administrativ Baia Mare,
 * Str. Gheorghe Șincai 46 (OSM way 463413142), built 1969–1970 in six bodies.
 *
 * Modelling specification (real metres). +X = azimuth 74.0° (OSM long axis),
 * +Z = 164° = towards Str. Gheorghe Șincai (the photographed street side).
 *  - Plan after the OSM outline (118.6 × 61.6 m): the two-storey street block
 *    with the main hall (≈ 35 × 32 m, south-west), a connecting neck, the long
 *    four-storey office range behind it (≈ 108 × 19 m) and the angled east
 *    wing; the eleven-storey archive tower stands at the south end of the
 *    east wing (satellite shadow, photo 01).
 *  - Storeys after the county's technical description: street block S+P+1
 *    (eave ≈ 8.5 m), office range D+P+3 (eave ≈ 14.5 m), tower D+P+10 plus a
 *    glazed top floor (≈ 42 m + roof); facades of light stone panels with
 *    long glazed bands on the street block (photo 01).
 *  - Roofs: the characteristic folded roofs of the palace — a steep metal
 *    band leaning outwards over every façade top (the copper edges that run
 *    almost vertically down the façades) and low hipped roofs behind it, a
 *    raised pyramid over the hall of the street block and a steep gable on the
 *    tower.
 *  - COLOR METAL copper (register 2024, copper standing-seam band): the only
 *    photograph found (2019) and the satellite view predate the works, and the
 *    body that was re-covered is not documented, so all the palace roofs and
 *    their steep edge bands are shown in new copper (copperNew) with standing
 *    seams 0.55 m apart.
 * Approximations (reference-limited): one street photograph only; all heights
 * from storey counts; window rhythm, the tower position and its top, and the
 * rear (north) façades are inferred; the outline is simplified to convex
 * blocks.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, seams, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperNew'
const SEAM = seams(CU, 0.55, 0.05, 0.045)
type P2 = [number, number]

/** Offset a convex CCW-or-CW polygon outward by d (keeps vertex count). */
function offsetPoly(poly: P2[], d: number): P2[] {
  const n = poly.length
  // orientation
  let area = 0
  for (let i = 0; i < n; i++) {
    const [x0, z0] = poly[i]
    const [x1, z1] = poly[(i + 1) % n]
    area += x0 * z1 - x1 * z0
  }
  const s = area > 0 ? -1 : 1
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n]
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    const L = Math.hypot(dx, dz)
    const nx = (s * dz) / L
    const nz = (-s * dx) / L
    return { p: [p[0] + nx * d, p[1] + nz * d] as P2, dir: [dx / L, dz / L] as P2 }
  })
  return poly.map((_, i) => {
    const a = lines[(i + n - 1) % n]
    const c = lines[i]
    const det = a.dir[0] * c.dir[1] - a.dir[1] * c.dir[0]
    if (Math.abs(det) < 1e-6) return c.p
    const t = ((c.p[0] - a.p[0]) * c.dir[1] - (c.p[1] - a.p[1]) * c.dir[0]) / det
    return [a.p[0] + a.dir[0] * t, a.p[1] + a.dir[1] * t] as P2
  })
}

/** Folded copper roof: steep outward-leaning band from the wall top, then a low tent to a ridge polygon. */
function foldedRoof(b: Builder, poly: P2[], yWall: number, out: number, band: number, rise: number, shrink = 0.25) {
  const outer = offsetPoly(poly, out)
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length
  const inner = outer.map(([x, z]) => [cx + (x - cx) * shrink, cz + (z - cz) * shrink] as P2)
  const yTop = yWall + band
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const a = V(poly[i][0], yWall, poly[i][1])
    const c = V(poly[j][0], yWall, poly[j][1])
    const A = V(outer[i][0], yTop, outer[i][1])
    const C = V(outer[j][0], yTop, outer[j][1])
    const mid = V((outer[i][0] + outer[j][0]) / 2 - cx, 0, (outer[i][1] + outer[j][1]) / 2 - cz).normalize()
    // band: leans outward, seams run up the band
    facet(b, CU, [a, c, C, A], { seams: SEAM, hint: mid, thickness: 0.08 })
    b.beam(CU, A, C, 0.18, 0.14)
    // low tent behind the band
    const Ai = V(inner[i][0], yTop + rise, inner[i][1])
    const Ci = V(inner[j][0], yTop + rise, inner[j][1])
    facet(b, CU, [A, C, Ci, Ai], { seams: SEAM })
  }
  facet(b, CU, inner.map(([x, z]) => V(x, yTop + rise, z)))
  for (let i = 0; i < n; i++) b.beam(CU, V(outer[i][0], yTop + 0.05, outer[i][1]), V(inner[i][0], yTop + rise + 0.05, inner[i][1]), 0.16, 0.1)
}

/** Window rows along one straight wall edge (p→q), facing outward (normal to the right of p→q for CW plans). */
function windowRows(b: Builder, p: P2, q: P2, outward: P2, floors: number[], h: number, spacing: number, w: number, key = 'glassC') {
  const dx = q[0] - p[0]
  const dz = q[1] - p[1]
  const L = Math.hypot(dx, dz)
  const n = Math.floor(L / spacing)
  const ry = Math.atan2(outward[0], outward[1])
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = p[0] + dx * t + outward[0] * 0.02
    const z = p[1] + dz * t + outward[1] * 0.02
    for (const y of floors) {
      b.add(key, metricBox(w, h, 0.06), mat(x, y + h / 2, z, ry))
      b.add('prefFrame', metricBox(w + 0.2, 0.12, 0.2), mat(x, y - 0.06, z, ry))
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= street block with the main hall (S+P+1) ================= */
  const A: P2[] = [
    [-42.5, -1.2],
    [-7.2, -1.2],
    [-7.1, 30.8],
    [-42.5, 29.8],
  ]
  const EA = 8.5
  prismOutline(b, 'prefStone', A, 0, EA)
  prismOutline(b, 'prefSocle', offsetPoly(A, 0.1), 0, 0.9)
  // street front: long glazed bands between stone piers, entrance with stairs
  {
    const z = 30.4
    for (const [x0, x1] of [
      [-41.0, -30.5],
      [-28.5, -18.0],
      [-16.5, -8.5],
    ]) {
      b.add('glassG', metricBox(x1 - x0, 6.2, 0.1), mat((x0 + x1) / 2, 1.3 + 3.1, z + 0.4, -0.028))
      for (let x = x0; x <= x1 + 0.01; x += 1.5) b.add('prefFrame', metricBox(0.1, 6.2, 0.16), mat(x, 4.4, z + 0.45, -0.028))
      b.add('prefFrame', metricBox(x1 - x0, 0.14, 0.16), mat((x0 + x1) / 2, 4.3, z + 0.45, -0.028))
    }
    b.block('glassC', 4.0, 3.2, 0.3, -29.5, 0.9, z + 0.55)
    for (let i = 0; i < 5; i++) b.block('prefSocle', 9 - i * 0.6, 0.18, 0.4, -29.5, i * 0.18, z + 2.6 - i * 0.4)
  }
  windowRows(b, [-42.5, 29.8], [-42.5, -1.2], [-1, 0], [1.6, 5.2], 2.4, 3.2, 2.2)
  foldedRoof(b, A, EA, 1.2, 2.4, 1.2, 0.55)
  // raised hall roof (pyramid) in the middle of the block
  {
    const cx = -24.8
    const cz = 14.8
    const hw = 8.0
    b.block('prefStone', hw * 2, 3.0, hw * 2, cx, EA + 1.5, cz)
    const ring: P2[] = [
      [cx - hw, cz - hw],
      [cx + hw, cz - hw],
      [cx + hw, cz + hw],
      [cx - hw, cz + hw],
    ]
    foldedRoof(b, ring, EA + 4.5, 0.8, 1.6, 2.6, 0.04)
  }

  /* ================= connecting neck (two storeys) ================= */
  const N: P2[] = [
    [-35.6, -12.5],
    [-16.0, -12.5],
    [-16.2, -1.2],
    [-35.6, -1.2],
  ]
  prismOutline(b, 'prefStone', N, 0, 8.0)
  windowRows(b, [-35.6, -1.2], [-35.6, -12.5], [-1, 0], [1.6, 4.9], 2.0, 2.8, 1.8)
  windowRows(b, [-16.2, -1.2], [-16.0, -12.5], [1, 0], [1.6, 4.9], 2.0, 2.8, 1.8)
  foldedRoof(b, N, 8.0, 0.9, 1.6, 0.8, 0.4)

  /* ================= office range (D+P+3) ================= */
  const R: P2[] = [
    [-58.5, -30.8],
    [49.9, -30.8],
    [47.0, -11.0],
    [-58.5, -11.6],
  ]
  const ER = 14.5
  prismOutline(b, 'prefStone', R, 0, ER)
  prismOutline(b, 'prefSocle', offsetPoly(R, 0.1), 0, 1.2)
  for (const y of [4.6, 8.0, 11.4]) prismOutline(b, 'prefPlaster', offsetPoly(R, 0.04), y - 0.25, 0.25)
  windowRows(b, [-58.5, -11.6], [-36.0, -11.4], [0, 1], [1.4, 4.8, 8.2, 11.6], 2.1, 2.6, 1.7)
  windowRows(b, [-16.0, -11.0], [47.0, -11.0], [0, 1], [1.4, 4.8, 8.2, 11.6], 2.1, 2.6, 1.7)
  windowRows(b, [49.9, -30.8], [-58.5, -30.8], [0, -1], [1.4, 4.8, 8.2, 11.6], 2.1, 2.6, 1.7)
  windowRows(b, [-58.5, -30.8], [-58.5, -11.6], [-1, 0], [4.8, 8.2, 11.6], 2.1, 3.0, 1.7)
  foldedRoof(b, R, ER, 1.0, 2.0, 1.0, 0.3)

  /* ================= angled east wing (D+P+3) ================= */
  const EW: P2[] = [
    [33.0, -15.0],
    [39.4, 11.5],
    [59.3, 8.0],
    [49.9, -30.8],
  ]
  prismOutline(b, 'prefStone', EW, 0, ER)
  prismOutline(b, 'prefSocle', offsetPoly(EW, 0.1), 0, 1.2)
  for (const y of [4.6, 8.0, 11.4]) prismOutline(b, 'prefPlaster', offsetPoly(EW, 0.04), y - 0.25, 0.25)
  windowRows(b, [33.0, -15.0], [39.4, 11.5], [-0.97, 0.24], [1.4, 4.8, 8.2, 11.6], 2.1, 2.7, 1.7)
  windowRows(b, [59.3, 8.0], [49.9, -30.8], [0.97, -0.24], [1.4, 4.8, 8.2, 11.6], 2.1, 2.7, 1.7)
  foldedRoof(b, EW, ER, 1.0, 2.0, 1.0, 0.3)

  /* ================= archive tower (D+P+10 + glazed top) ================= */
  {
    // rotated slab at the south end of the east wing, narrow face to the street
    const ang = -15 * (Math.PI / 180)
    const cx = 46.0
    const cz = 0.5
    const hw = 5.2 // across
    const hl = 9.0 // along the wing
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const P = (u: number, v: number): P2 => [cx + u * ca + v * sa, cz - u * sa + v * ca]
    const T: P2[] = [P(-hw, -hl), P(hw, -hl), P(hw, hl), P(-hw, hl)]
    const TH = 40.5
    prismOutline(b, 'prefStone', T, 0, TH)
    // glazed top floor
    prismOutline(b, 'glassG', offsetPoly(T, -0.4), TH, 3.2)
    for (const [i, j] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ]) {
      const p = T[i]
      const q = T[j]
      const n = 8
      for (let k = 0; k <= n; k++) {
        const x = p[0] + ((q[0] - p[0]) * k) / n
        const z = p[1] + ((q[1] - p[1]) * k) / n
        b.block('prefFrame', 0.14, 3.2, 0.14, x + (cx - x) * 0.07, TH, z + (cz - z) * 0.07)
      }
    }
    // windows: narrow street face and long faces, balconies on the east face
    const floors: number[] = []
    for (let i = 0; i < 11; i++) floors.push(1.6 + i * 3.5)
    const fwd: P2 = [sa, ca]
    const side: P2 = [ca, -sa]
    windowRows(b, T[3], T[2], fwd, floors, 1.6, 3.4, 1.4)
    windowRows(b, T[0], T[3], [-side[0], -side[1]], floors, 1.6, 3.0, 1.3)
    windowRows(b, T[2], T[1], side, floors, 1.6, 3.0, 1.3)
    for (const y of floors) {
      for (const v of [-4.5, 0, 4.5]) {
        const [x, z] = P(hw + 0.7, v)
        b.add('prefPlaster', metricBox(1.4, 0.2, 2.6), mat(x, y - 0.3, z, ang))
        b.add('prefFrame', metricBox(0.06, 1.0, 2.6), mat(x + 0.68 * ca, y + 0.2, z - 0.68 * sa, ang))
      }
    }
    // steep copper gable over the glazed top, ridge across the narrow face
    const yE = TH + 3.2
    const out = 0.6
    const Tout = offsetPoly(T, out)
    const rise = 4.2
    const c = Tout.map(([x, z]) => V(x, yE, z))
    // long slopes facing ±side (ridge along the tower's long axis)
    const rA = V((Tout[0][0] + Tout[1][0]) / 2, yE + rise, (Tout[0][1] + Tout[1][1]) / 2)
    const rB = V((Tout[3][0] + Tout[2][0]) / 2, yE + rise, (Tout[3][1] + Tout[2][1]) / 2)
    facet(b, CU, [c[1], c[2], rB, rA], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [c[3], c[0], rA, rB], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, rA, rB, 0.3, 0.2)
    // gable walls (stone) at the two short ends
    for (const [i, j, r] of [
      [0, 1, rA],
      [3, 2, rB],
    ] as [number, number, THREE.Vector3][]) {
      const g = new Builder()
      facet(g, 'prefStone', [c[i].clone().setY(yE - 0.01), c[j].clone().setY(yE - 0.01), r.clone().setY(r.y - 0.1)], { hint: V(r.x - cx, 0, r.z - cz) })
      b.merge(g)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-24.8, 11.5, 30],
  materials: () => ({
    prefStone: new THREE.MeshStandardMaterial({ color: '#d9cfbc', roughness: 0.88 }),
    prefPlaster: new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.9 }),
    prefSocle: new THREE.MeshStandardMaterial({ color: '#7d7a74', roughness: 0.9 }),
    prefFrame: new THREE.MeshStandardMaterial({ color: '#c9c5bb', roughness: 0.6, metalness: 0.2 }),
  }),
  notes:
    'Administrative palace of 1969–70 (six bodies) with folded roofs whose steep edges run down the façades and an eleven-storey archive tower; roofs shown in new copper per the register; reference-limited model.',
}
export default model
