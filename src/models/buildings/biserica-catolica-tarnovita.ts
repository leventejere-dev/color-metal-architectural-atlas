/**
 * Biserica romano-catolică „Sfântul Ladislau” din Târnovița /
 * Küküllőkeményfalvi Szent László-templom (OSM way 606021762).
 *
 * Modelling specification (real metres, origin = OSM footprint centre at
 * ground, +X = OSM long axis 32° = NNE, towards the apse; tower at −X;
 * +Z = 122° (ESE side); the nave axis lies at z ≈ +0.75 in the outline):
 *  - Single nave 16.5 × 9.6 m (OSM), eaves ≈ 5.6 m, closed at the east by a
 *    three-sided apse of the same width (east face ≈ 4.3 m, 45° diagonal faces,
 *    OSM). Pale-yellow render, ochre pilaster strips dividing the side walls
 *    into three bays, ochre eaves frieze and façade cornice, round-arched
 *    windows (photos 02, 04).
 *  - Red plain-tile roof ≈ 47°: west gable behind the tower, hipped over the
 *    apse with all facets meeting in one apex (photo 02).
 *  - Sacristy on the WNW (−Z) side near the east end with a hipped lean-to
 *    tile roof (photo 02; OSM shows only a 1.3 m step, the photo a deeper
 *    annex — modelled 2.4 m deep).
 *  - West tower 5.1 m square projecting 2.45 m (OSM), plain rendered shaft:
 *    round-arched portal, statue niche, oculus (≈ 7.9 m), one round-arched
 *    belfry opening per face (≈ 10.3–12 m), ochre top cornice at ≈ 12.6 m
 *    lifted in a segmental arch over every face (photos 01, 03, 04).
 *  - COLOR METAL scope (KME copper sheet + Wieland brass bars, 2017): the
 *    octagonal copper helm, as photographed in 2021 (weathered brown copper, palette 'copperBrown'):
 *    bell-cast skirt over the arched cornice, large onion, lantern with small
 *    openings and cornices, small upper onion, spire, brass ball and
 *    patriarchal cross (brass assumed for the bars / cross).
 * Approximations: wall and tower heights from photo proportions (tower width
 * as scale, ≈ 65 px/m in photo 04), helm stations stretched ≈ 8 % for the
 * upward camera angle, ESE side not photographed (mirrored), the gallery stair
 * canopy, the wooden gate and the façade lettering are not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, helm } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZC = 0.75 // nave / tower axis
const NAVE = { x0: -8.4, x1: 8.1, hw: 4.8, h: 5.6 }
const XE = 10.95 // east face of the apse
const HE = 2.15 // half width of the east face
const PITCH = 47
const TP = Math.tan(PITCH * D2R)
const OV = 0.4
const RIDGE = NAVE.h + NAVE.hw * TP
const XA = 6.15 // roof apex over the apse (equidistant from the side, diagonal and east wall lines)
const TW = { x: -8.3, hw: 2.55, top: 12.6 }
const WALL = 'tarWall'
const TRIM = 'tarTrim'
const CU = 'copperBrown'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/** Beam between two points with a right-handed basis (w across, h along `up`). */
function beam(b: Builder, key: string, p: THREE.Vector3, q: THREE.Vector3, w: number, h: number, up = V(0, 1, 0)) {
  const d = V().subVectors(q, p)
  const L = d.length()
  if (L < 1e-5) return
  d.normalize()
  let side = V().crossVectors(up, d)
  if (side.lengthSq() < 1e-6) side = V().crossVectors(V(1, 0, 0), d)
  side.normalize()
  const up2 = V().crossVectors(d, side).normalize()
  b.add(key, metricBox(w, h, L), new THREE.Matrix4().makeBasis(side, up2, d).setPosition(V().addVectors(p, q).multiplyScalar(0.5)))
}

/** Outline of the hall (nave + three-sided apse), CCW seen from above, grown by g. */
function hallOutline(g = 0): [number, number][] {
  const hw = NAVE.hw + g
  const k = Math.tan(22.5 * D2R) * g // corner shift for 45° corners
  return [
    [NAVE.x0 - g, -hw],
    [NAVE.x1 + k, -hw],
    [XE + g, -(HE + k)],
    [XE + g, HE + k],
    [NAVE.x1 + k, hw],
    [NAVE.x0 - g, hw],
  ].map(([x, z]) => [x, z + ZC] as [number, number])
}
const ring = (pts: [number, number][], y: number) => pts.map(([x, z]) => V(x, y, z))

function roundWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), mul(m, mat(0, 0, 0.03)))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.18, 0, y0), 0.07), mul(m, mat(0, 0, 0.01)))
  b.add('tarFrame', metricBox(0.06, h - 0.1, 0.04), mul(m, mat(0, y0 + (h - 0.1) / 2, 0.05)))
  b.add('tarFrame', metricBox(w, 0.06, 0.04), mul(m, mat(0, y0 + h - w / 2, 0.05)))
  b.add(TRIM, metricBox(w + 0.4, 0.1, 0.2), mul(m, mat(0, y0 - 0.22, 0.08)))
}

/** Square-perimeter ring mapped onto a chamfered square (long faces on the axes), face centres lifted by bump(u)·k. */
const TS = [-1, -0.86, -0.72, -0.56, -0.4, -0.24, -0.08, 0.08, 0.24, 0.4, 0.56, 0.72, 0.86]
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
      pts.push(V(cx + lx * Math.cos(phi) - lz * Math.sin(phi), y + bump(u) * k, cz + lx * Math.sin(phi) + lz * Math.cos(phi)))
    }
  }
  return pts
}

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw, h } = NAVE

  /* ---------------- hall walls ---------------- */
  const outl = hallOutline(0)
  b.add(WALL, loft([ring(outl, 0), ring(outl, h)], { capTop: true, flat: true }))
  b.add('tarSocle', loft([ring(hallOutline(0.06), 0), ring(hallOutline(0.06), 0.5)], { capTop: true, flat: true }))
  // ochre eaves frieze + cornice
  b.add(TRIM, loft([ring(hallOutline(0.03), h - 0.75), ring(hallOutline(0.03), h - 0.2)], { flat: true }))
  b.add(TRIM, loft([ring(hallOutline(0.18), h - 0.2), ring(hallOutline(0.18), h)], { capTop: true, capBottom: true, flat: true }))
  // pilaster strips: side walls (3 bays) and the apse corners
  for (const s of [-1, 1]) {
    for (const x of [x0 + 0.3, -3.0, 2.4, x1 - 0.1]) b.block(TRIM, 0.62, h - 0.75, 0.06, x, 0.5, ZC + s * (hw + 0.03))
    b.block(TRIM, 0.55, h - 0.75, 0.55, XE - 0.2, 0.5, ZC + s * (HE - 0.15))
  }
  // west gable wall (beside and behind the tower) with the façade cornice at eaves level
  const gable = new THREE.Shape([new THREE.Vector2(-hw, h - 0.01), new THREE.Vector2(hw, h - 0.01), new THREE.Vector2(0, RIDGE - 0.08)])
  b.add(WALL, extrude(gable, 0.5), mat(x0 + 0.5, 0, ZC, -Math.PI / 2))
  b.block(TRIM, 0.35, 0.3, 2 * hw + 0.36, x0 - 0.12, h - 0.3, ZC)
  for (const s of [-1, 1]) b.block(TRIM, 0.08, h - 0.75, 0.62, x0 - 0.03, 0.5, ZC + s * (hw - 0.3))

  /* ---------------- windows ---------------- */
  for (const s of [-1, 1]) {
    const ry = s > 0 ? 0 : Math.PI
    for (const x of [-5.7, -0.3, 5.25]) {
      if (s < 0 && x > 2) continue // behind the sacristy
      roundWin(b, mat(x, 0, ZC + s * hw, ry), 1.05, 2.1, 2.7)
    }
  }
  // diagonal apse faces
  for (const s of [-1, 1]) {
    const a: [number, number] = [x1, ZC + s * hw]
    const c: [number, number] = [XE, ZC + s * HE]
    const mx = (a[0] + c[0]) / 2
    const mz = (a[1] + c[1]) / 2
    roundWin(b, mat(mx, 0, mz, s > 0 ? Math.PI / 4 : (3 * Math.PI) / 4), 0.95, 2.0, 2.8)
  }

  /* ---------------- tile roof (gable at the west, hipped apse) ---------------- */
  {
    const eY = h - OV * TP
    const o = hallOutline(OV) // eaves line
    const apex = V(XA, RIDGE, ZC)
    const xw = x0 - 0.35
    const wS = V(xw, eY, ZC + hw + OV)
    const wN = V(xw, eY, ZC - hw - OV)
    const top = V(xw, RIDGE, ZC)
    const e = ring(o, eY) // [0] W-N … [5] W-S (west points replaced by the gable overhang)
    facet(b, 'tileRed', [wS, top, apex, e[4]], { thickness: 0.14 })
    facet(b, 'tileRed', [wN, e[1], apex, top], { thickness: 0.14 })
    facet(b, 'tileRed', [e[1], e[2], apex], { thickness: 0.14 })
    facet(b, 'tileRed', [e[2], e[3], apex], { thickness: 0.14 })
    facet(b, 'tileRed', [e[3], e[4], apex], { thickness: 0.14 })
    beam(b, 'tarTileCap', top.clone().add(V(0, 0.07, 0)), apex.clone().add(V(0, 0.07, 0)), 0.26, 0.16)
    for (const p of [e[1], e[2], e[3], e[4]]) beam(b, 'tarTileCap', p.clone().add(V(0, 0.07, 0)), apex.clone().add(V(0, 0.07, 0)), 0.24, 0.14)
    for (const p of [wS, wN]) beam(b, 'tarTileCap', p.clone().add(V(0.05, 0.05, 0)), top.clone().add(V(0.05, 0.05, 0)), 0.18, 0.2, V(1, 0, 0))
    // gutters
    const g = (p: THREE.Vector3, q: THREE.Vector3) => b.rod('helm', p.clone().add(V(0, -0.1, 0)), q.clone().add(V(0, -0.1, 0)), 0.07, 6)
    g(wS, e[4])
    g(wN, e[1])
    g(e[1], e[2])
    g(e[2], e[3])
    g(e[3], e[4])
    // small iron cross on the apex (photo 02)
    b.rod('iron', apex, apex.clone().add(V(0, 1.1, 0)), 0.03, 5)
    b.add('iron', metricBox(0.04, 0.04, 0.5), mat(apex.x, apex.y + 0.8, apex.z))
    // downpipes at the corners
    for (const p of [e[1], e[4], wS, wN]) b.rod('helm', V(p.x, 0.3, p.z), V(p.x, eY - 0.1, p.z), 0.05, 6)
  }

  /* ---------------- sacristy (−Z side) with hipped lean-to ---------------- */
  {
    const sx0 = 1.8
    const sx1 = 7.6
    const zW = ZC - hw
    const zO = zW - 2.4
    const sh = 3.0
    const top = 4.55
    b.block(WALL, sx1 - sx0, sh, zW - zO, (sx0 + sx1) / 2, 0, (zW + zO) / 2)
    b.block('tarSocle', sx1 - sx0 + 0.1, 0.5, zW - zO + 0.1, (sx0 + sx1) / 2, 0, (zW + zO) / 2)
    b.block(TRIM, sx1 - sx0 + 0.24, 0.22, zW - zO + 0.12, (sx0 + sx1) / 2, sh - 0.22, (zW + zO) / 2 - 0.06)
    const o = 0.3
    const t = (top - sh) / (zW - zO)
    const ey = sh - o * t
    const runIn = top - ey // rise from eave to top
    const inset = runIn / t // horizontal run of the hip ends
    const A = V(sx0 - o, ey, zO - o)
    const B = V(sx1 + o, ey, zO - o)
    const C = V(sx1 + o - inset * 0.85, top, zW)
    const D = V(sx0 - o + inset * 0.85, top, zW)
    facet(b, 'tileRed', [A, B, C, D], { thickness: 0.12 })
    facet(b, 'tileRed', [B, V(sx1 + o, ey, zW), C], { thickness: 0.12, hint: V(1, 1, 0) })
    facet(b, 'tileRed', [V(sx0 - o, ey, zW), A, D], { thickness: 0.12, hint: V(-1, 1, 0) })
    beam(b, 'tarTileCap', A.clone().add(V(0, 0.06, 0)), D.clone().add(V(0, 0.06, 0)), 0.2, 0.12)
    beam(b, 'tarTileCap', B.clone().add(V(0, 0.06, 0)), C.clone().add(V(0, 0.06, 0)), 0.2, 0.12)
    b.rod('helm', A.clone().add(V(0, -0.1, 0)), B.clone().add(V(0, -0.1, 0)), 0.07, 6)
    b.rod('helm', V(sx0 - o + 0.2, 0.3, zO - o), V(sx0 - o + 0.2, ey - 0.1, zO - o), 0.05, 6)
    roundWin(b, mat((sx0 + sx1) / 2 + 1.2, 0, zO, Math.PI), 0.8, 1.3, 1.3)
    // door on the west end of the sacristy
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.95, 2.1, 0, 0.35))), mat(sx0 - 0.02, 0, (zW + zO) / 2, -Math.PI / 2))
  }

  /* ---------------- west tower ---------------- */
  const tx = TW.x
  const tz = ZC
  const thw = TW.hw
  b.block(WALL, 2 * thw, TW.top, 2 * thw, tx, 0, tz)
  b.block('tarSocle', 2 * thw + 0.12, 0.5, 2 * thw + 0.12, tx, 0, tz)
  const faceM = (f: 'nx' | 'pz' | 'nz' | 'px') =>
    f === 'nx' ? mat(tx - thw, 0, tz, -Math.PI / 2) : f === 'px' ? mat(tx + thw, 0, tz, Math.PI / 2) : f === 'pz' ? mat(tx, 0, tz + thw, 0) : mat(tx, 0, tz - thw, Math.PI)
  {
    const wm = faceM('nx')
    // portal
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.55, 2.55, 0, 0.35, 12))), mul(wm, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.55, 2.55, 0.22, 0, 0.35), 0.08), mul(wm, mat(0, 0, 0.01)))
    // statue niche with a pointed, gilt-edged frame
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.62, 1.35, 0, 4.25, 10))), mul(wm, mat(0, 0, 0.02)))
    b.add(TRIM, extrude(frameShape('pointed', 0.62, 1.35, 0.12, 0, 4.25), 0.06), mul(wm, mat(0, 0, 0.01)))
    b.add('white', new THREE.CylinderGeometry(0.12, 0.17, 0.95, 10), mul(wm, mat(0, 4.75, 0.02)))
    b.add('white', new THREE.SphereGeometry(0.09, 10, 8), mul(wm, mat(0, 5.28, 0.02)))
    b.add('gilt', metricBox(0.04, 0.3, 0.03), mul(wm, mat(0, 5.85, 0.04)))
    b.add('gilt', metricBox(0.2, 0.04, 0.03), mul(wm, mat(0, 5.92, 0.04)))
    // lettering band (suggested as a slim ochre panel)
    b.add('tarLetter', metricBox(2.2, 0.32, 0.03), mul(wm, mat(0, 3.45, 0.02)))
  }
  for (const f of ['nx', 'pz', 'nz', 'px'] as const) {
    const m = faceM(f)
    if (f !== 'px') {
      // oculus
      b.add('glassC', new THREE.CircleGeometry(0.34, 20), mul(m, mat(0, 7.9, 0.02)))
      b.add(TRIM, new THREE.TorusGeometry(0.36, 0.05, 5, 20), mul(m, mat(0, 7.9, 0.03)))
    }
    // belfry opening with louvres
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.95, 1.75, 0, 10.25, 12))), mul(m, mat(0, 0, 0.02)))
    b.add(WALL, extrude(frameShape('round', 0.95, 1.75, 0.12, 0, 10.25), 0.05), mul(m, mat(0, 0, 0.0)))
    for (let i = 0; i < 4; i++) b.add('wood', metricBox(0.9, 0.05, 0.06), mul(m, mat(0, 10.45 + i * 0.32, -0.08, 0, -0.5)))
  }
  // top cornice, lifted in a segmental arch over each face
  const yT = TW.top
  const AR = { rise: 0.6, ua: 1.45 }
  const ARR = (AR.ua ** 2 + AR.rise ** 2) / (2 * AR.rise)
  const arch = (u: number) => (Math.abs(u) < AR.ua ? Math.sqrt(ARR * ARR - u * u) - (ARR - AR.rise) : 0)
  for (const f of ['nx', 'pz', 'nz', 'px'] as const) {
    const m = faceM(f)
    const pts: THREE.Vector2[] = [new THREE.Vector2(-thw, 0), new THREE.Vector2(thw, 0)]
    for (let i = 0; i <= 16; i++) {
      const u = thw - (i / 16) * 2 * thw
      pts.push(new THREE.Vector2(u, arch(u) + 0.001))
    }
    b.add(WALL, extrude(new THREE.Shape(pts), 0.3), mul(m, mat(0, yT, -0.3)))
    const L = thw + 0.25
    const N = 16
    for (let i = 0; i < N; i++) {
      const u0 = -L + (i / N) * 2 * L
      const u1 = -L + ((i + 1) / N) * 2 * L
      const P = (u: number, n: number, dy: number) => V(u, yT + arch(u) + dy, n).applyMatrix4(m)
      beam(b, TRIM, P(u0, 0.06, -0.12), P(u1, 0.06, -0.12), 0.3, 0.25)
      beam(b, TRIM, P(u0, 0.14, 0.08), P(u1, 0.14, 0.08), 0.42, 0.14)
    }
  }
  b.block(TRIM, 2 * thw + 0.12, 0.25, 2 * thw + 0.12, tx, yT - 0.55, tz)

  /* ---------------- copper helm (COLOR METAL, as photographed 2021) ---------------- */
  {
    const S = 1.08 // vertical stretch for the upward camera angle
    const y0 = yT + 0.3
    const aE = thw + 0.42
    const ap = 1.12 // apothem at the onion foot
    const R8 = 0.586
    const skirt = [
      skirtRing(aE, 0.1, y0, arch, 1, tx, tz),
      skirtRing(aE - 0.35, 0.18, y0 + 0.22 * S, arch, 0.85, tx, tz),
      skirtRing(2.0, 0.55, y0 + 0.55 * S, arch, 0.35, tx, tz),
      skirtRing(1.5, 1.5 * R8 * 0.85, y0 + 0.85 * S, arch, 0.05, tx, tz),
      skirtRing(ap, ap * R8, y0 + 1.05 * S, arch, 0, tx, tz),
    ]
    b.add(CU, loft(skirt, { capBottom: true }))
    const yo = y0 + 1.05 * S
    const c8 = Math.cos(Math.PI / 8)
    // onion bulb, lantern, upper onion, spire — octagonal stations [apothem, height above yo]
    const st: [number, number][] = [
      [ap, 0],
      [1.24, 0.3],
      [1.3, 0.62],
      [1.24, 0.95],
      [1.05, 1.28],
      [0.78, 1.6],
      [0.55, 1.85],
      [0.48, 2.0],
    ]
    helm(b, CU, { n: 8, x: tx, z: tz, stations: st.map(([a, y]) => [a / c8, yo + y * S]) })
    const yl = yo + 2.0 * S
    // lantern: lower cornice, shaft with openings, upper cornice
    helm(b, CU, { n: 8, x: tx, z: tz, flat: true, stations: [[0.58 / c8, yl], [0.72 / c8, yl + 0.08], [0.72 / c8, yl + 0.2], [0.52 / c8, yl + 0.22]] })
    helm(b, CU, { n: 8, x: tx, z: tz, flat: true, stations: [[0.52 / c8, yl + 0.2], [0.52 / c8, yl + 1.0]] })
    helm(b, CU, { n: 8, x: tx, z: tz, flat: true, stations: [[0.52 / c8, yl + 0.98], [0.76 / c8, yl + 1.06], [0.76 / c8, yl + 1.18], [0.5 / c8, yl + 1.22]] })
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2
      const p = V(tx + Math.cos(a) * 0.53, yl + 0.4, tz + Math.sin(a) * 0.53)
      b.add('black', metricBox(0.04, 0.45, 0.24), mat(p.x, p.y + 0.22, p.z, -a))
    }
    const yu = yl + 1.22
    const up: [number, number][] = [
      [0.5, 0],
      [0.62, 0.22],
      [0.64, 0.42],
      [0.52, 0.66],
      [0.3, 0.88],
      [0.14, 1.02],
      [0.1, 1.1],
      [0.07, 1.75],
      [0.02, 2.0],
    ]
    helm(b, CU, { n: 8, x: tx, z: tz, stations: up.map(([a, y]) => [a / c8, yu + y * S]) })
    // arris ribs on the large onion
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2
      const radial = V(Math.cos(a), 0, Math.sin(a))
      for (let i = 0; i < st.length - 1; i++) {
        const p = V(tx + Math.cos(a) * (st[i][0] / c8 + 0.015), yo + st[i][1] * S, tz + Math.sin(a) * (st[i][0] / c8 + 0.015))
        const q = V(tx + Math.cos(a) * (st[i + 1][0] / c8 + 0.015), yo + st[i + 1][1] * S, tz + Math.sin(a) * (st[i + 1][0] / c8 + 0.015))
        beam(b, CU, p, q, 0.05, 0.04, radial)
      }
    }
    // brass ball and patriarchal cross
    const yb = yu + 2.0 * S
    b.add('brass', new THREE.SphereGeometry(0.16, 16, 12), mat(tx, yb + 0.05, tz))
    b.rod('brass', V(tx, yb, tz), V(tx, yb + 1.25, tz), 0.03, 6)
    b.add('brass', metricBox(0.55, 0.05, 0.05), mat(tx, yb + 0.72, tz, Math.PI / 2))
    b.add('brass', metricBox(0.36, 0.05, 0.05), mat(tx, yb + 1.0, tz, Math.PI / 2))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [TW.x, 15.0, ZC],
  materials: () => ({
    tarWall: new THREE.MeshStandardMaterial({ color: '#efdc9f', roughness: 0.9 }),
    tarTrim: new THREE.MeshStandardMaterial({ color: '#dcae4c', roughness: 0.88 }),
    tarSocle: new THREE.MeshStandardMaterial({ color: '#b9ad94', roughness: 0.92 }),
    tarFrame: new THREE.MeshStandardMaterial({ color: '#5a3a24', roughness: 0.7 }),
    tarLetter: new THREE.MeshStandardMaterial({ color: '#c0703a', roughness: 0.7 }),
    tarTileCap: new THREE.MeshStandardMaterial({ color: '#b3532e', roughness: 0.82 }),
  }),
  notes:
    'Târnovița Catholic church: single nave with three-sided apse and tile roof, sacristy, west tower with arched cornices and the octagonal KME copper helm (onion, lantern, upper onion, brass cross) as photographed in 2021; heights estimated from photographs.',
}
export default model
