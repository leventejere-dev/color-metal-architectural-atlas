import { useMemo } from 'react'
import type { Category, Metal } from '../data/types'
import { CATEGORY_NAMES, METAL_NAMES } from '../i18n/strings'
import { PROJECTS, displayCity, displayName, matchesFilters, useStore, useT } from '../state/store'
import { Icon } from './icons'
import { METAL_COLOR } from '../scene/metalColors'

export function thumbUrl(id: string, file: string) {
  return `photos/${id}/${file}-t.webp`
}

export function Directory() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)
  const clear = useStore((s) => s.clearFilters)
  const open = useStore((s) => s.listOpen)
  const setOpen = useStore((s) => s.setListOpen)
  const filtersOpen = useStore((s) => s.filtersOpen)
  const selectedId = useStore((s) => s.selectedId)
  const hoverId = useStore((s) => s.hoverId)

  const metals = useMemo(() => (['copper', 'titanium-zinc', 'aluminium', 'brass'] as Metal[]).filter((m) => PROJECTS.some((p) => p.metals.includes(m))), [])
  const categories = useMemo(() => [...new Set(PROJECTS.map((p) => p.category))].sort((a, b) => CATEGORY_NAMES[a][lang].localeCompare(CATEGORY_NAMES[b][lang], lang)) as Category[], [lang])
  const counties = useMemo(() => [...new Set(PROJECTS.map((p) => p.county))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ro')), [])
  const list = useMemo(
    () =>
      PROJECTS.filter((p) => matchesFilters(p, filters)).sort(
        (a, b) => Number(!!b.model.module) - Number(!!a.model.module) || displayName(a, lang).localeCompare(displayName(b, lang), lang),
      ),
    [filters, lang],
  )
  const active = filters.metals.length + filters.categories.length + (filters.county ? 1 : 0) + (filters.modelOnly ? 1 : 0) + (filters.q ? 1 : 0)

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <>
      <button className={`list-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon.list />
        <span>{open ? t.hideList : t.showList}</span>
        <em>{list.length}</em>
      </button>
      <aside className={`directory ${open ? 'open' : ''}`} aria-label={t.directory}>
        <div className="dir-head">
          <h2>{t.directory}</h2>
          <span className="count">{t.results(list.length)}</span>
          <button className={`icon-btn ${filtersOpen ? 'on' : ''}`} onClick={() => useStore.getState().setFiltersOpen(!filtersOpen)} aria-label={t.filters} title={t.filters} aria-pressed={filtersOpen}>
            <Icon.filter />
          </button>
          <button className="icon-btn hide-lg" onClick={() => setOpen(false)} aria-label={t.close}>
            <Icon.close />
          </button>
        </div>

        {filtersOpen && (
          <div className="filters">
            <div className="f-group">
              <h3>{t.metal}</h3>
              <div className="chips">
                {metals.map((m) => (
                  <button key={m} className={`chip ${filters.metals.includes(m) ? 'on' : ''}`} onClick={() => setFilters({ metals: toggle(filters.metals, m) })}>
                    <i className="swatch" style={{ background: METAL_COLOR[m] }} />
                    {METAL_NAMES[m][lang]}
                  </button>
                ))}
              </div>
            </div>
            <div className="f-group">
              <h3>{t.category}</h3>
              <div className="chips">
                {categories.map((c) => (
                  <button key={c} className={`chip ${filters.categories.includes(c) ? 'on' : ''}`} onClick={() => setFilters({ categories: toggle(filters.categories, c) })}>
                    {CATEGORY_NAMES[c][lang]}
                  </button>
                ))}
              </div>
            </div>
            <div className="f-row">
              <label className="select">
                <span>{t.county}</span>
                <select value={filters.county} onChange={(e) => setFilters({ county: e.target.value })}>
                  <option value="">{t.allCounties}</option>
                  {counties.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={filters.modelOnly} onChange={(e) => setFilters({ modelOnly: e.target.checked })} />
                <span>{t.withModel}</span>
              </label>
            </div>
            {active > 0 && (
              <button className="link" onClick={clear}>
                {t.clearFilters}
              </button>
            )}
          </div>
        )}

        <ul className="dir-list">
          {list.length === 0 && <li className="empty">{t.noResults}</li>}
          {list.map((p) => {
            const thumb = p.cover ? thumbUrl(p.id, p.cover) : null
            return (
              <li key={p.id}>
                <button
                  className={`dir-item ${p.id === selectedId ? 'sel' : ''} ${p.id === hoverId ? 'hov' : ''}`}
                  onClick={() => {
                    useStore.getState().select(p.id)
                    if (window.innerWidth < 900) setOpen(false)
                  }}
                  onPointerEnter={() => useStore.getState().setHover(p.id)}
                  onPointerLeave={() => useStore.getState().setHover(null)}
                >
                  <span className="thumb" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}>
                    {!thumb && <i style={{ background: METAL_COLOR[p.metals[0] ?? 'titanium-zinc'] }} />}
                  </span>
                  <span className="meta">
                    <strong>{displayName(p, lang)}</strong>
                    <small>
                      {displayCity(p, lang)}
                      {p.county && p.county !== p.city ? ` · ${p.county}` : ''}
                    </small>
                    <span className="tags">
                      {p.metals.map((m) => (
                        <em key={m} className="metal-tag">
                          <i className="swatch" style={{ background: METAL_COLOR[m] }} />
                          {METAL_NAMES[m][lang]}
                        </em>
                      ))}
                      {p.model.module && (
                        <em className="model-tag" title={t.modelLabel}>
                          <Icon.cube /> 3D
                        </em>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
    </>
  )
}
