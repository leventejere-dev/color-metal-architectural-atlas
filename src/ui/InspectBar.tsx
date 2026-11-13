import { useEffect, useState } from 'react'
import { displayName, projectById, useStore, useT, type ViewPreset } from '../state/store'
import { runtime } from '../scene/runtime'
import { Icon } from './icons'

/** While driving: the reference building nearest the truck (open its model view) and the travel scale. */
function DriveHud() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const [near, setNear] = useState<{ id: string; distM: number } | null>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const iv = setInterval(() => {
      const n = runtime.driveNear
      setNear((o) => (o?.id === n?.id ? o : n ? { ...n } : null))
      const s = Math.round(runtime.driveScale)
      setScale((o) => (Math.abs(o - s) / Math.max(1, s) > 0.08 || (s === 1) !== (o === 1) ? s : o))
    }, 250)
    return () => clearInterval(iv)
  }, [])
  const p = projectById(near?.id ?? null)
  return (
    <span className="drive-hud">
      <span className="drive-scale">{t.travelScale(scale)}</span>
      {p && (
        <span className="drive-near">
          {t.driveNear}: <b>{displayName(p, lang)}</b>
          <button
            onClick={() => {
              const st = useStore.getState()
              st.setWalk({ active: false, eye: false, run: false, car: false })
              st.select(p.id, { inspect: true })
            }}
          >
            {t.openModel}
          </button>
        </span>
      )}
    </span>
  )
}

export function InspectBar() {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const selectedId = useStore((s) => s.selectedId)
  const context = useStore((s) => s.context)
  const autoOrbit = useStore((s) => s.autoOrbit)
  const tourActive = useStore((s) => s.tour.active)
  const walk = useStore((s) => s.walk)
  const p = projectById(selectedId)
  const setWalk = useStore.getState().setWalk
  if (walk.active && !tourActive) {
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    const car = !!walk.car
    return (
      <div className="inspect-bar walking" role="toolbar" aria-label={car ? t.driveTitle : t.walkTitle}>
        <div className="walk-hint">
          <strong>
            {car ? <Icon.car /> : <Icon.walker />} {car ? t.driveTitle : t.walkTitle}
          </strong>
          <span>{car ? (touch ? t.driveHintTouch : t.driveHint) : touch ? t.walkHintTouch : t.walkHint}</span>
          <em>{car ? t.carNote : t.figureNote}</em>
          {car && <DriveHud />}
        </div>
        <div className="seg">
          <button className={walk.eye ? '' : 'on'} onClick={() => setWalk({ eye: false })}>
            {car ? t.chaseView : t.thirdPerson}
          </button>
          <button className={walk.eye ? 'on' : ''} onClick={() => setWalk({ eye: true })}>
            {car ? t.cockpit : t.eyeLevel}
          </button>
          <button className={walk.run ? 'on' : ''} aria-pressed={!!walk.run} onClick={() => setWalk({ run: !walk.run })} title="Shift">
            {car ? <Icon.bolt /> : <Icon.run />} {car ? t.turbo : t.run}
          </button>
          {(car ? mode === 'inspect' && !!p?.model.module : true) && (
            <button onClick={() => setWalk({ car: !car, eye: false })}>
              {car ? <Icon.walker /> : <Icon.car />} {car ? t.onFoot : t.drive}
            </button>
          )}
          <button className="strong" onClick={() => setWalk({ active: false, eye: false, run: false, car: false })}>
            {t.exitWalk}
          </button>
        </div>
      </div>
    )
  }
  if (mode !== 'inspect' || !p?.model.module || tourActive) return null
  const preset = (preset: ViewPreset) => useStore.getState().command({ kind: 'preset', preset })

  return (
    <div className="inspect-bar" role="toolbar" aria-label={t.views}>
      <div className="seg">
        <button className={autoOrbit ? 'on' : ''} onClick={() => useStore.getState().setAutoOrbit(!autoOrbit)} aria-pressed={autoOrbit}>
          <Icon.orbit /> <span>{t.orbit}</span>
        </button>
        <button onClick={() => preset('reset')}>{t.reset}</button>
        <button onClick={() => preset('top')}>{t.top}</button>
        <button onClick={() => preset('roof')}>{t.roof}</button>
        <button onClick={() => preset('facade')}>{t.facade}</button>
        <button onClick={() => preset('material')}>{t.materialView}</button>
      </div>
      <div className="seg">
        <button className="walk-btn" onClick={() => setWalk({ active: true, eye: false, car: false })} title={t.walkTitle}>
          <Icon.walker /> <span>{t.walk}</span>
        </button>
        <button className="walk-btn" onClick={() => setWalk({ active: true, eye: false, car: true })} title={t.driveTitle}>
          <Icon.car /> <span>{t.drive}</span>
        </button>
      </div>
      <div className="seg">
        <span className="seg-label">{t.context}</span>
        <button className={context === 'geo' ? 'on' : ''} onClick={() => useStore.getState().setContext('geo')}>
          {t.contextGeo}
        </button>
        <button className={context === 'studio' ? 'on' : ''} onClick={() => useStore.getState().setContext('studio')}>
          {t.contextStudio}
        </button>
      </div>
      <div className="seg">
        {p.photos.length > 0 && <button onClick={() => useStore.getState().openGallery(0)}>{t.gallery}</button>}
        {p.photos.length > 0 && <button onClick={() => useStore.getState().openGallery(0, true)}>{t.compare}</button>}
        <button
          className="strong"
          onClick={() => {
            const st = useStore.getState()
            st.setAutoOrbit(false)
            st.exitInspect()
            st.select(null)
            st.command({ kind: 'overview' })
          }}
        >
          {t.returnToMap}
        </button>
      </div>
    </div>
  )
}
