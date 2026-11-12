/**
 * Guided architectural tour (presentation mode). Never starts by itself.
 * Each stop: fly to the location → model appears → restrained orbit with the
 * project card and photographs → next stop. Pause / resume / previous / next / exit.
 */
import { useEffect, useMemo, useRef } from 'react'
import type { Metal, Project } from '../data/types'
import { METAL_NAMES } from '../i18n/strings'
import { PROJECTS, displayName, projectById, useStore, useT } from '../state/store'
import { Icon } from './icons'

const REGIONS: Record<string, { ro: string; hu: string; en: string; counties: string[] }> = {
  moldova: { ro: 'Moldova', hu: 'Moldva', en: 'Moldavia', counties: ['Iași', 'Neamț', 'Suceava', 'Bacău', 'Vaslui', 'Botoșani', 'Galați'] },
  transilvania: { ro: 'Transilvania', hu: 'Erdély', en: 'Transylvania', counties: ['Cluj', 'Covasna', 'Harghita', 'Alba', 'Mureș', 'Bistrița-Năsăud', 'Brașov', 'Sibiu'] },
  vest: { ro: 'Banat, Crișana și Maramureș', hu: 'Bánság, Partium és Máramaros', en: 'Banat, Crișana & Maramureș', counties: ['Timiș', 'Bihor', 'Satu Mare', 'Arad', 'Maramureș', 'Békés (HU)'] },
  sud: { ro: 'București și sudul țării', hu: 'Bukarest és Dél-Románia', en: 'Bucharest & the south', counties: ['București', 'Ilfov', 'Gorj', 'Dolj', 'Argeș', 'Constanța'] },
}

const STOP_SECONDS = 11

/** Order a set of projects along a short geographic path (nearest neighbour from the north-west). */
function route(list: Project[]) {
  const left = [...list]
  const out: Project[] = []
  let cur = left.reduce((a, b) => (b.lon - b.lat < a.lon - a.lat ? b : a), left[0])
  while (left.length) {
    out.push(cur)
    left.splice(left.indexOf(cur), 1)
    if (!left.length) break
    cur = left.reduce((a, b) => (Math.hypot(b.lat - cur.lat, (b.lon - cur.lon) * 0.7) < Math.hypot(a.lat - cur.lat, (a.lon - cur.lon) * 0.7) ? b : a))
  }
  return out.map((p) => p.id)
}

export function useTourRoutes() {
  const lang = useStore((s) => s.lang)
  const t = useT()
  return useMemo(() => {
    const withModel = PROJECTS.filter((p) => p.model.module)
    const routes: { key: string; label: string; ids: string[] }[] = [{ key: 'all', label: t.tourAll, ids: route(withModel) }]
    for (const m of ['copper', 'titanium-zinc', 'aluminium'] as Metal[]) {
      const l = withModel.filter((p) => p.metals.includes(m))
      if (l.length >= 2) routes.push({ key: m, label: t.tourByMetal(METAL_NAMES[m][lang]), ids: route(l) })
    }
    for (const [k, r] of Object.entries(REGIONS)) {
      const l = withModel.filter((p) => r.counties.includes(p.county))
      if (l.length >= 2) routes.push({ key: k, label: r[lang], ids: route(l) })
    }
    return routes
  }, [lang, t])
}

export function TourController() {
  const tour = useStore((s) => s.tour)
  const flying = useStore((s) => s.flying)
  const modelState = useStore((s) => s.modelState)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const arrived = useRef<string | null>(null)

  // go to the current stop
  useEffect(() => {
    if (!tour.active || tour.index < 0 || !tour.ids.length) return
    const id = tour.ids[tour.index]
    arrived.current = null
    const st = useStore.getState()
    st.setAutoOrbit(false)
    st.select(id)
  }, [tour.active, tour.index, tour.ids])

  // dwell, orbit, advance
  useEffect(() => {
    clearTimeout(timer.current)
    if (!tour.active || !tour.playing || tour.index < 0) {
      useStore.getState().setAutoOrbit(false)
      return
    }
    const id = tour.ids[tour.index]
    if (flying || (projectById(id)?.model.module && modelState === 'loading')) return
    arrived.current = id
    useStore.getState().setAutoOrbit(true)
    timer.current = setTimeout(() => {
      const st = useStore.getState()
      st.setAutoOrbit(false)
      st.setTour({ index: (st.tour.index + 1) % st.tour.ids.length })
    }, STOP_SECONDS * 1000)
    return () => clearTimeout(timer.current)
  }, [tour.active, tour.playing, tour.index, tour.ids, flying, modelState])

  return null
}

export function TourBar() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const tour = useStore((s) => s.tour)
  const routes = useTourRoutes()
  if (!tour.active) return null

  const exit = () => {
    const st = useStore.getState()
    st.stopTour()
    st.setAutoOrbit(false)
    st.select(null)
    st.command({ kind: 'overview' })
  }

  if (tour.index < 0) {
    return (
      <div className="tour-pick" role="dialog" aria-label={t.tourChoose}>
        <div className="tp-head">
          <h2>{t.tour}</h2>
          <button className="icon-btn" onClick={() => useStore.getState().stopTour()} aria-label={t.close}>
            <Icon.close />
          </button>
        </div>
        <p className="muted">{t.tourChoose}</p>
        <div className="tp-list">
          {routes.map((r) => (
            <button key={r.key} className="tp-item" onClick={() => useStore.getState().startTour(r.ids, r.key)}>
              <strong>{r.label}</strong>
              <span>{t.results(r.ids.length)}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const p = projectById(tour.ids[tour.index])
  return (
    <div className="tour-bar" role="toolbar" aria-label={t.tour}>
      <span className="tb-step">
        {tour.index + 1} / {tour.ids.length}
      </span>
      <span className="tb-name">{p ? displayName(p, lang) : ''}</span>
      <button onClick={() => useStore.getState().setTour({ index: (tour.index - 1 + tour.ids.length) % tour.ids.length })} aria-label={t.tourPrev}>
        <Icon.chevL />
      </button>
      <button className="primary" onClick={() => useStore.getState().setTour({ playing: !tour.playing })} aria-label={tour.playing ? t.tourPause : t.tourResume}>
        {tour.playing ? <Icon.pause /> : <Icon.play />}
        <span>{tour.playing ? t.tourPause : t.tourResume}</span>
      </button>
      <button onClick={() => useStore.getState().setTour({ index: (tour.index + 1) % tour.ids.length })} aria-label={t.tourNext}>
        <Icon.chevR />
      </button>
      <button onClick={exit}>{t.tourExit}</button>
    </div>
  )
}
