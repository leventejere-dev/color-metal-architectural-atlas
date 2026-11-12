/**
 * Biserica Reformată din Feliceni / Felsőboldogfalvi református templom
 * (OSM way 495044763; medieval Gothic church, tower raised in 1869, restored
 * 2018–20 with a new copper-clad helm).
 *
 * Modelling specification (real metres, origin = OSM footprint centre at ground,
 * +X = main axis towards the apse (ESE, OSM long axis 99.4°), tower at −X,
 * +Z = SSW / south side; the nave axis lies at z = −1.1 because the south
 * porch widens the footprint):
 *  - Single nave 19 × 8.4 m (OSM), eaves ≈ 6.9 m, closed by a 3/8 polygonal apse
 *    of the same width; white lime plaster walls, no socle.
 *  - Steep (~48°) red plain-tile roof: west gable against the tower, three hip
 *    facets over the apse (photos 02, 07, 08).
 *  - Two-step Gothic buttresses with small red-tiled gabled caps along the
 *    south wall and at the apse angles; narrow pointed windows on the nave,
 *    round-arched windows on the diagonal apse faces (photos 02, 07, 08).
 *  - South porch (OSM) with a red-tiled gable roof and a round-arched opening.
 *  - West tower 5.5 m square: medieval lower body with diagonal buttresses and
 *    slit windows; string course (≈ 12.8 m) where the 1869 upper storey begins:
 *    corner pilasters, one round-arched louvred opening per face, clock above,
 *    top cornice lifted in small arches over the clocks (photos 06, 08, 12).
 *  - COLOR METAL scope: KME copper on the tower helm — "broken-line" spire:
 *    bell-cast skirt over the cornice, chamfered square drum, concave bell,
 *    octagonal cushion, tall octagonal spire, rod and copper sphere. Shown in
 *    its 2024 appearance: dark brown oxidised copper (photos 01, 03, 04, 06);
 *    the 2021 photos (09–11) show it bright and new under scaffolding.
 * Approximations: heights from photo proportions (no survey); north side not
 * photographed (buttresses mirrored, porch omitted, windows assumed);
 * helm stations simplified; the churchyard wall is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, seams } from '../kit'
import type { ModelModule } from '../registry'
import { linesTexture } from '../../lib/textures'

const D2R = Math.PI / 180
const ZC = -1.1 // nave / tower axis
const NAVE = { x0: -7.9, hw: 4.2, h: 6.9 }
const XC = 9.3 // apse octagon centre
const RC = NAVE.hw / Math.sin(67.5 * D2R)
const PITCH = 48.5
const T = Math.tan(PITCH * D2R)
const OV = 0.4
const RIDGE = NAVE.h + NAVE.hw * T
const TW = { x: -10.55, hw: 2.75, band: 12.8, hwU: 2.6, top: 20.2 }
const CU = 'copperBrown'
const WALL = 'plasterWhite'
const TRIM = 'white'
const TILE = 'felTile'
const TILECAP = 'felTileCap'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(aDeg * D2R), y, ZC + r * Math.sin(aDeg * D2R))

function hallRing(y: number, grow = 0) {
  const hw = NAVE.hw + grow
  const rc = RC + grow / Math.cos(22.5 * D2R)
  return [V(NAVE.x0 - grow, y, ZC - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(NAVE.x0 - grow, y, ZC + hw)]
}

/** Window (pointed / round) on a wall frame m (local x along the wall, z outward). */
function win(b: Builder, m: THREE.Matrix4, type: 'pointed' | 'round' | 'rect', w: number, h: number, y0: number, glass = 'glassC', frame = 0.14) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.02)))
  // deep reveal (dark) suggested by a recessed frame ring
  b.add(TRIM, extrude(frameShape(type, w, h, frame, 0, y0), 0.08), mul(m, mat(0, 0, 0.0)))
}

/** Two-step Gothic buttress on a wall frame m at u, with small tiled gabled caps. */
function buttress(b: Builder, m: THREE.Matrix4, u: number, w: number, d0: number, y1: number, d1: number, y2: number) {
  const cap = (d: number, y: number) => {
    // small gabled tile cap sloping outwards
    const run = d + 0.12
    const rise = 0.55
    const L = Math.hypot(run, rise)
    b.add(TILE, metricBox(w + 0.16, 0.1, L), mul(m, mat(u, y + rise / 2, run / 2 - 0.06, 0, Math.atan2(rise, run))))
    // triangular side faces in plaster under the cap
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(d, 0), new THREE.Vector2(0, rise)])
    b.add(WALL, extrude(tri, w), mul(m, mat(u + w / 2, y, 0, -Math.PI / 2)))
  }
  b.add(WALL, metricBox(w, y1, d0), mul(m, mat(u, y1 / 2, d0 / 2)))
  cap(d0, y1)
  b.add(WALL, metricBox(w, y2 - y1, d1), mul(m, mat(u, (y1 + y2) / 2, d1 / 2)))
  cap(d1, y2)
}

/** Chamfered-square ring (8 points, long faces on the axes). a = half width, c = chamfer. */
function chamferRing(a: number, c: number, y: number, cx: number, cz: number) {
  const e = a - c
  const pts: [number, number][] = [[a, -e], [a, e], [e, a], [-e, a], [-a, e], [-a, -e], [-e, -a], [e, -a]]
  return pts.map(([x, z]) => V(cx + x, y, cz + z))
}

/** Square-perimeter ring sampled per face (t ∈ [-1, 1)), mapped onto a chamfered square; bump lifts the face centres. */
const TS = [-1, -0.86, -0.72, -0.5, -0.32, -0.16, 0, 0.16, 0.32, 0.5, 0.72, 0.86]
function skirtRing(a: number, c: number, y: number, bump: (u: number) => number, k: number, cx: number, cz: number) {
  const pts: THREE.Vector3[] = []
  for (let f = 0; f < 4; f++) {
    const phi = (f * Math.PI) / 2
    for (const t of TS) {
      const u = t * a
      let lx: number
      let lz: number
      if (Math.abs(u) <= a - c) {
        lx = a
        lz = u
      } else {
        const s = (Math.abs(u) - (a - c)) / c
        lx = a - (s * c) / 2
        lz = Math.sign(u) * (a - c + (s * c) / 2)
      }
      const x = lx * Math.cos(phi) - lz * Math.sin(phi)
      const z = lx * Math.sin(phi) + lz * Math.cos(phi)
      pts.push(V(cx + x, y + bump(u) * k, cz + z))
    }
  }
  return pts
}

function build(): Builder {
  const b = new Builder()
  const { x0, hw, h } = NAVE

  /* ---------------- hall (nave + 3/8 apse) ---------------- */
  b.add(WALL, loft([hallRing(0), hallRing(h)], { capTop: true, flat: true }))
  b.add(TRIM, loft([hallRing(h - 0.3, 0.12), hallRing(h, 0.12)], { capTop: true, capBottom: true, flat: true }))
  b.add('stoneGrey', loft([hallRing(0, 0.06), hallRing(0.35, 0.06)], { capTop: true, flat: true }))

  /* ---------------- roof ---------------- */
  const eY = h - OV * T
  const nhw = hw + OV
  const rcO = RC * (nhw / hw)
  const xa = x0 - 0.3
  const apex = V(XC, RIDGE, ZC)
  facet(b, TILE, [V(xa, eY, ZC + nhw), apsePt(67.5, rcO, eY), apex, V(xa, RIDGE, ZC)], { thickness: 0.16 })
  facet(b, TILE, [apsePt(-67.5, rcO, eY), V(xa, eY, ZC - nhw), V(xa, RIDGE, ZC), apex], { thickness: 0.16 })
  const aa = [67.5, 22.5, -22.5, -67.5]
  for (let i = 0; i < 3; i++) facet(b, TILE, [apsePt(aa[i], rcO, eY), apsePt(aa[i + 1], rcO, eY), apex], { thickness: 0.16 })
  b.beam(TILECAP, V(xa, RIDGE + 0.07, ZC), apex.clone().add(V(0, 0.07, 0)), 0.3, 0.2)
  for (const a of aa) b.beam(TILECAP, apsePt(a, rcO, eY + 0.07), apex.clone().add(V(0, 0.07, 0)), 0.26, 0.16)
  for (const s of [-1, 1]) b.beam(TILECAP, V(xa + 0.05, eY + 0.05, ZC + s * nhw), V(xa + 0.05, RIDGE + 0.05, ZC), 0.2, 0.24, V(1, 0, 0))
  b.rod('helm', V(xa, eY - 0.08, ZC + nhw + 0.05), apsePt(67.5, rcO + 0.05, eY - 0.08), 0.07, 6)
  b.rod('helm', V(xa, eY - 0.08, ZC - nhw - 0.05), apsePt(-67.5, rcO + 0.05, eY - 0.08), 0.07, 6)
  for (let i = 0; i < 3; i++) b.rod('helm', apsePt(aa[i], rcO + 0.05, eY - 0.08), apsePt(aa[i + 1], rcO + 0.05, eY - 0.08), 0.07, 6)
  // west gable wall (visible beside the tower)
  const gable = new THREE.Shape([new THREE.Vector2(-hw, h - 0.01), new THREE.Vector2(hw, h - 0.01), new THREE.Vector2(0, RIDGE - 0.05)])
  b.add(WALL, extrude(gable, 0.6), mat(x0 + 0.6, 0, ZC, -Math.PI / 2))

  /* ---------------- buttresses ---------------- */
  for (const s of [-1, 1]) {
    const m = s > 0 ? mat(0, 0, ZC + hw, 0) : mat(0, 0, ZC - hw, Math.PI)
    for (const x of [-7.3, -2.0, 3.6, 7.6]) buttress(b, m, s * x, 0.95, 1.3, 2.7, 0.8, 5.2)
  }
  for (const a of [67.5, 22.5, -22.5, -67.5]) {
    const p = apsePt(a, RC, 0)
    buttress(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 0, 0.9, 1.2, 2.5, 0.75, 5.1)
  }

  /* ---------------- windows ---------------- */
  for (const x of [-4.6, 5.6]) win(b, mat(x, 0, ZC + hw, 0), 'pointed', 0.85, 2.6, 3.0)
  win(b, mat(1.0, 0, ZC + hw, 0), 'pointed', 0.6, 1.5, 4.3)
  for (const x of [-4.6, 5.6]) win(b, mat(x, 0, ZC - hw, Math.PI), 'pointed', 0.7, 2.2, 3.3)
  for (const a of [45, -45]) {
    const p = V(XC + hw * Math.cos(a * D2R), 0, ZC + hw * Math.sin(a * D2R))
    win(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 'round', 0.85, 2.3, 3.0, 'glassG')
  }

  /* ---------------- south porch ---------------- */
  {
    const px0 = -0.75
    const px1 = 2.8
    const pz0 = ZC + hw
    const pz1 = 5.45
    const ph = 3.1
    const pc = (px0 + px1) / 2
    const pw = px1 - px0
    b.block(WALL, pw, ph, pz1 - pz0, pc, 0, (pz0 + pz1) / 2)
    const pt = Math.tan(50 * D2R)
    const pr = ph + (pw / 2) * pt
    const g = new THREE.Shape([new THREE.Vector2(-pw / 2, ph - 0.01), new THREE.Vector2(pw / 2, ph - 0.01), new THREE.Vector2(0, pr - 0.05)])
    b.add(WALL, extrude(g, 0.3), mat(pc, 0, pz1 - 0.3))
    const o = 0.25
    const ey = ph - o * pt
    for (const s of [-1, 1]) {
      facet(b, TILE, [V(pc + s * (pw / 2 + o), ey, pz0), V(pc + s * (pw / 2 + o), ey, pz1 + 0.15), V(pc, pr, pz1 + 0.15), V(pc, pr, pz0)], { hint: V(s, 1, 0), thickness: 0.12 })
      b.beam(TILECAP, V(pc + s * (pw / 2 + o), ey + 0.04, pz1 + 0.17), V(pc, pr + 0.04, pz1 + 0.17), 0.18, 0.2, V(0, 0, 1))
    }
    b.beam(TILECAP, V(pc, pr + 0.06, pz0), V(pc, pr + 0.06, pz1 + 0.15), 0.26, 0.16)
    const fm = mat(pc, 0, pz1, 0)
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 2.5, 0, 0, 12))), mul(fm, mat(0, 0, 0.02)))
    b.add(TRIM, extrude(frameShape('round', 1.6, 2.5, 0.16, 0, 0), 0.06), mul(fm, mat(0, 0, 0.01)))
  }

  /* ---------------- west tower ---------------- */
  const tx = TW.x
  const tz = ZC
  // medieval lower body (slight batter suggested by a plinth)
  b.block(WALL, 2 * TW.hw, TW.band, 2 * TW.hw, tx, 0, tz)
  b.block(WALL, 2 * TW.hw + 0.3, 0.9, 2 * TW.hw + 0.3, tx, 0, tz)
  b.block(TRIM, 2 * TW.hw + 0.35, 0.25, 2 * TW.hw + 0.35, tx, TW.band, tz)
  b.block('helm', 2 * TW.hw + 0.5, 0.12, 2 * TW.hw + 0.5, tx, TW.band + 0.25, tz)
  // diagonal buttresses at the west corners
  for (const s of [-1, 1]) {
    const p = V(tx - TW.hw, 0, tz + s * TW.hw)
    const dir = V(-1, 0, s).normalize()
    const ry = Math.atan2(dir.x, dir.z)
    buttress(b, mat(p.x, 0, p.z, ry), 0, 1.0, 1.6, 4.2, 1.0, 8.2)
  }
  // slit windows and west door
  const faceM = (f: 'nx' | 'pz' | 'nz' | 'px', hwT: number) =>
    f === 'nx' ? mat(tx - hwT, 0, tz, -Math.PI / 2) : f === 'px' ? mat(tx + hwT, 0, tz, Math.PI / 2) : f === 'pz' ? mat(tx, 0, tz + hwT, 0) : mat(tx, 0, tz - hwT, Math.PI)
  const wm = faceM('nx', TW.hw)
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.3, 2.7, 0, 0, 10))), mul(wm, mat(0, 0, 0.03)))
  b.add('stoneLight', extrude(frameShape('pointed', 1.3, 2.7, 0.2, 0, 0), 0.1), mul(wm, mat(0, 0, 0.01)))
  for (const f of ['nx', 'pz', 'nz'] as const) {
    for (const y of [5.2, 9.4]) win(b, faceM(f, TW.hw), 'rect', 0.16, 0.9, y, 'black', 0.06)
  }
  // 1869 upper storey
  const hu = TW.hwU
  const yU = TW.band + 0.37
  b.block(WALL, 2 * hu, TW.top - yU, 2 * hu, tx, yU, tz)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.block(WALL, 0.6, TW.top - yU - 0.4, 0.12, tx + sx * (hu - 0.3), yU + 0.4, tz + sz * (hu + 0.06))
    b.block(WALL, 0.12, TW.top - yU - 0.4, 0.6, tx + sx * (hu + 0.06), yU + 0.4, tz + sz * (hu - 0.3))
  }
  b.block(TRIM, 2 * hu + 0.15, 0.4, 2 * hu + 0.15, tx, yU, tz)
  const yT = TW.top
  // top cornice lifted in a small arch over each clock
  const AR = { rise: 0.5, ua: 1.0 }
  const ARR = (AR.ua ** 2 + AR.rise ** 2) / (2 * AR.rise)
  const arch = (u: number) => (Math.abs(u) < AR.ua ? Math.sqrt(ARR * ARR - u * u) - (ARR - AR.rise) : 0)
  for (const f of ['nx', 'pz', 'nz', 'px'] as const) {
    const m = faceM(f, hu)
    // louvred round-arched opening
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.05, 2.3, 0, 15.7, 12))), mul(m, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.05, 2.3, 0.16, 0, 15.7), 0.08), mul(m, mat(0, 0, 0.01)))
    for (let i = 0; i < 6; i++) b.add('wood', metricBox(1.0, 0.05, 0.08), mul(m, mat(0, 15.95 + i * 0.3, 0.06, 0, -0.5)))
    b.add(TRIM, metricBox(1.6, 0.12, 0.22), mul(m, mat(0, 15.5, 0.1)))
    // clock
    const cy = yT - 0.15
    b.add(TRIM, new THREE.CylinderGeometry(0.45, 0.45, 0.08, 24), mul(m, mat(0, cy, 0.05, 0, Math.PI / 2)))
    b.add('clock', new THREE.TorusGeometry(0.45, 0.035, 5, 24), mul(m, mat(0, cy, 0.1)))
    b.add('clock', metricBox(0.05, 0.32, 0.03), mul(m, mat(0, cy + 0.14, 0.11)))
    b.add('clock', metricBox(0.25, 0.05, 0.03), mul(m, mat(0.1, cy, 0.11)))
    // tympanum under the lifted cornice
    const pts: THREE.Vector2[] = [new THREE.Vector2(-hu, 0), new THREE.Vector2(hu, 0)]
    for (let i = 0; i <= 14; i++) {
      const u = hu - (i / 14) * 2 * hu
      pts.push(new THREE.Vector2(u, arch(u) + 0.001))
    }
    b.add(WALL, extrude(new THREE.Shape(pts), 0.3), mul(m, mat(0, yT, -0.3)))
    const L = hu + 0.3
    const N = 14
    for (let i = 0; i < N; i++) {
      const u0 = -L + (i / N) * 2 * L
      const u1 = -L + ((i + 1) / N) * 2 * L
      const P = (u: number, n: number, dy: number) => V(u, yT + arch(u) + dy, n).applyMatrix4(m)
      b.beam(TRIM, P(u0, 0.1, 0.1), P(u1, 0.1, 0.1), 0.3, 0.2)
      b.beam(TRIM, P(u0, 0.2, 0.28), P(u1, 0.2, 0.28), 0.48, 0.16)
    }
  }

  /* ---------------- copper helm (COLOR METAL) ---------------- */
  {
    const y0 = yT + 0.36
    const aEave = hu + 0.42
    const aDrum = 2.38
    const cDrum = 0.36
    // bell-cast skirt over the cornice (rises over the clock arches)
    const skirt = [
      skirtRing(aEave, 0.12, y0, arch, 1, tx, tz),
      skirtRing(aEave - 0.2, 0.15, y0 + 0.2, arch, 0.9, tx, tz),
      skirtRing(aDrum + 0.12, 0.28, y0 + 0.6, arch, 0.35, tx, tz),
      skirtRing(aDrum, cDrum, y0 + 1.0, arch, 0, tx, tz),
    ]
    b.add(CU, loft(skirt, { capBottom: true }))
    const yd = y0 + 1.0
    const st = (a: number, c: number, y: number) => chamferRing(a, c, y, tx, tz)
    // drum (vertical, panelled) with a lip at the top
    b.add(CU, loft([st(aDrum, cDrum, yd), st(aDrum, cDrum, yd + 1.0)], { flat: true }))
    b.add(CU, loft([st(aDrum + 0.12, cDrum + 0.05, yd + 0.98), st(aDrum + 0.12, cDrum + 0.05, yd + 1.1)], { capBottom: true, capTop: true, flat: true }))
    for (const k of [0.33, 0.66]) b.add(CU, loft([st(aDrum + 0.02, cDrum, yd + k), st(aDrum + 0.02, cDrum, yd + k + 0.04)], { flat: true }))
    // concave bell
    const yb = yd + 1.1
    const R8 = 0.586
    const bell: [number, number, number][] = [
      [2.36, 0.4, 0],
      [2.12, 0.48, 0.12],
      [1.9, 0.6, 0.32],
      [1.74, 0.74, 0.6],
      [1.63, 0.84, 0.95],
      [1.58, 0.9, 1.35],
      [1.56, 1.56 * R8, 1.9],
    ]
    b.add(CU, loft(bell.map(([a, c, y]) => st(a, c, yb + y)), { capBottom: true }))
    // octagonal cushion
    const yc = yb + 1.9
    const cushion: [number, number][] = [
      [1.56, 0],
      [1.8, 0.12],
      [1.9, 0.38],
      [1.86, 0.68],
      [1.66, 0.95],
      [1.36, 1.12],
      [1.18, 1.2],
    ]
    b.add(CU, loft(cushion.map(([a, y]) => st(a, a * R8, yc + y)), { capBottom: true }))
    // tall octagonal spire with standing seams on each face
    const ys = yc + 1.2
    const aS = 1.16
    const yTip = ys + 5.7
    const ringS = st(aS, aS * R8, ys)
    const tip = V(tx, yTip, tz)
    const sp = seams(CU, 0.42, 0.03, 0.035)
    for (let i = 0; i < 8; i++) {
      facet(b, CU, [ringS[i], ringS[(i + 1) % 8], tip], { seams: sp })
      b.beam(CU, ringS[i], tip, 0.07, 0.05)
    }
    // arris ribs on the bell and cushion
    const ribs = (rings: THREE.Vector3[][]) => {
      for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 1; i++) b.beam(CU, rings[i][k], rings[i + 1][k], 0.05, 0.05)
    }
    ribs(bell.map(([a, c, y]) => st(a + 0.02, c, yb + y)))
    ribs(cushion.map(([a, y]) => st(a + 0.02, a * R8, yc + y)))
    // finial: collar, rod, copper sphere, lightning rod
    b.add(CU, new THREE.SphereGeometry(0.16, 12, 8), mat(tx, yTip + 0.05, tz))
    b.rod('copper', V(tx, yTip, tz), V(tx, yTip + 2.9, tz), 0.07, 8)
    b.add('copper', new THREE.SphereGeometry(0.34, 20, 14), mat(tx, yTip + 3.15, tz))
    b.rod('iron', V(tx, yTip + 3.45, tz), V(tx, yTip + 4.6, tz), 0.025, 5)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [TW.x, 26, ZC],
  materials: () => {
    const map = linesTexture('#c4562e', '#99401f', 5)
    map.repeat.set(1, 1 / 1.0)
    return {
      felTile: new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.82 }),
      felTileCap: new THREE.MeshStandardMaterial({ color: '#b04b27', roughness: 0.82 }),
    }
  },
  notes: 'Feliceni Reformed church: Gothic nave with 3/8 apse, buttresses and south porch; west tower raised in 1869 with the KME copper broken-line helm and copper sphere (dark 2024 patina). Heights estimated from photographs.',
}

export default model
