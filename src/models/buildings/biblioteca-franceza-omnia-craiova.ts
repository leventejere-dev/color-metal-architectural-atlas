/**
 * Casa Ionel Pleșia – Biblioteca Franceză „Omnia”, Craiova — Str. Mihail
 * Kogălniceanu 21, OSM way 240011869 (coarse rectangle 23.5 × 18.5 m, 79.3°).
 *
 * Modelling specification (real metres, +X = OSM long axis (≈ ENE), +Z = the
 * long south street façade, −X = west façade with the entrance; photos 01–03,
 * 03 = May 2025 after the restoration):
 *  - French neo-baroque two-storey house on a raised basement: main block
 *    22.3 × 18.5 m; a square corner pavilion (6.2 × 7.0 m) at the south-west
 *    corner projecting 1.2 m to the west, carrying the entrance with its cast-iron
 *    marquise, an upper-floor loggia with two columns and a segmental crest.
 *  - Heights (estimated): plinth 1.3 m, ground floor to the balustraded band at
 *    ≈ 6.0 m, upper floor with round-arched windows to the bracketed cornice at
 *    11.0 m; mansard to ≈ 14.2 m (steep 72° lower slopes with oval ox-eye dormers
 *    and one pedimented dormer, low upper hip with cresting); pavilion attic to
 *    12.6 m and a tall truncated-pyramid roof to ≈ 17.6 m with an ornate cresting
 *    and two finials.
 *  - South façade: 9 window axes beyond the pavilion, pilaster strips, a
 *    balcony on consoles over two axes, terracotta-coloured brackets, keystones
 *    and capitals (photo 03).
 * METAL: photo 03 (May 2025) shows the renewed light-grey metal roof with
 *   shingle (diamond) cladding on the pavilion and the mansard, metal-clad dormers,
 *   cresting and finials — modelled as photographed in natural titanium-zinc, the
 *   material supplied by COLOR METAL according to its records (2023). Shingle
 *   courses are suggested by fine horizontal ribs; the low upper hip has seams.
 * Approximations: the OSM outline is a coarse rectangle, so the pavilion
 * projection and the rear wings are estimated; north and east elevations are not
 * photographed (regular window axes assumed); ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, seams, faceFrame, hipRoof, truncatedHip, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ROOF = 'zincNatural'

const MAIN = { x0: -10.55, x1: 11.75, z0: -9.25, z1: 9.25 }
const PAV = { x0: -11.75, x1: -5.55, z0: 2.55, z1: 9.55 }
const PLINTH = 1.3
const BAND = 6.0
const CORN = 11.0
const LOW = { pitch: 72, rise: 3.0, upper: 9 }

/** Horizontal shingle courses on a planar (convex) roof face. */
function courses(b: Builder, pts: THREE.Vector3[], step: number, key = ROOF) {
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.y < 0) n.negate()
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of pts) {
    y0 = Math.min(y0, p.y)
    y1 = Math.max(y1, p.y)
  }
  for (let y = y0 + step; y < y1 - step * 0.3; y += step) {
    const hits: THREE.Vector3[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if ((a.y - y) * (c.y - y) < 0) hits.push(a.clone().lerp(c, (y - a.y) / (c.y - a.y)))
    }
    if (hits.length < 2) continue
    const off = n.clone().multiplyScalar(0.03)
    b.beam(key, hits[0].clone().add(off), hits[1].clone().add(off), 0.035, 0.05, n)
  }
}

/** Window with stucco surround, brown frame, sill, terracotta keystone. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, arched: boolean) {
  const m = faceFrame(face, plane, u, 0, 0)
  const r = w / 2
  const sh = new THREE.Shape()
  sh.moveTo(-r, y0)
  sh.lineTo(r, y0)
  if (arched) {
    sh.lineTo(r, y0 + h - r)
    sh.absarc(0, y0 + h - r, r, 0, Math.PI, false)
  } else {
    sh.lineTo(r, y0 + h)
    sh.lineTo(-r, y0 + h)
  }
  sh.lineTo(-r, y0)
  b.add('glassC', new THREE.ShapeGeometry(sh, 10), M(m, mat(0, 0, 0.02)))
  // surround
  const f = 0.22
  const o = new THREE.Shape()
  o.moveTo(-r - f, y0 - 0.05)
  o.lineTo(r + f, y0 - 0.05)
  if (arched) {
    o.lineTo(r + f, y0 + h - r)
    o.absarc(0, y0 + h - r, r + f, 0, Math.PI, false)
  } else {
    o.lineTo(r + f, y0 + h + f)
    o.lineTo(-r - f, y0 + h + f)
  }
  o.lineTo(-r - f, y0 - 0.05)
  o.holes.push(new THREE.Path(sh.getPoints(10)))
  b.add('omStucco', extrude(o, 0.12, 10), m)
  // brown frame bars
  b.add('omFrame', metricBox(0.07, h * 0.92, 0.06), M(m, mat(0, y0 + h * 0.46, 0.05)))
  b.add('omFrame', metricBox(w, 0.07, 0.06), M(m, mat(0, y0 + h * (arched ? 0.62 : 0.7), 0.05)))
  // sill and keystone
  b.add('omStucco', metricBox(w + 0.6, 0.12, 0.26), M(m, mat(0, y0 - 0.1, 0.12)))
  b.add('omOrn', metricBox(0.32, 0.42, 0.2), M(m, mat(0, y0 + h + (arched ? 0.05 : 0.15), 0.12)))
}

/** Oval ox-eye dormer on a roof slope (p on the slope, n outward horizontal direction). */
function oxEye(b: Builder, p: THREE.Vector3, ry: number) {
  const m = mat(p.x, p.y, p.z, ry)
  b.add(ROOF, new THREE.CylinderGeometry(0.62, 0.62, 1.1, 18, 1, false, -Math.PI / 2, Math.PI), M(m, mat(0, 0.15, 0.1, 0, Math.PI / 2, 0, 1, 1, 1)))
  b.add('omStucco', new THREE.TorusGeometry(0.5, 0.11, 6, 18), M(m, mat(0, 0, 0.65, 0, 0, 0, 0.85, 1.15, 1)))
  b.add('glassC', new THREE.CircleGeometry(0.42, 18), M(m, mat(0, 0, 0.6, 0, 0, 0, 0.85, 1.15, 1)))
  b.add('omStucco', metricBox(1.2, 0.95, 0.5), M(m, mat(0, -0.45, 0.35)))
  b.add(ROOF, new THREE.SphereGeometry(0.14, 8, 6), M(m, mat(0, 0.92, 0.45)))
}

/** Balustrade panel (band of short balusters) between two points. */
function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 0.9) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / 0.24))
  b.beam('omStucco', a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.3, 0.12)
  b.beam('omStucco', a.clone().setY(a.y + h - 0.08), c.clone().setY(c.y + h - 0.08), 0.32, 0.14)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add('omOrn', new THREE.CylinderGeometry(0.06, 0.08, h - 0.2, 6), mat(p.x, p.y + h / 2, p.z))
  }
}

function walls(b: Builder, x0: number, x1: number, z0: number, z1: number, top: number) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  b.block('omWall', w, top, d, cx, 0, cz)
  b.block('omSocle', w + 0.14, PLINTH, d + 0.14, cx, 0, cz)
  // rusticated ground-floor courses
  for (let y = PLINTH + 0.55; y < BAND - 0.4; y += 0.55) b.block('omWall', w + 0.08, 0.06, d + 0.08, cx, y, cz)
  // band with balustrade panels under the upper windows
  b.block('omStucco', w + 0.3, 0.32, d + 0.3, cx, BAND - 0.6, cz)
  b.block('omStucco', w + 0.18, 0.2, d + 0.18, cx, BAND + 0.45, cz)
  // entablature: architrave, frieze, bracketed cornice
  b.block('omStucco', w + 0.14, 0.25, d + 0.14, cx, CORN - 1.05, cz)
  b.block('omStucco', w + 0.6, 0.22, d + 0.6, cx, CORN - 0.32, cz)
  b.block('omStucco', w + 0.9, 0.18, d + 0.9, cx, CORN - 0.12, cz)
  b.block(ROOF, w + 0.94, 0.04, d + 0.94, cx, CORN + 0.06, cz)
  // terracotta brackets under the cornice
  const bracket = (x: number, z: number, ry: number) => b.add('omOrn', metricBox(0.16, 0.45, 0.42), mat(x, CORN - 0.55, z, ry))
  for (let x = x0 + 0.4; x <= x1 - 0.3; x += 0.75) {
    bracket(x, z1 + 0.2, 0)
    bracket(x, z0 - 0.2, 0)
  }
  for (let z = z0 + 0.4; z <= z1 - 0.3; z += 0.75) {
    bracket(x0 - 0.2, z, Math.PI / 2)
    bracket(x1 + 0.2, z, Math.PI / 2)
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= main block ================= */
  walls(b, MAIN.x0, MAIN.x1, MAIN.z0, MAIN.z1, CORN)
  // pilaster strips on the south façade
  for (const x of [-5.3, -0.65, 3.3, 9.0, 11.55]) b.block('omStucco', 0.55, BAND - PLINTH - 0.6, 0.12, x, PLINTH, MAIN.z1 + 0.06)
  for (const x of [-5.3, -0.65, 3.3, 9.0, 11.55]) b.block('omStucco', 0.5, CORN - BAND - 1.6, 0.14, x, BAND + 0.6, MAIN.z1 + 0.07)

  /* ---- south façade: 9 axes ---- */
  const axesS = Array.from({ length: 9 }, (_, i) => -4.45 + i * 1.95)
  for (const x of axesS) {
    win(b, '+z', MAIN.z1, x, PLINTH + 0.75, 1.2, 2.75, false)
    win(b, '+z', MAIN.z1, x, BAND + 0.85, 1.15, 3.0, true)
    // balustrade panel under the upper window
    balustrade(b, V(x - 0.7, BAND - 0.25, MAIN.z1 + 0.12), V(x + 0.7, BAND - 0.25, MAIN.z1 + 0.12), 0.55)
  }
  // balcony on consoles over axes 5–6
  {
    const xa = (axesS[5] + axesS[6]) / 2
    b.block('omStucco', 4.3, 0.28, 1.0, xa, BAND + 0.25, MAIN.z1 + 0.5)
    for (const dx of [-1.6, 0, 1.6]) b.add('omOrn', metricBox(0.3, 0.6, 0.8), mat(xa + dx, BAND - 0.08, MAIN.z1 + 0.42))
    balustrade(b, V(xa - 2.1, BAND + 0.53, MAIN.z1 + 0.95), V(xa + 2.1, BAND + 0.53, MAIN.z1 + 0.95), 0.95)
  }
  // north façade (not photographed): regular axes
  for (let i = 0; i < 10; i++) {
    const x = -9.0 + i * 2.25
    win(b, '-z', MAIN.z0, -x, PLINTH + 0.75, 1.15, 2.7, false)
    win(b, '-z', MAIN.z0, -x, BAND + 0.85, 1.1, 2.9, true)
  }
  // east façade
  for (let i = 0; i < 7; i++) {
    const z = -7.0 + i * 2.35
    win(b, '+x', MAIN.x1, -z, PLINTH + 0.75, 1.15, 2.7, false)
    win(b, '+x', MAIN.x1, -z, BAND + 0.85, 1.1, 2.9, true)
  }
  // west façade north of the pavilion: 3 axes, curved balcony on the middle one (photo 02)
  for (const z of [-6.8, -3.4, -0.1]) {
    win(b, '-x', MAIN.x0, z, PLINTH + 0.75, 1.15, 2.7, false)
    win(b, '-x', MAIN.x0, z, BAND + 0.85, 1.15, 3.0, true)
  }
  {
    const z = -0.1
    const g = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 20, 1, false, Math.PI, Math.PI)
    b.add('omStucco', g, mat(MAIN.x0, BAND + 0.4, z, 0, 0, 0, 0.6, 1, 1))
    b.add('omOrn', new THREE.CylinderGeometry(1.2, 0.3, 0.7, 16, 1, false, Math.PI, Math.PI), mat(MAIN.x0, BAND - 0.1, z, 0, 0, 0, 0.6, 1, 1))
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI + (k / 10) * Math.PI
      b.add('omStucco', new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), mat(MAIN.x0 + Math.sin(a) * 1.35 * 0.6, BAND + 0.9, z + Math.cos(a) * 1.35))
    }
    b.add('omStucco', new THREE.TorusGeometry(1.4, 0.08, 4, 20, Math.PI), mat(MAIN.x0, BAND + 1.28, z, Math.PI / 2, Math.PI / 2, 0, 1, 0.6, 1))
  }

  /* ================= corner pavilion ================= */
  const PT = CORN + 1.6 // top of the pavilion attic
  {
    walls(b, PAV.x0, PAV.x1, PAV.z0, PAV.z1, PT)
    b.block('omStucco', PAV.x1 - PAV.x0 + 0.3, 0.25, PAV.z1 - PAV.z0 + 0.3, (PAV.x0 + PAV.x1) / 2, PT - 0.25, (PAV.z0 + PAV.z1) / 2)
    // quoin pilasters
    for (const [x, z] of [
      [PAV.x0, PAV.z1],
      [PAV.x1, PAV.z1],
      [PAV.x0, PAV.z0],
    ]) b.block('omStucco', 0.7, PT - PLINTH - 0.4, 0.7, x, PLINTH, z)
    // south face: window + curved balcony upper floor, window below
    const cx = (PAV.x0 + PAV.x1) / 2
    win(b, '+z', PAV.z1, cx, PLINTH + 0.75, 1.3, 2.75, false)
    win(b, '+z', PAV.z1, cx, BAND + 0.85, 1.3, 3.1, true)
    b.add('omStucco', new THREE.CylinderGeometry(1.6, 1.6, 0.3, 20, 1, false, -Math.PI / 2, Math.PI), mat(cx, BAND + 0.4, PAV.z1, 0, 0, 0, 1, 1, 0.55))
    b.add('omOrn', new THREE.CylinderGeometry(1.3, 0.3, 0.7, 16, 1, false, -Math.PI / 2, Math.PI), mat(cx, BAND - 0.1, PAV.z1, 0, 0, 0, 1, 1, 0.55))
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI
      b.add('omStucco', new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), mat(cx + Math.sin(a) * 1.45, BAND + 0.9, PAV.z1 + Math.cos(a) * 1.45 * 0.55))
    }
    // west face: entrance + marquise, loggia with two columns, segmental crest
    const zc = (PAV.z0 + PAV.z1) / 2
    const fm = faceFrame('-x', PAV.x0, zc, 0, 0)
    b.add('omFrame', metricBox(1.6, 3.0, 0.05), M(fm, mat(0, PLINTH + 1.5, 0.03)))
    b.add('omStucco', metricBox(2.2, 0.35, 0.25), M(fm, mat(0, PLINTH + 3.2, 0.12)))
    // cast-iron & glass marquise
    b.add('omIron', metricBox(4.2, 0.08, 2.3), M(fm, mat(0, PLINTH + 3.7, 1.15)))
    b.add('glassG', metricBox(4.0, 0.03, 2.1), M(fm, mat(0, PLINTH + 3.76, 1.15)))
    for (const du of [-1.9, 1.9]) b.add('omIron', new THREE.CylinderGeometry(0.06, 0.06, PLINTH + 3.7, 8), M(fm, mat(du, (PLINTH + 3.7) / 2, 2.2)))
    // steps
    b.add('omSocle', metricBox(3.2, PLINTH, 1.6), M(fm, mat(0, PLINTH / 2, 0.8)))
    // loggia: dark recess, two columns, balustrade
    b.add('glassC', metricBox(3.6, 3.6, 0.05), M(fm, mat(0, BAND + 0.6 + 1.8, 0.02)))
    for (const du of [-1.0, 1.0]) {
      b.add('omStucco', new THREE.CylinderGeometry(0.24, 0.27, 3.5, 16), M(fm, mat(du, BAND + 0.55 + 1.75, 0.3)))
      b.add('omOrn', metricBox(0.66, 0.35, 0.66), M(fm, mat(du, BAND + 4.2, 0.3)))
    }
    for (const du of [-2.15, 2.15]) b.add('omStucco', metricBox(1.0, 3.9, 0.3), M(fm, mat(du, BAND + 0.55 + 1.95, 0.15)))
    balustrade(b, V(PAV.x0 - 0.3, BAND + 0.5, zc - 1.8), V(PAV.x0 - 0.3, BAND + 0.5, zc + 1.8), 0.9)
    // segmental crest with cartouche above the cornice
    const cr = new THREE.Shape()
    cr.moveTo(-2.6, 0)
    cr.lineTo(2.6, 0)
    cr.lineTo(2.6, 0.5)
    cr.absarc(0, -2.2, 3.7, Math.asin(2.7 / 3.7) - 0.02, Math.PI - Math.asin(2.7 / 3.7) + 0.02, false)
    cr.lineTo(-2.6, 0)
    b.add('omStucco', extrude(cr, 0.45, 16), M(fm, mat(0, PT - 0.1, -0.2)))
    b.add('omOrn', new THREE.SphereGeometry(0.55, 14, 10), M(fm, mat(0, PT + 0.75, 0.25, 0, 0, 0, 1.0, 1.25, 0.4)))
  }

  /* ================= roofs (natural titanium-zinc) ================= */
  // main mansard
  {
    const ov = 0.35
    const t = Math.tan(LOW.pitch * D2R)
    const w = MAIN.x1 - MAIN.x0 + 2 * ov
    const d = MAIN.z1 - MAIN.z0 + 2 * ov
    const cx = (MAIN.x0 + MAIN.x1) / 2
    const y0 = CORN + 0.1 - ov * t * 0.25
    const low = truncatedHip(cx, 0, w, d, y0, LOW.pitch * D2R, LOW.rise)
    for (const f of low.facets) {
      facet(b, ROOF, f, { thickness: 0.1 })
      courses(b, f, 0.42)
    }
    for (const [a, c] of low.lines) b.beam(ROOF, a, c, 0.16, 0.12)
    const up = hipRoof(cx, 0, low.curb.w, low.curb.d, low.curb.y, LOW.upper * D2R)
    for (const f of up.facets) facet(b, ROOF, f, { seams: seams(ROOF, 0.55, 0.04, 0.04) })
    for (const [a, c] of up.lines) b.beam(ROOF, a, c, 0.16, 0.1)
    // curb moulding and cresting along the curb
    const c = low.corners
    for (let i = 0; i < 4; i++) {
      b.beam(ROOF, c[i].clone().setY(c[i].y + 0.08), c[(i + 1) % 4].clone().setY(c[i].y + 0.08), 0.22, 0.2)
      const A = c[i]
      const C = c[(i + 1) % 4]
      const L = A.distanceTo(C)
      const n = Math.floor(L / 0.5)
      b.beam('omIron', A.clone().setY(A.y + 0.55), C.clone().setY(C.y + 0.55), 0.04, 0.04)
      for (let k = 0; k <= n; k++) {
        const p = A.clone().lerp(C, k / n)
        b.rod('omIron', p.clone().setY(p.y + 0.15), p.clone().setY(p.y + (k % 2 ? 0.5 : 0.7)), 0.02, 4)
      }
    }
    // gutters
    const e = [V(cx - w / 2, y0, -d / 2), V(cx + w / 2, y0, -d / 2), V(cx + w / 2, y0, d / 2), V(cx - w / 2, y0, d / 2)]
    for (let i = 0; i < 4; i++) b.beam(ROOF, e[i].clone().setY(y0 - 0.06), e[(i + 1) % 4].clone().setY(y0 - 0.06), 0.2, 0.2)
    // dormers: ox-eyes on the lower slopes
    const inset = (yy: number) => (yy - y0) / t
    const yD = y0 + 1.25
    const r = inset(yD)
    for (const x of axesS) if (x !== axesS[6]) oxEye(b, V(x, yD, d / 2 - r + 0.15), 0)
    for (let i = 0; i < 10; i += 1) if (i % 1 === 0) oxEye(b, V(-9.0 + i * 2.25, yD, -d / 2 + r - 0.15), Math.PI)
    for (let i = 0; i < 7; i += 2) oxEye(b, V(cx + w / 2 - r + 0.15, yD, -7.0 + i * 2.35), Math.PI / 2)
    for (const z of [-6.8, -3.4]) oxEye(b, V(cx - w / 2 + r - 0.15, yD, z), -Math.PI / 2)
    // pedimented dormer over the balcony (photo 03)
    {
      const x = axesS[6] - 0.95
      const z = d / 2 - inset(y0 + 0.3)
      b.block('omStucco', 1.9, 2.5, 1.6, x, y0 + 0.2, z - 0.5)
      b.add('glassC', metricBox(1.0, 1.6, 0.04), mat(x, y0 + 1.25, z + 0.32))
      const p = new THREE.Shape([new THREE.Vector2(-1.15, 0), new THREE.Vector2(1.15, 0), new THREE.Vector2(0, 0.9)])
      b.add('omStucco', extrude(p, 0.3), mat(x, y0 + 2.7, z + 0.05))
      facet(b, ROOF, [V(x - 1.15, y0 + 2.75, z + 0.35), V(x - 1.15, y0 + 2.75, z - 1.6), V(x, y0 + 3.6, z - 1.6), V(x, y0 + 3.6, z + 0.35)], { thickness: 0.06 })
      facet(b, ROOF, [V(x + 1.15, y0 + 2.75, z - 1.6), V(x + 1.15, y0 + 2.75, z + 0.35), V(x, y0 + 3.6, z + 0.35), V(x, y0 + 3.6, z - 1.6)], { thickness: 0.06 })
    }
  }
  // pavilion roof: tall truncated pyramid with shingle courses, cresting, finials
  {
    const cx = (PAV.x0 + PAV.x1) / 2
    const cz = (PAV.z0 + PAV.z1) / 2
    const w = PAV.x1 - PAV.x0 + 0.5
    const d = PAV.z1 - PAV.z0 + 0.5
    const y0 = PT + 0.05
    const rise = 5.0
    const pr = truncatedHip(cx, cz, w, d, y0, 73 * D2R, rise)
    for (const f of pr.facets) {
      facet(b, ROOF, f, { thickness: 0.1 })
      courses(b, f, 0.36)
    }
    for (const [a, c] of pr.lines) b.beam(ROOF, a, c, 0.18, 0.14)
    b.block(ROOF, pr.curb.w + 0.2, 0.25, pr.curb.d + 0.2, cx, pr.curb.y, cz)
    // gutter
    for (const s of [-1, 1]) {
      b.beam(ROOF, V(cx - w / 2, y0 - 0.05, cz + (s * d) / 2), V(cx + w / 2, y0 - 0.05, cz + (s * d) / 2), 0.2, 0.2)
      b.beam(ROOF, V(cx + (s * w) / 2, y0 - 0.05, cz - d / 2), V(cx + (s * w) / 2, y0 - 0.05, cz + d / 2), 0.2, 0.2)
    }
    // ornate cresting around the flat top
    const yt = pr.curb.y + 0.25
    const c = pr.corners
    for (let i = 0; i < 4; i++) {
      const A = c[i].clone().setY(yt)
      const C = c[(i + 1) % 4].clone().setY(yt)
      b.beam('omIron', A.clone().setY(yt + 0.75), C.clone().setY(yt + 0.75), 0.05, 0.05)
      const n = Math.floor(A.distanceTo(C) / 0.32)
      for (let k = 0; k <= n; k++) {
        const p = A.clone().lerp(C, k / n)
        b.rod('omIron', p, p.clone().setY(yt + (k % 2 ? 0.75 : 0.95)), 0.022, 4)
      }
      for (let k = 0; k < n; k += 2) {
        const p = A.clone().lerp(C, (k + 0.5) / n)
        b.add('omIron', new THREE.TorusGeometry(0.13, 0.02, 4, 10), mat(p.x, yt + 0.4, p.z, i % 2 ? Math.PI / 2 : 0))
      }
      // corner posts
      b.add(ROOF, new THREE.CylinderGeometry(0.1, 0.14, 1.0, 8), mat(A.x, yt + 0.5, A.z))
      b.add(ROOF, new THREE.SphereGeometry(0.15, 8, 6), mat(A.x, yt + 1.05, A.z))
    }
    // two tall finials (photo 02)
    for (const s of [-1, 1]) {
      const p = V(cx - 0.6, yt, cz + s * 0.9)
      const prof: [number, number][] = [
        [0.22, 0],
        [0.15, 0.3],
        [0.28, 0.6],
        [0.18, 0.95],
        [0.1, 1.2],
        [0.16, 1.45],
        [0.06, 1.7],
        [0.03, 2.8],
        [0.0, 3.0],
      ]
      b.add(ROOF, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10), mat(p.x, p.y, p.z))
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-8.6, 14.5, 6],
  materials: () => ({
    omWall: new THREE.MeshStandardMaterial({ color: '#e6d8b8', roughness: 0.9 }),
    omStucco: new THREE.MeshStandardMaterial({ color: '#f0e7d2', roughness: 0.85 }),
    omSocle: new THREE.MeshStandardMaterial({ color: '#d6c8a8', roughness: 0.9 }),
    omOrn: new THREE.MeshStandardMaterial({ color: '#b0603f', roughness: 0.85 }),
    omFrame: new THREE.MeshStandardMaterial({ color: '#6a4630', roughness: 0.7 }),
    omIron: new THREE.MeshStandardMaterial({ color: '#2f3134', roughness: 0.5, metalness: 0.5 }),
  }),
  notes:
    'French neo-baroque house with a mansard roof, oval ox-eye dormers and a tall corner pavilion roof with cresting; roof modelled as photographed after the 2025 restoration in natural titanium-zinc; ornament simplified.',
}
export default model
