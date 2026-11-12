/**
 * Wooden church „Nașterea Maicii Domnului", Capu Satului, Câmpulung Moldovenesc
 * (Suceava) — 1855–1858, OSM way 32631748.
 *
 * Modelling specification (real metres, +X = liturgical east = 92.2°, the axis
 * through the west façade and the altar apse of the OSM outline; +Z = south):
 *  - Triconch (trefoil) plan in fir logs on a stone plinth, walls clad in
 *    vertical boards (ro.wikipedia; Commons photos 01–04, July 2011): pronaos
 *    with a straight west end, naos with two large polygonal lateral apses
 *    (straight stub + half-octagon, front facet facing out), polygonal altar
 *    apse (half-octagon) of the same width; small polygonal porch with its own
 *    roof on the south side of the pronaos.
 *  - Plan size: the OSM outline (37.3 × 28.5 m including the deep eaves) is
 *    hand-drawn and asymmetric; door/window sizes in the photos give a smaller
 *    building, so the symmetrised outline was scaled to 87 % (walls 30.2 ×
 *    22.4 m, eaves 1.2 m → 32.6 × 24.8 m).
 *  - Roofs: one continuous hipped roof over the pronaos (west hip), naos and
 *    altar apse (octagonal hip end), crossed at the naos by a transverse roof
 *    of the same ridge height ending in octagonal hips over the lateral apses;
 *    steep upper slopes (40°) with a flatter bell-cast eave skirt (20°, 1.2 m)
 *    on carved brackets; porch roof tucked under the main eave.
 *  - Three octagonal drum towers on the ridge — over the pronaos, the naos
 *    (largest, glazed arched windows, open lantern) and the altar — clad in
 *    ochre diamond-pattern sheathing, louvred windows on the side towers,
 *    flared octagonal helmet domes, iron crosses on crescents.
 *  - METAL: the 2011 photographs predate the works and show the earlier
 *    orange-painted sheet roof. COLOR METAL supplied copper (2021–2022)
 *    according to its records, so all roof surfaces, eave skirts, domes,
 *    lantern roof, gutters and downpipes are shown in weathered copper
 *    ('copperBrown') with standing seams ≈ 0.5 m; the domes are ribbed on
 *    their hips. Which surfaces were re-covered is not documented.
 * Approximations: overall scale (see above), lateral-apse and porch polygon
 * proportions, tower heights (photo ratios), north side mirrored from the
 * south (no porch), west door assumed, the diamond pattern of the drums and
 * the bracket carving simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, prism, prismOutline, helm, polyRing, seams } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/* ---------------- plan (walls) ---------------- */
const W = 4.9 // half width of every arm
const K = Math.tan(Math.PI / 8) // half-octagon proportion
const XW = -15.1 // west wall
const XE = 15.1 // altar apse tip
const XA = XE - W // altar octagon centre (10.2)
const XC = 1.25 // naos / lateral apse axis
const ZF = 11.2 // lateral apse front facet
const ZC = ZF - W // lateral octagon centre (6.3)
/* porch (south side of the pronaos) */
const PX = -7.6
const PW = 2.8
const PF = W + 4.0 // porch front facet
const PC = PF - PW

/* ---------------- heights ---------------- */
const SOCLE = 0.5
const WT = 5.6 // wall top
const P_UP = 40 * D2R
const P_SK = 20 * D2R
const OV = 1.2
const RIDGE = WT + W * Math.tan(P_UP)
const SK_DROP = OV * Math.tan(P_SK)
const PWT = 3.3 // porch wall top
const P_PORCH = 31 * D2R
const PRIDGE = PWT + PW * Math.tan(P_PORCH)

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.04)
const BOARDS = 'cmpBoards'

/** Closed wall outline, counter-clockwise in the sense used below (outward normal = (dz, -dx)). */
const OUTLINE: P2[] = [
  [XW, -W],
  [XC - W, -W],
  [XC - W, -(ZC + K * W)],
  [XC - K * W, -ZF],
  [XC + K * W, -ZF],
  [XC + W, -(ZC + K * W)],
  [XC + W, -W],
  [XA + K * W, -W],
  [XE, -K * W],
  [XE, K * W],
  [XA + K * W, W],
  [XC + W, W],
  [XC + W, ZC + K * W],
  [XC + K * W, ZF],
  [XC - K * W, ZF],
  [XC - W, ZC + K * W],
  [XC - W, W],
  [XW, W],
]

/** Open outline of the porch walls (starts and ends on the pronaos wall). */
const PORCH: P2[] = [
  [PX - PW, W],
  [PX - PW, PC + K * PW],
  [PX - K * PW, PF],
  [PX + K * PW, PF],
  [PX + PW, PC + K * PW],
  [PX + PW, W],
]

function normalOf(a: P2, b: P2): P2 {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l = Math.hypot(dx, dz)
  return [dz / l, -dx / l]
}

/** Frame on a wall: local x along the wall, y up, z outward (normal n), origin at p. */
function wallFrame(p: P2, n: P2, out = 0) {
  return mat(p[0] + n[0] * out, 0, p[1] + n[1] * out, Math.PI / 2 - Math.atan2(n[1], n[0]))
}

/** Board-clad wall run between a and b (outer face on the a–b line). */
function wallRun(b: Builder, a: P2, c: P2, y0: number, y1: number, key = BOARDS, t = 0.32, grow = 0) {
  const n = normalOf(a, c)
  const L = Math.hypot(c[0] - a[0], c[1] - a[1])
  const m: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]
  const f = wallFrame(m, n, grow - t / 2)
  b.add(key, metricBox(L + 2 * grow, y1 - y0, t), M(f, mat(0, (y0 + y1) / 2, 0)))
}

/** Arched window (dark glass, dark frame, iron grid) or door in a wall frame. */
function arched(b: Builder, f: THREE.Matrix4, w: number, h: number, y0: number, o: { door?: boolean; louvre?: boolean } = {}) {
  const fill = o.door ? 'cmpDoor' : o.louvre ? 'cmpShutter' : 'glassC'
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(f, mat(0, 0, 0.04)))
  b.add('cmpFrame', extrude(frameShape('round', w, h, 0.09, 0, y0), 0.08), M(f, mat(0, 0, 0.01)))
  if (o.louvre) {
    for (let y = y0 + 0.15; y < y0 + h - w * 0.55; y += 0.16) b.add('cmpFrame', metricBox(w, 0.035, 0.05), M(f, mat(0, y, 0.07, 0, 0.5)))
    b.add('cmpFrame', metricBox(0.05, h - w * 0.5, 0.05), M(f, mat(0, y0 + (h - w * 0.5) / 2, 0.08)))
  } else if (!o.door) {
    const bars = 3
    for (let i = 1; i < bars; i++) b.add('iron', metricBox(0.025, h - w * 0.5, 0.03), M(f, mat(-w / 2 + (i * w) / bars, y0 + (h - w * 0.5) / 2, 0.06)))
    for (let y = y0 + 0.28; y < y0 + h - w * 0.5; y += 0.28) b.add('iron', metricBox(w, 0.025, 0.03), M(f, mat(0, y, 0.06)))
  } else {
    b.add('cmpFrame', metricBox(0.05, h - w * 0.5, 0.04), M(f, mat(0, y0 + (h - w * 0.5) / 2, 0.06)))
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w * 0.8, w * 0.4, 0, y0 + h - w * 0.42, 10))), M(f, mat(0, 0, 0.06)))
  }
}

/** Eave skirt (bell-cast), brackets and gutter along a wall polyline. */
function skirt(b: Builder, poly: P2[], closed: boolean, wt: number, ov: number, drop: number, bracketStep: number) {
  const n = poly.length
  const nE = closed ? n : n - 1
  const normals: P2[] = []
  for (let i = 0; i < nE; i++) normals.push(normalOf(poly[i], poly[(i + 1) % n]))
  const outer: P2[] = poly.map((p, i) => {
    const nPrev = closed ? normals[(i - 1 + nE) % nE] : normals[Math.max(0, i - 1)]
    const nNext = closed ? normals[i % nE] : normals[Math.min(nE - 1, i)]
    if (!closed && (i === 0 || i === n - 1)) {
      const nn = i === 0 ? nNext : nPrev
      return [p[0] + nn[0] * ov, p[1] + nn[1] * ov]
    }
    const s = 1 + nPrev[0] * nNext[0] + nPrev[1] * nNext[1]
    return [p[0] + (ov * (nPrev[0] + nNext[0])) / s, p[1] + (ov * (nPrev[1] + nNext[1])) / s]
  })
  const ye = wt - drop
  for (let i = 0; i < nE; i++) {
    const a = poly[i]
    const c = poly[(i + 1) % n]
    const oa = outer[i]
    const oc = outer[(i + 1) % n]
    facet(b, CU, [V(a[0], wt, a[1]), V(c[0], wt, c[1]), V(oc[0], ye, oc[1]), V(oa[0], ye, oa[1])], { seams: SEAM, thickness: 0.12 })
    // fascia + gutter
    b.beam(CU, V(oa[0], ye - 0.1, oa[1]), V(oc[0], ye - 0.1, oc[1]), 0.08, 0.2)
    b.rod(CU, V(oa[0], ye - 0.12, oa[1]).add(V(normals[i][0] * 0.08, 0, normals[i][1] * 0.08)), V(oc[0], ye - 0.12, oc[1]).add(V(normals[i][0] * 0.08, 0, normals[i][1] * 0.08)), 0.07, 8)
    // brackets (carved consoles, dark timber)
    const L = Math.hypot(c[0] - a[0], c[1] - a[1])
    const cnt = Math.max(1, Math.round(L / bracketStep))
    const nn = normals[i]
    for (let k = 0; k <= cnt; k++) {
      if ((k === 0 || k === cnt) && cnt > 1) continue
      const t = cnt === 1 ? 0.5 : k / cnt
      const px = a[0] + (c[0] - a[0]) * t
      const pz = a[1] + (c[1] - a[1]) * t
      b.beam('cmpBracket', V(px, wt - 0.75, pz), V(px + nn[0] * ov * 0.8, ye - 0.16, pz + nn[1] * ov * 0.8), 0.14, 0.18, V(0, 1, 0))
      b.beam('cmpBracket', V(px, wt - 0.12, pz), V(px + nn[0] * ov * 0.85, ye - 0.08, pz + nn[1] * ov * 0.85), 0.14, 0.16, V(0, 1, 0))
    }
  }
  // soffit board line along the wall head
  for (let i = 0; i < nE; i++) {
    const a = poly[i]
    const c = poly[(i + 1) % n]
    const nn = normals[i]
    b.beam('cmpBracket', V(a[0] + nn[0] * 0.05, wt - 0.1, a[1] + nn[1] * 0.05), V(c[0] + nn[0] * 0.05, wt - 0.1, c[1] + nn[1] * 0.05), 0.12, 0.2)
  }
  return outer
}

/** Diamond-pattern battens on one drum face (local frame f, face width fw, from y0 to y1). */
function diamonds(b: Builder, f: THREE.Matrix4, fw: number, y0: number, y1: number, step = 0.42) {
  const hw = fw / 2
  const H = y1 - y0
  for (const s of [1, -1]) {
    for (let u0 = -hw - H; u0 < hw + H; u0 += step) {
      // line u(v) = u0 + s·(v − y0), clipped to |u| ≤ hw and y0 ≤ v ≤ y1
      const uAt = (v: number) => u0 + s * (v - y0)
      const lo = s > 0 ? y0 - hw - u0 : y0 + u0 - hw
      const hi = s > 0 ? y0 + hw - u0 : y0 + u0 + hw
      const vA = Math.max(y0, lo)
      const vB = Math.min(y1, hi)
      if (vB - vA < 0.05) continue
      b.beam('cmpLine', V(uAt(vA), vA, 0.025).applyMatrix4(f), V(uAt(vB), vB, 0.025).applyMatrix4(f), 0.03, 0.025)
    }
  }
}

/** Octagonal drum tower with flared helmet dome. */
function tower(b: Builder, o: { x: number; ap: number; yTop: number; domeH: number; win: 'louvre' | 'glass'; lantern?: boolean }) {
  const { x, ap } = o
  const R = ap / Math.cos(Math.PI / 8)
  const y0 = RIDGE - 2.2
  prism(b, 'cmpOchre', { x, z: 0, n: 8, r: R, y0, h: o.yTop - y0 })
  const fw = 2 * ap * K
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 4
    const f = mat(x + ap * Math.cos(a), 0, ap * Math.sin(a), Math.PI / 2 - a)
    // corner battens + diamond sheathing above the roof
    b.add('cmpLine', metricBox(0.08, o.yTop - RIDGE + 0.6, 0.05), M(f, mat(fw / 2 - 0.02, (RIDGE - 0.6 + o.yTop) / 2, 0.02)))
    diamonds(b, f, fw - 0.06, RIDGE - 0.4, o.yTop - 0.35)
    if (j % 2 === 0) {
      if (o.win === 'louvre') arched(b, f, 0.62, 1.45, o.yTop - 2.35, { louvre: true })
      else arched(b, f, 0.8, 1.75, o.yTop - 2.55)
    }
  }
  // cornice band + flared octagonal helmet
  b.add('cmpOchre', new THREE.CylinderGeometry(R + 0.12, R + 0.04, 0.22, 8, 1, false, Math.PI / 8 - Math.PI / 2), mat(x, o.yTop - 0.11, 0))
  const y = o.yTop - 0.05
  const Rd = R + 0.32
  const h = o.domeH
  const st: [number, number][] = [
    [Rd, y],
    [Rd - 0.1, y + 0.12],
    [R + 0.1, y + 0.3],
    [R + 0.2, y + h * 0.3],
    [R + 0.12, y + h * 0.48],
    [R * 0.88, y + h * 0.66],
    [R * 0.58, y + h * 0.82],
    [R * 0.25, y + h * 0.94],
    [0.12, y + h],
  ]
  helm(b, CU, { x, z: 0, n: 8, stations: st })
  // ribs on the dome hips
  const rings = st.map(([r, yy]) => polyRing(8, r + 0.02, yy, Math.PI / 8, x, 0))
  for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 2; i++) b.beam(CU, rings[i][k], rings[i + 1][k], 0.07, 0.06)
  // horizontal scale courses (suggesting the diamond sheet pattern)
  for (let i = 2; i < st.length - 2; i++) {
    const r = polyRing(8, st[i][0] + 0.015, st[i][1], Math.PI / 8, x, 0)
    for (let k = 0; k < 8; k++) b.beam(CU, r[k], r[(k + 1) % 8], 0.04, 0.03)
  }
  let top = y + h
  if (o.lantern) {
    const lr = 0.62
    prism(b, CU, { x, z: 0, n: 8, r: lr, y0: top - 0.15, h: 0.25 })
    const ly = top + 0.1
    const lh = 1.25
    // eight posts and open arches
    const ring = polyRing(8, lr, ly, Math.PI / 8, x, 0)
    for (const p of ring) b.add('cmpOchre', metricBox(0.14, lh, 0.14), mat(p.x, ly + lh / 2, p.z))
    b.add('cmpOchre', new THREE.CylinderGeometry(lr + 0.05, lr + 0.05, 0.25, 8, 1, false, Math.PI / 8 - Math.PI / 2), mat(x, ly + lh - 0.12, 0))
    b.add('black', new THREE.CylinderGeometry(lr * 0.75, lr * 0.75, lh - 0.3, 8), mat(x, ly + (lh - 0.3) / 2, 0))
    const st2: [number, number][] = [
      [lr + 0.2, ly + lh],
      [lr + 0.05, ly + lh + 0.12],
      [lr * 0.85, ly + lh + 0.35],
      [lr * 0.45, ly + lh + 0.6],
      [0.08, ly + lh + 0.72],
    ]
    helm(b, CU, { x, z: 0, n: 8, stations: st2 })
    top = ly + lh + 0.72
  }
  // finial, iron cross on a crescent
  b.add('iron', new THREE.SphereGeometry(0.14, 10, 8), mat(x, top + 0.1, 0))
  b.rod('iron', V(x, top, 0), V(x, top + 1.7, 0), 0.035, 6)
  b.add('iron', metricBox(0.06, 0.06, 0.9), mat(x, top + 1.25, 0))
  b.add('iron', metricBox(0.06, 0.06, 0.55), mat(x, top + 1.55, 0))
  b.add('iron', new THREE.TorusGeometry(0.28, 0.035, 5, 14, Math.PI), mat(x, top + 0.62, 0, Math.PI / 2, 0, Math.PI))
  for (const s of [-1, 1]) b.add('white', new THREE.SphereGeometry(0.06, 8, 6), mat(x, top + 1.25, s * 0.48))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- plinth and walls ---------------- */
  const n = OUTLINE.length
  for (let i = 0; i < n; i++) {
    const a = OUTLINE[i]
    const c = OUTLINE[(i + 1) % n]
    wallRun(b, a, c, SOCLE, WT)
    wallRun(b, a, c, 0, SOCLE, 'stoneLight', 0.45, 0.08)
  }
  // interior fill (keeps the cross-shaped massing closed under the roofs)
  prismOutline(b, BOARDS, OUTLINE, 0.2, WT - 0.25)
  for (let i = 0; i < PORCH.length - 1; i++) {
    wallRun(b, PORCH[i], PORCH[i + 1], SOCLE, PWT)
    wallRun(b, PORCH[i], PORCH[i + 1], 0, SOCLE, 'stoneLight', 0.45, 0.08)
  }
  b.block(BOARDS, 2 * PW - 0.6, PWT - 0.3, PF - W - 0.4, PX, 0.2, (W + PF) / 2 - 0.1)
  // corner posts (vertical cover boards at every corner)
  for (const p of OUTLINE) b.add('cmpBracket', metricBox(0.16, WT - SOCLE, 0.16), mat(p[0], (SOCLE + WT) / 2, p[1]))

  /* ---------------- openings ---------------- */
  const onEdge = (a: P2, c: P2, t: number) => wallFrame([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], normalOf(a, c))
  // pronaos: south (west of the porch) and north
  arched(b, onEdge([XW, W], [XC - W, W], 0.84), 0.85, 1.95, 1.7)
  arched(b, onEdge([XW, -W], [XC - W, -W], 0.2), 0.85, 1.95, 1.7)
  arched(b, onEdge([XW, -W], [XC - W, -W], 0.65), 0.85, 1.95, 1.7)
  // west door
  arched(b, onEdge([XW, W], [XW, -W], 0.5), 1.3, 2.5, SOCLE, { door: true })
  b.block(CU, 2.2, 0.08, 0.9, XW - 0.4, SOCLE + 2.75, 0)
  // lateral apses: large window in the front facet
  for (const s of [-1, 1]) {
    const a: P2 = [XC - K * W, s * ZF]
    const c: P2 = [XC + K * W, s * ZF]
    arched(b, s > 0 ? onEdge(c, a, 0.5) : onEdge(a, c, 0.5), 1.0, 2.55, 1.6)
  }
  // altar apse: windows in the oblique facets, south door with fanlight
  arched(b, onEdge([XA + K * W, -W], [XE, -K * W], 0.5), 0.9, 2.2, 1.8)
  arched(b, onEdge([XE, K * W], [XA + K * W, W], 0.5), 0.9, 2.2, 1.8)
  arched(b, onEdge([XA + K * W, W], [XC + W, W], 0.22), 0.85, 2.35, SOCLE, { door: true })
  // porch: three windows in the end facets, door in its west side
  arched(b, onEdge(PORCH[1], PORCH[2], 0.5), 0.62, 1.45, 1.35)
  arched(b, onEdge(PORCH[2], PORCH[3], 0.5), 0.62, 1.45, 1.35)
  arched(b, onEdge(PORCH[3], PORCH[4], 0.5), 0.62, 1.45, 1.35)
  arched(b, onEdge(PORCH[0], PORCH[1], 0.5), 0.95, 2.2, SOCLE, { door: true })

  /* ---------------- roofs (weathered copper) ---------------- */
  // eave skirts on brackets
  skirt(b, OUTLINE, true, WT, OV, SK_DROP, 1.5)
  skirt(b, PORCH, false, PWT, 0.75, 0.75 * Math.tan(P_SK), 1.3)

  const fc = (pts: [number, number, number][]) => facet(b, CU, pts.map(([x, y, z]) => V(x, y, z)), { seams: SEAM, thickness: 0.1 })
  const cap = (a: [number, number, number], c: [number, number, number], w = 0.18) => b.beam(CU, V(a[0], a[1] + 0.05, a[2]), V(c[0], c[1] + 0.05, c[2]), w, 0.1)
  // main roof: west hip, long slopes, altar octagon end
  const xr0 = XW + W
  fc([[XW, WT, -W], [XW, WT, W], [xr0, RIDGE, 0]])
  fc([[XW, WT, -W], [xr0, RIDGE, 0], [XA, RIDGE, 0], [XA + K * W, WT, -W]])
  fc([[XA + K * W, WT, W], [XA, RIDGE, 0], [xr0, RIDGE, 0], [XW, WT, W]])
  const altar: P2[] = [[XA + K * W, -W], [XE, -K * W], [XE, K * W], [XA + K * W, W]]
  for (let i = 0; i < 3; i++) fc([[altar[i][0], WT, altar[i][1]], [altar[i + 1][0], WT, altar[i + 1][1]], [XA, RIDGE, 0]])
  cap([xr0, RIDGE, 0], [XA, RIDGE, 0], 0.24)
  cap([XW, WT, -W], [xr0, RIDGE, 0])
  cap([XW, WT, W], [xr0, RIDGE, 0])
  for (const p of altar) cap([p[0], WT, p[1]], [XA, RIDGE, 0])
  // transverse roof over the lateral apses (same ridge height)
  const zs = ZC + K * W
  fc([[XC - W, WT, -zs], [XC - W, WT, zs], [XC, RIDGE, ZC], [XC, RIDGE, -ZC]])
  fc([[XC + W, WT, zs], [XC + W, WT, -zs], [XC, RIDGE, -ZC], [XC, RIDGE, ZC]])
  cap([XC, RIDGE, -ZC], [XC, RIDGE, ZC], 0.24)
  for (const s of [-1, 1]) {
    const end: P2[] = [[XC - W, s * zs], [XC - K * W, s * ZF], [XC + K * W, s * ZF], [XC + W, s * zs]]
    for (let i = 0; i < 3; i++) fc([[end[i][0], WT, end[i][1]], [end[i + 1][0], WT, end[i + 1][1]], [XC, RIDGE, s * ZC]])
    for (const p of end) cap([p[0], WT, p[1]], [XC, RIDGE, s * ZC])
  }
  // porch roof (ridge runs back under the main eave skirt)
  {
    const pzs = PC + K * PW
    const ff = (pts: [number, number, number][]) => facet(b, CU, pts.map(([x, y, z]) => V(x, y, z)), { seams: SEAM, thickness: 0.08 })
    ff([[PX - PW, PWT, W - 0.2], [PX - PW, PWT, pzs], [PX, PRIDGE, PC], [PX, PRIDGE, W - 0.2]])
    ff([[PX + PW, PWT, pzs], [PX + PW, PWT, W - 0.2], [PX, PRIDGE, W - 0.2], [PX, PRIDGE, PC]])
    const end: P2[] = [PORCH[1], PORCH[2], PORCH[3], PORCH[4]]
    for (let i = 0; i < 3; i++) ff([[end[i][0], PWT, end[i][1]], [end[i + 1][0], PWT, end[i + 1][1]], [PX, PRIDGE, PC]])
    for (const p of end) cap([p[0], PWT, p[1]], [PX, PRIDGE, PC], 0.14)
    cap([PX, PRIDGE, W - 0.2], [PX, PRIDGE, PC], 0.16)
    // small iron cross on the porch apex
    b.add('iron', new THREE.SphereGeometry(0.1, 8, 6), mat(PX, PRIDGE + 0.12, PC))
    b.rod('iron', V(PX, PRIDGE, PC), V(PX, PRIDGE + 1.2, PC), 0.03, 6)
    b.add('iron', metricBox(0.55, 0.05, 0.05), mat(PX, PRIDGE + 0.9, PC))
  }
  // downpipes at the re-entrant corners
  for (const [x, z] of [[XC - W - 0.15, W + 0.15], [XC + W + 0.15, W + 0.15], [XC - W - 0.15, -W - 0.15], [XC + W + 0.15, -W - 0.15], [PX + PW + 0.12, W + 0.3]] as P2[]) {
    b.rod(CU, V(x, 0.3, z), V(x, WT - 0.2, z), 0.055, 8)
  }

  // brick chimney in the south valley between the pronaos and the lateral roof
  b.block('brickRed', 0.55, 2.2, 0.55, XC - W + 0.9, 7.9, 2.6)
  b.block(CU, 0.75, 0.1, 0.75, XC - W + 0.9, 10.1, 2.6)

  /* ---------------- towers ---------------- */
  tower(b, { x: -9.4, ap: 1.55, yTop: 13.4, domeH: 2.6, win: 'louvre' })
  tower(b, { x: XC, ap: 1.9, yTop: 13.9, domeH: 2.65, win: 'glass', lantern: true })
  tower(b, { x: XA, ap: 1.55, yTop: 13.4, domeH: 2.6, win: 'louvre' })

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-6, 7.6, 3.2],
  materials: (base) => {
    const timber = base.timber as THREE.MeshStandardMaterial
    const boards = timber.clone()
    boards.color = new THREE.Color('#c0844c')
    if (timber.map) {
      boards.map = timber.map.clone()
      boards.map.repeat.set(1 / 2.0, 1 / 2.4)
      boards.map.needsUpdate = true
    }
    if (timber.bumpMap) {
      boards.bumpMap = timber.bumpMap.clone()
      boards.bumpMap.repeat.set(1 / 2.0, 1 / 2.4)
      boards.bumpMap.needsUpdate = true
    }
    return {
      cmpBoards: boards,
      cmpOchre: new THREE.MeshStandardMaterial({ color: '#d9b27a', roughness: 0.75 }),
      cmpLine: new THREE.MeshStandardMaterial({ color: '#a77e4c', roughness: 0.75 }),
      cmpBracket: new THREE.MeshStandardMaterial({ color: '#6a4026', roughness: 0.78 }),
      cmpFrame: new THREE.MeshStandardMaterial({ color: '#5e3a24', roughness: 0.7 }),
      cmpShutter: new THREE.MeshStandardMaterial({ color: '#9a6a3c', roughness: 0.75 }),
      cmpDoor: new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.7 }),
    }
  },
  notes: 'Interpreted from 2011 photographs and the OSM outline (scaled to 87 %); roofs and domes shown in the copper supplied by COLOR METAL according to its records; north side mirrored.',
}
export default model
