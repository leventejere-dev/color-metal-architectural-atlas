/**
 * Biserica „Sf. Gheorghe-Vechi” („Cuvioasa Paraschiva”), Craiova — Str. Arieș 9,
 * OSM way 753520160 (outline 20.5 × 11.3 m, long axis 90.4°).
 *
 * Modelling specification (real metres, +X = OSM long axis pointing east to the
 * altar, +Z = south side; origin = footprint centre):
 *  - Trefoil (triconch) Wallachian plan after the OSM outline: 7.4 m wide nave
 *    from the open west porch (x −10.2) to the altar; two shallow polygonal
 *    lateral apses (5 sides, 5.5 m wide, 1.95 m deep) centred at x ≈ 0.75; a
 *    five-sided altar apse closing the east end at x 10.2.
 *  - Walls ≈ 7.4 m to the eaves (photos 02–04): white plaster in two registers of
 *    framed rectangular panels separated by a moulded belt (torus with dentil
 *    rows) at ≈ 3.7 m; twin dentil rows under the eaves cornice.
 *  - West porch open on three sides with lobed arches on columns (photo 04); a
 *    painted panel (fresco) on the pronaos west wall behind it.
 *  - One octagonal tower over the naos (photo 01): square socle on the ridge,
 *    ≈ 4.2 m drum with arched windows and archivolts, cornice, octagonal tent
 *    helm with flared eave, ball and wrought cross.
 *  - Roof: 32° hipped roof with ≈ 0.7 m eaves, cross-hips over the lateral
 *    apses and a hipped fan over the altar apse; gutters and downpipes.
 * METAL (client rule): the available photographs (2017) predate the 2022 works
 * and show a red-brown sheet roof; the roof surfaces, the tower helm and the
 * rainwater system are shown in natural titanium-zinc, the material supplied by
 * COLOR METAL according to its records (2022); standing seams ≈ 0.5 m.
 * Approximations: wall and tower heights (estimated from the photographs, no
 * survey), panel layout on the north side (mirrored from the south), number and
 * size of the windows, the porch arches (simplified to round arches), the
 * detached bell-cot is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, seams, prismOutline, faceFrame, door, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- plan ---------------- */
const XW = -10.2 // west front (porch)
const XP = -7.6 // pronaos west wall (back of the porch)
const HW = 3.7 // half width of the nave
const LAT = { xc: 0.75, a: 2.75, c: 1.95 } // lateral apses (centre x, half length, depth)
const ALT = [
  [6.9, 3.7],
  [8.9, 3.0],
  [10.2, 1.4],
] as const

/* ---------------- heights ---------------- */
const WALL = 7.4
const EAVE = 7.65 // top of the cornice = roof bearing line
const BELT = 3.7
const PITCH = 32
const OV = 0.7
const T = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * T
const YE = EAVE - OV * T

const ROOF = 'zincNatural'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)

/** Lateral apse polygon points (half 10-gon, flattened) on side s (+1 south, −1 north), from west to east. */
function latPts(s: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= 5; i++) {
    const a = Math.PI - (i / 5) * Math.PI
    out.push([LAT.xc + LAT.a * Math.cos(a), s * (HW + LAT.c * Math.sin(a))])
  }
  return out
}

/** Full outline (counter-clockwise in x-z). */
function outline(): [number, number][] {
  const pts: [number, number][] = []
  pts.push([XW, -HW])
  // north side west → east
  pts.push(...latPts(-1))
  pts.push([ALT[0][0], -ALT[0][1]], [ALT[1][0], -ALT[1][1]], [ALT[2][0], -ALT[2][1]])
  pts.push([ALT[2][0], ALT[2][1]], [ALT[1][0], ALT[1][1]], [ALT[0][0], ALT[0][1]])
  pts.push(...latPts(1).reverse())
  pts.push([XW, HW])
  return pts
}

/** Miter offset of a closed polygon (outward for d > 0). */
function offsetPoly(pts: [number, number][], d: number): [number, number][] {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i]
    const [x1, z1] = pts[(i + 1) % pts.length]
    area += x0 * z1 - x1 * z0
  }
  const sgn = area > 0 ? 1 : -1
  const n = pts.length
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]
    const c = pts[(i + 1) % n]
    const e1 = [p[0] - a[0], p[1] - a[1]]
    const e2 = [c[0] - p[0], c[1] - p[1]]
    const l1 = Math.hypot(e1[0], e1[1]) || 1
    const l2 = Math.hypot(e2[0], e2[1]) || 1
    const n1 = [(sgn * e1[1]) / l1, (-sgn * e1[0]) / l1]
    const n2 = [(sgn * e2[1]) / l2, (-sgn * e2[0]) / l2]
    const m = [n1[0] + n2[0], n1[1] + n2[1]]
    const ml = Math.hypot(m[0], m[1]) || 1
    const k = d / Math.max(0.35, (m[0] * n1[0] + m[1] * n1[1]) / ml)
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k] as [number, number]
  })
}

/** Raised rectangular panel frame on a façade (u along façade, v up). */
function panel(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, key = 'ghStucco') {
  const m = faceFrame(face, plane, u, 0, 0)
  const f = 0.13
  b.add(key, metricBox(w, f, 0.1), M(m, mat(0, y0 + f / 2, 0.05)))
  b.add(key, metricBox(w, f, 0.1), M(m, mat(0, y0 + h - f / 2, 0.05)))
  b.add(key, metricBox(f, h, 0.1), M(m, mat(-w / 2 + f / 2, y0 + h / 2, 0.05)))
  b.add(key, metricBox(f, h, 0.1), M(m, mat(w / 2 - f / 2, y0 + h / 2, 0.05)))
}

/** Small arched window with a moulded archivolt. */
function archWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  s.lineTo(r, y0 + h - r)
  s.absarc(0, y0 + h - r, r, 0, Math.PI, false)
  s.lineTo(-r, y0)
  b.add('glassC', new THREE.ShapeGeometry(s, 10), M(m, mat(0, 0, 0.02)))
  const o = new THREE.Shape()
  const R = r + 0.16
  o.moveTo(-R, y0 - 0.1)
  o.lineTo(R, y0 - 0.1)
  o.lineTo(R, y0 + h - r)
  o.absarc(0, y0 + h - r, R, 0, Math.PI, false)
  o.lineTo(-R, y0 - 0.1)
  o.holes.push(new THREE.Path(s.getPoints(10)))
  b.add('ghStucco', extrude(o, 0.1, 10), m)
}

function build(): Builder {
  const b = new Builder()
  const out = outline()

  /* ================= walls ================= */
  // body behind the porch (the porch itself is open)
  const body = out.map(([x, z]) => [Math.max(x, XP), z] as [number, number])
  prismOutline(b, 'ghWall', body, 0, WALL)
  prismOutline(b, 'ghSocle', offsetPoly(out, 0.08), 0, 0.6)
  // belt: torus-like band with two dentil courses (simplified as stepped bands)
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.16), BELT - 0.2, 0.42)
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.08), BELT - 0.45, 0.12)
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.08), BELT + 0.35, 0.12)
  // eaves cornice with dentil courses
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.1), WALL - 0.75, 0.14)
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.18), WALL - 0.45, 0.16)
  prismOutline(b, 'ghStucco', offsetPoly(out, 0.3), WALL - 0.2, EAVE - WALL + 0.2)
  // dentils along the straight walls (south and north)
  for (const s of [-1, 1]) {
    for (const [x0, x1] of [
      [XW + 0.3, -2.2],
      [3.7, 6.7],
    ]) {
      for (let x = x0; x <= x1; x += 0.36) {
        b.block('ghStucco', 0.16, 0.16, 0.12, x, WALL - 0.62, s * (HW + 0.14))
        b.block('ghStucco', 0.16, 0.16, 0.12, x + 0.18, BELT + 0.22, s * (HW + 0.2))
        b.block('ghStucco', 0.16, 0.16, 0.12, x + 0.18, BELT - 0.32, s * (HW + 0.14))
      }
    }
  }

  /* ================= façade panels and windows ================= */
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = s * HW
    const U = (x: number) => (s > 0 ? x : -x)
    // pronaos & porch: upper and lower panels
    for (const x of [-8.85, -6.25, -3.75]) {
      panel(b, face, plane, U(x), BELT + 0.6, 2.05, WALL - BELT - 1.55)
      panel(b, face, plane, U(x), 0.85, 2.05, BELT - 1.45)
    }
    // altar part
    panel(b, face, plane, U(5.3), BELT + 0.6, 2.4, WALL - BELT - 1.55)
    panel(b, face, plane, U(5.3), 0.85, 2.4, BELT - 1.45)
    // narrow windows (pronaos lower register, altar)
    for (const x of [-6.25, 5.3]) {
      const m = faceFrame(face, plane, U(x), 0, 0)
      archWindow(b, m, 0.55, 1.5, 1.35)
    }
  }
  // lateral apse windows + panels on the polygon faces
  for (const s of [-1, 1]) {
    const pts = latPts(s)
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i]
      const [x1, z1] = pts[i + 1]
      const cx = (x0 + x1) / 2
      const cz = (z0 + z1) / 2
      const ang = Math.atan2(x1 - x0, z1 - z0) // direction of the edge
      const ry = ang + (s > 0 ? Math.PI / 2 : -Math.PI / 2)
      const len = Math.hypot(x1 - x0, z1 - z0)
      const m = mat(cx, 0, cz, s > 0 ? ry + Math.PI : ry + Math.PI)
      // panels (frames) upper & lower
      const fr = (y0: number, h: number) => {
        const w = len - 0.5
        const f = 0.12
        b.add('ghStucco', metricBox(w, f, 0.07), M(m, mat(0, y0, 0.035)))
        b.add('ghStucco', metricBox(w, f, 0.07), M(m, mat(0, y0 + h, 0.035)))
      }
      fr(BELT + 0.6, WALL - BELT - 1.55)
      fr(0.85, BELT - 1.45)
      if (i === 2) archWindow(b, m, 0.6, 1.6, BELT + 1.0)
    }
  }
  // altar apse east window
  archWindow(b, mat(10.2, 0, 0, Math.PI / 2), 0.55, 1.5, BELT + 1.0)

  /* ================= west porch ================= */
  {
    // front wall with three arches, side walls with one arch each
    const arches = (w: number, holes: [number, number, number][], depth: number) => {
      const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, WALL), new THREE.Vector2(-w / 2, WALL)])
      for (const [u, aw, ah] of holes) {
        const p = new THREE.Path()
        p.moveTo(u - aw / 2, 0.7)
        p.lineTo(u + aw / 2, 0.7)
        p.lineTo(u + aw / 2, ah - aw / 2)
        p.absarc(u, ah - aw / 2, aw / 2, 0, Math.PI, false)
        p.lineTo(u - aw / 2, 0.7)
        s.holes.push(p)
      }
      return extrude(s, depth, 10)
    }
    b.add('ghWall', arches(2 * HW, [[-2.35, 1.75, 3.6], [0, 1.85, 3.75], [2.35, 1.75, 3.6]], 0.55), mat(XW + 0.55, 0, 0, -Math.PI / 2))
    for (const s of [-1, 1]) b.add('ghWall', arches(XP - XW, [[0, 1.6, 3.55]], 0.5), mat((XW + XP) / 2, 0, s > 0 ? HW - 0.5 : -HW))
    // porch floor and parapet
    b.block('ghSocle', XP - XW, 0.7, 2 * HW, (XW + XP) / 2, 0, 0)
    // columns in front of the piers (stone, banded)
    for (const z of [-3.5, -1.18, 1.18, 3.5]) {
      b.add('ghStone', new THREE.CylinderGeometry(0.2, 0.22, 2.55, 14), mat(XW - 0.05, 0.7 + 1.27, z))
      b.block('ghStone', 0.5, 0.25, 0.5, XW - 0.05, 0.7, z)
      b.block('ghStone', 0.55, 0.3, 0.55, XW - 0.05, 3.25, z)
    }
    // pronaos west wall: door + painted panel (fresco)
    door(b, '-x', XP, 0, { w: 1.3, h: 2.4, y0: 0.7, leafKey: 'ghWood', frameKey: 'ghStone', frame: 0.18 })
    b.add('ghFresco', metricBox(0.02, 3.0, 6.4), mat(XP - 0.02, 3.4 + 1.5, 0))
    b.add('ghFresco', metricBox(0.02, 2.4, 2.2), mat(XP - 0.02, 0.7 + 1.2, -2.2))
    b.add('ghFresco', metricBox(0.02, 2.4, 2.2), mat(XP - 0.02, 0.7 + 1.2, 2.2))
    // steps
    b.block('ghSocle', 0.9, 0.35, 2.4, XW - 0.45, 0, 0)
  }

  /* ================= roof (natural titanium-zinc) ================= */
  const xr0 = XW - OV + (HW + OV) // west hip ridge start
  const xa = ALT[2][0] - HW // altar apse apex (same pitch on the east facet)
  const xL = LAT.xc
  const zE = HW + OV
  // main slopes (south/north) from the west hip to the altar apse
  for (const s of [-1, 1]) {
    facet(b, ROOF, [V(XW - OV, YE, s * zE), V(ALT[0][0], YE, s * zE), V(xa, RIDGE, 0), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
  }
  // west hip
  facet(b, ROOF, [V(XW - OV, YE, -zE), V(XW - OV, YE, zE), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.1 })
  // altar apse fan
  // outline indices 8..11 = ALT[1] north, ALT[2] north, ALT[2] south, ALT[1] south
  const offA = offsetPoly(out, OV)
  const apseRing: THREE.Vector3[] = [V(ALT[0][0], YE, -zE)]
  for (const i of [8, 9, 10, 11]) apseRing.push(V(offA[i][0], YE, offA[i][1]))
  apseRing.push(V(ALT[0][0], YE, zE))
  const apex = V(xa, RIDGE, 0)
  for (let i = 0; i < apseRing.length - 1; i++) facet(b, ROOF, [apseRing[i], apseRing[i + 1], apex], { seams: SEAM, thickness: 0.1 })
  for (let i = 1; i < apseRing.length - 1; i++) b.beam(ROOF, apseRing[i].clone().setY(YE + 0.05), apex.clone().setY(RIDGE + 0.05), 0.2, 0.1)
  // lateral apse cross-hips (fan to the ridge above the apse centre)
  const offAll = offsetPoly(out, OV)
  for (const s of [-1, 1]) {
    const pts = latPts(s)
    // outline indices: north apse 1..6 (west→east), south apse 13..18 (east→west)
    const idx = s < 0 ? [2, 3, 4, 5] : [17, 16, 15, 14]
    const ring = [V(pts[0][0] - 0.25, YE, s * zE)]
    for (const i of idx) ring.push(V(offAll[i][0], YE, offAll[i][1]))
    ring.push(V(pts[5][0] + 0.25, YE, s * zE))
    const ap = V(xL, RIDGE, 0)
    for (let i = 0; i < ring.length - 1; i++) facet(b, ROOF, [ring[i], ring[i + 1], ap], { seams: SEAM, thickness: 0.1 })
    for (let i = 1; i < ring.length - 1; i++) b.beam(ROOF, ring[i].clone().setY(YE + 0.05), ap.clone().setY(RIDGE + 0.05), 0.2, 0.1)
    for (let i = 0; i < ring.length - 1; i++) b.beam(ROOF, ring[i].clone().setY(YE - 0.1), ring[i + 1].clone().setY(YE - 0.1), 0.16, 0.16)
  }
  // ridge, hips, gutters
  b.beam(ROOF, V(xr0, RIDGE + 0.06, 0), V(xa, RIDGE + 0.06, 0), 0.26, 0.14)
  for (const s of [-1, 1]) {
    b.beam(ROOF, V(XW - OV, YE + 0.05, s * zE), V(xr0, RIDGE + 0.05, 0), 0.22, 0.12)
    b.beam(ROOF, V(XW - OV, YE - 0.1, s * zE), V(ALT[0][0], YE - 0.1, s * zE), 0.16, 0.16)
  }
  b.beam(ROOF, V(XW - OV, YE - 0.1, -zE), V(XW - OV, YE - 0.1, zE), 0.16, 0.16)
  for (let i = 0; i < apseRing.length - 1; i++) b.beam(ROOF, apseRing[i].clone().setY(YE - 0.1), apseRing[i + 1].clone().setY(YE - 0.1), 0.16, 0.16)
  // downpipes
  for (const [x, z] of [
    [XW + 0.15, HW + 0.12],
    [XW + 0.15, -HW - 0.12],
    [-2.3, HW + 0.12],
    [-2.3, -HW - 0.12],
    [6.6, HW + 0.12],
    [6.6, -HW - 0.12],
  ]) b.rod(ROOF, V(x, 0.3, z), V(x, YE - 0.1, z), 0.055, 8)

  /* ================= tower over the naos ================= */
  {
    const tx = xL
    const R = 2.0 // octagon circumradius of the drum
    const ph = Math.PI / 8
    const y0 = RIDGE - 1.0
    const yS = RIDGE + 0.4 // top of the low square socle
    const yD = yS + 4.2 // top of the drum
    // square socle with a small cornice and a zinc weathering
    b.block('ghWall', 3.9, yS - y0, 3.9, tx, y0, 0)
    b.add(ROOF, new THREE.CylinderGeometry(R + 0.05, 2.85, 0.3, 4, 1, false, Math.PI / 4), mat(tx, yS + 0.1, 0))
    // octagonal drum
    const drum = new THREE.CylinderGeometry(R, R, yD - yS, 8, 1, false, ph)
    b.add('ghWall', drum, mat(tx, (yS + yD) / 2, 0))
    // drum mouldings: base band, impost band, cornice with dentils
    b.add('ghStucco', new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.3, 8, 1, false, ph), mat(tx, yS + 0.3, 0))
    b.add('ghStucco', new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.12, 8, 1, false, ph), mat(tx, yS + 2.6, 0))
    b.add('ghStucco', new THREE.CylinderGeometry(R + 0.3, R + 0.15, 0.35, 8, 1, false, ph), mat(tx, yD - 0.15, 0))
    // arched windows with archivolts on the 8 faces
    const apo = R * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const ry = Math.PI / 2 - a
      const m = mat(tx + Math.cos(a) * apo, 0, Math.sin(a) * apo, ry)
      archWindow(b, m, 0.5, 1.75, yS + 0.75)
      // second, outer archivolt
      const o = new THREE.Shape()
      o.absarc(0, yS + 2.25, 0.62, 0, Math.PI, false)
      o.absarc(0, yS + 2.25, 0.5, Math.PI, 0, true)
      b.add('ghStucco', extrude(o, 0.08, 10), M(m, mat(0, 0, 0.02)))
    }
    // octagonal tent helm with flared eave (titanium-zinc)
    const ov = 0.45
    const hh = 2.6
    const ring: THREE.Vector3[] = []
    for (let k = 0; k < 8; k++) {
      const a = ph + (k / 8) * Math.PI * 2
      ring.push(V(tx + Math.cos(a) * (R + 0.3 + ov), yD - 0.12, Math.sin(a) * (R + 0.3 + ov)))
    }
    const mid: THREE.Vector3[] = ring.map((p) => V(tx + (p.x - tx) * 0.78, yD + 0.35, p.z * 0.78))
    const top = V(tx, yD + hh, 0)
    for (let k = 0; k < 8; k++) {
      const a = ring[k]
      const c = ring[(k + 1) % 8]
      facet(b, ROOF, [a, c, mid[(k + 1) % 8], mid[k]], { thickness: 0.06 })
      facet(b, ROOF, [mid[k], mid[(k + 1) % 8], top], { seams: seams(ROOF, 0.45, 0.04, 0.04), thickness: 0.06 })
      b.beam(ROOF, mid[k], top, 0.1, 0.08)
      b.beam(ROOF, a, mid[k], 0.1, 0.08)
    }
    // ball and wrought cross
    b.add('ghIron', new THREE.SphereGeometry(0.2, 12, 8), mat(tx, top.y + 0.15, 0))
    b.rod('ghIron', V(tx, top.y, 0), V(tx, top.y + 1.7, 0), 0.04, 6)
    b.box('ghIron', 0.9, 0.06, 0.06, tx, top.y + 1.25, 0, Math.PI / 2)
    b.add('ghIron', new THREE.TorusGeometry(0.22, 0.025, 6, 16), mat(tx, top.y + 1.25, 0, Math.PI / 2))
    for (const dy of [0.45, -0.4]) b.add('ghIron', new THREE.TorusGeometry(0.1, 0.02, 6, 12), mat(tx, top.y + 1.25 + dy, 0, Math.PI / 2))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2.5, 9.0, 2.5],
  materials: () => ({
    ghWall: new THREE.MeshStandardMaterial({ color: '#e6e0d3', roughness: 0.92 }),
    ghStucco: new THREE.MeshStandardMaterial({ color: '#f8f6f0', roughness: 0.85 }),
    ghSocle: new THREE.MeshStandardMaterial({ color: '#cfc8ba', roughness: 0.92 }),
    ghStone: new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.8 }),
    ghWood: new THREE.MeshStandardMaterial({ color: '#4a3326', roughness: 0.7 }),
    ghIron: new THREE.MeshStandardMaterial({ color: '#d8d4c8', roughness: 0.4, metalness: 0.6 }),
    ghFresco: new THREE.MeshStandardMaterial({ color: '#a88a5e', roughness: 0.9 }),
  }),
  notes:
    'Trefoil Wallachian church with an open west porch and one octagonal tower over the naos; roof and tower helm shown in natural titanium-zinc standing seam (register 2022), the photographs predate the works.',
}
export default model
