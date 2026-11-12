/**
 * Biserica Evanghelică C.A. (Biserica Luterană), Str. Luterană 2, București —
 * Romanesque-revival hall church (1851-1853) with a single west tower.
 * COLOR METAL: natural titanium-zinc standing seam (2023, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 64.5° towards the small east apse; west front at −X):
 *  - Footprint after OSM way 162494375: 26.6 × 14.4 m rectangle plus a small
 *    semicircular east apse (≈ 7.4 m wide, 3.3 m deep).
 *  - West front measured on the frontal photo 02 (portal ≈ 2.0 m wide as scale,
 *    ≈ 20 px/m): westwork 9.6 m wide with three projecting piers (outer piers
 *    with pyramidal caps, the central one running into the tower), two bays each
 *    with a round-arched portal; an oculus over the left (north) portal and a
 *    larger rose in a square frame over the right one; stepped corbel-arcade
 *    cornice ≈ 10.4 m.
 *  - Low side annexes flanking the westwork (2.4 m wide fronts, projecting 1.2 m
 *    beyond the nave walls), eaves ≈ 7.5 m, hipped roofs, twin arched window on
 *    the front, tall arched window on the side (photos 01, 03, 04).
 *  - Nave 12 m wide, eaves ≈ 9.8 m with a Lombard corbel-arcade frieze, pilaster
 *    strips, four bays with a tall round-arched gallery window over a smaller
 *    lower window; low (18°) gable roof hidden behind the cornice.
 *  - Tower: square belfry stage 6.0 m wide, 11.0 → 15.6 m, two arched louvred
 *    openings per face; octagonal stage (4.0 m across flats) with clock
 *    faces and tall arched louvres, to 22.9 m; octagonal zinc spire to ≈ 29.8 m,
 *    ball and cross (cross top ≈ 31.5 m) — heights from photo 02 proportions.
 *  - METAL (client rule): all four photos (2012-2018) predate the 2023 works, so
 *    the nave, annex and apse roofs, the westwork roofs and the spire are shown in
 *    natural titanium-zinc standing seam (seams ≈ 0.5 m); which surfaces were
 *    renewed is not documented.
 * Approximations: nave bay count and the east elevation (not photographed), roof
 * pitches, corbel-arcade and portal mouldings simplified, wall colours averaged.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, spire, seams, faceFrame, lathe, facet as kitFacet, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const WALL = 'luWall'
const STONE = 'luStone'
const D2R = Math.PI / 180

/* plan */
const XW = -15.0 // west front (pier faces)
const NAVE = { x0: -10.4, x1: 11.7, hw: 6.0, eave: 9.8 }
const WW = { x0: XW + 0.35, x1: -10.0, hw: 4.8, top: 10.4 } // westwork block
const ANX = { x0: -14.7, x1: -10.0, z0: 4.8, z1: 7.2, eave: 7.5 }
const APSE = { x: 11.7, r: 3.6, h: 7.2 }
const TW = { x: -12.6, hw: 3.0, y0: 10.4, y1: 15.6 }
const OCT = { r: 2.0 / Math.cos(Math.PI / 8), y0: 15.6, y1: 22.9 }
const PITCH = 18

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
/** wall frame through (x, z) whose outward normal is (cos a, sin a) in XZ; local x along the wall, z outwards */
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** Lombard band: a row of small round arches on corbels, between u0 and u1 at height y (wall frame m). */
function corbelArcade(b: Builder, key: string, m: THREE.Matrix4, u0: number, u1: number, y: number, span = 0.62, h = 0.55, depth = 0.12) {
  const n = Math.max(1, Math.round((u1 - u0) / span))
  const s = (u1 - u0) / n
  const c = 0.09 // half corbel width
  const r = s / 2 - c
  const ys = y + 0.12
  const pts: THREE.Vector2[] = [new THREE.Vector2(u0, y + h), new THREE.Vector2(u1, y + h), new THREE.Vector2(u1, y)]
  for (let i = n - 1; i >= 0; i--) {
    const a = u0 + i * s
    const cx = a + s / 2
    pts.push(new THREE.Vector2(a + s - c, y), new THREE.Vector2(a + s - c, ys))
    for (let k = 1; k < 8; k++) {
      const t = (k / 8) * Math.PI
      pts.push(new THREE.Vector2(cx + Math.cos(t) * r, ys + Math.sin(t) * r))
    }
    pts.push(new THREE.Vector2(a + c, ys), new THREE.Vector2(a + c, y))
  }
  b.add(key, extrude(new THREE.Shape(pts), depth, 4), M(m, mat(0, 0, 0)))
}

/** Arched window / opening with a moulded surround on a wall frame. */
function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, o: { glass?: string; frame?: number; louvres?: boolean; sill?: boolean; bars?: boolean } = {}) {
  const f = o.frame ?? 0.16
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add(STONE, extrude(frameShape('round', w, h, f, u, y0), 0.12, 10), M(m, mat(0, 0, 0.01)))
  if (o.louvres) for (let y = y0 + 0.2; y < y0 + h - w / 2; y += 0.28) b.add('timber', metricBox(w * 0.96, 0.05, 0.16), M(m, mat(u, y, 0.08, 0, 0.5)))
  if (o.bars) {
    b.add('luFrame', metricBox(0.05, h - w / 2, 0.05), M(m, mat(u, y0 + (h - w / 2) / 2, 0.05)))
    b.add('luFrame', metricBox(w, 0.05, 0.05), M(m, mat(u, y0 + h - w / 2, 0.05)))
  }
  if (o.sill) b.add(STONE, metricBox(w + 2 * f + 0.15, 0.12, 0.26), M(m, mat(u, y0 - f - 0.05, 0.1)))
}

/** Round-arched portal with stepped archivolts and colonnettes. */
function portal(b: Builder, m: THREE.Matrix4, u: number, w: number, h: number) {
  b.add('luDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, 0.3, 12))), M(m, mat(0, 0, -0.25)))
  // reveal (jamb) walls
  b.add(STONE, extrude(frameShape('round', w, h, 0.3, u, 0.3), 0.3, 12), M(m, mat(0, 0, -0.25)))
  b.add(STONE, extrude(frameShape('round', w + 0.6, h + 0.3, 0.22, u, 0.3), 0.14, 12), M(m, mat(0, 0, 0.0)))
  for (const s of [-1, 1]) b.add(STONE, new THREE.CylinderGeometry(0.11, 0.11, h - w / 2 - 0.3, 10), M(m, mat(u + s * (w / 2 + 0.42), 0.3 + (h - w / 2 - 0.3) / 2, 0.12)))
  // steps
  b.add(STONE, metricBox(w + 1.6, 0.3, 0.9), M(m, mat(u, 0.15, 0.35)))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave ---------------- */
  const nl = NAVE.x1 - NAVE.x0
  const nx = (NAVE.x0 + NAVE.x1) / 2
  b.block(WALL, nl, NAVE.eave, NAVE.hw * 2, nx, 0, 0)
  b.block(STONE, nl + 0.2, 0.7, NAVE.hw * 2 + 0.2, nx, 0, 0)
  b.block(STONE, nl + 0.1, 0.3, NAVE.hw * 2 + 0.7, nx, NAVE.eave - 0.3, 0)
  b.block(STONE, nl + 0.1, 0.16, NAVE.hw * 2 + 0.95, nx, NAVE.eave - 0.08, 0)
  const bays = [-8.2, -3.1, 2.0, 7.1]
  for (const sz of [-1, 1]) {
    const face: Face = sz > 0 ? '+z' : '-z'
    const plane = sz * NAVE.hw
    const fm = (u: number) => faceFrame(face, plane, u, 0, 0)
    // pilaster strips between bays and at the corners
    for (const x of [-10.2, -5.65, -0.55, 4.55, 9.6, 11.45]) b.add(STONE, metricBox(0.75, NAVE.eave - 1.0, 0.18), M(fm(sz > 0 ? x : -x), mat(0, 0.7 + (NAVE.eave - 1.0) / 2, 0.09)))
    // corbel arcade under the eaves
    corbelArcade(b, STONE, fm(0), -nl / 2 + (sz > 0 ? nx : -nx), nl / 2 + (sz > 0 ? nx : -nx), NAVE.eave - 0.95, 0.62, 0.6, 0.14)
    for (const x of bays) {
      const u = sz > 0 ? x : -x
      arched(b, fm(0), u, 5.0, 1.55, 3.9, { sill: true, bars: true })
      arched(b, fm(0), u, 1.5, 1.1, 2.3, { sill: true })
      // balustrade panel between the two windows
      b.add(STONE, metricBox(1.8, 0.9, 0.08), M(fm(0), mat(u, 4.2, 0.04)))
    }
  }

  /* nave roof (low gable, natural zinc) */
  {
    const t = Math.tan(PITCH * D2R)
    const ov = 0.45
    const ey = NAVE.eave + 0.08 - ov * t
    const ry = NAVE.eave + 0.08 + NAVE.hw * t
    const hw = NAVE.hw + ov
    const xa = NAVE.x0 + 0.2
    const xb = NAVE.x1 + 0.35
    for (const sz of [-1, 1]) {
      const pts = [V(xa, ey, sz * hw), V(xb, ey, sz * hw), V(xb, ry, 0), V(xa, ry, 0)]
      facetN(b, pts)
      b.beam(ZN, V(xa, ey - 0.08, sz * (hw + 0.06)), V(xb, ey - 0.08, sz * (hw + 0.06)), 0.18, 0.18)
    }
    b.beam(ZN, V(xa, ry + 0.06, 0), V(xb, ry + 0.06, 0), 0.26, 0.14)
    // east gable wall + verge flashing
    const tri = new THREE.Shape([new THREE.Vector2(-NAVE.hw, NAVE.eave - 0.01), new THREE.Vector2(NAVE.hw, NAVE.eave - 0.01), new THREE.Vector2(0, ry - 0.05)])
    b.add(WALL, extrude(tri, 0.5), mat(NAVE.x1 - 0.5, 0, 0, Math.PI / 2))
    for (const sz of [-1, 1]) b.beam(ZN, V(xb, ey, sz * hw), V(xb, ry + 0.04, 0), 0.22, 0.3, V(1, 0, 0))
    b.add(STONE, extrude(new THREE.Shape([new THREE.Vector2(-0.35, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(0.35, 1.1), new THREE.Vector2(0, 1.5), new THREE.Vector2(-0.35, 1.1)]), 0.3), mat(NAVE.x1 + 0.05, ry - 0.2, 0, Math.PI / 2))
    // small oculus in the east gable
    b.add(STONE, new THREE.TorusGeometry(0.55, 0.12, 6, 20), mat(NAVE.x1 + 0.02, NAVE.eave + 1.1, 0, Math.PI / 2))
    b.add('glassC', new THREE.CircleGeometry(0.52, 20), mat(NAVE.x1 + 0.01, NAVE.eave + 1.1, 0, Math.PI / 2))
  }

  /* ---------------- east apse (semicircular, half-cone zinc roof) ---------------- */
  {
    const seg = 20
    const wallG = new THREE.CylinderGeometry(APSE.r, APSE.r, APSE.h, seg, 1, true, 0, Math.PI)
    b.add(WALL, wallG, mat(APSE.x, APSE.h / 2, 0))
    b.add(STONE, new THREE.CylinderGeometry(APSE.r + 0.12, APSE.r + 0.12, 0.7, seg, 1, false, 0, Math.PI), mat(APSE.x, 0.35, 0))
    b.add(STONE, new THREE.CylinderGeometry(APSE.r + 0.35, APSE.r + 0.2, 0.35, seg, 1, false, 0, Math.PI), mat(APSE.x, APSE.h - 0.17, 0))
    const rise = 2.0
    const prof: [number, number][] = [[APSE.r + 0.45, APSE.h - 0.05], [0.05, APSE.h + rise]]
    b.add(ZN, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg, 0, Math.PI), mat(APSE.x, 0, 0))
    for (let k = 1; k < 9; k++) {
      const a = (k / 9) * Math.PI
      const d = V(Math.sin(a), 0, Math.cos(a))
      b.beam(ZN, V(APSE.x + d.x * (APSE.r + 0.42), APSE.h, d.z * (APSE.r + 0.42)), V(APSE.x + d.x * 0.25, APSE.h + rise - 0.1, d.z * 0.25), 0.045, 0.045)
    }
    // three small arched windows
    for (const a of [-50, 0, 50]) {
      const ar = a * D2R
      arched(b, wallAt(APSE.x + Math.cos(ar) * APSE.r, Math.sin(ar) * APSE.r, ar), 0, 3.0, 0.9, 2.4, { sill: true })
    }
  }

  /* ---------------- side annexes at the west end ---------------- */
  for (const sz of [-1, 1]) {
    const zc = sz * (ANX.z0 + ANX.z1) / 2
    const w = ANX.x1 - ANX.x0
    const d = ANX.z1 - ANX.z0
    const xc = (ANX.x0 + ANX.x1) / 2
    b.block(WALL, w, ANX.eave, d, xc, 0, zc)
    b.block(STONE, w + 0.2, 0.7, d + 0.2, xc, 0, zc)
    b.block(STONE, w + 0.5, 0.35, d + 0.5, xc, ANX.eave - 0.35, zc)
    // corner pilasters
    for (const [x, z] of [[ANX.x0, ANX.z1], [ANX.x1, ANX.z1], [ANX.x0, ANX.z0]] as [number, number][]) b.block(STONE, 0.8, ANX.eave - 0.4, 0.8, x + (x === ANX.x0 ? 0.3 : -0.3), 0, sz * (z - 0.3))
    // hipped zinc roof
    hip(b, xc, zc, w + 0.8, d + 0.8, ANX.eave, 30)
    // side window (tall arched) with panel below
    const sideFace: Face = sz > 0 ? '+z' : '-z'
    const fmS = faceFrame(sideFace, sz * ANX.z1, 0, 0, 0)
    const uS = sz > 0 ? xc : -xc
    arched(b, fmS, uS, 3.1, 1.3, 3.6, { sill: true, bars: true })
    b.add(STONE, metricBox(1.8, 1.1, 0.08), M(fmS, mat(uS, 2.1, 0.04)))
    // front: twin arched window and a tall blind panel
    const fmF = faceFrame('-x', ANX.x0, 0, 0, 0)
    for (const du of [-0.33, 0.33]) arched(b, fmF, zc + du, 4.6, 0.5, 1.4, { frame: 0.1 })
    b.add(STONE, extrude(frameShape('rect', 1.1, 2.8, 0.12, zc, 1.2), 0.08), M(fmF, mat(0, 0, 0.01)))
    b.add('luWallDark', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.1, 2.8, zc, 1.2))), M(fmF, mat(0, 0, 0.02)))
  }

  /* ---------------- westwork ---------------- */
  {
    const wx = (WW.x0 + WW.x1) / 2
    const wl = WW.x1 - WW.x0
    b.block(WALL, wl, WW.top, WW.hw * 2, wx, 0, 0)
    b.block(STONE, wl + 0.2, 0.7, WW.hw * 2 + 0.2, wx, 0, 0)
    const fw = faceFrame('-x', WW.x0, 0, 0, 0)
    // raking corbel arcades (each bay rises towards the tower) + cornice
    for (const s of [-1, 1]) {
      const u0 = s < 0 ? -WW.hw + 0.5 : 0.6
      const u1 = s < 0 ? -0.6 : WW.hw - 0.5
      corbelArcade(b, STONE, fw, u0, u1, WW.top - 1.25, 0.55, 0.65, 0.16)
    }
    b.block(STONE, 0.5, 0.3, WW.hw * 2 + 0.3, WW.x0 - 0.1, WW.top - 0.55, 0)
    b.block(STONE, 0.7, 0.2, WW.hw * 2 + 0.5, WW.x0 - 0.15, WW.top - 0.25, 0)
    // westwork roof: two short pent roofs falling west, plus side slopes
    const t = Math.tan(30 * D2R)
    for (const s of [-1, 1]) {
      const zA = s * 0.05
      const zB = s * (WW.hw + 0.3)
      const y0 = WW.top - 0.05
      const xT = TW.x - TW.hw
      facetN(b, [V(WW.x0 - 0.3, y0, zA), V(WW.x0 - 0.3, y0, zB), V(xT, y0 + (xT - WW.x0 + 0.3) * t, zB), V(xT, y0 + (xT - WW.x0 + 0.3) * t, zA)])
      facetN(b, [V(xT, y0, s * (TW.hw)), V(xT, y0, zB), V(TW.x + TW.hw + 0.2, y0, zB), V(TW.x + TW.hw + 0.2, y0 + 0.9, s * TW.hw)])
    }
    // piers: outer two with pyramidal caps, central one rising into the tower
    for (const z of [-WW.hw + 0.45, 0, WW.hw - 0.45]) {
      const top = z === 0 ? TW.y0 + 0.4 : WW.top + 0.9
      b.block(STONE, 0.9, top, 1.05, WW.x0 - 0.15, 0, z)
      for (let y = 1.2; y < top - 0.4; y += 0.55) b.block(STONE, 0.95, 0.06, 1.1, WW.x0 - 0.15, y, z)
      if (z !== 0) {
        b.block(STONE, 1.1, 0.25, 1.25, WW.x0 - 0.15, top, z)
        b.add(STONE, new THREE.ConeGeometry(0.62, 1.0, 4, 1), mat(WW.x0 - 0.15, top + 0.75, z, Math.PI / 4))
      }
    }
    // portals
    portal(b, fw, -2.4, 1.9, 3.7)
    portal(b, fw, 2.4, 1.9, 3.7)
    // oculus (north bay) and rose window in a square frame (south bay)
    b.add(STONE, new THREE.TorusGeometry(1.05, 0.2, 8, 28), M(fw, mat(-2.4, 6.6, 0.1)))
    b.add('glassC', new THREE.CircleGeometry(0.95, 28), M(fw, mat(-2.4, 6.6, 0.02)))
    b.add(STONE, extrude(frameShape('rect', 3.0, 3.0, 0.18, 2.4, 5.0), 0.1), M(fw, mat(0, 0, 0.01)))
    b.add(STONE, new THREE.TorusGeometry(1.32, 0.18, 8, 32), M(fw, mat(2.4, 6.5, 0.12)))
    b.add('glassC', new THREE.CircleGeometry(1.25, 32), M(fw, mat(2.4, 6.5, 0.02)))
    for (let k = 0; k < 8; k++) b.add(STONE, metricBox(0.07, 2.4, 0.06), M(fw, mat(2.4, 6.5, 0.06, 0, 0, (k * Math.PI) / 8)))
    b.add(STONE, new THREE.TorusGeometry(0.42, 0.07, 6, 16), M(fw, mat(2.4, 6.5, 0.08)))
    // lanterns
    for (const u of [-2.4, 2.4]) b.add('iron', metricBox(0.25, 0.4, 0.25), M(fw, mat(u + (u < 0 ? -1.3 : 1.3), 4.6, 0.5)))
  }

  /* ---------------- tower: square belfry ---------------- */
  {
    const hh = TW.y1 - TW.y0
    b.block(WALL, TW.hw * 2, hh, TW.hw * 2, TW.x, TW.y0, 0)
    // corner pilasters
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block(STONE, 0.7, hh, 0.16, TW.x + sx * (TW.hw - 0.35), TW.y0, sz * (TW.hw + 0.08))
      b.block(STONE, 0.16, hh, 0.7, TW.x + sx * (TW.hw + 0.08), TW.y0, sz * (TW.hw - 0.35))
    }
    const faces: [Face, number, number][] = [
      ['-x', TW.x - TW.hw, 0],
      ['+x', TW.x + TW.hw, 0],
      ['+z', TW.hw, TW.x],
      ['-z', -TW.hw, -TW.x],
    ]
    for (const [f, plane, uc] of faces) {
      const fm = faceFrame(f, plane, 0, 0, 0)
      for (const du of [-1.0, 1.0]) arched(b, fm, uc + du, TW.y0 + 0.9, 0.95, 3.1, { glass: 'black', louvres: true, frame: 0.2 })
      corbelArcade(b, STONE, fm, uc - TW.hw + 0.4, uc + TW.hw - 0.4, TW.y1 - 0.75, 0.5, 0.5, 0.12)
    }
    b.block(STONE, TW.hw * 2 + 0.5, 0.25, TW.hw * 2 + 0.5, TW.x, TW.y1 - 0.25, 0)
    b.block(STONE, TW.hw * 2 + 0.8, 0.18, TW.hw * 2 + 0.8, TW.x, TW.y1, 0)
    // zinc capping on the belfry top (around the octagon)
    b.block(ZN, TW.hw * 2 + 0.85, 0.05, TW.hw * 2 + 0.85, TW.x, TW.y1 + 0.18, 0)
    b.block(STONE, TW.hw * 2 + 0.3, 0.3, TW.hw * 2 + 0.3, TW.x, TW.y0 - 0.05, 0)
  }

  /* ---------------- tower: octagonal stage + spire ---------------- */
  {
    const ap = OCT.r * Math.cos(Math.PI / 8)
    prism(b, WALL, { x: TW.x, n: 8, r: OCT.r, y0: OCT.y0, h: OCT.y1 - OCT.y0 })
    ringBand(b, STONE, { x: TW.x, n: 8, r: OCT.r, y: OCT.y0 + 0.2, h: 0.35, grow: 0.12 })
    ringBand(b, STONE, { x: TW.x, n: 8, r: OCT.r, y: OCT.y0 + 2.45, h: 0.18, grow: 0.08 })
    ringBand(b, STONE, { x: TW.x, n: 8, r: OCT.r, y: OCT.y1 - 0.45, h: 0.25, grow: 0.15 })
    ringBand(b, STONE, { x: TW.x, n: 8, r: OCT.r, y: OCT.y1 - 0.2, h: 0.2, grow: 0.3 })
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(TW.x + Math.cos(a) * ap, Math.sin(a) * ap, a)
      // corner strips
      const ac = a + Math.PI / 8
      b.add(STONE, metricBox(0.28, OCT.y1 - OCT.y0 - 0.5, 0.28), mat(TW.x + Math.cos(ac) * OCT.r, (OCT.y0 + OCT.y1) / 2, Math.sin(ac) * OCT.r, -ac))
      arched(b, m, 0, OCT.y0 + 3.0, 0.62, 2.9, { glass: 'black', louvres: true, frame: 0.14 })
      corbelArcade(b, STONE, m, -0.68, 0.68, OCT.y1 - 1.0, 0.45, 0.45, 0.1)
      if (k % 2 === 0) {
        // clock faces on the four main faces
        b.add('white', new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), M(m, mat(0, OCT.y0 + 1.3, 0.06, 0, Math.PI / 2)))
        b.add(STONE, new THREE.TorusGeometry(0.58, 0.06, 6, 24), M(m, mat(0, OCT.y0 + 1.3, 0.1)))
        b.add('black', metricBox(0.05, 0.42, 0.03), M(m, mat(0, OCT.y0 + 1.45, 0.12)))
        b.add('black', metricBox(0.3, 0.05, 0.03), M(m, mat(0.12, OCT.y0 + 1.3, 0.12)))
      }
    }
    // spire: slight eave flare + tall octagonal pyramid (natural zinc)
    const sy = OCT.y1 + 0.2
    b.add(ZN, lathe([[OCT.r + 0.4, sy - 0.05], [OCT.r + 0.1, sy + 0.45], [OCT.r - 0.05, sy + 0.6]], 8), mat(TW.x, 0, 0, Math.PI / 8))
    spire(b, ZN, { x: TW.x, z: 0, y0: sy + 0.55, r: OCT.r - 0.05, h: 6.4, n: 8, seams: seams(ZN, 0.45, 0.035, 0.035) })
    // small gablets at the spire foot (cardinal faces)
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2
      const g = new THREE.Shape([new THREE.Vector2(-0.45, 0), new THREE.Vector2(0.45, 0), new THREE.Vector2(0, 0.7)])
      b.add(ZN, extrude(g, 0.15), M(wallAt(TW.x + Math.cos(a) * (ap + 0.05), Math.sin(a) * (ap + 0.05), a), mat(0, sy + 0.5, -0.1)))
    }
    const top = sy + 0.55 + 6.4
    b.add('gilt', new THREE.SphereGeometry(0.22, 14, 10), mat(TW.x, top + 0.15, 0))
    b.rod('iron', V(TW.x, top - 0.2, 0), V(TW.x, top + 1.6, 0), 0.04, 6)
    b.add('iron', metricBox(0.07, 0.07, 0.75), mat(TW.x, top + 1.2, 0))
  }

  return b
}

/** planar roof facet with natural-zinc standing seams (normal up). */
function facetN(b: Builder, pts: THREE.Vector3[]) {
  kitFacet(b, ZN, pts, { seams: SEAM, thickness: 0.1 })
}

/** Hipped roof on a rectangle (overhang included) at eave height y. */
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
    const h = hd * t
    const r1 = V(cx - (hw - hd), y + h, cz)
    const r2 = V(cx + (hw - hd), y + h, cz)
    fs = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    ls = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    const h = hw * t
    const r1 = V(cx, y + h, cz - (hd - hw))
    const r2 = V(cx, y + h, cz + (hd - hw))
    fs = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    ls = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of fs) facetN(b, f)
  for (const [a, c] of ls) b.beam(ZN, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.18, 0.1)
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [1, 11, 3],
  materials: () => ({
    luWall: new THREE.MeshStandardMaterial({ color: '#b9b5a0', roughness: 0.9 }),
    luWallDark: new THREE.MeshStandardMaterial({ color: '#aaa691', roughness: 0.9 }),
    luStone: new THREE.MeshStandardMaterial({ color: '#cbc9c1', roughness: 0.86 }),
    luDoor: new THREE.MeshStandardMaterial({ color: '#7a3b22', roughness: 0.7 }),
    luFrame: new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.6 }),
  }),
  notes:
    'Romanesque-revival hall church with a single west tower (square belfry, octagonal clock stage, octagonal spire); roofs and spire shown in natural titanium-zinc standing seam as supplied in 2023 — the reference photos predate the works.',
}
export default model
