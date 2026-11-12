/**
 * Walk-around and drive-around modes at true scale (1:1), on the levelled ground
 * around the selected building (its presentation base is hidden meanwhile).
 *
 * On foot: a 1.75 m COLOR METAL figure — click / tap to walk there, W A S D / arrows
 * (Shift or the run toggle = run), drag to look around, optional eye level.
 * By car: a 4.7 m COLOR METAL car — W / S throttle · brake / reverse, A / D steer,
 * Space = handbrake (drift), Shift = turbo, click / tap = drive there; chase or cockpit view.
 *
 * Collisions: the model is sliced at 0.4 m and 1.2 m into a 20 cm occupancy grid,
 * so the figure walks and the car bounces around walls instead of passing through.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { getMini, type Mini } from './Miniatures'
import { runtime } from './runtime'
import { makeFigure, type Figure } from './figure'
import { makeCar, type Car } from './car'

const CELL = 0.2 // m
const BODY_R = 0.3 // m
const WALK = 1.4 // m/s
const RUN = 6.5 // m/s (fast run)
const HEAD = 1.62 // m (camera target)

// car (arcade bicycle model)
const WHEELBASE = 2.7
const V_MAX = 30 // m/s ≈ 108 km/h
const V_TURBO = 44 // m/s ≈ 158 km/h
const ACC = 9
const ACC_TURBO = 15
const BRAKE = 17
const REV = 7
const CAR_PTS: [number, number][] = [
  [0.95, 2.3],
  [-0.95, 2.3],
  [0.95, -2.3],
  [-0.95, -2.3],
  [0.95, 0],
  [-0.95, 0],
  [0, 2.38],
  [0, -2.38],
]
const SKIDS = 1400

interface Grid {
  n: number
  half: number
  cells: Uint8Array
}

function buildGrid(m: Mini, half: number): Grid {
  const n = Math.ceil((2 * half) / CELL)
  const cells = new Uint8Array(n * n)
  m.root.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(m.turn.matrixWorld).invert()
  const mark = (x: number, z: number) => {
    const i = Math.floor((x + half) / CELL)
    const j = Math.floor((z + half) / CELL)
    if (i >= 0 && j >= 0 && i < n && j < n) cells[j * n + i] = 1
  }
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const M = new THREE.Matrix4()
  const group = m.full ?? m.far
  group?.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    M.multiplyMatrices(inv, mesh.matrixWorld)
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
    const index = mesh.geometry.index
    const count = index ? index.count : pos.count
    const vid = (k: number) => (index ? index.getX(k) : k)
    for (let t = 0; t + 2 < count; t += 3) {
      a.fromBufferAttribute(pos, vid(t)).applyMatrix4(M)
      b.fromBufferAttribute(pos, vid(t + 1)).applyMatrix4(M)
      c.fromBufferAttribute(pos, vid(t + 2)).applyMatrix4(M)
      for (const y of [0.4, 1.2]) {
        const pts: THREE.Vector2[] = []
        for (const [p, q] of [
          [a, b],
          [b, c],
          [c, a],
        ] as const) {
          if ((p.y - y) * (q.y - y) < 0) {
            const k = (y - p.y) / (q.y - p.y)
            pts.push(new THREE.Vector2(p.x + (q.x - p.x) * k, p.z + (q.z - p.z) * k))
          }
        }
        if (pts.length < 2) continue
        const [p, q] = pts
        const steps = Math.max(1, Math.ceil(p.distanceTo(q) / (CELL * 0.5)))
        for (let s = 0; s <= steps; s++) mark(p.x + ((q.x - p.x) * s) / steps, p.y + ((q.y - p.y) * s) / steps)
      }
    }
  })
  return { n, half, cells }
}

function cellBlocked(g: Grid, x: number, z: number) {
  const i = Math.floor((x + g.half) / CELL)
  const j = Math.floor((z + g.half) / CELL)
  if (i < 0 || j < 0 || i >= g.n || j >= g.n) return true
  return g.cells[j * g.n + i] === 1
}

function blocked(g: Grid, x: number, z: number, limit: number) {
  if (Math.hypot(x, z) > limit) return true
  for (let k = 0; k < 9; k++) {
    const ang = (k / 8) * Math.PI * 2
    const r = k === 8 ? 0 : BODY_R
    if (cellBlocked(g, x + Math.cos(ang) * r, z + Math.sin(ang) * r)) return true
  }
  return false
}

function carBlocked(g: Grid, x: number, z: number, yaw: number, limit: number) {
  if (Math.hypot(x, z) > limit) return true
  const sn = Math.sin(yaw)
  const cs = Math.cos(yaw)
  for (const [lx, lz] of CAR_PTS) {
    // local (lx: left, lz: forward) → building frame
    const wx = x + lx * cs + lz * sn
    const wz = z - lx * sn + lz * cs
    if (cellBlocked(g, wx, wz)) return true
  }
  return false
}

interface Common {
  m: Mini
  grid: Grid
  limit: number
  ring: THREE.Mesh
  contact: THREE.Mesh
  pos: THREE.Vector2
  yaw: number
  target: THREE.Vector2 | null
  stuck: number
}
interface FootState extends Common {
  kind: 'foot'
  parts: Figure
  phase: number
  speed: number
}
interface CarState extends Common {
  kind: 'car'
  car: Car
  vel: THREE.Vector2
  steer: number
  spin: number
  cam: THREE.Vector3 | null
  skids: THREE.InstancedMesh
  skidN: number
  skidT: number
}
type State = FootState | CarState

export function Walker() {
  const active = useStore((s) => s.walk.active)
  const eye = useStore((s) => s.walk.eye)
  const carMode = useStore((s) => !!s.walk.car)
  const selectedId = useStore((s) => s.selectedId)
  const { camera, gl } = useThree()
  const st = useRef<State | null>(null)
  const keys = useRef(new Set<string>())
  const pending = useRef(false)

  // keyboard
  useEffect(() => {
    if (!active) return
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, textarea, select')
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      keys.current.add(e.code)
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.current.clear()
    }
  }, [active])

  // start / stop (also when switching between foot and car)
  useEffect(() => {
    if (!active) return
    pending.current = true
    return () => {
      pending.current = false
      const s = st.current
      if (s) {
        s.m.turn.remove(s.ring, s.contact)
        s.contact.geometry.dispose()
        ;(s.contact.material as THREE.Material).dispose()
        s.ring.geometry.dispose()
        ;(s.ring.material as THREE.Material).dispose()
        if (s.kind === 'foot') {
          s.m.turn.remove(s.parts.root)
          s.parts.dispose()
        } else {
          s.m.turn.remove(s.car.root, s.skids)
          s.car.dispose()
          s.skids.geometry.dispose()
          ;(s.skids.material as THREE.Material).dispose()
        }
        st.current = null
        if (!useStore.getState().walk.active) useStore.getState().command({ kind: 'preset', preset: 'reset' })
      }
    }
  }, [active, selectedId, carMode])

  // pointer: hover ring + click / tap to walk or drive there
  useEffect(() => {
    if (!active) return
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let downAt: [number, number] | null = null
    const groundHit = (e: PointerEvent) => {
      const s = st.current
      if (!s) return null
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      s.m.root.updateMatrixWorld(true)
      const planeY = s.m.root.position.y
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)
      const hit = ray.ray.intersectPlane(plane, new THREE.Vector3())
      if (!hit) return null
      const local = s.m.turn.worldToLocal(hit)
      if (Math.hypot(local.x, local.z) > s.limit) return null
      return local
    }
    const move = (e: PointerEvent) => {
      const s = st.current
      if (!s || e.buttons) return
      const p = groundHit(e)
      s.ring.visible = !!p
      if (p) s.ring.position.set(p.x, 0.03, p.z)
    }
    const down = (e: PointerEvent) => (downAt = [e.clientX, e.clientY])
    const upH = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return
      const p = groundHit(e)
      const s = st.current
      if (p && s && !blocked(s.grid, p.x, p.z, s.limit)) {
        s.target = new THREE.Vector2(p.x, p.z)
        s.stuck = 0
      }
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', upH)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', upH)
    }
  }, [active, camera, gl])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = runtime.controls
    if (!active || !c) return
    // initialise once the building is ready (at true scale, on the ground)
    if (pending.current && !st.current) {
      const m = getMini(selectedId)
      if (!m || m.state !== 'ready' || m.s > 1.05) return
      const size = Math.max(m.size.x, m.size.z)
      const limit = carMode ? Math.max(120, size * 1.4 + 70) : Math.max(m.plinthR + 12, size * 1.1 + 30)
      const grid = buildGrid(m, limit + 3)
      const contact = new THREE.Mesh(
        carMode ? new THREE.PlaneGeometry(2.1, 5.0).rotateX(-Math.PI / 2) : new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#1b1915', transparent: true, opacity: carMode ? 0.32 : 0.2, depthWrite: false }),
      )
      const ring = new THREE.Mesh(new THREE.RingGeometry(carMode ? 0.9 : 0.26, carMode ? 1.1 : 0.34, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#c1a163', transparent: true, opacity: 0.9, depthWrite: false }))
      ring.visible = false
      // spawn in front of the main façade, facing the building
      const [fx, fz] = m.mod?.front ?? [0, 1]
      const fl = Math.hypot(fx, fz) || 1
      const reach = size / 2
      let pos = new THREE.Vector2(0, 0)
      for (let k = 0; k < 64; k++) {
        const ang = Math.atan2(fz / fl, fx / fl) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2
        const r = Math.min(reach + (carMode ? 12 : 4), limit - 3)
        const cand = new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r)
        const yaw0 = Math.atan2(-cand.x, -cand.y)
        if (carMode ? !carBlocked(grid, cand.x, cand.y, yaw0, limit) : !blocked(grid, cand.x, cand.y, limit)) {
          pos = cand
          break
        }
      }
      // the figure faces the building; the car starts tangentially, ready to drive around it
      const yaw = Math.atan2(-pos.x, -pos.y) + (carMode ? Math.PI / 2 : 0)
      if (carMode) {
        const car = makeCar()
        const skids = new THREE.InstancedMesh(
          new THREE.PlaneGeometry(0.22, 0.95).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: '#16130f', transparent: true, opacity: 0.42, depthWrite: false }),
          SKIDS,
        )
        const hide = new THREE.Matrix4().makeScale(0, 0, 0)
        for (let i = 0; i < SKIDS; i++) skids.setMatrixAt(i, hide)
        skids.frustumCulled = false
        m.turn.add(car.root, ring, contact, skids)
        st.current = { kind: 'car', m, grid, limit, ring, contact, pos, yaw, target: null, stuck: 0, car, vel: new THREE.Vector2(), steer: 0, spin: 0, cam: null, skids, skidN: 0, skidT: 0 }
      } else {
        const parts = makeFigure()
        m.turn.add(parts.root, ring, contact)
        st.current = { kind: 'foot', m, grid, limit, ring, contact, pos, yaw, target: null, stuck: 0, parts, phase: 0, speed: 0 }
        // camera: behind the figure, looking past it to the building
        m.root.updateMatrixWorld(true)
        const head = m.turn.localToWorld(new THREE.Vector3(pos.x, HEAD, pos.y))
        const out = pos.clone().normalize()
        if (!out.lengthSq()) out.set(0, 1)
        const behind = m.turn.localToWorld(new THREE.Vector3(pos.x + out.x * 4.6, HEAD + 1.5, pos.y + out.y * 4.6))
        c.setLookAt(behind.x, behind.y, behind.z, head.x, head.y, head.z, false)
      }
      pending.current = false
    }
    const s = st.current
    if (!s) return
    if (s.kind === 'car') driveFrame(s, dt, c)
    else walkFrame(s, dt, c)
  })

  function walkFrame(s: FootState, dt: number, c: NonNullable<typeof runtime.controls>) {
    const { m, parts } = s
    const k = keys.current
    const fwdIn = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const sideIn = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    const run = k.has('ShiftLeft') || k.has('ShiftRight') || !!useStore.getState().walk.run
    const dir = new THREE.Vector2()
    if (fwdIn || sideIn) {
      s.target = null
      // camera forward projected on the ground, expressed in the building's local frame
      const az = c.azimuthAngle - m.turn.rotation.y
      const f = new THREE.Vector2(-Math.sin(az), -Math.cos(az))
      const r = new THREE.Vector2(Math.cos(az), -Math.sin(az))
      dir.addScaledVector(f, fwdIn).addScaledVector(r, sideIn)
    } else if (s.target) {
      dir.subVectors(s.target, s.pos)
      if (dir.length() < 0.12) {
        s.target = null
        dir.set(0, 0)
      }
    }
    const want = dir.lengthSq() > 0 ? (run ? RUN : WALK) : 0
    s.speed += (want - s.speed) * Math.min(1, dt * 8)
    if (dir.lengthSq() > 0 && s.speed > 0.01) {
      dir.normalize()
      const step = dir.clone().multiplyScalar(s.speed * dt)
      const next = s.pos.clone().add(step)
      const prev = s.pos.clone()
      if (!blocked(s.grid, next.x, next.y, s.limit)) s.pos.copy(next)
      else if (!blocked(s.grid, s.pos.x + step.x, s.pos.y, s.limit)) s.pos.x += step.x
      else if (!blocked(s.grid, s.pos.x, s.pos.y + step.y, s.limit)) s.pos.y += step.y
      const moved = s.pos.distanceTo(prev)
      if (s.target && moved < 1e-4) {
        s.stuck += dt
        if (s.stuck > 0.4) s.target = null
      }
      const targetYaw = Math.atan2(dir.x, dir.y)
      let dy = targetYaw - s.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      s.yaw += dy * Math.min(1, dt * 10)
    }
    // gait
    const gait = Math.min(1, s.speed / WALK)
    const runBlend = THREE.MathUtils.clamp((s.speed - WALK) / (RUN - WALK), 0, 1)
    // cadence rises less than speed when running (longer strides)
    s.phase += dt * (1.6 + Math.min(s.speed, 2.2) * 2.1 + runBlend * 3.2) * Math.min(1, gait * 3)
    parts.pose(s.phase, gait, performance.now() / 1000, runBlend)
    parts.root.position.set(s.pos.x, 0, s.pos.y)
    parts.root.rotation.y = s.yaw
    parts.root.visible = !eye
    s.contact.position.set(s.pos.x, 0.012, s.pos.y)
    // camera follows the head
    m.root.updateMatrixWorld(true)
    const head = m.turn.localToWorld(new THREE.Vector3(s.pos.x, eye ? 1.62 : HEAD, s.pos.y))
    c.moveTo(head.x, head.y, head.z, false)
  }

  function driveFrame(s: CarState, dt: number, c: NonNullable<typeof runtime.controls>) {
    const { m, car } = s
    const k = keys.current
    let thr = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    let steerIn = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0)
    const hb = k.has('Space')
    const turbo = k.has('ShiftLeft') || k.has('ShiftRight') || !!useStore.getState().walk.run
    const fwd = new THREE.Vector2(Math.sin(s.yaw), Math.cos(s.yaw))
    const left = new THREE.Vector2(Math.cos(s.yaw), -Math.sin(s.yaw))
    // tap / click: drive there
    if (thr || steerIn) s.target = null
    else if (s.target) {
      const to = s.target.clone().sub(s.pos)
      const dist = to.length()
      if (dist < 4) s.target = null
      else {
        const ang = Math.atan2(to.dot(left), to.dot(fwd))
        steerIn = THREE.MathUtils.clamp(ang * 2, -1, 1)
        thr = dist > 10 ? 1 : 0.4
      }
    }
    let vF = s.vel.dot(fwd)
    let vL = s.vel.dot(left)
    // longitudinal
    if (thr > 0) vF += (turbo ? ACC_TURBO : ACC) * thr * dt
    else if (thr < 0) vF -= (vF > 0.5 ? BRAKE : REV) * dt
    else vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.4 * dt)
    if (hb) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 7 * dt)
    vF = THREE.MathUtils.clamp(vF, -9, turbo ? V_TURBO : Math.max(V_MAX, Math.min(vF, V_TURBO) - 6 * dt))
    // steering: tighter at low speed, calmer at high speed
    const maxSteer = 0.62 / (1 + Math.abs(vF) / 22)
    s.steer += (steerIn * maxSteer - s.steer) * Math.min(1, dt * 7)
    // lateral grip: the handbrake or hard steering at speed lets the rear step out (drift)
    let grip = 8
    if (hb) grip = 0.8
    else if (Math.abs(vF) > 15 && Math.abs(s.steer) > 0.14 && thr > 0) grip = 1.9
    vL *= Math.exp(-grip * dt)
    s.vel.copy(fwd).multiplyScalar(vF).addScaledVector(left, vL)
    let yawRate = (vF * Math.tan(s.steer)) / WHEELBASE
    if (hb) yawRate *= 1.7
    // move with collision response
    const next = s.pos.clone().addScaledVector(s.vel, dt)
    const nextYaw = s.yaw + yawRate * dt
    if (!carBlocked(s.grid, next.x, next.y, nextYaw, s.limit)) {
      s.pos.copy(next)
      s.yaw = nextYaw
    } else if (!carBlocked(s.grid, s.pos.x, s.pos.y, nextYaw, s.limit)) {
      s.yaw = nextYaw
      s.vel.multiplyScalar(-0.25)
    } else s.vel.multiplyScalar(-0.25)
    // skid marks while sliding
    const slide = Math.abs(vL) > 2.4 || (hb && Math.abs(vF) > 4)
    s.skidT += dt
    if (slide && s.skidT > 0.018) {
      s.skidT = 0
      const sn = Math.sin(s.yaw)
      const cs = Math.cos(s.yaw)
      const mtx = new THREE.Matrix4()
      for (const lx of [0.81, -0.81]) {
        const wx = s.pos.x + lx * cs - 1.42 * sn
        const wz = s.pos.y - lx * sn - 1.42 * cs
        mtx.makeRotationY(Math.atan2(s.vel.x, s.vel.y)).setPosition(wx, 0.015, wz)
        s.skids.setMatrixAt(s.skidN % SKIDS, mtx)
        s.skidN++
      }
      s.skids.instanceMatrix.needsUpdate = true
    }
    // car pose
    s.spin += (vF * dt) / 0.34
    car.update(s.steer, s.spin, thr < 0 && vF > 0.5)
    car.root.position.set(s.pos.x, 0, s.pos.y)
    car.root.rotation.y = s.yaw
    car.root.rotation.z = THREE.MathUtils.clamp(-vL * 0.008, -0.05, 0.05) // body roll in slides
    car.root.visible = !eye
    s.contact.position.set(s.pos.x, 0.012, s.pos.y)
    s.contact.rotation.y = s.yaw
    // camera: chase (or cockpit), following the car's heading with a little lag
    m.root.updateMatrixWorld(true)
    const sn = Math.sin(s.yaw)
    const cs = Math.cos(s.yaw)
    const speed = s.vel.length()
    let camL: THREE.Vector3
    let lookL: THREE.Vector3
    if (eye) {
      camL = new THREE.Vector3(s.pos.x + 0.36 * cs + 0.05 * sn, 1.16, s.pos.y - 0.36 * sn + 0.05 * cs)
      lookL = new THREE.Vector3(s.pos.x + sn * 25, 1.0, s.pos.y + cs * 25)
      s.cam = camL.clone()
    } else {
      const back = 8.6 + speed * 0.08
      const want = new THREE.Vector3(s.pos.x - sn * back, 3.0 + speed * 0.03, s.pos.y - cs * back)
      if (!s.cam) s.cam = want.clone()
      s.cam.lerp(want, 1 - Math.exp(-dt * 4.5))
      camL = s.cam
      lookL = new THREE.Vector3(s.pos.x + sn * 2.5, 1.1, s.pos.y + cs * 2.5)
    }
    const cw = m.turn.localToWorld(camL.clone())
    const lw = m.turn.localToWorld(lookL)
    c.setLookAt(cw.x, cw.y, cw.z, lw.x, lw.y, lw.z, false)
  }

  return null
}
