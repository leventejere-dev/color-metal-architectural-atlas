/**
 * Mănăstirea Ciolanu (Haleș, Tisău, Buzău) — main church of the monastery, the large
 * triconch church with the open arcaded west porch, twin west towers and a naos tower.
 * The records do not say which monastery building received the titanium-zinc; this
 * model shows the main church (OSM way 183224244, the candidate named in the research
 * record) with its roof, tower helms and gutters in natural titanium-zinc.
 *
 * Modelling specification (real metres; origin = outline centre at ground):
 *  - Axis: OSM way 183224244 (30.7 × 19.0 m) runs at 86.1°; +X points east to the
 *    polygonal altar apse, the arcaded porch faces west (−X), +Z = 176° (south).
 *  - Plan after the outline: porch + pronaos 14.6 m long and 14.8 m wide; naos with
 *    shallow segmental lateral apses (overall width 19 m); narrower altar apse (6.9 m)
 *    with a semicircular end.
 *  - Porch (photos 02, 06): five round arches on Tuscan columns (paired at the
 *    corners, side arcades), string course, a high frieze with six mosaic medallions
 *    and a central icon panel, deep eave; walls ≈ 8 m, white plaster on a stone socle.
 *  - Low hipped roof (≈ 22°) over the whole west body with a raised "eyebrow" over the
 *    central icon; fan roofs over the lateral apses and a half-cone over the altar.
 *  - Twin west towers (≈ 3.4 m square, chamfered with corner colonnettes, blind arched
 *    panels, ornamental frieze) with octagonal flared bell helms, small lanterns,
 *    onion knobs and crosses (≈ 21.5 m); the tower shafts are sheet-clad (grey-blue)
 *    as photographed.
 *  - Larger octagonal naos tower behind them with a bulbous helm (≈ 23 m) (photo 05).
 * Approximations: heights scaled from the porch (column ≈ 2.7 m) and the outline
 * width; side and east elevations are not photographed and are interpreted (windows,
 * apse shapes after the outline); medallions simplified to coloured discs.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, polyRing, helm, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const WALL = 'cnWall'
const DECO = 'cnDeco'
const CLAD = 'cnClad'
const SEAM = seams(ZN, 0.6, 0.05, 0.045)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const at = (x: number, z: number, a: number) => mat(x, 0, z, Math.atan2(Math.cos(a), Math.sin(a)))

/* plan */
const XW = -15.3 // porch front
const XP = -11.6 // pronaos west wall (back of the porch)
const XN = -0.7 // naos (lateral apses) start
const XE = 10.2 // lateral apses end
const XS = 10.9 // east wall of the naos / altar start
const HW = 7.38 // half width of the west body
const LAT = { cx: (XN + XE) / 2, bulge: 2.1 } // segmental lateral apses
const ALT = { cx: 12.0, r: 3.45 }

/* heights */
const SOCLE = 0.6
const H = 8.0
const PITCH = 22
const T = Math.tan(PITCH * D2R)
const OV = 0.85
const LIFT = 0.25
const EAVE = H + LIFT - OV * T
const RIDGE = EAVE + (HW + OV) * T

const latR = () => {
  const c = (XE - XN) / 2
  return (c * c + LAT.bulge * LAT.bulge) / (2 * LAT.bulge)
}

/** Closed wall outline behind the porch (CCW from +X towards +Z), grown by g. */
function outline(y: number, g = 0): THREE.Vector3[] {
  const p: THREE.Vector3[] = []
  const n = 10
  const ra = ALT.r + g
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    p.push(V(ALT.cx + Math.cos(a) * ra, y, Math.sin(a) * ra))
  }
  const R0 = latR()
  const R = R0 + g
  const a0 = Math.asin((XE - XN) / 2 / R0)
  const zc = HW + LAT.bulge - R0 // lobe centre offset (|z|)
  // south side: step out, lobe from east to west, pronaos wall
  p.push(V(XS + g, y, ra), V(XS + g, y, HW + g))
  for (let i = 0; i <= n; i++) {
    const t = a0 - (2 * a0 * i) / n
    p.push(V(LAT.cx + Math.sin(t) * R, y, zc + Math.cos(t) * R))
  }
  p.push(V(XP - g, y, HW + g), V(XP - g, y, -HW - g))
  // north side: lobe from west to east, step in to the altar
  for (let i = 0; i <= n; i++) {
    const t = -a0 + (2 * a0 * i) / n
    p.push(V(LAT.cx + Math.sin(t) * R, y, -zc - Math.cos(t) * R))
  }
  p.push(V(XS + g, y, -HW - g), V(XS + g, y, -ra))
  return p
}

function archWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.02)))
  b.add(DECO, extrude(frameShape('round', w, h, 0.18, 0, y0), 0.1), m)
  b.add(DECO, metricBox(w + 0.5, 0.12, 0.25), M(m, mat(0, y0 - 0.1, 0.1)))
}

/** Twin-tower shaft: chamfered square with colonnettes, panels, frieze, cornice, helm. */
function twinTower(b: Builder, cx: number, cz: number) {
  const hw = 1.7
  const c = 0.35
  const ring = (h: number, y: number, cc = c) => [V(cx + h, y, cz - h + cc), V(cx + h, y, cz + h - cc), V(cx + h - cc, y, cz + h), V(cx - h + cc, y, cz + h), V(cx - h, y, cz + h - cc), V(cx - h, y, cz - h + cc), V(cx - h + cc, y, cz - h), V(cx + h - cc, y, cz - h)]
  const y0 = 9.0
  const y1 = 16.2
  b.add(CLAD, loft([ring(hw, y0), ring(hw, y1)], { capTop: true, flat: true }))
  // colonnettes on the chamfers
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = cx + sx * (hw - c / 2)
    const z = cz + sz * (hw - c / 2)
    b.add(DECO, new THREE.CylinderGeometry(0.13, 0.13, y1 - y0 - 0.6, 10), mat(x, (y0 + y1) / 2 - 0.3, z))
    b.add(DECO, metricBox(0.36, 0.2, 0.36), mat(x, y1 - 0.75, z))
  }
  // blind arched panels and a lozenge ornament on each face
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = Math.atan2(nz, nx)
    const m = at(cx + nx * hw, cz + nz * hw, a)
    b.add(DECO, extrude(frameShape('round', 0.9, 3.4, 0.12, 0, 11.2), 0.08), m)
    b.add('cnShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 3.4, 0, 11.2, 10))), M(m, mat(0, 0, 0.01)))
    for (const u of [-0.6, 0.6]) b.add(DECO, metricBox(0.4, 0.4, 0.06), M(m, mat(u, 15.6, 0.04, 0, 0, Math.PI / 4)))
    b.add(DECO, metricBox(0.3, 0.3, 0.06), M(m, mat(0, 15.6, 0.04, 0, 0, Math.PI / 4)))
  }
  // cornice
  b.add(DECO, loft([ring(hw + 0.05, y1 - 0.25, c), ring(hw + 0.3, y1 - 0.05, c), ring(hw + 0.42, y1 + 0.12, c)], { capTop: true, capBottom: true, flat: true }))
  // octagonal flared bell helm, lantern, onion knob, cross
  const k = 1 / Math.cos(Math.PI / 8)
  const yh = y1 + 0.12
  const st = (r: number, y: number) => [r * k, yh + y] as [number, number]
  helm(b, ZN, { x: cx, z: cz, n: 8, stations: [st(2.05, 0), st(2.0, 0.12), st(1.62, 0.45), st(1.36, 0.85), st(1.2, 1.3), st(0.98, 1.7), st(0.6, 1.95)] })
  const ribs = (rs: [number, number][]) => {
    for (let i = 0; i < rs.length - 1; i++) {
      const r0 = polyRing(8, rs[i][0] + 0.02, rs[i][1], Math.PI / 8, cx, cz)
      const r1 = polyRing(8, rs[i + 1][0] + 0.02, rs[i + 1][1], Math.PI / 8, cx, cz)
      for (let j = 0; j < 8; j++) b.beam(ZN, r0[j], r1[j], 0.06, 0.05)
    }
  }
  ribs([st(2.05, 0), st(2.0, 0.12), st(1.62, 0.45), st(1.36, 0.85), st(1.2, 1.3), st(0.98, 1.7), st(0.6, 1.95)])
  b.add(CLAD, loft([polyRing(8, 0.55 * k, yh + 1.95, Math.PI / 8, cx, cz), polyRing(8, 0.55 * k, yh + 2.55, Math.PI / 8, cx, cz)], { flat: true }))
  helm(b, ZN, { x: cx, z: cz, n: 8, stations: [st(0.72, 2.55), st(0.74, 2.68), st(0.62, 2.75), st(0.7, 2.95), st(0.52, 3.22), st(0.2, 3.42), st(0.05, 3.55)] })
  b.add(ZN, new THREE.SphereGeometry(0.2, 12, 8), mat(cx, yh + 3.7, cz))
  cross(b, 'cnCross', cx, yh + 3.8, cz, 1.5, false, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= body ================= */
  b.add(WALL, loft([outline(0), outline(H)], { capTop: true }))
  b.add('cnSocle', loft([outline(0, 0.1), outline(SOCLE, 0.1)], { capTop: true }))
  b.add(DECO, loft([outline(H - 0.45, 0.06), outline(H - 0.2, 0.2), outline(H, 0.3)], { capTop: true, capBottom: true }))
  b.add(DECO, loft([outline(5.0, 0.05), outline(5.25, 0.05)], { capTop: true, capBottom: true }))

  /* ================= porch ================= */
  {
    const d = XP - XW
    const cxp = (XW + XP) / 2
    // platform with steps
    b.block('cnSocle', d + 0.4, SOCLE, 2 * HW + 0.4, cxp, 0, 0)
    for (let i = 0; i < 3; i++) b.block('cnSocle', 0.4, SOCLE * (1 - (i + 1) / 4), 3.2, XW - 0.2 - i * 0.4, 0, 0)
    // upper wall band carried by the arcades (front + sides)
    const yA = 5.0 // top of the arcade zone (string course)
    b.block(WALL, 0.6, H - yA, 2 * HW, XW + 0.3, yA, 0)
    for (const s of [1, -1]) b.block(WALL, d, H - yA, 0.6, cxp, yA, s * (HW - 0.3))
    b.block(DECO, 0.75, 0.3, 2 * HW + 0.3, XW + 0.3, yA - 0.05, 0)
    for (const s of [1, -1]) b.block(DECO, d + 0.15, 0.3, 0.75, cxp, yA - 0.05, s * (HW - 0.3))
    // front arcade: 5 arches between paired corner columns
    const colH = 2.75
    const yb = SOCLE
    const span = (2 * HW - 1.2) / 5
    const front = at(XW + 0.3, 0, Math.PI)
    for (let i = 0; i <= 5; i++) {
      const u = -HW + 0.6 + i * span
      const xs = [XW + 0.05]
      if (i === 0 || i === 5) xs.push(XW + 1.0)
      for (const x of xs) {
        b.add(DECO, new THREE.CylinderGeometry(0.24, 0.28, colH, 16), mat(x, yb + 0.25 + colH / 2, -u))
        b.block(DECO, 0.7, 0.25, 0.7, x, yb, -u)
        b.block(DECO, 0.72, 0.28, 0.72, x, yb + 0.25 + colH, -u)
      }
    }
    // arcade walls (piers + round arches), front and sides; engaged columns in front
    const ySp = yb + 0.53 + colH // springing
    const arcade = (m: THREE.Matrix4, L: number, n: number, edge: number) => {
      const s = new THREE.Shape([new THREE.Vector2(-L / 2, SOCLE), new THREE.Vector2(L / 2, SOCLE), new THREE.Vector2(L / 2, 5.0), new THREE.Vector2(-L / 2, 5.0)])
      const sp = (L - 2 * edge) / n
      const w = sp - 0.62
      for (let i = 0; i < n; i++) {
        const u = -L / 2 + edge + (i + 0.5) * sp
        s.holes.push(new THREE.Path(opening('round', w, ySp - (SOCLE + 0.03) + w / 2, u, SOCLE + 0.03, 12)))
      }
      b.add(WALL, extrude(s, 0.5), M(m, mat(0, 0, -0.3)))
      for (let i = 0; i < n; i++) {
        const u = -L / 2 + edge + (i + 0.5) * sp
        b.add(DECO, extrude(frameShape('round', w, ySp - SOCLE + w / 2, 0.15, u, SOCLE), 0.08), M(m, mat(0, 0, 0.2)))
      }
    }
    arcade(front, 2 * HW, 5, 0.6)
    for (const sgn of [1, -1]) arcade(at(cxp, sgn * (HW - 0.3), sgn > 0 ? Math.PI / 2 : -Math.PI / 2), d, 2, 0.5)
    for (const sgn of [1, -1]) {
      const xm = cxp + 0.05
      b.add(DECO, new THREE.CylinderGeometry(0.24, 0.28, colH, 16), mat(xm, yb + 0.25 + colH / 2, sgn * (HW - 0.05)))
      b.block(DECO, 0.7, 0.25, 0.7, xm, yb, sgn * (HW - 0.05))
      b.block(DECO, 0.72, 0.28, 0.72, xm, yb + 0.25 + colH, sgn * (HW - 0.05))
    }
    // porch ceiling and dark painted back wall
    b.block('cnShadow', d - 0.6, 0.2, 2 * HW - 1.2, cxp + 0.3, 4.6, 0)
    b.add('cnFresco', metricBox(0.05, 4.0, 2 * HW - 1.4), mat(XP - 0.03, SOCLE + 2.0, 0))
    b.add('black', metricBox(0.06, 2.4, 1.4), mat(XP - 0.06, SOCLE + 1.2, 0))
    // medallion frieze: six medallions and a central icon panel (photos 02, 06)
    for (let i = 0; i < 7; i++) {
      const u = -HW + 1.1 + i * ((2 * HW - 2.2) / 6)
      if (i === 3) {
        b.add(DECO, metricBox(2.0, 1.45, 0.08), M(front, mat(u, 6.55, 0.36)))
        b.add('cnIcon', metricBox(1.8, 1.25, 0.04), M(front, mat(u, 6.55, 0.41)))
      } else {
        b.add(DECO, new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), M(front, mat(u, 6.55, 0.36, 0, Math.PI / 2, 0, 0.82, 1, 1.15)))
        b.add('cnIcon', new THREE.CylinderGeometry(0.52, 0.52, 0.04, 20), M(front, mat(u, 6.55, 0.41, 0, Math.PI / 2, 0, 0.82, 1, 1.15)))
      }
    }
    // porch cornice
    b.block(DECO, 0.95, 0.25, 2 * HW + 0.6, XW + 0.2, H - 0.25, 0)
    for (const s of [1, -1]) b.block(DECO, d + 0.6, 0.25, 0.95, cxp, H - 0.25, s * (HW - 0.2))
  }

  /* ================= windows (interpreted) ================= */
  for (const s of [1, -1]) {
    const a = s > 0 ? Math.PI / 2 : -Math.PI / 2
    for (const x of [-8.6, -4.0]) archWindow(b, at(x, s * HW, a), 1.1, 2.4, 2.2)
    const R = latR()
    const zc = s * (HW + LAT.bulge - R)
    for (const t of [-0.32, 0, 0.32]) {
      const x = LAT.cx + Math.sin(t) * R
      const z = zc + s * Math.cos(t) * R
      archWindow(b, at(x, z, Math.atan2(s * Math.cos(t), Math.sin(t))), 1.1, 2.6, 2.2)
    }
  }
  for (const a of [-0.6, 0, 0.6]) archWindow(b, at(ALT.cx + Math.cos(a) * ALT.r, Math.sin(a) * ALT.r, a), 0.8, 2.0, 2.6)

  /* ================= roofs ================= */
  {
    const hw = HW + OV
    const xw = XW - OV
    const xe = XS + OV * 0.2
    const r0 = xw + hw
    const r1 = xe - hw
    facet(b, ZN, [V(xw, EAVE, hw), V(xe, EAVE, hw), V(r1, RIDGE, 0), V(r0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ZN, [V(xe, EAVE, -hw), V(xw, EAVE, -hw), V(r0, RIDGE, 0), V(r1, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ZN, [V(xw, EAVE, -hw), V(xw, EAVE, hw), V(r0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ZN, [V(xe, EAVE, hw), V(xe, EAVE, -hw), V(r1, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ZN, V(r0, RIDGE + 0.06, 0), V(r1, RIDGE + 0.06, 0), 0.22, 0.1)
    for (const [p, q] of [[V(xw, EAVE, hw), V(r0, RIDGE, 0)], [V(xw, EAVE, -hw), V(r0, RIDGE, 0)], [V(xe, EAVE, hw), V(r1, RIDGE, 0)], [V(xe, EAVE, -hw), V(r1, RIDGE, 0)]]) b.beam(ZN, p.clone().setY(p.y + 0.05), q.clone().setY(q.y + 0.05), 0.18, 0.08)
    // "eyebrow" over the central icon panel of the porch front
    {
      const n = 10
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const z = -1.6 + 3.2 * t
        pts.push(V(xw + 0.02, EAVE + 0.55 * Math.sin(Math.PI * t), z))
      }
      for (let i = 0; i < n; i++) facet(b, ZN, [pts[i], pts[i + 1], V(xw + 1.6, EAVE + 0.65 * T * 2.4, 0)], { thickness: 0.06 })
      {
        const lun = new THREE.Shape()
        lun.moveTo(-1.5, 0)
        for (let i = 0; i <= 12; i++) lun.lineTo(-1.5 + (3 * i) / 12, 0.5 * Math.sin((Math.PI * i) / 12))
        b.add('cnIcon', new THREE.ShapeGeometry(lun), mat(XW + 0.25, H - 0.02, 0, -Math.PI / 2))
        b.add(WALL, extrude(lun, 0.5), mat(XW + 0.25, H - 0.02, 0, Math.PI / 2))
      }
    }
    // fan roofs over the lateral apses (to the ridge)
    const R = latR()
    const half = (XE - XN) / 2
    const a0 = Math.asin(half / R)
    for (const s of [1, -1]) {
      const zc = s * (HW + LAT.bulge - R)
      const apex = V(LAT.cx, RIDGE - 0.03, 0)
      const n = 14
      const arc: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const t = -a0 - 0.05 + ((2 * a0 + 0.1) * i) / n
        arc.push(V(LAT.cx + Math.sin(t) * (R + OV), EAVE, zc + s * Math.cos(t) * (R + OV)))
      }
      for (let i = 0; i < n; i++) facet(b, ZN, [arc[i], arc[i + 1], apex], { seams: SEAM, thickness: 0.1 })
      for (let i = 0; i < n; i++) b.beam(ZN, arc[i].clone().setY(EAVE - 0.06), arc[i + 1].clone().setY(EAVE - 0.06), 0.15, 0.14)
    }
    // altar apse: short ridge from the east hip + half cone
    {
      const ra = ALT.r + OV
      const ya = EAVE + ra * T
      const apex = V(ALT.cx, ya, 0)
      const xin = xe - (RIDGE - ya) / T
      facet(b, ZN, [V(xin, EAVE, ra), V(ALT.cx, EAVE, ra), apex, V(xin, ya, 0)], { seams: SEAM, thickness: 0.1 })
      facet(b, ZN, [V(ALT.cx, EAVE, -ra), V(xin, EAVE, -ra), V(xin, ya, 0), apex], { seams: SEAM, thickness: 0.1 })
      const n = 12
      const arc: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI
        arc.push(V(ALT.cx + Math.cos(a) * ra, EAVE, Math.sin(a) * ra))
      }
      for (let i = 0; i < n; i++) facet(b, ZN, [arc[i], arc[i + 1], apex], { seams: SEAM, thickness: 0.1 })
      for (let i = 0; i < n; i++) b.beam(ZN, arc[i].clone().setY(EAVE - 0.06), arc[i + 1].clone().setY(EAVE - 0.06), 0.15, 0.14)
    }
    // titanium-zinc eave gutters along the west body
    for (const [p, q] of [[V(xw, EAVE - 0.06, hw), V(xe, EAVE - 0.06, hw)], [V(xw, EAVE - 0.06, -hw), V(xe, EAVE - 0.06, -hw)], [V(xw, EAVE - 0.06, -hw), V(xw, EAVE - 0.06, hw)]]) b.beam(ZN, p, q, 0.16, 0.15)
    for (const [x, z] of [[XW - 0.2, HW + 0.2], [XW - 0.2, -HW - 0.2], [XP + 0.3, HW + 0.15], [XP + 0.3, -HW - 0.15]]) b.rod(ZN, V(x, 0.3, z), V(x, EAVE - 0.1, z), 0.055, 8)
  }

  /* ================= towers ================= */
  twinTower(b, -9.4, 2.05)
  twinTower(b, -9.4, -2.05)
  {
    // octagonal naos tower
    const cx = LAT.cx
    const k = 1 / Math.cos(Math.PI / 8)
    const ap = 2.5
    const y0 = 9.5
    const y1 = 16.4
    b.add(CLAD, loft([polyRing(8, ap * k, y0, Math.PI / 8, cx, 0), polyRing(8, ap * k, y1, Math.PI / 8, cx, 0)], { capTop: true, flat: true }))
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2
      const m = at(cx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      b.add(DECO, extrude(frameShape('round', 0.95, 3.6, 0.12, 0, 11.6), 0.08), m)
      b.add(j % 2 === 0 ? 'glassC' : 'cnShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.95, 3.6, 0, 11.6, 10))), M(m, mat(0, 0, 0.01)))
      const ac = a + Math.PI / 8
      b.add(DECO, new THREE.CylinderGeometry(0.12, 0.12, y1 - y0 - 0.8, 8), mat(cx + Math.cos(ac) * (ap * k + 0.02), (y0 + y1) / 2 - 0.4, Math.sin(ac) * (ap * k + 0.02)))
    }
    b.add(DECO, loft([polyRing(8, (ap + 0.05) * k, y1 - 0.25, Math.PI / 8, cx, 0), polyRing(8, (ap + 0.32) * k, y1 - 0.05, Math.PI / 8, cx, 0), polyRing(8, (ap + 0.45) * k, y1 + 0.12, Math.PI / 8, cx, 0)], { capTop: true, capBottom: true, flat: true }))
    const yh = y1 + 0.12
    const st = (r: number, y: number) => [r * k, yh + y] as [number, number]
    const bell = [st(2.9, 0), st(2.85, 0.15), st(2.45, 0.55), st(2.3, 1.05), st(2.15, 1.6), st(1.55, 2.25), st(0.75, 2.6)]
    helm(b, ZN, { x: cx, z: 0, n: 8, stations: bell })
    for (let i = 0; i < bell.length - 1; i++) {
      const r0 = polyRing(8, bell[i][0] + 0.02, bell[i][1], Math.PI / 8, cx, 0)
      const r1 = polyRing(8, bell[i + 1][0] + 0.02, bell[i + 1][1], Math.PI / 8, cx, 0)
      for (let j = 0; j < 8; j++) b.beam(ZN, r0[j], r1[j], 0.07, 0.06)
    }
    b.add(CLAD, loft([polyRing(8, 0.7 * k, yh + 2.6, Math.PI / 8, cx, 0), polyRing(8, 0.7 * k, yh + 3.3, Math.PI / 8, cx, 0)], { flat: true }))
    helm(b, ZN, { x: cx, z: 0, n: 8, stations: [st(0.9, 3.3), st(0.92, 3.42), st(0.8, 3.5), st(0.92, 3.8), st(0.66, 4.15), st(0.25, 4.4), st(0.05, 4.55)] })
    b.add(ZN, new THREE.SphereGeometry(0.22, 12, 8), mat(cx, yh + 4.7, 0))
    cross(b, 'cnCross', cx, yh + 4.82, 0, 1.6, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-6.0, 10.6, 4.0],
  materials: (base) => {
    const clad = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    // grey-blue painted sheet cladding of the tower shafts (as photographed)
    clad.color.setRGB(0.95, 1.0, 1.08)
    clad.metalness = 0.35
    clad.roughness = 0.6
    return {
      cnWall: new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.9 }),
      cnDeco: new THREE.MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.85 }),
      cnShadow: new THREE.MeshStandardMaterial({ color: '#c9c6bd', roughness: 0.9 }),
      cnSocle: new THREE.MeshStandardMaterial({ color: '#bdb6a6', roughness: 0.9 }),
      cnFresco: new THREE.MeshStandardMaterial({ color: '#5d6f86', roughness: 0.85 }),
      cnIcon: new THREE.MeshStandardMaterial({ color: '#4f78a8', roughness: 0.6 }),
      cnCross: new THREE.MeshStandardMaterial({ color: '#3a3330', roughness: 0.5, metalness: 0.5 }),
      cnClad: clad,
    }
  },
  notes:
    'Main church of Ciolanu Monastery: arcaded porch with medallion frieze, low hipped roof, twin west towers and an octagonal naos tower; roof, helms and gutters shown in natural titanium-zinc; side and east elevations interpreted.',
}
export default model
