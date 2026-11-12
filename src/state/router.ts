/**
 * Hash routing (GitHub Pages compatible):
 *   #/                     national overview
 *   #/project/<id>         project selected, camera flies to it
 *   #/tour                 opens the guided tour
 * Language can be forced with ?lang=ro|hu|en.
 */
import { useEffect, useRef } from 'react'
import { projectById, useStore } from './store'

export function parseHash(h = location.hash): { project?: string; tour?: boolean } {
  const m = h.match(/^#\/project\/([a-z0-9-]+)/)
  if (m) return { project: m[1] }
  if (h.startsWith('#/tour')) return { tour: true }
  return {}
}

export function projectUrl(id: string) {
  const u = new URL(location.href)
  u.hash = `/project/${id}`
  return u.toString()
}

export function useHashRouting(ready: boolean) {
  const selectedId = useStore((s) => s.selectedId)
  const introDone = useStore((s) => s.introDone)
  const applying = useRef(false)
  const started = useRef(false)

  // initial deep link (after the map is ready)
  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    const r = parseHash()
    if (r.tour) {
      setTimeout(() => {
        useStore.getState().finishIntro()
        useStore.getState().setTour({ active: true, playing: false, ids: [], index: -1 })
      }, 900)
    }
    if (r.project && projectById(r.project)) {
      applying.current = true
      // short establishing pause so the visitor sees where the project is
      setTimeout(() => {
        useStore.getState().finishIntro()
        useStore.getState().select(r.project!)
        applying.current = false
      }, 900)
    }
  }, [ready])

  // selection → hash
  useEffect(() => {
    if (!started.current || applying.current) return
    const want = selectedId ? `#/project/${selectedId}` : '#/'
    if (location.hash !== want && !(want === '#/' && (location.hash === '' || location.hash === '#/tour'))) {
      history.pushState(null, '', want)
    }
  }, [selectedId])

  // back / forward
  useEffect(() => {
    const onHash = () => {
      const r = parseHash()
      const st = useStore.getState()
      applying.current = true
      if (r.project && projectById(r.project)) {
        if (st.selectedId !== r.project) st.select(r.project)
      } else if (st.selectedId) {
        st.select(null)
        st.command({ kind: 'overview' })
      }
      applying.current = false
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])

  // Escape: close the project and return to the national overview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const st = useStore.getState()
      if (st.gallery.open || st.aboutOpen) return
      if (st.walk.active) {
        st.setWalk({ active: false, eye: false })
        return
      }
      if (st.tour.active) st.stopTour()
      if (st.selectedId) {
        st.select(null)
        st.command({ kind: 'overview' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [introDone])
}
