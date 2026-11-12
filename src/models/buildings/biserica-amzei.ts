/**
 * Biserica Amzei, Str. Biserica Amzei 12, București (1898–1901).
 *
 * Modelling specification derived from the reference photographs (01–07) and
 * the OSM outline (way 76915020, 29.9 × 17.8 m, long axis 69.1°), real metres:
 *  - Cross-shaped (triconch) plan, altar apse at +X (ENE). Main body 12 m wide:
 *    nave (x −11.4…0.1), crossing square 12 × 12 m (x 0.1…12.1) and a narrower
 *    western bay (x −15…−11.4, 9.7 m wide) between the two west towers.
 *  - Three polygonal apses (three faces each, short straight returns) on the
 *    north, south and east sides, closed by faceted zinc half-domes with roll
 *    caps and a zinc ball finial in front of the arm gable (photo 02).
 *  - Crossing: four gabled arms (40°) with richly moulded stone rakes, a stone
 *    cross on every apex and on the shoulder piers; square corner blocks with
 *    an arcaded brick frieze in the re-entrant angles (photos 03, 04, 05).
 *  - Central dome: octagonal bell-shaped zinc dome with roll caps on the hips,
 *    stepped zinc neck, round lantern with eight arched stained-glass windows
 *    between engaged columns, ribbed zinc cap and cross (photos 04, 06).
 *  - Two west towers on the nave's west corners: square stage with a brick-
 *    voussoir arch, arcade frieze and flat zinc cap, octagonal colonnaded
 *    belfry with louvred openings, ribbed zinc dome and cross (photos 01, 05, 07).
 *  - Façades: pale render with red brick bands, tall round-arched windows with
 *    alternating brick/plaster voussoirs, arcade frieze ("ocnițe") under a
 *    stone cornice, high stone plinth; side porches with two columns and a
 *    small zinc gable roof on the western bay (photo 05).
 *  - COLOR METAL scope: elZinc® Natural titanium-zinc on every roof, dome,
 *    half-dome and tower cap; rendered with the blue-grey weathered tone of
 *    the photographs.
 * Approximations: absolute heights (no survey; scaled from photo proportions),
 * west-end arrangement and porches (one oblique photo + OSM outline), south
 * elevation (mirrored), stucco ornament, stained glass and tracery simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, loft, lathe, extrude, opening, frameShape, polyRing, gableRoof, helm, dome, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const PL = 2.0 // raised stone plinth
const EAVE = 11.2 // nave / apse cornice top
const ARM = 13.8 // crossing arms: gable base
const CB_TOP = 15.2 // corner blocks: wall top
const DOME_Y = 15.95 // dome springing
const CX = 6.1 // crossing centre (x)
const HW = 6.0 // main body half width
const PITCH = 40
const T40 = Math.tan((PITCH * Math.PI) / 180)
const WB = { x0: -15.0, x1: -11.4, hw: 4.85, eave: 9.6 }
const TW = { x: -9.95, z: 4.55, hw: 1.6, top: 14.0 }
const BANDS = [3.15, 4.6, 6.05, 7.5]

const ZN = 'amzZinc'
const WALL = 'amzWall'
const ST = 'stoneLight'
const BR = 'brickRed'
const SEAM = { key: ZN, spacing: 0.52, h: 0.04, w: 0.045 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const shapeGeo = (pts: THREE.Vector2[]) => new THREE.ShapeGeometry(new THREE.Shape(pts))

/* ------------------------------------------------------------------ */
/* outlines                                                            */
/* ------------------------------------------------------------------ */

const area = (o: P2[]) => o.reduce((s, p, i) => s + p[0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * p[1], 0)
const orient = (o: P2[]) => (area(o) < 0 ? [...o].reverse() : o)

/** Offset a closed outline (loft ring order, positive area) outwards by g. */
function offsetOutline(o: P2[], g: number): P2[] {
  if (!g) return o
  const n = o.length
  return o.map((p, i) => {
    const a = o[(i - 1 + n) % n]
    const c = o[(i + 1) % n]
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1])
    const l2 = Math.hypot(c[0] - p[0], c[1] - p[1])
    const m1: P2 = [(p[1] - a[1]) / l1, -(p[0] - a[0]) / l1]
    const m2: P2 = [(c[1] - p[1]) / l2, -(c[0] - p[0]) / l2]
    const k = g / (1 + m1[0] * m2[0] + m1[1] * m2[1])
    return [p[0] + (m1[0] + m2[0]) * k, p[1] + (m1[1] + m2[1]) * k]
  })
}
const ring = (o: P2[], y: number) => o.map(([x, z]) => V(x, y, z))
function prismO(b: Builder, key: string, o: P2[], y0: number, y1: number, g = 0) {
  const oo = offsetOutline(o, g)
  b.add(key, loft([ring(oo, y0), ring(oo, y1)], { capTop: true, flat: true }))
}

/** Wall face a→c (ring order): frame matrix (local x along the face, z outward) and length. */
function face(a: P2, c: P2) {
  const dx = c[0] - a[0]
  const dz = c[1] - a[1]
  const L = Math.hypot(dx, dz)
  const n: P2 = [dz / L, -dx / L]
  return { m: mat((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, Math.atan2(n[0], n[1])), L, n }
}

/* ------------------------------------------------------------------ */
/* façade details                                                      */
/* ------------------------------------------------------------------ */

function sector(r1: number, r2: number, a0: number, a1: number, cy: number, seg = 2) {
  const s = new THREE.Shape()
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg
    if (i === 0) s.moveTo(Math.cos(a) * r2, cy + Math.sin(a) * r2)
    else s.lineTo(Math.cos(a) * r2, cy + Math.sin(a) * r2)
  }
  for (let i = seg; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / seg
    s.lineTo(Math.cos(a) * r1, cy + Math.sin(a) * r1)
  }
  return s
}

/** Alternating red-brick / plaster voussoirs around a semicircular arch springing at ys. */
function voussoirs(b: Builder, m: THREE.Matrix4, r: number, ys: number, t: number, n: number, depth = 0.08) {
  for (let k = 0; k < n; k++) b.add(k % 2 ? WALL : BR, extrude(sector(r, r + t, (Math.PI * k) / n, (Math.PI * (k + 1)) / n, ys, 2), depth), m)
}

/** Round-arched window with stone reveal, brick/plaster voussoirs and sill. */
function archWindow(b: Builder, m: THREE.Matrix4, x: number, w: number, h: number, y0: number, glass = 'glassC', brick = true) {
  const mm = M(m, mat(x, 0, 0))
  b.add(glass, shapeGeo(opening('round', w, h, 0, y0, 12)), M(mm, mat(0, 0, 0.05)))
  b.add(ST, extrude(frameShape('round', w, h, 0.09, 0, y0), 0.1), mm)
  if (brick) voussoirs(b, mm, w / 2 + 0.09, y0 + h - w / 2, 0.32, 9)
  b.add(ST, metricBox(w + 0.42, 0.14, 0.26), M(mm, mat(0, y0 - 0.08, 0.1)))
}

/** Red brick bands across a wall face (proud 0.035 m). */
function bands(b: Builder, m: THREE.Matrix4, L: number, ys = BANDS) {
  ys.forEach((y, i) => b.add(BR, metricBox(L, i === 0 ? 0.55 : 0.45, 0.07), M(m, mat(0, y + (i === 0 ? 0.275 : 0.225), 0))))
}

/** Arcade frieze of small brick-voussoir arches on stone corbels ("ocnițe"). */
function frieze(b: Builder, m: THREE.Matrix4, L: number, y: number) {
  const n = Math.max(2, Math.round(L / 0.74))
  const step = L / n
  b.add(ST, metricBox(L, 0.13, 0.16), M(m, mat(0, y - 0.32, 0.04)))
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + 0.5)
    const mm = M(m, mat(x, 0, 0))
    voussoirs(b, mm, step * 0.33, y, 0.11, 3, 0.07)
    b.add(ST, metricBox(0.16, 0.24, 0.14), M(m, mat(x - step / 2, y - 0.12, 0.06)))
  }
}

/** Plain pilaster strip at a vertical corner (box rotated to the corner bisector). */
function pilaster(b: Builder, p: P2, ang: number, y0: number, y1: number, w = 0.62) {
  b.add(WALL, metricBox(w, y1 - y0, w), mat(p[0], (y0 + y1) / 2, p[1], ang))
}

/** Stone cross ornament (Greek cross with disc) facing outward normal n. */
function stoneCross(b: Builder, x: number, y: number, z: number, n: P2, s = 1) {
  const m = mat(x, y, z, Math.atan2(n[0], n[1]))
  b.add(ST, metricBox(0.75 * s, 0.5 * s, 0.6 * s), M(m, mat(0, 0.25 * s, 0)))
  b.add(ST, metricBox(0.34 * s, 1.25 * s, 0.26 * s), M(m, mat(0, 1.1 * s, 0)))
  b.add(ST, metricBox(1.05 * s, 0.34 * s, 0.26 * s), M(m, mat(0, 1.15 * s, 0)))
  b.add(ST, new THREE.CylinderGeometry(0.27 * s, 0.27 * s, 0.34 * s, 14), M(m, mat(0, 1.15 * s, 0, 0, Math.PI / 2)))
}

/** Roll caps along the vertex lines of a faceted lofted roof. */
function rollCaps(b: Builder, rings: THREE.Vector3[][], idx: number[], w = 0.11) {
  for (const k of idx) for (let i = 0; i < rings.length - 1; i++) b.rod(ZN, rings[i][k].clone().add(V(0, 0.03, 0)), rings[i + 1][k].clone().add(V(0, 0.03, 0)), w, 6)
}

/* ------------------------------------------------------------------ */
/* apses                                                               */
/* ------------------------------------------------------------------ */

/**
 * Three-faced apse on a wall line: origin o (on the wall), outward unit nrm.
 * Local (u along wall, v outward) points: wall ±hw, returns to v = ret,
 * front face ±fw at depth d.
 */
function apse(b: Builder, o: P2, nrm: P2, hw: number, ret: number, fw: number, d: number, win: { w: number; front: number }) {
  const t: P2 = [-nrm[1], nrm[0]]
  const W = (u: number, v: number): P2 => [o[0] + u * t[0] + v * nrm[0], o[1] + u * t[1] + v * nrm[1]]
  let outline: P2[] = [W(-hw, -0.02), W(-hw, ret), W(-fw, d), W(fw, d), W(hw, ret), W(hw, -0.02)]
  outline = orient(outline)
  prismO(b, WALL, outline, 0, EAVE)
  prismO(b, 'socle', outline, 0, PL, 0.12)
  prismO(b, ST, outline, PL - 0.18, PL, 0.2)
  BANDS.forEach((y, i) => prismO(b, BR, outline, y, y + (i === 0 ? 0.55 : 0.45), 0.035))
  // cornice (stepped)
  prismO(b, ST, outline, EAVE - 1.25, EAVE - 0.95, 0.08)
  prismO(b, ST, outline, EAVE - 0.7, EAVE - 0.4, 0.22)
  prismO(b, ST, outline, EAVE - 0.4, EAVE, 0.42)
  // faces 1-2 (return), 2-3 / 3-4 / 4-5 (outer faces) — find by index after orientation
  for (let i = 1; i <= 3; i++) {
    const f = face(outline[i], outline[i + 1])
    frieze(b, f.m, f.L - 0.7, EAVE - 1.7)
    archWindow(b, f.m, 0, i === 2 ? win.front : win.w, 3.9, 4.0)
  }
  // pilasters on the four outer corners
  for (let i = 1; i <= 4; i++) {
    const p = outline[i]
    const a = outline[i - 1]
    const c = outline[i + 1]
    const ang = Math.atan2(c[0] - a[0], c[1] - a[1]) + Math.PI / 2
    pilaster(b, p, ang, PL, EAVE - 1.25, 0.5)
  }
  // faceted half-dome (titanium-zinc) with roll caps and ball finial
  const C = W(0, -0.1)
  const HD = 3.3
  const st: [number, number][] = [
    [1.05, -0.12],
    [1.0, 0.45],
    [0.95, 1.15],
    [0.86, 1.85],
    [0.73, 2.5],
    [0.55, 3.05],
    [0.34, 3.4],
    [0.13, 3.58],
    [0.02, 3.6],
  ]
  const rings = st.map(([s, dy]) => {
    const oo = offsetOutline(outline, 0.08)
    return oo.map(([x, z]) => V(C[0] + (x - C[0]) * s, EAVE + dy * (HD / 3.6), C[1] + (z - C[1]) * s))
  })
  b.add(ZN, loft(rings, {}))
  rollCaps(b, rings.slice(0, -1), [1, 2, 3, 4], 0.09)
  // gutter roll at the eave
  for (let i = 0; i < 5; i++) b.rod(ZN, rings[0][i].clone().add(V(0, 0.05, 0)), rings[0][i + 1].clone().add(V(0, 0.05, 0)), 0.1, 6)
  // finial on top (zinc), slightly in front of the gable wall
  const top = W(0, 0.32)
  const fin: [number, number][] = [
    [0.34, 0],
    [0.3, 0.12],
    [0.16, 0.3],
    [0.13, 0.55],
    [0.24, 0.7],
    [0.3, 0.9],
    [0.24, 1.12],
    [0.08, 1.25],
    [0.0, 1.3],
  ]
  b.add(ZN, lathe(fin, 12), mat(top[0], EAVE + HD - 0.05, top[1]))
}

/* ------------------------------------------------------------------ */
/* towers                                                              */
/* ------------------------------------------------------------------ */

function westTower(b: Builder, tx: number, tz: number, outer: P2) {
  const h = TW.hw
  const o: P2[] = [
    [tx - h, tz - h],
    [tx + h, tz - h],
    [tx + h, tz + h],
    [tx - h, tz + h],
  ]
  prismO(b, WALL, o, 0, TW.top)
  prismO(b, 'socle', o, 0, PL, 0.12)
  for (let i = 0; i < 4; i++) {
    const f = face(o[i], o[(i + 1) % 4])
    const isOuter = Math.abs(f.n[0] - outer[0]) + Math.abs(f.n[1] - outer[1]) < 0.01
    const isWest = f.n[0] < -0.9
    if (isOuter || isWest) bands(b, f.m, f.L - 0.5)
    // blind arch with brick voussoirs above the nave cornice
    archWindow(b, f.m, 0, 1.0, 1.65, 11.75, 'glassC')
    frieze(b, f.m, f.L - 0.3, TW.top - 0.95)
  }
  for (const p of o) pilaster(b, p, Math.atan2(p[0] - tx, p[1] - tz), PL, TW.top - 1.4, 0.5)
  prismO(b, ST, o, TW.top - 0.5, TW.top - 0.25, 0.18)
  prismO(b, ST, o, TW.top - 0.25, TW.top, 0.36)
  // flat zinc cap (low hip)
  helm(b, ZN, { x: tx, z: tz, n: 4, phase: Math.PI / 4, stations: [[(h + 0.42) * Math.SQRT2, TW.top], [(h + 0.3) * Math.SQRT2, TW.top + 0.12], [1.5, TW.top + 0.42]], flat: true })
  // octagonal colonnaded belfry
  const y0 = TW.top + 0.42
  const y1 = y0 + 3.55
  const ap = 1.12
  const R = ap / Math.cos(Math.PI / 8)
  b.add(WALL, loft([polyRing(8, R, y0, Math.PI / 8, tx, tz), polyRing(8, R, y1, Math.PI / 8, tx, tz)], { capTop: true, flat: true }))
  b.add(ST, loft([polyRing(8, R + 0.12, y0, Math.PI / 8, tx, tz), polyRing(8, R + 0.12, y0 + 0.3, Math.PI / 8, tx, tz)], { capTop: true, flat: true }))
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const n: P2 = [Math.cos(a), Math.sin(a)]
    const m = mat(tx + n[0] * ap, 0, tz + n[1] * ap, Math.atan2(n[0], n[1]))
    b.add('black', shapeGeo(opening('round', 0.5, 1.95, 0, y0 + 0.55, 10)), M(m, mat(0, 0, 0.03)))
    b.add(ST, extrude(frameShape('round', 0.5, 1.95, 0.07, 0, y0 + 0.55), 0.08), m)
    for (let s = 0; s < 6; s++) b.add('wood', metricBox(0.5, 0.05, 0.05), M(m, mat(0, y0 + 0.75 + s * 0.24, 0.02, 0, -0.5)))
    // colonnette on the vertex
    const va = a + Math.PI / 8
    const cxv = tx + Math.cos(va) * (R + 0.04)
    const czv = tz + Math.sin(va) * (R + 0.04)
    b.add(ST, new THREE.CylinderGeometry(0.085, 0.1, y1 - y0 - 0.5, 8), mat(cxv, (y0 + y1) / 2, czv))
    b.add(ST, metricBox(0.26, 0.2, 0.26), mat(cxv, y1 - 0.2, czv, va))
  }
  b.add(ST, loft([polyRing(8, R + 0.1, y1 - 0.1, Math.PI / 8, tx, tz), polyRing(8, R + 0.26, y1 + 0.2, Math.PI / 8, tx, tz)], { capTop: true, capBottom: true, flat: true }))
  // ribbed bell dome + cross
  const cap: [number, number][] = [
    [1.0, 0],
    [0.99, 0.12],
    [0.94, 0.35],
    [0.82, 0.6],
    [0.62, 0.82],
    [0.36, 0.96],
    [0.12, 1.0],
    [0.02, 1.0],
  ]
  const dt = dome(b, ZN, { x: tx, z: tz, y: y1 + 0.2, r: 1.3, h: 1.3, profile: cap, seg: 24, ribs: 8, ribH: 0.06 })
  b.add(ZN, new THREE.CylinderGeometry(0.12, 0.2, 0.35, 10), mat(tx, dt + 0.15, tz))
  cross(b, 'gilt', tx, dt + 0.25, tz, 1.5, false, Math.PI / 2)
}

/* ------------------------------------------------------------------ */

function build(): Builder {
  const b = new Builder()

  /* ---------------- main masses ---------------- */
  // nave
  const nave: P2[] = [
    [-11.4, -HW],
    [0.1, -HW],
    [0.1, HW],
    [-11.4, HW],
  ]
  prismO(b, WALL, nave, 0, EAVE)
  prismO(b, 'socle', nave, 0, PL, 0.12)
  prismO(b, ST, nave, PL - 0.18, PL, 0.2)
  // crossing square (walls up to the gable base)
  const crossing: P2[] = [
    [0.1, -HW],
    [12.1, -HW],
    [12.1, HW],
    [0.1, HW],
  ]
  prismO(b, WALL, crossing, 0, ARM)
  prismO(b, 'socle', crossing, 0, PL, 0.12)
  prismO(b, ST, crossing, PL - 0.18, PL, 0.2)
  // main cornice continues round nave + crossing; second cornice at the gable base
  for (const o of [nave, crossing]) {
    prismO(b, ST, o, EAVE - 1.25, EAVE - 0.95, 0.08)
    prismO(b, ST, o, EAVE - 0.7, EAVE - 0.4, 0.22)
    prismO(b, ST, o, EAVE - 0.4, EAVE, 0.42)
  }
  prismO(b, ST, crossing, ARM - 0.45, ARM - 0.2, 0.15)
  prismO(b, ST, crossing, ARM - 0.2, ARM, 0.3)
  // west bay (between the towers)
  const wb: P2[] = [
    [WB.x0, -WB.hw],
    [WB.x1 + 0.2, -WB.hw],
    [WB.x1 + 0.2, WB.hw],
    [WB.x0, WB.hw],
  ]
  prismO(b, WALL, wb, 0, WB.eave)
  prismO(b, 'socle', wb, 0, PL, 0.12)
  prismO(b, ST, wb, PL - 0.18, PL, 0.2)
  prismO(b, ST, wb, WB.eave - 0.7, WB.eave - 0.4, 0.2)
  prismO(b, ST, wb, WB.eave - 0.4, WB.eave, 0.4)

  /* ---------------- corner blocks of the crossing ---------------- */
  for (const sx of [0, 1]) {
    for (const sz of [-1, 1]) {
      const x0 = sx ? 10.1 : 0.1
      const zc = sz * 5.0
      const o: P2[] = [
        [x0, zc - 1],
        [x0 + 2, zc - 1],
        [x0 + 2, zc + 1],
        [x0, zc + 1],
      ]
      prismO(b, WALL, o, ARM - 0.5, CB_TOP)
      for (let i = 0; i < 4; i++) {
        const f = face(o[i], o[(i + 1) % 4])
        const outward = f.n[0] * (x0 + 1 - CX) + f.n[1] * zc > 0
        if (outward) frieze(b, f.m, f.L - 0.2, CB_TOP - 0.55)
      }
      prismO(b, ST, o, CB_TOP - 0.25, CB_TOP, 0.16)
      prismO(b, ST, o, CB_TOP, CB_TOP + 0.3, 0.32)
      helm(b, ZN, { x: x0 + 1, z: zc, n: 4, phase: Math.PI / 4, stations: [[1.32 * Math.SQRT2, CB_TOP + 0.3], [0.5, CB_TOP + 1.0]], flat: true })
    }
  }

  /* ---------------- façade bands, frieze, windows ---------------- */
  // nave long walls (between tower and crossing)
  for (const sz of [-1, 1]) {
    const a: P2 = sz < 0 ? [-8.35, -HW] : [0.1, HW]
    const c: P2 = sz < 0 ? [0.1, -HW] : [-8.35, HW]
    const f = face(a, c)
    bands(b, f.m, f.L)
    frieze(b, f.m, f.L - 0.4, EAVE - 1.7)
    // triple window
    archWindow(b, f.m, -1.0, 0.72, 3.5, 4.2)
    archWindow(b, f.m, 0, 0.72, 3.9, 4.2)
    archWindow(b, f.m, 1.0, 0.72, 3.5, 4.2)
    pilaster(b, sz < 0 ? [0.1, -HW] : [0.1, HW], 0, PL, EAVE - 1.25, 0.66)
  }
  // crossing walls beside the apses (corner piers) and the attic between the cornices
  for (const sz of [-1, 1]) {
    for (const [x0, x1] of [
      [0.1, 2.6],
      [9.6, 12.1],
    ]) {
      const f = face(sz < 0 ? [x0, -HW] : [x1, HW], sz < 0 ? [x1, -HW] : [x0, HW])
      bands(b, f.m, f.L)
      bands(b, f.m, f.L, [11.9])
    }
    // east wall beside the altar apse
    const fe = face(sz < 0 ? [12.1, -HW] : [12.1, 3.8], sz < 0 ? [12.1, -3.8] : [12.1, HW])
    bands(b, fe.m, fe.L)
    for (const x of [0.1, 12.1]) pilaster(b, [x, sz * HW], 0, PL, ARM - 0.45, 0.62)
  }
  // west bay walls
  {
    const fw = face([WB.x0, WB.hw], [WB.x0, -WB.hw])
    bands(b, fw.m, fw.L)
    frieze(b, fw.m, fw.L - 0.6, WB.eave - 1.15)
    archWindow(b, fw.m, 0, 1.25, 3.6, 4.0)
    for (const sz of [-1, 1]) {
      const f = face(sz < 0 ? [WB.x0, -WB.hw] : [WB.x1, WB.hw], sz < 0 ? [WB.x1, -WB.hw] : [WB.x0, WB.hw])
      bands(b, f.m, f.L)
      frieze(b, f.m, f.L - 0.4, WB.eave - 1.15)
      pilaster(b, [WB.x0, sz * WB.hw], 0, PL, WB.eave - 0.7, 0.55)
    }
  }

  /* ---------------- apses ---------------- */
  for (const sz of [-1, 1]) apse(b, [CX, sz * HW], [0, sz], 3.5, 1.15, 1.7, 2.95, { w: 0.95, front: 1.05 })
  apse(b, [12.1, 0], [1, 0], 3.8, 0.9, 2.05, 2.85, { w: 0.95, front: 1.1 })

  /* ---------------- roofs (elZinc titanium-zinc) ---------------- */
  // nave
  gableRoof(b, ZN, { x: -4.7, w: 13.4, d: 2 * HW, y: EAVE, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.35, seams: SEAM })
  // crossing arms (cross gable)
  gableRoof(b, ZN, { x: CX, w: 8.0, d: 2 * HW, y: ARM, pitch: PITCH, ridge: 'z', wallKey: WALL, overhang: 0.3, seams: SEAM })
  gableRoof(b, ZN, { x: CX, w: 2 * HW, d: 8.0, y: ARM, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.3, seams: SEAM })
  // west bay
  gableRoof(b, ZN, { x: (WB.x0 + WB.x1) / 2, w: WB.x1 - WB.x0, d: 2 * WB.hw, y: WB.eave, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.3, seams: SEAM })

  // gable rakes, apex crosses, shoulder piers (four crossing gables + west gable)
  const gables: { c: P2; n: P2; hw: number; y: number }[] = [
    { c: [CX, -HW], n: [0, -1], hw: 4, y: ARM },
    { c: [CX, HW], n: [0, 1], hw: 4, y: ARM },
    { c: [12.1, 0], n: [1, 0], hw: 4, y: ARM },
    { c: [0.1, 0], n: [-1, 0], hw: 4, y: ARM },
    { c: [WB.x0, 0], n: [-1, 0], hw: WB.hw, y: WB.eave },
  ]
  gables.forEach((g, gi) => {
    const t: P2 = [-g.n[1], g.n[0]]
    const P = (u: number, y: number, out: number) => V(g.c[0] + t[0] * u + g.n[0] * out, y, g.c[1] + t[1] * u + g.n[1] * out)
    const apexY = g.y + g.hw * T40
    const nv = V(g.n[0], 0, g.n[1])
    for (const s of [-1, 1]) {
      b.beam(ST, P(s * (g.hw + 0.25), g.y + 0.05, 0.12), P(0, apexY + 0.3, 0.12), 0.55, 0.3, nv)
      b.beam(ST, P(s * (g.hw - 0.2), g.y + 0.05, 0.22), P(0, apexY - 0.25, 0.22), 0.22, 0.2, nv)
    }
    b.add(ST, metricBox(2 * g.hw + 0.4, 0.3, 0.4), M(mat(g.c[0], 0, g.c[1], Math.atan2(g.n[0], g.n[1])), mat(0, g.y - 0.05, 0.15)))
    if (gi === 3) return // west arm gable sits on the nave roof: rakes only
    const a = P(0, apexY + 0.25, 0.15)
    stoneCross(b, a.x, a.y, a.z, g.n, gi === 4 ? 0.8 : 1.05)
    if (gi < 4) {
      for (const s of [-1, 1]) {
        const p = P(s * (g.hw + 0.25), g.y, 0.1)
        b.add(ST, metricBox(0.66, 2.0, 0.66), mat(p.x, g.y + 1.0, p.z, Math.atan2(g.n[0], g.n[1])))
        b.add(ST, metricBox(0.8, 0.2, 0.8), mat(p.x, g.y + 2.05, p.z, Math.atan2(g.n[0], g.n[1])))
        stoneCross(b, p.x, g.y + 2.15, p.z, g.n, 0.62)
      }
    }
  })

  /* ---------------- central dome, neck, lantern ---------------- */
  b.add(ST, loft([polyRing(8, 4.95, DOME_Y - 0.4, Math.PI / 8, CX, 0), polyRing(8, 5.05, DOME_Y, Math.PI / 8, CX, 0)], { capTop: true, capBottom: true, flat: true }))
  const ds: [number, number][] = [
    [4.85, DOME_Y],
    [4.8, DOME_Y + 0.45],
    [4.6, DOME_Y + 1.3],
    [4.22, DOME_Y + 2.25],
    [3.7, DOME_Y + 3.15],
    [3.12, DOME_Y + 3.9],
    [2.66, DOME_Y + 4.45],
    [2.44, DOME_Y + 4.8],
    [2.4, DOME_Y + 5.0],
  ]
  helm(b, ZN, { x: CX, z: 0, n: 8, phase: Math.PI / 8, stations: ds })
  rollCaps(
    b,
    ds.map(([r, y]) => polyRing(8, r + 0.03, y, Math.PI / 8, CX, 0)),
    [0, 1, 2, 3, 4, 5, 6, 7],
    0.12,
  )
  // stepped zinc neck
  const ny = DOME_Y + 5.0
  b.add(ZN, loft([polyRing(8, 2.55, ny - 0.05, Math.PI / 8, CX, 0), polyRing(8, 2.55, ny + 0.25, Math.PI / 8, CX, 0), polyRing(8, 2.32, ny + 0.32, Math.PI / 8, CX, 0)], { capTop: true, flat: true }))
  b.add(ZN, loft([polyRing(24, 2.22, ny + 0.3, 0, CX, 0), polyRing(24, 2.22, ny + 0.6, 0, CX, 0), polyRing(24, 2.05, ny + 0.66, 0, CX, 0)], { capTop: true }))
  // lantern drum
  const ly0 = ny + 0.66
  const ly1 = ly0 + 3.7
  const lr = 1.85
  b.add(WALL, loft([polyRing(32, lr, ly0, 0, CX, 0), polyRing(32, lr, ly1, 0, CX, 0)], { capTop: true }))
  b.add(ST, loft([polyRing(32, lr + 0.12, ly0, 0, CX, 0), polyRing(32, lr + 0.12, ly0 + 0.35, 0, CX, 0)], { capTop: true }))
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8
    const n: P2 = [Math.cos(a), Math.sin(a)]
    const m = mat(CX + n[0] * (lr - 0.02), 0, n[1] * (lr - 0.02), Math.atan2(n[0], n[1]))
    b.add('amzStained', shapeGeo(opening('round', 0.6, 2.25, 0, ly0 + 0.65, 10)), M(m, mat(0, 0, 0.05)))
    b.add('wood', extrude(frameShape('round', 0.6, 2.25, 0.05, 0, ly0 + 0.65), 0.07), m)
    // hood arch over the window
    b.add(ST, extrude(sector(0.36, 0.5, 0, Math.PI, ly0 + 0.65 + 2.25 - 0.3, 8), 0.14), m)
    // engaged column between windows
    const ca = a + Math.PI / 8
    const px = CX + Math.cos(ca) * (lr + 0.08)
    const pz = Math.sin(ca) * (lr + 0.08)
    b.add(ST, new THREE.CylinderGeometry(0.15, 0.16, ly1 - ly0 - 0.5, 10), mat(px, ly0 + 0.35 + (ly1 - ly0 - 0.5) / 2, pz))
    for (const yy of [ly0 + 0.45, ly0 + 1.9]) b.add(ST, new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), mat(px, yy, pz))
    b.add(ST, metricBox(0.42, 0.32, 0.42), mat(px, ly1 - 0.25, pz, -ca))
  }
  b.add(ST, loft([polyRing(32, lr + 0.05, ly1 - 0.15, 0, CX, 0), polyRing(32, lr + 0.32, ly1 + 0.15, 0, CX, 0), polyRing(32, lr + 0.32, ly1 + 0.3, 0, CX, 0)], { capTop: true, capBottom: true }))
  const capP: [number, number][] = [
    [1.0, 0],
    [0.99, 0.1],
    [0.95, 0.3],
    [0.84, 0.55],
    [0.64, 0.78],
    [0.38, 0.93],
    [0.14, 0.99],
    [0.02, 1.0],
  ]
  const ct = dome(b, ZN, { x: CX, z: 0, y: ly1 + 0.3, r: 2.12, h: 1.55, profile: capP, seg: 32, ribs: 8, ribH: 0.07 })
  b.add(ZN, new THREE.CylinderGeometry(0.16, 0.26, 0.45, 12), mat(CX, ct + 0.2, 0))
  cross(b, 'gilt', CX, ct + 0.35, 0, 2.2, false, Math.PI / 2)

  /* ---------------- west towers ---------------- */
  for (const sz of [-1, 1]) westTower(b, TW.x, sz * TW.z, [0, sz])

  /* ---------------- side porches of the western bay ---------------- */
  for (const sz of [-1, 1]) {
    const px = (WB.x0 + WB.x1) / 2
    const z0 = sz * WB.hw
    const dep = 1.5
    const zc = z0 + sz * dep / 2
    const fm = mat(px, 0, z0, sz > 0 ? 0 : Math.PI)
    // door
    b.add('wood', shapeGeo(opening('round', 1.35, 3.1, 0, PL, 12)), M(fm, mat(0, 0, 0.04)))
    b.add(ST, extrude(frameShape('round', 1.35, 3.1, 0.18, 0, PL), 0.14), fm)
    // landing + steps
    b.block(ST, 3.4, PL, dep + 0.2, px, 0, zc)
    for (let i = 1; i < 5; i++) b.block(ST, 2.6, PL - i * 0.4, 0.32, px, 0, z0 + sz * (dep + 0.2 + 0.16 + (i - 1) * 0.32))
    // two columns on pedestals
    for (const s of [-1, 1]) {
      const cx = px + s * 1.25
      const cz = z0 + sz * (dep - 0.25)
      b.block(ST, 0.7, 1.2, 0.7, cx, PL, cz)
      b.add(ST, new THREE.CylinderGeometry(0.21, 0.25, 3.9, 14), mat(cx, PL + 1.2 + 1.95, cz))
      b.add(ST, new THREE.CylinderGeometry(0.29, 0.29, 0.16, 14), mat(cx, PL + 1.2 + 1.8, cz))
      b.block(ST, 0.66, 0.45, 0.66, cx, PL + 5.1, cz)
    }
    // entablature, pediment and small zinc gable roof
    const ey = PL + 5.55
    b.block(ST, 3.5, 0.55, dep + 0.1, px, ey, zc)
    gableRoof(b, ZN, { x: px, z: zc + sz * 0.1, w: 3.5, d: dep + 0.3, y: ey + 0.55, pitch: 34, ridge: 'z', wallKey: ST, overhang: 0.25, seams: SEAM })
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [CX, 18.2, -4.6],
  materials: (base) => {
    const zinc = (base.zincSlate as THREE.MeshStandardMaterial).clone()
    zinc.color.set('#a2afbe')
    return {
      amzZinc: zinc,
      amzWall: new THREE.MeshStandardMaterial({ color: '#f1e3d7', roughness: 0.9 }),
      amzStained: new THREE.MeshStandardMaterial({ color: '#4b5d6a', metalness: 0.35, roughness: 0.25, emissive: '#1d2a33', emissiveIntensity: 0.15 }),
    }
  },
  notes: 'Proportions scaled from the photographs and the OSM outline; heights, west-end porches and the south elevation approximated; stucco ornament simplified.',
}
export default model
