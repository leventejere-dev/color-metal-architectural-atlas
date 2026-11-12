/**
 * Biserica Romano-Catolică „Găsirea Sfintei Cruci”, Zetea / Zetelaka
 * (OSM way 207345944; neo-Romanesque hall church built 1912–14).
 *
 * Modelling specification (real metres, origin = footprint centre at ground,
 * +X = main axis towards the chancel (NNE, OSM long axis 18.6°), main façade
 * and tower at −X, +Z = ESE side; the photographs show the façade and the
 * WNW (−Z) side):
 *  - Wide hall nave 36 × 23.6 m (OSM), eaves ≈ 10 m, under one large plain-tile
 *    roof of ≈ 37°: gable over the west façade (stone coping), hipped at the
 *    east end. Six bays divided by stepped buttress-pilasters with dark stone
 *    weatherings; five tall round-arched windows per side, the west bay with
 *    paired small windows on two levels (gallery); white arched corbel frieze
 *    (Lombard band) under the eaves; dark andesite socle (photos 09, 10).
 *  - Chancel 9.6 m wide with a 3/8 apse, taller walls (eaves ≈ 12.6 m) so that
 *    its steeper tile roof keeps the nave ridge height; hipped over the apse.
 *    Low annex (sacristy) along its WNW side with a grey slate lean-to roof,
 *    hipped at the east end (photos 09, 10).
 *  - Façade: gable with raking corbel frieze, corner buttresses, side doors and
 *    oculi; slender square stair turret on the left (WNW) of the tower with
 *    corbel frieze and a small copper pyramid roof with cross (05, 06, 04).
 *  - West tower projecting 5 m (OSM 7.4 m wide): lower block with angle
 *    buttresses, stepped round-arched portal, tall window, oculus and corbel
 *    frieze; set-back upper tower with corner pilasters, paired windows, tall
 *    arched belfry openings with white archivolts; clock stage with corbel
 *    frieze and a semicircular arched pediment over each clock (02, 06, 11).
 *  - COLOR METAL scope: KME natural copper — the tall square spire with a
 *    bell-cast foot sweeping over the four clock arches (flat-lock copper,
 *    warm brown-red/salmon as photographed), and the turret roof; copper ball
 *    and iron cross.
 * Approximations: heights derived from photo proportions (no survey); the ESE
 * side and the east end were not photographed (ESE side mirrored without the
 * annex; apse windows assumed); window tracery, portal columns and roof
 * details simplified; flat-lock copper shown with the standard copper sheet.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, seams } from '../kit'
import type { ModelModule } from '../registry'
import { linesTexture } from '../../lib/textures'

const D2R = Math.PI / 180
const NAVE = { x0: -22.0, x1: 14.0, hw: 11.8, h: 10.0 }
const PITCH = 37
const T = Math.tan(PITCH * D2R)
const OV = 0.5
const RIDGE = NAVE.h + NAVE.hw * T // ≈ 18.9
const CH = { hw: 4.8, h: 12.6, xe: 27.1 }
const XC = CH.xe - CH.hw // centre of the apse octagon
const RC = CH.hw / Math.sin(67.5 * D2R)
const TC = (RIDGE - CH.h) / CH.hw // chancel roof slope (same ridge)
const TWL = { x0: -27.1, x1: -20.9, hz: 3.7, h: 16.8 } // tower lower block
const TX = (TWL.x0 + TWL.x1) / 2
const TU = { hw: 3.0, y0: 16.8, y1: 24.8 } // upper tower
const YC = 26.6 // top of the clock stage cornice
const CU = 'copper'
const WALL = 'zetWall'
const TRIM = 'trim'
const SOCLE = 'zetSocle'
const CAP = 'zetCap'
const SILL = 'zetSill'
const TILE = 'zetTile'
const TILECAP = 'zetTileCap'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(aDeg * D2R), y, r * Math.sin(aDeg * D2R))
/** wall frames: local x along the wall, y up, z outward */
const F = {
  pz: (x: number, z: number) => mat(x, 0, z, 0),
  nz: (x: number, z: number) => mat(x, 0, z, Math.PI),
  nx: (x: number, z: number) => mat(x, 0, z, -Math.PI / 2),
  px: (x: number, z: number) => mat(x, 0, z, Math.PI / 2),
}

/* ---------------- reusable details ---------------- */

let ARCH_GEO: THREE.BufferGeometry | null = null
/** One small arch of the Lombard band (springing at y = 0, legs hanging below). */
function archGeo() {
  if (ARCH_GEO) return ARCH_GEO
  const r = 0.22
  const t = 0.07
  const leg = 0.22
  const s = new THREE.Shape()
  s.moveTo(-r - t, -leg)
  s.lineTo(-r - t, 0)
  s.absarc(0, 0, r + t, Math.PI, 0, true)
  s.lineTo(r + t, -leg)
  s.lineTo(r, -leg)
  s.lineTo(r, 0)
  s.absarc(0, 0, r, 0, Math.PI, false)
  s.lineTo(-r, -leg)
  s.closePath()
  ARCH_GEO = extrude(s, 0.08, 5)
  return ARCH_GEO
}

/** Lombard band on a wall frame m between u0 and u1; yOf(u) = springing height. */
function corbelBand(b: Builder, m: THREE.Matrix4, u0: number, u1: number, yOf: (u: number) => number, spacing = 0.78, band = true) {
  const n = Math.max(1, Math.round((u1 - u0) / spacing))
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    b.add(TRIM, archGeo(), mul(m, mat(u, yOf(u), 0)))
  }
  if (band) {
    const y0 = yOf(u0)
    const y1 = yOf(u1)
    const a = V(u0, y0 + 0.36, 0.06).applyMatrix4(m)
    const c = V(u1, y1 + 0.36, 0.06).applyMatrix4(m)
    b.beam(TRIM, a, c, 0.16, 0.12)
  }
}

/** Round-arched window with white surround, glass and stone sill. */
function archWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, o: { glass?: string; frame?: number; sill?: boolean; bars?: boolean } = {}) {
  const f = o.frame ?? 0.2
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), mul(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, 0, y0), 0.1), mul(m, mat(0, 0, 0.01)))
  if (o.sill !== false) b.add(SILL, metricBox(w + 2 * f + 0.25, 0.16, 0.3), mul(m, mat(0, y0 - f - 0.05, 0.12)))
  if (o.bars) {
    for (let j = 1; j < 4; j++) b.add('lead', metricBox(w, 0.04, 0.05), mul(m, mat(0, y0 + (j * (h - w / 2)) / 4, 0.05)))
    b.add('lead', metricBox(0.05, h - 0.1, 0.05), mul(m, mat(0, y0 + (h - 0.1) / 2, 0.05)))
  }
}

/** Oculus with moulded ring. */
function oculus(b: Builder, m: THREE.Matrix4, y: number, r: number) {
  b.add('glassC', new THREE.CircleGeometry(r, 22), mul(m, mat(0, y, 0.03)))
  b.add(TRIM, new THREE.TorusGeometry(r + 0.08, 0.1, 6, 22), mul(m, mat(0, y, 0.05)))
}

/** Clock dial. */
function clock(b: Builder, m: THREE.Matrix4, y: number, r: number) {
  b.add('white', new THREE.CylinderGeometry(r, r, 0.08, 28), mul(m, mat(0, y, 0.06, 0, Math.PI / 2)))
  b.add('clock', new THREE.TorusGeometry(r, 0.04, 5, 28), mul(m, mat(0, y, 0.11)))
  b.add('clock', new THREE.TorusGeometry(r * 0.72, 0.012, 4, 28), mul(m, mat(0, y, 0.105)))
  b.add('clock', metricBox(0.06, r * 0.8, 0.03), mul(m, mat(0, y + r * 0.35, 0.12)))
  b.add('clock', metricBox(r * 0.6, 0.06, 0.03), mul(m, mat(r * 0.26, y, 0.12)))
}

/** Stepped buttress on a wall frame (local z outward), base at u. Caps in dark stone. */
function buttress(b: Builder, m: THREE.Matrix4, u: number, w: number, steps: [number, number][]) {
  // steps: [depth, topY] from the bottom up
  let y = 0
  for (const [d, top] of steps) {
    b.add(WALL, metricBox(w, top - y, d), mul(m, mat(u, (y + top) / 2, d / 2)))
    // sloped weathering cap
    b.add(CAP, metricBox(w + 0.08, 0.16, d + 0.08), mul(m, mat(u, top - 0.02, d / 2 + 0.02, 0, -0.35)))
    y = top
  }
  b.add(SOCLE, metricBox(w + 0.12, 1.2, steps[0][0] + 0.12), mul(m, mat(u, 0.6, steps[0][0] / 2)))
}

/** Square ogee-free spire ring helper: square of half-width hw with an arched bump over each face centre. */
function squareRing(hw: number, y: number, bump: (u: number) => number, k: number, cx: number, cz: number) {
  const us = [-1, -0.7, -0.45, -0.3, -0.18, -0.08, 0, 0.08, 0.18, 0.3, 0.45, 0.7]
  const pts: THREE.Vector3[] = []
  for (let f = 0; f < 4; f++) {
    const phi = (f * Math.PI) / 2
    for (const t of us) {
      const x = hw * (Math.cos(phi) - t * Math.sin(phi))
      const z = hw * (Math.sin(phi) + t * Math.cos(phi))
      pts.push(V(cx + x, y + bump(t * hw) * k, cz + z))
    }
  }
  return pts
}

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw, h } = NAVE
  const len = x1 - x0
  const nx = (x0 + x1) / 2

  /* ---------------- nave walls ---------------- */
  b.block(WALL, len, h, 2 * hw, nx, 0, 0)
  b.block(SOCLE, len + 0.24, 1.2, 2 * hw + 0.24, nx, 0, 0)
  // eaves cornice (two steps) and Lombard band on both long sides
  b.block(TRIM, len + 0.3, 0.22, 2 * hw + 0.3, nx, h - 0.42, 0)
  b.block(TRIM, len + 0.6, 0.2, 2 * hw + 0.6, nx, h - 0.2, 0)
  corbelBand(b, F.pz(0, hw), x0 + 0.6, x1 - 0.6, () => h - 0.95)
  corbelBand(b, F.nz(0, -hw), -x1 + 0.6, -x0 - 0.6, () => h - 0.95)
  // buttress-pilasters and windows (bays of 6 m)
  const bayX = [-16, -10, -4, 2, 8]
  for (const [m, sgn] of [[F.pz(0, hw), 1], [F.nz(0, -hw), -1]] as [THREE.Matrix4, number][]) {
    for (const x of bayX) {
      const u = sgn * x
      buttress(b, m, u, 1.0, [[0.7, 3.4], [0.45, 6.3]])
      b.add(TRIM, metricBox(1.0, h - 6.3 - 0.4, 0.2), mul(m, mat(u, (6.3 + h - 0.4) / 2, 0.1)))
    }
    // corner buttresses
    for (const x of [x0 + 0.6, x1 - 0.6]) {
      const u = sgn * x
      buttress(b, m, u, 1.2, [[0.8, 3.6], [0.5, 6.6]])
      b.add(TRIM, metricBox(1.2, h - 6.6 - 0.4, 0.25), mul(m, mat(u, (6.6 + h - 0.4) / 2, 0.12)))
    }
    for (const x of [-13, -7, -1, 5, 11]) archWindow(b, mul(m, mat(sgn * x, 0, 0)), 1.9, 4.3, 2.8, { bars: true })
    // west (gallery) bay: paired small windows on two levels
    for (const dx of [-0.6, 0.6]) {
      for (const y0 of [2.9, 5.6]) archWindow(b, mul(m, mat(sgn * (-19 + dx), 0, 0)), 0.75, 1.75, y0, { frame: 0.14 })
    }
  }

  /* ---------------- nave roof: west gable, east hip ---------------- */
  const eY = h - OV * T
  const nhw = hw + OV
  const xa = x0 - 0.05
  const xb = x1 + OV
  const xh = xb - nhw // hip apex
  const R = RIDGE
  facet(b, TILE, [V(xa, eY, nhw), V(xb, eY, nhw), V(xh, R, 0), V(xa, R, 0)], { thickness: 0.18 })
  facet(b, TILE, [V(xb, eY, -nhw), V(xa, eY, -nhw), V(xa, R, 0), V(xh, R, 0)], { thickness: 0.18 })
  facet(b, TILE, [V(xb, eY, nhw), V(xb, eY, -nhw), V(xh, R, 0)], { thickness: 0.18 })
  b.beam(TILECAP, V(xa, R + 0.08, 0), V(xh, R + 0.08, 0), 0.32, 0.2)
  for (const s of [-1, 1]) b.beam(TILECAP, V(xb, eY + 0.08, s * nhw), V(xh, R + 0.08, 0), 0.3, 0.18)
  for (const s of [-1, 1]) b.rod('helm', V(xa, eY - 0.1, s * (nhw + 0.06)), V(xb, eY - 0.1, s * (nhw + 0.06)), 0.09, 6)
  // west gable wall with stone coping and raking Lombard band
  {
    const gT = 0.7
    const g = new THREE.Shape([new THREE.Vector2(-hw, h - 0.01), new THREE.Vector2(hw, h - 0.01), new THREE.Vector2(0, R + 0.25)])
    b.add(WALL, extrude(g, gT), mat(x0 + gT, 0, 0, -Math.PI / 2))
    for (const s of [-1, 1]) b.beam('stoneGrey', V(x0 + 0.25, h + 0.05, s * (hw + 0.15)), V(x0 + 0.25, R + 0.4, 0), 0.75, 0.3, V(1, 0, 0))
    const mF = F.nx(x0, 0)
    // band follows the rake on both halves (u = z for the -x face)
    corbelBand(b, mF, -hw + 0.8, -TWL.hz - 0.3, (u) => h + (hw - Math.abs(u)) * T - 0.95)
    corbelBand(b, mF, TWL.hz + 0.3, hw - 0.8, (u) => h + (hw - Math.abs(u)) * T - 0.95)
    // façade corner buttresses facing west
    for (const s of [-1, 1]) buttress(b, mF, s * (hw - 0.6), 1.2, [[0.8, 3.6], [0.5, 6.6]])
    // side doors, oculi and small windows
    for (const s of [-1, 1]) {
      const u = s * 6.2
      const dm = mul(mF, mat(u, 0, 0))
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 3.0, 0, 0.6, 12))), mul(dm, mat(0, 0, 0.03)))
      b.add(CAP, extrude(frameShape('round', 1.4, 3.0, 0.28, 0, 0.6), 0.16), mul(dm, mat(0, 0, 0.01)))
      b.block('stoneGrey', 1.0, 0.6, 2.4, x0 - 0.5, 0, s * 6.2)
      oculus(b, dm, 6.0, 0.55)
      archWindow(b, mul(mF, mat(s * 9.6, 0, 0)), 0.9, 2.4, 3.2, { frame: 0.14 })
    }
  }

  /* ---------------- chancel with 3/8 apse ---------------- */
  {
    const cx0 = x1 - 0.6
    const ring = (y: number, grow = 0) => {
      const hwc = CH.hw + grow
      const rc = RC + grow / Math.cos(22.5 * D2R)
      return [V(cx0, y, -hwc), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(cx0, y, hwc)]
    }
    b.add(WALL, loft([ring(0), ring(CH.h)], { capTop: true, flat: true }))
    b.add(SOCLE, loft([ring(0, 0.12), ring(1.2, 0.12)], { capTop: true, flat: true }))
    b.add(TRIM, loft([ring(CH.h - 0.42, 0.15), ring(CH.h - 0.2, 0.15)], { capTop: true, capBottom: true, flat: true }))
    b.add(TRIM, loft([ring(CH.h - 0.2, 0.3), ring(CH.h, 0.3)], { capTop: true, capBottom: true, flat: true }))
    // Lombard band along the chancel walls
    const v67 = apsePt(67.5, RC, 0)
    corbelBand(b, F.pz(0, CH.hw), x1 + 0.3, v67.x - 0.3, () => CH.h - 0.95)
    corbelBand(b, F.nz(0, -CH.hw), -(v67.x - 0.3), -(x1 + 0.3), () => CH.h - 0.95)
    for (const a of [45, 0, -45]) {
      const p = V(XC + CH.hw * Math.cos(a * D2R), 0, CH.hw * Math.sin(a * D2R))
      const m = mat(p.x, 0, p.z, Math.PI / 2 - a * D2R)
      const side = CH.hw * Math.tan(22.5 * D2R)
      corbelBand(b, m, -side + 0.3, side - 0.3, () => CH.h - 0.95)
      archWindow(b, m, 1.5, 4.2, 4.6, { bars: true })
      buttress(b, mat(apsePt(a + 22.5, RC, 0).x, 0, apsePt(a + 22.5, RC, 0).z, Math.PI / 2 - (a + 22.5) * D2R), 0, 0.9, [[0.6, 3.6], [0.4, 7.0]])
    }
    // +Z chancel wall windows (not photographed – assumed like the apse)
    for (const x of [17.0, 21.0]) archWindow(b, F.pz(x, CH.hw), 1.4, 3.6, 6.0, { bars: true })
    // roof (steeper, same ridge as the nave)
    const ov = 0.45
    const ce = CH.h - ov * TC
    const chw = CH.hw + ov
    const rcO = RC * (chw / CH.hw)
    const apex = V(XC, RIDGE, 0)
    const xs = xh - 0.2
    facet(b, TILE, [V(xs, ce, chw), apsePt(67.5, rcO, ce), apex, V(xs, RIDGE, 0)], { thickness: 0.16 })
    facet(b, TILE, [apsePt(-67.5, rcO, ce), V(xs, ce, -chw), V(xs, RIDGE, 0), apex], { thickness: 0.16 })
    const aa = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, TILE, [apsePt(aa[i], rcO, ce), apsePt(aa[i + 1], rcO, ce), apex], { thickness: 0.16 })
    b.beam(TILECAP, V(xh, RIDGE + 0.08, 0), apex.clone().add(V(0, 0.08, 0)), 0.32, 0.2)
    for (const a of aa) b.beam(TILECAP, apsePt(a, rcO, ce + 0.07), apex.clone().add(V(0, 0.07, 0)), 0.26, 0.16)
    b.rod('helm', V(x1, ce - 0.1, chw + 0.06), apsePt(67.5, rcO + 0.06, ce - 0.1), 0.08, 6)
    // small cross on the apse apex
    b.rod('iron', apex, apex.clone().add(V(0, 1.6, 0)), 0.05, 6)
    b.add('iron', metricBox(0.06, 0.06, 0.7), mat(apex.x, apex.y + 1.2, 0))
  }

  /* ---------------- sacristy annex (WNW side, slate lean-to) ---------------- */
  {
    const ax0 = x1
    const ax1 = 22.4
    const az = -8.6
    const ah = 5.0
    const top = 8.8
    const k = (top - ah) / (-CH.hw - az)
    b.block(WALL, ax1 - ax0, ah, -CH.hw - az, (ax0 + ax1) / 2, 0, (az - CH.hw) / 2)
    b.block(SOCLE, ax1 - ax0 + 0.2, 1.2, -CH.hw - az + 0.2, (ax0 + ax1) / 2, 0, (az - CH.hw) / 2)
    b.block(TRIM, ax1 - ax0 + 0.3, 0.25, -CH.hw - az + 0.3, (ax0 + ax1) / 2, ah - 0.25, (az - CH.hw) / 2)
    const ov = 0.35
    const yl = ah - ov * k
    const zo = az - ov
    const run = -CH.hw - zo
    const A = V(ax0, yl, zo)
    const B = V(ax1 + ov, yl, zo)
    const C = V(ax1 + ov - run, top, -CH.hw)
    const Dd = V(ax0, top, -CH.hw)
    const E = V(ax1 + ov, yl, -CH.hw)
    facet(b, 'slate', [A, B, C, Dd], { thickness: 0.12 })
    facet(b, 'slate', [B, E, C], { thickness: 0.12 })
    b.beam('helm', B.clone().add(V(0, 0.05, 0)), C.clone().add(V(0, 0.05, 0)), 0.16, 0.08)
    for (const x of [16.2, 20.2]) archWindow(b, F.nz(x, az), 0.8, 1.7, 1.9, { frame: 0.14 })
    archWindow(b, F.px(ax1, (az - CH.hw) / 2), 0.8, 1.7, 1.9, { frame: 0.14 })
  }

  /* ---------------- tower: lower block ---------------- */
  {
    const { x0: tx0, x1: tx1, hz, h: th } = TWL
    b.block(WALL, tx1 - tx0, th, 2 * hz, TX, 0, 0)
    b.block(SOCLE, tx1 - tx0 + 0.24, 1.2, 2 * hz + 0.24, TX, 0, 0)
    b.block(TRIM, tx1 - tx0 + 0.4, 0.25, 2 * hz + 0.4, TX, th - 0.5, 0)
    b.block(TRIM, tx1 - tx0 + 0.6, 0.25, 2 * hz + 0.6, TX, th - 0.25, 0)
    b.block('helm', tx1 - tx0 + 0.5, 0.06, 2 * hz + 0.5, TX, th, 0)
    const mF = F.nx(tx0, 0)
    corbelBand(b, mF, -hz + 0.7, hz - 0.7, () => th - 1.25)
    for (const s of [-1, 1]) corbelBand(b, s > 0 ? F.pz(0, hz) : F.nz(0, -hz), s > 0 ? tx0 + 0.6 : -x0 + 0.2, s > 0 ? x0 - 0.2 : -tx0 - 0.6, () => th - 1.25)
    // angle buttresses at the front corners
    for (const s of [-1, 1]) {
      buttress(b, mF, s * (hz - 0.55), 1.1, [[0.9, 4.2], [0.65, 8.2], [0.4, 12.2]])
      const sm = s > 0 ? F.pz(0, hz) : F.nz(0, -hz)
      buttress(b, sm, s > 0 ? tx0 + 0.55 : -tx0 - 0.55, 1.1, [[0.9, 4.2], [0.65, 8.2], [0.4, 12.2]])
    }
    // portal: stepped round archivolt in dark stone, wooden door, steps
    const pm = mF
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.7, 3.9, 0, 0.6, 14))), mul(pm, mat(0, 0, 0.03)))
    b.add(CAP, extrude(frameShape('round', 1.7, 3.9, 0.3, 0, 0.6), 0.25), mul(pm, mat(0, 0, 0.01)))
    b.add(TRIM, extrude(frameShape('round', 2.3, 4.5, 0.3, 0, 0.6), 0.4), mul(pm, mat(0, 0, 0.01)))
    b.add(CAP, extrude(frameShape('round', 2.9, 5.1, 0.32, 0, 0.6), 0.55), mul(pm, mat(0, 0, 0.01)))
    for (let i = 0; i < 3; i++) b.block('stoneGrey', 0.9 + i * 0.4, 0.6 - i * 0.2, 4.4 + i * 0.6, tx0 - (0.9 + i * 0.4) / 2, 0, 0)
    // tall window, oculus
    archWindow(b, pm, 1.15, 3.2, 7.3, { bars: true })
    oculus(b, pm, 12.6, 0.6)
    // side faces: small windows
    for (const s of [-1, 1]) {
      const sm = s > 0 ? F.pz(TX, hz) : F.nz(TX, -hz)
      archWindow(b, sm, 0.8, 2.0, 7.6, { frame: 0.14 })
      oculus(b, sm, 12.6, 0.5)
    }
  }

  /* ---------------- tower: upper stages ---------------- */
  {
    const { hw: uh, y0, y1 } = TU
    b.block(WALL, 2 * uh, y1 - y0, 2 * uh, TX, y0, 0)
    // corner pilasters framing recessed panels
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block(TRIM, 0.85, y1 - y0, 0.14, TX + sx * (uh - 0.425), y0, sz * (uh + 0.07))
      b.block(TRIM, 0.14, y1 - y0, 0.85, TX + sx * (uh + 0.07), y0, sz * (uh - 0.425))
    }
    b.block(TRIM, 2 * uh + 0.3, 0.3, 2 * uh + 0.3, TX, y0, 0)
    // clock stage
    b.block(TRIM, 2 * uh + 0.5, 0.3, 2 * uh + 0.5, TX, y1, 0)
    b.block(WALL, 2 * uh + 0.1, YC - 0.4 - (y1 + 0.3), 2 * uh + 0.1, TX, y1 + 0.3, 0)
    b.block(TRIM, 2 * uh + 0.5, 0.2, 2 * uh + 0.5, TX, YC - 0.4, 0)
    b.block(TRIM, 2 * uh + 0.8, 0.2, 2 * uh + 0.8, TX, YC - 0.2, 0)
    const faces = [
      { m: F.nx(TX - uh, 0) },
      { m: F.px(TX + uh, 0) },
      { m: F.pz(TX, uh) },
      { m: F.nz(TX, -uh) },
    ]
    const archR = 1.05
    const archY = YC - 0.75
    for (const { m } of faces) {
      // paired windows and sill band
      for (const du of [-0.55, 0.55]) archWindow(b, mul(m, mat(du, 0, 0.14)), 0.62, 1.2, 18.0, { frame: 0.1, sill: false })
      b.add(TRIM, metricBox(2.4, 0.18, 0.3), mul(m, mat(0, 17.82, 0.2)))
      // belfry opening with archivolt and imposts
      archWindow(b, mul(m, mat(0, 0, 0.14)), 1.3, 3.3, 20.4, { glass: 'black', frame: 0.3 })
      for (let i = 0; i < 6; i++) b.add('wood', metricBox(1.24, 0.06, 0.1), mul(m, mat(0, 20.7 + i * 0.36, 0.1, 0, -0.5)))
      for (const du of [-0.8, 0.8]) b.add(SILL, metricBox(0.36, 0.3, 0.3), mul(m, mat(du, 22.9, 0.28)))
      // corbel frieze on the clock stage (broken by the clock arch)
      corbelBand(b, mul(m, mat(0, 0, 0.05)), -uh + 0.1, -archR - 0.25, () => YC - 1.25, 0.62, false)
      corbelBand(b, mul(m, mat(0, 0, 0.05)), archR + 0.25, uh - 0.1, () => YC - 1.25, 0.62, false)
      // arched pediment over the clock
      const tym = new THREE.Shape()
      tym.moveTo(-archR - 0.25, 0)
      tym.lineTo(archR + 0.25, 0)
      tym.absarc(0, 0, archR + 0.25, 0, Math.PI, false)
      tym.closePath()
      b.add(WALL, extrude(tym, 0.5, 16), mul(m, mat(0, archY, -0.3)))
      const ringS = new THREE.Shape()
      ringS.moveTo(archR + 0.3, 0)
      ringS.absarc(0, 0, archR + 0.3, 0, Math.PI, false)
      ringS.lineTo(-archR, 0)
      ringS.absarc(0, 0, archR, Math.PI, 0, true)
      ringS.closePath()
      b.add(TRIM, extrude(ringS, 0.28, 16), mul(m, mat(0, archY, 0.2)))
      clock(b, mul(m, mat(0, 0, 0.2)), archY + 0.05, 0.62)
    }
  }

  /* ---------------- copper spire (COLOR METAL) ---------------- */
  {
    const archR = 1.35
    const bump = (u: number) => (Math.abs(u) < archR ? Math.sqrt(archR * archR - u * u) * 0.78 : 0)
    const y0 = YC - 0.08
    const tip = YC + 8.8
    const rings = [
      squareRing(TU.hw + 0.42, y0, bump, 1, TX, 0),
      squareRing(TU.hw + 0.25, y0 + 0.2, bump, 0.95, TX, 0),
      squareRing(TU.hw + 0.02, y0 + 0.55, bump, 0.6, TX, 0),
      squareRing(TU.hw - 0.18, y0 + 1.0, bump, 0.15, TX, 0),
      squareRing(TU.hw - 0.3, y0 + 1.35, bump, 0, TX, 0),
    ]
    const yl = y0 + 1.35
    const hwl = TU.hw - 0.3
    b.add(CU, loft(rings, { capBottom: true }))
    // arris ribs (corners) and horizontal flat-lock courses suggested by fine bands
    const corners = [0, 12, 24, 36]
    for (const idx of corners) {
      for (let i = 0; i < rings.length - 1; i++) b.beam(CU, rings[i][idx].clone().add(V(0, 0.04, 0)), rings[i + 1][idx].clone().add(V(0, 0.04, 0)), 0.09, 0.07)
    }
    // standing seams up the straight pyramid faces
    const sp = seams(CU, 0.55, 0.035, 0.04)
    const P = (u: number, w: number, y: number, f: number) => {
      const phi = (f * Math.PI) / 2
      return V(TX + w * (Math.cos(phi) - u * Math.sin(phi)), y, w * (Math.sin(phi) + u * Math.cos(phi)))
    }
    for (let f = 0; f < 4; f++) {
      facet(b, CU, [P(-1, hwl, yl, f), P(1, hwl, yl, f), V(TX, tip, 0)], { seams: { ...sp, h: 0.025 } })
      b.beam(CU, P(1, hwl, yl + 0.04, f), V(TX, tip + 0.04, 0), 0.09, 0.07)
    }
    // ball and cross
    b.rod(CU, V(TX, tip - 0.2, 0), V(TX, tip + 0.35, 0), 0.07, 8)
    b.add(CU, new THREE.SphereGeometry(0.32, 18, 12), mat(TX, tip + 0.55, 0))
    b.rod('iron', V(TX, tip + 0.8, 0), V(TX, tip + 2.6, 0), 0.05, 6)
    b.add('iron', metricBox(0.08, 0.08, 0.9), mat(TX, tip + 2.15, 0))
    b.add('iron', metricBox(0.07, 1.6, 0.07), mat(TX, tip + 1.9, 0))
  }

  /* ---------------- stair turret (WNW of the tower) ---------------- */
  {
    const tx0 = -24.0
    const tx1 = -21.0
    const tz1 = -TWL.hz
    const tz0 = tz1 - 3.0
    const th = 16.2
    const cx = (tx0 + tx1) / 2
    const cz = (tz0 + tz1) / 2
    b.block(WALL, tx1 - tx0, th, tz1 - tz0, cx, 0, cz)
    b.block(SOCLE, tx1 - tx0 + 0.2, 1.2, tz1 - tz0 + 0.2, cx, 0, cz)
    b.block(TRIM, tx1 - tx0 + 0.4, 0.2, tz1 - tz0 + 0.4, cx, th - 0.45, cz)
    b.block(TRIM, tx1 - tx0 + 0.6, 0.25, tz1 - tz0 + 0.6, cx, th - 0.25, cz)
    for (const m of [F.nx(tx0, cz), F.nz(cx, tz0)]) {
      corbelBand(b, m, -1.2, 1.2, () => th - 1.1, 0.6, false)
      for (const y0 of [3.4, 7.4, 11.2]) archWindow(b, m, 0.5, 1.25, y0, { frame: 0.1 })
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1]]) b.block(TRIM, 0.3, th - 1.4, 0.3, cx + sx * 1.45, 1.2, cz + sz * 1.45)
    // copper pyramid roof (older, browner copper)
    const ry = th
    const rh = 2.4
    const o = 0.3
    const hwT = 1.5 + o
    const c = [V(cx - hwT, ry, cz - hwT), V(cx + hwT, ry, cz - hwT), V(cx + hwT, ry, cz + hwT), V(cx - hwT, ry, cz + hwT)]
    const ap = V(cx, ry + rh, cz)
    for (let i = 0; i < 4; i++) {
      facet(b, 'copperBrown', [c[i], c[(i + 1) % 4], ap], { seams: seams('copperBrown', 0.45, 0.03, 0.035), thickness: 0.08 })
      b.beam('copperBrown', c[i], ap, 0.08, 0.06)
    }
    b.rod('iron', ap, ap.clone().add(V(0, 1.4, 0)), 0.04, 6)
    b.add('iron', metricBox(0.05, 0.05, 0.55), mat(cx, ap.y + 1.1, cz))
    b.add('iron', new THREE.TorusGeometry(0.2, 0.025, 4, 14), mat(cx, ap.y + 0.75, cz, Math.PI / 2))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [TX, YC + 2.5, 0],
  materials: () => {
    const map = linesTexture('#9a3f25', '#712c17', 6)
    map.repeat.set(1, 1 / 1.0)
    return {
      zetTile: new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.85 }),
      zetTileCap: new THREE.MeshStandardMaterial({ color: '#94401f', roughness: 0.85 }),
      zetWall: new THREE.MeshStandardMaterial({ color: '#ecdeaa', roughness: 0.9 }),
      zetSocle: new THREE.MeshStandardMaterial({ color: '#5f5953', roughness: 0.92 }),
      zetCap: new THREE.MeshStandardMaterial({ color: '#4c4946', roughness: 0.8 }),
      zetSill: new THREE.MeshStandardMaterial({ color: '#8c5d4b', roughness: 0.85 }),
    }
  },
  notes: 'Zetea RC church (1912–14): wide neo-Romanesque hall with chancel and west tower; KME natural copper spire with bell-cast foot over the clock arches. Heights estimated from photographs; ESE side and east end not photographed.',
}

export default model
