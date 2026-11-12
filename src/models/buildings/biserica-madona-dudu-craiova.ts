/**
 * Biserica „Adormirea Maicii Domnului” – Madona Dudu, Craiova — Str. Madona Dudu,
 * OSM way 843620632 (outline 38.9 × 18.2 m, long axis 80.4°).
 *
 * Modelling specification (real metres, +X = OSM long axis pointing east to the
 * altar apse, +Z = south; origin = footprint centre; photos 01–03, 2008–2017):
 *  - Neo-Byzantine cross-in-square church on a raised plinth (≈ 1.5 m, wide west
 *    steps). Main body x −13.4…14.2, full width 18.2 m, walls ≈ 12 m.
 *  - West narthex (x −19.4…−12.5, 10.8 m wide) projecting 2 m: its front is a
 *    tall gable crowned by a stilted semicircular arch (≈ 16 m) carrying the
 *    Dormition mosaic, a triple arched window below and the carved red-stone
 *    portal; behind it a semicircular barrel roof.
 *  - Two west corner turrets (4 m square) flanking the narthex: semicircular
 *    gables on every face (cross barrels), octagonal drum, ribbed dome, cross.
 *  - Cross arms with semicircular gables on the north, south and east, barrel
 *    roofs crossing under the central tower.
 *  - Central tower: square base, 12-bay arcaded drum (r ≈ 3.9 m), ribbed dome
 *    to ≈ 27 m, cross ≈ 29 m. Four smaller towers at the corners of the crossing
 *    (photo 02): square bases with blind arcade friezes, 8-bay arcaded drums,
 *    ribbed domes.
 *  - Stilted semicircular altar apse (r 4.4 m) with a ribbed half dome.
 * METAL (client rule): the photographs predate the 2021 works and show a dark
 * grey sheet roof; all roofs, domes and the half dome are shown in elZinc Oliva
 * pre-weathered titanium-zinc (COLOR METAL register 2021), standing seams /
 * ribs ≈ 0.5 m apart.
 * Approximations: heights estimated from the photographs (no survey); the
 * positions of the four crossing towers, the north and east elevations and the
 * roof arrangement between the arms are inferred from the visible south-west /
 * north-west views; ornament (mosaic, portal carving, colonnettes) simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, dome, cross, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ROOF = 'zincOliva'
const W = 'mdWall'
const S = 'mdStone'
const PL = 1.5 // plinth / floor level

/* plan */
const BODY = { x0: -13.4, x1: 14.2, hw: 9.1, h: 12.0 }
const NAR = { x0: -19.4, x1: -12.5, hw: 5.4, h: 11.2, r: 4.9 }
const TUR = { x0: -17.4, x1: -13.4, z0: 5.1, z1: 9.1, h: 12.6 }
const DOME = { x: -2.0, base: 16.4, r: 3.9 }
const ARM_NS = { x: -2.0, hw: 3.6 } // north–south arm (barrel along Z)
const ARM_EW = { hw: 4.0 } // east–west arm (barrel along X)
const CT = [
  [-8.5, -6.6],
  [-8.5, 6.6],
  [4.5, -6.6],
  [4.5, 6.6],
] as const
const APSE = { x0: 14.2, xs: 15.0, r: 4.4, h: 10.0 }

/** Half cylinder (arc on top) along X or Z with standing-seam ribs following the arc. */
function barrel(b: Builder, axis: 'x' | 'z', cx: number, cz: number, len: number, r: number, y0: number, seam = 0.5) {
  const g = new THREE.CylinderGeometry(r, r, len, 28, 1, true, axis === 'x' ? 0 : Math.PI / 2, Math.PI)
  const m = axis === 'x' ? mat(cx, y0, cz, 0, 0, Math.PI / 2) : mat(cx, y0, cz, 0, Math.PI / 2, 0)
  b.add(ROOF, g, m)
  // underside so the open ends do not show the inside as a hole
  const n = Math.floor(len / seam)
  for (let i = 1; i < n; i++) {
    const t = -len / 2 + (i * len) / n
    const tor = new THREE.TorusGeometry(r + 0.02, 0.025, 4, 18, Math.PI)
    if (axis === 'x') b.add(ROOF, tor, mat(cx + t, y0, cz, Math.PI / 2))
    else b.add(ROOF, tor, mat(cx, y0, cz + t))
  }
  // eave rolls
  for (const s of [-1, 1]) {
    if (axis === 'x') b.rod(ROOF, V(cx - len / 2, y0, cz + s * r), V(cx + len / 2, y0, cz + s * r), 0.07, 6)
    else b.rod(ROOF, V(cx + s * r, y0, cz - len / 2), V(cx + s * r, y0, cz + len / 2), 0.07, 6)
  }
}

/** Semicircular (stilted) gable wall: rectangle w × h0 + half disc of radius w/2 on top, thickness t, on face plane. */
function archGable(b: Builder, face: Face, plane: number, u: number, w: number, y0: number, h0: number, t: number, key = W) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  s.lineTo(r, y0 + h0)
  s.absarc(0, y0 + h0, r, 0, Math.PI, false)
  s.lineTo(-r, y0)
  b.add(key, extrude(s, t, 24), M(faceFrame(face, plane, u, 0, 0), mat(0, 0, -t)))
  // archivolt moulding
  const o = new THREE.Shape()
  o.absarc(0, y0 + h0, r + 0.25, 0, Math.PI, false)
  o.absarc(0, y0 + h0, r - 0.15, Math.PI, 0, true)
  b.add('mdTrim', extrude(o, 0.18, 24), M(faceFrame(face, plane, u, 0, 0), mat(0, 0, 0)))
}

/** Arched window (glass + reveal frame) on a façade frame matrix. */
function archWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, frameKey = 'mdTrim') {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, y0)
  s.lineTo(r, y0)
  s.lineTo(r, y0 + h - r)
  s.absarc(0, y0 + h - r, r, 0, Math.PI, false)
  s.lineTo(-r, y0)
  b.add('glassC', new THREE.ShapeGeometry(s, 10), M(m, mat(0, 0, 0.03)))
  const o = new THREE.Shape()
  const R = r + 0.14
  o.moveTo(-R, y0 - 0.12)
  o.lineTo(R, y0 - 0.12)
  o.lineTo(R, y0 + h - r)
  o.absarc(0, y0 + h - r, R, 0, Math.PI, false)
  o.lineTo(-R, y0 - 0.12)
  o.holes.push(new THREE.Path(s.getPoints(10)))
  b.add(frameKey, extrude(o, 0.1, 10), m)
}

/** Round drum with an arcade of n arched windows between colonnettes. */
function arcadeDrum(b: Builder, cx: number, cz: number, r: number, y0: number, h: number, n: number) {
  b.add(W, new THREE.CylinderGeometry(r, r, h, 36), mat(cx, y0 + h / 2, cz))
  b.add('mdTrim', new THREE.CylinderGeometry(r + 0.18, r + 0.25, 0.35, 36), mat(cx, y0 + 0.17, cz))
  b.add('mdTrim', new THREE.CylinderGeometry(r + 0.32, r + 0.15, 0.4, 36), mat(cx, y0 + h - 0.2, cz))
  const bay = (2 * Math.PI * r) / n
  const ww = bay * 0.48
  const wh = h * 0.62
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2
    const m = mat(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, Math.PI / 2 - a)
    archWin(b, m, ww, wh, y0 + h * 0.18)
    const ac = (k / n) * Math.PI * 2
    const px = cx + Math.cos(ac) * (r + 0.1)
    const pz = cz + Math.sin(ac) * (r + 0.1)
    b.add('mdTrim', new THREE.CylinderGeometry(0.08, 0.09, wh * 0.82, 8), mat(px, y0 + h * 0.18 + (wh * 0.82) / 2, pz))
  }
}

/** Melon dome profile (slight overhang at the springing, flattened crown). */
const DOME_PROF: [number, number][] = [
  [1.08, 0],
  [1.1, 0.06],
  [1.07, 0.2],
  [1.0, 0.38],
  [0.88, 0.57],
  [0.7, 0.74],
  [0.46, 0.88],
  [0.2, 0.97],
  [0.0, 1.0],
]

function build(): Builder {
  const b = new Builder()

  /* ================= plinth & steps ================= */
  b.block(S, BODY.x1 - NAR.x0 + 0.6, PL, 2 * BODY.hw + 0.6, (BODY.x1 + NAR.x0) / 2, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = 3.2 - i * 0.42
    b.block(S, d, (PL * (i + 1)) / 7, 15.0 - i * 0.2, NAR.x0 - d / 2, 0, 0)
  }
  // apse plinth
  b.add(S, new THREE.CylinderGeometry(APSE.r + 0.3, APSE.r + 0.3, PL, 32, 1, false, 0, Math.PI), mat(APSE.xs, PL / 2, 0))

  /* ================= main body ================= */
  const bx = (BODY.x0 + BODY.x1) / 2
  const bl = BODY.x1 - BODY.x0
  b.block(W, bl, BODY.h, 2 * BODY.hw, bx, 0, 0)
  b.block(S, bl + 0.1, PL + 1.6, 2 * BODY.hw + 0.1, bx, 0, 0) // ashlar socle
  b.block('mdTrim', bl + 0.5, 0.35, 2 * BODY.hw + 0.5, bx, BODY.h - 0.35, 0)
  b.block('mdTrim', bl + 0.25, 0.25, 2 * BODY.hw + 0.25, bx, BODY.h - 0.95, 0)
  b.block(ROOF, bl - 0.2, 0.12, 2 * BODY.hw - 0.2, bx, BODY.h, 0) // flat roofs between the arms
  // tall narrow leaded windows on the side walls
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const U = (x: number) => (s > 0 ? x : -x)
    for (const x of [-11.2, -5.8, 1.8, 7.0, 11.6]) {
      const m = faceFrame(face, s * BODY.hw, U(x), 0, 0)
      archWin(b, m, 0.85, 4.6, PL + 2.6)
    }
    // pilaster strips
    for (const x of [-13.2, -10.3, 6.7, 9.6, 14.0]) b.block('mdTrim', 0.5, BODY.h - PL - 1.6, 0.12, x, PL + 1.6, s * (BODY.hw + 0.06))
  }

  /* ================= cross arms (barrels + semicircular gables) ================= */
  const yA = BODY.h + 0.05
  barrel(b, 'x', (BODY.x0 + BODY.x1) / 2 + 0.2, 0, bl + 0.3, ARM_EW.hw, yA)
  barrel(b, 'z', ARM_NS.x, 0, 2 * BODY.hw + 0.3, ARM_NS.hw, yA)
  for (const s of [-1, 1]) {
    archGable(b, s > 0 ? '+z' : '-z', s * (BODY.hw + 0.15), s > 0 ? ARM_NS.x : -ARM_NS.x, 2 * ARM_NS.hw + 0.2, BODY.h - 3.0, 3.0, 0.5)
    // windows in the gable: twin arched
    const m = faceFrame(s > 0 ? '+z' : '-z', s * (BODY.hw + 0.15), s > 0 ? ARM_NS.x : -ARM_NS.x, 0, 0)
    for (const du of [-0.75, 0.75]) archWin(b, M(m, mat(du, 0, 0)), 0.9, 2.6, BODY.h - 1.6)
    archWin(b, m, 1.6, 5.0, PL + 2.6)
  }
  archGable(b, '+x', BODY.x1 + 0.15, 0, 2 * ARM_EW.hw + 0.2, BODY.h - 3.0, 3.0, 0.5)

  /* ================= west narthex ================= */
  {
    const nx = (NAR.x0 + NAR.x1) / 2
    const nl = NAR.x1 - NAR.x0
    b.block(W, nl, NAR.h, 2 * NAR.hw, nx, 0, 0)
    b.block(S, nl + 0.1, PL + 2.4, 2 * NAR.hw + 0.1, nx, 0, 0)
    b.block('mdTrim', nl, 0.3, 2 * NAR.hw + 0.3, nx, NAR.h - 0.6, 0)
    barrel(b, 'x', nx + 0.3, 0, nl - 0.6, NAR.r, NAR.h)
    b.block(ROOF, nl - 0.6, 0.1, 2 * NAR.hw, nx + 0.3, NAR.h - 0.05, 0)
    // west front: stilted semicircular gable
    const front = new THREE.Shape()
    const hw = NAR.hw
    const r = NAR.r
    front.moveTo(-hw, 0)
    front.lineTo(hw, 0)
    front.lineTo(hw, NAR.h - 0.6)
    front.lineTo(r, NAR.h - 0.6)
    front.lineTo(r, NAR.h)
    front.absarc(0, NAR.h, r, 0, Math.PI, false)
    front.lineTo(-r, NAR.h - 0.6)
    front.lineTo(-hw, NAR.h - 0.6)
    front.lineTo(-hw, 0)
    const fm = faceFrame('-x', NAR.x0, 0, 0, 0)
    b.add(W, extrude(front, 0.9, 32), M(fm, mat(0, 0, -0.6)))
    // archivolt & mosaic tympanum
    const o = new THREE.Shape()
    o.absarc(0, NAR.h, r + 0.12, 0, Math.PI, false)
    o.absarc(0, NAR.h, r - 0.55, Math.PI, 0, true)
    b.add('mdTrim', extrude(o, 0.22, 32), M(fm, mat(0, 0, 0.3)))
    const ty = new THREE.Shape()
    const rt = r - 1.35
    ty.moveTo(-rt, NAR.h - 1.0)
    ty.lineTo(rt, NAR.h - 1.0)
    ty.lineTo(rt, NAR.h)
    ty.absarc(0, NAR.h, rt, 0, Math.PI, false)
    ty.lineTo(-rt, NAR.h - 1.0)
    // inner archivolt around the mosaic
    const o2 = new THREE.Shape()
    o2.absarc(0, NAR.h, rt + 0.3, 0, Math.PI, false)
    o2.absarc(0, NAR.h, rt, Math.PI, 0, true)
    b.add('mdTrim', extrude(o2, 0.12, 24), M(fm, mat(0, 0, 0.3)))
    b.add('mdMosaic', new THREE.ShapeGeometry(ty, 24), M(fm, mat(0, 0, 0.32)))
    // triple arched window under the mosaic
    for (const u of [-1.05, 0, 1.05]) archWin(b, M(fm, mat(u, 0, 0.3)), 0.7, 1.8, NAR.h - 3.5)
    b.add('mdTrim', metricBox(3.6, 0.18, 0.4), M(fm, mat(0, NAR.h - 3.62, 0.35)))
    // carved red-stone portal with door
    const pw = 3.7
    const ph = 7.0
    b.add('mdPortal', metricBox(pw, ph, 0.35), M(fm, mat(0, PL + ph / 2, 0.45)))
    b.add('mdPortal', metricBox(pw + 0.5, 0.6, 0.5), M(fm, mat(0, PL + ph + 0.1, 0.5)))
    for (let i = 0; i < 9; i++) b.add('mdPortal', new THREE.ConeGeometry(0.16, 0.45, 4), M(fm, mat(-pw / 2 + 0.2 + (i * (pw - 0.4)) / 8, PL + ph + 0.62, 0.55)))
    const dr = new THREE.Shape()
    dr.moveTo(-1.1, PL)
    dr.lineTo(1.1, PL)
    dr.lineTo(1.1, PL + 3.9)
    dr.absarc(0, PL + 3.9, 1.1, 0, Math.PI, false)
    dr.lineTo(-1.1, PL)
    b.add('mdDoor', new THREE.ShapeGeometry(dr, 12), M(fm, mat(0, 0, 0.64)))
    // stone side pilasters of the front
    for (const u of [-hw + 0.45, hw - 0.45]) b.add(S, metricBox(0.9, NAR.h - 0.6, 0.25), M(fm, mat(u, (NAR.h - 0.6) / 2, 0.38)))
  }

  /* ================= west turrets ================= */
  for (const s of [-1, 1]) {
    const cx = (TUR.x0 + TUR.x1) / 2
    const cz = s * (TUR.z0 + TUR.z1) / 2
    const w = TUR.x1 - TUR.x0
    b.block(W, w, TUR.h, TUR.z1 - TUR.z0, cx, 0, cz)
    b.block(S, w + 0.1, PL + 1.6, TUR.z1 - TUR.z0 + 0.1, cx, 0, cz)
    b.block('mdTrim', w + 0.3, 0.3, TUR.z1 - TUR.z0 + 0.3, cx, TUR.h - 1.5, cz)
    const r = w / 2
    barrel(b, 'x', cx, cz, w + 0.3, r, TUR.h)
    barrel(b, 'z', cx, cz, w + 0.3, r, TUR.h)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f.endsWith('x') ? cx + (f[0] === '+' ? r + 0.15 : -r - 0.15) : cz + (f[0] === '+' ? r + 0.15 : -r - 0.15)
      const u = f === '+z' ? cx : f === '-z' ? -cx : f === '+x' ? -cz : cz
      archGable(b, f, plane, u, 2 * r + 0.2, TUR.h - 1.2, 1.2, 0.4)
      archWin(b, faceFrame(f, plane, u, 0, 0), 0.7, 2.2, TUR.h - 1.1)
      archWin(b, faceFrame(f, plane, u, 0, 0), 0.55, 4.0, PL + 3.0)
    }
    // octagonal drum and dome
    const y0 = TUR.h + r - 0.5
    b.add(W, new THREE.CylinderGeometry(1.55, 1.55, 2.0, 8, 1, false, Math.PI / 8), mat(cx, y0 + 1.0, cz))
    b.add('mdTrim', new THREE.CylinderGeometry(1.75, 1.6, 0.3, 8, 1, false, Math.PI / 8), mat(cx, y0 + 1.95, cz))
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2
      archWin(b, mat(cx + Math.cos(a) * 1.43, 0, cz + Math.sin(a) * 1.43, Math.PI / 2 - a), 0.45, 1.2, y0 + 0.4)
    }
    const top = dome(b, ROOF, { x: cx, z: cz, y: y0 + 2.1, r: 1.6, h: 1.75, profile: DOME_PROF, seg: 32, ribs: 12, ribH: 0.05 })
    cross(b, 'mdCross', cx, top, cz, 1.4, false, Math.PI / 2)
  }

  /* ================= central tower ================= */
  {
    const cx = DOME.x
    b.block(W, 8.2, DOME.base - BODY.h, 8.2, cx, BODY.h, 0)
    b.block('mdTrim', 8.6, 0.35, 8.6, cx, DOME.base - 0.35, 0)
    b.block(ROOF, 8.6, 0.1, 8.6, cx, DOME.base, 0)
    arcadeDrum(b, cx, 0, DOME.r, DOME.base, 6.0, 12)
    const top = dome(b, ROOF, { x: cx, z: 0, y: DOME.base + 6.0, r: DOME.r, h: 4.3, profile: DOME_PROF, seg: 48, ribs: 24, ribH: 0.06 })
    b.add('mdTrim', new THREE.CylinderGeometry(0.3, 0.45, 0.6, 12), mat(cx, top + 0.25, 0))
    cross(b, 'mdCross', cx, top + 0.5, 0, 2.0, false, Math.PI / 2)
  }

  /* ================= four crossing towers ================= */
  for (const [x, z] of CT) {
    const base = 16.0
    b.block(W, 4.4, base - BODY.h, 4.4, x, BODY.h, z)
    b.block('mdTrim', 4.7, 0.3, 4.7, x, base - 0.3, z)
    b.block(ROOF, 4.6, 0.1, 4.6, x, base, z)
    // blind arcade frieze on the square base
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f.endsWith('x') ? x + (f[0] === '+' ? 2.2 : -2.2) : z + (f[0] === '+' ? 2.2 : -2.2)
      const u = f === '+z' ? x : f === '-z' ? -x : f === '+x' ? -z : z
      for (let i = 0; i < 5; i++) archWin(b, faceFrame(f, plane, u - 1.6 + i * 0.8, 0, 0), 0.42, 1.6, base - 2.4, 'mdTrim')
    }
    arcadeDrum(b, x, z, 1.85, base + 0.1, 3.2, 8)
    const top = dome(b, ROOF, { x, z, y: base + 3.3, r: 1.85, h: 2.0, profile: DOME_PROF, seg: 32, ribs: 12, ribH: 0.05 })
    cross(b, 'mdCross', x, top, z, 1.4, false, Math.PI / 2)
  }

  /* ================= altar apse ================= */
  {
    const { xs, r, h } = APSE
    b.block(W, xs - APSE.x0 + 0.01, h, 2 * r, (APSE.x0 + xs) / 2, 0, 0)
    b.add(W, new THREE.CylinderGeometry(r, r, h, 40, 1, false, 0, Math.PI), mat(xs, h / 2, 0))
    b.add(S, new THREE.CylinderGeometry(r + 0.05, r + 0.05, PL + 1.6, 40, 1, false, 0, Math.PI), mat(xs, (PL + 1.6) / 2, 0))
    b.add('mdTrim', new THREE.CylinderGeometry(r + 0.3, r + 0.3, 0.35, 40, 1, false, 0, Math.PI), mat(xs, h - 0.17, 0))
    for (const a of [-50, 0, 50]) {
      const ar = (a * Math.PI) / 180
      archWin(b, mat(xs + Math.cos(ar) * r, 0, Math.sin(ar) * r, Math.PI / 2 - ar), 0.8, 3.6, PL + 3.2)
    }
    // ribbed half dome
    const prof = DOME_PROF.map(([pr, py]) => new THREE.Vector2(Math.max(pr * (r + 0.1), 0.001), py * 3.6))
    b.add(ROOF, new THREE.LatheGeometry(prof, 24, 0, Math.PI), mat(xs, h, 0))
    for (let k = 1; k < 12; k++) {
      const a = (k / 12) * Math.PI
      for (let i = 0; i < prof.length - 1; i++) {
        const p0 = prof[i]
        const p1 = prof[i + 1]
        b.beam(ROOF, V(xs + Math.sin(a) * (p0.x + 0.03), h + p0.y, Math.cos(a) * (p0.x + 0.03)), V(xs + Math.sin(a) * (p1.x + 0.03), h + p1.y, Math.cos(a) * (p1.x + 0.03)), 0.05, 0.05)
      }
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 24, 0],
  materials: () => ({
    mdWall: new THREE.MeshStandardMaterial({ color: '#dcd6ca', roughness: 0.9 }),
    mdTrim: new THREE.MeshStandardMaterial({ color: '#e9e4d8', roughness: 0.85 }),
    mdStone: new THREE.MeshStandardMaterial({ color: '#cdc5b5', roughness: 0.9 }),
    mdPortal: new THREE.MeshStandardMaterial({ color: '#b8705a', roughness: 0.85 }),
    mdMosaic: new THREE.MeshStandardMaterial({ color: '#a8874f', roughness: 0.55, metalness: 0.25 }),
    mdDoor: new THREE.MeshStandardMaterial({ color: '#4a3022', roughness: 0.7 }),
    mdCross: new THREE.MeshStandardMaterial({ color: '#5a5d57', roughness: 0.5, metalness: 0.5 }),
  }),
  notes:
    'Neo-Byzantine church with a central arcaded dome, four crossing towers, two west turrets and a mosaic-crowned west front; all roofs and domes shown in elZinc Oliva pre-weathered titanium-zinc (register 2021), the photographs predate the works.',
}
export default model
