/**
 * DOM labels (cities, counties, regions, neighbouring countries, projects,
 * clusters). Positions are written each frame by scene/labels.ts.
 */
import { useEffect, useMemo } from 'react'
import type { Vectors } from '../geo/terrain'
import { labelState, type LabelItem } from '../scene/labels'
import { PROJECTS, displayName, matchesFilters, useStore } from '../state/store'
import { project as proj } from '../geo/projection'

const CITY_MAX: Record<number, number> = { 1: 4000, 2: 1500, 3: 760, 4: 380, 5: 190 }

export function LabelLayer({ vectors }: { vectors: Vectors }) {
  const lang = useStore((s) => s.lang)
  const filters = useStore((s) => s.filters)
  const selectedId = useStore((s) => s.selectedId)
  const hoverId = useStore((s) => s.hoverId)
  const context = useStore((s) => s.context)

  const items = useMemo<LabelItem[]>(() => {
    const out: LabelItem[] = []
    for (const n of vectors.neighbours) out.push({ key: 'n:' + n.name, kind: 'neighbour', prio: 60, x: n.x, z: n.z, minD: 300, maxD: 5000, el: null, w: 0, h: 0, y: -3 })
    for (const r of vectors.regions) out.push({ key: 'r:' + r.name, kind: 'region', prio: 40, x: r.x, z: r.z, minD: 360, maxD: 2600, el: null, w: 0, h: 0 })
    for (const c of vectors.countyLabels) out.push({ key: 'c:' + c.name, kind: 'county', prio: 70, x: c.x, z: c.z, minD: 70, maxD: 560, el: null, w: 0, h: 0 })
    for (const c of vectors.cities) out.push({ key: 'ci:' + c.name, kind: 'city', prio: 10 + c.prio * 4, x: c.x, z: c.z, minD: 0.5, maxD: CITY_MAX[c.prio] ?? 200, el: null, w: 0, h: 0 })
    for (const p of PROJECTS) {
      const q = proj(p.lat, p.lon)
      out.push({ key: 'p:' + p.id, kind: 'project', prio: 6, x: q.x, z: q.z, minD: 0, maxD: 160, el: null, w: 0, h: 0, projectId: p.id })
    }
    return out
  }, [vectors])

  useEffect(() => {
    labelState.items = items
    labelState.dirtySize = true
  }, [items])
  useEffect(() => {
    labelState.dirtySize = true
  }, [lang])
  useEffect(() => {
    labelState.activeProjects = new Set(PROJECTS.filter((p) => matchesFilters(p, filters)).map((p) => p.id))
  }, [filters])
  useEffect(() => {
    labelState.selectedId = selectedId
    labelState.hoverId = hoverId
  }, [selectedId, hoverId])

  const text = (it: LabelItem) => {
    if (it.kind === 'project') {
      const p = PROJECTS.find((x) => x.id === it.projectId)!
      return displayName(p, lang)
    }
    const name = it.key.split(':').slice(1).join(':')
    if (it.kind === 'city') {
      const c = vectors.cities.find((x) => x.name === name)!
      return lang === 'hu' && c.nameHu !== c.name ? c.nameHu : c.name
    }
    if (it.kind === 'county') {
      const c = vectors.countyLabels.find((x) => x.name === name)!
      return lang === 'hu' && c.nameHu ? c.nameHu : c.name
    }
    const r = (it.kind === 'region' ? vectors.regions : vectors.neighbours).find((x) => x.name === name)!
    return lang === 'hu' ? r.nameHu : lang === 'en' ? r.nameEn : r.name
  }

  return (
    <div className={`labels ${context === 'studio' ? 'hidden' : ''}`} aria-hidden="true">
      {items.map((it) => (
        <div
          key={it.key}
          ref={(el) => {
            it.el = el
          }}
          className={`lbl lbl-${it.kind} ${it.kind === 'city' ? 'p' + (it.prio - 10) / 4 : ''} ${it.projectId === selectedId ? 'sel' : ''}`}
          onClick={it.kind === 'project' ? () => useStore.getState().select(it.projectId!) : undefined}
          onPointerEnter={it.kind === 'project' ? () => useStore.getState().setHover(it.projectId!) : undefined}
          onPointerLeave={it.kind === 'project' ? () => useStore.getState().setHover(null) : undefined}
        >
          {it.kind === 'city' && <i className="dot" />}
          {text(it)}
        </div>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <button
          key={'cl' + i}
          className="cluster"
          ref={(el) => {
            if (el) labelState.clusterEls[i] = el
          }}
          onClick={() => {
            const ids = labelState.clusters[i]
            if (ids) useStore.getState().command({ kind: 'fit', ids })
          }}
        >
          <span />
        </button>
      ))}
    </div>
  )
}
