/**
 * Biserica Cașin, Bd. Mărăști 16, București (1935–1938).
 *
 * Modelling specification derived from the reference photographs (01–12),
 * the OSM outline (way 88120970, 42.2 × 25.9 m, long axis 132.7°) and
 * ro.wikipedia (triconch, centred Greek cross, 42 × 29 m, main dome ≈ 50 m,
 * four smaller octagonal towers round the main one, porch with five frontal
 * and two lateral arcades, altar apse ringed by an open arcaded portico).
 * Real metres, +X = towards the altar (SE):
 *  - Main body 33.6 × 19.4 m (x −16.6…17), white render, cornice 15 m.
 *    Four arms ending in large semicircular arched gables with copper barrel
 *    roofs: west façade arch (top ≈ 22 m) framing the mosaic window, north &
 *    south arms (top ≈ 20.5 m) over the semicircular lateral apses, east arm
 *    over the altar apse.
 *  - Lateral and altar apses: semicircular, blind arcade of tall niches and a
 *    scalloped (kokoshnik) cornice, stilted copper half-domes with standing
 *    seams (photos 01, 03). Open arcaded portico round the altar apse.
 *  - Four corner towers on 5 × 5 m blocks (blind arcading, dark ornamental
 *    frieze, cornice ≈ 21.4 m): octagonal colonnaded drums with arched
 *    windows, scalloped cornice, dark helmet domes, ornate crosses (≈ 32 m).
 *  - Central tower: tall square base, twelve-sided drum with paired engaged
 *    columns, slit windows and roundels, scalloped cornice, large dark copper
 *    helmet dome, crown and ornate cross at ≈ 49 m (photos 01, 02, 04, 08).
 *  - Copper dome on a square block over the pronaos, behind the west arch
 *    (photos 01, 02, 03, 08).
 *  - Single-storey west block 25.9 m wide (porch + side rooms) with flat
 *    roof: five front arcades and one lateral arcade per side on paired white
 *    columns, broad flight of steps.
 *  - COLOR METAL scope: copper sheet on all domes, half-domes and barrel
 *    roofs. Photographs show two tones: warm brown copper on the half-domes,
 *    barrels and pronaos dome, very dark oxidised copper on the drum domes.
 * Approximations: tower and dome heights scaled from photographs (only the
 * 50 m total is published), east end and portico (no photo), arm widths,
 * ornament, mosaic and window counts simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, loft, lathe, extrude, opening, frameShape, polyRing, barrelRoof, dome, facet } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const W = 'casWall'
const ORN = 'casOrn'
const CU = 'casCopper'
const CUD = 'casDome'
const IRON = 'casCross'
const HZ = 9.7 // main body half width
const X0 = -16.6 // main body west face (behind the porch)
const X1 = 17.0 // main body east face
const CX = 5.5 // crossing centre
const COR = 15.0 // main cornice
const TB = { hw: 2.5, top: 21.4, xs: [-14.1, 14.5], z: 7.2 }
const SEAM_CU = { key: CU, spacing: 0.55, h: 0.045, w: 0.045 }

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const shapeGeo = (pts: THREE.Vector2[]) => new THREE.ShapeGeometry(new THREE.Shape(pts))
/** Frame on a vertical plane through (x, z) whose outward normal is n. */
const frame = (x: number, z: number, n: P2, y = 0) => mat(x, y, z, Math.atan2(n[0], n[1]))

function sector(r1: number, r2: number, a0: number, a1: number, cy: number, seg = 12) {
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

/** Arched gable wall (rectangle y0…ys + semicircle radius r) in a plane, with a raised archivolt. */
function archGable(b: Builder, m: THREE.Matrix4, r: number, y0: number, ys: number, depth = 0.7) {
  const s = new THREE.Shape()
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  s.lineTo(r, ys)
  for (let i = 1; i <= 24; i++) s.lineTo(Math.cos((i / 24) * Math.PI) * r, ys + Math.sin((i / 24) * Math.PI) * r)
  s.lineTo(-r, y0)
  b.add(W, extrude(s, depth), M(m, mat(0, 0, -depth)))
  // archivolt (two rolls) and dark ornamental band
  b.add(W, extrude(sector(r - 0.55, r + 0.12, 0, Math.PI, ys, 24), 0.3), m)
  b.add(W, extrude(sector(r - 1.15, r - 0.75, 0, Math.PI, ys, 24), 0.2), m)
  for (const s2 of [-1, 1]) {
    b.add(W, metricBox(0.67, ys - y0, 0.3), M(m, mat(s2 * (r - 0.215), (y0 + ys) / 2, 0.15)))
    b.add(W, metricBox(0.9, 0.35, 0.5), M(m, mat(s2 * (r - 0.25), ys - 0.1, 0.25)))
  }
}

/** Half-dome (stilted, copper) over a semicircular apse; ribs as standing seams. */
function halfDome(b: Builder, key: string, c: P2, n: P2, r: number, y: number, h: number, ribs = 14) {
  const prof: [number, number][] = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    const rr = t < 0.25 ? 1 : Math.cos(((t - 0.25) / 0.75) * (Math.PI / 2)) ** 0.85
    prof.push([Math.max(0.01, rr * r), t * h])
  }
  const phi = Math.atan2(n[0], n[1])
  const g = new THREE.LatheGeometry(prof.map(([a, bb]) => new THREE.Vector2(a, bb)), 24, phi - Math.PI / 2, Math.PI)
  b.add(key, g, mat(c[0], y, c[1]))
  for (let k = 1; k < ribs; k++) {
    const a = phi - Math.PI / 2 + (k / ribs) * Math.PI
    for (let i = 0; i < prof.length - 2; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(key, V(c[0] + Math.sin(a) * (r0 + 0.03), y + y0, c[1] + Math.cos(a) * (r0 + 0.03)), V(c[0] + Math.sin(a) * (r1 + 0.03), y + y1, c[1] + Math.cos(a) * (r1 + 0.03)), 0.06, 0.06, V(Math.sin(a), 0, Math.cos(a)))
    }
  }
  // eave roll
  const rim: THREE.Vector3[] = []
  for (let i = 0; i <= 16; i++) {
    const a = phi - Math.PI / 2 + (i / 16) * Math.PI
    rim.push(V(c[0] + Math.sin(a) * (r + 0.05), y + 0.05, c[1] + Math.cos(a) * (r + 0.05)))
  }
  for (let i = 0; i < 16; i++) b.rod(key, rim[i], rim[i + 1], 0.08, 6)
}

/** Semicircular apse wall with blind arcade, scalloped cornice and copper half-dome. */
function apse(b: Builder, c: P2, n: P2, r: number, eave: number, domeH: number, niches: number) {
  const phi = Math.atan2(n[0], n[1])
  b.add(W, new THREE.CylinderGeometry(r, r, eave, 32, 1, true, phi - Math.PI / 2, Math.PI), mat(c[0], eave / 2, c[1]))
  b.add('stoneLight', new THREE.CylinderGeometry(r + 0.15, r + 0.15, 1.1, 32, 1, true, phi - Math.PI / 2, Math.PI), mat(c[0], 0.55, c[1]))
  // cornice ring
  b.add(W, new THREE.CylinderGeometry(r + 0.32, r + 0.2, 0.4, 32, 1, true, phi - Math.PI / 2, Math.PI), mat(c[0], eave - 0.2, c[1]))
  b.add(ORN, new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.45, 32, 1, true, phi - Math.PI / 2, Math.PI), mat(c[0], eave - 0.65, c[1]))
  for (let k = 0; k < niches; k++) {
    const a = phi - Math.PI / 2 + ((k + 0.5) / niches) * Math.PI
    const p: P2 = [c[0] + Math.sin(a) * r, c[1] + Math.cos(a) * r]
    const m = frame(p[0], p[1], [Math.sin(a), Math.cos(a)])
    const w = Math.min(1.0, ((Math.PI * r) / niches) * 0.5)
    b.add(W, extrude(frameShape('round', w, 3.4, 0.16, 0, eave - 4.9), 0.16), m)
    b.add('glassC', shapeGeo(opening('round', w * 0.35, 1.8, 0, eave - 4.1, 8)), M(m, mat(0, 0, 0.05)))
    // scalloped (kokoshnik) lobe above each bay
    b.add(W, extrude(sector(0, ((Math.PI * r) / niches) * 0.5, 0, Math.PI, eave, 10), 0.22), M(m, mat(0, 0, 0.1)))
    b.add(ORN, metricBox(0.32, 0.55, 0.3), M(m, mat(((Math.PI * r) / niches) * 0.5, eave - 0.95, 0.12)))
  }
  halfDome(b, CU, c, n, r + 0.15, eave + 0.1, domeH)
}

/** Ornate iron cross on a crown-shaped base. */
function ornateCross(b: Builder, x: number, y: number, z: number, s: number, ry: number) {
  const crown: [number, number][] = [
    [0.02, 0],
    [0.3, 0.02],
    [0.38, 0.12],
    [0.22, 0.25],
    [0.12, 0.4],
    [0.1, 0.62],
    [0.18, 0.7],
    [0.06, 0.82],
    [0.05, 1.0],
  ]
  b.add(IRON, lathe(crown.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
  const g = new Builder()
  const t = 0.07 * s
  g.add(IRON, metricBox(t, 1.25 * s, t), mat(0, 1.45 * s, 0))
  g.add(IRON, metricBox(0.75 * s, t, t), mat(0, 1.6 * s, 0))
  // trefoil ends and the open ring of the Romanian ornate cross
  for (const [px, py] of [
    [0, 2.1],
    [0.4, 1.6],
    [-0.4, 1.6],
  ]) g.add(IRON, new THREE.TorusGeometry(0.1 * s, 0.025 * s, 4, 10), mat(px * s, py * s, 0))
  g.add(IRON, new THREE.TorusGeometry(0.2 * s, 0.025 * s, 4, 16), mat(0, 1.6 * s, 0))
  b.merge(g, mat(x, y, z, ry))
}

/** Octagonal / polygonal colonnaded drum with arched windows, scalloped cornice and helmet dome. */
function drum(
  b: Builder,
  o: { x: number; z: number; n: number; R: number; y0: number; h: number; win: { w: number; h: number; y: number }; domeR: number; domeH: number; crossS: number; paired?: boolean; roundels?: boolean },
) {
  const { x, z, n, R, y0, h } = o
  const ph = Math.PI / n
  const ap = R * Math.cos(ph)
  const side = 2 * R * Math.sin(ph)
  // plinth + shaft
  b.add(W, loft([polyRing(n, R + 0.25, y0 - 0.7, ph, x, z), polyRing(n, R + 0.25, y0, ph, x, z)], { capTop: true, flat: true }))
  b.add(ORN, loft([polyRing(n, R + 0.3, y0 - 0.45, ph, x, z), polyRing(n, R + 0.3, y0 - 0.2, ph, x, z)], { capTop: true, capBottom: true, flat: true }))
  b.add(W, loft([polyRing(n, R, y0, ph, x, z), polyRing(n, R, y0 + h, ph, x, z)], { capTop: true, flat: true }))
  for (let k = 0; k < n; k++) {
    const a = (k * 2 * Math.PI) / n
    const nn: P2 = [Math.cos(a), Math.sin(a)]
    const m = frame(x + nn[0] * ap, z + nn[1] * ap, nn)
    b.add('glassC', shapeGeo(opening('round', o.win.w, o.win.h, 0, o.win.y, 8)), M(m, mat(0, 0, 0.04)))
    b.add(W, extrude(frameShape('round', o.win.w, o.win.h, 0.12, 0, o.win.y), 0.12), m)
    if (o.roundels) {
      b.add(W, new THREE.TorusGeometry(0.34, 0.07, 6, 16), M(m, mat(0, o.win.y + o.win.h + 0.75, 0.06)))
      b.add(ORN, new THREE.CircleGeometry(0.3, 16), M(m, mat(0, o.win.y + o.win.h + 0.75, 0.04)))
    }
    // scalloped cornice lobe
    b.add(W, extrude(sector(0, side / 2 + 0.05, 0, Math.PI, y0 + h, 12), 0.3), M(m, mat(0, 0, 0.05)))
    b.add(W, extrude(sector(side / 2 - 0.12, side / 2 + 0.12, 0, Math.PI, y0 + h, 12), 0.2), M(m, mat(0, 0, 0.35)))
    // engaged columns at the vertex
    const va = a + ph
    const cols = o.paired ? [-0.17, 0.17] : [0]
    for (const off of cols) {
      const t: P2 = [-Math.sin(va), Math.cos(va)]
      const cx = x + Math.cos(va) * (R + 0.08) + t[0] * off
      const cz = z + Math.sin(va) * (R + 0.08) + t[1] * off
      const cr = o.paired ? 0.13 : 0.12
      b.add(W, new THREE.CylinderGeometry(cr, cr * 1.1, h - 0.8, 8), mat(cx, y0 + 0.2 + (h - 0.8) / 2, cz))
      b.add('stoneWarm', metricBox(cr * 3, 0.35, cr * 3), mat(cx, y0 + h - 0.45, cz, -va))
      b.add(W, metricBox(cr * 3, 0.2, cr * 3), mat(cx, y0 + 0.25, cz, -va))
    }
  }
  // cornice ring above the lobes
  const yc = y0 + h + side / 2
  b.add(W, loft([polyRing(n, R + 0.1, y0 + h - 0.05, ph, x, z), polyRing(n, R + 0.4, y0 + h + 0.2, ph, x, z)], { capTop: true, capBottom: true, flat: true }))
  b.add(W, loft([polyRing(n, R - 0.05, y0 + h, ph, x, z), polyRing(n, R - 0.05, yc, ph, x, z)], { capTop: true, flat: true }))
  // helmet dome (dark oxidised copper), slight swell over the drum
  const prof: [number, number][] = [
    [0.94, 0],
    [1.0, 0.08],
    [1.04, 0.2],
    [1.03, 0.36],
    [0.96, 0.52],
    [0.82, 0.68],
    [0.6, 0.83],
    [0.32, 0.95],
    [0.1, 0.995],
    [0.02, 1.0],
  ]
  const top = dome(b, CUD, { x, z, y: yc - 0.25, r: o.domeR, h: o.domeH, profile: prof, seg: 32, ribs: n * 2, ribH: 0.05 })
  b.add(CUD, new THREE.CylinderGeometry(o.domeR * 0.07, o.domeR * 0.1, 0.4, 10), mat(x, top + 0.1, z))
  ornateCross(b, x, top + 0.25, z, o.crossS, Math.PI / 2)
  return top
}

/** Corner tower block with blind arcading and ornamental frieze. */
function towerBlock(b: Builder, x: number, z: number, outer: P2[]) {
  const h = TB.hw
  b.block(W, 2 * h, TB.top, 2 * h, x, 0, z)
  b.block(ORN, 2 * h + 0.1, 0.55, 2 * h + 0.1, x, TB.top - 1.2, z)
  b.block(W, 2 * h + 0.5, 0.3, 2 * h + 0.5, x, TB.top - 0.65, z)
  b.block(W, 2 * h + 0.8, 0.35, 2 * h + 0.8, x, TB.top - 0.35, z)
  for (const n of outer) {
    const m = frame(x + n[0] * h, z + n[1] * h, n)
    for (const u of [-1.45, 0, 1.45]) {
      b.add(W, extrude(frameShape('round', 0.75, 3.3, 0.14, u, TB.top - 4.9), 0.14), m)
    }
    // tall slit window lower down
    b.add('glassC', shapeGeo(opening('round', 0.38, 5.2, 0, 9.0, 8)), M(m, mat(0, 0, 0.04)))
    b.add(W, extrude(frameShape('round', 0.38, 5.2, 0.12, 0, 9.0), 0.1), m)
    // pilaster strips at the corners
    for (const s of [-1, 1]) b.add(W, metricBox(0.5, TB.top - 2.4, 0.12), M(m, mat(s * (h - 0.25), 1.2 + (TB.top - 2.4) / 2, 0.06)))
  }
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- main body ---------------- */
  b.block(W, X1 - X0, COR, 2 * HZ, (X0 + X1) / 2, 0, 0)
  b.block('stoneLight', X1 - X0 + 0.3, 1.1, 2 * HZ + 0.3, (X0 + X1) / 2, 0, 0)
  b.block(ORN, X1 - X0 + 0.08, 0.5, 2 * HZ + 0.08, (X0 + X1) / 2, COR - 1.05, 0)
  b.block(W, X1 - X0 + 0.5, 0.28, 2 * HZ + 0.5, (X0 + X1) / 2, COR - 0.55, 0)
  b.block(W, X1 - X0 + 0.8, 0.3, 2 * HZ + 0.8, (X0 + X1) / 2, COR - 0.3, 0)
  // low copper roofs over the side bays between the west towers and the lateral arms
  for (const sz of [-1, 1]) {
    const z0 = sz * 3.5
    const z1 = sz * (HZ + 0.4)
    facet(b, CU, [V(-11.6, COR + 0.7, z0), V(-0.3, COR + 0.7, z0), V(-0.3, COR, z1), V(-11.6, COR, z1)], { seams: SEAM_CU, thickness: 0.1 })
    facet(b, CU, [V(11.3, COR + 0.5, sz * 4.7), V(12.0, COR + 0.5, sz * 4.7), V(12.0, COR, z1), V(11.3, COR, z1)], { thickness: 0.1 })
  }

  /* ---------------- corner towers (blocks) ---------------- */
  for (const tx of TB.xs) {
    for (const sz of [-1, 1]) {
      const outer: P2[] = [[0, sz]]
      outer.push(tx < 0 ? [-1, 0] : [1, 0])
      towerBlock(b, tx, sz * TB.z, outer)
    }
  }

  /* ---------------- arms: arched gables + copper barrels ---------------- */
  // west (façade) arm
  {
    const r = 4.7
    const ys = 17.2
    archGable(b, frame(X0, 0, [-1, 0]), r, COR - 0.5, ys)
    const sub = new Builder()
    barrelRoof(sub, CU, { x: 2.8, w: 5.6, d: 2 * r, y: ys, rise: r + 0.3, segs: 16, seams: SEAM_CU, overhang: 0.3 })
    b.merge(sub, mat(X0, 0, 0))
    const sub2 = new Builder()
    barrelRoof(sub2, CU, { x: 0, w: 4.4, d: 2 * r, y: ys, rise: r + 0.3, segs: 16, seams: SEAM_CU, overhang: 0.3 })
    b.merge(sub2, mat(-1.8, 0, 0))
    // mosaic window with dark ornamental border (photos 02, 05, 08)
    const m = frame(X0 - 0.3, 0, [-1, 0])
    b.add('casMosaic', shapeGeo(opening('round', 2.5, 6.2, 0, 9.6, 14)), M(m, mat(0, 0, 0.06)))
    b.add(ORN, extrude(frameShape('round', 2.5, 6.2, 0.55, 0, 9.6), 0.1), m)
    b.add(W, extrude(frameShape('round', 3.6, 6.9, 0.25, 0, 9.0), 0.16), m)
    // stepped frame of the central bay
    for (const s of [-1, 1]) b.add(W, metricBox(0.6, COR - 9.2, 0.45), M(m, mat(s * 4.4, 9.2 + (COR - 9.2) / 2, 0.1)))
  }
  // north & south arms (over the lateral apses)
  for (const sz of [-1, 1]) {
    const r = 5.8
    const ys = 14.7
    archGable(b, frame(CX, sz * HZ, [0, sz]), r, COR - 0.5, ys)
    const sub = new Builder()
    barrelRoof(sub, CU, { x: 2.3, w: 4.6, d: 2 * r, y: ys, rise: r + 0.3, segs: 16, seams: SEAM_CU, overhang: 0.3 })
    b.merge(sub, mat(CX, 0, sz * HZ, sz > 0 ? Math.PI / 2 : -Math.PI / 2))
    apse(b, [CX, sz * HZ], [0, sz], 3.4, 12.6, 4.2, 7)
  }
  // east arm (over the altar apse)
  {
    const r = 4.7
    const ys = 15.2
    archGable(b, frame(X1, 0, [1, 0]), r, COR - 0.5, ys)
    const sub = new Builder()
    barrelRoof(sub, CU, { x: -3.1, w: 6.2, d: 2 * r, y: ys, rise: r + 0.3, segs: 16, seams: SEAM_CU, overhang: 0.3 })
    b.merge(sub, mat(X1, 0, 0))
    apse(b, [X1, 0], [1, 0], 3.5, 11.8, 4.0, 7)
    // open arcaded portico round the altar apse
    const R0 = 3.5
    const R1 = 4.1
    const ph = 5.6
    const nCol = 9
    for (let k = 0; k <= nCol; k++) {
      const a = -Math.PI / 2 + (k / nCol) * Math.PI
      const px = X1 + Math.cos(a) * (R1 - 0.2)
      const pz = Math.sin(a) * (R1 - 0.2)
      b.add('white', new THREE.CylinderGeometry(0.17, 0.19, ph - 2.4, 10), mat(px, 1.1 + (ph - 2.4) / 2, pz))
      b.block(W, 0.5, 0.3, 0.5, px, ph - 1.3, pz)
    }
    b.add(W, new THREE.CylinderGeometry(R1, R1, 1.0, 32, 1, true, 0, Math.PI), mat(X1, ph - 0.5, 0))
    b.add(ORN, new THREE.CylinderGeometry(R1 + 0.02, R1 + 0.02, 0.3, 32, 1, true, 0, Math.PI), mat(X1, ph - 0.85, 0))
    b.add(W, new THREE.CylinderGeometry(R1 + 0.05, R1 + 0.05, 1.1, 32, 1, true, 0, Math.PI), mat(X1, 0.55, 0))
    // lean-to copper roof of the portico
    const lean = new THREE.CylinderGeometry(R0 + 0.05, R1 + 0.35, 1.2, 32, 1, true, 0, Math.PI)
    b.add(CU, lean, mat(X1, ph + 0.6, 0))
  }

  /* ---------------- pronaos dome (copper, behind the west arch) ---------------- */
  {
    const px = -7.4
    b.block(W, 7.2, 21.6 - COR, 7.2, px, COR, 0)
    b.block(ORN, 7.28, 0.45, 7.28, px, 20.6, 0)
    b.block(W, 7.8, 0.4, 7.8, px, 21.2, 0)
    b.add(W, loft([polyRing(24, 3.45, 21.6, 0, px, 0), polyRing(24, 3.45, 22.2, 0, px, 0)], { capTop: true }))
    const t = dome(b, CU, { x: px, z: 0, y: 22.2, r: 3.55, h: 3.5, profile: 'hemi', seg: 32, ribs: 26, ribH: 0.05 })
    b.add(CU, new THREE.CylinderGeometry(0.12, 0.2, 0.5, 10), mat(px, t + 0.15, 0))
    b.add('gilt', new THREE.SphereGeometry(0.18, 10, 8), mat(px, t + 0.5, 0))
  }

  /* ---------------- central tower ---------------- */
  {
    const hb = 5.4
    // tall square base with chamfered corners
    const base: P2[] = [
      [CX - hb + 1.2, -hb],
      [CX + hb - 1.2, -hb],
      [CX + hb, -hb + 1.2],
      [CX + hb, hb - 1.2],
      [CX + hb - 1.2, hb],
      [CX - hb + 1.2, hb],
      [CX - hb, hb - 1.2],
      [CX - hb, -hb + 1.2],
    ]
    const ring = (o: P2[], y: number, g = 0) => o.map(([x, z]) => V(x + Math.sign(x - CX) * g, y, z + Math.sign(z) * g))
    b.add(W, loft([ring(base, COR), ring(base, 27.0)], { capTop: true, flat: true }))
    b.add(ORN, loft([ring(base, 25.8, 0.05), ring(base, 26.3, 0.05)], { capTop: true, capBottom: true, flat: true }))
    b.add(W, loft([ring(base, 26.4, 0.25), ring(base, 27.0, 0.45)], { capTop: true, capBottom: true, flat: true }))
    // blind arches on the four faces of the base
    for (const n of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as P2[]) {
      const m = frame(CX + n[0] * hb, n[1] * hb, n)
      for (const u of [-2.0, 0, 2.0]) b.add(W, extrude(frameShape('round', 1.1, 3.4, 0.16, u, 21.7), 0.16), m)
    }
    drum(b, { x: CX, z: 0, n: 12, R: 5.05, y0: 27.8, h: 8.0, win: { w: 0.5, h: 4.4, y: 29.1 }, domeR: 5.25, domeH: 6.5, crossS: 2.4, paired: true, roundels: true })
  }

  /* ---------------- corner towers (drums) ---------------- */
  for (const tx of TB.xs) for (const sz of [-1, 1]) drum(b, { x: tx, z: sz * TB.z, n: 8, R: 2.05, y0: TB.top + 0.8, h: 3.8, win: { w: 0.42, h: 2.0, y: TB.top + 1.45 }, domeR: 2.2, domeH: 2.5, crossS: 1.3 })

  /* ---------------- west block: porch and side rooms ---------------- */
  {
    const x0 = -21.1
    const x1 = X0 + 0.2
    const xm = -8.0
    const hz = 12.95
    const PH = 9.2
    const FL = 2.0 // porch floor (twelve steps)
    // side rooms (full width, x0…xm)
    for (const sz of [-1, 1]) b.block(W, xm - x1, PH, hz - HZ, (x1 + xm) / 2, 0, sz * (HZ + hz) / 2)
    // porch shell: back wall = main body; roof slab on piers and columns
    b.block(W, x1 - x0, 1.2, 2 * hz, (x0 + x1) / 2, PH - 1.2, 0)
    b.block(ORN, x1 - x0 + 0.06, 0.4, 2 * hz + 0.06, (x0 + x1) / 2, PH - 1.75, 0)
    b.block(W, xm - x0 + 0.4, 0.3, 2 * hz + 0.4, (x0 + xm) / 2, PH - 0.05, 0)
    b.block(W, xm - x0, 0.6, 2 * hz, (x0 + xm) / 2, PH + 0.2, 0) // parapet / terrace edge
    b.block('stoneLight', x1 - x0, FL, 2 * hz, (x0 + x1) / 2, 0, 0)
    // dark porch interior (back wall shadow)
    b.add('voidG', metricBox(0.05, PH - FL - 1.2, 2 * HZ - 1), mat(x1 - 0.05, FL + (PH - FL - 1.2) / 2, 0))
    // front: five arcades between solid end bays
    const fm = frame(x0, 0, [-1, 0])
    const span = (2 * HZ) / 5
    for (let i = 0; i <= 5; i++) {
      const u = -HZ + i * span
      const pw = i === 0 || i === 5 ? 0.9 : 0.75
      b.add(W, metricBox(pw, 0.4, 0.9), M(fm, mat(u, FL + 3.7, -0.45)))
      for (const off of [-0.2, 0.2]) b.add('white', new THREE.CylinderGeometry(0.17, 0.2, 3.1, 10), M(fm, mat(u + off, FL + 1.55 + 0.4, -0.45)))
      b.add('white', metricBox(0.9, 0.4, 0.6), M(fm, mat(u, FL + 0.2, -0.45)))
    }
    for (let i = 0; i < 5; i++) {
      const u = -HZ + (i + 0.5) * span
      b.add(W, extrude(sector(span / 2 - 0.35, span / 2 + 0.05, 0, Math.PI, FL + 3.9, 12), 0.9), M(fm, mat(u, 0, -0.9)))
      // spandrel infill above each arch
      const sp = new THREE.Shape()
      sp.moveTo(-span / 2, FL + 3.9)
      for (let k = 0; k <= 12; k++) sp.lineTo(Math.cos(Math.PI - (k / 12) * Math.PI) * (span / 2), FL + 3.9 + Math.sin(Math.PI - (k / 12) * Math.PI) * (span / 2))
      sp.lineTo(span / 2, PH - 1.2)
      sp.lineTo(-span / 2, PH - 1.2)
      b.add(W, extrude(sp, 0.9), M(fm, mat(u, 0, -0.9)))
    }
    // solid end bays of the front with a niche
    for (const s of [-1, 1]) {
      b.add(W, metricBox(hz - HZ, PH - FL - 1.2, 0.9), M(fm, mat(s * (HZ + hz) / 2, FL + (PH - FL - 1.2) / 2, -0.45)))
      b.add(W, extrude(frameShape('round', 1.0, 2.6, 0.15, s * (HZ + hz) / 2, FL + 1.4), 0.12), fm)
    }
    // lateral arcade (one arch per side, near the front)
    for (const sz of [-1, 1]) {
      const sm = frame(-19.3, sz * hz, [0, sz])
      b.add('voidG', shapeGeo(opening('round', 2.8, 4.8, 0, FL, 12)), M(sm, mat(0, 0, 0.03)))
      b.add(W, extrude(frameShape('round', 2.8, 4.8, 0.3, 0, FL), 0.12), sm)
      // side rooms: windows
      for (const x of [-13.4, -10.4]) {
        const wm = frame(x, sz * hz, [0, sz])
        b.add('glassC', shapeGeo(opening('round', 1.1, 2.6, 0, 3.8, 10)), M(wm, mat(0, 0, 0.04)))
        b.add(W, extrude(frameShape('round', 1.1, 2.6, 0.18, 0, 3.8), 0.1), wm)
      }
    }
    // twelve steps in front of the porch
    for (let i = 0; i < 12; i++) b.block('stoneLight', 0.3, FL - (i * FL) / 12, 2 * HZ - 0.6 + i * 0.06, x0 - 0.15 - i * 0.3, 0, 0)
  }

  /* ---------------- façade details of the main body ---------------- */
  // pilaster strips + dark bands on the long walls between the towers and the arms
  for (const sz of [-1, 1]) {
    const m = frame(-6.0, sz * HZ, [0, sz])
    for (const u of [-5.4, -1.8, 1.8, 5.4]) b.add(W, metricBox(0.55, COR - 2.4, 0.14), M(m, mat(u, 1.1 + (COR - 2.4) / 2, 0.07)))
    for (const u of [-3.6, 0, 3.6]) {
      b.add('glassC', shapeGeo(opening('round', 0.9, 3.6, u, 10.0, 10)), M(m, mat(0, 0, 0.04)))
      b.add(W, extrude(frameShape('round', 0.9, 3.6, 0.16, u, 10.0), 0.12), m)
      b.add(W, extrude(frameShape('round', 1.2, 2.4, 0.14, u, 2.6), 0.1), m)
    }
  }
  // lower windows on the N/S arm walls either side of the apses
  for (const sz of [-1, 1]) {
    const m = frame(CX, sz * HZ, [0, sz])
    for (const u of [-4.6, 4.6]) {
      b.add('glassC', shapeGeo(opening('round', 0.8, 3.2, u, 6.0, 10)), M(m, mat(0, 0, 0.04)))
      b.add(W, extrude(frameShape('round', 0.8, 3.2, 0.16, u, 6.0), 0.12), m)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [0.6, 42.5, -1.5],
  materials: (base) => {
    // drum domes: very dark, evenly oxidised copper as photographed (no sheet texture visible at this scale)
    const dark = new THREE.MeshStandardMaterial({ color: '#3d3735', metalness: 0.55, roughness: 0.42, envMapIntensity: 1.0 })
    const cu = (base.copper as THREE.MeshStandardMaterial).clone()
    cu.color.set('#aab3bd')
    cu.roughness = 0.48
    return {
      casCopper: cu,
      casWall: new THREE.MeshStandardMaterial({ color: '#f1f0eb', roughness: 0.88 }),
      casOrn: new THREE.MeshStandardMaterial({ color: '#4c4d52', roughness: 0.7 }),
      casDome: dark,
      casCross: new THREE.MeshStandardMaterial({ color: '#6a2c22', metalness: 0.5, roughness: 0.5 }),
      casMosaic: new THREE.MeshStandardMaterial({ color: '#5a7393', metalness: 0.3, roughness: 0.35, emissive: '#2b3644', emissiveIntensity: 0.2 }),
    }
  },
  notes: 'Heights scaled from the photographs (published total ≈ 50 m); east end, altar portico and ornament approximated.',
}
export default model
