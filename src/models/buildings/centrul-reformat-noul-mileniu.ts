/**
 * Centrul Reformat „Noul Mileniu” / Új Ezredév Református Központ, Timișoara
 * (Imre Makovecz, organic architecture).
 *
 * Modelling specification derived from the 12 reference photographs (5 drone
 * views, 7 ground details) and the merged OSM outline (church + centre, 51 × 44.5 m):
 *  - Plan: the composition is symmetric about one axis (+X, compass ≈ 60°). At
 *    +X the church faces the street with two concrete towers and a white portico;
 *    at −X the community centre forms an L of two 9.3 m wings (±45° to the axis)
 *    whose outer corner is cut by the entrance façade; the wings end against two
 *    domes that flank the church; between the wings and the church lies a small
 *    courtyard with white concrete arch ribs and a white colonnade.
 *  - Church roof ("the bud"): six convex, pointed petals around a hexagonal glass
 *    spike with a timber lattice. The petals rise steeply from 5.6–8 m (lower at
 *    the rear), curve in and lean their pointed tips (≈21.5 m) on the spike, whose
 *    apex reaches ≈29 m. elZinc Graphite shingles with light ridge / valley rolls
 *    and a copper eave strip; a pointed glass panel at the foot of the rear petal.
 *  - Towers: square base block (8.6 m) with a dark band, tapered pedestal, tapered
 *    shaft with a tall pointed belfry opening, a flared skirt of weathered timber
 *    turned 45° (arris to the front, metal fin) and a graphite spire with a gilded
 *    star at ≈33 m.
 *  - Portico: white block between the towers with a deep timber door (grid of small
 *    glazed squares), paired ornamental pilasters, inscription band and steps.
 *  - Domes: north (−Z) a broad copper dome (aged brown, radial seams) on a white
 *    drum, crowned by a ring of pointed "star" dormers and a spire, with four
 *    eyebrow vaults in new copper on its outer/front quadrant; south (+Z) a smaller
 *    standing-seam elZinc Graphite dome on a banded white drum with a lantern of
 *    pointed glazed dormers, a spire and a white "eyelid" arch facing the towers.
 *  - Community centre: two-storey white wings with steep (47°) natural-slate roofs
 *    (hip at the cut corner, valley at the courtyard, hipped ends under the domes),
 *    two window rows, skylights on the south wing, small entrance porch.
 * Approximations: all heights are estimated from the photographs (no published
 * dimensions); the bud is reduced to six identical-construction petals; the spike
 * lattice, crown dormers, eyebrow vaults, courtyard stair and the flat roofs
 * linking the bud to the domes are simplified; windows are indicative; the slate
 * wing roofs are natural slate per the photos (not part of the metal scope).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, polyRing, rectRing, prismOutline, seams } from '../kit'
import type { SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

/* ---------------- plan constants (model metres) ---------------- */
const ZC = 4.2 // church symmetry axis (z = ZC), parallel to +X
const BX = 11.3 // centre of the bud
const TOWER = { x: 22.4, dz: 8.2, w: 5.6 }
const PORT = { x0: 20.4, x1: 25.8, hw: 5.3, h: 8.6 }
const DOME_N = { x: 3.4, z: -15.2 } // copper dome (north / −Z)
const DOME_S = { x: -1.8, z: 19.3 } // zinc dome (south / +Z)
// L of the community centre
const LO: P2 = [-32.7, 4.6] // virtual outer corner
const LW = 9.3 // wing width
const LL = 34 // wing length (outer edge, from the virtual corner)
const XCH = -25.3 // cut corner (entrance façade)
const LYE = 6.4 // wing eave
const LPITCH = 47
const C45 = Math.SQRT1_2

/* ---------------- bud constants ---------------- */
const YT = 21.5 // petal tips
const YTOP = 29.0 // spike apex
const RCT = 2.5 // spike circumradius at YT
const YV = 17.5 // valleys reach the spike
const rcSpike = (y: number) => (RCT * (YTOP - y)) / (YTOP - YT)
const apSpike = (y: number) => rcSpike(y) * Math.cos(Math.PI / 6)
const PETALS: { phi: number; R0: number; ye: number }[] = [
  { phi: 0, R0: 9.0, ye: 8.0 }, // front, behind the portico
  { phi: 60, R0: 9.2, ye: 7.0 },
  { phi: 120, R0: 9.6, ye: 6.2 },
  { phi: 180, R0: 10.0, ye: 5.6 }, // rear, towards the courtyard
  { phi: 240, R0: 9.6, ye: 6.2 },
  { phi: 300, R0: 9.2, ye: 7.0 },
]

/* ================================================================== */
/* generic helpers                                                     */
/* ================================================================== */

function bez(p0: P2, p1: P2, p2: P2, p3: P2, t: number): P2 {
  const s = 1 - t
  const a = s * s * s
  const b = 3 * s * s * t
  const c = 3 * s * t * t
  const d = t * t * t
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]
}

/** r(y) of a cubic Bézier profile [r, y] whose y is monotonic. */
function profileFn(p0: P2, p1: P2, p2: P2, p3: P2) {
  const tab: P2[] = []
  for (let i = 0; i <= 200; i++) tab.push(bez(p0, p1, p2, p3, i / 200))
  return (y: number) => {
    if (y <= tab[0][1]) return tab[0][0]
    for (let i = 1; i < tab.length; i++) {
      if (y <= tab[i][1]) {
        const [r0, y0] = tab[i - 1]
        const [r1, y1] = tab[i]
        return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-9, y1 - y0)
      }
    }
    return tab[tab.length - 1][0]
  }
}

/** Grid surface (rows × cols of points) with smooth normals, metric UVs and outward orientation. */
function gridSurface(rows: THREE.Vector3[][], uvs: P2[][], outward: (p: THREE.Vector3) => THREE.Vector3) {
  const nc = rows[0].length
  const pos: number[] = []
  const uv: number[] = []
  rows.forEach((r, j) =>
    r.forEach((p, i) => {
      pos.push(p.x, p.y, p.z)
      uv.push(uvs[j][i][0], uvs[j][i][1])
    }),
  )
  const idx: number[] = []
  let flip: boolean | null = null
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < nc - 1; i++) {
      const a = j * nc + i
      const b = j * nc + i + 1
      const c = (j + 1) * nc + i + 1
      const d = (j + 1) * nc + i
      if (flip === null) {
        const A = rows[j][i]
        const B = rows[j][i + 1]
        const C = rows[j + 1][i + 1]
        const n = V().subVectors(B, A).cross(V().subVectors(C, A))
        if (n.lengthSq() > 1e-10) flip = n.dot(outward(A)) < 0
      }
      idx.push(a, b, c, a, c, d)
    }
  }
  if (flip) for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Lathe with metric UVs (u = angle × base radius, v = profile length), optional partial sweep. */
function latheM(b: Builder, key: string, cx: number, cz: number, prof: P2[], seg = 48, a0 = 0, a1 = Math.PI * 2) {
  const rows: THREE.Vector3[][] = []
  const uvs: P2[][] = []
  let vAcc = 0
  prof.forEach(([r, y], j) => {
    if (j > 0) vAcc += Math.hypot(r - prof[j - 1][0], y - prof[j - 1][1])
    const row: THREE.Vector3[] = []
    const urow: P2[] = []
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg
      row.push(V(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r))
      urow.push([a * prof[0][0], vAcc])
    }
    rows.push(row)
    uvs.push(urow)
  })
  b.add(key, gridSurface(rows, uvs, (p) => V(p.x - cx, 0, p.z - cz)))
}

/** Meridian standing seams on a lathe profile. */
function latheRibs(b: Builder, key: string, cx: number, cz: number, prof: P2[], n: number, rh = 0.05, phase = 0) {
  for (let k = 0; k < n; k++) {
    const a = phase + (k / n) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(key, V(cx + c * (r0 + rh / 2), y0, cz + s * (r0 + rh / 2)), V(cx + c * (r1 + rh / 2), y1, cz + s * (r1 + rh / 2)), rh, rh, V(c, 0, s))
    }
  }
}

/** Polyline of beams. */
function polyBeam(b: Builder, key: string, pts: THREE.Vector3[], w: number, h: number, up?: (p: THREE.Vector3) => THREE.Vector3) {
  for (let i = 0; i < pts.length - 1; i++) b.beam(key, pts[i], pts[i + 1], w, h, up ? up(pts[i]) : V(0, 1, 0))
}

/** Window (dark glass + frame) on a wall whose outward normal is (nx, nz). */
function wallWin(b: Builder, x: number, z: number, nx: number, nz: number, y0: number, w: number, h: number, type: 'rect' | 'round' | 'pointed' = 'rect', glass = 'glassC', frame = 'trim', f = 0.12) {
  const m = mat(x, 0, z, Math.atan2(nx, nz))
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.03)))
  if (f > 0) b.add(frame, extrude(frameShape(type, w, h, f, 0, y0), 0.08), m)
}

/* ---------------- roofs as the lower envelope of planes ---------------- */
interface Plane {
  a: number
  b: number
  c: number
}
/** h = y0 + t · (p − p0)·n  (n = unit inward normal of an eave line through p0). */
const edgePlane = (p0: P2, n: P2, y0: number, t: number): Plane => ({ a: t * n[0], b: t * n[1], c: y0 - t * (p0[0] * n[0] + p0[1] * n[1]) })
const hAt = (pl: Plane, x: number, z: number) => pl.a * x + pl.b * z + pl.c

/** Keep the part of a convex polygon where A·x + B·z + C ≤ 0. */
function clipPoly(poly: P2[], A: number, B: number, C: number): P2[] {
  const out: P2[] = []
  const f = (p: P2) => A * p[0] + B * p[1] + C
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const fp = f(p)
    const fq = f(q)
    if (fp <= 0) out.push(p)
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

/** Facets of the lower envelope of `planes` over a convex region. */
function planeRoof(b: Builder, key: string, region: P2[], planes: Plane[], sp?: SeamSpec) {
  planes.forEach((pl, i) => {
    let poly = region
    planes.forEach((q, j) => {
      if (j !== i && poly.length >= 3) poly = dedupe(clipPoly(poly, pl.a - q.a, pl.b - q.b, pl.c - q.c))
    })
    if (poly.length < 3) return
    safeFacet(
      b,
      key,
      poly.map(([x, z]) => V(x, hAt(pl, x, z), z)),
      { seams: sp, thickness: 0.14 },
    )
  })
}

/** Remove (near) duplicate consecutive vertices, including the closing one. */
function dedupe(poly: P2[], eps = 1e-3): P2[] {
  const out: P2[] = []
  for (const p of poly) {
    const q = out[out.length - 1]
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p)
  }
  while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop()
  return out
}

/** facet() with a robust start vertex (the kit derives the normal from the first three points). */
function safeFacet(b: Builder, key: string, pts: THREE.Vector3[], opts: { seams?: SeamSpec; hint?: THREE.Vector3; thickness?: number }) {
  if (pts.length < 3) return
  const nw = V()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    nw.x += (p.y - q.y) * (p.z + q.z)
    nw.y += (p.z - q.z) * (p.x + q.x)
    nw.z += (p.x - q.x) * (p.y + q.y)
  }
  if (nw.lengthSq() < 1e-10) return
  let best = 0
  let bestA = -Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = V().subVectors(pts[(i + 1) % pts.length], a).cross(V().subVectors(pts[(i + 2) % pts.length], a))
    const s = c.dot(nw)
    if (s > bestA) {
      bestA = s
      best = i
    }
  }
  facet(b, key, [...pts.slice(best), ...pts.slice(0, best)], opts)
}

/* ================================================================== */
/* the bud                                                             */
/* ================================================================== */

// valley line (shared by neighbouring petals) up to YV, then the petal edges ride on the spike
const rValley = profileFn([8.3, 5.4], [8.55, 9.5], [rcSpike(YV) + 1.5, 13.8], [rcSpike(YV), YV])
const halfW = (y: number) => (y <= YV ? Math.PI / 6 : (Math.PI / 6) * Math.pow(Math.max(0, 1 - (y - YV) / (YT - YV)), 0.75))
const rEdge = (y: number) => (y <= YV ? rValley(y) : apSpike(y) / Math.cos(halfW(y)) + 0.04)

function petalFns() {
  const rT = apSpike(YT) + 0.12
  return PETALS.map((p) => {
    const H = YT - p.ye
    const rc = profileFn([p.R0, p.ye], [p.R0 + 0.12, p.ye + 0.33 * H], [rT + 1.4, YT - 0.3 * H], [rT, YT])
    const phi = p.phi * D2R
    /** surface point: u ∈ [−1, 1] across the petal, absolute height y */
    const at = (u: number, y: number) => {
      const re = rEdge(y)
      const r = re + (Math.max(rc(y), re) - re) * (1 - Math.pow(Math.abs(u), 1.25))
      const a = phi + u * halfW(y)
      return V(BX + Math.cos(a) * r, y, ZC + Math.sin(a) * r)
    }
    return { ...p, rc, at }
  })
}

function bud(b: Builder) {
  const fns = petalFns()
  const out = (p: THREE.Vector3) => V(p.x - BX, 0.15, p.z - ZC)
  const NU = 26
  const DY = 0.32
  const ROLL = { w: 0.13, h: 0.07 }
  fns.forEach((p, k) => {
    // global height grid so that neighbouring petals share their valley vertices
    const ys: number[] = [p.ye]
    for (let y = Math.ceil((p.ye + 0.05) / DY) * DY; y < YT - 1e-6; y += DY) ys.push(y)
    ys.push(YT)
    const rows: THREE.Vector3[][] = []
    const uvs: P2[][] = []
    let vAcc = 0
    let prevC: THREE.Vector3 | null = null
    for (const y of ys) {
      const row: THREE.Vector3[] = []
      for (let i = 0; i <= NU; i++) row.push(p.at(-1 + (2 * i) / NU, y))
      const c = row[NU / 2]
      if (prevC) vAcc += c.distanceTo(prevC)
      prevC = c
      // u = arc length from the petal centre line
      const urow: P2[] = row.map(() => [0, vAcc])
      for (let i = NU / 2 + 1; i <= NU; i++) urow[i] = [urow[i - 1][0] + row[i].distanceTo(row[i - 1]), vAcc]
      for (let i = NU / 2 - 1; i >= 0; i--) urow[i] = [urow[i + 1][0] - row[i].distanceTo(row[i + 1]), vAcc]
      rows.push(row)
      uvs.push(urow)
    }
    b.add('zincGraphite', gridSurface(rows, uvs, out))
    // ridge roll along the petal centre, valley roll on its +u edge, copper eave strip
    const lift = (q: THREE.Vector3, d: number) => q.clone().add(out(q).setY(0).normalize().multiplyScalar(d))
    polyBeam(b, 'helm', rows.map((r) => lift(r[NU / 2], 0.04)), ROLL.w, ROLL.h, (q) => out(q).setY(0).normalize())
    const valley = rows.filter((r) => r[NU].y <= YV + 1e-6).map((r) => lift(r[NU], 0.03))
    polyBeam(b, 'helm', valley, ROLL.w, ROLL.h, (q) => out(q).setY(0).normalize())
    polyBeam(b, 'copper', rows[0].map((q) => lift(q, 0.06)), 0.16, 0.24)
    // white drum wall under the petal (down to the podium)
    const base = rows[0]
    const wpos: number[] = []
    for (let i = 0; i < base.length - 1; i++) {
      const A = lift(base[i], -0.15)
      const B = lift(base[i + 1], -0.15)
      wpos.push(A.x, 0, A.z, B.x, 0, B.z, B.x, p.ye, B.z, A.x, 0, A.z, B.x, p.ye, B.z, A.x, p.ye, A.z)
    }
    const wg = new THREE.BufferGeometry()
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3))
    wg.computeVertexNormals()
    // make sure the wall faces outwards
    const n0 = V(wg.attributes.normal.getX(0), 0, wg.attributes.normal.getZ(0))
    if (n0.dot(out(base[0])) < 0) {
      for (let i = 0; i < wpos.length; i += 9) {
        for (let c = 0; c < 3; c++) [wpos[i + 3 + c], wpos[i + 6 + c]] = [wpos[i + 6 + c], wpos[i + 3 + c]]
      }
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3))
      wg.computeVertexNormals()
    }
    b.add('plasterWhite', wg)
    // filler between this petal's eave and the next petal's (different eave heights)
    const q = fns[(k + 1) % fns.length]
    if (Math.abs(q.ye - p.ye) > 0.01) {
      const hi = Math.max(p.ye, q.ye)
      const lo = Math.min(p.ye, q.ye)
      const e = p.at(1, lo)
      b.box('plasterWhite', 0.5, hi - lo + 0.3, 0.5, e.x, (hi + lo) / 2, e.z)
    }
  })

  // pointed glass panel at the foot of the rear petal
  const rear = fns[3]
  const gRows: THREE.Vector3[][] = []
  const gUv: P2[][] = []
  const y0 = rear.ye + 0.25
  const gh = 4.6
  for (let j = 0; j <= 10; j++) {
    const t = j / 10
    const y = y0 + gh * t
    const hw = 0.32 * Math.pow(1 - t, 0.85) + 0.004
    const row: THREE.Vector3[] = []
    const ur: P2[] = []
    for (let i = 0; i <= 6; i++) {
      const u = -hw + (2 * hw * i) / 6
      const pt = rear.at(u, y)
      row.push(pt.add(out(pt).setY(0).normalize().multiplyScalar(0.07)))
      ur.push([u * 6, y])
    }
    gRows.push(row)
    gUv.push(ur)
  }
  b.add('glassG', gridSurface(gRows, gUv, out))
  // flashing frame of the glass panel
  polyBeam(b, 'helm', gRows.map((r) => r[0]), 0.1, 0.1)
  polyBeam(b, 'helm', gRows.map((r) => r[r.length - 1]), 0.1, 0.1)

  // hexagonal glass spike with timber lattice and light edge rolls
  const ys0 = 15.0
  const ring = (y: number) => polyRing(6, rcSpike(y), y, Math.PI / 6, BX, ZC)
  const r0 = ring(ys0)
  const apex = V(BX, YTOP, ZC)
  for (let i = 0; i < 6; i++) {
    const A = r0[i]
    const B = r0[(i + 1) % 6]
    const mid = A.clone().add(B).multiplyScalar(0.5)
    facet(b, 'glassG', [A, B, apex], { hint: V(mid.x - BX, 0.4, mid.z - ZC) })
    b.beam('helm', A, apex, 0.14, 0.12, V(A.x - BX, 0, A.z - ZC).normalize())
    // diamond lattice (visible part above the petal valleys)
    const n = 9
    const L = (t: number) => A.clone().lerp(apex, t)
    const R = (t: number) => B.clone().lerp(apex, t)
    const offs = V(mid.x - BX, 0, mid.z - ZC).normalize().multiplyScalar(0.05)
    for (let s = 0; s < n; s++) {
      const t0 = 0.12 + (0.84 * s) / n
      const t1 = 0.12 + (0.84 * (s + 1)) / n
      b.beam('timber', L(t0).add(offs), R(t1).add(offs), 0.07, 0.07)
      b.beam('timber', R(t0).add(offs), L(t1).add(offs), 0.07, 0.07)
    }
  }
  b.rod('helm', V(BX, YTOP - 0.3, ZC), V(BX, YTOP + 1.3, ZC), 0.06, 8)
  b.add('helm', new THREE.SphereGeometry(0.16, 10, 8), mat(BX, YTOP + 0.1, ZC))
}

/* ================================================================== */
/* church base: podium, rear hall, portico                              */
/* ================================================================== */

function churchBase(b: Builder) {
  const P = (x: number, dz: number): P2 => [x, ZC + dz]
  const podium: P2[] = [P(-7.5, -1.8), P(-1.2, -8.6), P(6, -10.2), P(14, -8.8), P(19.8, -5.4), P(19.8, 5.4), P(14, 8.8), P(6, 10.2), P(-1.2, 9.2), P(-7.5, 1.8)]
  const H = 4.8
  prismOutline(b, 'plasterWhite', podium, 0, H)
  // flat roof with a slim metal coping
  prismOutline(b, 'zincGraphite', podium.map(([x, z]) => [x + (x < 4 ? 0.0 : 0), z] as P2), H, 0.12)
  for (let i = 0; i < podium.length; i++) {
    const [ax, az] = podium[i]
    const [bx, bz] = podium[(i + 1) % podium.length]
    b.beam('zincGraphite', V(ax, H + 0.3, az), V(bx, H + 0.3, bz), 0.35, 0.3)
  }
  // rear (courtyard) façades: windows and glazed doors on the prow faces
  const faces: [P2, P2][] = [
    [P(-7.5, -1.8), P(-1.2, -8.6)],
    [P(-1.2, 9.2), P(-7.5, 1.8)],
  ]
  for (const [A, B] of faces) {
    const dx = B[0] - A[0]
    const dz = B[1] - A[1]
    const L = Math.hypot(dx, dz)
    // outward normal (away from the church)
    let nx = dz / L
    let nz = -dx / L
    if (nx * (A[0] - BX) + nz * (A[1] - ZC) < 0) {
      nx = -nx
      nz = -nz
    }
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4
      wallWin(b, A[0] + dx * t, A[1] + dz * t, nx, nz, 0.15, 1.6, 3.3, 'rect', 'glassC', 'timber', 0.14)
    }
  }
  // prow tip door
  wallWin(b, -7.5, ZC, -1, 0, 0.1, 2.2, 3.4, 'pointed', 'glassC', 'timber', 0.16)
}

function portico(b: Builder) {
  const { x0, x1, hw, h } = PORT
  const xc = (x0 + x1) / 2
  const W = 'plasterWhite'
  b.block(W, x1 - x0, h, hw * 2, xc, 0, ZC)
  // attic and cornice
  b.block(W, x1 - x0 + 0.3, 0.9, hw * 2 + 0.3, xc + 0.15, h, ZC)
  b.block('zincGraphite', x1 - x0 + 0.5, 0.1, hw * 2 + 0.5, xc + 0.15, h + 0.9, ZC)
  // inscription band
  b.block('stoneLight', 0.06, 0.55, hw * 2 - 1.2, x1 + 0.18, h + 0.18, ZC)
  // deep door niche with the timber door (grid of small glazed squares)
  const f = x1 + 0.15
  b.block('stoneLight', 0.3, 7.3, 5.4, x1 + 0.0, 0, ZC)
  b.block('black', 0.32, 7.0, 4.4, x1 + 0.02, 0, ZC)
  b.block('wood', 0.1, 6.6, 3.6, f + 0.05, 0.3, ZC)
  for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) b.box('glassC', 0.03, 0.4, 0.42, f + 0.11, 1.0 + r * 0.66, ZC - 1.2 + c * 0.8)
  // paired pilasters with ornamental capitals
  for (const s of [-1, 1]) {
    for (const dz of [3.15, 4.4]) {
      const z = ZC + s * dz
      b.block(W, 0.35, 7.4, 0.62, x1 + 0.17, 0, z)
      b.add(W, new THREE.CylinderGeometry(0.55, 0.28, 0.9, 12), mat(x1 + 0.3, 7.35, z))
      b.add(W, new THREE.TorusGeometry(0.32, 0.09, 6, 14), mat(x1 + 0.42, 7.55, z, Math.PI / 2))
    }
  }
  // entrance steps
  for (let i = 0; i < 4; i++) b.block('stoneLight', 2.8 - i * 0.6, 0.24, 7.0, x1 + 1.4 - i * 0.3, i * 0.24, ZC)
}

/* ================================================================== */
/* towers                                                              */
/* ================================================================== */

/** Panel drawn on a tapered square-shaft face: shape coords (u along the face, v = height). */
function taperPanel(b: Builder, key: string, shape: THREE.Shape, face: '+x' | '-x' | '+z' | '-z', cx: number, cz: number, hw: (y: number) => number, off: number) {
  const g = new THREE.ShapeGeometry(shape, 8)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i)
    const v = p.getY(i)
    const d = hw(v) + off
    if (face === '+x') p.setXYZ(i, cx + d, v, cz - u)
    else if (face === '-x') p.setXYZ(i, cx - d, v, cz + u)
    else if (face === '+z') p.setXYZ(i, cx + u, v, cz + d)
    else p.setXYZ(i, cx - u, v, cz - d)
  }
  g.deleteAttribute('normal')
  g.computeVertexNormals()
  b.add(key, g)
}

function star(b: Builder, x: number, y: number, z: number, s: number) {
  const sh = new THREE.Shape()
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? s * 0.32 : s
    const a = (i / 16) * Math.PI * 2 + Math.PI / 2
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const g = extrude(sh, 0.08)
  b.add('gilt', g, mat(x, y, z - 0.04))
  b.add('gilt', g, mat(x - 0.04, y, z, Math.PI / 2))
  b.add('gilt', new THREE.SphereGeometry(s * 0.25, 10, 8), mat(x, y, z))
}

function tower(b: Builder, x: number, z: number) {
  const C = 'concreteLight'
  const hw0 = TOWER.w / 2
  b.block(C, TOWER.w, 8.6, TOWER.w, x, 0, z)
  b.block('copperBrown', TOWER.w + 0.12, 0.28, TOWER.w + 0.12, x, 8.42, z)
  // tapered pedestal and shaft
  const ped = { y0: 8.7, y1: 10.4, h0: 1.85, h1: 1.72 }
  b.add(C, loft([rectRing(ped.h0, ped.h0, ped.y0, x, z), rectRing(ped.h1, ped.h1, ped.y1, x, z)], { capTop: true, flat: true }))
  const sh = { y0: 10.4, y1: 18.6, h0: 1.62, h1: 1.08 }
  b.add(C, loft([rectRing(sh.h0, sh.h0, sh.y0, x, z), rectRing(sh.h1, sh.h1, sh.y1, x, z)], { capTop: true, flat: true }))
  const shHW = (y: number) => sh.h0 + ((sh.h1 - sh.h0) * (y - sh.y0)) / (sh.y1 - sh.y0)
  // tall pointed belfry openings (front and back) with a raised frame
  for (const face of ['+x', '-x'] as const) {
    taperPanel(b, 'black', new THREE.Shape(opening('pointed', 1.7, 5.6, 0, 11.4, 12)), face, x, z, shHW, 0.03)
    taperPanel(b, 'concrete', frameShape('pointed', 1.7, 5.6, 0.28, 0, 11.4), face, x, z, shHW, 0.06)
  }
  // louvre slits with sills on the sides (shaft, pedestal and base block)
  for (const face of ['+z', '-z'] as const) {
    for (const y of [12.0, 14.2, 16.4]) {
      const s = new THREE.Shape(opening('rect', 0.9, 0.14, 0, y))
      taperPanel(b, 'black', s, face, x, z, shHW, 0.03)
      taperPanel(b, 'helm', new THREE.Shape(opening('rect', 1.1, 0.06, 0, y - 0.07)), face, x, z, shHW, 0.08)
    }
    const sz = face === '+z' ? 1 : -1
    for (const [u, y] of [[-0.9, 9.4], [0.9, 9.4], [-1.3, 7.0], [1.3, 7.2]] as P2[]) {
      b.box('black', 1.0, 0.14, 0.05, x + u, y, z + sz * (y > 8.6 ? 1.87 : hw0 + 0.02))
      b.box('helm', 1.2, 0.06, 0.2, x + u, y - 0.09, z + sz * (y > 8.6 ? 1.93 : hw0 + 0.08))
    }
  }
  // timber skirt turned 45° (arris to the front) and graphite spire
  const dia = (r: number, y: number) => polyRing(4, r, y, 0, x, z)
  const sk = { y0: 17.5, y1: 23.8, r0: 2.2, r1: 1.45 }
  b.add('timberGrey', loft([dia(sk.r0, sk.y0), dia(sk.r1, sk.y1)], { capBottom: true, flat: true }))
  const apexY = 33.0
  const ring = dia(sk.r1, sk.y1)
  const apex = V(x, apexY, z)
  for (let i = 0; i < 4; i++) {
    const A = ring[i]
    const B = ring[(i + 1) % 4]
    facet(b, 'zincGraphite', [A, B, apex], { hint: V((A.x + B.x) / 2 - x, 0.1, (A.z + B.z) / 2 - z), seams: seams('zincGraphite', 0.45, 0.03, 0.04) })
    b.beam('helm', A, apex, 0.1, 0.08, V(A.x - x, 0, A.z - z).normalize())
  }
  // metal fins on the skirt arrises and a notch flashing at its foot
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    b.beam('helm', V(x + c * (sk.r0 + 0.05), sk.y0 - 0.4, z + s * (sk.r0 + 0.05)), V(x + c * (sk.r1 + 0.05), sk.y1, z + s * (sk.r1 + 0.05)), 0.06, 0.3, V(c, 0, s))
  }
  star(b, x, apexY + 0.6, z, 0.55)
  b.rod('gilt', V(x, apexY - 0.2, z), V(x, apexY + 0.6, z), 0.04, 6)
}

/* ================================================================== */
/* domes                                                               */
/* ================================================================== */

const unitBig: P2[] = [
  [1, 0],
  [0.99, 0.09],
  [0.955, 0.21],
  [0.89, 0.36],
  [0.79, 0.52],
  [0.65, 0.68],
  [0.48, 0.82],
  [0.31, 0.93],
]
const unitSmall: P2[] = [
  [1, 0],
  [0.99, 0.1],
  [0.96, 0.22],
  [0.9, 0.37],
  [0.8, 0.53],
  [0.66, 0.69],
  [0.48, 0.83],
  [0.27, 0.94],
]

/** Eyebrow vault: half-barrel hood (w × h) running radially out of a dome at angle a. */
function eyebrow(b: Builder, key: string, cx: number, cz: number, a: number, rIn: number, rOut: number, y0: number, w: number, h: number) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const rows: THREE.Vector3[][] = []
  const uvs: P2[][] = []
  const n = 12
  for (const r of [rIn, rOut]) {
    const row: THREE.Vector3[] = []
    const ur: P2[] = []
    for (let i = 0; i <= n; i++) {
      const t = Math.PI - (i / n) * Math.PI
      const lu = (Math.cos(t) * w) / 2
      const ly = Math.sin(t) * h
      row.push(V(cx + c * r - s * lu, y0 + ly, cz + s * r + c * lu))
      ur.push([(i / n) * Math.PI * (w / 2), r])
    }
    rows.push(row)
    uvs.push(ur)
  }
  b.add(key, gridSurface(rows, uvs, (p) => V(0, p.y - y0, 0).add(V(-s, 0, c).multiplyScalar((p.x - cx) * -s + (p.z - cz) * c))))
  // glazed front (arch)
  const sh = new THREE.Shape()
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI
    const px = (Math.cos(t) * w) / 2 - 0.08 * Math.cos(t)
    const py = Math.sin(t) * (h - 0.1)
    if (i === 0) sh.moveTo(px, py)
    else sh.lineTo(px, py)
  }
  // closed copper face with a smaller dark arched window
  b.add(key, new THREE.ShapeGeometry(sh), mat(cx + c * (rOut - 0.1), y0, cz + s * (rOut - 0.1), Math.atan2(c, s)))
  b.add('glassC', new THREE.ShapeGeometry(sh), mat(cx + c * (rOut - 0.06), y0 + 0.25, cz + s * (rOut - 0.06), Math.atan2(c, s), 0, 0, 0.42, 0.55, 1))
  b.add(key, metricBox(w + 0.2, 0.2, rOut - rIn), mat(cx + (c * (rIn + rOut)) / 2, y0 - 0.1, cz + (s * (rIn + rOut)) / 2, Math.atan2(c, s)))
}

function domeNorth(b: Builder) {
  const { x, z } = DOME_N
  const R = 10.6
  const y0 = 6.0
  const H = 7.6
  latheM(b, 'plasterWhite', x, z, [[10.0, 0], [10.0, y0]], 64)
  latheM(b, 'copperBrown', x, z, [[10.75, y0 - 0.25], [10.75, y0 + 0.05]], 64) // eave strip
  const prof: P2[] = unitBig.map(([r, y]) => [r * R, y0 + y * H])
  latheM(b, 'copperBrown', x, z, prof, 72)
  latheRibs(b, 'copper', x, z, prof, 112, 0.05)
  // eyebrow vaults (new copper) on the outer / street quadrant
  for (const a of [-80, -58, -36, -14]) eyebrow(b, 'copperNew', x, z, a * D2R, 7.8, 11.8, 3.4, 3.4, 3.4)
  // star crown: ring of pointed dormers around a glazed core, spire
  const yc = prof[prof.length - 1][1]
  const rc = prof[prof.length - 1][0]
  latheM(b, 'zincGraphite', x, z, [[rc + 0.05, yc - 0.1], [rc - 0.05, yc + 0.5], [rc - 0.3, yc + 0.55]], 40)
  latheM(b, 'glassC', x, z, [[1.9, yc + 0.5], [1.5, yc + 2.1], [0.4, yc + 2.9]], 30)
  const n = 10
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3
    const da = (Math.PI / n) * 0.62
    const P = (r: number, ang: number, y: number) => V(x + Math.cos(ang) * r, y, z + Math.sin(ang) * r)
    const tip = P(rc + 1.0, a, yc + 0.35)
    const top = P(1.0, a, yc + 2.7)
    const L = P(rc - 0.2, a - da, yc + 0.55)
    const Rr = P(rc - 0.2, a + da, yc + 0.55)
    facet(b, 'zincGraphite', [L, tip, top], { hint: V(Math.cos(a - Math.PI / 2), 0.6, Math.sin(a - Math.PI / 2)) })
    facet(b, 'zincGraphite', [tip, Rr, top], { hint: V(Math.cos(a + Math.PI / 2), 0.6, Math.sin(a + Math.PI / 2)) })
    b.beam('helm', tip, top, 0.08, 0.06)
  }
  b.add('zincGraphite', new THREE.ConeGeometry(0.42, 3.4, 8), mat(x, yc + 4.3, z))
  b.add('gilt', new THREE.SphereGeometry(0.16, 10, 8), mat(x, yc + 6.05, z))
}

function domeSouth(b: Builder) {
  const { x, z } = DOME_S
  const R = 6.9
  const y0 = 5.6
  const H = 6.0
  latheM(b, 'plasterWhite', x, z, [[6.3, 0], [6.3, y0]], 56)
  for (const y of [1.3, 2.5, 3.7]) latheM(b, 'concreteLight', x, z, [[6.36, y], [6.36, y + 0.16]], 56)
  latheM(b, 'copperBrown', x, z, [[7.0, y0 - 0.2], [7.0, y0 + 0.05]], 56)
  const prof: P2[] = unitSmall.map(([r, y]) => [r * R, y0 + y * H])
  latheM(b, 'zincGraphite', x, z, prof, 64)
  latheRibs(b, 'zincGraphite', x, z, prof, 80, 0.045)
  // white "eyelid" arch facing the towers (+X), stepped concentric rings
  const ex = x + 6.0
  for (let k = 0; k < 3; k++) {
    const ro = 2.7 - k * 0.32
    const sh = new THREE.Shape()
    sh.absarc(0, 0, ro, 0, Math.PI, false)
    sh.lineTo(-ro + 0.42, 0)
    sh.absarc(0, 0, ro - 0.42, Math.PI, 0, true)
    sh.lineTo(ro, 0)
    b.add('concreteLight', extrude(sh, 1.4 - k * 0.3, 16), mat(ex + 0.4 + k * 0.25, y0 - 0.2, z, Math.PI / 2))
  }
  const gl = new THREE.Shape()
  gl.absarc(0, 0, 1.72, 0, Math.PI, false)
  b.add('glassC', new THREE.ShapeGeometry(gl, 12), mat(ex + 0.6, y0 - 0.2, z, Math.PI / 2))
  b.block('plasterWhite', 1.8, y0 - 0.2, 5.4, ex + 0.5, 0, z)
  // lantern: glazed drum with pointed dormers, cone and spire
  const yc = prof[prof.length - 1][1]
  const rc = prof[prof.length - 1][0]
  latheM(b, 'glassC', x, z, [[rc, yc - 0.1], [rc - 0.1, yc + 0.8]], 24)
  latheM(b, 'zincGraphite', x, z, [[rc + 0.15, yc + 0.8], [rc - 0.2, yc + 1.0], [0.28, yc + 2.9]], 24)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const P = (u: number, r: number, y: number) => V(x + c * r - s * u, y, z + s * r + c * u)
    const r1 = rc + 0.45
    facet(b, 'zincGraphite', [P(-0.45, r1, yc + 0.7), P(0, r1, yc + 1.75), P(0, rc - 0.6, yc + 1.75), P(-0.45, rc - 0.6, yc + 0.7)], { hint: V(-s, 0.5, c).negate().add(V(0, 1, 0)) })
    facet(b, 'zincGraphite', [P(0.45, r1, yc + 0.7), P(0, r1, yc + 1.75), P(0, rc - 0.6, yc + 1.75), P(0.45, rc - 0.6, yc + 0.7)], { hint: V(-s, -0.5, c).add(V(0, 1, 0)) })
    facet(b, 'glassC', [P(-0.42, r1, yc - 0.05), P(0.42, r1, yc - 0.05), P(0.42, r1, yc + 0.7), P(0, r1, yc + 1.7), P(-0.42, r1, yc + 0.7)], { hint: V(c, 0, s) })
  }
  b.rod('zincGraphite', V(x, yc + 2.8, z), V(x, yc + 6.2, z), 0.07, 6)
  b.add('gilt', new THREE.SphereGeometry(0.13, 10, 8), mat(x, yc + 6.2, z))
}

/* ================================================================== */
/* community centre (L of two slate-roofed wings)                       */
/* ================================================================== */

function communityCentre(b: Builder) {
  const O = LO
  const dW: P2 = [C45, -C45]
  const nW: P2 = [C45, C45] // inward (towards the courtyard)
  const dS: P2 = [C45, C45]
  const nS: P2 = [C45, -C45]
  const at = (s: number, u: number, d: P2, n: P2): P2 => [O[0] + s * n[0] + u * d[0], O[1] + s * n[1] + u * d[1]]
  const uCh = (XCH - O[0]) / C45
  const CW = at(0, uCh, dW, nW)
  const CS = at(0, uCh, dS, nS)
  const I: P2 = [O[0] + LW * Math.SQRT2, O[1]]
  const outline: P2[] = [CW, at(0, LL, dW, nW), at(LW, LL, dW, nW), I, at(LW, LL, dS, nS), at(0, LL, dS, nS), CS]
  prismOutline(b, 'plasterWhite', outline, 0, LYE)
  // plinth band
  for (let i = 0; i < outline.length; i++) {
    const A = outline[i]
    const B = outline[(i + 1) % outline.length]
    b.beam('concreteLight', V(A[0], 0.3, A[1]), V(B[0], 0.3, B[1]), 0.12, 0.6)
  }

  // roof: lower envelope of eave planes, per wing (mitred at the bisector)
  const t = Math.tan(LPITCH * D2R)
  const ov = 0.45
  const wing = (d: P2, n: P2, keepSide: 1 | -1) => {
    const p0 = at(0, 0, d, n)
    const pOut = edgePlane(p0, n, LYE, t)
    const pIn = edgePlane(at(LW, 0, d, n), [-n[0], -n[1]], LYE, t)
    const pEnd = edgePlane(at(0, LL, d, n), [-d[0], -d[1]], LYE, t)
    const pCh = edgePlane([XCH, 0], [1, 0], LYE, t)
    let region: P2[] = [at(-ov, -10, d, n), at(-ov, LL + ov, d, n), at(LW + ov, LL + ov, d, n), at(LW + ov, -10, d, n)]
    region = dedupe(clipPoly(region, 0, keepSide, -keepSide * O[1])) // keepSide·(z − Oz) ≤ 0
    region = dedupe(clipPoly(region, -1, 0, XCH - ov)) // x ≥ XCH − ov
    planeRoof(b, 'slateDark', region, [pOut, pIn, pEnd, pCh])
    // ridge cap: from the corner hip over the cut corner to the hipped end
    const rh = LYE + t * (LW / 2)
    const u0 = (XCH + LW / 2 - O[0] - (LW / 2) * C45) / C45
    const s0 = at(LW / 2, u0, d, n)
    const s1 = at(LW / 2, LL - LW / 2, d, n)
    b.beam('zincGraphite', V(s0[0], rh + 0.06, s0[1]), V(s1[0], rh + 0.06, s1[1]), 0.3, 0.14)
  }
  wing(dW, nW, 1)
  wing(dS, nS, -1)
  // gutters along the long eaves
  for (const [d, n] of [
    [dW, nW],
    [dS, nS],
  ] as [P2, P2][]) {
    for (const s of [-ov, LW + ov]) {
      const u0 = s < 0 ? uCh + 1.2 : LW + 0.2
      const A = at(s, u0, d, n)
      const B = at(s, LL + (s < 0 ? ov : -ov), d, n)
      b.rod('zincGraphite', V(A[0], LYE - ov * t - 0.1, A[1]), V(B[0], LYE - ov * t - 0.1, B[1]), 0.1, 6)
    }
  }

  // windows: outer walls (two rows), courtyard walls (ground floor)
  for (const [d, n] of [
    [dW, nW],
    [dS, nS],
  ] as [P2, P2][]) {
    for (let u = uCh + 2.6; u < LL - 6; u += 2.9) {
      const p = at(0, u, d, n)
      wallWin(b, p[0], p[1], -n[0], -n[1], 1.0, 1.0, 1.5, 'rect', 'glassC', 'timber', 0.1)
      wallWin(b, p[0], p[1], -n[0], -n[1], 3.9, 1.0, 1.4, 'rect', 'glassC', 'timber', 0.1)
    }
    for (let u = LW + 1.6; u < LL - 7; u += 2.9) {
      const p = at(LW, u, d, n)
      wallWin(b, p[0], p[1], n[0], n[1], 0.2, 1.3, 2.4, 'rect', 'glassC', 'timber', 0.1)
      wallWin(b, p[0], p[1], n[0], n[1], 3.9, 1.0, 1.4, 'rect', 'glassC', 'timber', 0.1)
    }
  }
  // corner entrance: glazed door under a small slate hood, dark stone jambs, side windows
  const ez = O[1]
  wallWin(b, XCH, ez, -1, 0, 0, 2.4, 3.0, 'rect', 'glassC', 'wood', 0.18)
  for (const s of [-1, 1]) {
    b.block('stoneGrey', 0.5, 3.6, 0.6, XCH - 0.25, 0, ez + s * 1.65)
    wallWin(b, XCH, ez + s * 3.6, -1, 0, 1.0, 1.0, 1.5, 'rect', 'glassC', 'timber', 0.1)
    wallWin(b, XCH, ez + s * 3.6, -1, 0, 3.9, 1.0, 1.4, 'rect', 'glassC', 'timber', 0.1)
  }
  facet(b, 'slateDark', [V(XCH - 1.6, 3.7, ez - 2.2), V(XCH - 1.6, 3.7, ez + 2.2), V(XCH - 0.6, 5.0, ez)], { hint: V(-1, 1, 0) })
  facet(b, 'slateDark', [V(XCH - 1.6, 3.7, ez + 2.2), V(XCH, 3.7, ez + 2.2), V(XCH, 5.0, ez), V(XCH - 0.6, 5.0, ez)], { hint: V(0, 1, 1) })
  facet(b, 'slateDark', [V(XCH, 3.7, ez - 2.2), V(XCH - 1.6, 3.7, ez - 2.2), V(XCH - 0.6, 5.0, ez), V(XCH, 5.0, ez)], { hint: V(0, 1, -1) })
  b.block('stoneGrey', 1.0, 0.5, 4.6, XCH - 0.5, 0, ez)

  // skylights on the south wing's outer slope (two rows), chimney on the west wing
  const pitch = LPITCH * D2R
  const up = V(nS[0] * Math.cos(pitch), Math.sin(pitch), nS[1] * Math.cos(pitch))
  const along = V(dS[0], 0, dS[1])
  const nrm = V().crossVectors(along, up)
  const basis = nrm.y < 0 ? new THREE.Matrix4().makeBasis(along.clone().negate(), up, nrm.clone().negate()) : new THREE.Matrix4().makeBasis(along, up, nrm)
  for (const s of [1.4, 2.9]) {
    for (let u = uCh + 4; u < LL - 7; u += 2.2) {
      const p = at(s, u, dS, nS)
      const m = basis.clone().setPosition(V(p[0], LYE + t * s + 0.05, p[1]))
      b.add('skylight', metricBox(0.7, 0.95, 0.1), m)
    }
  }
  const cp = at(LW * 0.3, 15, dW, nW)
  b.block('plasterWhite', 0.8, 2.2, 0.8, cp[0], LYE + t * LW * 0.3 - 0.5, cp[1])
  b.block('zincGraphite', 1.0, 0.12, 1.0, cp[0], LYE + t * LW * 0.3 + 1.7, cp[1])

  // courtyard: white arch ribs along the west wing, colonnade along the south wing
  for (let k = 0; k < 4; k++) {
    const u = LL - 8.2 - k * 2.4
    const p = at(LW, u, dW, nW)
    const span = 5.0
    const sh = new THREE.Shape()
    const ro = span / 2
    const ri = ro - 0.45
    const legs = 3.2
    sh.moveTo(-ro, 0)
    sh.lineTo(-ro, legs)
    sh.absarc(0, legs, ro, Math.PI, 0, true)
    sh.lineTo(ro, 0)
    sh.lineTo(ri, 0)
    sh.lineTo(ri, legs)
    sh.absarc(0, legs, ri, 0, Math.PI, false)
    sh.lineTo(-ri, 0)
    sh.lineTo(-ro, 0)
    // arch plane contains the wing's inward normal
    const cx = p[0] + nW[0] * (ro - 0.1)
    const cz = p[1] + nW[1] * (ro - 0.1)
    b.add('concreteLight', extrude(sh, 0.45, 16), mat(cx, 0, cz, Math.atan2(dW[0], dW[1])))
  }
  for (let u = LW + 1.0; u < LL - 8; u += 2.8) {
    const p = at(LW + 2.3, u, dS, nS)
    b.block('plasterWhite', 0.32, 3.3, 0.32, p[0], 0, p[1])
  }
  {
    const A = at(LW + 2.3, LW + 1.0, dS, nS)
    const B = at(LW + 2.3, LL - 8, dS, nS)
    b.beam('plasterWhite', V(A[0], 3.45, A[1]), V(B[0], 3.45, B[1]), 0.5, 0.4)
    const A2 = at(LW + 1.15, LW + 1.0, dS, nS)
    const B2 = at(LW + 1.15, LL - 8, dS, nS)
    b.beam('plasterWhite', V(A2[0], 3.62, A2[1]), V(B2[0], 3.62, B2[1]), 2.6, 0.12, V(0, 1, 0))
  }
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()
  churchBase(b)
  bud(b)
  portico(b)
  tower(b, TOWER.x, ZC - TOWER.dz)
  tower(b, TOWER.x, ZC + TOWER.dz)
  domeNorth(b)
  domeSouth(b)
  communityCentre(b)
  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [BX + 6.2, 13, ZC],
  materials: () => ({
    timberGrey: new THREE.MeshStandardMaterial({ color: '#463f37', roughness: 0.88 }),
    slateDark: new THREE.MeshStandardMaterial({ color: '#3b4048', roughness: 0.72, metalness: 0.1 }),
  }),
  notes:
    'Interpreted from 12 photographs and the merged OSM outline: heights estimated; bud, spike lattice, dome crowns and eyebrow vaults simplified; courtyard and wing façades indicative.',
}
export default model
