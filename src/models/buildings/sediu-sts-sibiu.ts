/**
 * Sediul STS Sibiu — Centrul de servicii esențiale de comunicații și
 * tehnologia informației, Str. Oituz (next to Cinema Arta), built 2021–2022.
 * No OSM outline: size taken from the photographs.
 *
 * Modelling specification (real metres):
 *  - Compact five-storey block ≈ 27 × 16 m (photo 02, February 2022, under
 *    construction; the long face is ≈ 1.7 × the short one), ground floor
 *    4.5 m + four office / data-centre floors of 3.6 m, parapet to ≈ 19.7 m,
 *    a glazed rooftop pavilion on steel posts (photo 02).
 *  - Main façade (+Z, photo 01, November 2022): light stone-like panels, dark
 *    grey horizontal bands at the slab levels across most of the façade,
 *    narrow tall windows in columns, glazed dark ground floor with the
 *    entrance under a deep dark canopy on two white columns.
 *  - COLOR METAL copper (register 2022: copper sheet and coil for exterior wall
 *    cladding): no finished photograph shows copper. In photo 02 the short
 *    façade (−X) has a different substructure from the main façade — closely
 *    spaced vertical rails and two full-height strip windows — so the copper
 *    standing-seam wall cladding (pans 0.5 m) is placed there, weathered
 *    (copperBrown). This placement is an assumption.
 * Approximations (reference-limited): footprint and heights estimated (no
 * outline, no drawings); the rear and the second short façade are not
 * photographed and are drawn with the main-façade cladding; window pattern
 * regularised.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, seams } from '../kit'
import type { ModelModule } from '../registry'

const L = 27.0
const D = 16.0
const GF = 4.5
const FH = 3.6
const TOP = GF + 4 * FH // 18.9
const PAR = TOP + 0.8
const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.04, 0.04)

function build(): Builder {
  const b = new Builder()
  const x0 = -L / 2
  const x1 = L / 2
  const z0 = -D / 2
  const z1 = D / 2
  const slabs = [GF, GF + FH, GF + 2 * FH, GF + 3 * FH]
  const sills = slabs.map((y) => y + 0.75)

  /* ================= volume ================= */
  b.block('stsPanel', L, PAR, D, 0, 0, 0)
  b.block('stsDark', L + 0.06, GF, D + 0.06, 0, 0, 0)
  // parapet coping
  b.block('stsDark', L + 0.2, 0.12, D + 0.2, 0, PAR, 0)
  // panel joints (light façade): vertical every 1.5 m, horizontal at mid-floor
  for (const [face, len] of [
    ['+z', L],
    ['-z', L],
    ['+x', D],
  ] as const) {
    const n = Math.floor(len / 1.5)
    for (let i = 1; i < n; i++) {
      const u = -len / 2 + i * (len / n)
      if (face === '+z') b.add('stsJoint', metricBox(0.02, PAR - GF, 0.02), mat(u, GF + (PAR - GF) / 2, z1 + 0.01))
      else if (face === '-z') b.add('stsJoint', metricBox(0.02, PAR - GF, 0.02), mat(u, GF + (PAR - GF) / 2, z0 - 0.01))
      else b.add('stsJoint', metricBox(0.02, PAR - GF, 0.02), mat(x1 + 0.01, GF + (PAR - GF) / 2, u))
    }
  }

  /* ================= main façade (+Z) ================= */
  const cols = [-12.0, -9.2, -5.6, -2.8, 1.2, 4.0, 7.4, 10.8]
  for (const y of slabs) {
    // dark band at the slab level across the main part
    b.add('stsDark', metricBox(22.0, 0.95, 0.08), mat(-2.5, y + 0.1, z1 + 0.04))
  }
  sills.forEach((y, k) => {
    cols.forEach((x, i) => {
      const dx = (k + i) % 2 ? 0.25 : -0.25
      b.add('glassC', metricBox(1.15, 2.35, 0.06), mat(x + dx, y + 1.18, z1 + 0.03))
      b.add('stsFrame', metricBox(1.3, 0.08, 0.14), mat(x + dx, y - 0.02, z1 + 0.05))
      b.add('stsFrame', metricBox(1.3, 0.08, 0.1), mat(x + dx, y + 2.4, z1 + 0.04))
      for (const s of [-1, 1]) b.add('stsFrame', metricBox(0.07, 2.4, 0.1), mat(x + dx + s * 0.62, y + 1.18, z1 + 0.04))
    })
  })
  // ground floor: curtain wall, entrance, canopy on two white columns
  b.add('glassG', metricBox(16.0, 3.6, 0.06), mat(-2.0, 0.3 + 1.8, z1 + 0.05))
  for (let x = -10; x <= 6.01; x += 1.6) b.add('stsFrame', metricBox(0.08, 3.6, 0.12), mat(x, 2.1, z1 + 0.08))
  b.add('stsFrame', metricBox(16.0, 0.1, 0.12), mat(-2.0, 2.8, z1 + 0.08))
  b.add('glassC', metricBox(3.0, 2.6, 0.08), mat(-0.5, 1.6, z1 + 0.1))
  {
    const cz = z1 + 1.6
    b.block('stsDark', 16.5, 0.75, 3.3, -1.5, GF - 0.35, cz)
    b.block('stsPanel', 16.3, 0.05, 3.1, -1.5, GF - 0.4, cz)
    for (const x of [-9.4, 6.4]) b.block('stsPanel', 0.45, GF - 0.35, 0.45, x, 0, z1 + 3.0)
    // low planters / steps
    b.block('stsDark', 5.0, 0.15, 2.0, -0.5, 0, z1 + 1.0)
  }
  // service grilles on the ground floor (photo 01)
  for (const x of [-12.2, 8.5, 11.5]) b.add('stsGrille', metricBox(2.2, 1.0, 0.08), mat(x, 0.6, z1 + 0.05))

  /* ================= second long façade (−Z) and short façade (+X) ================= */
  sills.forEach((y) => {
    cols.forEach((x) => {
      b.add('glassC', metricBox(1.15, 2.35, 0.06), mat(-x, y + 1.18, z0 - 0.03))
    })
    for (const z of [-5.0, -1.7, 1.7, 5.0]) b.add('glassC', metricBox(0.06, 2.35, 1.15), mat(x1 + 0.03, y + 1.18, z))
  })
  for (const z of [-4.0, 4.0]) b.add('glassC', metricBox(0.06, 2.8, 2.4), mat(x1 + 0.04, 1.8, z))

  /* ================= copper-clad short façade (−X) ================= */
  {
    const xo = x0 - 0.12
    // standing-seam copper panels from the ground-floor head to the parapet, seams vertical
    const zA = z0 - 0.12
    const zB = z1 + 0.12
    facet(b, CU, [V(xo, GF, zB), V(xo, GF, zA), V(xo, PAR + 0.05, zA), V(xo, PAR + 0.05, zB)], { seams: SEAM, hint: V(-1, 0, 0), thickness: 0.05 })
    // copper returns on the corners
    for (const z of [zA, zB]) b.block(CU, 0.14, PAR + 0.05 - GF, 0.14, xo + 0.05, GF, z)
    b.block(CU, 0.3, 0.1, D + 0.3, xo + 0.1, PAR + 0.05, 0)
    // two full-height strip windows
    for (const z of [-3.2, 2.2]) {
      b.add('glassC', metricBox(0.08, PAR - GF - 1.6, 1.0), mat(xo - 0.05, GF + (PAR - GF) / 2 - 0.3, z))
      b.add('stsFrame', metricBox(0.1, PAR - GF - 1.5, 0.08), mat(xo - 0.07, GF + (PAR - GF) / 2 - 0.3, z - 0.54))
      b.add('stsFrame', metricBox(0.1, PAR - GF - 1.5, 0.08), mat(xo - 0.07, GF + (PAR - GF) / 2 - 0.3, z + 0.54))
      for (const y of slabs.slice(1)) b.add(CU, metricBox(0.12, 0.4, 1.1), mat(xo - 0.06, y + 0.1, z))
    }
    // ground floor of the short side: dark cladding with a service door
    b.add('stsFrame', metricBox(0.08, 2.4, 1.4), mat(x0 - 0.05, 1.2, 4.5))
  }

  /* ================= roof: flat, with the glazed rooftop pavilion ================= */
  {
    const px = -3.0
    const pz = -3.0
    const pw = 7.0
    const pd = 5.0
    const ph = 3.2
    const RT = PAR + 0.12
    b.add('glassG', metricBox(pw, ph - 0.2, pd), mat(px, RT + 0.1 + (ph - 0.2) / 2, pz))
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      b.block('stsFrame', 0.16, ph, 0.16, px + (sx * pw) / 2, RT, pz + (sz * pd) / 2)
    b.block('stsFrame', pw + 0.3, 0.2, pd + 0.3, px, RT + ph, pz)
    for (let x = px - pw / 2 + 1.75; x < px + pw / 2; x += 1.75) b.block('stsFrame', 0.08, ph, 0.08, x, RT, pz + pd / 2)
    // roof plant
    b.block('stsGrille', 4.0, 1.4, 2.5, 7.5, PAR + 0.1, -4.0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-13.6, 11.0, 0],
  materials: () => ({
    stsPanel: new THREE.MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.85 }),
    stsDark: new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.7, metalness: 0.15 }),
    stsJoint: new THREE.MeshStandardMaterial({ color: '#b5b0a5', roughness: 0.9 }),
    stsFrame: new THREE.MeshStandardMaterial({ color: '#2c2f33', roughness: 0.5, metalness: 0.3 }),
    stsGrille: new THREE.MeshStandardMaterial({ color: '#55595e', roughness: 0.6, metalness: 0.3 }),
  }),
  notes:
    'New five-storey communications centre with stone-like panels and dark slab bands; the copper wall cladding of the register is not visible in the photographs and is placed on the short façade with strip windows (assumption); reference-limited.',
}
export default model
