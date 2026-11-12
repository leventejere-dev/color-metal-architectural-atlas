/**
 * Mănăstirea Bârnova — church „Sfântul Gheorghe” (1626–1629 / 1661–1666),
 * restored 2018–2023; KME copper roofs, tower helms and flashings.
 *
 * Modelling specification derived from the twelve reference photographs (drone
 * views 01–11, ground detail 12) and the OSM outline (37.6 × 13.4 m); real metres,
 * origin = footprint centre at ground, +X = OSM long axis towards the altar (ENE),
 * west front towards −X, +Z = south.
 *  - Moldavian triconch church, ≈ 30 × 12.4 m nave with walls ≈ 11 m: white
 *    plastered walls on an exposed stone socle, two registers of small blind
 *    arched niches (ocnițe) under the eaves above a torus cord, stone-framed
 *    windows with pointed heads, stepped buttresses with sloped copper caps
 *    (photos 04, 05, 06).
 *  - Semicircular altar apse slightly narrower than the nave, shallow lateral
 *    apses at the naos (bulging eaves, photo 06 / top view 03).
 *  - Very wide-eaved hipped roof (≈ 38°) over the west end, half-cone over the
 *    altar apse, cone humps over the lateral apses — dark brown copper with
 *    standing seams (03, 05, 06).
 *  - West tower (≈ 9.2 m square) rising from the pronaos roof: exposed light stone
 *    masonry with slit windows, white plastered frieze below a large flared
 *    bell helm (square with chamfered corners at the eave, round at the top),
 *    onion knob and cross (04, 07, 09).
 *  - Naos tower: cross-gabled square base with a niche frieze, eight-pointed star
 *    base with faceted roofs, white octagonal drum with narrow windows, blind
 *    arcades and niche band, octagonal-to-round flared bell helm (05, 06, 08, 09).
 * Heights (estimated from photo proportions): walls ≈ 11 m, ridge ≈ 16 m, west-tower
 * helm top ≈ 24 m, naos-tower helm top ≈ 26 m (unsourced OSM tags 13 / 23 / 25 m);
 * crosses ≈ 27.5 / 29.7 m.
 * Approximations: niche count and window positions simplified; north side
 * mirrored from the south; buttress layout and the roof intersections around
 * the lateral apses idealised.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, prism, ringBand, hippedRoof, seams, faceFrame } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'bCopper' // KME copper, dark brown as photographed (copperBrown tint)
const WALL = 'plasterWhite'
const CUP = 'bCuPlain' // small copper parts (caps, ribs) without the sheet texture
const STONE = 'bStone'
const FRAME = 'stoneWarm'
const NICHE = 'bNiche'
const SEAM = seams(CU, 0.5, 0.045, 0.045)

const W = { x0: -18.6, x1: 11.5, hw: 6.2, top: 11.0, socle: 1.2, cord: 8.2 }
const PITCH = 38
const T = Math.tan((PITCH * Math.PI) / 180)
const OV = 0.8 // eave overhang
const LIFT = 0.25 // roof planes sit on the cornice
const EAVE = W.top + LIFT - OV * T
const RIDGE = W.top + LIFT + W.hw * T
const APSE = { x: W.x1, r: 5.6 }
const LAT = { x: 5.8, r: 2.4 }
const WT = { x: -13.1, hw: 4.6, top: 17.0, band: 1.1 } // west tower
const NT = { x: 6.9 } // naos tower

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** Stone-framed window: rectangular stone frame around a pointed (or other) light. */
function win(b: Builder, m: THREE.Matrix4, o: { u?: number; w: number; h: number; y0: number; type?: OpeningType; f?: number; off?: number }) {
  const u = o.u ?? 0
  const f = o.f ?? 0.22
  const off = o.off ?? 0
  const type = o.type ?? 'pointed'
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 8))), mul(m, mat(0, 0, off + 0.02)))
  const s = new THREE.Shape(opening('rect', o.w + 2 * f, o.h + 2 * f, u, o.y0 - f))
  s.holes.push(new THREE.Path(opening(type, o.w, o.h, u, o.y0, 8)))
  b.add(FRAME, extrude(s, 0.12, 8), mul(m, mat(0, 0, off)))
}

/** Row of small arched niches along a straight wall frame (local u from u0 to u1). */
function nicheRow(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y0: number, w: number, h: number, step: number, off = 0) {
  const n = Math.floor((u1 - u0) / step)
  const s0 = (u0 + u1) / 2 - ((n - 1) * step) / 2
  for (let i = 0; i < n; i++) b.add(NICHE, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, s0 + i * step, y0, 6))), mul(m, mat(0, 0, off + 0.02)))
}

/** Niches around a circular wall (centre cx, cz, radius r) between angles a0..a1. */
function nicheArc(b: Builder, cx: number, cz: number, r: number, a0: number, a1: number, y0: number, w: number, h: number, step: number) {
  const n = Math.floor((Math.abs(a1 - a0) * r) / step)
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0)
    b.add(NICHE, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 6))), mul(wallAt(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a), mat(0, 0, 0.04)))
  }
}

/** Half-cylinder (apse) wall pieces via a lathe over 180° facing angle a. */
function halfLathe(b: Builder, key: string, cx: number, cz: number, a: number, pts: [number, number][], seg = 20) {
  b.add(key, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)), seg, -a, Math.PI), mat(cx, 0, cz))
}

/** Rounded wall (apse) with socle, cord and niche registers. */
function roundWall(b: Builder, cx: number, cz: number, a: number, r: number) {
  halfLathe(b, WALL, cx, cz, a, [[r, 0], [r, W.top]])
  halfLathe(b, STONE, cx, cz, a, [[r - 0.05, 0], [r + 0.18, 0], [r + 0.18, W.socle], [r + 0.02, W.socle + 0.15], [r - 0.05, W.socle + 0.15]])
  halfLathe(b, WALL, cx, cz, a, [[r - 0.05, W.cord - 0.12], [r + 0.08, W.cord - 0.1], [r + 0.15, W.cord], [r + 0.08, W.cord + 0.1], [r - 0.05, W.cord + 0.12]], 24)
  halfLathe(b, WALL, cx, cz, a, [[r - 0.05, W.top - 0.3], [r + 0.2, W.top - 0.3], [r + 0.2, W.top], [r - 0.05, W.top]], 24)
  nicheArc(b, cx, cz, r, a - Math.PI / 2 + 0.05, a + Math.PI / 2 - 0.05, W.cord + 0.45, 0.42, 0.9, 0.62)
  nicheArc(b, cx, cz, r, a - Math.PI / 2 + 0.05, a + Math.PI / 2 - 0.05, W.cord + 1.65, 0.36, 0.7, 0.62)
}

/** Stepped buttress at ground point p with outward direction n. */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, width = 1.1, depth = 1.5, h = 6.2) {
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(depth, 0),
    new THREE.Vector2(depth, h * 0.55),
    new THREE.Vector2(depth * 0.6, h * 0.66),
    new THREE.Vector2(depth * 0.6, h * 0.86),
    new THREE.Vector2(-0.3, h),
  ])
  const up = V(0, 1, 0)
  const t = V().crossVectors(n, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(n.clone().normalize(), up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(width / 2)))
  b.add(WALL, extrude(prof, width), basis)
  const pt = (sx: number, y: number) => p.clone().add(n.clone().multiplyScalar(sx)).add(V(0, y, 0))
  b.beam(CUP, pt(depth + 0.06, h * 0.55 + 0.05), pt(depth * 0.6 + 0.02, h * 0.66 + 0.05), width + 0.1, 0.07, V(0, 1, 0))
  b.beam(CUP, pt(depth * 0.6 + 0.06, h * 0.86 + 0.05), pt(-0.2, h + 0.05), width + 0.1, 0.07, V(0, 1, 0))
  b.add(STONE, metricBox(depth + 0.25, W.socle + 0.2, width + 0.25), new THREE.Matrix4().makeBasis(n.clone().normalize(), up, t).setPosition(p.clone().add(n.clone().multiplyScalar(depth / 2)).add(V(0, (W.socle + 0.2) / 2, 0))))
}

/**
 * Bell helm ring: blend between a chamfered square / octagon (k = 0) and a circle (k = 1).
 * a = apothem on the axes, diag = apothem on the diagonals.
 */
function helmRing(cx: number, cz: number, a: number, diag: number, k: number, y: number, n = 48) {
  const pts: THREE.Vector3[] = []
  const rr = (a + diag) / 2 / Math.cos(Math.PI / 16)
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * Math.PI * 2
    let rs = Infinity
    for (let j = 0; j < 8; j++) {
      const nj = (j * Math.PI) / 4
      const c = Math.cos(phi - nj)
      if (c > 0.05) rs = Math.min(rs, (j % 2 ? diag : a) / c)
    }
    const r = (1 - k) * rs + k * rr
    pts.push(V(cx + Math.cos(phi) * r, y, cz + Math.sin(phi) * r))
  }
  return pts
}

/** Flared bell helm from stations [apothem, y, roundness]; diagonal apothem = a * dk at k = 0. */
function bellHelm(b: Builder, cx: number, cz: number, st: [number, number, number][], dk: number, ribEvery = 2) {
  const rings = st.map(([a, y, k]) => helmRing(cx, cz, a, a * dk, k, y))
  b.add(CU, loft(rings, { capBottom: true, capTop: true }))
  const n = rings[0].length
  for (let k = 0; k < n; k += ribEvery) {
    for (let i = 0; i < rings.length - 1; i++) {
      const p0 = rings[i][k]
      const p1 = rings[i + 1][k]
      const o0 = V(p0.x - cx, 0, p0.z - cz).normalize().multiplyScalar(0.03)
      const o1 = V(p1.x - cx, 0, p1.z - cz).normalize().multiplyScalar(0.03)
      if (p0.distanceTo(V(cx, p0.y, cz)) < 0.2) continue
      b.beam(CUP, p0.clone().add(o0), p1.clone().add(o1), 0.045, 0.045, o0.clone().normalize())
    }
  }
  return st[st.length - 1][1]
}

/** Onion knob, stem and Moldavian cross with ring. */
function finial(b: Builder, x: number, y: number, z: number, s: number) {
  const knob: [number, number][] = [
    [0.12, 0],
    [0.28, 0.1],
    [0.42, 0.35],
    [0.4, 0.6],
    [0.22, 0.85],
    [0.08, 1.05],
    [0.05, 1.2],
  ]
  b.add(CU, new THREE.LatheGeometry(knob.map(([r, yy]) => new THREE.Vector2(r * s, yy * s)), 16), mat(x, y, z))
  const g = new Builder()
  const c = 2.3 * s
  const t = 0.06 * s
  g.add('iron', metricBox(t, c, t), mat(0, c / 2, 0))
  g.add('iron', metricBox(c * 0.55, t, t), mat(0, c * 0.66, 0))
  g.add('iron', new THREE.TorusGeometry(c * 0.13, t * 0.4, 6, 18), mat(0, c * 0.66, 0))
  for (const [px, py] of [[0, c], [-c * 0.27, c * 0.66], [c * 0.27, c * 0.66]] as [number, number][]) g.add('gilt', new THREE.SphereGeometry(t * 0.9, 8, 6), mat(px, py, 0))
  b.merge(g, mat(x, y + 1.2 * s, z, Math.PI / 2))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave walls ---------------- */
  {
    const { x0, x1, hw, top } = W
    const len = x1 - x0
    const xm = (x0 + x1) / 2
    b.block(WALL, len, top, 2 * hw, xm, 0, 0)
    b.block(STONE, len + 0.36, W.socle, 2 * hw + 0.36, xm, 0, 0)
    b.block(STONE, len + 0.2, 0.15, 2 * hw + 0.2, xm, W.socle, 0)
    b.block(WALL, len + 0.26, 0.24, 2 * hw + 0.26, xm, W.cord - 0.12, 0)
    b.block(WALL, len + 0.4, 0.3, 2 * hw + 0.4, xm, top - 0.3, 0)
    // niche registers on the long sides and the west front
    for (const s of [-1, 1]) {
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * hw, 0, 0, 0)
      const [u0, u1] = s > 0 ? [W.x0 + 0.4, W.x1 - 0.4] : [-(W.x1 - 0.4), -(W.x0 + 0.4)]
      nicheRow(b, fm, u0, u1, W.cord + 0.45, 0.42, 0.9, 0.62)
      nicheRow(b, fm, u0, u1, W.cord + 1.65, 0.36, 0.7, 0.62)
    }
    const fw = faceFrame('-x', x0, 0, 0, 0)
    nicheRow(b, fw, -hw + 0.4, hw - 0.4, W.cord + 0.45, 0.42, 0.9, 0.62)
    nicheRow(b, fw, -hw + 0.4, hw - 0.4, W.cord + 1.65, 0.36, 0.7, 0.62)
    // west front: three stone-framed windows (photo 04)
    for (const u of [-1.6, 0, 1.6]) win(b, fw, { u, w: 0.75, h: 2.0, y0: 5.0 })
    // long sides: windows (pronaos, naos west bay) and the south door
    for (const s of [-1, 1]) {
      const face = s < 0 ? '-z' : '+z'
      const fm = faceFrame(face, s * hw, 0, 0, 0)
      for (const x of [-11.2, -3.6, 1.0]) win(b, fm, { u: s * x, w: 0.8, h: 2.3, y0: 4.6 })
      win(b, fm, { u: s * -6.8, w: 0.5, h: 1.1, y0: 2.2, type: 'round', f: 0.16 })
    }
    {
      const fm = faceFrame('+z', hw, 0, 0, 0)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.15, 2.4, -15.4, 0.3, 10))), mul(fm, mat(0, 0, 0.03)))
      b.add(FRAME, extrude(frameShape('round', 1.15, 2.4, 0.22, -15.4, 0.3), 0.14), mul(fm, mat(0, 0, 0.01)))
      b.block(STONE, 1.8, 0.3, 1.0, -15.4, 0, hw + 0.5)
    }
  }

  /* ---------------- altar apse and lateral apses ---------------- */
  roundWall(b, APSE.x, 0, 0, APSE.r)
  for (const a of [-40, 0, 40]) {
    const t = (a * Math.PI) / 180
    win(b, wallAt(APSE.x + Math.cos(t) * APSE.r, Math.sin(t) * APSE.r, t), { w: 0.6, h: 1.8, y0: 4.8, off: 0.06 })
  }
  for (const s of [-1, 1]) {
    const a = s * (Math.PI / 2)
    roundWall(b, LAT.x, s * W.hw, a, LAT.r)
    win(b, wallAt(LAT.x, s * (W.hw + LAT.r), a), { w: 0.7, h: 2.1, y0: 4.6, off: 0.05 })
    win(b, wallAt(LAT.x, s * (W.hw + LAT.r), a), { w: 0.35, h: 0.7, y0: 1.8, type: 'round', f: 0.12, off: 0.05 })
  }

  /* ---------------- buttresses ---------------- */
  for (const s of [-1, 1]) {
    for (const x of [-8.3, 2.6]) buttress(b, V(x, 0, s * W.hw), V(0, 0, s))
    // west corners: pair of orthogonal buttresses
    buttress(b, V(W.x0, 0, s * (W.hw - 0.6)), V(-1, 0, 0), 1.2, 1.6, 6.6)
    buttress(b, V(W.x0 + 0.6, 0, s * W.hw), V(0, 0, s), 1.2, 1.6, 6.6)
    // apse junction and apse flanks
    buttress(b, V(W.x1 + 0.1, 0, s * (W.hw - 0.2)), V(0.6, 0, s * 0.8).normalize(), 1.0, 1.3, 6.0)
    const t = s * (65 * Math.PI) / 180
    buttress(b, V(APSE.x + Math.cos(t) * APSE.r, 0, Math.sin(t) * APSE.r), V(Math.cos(t), 0, Math.sin(t)), 1.0, 1.3, 6.0)
  }
  buttress(b, V(APSE.x + APSE.r, 0, 0), V(1, 0, 0), 1.1, 1.4, 6.0)

  /* ---------------- roofs ---------------- */
  {
    const xe0 = W.x0 - OV
    const ze = W.hw + OV
    const xr0 = xe0 + ze // hip apex (west)
    const xr1 = APSE.x
    // long slopes
    facet(b, CU, [V(xe0, EAVE, ze), V(xr1, EAVE, ze), V(xr1, RIDGE, 0), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.14 })
    facet(b, CU, [V(xr1, EAVE, -ze), V(xe0, EAVE, -ze), V(xr0, RIDGE, 0), V(xr1, RIDGE, 0)], { seams: SEAM, thickness: 0.14 })
    // west hip
    facet(b, CU, [V(xe0, EAVE, -ze), V(xe0, EAVE, ze), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.14 })
    b.beam(CU, V(xr0, RIDGE + 0.06, 0), V(xr1, RIDGE + 0.06, 0), 0.26, 0.14)
    for (const s of [-1, 1]) b.beam(CU, V(xe0, EAVE + 0.04, s * ze), V(xr0, RIDGE + 0.04, 0), 0.22, 0.12)
    // half-cone over the altar apse (eave radius = nave eave half-width)
    const n = 14
    const apex = V(APSE.x, RIDGE, 0)
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i / n) * Math.PI
      const a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI
      const p0 = V(APSE.x + Math.cos(a0) * ze, EAVE, Math.sin(a0) * ze)
      const p1 = V(APSE.x + Math.cos(a1) * ze, EAVE, Math.sin(a1) * ze)
      facet(b, CU, [p0, p1, apex], { seams: SEAM, thickness: 0.14 })
    }
    // eave soffit edge (dark fascia)
    // cone humps over the lateral apses
    for (const s of [-1, 1]) {
      const re = LAT.r + OV + 0.3
      const ya = EAVE + re * Math.tan((25 * Math.PI) / 180)
      const ap = V(LAT.x, ya, s * W.hw)
      const m = 8
      for (let i = 0; i < m; i++) {
        const a0 = s * (Math.PI / 2) - Math.PI / 2 + (i / m) * Math.PI
        const a1 = s * (Math.PI / 2) - Math.PI / 2 + ((i + 1) / m) * Math.PI
        const p0 = V(LAT.x + Math.cos(a0) * re, EAVE, s * W.hw + Math.sin(a0) * re)
        const p1 = V(LAT.x + Math.cos(a1) * re, EAVE, s * W.hw + Math.sin(a1) * re)
        facet(b, CU, [p0, p1, ap], { seams: SEAM, thickness: 0.12 })
      }
    }
  }

  /* ---------------- west tower ---------------- */
  {
    const { x, hw, top, band } = WT
    b.block(STONE, 2 * hw, top - 9.5, 2 * hw, x, 9.5, 0)
    b.block(WALL, 2 * hw + 0.04, band, 2 * hw + 0.04, x, top, 0)
    b.block(WALL, 2 * hw + 0.2, 0.18, 2 * hw + 0.2, x, top + band - 0.18, 0)
    // slit windows and an arched opening on each face
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face === '+x' ? x + hw : face === '-x' ? x - hw : face === '+z' ? hw : -hw
      const off = face.endsWith('x') ? 0 : face === '+z' ? x : -x
      const fm = faceFrame(face, plane, 0, 0, 0)
      for (const du of [-1.6, -0.55, 0.55, 1.6]) b.add('black', new THREE.PlaneGeometry(0.16, 0.8), mul(fm, mat(off + du, top - 0.75, 0.02)))
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 1.5, off, top - 3.6, 8))), mul(fm, mat(0, 0, 0.02)))
      b.add(WALL, extrude(frameShape('round', 0.75, 1.5, 0.14, off, top - 3.6), 0.08, 8), mul(fm, mat(0, 0, 0.0)))
    }
    const y0 = top + band
    const a = hw + 0.45
    const H = 6.0
    const prof: [number, number, number][] = [
      [1.0, 0, 0],
      [0.86, 0.035, 0.04],
      [0.76, 0.1, 0.15],
      [0.7, 0.2, 0.35],
      [0.675, 0.32, 0.6],
      [0.67, 0.45, 0.85],
      [0.65, 0.57, 1],
      [0.58, 0.69, 1],
      [0.46, 0.8, 1],
      [0.3, 0.9, 1],
      [0.13, 0.97, 1],
      [0.03, 1.0, 1],
    ]
    const tip = bellHelm(b, x, 0, prof.map(([r, y, k]) => [r * a, y0 + y * H, k] as [number, number, number]), 1.33)
    finial(b, x, tip - 0.05, 0, 1.0)
  }

  /* ---------------- naos tower ---------------- */
  {
    const x = NT.x
    // square cross-gabled base with niche frieze
    const bw = 7.2
    const bTop = RIDGE + 0.3
    b.block(WALL, bw, bTop - 10.5, bw, x, 10.5, 0)
    b.block(WALL, bw + 0.3, 0.22, bw + 0.3, x, bTop - 0.5, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face === '+x' ? x + bw / 2 : face === '-x' ? x - bw / 2 : face === '+z' ? bw / 2 : -bw / 2
      const off = face.endsWith('x') ? 0 : face === '+z' ? x : -x
      const fm = faceFrame(face, plane, 0, 0, 0)
      nicheRow(b, fm, off - bw / 2 + 0.3, off + bw / 2 - 0.3, bTop - 1.3, 0.34, 0.75, 0.55)
    }
    hippedRoof(b, CU, { x, z: 0, w: bw, d: bw, y: bTop, pitch: 28, overhang: 0.5, seams: SEAM })
    // eight-pointed star base with faceted roof
    const starRing = (ro: number, ri: number, y: number) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? ri : ro
        const a = Math.PI / 8 + (i * Math.PI) / 8
        pts.push(V(x + Math.cos(a) * r, y, Math.sin(a) * r))
      }
      return pts
    }
    const s1 = bTop + 1.1
    b.add(WALL, loft([starRing(3.6, 2.75, bTop), starRing(3.6, 2.75, s1)], { capTop: true, flat: true }))
    b.add(CU, loft([starRing(3.95, 3.0, s1 - 0.05), starRing(2.95, 2.55, s1 + 0.75)], { capTop: true, flat: true }))
    // octagonal drum
    const r = 2.85
    const d0 = s1 + 0.4
    const d1 = d0 + 3.6
    prism(b, WALL, { x, n: 8, r, y0: d0, h: d1 - d0 })
    const ap = r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(x + Math.cos(a) * ap, Math.sin(a) * ap, a)
      b.add(WALL, extrude(frameShape('round', 1.25, 2.3, 0.14, 0, d0 + 0.35), 0.1, 8), m)
      if (k % 2 === 0) win(b, m, { w: 0.42, h: 1.25, y0: d0 + 0.7, type: 'round', f: 0.15, off: 0.02 })
      else b.add(NICHE, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.25, 2.3, 0, d0 + 0.35, 8))), mul(m, mat(0, 0, 0.015)))
      nicheRow(b, m, -0.9, 0.9, d1 - 1.05, 0.3, 0.62, 0.55, 0.01)
    }
    ringBand(b, WALL, { x, n: 8, r, y: d1 - 1.3, h: 0.14, grow: 0.06 })
    ringBand(b, WALL, { x, n: 8, r, y: d1 - 0.25, h: 0.25, grow: 0.12 })
    const a = r * Math.cos(Math.PI / 8) + 0.55
    const H = 4.4
    const prof: [number, number, number][] = [
      [1.0, 0, 0],
      [0.86, 0.035, 0.04],
      [0.76, 0.1, 0.15],
      [0.7, 0.2, 0.35],
      [0.675, 0.32, 0.6],
      [0.67, 0.45, 0.85],
      [0.65, 0.57, 1],
      [0.58, 0.69, 1],
      [0.46, 0.8, 1],
      [0.3, 0.9, 1],
      [0.13, 0.97, 1],
      [0.04, 1.0, 1],
    ]
    const tip = bellHelm(b, x, 0, prof.map(([rr, y, k]) => [rr * a, d1 + y * H, k] as [number, number, number]), 1.0)
    finial(b, x, tip - 0.05, 0, 1.1)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-13.1, 20.5, -3],
  materials: (base) => {
    const cu = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    cu.color.set('#8e8486')
    cu.metalness = 0.75
    cu.roughness = 0.5
    return {
      bCopper: cu,
      bCuPlain: new THREE.MeshStandardMaterial({ color: '#3e2e29', metalness: 0.2, roughness: 0.7 }),
      bStone: new THREE.MeshStandardMaterial({ color: '#b5afa2', roughness: 0.95 }),
      bNiche: new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.95 }),
    }
  },
  notes: 'Proportions scaled from drone photographs and the OSM outline; wall and tower heights estimated (OSM 13 / 23 / 25 m); niche registers, windows and buttresses simplified; north side mirrored.',
}
export default model
