/**
 * Castelul Bethlen, Arcalia (Bistrița-Năsăud) — Bethlen castle, completed c. 1800,
 * today the Arcalia complex of Babeș-Bolyai University.
 *
 * TIER C — modelled from ONE frontal photograph and the OSM outline (way
 * 1328645254, ≈ 29 × 29 m, 34 points). The roof material is not confirmed and
 * no supplier is implied: the domes and roofs are shown in the grey visible in
 * the photograph. Real metres; origin = footprint centre; +X runs along the main
 * façade (bearing 122.4°), +Z = the main façade (facing SSW, the porch side of
 * the OSM outline).
 *
 *  - Single-storey block on a high basement (≈ 2.4 m), symmetrical main façade:
 *    a projecting central risalit with three tall arched openings (glazed door
 *    in the middle) under three roundels, a dentil cornice and a crenellated
 *    attic; one-bay side sections; four corner towers (square with chamfered
 *    corners) with roundel friezes, corbelled cornices and crenellated parapets.
 *  - Onion domes on every corner tower (the two rear ones appear smaller behind
 *    the roof in the photograph, consistent with the rear corner lobes of the OSM
 *    outline) and a taller central onion dome on a drum behind the risalit; all
 *    with eight ribs, grey sheet metal (scale pattern not modelled), spike finials.
 *  - Low grey hipped roof over the main block, hidden behind the attic.
 *  - Terrace in front of the risalit with balustrades and a central flight of steps.
 *  - Pale yellow render, cream cornices / quoins / attic, blue-grey louvred shutters.
 * Approximations: depth of the block, the rear and side elevations (not photographed:
 * window rhythm repeated from the façade), the central dome position and height,
 * dome profile, ornament (simplified), absolute dimensions (scaled from the façade).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, loft, lathe, dome, hippedRoof, window_, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const WALL = 'plasterYellow'
const TRIM = 'plasterCream'
const SOCLE = 'plasterSand'
const DOME = 'domeGrey'
const SHUT = 'shutter'
const ROOF = 'roofGrey'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

const BLOCK = { x: 11.2, z0: -11.0, z1: 6.0, h: 7.8 }
const RIS = { hw: 5.4, z0: 1.0, z1: 8.0, h: 10.9, attic: 11.6, top: 12.25 }
const TOWER = { h: 3.55, c: 1.05, cx: 11.2, zf: 4.6, zb: -9.6 }
const T_CORNICE = 7.8
const T_CORBEL = 9.9
const T_PARA = 10.75
const T_TOP = 12.0
const FLOOR = 2.45 // main floor level (raised basement)

/** Ring of a square with chamfered corners (8 points, loft order). */
function chamfer(cx: number, cz: number, h: number, c: number, y: number) {
  return [
    V(cx - h + c, y, cz - h), V(cx + h - c, y, cz - h), V(cx + h, y, cz - h + c), V(cx + h, y, cz + h - c),
    V(cx + h - c, y, cz + h), V(cx - h + c, y, cz + h), V(cx - h, y, cz + h - c), V(cx - h, y, cz - h + c),
  ]
}
function chamferBlock(b: Builder, key: string, cx: number, cz: number, h: number, c: number, y0: number, y1: number) {
  b.add(key, loft([chamfer(cx, cz, h, c, y0), chamfer(cx, cz, h, c, y1)], { capTop: true, capBottom: true, flat: true }))
}

/** Crenellation: merlons along a straight edge a→c at height y (merlon width mw, height mh). */
function merlons(b: Builder, a: THREE.Vector3, c: THREE.Vector3, y: number, mw = 0.75, mh = 0.62, th = 0.42) {
  const L = a.distanceTo(c)
  const n = Math.max(1, Math.round((L + 0.5) / 1.3))
  const dir = c.clone().sub(a).normalize()
  const ry = Math.atan2(dir.x, dir.z)
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : (i + 0.5) / n
    const p = a.clone().lerp(c, t)
    b.add(TRIM, metricBox(th, mh, Math.min(mw, L * 0.8)), mat(p.x, y + mh / 2, p.z, ry))
  }
}

/** Tall arched opening with closed blue-grey louvred shutters and a cream surround. */
function shutterWin(b: Builder, face: Face, plane: number, u: number, y0 = FLOOR + 0.3, w = 1.5, h = 3.4) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, glassKey: SHUT, frameKey: TRIM, frame: 0.2, inset: 0.05 })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(TRIM, metricBox(w + 0.55, 0.14, 0.3), M(m, mat(0, y0 - 0.2, 0.12)))
  b.add('black', metricBox(0.05, h - w / 2, 0.04), M(m, mat(0, y0 + (h - w / 2) / 2, 0.08)))
  for (let k = 1; k < 7; k++) b.add('black', metricBox(w * 0.92, 0.025, 0.03), M(m, mat(0, y0 + (k * (h - w / 2)) / 7, 0.075)))
}

function roundel(b: Builder, face: Face, plane: number, u: number, y: number, r = 0.32) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(TRIM, new THREE.CylinderGeometry(r, r, 0.12, 16), M(m, mat(0, y, 0.06, 0, Math.PI / 2)))
  b.add(WALL, new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.14, 12), M(m, mat(0, y, 0.08, 0, Math.PI / 2)))
}

/** Onion dome with drum ring, ribs and a spike finial. */
function onion(b: Builder, x: number, z: number, y: number, r: number, h: number, ribs = 8) {
  const prof: [number, number][] = [
    [0.7, 0], [0.87, 0.07], [0.97, 0.17], [1.0, 0.29], [0.99, 0.41], [0.94, 0.53], [0.83, 0.65],
    [0.66, 0.76], [0.46, 0.86], [0.28, 0.93], [0.17, 0.97], [0.13, 1.0],
  ]
  dome(b, DOME, { x, z, y, r, h, profile: prof, seg: 32, ribs, ribH: 0.06 })
  // collar + finial
  const s = r / 2.2
  b.add(DOME, lathe([[0.32 * s, 0], [0.36 * s, 0.12 * s], [0.2 * s, 0.3 * s], [0.26 * s, 0.55 * s], [0.12 * s, 0.75 * s], [0.07 * s, 0.8 * s]], 14), mat(x, y + h - 0.02, z))
  b.add(DOME, new THREE.SphereGeometry(0.17 * s, 12, 8), mat(x, y + h + 0.95 * s, z))
  b.add(DOME, new THREE.ConeGeometry(0.06 * s, 1.25 * s, 8), mat(x, y + h + 1.65 * s, z))
}

function tower(b: Builder, cx: number, cz: number, sx: number, sz: number) {
  const { h, c } = TOWER
  chamferBlock(b, SOCLE, cx, cz, h + 0.08, c, 0, FLOOR)
  chamferBlock(b, WALL, cx, cz, h, c, FLOOR, T_CORNICE)
  chamferBlock(b, TRIM, cx, cz, h + 0.14, c, T_CORNICE - 0.35, T_CORNICE)
  chamferBlock(b, TRIM, cx, cz, h + 0.05, c, FLOOR - 0.12, FLOOR + 0.12)
  chamferBlock(b, WALL, cx, cz, h - 0.08, c, T_CORNICE, T_CORBEL)
  chamferBlock(b, TRIM, cx, cz, h + 0.0, c, T_CORBEL - 0.28, T_CORBEL)
  // corbel table
  chamferBlock(b, TRIM, cx, cz, h + 0.3, c, T_CORBEL + 0.38, T_PARA)
  const ring = chamfer(cx, cz, h + 0.22, c, T_CORBEL)
  for (let i = 0; i < 8; i++) {
    const a = ring[i]
    const d = ring[(i + 1) % 8]
    const L = a.distanceTo(d)
    const n = Math.max(1, Math.round(L / 0.55))
    const dir = d.clone().sub(a).normalize()
    for (let k = 0; k < n; k++) {
      const p = a.clone().lerp(d, (k + 0.5) / n)
      b.add(TRIM, metricBox(0.2, 0.38, 0.22), mat(p.x, T_CORBEL + 0.19, p.z, Math.atan2(dir.x, dir.z)))
    }
  }
  // parapet wall + merlons
  chamferBlock(b, TRIM, cx, cz, h + 0.18, c, T_PARA, T_TOP - 0.62)
  const top = chamfer(cx, cz, h + 0.12, c, 0)
  for (let i = 0; i < 8; i++) merlons(b, top[i], top[(i + 1) % 8], T_TOP - 0.62, 0.7, 0.62)
  // windows: two on each outward face, roundels on the upper stage
  const faces: [Face, number, number][] = [
    [sz > 0 ? '+z' : '-z', cz + sz * h, sz > 0 ? cx : -cx],
    [sx > 0 ? '+x' : '-x', cx + sx * h, sx > 0 ? -cz : cz],
  ]
  for (const [f, plane, uc] of faces) {
    for (const du of [-1.35, 1.35]) shutterWin(b, f, plane, uc + du)
    for (const du of [-1.95, -0.65, 0.65, 1.95]) roundel(b, f, plane, uc + du, 8.85, 0.27)
    for (const du of [-1.35, 1.35]) b.add('black', metricBox(0.55, 0.3, 0.05), M(faceFrame(f, plane, uc + du, 0, 0), mat(0, 0.85, 0.03)))
  }
  onion(b, cx, cz, T_TOP - 0.45, 2.2, 3.65)
}

function build(): Builder {
  const b = new Builder()
  const { x: bx, z0, z1, h: bh } = BLOCK
  const bw = 2 * bx
  const bd = z1 - z0
  const bzc = (z0 + z1) / 2

  /* ---------------- main block ---------------- */
  b.block(SOCLE, bw + 0.1, FLOOR, bd + 0.1, 0, 0, bzc)
  b.block(WALL, bw, bh - FLOOR, bd, 0, FLOOR, bzc)
  b.block(TRIM, bw + 0.2, 0.24, bd + 0.2, 0, FLOOR - 0.12, bzc)
  b.block(TRIM, bw + 0.35, 0.22, bd + 0.35, 0, bh - 0.62, bzc)
  b.block(TRIM, bw + 0.6, 0.3, bd + 0.6, 0, bh - 0.3, bzc)
  hippedRoof(b, ROOF, { x: 0, z: bzc, w: bw, d: bd, y: bh, pitch: 20, overhang: 0.35, seams: false })

  /* ---------------- central risalit ---------------- */
  {
    const { hw, z0: rz0, z1: rz1, h } = RIS
    const rzc = (rz0 + rz1) / 2
    const rd = rz1 - rz0
    b.block(SOCLE, 2 * hw + 0.1, FLOOR, rd, 0, 0, rzc)
    b.block(WALL, 2 * hw, h - FLOOR, rd, 0, FLOOR, rzc)
    b.block(TRIM, 2 * hw + 0.2, 0.24, rd + 0.1, 0, FLOOR - 0.12, rzc)
    // corner pilasters
    for (const s of [-1, 1]) b.block(TRIM, 0.7, 7.0, 0.16, s * (hw - 0.35), FLOOR, rz1 + 0.08)
    // dentil cornice + projecting cornice
    b.block(TRIM, 2 * hw + 0.2, 0.42, rd + 0.1, 0, 9.55, rzc + 0.05)
    for (let x = -hw + 0.3; x <= hw - 0.25; x += 0.42) b.block(TRIM, 0.2, 0.26, 0.2, x, 9.97, rz1 + 0.12)
    b.block(TRIM, 2 * hw + 0.6, 0.45, rd + 0.4, 0, 10.23, rzc + 0.1)
    // crenellated attic
    b.block(TRIM, 2 * hw + 0.1, RIS.attic - h, 0.45, 0, h, rz1 - 0.2)
    for (const s of [-1, 1]) b.block(TRIM, 0.45, RIS.attic - h, rd - 0.3, s * (hw - 0.2), h, rzc - 0.1)
    merlons(b, V(-hw, 0, rz1 - 0.2), V(hw, 0, rz1 - 0.2), RIS.attic, 0.75, RIS.top - RIS.attic, 0.45)
    for (const s of [-1, 1]) merlons(b, V(s * (hw - 0.2), 0, rz1 - 0.2), V(s * (hw - 0.2), 0, rz0 + 0.2), RIS.attic, 0.75, RIS.top - RIS.attic, 0.45)
    b.block(ROOF, 2 * hw - 0.9, 0.1, rd - 0.6, 0, h - 0.1, rzc - 0.1)
    // crest on the attic
    b.add(TRIM, new THREE.CylinderGeometry(0.75, 0.75, 0.3, 18, 1, false, -Math.PI / 2, Math.PI), mat(0, RIS.top - 0.05, rz1 - 0.1, 0, Math.PI / 2))
    // openings: glazed door flanked by two tall arched windows, roundels above
    for (const u of [-2.95, 2.95]) shutterWin(b, '+z', rz1, u, FLOOR + 0.3, 1.55, 3.7)
    window_(b, '+z', rz1, 0, FLOOR + 0.05, { type: 'round', w: 2.6, h: 4.75, glassKey: SHUT, frameKey: TRIM, frame: 0.22, inset: 0.05 })
    b.block('wood', 1.3, 2.95, 0.06, 0, FLOOR + 0.05, rz1 + 0.06)
    for (const u of [-2.95, 0, 2.95]) roundel(b, '+z', rz1, u, 8.45, 0.33)
  }

  /* ---------------- side sections (one bay each) ---------------- */
  for (const s of [-1, 1]) shutterWin(b, '+z', z1, s * 6.55, FLOOR + 0.3, 1.45, 3.4)

  /* ---------------- corner towers ---------------- */
  for (const sx of [-1, 1]) {
    tower(b, sx * TOWER.cx, TOWER.zf, sx, 1)
    tower(b, sx * TOWER.cx, TOWER.zb, sx, -1)
    // side elevation between the towers
    const plane = sx * bx
    for (const z of [-4.3, -0.9]) shutterWin(b, sx > 0 ? '+x' : '-x', plane, sx > 0 ? -z : z, FLOOR + 0.3, 1.4, 3.3)
  }
  // rear elevation between the rear towers
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) shutterWin(b, '-z', z0, -x, FLOOR + 0.3, 1.4, 3.3)

  /* ---------------- central dome on a drum ---------------- */
  {
    const cz = 1.4
    const n = 8
    const rd = 2.2
    const ring = (r: number, y: number) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < n; i++) {
        const a = Math.PI / n + (i / n) * Math.PI * 2
        pts.push(V(Math.cos(a) * r, y, cz + Math.sin(a) * r))
      }
      return pts
    }
    b.add(WALL, loft([ring(rd, 10.5), ring(rd, 13.0)], { capTop: true, flat: true }))
    b.add(TRIM, loft([ring(rd + 0.16, 12.6), ring(rd + 0.16, 13.15)], { capTop: true, capBottom: true, flat: true }))
    onion(b, 0, cz, 13.1, 2.35, 5.0)
  }

  /* ---------------- terrace, balustrades, steps ---------------- */
  {
    const tz0 = RIS.z1
    const tz1 = 11.6
    const hw = 7.0
    b.block(SOCLE, 2 * hw, FLOOR - 0.05, tz1 - tz0, 0, 0, (tz0 + tz1) / 2)
    b.block(TRIM, 2 * hw + 0.2, 0.16, tz1 - tz0 + 0.1, 0, FLOOR - 0.1, (tz0 + tz1) / 2)
    const sw = 2.3
    const prof: [number, number][] = [[0, 0], [0.1, 0], [0.1, 0.07], [0.05, 0.13], [0.11, 0.33], [0.09, 0.47], [0.045, 0.56], [0.07, 0.62], [0, 0.62]]
    const bal = lathe(prof, 7)
    const rail = (a: THREE.Vector3, c: THREE.Vector3) => {
      const L = a.distanceTo(c)
      const n = Math.floor(L / 0.3)
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(c, i / n)
        b.add(TRIM, bal, mat(p.x, FLOOR + 0.12, p.z))
      }
      b.beam(TRIM, a.clone().setY(FLOOR + 0.06), c.clone().setY(FLOOR + 0.06), 0.3, 0.12)
      b.beam(TRIM, a.clone().setY(FLOOR + 0.85), c.clone().setY(FLOOR + 0.85), 0.34, 0.14)
    }
    for (const s of [-1, 1]) {
      rail(V(s * (sw + 0.25), 0, tz1 - 0.2), V(s * (hw - 0.3), 0, tz1 - 0.2))
      rail(V(s * (hw - 0.2), 0, tz1 - 0.4), V(s * (hw - 0.2), 0, tz0 + 0.3))
      for (const x of [s * (sw + 0.05), s * (hw - 0.15)]) b.block(TRIM, 0.45, 1.05, 0.45, x, FLOOR, tz1 - 0.2)
    }
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const hgt = (FLOOR * (steps - i)) / steps
      b.block(SOCLE, 2 * sw, hgt, 0.36, 0, 0, tz1 + 0.18 + i * 0.36)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-11.2, 13.5, 4.6],
  materials: () => ({
    [DOME]: new THREE.MeshStandardMaterial({ color: '#8d939a', metalness: 0.35, roughness: 0.58, envMapIntensity: 1.0 }),
    [SHUT]: new THREE.MeshStandardMaterial({ color: '#6b7d8f', roughness: 0.6, metalness: 0.05 }),
    [ROOF]: new THREE.MeshStandardMaterial({ color: '#7f858c', metalness: 0.3, roughness: 0.62 }),
  }),
  notes: 'Tier C: from one frontal photograph; rear/side elevations, the central dome position and all dimensions are approximations.',
}
export default model
