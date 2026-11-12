/**
 * Mănăstirea Dragomirna – church „Pogorârea Sfântului Duh” (1609), Mitocu Dragomirnei, jud. Suceava.
 *
 * Modelling specification derived from the two reference photographs (01: north
 * elevation across the lake, 02: oblique aerial from the south-west), the OSM
 * outline (way 867758612, 38.9 × 13.3 m incl. buttresses, long axis 131°) and
 * ro.wikipedia (length 35 m, width ≈ 9.5 m, height ≈ 42 m; nave-type plan with a
 * low porch, pronaos, naos with lateral apses inside the wall thickness and the
 * altar; polygonal apses at BOTH ends; octagonal tower; torsade belt at
 * mid-height; ogee arcades under the cornice; pilasters on buttresses), real metres:
 *  - Exceptionally tall and narrow stone body, 35 × 9.5 m, walls ≈ 16 m high,
 *    closed east (altar, +X) and west (porch) by five-sided polygonal apses.
 *  - Dressed-stone pilasters on stepped buttresses along both long sides and at
 *    the apse angles; rope (torsade) belt at mid-height; two registers of blind
 *    arcades under a moulded cornice (small arches over tall narrow niches);
 *    narrow arched windows; two ogee portals on the lateral façades of the porch.
 *  - Roof (COLOR METAL scope: copper sheet, seams ≈ 0.5 m): long hipped roof with polygonal
 *    west hip and a slight bell flare (ridge ≈ 20 m, crosses at the ridge ends
 *    and over the pronaos), a separate, slightly higher flared cone with cross
 *    over the altar apse (photo 02, 01).
 *  - Tower over the naos, just west of the altar cone: two stepped star bases
 *    with small arcades, tall octagonal carved shaft in three registers (rope
 *    rings, four tall windows, arcaded crown), broad bell-shaped copper helm
 *    with lantern and cross, total height ≈ 42 m.
 *  - Ensemble (low detail; copper since the 2010–2012 restoration per ro.wikipedia):
 *    enclosure walls with buttresses and a copper-roofed wall-walk, four corner
 *    towers and the gate tower with its side tower, north-east, north-west and
 *    south-west monastic ranges with hipped copper roofs (OSM wall, tower and
 *    range data; shapes from photos 01, 02).
 * Approximations: wall height and tower proportions scaled from photo 01 against
 * the published 42 m; north/south elevations treated as identical; carved
 * ornament reduced to mouldings and niche frames; both photographs predate the
 * 2010–2012 copper roofs, so the copper is shown in an aged dark-brown tone.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, rectRing, cross, hippedRoof, tentRoof, gableRoof } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

const CU = 'copperBrown'
const WALL = 'dragStone'
const DRESS = 'dragStoneL'
const SHADE = 'dragShade'
const WOOD = 'timber'

const H = 16.0 // wall top (cornice top)
const YE = 15.72 // roof eave edge
const OV = 0.9
const HW = 4.75 // half width
const XA = 12.75 // apse centres at ±XA (5-sided polygonal ends, radius HW)
const TX = 7.9 // tower axis (naos)
const DEC: P2[] = [-90, -54, -18, 18, 54, 90].map((a) => [Math.cos(a * D2R), Math.sin(a * D2R)] as P2)
const SQR: P2[] = (() => {
  const pts: P2[] = [[0, -1]]
  const rho = 0.5
  for (let i = 0; i <= 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * (Math.PI / 2)
    pts.push([1 - rho + rho * Math.cos(a), -1 + rho + rho * Math.sin(a)])
  }
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2)
    pts.push([1 - rho + rho * Math.cos(a), 1 - rho + rho * Math.sin(a)])
  }
  pts.push([0, 1])
  return pts
})()

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

function faceM(cx: number, cz: number, nx: number, nz: number, out = 0) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(UP, n)
  return new THREE.Matrix4().makeBasis(t, UP, n).setPosition(cx + n.x * out, 0, cz + n.z * out)
}

/** Outline of an ogee arch (w × h, bottom at y0): S-shaped head ending in a point. */
function ogeePts(w: number, h: number, y0: number, seg = 5) {
  const hw = w / 2
  const tip = y0 + h
  const ys = tip - 1.5 * hw
  const bez = (t: number) => {
    const u = 1 - t
    const x = u * u * u * hw + 3 * u * u * t * hw
    const y = u * u * u * ys + 3 * u * u * t * (ys + 0.6 * hw) + 3 * u * t * t * (tip - 0.7 * hw) + t * t * t * tip
    return new THREE.Vector2(x, y)
  }
  const pts = [new THREE.Vector2(-hw, y0), new THREE.Vector2(hw, y0)]
  for (let i = 0; i <= seg; i++) pts.push(bez(i / seg))
  for (let i = seg - 1; i >= 0; i--) {
    const p = bez(i / seg)
    pts.push(new THREE.Vector2(-p.x, p.y))
  }
  return pts
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
type Outline = (w: number, h: number, y0: number) => THREE.Vector2[]
/** Blind niche: shadowed recess panel + dressed-stone frame. */
function niche(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, f = 0.1, kind: Outline = archPts) {
  const s = new THREE.Shape(kind(w + 2 * f, h + 2 * f, y0 - f))
  s.holes.push(new THREE.Path(kind(w, h, y0)))
  b.add(DRESS, extrude(s, 0.08, 4), M(m, mat(u, 0, 0)))
  b.add(SHADE, new THREE.ShapeGeometry(new THREE.Shape(kind(w, h, y0))), M(m, mat(u, 0, 0.015)))
}
function windowArch(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  const s = new THREE.Shape(archPts(w + 0.36, h + 0.36, y0 - 0.18))
  s.holes.push(new THREE.Path(archPts(w, h, y0)))
  b.add(DRESS, extrude(s, 0.12, 4), M(m, mat(u, 0, 0)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0))), M(m, mat(u, 0, 0.02)))
}

/** Ring around the long axis: ends of unit shapes eE (east) / eW (west), half-width r. */
function axisRing(xW: number, xE: number, r: number, y: number, eW: P2[] = DEC, eE: P2[] = DEC) {
  const ring: THREE.Vector3[] = []
  for (const [ux, uz] of eE) ring.push(V(xE + r * ux, y, r * uz))
  for (const [ux, uz] of eW) ring.push(V(xW - r * ux, y, -r * uz))
  return ring
}
function bell(r0: number, y0: number, flare: P2[], finalDeg: number, rTop = 0): P2[] {
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

/** Stepped buttress under a pilaster at (px, pz), outward normal n. */
function buttress(b: Builder, px: number, pz: number, nx: number, nz: number, w = 1.1, d = 1.6, h = 4.2) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(n, UP).normalize()
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.2, 0),
    new THREE.Vector2(d, 0),
    new THREE.Vector2(d, h * 0.45),
    new THREE.Vector2(d * 0.62, h * 0.45 + 0.5),
    new THREE.Vector2(d * 0.62, h * 0.82),
    new THREE.Vector2(0.2, h),
    new THREE.Vector2(-0.2, h),
  ])
  const basis = new THREE.Matrix4().makeBasis(n, UP, t).setPosition(V(px, 0, pz).sub(t.clone().multiplyScalar(w / 2)))
  b.add(WALL, extrude(prof, w, 2), basis)
}

function starTier(b: Builder, s: number, y0: number, h: number) {
  for (const rot of [0, Math.PI / 4]) {
    b.add(WALL, metricBox(2 * s, h, 2 * s), mat(TX, y0 + h / 2, 0, rot))
    b.add(DRESS, metricBox(2 * s + 0.2, 0.22, 2 * s + 0.2), mat(TX, y0 + h - 0.11, 0, rot))
    b.add(CU, loft([rectRing(s + 0.18, s + 0.18, y0 + h), rectRing(s - 0.5, s - 0.5, y0 + h + 0.4)], { capTop: true, flat: true }), mat(TX, 0, 0, rot))
    for (let j = 0; j < 4; j++) {
      const a = rot + (j * Math.PI) / 2
      const m = faceM(TX + s * Math.cos(a), s * Math.sin(a), Math.cos(a), Math.sin(a))
      for (const u of [-0.72 * s, -0.5 * s, 0.5 * s, 0.72 * s]) niche(b, m, u, y0 + 0.3, 0.3, h - 0.9, 0.06)
    }
  }
}

/* ================= precinct: walls with covered wall-walks, towers, monastic ranges ================= */
// ro.wikipedia: the 2010–2012 restoration replaced the zinc-plated sheet of the monastery buildings,
// towers and wall-walks with copper sheet. Positions from OSM (city wall way 500861157, defensive-tower
// nodes at the four corners, city-gate node on the south-west wall, range way 1231452330) and the Esri
// imagery, converted to this model frame (+X = 131°); shapes from photos 01 (from the south-west, across
// the lake) and 02 (aerial). Low detail.
const PLAST = 'plasterWhite'
const WALLS: P2[] = [
  [-54.6, -39.67],
  [-57.78, 8.53],
  [-59.62, 36.46],
  [-59.71, 42.05],
  [2.77, 43.1],
  [45.98, 43.81],
  [41.51, -40.99],
  [14.22, -40.62],
]
const PIN: P2 = [-5, 1.5] // a point inside the precinct (outward normals)
const WT = 1.8 // wall thickness
const WW = 9.6 // wall-walk floor
const WG = 11.1 // wall-walk roof eave
const CSEAM = { key: CU, spacing: 0.6, h: 0.035, w: 0.04 }

/** Wall segment a→c with outer buttresses, a stone parapet + open timber gallery and a copper gable roof. */
function wallRun(b: Builder, a: P2, c: P2, clear: [number, number] = [6, 6]) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1])
  const d: P2 = [(c[0] - a[0]) / L, (c[1] - a[1]) / L]
  let n: P2 = [-d[1], d[0]]
  const mid: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]
  let ang = Math.atan2(d[1], d[0])
  if (n[0] * (mid[0] - PIN[0]) + n[1] * (mid[1] - PIN[1]) < 0) {
    n = [-n[0], -n[1]]
    ang += Math.PI // turn the local frame so that its +Z points outwards
  }
  // local frame: +X along the wall, +Z outwards
  const g = new Builder()
  const Lw = L + WT
  g.block(WALL, Lw, WW, WT, 0, 0, 0)
  g.block(DRESS, Lw, 0.5, WT + 0.3, 0, 0, 0)
  // outer parapet with loopholes, inner timber posts carrying the gallery roof
  g.block(WALL, Lw, WG - WW, 0.6, 0, WW, WT / 2 - 0.3)
  g.block(DRESS, Lw, 0.18, WT + 0.2, 0, WW - 0.18, 0)
  const np = Math.floor(L / 3)
  for (let i = 0; i <= np; i++) {
    const x = -L / 2 + (i * L) / np
    g.block(WOOD, 0.2, WG - WW, 0.2, x, WW, -WT / 2 + 0.15)
    if (i < np) g.add(SHADE, metricBox(0.25, 0.5, 0.05), mat(x + L / np / 2, WW + 0.7, WT / 2 + 0.01))
  }
  const ov = 0.45
  const hs = WT / 2 + ov
  const pitch = 28 * D2R
  const ey = WG
  const ry = WG + hs * Math.tan(pitch)
  for (const s of [-1, 1]) facet(g, CU, [V(-Lw / 2 - 0.3, ey, s * hs), V(Lw / 2 + 0.3, ey, s * hs), V(Lw / 2 + 0.3, ry, 0), V(-Lw / 2 - 0.3, ry, 0)], { seams: CSEAM, thickness: 0.1 })
  g.beam(CU, V(-Lw / 2 - 0.3, ry + 0.04, 0), V(Lw / 2 + 0.3, ry + 0.04, 0), 0.18, 0.1)
  b.merge(g, mat(mid[0], 0, mid[1], -ang))
  // outer buttresses (photos 01, 02)
  const nb = Math.max(0, Math.floor((L - clear[0] - clear[1]) / 13))
  for (let i = 0; i <= nb; i++) {
    if (nb === 0) break
    const s = clear[0] + ((L - clear[0] - clear[1]) * i) / nb
    const p: P2 = [a[0] + d[0] * s + n[0] * WT / 2, a[1] + d[1] * s + n[1] * WT / 2]
    buttress(b, p[0], p[1], n[0], n[1], 1.5, 2.2, 6.2)
  }
}

/** Square stone tower with a copper pyramid roof (photos 01, 02). */
function ptower(b: Builder, c: P2, hw: number, eave: number, rise: number, o: { ov?: number; cross?: number; gate?: boolean; ry?: number } = {}) {
  const g = new Builder()
  g.block(WALL, 2 * hw, eave, 2 * hw, 0, 0, 0)
  g.block(DRESS, 2 * hw + 0.4, 0.6, 2 * hw + 0.4, 0, 0, 0)
  g.block(DRESS, 2 * hw + 0.3, 0.35, 2 * hw + 0.3, 0, eave - 0.35, 0)
  const ov = o.ov ?? 0.8
  tentRoof(g, CU, { n: 4, r: hw * Math.SQRT2, y: eave, h: rise, phase: Math.PI / 4, overhang: ov * Math.SQRT2, seams: CSEAM })
  // soffit
  g.add(WOOD, loft([rectRing(hw, hw, eave - 0.02), rectRing(hw + ov, hw + ov, eave - (ov * rise) / hw - 0.04)]))
  for (let j = 0; j < 4; j++) {
    const a = (j * Math.PI) / 2
    const m = faceM(Math.cos(a) * hw, Math.sin(a) * hw, Math.cos(a), Math.sin(a))
    windowArch(g, m, 0, eave - 3.0, 0.6, 1.5)
    windowArch(g, m, hw * 0.35, eave * 0.45, 0.25, 0.9)
  }
  if (o.gate) {
    // gate passage through the tower (outer and inner faces along ±Z)
    for (const s of [-1, 1]) {
      const m = faceM(0, s * hw, 0, s)
      const fr = new THREE.Shape(archPts(4.3, 5.2, -0.2))
      fr.holes.push(new THREE.Path(archPts(3.2, 4.6, 0)))
      g.add(DRESS, extrude(fr, 0.2, 4), m)
      g.add(SHADE, new THREE.ShapeGeometry(new THREE.Shape(archPts(3.2, 4.6, 0))), M(m, mat(0, 0, 0.03)))
    }
  }
  const top = eave + rise
  if (o.cross) cross(g, 'iron', 0, top + 0.05, 0, o.cross, true, Math.PI / 2)
  b.merge(g, mat(c[0], 0, c[1], o.ry ?? 0))
}

/** Plastered monastic range with a hipped copper roof, two rows of windows, small dormers and chimneys. */
function prange(b: Builder, c: P2, deg: number, len: number, dep: number, eave: number, pitch: number, o: { dormerSide?: 1 | -1; floors?: number[]; chimneys?: number; sides?: number[] } = {}) {
  const g = new Builder()
  const hl = len / 2
  const hd = dep / 2
  g.block(PLAST, len, eave, dep, 0, 0, 0)
  g.block(DRESS, len + 0.24, 0.6, dep + 0.24, 0, 0, 0)
  g.block(DRESS, len + 0.4, 0.3, dep + 0.4, 0, eave - 0.3, 0)
  const ov = 0.6
  const top = hippedRoof(g, CU, { w: len, d: dep, y: eave, pitch, overhang: ov, seams: { key: CU, spacing: 0.5, h: 0.035, w: 0.04 } })
  g.add(WOOD, loft([rectRing(hl, hd, eave - 0.02), rectRing(hl + ov - 0.02, hd + ov - 0.02, eave - ov * Math.tan(pitch * D2R) - 0.03)]))
  // windows on both long façades
  const cnt = Math.floor((len - 3) / 3.2)
  for (const s of o.sides ?? [-1, 1]) {
    const m = faceM(0, s * hd, 0, s)
    for (let i = 0; i < cnt; i++) {
      const u = -hl + 1.5 + ((len - 3) * (i + 0.5)) / cnt
      for (const y0 of o.floors ?? [1.3, 4.8]) {
        g.add('glassC', metricBox(1.0, 1.45, 0.05), M(m, mat(u, y0 + 0.72, 0.02)))
        g.add(DRESS, metricBox(1.25, 0.12, 0.2), M(m, mat(u, y0 - 0.06, 0.06)))
      }
    }
  }
  // small gabled dormers on one slope
  if (o.dormerSide) {
    const t = Math.tan(pitch * D2R)
    const nd = Math.floor((len - 2 * hd - 2) / 5.5)
    for (let i = 0; i < nd; i++) {
      const x = -hl + hd + 1 + (len - 2 * hd - 2) * ((i + 0.5) / nd)
      const zd = o.dormerSide * (hd - 1.4)
      const yb = eave + 1.4 * t
      g.block(PLAST, 1.1, 1.0, 1.4, x, yb - 0.25, zd + o.dormerSide * 0.1)
      g.add('glassC', metricBox(0.55, 0.55, 0.04), mat(x, yb + 0.35, zd + o.dormerSide * 0.82))
      gableRoof(g, CU, { x, z: zd + o.dormerSide * 0.1, w: 1.1, d: 1.4, y: yb + 0.75, pitch: 45, ridge: 'z', overhang: 0.15, seams: false })
    }
  }
  for (let i = 0; i < (o.chimneys ?? 0); i++) {
    const x = -hl + hd + ((len - 2 * hd) * (i + 0.5)) / (o.chimneys ?? 1)
    g.block(PLAST, 0.7, 1.6, 0.7, x, top - 0.9, (i % 2 ? 1 : -1) * 0.9)
  }
  b.merge(g, mat(c[0], 0, c[1], -deg * D2R))
}

function precinct(b: Builder) {
  // walls between the towers (the gate tower splits the south-west wall)
  const W = WALLS
  wallRun(b, W[0], W[1], [7, 2])
  wallRun(b, W[1], W[2], [2, 2])
  wallRun(b, W[2], W[3], [0, 6])
  wallRun(b, W[3], W[4], [7, 7])
  wallRun(b, W[4], W[5], [10, 6])
  wallRun(b, W[5], W[6], [6, 6])
  wallRun(b, W[6], W[7], [6, 2])
  wallRun(b, W[7], W[0], [2, 7])
  // corner towers (OSM nodes); the north corner tower is the tall one (photo 01, imagery shadow)
  const swAng = -Math.atan2(W[5][1] - W[4][1], W[5][0] - W[4][0])
  ptower(b, W[0], 5.0, 21.0, 8.5, { cross: 1.8, ry: swAng })
  ptower(b, W[3], 4.6, 15.2, 5.6, { cross: 1.5, ry: swAng })
  ptower(b, W[5], 4.2, 14.6, 5.2, { cross: 1.5, ry: swAng })
  ptower(b, W[6], 4.2, 14.6, 5.2, { cross: 1.5, ry: swAng })
  // gate tower with a narrower stair tower beside it (photo 01)
  ptower(b, W[4], 4.6, 17.4, 5.8, { cross: 1.6, gate: true, ry: swAng })
  ptower(b, [W[4][0] + 7.4, W[4][1] + 0.12], 2.8, 17.4, 4.2, { ov: 0.6, ry: swAng })
  // monastic ranges (OSM range way 1231452330 and imagery): north-east range (two storeys, dormers towards
  // the courtyard), north-west range along the whole wall, south-west range east of the gate
  prange(b, [-15.45, -34.1], -0.79, 60.3, 11.0, 8.6, 42, { dormerSide: 1, chimneys: 6, sides: [1] })
  prange(b, [-51.0, 3.0], 93.8, 75.0, 11.0, 7.6, 42, { dormerSide: -1, chimneys: 6, sides: [-1] })
  prange(b, [25.3, 37.1], 0.94, 23.5, 10.8, 7.4, 42, { chimneys: 3, sides: [-1] })
}

function build(): Builder {
  const b = new Builder()

  /* ================= body ================= */
  b.add(WALL, loft([axisRing(-XA, XA, HW, 0), axisRing(-XA, XA, HW, H)], { capTop: true, flat: true }))
  b.add(DRESS, loft([axisRing(-XA, XA, HW + 0.4, 0), axisRing(-XA, XA, HW + 0.4, 0.55)], { capTop: true, flat: true }))
  b.add(DRESS, loft([axisRing(-XA, XA, HW + 0.2, 0.55), axisRing(-XA, XA, HW + 0.2, 1.1)], { capTop: true, flat: true }))
  // moulded cornice
  b.add(DRESS, loft([axisRing(-XA, XA, HW + 0.05, 15.35), axisRing(-XA, XA, HW + 0.32, 15.62), axisRing(-XA, XA, HW + 0.32, H)], { capTop: true, flat: true }))
  // torsade belt
  const belt = axisRing(-XA, XA, HW + 0.08, 7.9)
  for (let i = 0; i < belt.length; i++) b.rod(DRESS, belt[i], belt[(i + 1) % belt.length], 0.17, 8)

  /* ================= façade bays ================= */
  // panels between pilasters: straight sides (u along x) and the two apses
  type Panel = { m: THREE.Matrix4; w: number; x: number; z: number; nx: number; nz: number }
  const panels: Panel[] = []
  const pil: { x: number; z: number; nx: number; nz: number }[] = []
  const XS = [-XA, -8.5, -4.25, 0, 4.25, 8.5, XA]
  for (const sz of [-1, 1]) {
    for (let i = 0; i < XS.length; i++) {
      pil.push({ x: XS[i], z: sz * HW, nx: 0, nz: sz })
      if (i < XS.length - 1) {
        const xc = (XS[i] + XS[i + 1]) / 2
        panels.push({ m: faceM(xc, sz * HW, 0, sz), w: XS[i + 1] - XS[i], x: xc, z: sz * HW, nx: 0, nz: sz })
      }
    }
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const a = (-72 + i * 36) * D2R
      const ap = HW * Math.cos(18 * D2R)
      const nx = sx * Math.cos(a)
      const nz = Math.sin(a)
      const x = sx * XA + ap * nx
      const z = ap * nz
      panels.push({ m: faceM(x, z, nx, nz), w: 2 * HW * Math.sin(18 * D2R), x, z, nx, nz })
    }
    for (const a of [-54, -18, 18, 54]) pil.push({ x: sx * XA + HW * sx * Math.cos(a * D2R), z: HW * Math.sin(a * D2R), nx: sx * Math.cos(a * D2R), nz: Math.sin(a * D2R) })
  }
  // pilasters on stepped buttresses
  for (const p of pil) {
    const m = faceM(p.x, p.z, p.nx, p.nz)
    b.add(DRESS, metricBox(0.85, 15.3 - 1.1, 0.3), M(m, mat(0, 1.1 + (15.3 - 1.1) / 2, 0.12)))
    buttress(b, p.x, p.z, p.nx, p.nz)
  }
  // arcades, windows
  panels.forEach((p, idx) => {
    const free = p.w - 0.95
    const nTall = Math.max(2, Math.floor(free / 0.62))
    const nSmall = Math.max(2, Math.floor(free / 0.55))
    for (let i = 0; i < nTall; i++) niche(b, p.m, -free / 2 + (free * (i + 0.5)) / nTall, 11.3, 0.36, 2.9, 0.08, ogeePts)
    for (let i = 0; i < nSmall; i++) niche(b, p.m, -free / 2 + (free * (i + 0.5)) / nSmall, 14.45, 0.34, 0.75, 0.06, ogeePts)
    // a string course under the arcades
    b.add(DRESS, metricBox(free, 0.16, 0.12), M(p.m, mat(0, 10.95, 0.05)))
    const apse = Math.abs(p.nx) > 0.01
    if (apse ? Math.abs(p.nz) < 0.95 && p.nx > 0 : idx % 2 === 1) windowArch(b, p.m, 0, 4.6, 0.6, 2.3)
    if (!apse && idx % 2 === 0) windowArch(b, p.m, 0, 9.0, 0.5, 1.6)
  })
  // ogee portals on the lateral façades of the porch
  for (const sz of [-1, 1]) {
    const m = faceM(-10.6, sz * HW, 0, sz)
    const s = new THREE.Shape(ogeePts(2.1, 3.7, 1.1))
    s.holes.push(new THREE.Path(ogeePts(1.3, 3.0, 1.1)))
    b.add(DRESS, extrude(s, 0.22, 4), m)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(ogeePts(1.3, 3.0, 1.1))), M(m, mat(0, 0, 0.03)))
    b.add(DRESS, metricBox(2.6, 1.1, 1.4), M(m, mat(0, 0.55, 0.7)))
  }

  /* ================= roofs (copper) ================= */
  const r0 = HW + OV
  const flare: P2[] = [
    [0.4, 20],
    [0.3, 30],
  ]
  const xE = TX + 0.2
  const st = bell(r0, YE, flare, 38)
  const ringM = (r: number, y: number) => axisRing(-XA, xE, r, y, DEC, SQR)
  seamedLoft(b, CU, st.map(([r, y]) => ringM(r, y)))
  b.add(CU, loft([ringM(r0, YE - 0.18), ringM(r0, YE)]))
  b.add(WOOD, loft([axisRing(-XA, xE, HW + 0.3, H - 0.02, DEC, SQR), ringM(r0 - 0.02, YE - 0.18)]))
  const ridge = st[st.length - 1][1]
  b.beam(CU, V(-XA, ridge + 0.05, 0), V(xE, ridge + 0.05, 0), 0.22, 0.14)
  cross(b, 'iron', -XA, ridge, 0, 1.9, true, Math.PI / 2)
  cross(b, 'iron', -0.9, ridge, 0, 1.9, true, Math.PI / 2)
  // altar cone
  {
    const cs = bell(r0, YE, [
      [0.55, 20],
      [0.45, 32],
    ], 43, 0.03)
    seamedLoft(b, CU, cs.map(([r, y]) => polyRing(10, r, y, Math.PI / 10, XA, 0)))
    b.add(CU, loft([polyRing(10, r0, YE - 0.18, Math.PI / 10, XA, 0), polyRing(10, r0, YE, Math.PI / 10, XA, 0)]))
    const top = cs[cs.length - 1][1]
    b.add(CU, new THREE.SphereGeometry(0.2, 10, 8), mat(XA, top + 0.05, 0))
    cross(b, 'iron', XA, top + 0.1, 0, 1.9, true, Math.PI / 2)
  }

  /* ================= tower ================= */
  starTier(b, 3.05, 18.4, 1.7)
  starTier(b, 2.85, 20.1, 1.0)
  const ph = Math.PI / 8
  const R = 2.85
  const y0 = 21.0
  const y1 = 31.2
  b.add(WALL, loft([polyRing(8, R, y0, ph, TX, 0), polyRing(8, R, y1, ph, TX, 0)], { capTop: true, flat: true }))
  // rope rings and crown cornice
  for (const [y, h, g] of [
    [22.9, 0.35, 0.16],
    [28.9, 0.35, 0.16],
    [30.85, 0.4, 0.28],
  ] as [number, number, number][])
    b.add(DRESS, loft([polyRing(8, R + g, y, ph, TX, 0), polyRing(8, R + g, y + h, ph, TX, 0)], { capTop: true, capBottom: true, flat: true }))
  for (let i = 0; i < 8; i++) {
    const a = ph + (i * Math.PI) / 4
    b.rod(DRESS, V(TX + (R + 0.05) * Math.cos(a), y0, (R + 0.05) * Math.sin(a)), V(TX + (R + 0.05) * Math.cos(a), y1 - 0.4, (R + 0.05) * Math.sin(a)), 0.13, 6)
  }
  const ap = R * Math.cos(Math.PI / 8)
  const fw = 2 * R * Math.sin(Math.PI / 8)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const m = faceM(TX + ap * Math.cos(a), ap * Math.sin(a), Math.cos(a), Math.sin(a))
    if (i % 2 === 0) windowArch(b, m, 0, 24.0, 0.55, 3.4)
    else niche(b, m, 0, 24.0, 0.6, 3.4, 0.1, ogeePts)
    for (const u of [-fw * 0.3, 0, fw * 0.3]) {
      niche(b, m, u, 29.4, 0.38, 0.6, 0.05, ogeePts)
      niche(b, m, u, 30.15, 0.38, 0.55, 0.05, archPts)
    }
    niche(b, m, -fw * 0.22, 21.4, 0.42, 1.1, 0.06)
    niche(b, m, fw * 0.22, 21.4, 0.42, 1.1, 0.06)
  }
  // bell-shaped helm
  const helm: P2[] = [
    [4.3, 0],
    [3.6, 0.28],
    [3.0, 0.68],
    [2.62, 1.15],
    [2.46, 1.75],
    [2.44, 2.4],
    [2.32, 3.1],
    [1.98, 3.9],
    [1.47, 4.6],
    [0.86, 5.25],
    [0.4, 5.75],
    [0.3, 5.85],
  ]
  b.add(CU, lathe(helm, 32), mat(TX, y1, 0))
  b.add(CU, new THREE.TorusGeometry(2.56, 0.09, 6, 32), mat(TX, y1 + 1.35, 0, 0, Math.PI / 2))
  b.add(SHADE, lathe([
    [R + 0.15, 0.3],
    [3.3, 0.17],
    [4.3, -0.02],
  ], 32), mat(TX, y1, 0))
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    for (let i = 1; i < helm.length - 2; i++) {
      const [ra, ya] = helm[i]
      const [rb, yb] = helm[i + 1]
      b.beam(CU, V(TX + Math.cos(a) * (ra + 0.03), y1 + ya, Math.sin(a) * (ra + 0.03)), V(TX + Math.cos(a) * (rb + 0.03), y1 + yb, Math.sin(a) * (rb + 0.03)), 0.07, 0.05, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  // lantern / finial
  const fy = y1 + 5.85
  b.add(CU, lathe([
    [0.32, 0],
    [0.32, 1.2],
    [0.45, 1.3],
    [0.42, 1.55],
    [0.2, 1.75],
    [0.05, 1.85],
  ], 16), mat(TX, fy, 0))
  b.add(CU, new THREE.SphereGeometry(0.28, 12, 8), mat(TX, fy + 1.95, 0))
  cross(b, 'iron', TX, fy + 2.05, 0, 2.6, true, Math.PI / 2)

  /* ================= precinct (copper since 2010–2012) ================= */
  precinct(b)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-5, 18, 3.4],
  materials: () => ({
    dragStone: new THREE.MeshStandardMaterial({ color: '#cdb28a', roughness: 0.9 }),
    dragStoneL: new THREE.MeshStandardMaterial({ color: '#dcc7a2', roughness: 0.85 }),
    dragShade: new THREE.MeshStandardMaterial({ color: '#8f7455', roughness: 0.95 }),
  }),
  notes: 'Tall stone church with polygonal apses at both ends and an octagonal carved tower; copper roofs shown aged; heights scaled to the published 42 m; precinct walls with wall-walks, towers and ranges (copper since 2010–2012) included at low detail.',
}
export default model
