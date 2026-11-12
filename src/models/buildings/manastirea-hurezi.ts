/**
 * Mănăstirea Hurezi (Horezu) — Biserica mare „Sf. Împărați Constantin și Elena”,
 * the Brâncoveanu catholicon (OSM way 1388740606). Copper roofs per the COLOR
 * METAL records (copper, 2021).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 90.3° towards the altar (east), +Z = south; the open porch
 * and its entrance pavilion face −X). Sources: three Commons photographs
 * (01 porch corner from the SW, 02 whole south-west view, 03 porch corner looking
 * up) and the OSM outline (36.8 × 16.6 m with the lateral conchs).
 *  - Entrance pavilion in front of the porch centre (OSM protrusion 2.4 × 4.2 m):
 *    four stone columns, round arches, painted frieze, low octagonal bell dome.
 *  - Open porch (pridvor) x −16 … −7.6, full width 13.3 m, on a ≈ 1.1 m podium:
 *    stone columns with carved capitals, two arches either side of the centre on
 *    the west front, four arches on each side (02); above: the cable band, the
 *    upper register of blind arches with medallions, dentil cornice, broad eave
 *    with a timber soffit (01, 03). Its own hipped roof, ≈ 0.5 m lower than the
 *    body roof, running into the body roof (step visible in 02).
 *  - Body (pronaos + naos) x −7.6 … 11.1, eave ≈ 10.9 m: lower register with
 *    tall framed windows, mid band, blind arcade with medallions above, long
 *    hipped roof (≈ 30°); lateral conchs of the naos (OSM) with lower half-cone
 *    roofs tucked under the main eave; narrower altar bay and polygonal apse with
 *    lower eave (≈ 9.2 m, 02).
 *  - Two octagonal towers on square bases (pronaos x ≈ −2.6, naos x ≈ 7.3):
 *    tall arched slit windows, corner colonettes, small blind arches, dentil
 *    cornice, broad timber-soffited eave and a low octagonal cap with an iron
 *    cross (02).
 *  - METAL: the photographs (2012–2019) show dark grey sheet roofs; the roofs,
 *    tower caps and pavilion dome are shown in weathered copper (copperBrown,
 *    seams ≈ 0.5 m) per the register — which surfaces were done is not documented.
 * Approximations: heights estimated from the photographs (no survey data); north
 * side mirrored from the south; the OSM outline is symmetrised about the axis;
 * conch and apse shapes simplified; ornament (cable mouldings, painted frieze,
 * capitals) reduced to bands, frames and discs.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, hipRoof, loft, polyRing, prism, ringBand, gableRoof, polygonalApse, seams, faceFrame } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'plasterWhite'
const ORN = 'plasterCream'
const COL = 'stoneWarm'
const SOFF = 'timber'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const D2R = Math.PI / 180
const PITCH = 30
const T = Math.tan(PITCH * D2R)
const OV = 1.1

const PAV = { x0: -18.4, x1: -16.0, hw: 2.15, imp: 3.9, top: 6.3 }
const PORCH = { x0: -16.0, x1: -7.6, hw: 6.65, eave: 10.4, pod: 1.1, imp: 4.2 }
const BODY = { x0: -7.6, x1: 11.1, hw: 6.65, eave: 10.9 }
const CONCH = { x: 7.3, zc: 5.6, r: 2.8, eave: 9.0 }
const ALTAR = { x0: 11.1, x1: 13.7, hw: 4.7, eave: 9.2 }
const TOWERS = [-2.6, 7.3]
const TW = { base: 5.6, y0: 9.0, yb: 15.1, r: 2.6, yd: 22.3 }

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

/** Opening: dark glass with a raised surround. */
function op(b: Builder, m: THREE.Matrix4, o: { w: number; h: number; y0: number; u?: number; type?: OpeningType; glass?: string; frame?: number; frameKey?: string; off?: number }) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.14
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? ORN, extrude(frameShape(type, o.w, o.h, f, u, o.y0), 0.12, 8), mul(m, mat(0, 0, off)))
}

/** Half-annulus archivolt round an arch (centre c, springing y, inner radius r). */
function archRing(b: Builder, key: string, m: THREE.Matrix4, c: number, y: number, r: number, f: number, depth = 0.1) {
  const pts: THREE.Vector2[] = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI
    pts.push(new THREE.Vector2(c + Math.cos(a) * (r + f), y + Math.sin(a) * (r + f)))
  }
  for (let i = n; i >= 0; i--) {
    const a = (i / n) * Math.PI
    pts.push(new THREE.Vector2(c + Math.cos(a) * r, y + Math.sin(a) * r))
  }
  b.add(key, extrude(new THREE.Shape(pts), depth, 4), mul(m, mat(0, 0, 0.01)))
}

/** Wall slab above the imposts with round arches cut from below (façade-local u). */
function arcadeWall(b: Builder, face: Face, plane: number, u0: number, u1: number, yImp: number, yTop: number, arches: [number, number][], depth = 0.6) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(u0, yImp)]
  for (const [c, w] of [...arches].sort((p, q) => p[0] - q[0])) {
    const r = w / 2
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI - (i / 14) * Math.PI
      pts.push(new THREE.Vector2(c + Math.cos(a) * r, yImp + Math.sin(a) * r))
    }
  }
  pts.push(new THREE.Vector2(u1, yImp), new THREE.Vector2(u1, yTop), new THREE.Vector2(u0, yTop))
  const m = faceFrame(face, plane, 0, 0, 0)
  b.add(WALL, extrude(new THREE.Shape(pts), depth, 4), mul(m, mat(0, 0, -depth)))
  for (const [c, w] of arches) archRing(b, ORN, m, c, yImp, w / 2, 0.16)
}

/** Stone column with base, carved capital (flared) and abacus. */
function column(b: Builder, x: number, z: number, y0: number, h: number) {
  b.add(COL, new THREE.CylinderGeometry(0.3, 0.33, 0.28, 12), mat(x, y0 + 0.14, z))
  b.add(COL, new THREE.CylinderGeometry(0.19, 0.22, h - 0.8, 12), mat(x, y0 + 0.28 + (h - 0.8) / 2, z))
  b.add(COL, new THREE.CylinderGeometry(0.34, 0.2, 0.36, 12), mat(x, y0 + h - 0.52 + 0.18, z))
  b.add(COL, metricBox(0.74, 0.16, 0.74), mat(x, y0 + h - 0.08, z))
}

/** Blind arcade with medallions (upper register of the façades). */
function medallions(b: Builder, face: Face, plane: number, us: number[], y0: number, w: number, h: number) {
  for (const u of us) {
    const m = faceFrame(face, plane, u, 0, 0)
    b.add(ORN, extrude(frameShape('round', w, h, 0.1, 0, y0), 0.07, 8), m)
    b.add(ORN, new THREE.TorusGeometry(w * 0.3, 0.045, 5, 18), mul(m, mat(0, y0 + h - w * 0.5 - 0.1, 0.05)))
  }
}

/** Sloped timber soffit under a roof overhang (one side of a hipped/gabled roof). */
function soffit(b: Builder, a0: THREE.Vector3, a1: THREE.Vector3, e1: THREE.Vector3, e0: THREE.Vector3) {
  const d = V(0, -0.14, 0)
  facet(b, SOFF, [a0.clone().add(d), a1.clone().add(d), e1.clone().add(d), e0.clone().add(d)], { hint: V(0, -1, 0), thickness: 0.04 })
}

/** Hipped roof with rolled hip/ridge caps (round caps read better than flat boxes). */
function hippedRoof(b: Builder, key: string, o: { x: number; z: number; w: number; d: number; y: number; pitch: number; overhang: number; seams: ReturnType<typeof seams> }) {
  const t = Math.tan(o.pitch * D2R)
  const r = hipRoof(o.x, o.z, o.w + 2 * o.overhang, o.d + 2 * o.overhang, o.y - o.overhang * t, o.pitch * D2R)
  for (const f of r.facets) facet(b, key, f, { seams: o.seams, thickness: 0.12 })
  for (const [a, c] of r.lines) b.rod(key, a.clone().add(V(0, 0.06, 0)), c.clone().add(V(0, 0.06, 0)), 0.07)
  return r.top
}

function orthoCross(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', new THREE.SphereGeometry(s * 0.08, 10, 8), mat(0, s * 0.05, 0))
  g.add('iron', metricBox(t, s * 0.95, t), mat(0, s * 0.52, 0))
  g.add('iron', metricBox(s * 0.6, t, t), mat(0, s * 0.72, 0))
  g.add('iron', metricBox(s * 0.34, t * 0.8, t), mat(0, s * 0.88, 0))
  g.add('iron', metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.4, 0, 0, 0, 0.35))
  // the openwork ring of the Brâncoveanu crosses
  g.add('iron', new THREE.TorusGeometry(s * 0.17, t * 0.35, 4, 16), mat(0, s * 0.72, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

/** Plaster dentil cornice + string under an eave (rectangle). */
function cornice(b: Builder, x: number, w: number, d: number, y: number) {
  b.box(ORN, w + 0.2, 0.22, d + 0.2, x, y - 0.58, 0)
  b.box(WALL, w + 0.42, 0.3, d + 0.42, x, y - 0.32, 0)
}

/** Cable-moulding mid band (brâu). */
function band(b: Builder, x: number, w: number, d: number, y: number) {
  b.box(ORN, w + 0.36, 0.34, d + 0.36, x, y, 0)
  b.box(WALL, w + 0.22, 0.16, d + 0.22, x, y - 0.27, 0)
}

function build(): Builder {
  const b = new Builder()
  const { x0: px0, x1: px1, hw, eave: PE, pod } = PORCH

  /* ---------------- porch podium, arcade, columns ---------------- */
  b.block(WALL, px1 - px0 + 0.3, pod, 2 * hw + 0.3, (px0 + px1) / 2, 0, 0)
  b.block('socle', px1 - px0 + 0.45, 0.25, 2 * hw + 0.45, (px0 + px1) / 2, 0, 0)
  // west front: corner, two arches each side, wide centre bay behind the pavilion
  const wCols = [-6.35, -4.27, -2.2, 2.2, 4.27, 6.35]
  const wArches: [number, number][] = [[-5.31, 1.66], [-3.235, 1.66], [0, 3.95], [3.235, 1.66], [5.31, 1.66]]
  arcadeWall(b, '-x', px0, -hw, hw, PORCH.imp, PE, wArches)
  for (const z of wCols) column(b, px0 + 0.3, z, pod, PORCH.imp - pod)
  // sides: four arches between the corner column and the body
  const sCols = [-15.7, -13.76, -11.82, -9.88, -7.95]
  const sArches: [number, number][] = []
  for (let i = 0; i < 4; i++) sArches.push([(sCols[i] + sCols[i + 1]) / 2, 1.56])
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    arcadeWall(b, face, s * hw, s > 0 ? px0 : -px1, s > 0 ? px1 : -px0, PORCH.imp, PE, sArches.map(([c, w]) => [s * c, w] as [number, number]))
    for (const x of sCols.slice(1)) column(b, x, s * (hw - 0.3), pod, PORCH.imp - pod)
  }
  // painted interior: vault soffit and the pronaos west wall
  b.box('fresco', px1 - px0 - 0.6, 0.2, 2 * hw - 1.2, (px0 + px1) / 2 + 0.3, 5.75, 0)
  b.add('fresco', metricBox(0.05, 4.6, 2 * hw - 1.3), mat(px1 - 0.03, pod + 2.3, 0))
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 3.1, 0, pod, 10))), faceFrame('-x', px1 - 0.06, 0, 0, 0))
  b.add(COL, extrude(frameShape('round', 1.6, 3.1, 0.3, 0, pod), 0.12, 10), faceFrame('-x', px1 - 0.08, 0, 0, 0))
  // band, upper register, cornice
  band(b, (px0 + px1) / 2, px1 - px0, 2 * hw, 6.0)
  medallions(b, '-x', px0, [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4], 7.0, 1.25, 2.45)
  for (const s of [-1, 1]) medallions(b, s > 0 ? '+z' : '-z', s * hw, sArches.map(([c]) => s * c), 7.0, 1.25, 2.45)
  cornice(b, (px0 + px1) / 2, px1 - px0, 2 * hw, PE)

  /* ---------------- entrance pavilion ---------------- */
  {
    const { x0, x1, hw: ph, imp, top } = PAV
    const xm = (x0 + x1) / 2
    b.block(WALL, x1 - x0, pod, 2 * ph + 0.4, xm, 0, 0)
    for (let i = 0; i < 4; i++) b.block(COL, 0.32, pod - (i + 1) * 0.22, 2.6, x0 - 0.16 - i * 0.32, 0, 0)
    for (const z of [-1.9, 1.9]) for (const x of [x0 + 0.3, x1 - 0.25]) column(b, x, z, pod, imp - pod)
    arcadeWall(b, '-x', x0, -ph, ph, imp, top, [[0, 3.3]], 0.45)
    for (const s of [-1, 1]) arcadeWall(b, s > 0 ? '+z' : '-z', s * ph, s > 0 ? x0 : -x1, s > 0 ? x1 : -x0, imp, top, [[s * xm, 1.6]], 0.45)
    // painted frieze above the arches
    b.box('fresco', x1 - x0 + 0.04, 0.55, 2 * ph + 0.04, xm, top - 0.45, 0)
    b.box(ORN, x1 - x0 + 0.5, 0.2, 2 * ph + 0.5, xm, top + 0.1, 0)
    b.box('fresco', x1 - x0 - 0.8, 0.12, 2 * ph - 0.8, xm, 5.0, 0)
    // low octagonal bell dome (scaled to the oblong plan)
    const prof: [number, number][] = [[1.06, 0], [1.0, 0.12], [0.92, 0.42], [0.77, 0.78], [0.53, 1.06], [0.26, 1.24], [0.05, 1.3]]
    const R = 2.45
    const y0 = top + 0.2
    const rings = prof.map(([r, y]) => polyRing(8, r * R, y0 + y * 1.25, Math.PI / 8))
    const sx = (x1 - x0 + 0.5) / (2 * ph + 0.5)
    b.add(CU, loft(rings, { capBottom: true }), mat(xm, 0, 0, 0, 0, 0, sx, 1, 1))
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4
      for (let i = 0; i < prof.length - 1; i++) {
        const p = (j: number) => V(xm + Math.cos(a) * prof[j][0] * R * sx * 1.01, y0 + prof[j][1] * 1.25 + 0.02, Math.sin(a) * prof[j][0] * R * 1.01)
        b.beam(CU, p(i), p(i + 1), 0.06, 0.05)
      }
    }
    b.add(CU, new THREE.CylinderGeometry(0.08, 0.16, 0.35, 8), mat(xm, y0 + 1.62, 0))
    orthoCross(b, xm, y0 + 1.75, 0, 1.2)
  }

  /* ---------------- porch roof (hip at the west, valleys into the body roof) ---------------- */
  {
    const he = hw + OV
    const yE = PE - OV * T
    const yR = PE + hw * T
    const xw = px0 - OV
    const xr0 = px0 + hw
    const xbw = BODY.x0 - OV
    const step = (BODY.eave - PE) / T
    const xv0 = xbw - step // valley foot on the porch eave line
    const xv1 = xbw + he - step // valley top on the ridge
    for (const s of [-1, 1]) {
      facet(b, CU, [V(xw, yE, s * he), V(xv0, yE, s * he), V(xv1, yR, 0), V(xr0, yR, 0)], { seams: SEAM, thickness: 0.12 })
      b.rod(CU, V(xw, yE + 0.06, s * he), V(xr0, yR + 0.06, 0), 0.07)
      b.beam(CU, V(xv0, yE + 0.02, s * he), V(xv1, yR + 0.02, 0), 0.16, 0.06)
      soffit(b, V(px0, PE, s * hw), V(px1, PE, s * hw), V(xv0, yE, s * he), V(xw, yE, s * he))
      b.beam(CU, V(xw, yE - 0.08, s * (he + 0.06)), V(xv0, yE - 0.08, s * (he + 0.06)), 0.16, 0.16)
    }
    facet(b, CU, [V(xw, yE, -he), V(xw, yE, he), V(xr0, yR, 0)], { seams: SEAM, thickness: 0.12 })
    soffit(b, V(px0, PE, hw), V(px0, PE, -hw), V(xw, yE, -he), V(xw, yE, he))
    b.rod(CU, V(xr0, yR + 0.07, 0), V(xv1, yR + 0.07, 0), 0.08)
  }

  /* ---------------- body: pronaos + naos ---------------- */
  {
    const { x0, x1, eave } = BODY
    const xm = (x0 + x1) / 2
    const L = x1 - x0
    b.block(WALL, L, eave, 2 * hw, xm, 0, 0)
    b.block(WALL, L + 0.25, pod, 2 * hw + 0.25, xm, 0, 0)
    b.block('socle', L + 0.4, 0.25, 2 * hw + 0.4, xm, 0, 0)
    band(b, xm, L, 2 * hw, 6.0)
    cornice(b, xm, L, 2 * hw, eave)
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '+z' : '-z'
      const plane = s * hw
      // lower register: framed rectangular panels with tall windows
      for (const x of [-5.9, -3.3, -0.7, 1.9]) {
        const m = faceFrame(face, plane, s * x, 0, 0)
        b.add(ORN, extrude(frameShape('rect', 1.7, 3.4, 0.1, 0, 1.6), 0.06, 4), m)
        op(b, m, { w: 0.62, h: 1.9, y0: 2.3, type: 'rect', frame: 0.12 })
      }
      const us: number[] = []
      for (let x = x0 + 1.0; x < x1 - 0.5; x += 1.85) if (x < 4.0 || x > 10.4) us.push(s * x)
      medallions(b, face, plane, us, 7.0, 1.25, 2.45)
    }

    // lateral conchs of the naos
    for (const s of [-1, 1]) {
      const { x: cx, r, eave: ct } = CONCH
      const cz = s * CONCH.zc
      const a = s * (Math.PI / 2)
      const half = (key: string, pts: [number, number][], seg = 5) =>
        b.add(key, new THREE.LatheGeometry(pts.map(([rr, y]) => new THREE.Vector2(Math.max(rr, 0.01), y)), seg, -a, Math.PI), mat(cx, 0, cz))
      half(WALL, [[r, 0], [r, ct]])
      half(WALL, [[r + 0.12, 0], [r + 0.12, pod]])
      half(ORN, [[r + 0.12, 5.83], [r + 0.18, 6.17]])
      half(ORN, [[r + 0.1, ct - 0.55], [r + 0.22, ct]])
      half(CU, [[r + 0.75, ct - 0.42], [0.05, ct + 2.05]], 10)
      for (let k = 0; k <= 5; k++) {
        const ph = a - Math.PI / 2 + (k / 5) * Math.PI
        b.beam(CU, V(cx + Math.cos(ph) * (r + 0.75), ct - 0.38, cz + Math.sin(ph) * (r + 0.75)), V(cx, ct + 2.08, cz), 0.1, 0.06)
      }
      const ap = r * Math.cos(Math.PI / 10)
      for (const k of [-1, 0, 1]) {
        const t = a + (k * Math.PI) / 5
        const m = wallAt(cx + Math.cos(t) * ap, cz + Math.sin(t) * ap, t)
        op(b, m, { w: 0.5, h: 1.6, y0: 2.6, type: 'rect', frame: 0.12, off: 0.02 })
        b.add(ORN, new THREE.TorusGeometry(0.36, 0.04, 5, 16), mul(m, mat(0, 7.5, 0.05)))
      }
    }

    // body roof
    hippedRoof(b, CU, { x: xm, z: 0, w: L, d: 2 * hw, y: eave, pitch: PITCH, overhang: OV, seams: SEAM })
    const yE = eave - OV * T
    const he = hw + OV
    for (const s of [-1, 1]) {
      soffit(b, V(x0, eave, s * hw), V(x1, eave, s * hw), V(x1 + OV, yE, s * he), V(x0, yE, s * he))
      b.beam(CU, V(x0, yE - 0.08, s * (he + 0.06)), V(x1 + OV, yE - 0.08, s * (he + 0.06)), 0.16, 0.16)
    }
    soffit(b, V(x1, eave, -hw), V(x1, eave, hw), V(x1 + OV, yE, he), V(x1 + OV, yE, -he))
  }

  /* ---------------- altar bay + polygonal apse ---------------- */
  {
    const { x0, x1, hw: ah, eave } = ALTAR
    b.block(WALL, x1 - x0, eave, 2 * ah, (x0 + x1) / 2, 0, 0)
    b.block(WALL, x1 - x0, pod, 2 * ah + 0.25, (x0 + x1) / 2, 0, 0)
    gableRoof(b, CU, { x: (x0 + x1) / 2 - 0.4, z: 0, w: x1 - x0 + 0.8, d: 2 * ah, y: eave, pitch: PITCH, ridge: 'x', overhang: 0.9, seams: SEAM })
    polygonalApse(b, { x0: x1, hw: ah, y: eave, sides: 5, wallKey: WALL, roofKey: CU, pitch: PITCH, seams: SEAM, overhang: 0.9 })
    const R = ah / Math.cos(Math.PI / 10)
    const ring = (rr: number, y: number) => {
      const pts = [V(x0, y, -rr * Math.cos(Math.PI / 10))]
      for (let i = 0; i <= 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        pts.push(V(x1 + Math.cos(a) * rr, y, Math.sin(a) * rr))
      }
      pts.push(V(x0, y, rr * Math.cos(Math.PI / 10)))
      return pts
    }
    for (const [y, h, g] of [[0, pod, 0.14], [5.83, 0.34, 0.2], [eave - 0.7, 0.45, 0.2]] as [number, number, number][]) {
      b.add(y === 0 ? WALL : ORN, loft([ring(R + g, y), ring(R + g, y + h)], { capTop: true, capBottom: true, flat: true }))
    }
    const ap = R * Math.cos(Math.PI / 10)
    for (const k of [-2, -1, 0, 1, 2]) {
      const t = (k * Math.PI) / 5
      const m = wallAt(x1 + Math.cos(t) * ap, Math.sin(t) * ap, t)
      if (Math.abs(k) < 2) op(b, m, { w: 0.5, h: 1.5, y0: 2.8, type: 'round', frame: 0.12, off: 0.02 })
      b.add(ORN, extrude(frameShape('round', 1.2, 1.9, 0.09, 0, 6.6), 0.06, 8), mul(m, mat(0, 0, 0.01)))
      b.add(ORN, new THREE.TorusGeometry(0.34, 0.04, 5, 16), mul(m, mat(0, 7.5, 0.05)))
    }
  }

  /* ---------------- towers ---------------- */
  for (const tx of TOWERS) {
    const { base, y0, yb, r, yd } = TW
    b.block(WALL, base, yb - y0, base, tx, y0, 0)
    b.box(ORN, base + 0.3, 0.3, base + 0.3, tx, yb - 0.25, 0)
    hippedRoof(b, CU, { x: tx, z: 0, w: base, d: base, y: yb, pitch: 20, overhang: 0.4, seams: SEAM })
    // drum
    const dy0 = yb + 0.4
    prism(b, WALL, { x: tx, n: 8, r, y0: dy0 - 0.4, h: yd - dy0 + 0.4 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: dy0, h: 0.3, grow: 0.12 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: yd - 2.1, h: 0.3, grow: 0.1 })
    ringBand(b, ORN, { x: tx, n: 8, r, y: yd - 0.45, h: 0.2, grow: 0.12 })
    ringBand(b, WALL, { x: tx, n: 8, r, y: yd - 0.25, h: 0.25, grow: 0.22 })
    const ap = r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(tx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      op(b, m, { w: 0.42, h: 2.9, y0: dy0 + 0.75, type: 'round', frame: 0.1, off: 0.01 })
      b.add(ORN, extrude(frameShape('round', 1.2, 3.75, 0.08, 0, dy0 + 0.4), 0.05, 8), mul(m, mat(0, 0, 0.01)))
      b.add(ORN, extrude(frameShape('round', 1.15, 1.05, 0.08, 0, yd - 1.7), 0.05, 8), mul(m, mat(0, 0, 0.01)))
      b.add(ORN, new THREE.TorusGeometry(0.26, 0.035, 4, 14), mul(m, mat(0, yd - 1.2, 0.04)))
      // corner colonettes
      const c = Math.PI / 8 + (k * Math.PI) / 4
      b.add(ORN, new THREE.CylinderGeometry(0.08, 0.08, yd - dy0 - 0.5, 6), mat(tx + Math.cos(c) * (r + 0.02), (dy0 + yd - 0.5) / 2 + 0.05, Math.sin(c) * (r + 0.02)))
    }
    // broad eave: timber soffit + low octagonal copper cap
    const ye = yd
    b.add(SOFF, loft([polyRing(8, r + 1.15, ye - 0.08, Math.PI / 8, tx, 0), polyRing(8, r + 0.02, ye + 0.22, Math.PI / 8, tx, 0)], { capBottom: false, capTop: false, flat: true }))
    const st: [number, number][] = [[r + 1.2, ye - 0.05], [r + 1.17, ye + 0.08], [0.45, ye + 1.45], [0.14, ye + 1.6]]
    b.add(CU, loft(st.map(([rr, y]) => polyRing(8, rr, y, Math.PI / 8, tx, 0)), { capBottom: true, capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const c = Math.PI / 8 + (k * Math.PI) / 4
      b.beam(CU, V(tx + Math.cos(c) * (r + 1.17), ye + 0.1, Math.sin(c) * (r + 1.17)), V(tx + Math.cos(c) * 0.45, ye + 1.47, Math.sin(c) * 0.45), 0.09, 0.06)
    }
    b.add(CU, new THREE.CylinderGeometry(0.1, 0.18, 0.35, 8), mat(tx, ye + 1.75, 0))
    orthoCross(b, tx, ye + 1.85, 0, 2.3)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [2.5, 13.2, 4.5],
  materials: () => ({
    fresco: new THREE.MeshStandardMaterial({ color: '#7d6550', roughness: 0.85 }),
  }),
  notes:
    'Brâncoveanu catholicon interpreted from three photographs and the OSM outline; heights estimated. The photographs show dark grey sheet roofs — the copper finish follows the 2021 project record (surfaces not documented).',
}
export default model
