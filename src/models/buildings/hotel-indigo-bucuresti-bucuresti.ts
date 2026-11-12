/**
 * Former „Hotel Indigo București” project — the unfinished building at
 * Str. Georges Clemenceau 8-10 (corner of Str. George Enescu), București
 * (earlier „The Vendôme Palace & Galerie”, from 2022 „One Plaza Athénée”).
 * The hotel never opened; the model shows the building shell as it stands:
 * a new building with a 19th-century-style facade, a corner rotunda with a dome
 * and a zinc mansard.
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 179.6° (towards the south), the street front on
 * Str. Georges Clemenceau faces +Z (west)):
 *  - Footprint after OSM way 1229725852 (58.4 × 25.1 m), simplified: the long
 *    street front ≈ 42 m, the corner rotunda (R ≈ 4.9 m, from the outline arc),
 *    the short wing along Str. George Enescu and the irregular rear.
 *  - Photo 02 (street level) and photo 01 (oblique aerial): rusticated ground
 *    floor ≈ 5 m with tall openings; first floor with round-arched windows and
 *    balconettes inside the rustication; three upper floors with pilaster
 *    strips and pedimented window surrounds; main cornice ≈ 18.6 m (ground +
 *    4 floors; the press reports 5 floors above ground); steep zinc mansard
 *    ≈ 3.6 m high with round-headed dormers and a flat top; the rotunda rises
 *    one storey higher with oculus dormers under a ribbed zinc dome.
 *  - METAL as photographed (aerial imagery c. 2022): mansard and rotunda dome in
 *    grey pre-patinated titanium-zinc ('zincNatural', standing seams ≈ 0.5 m) —
 *    the material COLOR METAL supplied in 2019 for this project according to
 *    its records; whether all of it was installed is not documented.
 * Approximations: rear and courtyard facades not photographed (plain window
 * grid); bay counts and storey heights estimated from the two images; the
 * mansard is a constant-slope ring over the simplified outline; roof plant
 * omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, seams, facet, dome, loft } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.04, 0.04)
const STONE = 'hiStone'
const TRIM = 'hiTrim'

const G = 5.0 // ground floor height
const FL = 3.4 // upper floor height
const CORNICE = G + 4 * FL // 18.6
const MAN_H = 3.6
const MAN_IN = 1.6
const ROT = { x: -16.7, z: 7.6, r: 4.9 }

/** simplified OSM outline in model coordinates (x south, z west) */
const OUT: [number, number][] = [
  [28.6, 12.2], [-13.5, 11.6], [-21.8, 7.2], [-23.6, 6.9], [-29.2, -0.8], [-21.7, -5.5], [-7.1, -5.5], [-7.0, -9.8],
  [0.5, -10.7], [13.7, -12.2], [16.7, -12.5], [17.0, -6.2], [26.8, -6.1], [28.6, 4.1],
]
/** street edges (indices of OUT start vertices) with full facade detail */
const STREET = new Set([0, 3])

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** outline oriented counter-clockwise in the (x, −z) plane (as prismOutline expects) */
function ccw(pts: [number, number][]) {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i]
    const [x1, z1] = pts[(i + 1) % pts.length]
    s += x0 * -z1 - x1 * -z0
  }
  return s > 0 ? pts : [...pts].reverse()
}

/** inward offset (mitred) of a CCW outline in the (x, −z) plane */
function inset(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length
  const P = pts.map(([x, z]) => [x, -z])
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n]
    const b = P[i]
    const c = P[(i + 1) % n]
    const e1 = [b[0] - a[0], b[1] - a[1]]
    const e2 = [c[0] - b[0], c[1] - b[1]]
    const l1 = Math.hypot(e1[0], e1[1])
    const l2 = Math.hypot(e2[0], e2[1])
    const n1 = [-e1[1] / l1, e1[0] / l1]
    const n2 = [-e2[1] / l2, e2[0] / l2]
    const k = 1 + n1[0] * n2[0] + n1[1] * n2[1]
    const f = d / Math.max(k, 0.35)
    out.push([b[0] + (n1[0] + n2[0]) * f, -(b[1] + (n1[1] + n2[1]) * f)])
  }
  return out
}

function ring(pts: [number, number][], y: number) {
  return pts.map(([x, z]) => V(x, y, z))
}

function polyPrism(b: Builder, key: string, pts: [number, number][], y0: number, y1: number) {
  b.add(key, loft([ring(pts, y0), ring(pts, y1)], { capTop: true, flat: true }))
}

/** one facade edge from A to B (outward normal on the right of A→B in plan) */
function facade(b: Builder, A: [number, number], B: [number, number], rich: boolean, centroid: [number, number]) {
  const dx = B[0] - A[0]
  const dz = B[1] - A[1]
  const L = Math.hypot(dx, dz)
  if (L < 4) return
  let nx = -dz / L
  let nz = dx / L
  const mx = (A[0] + B[0]) / 2
  const mz = (A[1] + B[1]) / 2
  if ((mx - centroid[0]) * nx + (mz - centroid[1]) * nz < 0) {
    nx = -nx
    nz = -nz
  }
  const m = wallAt(mx, mz, Math.atan2(nz, nx))
  const bays = Math.max(1, Math.round((L - 1.2) / 3.2))
  const step = (L - 1.2) / bays
  const U = (i: number) => -L / 2 + 0.6 + step * (i + 0.5)
  if (rich) {
    // rustication grooves on the ground floor and first floor
    for (let y = 0.6; y < G + FL - 0.3; y += 0.55) b.add(TRIM, metricBox(L, 0.07, 0.06), M(m, mat(0, y, 0.03)))
    b.add(TRIM, metricBox(L, 0.35, 0.4), M(m, mat(0, G + FL - 0.1, 0.2)))
    b.add(TRIM, metricBox(L, 0.2, 0.25), M(m, mat(0, G - 0.15, 0.12)))
    b.add(TRIM, metricBox(L + 0.2, 0.55, 0.75), M(m, mat(0, CORNICE - 0.28, 0.37)))
    b.add(TRIM, metricBox(L, 0.18, 0.35), M(m, mat(0, CORNICE - 0.85, 0.17)))
    for (let i = 0; i < bays; i++) {
      const u = U(i)
      // tall ground-floor opening
      b.add('glassC', metricBox(step * 0.62, G - 1.2, 0.04), M(m, mat(u, 0.3 + (G - 1.2) / 2, 0.03)))
      // first floor: round-arched window with balconette
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.3, u, G + 0.5, 10))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 1.3, 2.3, 0.18, u, G + 0.5), 0.12, 10), M(m, mat(0, 0, 0.01)))
      b.add(TRIM, metricBox(1.7, 0.18, 0.5), M(m, mat(u, G + 0.45, 0.25)))
      b.add('hiIron', metricBox(1.4, 0.6, 0.04), M(m, mat(u, G + 0.85, 0.48)))
      // upper floors: framed windows with pediments, pilaster strips between bays
      for (let f = 1; f < 4; f++) {
        const y0 = G + f * FL + 0.7
        b.add('glassC', metricBox(1.2, 1.9, 0.04), M(m, mat(u, y0 + 0.95, 0.03)))
        b.add(TRIM, extrude(frameShape('rect', 1.2, 1.9, 0.16, u, y0), 0.1), M(m, mat(0, 0, 0.01)))
        b.add(TRIM, metricBox(1.8, 0.16, 0.3), M(m, mat(u, y0 + 2.12, 0.15)))
        b.add(TRIM, metricBox(1.5, 0.12, 0.25), M(m, mat(u, y0 - 0.12, 0.12)))
      }
      b.add(TRIM, metricBox(0.4, 3 * FL - 0.6, 0.12), M(m, mat(U(i) - step / 2, G + FL + (3 * FL - 0.6) / 2 + 0.2, 0.06)))
    }
    b.add(TRIM, metricBox(0.4, 3 * FL - 0.6, 0.12), M(m, mat(L / 2 - 0.6, G + FL + (3 * FL - 0.6) / 2 + 0.2, 0.06)))
  } else {
    b.add(TRIM, metricBox(L, 0.4, 0.4), M(m, mat(0, CORNICE - 0.2, 0.2)))
    b.add(TRIM, metricBox(L, 0.2, 0.2), M(m, mat(0, G - 0.1, 0.1)))
    for (let i = 0; i < bays; i++) {
      const u = U(i)
      b.add('glassC', metricBox(step * 0.5, G - 1.6, 0.04), M(m, mat(u, 0.6 + (G - 1.6) / 2, 0.03)))
      for (let f = 0; f < 4; f++) b.add('glassC', metricBox(1.2, 1.8, 0.04), M(m, mat(u, G + f * FL + 0.8 + 0.9, 0.03)))
    }
  }
  // dormers on the mansard above street facades
  if (rich) {
    for (let i = 0; i < bays; i++) {
      const u = U(i)
      const dm = M(m, mat(u, CORNICE + 0.1, 0))
      b.add(ZN, metricBox(1.3, 1.9, 1.1), M(dm, mat(0, 0.95, -0.2)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.85, 1.4, 0, 0.25, 10))), M(dm, mat(0, 0, 0.36)))
      b.add(ZN, new THREE.CylinderGeometry(0.66, 0.66, 1.1, 14, 1, false, Math.PI / 2, Math.PI), M(dm, mat(0, 1.9, -0.2, 0, Math.PI / 2, 0)))
    }
  }
}

function build(): Builder {
  const b = new Builder()
  const out = ccw(OUT)
  let cx = 0
  let cz = 0
  for (const [x, z] of out) {
    cx += x / out.length
    cz += z / out.length
  }

  /* ================= main body ================= */
  polyPrism(b, STONE, out, 0, CORNICE)
  for (let i = 0; i < out.length; i++) {
    const A = out[i]
    const B = out[(i + 1) % out.length]
    const ia = OUT.findIndex(([x, z]) => x === A[0] && z === A[1])
    const ib = OUT.findIndex(([x, z]) => x === B[0] && z === B[1])
    const lo = Math.abs(ia - ib) === 1 ? Math.min(ia, ib) : Math.max(ia, ib)
    if (lo === 1) continue // chord inside the rotunda
    facade(b, A, B, STREET.has(lo), [cx, cz])
  }

  /* ================= mansard ================= */
  {
    const grown = inset(out, -0.3)
    const top = inset(out, MAN_IN)
    const y0 = CORNICE
    const y1 = CORNICE + MAN_H
    const R0 = ring(grown, y0)
    const R1 = ring(top, y1)
    for (let i = 0; i < R0.length; i++) {
      const j = (i + 1) % R0.length
      facet(b, ZN, [R0[i], R0[j], R1[j], R1[i]], { seams: SEAM, thickness: 0.08 })
    }
    for (let i = 0; i < R0.length; i++) b.beam(ZN, R0[i], R1[i], 0.12, 0.08)
    // flat top (membrane, light grey) with zinc curb
    const s = new THREE.Shape(top.map(([x, z]) => new THREE.Vector2(x, -z)))
    b.add('hiFlat', new THREE.ShapeGeometry(s), new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, y1, 0)))
    for (let i = 0; i < R1.length; i++) b.beam(ZN, R1[i].clone().add(V(0, 0.06, 0)), R1[(i + 1) % R1.length].clone().add(V(0, 0.06, 0)), 0.3, 0.12)
  }

  /* ================= corner rotunda ================= */
  {
    const { x, z, r } = ROT
    const yA = CORNICE + MAN_H + 0.4
    b.add(STONE, new THREE.CylinderGeometry(r, r, CORNICE, 40), mat(x, CORNICE / 2, z))
    for (let y = 0.6; y < G + FL - 0.3; y += 0.55) b.add(TRIM, new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.07, 40, 1, true), mat(x, y, z))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.4, r + 0.4, 0.55, 40), mat(x, CORNICE - 0.28, z))
    b.add(TRIM, new THREE.CylinderGeometry(r + 0.2, r + 0.2, 0.35, 40), mat(x, G + FL - 0.1, z))
    // windows and rounded balconies on the street-facing half
    const n = 7
    for (let k = 0; k < n; k++) {
      const a = 0.95 + (k / (n - 1)) * 2.6 // street-facing half: from west (+Z) round to north (−X)
      const m = wallAt(x + Math.cos(a) * r, z + Math.sin(a) * r, a)
      b.add('glassC', metricBox(1.4, G - 1.2, 0.04), M(m, mat(0, 0.3 + (G - 1.2) / 2, 0.03)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 2.2, 0, G + 0.5, 10))), M(m, mat(0, 0, 0.03)))
      for (let f = 1; f < 4; f++) {
        b.add('glassC', metricBox(1.1, 1.9, 0.04), M(m, mat(0, G + f * FL + 0.7 + 0.95, 0.03)))
        b.add(TRIM, extrude(frameShape('rect', 1.1, 1.9, 0.15, 0, G + f * FL + 0.7), 0.1), M(m, mat(0, 0, 0.01)))
      }
    }
    for (let f = 2; f < 4; f++) {
      // cylinder angle θ relates to the plan angle a by θ = π/2 − a
      b.add(TRIM, new THREE.CylinderGeometry(r + 0.8, r + 0.8, 0.18, 40, 1, false, Math.PI / 2 - 3.55, 2.6), mat(x, G + f * FL + 0.55, z))
      b.add('hiIron', new THREE.CylinderGeometry(r + 0.78, r + 0.78, 0.9, 40, 1, true, Math.PI / 2 - 3.55, 2.6), mat(x, G + f * FL + 1.1, z))
    }
    // attic drum with oculus dormers
    b.add(STONE, new THREE.CylinderGeometry(r - 0.4, r - 0.4, yA - CORNICE, 40), mat(x, (CORNICE + yA) / 2, z))
    b.add(TRIM, new THREE.CylinderGeometry(r - 0.15, r - 0.15, 0.35, 40), mat(x, yA - 0.17, z))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const m = wallAt(x + Math.cos(a) * (r - 0.4), z + Math.sin(a) * (r - 0.4), a)
      b.add('glassC', new THREE.CircleGeometry(0.5, 16), M(m, mat(0, CORNICE + 1.9, 0.03)))
      b.add(TRIM, new THREE.TorusGeometry(0.58, 0.09, 6, 18), M(m, mat(0, CORNICE + 1.9, 0.03)))
    }
    // ribbed zinc dome with a small lantern
    const prof: [number, number][] = [[1.0, 0], [0.98, 0.18], [0.9, 0.4], [0.74, 0.62], [0.5, 0.82], [0.22, 0.96], [0.02, 1]]
    const top = dome(b, ZN, { x, y: yA, z, r: r - 0.15, h: 3.4, profile: prof, seg: 40, ribs: 40, ribH: 0.05 })
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3
      const rr = (r - 0.15) * 0.86
      b.add(ZN, new THREE.SphereGeometry(0.45, 12, 8), mat(x + Math.cos(a) * rr, yA + 1.0, z + Math.sin(a) * rr))
    }
    b.add(ZN, new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12), mat(x, top + 0.3, z))
    b.add(ZN, new THREE.SphereGeometry(0.22, 10, 8), mat(x, top + 0.85, z))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [4, 20.5, 10.6],
  materials: () => ({
    hiStone: new THREE.MeshStandardMaterial({ color: '#e7dfcf', roughness: 0.85 }),
    hiTrim: new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.8 }),
    hiIron: new THREE.MeshStandardMaterial({ color: '#2c2c2c', roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.85 }),
    hiFlat: new THREE.MeshStandardMaterial({ color: '#a9abab', roughness: 0.9 }),
  }),
  notes:
    'Unfinished hotel building (2008-2019) with a 19th-century-style stone facade, a corner rotunda with a ribbed dome and a zinc mansard with dormers; mansard and dome in grey pre-patinated titanium-zinc as seen in recent imagery; rear facades and storey heights estimated.',
}
export default model
