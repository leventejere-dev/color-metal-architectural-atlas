/**
 * Mănăstirea «Buna Vestire» Pătrângeni (Negraia), Zlatna (Alba) — the monastery
 * church: white single-nave church with an open arcaded west porch, a tower over the
 * pronaos and a polygonal altar end under one continuous hipped roof.
 *
 * Modelling specification (real metres; origin = OSM outline centre at ground):
 *  - Axis: OSM way 289907743 (25.9 × 9.8 m) runs at 62.7°; its polygonal end lies at
 *    the ENE, so +X = 62.7° towards the altar, the porch faces −X (front = [−1, 0]),
 *    +Z = 152.7°.
 *  - Plan after the outline (symmetrised — the trace is slightly skewed): open porch
 *    4.3 m deep, pronaos + naos 16.3 m, five-sided altar end 5.3 m deep; width 9.5 m.
 *  - Heights scaled from the July 2023 drone photos (wall height as the module, porch
 *    arcade ≈ 4.5 m): plinth 0.6 m, eave ≈ 6.0 m, roof ≈ 38°, ridge ≈ 9.9 m.
 *  - Porch: three round arches on the west front (wider central entrance arch) and two
 *    on each side on white piers with parapets; pilaster strips and small arched
 *    windows high on the side walls; string course.
 *  - Tower over the pronaos (≈ 4.6 m square) rising ≈ 4 m above the ridge, flared
 *    skirt roof, octagonal drum with arched windows, bulbous helm, lantern, small onion
 *    and cross (≈ 23 m).
 *  - METAL (as photographed, July 2023): the nave roof reads light orange-brown, about
 *    a year after the copper supplied by COLOR METAL according to its records (2022),
 *    and is shown as standing-seam copper (0.5 m); the tower skirt and helm read
 *    silver-grey and are shown as light grey sheet metal, as photographed.
 * Approximations: only drone views at small scale exist — window counts, porch arcade
 * details, the north side and the drum/helm profile are interpreted; heights are
 * estimated (no published dimensions).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, lathe, seams, faceFrame, window_, cross, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'zlCu'
const SEAM = seams(CU, 0.5, 0.045, 0.04)
const GREY = 'helm'
const WALL = 'zlWall'
const TRIM = 'zlTrim'
const PLINTH = 'zlPlinth'

/* plan */
const XP = -12.9 // porch front
const XW = -8.6 // west wall of the pronaos (back of the porch)
const XA = 7.7 // start of the altar end
const HW = 4.75
const APSE_T = [90, 54, 18, -18, -54, -90]
const apsePt = (t: number, g = 0): [number, number] => [XA + (5.27 + g) * Math.cos(t * D2R), (HW + g) * Math.sin(t * D2R)]

/* heights */
const PL = 0.6
const EAVE = 6.0
const PITCH = 38
const T = Math.tan(PITCH * D2R)
const OV = 0.7
const TWR = { x: -6.6, hw: 2.3 }

function body(b: Builder, key: string, y0: number, y1: number, g = 0) {
  // nave + altar end as one convex prism (porch handled separately)
  const ring = (y: number) => {
    const pts = [V(XW - g, y, -HW - g)]
    for (const t of APSE_T.slice().reverse()) {
      const [x, z] = apsePt(t, g)
      pts.push(V(x, y, z))
    }
    pts.push(V(XW - g, y, HW + g))
    return pts
  }
  b.add(key, loft([ring(y0), ring(y1)], { capTop: true, capBottom: false, flat: true }))
}

function archWindow(b: Builder, m: THREE.Matrix4, y0: number, w: number, h: number) {
  b.add(TRIM, extrude(frameShape('round', w, h, 0.16, 0, y0), 0.08), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0))), M(m, mat(0, 0, 0.02)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= nave + altar end ================= */
  body(b, WALL, 0, EAVE)
  body(b, PLINTH, 0, PL, 0.08)
  body(b, TRIM, 2.85, 3.05, 0.06) // string course
  body(b, TRIM, EAVE - 0.5, EAVE - 0.12, 0.12) // eave cornice
  // west wall of the pronaos (inside the porch) with the portal
  {
    const m = mat(XW, 0, 0, -Math.PI / 2)
    b.add('zlDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 2.9, 0, PL))), M(m, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.6, 2.9, 0.25, 0, PL), 0.12), m)
    b.add('zlIcon', metricBox(1.0, 1.2, 0.06), M(m, mat(0, 4.4, 0.05)))
  }

  // pilaster strips + windows on the long sides
  for (const [face, plane] of [['+z', HW], ['-z', -HW]] as [Face, number][]) {
    const s = face === '+z' ? 1 : -1
    for (const x of [XW + 0.3, -3.6, 1.6, XA - 0.3]) {
      const m = faceFrame(face, plane, s * x, 0, 0)
      b.add(TRIM, metricBox(0.55, EAVE - PL - 0.4, 0.1), M(m, mat(0, PL + (EAVE - PL - 0.4) / 2, 0.05)))
    }
    for (const x of [-5.95, -1.0, 4.5]) archWindow(b, faceFrame(face, plane, s * x, 0, 0), 3.4, 0.85, 1.95)
  }
  // altar-end facets: narrow window on the three eastern facets
  for (let i = 1; i < 4; i++) {
    const [x0, z0] = apsePt(APSE_T[i])
    const [x1, z1] = apsePt(APSE_T[i + 1])
    const ry = Math.atan2(-(z1 - z0), x1 - x0)
    const m = mat((x0 + x1) / 2, 0, (z0 + z1) / 2, ry)
    archWindow(b, m, 3.4, 0.6, 1.6)
  }

  /* ================= open porch (west) ================= */
  {
    const x0 = XP
    const x1 = XW
    const cx = (x0 + x1) / 2
    const ya = 4.4 // top of the arcade wall zone starts above the arches
    // upper wall band of the porch (above the arches) on three sides
    b.block(WALL, x1 - x0, EAVE - ya, 2 * HW, cx, ya, 0)
    b.block(TRIM, x1 - x0 + 0.24, 0.38, 2 * HW + 0.24, cx, EAVE - 0.5, 0)
    b.block(PLINTH, x1 - x0 + 0.16, PL, 2 * HW + 0.16, cx, 0, 0) // porch floor
    // arcades: front (3 arches, central wider) and sides (2 arches)
    const arcade = (face: Face, plane: number, us: [number, number][], uC: number) => {
      // us: list of [uCentre, width] openings; piers fill the rest
      const m0 = faceFrame(face, plane, 0, 0, 0)
      const span = face === '-x' ? HW : (x1 - x0) / 2
      const sh = new THREE.Shape([new THREE.Vector2(-span, PL), new THREE.Vector2(span, PL), new THREE.Vector2(span, ya + 0.01), new THREE.Vector2(-span, ya + 0.01)])
      const oy = (w: number) => PL + (w > 2 ? 0 : 0.85)
      const oh = (w: number) => ya - 0.4 - oy(w)
      for (const [u, w] of us) sh.holes.push(new THREE.Path(opening('round', w, oh(w), u, oy(w), 12)))
      b.add(WALL, extrude(sh, 0.55), M(m0, mat(uC, 0, -0.55)))
      for (const [u, w] of us) {
        // arch moulding
        b.add(TRIM, extrude(frameShape('round', w, oh(w), 0.14, u + uC, oy(w)), 0.06), M(m0, mat(0, 0, 0.0)))
        if (w <= 2) b.add(TRIM, metricBox(w + 0.1, 0.12, 0.62), M(m0, mat(u + uC, PL + 0.85, -0.27)))
      }
    }
    arcade('-x', x0, [[-2.75, 1.9], [0, 2.4], [2.75, 1.9]], 0)
    arcade('+z', HW, [[-1.05, 1.6], [1.05, 1.6]], cx)
    arcade('-z', -HW, [[-1.05, 1.6], [1.05, 1.6]], -cx)
    // porch steps
    b.block(PLINTH, 3.2, 0.3, 0.6, x0 - 0.3, 0, 0)
  }

  /* ================= roof: one hipped roof over porch, nave and altar end ================= */
  {
    const eY = EAVE - OV * T
    const hwO = HW + OV
    const rY = EAVE + HW * T
    const xw = XP - OV
    const xr0 = xw + hwO
    const [xFace] = apsePt(18, OV)
    const xr1 = xFace - hwO
    const P = (t: number) => {
      const [x, z] = apsePt(t, OV)
      return V(x, eY, z)
    }
    const r0 = V(xr0, rY, 0)
    const r1 = V(xr1, rY, 0)
    const aS = P(90)
    const aN = P(-90)
    facet(b, CU, [V(xw, eY, hwO), aS, r1, r0], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [aN, V(xw, eY, -hwO), r0, r1], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xw, eY, -hwO), V(xw, eY, hwO), r0], { seams: SEAM, thickness: 0.12 })
    for (let i = 0; i < APSE_T.length - 1; i++) facet(b, CU, [P(APSE_T[i]), P(APSE_T[i + 1]), r1], { seams: SEAM, thickness: 0.12 })
    // ridge and hip rolls
    b.beam(CU, r0.clone().setY(rY + 0.05), r1.clone().setY(rY + 0.05), 0.24, 0.13)
    for (const p of [V(xw, eY, hwO), V(xw, eY, -hwO)]) b.beam(CU, p.clone().setY(p.y + 0.05), r0.clone().setY(rY + 0.05), 0.2, 0.11)
    for (const t of APSE_T) {
      const p = P(t)
      b.beam(CU, p.clone().setY(p.y + 0.05), r1.clone().setY(rY + 0.05), 0.2, 0.11)
    }
    // gutters
    const gutter = (a: THREE.Vector3, c: THREE.Vector3) => b.beam(CU, a.clone().setY(eY - 0.08), c.clone().setY(eY - 0.08), 0.16, 0.15)
    gutter(V(xw, eY, hwO), aS)
    gutter(V(xw, eY, -hwO), aN)
    for (let i = 0; i < APSE_T.length - 1; i++) gutter(P(APSE_T[i]), P(APSE_T[i + 1]))
    for (const [x, z] of [[XP + 0.2, HW + 0.25], [XP + 0.2, -HW - 0.25], [XA, HW + 0.25], [XA, -HW - 0.25]]) b.rod(CU, V(x, 0.2, z), V(x, eY - 0.1, z), 0.055, 8)
    // small cross on the altar end of the ridge
    cross(b, GREY, xr1, rY + 0.1, 0, 1.0, true, Math.PI / 2)
  }

  /* ================= tower over the pronaos ================= */
  {
    const tx = TWR.x
    const hw = TWR.hw
    const yTop = 13.2
    const y0 = EAVE - 0.4
    b.block(WALL, 2 * hw, yTop - y0, 2 * hw, tx, y0, 0)
    // corner pilasters and cornice
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) b.block(TRIM, 0.45, yTop - y0 - 0.4, 0.45, tx + sx * (hw - 0.15), y0, sz * (hw - 0.15))
    b.block(TRIM, 2 * hw + 0.35, 0.3, 2 * hw + 0.35, tx, yTop - 0.35, 0)
    // an arched window on each face above the roof
    for (const [face, plane, u0] of [['+z', hw, tx], ['-z', -hw, -tx], ['+x', tx + hw, 0], ['-x', tx - hw, 0]] as [Face, number, number][]) {
      window_(b, face, plane, u0, 10.6, { type: 'round', w: 0.8, h: 1.7, frame: 0.16, frameKey: TRIM, glassKey: 'glassC', inset: 0.03 })
    }
    // flared skirt roof (light grey sheet)
    const sk0 = polyRing(4, (hw + 0.65) * Math.SQRT2, yTop - 0.05, Math.PI / 4, tx, 0)
    const sk1 = polyRing(4, (hw - 0.55) * Math.SQRT2, yTop + 0.95, Math.PI / 4, tx, 0)
    for (let i = 0; i < 4; i++) facet(b, GREY, [sk0[i], sk0[(i + 1) % 4], sk1[(i + 1) % 4], sk1[i]], { seams: seams(GREY, 0.45, 0.03, 0.03), thickness: 0.06 })
    b.block(GREY, 2 * (hw - 0.55), 0.06, 2 * (hw - 0.55), tx, yTop + 0.9, 0)
    // octagonal drum
    const yd0 = yTop + 0.6
    const yd1 = yd0 + 1.8
    const rd = 1.55
    b.add(WALL, loft([polyRing(8, rd, yd0, Math.PI / 8, tx, 0), polyRing(8, rd, yd1, Math.PI / 8, tx, 0)], { capTop: true, flat: true }))
    b.add(TRIM, loft([polyRing(8, rd + 0.15, yd1 - 0.2, Math.PI / 8, tx, 0), polyRing(8, rd + 0.15, yd1, Math.PI / 8, tx, 0)], { capTop: true, capBottom: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1) / 8) * Math.PI * 2 // face centres of a polyRing with phase π/8
      const ap = rd * Math.cos(Math.PI / 8)
      const m = mat(tx + Math.cos(a) * ap, 0, Math.sin(a) * ap, Math.PI / 2 - a)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.45, 1.05, 0, yd0 + 0.4))), M(m, mat(0, 0, 0.02)))
    }
    // bulbous helm, lantern, small onion (light grey sheet)
    const yb = yd1
    const bulb: [number, number][] = [
      [rd + 0.15, 0],
      [rd + 0.45, 0.45],
      [rd + 0.5, 0.95],
      [rd + 0.3, 1.5],
      [1.3, 2.0],
      [0.78, 2.4],
      [0.52, 2.62],
      [0.48, 2.8],
    ]
    b.add(GREY, loft(bulb.map(([r, y]) => polyRing(8, r, yb + y, Math.PI / 8, tx, 0)), { capBottom: true }))
    const yl = yb + 2.8
    b.add(GREY, loft([polyRing(8, 0.5, yl, Math.PI / 8, tx, 0), polyRing(8, 0.5, yl + 0.9, Math.PI / 8, tx, 0)], { flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1) / 8) * Math.PI * 2 // face centres of a polyRing with phase π/8
      const ap = 0.5 * Math.cos(Math.PI / 8)
      b.add('black', metricBox(0.18, 0.5, 0.02), mat(tx + Math.cos(a) * (ap + 0.01), yl + 0.45, Math.sin(a) * (ap + 0.01), Math.PI / 2 - a))
    }
    const on: [number, number][] = [
      [0.62, 0],
      [0.68, 0.25],
      [0.55, 0.55],
      [0.3, 0.8],
      [0.1, 1.0],
      [0.04, 1.15],
    ]
    b.add(GREY, lathe(on, 16), mat(tx, yl + 0.9, 0))
    cross(b, GREY, tx, yl + 2.0, 0, 1.6, true, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2, 8.0, 3.2],
  materials: (base) => {
    const cu = (base.copperNew as THREE.MeshStandardMaterial).clone()
    cu.color.setRGB(1.08, 1.02, 0.98) // light orange-brown, about a year old, as photographed
    cu.roughness = 0.42
    return {
      zlCu: cu,
      zlWall: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.9 }),
      zlTrim: new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.85 }),
      zlPlinth: new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.9 }),
      zlDoor: new THREE.MeshStandardMaterial({ color: '#5a3d29', roughness: 0.7 }),
      zlIcon: new THREE.MeshStandardMaterial({ color: '#b38f4a', roughness: 0.6 }),
    }
  },
  notes: 'White church with open west porch and a tower over the pronaos; copper roof as photographed (2023), silver-grey tower helm; details interpreted from small drone views.',
}
export default model
