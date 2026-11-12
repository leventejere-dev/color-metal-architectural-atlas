import type { Lang } from '../data/types'
import { useStore, useT } from '../state/store'
import { Icon } from './icons'

export const EXHIBITION_URL = 'https://leventejere-dev.github.io/color-metal-exhibition/'

export function TopBar() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const q = useStore((s) => s.filters.q)
  const setFilters = useStore((s) => s.setFilters)
  const listOpen = useStore((s) => s.listOpen)
  const setListOpen = useStore((s) => s.setListOpen)
  const filtersOpen = useStore((s) => s.filtersOpen)
  const setFiltersOpen = useStore((s) => s.setFiltersOpen)
  const tourActive = useStore((s) => s.tour.active)

  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => {
          const st = useStore.getState()
          st.select(null)
          st.command({ kind: 'overview' })
        }}
        aria-label={t.overview}
      >
        <img src="color-metal-logo.svg" alt="COLOR METAL" className="logo" />
        <span className="brand-text">
          <span className="brand-title">{t.atlas}</span>
          <span className="brand-tag">{t.tagline}</span>
        </span>
      </button>

      <div className="top-actions">
        <label className={`search ${q ? 'has' : ''}`}>
          <Icon.search />
          <input
            type="search"
            value={q}
            placeholder={t.search}
            aria-label={t.search}
            onChange={(e) => {
              setFilters({ q: e.target.value })
              if (!listOpen) setListOpen(true)
            }}
          />
          {q && (
            <button className="clear" onClick={() => setFilters({ q: '' })} aria-label={t.clearFilters}>
              <Icon.close />
            </button>
          )}
        </label>
        <button
          className={`tb-btn hide-xs ${filtersOpen ? 'on' : ''}`}
          onClick={() => {
            setFiltersOpen(!filtersOpen)
            if (!listOpen) setListOpen(true)
          }}
          aria-pressed={filtersOpen}
        >
          <Icon.filter />
          <span className="lbl-text">{t.filters}</span>
        </button>
        <button className={`tb-btn ${tourActive ? 'on' : ''}`} onClick={() => useStore.getState().setTour({ active: true, playing: false, ids: [], index: -1 })}>
          <Icon.play />
          <span className="lbl-text">{t.startTour}</span>
        </button>
        <a className="tb-btn ghost hide-sm" href={EXHIBITION_URL} target="_blank" rel="noreferrer">
          <span className="lbl-text">{t.exhibition}</span>
          <Icon.external />
        </a>
        <div className="lang" role="group" aria-label={t.language}>
          {(['ro', 'hu', 'en'] as Lang[]).map((l) => (
            <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)} aria-pressed={l === lang}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="tb-btn icon" onClick={() => useStore.getState().setAboutOpen(true)} aria-label={t.about}>
          <Icon.info />
        </button>
      </div>
    </header>
  )
}
