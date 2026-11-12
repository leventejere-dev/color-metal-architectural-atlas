import { useStore, useT } from '../state/store'
import { Icon } from './icons'

export const EXHIBITION_URL = 'https://leventejere-dev.github.io/color-metal-exhibition/'

export function TopBar() {
  const t = useT()
  const q = useStore((s) => s.filters.q)
  const setFilters = useStore((s) => s.setFilters)
  const listOpen = useStore((s) => s.listOpen)
  const setListOpen = useStore((s) => s.setListOpen)
  const filtersOpen = useStore((s) => s.filtersOpen)
  const setFiltersOpen = useStore((s) => s.setFiltersOpen)
  const tourActive = useStore((s) => s.tour.active)
  const theme = useStore((s) => s.theme)

  return (
    <header className="topbar">
      <button
        className={`tb-btn icon panel-toggle ${listOpen ? 'on' : ''}`}
        onClick={() => setListOpen(!listOpen)}
        aria-pressed={listOpen}
        aria-label={listOpen ? t.hideList : t.showList}
        title={listOpen ? t.hideList : t.showList}
      >
        <Icon.panel />
      </button>
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
        <button
          className="tb-btn icon"
          onClick={() => useStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
          title={theme === 'dark' ? t.lightMode : t.darkMode}
        >
          {theme === 'dark' ? <Icon.sun /> : <Icon.moon />}
        </button>
        <button className="tb-btn icon" onClick={() => useStore.getState().setAboutOpen(true)} aria-label={t.about}>
          <Icon.info />
        </button>
      </div>
    </header>
  )
}
