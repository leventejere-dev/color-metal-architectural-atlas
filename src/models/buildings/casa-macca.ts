/**
 * Casa Macca, Str. Henri Coandă 11, Bucharest (neo-rococo residence, 1891–1900;
 * today the "Vasile Pârvan" Institute of Archaeology). Historic monument.
 *
 * Modelling specification derived from the 12 reference photographs (all taken
 * from the street, through trees, of the zinc-roofed pavilion) and the OSM
 * outline (way 78063229, 29.2 × 18.3 m, long axis 78.1°). Real metres; origin =
 * footprint centre; +X = OSM long axis (78.1°), +Z = the long façade taken as
 * the street front (168.1°, not verified).
 *
 *  - PAVILION (photos 02–08, 12): projects from the front, two storeys of beige
 *    stone with rounded front corners (an arched window on each curved corner,
 *    photos 06–08); a large arched French window in the straight front under a
 *    bombé (segmental) cornice with dentils, cherub head and monogram cartouche.
 *  - THE DOME (COLOR METAL scope, natural titanium-zinc, bright grey): an
 *    imperial (convex, bell-like) roof over the pavilion — rounded at the front
 *    corners (photos 03–05, 12) and hipped with sharp corners at the back where
 *    it meets the main roof in valleys (photos 01, 09–11). Wide batten seams,
 *    eave gutter, flat top terrace with a light-grey wrought-iron cresting:
 *    scrolls, spikes and flower finials at the corners.
 *  - MAIN BLOCK: two storeys (OSM building:levels=2), raised ground floor with
 *    rustication, arched first-floor windows, modillion cornice ≈ 12 m; beige
 *    stone front, light rendered side and rear walls (photo 10); low hipped
 *    roof of red-brown tiles (seen beside the dome in photos 01, 10, 11),
 *    brick chimneys.
 * Approximations: only the pavilion and its roof are photographed — the main
 * block's elevations, window rhythm, roof pitch, the pavilion's position on the
 * front and the cresting pattern are interpreted; the balcony with atlantes and
 * the side entrance described in public sources are not modelled; rococo
 * ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, lathe, loft, extrude, window_, hippedRoof, type Face } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const HX = 14.6 // half length
const HZ = 9.15 // half depth
const EAVE = 12.0
const ZK = 'cmZinc'

// pavilion: straight front between rounded corners
const PV = { hw: 5.0, zf: HZ + 2.6, r: 2.6 }

/* ------------------------------------------------------------------ */
/* Outline helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Dome section at inset d: rectangle x ∈ [−W+d, W−d], z ∈ [zb+d, zf−d] whose two
 * front corners are rounded (radius r−d, min rMin) and back corners sharp.
 * Fixed point count: 4 + 2·(k+1) + 2 per ring, ordered for outward loft faces.
 */
function section(W: number, zb: number, zf: number, r: number, d: number, y: number, k = 8, rMin = 0.35) {
  const x1 = W - d
  const z0 = zb + d
  const z1 = zf - d
  const rr = Math.max(rMin, r - d)
  const pts: THREE.Vector3[] = []
  pts.push(V(-x1, y, z0), V(0, y, z0), V(x1, y, z0)) // back edge (sharp corners)
  pts.push(V(x1, y, (z0 + z1 - rr) / 2))
  for (let i = 0; i <= k; i++) {
    const a = (i / k) * (Math.PI / 2)
    pts.push(V(x1 - rr + rr * Math.cos(a), y, z1 - rr + rr * Math.sin(a)))
  }
  pts.push(V(0, y, z1))
  for (let i = 0; i <= k; i++) {
    const a = Math.PI / 2 + (i / k) * (Math.PI / 2)
    pts.push(V(-x1 + rr + rr * Math.cos(a), y, z1 - rr + rr * Math.sin(a)))
  }
  pts.push(V(-x1, y, (z0 + z1 - rr) / 2))
  return pts
}

/** Resample a closed polyline into n points evenly spaced by arc length. */
function resample(pts: THREE.Vector3[], n: number) {
  const L: number[] = [0]
  for (let i = 1; i <= pts.length; i++) L.push(L[i - 1] + pts[i - 1].distanceTo(pts[i % pts.length]))
  const tot = L[L.length - 1]
  const out: THREE.Vector3[] = []
  let j = 0
  for (let s = 0; s < n; s++) {
    const t = (s / n) * tot
    while (L[j + 1] < t) j++
    const a = pts[j]
    const c = pts[(j + 1) % pts.length]
    out.push(a.clone().lerp(c, (t - L[j]) / Math.max(1e-6, L[j + 1] - L[j])))
  }
  return out
}

/** ExtrudeGeometry shape of the pavilion plan (XZ), for walls/cornices. */
function pavPlan(grow: number) {
  const s = new THREE.Shape()
  const w = PV.hw + grow
  const zf = PV.zf + grow
  const r = PV.r + grow
  const zb = HZ - 0.5
  s.moveTo(-w, -zb)
  s.lineTo(w, -zb)
  s.lineTo(w, -(zf - r))
  s.absarc(w - r, -(zf - r), r, 0, -Math.PI / 2, true)
  s.lineTo(-w + r, -zf)
  s.absarc(-w + r, -(zf - r), r, -Math.PI / 2, -Math.PI, true)
  s.closePath()
  return s
}
/** extrude a plan shape (x, −z) vertically from y0 by h */
const planSolid = (b: Builder, key: string, s: THREE.Shape, y0: number, h: number) => b.add(key, extrude(s, h, 18), new THREE.Matrix4().makeTranslation(0, y0, 0).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)))

function frame(face: Face, plane: number, u: number) {
  switch (face) {
    case '+z':
      return mat(u, 0, plane, 0)
    case '-z':
      return mat(-u, 0, plane, Math.PI)
    case '+x':
      return mat(plane, 0, -u, Math.PI / 2)
    default:
      return mat(plane, 0, u, -Math.PI / 2)
  }
}

/** Arched window with a moulded surround, keystone cartouche and sill (local frame, +z out). */
function archWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, rich = false) {
  const fr = new Builder()
  window_(fr, '+z', 0, 0, y0, { w, h, type: 'round', frame: rich ? 0.34 : 0.24, frameKey: 'cmTrim', glassKey: 'glassC', bars: [2, 4] })
  b.merge(fr, m)
  b.add('cmTrim', metricBox(w + 0.7, 0.16, 0.34), M(m, mat(0, y0 - 0.3, 0.15)))
  b.add('cmTrim', metricBox(0.5, 0.65, 0.3), M(m, mat(0, y0 + h + 0.22, 0.14)))
  if (rich) {
    // scrolled side ornaments and a shell cartouche above (simplified)
    for (const s of [-1, 1]) b.add('cmTrim', new THREE.TorusGeometry(0.22, 0.07, 5, 12, Math.PI * 1.5), M(m, mat(s * (w / 2 + 0.45), y0 + h * 0.62, 0.18, 0, 0, s > 0 ? 0 : Math.PI)))
    b.add('cmTrim', new THREE.CylinderGeometry(0.55, 0.55, 0.16, 16, 1, false, 0, Math.PI), M(m, mat(0, y0 + h + 0.55, 0.12, 0, Math.PI / 2, -Math.PI / 2)))
  }
}

/* ------------------------------------------------------------------ */
/* Main block                                                          */
/* ------------------------------------------------------------------ */

function mainBlock(b: Builder) {
  // walls: stone front half, rendered sides/rear (one box per material)
  b.block('cmRender', 2 * HX, EAVE, 2 * HZ - 0.3, 0, 0, -0.15)
  b.block('cmStone', 2 * HX + 0.02, EAVE, 0.4, 0, 0, HZ - 0.2)
  b.block('cmSocle', 2 * HX + 0.3, 1.0, 2 * HZ + 0.3, 0, 0, 0)
  // rustication on the street front, belt course, cornice all round
  for (let y = 1.45; y < 5.4; y += 0.5) b.block('cmStone', 2 * HX + 0.06, 0.08, 0.1, 0, y, HZ + 0.03)
  b.block('cmTrim', 2 * HX + 0.24, 0.45, 2 * HZ + 0.24, 0, 5.6, 0)
  b.block('cmTrim', 2 * HX + 0.16, 0.5, 2 * HZ + 0.16, 0, 10.75, 0)
  b.block('cmTrim', 2 * HX + 0.8, 0.45, 2 * HZ + 0.8, 0, 11.4, 0)
  b.block('cmTrim', 2 * HX + 1.0, 0.18, 2 * HZ + 1.0, 0, 11.85, 0)
  for (let x = -HX + 0.3; x <= HX - 0.3; x += 0.62) b.add('cmTrim', metricBox(0.16, 0.24, 0.42), mat(x, 11.28, HZ + 0.25))
  // street front windows (pavilion zone excluded): segment-arched ground floor, arched first floor
  for (const s of [-1, 1]) {
    for (const x of [7.0, 10.3, 13.3]) {
      const u = s * x
      window_(b, '+z', HZ, u, 1.9, { w: 1.45, h: 2.7, type: 'segment', frame: 0.22, frameKey: 'cmTrim', sill: true, bars: [2, 3] })
      archWindow(b, frame('+z', HZ, u), 1.5, 3.5, 6.55)
      b.add('cmTrim', metricBox(0.55, 10.6, 0.2), mat(s * (x + 1.65), 0.5 + 5.3, HZ + 0.1))
    }
  }
  // sides and rear: plainer rendered elevations
  const plain = (face: Face, plane: number, us: number[]) => {
    for (const u of us) {
      window_(b, face, plane, u, 1.9, { w: 1.35, h: 2.6, type: 'segment', frame: 0.2, frameKey: 'cmTrim', sill: true, bars: [2, 3] })
      window_(b, face, plane, u, 6.6, { w: 1.4, h: 3.2, frame: 0.22, frameKey: 'cmTrim', sill: true, bars: [2, 3] })
    }
  }
  plain('+x', HX, [-6.0, -2.0, 2.0, 6.0])
  plain('-x', -HX, [-6.0, -2.0, 2.0, 6.0])
  plain('-z', -HZ, [-12.0, -8.0, -4.0, 0, 4.0, 8.0, 12.0])
  // low hipped roof of red-brown tiles, brick chimneys
  hippedRoof(b, 'cmTile', { w: 2 * HX, d: 2 * HZ, y: EAVE, pitch: 21, overhang: 0.55, seams: false, capKey: 'cmRidge' })
  for (const [x, z] of [[-9.5, -2.5], [9.5, -2.5], [-3.5, -5.2]]) {
    b.block('cmTile', 0.9, 4.2, 1.3, x, 13.0, z)
    b.block('cmTrim', 1.15, 0.22, 1.55, x, 17.2, z)
  }
  // gutters
  for (const s of [-1, 1]) b.beam('helm', V(-HX - 0.5, EAVE - 0.3, s * (HZ + 0.5)), V(HX + 0.5, EAVE - 0.3, s * (HZ + 0.5)), 0.2, 0.2)
}

/* ------------------------------------------------------------------ */
/* Pavilion and its zinc dome                                          */
/* ------------------------------------------------------------------ */

function pavilion(b: Builder) {
  // two-storey stone pavilion with rounded front corners
  planSolid(b, 'cmStone', pavPlan(0), 0, EAVE)
  planSolid(b, 'cmSocle', pavPlan(0.15), 0, 1.0)
  for (let y = 1.45; y < 5.4; y += 0.5) planSolid(b, 'cmStone', pavPlan(0.04), y, 0.08)
  planSolid(b, 'cmTrim', pavPlan(0.12), 5.6, 0.45)
  planSolid(b, 'cmTrim', pavPlan(0.08), 10.75, 0.5)
  planSolid(b, 'cmTrim', pavPlan(0.4), 11.4, 0.45)
  planSolid(b, 'cmTrim', pavPlan(0.5), 11.85, 0.18)
  // dentils round the curved cornice
  const dent = resample(section(PV.hw + 0.3, HZ - 0.4, PV.zf + 0.3, PV.r + 0.3, 0, 11.3, 8), 90)
  for (const p of dent) if (p.z > HZ + 0.05) b.add('cmTrim', metricBox(0.18, 0.24, 0.18), mat(p.x, p.y, p.z))
  // straight front: big arched French window under a bombé cornice
  const fm = frame('+z', PV.zf, 0)
  archWindow(b, fm, 2.1, 4.3, 6.2, true)
  window_(b, '+z', PV.zf, 0, 1.1, { w: 1.9, h: 3.4, type: 'round', frame: 0.3, frameKey: 'cmTrim', glassKey: 'wood' })
  // pilaster strips framing the front
  for (const s of [-1, 1]) b.add('cmTrim', metricBox(0.5, 10.6, 0.16), mat(s * (PV.hw - PV.r + 0.1), 0.5 + 5.3, PV.zf + 0.05))
  // bombé cornice: segmental arch band rising over the window, cherub and cartouche
  const span = 2.75
  const rise = 1.35
  const R = (span * span + rise * rise) / (2 * rise)
  const arch = new THREE.Shape()
  const a0 = Math.asin(span / R)
  const yc = 11.6 + rise - R
  const t = 0.55
  arch.moveTo(-span - 0.4, 11.4)
  for (let i = 0; i <= 16; i++) {
    const a = -a0 + (2 * a0 * i) / 16
    arch.lineTo(Math.sin(a) * (R + t), yc + Math.cos(a) * (R + t))
  }
  arch.lineTo(span + 0.4, 11.4)
  arch.lineTo(span, 11.4)
  for (let i = 16; i >= 0; i--) {
    const a = -a0 + (2 * a0 * i) / 16
    arch.lineTo(Math.sin(a) * R, yc + Math.cos(a) * R - 0.02)
  }
  arch.lineTo(-span, 11.4)
  arch.closePath()
  b.add('cmTrim', extrude(arch, 0.85, 4), mat(0, 0, PV.zf - 0.2))
  const tymp = new THREE.Shape()
  tymp.moveTo(-span, 11.4)
  for (let i = 0; i <= 16; i++) {
    const a = -a0 + (2 * a0 * i) / 16
    tymp.lineTo(Math.sin(a) * R, yc + Math.cos(a) * R)
  }
  tymp.closePath()
  b.add('cmStone', extrude(tymp, 0.78, 4), mat(0, 0, PV.zf - 0.2))
  b.add('cmTrim', new THREE.SphereGeometry(0.32, 12, 10), M(fm, mat(0, 12.15, 0.72)))
  for (const s of [-1, 1]) b.add('cmTrim', metricBox(0.75, 0.32, 0.12), M(fm, mat(s * 0.5, 12.25, 0.66, 0, 0, s * 0.35)))
  b.add('cmTrim', new THREE.CylinderGeometry(0.62, 0.62, 0.18, 18), M(fm, mat(0, 10.95, 0.25, 0, Math.PI / 2, 0, 0.8, 1, 1.25)))
  for (const s of [-1, 1]) b.add('cmTrim', new THREE.TorusGeometry(0.3, 0.09, 5, 12, Math.PI * 1.4), M(fm, mat(s * 1.55, 10.8, 0.2)))
  // windows on the rounded corners (both floors)
  for (const s of [-1, 1]) {
    const cx = s * (PV.hw - PV.r)
    const cz = PV.zf - PV.r
    const a = Math.PI / 4
    const px = cx + s * PV.r * Math.sin(a)
    const pz = cz + PV.r * Math.cos(a)
    const m = M(mat(px, 0, pz, s * a), mat(0, 0, 0.1))
    archWindow(b, m, 1.35, 3.6, 6.4)
    const g = new Builder()
    window_(g, '+z', 0, 0, 1.9, { w: 1.3, h: 2.6, type: 'segment', frame: 0.22, frameKey: 'cmTrim', glassKey: 'glassC', bars: [2, 3] })
    b.merge(g, m)
  }
}

function dome(b: Builder) {
  const W = PV.hw + 0.32
  const zb = HZ - 4.4 // back edge, inside the main roof
  const zf = PV.zf + 0.32
  const r = PV.r + 0.32
  const y0 = EAVE + 0.05
  const H = 4.6
  const I = 2.05 // horizontal inset from eave to the top terrace
  const n = 96
  const steps = 12
  const rings: THREE.Vector3[][] = []
  for (let i = 0; i <= steps; i++) {
    const ph = (i / steps) * (Math.PI / 2)
    const d = I * (1 - Math.cos(ph)) ** 0.85
    const y = y0 + H * Math.sin(ph)
    rings.push(resample(section(W, zb, zf, r, d, y), n))
  }
  b.add(ZK, loft(rings, {}))
  // batten seams on every 3rd station, hips at the two back corners
  for (let k = 0; k < n; k += 3) {
    for (let i = 0; i < steps; i++) {
      const a = rings[i][k]
      const c = rings[i + 1][k]
      const nrm = V(a.x, 0, a.z - (zb + zf) / 2).normalize().add(V(0, 0.6, 0))
      b.beam(ZK, a, c, 0.11, 0.09, nrm)
    }
  }
  // flat top terrace with a low curb
  const top = resample(section(W, zb, zf, r, I, y0 + H), n)
  const cap = new THREE.Shape(top.map((p) => new THREE.Vector2(p.x, -p.z)))
  b.add(ZK, extrude(cap, 0.18, 4), new THREE.Matrix4().makeTranslation(0, y0 + H - 0.05, 0).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)))
  for (let k = 0; k < n; k++) {
    const a = top[k]
    const c = top[(k + 1) % n]
    b.beam('cmOrn', a.clone().setY(y0 + H + 0.15), c.clone().setY(y0 + H + 0.15), 0.28, 0.2)
  }
  // eave gutter following the outline
  const eave = resample(section(W + 0.12, zb, zf + 0.12, r + 0.12, 0, y0 - 0.1), n)
  for (let k = 0; k < n; k++) {
    const a = eave[k]
    const c = eave[(k + 1) % n]
    if (a.z < HZ - 0.3 && c.z < HZ - 0.3 && Math.abs(a.x) < W) continue // back edge is buried in the main roof
    b.beam('cmOrn', a, c, 0.26, 0.26)
  }
  // wrought-iron cresting round the top terrace
  const rail = resample(section(W, zb, zf, r, I + 0.12, y0 + H + 0.25), 120)
  const yb = y0 + H + 0.25
  const hR = 1.0
  for (let k = 0; k < rail.length; k++) {
    const a = rail[k]
    const c = rail[(k + 1) % rail.length]
    b.beam('cmIron', a, c, 0.04, 0.05)
    b.beam('cmIron', a.clone().setY(yb + hR), c.clone().setY(yb + hR), 0.04, 0.05)
    b.beam('cmIron', a.clone().setY(yb + 0.42), c.clone().setY(yb + 0.42), 0.02, 0.03)
    b.add('cmIron', metricBox(0.025, hR, 0.025), mat(a.x, yb + hR / 2, a.z))
    const mid = a.clone().lerp(c, 0.5)
    const ry = Math.atan2(c.x - a.x, c.z - a.z) + Math.PI / 2
    b.add('cmIron', new THREE.TorusGeometry(0.11, 0.015, 3, 10), mat(mid.x, yb + 0.66, mid.z, ry))
    if (k % 2 === 0) b.add('cmIron', new THREE.ConeGeometry(0.035, 0.32, 4), mat(a.x, yb + hR + 0.16, a.z))
  }
  // flower finials: two where the front curves start, two at the back corners
  const fin = (p: THREE.Vector3, s = 1) => {
    b.add('cmIron', lathe([[0.001, 0], [0.06, 0], [0.05, 0.6], [0.09, 0.7], [0.05, 0.8], [0.001, 0.82]], 8), mat(p.x, yb + hR, p.z, 0, 0, 0, s, s, s))
    for (let i = 0; i < 4; i++) b.add('cmIron', new THREE.SphereGeometry(0.11, 8, 6), mat(p.x + Math.cos((i * Math.PI) / 2) * 0.12, yb + hR + 0.95, p.z + Math.sin((i * Math.PI) / 2) * 0.12, 0, 0, 0, 1, 1.5, 1))
    b.add('cmIron', new THREE.SphereGeometry(0.08, 8, 6), mat(p.x, yb + hR + 0.97, p.z))
  }
  const zfT = zf - I - 0.12
  const xT = W - I - 0.12
  const rT = Math.max(0.35, r - I - 0.12)
  fin(V(xT - rT, 0, zfT))
  fin(V(-(xT - rT), 0, zfT))
  fin(V(xT, 0, zb + I + 0.12))
  fin(V(-xT, 0, zb + I + 0.12))
}

function build(): Builder {
  const b = new Builder()
  mainBlock(b)
  pavilion(b)
  dome(b)
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [1.5, 14.2, 11.75],
  materials: (base) => {
    const zinc = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    zinc.color.set('#e6e9ec')
    return {
      cmZinc: zinc,
      cmOrn: new THREE.MeshStandardMaterial({ color: '#8e9398', metalness: 0.7, roughness: 0.42 }),
      cmIron: new THREE.MeshStandardMaterial({ color: '#d4d6d6', metalness: 0.5, roughness: 0.45 }),
      cmStone: new THREE.MeshStandardMaterial({ color: '#d6c8aa', roughness: 0.86 }),
      cmTrim: new THREE.MeshStandardMaterial({ color: '#e3d8c0', roughness: 0.8 }),
      cmRender: new THREE.MeshStandardMaterial({ color: '#ebe8df', roughness: 0.9 }),
      cmSocle: new THREE.MeshStandardMaterial({ color: '#c6b897', roughness: 0.9 }),
      cmRidge: new THREE.MeshStandardMaterial({ color: '#5c3428', roughness: 0.85 }),
      cmTile: new THREE.MeshStandardMaterial({ color: '#7a4434', roughness: 0.88 }),
    }
  },
  notes: 'Pavilion with its natural titanium-zinc imperial dome and wrought-iron cresting from the photographs; main block, roof and elevations interpreted (not photographed).',
}
export default model
