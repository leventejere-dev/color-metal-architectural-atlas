import { useEffect, useState } from 'react'
import { displayName, projectById, useStore, useT, type ViewPreset } from '../state/store'
import { runtime } from '../scene/runtime'
import { Icon } from './icons'

const fmtDist = (m: number) => (m < 950 ? `${Math.max(0, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString('ro-RO', { maximumFractionDigits: m < 9500 ? 1 : 0 })} km`)

/** While driving: the reference building nearest the truck — direction, distance, open it or drive there. */
function DriveHud() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const [near, setNear] = useState<{ id: string; distM: number; bearing: number } | null>(null)
  const [auto, setAuto] = useState<string | null>(null)
  useEffect(() => {
    const iv = setInterval(() => {
      const n = runtime.driveNear
      setNear((o) => (!n ? null : o && o.id === n.id && Math.abs(o.distM - n.distM) < 5 && Math.abs(o.bearing - n.bearing) < 0.05 ? o : { ...n }))
      setAuto(runtime.driveAuto)
    }, 150)
    return () => clearInterval(iv)
  }, [])
  const target = projectById(auto)
  if (target)
    return (
      <span className="drive-hud">
        <span className="drive-near">
          {t.drivingTo}: <b>{displayName(target, lang)}</b>
        </span>
      </span>
    )
  const p = projectById(near?.id ?? null)
  if (!p || !near) return <span className="drive-hud muted">{t.drivePick}</span>
  const close = near.distM < 400
  return (
    <span className="drive-hud">
      <span className="drive-near">
        <span className="drive-arrow" style={{ transform: `rotate(${near.bearing}rad)` }} aria-hidden="true">
          ↑
        </span>
        <b>{displayName(p, lang)}</b>
        <span className="drive-dist">{fmtDist(near.distM)}</span>
        <button
          onClick={() => {
            const st = useStore.getState()
            if (close) {
              st.setWalk({ active: false, eye: false, run: false, car: false })
              st.select(p.id, { inspect: true })
            } else st.setDriveTo(p.id)
          }}
        >
          {close ? t.openModel : t.goThere}
        </button>
      </span>
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
