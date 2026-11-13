/**
 * Every reference building stands on the satellite map as its own architectural
 * miniature — from the national overview down to true 1:1 scale on its real site.
 *
 *  - Scale: at small map scales each miniature keeps a readable on-screen size (it is
 *    symbolically enlarged; the UI states the factor); close to the ground the enlargement
 *    fades out and every building stands at its real size on its real site.
 *  - All buildings are always shown (no counters). Where enlarged miniatures would overlap,
 *    they are arranged in a tidy honeycomb around their town — the most important first,
 *    each in the free cell nearest its real site — with a fine brass leader line and a dot
 *    on the true location. The arrangement depends only on the zoom step (not on panning or
 *    rotating), so it stays perfectly still; it reflows smoothly when the zoom step changes.
 *  - Grounding: a soft contact shadow; the selected building (and, while driving, the one
 *    nearest the truck) stands on a levelled plateau. Walking / driving: everything at 1:1.
 *  - Level of detail: a light far version (thin parts dropped) is built for every project in
 *    the background; the full-detail version only for the selected building and for
 *    miniatures that are large on screen (LRU-cached, evicted geometry disposed).
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

const TARGET_PX = 28 // on-screen footprint diameter at the national overview
const MAX_PX = 120 // on-screen footprint diameter at regional scales
const FULL_PX = 130 // switch to the full-detail model above this on-screen size
const FAR_MIN_FEATURE = 1.3 // metres
const FULL_CACHE = 10
/** zoom steps of the arrangement (factor between steps) and the hysteresis around a step */
const STEP = 1.3
const STEP_HYST = 0.62
/** gap between neighbouring miniatures in an arrangement (× footprint diameter) */
const GAP = 1.12
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
  /** arranged site (target) and the site currently shown (animated towards the target) */
  lx: number
  lz: number
  px: number
  pz: number
  /** arranged and current symbolic enlargement */
  sL: number
  s: number
  /** filtered out */
  hidden: boolean
  /** drawn this frame */
  shown: boolean
  /** 0..1 fade (filters, first appearance) */
  vis: number
  appear: number
  /** km per pixel at the miniature, on-screen radius (px) this frame */
  wpp: number
  rPx: number
  /** ground height under the miniature (scene km) */
  baseY: number
  /** cartographic priority: who keeps the cell nearest its site */
  prio: number
}

/** exhibition models first, then models with published photographs, then the other models */
function prioOf(p: Project) {
  const mod = p.model.module
  if (!mod) return 0
  const tier = { A: 40, B: 30, C: 20, D: 10 }[p.model.tier as 'A' | 'B' | 'C' | 'D'] ?? 10
  return (mod.startsWith('exhibition:') ? 500 : 0) + (p.photos.length ? 200 : 100) + tier
}

/**
 * On-screen footprint diameter (px) of a symbolic miniature with the camera `dist` km away.
 * Close to the ground the enlargement fades out so neighbours come apart at nearly real size.
 */
export function symbolicPx(dist: number) {
  const px = THREE.MathUtils.clamp(TARGET_PX * Math.pow(1250 / Math.max(dist, 1e-3), 0.33), TARGET_PX, MAX_PX)
  return px * (0.2 + 0.8 * THREE.MathUtils.smoothstep(dist, 1.2, 14))
}

/* ---------------- honeycomb arrangement ---------------- */
const SQ3 = Math.sqrt(3)

/** hex cells around (cx, cz) with spacing `sp`, at least `n` of them (ring by ring) */
function hexCells(cx: number, cz: number, sp: number, n: number) {
  const cells: [number, number][] = [[cx, cz]]
  for (let k = 1; cells.length < n; k++) {
    // walk the k-th ring
    let q = k
    let r = 0
    const dirs: [number, number][] = [
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
      [1, 0],
      [0, 1],
    ]
    for (const [dq, dr] of dirs) {
      for (let i = 0; i < k; i++) {
        cells.push([cx + sp * (q + r / 2), cz + sp * ((r * SQ3) / 2)])
        q += dq
        r += dr
      }
    }
  }
  return cells
}

/**
 * Arrange miniatures of footprint radius R (km) without overlaps: neighbours closer than the
 * cell spacing form a group; each group is laid out on a hex grid around its centre, members in
 * priority order taking the free cell nearest their real site; groups whose arrangements touch
 * are merged and re-arranged. Isolated buildings stay exactly on their site.
 */
function arrange(ms: Mini[], R: number) {
  const sp = 2 * R * GAP
  const n = ms.length
  /** dense groups are drawn smaller so a whole town stays a compact cluster near its real place */
  const groupR = (count: number) => R * THREE.MathUtils.clamp(1.45 / Math.sqrt(count), 0.36, 1)
  const parent = ms.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const unite = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb)
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(ms[i].tx - ms[j].tx, ms[i].tz - ms[j].tz) < sp) unite(i, j)
  const out = new Map<Mini, [number, number, number]>()
  for (let pass = 0; pass < 24; pass++) {
    const groups = new Map<number, number[]>()
    for (let i = 0; i < n; i++) {
      const g = groups.get(find(i)) ?? []
      g.push(i)
      groups.set(find(i), g)
    }
    const circles: { root: number; x: number; z: number; r: number }[] = []
    for (const [root, idx] of groups) {
      if (idx.length === 1) {
        const m = ms[idx[0]]
        out.set(m, [m.tx, m.tz, R])
        circles.push({ root, x: m.tx, z: m.tz, r: R })
        continue
      }
      const Rg = groupR(idx.length)
      const spg = 2 * Rg * GAP
      // centre: priority-weighted mean of the real sites
      let wx = 0
      let wz = 0
      let ws = 0
      for (const i of idx) {
        const w = 1 + ms[i].prio / 200
        wx += ms[i].tx * w
        wz += ms[i].tz * w
        ws += w
      }
      const cx = wx / ws
      const cz = wz / ws
      const cells = hexCells(cx, cz, spg, Math.ceil(idx.length * 1.35) + 1)
      const used = new Uint8Array(cells.length)
      const order = [...idx].sort((a, b) => ms[b].prio - ms[a].prio)
      let ext = 0
      for (const i of order) {
        const m = ms[i]
        let best = -1
        let bd = Infinity
        for (let c = 0; c < cells.length; c++) {
          if (used[c]) continue
          const d = Math.hypot(cells[c][0] - m.tx, cells[c][1] - m.tz)
          if (d < bd) {
            bd = d
            best = c
          }
        }
        used[best] = 1
        out.set(m, [cells[best][0], cells[best][1], Rg])
        ext = Math.max(ext, Math.hypot(cells[best][0] - cx, cells[best][1] - cz))
      }
      circles.push({ root, x: cx, z: cz, r: ext + Rg })
    }
    // arrangements that touch each other are merged and laid out again
    let merged = false
    for (let a = 0; a < circles.length; a++)
      for (let b = a + 1; b < circles.length; b++) {
        const A = circles[a]
        const B = circles[b]
        if (Math.hypot(A.x - B.x, A.z - B.z) < A.r + B.r + (sp - 2 * R) * 0.5) {
          unite(A.root, B.root)
          merged = true
        }
      }
    if (!merged) break
  }
  return out
}

/* ---------------- soft contact shadow, leader lines ---------------- */
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
const dotGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)
const dotMat = new THREE.MeshBasicMaterial({ color: '#c9a86a', transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, toneMapped: false })

/* ---------------- registry & build queue ---------------- */
const minis = new Map<string, Mini>()
let busy = false
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __minis: minis, __miniBusy: () => busy })

/** the current arrangement: zoom step, the enlargement radius it was made for, and what it covers */
const layout = { step: NaN, R: 0, key: '' }

/** Access a project's miniature rig (used by the walk-around mode). */
export function getMini(id: string | null | undefined) {
  return id ? minis.get(id) : undefined
}

/** All miniature rigs (driving: collisions and the nearest building). */
export function allMinis(): Iterable<Mini> {
  return minis.values()
}

/** True-scale centre of a miniature's composition on its real site (scene km, y = ground). */
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
  const dots = useRef<THREE.InstancedMesh>(null!)
  const fpGroup = useRef<THREE.Group>(null!)
  const leaderGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(projects.length * 6), 3).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [projects])
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
        lx: q.x,
        lz: q.z,
        px: q.x,
        pz: q.z,
        sL: 1,
        s: 1,
        hidden: false,
        shown: false,
        vis: 0,
        appear: 0,
        wpp: 1,
        rPx: 0,
        baseY: 0,
        prio: prioOf(p) + (idx % 97) * 0.01,
      }
      minis.set(p.id, m)
      root.current.add(r)
    })
    layout.key = ''
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
    const H = size.height
    const yS = runtime.yScale
    const now = state.clock.elapsedTime
    wantFull.current.clear()
    const list = [...minis.values()]
    for (const m of list) m.hidden = (!active.has(m.p.id) && m.p.id !== selectedId) || (studio && m.p.id !== selectedId)

    // 1) the arrangement for the current zoom step (recomputed only when the step or the set changes)
    const d = Math.max(runtime.distance, 1e-3)
    const stepNow = Math.log(d) / Math.log(STEP)
    const real = studio || walking
    const key = (real ? 'real|' : '') + [...active].length + '|' + (selectedId ?? '') + '|' + list.map((m) => (m.hidden ? 0 : 1)).join('')
    if (key !== layout.key || Number.isNaN(layout.step) || Math.abs(stepNow - layout.step) > STEP_HYST) {
      layout.step = Math.round(stepNow)
      layout.key = key
      const dStep = Math.pow(STEP, layout.step)
      // footprint radius (km) of a symbolic miniature at this step
      layout.R = real ? 0 : (symbolicPx(dStep) * ((2 * dStep * Math.tan(THREE.MathUtils.degToRad(15))) / Math.max(H, 1))) / 2
      const shownList = list.filter((m) => !m.hidden)
      for (const m of list) {
        m.lx = m.tx
        m.lz = m.tz
        m.sL = real ? 1 : Math.max(1, layout.R / (m.rFoot / 1000))
      }
      if (!real && layout.R > 0) {
        // buildings already larger than the symbolic size keep their own (real) footprint in the arrangement
        const placed = arrange(shownList, layout.R)
        for (const [m, [x, z, r]] of placed) {
          m.lx = x
          m.lz = z
          m.sL = Math.max(1, r / (m.rFoot / 1000))
        }
      }
    }

    // 2) animate towards the arrangement, ground height, screen size
    for (const m of list) {
      const k = 1 - Math.exp(-dt * 6)
      const first = m.vis < 0.01
      m.px = first ? m.lx : m.px + (m.lx - m.px) * k
      m.pz = first ? m.lz : m.pz + (m.lz - m.pz) * k
      let s = m.sL
      if (m.p.id === hoverId && s > 1) s *= 1.06
      m.s = first ? s : m.s + (s - m.s) * Math.min(1, dt * 7)
      const fx = m.px + m.foot.x * 0.001 * m.s
      const fz = m.pz + m.foot.y * 0.001 * m.s
      // ground: the levelled plateau under the selected / driven-to building, otherwise the
      // highest ground under the core of the footprint (never buried, barely floating)
      const grounded = (m.p.id === selectedId && m.s < 1.5) || m.p.id === flatId
      if (grounded) m.baseY = groundY(fx, fz) ?? -SLAB * yS
      else {
        const rr = (m.rFoot / 1000) * m.s * 0.45
        let hi = groundY(fx, fz) ?? -SLAB * yS
        for (let q = 0; q < 6; q++) {
          const a = (q / 6) * Math.PI * 2
          const h = groundY(fx + Math.cos(a) * rr, fz + Math.sin(a) * rr)
          if (h !== null) hi = Math.max(hi, h)
        }
        m.baseY = hi
      }
      tmpV.set(fx, m.baseY, fz)
      const dist = Math.max(cam.position.distanceTo(tmpV), 1e-3)
      m.wpp = (2 * dist * tanH) / H
      m.rPx = ((m.rFoot / 1000) * m.s) / m.wpp
      m.shown = !m.hidden && m.state === 'ready'
    }

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

    // 4) place, fade, shadows, leader lines, dots, pick proxies, labels
    const lp = leaderGeo.attributes.position as THREE.BufferAttribute
    for (const m of list) {
      if (m.state === 'ready' && intro) m.appear = Math.min(1, m.appear + dt * 1.6)
      m.vis += ((m.shown ? 1 : 0) - m.vis) * Math.min(1, dt * 9)
      if (!m.shown && m.vis < 0.02) m.vis = 0
      const show = m.state === 'ready' && m.vis > 0 && m.appear > 0
      m.root.visible = show
      const ease = 1 - Math.pow(1 - Math.min(m.appear, m.vis), 3)
      m.root.position.set(m.px, m.baseY, m.pz)
      m.root.scale.setScalar(0.001 * m.s * Math.max(ease, 1e-4))
      const useFull = m.full && wantFull.current.has(m.p.id)
      if (m.far) m.far.visible = !useFull
      if (m.full) m.full.visible = !!useFull
      const rKm = (m.rFoot / 1000) * m.s
      const hKm = (m.size.y / 1000) * m.s
      const fx = m.px + m.foot.x * 0.001 * m.s
      const fz = m.pz + m.foot.y * 0.001 * m.s
      // soft contact shadow, nudged away from the north-west key light
      tmpM.position.set(fx + rKm * 0.12, m.baseY + 0.00002 * m.s, fz + rKm * 0.1)
      tmpM.rotation.set(0, m.turn.rotation.y, 0)
      const sh = show ? rKm * 2.25 * ease : 1e-9
      tmpM.scale.set(sh * Math.max(0.55, m.size.x / Math.max(m.size.x, m.size.z)), 1, sh * Math.max(0.55, m.size.z / Math.max(m.size.x, m.size.z)))
      tmpM.updateMatrix()
      shadows.current.setMatrixAt(m.idx, tmpM.matrix)
      // leader line + dot on the real site when the building stands displaced in an arrangement
      const off = Math.hypot(m.px - m.tx, m.pz - m.tz)
      const leader = show && off > rKm * 0.55
      const ty = groundY(m.tx, m.tz) ?? -SLAB * yS
      const o = m.idx * 2
      if (leader) {
        lp.setXYZ(o, m.tx, ty + 0.00002 * m.s, m.tz)
        lp.setXYZ(o + 1, m.px, m.baseY + 0.00002 * m.s, m.pz)
      } else {
        lp.setXYZ(o, 0, -1e4, 0)
        lp.setXYZ(o + 1, 0, -1e4, 0)
      }
      tmpM.position.set(m.tx, ty + 0.00003 * m.s, m.tz)
      tmpM.rotation.set(0, 0, 0)
      tmpM.scale.setScalar(leader ? Math.max(rKm * 0.09, m.wpp * 2.2) * ease : 1e-9)
      tmpM.updateMatrix()
      dots.current.setMatrixAt(m.idx, tmpM.matrix)
      // invisible pick proxy (cylinder around the building)
      const pickOn = show && m.shown
      tmpM.position.set(fx, m.baseY, fz)
      tmpM.scale.set(pickOn ? rKm * 0.8 : 1e-9, pickOn ? Math.max(hKm, rKm * 0.3) : 1e-9, pickOn ? rKm * 0.8 : 1e-9)
      tmpM.updateMatrix()
      pick.current.setMatrixAt(m.idx, tmpM.matrix)
      // label anchor above the miniature
      const lbl = runtime.miniLabels.get(m.p.id) ?? new THREE.Vector3()
      lbl.set(fx, m.baseY + hKm * 1.05, fz)
      runtime.miniLabels.set(m.p.id, lbl)
      runtime.miniVisible.set(m.p.id, show && m.shown && m.vis > 0.6)

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
    runtime.miniClusters = []
    if (!selectedId) runtime.model = null
    else {
      const sel = minis.get(selectedId)
      if (sel?.state === 'error' && st.modelState !== 'error') st.setModelState('error')
      if ((sel?.state === 'loading' || sel?.state === 'idle') && st.modelState !== 'loading') st.setModelState('loading')
    }
    lp.needsUpdate = true
    leaderGeo.computeBoundingSphere()
    shadows.current.instanceMatrix.needsUpdate = true
    dots.current.instanceMatrix.needsUpdate = true
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
      dots.current.setMatrixAt(i, hide)
      pick.current.setMatrixAt(i, hide)
    }
  }, [projects])
  useEffect(() => () => leaderGeo.dispose(), [leaderGeo])

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
      <lineSegments geometry={leaderGeo} frustumCulled={false} renderOrder={2}>
        <lineBasicMaterial color="#c9a86a" transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
      <instancedMesh ref={shadows} args={[shadowGeo, shadowMat, projects.length]} frustumCulled={false} renderOrder={1} />
      <instancedMesh ref={dots} args={[dotGeo, dotMat, projects.length]} frustumCulled={false} renderOrder={3} />
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
