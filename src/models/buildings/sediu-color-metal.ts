/**
 * Sediul COLOR METAL — Str. Nicolae Bălcescu 95, Odorheiu Secuiesc (jud. Harghita).
 *
 * COLOR METAL's own headquarters: a two-storey office block wrapped in GREEN
 * EXPANDED ALUMINIUM (verified product) in front of a 145 m warehouse hall, and
 * a second, separate building (the "Divizia Soluții Arhitecturale" training
 * centre) whose street end is wrapped in the same green mesh.
 *
 * Sources: COLOR METAL's own photographs (folder "COLOR METAL HEADQUARTER
 * BUILDING PHOTOS"): drone views DJI_0550–0557 (Nov 2025; the Drón2 set are
 * re-graded copies of 0550/0552/0553/0556), ground views 1–4.jpg (Aug 2026),
 * 1–3.jpeg (spring 2026) and DSC04951–04965 (second building, Nov 2025).
 * Footprint and orientation: OSM way 1360982485 (29.8 × 145 m, whole complex,
 * long axis 163.4°). Plan positions of the office depth, the second building, the
 * roof PV field and the site features were measured on the near-vertical drone
 * photo DJI_0556 with a homography fitted to the four OSM corners of the hall roof.
 *
 * Modelling specification (real metres). Frame F used below: x = along the street
 * front from the hall's west wall (0 … 29.8), z = towards the street (0 = front
 * of the office's west part, −145 = north end of the hall). The model origin is
 * the project's geo point (plus code 8894+QR), which lies 10.6 m east of the west
 * wall and 2.3 m in front of the OSM front edge; +X = 73.4° (ENE), +Z = street
 * front (163.4°, SSE). The composition is NOT re-centred: the hall runs 145 m
 * behind the geo point and the second building stands west of it, as on site.
 *  - Office block: full hall width × ≈ 20 m deep, flat roof with skylight domes.
 *    Dark inner wall with window bands, veiled by the green mesh hung 0.3 m in
 *    front on a visible grid of green profiles (≈ 1.45 m verticals, ≈ 0.95 m
 *    horizontal joints, posts down to the ground), rounded vertical corners
 *    (R ≈ 1.2 m). Mesh to ≈ 8.5 m, topped all round by a silver expanded-mesh
 *    parapet screen (≈ 0.65 m upright + inward lip) on posts.
 *  - Lettering corner: the east 9.5 m of the front projects 1.8 m and reads
 *    ≈ 0.5 m taller in the ground photos (mesh to 9.0 m along its front, its west
 *    return and the whole east face). White "COLOR METAL" lettering on its front
 *    and on the west face near the front corner (the "20" anniversary numerals of
 *    the 2025 photos are gone in the Aug 2026 photos and are not modelled).
 *  - Entrance loggia (8.3 m) between the west part and the lettering corner:
 *    bronze/brass-clad frame (corner pillar with a gilt top, roof fascia, balcony
 *    fascia with panel joints), timber soffits, green-mesh balustrade, render back
 *    wall with the two glazed entrances "METAL SHOP" / "OFFICES" under dark sign
 *    fascias and two first-floor glazed walls; the mesh continues above it.
 *  - Side entrances: a grey niche with door and green sheet canopy at the back of
 *    the west face; a niche with door, window and canopy on the east face.
 *  - Warehouse hall: 29.8 × 125 m behind the office, dark grey sandwich panels
 *    (≈ 8.1 m + parapet), upper window band, green-fascia canopies over the
 *    loading docks on both long sides (the west one wider in its middle third),
 *    sectional doors, racks with stock under the west canopy, white roof membrane
 *    with walkway bands and the PV field on the north third (≈ 12 × 48 m).
 *  - Second building: ≈ 14.7 × 38.2 m, ≈ 7.6 m, dark grey panels with window rows
 *    and a sectional door; its street end is wrapped in green mesh on green
 *    profiles 0.6 m off the wall (returns ≈ 2 m along both sides), silver mesh
 *    screen with a chamfered top, glazed entrance under a green corrugated canopy,
 *    sign board. Yard barrier beside it.
 *  - Site (light touch): paved forecourt and side yards, planted beds with
 *    ornamental grasses along the office front, the central planted island with
 *    low pines, a planted strip in the car park, a lawn with the white pergola,
 *    eight ball-shaped trees.
 * Approximations: heights scaled from the frontal ground photos (front width =
 *   OSM 29.8 m); the office depth (17–22 m on the drone homography → 20 m), the
 *   second building's size and position and the site outlines are drone-photo
 *   measurements (± 1–2 m); whether the lettering corner is really taller or only
 *   nearer the camera cannot be separated in the photos; window positions behind
 *   the mesh, the hall's north end, door and rack counts and the canopy steps are
 *   estimates; cars, the transformer kiosk, fences, signs and yard furniture are
 *   omitted. A third dark-grey hall behind the second building (ownership not
 *   documented) and the neighbouring premises are not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

/* ---------------- main dimensions (frame F) ---------------- */
const W = 29.8 // hall / office width (OSM)
const L = 145 // whole complex length (OSM)
const OD = 20 // office depth behind the west part's front
const PROJ = 1.8 // projection of the lettering corner and the loggia
const XL = 12.0 // end of the west part of the front (loggia starts)
const XG = 20.3 // loggia end = west side of the lettering corner
const OFF = 0.3 // mesh in front of the inner wall
const R = 1.2 // rounded corners of the mesh skin
const MESH_Y0 = 0.3
const MESH_A = 8.5 // mesh top, west part
const MESH_B = 9.0 // mesh top, lettering corner and east face
const SCREEN_H = 0.65 // upright part of the silver screen
const FLOOR1 = 4.2
const LOGGIA_TOP = 7.8
/** geo point of the project in frame F (= model origin) */
const GEO = { x: 10.6, z: 2.3 }
/** hall */
const HALL = { z0: -L, z1: -OD, h: 8.1, par: 0.35 }
/** second building (walls) */
const SB = { x0: -32.6, x1: -17.9, z0: -52.4, z1: -14.2, h: 7.3, par: 0.3, mesh: 7.7, off: 0.6, ret: 2.0 }

/* ---------------- path helpers (mesh skins follow a rounded outline) ---------------- */
interface PathPt {
  x: number
  z: number
  nx: number
  nz: number
  u: number
}

/**
 * Polyline through corner points (frame F) with rounded 90° convex corners.
 * The outward normal is (−dz, dx) of the travel direction; r[i] = radius at corner i (0 = sharp).
 */
function roundedPath(c: P2[], r: number[], arcSegs = 8): PathPt[] {
  const pts: PathPt[] = []
  let u = 0
  let prev: PathPt | null = null
  const push = (x: number, z: number, nx: number, nz: number) => {
    if (prev) u += Math.hypot(x - prev.x, z - prev.z)
    prev = { x, z, nx, nz, u }
    pts.push(prev)
  }
  const dir = (a: P2, b: P2): P2 => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
  }
  const nrm = (d: P2): P2 => [-d[1], d[0]]
  for (let i = 0; i < c.length; i++) {
    if (i === 0 || i === c.length - 1) {
      const n = nrm(i === 0 ? dir(c[0], c[1]) : dir(c[i - 1], c[i]))
      push(c[i][0], c[i][1], n[0], n[1])
      continue
    }
    const n1 = nrm(dir(c[i - 1], c[i]))
    const n2 = nrm(dir(c[i], c[i + 1]))
    const ri = r[i] ?? 0
    if (ri <= 0) {
      push(c[i][0], c[i][1], n1[0], n1[1])
      push(c[i][0], c[i][1], n2[0], n2[1])
      continue
    }
    const cx = c[i][0] - ri * (n1[0] + n2[0])
    const cz = c[i][1] - ri * (n1[1] + n2[1])
    const a1 = Math.atan2(n1[1], n1[0])
    let da = Math.atan2(n2[1], n2[0]) - a1
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    for (let k = 0; k <= arcSegs; k++) {
      const a = a1 + (da * k) / arcSegs
      push(cx + Math.cos(a) * ri, cz + Math.sin(a) * ri, Math.cos(a), Math.sin(a))
    }
  }
  return pts
}

const pathLen = (p: PathPt[]) => p[p.length - 1].u

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
    if (q.u - p.u < 1e-9) {
      out.push(q) // zero-length step at a sharp corner: keep the second normal
      continue
    }
    if (p.u >= ua) out.push(p)
    else out.push(lerp(p, q, (ua - p.u) / (q.u - p.u)))
    if (q.u >= ub) {
      out.push(lerp(p, q, (ub - p.u) / (q.u - p.u)))
      return out
    }
  }
  out.push(path[path.length - 1])
  return out
}

/** Point on the path at arc length u. */
const at = (path: PathPt[], u: number) => slice(path, u, u + 1e-4)[0]

/** Arc length of the path point nearest to (x, z). */
function uNear(path: PathPt[], x: number, z: number) {
  let best = Infinity
  let bu = 0
  for (let i = 0; i < path.length - 1; i++) {
    const A = path[i]
    const B = path[i + 1]
    const dx = B.x - A.x
    const dz = B.z - A.z
    const l2 = dx * dx + dz * dz
    if (l2 < 1e-10) continue
    const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (z - A.z) * dz) / l2))
    const d = Math.hypot(A.x + dx * t - x, A.z + dz * t - z)
    if (d < best) {
      best = d
      bu = A.u + (B.u - A.u) * t
    }
  }
  return bu
}

/**
 * Vertical ribbon along path points, offset outwards by `off`, UVs in metres.
 * `split`: one piece per segment, so thin strips (profile joints, rails) are
 * dropped by the far level of detail instead of surviving as one bent piece.
 */
function ribbon(b: Builder, key: string, pts: PathPt[], y0: number, y1: number, off = 0, split = false) {
  if (split) {
    for (let i = 0; i < pts.length - 1; i++) ribbon(b, key, [pts[i], pts[i + 1]], y0, y1, off)
    return
  }
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i]
    const B = pts[i + 1]
    if (Math.hypot(B.x - A.x, B.z - A.z) < 1e-5) continue
    for (const [P, y] of [
      [A, y0],
      [B, y0],
      [B, y1],
      [A, y0],
      [B, y1],
      [A, y1],
    ] as [PathPt, number][]) {
      pos.push(P.x + P.nx * off, y, P.z + P.nz * off)
      nor.push(P.nx, 0, P.nz)
      uv.push(P.u, y)
    }
  }
  if (!pos.length) return
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add(key, g)
}

/** Sloped strip along the path from (off0, y0) to (off1, y1) — screen lips. */
function slope(b: Builder, key: string, pts: PathPt[], off0: number, y0: number, off1: number, y1: number) {
  const pos: number[] = []
  const uv: number[] = []
  const w = Math.hypot(off1 - off0, y1 - y0)
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i]
    const B = pts[i + 1]
    if (Math.hypot(B.x - A.x, B.z - A.z) < 1e-5) continue
    const q = (P: PathPt, o: number, y: number) => pos.push(P.x + P.nx * o, y, P.z + P.nz * o)
    q(A, off0, y0)
    q(B, off0, y0)
    q(B, off1, y1)
    q(A, off0, y0)
    q(B, off1, y1)
    q(A, off1, y1)
    uv.push(A.u, 0, B.u, 0, B.u, w, A.u, 0, B.u, w, A.u, w)
  }
  if (!pos.length) return
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  b.add(key, g)
}

/** Box standing on the path at arc length u (w along the path, d outward). */
function postAt(b: Builder, key: string, path: PathPt[], u: number, y0: number, y1: number, w: number, d: number, off: number) {
  const p = at(path, u)
  const ry = Math.atan2(p.nx, p.nz)
  b.add(key, metricBox(w, y1 - y0, d), mat(p.x + p.nx * off, (y0 + y1) / 2, p.z + p.nz * off, ry))
}

/**
 * Expanded-mesh skin: mesh ribbon on a grid of green profiles. `low` lists
 * [ua, ub, y] ranges where the mesh starts higher (door niches, loggia).
 */
function meshSkin(b: Builder, path: PathPt[], o: { y0: number; top: number; low?: [number, number, number][]; post: number; joint: number }) {
  const len = pathLen(path)
  const low = o.low ?? []
  const cuts = [...new Set([0, len, ...low.flatMap(([ua, ub]) => [ua, ub])])].sort((a, c) => a - c)
  const lowAt = (u: number) => low.find(([ua, ub]) => u > ua && u < ub)?.[2]
  for (let i = 0; i < cuts.length - 1; i++) {
    const ua = cuts[i]
    const ub = cuts[i + 1]
    if (ub - ua < 0.01) continue
    const y0 = lowAt((ua + ub) / 2) ?? o.y0
    const seg = slice(path, ua, ub)
    ribbon(b, 'expMeshGreen', seg, y0, o.top)
    // horizontal joints: thin profile strips just in front of the mesh
    for (let y = o.y0 + o.joint; y < o.top - 0.25; y += o.joint) if (y > y0 + 0.1) ribbon(b, 'greenProfile', seg, y - 0.025, y + 0.025, 0.035, true)
    ribbon(b, 'greenProfile', seg, y0, y0 + 0.06, 0.035, true)
    ribbon(b, 'greenProfile', seg, o.top - 0.06, o.top, 0.035, true)
  }
  // vertical profiles: posts down to the ground (or to the opening head)
  for (let u = 0.04; u < len - 0.02; u += o.post) postAt(b, 'greenProfile', path, u, lowAt(u) ?? 0, o.top, 0.08, 0.1, 0.04)
  for (const u of [0.02, len - 0.02, ...low.flatMap(([ua, ub]) => [ua, ub])]) postAt(b, 'greenProfile', path, u, lowAt(u) ?? 0, o.top, 0.1, 0.12, 0.04)
}

/** Silver expanded-mesh parapet screen: upright part, inward lip, posts and rails. */
function screen(b: Builder, path: PathPt[], y: number, h: number, lip = 0.32, step = 1.45) {
  ribbon(b, 'meshSilver', path, y, y + h)
  slope(b, 'meshSilver', path, 0, y + h, -lip, y + h + 0.24)
  ribbon(b, 'screenFrame', path, y + h - 0.03, y + h + 0.03, 0.02, true)
  ribbon(b, 'screenFrame', path, y + h + 0.2, y + h + 0.26, -lip + 0.02, true)
  const len = pathLen(path)
  for (let u = 0.04; u < len; u += step) postAt(b, 'screenFrame', path, u, y - 0.3, y + h + 0.2, 0.06, 0.06, -0.06)
}

/* ---------------- lettering (one canvas atlas, white letters on transparent) ---------------- */
const ATLAS = { w: 2048, h: 512 }
const LABELS = {
  cm: { r: [8, 8, 2040, 228], text: 'COLOR METAL' },
  shop: { r: [40, 262, 984, 334], text: 'METAL SHOP' },
  off: { r: [1170, 262, 1880, 334], text: 'OFFICES' },
  div1: { r: [60, 372, 1988, 436], text: 'DIVIZIA  SOLUȚII' },
  div2: { r: [60, 446, 1988, 506], text: 'ARHITECTURALE' },
} satisfies Record<string, { r: [number, number, number, number]; text: string }>
type LabelKey = keyof typeof LABELS

let atlasCanvas: HTMLCanvasElement | null = null
/** Lettering atlas drawn once with a system sans-serif (no external font files). */
function labelCanvas() {
  if (atlasCanvas) return atlasCanvas
  const c = document.createElement('canvas')
  c.width = ATLAS.w
  c.height = ATLAS.h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'alphabetic'
  for (const { r, text } of Object.values(LABELS)) {
    const [x0, y0, x1, y1] = r
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.font = `bold ${Math.round((y1 - y0) * 1.3)}px "Arial Black", "Segoe UI", Arial, sans-serif`
    const m = ctx.measureText(text)
    const asc = m.actualBoundingBoxAscent
    const desc = Math.max(0, m.actualBoundingBoxDescent)
    const tw = m.actualBoundingBoxRight + m.actualBoundingBoxLeft
    const sx = (x1 - x0) / tw
    const sy = (y1 - y0) / (asc + desc)
    ctx.setTransform(sx, 0, 0, sy, x0 + m.actualBoundingBoxLeft * sx, y0 + asc * sy)
    ctx.fillText(text, 0, 0)
  }
  atlasCanvas = c
  return c
}

/** Text plane (w × h m) facing +Z of `m`, UVs on the atlas region of `key`. */
function label(b: Builder, key: LabelKey, w: number, h: number, m: THREE.Matrix4) {
  const g = new THREE.PlaneGeometry(w, h)
  const [x0, y0, x1, y1] = LABELS[key].r
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    uv.setXY(i, (x0 + u * (x1 - x0)) / ATLAS.w, 1 - (y1 - v * (y1 - y0)) / ATLAS.h)
  }
  b.add('letters', g, m)
}

/* ---------------- small helpers ---------------- */
type Face = '+z' | '-z' | '+x' | '-x'

/** Framed glazing (window / door unit) on a wall plane; a..c along the wall (world x for ±z, world z for ±x). */
function glazing(b: Builder, face: Face, plane: number, a: number, c: number, y0: number, y1: number, bars: number, glass = 'hqWin', frame = 'frameDark') {
  const w = Math.abs(c - a)
  const h = y1 - y0
  const mid = (a + c) / 2
  const ry = face === '+z' ? 0 : face === '-z' ? Math.PI : face === '+x' ? Math.PI / 2 : -Math.PI / 2
  const n = face === '+z' || face === '+x' ? 1 : -1
  const m = face.endsWith('z') ? mat(mid, (y0 + y1) / 2, plane + n * 0.02, ry) : mat(plane + n * 0.02, (y0 + y1) / 2, mid, ry)
  b.add(glass, new THREE.PlaneGeometry(w, h), m)
  const fm = (lx: number, ly: number, sw: number, sh: number) => b.add(frame, metricBox(sw, sh, 0.06), new THREE.Matrix4().multiplyMatrices(m, mat(lx, ly, 0.02)))
  fm(0, h / 2, w + 0.08, 0.07)
  fm(0, -h / 2, w + 0.08, 0.07)
  for (let i = 0; i <= bars; i++) fm(-w / 2 + (i * w) / bars, 0, 0.06, h)
}

/** Plane whose UVs are in metres (tiling textures keep their real size). */
function metricPlane(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h)
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h)
  return g
}

/** Ball-shaped tree. */
function ballTree(b: Builder, x: number, z: number, r = 1.05, trunk = 2.1) {
  b.rod('trunk', V(x, 0, z), V(x, trunk + 0.3, z), 0.07, 6)
  b.add('treeGreen', new THREE.SphereGeometry(r, 10, 7), mat(x, trunk + r * 0.85, z, 0, 0, 0, 1, 0.92, 1))
}

/* ======================================================================= */

function office(b: Builder) {
  const ihx0 = OFF
  const ihx1 = W - OFF
  const ri = R - OFF
  const arc = (cx: number, cz: number, a0: number, a1: number, n = 6): P2[] => {
    const out: P2[] = []
    for (let i = 0; i <= n; i++) out.push([cx + Math.cos(a0 + ((a1 - a0) * i) / n) * ri, cz + Math.sin(a0 + ((a1 - a0) * i) / n) * ri])
    return out
  }

  /* ---------- inner volume (dark wall, roof) ---------- */
  const inner: P2[] = [[ihx0, -OD], ...arc(R, -R, Math.PI, Math.PI / 2), [XG + OFF, -OFF], [XG + OFF, PROJ - OFF], ...arc(W - R, PROJ - R, Math.PI / 2, 0), [ihx1, -OD]]
  prismOutline(b, 'innerDark', inner, 0, MESH_A)
  prismOutline(b, 'roofMembrane', inner, MESH_A, 0.05)
  // roof: walkway bands, round skylight domes, one square rooflight
  b.block('roofBand', 0.6, 0.02, OD - 4, W - 3.2, MESH_A + 0.05, -OD / 2 - 0.5)
  b.block('roofBand', W - 6, 0.02, 0.6, W / 2, MESH_A + 0.05, -3.4)
  for (const [x, z] of [
    [6, -14.5],
    [9.5, -14.5],
    [13, -14.5],
    [16.5, -14.5],
    [16, -9],
    [19.5, -9],
    [23, -9],
  ] as P2[])
    b.add('skylight', new THREE.SphereGeometry(0.45, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(x, MESH_A + 0.05, z, 0, 0, 0, 1, 0.6, 1))
  b.block('skylight', 1.3, 0.3, 1.3, 22.5, MESH_A + 0.05, -3.2)

  /* ---------- windows behind the mesh ---------- */
  for (const [a, c] of [
    [2.4, 5.1],
    [6.6, 9.5],
  ] as P2[]) {
    glazing(b, '+z', -OFF, a, c, 4.9, 6.7, 2)
    glazing(b, '+z', -OFF, a, c, 0.9, 2.6, 2)
  }
  for (const [a, c] of [
    [21.6, 24.6],
    [25.3, 28.1],
  ] as P2[]) {
    glazing(b, '+z', PROJ - OFF, a, c, 4.9, 6.7, 2)
    glazing(b, '+z', PROJ - OFF, a, c, 0.9, 2.6, 2)
  }
  for (const [a, c, gf] of [
    [-3.2, -5.9, true],
    [-8.6, -11.6, true],
    [-13.8, -15.8, false],
  ] as [number, number, boolean][]) {
    glazing(b, '-x', ihx0, a, c, 4.9, 6.7, 2)
    if (gf) glazing(b, '-x', ihx0, a, c, 0.9, 2.6, 2)
  }
  for (const [a, c, gf] of [
    [0.4, -2.4, true],
    [-4.0, -6.4, false],
    [-8.0, -11.6, false],
    [-13.6, -16.6, true],
  ] as [number, number, boolean][]) {
    glazing(b, '+x', ihx1, a, c, 4.9, 6.7, 2)
    if (gf) glazing(b, '+x', ihx1, a, c, 0.9, 2.6, 2)
  }

  /* ---------- side niches (grey render, door, green sheet canopy) ---------- */
  const niche = (side: -1 | 1, z0: number, z1: number, h: number, win: boolean) => {
    const xw = side < 0 ? ihx0 : ihx1
    const xo = side < 0 ? 0 : W
    const zc = (z0 + z1) / 2
    const face: Face = side < 0 ? '-x' : '+x'
    b.block('renderGrey', 0.06, h, z1 - z0, xw + side * 0.03, 0, zc)
    glazing(b, face, xw + side * 0.06, zc - 0.55, zc + 0.55, 0, 2.3, 1, 'glassC', 'frameGrey')
    if (win) glazing(b, face, xw + side * 0.06, z0 + 0.5, z0 + 1.8, 0.9, 2.4, 1, 'glassC', 'frameGrey')
    const cy = h + 0.08
    const out = xo + side * 1.3
    facet(b, 'greenSheet', [V(out, cy, z0 - 0.3), V(out, cy, z1 + 0.3), V(xo, cy + 0.2, z1 + 0.3), V(xo, cy + 0.2, z0 - 0.3)], { thickness: 0.06 })
    b.block('greenSheet', 0.08, 0.36, z1 - z0 + 0.6, out, cy - 0.28, zc)
  }
  niche(-1, -19.6, -16.6, 3.2, false)
  niche(1, -12.4, -7.0, 3.4, true)

  /* ---------- entrance loggia ---------- */
  {
    const x0 = XL
    const x1 = XG
    const zb = -OFF + 0.04 // render back wall
    const zfr = PROJ // front plane of the bronze frame
    const dep = zfr - zb
    const zc = (zb + zfr) / 2
    const xm = (x0 + x1) / 2
    b.block('renderGrey', x1 - x0, LOGGIA_TOP - 0.8, 0.06, xm, 0, zb)
    // corner pillar with a gilt top
    b.block('hqBronze', 0.55, 6.55, 0.55, x0 + 0.275, 0, zfr - 0.275)
    b.block('gilt', 0.57, 0.45, 0.57, x0 + 0.275, 6.55, zfr - 0.275)
    for (let y = 0.9; y < 6.5; y += 0.9) b.block('bronzeDark', 0.57, 0.025, 0.57, x0 + 0.275, y, zfr - 0.275)
    // roof box and balcony slab: bronze-clad boxes with timber soffits
    b.block('hqBronze', x1 - x0, 0.8, dep, xm, LOGGIA_TOP - 0.8, zc)
    b.block('timber', x1 - x0 - 0.1, 0.04, dep - 0.1, xm, LOGGIA_TOP - 0.83, zc)
    b.block('hqBronze', x1 - x0, 0.8, dep, xm, FLOOR1 - 0.8, zc)
    b.block('timber', x1 - x0 - 0.1, 0.04, dep - 0.1, xm, FLOOR1 - 0.83, zc)
    // vertical panel joints of the bronze cladding
    for (let x = x0 + 0.6; x < x1 - 0.1; x += 0.6) {
      b.block('bronzeDark', 0.025, 0.8, 0.02, x, LOGGIA_TOP - 0.8, zfr + 0.005)
      b.block('bronzeDark', 0.025, 0.8, 0.02, x, FLOOR1 - 0.8, zfr + 0.005)
    }
    // green-mesh balustrade with a top rail
    b.add('expMeshGreen', metricPlane(x1 - x0 - 0.6, 1.0), mat(xm + 0.28, FLOOR1 + 0.55, zfr - 0.2))
    b.add('expMeshGreen', metricPlane(dep - 0.7, 1.0), mat(x0 + 0.2, FLOOR1 + 0.55, zb + (dep - 0.7) / 2 + 0.05, Math.PI / 2))
    b.block('frameGrey', x1 - x0 - 0.55, 0.05, 0.06, xm + 0.27, FLOOR1 + 1.05, zfr - 0.2)
    b.block('frameGrey', 0.06, 0.05, dep - 0.6, x0 + 0.2, FLOOR1 + 1.05, zb + (dep - 0.6) / 2)
    // ground floor: two glazed entrances under dark sign fascias; first-floor glazed walls
    for (const [a, c, key] of [
      [12.7, 15.9, 'shop'],
      [16.5, 19.7, 'off'],
    ] as [number, number, LabelKey][]) {
      glazing(b, '+z', zb + 0.03, a, c, 0, 2.6, 3, 'glassC', 'frameDark')
      b.block('frameDark', c - a + 0.1, 0.4, 0.08, (a + c) / 2, 2.62, zb + 0.07)
      label(b, key, (c - a) * 0.62, 0.17, mat((a + c) / 2, 2.82, zb + 0.115))
      glazing(b, '+z', zb + 0.03, a, c, FLOOR1 + 0.05, 6.75, 3, 'glassC', 'frameDark')
    }
    // closing return of the west part's mesh beside the loggia
    b.block('greenProfile', 0.1, LOGGIA_TOP - 0.8, OFF, x0 + 0.05, 0, -OFF / 2)
  }

  /* ---------- green expanded-mesh skin ---------- */
  // west face + west part of the front (continued above the loggia roof)
  const pathA = roundedPath(
    [
      [0, -OD],
      [0, 0],
      [XG, 0],
    ],
    [0, R, 0],
  )
  // lettering corner: its west return, its front and the east face
  const pathB = roundedPath(
    [
      [XG, 0],
      [XG, PROJ],
      [W, PROJ],
      [W, -OD],
    ],
    [0, 0.25, R, 0],
  )
  meshSkin(b, pathA, {
    y0: MESH_Y0,
    top: MESH_A,
    low: [
      [uNear(pathA, 0, -19.6), uNear(pathA, 0, -16.6), 3.2],
      [uNear(pathA, XL, 0), pathLen(pathA), LOGGIA_TOP],
    ],
    post: 1.45,
    joint: 0.95,
  })
  meshSkin(b, pathB, { y0: MESH_Y0, top: MESH_B, low: [[uNear(pathB, W, -7.0), uNear(pathB, W, -12.4), 3.4]], post: 1.45, joint: 0.95 })

  /* ---------- silver roof screen all round (the lettering corner's one higher) ---------- */
  screen(
    b,
    roundedPath(
      [
        [XG, -OD],
        [0, -OD],
        [0, 0],
        [XG, 0],
      ],
      [0, 0, R, 0],
    ),
    MESH_A,
    SCREEN_H,
  )
  screen(
    b,
    roundedPath(
      [
        [XG, 0],
        [XG, PROJ],
        [W, PROJ],
        [W, -OD],
        [XG, -OD],
      ],
      [0, 0.25, R, 0, 0],
    ),
    MESH_B,
    SCREEN_H,
  )

  /* ---------- lettering ---------- */
  label(b, 'cm', 8.1, 0.78, mat((XG + W) / 2 + 0.1, 8.33, PROJ + 0.09))
  label(b, 'cm', 7.6, 0.72, mat(-0.09, 7.7, -5.4, -Math.PI / 2))
}

function hall(b: Builder) {
  const { z0, z1, h, par } = HALL
  const x0 = 0.1
  const x1 = W - 0.1
  const len = z1 - z0
  const zc = (z0 + z1) / 2
  b.block('hallGrey', x1 - x0, h, len, W / 2, 0, zc)
  // parapet and coping (the south end abuts the office)
  for (const [w, d, x, z] of [
    [x1 - x0, 0.3, W / 2, z0 + 0.15],
    [0.3, len, x0 + 0.15, zc],
    [0.3, len, x1 - 0.15, zc],
  ] as [number, number, number, number][]) {
    b.block('hallGrey', w, par, d, x, h, z)
    b.block('coping', w + 0.06, 0.05, d + 0.06, x, h + par, z)
  }
  b.block('roofMembrane', x1 - x0 - 0.6, 0.04, len - 0.4, W / 2, h, zc - 0.1)
  // walkway bands and the PV field on the north third (drone photo DJI_0556)
  b.block('roofBand', 0.6, 0.02, len - 3, 26.9, h + 0.04, zc)
  b.block('roofBand', W - 4, 0.02, 0.6, W / 2, h + 0.04, -90)
  for (let i = 0; i < 4; i++) {
    const x = 1.2 + i * 3.05 + 1.4
    b.add('pv', metricBox(2.8, 0.08, 48), mat(x, h + 0.32, -116, 0, 0, -0.17))
    for (let z = -140; z <= -92; z += 6) b.block('frameGrey', 0.06, 0.32, 0.06, x, h, z)
  }

  // panel joints (horizontal), pilaster joints (vertical) and the upper window band on both long walls
  for (const [x, s] of [
    [x0, -1],
    [x1, 1],
  ] as [number, number][]) {
    for (const y of [2.0, 3.1, 5.2, 7.3]) b.block('hallJoint', 0.03, 0.04, len, x + s * 0.01, y, zc)
    for (let z = z1 - 6; z > z0 + 1; z -= 6) b.block('hallJoint', 0.03, h, 0.05, x + s * 0.01, 0, z)
    for (let z = z1 - 3.5; z > z0 + 3; z -= 6) glazing(b, s < 0 ? '-x' : '+x', x, z + 0.75, z - 0.75, 5.8, 6.8, 1, 'glassC', 'frameGrey')
  }
  // north end: joints, a dock door and a personnel door
  b.block('hallJoint', W - 0.2, 0.04, 0.03, W / 2, 5.2, z0 - 0.01)
  b.add('shutterGrey', new THREE.PlaneGeometry(5, 4.6), mat(W / 2, 2.3, z0 - 0.02, Math.PI))
  b.add('frameDark', new THREE.PlaneGeometry(1.1, 2.2), mat(6, 1.1, z0 - 0.02, Math.PI))

  /* ---------- loading-dock canopies (green fascias) ---------- */
  const canopy = (side: -1 | 1, za: number, zb: number, depth: number, y: number) => {
    const xw = side < 0 ? x0 : x1
    const xo = xw + side * depth
    const zm = (za + zb) / 2
    b.block('canopyTop', depth, 0.18, zb - za, xw + (side * depth) / 2, y, zm)
    b.block('greenSheet', 0.12, 0.55, zb - za + 0.12, xo + side * 0.06, y - 0.12, zm)
    for (const z of [za, zb]) b.block('greenSheet', depth, 0.55, 0.1, xw + (side * depth) / 2, y - 0.12, z)
    for (let z = za + 0.3; z < zb; z += 7.5) b.block('frameGrey', 0.16, y, 0.16, xo - side * 0.15, 0, z)
  }
  // west (yard) side: narrower near the office, a wider middle third
  canopy(-1, -51, -21, 4.0, 4.6)
  canopy(-1, -80, -51, 5.5, 4.6)
  canopy(-1, -142, -80, 4.0, 4.6)
  // east side
  canopy(1, -142, -24, 3.6, 4.4)
  // sectional dock doors under the canopies
  for (let z = -27; z > -140; z -= 12) b.add('shutterGrey', new THREE.PlaneGeometry(3.8, 4.1), mat(x0 - 0.02, 2.05, z, -Math.PI / 2))
  for (let z = -33; z > -140; z -= 15) b.add('shutterGrey', new THREE.PlaneGeometry(3.8, 4.0), mat(x1 + 0.02, 2.0, z, Math.PI / 2))
  // cantilever racks with stock under the west canopy (drone photos)
  for (const [z, l] of [
    [-37, 6],
    [-60, 8],
    [-71, 6],
    [-98, 7],
    [-116, 7],
  ] as P2[])
    b.block('rack', 1.4, 3.2, l, x0 - 1.3, 0, z)
}

function secondBuilding(b: Builder) {
  const { x0, x1, z0, z1, h, par } = SB
  const xc = (x0 + x1) / 2
  const zc = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  b.block('darkPanel', w, h, d, xc, 0, zc)
  b.block('concrete', w + 0.06, 0.45, d + 0.06, xc, 0, zc)
  for (const [ww, dd, x, z] of [
    [w, 0.3, xc, z0 + 0.15],
    [w, 0.3, xc, z1 - 0.15],
    [0.3, d, x0 + 0.15, zc],
    [0.3, d, x1 - 0.15, zc],
  ] as [number, number, number, number][]) {
    b.block('darkPanel', ww, par, dd, x, h, z)
    b.block('coping', ww + 0.06, 0.05, dd + 0.06, x, h + par, z)
  }
  b.block('roofMembrane', w - 0.6, 0.04, d - 0.6, xc, h, zc)
  b.block('roofBand', 0.6, 0.02, d - 1.5, x1 - 4.2, h + 0.04, zc)
  b.block('roofBand', w - 1.5, 0.02, 0.6, xc, h + 0.04, zc + 2)
  // panel joints and window rows on the long sides
  for (const [x, s] of [
    [x0, -1],
    [x1, 1],
  ] as [number, number][]) {
    const face: Face = s < 0 ? '-x' : '+x'
    b.block('panelJoint', 0.03, 0.04, d, x + s * 0.01, 3.9, zc)
    for (let z = z1 - 4.3; z > z0 + 1; z -= 4.3) b.block('panelJoint', 0.03, h - 0.45, 0.05, x + s * 0.01, 0.45, z)
    for (let z = z1 - 3; z > z0 + 2; z -= 4.3) glazing(b, face, x, z + 0.55, z - 0.55, 4.6, 5.85, 1, 'glassC', 'frameGrey')
  }
  for (const z of [-17.2, -19.6]) glazing(b, '+x', x1, z + 0.5, z - 0.5, 0.9, 2.5, 1, 'glassC', 'frameGrey')
  b.add('shutterGrey', new THREE.PlaneGeometry(3.2, 4.2), mat(x1 + 0.02, 2.55, -40, Math.PI / 2))
  glazing(b, '+x', x1, -35.6, -36.6, 0, 2.3, 1, 'frameDark', 'frameGrey')
  glazing(b, '-z', z0, xc + 1, xc - 0.1, 0, 2.3, 1, 'frameDark', 'frameGrey')

  // street end behind the mesh: windows and the glazed entrance
  for (const [a, c] of [
    [-31.3, -29.0],
    [-27.0, -24.0],
    [-22.6, -19.3],
  ] as P2[])
    glazing(b, '+z', z1, a, c, 4.4, 5.8, 2)
  for (const [a, c] of [
    [-31.3, -29.0],
    [-21.6, -19.3],
  ] as P2[])
    glazing(b, '+z', z1, a, c, 1.0, 2.4, 2)
  glazing(b, '+z', z1, -27.0, -24.6, 0, 2.7, 2, 'glassC', 'frameDark')
  // green corrugated canopy over the entrance (through the mesh)
  const zf = z1 + SB.off
  b.block('greenSheet', 5.4, 0.6, 2.4, -26.0, 2.95, z1 + 1.2)
  for (let x = -28.6; x < -23.3; x += 0.25) b.block('greenSheet', 0.04, 0.6, 0.05, x, 2.95, z1 + 2.42)
  // sign board on the mesh
  b.block('signBoard', 1.45, 0.92, 0.03, -23.6, 1.7, zf + 0.06)
  label(b, 'div1', 1.15, 0.14, mat(-23.6, 2.28, zf + 0.085))
  label(b, 'div2', 1.15, 0.13, mat(-23.6, 2.08, zf + 0.085))

  // mesh skin on the street end with returns along both sides; silver screen with a chamfered top
  const path = roundedPath(
    [
      [x0 - 0.4, z1 - SB.ret],
      [x0 - 0.4, zf],
      [x1 + 0.4, zf],
      [x1 + 0.4, z1 - SB.ret],
    ],
    [0, 0.5, 0.5, 0],
    6,
  )
  meshSkin(b, path, { y0: 0.35, top: SB.mesh, post: 1.6, joint: 1.25 })
  screen(b, path, SB.mesh, 0.6, 0.38, 1.6)
}

function site(b: Builder) {
  // paving: forecourt, west yard (between the second building and the hall), east yard
  b.block('hqPaving', 76, 0.06, 44, 4, -0.04, 8)
  b.block('hqPaving', 18.2, 0.06, 132, -8.9, -0.04, -80)
  b.block('hqPaving', 11.8, 0.06, 132, 35.6, -0.04, -80)
  const bed = (outline: P2[], h = 0.1) => prismOutline(b, 'hqLawn', outline, 0, h)
  const rect = (xa: number, za: number, xb: number, zb: number): P2[] => [
    [xa, za],
    [xb, za],
    [xb, zb],
    [xa, zb],
  ]
  // planted beds with ornamental grasses along the office front
  const tufts = (xa: number, xb: number, z0: number, z1: number, n: number, rows = 2) => {
    for (let i = 0; i < n; i++)
      for (let r = 0; r < rows; r++) {
        const x = xa + ((i + 0.5 + (r % 2) * 0.5) / n) * (xb - xa)
        if (x > xb - 0.2) continue
        const z = z0 + ((r + 0.5) / rows) * (z1 - z0)
        const s = 0.85 + 0.15 * Math.sin(i * 2.3 + r)
        b.add('grassTuft', new THREE.SphereGeometry(0.5, 7, 5), mat(x, 0.42 * s, z, i, 0, 0, 0.8 * s, 1.15 * s, 0.7))
      }
  }
  bed(rect(0.3, 0.3, 11.8, 2.6))
  b.block('grassTuft', 11.0, 0.55, 1.3, 6.05, 0.1, 1.45)
  tufts(0.5, 11.6, 0.6, 2.3, 16)
  bed(rect(20.6, 2.1, 29.7, 4.0))
  b.block('grassTuft', 8.6, 0.55, 1.1, 25.15, 0.1, 3.05)
  tufts(20.8, 29.5, 2.3, 3.8, 12)
  // central planted island (drone outline) with low pines
  bed(
    [
      [2.5, 12.2],
      [27.2, 8.9],
      [29.2, 10.9],
      [18.6, 24.0],
      [11.5, 24.2],
      [5.2, 19.6],
    ],
    0.14,
  )
  // dense low pines in the front part of the island (photo 3.jpg)
  const inPines = (x: number, z: number) => z > 11.6 - (x - 6) * 0.13 && z < 18.2 - (x - 9) * 0.15 && x > 6 && x < 24.5 - (z - 11) * 0.7
  for (let x = 6.4; x < 24.5; x += 1.1)
    for (let z = 11.0; z < 18.5; z += 1.0) {
      const jx = x + 0.35 * Math.sin(z * 3.1)
      const jz = z + 0.3 * Math.sin(x * 2.7)
      if (!inPines(jx, jz)) continue
      const s = 0.95 + 0.12 * Math.sin(x * 1.7 + z)
      // < 1.3 m wide, so the far level of detail drops them
      b.add('shrub', new THREE.SphereGeometry(0.6, 7, 4), mat(jx, 0.26, jz, x + z, 0, 0, s, 0.7, s * 0.9))
    }
  // planted strip in the car park, bed in front of the second building, lawn with the pergola
  bed(rect(-27, 19.6, -6, 22), 0.12)
  for (let x = -25; x < -7; x += 3) b.add('shrub', new THREE.SphereGeometry(0.6, 7, 5), mat(x, 0.25, 20.8, x, 0, 0, 1.05, 0.6, 0.9))
  bed(rect(-33, -13.2, -27.6, -10.8))
  bed(rect(34.5, 6, 41.5, 29.5), 0.08)
  // white pergola (bicycle shelter)
  b.block('white', 3.4, 0.16, 8.4, 38.9, 2.55, 16.8)
  for (const x of [37.5, 40.3]) for (const z of [13, 20.6]) b.block('white', 0.12, 2.55, 0.12, x, 0, z)
  // ball-shaped trees
  for (const [x, z] of [
    [9.0, 5.2],
    [23.8, 6.9],
    [13.5, 22.3],
    [21.5, 19.0],
    [33.8, 5.0],
    [36.4, 27.2],
    [-11.5, 20.8],
    [-21.5, 20.8],
  ] as P2[])
    ballTree(b, x, z)
  // yard barrier beside the second building
  b.block('barrier', 0.35, 1.05, 0.3, -10.8, 0, -13.4)
  b.beam('white', V(-10.9, 0.95, -13.4), V(-17.2, 0.95, -13.4), 0.08, 0.08)
}

function build(): Builder {
  const out = new Builder()
  const b = new Builder()
  office(b)
  hall(b)
  secondBuilding(b)
  site(b)
  // frame F → model frame (origin = the project's geo point)
  return out.merge(b, mat(-GEO.x, 0, -GEO.z))
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [6 - GEO.x, 5, -GEO.z],
  materials: (base) => {
    // green expanded aluminium as photographed (deep emerald); the palette's diamond alpha is kept
    const green = (base.expMeshGreen as THREE.MeshStandardMaterial).clone()
    green.map = null
    green.color.set('#156448')
    green.metalness = 0.25
    green.roughness = 0.6
    green.envMapIntensity = 0.6
    green.userData.noCast = true
    // silver expanded mesh of the roof screens
    const silver = (base.expMesh as THREE.MeshStandardMaterial).clone()
    silver.map = null
    silver.color.set('#8d9498')
    silver.metalness = 0.5
    silver.roughness = 0.45
    silver.envMapIntensity = 0.8
    silver.userData.noCast = true
    // lettering atlas
    const tex = new THREE.CanvasTexture(labelCanvas())
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const letters = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, transparent: true, alphaTest: 0.02, depthWrite: false, roughness: 0.45, metalness: 0.05, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 })
    letters.userData.noCast = true
    const std = (color: string, roughness = 0.85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    return {
      expMeshGreen: green,
      meshSilver: silver,
      letters,
      innerDark: std('#13302a', 0.85),
      hqWin: std('#2a3c42', 0.2, 0.5),
      roofMembrane: std('#d9d9d4', 0.9),
      roofBand: std('#9ea1a3', 0.9),
      coping: std('#a9adb0', 0.5, 0.6),
      screenFrame: std('#9ca2a6', 0.45, 0.55),
      renderGrey: std('#b3ada3', 0.9),
      greenProfile: std('#135a40', 0.5, 0.35),
      greenSheet: std('#1f7d55', 0.45, 0.4),
      frameDark: std('#2b2e31', 0.5, 0.3),
      frameGrey: std('#5b6066', 0.5, 0.3),
      hqBronze: std('#8a6d45', 0.38, 0.65),
      bronzeDark: std('#5e4628', 0.45, 0.5),
      hallGrey: std('#656d73', 0.7, 0.25),
      hallJoint: std('#474c52', 0.7, 0.2),
      darkPanel: std('#43494f', 0.65, 0.25),
      panelJoint: std('#2c3035', 0.7, 0.2),
      canopyTop: std('#8b9094', 0.7, 0.3),
      shutterGrey: std('#6b7076', 0.55, 0.35),
      rack: std('#3f5f86', 0.6, 0.3),
      pv: std('#24324a', 0.3, 0.45),
      signBoard: std('#2f3033', 0.6),
      barrier: std('#e2a321', 0.5),
      hqPaving: std('#bdb5a6', 0.95),
      hqLawn: std('#5e7d43', 1),
      grassTuft: std('#9b9a52', 0.95),
      shrub: std('#2e5530', 0.95),
      treeGreen: std('#557f3c', 0.95),
      trunk: std('#5a4636', 0.9),
    }
  },
  notes:
    'Whole headquarters site: the office block in green expanded aluminium with the bronze loggia and the lettering, the 145 m warehouse hall with its dock canopies and PV field, the second building with its green-mesh street end, and a light paved site. Measured from COLOR METAL drone and ground photos on the OSM outline; heights and hidden details estimated.',
}
export default model
