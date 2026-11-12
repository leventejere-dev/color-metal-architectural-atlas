import { useState } from 'react'
import { ACCURACY_NAMES, CATEGORY_NAMES, CONFIDENCE_NAMES, METAL_NAMES, STATUS_NAMES, TIER_NAMES } from '../i18n/strings'
import { displayCity, displayName, pick, projectById, useStore, useT } from '../state/store'
import { projectUrl } from '../state/router'
import { METAL_COLOR } from '../scene/metalColors'
import { Icon } from './icons'

export function photoUrl(id: string, file: string) {
  return `photos/${id}/${file}.webp`
}

export async function shareProject(id: string, title: string, copiedText: string) {
  const url = projectUrl(id)
  try {
    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      await navigator.share({ title: `${title} — COLOR METAL`, url })
      return
    }
    await navigator.clipboard.writeText(url)
    useStore.getState().showToast(copiedText)
  } catch {
    window.prompt('URL', url)
  }
}

export function InfoPanel() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const selectedId = useStore((s) => s.selectedId)
  const mode = useStore((s) => s.mode)
  const modelState = useStore((s) => s.modelState)
  const tourActive = useStore((s) => s.tour.active)
  const [sheet, setSheet] = useState<'peek' | 'full'>('peek')
  const p = projectById(selectedId)
  if (!p) return null

  const name = displayName(p, lang)
  const desc = pick(p.description, lang)
  const contribution = pick(p.contribution, lang)
  const finish = pick(p.finish, lang)
  const application = pick(p.application, lang)
  const note = pick(p.model.note, lang)
  const altNames = [p.name, p.nameHu, p.nameEn].filter((n, i, a) => n && n !== name && a.indexOf(n) === i)
  const fallbackNote = (f: false | string) => (f === 'ro' ? t.fallbackLang : f === 'en' ? t.fallbackLangEn : f ? t.fallbackLang : null)
  const approx = p.geographicAccuracy === 'locality' || p.geographicAccuracy === 'street'

  return (
    <aside className={`info ${sheet}`} aria-label={name}>
      <button className="sheet-grip hide-lg" onClick={() => setSheet(sheet === 'peek' ? 'full' : 'peek')} aria-label="toggle" />
      <div className="info-scroll">
        <div className="info-head">
          <span className="kicker">{CATEGORY_NAMES[p.category][lang]}</span>
          <button
            className="icon-btn close"
            onClick={() => {
              const st = useStore.getState()
              if (st.tour.active) st.stopTour()
              st.select(null)
              st.command({ kind: 'overview' })
            }}
            aria-label={t.close}
          >
            <Icon.close />
          </button>
          <h1>{name}</h1>
          {altNames.length > 0 && <p className="alt">{altNames.join(' · ')}</p>}
          <p className="place">
            {displayCity(p, lang)}
            {p.county ? `, ${p.county}` : ''}
            {p.country !== 'Romania' ? ` · ${p.country}` : ''}
          </p>
        </div>

        {p.cover ? (
          <button className="hero" onClick={() => useStore.getState().openGallery(0)} aria-label={t.gallery}>
            <img src={photoUrl(p.id, p.cover)} alt={name} loading="lazy" />
            <span className="hero-count">
              {t.gallery} · {p.photos.length}
            </span>
          </button>
        ) : (
          <>
            {p.thumb && (
              <div className="hero model-hero">
                <img src={p.thumb} alt={name} loading="lazy" />
                <span className="hero-count">{t.modelRender}</span>
              </div>
            )}
            <p className="muted small">{p.photoStatus === 'reference' ? t.photosReference : p.photoStatus === 'none' ? t.noPhotosArchive : t.noPhotos}</p>
          </>
        )}

        <div className="actions">
          {p.model.module && mode !== 'inspect' && (
            <button className="btn primary" onClick={() => useStore.getState().enterInspect()} disabled={modelState === 'error'}>
              <Icon.cube /> {t.inspect}
            </button>
          )}
          {mode === 'inspect' && (
            <button
              className="btn primary"
              onClick={() => {
                const st = useStore.getState()
                st.exitInspect()
                st.select(null)
                st.command({ kind: 'overview' })
              }}
            >
              {t.returnToMap}
            </button>
          )}
          <button className="btn" onClick={() => shareProject(p.id, name, t.linkCopied)}>
            <Icon.share /> {t.share}
          </button>
          {p.photos.length > 0 && p.model.module && (
            <button className="btn" onClick={() => useStore.getState().openGallery(0, true)}>
              {t.compare}
            </button>
          )}
        </div>
        {modelState === 'loading' && p.model.module && <p className="loading-line">{t.loadingModel}</p>}
        {modelState === 'error' && p.model.module && <p className="loading-line err">{t.modelError}</p>}

        <section className="facts">
          <h2>{t.materialType}</h2>
          <div className="metals">
            {p.metals.length ? (
              p.metals.map((m) => (
                <span key={m} className="metal">
                  <i className="swatch lg" style={{ background: METAL_COLOR[m] }} />
                  {METAL_NAMES[m][lang]}
                </span>
              ))
            ) : (
              <span className="muted">{t.notSpecified}</span>
            )}
          </div>
          <dl>
            <dt>{t.finish}</dt>
            <dd>{[...p.products, finish.text].filter(Boolean).join(' · ') || <span className="muted">{t.notSpecified}</span>}</dd>
            <dt>{t.application}</dt>
            <dd>{application.text ?? <span className="muted">{t.notSpecified}</span>}</dd>
            <dt>{t.contribution}</dt>
            <dd>{contribution.text ?? <span className="muted">{t.notSpecified}</span>}</dd>
          </dl>
        </section>

        {desc.text && (
          <section>
            <h2>{t.description}</h2>
            <p className="desc">{desc.text}</p>
            {desc.fallback && <p className="muted small">{fallbackNote(desc.fallback)}</p>}
          </section>
        )}

        <section className="facts">
          <h2>{t.modelInfo}</h2>
          <dl>
            <dt>{t.modelAvailability}</dt>
            <dd>
              {TIER_NAMES[p.model.tier][lang]} — {STATUS_NAMES[p.model.status][lang]}
            </dd>
            {note.text && (
              <>
                <dt>{t.description}</dt>
                <dd className="small">{note.text}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="facts">
          <h2>{t.location}</h2>
          {approx && <p className="notice">{t.approxLocation}. {t.approxLocationNote}</p>}
          <dl>
            <dt>{t.coordinates}</dt>
            <dd className="mono">
              {p.lat.toFixed(5)}°N, {p.lon.toFixed(5)}°E
            </dd>
            <dt>{t.accuracy}</dt>
            <dd>{ACCURACY_NAMES[p.geographicAccuracy][lang]}</dd>
            <dt>{t.confidence}</dt>
            <dd>{CONFIDENCE_NAMES[p.identificationConfidence][lang]}</dd>
          </dl>
          {p.sourceUrls.length > 0 && (
            <details className="sources">
              <summary>
                {t.sources} ({p.sourceUrls.length})
              </summary>
              <ul>
                {p.sourceUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer">
                      {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 64)}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
        {tourActive && <div className="tour-spacer" />}
      </div>
    </aside>
  )
}
