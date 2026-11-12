/**
 * Label registry + per-frame projection with priority-based collision
 * avoidance, distance-dependent visibility and screen-space clustering of
 * project markers. DOM nodes are created by ui/LabelLayer.tsx; positions are
 * written directly to their style (no React re-render per frame).
 */
import * as THREE from 'three'
import { runtime } from './runtime'

export type LabelKind = 'neighbour' | 'region' | 'county' | 'city' | 'project'

export interface LabelItem {
  key: string
  kind: LabelKind
  prio: number // lower = more important
  x: number
  z: number
  minD: number
  maxD: number
  el: HTMLElement | null
  w: number
  h: number
  projectId?: string
  /** fixed y (scene) instead of terrain height */
  y?: number
}

export const labelState = {
  items: [] as LabelItem[],
  clusterEls: [] as HTMLElement[],
  /** filled by the projector: cluster index → project ids */
  clusters: [] as string[][],
  selectedId: null as string | null,
  hoverId: null as string | null,
  activeProjects: new Set<string>(),
  dirtySize: true,
  tick: 0,
}

const v = new THREE.Vector3()

interface Placed {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function projectLabels(camera: THREE.Camera, width: number, height: number) {
  const t = runtime.terrain
  if (!t) return
  const d = runtime.distance
  const st = labelState
  st.tick++
  const placed: Placed[] = []
  const visibleCandidates: { item: LabelItem; sx: number; sy: number; prio: number }[] = []
  const projPts: { item: LabelItem; sx: number; sy: number }[] = []

  for (const it of st.items) {
    if (!it.el) continue
    const isProject = it.kind === 'project'
    const special = isProject && (it.projectId === st.selectedId || it.projectId === st.hoverId)
    const inRange = d >= it.minD && d <= it.maxD
    // at inspection range the model itself replaces the selected project's label
    if (isProject && it.projectId === st.selectedId && d < 3) {
      hide(it)
      continue
    }
    if (isProject && !st.activeProjects.has(it.projectId!) && !special) {
      hide(it)
      continue
    }
    if (isProject) {
      // project labels float above their miniature (which may be displaced to avoid overlaps)
      const a = runtime.miniLabels.get(it.projectId!)
      if (!a || !runtime.miniVisible.get(it.projectId!)) {
        hide(it)
        continue
      }
      v.copy(a)
    } else {
      const y = it.y ?? (t.inside(it.x, it.z) ? t.y(it.x, it.z) * runtime.yScale : -3.2 * runtime.yScale)
      v.set(it.x, y, it.z)
    }
    v.project(camera)
    if (v.z > 1 || v.z < -1) {
      hide(it)
      continue
    }
    const sx = (v.x * 0.5 + 0.5) * width
    const sy = (-v.y * 0.5 + 0.5) * height
    if (sx < -100 || sx > width + 100 || sy < -60 || sy > height + 60) {
      hide(it)
      continue
    }
    if (isProject) projPts.push({ item: it, sx, sy })
    if (!inRange && !special) {
      hide(it)
      continue
    }
    if (st.dirtySize || !it.w) {
      it.w = it.el.offsetWidth
      it.h = it.el.offsetHeight
    }
    visibleCandidates.push({ item: it, sx, sy, prio: special ? -10 : it.prio })
  }
  st.dirtySize = false

  // ---- clustering of project markers at small scales ----
  const clusters: { ids: string[]; sx: number; sy: number }[] = []
  const clustered = new Set<string>()
  if (false) {
    const R = 30
    const pts = projPts.filter((p) => st.activeProjects.has(p.item.projectId!))
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      if (clustered.has(a.item.projectId!)) continue
      const members = [a]
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j]
        if (clustered.has(b.item.projectId!)) continue
        if (Math.hypot(a.sx - b.sx, a.sy - b.sy) < R) members.push(b)
      }
      if (members.length > 1) {
        for (const m of members) clustered.add(m.item.projectId!)
        clusters.push({ ids: members.map((m) => m.item.projectId!), sx: members.reduce((s, m) => s + m.sx, 0) / members.length, sy: members.reduce((s, m) => s + m.sy, 0) / members.length })
      }
    }
  }
  st.clusters = clusters.map((c) => c.ids)
  st.clusterEls.forEach((el, i) => {
    const c = clusters[i]
    if (!c) {
      el.classList.remove('on')
      return
    }
    el.dataset.n = String(c.ids.length)
    const span = el.firstElementChild as HTMLElement | null
    if (span && span.textContent !== String(c.ids.length)) span.textContent = String(c.ids.length)
    el.style.transform = `translate3d(${c.sx.toFixed(1)}px, ${(c.sy - 34).toFixed(1)}px, 0) translate(-50%, -50%)`
    el.classList.add('on')
    placed.push({ x0: c.sx - 16, y0: c.sy - 50, x1: c.sx + 16, y1: c.sy - 18 })
  })

  // ---- greedy placement by priority ----
  visibleCandidates.sort((a, b) => a.prio - b.prio)
  for (const c of visibleCandidates) {
    const it = c.item
    if (it.kind === 'project' && clustered.has(it.projectId!) && c.prio > -10) {
      hide(it)
      continue
    }
    const offY = it.kind === 'project' ? -it.h - 4 : -it.h / 2
    const x0 = it.kind === 'city' ? c.sx + 8 : c.sx - it.w / 2
    const y0 = c.sy + offY
    const box = { x0: x0 - 3, y0: y0 - 2, x1: x0 + it.w + 3, y1: y0 + it.h + 2 }
    const overlaps = placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)
    if (overlaps && c.prio > -10) {
      hide(it)
      continue
    }
    placed.push(box)
    it.el!.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`
    it.el!.classList.add('on')
  }
}

function hide(it: LabelItem) {
  it.el?.classList.remove('on')
}
