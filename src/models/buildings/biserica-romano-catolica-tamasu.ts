/**
 * Biserica Romano-Catolică „Sfântul Apostol Toma”, Tămașu / Székelyszenttamás
 * (OSM way 384192443; present church rebuilt 1820–21).
 *
 * Modelling specification (real metres, origin = footprint centre at ground,
 * +X = main axis towards the apse / east, west tower at −X, +Z = south):
 *  - Single-cell hall 19.0 × 10.5 m (OSM), eaves ≈ 7.6 m, closed to the east by a
 *    3/8 polygonal apse of the same width (OSM tip at x ≈ 12.4). White plaster,
 *    grey cement socle, simple profiled eaves cornice, gutters.
 *  - Roof: new orange-red ceramic tiles, ~50°, west gable behind the tower, three
 *    hip facets over the apse, small iron cross at the apse apex (photos 01, 03, 04).
 *  - North sacristy beside the choir end (not in OSM): lean-to roof falling north,
 *    hipped at its west end, trapezoidal east wall, small windows (photos 01, 02, 03).
 *  - Round-arched nave windows, two on the north wall west of the sacristy, three
 *    on the south wall; one window on each diagonal apse face, blind panel on the
 *    axial face (photos 01, 02).
 *  - West tower 4.2 m square, projecting ≈ 2.7 m (OSM): ground stage with arched door
 *    and oval window, middle stage with oculi, tall belfry with corner pilasters,
 *    arched louvred openings and four clock faces set under segmental arched
 *    cornices; grey metal weatherings on the string cornices (photos 05, 07, 09).
 *    Two low corner annexes with chamfered outer corners flank the tower base,
 *    roofed in grey sheet metal (photos 02, 05).
 *  - COLOR METAL scope: Cu-DHP copper sheet & strip on the tower top — square hood
 *    following the arched cornices, octagonal bulb, lantern drum with flared skirt,
 *    small cap, tall octagonal spire, ball; standing seams on the octagon arrises.
 *    Freshly installed, bright salmon copper as photographed (07, 09). Iron
 *    double-barred cross.
 * Approximations: all heights estimated from the photographs (no survey); south
 * elevation largely hidden by trees (window rhythm assumed); sacristy size
 * estimated; helm profile simplified to eight-sided stations; window joinery,
 * tower cartouches and gutters' downpipes omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, prismOutline, helm, seams } from '../kit'
import type { ModelModule } from '../registry'
import { linesTexture } from '../../lib/textures'

const D2R = Math.PI / 180
const NAVE = { x0: -9.7, hw: 5.25, h: 7.6 }
const XC = 7.1 // centre of the apse octagon
const RC = NAVE.hw / Math.sin(67.5 * D2R) // octagon circumradius
const X1 = XC + RC * Math.cos(67.5 * D2R) // first apse corner (≈ 9.27)
const PITCH = 50
const T = Math.tan(PITCH * D2R)
const OV = 0.45
const RIDGE = NAVE.h + NAVE.hw * T
const TW = { x: -10.35, hw: 2.1 }
const CU = 'copperNew'
const WALL = 'plasterWhite'
const TRIM = 'white'
const SOCLE = 'stoneGrey'
const TILE = 'tamTile'
const TILECAP = 'tamTileCap'
const GREY = 'helm'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(aDeg * D2R), y, r * Math.sin(aDeg * D2R))

/** Plan ring of the hall (nave + 3/8 apse), grown outward by `grow`. */
function hallRing(y: number, grow = 0) {
  const hw = NAVE.hw + grow
  const rc = RC + grow / Math.cos(22.5 * D2R)
  return [V(NAVE.x0 - grow, y, -hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(NAVE.x0 - grow, y, hw)]
}

/** Round-arched window on a wall frame m (local x along wall, y up, z outward). */
function archWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, louvre = false) {
  b.add(louvre ? 'wood' : 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), mul(m, mat(0, 0, 0.03)))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.17, 0, y0), 0.09), mul(m, mat(0, 0, 0.01)))
  b.add(TRIM, metricBox(w + 0.5, 0.1, 0.2), mul(m, mat(0, y0 - 0.22, 0.09)))
  if (louvre) for (let i = 0; i < 6; i++) b.add('wood', metricBox(w - 0.06, 0.06, 0.1), mul(m, mat(0, y0 + 0.25 + i * 0.27, 0.06, 0, -0.5)))
}

/** Oval / round window (oculus) with a moulded ring. */
function oculus(b: Builder, m: THREE.Matrix4, y: number, r: number, sx = 1, sy = 1) {
  b.add('glassC', new THREE.CircleGeometry(r, 22), mul(m, mat(0, y, 0.03, 0, 0, 0, sx, sy, 1)))
  b.add(TRIM, new THREE.TorusGeometry(r + 0.06, 0.08, 6, 22), mul(m, mat(0, y, 0.04, 0, 0, 0, sx, sy, 1)))
}

/** Clock face (white dial, dark rim and hands). */
function clock(b: Builder, m: THREE.Matrix4, y: number, r: number) {
  b.add(TRIM, new THREE.CylinderGeometry(r, r, 0.08, 24), mul(m, mat(0, y, 0.04, 0, Math.PI / 2)))
  b.add('clock', new THREE.TorusGeometry(r, 0.035, 5, 24), mul(m, mat(0, y, 0.09)))
  b.add('clock', metricBox(0.05, r * 0.75, 0.03), mul(m, mat(0, y + r * 0.33, 0.1)))
  b.add('clock', metricBox(r * 0.55, 0.05, 0.03), mul(m, mat(-r * 0.24, y, 0.1)))
}

/** Double-barred (patriarchal) iron cross on the ball. */
function doubleCross(b: Builder, key: string, x: number, y: number, z: number, s: number) {
  const t = 0.07
  b.add(key, metricBox(t, s, t), mat(x, y + s / 2, z))
  b.add(key, metricBox(s * 0.36, t, t), mat(x, y + s * 0.84, z))
  b.add(key, metricBox(s * 0.54, t, t), mat(x, y + s * 0.64, z))
  for (const [u, v] of [[s * 0.18, 0.84], [-s * 0.18, 0.84], [s * 0.27, 0.64], [-s * 0.27, 0.64], [0, 1]] as [number, number][]) {
    b.add(key, new THREE.SphereGeometry(0.06, 8, 6), mat(x + u, y + s * v, z))
  }
}

/** Arch profile of the top cornice over the clocks (segmental, springs at ±UA). */
const ARCH = { rise: 0.7, ua: 1.45 }
const ARCH_R = (ARCH.ua ** 2 + ARCH.rise ** 2) / (2 * ARCH.rise)
const arch = (u: number) => (Math.abs(u) < ARCH.ua ? Math.sqrt(ARCH_R ** 2 - u * u) - (ARCH_R - ARCH.rise) : 0)

function build(): Builder {
  const b = new Builder()

  /* ---------------- hall (nave + 3/8 apse) ---------------- */
  b.add(WALL, loft([hallRing(0), hallRing(NAVE.h)], { capTop: true, flat: true }))
  b.add(SOCLE, loft([hallRing(0, 0.1), hallRing(0.85, 0.1)], { capTop: true, flat: true }))
  b.add(TRIM, loft([hallRing(NAVE.h - 0.5, 0.1), hallRing(NAVE.h - 0.25, 0.1)], { capTop: true, capBottom: true, flat: true }))
  b.add(TRIM, loft([hallRing(NAVE.h - 0.25, 0.26), hallRing(NAVE.h, 0.26)], { capTop: true, capBottom: true, flat: true }))
  // corner lesenes of the apse
  for (const a of [67.5, 22.5, -22.5, -67.5]) {
    const p = apsePt(a, RC, 0)
    b.add(WALL, metricBox(0.55, NAVE.h - 0.5, 0.12), mat(p.x, (NAVE.h - 0.5) / 2, p.z, Math.PI / 2 - a * D2R))
  }

  /* ---------------- tiled roof ---------------- */
  const eY = NAVE.h - OV * T
  const nhw = NAVE.hw + OV
  const rcO = RC * (nhw / NAVE.hw)
  const xa = NAVE.x0 - 0.35
  const apex = V(XC, RIDGE, 0)
  const vS = apsePt(67.5, rcO, eY)
  const vN = apsePt(-67.5, rcO, eY)
  facet(b, TILE, [V(xa, eY, nhw), vS, apex, V(xa, RIDGE, 0)], { thickness: 0.16 })
  facet(b, TILE, [vN, V(xa, eY, -nhw), V(xa, RIDGE, 0), apex], { thickness: 0.16 })
  const aa = [67.5, 22.5, -22.5, -67.5]
  for (let i = 0; i < 3; i++) facet(b, TILE, [apsePt(aa[i], rcO, eY), apsePt(aa[i + 1], rcO, eY), apex], { thickness: 0.16 })
  b.beam(TILECAP, V(xa, RIDGE + 0.06, 0), V(XC, RIDGE + 0.06, 0), 0.3, 0.2)
  for (const a of aa) b.beam(TILECAP, apsePt(a, rcO, eY + 0.07), V(XC, RIDGE + 0.07, 0), 0.26, 0.16)
  // verges of the west gable
  for (const s of [-1, 1]) b.beam(TILECAP, V(xa + 0.05, eY + 0.05, s * nhw), V(xa + 0.05, RIDGE + 0.05, 0), 0.22, 0.26, V(1, 0, 0))
  // gutters along the eaves
  const gut = (p: THREE.Vector3, q: THREE.Vector3) => b.rod(GREY, p.clone().add(V(0, -0.08, 0)), q.clone().add(V(0, -0.08, 0)), 0.08, 6)
  gut(V(xa, eY, nhw + 0.05), vS)
  gut(vN, V(xa, eY, -nhw - 0.05))
  for (let i = 0; i < 3; i++) gut(apsePt(aa[i], rcO + 0.05, eY), apsePt(aa[i + 1], rcO + 0.05, eY))
  // west gable wall
  const gable = new THREE.Shape([new THREE.Vector2(-NAVE.hw, NAVE.h - 0.01), new THREE.Vector2(NAVE.hw, NAVE.h - 0.01), new THREE.Vector2(0, RIDGE - 0.05)])
  b.add(WALL, extrude(gable, 0.6), mat(NAVE.x0 + 0.6, 0, 0, -Math.PI / 2))
  // small iron cross on the apse apex
  b.rod('iron', V(XC, RIDGE, 0), V(XC, RIDGE + 1.5, 0), 0.04, 6)
  b.add('iron', metricBox(0.05, 0.05, 0.6), mat(XC, RIDGE + 1.15, 0))

  /* ---------------- nave & apse windows ---------------- */
  for (const x of [-4.4, 1.0, 5.8]) archWindow(b, mat(x, 0, NAVE.hw, 0), 1.0, 2.5, 3.6)
  for (const x of [-4.4, 1.0]) archWindow(b, mat(x, 0, -NAVE.hw, Math.PI), 1.0, 2.5, 3.6)
  for (const a of [45, -45]) {
    const p = V(XC + NAVE.hw * Math.cos(a * D2R), 0, NAVE.hw * Math.sin(a * D2R))
    archWindow(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 0.85, 2.4, 3.8)
  }
  // blind panel on the axial apse face
  b.add(WALL, metricBox(2.4, 3.6, 0.08), mat(XC + NAVE.hw + 0.04, 3.2, 0, Math.PI / 2))

  /* ---------------- north sacristy (lean-to) ---------------- */
  {
    const SX0 = 2.8
    const SX1 = 10.0
    const SZ = -9.2
    const SH = 4.0
    const YH = 6.6
    const k = (YH - SH) / (-NAVE.hw - SZ)
    const zc = -NAVE.hw + (SX1 - X1) // where the east wall meets the NE apse face
    prismOutline(b, WALL, [[SX0, -NAVE.hw + 0.05], [X1, -NAVE.hw + 0.05], [SX1, zc], [SX1, SZ], [SX0, SZ]], 0, SH)
    prismOutline(b, SOCLE, [[SX0 - 0.1, -NAVE.hw], [SX1 + 0.1, -NAVE.hw], [SX1 + 0.1, SZ - 0.1], [SX0 - 0.1, SZ - 0.1]], 0, 0.85)
    // trapezoidal east wall above the eaves
    const tri = new THREE.Shape([new THREE.Vector2(-SZ, SH - 0.01), new THREE.Vector2(-zc, SH - 0.01), new THREE.Vector2(-zc, SH + (zc - SZ) * k)])
    b.add(WALL, extrude(tri, 0.3), mat(SX1 - 0.3, 0, 0, Math.PI / 2))
    const ov = 0.35
    const yLow = SH - ov * k
    const zo = SZ - ov
    const run = -NAVE.hw - zo
    const A = V(SX0 - ov, yLow, zo)
    const G = V(SX0 - ov, yLow, -NAVE.hw)
    const E = V(SX0 - ov + run, YH, -NAVE.hw)
    const B0 = V(X1, yLow, zo)
    const Dp = V(X1, YH, -NAVE.hw)
    const zc2 = -NAVE.hw + (SX1 + ov - X1)
    const Bp = V(SX1 + ov, yLow, zo)
    const Cp = V(SX1 + ov, SH + (zc2 - SZ) * k, zc2)
    facet(b, TILE, [A, B0, Dp, E], { thickness: 0.14 })
    facet(b, TILE, [B0, Bp, Cp, Dp], { thickness: 0.14 })
    facet(b, TILE, [G, A, E], { thickness: 0.14 })
    b.beam(TILECAP, A.clone().add(V(0, 0.06, 0)), E.clone().add(V(0, 0.06, 0)), 0.22, 0.14)
    b.rod(GREY, V(SX0 - ov, yLow - 0.08, zo - 0.05), V(SX1 + ov, yLow - 0.08, zo - 0.05), 0.08, 6)
    // windows & door
    const wn = (m: THREE.Matrix4, w: number, h: number, y0: number) => {
      b.add('glassC', new THREE.PlaneGeometry(w, h), mul(m, mat(0, y0 + h / 2, 0.03)))
      b.add(TRIM, extrude(frameShape('rect', w, h, 0.12, 0, y0), 0.08), mul(m, mat(0, 0, 0.01)))
    }
    wn(mat(SX1, 0, -7.1, Math.PI / 2), 0.7, 0.9, 2.0)
    for (const x of [5.0, 8.0]) wn(mat(x, 0, SZ, Math.PI), 0.7, 0.9, 2.0)
    const dm = mat(SX0, 0, -7.4, -Math.PI / 2)
    b.add('wood', new THREE.PlaneGeometry(1.0, 2.2), mul(dm, mat(0, 1.1, 0.03)))
    b.add(TRIM, extrude(frameShape('rect', 1.0, 2.2, 0.14, 0, 0), 0.08), mul(dm, mat(0, 0, 0.01)))
  }

  /* ---------------- corner annexes flanking the tower ---------------- */
  for (const s of [-1, 1]) {
    const zi = s * TW.hw
    const zo = s * 5.1
    const xw = -12.1
    const xn = NAVE.x0
    const ch = 0.9
    const wh = 5.0
    const outline: [number, number][] = [[xn, zi], [xw, zi], [xw, zo - s * ch], [xw + ch, zo], [xn, zo]]
    prismOutline(b, WALL, outline, 0, wh)
    prismOutline(b, SOCLE, outline.map(([x, z]) => [x < xn - 0.01 ? x - 0.08 : x, Math.abs(z) > TW.hw + 0.01 ? z + s * 0.08 : z] as [number, number]), 0, 0.85)
    b.add(TRIM, loft([0, 1].map((i) => outline.map(([x, z]) => V(x < xn - 0.01 ? x - 0.15 : x, wh - 0.3 + i * 0.3, Math.abs(z) > TW.hw + 0.01 ? z + s * 0.15 : z))), { capTop: true, capBottom: true, flat: true }))
    const ov = 0.3
    const eY2 = wh - 0.12
    const ap = V(xn, 8.6, zi)
    const eave = [V(xw - ov, eY2, zi), V(xw - ov, eY2, zo - s * (ch - ov * 0.41)), V(xw + ch - ov * 0.41, eY2, zo + s * ov), V(xn, eY2, zo + s * ov)]
    const sp = seams(GREY, 0.5, 0.035, 0.035)
    for (let i = 0; i < 3; i++) facet(b, GREY, [eave[i], eave[i + 1], ap], { seams: sp, thickness: 0.08 })
    for (let i = 1; i < 3; i++) b.beam(GREY, eave[i].clone().add(V(0, 0.04, 0)), ap.clone().add(V(0, 0.04, 0)), 0.12, 0.08)
    // small window on the outer face
    const m = mat(-10.9, 0, zo, s > 0 ? 0 : Math.PI)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.6, 1.2, 0, 2.6, 10))), mul(m, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 0.6, 1.2, 0.12, 0, 2.6), 0.08), mul(m, mat(0, 0, 0.01)))
  }

  /* ---------------- west tower ---------------- */
  const tx = TW.x
  const faces = [
    { ry: -Math.PI / 2, d: (hw: number) => V(tx - hw, 0, 0), west: true, east: false },
    { ry: 0, d: (hw: number) => V(tx, 0, hw), west: false, east: false },
    { ry: Math.PI, d: (hw: number) => V(tx, 0, -hw), west: false, east: false },
    { ry: Math.PI / 2, d: (hw: number) => V(tx + hw, 0, 0), west: false, east: true },
  ]
  const fm = (f: (typeof faces)[number], hw: number) => {
    const p = f.d(hw)
    return mat(p.x, 0, p.z, f.ry)
  }
  const corniceBand = (y: number, hw: number) => {
    b.block(TRIM, 2 * hw + 0.28, 0.26, 2 * hw + 0.28, tx, y, 0)
    b.block(GREY, 2 * hw + 0.44, 0.14, 2 * hw + 0.44, tx, y + 0.26, 0)
  }
  b.block(SOCLE, 2 * TW.hw + 0.2, 0.85, 2 * TW.hw + 0.2, tx, 0, 0)
  b.block(WALL, 2 * TW.hw, 8.8, 2 * TW.hw, tx, 0, 0)
  corniceBand(8.8, TW.hw)
  b.block(WALL, 4.1, 2.8, 4.1, tx, 9.2, 0)
  corniceBand(12.0, 2.05)
  const HWB = 2.0
  const YT = 18.6
  b.block(WALL, 2 * HWB, YT - 12.4, 2 * HWB, tx, 12.4, 0)
  b.block(TRIM, 2 * HWB + 0.12, 0.3, 2 * HWB + 0.12, tx, 12.4, 0)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.block(WALL, 0.55, YT - 12.7, 0.1, tx + sx * (HWB - 0.275), 12.7, sz * (HWB + 0.05))
    b.block(WALL, 0.1, YT - 12.7, 0.55, tx + sx * (HWB + 0.05), 12.7, sz * (HWB - 0.275))
  }
  for (const f of faces) {
    // ground stage: west portal & oval window
    if (f.west) {
      const m = fm(f, TW.hw)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 2.9, 0, 0.3, 12))), mul(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 1.4, 2.9, 0.26, 0, 0.3), 0.14), mul(m, mat(0, 0, 0.01)))
      b.add(TRIM, metricBox(2.3, 0.22, 0.25), mul(m, mat(0, 3.75, 0.12)))
      oculus(b, m, 6.5, 0.42, 1.25, 0.8)
    }
    // middle stage oculus (east face is hidden in the roof)
    if (!f.east) oculus(b, fm(f, 2.05), 10.6, 0.4, 1.15, 0.85)
    // belfry: louvred arched opening and clock under the arched cornice
    const m3 = fm(f, HWB)
    archWindow(b, m3, 1.05, 2.2, 15.4, true)
    clock(b, m3, YT + 0.22, 0.4)
    // tympanum rising over the clock
    const pts: THREE.Vector2[] = [new THREE.Vector2(-HWB - 0.1, 0), new THREE.Vector2(HWB + 0.1, 0)]
    for (let i = 0; i <= 16; i++) {
      const u = HWB + 0.1 - (i / 16) * (2 * HWB + 0.2)
      pts.push(new THREE.Vector2(u, arch(u) + 0.001))
    }
    b.add(WALL, extrude(new THREE.Shape(pts), 0.4), mul(m3, mat(0, YT, -0.3)))
    // arched cornice (two-step moulding following the arch)
    const N = 18
    const L = HWB + 0.36
    for (let i = 0; i < N; i++) {
      const u0 = -L + (i / N) * 2 * L
      const u1 = -L + ((i + 1) / N) * 2 * L
      const P = (u: number, n: number, dy: number) => {
        const local = V(u, YT + arch(u) + dy, n)
        return local.applyMatrix4(m3)
      }
      b.beam(TRIM, P(u0, 0.1, 0.12), P(u1, 0.1, 0.12), 0.3, 0.24)
      b.beam(TRIM, P(u0, 0.2, 0.33), P(u1, 0.2, 0.33), 0.5, 0.2)
    }
  }

  /* ---------------- copper tower top (COLOR METAL) ---------------- */
  // square hood over the arched cornices → octagon
  {
    const T22 = Math.tan(22.5 * D2R)
    const ts = [-1, -0.75, -T22, -0.2, 0, 0.2, T22, 0.75]
    const apo = (r: number) => r * Math.cos(22.5 * D2R)
    const RB = 1.62 // circumradius of the bulb base
    const y0 = YT + 0.43
    const hw0 = HWB + 0.4
    const ring = (blend: number, hwSq: number, rOct: number, yBase: number, archK: number) => {
      const pts: THREE.Vector3[] = []
      for (let f = 0; f < 4; f++) {
        const phi = (f * Math.PI) / 2
        for (const t of ts) {
          const th = Math.atan(t)
          const near = Math.abs(th) <= 22.5 * D2R + 1e-6 ? 0 : Math.sign(th) * 45 * D2R
          const ro = apo(rOct) / Math.cos(th - near)
          const sqx = hwSq * (Math.cos(phi) - t * Math.sin(phi))
          const sqz = hwSq * (Math.sin(phi) + t * Math.cos(phi))
          const ox = ro * Math.cos(phi + th)
          const oz = ro * Math.sin(phi + th)
          const x = sqx + (ox - sqx) * blend
          const z = sqz + (oz - sqz) * blend
          pts.push(V(tx + x, yBase + arch(t * hw0) * archK, z))
        }
      }
      return pts
    }
    const rings = [
      ring(0, hw0, RB, y0, 1),
      ring(0.15, hw0 - 0.32, RB, y0 + 0.32, 0.9),
      ring(0.55, hw0 - 0.6, RB, y0 + 0.78, 0.5),
      ring(1, hw0, RB, y0 + 1.25, 0),
    ]
    b.add(CU, loft(rings, { capBottom: true }))
    // ribs on the hood corners (standing seams)
    for (const idx of [0, 8, 16, 24]) {
      for (let i = 0; i < rings.length - 1; i++) b.beam(CU, rings[i][idx].clone().add(V(0, 0.03, 0)), rings[i + 1][idx].clone().add(V(0, 0.03, 0)), 0.07, 0.06)
    }
    const yb = y0 + 1.25
    const bulb: [number, number][] = [
      [RB, yb],
      [1.8, yb + 0.25],
      [1.87, yb + 0.55],
      [1.83, yb + 0.85],
      [1.64, yb + 1.18],
      [1.28, yb + 1.48],
      [0.86, yb + 1.71],
      [0.6, yb + 1.85],
    ]
    const drum: [number, number][] = [
      [0.6, yb + 1.85],
      [0.6, yb + 2.0],
      [0.94, yb + 2.0],
      [0.94, yb + 2.1],
      [0.86, yb + 2.1],
      [0.85, yb + 2.85],
    ]
    const skirt: [number, number][] = [
      [1.24, yb + 2.72],
      [1.22, yb + 2.8],
      [1.02, yb + 3.02],
      [0.8, yb + 3.28],
      [0.7, yb + 3.4],
    ]
    const top: [number, number][] = [
      [0.64, yb + 3.4],
      [0.64, yb + 3.85],
      [0.8, yb + 3.87],
      [0.82, yb + 3.98],
      [0.7, yb + 4.22],
      [0.45, yb + 4.45],
      [0.26, yb + 4.6],
    ]
    const spire: [number, number][] = [
      [0.25, yb + 4.6],
      [0.2, yb + 5.4],
      [0.14, yb + 6.4],
      [0.08, yb + 7.3],
      [0.035, yb + 7.85],
    ]
    for (const st of [bulb, drum, skirt, top, spire]) helm(b, CU, { x: tx, n: 8, phase: Math.PI / 8, stations: st })
    // arris ribs (standing seams) on the bulb, skirt, cap and spire
    for (const st of [bulb, skirt, top, spire]) {
      for (let k = 0; k < 8; k++) {
        const a = Math.PI / 8 + (k * Math.PI) / 4
        for (let i = 0; i < st.length - 1; i++) {
          const [r0, ya] = st[i]
          const [r1, yc] = st[i + 1]
          const off = 0.02
          b.beam(CU, V(tx + Math.cos(a) * (r0 + off), ya, Math.sin(a) * (r0 + off)), V(tx + Math.cos(a) * (r1 + off), yc, Math.sin(a) * (r1 + off)), 0.05, 0.05, V(Math.cos(a), 0, Math.sin(a)))
        }
      }
    }
    // horizontal bands
    for (const [r, y] of [[0.66, yb + 1.88], [0.9, yb + 2.78], [0.68, yb + 3.44]] as [number, number][]) {
      helm(b, CU, { x: tx, n: 8, phase: Math.PI / 8, stations: [[r, y - 0.04], [r, y + 0.04]], flat: true })
    }
    const yTop = yb + 7.85
    b.add(CU, new THREE.SphereGeometry(0.19, 16, 12), mat(tx, yTop + 0.12, 0))
    b.rod('iron', V(tx, yTop, 0), V(tx, yTop + 0.4, 0), 0.04, 6)
    doubleCross(b, 'iron', tx, yTop + 0.3, 0, 1.5)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [TW.x, 21.5, 0],
  materials: () => {
    const map = linesTexture('#c9572a', '#9f441f', 3)
    map.repeat.set(1, 1 / 1.05)
    return {
      tamTile: new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.8 }),
      tamTileCap: new THREE.MeshStandardMaterial({ color: '#b9512a', roughness: 0.8 }),
    }
  },
  notes: 'Tămașu RC church: single hall with 3/8 apse, north lean-to sacristy, west tower with the new Cu-DHP copper helm (bulb, lantern skirt, spire). Heights estimated from photographs.',
}

export default model
