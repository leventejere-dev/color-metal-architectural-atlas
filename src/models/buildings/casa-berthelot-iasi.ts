/**
 * Casa „General Henri Mathias Berthelot”, Iași (OSM way 206525143) — eclectic,
 * neo-baroque villa with French mansard roofs in elZinc Slate titanium-zinc.
 *
 * Modelling specification (real metres, +X = OSM long axis 154.5° pointing to the
 * street front, +Z = the side towards the older neighbour (234.5°), −Z = the side
 * alley with the domed tower):
 *  - Plan after the OSM outline: front block 19.0 m wide × 11.0 m, two rear arms
 *    (≈ 5.7 / 4.8 m deep) framing a small rear courtyard with steps; a central
 *    front risalit (≈ 6.9 m) and an imperial double stair with a curved landing.
 *    A lower rear wing with a plain hipped standing-seam roof continues the −Z arm
 *    (photos 01, 02, 07 — beyond the OSM outline).
 *  - Raised ground floor on an ochre socle (floor ≈ 1.6 m), one tall main storey
 *    (cornice ≈ 6.9 m), mansard attic: steep lower slopes (≈ 70°) in dark
 *    diamond-pattern zinc shingles up to a curb at ≈ 9.8 m, low standing-seam
 *    upper roofs (≈ 15°, seams 0.5 m) above; ox-eye dormers with stucco frames and
 *    zinc hoods at the foot of the mansard.
 *  - Central risalit: taller pavilion mansard (≈ 12.4 m) carrying a baroque
 *    aedicule dormer (arched French window, balcony on a console, scrolled
 *    pediment with cartouche); rusticated pilaster strips.
 *  - Corner tourelle at the front +Z corner with a small bell dome and spire;
 *    square side tower on the −Z side with an onion dome (diamond shingles), spire
 *    (≈ 16.8 m) and a glazed entrance vestibule at its foot.
 *  - Façades: cream-yellow render, white stucco quoins, cornices and window hoods,
 *    round- and segment-headed windows in brown timber frames.
 * Approximations: window counts on the +Z side and at the rear, stucco ornament
 * (simplified to blocks, scrolls and discs), the rear courtyard steps, dome
 * profiles, the diamond shingles shown as a diagonal grid.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, lathe, window_, door, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const UP = V(0, 1, 0)

/* ---------------- plan (m) ---------------- */
const XF = 6.73 // front wall of the main block
const XN = -4.32 // back wall of the main block inside the rear courtyard
const ZW = 9.52 // half width
const ARM_P = { x0: -10.0, x1: XN, z0: 2.18, z1: ZW } // +Z rear arm
const ARM_M = { x0: -9.15, x1: XN, z0: -ZW, z1: -3.7 } // −Z rear arm
const WING = { x0: -15.6, x1: -9.15, z0: -8.7, z1: -3.7 } // lower rear wing (photos)
const RIS = { x1: 7.63, hz: 3.45 } // central risalit
const TWR = { x0: -3.0, x1: 0.5, z0: -10.1, z1: -6.6 } // side tower (projects 0.58 m)

/* ---------------- heights (m) ---------------- */
const SOCLE = 1.45
const FLOOR = 1.6
const CORNICE = 6.9
const EAVE = 7.0
const LOW_PITCH = 70
const LOW_RISE = 2.8
const UP_PITCH = 15

const SEAM = seams('zincSlate', 0.5, 0.045, 0.04)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ================================================================== */
/* Diamond shingle pattern clipped to a planar convex facet             */
/* ================================================================== */
function diamondFacet(b: Builder, pts: THREE.Vector3[], spacing = 0.52, hint = UP) {
  facet(b, 'bertShingle', pts, { thickness: 0.1, hint })
  let n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.dot(hint) < 0) n = n.negate()
  let vdir = UP.clone().sub(n.clone().multiplyScalar(n.dot(UP)))
  if (vdir.lengthSq() < 1e-6) vdir = V(0, 0, -1)
  vdir.normalize()
  const udir = V().crossVectors(vdir, n).normalize()
  const d = pts[0].dot(n) + 0.015
  const poly = pts.map((p) => [p.dot(udir), p.dot(vdir)] as [number, number])
  // centroid for inside test orientation
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length
  let r = 0
  for (const [u, v] of poly) r = Math.max(r, Math.hypot(u - cx, v - cy))
  const dirs: [number, number][] = [
    [Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2],
  ]
  for (const [du, dv] of dirs) {
    const nu = -dv
    const nv = du
    const c0 = cx * nu + cy * nv
    for (let c = c0 - r; c <= c0 + r; c += spacing) {
      // line: p = base + t * dir, base on the normal offset c
      const bu = nu * c
      const bv = nv * c
      let t0 = -1e9
      let t1 = 1e9
      let ok = true
      for (let i = 0; i < poly.length && ok; i++) {
        const [au, av] = poly[i]
        const [eu, ev] = poly[(i + 1) % poly.length]
        // inward normal of edge (convex polygon, orientation by centroid)
        let inu = -(ev - av)
        let inv = eu - au
        if ((cx - au) * inu + (cy - av) * inv < 0) {
          inu = -inu
          inv = -inv
        }
        const num = (bu - au) * inu + (bv - av) * inv
        const den = du * inu + dv * inv
        if (Math.abs(den) < 1e-9) {
          if (num < 0) ok = false
          continue
        }
        const t = -num / den
        if (den > 0) t0 = Math.max(t0, t)
        else t1 = Math.min(t1, t)
      }
      if (!ok || t1 - t0 < 0.15) continue
      const P = (t: number) =>
        udir
          .clone()
          .multiplyScalar(bu + du * t)
          .add(vdir.clone().multiplyScalar(bv + dv * t))
          .add(n.clone().multiplyScalar(d))
      b.beam('zincGraphite', P(t0 + 0.02), P(t1 - 0.02), 0.028, 0.022, n)
    }
  }
}

/** Mansard over an axis-aligned rectangle: diamond lower slopes, seamed upper hip. Returns top height. */
function mansard(b: Builder, x0: number, x1: number, z0: number, z1: number, o: { eave?: number; pitch?: number; rise?: number; upPitch?: number; oh?: number; skip?: ('+x' | '-x' | '+z' | '-z')[] } = {}) {
  const eave = o.eave ?? EAVE
  const pitch = o.pitch ?? LOW_PITCH
  const rise = o.rise ?? LOW_RISE
  const upPitch = o.upPitch ?? UP_PITCH
  const oh = o.oh ?? 0.22
  const t = Math.tan(pitch * D2R)
  const ex0 = x0 - oh
  const ex1 = x1 + oh
  const ez0 = z0 - oh
  const ez1 = z1 + oh
  const ye = eave - oh * t * 0.15 // nearly level kick at the gutter
  const ins = rise / t
  const cx0 = x0 + ins - oh * 0.15
  const cx1 = x1 - ins + oh * 0.15
  const cz0 = z0 + ins - oh * 0.15
  const cz1 = z1 - ins + oh * 0.15
  const yc = eave + rise
  const e = [V(ex0, ye, ez0), V(ex1, ye, ez0), V(ex1, ye, ez1), V(ex0, ye, ez1)]
  const c = [V(cx0, yc, cz0), V(cx1, yc, cz0), V(cx1, yc, cz1), V(cx0, yc, cz1)]
  const sides: [string, number[]][] = [
    ['-z', [1, 0]],
    ['+x', [2, 1]],
    ['+z', [3, 2]],
    ['-x', [0, 3]],
  ]
  for (const [name, [i, j]] of sides) {
    if (o.skip?.includes(name as '+x')) continue
    diamondFacet(b, [e[i], e[j], c[j], c[i]])
  }
  for (let i = 0; i < 4; i++) b.beam('zincSlate', e[i], c[i], 0.14, 0.12)
  // curb roll and gutter
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    b.beam('zincSlate', c[i].clone().setY(yc + 0.05), c[j].clone().setY(yc + 0.05), 0.2, 0.14)
    b.beam('zincGraphite', e[i].clone().setY(ye - 0.06), e[j].clone().setY(ye - 0.06), 0.24, 0.2)
  }
  // upper hip
  const w = cx1 - cx0
  const dd = cz1 - cz0
  const up = upperHip(b, (cx0 + cx1) / 2, (cz0 + cz1) / 2, w, dd, yc + 0.06, upPitch)
  return up
}

function upperHip(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, pitch: number) {
  const t = Math.tan(pitch * D2R)
  const hw = w / 2
  const hd = d / 2
  const c00 = V(cx - hw, y0, cz - hd)
  const c10 = V(cx + hw, y0, cz - hd)
  const c11 = V(cx + hw, y0, cz + hd)
  const c01 = V(cx - hw, y0, cz + hd)
  let facets: THREE.Vector3[][]
  let lines: [THREE.Vector3, THREE.Vector3][]
  let top: number
  if (w >= d) {
    top = y0 + hd * t
    const r1 = V(cx - (hw - hd), top, cz)
    const r2 = V(cx + (hw - hd), top, cz)
    facets = [[c01, c11, r2, r1], [c10, c00, r1, r2], [c00, c01, r1], [c11, c10, r2]]
    lines = [[r1, r2], [c00, r1], [c01, r1], [c10, r2], [c11, r2]]
  } else {
    top = y0 + hw * t
    const r1 = V(cx, top, cz - (hd - hw))
    const r2 = V(cx, top, cz + (hd - hw))
    facets = [[c01, c11, r2], [c10, c00, r1], [c00, c01, r2, r1], [c11, c10, r1, r2]]
    lines = [[r1, r2], [c00, r1], [c10, r1], [c01, r2], [c11, r2]]
  }
  for (const f of facets) facet(b, 'zincSlate', f, { seams: SEAM })
  for (const [a, c] of lines) b.beam('zincSlate', a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.18, 0.1)
  return top
}

/* ================================================================== */
/* Façade ornament                                                     */
/* ================================================================== */

/** Window with timber frame, stucco surround, sill and a hood (segment pediment). */
function stuccoWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: 'round' | 'segment' | 'rect' = 'segment', hood = true) {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.2, frameKey: 'bertStucco', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 3] })
  window_(b, face, plane, u, y0, { type, w: w - 0.1, h: h - 0.06, frame: 0.06, frameKey: 'wood', glassKey: 'glassC', inset: 0.05 })
  const m = faceFrame(face, plane, u, 0, 0)
  if (hood) {
    // keystone + small triangular hood
    b.add('bertStucco', metricBox(0.32, 0.42, 0.2), M(m, mat(0, y0 + h + 0.12, 0.1)))
    const s = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.35, 0), new THREE.Vector2(w / 2 + 0.35, 0), new THREE.Vector2(0, 0.42)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false })
    b.add('bertStucco', g, M(m, mat(0, y0 + h + 0.36, 0.02)))
    b.add('bertStucco', metricBox(w + 0.8, 0.1, 0.24), M(m, mat(0, y0 + h + 0.33, 0.12)))
  }
  // apron below the sill
  b.add('bertStucco', metricBox(w * 0.7, 0.35, 0.06), M(m, mat(0, y0 - 0.55, 0.03)))
}

/** Rusticated stucco pilaster strip (alternating long/short blocks). */
function rustication(b: Builder, face: Face, plane: number, u: number, y0: number, y1: number, w = 0.75) {
  const m = faceFrame(face, plane, u, 0, 0)
  const rowH = 0.45
  const n = Math.floor((y1 - y0) / rowH)
  for (let i = 0; i < n; i++) {
    const ww = i % 2 ? w : w * 0.78
    b.add('bertStucco', metricBox(ww, rowH * 0.8, 0.12), M(m, mat(0, y0 + i * rowH + rowH * 0.5, 0.06)))
  }
}

/** Ox-eye dormer at the foot of a mansard slope. face = outward direction. */
function oxEye(b: Builder, face: Face, plane: number, u: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('bertStucco', metricBox(1.25, 1.5, 0.7), M(m, mat(0, EAVE + 0.55, -0.15)))
  b.add('bertStucco', new THREE.TorusGeometry(0.36, 0.09, 6, 18), M(m, mat(0, EAVE + 0.7, 0.22, 0, 0, 0, 1, 1.15, 1)))
  b.add('glassC', new THREE.CircleGeometry(0.33, 18), M(m, mat(0, EAVE + 0.7, 0.21, 0, 0, 0, 1, 1.15, 1)))
  // curved zinc hood + finial
  b.add('zincGraphite', new THREE.CylinderGeometry(0.66, 0.66, 0.9, 12, 1, false, -Math.PI / 2, Math.PI), M(m, mat(0, EAVE + 1.3, -0.25, 0, Math.PI / 2, 0, 1, 1, 0.45)))
  b.add('zincGraphite', new THREE.ConeGeometry(0.06, 0.4, 6), M(m, mat(0, EAVE + 1.8, 0.0)))
  b.add('bertStucco', metricBox(0.18, 0.3, 0.1), M(m, mat(0, EAVE + 0.15, 0.24)))
}

/** Stone balustrade with turned balusters between two points. */
function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 0.95) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / 0.28))
  const prof: [number, number][] = [
    [0.0, 0],
    [0.09, 0],
    [0.09, 0.06],
    [0.05, 0.12],
    [0.1, 0.32],
    [0.08, 0.44],
    [0.04, 0.52],
    [0.07, 0.58],
    [0.0, 0.58],
  ]
  const g = lathe(prof.map(([r, y]) => [r, (y * (h - 0.26)) / 0.58]), 6)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add('bertStucco', g, mat(p.x, p.y + 0.1, p.z))
  }
  b.beam('bertStucco', a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.3, 0.1)
  b.beam('bertStucco', a.clone().setY(a.y + h - 0.08), c.clone().setY(c.y + h - 0.08), 0.32, 0.16)
}

function wroughtRailing(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 0.95) {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / 0.14))
  b.beam('iron', a.clone().setY(a.y + h), c.clone().setY(c.y + h), 0.05, 0.05)
  b.beam('iron', a.clone().setY(a.y + 0.08), c.clone().setY(c.y + 0.08), 0.04, 0.04)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.rod('iron', p, p.clone().setY(p.y + h), 0.012, 4)
  }
}

/** Dome from a [r, y] profile with diamond-shingle look (dark lathe + ribs) and spire. */
function shingleDome(b: Builder, x: number, y: number, z: number, r: number, h: number, prof: [number, number][], spireH: number, n = 24) {
  const pts = prof.map(([pr, py]) => [pr * r, py * h] as [number, number])
  b.add('bertShingle', lathe(pts, n), mat(x, y, z))
  // horizontal shingle courses
  for (let i = 1; i < pts.length - 1; i++) {
    const [pr, py] = pts[i]
    if (pr < 0.12) continue
    b.add('zincGraphite', new THREE.TorusGeometry(pr + 0.01, 0.018, 4, n), mat(x, y + py, z, 0, Math.PI / 2))
  }
  const top = y + h
  b.add('zincGraphite', lathe([[0.12, 0], [0.16, 0.15], [0.07, 0.35], [0.1, 0.55], [0.05, 0.7], [0.03, spireH - 0.2], [0.001, spireH]], 10), mat(x, top - 0.05, z))
  return top + spireH
}

/* ================================================================== */
function build(): Builder {
  const b = new Builder()

  /* ---------------- wall volumes ---------------- */
  const blockWalls = (x0: number, x1: number, z0: number, z1: number, h = CORNICE) => {
    b.block('bertRender', x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.block('bertSocle', x1 - x0 + 0.16, SOCLE, z1 - z0 + 0.16, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.block('bertStucco', x1 - x0 + 0.2, 0.16, z1 - z0 + 0.2, (x0 + x1) / 2, SOCLE, (z0 + z1) / 2)
    // main cornice (two steps) and frieze band
    b.block('bertStucco', x1 - x0 + 0.3, 0.28, z1 - z0 + 0.3, (x0 + x1) / 2, h - 0.62, (z0 + z1) / 2)
    b.block('bertStucco', x1 - x0 + 0.5, 0.2, z1 - z0 + 0.5, (x0 + x1) / 2, h - 0.2, (z0 + z1) / 2)
    b.block('bertStucco', x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, (x0 + x1) / 2, 5.15, (z0 + z1) / 2)
  }
  blockWalls(XN, XF, -ZW, ZW)
  blockWalls(ARM_P.x0, ARM_P.x1 + 0.01, ARM_P.z0, ARM_P.z1)
  blockWalls(ARM_M.x0, ARM_M.x1 + 0.01, ARM_M.z0, ARM_M.z1)
  // risalit projection
  b.block('bertRender', RIS.x1 - XF + 0.01, CORNICE, 2 * RIS.hz, (XF + RIS.x1) / 2, 0, 0)
  b.block('bertSocle', RIS.x1 - XF + 0.1, SOCLE, 2 * RIS.hz + 0.16, (XF + RIS.x1) / 2 + 0.04, 0, 0)
  b.block('bertStucco', RIS.x1 - XF + 0.25, 0.48, 2 * RIS.hz + 0.5, (XF + RIS.x1) / 2 + 0.12, CORNICE - 0.48, 0)

  /* ---------------- rear wing (lower, plain hipped roof) ---------------- */
  {
    const { x0, x1, z0, z1 } = WING
    const h = 6.2
    b.block('bertRender', x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.block('bertSocle', x1 - x0 + 0.12, 1.1, z1 - z0 + 0.12, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.block('bertStucco', x1 - x0 + 0.4, 0.22, z1 - z0 + 0.4, (x0 + x1) / 2, h - 0.22, (z0 + z1) / 2)
    const oh = 0.35
    const t = Math.tan(28 * D2R)
    upperHipRoof(b, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 2 * oh, z1 - z0 + 2 * oh, h - oh * t, 28)
    for (const x of [-14.6, -13.0, -11.4]) {
      stuccoWindow(b, '-z', z0, -x, 2.0, 1.0, 2.1, 'segment', false)
      stuccoWindow(b, '+z', z1, x, 2.0, 1.0, 2.1, 'segment', false)
    }
    door(b, '-x', x0, (z0 + z1) / 2, { w: 1.2, h: 2.4, leafKey: 'wood', frameKey: 'bertStucco', frame: 0.18, y0: 0.6 })
  }

  /* ---------------- +Z arm rear bay with roof terrace ---------------- */
  {
    const r = 2.6
    const cz = (ARM_P.z0 + ARM_P.z1) / 2
    const g = new THREE.CylinderGeometry(r, r, CORNICE, 28, 1, false, Math.PI, Math.PI)
    b.add('bertRender', g, mat(ARM_P.x0, CORNICE / 2, cz))
    b.add('bertSocle', new THREE.CylinderGeometry(r + 0.08, r + 0.08, SOCLE, 28, 1, false, Math.PI, Math.PI), mat(ARM_P.x0, SOCLE / 2, cz))
    b.add('bertStucco', new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.25, 28, 1, false, Math.PI, Math.PI), mat(ARM_P.x0, CORNICE - 0.1, cz))
    for (let k = 0; k < 9; k++) {
      const a0 = Math.PI + (k / 9) * Math.PI
      const a1 = Math.PI + ((k + 1) / 9) * Math.PI
      const p0 = V(ARM_P.x0 + Math.sin(a0) * (r + 0.1), CORNICE + 0.02, cz + Math.cos(a0) * (r + 0.1))
      const p1 = V(ARM_P.x0 + Math.sin(a1) * (r + 0.1), CORNICE + 0.02, cz + Math.cos(a1) * (r + 0.1))
      balustrade(b, p0, p1, 0.85)
    }
    for (const a of [-0.6, 0, 0.6]) {
      const x = ARM_P.x0 - Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      b.add('glassC', new THREE.PlaneGeometry(0.95, 2.2), mat(x - Math.cos(a) * 0.03, 3.3, z + Math.sin(a) * 0.03, -Math.PI / 2 - a))
    }
  }

  /* ---------------- roofs ---------------- */
  mansard(b, XN, XF, -ZW, ZW)
  mansard(b, ARM_P.x0, ARM_P.x1 + 1.5, ARM_P.z0, ARM_P.z1, { skip: ['+x'] })
  mansard(b, ARM_M.x0, ARM_M.x1 + 1.5, ARM_M.z0, ARM_M.z1, { skip: ['+x'] })
  // central pavilion mansard over the risalit
  mansard(b, 3.0, RIS.x1, -RIS.hz, RIS.hz, { pitch: 78, rise: 4.6, upPitch: 22, oh: 0.2 })
  // roof windows on the upper hip of the front block (photo 07): placed on the ±X facets
  {
    const ins = LOW_RISE / Math.tan(LOW_PITCH * D2R) - 0.22 * 0.15
    const cx0 = XN + ins
    const cx1 = XF - ins
    const yc = EAVE + LOW_RISE + 0.06
    const hw = (cx1 - cx0) / 2
    const cxm = (cx0 + cx1) / 2
    const t = Math.tan(UP_PITCH * D2R)
    for (const [x, z] of [
      [cxm + 2.2, -5.6],
      [cxm - 2.6, 0.9],
      [cxm - 2.2, 6.4],
    ]) {
      const s = Math.sign(x - cxm)
      const y = yc + (hw - Math.abs(x - cxm)) * t + 0.1
      b.add('aluDarkGrey', metricBox(0.9, 0.12, 1.15), mat(x, y, z, 0, 0, -s * UP_PITCH * D2R))
      b.add('skylight', metricBox(0.75, 0.04, 1.0), mat(x, y + 0.07, z, 0, 0, -s * UP_PITCH * D2R))
    }
  }

  /* ---------------- front façade (+X) ---------------- */
  {
    // risalit: door, two windows, rusticated pilasters
    door(b, '+x', RIS.x1, 0, { w: 1.7, h: 3.3, y0: FLOOR, leafKey: 'wood', frameKey: 'bertStucco', frame: 0.28 })
    window_(b, '+x', RIS.x1, 0, FLOOR + 3.4, { w: 1.7, h: 0.55, frame: 0.06, frameKey: 'wood', glassKey: 'glassC', inset: 0.04 })
    for (const u of [-2.0, 2.0]) stuccoWindow(b, '+x', RIS.x1, u, 2.2, 1.25, 2.9, 'rect', false)
    for (const u of [-3.1, -0.95, 0.95, 3.1]) rustication(b, '+x', RIS.x1, u, SOCLE + 0.2, CORNICE - 0.6, 0.55)
    // side bays of the front: two segment-headed windows each
    for (const u of [-7.6, -5.4, 5.4, 7.6]) stuccoWindow(b, '+x', XF, u, 2.3, 1.15, 2.6)
    for (const u of [-ZW + 0.45, ZW - 0.45, -4.1, 4.1]) rustication(b, '+x', XF, u, SOCLE + 0.2, CORNICE - 0.6, 0.7)
    // ox-eye dormers on the front mansard
    for (const u of [-7.9, -5.6, 5.6, 7.9]) oxEye(b, '+x', XF, u)

    // baroque aedicule dormer on the risalit
    const ax = RIS.x1
    const fm = faceFrame('+x', ax, 0, 0, 0)
    b.add('bertStucco', metricBox(3.3, 4.5, 1.1), M(fm, mat(0, EAVE + 2.25, -0.45)))
    window_(b, '+x', ax + 0.1, 0, EAVE + 0.35, { type: 'round', w: 1.35, h: 2.75, frame: 0.22, frameKey: 'bertStucco', glassKey: 'glassC', inset: 0.04, bars: [2, 3] })
    window_(b, '+x', ax + 0.12, 0, EAVE + 0.4, { type: 'round', w: 1.25, h: 2.65, frame: 0.06, frameKey: 'wood', glassKey: 'glassC', inset: 0.04 })
    for (const u of [-1.35, 1.35]) {
      b.add('bertStucco', metricBox(0.45, 3.6, 0.3), M(fm, mat(u, EAVE + 1.9, 0.2)))
      b.add('bertStucco', new THREE.CylinderGeometry(0.28, 0.28, 0.3, 12), M(fm, mat(u, EAVE + 3.95, 0.25, 0, Math.PI / 2)))
    }
    // scrolled pediment: segmental arch with cartouche
    {
      const s = new THREE.Shape()
      s.moveTo(-1.75, 0)
      s.lineTo(1.75, 0)
      s.lineTo(1.75, 0.5)
      s.absarc(0, 0.2, 1.78, Math.asin(0.3 / 1.78), Math.PI - Math.asin(0.3 / 1.78), false)
      s.lineTo(-1.75, 0)
      b.add('bertStucco', new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: false, curveSegments: 16 }), M(fm, mat(0, EAVE + 4.5, -0.3)))
      b.add('bertStucco', new THREE.SphereGeometry(0.45, 12, 8), M(fm, mat(0, EAVE + 5.2, 0.3, 0, 0, 0, 1, 1.2, 0.5)))
      for (const u of [-0.75, 0.75]) b.add('bertStucco', new THREE.SphereGeometry(0.3, 10, 8), M(fm, mat(u, EAVE + 4.95, 0.28, 0, 0, 0, 1, 1, 0.5)))
    }
    // balcony on a console below the dormer
    b.add('bertStucco', metricBox(2.6, 0.22, 1.0), M(fm, mat(0, EAVE - 0.05, 0.45)))
    b.add('bertStucco', metricBox(1.2, 1.2, 0.7), M(fm, mat(0, EAVE - 0.75, 0.3)))
    wroughtRailing(b, V(ax + 0.9, EAVE + 0.06, -1.25), V(ax + 0.9, EAVE + 0.06, 1.25), 0.95)
    wroughtRailing(b, V(ax + 0.05, EAVE + 0.06, -1.25), V(ax + 0.9, EAVE + 0.06, -1.25), 0.95)
    wroughtRailing(b, V(ax + 0.05, EAVE + 0.06, 1.25), V(ax + 0.9, EAVE + 0.06, 1.25), 0.95)
  }

  /* ---------------- imperial double stair ---------------- */
  {
    const x0 = RIS.x1
    const land = FLOOR - 0.05
    const lx = 2.2 // landing depth
    // landing with curved front
    b.block('bertSocle', lx, land, 4.4, x0 + lx / 2, 0, 0)
    b.add('bertSocle', new THREE.CylinderGeometry(2.2, 2.2, land, 24, 1, false, 0, Math.PI), mat(x0 + lx, land / 2, 0))
    b.add('bertStucco', new THREE.CylinderGeometry(2.25, 2.25, 0.1, 24, 1, false, 0, Math.PI), mat(x0 + lx, land + 0.05, 0))
    b.block('bertStucco', lx, 0.1, 4.5, x0 + lx / 2, land, 0)
    // curved balustrade of the landing front
    for (let k = 0; k < 6; k++) {
      const a0 = 0.35 + (k / 6) * (Math.PI - 0.7)
      const a1 = 0.35 + ((k + 1) / 6) * (Math.PI - 0.7)
      balustrade(b, V(x0 + lx + Math.sin(a0) * 2.05, land + 0.1, Math.cos(a0) * 2.05), V(x0 + lx + Math.sin(a1) * 2.05, land + 0.1, Math.cos(a1) * 2.05), 0.9)
    }
    // two flights descending sideways
    for (const s of [-1, 1]) {
      const steps = 9
      for (let i = 0; i < steps; i++) {
        const h = land * (1 - i / steps)
        b.block('bertSocle', 1.5, h, 0.32, x0 + 1.05, 0, s * (2.25 + i * 0.32 + 0.16))
      }
      const zEnd = s * (2.25 + steps * 0.32)
      balustrade(b, V(x0 + 1.85, land + 0.1, s * 2.2), V(x0 + 1.85, 0.25, zEnd), 0.9)
      balustrade(b, V(x0 + 0.25, land + 0.1, s * 2.2), V(x0 + 0.25, 0.25, zEnd), 0.9)
      b.block('bertStucco', 0.5, 1.15, 0.5, x0 + 1.85, 0, zEnd + s * 0.1)
      b.add('bertStucco', new THREE.SphereGeometry(0.2, 10, 8), mat(x0 + 1.85, 1.3, zEnd + s * 0.1))
    }
  }

  /* ---------------- side façades ---------------- */
  // −Z (alley) side: windows before and after the tower
  for (const x of [5.25, 4.15, 2.3]) stuccoWindow(b, '-z', -ZW, -x, 2.3, 1.1, 2.6, 'round')
  for (const x of [-5.1, -7.0]) stuccoWindow(b, '-z', -ZW, -x, 2.3, 1.1, 2.6, 'round')
  for (const x of [5.0, 2.3, -5.3, -7.6]) oxEye(b, '-z', -ZW, -x)
  for (const x of [XF - 0.45, 3.3, -4.0]) rustication(b, '-z', -ZW, -x, SOCLE + 0.2, CORNICE - 0.6, 0.7)
  // +Z side
  for (const x of [3.3, 1.2, -1.0, -3.2, -6.0, -8.2]) stuccoWindow(b, '+z', ZW, x, 2.3, 1.1, 2.6, 'round')
  for (const x of [2.2, -2.1, -7.1]) oxEye(b, '+z', ZW, x)
  // rear courtyard walls and the arms' end walls
  for (const z of [-2.1, 0.6]) stuccoWindow(b, '-x', XN, z, 2.3, 1.0, 2.5, 'segment', false)
  for (const z of [-1.6, 0.9]) oxEye(b, '-x', XN, z)
  door(b, '+z', ARM_M.z1, -6.4, { w: 1.2, h: 2.6, y0: FLOOR, leafKey: 'wood', frameKey: 'bertStucco', frame: 0.2 })
  stuccoWindow(b, '-z', ARM_P.z0, 7.2, 2.3, 1.0, 2.5, 'segment', false)
  // rear courtyard steps down from the terrace
  for (let i = 0; i < 6; i++) b.block('bertSocle', 2.4, FLOOR * (1 - i / 6), 0.33, -5.5 - i * 0.33, 0, -0.7, Math.PI / 2)

  /* ---------------- tourelle at the front +Z corner ---------------- */
  {
    const tx = XF - 0.85
    const tz = ZW - 0.85
    const r = 1.45
    b.add('bertRender', new THREE.CylinderGeometry(r, r, CORNICE, 28), mat(tx, CORNICE / 2, tz))
    b.add('bertSocle', new THREE.CylinderGeometry(r + 0.08, r + 0.08, SOCLE, 28), mat(tx, SOCLE / 2, tz))
    b.add('bertStucco', new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.35, 28), mat(tx, CORNICE - 0.2, tz))
    for (const a of [0.25, 0.95]) {
      const x = tx + Math.cos(a) * r
      const z = tz + Math.sin(a) * r
      b.add('glassC', new THREE.PlaneGeometry(0.85, 2.4), mat(x + Math.cos(a) * 0.02, 3.5, z + Math.sin(a) * 0.02, Math.PI / 2 - a))
      b.add('wood', new THREE.PlaneGeometry(0.97, 2.52), mat(x + Math.cos(a) * 0.01, 3.5, z + Math.sin(a) * 0.01, Math.PI / 2 - a))
    }
    // drum + bell dome + spire
    b.add('bertRender', new THREE.CylinderGeometry(1.15, 1.15, 1.25, 24), mat(tx, CORNICE + 0.62, tz))
    b.add('bertStucco', new THREE.CylinderGeometry(1.3, 1.3, 0.18, 24), mat(tx, CORNICE + 1.25, tz))
    shingleDome(b, tx, CORNICE + 1.33, tz, 1.25, 1.9, [[1, 0], [0.98, 0.15], [0.88, 0.35], [0.72, 0.55], [0.48, 0.72], [0.22, 0.88], [0.06, 1]], 1.7)
  }

  /* ---------------- side tower (−Z) with onion dome ---------------- */
  {
    const { x0, x1, z0 } = TWR
    const cx = (x0 + x1) / 2
    const cz = (z0 + -ZW + 3.0) / 2
    const w = x1 - x0
    const d = -ZW + 3.0 - z0
    const top = 10.6
    b.block('bertRender', w, top, d, cx, 0, cz)
    b.block('bertSocle', w + 0.16, SOCLE, d + 0.16, cx, 0, cz)
    b.block('bertStucco', w + 0.3, 0.3, d + 0.3, cx, CORNICE - 0.5, cz)
    b.block('bertStucco', w + 0.45, 0.35, d + 0.45, cx, top - 0.35, cz)
    b.block('bertStucco', w + 0.2, 0.6, d + 0.2, cx, top - 1.0, cz)
    for (const u of [x0 + 0.3, x1 - 0.3]) rustication(b, '-z', z0, -u, SOCLE + 0.2, top - 1.0, 0.6)
    // upper door with balcony and the cartouche with oculus
    window_(b, '-z', z0, -cx, EAVE + 0.1, { w: 1.0, h: 2.3, frame: 0.18, frameKey: 'bertStucco', glassKey: 'wood', inset: 0.04 })
    wroughtRailing(b, V(x0 + 0.6, EAVE + 0.05, z0 - 0.7), V(x1 - 0.6, EAVE + 0.05, z0 - 0.7), 0.9)
    b.block('bertStucco', w - 0.8, 0.18, 0.75, cx, EAVE - 0.13, z0 - 0.37)
    b.add('bertStucco', new THREE.TorusGeometry(0.42, 0.12, 6, 18), mat(cx, top - 1.55, z0 - 0.06))
    b.add('glassC', new THREE.CircleGeometry(0.38, 18), mat(cx, top - 1.55, z0 - 0.04, Math.PI))
    stuccoWindow(b, '-x', x0, cz, 2.6, 0.8, 2.2, 'round', false)
    stuccoWindow(b, '+x', x1, -cz, 2.6, 0.8, 2.2, 'round', false)
    // onion dome
    shingleDome(b, cx, top + 0.3, cz, 1.55, 3.0, [[0.86, 0], [1.0, 0.1], [1.06, 0.26], [1.0, 0.42], [0.8, 0.6], [0.5, 0.76], [0.24, 0.9], [0.08, 1]], 2.4)
    b.add('bertShingle', new THREE.CylinderGeometry(1.35, 1.9, 0.42, 4, 1, false, Math.PI / 4), mat(cx, top + 0.1, cz, 0, 0, 0, w / 2.6, 1, d / 2.6))
    b.add('bertStucco', new THREE.CylinderGeometry(1.36, 1.36, 0.12, 24), mat(cx, top + 0.36, cz))
    // glazed entrance vestibule with glass pyramid canopy
    const vx0 = x0 + 0.35
    const vx1 = x1 - 0.35
    const vz = z0 - 1.25
    b.block('black', vx1 - vx0, 0.5, 1.25, (vx0 + vx1) / 2, 0, vz + 0.62)
    b.block('glassG', vx1 - vx0 - 0.1, 3.0, 1.15, (vx0 + vx1) / 2, 0.5, vz + 0.62)
    for (const x of [vx0, (vx0 + vx1) / 2, vx1]) b.block('iron', 0.08, 3.5, 0.08, x, 0, vz)
    for (let y = 1.0; y < 3.5; y += 0.5) b.block('iron', vx1 - vx0, 0.04, 0.05, (vx0 + vx1) / 2, y, vz - 0.02)
    const cy = 3.5
    const apex = V((vx0 + vx1) / 2, cy + 0.95, vz + 0.62)
    const c4 = [V(vx0 - 0.25, cy, vz - 0.35), V(vx1 + 0.25, cy, vz - 0.35), V(vx1 + 0.25, cy, z0), V(vx0 - 0.25, cy, z0)]
    for (let i = 0; i < 4; i++) facet(b, 'glassG', [c4[i], c4[(i + 1) % 4], apex])
    for (const c of c4) b.beam('aluNatural', c, apex, 0.06, 0.06)
  }

  /* ---------------- downpipes ---------------- */
  for (const [x, z] of [
    [XF - 0.15, -ZW - 0.12],
    [-3.6, ZW + 0.12],
    [XN + 0.3, -ZW - 0.12],
    [-8.8, ZW + 0.12],
  ]) b.rod('zincGraphite', V(x, 0.3, z), V(x, EAVE - 0.1, z), 0.06, 8)

  return b
}

/** Plain hipped roof (standing seam) — rear wing. */
function upperHipRoof(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, pitch: number) {
  upperHip(b, cx, cz, w, d, y0, pitch)
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [5.5, 8.5, -6],
  materials: () => ({
    bertRender: new THREE.MeshStandardMaterial({ color: '#efd49c', roughness: 0.88 }),
    bertStucco: new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.8 }),
    bertSocle: new THREE.MeshStandardMaterial({ color: '#d9ab62', roughness: 0.9 }),
    bertShingle: new THREE.MeshStandardMaterial({ color: '#5a5f65', roughness: 0.48, metalness: 0.55, envMapIntensity: 1.0 }),
  }),
  notes:
    'Eclectic villa with French mansards: dark diamond-pattern titanium-zinc shingles on the steep slopes, standing seam on the upper roofs, domes on the tower and corner tourelle; ornament simplified, rear wing after the drone photos.',
}
export default model
