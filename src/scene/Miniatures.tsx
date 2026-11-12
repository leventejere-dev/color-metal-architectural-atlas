/**
 * Every reference building stands on the map as its own architectural
 * miniature on a small presentation plinth — from the national overview down
 * to true 1:1 scale.
 *
 *  - Scale: at small map scales each miniature keeps a constant on-screen size
 *    (its plinth ≈ TARGET_PX), i.e. it is symbolically enlarged; as the camera
 *    approaches, the enlargement shrinks continuously until the building is at
 *    its real size on its real site. The UI always states the enlargement.
 *  - Decluttering: miniatures that would overlap on screen (Bucharest, Iași…)
 *    are gently pushed apart, each with a fine leader line to its true
 *    location; the offsets vanish as the camera approaches.
 *  - Level of detail: a light far version (thin parts dropped) is built for
 *    every project in the background; the full-detail version is built only
 *    for the selected building and for miniatures that are large on screen
 *    (LRU-cached, evicted geometry disposed).
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
import { rotationFor, runtime } from './runtime'
import { METAL_COLOR } from './metalColors'
import { Builder, V, facet } from '../lib/geo'

const TARGET_PX = 54 // on-screen plinth diameter at small map scales
const MAX_PX = 170 // on-screen plinth diameter just before true scale takes over
const FULL_PX = 150 // switch to the full-detail model above this on-screen size
const FAR_MIN_FEATURE = 1.3 // metres
const FULL_CACHE = 10
/** ids that want full detail this frame (eviction never removes them) */
const wantedNow = new Set<string>()
const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa')

export interface Mini {
  p: Project
  idx: number
  root: THREE.Group
  turn: THREE.Group
  modelHolder: THREE.Group
  plinth: THREE.Group
  skirt: THREE.Mesh
  far: THREE.Group | null
  full: THREE.Group | null
  centreOffset: THREE.Vector3
  size: THREE.Vector3
  /** centre of the model's footprint in the base frame (ensembles may extend far from the origin) */
  foot: THREE.Vector2
  plinthR: number
  mod: ModelModule | null
  extra: Mats
  state: 'idle' | 'loading' | 'ready' | 'error'
  fullState: 'none' | 'loading' | 'ready'
  lastFullUse: number
  tx: number
  tz: number
  off: THREE.Vector2
  disp: THREE.Vector2
  s: number
  appear: number
  hidden: boolean
  /** no model yet: drawn as an instanced roof-sample marker */
  instanced: boolean
  /** index among chips sharing the same town point (0 = on the point) */
  spiral: number
  /** desired symbolic enlargement before compaction */
  sT: number
  /** current compaction factor (1 = full readable size, < 1 = compact in a dense area) */
  f: number
  /** km per pixel at the miniature (this frame) */
  wpp: number
  /** cartographic priority: who keeps full size when miniatures collide */
  prio: number
}

const CHIP = 0.42 // town-level register entries are drawn smaller than 3D models
const COMPACT = 0.5 // hero size factor in dense areas
const CHIP_COMPACT = 0.62
/** exhibition models first, then models with published photographs, then other models; chips last */
function prioOf(p: Project) {
  const mod = p.model.module
  if (!mod) return 0
  const tier = { A: 40, B: 30, C: 20, D: 10 }[p.model.tier as 'A' | 'B' | 'C' | 'D'] ?? 10
  return (mod.startsWith('exhibition:') ? 500 : 0) + (p.photos.length ? 200 : 100) + tier
}

/* ---------------- shared presentation-base geometry & materials ---------------- */
const plinthGeo = new THREE.CylinderGeometry(1, 1, 1, 72).translate(0, -0.5, 0)
const skirtGeo = new THREE.CylinderGeometry(0.985, 1.03, 1, 72, 1, true).translate(0, -0.5, 0)
const ringGeo = new THREE.RingGeometry(0.975, 1, 96).rotateX(-Math.PI / 2)
const plinthTop = new THREE.MeshStandardMaterial({ color: '#dcd6ca', roughness: 0.85, metalness: 0 })
const plinthSide = new THREE.MeshStandardMaterial({ color: '#c6bfb1', roughness: 0.9, metalness: 0 })
const brass = new THREE.MeshStandardMaterial({ color: '#b99a5e', roughness: 0.3, metalness: 1 })
const PLINTH_H = 0.8 // m

/** Material sample for projects without a model: a small standing-seam gable roof piece (metres). */
const sampleGeo = (() => {
  const b = new Builder()
  const w = 7
  const d = 5.2
  const h = 2.6
  const sp = { key: 'm', spacing: 0.5, h: 0.08, w: 0.06 }
  facet(b, 'm', [V(-w / 2, 0.6, d / 2), V(w / 2, 0.6, d / 2), V(w / 2, 0.6 + h, 0), V(-w / 2, 0.6 + h, 0)], { seams: sp, thickness: 0.1 })
  facet(b, 'm', [V(w / 2, 0.6, -d / 2), V(-w / 2, 0.6, -d / 2), V(-w / 2, 0.6 + h, 0), V(w / 2, 0.6 + h, 0)], { seams: sp, thickness: 0.1 })
  b.beam('m', V(-w / 2, 0.66 + h, 0), V(w / 2, 0.66 + h, 0), 0.3, 0.16)
  b.block('m', w * 0.9, 0.6, d * 0.9, 0, 0, 0)
  const g = b.build({ m: new THREE.MeshBasicMaterial() }, 'sample')
  const geo = (g.children[0] as THREE.Mesh).geometry
  return geo
})()
const sampleMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.85, roughness: 0.32, envMapIntensity: 1.25 })

/* ---------------- registry & build queue ---------------- */
const minis = new Map<string, Mini>()
let busy = false

/** Access a project's miniature rig (used by the walk-around mode). */
export function getMini(id: string | null | undefined) {
  return id ? minis.get(id) : undefined
}

/** The visible 3D miniature nearest to a ground point (km), with its real size (km). */
export function nearestMini(x: number, z: number) {
  let best: { id: string; distKm: number; sizeKm: number } | null = null
  for (const m of minis.values()) {
    if (m.hidden || m.state !== 'ready' || !m.p.model.module || !m.root.visible) continue
    const d = Math.hypot(m.tx + m.disp.x - x, m.tz + m.disp.y - z)
    if (!best || d < best.distKm) best = { id: m.p.id, distKm: d, sizeKm: Math.max(m.size.x, m.size.z, 12) / 1000 }
  }
  return best
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
    // reference frame from the full geometry's footprint (cheap second pass is avoided:
    // the far bbox equals the full bbox except for small dropped details)
    const box = new THREE.Box3().setFromObject(g)
    if (mod.recentre) {
      const c = box.getCenter(new THREE.Vector3())
      m.centreOffset.set(-c.x, -box.min.y, -c.z)
      box.translate(m.centreOffset)
    }
    g.position.copy(m.centreOffset)
    finishMaterials(g)
    m.size = box.getSize(new THREE.Vector3())
    m.plinthR = Math.hypot(m.size.x, m.size.z) * 0.62 + 7
    // centre the presentation base under the whole composition (turn-local → base frame)
    const bc = box.getCenter(new THREE.Vector3())
    const th = m.turn.rotation.y
    m.foot.set(bc.x * Math.cos(th) + bc.z * Math.sin(th), -bc.x * Math.sin(th) + bc.z * Math.cos(th))
    m.plinth.position.set(m.foot.x, 0, m.foot.y)
    m.far = g
    m.modelHolder.add(g)
    m.plinth.scale.set(m.plinthR, 1, m.plinthR)
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
  g.visible = false
  m.full = g
  m.modelHolder.add(g)
  m.fullState = 'ready'
  // LRU eviction of full-detail models — never the selected one or one wanted this frame
  // (evicting a wanted model makes it fall back to the far version and flicker while it rebuilds)
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
  const sampleI = useRef<THREE.InstancedMesh>(null!)
  const plinthI = useRef<THREE.InstancedMesh>(null!)
  const ringI = useRef<THREE.InstancedMesh>(null!)
  const anchors = useRef<THREE.InstancedMesh>(null!)
  const leaderGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(projects.length * 6), 3).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [projects])
  const fpGroup = useRef<THREE.Group>(null!)
  const filters = useStore((s) => s.filters)
  const intro = useStore((s) => s.introDone)
  const active = useMemo(() => new Set(projects.filter((p) => matchesFilters(p, filters)).map((p) => p.id)), [projects, filters])
  const wantFull = useRef(new Set<string>())

  // create a placement rig per project
  useEffect(() => {
    projects.forEach((p, idx) => {
      if (minis.has(p.id)) return
      const q = toScene(p.lat, p.lon)
      const r = new THREE.Group()
      r.name = 'mini:' + p.id
      const turn = new THREE.Group()
      const modelHolder = new THREE.Group()
      turn.add(modelHolder)
      const plinth = new THREE.Group()
      const top = new THREE.Mesh(plinthGeo, plinthTop)
      top.scale.y = PLINTH_H
      top.receiveShadow = true
      const skirt = new THREE.Mesh(skirtGeo, plinthSide)
      skirt.position.y = -PLINTH_H
      const ring = new THREE.Mesh(ringGeo, brass)
      ring.position.y = 0.012
      plinth.add(top, skirt, ring)
      r.add(plinth, turn)
      turn.rotation.y = rotationFor(p)
      const m: Mini = {
        p,
        idx,
        root: r,
        turn,
        modelHolder,
        plinth,
        skirt,
        far: null,
        full: null,
        centreOffset: new THREE.Vector3(),
        size: new THREE.Vector3(30, 15, 30),
        foot: new THREE.Vector2(),
        plinthR: 26,
        mod: null,
        extra: {},
        state: p.model.module ? 'idle' : 'error',
        fullState: 'none',
        lastFullUse: 0,
        tx: q.x,
        tz: q.z,
        off: new THREE.Vector2(),
        disp: new THREE.Vector2(),
        s: 1,
        appear: 0,
        hidden: false,
        instanced: !p.model.module,
        spiral: 0,
        sT: 1,
        f: 1,
        wpp: 1,
        prio: prioOf(p) + (idx % 97) * 0.01,
      }
      if (m.instanced) {
        // no model yet (tier D): instanced roof-sample marker in the project's metal
        r.remove(plinth)
        m.size.set(7, 3.4, 5.2)
        m.plinthR = 7
        m.state = 'ready'
        const c = new THREE.Color(METAL_COLOR[p.metals[0] ?? 'titanium-zinc'])
        sampleI.current?.setColorAt(idx, c)
      }
      plinth.scale.set(m.plinthR, 1, m.plinthR)
      minis.set(p.id, m)
      root.current.add(r)
    })
    if (sampleI.current.instanceColor) sampleI.current.instanceColor.needsUpdate = true
    // chips that share a town point (town-level register entries) get spiral slots; a 3D model there takes slot 0
    const groups = new Map<string, Mini[]>()
    for (const m of minis.values()) {
      const key = m.tx.toFixed(3) + ',' + m.tz.toFixed(3)
      const g = groups.get(key) ?? []
      g.push(m)
      groups.set(key, g)
    }
    for (const g of groups.values()) {
      const hasHero = g.some((m) => !m.instanced)
      let k = hasHero ? 1 : 0
      for (const m of g.filter((x) => x.instanced)) m.spiral = k++
    }
  }, [projects])

  const fpGeo = useMemo(() => {
    if (!QA) return null
    return projects
  }, [projects])

  useFrame((state, dt) => {
    const t = runtime.terrain
    if (!t) return
    const st = useStore.getState()
    const selectedId = st.selectedId
    const hoverId = st.hoverId
    const studio = st.context === 'studio'
    const cam = camera as THREE.PerspectiveCamera
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const H = size.height
    const yS = runtime.yScale
    const ctrl = runtime.controls
    const pol = ctrl ? ctrl.polarAngle : 0.8
    const az = ctrl ? ctrl.azimuthAngle : 0
    const cosP = Math.max(0.35, Math.cos(pol))
    const rx = Math.cos(az)
    const rz = -Math.sin(az)
    const fx = -Math.sin(az)
    const fz = -Math.cos(az)
    const now = state.clock.elapsedTime
    wantFull.current.clear()

    // 1) scale per miniature (constant on-screen size far away, true scale near)
    const list = [...minis.values()]
    for (const m of list) {
      m.hidden = (!active.has(m.p.id) && m.p.id !== selectedId) || (studio && m.p.id !== selectedId)
      tmpV.set(m.tx + m.disp.x, 0, m.tz + m.disp.y)
      tmpV.y = t.inside(tmpV.x, tmpV.z) ? t.y(tmpV.x, tmpV.z) * yS : -SLAB * yS
      const dist = Math.max(cam.position.distanceTo(tmpV), 1e-3)
      const wpp = (2 * dist * tanH) / H // km per pixel at the miniature
      const diaKm = (2 * m.plinthR) / 1000
      // on-screen size grows as the camera approaches, then real scale takes over;
      // town-level register entries (instanced chips) stay smaller than the 3D models
      const chip = m.instanced ? CHIP : 1
      const targetPx = THREE.MathUtils.clamp(TARGET_PX * chip * Math.pow(800 / dist, 0.28), TARGET_PX * chip, MAX_PX * chip)
      m.sT = Math.max(1, (targetPx * wpp) / diaKm)
      m.wpp = wpp
    }

    // 2) cartographic priority: where enlarged miniatures would collide, the more important one keeps
    //    its readable size and the others stand compact on their own sites (hysteresis avoids flicker)
    const pr = (m: Mini) => (m.p.id === selectedId ? 1e4 : m.p.id === hoverId ? 5e3 : m.prio + (m.f > 0.9 ? 25 : 0))
    const order = list.filter((m) => !m.hidden && m.state === 'ready').sort((a, b) => pr(b) - pr(a))
    const placed: Mini[] = []
    const fullR = (m: Mini) => (m.plinthR / 1000) * m.sT
    for (const m of order) {
      let ok = true
      if (m.sT > 1.02 && !studio) {
        const ra = fullR(m)
        for (const o of placed) {
          const dx = m.tx - o.tx
          const dz = m.tz - o.tz
          const du = dx * rx + dz * rz
          const dv = (dx * fx + dz * fz) * cosP
          if (Math.hypot(du, dv) < (ra + fullR(o)) * (m.f > 0.9 ? 0.78 : 0.95)) {
            ok = false
            break
          }
        }
      }
      if (ok) placed.push(m)
      const fT = ok ? 1 : m.instanced ? CHIP_COMPACT : COMPACT
      m.f += (fT - m.f) * Math.min(1, dt * 5)
    }
    const fullCands: [Mini, number][] = []
    for (const m of list) {
      const diaKm = (2 * m.plinthR) / 1000
      let s = Math.max(1, m.sT * m.f)
      if (m.p.id === hoverId && s > 1) s *= 1.12
      if (studio) s = 1
      m.s += (s - m.s) * Math.min(1, dt * 10)
      const screenPx = (diaKm * m.s) / m.wpp
      if (!m.hidden && (m.p.id === selectedId || screenPx > FULL_PX) && m.state === 'ready' && m.p.model.module) {
        fullCands.push([m, m.p.id === selectedId ? Infinity : screenPx])
      }
    }
    // only the largest on-screen miniatures get full detail (bounded by the cache → no rebuild thrash)
    fullCands.sort((a, b) => b[1] - a[1])
    wantedNow.clear()
    for (const [m] of fullCands.slice(0, FULL_CACHE - 1)) {
      wantFull.current.add(m.p.id)
      wantedNow.add(m.p.id)
      m.lastFullUse = now
    }

    // 3) declutter: push overlapping 3D miniatures apart in screen-like space, relax towards the true site;
    //    the more important miniature stays put
    for (const m of list) m.off.multiplyScalar(0.9)
    const heroes = list.filter((m) => !m.instanced)
    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < heroes.length; i++) {
        const a = heroes[i]
        if (a.hidden || a.state !== 'ready') continue
        const ra = (a.plinthR / 1000) * a.s * 1.06
        for (let j = i + 1; j < heroes.length; j++) {
          const b = heroes[j]
          if (b.hidden || b.state !== 'ready') continue
          const rb = (b.plinthR / 1000) * b.s * 1.06
          const dx = a.tx + a.off.x - (b.tx + b.off.x)
          const dz = a.tz + a.off.y - (b.tz + b.off.y)
          const du = dx * rx + dz * rz
          const dv = (dx * fx + dz * fz) * cosP
          const d = Math.hypot(du, dv)
          const minD = ra + rb
          if (d >= minD) continue
          const push = (minD - (d || 1e-6)) / 2
          let nu = d > 1e-6 ? du / d : Math.cos(i * 2.399)
          let nv = d > 1e-6 ? dv / d : Math.sin(i * 2.399)
          nu *= push
          nv *= push / cosP
          const wx = rx * nu + fx * nv
          const wz = rz * nu + fz * nv
          // the selected building stays on its site; a full-size miniature yields to nobody compact
          const wa = a.p.id === selectedId ? 0 : b.p.id === selectedId ? 2 : a.f > b.f + 0.2 ? 0 : b.f > a.f + 0.2 ? 2 : 1
          const wb = 2 - wa
          a.off.x += wx * wa
          a.off.y += wz * wa
          b.off.x -= wx * wb
          b.off.y -= wz * wb
        }
      }
    }

    // cap hero offsets close to the true site (≤ 1.6 radii full size, ≤ 2.4 compact) and lay town-level chips
    // out in a tight sunflower spiral around their town
    for (const m of list) {
      const r = (m.plinthR / 1000) * m.s
      if (!m.instanced) {
        const L = m.off.length()
        const cap = r * (m.f > 0.9 ? 1.6 : 2.4)
        if (L > cap) m.off.multiplyScalar(cap / L)
      } else {
        const k = m.spiral
        if (k > 0) {
          const ang = k * 2.39996
          const rad = r * 1.12 * Math.sqrt(k)
          m.off.set(Math.cos(ang) * rad, Math.sin(ang) * rad)
        } else m.off.set(0, 0)
      }
    }

    // 3) place, LOD switch, base height, leaders, anchors, pick proxies
    const lp = leaderGeo.attributes.position as THREE.BufferAttribute
    for (const m of list) {
      m.disp.lerp(m.off, Math.min(1, dt * 6))
      if (m.state === 'ready' && intro) m.appear = Math.min(1, m.appear + dt * 1.6)
      const show = !m.hidden && m.state === 'ready' && m.appear > 0
      m.root.visible = show
      const x = m.tx + m.disp.x
      const z = m.tz + m.disp.y
      const rKm = (m.plinthR / 1000) * m.s
      // base: highest ground under the plinth so the miniature stands clear of the relief
      let hi = -Infinity
      let lo = Infinity
      const inside = t.inside(x, z)
      if (inside) {
        for (let k = 0; k < 9; k++) {
          const ang = (k / 8) * Math.PI * 2
          const rr = k === 8 ? 0 : rKm * 0.85
          const h = t.y(x + Math.cos(ang) * rr, z + Math.sin(ang) * rr)
          hi = Math.max(hi, h)
          lo = Math.min(lo, h)
        }
      } else {
        hi = lo = -SLAB
      }
      if (m.p.id === selectedId && m.s < 1.5) hi = lo = inside ? t.y(m.tx, m.tz) : -SLAB
      const baseY = hi * yS
      const ease = 1 - Math.pow(1 - m.appear, 3)
      // walking / driving: the building stands directly on the (levelled) ground, without its base
      const grounded = st.walk.active && m.p.id === selectedId
      m.plinth.visible = !grounded
      m.root.position.set(x, baseY + (grounded ? 0 : 0.0004 * m.s * PLINTH_H), z)
      m.root.scale.setScalar(0.001 * m.s * Math.max(ease, 1e-4))
      // skirt reaches down to the lowest ground under the plinth
      const depthM = Math.max(6, ((hi - lo) * yS) / (0.001 * m.s) + 4)
      m.skirt.scale.set(1, depthM, 1)
      // LOD
      const useFull = m.full && wantFull.current.has(m.p.id)
      if (m.far) m.far.visible = !useFull
      if (m.full) m.full.visible = !!useFull
      // leader line from the true site to the displaced miniature
      const ty = t.inside(m.tx, m.tz) ? t.y(m.tx, m.tz) * yS : -SLAB * yS
      const off = Math.hypot(m.disp.x, m.disp.y)
      const o = m.idx * 6
      if (show && !m.instanced && off > rKm * 0.35) {
        lp.setXYZ(o / 3, m.tx, ty, m.tz)
        lp.setXYZ(o / 3 + 1, x, baseY, z)
      } else {
        lp.setXYZ(o / 3, 0, -1e4, 0)
        lp.setXYZ(o / 3 + 1, 0, -1e4, 0)
      }
      // anchor dot on the true site (only when displaced or filtered out)
      const camD = cam.position.distanceTo(tmpV.set(m.tx, ty, m.tz))
      const dotS = (camD * 2 * tanH * 3.2) / H
      tmpM.position.set(m.tx, ty + dotS * 0.2, m.tz)
      tmpM.rotation.set(-Math.PI / 2, 0, 0)
      tmpM.scale.setScalar(show && !m.instanced && off > rKm * 0.35 ? dotS : m.hidden && !studio ? dotS * 0.6 : 1e-6)
      tmpM.updateMatrix()
      anchors.current.setMatrixAt(m.idx, tmpM.matrix)
      // invisible pick proxy (cylinder around plinth + building)
      const hKm = (m.size.y / 1000) * m.s
      tmpM.position.set(x, baseY, z)
      tmpM.rotation.set(0, 0, 0)
      tmpM.scale.set(show ? rKm : 1e-6, show ? Math.max(hKm, rKm * 0.3) : 1e-6, show ? rKm : 1e-6)
      tmpM.updateMatrix()
      pick.current.setMatrixAt(m.idx, tmpM.matrix)
      // instanced marker parts (plinth, brass ring, roof sample)
      {
        const k = m.instanced && show ? 0.001 * m.s * Math.max(ease, 1e-4) : 0
        const base = tmpM
        base.position.set(x, baseY + 0.0004 * m.s * PLINTH_H, z)
        base.rotation.set(0, m.turn.rotation.y, 0)
        base.scale.set(k * m.plinthR || 1e-9, k * PLINTH_H || 1e-9, k * m.plinthR || 1e-9)
        base.updateMatrix()
        plinthI.current.setMatrixAt(m.idx, base.matrix)
        base.scale.set(k * m.plinthR || 1e-9, k || 1e-9, k * m.plinthR || 1e-9)
        base.updateMatrix()
        ringI.current.setMatrixAt(m.idx, base.matrix)
        base.scale.setScalar(k || 1e-9)
        base.updateMatrix()
        sampleI.current.setMatrixAt(m.idx, base.matrix)
      }
      // label anchor above the miniature
      const lbl = runtime.miniLabels.get(m.p.id) ?? new THREE.Vector3()
      lbl.set(x, baseY + hKm * 1.05, z)
      runtime.miniLabels.set(m.p.id, lbl)
      runtime.miniVisible.set(m.p.id, show)

      // selected: camera framing data, terrain levelling, UI scale note
      if (m.p.id === selectedId && m.state === 'ready') {
        runtime.model = {
          id: m.p.id,
          sizeM: m.size,
          center: new THREE.Vector3(x + m.foot.x * 0.001 * m.s, baseY, z + m.foot.y * 0.001 * m.s),
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
          fpGroup.current.position.set(m.tx, ty, m.tz)
          fpGroup.current.rotation.y = -convergence(m.p.lat, m.p.lon)
          fpGroup.current.scale.setScalar(0.001 * m.s)
        }
      }
    }
    if (!selectedId) runtime.model = null
    else {
      const sel = minis.get(selectedId)
      if (sel?.state === 'error' && sel.p.model.module && st.modelState !== 'error') st.setModelState('error')
      if ((sel?.state === 'loading' || sel?.state === 'idle') && st.modelState !== 'loading') st.setModelState('loading')
    }
    lp.needsUpdate = true
    leaderGeo.computeBoundingSphere()
    anchors.current.instanceMatrix.needsUpdate = true
    pick.current.instanceMatrix.needsUpdate = true
    plinthI.current.instanceMatrix.needsUpdate = true
    ringI.current.instanceMatrix.needsUpdate = true
    sampleI.current.instanceMatrix.needsUpdate = true
    pick.current.computeBoundingSphere()

    // background building starts after the intro so the opening stays smooth
    if (intro || selectedId) pump(selectedId, st.flying, wantFull.current)
  })

  useEffect(() => () => leaderGeo.dispose(), [leaderGeo])

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined) return
    e.stopPropagation()
    useStore.getState().setHover(projects[e.instanceId].id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    useStore.getState().setHover(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined || e.delta > 6) return
    e.stopPropagation()
    const id = projects[e.instanceId].id
    if (useStore.getState().selectedId !== id) useStore.getState().select(id)
  }

  const selected = useStore((s) => s.selectedId)
  const qaProject = QA && fpGeo ? projects.find((p) => p.id === selected && p.footprint) : null
  const qaLine = useMemo(() => {
    if (!qaProject?.footprint) return null
    const pts = qaProject.footprint.map(([e, n]) => new THREE.Vector3(e, 0.4, -n))
    pts.push(pts[0].clone())
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [qaProject])

  return (
    <group>
      <group ref={root} />
      <lineSegments geometry={leaderGeo} frustumCulled={false}>
        <lineBasicMaterial color="#9c8452" transparent opacity={0.75} depthWrite={false} />
      </lineSegments>
      <instancedMesh ref={plinthI} args={[plinthGeo, plinthTop, projects.length]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={ringI} args={[ringGeo, brass, projects.length]} frustumCulled={false} />
      <instancedMesh ref={sampleI} args={[sampleGeo, sampleMat, projects.length]} frustumCulled={false} castShadow />
      <instancedMesh ref={anchors} args={[new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#4a4236', transparent: true, opacity: 0.7, depthWrite: false }), projects.length]} frustumCulled={false} />
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
