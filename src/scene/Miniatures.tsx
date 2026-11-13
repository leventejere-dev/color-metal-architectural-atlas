/**
 * Every reference building stands on the satellite map as its own architectural
 * miniature, directly on the ground of its real site — from the national overview
 * down to true 1:1 scale.
 *
 *  - Scale: at small map scales each miniature keeps a readable on-screen size
 *    (≈ TARGET_PX), i.e. it is symbolically enlarged; as the camera approaches, the
 *    enlargement shrinks continuously until the building is at its real size on its
 *    real site. The UI always states the enlargement.
 *  - Never moved: miniatures always stand on their true site. Where neighbours would
 *    overlap on screen, the more important one stays and carries a "+N" badge for the
 *    others (click → zoom in); they reappear one by one as the camera approaches.
 *    Hysteresis + a short fade keep this calm (no jumping, no swarming).
 *  - Grounding: a soft contact shadow; the selected building (and, while driving, the
 *    one nearest the truck) stands on a levelled plateau.
 *  - Level of detail: a light far version (thin parts dropped) is built for every
 *    project in the background; the full-detail version only for the selected building
 *    and for miniatures that are large on screen (LRU-cached, evicted geometry disposed).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Project } from '../data/types'
import { atlasMaterials, finishMaterials } from '../lib/palette'
import type { Mats } from '../lib/materials'
import { loadModel, type ModelModule } from '../models/registry'
import { matchesFilters, useStore } from '../state/store'
import { project as toScene, convergence } from '../geo/projection'
import { SLAB } from '../geo/terrain'
import { groundY, rotationFor, runtime } from './runtime'

const TARGET_PX = 46 // on-screen footprint diameter at small map scales
const MAX_PX = 150 // on-screen footprint diameter just before true scale takes over
const FULL_PX = 130 // switch to the full-detail model above this on-screen size
const FAR_MIN_FEATURE = 1.3 // metres
const FULL_CACHE = 10
/** overlap thresholds (fraction of the summed on-screen radii): stay shown / become shown again */
const KEEP_K = 0.6
const SHOW_K = 0.78
/** ids that want full detail this frame (eviction never removes them) */
const wantedNow = new Set<string>()
const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa')

export interface Mini {
  p: Project
  idx: number
  root: THREE.Group
  turn: THREE.Group
  modelHolder: THREE.Group
  far: THREE.Group | null
  full: THREE.Group | null
  centreOffset: THREE.Vector3
  size: THREE.Vector3
  /** centre of the model's footprint in the base frame, metres (ensembles may extend far from the origin) */
  foot: THREE.Vector2
  /** footprint radius (half the bbox diagonal), metres */
  rFoot: number
  mod: ModelModule | null
  extra: Mats
  state: 'idle' | 'loading' | 'ready' | 'error'
  fullState: 'none' | 'loading' | 'ready'
  lastFullUse: number
  /** true site (scene km) */
  tx: number
  tz: number
  /** current and target symbolic enlargement */
  s: number
  sT: number
  /** km per pixel at the miniature (this frame) */
  wpp: number
  /** filtered out */
  hidden: boolean
  /** decided this frame: drawn (true) or folded into a neighbour's "+N" (false) */
  shown: boolean
  /** 0..1 fade of the decision */
  vis: number
  /** first appearance after the intro */
  appear: number
  /** projects folded into this one this frame */
  members: string[]
  /** screen position / radius (px) this frame; onScreen = in front of the camera */
  sx: number
  sy: number
  rPx: number
  onScreen: boolean
  /** ground height under the miniature (scene km) */
  baseY: number
  /** cartographic priority: who stays when miniatures overlap */
  prio: number
}

/** On-screen size (px) of a symbolic miniature seen from `dist` km (also used for the truck's travel scale). */
export function symbolicPx(dist: number) {
  return THREE.MathUtils.clamp(TARGET_PX * Math.pow(800 / Math.max(dist, 1e-3), 0.28), TARGET_PX, MAX_PX)
}

/** exhibition models first, then models with published photographs, then the other models */
function prioOf(p: Project) {
  const mod = p.model.module
  if (!mod) return 0
  const tier = { A: 40, B: 30, C: 20, D: 10 }[p.model.tier as 'A' | 'B' | 'C' | 'D'] ?? 10
  return (mod.startsWith('exhibition:') ? 500 : 0) + (p.photos.length ? 200 : 100) + tier
}

/* ---------------- soft contact shadow ---------------- */
const shadowTex = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.62)')
  grad.addColorStop(0.45, 'rgba(0,0,0,0.42)')
  grad.addColorStop(0.75, 'rgba(0,0,0,0.14)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, color: '#000000', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false })

/* ---------------- registry & build queue ---------------- */
const minis = new Map<string, Mini>()
let busy = false
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __minis: minis, __miniBusy: () => busy })

/** Access a project's miniature rig (used by the walk-around mode). */
export function getMini(id: string | null | undefined) {
  return id ? minis.get(id) : undefined
}

/** All miniature rigs (driving: collisions and the nearest building). */
export function allMinis(): Iterable<Mini> {
  return minis.values()
}

/** True-scale centre of a miniature's composition on its site (scene km, y = ground). */
export function trueCentre(m: Mini, target = new THREE.Vector3()) {
  const x = m.tx + m.foot.x * 0.001
  const z = m.tz + m.foot.y * 0.001
  return target.set(x, groundY(x, z) ?? -SLAB * runtime.yScale, z)
}

function disposeGroup(g: THREE.Group | null) {
  g?.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.geometry.dispose()
  })
}

async function buildFar(m: Mini) {
  m.state = 'loading'
  try {
    const mod = await loadModel(m.p.model.module!)
    m.mod = mod
    const pal = atlasMaterials().mats
    m.extra = mod.materials ? mod.materials(pal) : {}
    const g = mod.build().build({ ...pal, ...m.extra }, m.p.id, { minFeature: FAR_MIN_FEATURE })
    const box = new THREE.Box3().setFromObject(g)
    if (mod.recentre) {
      const c = box.getCenter(new THREE.Vector3())
      m.centreOffset.set(-c.x, -box.min.y, -c.z)
      box.translate(m.centreOffset)
    }
    g.position.copy(m.centreOffset)
    finishMaterials(g)
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true
    })
    m.size = box.getSize(new THREE.Vector3())
    m.rFoot = Math.max(6, Math.hypot(m.size.x, m.size.z) / 2)
    // centre of the whole composition (turn-local → base frame)
    const bc = box.getCenter(new THREE.Vector3())
    const th = m.turn.rotation.y
    m.foot.set(bc.x * Math.cos(th) + bc.z * Math.sin(th), -bc.x * Math.sin(th) + bc.z * Math.cos(th))
    m.far = g
    m.modelHolder.add(g)
    m.state = 'ready'
  } catch (e) {
    console.error('model', m.p.id, e)
    m.state = 'error'
  }
}

async function buildFull(m: Mini) {
  if (!m.mod) return
  m.fullState = 'loading'
  const pal = atlasMaterials().mats
  const g = m.mod.build().build({ ...pal, ...m.extra }, m.p.id)
  g.position.copy(m.centreOffset)
  finishMaterials(g)
  g.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true
  })
  g.visible = false
  m.full = g
  m.modelHolder.add(g)
  m.fullState = 'ready'
  // LRU eviction of full-detail models — never the selected one or one wanted this frame
  const keep = (x: Mini) => x === m || x.p.id === useStore.getState().selectedId || wantedNow.has(x.p.id)
  const withFull = [...minis.values()].filter((x) => x.full).sort((a, b) => Number(keep(a)) - Number(keep(b)) || a.lastFullUse - b.lastFullUse)
  while (withFull.length > FULL_CACHE) {
    const old = withFull.shift()!
    if (keep(old)) break
    old.modelHolder.remove(old.full!)
    disposeGroup(old.full)
    old.full = null
    old.fullState = 'none'
  }
}

/** Pick the next build job: selected full model first, then large-on-screen full models, then far models nearest the view. */
function pump(selectedId: string | null, flying: boolean, wantFull: Set<string>) {
  if (busy) return
  let job: (() => Promise<void>) | null = null
  const sel = selectedId ? minis.get(selectedId) : undefined
  if (sel && sel.p.model.module && sel.state === 'idle') job = () => buildFar(sel)
  else if (sel && sel.state === 'ready' && sel.fullState === 'none') job = () => buildFull(sel)
  else if (!flying) {
    for (const id of wantFull) {
      const m = minis.get(id)
      if (m && m.state === 'ready' && m.fullState === 'none') {
        job = () => buildFull(m)
        break
      }
    }
    if (!job) {
      const t = runtime.controls?.getTarget(new THREE.Vector3())
      let best: Mini | null = null
      let bd = Infinity
      for (const m of minis.values()) {
        if (m.state !== 'idle' || !m.p.model.module) continue
        const d = t ? Math.hypot(m.tx - t.x, m.tz - t.z) : 0
        const prio = d - (m.p.model.tier === 'A' ? 300 : 0)
        if (prio < bd) {
          bd = prio
          best = m
        }
      }
      if (best) job = () => buildFar(best!)
    }
  }
  if (!job) return
  busy = true
  job().finally(() => {
    // yield a frame between builds so interaction stays smooth
    setTimeout(() => (busy = false), 30)
  })
}

const tmpV = new THREE.Vector3()
const tmpM = new THREE.Object3D()

export function Miniatures({ projects }: { projects: Project[] }) {
  const { camera, size } = useThree()
  const root = useRef<THREE.Group>(null!)
  const pick = useRef<THREE.InstancedMesh>(null!)
  const shadows = useRef<THREE.InstancedMesh>(null!)
  const fpGroup = useRef<THREE.Group>(null!)
  const filters = useStore((s) => s.filters)
  const intro = useStore((s) => s.introDone)
  const active = useMemo(() => new Set(projects.filter((p) => matchesFilters(p, filters)).map((p) => p.id)), [projects, filters])
  const wantFull = useRef(new Set<string>())

  // create a placement rig per project (only projects with a 3D model are on the map)
  useEffect(() => {
    projects.forEach((p, idx) => {
      if (minis.has(p.id) || !p.model.module) return
      const q = toScene(p.lat, p.lon)
      const r = new THREE.Group()
      r.name = 'mini:' + p.id
      const turn = new THREE.Group()
      const modelHolder = new THREE.Group()
      turn.add(modelHolder)
      r.add(turn)
      turn.rotation.y = rotationFor(p)
      r.visible = false
      const m: Mini = {
        p,
        idx,
        root: r,
        turn,
        modelHolder,
        far: null,
        full: null,
        centreOffset: new THREE.Vector3(),
        size: new THREE.Vector3(30, 15, 30),
        foot: new THREE.Vector2(),
        rFoot: 21,
        mod: null,
        extra: {},
        state: 'idle',
        fullState: 'none',
        lastFullUse: 0,
        tx: q.x,
        tz: q.z,
        s: 1,
        sT: 1,
        wpp: 1,
        hidden: false,
        shown: true,
        vis: 0,
        appear: 0,
        members: [],
        sx: 0,
        sy: 0,
        rPx: 0,
        onScreen: false,
        baseY: 0,
        prio: prioOf(p) + (idx % 97) * 0.01,
      }
      minis.set(p.id, m)
      root.current.add(r)
    })
  }, [projects])

  useFrame((state, dtRaw) => {
    const t = runtime.terrain
    if (!t) return
    const dt = Math.min(dtRaw, 0.1)
    const st = useStore.getState()
    const selectedId = st.selectedId
    const hoverId = st.hoverId
    const studio = st.context === 'studio'
    const walking = st.walk.active
    const flatId = runtime.flatSite?.id ?? null
    const cam = camera as THREE.PerspectiveCamera
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const W = size.width
    const H = size.height
    const yS = runtime.yScale
    const now = state.clock.elapsedTime
    wantFull.current.clear()
    cam.updateMatrixWorld()

    // 1) scale, ground height and screen footprint per miniature
    const list = [...minis.values()]
    for (const m of list) {
      m.hidden = m.state !== 'ready' || (!active.has(m.p.id) && m.p.id !== selectedId) || (studio && m.p.id !== selectedId)
      m.members.length = 0
      const gy = groundY(m.tx, m.tz)
      tmpV.set(m.tx, gy ?? -SLAB * yS, m.tz)
      const dist = Math.max(cam.position.distanceTo(tmpV), 1e-3)
      const wpp = (2 * dist * tanH) / H // km per pixel at the miniature
      const diaKm = (2 * m.rFoot) / 1000
      m.sT = studio ? 1 : Math.max(1, (symbolicPx(dist) * wpp) / diaKm)
      m.wpp = wpp
      let s = m.sT
      if (m.p.id === hoverId && s > 1) s *= 1.06
      // first frame of a miniature: no zoom-in animation of its scale
      m.s = m.vis < 0.01 ? s : m.s + (s - m.s) * Math.min(1, dt * 10)
      // ground: the levelled plateau under the selected / driven-to building, otherwise the
      // highest ground under the core of the footprint (never buried, barely floating)
      const grounded = (m.p.id === selectedId && m.s < 1.5) || m.p.id === flatId
      const fx = m.tx + m.foot.x * 0.001 * m.s
      const fz = m.tz + m.foot.y * 0.001 * m.s
      if (grounded) m.baseY = groundY(fx, fz) ?? tmpV.y
      else {
        const rr = (m.rFoot / 1000) * m.s * 0.45
        let hi = groundY(fx, fz) ?? -SLAB * yS
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2
          const h = groundY(fx + Math.cos(a) * rr, fz + Math.sin(a) * rr)
          if (h !== null) hi = Math.max(hi, h)
        }
        m.baseY = hi
      }
      // screen footprint
      tmpV.set(fx, m.baseY + (m.size.y / 1000) * m.s * 0.3, fz).project(cam)
      m.onScreen = tmpV.z < 1 && tmpV.z > -1
      m.sx = (tmpV.x * 0.5 + 0.5) * W
      m.sy = (-tmpV.y * 0.5 + 0.5) * H
      m.rPx = ((m.rFoot / 1000) * m.s) / wpp
    }

    // 2) which miniatures stand, which fold into a neighbour's "+N" (by priority; while driving,
    //    nearest first). Positions never change — only the decision, with hysteresis and a fade.
    const rank = (m: Mini) => (m.p.id === selectedId || m.p.id === flatId ? 1e9 : walking ? -cam.position.distanceTo(tmpV.set(m.tx, m.baseY, m.tz)) : m.prio)
    const order = list.filter((m) => !m.hidden).sort((a, b) => rank(b) - rank(a))
    const standing: Mini[] = []
    for (const m of order) {
      let host: Mini | null = null
      if (m.p.id !== selectedId && m.p.id !== flatId && m.onScreen && !studio) {
        let best = Infinity
        for (const o of standing) {
          if (!o.onScreen) continue
          const d = Math.hypot(m.sx - o.sx, m.sy - o.sy)
          const lim = (m.rPx + o.rPx) * (m.shown ? KEEP_K : SHOW_K)
          if (d < lim && d / lim < best) {
            best = d / lim
            host = o
          }
        }
      }
      if (host) {
        m.shown = false
        host.members.push(m.p.id)
      } else {
        m.shown = true
        standing.push(m)
      }
    }
    for (const m of list) if (m.hidden) m.shown = false

    // 3) LOD: only the largest on-screen miniatures get full detail (bounded by the cache → no rebuild thrash)
    const fullCands: [Mini, number][] = []
    for (const m of list) {
      const screenPx = 2 * m.rPx
      if (m.shown && (m.p.id === selectedId || screenPx > FULL_PX)) fullCands.push([m, m.p.id === selectedId ? Infinity : screenPx])
    }
    fullCands.sort((a, b) => b[1] - a[1])
    wantedNow.clear()
    for (const [m] of fullCands.slice(0, FULL_CACHE - 1)) {
      wantFull.current.add(m.p.id)
      wantedNow.add(m.p.id)
      m.lastFullUse = now
    }

    // 4) place, fade, shadows, pick proxies, labels, badges
    const clusters: typeof runtime.miniClusters = []
    for (const m of list) {
      if (m.state === 'ready' && intro) m.appear = Math.min(1, m.appear + dt * 1.6)
      m.vis += ((m.shown ? 1 : 0) - m.vis) * Math.min(1, dt * 9)
      if (!m.shown && m.vis < 0.02) m.vis = 0
      const show = m.state === 'ready' && m.vis > 0 && m.appear > 0
      m.root.visible = show
      const ease = 1 - Math.pow(1 - Math.min(m.appear, m.vis), 3)
      const k = 0.001 * m.s * Math.max(ease, 1e-4)
      m.root.position.set(m.tx, m.baseY, m.tz)
      m.root.scale.setScalar(k)
      const useFull = m.full && wantFull.current.has(m.p.id)
      if (m.far) m.far.visible = !useFull
      if (m.full) m.full.visible = !!useFull
      const rKm = (m.rFoot / 1000) * m.s
      const hKm = (m.size.y / 1000) * m.s
      const fx = m.tx + m.foot.x * 0.001 * m.s
      const fz = m.tz + m.foot.y * 0.001 * m.s
      // soft contact shadow, nudged away from the north-west key light
      tmpM.position.set(fx + rKm * 0.12, m.baseY + 0.00002 * m.s, fz + rKm * 0.1)
      tmpM.rotation.set(0, m.turn.rotation.y, 0)
      const sh = show ? rKm * 2.25 * ease : 1e-9
      tmpM.scale.set(sh * Math.max(0.55, m.size.x / Math.max(m.size.x, m.size.z)), 1, sh * Math.max(0.55, m.size.z / Math.max(m.size.x, m.size.z)))
      tmpM.updateMatrix()
      shadows.current.setMatrixAt(m.idx, tmpM.matrix)
      // invisible pick proxy (cylinder around the building)
      const pickOn = show && m.shown
      tmpM.position.set(fx, m.baseY, fz)
      tmpM.rotation.set(0, 0, 0)
      tmpM.scale.set(pickOn ? rKm * 0.8 : 1e-9, pickOn ? Math.max(hKm, rKm * 0.3) : 1e-9, pickOn ? rKm * 0.8 : 1e-9)
      tmpM.updateMatrix()
      pick.current.setMatrixAt(m.idx, tmpM.matrix)
      // label anchor above the miniature
      const lbl = runtime.miniLabels.get(m.p.id) ?? new THREE.Vector3()
      lbl.set(fx, m.baseY + hKm * 1.05, fz)
      runtime.miniLabels.set(m.p.id, lbl)
      runtime.miniVisible.set(m.p.id, show && m.shown && m.vis > 0.6)
      if (show && m.shown && m.members.length && m.vis > 0.6 && !walking) clusters.push({ id: m.p.id, ids: [m.p.id, ...m.members], anchor: lbl, rPx: m.rPx })

      // selected: camera framing data (true scale, true site), UI scale note
      if (m.p.id === selectedId && m.state === 'ready') {
        const c = runtime.model?.id === m.p.id ? runtime.model.center : new THREE.Vector3()
        trueCentre(m, c)
        runtime.model = {
          id: m.p.id,
          sizeM: m.size,
          center: c,
          rotY: m.turn.rotation.y,
          front: m.mod?.front ?? [0, 1],
          materialFocus: m.mod?.materialFocus,
          scale: m.s,
        }
        const shown = Math.round(m.s)
        if (Math.abs(st.presentationScale - shown) / Math.max(1, shown) > 0.08 || (shown === 1) !== (st.presentationScale === 1)) st.setPresentationScale(shown)
        if (st.modelState !== 'ready') st.setModelState('ready')
        if (fpGroup.current) {
          fpGroup.current.visible = true
          fpGroup.current.position.set(m.tx, m.baseY, m.tz)
          fpGroup.current.rotation.y = -convergence(m.p.lat, m.p.lon)
          fpGroup.current.scale.setScalar(0.001 * m.s)
        }
      }
    }
    runtime.miniClusters = clusters
    if (!selectedId) runtime.model = null
    else {
      const sel = minis.get(selectedId)
      if (sel?.state === 'error' && st.modelState !== 'error') st.setModelState('error')
      if ((sel?.state === 'loading' || sel?.state === 'idle') && st.modelState !== 'loading') st.setModelState('loading')
    }
    shadows.current.instanceMatrix.needsUpdate = true
    pick.current.instanceMatrix.needsUpdate = true
    pick.current.computeBoundingSphere()

    // background building starts after the intro so the opening stays smooth
    if (intro || selectedId) pump(selectedId, st.flying, wantFull.current)
  })

  // hide every instance until the first frame places it
  useEffect(() => {
    const hide = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < projects.length; i++) {
      shadows.current.setMatrixAt(i, hide)
      pick.current.setMatrixAt(i, hide)
    }
  }, [projects])

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined || useStore.getState().walk.active) return
    e.stopPropagation()
    useStore.getState().setHover(projects[e.instanceId].id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    useStore.getState().setHover(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined || e.delta > 6 || useStore.getState().walk.active) return
    e.stopPropagation()
    const id = projects[e.instanceId].id
    const st = useStore.getState()
    // a click always opens the building's model view (also when it is already selected)
    if (st.selectedId !== id) st.select(id, { inspect: true })
    else if (st.mode !== 'inspect') st.enterInspect()
  }

  const selected = useStore((s) => s.selectedId)
  const qaProject = QA ? projects.find((p) => p.id === selected && p.footprint) : null
  const qaLine = useMemo(() => {
    if (!qaProject?.footprint) return null
    const pts = qaProject.footprint.map(([e, n]) => new THREE.Vector3(e, 0.4, -n))
    pts.push(pts[0].clone())
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [qaProject])

  return (
    <group>
      <group ref={root} />
      <instancedMesh ref={shadows} args={[shadowGeo, shadowMat, projects.length]} frustumCulled={false} renderOrder={1} />
      <instancedMesh
        ref={pick}
        args={[new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ visible: false }), projects.length]}
        frustumCulled={false}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      />
      {qaLine && (
        <group ref={fpGroup} visible={false}>
          <line>
            <primitive object={qaLine} attach="geometry" />
            <lineBasicMaterial color="#d23c1e" depthTest={false} />
          </line>
        </group>
      )}
    </group>
  )
}
