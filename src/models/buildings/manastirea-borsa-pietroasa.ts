/**
 * Mănăstirea Borșa – Pietroasa — main church (OSM way 517711588), a wooden
 * church in the Maramureș tradition with shingle roofs and a tall spire.
 *
 * Modelling specification (real metres). +X = azimuth 118.3° (OSM long axis)
 * = towards the altar (ESE); the west front with the porch and the stair is
 * at −X (photo 02), so `front` = (−1, 0).
 *  - Plan after the OSM outline (24.8 × 14.6 m): porch 2.5 m deep, pronaos +
 *    nave 9.9 m, the naos crossing with the two rectangular side apses
 *    (6.6 × 14.6 m overall) and the altar 5.8 m long, 8.7 m wide with chamfered
 *    corners; walls of horizontal logs on a stone socle.
 *  - West part with the double roof of the region (photos 01, 02): skirt roof
 *    round the porch and the pronaos at 4.4–6.0 m, an upper wall with the open
 *    arched gallery under the eave at 7.0 m, steep hipped shingle roof (55°)
 *    with its ridge at ≈ 14 m.
 *  - East part (photo 03): very steep hipped shingle roofs over the crossing
 *    (ridge across the axis, ≈ 13.8 m) and over the altar (apex ≈ 13.8 m),
 *    eaves ≈ 4.2 m; iron crosses on both apexes; eyebrow dormers.
 *  - Tower over the pronaos: shingled shaft 3.4 m, open belfry 15.5–18.0 m
 *    with arcades, flared belfry roof and square needle spire to ≈ 30 m, cross.
 *  - Porch: raised floor, carved posts with round arches and balustrade, stone
 *    stair to the west.
 *  - COLOR METAL copper (register 2022, copper sheet): the 2025 photographs
 *    show every roof, the spire and the belfry in wooden shingles, so the
 *    copper sheet cannot be a roof covering of the church; it is shown where
 *    sheet copper plausibly serves a shingled church — the eave drip edges,
 *    the collar where the tower leaves the roof and the caps of the belfry
 *    roof and the spire tip — weathered (copperBrown). This placement is an
 *    assumption; the copper may also have gone to the monastery's other
 *    buildings, which are not modelled.
 * Approximations: all heights estimated from photos 01–03 (west front width
 * as scale), roof pitches, the outline of the side apses made symmetrical,
 * log coursing, carvings and window details simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, hipRoof, helm, cross, polyRing, loft, type Face, window_ } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const CU = 'copperBrown'

/* plan */
const XW = -12.4 // porch front
const XP = -9.9 // pronaos west wall
const XC0 = 0.0 // crossing
const XC1 = 6.6
const XE = 12.4 // altar east wall
const HW = 5.05 // nave half width
const HA = 7.3 // side apse half extent
const HL = 4.35 // altar half width
const CH = 1.8 // altar chamfer

/* heights */
const SOCLE = 0.9
const W_WEST = 7.0
const W_EAST = 5.6

function hipped(b: Builder, cx: number, cz: number, w: number, d: number, eave: number, pitch: number, ov: number) {
  const t = Math.tan(pitch * D2R)
  const ey = eave - ov * t
  const r = hipRoof(cx, cz, w + 2 * ov, d + 2 * ov, ey, pitch * D2R)
  for (const f of r.facets) facet(b, 'shingle', f, { thickness: 0.15 })
  for (const [a, c] of r.lines) b.beam('shingle', a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.3, 0.14)
  // copper drip edge along the eaves
  const e = [V(cx - w / 2 - ov, ey - 0.04, cz - d / 2 - ov), V(cx + w / 2 + ov, ey - 0.04, cz - d / 2 - ov), V(cx + w / 2 + ov, ey - 0.04, cz + d / 2 + ov), V(cx - w / 2 - ov, ey - 0.04, cz + d / 2 + ov)]
  for (let i = 0; i < 4; i++) b.beam(CU, e[i], e[(i + 1) % 4], 0.16, 0.1)
  return r
}

/** Log wall block (horizontal log joints as thin dark grooves). */
function logBlock(b: Builder, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) {
  b.block('timber', x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2)
  for (let y = y0 + 0.32; y < y1 - 0.1; y += 0.32) {
    b.block('logJoint', x1 - x0 + 0.04, 0.03, z1 - z0 + 0.04, (x0 + x1) / 2, y, (z0 + z1) / 2)
  }
}

function smallWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w = 0.7, h = 1.2) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, frame: 0.12, frameKey: 'woodDark', glassKey: 'glassC', inset: 0.05 })
}

function build(): Builder {
  const b = new Builder()

  /* ================= socle ================= */
  b.block('stoneGrey', XC0 - XP + 0.3, SOCLE, HW * 2 + 0.3, (XP + XC0) / 2, 0, 0)
  b.block('stoneGrey', XC1 - XC0 + 0.3, SOCLE, HA * 2 + 0.3, (XC0 + XC1) / 2, 0, 0)
  b.block('stoneGrey', XE - XC1 - CH + 0.3, SOCLE, HL * 2 + 0.3, (XC1 + XE - CH) / 2, 0, 0)
  b.block('stoneGrey', XP - XW + 0.3, SOCLE + 0.3, HW * 2 + 0.3, (XW + XP) / 2, 0, 0)

  /* ================= log walls ================= */
  logBlock(b, XP, XC0 + 0.4, -HW, HW, SOCLE, W_WEST)
  logBlock(b, XC0, XC1, -HA, HA, SOCLE, W_EAST)
  // altar with chamfered east corners
  {
    const ring = (y: number, g = 0) => [
      V(XC1 - 0.2, y, -HL - g),
      V(XE - CH + g * 0.4, y, -HL - g),
      V(XE + g, y, -HL + CH - g * 0.4),
      V(XE + g, y, HL - CH + g * 0.4),
      V(XE - CH + g * 0.4, y, HL + g),
      V(XC1 - 0.2, y, HL + g),
    ]
    b.add('timber', loft([ring(SOCLE), ring(W_EAST)], { capTop: true, flat: true }))
    b.add('stoneGrey', loft([ring(0, 0.15), ring(SOCLE, 0.15)], { capTop: true, flat: true }))
    for (let y = SOCLE + 0.32; y < W_EAST - 0.1; y += 0.32) b.add('logJoint', loft([ring(y, 0.02), ring(y + 0.03, 0.02)], { flat: true }))
  }

  /* ================= windows & doors ================= */
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    for (const x of [-7.5, -3.0]) smallWindow(b, f, sz * HW, sz > 0 ? x : -x, 2.4)
    for (const x of [-7.5, -3.0]) smallWindow(b, f, sz * HW, sz > 0 ? x : -x, 6.2, 0.5, 0.6)
    smallWindow(b, f, sz * HA, sz > 0 ? 3.3 : -3.3, 2.2, 0.8, 1.4)
    smallWindow(b, f, sz * HL, sz > 0 ? 9.0 : -9.0, 2.2, 0.7, 1.2)
    // side doors in the crossing (photo 03)
    const m = sz > 0 ? mat(1.5, 0, sz * HA, 0) : mat(1.5, 0, sz * HA, Math.PI)
    b.add('woodDark', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.1, 2.3, 0, SOCLE))), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.03)))
    b.add('timber', extrude(frameShape('rect', 1.1, 2.3, 0.15, 0, SOCLE), 0.1), m)
  }
  smallWindow(b, '+x', XE, 0, 2.2, 0.7, 1.2)

  /* ================= west porch ================= */
  {
    const floorY = SOCLE + 0.3
    const xc = (XW + XP) / 2
    // carved posts and round arches on the three open sides
    const postsW = [-4.6, -2.3, 0, 2.3, 4.6]
    const arch = (m: THREE.Matrix4, u0: number, u1: number) => {
      const w = u1 - u0
      const s = new THREE.Shape()
      s.moveTo(u0, floorY + 2.0)
      s.absarc((u0 + u1) / 2, floorY + 2.0, w / 2, Math.PI, 0, true)
      s.lineTo(u1, floorY + 2.9)
      s.lineTo(u0, floorY + 2.9)
      s.lineTo(u0, floorY + 2.0)
      b.add('timber', extrude(s, 0.18, 10), m)
    }
    for (const z of postsW) b.block('woodDark', 0.24, 2.9, 0.24, XW + 0.15, floorY, z)
    const fm = mat(XW + 0.24, 0, 0, -Math.PI / 2)
    for (let i = 0; i < postsW.length - 1; i++) arch(fm, postsW[i] + 0.12, postsW[i + 1] - 0.12)
    for (const sz of [-1, 1]) {
      b.block('woodDark', 0.24, 2.9, 0.24, XP - 0.3, floorY, sz * (HW - 0.12))
      const sm = mat(xc, 0, sz * (HW - 0.12) - 0.09, 0)
      arch(sm, -1.0, 1.0)
    }
    // balustrade boards between the posts
    for (let i = 0; i < postsW.length - 1; i++) {
      if (i === 1 || i === 2) continue
      b.block('timber', 0.12, 1.0, postsW[i + 1] - postsW[i] - 0.24, XW + 0.15, floorY, (postsW[i] + postsW[i + 1]) / 2)
    }
    for (const sz of [-1, 1]) b.block('timber', XP - XW - 0.3, 1.0, 0.12, xc, floorY, sz * (HW - 0.12))
    b.block('woodDark', XP - XW, 0.3, HW * 2, xc, floorY + 2.9, 0)
    // west door of the pronaos
    const dm = mat(XP, 0, 0, -Math.PI / 2)
    b.add('woodDark', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.5, 0, floorY))), new THREE.Matrix4().multiplyMatrices(dm, mat(0, 0, 0.03)))
    b.add('timber', extrude(frameShape('round', 1.3, 2.5, 0.18, 0, floorY), 0.12), dm)
    // stone stair
    for (let i = 0; i < 4; i++) b.block('stoneGrey', 0.4, floorY - i * (floorY / 4), 4.4 + i * 0.4, XW - 0.2 - i * 0.4, 0, 0)
    // upper wall over the porch with the open arched gallery under the eave
    b.block('timber', XC0 - XW, 1.2, HW * 2, (XW + XC0) / 2, 5.8, 0)
    const gm = mat(XW - 0.01, 0, 0, -Math.PI / 2)
    for (const u of [-3.6, -1.2, 1.2, 3.6]) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 0.95, u, 5.95))), new THREE.Matrix4().multiplyMatrices(gm, mat(0, 0, 0.02)))
    }
    for (const sz of [-1, 1]) {
      const sm = mat(-6.5, 0, sz * (HW + 0.01), sz > 0 ? 0 : Math.PI)
      for (const u of [-4.5, -2.3, -0.1, 2.1]) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 0.9, u, 5.95))), sm)
    }
  }

  /* ================= skirt roof round the west part (incl. porch) ================= */
  {
    const yIn = 6.0
    const yOut = 4.4
    const ext = 1.6
    const inner = [V(XW, yIn, -HW), V(XC0, yIn, -HW), V(XC0, yIn, HW), V(XW, yIn, HW)]
    const outer = [V(XW - ext, yOut, -HW - ext), V(XC0, yOut, -HW - ext), V(XC0, yOut, HW + ext), V(XW - ext, yOut, HW + ext)]
    // -z side, +z side, west end
    facet(b, 'shingle', [outer[0], outer[1], inner[1], inner[0]], { thickness: 0.12 })
    facet(b, 'shingle', [outer[2], outer[3], inner[3], inner[2]], { thickness: 0.12 })
    facet(b, 'shingle', [outer[3], outer[0], inner[0], inner[3]], { thickness: 0.12 })
    b.beam('shingle', outer[0], inner[0], 0.2, 0.12)
    b.beam('shingle', outer[3], inner[3], 0.2, 0.12)
    b.beam(CU, outer[0].clone().setY(yOut - 0.04), outer[1].clone().setY(yOut - 0.04), 0.14, 0.08)
    b.beam(CU, outer[2].clone().setY(yOut - 0.04), outer[3].clone().setY(yOut - 0.04), 0.14, 0.08)
    b.beam(CU, outer[3].clone().setY(yOut - 0.04), outer[0].clone().setY(yOut - 0.04), 0.14, 0.08)
    // eave brackets
    for (let x = XW + 0.4; x < XC0; x += 1.2) for (const sz of [-1, 1]) b.beam('woodDark', V(x, yIn - 0.4, sz * HW), V(x, yOut + 0.05, sz * (HW + ext - 0.2)), 0.12, 0.16)
  }

  /* ================= main roofs ================= */
  // west roof: hipped at the west end, running into the crossing roof
  const west = hipped(b, (XW + 1.5) / 2, 0, 1.5 - XW, HW * 2, W_WEST, 52, 0.6)
  // crossing roof (ridge across the axis) and altar roof
  const crossR = hipped(b, (XC0 + XC1) / 2, 0, XC1 - XC0, HA * 2, W_EAST, 70, 0.6)
  {
    // altar: polygonal hipped roof (ridge along X, chamfered east end)
    const t = Math.tan(62 * D2R)
    const ov = 0.6
    const ey = W_EAST - ov * t
    const hw = HL + ov
    const apexX = XE - CH * 0.6 + ov - hw
    const apex = V(Math.max(apexX, XC1 + 0.6), ey + hw * t, 0)
    const ridgeW = V(XC1 - 0.4, apex.y, 0)
    const pts = [V(XC1 - 0.4, ey, -hw), V(XE - CH + ov * 0.4, ey, -hw), V(XE + ov, ey, -HL + CH - ov * 0.4), V(XE + ov, ey, HL - CH + ov * 0.4), V(XE - CH + ov * 0.4, ey, hw), V(XC1 - 0.4, ey, hw)]
    facet(b, 'shingle', [pts[0], pts[1], apex, ridgeW], { thickness: 0.15 })
    facet(b, 'shingle', [pts[4], pts[5], ridgeW, apex], { thickness: 0.15 })
    for (let i = 1; i < 4; i++) facet(b, 'shingle', [pts[i], pts[i + 1], apex], { thickness: 0.15 })
    for (let i = 1; i <= 4; i++) b.beam('shingle', pts[i].clone().setY(pts[i].y + 0.05), apex.clone().setY(apex.y + 0.05), 0.26, 0.12)
    b.beam('shingle', ridgeW.clone().setY(ridgeW.y + 0.05), apex.clone().setY(apex.y + 0.05), 0.28, 0.14)
    for (let i = 0; i < 5; i++) b.beam(CU, pts[i].clone().setY(ey - 0.04), pts[i + 1].clone().setY(ey - 0.04), 0.14, 0.08)
    cross(b, 'iron', apex.x, apex.y, 0, 1.6, true, Math.PI / 2)
  }
  // crosses on the crossing ridge ends
  {
    const [r1, r2] = crossR.lines[0]
    cross(b, 'iron', r1.x, r1.y, 0, 1.6, true, Math.PI / 2)
    void r2
  }
  // eyebrow dormers on the crossing roof (north and south hips)
  for (const sz of [-1, 1]) {
    const t = Math.tan(70 * D2R)
    const zz = sz * (HA + 0.6 - 1.0)
    const y = W_EAST - 0.6 * t + 1.0 * t
    b.add('shingle', new THREE.CylinderGeometry(0.75, 0.75, 1.4, 12, 1, false, 0, Math.PI), mat((XC0 + XC1) / 2, y - 0.1, zz, sz > 0 ? 0 : Math.PI, Math.PI / 2, 0, 1, 1, 0.45))
    b.add('glassC', new THREE.CircleGeometry(0.55, 12, 0, Math.PI), mat((XC0 + XC1) / 2, y - 0.25, zz + sz * 0.5, sz > 0 ? 0 : Math.PI))
  }

  /* ================= tower ================= */
  const TX = -6.6
  const TH = 1.7 // shaft half width
  const yRoof = west.top
  {
    // shaft (shingled) from inside the roof to the belfry floor
    b.block('shingle', TH * 2, 15.5 - (yRoof - 3), TH * 2, TX, yRoof - 3, 0)
    // copper collar where the shaft leaves the roof
    b.block(CU, TH * 2 + 0.25, 0.35, TH * 2 + 0.25, TX, yRoof - 0.1, 0)
    // belfry: floor, corner posts, arches, balustrade, cap
    const BW = 2.05
    b.block('timber', BW * 2 + 0.3, 0.35, BW * 2 + 0.3, TX, 15.3, 0)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block('woodDark', 0.22, 2.5, 0.22, TX + sx * BW, 15.65, sz * BW)
    for (const face of ['+x', '-x', '+z', '-z'] as Face[]) {
      const pl = face.endsWith('x') ? TX + (face[0] === '+' ? BW : -BW) : face[0] === '+' ? BW : -BW
      const m =
        face === '+z' ? mat(TX, 0, pl, 0) : face === '-z' ? mat(TX, 0, pl, Math.PI) : face === '+x' ? mat(pl, 0, 0, Math.PI / 2) : mat(pl, 0, 0, -Math.PI / 2)
      for (const u of [-1.35, 0, 1.35]) {
        const s = new THREE.Shape()
        const w = 1.25
        s.moveTo(u - w / 2 - 0.05, 17.2)
        s.absarc(u, 17.2, w / 2, Math.PI, 0, true)
        s.lineTo(u + w / 2 + 0.05, 18.1)
        s.lineTo(u - w / 2 - 0.05, 18.1)
        s.lineTo(u - w / 2 - 0.05, 17.2)
        b.add('timber', extrude(s, 0.12, 8), m)
        if (u !== 0) b.add('woodDark', metricBox(0.16, 2.4, 0.16), new THREE.Matrix4().multiplyMatrices(m, mat(u + 0.68, 16.85, 0.06)))
      }
      b.add('timber', metricBox(BW * 2, 0.75, 0.1), new THREE.Matrix4().multiplyMatrices(m, mat(0, 16.05, 0.0)))
    }
    b.block('shingle', BW * 2 - 0.4, 2.4, BW * 2 - 0.4, TX, 15.65, 0)
    b.block('glassC', BW * 2 - 0.3, 1.2, BW * 2 - 0.3, TX, 16.6, 0)
    // flared belfry roof and needle spire
    const sp = helm(b, 'shingle', {
      x: TX,
      z: 0,
      n: 4,
      phase: Math.PI / 4,
      stations: [
        [(BW + 1.0) * Math.SQRT2, 17.7],
        [(BW + 0.45) * Math.SQRT2, 18.15],
        [(BW - 0.15) * Math.SQRT2, 18.55],
        [1.45 * Math.SQRT2, 19.3],
        [1.05 * Math.SQRT2, 21.0],
        [0.72 * Math.SQRT2, 23.5],
        [0.42 * Math.SQRT2, 26.2],
        [0.16 * Math.SQRT2, 28.8],
        [0.05 * Math.SQRT2, 29.8],
      ],
    })
    // copper caps: drip edge of the flared roof + spire tip
    const ring = polyRing(4, (BW + 1.0) * Math.SQRT2, 17.66, Math.PI / 4, TX, 0)
    for (let i = 0; i < 4; i++) b.beam(CU, ring[i], ring[(i + 1) % 4], 0.14, 0.08)
    b.add(CU, new THREE.ConeGeometry(0.22, 0.9, 4, 1), mat(TX, sp - 0.35, 0, Math.PI / 4))
    cross(b, 'iron', TX, sp + 0.05, 0, 1.9, true, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-6.6, 14.2, 0],
  materials: () => ({
    logJoint: new THREE.MeshStandardMaterial({ color: '#6b4f34', roughness: 0.95 }),
    woodDark: new THREE.MeshStandardMaterial({ color: '#5a3d26', roughness: 0.8 }),
  }),
  notes:
    'Maramureș-style wooden church with shingle roofs and needle spire; copper shown only on flashings (eave drip edges, tower collar, belfry and spire caps) because the photographed roofs are shingled; carvings simplified.',
}
export default model
