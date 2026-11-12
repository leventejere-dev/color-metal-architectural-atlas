/**
 * Biblioteca Centrală Universitară „Mihai Eminescu”, Iași — the building shown in
 * the COLOR METAL reference photographs (titanium-zinc roofs, elZinc Natural & Slate).
 *
 * IMPORTANT: the photographs do not show the monumental palace mapped in OSM
 * (relation 399264, a ~64 × 56 m block with two inner courtyards and a rounded
 * corner). They show a long five-storey block with a zinc-roofed attic, a square
 * corner tower and a flat-roofed block with a green wall, standing between a car
 * park and a ruined neighbour, with a paved pedestrian street at the tower end and
 * an older red-tiled building abutting the far end. Dimensions are therefore taken
 * from the photographs (storey heights ≈ 3.5 m, bay counts, drone plan view 02),
 * not from the OSM outline. The block most probably corresponds to the coarse OSM
 * traces 206517206 + 206517209 beside the Casa de Cultură a Studenților, with the
 * tower end on Strada Vasile Conta (≈ 13 m deep, with the same courtyard-side
 * set-back at the far end) — unverified, see data/models sidecar.
 *
 * Modelling specification (real metres, +X towards the tower / street end,
 * final model: +Z = car-park side, −Z = courtyard side with the white façade;
 * the code below is written with +Z = courtyard and mirrored by MirrorZBuilder):
 *  - Main block, 5 storeys (ground ≈ 4.2 m + 4 × 3.5 m), eave ≈ 18.6 m, ≈ 13.5 m deep.
 *    Part A (≈ 10.5 m, next to the neighbour) has its courtyard façade set back
 *    ≈ 1.4 m, so its ridge is lower and shifted — the step seen in photos 01/10.
 *    Part B (≈ 20 m) runs to the tower.
 *  - Roof: symmetrical ≈ 38° gable roof in standing-seam titanium-zinc (seams
 *    0.55 m), box gutter behind a white fascia, three snow-guard rails on the
 *    car-park slope, roof windows: car-park slope 5 flush (A) + 6 raised (B);
 *    courtyard slope 5 (A) + 6 (B) + 1 single near the tower.
 *  - Car-park façade: dark stone-clad end piers and plinth, white horizontal
 *    spandrel bands at every floor, taupe panels between 7 + 1 window bays.
 *  - Courtyard façade: white render, regular window bays, stone inserts on the
 *    top floor, small entrance canopy at the far end.
 *  - Street end: one storey higher flat-roofed block (green wall on the car-park
 *    face, dark shingle mansard strip on the street face, lift overrun on the
 *    roof); above it the end of the attic shows as grey rendered walls with a
 *    window. Square corner tower (≈ 6.8 m): stone-clad shaft with a tall arched
 *    window and arched door, white top storey with five arched openings per face,
 *    steep bell-cast pyramid roof in dark fish-scale metal shingles with hip rolls
 *    and a spire finial (≈ 33.6 m to the tip).
 * Approximations: absolute dimensions (photo-derived), window counts on the end
 * elevations, the exact junction of the attic with the tower, fish-scale shingles
 * shown as horizontal courses, the green wall as a stepped planted slab.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, window_, door, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180

/* ---------------- plan (m) ---------------- */
const X0 = -18.5 // neighbour end (party wall)
const XA = -8.0 // joint between part A and part B
const XF = 6.5 // end of the car-park roof slope / start of the flat-roofed block
const XT0 = 11.7 // tower west face
const XF1 = 14.5 // street face of the flat-roofed block
const XT1 = 18.5 // tower street face
const ZP = -7.05 // car-park façade
const ZC = 6.45 // courtyard façade (part B)
const ZCA = 5.05 // courtyard façade (part A, set back)
const ZR = -0.3 // ridge line of part B (= inner face of the flat-roofed block)
const ZT0 = 0.05 // tower car-park face
const ZT1 = 6.85 // tower courtyard face (slightly proud)

/* ---------------- heights (m) ---------------- */
const EAVE = 18.6
const PITCH = 38
const TAN = Math.tan(PITCH * D2R)
const FLAT = 21.6 // flat roof of the street-end block
const TWR_EAVE = 24.1

const SEAM = seams('zincSlate', 0.55, 0.05, 0.045)


/** Gable roof part between x0..x1, eaves at za (courtyard) and zb (car park), ridge zr. */
function roofPart(b: Builder, x0: number, x1: number, za: number, zb: number, zr: number, oh = 0.35, courtX1?: number, parkX1?: number) {
  const yr = EAVE + (za - zr) * TAN
  const ye = EAVE - oh * TAN
  const cx1 = courtX1 ?? x1
  const px1 = parkX1 ?? x1
  facet(b, 'zincSlate', [V(x0, ye, za + oh), V(cx1, ye, za + oh), V(cx1, yr, zr), V(x0, yr, zr)], { seams: SEAM, thickness: 0.12 })
  facet(b, 'zincSlate', [V(px1, ye, zb - oh), V(x0, ye, zb - oh), V(x0, yr, zr), V(px1, yr, zr)], { seams: SEAM, thickness: 0.12 })
  // ridge cap
  b.beam('zincSlate', V(x0, yr + 0.05, zr), V(Math.max(cx1, px1), yr + 0.05, zr), 0.3, 0.14)
  // box gutters + white fascia
  for (const [z, xe] of [
    [za + oh, cx1],
    [zb - oh, px1],
  ] as const) {
    b.beam('zincSlate', V(x0, ye - 0.08, z), V(xe, ye - 0.08, z), 0.3, 0.22)
    b.beam('bcuFascia', V(x0, EAVE - 0.35, z - Math.sign(z) * 0.05), V(xe, EAVE - 0.35, z - Math.sign(z) * 0.05), 0.12, 0.7)
  }
  return yr
}

/** Box lying on a roof slope: (x, s) = position along X and distance up the slope from the eave line. */
function onSlope(b: Builder, key: string, x: number, ze: number, zr: number, s: number, w: number, l: number, h: number, lift = 0) {
  const dz = Math.sign(zr - ze)
  const up = V(0, Math.sin(PITCH * D2R), dz * Math.cos(PITCH * D2R))
  const n = V(0, Math.cos(PITCH * D2R), -dz * Math.sin(PITCH * D2R))
  const xAxis = V(1, 0, 0)
  const m = new THREE.Matrix4().makeBasis(xAxis, up, n)
  const p = V(x, EAVE, ze).add(up.clone().multiplyScalar(s)).add(n.clone().multiplyScalar(h / 2 + lift))
  m.setPosition(p)
  b.add(key, metricBox(w, l, h), m)
}

/** Roof window on a slope. raised = top-hung ventilation sash shown open. */
function roofWindow(b: Builder, x: number, ze: number, zr: number, s: number, raised = false) {
  onSlope(b, 'aluDarkGrey', x, ze, zr, s, 0.98, 1.3, 0.16, 0.02)
  onSlope(b, 'skylight', x, ze, zr, s, 0.84, 1.14, 0.03, raised ? 0.32 : 0.17)
  if (raised) onSlope(b, 'aluDarkGrey', x, ze, zr, s + 0.52, 0.98, 0.18, 0.3, 0.14)
}

/** Facade window with dark aluminium frame. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, inset = 0.09, frameKey = 'aluDarkGrey') {
  window_(b, face, plane, u, y0, { w, h, frame: 0.08, frameKey, glassKey: 'glassC', inset, bars: w > 1.4 ? [2, 1] : undefined })
}

/** Arched opening with a white surround (tower). */
function archWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, frame = 0.18, bars?: [number, number]) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, frame, frameKey: 'plasterWhite', glassKey: 'glassC', inset: 0.04, bars })
}

/**
 * The geometry below is authored with +Z = courtyard side. Seen against the
 * photographs that layout is mirror-inverted (facing the courtyard façade the
 * tower stands at the LEFT end, photos 03/04), so everything is built through
 * this builder, which reflects z → −z and restores the triangle winding.
 * Net result: +X = tower / street end, +Z = car-park side, −Z = courtyard side.
 */
class MirrorZBuilder extends Builder {
  add(key: string, g: THREE.BufferGeometry, m?: THREE.Matrix4) {
    const geo = g.index ? g.toNonIndexed() : g.clone()
    if (!geo.attributes.normal) geo.computeVertexNormals()
    if (m) geo.applyMatrix4(m)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const nor = geo.attributes.normal as THREE.BufferAttribute
    const uv = geo.attributes.uv as THREE.BufferAttribute | undefined
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, -pos.getZ(i))
      nor.setZ(i, -nor.getZ(i))
    }
    const swap = (a: THREE.BufferAttribute, i: number, j: number) => {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.array[i * a.itemSize + k]
        a.array[i * a.itemSize + k] = a.array[j * a.itemSize + k]
        a.array[j * a.itemSize + k] = t
      }
    }
    for (let t = 0; t + 2 < pos.count; t += 3) {
      swap(pos, t + 1, t + 2)
      swap(nor, t + 1, t + 2)
      if (uv) swap(uv, t + 1, t + 2)
    }
    return super.add(key, geo)
  }
}

function build(): Builder {
  const b = new MirrorZBuilder()

  /* ============ main block walls ============ */
  // part A (courtyard façade set back)
  b.block('plasterWhite', XA - X0, EAVE, ZCA - ZP, (X0 + XA) / 2, 0, (ZCA + ZP) / 2)
  // part B up to the flat-roofed block
  b.block('plasterWhite', XF - XA, EAVE, ZC - ZP, (XA + XF) / 2, 0, (ZC + ZP) / 2)
  // part B courtyard half between the flat block and the tower
  b.block('plasterWhite', XT0 - XF, EAVE, ZC - ZR, (XF + XT0) / 2, 0, (ZC + ZR) / 2)
  // party wall at the neighbour end (render)
  b.block('bcuGrey', 0.06, EAVE, ZCA - ZP, X0 - 0.03, 0, (ZCA + ZP) / 2)

  /* ============ car-park façade (−Z) ============ */
  {
    const pierL1 = X0 + 1.9
    const pierR0 = XF - 2.9
    // stone end piers and plinth
    b.block('bcuStone', pierL1 - X0, EAVE - 0.05, 0.14, (X0 + pierL1) / 2, 0, ZP - 0.07)
    b.block('bcuStone', XF - pierR0, EAVE - 0.05, 0.14, (pierR0 + XF) / 2, 0, ZP - 0.07)
    b.block('bcuStone', pierR0 - pierL1, 1.0, 0.16, (pierL1 + pierR0) / 2, 0, ZP - 0.08)
    // taupe cladding between the piers
    b.block('bcuTaupe', pierR0 - pierL1, EAVE - 1.0, 0.06, (pierL1 + pierR0) / 2, 1.0, ZP - 0.03)
    // white spandrel bands (one under each upper floor's windows + top band)
    for (const y of [3.3, 6.8, 10.3, 13.8]) b.block('plasterWhite', pierR0 - pierL1, 1.25, 0.16, (pierL1 + pierR0) / 2, y, ZP - 0.08)
    b.block('plasterWhite', XF - X0, 0.5, 0.2, (X0 + XF) / 2, EAVE - 0.55, ZP - 0.1)
    // window bays: 7 wide + 1 narrow next to the right pier
    const us = [-15.4, -12.6, -9.8, -7.0, -4.2, -1.4, 1.2]
    for (const y0 of [1.3, 4.65, 8.15, 11.65, 15.15]) {
      for (const x of us) win(b, '-z', ZP, -x, y0, 1.85, y0 < 2 ? 1.85 : 1.95, 0.1)
      win(b, '-z', ZP, -3.05, y0, 0.62, y0 < 2 ? 1.85 : 1.95, 0.1)
    }
    // entrance canopy at the neighbour end
    b.block('black', 8.2, 0.25, 1.5, X0 + 5.6, 3.2, ZP - 0.75)
  }

  /* ============ courtyard façade (+Z) ============ */
  {
    // stone plinth
    b.block('bcuStone', XT0 - XA, 1.0, 0.12, (XA + XT0) / 2, 0, ZC + 0.06)
    b.block('bcuStone', XA - X0, 1.0, 0.12, (X0 + XA) / 2, 0, ZCA + 0.06)
    // white cornice band under the eave
    b.block('plasterWhite', XT0 - XA, 0.45, 0.2, (XA + XT0) / 2, EAVE - 0.5, ZC + 0.1)
    b.block('plasterWhite', XA - X0, 0.45, 0.2, (X0 + XA) / 2, EAVE - 0.5, ZCA + 0.1)
    // part B: 7 bays, part A: 4 bays
    const bayB = [-6.4, -3.6, -0.8, 2.0, 4.8, 7.6, 10.2]
    const bayA = [-16.9, -14.3, -11.7, -9.4]
    const ys = [1.3, 4.7, 8.2, 11.7, 15.2]
    for (const y0 of ys) {
      for (const x of bayB) win(b, '+z', ZC, x, y0, 1.45, 1.95)
      for (const x of bayA) win(b, '+z', ZCA, x, y0, 1.35, 1.95)
    }
    // stone inserts between the top-floor windows
    for (let i = 0; i < bayB.length - 1; i++) b.block('bcuStone', 1.0, 2.6, 0.08, (bayB[i] + bayB[i + 1]) / 2, 14.95, ZC + 0.04)
    // entrance canopy (part A)
    b.block('black', 4.6, 0.22, 1.6, -11.6, 3.4, ZCA + 0.8)
    b.add('black', metricBox(4.6, 0.08, 0.08), mat(-11.6, 3.3, ZCA + 1.6))
  }

  /* ============ roof (titanium-zinc standing seam) ============ */
  const yrB = roofPart(b, XA, XT0, ZC, ZP, ZR, 0.35, XT0, XF)
  const zrA = (ZCA + ZP) / 2
  const yrA = roofPart(b, X0 - 0.15, XA, ZCA, ZP, zrA, 0.35)
  // vertical zinc infill where the taller part B roof meets part A
  {
    const ye = EAVE - 0.35 * TAN
    facet(b, 'zincSlate', [V(XA, yrA, zrA), V(XA, yrB, ZR), V(XA, ye, ZC + 0.35), V(XA, ye, ZCA + 0.35)], { hint: V(-1, 0, 0) })
  }
  // gable end of the attic above the flat-roofed block (grey render), facing +X
  {
    const zHit = ZP + (FLAT - EAVE) / TAN // where the car-park slope reaches the flat roof level
    facet(b, 'bcuGrey', [V(XF, FLAT, ZR), V(XF, FLAT, zHit), V(XF, yrB, ZR)], { hint: V(1, 0, 0) })
    // attic wall towards the car park between the flat block and the tower (with window and vents)
    b.block('bcuGrey', XT0 - XF, yrB - FLAT + 0.05, 0.25, (XF + XT0) / 2, FLAT, ZR + 0.12)
    window_(b, '-z', ZR, -9.4, FLAT + 0.45, { w: 1.1, h: 1.0, frame: 0.1, frameKey: 'aluDarkGrey', glassKey: 'glassC', inset: 0.03 })
    for (const x of [7.6, 10.9]) b.block('aluDarkGrey', 0.5, 0.35, 0.04, x, FLAT + 0.9, ZR - 0.02)
  }
  // snow-guard rails on the car-park slope
  for (const s of [1.0, 1.9, 2.8]) {
    const up = V(0, Math.sin(PITCH * D2R), Math.cos(PITCH * D2R))
    const p0 = V(X0 + 0.2, EAVE, ZP).add(up.clone().multiplyScalar(s)).add(V(0, 0.16, 0))
    const p1 = V(XF - 0.2, EAVE, ZP).add(up.clone().multiplyScalar(s)).add(V(0, 0.16, 0))
    b.rod('helm', p0, p1, 0.025, 6)
  }
  // roof windows
  for (let i = 0; i < 5; i++) roofWindow(b, -16.0 + i * 1.25, ZP, zrA, 4.6)
  for (let i = 0; i < 6; i++) roofWindow(b, -3.2 + i * 1.25, ZP, ZR, 4.4, true)
  for (let i = 0; i < 5; i++) roofWindow(b, -16.0 + i * 1.25, ZCA, zrA, 4.4)
  for (let i = 0; i < 6; i++) roofWindow(b, -3.6 + i * 1.25, ZC, ZR, 4.8, true)
  roofWindow(b, 9.6, ZC, ZR, 4.2)
  // a few roof vents / chimneys (photos 01, 02)
  b.block('bcuGrey', 0.7, 0.9, 0.7, -14.0, yrA - 0.9, zrA + 1.3)

  /* ============ flat-roofed street-end block ============ */
  {
    const zc = (ZP + ZR) / 2
    const d = ZR - ZP
    b.block('plasterWhite', XF1 - XF, FLAT - 1.4, d, (XF + XF1) / 2, 0, zc)
    // upper part set back behind the street mansard strip
    b.block('bcuGrey', XF1 - XF - 0.6, 1.4, d, (XF + XF1 - 0.6) / 2, FLAT - 1.4, zc)
    // dark shingle mansard strip along the street face
    facet(b, 'bcuShingle', [V(XF1 + 0.25, FLAT - 1.45, ZP - 0.1), V(XF1 + 0.25, FLAT - 1.45, ZR), V(XF1 - 0.6, FLAT + 0.15, ZR), V(XF1 - 0.6, FLAT + 0.15, ZP - 0.1)], { thickness: 0.1 })
    // filler between the flat block and the tower
    b.block('plasterWhite', XF1 - XT0, FLAT - 1.4, ZT0 - ZR, (XT0 + XF1) / 2, 0, (ZR + ZT0) / 2)
    // roof membrane, parapet coping, lift overrun
    b.block('bcuMembrane', XF1 - XF - 0.7, 0.06, d - 0.1, (XF + XF1 - 0.7) / 2, FLAT - 0.05, zc)
    b.block('aluDarkGrey', XF1 - XF, 0.35, 0.35, (XF + XF1) / 2, FLAT, ZP + 0.17)
    b.block('aluDarkGrey', 0.35, 0.35, d, XF + 0.17, FLAT, zc)
    b.block('bcuMembrane', 2.6, 1.8, 2.6, 9.9, FLAT, -3.8)
    // street face: stone plinth and windows
    b.block('bcuStone', 0.12, 1.0, d, XF1 + 0.06, 0, zc)
    for (const y0 of [1.3, 4.7, 8.2, 11.7, 15.2]) for (const u of [3.4, 5.6]) win(b, '+x', XF1, u, y0, 1.1, 1.95)
    // green wall on the car-park face: stepped planted slab
    const gw0 = XF + 0.05
    const gw1 = XF1 - 0.05
    b.block('bcuIvy', gw1 - gw0, FLAT - 0.6, 0.32, (gw0 + gw1) / 2, 0.4, ZP - 0.18)
    for (let y = 2.6; y < FLAT - 1; y += 2.35) b.block('bcuIvy', gw1 - gw0 + 0.1, 0.45, 0.62, (gw0 + gw1) / 2, y, ZP - 0.32)
    // irregular growth along the street edge
    for (let i = 0; i < 7; i++) b.block('bcuIvy', 0.7, 2.2, 0.5, gw1 - 0.2 + (i % 2) * 0.25, 1.0 + i * 2.9, ZP - 0.3)
  }

  /* ============ corner tower ============ */
  {
    const cx = (XT0 + XT1) / 2
    const cz = (ZT0 + ZT1) / 2
    const w = XT1 - XT0
    const d = ZT1 - ZT0
    const shaftTop = 18.4
    // shaft: stone cladding on the courtyard face, white render on the street and car-park faces
    b.block('bcuStone', w, shaftTop, d, cx, 0, cz)
    b.block('plasterWhite', 0.04, shaftTop, d - 0.2, XT1 + 0.02, 0, cz)
    b.block('plasterWhite', w - 0.2, shaftTop, 0.04, cx, 0, ZT0 - 0.02)
    for (const [x, z] of [
      [XT0, ZT0],
      [XT1, ZT0],
      [XT1, ZT1],
      [XT0, ZT1],
    ]) b.block('plasterWhite', 0.7, shaftTop, 0.7, x - Math.sign(x - cx) * 0.33, 0, z - Math.sign(z - cz) * 0.33)
    b.block('plasterWhite', w + 0.2, 0.6, d + 0.2, cx, 0, cz)
    // white top storey with cornices
    b.block('plasterWhite', w + 0.1, 0.5, d + 0.1, cx, shaftTop, cz)
    b.block('plasterWhite', w, TWR_EAVE - shaftTop - 0.6, d, cx, shaftTop + 0.5, cz)
    b.block('plasterWhite', w + 0.45, 0.35, d + 0.45, cx, TWR_EAVE - 0.75, cz)
    b.block('plasterWhite', w + 0.7, 0.3, d + 0.7, cx, TWR_EAVE - 0.4, cz)
    b.block('black', w + 0.75, 0.12, d + 0.75, cx, TWR_EAVE - 0.12, cz)
    // arcade: five arched openings on each face of the top storey
    const faces: [Face, number, number][] = [
      ['+z', ZT1, cx],
      ['-z', ZT0, -cx],
      ['+x', XT1, -cz],
      ['-x', XT0, cz],
    ]
    for (const [f, plane, uc] of faces) {
      for (let i = -2; i <= 2; i++) {
        archWin(b, f, plane, uc + i * 1.15, 19.6, 0.72, 2.6, 0.12)
        // small dark railing at the foot of each opening
        const m = faceFrame(f, plane, uc + i * 1.15)
        b.add('black', metricBox(0.8, 0.5, 0.06), m.multiply(mat(0, 19.85, 0.16)))
      }
    }
    // courtyard face: arched door, white panel, tall arched window
    door(b, '+z', ZT1, cx, { w: 1.7, h: 3.2, type: 'round', leafKey: 'glassC', frameKey: 'plasterWhite', frame: 0.32 })
    b.add('plasterWhite', metricBox(3.0, 0.9, 0.12), mat(cx, 6.9, ZT1 + 0.06))
    archWin(b, '+z', ZT1, cx, 8.4, 2.1, 8.4, 0.34, [2, 6])
    // street face: stacked narrow arched windows
    for (const y0 of [4.6, 9.0, 13.4]) for (const u of [-1.0, 1.0]) archWin(b, '+x', XT1 + 0.04, -cz + u, y0, 0.75, 2.8, 0.16)
    // car-park face (visible beside / above the flat block)
    for (const y0 of [9.0, 13.4]) archWin(b, '-z', ZT0 - 0.04, -(cx + 1.6), y0, 0.75, 2.8, 0.16)

    /* bell-cast pyramid roof, dark fish-scale shingles shown as courses */
    const oh = 0.8
    const R0 = w / 2 + oh // eave half-width
    const R1 = w / 2 - 0.15 // break of the bell-cast kick
    const y0 = TWR_EAVE - 0.05
    const y1 = y0 + (R0 - R1) * Math.tan(30 * D2R)
    const apexY = y1 + R1 * Math.tan(63 * D2R)
    const sq = (r: number, y: number) => [V(cx - r, y, cz - r), V(cx + r, y, cz - r), V(cx + r, y, cz + r), V(cx - r, y, cz + r)]
    const lo = sq(R0, y0)
    const mid = sq(R1, y1)
    const apex = V(cx, apexY, cz)
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, 'bcuShingle', [lo[i], lo[j], mid[j], mid[i]], { thickness: 0.1 })
      facet(b, 'bcuShingle', [mid[i], mid[j], apex], { thickness: 0.1 })
      b.beam('zincGraphite', lo[i], mid[i], 0.16, 0.14)
      b.beam('zincGraphite', mid[i], apex, 0.16, 0.14)
    }
    // shingle courses (horizontal steps every 0.32 m along the slope)
    const courses = Math.floor((apexY - y1) / (0.32 * Math.sin(63 * D2R)))
    for (let k = 1; k < courses - 1; k++) {
      const t = k / courses
      const r = R1 * (1 - t) + 0.02
      const y = y1 + (apexY - y1) * t
      const ring = sq(r, y)
      for (let i = 0; i < 4; i++) b.beam('bcuShingle', ring[i], ring[(i + 1) % 4], 0.05, 0.04, V(0, 1, 0))
    }
    // finial and spire
    b.add('zincGraphite', new THREE.LatheGeometry([new THREE.Vector2(0.28, 0), new THREE.Vector2(0.22, 0.35), new THREE.Vector2(0.3, 0.6), new THREE.Vector2(0.12, 0.9), new THREE.Vector2(0.06, 1.6), new THREE.Vector2(0.001, 2.0)], 12), mat(cx, apexY - 0.2, cz))
    b.rod('zincGraphite', V(cx, apexY + 1.6, cz), V(cx, apexY + 2.6, cz), 0.025, 6)
  }

  /* ============ downpipes ============ */
  for (const x of [X0 + 2.0, XF - 3.0]) b.rod('aluDarkGrey', V(x, 0.3, ZP - 0.3), V(x, EAVE - 0.5, ZP - 0.3), 0.07, 8)
  for (const x of [XA + 0.2, XT0 - 0.4]) b.rod('aluDarkGrey', V(x, 0.3, ZC + 0.3), V(x, EAVE - 0.5, ZC + 0.3), 0.07, 8)

  return b
}


const model: ModelModule = {
  build,
  front: [0.9, -0.45],
  materialFocus: [-6, 21.5, 3.5],
  materials: () => ({
    bcuStone: new THREE.MeshStandardMaterial({ color: '#6f675f', roughness: 0.92 }),
    bcuTaupe: new THREE.MeshStandardMaterial({ color: '#b7a797', roughness: 0.85 }),
    bcuGrey: new THREE.MeshStandardMaterial({ color: '#a3a4a7', roughness: 0.9 }),
    bcuFascia: new THREE.MeshStandardMaterial({ color: '#e9e9e6', roughness: 0.6, metalness: 0.2 }),
    bcuShingle: new THREE.MeshStandardMaterial({ color: '#46505e', roughness: 0.5, metalness: 0.55, envMapIntensity: 1.0 }),
    bcuIvy: new THREE.MeshStandardMaterial({ color: '#5b7f35', roughness: 1 }),
    bcuMembrane: new THREE.MeshStandardMaterial({ color: '#4f5154', roughness: 0.95 }),
  }),
  notes:
    'Interpreted from the reference photographs: five-storey block with a titanium-zinc standing-seam attic roof, corner tower with a dark shingled pyramid and a flat-roofed green-wall block; dimensions estimated from the photos (the OSM outline maps the historic palace, not this building).',
}
export default model
