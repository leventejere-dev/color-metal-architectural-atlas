/**
 * Walk-around (on foot) and drive (COLOR METAL flatbed truck) modes.
 *
 * On foot: a 1.75 m figure at true scale (1:1) around the selected building — click / tap to
 * walk there, W A S D / arrows (Shift or the run toggle = run), drag to look around, optional
 * eye level. No invisible limits: off the levelled plateau the figure follows the terrain.
 *
 * By truck: across the whole country, from reference building to reference building.
 * W / S throttle · brake / reverse, A / D steer, Space = handbrake (drift), Shift = turbo,
 * wheel or + / − = travel scale, click / tap = drive there; chase or cab view.
 * The travel scale follows the chase distance with the same rule as the miniatures: close
 * up the truck is at true scale (1:1) beside true-scale buildings; zoomed out it becomes a
 * symbolic map vehicle that crosses Romania in well under a minute. The only boundary is the
 * visible edge of the relief.
 *
 * Collisions: near a building the model is sliced at 0.4 m and 1.2 m into a 20 cm occupancy
 * grid (figure and truck bounce off walls instead of passing through); far symbolic
 * miniatures are round obstacles.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { allMinis, getMini, symbolicPx, trueCentre, type Mini } from './Miniatures'
import { groundY, runtime } from './runtime'
import { makeFigure, type Figure } from './figure'
import { makeCar, CAR_DIMS, CAR_EYE, type Car } from './car'

const CELL = 0.2 // m
const BODY_R = 0.3 // m
const WALK = 1.4 // m/s
const RUN = 6.5 // m/s (fast run)
const HEAD = 1.62 // m (camera target)

// truck (arcade bicycle model, car-space metres and m/s; the world step is scaled by the travel scale)
const V_MAX = 30 // m/s ≈ 108 km/h
const V_TURBO = 46 // m/s ≈ 165 km/h
const ACC = 9
const ACC_TURBO = 16
const BRAKE = 18
const REV = 7
const SKIDS = 1600
const CHASE_D = 0.017 // km behind the truck at true scale (travel zoom 1)
const ZOOM_MAX = 4000

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

/** occupied cell (outside the grid = open ground) */
function cellBlocked(g: Grid, x: number, z: number) {
  const i = Math.floor((x + g.half) / CELL)
  const j = Math.floor((z + g.half) / CELL)
  if (i < 0 || j < 0 || i >= g.n || j >= g.n) return false
  return g.cells[j * g.n + i] === 1
}

function blocked(g: Grid, x: number, z: number) {
  for (let k = 0; k < 9; k++) {
    const ang = (k / 8) * Math.PI * 2
    const r = k === 8 ? 0 : BODY_R
    if (cellBlocked(g, x + Math.cos(ang) * r, z + Math.sin(ang) * r)) return true
  }
  return false
}

/** collision outline of the truck (local metres: x = left, z = forward) */
function truckPts(): [number, number][] {
  const L = CAR_DIMS.length / 2
  const W = CAR_DIMS.width / 2
  return [
    [W, L],
    [-W, L],
    [W, -L],
    [-W, -L],
    [W, 0],
    [-W, 0],
    [W, L / 2],
    [-W, L / 2],
    [W, -L / 2],
    [-W, -L / 2],
    [0, L + 0.05],
    [0, -L - 0.05],
  ]
}

interface FootState {
  kind: 'foot'
  m: Mini
  grid: Grid
  ring: THREE.Mesh
  contact: THREE.Mesh
  pos: THREE.Vector2
  yaw: number
  target: THREE.Vector2 | null
  stuck: number
  parts: Figure
  phase: number
  speed: number
}
interface TruckState {
  kind: 'car'
  group: THREE.Group
  car: Car
  ring: THREE.Mesh
  pts: [number, number][]
  /** world km (x, z); yaw: forward = (sin yaw, cos yaw) */
  pos: THREE.Vector2
  yaw: number
  /** car-space velocity (m/s) in world directions */
  vel: THREE.Vector2
  vF0: number
  vL0: number
  steer: number
  spin: number
  pitch: number
  roll: number
  /** chase distance (km) and travel scale */
  dCam: number
  S: number
  cam: THREE.Vector3 | null
  target: THREE.Vector2 | null
  skids: THREE.InstancedMesh
  skidN: number
  skidT: number
  grids: Map<string, Grid>
  /** selection when the drive started (a new selection on exit means a flight is already under way) */
  selAtStart: string | null
}
type State = FootState | TruckState

const v3 = new THREE.Vector3()
const mtx = new THREE.Matrix4()
const quat = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)

export function Walker() {
  const active = useStore((s) => s.walk.active)
  const eye = useStore((s) => s.walk.eye)
  const carMode = useStore((s) => !!s.walk.car)
  const selectedId = useStore((s) => s.selectedId)
  const { camera, gl, scene, size } = useThree()
  const st = useRef<State | null>(null)
  const keys = useRef(new Set<string>())
  const pending = useRef(false)

  // keyboard (+ / − set the truck's travel scale)
  useEffect(() => {
    if (!active) return
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, textarea, select')
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      keys.current.add(e.code)
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault()
      if (useStore.getState().walk.car) {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') runtime.driveZoom = Math.max(1, runtime.driveZoom / 1.6)
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') runtime.driveZoom = Math.min(ZOOM_MAX, runtime.driveZoom * 1.6)
      }
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

  // start / stop (also when switching between foot and truck)
  useEffect(() => {
    if (!active) return
    pending.current = true
    return () => {
      pending.current = false
      const s = st.current
      if (!s) return
      if (s.kind === 'foot') {
        s.m.turn.remove(s.ring, s.contact, s.parts.root)
        s.contact.geometry.dispose()
        ;(s.contact.material as THREE.Material).dispose()
        s.ring.geometry.dispose()
        ;(s.ring.material as THREE.Material).dispose()
        s.parts.dispose()
        st.current = null
        if (!useStore.getState().walk.active) useStore.getState().command({ kind: 'preset', preset: 'reset' })
        return
      }
      scene.remove(s.group, s.ring, s.skids)
      s.car.dispose()
      s.ring.geometry.dispose()
      ;(s.ring.material as THREE.Material).dispose()
      s.skids.geometry.dispose()
      ;(s.skids.material as THREE.Material).dispose()
      st.current = null
      runtime.flatSite = null
      runtime.driveNear = null
      runtime.driveScale = 1
      const store = useStore.getState()
      if (store.walk.active) return // switching to foot
      if (store.selectedId && store.selectedId !== s.selAtStart) return // opened another building: its flight is under way
      // back at the selected building → its model view; anywhere else → the map above the truck
      const sel = getMini(store.selectedId)
      const near = sel && Math.hypot(sel.tx - s.pos.x, sel.tz - s.pos.y) < 0.35 && s.S < 2
      if (near) store.command({ kind: 'preset', preset: 'reset' })
      else {
        if (store.selectedId) store.select(null, { fly: false })
        const c = runtime.controls
        if (c) {
          const d = Math.max(2.6, s.dCam * 3)
          const gy = groundY(s.pos.x, s.pos.y) ?? 0
          const az = c.azimuthAngle
          const pol = 0.85
          c.setLookAt(s.pos.x + Math.sin(az) * Math.sin(pol) * d, gy + Math.cos(pol) * d, s.pos.y + Math.cos(az) * Math.sin(pol) * d, s.pos.x, gy, s.pos.y, true)
        }
      }
    }
  }, [active, selectedId, carMode, scene])

  // pointer: hover ring + click / tap to walk or drive there; wheel = travel scale
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
      if (s.kind === 'car') {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -s.group.position.y)
        return ray.ray.intersectPlane(plane, new THREE.Vector3())
      }
      s.m.root.updateMatrixWorld(true)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -s.m.root.position.y)
      const hit = ray.ray.intersectPlane(plane, new THREE.Vector3())
      return hit ? s.m.turn.worldToLocal(hit) : null
    }
    const move = (e: PointerEvent) => {
      const s = st.current
      if (!s || e.buttons) return
      const p = groundHit(e)
      s.ring.visible = !!p
      if (!p) return
      if (s.kind === 'car') {
        s.ring.position.set(p.x, p.y + 0.00004 * s.S, p.z)
        s.ring.scale.setScalar(0.001 * s.S)
      } else s.ring.position.set(p.x, 0.03, p.z)
    }
    const down = (e: PointerEvent) => (downAt = [e.clientX, e.clientY])
    const upH = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return
      const p = groundHit(e)
      const s = st.current
      if (!p || !s) return
      if (s.kind === 'car') s.target = new THREE.Vector2(p.x, p.z)
      else if (!blocked(s.grid, p.x, p.z)) {
        s.target = new THREE.Vector2(p.x, p.z)
        s.stuck = 0
      }
    }
    const wheel = (e: WheelEvent) => {
      if (!useStore.getState().walk.car) return
      e.preventDefault()
      runtime.driveZoom = THREE.MathUtils.clamp(runtime.driveZoom * Math.exp(e.deltaY * 0.0016), 1, ZOOM_MAX)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', upH)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', upH)
      el.removeEventListener('wheel', wheel)
    }
  }, [active, camera, gl])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const c = runtime.controls
    if (!active || !c) return
    if (pending.current && !st.current) {
      if (carMode) startTruck(c)
      else startFoot(c)
    }
    const s = st.current
    if (!s) return
    if (s.kind === 'car') driveFrame(s, dt, c)
    else walkFrame(s, dt, c)
  })

  function startFoot(c: NonNullable<typeof runtime.controls>) {
    const m = getMini(selectedId)
    if (!m || m.state !== 'ready' || m.s > 1.05) return
    const size = Math.max(m.size.x, m.size.z)
    const grid = buildGrid(m, Math.max(60, m.rFoot + 25))
    const contact = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1b1915', transparent: true, opacity: 0.2, depthWrite: false }))
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#c1a163', transparent: true, opacity: 0.9, depthWrite: false }))
    ring.visible = false
    // spawn in front of the main façade, facing the building
    const [fx, fz] = m.mod?.front ?? [0, 1]
    const fl = Math.hypot(fx, fz) || 1
    let pos = new THREE.Vector2(0, 0)
    for (let k = 0; k < 64; k++) {
      const ang = Math.atan2(fz / fl, fx / fl) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2
      const r = size / 2 + 4
      const cand = new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r)
      if (!blocked(grid, cand.x, cand.y)) {
        pos = cand
        break
      }
    }
    const yaw = Math.atan2(-pos.x, -pos.y)
    const parts = makeFigure()
    m.turn.add(parts.root, ring, contact)
    st.current = { kind: 'foot', m, grid, ring, contact, pos, yaw, target: null, stuck: 0, parts, phase: 0, speed: 0 }
    // camera: behind the figure, looking past it to the building
    m.root.updateMatrixWorld(true)
    const head = m.turn.localToWorld(new THREE.Vector3(pos.x, HEAD, pos.y))
    const out = pos.clone().normalize()
    if (!out.lengthSq()) out.set(0, 1)
    const behind = m.turn.localToWorld(new THREE.Vector3(pos.x + out.x * 4.6, HEAD + 1.5, pos.y + out.y * 4.6))
    c.setLookAt(behind.x, behind.y, behind.z, head.x, head.y, head.z, false)
    pending.current = false
  }

  function startTruck(c: NonNullable<typeof runtime.controls>) {
    const t = runtime.terrain
    if (!t) return
    const pts = truckPts()
    const grids = new Map<string, Grid>()
    let pos: THREE.Vector2 | null = null
    let yaw = 0
    const m = getMini(selectedId)
    if (m && m.state === 'ready' && useStore.getState().mode === 'inspect') {
      if (m.s > 1.05) return // wait for the true-scale model view
      // beside the main façade, tangential, ready to drive around the building
      runtime.driveZoom = 1
      const [fx, fz] = m.mod?.front ?? [0, 1]
      const fl = Math.hypot(fx, fz) || 1
      m.root.updateMatrixWorld(true)
      for (let k = 0; k < 72 && !pos; k++) {
        const ang = Math.atan2(fz / fl, fx / fl) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.18
        const r = Math.max(m.size.x, m.size.z) / 2 + 9 + Math.floor(k / 24) * 8
        const local = new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r)
        const w = m.turn.localToWorld(local.clone())
        const yawW = Math.atan2(-local.x, -local.z) + Math.PI / 2 + m.turn.rotation.y
        if (!truckHits(w.x, w.z, yawW, 1, pts, grids)) {
          pos = new THREE.Vector2(w.x, w.z)
          yaw = yawW
        }
      }
    }
    if (!pos) {
      // from the map: at the centre of the view, facing away from the camera
      const tg = c.getTarget(new THREE.Vector3())
      runtime.driveZoom = THREE.MathUtils.clamp(c.distance / 6 / CHASE_D, 1, 1200)
      pos = new THREE.Vector2(tg.x, tg.z)
      if (!t.inside(pos.x, pos.y)) pos.set(6, 34)
      yaw = c.azimuthAngle + Math.PI
    }
    const car = makeCar()
    const group = new THREE.Group()
    group.add(car.root)
    group.rotation.order = 'YXZ'
    const skids = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.26, 1.0).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#16130f', transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      SKIDS,
    )
    const hide = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < SKIDS; i++) skids.setMatrixAt(i, hide)
    skids.frustumCulled = false
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#c1a163', transparent: true, opacity: 0.9, depthWrite: false }))
    ring.visible = false
    scene.add(group, ring, skids)
    const dCam = CHASE_D * runtime.driveZoom
    st.current = {
      kind: 'car',
      group,
      car,
      ring,
      pts,
      pos,
      yaw,
      vel: new THREE.Vector2(),
      vF0: 0,
      vL0: 0,
      steer: 0,
      spin: 0,
      pitch: 0,
      roll: 0,
      dCam,
      S: 1,
      cam: null,
      target: null,
      skids,
      skidN: 0,
      skidT: 0,
      grids,
      selAtStart: useStore.getState().selectedId,
    }
    pending.current = false
  }

  /** does the truck (world km, yaw, travel scale S) hit the relief edge or a building? */
  function truckHits(x: number, z: number, yaw: number, S: number, pts: [number, number][], grids: Map<string, Grid>) {
    const t = runtime.terrain!
    const k = 0.001 * S
    const sn = Math.sin(yaw)
    const cs = Math.cos(yaw)
    const world = pts.map(([lx, lz]) => [x + (lx * cs + lz * sn) * k, z + (-lx * sn + lz * cs) * k] as const)
    for (const [wx, wz] of world) if (!t.inside(wx, wz)) return true
    const carR = (CAR_DIMS.length / 2) * k
    for (const m of allMinis()) {
      if (m.hidden || !m.shown || !m.root.visible) continue
      const rKm = (m.rFoot / 1000) * m.s
      const fx = m.tx + m.foot.x * 0.001 * m.s
      const fz = m.tz + m.foot.y * 0.001 * m.s
      const d = Math.hypot(x - fx, z - fz)
      if (d > rKm + carR) continue
      if (m.s < 3) {
        // precise: the building's occupancy grid (its own frame, any presentation scale)
        let g = grids.get(m.p.id)
        if (!g) {
          g = buildGrid(m, m.rFoot + 3)
          grids.set(m.p.id, g)
        }
        m.root.updateMatrixWorld(true)
        for (const [wx, wz] of world) {
          const l = m.turn.worldToLocal(v3.set(wx, m.root.position.y, wz))
          if (cellBlocked(g, l.x, l.z)) return true
        }
      } else if (d < rKm * 0.7 + carR * 0.5) return true
    }
    return false
  }

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
    m.root.updateMatrixWorld(true)
    const inside = (x: number, z: number) => {
      const w = m.turn.localToWorld(v3.set(x, 0, z))
      return runtime.terrain?.inside(w.x, w.z) ?? false
    }
    if (dir.lengthSq() > 0 && s.speed > 0.01) {
      dir.normalize()
      const step = dir.clone().multiplyScalar(s.speed * dt)
      const next = s.pos.clone().add(step)
      const prev = s.pos.clone()
      const ok = (x: number, z: number) => !blocked(s.grid, x, z) && inside(x, z)
      if (ok(next.x, next.y)) s.pos.copy(next)
      else if (ok(s.pos.x + step.x, s.pos.y)) s.pos.x += step.x
      else if (ok(s.pos.x, s.pos.y + step.y)) s.pos.y += step.y
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
    // ground under the figure (off the plateau it follows the terrain)
    const w = m.turn.localToWorld(v3.set(s.pos.x, 0, s.pos.y))
    const gy = groundY(w.x, w.z)
    const ly = gy === null ? 0 : (gy - m.root.position.y) / (0.001 * m.s)
    // gait
    const gait = Math.min(1, s.speed / WALK)
    const runBlend = THREE.MathUtils.clamp((s.speed - WALK) / (RUN - WALK), 0, 1)
    s.phase += dt * (1.6 + Math.min(s.speed, 2.2) * 2.1 + runBlend * 3.2) * Math.min(1, gait * 3)
    parts.pose(s.phase, gait, performance.now() / 1000, runBlend)
    parts.root.position.set(s.pos.x, ly, s.pos.y)
    parts.root.rotation.y = s.yaw
    parts.root.visible = !eye
    s.contact.position.set(s.pos.x, ly + 0.012, s.pos.y)
    // camera follows the head
    const head = m.turn.localToWorld(new THREE.Vector3(s.pos.x, ly + (eye ? 1.62 : HEAD), s.pos.y))
    c.moveTo(head.x, head.y, head.z, false)
  }

  function driveFrame(s: TruckState, dt: number, c: NonNullable<typeof runtime.controls>) {
    const { car } = s
    const t = runtime.terrain!
    const k = keys.current
    let thr = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    let steerIn = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0)
    const hb = k.has('Space')
    const turbo = k.has('ShiftLeft') || k.has('ShiftRight') || !!useStore.getState().walk.run
    const fwd = new THREE.Vector2(Math.sin(s.yaw), Math.cos(s.yaw))
    const left = new THREE.Vector2(Math.cos(s.yaw), -Math.sin(s.yaw))

    // travel scale: chase distance (wheel / ± / speed) → the same symbolic rule as the miniatures
    const cam = camera as THREE.PerspectiveCamera
    const speedAbs = s.vel.length()
    const spd = Math.min(1, speedAbs / V_MAX)
    const dWant = CHASE_D * runtime.driveZoom * (1 + 0.45 * Math.pow(spd, 1.5))
    s.dCam += (dWant - s.dCam) * (1 - Math.exp(-dt * 2.2))
    const wpp = (2 * s.dCam * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / size.height
    s.S = Math.max(1, (0.9 * symbolicPx(s.dCam) * wpp) / (CAR_DIMS.length / 1000))
    runtime.driveScale = s.S
    const kS = 0.001 * s.S

    // tap / click: drive there
    if (thr || steerIn) s.target = null
    else if (s.target) {
      const to = s.target.clone().sub(s.pos).divideScalar(kS) // car-space metres
      const dist = to.length()
      if (dist < 5) s.target = null
      else {
        const ang = Math.atan2(to.dot(left), to.dot(fwd))
        steerIn = THREE.MathUtils.clamp(ang * 2, -1, 1)
        thr = dist > 12 ? 1 : 0.4
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
    const maxSteer = 0.6 / (1 + Math.abs(vF) / 22)
    s.steer += (steerIn * maxSteer - s.steer) * Math.min(1, dt * 7)
    // lateral grip: the handbrake or hard steering at speed lets the rear step out (drift)
    let grip = 8
    if (hb) grip = 0.8
    else if (Math.abs(vF) > 15 && Math.abs(s.steer) > 0.13 && thr > 0) grip = 1.9
    vL *= Math.exp(-grip * dt)
    s.vel.copy(fwd).multiplyScalar(vF).addScaledVector(left, vL)
    let yawRate = (vF * Math.tan(s.steer)) / CAR_DIMS.wheelbase
    if (hb) yawRate *= 1.7

    // move (world step scaled by the travel scale) with collision response
    let impact = 0
    const next = s.pos.clone().addScaledVector(s.vel, kS * dt)
    const nextYaw = s.yaw + yawRate * dt
    if (!truckHits(next.x, next.y, nextYaw, s.S, s.pts, s.grids)) {
      s.pos.copy(next)
      s.yaw = nextYaw
    } else {
      impact = speedAbs * 1.25
      if (!truckHits(s.pos.x, s.pos.y, nextYaw, s.S, s.pts, s.grids)) s.yaw = nextYaw
      s.vel.multiplyScalar(-0.25)
      vF = s.vel.dot(fwd)
      vL = s.vel.dot(left)
    }
    if (s.target && impact) s.target = null

    // the building nearest the truck: levelled ground (when close to true scale) and the HUD
    let near: Mini | null = null
    let nd = Infinity
    for (const m of allMinis()) {
      if (m.hidden || m.state !== 'ready') continue
      const d = Math.hypot(m.tx - s.pos.x, m.tz - s.pos.y) - (m.rFoot / 1000) * m.s
      if (d < nd) {
        nd = d
        near = m
      }
    }
    const nearOk = near && nd < Math.max(0.3, s.dCam * 6)
    runtime.driveNear = nearOk ? { id: near!.p.id, distM: Math.max(0, nd * 1000) } : null
    if (nearOk && s.S < 4 && near!.s < 1.6 && nd < 0.6) {
      if (runtime.flatSite?.id !== near!.p.id) runtime.flatSite = { id: near!.p.id, center: trueCentre(near!), sizeKm: Math.max(near!.size.x, near!.size.z) / 1000 }
    } else if (runtime.flatSite && (s.S > 6 || nd > 1.2)) runtime.flatSite = null

    // ground, pitch and roll from the rendered relief under the (scaled) wheels
    const gy = groundY(s.pos.x, s.pos.y) ?? s.group.position.y
    const hl = CAR_DIMS.wheelbase * 0.5 * kS
    const hw = CAR_DIMS.trackHalf * kS
    const g = (dx: number, dz: number) => groundY(s.pos.x + dx, s.pos.y + dz) ?? gy
    const hf = g(fwd.x * hl, fwd.y * hl)
    const hbk = g(-fwd.x * hl, -fwd.y * hl)
    const hL = g(left.x * hw, left.y * hw)
    const hR = g(-left.x * hw, -left.y * hw)
    const pitchT = THREE.MathUtils.clamp(Math.atan2(hf - hbk, 2 * hl), -0.4, 0.4)
    const rollT = THREE.MathUtils.clamp(Math.atan2(hL - hR, 2 * hw), -0.4, 0.4)
    s.pitch += (pitchT - s.pitch) * Math.min(1, dt * 10)
    s.roll += (rollT - s.roll) * Math.min(1, dt * 10)

    // skid marks while sliding
    const slide = Math.abs(vL) > 2.4 || (hb && Math.abs(vF) > 4)
    s.skidT += dt
    if (slide && s.skidT > 0.018) {
      s.skidT = 0
      const sn = Math.sin(s.yaw)
      const cs = Math.cos(s.yaw)
      const ang = Math.atan2(s.vel.x, s.vel.y)
      quat.setFromAxisAngle(UP, ang)
      for (const lx of [CAR_DIMS.trackHalf, -CAR_DIMS.trackHalf]) {
        const wx = s.pos.x + (lx * cs + CAR_DIMS.rearAxleZ * sn) * kS
        const wz = s.pos.y + (-lx * sn + CAR_DIMS.rearAxleZ * cs) * kS
        const wy = (groundY(wx, wz) ?? gy) + 0.00002 * s.S
        mtx.compose(v3.set(wx, wy, wz), quat, new THREE.Vector3(kS, kS, kS))
        s.skids.setMatrixAt(s.skidN % SKIDS, mtx)
        s.skidN++
      }
      s.skids.instanceMatrix.needsUpdate = true
    }

    // truck pose + cargo dynamics (car-frame velocity changes; the cargo model adds the turn's own
    // pull from yawRate × speed itself)
    const aLong = (vF - s.vF0) / Math.max(dt, 1e-3)
    const aLat = (vL - s.vL0) / Math.max(dt, 1e-3)
    s.vF0 = vF
    s.vL0 = vL
    s.spin += (vF * dt) / CAR_DIMS.wheelR
    car.update(s.steer, s.spin, thr < 0 && vF > 0.5, { aLong: THREE.MathUtils.clamp(aLong, -40, 40), aLat: THREE.MathUtils.clamp(aLat, -40, 40), yawRate, speed: vF, dt, impact })
    s.group.position.set(s.pos.x, gy, s.pos.y)
    s.group.rotation.set(-s.pitch, s.yaw, s.roll + THREE.MathUtils.clamp(-vL * 0.006, -0.05, 0.05))
    s.group.scale.setScalar(kS)
    car.root.visible = !eye

    // camera: chase (or cab), following the heading with a little lag
    const sn = Math.sin(s.yaw)
    const cs = Math.cos(s.yaw)
    let camW: THREE.Vector3
    let lookW: THREE.Vector3
    if (eye) {
      s.group.updateMatrixWorld(true)
      camW = s.group.localToWorld(new THREE.Vector3(CAR_EYE.x, CAR_EYE.y, CAR_EYE.z))
      lookW = s.group.localToWorld(new THREE.Vector3(CAR_EYE.x * 0.5, CAR_EYE.y - 0.3, 40))
      s.cam = camW.clone()
    } else {
      const elev = THREE.MathUtils.lerp(0.3, 0.62, THREE.MathUtils.smoothstep(Math.log(runtime.driveZoom), 0, Math.log(500)))
      const want = new THREE.Vector3(s.pos.x - sn * s.dCam * Math.cos(elev), gy + s.dCam * Math.sin(elev), s.pos.y - cs * s.dCam * Math.cos(elev))
      if (!s.cam) s.cam = want.clone()
      s.cam.lerp(want, 1 - Math.exp(-dt * 4.5))
      const cg = groundY(s.cam.x, s.cam.z)
      const clear = Math.max(0.0015, s.dCam * 0.08)
      if (cg !== null && s.cam.y < cg + clear) s.cam.y = cg + clear
      camW = s.cam
      lookW = new THREE.Vector3(s.pos.x + sn * s.dCam * 0.18, gy + 1.3 * kS, s.pos.y + cs * s.dCam * 0.18)
    }
    c.setLookAt(camW.x, camW.y, camW.z, lookW.x, lookW.y, lookW.z, false)
    if (!t.inside(s.pos.x, s.pos.y)) s.vel.set(0, 0)
  }

  return null
}
