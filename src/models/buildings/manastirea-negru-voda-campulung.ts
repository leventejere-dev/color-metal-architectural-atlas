/**
 * Mănăstirea Negru Vodă, Câmpulung – princely church „Adormirea Maicii
 * Domnului” (stone church of the 1820s), Str. Negru Vodă 64, jud. Argeș;
 * OSM way 381801793 (28.2 × 13.3 m).
 *
 * Modelling specification (real metres, origin = OSM outline centre, +X = OSM
 * long axis 95.9° towards the altar (east), +Z = south), from photographs 01
 * (west front, 2012), 02 (church and bell tower from the south, 2012) and 04
 * (west front, close); photo 03 shows the separate gate bell tower (not modelled):
 *  - Single-nave ashlar church 22.9 m + a polygonal east apse as wide as the
 *    nave (after the outline), 13.2 m wide; walls of coursed beige/ochre stone
 *    blocks ≈ 9 m high, a grey stone cornice band and an ochre eave fascia.
 *  - West front: stone-framed door under an inscription plaque, two shallow
 *    blind recesses beside it, two dark inscription panels higher up.
 *  - Low hipped roof (≈ 22°, ≈ 0.8 m eaves) following the apse polygon.
 *  - Two octagonal drums on the axis: a smaller west drum with tall round-headed
 *    blind arches and a moulded cornice, and a larger naos drum on a square base
 *    with a roof skirt and eight arched windows; both carry low, slightly bulbous
 *    domes with ornate crosses.
 *  - Metal: COLOR METAL supplied copper sheet and strip in 2020 according to its
 *    records, without naming the surfaces. The 2012 photographs predate the works
 *    (domes already green-patinated); the main roof, the domes, the drum cornices
 *    and the skirt are shown in weathered copper with standing seams ≈ 0.5 m.
 * Approximations: no published dimensions; heights scaled from photos 01/04
 * against the 13.3 m west front (walls ≈ 9 m, naos drum cross ≈ 23 m); the side
 * and east elevations are hidden by trees in the photographs and are
 * interpreted (plain ashlar with a few windows).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180
const UP = V(0, 1, 0)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'copperBrown'
const STONE = 'stoneWarm'
const DRUM = 'npDrum'
const BAND = 'stoneGrey'
const FASCIA = 'npFascia'

const XW = -14.0
const XE = 8.9 // apse centre / ridge end
const HW = 6.6
const KX = 0.77 // apse elongation (x / z)
const H = 9.0
const OV = 0.8
const TW = -8.0 // west drum
const TN = 3.0 // naos drum

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
function archPts(w: number, h: number, y0: number, seg = 8, u = 0) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(u - hw, y0), new THREE.Vector2(u + hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(u + Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
/** Plan ring: hipped west end, half-octagon east end (elongation KX); offset r from the ridge xW..XE. */
function planRing(xW: number, r: number, y: number) {
  const pts: THREE.Vector3[] = []
  for (const a of [-90, -45, 0, 45, 90]) pts.push(V(XE + r * KX * Math.cos(a * D2R), y, r * Math.sin(a * D2R)))
  pts.push(V(xW - r, y, r))
  pts.push(V(xW - r, y, -r))
  return pts
}
/** Wall outline ring (walls themselves, not offset from the ridge). */
function wallRing(grow: number, y: number) {
  const r = HW + grow
  const pts: THREE.Vector3[] = []
  for (const a of [-90, -45, 0, 45, 90]) pts.push(V(XE + r * KX * Math.cos(a * D2R), y, r * Math.sin(a * D2R)))
  pts.push(V(XW - grow, y, r))
  pts.push(V(XW - grow, y, -r))
  return pts
}
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, 8, u))), M(m, mat(0, 0, 0.03)))
  const s = new THREE.Shape(archPts(w + 0.4, h + 0.2, y0 - 0.2, 8, u))
  s.holes.push(new THREE.Path(archPts(w, h, y0, 8, u)))
  b.add('stoneLight', extrude(s, 0.12, 8), M(m, mat(0, 0, 0.01)))
}
/** Octagonal drum with arched recesses/windows, cornice and low bulbous dome. */
function drum(b: Builder, x: number, o: { y0: number; y1: number; R: number; windows: boolean; domeH: number; s: number }) {
  const ph = Math.PI / 8
  const P = (r: number, y: number) => polyRing(8, r, y, ph, x, 0)
  b.add(DRUM, loft([P(o.R, o.y0), P(o.R, o.y1)], { capTop: true, flat: true }))
  const ap = o.R * Math.cos(Math.PI / 8)
  const fw = 2 * o.R * Math.sin(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const m = faceM(x + Math.cos(a) * ap, Math.sin(a) * ap, Math.cos(a), Math.sin(a))
    const w = fw * 0.5
    const h = (o.y1 - o.y0) * 0.62
    const y = o.y1 - 0.75 - h
    b.add('npShade', new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y, 8))), M(m, mat(0, 0, 0.01)))
    if (o.windows) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(archPts(w * 0.62, h * 0.7, y + h * 0.12, 8))), M(m, mat(0, 0, 0.02)))
    else if (k % 2 === 0) b.add('glassC', metricBox(0.12, h * 0.5, 0.02), M(m, mat(0, y + h * 0.4, 0.02)))
    const va = ph + (k * Math.PI) / 4
    b.add(DRUM, metricBox(0.32, o.y1 - o.y0, 0.1), mat(x + o.R * Math.cos(va), (o.y0 + o.y1) / 2, o.R * Math.sin(va), Math.PI / 2 - va))
  }
  // moulded cornice (ochre outline) in two tiers
  b.add(DRUM, loft([P(o.R + 0.15, o.y1 - 0.05), P(o.R + 0.15, o.y1 + 0.25)], { capTop: true, capBottom: true, flat: true }))
  b.add(FASCIA, loft([P(o.R + 0.35, o.y1 + 0.25), P(o.R + 0.42, o.y1 + 0.55)], { capTop: true, capBottom: true, flat: true }))
  // low bulbous dome (octagonal, seamed)
  const rb = o.R + 0.2
  const prof: P2[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const r = t < 0.25 ? rb + 0.12 * Math.sin((t / 0.25) * (Math.PI / 2)) : (rb + 0.12) * Math.cos(((t - 0.25) / 0.75) * (Math.PI / 2)) ** 0.85
    prof.push([Math.max(0.12, r), o.y1 + 0.55 + o.domeH * t])
  }
  seamedLoft(b, CU, prof.map(([r, y]) => P(r, y)), 0.45)
  for (let k = 0; k < 8; k++) {
    const a = ph + (k * Math.PI) / 4
    for (let i = 0; i < prof.length - 1; i++) b.beam(CU, V(x + Math.cos(a) * prof[i][0], prof[i][1], Math.sin(a) * prof[i][0]), V(x + Math.cos(a) * prof[i + 1][0], prof[i + 1][1], Math.sin(a) * prof[i + 1][0]), 0.07, 0.06, V(Math.cos(a), 0, Math.sin(a)))
  }
  const top = o.y1 + 0.55 + o.domeH
  b.add(CU, lathe([[0.12, 0], [0.22, 0.15], [0.14, 0.35], [0.03, 0.45]], 10), mat(x, top - 0.05, 0))
  cross(b, 'iron', x, top + 0.3, 0, 1.5 * o.s, false, Math.PI / 2)
  // star finials on the cross arms (ornate crosses in the photos)
  for (const [dx, dy] of [[0, 1.12], [-0.42, 0.82], [0.42, 0.82]] as P2[]) b.add('iron', new THREE.OctahedronGeometry(0.13 * o.s, 0), mat(x, top + 0.3 + dy * 1.5 * o.s, dx * 1.5 * o.s, Math.PI / 4))
  return top
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  b.add(STONE, loft([wallRing(0, 0), wallRing(0, H)], { capTop: true, flat: true }))
  b.add(BAND, loft([wallRing(0.12, 0), wallRing(0.12, 0.45)], { capTop: true, flat: true }))
  b.add(BAND, loft([wallRing(0.06, H - 0.05), wallRing(0.06, H + 0.55)], { capTop: true, capBottom: true, flat: true }))

  /* ================= west front ================= */
  {
    const m = faceM(XW, 0, -1, 0)
    // door with moulded stone frame and inscription plaque
    b.add('black', metricBox(1.7, 3.0, 0.05), M(m, mat(0, 0.45 + 1.5, 0.02)))
    const fr = new THREE.Shape([new THREE.Vector2(-1.35, 0.45), new THREE.Vector2(1.35, 0.45), new THREE.Vector2(1.35, 3.95), new THREE.Vector2(0.6, 4.25), new THREE.Vector2(-0.6, 4.25), new THREE.Vector2(-1.35, 3.95)])
    fr.holes.push(new THREE.Path([new THREE.Vector2(-0.85, 0.45), new THREE.Vector2(0.85, 0.45), new THREE.Vector2(0.85, 3.45), new THREE.Vector2(-0.85, 3.45)]))
    b.add('stoneLight', extrude(fr, 0.16, 4), m)
    b.add('npPlaque', metricBox(2.6, 1.15, 0.08), M(m, mat(0, 5.1, 0.06)))
    b.add('stoneLight', metricBox(2.9, 1.4, 0.06), M(m, mat(0, 5.1, 0.02)))
    for (const u of [-2.6, 2.6]) b.add('npShade', metricBox(1.4, 3.6, 0.04), M(m, mat(u, 0.6 + 1.8, -0.0)))
    b.add('npPlaque', metricBox(0.9, 0.95, 0.05), M(m, mat(2.6, 2.2, 0.04)))
    for (const u of [-5.0, 5.0]) b.add('npPlaque', metricBox(2.6, 1.1, 0.06), M(m, mat(u, 6.6, 0.04)))
    // faint relieving arch in the masonry
    const s = new THREE.Shape()
    s.moveTo(4.6, 5.6)
    s.absarc(0, 3.6, 5.0, Math.asin(2 / 5.0), Math.PI - Math.asin(2 / 5.0), false)
    s.lineTo(-4.4, 5.6)
    s.absarc(0, 3.6, 4.8, Math.PI - Math.asin(2 / 4.8), Math.asin(2 / 4.8), true)
    b.add('npShade', extrude(s, 0.02, 16), M(m, mat(0, 0, 0.0)))
  }
  // side and apse windows (interpreted)
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * HW, 0, sz)
    for (const x of [-10.2, -2.6, 4.6]) win(b, m, sz * x, 3.6, 0.9, 2.2)
  }
  {
    const pE = V(XE + HW * KX, 0, 0)
    win(b, faceM(pE.x, 0, 1, 0), 0, 3.8, 0.8, 2.0)
  }

  /* ================= roof ================= */
  {
    const r0 = HW + OV
    const t = Math.tan(22 * D2R)
    const ye = H + 0.4
    const xW = XW + HW
    const ridge = ye + r0 * t
    seamedLoft(b, CU, [planRing(xW, r0, ye), planRing(xW, 0.01, ridge)])
    b.add(FASCIA, loft([planRing(xW, r0, ye - 0.3), planRing(xW, r0, ye)]))
    b.add('npSoffit', loft([wallRing(0.06, H + 0.55), planRing(xW, r0 - 0.02, ye - 0.3)]))
    b.beam(CU, V(xW, ridge + 0.04, 0), V(XE, ridge + 0.04, 0), 0.22, 0.12)
    // gutters and downpipes (copper)
    for (const sz of [-1, 1]) {
      b.beam(CU, V(XW - OV, ye - 0.12, sz * (r0 + 0.08)), V(XE, ye - 0.12, sz * (r0 + 0.08)), 0.18, 0.18)
      b.rod(CU, V(XW + 0.25, ye - 0.15, sz * (HW + 0.25)), V(XW + 0.25, 0.3, sz * (HW + 0.25)), 0.06, 6)
    }
  }

  /* ================= drums ================= */
  // naos drum on a square base with a roof skirt
  {
    b.block(DRUM, 6.2, 12.7 - 10.5, 6.2, TN, 10.5, 0)
    seamedLoft(b, CU, [rectRing(3.45, 3.45, 12.5, TN, 0), rectRing(2.9, 2.9, 13.1, TN, 0)], 0.45)
  }
  drum(b, TN, { y0: 12.7, y1: 18.0, R: 2.85, windows: true, domeH: 2.3, s: 1.2 })
  drum(b, TW, { y0: 11.0, y1: 15.5, R: 2.25, windows: false, domeH: 1.7, s: 1.05 })

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [3, 20, 0],
  materials: () => ({
    npDrum: new THREE.MeshStandardMaterial({ color: '#d9c4a8', roughness: 0.88 }),
    npShade: new THREE.MeshStandardMaterial({ color: '#c3ab8b', roughness: 0.9 }),
    npFascia: new THREE.MeshStandardMaterial({ color: '#c18a4e', roughness: 0.8 }),
    npSoffit: new THREE.MeshStandardMaterial({ color: '#b98652', roughness: 0.85 }),
    npPlaque: new THREE.MeshStandardMaterial({ color: '#2f3134', roughness: 0.5, metalness: 0.2 }),
  }),
  notes: 'Ashlar stone church with a polygonal apse, low hipped roof and two octagonal drums with low domes; heights scaled from the west-front photographs; roofs and domes shown in weathered copper supplied by COLOR METAL in 2020, as the 2012 photographs predate the works.',
}
export default model
