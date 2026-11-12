/**
 * Mănăstirea Tazlău – church „Nașterea Maicii Domnului” (1496–1497), Tazlău, jud. Neamț.
 *
 * Modelling specification derived from the reference photographs (01–12, drone
 * and ground views) and the OSM outline (way 1147932372, 33.8 × 16.5 m over the
 * roof eaves, long axis 102.3°), real metres:
 *  - Moldavian trefoil church, altar to the east (+X). One long west body
 *    (pronaos + burial chamber, 8.8 m wide) continued by the naos with two
 *    many-sided lateral apses (centred on the tower axis) and a narrower,
 *    many-sided altar apse (photos 01, 02, 09).
 *  - Walls of white dressed stone with red-brick ornament: two registers of small
 *    brick-framed arched niches under the eaves on the straight walls with a row
 *    of glazed ceramic discs between them; tall brick-framed niches on every
 *    apse facet under a single row of small niches; tall blind arcade on the
 *    western bay; stepped stone buttresses at the west corners, at the bay
 *    divisions and on the altar axis; stone plinth (photos 04, 06, 09, 10).
 *  - Roofs (COLOR METAL scope, KME TECU® Patina Oslo copper, shown in the teal
 *    blue-green actually photographed; seams ≈ 0.5 m): broad bell-flared eaves (~1.35 m) on
 *    wooden soffits; one steep hipped roof with rounded hips over the western
 *    body (ridge ≈ 17.9 m, crosses at both ridge ends); over the east end a
 *    composite roof — low lobed cones over the lateral apses merging into a
 *    hipped naos roof, a separate steeper cone with cross over the altar apse
 *    (photos 01–06, 09).
 *  - Tower over the naos: two stepped star-shaped bases (two squares at 45°)
 *    with brick niches and copper caps, octagonal drum with brick corner strips,
 *    four narrow windows, a round cornice, octagonal bell-flared helm on a wooden
 *    soffit and a wrought-iron cross (photos 07, 10).
 * Approximations: absolute heights (no survey; scaled from photo proportions,
 * total ≈ 32 m), apse facet counts, niche and disc counts, window positions on
 * the north side (mirrored from the south), the composite east roof
 * (intersecting lofts instead of the carpenter's exact surfaces).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, rectRing, cross } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

/* materials */
const CU = 'tecuOslo'
const WALL = 'tazStone'
const BRICK = 'brickRed'
const SOCLE = 'stoneLight'
const WOOD = 'timber'
const GLZ = ['tazGlazeG', 'tazGlazeY']

/* main dimensions */
const H = 10.4 // wall top (eave plate)
const YE = 10.12 // roof eave edge
const OV = 1.35 // eave overhang
const BODY = { x0: -15.45, x1: 10.8, hw: 4.4 } // pronaos + naos walls
const TX = 5.6 // naos centre = tower axis
const LAT = { x: TX, z: 3.4, r: 3.2, n: 16 } // lateral apses (z = ±)
const ALT = { x0: 10.8, xc: 11.6, r: 3.6, n: 20 } // altar
const FLARE: P2[] = [
  [0.55, 26],
  [0.45, 38],
  [0.4, 48],
]

/** Roof surface from stacked rings as planar facets with standing seams (≈0.5 m) running up each facet. */
function seamedLoft(b: Builder, key: string, rings: THREE.Vector3[][], spacing = 0.5) {
  const sp = { key, spacing, h: 0.035, w: 0.04 }
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i]
    const B = rings[i + 1]
    for (let k = 0; k < A.length; k++) {
      const k1 = (k + 1) % A.length
      const q = [A[k], A[k1], B[k1], B[k]]
      const pts = q.filter((p, j) => p.distanceTo(q[(j + 1) % 4]) > 1e-4)
      if (pts.length >= 3) facet(b, key, pts, { seams: sp })
    }
  }
}

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const UP = V(0, 1, 0)

/** Wall-face frame: local x → right (seen from outside), y up, z outward. (cx, cz) on the face. */
function faceM(cx: number, cz: number, nx: number, nz: number, out = 0) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(UP, n)
  return new THREE.Matrix4().makeBasis(t, UP, n).setPosition(cx + n.x * out, 0, cz + n.z * out)
}

/** Round-arched outline (w × h, bottom at y0), few segments. */
function archPts(w: number, h: number, y0: number, seg = 6) {
  const hw = w / 2
  const ys = y0 + h - hw
  const pts = [new THREE.Vector2(-hw, y0), new THREE.Vector2(hw, y0)]
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  return pts
}
function archFrame(w: number, h: number, f: number, y0: number, seg = 6) {
  const s = new THREE.Shape(archPts(w + 2 * f, h + 2 * f, y0 - f, seg))
  s.holes.push(new THREE.Path(archPts(w, h, y0, seg)))
  return extrude(s, 0.07, 4)
}
const archFill = (w: number, h: number, y0: number, seg = 6) => new THREE.ShapeGeometry(new THREE.Shape(archPts(w, h, y0, seg)))

/** Brick-framed niche on a face frame at local u. */
function niche(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, f = 0.11) {
  b.add(BRICK, archFrame(w, h, f, y0), M(m, mat(u, 0, 0)))
}
/** Narrow arched window (dark glass, brick frame, stone sill). */
function windowArch(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number) {
  b.add('glassC', archFill(w, h, y0), M(m, mat(u, 0, 0.02)))
  b.add(BRICK, archFrame(w, h, 0.14, y0), M(m, mat(u, 0, 0)))
  b.add(SOCLE, metricBox(w + 0.4, 0.1, 0.22), M(m, mat(u, y0 - 0.18, 0.08)))
}
/** Glazed ceramic disc. */
function disc(b: Builder, m: THREE.Matrix4, u: number, y: number, i: number) {
  b.add(GLZ[i % 2], new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), M(m, mat(u, y, 0.03, 0, Math.PI / 2)))
}

/** Stepped stone buttress at (px, pz) on a wall with outward normal n. */
function buttress(b: Builder, px: number, pz: number, nx: number, nz: number, w = 1.0, d = 1.35, h = 6.4) {
  const n = V(nx, 0, nz).normalize()
  const t = V().crossVectors(n, UP).normalize()
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.2, 0),
    new THREE.Vector2(d, 0),
    new THREE.Vector2(d, h * 0.5),
    new THREE.Vector2(d * 0.62, h * 0.5 + d * 0.45),
    new THREE.Vector2(d * 0.62, h * 0.86),
    new THREE.Vector2(-0.2, h),
  ])
  const basis = new THREE.Matrix4().makeBasis(n, UP, t)
  basis.setPosition(V(px, 0, pz).sub(t.clone().multiplyScalar(w / 2)))
  b.add(WALL, extrude(prof, w, 2), basis)
  const plinth = new THREE.Matrix4().makeBasis(n, UP, t).setPosition(V(px, 0.45, pz).add(n.clone().multiplyScalar(d / 2)))
  b.add(SOCLE, metricBox(d + 0.5, 0.9, w + 0.2), plinth)
}

/** Bell-flared roof stations [r, y] from the eave radius r0 to rTop. */
function bell(r0: number, y0: number, finalDeg: number, rTop = 0.02, flare: P2[] = FLARE): P2[] {
  const out: P2[] = [[r0, y0]]
  let r = r0
  let y = y0
  for (const [du, deg] of flare) {
    r -= du
    y += du * Math.tan(deg * D2R)
    out.push([r, y])
  }
  y += (r - rTop) * Math.tan(finalDeg * D2R)
  out.push([rTop, y])
  return out
}

/** Unit end shape (x ≥ 0) from (0,-1) to (0,1): square end with rounded corners (rho = corner radius). */
function endShape(rho: number, seg = 3): P2[] {
  const pts: P2[] = [[0, -1]]
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2)
    pts.push([1 - rho + rho * Math.cos(a), -1 + rho + rho * Math.sin(a)])
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2)
    pts.push([1 - rho + rho * Math.cos(a), 1 - rho + rho * Math.sin(a)])
  }
  pts.push([0, 1])
  return pts
}
/** Ring around a ridge segment xW…xE at half-width r (hipped ends of shape `end`). */
function stadiumRing(xW: number, xE: number, r: number, y: number, end: P2[]) {
  const ring: THREE.Vector3[] = []
  for (const [ux, uz] of end) ring.push(V(xE + r * ux, y, r * uz))
  for (const [ux, uz] of end) ring.push(V(xW - r * ux, y, -r * uz))
  return ring
}

/** Rectangle ring with rounded corners (radius rc), ordered for outward faces. */
function roundRectRing(hx: number, hz: number, rc: number, y: number, cx = 0, seg = 3) {
  const c: P2[] = [
    [hx - rc, -(hz - rc)],
    [hx - rc, hz - rc],
    [-(hx - rc), hz - rc],
    [-(hx - rc), -(hz - rc)],
  ]
  const ring: THREE.Vector3[] = []
  c.forEach(([px, pz], k) => {
    for (let i = 0; i <= seg; i++) {
      const a = -Math.PI / 2 + (k + i / seg) * (Math.PI / 2)
      ring.push(V(cx + px + rc * Math.cos(a), y, pz + rc * Math.sin(a)))
    }
  })
  return ring
}

/** Polygonal bell cone with fascia and wooden soffit. */
function coneRoof(b: Builder, o: { x: number; z: number; n: number; rWall: number; finalDeg: number; phase?: number; rTop?: number; flare?: P2[] }) {
  const ph = o.phase ?? 0
  const r0 = o.rWall + OV
  const st = bell(r0, YE, o.finalDeg, o.rTop ?? 0.02, o.flare)
  seamedLoft(b, CU, st.map(([r, y]) => polyRing(o.n, r, y, ph, o.x, o.z)))
  b.add(CU, loft([polyRing(o.n, r0, YE - 0.16, ph, o.x, o.z), polyRing(o.n, r0, YE, ph, o.x, o.z)]))
  b.add(WOOD, loft([polyRing(o.n, o.rWall, H, ph, o.x, o.z), polyRing(o.n, r0 - 0.02, YE - 0.16, ph, o.x, o.z)]))
  return st[st.length - 1][1]
}

/** Star-shaped tower base tier (two squares at 45°) with brick niches and a copper cap. */
function starTier(b: Builder, s: number, y0: number, h: number) {
  for (const rot of [0, Math.PI / 4]) {
    b.add(WALL, metricBox(2 * s, h, 2 * s), mat(TX, y0 + h / 2, 0, rot))
    b.add(CU, loft([rectRing(s + 0.32, s + 0.32, y0 + h - 0.06), rectRing(s - 0.45, s - 0.45, y0 + h + 0.42)], { capTop: true, flat: true }), mat(TX, 0, 0, rot))
    b.add(BRICK, metricBox(2 * s + 0.06, 0.16, 2 * s + 0.06), mat(TX, y0 + h - 0.28, 0, rot))
    for (let j = 0; j < 4; j++) {
      const a = rot + (j * Math.PI) / 2
      const m = faceM(TX + s * Math.cos(a), s * Math.sin(a), Math.cos(a), Math.sin(a))
      for (const u of [-0.707 * s, 0.707 * s]) niche(b, m, u, y0 + 0.3, 0.4, Math.min(0.85, h - 0.75), 0.09)
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  const bx = (BODY.x0 + BODY.x1) / 2
  const bl = BODY.x1 - BODY.x0
  b.block(WALL, bl, H, BODY.hw * 2, bx, 0, 0)
  b.block(SOCLE, bl + 0.3, 0.8, BODY.hw * 2 + 0.3, bx, 0, 0)
  for (const sz of [-1, 1]) {
    b.add(WALL, loft([polyRing(LAT.n, LAT.r, 0, 0, LAT.x, sz * LAT.z), polyRing(LAT.n, LAT.r, H, 0, LAT.x, sz * LAT.z)], { capTop: true, flat: true }))
    b.add(SOCLE, loft([polyRing(LAT.n, LAT.r + 0.15, 0, 0, LAT.x, sz * LAT.z), polyRing(LAT.n, LAT.r + 0.15, 0.8, 0, LAT.x, sz * LAT.z)], { capTop: true, flat: true }))
  }
  b.block(WALL, ALT.xc - ALT.x0 + 0.05, H, ALT.r * 2, (ALT.x0 + ALT.xc) / 2, 0, 0)
  b.add(WALL, loft([polyRing(ALT.n, ALT.r, 0, 0, ALT.xc, 0), polyRing(ALT.n, ALT.r, H, 0, ALT.xc, 0)], { capTop: true, flat: true }))
  b.add(SOCLE, loft([polyRing(ALT.n, ALT.r + 0.15, 0, 0, ALT.xc, 0), polyRing(ALT.n, ALT.r + 0.15, 0.8, 0, ALT.xc, 0)], { capTop: true, flat: true }))
  b.block(SOCLE, ALT.xc - ALT.x0, 0.8, ALT.r * 2 + 0.3, (ALT.x0 + ALT.xc) / 2, 0, 0)

  /* ================= straight façades ================= */
  const hw = BODY.hw
  // south (+z, u = x) and north (−z, u = −x)
  for (const sz of [-1, 1]) {
    const m = faceM(0, sz * hw, 0, sz)
    const U = (x: number) => sz * x
    // western bay: tall blind arcade under the eaves
    for (let i = 0; i < 4; i++) niche(b, m, U(-14.6 + i * 1.05), 6.7, 0.7, 2.75, 0.12)
    b.add(BRICK, metricBox(4.9, 0.12, 0.06), M(m, mat(U(-13.0), 6.35, 0.03)))
    // eastern bays and naos returns: two registers of small niches + glazed discs
    const runs: P2[] = [
      [-10.0, 2.25],
      [8.95, 10.6],
    ]
    let k = 0
    for (const [a, c] of runs) {
      const cnt = Math.max(1, Math.round((c - a) / 0.78))
      const st = (c - a) / cnt
      for (let i = 0; i < cnt; i++) {
        const x = a + st * (i + 0.5)
        niche(b, m, U(x), 8.75, 0.52, 0.95)
        niche(b, m, U(x), 7.35, 0.48, 0.82)
        disc(b, m, U(x), 8.42, k++)
      }
      b.add(BRICK, metricBox(c - a, 0.12, 0.06), M(m, mat(U((a + c) / 2), 7.0, 0.03)))
    }
    // windows and south portal
    for (const x of [-8.3, -3.6]) windowArch(b, m, U(x), 4.0, 0.55, 1.45)
    if (sz > 0) {
      const pm = M(m, mat(U(-12.4), 0, 0))
      const portal = new THREE.Shape(archPts(1.9, 3.35, 0.0, 8))
      portal.holes.push(new THREE.Path(archPts(1.25, 2.85, 0.0, 8)))
      b.add(SOCLE, extrude(portal, 0.18, 4), pm)
      b.add('wood', archFill(1.25, 2.85, 0.0, 8), M(pm, mat(0, 0, 0.04)))
    } else {
      windowArch(b, m, U(-12.4), 4.2, 0.5, 1.3)
    }
  }
  // west façade (−x, u = z)
  {
    const m = faceM(BODY.x0, 0, -1, 0)
    for (let i = 0; i < 7; i++) niche(b, m, -3.3 + i * 1.1, 6.7, 0.72, 2.75, 0.12)
    b.add(BRICK, metricBox(8.6, 0.12, 0.06), M(m, mat(0, 6.35, 0.03)))
    for (const u of [-1.7, 1.7]) {
      b.add('glassC', new THREE.PlaneGeometry(0.6, 0.95), M(m, mat(u, 2.85, 0.03)))
      const fr = new THREE.Shape([new THREE.Vector2(-0.48, 2.2), new THREE.Vector2(0.48, 2.2), new THREE.Vector2(0.48, 3.5), new THREE.Vector2(-0.48, 3.5)])
      fr.holes.push(new THREE.Path([new THREE.Vector2(-0.3, 2.375), new THREE.Vector2(0.3, 2.375), new THREE.Vector2(0.3, 3.325), new THREE.Vector2(-0.3, 3.325)]))
      b.add(SOCLE, extrude(fr, 0.1, 1), M(m, mat(u, 0, 0)))
    }
    niche(b, m, 0, 2.6, 0.55, 1.0, 0.1)
  }

  /* ================= apse façades ================= */
  const apseFacets = (cx: number, cz: number, r: number, n: number, keep: (fx: number, fz: number) => boolean, win: number[]) => {
    const ap = r * Math.cos(Math.PI / n)
    const fw = 2 * r * Math.sin(Math.PI / n)
    let k = 0
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) * 2 * Math.PI) / n
      const fx = cx + ap * Math.cos(a)
      const fz = cz + ap * Math.sin(a)
      if (!keep(fx, fz)) continue
      const m = faceM(fx, fz, Math.cos(a), Math.sin(a))
      niche(b, m, 0, 1.45, fw * 0.6, 6.75, 0.13)
      niche(b, m, 0, 8.75, fw * 0.42, 0.9, 0.1)
      disc(b, m, 0, 8.45, k++)
      if (win.some((w) => Math.abs(((a / D2R - w + 540) % 360) - 180) < 360 / n / 2)) {
        b.add('glassC', archFill(0.42, 1.5, 4.4), M(m, mat(0, 0, 0.03)))
        b.add(SOCLE, metricBox(0.75, 0.1, 0.2), M(m, mat(0, 4.25, 0.08)))
      }
    }
  }
  apseFacets(LAT.x, LAT.z, LAT.r, LAT.n, (_x, z) => z > hw + 0.15, [78.75])
  apseFacets(LAT.x, -LAT.z, LAT.r, LAT.n, (_x, z) => z < -hw - 0.15, [281.25])
  apseFacets(ALT.xc, 0, ALT.r, ALT.n, (x) => x > ALT.xc + 0.1, [45, 315])

  /* ================= buttresses ================= */
  for (const sz of [-1, 1]) {
    buttress(b, BODY.x0, sz * (hw - 0.55), -1, 0) // west face, at the corners
    buttress(b, BODY.x0 + 0.55, sz * hw, 0, sz) // side face, at the corners
    buttress(b, -10.35, sz * hw, 0, sz, 1.0, 1.25, 6.1)
    buttress(b, 2.05, sz * hw, 0, sz, 1.0, 1.25, 6.6)
    buttress(b, 10.35, sz * hw, 0, sz, 0.9, 1.0, 5.2)
  }
  buttress(b, ALT.xc + ALT.r, 0, 1, 0, 0.95, 1.3, 6.6) // altar axis

  /* ================= roofs (copper, bell eaves on wooden soffits) ================= */
  // western body: hipped roof with rounded hips
  const r0 = hw + OV
  const xW = BODY.x0 - OV + r0
  const xE = -1.4
  const endR = endShape(0.5)
  const endW = endShape(0.02)
  const pst = bell(r0, YE, 57, 0)
  seamedLoft(b, CU, pst.map(([r, y]) => stadiumRing(xW, xE, r, y, endR)))
  b.add(CU, loft([stadiumRing(xW, xE, r0, YE - 0.16, endR), stadiumRing(xW, xE, r0, YE, endR)]))
  b.add(WOOD, loft([stadiumRing(xW, xE, hw, H, endW), stadiumRing(xW, xE, r0 - 0.02, YE - 0.16, endR)]))
  const ridgeY = pst[pst.length - 1][1]
  b.beam(CU, V(xW, ridgeY + 0.04, 0), V(xE, ridgeY + 0.04, 0), 0.2, 0.12)
  for (const x of [xW, xE]) cross(b, 'iron', x, ridgeY, 0, 1.7, true, Math.PI / 2)

  // naos: hipped roof with rounded hips rising to the tower base (inset in x scaled to the longer side)
  {
    const hx0 = 5.2 + OV
    const hz0 = hw + OV
    const top = 2.5
    const rc0 = 1.9
    const sx = (hx0 - top) / (hz0 - top)
    const ring = (r: number, y: number) => roundRectRing(top + (r - top) * sx, r, (rc0 * r) / hz0, y, TX)
    const st = bell(hz0, YE, 64, top)
    seamedLoft(b, CU, st.map(([r, y]) => ring(r, y)))
    b.add(WOOD, loft([roundRectRing(5.2, hw, 0.05, H, TX), ring(hz0 - 0.02, YE - 0.16)]))
    b.add(CU, loft([ring(hz0, YE - 0.16), ring(hz0, YE)]))
  }
  // lateral apses: low lobed cones merging into the naos roof
  for (const sz of [-1, 1]) coneRoof(b, { x: LAT.x, z: sz * LAT.z, n: LAT.n, rWall: LAT.r, finalDeg: 28 })
  // altar apse: steeper cone with its own cross
  const altTop = coneRoof(b, { x: ALT.xc, z: 0, n: ALT.n, rWall: ALT.r, finalDeg: 57 })
  b.add(CU, new THREE.SphereGeometry(0.16, 10, 8), mat(ALT.xc, altTop + 0.05, 0))
  cross(b, 'iron', ALT.xc, altTop + 0.05, 0, 1.7, true, Math.PI / 2)

  /* ================= tower over the naos ================= */
  starTier(b, 2.75, 14.6, 1.5)
  starTier(b, 2.4, 16.1, 1.4)
  const d0 = 17.5
  const d1 = 22.3
  const R = 2.2
  const ph = Math.PI / 8
  b.add(WALL, loft([polyRing(8, R, d0, ph, TX, 0), polyRing(8, R, d1, ph, TX, 0)], { capTop: true, flat: true }))
  b.add(BRICK, loft([polyRing(8, R + 0.035, 21.35, ph, TX, 0), polyRing(8, R + 0.035, 21.77, ph, TX, 0)], { capTop: true, flat: true }))
  for (let i = 0; i < 8; i++) {
    const a = ph + (i * Math.PI) / 4
    b.add(BRICK, metricBox(0.36, d1 - d0 - 0.2, 0.1), mat(TX + R * Math.cos(a), (d0 + d1) / 2, R * Math.sin(a), Math.PI / 2 - a))
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const ap = R * Math.cos(Math.PI / 8)
    windowArch(b, faceM(TX + ap * Math.cos(a), ap * Math.sin(a), Math.cos(a), Math.sin(a)), 0, 18.9, 0.42, 1.4)
  }
  // round plastered cornice
  const cor: P2[] = [
    [2.05, 0],
    [2.32, 0.06],
    [2.45, 0.2],
    [2.38, 0.34],
    [2.1, 0.42],
  ]
  b.add('plasterCream', lathe(cor, 28), mat(TX, 21.8, 0))
  // octagonal bell helm on a wooden soffit
  const hst = bell(3.25, 22.15, 70, 0.02, [
    [0.45, 25],
    [0.3, 45],
  ])
  seamedLoft(b, CU, hst.map(([r, y]) => polyRing(8, r, y, ph, TX, 0)), 0.42)
  b.add(CU, loft([polyRing(8, 3.25, 22.01, ph, TX, 0), polyRing(8, 3.25, 22.15, ph, TX, 0)]))
  b.add(WOOD, loft([polyRing(8, 2.15, 22.23, ph, TX, 0), polyRing(8, 3.23, 22.01, ph, TX, 0)]))
  const apex = hst[hst.length - 1][1]
  b.add(CU, new THREE.SphereGeometry(0.2, 12, 8), mat(TX, apex + 0.05, 0))
  cross(b, 'iron', TX, apex + 0.1, 0, 2.3, true, Math.PI / 2)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-7, 14.5, 3.2],
  materials: (base) => {
    const cu = (base.copperPrepat as THREE.MeshStandardMaterial).clone()
    cu.color.set('#98e6ef') // tint the pre-patinated sheet to the teal photographed at Tazlău
    cu.metalness = 0.28
    cu.roughness = 0.55
    return {
      tecuOslo: cu,
      tazStone: new THREE.MeshStandardMaterial({ color: '#ece6d9', roughness: 0.9 }),
      tazGlazeG: new THREE.MeshStandardMaterial({ color: '#2f7a5c', roughness: 0.3, metalness: 0.1 }),
      tazGlazeY: new THREE.MeshStandardMaterial({ color: '#c49a3c', roughness: 0.35, metalness: 0.1 }),
    }
  },
  notes: 'Trefoil church with tower over the naos; KME TECU Patina Oslo copper roofs in the photographed teal tone; heights scaled from photographs.',
}
export default model
