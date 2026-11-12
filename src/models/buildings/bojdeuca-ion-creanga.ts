/**
 * Bojdeuca „Ion Creangă”, Iași — the museum pavilion of the memorial site.
 *
 * Which building: the historic memorial house (the „bojdeucă”, OSM way 209635969)
 * keeps its wooden shingle roof in every reference photograph (it appears at the
 * edge of photos 02–04 and 06). The only titanium-zinc roof on the site — the
 * elZinc Slate supplied by COLOR METAL — is the pyramid roof of the museum
 * pavilion built beside it for the documentary exhibition (photos 01–11). This
 * model therefore shows that pavilion; the little house is not modelled.
 *
 * Modelling specification (real metres, +X towards the roof terrace end,
 * +Z = entrance façade facing the open-air amphitheatre):
 *  - Square pavilion ≈ 8.6 × 8.6 m, three levels on the downhill side
 *    (0 / 3.2 / 6.3 m), walls to ≈ 10.0 m; the top storey has a clerestory band
 *    under the eave and narrow full-height window strips between plain piers.
 *  - Pyramid roof ≈ 11.5 × 11.5 m with a deep (≈ 1.45 m) overhang and a slight
 *    bell-cast kick, covered with elZinc Slate shingles (horizontal courses),
 *    hip rolls, snow-guard rails, two half-round eyebrow vents (±X faces) and a
 *    traditional white chimney with arched outlet near the apex; brown timber
 *    fascia with exposed rafters under a white soffit.
 *  - Base: two-storey wings in cream render — a tall screen block with the
 *    pennant-shaped relief band and oculus on the entrance side (−X end, brown
 *    membrane roof), a lower end wing, a raised entrance landing with white
 *    railing, and at +X a flat roof terrace over a two-storey block with a
 *    recessed loggia (timber balustrade) at its end.
 * Approximations: the site slopes (the entrance side is about one storey higher
 * than the downhill side) — the model stands on level ground with all three
 * levels exposed; absolute dimensions estimated from the photographs (the
 * pavilion roof agrees with OSM way 209636002, ≈ 11.7 m square); window counts on
 * the downhill and end elevations; shingle pattern shown as courses.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, window_, door, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180

/* pavilion (walls) */
const PX0 = -5.0
const PX1 = 3.6
const PZ = 4.3
const PCX = (PX0 + PX1) / 2
const L1 = 3.2
const L2 = 6.3
const TOP = 10.0 // wall head / soffit level

/* roof */
const OH = 1.45
const KICK = 1.0 // horizontal width of the flatter bell-cast kick
const P_LOW = 17
const P_MAIN = 33

function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, bars?: [number, number]) {
  window_(b, face, plane, u, y0, { w, h, frame: 0.07, frameKey: 'wood', glassKey: 'glassC', inset: 0.05, bars })
}

/** White tube railing between two points (top rail + posts + middle rail). */
function railing(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 1.0) {
  const L = a.distanceTo(c)
  const n = Math.max(1, Math.round(L / 1.5))
  b.rod('white', a.clone().setY(a.y + h), c.clone().setY(c.y + h), 0.035, 6)
  b.rod('white', a.clone().setY(a.y + h * 0.5), c.clone().setY(c.y + h * 0.5), 0.022, 6)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.rod('white', p, p.clone().setY(p.y + h), 0.03, 6)
  }
}

function pavilionRoof(b: Builder) {
  const cz = 0
  const hw = (PX1 - PX0) / 2
  const R0 = hw + OH // eave half-width (square)
  const R1 = R0 - KICK
  const yE = TOP + 0.45 // top of the fascia
  const y1 = yE + KICK * Math.tan(P_LOW * D2R)
  const apexY = y1 + R1 * Math.tan(P_MAIN * D2R)
  const sq = (r: number, y: number) => [V(PCX - r, y, cz - r), V(PCX + r, y, cz - r), V(PCX + r, y, cz + r), V(PCX - r, y, cz + r)]
  const lo = sq(R0, yE)
  const mid = sq(R1, y1)
  const apex = V(PCX, apexY, cz)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    facet(b, 'zincSlate', [lo[i], lo[j], mid[j], mid[i]], { thickness: 0.08 })
    facet(b, 'zincSlate', [mid[i], mid[j], apex], { thickness: 0.08 })
    b.beam('zincSlate', lo[i].clone().setY(yE + 0.04), mid[i].clone().setY(y1 + 0.04), 0.16, 0.1)
    b.beam('zincSlate', mid[i].clone().setY(y1 + 0.04), apex.clone().setY(apexY + 0.04), 0.16, 0.1)
  }
  // shingle courses (≈ 0.36 m along the slope)
  const courses = Math.round((R1 / Math.cos(P_MAIN * D2R)) / 0.36)
  for (let k = 1; k < courses - 1; k++) {
    const t = k / courses
    const r = R1 * (1 - t) + 0.015
    const y = y1 + (apexY - y1) * t + 0.015
    const ring = sq(r, y)
    for (let i = 0; i < 4; i++) b.beam('zincSlate', ring[i], ring[(i + 1) % 4], 0.035, 0.03)
  }
  for (const t of [0.35, 0.7]) {
    const r = R0 - KICK * t
    const ring = sq(r, yE + (y1 - yE) * t + 0.015)
    for (let i = 0; i < 4; i++) b.beam('zincSlate', ring[i], ring[(i + 1) % 4], 0.035, 0.03)
  }
  // snow-guard rails: two rows on every face
  for (const t of [0.12, 0.22]) {
    const r = R1 * (1 - t) + 0.12
    const y = y1 + (apexY - y1) * t + 0.12
    const ring = sq(r - 0.4, y)
    for (let i = 0; i < 4; i++) {
      const a = ring[i].clone().lerp(ring[(i + 1) % 4], 0.12)
      const c = ring[i].clone().lerp(ring[(i + 1) % 4], 0.88)
      b.rod('helm', a, c, 0.025, 6)
    }
  }
  // timber fascia, white soffit and exposed rafters
  for (let i = 0; i < 4; i++) {
    const a = lo[i]
    const c = lo[(i + 1) % 4]
    b.beam('bojFascia', a.clone().setY(yE - 0.24), c.clone().setY(yE - 0.24), 0.14, 0.5)
  }
  b.block('white', 2 * R0 - 0.1, 0.08, 2 * R0 - 0.1, PCX, TOP + 0.05, cz)
  for (let i = -5; i <= 5; i++) {
    const s = i * ((hw + 0.6) / 5.5)
    for (const sgn of [-1, 1]) {
      b.box('white', 0.12, 0.2, OH, PCX + s, TOP - 0.02, cz + sgn * (hw + OH / 2))
      b.box('white', OH, 0.2, 0.12, PCX + sgn * (hw + OH / 2), TOP - 0.02, cz + s)
    }
  }
  // eyebrow (half-round) vents on the ±X faces
  for (const sgn of [-1, 1]) {
    const r = R1 * 0.42
    const y = y1 + (R1 - r) * Math.tan(P_MAIN * D2R)
    const x = PCX + sgn * r
    const g = new THREE.CylinderGeometry(0.42, 0.42, 1.0, 14, 1, false, 0, Math.PI)
    b.add('zincSlate', g, mat(x + sgn * 0.25, y - 0.05, cz, sgn > 0 ? Math.PI / 2 : -Math.PI / 2, 0, Math.PI / 2))
    b.add('black', new THREE.CircleGeometry(0.36, 14, 0, Math.PI), mat(x + sgn * 0.76, y - 0.04, cz, sgn > 0 ? Math.PI / 2 : -Math.PI / 2))
  }
  // traditional chimney near the apex (entrance side)
  {
    const zc = 1.5
    const yBase = y1 + (R1 - zc) * Math.tan(P_MAIN * D2R) - 0.3
    const hTop = apexY + 1.0
    b.block('plasterCream', 1.0, hTop - yBase, 0.85, PCX, yBase, zc)
    b.add('plasterCream', new THREE.CylinderGeometry(0.5, 0.5, 0.85, 16, 1, false, 0, Math.PI), mat(PCX, hTop, zc, 0, Math.PI / 2, -Math.PI / 2))
    for (const sgn of [-1, 1]) b.add('black', new THREE.ShapeGeometry(new THREE.Shape(openingRound(0.42, 0.75))), mat(PCX + sgn * 0.505, hTop - 0.45, zc, sgn * Math.PI / 2))
    b.block('plasterCream', 1.12, 0.12, 0.97, PCX, hTop - 0.75, zc)
  }
  return apexY
}

/** Round-headed opening outline (for the chimney outlets). */
function openingRound(w: number, h: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0)]
  const ys = h - w / 2
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * (w / 2), ys + Math.sin(a) * (w / 2)))
  }
  return pts
}

function buildLocal(): Builder {
  const b = new Builder()

  /* ================= pavilion ================= */
  b.block('plasterCream', PX1 - PX0, TOP, 2 * PZ, PCX, 0, 0)
  // floor bands and corner piers
  for (const y of [L1 - 0.25, L2 - 0.25]) b.block('plasterCream', PX1 - PX0 + 0.16, 0.3, 2 * PZ + 0.16, PCX, y, 0)
  for (const [x, z] of [
    [PX0, -PZ],
    [PX1, -PZ],
    [PX1, PZ],
    [PX0, PZ],
  ]) b.block('plasterSand', 0.7, TOP, 0.7, x - Math.sign(x - PCX) * 0.3, 0, z - Math.sign(z) * 0.3)
  // top storey: clerestory band (two groups) on every face + narrow window strips
  const faces: [Face, number, number][] = [
    ['+z', PZ, PCX],
    ['-z', -PZ, -PCX],
    ['+x', PX1, 0],
    ['-x', PX0, 0],
  ]
  for (const [f, plane, uc] of faces) {
    for (const du of [-1.85, 1.85]) win(b, f, plane, uc + du, 9.0, 2.9, 0.75, [2, 1])
    b.add('plasterSand', metricBox(7.0, 0.22, 0.12), facePos(f, plane, uc, 8.75))
  }
  // narrow full-height strips of the top storey (entrance & downhill faces)
  for (const du of [-0.55, 0.65, 2.55]) win(b, '+z', PZ, PCX + du, 6.65, 0.48, 2.0)
  for (const du of [-2.9, -1.0, 1.0, 2.9]) win(b, '-z', -PZ, -PCX + du, 6.65, 0.48, 2.0)
  for (const x of [PCX - 1.9, PCX, PCX + 1.9]) b.add('plasterSand', metricBox(0.5, 2.7, 0.14), facePos('-z', -PZ, -x, 6.35 + 1.35))
  // downhill face: small square windows in pairs (levels 0 and 1)
  for (const y0 of [1.2, 4.3]) for (const du of [-2.6, -1.9, 1.9, 2.6]) win(b, '-z', -PZ, -PCX + du, y0, 0.45, 0.45)
  win(b, '-z', -PZ, -PCX, 4.0, 1.6, 1.2, [2, 1])
  // terrace face of the top storey: glazed wall with timber frames
  for (const du of [-1.6, 0, 1.6]) win(b, '+x', PX1, du, L2 + 0.15, 1.45, 2.35, [1, 2])

  /* ================= entrance side (+Z) ================= */
  // tall screen block in front of the left half + its return beyond the pavilion
  const WX0 = -8.0
  const WX1 = -0.6
  const WZ1 = 5.6
  const WH = 9.0
  b.block('plasterCream', WX1 - WX0, WH, WZ1 - PZ, (WX0 + WX1) / 2, 0, (PZ + WZ1) / 2)
  b.block('plasterCream', PX0 - WX0, WH, PZ + 2.6, (WX0 + PX0) / 2, 0, (PZ - 2.6) / 2)
  b.block('bojMembrane', PX0 - WX0 - 0.3, 0.05, PZ + 2.3, (WX0 + PX0) / 2 - 0.05, WH, (PZ - 2.6) / 2) // membrane roof
  b.block('plasterSand', WX1 - WX0 + 0.1, 0.18, WZ1 - PZ + 0.1, (WX0 + WX1) / 2, WH - 0.18, (PZ + WZ1) / 2) // coping
  // lower end wing
  b.block('plasterCream', 2.1, 6.6, 7.1, WX0 - 1.05, 0, 2.05)
  b.block('plasterSand', 2.2, 0.16, 7.2, WX0 - 1.05, 6.6, 2.05)
  // pennant relief band with oculus across the entrance façade
  b.block('plasterSand', WX1 - WX0 + 0.2, 1.45, 0.1, (WX0 + WX1) / 2, 4.7, WZ1 + 0.05)
  b.block('plasterSand', PX1 - WX1, 1.45, 0.1, (WX1 + PX1) / 2, 4.7, PZ + 0.05)
  {
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.9, 0.72), new THREE.Vector2(0, 1.45)])
    b.add('plasterSand', new THREE.ShapeGeometry(s), mat(WX0 - 0.12, 4.7, WZ1 + 0.11))
    b.add('black', new THREE.CircleGeometry(0.85, 24), mat(-5.6, 5.42, WZ1 + 0.13))
    b.add('plasterSand', new THREE.RingGeometry(0.85, 1.05, 24), mat(-5.6, 5.42, WZ1 + 0.12))
  }
  for (const x of [-2.3, -1.4]) win(b, '+z', WZ1, x, 4.1, 0.42, 0.45)
  for (const x of [-7.2, -6.4]) win(b, '+z', WZ1, x, 1.4, 0.42, 0.9)
  door(b, '+z', WZ1, -3.4, { w: 1.1, h: 2.3, leafKey: 'wood', frameKey: 'plasterSand', frame: 0.15 })
  // raised entrance landing with door, railing and arched grille window below
  {
    const lx0 = -0.6
    const lx1 = 3.4
    b.block('plasterCream', lx1 - lx0, L1, 2.0, (lx0 + lx1) / 2, 0, PZ + 1.0)
    b.block('plasterSand', lx1 - lx0 + 0.2, 0.18, 2.2, (lx0 + lx1) / 2, L1, PZ + 1.05)
    railing(b, V(lx0 + 0.1, L1 + 0.18, PZ + 2.05), V(lx1 - 0.1, L1 + 0.18, PZ + 2.05), 0.95)
    window_(b, '+z', PZ + 2.0, (lx0 + lx1) / 2, 0.6, { type: 'round', w: 1.5, h: 1.6, frame: 0.12, frameKey: 'plasterSand', glassKey: 'wood', inset: 0.04, bars: [5, 3] })
    door(b, '+z', PZ, 1.25, { w: 1.7, h: 2.5, y0: L1 + 0.18, leafKey: 'glassC', frameKey: 'wood', frame: 0.1 })
    for (const x of [-0.1, 2.6]) win(b, '+z', PZ, x, L1 + 0.6, 0.45, 1.6)
  }

  /* ================= terrace block (+X) ================= */
  {
    const tx0 = PX1
    const tx1 = 9.6
    const tz = 3.8
    const lr = 1.6 // loggia recess depth
    const lz = 2.8 // loggia half width
    b.block('plasterCream', tx1 - lr - tx0, L2, 2 * tz, (tx0 + tx1 - lr) / 2, 0, 0)
    b.block('plasterCream', lr, L1, 2 * tz, tx1 - lr / 2, 0, 0)
    for (const sz of [-1, 1]) b.block('plasterCream', lr, L2 - L1, tz - lz, tx1 - lr / 2, L1, sz * (lz + tz) / 2)
    b.block('plasterCream', lr, 0.55, 2 * lz, tx1 - lr / 2, L2 - 0.55, 0)
    // loggia back wall: glazed doors
    for (const u of [-1.6, 0, 1.6]) win(b, '+x', tx1 - lr, u, L1 + 0.1, 1.3, 2.3, [1, 2])
    // parapet with white railing and tiled terrace
    b.block('plasterSand', tx1 - tx0, 0.45, 0.3, (tx0 + tx1) / 2, L2, tz - 0.15)
    b.block('plasterSand', tx1 - tx0, 0.45, 0.3, (tx0 + tx1) / 2, L2, -tz + 0.15)
    b.block('plasterSand', 0.3, 0.45, 2 * tz, tx1 - 0.15, L2, 0)
    b.block('plasterWhite', tx1 - tx0 - 0.6, 0.04, 2 * tz - 0.6, (tx0 + tx1) / 2, L2, 0)
    railing(b, V(tx0 + 0.2, L2 + 0.45, tz - 0.15), V(tx1 - 0.15, L2 + 0.45, tz - 0.15), 0.6)
    railing(b, V(tx0 + 0.2, L2 + 0.45, -tz + 0.15), V(tx1 - 0.15, L2 + 0.45, -tz + 0.15), 0.6)
    railing(b, V(tx1 - 0.15, L2 + 0.45, -tz + 0.15), V(tx1 - 0.15, L2 + 0.45, tz - 0.15), 0.6)
    // recessed loggia at the end (level 1) with timber balustrade
    b.block('timber', 0.12, 0.1, 2 * lz, tx1 - 0.1, L1 + 0.95, 0)
    b.block('timber', 0.1, 0.08, 2 * lz, tx1 - 0.1, L1 + 0.08, 0)
    for (let z = -lz + 0.2; z <= lz - 0.19; z += 0.3) b.block('timber', 0.06, 0.85, 0.05, tx1 - 0.1, L1 + 0.1, z)
    // level 0 end wall: door and windows
    door(b, '+x', tx1, 0, { w: 1.2, h: 2.3, leafKey: 'wood', frameKey: 'plasterSand', frame: 0.12 })
    for (const u of [-2.3, 2.3]) win(b, '+x', tx1, u, 1.0, 1.0, 1.3)
    // side faces: band windows (level 1) and small windows (level 0)
    for (const [f, plane] of [
      ['+z', tz],
      ['-z', -tz],
    ] as [Face, number][]) {
      const uc = f === '+z' ? (tx0 + tx1) / 2 : -(tx0 + tx1) / 2
      win(b, f, plane, uc, 4.3, 4.2, 0.55, [4, 1])
      for (const du of [-1.6, 0, 1.6]) win(b, f, plane, uc + du, 1.2, 0.45, 0.45)
    }
  }

  pavilionRoof(b)
  return b
}

/** Matrix for a thin plate lying on a façade at facade-local u, height y. */
function facePos(face: Face, plane: number, u: number, y: number) {
  switch (face) {
    case '+z':
      return mat(u, y, plane + 0.06, 0)
    case '-z':
      return mat(-u, y, plane - 0.06, Math.PI)
    case '+x':
      return mat(plane + 0.06, y, -u, Math.PI / 2)
    default:
      return mat(plane - 0.06, y, u, -Math.PI / 2)
  }
}

function build(): Builder {
  const b = new Builder()
  // centre the footprint (x −10.1…9.6, z −4.3…6.3) on the origin
  b.merge(buildLocal(), mat(0.25, 0, -1.0))
  return b
}

const model: ModelModule = {
  build,
  front: [0.35, 1],
  materialFocus: [-0.45, 12.0, 1.5],
  materials: () => ({
    bojFascia: new THREE.MeshStandardMaterial({ color: '#6b4430', roughness: 0.7 }),
    bojMembrane: new THREE.MeshStandardMaterial({ color: '#5f3e33', roughness: 0.95 }),
  }),
  notes:
    'Museum pavilion of the memorial site — the building with the elZinc Slate pyramid roof in the reference photographs; the historic shingle-roofed memorial house is not modelled. Sloping site levelled, dimensions estimated from the photos.',
}
export default model
