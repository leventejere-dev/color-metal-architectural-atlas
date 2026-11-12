/**
 * Biserica romano-catolică „Sfinții Apostoli Petru și Pavel” din Ciumani /
 * Gyergyócsomafalvi Szent Péter és Pál-templom (OSM way 379749108; neo-Gothic
 * hall church built 1875–78).
 *
 * Modelling specification (real metres, origin = OSM footprint centre at
 * ground, +X = OSM long axis 82.3° = E, towards the apse; +Z = 172.3° = S,
 * the road side; the church axis lies at z ≈ +0.3 in the outline):
 *  - Plan after the OSM outline: nave 35.7 × 17.0 m; in the middle of each long
 *    side a 12 m wide transept-like risalit projecting ≈ 3 m with its own
 *    stepped gable; narrower choir 7.5 × 13.1 m closed by a four-sided apse
 *    (OSM vertices); west front block (≈ 5 m deep) across the full nave width.
 *  - Heights from photo 01 with the 12 m risalit as scale (≈ 12 px/m):
 *    eaves ≈ 14.5 m (tall pointed windows ≈ 2 × 7 m, sills ≈ 3.8 m), roof
 *    ≈ 44° so that the belfry stays clear of the nave roof as in photo 02
 *    (nave ridge ≈ 22.7 m, risalit and choir ridges ≈ 20.3 / 20.8 m).
 *  - South risalit: projecting portal porch with pointed portal and small
 *    gable between pinnacles, rose window above, octagonal corner turrets,
 *    stepped gable with pinnacles (photos 01, 02); the north risalit has the
 *    same massing (not photographed; a tall window instead of the portal).
 *  - West front block rising above the eaves to ≈ 17.3 m with octagonal corner
 *    turrets (small cupolas at the east pair, photo 02) and, on its side faces,
 *    a pointed door, paired windows and an oculus (photo 01); the tower rises
 *    from its centre: 5.2 m square belfry stage with paired pointed openings
 *    to ≈ 26.2 m, then a metal crown with four clock gablets and corner
 *    pinnacles, slender octagonal spire, ball and cross ≈ 36.4 m.
 *  - Peach render with cream cornices, lesenes, corbel-table frieze and window
 *    surrounds; grey socle.
 *  - COLOR METAL scope (2025–26, elZinc Slate + natural titanium-zinc): the
 *    public photographs predate the works (dark red-brown roofs and spire), so
 *    per the client rule all roofs are shown in Slate standing seam (pans
 *    0.5 m) and the tower crown, spire, turret caps, gutters and flashings in
 *    natural titanium-zinc — the split between the two finishes is assumed.
 * Approximations: the photographs (one 658 px, one 240 px) leave the west
 * front and the north side largely unseen; window counts, tracery, pinnacle
 * ornament and the stepped gables are simplified; the tower's projection is
 * not in the OSM outline and is kept flush.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, helm, seams } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZC = 0.3
const NAVE = { x0: -23.4, x1: 12.3, hw: 8.5, h: 14.5 }
const WW = { x1: -18.4 } // west front block: x0 … x1
const RIS = { x0: -11.3, x1: 0.75, hw: 11.4 } // risalit outer face at |z| = hw
const CHOIR = { x1: 19.8, hw: 6.55 }
const APSE: [number, number][] = [
  [19.8, -6.55],
  [22.65, -4.0],
  [23.5, 0],
  [22.65, 4.0],
  [19.8, 6.55],
]
const PITCH = 44
const TP = Math.tan(PITCH * D2R)
const OV = 0.5
const N_RIDGE = NAVE.h + NAVE.hw * TP
const C_RIDGE = NAVE.h + CHOIR.hw * TP
const R_RIDGE = NAVE.h + ((RIS.x1 - RIS.x0) / 2) * TP
const XA = 16.8 // choir/apse roof apex
const TOWER = { hw: 2.6, y0: 17.3, top: 26.2 }
const WALL = 'ciuWall'
const TRIM = 'ciuTrim'
const ROOF = 'zincSlate'
const ZN = 'zincNatural'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
const SEAM_N = seams(ZN, 0.45, 0.04, 0.04)

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/** Beam between two points with a right-handed basis (w across, h along `up`). */
function beam(b: Builder, key: string, p: THREE.Vector3, q: THREE.Vector3, w: number, h: number, up = V(0, 1, 0)) {
  const d = V().subVectors(q, p)
  const L = d.length()
  if (L < 1e-5) return
  d.normalize()
  let side = V().crossVectors(up, d)
  if (side.lengthSq() < 1e-6) side = V().crossVectors(V(1, 0, 0), d)
  side.normalize()
  const up2 = V().crossVectors(d, side).normalize()
  b.add(key, metricBox(w, h, L), new THREE.Matrix4().makeBasis(side, up2, d).setPosition(V().addVectors(p, q).multiplyScalar(0.5)))
}

/** Offset a convex polygon (x, z; ordered like rectRing) outwards by d. */
function offsetPoly(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n]
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    const L = Math.hypot(dx, dz)
    const nx = dz / L
    const nz = -dx / L
    return { p: [p[0] + nx * d, p[1] + nz * d], dir: [dx / L, dz / L] }
  })
  return pts.map((_, i) => {
    const a = lines[(i - 1 + n) % n]
    const c = lines[i]
    const den = a.dir[0] * c.dir[1] - a.dir[1] * c.dir[0]
    if (Math.abs(den) < 1e-9) return [c.p[0], c.p[1]] as [number, number]
    const t = ((c.p[0] - a.p[0]) * c.dir[1] - (c.p[1] - a.p[1]) * c.dir[0]) / den
    return [a.p[0] + a.dir[0] * t, a.p[1] + a.dir[1] * t] as [number, number]
  })
}
const ring = (pts: [number, number][], y: number) => pts.map(([x, z]) => V(x, y, z))

/** Tall pointed window with surround, mullion, transoms and a tracery ring. */
function gWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10))), mul(m, mat(0, 0, 0.04)))
  b.add(TRIM, extrude(frameShape('pointed', w, h, 0.26, 0, y0), 0.12), mul(m, mat(0, 0, 0.0)))
  b.add(TRIM, metricBox(0.1, h - w * 0.75, 0.08), mul(m, mat(0, y0 + (h - w * 0.75) / 2, 0.07)))
  for (let i = 1; i < 5; i++) b.add('ciuLead', metricBox(w, 0.05, 0.05), mul(m, mat(0, y0 + (i * (h - w)) / 5, 0.07)))
  b.add(TRIM, new THREE.TorusGeometry(w * 0.2, 0.05, 5, 14), mul(m, mat(0, y0 + h - w * 0.6, 0.08)))
  b.add(TRIM, metricBox(w + 0.7, 0.16, 0.35), mul(m, mat(0, y0 - 0.2, 0.14)))
}

/** Octagonal turret with a cap (cone or small cupola) and finial. */
function turret(b: Builder, x: number, z: number, r: number, y0: number, y1: number, cap: 'cone' | 'cupola') {
  helm(b, WALL, { n: 8, x, z, flat: true, stations: [[r, y0], [r, y1]] })
  helm(b, TRIM, { n: 8, x, z, flat: true, stations: [[r + 0.12, y1 - 0.35], [r + 0.12, y1]] })
  helm(b, TRIM, { n: 8, x, z, flat: true, stations: [[r + 0.08, y1 - 2.4], [r + 0.08, y1 - 2.2]] })
  if (cap === 'cone') {
    helm(b, ZN, { n: 8, x, z, stations: [[r + 0.08, y1], [r * 0.55, y1 + 0.7], [0.02, y1 + 1.9]] })
    b.add(ZN, new THREE.SphereGeometry(0.1, 10, 8), mat(x, y1 + 1.95, z))
  } else {
    helm(b, ZN, { n: 8, x, z, stations: [[r + 0.1, y1], [r + 0.12, y1 + 0.3], [r * 0.9, y1 + 0.75], [r * 0.4, y1 + 1.05], [0.06, y1 + 1.2]] })
    b.rod(ZN, V(x, y1 + 1.1, z), V(x, y1 + 1.9, z), 0.03, 6)
  }
}

/** Gable outline with stepped edges (local x across, y up), base at y = 0. */
function steppedGable(hw: number, h: number, steps: number, lift = 0.6): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0)]
  for (let i = 0; i < steps; i++) {
    const x = hw - (i * hw) / steps
    const y = (i * h) / steps + lift
    const x2 = hw - ((i + 1) * hw) / steps
    pts.push(new THREE.Vector2(x, y + h / steps), new THREE.Vector2(x2 + 0.001, y + h / steps))
  }
  const right = pts.slice(2)
  const left = right
    .slice()
    .reverse()
    .map((p) => new THREE.Vector2(-p.x, p.y))
  return [pts[0], pts[1], ...right, ...left.slice(1)]
}

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw, h } = NAVE

  /* ================= walls ================= */
  // nave + west block (one volume) and choir/apse
  b.block(WALL, x1 - x0, h, 2 * hw, (x0 + x1) / 2, 0, 0)
  const choirOut: [number, number][] = [[x1 - 0.3, -CHOIR.hw], ...APSE, [x1 - 0.3, CHOIR.hw]]
  b.add(WALL, loft([ring(choirOut, 0), ring(choirOut, h)], { capTop: true, flat: true }))
  // risalits
  for (const s of [-1, 1]) b.block(WALL, RIS.x1 - RIS.x0, h, RIS.hw - hw + 0.3, (RIS.x0 + RIS.x1) / 2, 0, s * (hw + (RIS.hw - hw) / 2 - 0.15))
  // socle
  b.block('ciuSocle', x1 - x0 + 0.16, 1.0, 2 * hw + 0.16, (x0 + x1) / 2, 0, 0)
  b.add('ciuSocle', loft([ring(offsetPoly(choirOut, 0.08), 0), ring(offsetPoly(choirOut, 0.08), 1.0)], { capTop: true, flat: true }))
  for (const s of [-1, 1]) b.block('ciuSocle', RIS.x1 - RIS.x0 + 0.16, 1.0, RIS.hw - hw + 0.3, (RIS.x0 + RIS.x1) / 2, 0, s * (hw + (RIS.hw - hw) / 2 - 0.07))
  // cornice + corbel-table frieze on the long walls and the choir
  const cornice = (xa: number, xb: number, z: number, sgn: number) => {
    b.block(TRIM, xb - xa, 0.35, 0.5, (xa + xb) / 2, h - 0.35, z + sgn * 0.2)
    b.block(TRIM, xb - xa, 0.2, 0.25, (xa + xb) / 2, h - 1.05, z + sgn * 0.1)
    for (let x = xa + 0.3; x < xb - 0.2; x += 0.7) b.block(TRIM, 0.16, 0.5, 0.2, x, h - 0.85, z + sgn * 0.1)
  }
  for (const s of [-1, 1]) {
    cornice(WW.x1, RIS.x0, s * hw, s)
    cornice(RIS.x1, x1, s * hw, s)
  }
  b.add(TRIM, loft([ring(offsetPoly(choirOut, 0.2), h - 0.35), ring(offsetPoly(choirOut, 0.2), h)], { capTop: true, capBottom: true, flat: true }))
  b.add(TRIM, loft([ring(offsetPoly(choirOut, 0.1), h - 1.05), ring(offsetPoly(choirOut, 0.1), h - 0.85)], { capTop: true, capBottom: true, flat: true }))
  // lesenes between the bays
  for (const s of [-1, 1]) {
    for (const x of [WW.x1 + 0.45, -14.85, RIS.x0 - 0.45, RIS.x1 + 0.45, 6.5, x1 - 0.45]) b.block(TRIM, 0.9, h - 1.3, 0.22, x, 1.0, s * (hw + 0.11))
    b.block(TRIM, 0.8, h - 1.3, 0.2, CHOIR.x1 - 0.4, 1.0, s * (CHOIR.hw + 0.1))
  }

  /* ================= windows ================= */
  for (const s of [-1, 1]) {
    const ry = s > 0 ? 0 : Math.PI
    for (const x of [-16.6, -13.1, 3.8, 9.3]) gWin(b, mat(x, 0, s * hw, ry), 2.0, 7.2, 3.8)
    gWin(b, mat(16.1, 0, s * CHOIR.hw, ry), 1.8, 6.6, 4.2)
  }
  // apse facets
  for (let i = 0; i < APSE.length - 1; i++) {
    const [ax, az] = APSE[i]
    const [cx, cz] = APSE[i + 1]
    const mx = (ax + cx) / 2
    const mz = (az + cz) / 2
    const nx = cz - az
    const nz = -(cx - ax)
    const ry = Math.atan2(nx, nz)
    gWin(b, mat(mx, 0, mz, ry), 1.6, 6.2, 4.4)
  }

  /* ================= risalits: gables, turrets, portal ================= */
  for (const s of [-1, 1]) {
    const zf = s * RIS.hw
    const ry = s > 0 ? 0 : Math.PI
    const xc = (RIS.x0 + RIS.x1) / 2
    const rhw = (RIS.x1 - RIS.x0) / 2
    // stepped gable wall above the eaves
    const g = new THREE.Shape(steppedGable(rhw, R_RIDGE - h + 0.2, 4, 0.5))
    b.add(WALL, extrude(g, 0.7), mul(mat(xc, h - 0.02, zf, ry), mat(0, 0, -0.7)))
    // step copings and small pinnacles at the outer step corners
    const gp = steppedGable(rhw, R_RIDGE - h + 0.2, 4, 0.5)
    const gm = mat(xc, h, zf, ry)
    for (let i = 2; i < gp.length; i++) {
      const p = gp[i]
      const q = gp[(i + 1) % gp.length]
      if (Math.abs(p.y - q.y) > 1e-6 || p.y < 0.1) continue
      b.add(TRIM, metricBox(Math.abs(q.x - p.x) + 0.2, 0.18, 0.85), mul(gm, mat((p.x + q.x) / 2, p.y + 0.09, -0.35)))
      const outer = Math.abs(p.x) > Math.abs(q.x) ? p : q
      if (Math.abs(outer.x) > 1.0) b.add(TRIM, new THREE.ConeGeometry(0.16, 0.9, 4), mul(gm, mat(outer.x, outer.y + 0.62, -0.1, Math.PI / 4)))
    }
    // central pinnacle on the apex
    b.block(TRIM, 0.6, 1.3, 0.6, xc, R_RIDGE + 0.6, zf - s * 0.35)
    b.add(ZN, new THREE.ConeGeometry(0.42, 1.5, 4), mat(xc, R_RIDGE + 2.65, zf - s * 0.35, Math.PI / 4))
    // gable cornice at the eaves
    b.add(TRIM, metricBox(2 * rhw + 0.4, 0.35, 0.5), mat(xc, h - 0.17, zf + s * 0.2, ry))
    // corner turrets
    for (const x of [RIS.x0, RIS.x1]) turret(b, x, zf, 0.72, 0, 17.6, 'cone')
    // big window on the gable wall (north) / rose window (south)
    const fm = mat(xc, 0, zf, ry)
    if (s > 0) {
      b.add('glassC', new THREE.CircleGeometry(1.75, 32), mul(fm, mat(0, 12.1, 0.04)))
      b.add(TRIM, new THREE.TorusGeometry(1.85, 0.22, 6, 32), mul(fm, mat(0, 12.1, 0.1)))
      for (let k = 0; k < 8; k++) b.add(TRIM, metricBox(0.08, 3.4, 0.06), mul(fm, mat(0, 12.1, 0.08, 0, 0, (k * Math.PI) / 8)))
      b.add(TRIM, new THREE.TorusGeometry(0.5, 0.07, 5, 20), mul(fm, mat(0, 12.1, 0.1)))
      // portal porch
      const pw = 5.0
      const pd = 0.9
      const ph = 8.6
      b.add(WALL, metricBox(pw, ph, pd), mul(fm, mat(0, ph / 2, pd / 2)))
      b.add('ciuSocle', metricBox(pw + 0.1, 1.0, pd + 0.1), mul(fm, mat(0, 0.5, pd / 2)))
      const tri = new THREE.Shape([new THREE.Vector2(-pw / 2 - 0.1, 0), new THREE.Vector2(pw / 2 + 0.1, 0), new THREE.Vector2(0, 2.2)])
      b.add(TRIM, extrude(tri, pd + 0.1), mul(fm, mat(0, ph, -0.05)))
      for (const u of [-pw / 2, pw / 2]) {
        b.add(TRIM, metricBox(0.55, ph + 1.4, 0.55), mul(fm, mat(u, (ph + 1.4) / 2, pd)))
        b.add(TRIM, new THREE.ConeGeometry(0.36, 1.3, 4), mul(fm, mat(u, ph + 2.05, pd, Math.PI / 4)))
      }
      const pm = mul(fm, mat(0, 0, pd))
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.4, 6.0, 0, 1.0, 12))), mul(pm, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('pointed', 2.4, 6.0, 0.45, 0, 1.0), 0.18), mul(pm, mat(0, 0, 0.0)))
      b.add(TRIM, metricBox(2.4, 0.18, 0.1), mul(pm, mat(0, 4.2, 0.05)))
      // steps
      for (let i = 0; i < 4; i++) b.add('ciuSocle', metricBox(4.2, 0.25 * (4 - i), 0.4), mul(pm, mat(0, 0.125 * (4 - i), 0.2 + i * 0.4)))
    } else {
      gWin(b, fm, 2.6, 8.5, 3.6)
    }
    // windows on the risalit side faces
    for (const [x, rr] of [[RIS.x0, -Math.PI / 2], [RIS.x1, Math.PI / 2]] as [number, number][]) gWin(b, mat(x, 0, s * (hw + (RIS.hw - hw) / 2), rr), 1.0, 5.2, 4.6)
  }

  /* ================= roofs (elZinc Slate) ================= */
  const eY = h - OV * TP
  {
    // nave gable roof from the west block to the east gable
    const xa = WW.x1
    const xb = x1 + 0.35
    const nh = hw + OV
    facet(b, ROOF, [V(xa, eY, nh), V(xb, eY, nh), V(xb, N_RIDGE, 0), V(xa, N_RIDGE, 0)], { seams: SEAM, thickness: 0.14 })
    facet(b, ROOF, [V(xb, eY, -nh), V(xa, eY, -nh), V(xa, N_RIDGE, 0), V(xb, N_RIDGE, 0)], { seams: SEAM, thickness: 0.14 })
    beam(b, ZN, V(xa, N_RIDGE + 0.08, 0), V(xb, N_RIDGE + 0.08, 0), 0.3, 0.18)
    // gutters (natural zinc)
    for (const s of [-1, 1]) {
      for (const [p, q] of [[WW.x1, RIS.x0 - OV], [RIS.x1 + OV, x1]] as [number, number][]) b.rod(ZN, V(p, eY - 0.1, s * (nh + 0.05)), V(q, eY - 0.1, s * (nh + 0.05)), 0.09, 6)
    }
    // west gable wall of the nave (above the west block) and east gable above the choir roof
    const gable = new THREE.Shape([new THREE.Vector2(-hw, h - 0.01), new THREE.Vector2(hw, h - 0.01), new THREE.Vector2(0, N_RIDGE - 0.06)])
    b.add(WALL, extrude(gable, 0.7), mat(xa + 0.7, 0, 0, -Math.PI / 2))
    b.add(WALL, extrude(gable, 0.7), mat(x1 - 0.7, 0, 0, Math.PI / 2))
    for (const s of [-1, 1]) beam(b, ZN, V(xb + 0.02, eY, s * nh), V(xb + 0.02, N_RIDGE + 0.05, 0), 0.25, 0.45, V(1, 0, 0))
    b.block(TRIM, 0.6, 1.5, 0.6, x1 - 0.3, N_RIDGE - 0.2, 0)
    b.add(ZN, new THREE.ConeGeometry(0.4, 1.4, 4), mat(x1 - 0.3, N_RIDGE + 2.0, 0, Math.PI / 4))
  }
  // risalit cross roofs with valleys into the nave roof
  for (const s of [-1, 1]) {
    const xl = RIS.x0 - OV
    const xr = RIS.x1 + OV
    const xc = (RIS.x0 + RIS.x1) / 2
    const zo = s * (RIS.hw + 0.05)
    const zin = s * (hw + OV)
    const zv = s * (hw - (R_RIDGE - h) / TP) // where the ridge meets the nave roof
    facet(b, ROOF, [V(xl, eY, zo), V(xl, eY, zin), V(xc, R_RIDGE, zv), V(xc, R_RIDGE, zo)], { seams: SEAM, thickness: 0.14 })
    facet(b, ROOF, [V(xr, eY, zin), V(xr, eY, zo), V(xc, R_RIDGE, zo), V(xc, R_RIDGE, zv)], { seams: SEAM, thickness: 0.14 })
    beam(b, ZN, V(xc, R_RIDGE + 0.08, zv), V(xc, R_RIDGE + 0.08, zo), 0.28, 0.16, V(0, 1, 0))
    for (const x of [xl, xr]) {
      beam(b, ZN, V(x, eY + 0.03, zin), V(xc, R_RIDGE + 0.03, zv), 0.35, 0.06) // valley flashing
      b.rod(ZN, V(x, eY - 0.1, zin), V(x, eY - 0.1, zo), 0.09, 6)
    }
  }
  // choir + apse roof (hipped over the apse)
  {
    const outl: [number, number][] = [[x1 - 0.6, -CHOIR.hw], ...APSE, [x1 - 0.6, CHOIR.hw]]
    const e = offsetPoly(outl, OV)
    e[0][0] = x1 - 0.6
    e[e.length - 1][0] = x1 - 0.6
    const E = ring(e, eY)
    const apex = V(XA, C_RIDGE, 0)
    const top = V(x1 - 0.6, C_RIDGE, 0)
    const n = E.length
    facet(b, ROOF, [E[n - 1], E[n - 2], apex, top], { seams: SEAM, thickness: 0.14 })
    facet(b, ROOF, [E[0], E[1], apex, top], { seams: SEAM, thickness: 0.14 })
    for (let i = 1; i < n - 2; i++) facet(b, ROOF, [E[i], E[i + 1], apex], { seams: SEAM, thickness: 0.14 })
    beam(b, ZN, top.clone().add(V(0, 0.08, 0)), apex.clone().add(V(0, 0.08, 0)), 0.28, 0.16)
    for (let i = 1; i < n - 1; i++) beam(b, ZN, E[i].clone().add(V(0, 0.08, 0)), apex.clone().add(V(0, 0.08, 0)), 0.26, 0.14)
    for (let i = 0; i < n - 1; i++) b.rod(ZN, E[i].clone().add(V(0, -0.1, 0)), E[i + 1].clone().add(V(0, -0.1, 0)), 0.09, 6)
    b.rod(ZN, apex, apex.clone().add(V(0, 1.6, 0)), 0.04, 6)
    b.add(ZN, new THREE.SphereGeometry(0.14, 10, 8), mat(apex.x, apex.y + 1.6, 0))
  }

  /* ================= west front block ================= */
  {
    const xw = x0
    const xe = WW.x1
    const xc = (xw + xe) / 2
    const top = TOWER.y0
    b.block(WALL, xe - xw, top, 2 * hw, xc, 0, 0)
    b.block(TRIM, xe - xw + 0.5, 0.4, 2 * hw + 0.5, xc, top - 0.8, 0)
    b.block(TRIM, xe - xw + 0.3, 0.2, 2 * hw + 0.3, xc, top - 0.2, 0)
    // flat roof behind the parapet (Slate)
    b.block(ROOF, xe - xw - 0.4, 0.1, 2 * hw - 0.4, xc, top - 0.05, 0)
    // corner turrets: pointed at the west, small cupolas at the east (photo 02)
    for (const s of [-1, 1]) {
      turret(b, xw, s * hw, 0.85, 0, 18.4, 'cone')
      turret(b, xe, s * hw, 0.8, 0, 17.9, 'cupola')
    }
    // west face: portal, windows on the wings
    const wm = mat(xw, 0, 0, -Math.PI / 2)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.4, 5.0, 0, 1.0, 12))), mul(wm, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('pointed', 2.4, 5.0, 0.45, 0, 1.0), 0.18), mul(wm, mat(0, 0, 0.0)))
    gWin(b, wm, 1.6, 5.4, 7.6)
    b.add('glassC', new THREE.CircleGeometry(0.9, 24), mul(wm, mat(0, 14.6, 0.04)))
    b.add(TRIM, new THREE.TorusGeometry(0.95, 0.14, 5, 24), mul(wm, mat(0, 14.6, 0.08)))
    for (const u of [-5.0, 5.0]) gWin(b, mul(wm, mat(u, 0, 0)), 1.4, 6.0, 5.0)
    // side faces (photo 01): pointed door, paired windows, oculus
    for (const s of [-1, 1]) {
      const sm = mat(xc, 0, s * hw, s > 0 ? 0 : Math.PI)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.5, 3.4, 0, 1.0, 10))), mul(sm, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('pointed', 1.5, 3.4, 0.3, 0, 1.0), 0.14), mul(sm, mat(0, 0, 0.0)))
      for (const u of [-0.55, 0.55]) gWin(b, mul(sm, mat(u, 0, 0)), 0.75, 2.8, 6.6)
      b.add('glassC', new THREE.CircleGeometry(0.55, 20), mul(sm, mat(0, 11.6, 0.04)))
      b.add(TRIM, new THREE.TorusGeometry(0.6, 0.12, 5, 20), mul(sm, mat(0, 11.6, 0.08)))
    }
    b.block('ciuSocle', xe - xw + 0.16, 1.0, 2 * hw + 0.16, xc, 0, 0)
  }

  /* ================= tower ================= */
  {
    const tx = (x0 + WW.x1) / 2
    const thw = TOWER.hw
    const y0 = TOWER.y0
    const yT = TOWER.top
    b.block(WALL, 2 * thw, yT - y0 + 0.2, 2 * thw, tx, y0 - 0.2, 0)
    b.block(TRIM, 2 * thw + 0.3, 0.3, 2 * thw + 0.3, tx, y0, 0)
    // corner shafts
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) helm(b, TRIM, { n: 8, x: tx + sx * thw, z: sz * thw, flat: true, stations: [[0.3, y0], [0.3, yT]] })
    // cornices
    b.block(TRIM, 2 * thw + 0.5, 0.25, 2 * thw + 0.5, tx, yT - 0.5, 0)
    b.block(TRIM, 2 * thw + 0.8, 0.25, 2 * thw + 0.8, tx, yT - 0.25, 0)
    const faceM = (f: number) => [mat(tx - thw, 0, 0, -Math.PI / 2), mat(tx, 0, thw, 0), mat(tx + thw, 0, 0, Math.PI / 2), mat(tx, 0, -thw, Math.PI)][f]
    for (let f = 0; f < 4; f++) {
      const m = faceM(f)
      // small window with a hood below the belfry
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.6, 1.4, 0, yT - 7.4, 8))), mul(m, mat(0, 0, 0.03)))
      b.add(TRIM, extrude(frameShape('pointed', 0.6, 1.4, 0.14, 0, yT - 7.4), 0.08), mul(m, mat(0, 0, 0.0)))
      // paired pointed belfry openings
      for (const u of [-0.75, 0.75]) {
        b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.95, 3.6, u, yT - 5.2, 10))), mul(m, mat(0, 0, 0.03)))
        b.add(TRIM, extrude(frameShape('pointed', 0.95, 3.6, 0.16, u, yT - 5.2), 0.1), mul(m, mat(0, 0, 0.0)))
        for (let i = 0; i < 6; i++) b.add('wood', metricBox(0.9, 0.05, 0.06), mul(m, mat(u, yT - 4.9 + i * 0.45, -0.05, 0, -0.5)))
      }
      b.add(TRIM, extrude(frameShape('pointed', 2.6, 4.7, 0.14, 0, yT - 5.6), 0.1), mul(m, mat(0, 0, 0.0)))
    }

    /* ---- natural titanium-zinc crown with clock gablets, pinnacles, spire ---- */
    const yc = yT
    const c8 = Math.cos(Math.PI / 8)
    // octagonal crown roof rising into the spire
    helm(b, ZN, { n: 8, x: tx, z: 0, stations: [[(thw + 0.35) / c8, yc], [(thw - 0.2) / c8, yc + 0.9], [1.75 / c8, yc + 2.0], [1.3 / c8, yc + 2.8]] })
    // clock gablets
    for (let f = 0; f < 4; f++) {
      const m = faceM(f)
      const tri = new THREE.Shape([new THREE.Vector2(-1.7, 0), new THREE.Vector2(1.7, 0), new THREE.Vector2(0, 2.6)])
      b.add(ZN, extrude(tri, 1.6), mul(m, mat(0, yc, -1.3)))
      b.add('white', new THREE.CylinderGeometry(0.6, 0.6, 0.08, 24), mul(m, mat(0, yc + 0.95, 0.32, 0, Math.PI / 2)))
      b.add('clock', new THREE.TorusGeometry(0.6, 0.05, 5, 24), mul(m, mat(0, yc + 0.95, 0.37)))
      b.add('clock', metricBox(0.05, 0.42, 0.03), mul(m, mat(0, yc + 1.12, 0.38)))
      b.add('clock', metricBox(0.32, 0.05, 0.03), mul(m, mat(0.13, yc + 0.95, 0.38)))
      // gablet roofs (two small slopes)
      for (const sg of [-1, 1]) {
        const p = V(sg * 1.85, yc - 0.1, 0.35).applyMatrix4(m)
        const q = V(0, yc + 2.75, 0.35).applyMatrix4(m)
        const p2 = V(sg * 1.85, yc - 0.1, -1.4).applyMatrix4(m)
        const q2 = V(0, yc + 2.75, -1.4).applyMatrix4(m)
        facet(b, ZN, [p, q, q2, p2], { seams: SEAM_N, thickness: 0.08 })
      }
    }
    // corner pinnacles
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const px = tx + sx * (thw + 0.05)
      const pz = sz * (thw + 0.05)
      helm(b, ZN, { n: 8, x: px, z: pz, flat: true, stations: [[0.34, yc], [0.34, yc + 1.4]] })
      helm(b, ZN, { n: 8, x: px, z: pz, stations: [[0.42, yc + 1.4], [0.3, yc + 1.7], [0.02, yc + 3.0]] })
      b.add(ZN, new THREE.SphereGeometry(0.08, 8, 6), mat(px, yc + 3.05, pz))
    }
    // slender octagonal spire with seams
    const ys = yc + 2.8
    const yTip = ys + 5.4
    const rs = 1.3 / c8
    const rg = Array.from({ length: 8 }, (_, k) => V(tx + Math.cos(Math.PI / 8 + (k * Math.PI) / 4) * rs, ys, Math.sin(Math.PI / 8 + (k * Math.PI) / 4) * rs))
    const tip = V(tx, yTip, 0)
    for (let k = 0; k < 8; k++) {
      facet(b, ZN, [rg[k], rg[(k + 1) % 8], tip], { seams: SEAM_N })
      beam(b, ZN, rg[k], tip, 0.07, 0.05, V(rg[k].x - tx, 0, rg[k].z).normalize())
    }
    // ball and cross
    b.add('gilt', new THREE.SphereGeometry(0.24, 14, 10), mat(tx, yTip + 0.2, 0))
    b.rod('iron', V(tx, yTip, 0), V(tx, yTip + 2.3, 0), 0.05, 6)
    b.add('iron', metricBox(0.08, 0.08, 1.0), mat(tx, yTip + 1.75, 0))
  }

  const out = new Builder()
  out.merge(b, mat(0, 0, ZC))
  return out
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-5.3, 20, 6],
  materials: () => ({
    ciuWall: new THREE.MeshStandardMaterial({ color: '#eccca6', roughness: 0.9 }),
    ciuTrim: new THREE.MeshStandardMaterial({ color: '#f3e5c9', roughness: 0.86 }),
    ciuSocle: new THREE.MeshStandardMaterial({ color: '#9e9a92', roughness: 0.92 }),
    ciuLead: new THREE.MeshStandardMaterial({ color: '#4a4c4f', roughness: 0.6, metalness: 0.3 }),
  }),
  notes:
    'Ciumani Catholic church: neo-Gothic hall with central risalits, west front block with turrets and tower, choir with polygonal apse. Roofs shown in elZinc Slate and the tower crown, spire and turret caps in natural titanium-zinc per COLOR METAL records (public photographs predate the 2025–26 works); heights estimated from two photographs.',
}
export default model
