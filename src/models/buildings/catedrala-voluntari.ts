/**
 * Catedrala Ortodoxă din Voluntari („Intrarea Domnului în Ierusalim” și
 * „Sfânta Cuvioasă Parascheva”) — elZinc Natural titanium-zinc roofs and domes.
 *
 * Modelling specification derived from the six reference photographs (real metres,
 * origin = footprint centre at ground, +X = OSM long axis towards the altar / NE,
 * main façade towards −X):
 *  - Stone podium (~3 m) with a broad flight of steps in front of the west porch.
 *  - Pronaos block (≈ 18 × 30.6 m, cornice ≈ 18 m): two storeys separated by a
 *    string course. West front: open porch of three round arches on paired
 *    Corinthian columns, flanking blind arches with mosaic icons, corner
 *    half-columns; upper storey with four small arched windows and a central
 *    icon window under a raised segmental arch of the cornice (photos 04, 05).
 *    Low hipped zinc roof hidden behind the cornice.
 *  - Naos, cross-in-square (≈ 30 × 30 m): four barrel-vaulted arms ending in
 *    segmental arched gables with archivolts (W gable with three small windows,
 *    photo 04; N/S gables with a tall window, photo 02), four corner bays carrying
 *    the small towers, low side porches on the N/S arms (photo 05).
 *  - Main tower over the crossing: two-step square plinth, octagonal drum with
 *    corner colonnettes and recessed arched windows, moulded eave cornice,
 *    eight-sided bell dome in zinc with hip ribs, ornate cross (photos 01, 03).
 *    Cross top ≈ 60 m (company text ~60 m; consistent with photo 04 perspective).
 *  - Four small corner towers: square base, octagonal belfry drum with louvred
 *    arched openings, eave cornice, eight-sided zinc dome and cross (photos 02, 03).
 *  - East end: barrel-vaulted sanctuary bay with a semicircular altar apse and
 *    half-dome; lower barrel-roofed prothesis / diaconicon bays with small conch
 *    apses (photos 02, 05, 06).
 *  - COLOR METAL scope: elZinc Natural standing-seam roofs (barrels, hips, conch
 *    half-domes) and the tower domes; seams ≈ 0.5 m.
 * Approximations: plan depth of every volume, the east end and the hidden north
 * side (mirrored) are interpreted — no aerial view or plan was available; the
 * domes are zinc diamond shingles in reality (modelled smooth with hip ribs);
 * mouldings, modillions and icons simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, hippedRoof, barrelRoof, helm, seams, faceFrame } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'vZinc' // elZinc Natural, weathered mid grey as photographed
const WALL = 'plasterWhite'
const TRIM = 'stoneLight'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)

const FLOOR = 3.0
const P = { x0: -35, x1: -17, hw: 15.3, top: 18.2, string: 12.1 }
const N = { x0: -17, x1: 13, hw: 15, xa: -9, xb: 5, za: 7, spring: 26.5, rise: 3.8, bayTop: 31.5 }
const TX = -2 // main tower axis
const DRUM = { r: 6.25, y0: 37.0, y1: 48.0 }
const SMALL: [number, number][] = [
  [-13, -11],
  [-13, 11],
  [9, -11],
  [9, 11],
]
const ST = { base: 6.8, y0: 31.5, yb: 33.6, r: 3.1, y1: 38.8 }

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
/** Frame on a wall with outward normal angle a (XZ: (cos a, sin a)) through (x, z): local x along wall, y up, z out. */
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

interface Op {
  w: number
  h: number
  y0: number
  u?: number
  type?: OpeningType
  glass?: string
  frame?: number
  frameKey?: string
  depth?: number
  /** second, outer archivolt ring at this gap */
  arch2?: number
  louvres?: boolean
  transom?: number
  sill?: boolean
  off?: number
}

/** Opening (glass / icon / louvres) with a moulded surround on an arbitrary wall frame. */
function op(b: Builder, m: THREE.Matrix4, o: Op) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.18
  const fk = o.frameKey ?? TRIM
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.03)))
  if (f > 0) b.add(fk, extrude(frameShape(type, o.w, o.h, f, u, o.y0), o.depth ?? 0.12, 10), mul(m, mat(0, 0, off + 0.01)))
  if (o.arch2) {
    const g = f + o.arch2
    b.add(fk, extrude(frameShape(type, o.w + 2 * g, o.h + g, 0.14, u, o.y0 - g * 0.3), 0.07, 10), mul(m, mat(0, 0, off + 0.01)))
  }
  if (o.louvres) {
    const top = o.y0 + o.h - (type === 'rect' ? 0.1 : o.w / 2)
    for (let y = o.y0 + 0.25; y < top; y += 0.32) b.add('timber', metricBox(o.w * 0.98, 0.05, 0.2), mul(m, mat(u, y, off + 0.1, 0, 0.55)))
  }
  if (o.transom) b.add(fk, metricBox(o.w, 0.12, 0.1), mul(m, mat(u, o.transom, off + 0.06)))
  if (o.sill) b.add(fk, metricBox(o.w + 2 * f + 0.2, 0.12, 0.3), mul(m, mat(u, o.y0 - f - 0.04, off + 0.12)))
}

function column(b: Builder, x: number, z: number, y0: number, h: number, r: number, key = TRIM) {
  b.add(key, metricBox(r * 2.6, 0.3, r * 2.6), mat(x, y0 + 0.15, z))
  b.add(key, new THREE.CylinderGeometry(r * 0.9, r, h - 0.3, 12), mat(x, y0 + 0.3 + (h - 0.3) / 2, z))
  b.add(key, new THREE.CylinderGeometry(r * 1.5, r * 0.9, r * 1.8, 12), mat(x, y0 + h - r * 0.9 - 0.14, z))
  b.add(key, metricBox(r * 3.1, 0.24, r * 3.1), mat(x, y0 + h - 0.12, z))
}

/** Segmental arc points from (−hs, yS) to (hs, yS) through (0, yS + rise); grow offsets the radius. */
function segArc(hs: number, rise: number, yS: number, n = 18, grow = 0) {
  const R = (hs * hs + rise * rise) / (2 * rise)
  const cy = yS + rise - R
  const a0 = Math.asin(hs / R)
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= n; i++) {
    const t = -a0 + (2 * a0 * i) / n
    pts.push(new THREE.Vector2((R + grow) * Math.sin(t), cy + (R + grow) * Math.cos(t)))
  }
  return pts
}

/** Arched (segmental) gable wall in local XY (u, y) + archivolt band; m = wall frame at the outer face. */
function archGable(b: Builder, m: THREE.Matrix4, hs: number, yb: number, yS: number, rise: number, depth = 0.6) {
  const arc = segArc(hs, rise, yS)
  const s = new THREE.Shape([new THREE.Vector2(-hs, yb), new THREE.Vector2(hs, yb), ...arc.slice().reverse()])
  b.add(WALL, extrude(s, depth), mul(m, mat(0, 0, -depth)))
  // archivolt: outer moulding following the gable + inner ring
  const band = (grow: number, w: number, d: number) => {
    const outer = segArc(hs, rise, yS, 24, grow + w / 2)
    const inner = segArc(hs, rise, yS, 24, grow - w / 2).reverse()
    b.add(TRIM, extrude(new THREE.Shape([...outer, ...inner]), d), m)
  }
  band(-0.25, 0.45, 0.22)
  band(-1.0, 0.25, 0.12)
}

/** Half (180°) ring/cylinder/dome pieces for apses: axis angle a points outwards. */
function halfLathe(b: Builder, key: string, cx: number, cz: number, a: number, pts: [number, number][], seg = 16) {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)),
    seg,
    -a,
    Math.PI,
  )
  b.add(key, g, mat(cx, 0, cz))
}

function conch(b: Builder, cx: number, cz: number, a: number, r: number, yTop: number, rise: number, ribs: number) {
  // wall + plinth + eave cornice
  halfLathe(b, WALL, cx, cz, a, [[r, 0], [r, yTop]], 18)
  halfLathe(b, TRIM, cx, cz, a, [[r - 0.05, 0], [r + 0.15, 0], [r + 0.15, FLOOR + 0.8], [r - 0.05, FLOOR + 0.8]], 18)
  halfLathe(b, TRIM, cx, cz, a, [[r - 0.05, yTop - 0.45], [r + 0.2, yTop - 0.45], [r + 0.42, yTop], [r - 0.05, yTop]], 18)
  // half-dome (quarter-ellipse profile) with meridian standing seams
  const R = r + 0.42
  const prof: [number, number][] = []
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    prof.push([R * Math.cos(t), yTop + rise * Math.sin(t)])
  }
  halfLathe(b, ZN, cx, cz, a, prof, 20)
  for (let k = 1; k < ribs; k++) {
    const ph = a - Math.PI / 2 + (k / ribs) * Math.PI
    const d = V(Math.cos(ph), 0, Math.sin(ph))
    for (let i = 0; i < prof.length - 2; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(ZN, V(cx + d.x * (r0 + 0.03), y0, cz + d.z * (r0 + 0.03)), V(cx + d.x * (r1 + 0.03), y1, cz + d.z * (r1 + 0.03)), 0.05, 0.05, d)
    }
  }
}

/** Ornate Orthodox cross: ball, crescent, bars with gilded finials. s = height. Crossbar faces ±X. */
function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.055
  g.add('iron', new THREE.SphereGeometry(s * 0.08, 10, 8), mat(0, s * 0.06, 0))
  g.add('iron', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('iron', metricBox(s * 0.62, t, t), mat(0, s * 0.74, 0))
  g.add('iron', new THREE.TorusGeometry(s * 0.15, t * 0.45, 6, 12, Math.PI), mat(0, s * 0.33, 0, 0, 0, Math.PI))
  for (const [px, py] of [[0, s], [-s * 0.31, s * 0.74], [s * 0.31, s * 0.74], [0, s * 0.74], [0, s * 0.5]] as [number, number][]) {
    g.add('gilt', new THREE.SphereGeometry(s * 0.05, 8, 6), mat(px, py, 0))
  }
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** Octagonal faceted dome from [circumradius, y] stations + hip ribs. */
function octDome(b: Builder, x: number, z: number, st: [number, number][], ribW: number) {
  helm(b, ZN, { x, z, n: 8, stations: st, phase: Math.PI / 8 })
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4
    for (let i = 0; i < st.length - 1; i++) {
      const p0 = V(x + Math.cos(a) * st[i][0], st[i][1], z + Math.sin(a) * st[i][0])
      const p1 = V(x + Math.cos(a) * st[i + 1][0], st[i + 1][1], z + Math.sin(a) * st[i + 1][0])
      b.beam(ZN, p0, p1, ribW, ribW * 0.8, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- podium, steps ---------------- */
  b.block(TRIM, 49.4, FLOOR, 31.8, (-35.8 + 13.6) / 2, 0, 0)
  b.block(TRIM, 49.8, 0.25, 32.2, (-35.8 + 13.6) / 2, FLOOR - 0.25, 0)
  const nSteps = 17
  const rise = FLOOR / nSteps
  for (let i = 0; i < nSteps; i++) {
    const xa = -35.8 - (i + 1) * 0.34
    b.block(TRIM, 0.34, FLOOR - i * rise, 17.2, xa + 0.17, 0, 0)
  }
  // cheek walls of the stair
  for (const s of [-1, 1]) {
    const cheek = new THREE.Shape([new THREE.Vector2(-35.8, 0), new THREE.Vector2(-42.0, 0), new THREE.Vector2(-42.0, 1.0), new THREE.Vector2(-35.8, FLOOR + 1.0)])
    b.add(TRIM, extrude(cheek, 1.1), mat(0, 0, s > 0 ? 8.6 : -9.7))
    b.block(TRIM, 1.4, FLOOR + 1.35, 1.4, -35.8 - 0.7, 0, s * 9.15)
  }

  /* ---------------- pronaos ---------------- */
  {
    const { x0, x1, hw, top } = P
    const pw = 7.8 // half width of the open porch
    // front wall (west face) with the three porch arches
    const fs = new THREE.Shape([new THREE.Vector2(-hw, FLOOR), new THREE.Vector2(hw, FLOOR), new THREE.Vector2(hw, top), new THREE.Vector2(-hw, top)])
    for (const u of [-5.2, 0, 5.2]) fs.holes.push(new THREE.Path(opening('round', 3.6, 7.4, u, FLOOR, 14)))
    b.add(WALL, extrude(fs, 0.8), faceFrame('-x', x0 + 0.8, 0, 0, 0))
    // porch side blocks, block over the porch, main block
    for (const s of [-1, 1]) b.block(WALL, 4.2, top - FLOOR, hw - pw, -32.1, FLOOR, s * (pw + (hw - pw) / 2))
    b.block(WALL, 4.2, top - FLOOR - 7.6, 2 * pw, -32.1, FLOOR + 7.6, 0)
    b.block(WALL, x1 - (x0 + 4.8), top - FLOOR, 2 * hw, (x0 + 4.8 + x1) / 2, FLOOR, 0)
    // porch back wall: door + icons
    const back = faceFrame('-x', x0 + 4.8, 0, 0, 0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.3, 4.4, 0, FLOOR, 10))), mul(back, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 2.3, 4.4, 0.3, 0, FLOOR), 0.15), mul(back, mat(0, 0, 0.01)))
    for (const u of [-5.2, 5.2]) op(b, back, { u, w: 1.6, h: 2.6, y0: FLOOR + 1.5, glass: 'icon', type: 'round' })
    // shaded porch interior (back wall, ceiling, side walls)
    b.block('vShade', 0.04, 7.6, 2 * pw, x0 + 4.78, FLOOR, 0)
    b.block('vShade', 4.0, 0.04, 2 * pw, x0 + 2.8, FLOOR + 7.56, 0)
    for (const s of [-1, 1]) b.block('vShade', 4.0, 7.6, 0.04, x0 + 2.8, FLOOR, s * (pw - 0.02))
    // plinth, string course, cornice
    b.block(TRIM, x1 - x0 + 0.24, 0.8, 2 * hw + 0.24, (x0 + x1) / 2, FLOOR, 0)
    b.block(TRIM, x1 - x0 + 0.5, 0.38, 2 * hw + 0.5, (x0 + x1) / 2 - 0.12, P.string, 0)
    b.block(TRIM, x1 - x0 + 0.4, 0.45, 2 * hw + 0.4, (x0 + x1) / 2 - 0.1, top - 0.75, 0)
    b.block(TRIM, x1 - x0 + 1.2, 0.3, 2 * hw + 1.2, (x0 + x1) / 2 - 0.3, top - 0.3, 0)
    // porch columns (paired between the arches, single at the porch ends) and corner half-columns
    const colX = x0 - 0.28
    for (const zc of [-2.6, 2.6]) for (const d of [-0.42, 0.42]) column(b, colX, zc + d, FLOOR, 5.6, 0.3)
    for (const s of [-1, 1]) {
      column(b, colX, s * (pw - 0.5), FLOOR, 5.6, 0.3)
      column(b, x0 - 0.05, s * (hw - 0.45), FLOOR + 0.9, P.string - FLOOR - 0.9, 0.4)
      column(b, x0 + 0.5, s * (hw + 0.05), FLOOR + 0.9, P.string - FLOOR - 0.9, 0.4)
      // flanking blind arches with mosaic icons
      op(b, faceFrame('-x', x0, 0, 0, 0), { u: s * 11.4, w: 2.3, h: 4.4, y0: FLOOR + 1.5, glass: 'icon', frame: 0.26, arch2: 0.35 })
    }
    // arch archivolts on the porch
    for (const u of [-5.2, 0, 5.2]) b.add(TRIM, extrude(frameShape('round', 3.6, 7.4, 0.3, u, FLOOR), 0.12), mul(faceFrame('-x', x0, 0, 0, 0), mat(0, 0, 0.01)))
    // upper storey, west: four arched windows + central icon window
    const fw = faceFrame('-x', x0, 0, 0, 0)
    for (const u of [-10.9, -5.2, 5.2, 10.9]) op(b, fw, { u, w: 1.0, h: 2.2, y0: 13.8, frame: 0.16, sill: true })
    op(b, fw, { u: 0, w: 2.1, h: 3.9, y0: 13.0, glass: 'icon', frame: 0.22 })
    // raised segmental arch of the cornice over the central bay
    const arcM = mul(fw, mat(0, 0, -0.3))
    const tymp = segArc(3.4, 1.6, top - 0.3, 18)
    b.add(WALL, extrude(new THREE.Shape([new THREE.Vector2(-3.4, top - 0.75), new THREE.Vector2(3.4, top - 0.75), ...tymp.slice().reverse()]), 0.6), arcM)
    const outer = segArc(3.4, 1.6, top - 0.3, 24, 0.35)
    const inner = segArc(3.4, 1.6, top - 0.3, 24, -0.1).reverse()
    b.add(TRIM, extrude(new THREE.Shape([...outer, ...inner]), 0.95), arcM)
    orthoCross(b, x0 - 0.1, top + 1.65, 0, 1.6)
    // side façades (±z): ground-floor tall arched windows, side door, upper windows
    for (const face of ['+z', '-z'] as const) {
      const sgn = face === '+z' ? 1 : -1
      const u = (x: number) => sgn * x // facade-local u for world x
      for (const x of [-27.6, -23.4, -19.6]) window2(b, face, sgn * hw, u(x), FLOOR + 2.0, 1.15, 4.6)
      for (const x of [-31.6, -27.6, -23.4, -19.6]) op(b, faceFrame(face, sgn * hw, 0, 0, 0), { u: u(x), w: 1.0, h: 2.2, y0: 13.8, frame: 0.16, sill: true })
      // side door with columns
      const fd = faceFrame(face, sgn * hw, 0, 0, 0)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.3, 4.6, u(-31.6), FLOOR, 10))), mul(fd, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 2.3, 4.6, 0.28, u(-31.6), FLOOR), 0.15), mul(fd, mat(0, 0, 0.01)))
      for (const dx of [-1.75, 1.75]) column(b, -31.6 + dx, sgn * (hw + 0.3), FLOOR, 4.3, 0.24)
      // corner pilaster at the east end
      b.block(TRIM, 1.0, top - FLOOR - 0.8, 0.2, x1 - 0.6, FLOOR, sgn * (hw + 0.1))
    }
    // low hipped zinc roof
    hippedRoof(b, ZN, { x: (x0 + x1) / 2 - 0.2, z: 0, w: x1 - x0 + 0.4, d: 2 * hw + 0.6, y: top, pitch: 14, overhang: 0.25, seams: SEAM })
  }

  /* ---------------- naos: corner bays ---------------- */
  for (const [cx, cz] of SMALL) {
    const x0 = cx < 0 ? N.x0 : N.xb
    const x1 = cx < 0 ? N.xa : N.x1
    const z0 = cz < 0 ? -N.hw : N.za
    const z1 = cz < 0 ? -N.za : N.hw
    const mx = (x0 + x1) / 2
    const mz = (z0 + z1) / 2
    b.block(WALL, x1 - x0, N.bayTop - FLOOR, z1 - z0, mx, FLOOR, mz)
    b.block(TRIM, x1 - x0 + 0.24, 0.8, z1 - z0 + 0.24, mx, FLOOR, mz)
    b.block(TRIM, x1 - x0 + 0.4, 0.4, z1 - z0 + 0.4, mx, N.spring - 0.4, mz)
    b.block(TRIM, x1 - x0 + 0.5, 0.35, z1 - z0 + 0.5, mx, N.bayTop - 0.5, mz)
    b.block(TRIM, x1 - x0 + 0.9, 0.22, z1 - z0 + 0.9, mx, N.bayTop - 0.15, mz)
    b.block(ZN, x1 - x0 + 0.6, 0.12, z1 - z0 + 0.6, mx, N.bayTop + 0.07, mz)
    // outer side face (±z): two tiers of tall arched windows + blind arch at the top
    const sf = cz < 0 ? '-z' : '+z'
    const su = cz < 0 ? -1 : 1
    const fm = faceFrame(sf, su * N.hw, 0, 0, 0)
    op(b, fm, { u: su * cx, w: 1.5, h: 4.6, y0: 7.0, frame: 0.2, arch2: 0.3, sill: true })
    op(b, fm, { u: su * cx, w: 1.5, h: 4.8, y0: 18.6, frame: 0.2, arch2: 0.3, sill: true })
    b.add(TRIM, extrude(frameShape('round', 5.6, 4.2, 0.28, su * cx, N.spring + 0.0), 0.16), mul(fm, mat(0, 0, 0.01)))
    // end face (west faces above the pronaos roof / east faces above the side bays)
    const ef = cx < 0 ? '-x' : '+x'
    const plane = cx < 0 ? N.x0 : N.x1
    const eu = cx < 0 ? cz : -cz
    const em = faceFrame(ef, plane, 0, 0, 0)
    op(b, em, { u: eu, w: 1.3, h: 3.0, y0: 22.8, frame: 0.18, arch2: 0.3, sill: true })
    b.add(TRIM, extrude(frameShape('round', 5.4, 4.0, 0.26, eu, N.spring), 0.16), mul(em, mat(0, 0, 0.01)))
  }

  /* ---------------- naos: arms with barrel roofs and arched gables ---------------- */
  const armTop = N.spring
  // west & east arms (barrels along X)
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? N.x0 : N.xb
    const x1 = s < 0 ? N.xa : N.x1
    b.block(WALL, x1 - x0, armTop - FLOOR, 2 * N.za, (x0 + x1) / 2, FLOOR, 0)
    b.block(TRIM, x1 - x0, 0.42, 2 * N.za + 0.6, (x0 + x1) / 2, armTop - 0.42, 0)
    const bx0 = s < 0 ? N.x0 - 0.15 : N.xb - 1.0
    const bx1 = s < 0 ? N.xa + 1.0 : N.x1 + 0.15
    barrelRoof(b, ZN, { x: (bx0 + bx1) / 2, z: 0, w: bx1 - bx0 - 0.3, d: 2 * N.za, y: armTop, rise: N.rise, segs: 14, seams: SEAM, overhang: 0.3 })
    const gm = faceFrame(s < 0 ? '-x' : '+x', s < 0 ? N.x0 : N.x1, 0, 0, 0)
    archGable(b, gm, N.za, armTop - 0.6, armTop, N.rise)
    orthoCross(b, s < 0 ? N.x0 - 0.2 : N.x1 + 0.2, armTop + N.rise + 0.25, 0, 1.8)
  }
  // west gable: three small windows in the tympanum (photo 04)
  {
    const wm = faceFrame('-x', N.x0, 0, 0, 0)
    for (const u of [-1.3, 0, 1.3]) op(b, wm, { u, w: 0.8, h: 2.0, y0: 24.0, frame: 0.12 })
    op(b, wm, { u: 0, w: 0.9, h: 1.0, y0: 21.4, type: 'rect', glass: 'icon', frame: 0.1 })
  }
  // north & south arms (barrels along Z)
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? -N.hw : N.za
    const z1 = s < 0 ? -N.za : N.hw
    const xm = (N.xa + N.xb) / 2
    b.block(WALL, N.xb - N.xa, armTop - FLOOR, z1 - z0, xm, FLOOR, (z0 + z1) / 2)
    b.block(TRIM, N.xb - N.xa + 0.24, 0.8, z1 - z0 + 0.24, xm, FLOOR, (z0 + z1) / 2)
    b.block(TRIM, N.xb - N.xa + 0.6, 0.42, z1 - z0, xm, armTop - 0.42, (z0 + z1) / 2)
    const sub = new Builder()
    const len = N.hw - 6.0 + 0.15
    barrelRoof(sub, ZN, { x: 0, z: 0, w: len - 0.3, d: N.xb - N.xa, y: armTop, rise: N.rise, segs: 14, seams: SEAM, overhang: 0.3 })
    b.merge(sub, mat(xm, 0, s * (6.0 + len / 2), Math.PI / 2))
    const face = s < 0 ? '-z' : '+z'
    const gm = faceFrame(face, s * N.hw, 0, 0, 0)
    archGable(b, faceFrame(face, s * N.hw, s * xm, 0, 0), (N.xb - N.xa) / 2, armTop - 0.6, armTop, N.rise)
    // tall window in the gable arm + windows beside the porch
    const u = s * xm
    op(b, gm, { u, w: 2.3, h: 9.0, y0: 13.6, frame: 0.24, arch2: 0.35, transom: 19.0, sill: true })
    for (const du of [-4.6, 4.6]) op(b, gm, { u: u + du, w: 1.1, h: 3.6, y0: FLOOR + 2.4, frame: 0.16, sill: true })
    orthoCross(b, xm, armTop + N.rise + 0.25, s * (N.hw + 0.2), 1.8)
    // low side porch (photo 05)
    const pz0 = N.hw
    const pz1 = N.hw + 2.8
    const ph = 7.2
    b.block(WALL, 7.0, ph, pz1 - pz0, xm, FLOOR, s * (pz0 + pz1) / 2)
    b.block(TRIM, 7.4, 0.35, pz1 - pz0 + 0.4, xm, FLOOR + ph - 0.35, s * (pz0 + pz1) / 2)
    hippedRoof(b, ZN, { x: xm, z: s * ((pz0 + pz1) / 2 - 0.1), w: 7.4, d: pz1 - pz0 + 0.2, y: FLOOR + ph, pitch: 16, overhang: 0.2, seams: SEAM })
    const pm = faceFrame(face, s * pz1, 0, 0, 0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.4, 4.6, u, FLOOR, 10))), mul(pm, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 2.4, 4.6, 0.3, u, FLOOR), 0.16), mul(pm, mat(0, 0, 0.01)))
    for (const du of [-2.3, 2.3]) column(b, xm + du * s, s * (pz1 + 0.3), FLOOR, 5.2, 0.26)
  }

  /* ---------------- main tower ---------------- */
  // square plinth in two steps
  b.block(WALL, 13, DRUM.y0 - 1.8 - 26, 13, TX, 26, 0)
  b.block(TRIM, 13.5, 0.4, 13.5, TX, DRUM.y0 - 2.2, 0)
  b.block(WALL, 12.2, 1.8, 12.2, TX, DRUM.y0 - 1.8, 0)
  b.block(TRIM, 12.6, 0.3, 12.6, TX, DRUM.y0 - 0.3, 0)
  // octagonal drum
  prism(b, WALL, { x: TX, n: 8, r: DRUM.r, y0: DRUM.y0, h: DRUM.y1 - DRUM.y0 })
  ringBand(b, TRIM, { x: TX, n: 8, r: DRUM.r, y: DRUM.y0, h: 0.5, grow: 0.12 })
  const ap = DRUM.r * Math.cos(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    const m = wallAt(TX + Math.cos(a) * ap, Math.sin(a) * ap, a)
    const y0 = DRUM.y0
    b.add(WALL, extrude(frameShape('round', 3.1, 8.2, 0.24, 0, y0 + 0.8), 0.2), m)
    b.add(WALL, extrude(frameShape('round', 2.3, 7.5, 0.22, 0, y0 + 1.0), 0.12), m)
    op(b, m, { w: 1.15, h: 6.3, y0: y0 + 1.3, frame: 0.12, frameKey: TRIM, transom: y0 + 5.6, off: 0.02 })
    // corner colonnettes with capitals
    const av = a + Math.PI / 8
    const cx = TX + Math.cos(av) * (DRUM.r + 0.06)
    const cz = Math.sin(av) * (DRUM.r + 0.06)
    b.rod(TRIM, V(cx, DRUM.y0 + 0.5, cz), V(cx, DRUM.y0 + 7.0, cz), 0.19, 10)
    b.add(TRIM, new THREE.CylinderGeometry(0.33, 0.2, 0.55, 10), mat(cx, DRUM.y0 + 7.25, cz))
  }
  ringBand(b, TRIM, { x: TX, n: 8, r: DRUM.r, y: DRUM.y1 - 0.15, h: 0.4, grow: 0.22 })
  ringBand(b, TRIM, { x: TX, n: 8, r: DRUM.r, y: DRUM.y1 + 0.25, h: 0.42, grow: 0.62 })
  const dY = DRUM.y1 + 0.67
  octDome(
    b,
    TX,
    0,
    [
      [6.95, dY],
      [7.05, dY + 0.22],
      [6.75, dY + 0.75],
      [6.2, dY + 1.6],
      [5.2, dY + 2.6],
      [3.8, dY + 3.65],
      [2.2, dY + 4.35],
      [0.9, dY + 4.75],
      [0.32, dY + 4.9],
    ],
    0.14,
  )
  b.add(ZN, new THREE.LatheGeometry([new THREE.Vector2(0.36, 0), new THREE.Vector2(0.5, 0.25), new THREE.Vector2(0.42, 0.55), new THREE.Vector2(0.18, 0.75), new THREE.Vector2(0.12, 1.1)], 12), mat(TX, dY + 4.85, 0))
  orthoCross(b, TX, dY + 5.8, 0, 4.6)

  /* ---------------- four small towers ---------------- */
  for (const [cx, cz] of SMALL) {
    b.block(WALL, ST.base, ST.yb - ST.y0, ST.base, cx, ST.y0, cz)
    b.block(TRIM, ST.base + 0.35, 0.3, ST.base + 0.35, cx, ST.yb - 0.3, cz)
    prism(b, WALL, { x: cx, z: cz, n: 8, r: ST.r, y0: ST.yb, h: ST.y1 - ST.yb })
    ringBand(b, TRIM, { x: cx, z: cz, n: 8, r: ST.r, y: ST.yb, h: 0.35, grow: 0.1 })
    const sap = ST.r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(cx + Math.cos(a) * sap, cz + Math.sin(a) * sap, a)
      op(b, m, { w: 1.2, h: 3.5, y0: 34.4, glass: 'black', frame: 0.14, arch2: 0.12, louvres: true, off: 0.02 })
      const av = a + Math.PI / 8
      const px = cx + Math.cos(av) * (ST.r + 0.04)
      const pz = cz + Math.sin(av) * (ST.r + 0.04)
      b.rod(TRIM, V(px, ST.yb + 0.3, pz), V(px, 37.6, pz), 0.12, 8)
    }
    ringBand(b, TRIM, { x: cx, z: cz, n: 8, r: ST.r, y: ST.y1 - 0.1, h: 0.35, grow: 0.15 })
    ringBand(b, TRIM, { x: cx, z: cz, n: 8, r: ST.r, y: ST.y1 + 0.25, h: 0.3, grow: 0.42 })
    const sy = ST.y1 + 0.55
    octDome(
      b,
      cx,
      cz,
      [
        [3.6, sy],
        [3.66, sy + 0.12],
        [3.45, sy + 0.45],
        [3.0, sy + 1.0],
        [2.3, sy + 1.55],
        [1.4, sy + 2.0],
        [0.55, sy + 2.28],
        [0.18, sy + 2.36],
      ],
      0.09,
    )
    b.add(ZN, new THREE.CylinderGeometry(0.1, 0.22, 0.6, 10), mat(cx, sy + 2.6, cz))
    orthoCross(b, cx, sy + 2.85, cz, 2.6)
  }

  /* ---------------- east end ---------------- */
  {
    // sanctuary bay (barrel along X) + main apse
    const sx0 = N.x1
    const sx1 = 26
    const sTop = 21.5
    const sRise = 3.6
    b.block(WALL, sx1 - sx0, sTop, 2 * N.za, (sx0 + sx1) / 2, 0, 0)
    b.block(TRIM, sx1 - sx0, 0.4, 2 * N.za + 0.6, (sx0 + sx1) / 2, sTop - 0.4, 0)
    barrelRoof(b, ZN, { x: (sx0 + sx1) / 2 + 0.2, z: 0, w: sx1 - sx0 + 0.1, d: 2 * N.za, y: sTop, rise: sRise, segs: 14, seams: SEAM, overhang: 0.3 })
    archGable(b, faceFrame('+x', sx1, 0, 0, 0), N.za, sTop - 0.6, sTop, sRise)
    orthoCross(b, sx1 + 0.25, sTop + sRise + 0.2, 0, 1.6)
    conch(b, sx1, 0, 0, 7.0, 18.0, 4.0, 14)
    for (const a of [-60, -30, 0, 30, 60]) {
      const t = (a * Math.PI) / 180
      op(b, wallAt(sx1 + Math.cos(t) * 7.0, Math.sin(t) * 7.0, t), { w: 1.3, h: 5.2, y0: 8.6, frame: 0.18, off: 0.06, sill: true })
      op(b, wallAt(sx1 + Math.cos(t) * 7.0, Math.sin(t) * 7.0, t), { w: 0.9, h: 1.8, y0: 15.0, frame: 0.12, off: 0.06 })
    }
    // twin windows with colonnette on the sanctuary side walls above the side bays (photo 06)
    for (const s of [-1, 1]) {
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * N.za, 0, 0, 0)
      for (const x of [17.0, 21.0]) {
        const u = s * x
        for (const d of [-0.5, 0.5]) op(b, fm, { u: u + d, w: 0.72, h: 2.0, y0: 18.7, frame: 0.1 })
        b.rod(TRIM, V(x, 18.7, s * (N.za + 0.12)), V(x, 20.0, s * (N.za + 0.12)), 0.08, 8)
        b.add(TRIM, extrude(frameShape('round', 2.2, 2.7, 0.16, u, 18.5), 0.1), mul(fm, mat(0, 0, 0.01)))
      }
    }
    // prothesis / diaconicon: lower barrel bays with small conch apses
    for (const s of [-1, 1]) {
      const bx0 = N.x1
      const bx1 = 23
      const z0 = N.za
      const z1 = 14
      const zm = s * (z0 + z1) / 2
      const bTop = 15.5
      const bRise = 2.4
      b.block(WALL, bx1 - bx0, bTop, z1 - z0, (bx0 + bx1) / 2, 0, zm)
      b.block(TRIM, bx1 - bx0, 0.35, z1 - z0 + 0.5, (bx0 + bx1) / 2, bTop - 0.35, zm)
      b.block(TRIM, bx1 - bx0, FLOOR + 0.8, z1 - z0 + 0.24, (bx0 + bx1) / 2, 0, zm)
      barrelRoof(b, ZN, { x: (bx0 + bx1) / 2 + 0.1, z: zm, w: bx1 - bx0 + 0.1, d: z1 - z0, y: bTop, rise: bRise, segs: 12, seams: SEAM, overhang: 0.25 })
      archGable(b, faceFrame('+x', bx1, -zm, 0, 0), (z1 - z0) / 2, bTop - 0.5, bTop, bRise, 0.5)
      conch(b, bx1, zm, 0, 2.9, 12.6, 2.3, 7)
      op(b, wallAt(bx1 + 2.9, zm, 0), { w: 1.0, h: 3.4, y0: 6.8, frame: 0.15, off: 0.05 })
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * z1, 0, 0, 0)
      for (const x of [15.8, 20.2]) op(b, fm, { u: s * x, w: 1.2, h: 3.8, y0: 7.0, frame: 0.16, arch2: 0.25, sill: true })
    }
    // sanctuary side walls beyond the side bays + sanctuary plinth
    b.block(TRIM, sx1 - 23 + 0.1, FLOOR + 0.8, 2 * N.za + 0.24, (23 + sx1) / 2, 0, 0)
  }

  return b
}

/** Tall arched window helper on an axis-aligned façade. */
function window2(b: Builder, face: '+z' | '-z' | '+x' | '-x', plane: number, u: number, y0: number, w: number, h: number) {
  op(b, faceFrame(face, plane, 0, 0, 0), { u, w, h, y0, frame: 0.18, arch2: 0.25, sill: true })
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 52, -4],
  materials: (base) => {
    const zinc = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    zinc.color.set('#aab1b9')
    zinc.metalness = 0.6
    zinc.roughness = 0.5
    return {
      vZinc: zinc,
      vShade: new THREE.MeshStandardMaterial({ color: '#b3ada2', roughness: 0.95 }),
      icon: new THREE.MeshStandardMaterial({ color: '#7b6a4c', roughness: 0.55, metalness: 0.25 }),
    }
  },
  notes:
    'Plan depths, the east end and the north side are interpreted from six ground-level photographs (no aerial view); domes modelled smooth with hip ribs (zinc diamond shingles in reality); total height ≈ 60 m.',
}
export default model
