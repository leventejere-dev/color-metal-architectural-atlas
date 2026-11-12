import { useStore, useT } from '../state/store'
import { Icon } from './icons'
import { EXHIBITION_URL } from './TopBar'
import { useStats } from './MapControls'

export const REPO_URL = 'https://github.com/leventejere-dev/color-metal-architectural-atlas'

export function About() {
  const t = useT()
  const open = useStore((s) => s.aboutOpen)
  const reduced = useStore((s) => s.reducedMotion)
  const stats = useStats()
  if (!open) return null
  return (
    <div className="modal-back" onClick={() => useStore.getState().setAboutOpen(false)}>
      <div className="modal" role="dialog" aria-label={t.about} onClick={(e) => e.stopPropagation()}>
        <div className="tp-head">
          <h2>{t.about}</h2>
          <button className="icon-btn" onClick={() => useStore.getState().setAboutOpen(false)} aria-label={t.close}>
            <Icon.close />
          </button>
        </div>
        <p>{t.aboutText}</p>
        <div className="stats inline">
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
        </div>
        <p className="small muted">{t.dataSources}</p>
        <label className="check">
          <input type="checkbox" checked={reduced} onChange={(e) => useStore.getState().setReducedMotion(e.target.checked)} />
          <span>{t.reducedMotion}</span>
        </label>
        <p className="links">
          <a href={EXHIBITION_URL} target="_blank" rel="noreferrer">
            {t.exhibition} <Icon.external />
          </a>
          <a href={`${REPO_URL}/blob/main/ASSET_LICENSES.md`} target="_blank" rel="noreferrer">
            Licenses <Icon.external />
          </a>
        </p>
        <p className="small muted">© COLOR METAL SRL · Partner in Engineering</p>
      </div>
    </div>
  )
}
