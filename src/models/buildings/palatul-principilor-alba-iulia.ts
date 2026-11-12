/**
 * Palatul Principilor Transilvaniei (Princely Palace), Alba Carolina citadel, Alba Iulia.
 * COLOR METAL: natural copper strip, elZinc® Graphite and elZinc® Natural (roof works).
 *
 * TIER C — massing model of the whole palace complex from three drone
 * photographs (01 from the west, 02 from the cathedral tower, 03 from the east)
 * and the OSM multipolygon (relation 2873706: outer ring 145.5 × 77.9 m with two
 * inner courtyards). Real metres; origin = centre of the outer ring; +X = long
 * axis towards the WNW (282°); +Z = the north side facing the cathedral.
 *
 *  - Two-storey wings (≈ 12–17 m deep, as given by the OSM rings) around a large
 *    eastern courtyard and a smaller western courtyard; the central north body
 *    projects towards the cathedral; a gabled pavilion projects into the eastern
 *    courtyard from the south wing (photo 03, OSM notch).
 *  - Steep hipped roofs (≈ 42°) meeting in hips and valleys. As photographed, the
 *    roof coverings are ceramic tiles: new bright orange-red tiles on the eastern
 *    courtyard bodies, darker red tiles on the western courtyard bodies.
 *  - The visible METAL work is modelled explicitly: rows of small triangular
 *    "eyebrow" vent dormers in titanium-zinc on every slope (dark graphite on the
 *    newly tiled bodies, light natural zinc on the western bodies, photos 02/03),
 *    copper gutters and downpipes along the eaves, and a small natural-zinc
 *    standing-seam lean-to roof in the western courtyard (photo 01).
 *  - Tall white chimneys with caps; white render, regular two-row window rhythm,
 *    gate passages in the middle wing and a portal in the west wing.
 * Approximations: which bodies received which metal is not documented publicly
 * (distribution inferred from the photographs only); eave heights unified; window
 * rhythm, dormer / chimney positions and the courtyard façades are schematic;
 * small corner notches of the OSM courtyard rings simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, facet, extrude, window_, door, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const WALL = 'plasterWhite'
const SOCLE = 'plasterGrey'
const CU = 'copper'
const D2R = Math.PI / 180
const PITCH = 42
const T = Math.tan(PITCH * D2R)
const OV = 0.55

type Zn = 'zincGraphite' | 'zincNatural'
interface Wing {
  id: string
  x0: number
  x1: number
  z0: number
  z1: number
  eave: number
  tile: string
  zn: Zn
  /** x beyond which the vent dormers are natural zinc (western bodies) */
  znSplitX?: number
  /** hip at the start / end of the long axis (default both) */
  hip?: [boolean, boolean]
}

// wings from the OSM rings (outer ring + courtyard rings), see header
const WINGS: Wing[] = [
  { id: 'S', x0: -72.7, x1: 72.9, z0: -38.9, z1: -22.8, eave: 10.0, tile: 'tileRed', zn: 'zincGraphite', znSplitX: 20.8 },
  { id: 'E', x0: -72.7, x1: -58.5, z0: -38.9, z1: 33.7, eave: 10.0, tile: 'tileRed', zn: 'zincGraphite' },
  { id: 'M', x0: 8.5, x1: 20.8, z0: -38.9, z1: 38.8, eave: 10.0, tile: 'tileRed', zn: 'zincGraphite' },
  { id: 'W', x0: 58.8, x1: 72.0, z0: -38.9, z1: 28.5, eave: 10.0, tile: 'tileBrown', zn: 'zincNatural' },
  { id: 'N1', x0: -72.7, x1: -17.5, z0: 21.4, z1: 33.7, eave: 9.8, tile: 'tileRed', zn: 'zincGraphite', hip: [true, false] },
  { id: 'N2', x0: -25.5, x1: 20.7, z0: 21.4, z1: 38.8, eave: 10.6, tile: 'tileRed', zn: 'zincGraphite' },
  { id: 'N3', x0: 20.7, x1: 72.0, z0: 13.3, z1: 28.5, eave: 10.0, tile: 'tileBrown', zn: 'zincNatural' },
]
const PAV = { x0: -34.6, x1: -22.6, z0: -22.8, z1: -16.7, eave: 10.0 }

const inside = (x: number, z: number, w: Wing, m = 0) => x > w.x0 - m && x < w.x1 + m && z > w.z0 - m && z < w.z1 + m

/** Height of a wing's roof surface at (x, z) (no overhang). */
function roofY(w: Wing, x: number, z: number) {
  const alongX = w.x1 - w.x0 >= w.z1 - w.z0
  const [h0, h1] = w.hip ?? [true, true]
  const ds = alongX ? [z - w.z0, w.z1 - z] : [x - w.x0, w.x1 - x]
  if (h0) ds.push(alongX ? x - w.x0 : z - w.z0)
  if (h1) ds.push(alongX ? w.x1 - x : w.z1 - z)
  return w.eave + Math.max(0, Math.min(...ds)) * T
}

/** Steep tiled roof over a wing: ridge along the long axis, hips or hidden gables at the ends. */
function wingRoof(b: Builder, w: Wing) {
  const alongX = w.x1 - w.x0 >= w.z1 - w.z0
  const [a0, a1, c0, c1] = alongX ? [w.x0, w.x1, w.z0, w.z1] : [w.z0, w.z1, w.x0, w.x1]
  const [h0, h1] = w.hip ?? [true, true]
  const hs = (c1 - c0) / 2 + OV
  const cc = (c0 + c1) / 2
  const ey = w.eave - OV * T
  const ry = ey + hs * T
  const ea0 = h0 ? a0 - OV : a0
  const ea1 = h1 ? a1 + OV : a1
  const ra0 = h0 ? a0 - OV + hs : a0
  const ra1 = h1 ? a1 + OV - hs : a1
  const P = (a: number, y: number, c: number) => (alongX ? V(a, y, c) : V(c, y, a))
  const k = w.tile
  facet(b, k, [P(ea0, ey, cc + hs), P(ea1, ey, cc + hs), P(ra1, ry, cc), P(ra0, ry, cc)], { thickness: 0.12 })
  facet(b, k, [P(ea1, ey, cc - hs), P(ea0, ey, cc - hs), P(ra0, ry, cc), P(ra1, ry, cc)], { thickness: 0.12 })
  b.beam(k, P(ra0, ry + 0.06, cc), P(ra1, ry + 0.06, cc), 0.28, 0.16)
  for (const [on, ea, ra] of [
    [h0, ea0, ra0],
    [h1, ea1, ra1],
  ] as [boolean, number, number][]) {
    if (on) {
      facet(b, k, [P(ea, ey, cc - hs), P(ea, ey, cc + hs), P(ra, ry, cc)], { thickness: 0.12 })
      for (const s of [-1, 1]) b.beam(k, P(ea, ey + 0.06, cc + s * hs), P(ra, ry + 0.06, cc), 0.24, 0.14)
    } else {
      const tri = new THREE.Shape([new THREE.Vector2(-hs + OV, 0), new THREE.Vector2(hs - OV, 0), new THREE.Vector2(0, ry - w.eave)])
      b.add(WALL, extrude(tri, 0.3), alongX ? mat(ea, w.eave, cc, Math.PI / 2) : mat(cc, w.eave, ea))
    }
  }
  return { alongX, hs: hs - OV, cc, a0, a1, ry }
}
/** Highest roof among all wings at (x, z). */
function topAt(x: number, z: number) {
  let y = 0
  for (const w of WINGS) if (inside(x, z, w)) y = Math.max(y, roofY(w, x, z))
  return y
}

/** Small triangular eyebrow vent dormer (zinc) on a slope; n = outward horizontal normal. */
function vent(b: Builder, key: string, x: number, y: number, z: number, nx: number, nz: number) {
  const w = 1.1
  const h = 0.75
  const depth = 1.7
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, -0.35), new THREE.Vector2(w / 2, -0.35), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h), new THREE.Vector2(-w / 2, 0)])
  const ry = Math.atan2(nx, nz)
  b.add(key, extrude(s, depth), new THREE.Matrix4().multiplyMatrices(mat(x, y, z, ry), mat(0, 0, -depth)))
  b.add('black', new THREE.PlaneGeometry(0.42, 0.22), new THREE.Matrix4().multiplyMatrices(mat(x, y, z, ry), mat(0, 0.14, 0.01)))
}

function chimney(b: Builder, x: number, z: number, y0: number, top: number) {
  b.block(WALL, 0.75, top - y0, 1.05, x, y0, z)
  b.block(WALL, 1.0, 0.22, 1.3, x, top - 0.55, z)
  b.block(WALL, 0.95, 0.3, 1.25, x, top, z)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- wing bodies and roofs ---------------- */
  for (const w of WINGS) {
    const cx = (w.x0 + w.x1) / 2
    const cz = (w.z0 + w.z1) / 2
    const W = w.x1 - w.x0
    const Dd = w.z1 - w.z0
    b.block(WALL, W, w.eave, Dd, cx, 0, cz)
    b.block(SOCLE, W + 0.1, 0.8, Dd + 0.1, cx, 0, cz)
    b.block(WALL, W + 0.4, 0.25, Dd + 0.4, cx, w.eave - 0.25, cz)
    wingRoof(b, w)
    // copper gutters along the two long eaves
    const ey = w.eave - OV * T - 0.1
    if (W >= Dd) for (const s of [-1, 1]) b.rod(CU, V(w.x0 - OV, ey, cz + s * (Dd / 2 + OV - 0.05)), V(w.x1 + OV, ey, cz + s * (Dd / 2 + OV - 0.05)), 0.1, 8)
    else for (const s of [-1, 1]) b.rod(CU, V(cx + s * (W / 2 + OV - 0.05), ey, w.z0 - OV), V(cx + s * (W / 2 + OV - 0.05), ey, w.z1 + OV), 0.1, 8)

    // zinc vent dormers on both long slopes (skipped where another roof covers the spot)
    const alongX = W >= Dd
    const hd = (alongX ? Dd : W) / 2
    const L0 = alongX ? w.x0 : w.z0
    const L1 = alongX ? w.x1 : w.z1
    const off = hd * 0.5
    const n = Math.floor((L1 - L0 - 2 * hd) / 6.5)
    for (const s of [-1, 1]) {
      for (let i = 0; i <= n; i++) {
        const t = L0 + hd + 1 + (i * (L1 - L0 - 2 * hd - 2)) / Math.max(1, n) + (s > 0 ? 0 : 1.6)
        const x = alongX ? t : cx + s * off
        const z = alongX ? cz + s * off : t
        const y = roofY(w, x, z)
        if (topAt(x, z) > y + 0.05) continue
        if (WINGS.some((o) => o !== w && inside(x, z, o, 1.5))) continue
        vent(b, w.znSplitX !== undefined && x > w.znSplitX ? 'zincNatural' : w.zn, x, y, z, alongX ? 0 : s, alongX ? s : 0)
      }
    }
    // chimneys near the ridge
    const nc = Math.max(1, Math.round((L1 - L0) / 11))
    for (let i = 0; i < nc; i++) {
      const t = L0 + ((i + 0.5) * (L1 - L0)) / nc
      const sd = i % 2 ? 1.4 : -1.4
      const x = alongX ? t : cx + sd
      const z = alongX ? cz + sd : t
      if (WINGS.some((o) => o !== w && inside(x, z, o, 2))) continue
      const y = roofY(w, x, z)
      chimney(b, x, z, y - 0.6, w.eave + hd * T + 1.8)
    }
  }

  /* ---------------- courtyard pavilion (gable towards the courtyard) ---------------- */
  {
    const { x0, x1, z0, z1, eave } = PAV
    const cx = (x0 + x1) / 2
    const hw = (x1 - x0) / 2
    b.block(WALL, x1 - x0, eave, z1 - z0 + 2, cx, 0, (z0 + z1) / 2 - 1)
    b.block(SOCLE, x1 - x0 + 0.1, 0.8, z1 - z0 + 2, cx, 0, (z0 + z1) / 2 - 1)
    const ry = eave + hw * T
    const e = eave - OV * T
    for (const s of [-1, 1]) facet(b, 'tileRed', [V(cx + s * (hw + OV), e, z1 + 0.3), V(cx + s * (hw + OV), e, z0 - 3), V(cx, ry, z0 - 3), V(cx, ry, z1 + 0.3)], { thickness: 0.12 })
    b.beam('tileRed', V(cx, ry + 0.05, z0 - 3), V(cx, ry + 0.05, z1 + 0.3), 0.25, 0.14)
    const tri = new THREE.Shape([new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0), new THREE.Vector2(0, ry - eave)])
    b.add(WALL, extrude(tri, 0.4), mat(cx, eave, z1 - 0.4))
    window_(b, '+z', z1, cx, eave + 1.2, { w: 0.7, h: 1.0, frame: 0.1, frameKey: 'trim' })
    for (const s of [-1, 1]) b.rod(CU, V(cx + s * (hw + OV - 0.05), e - 0.1, z1 + 0.3), V(cx + s * (hw + OV - 0.05), e - 0.1, z0 + 0.2), 0.1, 8)
  }

  /* ---------------- façades: two-storey window rows, copper downpipes ---------------- */
  const seg: [Face, number, number, number][] = [
    // outer façades: face, plane, u0, u1  (u = x on +z, -x on -z, z on -x, -z on +x)
    ['-z', -38.9, -72.9, 72.7],
    ['-x', -72.7, -38.9, 33.7],
    ['+z', 33.7, -72.7, -25.5],
    ['+z', 38.8, -25.5, 20.7],
    ['+z', 28.5, 20.7, 72.0],
    ['+x', 72.0, -28.5, 38.9],
    // eastern courtyard
    ['+z', -22.8, -58.5, -34.6],
    ['+z', -22.8, -22.6, 8.5],
    ['-z', 21.4, -8.5, 58.5],
    ['+x', -58.5, -21.4, 22.8],
    ['-x', 8.5, -22.8, 21.4],
    // western courtyard
    ['+z', -22.8, 20.8, 58.8],
    ['-z', 13.3, -58.8, -20.8],
    ['+x', 20.8, -13.3, 22.8],
    ['-x', 58.8, -22.8, 13.3],
  ]
  for (const [face, plane, u0, u1] of seg) {
    const L = u1 - u0
    const n = Math.max(1, Math.floor((L - 2.4) / 3.7))
    const step = (L - 2.4) / n
    for (let i = 0; i < n; i++) {
      const u = u0 + 1.2 + step * (i + 0.5)
      window_(b, face, plane, u, 2.1, { w: 1.15, h: 1.65, glassKey: 'glassC', frameKey: 'trim', frame: 0.12, inset: 0.03 })
      window_(b, face, plane, u, 6.3, { w: 1.15, h: 1.75, glassKey: 'glassC', frameKey: 'trim', frame: 0.12, inset: 0.03 })
    }
    for (let i = 0; i <= n; i += 4) {
      const fm = faceFrame(face, plane, u0 + 1.2 + step * i, 0, 0)
      b.rod(CU, V(0, 0.3, 0.14).applyMatrix4(fm), V(0, 9.35, 0.14).applyMatrix4(fm), 0.07, 6)
    }
  }
  // gate passages through the middle wing and the west-wing portal (photo 01)
  for (const [face, plane] of [
    ['-x', 8.5],
    ['+x', 20.8],
  ] as [Face, number][]) door(b, face, plane, 0, { type: 'round', w: 3.4, h: 4.4, y0: 0.3, leafKey: 'black', frameKey: 'trim', frame: 0.3 })
  door(b, '+x', 72.0, -22.0, { type: 'round', w: 3.0, h: 4.0, y0: 0.5, leafKey: 'black', frameKey: 'stoneLight', frame: 0.5 })

  /* ---------------- natural-zinc lean-to in the western courtyard (photo 01) ---------------- */
  {
    const x0 = 45.5
    const x1 = 58.8
    const z0 = 7.6
    const z1 = 13.3
    const h0 = 3.4
    const h1 = 4.9
    b.block(WALL, x1 - x0, h0, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    facet(b, 'zincNatural', [V(x0 - 0.3, h0, z0 - 0.4), V(x1, h0, z0 - 0.4), V(x1, h1, z1), V(x0 - 0.3, h1, z1)], { seams: seams('zincNatural', 0.55, 0.04, 0.045), thickness: 0.08 })
    for (let x = x0 + 1.4; x < x1 - 1; x += 2.6) window_(b, '-z', z0, -x, 1.0, { w: 1.4, h: 1.6, frame: 0.1, frameKey: 'trim' })
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [40, 17, 24],
  notes: 'Tier C massing of the whole complex: tiled roofs with zinc vent dormers, copper gutters/downpipes and a zinc lean-to; metal distribution per body inferred from photographs.',
}
export default model
