/**
 * Biserica „Înălțarea Domnului” – Domnița Bălașa, Str. Sfinții Apostoli 60,
 * București (1881–1885, roof restored 2018–2022).
 *
 * Modelling specification derived from the reference photographs (01–12) and
 * the OSM outline (way 78564921, 35.8 × 23.8 m, long axis 111.2°), real metres,
 * +X = towards the altar (ESE):
 *  - Neo-Byzantine cross-in-square with five towers (quincunx): a central
 *    block 17.1 × 21.6 m (x −5.7…11.4) with gabled north and south arms and
 *    four corner bays carrying the small towers; a narrower western bay
 *    (13.8 m) with the main gable, rose window and arcaded entrance porch;
 *    a short chancel and a three-faced polygonal altar apse to the east;
 *    two small columned side porches on each long side (photo 07, OSM).
 *  - Polychrome masonry: cream stone courses alternating with red-brown brick
 *    bands, striped brick/stone voussoirs over the arched windows, round
 *    oculi, arcaded corbel friezes under every cornice and along the gable
 *    rakes, dark ornamental cornices (photos 03, 06, 07, 12).
 *  - Central tower: square base with small pyramid caps at the corners,
 *    octagonal drum with twin arched windows under a large arch on every
 *    face, octagonal ribbed dome with roll caps and a gilded cross (03, 12).
 *  - Four corner towers: square stage, octagonal drum with one tall arched
 *    window per face, ribbed dome, gilded cross.
 *  - Roofs (low 30° gables, apse half-hip, porch and side-porch roofs) and
 *    all domes in KME TECU® Patina Oslo pre-patinated copper, rendered in the
 *    dark teal tone of the photographs.
 * Approximations: absolute heights (OSM gives an unsourced 40 m; the photo
 * proportions suggest a lower cross, ≈ 35.5 m is used), east end and south
 * elevation (mirrored), masonry patterns reduced to bands, ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, loft, lathe, extrude, opening, frameShape, polyRing, gableRoof, helm, facet, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const WALL = 'balWall'
const BRK = 'balBrick'
const ST = 'stoneWarm'
const ORN = 'balOrn'
const CU = 'balCopper'
const PL = 1.2
const EAVE = 14.5
const PITCH = 30
const T30 = Math.tan((PITCH * Math.PI) / 180)
const CB = { x0: -5.7, x1: 11.4, hz: 10.8 } // central block
const CX = (CB.x0 + CB.x1) / 2 // 2.85
const BAY = 4.5 // corner bay size
const WB = { x0: -13.0, hz: 6.9 }
const SEAM = { key: CU, spacing: 0.5, h: 0.04, w: 0.045 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const shapeGeo = (pts: THREE.Vector2[]) => new THREE.ShapeGeometry(new THREE.Shape(pts))

/* ---------------- outline helpers ---------------- */
const area = (o: P2[]) => o.reduce((s, p, i) => s + p[0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * p[1], 0)
const orient = (o: P2[]) => (area(o) < 0 ? [...o].reverse() : o)
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
function prismO(b: Builder, key: string, o: P2[], y0: number, y1: number, g = 0, caps = true) {
  const oo = offsetOutline(o, g)
  b.add(key, loft([ring(oo, y0), ring(oo, y1)], { capTop: caps, flat: true }))
}
const rect = (x0: number, x1: number, z0: number, z1: number): P2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
]
function face(a: P2, c: P2) {
  const dx = c[0] - a[0]
  const dz = c[1] - a[1]
  const L = Math.hypot(dx, dz)
  const n: P2 = [dz / L, -dx / L]
  return { m: mat((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, Math.atan2(n[0], n[1])), L, n }
}

/** Polychrome masonry: brick bands every 0.62 m round an outline (open rings, proud 0.03 m). */
function masonry(b: Builder, o: P2[], y0: number, y1: number) {
  for (let y = y0 + 0.25; y < y1 - 0.25; y += 0.62) prismO(b, BRK, o, y, y + 0.24, 0.03, false)
}

/* ---------------- details ---------------- */
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
/** Striped brick / stone voussoirs. */
function voussoirs(b: Builder, m: THREE.Matrix4, r: number, ys: number, t: number, n: number, depth = 0.09) {
  for (let k = 0; k < n; k++) b.add(k % 2 ? ST : BRK, extrude(sector(r, r + t, (Math.PI * k) / n, (Math.PI * (k + 1)) / n, ys, 2), depth), m)
}
/** Round-arched window with striped voussoirs and sill. */
function archWindow(b: Builder, m: THREE.Matrix4, x: number, w: number, h: number, y0: number, t = 0.3) {
  const mm = M(m, mat(x, 0, 0))
  b.add('glassC', shapeGeo(opening('round', w, h, 0, y0, 12)), M(mm, mat(0, 0, 0.05)))
  b.add(ST, extrude(frameShape('round', w, h, 0.08, 0, y0), 0.1), mm)
  voussoirs(b, mm, w / 2 + 0.08, y0 + h - w / 2, t, 11)
  b.add(ST, metricBox(w + 0.36, 0.13, 0.24), M(mm, mat(0, y0 - 0.07, 0.1)))
}
/** Twin window under a big relieving arch with a roundel (main drum, transept). */
function twinWindow(b: Builder, m: THREE.Matrix4, x: number, w: number, h: number, y0: number) {
  for (const s of [-1, 1]) archWindow(b, m, x + s * (w / 2 + 0.12), w, h, y0, 0.16)
  const R = w + 0.45
  voussoirs(b, M(m, mat(x, 0, 0)), R, y0 + h - w / 2 + 0.25, 0.42, 15, 0.12)
  b.add(ST, new THREE.TorusGeometry(0.32, 0.08, 6, 16), M(m, mat(x, y0 + h + 0.4, 0.08)))
  b.add('glassC', new THREE.CircleGeometry(0.3, 16), M(m, mat(x, y0 + h + 0.4, 0.05)))
}
function oculus(b: Builder, m: THREE.Matrix4, x: number, y: number, r: number) {
  b.add('glassC', new THREE.CircleGeometry(r, 20), M(m, mat(x, y, 0.05)))
  for (let k = 0; k < 14; k++) b.add(k % 2 ? ST : BRK, extrude(sector(r, r + 0.32, (k / 14) * Math.PI * 2, ((k + 1) / 14) * Math.PI * 2, 0, 2), 0.1), M(m, mat(x, y, 0)))
}
/** Arcaded corbel frieze (small arches with roundels) along a horizontal line. */
function frieze(b: Builder, m: THREE.Matrix4, L: number, y: number) {
  const n = Math.max(2, Math.round(L / 0.62))
  const step = L / n
  b.add(ORN, metricBox(L, 0.3, 0.16), M(m, mat(0, y + step * 0.5 + 0.35, 0.06)))
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + 0.5)
    b.add(BRK, extrude(sector(step * 0.3, step * 0.45, 0, Math.PI, y, 6), 0.1), M(m, mat(x, 0, 0)))
    b.add(ST, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), M(m, mat(x, y + 0.05, 0.05, 0, Math.PI / 2)))
    b.add(ST, metricBox(0.1, 0.28, 0.12), M(m, mat(x - step / 2, y - 0.1, 0.06)))
  }
}
/** Arcade frieze stepping along a gable rake (from shoulder u0 to apex). */
function rakeFrieze(b: Builder, m: THREE.Matrix4, hw: number, yBase: number) {
  const n = Math.round(hw / 0.62)
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const u = s * (hw - (i + 0.5) * (hw / n))
      const y = yBase + (hw - Math.abs(u)) * T30 - 0.75
      b.add(BRK, extrude(sector(0.17, 0.27, 0, Math.PI, y, 6), 0.1), M(m, mat(u, 0, 0)))
      b.add(ST, metricBox(0.08, 0.5, 0.1), M(m, mat(u + s * 0.3, y - 0.2, 0.05)))
    }
  }
}
/** Cornice: stone fascia + dark ornamental band + projecting corona. */
function cornice(b: Builder, o: P2[], y: number) {
  prismO(b, ORN, o, y - 0.7, y - 0.35, 0.12)
  prismO(b, ST, o, y - 0.35, y - 0.12, 0.3)
  prismO(b, ST, o, y - 0.12, y, 0.45)
}

/** Octagonal drum + ribbed octagonal dome + gilded cross. */
function tower(b: Builder, o: { x: number; z: number; R: number; y0: number; h: number; domeH: number; twin: boolean; crossS: number }) {
  const { x, z, R, y0, h } = o
  const ph = Math.PI / 8
  const ap = R * Math.cos(ph)
  const side = 2 * R * Math.sin(ph)
  b.add(WALL, loft([polyRing(8, R, y0, ph, x, z), polyRing(8, R, y0 + h, ph, x, z)], { capTop: true, flat: true }))
  b.add(ST, loft([polyRing(8, R + 0.18, y0, ph, x, z), polyRing(8, R + 0.18, y0 + 0.45, ph, x, z)], { capTop: true, flat: true }))
  for (let y = y0 + 0.75; y < y0 + h - 1.2; y += 0.62) b.add(BRK, loft([polyRing(8, R + 0.03, y, ph, x, z), polyRing(8, R + 0.03, y + 0.2, ph, x, z)], { flat: true }))
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const n: P2 = [Math.cos(a), Math.sin(a)]
    const m = mat(x + n[0] * ap, 0, z + n[1] * ap, Math.atan2(n[0], n[1]))
    if (o.twin) twinWindow(b, m, 0, side * 0.24, h * 0.44, y0 + h * 0.2)
    else archWindow(b, m, 0, side * 0.34, h * 0.5, y0 + h * 0.22, 0.2)
    // arched panel crowning the face
    if (!o.twin) voussoirs(b, m, side / 2 - 0.3, y0 + h - side / 2 - 0.35, 0.25, 13, 0.06)
    // pilaster strip at the vertex
    const va = a + ph
    b.add(ST, metricBox(0.32, h - 0.9, 0.32), mat(x + Math.cos(va) * R, y0 + 0.45 + (h - 0.9) / 2, z + Math.sin(va) * R, -va))
  }
  // cornice with dark ornament
  b.add(ORN, loft([polyRing(8, R + 0.08, y0 + h - 0.75, ph, x, z), polyRing(8, R + 0.08, y0 + h - 0.35, ph, x, z)], { flat: true }))
  b.add(ST, loft([polyRing(8, R + 0.1, y0 + h - 0.35, ph, x, z), polyRing(8, R + 0.45, y0 + h, ph, x, z), polyRing(8, R + 0.45, y0 + h + 0.12, ph, x, z)], { capTop: true, flat: true }))
  // dome: dark ornamental base ring, octagonal ribbed shell with slight swell, roll caps
  const yd = y0 + h + 0.12
  b.add(ORN, loft([polyRing(8, R + 0.2, yd, ph, x, z), polyRing(8, R + 0.2, yd + 0.35, ph, x, z)], { capTop: true, flat: true }))
  const H = o.domeH
  const st: [number, number][] = [
    [R + 0.28, yd + 0.35],
    [R + 0.4, yd + 0.35 + H * 0.12],
    [R + 0.34, yd + 0.35 + H * 0.3],
    [R * 0.97, yd + 0.35 + H * 0.5],
    [R * 0.8, yd + 0.35 + H * 0.7],
    [R * 0.52, yd + 0.35 + H * 0.87],
    [R * 0.22, yd + 0.35 + H * 0.97],
    [R * 0.06, yd + 0.35 + H],
  ]
  helm(b, CU, { x, z, n: 8, phase: ph, stations: st })
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4
    for (let i = 0; i < st.length - 1; i++) {
      const [r0, y0r] = st[i]
      const [r1, y1r] = st[i + 1]
      b.rod(ORN, V(x + Math.cos(a) * (r0 + 0.04), y0r + 0.03, z + Math.sin(a) * (r0 + 0.04)), V(x + Math.cos(a) * (r1 + 0.04), y1r + 0.03, z + Math.sin(a) * (r1 + 0.04)), Math.max(0.07, R * 0.025), 6)
    }
  }
  // gilded crown band near the top, ball and cross
  const yt = yd + 0.35 + H
  b.add('gilt', loft([polyRing(8, R * 0.56 + 0.03, yd + 0.35 + H * 0.85, ph, x, z), polyRing(8, R * 0.44 + 0.03, yd + 0.35 + H * 0.91, ph, x, z)], { flat: true }))
  b.add('gilt', lathe([[0.02, 0], [o.crossS * 0.12, 0.05], [o.crossS * 0.14, o.crossS * 0.18], [o.crossS * 0.05, o.crossS * 0.32], [0.02, o.crossS * 0.36]], 12), mat(x, yt - 0.05, z))
  cross(b, 'gilt', x, yt + o.crossS * 0.25, z, o.crossS, false, Math.PI / 2)
  return yt
}

/** Square tower stage above the roofs with little pyramid caps at the corners. */
function towerBase(b: Builder, x: number, z: number, hw: number, y0: number, y1: number) {
  const o = rect(x - hw, x + hw, z - hw, z + hw)
  prismO(b, WALL, o, y0, y1)
  masonry(b, o, y0, y1 - 0.6)
  cornice(b, o, y1)
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const px = x + sx * (hw - 0.55)
    const pz = z + sz * (hw - 0.55)
    helm(b, CU, { x: px, z: pz, n: 4, phase: Math.PI / 4, stations: [[1.05, y1], [0.02, y1 + 1.0]], flat: true })
  }
}

/** Small columned side porch with a hipped copper roof. */
function sidePorch(b: Builder, x: number, sz: number) {
  const z0 = sz * CB.hz
  const d = 1.25
  const w = 2.8
  const h = 4.6
  const fm = mat(x, 0, z0, sz > 0 ? 0 : Math.PI)
  b.add(ST, metricBox(w + 0.2, PL, d + 0.2), M(fm, mat(0, PL / 2, d / 2)))
  for (const s of [-1, 1]) {
    b.add(ST, new THREE.CylinderGeometry(0.13, 0.15, h - PL - 0.7, 10), M(fm, mat(s * (w / 2 - 0.25), PL + (h - PL - 0.7) / 2, d - 0.25)))
    b.add(WALL, metricBox(0.4, 0.3, 0.4), M(fm, mat(s * (w / 2 - 0.25), h - 0.85, d - 0.25)))
  }
  b.add(WALL, metricBox(w, 0.7, d), M(fm, mat(0, h - 0.35, d / 2)))
  b.add(ORN, metricBox(w + 0.05, 0.25, d + 0.05), M(fm, mat(0, h - 0.55, d / 2)))
  voussoirs(b, M(fm, mat(0, 0, d)), w / 2 - 0.45, h - 1.7, 0.3, 9, 0.08)
  b.add('wood', shapeGeo(opening('round', 1.2, 2.6, 0, PL, 10)), M(fm, mat(0, 0, 0.05)))
  const hr = new Builder()
  helm(hr, CU, { n: 4, phase: Math.PI / 4, stations: [[(w / 2 + 0.25) * Math.SQRT2, 0], [0.4, 0.9]], flat: true })
  b.merge(hr, M(fm, mat(0, h, d / 2, 0, 0, 0, 1, 1, (d + 0.5) / (w + 0.5))))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- masses ---------------- */
  const central = rect(CB.x0, CB.x1, -CB.hz, CB.hz)
  const west = rect(WB.x0, CB.x0 + 0.1, -WB.hz, WB.hz)
  const chancel = rect(CB.x1 - 0.1, 13.9, -6.6, 6.6)
  const apse = orient([
    [13.8, -4.5],
    [16.4, -4.0],
    [17.9, -2.6],
    [17.9, 2.6],
    [16.4, 4.0],
    [13.8, 4.5],
  ])
  const vols: [P2[], number][] = [
    [central, EAVE],
    [west, EAVE],
    [chancel, 13.0],
    [apse, 12.0],
  ]
  for (const [o, h] of vols) {
    prismO(b, WALL, o, 0, h)
    prismO(b, 'stoneGrey', o, 0, PL, 0.12)
    prismO(b, ST, o, PL - 0.15, PL, 0.2)
    masonry(b, o, PL, h - 1.4)
    cornice(b, o, h)
  }

  /* ---------------- roofs (TECU Patina) ---------------- */
  // western bay + west arm, running into the central tower base
  gableRoof(b, CU, { x: (WB.x0 + CX) / 2, w: CX - WB.x0, d: 2 * WB.hz, y: EAVE, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.45, seams: SEAM })
  // east arm
  gableRoof(b, CU, { x: (CX + CB.x1) / 2, w: CB.x1 - CX, d: 2 * (CB.hz - BAY), y: EAVE, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.45, seams: SEAM })
  // north & south arms (gables on the long façades)
  gableRoof(b, CU, { x: CX, w: CB.x1 - CB.x0 - 2 * BAY, d: 2 * CB.hz, y: EAVE, pitch: PITCH, ridge: 'z', wallKey: WALL, overhang: 0.45, seams: SEAM })
  // chancel
  gableRoof(b, CU, { x: 12.4, w: 3.2, d: 13.2, y: 13.0, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.4, seams: SEAM })
  // apse half-hip
  {
    const oo = offsetOutline(apse, 0.45)
    const apexY = 12.0 + 4.5 * T30
    const apex = V(13.8, apexY, 0)
    const ey = 12.0 - 0.45 * T30
    for (let i = 0; i < oo.length - 1; i++) {
      const p1 = V(oo[i][0], ey, oo[i][1])
      const p2 = V(oo[i + 1][0], ey, oo[i + 1][1])
      if (Math.max(p1.x, p2.x) < 13.95) continue
      facet(b, CU, [p1, p2, apex], { seams: SEAM, thickness: 0.1 })
      b.beam(CU, p1, apex, 0.16, 0.1)
    }
  }
  // flat copper tops of the four corner bays (hidden mostly by the tower stages)
  for (const sx of [CB.x0 + BAY / 2, CB.x1 - BAY / 2]) for (const sz of [-1, 1]) b.block(CU, BAY + 0.6, 0.1, BAY + 0.6, sx, EAVE, sz * (CB.hz - BAY / 2))

  /* ---------------- gables: rake mouldings, friezes, crosses ---------------- */
  const gables: { c: P2; n: P2; hw: number; y: number; cross?: number }[] = [
    { c: [WB.x0, 0], n: [-1, 0], hw: WB.hz, y: EAVE, cross: 1.4 },
    { c: [CX, -CB.hz], n: [0, -1], hw: (CB.x1 - CB.x0 - 2 * BAY) / 2, y: EAVE },
    { c: [CX, CB.hz], n: [0, 1], hw: (CB.x1 - CB.x0 - 2 * BAY) / 2, y: EAVE },
    { c: [13.9, 0], n: [1, 0], hw: 6.6, y: 13.0 },
  ]
  for (const g of gables) {
    const t: P2 = [-g.n[1], g.n[0]]
    const P = (u: number, y: number, out: number) => V(g.c[0] + t[0] * u + g.n[0] * out, y, g.c[1] + t[1] * u + g.n[1] * out)
    const apexY = g.y + g.hw * T30
    const nv = V(g.n[0], 0, g.n[1])
    for (const s of [-1, 1]) {
      b.beam(ST, P(s * (g.hw + 0.4), g.y - 0.02, 0.15), P(0, apexY + 0.2, 0.15), 0.5, 0.35, nv)
      b.beam(ORN, P(s * (g.hw + 0.1), g.y - 0.3, 0.1), P(0, apexY - 0.12, 0.1), 0.3, 0.2, nv)
    }
    const m = mat(g.c[0], 0, g.c[1], Math.atan2(g.n[0], g.n[1]))
    rakeFrieze(b, m, g.hw - 0.4, g.y)
    if (g.cross) {
      const a = P(0, apexY + 0.3, 0.1)
      b.add(ST, metricBox(0.6, 0.5, 0.6), mat(a.x, a.y + 0.25, a.z))
      b.add('gilt', new THREE.SphereGeometry(0.22, 12, 8), mat(a.x, a.y + 0.7, a.z))
      cross(b, 'gilt', a.x, a.y + 0.6, a.z, g.cross, false, Math.atan2(g.n[0], g.n[1]))
    }
  }

  /* ---------------- façades ---------------- */
  // west façade: rose window, frieze under the gable, side windows
  {
    const f = face([WB.x0, WB.hz], [WB.x0, -WB.hz])
    frieze(b, f.m, f.L - 1.4, EAVE - 1.6)
    oculus(b, f.m, 0, 11.4, 1.35)
    for (const u of [-4.8, 4.8]) {
      archWindow(b, f.m, u, 0.85, 2.8, 8.2)
      oculus(b, f.m, u, 12.3, 0.35)
    }
    // corner piers of the central block beside the western bay
    for (const sz of [-1, 1]) {
      const fm = face(sz < 0 ? [CB.x0, -WB.hz] : [CB.x0, CB.hz], sz < 0 ? [CB.x0, -CB.hz] : [CB.x0, WB.hz])
      archWindow(b, fm.m, 0, 0.8, 2.4, 7.4)
      oculus(b, fm.m, 0, 11.6, 0.42)
    }
  }
  // long sides
  for (const sz of [-1, 1]) {
    // western bay: two tall twin windows
    const fw = face(sz < 0 ? [WB.x0, -WB.hz] : [CB.x0, WB.hz], sz < 0 ? [CB.x0, -WB.hz] : [WB.x0, WB.hz])
    frieze(b, fw.m, fw.L - 0.6, EAVE - 1.6)
    for (const u of [-1.8, 1.8]) {
      archWindow(b, fw.m, u - 0.55, 0.85, 4.4, 5.4)
      archWindow(b, fw.m, u + 0.55, 0.85, 4.4, 5.4)
    }
    // central block long façade: corner bays + gabled arm
    const fc = face(sz < 0 ? [CB.x0, -CB.hz] : [CB.x1, CB.hz], sz < 0 ? [CB.x1, -CB.hz] : [CB.x0, CB.hz])
    const L = fc.L
    for (const u of [-(L / 2 - BAY / 2), L / 2 - BAY / 2]) {
      archWindow(b, fc.m, u, 0.95, 3.0, 6.0)
      oculus(b, fc.m, u, 11.0, 0.45)
      frieze(b, M(fc.m, mat(u, 0, 0)), BAY - 0.6, EAVE - 1.6)
    }
    twinWindow(b, fc.m, 0, 0.95, 5.2, 4.8)
    oculus(b, fc.m, 0, EAVE + 1.0, 0.55)
    // side porches (two per side, OSM)
    sidePorch(b, -3.45, sz)
    sidePorch(b, 9.2, sz)
    // chancel side
    const fch = face(sz < 0 ? [CB.x1, -6.6] : [13.9, 6.6], sz < 0 ? [13.9, -6.6] : [CB.x1, 6.6])
    archWindow(b, fch.m, 0, 0.8, 2.8, 6.0)
  }
  // apse windows
  for (let i = 0; i < apse.length - 1; i++) {
    const f = face(apse[i], apse[i + 1])
    if (f.n[0] < 0.3) continue
    archWindow(b, f.m, 0, 0.8, 3.0, 5.5)
    frieze(b, f.m, f.L - 0.5, 12.0 - 1.6)
  }

  /* ---------------- west entrance porch ---------------- */
  {
    const x0 = -17.9
    const x1 = WB.x0
    const hz = 4.0
    const ph = 8.8
    const o = rect(x0, x1 + 0.1, -hz, hz)
    // open porch: piers + columns + arches, roof slab
    prismO(b, ST, o, 0, PL, 0.1)
    prismO(b, WALL, o, ph - 2.0, ph)
    masonry(b, o, ph - 2.0, ph - 0.7)
    cornice(b, o, ph)
    const fm = mat(x0, 0, 0, -Math.PI / 2)
    b.add('voidG', metricBox(0.05, ph - PL - 2.0, 2 * hz - 0.4), mat(x1 - 0.05, PL + (ph - PL - 2.0) / 2, 0))
    // three front arches on paired columns (central one larger)
    const spans: [number, number][] = [
      [-2.75, 1.7],
      [0, 3.0],
      [2.75, 1.7],
    ]
    for (const [u, w] of spans) voussoirs(b, M(fm, mat(u, 0, 0)), w / 2, ph - 2.2, 0.35, 13, 0.3)
    for (const u of [-hz + 0.35, -1.75, 1.75, hz - 0.35]) {
      for (const off of [-0.18, 0.18]) b.add(ST, new THREE.CylinderGeometry(0.16, 0.19, ph - 2.2 - PL - 0.5, 10), M(fm, mat(u + off, PL + 0.5 + (ph - 2.2 - PL - 0.5) / 2, 0.3)))
      b.add(ST, metricBox(0.8, 0.5, 0.8), M(fm, mat(u, PL + 0.25, 0.3)))
      b.add('gilt', metricBox(0.75, 0.35, 0.75), M(fm, mat(u, ph - 2.35, 0.3)))
    }
    for (const sz of [-1, 1]) {
      const sm = mat(-15.5, 0, sz * hz, sz > 0 ? 0 : Math.PI)
      voussoirs(b, sm, 0.85, ph - 3.3, 0.35, 11, 0.3)
      for (const u of [-2.0, 2.0]) b.add(ST, new THREE.CylinderGeometry(0.17, 0.19, ph - 2.2 - PL, 10), M(sm, mat(u, PL + (ph - 2.2 - PL) / 2, -0.3)))
    }
    // raised central attic with a small copper gable
    b.block(WALL, 1.4, 1.8, 3.8, x0 + 0.7, ph, 0)
    b.block(ORN, 1.45, 0.3, 3.85, x0 + 0.7, ph + 1.2, 0)
    b.add('gilt', new THREE.CircleGeometry(0.45, 18), mat(x0 - 0.02, ph + 0.8, 0, -Math.PI / 2))
    gableRoof(b, CU, { x: x0 + 2.2, w: 4.4, d: 3.8, y: ph + 1.8, pitch: PITCH, ridge: 'x', wallKey: WALL, overhang: 0.3, seams: SEAM })
    // flat copper roof of the porch
    b.block(CU, x1 - x0 + 0.3, 0.12, 2 * hz + 0.6, (x0 + x1) / 2, ph, 0)
    b.add('wood', metricBox(0.05, 3.2, 1.6), mat(x1 - 0.08, PL + 1.6, 0))
    // steps
    for (let i = 0; i < 6; i++) b.block(ST, 0.32, PL - (i * PL) / 6, 4.6, x0 - 0.16 - i * 0.32, 0, 0)
  }

  /* ---------------- towers ---------------- */
  // central tower
  towerBase(b, CX, 0, 4.0, EAVE, 19.9)
  tower(b, { x: CX, z: 0, R: 4.1, y0: 20.2, h: 7.4, domeH: 4.1, twin: true, crossS: 2.1 })
  // corner towers
  for (const tx of [CB.x0 + BAY / 2, CB.x1 - BAY / 2]) {
    for (const sz of [-1, 1]) {
      const tz = sz * (CB.hz - BAY / 2)
      towerBase(b, tx, tz, BAY / 2, EAVE, 17.6)
      tower(b, { x: tx, z: tz, R: 2.3, y0: 17.9, h: 5.0, domeH: 2.5, twin: false, crossS: 1.5 })
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [CX - 3.6, 29.5, -1.5],
  materials: (base) => {
    const cu = (base.copperPrepat as THREE.MeshStandardMaterial).clone()
    cu.color.set('#688280')
    return {
      balCopper: cu,
      balWall: new THREE.MeshStandardMaterial({ color: '#e4d0a4', roughness: 0.88 }),
      balBrick: new THREE.MeshStandardMaterial({ color: '#a7684f', roughness: 0.9 }),
      balOrn: new THREE.MeshStandardMaterial({ color: '#5a4a40', roughness: 0.75 }),
    }
  },
  notes: 'Heights scaled from the photographs (OSM height 40 m unsourced); east end, south side and masonry patterns approximated.',
}
export default model
