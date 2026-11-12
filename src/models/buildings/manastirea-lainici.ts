/**
 * Mănăstirea Lainici (Defileul Jiului) — the new church with three towers
 * (OSM way 214696098). Copper per the COLOR METAL records (2023).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 71.6° towards the altar apse (ENE), +Z = 161.6°; the open
 * porch faces −X). Sources: four Commons photographs (01 porch from the side,
 * 02/03 west front, 04 distant view from the road) and the OSM outline
 * (32.3 × 20.2 m including the lateral conchs).
 *  - Open porch (x −16.15 … −11, 15 m wide) on a ≈ 1 m podium: five arches on
 *    the front (two each side of a wider central arch), paired corner columns,
 *    two arches on each side, carved parapets between the columns, a band of
 *    rosettes, a frieze of small blind arches, and a curved pediment with the
 *    mosaic icon under the arched eave (02, 03). Porch walls ≈ 8.9 m.
 *  - Church body (pronaos + naos + altar, x −11 … 12.8, 15 m wide, eave
 *    ≈ 11.6 m) with lateral conchs of the naos (OSM, 01) and a polygonal apse.
 *  - Roofs: the Brâncoveanu-revival two-tier silhouette — hipped roofs (≈ 22°)
 *    with very broad, almost flat flared eaves (≈ 2.2 m, timber soffits) whose
 *    west edge sweeps up in an arch over the central bay, both on the porch and
 *    on the body (02, 03).
 *  - Three towers (02, 03, 04): two smaller ones over the pronaos (z ≈ ±3.7)
 *    and the larger naos tower over the conch axis; square bases, octagonal
 *    drums with tall arched windows and corner colonettes, broad flared eaves,
 *    bell domes on short necks, gilded crosses.
 *  - METAL: the photographs (2011–2018) predate the 2023 copper and show grey
 *    sheet roofs; all roofs, eaves and domes are shown in new copper
 *    (copperNew, standing seams ≈ 0.5 m) — which surfaces were renewed is not
 *    documented.
 * Approximations: heights estimated from the frontal photographs (no survey
 * data); the east end and the north side are not photographed (apse polygon and
 * conchs after the OSM outline, north side mirrored); ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, hipRoof, loft, polyRing, prism, ringBand, dome, polygonalApse, seams, faceFrame } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperNew'
const WALL = 'plasterCream'
const STONE = 'stoneLight'
const SOFF = 'soffit'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const D2R = Math.PI / 180
const P1 = 22
const P2 = 8
const OV = 2.2

const PORCH = { x0: -16.15, x1: -11.0, hw: 7.5, pod: 1.0, imp: 4.9, top: 8.9 }
const BODY = { x0: -11.0, x1: 12.8, hw: 7.5, top: 11.6 }
const CONCH = { x: 0, zc: 5.5, r: 4.6, top: 8.8 }
const APSE = { hw: 3.4, top: 9.0 }
const SIDE_T = { x: -6.8, z: 3.7, base: 4.2, yb: 14.6, r: 2.0, yd: 18.4, dr: 1.5, dh: 1.45, cross: 1.9 }
const MAIN_T = { x: 0, z: 0, base: 5.0, yb: 15.2, r: 2.3, yd: 19.5, dr: 1.75, dh: 1.7, cross: 2.2 }

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function op(b: Builder, m: THREE.Matrix4, o: { w: number; h: number; y0: number; u?: number; type?: OpeningType; glass?: string; frame?: number; frameKey?: string; off?: number }) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.14
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? STONE, extrude(frameShape(type, o.w, o.h, f, u, o.y0), 0.12, 8), mul(m, mat(0, 0, off)))
}

/** Quad strip mesh between consecutive polylines (rows); normals face up (or down). */
function strip(b: Builder, key: string, rows: THREE.Vector3[][], down = false) {
  const pos: number[] = []
  const uv: number[] = []
  const tri = (a: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    const n = V().subVectors(c, a).cross(V().subVectors(d, a))
    const flip = down ? n.y > 0 : n.y < 0
    const pts = flip ? [a, d, c] : [a, c, d]
    for (const p of pts) {
      pos.push(p.x, p.y, p.z)
      uv.push(p.z, p.y + p.x)
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < rows[i].length - 1; j++) {
      tri(rows[i][j], rows[i + 1][j], rows[i + 1][j + 1])
      tri(rows[i][j], rows[i + 1][j + 1], rows[i][j + 1])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  b.add(key, g)
}

interface Flared {
  x0: number
  x1: number
  hw: number
  y: number
  openEast?: boolean
  curve?: { rise: number; cw: number }
}

/**
 * Hipped roof (pitch P1) over the wall rectangle with a broad, almost flat
 * flared eave (pitch P2, overhang OV) and timber soffits; the west eave can
 * sweep up in an arch over the central bay (Brâncoveanu-revival eaves).
 */
function flaredRoof(b: Builder, o: Flared) {
  const t1 = Math.tan(P1 * D2R)
  const t2 = Math.tan(P2 * D2R)
  const { x0, x1, hw, y } = o
  const he = hw + OV
  const yF = y - OV * t2
  const xw = x0 - OV
  const xe = o.openEast ? x1 : x1 + OV
  const dn = V(0, -0.14, 0)
  // upper slopes
  if (o.openEast) {
    const d = x1 - x0
    const zr = hw - d
    const yR = y + d * t1
    facet(b, CU, [V(x0, y, -hw), V(x0, y, hw), V(x1, yR, zr), V(x1, yR, -zr)], { seams: SEAM, thickness: 0.1 })
    for (const s of [-1, 1]) {
      facet(b, CU, [V(x0, y, s * hw), V(x1, y, s * hw), V(x1, yR, s * zr)], { seams: SEAM, thickness: 0.1 })
      b.rod(CU, V(x0, y + 0.05, s * hw), V(x1, yR + 0.05, s * zr), 0.065)
    }
  } else {
    const r = hipRoof((x0 + x1) / 2, 0, x1 - x0, 2 * hw, y, P1 * D2R)
    for (const f of r.facets) facet(b, CU, f, { seams: SEAM, thickness: 0.1 })
    for (const [a, c] of r.lines) b.rod(CU, a.clone().add(V(0, 0.05, 0)), c.clone().add(V(0, 0.05, 0)), 0.065)
  }
  // planar flares (sides, east) + soffits
  const planar: THREE.Vector3[][] = []
  for (const s of [-1, 1]) planar.push([V(xw, yF, s * he), V(xe, yF, s * he), V(o.openEast ? x1 : x1, y, s * hw), V(x0, y, s * hw)])
  if (!o.openEast) planar.push([V(xe, yF, -he), V(xe, yF, he), V(x1, y, hw), V(x1, y, -hw)])
  for (const q of planar) {
    facet(b, CU, q, { seams: SEAM, thickness: 0.08 })
    facet(b, SOFF, q.map((p) => p.clone().add(dn)), { hint: V(0, -1, 0), thickness: 0.03 })
  }
  // fascia along the eave edges
  for (const s of [-1, 1]) b.beam(CU, V(xw, yF - 0.06, s * (he + 0.03)), V(xe, yF - 0.06, s * (he + 0.03)), 0.12, 0.18)
  if (!o.openEast) b.beam(CU, V(xe + 0.03, yF - 0.06, -he), V(xe + 0.03, yF - 0.06, he), 0.12, 0.18)
  // flare hips
  for (const s of [-1, 1]) {
    b.rod(CU, V(xw, yF + 0.05, s * he), V(x0, y + 0.05, s * hw), 0.06)
    if (!o.openEast) b.rod(CU, V(xe, yF + 0.05, s * he), V(x1, y + 0.05, s * hw), 0.06)
  }
  // west flare, possibly arched
  const cv = o.curve
  const c = (z: number) => (cv && Math.abs(z) < cv.cw ? cv.rise * Math.cos((Math.PI / 2) * (z / cv.cw)) ** 2 : 0)
  const N = Math.max(8, Math.round((2 * he) / 0.5))
  const rows: THREE.Vector3[][] = []
  const soffRows: THREE.Vector3[][] = []
  const bump: THREE.Vector3[][] = []
  const dIn = 1.8
  for (let i = 0; i <= N; i++) {
    const z = -he + (2 * he * i) / N
    const zi = (z * hw) / he
    const cz = c(z)
    const O = V(xw, yF + cz, z)
    const I = V(x0, y + 0.55 * cz, zi)
    rows.push([O, I])
    soffRows.push([O.clone().add(dn), I.clone().add(dn)])
    if (cv && Math.abs(z) <= cv.cw + 0.6) bump.push([I.clone().add(V(0, 0.03, 0)), V(x0 + dIn, y + dIn * t1 + 0.03, zi)])
    if (i > 0 && i < N) {
      b.beam(CU, V(O.x, O.y + 0.03, O.z), V(I.x, I.y + 0.03, I.z), 0.045, 0.045)
      if (cv && cz > 0.02) b.beam(CU, V(I.x, I.y + 0.06, I.z), V(x0 + dIn, y + dIn * t1 + 0.06, zi), 0.045, 0.045)
    }
  }
  strip(b, CU, rows)
  strip(b, SOFF, soffRows, true)
  if (bump.length > 1) strip(b, CU, bump)
  // arched fascia
  for (let i = 0; i < N; i++) b.beam(CU, V(rows[i][0].x - 0.03, rows[i][0].y - 0.06, rows[i][0].z), V(rows[i + 1][0].x - 0.03, rows[i + 1][0].y - 0.06, rows[i + 1][0].z), 0.12, 0.18)
  return { c, yR: y + Math.min(hw, x1 - x0) * t1 }
}

/** Wall slab above the imposts with round arches cut from below (façade-local u). */
function arcadeWall(b: Builder, face: Face, plane: number, u0: number, u1: number, yImp: number, yTop: number, arches: [number, number][], depth = 0.6) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(u0, yImp)]
  for (const [cc, w] of [...arches].sort((p, q) => p[0] - q[0])) {
    const r = w / 2
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI - (i / 14) * Math.PI
      pts.push(new THREE.Vector2(cc + Math.cos(a) * r, yImp + Math.sin(a) * r))
    }
  }
  pts.push(new THREE.Vector2(u1, yImp), new THREE.Vector2(u1, yTop), new THREE.Vector2(u0, yTop))
  const m = faceFrame(face, plane, 0, 0, 0)
  b.add(WALL, extrude(new THREE.Shape(pts), depth, 4), mul(m, mat(0, 0, -depth)))
  for (const [cc, w] of arches) {
    const r = w / 2
    const f = 0.2
    const ring: THREE.Vector2[] = []
    for (let i = 0; i <= 12; i++) ring.push(new THREE.Vector2(cc + Math.cos((i / 12) * Math.PI) * (r + f), yImp + Math.sin((i / 12) * Math.PI) * (r + f)))
    for (let i = 12; i >= 0; i--) ring.push(new THREE.Vector2(cc + Math.cos((i / 12) * Math.PI) * r, yImp + Math.sin((i / 12) * Math.PI) * r))
    b.add(STONE, extrude(new THREE.Shape(ring), 0.12, 4), mul(m, mat(0, 0, 0.01)))
  }
}

function column(b: Builder, x: number, z: number, y0: number, h: number) {
  b.add(STONE, metricBox(0.62, 0.35, 0.62), mat(x, y0 + 0.175, z))
  b.add(STONE, new THREE.CylinderGeometry(0.22, 0.25, h - 0.95, 12), mat(x, y0 + 0.35 + (h - 0.95) / 2, z))
  b.add(STONE, new THREE.CylinderGeometry(0.36, 0.23, 0.45, 12), mat(x, y0 + h - 0.6 + 0.225, z))
  b.add(STONE, metricBox(0.8, 0.15, 0.8), mat(x, y0 + h - 0.075, z))
}

/** Frieze of small blind arches on a façade. */
function archFrieze(b: Builder, face: Face, plane: number, u0: number, u1: number, y0: number, w = 0.52, h = 0.85) {
  const n = Math.max(1, Math.floor((u1 - u0) / (w + 0.16)))
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) b.add(STONE, extrude(frameShape('round', w, h, 0.07, u0 + step * (i + 0.5), y0), 0.06, 6), faceFrame(face, plane, 0, 0, 0))
}

function cross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('gilt', new THREE.SphereGeometry(s * 0.09, 12, 8), mat(0, s * 0.06, 0))
  g.add('gilt', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('gilt', metricBox(s * 0.6, t, t), mat(0, s * 0.72, 0))
  g.add('gilt', metricBox(s * 0.34, t * 0.8, t), mat(0, s * 0.88, 0))
  g.add('gilt', metricBox(s * 0.42, t * 0.8, t), mat(0, s * 0.42, 0, 0, 0, 0.35))
  g.add('gilt', new THREE.TorusGeometry(s * 0.16, t * 0.3, 4, 16), mat(0, s * 0.72, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

function tower(b: Builder, t: typeof SIDE_T) {
  const { x, z, base, yb, r, yd, dr, dh } = t
  b.block(WALL, base, yb - 10.5, base, x, 10.5, z)
  b.box(STONE, base + 0.3, 0.28, base + 0.3, x, yb - 0.3, z)
  b.add(CU, loft([polyRing(4, (base / 2 + 0.45) * Math.SQRT2, yb - 0.25, Math.PI / 4, x, z), polyRing(4, (r * 0.95) * Math.SQRT2, yb + 0.25, Math.PI / 4, x, z)], { flat: true }))
  prism(b, WALL, { x, z, n: 8, r, y0: yb - 0.2, h: yd - yb + 0.2 })
  ringBand(b, STONE, { x, z, n: 8, r, y: yb + 0.15, h: 0.25, grow: 0.1 })
  ringBand(b, STONE, { x, z, n: 8, r, y: yd - 0.85, h: 0.18, grow: 0.08 })
  ringBand(b, STONE, { x, z, n: 8, r, y: yd - 0.35, h: 0.35, grow: 0.16 })
  const ap = r * Math.cos(Math.PI / 8)
  const wh = yd - yb - 1.7
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const m = wallAt(x + Math.cos(a) * ap, z + Math.sin(a) * ap, a)
    op(b, m, { w: 0.42, h: wh, y0: yb + 0.6, frame: 0.1, off: 0.01 })
    b.add(STONE, new THREE.TorusGeometry(0.17, 0.035, 4, 12), mul(m, mat(0, yd - 0.6, 0.04)))
    const cc = Math.PI / 8 + (k * Math.PI) / 4
    b.add(STONE, new THREE.CylinderGeometry(0.075, 0.075, yd - yb - 0.6, 6), mat(x + Math.cos(cc) * (r + 0.02), (yb + yd) / 2 - 0.05, z + Math.sin(cc) * (r + 0.02)))
  }
  // broad flared eave with timber soffit
  const R = r + 1.0
  b.add(SOFF, loft([polyRing(8, R - 0.02, yd - 0.14, Math.PI / 8, x, z), polyRing(8, r + 0.02, yd + 0.02, Math.PI / 8, x, z)], { flat: true }))
  b.add(CU, loft([polyRing(8, R, yd - 0.08, Math.PI / 8, x, z), polyRing(8, R, yd + 0.04, Math.PI / 8, x, z), polyRing(8, dr * 1.08, yd + 0.55, Math.PI / 8, x, z)], { capTop: true, flat: true }))
  for (let k = 0; k < 8; k++) {
    const cc = Math.PI / 8 + (k * Math.PI) / 4
    b.beam(CU, V(x + Math.cos(cc) * R, yd + 0.06, z + Math.sin(cc) * R), V(x + Math.cos(cc) * dr * 1.08, yd + 0.57, z + Math.sin(cc) * dr * 1.08), 0.08, 0.05)
  }
  // neck and bell dome
  b.add(CU, new THREE.CylinderGeometry(dr * 0.98, dr, 0.3, 32), mat(x, yd + 0.6, z))
  const prof: [number, number][] = []
  for (let j = 0; j <= 12; j++) {
    const s = j / 12
    prof.push([Math.max(0.02, Math.cos((s * Math.PI) / 2) ** 0.8 * (1 + 0.04 * Math.sin(s * Math.PI))), s])
  }
  const top = dome(b, CU, { x, y: yd + 0.75, z, r: dr, h: dh, profile: prof, seg: 32, ribs: 16, ribH: 0.04 })
  b.add('gilt', new THREE.CylinderGeometry(0.09, 0.15, 0.35, 8), mat(x, top + 0.1, z))
  cross(b, x, top + 0.25, z, t.cross)
}

function build(): Builder {
  const b = new Builder()
  const { x0: px0, x1: px1, hw, pod, imp, top: pt } = PORCH

  /* ---------------- porch ---------------- */
  b.block(WALL, px1 - px0 + 0.3, pod, 2 * hw + 0.3, (px0 + px1) / 2, 0, 0)
  b.block('socle', px1 - px0 + 0.5, 0.3, 2 * hw + 0.5, (px0 + px1) / 2, 0, 0)
  for (let k = 1; k <= 3; k++) b.block(STONE, 0.36, pod - k * 0.25, 4.2 + k * 0.3, px0 - 0.18 - (k - 1) * 0.36, 0, 0)
  const fCols = [-7.05, -6.6, -4.3, -1.9, 1.9, 4.3, 6.6, 7.05]
  const fArches: [number, number][] = [[-5.45, 1.72], [-3.1, 1.85], [0, 3.15], [3.1, 1.85], [5.45, 1.72]]
  arcadeWall(b, '-x', px0, -hw, hw, imp, pt, fArches)
  for (const zz of fCols) column(b, px0 + 0.3, zz, pod, imp - pod)
  const sCols = [-15.85, -13.6, -11.4]
  const sArches: [number, number][] = [[-14.5, 1.42], [-12.5, 1.62]]
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    arcadeWall(b, face, s * hw, s > 0 ? px0 : -px1, s > 0 ? px1 : -px0, imp, pt, sArches.map(([cc, w]) => [s * cc, w] as [number, number]))
    for (const x of sCols.slice(1)) column(b, x, s * (hw - 0.3), pod, imp - pod)
    // parapets
    for (let i = 0; i < sCols.length - 1; i++) {
      const xa = Math.min(sCols[i], sCols[i + 1]) + 0.3
      const xb = Math.max(sCols[i], sCols[i + 1]) - 0.3
      b.block(STONE, xb - xa, 0.95, 0.3, (xa + xb) / 2, pod, s * (hw - 0.3))
    }
  }
  for (let i = 0; i < fCols.length - 1; i++) {
    if (i === 3 || i === 0 || i === 6) continue
    const za = fCols[i] + 0.3
    const zb = fCols[i + 1] - 0.3
    b.block(STONE, 0.3, 0.95, zb - za, px0 + 0.3, pod, (za + zb) / 2)
  }
  // painted interior
  b.box('fresco', px1 - px0 - 0.6, 0.2, 2 * hw - 1.2, (px0 + px1) / 2 + 0.3, 6.75, 0)
  b.add('fresco', metricBox(0.05, 5.4, 2 * hw - 1.3), mat(px1 - 0.03, pod + 2.7, 0))
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.7, 3.2, 0, pod, 10))), faceFrame('-x', px1 - 0.06, 0, 0, 0))
  b.add(STONE, extrude(frameShape('round', 1.7, 3.2, 0.3, 0, pod), 0.12, 10), faceFrame('-x', px1 - 0.08, 0, 0, 0))
  // bands, frieze, cornice
  const xm = (px0 + px1) / 2
  b.box(STONE, px1 - px0 + 0.3, 0.3, 2 * hw + 0.3, xm, 6.75, 0)
  archFrieze(b, '-x', px0, -hw + 0.2, hw - 0.2, 7.05)
  for (const s of [-1, 1]) archFrieze(b, s > 0 ? '+z' : '-z', s * hw, s > 0 ? px0 + 0.2 : -px1, s > 0 ? px1 : -px0 - 0.2, 7.05)
  b.box(STONE, px1 - px0 + 0.4, 0.3, 2 * hw + 0.4, xm, 8.15, 0)
  b.box(STONE, px1 - px0 + 0.55, 0.22, 2 * hw + 0.55, xm, pt - 0.36, 0)

  /* ---------------- porch roof (half hip against the body) ---------------- */
  const pr = flaredRoof(b, { x0: px0, x1: px1, hw, y: pt, openEast: true, curve: { rise: 1.35, cw: 3.7 } })
  // curved pediment over the central arch with the mosaic icon
  {
    const pts: THREE.Vector2[] = []
    for (let i = 0; i <= 16; i++) {
      const zz = -3.4 + (6.8 * i) / 16
      pts.push(new THREE.Vector2(zz, pt + 0.55 * pr.c(zz) - 0.04))
    }
    pts.push(new THREE.Vector2(3.4, pt - 0.6), new THREE.Vector2(-3.4, pt - 0.6))
    const fm = faceFrame('-x', px0, 0, 0, 0)
    b.add(WALL, extrude(new THREE.Shape(pts), 0.6, 4), mul(fm, mat(0, 0, -0.6)))
    b.add('icon', metricBox(3.0, 0.75, 0.05), mul(fm, mat(0, 8.55, 0.04)))
    b.add(STONE, extrude(frameShape('rect', 3.0, 0.75, 0.12, 0, 8.175), 0.08, 4), mul(fm, mat(0, 0, 0.01)))
  }

  /* ---------------- body ---------------- */
  {
    const { x0, x1, top } = BODY
    const bx = (x0 + x1) / 2
    b.block(WALL, x1 - x0, top, 2 * hw, bx, 0, 0)
    b.block('socle', x1 - x0 + 0.3, 0.6, 2 * hw + 0.3, bx, 0, 0)
    b.box(STONE, x1 - x0 + 0.3, 0.3, 2 * hw + 0.3, bx, 6.75, 0)
    b.box(STONE, x1 - x0 + 0.5, 0.25, 2 * hw + 0.5, bx, top - 0.75, 0)
    b.box(STONE, x1 - x0 + 0.66, 0.2, 2 * hw + 0.66, bx, top - 0.38, 0)
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '+z' : '-z'
      const plane = s * hw
      for (const x of [-8.6, -6.2, 6.4, 9.0, 11.3]) {
        const m = faceFrame(face, plane, s * x, 0, 0)
        op(b, m, { w: 0.8, h: 2.3, y0: 3.0, frame: 0.14 })
        b.add(STONE, extrude(frameShape('round', 1.7, 4.4, 0.1, 0, 1.6), 0.06, 8), m)
      }
      archFrieze(b, face, plane, s > 0 ? x0 + 0.2 : -x1 + 0.2, s > 0 ? x1 - 0.2 : -x0 - 0.2, 9.9)
    }
    archFrieze(b, '+x', x1, -hw + 0.3, hw - 0.3, 9.9)
    // west wall above the porch roof
    op(b, faceFrame('-x', x0, 0, 0, 0), { w: 0.7, h: 1.3, y0: 10.0, type: 'round', frame: 0.12 })

    // lateral conchs of the naos
    for (const s of [-1, 1]) {
      const { x: cx, r, top: ct } = CONCH
      const cz = s * CONCH.zc
      const a = s * (Math.PI / 2)
      const half = (key: string, pts: [number, number][], seg = 24) =>
        b.add(key, new THREE.LatheGeometry(pts.map(([rr, yy]) => new THREE.Vector2(Math.max(rr, 0.01), yy)), seg, -a, Math.PI), mat(cx, 0, cz))
      half(WALL, [[r, 0], [r, ct]])
      half('socle', [[r + 0.15, 0], [r + 0.15, 0.6]])
      half(STONE, [[r + 0.12, 6.6], [r + 0.12, 6.9]])
      half(STONE, [[r + 0.15, ct - 1.6], [r + 0.15, ct - 1.4]])
      half(STONE, [[r + 0.25, ct - 0.25], [r + 0.25, ct]])
      // flared conical roof with timber soffit
      half(SOFF, [[r + 1.6, ct - 0.28], [r + 0.02, ct + 0.02]])
      half(CU, [[r + 1.65, ct - 0.22], [r + 1.62, ct - 0.12], [r, ct + 0.12], [0.05, ct + 0.12 + r * Math.tan(P1 * D2R)]], 32)
      for (let k = 1; k < 18; k++) {
        const ph = a - Math.PI / 2 + (k / 18) * Math.PI
        const d = V(Math.cos(ph), 0, Math.sin(ph))
        b.beam(CU, V(cx + d.x * (r + 1.63), ct - 0.12, cz + d.z * (r + 1.63)), V(cx + d.x * 0.8, ct + 0.14 + (r - 0.8) * Math.tan(P1 * D2R), cz + d.z * 0.8), 0.045, 0.045)
      }
      for (const k of [-2, -1, 0, 1, 2]) {
        const t = a + (k * Math.PI) / 6
        const m = wallAt(cx + Math.cos(t) * r, cz + Math.sin(t) * r, t)
        op(b, m, { w: 0.7, h: 2.1, y0: 3.2, frame: 0.12, off: 0.03 })
        b.add(STONE, new THREE.TorusGeometry(0.32, 0.05, 5, 16), mul(m, mat(0, 7.6, 0.06)))
      }
    }

    // altar apse
    polygonalApse(b, { x0: x1, hw: APSE.hw, y: APSE.top, sides: 5, wallKey: WALL, roofKey: CU, pitch: 30, seams: SEAM, overhang: 1.2 })
    const R = APSE.hw / Math.cos(Math.PI / 10)
    for (const k of [-1, 0, 1]) {
      const t = (k * Math.PI) / 5
      op(b, wallAt(x1 + Math.cos(t) * APSE.hw, Math.sin(t) * APSE.hw, t), { w: 0.6, h: 1.8, y0: 3.4, frame: 0.12, off: 0.02 })
    }
    b.add(STONE, loft([polyRing(10, R + 0.2, APSE.top - 0.3, Math.PI / 10, x1, 0), polyRing(10, R + 0.2, APSE.top, Math.PI / 10, x1, 0)], { capTop: true, flat: true }))

    // body roof with the arched west eave
    flaredRoof(b, { x0, x1, hw, y: top, curve: { rise: 1.0, cw: 4.4 } })
  }

  /* ---------------- towers ---------------- */
  for (const s of [-1, 1]) tower(b, { ...SIDE_T, z: s * SIDE_T.z })
  tower(b, MAIN_T)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-12, 10.5, 4],
  materials: () => ({
    fresco: new THREE.MeshStandardMaterial({ color: '#6f5a46', roughness: 0.85 }),
    icon: new THREE.MeshStandardMaterial({ color: '#a8874a', roughness: 0.45, metalness: 0.35 }),
    soffit: new THREE.MeshStandardMaterial({ color: '#5b3d29', roughness: 0.8 }),
  }),
  notes:
    'New church interpreted from four photographs and the OSM outline; heights estimated, east end and north side interpreted. The photographs predate the 2023 works — roofs and domes are shown in copper per the project record.',
}
export default model
