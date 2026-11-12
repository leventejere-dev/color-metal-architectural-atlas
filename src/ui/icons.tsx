/** Minimal line icons (1.4 px stroke) used only on functional controls. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  search: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M13 13l4.5 4.5" />
    </svg>
  ),
  filter: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M3 5h14M6 10h8M8.5 15h3" />
    </svg>
  ),
  close: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  ),
  minus: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M4 10h12" />
    </svg>
  ),
  north: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M10 3l4 13-4-3-4 3z" />
    </svg>
  ),
  home: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M3.5 9.5L10 4l6.5 5.5M5.5 8v8h9V8" />
    </svg>
  ),
  share: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="5" cy="10" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M6.8 9l6.4-3M6.8 11l6.4 3" />
    </svg>
  ),
  chevL: () => (
    <svg viewBox="0 0 20 20" width="20" height="20" {...P}>
      <path d="M12.5 4L6.5 10l6 6" />
    </svg>
  ),
  chevR: () => (
    <svg viewBox="0 0 20 20" width="20" height="20" {...P}>
      <path d="M7.5 4l6 6-6 6" />
    </svg>
  ),
  list: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01" />
    </svg>
  ),
  play: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M6 4l10 6-10 6z" />
    </svg>
  ),
  pause: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M7 4v12M13 4v12" />
    </svg>
  ),
  info: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6.2v.1" />
    </svg>
  ),
  external: () => (
    <svg viewBox="0 0 20 20" width="14" height="14" {...P}>
      <path d="M11 4h5v5M16 4l-7 7M14 12v4H4V6h4" />
    </svg>
  ),
  cube: () => (
    <svg viewBox="0 0 20 20" width="14" height="14" {...P}>
      <path d="M10 2.5l6.5 3.7v7.6L10 17.5l-6.5-3.7V6.2zM3.5 6.2L10 10l6.5-3.8M10 10v7.5" />
    </svg>
  ),
  walker: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="10" cy="3.6" r="1.6" />
      <path d="M10 6.2v5.3M10 11.5l-2.6 5.6M10 11.5l2.6 5.6M6.4 9.2L10 7.4l3.6 1.8" />
    </svg>
  ),
  orbit: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <ellipse cx="10" cy="10" rx="7.5" ry="3.2" />
      <path d="M15.5 7.4l1.9-.4-.4 1.9" />
      <circle cx="10" cy="10" r="1.2" />
    </svg>
  ),
}
