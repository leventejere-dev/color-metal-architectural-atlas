/**
 * "Corp Mănăstirea Ponor" — one wing of the fortress-plan monks' monastery at Ponor
 * (Înălțarea Domnului, Trascău Mountains, Alba). The register does not say which wing
 * ("corp") received the copper; this model shows the long outer wing seen frontally in
 * the May 2023 drone photo 02 (stone-faced outer façade, corner pavilion with a lantern
 * turret), the wing that best fits the description. The church and the other wings
 * are not modelled.
 *
 * Modelling specification (real metres; origin = centre of the wing at ground):
 *  - Orientation: the church (OSM way 221250606, 22.1 × 12.4 m) runs at ≈ 93°, and
 *    photo 02 looks along its axis from the altar end, so the photographed wing is the
 *    east wing, perpendicular to the church: +X = 3° (north) along the wing, the corner
 *    pavilion at +X, the stone outer façade faces +Z (east, front = [0, 1]).
 *  - Size scaled from the church width in photos 01/02 (no outline of the wings is
 *    mapped): wing ≈ 47 m + corner pavilion 13 m = 60 m, depth 12 m (9 m of rooms and
 *    a 3 m two-storey arcaded gallery on the courtyard side, photo 01).
 *  - Two storeys, eave ≈ 6.6 m: rubble-stone outer façade with a row of small arched
 *    first-floor windows (≈ 2.2 m rhythm) and sparse ground-floor openings; white
 *    plastered courtyard side with round arches on piers on both levels.
 *  - Hipped roof ≈ 36° (ridge ≈ 11 m) with rows of roof windows (attic cells) and
 *    small white vent chimneys; the corner pavilion has a pyramidal roof (45°) carrying
 *    an octagonal white lantern turret with a bell-shaped cap and cross (≈ 17.5 m).
 *  - METAL: the 2023 photographs show all roofs of the monastery uniformly dark; the
 *    roof of this wing (with its pavilion and turret cap) is shown in dark, weathered
 *    copper — the material supplied by COLOR METAL according to its records (2021).
 *    Which wing and which surfaces actually received it is not documented.
 * Approximations: identification of the wing, all dimensions, window counts and the
 * courtyard arcades are interpreted from distant drone photographs; this is a
 * reference-limited massing model.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const CU = 'poCu'
const SEAM = seams(CU, 0.55, 0.045, 0.04)
const STONE = 'poStone'
const WALL = 'poWall'
const TRIM = 'poTrim'

/* plan */
const XS = -30 // south end of the wing
const XP = 17 // pavilion start
const XN = 30 // north end (pavilion)
const ZO = 6 // outer façade (+z, stone)
const ZC = -6 // courtyard face of the gallery
const ZR = -3 // courtyard face of the rooms (behind the gallery)
const PZ0 = -7 // pavilion courtyard face (projects 1 m)

/* heights */
const EAVE = 6.6
const FL1 = 3.3
const PITCH = 36
const T = Math.tan(PITCH * D2R)
const OV = 0.6

function smallArchWin(b: Builder, x: number, y0: number, w: number, h: number) {
  const m = mat(x, 0, ZO + 0.07, 0)
  b.add(TRIM, extrude(frameShape('round', w, h, 0.1, 0, y0), 0.06), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 8))), M(m, mat(0, 0, 0.02)))
}

function arcadeRow(b: Builder, x0: number, x1: number, z: number, y0: number, h: number, bay: number) {
  // wall panel with round-arched openings, facing −z (courtyard)
  const n = Math.round((x1 - x0) / bay)
  const w = (x1 - x0) / n
  const s = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y0 + h), new THREE.Vector2(x0, y0 + h)])
  const par = y0 > 0.5 ? 0.9 : 0 // parapet on the upper gallery
  for (let i = 0; i < n; i++) s.holes.push(new THREE.Path(opening('round', w - 0.7, h - 0.55 - par, x0 + (i + 0.5) * w, y0 + par, 10)))
  // extrude toward +z from the courtyard face (mirror so the face looks at −z)
  b.add(WALL, extrude(s, 0.45), mat(0, 0, z, 0))
}

function build(): Builder {
  const b = new Builder()

  /* ================= wing body ================= */
  // rooms block (stone outer face, white elsewhere)
  b.block(WALL, XP - XS, EAVE, ZO - ZR, (XS + XP) / 2, 0, (ZO + ZR) / 2)
  b.block(STONE, XP - XS + 0.12, EAVE - 0.35, 0.12, (XS + XP) / 2, 0, ZO + 0.0)
  b.block(STONE, 0.12, EAVE - 0.35, ZO - ZC, XS - 0.0, 0, (ZO + ZC) / 2)
  // gallery: floor slab, back wall is the rooms block, two arcaded storeys on the courtyard side
  b.block(WALL, XP - XS, 0.3, ZR - ZC, (XS + XP) / 2, FL1 - 0.15, (ZR + ZC) / 2)
  arcadeRow(b, XS, XP, ZC, 0, FL1 - 0.15, 3.36)
  arcadeRow(b, XS, XP, ZC, FL1 - 0.15, EAVE - FL1 + 0.15, 3.36)
  b.block('poShade', XP - XS - 0.4, EAVE - 0.3, 0.05, (XS + XP) / 2, 0, ZR - 0.03) // shadowed back wall of the gallery
  b.block(TRIM, XP - XS + 0.1, 0.28, ZO - ZC + 0.1, (XS + XP) / 2, EAVE - 0.42, (ZO + ZC) / 2) // eave band

  // outer façade openings: first-floor row and a few ground-floor windows / a door
  for (let x = XS + 1.6; x < XP - 0.8; x += 2.2) smallArchWin(b, x, 4.2, 0.62, 1.05)
  for (let x = XS + 2.7; x < XP - 1; x += 6.6) smallArchWin(b, x, 1.1, 0.62, 0.95)
  smallArchWin(b, -4.0, 0.0, 1.5, 2.6)

  /* ================= corner pavilion ================= */
  const pc = { x: (XP + XN) / 2, z: (ZO + PZ0) / 2 }
  const phx = (XN - XP) / 2
  const phz = (ZO - PZ0) / 2
  b.block(WALL, XN - XP, EAVE, ZO - PZ0, pc.x, 0, pc.z)
  b.block(STONE, XN - XP + 0.12, EAVE - 0.35, 0.12, pc.x, 0, ZO)
  b.block(STONE, 0.12, EAVE - 0.35, ZO - PZ0 + 0.12, XN, 0, pc.z)
  b.block(TRIM, XN - XP + 0.1, 0.28, ZO - PZ0 + 0.1, pc.x, EAVE - 0.42, pc.z)
  for (const x of [XP + 3.0, XN - 3.0]) smallArchWin(b, x, 4.2, 0.62, 1.05)
  smallArchWin(b, pc.x, 1.0, 1.1, 4.4) // tall arched window (photo 02)
  {
    // windows on the north end (stone) and the courtyard side
    for (const z of [-3.0, 2.5]) {
      const m = mat(XN + 0.07, 0, z, Math.PI / 2)
      b.add(TRIM, extrude(frameShape('round', 0.62, 1.05, 0.1, 0, 4.2), 0.06), m)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.62, 1.05, 0, 4.2, 8))), M(m, mat(0, 0, 0.02)))
    }
    for (const x of [XP + 3.0, pc.x, XN - 3.0]) {
      const m = mat(x, 0, PZ0, Math.PI)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.0, 1.6, 0, 3.9, 8))), M(m, mat(0, 0, 0.02)))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.0, 2.0, 0, 0.6, 8))), M(m, mat(0, 0, 0.02)))
    }
  }

  /* ================= wing roof (hipped at the south end) ================= */
  {
    const zc = (ZO + ZC) / 2
    const hd = (ZO - ZC) / 2 + OV
    const eY = EAVE - OV * T
    const rY = EAVE + ((ZO - ZC) / 2) * T
    const x0 = XS - OV
    const xr0 = x0 + hd
    const x1 = XP + 3.8 // runs into the pavilion roof
    facet(b, CU, [V(x0, eY, zc + hd), V(x1, eY, zc + hd), V(x1, rY, zc), V(xr0, rY, zc)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(x1, eY, zc - hd), V(x0, eY, zc - hd), V(xr0, rY, zc), V(x1, rY, zc)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(x0, eY, zc - hd), V(x0, eY, zc + hd), V(xr0, rY, zc)], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(xr0, rY + 0.05, zc), V(x1, rY + 0.05, zc), 0.26, 0.14)
    for (const s of [-1, 1]) b.beam(CU, V(x0, eY + 0.05, zc + s * hd), V(xr0, rY + 0.05, zc), 0.22, 0.12)
    for (const s of [-1, 1]) b.beam(CU, V(x0, eY - 0.08, zc + s * (hd + 0.05)), V(XP, eY - 0.08, zc + s * (hd + 0.05)), 0.16, 0.15)
    // roof windows (attic cells) and vent chimneys
    const slopeY = (dz: number) => eY + (hd - Math.abs(dz)) * T
    for (let x = XS + 2.4; x < XP - 1; x += 4.4) {
      for (const s of [-1, 1]) {
        const dz = s * 2.6
        const y = slopeY(dz) + 0.07
        b.add('poFrame', metricBox(0.85, 0.12, 1.15), mat(x, y, zc + dz, 0, s * PITCH * D2R))
        b.add('skylight', metricBox(0.7, 0.05, 1.0), mat(x, y + 0.07, zc + dz, 0, s * PITCH * D2R))
      }
    }
    for (let x = XS + 4.6; x < XP - 2; x += 6.6) {
      for (const s of [-1, 1]) {
        const dz = s * 1.0
        const y = slopeY(dz)
        b.block(TRIM, 0.45, 1.1, 0.45, x, y - 0.3, zc + dz)
        b.block(CU, 0.62, 0.08, 0.62, x, y + 0.8, zc + dz)
        b.block(CU, 0.3, 0.2, 0.3, x, y + 0.88, zc + dz)
      }
    }
  }

  /* ================= pavilion roof + lantern turret ================= */
  {
    const ov = 0.6
    const eY = EAVE - ov
    const top = 2.6 // half width of the platform
    const yP = eY + (Math.min(phx, phz) + ov - top) // 45°
    const c00 = V(pc.x - phx - ov, eY, pc.z - phz - ov)
    const c10 = V(pc.x + phx + ov, eY, pc.z - phz - ov)
    const c11 = V(pc.x + phx + ov, eY, pc.z + phz + ov)
    const c01 = V(pc.x - phx - ov, eY, pc.z + phz + ov)
    const t00 = V(pc.x - top, yP, pc.z - top)
    const t10 = V(pc.x + top, yP, pc.z - top)
    const t11 = V(pc.x + top, yP, pc.z + top)
    const t01 = V(pc.x - top, yP, pc.z + top)
    const P = [c00, c10, c11, c01]
    const Q = [t00, t10, t11, t01]
    for (let i = 0; i < 4; i++) {
      facet(b, CU, [P[i], P[(i + 1) % 4], Q[(i + 1) % 4], Q[i]], { seams: SEAM, thickness: 0.12 })
      b.beam(CU, P[i].clone().setY(P[i].y + 0.05), Q[i].clone().setY(Q[i].y + 0.05), 0.22, 0.12)
    }
    b.block(CU, 2 * top + 0.1, 0.1, 2 * top + 0.1, pc.x, yP - 0.05, pc.z)
    // octagonal lantern turret
    const r = 2.25
    const y0 = yP
    const y1 = y0 + 2.7
    b.add(WALL, loft([polyRing(8, r, y0 - 0.3, Math.PI / 8, pc.x, pc.z), polyRing(8, r, y1, Math.PI / 8, pc.x, pc.z)], { capTop: true, flat: true }))
    b.add(TRIM, loft([polyRing(8, r + 0.15, y1 - 0.25, Math.PI / 8, pc.x, pc.z), polyRing(8, r + 0.15, y1, Math.PI / 8, pc.x, pc.z)], { capTop: true, capBottom: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1) / 8) * Math.PI * 2 // face centres
      const ap = r * Math.cos(Math.PI / 8) + 0.02
      const m = mat(pc.x + Math.cos(a) * ap, 0, pc.z + Math.sin(a) * ap, Math.PI / 2 - a)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.55, 1.4, 0, y0 + 0.55, 8))), m)
    }
    // bell-shaped cap (flared eave, concave sides to a point)
    const cap: [number, number][] = [
      [r + 0.55, 0],
      [r + 0.35, 0.25],
      [r - 0.1, 0.6],
      [1.45, 1.1],
      [0.85, 1.75],
      [0.4, 2.45],
      [0.12, 3.0],
      [0.03, 3.2],
    ]
    b.add(CU, loft(cap.map(([rr, yy]) => polyRing(8, rr, y1 + yy, Math.PI / 8, pc.x, pc.z)), { capBottom: true }))
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2
      for (let i = 0; i < cap.length - 1; i++) {
        const [r0, h0] = cap[i]
        const [r1, h1] = cap[i + 1]
        b.beam(CU, V(pc.x + Math.cos(a) * r0, y1 + h0, pc.z + Math.sin(a) * r0), V(pc.x + Math.cos(a) * r1, y1 + h1, pc.z + Math.sin(a) * r1), 0.08, 0.06, V(Math.cos(a), 0, Math.sin(a)))
      }
    }
    cross(b, 'poCross', pc.x, y1 + 3.1, pc.z, 1.6, true, 0)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-6, 8.5, 3],
  materials: (base) => {
    const cu = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    cu.color.setRGB(0.6, 0.62, 0.72) // dark, weathered copper (the 2023 photos show dark roofs)
    cu.roughness = 0.55
    const stone = (base.stoneGrey as THREE.MeshStandardMaterial).clone()
    stone.color.set('#a99d8b')
    return {
      poCu: cu,
      poStone: stone,
      poWall: new THREE.MeshStandardMaterial({ color: '#f0eee8', roughness: 0.9 }),
      poTrim: new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.85 }),
      poShade: new THREE.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.9 }),
      poFrame: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.6 }),
      poCross: new THREE.MeshStandardMaterial({ color: '#d2d4d6', metalness: 0.7, roughness: 0.35 }),
    }
  },
  notes: 'One wing of the fortress-plan monastery (which wing is not documented): stone outer façade, courtyard arcades, hipped roof with roof windows, corner pavilion with lantern turret; roofs in dark weathered copper.',
}
export default model
