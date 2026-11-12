/**
 * Biserica „Sfântul Mare Mucenic Gheorghe”, Str. Mihai Viteazul 7, Mangalia —
 * neo-Byzantine church (1915-1929) restored 2019-2021; natural titanium-zinc
 * roofs and domes by COLOR METAL (2020, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 110° towards the altar apse (ESE); west front at −X):
 *  - Footprint after OSM way 200056166: 26.4 × 13.6 m, three-sided east apse.
 *  - West porch (X −13.2 → −10.0): four stout columns on tall bases, three round
 *    arches on the front, one on each side, hipped zinc standing-seam roof with
 *    timber rafter ends (photos 01, 03).
 *  - Pronaos block (X −10.0 → −1.6, cornice ≈ 11 m): two square tower bases at
 *    the west corners (4.6 m, mosaic panels, cornice ≈ 14.6 m); between them the
 *    raised round-arched west gable with archivolts, a medallion and two narrow
 *    windows, with a barrel roof behind it; matching arched gables on the north
 *    and south sides (photos 02, 04); rows of small arched mosaic icons and tall
 *    mosaic panels on the walls.
 *  - West belfries: octagonal drums (3.6 m across flats) with an arched recessed
 *    panel, a slit louvre and an arched cornice on every face; eight-lobed
 *    bell-shaped domes in natural zinc with light seam ribs, ornate crosses
 *    (cross top ≈ 24 m).
 *  - Naos (X −1.6 → 9.8, eaves ≈ 9.5 m) with low hipped zinc roofs; square base
 *    and a larger octagonal drum (≈ 6 m) with arched windows and arched cornices,
 *    eight-lobed zinc dome (cross top ≈ 25.5 m).
 *  - East apse: three-sided, two tiers of arched windows/mosaics, hipped roof.
 *  - METAL as photographed in Oct 2021 (right after the restoration): natural
 *    light-grey titanium-zinc on the domes (segmented, diamond shingles — shown
 *    lobed with seam ribs), porch roof and the low roofs (standing seam ≈ 0.5 m).
 * Approximations: heights scaled from photo proportions (no measured heights),
 * plan depth of the pronaos and the hidden east/south details interpreted,
 * diamond-shingle texture of the domes simplified, mosaics shown as flat panels.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const WALL = 'plasterWhite'
const TRIM = 'mgTrim'
const MOS = 'mgMosaic'
const D2R = Math.PI / 180

const HW = 6.8
const PORCH = { x0: -13.2, x1: -10.0, hw: 4.2, colH: 3.6 }
const PRON = { x0: -10.0, x1: -1.6, cornice: 11.0 }
const TWR = { d: 4.6, top: 14.6 } // tower base side and top
const NAOS = { x0: -1.6, x1: 9.8, eave: 9.5 }
const APSE = { x0: 9.8, xe: 13.2, he: 2.9 }
const CT = { x: 3.6, base: 7.2, baseTop: 12.6, a: 3.0, y1: 18.6 } // central tower
const WT = { a: 1.8, y0: TWR.top, y1: 20.1 } // west drums (apothem)

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function arched(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, glass = 'glassC', f = 0.14) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, u, y0), 0.1, 10), M(m, mat(0, 0, 0.01)))
}

/** Eight-lobed bell dome (lathe with lobes between 8 meridian ribs). */
function lobedDome(b: Builder, x: number, z: number, y0: number, r: number, h: number) {
  const prof: [number, number][] = [
    [1.0, 0],
    [1.03, 0.08],
    [1.0, 0.2],
    [0.93, 0.38],
    [0.8, 0.56],
    [0.6, 0.72],
    [0.36, 0.86],
    [0.15, 0.96],
    [0.09, 1.0],
  ]
  const seg = 48
  const pos: number[] = []
  const idx: number[] = []
  const f = (phi: number) => 0.92 + 0.08 * Math.abs(Math.sin(4 * phi))
  for (let i = 0; i < prof.length; i++) {
    for (let j = 0; j <= seg; j++) {
      const phi = (j / seg) * Math.PI * 2
      const rr = r * prof[i][0] * (i === 0 ? 1 : f(phi))
      pos.push(x + Math.cos(phi) * rr, y0 + prof[i][1] * h, z + Math.sin(phi) * rr)
    }
  }
  for (let i = 0; i < prof.length - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j
      const c = a + seg + 1
      idx.push(a, c, a + 1, a + 1, c, c + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  b.add('mgDomeZinc', g)
  // rib flashings along the lobe valleys + horizontal shingle courses
  for (let k = 0; k < 8; k++) {
    const phi = (k / 8) * Math.PI * 2
    const d = V(Math.cos(phi), 0, Math.sin(phi))
    for (let i = 1; i < prof.length - 1; i++) {
      const r0 = r * prof[i][0] * 0.92 + 0.02
      const r1 = r * prof[i + 1][0] * 0.92 + 0.02
      b.beam('mgZincLight', V(x + d.x * r0, y0 + prof[i][1] * h, z + d.z * r0), V(x + d.x * r1, y0 + prof[i + 1][1] * h, z + d.z * r1), 0.07, 0.05, d)
    }
  }
  // eave lip + horizontal shingle courses (diamond zinc shingles, simplified)
  b.add(ZN, new THREE.TorusGeometry(r * 1.0, 0.06, 6, 48), mat(x, y0 + 0.02, z, 0, Math.PI / 2))
  for (let i = 1; i < prof.length - 2; i++) {
    for (const t of [0.0, 0.5]) {
      const r0 = r * (prof[i][0] * (1 - t) + prof[i + 1][0] * t) * 0.965
      const yy = y0 + (prof[i][1] * (1 - t) + prof[i + 1][1] * t) * h
      b.add('mgZincLight', new THREE.TorusGeometry(r0, 0.022, 3, 40), mat(x, yy, z, 0, Math.PI / 2))
    }
  }
  // knob + cross
  const top = y0 + h
  b.add(ZN, new THREE.CylinderGeometry(0.1 * r, 0.14 * r, 0.35, 12), mat(x, top + 0.17, z))
  b.add(ZN, new THREE.SphereGeometry(0.16 * r, 12, 8), mat(x, top + 0.42, z))
  return top + 0.5
}

/** Ornate Orthodox cross with trefoil ends and ball chains omitted (s = height). */
function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('mgIron', metricBox(t, s, t), mat(0, s / 2, 0))
  g.add('mgIron', metricBox(s * 0.6, t, t), mat(0, s * 0.72, 0))
  g.add('mgIron', metricBox(s * 0.36, t * 0.8, t), mat(0, s * 0.88, 0))
  g.add('mgIron', metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.35, 0, 0, 0, 0.3))
  for (const [px, py] of [[0, s], [-s * 0.3, s * 0.72], [s * 0.3, s * 0.72]] as [number, number][]) g.add('mgIron', new THREE.TorusGeometry(s * 0.06, t * 0.35, 6, 12), mat(px, py, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/**
 * Octagonal drum with an arched recessed panel on each face, an arched cornice
 * (semicircular gablet per face) and a moulded base. a = apothem.
 */
function drum(b: Builder, x: number, z: number, a: number, y0: number, y1: number, opts: { glass: string; ow: number; oh: number; louvres?: boolean }) {
  const R = a / Math.cos(Math.PI / 8)
  const fw = 2 * a * Math.tan(Math.PI / 8)
  prism(b, WALL, { x, z, n: 8, r: R, y0, h: y1 - y0 })
  ringBand(b, TRIM, { x, z, n: 8, r: R, y: y0, h: 0.45, grow: 0.12 })
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4
    const m = wallAt(x + Math.cos(ang) * a, z + Math.sin(ang) * a, ang)
    // arched gablet on top of the face
    const hr = fw / 2
    const arc: THREE.Vector2[] = []
    for (let i = 0; i <= 12; i++) arc.push(new THREE.Vector2(Math.cos((i / 12) * Math.PI) * hr, y1 + Math.sin((i / 12) * Math.PI) * hr * 0.75))
    b.add(WALL, extrude(new THREE.Shape([new THREE.Vector2(-hr, y1 - 0.01), ...arc.reverse()]), a * 0.5), M(m, mat(0, 0, -a * 0.5)))
    const band: THREE.Vector2[] = []
    for (let i = 0; i <= 12; i++) band.push(new THREE.Vector2(Math.cos((i / 12) * Math.PI) * (hr + 0.06), y1 + Math.sin((i / 12) * Math.PI) * (hr * 0.75 + 0.06)))
    for (let i = 12; i >= 0; i--) band.push(new THREE.Vector2(Math.cos((i / 12) * Math.PI) * (hr - 0.18), y1 + Math.sin((i / 12) * Math.PI) * (hr * 0.75 - 0.18)))
    b.add(TRIM, extrude(new THREE.Shape(band), 0.14), M(m, mat(0, 0, 0)))
    // recessed arched panel framing the opening
    b.add(TRIM, extrude(frameShape('round', fw - 0.5, y1 - y0 - 1.0, 0.1, 0, y0 + 0.65), 0.08, 10), M(m, mat(0, 0, 0.01)))
    arched(b, m, 0, y0 + (y1 - y0 - opts.oh) / 2 + 0.2, opts.ow, opts.oh, opts.glass, 0.08)
    if (opts.louvres) for (let y = y0 + (y1 - y0 - opts.oh) / 2 + 0.35; y < y0 + (y1 - y0 + opts.oh) / 2 - opts.ow / 2; y += 0.2) b.add('mgDark', metricBox(opts.ow * 0.95, 0.04, 0.12), M(m, mat(0, y, 0.07, 0, 0.5)))
  }
  return { R, top: y1 + fw * 0.375 }
}

/** Round-arched gable wall (semicircle on top of the cornice) + archivolts; m at the outer wall face. */
function archGable(b: Builder, m: THREE.Matrix4, hs: number, ySpring: number, depth: number, rise = 1.0) {
  const arc = (rr: number, ry: number) => {
    const p: THREE.Vector2[] = []
    for (let i = 0; i <= 20; i++) p.push(new THREE.Vector2(Math.cos((i / 20) * Math.PI) * rr, ySpring + Math.sin((i / 20) * Math.PI) * ry))
    return p
  }
  b.add(WALL, extrude(new THREE.Shape([new THREE.Vector2(-hs, ySpring - 0.6), new THREE.Vector2(hs, ySpring - 0.6), ...arc(hs, hs * rise)]), depth), M(m, mat(0, 0, -depth)))
  for (const [g, w, d] of [[0.05, 0.4, 0.22], [-0.7, 0.2, 0.12], [-1.05, 0.14, 0.08]] as [number, number, number][]) {
    const o = arc(hs + g + w / 2, hs * rise + g + w / 2)
    const i = arc(hs + g - w / 2, hs * rise + g - w / 2).reverse()
    b.add(TRIM, extrude(new THREE.Shape([...o, ...i]), d), m)
  }
}

/** barrel roof along local axis 'dir' ('x' or 'z') with seams, springing at y, span 2*hs. */
function barrel(b: Builder, cx: number, cz: number, len: number, hs: number, y: number, rise: number, dir: 'x' | 'z') {
  const segs = 12
  for (let i = 0; i < segs; i++) {
    const t0 = Math.PI - (i / segs) * Math.PI
    const t1 = Math.PI - ((i + 1) / segs) * Math.PI
    const p = (t: number, s: number) => {
      const u = Math.cos(t) * (hs + 0.25)
      const v = y + Math.sin(t) * (rise + 0.25)
      return dir === 'x' ? V(cx + s * len / 2, v, cz + u) : V(cx + u, v, cz + s * len / 2)
    }
    const nrm = dir === 'x' ? V(0, Math.sin((t0 + t1) / 2), Math.cos((t0 + t1) / 2)) : V(Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2), 0)
    facet(b, ZN, [p(t0, -1), p(t0, 1), p(t1, 1), p(t1, -1)], { seams: { ...SEAM, margin: 0.05 }, hint: nrm, thickness: 0.08 })
  }
}

function hipRoofRect(b: Builder, cx: number, cz: number, w: number, d: number, y: number, pitch: number) {
  const t = Math.tan(pitch * D2R)
  const hw = w / 2
  const hd = d / 2
  const c00 = V(cx - hw, y, cz - hd)
  const c10 = V(cx + hw, y, cz - hd)
  const c11 = V(cx + hw, y, cz + hd)
  const c01 = V(cx - hw, y, cz + hd)
  let fs: THREE.Vector3[][]
  let ls: [THREE.Vector3, THREE.Vector3][]
  if (w >= d) {
    const r1 = V(cx - (hw - hd), y + hd * t, cz)
    const r2 = V(cx + (hw - hd), y + hd * t, cz)
    fs = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    ls = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    const r1 = V(cx, y + hw * t, cz - (hd - hw))
    const r2 = V(cx, y + hw * t, cz + (hd - hw))
    fs = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    ls = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of fs) facet(b, ZN, f, { seams: SEAM, thickness: 0.1 })
  for (const [a, c] of ls) b.beam(ZN, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.16, 0.1)
}

function build(): Builder {
  const b = new Builder()

  /* ================= pronaos block with tower bases ================= */
  {
    const px = (PRON.x0 + PRON.x1) / 2
    const pl = PRON.x1 - PRON.x0
    b.block(WALL, pl, PRON.cornice, 2 * HW, px, 0, 0)
    b.block(TRIM, pl + 0.2, 0.8, 2 * HW + 0.2, px, 0, 0)
    // main cornice (two-step) and string course
    b.block(TRIM, pl + 0.5, 0.25, 2 * HW + 0.5, px, PRON.cornice - 0.5, 0)
    b.block(TRIM, pl + 0.8, 0.25, 2 * HW + 0.8, px, PRON.cornice - 0.25, 0)
    b.block(TRIM, pl + 0.15, 0.18, 2 * HW + 0.15, px, 7.4, 0)
    // tower bases (square upper stage with mosaic panels)
    const tx = PRON.x0 + TWR.d / 2
    for (const sz of [-1, 1]) {
      const tz = sz * (HW - TWR.d / 2)
      const h = TWR.top - PRON.cornice
      b.block(WALL, TWR.d, h, TWR.d, tx, PRON.cornice, tz)
      b.block(TRIM, TWR.d + 0.5, 0.22, TWR.d + 0.5, tx, TWR.top - 0.45, tz)
      b.block(TRIM, TWR.d + 0.8, 0.25, TWR.d + 0.8, tx, TWR.top - 0.25, tz)
      b.block(ZN, TWR.d + 0.85, 0.05, TWR.d + 0.85, tx, TWR.top, tz)
      // landscape mosaics on the outer faces
      const faces: [Face, number, number][] = [
        ['-x', PRON.x0, tz],
        [sz > 0 ? '+z' : '-z', tz + sz * TWR.d / 2, sz > 0 ? tx : -tx],
        ['+x', tx + TWR.d / 2, -tz],
      ]
      for (const [f, plane, u] of faces) {
        const m = faceFrame(f, plane, u, 0, 0)
        b.add(MOS, metricBox(TWR.d - 1.0, 1.5, 0.04), M(m, mat(0, PRON.cornice + 1.6, 0.03)))
        b.add(TRIM, extrude(frameShape('rect', TWR.d - 1.0, 1.5, 0.08, 0, PRON.cornice + 0.85), 0.06), M(m, mat(0, 0, 0.01)))
      }
      // drum, dome, cross
      const d = drum(b, tx, tz, WT.a, WT.y0, WT.y1, { glass: 'mgDark', ow: 0.45, oh: 3.0, louvres: true })
      const top = lobedDome(b, tx, tz, d.top - 0.25, d.R + 0.15, 1.75)
      orthoCross(b, tx, top, tz, 1.9)
    }
    // west arched gable between the towers (barrel roof behind) and N/S arched gables
    const gx = PRON.x0
    const gHs = HW - TWR.d
    archGable(b, faceFrame('-x', gx, 0, 0, 0), gHs, PRON.cornice, 0.8, 1.15)
    const nsX = (PRON.x0 + TWR.d + PRON.x1) / 2
    const nsHs = (PRON.x1 - PRON.x0 - TWR.d) / 2
    for (const sz of [-1, 1]) archGable(b, faceFrame(sz > 0 ? '+z' : '-z', sz * HW, sz > 0 ? nsX : -nsX, 0, 0), nsHs, PRON.cornice, 0.8, 1.15)
    barrel(b, (PRON.x0 + PRON.x1) / 2 + 0.4, 0, PRON.x1 - PRON.x0 - 0.2, gHs, PRON.cornice, gHs * 1.15, 'x')
    barrel(b, nsX, 0, 2 * HW - 0.2, nsHs, PRON.cornice, nsHs * 1.15, 'z')
    // west gable contents: medallion + two narrow arched windows
    const fw = faceFrame('-x', gx, 0, 0, 0)
    b.add(MOS, new THREE.CircleGeometry(0.42, 20), M(fw, mat(0, 12.25, 0.06)))
    b.add(TRIM, new THREE.TorusGeometry(0.46, 0.07, 6, 20), M(fw, mat(0, 12.25, 0.08)))
    for (const u of [-0.75, 0.75]) arched(b, fw, u, 8.0, 0.45, 2.4, 'glassC', 0.1)
    for (const u of [-1.5, 0, 1.5]) b.add(TRIM, metricBox(0.32, 2.8, 0.14), M(fw, mat(u, 9.0, 0.07)))
    // rows of small arched mosaic icons under the cornice (west + sides)
    const icons = (m: THREE.Matrix4, u0: number, u1: number, n: number, y: number) => {
      const s = (u1 - u0) / n
      for (let i = 0; i < n; i++) {
        const u = u0 + s * (i + 0.5)
        b.add(MOS, new THREE.ShapeGeometry(new THREE.Shape(opening('round', s * 0.72, 1.55, u, y, 8))), M(m, mat(0, 0, 0.03)))
        b.add(TRIM, extrude(frameShape('round', s * 0.72, 1.55, 0.07, u, y), 0.06, 8), M(m, mat(0, 0, 0.01)))
      }
    }
    for (const sz of [-1, 1]) {
      const zc = sz * (HW - TWR.d / 2)
      icons(fw, zc - TWR.d / 2 + 0.35, zc + TWR.d / 2 - 0.35, 5, 8.25)
      // tall mosaic panel flanking the porch + a narrow window
      arched(b, fw, sz * (HW - 1.2), 1.3, 1.3, 3.6, MOS, 0.12)
      b.add(TRIM, extrude(frameShape('rect', 0.35, 3.0, 0.12, sz * (HW - 3.3), 1.6), 0.06), M(fw, mat(0, 0, 0.01)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.35, 3.0, sz * (HW - 3.3), 1.6))), M(fw, mat(0, 0, 0.02)))
      // sides of the pronaos
      const sf = faceFrame(sz > 0 ? '+z' : '-z', sz * HW, 0, 0, 0)
      const ut = sz > 0 ? tx : -tx
      icons(sf, ut - TWR.d / 2 + 0.35, ut + TWR.d / 2 - 0.35, 5, 8.25)
      for (const du of [-0.9, 0.9]) arched(b, sf, ut + du, 1.4, 1.1, 3.6, MOS, 0.1)
      const un = sz > 0 ? nsX : -nsX
      for (const du of [-0.9, 0.9]) arched(b, sf, un + du, 8.2, 0.9, 1.7, MOS, 0.08)
      for (const du of [-0.9, -0.3, 0.3, 0.9]) {
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.32, 3.0, un + du, 1.8))), M(sf, mat(0, 0, 0.02)))
        b.add(TRIM, extrude(frameShape('rect', 0.32, 3.0, 0.06, un + du, 1.8), 0.05), M(sf, mat(0, 0, 0.01)))
      }
      for (const du of [-0.6, 0, 0.6]) arched(b, sf, un + du, PRON.cornice + 0.3, 0.3, 1.5, 'glassC', 0.07)
    }
  }

  /* ================= porch ================= */
  {
    const { x0, x1, hw, colH } = PORCH
    const px = (x0 + x1) / 2
    const base = 0.45
    b.block(TRIM, x1 - x0 + 0.6, base, 2 * hw + 0.6, px - 0.2, 0, 0)
    for (let i = 0; i < 2; i++) b.block(TRIM, 0.4, base * (1 - (i + 1) / 3), 4.0, x0 - 0.3 - i * 0.4, 0, 0)
    const cz = [-3.3, -1.1, 1.1, 3.3]
    const yA = base + 0.9 + colH
    for (const z of cz) {
      b.block(TRIM, 0.95, 0.9, 0.95, x0 + 0.5, base, z)
      b.add(WALL, new THREE.CylinderGeometry(0.34, 0.36, colH - 0.5, 16), mat(x0 + 0.5, base + 0.9 + (colH - 0.5) / 2, z))
      b.block(TRIM, 0.95, 0.5, 0.95, x0 + 0.5, base + 0.9 + colH - 0.5, z)
    }
    for (const z of [-3.3, 3.3]) {
      b.block(TRIM, 0.95, 0.9, 0.95, x1 - 0.5, base, z)
      b.add(WALL, new THREE.CylinderGeometry(0.34, 0.36, colH - 0.5, 16), mat(x1 - 0.5, base + 0.9 + (colH - 0.5) / 2, z))
      b.block(TRIM, 0.95, 0.5, 0.95, x1 - 0.5, base + 0.9 + colH - 0.5, z)
    }
    // arcaded front & sides (wall with round arch openings)
    const shape = new THREE.Shape([new THREE.Vector2(-hw, yA - 0.85), new THREE.Vector2(hw, yA - 0.85), new THREE.Vector2(hw, yA + 1.7), new THREE.Vector2(-hw, yA + 1.7)])
    for (let i = 0; i < 3; i++) shape.holes.push(new THREE.Path(opening('round', 1.5, 1.65, (cz[i] + cz[i + 1]) / 2, yA - 0.86, 12)))
    b.add(WALL, extrude(shape, 0.6), mat(x0 + 0.8, 0, 0, -Math.PI / 2))
    for (let i = 0; i < 3; i++) b.add(TRIM, extrude(frameShape('round', 1.5, 1.65, 0.16, (cz[i] + cz[i + 1]) / 2, yA - 0.86), 0.1, 12), mat(x0 + 0.2, 0, 0, -Math.PI / 2))
    for (const sz of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(x0 + 0.2, yA - 0.85), new THREE.Vector2(x1, yA - 0.85), new THREE.Vector2(x1, yA + 1.7), new THREE.Vector2(x0 + 0.2, yA + 1.7)])
      sh.holes.push(new THREE.Path(opening('round', 1.6, 1.65, (x0 + x1) / 2, yA - 0.86, 12)))
      b.add(WALL, extrude(sh, 0.6), mat(0, 0, sz > 0 ? hw - 0.6 : -hw, 0))
    }
    b.block(TRIM, x1 - x0 + 0.1, 0.25, 2 * hw + 0.2, px, yA + 1.7, 0)
    // timber rafter ends + hipped zinc roof
    const ry = yA + 1.95
    for (let z = -hw - 0.3; z <= hw + 0.3; z += 0.5) b.block('mgDark', 0.6, 0.14, 0.12, x0 - 0.15, ry - 0.05, z)
    hipRoofRect(b, px - 0.3, 0, x1 - x0 + 1.4, 2 * hw + 1.2, ry, 18)
    // door inside the porch
    const fw = faceFrame('-x', PRON.x0, 0, 0, 0)
    b.add('mgDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.8, 3.4, 0, base))), M(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('rect', 1.8, 3.4, 0.2, 0, base), 0.1), M(fw, mat(0, 0, 0.01)))
    for (const u of [-2.3, 2.3]) b.add(MOS, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.0, 3.0, u, base + 0.6, 10))), M(fw, mat(0, 0, 0.03)))
  }

  /* ================= naos ================= */
  {
    const nx = (NAOS.x0 + NAOS.x1) / 2
    const nl = NAOS.x1 - NAOS.x0
    b.block(WALL, nl, NAOS.eave, 2 * HW, nx, 0, 0)
    b.block(TRIM, nl + 0.2, 0.8, 2 * HW + 0.2, nx, 0, 0)
    b.block(TRIM, nl + 0.1, 0.22, 2 * HW + 0.5, nx, NAOS.eave - 0.45, 0)
    b.block(TRIM, nl + 0.1, 0.24, 2 * HW + 0.8, nx, NAOS.eave - 0.24, 0)
    b.block(TRIM, nl + 0.05, 0.16, 2 * HW + 0.15, nx, 6.6, 0)
    for (const sz of [-1, 1]) {
      const sf = faceFrame(sz > 0 ? '+z' : '-z', sz * HW, 0, 0, 0)
      const U = (x: number) => (sz > 0 ? x : -x)
      // pilasters
      for (const x of [NAOS.x0 + 0.4, 1.2, 6.0, NAOS.x1 - 0.4]) b.add(TRIM, metricBox(0.6, NAOS.eave - 1.3, 0.12), M(sf, mat(U(x), 0.8 + (NAOS.eave - 1.3) / 2, 0.06)))
      // west bay: slit windows + tall mosaics; central bay: big mosaic window; east bay: slit windows
      for (const du of [-0.5, 0, 0.5]) {
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.3, 2.8, U(-0.2 + du), 2.2))), M(sf, mat(0, 0, 0.02)))
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.3, 2.8, U(7.9 + du), 2.2))), M(sf, mat(0, 0, 0.02)))
      }
      for (const x of [2.6, 4.6]) arched(b, sf, U(x), 1.6, 1.3, 3.8, MOS, 0.12)
      for (let i = 0; i < 6; i++) arched(b, sf, U(1.8 + i * 0.75), 7.0, 0.5, 1.25, MOS, 0.06)
      arched(b, sf, U(7.9), 6.9, 0.9, 1.6, MOS, 0.08)
      arched(b, sf, U(-0.2), 6.9, 0.9, 1.6, MOS, 0.08)
    }
    // low hipped roofs on the naos + square tower base
    hipRoofRect(b, nx, 0, nl + 0.8, 2 * HW + 0.9, NAOS.eave, 20)
    const bx = CT.x
    const bh = CT.baseTop - NAOS.eave
    b.block(WALL, CT.base, bh + 0.5, CT.base, bx, NAOS.eave + 0.6, 0)
    b.block(TRIM, CT.base + 0.5, 0.22, CT.base + 0.5, bx, CT.baseTop + 0.6 - 0.45, 0)
    b.block(TRIM, CT.base + 0.8, 0.24, CT.base + 0.8, bx, CT.baseTop + 0.6 - 0.24, 0)
    // low pyramidal skirt around the drum foot
    const sk = CT.base / 2 + 0.4
    const sy = CT.baseTop + 0.6
    const cr = [V(bx - sk, sy, -sk), V(bx + sk, sy, -sk), V(bx + sk, sy, sk), V(bx - sk, sy, sk)]
    const ir = CT.a + 0.2
    const ci = [V(bx - ir, sy + 0.9, -ir), V(bx + ir, sy + 0.9, -ir), V(bx + ir, sy + 0.9, ir), V(bx - ir, sy + 0.9, ir)]
    for (let i = 0; i < 4; i++) facet(b, ZN, [cr[i], cr[(i + 1) % 4], ci[(i + 1) % 4], ci[i]], { seams: SEAM })
    const d = drum(b, bx, 0, CT.a, sy + 0.4, sy + 0.4 + (CT.y1 - CT.baseTop), { glass: 'glassC', ow: 0.8, oh: 3.4 })
    const top = lobedDome(b, bx, 0, d.top - 0.35, d.R + 0.2, 2.5)
    orthoCross(b, bx, top, 0, 2.2)
  }

  /* ================= east apse ================= */
  {
    const { x0, xe, he } = APSE
    const ring = (grow: number, y: number) => [V(x0, y, -HW - grow), V(xe + grow * 0.7, y, -he - grow * 0.4), V(xe + grow * 0.7, y, he + grow * 0.4), V(x0, y, HW + grow)]
    const loftWall = (key: string, grow: number, y0: number, y1: number) => {
      const a = ring(grow, y0)
      const c = ring(grow, y1)
      for (let i = 0; i < 3; i++) facet(b, key, [a[i], a[i + 1], c[i + 1], c[i]], { hint: V(1, 0, i === 0 ? -1 : i === 2 ? 1 : 0) })
    }
    loftWall(WALL, 0, 0, NAOS.eave)
    loftWall(TRIM, 0.12, 0, 0.8)
    loftWall(TRIM, 0.35, NAOS.eave - 0.45, NAOS.eave)
    // roof: three facets meeting the naos ridge line
    const t = Math.tan(20 * D2R)
    const e = ring(0.6, NAOS.eave - 0.2)
    const apex = V(x0 + 0.2, NAOS.eave - 0.2 + (HW + 0.6) * t, 0)
    facet(b, ZN, [e[0], e[1], apex], { seams: SEAM, thickness: 0.1 })
    facet(b, ZN, [e[1], e[2], apex], { seams: SEAM, thickness: 0.1 })
    facet(b, ZN, [e[2], e[3], apex], { seams: SEAM, thickness: 0.1 })
    for (const p of [e[1], e[2]]) b.beam(ZN, p.clone().setY(p.y + 0.05), apex.clone().setY(apex.y + 0.05), 0.16, 0.1)
    // windows on the three faces
    const faces: [THREE.Vector3, THREE.Vector3][] = [[ring(0, 0)[0], ring(0, 0)[1]], [ring(0, 0)[1], ring(0, 0)[2]], [ring(0, 0)[2], ring(0, 0)[3]]]
    for (const [p, q] of faces) {
      const mid = p.clone().add(q).multiplyScalar(0.5)
      const dir = q.clone().sub(p)
      const nrm = V(dir.z, 0, -dir.x).normalize()
      const a = Math.atan2(nrm.z, nrm.x)
      const m = wallAt(mid.x, mid.z, a)
      const L = dir.length()
      for (const du of [-L * 0.17, L * 0.17]) arched(b, m, du, 6.9, 0.85, 1.6, MOS, 0.08)
      arched(b, m, 0, 1.8, 1.0, 3.6, MOS, 0.12)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-7.7, 21, 4.5],
  materials: (base) => {
    const light = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    light.color = new THREE.Color('#e4e7e9')
    // dome shingles read a little darker / less glossy than the flat standing seam (photos 01-03)
    const dome = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    dome.color = new THREE.Color('#b9bfc6')
    dome.roughness = 0.52
    return {
      mgDomeZinc: dome,
      mgTrim: new THREE.MeshStandardMaterial({ color: '#f0e9d6', roughness: 0.85 }),
      mgMosaic: new THREE.MeshStandardMaterial({ color: '#3d5480', roughness: 0.5, metalness: 0.1 }),
      mgDark: new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.7 }),
      mgDoor: new THREE.MeshStandardMaterial({ color: '#6d4a2c', roughness: 0.7 }),
      mgIron: new THREE.MeshStandardMaterial({ color: '#8e959b', roughness: 0.35, metalness: 0.8 }),
      mgZincLight: light,
    }
  },
  notes:
    'Neo-Byzantine church with two west belfries and a central drum; lobed domes, porch and low roofs in natural titanium-zinc as photographed after the 2021 restoration; mosaics shown as flat panels.',
}
export default model
