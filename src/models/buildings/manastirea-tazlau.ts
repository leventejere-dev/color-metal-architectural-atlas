/**
 * Mănăstirea Tazlău – church „Nașterea Maicii Domnului” (1496–1497), Tazlău, jud. Neamț.
 *
 * Modelling specification derived from the reference photographs (01–12, drone
 * and ground views) and the OSM outline (way 1147932372, 33.8 × 16.5 m over the
 * roof eaves), real metres. +X = 107.4°: the coarse church outline gives 102.3°,
 * but the vertical drone photo 02 shows the church parallel (±1°) to the cell
 * wing, whose traced outline (way 1554171768) runs at 107.4°:
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
 *
 * Precinct buildings with the same pre-patinated copper (drone photos 01–06, ground
 * photos 08, 11, 12), placed on their OSM roof outlines, low detail:
 *  - Cell wing on the south side, 45 m: a 30.5 × 13 m west range and a narrower
 *    14.5 × 10.6 m east range (courtyard wall stepped back), rubble-stone walls
 *    ≈ 4.6 m, bell-cast hipped roofs (≈ 24° kick, 50° main pitch) — the east range
 *    runs into the higher west range's hip; flush roof windows (8 + 4 courtyard,
 *    5 + 3 outer, 2 on the west hip), brick-arched windows and doors.
 *  - Gate bell tower in the east wall: ≈ 6.6 m stone shaft with the arched passage,
 *    two stepped piers outside, a set-back belfry stage with a brick band, pointed
 *    louvred windows and a cream frieze, bell-cast square helm (lip ≈ 13 m, apex
 *    ≈ 19.3 m) on a wooden soffit, iron cross (photos 08, 11).
 *  - North-west guard tower: stone shaft ≈ 9.5 m, half-timbered brick storey,
 *    steep bell-cast pyramid (apex ≈ 19 m) on a wooden soffit (photo 12).
 * The enclosure walls (stone copings) and the green-painted sheds are not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, polyRing, rectRing, cross, opening, frameShape } from '../kit'
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

  /* ================= precinct buildings with the same copper ================= */
  cellWing(b)
  bellTower(b)
  guardTower(b)

  return b
}

/* =====================================================================================
 * Precinct buildings roofed in the same pre-patinated copper (drone photos 01–06, ground
 * photos 08, 11, 12). Positions = OSM roof outlines (ways 1554171768 cell wing,
 * 1554177067 gate bell tower, 1554177066 north-west guard tower) projected into the
 * model frame (all three are parallel to the church axis there).
 * ===================================================================================== */
const ENS = 'stoneLight' // rubble-stone walls of the precinct buildings
type Rect = { x0: number; x1: number; z0: number; z1: number }

/** Bell-cast hipped roof profile: height at inset i from the eave line. */
function kickY(i: number, y0: number, kick: number, kickDeg: number, pitch: number) {
  return y0 + Math.min(i, kick) * Math.tan(kickDeg * D2R) + Math.max(0, i - kick) * Math.tan(pitch * D2R)
}

/**
 * Hipped bell-cast roof over an eave rectangle, built from inset rings with standing seams.
 * clipW: the roof abuts a higher hipped roof whose east eave line is at x = clipW — the west
 * edge then follows that roof's hip facet and the west face is omitted.
 */
function kickRoof(b: Builder, r: Rect, o: { y0: number; kick: number; kickDeg: number; pitch: number; clipW?: number; spacing?: number }) {
  const hz = Math.min(r.z1 - r.z0, r.x1 - r.x0) / 2
  const ins = [0, o.kick, hz]
  const ring = (i: number) => {
    const y = kickY(i, o.y0, o.kick, o.kickDeg, o.pitch)
    const xa = o.clipW !== undefined ? o.clipW - i : r.x0 + i
    const xb = r.x1 - i
    return [V(xa, y, r.z0 + i), V(xb, y, r.z0 + i), V(xb, y, r.z1 - i), V(xa, y, r.z1 - i)]
  }
  const rings = ins.map(ring)
  const sp = { key: CU, spacing: o.spacing ?? 0.5, h: 0.035, w: 0.04 }
  for (let s = 0; s < rings.length - 1; s++) {
    const A = rings[s]
    const B = rings[s + 1]
    for (let k = 0; k < 4; k++) {
      if (k === 3 && o.clipW !== undefined) continue
      const k1 = (k + 1) % 4
      const q = [A[k], A[k1], B[k1], B[k]]
      const pts = q.filter((p, j) => p.distanceTo(q[(j + 1) % 4]) > 1e-4)
      if (pts.length >= 3) facet(b, CU, pts, { seams: sp })
    }
  }
  // ridge and hip caps
  const top = rings[2]
  b.beam(CU, top[0].clone().add(V(0, 0.05, 0)), top[2].clone().add(V(0, 0.05, 0)), 0.18, 0.1)
  for (let k = 0; k < 4; k++) {
    if (o.clipW !== undefined && (k === 0 || k === 3)) continue
    for (let s = 0; s < 2; s++) b.beam(CU, rings[s][k], rings[s + 1][k], 0.1, 0.07)
  }
  return top[0].y
}

/** Sloping wooden soffit (wall head → eave lip) and copper fascia around an eave rectangle; skip = side to omit (0 −z, 1 +x, 2 +z, 3 −x). */
function eaveSkirt(b: Builder, wall: Rect, eave: Rect, yWall: number, yLip: number, skip = -1) {
  const W = [V(wall.x0, yWall, wall.z0), V(wall.x1, yWall, wall.z0), V(wall.x1, yWall, wall.z1), V(wall.x0, yWall, wall.z1)]
  const E = (y: number) => [V(eave.x0, y, eave.z0), V(eave.x1, y, eave.z0), V(eave.x1, y, eave.z1), V(eave.x0, y, eave.z1)]
  const E0 = E(yLip - 0.14)
  const E1 = E(yLip)
  const out = [V(0, 0, -1), V(1, 0, 0), V(0, 0, 1), V(-1, 0, 0)]
  for (let k = 0; k < 4; k++) {
    if (k === skip) continue
    const k1 = (k + 1) % 4
    facet(b, WOOD, [W[k], W[k1], E0[k1], E0[k]], { hint: out[k].clone().add(V(0, -1, 0)) })
    facet(b, CU, [E0[k], E0[k1], E1[k1], E1[k]], { hint: out[k] })
  }
}

/** Flush roof window on a roof plane: centre p, outward horizontal direction h, plane pitch (deg). */
function roofWindow(b: Builder, p: THREE.Vector3, h: THREE.Vector3, pitch: number) {
  const a = pitch * D2R
  const n = h.clone().multiplyScalar(Math.sin(a)).add(V(0, Math.cos(a), 0))
  const s = h.clone().multiplyScalar(-Math.cos(a)).add(V(0, Math.sin(a), 0))
  const t = V().crossVectors(s, n)
  const m = new THREE.Matrix4().makeBasis(t, s, n).setPosition(p.clone().add(n.clone().multiplyScalar(0.03)))
  b.add('trim', metricBox(0.9, 1.25, 0.08), m)
  b.add('skylight', metricBox(0.72, 1.07, 0.06), M(m, mat(0, 0, 0.05)))
}

/** Arched opening on a wall-face frame: fill (glass or door leaf) with a brick arch surround. */
function archOpening(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, fill: string, f = 0.18, type: 'round' | 'pointed' = 'round') {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(m, mat(u, 0, 0.02)))
  b.add(BRICK, extrude(frameShape(type, w, h, f, 0, y0), 0.08), M(m, mat(u, 0, 0)))
}

/* ---------- cell wing (south side): west range 13 m deep, east range 10.6 m, both bell-cast hipped ---------- */
function cellWing(b: Builder) {
  const OVW = 0.95 // eave overhang
  const HW = 4.6 // wall head
  const YL = 4.4 // eave lip
  const prof = { y0: YL, kick: 1.25, kickDeg: 24, pitch: 50 }
  const A: Rect = { x0: -8.53, x1: 22.02, z0: 22.54, z1: 35.57 } // OSM outline = eave line
  const B: Rect = { x0: 22.02, x1: 36.51, z0: 24.96, z1: 35.57 }
  const wa: Rect = { x0: A.x0 + OVW, x1: A.x1 - OVW, z0: A.z0 + OVW, z1: A.z1 - OVW }
  const wb: Rect = { x0: wa.x1, x1: B.x1 - OVW, z0: B.z0 + OVW, z1: B.z1 - OVW }
  for (const w of [wa, wb]) {
    b.block(ENS, w.x1 - w.x0, HW, w.z1 - w.z0, (w.x0 + w.x1) / 2, 0, (w.z0 + w.z1) / 2)
    b.block('stoneGrey', w.x1 - w.x0 + 0.16, 0.45, w.z1 - w.z0 + 0.16, (w.x0 + w.x1) / 2, 0, (w.z0 + w.z1) / 2)
  }
  // roofs: the wider west range has the higher ridge; the east range runs into its east hip
  kickRoof(b, A, prof)
  kickRoof(b, B, { ...prof, clipW: A.x1 })
  eaveSkirt(b, wa, A, HW, YL)
  eaveSkirt(b, wb, { ...B, x0: A.x1 }, HW, YL, 3)

  // roof windows (photos 01–06): courtyard slope 8 + 4, outer slope 5 + 3, two on the west hip
  const winOn = (r: Rect, side: 1 | -1, x: number, frac: number) => {
    const hz = (r.z1 - r.z0) / 2
    const d = prof.kick + frac * (hz - prof.kick)
    const y = kickY(d, YL, prof.kick, prof.kickDeg, prof.pitch)
    const z = side < 0 ? r.z0 + d : r.z1 - d
    roofWindow(b, V(x, y, z), V(0, 0, side), prof.pitch)
  }
  for (const x of [17.0, 13.9, 11.0, 8.2, 5.6, 3.0, 0.4, -2.0]) winOn(A, -1, x, 0.4)
  for (const x of [31.0, 28.4, 25.9, 23.4]) winOn(B, -1, x, 0.42)
  for (const x of [17.6, 13.3, 8.8, 4.4, 0.1]) winOn(A, 1, x, 0.42)
  for (const x of [32.2, 28.5, 24.9]) winOn(B, 1, x, 0.44)
  {
    const d = prof.kick + 0.35 * ((A.z1 - A.z0) / 2 - prof.kick)
    const y = kickY(d, YL, prof.kick, prof.kickDeg, prof.pitch)
    for (const dz of [-0.75, 0.75]) roofWindow(b, V(A.x0 + d, y, (A.z0 + A.z1) / 2 + dz), V(-1, 0, 0), prof.pitch)
  }
  // courtyard façade (−z): arched windows and doors with brick arches (photo 05)
  {
    const m = faceM(0, wa.z0, 0, -1) // u = −x
    for (const x of [17.6, 12.6, 9.6, 0.6, -3.2, -5.6]) archOpening(b, m, -x, 1.15, 0.85, 1.55, 'glassC')
    archOpening(b, m, -6.4, 0, 1.15, 2.3, 'wood', 0.22)
    b.add(BRICK, archFrame(0.5, 0.5, 0.1, 3.0, 8), M(m, mat(-3.6, 0, 0)))
    b.add('glassC', archFill(0.5, 0.5, 3.0, 8), M(m, mat(-3.6, 0, 0.02)))
    const mb = faceM(0, wb.z0, 0, -1)
    for (const x of [30.0, 33.6]) archOpening(b, mb, -x, 1.3, 0.7, 1.2, 'glassC', 0.15)
    archOpening(b, faceM(wa.x1, (wa.z0 + wb.z0) / 2, 1, 0), 0, 0, 1.1, 2.25, 'wood', 0.22) // door in the step wall
  }
  // outer façade (+z): two narrow windows at the west end; one small window in the east end wall
  {
    const m = faceM(0, wa.z1, 0, 1) // u = x
    for (const x of [-6.3, -5.5]) {
      b.add('glassC', new THREE.PlaneGeometry(0.35, 1.0), M(m, mat(x, 2.9, 0.02)))
      b.add(SOCLE, extrude(frameShape('rect', 0.35, 1.0, 0.12, 0, 2.4), 0.06), M(m, mat(x, 0, 0)))
    }
    const me = faceM(wb.x1, 0, 1, 0) // u = −z
    archOpening(b, me, -27.4, 2.0, 0.6, 1.0, 'glassC', 0.14)
  }
  // a low stepped buttress at the south-west corner (photo 06)
  const bp = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(1.1, 1.6), new THREE.Vector2(0, 3.6)])
  b.add(ENS, extrude(bp, 1.0, 1), new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(wa.x0 + 1.0, 0, wa.z1))
}

/* ---------- gate bell tower (turn clopotniță) in the east wall, north of the wing's east end ---------- */
function bellTower(b: Builder) {
  const cx = 35.71
  const cz = 16.56
  const h0 = 3.3 // lower stage half-width
  const h1 = 3.0 // upper stage half-width
  const yL = 7.3 // ledge
  const yT = 13.0 // wall head under the eaves
  b.block(ENS, 2 * h0, yL, 2 * h0, cx, 0, cz)
  b.block('stoneGrey', 2 * h0 + 0.24, 0.25, 2 * h0 + 0.24, cx, yL - 0.05, cz)
  b.block(ENS, 2 * h1, 10.87 - yL, 2 * h1, cx, yL, cz)
  b.block(BRICK, 2 * h1, 12.32 - 10.87, 2 * h1, cx, 10.87, cz)
  b.block('plasterCream', 2 * h1 + 0.06, yT - 12.32, 2 * h1 + 0.06, cx, 12.32, cz)
  // belfry: tall pointed louvred window with a brick arch on every face (photos 08, 11)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const m = faceM(cx + h1 * Math.cos(a), cz + h1 * Math.sin(a), Math.cos(a), Math.sin(a))
    archOpening(b, m, 0, 8.1, 1.45, 3.9, 'black', 0.3, 'pointed')
    b.add(ENS, metricBox(1.9, 0.12, 0.25), M(m, mat(0, 7.98, 0.1)))
  }
  // gate passage E–W: round brick arch, small window above; on the outer (east) face the icon and two stepped piers
  for (const sx of [1, -1]) {
    const m = faceM(cx + sx * h0, cz, sx, 0)
    archOpening(b, m, 0, 0, 3.0, 3.2, 'wood', 0.5)
    b.add('glassC', new THREE.PlaneGeometry(0.3, 0.45), M(m, mat(0, 6.1, 0.02)))
  }
  {
    const m = faceM(cx + h0, cz, 1, 0) // u = −z
    b.add('gilt', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 1.1, 0, 4.3, 8))), M(m, mat(0, 0, 0.03)))
    const prof = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.95, 0), new THREE.Vector2(0.95, 3.0), new THREE.Vector2(0, 3.8)])
    for (const u of [-2.4, 2.4]) {
      // profile in (outward, up), extruded 1.3 m along the face
      b.add(ENS, extrude(prof, 1.3, 1), M(m, new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(u + 0.65, 0, 0)))
    }
  }
  // bell-cast square helm with a deep wooden soffit, ball and iron cross
  const q = (hw: number, y: number) => polyRing(4, hw * Math.SQRT2, y, Math.PI / 4, cx, cz)
  const st: P2[] = [
    [4.33, 13.05],
    [2.88, 13.89],
    [2.28, 14.79],
    [1.22, 16.77],
    [0.02, 19.25],
  ]
  seamedLoft(b, CU, st.map(([r, y]) => q(r, y)), 0.45)
  b.add(CU, loft([q(4.33, 12.91), q(4.33, 13.05)]))
  b.add(WOOD, loft([q(h1 + 0.03, yT), q(4.31, 12.91)]))
  const apex = st[st.length - 1][1]
  b.add(CU, new THREE.SphereGeometry(0.18, 10, 8), mat(cx, apex + 0.05, cz))
  cross(b, 'iron', cx, apex + 0.05, cz, 1.8, true, Math.PI / 2)
}

/* ---------- north-west guard tower (turn de pază): stone shaft, half-timbered top storey, bell-cast pyramid ---------- */
function guardTower(b: Builder) {
  const cx = -31.01
  const cz = -29.55
  const s = { hx: 3.5, hz: 3.7 } // stone shaft
  const t = { hx: 3.3, hz: 3.5 } // timber storey
  const yS = 9.5
  const yT = 13.6
  b.block(ENS, 2 * s.hx, yS, 2 * s.hz, cx, 0, cz)
  b.block(SOCLE, 2 * s.hx + 0.2, 0.25, 2 * s.hz + 0.2, cx, yS, cz)
  b.block(BRICK, 2 * t.hx, yT - yS - 0.25, 2 * t.hz, cx, yS + 0.25, cz)
  // timber frame: sill, rail, head, posts and braces; two windows per face (photo 12)
  const y0 = yS + 0.25
  const hh = yT - y0
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const half = i % 2 === 0 ? t.hz : t.hx // half-length of this face
    const dep = i % 2 === 0 ? t.hx : t.hz // distance of the face from the centre
    const m = faceM(cx + dep * Math.cos(a), cz + dep * Math.sin(a), Math.cos(a), Math.sin(a))
    for (const y of [y0 + 0.1, yT - 0.1, y0 + hh * 0.55]) b.add('wood', metricBox(2 * half, 0.18, 0.08), M(m, mat(0, y, 0.04)))
    for (const u of [-half + 0.09, -half * 0.5, 0, half * 0.5, half - 0.09]) b.add('wood', metricBox(0.18, hh, 0.08), M(m, mat(u, y0 + hh / 2, 0.04)))
    for (const [ua, ub] of [
      [-half + 0.09, -half * 0.5],
      [half * 0.5, half - 0.09],
    ]) {
      const len = Math.hypot(ub - ua, hh * 0.55)
      b.add('wood', metricBox(0.14, len, 0.07), M(m, mat((ua + ub) / 2, y0 + hh * 0.275, 0.045, 0, 0, Math.atan2(ua - ub, hh * 0.55))))
    }
    for (const u of [-half * 0.25, half * 0.25]) {
      b.add('glassC', new THREE.PlaneGeometry(0.8, 1.0), M(m, mat(u, y0 + hh * 0.55 + 0.7, 0.05)))
      b.add('wood', extrude(frameShape('rect', 0.8, 1.0, 0.1, 0, y0 + hh * 0.55 + 0.2), 0.06), M(m, mat(u, 0, 0.05)))
    }
  }
  // pointed windows in the stone shaft on the courtyard faces (east +x, south +z)
  archOpening(b, faceM(cx + s.hx, cz, 1, 0), 0, 5.2, 0.85, 2.5, 'glassC', 0.2, 'pointed')
  archOpening(b, faceM(cx, cz + s.hz, 0, 1), 0, 5.2, 0.85, 2.5, 'glassC', 0.2, 'pointed')
  // roof: OSM outline 8.63 × 9.09 m, bell-cast eaves on a wooden soffit, steep pyramid
  const roof: Rect = { x0: cx - 4.31, x1: cx + 4.31, z0: cz - 4.55, z1: cz + 4.55 }
  kickRoof(b, roof, { y0: yT - 0.15, kick: 1.05, kickDeg: 25, pitch: 57, spacing: 0.45 })
  eaveSkirt(b, { x0: cx - t.hx, x1: cx + t.hx, z0: cz - t.hz, z1: cz + t.hz }, roof, yT, yT - 0.15)
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
  notes: 'Trefoil church with tower over the naos, with the cell wing, the gate bell tower and the north-west guard tower of the precinct; KME TECU Patina Oslo copper roofs in the photographed teal tone; heights scaled from photographs.',
}
export default model
