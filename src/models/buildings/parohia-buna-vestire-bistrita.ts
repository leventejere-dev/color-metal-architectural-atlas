/**
 * Biserica Greco-Catolică „Buna Vestire”, Str. Gării 13, Bistrița — OSM way 348507221.
 * (Register entry „Parohia Buna Vestire”, Bistrița; matched to the Greek-Catholic
 * church — an Orthodox parish of the same dedication in the city is not excluded.)
 *
 * Modelling specification (real metres, +X = 43.6° = OSM long axis of the
 * minimum rectangle, pointing to the NE façade on Str. Gării; +Z = 133.6°, SE).
 * Sources: OSM outline, aerial imagery (roof layout), photo 01 (from Str. Gării,
 * c. 2017), photo 02 (2013, tower), photo 03 (2018, entrance forecourt), press
 * description (tower in the SE, 36 m; church consecrated 2014).
 *  - Plan: hexagon after the OSM outline — a ≈ 30 × 28.5 m square with the N and
 *    S corners chamfered (≈ 9 m). The roof ridge runs along the diagonal between
 *    the two right-angled W and E corners (≈ 40.7 m, bearing ≈ 86°) as seen in the
 *    aerial image; the walls follow the two roof planes with raking tops and a
 *    white parapet (photo 01: NE wall rising from ≈ 11.5 m at the N chamfer to the
 *    ≈ 18.6 m ridge at the E corner, pitch ≈ 23°).
 *  - Glazed ridge lantern along the whole ridge (light band with mullions in the
 *    aerial image), triangular glazed roof light on the south slope.
 *  - NE façade: white render, glazed ground floor with canopy, tall recessed
 *    entrance, brick-clad vertical strip near the E corner, window band near the
 *    N corner.
 *  - Bell tower SE of the E corner: white slab ≈ 5.6 × 3 m, open stair slot,
 *    cantilevered landing and vertical fin forming a large cross on the NE face,
 *    steep gabled top and a slender square spire with cross (≈ 36 m); lower
 *    brick-clad link wing between tower and church (photos 01–02).
 *  - METAL (client rule): the photographs predate the 2019 copper works and show a
 *    red roof and spire; roof planes, lantern cap, spire and wing roof are shown in
 *    weathered copper standing seam (copperBrown), which surfaces were re-covered is
 *    not documented.
 * Approximations: façades other than the NE one are not photographed (window
 * strips typological); heights scaled from photo 01 against the 36 m tower; tower
 * position and size estimated; the complex's connecting corridors to the NW are
 * not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, seams, faceFrame } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const CU = 'copperBrown'
const SEAM = seams(CU, 0.55, 0.05, 0.05)

/* OSM outline in the model frame (x along 43.6°, z along 133.6°) */
const A = V(8.59, 0, -14.25) // N chamfer, west corner
const B = V(-15.0, 0, -13.39) // W corner (ridge end)
const C = V(-14.18, 0, 7.46) // S chamfer, west corner
const D = V(-7.82, 0, 14.16) // S chamfer, east corner
const E = V(14.93, 0, 14.25) // E corner (ridge end)
const F = V(15.0, 0, -8.14) // N chamfer, east corner
const RING = [A, B, C, D, E, F]

const RIDGE = 18.6
const TP = Math.tan(23.2 * D2R)
const U = V().subVectors(E, B).normalize() // ridge direction
const NRM = V(-U.z, 0, U.x) // horizontal normal of the ridge (points to the south side)

/** Signed distance from the ridge line (positive = south side). */
const sd = (p: THREE.Vector3) => V().subVectors(p, B).dot(NRM)
/** Height of the roof plane above a plan point. */
const roofY = (p: THREE.Vector3) => RIDGE - Math.abs(sd(p)) * TP
const at = (p: THREE.Vector3, dy = 0) => V(p.x, roofY(p) + dy, p.z)

/** Outward horizontal normal of the edge p→q of the (clockwise-in-plan) ring. */
function outward(p: THREE.Vector3, q: THREE.Vector3) {
  const d = V().subVectors(q, p).normalize()
  const n = V(d.z, 0, -d.x)
  const mid = V().addVectors(p, q).multiplyScalar(0.5)
  if (n.dot(mid) < 0) n.negate()
  return n
}

function build(): Builder {
  const b = new Builder()

  /* ================= main hall: walls with raking tops ================= */
  for (let i = 0; i < RING.length; i++) {
    const p = RING[i]
    const q = RING[(i + 1) % RING.length]
    const n = outward(p, q)
    facet(b, 'plasterWhite', [V(p.x, 0, p.z), V(q.x, 0, q.z), at(q), at(p)], { hint: n })
    // plinth
    b.beam('concrete', V(p.x, 0.3, p.z).addScaledVector(n, 0.05), V(q.x, 0.3, q.z).addScaledVector(n, 0.05), 0.12, 0.6)
    // white parapet following the roof planes
    const pi = p.clone().addScaledVector(n, -0.2)
    const qi = q.clone().addScaledVector(n, -0.2)
    b.beam('white', at(pi, 0.22), at(qi, 0.22), 0.42, 0.56)
  }
  // top caps (under the roofing)
  facet(b, 'plasterWhite', [at(B, -0.02), at(A, -0.02), at(F, -0.02), at(E, -0.02)])
  facet(b, 'plasterWhite', [at(E, -0.02), at(D, -0.02), at(C, -0.02), at(B, -0.02)])

  /* ================= copper roof planes ================= */
  const inset = (p: THREE.Vector3) => p.clone().addScaledVector(V(-p.x, 0, -p.z).normalize(), 0.35)
  const [Ai, Bi, Ci, Di, Ei, Fi] = RING.map(inset)
  facet(b, CU, [at(Bi, 0.03), at(Ai, 0.03), at(Fi, 0.03), at(Ei, 0.03)], { seams: SEAM, thickness: 0.12 })
  facet(b, CU, [at(Ei, 0.03), at(Di, 0.03), at(Ci, 0.03), at(Bi, 0.03)], { seams: SEAM, thickness: 0.12 })

  /* glazed ridge lantern */
  {
    const L0 = B.clone().addScaledVector(U, 3.0)
    const L1 = E.clone().addScaledVector(U, -3.0)
    const hw = 0.9
    const top = RIDGE + 1.25
    for (const s of [-1, 1]) {
      const p0 = L0.clone().addScaledVector(NRM, s * hw)
      const p1 = L1.clone().addScaledVector(NRM, s * hw)
      facet(b, 'glassC', [at(p0, 0.05), at(p1, 0.05), V(p1.x, top, p1.z), V(p0.x, top, p0.z)], { hint: NRM.clone().multiplyScalar(s) })
      const len = p0.distanceTo(p1)
      const nm = Math.round(len / 1.6)
      for (let k = 0; k <= nm; k++) {
        const m = p0.clone().lerp(p1, k / nm).addScaledVector(NRM, s * 0.03)
        b.beam('aluDarkGrey', at(m, 0.05), V(m.x, top, m.z), 0.08, 0.08)
      }
      // roof of the lantern (shallow copper gable)
      const e0 = L0.clone().addScaledVector(NRM, s * (hw + 0.2)).addScaledVector(U, -0.2)
      const e1 = L1.clone().addScaledVector(NRM, s * (hw + 0.2)).addScaledVector(U, 0.2)
      const r0 = L0.clone().addScaledVector(U, -0.2)
      const r1 = L1.clone().addScaledVector(U, 0.2)
      facet(b, CU, [V(e0.x, top, e0.z), V(e1.x, top, e1.z), V(r1.x, top + 0.45, r1.z), V(r0.x, top + 0.45, r0.z)], { seams: SEAM, thickness: 0.1 })
      // white fascia of the lantern roof and sill line
      b.beam('white', V(e0.x, top - 0.12, e0.z), V(e1.x, top - 0.12, e1.z), 0.12, 0.3)
      const s0 = L0.clone().addScaledVector(NRM, s * (hw + 0.05))
      const s1 = L1.clone().addScaledVector(NRM, s * (hw + 0.05))
      b.beam('white', at(s0, 0.12), at(s1, 0.12), 0.14, 0.2)
    }
    // glazed ends
    for (const [P, dir] of [[L0, -1], [L1, 1]] as [THREE.Vector3, number][]) {
      const a0 = P.clone().addScaledVector(NRM, -hw)
      const a1 = P.clone().addScaledVector(NRM, hw)
      facet(b, 'glassC', [at(a0, 0.05), at(a1, 0.05), V(a1.x, top, a1.z), V(a0.x, top, a0.z)], { hint: U.clone().multiplyScalar(dir) })
      facet(b, 'white', [V(a0.x, top, a0.z), V(a1.x, top, a1.z), V(P.x, top + 0.45, P.z)], { hint: U.clone().multiplyScalar(dir) })
    }
  }

  /* triangular roof light on the south slope (aerial image) */
  {
    const c = C.clone().lerp(D, 0.08).addScaledVector(V().subVectors(D, C).normalize(), 0).addScaledVector(NRM, -1.0)
    const d = D.clone().lerp(C, 0.08).addScaledVector(NRM, -1.0)
    const mid = V().addVectors(C, D).multiplyScalar(0.5)
    const apex = mid.clone().addScaledVector(NRM, -9.0)
    facet(b, 'skylight', [at(c, 0.09), at(d, 0.09), at(apex, 0.09)])
    for (const [p, q] of [[c, d], [d, apex], [apex, c]]) b.beam('aluDarkGrey', at(p, 0.12), at(q, 0.12), 0.14, 0.1)
  }

  /* small crosses on the ridge ends */
  for (const [P, dir] of [[E, -1], [B, 1]] as [THREE.Vector3, number][]) {
    const p = P.clone().addScaledVector(U, dir * 0.4)
    b.rod('white', V(p.x, RIDGE + 0.3, p.z), V(p.x, RIDGE + 2.4, p.z), 0.06, 6)
    b.beam('white', V(p.x, RIDGE + 1.85, p.z).addScaledVector(NRM, -0.45), V(p.x, RIDGE + 1.85, p.z).addScaledVector(NRM, 0.45), 0.1, 0.1)
  }

  /* ================= NE façade on Str. Gării (photo 01) ================= */
  const NE = F.x // façade plane (x ≈ 15)
  const fz = (z: number, y: number, depth = 0) => faceFrame('+x', NE, -z, y, depth)
  // glazed ground floor with white canopy
  b.add('glassC', metricBox(10.0, 3.0, 0.06), fz(7.5, 1.9, 0.04))
  for (let k = 0; k <= 8; k++) b.add('aluDarkGrey', metricBox(0.1, 3.0, 0.1), fz(2.5 + k * 1.25, 1.9, 0.08))
  b.add('white', metricBox(10.6, 0.45, 1.6), fz(7.5, 3.65, 0.8))
  // tall recessed entrance
  b.add('black', metricBox(5.4, 8.0, 0.06), fz(5.2, 4.0, 0.02))
  b.add('glassC', metricBox(5.0, 7.4, 0.06), fz(5.2, 4.1, 0.05))
  for (let k = 0; k <= 4; k++) b.add('aluDarkGrey', metricBox(0.1, 7.4, 0.12), fz(2.7 + k * 1.25, 4.1, 0.08))
  b.add('white', metricBox(6.2, 0.5, 0.6), fz(5.2, 8.25, 0.3))
  // brick-clad vertical strip near the E corner
  b.add('brickRed', metricBox(2.6, 9.0, 0.25), fz(11.0, 4.0 + 9.0, 0.12))
  b.add('glassC', metricBox(0.9, 7.0, 0.06), fz(11.0, 13.0, 0.27))
  // side entrance with glass canopy and window band near the N corner
  b.add('glassC', metricBox(3.0, 3.0, 0.06), fz(-4.0, 1.9, 0.04))
  b.add('aluDarkGrey', metricBox(6.5, 0.25, 2.2), fz(-5.0, 4.6, 1.1))
  b.add('glassC', metricBox(4.6, 1.6, 0.06), fz(-6.4, 8.1, 0.04))
  // entrance steps / forecourt edge
  b.block('concreteLight', 1.6, 0.3, 14.0, NE + 0.8, 0, -7.0 + 14.0)

  /* typological windows on the other faces: vertical slit bands */
  {
    const slits = (p: THREE.Vector3, q: THREE.Vector3, ts: number[], y0: number, h: number) => {
      const n = outward(p, q)
      const d = V().subVectors(q, p)
      for (const t of ts) {
        const c = p.clone().addScaledVector(d, t).addScaledVector(n, 0.04)
        const yTop = Math.min(y0 + h, roofY(c) - 1.2)
        if (yTop - y0 < 1.5) continue
        const m = new THREE.Matrix4().makeBasis(V().crossVectors(V(0, 1, 0), n).normalize(), V(0, 1, 0), n)
        m.setPosition(c.x, (y0 + yTop) / 2, c.z)
        b.add('glassC', metricBox(0.6, yTop - y0, 0.06), m)
      }
    }
    slits(A, B, [0.2, 0.35, 0.5, 0.65, 0.8], 3.0, 12) // NW wall
    slits(B, C, [0.25, 0.4, 0.55, 0.7], 3.0, 12) // SW wall
    slits(D, E, [0.2, 0.35, 0.5], 3.0, 12) // SE wall (west part)
    slits(C, D, [0.3, 0.5, 0.7], 1.0, 9) // S chamfer
    slits(F, A, [0.3, 0.5, 0.7], 1.0, 9) // N chamfer
  }

  /* ================= bell tower (SE of the E corner) ================= */
  const TXC = 12.0
  const TZC = 20.0
  const THX = 1.5
  const THZ = 2.8
  const TE = 25.0 // eaves of the gabled top
  const TAP = TE + 4.3 // apex
  b.block('concreteLight', 2 * THX, TE, 2 * THZ, TXC, 0, TZC)
  // gabled top (pentagon seen on the ±X faces)
  {
    const s = new THREE.Shape([new THREE.Vector2(-THZ, 0), new THREE.Vector2(THZ, 0), new THREE.Vector2(0, TAP - TE)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 2 * THX, bevelEnabled: false })
    // shape in (z, y), extruded along x
    b.add('concreteLight', g, new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(TXC + THX, TE, TZC))
  }
  // open stair slot on the NE face with landings
  b.add('black', metricBox(0.06, 18.5, 1.5), mat(TXC + THX + 0.01, 3.0 + 9.25, TZC - 0.6))
  for (let y = 4.4; y < 21.5; y += 2.8) b.add('concreteLight', metricBox(0.5, 0.18, 1.5), mat(TXC + THX - 0.1, y, TZC - 0.6))
  // belfry openings
  for (const sx of [-1, 1]) b.add('black', metricBox(0.06, 2.2, 2.0), mat(TXC + sx * (THX + 0.01), 23.4, TZC))
  for (const sz of [-1, 1]) b.add('black', metricBox(1.6, 2.2, 0.06), mat(TXC, 23.4, TZC + sz * (THZ + 0.01)))
  // vertical fin and cantilevered landing forming a large cross on the NE face
  b.block('white', 0.6, 23.0, 0.55, TXC + THX + 0.3, 0, TZC + 0.9)
  b.block('white', 1.3, 0.35, 4.6, TXC + THX + 0.55, 22.3, TZC + 0.2)
  // slender square spire (copper, client rule) and cross
  {
    const y0 = TAP - 0.7
    const h = 5.6
    const r = 1.0
    const ring = [V(TXC - r, y0, TZC - r), V(TXC + r, y0, TZC - r), V(TXC + r, y0, TZC + r), V(TXC - r, y0, TZC + r)]
    const ap = V(TXC, y0 + h, TZC)
    for (let i = 0; i < 4; i++) {
      const p = ring[i]
      const q = ring[(i + 1) % 4]
      const out = V((p.x + q.x) / 2 - TXC, 0.3, (p.z + q.z) / 2 - TZC)
      facet(b, CU, [p, q, ap], { seams: seams(CU, 0.45, 0.04, 0.04), hint: out, thickness: 0.06 })
      b.beam(CU, p, ap, 0.08, 0.06)
    }
    b.rod('white', V(TXC, y0 + h - 0.2, TZC), V(TXC, y0 + h + 1.6, TZC), 0.05, 6)
    b.add('white', metricBox(0.08, 0.08, 0.9), mat(TXC, y0 + h + 1.15, TZC))
  }

  /* lower link wing between tower and church (brick-clad, photos 01–02) */
  {
    const x0 = 8.6
    const x1 = 14.9
    const z0 = 14.25
    const z1 = TZC - THZ
    const h = 12.6
    b.block('brickRed', x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.add('glassC', metricBox(0.06, 2.0, 1.8), mat(x1 + 0.01, 6.0, (z0 + z1) / 2))
    b.add('glassC', metricBox(0.06, 2.0, 1.8), mat(x1 + 0.01, 9.4, (z0 + z1) / 2))
    // mono-pitch copper roof falling towards the tower
    const t = Math.tan(18 * D2R)
    const ov = 0.35
    const zh = z0 + 0.0
    const yh = h + (z1 - z0) * t
    facet(b, CU, [V(x0 - ov, yh, zh), V(x1 + ov, yh, zh), V(x1 + ov, h - ov * t, z1 + ov), V(x0 - ov, h - ov * t, z1 + ov)], { seams: SEAM, thickness: 0.1 })
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [8, 17.3, 3],
  notes:
    'Modern Greek-Catholic church on a chamfered-square plan with a diagonal ridge, glazed ridge lantern and slender bell tower; roofs and spire shown in copper per the 2019 register entry (photos predate the works); only the street (NE) façade is photographed.',
}
export default model
