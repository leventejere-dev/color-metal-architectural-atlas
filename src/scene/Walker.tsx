/**
 * Walk-around mode: a 1.75 m architectural scale figure explores the selected
 * building from outside, at true scale (1:1), on its presentation base.
 *
 *  - click / tap on the ground: walk there;  W A S D / arrows: walk (Shift = run)
 *  - drag: look around the figure;  wheel / pinch: camera distance;  optional eye level
 *  - collisions: the model is sliced at body height (0.4 m and 1.2 m) into a
 *    20 cm occupancy grid, so the figure walks around walls instead of through them
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { getMini, type Mini } from './Miniatures'
import { runtime } from './runtime'
import { makeFigure, type Figure } from './figure'

const CELL = 0.2 // m
const BODY_R = 0.3 // m
const WALK = 1.4 // m/s
const RUN = 3.4 // m/s
const HEAD = 1.62 // m (camera target)

interface Grid {
  n: number
  half: number
  cells: Uint8Array
}

function buildGrid(m: Mini): Grid {
  const half = m.plinthR
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

function blocked(g: Grid, x: number, z: number, limit: number) {
  if (Math.hypot(x, z) > limit) return true
  for (let k = 0; k < 9; k++) {
    const ang = (k / 8) * Math.PI * 2
    const r = k === 8 ? 0 : BODY_R
    const i = Math.floor((x + Math.cos(ang) * r + g.half) / CELL)
    const j = Math.floor((z + Math.sin(ang) * r + g.half) / CELL)
    if (i < 0 || j < 0 || i >= g.n || j >= g.n) return true
    if (g.cells[j * g.n + i]) return true
  }
  return false
}

export function Walker() {
  const active = useStore((s) => s.walk.active)
  const eye = useStore((s) => s.walk.eye)
  const selectedId = useStore((s) => s.selectedId)
  const { camera, gl } = useThree()
  const st = useRef<null | {
    m: Mini
    grid: Grid
    limit: number
    parts: Figure
    contact: THREE.Mesh
    ring: THREE.Mesh
    pos: THREE.Vector2
    yaw: number
    target: THREE.Vector2 | null
    phase: number
    speed: number
    stuck: number
  }>(null)
  const keys = useRef(new Set<string>())
  const pending = useRef(false)

  // keyboard
  useEffect(() => {
    if (!active) return
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, textarea, select')
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      keys.current.add(e.code)
      if (e.code.startsWith('Arrow')) e.preventDefault()
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

  // start / stop
  useEffect(() => {
    if (!active) return
    pending.current = true
    return () => {
      pending.current = false
      const s = st.current
      if (s) {
        s.m.turn.remove(s.parts.root)
        s.m.turn.remove(s.ring)
        s.m.turn.remove(s.contact)
        s.parts.dispose()
        s.contact.geometry.dispose()
        ;(s.contact.material as THREE.Material).dispose()
        st.current = null
        useStore.getState().command({ kind: 'preset', preset: 'reset' })
      }
    }
  }, [active, selectedId])

  // pointer: hover ring + click to walk
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
    // initialise once the building is ready
    if (pending.current && !st.current) {
      const m = getMini(selectedId)
      if (!m || m.state !== 'ready' || m.s > 1.05) return
      const grid = buildGrid(m)
      const limit = m.plinthR - 0.8
      const parts = makeFigure()
      const contact = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2b2722', transparent: true, opacity: 0.2, depthWrite: false }))
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b99a5e', transparent: true, opacity: 0.9, depthWrite: false }))
      ring.visible = false
      m.turn.add(parts.root, ring, contact)
      // spawn in front of the main façade, looking at the building
      const [fx, fz] = m.mod?.front ?? [0, 1]
      const fl = Math.hypot(fx, fz) || 1
      const reach = Math.max(m.size.x, m.size.z) / 2
      let pos = new THREE.Vector2(0, 0)
      for (let k = 0; k < 48; k++) {
        const ang = Math.atan2(fz / fl, fx / fl) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26
        const r = Math.min(reach + 4, limit - 1)
        const cand = new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r)
        if (!blocked(grid, cand.x, cand.y, limit)) {
          pos = cand
          break
        }
      }
      const yaw = Math.atan2(-pos.x, -pos.y)
      st.current = { m, grid, limit, parts, contact, ring, pos, yaw, target: null, phase: 0, speed: 0, stuck: 0 }
      pending.current = false
      // camera: behind the figure, looking past it to the building
      m.root.updateMatrixWorld(true)
      const head = m.turn.localToWorld(new THREE.Vector3(pos.x, HEAD, pos.y))
      const out = pos.clone().normalize()
      if (!out.lengthSq()) out.set(0, 1)
      const behind = m.turn.localToWorld(new THREE.Vector3(pos.x + out.x * 4.6, HEAD + 1.5, pos.y + out.y * 4.6))
      c.setLookAt(behind.x, behind.y, behind.z, head.x, head.y, head.z, false)
    }
    const s = st.current
    if (!s) return
    const { m, parts } = s
    // desired direction from keys (camera-relative) or click target
    const k = keys.current
    const fwdIn = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const sideIn = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    const run = k.has('ShiftLeft') || k.has('ShiftRight')
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
    s.phase += dt * (1.6 + s.speed * 2.1) * Math.min(1, gait * 3)
    parts.pose(s.phase, gait, performance.now() / 1000)
    parts.root.position.set(s.pos.x, 0, s.pos.y)
    parts.root.rotation.y = s.yaw
    parts.root.visible = !eye
    s.contact.position.set(s.pos.x, 0.012, s.pos.y)
    // camera follows the head
    m.root.updateMatrixWorld(true)
    const head = m.turn.localToWorld(new THREE.Vector3(s.pos.x, eye ? 1.62 : HEAD, s.pos.y))
    c.moveTo(head.x, head.y, head.z, false)
  })

  return null
}
