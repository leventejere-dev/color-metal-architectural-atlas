/**
 * Mănăstirea „Sfânta Cruce” Studina (Studinița, jud. Olt) — the monastery church
 * (church-paraclis, timber-framed, built 2008–2009 on the new site at the edge of
 * Studinița; OSM way 610986292 inside the precinct way 612772055). Copper per
 * the COLOR METAL records (2022).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM long axis 99.3° (east) towards the rounded altar end, +Z = south;
 * the entrance end faces −X). Sources: two photographs published by the
 * Diocese of Slatina and Romanați — 02 (Nov 2008, nearly finished shell: west
 * gable with the door, north side, polygonal side conch) and 01 (the finished
 * church from the north: hipped east end, small lantern turret on the ridge,
 * lower closed porch added at the west) — and the OSM outline (12.8 × 5.3 m).
 *  - Hall 5.3 m wide, walls ≈ 3.0 m, white panel cladding, small rectangular
 *    windows with timber frames (01, 02).
 *  - Gable roof ≈ 38°, west gable with exposed rafters, hipped over the
 *    rounded/polygonal altar end (OSM, 01).
 *  - Polygonal lateral conchs at mid-length with low hipped roofs under the
 *    main eave (01, 02; south side assumed symmetrical).
 *  - Closed porch at the west (≈ 2.2 m deep, full width, walls ≈ 2.5 m) with a
 *    low roof hipped at the west against the gable (01).
 *  - Small square lantern turret with a pyramid cap and cross on the ridge (01).
 *  - METAL: the photographs (2008–2009) show a light grey corrugated/sheet roof;
 *    the roofs, the turret cap and the conch roofs are shown in weathered copper
 *    (copperBrown, standing seams ≈ 0.5 m) per the register — which building of
 *    the monastery received the copper is not documented.
 * Approximations: heights from the door (≈ 2.1 m) in 02; the porch and the
 * apse polygon after the OSM outline and 01; south side not photographed.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, frameShape, facet, loft, seams, faceFrame } from '../kit'
import type { Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'plasterWhite'
const FR = 'timber'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const D2R = Math.PI / 180

const HW = 2.65
const TOP = 3.0
const PITCH = 38
const X_W = -6.4 // west face of the porch
const X_H = -4.2 // west gable of the hall
const X_A = 4.2 // start of the rounded altar end
const APSE: [number, number][] = [[X_A, HW], [5.55, 2.05], [6.4, 0.8], [6.4, -0.8], [5.55, -2.05], [X_A, -HW]]
const PORCH_TOP = 2.5
const CONCH = { x: -0.2, w: 2.8, d: 0.85, top: 2.6 }
const TURRET = { x: -0.6, s: 0.95, h: 1.05 }

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function win(b: Builder, face: Face, plane: number, u: number, y0: number, w = 0.5, h = 1.1) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('glassC', metricBox(w, h, 0.03), mul(m, mat(0, y0 + h / 2, 0.02)))
  b.add(FR, extrude(frameShape('rect', w, h, 0.08, 0, y0), 0.06, 4), mul(m, mat(0, 0, 0.01)))
  b.add(FR, metricBox(0.04, h, 0.05), mul(m, mat(0, y0 + h / 2, 0.05)))
}

function build(): Builder {
  const b = new Builder()
  const t = Math.tan(PITCH * D2R)

  /* ---------------- hall with rounded altar end ---------------- */
  const ring = (y: number, g = 0) => [V(X_H - g, y, -HW - g), V(X_H - g, y, HW + g), ...APSE.map(([x, z]) => V(x + (x > X_A ? g : 0), y, z + Math.sign(z) * g))].reverse()
  b.add(WALL, loft([ring(0), ring(TOP)], { capTop: true, flat: true }))
  b.add('socle', loft([ring(0, 0.06), ring(0.35, 0.06)], { capTop: true, flat: true }))
  // top board under the eaves
  b.add(FR, loft([ring(TOP - 0.12, 0.03), ring(TOP, 0.03)], { capTop: true, flat: true }))
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    for (const x of [-3.0, 2.4]) win(b, face, s * HW, s * x, 1.25)
  }
  // apse facets: small windows on the two oblique facets
  for (const s of [-1, 1]) {
    const [xa, za] = APSE[s > 0 ? 1 : 3]
    const [xb, zb] = APSE[s > 0 ? 2 : 4]
    const n = V(-(zb - za), 0, xb - xa).normalize()
    const m = mat((xa + xb) / 2, 0, (za + zb) / 2, Math.atan2(n.x, n.z))
    b.add('glassC', metricBox(0.4, 0.9, 0.03), mul(m, mat(0, 1.9, 0.02)))
    b.add(FR, extrude(frameShape('rect', 0.4, 0.9, 0.07, 0, 1.45), 0.05, 4), mul(m, mat(0, 0, 0.01)))
  }

  /* ---------------- main roof ---------------- */
  {
    const ov = 0.45
    const he = HW + ov
    const yE = TOP - ov * t
    const yR = TOP + HW * t
    const xRe = 6.4 - HW // ridge end over the rounded east end
    const xw = X_H - 0.55
    for (const s of [-1, 1]) facet(b, CU, [V(xw, yE, s * he), V(X_A, yE, s * he), V(xRe, yR, 0), V(xw, yR, 0)], { seams: SEAM, thickness: 0.08 })
    // hipped facets over the rounded end
    const eave = APSE.map(([x, z]) => {
      const dx = x - xRe
      const L = Math.hypot(dx, z) || 1
      return V(x + (dx / L) * ov * (x > X_A ? 1 : 0), yE, z + Math.sign(z) * ov)
    })
    for (let i = 0; i < eave.length - 1; i++) {
      facet(b, CU, [eave[i], eave[i + 1], V(xRe, yR, 0)], { seams: SEAM, thickness: 0.08 })
      b.rod(CU, eave[i].clone().add(V(0, 0.04, 0)), V(xRe, yR + 0.04, 0), 0.04, 5)
    }
    b.rod(CU, eave[eave.length - 1].clone().add(V(0, 0.04, 0)), V(xRe, yR + 0.04, 0), 0.04, 5)
    b.rod(CU, V(xw, yR + 0.05, 0), V(xRe, yR + 0.05, 0), 0.05, 6)
    // west gable: wall triangle, exposed rafters, verge boards
    const tri = new THREE.Shape([new THREE.Vector2(-HW, TOP - 0.02), new THREE.Vector2(HW, TOP - 0.02), new THREE.Vector2(0, yR - 0.05)])
    b.add(WALL, extrude(tri, 0.2), mat(X_H, 0, 0, Math.PI / 2))
    for (const s of [-1, 1]) {
      b.beam(FR, V(xw + 0.04, yE - 0.06, s * he), V(xw + 0.04, yR - 0.06, 0), 0.06, 0.22, V(-1, 0, 0))
      for (let k = 0; k < 5; k++) {
        const f = (k + 0.5) / 5
        const z = s * he * (1 - f)
        const y = yE + (he - Math.abs(z)) * t - 0.16
        b.beam(FR, V(xw, y, z), V(X_H, y + 0.0, z), 0.08, 0.14)
      }
    }
    // gutters
    for (const s of [-1, 1]) b.rod('zincNatural', V(xw, yE - 0.06, s * (he + 0.05)), V(X_A, yE - 0.06, s * (he + 0.05)), 0.06, 6)
  }

  /* ---------------- lateral conchs ---------------- */
  for (const s of [-1, 1]) {
    const { x, w, d, top } = CONCH
    const pts: [number, number][] = [[x - w / 2, HW], [x - w / 2 + 0.6, HW + d], [x + w / 2 - 0.6, HW + d], [x + w / 2, HW]]
    const r = (y: number) => pts.map(([px, pz]) => V(px, y, s * pz))
    const rr = (y: number) => (s > 0 ? r(y) : r(y).reverse())
    b.add(WALL, loft([rr(0), rr(top)], { capTop: true, flat: true }))
    // low hipped roof against the hall wall
    const ov = 0.3
    const yE = top - 0.1
    const o = [V(x - w / 2 - ov, yE, s * HW), V(x - w / 2 + 0.55, yE, s * (HW + d + ov)), V(x + w / 2 - 0.55, yE, s * (HW + d + ov)), V(x + w / 2 + ov, yE, s * HW)]
    const apex = [V(x - 0.4, yE + 0.75, s * (HW - 0.02)), V(x + 0.4, yE + 0.75, s * (HW - 0.02))]
    facet(b, CU, [o[0], o[1], apex[0]], { seams: SEAM, thickness: 0.06 })
    facet(b, CU, [o[1], o[2], apex[1], apex[0]], { seams: SEAM, thickness: 0.06 })
    facet(b, CU, [o[2], o[3], apex[1]], { seams: SEAM, thickness: 0.06 })
    for (const [a, c] of [[o[1], apex[0]], [o[2], apex[1]]] as [THREE.Vector3, THREE.Vector3][]) b.rod(CU, a.clone().add(V(0, 0.03, 0)), c.clone().add(V(0, 0.03, 0)), 0.035, 5)
    // window on the front facet
    win(b, s > 0 ? '+z' : '-z', s * (HW + d), s * x, 1.15, 0.45, 1.0)
  }

  /* ---------------- closed west porch ---------------- */
  {
    const x0 = X_W
    const x1 = X_H
    b.block(WALL, x1 - x0, PORCH_TOP, 2 * HW, (x0 + x1) / 2, 0, 0)
    b.block('socle', x1 - x0 + 0.12, 0.35, 2 * HW + 0.12, (x0 + x1) / 2, 0, 0)
    b.block(FR, x1 - x0 + 0.06, 0.1, 2 * HW + 0.06, (x0 + x1) / 2, PORCH_TOP - 0.1, 0)
    win(b, '-z', -HW, -(x0 + x1) / 2, 1.2, 0.7, 0.9)
    win(b, '+z', HW, (x0 + x1) / 2, 1.2, 0.7, 0.9)
    const fm = faceFrame('-x', x0, 0, 0, 0)
    b.add('wood', metricBox(1.0, 2.1, 0.04), mul(fm, mat(0, 0.35 + 1.05, 0.03)))
    b.add(FR, extrude(frameShape('rect', 1.0, 2.1, 0.08, 0, 0.35), 0.06, 4), mul(fm, mat(0, 0, 0.01)))
    const pt = Math.tan(24 * D2R)
    const ov = 0.35
    const he = HW + ov
    const yE = PORCH_TOP - ov * pt
    const yR = PORCH_TOP + (x1 - x0) * pt
    // single slope front (west) + side triangles, rising to the hall gable
    const zr = HW - (x1 - x0)
    facet(b, CU, [V(x0 - ov, yE, -he), V(x0 - ov, yE, he), V(x1, yR, zr + 0.25), V(x1, yR, -zr - 0.25)], { seams: SEAM, thickness: 0.06 })
    for (const s of [-1, 1]) {
      facet(b, CU, [V(x0 - ov, yE, s * he), V(x1, yE, s * he), V(x1, yR, s * (zr + 0.25))], { seams: SEAM, thickness: 0.06 })
      b.rod(CU, V(x0 - ov, yE + 0.03, s * he), V(x1, yR + 0.03, s * (zr + 0.25)), 0.035, 5)
    }
  }

  /* ---------------- lantern turret on the ridge ---------------- */
  {
    const { x, s, h } = TURRET
    const yR = TOP + HW * t
    b.block(WALL, s, h + 0.5, s, x, yR - 0.5, 0)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f.endsWith('x') ? x + (f[0] === '+' ? s / 2 : -s / 2) : f[0] === '+' ? s / 2 : -s / 2
      const u = f.endsWith('x') ? 0 : f === '+z' ? x : -x
      const m = faceFrame(f, plane, u, 0, 0)
      for (const sg of [-1, 1]) b.add(FR, metricBox(0.05, Math.hypot(s * 0.75, h * 0.8), 0.03), mul(m, mat(0, yR + h / 2, 0.02, 0, 0, sg * Math.atan2(s * 0.75, h * 0.8))))
    }
    const y0 = yR + h
    const roof: [number, number][] = [[s / 2 + 0.22, y0 - 0.05], [s / 2 + 0.2, y0 + 0.02], [0.04, y0 + 0.62]]
    b.add(CU, loft(roof.map(([r, y]) => [V(x - r, y, -r), V(x + r, y, -r), V(x + r, y, r), V(x - r, y, r)]), { capBottom: true, flat: true }))
    b.rod('iron', V(x, y0 + 0.6, 0), V(x, y0 + 1.6, 0), 0.025, 6)
    b.add('iron', metricBox(0.04, 0.04, 0.5), mat(x, y0 + 1.35, 0))
    b.add('iron', metricBox(0.04, 0.04, 0.3), mat(x, y0 + 1.5, 0))
  }

  // small iron cross on the east hip end
  {
    const yR = TOP + HW * t
    const xe = 6.4 - HW
    b.rod('iron', V(xe, yR, 0), V(xe, yR + 1.2, 0), 0.025, 6)
    b.add('iron', metricBox(0.04, 0.04, 0.55), mat(xe, yR + 0.9, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [1.5, 4.2, 2.2],
  notes:
    'Timber-framed church-paraclis (2008–2009) interpreted from two 2008–2009 photographs and the OSM outline; the photos show a grey sheet roof — copper follows the 2022 project record, recipient building not documented.',
}
export default model
