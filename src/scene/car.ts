/**
 * COLOR METAL flatbed pickup ("platós autó") for the drive-around mode, true scale
 * (5.94 × 2.07 m, 1.92 m to the roof, 3.55 m wheelbase): sculpted single cab in graphite
 * clearcoat with brass accents (belt-line trim, grille bars, handles, mirror caps, rims,
 * bed rails), dark grille and LED lights, chunky all-terrain tyres, and a long aluminium
 * flat bed — diamond-plate deck, low drop-sides and tailgate with brass top rails, a
 * headache rack behind the cab, tie-down rails and under-bed toolboxes. The COLOR METAL
 * wordmark sits on both doors and on the tailgate.
 *
 * The bed carries a loose load of copper, aluminium and titanium-zinc stock (tubes, rods,
 * bars, profiles, sheets, standing-seam offcuts, a strapped copper coil). With `dyn` passed
 * to `update`, every piece is a small rigid body in the bed plane: it feels the truck's
 * acceleration, centrifugal / Euler / Coriolis terms of the yaw motion, static and kinetic
 * friction (round stock rolls sideways far more easily than it slides lengthwise), knocks
 * against the drop-sides, headboard and tailgate, pushes the other pieces, hops on hard
 * knocks and rattles at speed. The sprung body also pitches and rolls a little.
 *
 * Local frame: +Z = forward, +X = the truck's LEFT side, +Y up, origin = centre of the
 * footprint on the ground (the tyres touch y = 0).
 */
import * as THREE from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { logoTexture } from './figure'

/** Motion of the truck body this frame, expressed in the truck's own frame (+Z forward, +X left). */
export interface CarDynamics {
  /** longitudinal acceleration, m/s², + = speeding up forward (d vForward / dt in the car frame) */
  aLong: number
  /**
   * lateral acceleration, m/s², + = towards the truck's left (+X): the change of the car-frame
   * lateral velocity (d vLateral / dt). The centripetal part of a turn (yawRate × speed) is
   * added internally, so do not include it here.
   */
  aLat: number
  /** rad/s, + = turning left (counter-clockwise seen from above) */
  yawRate: number
  /** m/s, signed forward speed */
  speed: number
  /** s (≤ 0.05; larger values are clamped) */
  dt: number
  /**
   * optional: magnitude (m/s) of a sudden velocity change from a collision this frame. The load
   * surges opposite to this frame's (aLat, aLong) when that is large (the crash spike), otherwise
   * in the direction of travel. Accelerations are clamped to 16 m/s², so spikes are harmless.
   */
  impact?: number
}

export interface Car {
  root: THREE.Group
  /** steer (rad, + = left), wheel spin angle (rad about the axle), brake lights, optional body / cargo dynamics */
  update: (steer: number, spin: number, braking: boolean, dyn?: CarDynamics) => void
  /** puts every cargo piece back where it was loaded */
  resetCargo: () => void
  dispose: () => void
}

// ------------------------------------------------------------------------------------------
// dimensions (metres)
// ------------------------------------------------------------------------------------------
const FA = 1.95 // front axle z
const RA = -1.6 // rear axle z
const WHEEL_R = 0.4
const TRACK = 0.85 // half track (wheel centre x)
const CAB_HW = 0.97 // half width of the cab body
const GH_HW = 0.9 // half width of the greenhouse
const BED_HW = 1.01 // half width of the deck
const DECK_Y = 1.05 // top of the deck
const SIDE_H = 0.32 // drop-side height
const TOP = DECK_Y + SIDE_H
const X_IN = 0.975 // inner faces of the drop-sides
const Z_FRONT = -0.2 // inner face of the headboard (headache rack)
const Z_REAR = -2.905 // inner face of the tailgate
const PIV_Y = 0.55 // pitch / roll pivot height of the sprung body

export const CAR_DIMS: {
  length: number
  width: number
  wheelbase: number
  wheelR: number
  frontAxleZ: number
  rearAxleZ: number
  trackHalf: number
} = {
  length: 5.94, // z from -2.965 (tail lamps) to +2.973 (grille badge)
  width: 2.07, // bed incl. stake posts; the mirrors reach x = ±1.2
  wheelbase: 3.55,
  wheelR: WHEEL_R,
  frontAxleZ: FA,
  rearAxleZ: RA,
  trackHalf: TRACK,
}

/** Cargo space of the bed in the truck frame (the deck top is at y = deckY). */
export const CAR_BED = { xIn: X_IN, zFront: Z_FRONT, zRear: Z_REAR, deckY: DECK_Y, sideTop: TOP }

/** Driver's eye point (left-hand drive) for a cockpit camera. */
export const CAR_EYE = { x: 0.42, y: 1.62, z: 0.3 }

// ------------------------------------------------------------------------------------------
// geometry helpers
// ------------------------------------------------------------------------------------------
type P2 = [number, number]

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P2[] {
  const out: P2[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return out
}

function cleanPts(pts: P2[]) {
  const out: THREE.Vector2[] = []
  for (const [a, b] of pts) {
    const v = new THREE.Vector2(a, b)
    if (out.length && out[out.length - 1].distanceTo(v) < 1e-5) continue
    out.push(v)
  }
  if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) < 1e-5) out.pop()
  return out
}

function polyShape(pts: P2[], holes: P2[][] = []) {
  const s = new THREE.Shape(cleanPts(pts))
  for (const h of holes) s.holes.push(new THREE.Path(cleanPts(h)))
  return s
}

function roundRectPts(w: number, h: number, r: number, cx = 0, cy = 0): P2[] {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - h / 2
  const y1 = cy + h / 2
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4)
  if (r <= 1e-4)
    return [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]
  return [
    ...arcPts(x1 - r, y0 + r, r, -Math.PI / 2, 0, 3),
    ...arcPts(x1 - r, y1 - r, r, 0, Math.PI / 2, 3),
    ...arcPts(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, 3),
    ...arcPts(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, 3),
  ]
}

/** convex polygon (CCW) of circle centres, offset outwards by r — a strap or band outline */
function hullPts(c: P2[], r: number, n = 5): P2[] {
  const out: P2[] = []
  const N = c.length
  for (let i = 0; i < N; i++) {
    const p = c[(i + N - 1) % N]
    const q = c[i]
    const s = c[(i + 1) % N]
    // outward normal of a CCW edge (dx, dy) is (dy, -dx)
    const a0 = Math.atan2(-(q[0] - p[0]), q[1] - p[1])
    let a1 = Math.atan2(-(s[0] - q[0]), s[1] - q[1])
    while (a1 < a0) a1 += Math.PI * 2
    out.push(...arcPts(q[0], q[1], r, a0, a1, n))
  }
  return out
}

/** smooth normals except across creases; scaled up first because the helper hashes positions on a 1 cm grid */
function creased(g: THREE.BufferGeometry, angle = 0.6) {
  g.scale(100, 100, 100)
  const s = toCreasedNormals(g, angle)
  if (s !== g) g.dispose()
  s.scale(0.01, 0.01, 0.01)
  return s
}

/** side profile (z, y) extruded across x0..x1; with a bevel the profile stays the true silhouette */
function sideExtrude(shape: THREE.Shape, x0: number, x1: number, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, x1 - x0 - 2 * bevel),
    steps: 1,
    curveSegments: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
  })
  g.rotateY(-Math.PI / 2).translate(x1 - bevel, 0, 0)
  return creased(g)
}

/** cross-section (x, y) extruded along z, centred on z = 0 */
function lengthExtrude(shape: THREE.Shape, len: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, steps: 1, curveSegments: 1, bevelEnabled: false })
  g.translate(0, 0, -len / 2)
  return creased(g, 0.7)
}

function prep(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g
  if (n !== g) g.dispose()
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k)
  if (!n.getAttribute('normal')) n.computeVertexNormals()
  if (!n.getAttribute('uv')) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count * 2), 2))
  return n
}

function mergeAll(list: THREE.BufferGeometry[], useGroups = false) {
  const ready = list.map(prep)
  const m = mergeGeometries(ready, useGroups)
  ready.forEach((g) => g.dispose())
  if (!m) throw new Error('car: geometry merge failed')
  return m
}

const _m4 = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _one = new THREE.Vector3(1, 1, 1)
function place(g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz)
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  g.applyMatrix4(_m4.compose(_p, _q, _one))
  return g
}

/** thick-walled tube along y (lathe), sharp edges at the ends */
function pipeY(ro: number, ri: number, len: number, seg: number) {
  const h = len / 2
  const p: P2[] = [
    [ri, -h],
    [ro, -h],
    [ro, -h],
    [ro, h],
    [ro, h],
    [ri, h],
    [ri, h],
    [ri, -h],
  ]
  return new THREE.LatheGeometry(
    p.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  )
}

// procedural textures (DataTextures, so they also build outside the browser)
function brushedRoughness() {
  const W = 4
  const H = 256
  const d = new Uint8Array(W * H * 4)
  let s = 7
  let v = 0.85
  for (let j = 0; j < H; j++) {
    s = (s * 16807) % 2147483647
    v = v * 0.55 + (0.7 + 0.3 * (s / 2147483647)) * 0.45
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4
      d[k] = d[k + 1] = d[k + 2] = Math.round(v * 255)
      d[k + 3] = 255
    }
  }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

/** diamond (tread) plate: raised lozenges alternating ±45° on a 2 × 2 cell tile */
function treadNormal() {
  const N = 64
  const C = N / 2
  const hgt = new Float32Array(N * N)
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const lu = (i % C) / C - 0.5 + 0.5 / C
      const lv = (j % C) / C - 0.5 + 0.5 / C
      const ang = (Math.floor(i / C) + Math.floor(j / C)) % 2 ? Math.PI / 4 : -Math.PI / 4
      const a = lu * Math.cos(ang) + lv * Math.sin(ang)
      const b = -lu * Math.sin(ang) + lv * Math.cos(ang)
      const q = (a / 0.36) ** 2 + (b / 0.09) ** 2
      hgt[j * N + i] = q < 1 ? Math.sqrt(1 - q) : 0
    }
  const H = (i: number, j: number) => hgt[((j + N) % N) * N + ((i + N) % N)]
  const d = new Uint8Array(N * N * 4)
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const dx = (H(i + 1, j) - H(i - 1, j)) * 2.2
      const dy = (H(i, j + 1) - H(i, j - 1)) * 2.2
      const l = Math.hypot(dx, dy, 1)
      const k = (j * N + i) * 4
      d[k] = Math.round((-dx / l) * 127.5 + 127.5)
      d[k + 1] = Math.round((-dy / l) * 127.5 + 127.5)
      d[k + 2] = Math.round((1 / l) * 127.5 + 127.5)
      d[k + 3] = 255
    }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.repeat.set(18, 25)
  t.needsUpdate = true
  return t
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const fin = (v: number | undefined, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

// ------------------------------------------------------------------------------------------
// cargo rigid bodies
// ------------------------------------------------------------------------------------------
const G = 9.81
const SUB_DT = 1 / 240
const ITER = 6
const POS_ITER = 6
const E_WALL = 0.25
const E_PIECE = 0.2
const MU_WALL = 0.25
const MU_PP = 0.3
const V_EPS = 0.015
const MAX_CORR = 0.03
const A_MAX = 16
const Y_MAX = 0.12
const V_MAX = 7

interface Part {
  geo: THREE.BufferGeometry
  mat: THREE.Material
  x?: number
  y?: number
  z?: number
  layer?: number
}

interface PieceDef {
  name: string
  parts: Part[]
  hx: number
  hz: number
  h: number
  m: number
  at: [number, number, number]
  muS?: number
  round?: { axisX: boolean; r: number; kI: number; rollS: number; rollK: number }
  shear?: [number, number]
}

interface Body {
  name: string
  g: THREE.Group
  roller: THREE.Group | null
  axisX: boolean
  layers: { o: THREE.Object3D; x: number; y: number; z: number; f: number }[]
  hx: number
  hz: number
  h: number
  rad: number
  m: number
  I: number
  k2: number
  rEff: number
  light: number
  round: boolean
  rr: number
  kI: number
  muS: number
  muK: number
  rollS: number
  rollK: number
  x: number
  z: number
  yaw: number
  vx: number
  vz: number
  w: number
  y: number
  vy: number
  /** velocity at the start of the sub-step (for the layer slip) */
  v0x: number
  v0z: number
  roll: number
  stuck: boolean
  shx: number
  shz: number
  svx: number
  svz: number
  shMaxX: number
  shMaxZ: number
  yaw0: number
  yawMax: number
  home: [number, number, number]
  tiltX: number
  tiltZ: number
  ph: number
  /** sort key of the shock-propagation sweep */
  key: number
}

function makeBody(d: PieceDef, rnd: () => number): Body {
  const g = new THREE.Group()
  g.name = 'cargo:' + d.name
  g.rotation.order = 'YXZ'
  let roller: THREE.Group | null = null
  let holder: THREE.Object3D = g
  if (d.round) {
    roller = new THREE.Group()
    roller.position.y = d.round.r
    g.add(roller)
    holder = roller
  }
  const maxLayer = d.parts.reduce((a, p) => Math.max(a, p.layer ?? 0), 0)
  const layers: Body['layers'] = []
  for (const p of d.parts) {
    const mesh = new THREE.Mesh(p.geo, p.mat)
    mesh.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    holder.add(mesh)
    if (maxLayer > 0 && (p.layer ?? 0) > 0) layers.push({ o: mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, f: (p.layer ?? 0) / maxLayer })
  }
  const lx = 2 * d.hx
  const lz = 2 * d.hz
  const k2 = (lx * lx + lz * lz) / 12
  // largest yaw deviation that still fits between the walls (safety net; the walls normally stop it first)
  let yawMax = 0
  while (yawMax < Math.PI) {
    const t = yawMax + 0.01
    const ex = d.hx * Math.abs(Math.cos(t)) + d.hz * Math.abs(Math.sin(t))
    const ez = d.hx * Math.abs(Math.sin(t)) + d.hz * Math.abs(Math.cos(t))
    if (ex > X_IN - 0.01 || ez > (Z_FRONT - Z_REAR) / 2 - 0.01) break
    yawMax = t
  }
  const muS = d.muS ?? 0.36 + 0.08 * rnd()
  const [x, z, yaw] = d.at
  return {
    name: d.name,
    g,
    roller,
    axisX: d.round?.axisX ?? false,
    layers,
    hx: d.hx,
    hz: d.hz,
    h: d.h,
    rad: Math.hypot(d.hx, d.hz),
    // contact mass: real masses span 2–540 kg, which sequential impulses cannot stack stably;
    // a compressed range keeps heavy pieces dominant without letting them plough through light ones
    m: clamp(d.m, 3, 12),
    I: clamp(d.m, 3, 12) * k2,
    k2,
    rEff: 0.25 * Math.max(lx, lz) + 0.12 * Math.min(lx, lz),
    light: clamp(12 / d.m, 0.2, 1),
    round: !!d.round,
    rr: d.round?.r ?? 1,
    kI: d.round?.kI ?? 0,
    muS,
    muK: muS * 0.78,
    rollS: d.round?.rollS ?? muS,
    rollK: d.round?.rollK ?? muS * 0.78,
    x,
    z,
    yaw,
    vx: 0,
    vz: 0,
    w: 0,
    y: 0,
    vy: 0,
    v0x: 0,
    v0z: 0,
    roll: 0,
    stuck: true,
    shx: 0,
    shz: 0,
    svx: 0,
    svz: 0,
    shMaxX: d.shear?.[0] ?? 0,
    shMaxZ: d.shear?.[1] ?? 0,
    yaw0: yaw,
    yawMax: yawMax >= Math.PI - 0.01 ? Infinity : yawMax,
    home: [x, z, yaw],
    tiltX: (rnd() * 2 - 1) * 1.5,
    tiltZ: (rnd() * 2 - 1) * 1.5,
    ph: rnd() * 100,
    key: 0,
  }
}

/** 1D Coulomb friction with a static threshold; `inv` scales the effective inertia (rolling) */
function fric1(v: number, a: number, sMax: number, kDec: number, h: number, inv: number) {
  if (Math.abs(v) < V_EPS && Math.abs(a) <= sMax) return 0
  const v2 = v + a * inv * h
  const d = kDec * inv * h
  return Math.abs(v2) <= d ? 0 : v2 - Math.sign(v2) * d
}

// corner scratch
const CX = new Float64Array(4)
const CZ = new Float64Array(4)
function corners(b: Body) {
  const c = Math.cos(b.yaw)
  const s = Math.sin(b.yaw)
  let k = 0
  for (const i of [-1, 1])
    for (const j of [-1, 1]) {
      // ex = (c, -s), ez = (s, c)
      CX[k] = b.x + i * b.hx * c + j * b.hz * s
      CZ[k] = b.z - i * b.hx * s + j * b.hz * c
      k++
    }
}

// walls: outward axis (ox, oz) and limit; penetration = p·o - lim
const WALLS: [number, number, number][] = [
  [1, 0, X_IN],
  [-1, 0, X_IN],
  [0, 1, Z_FRONT],
  [0, -1, -Z_REAR],
]

function collideWalls(b: Body, rnd: () => number, vel = true) {
  for (const [ox, oz, lim] of WALLS) {
    corners(b)
    let depth = 0
    let px = 0
    let pz = 0
    let n = 0
    for (let k = 0; k < 4; k++) {
      const pen = CX[k] * ox + CZ[k] * oz - lim
      if (pen > 0) {
        depth = Math.max(depth, pen)
        px += CX[k]
        pz += CZ[k]
        n++
      }
    }
    if (!n) continue
    px /= n
    pz /= n
    const nx = -ox
    const nz = -oz
    const rx = px - b.x
    const rz = pz - b.z
    const k = rz * nx - rx * nz
    const kN = 1 / b.m + (k * k) / b.I
    const vn = (b.vx + b.w * rz) * nx + (b.vz - b.w * rx) * nz
    if (vel && vn < 0) {
      const e = vn < -0.35 ? E_WALL : 0
      const J = (-(1 + e) * vn) / kN
      b.vx += (J * nx) / b.m
      b.vz += (J * nz) / b.m
      b.w += (J * k) / b.I
      // wall friction
      const tx = -nz
      const tz = nx
      const vt = (b.vx + b.w * rz) * tx + (b.vz - b.w * rx) * tz
      const kt = rz * tx - rx * tz
      const Jt = clamp(-vt / (1 / b.m + (kt * kt) / b.I), -MU_WALL * J, MU_WALL * J)
      b.vx += (Jt * tx) / b.m
      b.vz += (Jt * tz) / b.m
      b.w += (Jt * kt) / b.I
      b.stuck = false
      // a hard knock makes the piece jump a little
      if (vn < -0.9 && b.y < 0.003) b.vy = Math.max(b.vy, Math.min(0.55, -vn * 0.12) * b.light * (0.6 + 0.4 * rnd()))
    }
    // out of the wall: translate and turn about the contact point, so a piece pinned at one end
    // swings back into line with the wall (contain() below still guarantees the hard limit)
    const P = depth / kN
    b.x += nx * Math.min(depth, P / b.m)
    b.z += nz * Math.min(depth, P / b.m)
    if (n === 1) b.yaw += clamp((P * k) / b.I, -0.01, 0.01)
  }
}

function insideOBB(px: number, pz: number, b: Body, c: number, s: number) {
  const dx = px - b.x
  const dz = pz - b.z
  return Math.abs(dx * c - dz * s) <= b.hx + 1e-4 && Math.abs(dx * s + dz * c) <= b.hz + 1e-4
}

const AXX = new Float64Array(4)
const AXZ = new Float64Array(4)
/** separating-axis test of two footprints; returns the overlap (≤ 0: apart) and sets SAT_NX/NZ (normal from A to B) */
let SAT_NX = 0
let SAT_NZ = 0
function sat(A: Body, B: Body) {
  const dx = B.x - A.x
  const dz = B.z - A.z
  const rs = A.rad + B.rad
  if (dx * dx + dz * dz >= rs * rs) return 0
  const ca = Math.cos(A.yaw)
  const sa = Math.sin(A.yaw)
  const cb = Math.cos(B.yaw)
  const sb = Math.sin(B.yaw)
  AXX[0] = ca
  AXZ[0] = -sa
  AXX[1] = sa
  AXZ[1] = ca
  AXX[2] = cb
  AXZ[2] = -sb
  AXX[3] = sb
  AXZ[3] = cb
  let best = Infinity
  for (let k = 0; k < 4; k++) {
    const ux = AXX[k]
    const uz = AXZ[k]
    const rA = A.hx * Math.abs(ca * ux - sa * uz) + A.hz * Math.abs(sa * ux + ca * uz)
    const rB = B.hx * Math.abs(cb * ux - sb * uz) + B.hz * Math.abs(sb * ux + cb * uz)
    const d = dx * ux + dz * uz
    const ov = rA + rB - Math.abs(d)
    if (ov <= 0) return 0
    if (ov < best) {
      best = ov
      SAT_NX = d >= 0 ? ux : -ux
      SAT_NZ = d >= 0 ? uz : -uz
    }
  }
  return best
}

function collidePair(A: Body, B: Body, rnd: () => number, vel = true) {
  const best = sat(A, B)
  if (best <= 0) return
  const nx = SAT_NX
  const nz = SAT_NZ
  const ca = Math.cos(A.yaw)
  const sa = Math.sin(A.yaw)
  const cb = Math.cos(B.yaw)
  const sb = Math.sin(B.yaw)
  // contact point: the corners that poke into the other box, else the closest points of the centre lines
  let px = 0
  let pz = 0
  let cnt = 0
  corners(A)
  for (let k = 0; k < 4; k++)
    if (insideOBB(CX[k], CZ[k], B, cb, sb)) {
      px += CX[k]
      pz += CZ[k]
      cnt++
    }
  corners(B)
  for (let k = 0; k < 4; k++)
    if (insideOBB(CX[k], CZ[k], A, ca, sa)) {
      px += CX[k]
      pz += CZ[k]
      cnt++
    }
  if (cnt) {
    px /= cnt
    pz /= cnt
  } else {
    const aLong = A.hz >= A.hx
    const adx = aLong ? sa : ca
    const adz = aLong ? ca : -sa
    const ah = Math.abs(A.hz - A.hx)
    const bLong = B.hz >= B.hx
    const bdx = bLong ? sb : cb
    const bdz = bLong ? cb : -sb
    const bh = Math.abs(B.hz - B.hx)
    let s = clamp((B.x - A.x) * adx + (B.z - A.z) * adz, -ah, ah)
    let t = 0
    for (let it = 0; it < 3; it++) {
      t = clamp((A.x + s * adx - B.x) * bdx + (A.z + s * adz - B.z) * bdz, -bh, bh)
      s = clamp((B.x + t * bdx - A.x) * adx + (B.z + t * bdz - A.z) * adz, -ah, ah)
    }
    px = (A.x + s * adx + B.x + t * bdx) / 2
    pz = (A.z + s * adz + B.z + t * bdz) / 2
  }
  const rAx = px - A.x
  const rAz = pz - A.z
  const rBx = px - B.x
  const rBz = pz - B.z
  const kA = rAz * nx - rAx * nz
  const kB = rBz * nx - rBx * nz
  const kN = 1 / A.m + 1 / B.m + (kA * kA) / A.I + (kB * kB) / B.I
  const vn = (B.vx + B.w * rBz - A.vx - A.w * rAz) * nx + (B.vz - B.w * rBx - A.vz + A.w * rAx) * nz
  if (vel && vn < 0) {
    const e = vn < -0.35 ? E_PIECE : 0
    const J = (-(1 + e) * vn) / kN
    A.vx -= (J * nx) / A.m
    A.vz -= (J * nz) / A.m
    A.w -= (J * kA) / A.I
    B.vx += (J * nx) / B.m
    B.vz += (J * nz) / B.m
    B.w += (J * kB) / B.I
    // friction between the pieces
    const tx = -nz
    const tz = nx
    const vt = (B.vx + B.w * rBz - A.vx - A.w * rAz) * tx + (B.vz - B.w * rBx - A.vz + A.w * rAx) * tz
    const tA = rAz * tx - rAx * tz
    const tB = rBz * tx - rBx * tz
    const Jt = clamp(-vt / (1 / A.m + 1 / B.m + (tA * tA) / A.I + (tB * tB) / B.I), -MU_PP * J, MU_PP * J)
    A.vx -= (Jt * tx) / A.m
    A.vz -= (Jt * tz) / A.m
    A.w -= (Jt * tA) / A.I
    B.vx += (Jt * tx) / B.m
    B.vz += (Jt * tz) / B.m
    B.w += (Jt * tB) / B.I
    A.stuck = B.stuck = false
    if (vn < -1.1) {
      const hop = Math.min(0.45, -vn * 0.1)
      if (A.y < 0.003) A.vy = Math.max(A.vy, hop * A.light * (0.5 + 0.5 * rnd()))
      if (B.y < 0.003) B.vy = Math.max(B.vy, hop * B.light * (0.5 + 0.5 * rnd()))
    }
  }
  // push apart along the normal at the contact point, linearly and angularly (so crossed bars realign),
  // limited per pass so nothing teleports
  const corr = Math.max(0, best - 0.0005) * 0.8
  if (corr > 0) {
    const P = corr / kN
    const dA = Math.min(MAX_CORR, P / A.m)
    const dB = Math.min(MAX_CORR, P / B.m)
    A.x -= nx * dA
    A.z -= nz * dA
    A.yaw -= clamp((P * kA) / A.I, -0.01, 0.01)
    B.x += nx * dB
    B.z += nz * dB
    B.yaw += clamp((P * kB) / B.I, -0.01, 0.01)
  }
}

/**
 * Shock propagation for a load pressed against a wall (force direction fx, fz): A counts as
 * settled, B is pushed straight away from the wall (never sideways, at most 1 cm per sub-step).
 */
function shockPair(A: Body, B: Body, fx: number, fz: number) {
  const ov = sat(A, B)
  if (ov <= 0.001) return
  if (-(SAT_NX * fx + SAT_NZ * fz) < 0.5) return
  const d = Math.min(0.01, ov - 0.001)
  B.x += SAT_NX * d
  B.z += SAT_NZ * d
  const vn = (B.vx - A.vx) * SAT_NX + (B.vz - A.vz) * SAT_NZ
  if (vn < 0) {
    B.vx -= vn * SAT_NX
    B.vz -= vn * SAT_NZ
  }
}

/** hard safety net: nothing ever leaves the bed */
function contain(b: Body) {
  if (b.yawMax !== Infinity) {
    const lo = b.yaw0 - b.yawMax
    const hi = b.yaw0 + b.yawMax
    if (b.yaw < lo || b.yaw > hi) {
      b.yaw = clamp(b.yaw, lo, hi)
      b.w = 0
    }
  }
  corners(b)
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let k = 0; k < 4; k++) {
    minX = Math.min(minX, CX[k])
    maxX = Math.max(maxX, CX[k])
    minZ = Math.min(minZ, CZ[k])
    maxZ = Math.max(maxZ, CZ[k])
  }
  if (maxX > X_IN) {
    b.x -= maxX - X_IN
    if (b.vx > 0) b.vx = 0
  } else if (minX < -X_IN) {
    b.x += -X_IN - minX
    if (b.vx < 0) b.vx = 0
  }
  if (maxZ > Z_FRONT) {
    b.z -= maxZ - Z_FRONT
    if (b.vz > 0) b.vz = 0
  } else if (minZ < Z_REAR) {
    b.z += Z_REAR - minZ
    if (b.vz < 0) b.vz = 0
  }
}

// ------------------------------------------------------------------------------------------
// the truck
// ------------------------------------------------------------------------------------------
export function makeCar(): Car {
  const root = new THREE.Group()
  root.name = 'colormetal-flatbed'
  const sprung = new THREE.Group() // pitches / rolls / heaves about the pivot
  sprung.position.set(0, PIV_Y, 0)
  const body = new THREE.Group()
  body.position.set(0, -PIV_Y, 0)
  sprung.add(body)
  root.add(sprung)

  const geos = new Set<THREE.BufferGeometry>()
  const mats: THREE.Material[] = []
  const texs: THREE.Texture[] = []
  const M = <T extends THREE.Material>(m: T) => (mats.push(m), m)

  // ---- materials ----
  const brushed = brushedRoughness()
  const tread = treadNormal()
  texs.push(brushed, tread)
  const paint = M(new THREE.MeshPhysicalMaterial({ color: '#2a2e34', metalness: 0.65, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }))
  const brass = M(new THREE.MeshStandardMaterial({ color: '#c1a163', metalness: 1, roughness: 0.28, envMapIntensity: 1.2 }))
  const glass = M(new THREE.MeshPhysicalMaterial({ color: '#141820', metalness: 0.4, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.6 }))
  const rubber = M(new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.92 }))
  const dark = M(new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 0.6, metalness: 0.2 }))
  const trim = M(new THREE.MeshStandardMaterial({ color: '#1d2024', roughness: 0.42, metalness: 0.35, envMapIntensity: 1.1 }))
  const alu = M(new THREE.MeshStandardMaterial({ color: '#bcc1c6', metalness: 1, roughness: 0.34, roughnessMap: brushed, envMapIntensity: 1.15 }))
  const deckMat = M(new THREE.MeshStandardMaterial({ color: '#c2c6ca', metalness: 1, roughness: 0.38, normalMap: tread, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.1 }))
  const headL = M(new THREE.MeshStandardMaterial({ color: '#f4f1e8', emissive: '#fff6dc', emissiveIntensity: 0.9 }))
  const tailL = M(new THREE.MeshStandardMaterial({ color: '#5a0d0d', emissive: '#ff2a1a', emissiveIntensity: 0.35 }))
  const stopL = M(new THREE.MeshStandardMaterial({ color: '#3a0909', emissive: '#ff2a1a', emissiveIntensity: 0 }))
  const amber = M(new THREE.MeshStandardMaterial({ color: '#6e4512', emissive: '#ffab2e', emissiveIntensity: 0.45 }))
  const logoMat = M(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }))
  const tex = typeof document !== 'undefined' ? logoTexture(() => (logoMat.needsUpdate = true)) : null
  if (tex) logoMat.map = tex
  else logoMat.visible = false

  // static parts are collected per material and merged into one mesh each
  const bucket = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const put = (mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    place(geo, x, y, z, rx, ry, rz)
    let l = bucket.get(mat)
    if (!l) bucket.set(mat, (l = []))
    l.push(geo)
  }
  const box = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
    put(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz)
  const sides = [1, -1] as const

  // ---------------- cab ----------------
  {
    // lower body: hood, front fenders with the wheel arch, doors, cab back
    const dz = Math.sqrt(0.53 ** 2 - 0.16 ** 2)
    const a = Math.asin(0.16 / 0.53)
    const lower: P2[] = [
      [-0.14, 0.56],
      [FA - dz, 0.56],
      ...arcPts(FA, 0.4, 0.53, Math.PI - a, a, 28),
      [2.68, 0.56],
      [2.88, 0.64],
      [2.93, 0.98],
      [2.91, 1.12],
      [2.8, 1.18],
      [1.4, 1.27],
      [1.24, 1.28],
      [-0.06, 1.29],
      [-0.14, 1.23],
    ]
    put(paint, sideExtrude(polyShape(lower), -CAB_HW, CAB_HW, 0.07))
    // greenhouse (painted pillars and roof, glass set in)
    const gh: P2[] = [
      [1.3, 1.24],
      [0.68, 1.86],
      [0.58, 1.905],
      [-0.02, 1.915],
      [-0.09, 1.9],
      [-0.12, 1.86],
      [-0.12, 1.24],
    ]
    put(paint, sideExtrude(polyShape(gh), -GH_HW, GH_HW, 0.06))
    // hood power bulge
    const bulge: P2[] = [
      [2.72, 1.175],
      [1.42, 1.258],
      [1.42, 1.292],
      [1.56, 1.29],
      [2.6, 1.212],
      [2.7, 1.192],
    ]
    put(paint, sideExtrude(polyShape(bulge), -0.42, 0.42, 0.02))
    put(glass, new THREE.PlaneGeometry(1.6, 0.693), 0, 1.5578, 0.9878, -Math.PI / 4) // windshield
    put(glass, new THREE.PlaneGeometry(1.36, 0.42), 0, 1.57, -0.1245, 0, Math.PI) // rear window
    const doorGlass: P2[] = [
      [1.145, 1.31],
      [0.675, 1.78],
      [0.62, 1.8],
      [0.17, 1.8],
      [0.17, 1.31],
    ]
    const quarterGlass: P2[] = [
      [0.1, 1.31],
      [0.1, 1.8],
      [-0.03, 1.8],
      [-0.045, 1.785],
      [-0.045, 1.31],
    ]
    for (const s of sides) {
      const x0 = s > 0 ? GH_HW - 0.001 : -GH_HW - 0.005
      put(glass, sideExtrude(polyShape(doorGlass), x0, x0 + 0.006))
      put(glass, sideExtrude(polyShape(quarterGlass), x0, x0 + 0.006))
      // brass belt-line trim, door seams, handle
      box(brass, 0.012, 0.016, 1.27, s * 0.973, 1.196, 0.565)
      box(dark, 0.004, 0.56, 0.006, s * 0.9715, 0.92, 1.17)
      box(dark, 0.004, 0.56, 0.006, s * 0.9715, 0.92, -0.02)
      box(dark, 0.004, 0.006, 1.19, s * 0.9715, 0.643, 0.575)
      box(brass, 0.022, 0.032, 0.17, s * 0.982, 1.1, 0.12)
      // towing mirrors: arm, housing, glass, brass cap
      box(trim, 0.17, 0.035, 0.06, s * 1.05, 1.36, 1.05)
      box(paint, 0.08, 0.25, 0.17, s * 1.16, 1.42, 1.04)
      box(glass, 0.07, 0.22, 0.006, s * 1.16, 1.42, 0.953)
      box(brass, 0.082, 0.012, 0.172, s * 1.16, 1.551, 1.04)
      // running boards
      box(dark, 0.13, 0.045, 1.25, s * 0.93, 0.47, 0.56)
      box(alu, 0.13, 0.008, 1.25, s * 0.93, 0.4965, 0.56)
      // front fender flares + rear mudguards
      put(trim, sideExtrude(polyShape([...arcPts(FA, 0.4, 0.61, 0.12, Math.PI - 0.12, 24), ...arcPts(FA, 0.4, 0.525, Math.PI - 0.12, 0.12, 24)]), s > 0 ? 0.935 : -1.005, s > 0 ? 1.005 : -0.935, 0.012))
      put(trim, sideExtrude(polyShape([...arcPts(RA, 0.4, 0.48, 0.25, Math.PI - 0.25, 20), ...arcPts(RA, 0.4, 0.455, Math.PI - 0.25, 0.25, 20)]), s > 0 ? 0.69 : -1.0, s > 0 ? 1.0 : -0.69))
      // mud flaps
      box(trim, 0.3, 0.38, 0.012, s * 0.85, 0.35, -2.14)
      box(trim, 0.28, 0.3, 0.012, s * 0.85, 0.38, 1.36)
    }
    // wheel-house liner closes the front arches
    put(dark, sideExtrude(polyShape([...arcPts(FA, 0.4, 0.525, 0.05, Math.PI - 0.05, 20), ...arcPts(FA, 0.4, 0.49, Math.PI - 0.05, 0.05, 20)]), -0.94, 0.94))
    // roof marker lamps
    for (const x of [-0.22, 0, 0.22]) box(amber, 0.07, 0.022, 0.035, x, 1.918, 0.52)
  }

  // ---------------- front ----------------
  {
    box(dark, 1.14, 0.42, 0.05, 0, 0.87, 2.925) // grille
    for (const y of [0.725, 0.79, 0.855, 0.92, 0.985]) box(brass, 1.1, 0.013, 0.018, 0, y, 2.955)
    box(brass, 1.18, 0.022, 0.026, 0, 1.085, 2.951)
    box(brass, 1.18, 0.022, 0.026, 0, 0.655, 2.951)
    for (const s of sides) box(brass, 0.022, 0.43, 0.026, s * 0.59, 0.87, 2.951)
    box(brass, 0.2, 0.06, 0.012, 0, 0.855, 2.967) // badge plate
    for (const s of sides) {
      box(dark, 0.32, 0.13, 0.05, s * 0.755, 1.03, 2.915) // headlight housing
      box(headL, 0.27, 0.055, 0.012, s * 0.755, 1.045, 2.943)
      box(headL, 0.29, 0.012, 0.012, s * 0.755, 0.985, 2.943) // DRL strip
      box(headL, 0.12, 0.03, 0.01, s * 0.78, 0.55, 2.957) // fog lamp
      box(brass, 0.035, 0.08, 0.03, s * 0.55, 0.5, 2.95) // tow hooks
    }
    const bumper: P2[] = [
      [2.66, 0.4],
      [2.92, 0.41],
      [2.955, 0.47],
      [2.95, 0.6],
      [2.9, 0.665],
      [2.66, 0.665],
    ]
    put(trim, sideExtrude(polyShape(bumper), -0.985, 0.985, 0.035))
    box(brass, 0.9, 0.02, 0.22, 0, 0.395, 2.8, -0.15) // skid plate
  }

  // ---------------- chassis ----------------
  {
    for (const s of sides) box(dark, 0.08, 0.2, 4.6, s * 0.48, 0.62, -0.35)
    for (const z of [-0.9, -2.55]) box(dark, 0.9, 0.08, 0.08, 0, 0.62, z)
    box(dark, 1.2, 0.12, 1.6, 0, 0.5, 1.95) // engine undertray
    put(dark, new THREE.CylinderGeometry(0.065, 0.065, 1.42, 14), 0, 0.4, RA, 0, 0, Math.PI / 2) // rear axle
    box(dark, 0.28, 0.22, 0.24, 0, 0.4, RA) // differential
    put(dark, new THREE.CylinderGeometry(0.04, 0.04, 2.7, 10), 0, 0.45, -0.15, Math.PI / 2) // driveshaft
    put(dark, new THREE.CylinderGeometry(0.035, 0.035, 0.4, 14), -0.62, 0.36, -2.35, Math.PI / 2) // exhaust
    put(brass, new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16), -0.62, 0.36, -2.55, Math.PI / 2)
    // under-bed toolboxes
    for (const s of sides) {
      box(paint, 0.37, 0.38, 0.78, s * 0.805, 0.77, -0.61)
      box(dark, 0.004, 0.006, 0.76, s * 0.9915, 0.9, -0.61)
      box(brass, 0.02, 0.03, 0.2, s * 0.996, 0.8, -0.61)
    }
  }

  // ---------------- flat bed ----------------
  {
    const zc = (-0.16 - 2.955) / 2
    const len = 2.795
    put(deckMat, new THREE.BoxGeometry(BED_HW * 2, 0.05, len), 0, DECK_Y - 0.025, zc)
    // perimeter skirt + brass tie-down rails with stake pockets
    for (const s of sides) {
      box(trim, 0.04, 0.14, len, s * 0.99, 0.93, zc)
      box(brass, 0.016, 0.026, 2.7, s * 1.018, 0.935, -1.56)
    }
    box(trim, BED_HW * 2, 0.14, 0.04, 0, 0.93, -2.935)
    box(trim, BED_HW * 2, 0.14, 0.04, 0, 0.93, -0.18)
    // drop-sides in two sections with ribs, brass caps, hinges and latches
    const secs: [number, number][] = [
      [-0.2, -1.535],
      [-1.585, -2.905],
    ]
    for (const s of sides) {
      for (const [z0, z1] of secs) {
        const l = z0 - z1
        const c = (z0 + z1) / 2
        box(alu, 0.035, SIDE_H, l, s * (X_IN + 0.0175), DECK_Y + SIDE_H / 2, c)
        for (const y of [DECK_Y + SIDE_H / 3, DECK_Y + (2 * SIDE_H) / 3]) box(dark, 0.003, 0.006, l - 0.01, s * 1.0105, y, c) // plank joints
      }
      box(brass, 0.045, 0.016, 2.7, s * (X_IN + 0.0175), TOP + 0.008, -1.555)
      box(alu, 0.05, 0.41, 0.05, s * 1.01, 1.185, -1.56) // middle stake
      box(alu, 0.05, 0.41, 0.05, s * 1.01, 1.185, -2.93) // tail posts
      box(brass, 0.02, 0.05, 0.08, s * 1.038, 1.28, -1.56)
      box(brass, 0.08, 0.05, 0.02, s * 0.9, 1.3, -2.944)
    }
    // tailgate
    box(alu, X_IN * 2, SIDE_H, 0.035, 0, DECK_Y + SIDE_H / 2, -2.9225)
    box(brass, X_IN * 2, 0.016, 0.045, 0, TOP + 0.008, -2.9225)
    // headboard + headache rack
    box(alu, BED_HW * 2, 0.36, 0.04, 0, DECK_Y + 0.18, -0.18)
    box(brass, BED_HW * 2, 0.016, 0.05, 0, DECK_Y + 0.368, -0.18)
    for (const s of sides) box(alu, 0.06, 0.92, 0.06, s * 0.95, 1.46, -0.17)
    box(alu, 1.96, 0.06, 0.06, 0, 1.92, -0.17)
    box(brass, 1.96, 0.008, 0.062, 0, 1.954, -0.17)
    box(alu, 1.84, 0.04, 0.04, 0, 1.44, -0.17)
    for (let i = 0; i < 9; i++) box(alu, 0.035, 0.46, 0.012, -0.8 + i * 0.2, 1.69, -0.17)
    box(stopL, 0.34, 0.035, 0.02, 0, 1.92, -0.205) // third brake light
    // rear: lamps, bumper with step pad
    for (const s of sides) {
      box(tailL, 0.28, 0.08, 0.016, s * 0.8, 0.93, -2.957)
      box(amber, 0.09, 0.08, 0.016, s * 0.6, 0.93, -2.957)
      box(headL, 0.06, 0.08, 0.016, s * 0.5, 0.93, -2.957)
    }
    box(trim, 1.8, 0.13, 0.13, 0, 0.74, -2.89)
    box(alu, 0.6, 0.008, 0.12, 0, 0.809, -2.89)
  }

  // ---------------- wordmark on both doors and the tailgate ----------------
  for (const s of sides) put(logoMat, new THREE.PlaneGeometry(0.86, 0.336), s * 0.973, 0.92, 0.58, 0, (s * Math.PI) / 2)
  put(logoMat, new THREE.PlaneGeometry(0.78, 0.305), 0, DECK_Y + SIDE_H / 2, -2.9415, 0, Math.PI)

  for (const [mat, list] of bucket) {
    const g = mergeAll(list)
    geos.add(g)
    const mesh = new THREE.Mesh(g, mat)
    mesh.castShadow = mat !== logoMat
    mesh.receiveShadow = true
    body.add(mesh)
  }

  // ---------------- wheels: steer pivot (front) → spin group → tyre + brass rim ----------------
  const wheelGeo = (() => {
    const prof: P2[] = [
      [0.268, -0.125],
      [0.31, -0.141],
      [0.355, -0.143],
      [0.378, -0.132],
      [0.386, -0.11],
      [0.388, -0.06],
      [0.388, 0.06],
      [0.386, 0.11],
      [0.378, 0.132],
      [0.355, 0.143],
      [0.31, 0.141],
      [0.268, 0.125],
    ]
    const rub: THREE.BufferGeometry[] = [
      new THREE.LatheGeometry(
        prof.map(([r, y]) => new THREE.Vector2(r, y)),
        44,
      ).rotateZ(-Math.PI / 2),
    ]
    // chunky staggered tread blocks
    const n = 22
    for (let k = 0; k < n; k++)
      for (const row of [-1, 1]) {
        const th = ((k + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2
        rub.push(place(new THREE.BoxGeometry(0.115, 0.018, 0.075), row * 0.062, 0.392 * Math.cos(th), 0.392 * Math.sin(th), th))
      }
    const rim: THREE.BufferGeometry[] = []
    const barrel: P2[] = [
      [0.262, -0.12],
      [0.268, -0.11],
      [0.268, 0.1],
      [0.279, 0.118],
      [0.277, 0.129],
      [0.262, 0.125],
    ]
    rim.push(
      new THREE.LatheGeometry(
        barrel.map(([r, y]) => new THREE.Vector2(r, y)),
        40,
      ).rotateZ(-Math.PI / 2),
    )
    for (let k = 0; k < 6; k++) {
      const th = (k / 6) * Math.PI * 2
      rim.push(place(new THREE.BoxGeometry(0.03, 0.2, 0.05), 0.1, 0.16 * Math.cos(th), 0.16 * Math.sin(th), th))
    }
    rim.push(place(new THREE.CylinderGeometry(0.075, 0.085, 0.05, 24), 0.105, 0, 0, 0, 0, -Math.PI / 2))
    const drk: THREE.BufferGeometry[] = [
      place(new THREE.CylinderGeometry(0.262, 0.262, 0.02, 36), 0.07, 0, 0, 0, 0, -Math.PI / 2),
      place(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), 0.135, 0, 0, 0, 0, -Math.PI / 2),
    ]
    return mergeAll([mergeAll(rub), mergeAll(rim), mergeAll(drk)], true)
  })()
  geos.add(wheelGeo)
  const wheels: { steer: THREE.Group; spin: THREE.Group; front: boolean }[] = []
  for (const [x, z] of [
    [TRACK, FA],
    [-TRACK, FA],
    [TRACK, RA],
    [-TRACK, RA],
  ]) {
    const steer = new THREE.Group()
    steer.position.set(x, WHEEL_R, z)
    const spin = new THREE.Group()
    const w = new THREE.Mesh(wheelGeo, [rubber, brass, dark])
    if (x < 0) w.rotation.y = Math.PI // outer face towards the outside on the right
    w.castShadow = true
    w.receiveShadow = true
    spin.add(w)
    steer.add(spin)
    root.add(steer)
    wheels.push({ steer, spin, front: z > 0 })
  }

  // ------------------------------------------------------------------------------------------
  // cargo
  // ------------------------------------------------------------------------------------------
  const phys = (color: string, roughness: number, metalness = 1) => M(new THREE.MeshPhysicalMaterial({ color, metalness, roughness, envMapIntensity: 1.25 }))
  const cu = [phys('#c47c4c', 0.22), phys('#b87333', 0.27), phys('#ab6a3e', 0.31), phys('#8d5735', 0.36)]
  const al = phys('#d4d7da', 0.3)
  const alMill = phys('#c3c8cc', 0.38)
  const zinc = phys('#8d9196', 0.45, 0.9)
  const cuLine = M(new THREE.MeshStandardMaterial({ color: '#6b3d22', metalness: 1, roughness: 0.45 }))
  const strap = M(new THREE.MeshStandardMaterial({ color: '#252a31', metalness: 0.25, roughness: 0.6 }))
  const wood = M(new THREE.MeshStandardMaterial({ color: '#a07e57', roughness: 0.85 }))

  const gcache = new Map<string, THREE.BufferGeometry>()
  const geo = (key: string, make: () => THREE.BufferGeometry) => {
    let g = gcache.get(key)
    if (!g) {
      g = make()
      gcache.set(key, g)
      geos.add(g)
    }
    return g
  }
  const pipeZ = (ro: number, ri: number, len: number) => geo(`pipe${ro}/${ri}/${len}`, () => pipeY(ro, ri, len, 22).rotateX(Math.PI / 2))
  const rodZ = (r: number, len: number) => geo(`rod${r}/${len}`, () => new THREE.CylinderGeometry(r, r, len, 20).rotateX(Math.PI / 2))
  const sqTube = (a: number, t: number, len: number) =>
    geo(`sq${a}/${t}/${len}`, () => lengthExtrude(polyShape(roundRectPts(a, a, 0.004, 0, a / 2), [roundRectPts(a - 2 * t, a - 2 * t, 0.002, 0, a / 2)]), len))
  const flatBar = (w: number, t: number, len: number) => geo(`flat${w}/${t}/${len}`, () => lengthExtrude(polyShape(roundRectPts(w, t, 0.0015, 0, t / 2)), len))
  const angle = (a: number, t: number, len: number, flip: number) =>
    geo(`ang${a}/${t}/${len}/${flip}`, () =>
      lengthExtrude(
        polyShape(
          (
            [
              [0, 0],
              [a, 0],
              [a, t],
              [t, t],
              [t, a],
              [0, a],
            ] as P2[]
          ).map(([x, y]) => [flip * (x - a / 2), y] as P2),
        ),
        len,
      ),
    )
  /** strap band around a bundle of circles (centres CCW), width along z */
  const band = (key: string, cs: P2[], r: number, t: number, w: number, zs: number[]) =>
    geo(`band${key}`, () =>
      mergeAll(zs.map((z) => lengthExtrude(polyShape(hullPts(cs, r + t), [hullPts(cs, r + 0.0005)]), w).translate(0, 0, z))),
    )

  const rnd = mulberry(20260611)
  const defs: PieceDef[] = []

  // 1 · copper strip coil, strapped through the eye, loosely chocked: rolls fore / aft
  {
    const ro = 0.28
    const ri = 0.12
    const hw = 0.15
    const c = 0.012
    const coil = geo('coil', () =>
      new THREE.LatheGeometry(
        (
          [
            [ri, -hw + c],
            [ri + c, -hw],
            [ro - c, -hw],
            [ro, -hw + c],
            [ro, hw - c],
            [ro - c, hw],
            [ri + c, hw],
            [ri, hw - c],
            [ri, -hw + c],
          ] as P2[]
        ).map(([r, y]) => new THREE.Vector2(r, y)),
        48,
      ).rotateZ(-Math.PI / 2),
    )
    const lines = geo('coilLines', () => {
      const l: THREE.BufferGeometry[] = []
      for (const r of [0.15, 0.185, 0.215, 0.245]) for (const s of sides) l.push(place(new THREE.TorusGeometry(r, 0.0018, 4, 56), s * (hw + 0.0004), 0, 0, 0, Math.PI / 2))
      return mergeAll(l)
    })
    const t = 0.003
    const straps = geo('coilStraps', () => {
      const sh = polyShape(
        [
          [-hw - t, ri - t],
          [hw + t, ri - t],
          [hw + t, ro + t],
          [-hw - t, ro + t],
        ],
        [
          [
            [-hw, ri],
            [hw, ri],
            [hw, ro],
            [-hw, ro],
          ],
        ],
      )
      const a = lengthExtrude(sh, 0.032)
      const b = lengthExtrude(sh, 0.032).rotateX(Math.PI)
      return mergeAll([a, b])
    })
    defs.push({
      name: 'copper-coil',
      parts: [
        { geo: coil, mat: cu[0] },
        { geo: lines, mat: cuLine },
        { geo: straps, mat: strap },
      ],
      hx: hw + t,
      hz: ro + t,
      h: 2 * ro,
      m: 540,
      at: [0.8, -0.53, 0],
      muS: 0.4,
      round: { axisX: true, r: ro, kI: 0.59, rollS: 0.2, rollK: 0.03 },
    })
  }
  // 2–3 · aluminium angle profiles 50 × 50 × 5, 1.5 m
  defs.push({ name: 'alu-angle-a', parts: [{ geo: angle(0.05, 0.005, 1.5, -1), mat: alMill }], hx: 0.025, hz: 0.75, h: 0.05, m: 1.9, at: [0.92, -1.9, 0] })
  defs.push({ name: 'alu-angle-b', parts: [{ geo: angle(0.05, 0.005, 1.5, 1), mat: al }], hx: 0.025, hz: 0.75, h: 0.05, m: 1.9, at: [0.82, -1.95, 0] })
  // 4–6 · copper tubes Ø54 × 1.5, 2.4 m (loose: they roll sideways)
  const tube54 = pipeZ(0.027, 0.0255, 2.4)
  const roundTube = { axisX: false, r: 0.027, kI: 0.95, rollS: 0.18, rollK: 0.035 }
  defs.push({ name: 'copper-tube-1', parts: [{ geo: tube54, mat: cu[1], y: 0 }], hx: 0.027, hz: 1.2, h: 0.054, m: 5.3, at: [0.585, -1.5, 0], round: roundTube })
  defs.push({ name: 'copper-tube-2', parts: [{ geo: tube54, mat: cu[0] }], hx: 0.027, hz: 1.2, h: 0.054, m: 5.3, at: [0.515, -1.52, 0], round: roundTube })
  defs.push({ name: 'copper-tube-3', parts: [{ geo: tube54, mat: cu[3] }], hx: 0.027, hz: 1.2, h: 0.054, m: 5.3, at: [0.445, -1.48, 0], round: roundTube })
  // 7 · strapped hex bundle of 7 aluminium rods Ø40, 2.3 m
  {
    const r = 0.02
    const t = 0.003
    const q = Math.sqrt(3) * r
    const cs: P2[] = [
      [-r, r],
      [r, r],
      [-2 * r, r + q],
      [0, r + q],
      [2 * r, r + q],
      [-r, r + 2 * q],
      [r, r + 2 * q],
    ]
    const rods = geo('hexRods', () => mergeAll(cs.map(([x, y]) => new THREE.CylinderGeometry(r, r, 2.3, 18).rotateX(Math.PI / 2).translate(x, y + t, 0))))
    const hull: P2[] = [
      [-r, r + t],
      [r, r + t],
      [2 * r, r + q + t],
      [r, r + 2 * q + t],
      [-r, r + 2 * q + t],
      [-2 * r, r + q + t],
    ]
    defs.push({
      name: 'alu-rod-bundle',
      parts: [
        { geo: rods, mat: al },
        { geo: band('hex', hull, r, t, 0.03, [-0.75, 0.75]), mat: strap },
      ],
      hx: 3 * r + t,
      hz: 1.15,
      h: 2 * r + 2 * q + 2 * t,
      m: 55,
      at: [0.31, -1.55, 0],
    })
  }
  // 8–10 · loose copper flat bars 50 × 10, 1.0 m
  const flat50 = flatBar(0.05, 0.01, 1.0)
  defs.push({ name: 'copper-flat-1', parts: [{ geo: flat50, mat: cu[2] }], hx: 0.025, hz: 0.5, h: 0.01, m: 4.5, at: [0.165, -0.82, 0] })
  defs.push({ name: 'copper-flat-2', parts: [{ geo: flat50, mat: cu[1] }], hx: 0.025, hz: 0.5, h: 0.01, m: 4.5, at: [0.1, -0.8, 0.01] })
  defs.push({ name: 'copper-flat-3', parts: [{ geo: flat50, mat: cu[0] }], hx: 0.025, hz: 0.5, h: 0.01, m: 4.5, at: [0.035, -0.84, -0.012] })
  // 11 · titanium-zinc + copper sheet stack on two timber battens (top sheets slip)
  {
    const battens = geo('battens', () => mergeAll([-0.45, 0.45].map((z) => new THREE.BoxGeometry(0.66, 0.05, 0.07).translate(0, 0.025, z))))
    const sheet = geo('sheet', () => new THREE.BoxGeometry(0.6, 0.005, 1.3))
    const sm = [zinc, zinc, cu[1], cu[0]]
    defs.push({
      name: 'sheet-stack',
      parts: [{ geo: battens, mat: wood }, ...sm.map((mat, i) => ({ geo: sheet, mat, x: (rnd() - 0.5) * 0.01, y: 0.0525 + i * 0.0058, z: (rnd() - 0.5) * 0.014, layer: i + 1 }))],
      hx: 0.33,
      hz: 0.658,
      h: 0.073,
      m: 60,
      muS: 0.45,
      at: [-0.13, -2.17, 0],
      shear: [0.006, 0.03],
    })
  }
  // 12 · standing-seam panel offcuts (2 × zinc, 1 × copper), nested
  {
    const panel = geo('panel', () => mergeAll([new THREE.BoxGeometry(0.42, 0.0025, 1.5).translate(0, 0.00125, 0), ...[-1, 1].map((s) => new THREE.BoxGeometry(0.006, 0.03, 1.5).translate(s * 0.2125, 0.015, 0))]))
    defs.push({
      name: 'seam-panels',
      parts: [zinc, cu[2], zinc].map((mat, i) => ({ geo: panel, mat, x: (i - 1) * 0.009, y: i * 0.0055, z: (i - 1) * 0.012, layer: i })),
      hx: 0.225,
      hz: 0.762,
      h: 0.041,
      m: 12,
      muS: 0.38,
      at: [-0.72, -0.98, 0],
      shear: [0.006, 0.025],
    })
  }
  // 13 · strapped pyramid of six copper tubes Ø42, 1.0 m
  {
    const r = 0.021
    const t = 0.003
    const q = Math.sqrt(3) * r
    const cs: P2[] = [
      [-2 * r, r],
      [0, r],
      [2 * r, r],
      [-r, r + q],
      [r, r + q],
      [0, r + 2 * q],
    ]
    const tubes = geo('pyrTubes', () => mergeAll(cs.map(([x, y]) => pipeY(r, r - 0.0012, 1.0, 18).rotateX(Math.PI / 2).translate(x, y + t, 0))))
    const hull: P2[] = [
      [-2 * r, r + t],
      [2 * r, r + t],
      [0, r + 2 * q + t],
    ]
    defs.push({
      name: 'copper-tube-bundle',
      parts: [
        { geo: tubes, mat: cu[2] },
        { geo: band('pyr', hull, r, t, 0.03, [-0.32, 0.32]), mat: strap },
      ],
      hx: 3 * r + t,
      hz: 0.5,
      h: 2 * r + 2 * q + 2 * t,
      m: 8.2,
      at: [-0.78, -2.3, 0],
    })
  }
  // 14 · aluminium square tube 60 × 60 × 3, 1.0 m
  defs.push({ name: 'alu-square-60', parts: [{ geo: sqTube(0.06, 0.003, 1.0), mat: al }], hx: 0.03, hz: 0.5, h: 0.06, m: 1.85, at: [-0.6, -2.3, 0] })
  // 15 · aluminium round bar Ø50, 1.0 m
  defs.push({
    name: 'alu-rod-50',
    parts: [{ geo: rodZ(0.025, 1.0), mat: alMill }],
    hx: 0.025,
    hz: 0.5,
    h: 0.05,
    m: 5.3,
    at: [-0.92, -2.3, 0],
    round: { axisX: false, r: 0.025, kI: 0.5, rollS: 0.18, rollK: 0.03 },
  })
  // 16 · small stack of copper flat bars 60 × 8, 1.1 m (they slip on each other)
  {
    const fb = flatBar(0.06, 0.008, 1.1)
    const off: P2[] = [
      [0, 0],
      [0.004, 0.02],
      [-0.003, -0.015],
      [0.002, 0.01],
    ]
    defs.push({
      name: 'copper-flat-stack',
      parts: [cu[1], cu[3], cu[0], cu[2]].map((mat, i) => ({ geo: fb, mat, x: off[i][0], y: i * 0.008, z: off[i][1], layer: i })),
      hx: 0.034,
      hz: 0.572,
      h: 0.032,
      m: 19,
      at: [-0.1, -0.8, 0],
      shear: [0.006, 0.025],
    })
  }
  // 17 · aluminium square tube 50 × 50 × 3, 1.1 m
  defs.push({ name: 'alu-square-50', parts: [{ geo: sqTube(0.05, 0.003, 1.1), mat: alMill }], hx: 0.025, hz: 0.55, h: 0.05, m: 1.7, at: [-0.25, -0.82, 0] })
  // 18 · aluminium round bar Ø30, 1.1 m
  defs.push({
    name: 'alu-rod-30',
    parts: [{ geo: rodZ(0.015, 1.1), mat: al }],
    hx: 0.015,
    hz: 0.55,
    h: 0.03,
    m: 2.1,
    at: [-0.36, -0.8, 0],
    round: { axisX: false, r: 0.015, kI: 0.5, rollS: 0.18, rollK: 0.03 },
  })

  const cargo = new THREE.Group()
  cargo.name = 'cargo'
  cargo.position.y = DECK_Y
  body.add(cargo)
  const bodies = defs.map((d) => makeBody(d, rnd))
  const order = bodies.slice()
  for (const b of bodies) cargo.add(b.g)

  // ------------------------------------------------------------------------------------------
  // simulation state
  // ------------------------------------------------------------------------------------------
  const st = { first: true, prevYaw: 0, alpha: 0, pax: 0, paz: 0, t: 0, speed: 0 }
  const susp = { p: 0, pv: 0, r: 0, rv: 0, y: 0, yv: 0 }

  function hop(v: number) {
    for (const b of bodies)
      if (b.y < 0.003) {
        b.vy = Math.max(b.vy, v * b.light * (0.55 + 0.45 * rnd()))
        b.tiltX = (rnd() * 2 - 1) * 1.5
        b.tiltZ = (rnd() * 2 - 1) * 1.5
      }
  }

  function step(h: number, ax0: number, az0: number, om: number, al: number) {
    for (const b of bodies) {
      const c = Math.cos(b.yaw)
      const s = Math.sin(b.yaw)
      // pseudo-forces of the accelerating, yawing bed: translation, centrifugal, Euler, Coriolis
      let ax = -ax0 + om * om * b.x - al * b.z - 2 * om * b.vz
      let az = -az0 + om * om * b.z + al * b.x + 2 * om * b.vx
      const am = Math.hypot(ax, az)
      if (am > A_MAX) {
        ax *= A_MAX / am
        az *= A_MAX / am
      }
      b.v0x = b.vx
      b.v0z = b.vz
      if (b.y > 0.002) {
        // airborne: no friction, keeps its inertial heading
        b.vx += ax * h
        b.vz += az * h
        b.w -= al * h
      } else {
        if (!b.round) {
          const sp = Math.hypot(b.vx, b.vz)
          if (sp < V_EPS && Math.hypot(ax, az) <= b.muS * G) {
            b.vx = b.vz = 0
            b.stuck = true
          } else {
            b.stuck = false
            b.vx += ax * h
            b.vz += az * h
            const s2 = Math.hypot(b.vx, b.vz)
            const d = b.muK * G * h
            if (s2 <= d) b.vx = b.vz = 0
            else {
              b.vx *= 1 - d / s2
              b.vz *= 1 - d / s2
            }
          }
        } else {
          // round stock: slides along its axis, rolls across it
          const ux = b.axisX ? c : s
          const uz = b.axisX ? -s : c
          const px = b.axisX ? s : c
          const pz = b.axisX ? c : -s
          const va = fric1(b.vx * ux + b.vz * uz, ax * ux + az * uz, b.muS * G, b.muK * G, h, 1)
          const vp = fric1(b.vx * px + b.vz * pz, ax * px + az * pz, b.rollS * G, b.rollK * G, h, 1 / (1 + b.kI))
          b.vx = ux * va + px * vp
          b.vz = uz * va + pz * vp
          b.stuck = va === 0 && vp === 0
          b.roll += ((b.axisX ? vp : -vp) * h) / b.rr
        }
        // yaw relative to the bed, with rotational friction (weaker while the piece is sliding)
        if (b.stuck && Math.abs(b.w) < 0.05) b.w = 0
        else {
          if (!b.stuck) b.w -= al * h
          const wr = Math.abs(b.w) * b.rEff
          const f = Math.max(0.4, wr / (Math.hypot(b.vx, b.vz) + wr + 1e-9))
          const dec = ((b.muK * G * b.rEff) / b.k2) * f * h
          b.w = Math.abs(b.w) <= dec ? 0 : b.w - Math.sign(b.w) * dec
        }
      }
      const sp = Math.hypot(b.vx, b.vz)
      if (sp > V_MAX) {
        b.vx *= V_MAX / sp
        b.vz *= V_MAX / sp
      }
      b.w = clamp(b.w, -4, 4)
      b.x += b.vx * h
      b.z += b.vz * h
      b.yaw += b.w * h
      // vertical hop
      if (b.y > 0 || b.vy > 0) {
        b.vy -= G * h
        b.y += b.vy * h
        if (b.y <= 0) {
          b.y = 0
          b.vy = b.vy < -0.6 ? -b.vy * 0.25 : 0
        }
        if (b.y > Y_MAX) {
          b.y = Y_MAX
          if (b.vy > 0) b.vy = 0
        }
      }
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) collidePair(bodies[i], bodies[j], rnd)
      for (const b of bodies) collideWalls(b, rnd)
    }
    for (let it = 0; it < POS_ITER; it++) {
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) collidePair(bodies[i], bodies[j], rnd, false)
      for (const b of bodies) collideWalls(b, rnd, false)
    }
    // a load pressed against a wall: settle the pile outwards from that wall
    const fm = Math.hypot(ax0, az0)
    if (fm > 3) {
      const fx = -ax0 / fm
      const fz = -az0 / fm
      for (const b of order) b.key = b.x * fx + b.z * fz
      order.sort((p, q) => q.key - p.key)
      for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) shockPair(order[i], order[j], fx, fz)
    }
    for (const b of bodies) {
      contain(b)
      // sheets / bars on top of a stack slip relative to its base
      if (b.layers.length) {
        // what the upper layers feel relative to the base (pseudo-force minus the base's own acceleration)
        const c = Math.cos(b.yaw)
        const s = Math.sin(b.yaw)
        const ax = -ax0 - (b.vx - b.v0x) / h
        const az = -az0 - (b.vz - b.v0z) / h
        const lx = ax * c - az * s
        const lz = ax * s + az * c
        if (Math.hypot(b.svx, b.svz) < 0.005 && Math.hypot(lx, lz) <= 0.24 * G) b.svx = b.svz = 0
        else {
          b.svx += lx * h
          b.svz += lz * h
          const m = Math.hypot(b.svx, b.svz)
          const d = 0.18 * G * h
          if (m <= d) b.svx = b.svz = 0
          else {
            b.svx *= 1 - d / m
            b.svz *= 1 - d / m
          }
        }
        b.shx += b.svx * h
        b.shz += b.svz * h
        if (Math.abs(b.shx) > b.shMaxX) {
          b.shx = clamp(b.shx, -b.shMaxX, b.shMaxX)
          b.svx = 0
        }
        if (Math.abs(b.shz) > b.shMaxZ) {
          b.shz = clamp(b.shz, -b.shMaxZ, b.shMaxZ)
          b.svz = 0
        }
        // the slipping top layers must not poke through a drop-side, the headboard or the tailgate
        corners(b)
        let minX = Infinity
        let maxX = -Infinity
        let minZ = Infinity
        let maxZ = -Infinity
        for (let k = 0; k < 4; k++) {
          minX = Math.min(minX, CX[k])
          maxX = Math.max(maxX, CX[k])
          minZ = Math.min(minZ, CZ[k])
          maxZ = Math.max(maxZ, CZ[k])
        }
        const dx = clamp(b.shx * c + b.shz * s, -(minX + X_IN), X_IN - maxX)
        const dz = clamp(-b.shx * s + b.shz * c, Z_REAR - minZ, Z_FRONT - maxZ)
        b.shx = dx * c - dz * s
        b.shz = dx * s + dz * c
      }
      // never let a bad frame poison the state
      if (![b.x, b.z, b.yaw, b.vx, b.vz, b.w, b.y, b.vy, b.roll, b.shx, b.shz].every(Number.isFinite)) resetBody(b)
    }
  }

  function resetBody(b: Body) {
    ;[b.x, b.z, b.yaw] = b.home
    b.vx = b.vz = b.w = b.y = b.vy = b.roll = 0
    b.shx = b.shz = b.svx = b.svz = 0
    b.stuck = true
  }

  function stepSuspension(h: number, ax: number, az: number) {
    const wn = 8
    const z = 0.5
    const tp = clamp(-az * 0.0019, -0.034, 0.034)
    const tr = clamp(ax * 0.0024, -0.04, 0.04)
    susp.pv += (wn * wn * (tp - susp.p) - 2 * z * wn * susp.pv) * h
    susp.p += susp.pv * h
    susp.rv += (wn * wn * (tr - susp.r) - 2 * z * wn * susp.rv) * h
    susp.r += susp.rv * h
    susp.yv += (-11 * 11 * susp.y - 2 * 0.35 * 11 * susp.yv) * h
    susp.y = clamp(susp.y + susp.yv * h, -0.04, 0.04)
  }

  function writeCargo() {
    const sp = Math.abs(st.speed)
    for (const b of bodies) {
      let lift = 0
      let jx = 0
      let jz = 0
      if (b.y < 0.003 && sp > 0.5) {
        // light rattle at speed
        const amp = Math.min(0.0035, sp * 0.00011) * b.light
        const t = st.t
        lift = amp * (0.5 + 0.5 * Math.sin(t * 97.3 + b.ph) * Math.sin(t * 151.1 + 1.7 * b.ph))
        jx = amp * 2 * Math.sin(t * 113.7 + 2.3 * b.ph)
        jz = amp * 2 * Math.sin(t * 89.1 + 3.1 * b.ph)
      }
      const yv = b.y + lift
      // tilt (about the bottom centre) only as far as the ends stay above the deck and the
      // top edges stay inside the drop-sides / headboard / tailgate
      corners(b)
      let minX = Infinity
      let maxX = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      for (let k = 0; k < 4; k++) {
        minX = Math.min(minX, CX[k])
        maxX = Math.max(maxX, CX[k])
        minZ = Math.min(minZ, CZ[k])
        maxZ = Math.max(maxZ, CZ[k])
      }
      const cy = Math.cos(b.yaw)
      const sy = Math.sin(b.yaw)
      const sX = Math.max(0, Math.min(X_IN - maxX, minX + X_IN) - Math.abs(b.shx * cy + b.shz * sy))
      const sZ = Math.max(0, Math.min(Z_FRONT - maxZ, minZ - Z_REAR) - Math.abs(-b.shx * sy + b.shz * cy))
      const c = Math.abs(cy) + 1e-6
      const s = Math.abs(sy) + 1e-6
      const roomX = Math.min(sX / c, sZ / s) // free space along the piece's own x
      const roomZ = Math.min(sX / s, sZ / c) // and along its z
      const pl = Math.min(0.25, (yv / b.hz) * 0.9, (roomZ * 0.9) / b.h)
      const rl = Math.min(0.25, (yv / b.hx) * 0.9, (roomX * 0.9) / b.h)
      let pitch = clamp(b.tiltX * b.y + jx, -pl, pl)
      let roll = clamp(b.tiltZ * b.y + jz, -rl, rl)
      // a corner sees both tilts at once
      const dip = b.hz * Math.abs(pitch) + b.hx * Math.abs(roll)
      if (dip > yv * 0.9) {
        const k = (yv * 0.9) / dip
        pitch *= k
        roll *= k
      }
      b.g.position.set(b.x, yv, b.z)
      b.g.rotation.set(pitch, b.yaw, roll)
      if (b.roller) {
        if (b.axisX) b.roller.rotation.x = b.roll
        else b.roller.rotation.z = b.roll
      }
      for (const l of b.layers) l.o.position.set(l.x + b.shx * l.f, l.y, l.z + b.shz * l.f)
    }
  }
  writeCargo()

  return {
    root,
    update(steer, spin, braking, dyn) {
      for (const w of wheels) {
        if (w.front) w.steer.rotation.y = steer
        w.spin.rotation.x = spin
      }
      tailL.emissiveIntensity = braking ? 2.4 : 0.35
      stopL.emissiveIntensity = braking ? 2.6 : 0
      if (!dyn) return
      const dt = clamp(fin(dyn.dt), 0, 0.05)
      const speed = clamp(fin(dyn.speed), -80, 80)
      const yawRate = clamp(fin(dyn.yawRate), -3, 3)
      const aLong = fin(dyn.aLong)
      const aLat = fin(dyn.aLat)
      const impact = clamp(fin(dyn.impact), 0, 40)
      st.speed = speed
      if (dt <= 0) {
        writeCargo()
        return
      }
      // acceleration of the truck origin in its own frame (incl. the centripetal part of the turn)
      let ax = aLat + yawRate * speed
      let az = aLong
      const am = Math.hypot(ax, az)
      if (am > A_MAX) {
        ax *= A_MAX / am
        az *= A_MAX / am
      }
      const alRaw = st.first ? 0 : (yawRate - st.prevYaw) / dt
      st.alpha += (clamp(alRaw, -8, 8) - st.alpha) * Math.min(1, dt * 15)
      // knocks: a sudden change of acceleration and / or a collision
      const jerk = st.first ? 0 : Math.hypot(ax - st.pax, az - st.paz)
      if (jerk > 14) {
        hop(Math.min(0.8, (jerk - 14) * 0.05))
        susp.yv -= Math.min(0.25, (jerk - 14) * 0.01)
      }
      if (impact > 0.5) {
        // the bed changes velocity under the load: everything surges the other way
        const rm = Math.hypot(aLat, aLong)
        let dx = 0
        let dz = speed >= 0 ? 1 : -1
        if (rm > 5) {
          dx = -aLat / rm
          dz = -aLong / rm
        }
        const k = Math.min(5, impact * 0.75)
        for (const b of bodies) {
          b.vx += dx * k
          b.vz += dz * k
          b.stuck = false
        }
        hop(Math.min(1.3, impact * 0.16))
        susp.yv -= Math.min(0.5, impact * 0.05)
      }
      st.first = false
      st.prevYaw = yawRate
      st.pax = ax
      st.paz = az
      const n = Math.max(1, Math.ceil(dt / SUB_DT - 1e-9))
      const h = dt / n
      for (let k = 0; k < n; k++) {
        step(h, ax, az, yawRate, st.alpha)
        stepSuspension(h, ax, az)
      }
      st.t += dt
      sprung.rotation.x = susp.p
      sprung.rotation.z = susp.r
      sprung.position.y = PIV_Y + susp.y
      writeCargo()
    },
    resetCargo() {
      for (const b of bodies) resetBody(b)
      writeCargo()
    },
    dispose() {
      geos.forEach((x) => x.dispose())
      mats.forEach((m) => m.dispose())
      texs.forEach((t) => t.dispose())
      tex?.dispose()
    },
  }
}
