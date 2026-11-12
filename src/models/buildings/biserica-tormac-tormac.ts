/**
 * Reformed church, Tormac (Végvár), Timiș — built 1887–1888 (commune website),
 * OSM way 509484680 (coarse 7-point outline 31.3 × 16.2 m, long axis 173°).
 *
 * Modelling specification derived from the three public reference photographs
 * (one recent colour view of the west side from the commune website, two
 * historic printed views) and the OSM outline; real metres, +X = north (the
 * chamfered end of the outline), tower front at −X (south):
 *  - Large hall church (≈14 m wide): straight nave with a three-sided north
 *    end (the chamfered corners of the outline), hipped over the polygon.
 *  - Shallow side risalit on each long side next to the front bay, with its
 *    own gable (white raking cornice, tympanum frame), a tall round-arched
 *    window and a door below.
 *  - South front bay: tower in the axis, flanked by two lower wings with
 *    small hipped roofs (the lower hipped block seen beside the tower).
 *  - Tower ≈5.6 m square, cream-yellow with white corner pilasters: base
 *    stage, intermediate stage, belfry with a tall louvred arched opening and
 *    a clock on each face, dentilled main cornice ≈21.9 m, iron gallery,
 *    octagonal lantern with arched openings, small dome, rod, globe and star
 *    (≈27.8 m).
 *  - Walls saturated yellow with white pilasters, cornices and window
 *    surrounds; pinkish-grey socle.
 *  - METAL: the photographs predate the 2023 works recorded by COLOR METAL
 *    (natural titanium-zinc). The photographed roofs are already grey sheet;
 *    the main roof, risalit and wing roofs and the lantern dome are shown in
 *    natural titanium-zinc standing seam (≈0.5 m pans), as the register
 *    implies; which surfaces were redone is not documented.
 * Approximations: the OSM outline is a simple rectangle with a chamfered end —
 * the risalits, front wings and tower are interpreted from the photographs;
 * heights measured on photo 01 with the tower width as scale (±10 %); the
 * east side, the south front and the north end are not photographed and are
 * mirrored / assumed; window counts on the hidden parts estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, faceFrame, seams, polyRing, loft } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XF = -15.6 // south front (tower face)
const XB = -10.0 // back of the front bay / south gable of the hall
const XC = 12.3 // start of the chamfers
const XN = 15.6 // north end wall
const HW = 7.0 // hall half width
const HN = 3.8 // half width of the north end wall
const EAVE = 8.8
const PITCH = 36
const TP = Math.tan(PITCH * D2R)
const RIDGE = EAVE + HW * TP
const OV = 0.5
const RIS = { x0: -9.9, x1: -3.3, out: 8.1, pitch: 40 } // side risalits
const TW = { hw: 2.8, cx: (XF + XB) / 2 }

const WALL = 'tmYellow'
const WHITE = 'plasterWhite'
const ROOF = 'zincNatural'
const SEAM: SeamSpec = seams(ROOF, 0.5, 0.05, 0.045)

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add('wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.06, 0, y0), 0.05), m)
  const sw = o.surround ?? 0.22
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.06, h + 0.04, sw, 0, y0 - 0.04), 0.1), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.2, 0.14, 0.24), M(m, mat(0, y0 - sw - 0.02, 0.1)))
}

function pil(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.14, key = WHITE) {
  b.add(key, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

/** Hall outline (plan, CCW from above in X/Z): south gable → long side → chamfer → north wall … */
function hallRing(grow: number): [number, number][] {
  // grow the polygon outward by `grow` (simple miter offset)
  const base: [number, number][] = [
    [XB, -HW],
    [XC, -HW],
    [XN, -HN],
    [XN, HN],
    [XC, HW],
    [XB, HW],
  ]
  if (!grow) return base
  const n = base.length
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const p = base[i]
    const a = base[(i + n - 1) % n]
    const c = base[(i + 1) % n]
    const e1 = new THREE.Vector2(p[0] - a[0], p[1] - a[1]).normalize()
    const e2 = new THREE.Vector2(c[0] - p[0], c[1] - p[1]).normalize()
    // outward normals (ring is clockwise in X/Z seen from +Y when Z points "down" — test numerically)
    const n1 = new THREE.Vector2(e1.y, -e1.x)
    const n2 = new THREE.Vector2(e2.y, -e2.x)
    const bis = n1.clone().add(n2).normalize()
    const k = grow / Math.max(0.3, bis.dot(n1))
    out.push([p[0] + bis.x * k, p[1] + bis.y * k])
  }
  return out
}

function build(): Builder {
  const b = new Builder()
  // sanity: make sure the miter offset points outward (centroid distance grows)
  let ring = hallRing(OV)
  if (Math.abs(ring[0][1]) < HW) {
    // flip orientation of the offset
    const base = hallRing(0)
    ring = base.map((p, i) => [2 * p[0] - ring[i][0], 2 * p[1] - ring[i][1]] as [number, number])
  }

  /* ---------------- hall walls ---------------- */
  const prism = (key: string, pts: [number, number][], y0: number, h: number) => {
    const r0 = pts.map(([x, z]) => V(x, y0, z))
    const r1 = pts.map(([x, z]) => V(x, y0 + h, z))
    b.add(key, loft([r0, r1], { capTop: true, capBottom: false, flat: true }))
  }
  const hall0 = hallRing(0)
  prism(WALL, hall0, 0, EAVE)
  const grownBy = (g: number) => {
    let r = hallRing(g)
    if (Math.abs(r[0][1]) < HW) r = hall0.map((p, i) => [2 * p[0] - r[i][0], 2 * p[1] - r[i][1]] as [number, number])
    return r
  }
  prism('socle', grownBy(0.12), 0, 0.7)
  prism(WHITE, grownBy(0.18), EAVE - 0.65, 0.4)
  prism(WHITE, grownBy(0.3), EAVE - 0.25, 0.25)

  /* ---------------- long sides ---------------- */
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    // window bays north of the risalit
    for (const x of [-0.65, 4.5, 9.4]) win(b, at(x), 'round', 1.5, 4.4, 3.4)
    for (const x of [-3.0, 1.95, 7.0, 12.0]) pil(b, at(x), 0, 0.7, 0.7, EAVE - 0.65)
    // gutter + downpipes (natural zinc)
    b.beam(ROOF, V(XB, EAVE - OV * TP - 0.1, s * (HW + OV + 0.05)), V(XC + 0.3, EAVE - OV * TP - 0.1, s * (HW + OV + 0.05)), 0.15, 0.15)
    for (const x of [-2.6, 11.6]) b.rod(ROOF, V(x, 0.4, s * (HW + 0.16)), V(x, EAVE - 0.5, s * (HW + 0.16)), 0.06, 8)

    /* side risalit with gable */
    const rw = RIS.x1 - RIS.x0
    const rx = (RIS.x0 + RIS.x1) / 2
    b.block(WALL, rw, EAVE, RIS.out - HW + 0.2, rx, 0, s * (HW + RIS.out) / 2 - s * 0.1)
    b.block('socle', rw + 0.24, 0.7, RIS.out - HW + 0.2, rx, 0, s * ((HW + RIS.out) / 2 + 0.06))
    b.block(WHITE, rw + 0.36, 0.4, RIS.out - HW + 0.3, rx, EAVE - 0.65, s * ((HW + RIS.out) / 2 + 0.08))
    const rf = (u: number) => faceFrame(face, s * RIS.out, s > 0 ? u : -u)
    win(b, rf(rx), 'round', 1.45, 4.1, 4.4)
    win(b, rf(rx), 'round', 1.7, 2.9, 0.15, { fill: 'wood', sill: false })
    for (const u of [RIS.x0 + 0.4, RIS.x1 - 0.4]) pil(b, rf(u), 0, 0.8, 0.7, EAVE - 0.65, 0.16)
    // gable wall
    const rt = Math.tan(RIS.pitch * D2R)
    const gr = EAVE + (rw / 2) * rt
    const tri = new THREE.Shape([new THREE.Vector2(-rw / 2, EAVE - 0.3), new THREE.Vector2(rw / 2, EAVE - 0.3), new THREE.Vector2(0, gr - 0.05)])
    b.add(WALL, extrude(tri, 0.5), M(rf(rx), mat(0, 0, -0.5)))
    // white raking cornices + tympanum frame
    const g0 = rf(rx)
    for (const sg of [-1, 1]) {
      b.beam(WHITE, V(sg * (rw / 2 + 0.25), EAVE - 0.2, 0.12).applyMatrix4(g0), V(0, gr + 0.15, 0.12).applyMatrix4(g0), 0.4, 0.3, V(0, 0, 1).transformDirection(g0))
      b.beam(WHITE, V(sg * (rw / 2 - 0.9), EAVE + 0.35, 0.1).applyMatrix4(g0), V(0, gr - 0.75, 0.1).applyMatrix4(g0), 0.18, 0.2, V(0, 0, 1).transformDirection(g0))
    }
    b.add(WHITE, metricBox(rw - 1.6, 0.18, 0.2), M(g0, mat(0, EAVE + 0.3, 0.1)))
    // risalit roof (two planes meeting the main roof along straight valleys)
    const zr = HW - (gr - EAVE) / TP // where the risalit ridge meets the main roof
    const zo = s * (RIS.out + 0.35)
    const ye = EAVE
    const yo = EAVE - 0.3 * rt
    for (const side of [-1, 1]) {
      const xe = side < 0 ? RIS.x0 - 0.3 : RIS.x1 + 0.3
      facet(b, ROOF, [V(xe, yo, zo), V(rx, gr, zo), V(rx, gr, s * zr), V(side < 0 ? RIS.x0 : RIS.x1, ye, s * HW)], { seams: { ...SEAM }, thickness: 0.1, hint: V(side * 0.6, 1, 0) })
    }
    b.beam(ROOF, V(rx, gr + 0.05, zo), V(rx, gr + 0.05, s * zr), 0.2, 0.12)
    for (const side of [-1, 1]) {
      const xe = side < 0 ? RIS.x0 : RIS.x1
      b.beam(ROOF, V(xe, ye + 0.04, s * HW), V(rx, gr + 0.04, s * zr), 0.16, 0.1)
    }
  }

  /* ---------------- north polygon & end wall ---------------- */
  {
    const chamfer = (sz: number) => {
      const a = V(XC, 0, sz * HW)
      const c = V(XN, 0, sz * HN)
      const mid = a.clone().add(c).multiplyScalar(0.5)
      const ry = Math.atan2(c.x - a.x, c.z - a.z) // direction along the wall
      const nrm = V(c.z - a.z, 0, -(c.x - a.x)).normalize().multiplyScalar(sz > 0 ? -1 : 1)
      return mat(mid.x, 0, mid.z, Math.atan2(nrm.x, nrm.z) + 0 * ry)
    }
    for (const sz of [-1, 1]) win(b, chamfer(sz), 'round', 1.4, 4.2, 3.5)
    const end = faceFrame('+x', XN, 0)
    win(b, end, 'round', 1.5, 4.4, 3.4)
    for (const u of [-HN + 0.35, HN - 0.35]) pil(b, end, u, 0.7, 0.7, EAVE - 0.65)
  }

  /* ---------------- main roof: gable at the tower, hipped polygon at the north ---------------- */
  {
    const ye = EAVE - OV * TP
    const xs = XB + 0.05
    const apexX = XN - HW // hip apex so that the end facet has the same pitch
    const apex = V(apexX, RIDGE, 0)
    // grown ring order: [XB,-HW] [XC,-HW] [XN,-HN] [XN,HN] [XC,HW] [XB,HW]
    const g = ring
    const P = (i: number) => V(g[i][0], ye, g[i][1])
    for (const sz of [-1, 1]) {
      const iC = sz < 0 ? 1 : 4
      const pc = P(iC)
      facet(b, ROOF, [V(xs, ye, sz * (HW + OV)), V(pc.x, ye, sz * (HW + OV)), apex, V(xs, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    }
    facet(b, ROOF, [P(1), P(2), apex], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [P(2), P(3), apex], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [P(3), P(4), apex], { seams: SEAM, thickness: 0.12 })
    b.beam(ROOF, V(xs, RIDGE + 0.06, 0), V(apexX, RIDGE + 0.06, 0), 0.26, 0.14)
    for (const i of [1, 2, 3, 4]) b.beam(ROOF, P(i).add(V(0, 0.06, 0)), apex.clone().add(V(0, 0.06, 0)), 0.2, 0.12)
    // eave gutters around the polygon
    for (const [i, j] of [[1, 2], [2, 3], [3, 4]]) b.beam(ROOF, P(i).add(V(0, -0.1, 0)), P(j).add(V(0, -0.1, 0)), 0.15, 0.15)
    // south gable wall of the hall (above the front bay)
    const tri = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.3), new THREE.Vector2(HW, EAVE - 0.3), new THREE.Vector2(0, RIDGE - 0.05)])
    b.add(WALL, extrude(tri, 0.6), mat(XB, 0, 0, -Math.PI / 2))
    for (const sz of [-1, 1]) b.beam(WHITE, V(XB - 0.1, EAVE - 0.2, sz * (HW + 0.25)), V(XB - 0.1, RIDGE + 0.12, 0), 0.32, 0.3, V(-1, 0, 0))
  }

  /* ---------------- south front bay: wings with hipped roofs ---------------- */
  {
    const depth = XB - XF
    const xm = (XF + XB) / 2
    for (const sz of [-1, 1]) {
      const z0 = TW.hw
      const z1 = HW
      const zm = sz * (z0 + z1) / 2
      const wd = z1 - z0
      b.block(WALL, depth, EAVE, wd, xm, 0, zm)
      b.block('socle', depth + 0.24, 0.7, wd + 0.12, xm - 0.06, 0, zm + sz * 0.06)
      b.block(WHITE, depth + 0.36, 0.4, wd + 0.18, xm - 0.09, EAVE - 0.65, zm + sz * 0.09)
      b.block(WHITE, depth + 0.6, 0.25, wd + 0.3, xm - 0.15, EAVE - 0.25, zm + sz * 0.15)
      // front (south) window and side window
      const fm = faceFrame('-x', XF, sz * (z0 + z1) / 2)
      win(b, fm, 'round', 1.3, 3.4, 3.6)
      for (const u of [sz * (z0 + 0.35), sz * (z1 - 0.35)]) pil(b, faceFrame('-x', XF, 0), u, 0.7, 0.7, EAVE - 0.65)
      const sm = faceFrame(sz > 0 ? '+z' : '-z', sz * HW, sz > 0 ? xm : -xm)
      win(b, sm, 'round', 1.1, 2.4, 4.4)
      pil(b, faceFrame(sz > 0 ? '+z' : '-z', sz * HW, sz > 0 ? XF + 0.35 : -(XF + 0.35)), 0, 0.7, 0.7, EAVE - 0.65)
      // hipped roof: hip towards the front and the outside, abutting tower and hall gable
      const wp = 32 * D2R
      const tp = Math.tan(wp)
      const ye = EAVE - 0.4 * tp
      const xa = XF - 0.4
      const xb = XB
      const za = sz * (z1 + 0.4)
      const zi = sz * z0
      const rise = (wd + 0.4) / 2 * tp
      const zr = sz * (z0 + (wd + 0.4) / 2)
      const ry = ye + rise
      const xr0 = xa + (wd + 0.4) / 2
      // outer slope, inner slope (towards the tower, hidden mostly), front hip
      facet(b, ROOF, [V(xa, ye, za), V(xb, ye, za), V(xb, ry, zr), V(xr0, ry, zr)], { seams: SEAM, thickness: 0.1, hint: V(0, 1, sz) })
      facet(b, ROOF, [V(xr0, ry, zr), V(xb, ry, zr), V(xb, ye, zi), V(xa + 0.0, ye, zi)], { seams: SEAM, thickness: 0.1, hint: V(0, 1, -sz) })
      facet(b, ROOF, [V(xa, ye, zi), V(xa, ye, za), V(xr0, ry, zr)], { seams: SEAM, thickness: 0.1, hint: V(-1, 1, 0) })
      b.beam(ROOF, V(xr0, ry + 0.04, zr), V(xb, ry + 0.04, zr), 0.18, 0.1)
      b.beam(ROOF, V(xa, ye + 0.04, za), V(xr0, ry + 0.04, zr), 0.16, 0.1)
    }
  }

  /* ---------------- tower ---------------- */
  {
    const cx = TW.cx
    const stages = [
      { y0: 0, y1: 9.6, hw: TW.hw },
      { y0: 9.6, y1: 14.2, hw: TW.hw - 0.12 },
      { y0: 14.2, y1: 21.3, hw: TW.hw - 0.22 },
    ]
    b.block('socle', TW.hw * 2 + 0.3, 0.8, TW.hw * 2 + 0.3, cx - 0.1, 0, 0)
    for (const s of stages) {
      b.block(WALL, s.hw * 2, s.y1 - s.y0, s.hw * 2, cx, s.y0, 0)
      b.block(WHITE, s.hw * 2 + 0.4, 0.35, s.hw * 2 + 0.4, cx, s.y1 - 0.35, 0)
    }
    // dentilled main cornice
    const ct = 21.3
    b.block(WHITE, 5.4, 0.3, 5.4, cx, ct - 0.05, 0)
    b.block(WHITE, 5.9, 0.35, 5.9, cx, ct + 0.25, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const hw = 2.7
      const uOff = face === '+z' ? cx : face === '-z' ? -cx : 0
      const fm = (hwv: number) => faceFrame(face, face.endsWith('x') ? cx + (face[0] === '+' ? hwv : -hwv) : face[0] === '+' ? hwv : -hwv, uOff)
      for (let i = -9; i <= 9; i++) b.add(WHITE, metricBox(0.14, 0.18, 0.14), M(fm(hw), mat(i * 0.29, ct + 0.15, 0.07)))
      // corner pilasters on every stage
      for (const s of stages) {
        for (const su of [-1, 1]) pil(b, fm(s.hw), su * (s.hw - 0.3), 0.6, s.y0 + (s.y0 === 0 ? 0.8 : 0.35), s.y1 - 0.35, 0.12)
      }
      // base stage: door on the front, small arched window above
      if (face === '-x') {
        win(b, fm(TW.hw), 'round', 1.8, 3.4, 0.05, { fill: 'wood', sill: false, surround: 0.3 })
        b.add(WHITE, metricBox(2.8, 0.25, 0.3), M(fm(TW.hw), mat(0, 3.85, 0.15)))
      }
      if (face !== '+x') win(b, fm(TW.hw), 'round', 0.8, 1.8, 6.0)
      // intermediate stage: small arched window
      win(b, fm(stages[1].hw), 'round', 0.8, 1.9, 11.2)
      // belfry: tall louvred arched opening + clock
      const bm = fm(stages[2].hw)
      win(b, bm, 'round', 1.4, 3.9, 14.7, { fill: 'black', surround: 0.25 })
      for (let k = 0; k < 7; k++) b.add('tmLouvre', metricBox(1.35, 0.07, 0.12), M(bm, mat(0, 15.1 + k * 0.45, 0.06, 0, 0.5)))
      b.add('clock', new THREE.CylinderGeometry(0.72, 0.72, 0.1, 28), M(bm, mat(0, 19.85, 0.06, 0, Math.PI / 2)))
      b.add(WHITE, new THREE.TorusGeometry(0.76, 0.08, 6, 28), M(bm, mat(0, 19.85, 0.1)))
      b.add('gilt', metricBox(0.07, 0.55, 0.03), M(bm, mat(0, 20.05, 0.14)))
      b.add('gilt', metricBox(0.42, 0.06, 0.03), M(bm, mat(0.16, 19.85, 0.14)))
    }
    // gallery: iron railing on the cornice platform
    const gy = ct + 0.6
    const gh = 1.0
    const ghw = 2.8
    b.block(ROOF, ghw * 2 + 0.1, 0.06, ghw * 2 + 0.1, cx, gy - 0.06, 0)
    for (const sz of [-1, 1]) {
      b.beam('black', V(cx - ghw, gy + gh, sz * ghw), V(cx + ghw, gy + gh, sz * ghw), 0.06, 0.06)
      b.beam('black', V(cx + sz * ghw, gy + gh, -ghw), V(cx + sz * ghw, gy + gh, ghw), 0.06, 0.06)
      b.beam('black', V(cx - ghw, gy + 0.15, sz * ghw), V(cx + ghw, gy + 0.15, sz * ghw), 0.05, 0.05)
      b.beam('black', V(cx + sz * ghw, gy + 0.15, -ghw), V(cx + sz * ghw, gy + 0.15, ghw), 0.05, 0.05)
      for (let i = 0; i <= 14; i++) {
        const t = -ghw + (i * 2 * ghw) / 14
        b.rod('black', V(cx + t, gy, sz * ghw), V(cx + t, gy + gh, sz * ghw), 0.02, 4)
        b.rod('black', V(cx + sz * ghw, gy, t), V(cx + sz * ghw, gy + gh, t), 0.02, 4)
      }
    }
    // octagonal lantern
    const ly = gy
    const lr = 1.55
    const lh = 2.6
    b.add(WALL, loft([polyRing(8, lr, ly, Math.PI / 8, cx, 0), polyRing(8, lr, ly + lh, Math.PI / 8, cx, 0)], { capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const ap = lr * Math.cos(Math.PI / 8)
      const m = mat(cx + Math.cos(a) * ap, 0, Math.sin(a) * ap, Math.PI / 2 - a)
      if (k % 2 === 0) win(b, m, 'round', 0.55, 1.5, ly + 0.5, { fill: 'black', surround: 0.12, sill: false })
      // white corner strips
      const ac = a + Math.PI / 8
      b.rod(WHITE, V(cx + Math.cos(ac) * lr, ly, Math.sin(ac) * lr), V(cx + Math.cos(ac) * lr, ly + lh, Math.sin(ac) * lr), 0.09, 6)
    }
    b.add(WHITE, loft([polyRing(8, lr + 0.22, ly + lh, Math.PI / 8, cx, 0), polyRing(8, lr + 0.22, ly + lh + 0.28, Math.PI / 8, cx, 0)], { capTop: true, capBottom: true, flat: true }))
    // small zinc dome + finial
    const dy = ly + lh + 0.28
    const st: [number, number][] = [
      [1.72, dy],
      [1.62, dy + 0.25],
      [1.38, dy + 0.55],
      [1.0, dy + 0.85],
      [0.55, dy + 1.08],
      [0.22, dy + 1.2],
      [0.12, dy + 1.45],
      [0.18, dy + 1.65],
      [0.06, dy + 1.95],
    ]
    helm(b, ROOF, { x: cx, z: 0, n: 16, stations: st })
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      b.beam(ROOF, V(cx + Math.cos(a) * 1.74, dy + 0.02, Math.sin(a) * 1.74), V(cx + Math.cos(a) * 0.26, dy + 1.2, Math.sin(a) * 0.26), 0.05, 0.05)
    }
    const top = dy + 1.95
    b.rod('gilt', V(cx, top - 0.1, 0), V(cx, top + 1.9, 0), 0.04)
    b.add('gilt', new THREE.SphereGeometry(0.2, 14, 10), mat(cx, top + 0.25, 0))
    const star = new THREE.Shape()
    for (let i = 0; i < 12; i++) {
      const r = i % 2 ? 0.16 : 0.42
      const a = (i / 12) * Math.PI * 2 + Math.PI / 2
      if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    b.add('gilt', extrude(star, 0.05), mat(cx, top + 1.5, -0.025, Math.PI / 2))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [2, 12.2, -4.5],
  materials: (base) => ({
    tmYellow: (() => {
      const m = (base.plasterYellow as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color('#e9c45a')
      return m
    })(),
    tmLouvre: new THREE.MeshStandardMaterial({ color: '#7a3b30', roughness: 0.7 }),
  }),
  notes: 'Coarse OSM outline: risalits, front wings and tower interpreted from one recent and two historic photographs; heights estimated; unphotographed sides assumed symmetric.',
}
export default model
