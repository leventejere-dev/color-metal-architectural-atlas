/**
 * Reference photograph gallery: full-screen viewer with zoom, keyboard/touch
 * navigation and thumbnails; "compare" docks the photograph beside the live
 * 3D model so both can be read together (original photography is never
 * replaced by generated imagery).
 */
import { useEffect, useRef, useState } from 'react'
import { displayName, projectById, useStore, useT } from '../state/store'
import { Icon } from './icons'
import { photoUrl } from './InfoPanel'
import { thumbUrl } from './Directory'

export function Gallery() {
  const t = useT()
  const lang = useStore((s) => s.lang)
  const g = useStore((s) => s.gallery)
  const selectedId = useStore((s) => s.selectedId)
  const p = projectById(selectedId)
  const [zoom, setZoom] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const touch = useRef<number | null>(null)
  const n = p?.photos.length ?? 0

  const go = (k: number) => {
    if (!n) return
    setZoom(false)
    useStore.getState().setGalleryIndex((g.index + k + n) % n)
  }

  useEffect(() => {
    if (!g.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().closeGallery()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // preload neighbours
  useEffect(() => {
    if (!g.open || !p || !n) return
    for (const k of [1, -1]) {
      const ph = p.photos[(g.index + k + n) % n]
      const im = new Image()
      im.src = photoUrl(p.id, ph.file)
    }
  }, [g.open, g.index, p, n])

  if (!g.open || !p || !n) return null
  const ph = p.photos[Math.min(g.index, n - 1)]

  return (
    <div className={`gallery ${g.compare ? 'compare' : ''}`} role="dialog" aria-label={t.gallery}>
      <div className="g-top">
        <div className="g-title">
          <strong>{displayName(p, lang)}</strong>
          <span>
            {t.originalPhoto} · {t.photoOf(g.index + 1, n)}
            {ph.kind === 'drone' ? ` · ${t.drone}` : ''}
          </span>
        </div>
        {g.compare ? (
          <button className="btn" onClick={() => useStore.setState({ gallery: { ...g, compare: false } })}>
            {t.gallery}
          </button>
        ) : (
          p.model.module && (
            <button className="btn" onClick={() => useStore.setState({ gallery: { ...g, compare: true } })}>
              {t.compare}
            </button>
          )
        )}
        <button className="icon-btn" onClick={() => useStore.getState().closeGallery()} aria-label={t.close}>
          <Icon.close />
        </button>
      </div>
      <div
        className={`g-stage ${zoom ? 'zoomed' : ''}`}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
          setZoom(!zoom)
        }}
        onPointerMove={(e) => {
          if (!zoom) return
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
        }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return
          const dx = e.changedTouches[0].clientX - touch.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touch.current = null
        }}
      >
        <img key={ph.file} src={photoUrl(p.id, ph.file)} alt={`${displayName(p, lang)} — ${g.index + 1}`} style={{ transformOrigin: origin }} />
        <button className="g-nav prev" onClick={(e) => (e.stopPropagation(), go(-1))} aria-label={t.prevPhoto}>
          <Icon.chevL />
        </button>
        <button className="g-nav next" onClick={(e) => (e.stopPropagation(), go(1))} aria-label={t.nextPhoto}>
          <Icon.chevR />
        </button>
      </div>
      <div className="g-thumbs">
        {p.photos.map((x, i) => (
          <button key={x.file} className={i === g.index ? 'on' : ''} onClick={() => (setZoom(false), useStore.getState().setGalleryIndex(i))} aria-label={t.photoOf(i + 1, n)}>
            <img src={thumbUrl(p.id, x.file)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
