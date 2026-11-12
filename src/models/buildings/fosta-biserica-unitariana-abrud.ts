/**
 * Abrud — the former Unitarian church (1786; burnt 1927, roofless ruin with the
 * tower) converted into a recreational and cultural centre: nave walls raised
 * back to their original height, new roof and a new metal-clad cupola mounted on
 * the tower in September 2023. elZinc Slate titanium-zinc per the COLOR METAL
 * records (2023). The model shows the CONVERTED state.
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 49° (NE) towards the street front on Piața Eroilor with
 * the tower, +Z = 139°). Sources: the project rendering (01 — a rendering, not a
 * photograph), the drone photo of the cupola being lifted (02, 2023), three
 * photographs of the ruin (03–05) and the OSM outline (33.5 × 14.9 m).
 *  - Front: the square tower (≈ 7.4 m, flush with the façade) flanked by two
 *    narrow façade wings with curved baroque tops; pilasters, the entablature at
 *    ≈ 12.5 m, entrance door and tall window in the tower front (01, 03, 04).
 *  - Tower above the façade: lower stage with an oval oculus, belfry stage with
 *    shuttered segmental windows and small oculi, corner pilasters, strongly
 *    projecting top cornice at ≈ 21 m (01, 03–05).
 *  - New cupola: square ogival helmet (≈ 7.2 m wide, ≈ 7.3 m high) with a
 *    short vertical base band and vertical standing seams (02, 01).
 *  - Nave (≈ 13.8 m wide, walls ≈ 12.5 m) with tall round-arched windows,
 *    pilaster strips and a shallow segmental apse to the south-west (OSM), new
 *    gable roof (≈ 40°) hipped over the apse.
 *  - METAL: cupola and nave roof in elZinc Slate (zincSlate, seams ≈ 0.5 m);
 *    the cupola is confirmed by 02, the nave roof covering follows the rendering
 *    and the register (surfaces not documented).
 * Approximations: heights estimated from the rendering and the photographs (no
 * survey data); the side and rear elevations are hidden by neighbouring houses
 * in all views and are interpreted; the slight taper of the OSM outline is
 * evened out; ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, loft, rectRing, seams, faceFrame } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincSlate'
const WALL = 'plasterCream'
const ORN = 'plasterSand'
const SEAM = seams(ZN, 0.5, 0.045, 0.04)
const D2R = Math.PI / 180

const FRONT = 16.75
const NAVE = { x0: -13.3, hw: 6.9, top: 12.5 }
const APSE = { tip: -16.8, half: 6.4 }
const TW = { x0: FRONT - 7.4, x1: FRONT, hw: 3.7, top: 22.5 }
const PITCH = 31

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function op(b: Builder, m: THREE.Matrix4, o: { w: number; h: number; y0: number; u?: number; type?: OpeningType; glass?: string; frame?: number; frameKey?: string; off?: number }) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.16
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? ORN, extrude(frameShape(type, o.w, o.h, f, u, o.y0), 0.1, 8), mul(m, mat(0, 0, off)))
}

function pil(b: Builder, face: Face, plane: number, us: number[], y0: number, y1: number, w = 0.6, d = 0.16) {
  for (const u of us) b.add(WALL, metricBox(w, y1 - y0, d), mul(faceFrame(face, plane, u, 0, 0), mat(0, (y0 + y1) / 2, d / 2)))
}

/** Points of the segmental apse (eave polygon), from the +Z side round to −Z. */
function apseArc(grow: number, n = 5) {
  const { tip, half } = APSE
  const depth = NAVE.x0 - tip
  const R = (half * half + depth * depth) / (2 * depth)
  const cx = tip + R
  const a0 = Math.asin(half / R)
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 - (2 * a0 * i) / n
    pts.push([cx - Math.cos(a) * (R + grow), Math.sin(a) * (R + grow)])
  }
  return { pts, cx, R }
}

function build(): Builder {
  const b = new Builder()
  const { x0, hw, top } = NAVE

  /* ---------------- nave + apse walls ---------------- */
  const arc = apseArc(0)
  // plan ring (convex): front, north side, segmental apse, south side
  const ring = (y: number, g = 0) => {
    const a = apseArc(g)
    const r: THREE.Vector3[] = [V(FRONT, y, -hw - g), V(FRONT, y, hw + g), V(x0, y, hw + g)]
    for (const [x, z] of a.pts) r.push(V(x, y, z))
    r.push(V(x0, y, -hw - g))
    return r
  }
  b.add(WALL, loft([ring(0), ring(top)], { capTop: true, flat: true }))
  b.add('socle', loft([ring(0, 0.12), ring(0.7, 0.12)], { capTop: true, flat: true }))
  b.add(ORN, loft([ring(top - 1.0, 0.12), ring(top - 0.75, 0.12)], { capTop: true, flat: true }))
  b.add(WALL, loft([ring(top - 0.45, 0.3), ring(top - 0.05, 0.3)], { capTop: true, flat: true }))
  // side windows and pilaster strips
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = s * hw
    pil(b, face, plane, [x0 + 0.4, -6.4, 0.6, 7.6].map((x) => s * x), 0.7, top - 1.0)
    for (const x of [-9.9, -2.9, 4.1]) op(b, faceFrame(face, plane, s * x, 0, 0), { w: 1.5, h: 5.6, y0: 4.2 })
  }
  // apse: tall arched window in the middle facet
  {
    const { pts } = arc
    const i = Math.floor(pts.length / 2) - 1
    const [xa, za] = pts[i]
    const [xb, zb] = pts[i + 1]
    // the middle facet faces −X
    op(b, mat((xa + xb) / 2, 0, (za + zb) / 2, -Math.PI / 2), { w: 1.6, h: 6.0, y0: 4.0 })
  }

  /* ---------------- front: tower base + wings ---------------- */
  const fm = faceFrame('+x', FRONT, 0, 0, 0)
  // wings with curved baroque tops
  for (const s of [-1, 1]) {
    const pts: THREE.Vector2[] = []
    const ui = s * TW.hw
    const uo = s * (hw + 0.3)
    pts.push(new THREE.Vector2(uo, top - 0.05))
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      pts.push(new THREE.Vector2(uo + (ui - uo) * t, top + 0.2 + 2.2 * (1 - Math.cos((t * Math.PI) / 2)) ** 1.4))
    }
    pts.push(new THREE.Vector2(ui, top - 0.05))
    if (s > 0) pts.reverse()
    b.add(WALL, extrude(new THREE.Shape(pts), 0.6, 4), mul(fm, mat(0, 0, -0.6)))
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      b.beam(ORN, V(FRONT + 0.06, p0.y + 0.08, -p0.x), V(FRONT + 0.06, p1.y + 0.08, -p1.x), 0.7, 0.16, V(1, 0, 0))
    }
    pil(b, '+x', FRONT, [s * (hw - 0.1), s * (TW.hw + 0.35)], 0.7, top - 1.0, 0.55, 0.18)
    op(b, fm, { u: s * 5.3, w: 1.1, h: 3.6, y0: 6.5, type: 'segment' })
  }

  /* ---------------- tower ---------------- */
  {
    const { x0: tx0, x1: tx1, hw: th, top: tt } = TW
    const txm = (tx0 + tx1) / 2
    const tw = tx1 - tx0
    b.block(WALL, tw, tt, 2 * th, txm, 0, 0)
    // stage cornices
    for (const [y, g] of [[top - 0.3, 0.32], [tt - 5.0, 0.18]] as [number, number][]) {
      b.box(ORN, tw + 2 * g, 0.35, 2 * th + 2 * g, txm, y, 0)
    }
    b.box(ORN, tw + 0.5, 0.3, 2 * th + 0.5, txm, tt - 0.55, 0)
    b.box(WALL, tw + 1.1, 0.4, 2 * th + 1.1, txm, tt - 0.2, 0)
    b.box(ORN, tw + 0.8, 0.12, 2 * th + 0.8, txm, tt - 0.45, 0)
    // corner pilasters (double)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.block(WALL, 0.7, tt - 0.8, 0.18, txm + sx * (tw / 2 - 0.35), 0.7, sz * (th + 0.09))
      b.block(WALL, 0.18, tt - 0.8, 0.7, txm + sx * (tw / 2 + 0.09), 0.7, sz * (th - 0.35))
    }
    // front: door and tall window
    b.add('wood', metricBox(1.8, 3.1, 0.05), mul(fm, mat(0, 0.7 + 1.55, 0.03)))
    b.add(ORN, extrude(frameShape('rect', 1.8, 3.1, 0.22, 0, 0.7), 0.12, 4), mul(fm, mat(0, 0, 0.01)))
    op(b, fm, { w: 1.4, h: 5.2, y0: 5.0 })
    // free stages on the three exposed faces
    const faces: [Face, number][] = [['+x', tx1], ['+z', th], ['-z', -th]]
    for (const [face, plane] of faces) {
      const u = face === '+x' ? 0 : face === '+z' ? txm : -txm
      const m = faceFrame(face, plane, u, 0, 0)
      b.add('glassC', new THREE.CircleGeometry(0.5, 20), mul(m, mat(0, 15.2, 0.02, 0, 0, 0, 0.75, 1, 1)))
      b.add(ORN, new THREE.TorusGeometry(0.5, 0.1, 6, 20), mul(m, mat(0, 15.2, 0.05, 0, 0, 0, 0.75, 1, 1)))
      // belfry: shuttered segmental window
      op(b, m, { w: 1.3, h: 2.6, y0: tt - 4.3, type: 'segment', glass: 'black' })
      for (const sx of [-1, 1]) b.add('shutter', metricBox(0.62, 2.45, 0.06), mul(m, mat(sx * 0.96, tt - 3.05, 0.1)))
      b.add('glassC', new THREE.CircleGeometry(0.3, 16), mul(m, mat(0, tt - 1.3, 0.02)))
      b.add(ORN, new THREE.TorusGeometry(0.3, 0.07, 6, 16), mul(m, mat(0, tt - 1.3, 0.05)))
    }
    // rear face above the nave roof
    op(b, faceFrame('-x', tx0, 0, 0, 0), { w: 1.3, h: 2.6, y0: tt - 4.3, type: 'segment', glass: 'black' })

    // cupola: square ogival helmet in elZinc Slate
    const yc = tt
    const C: [number, number][] = [[3.65, 0], [3.65, 0.55], [3.55, 1.6], [3.25, 2.9], [2.7, 4.2], [1.95, 5.35], [1.1, 6.3], [0.4, 6.95], [0.12, 7.25]]
    b.add(ZN, loft(C.map(([h, y]) => rectRing(h, h, yc + y, txm, 0)), { capBottom: true, capTop: true, flat: true }))
    // vertical standing seams on the four faces + hip rolls
    for (const f of [-1, 1]) {
      for (let k = -6; k <= 6; k++) {
        const t = k / 6.6
        for (let i = 0; i < C.length - 2; i++) {
          const p = (j: number, axis: 'x' | 'z') => {
            const h = C[j][0] + 0.02
            return axis === 'x' ? V(txm + f * h, yc + C[j][1], t * C[j][0]) : V(txm + t * C[j][0], yc + C[j][1], f * h)
          }
          b.beam(ZN, p(i, 'x'), p(i + 1, 'x'), 0.04, 0.035)
          b.beam(ZN, p(i, 'z'), p(i + 1, 'z'), 0.04, 0.035)
        }
      }
      for (const g of [-1, 1]) for (let i = 0; i < C.length - 1; i++) b.rod(ZN, V(txm + f * C[i][0], yc + C[i][1], g * C[i][0]), V(txm + f * C[i + 1][0], yc + C[i + 1][1], g * C[i + 1][0]), 0.05, 5)
    }
    b.add(ZN, new THREE.CylinderGeometry(0.06, 0.12, 0.6, 8), mat(txm, yc + 7.5, 0))
    b.add(ZN, new THREE.SphereGeometry(0.2, 12, 8), mat(txm, yc + 7.95, 0))
  }

  /* ---------------- nave roof: gable, hipped over the apse ---------------- */
  {
    const t = Math.tan(PITCH * D2R)
    const ov = 0.5
    const he = hw + ov
    const yE = top - ov * t
    const yR = top + hw * t
    const xr = arc.cx // ridge end over the apse centre
    const xf = TW.x0 + 0.2
    for (const s of [-1, 1]) {
      facet(b, ZN, [V(xf, yE, s * he), V(x0, yE, s * he), V(xr, yR, 0), V(xf, yR, 0)], { seams: SEAM, thickness: 0.1 })
    }
    // front part beside the tower: slopes run on behind the wings to the façade
    for (const s of [-1, 1]) facet(b, ZN, [V(FRONT, yE, s * he), V(xf, yE, s * he), V(xf, top + (hw - TW.hw) * t, s * TW.hw), V(FRONT, top + (hw - TW.hw) * t, s * TW.hw)], { seams: SEAM, thickness: 0.1 })
    // apse facets
    const a2 = apseArc(ov / Math.cos(0.5))
    const eaveArc = a2.pts.map(([x, z]) => V(x, yE, z))
    const fanStart = V(x0, yE, he)
    const fanEnd = V(x0, yE, -he)
    const fan = [fanStart, ...eaveArc, fanEnd]
    for (let i = 0; i < fan.length - 1; i++) {
      facet(b, ZN, [fan[i], fan[i + 1], V(xr, yR, 0)], { seams: SEAM, thickness: 0.1 })
      b.rod(ZN, fan[i].clone().add(V(0, 0.05, 0)), V(xr, yR + 0.05, 0), 0.05, 5)
    }
    b.rod(ZN, V(xr, yR + 0.06, 0), V(xf, yR + 0.06, 0), 0.07, 6)
    // gutters
    for (const s of [-1, 1]) b.rod(ZN, V(FRONT, yE - 0.08, s * (he + 0.05)), V(x0, yE - 0.08, s * (he + 0.05)), 0.08, 6)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [13.05, 24.5, 2],
  materials: () => ({
    shutter: new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 0.75 }),
  }),
  notes:
    'Converted state (cultural centre) interpreted from the project rendering, the 2023 cupola photograph, photographs of the ruin and the OSM outline; heights estimated, side and rear elevations interpreted. Cupola and nave roof in elZinc Slate per the project record.',
}
export default model
