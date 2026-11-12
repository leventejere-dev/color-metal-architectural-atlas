/**
 * Biserica Schitu Măgureanu, Bd. Schitu Măgureanu 14, București (1881-1884) —
 * small cross-plan church on the west edge of Cișmigiu with two hexagonal
 * towers. COLOR METAL: copper sheet (2021, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 78.3° towards the altar (ENE); west front at −X towards
 * the boulevard):
 *  - Plan after OSM way 39313892: nave 10.6 × 8.4 m, short transept arms
 *    (5 m wide, 13.8 m across), altar bay to X 10.3 (straight east end as in OSM).
 *  - West front measured on the frontal photo 02 (façade 8.1 m ≈ 315 px, door
 *    ≈ 1.4 m as cross-check, ≈ 38 px/m): main cornice with dentils ≈ 7.4 m,
 *    pediment (≈ 33°) to ≈ 10.1 m with a mosaic medallion; corner pilasters;
 *    door with a segmental canopy hood on brackets (≈ 4.5-6.3 m); two arched
 *    mosaic icons flanking it.
 *  - West tower: square base on the roof ridge just behind the pediment,
 *    hexagonal drum (≈ 3.4 m) with arched louvres, cornice, ribbed bell dome,
 *    cross (≈ 17 m). Main tower over the crossing: larger hexagonal drum
 *    (≈ 4.4 m) with arched windows, bell dome, cross (≈ 18 m) — "two hexagonal
 *    towers" (bucharest.ro); heights from photos 01-03 proportions.
 *  - Side walls with corner pilasters, dentil cornice and tall round-arched
 *    windows (photo 01); gabled transept ends.
 *  - METAL (client rule): the three photos (≤ 2018) predate the 2021 works and
 *    show galvanised sheet; roofs, domes, tower bases and the door canopy are
 *    shown in copper standing seam, weathered ('copperBrown'), seams ≈ 0.5 m —
 *    which surfaces were renewed is not documented.
 * Approximations: east end and north side not photographed (mirrored /
 * inferred), roof pitches and all heights estimated, ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, helm, type Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const WALL = 'smWall'
const TRIM = 'smTrim'
const D2R = Math.PI / 180

const EAVE = 7.4
const PITCH = 33
const NAVE = { x0: -10.3, x1: 10.3, hw: 4.2 }
const ARM = { x0: 0.3, x1: 5.3, hw: 6.9 }
const CX = (ARM.x0 + ARM.x1) / 2
const WT = { x: -7.6, base: 3.8, y0: 10.2, a: 1.7, y1: 13.5 }
const MT = { x: CX, base: 4.9, y0: 10.8, a: 2.2, y1: 14.6 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, glass = 'glassC', f = 0.15) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, u, y0), 0.1, 10), M(m, mat(0, 0, 0.01)))
}

function dentils(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number) {
  for (let u = u0 + 0.2; u < u1 - 0.1; u += 0.38) b.add(TRIM, metricBox(0.16, 0.2, 0.2), M(m, mat(u, y, 0.1)))
}

/** Gable roof (ridge along X or Z) with copper seams; returns ridge height. */
function gable(b: Builder, x0: number, x1: number, hw: number, y: number, ridge: 'x' | 'z', cz = 0, cx = 0, ov = 0.4) {
  const t = Math.tan(PITCH * D2R)
  const ry = y + hw * t
  const ey = y - ov * t
  const h = hw + ov
  const P = (a: number, yy: number, c: number) => (ridge === 'x' ? V(a, yy, cz + c) : V(cx + c, yy, a))
  facet(b, CU, [P(x0, ey, h), P(x1, ey, h), P(x1, ry, 0), P(x0, ry, 0)], { seams: SEAM, thickness: 0.1 })
  facet(b, CU, [P(x1, ey, -h), P(x0, ey, -h), P(x0, ry, 0), P(x1, ry, 0)], { seams: SEAM, thickness: 0.1 })
  b.beam(CU, P(x0, ry + 0.05, 0), P(x1, ry + 0.05, 0), 0.2, 0.12)
  return ry
}

/** Triangular pediment wall + raking cornices on a gable end; m at the outer face, local u across. */
function pediment(b: Builder, m: THREE.Matrix4, hw: number, y: number) {
  const t = Math.tan(PITCH * D2R)
  const tri = new THREE.Shape([new THREE.Vector2(-hw, y - 0.01), new THREE.Vector2(hw, y - 0.01), new THREE.Vector2(0, y + hw * t)])
  b.add(WALL, extrude(tri, 0.6), M(m, mat(0, 0, -0.6)))
  for (const s of [-1, 1]) {
    const a = V(s * (hw + 0.35), y + 0.1, 0)
    const c = V(0, y + hw * t + 0.3, 0)
    const ga = new Builder()
    ga.beam(TRIM, a, c, 0.36, 0.3, V(0, 0, 1))
    b.merge(ga, M(m, mat(0, 0, 0.15)))
  }
  b.add(TRIM, metricBox(2 * hw + 0.7, 0.3, 0.4), M(m, mat(0, y + 0.1, 0.18)))
}

/** Hexagonal drum with openings on each face, cornice, ribbed bell dome and cross. */
function tower(b: Builder, x: number, o: { base: number; y0: number; a: number; y1: number }, louvred: boolean, domeH: number) {
  // square base on the roof
  const bh = o.y0 - EAVE + 0.4
  b.block(WALL, o.base, bh, o.base, x, EAVE - 0.4, 0)
  b.block(TRIM, o.base + 0.35, 0.22, o.base + 0.35, x, o.y0 - 0.22, 0)
  b.block(CU, o.base + 0.45, 0.05, o.base + 0.45, x, o.y0, 0)
  const n = 6
  const R = o.a / Math.cos(Math.PI / n)
  const ph = Math.PI / n
  prism(b, WALL, { x, n, r: R, y0: o.y0, h: o.y1 - o.y0, phase: ph })
  ringBand(b, TRIM, { x, n, r: R, y: o.y0, h: 0.3, grow: 0.08, phase: ph })
  ringBand(b, TRIM, { x, n, r: R, y: o.y1 - 0.35, h: 0.2, grow: 0.12, phase: ph })
  ringBand(b, TRIM, { x, n, r: R, y: o.y1 - 0.15, h: 0.18, grow: 0.28, phase: ph })
  const fw = 2 * o.a * Math.tan(Math.PI / n)
  for (let k = 0; k < n; k++) {
    const ang = (k * 2 * Math.PI) / n
    const m = wallAt(x + Math.cos(ang) * o.a, Math.sin(ang) * o.a, ang)
    const h = o.y1 - o.y0 - 1.1
    arched(b, m, 0, o.y0 + 0.5, fw * 0.36, h, louvred ? 'smDark' : 'glassC', 0.12)
    if (louvred) for (let y = o.y0 + 0.7; y < o.y0 + 0.5 + h - fw * 0.18; y += 0.22) b.add(TRIM, metricBox(fw * 0.34, 0.04, 0.1), M(m, mat(0, y, 0.06, 0, 0.5)))
    // edge pilasters
    const ae = ang + Math.PI / n
    b.add(TRIM, metricBox(0.2, o.y1 - o.y0 - 0.4, 0.2), mat(x + Math.cos(ae) * R, (o.y0 + o.y1) / 2, Math.sin(ae) * R, -ae))
  }
  // ribbed bell dome (hexagonal facets)
  const r0 = R + 0.3
  const y = o.y1 + 0.03
  const st: [number, number][] = [
    [r0, y],
    [r0 * 0.98, y + domeH * 0.12],
    [r0 * 0.9, y + domeH * 0.36],
    [r0 * 0.72, y + domeH * 0.6],
    [r0 * 0.45, y + domeH * 0.82],
    [r0 * 0.16, y + domeH * 0.97],
    [0.06, y + domeH],
  ]
  helm(b, CU, { x, n: 12, stations: st, phase: 0 })
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6
    for (let i = 0; i < st.length - 2; i++) {
      const p0 = V(x + Math.cos(a) * (st[i][0] + 0.02), st[i][1], Math.sin(a) * (st[i][0] + 0.02))
      const p1 = V(x + Math.cos(a) * (st[i + 1][0] + 0.02), st[i + 1][1], Math.sin(a) * (st[i + 1][0] + 0.02))
      b.beam(CU, p0, p1, 0.06, 0.05, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  const top = y + domeH
  b.add(CU, new THREE.CylinderGeometry(0.12, 0.2, 0.4, 10), mat(x, top + 0.15, 0))
  b.add('gilt', new THREE.SphereGeometry(0.16, 10, 8), mat(x, top + 0.45, 0))
  // cross
  const s = 1.3
  b.add('iron', metricBox(0.07, s, 0.07), mat(x, top + 0.55 + s / 2, 0))
  b.add('iron', metricBox(0.07, 0.07, s * 0.6), mat(x, top + 0.55 + s * 0.7, 0))
  b.add('iron', metricBox(0.06, 0.06, s * 0.36), mat(x, top + 0.55 + s * 0.88, 0))
  b.add('iron', metricBox(0.06, 0.06, s * 0.4), mat(x, top + 0.55 + s * 0.33, 0, 0.35))
}

function build(): Builder {
  const b = new Builder()

  /* ================= wall volumes ================= */
  const walls = (x0: number, x1: number, hw: number) => {
    const w = x1 - x0
    const x = (x0 + x1) / 2
    b.block(WALL, w, EAVE, 2 * hw, x, 0, 0)
    b.block('smSocle', w + 0.16, 0.6, 2 * hw + 0.16, x, 0, 0)
    b.block(TRIM, w + 0.1, 0.25, 2 * hw + 0.1, x, EAVE - 0.95, 0)
    b.block(TRIM, w + 0.5, 0.25, 2 * hw + 0.5, x, EAVE - 0.3, 0)
    b.block(TRIM, w + 0.7, 0.12, 2 * hw + 0.7, x, EAVE - 0.08, 0)
  }
  walls(NAVE.x0, NAVE.x1, NAVE.hw)
  walls(ARM.x0, ARM.x1, ARM.hw)

  /* ================= roofs ================= */
  gable(b, NAVE.x0 - 0.3, NAVE.x1 + 0.3, NAVE.hw, EAVE, 'x')
  gable(b, -ARM.hw - 0.3, ARM.hw + 0.3, (ARM.x1 - ARM.x0) / 2, EAVE, 'z', 0, CX)
  // pediments: west front, east end, transept ends
  pediment(b, faceFrame('-x', NAVE.x0, 0, 0, 0), NAVE.hw, EAVE)
  pediment(b, faceFrame('+x', NAVE.x1, 0, 0, 0), NAVE.hw, EAVE)
  for (const sz of [-1, 1]) pediment(b, faceFrame(sz > 0 ? '+z' : '-z', sz * ARM.hw, sz > 0 ? CX : -CX, 0, 0), (ARM.x1 - ARM.x0) / 2, EAVE)

  /* ================= west front ================= */
  {
    const fw = faceFrame('-x', NAVE.x0, 0, 0, 0)
    // corner pilasters
    for (const u of [-NAVE.hw + 0.3, NAVE.hw - 0.3]) b.add(TRIM, metricBox(0.65, EAVE - 1.0, 0.18), M(fw, mat(u, 0.6 + (EAVE - 1.0) / 2, 0.09)))
    dentils(b, fw, -NAVE.hw, NAVE.hw, EAVE - 0.65)
    // medallion in the pediment
    b.add('smMosaic', new THREE.CircleGeometry(0.42, 20), M(fw, mat(0, EAVE + 1.2, 0.04)))
    b.add(TRIM, new THREE.TorusGeometry(0.47, 0.08, 6, 20), M(fw, mat(0, EAVE + 1.2, 0.06)))
    // door + segmental canopy hood on brackets
    b.add('smDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.4, 2.6, 0, 0.5))), M(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('rect', 1.4, 2.6, 0.2, 0, 0.5), 0.1), M(fw, mat(0, 0, 0.01)))
    b.add(TRIM, metricBox(2.6, 1.3, 0.1), M(fw, mat(0, 3.85, 0.05)))
    for (let i = 0; i < 3; i++) b.add(TRIM, metricBox(2.6 + 0.6 - i * 0.3, 0.32, 1.4 - i * 0.3), M(fw, mat(0, -0.1 + 0.32 * i + 0.16, 0.7 - i * 0.15)))
    {
      const hs = 1.8
      const rise = 1.0
      const R = (hs * hs + rise * rise) / (2 * rise)
      const a0 = Math.asin(hs / R)
      const segs = 10
      const y0 = 4.6
      for (let i = 0; i < segs; i++) {
        const t0 = -a0 + (2 * a0 * i) / segs
        const t1 = -a0 + (2 * a0 * (i + 1)) / segs
        const p = (t: number, d: number) => M(fw, mat(R * Math.sin(t), y0 + rise - R + R * Math.cos(t), d))
        const A = V().setFromMatrixPosition(p(t0, 0))
        const B = V().setFromMatrixPosition(p(t1, 0))
        const C = V().setFromMatrixPosition(p(t1, 1.3))
        const D = V().setFromMatrixPosition(p(t0, 1.3))
        facet(b, CU, [A, B, C, D], { thickness: 0.06, hint: V(0, Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2)) })
      }
      const front = new THREE.Shape()
      front.moveTo(-hs, y0)
      for (let i = 0; i <= 14; i++) {
        const t = -a0 + (2 * a0 * i) / 14
        front.lineTo(R * Math.sin(t), y0 + rise - R + R * Math.cos(t))
      }
      front.lineTo(hs, y0)
      front.lineTo(hs - 0.2, y0)
      for (let i = 14; i >= 0; i--) {
        const t = -a0 + (2 * a0 * i) / 14
        front.lineTo((R - 0.2) * Math.sin(t), y0 + rise - R + (R - 0.2) * Math.cos(t) - 0.05)
      }
      front.lineTo(-hs + 0.2, y0)
      b.add(TRIM, extrude(front, 0.12), M(fw, mat(0, 0, 1.3)))
      for (const s of [-1, 1]) b.add('smDark', metricBox(0.12, 1.2, 1.1), M(fw, mat(s * (hs - 0.1), y0 - 0.5, 0.6)))
    }
    // mosaic icons flanking the door
    arched(b, fw, -2.95, 2.3, 1.05, 3.3, 'smMosaic', 0.14)
    arched(b, fw, 2.75, 2.3, 1.25, 3.4, 'smMosaic', 0.14)
    // small cross over the canopy
    b.add('iron', metricBox(0.06, 0.8, 0.06), M(fw, mat(0, 6.3, 0.25)))
    b.add('iron', metricBox(0.45, 0.06, 0.06), M(fw, mat(0, 6.45, 0.25)))
  }

  /* ================= side / east elevations ================= */
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const U = (x: number) => (sz > 0 ? x : -x)
    const fm = faceFrame(f, sz * NAVE.hw, 0, 0, 0)
    for (const x of [-7.2, -3.4]) arched(b, fm, U(x), 2.0, 1.15, 3.2)
    arched(b, fm, U(7.8), 2.0, 1.1, 3.0)
    for (const x of [NAVE.x0 + 0.3, -0.1, 5.7, NAVE.x1 - 0.3]) b.add(TRIM, metricBox(0.6, EAVE - 1.0, 0.16), M(fm, mat(U(x), 0.6 + (EAVE - 1.0) / 2, 0.08)))
    dentils(b, fm, U(sz > 0 ? NAVE.x0 : NAVE.x1), U(sz > 0 ? NAVE.x1 : NAVE.x0), EAVE - 0.65)
    const am = faceFrame(f, sz * ARM.hw, sz > 0 ? CX : -CX, 0, 0)
    arched(b, am, 0, 2.0, 1.3, 3.5)
    b.add(TRIM, new THREE.TorusGeometry(0.4, 0.08, 6, 18), M(am, mat(0, EAVE + 0.9, 0.08)))
    b.add('glassC', new THREE.CircleGeometry(0.36, 18), M(am, mat(0, EAVE + 0.9, 0.05)))
  }
  {
    const em = faceFrame('+x', NAVE.x1, 0, 0, 0)
    arched(b, em, 0, 2.6, 1.0, 2.6)
    b.add(TRIM, new THREE.TorusGeometry(0.4, 0.08, 6, 18), M(em, mat(0, EAVE + 1.1, 0.08)))
  }

  /* ================= towers ================= */
  tower(b, WT.x, WT, true, 1.8)
  tower(b, MT.x, MT, false, 2.3)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2.8, 15.5, 1.5],
  materials: () => ({
    smWall: new THREE.MeshStandardMaterial({ color: '#dedbd3', roughness: 0.9 }),
    smTrim: new THREE.MeshStandardMaterial({ color: '#eceae4', roughness: 0.85 }),
    smSocle: new THREE.MeshStandardMaterial({ color: '#cbc7bd', roughness: 0.9 }),
    smMosaic: new THREE.MeshStandardMaterial({ color: '#3b5f8c', roughness: 0.5, metalness: 0.1 }),
    smDoor: new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.7 }),
    smDark: new THREE.MeshStandardMaterial({ color: '#3a3d40', roughness: 0.7 }),
  }),
  notes:
    'Small cross-plan church with two hexagonal towers; roofs, bell domes and door canopy shown in weathered copper standing seam as supplied in 2021 — the available photographs predate the works.',
}
export default model
