/**
 * Clinicile de Obstetrică-Ginecologie și Neonatologie, Timișoara — the new
 * maternity of the County Hospital, Bd. Liviu Rebreanu 158A (OSM way 1054670035).
 *
 * The four photographs (two drone views, two ground views) all show the north
 * (main) façade and its north-west corner of a new five-storey block whose L
 * outline and size match the OSM way (45.1 × 39.3 m). Modelling specification
 * (real metres, +X = the façade direction, compass 281.3°, the main façade faces +Z):
 *  - L-shaped block: the east part (22.9 × 39.4 m) projects 3.4 m in front of the
 *    west wing (22.7 × 15.8 m); raised ground floor on a grey plinth (1.5 m) +
 *    four upper floors (≈3.6 m), flat roof at 19.4 m, parapet frames to ≈21.2 m.
 *  - East part of the façade: a thick white projecting "picture frame" around a
 *    colourful façade of dark / light-grey / white vertical panels with thin
 *    yellow, red, blue, orange and green lines and vertical columns of windows;
 *    next to it a full-height strip of white PERFORATED ALUMINIUM with a tree
 *    motif that rises above the parapet.
 *  - West wing: a brown-panel stair core rising above the roof; a cantilevered
 *    box (floors 2–3) clad in grey PERFORATED / EXPANDED ALUMINIUM with vertical
 *    wavy unperforated bands, wrapping round its ends, dark soffit; a glazed band
 *    below it and a glazed top floor with dark sun-shading fins; white end frame.
 *  - Ground floor: deep dark canopy with the clinic's name over a recessed glazed
 *    front, carried along the west wing by seven colourful round columns; stair
 *    up to the raised entrance; roof plant and a brown technical penthouse.
 * Approximations: the side and rear elevations (not photographed) are generic
 *  (white cladding with window bands); stripe and window patterns, the tree
 *  motif and the wave bands are drawn schematically (no textures); roof plant
 *  simplified; inscription letters omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

/* ---------------- plan (model metres, from the OSM way) ---------------- */
const EAST = { x0: -17.75, x1: 3.0, z0: -22.05, z1: 17.4 } // front part projecting to z1
const WEST = { x0: 3.0, x1: 27.4, z0: -1.9, z1: 13.9 }
const LV = { gf: 1.5, f1: 5.0, f2: 8.6, f3: 12.2, f4: 15.8, roof: 19.4, parapet: 21.2, core: 24.6 }

/* deterministic random */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Thin panel on a +Z-facing façade plane: x range, y range, offset from the plane. */
function panelZ(b: Builder, key: string, x0: number, x1: number, y0: number, y1: number, zFace: number, off = 0.02, depth = 0.04) {
  b.add(key, metricBox(x1 - x0, y1 - y0, depth), mat((x0 + x1) / 2, (y0 + y1) / 2, zFace + off + depth / 2))
}

/** Ribbon following x = f(y) in a vertical plane z = const (wavy bands, tree branches). */
function ribbon(b: Builder, key: string, pts: P2[], width: number, z: number, axis: 'z' | 'x' = 'z', facing = 1) {
  const pos: number[] = []
  const nor: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i]
    const [u1, v1] = pts[i + 1]
    const dx = u1 - u0
    const dy = v1 - v0
    const L = Math.hypot(dx, dy) || 1
    const px = (-dy / L) * (width / 2)
    const py = (dx / L) * (width / 2)
    const quad: P2[] = [
      [u0 - px, v0 - py],
      [u1 - px, v1 - py],
      [u1 + px, v1 + py],
      [u0 - px, v0 - py],
      [u1 + px, v1 + py],
      [u0 + px, v0 + py],
    ]
    const order = facing > 0 ? [0, 1, 2, 3, 4, 5] : [0, 2, 1, 3, 5, 4]
    for (const k of order) {
      const [u, v] = quad[k]
      if (axis === 'z') {
        pos.push(u, v, z)
        nor.push(0, 0, facing)
      } else {
        pos.push(z, v, u)
        nor.push(facing, 0, 0)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  b.add(key, g)
}

/** Horizontal window bands on a wall (generic elevations). face normal ±x / ±z. */
function windowBands(b: Builder, face: '+x' | '-x' | '+z' | '-z', plane: number, u0: number, u1: number, floors: number[], h: number, step = 3.0, w = 2.0) {
  for (const y of floors) {
    for (let u = u0 + step / 2; u < u1 - step / 2 + 0.01; u += step) {
      const d = 0.03
      if (face === '+z') b.box('glassC', w, h, 0.06, u, y + h / 2, plane + d)
      else if (face === '-z') b.box('glassC', w, h, 0.06, u, y + h / 2, plane - d)
      else if (face === '+x') b.box('glassC', 0.06, h, w, plane + d, y + h / 2, u)
      else b.box('glassC', 0.06, h, w, plane - d, y + h / 2, u)
    }
  }
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()
  const rand = rng(1054)
  const upper = [LV.f1, LV.f2, LV.f3, LV.f4]

  /* ---------- main volumes ---------- */
  const vol = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, key = 'white') => b.block(key, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2)
  vol(EAST.x0, EAST.x1, EAST.z0, EAST.z1, 0, LV.roof)
  vol(WEST.x0, WEST.x1, WEST.z0, WEST.z1, 0, LV.roof)
  // plinth (raised ground floor)
  vol(EAST.x0 - 0.05, EAST.x1, EAST.z0 - 0.05, EAST.z1 + 0.05, 0, LV.gf, 'concrete')
  vol(WEST.x0, WEST.x1 + 0.05, WEST.z0 - 0.05, WEST.z1 + 0.05, 0, LV.gf, 'concrete')
  // parapets with coping
  const parapet = (x0: number, x1: number, z0: number, z1: number) => {
    const t = 0.35
    const y0 = LV.roof
    const h = 1.0
    vol(x0, x1, z0, z0 + t, y0, y0 + h)
    vol(x0, x1, z1 - t, z1, y0, y0 + h)
    vol(x0, x0 + t, z0, z1, y0, y0 + h)
    vol(x1 - t, x1, z0, z1, y0, y0 + h)
    b.block('membrane', x1 - x0 - 0.7, 0.05, z1 - z0 - 0.7, (x0 + x1) / 2, y0, (z0 + z1) / 2)
  }
  parapet(EAST.x0, EAST.x1, EAST.z0, EAST.z1)
  parapet(WEST.x0, WEST.x1, WEST.z0, WEST.z1)

  /* ---------- generic side and rear elevations ---------- */
  const gen = [LV.gf + 1.0, LV.f1 + 1.0, LV.f2 + 1.0, LV.f3 + 1.0, LV.f4 + 1.0]
  windowBands(b, '-x', EAST.x0, EAST.z0, EAST.z1 - 2, gen, 1.5, 2.7, 1.4)
  windowBands(b, '-z', EAST.z0, EAST.x0, EAST.x1, gen, 1.5, 2.7, 1.4)
  windowBands(b, '+x', EAST.x1, EAST.z0, WEST.z0 - 0.5, gen, 1.5, 2.7, 1.4)
  windowBands(b, '-z', WEST.z0, WEST.x0 + 2.0, WEST.x1, gen, 1.5, 2.7, 1.4)
  windowBands(b, '+x', WEST.x1, WEST.z0, WEST.z1 - 3, gen.slice(0, 4), 1.5, 2.7, 1.4)
  // floor lines (thin grey bands) around the generic elevations
  for (const y of [LV.f1, LV.f2, LV.f3, LV.f4]) {
    b.box('plasterGrey', 0.04, 0.25, EAST.z1 - EAST.z0, EAST.x0 - 0.02, y, (EAST.z0 + EAST.z1) / 2)
    b.box('plasterGrey', EAST.x1 - EAST.x0, 0.25, 0.04, (EAST.x0 + EAST.x1) / 2, y, EAST.z0 - 0.02)
    b.box('plasterGrey', WEST.x1 - WEST.x0, 0.25, 0.04, (WEST.x0 + WEST.x1) / 2, y, WEST.z0 - 0.02)
  }

  /* ---------- EAST part of the main façade (z = EAST.z1) ---------- */
  const zE = EAST.z1
  const fx0 = EAST.x0 // white frame
  const fw = 1.8
  const fd = 1.1
  // white projecting frame: left pillar + top beam
  b.block('white', fw, LV.parapet - LV.gf, fd, fx0 + fw / 2, LV.gf, zE + fd / 2)
  b.block('white', -0.6 - fx0, LV.parapet - LV.f4 - 3.0, fd, (fx0 - 0.6) / 2, LV.f4 + 3.0, zE + fd / 2)
  // colourful striped façade between the frame and the tree strip
  const cx0 = fx0 + fw
  const cx1 = -0.6
  const cy0 = LV.gf
  const cy1 = LV.f4 + 3.0
  panelZ(b, 'pLight', cx0, cx1, cy0, cy1, zE, 0.0, 0.05)
  const colours = ['cYellow', 'cRed', 'cBlue', 'cOrange', 'cGreen', 'cBlue', 'cYellow', 'cOrange']
  let x = cx0
  let ci = 0
  while (x < cx1 - 0.3) {
    const w = Math.min(cx1 - x, 0.5 + rand() * 1.3)
    const kind = rand()
    const key = kind < 0.4 ? 'pDark' : kind < 0.7 ? 'pLight' : 'white'
    if (key !== 'pLight') panelZ(b, key, x, x + w, cy0, cy1, zE, 0.05, 0.04)
    if (rand() < 0.55) {
      panelZ(b, colours[ci % colours.length], x + w - 0.09, x + w + 0.03, cy0 + (rand() < 0.5 ? 0 : 3.5), cy1 - (rand() < 0.5 ? 0 : 2.0), zE, 0.1, 0.04)
      ci++
    }
    x += w
  }
  // window columns (dark glazing) on the striped façade
  const winCols: P2[] = [
    [cx0 + 0.9, 0.9],
    [cx0 + 3.1, 0.7],
    [cx0 + 5.0, 1.0],
    [cx0 + 6.3, 1.0],
    [cx0 + 8.6, 1.3],
    [cx0 + 10.8, 0.9],
    [cx0 + 12.6, 1.0],
  ]
  for (const [wx, ww] of winCols) {
    for (const y of [LV.gf, ...upper]) {
      panelZ(b, 'glassC', wx - ww / 2, wx + ww / 2, y + 0.7, y + 2.9, zE, 0.11, 0.03)
      panelZ(b, 'iron', wx - ww / 2 - 0.05, wx + ww / 2 + 0.05, y + 0.62, y + 0.7, zE, 0.14, 0.02)
    }
  }
  // tree strip: white perforated aluminium with an unperforated tree motif, rising above the parapet
  const tx0 = -0.6
  const tx1 = EAST.x1
  const ty0 = LV.f1 - 0.3
  const ty1 = LV.core - 1.6
  b.block('perfWhite', tx1 - tx0, ty1 - ty0, 0.12, (tx0 + tx1) / 2, ty0, zE + 0.35)
  b.block('pDark', 0.12, ty1 - ty0, 0.4, tx0 + 0.06, ty0, zE + 0.2)
  const tmid = (tx0 + tx1) / 2
  const trunk: P2[] = []
  for (let y = ty0; y <= ty1 - 1.5; y += 0.6) trunk.push([tmid + 0.25 * Math.sin(y * 0.55) - 0.2, y])
  ribbon(b, 'white', trunk, 0.32, zE + 0.42)
  const branches: [number, number, number][] = [
    [8.5, -1, 1.5],
    [10.5, 1, 1.4],
    [12.6, -1, 1.5],
    [14.2, 1, 1.3],
    [16.0, -1, 1.2],
    [17.6, 1, 1.1],
    [19.0, -1, 0.9],
  ]
  for (const [by, dir, len] of branches) {
    const sx = tmid + 0.25 * Math.sin(by * 0.55) - 0.2
    const pts: P2[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      pts.push([sx + dir * len * t, by + 1.6 * t + 0.3 * Math.sin(t * 3)])
    }
    ribbon(b, 'white', pts, 0.18 - 0.02 * Math.abs(dir), zE + 0.42)
  }
  // east-part ground floor: recessed glazing below the canopy
  panelZ(b, 'glassC', cx0, cx1, LV.gf + 0.2, LV.f1 - 0.6, zE, 0.06, 0.03)

  /* ---------- WEST wing façade (z = WEST.z1) ---------- */
  const zW = WEST.z1
  // the 3.4 m return between the two façade planes, clad brown like the core
  b.block('pBrown', 0.12, LV.core - LV.gf, zE - zW, EAST.x1 + 0.06, LV.gf, (zE + zW) / 2)
  // brown stair core rising above the roof
  const kx0 = WEST.x0
  const kx1 = 8.4
  b.block('pBrown', kx1 - kx0, LV.core - LV.gf, 0.3, (kx0 + kx1) / 2, LV.gf, zW + 0.15)
  b.block('pBrown', kx1 - kx0, LV.core - LV.roof, 5.0, (kx0 + kx1) / 2, LV.roof, zW - 2.4)
  for (let y = LV.gf + 1.2; y < LV.core; y += 1.2) b.box('pDark', kx1 - kx0 + 0.02, 0.025, 0.02, (kx0 + kx1) / 2, y, zW + 0.31)
  for (const xx of [kx0 + 1.4, kx0 + 2.9]) b.box('pDark', 0.025, LV.core - LV.gf, 0.02, xx, (LV.gf + LV.core) / 2, zW + 0.31)
  // white end frame (right) and top band
  const ex1 = WEST.x1
  b.block('white', 2.0, LV.parapet - LV.gf, 1.0, ex1 - 1.0, LV.gf, zW + 0.5)
  b.block('white', ex1 - kx1, LV.parapet - LV.roof + 0.2, 1.0, (kx1 + ex1) / 2, LV.roof - 0.2, zW + 0.5)
  // background wall of the west façade (dark), glazed top floor and the band below the box
  panelZ(b, 'pDark', kx1, ex1 - 2.0, LV.gf, LV.roof, zW, 0.0, 0.05)
  panelZ(b, 'glassC', kx1 + 0.2, ex1 - 2.2, LV.f4 + 0.15, LV.roof - 0.25, zW, 0.06, 0.03)
  for (let xx = kx1 + 1.4; xx < ex1 - 2.2; xx += 1.4) panelZ(b, 'iron', xx - 0.03, xx + 0.03, LV.f4 + 0.15, LV.roof - 0.25, zW, 0.09, 0.03)
  panelZ(b, 'iron', kx1 + 0.2, ex1 - 2.2, LV.f4 + 1.6, LV.f4 + 1.68, zW, 0.09, 0.03)
  panelZ(b, 'glassC', kx1 + 0.2, ex1 - 2.2, LV.f1 + 0.5, LV.f2 - 0.35, zW, 0.06, 0.03)
  for (let xx = kx1 + 1.2; xx < ex1 - 2.2; xx += 1.2) panelZ(b, 'iron', xx - 0.03, xx + 0.03, LV.f1 + 0.5, LV.f2 - 0.35, zW, 0.09, 0.03)
  // sun-shading fins above the glazed top floor
  for (let xx = kx1 + 0.8; xx < ex1 - 1.8; xx += 2.6) b.beam('pDark', V(xx, LV.roof + 0.7, zW + 0.9), V(xx, LV.roof + 0.7, zW + 2.3), 0.12, 0.3)
  for (let k = 0; k < 4; k++) b.box('pDark', ex1 - kx1 - 2.4, 0.06, 0.28, (kx1 + ex1 - 2.0) / 2, LV.roof + 0.92, zW + 1.0 + k * 0.38)

  /* ---------- the cantilevered wave box (perforated / expanded aluminium) ---------- */
  const bx0 = kx1 + 0.6
  const bx1 = ex1 - 2.2
  const by0 = LV.f2 - 0.2
  const by1 = LV.f4 - 0.05
  const bz = zW + 1.45 // front plane
  const depth = 1.45
  b.block('perfGrey', bx1 - bx0, by1 - by0, 0.08, (bx0 + bx1) / 2, by0, bz - 0.04)
  for (const sx of [bx0, bx1]) b.block('perfGrey', 0.08, by1 - by0, depth, sx, by0, zW + depth / 2)
  b.block('pDark', bx1 - bx0 + 0.1, 0.3, depth + 0.05, (bx0 + bx1) / 2, by0 - 0.3, zW + depth / 2) // dark soffit
  b.block('aluNatural', bx1 - bx0 + 0.12, 0.08, depth + 0.1, (bx0 + bx1) / 2, by1, zW + depth / 2) // coping
  // vertical wavy unperforated bands
  const bandAt = (u: number, phase: number, amp: number, lam: number, y0: number, y1: number) => {
    const pts: P2[] = []
    for (let y = y0; y <= y1 + 1e-6; y += 0.25) pts.push([u + amp * Math.sin(((y - y0) / lam) * Math.PI * 2 + phase) + 0.5 * amp * Math.sin(((y - y0) / (lam * 0.47)) * Math.PI * 2 + phase * 1.7), Math.min(y, y1)])
    return pts
  }
  for (let u = bx0 + 0.45; u < bx1 - 0.2; u += 0.82) {
    const ph = rand() * Math.PI * 2
    ribbon(b, 'waveBand', bandAt(u, ph, 0.14 + rand() * 0.06, 2.2 + rand() * 0.8, by0 + 0.05, by1 - 0.05), 0.16 + rand() * 0.1, bz + 0.02)
  }
  for (const [sx, f] of [
    [bx0 - 0.05, -1],
    [bx1 + 0.05, 1],
  ] as P2[]) {
    for (let u = zW + 0.3; u < zW + depth - 0.1; u += 0.6) {
      ribbon(b, 'waveBand', bandAt(u, rand() * 6, 0.1, 2.4, by0 + 0.05, by1 - 0.05), 0.16, sx, 'x', f)
    }
  }

  /* ---------- canopy, columns, stair ---------- */
  const czF = zE + 2.2 // canopy front edge
  b.block('pDark', EAST.x1 - cx0, 0.9, czF - zE, (cx0 + EAST.x1) / 2, LV.f1 - 0.6, (zE + czF) / 2)
  b.block('pDark', ex1 - 2.0 - EAST.x1, 0.9, czF - zW, (EAST.x1 + ex1 - 2.0) / 2, LV.f1 - 0.6, (zW + czF) / 2)
  b.box('pLight', ex1 - 2.0 - cx0, 0.08, 0.04, (cx0 + ex1 - 2.0) / 2, LV.f1 - 0.15, czF + 0.03) // name band
  // recessed glazed ground floor of the west wing
  panelZ(b, 'glassC', kx1, ex1 - 2.0, LV.gf + 0.1, LV.f1 - 0.6, zW, 0.06, 0.03)
  for (let xx = kx1 + 1.5; xx < ex1 - 2.0; xx += 1.5) panelZ(b, 'iron', xx - 0.03, xx + 0.03, LV.gf + 0.1, LV.f1 - 0.6, zW, 0.09, 0.03)
  // seven colourful round columns along the west wing
  const colX = [1.3, 5.9, 10.1, 15.2, 18.2, 21.4, 24.4]
  const colC = ['cGreen', 'cOrange', 'cYellow', 'cCyan', 'cOrange', 'cGreen', 'cCyan']
  colX.forEach((cxp, i) => b.add(colC[i], new THREE.CylinderGeometry(0.22, 0.22, LV.f1 - 0.6, 16), mat(cxp, (LV.f1 - 0.6) / 2, czF - 0.4)))
  // forecourt slab in front of the raised ground floor of the west wing and the entrance stair
  b.block('concrete', ex1 - 2.0 - EAST.x1, LV.gf, czF - zW - 0.6, (EAST.x1 + ex1 - 2.0) / 2, 0, (zW + czF - 0.6) / 2)
  for (let i = 0; i < 8; i++) b.block('concrete', 3.0, LV.gf - i * (LV.gf / 8), 0.32, 3.0 + 0.0, 0, czF - 0.6 + 0.32 * (i + 0.5))
  for (const s of [-1, 1]) b.block('white', 0.25, 1.0 + LV.gf, 2.6, 3.0 + s * 1.6, 0, czF + 0.7)

  /* ---------- roof: penthouse, plant ---------- */
  b.block('pBrown', 9.5, 3.0, 8.5, -6.0, LV.roof, 9.5)
  b.block('pDark', 9.7, 0.15, 8.7, -6.0, LV.roof + 3.0, 9.5)
  const plant = (px: number, pz: number, w: number, d: number, h: number) => {
    b.block('galv', w, h, d, px, LV.roof, pz)
    b.block('galv', w + 0.1, 0.1, d + 0.1, px, LV.roof + h, pz)
  }
  plant(14, 6.5, 4.5, 2.6, 2.0)
  plant(19.5, 6.5, 3.2, 2.6, 2.4)
  plant(23.5, 4.0, 2.2, 4.0, 1.8)
  b.rod('galv', V(11, LV.roof + 2.2, 9.5), V(24, LV.roof + 2.2, 9.5), 0.45, 12)
  b.rod('galv', V(24, LV.roof + 2.2, 9.5), V(24, LV.roof + 2.2, 2.0), 0.45, 12)
  plant(-12, -12, 5.0, 3.0, 2.2)
  plant(-4, -16, 3.0, 3.0, 1.6)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [17, 12, 15.4],
  materials: () => {
    const std = (color: string, roughness = 0.6, metalness = 0.1) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    // perforated sheets read darker than solid sheet at model scale
    const perfWhite = std('#d9dcdd', 0.5, 0.45)
    const perfGrey = std('#757b81', 0.5, 0.55)
    const waveBand = std('#dfe2e4', 0.4, 0.5)
    return {
      perfWhite,
      perfGrey,
      waveBand,
      pDark: std('#4a4f57', 0.55, 0.3),
      pLight: std('#c4c8cc', 0.6, 0.2),
      pBrown: std('#7a4a2e', 0.55, 0.25),
      cYellow: std('#e3b51e'),
      cRed: std('#cf3a2c'),
      cBlue: std('#2b6fc4'),
      cOrange: std('#e07a26'),
      cGreen: std('#5aa83c'),
      cCyan: std('#1f9fb5'),
    }
  },
  notes: 'Main (north) façade from the photographs; side and rear elevations generic; perforated patterns drawn schematically.',
}
export default model
