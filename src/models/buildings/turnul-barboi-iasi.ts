/**
 * Turnul-clopotniță al Bisericii Bărboi, Iași (Stradela Bărboi 12) — the stone gate
 * and bell tower in front of the Bărboi church; green sheet-metal dome and lantern.
 *
 * Modelling specification (real metres, origin = footprint centre at ground):
 *  - Footprint: OSM way 207239229 (untagged, attributed to the tower by the research
 *    record) 7.6 × 7.0 m, long side at 58.9°. The photos confirm a compact plan of
 *    this size: the ground storey is ≈ 7.6 m wide in the frontal photo 01 (arch
 *    ≈ 3.3 m, people/car for scale), so the attribution is kept. +X = 58.9° along
 *    the façades, +Z = 148.9° (SSE) = the street face of the gate passage; the
 *    church lies ≈ 23 m to the NNW, behind −Z.
 *  - Ground storey (≈ 10 m): an octagon with wide chamfered corners (photo 02 shows
 *    front face, chamfer and side face at once), limestone ashlar, plinth; tall
 *    round-arched passage (≈ 3.3 × 6.3 m) with a moulded archivolt on ±Z; on each
 *    chamfer a ringed oculus over a small arched window; lattice frieze, cornice
 *    and a low grey sheet hipped roof around the shaft.
 *  - Square shaft (≈ 5.6 m) in four stages separated by cornices (photos 01–03):
 *    short plain stage; lower belfry with a glazed bifora + oculus under a relieving
 *    arch; a baluster band; upper belfry with a larger louvred bifora; clock stage
 *    with clock faces on all four sides and an ornamental frieze under a strong
 *    cornice.
 *  - Octagonal bell dome (≈ 3.3 m), octagonal lantern with arched lights, small
 *    cupola, knob and an ornate iron cross — green painted (or patinated) sheet as
 *    photographed (2012, 2018); the register line names no year or metal, so the
 *    metal is shown as photographed and the material is not identified.
 * Heights (estimated from photo 01 proportions with the base width as scale):
 * base cornice ≈ 10 m, belfry cornices ≈ 16.9 / 23.3 m, clock cornice ≈ 27.3 m,
 * dome top ≈ 30.6 m, cupola ≈ 33 m, cross top ≈ 35.6 m.
 * Approximations: the rear (church) face mirrors the street face; frieze ornament,
 * louvres and clock faces simplified; chamfer size estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, loft, extrude, opening, frameShape, polyRing, helm, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const STONE = 'bbStone'
const TRIM = 'bbTrim'
const GREEN = 'bbGreen'
const ROOF = 'bbRoof'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
/** faceFrame with the plane given as a positive half-width (sign taken from the face). */
const FF = (f: Face, hw: number, u = 0) => faceFrame(f, f[0] === '-' ? -hw : hw, u, 0, 0)

/* ground storey octagon */
const HX = 3.8
const HZ = 3.5
const CH = 1.55 // chamfer leg
const BASE_H = 10.0

/* shaft stages: [y0, y1, half width] */
const ST = {
  a: [10.0, 11.4, 2.8],
  b: [11.4, 16.9, 2.75],
  band: [16.9, 17.6, 2.8],
  c: [17.6, 23.3, 2.65],
  d: [23.3, 27.3, 2.55],
} as const

function octRing(y: number, grow = 0) {
  const hx = HX + grow
  const hz = HZ + grow
  const c = CH + grow * 0.41
  return [V(hx, y, -hz + c), V(hx, y, hz - c), V(hx - c, y, hz), V(-hx + c, y, hz), V(-hx, y, hz - c), V(-hx, y, -hz + c), V(-hx + c, y, -hz), V(hx - c, y, -hz)]
}

/** Wall frame on a chamfer face (outward normal at angle a, measured from +X towards +Z). */
function chamferFrame(sx: number, sz: number) {
  const cx = sx * (HX - CH / 2)
  const cz = sz * (HZ - CH / 2)
  const n = V(sx, 0, sz).normalize()
  const ry = Math.atan2(n.x, n.z)
  return mat(cx, 0, cz, ry)
}

/** Round-arched opening with a moulded surround in local wall coords (x along, y up, z out). */
function archOpening(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, fill: string, f = 0.22, depth = 0.14) {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 14))), M(m, mat(0, 0, 0.02)))
  b.add(TRIM, extrude(frameShape('round', w, h, f, 0, y0), depth), M(m, mat(0, 0, 0.0)))
}

function oculus(b: Builder, m: THREE.Matrix4, y: number, r: number, fill = 'black') {
  b.add(fill, new THREE.CircleGeometry(r, 20), M(m, mat(0, y, 0.03)))
  b.add(TRIM, new THREE.TorusGeometry(r + 0.1, 0.1, 6, 24), M(m, mat(0, y, 0.06)))
  // radiating voussoir ring (as in photo 02)
  b.add(TRIM, new THREE.TorusGeometry(r + 0.32, 0.06, 4, 24), M(m, mat(0, y, 0.05)))
}

/** Bifora: two round-arched lights with a colonnette and an oculus under a relieving arch. */
function bifora(b: Builder, m: THREE.Matrix4, y0: number, lw: number, lh: number, louvres: boolean) {
  const gap = 0.28
  for (const s of [-1, 1]) {
    const x = s * (lw / 2 + gap / 2)
    const mm = M(m, mat(x, 0, 0))
    b.add(louvres ? 'bbLouvre' : 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', lw, lh, 0, y0, 12))), M(mm, mat(0, 0, 0.015)))
    b.add(TRIM, extrude(frameShape('round', lw, lh, 0.1, 0, y0), 0.08), mm)
    if (louvres) for (let i = 0; i < 8; i++) b.add('bbLouvre', metricBox(lw, 0.05, 0.1), M(mm, mat(0, y0 + 0.2 + i * ((lh - lw / 2 - 0.3) / 7), 0.05, 0, 0.5)))
  }
  // colonnette + small capital
  b.add(TRIM, new THREE.CylinderGeometry(0.07, 0.08, lh - lw / 2, 8), M(m, mat(0, y0 + (lh - lw / 2) / 2, 0.06)))
  b.add(TRIM, metricBox(0.26, 0.12, 0.2), M(m, mat(0, y0 + lh - lw / 2 + 0.06, 0.06)))
  // oculus in the tympanum
  const W = 2 * lw + gap + 0.5
  const yo = y0 + lh + 0.32
  b.add('black', new THREE.CircleGeometry(0.24, 16), M(m, mat(0, yo, 0.015)))
  b.add(TRIM, new THREE.TorusGeometry(0.29, 0.06, 6, 16), M(m, mat(0, yo, 0.03)))
  // relieving arch (archivolt) enclosing both lights
  const H = lh + 0.95
  b.add(TRIM, extrude(frameShape('round', W, H, 0.2, 0, y0 - 0.15), 0.14), m)
  // sill
  b.add(TRIM, metricBox(W + 0.5, 0.14, 0.3), M(m, mat(0, y0 - 0.22, 0.1)))
}

function cornice(b: Builder, y: number, hw: number, proj = 0.32, h = 0.42) {
  b.block(TRIM, 2 * hw + 0.08, h * 0.35, 2 * hw + 0.08, 0, y - h, 0)
  b.block(TRIM, 2 * (hw + proj * 0.55), h * 0.3, 2 * (hw + proj * 0.55), 0, y - h * 0.65, 0)
  b.block(TRIM, 2 * (hw + proj), h * 0.35, 2 * (hw + proj), 0, y - h * 0.35, 0)
}

function frieze(b: Builder, y0: number, h: number, hw: number, step = 0.32) {
  b.block(TRIM, 2 * hw + 0.1, h, 2 * hw + 0.1, 0, y0, 0)
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    for (let u = -hw + step / 2; u < hw; u += step) {
      const m = FF(f, hw + 0.05, u)
      b.add(STONE, metricBox(step * 0.42, h * 0.62, 0.05), M(m, mat(0, y0 + h / 2, 0.02, 0, 0, Math.PI / 4)))
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= ground storey (octagon) ================= */
  b.add(STONE, loft([octRing(0), octRing(BASE_H - 0.9)], { capTop: true, capBottom: false, flat: true }))
  b.add(TRIM, loft([octRing(0, 0.12), octRing(0.65, 0.12)], { capTop: true, flat: true }))
  // corner pilaster strips at the chamfer edges
  for (const p of octRing(0, 0.04)) b.block(TRIM, 0.34, BASE_H - 1.6, 0.34, p.x, 0.65, p.z)
  // lattice frieze + cornice
  b.add(TRIM, loft([octRing(BASE_H - 0.9, 0.06), octRing(BASE_H - 0.3, 0.06)], { capTop: false, flat: true }))
  b.add(TRIM, loft([octRing(BASE_H - 0.3, 0.2), octRing(BASE_H - 0.15, 0.32), octRing(BASE_H, 0.42)], { capTop: true, capBottom: true, flat: true }))
  {
    const r0 = octRing(BASE_H - 0.6, 0.11)
    for (let i = 0; i < 8; i++) {
      const a = r0[i]
      const c = r0[(i + 1) % 8]
      const L = a.distanceTo(c)
      const n = Math.floor(L / 0.36)
      const dir = c.clone().sub(a).normalize()
      const ry = Math.atan2(-dir.z, dir.x)
      for (let k = 0; k < n; k++) {
        const p = a.clone().lerp(c, (k + 0.5) / n)
        b.add(STONE, metricBox(0.2, 0.2, 0.04), mat(p.x, p.y, p.z, ry, 0, Math.PI / 4))
      }
    }
  }
  // low hipped sheet roof from the cornice to the shaft
  {
    const s = ST.a[2] + 0.02
    const yE = BASE_H + 0.05
    const yT = BASE_H + 0.7
    const o = octRing(yE, 0.5)
    const q = [V(s, yT, -s), V(s, yT, s), V(s, yT, s), V(-s, yT, s), V(-s, yT, s), V(-s, yT, -s), V(-s, yT, -s), V(s, yT, -s)]
    b.add(ROOF, loft([o, q], { flat: true }))
    for (let i = 0; i < 8; i++) b.beam(ROOF, o[i].clone().setY(yE + 0.04), q[i].clone().setY(yT + 0.04), 0.12, 0.08)
  }

  // passage arch on the street (+Z) and courtyard (−Z) faces
  for (const f of ['+z', '-z'] as Face[]) {
    const m = FF(f, HZ)
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.3, 6.3, 0, 0, 18))), M(m, mat(0, 0, 0.02)))
    b.add(TRIM, extrude(frameShape('round', 3.3, 6.3, 0.55, 0, 0), 0.18), M(m, mat(0, 0, 0)))
    // keystone and impost blocks
    b.add(TRIM, metricBox(0.5, 0.8, 0.3), M(m, mat(0, 6.6, 0.1)))
    for (const s of [-1, 1]) b.add(TRIM, metricBox(0.75, 0.3, 0.3), M(m, mat(s * 1.92, 4.6, 0.12)))
    // wrought-iron gate in the passage
    for (let i = -6; i <= 6; i++) b.add('iron', metricBox(0.03, 4.5, 0.03), M(m, mat(i * 0.25, 2.25, -1.2)))
    for (const y of [0.3, 2.4, 4.4]) b.add('iron', metricBox(3.25, 0.05, 0.05), M(m, mat(0, y, -1.2)))
    // dedication plaque beside the arch
    b.add('black', metricBox(0.9, 0.55, 0.04), M(m, mat(f === '+z' ? 2.45 : -2.45, 2.6, 0.03)))
  }
  // passage vault (dark tunnel visible through the arch)
  b.block('black', 3.2, 4.6, 2 * HZ - 0.1, 0, 0, 0)
  // chamfer faces: ringed oculus over a small arched window
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const m = chamferFrame(sx, sz)
    archOpening(b, m, 0.95, 2.4, 1.6, 'glassC', 0.2)
    oculus(b, m, 6.3, 0.5)
  }
  // side faces (±X): blind arched niche + oculus
  for (const f of ['+x', '-x'] as Face[]) {
    const m = FF(f, HX)
    archOpening(b, m, 1.1, 3.0, 1.5, STONE, 0.22)
    oculus(b, m, 6.5, 0.55)
  }

  /* ================= shaft ================= */
  const stage = (s: readonly number[]) => {
    const [y0, y1, hw] = s
    b.block(STONE, 2 * hw, y1 - y0, 2 * hw, 0, y0, 0)
    // corner pilaster strips
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block(TRIM, 0.55, y1 - y0, 0.12, sx * (hw - 0.275), y0, sz * (hw + 0.06))
      b.block(TRIM, 0.12, y1 - y0, 0.55, sx * (hw + 0.06), y0, sz * (hw - 0.275))
    }
  }
  stage(ST.a)
  stage(ST.b)
  stage(ST.c)
  stage(ST.d)
  // band A/B
  b.block(TRIM, 2 * ST.a[2] + 0.3, 0.28, 2 * ST.a[2] + 0.3, 0, ST.a[1] - 0.14, 0)
  // stage A: small square window on each face
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    const m = FF(f, ST.a[2])
    b.add('black', metricBox(0.5, 0.5, 0.02), M(m, mat(0, 10.7, 0.02)))
    b.add(TRIM, metricBox(0.7, 0.08, 0.1), M(m, mat(0, 10.42, 0.05)))
  }
  // stage B: lower glazed bifora, frieze and cornice
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) bifora(b, FF(f, ST.b[2]), 12.5, 0.72, 2.25, false)
  frieze(b, ST.b[1] - 0.95, 0.4, ST.b[2] + 0.02, 0.3)
  cornice(b, ST.b[1], ST.b[2], 0.45, 0.55)
  // baluster band
  {
    const [y0, y1, hw] = ST.band
    b.block(STONE, 2 * hw, y1 - y0, 2 * hw, 0, y0, 0)
    b.block(TRIM, 2 * hw + 0.16, 0.12, 2 * hw + 0.16, 0, y1 - 0.12, 0)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      for (let u = -hw + 0.3; u < hw - 0.2; u += 0.3) {
        const m = FF(f, hw, u)
        b.add(TRIM, new THREE.CylinderGeometry(0.06, 0.08, y1 - y0 - 0.2, 6), M(m, mat(0, (y0 + y1) / 2 - 0.04, 0.06)))
      }
    }
  }
  // stage C: larger louvred bifora
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) bifora(b, FF(f, ST.c[2]), 18.75, 0.8, 2.75, true)
  frieze(b, ST.c[1] - 0.85, 0.32, ST.c[2] + 0.02, 0.28)
  cornice(b, ST.c[1], ST.c[2], 0.48, 0.55)
  // stage D: clock faces, recessed panels, ornamental frieze, strong cornice
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    const m = FF(f, ST.d[2])
    b.add('bbClock', new THREE.CircleGeometry(0.66, 28), M(m, mat(0, 25.2, 0.07)))
    b.add(TRIM, new THREE.TorusGeometry(0.72, 0.08, 6, 28), M(m, mat(0, 25.2, 0.08)))
    b.add('black', metricBox(0.05, 0.5, 0.02), M(m, mat(0.08, 25.38, 0.1, 0, 0, -0.5)))
    b.add('black', metricBox(0.05, 0.36, 0.02), M(m, mat(-0.1, 25.1, 0.1, 0, 0, 1.2)))
    for (const s of [-1, 1]) b.add(TRIM, metricBox(0.5, 2.6, 0.05), M(m, mat(s * 1.55, 25.0, 0.03)))
  }
  frieze(b, ST.d[1] - 1.05, 0.45, ST.d[2] + 0.03, 0.26)
  cornice(b, ST.d[1], ST.d[2], 0.5, 0.6)

  /* ================= dome, lantern, cupola ================= */
  const yD = ST.d[1]
  const k = 1 / Math.cos(Math.PI / 8) // apothem → circumradius
  const domeSt: [number, number][] = [
    [2.72 * k, yD],
    [2.7 * k, yD + 0.35],
    [2.58 * k, yD + 0.95],
    [2.33 * k, yD + 1.6],
    [1.95 * k, yD + 2.2],
    [1.48 * k, yD + 2.7],
    [1.02 * k, yD + 3.05],
    [0.9 * k, yD + 3.15],
  ]
  helm(b, GREEN, { n: 8, stations: domeSt, flat: false })
  // corner ribs and two horizontal sheet joints (photo 02)
  const ring = (r: number, y: number) => polyRing(8, r, y, Math.PI / 8)
  for (let i = 0; i < domeSt.length - 1; i++) {
    const r0 = ring(domeSt[i][0] + 0.03, domeSt[i][1])
    const r1 = ring(domeSt[i + 1][0] + 0.03, domeSt[i + 1][1])
    for (let j = 0; j < 8; j++) b.beam(GREEN, r0[j], r1[j], 0.09, 0.07)
  }
  for (const t of [0.9, 1.75]) {
    const idx = domeSt.findIndex(([, y]) => y > yD + t)
    const [ra, ya] = domeSt[idx - 1]
    const [rb, yb] = domeSt[idx]
    const r = ra + ((yD + t - ya) / (yb - ya)) * (rb - ra)
    const rr = ring(r + 0.02, yD + t)
    for (let j = 0; j < 8; j++) b.beam(GREEN, rr[j], rr[(j + 1) % 8], 0.04, 0.04)
  }
  // small vents on the dome (photo 02)
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const r = 2.45
    b.add(GREEN, new THREE.ConeGeometry(0.16, 0.4, 4), mat(Math.cos(a) * r, yD + 1.0, Math.sin(a) * r))
  }
  // lantern
  const yL = yD + 3.15
  const LR = 1.02
  b.add(GREEN, loft([ring(LR * k, yL), ring(LR * k, yL + 1.6)], { capTop: true, flat: true }))
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * Math.PI * 2
    const m = mat(Math.cos(a) * (LR + 0.01), 0, Math.sin(a) * (LR + 0.01), Math.PI / 2 - a)
    b.add('glassG', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.42, 1.05, 0, yL + 0.28, 8))), M(m, mat(0, 0, 0.01)))
  }
  helm(b, GREEN, { n: 8, stations: [[LR * k + 0.18, yL + 1.57], [LR * k + 0.22, yL + 1.7], [LR * k + 0.05, yL + 1.77]], flat: true })
  const cup: [number, number][] = [
    [1.08 * k, yL + 1.77],
    [1.02 * k, yL + 2.02],
    [0.8 * k, yL + 2.36],
    [0.46 * k, yL + 2.62],
    [0.12, yL + 2.74],
  ]
  helm(b, GREEN, { n: 8, stations: cup })
  const yK = yL + 2.74
  b.add(GREEN, new THREE.CylinderGeometry(0.1, 0.16, 0.3, 10), mat(0, yK + 0.12, 0))
  b.add('bbIronCross', new THREE.SphereGeometry(0.17, 12, 8), mat(0, yK + 0.42, 0))
  // ornate "snowflake" iron cross (photos 01, 03)
  {
    const yc = yK + 0.6
    const H = 2.3
    b.rod('bbIronCross', V(0, yc, 0), V(0, yc + H, 0), 0.04, 6)
    const cy = yc + H * 0.62
    b.add('bbIronCross', metricBox(1.5, 0.07, 0.05), mat(0, cy, 0))
    for (const a of [Math.PI / 4, -Math.PI / 4]) b.add('bbIronCross', metricBox(1.1, 0.04, 0.04), mat(0, cy, 0, 0, 0, a))
    for (const [x, y] of [[0.75, 0], [-0.75, 0], [0, H * 0.38], [0, -0.55]]) b.add('bbIronCross', new THREE.TorusGeometry(0.09, 0.02, 4, 10), mat(x, cy + y, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [0, 29.2, 2.4],
  materials: (base) => {
    const g = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    // light green painted sheet as photographed (texture is neutral grey ≈ 0.71)
    g.color.setRGB(0.74, 0.92, 0.5)
    g.metalness = 0.3
    g.roughness = 0.58
    return {
      bbGreen: g,
      bbStone: new THREE.MeshStandardMaterial({ color: '#d3c8b0', roughness: 0.88 }),
      bbTrim: new THREE.MeshStandardMaterial({ color: '#ddd4be', roughness: 0.84 }),
      bbLouvre: new THREE.MeshStandardMaterial({ color: '#5a3c2c', roughness: 0.7 }),
      bbRoof: new THREE.MeshStandardMaterial({ color: '#8d928c', roughness: 0.55, metalness: 0.45 }),
      bbClock: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.5 }),
      bbIronCross: new THREE.MeshStandardMaterial({ color: '#2b2b2d', roughness: 0.5, metalness: 0.5 }),
    }
  },
  notes:
    'Stone gate and bell tower: octagonal ground storey with the passage arch, square four-stage shaft with biforas and clocks, octagonal green sheet dome with lantern; heights estimated from photographs, ornament simplified.',
}
export default model
