/**
 * Casa Pogor, Iași (Muzeul „Vasile Pogor”, Str. Vasile Pogor 4, OSM way 188565584)
 * — two-storey neoclassical house, hipped roofs re-covered in elZinc Slate
 * standing-seam titanium-zinc.
 *
 * Modelling specification (real metres, +X = OSM long axis 67.9° along the
 * main façade, +Z = 157.9° = main (garden) façade with the porch):
 *  - Main block after the OSM outline: 24.0 × 17.6 m; rear wing 6.0 m wide
 *    projecting ≈ 3.8 m at the back (photos 03–05); shallow side risalit at mid
 *    depth on the −X (car park) side with a glazed polygonal oriel.
 *  - Storeys: plinth 0.6 m, ground floor to the string course at ≈ 5.0 m,
 *    first floor to the cornice at ≈ 10.2 m (cornice with modillions, zinc
 *    cappings on cornice and string course).
 *  - Main façade: side bays with one window per floor (pedimented / corniced
 *    surrounds), a 10.2 m central risalit with three round-arched French windows
 *    between Ionic engaged columns, an attic parapet with a raised segmental
 *    crest and cartouche; in front a porch of four banded sandstone columns with
 *    segmental arches carrying a balcony with a wrought-iron railing; front steps.
 *  - Roofs: main hipped roof (≈ 28°, ridge ≈ 15.6 m) with a lower cross-hip over
 *    the central risalit, hipped rear wing and side risalit, standing seams
 *    0.5 m, hip and ridge rolls, roof windows (photo 03).
 * Approximations: ornament (garlands, capitals, cartouche) simplified to blocks
 * and discs, window counts on the rear and the +X side, exact position of the
 * side oriel, roof pitch estimated from the oblique drone photos.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, window_, door, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180

/* plan (OSM outline in the model frame) */
const X0 = -11.9
const X1 = 12.1
const ZB = -8.4 // rear façade
const ZF = 9.2 // main façade
const RIS = { hx: 5.1, z: ZF + 0.4 } // central risalit
const REAR = { x0: -3.0, x1: 3.0, z0: -12.2 } // rear wing
const SIDE = { z0: -3.0, z1: 3.0, x: X0 - 0.45 } // side risalit on −X

/* heights */
const PLINTH = 0.6
const STRING = 5.0
const CORNICE = 10.2
const EAVE = 10.55
const PITCH = 28
const OH = 0.55

const SEAM = seams('zincSlate', 0.5, 0.05, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** Hipped roof over a rectangle (eave at y, overhang included in w/d). */
function hip(b: Builder, cx: number, cz: number, w: number, d: number, y: number) {
  const t = Math.tan(PITCH * D2R)
  const hw = w / 2
  const hd = d / 2
  const c00 = V(cx - hw, y, cz - hd)
  const c10 = V(cx + hw, y, cz - hd)
  const c11 = V(cx + hw, y, cz + hd)
  const c01 = V(cx - hw, y, cz + hd)
  let facets: THREE.Vector3[][]
  let lines: [THREE.Vector3, THREE.Vector3][]
  if (w >= d) {
    const h = hd * t
    const r1 = V(cx - (hw - hd), y + h, cz)
    const r2 = V(cx + (hw - hd), y + h, cz)
    facets = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    lines = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    const h = hw * t
    const r1 = V(cx, y + h, cz - (hd - hw))
    const r2 = V(cx, y + h, cz + (hd - hw))
    facets = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    lines = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of facets) facet(b, 'zincSlate', f, { seams: SEAM, thickness: 0.12 })
  for (const [a, c] of lines) b.beam('zincSlate', a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.24, 0.13)
  // eave gutter
  const e = [c00, c10, c11, c01]
  for (let i = 0; i < 4; i++) b.beam('zincSlate', e[i].clone().setY(y - 0.06), e[(i + 1) % 4].clone().setY(y - 0.06), 0.22, 0.2)
}

/** Window with dark timber frame, stucco surround, sill and optional cornice / pediment. */
function pogWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, crown: 'cornice' | 'pediment' | 'none' = 'cornice', type: 'rect' | 'round' = 'rect') {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.22, frameKey: 'pogStucco', glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0, { type, w: w - 0.08, h: h - 0.05, frame: 0.07, frameKey: 'pogFrame', glassKey: 'glassC', inset: 0.05, bars: [2, type === 'round' ? 2 : 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  if (crown === 'cornice') {
    b.add('pogStucco', metricBox(w + 0.5, 0.5, 0.1), M(m, mat(0, y0 + h + 0.48, 0.05)))
    b.add('pogStucco', metricBox(w + 0.8, 0.16, 0.3), M(m, mat(0, y0 + h + 0.8, 0.15)))
    b.add('zincSlate', metricBox(w + 0.84, 0.03, 0.34), M(m, mat(0, y0 + h + 0.895, 0.16)))
    // decorative panel (garland) above
    b.add('pogStucco', metricBox(w * 0.75, 0.32, 0.05), M(m, mat(0, y0 + h + 0.48, 0.12)))
  } else if (crown === 'pediment') {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.4, 0), new THREE.Vector2(w / 2 + 0.4, 0), new THREE.Vector2(0, 0.55)])
    b.add('pogStucco', new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false }), M(m, mat(0, y0 + h + 0.32, 0.02)))
    b.add('pogStucco', metricBox(w + 0.8, 0.12, 0.26), M(m, mat(0, y0 + h + 0.27, 0.13)))
  }
}

function wroughtRailing(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 1.0) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / 0.13))
  b.beam('iron', a.clone().setY(a.y + h), c.clone().setY(c.y + h), 0.05, 0.05)
  b.beam('iron', a.clone().setY(a.y + 0.12), c.clone().setY(c.y + 0.12), 0.04, 0.04)
  b.beam('iron', a.clone().setY(a.y + h - 0.18), c.clone().setY(c.y + h - 0.18), 0.03, 0.03)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.rod('iron', p.clone().setY(p.y + 0.12), p.clone().setY(p.y + h), 0.01, 4)
  }
}

/** Banded (rusticated) sandstone column with base and capital. */
function column(b: Builder, x: number, y0: number, z: number, h: number, r = 0.3) {
  b.add('pogSandstone', new THREE.CylinderGeometry(r, r * 1.04, h - 0.6, 18), mat(x, y0 + 0.3 + (h - 0.6) / 2, z))
  for (let y = y0 + 0.6; y < y0 + h - 0.6; y += 0.55) b.add('pogSandstone', new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.12, 18), mat(x, y, z))
  b.block('pogSandstone', r * 2.7, 0.3, r * 2.7, x, y0, z)
  b.add('pogSandstone', new THREE.CylinderGeometry(r * 1.25, r, 0.2, 18), mat(x, y0 + h - 0.4, z))
  b.block('pogSandstone', r * 2.8, 0.22, r * 2.8, x, y0 + h - 0.3, z)
}

/** Segmental arch (spandrel panel) between two points at the same height. */
function archPanel(b: Builder, m: THREE.Matrix4, u0: number, u1: number, ySpring: number, yTop: number, depth: number) {
  const w = u1 - u0
  const rise = 0.55
  const R = ((w / 2) ** 2 + rise ** 2) / (2 * rise)
  const s = new THREE.Shape()
  s.moveTo(u0, ySpring)
  s.lineTo(u0, yTop)
  s.lineTo(u1, yTop)
  s.lineTo(u1, ySpring)
  const cx = (u0 + u1) / 2
  const cy = ySpring + rise - R
  const a0 = Math.asin(w / 2 / R)
  for (let i = 0; i <= 12; i++) {
    const a = a0 - (2 * a0 * i) / 12
    s.lineTo(cx + R * Math.sin(a), cy + R * Math.cos(a))
  }
  b.add('pogRender', new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 }), m)
}

function build(): Builder {
  const b = new Builder()

  /* ================= wall volumes ================= */
  const walls = (x0: number, x1: number, z0: number, z1: number) => {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    b.block('pogRender', x1 - x0, CORNICE, z1 - z0, cx, 0, cz)
    b.block('pogPlinth', x1 - x0 + 0.14, PLINTH, z1 - z0 + 0.14, cx, 0, cz)
    // string course with zinc capping
    b.block('pogStucco', x1 - x0 + 0.22, 0.42, z1 - z0 + 0.22, cx, STRING - 0.2, cz)
    b.block('zincSlate', x1 - x0 + 0.26, 0.03, z1 - z0 + 0.26, cx, STRING + 0.22, cz)
    // first-floor sill band
    b.block('pogStucco', x1 - x0 + 0.08, 0.16, z1 - z0 + 0.08, cx, 5.75, cz)
    // entablature: architrave, frieze, cornice with modillions, zinc capping
    b.block('pogStucco', x1 - x0 + 0.12, 0.3, z1 - z0 + 0.12, cx, CORNICE - 1.0, cz)
    b.block('pogStucco', x1 - x0 + 0.5, 0.2, z1 - z0 + 0.5, cx, CORNICE - 0.2, cz)
    b.block('pogStucco', x1 - x0 + 0.8, 0.22, z1 - z0 + 0.8, cx, CORNICE, cz)
    b.block('zincSlate', x1 - x0 + 0.84, 0.04, z1 - z0 + 0.84, cx, CORNICE + 0.22, cz)
  }
  walls(X0, X1, ZB, ZF)
  walls(REAR.x0, REAR.x1, REAR.z0, ZB + 0.01)
  walls(SIDE.x, X0 + 0.01, SIDE.z0, SIDE.z1)
  // central risalit projection (front)
  b.block('pogRender', 2 * RIS.hx, CORNICE, RIS.z - ZF + 0.01, 0, 0, (ZF + RIS.z) / 2)
  b.block('pogPlinth', 2 * RIS.hx + 0.14, PLINTH, RIS.z - ZF + 0.14, 0, 0, (ZF + RIS.z) / 2)
  b.block('pogStucco', 2 * RIS.hx + 0.22, 0.42, RIS.z - ZF + 0.22, 0, STRING - 0.2, (ZF + RIS.z) / 2)
  b.block('pogStucco', 2 * RIS.hx + 0.8, 0.22, RIS.z - ZF + 0.8, 0, CORNICE, (ZF + RIS.z) / 2)
  b.block('pogStucco', 2 * RIS.hx + 0.5, 0.2, RIS.z - ZF + 0.5, 0, CORNICE - 0.2, (ZF + RIS.z) / 2)
  // modillions under the cornice (front and sides)
  for (let x = X0 + 0.4; x <= X1 - 0.3; x += 0.6) {
    const z = Math.abs(x) < RIS.hx ? RIS.z : ZF
    b.block('pogStucco', 0.14, 0.18, 0.3, x, CORNICE - 0.18, z + 0.15)
  }
  // corner pilasters with rusticated ground storey
  for (const [x, z] of [
    [X0 + 0.45, ZF],
    [X1 - 0.45, ZF],
    [-RIS.hx + 0.4, RIS.z],
    [RIS.hx - 0.4, RIS.z],
  ]) {
    for (let y = PLINTH; y < STRING - 0.3; y += 0.5) b.block('pogStucco', 0.85, 0.4, 0.12, x, y, z + 0.06)
    b.block('pogStucco', 0.75, CORNICE - 1.0 - STRING - 0.25, 0.1, x, STRING + 0.25, z + 0.05)
  }

  /* ================= main façade (+Z) ================= */
  {
    // side bays: one window per floor
    for (const x of [-8.5, 8.5]) {
      pogWindow(b, '+z', ZF, x, 1.5, 1.6, 2.5, 'none')
      pogWindow(b, '+z', ZF, x, 6.1, 1.6, 2.6, 'cornice')
    }
    // risalit first floor: three arched French windows between engaged Ionic columns
    for (const x of [-2.8, 0, 2.8]) {
      window_(b, '+z', RIS.z, x, 5.95, { type: 'round', w: 1.35, h: 3.0, frame: 0.2, frameKey: 'pogStucco', glassKey: 'glassC', inset: 0.04 })
      window_(b, '+z', RIS.z, x, 5.98, { type: 'round', w: 1.27, h: 2.95, frame: 0.07, frameKey: 'pogFrame', glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
      b.add('pogStucco', new THREE.SphereGeometry(0.28, 12, 8), mat(x - 1.05, 8.9, RIS.z + 0.06, 0, 0, 0, 1, 1, 0.3))
      b.add('pogStucco', new THREE.SphereGeometry(0.28, 12, 8), mat(x + 1.05, 8.9, RIS.z + 0.06, 0, 0, 0, 1, 1, 0.3))
    }
    for (const x of [-4.2, -1.4, 1.4, 4.2]) {
      b.add('pogStucco', new THREE.CylinderGeometry(0.22, 0.24, 3.4, 14), mat(x, 5.95 + 1.7, RIS.z + 0.12))
      b.block('pogStucco', 0.7, 0.22, 0.5, x, 9.1, RIS.z + 0.15)
    }
    // ground floor inside the porch: door + two windows
    door(b, '+z', RIS.z, 0, { w: 1.5, h: 3.0, y0: 0.9, leafKey: 'pogFrame', frameKey: 'pogStucco', frame: 0.18 })
    for (const x of [-2.9, 2.9]) pogWindow(b, '+z', RIS.z, x, 1.6, 1.4, 2.3, 'none')
    // attic over the risalit with raised segmental crest and cartouche
    const ay = CORNICE + 0.22
    b.block('pogRender', 2 * RIS.hx, 1.25, 0.5, 0, ay, RIS.z - 0.25)
    b.block('pogStucco', 2 * RIS.hx + 0.2, 0.18, 0.62, 0, ay + 1.25, RIS.z - 0.25)
    b.block('zincSlate', 2 * RIS.hx + 0.24, 0.03, 0.66, 0, ay + 1.43, RIS.z - 0.25)
    for (const x of [-3.4, 3.4]) b.block('pogStucco', 2.6, 0.7, 0.06, x, ay + 0.3, RIS.z + 0.02)
    {
      const s = new THREE.Shape()
      s.moveTo(-1.6, 0)
      s.lineTo(1.6, 0)
      s.lineTo(1.6, 0.35)
      s.absarc(0, -0.9, 1.82, Math.asin(1.25 / 1.82) - 0.0, Math.PI - Math.asin(1.25 / 1.82), false)
      s.lineTo(-1.6, 0)
      b.add('pogRender', new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: false, curveSegments: 16 }), mat(0, ay + 1.25, RIS.z - 0.5))
      b.add('pogStucco', new THREE.SphereGeometry(0.5, 14, 10), mat(0, ay + 1.05, RIS.z + 0.02, 0, 0, 0, 1.3, 1, 0.35))
      for (const sx of [-1, 1]) b.add('pogStucco', new THREE.SphereGeometry(0.3, 10, 8), mat(sx * 0.95, ay + 0.95, RIS.z + 0.02, 0, 0, 0, 1.4, 0.8, 0.3))
    }
  }

  /* ================= porch with balcony ================= */
  {
    const z0 = RIS.z
    const z1 = RIS.z + 2.6
    const floorY = 0.9
    // podium + steps
    b.block('pogSandstone', 9.6, floorY, z1 - z0 + 0.3, 0, 0, (z0 + z1) / 2 + 0.15)
    for (let i = 0; i < 4; i++) b.block('pogSandstone', 5.6 + i * 0.0, floorY * (1 - (i + 1) / 5), 0.36, 0, 0, z1 + 0.3 + i * 0.36 + 0.18)
    const colH = 3.55
    const colXs = [-4.25, -1.4, 1.4, 4.25]
    for (const x of colXs) column(b, x, floorY, z1 - 0.3, colH)
    for (const x of [-4.25, 4.25]) column(b, x, floorY, z0 + 0.45, colH)
    // arches and slab carrying the balcony
    const sY = floorY + colH
    const fm = mat(0, 0, z1 - 0.55)
    for (let i = 0; i < colXs.length - 1; i++) archPanel(b, fm, colXs[i] + 0.3, colXs[i + 1] - 0.3, sY - 0.55, sY + 0.45, 0.5)
    for (const sx of [-1, 1]) archPanel(b, M(mat(sx * 4.25 - sx * 0.25, 0, (z0 + z1) / 2, sx * Math.PI / 2), mat(0, 0, 0)), -0.9, 0.9, sY - 0.55, sY + 0.45, 0.5)
    b.block('pogStucco', 9.4, 0.32, z1 - z0 + 0.25, 0, sY + 0.45, (z0 + z1) / 2)
    b.block('zincSlate', 9.5, 0.04, z1 - z0 + 0.3, 0, sY + 0.77, (z0 + z1) / 2)
    for (const x of [-2.8, 0, 2.8]) b.add('pogStucco', new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), mat(x, sY + 0.1, z1 - 0.28, 0, Math.PI / 2))
    const by = sY + 0.81
    wroughtRailing(b, V(-4.65, by, z1 - 0.05), V(4.65, by, z1 - 0.05), 1.0)
    wroughtRailing(b, V(-4.65, by, z0 + 0.05), V(-4.65, by, z1 - 0.05), 1.0)
    wroughtRailing(b, V(4.65, by, z0 + 0.05), V(4.65, by, z1 - 0.05), 1.0)
    b.add('iron', new THREE.TorusGeometry(0.32, 0.03, 6, 16), mat(0, by + 0.55, z1 - 0.05))
  }

  /* ================= other façades ================= */
  // +X side (garden): 4 bays
  for (const z of [6.2, 2.0, -2.2, -6.0]) {
    pogWindow(b, '+x', X1, -z, 1.5, 1.4, 2.4, 'none')
    pogWindow(b, '+x', X1, -z, 6.1, 1.4, 2.5, 'cornice')
  }
  // −X side: bays either side of the side risalit, oriel on the risalit
  for (const z of [6.4, -6.0]) {
    pogWindow(b, '-x', X0, z, 1.5, 1.4, 2.4, 'none')
    pogWindow(b, '-x', X0, z, 6.1, 1.4, 2.5, 'cornice')
  }
  pogWindow(b, '-x', SIDE.x, 0, 1.5, 1.4, 2.4, 'none')
  {
    // glazed polygonal oriel on brackets (first floor)
    const x = SIDE.x
    const r = 1.25
    const y0 = 5.4
    const g = new THREE.CylinderGeometry(r, r, 3.4, 6, 1, false, Math.PI, Math.PI)
    b.add('glassG', g, mat(x, y0 + 1.7, 0, 0, 0, 0, 0.7, 1, 1))
    for (let k = 0; k <= 3; k++) {
      const a = Math.PI + (k / 3) * Math.PI
      b.add('pogFrame', metricBox(0.1, 3.4, 0.1), mat(x + Math.sin(a) * r * 0.7, y0 + 1.7, Math.cos(a) * r))
    }
    b.add('pogStucco', new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.3, 6, 1, false, Math.PI, Math.PI), mat(x, y0, 0, 0, 0, 0, 0.75, 1, 1))
    b.add('zincSlate', new THREE.CylinderGeometry(0.2, r + 0.2, 0.7, 6, 1, false, Math.PI, Math.PI), mat(x, y0 + 3.75, 0, 0, 0, 0, 0.75, 1, 1))
    b.add('pogStucco', new THREE.ConeGeometry(r * 0.8, 1.0, 6, 1, false, Math.PI, Math.PI), mat(x, y0 - 0.65, 0, 0, Math.PI, 0, 0.7, 1, 1))
  }
  // rear: two bays each side of the rear wing, rear wing windows + door
  for (const x of [-9.0, -5.6, 5.6, 9.0]) {
    pogWindow(b, '-z', ZB, -x, 1.5, 1.4, 2.4, 'none')
    pogWindow(b, '-z', ZB, -x, 6.1, 1.4, 2.5, 'cornice')
  }
  for (const x of [-1.4, 1.4]) pogWindow(b, '-z', REAR.z0, -x, 6.1, 1.2, 2.5, 'none')
  door(b, '-z', REAR.z0, 0, { w: 1.4, h: 2.7, y0: PLINTH, leafKey: 'pogFrame', frameKey: 'pogStucco', frame: 0.2 })
  for (const [f, plane] of [
    ['+x', REAR.x1],
    ['-x', REAR.x0],
  ] as [Face, number][]) {
    const u = f === '+x' ? 10.3 : -10.3
    pogWindow(b, f, plane, u, 1.5, 1.1, 2.3, 'none')
    pogWindow(b, f, plane, u, 6.1, 1.1, 2.4, 'none')
  }

  /* ================= roofs ================= */
  hip(b, (X0 + X1) / 2, (ZB + ZF) / 2, X1 - X0 + 2 * OH, ZF - ZB + 2 * OH, EAVE)
  // cross-hip over the central risalit (ridge towards the façade, lower than the main ridge)
  hip(b, 0, (-4.0 + RIS.z + OH) / 2, 2 * RIS.hx + 2 * OH, RIS.z + OH + 4.0, EAVE)
  // rear wing
  hip(b, 0, (REAR.z0 - OH - 2.0) / 2, REAR.x1 - REAR.x0 + 2 * OH, -2.0 - REAR.z0 + OH, EAVE)
  // side risalit
  hip(b, (SIDE.x - OH - 3.0) / 2, 0, -3.0 - SIDE.x + OH, SIDE.z1 - SIDE.z0 + 2 * OH, EAVE)
  // roof windows (photo 03): pairs near both hips on front and rear slopes, two more at the back
  {
    const t = Math.tan(PITCH * D2R)
    const hd = (ZF - ZB) / 2 + OH
    const cz = (ZB + ZF) / 2
    const place = (x: number, z: number) => {
      const s = Math.sign(z - cz)
      const y = EAVE + (hd - Math.abs(z - cz)) * t + 0.08
      b.add('aluDarkGrey', metricBox(0.9, 0.12, 1.2), mat(x, y, z, 0, s * PITCH * D2R))
      b.add('skylight', metricBox(0.75, 0.05, 1.05), mat(x, y + 0.07, z, 0, s * PITCH * D2R))
    }
    for (const x of [-5.0, 5.0]) for (const z of [4.2, 2.5, -2.0, -3.7]) place(x, z)
    for (const x of [-2.2, 2.2]) place(x, -5.6)
  }
  // flagpole bracket / lightning rod on the main ridge (photos 10–12)
  b.rod('iron', V(-1.0, EAVE + 4.6, (ZB + ZF) / 2 + 1.2), V(-1.0, EAVE + 9.0, (ZB + ZF) / 2 + 1.2), 0.03, 6)

  /* ================= downpipes ================= */
  for (const [x, z] of [
    [X0 + 1.1, ZF + 0.15],
    [X1 - 1.1, ZF + 0.15],
    [-RIS.hx - 0.3, ZF + 0.15],
    [RIS.hx + 0.3, ZF + 0.15],
  ]) b.rod('zincSlate', V(x, 0.3, z), V(x, EAVE - 0.1, z), 0.06, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [6, 13.5, 3],
  materials: () => ({
    pogRender: new THREE.MeshStandardMaterial({ color: '#ece6d4', roughness: 0.88 }),
    pogStucco: new THREE.MeshStandardMaterial({ color: '#f4f0e4', roughness: 0.8 }),
    pogPlinth: new THREE.MeshStandardMaterial({ color: '#d7d0bd', roughness: 0.9 }),
    pogSandstone: new THREE.MeshStandardMaterial({ color: '#d2b07a', roughness: 0.88 }),
    pogFrame: new THREE.MeshStandardMaterial({ color: '#3a2b22', roughness: 0.6 }),
  }),
  notes:
    'Neoclassical two-storey house with hipped titanium-zinc standing-seam roofs (elZinc Slate), central risalit with attic crest, sandstone-column porch and balcony; ornament simplified.',
}
export default model
