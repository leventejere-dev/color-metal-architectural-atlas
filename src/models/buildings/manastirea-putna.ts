/**
 * Mănăstirea Putna – church „Adormirea Maicii Domnului” (1466–1469, rebuilt
 * 1653–1662; roof redone 1902 after plans by K. Romstorfer), Putna, jud. Suceava.
 *
 * Modelling specification derived from the two reference photographs (01: high
 * oblique from the south-east, 02: ground view from the south-east), the OSM
 * entry (way 1078580325, long axis 69.5°, height tag 15 m) and the published
 * size of the church (≈ 37 × 11 m), real metres:
 *  - Moldavian trefoil church, altar to the east (+X): long western body (porch
 *    with two side doors, pronaos, burial chamber; 11 m wide), naos with two
 *    polygonal lateral apses under the tower, narrower five-sided altar apse.
 *  - White rendered walls with massive stepped dressed-stone buttresses at the
 *    apse angles and along the long sides; stone plinth; two registers divided
 *    by a twisted (torsade) string course: tall arched niches with stone-framed
 *    windows below, a blind arcade above (large arches on the apses, small
 *    arches on the long walls) under a stone cornice.
 *  - Roofs (COLOR METAL scope, copper; shown in the grey tone of the photographs;
 *    standing seams ≈ 0.5 m as photographed):
 *    steep hipped roof with a bell flare over the western body; separate flared
 *    cones with crosses over the altar and both lateral apses; a hipped naos roof
 *    carrying the tower base.
 *  - Tower over the naos: star-shaped base, wide octagonal lower stage with
 *    arched windows between corner pilasters, flared skirt roof, short upper
 *    drum with small windows, tall pointed octagonal helm with flared eave and
 *    cross.
 * Approximations: the OSM outline (46 × 21 m) is far larger than the published
 * 37 × 11 m and the photographed proportions, so the published size is used;
 * heights scaled from photo 02 (no survey; total ≈ 34 m); north elevation mirrored
 * from the south; buttress count, niche counts and window positions estimated;
 * painted and carved ornament omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

const CU = 'putnaCu'
const WALL = 'plasterWhite'
const STONE = 'putnaStone'
const WOOD = 'timber'

const H = 11.5 // wall top
const YE = 11.25 // eave edge
const OV = 1.3
const HW = 5.5 // western body / naos half width
const BODY = { x0: -18.5, x1: 10.6 }
const TX = 6.2 // naos centre = tower axis
const LAT = { z: 5.5, r: 3.4, n: 10 }
const ALT = { x0: 10.6, xc: 14.3, r: 4.2, n: 10 }
const FLARE: P2[] = [
  [0.7, 20],
  [0.5, 36],
]

/** Roof surface from stacked rings as planar facets with standing seams (≈0.5 m) running up each facet. */
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

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const UP = V(0, 1, 0)

function faceM(cx: number, cz: number, nx: number, nz: number) {
  const n = V(nx, 0, nz).normalize()
  return new THREE.Matrix4().makeBasis(V().crossVectors(UP, n), UP, n).setPosition(cx, 0, cz)
}
function archPts(w: number, h: number, y0: number, seg = 6) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(-hw, y0), new THREE.Vector2(hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
/** Arched niche: plaster frame band slightly proud of the wall + faint shadow panel. */
function niche(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, f = 0.12, key = 'putnaFrame') {
  const s = new THREE.Shape(archPts(w + 2 * f, h + 2 * f, y0 - f))
  s.holes.push(new THREE.Path(archPts(w, h, y0)))
  b.add(key, extrude(s, 0.09, 4), M(m, mat(u, 0, 0)))
  b.add('putnaShade', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0))), M(m, mat(u, 0, 0.012)))
}
/** Stone-framed rectangular window. */
function windowRect(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  const f = 0.2
  const s = new THREE.Shape([new THREE.Vector2(-w / 2 - f, y0 - f), new THREE.Vector2(w / 2 + f, y0 - f), new THREE.Vector2(w / 2 + f, y0 + h + f), new THREE.Vector2(-w / 2 - f, y0 + h + f)])
  s.holes.push(new THREE.Path([new THREE.Vector2(-w / 2, y0), new THREE.Vector2(w / 2, y0), new THREE.Vector2(w / 2, y0 + h), new THREE.Vector2(-w / 2, y0 + h)]))
  b.add(STONE, extrude(s, 0.12, 1), M(m, mat(u, 0, 0.02)))
  b.add('glassC', new THREE.PlaneGeometry(w, h), M(m, mat(u, y0 + h / 2, 0.04)))
}
/** Massive stepped dressed-stone buttress. */
function buttress(b: Builder, px: number, pz: number, nx: number, nz: number, w = 0.95, d = 1.3, h = 8.3) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(n, UP).normalize()
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.2, 0),
    new THREE.Vector2(d, 0),
    new THREE.Vector2(d, h * 0.42),
    new THREE.Vector2(d * 0.72, h * 0.42 + 0.45),
    new THREE.Vector2(d * 0.72, h * 0.8),
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
/** Ring around a ridge xW…xE at half width r; square hipped ends with corner radius rho (unit). */
function ridgeRing(xW: number, xE: number, r: number, y: number, rho = 0.25, seg = 2) {
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
  for (const [ux, uz] of end) ring.push(V(xE + r * ux, y, r * uz))
  for (const [ux, uz] of end) ring.push(V(xW - r * ux, y, -r * uz))
  return ring
}
/** Polygonal flared cone over an apse (ring of n sides, vertices at angle 0). */
function coneRoof(b: Builder, x: number, z: number, n: number, rWall: number, finalDeg: number, flare: P2[] = FLARE) {
  const r0 = rWall + OV
  const st = bell(r0, YE, finalDeg, 0.02, flare)
  seamedLoft(b, CU, st.map(([r, y]) => polyRing(n, r, y, 0, x, z)))
  b.add(CU, loft([polyRing(n, r0, YE - 0.16, 0, x, z), polyRing(n, r0, YE, 0, x, z)]))
  b.add(WOOD, loft([polyRing(n, rWall, H, 0, x, z), polyRing(n, r0 - 0.02, YE - 0.16, 0, x, z)]))
  return st[st.length - 1][1]
}
/** Façade bay decoration: lower tall niche (with window), upper arcade. */
function bay(b: Builder, m: THREE.Matrix4, w: number, apse: boolean, win: boolean) {
  const nw = Math.min(1.7, w * 0.55)
  niche(b, m, 0, 1.6, nw, 4.6)
  if (win) windowRect(b, m, 0, 3.1, Math.min(0.75, nw * 0.5), 1.35)
  if (apse) {
    const k = w > 2.6 ? 2 : 1
    for (let i = 0; i < k; i++) niche(b, m, (-w / 2 + 0.35) + ((w - 0.7) * (i + 0.5)) / k, 7.6, (w - 0.7) / k - 0.35, 2.6, 0.1)
  } else {
    const k = Math.max(1, Math.floor((w - 0.4) / 0.75))
    for (let i = 0; i < k; i++) niche(b, m, -w / 2 + 0.2 + ((w - 0.4) * (i + 0.5)) / k, 8.6, 0.42, 1.45, 0.08)
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bx = (BODY.x0 + BODY.x1) / 2
  const bl = BODY.x1 - BODY.x0
  b.block(WALL, bl, H, HW * 2, bx, 0, 0)
  b.block(STONE, bl + 0.4, 0.9, HW * 2 + 0.4, bx, 0, 0)
  for (const sz of [-1, 1]) {
    b.add(WALL, loft([polyRing(LAT.n, LAT.r, 0, 0, TX, sz * LAT.z), polyRing(LAT.n, LAT.r, H, 0, TX, sz * LAT.z)], { capTop: true, flat: true }))
    b.add(STONE, loft([polyRing(LAT.n, LAT.r + 0.2, 0, 0, TX, sz * LAT.z), polyRing(LAT.n, LAT.r + 0.2, 0.9, 0, TX, sz * LAT.z)], { capTop: true, flat: true }))
  }
  b.block(WALL, ALT.xc - ALT.x0 + 0.05, H, ALT.r * 2, (ALT.x0 + ALT.xc) / 2, 0, 0)
  b.block(STONE, ALT.xc - ALT.x0, 0.9, ALT.r * 2 + 0.4, (ALT.x0 + ALT.xc) / 2, 0, 0)
  b.add(WALL, loft([polyRing(ALT.n, ALT.r, 0, 0, ALT.xc, 0), polyRing(ALT.n, ALT.r, H, 0, ALT.xc, 0)], { capTop: true, flat: true }))
  b.add(STONE, loft([polyRing(ALT.n, ALT.r + 0.2, 0, 0, ALT.xc, 0), polyRing(ALT.n, ALT.r + 0.2, 0.9, 0, ALT.xc, 0)], { capTop: true, flat: true }))

  // torsade string course and stone cornice along every wall run
  const runs: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [] // a, b, outward normal
  for (const sz of [-1, 1]) {
    runs.push([V(BODY.x0, 0, sz * HW), V(TX - LAT.r, 0, sz * HW), V(0, 0, sz)])
    runs.push([V(TX + LAT.r, 0, sz * HW), V(BODY.x1, 0, sz * HW), V(0, 0, sz)])
  }
  runs.push([V(BODY.x0, 0, -HW), V(BODY.x0, 0, HW), V(-1, 0, 0)])
  for (const [a, c, n] of runs) {
    const o = n.clone().multiplyScalar(0.1)
    b.rod(STONE, a.clone().add(o).setY(6.9), c.clone().add(o).setY(6.9), 0.14, 6)
    b.beam(STONE, a.clone().add(n.clone().multiplyScalar(0.15)).setY(H - 0.25), c.clone().add(n.clone().multiplyScalar(0.15)).setY(H - 0.25), 0.3, 0.32)
  }
  const ringBand = (n: number, r: number, x: number, z: number) => {
    b.add(STONE, loft([polyRing(n, r + 0.1, 6.78, 0, x, z), polyRing(n, r + 0.1, 7.02, 0, x, z)], { capTop: true, capBottom: true, flat: true }))
    b.add(STONE, loft([polyRing(n, r + 0.15, H - 0.41, 0, x, z), polyRing(n, r + 0.15, H - 0.09, 0, x, z)], { capTop: true, capBottom: true, flat: true }))
  }
  ringBand(ALT.n, ALT.r, ALT.xc, 0)
  for (const sz of [-1, 1]) ringBand(LAT.n, LAT.r, TX, sz * LAT.z)

  /* ================= façade bays ================= */
  // long walls: bays between buttresses
  const BX = [BODY.x0, -12.5, -6.4, -0.6, 2.75]
  for (const sz of [-1, 1]) {
    for (let i = 0; i < BX.length - 1; i++) {
      const x0 = BX[i]
      const x1 = BX[i + 1]
      const sub = Math.max(1, Math.round((x1 - x0) / 2.9))
      for (let k = 0; k < sub; k++) {
        const xc = x0 + ((x1 - x0) * (k + 0.5)) / sub
        bay(b, faceM(xc, sz * HW, 0, sz), (x1 - x0) / sub - 0.6, false, !(i === 0 && k === 0))
      }
    }
    // porch side door
    const dm = faceM(-15.6, sz * HW, 0, sz)
    const s = new THREE.Shape(archPts(2.1, 3.5, 0.9))
    s.holes.push(new THREE.Path(archPts(1.4, 3.0, 0.9)))
    b.add(STONE, extrude(s, 0.2, 4), dm)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(archPts(1.4, 3.0, 0.9))), M(dm, mat(0, 0, 0.03)))
    b.add(STONE, metricBox(2.4, 0.9, 1.2), M(dm, mat(0, 0.45, 0.6)))
    for (const x of BX) buttress(b, x === BODY.x0 ? x + 0.6 : x, sz * HW, 0, sz)
    buttress(b, BODY.x1 - 0.5, sz * HW, 0, sz, 0.9, 1.1, 7.0)
  }
  // west façade
  {
    const m = faceM(BODY.x0, 0, -1, 0)
    for (const u of [-2.6, 0, 2.6]) bay(b, M(m, mat(u, 0, 0)), 2.3, false, u === 0)
    for (const sz of [-1, 1]) buttress(b, BODY.x0, sz * (HW - 0.6), -1, 0)
  }
  // apse facets
  const apse = (cx: number, cz: number, r: number, n: number, keep: (fx: number, fz: number) => boolean, butt: boolean) => {
    const ap = r * Math.cos(Math.PI / n)
    const fw = 2 * r * Math.sin(Math.PI / n)
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / n
      const fx = cx + ap * Math.cos(a)
      const fz = cz + ap * Math.sin(a)
      if (!keep(fx, fz)) continue
      bay(b, faceM(fx, fz, Math.cos(a), Math.sin(a)), fw - 0.9, true, true)
      const va = (i * 2 * Math.PI) / n
      const vx = cx + r * Math.cos(va)
      const vz = cz + r * Math.sin(va)
      if (butt && keep(vx, vz)) buttress(b, vx, vz, Math.cos(va), Math.sin(va))
    }
  }
  apse(ALT.xc, 0, ALT.r, ALT.n, (x) => x > ALT.xc + 0.2, true)
  for (const sz of [-1, 1]) apse(TX, sz * LAT.z, LAT.r, LAT.n, (_x, z) => sz * z > HW + 0.2, true)

  /* ================= roofs ================= */
  // western body: steep hipped roof, ridge into the tower base
  const r0 = HW + OV
  const xW = BODY.x0 - OV + r0
  const xE = 2.6
  const pst = bell(r0, YE, 54, 0)
  seamedLoft(b, CU, pst.map(([r, y]) => ridgeRing(xW, xE, r, y)))
  b.add(CU, loft([ridgeRing(xW, xE, r0, YE - 0.16), ridgeRing(xW, xE, r0, YE)]))
  b.add(WOOD, loft([ridgeRing(xW, xE, HW, H, 0.02), ridgeRing(xW, xE, r0 - 0.02, YE - 0.16)]))
  const ridge = pst[pst.length - 1][1]
  b.beam(CU, V(xW, ridge + 0.04, 0), V(xE, ridge + 0.04, 0), 0.22, 0.12)
  cross(b, 'iron', xW, ridge, 0, 1.8, true, Math.PI / 2)
  // naos: hipped roof carrying the tower base
  {
    const top = 3.2
    const hx0 = (BODY.x1 - 1.0 - TX) + OV
    const hz0 = HW + OV
    const sx = (hx0 - top) / (hz0 - top)
    const st = bell(hz0, YE, 58, top)
    seamedLoft(b, CU, st.map(([r, y]) => rectRing(top + (r - top) * sx, r, y, TX, 0)))
  }
  for (const sz of [-1, 1]) {
    // broad flared skirt over the whole apse, smaller steep cone on top (photos 01, 02)
    const top = coneRoof(b, TX, sz * LAT.z, LAT.n, LAT.r, 62, [
      [0.7, 20],
      [0.5, 32],
      [1.1, 26],
    ])
    cross(b, 'iron', TX, top, sz * LAT.z, 1.5, true, Math.PI / 2)
  }
  const altTop = coneRoof(b, ALT.xc, 0, ALT.n, ALT.r, 55)
  cross(b, 'iron', ALT.xc, altTop, 0, 1.8, true, Math.PI / 2)

  /* ================= tower ================= */
  // star base
  for (const rot of [0, Math.PI / 4]) {
    b.add(WALL, metricBox(7.0, 2.2, 7.0), mat(TX, 14.3 + 1.1, 0, rot))
    b.add(CU, loft([rectRing(3.75, 3.75, 16.45), rectRing(3.1, 3.1, 16.95)], { capTop: true, flat: true }), mat(TX, 0, 0, rot))
  }
  const ph = Math.PI / 8
  const R1 = 3.35
  const s0 = 16.6
  const s1 = 21.0
  b.add(WALL, loft([polyRing(8, R1, s0, ph, TX, 0), polyRing(8, R1, s1, ph, TX, 0)], { capTop: true, flat: true }))
  b.add(STONE, loft([polyRing(8, R1 + 0.15, s1 - 0.4, ph, TX, 0), polyRing(8, R1 + 0.15, s1, ph, TX, 0)], { capTop: true, capBottom: true, flat: true }))
  const ap1 = R1 * Math.cos(Math.PI / 8)
  const fw1 = 2 * R1 * Math.sin(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const m = faceM(TX + ap1 * Math.cos(a), ap1 * Math.sin(a), Math.cos(a), Math.sin(a))
    niche(b, m, 0, 17.4, fw1 * 0.62, 2.9, 0.12, STONE)
    if (i % 2 === 0) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(0.55, 1.7, 18.0))), M(m, mat(0, 0, 0.03)))
    const va = ph + (i * Math.PI) / 4
    b.add(STONE, metricBox(0.36, s1 - s0 - 0.4, 0.14), mat(TX + R1 * Math.cos(va), (s0 + s1 - 0.4) / 2, R1 * Math.sin(va), Math.PI / 2 - va))
  }
  // skirt roof
  b.add(CU, loft([polyRing(8, 4.15, s1 - 0.05, ph, TX, 0), polyRing(8, 3.6, s1 + 0.25, ph, TX, 0), polyRing(8, 2.0, s1 + 1.25, ph, TX, 0)], { capTop: true }))
  // upper drum
  const R2 = 1.95
  const u0 = s1 + 0.6
  const u1 = 24.1
  b.add(WALL, loft([polyRing(8, R2, u0, ph, TX, 0), polyRing(8, R2, u1, ph, TX, 0)], { capTop: true, flat: true }))
  b.add(STONE, loft([polyRing(8, R2 + 0.12, u1 - 0.3, ph, TX, 0), polyRing(8, R2 + 0.12, u1, ph, TX, 0)], { capTop: true, capBottom: true, flat: true }))
  const ap2 = R2 * Math.cos(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const m = faceM(TX + ap2 * Math.cos(a), ap2 * Math.sin(a), Math.cos(a), Math.sin(a))
    if (i % 2 === 0) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(0.42, 1.1, 22.4))), M(m, mat(0, 0, 0.03)))
      niche(b, m, 0, 22.4, 0.42, 1.1, 0.1, STONE)
    }
  }
  // pointed helm with flared eave
  const hst = bell(3.0, u1 - 0.1, 71, 0.02, [
    [0.4, 22],
    [0.3, 40],
  ])
  seamedLoft(b, CU, hst.map(([r, y]) => polyRing(8, r, y, ph, TX, 0)), 0.42)
  b.add(WOOD, loft([polyRing(8, R2 + 0.05, u1 - 0.02, ph, TX, 0), polyRing(8, 2.98, u1 - 0.16, ph, TX, 0)]))
  const apex = hst[hst.length - 1][1]
  b.add(CU, new THREE.SphereGeometry(0.2, 12, 8), mat(TX, apex + 0.05, 0))
  cross(b, 'iron', TX, apex + 0.1, 0, 2.3, true, Math.PI / 2)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-6, 15, 4],
  materials: (base) => {
    // COLOR METAL copper (KME reference booklet): the web photos predate the copper roofs, so the
    // roofs are shown in aged copper rather than in the grey tone of those older photographs
    const cu = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    return {
      putnaCu: cu,
      putnaStone: new THREE.MeshStandardMaterial({ color: '#cfc2a3', roughness: 0.88 }),
      putnaShade: new THREE.MeshStandardMaterial({ color: '#c6c0b2', roughness: 0.92 }),
      putnaFrame: new THREE.MeshStandardMaterial({ color: '#e2ddd0', roughness: 0.9 }),
    }
  },
  notes: 'Trefoil church with steep hipped roof, three apse cones and a two-stage tower; size after the published 37 × 11 m; roofs shown in COLOR METAL copper (the available photographs predate the copper roofs).',
}
export default model
