/**
 * Primăria Municipiului Alexandria (Str. Dunării 139, Alexandria, Teleorman) —
 * MASSING MODEL (tier D). Roofs shown in the natural titanium-zinc supplied by
 * COLOR METAL in 2022 according to its records.
 *
 * No usable photograph of the town hall could be found (Wikimedia Commons,
 * the municipality's website and local press were searched; the stone-clad
 * building in the Commons photos of central Alexandria is the Prefecture at the
 * Heroes' monument, not this building). The model is therefore a careful
 * massing study from:
 *  - the OSM outline (way 215059133, L-shape 51.2 × 33.3 m, long axis 41°) that
 *    contains the town-hall node 1179010110: +X = 41° (north-east, along the
 *    long wing), +Z = 131°; the short south-west end (−X) faces Str. Dunării;
 *  - aerial imagery (Esri World Imagery, viewed for context only): a broad
 *    block along Str. Dunării with a dark grey hipped roof, a narrower wing to
 *    the north-east with a light gabled roof along its axis, and a low
 *    flat-roofed strip on the courtyard (south-east) side of that wing;
 *  - typology: storey heights and window rhythm of a Romanian municipal
 *    office building (assumed: street block three storeys, eave 11.2 m; wing
 *    two storeys, eave 8.0 m; strip one storey, 4.2 m).
 * COLOR METAL scope: both pitched roofs (≈ 25°) in natural titanium-zinc
 * standing seam (0.5 m pans) — which surfaces were actually covered is not
 * documented.
 * Approximations: everything above the footprint (heights, storeys, windows,
 * entrance, roof pitches) is assumed; façades are a neutral grid.
 */
import * as THREE from 'three'
import { Builder, V, mat, window_, door, seams, hippedRoof, gableRoof, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.05, 0.045)
const REN = 'alxRender'
const TRM = 'alxTrim'

/* plan (model frame, from the OSM outline) */
const X0 = -25.6
const X1 = 25.6
const ZN0 = -16.67 // north-west side of the long wing
const ZS = 16.67 // south-east end of the street block
const XB = -11.5 // street block depth limit / wing start
const ZW = -3.0 // south-east face of the gabled wing
const ZT = 2.6 // south-east face of the low strip

/* heights (assumed) */
const E_ST = 11.2
const E_W = 8.0
const E_T = 4.2

function grid(b: Builder, face: Face, plane: number, u0: number, u1: number, step: number, floors: number[], w = 1.4, h = 1.7) {
  const n = Math.max(1, Math.round((u1 - u0) / step))
  const s = (u1 - u0) / n
  for (const y of floors) for (let i = 0; i < n; i++) window_(b, face, plane, u0 + s * (i + 0.5), y, { w, h, frame: 0.12, frameKey: TRM, glassKey: 'glassC', inset: 0.03, sill: true })
}

function build(): Builder {
  const b = new Builder()

  /* ================= volumes ================= */
  // street block (three storeys)
  b.block(REN, XB - X0, E_ST, ZS - ZN0, (X0 + XB) / 2, 0, (ZN0 + ZS) / 2)
  b.block('alxSocle', XB - X0 + 0.12, 0.8, ZS - ZN0 + 0.12, (X0 + XB) / 2, 0, (ZN0 + ZS) / 2)
  for (const y of [3.9, 7.5]) b.block(TRM, XB - X0 + 0.1, 0.18, ZS - ZN0 + 0.1, (X0 + XB) / 2, y, (ZN0 + ZS) / 2)
  b.block(TRM, XB - X0 + 0.5, 0.4, ZS - ZN0 + 0.5, (X0 + XB) / 2, E_ST - 0.4, (ZN0 + ZS) / 2)
  // north-east wing (two storeys)
  b.block(REN, X1 - XB, E_W, ZW - ZN0, (XB + X1) / 2, 0, (ZN0 + ZW) / 2)
  b.block('alxSocle', X1 - XB + 0.12, 0.6, ZW - ZN0 + 0.12, (XB + X1) / 2, 0, (ZN0 + ZW) / 2)
  b.block(TRM, X1 - XB + 0.1, 0.18, ZW - ZN0 + 0.1, (XB + X1) / 2, 3.9, (ZN0 + ZW) / 2)
  b.block(TRM, X1 - XB + 0.45, 0.35, ZW - ZN0 + 0.45, (XB + X1) / 2, E_W - 0.35, (ZN0 + ZW) / 2)
  // low flat-roofed strip on the courtyard side
  b.block(REN, X1 - XB, E_T, ZT - ZW, (XB + X1) / 2, 0, (ZW + ZT) / 2)
  b.block(TRM, X1 - XB + 0.2, 0.3, ZT - ZW + 0.2, (XB + X1) / 2, E_T - 0.3, (ZW + ZT) / 2)
  b.block('alxFlat', X1 - XB - 0.4, 0.06, ZT - ZW - 0.4, (XB + X1) / 2, E_T - 0.1, (ZW + ZT) / 2)
  b.block(ZN, X1 - XB + 0.24, 0.06, ZT - ZW + 0.24, (XB + X1) / 2, E_T, (ZW + ZT) / 2) // coping (as a band)
  b.block('alxFlat', X1 - XB - 0.3, 0.08, ZT - ZW - 0.3, (XB + X1) / 2, E_T + 0.02, (ZW + ZT) / 2)

  /* ================= façades (neutral grid) ================= */
  const stFloors = [1.6, 5.0, 8.6]
  // street front (−X): central entrance with canopy
  grid(b, '-x', X0, ZN0 + 1.5, -3.2, 3.0, stFloors)
  grid(b, '-x', X0, 3.2, ZS - 1.5, 3.0, stFloors)
  grid(b, '-x', X0, -3.0, 3.0, 3.0, [5.0, 8.6])
  door(b, '-x', X0, 0, { w: 3.0, h: 2.8, y0: 0.8, leafKey: 'glassC', frameKey: TRM, frame: 0.2 })
  b.block(TRM, 1.8, 0.3, 7.0, X0 - 0.9, 3.7, 0)
  for (let i = 0; i < 3; i++) b.block('alxSocle', 0.35, 0.8 - i * 0.27, 6.0, X0 - 0.2 - i * 0.35, 0, 0)
  // street block sides
  grid(b, '+z', ZS, X0 + 1.2, XB - 1.0, 3.0, stFloors)
  grid(b, '-z', ZN0, -(XB - 0.5), -(X0 + 1.2), 3.0, stFloors)
  grid(b, '+x', XB, -(ZS - 1.2), -(ZT + 0.8), 3.0, stFloors)
  // north-east wing
  grid(b, '-z', ZN0, -(X1 - 1.0), -(XB + 1.0), 3.1, [1.4, 4.8])
  grid(b, '+x', X1, -(ZW - 0.8), -(ZN0 + 1.0), 3.0, [1.4, 4.8])
  grid(b, '+z', ZW, XB + 1.0, X1 - 1.0, 3.1, [4.8])
  grid(b, '+z', ZT, XB + 1.0, X1 - 1.0, 3.1, [1.2], 1.6, 1.8)
  grid(b, '+x', X1, -(ZT - 0.6), -(ZW + 0.6), 3.0, [1.2], 1.6, 1.8)

  /* ================= roofs (natural titanium-zinc) ================= */
  hippedRoof(b, ZN, { x: (X0 + XB) / 2, z: (ZN0 + ZS) / 2, w: XB - X0, d: ZS - ZN0, y: E_ST, pitch: 25, overhang: 0.5, seams: SEAM })
  gableRoof(b, ZN, { x: (XB + X1) / 2 + 0.3, z: (ZN0 + ZW) / 2, w: X1 - XB - 0.6, d: ZW - ZN0, y: E_W, pitch: 25, ridge: 'x', overhang: 0.45, seams: SEAM, wallKey: REN })
  // gutters
  const t = Math.tan((25 * Math.PI) / 180)
  for (const z of [ZN0 - 0.45, ZW + 0.45]) b.beam(ZN, V(XB, E_W - 0.45 * t - 0.05, z), V(X1 + 0.3, E_W - 0.45 * t - 0.05, z), 0.18, 0.16)
  for (const [x, z] of [
    [X0 - 0.15, ZN0 + 0.6],
    [X0 - 0.15, ZS - 0.6],
    [X1 + 0.15, ZN0 + 0.6],
  ])
    b.rod(ZN, V(x, 0.3, z), V(x, (x < 0 ? E_ST : E_W) - 0.3, z), 0.06, 8)
  // gable louvres
  for (const x of [X1]) {
    const m = mat(x + 0.02, 0, (ZN0 + ZW) / 2, Math.PI / 2)
    b.add('glassC', new THREE.CircleGeometry(0.5, 16), new THREE.Matrix4().multiplyMatrices(m, mat(0, E_W + 1.4, 0)))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-18, 13, 0],
  materials: () => ({
    alxRender: new THREE.MeshStandardMaterial({ color: '#e3ddd0', roughness: 0.9 }),
    alxTrim: new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.85 }),
    alxSocle: new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.9 }),
    alxFlat: new THREE.MeshStandardMaterial({ color: '#5e6064', roughness: 0.9 }),
  }),
  notes:
    'Massing model only (no usable photograph found): L-shaped office building after the OSM outline and aerial imagery, heights and façades assumed; pitched roofs shown in natural titanium-zinc per the COLOR METAL records.',
}
export default model
