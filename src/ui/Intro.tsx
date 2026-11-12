import { useEffect, useState } from 'react'
import { useStore, useT } from '../state/store'

/** Short opening: logo, title, one line — the map takes over as soon as it is ready. */
export function Intro({ ready }: { ready: boolean }) {
  const t = useT()
  const done = useStore((s) => s.introDone)
  const finish = useStore((s) => s.finishIntro)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!ready || done) return
    const id = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => {
        finish()
        useStore.getState().command({ kind: 'overview' })
      }, 650)
    }, 1500)
    return () => clearTimeout(id)
  }, [ready, done, finish])

  if (done) return null
  const skip = () => {
    if (!ready) return
    setLeaving(true)
    setTimeout(() => {
      finish()
      useStore.getState().command({ kind: 'overview' })
    }, 400)
  }
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} onClick={skip}>
      <div className="intro-inner">
        <img src="color-metal-logo.svg" alt="COLOR METAL" />
        <h1>{t.atlas}</h1>
        <p>{t.introLine}</p>
        <span className={`intro-status ${ready ? 'ready' : ''}`}>{ready ? t.introEnter : t.loadingMap}</span>
      </div>
    </div>
  )
}
