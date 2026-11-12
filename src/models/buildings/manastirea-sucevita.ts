/**
 * Mănăstirea Sucevița – church „Învierea Domnului” (1580s, painted 1596–1601,
 * UNESCO), Sucevița, jud. Suceava; OSM way 1168504528 (tower part 1168504529).
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = OSM
 * long axis 62.7° towards the altar (ENE), +Z = south). The OSM outline
 * (44.7 × 25.1 m) follows the very wide eaves; walls are taken ≈ 1.9 m inside it.
 * Photographs 01 (south side, 2024), 02 (north side, 2024), 03 (north porch and
 * west end, 2024), 04 (south porch and west front, 2021), 05 (precinct, 2022):
 *  - Moldavian trefoil church, 40.8 × 12.6 m over the walls: long western body
 *    (exonarthex/pronaos/burial chamber), naos with two polygonal lateral apses
 *    under the tower, polygonal altar apse; dressed-stone plinth ≈ 2 m; walls
 *    ≈ 11 m, fully painted (shown as a blue-green fresco tone) except the white
 *    west front; stepped stone buttresses at the apse junctions and west corners;
 *    two tall Gothic windows per side in the pronaos, small arched apse windows,
 *    blind arcades on the apses.
 *  - Open porches north (tall pointed arches, two-level roof) and south (pointed
 *    brick-banded arches on twisted columns, hipped roof).
 *  - Roofs: steep bell-cast hipped roof with ≈ 1.9 m flared eaves and timber
 *    soffits over the western body, a hipped naos roof carrying the tower, flared
 *    cones with iron crosses over the three apses. Tower: two-tier star base,
 *    octagonal drum with blind arches, wide flared eave and a tall octagonal helm.
 *  - Metal: COLOR METAL supplied copper sheet in 2021 according to its records,
 *    without naming the building or surface. The photographs (2021–2024) show the
 *    church with its shingle roofs; the church roofs (all roof surfaces and the
 *    tower helm) are taken as the most likely copper surface and shown in
 *    weathered copper with standing seams ≈ 0.5 m, keeping the photographed forms.
 * Approximations: no published dimensions were found — wall height, roof pitch
 * and tower heights (eave ≈ 20 m, cross ≈ 29 m) are scaled from photos 01/02; apse
 * radii and porch sizes after the OSM outline; frescoes reduced to a single tone.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const UP = V(0, 1, 0)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'copperBrown'
const FRESCO = 'sucvFresco'
const WHITE = 'sucvWhite'
const STONE = 'stoneWarm'
const WOOD = 'timber'

const Z0 = -0.5 // body axis offset from the outline centre
const H = 11.0 // wall top
const YE = 10.75 // eave edge
const OV = 1.9 // eave projection
const HW = 6.3 // body half width
const BODY = { x0: -20.4, x1: 10.8 }
const TX = 7.4 // naos centre = tower axis
const LAT = { r: 3.4, n: 10 }
const ALT = { xc: 14.5, r: 5.8, n: 12 }
const FLARE: P2[] = [
  [0.9, 16],
  [0.7, 30],
]

function seamedLoft(b: Builder, key: string, rings: THREE.Vector3[][], spacing = 0.5) {
  const sp = { key, spacing, h: 0.035, w: 0.04 }
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i]
    const B = rings[i + 1]
    for (let k = 0; k < A.length; k++) {
      const k1 = (k + 1) % A.length
      const q = [A[k], A[k1], B[k1], B[k]]
      const pts = q.filter((p, j) => p.distanceTo(q[(j + 1) % 4]) > 1e-4)
      if (pts.length >= 3) facet(b, key, pts, { seams: sp })
    }
  }
}
function faceM(cx: number, cz: number, nx: number, nz: number) {
  const n = V(nx, 0, nz).normalize()
  return new THREE.Matrix4().makeBasis(V().crossVectors(UP, n), UP, n).setPosition(cx, 0, cz)
}
function archPts(w: number, h: number, y0: number, seg = 6, u = 0) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(u - hw, y0), new THREE.Vector2(u + hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(u + Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
function niche(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, f = 0.1, key = 'sucvFrame', shade = 'sucvShade') {
  const s = new THREE.Shape(archPts(w + 2 * f, h + 2 * f, y0 - f, 6, u))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 6, u)))
  b.add(key, extrude(s, 0.08, 4), m)
  b.add(shade, new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 6, u))), M(m, mat(0, 0, 0.012)))
}
function smallWindow(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  const s = new THREE.Shape(archPts(w + 0.36, h + 0.18, y0 - 0.18, 6, u))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 6, u)))
  b.add(STONE, extrude(s, 0.12, 4), M(m, mat(0, 0, 0.02)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 6, u))), M(m, mat(0, 0, 0.03)))
}
function gothicWindow(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  const f = 0.22
  const outer = new THREE.Shape(opening('pointed', w + 2 * f, h + f * 1.6, u, y0 - f, 8))
  outer.holes.push(new THREE.Path(opening('pointed', w, h, u, y0, 8)))
  b.add(STONE, extrude(outer, 0.14, 8), M(m, mat(0, 0, 0.02)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, u, y0, 8))), M(m, mat(0, 0, 0.03)))
  b.add(STONE, metricBox(0.1, h - w * 0.5, 0.1), M(m, mat(u, y0 + (h - w * 0.5) / 2, 0.08)))
}
function buttress(b: Builder, px: number, pz: number, nx: number, nz: number, w = 1.0, d = 1.5, h = 8.6) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(n, UP).normalize()
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.2, 0),
    new THREE.Vector2(d, 0),
    new THREE.Vector2(d, h * 0.45),
    new THREE.Vector2(d * 0.7, h * 0.45 + 0.45),
    new THREE.Vector2(d * 0.7, h * 0.82),
    new THREE.Vector2(0.1, h),
    new THREE.Vector2(-0.2, h),
  ])
  b.add(STONE, extrude(prof, w, 2), new THREE.Matrix4().makeBasis(n, UP, t).setPosition(V(px, 0, pz).sub(t.clone().multiplyScalar(w / 2))))
}
function bell(r0: number, y0: number, finalDeg: number, rTop = 0.02, flare: P2[] = FLARE): P2[] {
  const out: P2[] = [[r0, y0]]
  let r = r0
  let y = y0
  for (const [du, deg] of flare) {
    r -= du
    y += du * Math.tan(deg * D2R)
    out.push([r, y])
  }
  out.push([rTop, y + (r - rTop) * Math.tan(finalDeg * D2R)])
  return out
}
/** Ring around a ridge xW…xE at half width r with rounded hipped ends (corner radius rho). */
function ridgeRing(xW: number, xE: number, r: number, y: number, rho = 0.3, seg = 2) {
  const end: P2[] = [[0, -1]]
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2)
    end.push([1 - rho + rho * Math.cos(a), -1 + rho + rho * Math.sin(a)])
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2)
    end.push([1 - rho + rho * Math.cos(a), 1 - rho + rho * Math.sin(a)])
  }
  end.push([0, 1])
  const ring: THREE.Vector3[] = []
  for (const [ux, uz] of end) ring.push(V(xE + r * ux, y, Z0 + r * uz))
  for (const [ux, uz] of end) ring.push(V(xW - r * ux, y, Z0 - r * uz))
  return ring
}
function coneRoof(b: Builder, x: number, z: number, n: number, rWall: number, finalDeg: number, flare: P2[] = FLARE) {
  const r0 = rWall + OV
  const st = bell(r0, YE, finalDeg, 0.02, flare)
  seamedLoft(b, CU, st.map(([r, y]) => polyRing(n, r, y, 0, x, z)))
  b.add(CU, loft([polyRing(n, r0, YE - 0.16, 0, x, z), polyRing(n, r0, YE, 0, x, z)]))
  b.add(WOOD, loft([polyRing(n, rWall, H, 0, x, z), polyRing(n, r0 - 0.02, YE - 0.16, 0, x, z)]))
  return st[st.length - 1][1]
}

/** Open porch with pointed arches (front face towards outward normal sz). */
function porch(b: Builder, sz: number, x0: number, x1: number, depth: number, o: { eave: number; arches: number; twisted: boolean; archH: number; topCap: boolean }) {
  const zw = Z0 + sz * HW
  const zf = zw + sz * depth
  const xc = (x0 + x1) / 2
  const w = x1 - x0
  const pod = 1.1
  // stone podium and steps
  b.block(STONE, w + 0.2, pod, depth, xc, 0, (zw + zf) / 2)
  for (let i = 0; i < 4; i++) b.block(STONE, 2.4, pod - i * 0.27, 0.4, x0 - 0.6, 0, zf - sz * (0.4 + i * 0.4))
  const ph = o.eave - pod
  // front face with arches
  const front = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, ph), new THREE.Vector2(-w / 2, ph)])
  const aw = (w - 0.6 - (o.arches - 1) * 0.55) / o.arches
  for (let i = 0; i < o.arches; i++) {
    const u = -w / 2 + 0.3 + aw / 2 + i * (aw + 0.55)
    front.holes.push(new THREE.Path(opening('pointed', aw, o.archH, u, 0, 8)))
  }
  const mf = M(faceM(xc, zf, 0, sz), mat(0, pod, 0))
  b.add(WHITE, extrude(front, 0.6, 8), M(mf, mat(0, 0, -0.6)))
  for (let i = 0; i < o.arches; i++) {
    const u = -w / 2 + 0.3 + aw / 2 + i * (aw + 0.55)
    const s = new THREE.Shape(opening('pointed', aw + 0.4, o.archH + 0.3, u, -0.1, 8))
    s.holes.push(new THREE.Path(opening('pointed', aw, o.archH, u, 0, 8)))
    b.add(o.twisted ? 'brickRed' : 'sucvFrame', extrude(s, 0.1, 8), mf)
    if (o.twisted && i > 0) {
      const uc = u - aw / 2 - 0.275
      b.add(WHITE, new THREE.CylinderGeometry(0.24, 0.27, o.archH - aw * 0.8, 10), M(mf, mat(uc, (o.archH - aw * 0.8) / 2, -0.3)))
      for (let k = 0; k < 6; k++) b.add('brickRed', new THREE.TorusGeometry(0.26, 0.035, 4, 10), M(mf, mat(uc, 0.4 + k * ((o.archH - aw * 0.8 - 0.8) / 5), -0.3, 0, Math.PI / 2 + 0.3)))
    }
  }
  if (o.twisted) for (const y of [ph - 1.6, ph - 1.1, ph - 0.6]) b.add('brickRed', metricBox(w, 0.12, 0.05), M(mf, mat(0, y, 0.02)))
  // side faces: one arch each
  for (const s of [-1, 1]) {
    const xs = s < 0 ? x0 : x1
    const side = new THREE.Shape([new THREE.Vector2(-depth / 2, 0), new THREE.Vector2(depth / 2, 0), new THREE.Vector2(depth / 2, ph), new THREE.Vector2(-depth / 2, ph)])
    const sw = Math.min(depth - 1.6, aw * 1.1)
    side.holes.push(new THREE.Path(opening('pointed', sw, Math.min(o.archH, sw * 2.1), 0, 0, 8)))
    b.add(WHITE, extrude(side, 0.5, 8), M(M(faceM(xs, (zw + zf) / 2, s, 0), mat(0, pod, 0)), mat(0, 0, -0.5)))
  }
  b.block('sucvShade', w - 1.0, 0.15, depth - 0.6, xc, o.eave - 0.15, (zw + zf) / 2)
  // hipped roof with flared eave
  const ov = 1.1
  const hx = w / 2 + ov
  const hz = depth / 2 + ov / 2
  const zc = zw + sz * (depth / 2 + ov / 4)
  const t1 = Math.tan(22 * D2R)
  const t2 = Math.tan(52 * D2R)
  const ring = (dx: number, dz: number, y: number) => rectRing(dx, dz, y, xc, zc)
  const y0 = o.eave - 0.1
  const y1 = y0 + 0.9 * t1
  const rings = [ring(hx, hz, y0), ring(hx - 0.9, hz - 0.9, y1)]
  if (o.topCap) {
    const y2 = y1 + 0.9 * t2
    rings.push(ring(hx - 1.8, hz - 1.8, y2))
    rings.push(ring(0.05, 0.05, y2 + (hz - 1.8) * Math.tan(58 * D2R)))
  } else rings.push(ring(Math.max(0.05, hx - hz), 0.05, y1 + (hz - 0.9) * t2))
  seamedLoft(b, CU, rings, 0.45)
  b.add(WOOD, loft([rectRing(w / 2, depth / 2, o.eave - 0.05, xc, (zw + zf) / 2), ring(hx - 0.02, hz - 0.02, y0 - 0.12)]))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bx = (BODY.x0 + BODY.x1) / 2
  const bl = BODY.x1 - BODY.x0
  b.block(FRESCO, bl, H, HW * 2, bx, 0, Z0)
  b.block(STONE, bl + 0.3, 2.0, HW * 2 + 0.3, bx, 0, Z0)
  // white west front
  b.block(WHITE, 0.06, H - 2.0, HW * 2 - 0.1, BODY.x0 - 0.03, 2.0, Z0)
  for (const sz of [-1, 1]) {
    b.add(FRESCO, loft([polyRing(LAT.n, LAT.r, 0, 0, TX, Z0 + sz * HW), polyRing(LAT.n, LAT.r, H, 0, TX, Z0 + sz * HW)], { capTop: true, flat: true }))
    b.add(STONE, loft([polyRing(LAT.n, LAT.r + 0.15, 0, 0, TX, Z0 + sz * HW), polyRing(LAT.n, LAT.r + 0.15, 2.0, 0, TX, Z0 + sz * HW)], { capTop: true, flat: true }))
  }
  const altHW = ALT.r * Math.cos(Math.PI / ALT.n) * 0.98
  b.block(FRESCO, ALT.xc - BODY.x1 + 0.05, H, altHW * 2, (BODY.x1 + ALT.xc) / 2, 0, Z0)
  b.block(STONE, ALT.xc - BODY.x1, 2.0, altHW * 2 + 0.3, (BODY.x1 + ALT.xc) / 2, 0, Z0)
  b.add(FRESCO, loft([polyRing(ALT.n, ALT.r, 0, 0, ALT.xc, Z0), polyRing(ALT.n, ALT.r, H, 0, ALT.xc, Z0)], { capTop: true, flat: true }))
  b.add(STONE, loft([polyRing(ALT.n, ALT.r + 0.15, 0, 0, ALT.xc, Z0), polyRing(ALT.n, ALT.r + 0.15, 2.0, 0, ALT.xc, Z0)], { capTop: true, flat: true }))

  // painted register bands (dark lines between the fresco tiers)
  for (const sz of [-1, 1]) {
    for (const y of [4.6, 7.4, 9.6]) b.block('sucvFrame', bl - 0.4, 0.12, 0.04, bx, y, Z0 + sz * (HW + 0.02))
  }

  /* ================= façades ================= */
  for (const sz of [-1, 1]) {
    const m = (x: number) => faceM(x, Z0 + sz * HW, 0, sz)
    for (const x of [-9.8, -6.0]) gothicWindow(b, m(x), 0, 4.6, 1.2, 3.3)
    smallWindow(b, m(0.6), 0, 4.2, 0.7, 1.4)
    // buttresses: west corners, both sides of the lateral apse, altar junction
    buttress(b, BODY.x0 + 0.7, Z0 + sz * HW, 0, sz, 1.1, 1.7, 9.0)
    buttress(b, TX - LAT.r - 0.3, Z0 + sz * HW, 0, sz, 1.0, 1.5, 8.6)
    buttress(b, BODY.x1 - 0.2, Z0 + sz * altHW, 0, sz, 1.0, 1.4, 8.4)
  }
  // west front: two narrow windows, stepped buttresses
  {
    const m = faceM(BODY.x0, Z0, -1, 0)
    for (const u of [-2.0, 2.0]) smallWindow(b, m, u, 6.6, 0.55, 2.2)
    for (const sz of [-1, 1]) buttress(b, BODY.x0, Z0 + sz * (HW - 0.8), -1, 0, 1.2, 1.9, 9.2)
  }
  // apses: lower small windows, upper blind arcade
  const apse = (cx: number, cz: number, r: number, n: number, keep: (fx: number, fz: number) => boolean, butt: boolean) => {
    const ap = r * Math.cos(Math.PI / n)
    const fw = 2 * r * Math.sin(Math.PI / n)
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / n
      const fx = cx + ap * Math.cos(a)
      const fz = cz + ap * Math.sin(a)
      if (!keep(fx, fz)) continue
      const m = faceM(fx, fz, Math.cos(a), Math.sin(a))
      niche(b, m, 0, 7.5, fw - 0.55, 2.3)
      niche(b, m, 0, 4.9, fw - 0.55, 2.1)
      if (i % 2 === 0) smallWindow(b, m, 0, 2.7, 0.55, 1.2)
      const va = (i * 2 * Math.PI) / n
      if (butt && i % 3 === 1) buttress(b, cx + r * Math.cos(va), cz + r * Math.sin(va), Math.cos(va), Math.sin(va), 0.9, 1.2, 8.0)
    }
  }
  apse(ALT.xc, Z0, ALT.r, ALT.n, (x) => x > ALT.xc + 0.2, true)
  for (const sz of [-1, 1]) apse(TX, Z0 + sz * HW, LAT.r, LAT.n, (_x, z) => sz * (z - Z0) > HW + 0.2, false)

  /* ================= porches ================= */
  porch(b, 1, -18.0, -13.2, 4.7, { eave: 6.2, arches: 3, twisted: true, archH: 3.5, topCap: false })
  porch(b, -1, -17.3, -11.4, 4.6, { eave: 7.0, arches: 1, twisted: false, archH: 5.0, topCap: true })

  /* ================= roofs ================= */
  // western body: steep bell-cast hipped roof
  const r0 = HW + OV
  const xW = BODY.x0 - OV + r0
  const xE = TX - 3.4
  const pst = bell(r0, YE, 44, 0)
  seamedLoft(b, CU, pst.map(([r, y]) => ridgeRing(xW, xE, r, y)))
  b.add(CU, loft([ridgeRing(xW, xE, r0, YE - 0.16), ridgeRing(xW, xE, r0, YE)]))
  b.add(WOOD, loft([ridgeRing(xW, xE, HW, H, 0.02), ridgeRing(xW, xE, r0 - 0.02, YE - 0.16)]))
  const ridge = pst[pst.length - 1][1]
  b.beam(CU, V(xW, ridge + 0.04, Z0), V(xE, ridge + 0.04, Z0), 0.22, 0.12)
  cross(b, 'iron', xW, ridge, Z0, 1.9, true, Math.PI / 2)
  cross(b, 'iron', xE, ridge, Z0, 1.6, true, Math.PI / 2)
  // naos: hipped roof carrying the tower base
  {
    const top = 3.3
    const hx0 = BODY.x1 - 0.6 - TX + OV
    const hz0 = HW + OV
    const sx = (hx0 - top) / (hz0 - top)
    const st = bell(hz0, YE, 40, top)
    seamedLoft(b, CU, st.map(([r, y]) => rectRing(top + (r - top) * sx, r, y, TX, Z0)))
    b.add(WOOD, loft([rectRing(BODY.x1 - 0.6 - TX, HW, H, TX, Z0), rectRing(hx0 - 0.02, hz0 - 0.02, YE - 0.16, TX, Z0)]))
  }
  for (const sz of [-1, 1]) {
    const top = coneRoof(b, TX, Z0 + sz * HW, LAT.n, LAT.r, 52, [
      [0.9, 16],
      [0.7, 30],
      [0.9, 26],
    ])
    cross(b, 'iron', TX, top, Z0 + sz * HW, 1.6, true, Math.PI / 2)
  }
  const altTop = coneRoof(b, ALT.xc, Z0, ALT.n, ALT.r, 44)
  cross(b, 'iron', ALT.xc, altTop, Z0, 1.9, true, Math.PI / 2)

  /* ================= tower ================= */
  // two-tier star base
  const tiers = [
    { s: 6.6, y0: 13.4, y1: 15.1 },
    { s: 5.8, y0: 15.1, y1: 16.7 },
  ]
  for (const t of tiers) {
    for (const rot of [0, Math.PI / 4]) {
      b.add(WHITE, metricBox(t.s, t.y1 - t.y0, t.s), mat(TX, (t.y0 + t.y1) / 2, Z0, rot))
      b.add(CU, loft([rectRing(t.s / 2 + 0.3, t.s / 2 + 0.3, t.y1 - 0.05), rectRing(t.s / 2 - 0.25, t.s / 2 - 0.25, t.y1 + 0.35)], { capTop: true, flat: true }), mat(TX, 0, Z0, rot))
    }
    // small arches on the star faces
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const ap = t.s / 2
      niche(b, faceM(TX + ap * Math.cos(a), Z0 + ap * Math.sin(a), Math.cos(a), Math.sin(a)), 0, t.y0 + 0.3, 0.55, t.y1 - t.y0 - 0.65, 0.08, STONE, 'sucvTowerShade')
    }
  }
  const ph = Math.PI / 8
  const R1 = 2.9
  const d0 = 17.0
  const d1 = 21.0
  b.add(WHITE, loft([polyRing(8, R1, d0 - 0.3, ph, TX, Z0), polyRing(8, R1, d1, ph, TX, Z0)], { capTop: true, flat: true }))
  const ap1 = R1 * Math.cos(Math.PI / 8)
  const fw1 = 2 * R1 * Math.sin(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const m = faceM(TX + ap1 * Math.cos(a), Z0 + ap1 * Math.sin(a), Math.cos(a), Math.sin(a))
    if (i % 2 === 0) smallWindow(b, m, 0, d0 + 0.4, 0.5, 1.3)
    else niche(b, m, 0, d0 + 0.4, fw1 * 0.42, 1.3, 0.08, STONE, 'sucvTowerShade')
    for (const u of [-0.55, 0, 0.55]) niche(b, m, u, d1 - 1.05, 0.3, 0.7, 0.06, STONE, 'sucvTowerShade')
    const va = ph + (i * Math.PI) / 4
    b.add(STONE, metricBox(0.3, d1 - d0, 0.12), mat(TX + R1 * Math.cos(va), (d0 + d1) / 2, Z0 + R1 * Math.sin(va), Math.PI / 2 - va))
  }
  // wide flared eave and tall helm
  const hst = bell(4.3, d1 - 0.15, 68, 0.03, [
    [0.6, 14],
    [0.5, 30],
    [0.5, 48],
  ])
  seamedLoft(b, CU, hst.map(([r, y]) => polyRing(8, r, y, ph, TX, Z0)), 0.42)
  b.add(CU, loft([polyRing(8, 4.3, d1 - 0.32, ph, TX, Z0), polyRing(8, 4.3, d1 - 0.15, ph, TX, Z0)]))
  b.add(WOOD, loft([polyRing(8, R1 + 0.05, d1, ph, TX, Z0), polyRing(8, 4.28, d1 - 0.32, ph, TX, Z0)]))
  const apex = hst[hst.length - 1][1]
  b.add(CU, new THREE.SphereGeometry(0.16, 10, 8), mat(TX, apex + 0.05, Z0))
  cross(b, 'iron', TX, apex + 0.05, Z0, 2.2, true, Math.PI / 2)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-8, 15, 5],
  materials: () => ({
    sucvFresco: new THREE.MeshStandardMaterial({ color: '#76887f', roughness: 0.9 }),
    sucvWhite: new THREE.MeshStandardMaterial({ color: '#e6e1d4', roughness: 0.9 }),
    sucvFrame: new THREE.MeshStandardMaterial({ color: '#5d716c', roughness: 0.9 }),
    sucvShade: new THREE.MeshStandardMaterial({ color: '#6f857f', roughness: 0.92 }),
    sucvTowerShade: new THREE.MeshStandardMaterial({ color: '#cfc8b8', roughness: 0.92 }),
  }),
  notes: 'Painted Moldavian trefoil church with bell-cast roofs, two open porches and a star-based tower; size after the OSM eave outline, heights scaled from photographs; roofs shown in copper as the most likely surface of the copper supplied by COLOR METAL (the photographs show the shingle roofs).',
}
export default model
