/**
 * Mănăstirea Nucet (Dâmbovița) — the monastery church (LMI DB-II-m-A-17608.01),
 * rebuilt 1840-1848 on the 15th-century foundation: white trefoil church with a
 * porch-tower at the west and an octagonal drum over the naos. COLOR METAL:
 * copper sheet (2015, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 82.1° towards the altar (E); west front at −X):
 *  - Footprint after OSM way 1441634148 (29.1 × 13.2 m): nave body 24 m long,
 *    10.8 m wide, short polygonal lateral apses at the naos (to Z ±6.6), a
 *    three-sided east apse to X 14.6.
 *  - Heights scaled on the south elevation photo 01 (building length ≈ 11 px/m):
 *    eaves ≈ 8.6 m with a hipped roof (≈ 30°); west porch-tower 6.4 m wide —
 *    big round-arched west entrance and side arches below, two upper stages
 *    with small windows to ≈ 16.3 m, octagonal bell cap with flared eaves and
 *    cross (≈ 19 m); square base on the naos (to ≈ 11.8 m) with its own skirt
 *    roof, octagonal drum Ø ≈ 6.6 m (OSM part way 1441634147 ≈ 7 m) with tall
 *    narrow arched windows to ≈ 19.2 m, faceted bell dome and cross (≈ 22.4 m)
 *    — photos 01, 02, 04.
 *  - Drum placed on the naos at X ≈ 2.5 (photo 01 and the south apse bulge of
 *    the OSM outline; the separate OSM drum polygon is offset eastwards, as is
 *    usual for tall parts traced on oblique imagery).
 *  - METAL: the 2023-2024 photos (03, 04) show the renewed roofs very dark with
 *    visible standing seams — weathered copper; all roofs, the tower cap and the
 *    dome are shown in dark weathered copper ('copperBrown'), seams ≈ 0.5 m.
 * Approximations: photos are small, so window counts, cornice profiles, the
 * east apse and the north side are interpreted; drum position and all heights
 * estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, helm, polygonalApse, type Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const WALL = 'ncWall'
const TRIM = 'ncTrim'
const D2R = Math.PI / 180

const HW = 5.4
const EAVE = 8.6
const PITCH = 30
const BODY = { x0: -14.6, x1: 9.4 }
const TWR = { x0: -14.6, x1: -8.2, hw: 3.2, top: 16.3 }
const DR = { x: 2.5, base: 9.0, baseTop: 11.8, a: 3.0, y0: 12.4, y1: 19.2 }
const LAT = { x0: -0.6, x1: 5.6, d: 1.2 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, glass = 'glassC', f = 0.14) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, u, y0), 0.1, 10), M(m, mat(0, 0, 0.01)))
}

/** Hipped roof over a rectangle (overhang included), copper seams. */
function hip(b: Builder, cx: number, cz: number, w: number, d: number, y: number, pitch: number) {
  const t = Math.tan(pitch * D2R)
  const hw = w / 2
  const hd = d / 2
  const c00 = V(cx - hw, y, cz - hd)
  const c10 = V(cx + hw, y, cz - hd)
  const c11 = V(cx + hw, y, cz + hd)
  const c01 = V(cx - hw, y, cz + hd)
  let fs: THREE.Vector3[][]
  let ls: [THREE.Vector3, THREE.Vector3][]
  if (w >= d) {
    const r1 = V(cx - (hw - hd), y + hd * t, cz)
    const r2 = V(cx + (hw - hd), y + hd * t, cz)
    fs = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    ls = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    const r1 = V(cx, y + hw * t, cz - (hd - hw))
    const r2 = V(cx, y + hw * t, cz + (hd - hw))
    fs = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    ls = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of fs) facet(b, CU, f, { seams: SEAM, thickness: 0.1 })
  for (const [a, c] of ls) b.beam(CU, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.16, 0.1)
}

/** Faceted octagonal bell dome with flared eaves and hip ribs; returns top y. */
function bellDome(b: Builder, x: number, z: number, y: number, r: number, h: number) {
  const st: [number, number][] = [
    [r * 1.12, y - 0.1],
    [r * 1.02, y + h * 0.1],
    [r * 0.97, y + h * 0.3],
    [r * 0.86, y + h * 0.52],
    [r * 0.66, y + h * 0.72],
    [r * 0.38, y + h * 0.88],
    [r * 0.12, y + h * 0.98],
    [0.06, y + h],
  ]
  helm(b, CU, { x, z, n: 8, stations: st })
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4
    for (let i = 0; i < st.length - 1; i++) b.beam(CU, V(x + Math.cos(a) * st[i][0], st[i][1], z + Math.sin(a) * st[i][0]), V(x + Math.cos(a) * st[i + 1][0], st[i + 1][1], z + Math.sin(a) * st[i + 1][0]), 0.08, 0.06, V(Math.cos(a), 0, Math.sin(a)))
  }
  return y + h
}

function cross(b: Builder, x: number, y: number, z: number, s: number) {
  b.add(CU, new THREE.SphereGeometry(0.14, 10, 8), mat(x, y + 0.1, z))
  b.add('iron', metricBox(0.07, s, 0.07), mat(x, y + s / 2, z))
  b.add('iron', metricBox(0.07, 0.07, s * 0.55), mat(x, y + s * 0.72, z))
  b.add('iron', metricBox(0.06, 0.06, s * 0.32), mat(x, y + s * 0.88, z))
  b.add('iron', metricBox(0.06, 0.06, s * 0.36), mat(x, y + s * 0.34, z, 0.35))
}

function build(): Builder {
  const b = new Builder()

  /* ================= body ================= */
  const bl = BODY.x1 - BODY.x0
  const bx = (BODY.x0 + BODY.x1) / 2
  b.block(WALL, bl, EAVE, 2 * HW, bx, 0, 0)
  b.block('ncSocle', bl + 0.16, 0.55, 2 * HW + 0.16, bx, 0, 0)
  b.block(TRIM, bl + 0.08, 0.18, 2 * HW + 0.08, bx, 4.6, 0)
  b.block(TRIM, bl + 0.35, 0.3, 2 * HW + 0.35, bx, EAVE - 0.3, 0)
  // lateral apses (three-sided, projecting LAT.d)
  for (const sz of [-1, 1]) {
    const c = (LAT.x0 + LAT.x1) / 2
    const hl = (LAT.x1 - LAT.x0) / 2
    const z0 = sz * HW
    const z1 = sz * (HW + LAT.d)
    const ring = (g: number, y: number) => [V(c - hl - g * 0.4, y, z0), V(c - hl * 0.55 - g * 0.3, y, z1 + sz * g), V(c + hl * 0.55 + g * 0.3, y, z1 + sz * g), V(c + hl + g * 0.4, y, z0)]
    const wall = (key: string, g: number, y0: number, y1: number) => {
      const a = ring(g, y0)
      const e = ring(g, y1)
      for (let i = 0; i < 3; i++) {
        const d = a[i + 1].clone().sub(a[i])
        facet(b, key, [a[i], a[i + 1], e[i + 1], e[i]], { hint: V(-d.z * sz, 0, d.x * sz) })
      }
    }
    wall(WALL, 0, 0, EAVE)
    wall(TRIM, 0.18, EAVE - 0.3, EAVE)
    wall(TRIM, 0.05, 4.6, 4.78)
    // roof facets from the eave ring to the body ridge line
    const t = Math.tan(PITCH * D2R)
    const er = ring(0.5, EAVE - 0.25)
    const top = V(c, EAVE - 0.25 + (HW + LAT.d + 0.5) * t * 0.55, sz * (HW - 0.6))
    for (let i = 0; i < 3; i++) facet(b, CU, [er[i], er[i + 1], top], { seams: SEAM, thickness: 0.08 })
    const m = faceFrame(sz > 0 ? '+z' : '-z', z1, sz > 0 ? c : -c, 0, 0)
    arched(b, m, 0, 2.6, 1.2, 2.4)
    arched(b, m, 0, 5.6, 0.7, 1.6)
  }
  // east apse
  polygonalApse(b, { x0: BODY.x1, hw: 4.6, y: EAVE, sides: 3, wallKey: WALL, roofKey: CU, pitch: PITCH, seams: SEAM, overhang: 0.5 })
  {
    for (const a of [-60, 0, 60]) {
      const ar = a * D2R
      arched(b, wallAt(BODY.x1 + Math.cos(ar) * 4.6, Math.sin(ar) * 4.6, ar), 0, 3.0, 0.9, 2.2)
    }
  }
  // body roof
  hip(b, bx + 0.2, 0, bl + 1.4, 2 * HW + 1.0, EAVE - 0.25, PITCH)

  /* ================= side windows ================= */
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(f, sz * HW, 0, 0, 0)
    const U = (x: number) => (sz > 0 ? x : -x)
    for (const x of [-6.0, 7.8]) {
      arched(b, m, U(x), 2.4, 1.2, 2.3)
      arched(b, m, U(x), 5.6, 0.7, 1.5)
    }
    // open side arch of the porch
    b.add('ncDark', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.7, 3.3, U(-12.4), 0.55, 10))), M(m, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.7, 3.3, 0.18, U(-12.4), 0.55), 0.1, 10), M(m, mat(0, 0, 0.01)))
    for (const x of [BODY.x0 + 0.3, -8.4, -0.9, 5.9, BODY.x1 - 0.3]) b.add(TRIM, metricBox(0.55, EAVE - 0.9, 0.12), M(m, mat(U(x), 0.55 + (EAVE - 0.9) / 2, 0.06)))
  }

  /* ================= west porch-tower ================= */
  {
    const tx = (TWR.x0 + TWR.x1) / 2
    const tw = TWR.x1 - TWR.x0
    b.block(WALL, tw, TWR.top - EAVE + 0.6, 2 * TWR.hw, tx, EAVE - 0.6, 0)
    // west face of the porch: big arch + cornice at the springing, pilasters
    const fw = faceFrame('-x', BODY.x0, 0, 0, 0)
    b.add('ncDark', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.9, 5.9, 0, 0.55, 14))), M(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 2.9, 5.9, 0.3, 0, 0.55), 0.14, 14), M(fw, mat(0, 0, 0.01)))
    b.add('ncFresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.2, 1.7, 0, 4.6, 12))), M(fw, mat(0, 0, 0.04)))
    b.add('ncDoor', metricBox(1.6, 2.6, 0.03), M(fw, mat(0, 0.55 + 1.3, 0.05)))
    b.add(TRIM, metricBox(2 * HW, 0.3, 0.25), M(fw, mat(0, 4.45, 0.12)))
    for (const u of [-HW + 0.35, -1.95, 1.95, HW - 0.35]) b.add(TRIM, metricBox(0.6, EAVE - 0.9, 0.16), M(fw, mat(u, 0.55 + (EAVE - 0.9) / 2, 0.08)))
    b.add('ncDark', metricBox(0.4, 0.4, 0.04), M(fw, mat(-3.5, 6.4, 0.02)))
    b.add('ncDark', metricBox(0.4, 0.4, 0.04), M(fw, mat(3.5, 6.4, 0.02)))
    // upper stages: string courses, small windows, cornice
    const midY = EAVE + 3.6
    b.block(TRIM, tw + 0.25, 0.25, 2 * TWR.hw + 0.25, tx, midY, 0)
    b.block(TRIM, tw + 0.35, 0.22, 2 * TWR.hw + 0.35, tx, TWR.top - 0.45, 0)
    b.block(TRIM, tw + 0.7, 0.25, 2 * TWR.hw + 0.7, tx, TWR.top - 0.25, 0)
    for (const [f, plane, uc] of [['-x', TWR.x0, 0], ['+x', TWR.x1, 0], ['+z', TWR.hw, tx], ['-z', -TWR.hw, -tx]] as [Face, number, number][]) {
      const m = faceFrame(f, plane, 0, 0, 0)
      b.add('ncDark', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.6, 1.0, uc, EAVE + 1.6))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('rect', 0.6, 1.0, 0.12, uc, EAVE + 1.6), 0.08), M(m, mat(0, 0, 0.01)))
      arched(b, m, uc, midY + 0.9, 0.75, 1.8, 'ncDark', 0.12)
      for (const du of [-tw / 2 + 0.25, tw / 2 - 0.25]) b.add(TRIM, metricBox(0.45, TWR.top - EAVE - 0.7, 0.1), M(m, mat(uc + (f.endsWith('x') ? (du * 2 * TWR.hw) / tw : du), EAVE + (TWR.top - EAVE - 0.7) / 2, 0.05)))
    }
    const top = bellDome(b, tx, 0, TWR.top + 0.05, 2.95, 1.5)
    cross(b, tx, top, 0, 1.4)
  }

  /* ================= naos drum ================= */
  {
    const x = DR.x
    const s = DR.base
    b.block(WALL, s, DR.baseTop - EAVE + 0.6, s, x, EAVE - 0.6, 0)
    b.block(TRIM, s + 0.3, 0.25, s + 0.3, x, DR.baseTop - 0.25, 0)
    hip(b, x, 0, s + 0.9, s + 0.9, DR.baseTop - 0.1, 22)
    const R = DR.a / Math.cos(Math.PI / 8)
    prism(b, WALL, { x, n: 8, r: R, y0: DR.y0 - 1.0, h: DR.y1 - DR.y0 + 1.0 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: DR.y1 - 0.45, h: 0.22, grow: 0.12 })
    ringBand(b, TRIM, { x, n: 8, r: R, y: DR.y1 - 0.23, h: 0.23, grow: 0.3 })
    const fwid = 2 * DR.a * Math.tan(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      const m = wallAt(x + Math.cos(ang) * DR.a, Math.sin(ang) * DR.a, ang)
      arched(b, m, 0, DR.y0 + 1.1, 0.55, 3.2, 'glassC', 0.12)
      b.add(TRIM, extrude(frameShape('round', fwid - 0.7, DR.y1 - DR.y0 - 1.0, 0.1, 0, DR.y0 + 0.4), 0.06, 8), M(m, mat(0, 0, 0.01)))
    }
    const top = bellDome(b, x, 0, DR.y1 + 0.02, R + 0.25, 2.0)
    cross(b, x, top, 0, 1.6)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2.5, 20, 2],
  materials: () => ({
    ncWall: new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.9 }),
    ncTrim: new THREE.MeshStandardMaterial({ color: '#e6e3da', roughness: 0.86 }),
    ncSocle: new THREE.MeshStandardMaterial({ color: '#c9c4b8', roughness: 0.9 }),
    ncDark: new THREE.MeshStandardMaterial({ color: '#3a3c3f', roughness: 0.7 }),
    ncDoor: new THREE.MeshStandardMaterial({ color: '#7a4f2d', roughness: 0.7 }),
    ncFresco: new THREE.MeshStandardMaterial({ color: '#9b7d55', roughness: 0.7 }),
  }),
  notes:
    'White Wallachian monastery church with a west porch-tower and an octagonal drum over the naos; roofs, tower cap and dome in weathered copper standing seam (copper supplied in 2015); drum position and heights estimated from small photographs.',
}
export default model
