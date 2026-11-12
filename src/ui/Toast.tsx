import { useStore } from '../state/store'

export function Toast() {
  const toast = useStore((s) => s.toast)
  return (
    <div className={`toast ${toast ? 'on' : ''}`} role="status" aria-live="polite">
      {toast}
    </div>
  )
}
