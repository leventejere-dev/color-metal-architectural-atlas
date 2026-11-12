/**
 * Castelul Daniel din Tălișoara / Daniel-kastély, Olasztelek — today Castle
 * Hotel Daniel (OSM way 365711775; manor of 1669, remodelled 1884).
 *
 * Modelling specification (real metres, origin = OSM footprint centre at
 * ground; +X = 68.6°, the direction of the main block's walls in the OSM
 * outline (6.2° off the outline's bounding-box axis), +Z = 158.6° = the front
 * with the timber loggia porch; the courtyard lies on −Z):
 *  - Plan after the OSM outline: west block 11 × 17.7 m (projecting 5.9 m into
 *    the courtyard), main block 11.8 m deep with the porch (5.8 × 3.1 m) on
 *    the front, and an east wing 10.8 m wide that leaves the main block at
 *    48° towards the courtyard side and ends in a gable (photo 02).
 *  - Two storeys, eaves ≈ 7.6 m, white render, red sandstone socle, windows
 *    with dark louvred shutters (round-headed on the courtyard side, photo 02),
 *    an oculus on the outer wing façade (photos 01, 03).
 *  - Steep (≈ 48–50°) orange clay-tile roofs: hipped over the west block,
 *    continuous over the main block and around the bend into the wing (hip on
 *    the outside, valley inside), gabled wing end with attic windows and a
 *    medallion; small roof vents, white chimneys (photos 01–03).
 *  - Front porch: white ground-floor arcade with round arches, carved dark
 *    timber loggia above and a steep tile gable roof with a decorated timber
 *    gable (photos 01, 03).
 *  - Courtyard gallery with red sandstone pillars, iron railing and a tile
 *    lean-to roof along the main block (photo 02).
 *  - COLOR METAL scope: brass sheet (KME, 2017) according to its records. The
 *    photographs show only clay-tile roofs, so the tiles are modelled as
 *    photographed and the brass is placed only where it plausibly belongs:
 *    half-round gutters, downpipes, chimney caps and flashings and the porch
 *    finial (photos 01–03 show brown metal gutters and downpipes).
 * Approximations: window distribution on the long façades (photos and OSM
 * disagree on the porch position; the OSM outline is followed), the bend
 * geometry of the roofs, loggia carving and gable ornament simplified, the
 * separate later annex and the garden walls are not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, prismOutline, hipRoof } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const H = 7.6 // eaves
const OV = 0.5
const FRONT = 9.2
const COURT = -2.63
const ZM = (FRONT + COURT) / 2 // main block axis
const HD = (FRONT - COURT) / 2 // main block half depth
const TP = Math.tan(48 * D2R)
const RIDGE = H + HD * TP // ≈ 48°
const EY = H - OV * TP
const WB = { x0: -21.8, x1: -10.75, z0: -8.5, z1: FRONT }
// east wing: axis direction u (−48.4°), outward normal n (towards the road side)
const U = V(Math.cos(-48.4 * D2R), 0, Math.sin(-48.4 * D2R))
const N = V(-U.z, 0, U.x) // (0.748, 0, 0.664)
const OUT_C = V(9.06, 0, FRONT) // outer corner front / wing
const IN_C = V(5.05, 0, COURT) // inner corner courtyard / wing
const P0 = V(7.03, 0, ZM) // ridge meeting point (on the wing centre line)
const WHW = 5.41 // wing half width
const WEND = 16.17 // wing end wall, along U from P0
const ROOF = 'tileRed'
const BR = 'danBrass'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const W = (s: number, t: number, y = 0) => P0.clone().add(U.clone().multiplyScalar(s)).add(N.clone().multiplyScalar(t)).setY(y)

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

/** Intersection (XZ) of two lines given by point + direction. */
function meet(p: THREE.Vector3, d: THREE.Vector3, q: THREE.Vector3, e: THREE.Vector3) {
  const den = d.x * e.z - d.z * e.x
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / den
  return V(p.x + d.x * t, 0, p.z + d.z * t)
}

/** Window with white frame, glazing bars and dark louvred shutters folded back. */
function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: 'rect' | 'round' = 'rect', shutters = true) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.03)))
  b.add('danFrame', extrude(frameShape(type, w, h, 0.08, 0, y0), 0.06), mul(m, mat(0, 0, 0.0)))
  b.add('danFrame', metricBox(0.06, h - 0.1, 0.04), mul(m, mat(0, y0 + (h - 0.1) / 2, 0.05)))
  b.add('danFrame', metricBox(w, 0.06, 0.04), mul(m, mat(0, y0 + h * 0.68, 0.05)))
  b.add('danSill', metricBox(w + 0.25, 0.06, 0.22), mul(m, mat(0, y0 - 0.06, 0.1)))
  if (shutters) {
    for (const s of [-1, 1]) {
      b.add('danShutter', metricBox(w / 2 + 0.02, h - (type === 'round' ? w / 2 : 0), 0.05), mul(m, mat(s * (w * 0.75 + 0.12), y0 + (h - (type === 'round' ? w / 2 : 0)) / 2, 0.06)))
      for (let y = y0 + 0.12; y < y0 + h - 0.1 - (type === 'round' ? w / 2 : 0); y += 0.14) b.add('danShutterL', metricBox(w / 2 - 0.06, 0.025, 0.03), mul(m, mat(s * (w * 0.75 + 0.12), y, 0.095)))
    }
  }
}

/** Frame on a wall: origin at point p on the wall, local +Z = outward normal (XZ), local X along the wall. */
function wallFrame(p: THREE.Vector3, normal: THREE.Vector3) {
  return mat(p.x, 0, p.z, Math.atan2(normal.x, normal.z))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const outEnd = W(WEND, WHW)
  const inEnd = W(WEND, -WHW)
  const wb: [number, number][] = [[WB.x0, WB.z0], [WB.x1, WB.z0], [WB.x1, WB.z1], [WB.x0, WB.z1]]
  const mb: [number, number][] = [[WB.x1 - 0.2, COURT], [IN_C.x, IN_C.z], [OUT_C.x, OUT_C.z], [WB.x1 - 0.2, FRONT]]
  const wg: [number, number][] = [[IN_C.x, IN_C.z], [inEnd.x, inEnd.z], [outEnd.x, outEnd.z], [OUT_C.x, OUT_C.z]]
  for (const o of [wb, mb, wg]) {
    prismOutline(b, 'danWall', o, 0, H)
    // red sandstone socle and eaves moulding
    const grow = (g: number) => {
      const cx = o.reduce((a, p) => a + p[0], 0) / o.length
      const cz = o.reduce((a, p) => a + p[1], 0) / o.length
      return o.map(([x, z]) => {
        const dx = x - cx
        const dz = z - cz
        const L = Math.hypot(dx, dz)
        return [x + (dx / L) * g * 1.3, z + (dz / L) * g * 1.3] as [number, number]
      })
    }
    prismOutline(b, 'danSocle', grow(0.05), 0, 0.65)
    prismOutline(b, 'danSill', grow(0.12), H - 0.3, 0.3)
  }

  /* ================= roofs ================= */
  // west block: hipped, ridge along Z, ridge height matched to the main roof
  {
    const w = WB.x1 - WB.x0 + 2 * OV
    const d = WB.z1 - WB.z0 + 2 * OV
    const pitch = Math.atan((RIDGE - EY) / (w / 2))
    const r = hipRoof((WB.x0 + WB.x1) / 2, (WB.z0 + WB.z1) / 2, w, d, EY, pitch)
    for (const f of r.facets) facet(b, ROOF, f, { thickness: 0.16 })
    for (const [p, q] of r.lines) beam(b, 'danTileCap', p.clone().add(V(0, 0.07, 0)), q.clone().add(V(0, 0.07, 0)), 0.26, 0.15)
    const c = [V(WB.x0 - OV, EY, WB.z0 - OV), V(WB.x1 + OV, EY, WB.z0 - OV), V(WB.x1 + OV, EY, WB.z1 + OV), V(WB.x0 - OV, EY, WB.z1 + OV)]
    for (let i = 0; i < 4; i++) {
      if (i === 1) continue // east eave hidden by the main block roof
      b.rod(BR, c[i].clone().add(V(0, -0.12, 0)), c[(i + 1) % 4].clone().add(V(0, -0.12, 0)), 0.08, 8)
    }
  }
  // main block + wing (hip on the outer side of the bend, valley on the inner side)
  {
    const xW = (WB.x0 + WB.x1) / 2
    const outE = meet(V(0, 0, FRONT + OV), V(1, 0, 0), OUT_C.clone().add(N.clone().multiplyScalar(OV)), U).setY(EY)
    const inE = meet(V(0, 0, COURT - OV), V(1, 0, 0), IN_C.clone().add(N.clone().multiplyScalar(-OV)), U).setY(EY)
    const rm = P0.clone().setY(RIDGE)
    const endR = W(WEND + 0.45, 0, RIDGE)
    const endO = W(WEND + 0.45, WHW + OV, EY)
    const endI = W(WEND + 0.45, -WHW - OV, EY)
    facet(b, ROOF, [V(xW, EY, FRONT + OV), outE, rm, V(xW, RIDGE, ZM)], { thickness: 0.16 })
    facet(b, ROOF, [V(xW, EY, COURT - OV), inE, rm, V(xW, RIDGE, ZM)], { thickness: 0.16 })
    facet(b, ROOF, [outE, endO, endR, rm], { thickness: 0.16 })
    facet(b, ROOF, [inE, endI, endR, rm], { thickness: 0.16 })
    beam(b, 'danTileCap', V(xW, RIDGE + 0.07, ZM), rm.clone().add(V(0, 0.07, 0)), 0.3, 0.18)
    beam(b, 'danTileCap', rm.clone().add(V(0, 0.07, 0)), endR.clone().add(V(0, 0.07, 0)), 0.3, 0.18)
    beam(b, 'danTileCap', outE.clone().add(V(0, 0.07, 0)), rm.clone().add(V(0, 0.07, 0)), 0.28, 0.16)
    beam(b, BR, inE.clone().add(V(0, 0.04, 0)), rm.clone().add(V(0, 0.04, 0)), 0.4, 0.04) // valley flashing
    // verges of the gable end
    for (const p of [endO, endI]) beam(b, 'danTileCap', p.clone().add(U.clone().multiplyScalar(0.03)).add(V(0, 0.05, 0)), endR.clone().add(V(0, 0.05, 0)), 0.22, 0.22, U)
    // gable wall
    const gs = new THREE.Shape([new THREE.Vector2(-WHW, H - 0.01), new THREE.Vector2(WHW, H - 0.01), new THREE.Vector2(0, RIDGE - 0.1)])
    const ge = W(WEND, 0)
    const gm = wallFrame(ge, U)
    b.add('danWall', extrude(gs, 0.4), mul(gm, mat(0, 0, -0.4)))
    b.add('danSill', metricBox(2 * WHW + 0.3, 0.2, 0.25), mul(gm, mat(0, H - 0.1, 0.05)))
    // attic: two small round-headed windows and a medallion (photo 02)
    for (const u of [-0.9, 0.9]) win(b, mul(gm, mat(u, 0, 0)), 0.55, 1.3, 8.6, 'round', false)
    b.add('danSill', new THREE.TorusGeometry(0.42, 0.08, 6, 20), mul(gm, mat(0, 11.0, 0.05)))
    b.add('danWall', new THREE.CircleGeometry(0.36, 20), mul(gm, mat(0, 11.0, 0.03)))
    // brass gutters
    const g = (p: THREE.Vector3, q: THREE.Vector3) => b.rod(BR, p.clone().add(V(0, -0.12, 0)), q.clone().add(V(0, -0.12, 0)), 0.08, 8)
    g(V(WB.x1 + OV, EY, FRONT + OV), outE)
    g(outE, endO)
    g(V(WB.x1 + OV, EY, COURT - OV), inE)
    g(inE, endI)
  }

  /* ================= windows ================= */
  {
    const fm = (x: number) => mat(x, 0, FRONT, 0)
    for (const x of [-17.6, -12.6, 1.4, 5.6]) {
      win(b, fm(x), 1.15, 1.6, 1.4)
      win(b, fm(x), 1.15, 1.75, 4.6)
    }
    // west face (4 bays)
    for (const z of [-5.6, -1.4, 2.8, 6.8]) {
      const m = mat(WB.x0, 0, z, -Math.PI / 2)
      win(b, m, 1.15, 1.6, 1.4)
      win(b, m, 1.15, 1.75, 4.6)
    }
    // courtyard faces: west block (one big round-headed window upstairs), main block (round-headed)
    win(b, mat(-16.3, 0, WB.z0, Math.PI), 1.3, 2.3, 4.4, 'round')
    win(b, mat(-16.3, 0, WB.z0, Math.PI), 1.0, 1.4, 1.5)
    for (const x of [-8.6, -4.6, -0.6, 3.2]) win(b, mat(x, 0, COURT, Math.PI), 1.15, 2.0, 4.5, 'round')
    for (const x of [-8.0, -2.4, 2.6]) win(b, mat(x, 0, COURT, Math.PI), 1.0, 1.45, 1.4, 'rect', false)
    b.add('danDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.2, 2.3, 0, 0.65))), mat(-5.4, 0, COURT - 0.03, Math.PI))
    // outer wing façade (road side): bays + oculus (photos 01, 03)
    const ow = (s: number) => wallFrame(W(s, WHW), N)
    for (const s of [-0.6, 2.4, 5.4, 11.4, 14.4]) {
      win(b, ow(s), 1.15, 1.75, 4.6)
      if (s !== 2.4) win(b, ow(s), 1.15, 1.6, 1.4)
    }
    b.add('glassC', new THREE.CircleGeometry(0.4, 20), mul(ow(8.4), mat(0, 2.3, 0.03)))
    b.add('danSill', new THREE.TorusGeometry(0.45, 0.08, 6, 20), mul(ow(8.4), mat(0, 2.3, 0.05)))
    win(b, ow(8.4), 1.15, 1.75, 4.6)
    // inner wing façade and gable end (photo 02)
    const iw = (s: number) => wallFrame(W(s, -WHW), N.clone().negate())
    for (const s of [6.5, 10.5, 14.0]) {
      win(b, iw(s), 1.1, 1.75, 4.6, 'round')
      win(b, iw(s), 1.1, 1.5, 1.4)
    }
    const em = wallFrame(W(WEND, 0), U)
    for (const u of [-2.4, 2.4]) {
      win(b, mul(em, mat(u, 0, 0)), 1.1, 1.8, 4.5, 'round')
      win(b, mul(em, mat(u, 0, 0)), 1.1, 1.5, 1.4)
    }
    // string course on the wing (photo 02)
    for (const [p, nrm, L] of [[W(WEND / 2, WHW), N, WEND], [W(WEND / 2, -WHW), N.clone().negate(), WEND], [W(WEND, 0), U, 2 * WHW]] as [THREE.Vector3, THREE.Vector3, number][]) {
      b.add('danSill', metricBox(L, 0.16, 0.12), mul(wallFrame(p, nrm), mat(0, 3.6, 0.04)))
    }
  }

  /* ================= front porch: arcade + timber loggia ================= */
  {
    const x0 = -7.45
    const x1 = -1.65
    const xc = (x0 + x1) / 2
    const z0 = FRONT
    const z1 = 12.3
    const pw = x1 - x0
    const floor = 3.7
    // masonry piers and arches (3 arches on the front, one on each side)
    const pier = (x: number, z: number) => b.block('danWall', 0.62, floor, 0.62, x, 0, z)
    for (const x of [x0 + 0.31, xc - 0.95, xc + 0.95, x1 - 0.31]) pier(x, z1 - 0.31)
    for (const x of [x0 + 0.31, x1 - 0.31]) pier(x, z0 + 0.4)
    const spandrel = (m: THREE.Matrix4, w: number) => {
      // wall piece between a round arch (springing 2.3 m) and the loggia floor
      const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, floor), new THREE.Vector2(w / 2, floor)]
      for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector2((w / 2) * Math.cos((i / 12) * Math.PI), 2.3 + (w / 2) * Math.sin((i / 12) * Math.PI) * 0.85))
      b.add('danWall', extrude(new THREE.Shape(pts), 0.6), mul(m, mat(0, 0, -0.6)))
    }
    for (const [u0, u1] of [[x0 + 0.62, xc - 1.26], [xc - 0.64, xc + 0.64], [xc + 1.26, x1 - 0.62]]) spandrel(mat((u0 + u1) / 2, 0, z1, 0), u1 - u0)
    for (const x of [x0 + 0.31, x1 - 0.31]) spandrel(mat(x, 0, (z0 + 0.71 + z1 - 0.62) / 2, Math.PI / 2), z1 - 0.62 - z0 - 0.71)
    b.block('danSill', pw + 0.3, 0.25, z1 - z0 + 0.15, xc, floor, (z0 + z1) / 2 + 0.07)
    // steps
    for (let i = 0; i < 3; i++) b.block('danSocle', 2.6, 0.18 * (3 - i), 0.35, xc, 0, z1 + 0.18 + i * 0.35)
    b.add('danDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.5, 0, 0.6, 10))), mat(xc, 0, z0 + 0.02, 0))
    // timber loggia
    const ly = floor + 0.25
    const lt = 6.9
    for (const x of [x0 + 0.15, xc - 1.0, xc + 1.0, x1 - 0.15]) b.block('danTimber', 0.2, lt - ly, 0.2, x, ly, z1 - 0.12)
    for (const x of [x0 + 0.15, x1 - 0.15]) b.block('danTimber', 0.2, lt - ly, 0.2, x, ly, z0 + 0.3)
    // balustrade with carved boards
    b.block('danTimber', pw, 0.95, 0.08, xc, ly, z1 - 0.08)
    for (const x of [x0 + 0.05, x1 - 0.05]) b.block('danTimber', 0.08, 0.95, z1 - z0 - 0.2, x, ly, (z0 + z1) / 2 + 0.05)
    for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.32) b.block('danTimberL', 0.12, 0.6, 0.03, x, ly + 0.18, z1 - 0.02)
    b.block('danTimber', pw + 0.1, 0.1, 0.18, xc, ly + 0.95, z1 - 0.08)
    // carved arches between the posts (front: one wide central arch, two side arches)
    const archBoard = (cx: number, w: number, z: number, ry: number, rise: number) => {
      const s = new THREE.Shape()
      s.moveTo(-w / 2, 0)
      s.lineTo(-w / 2, rise + 0.35)
      s.lineTo(w / 2, rise + 0.35)
      s.lineTo(w / 2, 0)
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI
        s.lineTo((w / 2) * Math.cos(a), rise * Math.sin(a))
      }
      b.add('danTimber', extrude(s, 0.1), mul(mat(cx, lt - rise - 0.35, z, ry), mat(0, 0, -0.05)))
    }
    archBoard(xc, 2.0, z1 - 0.12, 0, 1.0)
    for (const x of [(x0 + xc - 1.0) / 2, (x1 + xc + 1.0) / 2]) archBoard(x, xc - 1.0 - x0 - 0.15, z1 - 0.12, 0, 0.7)
    for (const x of [x0 + 0.15, x1 - 0.15]) archBoard(x, z1 - z0 - 0.45, (z0 + z1) / 2 + 0.09, Math.PI / 2, 0.8)
    b.block('danTimber', pw + 0.2, 0.22, 0.25, xc, lt - 0.1, z1 - 0.12)
    // steep tile gable roof with the decorated timber gable
    const pt = Math.tan(56 * D2R)
    const o = 0.45
    const rr = lt + (pw / 2 + o) * pt
    const zF = z1 + 0.55
    const zB = 4.9
    for (const s of [-1, 1]) {
      facet(b, ROOF, [V(xc + s * (pw / 2 + o), lt, zB), V(xc + s * (pw / 2 + o), lt, zF), V(xc, rr, zF), V(xc, rr, zB)], { thickness: 0.14, hint: V(s, 1, 0) })
      beam(b, 'danTimber', V(xc + s * (pw / 2 + o), lt - 0.05, zF + 0.02), V(xc, rr + 0.05, zF + 0.02), 0.32, 0.12, V(0, 0, 1))
      b.rod(BR, V(xc + s * (pw / 2 + o), lt - 0.12, zF), V(xc + s * (pw / 2 + o), lt - 0.12, FRONT + OV), 0.07, 8)
    }
    beam(b, 'danTileCap', V(xc, rr + 0.06, zF), V(xc, rr + 0.06, zB), 0.26, 0.16)
    const tri = new THREE.Shape([new THREE.Vector2(-pw / 2 - 0.1, 0), new THREE.Vector2(pw / 2 + 0.1, 0), new THREE.Vector2(0, (pw / 2 + 0.1) * pt)])
    b.add('danTimber', extrude(tri, 0.12), mat(xc, lt, zF - 0.3))
    // geometric carving: rosettes and diagonal boards on the gable
    for (const [u, v] of [[0, 1.0], [-1.0, 0.5], [1.0, 0.5], [0, 2.3], [-0.55, 1.65], [0.55, 1.65], [0, 3.3]] as [number, number][]) {
      b.add('danTimberL', new THREE.TorusGeometry(0.22, 0.04, 4, 12), mat(xc + u, lt + v, zF - 0.16))
      b.add('danTimberL', metricBox(0.05, 0.4, 0.03), mat(xc + u, lt + v, zF - 0.16))
    }
    for (const s of [-1, 1]) beam(b, 'danTimberL', V(xc + s * 1.9, lt + 0.15, zF - 0.16), V(xc, lt + 3.9, zF - 0.16), 0.08, 0.04, V(0, 0, 1))
    // brass finial on the gable
    b.rod(BR, V(xc, rr, zF - 0.1), V(xc, rr + 1.1, zF - 0.1), 0.03, 6)
    b.add(BR, new THREE.SphereGeometry(0.1, 10, 8), mat(xc, rr + 0.55, zF - 0.1))
  }

  /* ================= courtyard gallery ================= */
  {
    const xa = WB.x1 + 0.1
    const xb = IN_C.x - 0.2
    const zo = COURT - 2.6
    const ph = 2.75
    for (let x = xa + 0.3; x <= xb - 0.2; x += (xb - xa - 0.5) / 7) {
      b.block('danSocle', 0.45, ph, 0.45, x, 0.3, zo + 0.25)
      b.block('danSocle', 0.6, 0.3, 0.6, x, 0, zo + 0.25)
      b.block('danSocle', 0.6, 0.15, 0.6, x, 0.3 + ph, zo + 0.25)
    }
    b.block('danSocle', xb - xa, 0.3, 2.6, (xa + xb) / 2, 0, COURT - 1.3)
    b.block('danTimber', xb - xa + 0.4, 0.25, 0.3, (xa + xb) / 2, 0.45 + ph, zo + 0.25)
    // iron railing between the pillars
    b.block('iron', xb - xa, 0.04, 0.04, (xa + xb) / 2, 1.2, zo + 0.25)
    for (let x = xa + 0.2; x < xb; x += 0.18) b.block('iron', 0.02, 0.9, 0.02, x, 0.3, zo + 0.25)
    // lean-to tile roof
    const yIn = 4.15
    const yOut = 3.25
    facet(b, ROOF, [V(xa, yOut, zo - 0.5), V(xb + 0.3, yOut, zo - 0.5), V(xb + 0.3, yIn, COURT), V(xa, yIn, COURT)], { thickness: 0.12 })
    b.rod(BR, V(xa, yOut - 0.1, zo - 0.5), V(xb + 0.3, yOut - 0.1, zo - 0.5), 0.07, 8)
  }

  /* ================= chimneys, vents, downpipes ================= */
  for (const [x, z] of [[-16.3, 1.0], [-5.6, ZM], [3.2, ZM]] as [number, number][]) {
    const base = RIDGE - 1.6
    b.block('danWall', 0.85, RIDGE + 1.3 - base, 0.85, x, base, z)
    b.block('danSill', 1.05, 0.18, 1.05, x, RIDGE + 1.3, z)
    b.block(BR, 0.95, 0.06, 0.95, x, RIDGE + 1.48, z)
  }
  {
    const c = W(5.0, 0)
    b.block('danWall', 0.85, 2.9, 0.85, c.x, RIDGE - 1.6, c.z)
    b.block('danSill', 1.05, 0.18, 1.05, c.x, RIDGE + 1.3, c.z)
    b.block(BR, 0.95, 0.06, 0.95, c.x, RIDGE + 1.48, c.z)
  }
  // small eyebrow vents on the main slopes
  for (const [x, s] of [[-12.5, 1], [0.5, 1], [-3.0, -1], [-14.0, -1]] as [number, number][]) {
    const z = s > 0 ? FRONT - 1.6 : COURT + 1.6
    const y = RIDGE - Math.abs(z - ZM) * TP
    b.block('black', 0.45, 0.22, 0.12, x, y + 0.05, z + s * 0.05)
    b.block(ROOF, 0.7, 0.12, 0.5, x, y + 0.27, z)
  }
  // brass downpipes at the corners
  for (const p of [V(WB.x0 - 0.15, 0, FRONT + 0.15), V(WB.x0 - 0.15, 0, WB.z0 - 0.15), V(OUT_C.x + 0.15, 0, FRONT + 0.15), W(WEND - 0.2, WHW + 0.15), W(WEND - 0.2, -WHW - 0.15), V(-12.2, 0, FRONT + 0.15), V(WB.x1 + 0.3, 0, COURT - 0.15)])
    b.rod(BR, V(p.x, 0.5, p.z), V(p.x, EY - 0.1, p.z), 0.06, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-4.5, 9.5, 12.6],
  materials: (base) => ({
    // weathered KME brass (brown, as the gutters and downpipes appear in the photographs)
    danBrass: (() => {
      const m = (base.brass as THREE.MeshStandardMaterial).clone()
      m.color.set('#a07c4e')
      m.roughness = 0.42
      return m
    })(),
    danWall: new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.9 }),
    danSill: new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.86 }),
    danSocle: new THREE.MeshStandardMaterial({ color: '#b48c78', roughness: 0.9 }),
    danFrame: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.7 }),
    danShutter: new THREE.MeshStandardMaterial({ color: '#4a2c1c', roughness: 0.7 }),
    danShutterL: new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 0.7 }),
    danDoor: new THREE.MeshStandardMaterial({ color: '#4b3020', roughness: 0.7 }),
    danTimber: new THREE.MeshStandardMaterial({ color: '#4d3121', roughness: 0.78 }),
    danTimberL: new THREE.MeshStandardMaterial({ color: '#6a4630', roughness: 0.78 }),
    danTileCap: new THREE.MeshStandardMaterial({ color: '#c0592c', roughness: 0.82 }),
  }),
  notes:
    'Daniel manor (Castle Hotel Daniel), Tălișoara: two-storey block with a west block and a bent wing, steep clay-tile roofs, porch with a carved timber loggia and a courtyard gallery; the KME brass is shown only on gutters, downpipes, flashings and the porch finial because the photographs show tile roofs.',
}
export default model
