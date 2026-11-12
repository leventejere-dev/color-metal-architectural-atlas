/**
 * COLOR METAL headquarters — Str. Nicolae Bălcescu 95, Odorheiu Secuiesc.
 *
 * COLOR METAL's own office block in front of its warehouse hall, wrapped in a
 * GREEN EXPANDED-ALUMINIUM MESH skin (verified product: expanded aluminium,
 * green). Only ONE photograph exists (street corner, south-west).
 *
 * Modelling specification (real metres; +X = along the street front of the
 * office, bearing ≈ 73.4°, i.e. perpendicular to the OSM hall axis 163.4°;
 * +Z = street front facing SSE):
 *  - Office block ≈ 30 × 16 m (front length taken equal to the hall width,
 *    side depth from the perspective of the photo), two storeys; a dark inner
 *    wall with window bands, veiled by the green mesh hung ≈ 0.3 m in front on
 *    green vertical profiles (≈ 1.45 m centres, feet to the ground) with
 *    horizontal panel joints; rounded corners (R ≈ 1.2 m). Mesh from 0.35 m
 *    to ≈ 8.4 m, topped by a silver expanded-mesh roof screen ≈ 1.1 m high
 *    with posts, rail and an inward lip.
 *  - Street front: a recessed two-storey bay ≈ 11 m wide: ground floor shop
 *    entrance (glazed doors, window) in grey render, first-floor terrace with
 *    green glass balustrade, bronze-clad balcony slab (projecting box on the
 *    left), bronze-clad roof canopy and one bronze-clad square column; a
 *    mesh-clad ground-floor block at the right end of the bay.
 *  - West side: side entrance in a grey niche with a green sheet canopy.
 *  - Adjoining hall: only the part the photograph shows / implies — an 8 m deep
 *    slice behind the office whose end wall continues ≈ 3.5 m west of the
 *    office (grey sandwich panels, anthracite base, two windows, loading door
 *    with a green canopy), low-pitched roof.
 * Not modelled: the lettering, the rest of the 146 m hall, ducts, landscaping.
 * Approximations: all dimensions are perspective estimates from one photo;
 * rear and east elevations are not photographed (mesh assumed to continue on
 * the east end); window positions behind the mesh are estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

/* ---------------- dimensions ---------------- */
const HX = 15 // half length of the mesh skin (x)
const HZ = 8 // half depth of the mesh skin (z)
const OFF = 0.3 // mesh in front of the inner wall
const R = 1.2 // corner radius of the skin
const MESH_Y0 = 0.35
const MESH_Y1 = 8.4
const SCREEN_Y1 = 9.45
const ROOF_Y = 8.25
const FLOOR1 = 4.2 // first floor level
/** recessed bay on the street front (x range) and recess depth */
const BAY = { x0: -4.0, x1: 6.9, xGf: 4.6, back: HZ - OFF - 3.0 }
/** side-entrance niche on the west face (z range, height) */
const NICHE = { z0: -6.0, z1: -3.6, h: 3.1 }
/** hall slice behind the office (only an 8 m slice; the hall is 146 m long) */
const HALL = { x0: -18.5, x1: HX - OFF, z0: -(HZ - OFF) - 8, z1: -(HZ - OFF), h: 7.8 }

/* ---------------- skin path (rounded rectangle) ---------------- */
interface PathPt {
  x: number
  z: number
  nx: number
  nz: number
  u: number
}

/** Sample a rounded rectangle path (CCW seen from above, starting at the west end of the front face). */
function skinPath(hx: number, hz: number, r: number, arcSegs = 8): { pts: PathPt[]; len: number } {
  const pts: PathPt[] = []
  let u = 0
  let prev: { x: number; z: number } | null = null
  const push = (x: number, z: number, nx: number, nz: number) => {
    if (prev) u += Math.hypot(x - prev.x, z - prev.z)
    pts.push({ x, z, nx, nz, u })
    prev = { x, z }
  }
  // corners: centre and start angle (angle measured in the XZ plane: (cos a, sin a))
  const corners: [number, number, number][] = [
    [hx - r, hz - r, Math.PI / 2], // front-east (+x,+z): from +z normal to +x normal
    [hx - r, -hz + r, 0],
    [-hx + r, -hz + r, -Math.PI / 2],
    [-hx + r, hz - r, Math.PI],
  ]
  push(-hx + r, hz, 0, 1)
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= arcSegs; i++) {
      const a = a0 - (i / arcSegs) * (Math.PI / 2)
      push(cx + Math.cos(a) * r, cz + Math.sin(a) * r, Math.cos(a), Math.sin(a))
    }
  }
  const first = pts[0]
  push(first.x, first.z, 0, 1)
  return { pts, len: u }
}

/** Resample the path between arc lengths ua..ub (keeps corner vertices). */
function slice(path: PathPt[], ua: number, ub: number): PathPt[] {
  const out: PathPt[] = []
  const lerp = (p: PathPt, q: PathPt, t: number): PathPt => ({
    x: p.x + (q.x - p.x) * t,
    z: p.z + (q.z - p.z) * t,
    nx: p.nx + (q.nx - p.nx) * t,
    nz: p.nz + (q.nz - p.nz) * t,
    u: p.u + (q.u - p.u) * t,
  })
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i]
    const q = path[i + 1]
    if (q.u < ua || p.u > ub) continue
    if (p.u >= ua) out.push(p)
    else out.push(lerp(p, q, (ua - p.u) / (q.u - p.u)))
    if (q.u > ub) {
      out.push(lerp(p, q, (ub - p.u) / (q.u - p.u)))
      return out
    }
  }
  out.push(path[path.length - 1])
  return out
}

/** Vertical ribbon along path points, offset outwards by `off`, UVs in metres. */
function ribbon(b: Builder, key: string, pts: PathPt[], y0: number, y1: number, off = 0) {
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i]
    const B = pts[i + 1]
    if (Math.hypot(B.x - A.x, B.z - A.z) < 1e-5) continue
    const quad: [PathPt, number][] = [
      [A, y0],
      [B, y0],
      [B, y1],
      [A, y0],
      [B, y1],
      [A, y1],
    ]
    for (const [P, y] of quad) {
      pos.push(P.x + P.nx * off, y, P.z + P.nz * off)
      nor.push(P.nx, 0, P.nz)
      uv.push(P.u, y)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)
}

/** Horizontal rail following the path. */
function rail(b: Builder, key: string, pts: PathPt[], y: number, off: number, w: number, h: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i]
    const B = pts[i + 1]
    if (Math.hypot(B.x - A.x, B.z - A.z) < 1e-4) continue
    b.beam(key, V(A.x + A.nx * off, y, A.z + A.nz * off), V(B.x + B.nx * off, y, B.z + B.nz * off), w, h)
  }
}

/** Point on the path at arc length u. */
function at(path: PathPt[], u: number): PathPt {
  return slice(path, u, u + 1e-4)[0]
}

/* ---------------- inner wall outline (rounded, with recess) ---------------- */
function innerOutline(): [number, number][] {
  const hx = HX - OFF
  const hz = HZ - OFF
  const r = R - OFF
  const pts: [number, number][] = []
  const arc = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  // CCW seen from above (x right, z down on screen → use the kit convention: outline in XZ)
  arc(hx - r, -hz + r, -Math.PI / 2) // north-east corner
  arc(hx - r, hz - r, 0) // south-east (front-east)
  // front face with the recessed bay (east → west)
  pts.push([BAY.x1, hz], [BAY.x1, BAY.back], [BAY.x0, BAY.back], [BAY.x0, hz])
  arc(-hx + r, hz - r, Math.PI / 2) // front-west
  arc(-hx + r, -hz + r, Math.PI) // north-west
  return pts
}

/* ---------------- windows (behind the mesh) ---------------- */
function win(b: Builder, face: '+z' | '-x' | '+x', plane: number, a: number, c: number, y0: number, y1: number, mullions: number) {
  const w = c - a
  const h = y1 - y0
  const mid = (a + c) / 2
  const m =
    face === '+z' ? mat(mid, (y0 + y1) / 2, plane + 0.02) : face === '-x' ? mat(plane - 0.02, (y0 + y1) / 2, mid, -Math.PI / 2) : mat(plane + 0.02, (y0 + y1) / 2, mid, Math.PI / 2)
  b.add('glassG', new THREE.PlaneGeometry(w, h), m)
  const fm = (lx: number, ly: number, sw: number, sh: number) => b.add('frameGrey', metricBox(sw, sh, 0.06), new THREE.Matrix4().multiplyMatrices(m, mat(lx, ly, 0.02)))
  fm(0, h / 2, w + 0.1, 0.08)
  fm(0, -h / 2, w + 0.1, 0.08)
  for (let i = 0; i <= mullions; i++) fm(-w / 2 + (i * w) / mullions, 0, 0.07, h)
}

/** Shift so that the modelled footprint (office + hall slice) is centred on the origin. */
const SHIFT = { x: -(HALL.x0 + HX) / 2, z: -(HALL.z0 + HZ) / 2 }

function build(): Builder {
  const out = new Builder()
  const b = new Builder()
  const ihx = HX - OFF
  const ihz = HZ - OFF

  /* ---------- inner volume ---------- */
  prismOutline(b, 'innerDark', innerOutline(), 0, ROOF_Y)
  // flat roof membrane and parapet upstand
  prismOutline(b, 'roofGrey', innerOutline(), ROOF_Y, 0.08)
  // grey render inside the bay (ground floor and terrace back wall)
  b.block('renderGrey', BAY.x1 - BAY.x0 - 0.02, ROOF_Y - 0.6, 0.06, (BAY.x0 + BAY.x1) / 2, 0, BAY.back + 0.03)
  for (const x of [BAY.x0 + 0.03, BAY.x1 - 0.03]) b.block('renderGrey', 0.06, ROOF_Y - 0.6, ihz - BAY.back, x, 0, (ihz + BAY.back) / 2)
  // mesh-clad ground-floor block at the right end of the bay
  b.block('innerDark', BAY.x1 - BAY.xGf, FLOOR1 - 0.9, ihz - BAY.back, (BAY.xGf + BAY.x1) / 2, 0, (ihz + BAY.back) / 2)

  /* ---------- windows ---------- */
  // street front, west part (two window groups on both floors)
  for (const [a, c] of [
    [-13.3, -10.9],
    [-9.3, -7.0],
  ]) {
    win(b, '+z', ihz, a, c, 5.0, 6.8, 2)
    win(b, '+z', ihz, a, c, 1.0, 2.8, 2)
  }
  // street front, east part (behind the lettering)
  for (const [a, c] of [
    [8.6, 10.6],
    [11.6, 13.4],
  ]) {
    win(b, '+z', ihz, a, c, 5.0, 6.8, 2)
    win(b, '+z', ihz, a, c, 1.0, 2.8, 2)
  }
  // west face: first-floor groups (z ranges from the photo), ground-floor windows
  for (const [a, c, n] of [
    [3.8, 5.5, 2],
    [-1.3, 1.6, 3],
    [-5.6, -3.2, 3],
  ] as [number, number, number][]) win(b, '-x', -ihx, a, c, 4.9, 6.8, n)
  for (const [a, c] of [
    [3.0, 5.6],
    [-1.3, 1.6],
  ]) win(b, '-x', -ihx, a, c, 1.0, 2.8, 2)
  // east end (not photographed): two groups per floor
  for (const [a, c] of [
    [-3.5, -0.5],
    [1.5, 4.5],
  ]) {
    win(b, '+x', ihx, a, c, 5.0, 6.8, 2)
    win(b, '+x', ihx, a, c, 1.0, 2.8, 2)
  }

  /* ---------- terrace bay ---------- */
  {
    const zb = BAY.back + 0.06
    // ground floor: shop door, second door, window (glazed, dark frames)
    const gfDoor = (a: number, c: number, h: number, y0 = 0) => {
      b.add('glassC', new THREE.PlaneGeometry(c - a, h), mat((a + c) / 2, y0 + h / 2, zb + 0.01))
      for (const x of [a, c, (a + c) / 2]) b.block('frameDark', 0.08, h, 0.08, x, y0, zb + 0.04)
      b.block('frameDark', c - a + 0.08, 0.1, 0.08, (a + c) / 2, y0 + h, zb + 0.04)
    }
    gfDoor(-3.6, -1.9, 2.5)
    b.block('frameDark', 1.9, 0.5, 0.06, -2.75, 2.55, zb + 0.03) // fascia over the shop door (no text)
    gfDoor(0.6, 1.6, 2.3)
    gfDoor(2.2, 3.4, 1.4, 1.0)
    // first floor: glazed wall on the left of the terrace
    gfDoor(-3.6, -0.6, 2.6, FLOOR1 + 0.3)
    // balcony slab with bronze fascia; projecting box on the left
    const slabY = FLOOR1 - 0.9
    b.block('renderGrey', BAY.x1 - BAY.x0, 0.35, ihz - BAY.back + OFF, (BAY.x0 + BAY.x1) / 2, slabY + 0.55, (ihz + BAY.back + OFF) / 2)
    b.block('bronze', BAY.x1 - BAY.x0 + 0.3, 0.9, 0.08, (BAY.x0 + BAY.x1) / 2, slabY, HZ + 0.05)
    b.block('bronze', 4.6, 1.05, 1.1, BAY.x0 + 2.0, slabY - 0.15, HZ + 0.55)
    // green-tinted glass balustrade on the slab
    b.block('glassGreen', BAY.x1 - BAY.x0 - 0.2, 1.05, 0.03, (BAY.x0 + BAY.x1) / 2, slabY + 0.9, HZ - 0.15)
    b.block('frameGrey', BAY.x1 - BAY.x0 - 0.2, 0.06, 0.08, (BAY.x0 + BAY.x1) / 2, slabY + 1.95, HZ - 0.15)
    // roof canopy with deep bronze fascia
    b.block('soffit', BAY.x1 - BAY.x0, 0.2, ihz - BAY.back + OFF + 0.4, (BAY.x0 + BAY.x1) / 2, MESH_Y1 - 1.75, (ihz + BAY.back + OFF + 0.4) / 2)
    b.block('bronze', BAY.x1 - BAY.x0 + 0.4, 1.75, 0.1, (BAY.x0 + BAY.x1) / 2, MESH_Y1 - 1.75, HZ + 0.4)
    for (const x of [BAY.x0 - 0.15, BAY.x1 + 0.15]) b.block('bronze', 0.1, 1.75, ihz - BAY.back + OFF + 0.4, x, MESH_Y1 - 1.75, (ihz + BAY.back + OFF + 0.4) / 2)
    // bronze-clad square column (panel joints as thin bands)
    const colX = 0.0
    b.block('bronze', 0.62, MESH_Y1 - 0.15, 0.62, colX, 0, HZ + 0.15)
    for (let y = 1.2; y < MESH_Y1 - 0.5; y += 1.2) b.block('bronzeDark', 0.64, 0.03, 0.64, colX, y, HZ + 0.15)
    b.block('gilt', 0.64, 0.5, 0.64, colX, MESH_Y1 - 1.3, HZ + 0.15)
  }

  /* ---------- green expanded-mesh skin ---------- */
  const { pts: path, len } = skinPath(HX, HZ, R)
  const uOf = (x: number) => x - (-HX + R) // arc length along the front face from its start
  const uBay0 = uOf(BAY.x0)
  const uBay1 = uOf(BAY.x1)
  const uGf = uOf(BAY.xGf)
  // path order: front → SE arc → east → NE arc → back → NW arc → west (z increasing) → SW arc
  const westFaceStart = len - (Math.PI / 2) * R - (2 * HZ - 2 * R)
  const uNiche = (z: number) => westFaceStart + (z - (-HZ + R))
  const n0 = uNiche(NICHE.z0)
  const n1 = uNiche(NICHE.z1)
  const backStart = (2 * HX - 2 * R) + (Math.PI / 2) * R + (2 * HZ - 2 * R) + (Math.PI / 2) * R
  const backEnd = backStart + (2 * HX - 2 * R)

  // mesh pieces: [ua, ub, y0, y1]; the back face (against the hall) has no mesh
  const pieces: [number, number, number, number][] = [
    [0, uBay0, MESH_Y0, MESH_Y1],
    [uBay1, backStart, MESH_Y0, MESH_Y1],
    [uGf, uBay1, MESH_Y0, FLOOR1 - 0.95],
    [backEnd, n0, MESH_Y0, MESH_Y1],
    [n0, n1, NICHE.h, MESH_Y1],
    [n1, len, MESH_Y0, MESH_Y1],
  ]
  // the ground-floor block in the bay sits on the façade line
  for (const [ua, ub, y0, y1] of pieces) {
    const seg = slice(path, ua, ub)
    ribbon(b, 'expMeshGreen', seg, y0, y1)
    // horizontal panel joints
    for (let y = y0 + 1.35; y < y1 - 0.3; y += 1.35) rail(b, 'greenProfile', seg, y, 0.03, 0.04, 0.05)
    rail(b, 'greenProfile', seg, y0 + 0.02, 0.02, 0.06, 0.06)
    if (y1 === MESH_Y1) rail(b, 'greenProfile', seg, y1 - 0.02, 0.02, 0.07, 0.07)
  }
  // vertical profiles every ≈ 1.45 m (posts down to the ground where the mesh starts low)
  const inBay = (u: number) => u > uBay0 + 0.05 && u < uGf - 0.05
  for (let u = 0.02; u < len; u += 1.45) {
    if (u > backStart - 0.05 && u < backEnd + 0.05) continue
    if (inBay(u)) continue
    const p = at(path, u)
    const ry = Math.atan2(p.nx, p.nz)
    const inNiche = u > n0 && u < n1
    const inUpperBay = u > uGf && u < uBay1
    const y0 = inNiche ? NICHE.h : 0
    const y1 = inUpperBay ? FLOOR1 - 0.95 : MESH_Y1
    b.add('greenProfile', metricBox(0.09, y1 - y0, 0.12), mat(p.x + p.nx * 0.05, (y0 + y1) / 2, p.z + p.nz * 0.05, ry))
    if (y0 === 0) b.add('frameDark', metricBox(0.2, 0.06, 0.25), mat(p.x, 0.03, p.z, ry))
  }
  // edge profiles at the bay and niche openings
  for (const u of [uBay0, uBay1, uGf, n0, n1]) {
    const p = at(path, u)
    const top = u === uGf ? FLOOR1 - 0.95 : MESH_Y1
    const bot = u === n0 || u === n1 ? NICHE.h : 0
    b.add('greenProfile', metricBox(0.1, top - bot, 0.14), mat(p.x + p.nx * 0.05, (top + bot) / 2, p.z + p.nz * 0.05, Math.atan2(p.nx, p.nz)))
  }
  // niche: grey render surround, door, green sheet canopy
  {
    const zc = (NICHE.z0 + NICHE.z1) / 2
    b.block('renderGrey', 0.06, NICHE.h, NICHE.z1 - NICHE.z0, -ihx - 0.03, 0, zc)
    b.add('frameDark', metricBox(0.06, 2.3, 1.05), mat(-ihx - 0.07, 1.15, zc - 0.3))
    b.add('glassC', new THREE.PlaneGeometry(0.4, 1.6), mat(-ihx - 0.105, 1.3, zc - 0.3, -Math.PI / 2))
    const cy = NICHE.h + 0.05
    facet(b, 'greenProfile', [V(-HX - 1.0, cy, NICHE.z0 - 0.35), V(-HX - 1.0, cy, NICHE.z1 + 0.35), V(-ihx, cy + 0.35, NICHE.z1 + 0.35), V(-ihx, cy + 0.35, NICHE.z0 - 0.35)], { thickness: 0.06 })
    b.block('greenProfile', 0.08, 0.38, NICHE.z1 - NICHE.z0 + 0.7, -HX - 1.0, cy - 0.3, zc)
  }

  /* ---------- silver expanded-mesh roof screen ---------- */
  const scr: [number, number][] = [
    [0, backStart],
    [backEnd, len],
  ]
  for (const [ua, ub] of scr) {
    const seg = slice(path, ua, ub)
    ribbon(b, 'meshSilver', seg, MESH_Y1, SCREEN_Y1)
    rail(b, 'aluNatural', seg, SCREEN_Y1, 0.0, 0.07, 0.07)
    // inward-sloping lip on top
    const segIn = seg.map((p) => ({ ...p }))
    const pos: number[] = []
    const uv: number[] = []
    for (let i = 0; i < segIn.length - 1; i++) {
      const A = segIn[i]
      const B = segIn[i + 1]
      const q = (P: PathPt, o: number, y: number) => pos.push(P.x + P.nx * o, y, P.z + P.nz * o)
      q(A, 0, SCREEN_Y1)
      q(B, 0, SCREEN_Y1)
      q(B, -0.35, SCREEN_Y1 + 0.25)
      q(A, 0, SCREEN_Y1)
      q(B, -0.35, SCREEN_Y1 + 0.25)
      q(A, -0.35, SCREEN_Y1 + 0.25)
      uv.push(A.u, 0, B.u, 0, B.u, 0.43, A.u, 0, B.u, 0.43, A.u, 0.43)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.computeVertexNormals()
    b.add('meshSilver', g)
    rail(b, 'aluNatural', seg, SCREEN_Y1 + 0.25, -0.35, 0.05, 0.05)
  }
  for (let u = 0.02; u < len; u += 2.9) {
    if (u > backStart - 0.05 && u < backEnd + 0.05) continue
    const p = at(path, u)
    b.add('aluNatural', metricBox(0.07, SCREEN_Y1 - ROOF_Y, 0.07), mat(p.x - p.nx * 0.05, (SCREEN_Y1 + ROOF_Y) / 2, p.z - p.nz * 0.05, Math.atan2(p.nx, p.nz)))
  }
  // roof plant (low, behind the screen)
  b.block('galv', 3.2, 1.1, 1.6, 6.0, ROOF_Y, -3.0)
  b.block('galv', 1.8, 0.9, 1.2, 9.8, ROOF_Y, -4.2)

  /* ---------- adjoining hall slice ---------- */
  {
    const w = HALL.x1 - HALL.x0
    const d = HALL.z1 - HALL.z0
    const cx = (HALL.x0 + HALL.x1) / 2
    const cz = (HALL.z0 + HALL.z1) / 2
    b.block('panelLight', w, HALL.h, d, cx, 0, cz)
    b.block('panelDark', w + 0.04, 3.6, d + 0.04, cx, 0, cz)
    // panel joints on the visible end wall (west of the office) and the west side
    for (let y = 4.6; y < HALL.h - 0.2; y += 1.0) {
      b.block('panelJoint', -HX - HALL.x0, 0.03, 0.04, (HALL.x0 - HX) / 2, y, HALL.z1 + 0.02)
      b.block('panelJoint', 0.04, 0.03, d, HALL.x0 - 0.02, y, cz)
    }
    // roof behind a low attic (roof form not visible in the photo): membrane + light coping
    b.block('panelRoof', w - 0.4, 0.05, d - 0.4, cx, HALL.h - 0.4, cz)
    b.block('panelLight', w + 0.1, 0.12, 0.35, cx, HALL.h, HALL.z0 + 0.12)
    b.block('panelLight', 0.35, 0.12, d, HALL.x0 + 0.12, HALL.h, cz)
    b.block('panelLight', 0.35, 0.12, d, HALL.x1 - 0.12, HALL.h, cz)
    b.block('panelLight', -HX - HALL.x0 + 0.3, 0.12, 0.35, (HALL.x0 - HX) / 2, HALL.h, HALL.z1 - 0.12)
    // end wall west of the office: two windows, loading door with green canopy
    const zf = HALL.z1 + 0.03
    for (const x of [-17.8, -16.2]) {
      b.add('glassG', new THREE.PlaneGeometry(1.1, 0.9), mat(x, 5.75, zf))
      b.block('frameGrey', 1.2, 1.0, 0.04, x, 5.3, zf - 0.03)
    }
    b.add('shutterGrey', new THREE.PlaneGeometry(2.6, 3.6), mat(-16.8, 1.8, zf + 0.01))
    facet(b, 'greenProfile', [V(-18.5, 4.15, zf + 2.0), V(-HX - 0.1, 4.15, zf + 2.0), V(-HX - 0.1, 4.45, zf), V(-18.5, 4.45, zf)], { thickness: 0.08 })
    b.block('greenProfile', 3.4, 0.45, 0.08, -16.8, 3.75, zf + 2.0)
  }

  return out.merge(b, mat(SHIFT.x, 0, SHIFT.z))
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-12 + SHIFT.x, 5, 8 + SHIFT.z],
  materials: (base) => {
    // silver expanded mesh: the palette's mesh alpha (diamond openings) without the gold colour map
    const silver = (base.expMesh as THREE.MeshStandardMaterial).clone()
    silver.map = null
    silver.color.set('#c3c8cc')
    silver.metalness = 0.7
    silver.roughness = 0.35
    silver.userData.noCast = true
    return {
      meshSilver: silver,
      innerDark: new THREE.MeshStandardMaterial({ color: '#25352d', roughness: 0.85 }),
      roofGrey: new THREE.MeshStandardMaterial({ color: '#8f9396', roughness: 0.9 }),
      renderGrey: new THREE.MeshStandardMaterial({ color: '#a7a49d', roughness: 0.9 }),
      greenProfile: new THREE.MeshStandardMaterial({ color: '#2c6b47', metalness: 0.45, roughness: 0.42 }),
      frameDark: new THREE.MeshStandardMaterial({ color: '#2b2e31', metalness: 0.3, roughness: 0.5 }),
      frameGrey: new THREE.MeshStandardMaterial({ color: '#5b6066', metalness: 0.3, roughness: 0.5 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#8a6a3c', metalness: 0.65, roughness: 0.38, envMapIntensity: 1.1 }),
      bronzeDark: new THREE.MeshStandardMaterial({ color: '#5e4628', metalness: 0.5, roughness: 0.45 }),
      soffit: new THREE.MeshStandardMaterial({ color: '#6e5536', roughness: 0.6 }),
      glassGreen: new THREE.MeshStandardMaterial({ color: '#4f8a68', metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.6 }),
      panelLight: new THREE.MeshStandardMaterial({ color: '#b6babd', roughness: 0.7, metalness: 0.2 }),
      panelDark: new THREE.MeshStandardMaterial({ color: '#41464c', roughness: 0.7, metalness: 0.2 }),
      panelJoint: new THREE.MeshStandardMaterial({ color: '#8d9195', roughness: 0.7 }),
      panelRoof: new THREE.MeshStandardMaterial({ color: '#9fa3a6', roughness: 0.7, metalness: 0.25 }),
      shutterGrey: new THREE.MeshStandardMaterial({ color: '#5d6267', roughness: 0.6, metalness: 0.3 }),
    }
  },
  notes: 'Office block wrapped in green expanded aluminium mesh with a silver mesh roof screen; only the photographed slice of the warehouse hall is shown. Dimensions estimated from a single photograph; lettering omitted.',
}
export default model
