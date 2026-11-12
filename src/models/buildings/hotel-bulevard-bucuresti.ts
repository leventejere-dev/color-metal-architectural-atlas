/**
 * Grand Hôtel du Boulevard (Corinthia Grand Hotel du Boulevard), Bucharest —
 * Bd. Regina Elisabeta 21 / Calea Victoriei, OSM way 137689140. Four-storey
 * neoclassical hotel with a mansard roof, five domes and a tall central
 * pavilion roof; restored roofs in coloured titanium-zinc (elZinc Rainbow Brown).
 *
 * Modelling specification (real metres, origin = centre of the OSM bounding
 * box, +X = OSM long axis flipped to 268.7° (west, towards Str. Alexandru
 * Beldiman), +Z = 358.7° = north = the boulevard façade):
 *  - Plan = OSM outline (63 × 27.5 m) with the Calea Victoriei corner rounded
 *    as a rotunda (R ≈ 5.5 m; three window bays round the curve, photos 02, 04)
 *    and the south-east corner rounded (R ≈ 3.5 m); rear light court (notch)
 *    as in OSM.
 *  - Boulevard façade (photo 03, ≈ 24.8 px/m used for the bay layout):
 *    rotunda 6.3 m | east wing 5 bays | pavilion 1 bay | central risalit
 *    3 bays | pavilion 1 bay | west wing 5 bays | west corner pavilion 2 bays.
 *  - Heights (photo 03, OSM height 26 m): ground floor with tall openings and
 *    channelled rustication to ≈ 5.8 m; first floor windows with triangular
 *    pediments, second floor with cornices, third floor plain; frieze and
 *    modillion cornice to ≈ 19.8 m; mansard with arched dormers to ≈ 23.1 m.
 *  - Central pavilion roof (≈ 16 × 12.5 m, top ≈ 25.6 m) with iron cresting,
 *    clock attic over the risalit, segmental gables and small domes on the two
 *    flanking pavilions; balconies with iron railings on the risalit and round
 *    the rotunda; entrance marquee.
 *  - Domes: large bell dome with lantern on the rotunda behind a curved attic
 *    (≈ 31 m with the spike), smaller domes on the south-east corner and on the
 *    west corner pavilion; all roofs, domes and dormers in coloured
 *    titanium-zinc, dark brown as in the 2026 photograph (01), standing seams
 *    0.5 m / dome ribs.
 * Approximations: the west (Str. Beldiman), south and light-court elevations
 * are not photographed (window rhythm repeated, rear plain); dome profiles,
 * lantern sizes, central roof depth and dormer counts estimated; ornament,
 * statues and capitals simplified; signage omitted. The copper also listed for
 * the works cannot be located in the photographs and is not shown separately.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, lathe, prismOutline, truncatedHip, dome, helm, seams, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

const OUT: P2[] = [
  [31.51, 13.77], [-23.45, 13.58], [-24.41, 13.49], [-25.34, 13.23], [-26.22, 12.82], [-27.0, 12.26], [-27.68, 11.56], [-28.23, 10.77],
  [-28.62, 9.88], [-28.86, 8.95], [-31.6, -8.17], [-31.61, -9.18], [-31.34, -10.15], [-30.8, -11.0], [-30.04, -11.66], [-29.13, -12.08],
  [-28.13, -12.22], [-10.52, -12.16], [-10.62, -3.71], [13.98, -3.75], [13.87, -13.73], [31.51, -13.77],
]
const N = OUT.length
const STREET = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21])
const NE = { x: -23.43, z: 8.08, r: 5.5, a0: 1.574, a1: 2.98 } // rotunda (Calea Victoriei corner)
const SE = { x: -28.14, z: -8.72, r: 3.5 }
const MID0 = (OUT[0][0] + OUT[1][0]) / 2 // boulevard façade frame origin (x)

/* heights */
const GF = 5.8
const ARCHI = 17.45
const EAVE = 19.8
const MAN_RISE = 3.3
const MAN_IN = MAN_RISE / Math.tan((70 * Math.PI) / 180)
const DECK = EAVE + MAN_RISE

const RB = 'hbZinc' // elZinc Rainbow Brown (palette zinc re-coloured)
const SEAM = seams(RB, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function edgeFrame(i: number) {
  const a = OUT[i]
  const c = OUT[(i + 1) % N]
  const dx = c[0] - a[0]
  const dz = c[1] - a[1]
  const L = Math.hypot(dx, dz)
  const n = V(dz / L, 0, -dx / L)
  const m = new THREE.Matrix4().makeBasis(V(-dx / L, 0, -dz / L), V(0, 1, 0), n)
  m.setPosition((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2)
  return { m, len: L, n }
}
/** Frame on a circle (centre x,z, radius r) at angle t (x = cos, z = sin): x right, y up, z outward. */
function circFrame(x: number, z: number, r: number, t: number) {
  const m = new THREE.Matrix4().makeBasis(V(Math.sin(t), 0, -Math.cos(t)), V(0, 1, 0), V(Math.cos(t), 0, Math.sin(t)))
  m.setPosition(x + Math.cos(t) * r, 0, z + Math.sin(t) * r)
  return m
}
function offsetPoly(poly: P2[], d: number[]): P2[] {
  const n = poly.length
  const lines = poly.map((a, i) => {
    const c = poly[(i + 1) % n]
    const dx = c[0] - a[0]
    const dz = c[1] - a[1]
    const L = Math.hypot(dx, dz)
    return { p: [a[0] + (dz / L) * d[i], a[1] - (dx / L) * d[i]] as P2, dir: [dx / L, dz / L] as P2 }
  })
  return poly.map((_, i) => {
    const l1 = lines[(i - 1 + n) % n]
    const l2 = lines[i]
    const cr = l1.dir[0] * l2.dir[1] - l1.dir[1] * l2.dir[0]
    if (Math.abs(cr) < 1e-4) return l2.p
    const t = ((l2.p[0] - l1.p[0]) * l2.dir[1] - (l2.p[1] - l1.p[1]) * l2.dir[0]) / cr
    return [l1.p[0] + l1.dir[0] * t, l1.p[1] + l1.dir[1] * t] as P2
  })
}
const grow = (street: number, court: number) => OUT.map((_, i) => (STREET.has(i) ? street : court))

type Crown = 'none' | 'cornice' | 'pediment' | 'segment'
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, crown: Crown = 'none', o: { type?: OpeningType; f?: number; bars?: [number, number]; sill?: boolean; z?: number } = {}) {
  const type = o.type ?? 'rect'
  const f = o.f ?? 0.2
  const mm = M(m, mat(u, 0, o.z ?? 0))
  b.add('hbStucco', extrude(frameShape(type, w, h, f, 0, y0), 0.12), mm)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(mm, mat(0, 0, 0.025)))
  b.add('hbFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.07, 0, y0 + 0.03), 0.06), M(mm, mat(0, 0, 0.02)))
  const [nu, nv] = o.bars ?? [2, 3]
  for (let i = 1; i < nu; i++) b.add('hbFrame', metricBox(0.07, h - 0.1, 0.05), M(mm, mat(-w / 2 + (i * w) / nu, y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < nv; j++) b.add('hbFrame', metricBox(w - 0.1, 0.06, 0.05), M(mm, mat(0, y0 + (j * h * 0.78) / nv, 0.05)))
  if (o.sill !== false) b.add('hbStucco', metricBox(w + 2 * f + 0.2, 0.14, 0.26), M(mm, mat(0, y0 - f - 0.05, 0.12)))
  const yt = y0 + h + f
  if (crown === 'cornice') {
    b.add('hbStucco', metricBox(w + 2 * f, 0.36, 0.1), M(mm, mat(0, yt + 0.18, 0.05)))
    b.add('hbStucco', metricBox(w + 2 * f + 0.45, 0.15, 0.3), M(mm, mat(0, yt + 0.43, 0.15)))
  } else if (crown === 'pediment' || crown === 'segment') {
    const pw = w + 2 * f + 0.55
    b.add('hbStucco', metricBox(w + 2 * f, 0.3, 0.1), M(mm, mat(0, yt + 0.15, 0.05)))
    b.add('hbStucco', metricBox(pw, 0.13, 0.34), M(mm, mat(0, yt + 0.37, 0.17)))
    const s = new THREE.Shape()
    if (crown === 'pediment') {
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      s.lineTo(0, 0.6)
      s.lineTo(-pw / 2, 0)
    } else {
      const rise = 0.55
      const R = ((pw / 2) ** 2 + rise ** 2) / (2 * rise)
      const a0 = Math.asin(pw / 2 / R)
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      for (let i = 0; i <= 12; i++) {
        const a = a0 - (2 * a0 * i) / 12
        s.lineTo(R * Math.sin(a), rise - R + R * Math.cos(a))
      }
    }
    b.add('hbStucco', extrude(s, 0.3), M(mm, mat(0, yt + 0.43, 0.02)))
  }
}

/** Horizontal rustication bands between u0 … u1 (frame-local), skipping the openings [ua, ub]. */
function rusticate(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y0: number, y1: number, gaps: [number, number][]) {
  const segs: [number, number][] = []
  let a = u0
  for (const [ga, gb] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (ga > a) segs.push([a, ga])
    a = Math.max(a, gb)
  }
  if (u1 > a) segs.push([a, u1])
  for (let y = y0; y + 0.5 <= y1 + 0.01; y += 0.5)
    for (const [p, q] of segs) if (q - p > 0.1) b.add('hbWall', metricBox(q - p, 0.42, 0.06), M(m, mat((p + q) / 2, y + 0.29, 0.03)))
}

function ironRail(b: Builder, pts: THREE.Vector3[], h = 1.0) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const c = pts[i + 1]
    b.beam('iron', a.clone().setY(a.y + h), c.clone().setY(c.y + h), 0.06, 0.06)
    b.beam('iron', a.clone().setY(a.y + 0.1), c.clone().setY(c.y + 0.1), 0.04, 0.04)
    // ornamental panel (dense ironwork read as a thin dark sheet)
    const g = new THREE.BufferGeometry().setFromPoints([a.clone().setY(a.y + 0.12), c.clone().setY(c.y + 0.12), c.clone().setY(c.y + h - 0.04), a.clone().setY(a.y + h - 0.04)])
    g.setIndex([0, 1, 2, 0, 2, 3])
    g.computeVertexNormals()
    b.add('hbIronwork', g)
  }
}

function lantern(b: Builder, x: number, y: number, z: number, r: number, h: number) {
  b.add('hbStucco', new THREE.CylinderGeometry(r, r, h, 8), mat(x, y + h / 2, z))
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    b.add('glassC', metricBox(r * 0.55, h * 0.55, 0.05), mat(x + Math.cos(a) * r * 0.93, y + h * 0.48, z + Math.sin(a) * r * 0.93, -a + Math.PI / 2))
  }
  dome(b, RB, { x, y: y + h, z, r: r * 1.15, h: r * 1.1, profile: 'bell', seg: 16, ribs: 8 })
  b.add('iron', new THREE.CylinderGeometry(0.03, 0.06, 2.0, 6), mat(x, y + h + r * 1.1 + 1.0, z))
  b.add('iron', new THREE.SphereGeometry(0.12, 8, 6), mat(x, y + h + r * 1.1 + 0.3, z))
}

function build(): Builder {
  const b = new Builder()

  /* ================= volume & horizontal members ================= */
  prismOutline(b, 'hbWall', OUT, 0, EAVE - 0.01)
  prismOutline(b, 'hbSocle', offsetPoly(OUT, grow(0.12, 0.08)), 0, 0.6)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.3, 0.12)), GF, 0.42)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.1, 0.05)), 10.85, 0.18)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.1, 0.05)), 14.4, 0.16)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.16, 0.1)), ARCHI, 0.22)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.42, 0.25)), 18.75, 0.18)
  prismOutline(b, 'hbStucco', offsetPoly(OUT, grow(0.95, 0.5)), 19.25, 0.5)
  prismOutline(b, RB, offsetPoly(OUT, grow(1.0, 0.55)), EAVE - 0.05, 0.06)
  for (let i = 0; i < N; i++) {
    const { m, len } = edgeFrame(i)
    if (STREET.has(i)) for (let u = -len / 2 + 0.3; u <= len / 2 - 0.25; u += 0.8) b.add('hbStucco', metricBox(0.2, 0.3, 0.7), M(m, mat(u, 19.08, 0.35)))
    // frieze ornament (light panels with rosettes)
    if (STREET.has(i) && len > 3) for (let u = -len / 2 + 1.0; u <= len / 2 - 0.8; u += 1.6) b.add('hbOrn', new THREE.SphereGeometry(0.17, 8, 6), M(m, mat(u, 18.15, 0.04, 0, 0, 0, 1, 1, 0.4)))
  }

  /* ================= boulevard façade (edge 0) ================= */
  const F0 = edgeFrame(0).m
  const U = (x: number) => x - MID0
  const eastWing = [-23.0, -19.8, -16.6, -13.4, -10.2]
  const westWing = [10.3, 13.3, 16.3, 19.3, 22.3]
  const pavs = [-6.25, 6.25]
  const ris = [-1.95, 0, 1.95]
  const corner = [26.0, 29.5]
  const project = (x0: number, x1: number, d: number, h = EAVE) => {
    b.add('hbWall', metricBox(x1 - x0, h, d), M(F0, mat(U((x0 + x1) / 2), h / 2, d / 2)))
    b.add('hbStucco', metricBox(x1 - x0 + 0.2, 0.42, d + 0.3), M(F0, mat(U((x0 + x1) / 2), GF + 0.21, d / 2)))
    b.add('hbStucco', metricBox(x1 - x0 + 0.3, 0.5, d + 0.95), M(F0, mat(U((x0 + x1) / 2), 19.5, d / 2)))
  }
  project(-3.85, 3.85, 0.45)
  project(-8.65, -3.85, 0.25)
  project(3.85, 8.65, 0.25)
  project(24.0, 31.51, 0.3)
  const allBays: [number, number][] = [...eastWing, ...westWing, ...corner].map((x) => [x, 0])
  for (const [x] of allBays) {
    const z = x > 24 ? 0.3 : 0
    win(b, F0, U(x), 0.5, 2.0, 4.15, 'none', { f: 0.18, bars: [2, 2], sill: false, z })
    win(b, F0, U(x), 6.95, 1.45, 2.75, 'pediment', { z })
    win(b, F0, U(x), 11.4, 1.4, 2.55, 'cornice', { z })
    win(b, F0, U(x), 14.95, 1.35, 2.25, 'none', { f: 0.16, z })
  }
  for (const x of pavs) {
    win(b, F0, U(x), 0.5, 2.0, 4.15, 'none', { f: 0.18, bars: [2, 2], sill: false, z: 0.25 })
    win(b, F0, U(x), 6.95, 1.45, 2.75, 'segment', { z: 0.25 })
    win(b, F0, U(x), 11.4, 1.4, 2.55, 'cornice', { z: 0.25 })
    win(b, F0, U(x), 14.95, 1.35, 2.25, 'none', { f: 0.16, z: 0.25 })
    // quoins and statues on brackets at the third floor
    for (const s of [-1, 1]) {
      for (let y = 6.4; y < 17.2; y += 0.55) b.add('hbStucco', metricBox(0.55, 0.42, 0.08), M(F0, mat(U(x + s * 2.15), y + 0.21, 0.29)))
    }
  }
  for (const xs of [-8.65, -3.85, 3.85, 8.65]) {
    const fm = M(F0, mat(U(xs), 0, 0.45))
    b.add('hbStucco', metricBox(0.8, 0.35, 0.6), M(fm, mat(0, 14.6, 0.25)))
    b.add('hbOrn', lathe([[0.0, 0], [0.22, 0], [0.2, 0.3], [0.26, 0.9], [0.18, 1.3], [0.12, 1.45], [0.15, 1.6], [0.0, 1.75]], 10), M(fm, mat(0, 14.78, 0.3)))
  }
  // central risalit: entrance arch, balconies on two floors, columns between the bays
  {
    const z = 0.45
    for (const x of ris) {
      win(b, F0, U(x), 7.0, 1.2, 2.8, 'none', { f: 0.14, z })
      win(b, F0, U(x), 11.4, 1.2, 2.6, 'none', { f: 0.14, z })
      win(b, F0, U(x), 14.95, 1.15, 2.25, 'none', { f: 0.14, z })
    }
    win(b, F0, U(0), 0.5, 2.8, 4.2, 'none', { type: 'round', f: 0.3, bars: [2, 2], sill: false, z })
    for (const x of [-2.9, -0.97, 0.97, 2.9]) {
      b.add('hbStucco', new THREE.CylinderGeometry(0.2, 0.22, 7.4, 12), M(F0, mat(U(x), 6.6 + 3.7, z + 0.25)))
      b.add('hbStucco', metricBox(0.55, 0.35, 0.55), M(F0, mat(U(x), 14.15, z + 0.25)))
    }
    b.add('hbStucco', metricBox(7.9, 0.5, 0.5), M(F0, mat(U(0), 6.4, z + 0.25)))
    // pediment over the first-floor group
    const tri = new THREE.Shape([new THREE.Vector2(-3.4, 0), new THREE.Vector2(3.4, 0), new THREE.Vector2(0, 0.9)])
    b.add('hbStucco', extrude(tri, 0.35), M(F0, mat(U(0), 10.4, z + 0.1)))
    // balconies (first and second floor)
    for (const y of [6.55, 10.95]) {
      b.add('hbStucco', metricBox(7.6, 0.25, 1.1), M(F0, mat(U(0), y, z + 0.55)))
      const p = (u: number, d: number) => V(u, y + 0.12, z + d).applyMatrix4(F0)
      ironRail(b, [p(U(-3.75), 0.1), p(U(-3.75), 1.05), p(U(3.75), 1.05), p(U(3.75), 0.1)], 0.95)
      for (const s of [-1, 1]) b.add('hbStucco', metricBox(0.3, 0.6, 0.9), M(F0, mat(U(s * 3.2), y - 0.42, z + 0.45)))
    }
    // entrance marquee (iron and glass)
    b.add('iron', metricBox(7.2, 0.22, 2.6), M(F0, mat(U(0), 4.75, z + 1.3)))
    b.add('skylight', metricBox(7.0, 0.04, 2.5), M(F0, mat(U(0), 4.88, z + 1.3)))
    for (const s of [-1, 1]) b.beam('iron', V(U(s * 3.4), 3.6, z).applyMatrix4(F0), V(U(s * 3.4), 4.7, z + 2.4).applyMatrix4(F0), 0.08, 0.08)
    // clock attic
    b.add('hbWall', metricBox(7.6, 1.6, 0.6), M(F0, mat(U(0), EAVE + 0.8, z - 0.2)))
    b.add('hbStucco', metricBox(7.9, 0.2, 0.75), M(F0, mat(U(0), EAVE + 1.65, z - 0.2)))
    const arc = new THREE.Shape()
    arc.moveTo(-1.9, 0)
    arc.lineTo(1.9, 0)
    arc.lineTo(1.9, 1.4)
    arc.absarc(0, 1.4, 1.9, 0, Math.PI, false)
    arc.lineTo(-1.9, 0)
    b.add('hbWall', extrude(arc, 0.6), M(F0, mat(U(0), EAVE + 1.75, z - 0.5)))
    b.add('hbStucco', new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24), M(F0, mat(U(0), EAVE + 3.05, z + 0.12, 0, Math.PI / 2)))
    b.add('clock', new THREE.CylinderGeometry(0.68, 0.68, 0.14, 24), M(F0, mat(U(0), EAVE + 3.05, z + 0.15, 0, Math.PI / 2)))
    // segmental gables over the pavilions
    for (const x of pavs) {
      const g = new THREE.Shape()
      g.moveTo(-2.3, 0)
      g.lineTo(2.3, 0)
      g.lineTo(2.3, 0.6)
      g.absarc(0, -1.6, Math.hypot(2.3, 2.2), Math.atan2(2.2, 2.3), Math.PI - Math.atan2(2.2, 2.3), false)
      g.lineTo(-2.3, 0)
      b.add('hbWall', extrude(g, 0.5), M(F0, mat(U(x), EAVE, -0.15)))
      b.add('hbOrn', new THREE.SphereGeometry(0.45, 10, 8), M(F0, mat(U(x), EAVE + 0.85, 0.3, 0, 0, 0, 1.4, 1, 0.3)))
    }
  }
  // ground-floor rustication of the boulevard façade
  rusticate(b, F0, U(-23.45), U(24.0), 0.6, GF - 0.2, [...eastWing, ...westWing].map((x) => [U(x) - 1.2, U(x) + 1.2] as [number, number]).concat([[U(-8.65), U(8.65)]]))

  /* ================= rotunda (Calea Victoriei corner) ================= */
  {
    const { x, z, r, a0, a1 } = NE
    const ts = [a0 + (a1 - a0) * 0.2, (a0 + a1) / 2, a0 + (a1 - a0) * 0.8]
    for (const t of ts) {
      const m = circFrame(x, z, r, t)
      win(b, m, 0, 0.5, 2.0, 4.15, 'none', { f: 0.18, bars: [2, 2], sill: false })
      win(b, m, 0, 6.95, 1.35, 2.75, 'none', { f: 0.16 })
      win(b, m, 0, 11.4, 1.35, 2.55, 'none', { f: 0.16 })
      win(b, m, 0, 14.95, 1.3, 2.25, 'none', { f: 0.16 })
    }
    // curved balconies at the first and second floors
    for (const y of [6.55, 10.95]) {
      const t0 = a0 + 0.05
      const t1 = a1 - 0.05
      const ring: THREE.Vector3[] = []
      for (let k = 0; k <= 14; k++) {
        const t = t0 + ((t1 - t0) * k) / 14
        ring.push(V(x + Math.cos(t) * (r + 1.0), y + 0.12, z + Math.sin(t) * (r + 1.0)))
      }
      b.add('hbStucco', new THREE.CylinderGeometry(r + 1.1, r + 1.1, 0.25, 24, 1, false, Math.PI / 2 - t1, t1 - t0), mat(x, y, z))
      ironRail(b, ring, 0.95)
      for (const t of [t0 + 0.2, (t0 + t1) / 2, t1 - 0.2]) b.add('hbStucco', metricBox(0.3, 0.6, 0.9), M(circFrame(x, z, r, t), mat(0, y - 0.42, 0.45)))
    }
    // curved attic in front of the dome ("Grand Hôtel du Boulevard 1867")
    const tm = (a0 + a1) / 2
    b.add('hbWall', new THREE.CylinderGeometry(r - 0.1, r - 0.1, 2.4, 24, 1, true, Math.PI / 2 - tm - 0.42, 0.84), mat(x, EAVE + 1.2, z))
    b.add('hbStucco', new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.25, 24, 1, false, Math.PI / 2 - tm - 0.45, 0.9), mat(x, EAVE + 2.45, z))
    b.add('hbOrn', metricBox(3.6, 0.9, 0.08), M(circFrame(x, z, r - 0.05, tm), mat(0, EAVE + 1.4, 0)))
    // bell dome with ribs, lantern and spike
    const prof: [number, number][] = [
      [1.0, 0],
      [1.0, 0.12],
      [0.98, 0.3],
      [0.92, 0.48],
      [0.8, 0.65],
      [0.62, 0.8],
      [0.4, 0.91],
      [0.18, 0.98],
      [0.12, 1.0],
    ]
    b.add('hbWall', new THREE.CylinderGeometry(r - 0.6, r - 0.6, 0.6, 32), mat(x, EAVE + 0.3, z))
    const top = dome(b, RB, { x, y: EAVE + 0.6, z, r: r - 0.5, h: 7.0, profile: prof, seg: 40, ribs: 28 })
    lantern(b, x, top - 0.2, z, 0.8, 1.7)
  }

  /* ================= Calea Victoriei face (edge 9) and south-east corner ================= */
  {
    const { m, len } = edgeFrame(9)
    const us = [-5.6, -1.9, 1.9, 5.6]
    for (const u of us) {
      win(b, m, u, 0.5, 2.0, 4.15, 'none', { f: 0.18, bars: [2, 2], sill: false })
      win(b, m, u, 6.95, 1.45, 2.75, 'pediment')
      win(b, m, u, 11.4, 1.4, 2.55, 'cornice')
      win(b, m, u, 14.95, 1.35, 2.25, 'none', { f: 0.16 })
    }
    rusticate(b, m, -len / 2, len / 2, 0.6, GF - 0.2, us.map((u) => [u - 1.2, u + 1.2] as [number, number]))
    // balcony with railing on the two middle bays (photo 04)
    b.add('hbStucco', metricBox(5.4, 0.25, 1.0), M(m, mat(0, 6.55, 0.5)))
    const p = (u: number, d: number) => V(u, 6.67, d).applyMatrix4(m)
    ironRail(b, [p(-2.7, 0.05), p(-2.7, 0.95), p(2.7, 0.95), p(2.7, 0.05)], 0.95)
    // SE rounded corner: one window per floor, small dome with lantern
    const tc = Math.PI * 1.05
    const cm = circFrame(SE.x, SE.z, SE.r, tc)
    win(b, cm, 0, 0.5, 1.6, 4.15, 'none', { f: 0.16, bars: [2, 2], sill: false })
    win(b, cm, 0, 6.95, 1.2, 2.75, 'none', { f: 0.14 })
    win(b, cm, 0, 11.4, 1.2, 2.55, 'none', { f: 0.14 })
    win(b, cm, 0, 14.95, 1.15, 2.25, 'none', { f: 0.14 })
    b.add('hbWall', new THREE.CylinderGeometry(SE.r - 0.4, SE.r - 0.4, 0.9, 28), mat(SE.x, EAVE + 0.45, SE.z))
    b.add('hbStucco', new THREE.CylinderGeometry(SE.r - 0.25, SE.r - 0.25, 0.18, 28), mat(SE.x, EAVE + 0.95, SE.z))
    const t2 = dome(b, RB, { x: SE.x, y: EAVE + 1.04, z: SE.z, r: SE.r - 0.45, h: 4.0, profile: 'bell', seg: 32, ribs: 20 })
    lantern(b, SE.x, t2 - 0.15, SE.z, 0.55, 1.2)
  }

  /* ================= west façade (edge 21, Str. Beldiman — not photographed) ================= */
  {
    const { m, len } = edgeFrame(21)
    const us = [-11.6, -8.3, -5.0, -1.7, 1.6, 4.9, 8.2, 11.6]
    for (const u of us) {
      win(b, m, u, 0.5, 2.0, 4.15, 'none', { f: 0.18, bars: [2, 2], sill: false })
      win(b, m, u, 6.95, 1.45, 2.75, u < -6 ? 'segment' : 'pediment')
      win(b, m, u, 11.4, 1.4, 2.55, 'cornice')
      win(b, m, u, 14.95, 1.35, 2.25, 'none', { f: 0.16 })
    }
    rusticate(b, m, -len / 2, len / 2, 0.6, GF - 0.2, us.map((u) => [u - 1.2, u + 1.2] as [number, number]))
  }

  /* ================= rear and light-court faces (plain) ================= */
  for (const i of [16, 17, 18, 19, 20]) {
    const { m, len } = edgeFrame(i)
    const n = Math.max(1, Math.floor(len / 3.4))
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (len / n) * (k + 0.5)
      win(b, m, u, 1.2, 1.3, 2.8, 'none', { f: 0.14 })
      for (const y of [7.1, 11.5, 15.0]) win(b, m, u, y, 1.3, 2.5, 'none', { f: 0.14 })
    }
  }

  /* ================= mansard (Rainbow Brown titanium-zinc) ================= */
  {
    const outer = offsetPoly(OUT, grow(0.3, 0.2))
    const inner = offsetPoly(OUT, OUT.map((_, i) => (STREET.has(i) ? 0.3 : 0.2) - MAN_IN))
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      const pts = [V(outer[i][0], EAVE, outer[i][1]), V(outer[j][0], EAVE, outer[j][1]), V(inner[j][0], DECK, inner[j][1]), V(inner[i][0], DECK, inner[i][1])]
      facet(b, RB, pts, { seams: Math.hypot(OUT[j][0] - OUT[i][0], OUT[j][1] - OUT[i][1]) > 2 ? SEAM : undefined, thickness: 0.1 })
      b.beam(RB, pts[0], pts[3], 0.12, 0.08)
      b.beam(RB, V(inner[i][0], DECK + 0.05, inner[i][1]), V(inner[j][0], DECK + 0.05, inner[j][1]), 0.22, 0.16)
    }
    const deck = new THREE.Shape(inner.map(([px, pz]) => new THREE.Vector2(px, -pz)))
    b.add(RB, new THREE.ShapeGeometry(deck), mat(0, DECK + 0.01, 0, 0, -Math.PI / 2))
    // flat deck seams along X
    let zmin = Infinity
    let zmax = -Infinity
    for (const [, pz] of inner) {
      zmin = Math.min(zmin, pz)
      zmax = Math.max(zmax, pz)
    }
    for (let zz = zmin + 0.25; zz < zmax; zz += 0.5) {
      const xs: number[] = []
      for (let i = 0; i < N; i++) {
        const [ax, az] = inner[i]
        const [cx, cz] = inner[(i + 1) % N]
        if ((zz - az) * (zz - cz) < 0) xs.push(ax + ((zz - az) / (cz - az)) * (cx - ax))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > 0.4) b.add(RB, metricBox(xs[k + 1] - xs[k], 0.04, 0.04), mat((xs[k] + xs[k + 1]) / 2, DECK + 0.03, zz))
    }
    // arched dormers over the wing bays (boulevard, Victoriei and Beldiman sides)
    const dormer = (m: THREE.Matrix4, u: number) => {
      const zf = 0.3 - (0.6 / MAN_RISE) * MAN_IN
      const mm = M(m, mat(u, 0, zf))
      const y0 = EAVE + 0.45
      b.add(RB, metricBox(1.5, 1.5, 1.7), M(mm, mat(0, y0 + 0.75, -0.85)))
      b.add('hbStucco', extrude(frameShape('round', 0.95, 1.7, 0.14, 0, y0 + 0.1), 0.1), mm)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.95, 1.7, 0, y0 + 0.1, 10))), M(mm, mat(0, 0, 0.02)))
      b.add(RB, new THREE.CylinderGeometry(0.82, 0.82, 1.9, 14, 1, false, Math.PI / 2, Math.PI), M(mm, mat(0, y0 + 1.5, -0.8, 0, Math.PI / 2, 0)))
      b.add(RB, new THREE.TorusGeometry(0.8, 0.07, 6, 12, Math.PI), M(mm, mat(0, y0 + 1.5, 0.12)))
    }
    for (const x of [...eastWing, ...westWing]) dormer(F0, U(x))
    for (const u of [-5.6, 0, 5.6]) dormer(edgeFrame(9).m, u)
    for (const u of [-3.3, 3.3, 9.9]) dormer(edgeFrame(21).m, u)
  }

  /* ================= central pavilion roof with cresting ================= */
  {
    const cx = 0
    const cz = 7.9
    const w = 17.0
    const d = 12.6
    const y0 = EAVE
    const rise = 7.0
    const th = truncatedHip(cx, cz, w, d, y0, (76 * Math.PI) / 180, rise)
    for (const f of th.facets) facet(b, RB, f, { seams: SEAM, thickness: 0.1 })
    for (const [p, q] of th.lines) b.beam(RB, p, q, 0.16, 0.1)
    const c = th.corners
    const yT = y0 + rise
    b.add(RB, metricBox(th.curb.w, 0.12, th.curb.d), mat(cx, yT + 0.06, cz))
    for (let i = 0; i < 4; i++) {
      const p = c[i].clone().setY(yT + 0.15)
      const q = c[(i + 1) % 4].clone().setY(yT + 0.15)
      b.beam('iron', p, q, 0.08, 0.08)
      b.beam('iron', p.clone().setY(yT + 0.75), q.clone().setY(yT + 0.75), 0.04, 0.04)
      const L = p.distanceTo(q)
      const n = Math.floor(L / 0.45)
      for (let k = 0; k <= n; k++) {
        const s = p.clone().lerp(q, k / n)
        b.add('iron', new THREE.ConeGeometry(0.05, k % 4 === 0 ? 1.3 : 0.85, 4), mat(s.x, yT + 0.15 + (k % 4 === 0 ? 0.65 : 0.42), s.z))
      }
    }
    // finials at the corners
    for (const p of c) b.add('iron', new THREE.ConeGeometry(0.08, 2.2, 6), mat(p.x, yT + 1.25, p.z))
    // small domes on the flanking pavilions
    for (const x of [-6.25, 6.25]) {
      const z = 12.6
      b.add('hbWall', new THREE.CylinderGeometry(1.55, 1.55, 1.2, 20), mat(x, EAVE + 0.6, z))
      b.add('hbStucco', new THREE.CylinderGeometry(1.7, 1.7, 0.15, 20), mat(x, EAVE + 1.25, z))
      const t = dome(b, RB, { x, y: EAVE + 1.3, z, r: 1.55, h: 2.1, profile: 'bell', seg: 24, ribs: 12 })
      b.add('iron', new THREE.CylinderGeometry(0.03, 0.07, 1.6, 6), mat(x, t + 0.8, z))
    }
  }

  /* ================= west corner pavilion dome ================= */
  {
    const x = 27.75
    const z = 10.3
    helm(b, RB, { x, z, n: 4, phase: Math.PI / 4, stations: [[5.3, EAVE], [5.2, EAVE + 0.5], [4.9, EAVE + 2.0], [4.6, EAVE + 2.6]] })
    b.add('hbStucco', new THREE.CylinderGeometry(3.3, 3.3, 0.22, 28), mat(x, EAVE + 2.68, z))
    const t = dome(b, RB, { x, y: EAVE + 2.78, z, r: 3.2, h: 3.9, profile: 'bell', seg: 32, ribs: 20 })
    lantern(b, x, t - 0.15, z, 0.65, 1.4)
  }

  /* ================= chimneys ================= */
  for (const [cx, cz] of [
    [-16, 2],
    [14, 4],
    [22, -8],
    [-20, -6],
  ]) {
    b.block('hbWall', 0.8, 1.8, 1.4, cx, DECK, cz)
    b.block(RB, 1.0, 0.12, 1.6, cx, DECK + 1.8, cz)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-23.4, 25, 8],
  materials: (base) => {
    const rb = (base.zincSlate as THREE.MeshStandardMaterial).clone()
    rb.color.set('#76655b')
    return {
      hbZinc: rb,
      hbWall: new THREE.MeshStandardMaterial({ color: '#e6e3dc', roughness: 0.88 }),
      hbStucco: new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.82 }),
      hbOrn: new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.8 }),
      hbSocle: new THREE.MeshStandardMaterial({ color: '#c9c5bb', roughness: 0.9 }),
      hbFrame: new THREE.MeshStandardMaterial({ color: '#3b2f28', roughness: 0.6 }),
      hbIronwork: new THREE.MeshStandardMaterial({ color: '#1f2124', metalness: 0.5, roughness: 0.55, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    }
  },
  notes:
    'Neoclassical hotel with a rotunda corner, mansard roof with arched dormers, a tall central pavilion roof with iron cresting and five domes in dark brown coloured titanium-zinc (elZinc Rainbow Brown); rear elevations simplified.',
}
export default model
