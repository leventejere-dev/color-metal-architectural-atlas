/**
 * Catedrala „Sfântul Haralambie”, Turnu Măgurele — neo-Romanian cathedral with
 * twisted (spiral-fluted) west drums; restored 2020-2024, natural titanium-zinc
 * roofs and domes by COLOR METAL (2020-2021, internal records).
 *
 * Modelling specification (real metres; origin = OSM footprint centre at ground;
 * +X = OSM long axis 61.2° towards the altar (ENE); west front at −X):
 *  - Plan after the restoration floor plan (photo 05, axes A–I: 4.23 / 4.25 /
 *    8.50 / 2.99 / 8.50 / 2.96 / 2.39 / 3.37 m, ≈ 37.2 m porch → apse; read at
 *    ≈ 22.8 px/m) cross-checked with OSM way 373743050 (38.6 × 21.8 m):
 *    open west porch (X −19.2 → −15.3, columns at Z ±1.5 / ±4.0); pronaos block
 *    with the two tower rooms (X −15.3 → −9.3, 19.8 m wide); recessed nave bay
 *    (13.9 m wide); lateral block of the trefoil naos with the side entrances,
 *    prothesis and diaconicon (X −2.4 → 13.9, 20 m wide); polygonal altar apse
 *    to X 19.3.
 *  - Heights (no measured data; proportions from photos 01-04 and the plan):
 *    outer cornices ≈ 13 m with a glazed band behind them (photos 02, 04);
 *    raised central nave and N/S arms ≈ 16 m; west tower stages to 16.5 m;
 *    cylindrical drums Ø 4.2 m with twelve spiral flutes and four twisted slit
 *    windows to 23.5 m; bulbous zinc domes with cresting, spindle finials and
 *    crosses (≈ 29 m); central octagonal drum Ø ≈ 7 m on a square base with a
 *    blind arcade, scalloped cornice, low dome (cross ≈ 30.5 m); four small
 *    corner turrets with zinc caps on the lateral block.
 *  - Porch: four columns on tall pedestals, three multifoil arches, ornate attic
 *    with finials and a pointed central pediment; podium with steps.
 *  - METAL as photographed 2024/25: natural titanium-zinc — fish-scale (shingle)
 *    cladding on the domes (shown as shingle courses), standing seam ≈ 0.5 m on
 *    the low-pitched roofs, porch roof and turret caps.
 * Approximations: all heights estimated; carved ornament (cornice rosettes,
 * window surrounds, cresting) simplified to mouldings and small solids; window
 * counts on the east and north elevations inferred from the plan; roof pitches.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, prism, ringBand, seams, faceFrame, facet, lathe, type Face } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const WALL = 'tmWall'
const TRIM = 'tmTrim'
const D2R = Math.PI / 180

const FL = 1.0 // podium / floor level
const EAVE = 13.0
const HIGH = 16.0
const WB = { x0: -15.3, x1: -9.3, hw: 9.9 } // west (pronaos) block
const NB = { x0: -9.3, x1: -2.4, hw: 6.9 } // recessed nave bay
const LB = { x0: -2.4, x1: 13.9, hw: 10.0 } // lateral block
const CN = { hw: 4.6 } // raised central nave / arms half width
const CX = 5.4 // central tower axis
const ARM = { x0: CX - 4.2, x1: CX + 4.2 }
const TWR = { x0: -14.9, x1: -9.5, z0: 4.5, z1: 9.9, top: 16.5 }
const TC = { x: (TWR.x0 + TWR.x1) / 2, z: (TWR.z0 + TWR.z1) / 2 }
const PORCH = { x0: -19.2, x1: -15.3, hw: 5.0 }
const APSE: [number, number][] = [
  [13.9, -9.0],
  [16.6, -7.0],
  [19.3, -3.0],
  [19.3, 3.0],
  [16.6, 7.0],
  [13.9, 9.0],
]

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** Wall block (on the podium) with socle, dentil cornice, glazed band behind the cornice. */
function block(b: Builder, x0: number, x1: number, hw: number, top: number, glazed = false) {
  const w = x1 - x0
  const x = (x0 + x1) / 2
  b.block(WALL, w, top, 2 * hw, x, 0, 0)
  b.block('tmSocle', w + 0.25, FL + 0.6, 2 * hw + 0.25, x, 0, 0)
  b.block(TRIM, w + 0.1, 0.18, 2 * hw + 0.1, x, FL + 0.6, 0)
  // string course + cornice (three steps) with dentils
  b.block(TRIM, w + 0.2, 0.25, 2 * hw + 0.2, x, top - 3.4, 0)
  b.block(TRIM, w + 0.3, 0.55, 2 * hw + 0.3, x, top - 1.1, 0)
  b.block(TRIM, w + 0.7, 0.25, 2 * hw + 0.7, x, top - 0.55, 0)
  b.block(TRIM, w + 1.0, 0.3, 2 * hw + 1.0, x, top - 0.3, 0)
  b.block(ZN, w + 1.05, 0.05, 2 * hw + 1.05, x, top, 0)
  if (glazed) {
    b.block('glassG', w - 0.6, 0.7, 2 * hw - 0.6, x, top, 0)
    b.block(ZN, w - 0.5, 0.06, 2 * hw - 0.5, x, top + 0.7, 0)
  }
}

/** Dentil row (corbels) under a cornice along a facade. */
function dentils(b: Builder, m: THREE.Matrix4, u0: number, u1: number, y: number, step = 0.42) {
  for (let u = u0 + step / 2; u < u1; u += step) b.add(TRIM, metricBox(0.2, 0.32, 0.28), M(m, mat(u, y, 0.14)))
}

/** Arched window with ornate surround (double frame + hood), on a wall frame. */
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, o: { glass?: string; twin?: boolean; hood?: boolean } = {}) {
  const g = o.glass ?? 'glassC'
  if (o.twin) {
    for (const du of [-w / 4 - 0.05, w / 4 + 0.05]) b.add(g, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w / 2 - 0.15, h - 0.4, u + du, y0, 8))), M(m, mat(0, 0, 0.03)))
    b.add(TRIM, new THREE.CylinderGeometry(0.09, 0.09, h - 0.4 - w / 4, 8), M(m, mat(u, y0 + (h - 0.4 - w / 4) / 2, 0.08)))
    b.add(TRIM, new THREE.TorusGeometry(0.28, 0.06, 6, 14), M(m, mat(u, y0 + h - 0.45, 0.08)))
  } else b.add(g, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 10))), M(m, mat(0, 0, 0.03)))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.2, u, y0), 0.16, 10), M(m, mat(0, 0, 0.01)))
  if (o.hood !== false) b.add(TRIM, extrude(frameShape('round', w + 0.75, h + 0.45, 0.14, u, y0 - 0.25), 0.1, 10), M(m, mat(0, 0, 0.01)))
  b.add(TRIM, metricBox(w + 0.9, 0.16, 0.34), M(m, mat(u, y0 - 0.3, 0.15)))
}

/** Round rosette window in a cross-shaped panel. */
function rosette(b: Builder, m: THREE.Matrix4, u: number, y: number, r: number) {
  b.add(TRIM, metricBox(r * 3.0, r * 1.6, 0.1), M(m, mat(u, y, 0.05)))
  b.add(TRIM, metricBox(r * 1.6, r * 3.0, 0.1), M(m, mat(u, y, 0.05)))
  b.add(TRIM, new THREE.TorusGeometry(r, 0.09, 6, 20), M(m, mat(u, y, 0.13)))
  b.add('glassC', new THREE.CircleGeometry(r - 0.02, 20), M(m, mat(u, y, 0.11)))
}

/** Low hipped roof on a rectangle (eave y), standing seams. */
function hip(b: Builder, cx: number, cz: number, w: number, d: number, y: number, pitch: number) {
  const t = Math.tan(pitch * D2R)
  const hw = w / 2
  const hd = d / 2
  const c00 = V(cx - hw, y, cz - hd)
  const c10 = V(cx + hw, y, cz - hd)
  const c11 = V(cx + hw, y, cz + hd)
  const c01 = V(cx - hw, y, cz + hd)
  let fs: THREE.Vector3[][]
  let ls: [THREE.Vector3, THREE.Vector3][]
  if (w >= d) {
    const r1 = V(cx - (hw - hd), y + hd * t, cz)
    const r2 = V(cx + (hw - hd), y + hd * t, cz)
    fs = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    ls = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    const r1 = V(cx, y + hw * t, cz - (hd - hw))
    const r2 = V(cx, y + hw * t, cz + (hd - hw))
    fs = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    ls = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of fs) facet(b, ZN, f, { seams: SEAM, thickness: 0.1 })
  for (const [a, c] of ls) b.beam(ZN, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.16, 0.1)
}

/** Bulbous dome with fish-scale courses, a cresting ring at the foot and a spindle finial. Returns top y. */
function scaleDome(b: Builder, x: number, z: number, y0: number, r: number, h: number, prof: [number, number][], cresting = true) {
  const pts = prof.map(([pr, py]) => [pr * r, py * h] as [number, number])
  b.add('tmDomeZinc', lathe(pts, 40), mat(x, y0, z))
  // shingle courses (fish-scale cladding, simplified)
  const n = Math.round(h / 0.32)
  for (let i = 1; i < n; i++) {
    const t = i / n
    let k = 0
    while (k < pts.length - 2 && pts[k + 1][1] < t * h) k++
    const [r0, yA] = pts[k]
    const [r1, yB] = pts[k + 1]
    const s = (t * h - yA) / Math.max(1e-6, yB - yA)
    const rr = r0 + (r1 - r0) * s
    if (rr < 0.12) continue
    b.add(ZN, new THREE.TorusGeometry(rr + 0.005, 0.028, 3, 40), mat(x, y0 + t * h, z, 0, Math.PI / 2))
  }
  if (cresting) {
    const rc = pts[0][0] + 0.05
    b.add(ZN, new THREE.TorusGeometry(rc, 0.07, 6, 40), mat(x, y0 + 0.08, z, 0, Math.PI / 2))
    const cnt = Math.round((2 * Math.PI * rc) / 0.42)
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2
      b.add(ZN, new THREE.ConeGeometry(0.1, 0.42, 4), mat(x + Math.cos(a) * rc, y0 + 0.32, z + Math.sin(a) * rc))
      b.add(ZN, new THREE.SphereGeometry(0.07, 6, 4), mat(x + Math.cos(a) * rc, y0 + 0.56, z + Math.sin(a) * rc))
    }
  }
  // spindle finial
  const top = y0 + h
  b.add(ZN, lathe([[0.16, 0], [0.22, 0.25], [0.12, 0.55], [0.26, 0.95], [0.08, 1.4], [0.06, 1.8], [0.0, 1.85]], 12), mat(x, top - 0.05, z))
  return top + 1.75
}

/** Orthodox cross with trefoil ends and a crescent (s = height), crossbar facing ±Z. */
function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('tmIron', metricBox(t, s, t), mat(0, s / 2, 0))
  g.add('tmIron', metricBox(s * 0.62, t, t), mat(0, s * 0.68, 0))
  g.add('tmIron', metricBox(s * 0.34, t * 0.8, t), mat(0, s * 0.86, 0))
  g.add('tmIron', metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.34, 0, 0, 0, 0.3))
  for (const [px, py] of [[0, s], [-s * 0.31, s * 0.68], [s * 0.31, s * 0.68], [-s * 0.17, s * 0.86], [s * 0.17, s * 0.86]] as [number, number][]) g.add('tmIron', new THREE.SphereGeometry(s * 0.045, 6, 5), mat(px, py, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** Twisted ribbon on a cylinder (slit window) between y0 and y1. */
function helixRibbon(b: Builder, key: string, cx: number, cz: number, r: number, y0: number, y1: number, phi0: number, twist: number, w: number) {
  const n = 10
  const pos: number[] = []
  const P = (phi: number, y: number) => [cx + Math.cos(phi) * r, y, cz + Math.sin(phi) * r]
  const dphi = w / (2 * r)
  for (let i = 0; i < n; i++) {
    const t0 = i / n
    const t1 = (i + 1) / n
    const p0 = phi0 + twist * t0
    const p1 = phi0 + twist * t1
    const ya = y0 + (y1 - y0) * t0
    const yb = y0 + (y1 - y0) * t1
    const A = P(p0 + dphi, ya)
    const B = P(p0 - dphi, ya)
    const C = P(p1 - dphi, yb)
    const D = P(p1 + dphi, yb)
    pos.push(...A, ...B, ...C, ...A, ...C, ...D)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  b.add(key, g)
}

/** West drum: cylinder with spiral flutes, twisted slits, mouldings, dome, cross. */
function spiralDrum(b: Builder, x: number, z: number, r: number, y0: number, y1: number) {
  b.add(WALL, new THREE.CylinderGeometry(r, r, y1 - y0, 36, 1, true), mat(x, (y0 + y1) / 2, z))
  // base mouldings and arcade band
  b.add(TRIM, new THREE.CylinderGeometry(r + 0.25, r + 0.3, 0.5, 36), mat(x, y0 + 0.25, z))
  b.add(TRIM, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.25, 36), mat(x, y0 + 0.75, z))
  // top cornice with corbel band
  b.add(TRIM, new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.6, 36), mat(x, y1 - 0.5, z))
  b.add(TRIM, new THREE.CylinderGeometry(r + 0.4, r + 0.18, 0.35, 36), mat(x, y1 - 0.02, z))
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    b.add(TRIM, metricBox(0.16, 0.3, 0.22), mat(x + Math.cos(a) * (r + 0.24), y1 - 0.95, z + Math.sin(a) * (r + 0.24), -a))
  }
  // spiral flutes (12 ribs), half-twist ~70°
  const ya = y0 + 0.95
  const yb = y1 - 1.0
  const twist = 70 * D2R
  const nR = 12
  for (let k = 0; k < nR; k++) {
    const p0 = (k / nR) * Math.PI * 2
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps
      const t1 = (i + 1) / steps
      const a0 = p0 + twist * t0
      const a1 = p0 + twist * t1
      const A = V(x + Math.cos(a0) * (r + 0.08), ya + (yb - ya) * t0, z + Math.sin(a0) * (r + 0.08))
      const B = V(x + Math.cos(a1) * (r + 0.08), ya + (yb - ya) * t1, z + Math.sin(a1) * (r + 0.08))
      const mid = (a0 + a1) / 2
      b.beam(TRIM, A, B, 0.26, 0.22, V(Math.cos(mid), 0, Math.sin(mid)))
    }
    // twisted slit windows in four of the flutes
    if (k % 3 === 1) helixRibbon(b, 'tmDark', x, z, r + 0.02, ya + 0.6, yb - 0.3, p0 + (Math.PI / nR) + twist * 0.1, twist * 0.8, 0.42)
  }
  const prof: [number, number][] = [
    [0.96, 0],
    [1.1, 0.1],
    [1.17, 0.24],
    [1.12, 0.4],
    [0.92, 0.58],
    [0.62, 0.74],
    [0.34, 0.87],
    [0.15, 0.96],
    [0.08, 1.0],
  ]
  const top = scaleDome(b, x, z, y1 + 0.12, r + 0.25, 2.5, prof)
  orthoCross(b, x, top, z, 2.1)
}

/** Small corner turret on the lateral block (square, arched faces, zinc cap, cross). */
function turret(b: Builder, x: number, z: number, y0: number) {
  const s = 1.9
  const h = 2.8
  b.block(WALL, s, h, s, x, y0, z)
  b.block(TRIM, s + 0.3, 0.3, s + 0.3, x, y0, z)
  b.block(TRIM, s + 0.4, 0.28, s + 0.4, x, y0 + h - 0.28, z)
  for (const [f, plane, u] of [['+x', x + s / 2, -z], ['-x', x - s / 2, z], ['+z', z + s / 2, x], ['-z', z - s / 2, -x]] as [Face, number, number][]) {
    const m = faceFrame(f, plane, u, 0, 0)
    b.add('tmDark', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.7, 1.6, 0, y0 + 0.45, 8))), M(m, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 0.7, 1.6, 0.12, 0, y0 + 0.45), 0.08, 8), M(m, mat(0, 0, 0.01)))
    for (const du of [-s / 2 + 0.12, s / 2 - 0.12]) b.add(TRIM, new THREE.CylinderGeometry(0.09, 0.09, h - 0.6, 8), M(m, mat(du, y0 + h / 2, 0.08)))
    // curved gablet on each face
    const g = new THREE.Shape()
    g.moveTo(-s / 2 - 0.15, 0)
    g.lineTo(s / 2 + 0.15, 0)
    g.quadraticCurveTo(s / 2 - 0.2, 0.15, 0.12, 0.55)
    g.lineTo(0, 0.75)
    g.lineTo(-0.12, 0.55)
    g.quadraticCurveTo(-s / 2 + 0.2, 0.15, -s / 2 - 0.15, 0)
    b.add(TRIM, extrude(g, 0.12, 6), M(m, mat(0, y0 + h, -0.05)))
  }
  // zinc ogee cap
  const yc = y0 + h + 0.05
  b.add(ZN, lathe([[s * 0.66, 0], [s * 0.6, 0.25], [s * 0.42, 0.55], [s * 0.18, 0.85], [s * 0.08, 1.05], [0, 1.1]], 4), mat(x, yc, z, Math.PI / 4))
  orthoCross(b, x, yc + 1.05, z, 1.0)
}

function build(): Builder {
  const b = new Builder()

  /* ================= main volumes ================= */
  block(b, WB.x0, WB.x1, WB.hw, EAVE, true)
  block(b, NB.x0, NB.x1, NB.hw, EAVE, true)
  block(b, LB.x0, LB.x1, LB.hw, EAVE, true)

  // apse (polygon)
  {
    const ring = (grow: number, y: number) => APSE.map(([x, z]) => V(x + (x > 14 ? grow * 0.8 : 0), y, z + Math.sign(z) * grow))
    const wall = (key: string, grow: number, y0: number, y1: number) => {
      const a = ring(grow, y0)
      const c = ring(grow, y1)
      for (let i = 0; i < a.length - 1; i++) {
        const d = a[i + 1].clone().sub(a[i])
        facet(b, key, [a[i], a[i + 1], c[i + 1], c[i]], { hint: V(d.z, 0, -d.x) })
      }
    }
    wall(WALL, 0, 0, EAVE)
    wall('tmSocle', 0.12, 0, FL + 0.6)
    wall(TRIM, 0.15, EAVE - 3.4, EAVE - 3.15)
    wall(TRIM, 0.15, EAVE - 1.1, EAVE - 0.55)
    wall(TRIM, 0.35, EAVE - 0.55, EAVE - 0.3)
    wall(TRIM, 0.5, EAVE - 0.3, EAVE)
    // apse roof: facets from the eave polygon up to a ridge point at the tower base
    const e = ring(0.5, EAVE)
    const apex = V(ARM.x1, EAVE + 2.6, 0)
    for (let i = 0; i < e.length - 1; i++) facet(b, ZN, [e[i], e[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    for (const p of e.slice(1, -1)) b.beam(ZN, p.clone().setY(p.y + 0.05), apex.clone().setY(apex.y + 0.05), 0.16, 0.1)
    // windows: lower small rectangular, upper arched, rosettes/panels
    for (let i = 0; i < APSE.length - 1; i++) {
      const p = V(APSE[i][0], 0, APSE[i][1])
      const q = V(APSE[i + 1][0], 0, APSE[i + 1][1])
      const mid = p.clone().add(q).multiplyScalar(0.5)
      const d = q.clone().sub(p)
      const a = Math.atan2(-d.x, d.z)
      const m = wallAt(mid.x, mid.z, a)
      win(b, m, 0, 5.2, 1.3, 3.2)
      b.add('tmDark', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.6, 1.2, 0, FL + 1.2))), M(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('rect', 0.6, 1.2, 0.15, 0, FL + 1.2), 0.08), M(m, mat(0, 0, 0.01)))
      b.add(TRIM, metricBox(1.0, 1.0, 0.1), M(m, mat(0, 10.4, 0.05)))
      b.add(TRIM, new THREE.TorusGeometry(0.4, 0.07, 6, 16), M(m, mat(0, 10.4, 0.12)))
    }
  }

  /* ================= raised central nave + N/S arms + crossing ================= */
  {
    // west arm (nave) from the façade to the crossing
    const x0 = WB.x0
    const x1 = ARM.x0
    const w = x1 - x0
    b.block(WALL, w, HIGH, 2 * CN.hw, (x0 + x1) / 2, 0, 0)
    b.block(TRIM, w + 0.5, 0.55, 2 * CN.hw + 0.5, (x0 + x1) / 2, HIGH - 1.0, 0)
    b.block(TRIM, w + 0.9, 0.45, 2 * CN.hw + 0.9, (x0 + x1) / 2 - 0.2, HIGH - 0.45, 0)
    hip(b, (x0 + x1) / 2 + 0.2, 0, w + 1.0, 2 * CN.hw + 1.0, HIGH, 14)
    // N/S arms over the lateral block, gables with blind arcade and arched crest
    const ax = (ARM.x0 + ARM.x1) / 2
    const aw = ARM.x1 - ARM.x0
    b.block(WALL, aw, HIGH, 2 * LB.hw, ax, 0, 0)
    b.block(TRIM, aw + 0.5, 0.55, 2 * LB.hw + 0.5, ax, HIGH - 1.0, 0)
    b.block(TRIM, aw + 0.9, 0.45, 2 * LB.hw + 0.9, ax, HIGH - 0.45, 0)
    hip(b, ax, 0, aw + 1.0, 2 * LB.hw + 1.0, HIGH, 14)
    for (const sz of [-1, 1]) {
      const f: Face = sz > 0 ? '+z' : '-z'
      const m = faceFrame(f, sz * LB.hw, sz > 0 ? ax : -ax, 0, 0)
      // blind arcade under the high cornice + big twin window
      for (let i = 0; i < 5; i++) {
        const u = -aw / 2 + 1.0 + i * ((aw - 2.0) / 4)
        b.add(TRIM, extrude(frameShape('round', 0.75, 1.6, 0.1, u, HIGH - 2.9), 0.08, 8), M(m, mat(0, 0, 0.01)))
        b.add('tmWallShade', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 1.6, u, HIGH - 2.9, 8))), M(m, mat(0, 0, 0.02)))
      }
      win(b, m, 0, 5.4, 2.6, 4.8, { twin: true })
      rosette(b, m, 0, 11.5, 0.5)
      // side portal with steps (photo 07)
      const pm = faceFrame(f, sz * (LB.hw + 0.7), sz > 0 ? 0.2 : -0.2, 0, 0)
      b.block(WALL, 3.2, 6.2, 1.4, 0.2, 0, sz * (LB.hw + 0.35))
      b.block(TRIM, 3.5, 0.3, 1.6, 0.2, 6.0, sz * (LB.hw + 0.35))
      b.add('tmDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.4, 2.9, 0, FL))), M(pm, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 1.6, 3.9, 0.28, 0, FL), 0.15, 10), M(pm, mat(0, 0, 0.01)))
      for (const du of [-1.25, 1.25]) b.add(TRIM, new THREE.CylinderGeometry(0.14, 0.14, 4.0, 8), M(pm, mat(du, FL + 2.0, 0.12)))
      const g = new THREE.Shape([new THREE.Vector2(-1.7, 0), new THREE.Vector2(1.7, 0), new THREE.Vector2(0, 1.3)])
      b.add(TRIM, extrude(g, 0.3), M(pm, mat(0, 6.3, -0.2)))
      for (let i = 0; i < 4; i++) b.block(TRIM, 3.2, FL * (1 - i / 4), 0.35, 0.2, 0, sz * (LB.hw + 1.55 + i * 0.35))
    }
    // west wall of the raised nave above the porch: arcade of five arched panels + cross ornament
    const fw = faceFrame('-x', WB.x0, 0, 0, 0)
    for (let i = 0; i < 5; i++) {
      const u = -3.4 + i * 1.7
      b.add(TRIM, extrude(frameShape('round', 1.0, 1.9, 0.14, u, HIGH - 3.6), 0.1, 8), M(fw, mat(0, 0, 0.01)))
      b.add('tmWallShade', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.0, 1.9, u, HIGH - 3.6, 8))), M(fw, mat(0, 0, 0.02)))
    }
    dentils(b, fw, -CN.hw, CN.hw, HIGH - 1.2)
    b.add(TRIM, metricBox(0.5, 1.6, 0.25), M(fw, mat(0, HIGH - 0.8, 0.12)))
    b.add(TRIM, metricBox(1.4, 0.45, 0.25), M(fw, mat(0, HIGH - 0.6, 0.12)))
    // crossing base with blind arcade, then the central drum
    const cs = 4.4
    b.block(WALL, 2 * cs, 2.6, 2 * cs, CX, HIGH, 0)
    b.block(TRIM, 2 * cs + 0.4, 0.3, 2 * cs + 0.4, CX, HIGH + 2.3, 0)
    b.block(ZN, 2 * cs + 0.45, 0.05, 2 * cs + 0.45, CX, HIGH + 2.6, 0)
    for (const [f, plane, uc] of [['+x', CX + cs, 0], ['-x', CX - cs, 0], ['+z', cs, CX], ['-z', -cs, -CX]] as [Face, number, number][]) {
      const m = faceFrame(f, plane, 0, 0, 0)
      for (let i = 0; i < 9; i++) {
        const u = uc - cs + 0.55 + i * ((2 * cs - 1.1) / 8)
        b.add(TRIM, extrude(frameShape('round', 0.5, 1.2, 0.08, u, HIGH + 0.7), 0.06, 6), M(m, mat(0, 0, 0.01)))
        b.add(TRIM, new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), M(m, mat(u + 0.4, HIGH + 1.2, 0.08)))
      }
    }
    const a = 3.25
    const R = a / Math.cos(Math.PI / 8)
    const y0 = HIGH + 2.65
    const y1 = y0 + 6.2
    prism(b, WALL, { x: CX, n: 8, r: R, y0, h: y1 - y0 })
    ringBand(b, TRIM, { x: CX, n: 8, r: R, y: y0, h: 0.5, grow: 0.15 })
    const fwid = 2 * a * Math.tan(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      const m = wallAt(CX + Math.cos(ang) * a, Math.sin(ang) * a, ang)
      win(b, m, 0, y0 + 1.2, 0.75, 3.6, { hood: false })
      // twin colonnettes at the edges + scalloped (arched) cornice
      for (const du of [-fwid / 2 + 0.18, fwid / 2 - 0.18]) b.add(TRIM, new THREE.CylinderGeometry(0.1, 0.1, y1 - y0 - 0.9, 8), M(m, mat(du, (y0 + y1) / 2 - 0.2, 0.1)))
      b.add(TRIM, extrude(frameShape('round', fwid - 0.55, 0.9, 0.16, 0, y1 - 1.1), 0.18, 10), M(m, mat(0, 0, 0.01)))
      dentils(b, m, -fwid / 2, fwid / 2, y1 - 0.15, 0.36)
    }
    ringBand(b, TRIM, { x: CX, n: 8, r: R, y: y1, h: 0.35, grow: 0.35 })
    const prof: [number, number][] = [
      [1.0, 0],
      [1.02, 0.14],
      [0.96, 0.32],
      [0.84, 0.52],
      [0.66, 0.7],
      [0.44, 0.85],
      [0.2, 0.96],
      [0.1, 1.0],
    ]
    const top = scaleDome(b, CX, 0, y1 + 0.35, R + 0.35, 2.4, prof)
    orthoCross(b, CX, top, 0, 2.4)
  }

  /* ================= west towers ================= */
  for (const sz of [-1, 1]) {
    const z = sz * TC.z
    const w = TWR.x1 - TWR.x0
    const d = TWR.z1 - TWR.z0
    b.block(WALL, w, TWR.top - EAVE, d, TC.x, EAVE, z)
    b.block(TRIM, w + 0.4, 0.5, d + 0.4, TC.x, TWR.top - 0.9, z)
    b.block(TRIM, w + 0.8, 0.4, d + 0.8, TC.x, TWR.top - 0.4, z)
    b.block(ZN, w + 0.85, 0.05, d + 0.85, TC.x, TWR.top, z)
    for (const [f, plane, u] of [['-x', TWR.x0, z], [sz > 0 ? '+z' : '-z', sz * TWR.z1, sz > 0 ? TC.x : -TC.x], ['+x', TWR.x1, -z]] as [Face, number, number][]) {
      const m = faceFrame(f, plane, 0, 0, 0)
      for (let i = 0; i < 4; i++) {
        const uu = u - 1.8 + i * 1.2
        b.add(TRIM, extrude(frameShape('round', 0.6, 1.4, 0.08, uu, EAVE + 1.0), 0.06, 6), M(m, mat(0, 0, 0.01)))
      }
      dentils(b, m, u - w / 2, u + w / 2, TWR.top - 1.1, 0.4)
    }
    spiralDrum(b, TC.x, z, 2.1, TWR.top + 0.05, TWR.top + 7.0)
  }

  /* ================= façades of the lower blocks ================= */
  {
    // west front of the pronaos block (under the towers): arched window + rosette
    const fw = faceFrame('-x', WB.x0, 0, 0, 0)
    for (const sz of [-1, 1]) {
      const u = sz * TC.z
      win(b, fw, u, 4.6, 1.5, 3.6)
      rosette(b, fw, u, 9.6, 0.42)
      dentils(b, fw, u - 2.7, u + 2.7, EAVE - 1.2)
    }
    // sides of the pronaos block
    for (const sz of [-1, 1]) {
      const f: Face = sz > 0 ? '+z' : '-z'
      const m = faceFrame(f, sz * WB.hw, 0, 0, 0)
      const U = (x: number) => (sz > 0 ? x : -x)
      win(b, m, U(-12.3), 4.6, 1.5, 3.6)
      rosette(b, m, U(-12.3), 9.6, 0.42)
      dentils(b, m, U(sz > 0 ? WB.x0 : WB.x1), U(sz > 0 ? WB.x1 : WB.x0), EAVE - 1.2)
      // recessed nave bay: two arched windows
      const mn = faceFrame(f, sz * NB.hw, 0, 0, 0)
      for (const x of [-7.6, -4.2]) {
        win(b, mn, U(x), 4.8, 1.2, 3.2)
        rosette(b, mn, U(x), 9.8, 0.35)
      }
      // lateral block: windows either side of the arm
      for (const x of [-0.9, 11.6]) {
        win(b, m, U(x), 4.8, 1.2, 3.2)
        rosette(b, faceFrame(f, sz * LB.hw, 0, 0, 0), U(x), 9.8, 0.35)
      }
    }
    // lateral block west & east faces beside the nave / apse
    for (const sz of [-1, 1]) {
      const mW = faceFrame('-x', LB.x0, 0, 0, 0)
      win(b, mW, sz * 8.4, 4.8, 1.2, 3.2)
      rosette(b, mW, sz * 8.4, 9.8, 0.35)
    }
    // corner turrets
    for (const [x, z] of [[LB.x0 + 1.2, -LB.hw + 1.2], [LB.x0 + 1.2, LB.hw - 1.2], [LB.x1 - 1.0, -LB.hw + 1.2], [LB.x1 - 1.0, LB.hw - 1.2]] as [number, number][]) turret(b, x, z, EAVE + 0.75)
    // low roofs behind the glazed bands
    const ry = EAVE + 0.75
    hip(b, (WB.x0 + WB.x1) / 2, 0, WB.x1 - WB.x0 - 0.4, 2 * WB.hw - 0.4, ry, 10)
    hip(b, (NB.x0 + NB.x1) / 2, 0, NB.x1 - NB.x0 + 0.2, 2 * NB.hw - 0.4, ry, 10)
    hip(b, (LB.x0 + LB.x1) / 2, 0, LB.x1 - LB.x0 - 0.4, 2 * LB.hw - 0.4, ry, 10)
  }

  /* ================= porch ================= */
  {
    const { x0, x1, hw } = PORCH
    const px = (x0 + x1) / 2
    // podium + steps
    b.block('tmSocle', x1 - x0 + 0.4, FL, 2 * hw + 1.6, px, 0, 0)
    for (let i = 0; i < 4; i++) b.block('tmSocle', 0.38, FL * (1 - (i + 1) / 5), 2 * hw + 2.6, x0 - 0.2 - i * 0.38, 0, 0)
    const xs = x0 + 0.65
    const zs = [-4.0, -1.5, 1.5, 4.0]
    const ped = 1.3
    const sh = 3.1
    for (const x of [xs, x1 - 0.5]) {
      for (const z of x === xs ? zs : [-4.0, 4.0]) {
        b.block(TRIM, 0.95, ped, 0.95, x, FL, z)
        b.add(TRIM, new THREE.CylinderGeometry(0.27, 0.31, sh, 14), mat(x, FL + ped + sh / 2, z))
        b.add(TRIM, new THREE.CylinderGeometry(0.42, 0.28, 0.5, 14), mat(x, FL + ped + sh + 0.25, z))
        b.block(TRIM, 0.95, 0.18, 0.95, x, FL + ped + sh + 0.5, z)
      }
    }
    const yA = FL + ped + sh + 0.68
    // multifoil arcade (front) as a perforated slab
    const hs = new THREE.Shape([new THREE.Vector2(-hw, yA - 1.2), new THREE.Vector2(hw, yA - 1.2), new THREE.Vector2(hw, yA + 1.4), new THREE.Vector2(-hw, yA + 1.4)])
    const spans: [number, number][] = [[-4.0, -1.5], [-1.5, 1.5], [1.5, 4.0]]
    const foil = (u0: number, u1: number) => {
      const c = (u0 + u1) / 2
      const r = (u1 - u0) / 2 - 0.3
      const p: THREE.Vector2[] = [new THREE.Vector2(c - r, yA - 1.21)]
      // three lobes + pointed top
      for (let i = 0; i <= 6; i++) {
        const t = Math.PI - (i / 6) * (Math.PI / 2)
        p.push(new THREE.Vector2(c - r * 0.55 + Math.cos(t) * r * 0.45, yA - 0.3 + Math.sin(t) * r * 0.45))
      }
      p.push(new THREE.Vector2(c, yA + 0.15 + r * 0.55))
      for (let i = 0; i <= 6; i++) {
        const t = Math.PI / 2 - (i / 6) * (Math.PI / 2)
        p.push(new THREE.Vector2(c + r * 0.55 + Math.cos(t) * r * 0.45, yA - 0.3 + Math.sin(t) * r * 0.45))
      }
      p.push(new THREE.Vector2(c + r, yA - 1.21))
      return p
    }
    for (const [u0, u1] of spans) hs.holes.push(new THREE.Path(foil(u0, u1).reverse()))
    b.add(TRIM, extrude(hs, 0.6, 6), mat(xs + 0.3, 0, 0, -Math.PI / 2))
    for (const sz of [-1, 1]) {
      const ss = new THREE.Shape([new THREE.Vector2(xs - 0.3, yA - 1.2), new THREE.Vector2(x1, yA - 1.2), new THREE.Vector2(x1, yA + 1.4), new THREE.Vector2(xs - 0.3, yA + 1.4)])
      ss.holes.push(new THREE.Path(foil(xs + 0.4, x1 - 0.5).reverse()))
      b.add(TRIM, extrude(ss, 0.5), mat(0, 0, sz > 0 ? hw - 0.5 : -hw, 0))
    }
    // ornate attic: frieze, finial balls, pointed central pediment
    const yT = yA + 1.4
    b.block(TRIM, x1 - x0 - 0.2, 0.35, 2 * hw + 0.4, px, yT, 0)
    b.block(WALL, x1 - x0 - 0.6, 1.3, 2 * hw, px, yT + 0.35, 0)
    b.block(TRIM, x1 - x0 - 0.3, 0.3, 2 * hw + 0.3, px, yT + 1.65, 0)
    for (const z of [-4.6, -3.6, -2.6, 2.6, 3.6, 4.6]) {
      b.add(TRIM, new THREE.CylinderGeometry(0.1, 0.16, 0.35, 8), mat(xs - 0.1, yT + 2.12, z))
      b.add(TRIM, new THREE.SphereGeometry(0.2, 8, 6), mat(xs - 0.1, yT + 2.45, z))
    }
    const ped2 = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 2.0)])
    b.add(TRIM, extrude(ped2, 0.6), mat(xs - 0.2, yT + 1.95, 0, -Math.PI / 2))
    b.add(TRIM, extrude(frameShape('rect', 2.4, 1.0, 0.1, 0, yT + 0.45), 0.08), mat(xs - 0.32, 0, 0, -Math.PI / 2))
    // zinc roof over the porch, behind the attic
    hip(b, px + 0.3, 0, x1 - x0 - 0.2, 2 * hw - 0.2, yT + 1.95, 16)
    // portal on the façade inside the porch
    const fw = faceFrame('-x', WB.x0, 0, 0, 0)
    b.add('tmDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.1, 4.3, 0, FL))), M(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 2.1, 4.3, 0.35, 0, FL), 0.2, 10), M(fw, mat(0, 0, 0.01)))
    for (const u of [-2.6, 2.6]) {
      b.add('tmIcon', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, 2.6, u, FL + 1.3, 8))), M(fw, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('round', 1.2, 2.6, 0.12, u, FL + 1.3), 0.08, 8), M(fw, mat(0, 0, 0.01)))
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-12.2, 25, 7.2],
  materials: (base) => {
    const dome = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    dome.color = new THREE.Color('#c2c8cd')
    dome.roughness = 0.48
    return {
      tmWall: new THREE.MeshStandardMaterial({ color: '#efe8d8', roughness: 0.88 }),
      tmWallShade: new THREE.MeshStandardMaterial({ color: '#e2d9c4', roughness: 0.9 }),
      tmTrim: new THREE.MeshStandardMaterial({ color: '#e3d5b6', roughness: 0.85 }),
      tmSocle: new THREE.MeshStandardMaterial({ color: '#d9cfba', roughness: 0.88 }),
      tmDark: new THREE.MeshStandardMaterial({ color: '#2d2f33', roughness: 0.7 }),
      tmDoor: new THREE.MeshStandardMaterial({ color: '#3b2a20', roughness: 0.65 }),
      tmIcon: new THREE.MeshStandardMaterial({ color: '#8a6a3c', roughness: 0.6 }),
      tmIron: new THREE.MeshStandardMaterial({ color: '#8f969c', roughness: 0.35, metalness: 0.8 }),
      tmDomeZinc: dome,
    }
  },
  notes:
    'Neo-Romanian cathedral with twisted (spiral-fluted) west drums, a central octagonal drum and corner turrets; fish-scale zinc domes and standing-seam roofs in natural titanium-zinc as photographed after the restoration; ornament simplified.',
}
export default model
