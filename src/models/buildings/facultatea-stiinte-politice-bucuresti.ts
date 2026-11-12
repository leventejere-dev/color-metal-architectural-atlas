/**
 * Facultatea de Științe Politice, Universitatea din București — Casa P.P.
 * Negulescu, Str. Spiru Haret 8 (OSM way 186600911, “Sediul FSPUB”).
 *
 * Identification: the photographed villa matches the OSM outline of Spiru
 * Haret 8 — its street risalit (≈ 7.1 m wide, ≈ 2.7 m deep) and the shallower
 * porch to its right (≈ 1.4 m) are the two projections on the west side of the
 * outline, which faces Str. Spiru Haret; an aerial view shows a light
 * grey-green hipped metal roof with a flat raised block on that side.
 *
 * Modelling specification derived from the reference photographs (real metres):
 *  - Cream neoclassical villa of two tall storeys on a plinth, near-square main
 *    block (≈ 19 × 17 m). Street front (−X, photos 01, 05, 06): the projecting
 *    risalit with a Serliana-like group (arched window between two rectangular
 *    ones, small balustraded balcony) above three tall ground-floor windows,
 *    crowned by a plain raised attic block; to its right a pedimented window
 *    and a long balustraded balcony carried by an Ionic porch; to its left a
 *    window bay with a small balcony. Pilaster strips at the corners, belt
 *    course at first-floor level, deep modillion cornice (photos 02–04) capped
 *    by dark metal flashing and box gutters.
 *  - Further outline projections modelled as a one-storey south bay with a
 *    lean-to roof (lower volume at the right edge of photo 05), a one-storey
 *    canted east bay and a full-height rear (north) risalit.
 *  - Roof — elZinc® Oliva (pre-weathered olive-grey titanium-zinc): a low
 *    (≈ 12°) hipped standing-seam roof over the main block, almost a pyramid
 *    (only a thin band shows behind the cornice in photos 05–08), zinc cover
 *    and coping of the attic block, small zinc roofs over the one-storey bays,
 *    lightning-rod mast with guy wires.
 * Approximations: north, east and south elevations are not photographed —
 * window rhythm repeated; attic depth, storey heights and roof pitch estimated;
 * balusters, capitals and mouldings simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, faceFrame, lathe, window_, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

type P3 = THREE.Vector3
const D2R = Math.PI / 180

/* ---------------- dimensions ---------------- */
const MX0 = -9.8 // west (street) wall of the main block
const MX1 = 9.35
const MZ0 = -8.0
const MZ1 = 8.9
const WR = { x0: -12.5, z0: -3.3, z1: 3.8 } // street risalit (with attic)
const PORCH = { x0: -11.2, z1: 8.7 } // Ionic porch + balcony
const NR = { x0: -4.0, x1: 4.0, z0: -10.0 } // rear risalit
const SB = { x0: -4.8, x1: 2.4, z1: 10.0 } // one-storey south bay
const E = 12.2 // top of the main cornice = roof eave
const FL1 = 6.2 // first-floor level
const ATTIC = 14.75
const CP = 0.78 // cornice projection
const ROOF = 'zincOliva'
const SEAM = seams(ROOF, 0.5, 0.045, 0.04)
const WALL = 'fspWall'
const TRIM = 'fspTrim'
const DARK = 'fspDark'

/* ---------------- helpers ---------------- */
const uOf = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** Profiled band around a closed outline (XZ points). proj = projection beyond the wall, y0/h = vertical extent. */
function band(b: Builder, key: string, outline: [number, number][], y0: number, h: number, proj: number) {
  let area = 0
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i]
    const [x2, z2] = outline[(i + 1) % outline.length]
    area += x1 * z2 - x2 * z1
  }
  const sgn = area > 0 ? -1 : 1
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i]
    const [x2, z2] = outline[(i + 1) % outline.length]
    const L = Math.hypot(x2 - x1, z2 - z1)
    const dx = (x2 - x1) / L
    const dz = (z2 - z1) / L
    const nx = sgn * dz
    const nz = -sgn * dx
    const cx = (x1 + x2) / 2 + (nx * proj) / 2
    const cz = (z1 + z2) / 2 + (nz * proj) / 2
    const ry = Math.atan2(dx, dz) - Math.PI / 2
    b.add(key, metricBox(L + 2 * proj, h, proj + 0.02), mat(cx - nx * 0.01, y0 + h / 2, cz - nz * 0.01, ry))
  }
}

/** Modillions (small brackets) along an outline. */
function modillions(b: Builder, outline: [number, number][], y: number, proj: number, step = 0.55) {
  let area = 0
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i]
    const [x2, z2] = outline[(i + 1) % outline.length]
    area += x1 * z2 - x2 * z1
  }
  const sgn = area > 0 ? -1 : 1
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i]
    const [x2, z2] = outline[(i + 1) % outline.length]
    const L = Math.hypot(x2 - x1, z2 - z1)
    const dx = (x2 - x1) / L
    const dz = (z2 - z1) / L
    const nx = sgn * dz
    const nz = -sgn * dx
    const ry = Math.atan2(dx, dz) - Math.PI / 2
    const n = Math.floor((L - 0.3) / step)
    for (let k = 0; k <= n; k++) {
      const t = (L - n * step) / 2 + k * step
      b.add(TRIM, metricBox(0.16, 0.2, proj), mat(x1 + dx * t + (nx * proj) / 2, y, z1 + dz * t + (nz * proj) / 2, ry))
    }
  }
}

function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: 'rect' | 'round' = 'rect', hood = false) {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.08, frameKey: 'wood', glassKey: 'glassC', inset: 0.06, bars: [2, type === 'round' ? 3 : 4] })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(TRIM, extrude(frameShape(type, w, h, 0.17, 0, y0), 0.08), M(m, mat(0, 0, 0.01)))
  b.add(TRIM, metricBox(w + 0.5, 0.12, 0.2), M(m, mat(0, y0 - 0.2, 0.1)))
  if (hood) {
    // entablature hood with consoles and cornice
    b.add(TRIM, metricBox(w + 0.6, 0.35, 0.14), M(m, mat(0, y0 + h + 0.4, 0.07)))
    b.add(TRIM, metricBox(w + 1.0, 0.14, 0.34), M(m, mat(0, y0 + h + 0.64, 0.17)))
    for (const s of [-1, 1]) b.add(TRIM, metricBox(0.16, 0.55, 0.22), M(m, mat(s * (w / 2 + 0.22), y0 + h + 0.3, 0.11)))
  }
}

/** Balustrade between two points at height y (rail on top). */
function balustrade(b: Builder, a: P3, c: P3, h = 0.95, step = 0.24) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / step))
  const prof: [number, number][] = [
    [0.0, 0],
    [0.07, 0],
    [0.07, 0.08],
    [0.045, 0.14],
    [0.085, 0.36],
    [0.05, 0.52],
    [0.06, 0.6],
    [0.0, 0.6],
  ]
  const g = lathe(prof.map(([r, y]) => [r, (y * (h - 0.28)) / 0.6]), 6)
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add(TRIM, g, mat(p.x, p.y + 0.12, p.z))
  }
  b.beam(TRIM, a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.3, 0.12)
  b.beam(TRIM, a.clone().setY(a.y + h - 0.08), c.clone().setY(c.y + h - 0.08), 0.32, 0.16)
  for (const p of [a, c]) b.block(TRIM, 0.34, h + 0.02, 0.34, p.x, p.y, p.z)
}

function ionic(b: Builder, x: number, z: number, y0: number, h: number) {
  b.add(TRIM, new THREE.CylinderGeometry(0.2, 0.24, h - 0.55, 14), mat(x, y0 + 0.3 + (h - 0.55) / 2, z))
  b.block(TRIM, 0.6, 0.3, 0.6, x, y0, z)
  b.block(TRIM, 0.58, 0.12, 0.42, x, y0 + h - 0.25, z)
  b.add(TRIM, new THREE.CylinderGeometry(0.09, 0.09, 0.62, 8), mat(x, y0 + h - 0.2, z + 0.16, 0, 0, Math.PI / 2))
  b.block(TRIM, 0.62, 0.1, 0.62, x, y0 + h - 0.1, z)
}

/* ---------------- model ---------------- */

function build(): Builder {
  const b = new Builder()
  const top = E - 0.75
  const hA = FL1 + 0.3 // one-storey annexes

  /* ---------- masses ---------- */
  const outline: [number, number][] = [
    [MX0, MZ0],
    [NR.x0, MZ0],
    [NR.x0, NR.z0],
    [NR.x1, NR.z0],
    [NR.x1, MZ0],
    [MX1, MZ0],
    [MX1, MZ1],
    [MX0, MZ1],
    [MX0, WR.z1],
    [WR.x0, WR.z1],
    [WR.x0, WR.z0],
    [MX0, WR.z0],
  ]
  b.block(WALL, MX1 - MX0, top, MZ1 - MZ0, (MX0 + MX1) / 2, 0, (MZ0 + MZ1) / 2)
  b.block(WALL, MX0 - WR.x0 + 0.2, top, WR.z1 - WR.z0, (WR.x0 + MX0 + 0.2) / 2, 0, (WR.z0 + WR.z1) / 2)
  b.block(WALL, NR.x1 - NR.x0, top, MZ0 - NR.z0 + 0.2, 0, 0, (NR.z0 + MZ0 + 0.2) / 2)
  // plinth, belt course, architrave, frieze, cornice (modillions, corona, dark capping)
  band(b, TRIM, outline, 0, 1.0, 0.08)
  band(b, TRIM, outline, FL1 - 0.1, 0.32, 0.12)
  band(b, TRIM, outline, FL1 + 0.22, 0.14, 0.06)
  band(b, TRIM, outline, top - 0.75, 0.3, 0.1)
  band(b, TRIM, outline, top - 0.05, 0.25, 0.16)
  modillions(b, outline, top + 0.32, CP - 0.12)
  band(b, TRIM, outline, top + 0.42, 0.24, CP)
  band(b, DARK, outline, top + 0.66, 0.12, CP + 0.06) // dark metal capping / box gutter
  b.block(WALL, MX1 - MX0 - 0.2, 0.7, MZ1 - MZ0 - 0.2, (MX0 + MX1) / 2, top, (MZ0 + MZ1) / 2)
  // corner pilaster strips
  const corners: [number, number, number, number][] = [
    [MX0, MZ1, 1, -1],
    [MX0, MZ0, 1, 1],
    [MX1, MZ0, -1, 1],
    [MX1, MZ1, -1, -1],
    [WR.x0, WR.z0, 1, 1],
    [WR.x0, WR.z1, 1, -1],
  ]
  for (const [x, z, sx, sz] of corners) {
    b.block(TRIM, 0.08, top - 1.8, 0.62, x - sx * 0.04, 1.0, z + sz * 0.31)
    b.block(TRIM, 0.62, top - 1.8, 0.08, x + sx * 0.31, 1.0, z - sz * 0.04)
  }

  /* ---------- street front (−X, Str. Spiru Haret) ---------- */
  const F: Face = '-x'
  const zr = (WR.z0 + WR.z1) / 2
  // risalit: Serliana group upstairs with a small balcony, three tall windows below between pilasters
  win(b, F, WR.x0, zr, FL1 + 0.6, 1.5, 3.55, 'round')
  for (const s of [-1, 1]) win(b, F, WR.x0, zr + s * 2.15, FL1 + 0.6, 1.1, 2.55)
  b.add(TRIM, extrude(frameShape('round', 1.9, 3.95, 0.12, 0, FL1 + 0.4), 0.05), faceFrame(F, WR.x0, zr, 0, 0))
  b.block(TRIM, 0.95, 0.3, 2.7, WR.x0 - 0.45, FL1, zr)
  for (const s of [-1, 1]) b.block(TRIM, 0.7, 0.55, 0.3, WR.x0 - 0.35, FL1 - 0.55, zr + s * 1.0)
  balustrade(b, V(WR.x0 - 0.8, FL1 + 0.3, zr - 1.3), V(WR.x0 - 0.8, FL1 + 0.3, zr + 1.3))
  for (const s of [-1, 0, 1]) win(b, F, WR.x0, zr + s * 2.15, 1.5, s === 0 ? 1.45 : 1.15, 3.2)
  for (const s of [-1, 1]) {
    b.block(TRIM, 0.12, FL1 - 1.4, 0.42, WR.x0 - 0.06, 1.0, zr + s * 1.12)
    b.block(TRIM, 0.2, 0.25, 0.55, WR.x0 - 0.1, FL1 - 0.55, zr + s * 1.12)
  }
  // attic block above the risalit (plain, raised, zinc-covered top)
  {
    const ax0 = WR.x0 + 0.3
    const ax1 = -5.0
    const cx = (ax0 + ax1) / 2
    b.block(WALL, ax1 - ax0, ATTIC - top, WR.z1 - WR.z0, cx, top, zr)
    b.block(TRIM, ax1 - ax0 + 0.3, 0.22, WR.z1 - WR.z0 + 0.3, cx, ATTIC - 0.3, zr)
    b.block(DARK, ax1 - ax0 + 0.46, 0.06, WR.z1 - WR.z0 + 0.46, cx, ATTIC - 0.12, zr)
    b.block(ROOF, ax1 - ax0 + 0.42, 0.1, WR.z1 - WR.z0 + 0.42, cx, ATTIC - 0.08, zr)
    facet(b, ROOF, [V(ax0 + 0.1, ATTIC + 0.12, WR.z0 + 0.1), V(ax1 - 0.1, ATTIC + 0.03, WR.z0 + 0.1), V(ax1 - 0.1, ATTIC + 0.03, WR.z1 - 0.1), V(ax0 + 0.1, ATTIC + 0.12, WR.z1 - 0.1)], { seams: SEAM })
  }
  // right of the risalit: pedimented window, Ionic porch carrying a balustraded balcony
  const zp = (WR.z1 + MZ1) / 2
  win(b, F, MX0, zp, FL1 + 0.6, 1.45, 2.6, 'rect', true)
  b.add('wood', metricBox(0.05, 3.4, 1.7), mat(MX0 - 0.03, 1.0 + 1.7, zp))
  b.add(TRIM, extrude(frameShape('rect', 1.7, 3.4, 0.18, 0, 1.0), 0.08), faceFrame(F, MX0, zp, 0, 0))
  const xp = PORCH.x0 + 0.25
  for (const z of [zp - 1.25, zp + 1.25]) ionic(b, xp, z, 1.0, FL1 - 1.55)
  for (const z of [WR.z1 + 0.3, PORCH.z1 - 0.3]) b.block(TRIM, 0.5, FL1 - 1.0, 0.5, xp, 1.0, z)
  b.block(TRIM, MX0 - PORCH.x0 + 0.45, 0.6, PORCH.z1 - WR.z1 + 0.3, (PORCH.x0 + MX0) / 2 - 0.12, FL1 - 0.55, zp)
  b.block(TRIM, MX0 - PORCH.x0 + 0.6, 0.14, PORCH.z1 - WR.z1 + 0.5, (PORCH.x0 + MX0) / 2 - 0.2, FL1 + 0.05, zp)
  b.block(TRIM, MX0 - PORCH.x0 + 0.4, 0.5, PORCH.z1 - WR.z1, (PORCH.x0 + MX0) / 2 - 0.1, 0, zp)
  balustrade(b, V(PORCH.x0 + 0.05, FL1 + 0.2, WR.z1 + 0.2), V(PORCH.x0 + 0.05, FL1 + 0.2, PORCH.z1 - 0.1))
  balustrade(b, V(PORCH.x0 + 0.05, FL1 + 0.2, PORCH.z1 - 0.1), V(MX0 - 0.1, FL1 + 0.2, PORCH.z1 - 0.1))
  // left of the risalit: window bay with a small balustraded balcony (photos 05, 06 far left)
  const zl = (MZ0 + WR.z0) / 2
  win(b, F, MX0, zl, FL1 + 0.6, 1.3, 2.6)
  win(b, F, MX0, zl, 1.5, 1.3, 3.0)
  b.block(TRIM, 0.9, 0.28, 3.4, MX0 - 0.45, FL1, zl)
  balustrade(b, V(MX0 - 0.8, FL1 + 0.28, zl - 1.6), V(MX0 - 0.8, FL1 + 0.28, zl + 1.6))

  /* ---------- one-storey annexes ---------- */
  // south bay (+Z) with a lean-to zinc roof (lower volume at the right edge of photo 05)
  {
    const cx = (SB.x0 + SB.x1) / 2
    b.block(WALL, SB.x1 - SB.x0, hA, SB.z1 - MZ1 + 0.2, cx, 0, (SB.z1 + MZ1 - 0.2) / 2)
    b.block(TRIM, SB.x1 - SB.x0 + 0.16, 1.0, SB.z1 - MZ1 + 0.3, cx, 0, (SB.z1 + MZ1) / 2)
    b.block(TRIM, SB.x1 - SB.x0 + 0.4, 0.4, SB.z1 - MZ1 + 0.45, cx, hA - 0.4, (SB.z1 + MZ1) / 2 + 0.12)
    for (const x of [cx - 2.2, cx, cx + 2.2]) win(b, '+z', SB.z1, x, 1.5, 1.15, 3.0)
    const y1 = hA + 0.75
    facet(b, ROOF, [V(SB.x0 - 0.3, hA, SB.z1 + 0.4), V(SB.x1 + 0.3, hA, SB.z1 + 0.4), V(SB.x1 + 0.3, y1, MZ1), V(SB.x0 - 0.3, y1, MZ1)], { seams: SEAM, thickness: 0.06 })
  }
  // canted east bay (one storey) with a low zinc roof
  const bay: [number, number][] = [
    [MX1 - 0.2, 5.1],
    [10.9, 5.1],
    [12.5, 2.9],
    [12.3, -0.4],
    [10.5, -2.1],
    [MX1 - 0.2, -2.1],
  ]
  {
    const s = new THREE.Shape(bay.map(([x, z]) => new THREE.Vector2(x, -z)))
    b.add(WALL, extrude(s, hA), new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    band(b, TRIM, bay, 0, 1.0, 0.08)
    band(b, TRIM, bay, hA - 0.45, 0.45, 0.22)
    for (let i = 1; i < bay.length - 2; i++) {
      const [x1, z1] = bay[i]
      const [x2, z2] = bay[i + 1]
      const ry = Math.atan2(z1 - z2, x2 - x1)
      const m = mat((x1 + x2) / 2, 0, (z1 + z2) / 2, ry)
      b.add('glassC', metricBox(1.1, 2.9, 0.04), M(m, mat(0, 1.6 + 1.45, 0.05)))
      b.add('wood', extrude(frameShape('rect', 1.1, 2.9, 0.08, 0, 1.6), 0.1), M(m, mat(0, 0, 0.02)))
      b.add(TRIM, extrude(frameShape('rect', 1.1, 2.9, 0.16, 0, 1.6), 0.06), M(m, mat(0, 0, 0.01)))
    }
    const apex = V(MX1, hA + 1.3, 1.5)
    const ring = bay.slice(1, bay.length - 1).map(([x, z]) => {
      const c = V(x, hA, z)
      return c.add(c.clone().sub(V(MX1, hA, 1.5)).setY(0).normalize().multiplyScalar(0.3))
    })
    ring.unshift(V(MX1, hA, 5.4))
    ring.push(V(MX1, hA, -2.4))
    for (let i = 0; i < ring.length - 1; i++) facet(b, ROOF, [ring[i], ring[i + 1], apex], { seams: SEAM, thickness: 0.06 })
  }

  /* ---------- other elevations (not photographed: rhythm repeated) ---------- */
  for (const x of [-7.3, 5.9]) {
    win(b, '+z', MZ1, x, FL1 + 0.6, 1.25, 2.6)
    win(b, '+z', MZ1, x, 1.5, 1.25, 3.0)
  }
  win(b, '+z', MZ1, -1.2, FL1 + 0.9, 1.25, 2.4)
  for (const z of [6.9, -5.6]) {
    win(b, '+x', MX1, uOf('+x', 0, z), FL1 + 0.6, 1.0, 2.6)
    win(b, '+x', MX1, uOf('+x', 0, z), 1.5, 1.0, 3.0)
  }
  for (const z of [3.3, -0.4]) win(b, '+x', MX1, uOf('+x', 0, z), FL1 + 0.9, 1.1, 2.5)
  for (const x of [-7.2, 6.8]) {
    win(b, '-z', MZ0, uOf('-z', x, 0), FL1 + 0.6, 1.2, 2.6)
    win(b, '-z', MZ0, uOf('-z', x, 0), 1.5, 1.2, 3.0)
  }
  for (const x of [-2.2, 2.2]) {
    win(b, '-z', NR.z0, uOf('-z', x, 0), FL1 + 0.6, 1.2, 2.6)
    win(b, '-z', NR.z0, uOf('-z', x, 0), 1.5, 1.2, 3.0)
  }

  /* ---------- roof (elZinc Oliva) ---------- */
  {
    const t = Math.tan(12.5 * D2R)
    const x0 = MX0 - CP - 0.06
    const x1 = MX1 + CP + 0.06
    const z0 = MZ0 - CP - 0.06
    const z1 = MZ1 + CP + 0.06
    const ye = E + 0.05
    const hd = (z1 - z0) / 2
    const yr = ye + hd * t
    const xa = x0 + hd
    const xb = x1 - hd
    const zc = (z0 + z1) / 2
    const r1 = V(xa, yr, zc)
    const r2 = V(xb, yr, zc)
    const c00 = V(x0, ye, z0)
    const c10 = V(x1, ye, z0)
    const c11 = V(x1, ye, z1)
    const c01 = V(x0, ye, z1)
    for (const f of [
      [c01, c11, r2, r1],
      [c10, c00, r1, r2],
      [c00, c01, r1],
      [c11, c10, r2],
    ]) facet(b, ROOF, f, { seams: SEAM, thickness: 0.06 })
    const up = V(0, 0.04, 0)
    b.beam('fspCap', r1.clone().add(up), r2.clone().add(up), 0.22, 0.1)
    for (const [p, q] of [[c00, r1], [c01, r1], [c10, r2], [c11, r2]] as [P3, P3][]) b.beam('fspCap', p.clone().add(up), q.clone().add(up), 0.18, 0.08)
    // rear risalit: small cross hip running into the main roof
    const rx = NR.x1 - NR.x0 + 2 * CP + 0.12
    const rz0 = NR.z0 - CP - 0.06
    const ry = ye + (rx / 2) * t
    const ra = V(0, ry, rz0 + rx / 2)
    const rb = V(0, ry, 0)
    const a0 = V(-rx / 2, ye, rz0)
    const a1 = V(rx / 2, ye, rz0)
    const b0 = V(-rx / 2, ye, 0)
    const b1 = V(rx / 2, ye, 0)
    for (const f of [
      [a0, b0, rb, ra],
      [b1, a1, ra, rb],
      [a1, a0, ra],
    ]) facet(b, ROOF, f, { seams: SEAM })
    // lightning-rod mast with guy wires, right of the attic as seen from the street (photos 05–08)
    const mx = -4.2
    const mz = 5.4
    const yb = ye + Math.min(z1 - mz, mx - x0) * t
    const m0 = V(mx, yb, mz)
    b.rod('iron', m0, m0.clone().add(V(0, 6.3, 0)), 0.04, 6)
    for (const a of [0.6, 2.7, 4.8]) {
      const fx = mx + Math.cos(a) * 3.0
      const fz = mz + Math.sin(a) * 3.0
      const fy = ye + Math.max(0, Math.min(z1 - fz, fz - z0, fx - x0, x1 - fx)) * t
      b.rod('iron', m0.clone().add(V(0, 5.7, 0)), V(fx, fy, fz), 0.008, 3)
    }
  }
  // downpipes (dark)
  for (const [x, z] of [
    [MX0 - 0.15, WR.z1 + 0.2],
    [MX0 - 0.15, MZ1 - 0.25],
    [MX1 + 0.15, MZ1 - 0.3],
    [MX1 + 0.15, MZ0 + 0.3],
    [MX0 - 0.15, MZ0 + 0.3],
  ] as [number, number][]) b.rod(DARK, V(x, 0.3, z), V(x, top + 0.5, z), 0.065, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-3, 13.5, 4],
  materials: () => ({
    fspWall: new THREE.MeshStandardMaterial({ color: '#ede3c9', roughness: 0.88 }),
    fspTrim: new THREE.MeshStandardMaterial({ color: '#e6d6ad', roughness: 0.8 }),
    fspDark: new THREE.MeshStandardMaterial({ color: '#363634', roughness: 0.5, metalness: 0.4 }),
    fspCap: new THREE.MeshStandardMaterial({ color: '#7f8274', roughness: 0.55, metalness: 0.45 }),
  }),
  notes: 'Low hipped elZinc Oliva roof behind a deep modillion cornice; west street front (Str. Spiru Haret) from the photographs, other elevations interpreted.',
}
export default model
