/**
 * Camera behaviour:
 *  - map mode: left-drag pans across the terrain, right-drag orbits, wheel zooms to cursor
 *  - inspect mode: left-drag orbits the building, right-drag pans
 *  - fly-to: smooth zoom-out / travel / zoom-in path (van Wijk & Nuij 2003, ρ = 1.35),
 *    duration scaled with the path length, interrupted by any user input
 *  - adaptive near/far, distance fog (isolates the miniature at close range) and
 *    distance-dependent relief exaggeration
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import * as THREE from 'three'
import { projectById, useStore, type CameraCommand, type ViewPreset } from '../state/store'
import { exaggerationFor, groundY, projectPosition, rotationFor, runtime } from './runtime'
import { BG } from './TerrainModel'
import { DRIVE_ZOOM } from './Walker'

const { ACTION } = CameraControlsImpl
const DEG = Math.PI / 180
const RHO = 1.35
/** closest map zoom (km): the buildings open with a click, the map itself is not zoomed into the ground */
const MAP_MIN_D = 2.2
const camTmp = new THREE.Vector3()

interface View {
  target: THREE.Vector3
  d: number
  az: number
  pol: number
}

interface Flight {
  from: View
  to: View
  start: number
  dur: number
  S: number
  u1: number
  r0: number
  w0: number
  kind: 'vw' | 'zoom'
  then?: () => void
  projectId?: string
  /** distance correction applied progressively when the destination is re-framed mid-flight */
  dScale: number
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function shortestAngle(a: number, b: number) {
  let d = (b - a) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d < -Math.PI) d += 2 * Math.PI
  return a + d
}

function overviewView(aspect: number): View {
  const tanH = Math.tan(15 * DEG)
  const dH = (560 * Math.cos(48 * DEG) * 1.25) / (2 * tanH)
  const dW = (800 * (aspect < 1 ? 0.98 : 1.12)) / (2 * tanH * aspect)
  return { target: new THREE.Vector3(6, 0, 34), d: Math.min(Math.max(dH, dW), 3400), az: 0, pol: 48 * DEG }
}

function frontAzimuth(rotY: number, front: [number, number]) {
  const [fx, fz] = front
  const wx = fx * Math.cos(rotY) + fz * Math.sin(rotY)
  const wz = -fx * Math.sin(rotY) + fz * Math.cos(rotY)
  return Math.atan2(wx, wz)
}

/** Framing for a selected project (true-scale close view if a model exists). */
export function projectView(id: string): View | null {
  const p = projectById(id)
  if (!p) return null
  const target = projectPosition(p)
  const m = runtime.model && runtime.model.id === id ? runtime.model : null
  if (!p.model.module) return { target, d: 4.5, az: 0.2, pol: 50 * DEG }
  const sizeM = m ? Math.max(m.sizeM.x, m.sizeM.z, m.sizeM.y * 1.2) : 60
  const rotY = rotationFor(p)
  const front = m?.front ?? [0, 1]
  const hM = m ? m.sizeM.y : 15
  target.y += (hM * 0.3) / 1000
  // frame the whole composition (ensembles extend beyond the main building's site), on the ground the
  // building really stands on (levelled site — in a gorge the smoothed terrain estimate can be far off)
  if (m) {
    target.x = m.center.x
    target.z = m.center.z
    target.y = m.center.y + (hM * 0.3) / 1000
  }
  // small objects (an entrance drum, a canopy) are framed close too
  return { target, d: THREE.MathUtils.clamp((sizeM / 1000) * 2.9, 0.014, 1.6), az: frontAzimuth(rotY, front) + 38 * DEG, pol: 64 * DEG }
}

function presetView(preset: ViewPreset): View | null {
  const st = useStore.getState()
  if (!st.selectedId) return null
  const base = projectView(st.selectedId)
  const m = runtime.model
  if (!base || !m) return base
  const sizeKm = (Math.max(m.sizeM.x, m.sizeM.z) / 1000) * m.scale
  const hKm = (m.sizeM.y / 1000) * m.scale
  const fAz = frontAzimuth(m.rotY, m.front)
  const c = m.center.clone()
  switch (preset) {
    case 'top':
      return { target: c.clone().add(new THREE.Vector3(0, hKm * 0.3, 0)), d: sizeKm * 2.7, az: -m.rotY, pol: 0.001 }
    case 'roof':
      return { target: c.clone().add(new THREE.Vector3(0, hKm * 0.6, 0)), d: sizeKm * 2.4, az: fAz + 25 * DEG, pol: 38 * DEG }
    case 'facade':
      return { target: c.clone().add(new THREE.Vector3(0, hKm * 0.38, 0)), d: Math.max(sizeKm, hKm) * 2.6, az: fAz, pol: 84 * DEG }
    case 'material': {
      const f = m.materialFocus ?? [0, m.sizeM.y * 0.7, 0]
      const local = new THREE.Vector3(...f).multiplyScalar(0.001 * m.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), m.rotY)
      return { target: c.clone().add(local), d: Math.max(0.012 * m.scale, sizeKm * 0.22), az: fAz + 30 * DEG, pol: 55 * DEG }
    }
    case 'reset':
    default:
      return base
  }
}

export function CameraDirector() {
  const ref = useRef<CameraControlsImpl>(null!)
  const { camera, scene, size } = useThree()
  const flight = useRef<Flight | null>(null)
  const cmd = useStore((s) => s.cameraCommand)
  const mode = useStore((s) => s.mode)
  const listOpen = useStore((s) => s.listOpen)
  const selectedId = useStore((s) => s.selectedId)
  const comparing = useStore((s) => s.gallery.open && s.gallery.compare)
  const walking = useStore((s) => s.walk.active)
  const carMode = useStore((s) => !!s.walk.car)
  const eye = useStore((s) => s.walk.eye)
  const fog = useRef(new THREE.Fog(BG, 1e6, 2e6))
  const settle = useRef<{ id: string; until: number } | null>(null)

  // keep the projection centred in the free area between the side panels
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const desktop = size.width > 900
    const left = comparing ? (desktop ? size.width / 2 : 0) : desktop && listOpen ? 372 : 0
    const right = comparing ? 0 : desktop && selectedId && !(walking && carMode) ? 420 : 0
    // on phones the compare photo takes the top half: centre the model in the lower half
    const shiftY = comparing && !desktop ? size.height / 4 : 0
    const shift = (left - right) / 2
    if (shift || shiftY) cam.setViewOffset(size.width, size.height, -shift, -shiftY, size.width, size.height)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
  }, [camera, size, listOpen, selectedId, comparing, walking, carMode])

  useEffect(() => {
    scene.fog = fog.current
    if (!scene.background) scene.background = new THREE.Color(BG)
    fog.current.color.copy(scene.background as THREE.Color)
    const c = ref.current
    runtime.controls = c
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-560, -20, -460), new THREE.Vector3(560, 20, 460)))
    c.boundaryFriction = 0.2
    c.smoothTime = 0.22
    c.draggingSmoothTime = 0.08
    c.maxDistance = 3400
    c.minDistance = 0.012
    c.maxPolarAngle = 80 * DEG
    c.restThreshold = 0.0005
    const v = overviewView(size.width / size.height)
    // opening shot: start higher and settle into the overview
    c.setLookAt(
      v.target.x + Math.sin(v.az) * Math.sin(20 * DEG) * v.d * 1.5,
      v.target.y + Math.cos(20 * DEG) * v.d * 1.5,
      v.target.z + Math.cos(v.az) * Math.sin(20 * DEG) * v.d * 1.5,
      v.target.x,
      v.target.y,
      v.target.z,
      false,
    )
    const onStart = () => {
      if (flight.current) {
        flight.current = null
        useStore.getState().setFlying(false)
      }
      const t = useStore.getState().tour
      if (t.active && t.playing) useStore.getState().setTour({ playing: false })
      if (useStore.getState().autoOrbit && !t.active) useStore.getState().setAutoOrbit(false)
    }
    c.addEventListener('controlstart', onStart)
    return () => c.removeEventListener('controlstart', onStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // input mapping per mode
  useEffect(() => {
    const c = ref.current
    if (walking && carMode) {
      // driving: the truck handles drag (orbit), wheel and pinch (zoom) itself
      c.mouseButtons.left = ACTION.NONE
      c.mouseButtons.right = ACTION.NONE
      c.mouseButtons.middle = ACTION.NONE
      c.mouseButtons.wheel = ACTION.NONE
      c.touches.one = ACTION.NONE
      c.touches.two = ACTION.NONE
      c.touches.three = ACTION.NONE
      c.dollyToCursor = false
      return
    }
    if (walking) {
      // walk-around: drag looks around the figure, wheel/pinch sets the camera distance
      c.mouseButtons.left = ACTION.ROTATE
      c.mouseButtons.right = ACTION.ROTATE
      c.mouseButtons.wheel = ACTION.DOLLY
      c.touches.one = ACTION.TOUCH_ROTATE
      c.touches.two = ACTION.TOUCH_DOLLY_ROTATE
      c.touches.three = ACTION.NONE
      c.dollyToCursor = false
      return
    }
    if (mode === 'map') {
      // map-like panning across the ground plane (camera-controls 3: SCREEN_PAN)
      c.mouseButtons.left = ACTION.SCREEN_PAN
      c.mouseButtons.right = ACTION.ROTATE
      c.mouseButtons.wheel = ACTION.DOLLY
      c.touches.one = ACTION.TOUCH_SCREEN_PAN
      c.touches.two = ACTION.TOUCH_DOLLY_SCREEN_PAN as unknown as typeof ACTION.TOUCH_DOLLY_TRUCK
      c.touches.three = ACTION.TOUCH_ROTATE
      c.dollyToCursor = true
    } else {
      c.mouseButtons.left = ACTION.ROTATE
      c.mouseButtons.right = ACTION.TRUCK
      c.mouseButtons.wheel = ACTION.DOLLY
      c.touches.one = ACTION.TOUCH_ROTATE
      c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
      c.touches.three = ACTION.TOUCH_TRUCK
      c.dollyToCursor = false
    }
  }, [mode, walking, carMode])

  // a wider, street-view-like lens while walking
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = walking ? 55 : 30
    cam.updateProjectionMatrix()
  }, [walking, camera])

  // eye level vs. third person
  useEffect(() => {
    const c = ref.current
    if (!walking || carMode) return
    // only when switching view while walking (the walker places the camera on entry)
    if (eye || c.distance < 0.003) c.dollyTo(eye ? 0.00045 : 0.0049, !useStore.getState().reducedMotion)
  }, [walking, eye, carMode])

  const current = (): View => {
    const c = ref.current
    return { target: c.getTarget(new THREE.Vector3()), d: c.distance, az: c.azimuthAngle, pol: c.polarAngle }
  }

  const apply = (v: View, smooth = false) => {
    const c = ref.current
    const s = Math.sin(v.pol)
    return c.setLookAt(
      v.target.x + Math.sin(v.az) * s * v.d,
      v.target.y + Math.cos(v.pol) * v.d,
      v.target.z + Math.cos(v.az) * s * v.d,
      v.target.x,
      v.target.y,
      v.target.z,
      smooth,
    )
  }

  const flyTo = (to: View, then?: () => void, fast = false, projectId?: string) => {
    const from = current()
    to = { ...to, az: shortestAngle(from.az, to.az) }
    if (useStore.getState().reducedMotion) {
      apply(to)
      then?.()
      return
    }
    const w0 = Math.max(from.d, 1e-3)
    const w1 = Math.max(to.d, 1e-3)
    const u1 = from.target.distanceTo(to.target)
    let S: number
    let r0 = 0
    let kind: Flight['kind'] = 'vw'
    if (u1 < 1e-4 * Math.max(w0, w1)) {
      kind = 'zoom'
      S = Math.abs(Math.log(w1 / w0)) / RHO
    } else {
      const b = (i: 0 | 1) => (w1 * w1 - w0 * w0 + (i ? -1 : 1) * RHO ** 4 * u1 * u1) / (2 * (i ? w1 : w0) * RHO * RHO * u1)
      const r = (i: 0 | 1) => Math.log(-b(i) + Math.sqrt(b(i) * b(i) + 1))
      r0 = r(0)
      S = (r(1) - r0) / RHO
    }
    const dur = THREE.MathUtils.clamp(0.9 + S * (fast ? 0.42 : 0.62), fast ? 0.7 : 1.1, fast ? 3.0 : 5.2)
    flight.current = { from, to, start: performance.now() / 1000, dur, S, u1, r0, w0, kind, then, projectId, dScale: 1 }
    useStore.getState().setFlying(true)
  }

  // handle commands
  useEffect(() => {
    if (!cmd) return
    const c = ref.current
    const command = cmd as CameraCommand
    switch (command.kind) {
      case 'overview': {
        const v = overviewView(size.width / size.height)
        if (command.instant) apply(v)
        else flyTo(v)
        break
      }
      case 'project': {
        const id = command.id
        const v = projectView(id)
        if (!v) break
        const done = () => {
          const st = useStore.getState()
          if (st.selectedId === id && projectById(id)?.model.module) {
            st.enterInspectQuiet()
            // the relief exaggeration and the levelled site settle only on arrival: keep re-aiming
            // at where the building really stands for a moment
            settle.current = { id, until: performance.now() + 2500 }
          }
        }
        if (command.instant) apply(v)
        else flyTo(v, done, false, id)
        // once the model is built, re-frame to its real size and orientation
        if (projectById(id)?.model.module && runtime.model?.id !== id) {
          const t0 = performance.now()
          const wait = () => {
            if (useStore.getState().selectedId !== id || useStore.getState().modelState === 'error' || performance.now() - t0 > 8000) return
            if (runtime.model?.id !== id) {
              requestAnimationFrame(wait)
              return
            }
            const v2 = projectView(id)
            if (!v2) return
            const f = flight.current
            if (f && f.projectId === id) {
              f.dScale = v2.d / f.to.d
              f.to = { ...v2, az: shortestAngle(f.from.az, v2.az) }
            } else {
              const cur = current()
              apply({ ...v2, az: shortestAngle(cur.az, v2.az) }, !useStore.getState().reducedMotion)
              done()
            }
          }
          wait()
        } else if (command.instant) done()
        break
      }
      case 'fit': {
        const pts = command.ids.map((id) => projectById(id)).filter(Boolean).map((p) => projectPosition(p!))
        if (!pts.length) break
        const box = new THREE.Box3().setFromPoints(pts)
        const ctr = box.getCenter(new THREE.Vector3())
        const ext = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.4)
        // always a real step closer (a "+N" badge of very close neighbours must keep opening up)
        const d = Math.max(MAP_MIN_D, Math.min(ext * 2.6, c.distance * 0.4))
        flyTo({ target: ctr, d, az: c.azimuthAngle, pol: 42 * DEG }, undefined, true)
        break
      }
      case 'preset': {
        const v = presetView(command.preset)
        if (v) {
          const cur = current()
          v.az = shortestAngle(cur.az, v.az)
          apply(v, !useStore.getState().reducedMotion)
        }
        break
      }
      case 'zoom':
        // while driving, the zoom buttons set the chase distance (the truck's travel scale)
        if (useStore.getState().walk.active && useStore.getState().walk.car) runtime.driveZoom = THREE.MathUtils.clamp(runtime.driveZoom * (1 - command.factor), DRIVE_ZOOM.min, DRIVE_ZOOM.max)
        else c.dolly(c.distance * command.factor, !useStore.getState().reducedMotion)
        break
      case 'north':
        c.rotateAzimuthTo(0, !useStore.getState().reducedMotion)
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd])

  useFrame((_, dt) => {
    const c = ref.current
    const f = flight.current
    if (!f && useStore.getState().autoOrbit && !useStore.getState().reducedMotion) c.rotate(Math.min(dt, 0.05) * 0.16, 0, false)
    if (f) {
      const now = performance.now() / 1000
      const t = Math.min(1, (now - f.start) / f.dur)
      const e = easeInOut(t)
      const s = e * f.S
      let w: number
      let frac: number
      if (f.kind === 'zoom') {
        w = f.w0 * Math.exp(Math.sign(f.to.d - f.from.d) * RHO * s)
        frac = e
      } else {
        const u = (f.w0 / (RHO * RHO)) * Math.cosh(f.r0) * Math.tanh(RHO * s + f.r0) - (f.w0 / (RHO * RHO)) * Math.sinh(f.r0)
        w = (f.w0 * Math.cosh(f.r0)) / Math.cosh(RHO * s + f.r0)
        frac = THREE.MathUtils.clamp(u / f.u1, 0, 1)
      }
      w *= Math.pow(f.dScale, e)
      if (t >= 1) {
        w = f.to.d
        frac = 1
      }
      // live re-target: the destination may move slightly once the model is loaded
      const target = f.from.target.clone().lerp(f.to.target, frac)
      const az = THREE.MathUtils.lerp(f.from.az, f.to.az, e)
      // tilt towards a top view while travelling high, back to the requested tilt on arrival
      const lift = Math.sin(Math.PI * e) * 0.18
      const pol = THREE.MathUtils.lerp(f.from.pol, f.to.pol, e) * (1 - lift)
      apply({ target, d: w, az, pol })
      if (t >= 1) {
        flight.current = null
        useStore.getState().setFlying(false)
        f.then?.()
      }
    }

    // per-frame LOD state
    const d = c.distance
    runtime.distance = d
    const E = exaggerationFor(d, runtime.terrain?.exag ?? 5)
    runtime.exaggeration = E
    runtime.yScale = E / (runtime.terrain?.exag ?? 5)
    const st = useStore.getState()
    if (Math.abs(st.camDistance - d) / Math.max(d, 1e-3) > 0.04) st.setCamDistance(d)

    // after arriving at a building: follow its settling site (target and camera move together)
    const se = settle.current
    if (se) {
      if (performance.now() > se.until || st.selectedId !== se.id || st.walk.active) settle.current = null
      else if (!flight.current && runtime.model?.id === se.id) {
        const vf = projectView(se.id)
        const tg = c.getTarget(camTmp)
        if (vf && tg.distanceTo(vf.target) > 0.0004) c.moveTo(vf.target.x, vf.target.y, vf.target.z, !st.reducedMotion)
      }
    }

    // safety net: the camera never goes below the rendered ground (a wrong framing or a steep
    // valley would otherwise leave the view black from inside the hill)
    if (!st.walk.active) {
      const cp = camera.position
      const gy = groundY(cp.x, cp.z)
      const clear = Math.max(0.0025, d * 0.04)
      if (gy !== null && cp.y < gy + clear) {
        c.getPosition(camTmp)
        c.setPosition(camTmp.x, gy + clear, camTmp.z, false)
      }
    }

    const cam = camera as THREE.PerspectiveCamera
    const near = Math.max(d * 0.004, 0.0003)
    const far = d * 90 + 60
    if (Math.abs(cam.near - near) / near > 0.05 || Math.abs(cam.far - far) / far > 0.05) {
      cam.near = near
      cam.far = far
      cam.updateProjectionMatrix()
    }
    const studio = st.context === 'studio'
    if (st.walk.active && st.walk.car) {
      // real-size driving: the next village stays visible on the horizon
      fog.current.near = studio ? 1e7 : 0.8 + d * 8
      fog.current.far = studio ? 2e7 : 7 + d * 60
    } else if (st.walk.active) {
      fog.current.near = studio ? 1e7 : 0.09
      fog.current.far = studio ? 2e7 : 1.1
    } else if (studio || d > 80) {
      fog.current.near = 1e7
      fog.current.far = 2e7
    } else {
      fog.current.near = d * 5.5
      fog.current.far = d * 48
    }
    if (st.walk.active && st.walk.car) {
      // the truck sets the camera itself (chase / cockpit) at any travel scale
      c.maxPolarAngle = 179 * DEG
      c.minDistance = 0.0001
      c.maxDistance = 3400
    } else if (st.walk.active) {
      c.maxPolarAngle = (st.walk.eye ? 118 : 88) * DEG
      c.minDistance = st.walk.eye ? 0.0002 : 0.0015
      c.maxDistance = 0.04
    } else {
      c.maxDistance = 3400
      c.maxPolarAngle = (d < 4 ? 86 : 78) * DEG
      // inspection: never closer than ~0.7 × the building's largest dimension (keeps the camera outside it);
      // map: not into the blurred ground — a building opens with a click
      c.minDistance =
        st.mode === 'inspect' && runtime.model
          ? Math.max(0.012, (Math.max(runtime.model.sizeM.x, runtime.model.sizeM.y, runtime.model.sizeM.z) / 1000) * 0.7)
          : flight.current || st.selectedId || st.tour.active
            ? 0.01
            : MAP_MIN_D
    }
  })

  return <CameraControls ref={ref} makeDefault />
}
