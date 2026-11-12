/**
 * Mănăstirea Hodoș-Bodrog — the old church of the monastery (triconch, 14th–15th
 * century, baroque helmet on the dome drum and baroque west gable added in the
 * 17th–18th centuries, closed west porch rebuilt in 2000). Copper per the
 * COLOR METAL records (2021).
 *
 * Modelling specification (real metres; origin = centre of the church at ground,
 * +X = east towards the altar apse, +Z = south; the west front with the closed
 * porch faces −X). OSM has no building outline inside the precinct, so the plan
 * is sized from the photographs: one close view from the north-west (01, 2018),
 * the church in a distant view of the precinct (03) — plus the published
 * description (triconch plan; stone and brick walls, the north wall left
 * unplastered; closed porch rebuilt 2000).
 *  - Closed west porch: low plastered block (≈ 4.6 × 6.6 m, walls ≈ 4.3 m) with
 *    an arched window, west door, hipped roof abutting the west façade (01).
 *  - Pronaos: plastered block (≈ 6.4 × 8.4 m, eave ≈ 7.4 m) with corner
 *    pilasters, cornice and the scrolled baroque west gable with an oculus panel,
 *    corner balls and a cross (01).
 *  - Naos: square bay with the lateral conchs (half-cone roofs) and the
 *    octagonal dome drum (≈ 6 m across, narrow windows, cornice ≈ 13.4 m) carrying
 *    the baroque helmet: concave skirt, small ring, onion bulb, lantern, small
 *    cap, ball and cross (01, 03); altar bay and semicircular apse to the east.
 *  - North walls in exposed rubble stone with brick, the rest plastered (01).
 *  - METAL: the 2018 photograph shows grey sheet roofs and a dark grey helmet;
 *    roofs and helmet are shown in weathered copper (copperBrown, seams ≈ 0.5 m)
 *    per the register — which building of the monastery received the copper is
 *    not documented.
 * Approximations: no outline or survey data — all dimensions are estimates from
 * one close photograph (± 15–20 %); orientation assumed with the altar to the
 * east; south side and east end not photographed (interpreted from the
 * triconch type); ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, loft, polyRing, prism, ringBand, seams, faceFrame } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'plasterWhite'
const STONE = 'rubble'
const TRIM = 'stoneLight'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const D2R = Math.PI / 180

const DX = 1.5 // shift so that the overall length is centred
const PORCH = { x0: -12.6 + DX, x1: -8.0 + DX, hw: 3.3, top: 4.3 }
const PRON = { x0: -8.0 + DX, x1: -1.6 + DX, hw: 4.2, top: 7.4 }
const NAOS = { x0: -1.6 + DX, x1: 5.4 + DX, hw: 4.2, top: 7.0 }
const CONCH = { x: 1.9 + DX, r: 2.6, top: 6.4 }
const ALTAR = { x0: 5.4 + DX, x1: 6.6 + DX, hw: 3.4, top: 6.6, r: 3.0 }
const DRUM = { x: 1.9 + DX, r: 3.1, y0: 9.0, top: 13.4 }
const PITCH = 35

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function op(b: Builder, m: THREE.Matrix4, o: { w: number; h: number; y0: number; type?: OpeningType; glass?: string; frame?: number; frameKey?: string; off?: number }) {
  const type = o.type ?? 'round'
  const f = o.frame ?? 0.12
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, 0, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? TRIM, extrude(frameShape(type, o.w, o.h, f, 0, o.y0), 0.1, 8), mul(m, mat(0, 0, off)))
}

/** Gable roof along X with rolled ridge, returns ridge height. */
function gable(b: Builder, x0: number, x1: number, hw: number, y: number, ov: number, pitch = PITCH) {
  const t = Math.tan(pitch * D2R)
  const he = hw + ov
  const yE = y - ov * t
  const yR = y + hw * t
  for (const s of [-1, 1]) facet(b, CU, [V(x0, yE, s * he), V(x1, yE, s * he), V(x1, yR, 0), V(x0, yR, 0)], { seams: SEAM, thickness: 0.1 })
  b.rod(CU, V(x0, yR + 0.06, 0), V(x1, yR + 0.06, 0), 0.07)
  return yR
}

/** Triangular gable wall at x (thickness extruded towards −X when dir = -1, +X when dir = 1). */
function gableWall(b: Builder, key: string, x: number, hw: number, y: number, yR: number, dir: 1 | -1) {
  const tri = new THREE.Shape([new THREE.Vector2(-hw, y - 0.02), new THREE.Vector2(hw, y - 0.02), new THREE.Vector2(0, yR - 0.05)])
  b.add(key, extrude(tri, 0.3), mat(x + (dir < 0 ? -0.3 : 0), 0, 0, Math.PI / 2, 0, 0))
}

/** Half (outer) lathe round a centre on the wall line z = s·hw. */
function halfLathe(b: Builder, key: string, cx: number, cz: number, a: number, pts: [number, number][], seg = 16) {
  b.add(key, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.01), y)), seg, -a, Math.PI), mat(cx, 0, cz))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- pronaos with the baroque west gable ---------------- */
  {
    const { x0, x1, hw, top } = PRON
    const xm = (x0 + x1) / 2
    b.block(WALL, x1 - x0, top, 2 * hw, xm, 0, 0)
    b.add(STONE, metricBox(x1 - x0, top - 0.5, 0.04), mat(xm, (top - 0.5) / 2 + 0.4, -hw - 0.02))
    b.block('socle', x1 - x0 + 0.2, 0.4, 2 * hw + 0.2, xm, 0, 0)
    // entablature
    b.box(TRIM, x1 - x0 + 0.3, 0.22, 2 * hw + 0.3, xm, top - 0.45, 0)
    b.box(WALL, x1 - x0 + 0.5, 0.25, 2 * hw + 0.5, xm, top - 0.13, 0)
    // corner pilasters (west face)
    for (const s of [-1, 1]) b.block(WALL, 0.3, top - 0.6, 0.7, x0 - 0.12, 0.4, s * (hw - 0.35))
    const pR = gable(b, x0 + 0.2, x1 + 0.3, hw, top, 0.45)
    gableWall(b, WALL, x1 + 0.3, hw, top, pR, -1)
    // scrolled gable on the west front
    const g: THREE.Vector2[] = []
    const P = (u: number, v: number) => g.push(new THREE.Vector2(u, v))
    P(-hw, top - 0.01)
    P(-hw, top + 0.75)
    P(-hw + 0.55, top + 0.75)
    for (let i = 0; i <= 10; i++) {
      // concave sweep up to the shoulder of the crowning arch
      const t = i / 10
      P(-hw + 0.55 + (hw - 0.55 - 1.65) * t, top + 0.75 + 2.25 * Math.sin((t * Math.PI) / 2) ** 2)
    }
    for (let i = 1; i < 14; i++) {
      const a = Math.PI - (i / 14) * Math.PI
      P(Math.cos(a) * 1.65, top + 3.0 + Math.sin(a) * 1.35)
    }
    for (let i = 0; i <= 10; i++) {
      const t = 1 - i / 10
      P(hw - 0.55 - (hw - 0.55 - 1.65) * t, top + 0.75 + 2.25 * Math.sin((t * Math.PI) / 2) ** 2)
    }
    P(hw - 0.55, top + 0.75)
    P(hw, top + 0.75)
    P(hw, top - 0.01)
    const fw = faceFrame('-x', x0, 0, 0, 0)
    b.add(WALL, extrude(new THREE.Shape(g), 0.45, 4), mul(fw, mat(0, 0, -0.45)))
    // coping along the scrolled edge
    for (let i = 1; i < g.length - 2; i++) {
      const p0 = g[i]
      const p1 = g[i + 1]
      b.beam(TRIM, V(x0 - 0.05, p0.y + 0.05, p0.x), V(x0 - 0.05, p1.y + 0.05, p1.x), 0.55, 0.1, V(-1, 0, 0))
    }
    // oculus panel, balls, cross
    b.add(TRIM, extrude(frameShape('rect', 1.4, 1.6, 0.12, 0, top + 1.0), 0.08, 4), mul(fw, mat(0, 0, 0.01)))
    b.add(TRIM, new THREE.TorusGeometry(0.42, 0.09, 6, 20), mul(fw, mat(0, top + 1.8, 0.06)))
    b.add('glassC', new THREE.CircleGeometry(0.4, 20), mul(fw, mat(0, top + 1.8, 0.02)))
    for (const s of [-1, 1]) {
      b.add(TRIM, metricBox(0.4, 0.3, 0.4), mat(x0 - 0.05, top + 0.9, s * (hw - 0.25)))
      b.add(TRIM, new THREE.SphereGeometry(0.22, 12, 8), mat(x0 - 0.05, top + 1.25, s * (hw - 0.25)))
    }
    crossOn(b, x0 - 0.15, top + 4.35, 0, 1.4)
    // north and south windows
    for (const s of [-1, 1]) op(b, faceFrame(s > 0 ? '+z' : '-z', s * hw, s * (xm + 0.6), 0, 0), { w: 0.8, h: 1.9, y0: 2.6, off: s < 0 ? 0.04 : 0 })
  }

  /* ---------------- closed west porch ---------------- */
  {
    const { x0, x1, hw, top } = PORCH
    const xm = (x0 + x1) / 2
    b.block(WALL, x1 - x0, top, 2 * hw, xm, 0, 0)
    b.block('socle', x1 - x0 + 0.2, 0.45, 2 * hw + 0.2, xm, 0, 0)
    b.box(TRIM, x1 - x0 + 0.25, 0.18, 2 * hw + 0.25, xm, top - 0.25, 0)
    for (const s of [-1, 1]) op(b, faceFrame(s > 0 ? '+z' : '-z', s * hw, s * xm, 0, 0), { w: 0.75, h: 1.6, y0: 1.5, frame: 0.1 })
    const fw = faceFrame('-x', x0, 0, 0, 0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.5, 0, 0.45, 10))), mul(fw, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.3, 2.5, 0.14, 0, 0.45), 0.1, 8), mul(fw, mat(0, 0, 0.01)))
    // roof hipped at the west, ridge running into the pronaos façade
    const t = Math.tan(30 * D2R)
    const ov = 0.45
    const he = hw + ov
    const yE = top - ov * t
    const yR = top + hw * t
    const xr = x0 + hw
    facet(b, CU, [V(x0 - ov, yE, -he), V(x0 - ov, yE, he), V(xr, yR, 0)], { seams: SEAM, thickness: 0.1 })
    for (const s of [-1, 1]) {
      facet(b, CU, [V(x0 - ov, yE, s * he), V(x1, yE, s * he), V(x1, yR, 0), V(xr, yR, 0)], { seams: SEAM, thickness: 0.1 })
      b.rod(CU, V(x0 - ov, yE + 0.05, s * he), V(xr, yR + 0.05, 0), 0.06)
    }
    b.rod(CU, V(xr, yR + 0.06, 0), V(x1, yR + 0.06, 0), 0.07)
  }

  /* ---------------- naos, conchs, drum ---------------- */
  {
    const { x0, x1, hw, top } = NAOS
    const xm = (x0 + x1) / 2
    b.block(WALL, x1 - x0, top, 2 * hw, xm, 0, 0)
    b.add(STONE, metricBox(x1 - x0, top - 0.4, 0.04), mat(xm, (top - 0.4) / 2 + 0.4, -hw - 0.02))
    b.block('socle', x1 - x0 + 0.2, 0.4, 2 * hw + 0.2, xm, 0, 0)
    b.box(WALL, x1 - x0 + 0.4, 0.25, 2 * hw + 0.4, xm, top - 0.13, 0)
    const nR = gable(b, x0, x1 + 0.2, hw, top, 0.45)
    gableWall(b, WALL, x1 + 0.2, hw, top, nR, -1)
    b.add(STONE, metricBox(0.04, top - 0.4, hw - ALTAR.hw), mat(x1 + 0.02, (top - 0.4) / 2 + 0.4, -(hw + ALTAR.hw) / 2))
    // lateral conchs
    for (const s of [-1, 1]) {
      const { x: cx, r, top: ct } = CONCH
      const cz = s * hw
      const a = s * (Math.PI / 2)
      halfLathe(b, s < 0 ? STONE : WALL, cx, cz, a, [[r, 0], [r, ct]], 20)
      halfLathe(b, 'socle', cx, cz, a, [[r + 0.1, 0], [r + 0.1, 0.4]], 20)
      halfLathe(b, s < 0 ? TRIM : WALL, cx, cz, a, [[r + 0.18, ct - 0.25], [r + 0.18, ct]], 20)
      halfLathe(b, CU, cx, cz, a, [[r + 0.5, ct - 0.3], [0.05, ct + (r + 0.5) * Math.tan(32 * D2R) - 0.3]], 24)
      for (let k = 1; k < 12; k++) {
        const ph = a - Math.PI / 2 + (k / 12) * Math.PI
        const dd = V(Math.cos(ph), 0, Math.sin(ph))
        b.beam(CU, V(cx + dd.x * (r + 0.48), ct - 0.27, cz + dd.z * (r + 0.48)), V(cx + dd.x * 0.6, ct - 0.27 + (r - 0.1) * Math.tan(32 * D2R), cz + dd.z * 0.6), 0.04, 0.04)
      }
      const m = wallAt(cx, cz + s * r, a)
      if (s > 0) op(b, m, { w: 0.55, h: 1.5, y0: 2.8, off: 0.02 })
      else {
        // frescoed niche in the exposed north wall (01)
        b.add('fresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 2.2, 0, 2.4, 10))), mul(m, mat(0, 0, 0.06)))
        b.add(TRIM, extrude(frameShape('round', 0.9, 2.2, 0.12, 0, 2.4), 0.1, 8), mul(m, mat(0, 0, 0.04)))
      }
    }
    // octagonal drum with narrow windows
    const { x: dx, r, y0, top: dt } = DRUM
    prism(b, WALL, { x: dx, n: 8, r, y0, h: dt - y0 })
    ringBand(b, TRIM, { x: dx, n: 8, r, y: dt - 0.6, h: 0.25, grow: 0.12 })
    ringBand(b, WALL, { x: dx, n: 8, r, y: dt - 0.35, h: 0.35, grow: 0.25 })
    const ap = r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      if (k % 2 === 0) op(b, wallAt(dx + Math.cos(a) * ap, Math.sin(a) * ap, a), { w: 0.35, h: 1.4, y0: dt - 2.4, frame: 0.08, off: 0.01 })
    }
    // baroque helmet: skirt, ring, onion, lantern, cap, ball, cross
    const H: [number, number][] = [
      [r * 0.9, 0], [2.55, 0.2], [2.2, 0.55], [1.9, 1.05], [1.72, 1.6], [1.7, 1.95],
      [1.9, 2.0], [1.9, 2.12], [1.75, 2.15],
      [1.95, 2.5], [2.08, 2.95], [2.05, 3.35], [1.85, 3.75], [1.45, 4.15], [0.95, 4.5], [0.62, 4.72],
      [0.66, 4.78], [0.66, 5.7], [0.9, 5.75], [0.9, 5.88], [0.55, 5.95], [0.6, 6.15], [0.45, 6.45], [0.22, 6.7], [0.06, 6.95],
    ]
    b.add(CU, loft(H.map(([rr, y]) => polyRing(8, rr, dt + y, Math.PI / 8, dx, 0)), { capBottom: true, capTop: true }))
    for (let k = 0; k < 8; k++) {
      const c = Math.PI / 8 + (k * Math.PI) / 4
      for (let i = 0; i < H.length - 1; i++) {
        if (H[i][0] < 0.7 && H[i + 1][0] < 0.7) continue
        const p = (j: number) => V(dx + Math.cos(c) * (H[j][0] + 0.02), dt + H[j][1], Math.sin(c) * (H[j][0] + 0.02))
        b.beam(CU, p(i), p(i + 1), 0.06, 0.05)
      }
    }
    // lantern openings
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      b.add('black', metricBox(0.22, 0.6, 0.05), mat(dx + Math.cos(a) * 0.62, dt + 5.2, Math.sin(a) * 0.62, Math.PI / 2 - a))
    }
    b.add('gilt', new THREE.SphereGeometry(0.2, 12, 8), mat(dx, dt + 7.15, 0))
    crossOn(b, dx, dt + 7.3, 0, 1.7)
  }

  /* ---------------- altar bay and apse ---------------- */
  {
    const { x0, x1, hw, top, r } = ALTAR
    b.block(WALL, x1 - x0, top, 2 * hw, (x0 + x1) / 2, 0, 0)
    b.add(STONE, metricBox(x1 - x0, top - 0.4, 0.04), mat((x0 + x1) / 2, (top - 0.4) / 2 + 0.4, -hw - 0.02))
    const yR = gable(b, x0 - 0.3, x1, hw, top, 0.4, 32)
    // semicircular apse: wall (north half in stone) and half-cone roof
    const seg = 20
    b.add(WALL, new THREE.LatheGeometry([new THREE.Vector2(r, 0), new THREE.Vector2(r, top)], seg, 0, Math.PI / 2), mat(x1, 0, 0))
    b.add(STONE, new THREE.LatheGeometry([new THREE.Vector2(r + 0.02, 0.4), new THREE.Vector2(r + 0.02, top - 0.3)], seg, Math.PI / 2, Math.PI / 2), mat(x1, 0, 0))
    b.add(WALL, new THREE.LatheGeometry([new THREE.Vector2(r, 0), new THREE.Vector2(r, top)], seg, Math.PI / 2, Math.PI / 2), mat(x1, 0, 0))
    b.add('socle', new THREE.LatheGeometry([new THREE.Vector2(r + 0.1, 0), new THREE.Vector2(r + 0.1, 0.4)], seg, 0, Math.PI), mat(x1, 0, 0))
    b.add(WALL, new THREE.LatheGeometry([new THREE.Vector2(r + 0.18, top - 0.25), new THREE.Vector2(r + 0.18, top)], seg, 0, Math.PI), mat(x1, 0, 0))
    const ro = r + 0.45
    const t = (yR - top) / hw
    b.add(CU, new THREE.LatheGeometry([new THREE.Vector2(ro, top - 0.45 * t), new THREE.Vector2(0.05, yR)], 24, 0, Math.PI), mat(x1, 0, 0))
    for (let k = 1; k < 12; k++) {
      const ph = (k / 12) * Math.PI
      const dd = V(Math.sin(ph), 0, Math.cos(ph))
      b.beam(CU, V(x1 + dd.x * (ro - 0.02), top - 0.45 * t + 0.03, dd.z * (ro - 0.02)), V(x1 + dd.x * 0.5, yR - 0.5 * t + 0.03, dd.z * 0.5), 0.04, 0.04)
    }
    op(b, wallAt(x1 + r, 0, 0), { w: 0.45, h: 1.3, y0: 3.0, off: 0.02 })
  }

  return b
}

function crossOn(b: Builder, x: number, y: number, z: number, s: number) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', metricBox(t, s, t), mat(0, s * 0.5, 0))
  g.add('iron', metricBox(s * 0.55, t, t), mat(0, s * 0.72, 0))
  for (const sx of [-1, 1]) g.add('iron', new THREE.SphereGeometry(t * 0.9, 6, 4), mat(sx * s * 0.28, s * 0.72, 0))
  g.add('iron', new THREE.SphereGeometry(t * 0.9, 6, 4), mat(0, s, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [3.4, 16, 0],
  materials: () => ({
    rubble: new THREE.MeshStandardMaterial({ color: '#8e8376', roughness: 0.95 }),
    fresco: new THREE.MeshStandardMaterial({ color: '#8a6b4c', roughness: 0.85 }),
  }),
  notes:
    'Old triconch church sized from one close photograph (no OSM outline): dimensions estimated, south side and east end interpreted, orientation assumed. The 2018 photograph shows grey sheet roofs — copper follows the 2021 project record.',
}
export default model
