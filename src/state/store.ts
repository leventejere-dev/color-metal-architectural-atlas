import { create } from 'zustand'
import type { Category, Lang, Metal, Project } from '../data/types'
import { STRINGS } from '../i18n/strings'
import db from '../data/projects.json'

export const PROJECTS: Project[] = (db as unknown as { projects: Project[] }).projects
export const projectById = (id: string | null | undefined) => PROJECTS.find((p) => p.id === id) ?? null

export type ViewPreset = 'reset' | 'top' | 'roof' | 'facade' | 'material'
export type CameraCommand =
  | { kind: 'overview'; instant?: boolean }
  | { kind: 'project'; id: string; instant?: boolean }
  | { kind: 'fit'; ids: string[] }
  | { kind: 'preset'; preset: ViewPreset }
  | { kind: 'zoom'; factor: number }
  | { kind: 'north' }

export interface Filters {
  q: string
  metals: Metal[]
  categories: Category[]
  county: string
  modelOnly: boolean
}

const emptyFilters: Filters = { q: '', metals: [], categories: [], county: '', modelOnly: false }

function initialLang(): Lang {
  try {
    const url = new URLSearchParams(location.search).get('lang')
    if (url === 'ro' || url === 'hu' || url === 'en') return url
    const s = localStorage.getItem('cm-atlas-lang')
    if (s === 'ro' || s === 'hu' || s === 'en') return s
  } catch {
    /* storage unavailable */
  }
  return 'ro'
}

const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface State {
  lang: Lang
  setLang: (l: Lang) => void
  selectedId: string | null
  hoverId: string | null
  setHover: (id: string | null) => void
  filters: Filters
  setFilters: (f: Partial<Filters>) => void
  clearFilters: () => void
  /** 'map' = geographic exploration; 'inspect' = architectural inspection of the selected model */
  mode: 'map' | 'inspect'
  context: 'geo' | 'studio'
  setContext: (c: 'geo' | 'studio') => void
  gallery: { open: boolean; index: number; compare: boolean }
  openGallery: (index?: number, compare?: boolean) => void
  closeGallery: () => void
  setGalleryIndex: (i: number) => void
  listOpen: boolean
  setListOpen: (v: boolean) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  aboutOpen: boolean
  setAboutOpen: (v: boolean) => void
  introDone: boolean
  finishIntro: () => void
  reducedMotion: boolean
  setReducedMotion: (v: boolean) => void
  cameraCommand: (CameraCommand & { n: number }) | null
  command: (c: CameraCommand) => void
  /** live camera distance to its target (km), for LOD-dependent UI */
  camDistance: number
  setCamDistance: (d: number) => void
  presentationScale: number
  setPresentationScale: (s: number) => void
  modelState: 'idle' | 'loading' | 'ready' | 'error'
  setModelState: (s: State['modelState']) => void
  flying: boolean
  setFlying: (v: boolean) => void
  autoOrbit: boolean
  setAutoOrbit: (v: boolean) => void
  /** walk-around mode: a true-scale figure explores the selected building from outside */
  walk: { active: boolean; eye: boolean }
  setWalk: (w: Partial<{ active: boolean; eye: boolean }>) => void
  tour: { active: boolean; playing: boolean; ids: string[]; index: number; route: string }
  startTour: (ids: string[], route: string) => void
  stopTour: () => void
  setTour: (t: Partial<State['tour']>) => void
  toast: string | null
  showToast: (t: string) => void
  select: (id: string | null, opts?: { fly?: boolean; inspect?: boolean; instant?: boolean }) => void
  enterInspect: () => void
  enterInspectQuiet: () => void
  exitInspect: () => void
}

let cmdN = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useStore = create<State>((set, get) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem('cm-atlas-lang', lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang
    set({ lang })
  },
  selectedId: null,
  hoverId: null,
  setHover: (hoverId) => set({ hoverId }),
  filters: emptyFilters,
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  clearFilters: () => set({ filters: emptyFilters }),
  mode: 'map',
  context: 'geo',
  setContext: (context) => set({ context }),
  gallery: { open: false, index: 0, compare: false },
  openGallery: (index = 0, compare = false) => set({ gallery: { open: true, index, compare } }),
  closeGallery: () => set({ gallery: { ...get().gallery, open: false } }),
  setGalleryIndex: (index) => set({ gallery: { ...get().gallery, index } }),
  listOpen: typeof window !== 'undefined' ? window.innerWidth > 900 : true,
  setListOpen: (listOpen) => set({ listOpen }),
  filtersOpen: false,
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  aboutOpen: false,
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  introDone: false,
  finishIntro: () => set({ introDone: true }),
  reducedMotion: !!prefersReduced,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  cameraCommand: null,
  command: (c) => set({ cameraCommand: { ...c, n: ++cmdN } }),
  camDistance: 1000,
  setCamDistance: (camDistance) => set({ camDistance }),
  presentationScale: 1,
  setPresentationScale: (presentationScale) => set({ presentationScale }),
  modelState: 'idle',
  setModelState: (modelState) => set({ modelState }),
  flying: false,
  setFlying: (flying) => set({ flying }),
  autoOrbit: false,
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  walk: { active: false, eye: false },
  setWalk: (w) => set({ walk: { ...get().walk, ...w }, autoOrbit: false }),
  tour: { active: false, playing: false, ids: [], index: 0, route: 'all' },
  startTour: (ids, route) => set({ tour: { active: true, playing: true, ids, index: 0, route } }),
  stopTour: () => set({ tour: { ...get().tour, active: false, playing: false } }),
  setTour: (t) => set({ tour: { ...get().tour, ...t } }),
  toast: null,
  showToast: (toast) => {
    clearTimeout(toastTimer)
    set({ toast })
    toastTimer = setTimeout(() => set({ toast: null }), 2200)
  },
  select: (id, opts = {}) => {
    const { fly = true, inspect = false, instant = false } = opts
    if (id === null) {
      set({ selectedId: null, mode: 'map', context: 'geo', autoOrbit: false, walk: { active: false, eye: false }, gallery: { open: false, index: 0, compare: false } })
      return
    }
    set({ selectedId: id, mode: inspect ? 'inspect' : get().mode === 'inspect' ? 'inspect' : 'map', walk: { active: false, eye: false }, gallery: { open: false, index: 0, compare: false } })
    if (fly) get().command({ kind: 'project', id, instant })
  },
  enterInspect: () => {
    const id = get().selectedId
    if (!id) return
    set({ mode: 'inspect' })
    get().command({ kind: 'project', id })
  },
  enterInspectQuiet: () => set({ mode: 'inspect' }),
  exitInspect: () => set({ mode: 'map', context: 'geo', walk: { active: false, eye: false } }),
}))

export function useT() {
  const lang = useStore((s) => s.lang)
  return STRINGS[lang]
}

/** Localised field with transparent fallback (RO → EN → HU). */
export function pick(text: Partial<Record<'ro' | 'hu' | 'en', string>> | undefined, lang: 'ro' | 'hu' | 'en') {
  if (!text) return { text: undefined as string | undefined, fallback: false as false | 'ro' | 'en' | 'hu' }
  if (text[lang]) return { text: text[lang], fallback: false as const }
  for (const l of ['ro', 'en', 'hu'] as const) if (text[l]) return { text: text[l], fallback: l }
  return { text: undefined, fallback: false as const }
}

export function displayName(p: Project, lang: Lang) {
  if (lang === 'hu' && p.nameHu) return p.nameHu
  if (lang === 'en' && p.nameEn) return p.nameEn
  return p.name
}

export function displayCity(p: Project, lang: Lang) {
  if (lang === 'hu' && p.cityHu) return p.cityHu
  return p.city
}

export function matchesFilters(p: Project, f: Filters) {
  if (f.metals.length && !p.metals.some((m) => f.metals.includes(m))) return false
  if (f.categories.length && !f.categories.includes(p.category)) return false
  if (f.county && p.county !== f.county) return false
  if (f.modelOnly && !p.model.module) return false
  if (f.q.trim()) {
    const n = (s?: string) =>
      (s ?? '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
    const hay = n([p.name, p.nameHu, p.nameEn, p.city, p.cityHu, p.county, ...p.products].join(' '))
    if (!n(f.q)
      .split(/\s+/)
      .filter(Boolean)
      .every((w) => hay.includes(w)))
      return false
  }
  return true
}
