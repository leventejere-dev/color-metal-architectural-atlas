/**
 * Vila Constantin Geblescu, Str. Polonă 8, Bucharest (Beaux-Arts villa, 1912).
 * Location PROBABLE (unnamed OSM building way 162569989 holding the address point).
 *
 * Modelling specification derived from the 12 reference photographs (roof level
 * only: three show the roofs before the works, nine the new elZinc Oliva roofs
 * during the works) and the OSM outline (8 nodes, ≈ 757 m², ≈ 30 × 29 m, an
 * L-shaped block with the south-east quadrant cut away). Real metres; origin =
 * footprint centre; +X = OSM axis 173.3° (towards the south), +Z = west (the
 * Str. Polonă façade, taken as the main front); Bd. Dacia (north) is at −X.
 *
 *  - BODY: three storeys of cream stone/stucco (raised ground floor with
 *    rustication, piano nobile with hooded windows, low second floor), modillion
 *    cornice ≈ 12 m and a white attic band; one projecting bay on the front with
 *    a balustraded terrace and urns in front of a stone dormer door (photo 02).
 *  - MANSARD ROOFS (COLOR METAL scope, elZinc Oliva, flat-lock shingles shown as
 *    horizontal courses): very steep lower slopes (≈ 72–75°) with near-flat tops.
 *    Along the front the photographs show three heights — corner tower, a low
 *    link, then a taller block whose curb carries a zinc frieze of scrolls and a
 *    cornice; lower end sections. Ox-eye dormers in zinc; stone dormers with
 *    consoles (photos 01–02) on the lower sections.
 *  - CORNER TOWER (north-west, at the street corner): square, ≈ 7 m, bell-cast
 *    mansard (flared foot, ≈ 79° above), arched dormers with zinc scroll
 *    surrounds, a zinc frieze with swags/garlands and corner consoles, egg-and-
 *    dart cornice, louvred lantern with a low hipped cap and a lightning rod.
 *  - DOME PAVILION (photo 03, before the works): rectangular imperial dome with
 *    an ox-eye dormer and beaded ribs, square lantern, bulb cap and spire; placed
 *    on the centre of the north-east wing (position not documented).
 * Approximations: plan and elevations are not photographed — façade rhythm,
 * storey heights, the position of the dome pavilion and of the low/tall roof
 * sections are interpreted; the dome is shown in the new zinc (its current
 * finish is not documented); ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, hipRoof, lathe, loft, rectRing, window_, hippedRoof, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const EAVE = 12.6 // foot of the mansards
const ZK = 'zincOliva' // elZinc Oliva shingles
const OK = 'gbOrn' // zinc ornament (same finish, untextured)

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Horizontal shingle courses on a planar roof facet (flat-lock zinc). */
function courses(b: Builder, pts: THREE.Vector3[], spacing = 0.42) {
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.y < 0) n.negate()
  const ys = pts.map((p) => p.y)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  for (let y = y0 + spacing * 0.7; y < y1 - 0.15; y += spacing) {
    const hits: THREE.Vector3[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if ((y - a.y) * (y - c.y) < 0) hits.push(a.clone().lerp(c, (y - a.y) / (c.y - a.y)))
    }
    if (hits.length < 2) continue
    const off = n.clone().multiplyScalar(0.025)
    b.beam(ZK, hits[0].clone().add(off), hits[1].clone().add(off), 0.035, 0.03, n)
  }
}

interface MansardSpec {
  x0: number
  x1: number
  z0: number
  z1: number
  rise: number
  pitch: number
  /** sides that continue into a neighbouring roof (no facet, extended `ext` m) */
  open?: Face[]
  ext?: number
  /** zinc frieze band + cornice at the curb (taller sections) */
  frieze?: number
}

/** Steep mansard (four trapezoids to a curb), flat top, curb cornice; returns the curb rectangle. */
function mansard(b: Builder, s: MansardSpec) {
  const open = new Set(s.open ?? [])
  const ext = s.ext ?? 1.8
  const ov = 0.22
  const inset = s.rise / Math.tan(s.pitch * D2R)
  const x0 = s.x0 - (open.has('-x') ? ext : ov)
  const x1 = s.x1 + (open.has('+x') ? ext : ov)
  const z0 = s.z0 - (open.has('-z') ? ext : ov)
  const z1 = s.z1 + (open.has('+z') ? ext : ov)
  const ye = EAVE - ov * Math.tan(s.pitch * D2R) * 0.25
  const yc = EAVE + s.rise
  const cx0 = open.has('-x') ? x0 : s.x0 + inset
  const cx1 = open.has('+x') ? x1 : s.x1 - inset
  const cz0 = open.has('-z') ? z0 : s.z0 + inset
  const cz1 = open.has('+z') ? z1 : s.z1 - inset
  const E = (x: number, z: number) => V(x, ye, z)
  const C = (x: number, z: number) => V(x, yc, z)
  const faces: [Face, THREE.Vector3[]][] = [
    ['+z', [E(x0, z1), E(x1, z1), C(cx1, cz1), C(cx0, cz1)]],
    ['-z', [E(x1, z0), E(x0, z0), C(cx0, cz0), C(cx1, cz0)]],
    ['-x', [E(x0, z0), E(x0, z1), C(cx0, cz1), C(cx0, cz0)]],
    ['+x', [E(x1, z1), E(x1, z0), C(cx1, cz0), C(cx1, cz1)]],
  ]
  for (const [f, pts] of faces) {
    if (open.has(f)) continue
    facet(b, ZK, pts, { thickness: 0.1 })
    courses(b, pts)
  }
  // hip flashings
  const corners: [number, number, number, number, Face, Face][] = [
    [x0, z0, cx0, cz0, '-x', '-z'],
    [x1, z0, cx1, cz0, '+x', '-z'],
    [x1, z1, cx1, cz1, '+x', '+z'],
    [x0, z1, cx0, cz1, '-x', '+z'],
  ]
  for (const [ex, ez, qx, qz, fa, fb] of corners) if (!open.has(fa) && !open.has(fb)) b.beam(OK, E(ex, ez), C(qx, qz), 0.16, 0.12)
  // eave gutter
  const gut = (a: THREE.Vector3, c: THREE.Vector3) => b.beam(OK, a.clone().setY(ye - 0.05), c.clone().setY(ye - 0.05), 0.24, 0.22)
  if (!open.has('+z')) gut(E(x0, z1), E(x1, z1))
  if (!open.has('-z')) gut(E(x0, z0), E(x1, z0))
  if (!open.has('-x')) gut(E(x0, z0), E(x0, z1))
  if (!open.has('+x')) gut(E(x1, z0), E(x1, z1))
  // curb: frieze band + cornice, flat top
  const w = cx1 - cx0
  const d = cz1 - cz0
  const cx = (cx0 + cx1) / 2
  const cz = (cz0 + cz1) / 2
  const fh = s.frieze ?? 0
  if (fh > 0) {
    b.block(OK, w, fh, d, cx, yc, cz)
    // scroll frieze panels on the open-air sides
    const panel = (face: Face, len: number, plane: number, mid: number) => {
      const n = Math.max(1, Math.floor(len / 2.6))
      for (let i = 0; i < n; i++) {
        const u = mid + (i - (n - 1) / 2) * (len / n)
        const m = frame(face, plane, u)
        b.add(OK, metricBox(len / n - 0.5, fh * 0.5, 0.05), M(m, mat(0, yc + fh * 0.5, 0.03)))
        for (let k = -1; k <= 1; k++) b.add(OK, new THREE.TorusGeometry(fh * 0.16, 0.035, 4, 12), M(m, mat(k * 0.55, yc + fh * 0.5, 0.07)))
      }
    }
    if (!open.has('+z')) panel('+z', w, cz1, cx)
    if (!open.has('-z')) panel('-z', w, cz0, -cx)
    if (!open.has('-x')) panel('-x', d, cx0, cz)
    if (!open.has('+x')) panel('+x', d, cx1, -cz)
  }
  const top = yc + fh
  b.block(OK, w + 0.35, 0.22, d + 0.35, cx, top, cz)
  b.block(OK, w + 0.55, 0.14, d + 0.55, cx, top + 0.22, cz)
  const hr = hipRoof(cx, cz, w + 0.2, d + 0.2, top + 0.3, 9 * D2R)
  for (const q of hr.facets) facet(b, 'gbFlat', q)
  for (const [p, q] of hr.lines) b.beam(OK, p, q, 0.12, 0.08)
  return { cx0, cx1, cz0, cz1, yc, top: top + 0.42, inset, ye }
}

/** facade frame (local x along the facade, +z outward) */
function frame(face: Face, plane: number, u: number) {
  switch (face) {
    case '+z':
      return mat(u, 0, plane, 0)
    case '-z':
      return mat(-u, 0, plane, Math.PI)
    case '+x':
      return mat(plane, 0, -u, Math.PI / 2)
    default:
      return mat(plane, 0, u, -Math.PI / 2)
  }
}

/** Ox-eye dormer on a mansard slope: m = facade frame at the wall plane, slope inset at height y. */
function oxEye(b: Builder, m: THREE.Matrix4, y: number, out: number) {
  b.add(OK, new THREE.CylinderGeometry(0.44, 0.48, 0.8, 16, 1, false), M(m, mat(0, y, out + 0.05, 0, Math.PI / 2)))
  b.add(OK, new THREE.TorusGeometry(0.44, 0.1, 6, 16), M(m, mat(0, y, out + 0.45)))
  b.add('glassC', new THREE.CircleGeometry(0.36, 16), M(m, mat(0, y, out + 0.46)))
  b.add(OK, metricBox(0.3, 0.22, 0.25), M(m, mat(0, y + 0.6, out + 0.35)))
}

/** Stone dormer with consoles (photos 01–02), front plane at local z = 0. */
function stoneDormer(b: Builder, m: THREE.Matrix4, y0: number, door = false) {
  const w = 1.25
  const h = door ? 2.6 : 1.9
  const yb = door ? y0 : y0 + 0.5
  b.add('gbStone', metricBox(2.2, h + 1.3 + (yb - y0), 1.6), M(m, mat(0, y0 + (h + 1.3 + (yb - y0)) / 2, -0.8)))
  b.add('glassC', new THREE.PlaneGeometry(w, h), M(m, mat(0, yb + h / 2 + 0.1, 0.02)))
  b.add('gbTrim', metricBox(w + 0.36, 0.14, 0.08), M(m, mat(0, yb + 0.05, 0.04)))
  for (const s of [-1, 1]) {
    b.add('gbTrim', metricBox(0.2, h + 0.2, 0.1), M(m, mat(s * (w / 2 + 0.1), yb + h / 2 + 0.1, 0.05)))
    b.add('gbTrim', metricBox(0.3, 1.0, 0.36), M(m, mat(s * 0.95, yb + h - 0.15, 0.16)))
  }
  b.add('gbTrim', metricBox(2.5, 0.3, 1.9), M(m, mat(0, yb + h + 0.95, -0.75)))
  b.add('gbTrim', metricBox(2.0, 0.55, 0.12), M(m, mat(0, yb + h + 0.55, 0.05)))
  b.add(OK, metricBox(2.55, 0.08, 1.95), M(m, mat(0, yb + h + 1.14, -0.75)))
}

function urn(b: Builder, x: number, y: number, z: number) {
  b.add('gbTrim', lathe([[0.001, 0], [0.22, 0], [0.22, 0.08], [0.1, 0.16], [0.14, 0.28], [0.34, 0.42], [0.38, 0.62], [0.3, 0.7], [0.001, 0.72]], 12), mat(x, y, z))
}

function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 1.0) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / 0.32))
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add('gbTrim', lathe([[0.001, 0], [0.08, 0], [0.05, 0.15], [0.1, 0.4], [0.05, 0.62], [0.07, 0.7], [0.001, 0.7]], 6), mat(p.x, p.y + 0.12, p.z))
  }
  b.beam('gbTrim', a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.36, 0.12)
  b.beam('gbTrim', a.clone().setY(a.y + h - 0.1), c.clone().setY(c.y + h - 0.1), 0.42, 0.18)
}

/* ------------------------------------------------------------------ */
/* Walls & façades                                                     */
/* ------------------------------------------------------------------ */

interface Wing {
  x0: number
  x1: number
  z0: number
  z1: number
}
const A: Wing = { x0: -14.5, x1: 16.0, z0: -4.0, z1: 12.5 } // along Str. Polonă
const B: Wing = { x0: -14.5, x1: 5.5, z0: -16.8, z1: -4.0 } // north-east wing
const TW = { x0: -14.8, x1: -7.8, z0: 5.8, z1: 12.8 } // corner tower
const DP = { x0: -15.1, x1: -8.6, z0: -14.4, z1: -6.4 } // dome pavilion on the north front

function walls(b: Builder, w: Wing, grow = 0) {
  const cx = (w.x0 + w.x1) / 2
  const cz = (w.z0 + w.z1) / 2
  const W = w.x1 - w.x0 + 2 * grow
  const D = w.z1 - w.z0 + 2 * grow
  b.block('gbStone', W, 12.0, D, cx, 0, cz)
  b.block('gbSocle', W + 0.3, 1.0, D + 0.3, cx, 0, cz)
  for (let y = 1.5; y < 4.9; y += 0.55) b.block('gbStone', W + 0.08, 0.09, D + 0.08, cx, y, cz)
  b.block('gbTrim', W + 0.24, 0.42, D + 0.24, cx, 4.9, cz) // belt
  b.block('gbTrim', W + 0.16, 0.3, D + 0.16, cx, 8.85, cz) // sill band 2nd floor
  b.block('gbTrim', W + 0.2, 0.35, D + 0.2, cx, 11.25, cz) // frieze
  b.block('gbTrim', W + 0.9, 0.42, D + 0.9, cx, 11.6, cz) // cornice corona
  b.block('plasterWhite', W - 0.1, EAVE - 12.0, D - 0.1, cx, 12.0, cz) // attic band (white, as rebuilt)
}

function modillions(b: Builder, a: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3) {
  const L = a.distanceTo(c)
  const n = Math.floor(L / 0.75)
  const ry = Math.atan2(out.x, out.z)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n).add(out.clone().multiplyScalar(0.25))
    b.add('gbTrim', metricBox(0.18, 0.26, 0.45), mat(p.x, 11.45, p.z, ry))
  }
}

/** Window bays along one façade between u0..u1 (façade-local), three storeys. */
function facadeBays(b: Builder, face: Face, plane: number, u0: number, u1: number, step = 3.4) {
  const n = Math.max(1, Math.round((u1 - u0) / step))
  const sp = (u1 - u0) / n
  for (let i = 0; i < n; i++) {
    const u = u0 + sp * (i + 0.5)
    window_(b, face, plane, u, 1.7, { w: 1.4, h: 2.5, frame: 0.2, frameKey: 'gbTrim', sill: true, bars: [2, 3] })
    window_(b, face, plane, u, 5.75, { w: 1.5, h: 2.75, frame: 0.24, frameKey: 'gbTrim', sill: true, bars: [2, 3] })
    // hood cornice over the piano-nobile windows
    const m = frame(face, plane, u)
    b.add('gbTrim', metricBox(2.3, 0.22, 0.42), M(m, mat(0, 8.98, 0.2)))
    b.add('gbTrim', metricBox(1.8, 0.4, 0.12), M(m, mat(0, 8.72, 0.06)))
    window_(b, face, plane, u, 9.55, { w: 1.3, h: 1.55, frame: 0.18, frameKey: 'gbTrim', sill: true, bars: [2, 2] })
  }
}

/* ------------------------------------------------------------------ */
/* Corner tower                                                        */
/* ------------------------------------------------------------------ */

function tower(b: Builder) {
  const cx = (TW.x0 + TW.x1) / 2
  const cz = (TW.z0 + TW.z1) / 2
  const hw = (TW.x1 - TW.x0) / 2
  // walls (corner pavilion projecting 0.3 m) with quoins
  b.block('gbStone', 2 * hw, 12.0, 2 * hw, cx, 0, cz)
  b.block('gbSocle', 2 * hw + 0.3, 1.0, 2 * hw + 0.3, cx, 0, cz)
  for (let y = 1.4; y < 11.2; y += 0.55) {
    const l = Math.round((y - 1.4) / 0.55) % 2 ? 0.9 : 0.55
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('gbTrim', metricBox(l, 0.42, l), mat(cx + sx * (hw - l / 2 + 0.06), y + 0.21, cz + sz * (hw - l / 2 + 0.06)))
  }
  b.block('gbTrim', 2 * hw + 0.24, 0.42, 2 * hw + 0.24, cx, 4.9, cz)
  b.block('gbTrim', 2 * hw + 0.2, 0.35, 2 * hw + 0.2, cx, 11.25, cz)
  b.block('gbTrim', 2 * hw + 1.0, 0.42, 2 * hw + 1.0, cx, 11.6, cz)
  b.block('plasterWhite', 2 * hw - 0.1, EAVE - 12.0, 2 * hw - 0.1, cx, 12.0, cz)
  // bell-cast mansard: flared foot, then ≈ 79°
  const st: [number, number][] = [
    [hw + 0.3, EAVE - 0.06],
    [hw + 0.02, EAVE + 0.55],
    [hw - 0.2, EAVE + 1.4],
    [hw - 1.05, 19.2],
  ]
  b.add(ZK, loft(st.map(([h, y]) => rectRing(h, h, y, cx, cz)), {}))
  for (let y = EAVE + 0.35; y < 19.0; y += 0.42) {
    let h = st[0][0]
    for (let i = 0; i < st.length - 1; i++) if (y >= st[i][1] && y <= st[i + 1][1]) h = st[i][0] + ((st[i + 1][0] - st[i][0]) * (y - st[i][1])) / (st[i + 1][1] - st[i][1])
    const o = h + 0.02
    b.beam(ZK, V(cx - o, y, cz - o), V(cx + o, y, cz - o), 0.04, 0.035)
    b.beam(ZK, V(cx - o, y, cz + o), V(cx + o, y, cz + o), 0.04, 0.035)
    b.beam(ZK, V(cx - o, y, cz - o), V(cx - o, y, cz + o), 0.04, 0.035)
    b.beam(ZK, V(cx + o, y, cz - o), V(cx + o, y, cz + o), 0.04, 0.035)
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let i = 0; i < st.length - 1; i++) b.beam(OK, V(cx + sx * st[i][0], st[i][1], cz + sz * st[i][0]), V(cx + sx * st[i + 1][0], st[i + 1][1], cz + sz * st[i + 1][0]), 0.14, 0.12)
  }
  b.beam(OK, V(cx - hw - 0.3, EAVE - 0.1, cz - hw - 0.3), V(cx + hw + 0.3, EAVE - 0.1, cz - hw - 0.3), 0.24, 0.22)
  b.beam(OK, V(cx - hw - 0.3, EAVE - 0.1, cz + hw + 0.3), V(cx + hw + 0.3, EAVE - 0.1, cz + hw + 0.3), 0.24, 0.22)
  b.beam(OK, V(cx - hw - 0.3, EAVE - 0.1, cz - hw - 0.3), V(cx - hw - 0.3, EAVE - 0.1, cz + hw + 0.3), 0.24, 0.22)
  b.beam(OK, V(cx + hw + 0.3, EAVE - 0.1, cz - hw - 0.3), V(cx + hw + 0.3, EAVE - 0.1, cz + hw + 0.3), 0.24, 0.22)
  // arched dormers with zinc scroll surrounds on all four faces
  const faces: [Face, number, number][] = [
    ['+z', cz + hw, cx],
    ['-z', cz - hw, -cx],
    ['+x', cx + hw, -cz],
    ['-x', cx - hw, cz],
  ]
  const yD = 14.0
  const outD = -0.25 // dormer face just proud of the slope
  for (const [f, plane, u] of faces) {
    const m = M(frame(f, plane, u), mat(0, 0, outD))
    b.add(OK, metricBox(1.55, 2.4, 0.9), M(m, mat(0, yD + 1.1, -0.2)))
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archOutline(0.62, 1.4))), M(m, mat(0, yD + 0.45, 0.27)))
    for (const s of [-1, 1]) b.add(OK, new THREE.TorusGeometry(0.22, 0.07, 5, 12, Math.PI * 1.5), M(m, mat(s * 0.78, yD + 0.55, 0.28, 0, 0, s > 0 ? Math.PI : 0)))
    b.add(OK, new THREE.CylinderGeometry(0.3, 0.3, 0.16, 14), M(m, mat(0, yD + 2.35, 0.3, 0, Math.PI / 2)))
    for (const s of [-1, 1]) b.add(OK, new THREE.TorusGeometry(0.28, 0.07, 5, 12, Math.PI * 1.4), M(m, mat(s * 0.55, yD + 2.2, 0.28, 0, 0, s > 0 ? -0.4 : Math.PI + 0.4)))
  }
  // frieze band with swags, scroll panels and corner consoles
  const tw = hw - 1.05
  const y0 = 19.2
  b.block(OK, 2 * tw, 1.15, 2 * tw, cx, y0, cz)
  for (const [f, plane, u] of faces) {
    const pl = f === '+z' ? cz + tw : f === '-z' ? cz - tw : f === '+x' ? cx + tw : cx - tw
    const m = frame(f, pl, u)
    for (const s of [-1, 1]) {
      b.add(OK, metricBox(1.55, 0.42, 0.06), M(m, mat(s * 0.95, y0 + 0.72, 0.03)))
      for (let k = -1; k <= 1; k++) b.add(OK, new THREE.TorusGeometry(0.15, 0.04, 4, 10), M(m, mat(s * 0.95 + k * 0.42, y0 + 0.72, 0.08)))
      b.add(OK, new THREE.TorusGeometry(0.62, 0.09, 5, 12, Math.PI), M(m, mat(s * 0.95, y0 + 0.12, 0.1 + 0.15, 0, 0.18, Math.PI)))
    }
    b.add(OK, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), M(m, mat(0, y0 + 0.72, 0.06, 0, Math.PI / 2)))
    b.add(OK, new THREE.SphereGeometry(0.14, 8, 6), M(m, mat(0, y0 + 0.15, 0.25)))
    void plane
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = V(cx + sx * (tw + 0.12), 0, cz + sz * (tw + 0.12))
    const ry = Math.atan2(sx, sz)
    b.add(OK, metricBox(0.42, 1.25, 0.6), mat(p.x, y0 + 0.2, p.z, ry, 0.22))
    b.add(OK, new THREE.TorusGeometry(0.22, 0.09, 5, 12, Math.PI * 1.5), mat(p.x + sx * 0.1, y0 + 0.85, p.z + sz * 0.1, ry + Math.PI / 2))
  }
  // egg-and-dart cornice
  b.block(OK, 2 * tw + 0.35, 0.16, 2 * tw + 0.35, cx, y0 + 1.15, cz)
  b.block(OK, 2 * tw + 0.9, 0.36, 2 * tw + 0.9, cx, y0 + 1.31, cz)
  for (const [f, , u] of faces) {
    const pl = f === '+z' ? cz + tw + 0.45 : f === '-z' ? cz - tw - 0.45 : f === '+x' ? cx + tw + 0.45 : cx - tw - 0.45
    const m = frame(f, pl, u)
    for (let i = -5; i <= 5; i++) b.add(OK, new THREE.SphereGeometry(0.13, 8, 6), M(m, mat(i * 0.5, y0 + 1.42, 0.02, 0, 0, 0, 1, 1.25, 0.6)))
  }
  b.block(OK, 2 * tw + 1.1, 0.14, 2 * tw + 1.1, cx, y0 + 1.67, cz)
  // louvred lantern with a low hipped cap, lightning rod
  const yl = y0 + 1.81
  b.block(OK, 2 * tw - 0.3, 0.16, 2 * tw - 0.3, cx, yl, cz)
  b.block(OK, 3.3, 0.5, 3.3, cx, yl + 0.16, cz)
  for (const [f, , u] of faces) {
    const pl = f === '+z' ? cz + 1.65 : f === '-z' ? cz - 1.65 : f === '+x' ? cx + 1.65 : cx - 1.65
    const m = frame(f, pl, u)
    for (let i = -6; i <= 6; i++) b.add(OK, metricBox(0.06, 0.38, 0.05), M(m, mat(i * 0.24, yl + 0.41, 0.03)))
  }
  hippedRoof(b, OK, { x: cx, z: cz, w: 3.3, d: 3.3, y: yl + 0.66, pitch: 24, overhang: 0.15, seams: false })
  b.rod(OK, V(cx, yl + 1.3, cz), V(cx, yl + 3.6, cz), 0.06, 8)
  b.add(OK, new THREE.SphereGeometry(0.13, 10, 8), mat(cx, yl + 2.5, cz))
  b.add(OK, new THREE.CylinderGeometry(0.12, 0.16, 0.25, 10), mat(cx, yl + 1.45, cz))
}

function archOutline(w: number, h: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0)]
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * (w / 2), h - w / 2 + Math.sin(a) * (w / 2)))
  }
  return pts
}

/* ------------------------------------------------------------------ */
/* Dome pavilion                                                       */
/* ------------------------------------------------------------------ */

function domePavilion(b: Builder) {
  const cx = (DP.x0 + DP.x1) / 2
  const cz = (DP.z0 + DP.z1) / 2
  const hx = (DP.x1 - DP.x0) / 2
  const hz = (DP.z1 - DP.z0) / 2
  // projecting pavilion with pilasters and a raised attic
  b.block('gbStone', 2 * hx, 13.6, 2 * hz, cx, 0, cz)
  b.block('gbSocle', 2 * hx + 0.3, 1.0, 2 * hz + 0.3, cx, 0, cz)
  b.block('gbTrim', 2 * hx + 0.24, 0.42, 2 * hz + 0.24, cx, 4.9, cz)
  b.block('gbTrim', 2 * hx + 0.9, 0.42, 2 * hz + 0.9, cx, 11.6, cz)
  for (const u of [-3.2, -1.1, 1.1, 3.2]) b.block('gbTrim', 0.45, 13.4, 0.25, DP.x0 - 0.1, 0, cz + u)
  facadeBays(b, '-x', DP.x0, cz - 3.0, cz + 3.0, 2.2)
  b.block('gbTrim', 2 * hx + 0.3, 0.35, 2 * hz + 0.3, cx, 13.3, cz)
  // metal base cornice of the dome
  const y0 = 13.65
  b.block(OK, 2 * hx + 0.6, 0.3, 2 * hz + 0.6, cx, y0, cz)
  b.block(OK, 2 * hx + 0.9, 0.2, 2 * hz + 0.9, cx, y0 + 0.3, cz)
  // imperial dome: rounded-rectangle sections on a quarter-ellipse profile
  const yb = y0 + 0.5
  const H = 3.3
  const hl = 1.1 // lantern half width
  const steps = 10
  const rings: THREE.Vector3[][] = []
  const prof: [number, number, number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const ph = (i / steps) * (Math.PI / 2)
    const ax = hl + (hx + 0.1 - hl) * Math.cos(ph)
    const az = hl + (hz + 0.1 - hl) * Math.cos(ph)
    const rc = 0.25 + 0.9 * Math.cos(ph)
    const y = yb + H * Math.sin(ph)
    prof.push([ax, az, rc, y])
    rings.push(roundRect(ax, az, rc, y, cx, cz, 4))
  }
  b.add(ZK, loft(rings, {}))
  // beaded ribs: corners + two per long side, one per short side
  const ribAt = (fx: number, fz: number) => {
    for (let i = 0; i < steps; i++) {
      const [ax0, az0, , y0r] = prof[i]
      const [ax1, az1, , y1r] = prof[i + 1]
      b.rod(OK, V(cx + fx * (ax0 + 0.04), y0r, cz + fz * (az0 + 0.04)), V(cx + fx * (ax1 + 0.04), y1r, cz + fz * (az1 + 0.04)), 0.07, 6)
    }
  }
  for (const fz of [-0.62, -0.25, 0.25, 0.62]) {
    ribAt(-1, fz)
    ribAt(1, fz)
  }
  for (const fx of [-0.45, 0.45]) {
    ribAt(fx, -1)
    ribAt(fx, 1)
  }
  // ox-eye dormer on the front (−X)
  const yo = yb + 1.25
  const ph = Math.asin(1.25 / H)
  const xo = cx - (hl + (hx + 0.1 - hl) * Math.cos(ph))
  const m = mat(xo, 0, cz, -Math.PI / 2)
  b.add(OK, new THREE.CylinderGeometry(0.5, 0.55, 1.3, 16), M(m, mat(0, yo, 0.1, 0, Math.PI / 2)))
  b.add(OK, new THREE.TorusGeometry(0.52, 0.12, 6, 18), M(m, mat(0, yo, 0.78)))
  b.add('glassC', new THREE.CircleGeometry(0.4, 16), M(m, mat(0, yo, 0.76)))
  b.add(OK, new THREE.ConeGeometry(0.3, 0.7, 6), M(m, mat(0, yo + 0.85, 0.65)))
  // square lantern, bulb cap, spire
  const yt = yb + H
  b.block(OK, 2 * hl + 0.1, 0.9, 2 * hl + 0.1, cx, yt, cz)
  b.block(OK, 2 * hl + 0.6, 0.25, 2 * hl + 0.6, cx, yt + 0.9, cz)
  for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.add(OK, metricBox(fx ? 0.06 : 1.2, 0.45, fz ? 0.06 : 1.2), mat(cx + fx * (hl + 0.06), yt + 0.45, cz + fz * (hl + 0.06)))
  b.add(OK, lathe([[0.95, 0], [0.98, 0.15], [0.85, 0.45], [0.55, 0.75], [0.25, 0.95], [0.12, 1.1], [0.06, 1.3], [0.001, 1.35]], 16), mat(cx, yt + 1.15, cz))
  b.rod(OK, V(cx, yt + 2.4, cz), V(cx, yt + 5.6, cz), 0.05, 6)
}

function roundRect(ax: number, az: number, rc: number, y: number, cx: number, cz: number, seg: number) {
  const r = Math.min(rc, ax * 0.95, az * 0.95)
  const pts: THREE.Vector3[] = []
  const corners: [number, number, number][] = [
    [ax - r, -(az - r), -Math.PI / 2],
    [ax - r, az - r, 0],
    [-(ax - r), az - r, Math.PI / 2],
    [-(ax - r), -(az - r), Math.PI],
  ]
  for (const [ox, oz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      pts.push(V(cx + ox + Math.cos(a) * r, y, cz + oz + Math.sin(a) * r))
    }
  }
  return pts
}

/* ------------------------------------------------------------------ */

function build(): Builder {
  const b = new Builder()
  walls(b, A)
  walls(b, B)
  // modillion cornices on the street fronts
  modillions(b, V(A.x0 + 0.3, 0, A.z1), V(A.x1 - 0.3, 0, A.z1), V(0, 0, 1))
  modillions(b, V(A.x0, 0, B.z0 + 0.3), V(A.x0, 0, A.z1 - 0.3), V(-1, 0, 0))
  // façades
  facadeBays(b, '+z', A.z1, -7.8, 16.0) // front (Str. Polonă), tower excluded
  facadeBays(b, '-x', A.x0, -4.0, 5.8) // north, between tower and dome pavilion
  facadeBays(b, '-x', B.x0, -16.8, -14.4, 2.4)
  facadeBays(b, '-x', B.x0, -6.4, -4.0, 2.4)
  facadeBays(b, '+x', A.x1, -12.5, 4.0) // south
  facadeBays(b, '-z', B.z0, -5.5, 14.5) // east
  facadeBays(b, '+x', B.x1, 4.0, 16.8) // re-entrant faces
  facadeBays(b, '-z', A.z0, -16.0, -5.5)
  // tower windows
  for (const [f, plane, u] of [['+z', TW.z1, (TW.x0 + TW.x1) / 2], ['-x', TW.x0, (TW.z0 + TW.z1) / 2]] as [Face, number, number][]) facadeBays(b, f, plane, u - 1.7, u + 1.7, 3.4)
  // projecting front bay with balustraded terrace and urns
  const rb = { x0: 0.5, x1: 5.5, z: A.z1 + 1.3 }
  b.block('gbStone', rb.x1 - rb.x0, 12.0, 1.3, (rb.x0 + rb.x1) / 2, 0, A.z1 + 0.65)
  b.block('gbTrim', rb.x1 - rb.x0 + 0.24, 0.42, 1.54, (rb.x0 + rb.x1) / 2, 4.9, A.z1 + 0.65)
  b.block('gbTrim', rb.x1 - rb.x0 + 0.9, 0.42, 1.9, (rb.x0 + rb.x1) / 2, 11.6, A.z1 + 0.75)
  for (const x of [rb.x0 + 0.3, rb.x1 - 0.3]) b.block('gbTrim', 0.55, 11.4, 0.2, x, 0.2, rb.z + 0.08)
  window_(b, '+z', rb.z, 3.0, 1.0, { w: 1.9, h: 3.4, type: 'round', frame: 0.3, frameKey: 'gbTrim', glassKey: 'wood' })
  window_(b, '+z', rb.z, 3.0, 5.75, { w: 1.7, h: 3.0, type: 'round', frame: 0.26, frameKey: 'gbTrim', sill: true, bars: [2, 3] })
  window_(b, '+z', rb.z, 3.0, 9.55, { w: 1.5, h: 1.55, frame: 0.18, frameKey: 'gbTrim', sill: true, bars: [2, 2] })
  const ty = 12.02
  balustrade(b, V(rb.x0 + 0.35, ty, rb.z + 0.2), V(rb.x1 - 0.35, ty, rb.z + 0.2))
  for (const x of [rb.x0, rb.x1]) {
    b.block('gbTrim', 0.6, 1.15, 0.6, x + (x === rb.x0 ? 0.3 : -0.3), ty, rb.z + 0.2)
    urn(b, x + (x === rb.x0 ? 0.3 : -0.3), ty + 1.15, rb.z + 0.2)
  }
  // mansard roofs: tower → low link → tall front block → low south end; low north-east wing
  mansard(b, { x0: A.x0, x1: -4.0, z0: A.z0, z1: A.z1, rise: 3.8, pitch: 74, open: ['+x'] })
  const tall = mansard(b, { x0: -4.0, x1: 10.0, z0: A.z0, z1: A.z1, rise: 5.4, pitch: 76, frieze: 0.9 })
  mansard(b, { x0: 10.0, x1: A.x1, z0: A.z0, z1: A.z1, rise: 3.8, pitch: 74, open: ['-x'] })
  mansard(b, { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1, rise: 3.6, pitch: 73, open: ['+z'] })
  // dormers: ox-eyes on the tall block, stone dormers on the low sections
  const tIn = 1 / Math.tan(76 * D2R)
  for (const u of [-1.6, 7.6]) oxEye(b, frame('+z', A.z1, u), EAVE + 2.7, -2.7 * tIn)
  for (const x of [7.8]) oxEye(b, frame('-z', A.z0, -x), EAVE + 2.7, -2.7 * tIn)
  stoneDormer(b, M(frame('+z', A.z1, 3.0), mat(0, 0, -0.35)), EAVE - 0.6, true)
  for (const u of [12.9]) stoneDormer(b, M(frame('+z', A.z1, u), mat(0, 0, -0.3)), EAVE)
  stoneDormer(b, M(frame('-x', A.x0, -1.4), mat(0, 0, -0.3)), EAVE)
  stoneDormer(b, M(frame('+z', A.z1, -5.9), mat(0, 0, -0.3)), EAVE)
  for (const z of [2.0, 7.5]) stoneDormer(b, M(frame('+x', A.x1, -z), mat(0, 0, -0.3)), EAVE) // '+x': u = −z
  for (const x of [-10.0, -4.0, 2.0]) stoneDormer(b, M(frame('-z', B.z0, -x), mat(0, 0, -0.3)), EAVE) // '-z': u = −x
  for (const u of [-15.6, -5.0]) oxEye(b, frame('-x', B.x0, u), EAVE + 1.7, -0.5)
  void tall
  tower(b)
  domePavilion(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-11.3, 16.0, 12.25],
  materials: () => ({
    gbOrn: new THREE.MeshStandardMaterial({ color: '#73766b', metalness: 0.55, roughness: 0.5 }),
    gbStone: new THREE.MeshStandardMaterial({ color: '#ddd1b3', roughness: 0.86 }),
    gbTrim: new THREE.MeshStandardMaterial({ color: '#e9e0c9', roughness: 0.8 }),
    gbSocle: new THREE.MeshStandardMaterial({ color: '#cbbd9c', roughness: 0.9 }),
    gbFlat: new THREE.MeshStandardMaterial({ color: '#6f7268', metalness: 0.4, roughness: 0.6 }),
  }),
  notes: 'elZinc Oliva mansards, corner tower and dome pavilion interpreted from roof-level photographs; plan and elevations not photographed (location probable).',
}
export default model
