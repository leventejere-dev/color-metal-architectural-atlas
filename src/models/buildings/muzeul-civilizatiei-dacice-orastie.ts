/**
 * Muzeul Civilizației Dacice, Orăștie — the former town hospital, Str. Nicolae
 * Bălcescu 16 (OSM address node 11403916466 inside the untagged building way
 * 485856663; U-shaped outline 55.4 × 52.0 m, long axis 9.4°).
 *
 * MASSING MODEL ONLY (tier D): no usable photograph of the building could be
 * found (Wikimedia Commons, municipal and press pages searched). The model is a
 * careful volumetric reading of the OSM outline, the project description
 * (semi-basement + ground floor + two upper floors) and the building typology
 * (late-19th / early-20th-century public building with rendered façades and
 * hipped roofs).
 *
 * Specification (real metres, +X = OSM long axis (≈ north), +Z ≈ east; origin =
 * outline centre):
 *  - Three wings after the OSM outline, simplified to convex parts: street wing
 *    along Str. Nicolae Bălcescu (−Z side, 13 m deep, slight kink at x −6.4);
 *    a narrow 7.7 m wing along the −X side (≈ 52 m long); a deep wedge-shaped
 *    block on the +X side towards Str. Ion Creangă. The courtyard opens to +Z.
 *  - Heights (typological estimate): plinth 1.0 m, three storeys of ≈ 4 m, main
 *    cornice ≈ 13.2 m; hipped / truncated-hip roofs at 38°.
 *  - Façades: regular window axes (≈ 3.6 m) on all three floors, small
 *    semi-basement windows, a central entrance on the street front.
 * METAL (client rule): roofs shown in natural titanium-zinc standing seam, the
 * material supplied by COLOR METAL according to its records (2022); aerial
 * imagery shows a light blue-grey roof consistent with it (not verified on the
 * ground). Which roof surfaces were covered is not documented: all main roofs
 * are shown.
 * Approximations: everything above the footprint — heights, roof pitch, window
 * rhythm, entrance — is assumed; the irregular east part of the OSM outline is
 * simplified to its convex hull.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, seams, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ROOF = 'zincNatural'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
type P2 = [number, number]

const COR = 13.2
const PITCH = 38

/* convex parts of the OSM outline (see header) */
const WEST: P2[] = [
  [-27.7, -26.0],
  [-20.4, -25.9],
  [-21.3, 25.4],
  [-27.7, 26.0],
]
const STREET: P2[] = [
  [-20.4, -25.9],
  [-6.4, -25.8],
  [27.7, -19.6],
  [25.9, -10.0],
  [-20.0, -12.8],
]
const EAST: P2[] = [
  [12.0, -10.6],
  [25.9, -10.0],
  [21.4, 13.7],
  [5.2, 25.6],
  [1.5, 17.0],
]

function offsetPoly(pts: P2[], d: number): P2[] {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i]
    const [x1, z1] = pts[(i + 1) % pts.length]
    area += x0 * z1 - x1 * z0
  }
  const sgn = area > 0 ? 1 : -1
  const n = pts.length
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]
    const c = pts[(i + 1) % n]
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1
    const l2 = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1
    const n1 = [(sgn * (p[1] - a[1])) / l1, (-sgn * (p[0] - a[0])) / l1]
    const n2 = [(sgn * (c[1] - p[1])) / l2, (-sgn * (c[0] - p[0])) / l2]
    const m = [n1[0] + n2[0], n1[1] + n2[1]]
    const ml = Math.hypot(m[0], m[1]) || 1
    const k = d / Math.max(0.35, (m[0] * n1[0] + m[1] * n1[1]) / ml)
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k] as P2
  })
}

/** Truncated hip over a convex polygon (rise limited so that the curb does not invert). */
function hipRoof(b: Builder, poly: P2[], rise: number, ov = 0.6) {
  const t = Math.tan(PITCH * D2R)
  const eave = offsetPoly(poly, ov)
  const curb = offsetPoly(poly, -rise / t)
  const yE = COR + 0.3 - ov * t
  const yC = COR + 0.3 + rise
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    facet(b, ROOF, [V(eave[i][0], yE, eave[i][1]), V(eave[j][0], yE, eave[j][1]), V(curb[j][0], yC, curb[j][1]), V(curb[i][0], yC, curb[i][1])], { seams: SEAM, thickness: 0.1 })
    b.beam(ROOF, V(eave[i][0], yE + 0.05, eave[i][1]), V(curb[i][0], yC + 0.05, curb[i][1]), 0.2, 0.12)
    b.beam(ROOF, V(eave[i][0], yE - 0.06, eave[i][1]), V(eave[j][0], yE - 0.06, eave[j][1]), 0.2, 0.2)
    b.beam(ROOF, V(curb[i][0], yC + 0.05, curb[i][1]), V(curb[j][0], yC + 0.05, curb[j][1]), 0.22, 0.14)
  }
  prismOutline(b, ROOF, curb, yC - 0.12, 0.14)
}

/** Regular windows along one wall edge a→c with outward normal (nx, nz). */
function windowsAlong(b: Builder, a: P2, c: P2, nx: number, nz: number, skip: (u: number) => boolean = () => false) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1])
  const n = Math.floor(L / 3.6)
  if (n < 1) return
  const ry = Math.atan2(nx, nz)
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n
    if (skip(t)) continue
    const x = a[0] + (c[0] - a[0]) * t
    const z = a[1] + (c[1] - a[1]) * t
    const m = mat(x, 0, z, ry)
    for (const y0 of [1.9, 6.1, 10.1]) {
      b.add('glassC', metricBox(1.25, 2.3, 0.04), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + 1.15, 0.02)))
      b.add('orTrim', metricBox(1.65, 0.18, 0.12), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + 2.4, 0.06)))
      b.add('orTrim', metricBox(1.75, 0.12, 0.25), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 - 0.06, 0.1)))
    }
    b.add('glassC', metricBox(0.9, 0.45, 0.04), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0.55, 0.02)))
  }
}

function build(): Builder {
  const b = new Builder()
  const wings = [WEST, STREET, EAST]
  for (const w of wings) {
    prismOutline(b, 'orWall', w, 0, COR)
    prismOutline(b, 'orSocle', offsetPoly(w, 0.1), 0, 1.0)
    prismOutline(b, 'orTrim', offsetPoly(w, 0.12), 5.5, 0.25)
    prismOutline(b, 'orTrim', offsetPoly(w, 0.3), COR - 0.1, 0.4)
  }
  // windows on the outer and courtyard façades
  const edges = (poly: P2[], skipEdges: number[] = []) => {
    let area = 0
    for (let i = 0; i < poly.length; i++) area += poly[i][0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * poly[i][1]
    const sgn = area > 0 ? 1 : -1
    poly.forEach((a, i) => {
      if (skipEdges.includes(i)) return
      const c = poly[(i + 1) % poly.length]
      const L = Math.hypot(c[0] - a[0], c[1] - a[1])
      const nx = (sgn * (c[1] - a[1])) / L
      const nz = (-sgn * (c[0] - a[0])) / L
      windowsAlong(b, a, c, nx, nz, i === 1 && poly === STREET ? (t) => Math.abs(t - 0.45) < 0.06 : undefined)
    })
  }
  // windows that fall inside an adjoining wing are hidden by it
  edges(WEST)
  edges(STREET)
  edges(EAST)
  // central entrance on the street front (edge −6.4 → 27.7)
  {
    const a: P2 = STREET[1]
    const c: P2 = STREET[2]
    const t = 0.45
    const x = a[0] + (c[0] - a[0]) * t
    const z = a[1] + (c[1] - a[1]) * t
    const L = Math.hypot(c[0] - a[0], c[1] - a[1])
    const ry = Math.atan2((c[1] - a[1]) / L, -(c[0] - a[0]) / L)
    const m = mat(x, 0, z, ry)
    b.add('orDoor', metricBox(2.0, 3.2, 0.05), new THREE.Matrix4().multiplyMatrices(m, mat(0, 1.0 + 1.6, 0.03)))
    b.add('orTrim', metricBox(3.0, 0.4, 0.4), new THREE.Matrix4().multiplyMatrices(m, mat(0, 4.4, 0.2)))
    b.add('orSocle', metricBox(3.6, 1.0, 1.6), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0.5, 0.8)))
  }

  /* roofs */
  hipRoof(b, WEST, 2.85)
  hipRoof(b, STREET, 3.6)
  hipRoof(b, EAST, 3.6)
  return b
}

const model: ModelModule = {
  build,
  front: [0, -1],
  materialFocus: [0, 15, -20],
  materials: () => ({
    orWall: new THREE.MeshStandardMaterial({ color: '#e2dbcc', roughness: 0.92 }),
    orTrim: new THREE.MeshStandardMaterial({ color: '#efeadf', roughness: 0.88 }),
    orSocle: new THREE.MeshStandardMaterial({ color: '#bdb6a8', roughness: 0.92 }),
    orDoor: new THREE.MeshStandardMaterial({ color: '#4a3527', roughness: 0.7 }),
  }),
  notes:
    'Massing model only: no photograph of the building was available; volumes follow the OSM outline and the project description (semi-basement + 3 storeys), roofs shown in natural titanium-zinc standing seam (register 2022).',
}
export default model
