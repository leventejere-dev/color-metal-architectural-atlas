/**
 * Casa Dianu, Craiova (Str. 24 Ianuarie 4; OSM way 746340895) — eclectic villa of
 * c. 1906, restored as the Museum of the Book and of the Romanian Exile, with
 * renewed natural titanium-zinc domes, mansards and ornaments.
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = OSM axis 16° = the street façade on Str. 24 Ianuarie (front), +Z = 106°
 * = the entrance side towards the passage). Sources: 01 (2026, after the
 * restoration) and 02, 03 (2011–2019) street views of the +X façade from the
 * +Z corner, 04 the entrance side from the passage, 05 the rear terrace, and
 * the OSM outline (21.7 × 19.3 m with the notch at the rear).
 *  - Main block x −8.2 … 9.6 across the full depth, rear wing x −10.8 … −8.2
 *    on the −Z half (OSM notch); semi-basement ≈ 1.7 m, very tall ground floor
 *    (windows ≈ 3 m), entablature and attic to ≈ 8.0 m, standing-seam mansard
 *    roof with a flat top (01, 03, 05).
 *  - Street façade (+X), from the entrance corner: entrance pavilion (narrow
 *    street face between fluted piers, entrance on the passage side with a tall
 *    arched window over the glass marquise and steps, curved square fish-scale
 *    dome with a flat crested top); projecting square corner tower with an attic
 *    panel and a round fish-scale bell dome with an oculus dormer and finial;
 *    middle bay with one window and an oculus dormer in the mansard; a round
 *    shaft with a small cap; the wide right pavilion with three windows between
 *    engaged columns, an ornate dormer-gable and the large square fish-scale dome
 *    with cresting (01, 03).
 *  - METAL (as photographed in 01, 2026): domes, mansards, dormers, crestings
 *    and flashings in natural titanium-zinc ('zincNatural'); fish-scale domes
 *    suggested by fine scale courses, mansards with standing seams ≈ 0.5 m.
 * Approximations: the rear (−X) and the neighbour (−Z) façades are only partly
 * photographed — their window rhythm is inferred; stucco ornament (cartouches,
 * masks, garlands) reduced to panels and blocks; dome profiles and heights
 * estimated from the street photographs; the iron fence is not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, loft, lathe, rectRing, seams, faceFrame, mansardRoof } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const ZN = 'zincNatural'
const WALL = 'dianuWhite'
const ORN = 'dianuOrn'
const SEAM = seams(ZN, 0.5, 0.035, 0.04)

/* plan */
const MX0 = -8.2
const MX1 = 9.6
const HZ = 9.69
const REAR = { x0: -10.8, z0: -HZ, z1: -1.19 }
const TOWER = { x1: 10.8, z0: 2.6, z1: 6.6 }
const RPAV = { x1: 10.2, z0: -HZ, z1: -2.1 }
const EPAV = { x0: 5.1, z0: 6.6 }

/* heights */
const BASE = 1.7
const CORN = 7.6
const ATTIC = 8.1

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** window with dark timber frame, stucco surround, sill, crown and a basement light below */
function win(b: Builder, face: Face, plane: number, u: number, w = 1.35, h = 3.0, y0 = BASE + 0.55, type: OpeningType = 'rect', basement = true) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.03)))
  b.add('dianuFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.07, 0, y0 + 0.03), 0.06, 8), mul(m, mat(0, 0, 0.02)))
  b.add('dianuFrame', metricBox(0.07, h * 0.95, 0.05), mul(m, mat(0, y0 + h * 0.475, 0.05)))
  b.add('dianuFrame', metricBox(w, 0.07, 0.05), mul(m, mat(0, y0 + h * 0.72, 0.05)))
  b.add(ORN, extrude(frameShape(type, w, h, 0.2, 0, y0), 0.12, 8), m)
  b.add(ORN, metricBox(w + 0.6, 0.14, 0.3), mul(m, mat(0, y0 - 0.25, 0.12)))
  // ornamental crown: panel + cornice + keystone cartouche
  b.add(ORN, metricBox(w + 0.5, 0.55, 0.1), mul(m, mat(0, y0 + h + 0.5, 0.06)))
  b.add(ORN, metricBox(w + 0.8, 0.14, 0.3), mul(m, mat(0, y0 + h + 0.85, 0.14)))
  b.add(ORN, metricBox(0.45, 0.6, 0.2), mul(m, mat(0, y0 + h + 0.3, 0.12)))
  // apron panel under the sill
  b.add(ORN, metricBox(w + 0.2, 0.45, 0.06), mul(m, mat(0, y0 - 0.7, 0.04)))
  if (basement) {
    b.add('glassC', metricBox(w * 0.75, 0.55, 0.04), mul(m, mat(0, 0.75, 0.02)))
    b.add(ORN, extrude(frameShape('rect', w * 0.75, 0.55, 0.12, 0, 0.475), 0.08, 4), m)
  }
}

/** pilaster strip with base and capital block */
function pil(b: Builder, face: Face, plane: number, u: number, y0: number, y1: number, w = 0.55, d = 0.16) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(ORN, metricBox(w, y1 - y0, d), mul(m, mat(0, (y0 + y1) / 2, d / 2)))
  b.add(ORN, metricBox(w + 0.16, 0.3, d + 0.1), mul(m, mat(0, y1 - 0.15, (d + 0.1) / 2)))
  // fluting
  for (const k of [-1, 0, 1]) b.add('dianuShade', metricBox(0.05, (y1 - y0) * 0.5, 0.02), mul(m, mat(k * w * 0.25, y0 + (y1 - y0) * 0.45, d + 0.005)))
}

/** entablature: frieze band, cornice with modillions, attic band — around a rectangle */
function entablature(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, attic = ATTIC) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  b.block(ORN, w + 0.12, 0.3, d + 0.12, cx, y - 1.0, cz)
  b.block(ORN, w + 0.3, 0.18, d + 0.3, cx, y - 0.25, cz)
  b.block(ORN, w + 0.6, 0.22, d + 0.6, cx, y - 0.07, cz)
  b.block(ZN, w + 0.64, 0.04, d + 0.64, cx, y + 0.15, cz)
  if (attic > y + 0.2) b.block(WALL, w, attic - y, d, cx, y, cz)
}

/** curved square ("imperial") dome: profile of [scale, y] stations over a hx × hz rectangle, with fish-scale courses and corner ribs */
function squareDome(b: Builder, cx: number, cz: number, hx: number, hz: number, y0: number, prof: [number, number][], crest = true) {
  const rings = prof.map(([s, y]) => rectRing(Math.max(0.05, hx - (1 - s) * Math.min(hx, hz)), Math.max(0.05, hz - (1 - s) * Math.min(hx, hz)), y0 + y, cx, cz))
  b.add(ZN, loft(rings, { capBottom: false, capTop: true }))
  // scale courses (thin offset bands every ≈ 0.28 m along the profile)
  for (let i = 0; i < prof.length - 1; i++) {
    const [s0, ya] = prof[i]
    const [s1, yb] = prof[i + 1]
    const L = Math.hypot((s1 - s0) * Math.min(hx, hz), yb - ya)
    const n = Math.max(1, Math.round(L / 0.28))
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n
      const s = s0 + (s1 - s0) * t
      const y = y0 + ya + (yb - ya) * t
      const ex = Math.max(0.05, hx - (1 - s) * Math.min(hx, hz)) + 0.025
      const ez = Math.max(0.05, hz - (1 - s) * Math.min(hx, hz)) + 0.025
      b.add('zincScale', loft([rectRing(ex, ez, y - 0.02, cx, cz), rectRing(ex, ez, y + 0.02, cx, cz)], { flat: true }))
    }
  }
  // corner ribs
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let i = 0; i < prof.length - 1; i++) {
      const p = (j: number) => {
        const [s, y] = prof[j]
        const ex = Math.max(0.05, hx - (1 - s) * Math.min(hx, hz)) + 0.04
        const ez = Math.max(0.05, hz - (1 - s) * Math.min(hx, hz)) + 0.04
        return V(cx + sx * ex, y0 + y, cz + sz * ez)
      }
      b.beam(ZN, p(i), p(i + 1), 0.16, 0.12)
    }
  }
  const [st, yt] = prof[prof.length - 1]
  const tx = Math.max(0.05, hx - (1 - st) * Math.min(hx, hz))
  const tz = Math.max(0.05, hz - (1 - st) * Math.min(hx, hz))
  if (crest) {
    // flat top with cast cresting: posts + rails + small finials
    const yc = y0 + yt
    b.block(ZN, 2 * tx + 0.2, 0.16, 2 * tz + 0.2, cx, yc, cz)
    for (const [ax, az, bx, bz] of [[-tx, -tz, tx, -tz], [tx, -tz, tx, tz], [tx, tz, -tx, tz], [-tx, tz, -tx, -tz]]) {
      const A = V(cx + ax, yc + 0.16, cz + az)
      const B = V(cx + bx, yc + 0.16, cz + bz)
      b.beam(ZN, A.clone().add(V(0, 0.42, 0)), B.clone().add(V(0, 0.42, 0)), 0.05, 0.05)
      const L = A.distanceTo(B)
      const n = Math.max(2, Math.round(L / 0.22))
      for (let k = 0; k <= n; k++) {
        const P = A.clone().lerp(B, k / n)
        b.add(ZN, metricBox(0.035, 0.42, 0.035), mat(P.x, P.y + 0.21, P.z))
        if (k % 3 === 0) b.add(ZN, new THREE.SphereGeometry(0.07, 6, 4), mat(P.x, P.y + 0.5, P.z))
      }
    }
  }
}

/** round fish-scale dome (lathe) with courses, optional finial */
function roundDome(b: Builder, cx: number, cz: number, y0: number, r: number, prof: [number, number][]) {
  const pts = prof.map(([s, y]) => [s * r, y] as [number, number])
  b.add(ZN, lathe(pts, 32), mat(cx, y0, cz))
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, ya] = pts[i]
    const [r1, yb] = pts[i + 1]
    const L = Math.hypot(r1 - r0, yb - ya)
    const n = Math.max(1, Math.round(L / 0.24))
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n
      const rr = r0 + (r1 - r0) * t + 0.02
      if (rr < 0.15) continue
      const y = ya + (yb - ya) * t
      b.add('zincScale', new THREE.CylinderGeometry(rr, rr + 0.01, 0.04, 32, 1, true), mat(cx, y0 + y, cz))
    }
  }
}

/** solid arched attic panel (segmental crown) on a façade frame m: width w, from y0 to the crown top yt */
function crownPanel(b: Builder, m: THREE.Matrix4, w: number, y0: number, yt: number, depth = 0.45) {
  const sh = new THREE.Shape()
  const hw = w / 2
  const rise = Math.min(hw, (yt - y0) * 0.55)
  const ys = yt - rise
  const R = (hw * hw + rise * rise) / (2 * rise)
  const cy = ys + rise - R
  const a0 = Math.asin(hw / R)
  sh.moveTo(-hw, y0)
  sh.lineTo(hw, y0)
  sh.lineTo(hw, ys)
  for (let i = 0; i <= 16; i++) {
    const a = a0 - (2 * a0 * i) / 16
    sh.lineTo(R * Math.sin(a), cy + R * Math.cos(a))
  }
  sh.lineTo(-hw, y0)
  b.add(WALL, extrude(sh, depth, 4), mul(m, mat(0, 0, -depth + 0.1)))
  // moulded rim
  const rim = new THREE.Shape()
  for (let i = 0; i <= 16; i++) {
    const a = a0 - (2 * a0 * i) / 16
    rim.lineTo((R + 0.14) * Math.sin(a) * (i === 0 ? 1 : 1), cy + (R + 0.14) * Math.cos(a))
  }
  for (let i = 16; i >= 0; i--) {
    const a = a0 - (2 * a0 * i) / 16
    rim.lineTo(R * Math.sin(a), cy + R * Math.cos(a))
  }
  b.add(ORN, extrude(rim, depth + 0.1, 4), mul(m, mat(0, 0, -depth + 0.1)))
  b.add(ORN, metricBox(w + 0.3, 0.16, depth + 0.2), mul(m, mat(0, y0 + 0.08, -depth / 2 + 0.1)))
}

/** oculus dormer (oeil-de-boeuf) with zinc hood, facing local +z of matrix m */
function oculus(b: Builder, m: THREE.Matrix4, y: number, r = 0.38) {
  b.add(ZN, new THREE.CylinderGeometry(r + 0.22, r + 0.22, 0.7, 20, 1, false, -Math.PI / 2, Math.PI), mul(m, mat(0, y + 0.05, 0.05, 0, Math.PI / 2)))
  b.add(ORN, new THREE.TorusGeometry(r + 0.06, 0.1, 6, 20), mul(m, mat(0, y, 0.42)))
  b.add('glassC', new THREE.CircleGeometry(r, 18), mul(m, mat(0, y, 0.4)))
  b.add(ORN, metricBox(2 * r + 0.5, 2 * r + 0.3, 0.5), mul(m, mat(0, y - 0.15, 0.15)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const mcx = (MX0 + MX1) / 2
  b.block(WALL, MX1 - MX0, ATTIC, 2 * HZ, mcx, 0, 0)
  b.block(WALL, MX0 - REAR.x0 + 0.02, ATTIC, REAR.z1 - REAR.z0, (REAR.x0 + MX0) / 2, 0, (REAR.z0 + REAR.z1) / 2)
  // street projections
  b.block(WALL, TOWER.x1 - MX1 + 0.02, 9.3, TOWER.z1 - TOWER.z0, (MX1 + TOWER.x1) / 2, 0, (TOWER.z0 + TOWER.z1) / 2)
  b.block(WALL, RPAV.x1 - MX1 + 0.02, 8.6, RPAV.z1 - RPAV.z0, (MX1 + RPAV.x1) / 2, 0, (RPAV.z0 + RPAV.z1) / 2)
  // entrance pavilion rises higher
  b.block(WALL, MX1 - EPAV.x0, 8.6, HZ - EPAV.z0, (EPAV.x0 + MX1) / 2, 0, (EPAV.z0 + HZ) / 2)
  // semi-basement plinth (rusticated band) and string course
  const plinth = (x0: number, x1: number, z0: number, z1: number) => {
    b.block('dianuPlinth', x1 - x0 + 0.12, BASE - 0.15, z1 - z0 + 0.12, (x0 + x1) / 2, 0, (z0 + z1) / 2)
    b.block(ORN, x1 - x0 + 0.24, 0.22, z1 - z0 + 0.24, (x0 + x1) / 2, BASE - 0.2, (z0 + z1) / 2)
    for (const y of [0.45, 0.85]) b.block('dianuShade', x1 - x0 + 0.13, 0.04, z1 - z0 + 0.13, (x0 + x1) / 2, y, (z0 + z1) / 2)
  }
  plinth(MX0, MX1, -HZ, HZ)
  plinth(REAR.x0, MX0, REAR.z0, REAR.z1)
  plinth(MX1, TOWER.x1, TOWER.z0, TOWER.z1)
  plinth(MX1, RPAV.x1, RPAV.z0, RPAV.z1)
  entablature(b, MX0, MX1, -HZ, HZ, CORN)
  entablature(b, REAR.x0, MX0, REAR.z0, REAR.z1, CORN)
  entablature(b, MX1, RPAV.x1, RPAV.z0, RPAV.z1, CORN, 8.6)
  entablature(b, MX1, TOWER.x1, TOWER.z0, TOWER.z1, CORN, 9.3)
  entablature(b, EPAV.x0, MX1, EPAV.z0, HZ, 8.3, 8.6)

  /* ================= street façade (+X) ================= */
  // corner tower: one window on the front, a narrow one on the passage side, attic panel with segmental crown
  win(b, '+x', TOWER.x1, -4.6)
  win(b, '+z', TOWER.z1, 10.2, 0.6, 2.6)
  pil(b, '+x', TOWER.x1, -2.85, BASE, CORN - 1.0, 0.45)
  pil(b, '+x', TOWER.x1, -6.35, BASE, CORN - 1.0, 0.45)
  {
    const m = faceFrame('+x', TOWER.x1, -4.6, 0, 0)
    b.add(ORN, metricBox(2.6, 0.9, 0.08), mul(m, mat(0, 8.3, 0.04)))
    crownPanel(b, m, 3.6, 9.3, 10.4, 0.5)
    b.block(ORN, TOWER.x1 - MX1 + 0.5, 0.25, TOWER.z1 - TOWER.z0 + 0.5, (MX1 + TOWER.x1) / 2, 9.3, (TOWER.z0 + TOWER.z1) / 2)
  }
  // entrance pavilion street face: fluted piers + tall narrow arched window
  pil(b, '+x', MX1, -6.85, BASE, 8.0, 0.6, 0.3)
  pil(b, '+x', MX1, -9.4, BASE, 8.0, 0.6, 0.3)
  win(b, '+x', MX1, -8.15, 0.9, 3.6, BASE + 0.55, 'round', false)
  // middle bay
  win(b, '+x', MX1, -0.85)
  pil(b, '+x', MX1, 0.95, BASE, CORN - 1.0, 0.45)
  pil(b, '+x', MX1, -2.45, BASE, CORN - 1.0, 0.45)
  // round shaft with a small cap
  b.add(WALL, new THREE.CylinderGeometry(0.62, 0.62, CORN + 0.6, 24), mat(MX1 + 0.15, (CORN + 0.6) / 2, -1.55))
  b.add(ORN, new THREE.CylinderGeometry(0.75, 0.75, 0.25, 24), mat(MX1 + 0.15, CORN - 0.1, -1.55))
  b.add(ORN, new THREE.CylinderGeometry(0.72, 0.72, 0.2, 24), mat(MX1 + 0.15, BASE - 0.1, -1.55))
  roundDome(b, MX1 + 0.15, -1.55, CORN + 0.6, 0.68, [[1, 0], [1.02, 0.12], [0.85, 0.42], [0.55, 0.7], [0.25, 0.86], [0.05, 0.95]])
  // right pavilion: three windows between engaged columns
  for (const z of [-7.85, -5.9, -3.95]) win(b, '+x', RPAV.x1, -z, 1.2, 3.0)
  for (const z of [-8.95, -6.85, -4.95, -2.9]) {
    b.add(ORN, new THREE.CylinderGeometry(0.2, 0.22, CORN - BASE - 1.2, 14), mat(RPAV.x1 + 0.12, BASE + (CORN - BASE - 1.2) / 2, z))
    b.block(ORN, 0.5, 0.3, 0.55, RPAV.x1 + 0.1, CORN - 1.25, z)
  }
  // ornate dormer-gable on the right pavilion attic (01)
  {
    const m = faceFrame('+x', RPAV.x1, 5.9, 0, 0)
    crownPanel(b, m, 3.0, 8.6, 10.9, 0.6)
    oculus(b, m, 9.6, 0.36)
    for (const sgn of [-1, 1]) {
      b.add(ORN, metricBox(0.45, 1.6, 0.5), mul(m, mat(sgn * 1.55, 9.4, 0.05)))
      b.add(ORN, new THREE.SphereGeometry(0.22, 8, 6), mul(m, mat(sgn * 1.55, 10.4, 0.05)))
    }
  }

  /* ================= passage side (+Z): entrance ================= */
  {
    const z = HZ
    // door with fanlight, marquise, tall arched window above
    const ex = 7.4
    const m = faceFrame('+z', z, ex, 0, 0)
    b.add('dianuFrame', metricBox(1.7, 3.2, 0.05), mul(m, mat(0, BASE + 1.6, 0.03)))
    b.add('glassC', metricBox(1.2, 1.5, 0.04), mul(m, mat(0, BASE + 2.1, 0.06)))
    b.add(ORN, extrude(frameShape('rect', 1.7, 3.2, 0.25, 0, BASE), 0.12, 4), m)
    win(b, '+z', z, ex, 1.8, 2.9, 5.0, 'round', false)
    for (const u of [ex - 1.75, ex + 1.75]) pil(b, '+z', z, u, BASE, 8.2, 0.6, 0.3)
    // glass marquise on iron brackets
    b.add('glassG', metricBox(2.8, 0.05, 1.9), mat(ex, 4.75, z + 0.95, 0, -0.18))
    b.beam('iron', V(ex - 1.4, 4.65, z + 1.9), V(ex + 1.4, 4.65, z + 1.9), 0.06, 0.12)
    for (const s of [-1, 1]) b.beam('iron', V(ex + s * 1.4, 4.95, z), V(ex + s * 1.4, 4.62, z + 1.9), 0.05, 0.1)
    for (const s of [-1, 1]) b.beam('iron', V(ex + s * 1.2, 3.9, z), V(ex + s * 1.2, 4.62, z + 1.6), 0.04, 0.04)
    // steps
    for (let i = 0; i < 6; i++) b.block('dianuPlinth', 2.6 + i * 0.3, BASE * (1 - i / 6), 0.32, ex, 0, z + 0.16 + i * 0.32)
    // other bays on the passage side
    for (const x of [3.2, -0.2, -3.6, -6.8]) win(b, '+z', z, x)
  }

  /* ================= neighbour side (−Z) and rear (−X) ================= */
  for (const x of [7.9, 4.6, 1.2, -2.2, -5.6, -9.4]) win(b, '-z', -HZ, -x)
  // rear wing
  for (const z of [-7.4, -3.5]) win(b, '-x', REAR.x0, z)
  win(b, '+z', REAR.z1, -9.5, 1.2, 2.8)
  // rear terrace in the notch (05): windows, door, canopy and stairs
  win(b, '-x', MX0, 2.2)
  win(b, '-x', MX0, 7.3)
  {
    const m = faceFrame('-x', MX0, 4.7, 0, 0)
    b.add('dianuFrame', metricBox(1.4, 3.0, 0.05), mul(m, mat(0, BASE + 1.5, 0.03)))
    b.add(ORN, extrude(frameShape('rect', 1.4, 3.0, 0.2, 0, BASE), 0.1, 4), m)
    // terrace slab, railing, canopy on posts
    b.block(ORN, 2.2, 0.2, 5.6, MX0 - 1.1, BASE - 0.2, 4.4)
    b.block('iron', 0.04, 0.9, 5.6, MX0 - 2.18, BASE, 4.4)
    b.add('dianuCanopy', metricBox(2.5, 0.06, 6.0), mat(MX0 - 1.25, 5.3, 4.4, 0, 0, 0.12))
    for (const z of [1.6, 4.4, 7.2]) b.add('iron', metricBox(0.08, 5.3, 0.08), mat(MX0 - 2.3, 2.65, z))
    for (let i = 0; i < 6; i++) b.block('dianuPlinth', 1.0, BASE * (1 - (i + 1) / 7), 0.3, MX0 - 1.6, 0, 7.4 + i * 0.3)
  }
  // pilasters at the corners
  for (const [f, plane, u] of [
    ['-z', -HZ, -9.3], ['-z', -HZ, 7.8], ['+z', HZ, -7.8], ['+z', HZ, 4.9], ['-x', REAR.x0, -9.3], ['-x', REAR.x0, -1.6],
  ] as [Face, number, number][]) pil(b, f, plane, u, BASE, CORN - 1.0, 0.6)

  /* ================= roofs ================= */
  // main mansard (standing seam): steep lower slopes, flat-ish top
  mansardRoof(b, ZN, { x: mcx, z: 0, w: MX1 - MX0, d: 2 * HZ, y: ATTIC, lowerPitch: 60, lowerRise: 1.7, upperPitch: 7, overhang: 0.15, seams: SEAM })
  // rear wing: low hip
  mansardRoof(b, ZN, { x: (REAR.x0 + MX0) / 2 + 0.6, z: (REAR.z0 + REAR.z1) / 2, w: MX0 - REAR.x0 + 1.2, d: REAR.z1 - REAR.z0, y: ATTIC, lowerPitch: 50, lowerRise: 1.2, upperPitch: 7, overhang: 0.15, seams: SEAM })
  // dormers: oculus in the middle bay mansard (street), two windows on the rear (05) and the passage side
  oculus(b, faceFrame('+x', MX1 - 0.55, 0.85, 0, 0), ATTIC + 0.95, 0.4)
  for (const [f, plane, u] of [['-x', MX0 + 0.55, 3.2], ['-x', MX0 + 0.55, 6.6], ['+z', HZ - 0.55, 1.5], ['+z', HZ - 0.55, -3.0], ['-z', -HZ + 0.55, 0.0], ['-z', -HZ + 0.55, -4.0]] as [Face, number, number][]) {
    const m = faceFrame(f, plane, u, 0, 0)
    b.add(WALL, metricBox(1.5, 1.4, 1.2), mul(m, mat(0, ATTIC + 0.9, -0.2)))
    b.add('glassC', metricBox(1.0, 0.95, 0.04), mul(m, mat(0, ATTIC + 0.95, 0.42)))
    b.add('dianuFrame', metricBox(0.06, 0.95, 0.05), mul(m, mat(0, ATTIC + 0.95, 0.45)))
    b.add(ZN, metricBox(1.7, 0.12, 1.4), mul(m, mat(0, ATTIC + 1.66, -0.2)))
  }
  // chimneys
  for (const [x, z] of [[-3.5, -4.5], [1.5, 5.5], [-6.5, 2.0]]) {
    b.block(WALL, 0.8, 2.0, 0.6, x, ATTIC + 1.4, z)
    b.block(ZN, 1.0, 0.12, 0.8, x, ATTIC + 3.4, z)
  }

  /* ================= domes ================= */
  // entrance pavilion: curved square fish-scale dome with flat crested top
  {
    const cx = (EPAV.x0 + MX1) / 2
    const cz = (EPAV.z0 + HZ) / 2
    b.block(ORN, MX1 - EPAV.x0 + 0.5, 0.25, HZ - EPAV.z0 + 0.5, cx, 8.6, cz)
    squareDome(b, cx, cz, (MX1 - EPAV.x0) / 2 + 0.1, (HZ - EPAV.z0) / 2 + 0.1, 8.85, [[1, 0], [0.98, 0.55], [0.9, 1.3], [0.74, 2.05], [0.55, 2.55], [0.48, 2.7]])
    // corner finials on the fluted piers
    for (const [x, z] of [[MX1, EPAV.z0 + 0.2], [MX1, HZ - 0.2], [EPAV.x0 + 0.2, HZ - 0.2]]) {
      b.block(ORN, 0.7, 0.9, 0.7, x, 8.6, z)
      b.add(ORN, new THREE.SphereGeometry(0.3, 10, 8), mat(x, 9.75, z))
    }
  }
  // corner tower: round fish-scale bell dome with an oculus and finial
  {
    const cx = (MX1 + TOWER.x1) / 2 - 0.35
    const cz = (TOWER.z0 + TOWER.z1) / 2
    b.block(WALL, 3.6, 0.75, 3.8, cx, 9.5, cz)
    b.block(ORN, 3.9, 0.18, 4.1, cx, 10.2, cz)
    roundDome(b, cx, cz, 10.38, 1.75, [[1, 0], [1.0, 0.35], [0.97, 0.85], [0.87, 1.45], [0.68, 2.0], [0.42, 2.45], [0.16, 2.72], [0.04, 2.78]])
    oculus(b, faceFrame('+x', cx + 1.3, -cz, 0, 0), 11.35, 0.32)
    b.add(ZN, new THREE.CylinderGeometry(0.06, 0.14, 0.4, 8), mat(cx, 13.25, cz))
    b.add(ZN, new THREE.SphereGeometry(0.18, 10, 8), mat(cx, 13.55, cz))
    b.add(ZN, new THREE.ConeGeometry(0.06, 0.35, 8), mat(cx, 13.85, cz))
  }
  // right pavilion: large curved square dome with cresting
  {
    const cx = 7.0
    const cz = -5.9
    b.block(ORN, 6.4, 0.25, 6.6, cx, 8.6, cz)
    squareDome(b, cx, cz, 3.2, 3.3, 8.85, [[1, 0], [0.99, 0.7], [0.92, 1.7], [0.78, 2.6], [0.62, 3.25], [0.55, 3.45]])
    // small round corner dome at the −Z street corner (01)
    b.add(WALL, new THREE.CylinderGeometry(0.75, 0.75, 1.2, 20), mat(RPAV.x1 - 0.6, 8.6 + 0.6, -HZ + 0.7))
    roundDome(b, RPAV.x1 - 0.6, -HZ + 0.7, 9.8, 0.85, [[1, 0], [0.98, 0.25], [0.8, 0.6], [0.5, 0.9], [0.2, 1.05], [0.04, 1.1]])
  }
  // decorative vases / acroteria along the attic (simplified)
  for (const [x, z] of [[MX1 + 0.1, 2.3], [MX1 + 0.1, -2.6], [RPAV.x1, -HZ + 0.2]]) {
    b.add(ORN, new THREE.CylinderGeometry(0.22, 0.16, 0.6, 10), mat(x, ATTIC + 0.8, z))
    b.add(ORN, new THREE.SphereGeometry(0.18, 8, 6), mat(x, ATTIC + 1.2, z))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0.55],
  materialFocus: [7.0, 10.0, -5.0],
  materials: (base) => {
    const scale = (base.zincNatural as THREE.MeshStandardMaterial).clone()
    scale.color.multiplyScalar(0.8)
    return {
    dianuWhite: new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.9 }),
    dianuOrn: new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.85 }),
    dianuShade: new THREE.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.9 }),
    dianuPlinth: new THREE.MeshStandardMaterial({ color: '#e4e0d6', roughness: 0.92 }),
    dianuFrame: new THREE.MeshStandardMaterial({ color: '#3b2a20', roughness: 0.6 }),
    dianuCanopy: new THREE.MeshStandardMaterial({ color: '#c7cbcd', roughness: 0.6 }),
    zincScale: scale,
    }
  },
  notes:
    'Eclectic villa (c. 1906) with fish-scale domes and mansards, interpreted from street photographs (2011–2026) and the OSM outline; rear and neighbour façades inferred, ornament simplified. Natural titanium-zinc domes, mansards and crestings as photographed after the restoration.',
}
export default model
