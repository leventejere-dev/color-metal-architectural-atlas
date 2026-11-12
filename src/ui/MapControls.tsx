import { useMemo } from 'react'
import { PROJECTS, useStore, useT } from '../state/store'
import { exaggerationFor } from '../scene/runtime'
import { Icon } from './icons'

/** Statistics computed from the database only (never hard-coded). */
export function useStats() {
  return useMemo(() => {
    const ro = PROJECTS.filter((p) => p.country === 'Romania')
    return {
      projects: PROJECTS.length,
      verified: PROJECTS.filter((p) => p.identificationConfidence === 'VERIFIED' && (p.geographicAccuracy === 'building' || p.geographicAccuracy === 'site')).length,
      counties: new Set(ro.map((p) => p.county).filter(Boolean)).size,
      models: PROJECTS.filter((p) => p.model.module).length,
      metals: new Set(PROJECTS.flatMap((p) => p.metals)).size,
    }
  }, [])
}

export function MapControls() {
  const t = useT()
  const d = useStore((s) => s.camDistance)
  const scale = useStore((s) => s.presentationScale)
  const selectedId = useStore((s) => s.selectedId)
  const mode = useStore((s) => s.mode)
  const context = useStore((s) => s.context)
  const introDone = useStore((s) => s.introDone)
  const tourActive = useStore((s) => s.tour.active)
  const stats = useStats()
  const E = exaggerationFor(d)
  const showStats = !selectedId && d > 500 && introDone && !tourActive

  return (
    <>
      <div className={`map-controls ${mode === 'inspect' ? 'inspecting' : ''}`}>
        <button onClick={() => useStore.getState().command({ kind: 'zoom', factor: 0.5 })} aria-label={t.zoomIn} title={t.zoomIn}>
          <Icon.plus />
        </button>
        <button onClick={() => useStore.getState().command({ kind: 'zoom', factor: -1 })} aria-label={t.zoomOut} title={t.zoomOut}>
          <Icon.minus />
        </button>
        <button onClick={() => useStore.getState().command({ kind: 'north' })} aria-label={t.north} title={t.north}>
          <Icon.north />
        </button>
        <button
          onClick={() => {
            const st = useStore.getState()
            st.select(null)
            st.command({ kind: 'overview' })
          }}
          aria-label={t.overview}
          title={t.overview}
        >
          <Icon.home />
        </button>
      </div>

      <div className="scale-notes">
        {context === 'geo' && <span>{t.terrainNote(Math.round(E * 10) / 10)}</span>}
        {selectedId && scale > 1 && context === 'geo' && <span className="warn">{t.scaleEnlarged(scale)}</span>}
        {selectedId && scale <= 1 && mode === 'inspect' && context === 'geo' && <span>{t.scaleTrue}</span>}
      </div>

      {showStats && (
        <div className="stats" aria-label="stats">
          <div>
            <strong>{stats.projects}</strong>
            <span>{t.stats.projects}</span>
          </div>
          <div>
            <strong>{stats.verified}</strong>
            <span>{t.stats.verified}</span>
          </div>
          <div>
            <strong>{stats.counties}</strong>
            <span>{t.stats.counties}</span>
          </div>
          <div>
            <strong>{stats.models}</strong>
            <span>{t.stats.models}</span>
          </div>
          <div>
            <strong>{stats.metals}</strong>
            <span>{t.stats.metals}</span>
          </div>
        </div>
      )}
    </>
  )
}
