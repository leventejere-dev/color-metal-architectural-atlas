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
  panel: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <rect x="2.8" y="3.8" width="14.4" height="12.4" rx="1.6" />
      <path d="M7.6 3.8v12.4M4.6 7h1.2M4.6 9.4h1.2M4.6 11.8h1.2" />
    </svg>
  ),
  sun: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.4v1.8M10 15.8v1.8M2.4 10h1.8M15.8 10h1.8M4.6 4.6l1.3 1.3M14.1 14.1l1.3 1.3M4.6 15.4l1.3-1.3M14.1 5.9l1.3-1.3" />
    </svg>
  ),
  moon: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M15.8 12.6A6.6 6.6 0 0 1 7.4 4.2a6.6 6.6 0 1 0 8.4 8.4z" />
    </svg>
  ),
  car: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M3 12.6v-2.2l1.8-3.6c.3-.6.9-1 1.6-1h7.2c.7 0 1.3.4 1.6 1l1.8 3.6v2.2c0 .5-.4.9-.9.9H3.9c-.5 0-.9-.4-.9-.9z" />
      <path d="M4.6 10.2h10.8" />
      <circle cx="6.4" cy="13.6" r="1.5" />
      <circle cx="13.6" cy="13.6" r="1.5" />
    </svg>
  ),
  bolt: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <path d="M11.2 2.6L5 11h4.4l-1 6.4L15 9h-4.4z" />
    </svg>
  ),
  run: () => (
    <svg viewBox="0 0 20 20" width="18" height="18" {...P}>
      <circle cx="12.4" cy="3.4" r="1.5" />
      <path d="M11.6 6.2L8.4 9.8l3 2.4-1.6 4.8M8.4 9.8L5 9M11.6 6.2l2.6 3.2 2.6-.6M11.4 12.2l3.4.8" />
    </svg>
  ),
}
