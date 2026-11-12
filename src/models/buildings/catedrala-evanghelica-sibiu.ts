/**
 * Catedrala Evanghelică „Sfânta Maria”, Sibiu (Evangelische Stadtpfarrkirche
 * Hermannstadt), Piața Huet — OSM way 585720583.
 *
 * Modelling specification (real metres). +X = church axis towards the choir
 * (east). The long walls of the OSM outline run at ≈88° (the 83.1° minimum
 * rectangle is skewed by the side chapels), so the model uses 88°. +Z = south.
 *  - Plan after the OSM outline (72 × 22 m in the 2019 restoration concept):
 *    west Ferula (x −37.2…−21.5, full width), Gothic hall of nave and aisles
 *    (x −21.5…20.5, z −12.1…13.5) with the west tower (≈9 m square) standing in
 *    its west bay, choir 10.6 m wide closed by three sides of an octagon
 *    (apse face at x = 37.2), north sacristy and south choir chapel flanking
 *    the choir, south porch (x −7…0) and a projecting south bay (x 10…20.5),
 *    north porch and the tall north chapel (x 8.9…19.5), octagonal stair
 *    turret on the south side at x ≈ −20.6.
 *  - Heights: tower 73.3 m to the finial (OSM height=74; published 73.34 m);
 *    top cornice at ≈49 m (spire ≈ 2.1 × tower width in the distant view 04);
 *    clock stage with a clock and a pointed window per face; four octagonal
 *    corner turrets with tiled caps; walls and gable bases ≈15.5 m (photo 02),
 *    one very high main roof over the hall (≈55°, ridge ≈ 33.8 m — the tower
 *    disappears behind it at about that height in photo 04), choir eave 16 m
 *    (choir ≈15 m high per the restoration concept), choir ridge ≈ 25 m.
 *  - South side (photos 02, 03): a row of transverse gabled roofs, one per
 *    bay, gables with dog-tooth stone edging and slit windows, ochre sandstone
 *    buttresses between the bays, tall traceried windows above small pointed
 *    windows; the porch gable with portal; the stair turret with tiled cap.
 *  - North side (photo 01): tall north chapel gable with a very tall window,
 *    lower sacristy, small north porch.
 *  - Roofs: polychrome glazed tiles with the yellow lozenge net as photographed
 *    (procedural texture). Spire and turret caps glazed tile (darker), as in all
 *    post-restoration photographs.
 *  - METAL: COLOR METAL's records list copper sheet (2021, end of the general
 *    restoration). Its location is not documented and the post-restoration
 *    photographs show glazed tiles on all roofs, spire and turret caps; the
 *    copper is therefore shown (weathered, ≤2022) on the tower and turret
 *    finials, the tower and turret cornice and set-off flashings, buttress
 *    weatherings, gutters and downpipes — the elements where sheet copper is
 *    plausible and that read dark brown in the photos.
 * Approximations: Ferula roof and west front (not photographed), exact tower
 * position and stage heights, bay division of the north aisle, tracery and
 * sculpture simplified, the lozenge pattern is generic.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, faceFrame, cross, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const CU = 'copperBrown'
const TILE = 'sibTile'
const SPIRE = 'sibSpire' // glazed tile as photographed; swap to CU to show the helm in copper

const EAVE = 15.5
const MAIN = { x0: -21.5, x1: 20.5, zN: -12.1, zS: 13.5, pitch: 55 }
const MHW = (MAIN.zS - MAIN.zN) / 2
const MZC = (MAIN.zS + MAIN.zN) / 2
const MRIDGE = EAVE + MHW * Math.tan(MAIN.pitch * D2R)
const FER = { x0: -37.2, x1: -21.5, zN: -12.0, zS: 13.2, pitch: 47 }
const FHW = (FER.zS - FER.zN) / 2
const FZC = (FER.zS + FER.zN) / 2
const FRIDGE = EAVE + FHW * Math.tan(FER.pitch * D2R)
const TW = { x: -14.0, z: MZC, hw: 4.5, top: 49 }
const CH = { x0: 20.5, z: 1.2, hw: 5.3, eave: 16, pitch: 60 }
const RC = CH.hw / Math.sin(67.5 * D2R)
const XC = 31.9
const CRIDGE = CH.eave + CH.hw * Math.tan(CH.pitch * D2R)
const apsePt = (a: number, r: number, y: number) => V(XC + r * Math.cos(a * D2R), y, CH.z + r * Math.sin(a * D2R))

/** façade-local u for a world coordinate w along the façade (x for ±z faces, z for ±x faces). */
const U = (face: Face, w: number) => (face === '+z' || face === '-x' ? w : -w)
const FF = (face: Face, plane: number, w: number) => faceFrame(face, plane, U(face, w), 0, 0)

/** Pointed traceried window. */
function gwin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, lights = 2) {
  b.add('sibStone', extrude(frameShape('pointed', w, h, 0.34, 0, y0), 0.16), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.05)))
  for (let i = 1; i < lights; i++) b.add('sibStone', metricBox(0.12, h - w * 0.7, 0.1), M(m, mat(-w / 2 + (i * w) / lights, y0 + (h - w * 0.7) / 2, 0.09)))
  for (let j = 1; j < Math.round(h / 1.3); j++) b.add('lead', metricBox(w - 0.05, 0.04, 0.05), M(m, mat(0, y0 + j * 1.3, 0.08)))
  if (w > 1.4) b.add('sibStone', new THREE.TorusGeometry(w * 0.17, 0.04, 6, 14), M(m, mat(0, y0 + h - w * 0.52, 0.09)))
}

/** Gable wall (pentagon rising pr above the roof planes) on a façade with dog-tooth stone edging. */
function gable(b: Builder, face: Face, plane: number, wc: number, hw: number, eave: number, ridge: number, pitch: number, depth = 0.8, pr = 0.45) {
  const m = FF(face, plane, wc)
  const apex = ridge + pr / Math.cos(pitch * D2R)
  const s = new THREE.Shape([
    new THREE.Vector2(-hw - 0.1, eave - 0.02),
    new THREE.Vector2(hw + 0.1, eave - 0.02),
    new THREE.Vector2(hw + 0.1, eave + pr),
    new THREE.Vector2(0, apex),
    new THREE.Vector2(-hw - 0.1, eave + pr),
  ])
  b.add('sibRender', extrude(s, depth), M(m, mat(0, 0, -depth)))
  // stone band + dog-tooth steps along both rakes
  for (const sx of [-1, 1]) {
    const a = V(sx * (hw + 0.1), eave + pr, 0)
    const c = V(0, apex, 0)
    const L = a.distanceTo(c)
    const n = Math.max(3, Math.floor(L / 0.8))
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(c, (i + 0.5) / n)
      b.add('sibStone', metricBox(0.5, 0.34, depth + 0.12), M(m, mat(p.x - sx * 0.12, p.y + 0.05, -depth / 2 + 0.06)))
    }
    b.beam('sibStone', V(a.x, a.y - 0.25, 0).applyMatrix4(M(m, mat(0, 0, 0.02))), V(c.x, c.y - 0.25, 0).applyMatrix4(M(m, mat(0, 0, 0.02))), 0.35, 0.12, V(0, 1, 0))
  }
  b.add('sibStone', new THREE.ConeGeometry(0.25, 0.9, 4), M(m, mat(0, apex + 0.45, -depth / 2, Math.PI / 4)))
  b.add(CU, new THREE.SphereGeometry(0.12, 8, 6), M(m, mat(0, apex + 1.0, -depth / 2)))
  // slit windows
  const h = ridge - eave
  for (const u of h > 7 ? [-hw * 0.32, hw * 0.32] : [0]) {
    b.add('black', new THREE.PlaneGeometry(0.32, 1.5), M(m, mat(u, eave + h * 0.28, 0.02)))
    b.add('sibStone', extrude(frameShape('rect', 0.32, 1.5, 0.1, 0, 0), 0.06), M(m, mat(u, eave + h * 0.28 - 0.75, 0.0)))
  }
  if (h > 7) b.add('black', new THREE.PlaneGeometry(0.32, 1.3), M(m, mat(0, eave + h * 0.6, 0.02)))
}

/** Transverse gabled roof (ridge along Z) over x0..x1 from zb (inside) to the gable at zf. */
function transverse(b: Builder, x0: number, x1: number, zf: number, zb: number, eave: number, pitch: number, face: '+z' | '-z') {
  const t = Math.tan(pitch * D2R)
  const hw = (x1 - x0) / 2
  const xc = (x0 + x1) / 2
  const ridge = eave + hw * t
  const s = face === '+z' ? 1 : -1
  const ze = zf - s * 0.45
  const ov = 0.25
  const ey = eave - ov * t
  facet(b, TILE, [V(x0 - ov, ey, zb), V(x0 - ov, ey, ze), V(xc, ridge, ze), V(xc, ridge, zb)], { thickness: 0.1 })
  facet(b, TILE, [V(x1 + ov, ey, ze), V(x1 + ov, ey, zb), V(xc, ridge, zb), V(xc, ridge, ze)], { thickness: 0.1 })
  b.beam('sibRidge', V(xc, ridge + 0.08, zb), V(xc, ridge + 0.08, ze), 0.3, 0.2)
  gable(b, face, zf, xc, hw, eave, ridge, pitch)
  return ridge
}

/** Two-stage sandstone buttress with copper weatherings at p, outward normal n. */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, width: number, depth: number, h: number) {
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(depth, 0),
    new THREE.Vector2(depth, h * 0.5),
    new THREE.Vector2(depth * 0.6, h * 0.58),
    new THREE.Vector2(depth * 0.6, h * 0.9),
    new THREE.Vector2(-0.3, h),
  ])
  const up = V(0, 1, 0)
  const nn = n.clone().normalize()
  const t = V().crossVectors(nn, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(nn, up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(width / 2)))
  b.add('sibStone', extrude(prof, width), basis)
  const pt = (sx: number, y: number) => p.clone().add(nn.clone().multiplyScalar(sx)).add(V(0, y, 0))
  b.beam(CU, pt(depth + 0.08, h * 0.5 + 0.05), pt(depth * 0.6, h * 0.58 + 0.05), width + 0.12, 0.06, up)
  b.beam(CU, pt(depth * 0.6 + 0.08, h * 0.9 + 0.05), pt(-0.15, h + 0.05), width + 0.12, 0.06, up)
}

/** Octagonal tiled cap (pyramid) built from facets so the tile texture maps in metres. */
function octoCap(b: Builder, key: string, x: number, z: number, r: number, y0: number, h: number, phase = Math.PI / 8) {
  const ring = polyRing(8, r, y0, phase, x, z)
  const apex = V(x, y0 + h, z)
  for (let i = 0; i < 8; i++) {
    facet(b, key, [ring[i], ring[(i + 1) % 8], apex], { hint: V(ring[i].x + ring[(i + 1) % 8].x - 2 * x, 0.01, ring[i].z + ring[(i + 1) % 8].z - 2 * z) })
    b.beam('sibRidge', ring[i], apex, Math.max(0.06, r * 0.04), Math.max(0.05, r * 0.03))
  }
}

function finial(b: Builder, x: number, y: number, z: number, h: number, r: number) {
  b.rod(CU, V(x, y - 0.3, z), V(x, y + h, z), Math.max(0.04, r * 0.18), 8)
  b.add(CU, new THREE.SphereGeometry(r, 14, 10), mat(x, y + h * 0.35, z))
  b.add(CU, new THREE.SphereGeometry(r * 0.45, 10, 8), mat(x, y + h * 0.8, z))
}

function walls(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  b.block('sibRender', x1 - x0, h, z1 - z0, cx, 0, cz)
  b.block('sibStone', x1 - x0 + 0.3, 1.0, z1 - z0 + 0.3, cx, 0, cz)
  b.block('sibStone', x1 - x0 + 0.4, 0.35, z1 - z0 + 0.4, cx, h - 0.35, cz)
}

function build(): Builder {
  const b = new Builder()

  /* ================= wall volumes ================= */
  walls(b, MAIN.x0, MAIN.x1, MAIN.zN, MAIN.zS, EAVE)
  walls(b, FER.x0, FER.x1 + 0.01, FER.zN, FER.zS, EAVE)
  walls(b, -7.0, -0.1, MAIN.zS - 0.01, 19.3, EAVE) // south porch bay
  walls(b, 10.2, 20.5, MAIN.zS - 0.01, 16.2, EAVE) // projecting south bay
  walls(b, -8.1, -1.3, -17.9, MAIN.zN + 0.01, 7.0) // north porch
  walls(b, 8.85, 19.5, -19.4, MAIN.zN + 0.01, 18.0) // tall north chapel
  walls(b, 20.5, 28.7, -15.8, CH.z - CH.hw + 0.01, 10.0) // sacristy
  walls(b, 20.5, 28.3, CH.z + CH.hw - 0.01, 13.6, 11.0) // south choir chapel

  /* ================= choir + 3/8 apse ================= */
  const ring = (y: number, grow = 0) => {
    const hw = CH.hw + grow
    const rc = RC + grow / Math.cos(22.5 * D2R)
    return [V(CH.x0, y, CH.z - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(CH.x0, y, CH.z + hw)]
  }
  b.add('sibRender', loft([ring(0), ring(CH.eave)], { capTop: true, flat: true }))
  b.add('sibStone', loft([ring(0, 0.15), ring(1.0, 0.15)], { capTop: true, flat: true }))
  b.add('sibStone', loft([ring(CH.eave - 0.4, 0.25), ring(CH.eave, 0.25)], { capTop: true, flat: true }))
  for (const a of [-67.5, -22.5, 22.5, 67.5]) buttress(b, apsePt(a, RC, 0), V(Math.cos(a * D2R), 0, Math.sin(a * D2R)), 1.2, 2.0, 13.5)
  for (const s of [-1, 1]) buttress(b, V(31.2 - 1.6, 0, CH.z + s * CH.hw), V(0, 0, s), 1.1, 1.6, 13.5)
  for (const a of [45, 0, -45]) {
    const p = V(XC + CH.hw * Math.cos(a * D2R), 0, CH.z + CH.hw * Math.sin(a * D2R))
    gwin(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 2.2, 8.6, 5.2, 3)
  }
  for (const s of [-1, 1]) gwin(b, mat(31.6, 0, CH.z + s * CH.hw, s > 0 ? 0 : Math.PI), 2.0, 4.6, 10.4, 2)
  {
    // choir roof (tile) with hipped apse end
    const t = Math.tan(CH.pitch * D2R)
    const ov = 0.4
    const eY = CH.eave - ov * t
    const chw = CH.hw + ov
    const rcO = RC * (chw / CH.hw)
    const apex = V(XC, CRIDGE, CH.z)
    const cx0 = CH.x0 + 0.05
    facet(b, TILE, [V(cx0, eY, CH.z + chw), apsePt(67.5, rcO, eY), apex, V(cx0, CRIDGE, CH.z)], { thickness: 0.12 })
    facet(b, TILE, [apsePt(-67.5, rcO, eY), V(cx0, eY, CH.z - chw), V(cx0, CRIDGE, CH.z), apex], { thickness: 0.12 })
    const angs = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, TILE, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex], { thickness: 0.12 })
    b.beam('sibRidge', V(cx0, CRIDGE + 0.08, CH.z), V(apex.x, CRIDGE + 0.08, CH.z), 0.32, 0.2)
    for (const a of angs) b.beam('sibRidge', apsePt(a, rcO, eY + 0.08), V(apex.x, apex.y + 0.08, CH.z), 0.26, 0.16)
    const gut = [V(cx0, eY - 0.1, CH.z + chw + 0.08), ...angs.map((a) => apsePt(a, rcO + 0.08, eY - 0.1)), V(cx0, eY - 0.1, CH.z - chw - 0.08)]
    for (let i = 0; i < gut.length - 1; i++) b.beam(CU, gut[i], gut[i + 1], 0.2, 0.18)
    for (const a of [45, -45]) {
      const p = apsePt(a, CH.hw + 0.3, 0)
      b.rod(CU, V(p.x, 1.0, p.z), V(p.x, eY - 0.15, p.z), 0.065, 8)
    }
    cross(b, CU, XC, CRIDGE + 0.15, CH.z, 2.0, false, Math.PI / 2)
  }

  /* ================= main hall roof ================= */
  {
    const t = Math.tan(MAIN.pitch * D2R)
    const ov = 0.45
    const eY = EAVE - ov * t
    const xa = MAIN.x0 + 0.45
    const xb = MAIN.x1 - 0.45
    facet(b, TILE, [V(xa, eY, MAIN.zS + ov), V(xb, eY, MAIN.zS + ov), V(xb, MRIDGE, MZC), V(xa, MRIDGE, MZC)], { thickness: 0.14 })
    facet(b, TILE, [V(xb, eY, MAIN.zN - ov), V(xa, eY, MAIN.zN - ov), V(xa, MRIDGE, MZC), V(xb, MRIDGE, MZC)], { thickness: 0.14 })
    b.beam('sibRidge', V(xa, MRIDGE + 0.1, MZC), V(xb, MRIDGE + 0.1, MZC), 0.36, 0.24)
    b.beam(CU, V(MAIN.x0, eY - 0.1, MAIN.zN - ov - 0.08), V(MAIN.x1, eY - 0.1, MAIN.zN - ov - 0.08), 0.22, 0.2)
    gable(b, '-x', MAIN.x0, MZC, MHW, EAVE, MRIDGE, MAIN.pitch, 0.9)
    gable(b, '+x', MAIN.x1, MZC, MHW, EAVE, MRIDGE, MAIN.pitch, 0.9)
    // roof dormer-hatches (photo 01)
    for (const x of [-4, 6]) {
      const z = MZC - 6.5
      const y = MRIDGE - 6.5 * t
      b.block('sibRender', 0.9, 1.6, 0.9, x, y - 0.3, z)
      b.block(CU, 1.1, 0.12, 1.1, x, y + 1.3, z)
    }
  }
  /* ================= Ferula roof ================= */
  {
    const t = Math.tan(FER.pitch * D2R)
    const ov = 0.45
    const eY = EAVE - ov * t
    const xa = FER.x0 + 0.45
    const xb = FER.x1 + 0.2
    facet(b, TILE, [V(xa, eY, FER.zS + ov), V(xb, eY, FER.zS + ov), V(xb, FRIDGE, FZC), V(xa, FRIDGE, FZC)], { thickness: 0.14 })
    facet(b, TILE, [V(xb, eY, FER.zN - ov), V(xa, eY, FER.zN - ov), V(xa, FRIDGE, FZC), V(xb, FRIDGE, FZC)], { thickness: 0.14 })
    b.beam('sibRidge', V(xa, FRIDGE + 0.1, FZC), V(xb, FRIDGE + 0.1, FZC), 0.34, 0.22)
    b.beam(CU, V(FER.x0, eY - 0.1, FER.zN - ov - 0.08), V(FER.x1, eY - 0.1, FER.zN - ov - 0.08), 0.22, 0.2)
    gable(b, '-x', FER.x0, FZC, FHW, EAVE, FRIDGE, FER.pitch, 0.9)
  }

  /* ================= south side: transverse gabled bays ================= */
  const southBays: [number, number, number][] = [
    [-37.0, -29.8, FER.zS],
    [-29.8, -22.4, FER.zS],
    [-18.8, -7.0, MAIN.zS],
    [-7.0, -0.1, 19.3],
    [-0.1, 10.2, MAIN.zS],
    [10.2, 20.5, 16.2],
  ]
  for (const [x0, x1, zf] of southBays) {
    transverse(b, x0, x1, zf, 3.0, EAVE, 60, '+z')
    const xc = (x0 + x1) / 2
    const w = Math.min(3.0, (x1 - x0) * 0.3)
    if (x0 === -7.0) {
      // porch bay: portal + tall window
      const m = FF('+z', zf, xc)
      b.add('sibStone', extrude(frameShape('pointed', 2.6, 4.6, 0.5, 0, 0.3), 0.3), m)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.6, 4.6, 0, 0.3, 10))), M(m, mat(0, 0, 0.05)))
      b.block('sibStone', 6.6, 0.5, 0.4, xc, 5.6, zf + 0.2)
      gwin(b, m, 2.8, 7.6, 6.8, 3)
    } else {
      gwin(b, FF('+z', zf, xc), w, 7.4, 6.8, w > 2.4 ? 3 : 2)
      gwin(b, FF('+z', zf, xc), 1.2, 2.5, 1.4, 1)
    }
  }
  // south choir chapel (lower gable)
  transverse(b, 20.5, 28.3, 13.6, 4.0, 11.0, 58, '+z')
  gwin(b, FF('+z', 13.6, 24.4), 1.8, 5.0, 4.0, 2)
  // stone buttresses between the south bays
  for (const [x, z] of [
    [-29.8, FER.zS],
    [-22.4, FER.zS],
    [-7.0, 19.3],
    [-0.1, 19.3],
    [10.2, 16.2],
    [20.5, 16.2],
    [-37.0, FER.zS],
  ] as [number, number][]) {
    buttress(b, V(x, 0, z), V(0, 0, 1), 1.15, 1.6, 13.4)
    b.rod(CU, V(x + 0.9, 1.0, z + 0.2), V(x + 0.9, EAVE - 0.4, z + 0.2), 0.065, 8)
  }

  /* ================= stair turret (south) ================= */
  {
    const sx = -20.6
    const sz = 14.8
    const r = 1.95
    b.add('sibStone', loft([polyRing(8, r, 0, Math.PI / 8, sx, sz), polyRing(8, r, 21.0, Math.PI / 8, sx, sz)], { capTop: true, flat: true }))
    b.add('sibStone', loft([polyRing(8, r + 0.25, 20.6, Math.PI / 8, sx, sz), polyRing(8, r + 0.25, 21.2, Math.PI / 8, sx, sz)], { capTop: true, capBottom: true, flat: true }))
    b.add(CU, loft([polyRing(8, r + 0.32, 21.2, Math.PI / 8, sx, sz), polyRing(8, r + 0.05, 21.45, Math.PI / 8, sx, sz)], { capTop: true, flat: true }))
    octoCap(b, TILE, sx, sz, r + 0.2, 21.4, 6.0)
    finial(b, sx, 27.4, sz, 1.4, 0.18)
    for (const y of [3.5, 8.5, 13.5, 18.0]) {
      b.add('black', new THREE.PlaneGeometry(0.25, 1.0), mat(sx, y, sz + r * Math.cos(Math.PI / 8) + 0.02))
    }
  }

  /* ================= north side ================= */
  {
    // tall north chapel: transverse gable facing north with a very tall window
    transverse(b, 8.85, 19.5, -19.4, -4.0, 18.0, 60, '-z')
    gwin(b, FF('-z', -19.4, 14.2), 3.0, 12.5, 4.6, 3)
    for (const x of [8.85, 19.5]) buttress(b, V(x, 0, -19.4), V(0, 0, -1), 1.15, 1.6, 15.0)
    // north porch
    transverse(b, -8.1, -1.3, -17.9, -11.0, 7.0, 50, '-z')
    {
      const m = FF('-z', -17.9, -4.7)
      b.add('sibStone', extrude(frameShape('pointed', 2.2, 3.8, 0.4, 0, 0.3), 0.25), m)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.2, 3.8, 0, 0.3, 10))), M(m, mat(0, 0, 0.05)))
    }
    // sacristy: gable roof along X with stepped gables
    {
      const t = Math.tan(52 * D2R)
      const z0 = -15.8
      const z1 = CH.z - CH.hw
      const zc = (z0 + z1) / 2
      const hw = (z1 - z0) / 2
      const ridge = 10.0 + hw * t
      const ov = 0.35
      const eY = 10.0 - ov * t
      facet(b, TILE, [V(20.9, eY, z0 - ov), V(28.3, eY, z0 - ov), V(28.3, ridge, zc), V(20.9, ridge, zc)], { thickness: 0.1 })
      facet(b, TILE, [V(28.3, eY, z1), V(20.9, eY, z1), V(20.9, ridge, zc), V(28.3, ridge, zc)], { thickness: 0.1 })
      b.beam('sibRidge', V(20.9, ridge + 0.08, zc), V(28.3, ridge + 0.08, zc), 0.3, 0.2)
      gable(b, '+x', 28.7, zc, hw, 10.0, ridge, 52, 0.8)
      b.beam(CU, V(20.5, eY - 0.1, z0 - ov - 0.08), V(28.7, eY - 0.1, z0 - ov - 0.08), 0.2, 0.18)
      for (const x of [23.0, 26.4]) gwin(b, FF('-z', z0, x), 1.4, 3.2, 3.6, 1)
      // small polygonal chapel apse on the north face (photo 01)
      const ax = 24.6
      const ar = 2.2
      const half: THREE.Vector3[] = []
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI + (i * Math.PI) / 4
        half.push(V(ax + Math.cos(a) * ar, 0, z0 + Math.sin(a) * ar * 0.9))
      }
      const lift = (y: number) => half.map((p) => V(p.x, y, p.z))
      b.add('sibRender', loft([lift(0), lift(6.2)], { capTop: true, flat: true }))
      const apexA = V(ax, 8.6, z0)
      const ringA = half.map((p) => V(ax + (p.x - ax) * 1.15, 6.0, z0 + (p.z - z0) * 1.15))
      for (let i = 0; i < 4; i++) facet(b, TILE, [ringA[i], ringA[i + 1], apexA], { thickness: 0.08 })
      b.add('glassC', new THREE.CircleGeometry(0.5, 16), mat(ax, 4.4, z0 - ar * 0.9 - 0.02, Math.PI))
      b.add('sibStone', new THREE.TorusGeometry(0.55, 0.1, 6, 16), mat(ax, 4.4, z0 - ar * 0.9 - 0.04, Math.PI))
    }
    // north aisle and Ferula windows
    for (const x of [-16.5, -11.0, 3.6]) gwin(b, FF('-z', MAIN.zN, x), 2.4, 7.0, 6.6, 2)
    for (const x of [-33.0, -25.6]) {
      gwin(b, FF('-z', FER.zN, x), 2.0, 5.0, 7.6, 2)
      gwin(b, FF('-z', FER.zN, x), 1.1, 2.3, 1.6, 1)
    }
    for (const x of [-26.0, 4.0, 15.0]) buttress(b, V(x, 0, x < -21 ? FER.zN : MAIN.zN), V(0, 0, -1), 1.1, 1.5, 13.0)
    // Ferula west front
    gwin(b, FF('-x', FER.x0, FZC), 2.6, 7.0, 6.0, 3)
    door(b)
    for (const z of [FER.zN, FER.zS]) buttress(b, V(FER.x0, 0, z + (z < 0 ? 1.0 : -1.0)), V(-1, 0, 0), 1.1, 1.5, 13.0)
  }

  /* ================= tower ================= */
  {
    const { x, z, hw, top } = TW
    const y0 = EAVE - 1
    b.block('sibRender', 2 * hw, top - y0, 2 * hw, x, y0, z)
    // corner quoins
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      let k = 0
      for (let y = MRIDGE - 6; y < top - 0.8; y += 0.62, k++) {
        const la = k % 2 ? 1.1 : 0.65
        const lb = k % 2 ? 0.65 : 1.1
        b.block('sibStone', la, 0.52, 0.12, x + sx * (hw - la / 2), y, z + sz * (hw + 0.04))
        b.block('sibStone', 0.12, 0.52, lb, x + sx * (hw + 0.04), y, z + sz * (hw - lb / 2))
      }
    }
    // set-off courses with copper flashings
    for (const y of [34.6, 40.2]) {
      b.block('sibStone', 2 * hw + 0.36, 0.32, 2 * hw + 0.36, x, y, z)
      b.add(CU, loft([rectRing(hw + 0.26, hw + 0.26, y + 0.32, x, z), rectRing(hw + 0.02, hw + 0.02, y + 0.55, x, z)], { capTop: false, flat: true }))
    }
    // top cornice + copper flashing
    b.block('sibStone', 2 * hw + 0.6, 0.7, 2 * hw + 0.6, x, top - 0.7, z)
    b.add(CU, loft([rectRing(hw + 0.38, hw + 0.38, top, x, z), rectRing(hw - 0.2, hw - 0.2, top + 0.3, x, z)], { capTop: true, flat: true }))
    // clock stage: clock + pointed window per face; slit windows below
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f === '+x' ? x + hw : f === '-x' ? x - hw : f === '+z' ? z + hw : z - hw
      const m = FF(f, plane, f.endsWith('x') ? z : x)
      b.add('sibClock', new THREE.CylinderGeometry(1.5, 1.5, 0.12, 32), M(m, mat(0, 42.6, 0.08, 0, Math.PI / 2)))
      b.add('gilt', new THREE.TorusGeometry(1.5, 0.08, 6, 32), M(m, mat(0, 42.6, 0.15)))
      b.add('gilt', metricBox(0.09, 1.1, 0.04), M(m, mat(0.15, 42.95, 0.18, 0, 0, -0.5)))
      b.add('gilt', metricBox(0.09, 0.8, 0.04), M(m, mat(-0.25, 42.4, 0.18, 0, 0, -2.3)))
      gwin(b, m, 1.2, 2.7, 45.4, 2)
      for (const y of [30.5, 36.8]) {
        b.add('black', new THREE.PlaneGeometry(0.3, 1.5), M(m, mat(0, y, 0.02)))
        b.add('sibStone', extrude(frameShape('rect', 0.3, 1.5, 0.12, 0, y - 0.75), 0.06), m)
      }
    }
    // corner turrets
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = x + sx * (hw - 0.35)
      const cz = z + sz * (hw - 0.35)
      const r = 1.1
      b.add('sibStone', new THREE.CylinderGeometry(r, 0.25, 1.6, 8), mat(cx, top - 0.8, cz, Math.PI / 8))
      b.add('sibStoneLt', loft([polyRing(8, r, top, Math.PI / 8, cx, cz), polyRing(8, r, top + 3.4, Math.PI / 8, cx, cz)], { capTop: true, flat: true }))
      b.add('sibStone', loft([polyRing(8, r + 0.12, top + 3.4, Math.PI / 8, cx, cz), polyRing(8, r + 0.12, top + 3.75, Math.PI / 8, cx, cz)], { capTop: true, capBottom: true, flat: true }))
      b.add(CU, loft([polyRing(8, r + 0.2, top + 3.75, Math.PI / 8, cx, cz), polyRing(8, r + 0.02, top + 3.95, Math.PI / 8, cx, cz)], { capTop: true, flat: true }))
      for (let k = 0; k < 8; k += 2) {
        const a = Math.PI / 8 + (k + 0.5) * (Math.PI / 4)
        b.add('black', new THREE.PlaneGeometry(0.28, 0.9), mat(cx + Math.cos(a) * r * 0.93, top + 1.7, cz + Math.sin(a) * r * 0.93, Math.PI / 2 - a))
      }
      octoCap(b, SPIRE, cx, cz, r + 0.12, top + 3.9, 6.2)
      finial(b, cx, top + 10.1, cz, 1.5, 0.16)
    }
    // main spire (octagonal, glazed tile)
    octoCap(b, SPIRE, x, z, 4.15, top + 0.25, 21.9, 0)
    finial(b, x, top + 22.1, z, 2.2, 0.36)
  }

  return b
}

function door(b: Builder) {
  const m = FF('-x', FER.x0, FZC)
  b.add('sibStone', extrude(frameShape('pointed', 2.4, 4.2, 0.45, 0, 0.3), 0.25), m)
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.4, 4.2, 0, 0.3, 10))), M(m, mat(0, 0, 0.05)))
}

function rectRing(hx: number, hz: number, y: number, cx: number, cz: number) {
  return [V(cx - hx, y, cz - hz), V(cx + hx, y, cz - hz), V(cx + hx, y, cz + hz), V(cx - hx, y, cz + hz)]
}

/** Glazed-tile roof texture: tile courses + yellow lozenge net with dark/green inner lozenges. UV in metres. */
function lozengeTexture(bg: string, net: string, inner: string, accent: string, sizeM: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, 256, 256)
  // tile courses with staggered joints
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = 'rgba(0,0,0,0.16)'
    g.fillRect(0, y + 13, 256, 3)
    for (let x = (y / 16) % 2 ? 0 : 8; x < 256; x += 16) {
      g.fillStyle = 'rgba(0,0,0,0.10)'
      g.fillRect(x, y, 2, 13)
    }
  }
  const diamond = (cx: number, cy: number, rx: number, ry: number) => {
    g.beginPath()
    g.moveTo(cx, cy - ry)
    g.lineTo(cx + rx, cy)
    g.lineTo(cx, cy + ry)
    g.lineTo(cx - rx, cy)
    g.closePath()
  }
  // inner lozenges
  for (const [cx, cy] of [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]]) {
    g.fillStyle = inner
    diamond(cx, cy, 58, 58)
    g.fill()
    g.fillStyle = accent
    diamond(cx, cy, 24, 24)
    g.fill()
  }
  // yellow net
  g.strokeStyle = net
  g.lineWidth = 14
  for (const [x0, y0, x1, y1] of [[-128, 128, 128, -128], [0, 256, 256, 0], [128, 384, 384, 128], [-128, 128, 128, 384], [0, 0, 256, 256], [128, -128, 384, 128]]) {
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / sizeM, 1 / sizeM)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [TW.x, TW.top + 0.5, TW.z + TW.hw + 0.4],
  materials: () => ({
    sibRender: new THREE.MeshStandardMaterial({ color: '#f0ede5', roughness: 0.9 }),
    sibStone: new THREE.MeshStandardMaterial({ color: '#bf9c63', roughness: 0.88 }),
    sibStoneLt: new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.88 }),
    sibTile: new THREE.MeshStandardMaterial({ map: lozengeTexture('#7b3a2a', '#cf9f3e', '#4f3b35', '#4d6b4a', 1.9), roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide }),
    sibSpire: new THREE.MeshStandardMaterial({ map: lozengeTexture('#4e3a31', '#b48d3c', '#34353a', '#6a5638', 1.4), roughness: 0.4, metalness: 0.05, side: THREE.DoubleSide }),
    sibRidge: new THREE.MeshStandardMaterial({ color: '#5a3527', roughness: 0.5 }),
    sibClock: new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5 }),
  }),
  notes:
    'Gothic hall church with the 73 m west tower (four corner turrets), transverse gabled south bays and polychrome glazed-tile roofs as photographed; copper shown on the tower finials, cornice and set-off flashings, buttress weatherings and rainwater goods.',
}
export default model
