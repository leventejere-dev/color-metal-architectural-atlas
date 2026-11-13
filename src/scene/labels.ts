/**
 * Label registry + per-frame projection with priority-based collision
 * avoidance, distance-dependent visibility and screen-space clustering of
 * project markers. DOM nodes are created by ui/LabelLayer.tsx; positions are
 * written directly to their style (no React re-render per frame).
 */
import * as THREE from 'three'
import { runtime } from './runtime'
import { useStore } from '../state/store'

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
    // at inspection range the model itself replaces the selected project's label;
    // while walking or driving no project labels are shown at all
    if (isProject && ((it.projectId === st.selectedId && d < 3) || useStore.getState().walk.active)) {
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

  // ---- "+N" badges: a miniature standing for neighbours that would overlap it on screen ----
  const clusters = useStore.getState().walk.active ? [] : runtime.miniClusters
  const shownClusters: string[][] = []
  st.clusterEls.forEach((el) => {
    const c = clusters[shownClusters.length]
    if (!c) {
      el.classList.remove('on')
      return
    }
    v.copy(c.anchor).project(camera)
    if (v.z > 1 || v.z < -1) {
      el.classList.remove('on')
      shownClusters.push([])
      return
    }
    const sx = (v.x * 0.5 + 0.5) * width + Math.min(c.rPx * 0.55, 46)
    const sy = (-v.y * 0.5 + 0.5) * height + 6
    const label = '+' + (c.ids.length - 1)
    const span = el.firstElementChild as HTMLElement | null
    if (span && span.textContent !== label) span.textContent = label
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`
    el.classList.add('on')
    shownClusters.push(c.ids)
    placed.push({ x0: sx - 18, y0: sy - 12, x1: sx + 18, y1: sy + 12 })
  })
  st.clusters = shownClusters

  // ---- greedy placement by priority ----
  visibleCandidates.sort((a, b) => a.prio - b.prio)
  for (const c of visibleCandidates) {
    const it = c.item
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
