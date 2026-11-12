/**
 * Berenczei Kováts Miklós manor (kúria), Nisipeni / Sándorhomok (Satu Mare) —
 * 1899, restored 2023–2026. OSM way 1366197034 (U plan 45.2 × 19.5 m,
 * long axis 82.8°, the short wings projecting north).
 *
 * Modelling specification derived from the 7 reference photographs (south and
 * west elevations; the courtyard side is not photographed); real metres,
 * +X = east, +Z = south:
 *  - West pavilion (7.5 × 19.6 m, ground floor + tall attic storey, eave
 *    ≈ 7.3 m) under a steep hipped tile roof (ridge N–S); on its south hip a
 *    stepped Flemish dormer gable with a window and pinnacles; at the SW
 *    corner a full-height octagonal bay with a faceted ogee dome.
 *  - Neo-Gothic tower in front of the west façade: square shaft, zinc
 *    broaches to an octagonal belfry stage with pointed windows and a
 *    corbel-arch cornice, tall octagonal spire with four lucarnes, corner
 *    pinnacles, ball and needle.
 *  - Single-storey middle range (eave ≈ 5.3 m) with a tiled gable roof,
 *    eight tall windows with pointed drip-mould hoods on the south front and
 *    paired chimneys; its deeper rear (courtyard) tract is shown under a
 *    low-pitch zinc standing-seam roof (photo 05 shows such a roof being laid
 *    against a tiled eave; its exact position is not documented).
 *  - East pavilion (8.2 × 19 m) with a steep hipped tile roof and a second
 *    stepped dormer gable on the south.
 *  - White render, beige socle / string courses / window surrounds, brown
 *    timber windows; chimneys with half-round zinc caps.
 *  - METAL (as photographed, product unconfirmed in the register): natural
 *    titanium-zinc — spire, lucarnes, broaches, bay dome, flashings, gutters,
 *    downpipes, chimney caps and the low rear roof. Main roofs: ceramic
 *    beaver-tail tiles (not metal).
 * Approximations: courtyard (north) elevations and rear roofs not
 * photographed (mirrored / simplified); tower projection and the corner bay
 * are outside the coarse OSM outline; heights estimated from the photos.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, spire, prism, ringBand, faceFrame, seams, polyRing, loft } from '../kit'
import type { Face, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D = (d: number) => (d * Math.PI) / 180

/* ---------------- plan (OSM, symmetrised) ---------------- */
const WP = { x0: -22.6, x1: -15.1, z0: -9.8, z1: 9.8, eave: 7.3, pitch: 50 }
const EP = { x0: 14.4, x1: 22.6, z0: -9.15, z1: 9.8, eave: 5.6, pitch: 50 }
const MR = { x0: -15.1, x1: 14.4, zf: 2.4, z1: 9.8, zr: -4.75, eave: 5.3, pitch: 40, rearEave: 4.2 }
const TWR = { x0: -25.2, x1: -21.2, z0: -4.1, z1: -0.1, sq: 7.6, oct: 11.6 }
const BAY = { x: -20.6, z: 7.8, r: 2.7 }

const WALL = 'plasterWhite'
const TRIM = 'stoneWarm'
const ZN = 'zincNatural'
const ZSEAM: SeamSpec = seams('zincNatural', 0.6, 0.04, 0.035)
const OV = 0.45

/** Window with brown frame, glazing bars, beige surround and an optional pointed drip-mould hood. */
function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, o: { hood?: boolean; type?: 'rect' | 'pointed' | 'round' } = {}) {
  const type = o.type ?? 'rect'
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add('wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.07, 0, y0), 0.07), m)
  if (type === 'rect') {
    b.add('wood', metricBox(0.06, h, 0.05), M(m, mat(0, y0 + h / 2, 0.05)))
    for (const t of [0.36, 0.68]) b.add('wood', metricBox(w, 0.05, 0.05), M(m, mat(0, y0 + h * t, 0.05)))
  }
  b.add(TRIM, extrude(frameShape(type, w + 0.06, h + 0.03, 0.13, 0, y0 - 0.03), 0.08), m)
  b.add(TRIM, metricBox(w + 0.5, 0.12, 0.26), M(m, mat(0, y0 - 0.12, 0.1)))
  if (o.hood) {
    const hw = w + 0.35
    b.add(TRIM, extrude(frameShape('pointed', hw, hw * 0.95, 0.1, 0, y0 + h + 0.15), 0.07), m)
    for (const s of [-1, 1]) b.add(TRIM, metricBox(0.14, 0.24, 0.12), M(m, mat(s * (hw / 2 + 0.05), y0 + h + 0.05, 0.06)))
  }
}

/** Hipped roof over an axis-aligned rectangle (tiles: no seams) with ridge/hip caps. */
function hipTile(b: Builder, key: string, capKey: string, x0: number, x1: number, z0: number, z1: number, eave: number, pitch: number) {
  const t = Math.tan(D(pitch))
  const ye = eave - OV * t
  const w = x1 - x0 + 2 * OV
  const d = z1 - z0 + 2 * OV
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const hw = w / 2
  const hd = d / 2
  const c = [V(cx - hw, ye, cz - hd), V(cx + hw, ye, cz - hd), V(cx + hw, ye, cz + hd), V(cx - hw, ye, cz + hd)]
  let r1: THREE.Vector3
  let r2: THREE.Vector3
  if (w >= d) {
    r1 = V(cx - hw + hd, ye + hd * t, cz)
    r2 = V(cx + hw - hd, ye + hd * t, cz)
    facet(b, key, [c[3], c[2], r2, r1], { thickness: 0.15 })
    facet(b, key, [c[1], c[0], r1, r2], { thickness: 0.15 })
    facet(b, key, [c[0], c[3], r1], { thickness: 0.15 })
    facet(b, key, [c[2], c[1], r2], { thickness: 0.15 })
    for (const [p, q] of [[c[0], r1], [c[3], r1], [c[1], r2], [c[2], r2]] as const) b.beam(capKey, p.clone().add(V(0, 0.08, 0)), q.clone().add(V(0, 0.08, 0)), 0.26, 0.16)
  } else {
    r1 = V(cx, ye + hw * t, cz - hd + hw)
    r2 = V(cx, ye + hw * t, cz + hd - hw)
    facet(b, key, [c[3], c[2], r2], { thickness: 0.15 })
    facet(b, key, [c[1], c[0], r1], { thickness: 0.15 })
    facet(b, key, [c[0], c[3], r2, r1], { thickness: 0.15 })
    facet(b, key, [c[2], c[1], r1, r2], { thickness: 0.15 })
    for (const [p, q] of [[c[0], r1], [c[1], r1], [c[3], r2], [c[2], r2]] as const) b.beam(capKey, p.clone().add(V(0, 0.08, 0)), q.clone().add(V(0, 0.08, 0)), 0.26, 0.16)
  }
  b.beam(capKey, r1.clone().add(V(0, 0.08, 0)), r2.clone().add(V(0, 0.08, 0)), 0.3, 0.18)
  // zinc half-round gutters along the eaves
  for (let i = 0; i < 4; i++) b.beam(ZN, c[i].clone().add(V(0, -0.1, 0)), c[(i + 1) % 4].clone().add(V(0, -0.1, 0)), 0.18, 0.16)
  return { r1, r2, ye, top: r1.y }
}

/** Stepped (Flemish) dormer gable on a south (+z) wall: width w, base y0, with a window, pinnacles and its own small roof behind. */
function steppedGable(b: Builder, roofKey: string, cx: number, z: number, y0: number, w: number, roofPitch: number, depth: number) {
  const h = w * 1.05
  const s = w / 3.6
  const half: [number, number][] = [
    [1.8, 0],
    [1.8, 0.75],
    [1.55, 0.95],
    [1.42, 1.25],
    [1.42, 1.75],
    [1.12, 1.95],
    [0.98, 2.3],
    [0.98, 2.85],
    [0.62, 3.05],
    [0.5, 3.4],
    [0.5, h / s],
  ]
  const pts = [...half.map(([u, y]) => new THREE.Vector2(u * s, y * s)), ...half.slice().reverse().map(([u, y]) => new THREE.Vector2(-u * s, y * s))]
  const m = mat(cx, y0, z, 0)
  b.add(WALL, extrude(new THREE.Shape(pts), 0.5), M(m, mat(0, 0, -0.5)))
  // copings on the steps
  for (let i = 0; i < half.length - 1; i++) {
    for (const sg of [-1, 1]) {
      const [u1, y1] = half[i]
      const [u2, y2] = half[i + 1]
      if (Math.abs(u2 - u1) < 1e-3) continue
      b.beam(TRIM, V(cx + sg * u1 * s, y0 + y1 * s + 0.05, z - 0.22), V(cx + sg * u2 * s, y0 + y2 * s + 0.05, z - 0.22), 0.12, 0.6, V(0, 0, 1))
    }
  }
  b.block(TRIM, 1.0 * s + 0.15, 0.14, 0.62, cx, y0 + h, z - 0.22)
  // pinnacles: top and shoulders
  for (const [u, y, k] of [[0, h, 1], [1.8 * s, 0.75 * s, 0.75], [-1.8 * s, 0.75 * s, 0.75]] as const) {
    b.block(TRIM, 0.3 * k, 0.5 * k, 0.3 * k, cx + u, y0 + y + 0.1, z - 0.2)
    b.add(ZN, new THREE.ConeGeometry(0.2 * k, 0.6 * k, 4), mat(cx + u, y0 + y + 0.6 * k + 0.3 * k, z - 0.2, Math.PI / 4))
  }
  // window in the gable
  win(b, mat(cx, 0, z, 0), 0.75, 1.45, y0 + 0.9 * s, { type: 'rect' })
  // small gabled roof behind the gable, running back into the main roof
  const t = Math.tan(D(roofPitch))
  const yr = y0 + (w / 2) * t
  for (const sg of [-1, 1]) {
    facet(b, roofKey, [V(cx + (sg * w) / 2, y0, z - 0.4), V(cx + (sg * w) / 2, y0, z - depth), V(cx, yr, z - depth), V(cx, yr, z - 0.4)], { thickness: 0.12, hint: V(sg, 1, 0) })
  }
  b.beam('nisiRidge', V(cx, yr + 0.08, z - 0.4), V(cx, yr + 0.08, z - depth), 0.24, 0.14)
}

function chimney(b: Builder, x: number, z: number, y0: number, h: number) {
  b.block(WALL, 0.7, h, 0.7, x, y0, z)
  b.block(WALL, 0.84, 0.18, 0.84, x, y0 + h - 0.35, z)
  // half-round zinc cap
  b.add(ZN, new THREE.CylinderGeometry(0.42, 0.42, 0.8, 14, 1, false, -Math.PI / 2, Math.PI), mat(x, y0 + h + 0.06, z, 0, -Math.PI / 2, 0))
  b.block(ZN, 0.86, 0.06, 0.86, x, y0 + h, z)
}

function build(): Builder {
  const b = new Builder()

  /* ================= west pavilion ================= */
  {
    const { x0, x1, z0, z1, eave } = WP
    const cx = (x0 + x1) / 2
    b.block(WALL, x1 - x0, eave, z1 - z0, cx, 0, 0)
    b.block('plasterOchre', x1 - x0 + 0.16, 0.9, z1 - z0 + 0.16, cx, 0, 0)
    b.block(TRIM, x1 - x0 + 0.14, 0.2, z1 - z0 + 0.14, cx, 4.5, 0)
    b.block(TRIM, x1 - x0 + 0.4, 0.4, z1 - z0 + 0.4, cx, eave - 0.45, 0)
    b.block(ZN, x1 - x0 + 0.5, 0.06, z1 - z0 + 0.5, cx, eave - 0.06, 0)
    // west façade (behind the tower): windows north and south of it
    const wf = (u: number) => faceFrame('-x', x0, u)
    for (const u of [-7.2, 2.4]) {
      win(b, wf(u), 1.15, 2.2, 1.5, { hood: true })
      win(b, wf(u), 0.7, 1.25, 5.3, { type: 'pointed' })
    }
    // north end (courtyard wing): two window axes, mirrored from the south front
    const nf = (x: number) => faceFrame('-z', z0, -x)
    for (const x of [x0 + 2.0, x1 - 2.0]) {
      win(b, nf(x), 1.15, 2.2, 1.5, { hood: true })
      win(b, nf(x), 0.7, 1.25, 5.3, { type: 'pointed' })
    }
    // east side facing the courtyard (beyond the middle range)
    const ef = (z: number) => faceFrame('+x', x1, -z)
    win(b, ef(-7.3), 1.15, 2.2, 1.5, { hood: true })
    // south front (east part, beside the corner bay)
    const sf = (x: number) => faceFrame('+z', z1, x)
    win(b, sf(-17.0), 1.15, 2.2, 1.5, { hood: true })
    const r = hipTile(b, 'nisiTile', 'nisiRidge', x0, x1, z0, z1, eave, WP.pitch)
    chimney(b, cx + 0.3, -3.5, r.top - 1.6, 2.4)
    steppedGable(b, 'nisiTile', -16.95, z1, eave, 3.7, 52, 4.2)
  }

  /* ================= SW corner bay with ogee zinc dome ================= */
  {
    const { x, z, r } = BAY
    prism(b, WALL, { x, z, n: 8, r, y0: 0, h: WP.eave, phase: Math.PI / 8 })
    prism(b, 'plasterOchre', { x, z, n: 8, r: r + 0.08, y0: 0, h: 0.9, phase: Math.PI / 8 })
    ringBand(b, TRIM, { x, z, n: 8, r, y: 4.5, h: 0.2, grow: 0.07, phase: Math.PI / 8 })
    ringBand(b, TRIM, { x, z, n: 8, r, y: WP.eave - 0.45, h: 0.4, grow: 0.22, phase: Math.PI / 8 })
    ringBand(b, ZN, { x, z, n: 8, r, y: WP.eave - 0.06, h: 0.08, grow: 0.3, phase: Math.PI / 8 })
    // windows on the three free faces (outward normals south, south-west, west; polyRing angles: x = cos a, z = sin a)
    const ap = r * Math.cos(Math.PI / 8)
    for (const a of [Math.PI / 2, (3 * Math.PI) / 4, Math.PI]) {
      const m = mat(x + ap * Math.cos(a), 0, z + ap * Math.sin(a), Math.PI / 2 - a)
      win(b, m, 0.95, 2.1, 1.5, { hood: a === (3 * Math.PI) / 4 })
      win(b, m, 0.6, 1.15, 5.3, { type: 'pointed' })
    }
    // faceted ogee dome
    const y0 = WP.eave
    const R = r + 0.3
    const st: [number, number][] = [
      [R, y0],
      [R * 0.98, y0 + 0.3],
      [R * 0.92, y0 + 0.75],
      [R * 0.8, y0 + 1.3],
      [R * 0.6, y0 + 1.9],
      [R * 0.38, y0 + 2.3],
      [R * 0.18, y0 + 2.6],
      [R * 0.12, y0 + 2.8],
      [R * 0.14, y0 + 3.0],
      [0.02, y0 + 3.15],
    ]
    helm(b, ZN, { x, z, n: 8, stations: st, phase: Math.PI / 8 })
    // dome ribs
    const ring = st.map(([rr, yy]) => polyRing(8, rr + 0.03, yy, Math.PI / 8, x, z))
    for (let k = 0; k < 8; k++) for (let i = 0; i < st.length - 2; i++) b.beam(ZN, ring[i][k], ring[i + 1][k], 0.07, 0.06)
    b.add(ZN, new THREE.SphereGeometry(0.2, 12, 8), mat(x, y0 + 3.35, z))
    b.rod(ZN, V(x, y0 + 3.1, z), V(x, y0 + 4.3, z), 0.03, 6)
  }

  /* ================= tower ================= */
  {
    const { x0, x1, z0, z1, sq, oct } = TWR
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const hw = (x1 - x0) / 2
    b.block(WALL, 2 * hw, sq, 2 * hw, cx, 0, cz)
    b.block('plasterOchre', 2 * hw + 0.16, 0.9, 2 * hw + 0.16, cx, 0, cz)
    b.block(TRIM, 2 * hw + 0.14, 0.2, 2 * hw + 0.14, cx, 4.5, cz)
    b.block(TRIM, 2 * hw + 0.24, 0.3, 2 * hw + 0.24, cx, sq - 0.3, cz)
    for (const face of ['-x', '+z', '-z'] as Face[]) {
      const plane = face === '-x' ? x0 : face === '+z' ? z1 : z0
      const u = face === '-x' ? cz : face === '+z' ? cx : -cx
      const m = faceFrame(face, plane, u)
      win(b, m, 1.0, 2.1, 1.5, { hood: true })
      win(b, m, 0.62, 1.3, 5.2, { type: 'pointed' })
    }
    // zinc broaches: square → octagon
    const R = hw / Math.cos(Math.PI / 8) - 0.05
    const octRing = (y: number, rr = R) => polyRing(8, rr, y, Math.PI / 8, cx, cz)
    const top = octRing(sq + 0.9)
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2
      const corner = V(cx + Math.cos(a) * hw * Math.SQRT2, sq, cz + Math.sin(a) * hw * Math.SQRT2)
      const i1 = (2 * k) % 8
      const i2 = (2 * k + 1) % 8
      facet(b, ZN, [corner, top[i1], top[i2]], { seams: ZSEAM })
    }
    b.add(WALL, loft([octRing(sq - 0.05), octRing(oct)], { capTop: true, flat: true }))
    // pointed windows on the cardinal faces of the octagon
    const ap = R * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = mat(cx + ap * Math.cos(a), 0, cz + ap * Math.sin(a), Math.PI / 2 - a)
      if (k % 2 === 0) win(b, m, 0.7, 1.7, 9.0, { type: 'pointed' })
      // corbel-arch frieze
      for (const du of [-0.42, 0, 0.42]) b.add(TRIM, new THREE.TorusGeometry(0.16, 0.04, 4, 10, Math.PI), M(m, mat(du, oct - 0.55, 0.04)))
    }
    ringBand(b, TRIM, { x: cx, z: cz, n: 8, r: R, y: oct - 0.35, h: 0.35, grow: 0.18, phase: Math.PI / 8 })
    ringBand(b, TRIM, { x: cx, z: cz, n: 8, r: R, y: oct, h: 0.2, grow: 0.3, phase: Math.PI / 8 })
    // octagonal zinc spire with lucarnes and pinnacles
    const sy0 = oct + 0.2
    const sR = R + 0.3
    const sh = 6.4
    spire(b, ZN, { x: cx, z: cz, y0: sy0, r: sR, h: sh, n: 8, phase: Math.PI / 8, seams: ZSEAM })
    const apS = sR * Math.cos(Math.PI / 8)
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2
      // lucarne: small gabled box with an oculus, standing on the spire face
      const d = apS - 0.75
      const m = mat(cx + d * Math.cos(a), 0, cz + d * Math.sin(a), Math.PI / 2 - a)
      b.add(ZN, metricBox(0.75, 0.8, 1.2), M(m, mat(0, sy0 + 0.75, 0.2)))
      const g = new THREE.Shape([new THREE.Vector2(-0.42, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0, 0.75)])
      b.add(ZN, extrude(g, 1.25), M(m, mat(0, sy0 + 1.15, -0.42)))
      b.add('black', new THREE.CircleGeometry(0.17, 12), M(m, mat(0, sy0 + 0.8, 0.82)))
      // corner pinnacle on the diagonal
      const ad = a + Math.PI / 4
      const pr = sR - 0.05
      const px = cx + pr * Math.cos(ad)
      const pz = cz + pr * Math.sin(ad)
      b.add(ZN, new THREE.ConeGeometry(0.14, 1.3, 6), mat(px, sy0 + 0.65, pz))
    }
    b.add(ZN, new THREE.SphereGeometry(0.22, 12, 8), mat(cx, sy0 + sh + 0.05, cz))
    b.rod(ZN, V(cx, sy0 + sh - 0.3, cz), V(cx, sy0 + sh + 2.6, cz), 0.035, 6)
  }

  /* ================= middle range ================= */
  {
    const { x0, x1, zf, z1, zr, eave } = MR
    const cx = (x0 + x1) / 2
    const L = x1 - x0
    // front (south) tract
    b.block(WALL, L, eave, z1 - zf, cx, 0, (zf + z1) / 2)
    b.block('plasterOchre', L, 0.9, z1 - zf + 0.16, cx, 0, (zf + z1) / 2)
    b.block(TRIM, L, 0.35, z1 - zf + 0.36, cx, eave - 0.4, (zf + z1) / 2)
    // rear (courtyard) tract, lower
    b.block(WALL, L, MR.rearEave, zf - zr + 0.01, cx, 0, (zr + zf) / 2)
    b.block('plasterOchre', L, 0.9, zf - zr + 0.16, cx, 0, (zr + zf) / 2)
    b.block(TRIM, L, 0.3, 0.3, cx, MR.rearEave - 0.35, zr - 0.05)
    // south windows: eight axes
    for (let i = 0; i < 8; i++) {
      const x = x0 + 2.0 + (i * (L - 4.0)) / 7
      win(b, faceFrame('+z', z1, x), 1.15, 2.2, 1.45, { hood: true })
    }
    // courtyard windows (not photographed: same rhythm)
    for (let i = 0; i < 8; i++) {
      const x = x0 + 2.0 + (i * (L - 4.0)) / 7
      win(b, faceFrame('-z', zr, -x), 1.0, 1.9, 1.45)
    }
    // tiled gable roof over the front tract
    const t = Math.tan(D(MR.pitch))
    const ye = eave - OV * t
    const zc = (zf + z1) / 2
    const half = (z1 - zf) / 2
    const yr = eave + half * t
    const xa = x0 - 0.1
    const xb = x1 + 0.1
    facet(b, 'tileRed', [V(xa, ye, z1 + OV), V(xb, ye, z1 + OV), V(xb, yr, zc), V(xa, yr, zc)], { thickness: 0.15 })
    facet(b, 'tileRed', [V(xb, ye, zf - OV), V(xa, ye, zf - OV), V(xa, yr, zc), V(xb, yr, zc)], { thickness: 0.15 })
    b.beam('nisiRidge', V(xa, yr + 0.08, zc), V(xb, yr + 0.08, zc), 0.3, 0.18)
    for (const zz of [z1 + OV, zf - OV]) b.beam(ZN, V(xa, ye - 0.1, zz), V(xb, ye - 0.1, zz), 0.18, 0.16)
    // low-pitch zinc standing-seam roof over the rear tract, against the front tract wall
    const yRearLo = MR.rearEave - 0.1
    const yRearHi = MR.rearEave + 0.55
    facet(b, ZN, [V(xa, yRearLo, zr - 0.35), V(xb, yRearLo, zr - 0.35), V(xb, yRearHi, zf), V(xa, yRearHi, zf)], { seams: ZSEAM, thickness: 0.1 })
    b.beam(ZN, V(xa, yRearLo - 0.1, zr - 0.4), V(xb, yRearLo - 0.1, zr - 0.4), 0.2, 0.18)
    // chimneys (pairs, white with half-round zinc caps)
    for (const x of [-9.6, -8.3, -0.8, 6.2]) chimney(b, x, zc, yr - 1.0, 2.5)
    // downpipes
    for (const x of [x0 + 0.4, -0.4, x1 - 0.4]) b.rod(ZN, V(x, 0.2, z1 + 0.12), V(x, eave - 0.3, z1 + 0.12), 0.06, 8)
  }

  /* ================= east pavilion ================= */
  {
    const { x0, x1, z0, z1, eave } = EP
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    b.block(WALL, x1 - x0, eave, z1 - z0, cx, 0, cz)
    b.block('plasterOchre', x1 - x0 + 0.16, 0.9, z1 - z0 + 0.16, cx, 0, cz)
    b.block(TRIM, x1 - x0 + 0.4, 0.4, z1 - z0 + 0.4, cx, eave - 0.45, cz)
    b.block(ZN, x1 - x0 + 0.5, 0.06, z1 - z0 + 0.5, cx, eave - 0.06, cz)
    win(b, faceFrame('+z', z1, cx), 1.15, 2.2, 1.45, { hood: true })
    for (const z of [-6.0, -1.0, 4.0]) win(b, faceFrame('+x', x1, -z), 1.15, 2.2, 1.45, { hood: true })
    win(b, faceFrame('-z', z0, -cx), 1.15, 2.2, 1.45, { hood: true })
    win(b, faceFrame('-x', x0, -7.0), 1.15, 2.2, 1.45)
    const r = hipTile(b, 'nisiTile', 'nisiRidge', x0, x1, z0, z1, eave, EP.pitch)
    chimney(b, cx - 0.4, -2.0, r.top - 1.5, 2.3)
    steppedGable(b, 'nisiTile', cx, z1, eave, 4.0, 52, 4.4)
    b.rod(ZN, V(x1 - 0.3, 0.2, z1 + 0.12), V(x1 - 0.3, eave - 0.3, z1 + 0.12), 0.06, 8)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [(TWR.x0 + TWR.x1) / 2, 14.5, (TWR.z0 + TWR.z1) / 2 + 1.5],
  materials: (base) => {
    // new orange beaver-tail tiles of the pavilions (brighter than the reused tiles of the middle range)
    const tile = (base.tileRed as THREE.MeshStandardMaterial).clone()
    tile.color = new THREE.Color('#d8643a')
    return {
      nisiTile: tile,
      nisiRidge: new THREE.MeshStandardMaterial({ color: '#d77a4a', roughness: 0.8 }),
    }
  },
  notes: 'Courtyard side not photographed (simplified); rear low zinc roof inferred from a construction photo; heights estimated.',
}
export default model
