/**
 * Model registry. Every architectural model is a lazily imported module, so no
 * model geometry is downloaded or built until its project is selected.
 *
 *  - exhibition:<name>   the four models reused unchanged from the COLOR METAL
 *                        exhibition table (src/models/exhibition)
 *  - <project id>        src/models/buildings/<project id>.ts (auto-registered)
 */
import type * as THREE from 'three'
import type { Builder } from '../lib/geo'
import type { Mats } from '../lib/materials'

export interface ModelModule {
  /** Geometry in real metres: origin = footprint centre at ground, +X = main axis. */
  build: () => Builder
  /** Local direction (x, z) of the main façade, used by FACADE view and the default 3/4 view. Default [0, 1] (+Z). */
  front?: [number, number]
  /** Local point (m) the MATERIAL view zooms to — typically on the main metal roof/cladding. */
  materialFocus?: [number, number, number]
  /** Building-specific materials added to the shared palette. */
  materials?: (base: Mats) => Record<string, THREE.Material>
  /** Re-centre the geometry on its bounding box (used for the exhibition models). */
  recentre?: boolean
  /** Short modelling note shown in the UI (what is approximated). */
  notes?: string
}

const buildings = import.meta.glob<{ default: ModelModule }>('./buildings/*.ts')

const exhibition: Record<string, () => Promise<ModelModule>> = {
  stadium: () => import('./exhibition/adapters').then((m) => m.stadium),
  church: () => import('./exhibition/adapters').then((m) => m.church),
  manor: () => import('./exhibition/adapters').then((m) => m.manor),
  garage: () => import('./exhibition/adapters').then((m) => m.garage),
}

export function hasBuildingModule(id: string) {
  return `./buildings/${id}.ts` in buildings
}

export function loadModel(module: string): Promise<ModelModule> {
  if (module.startsWith('exhibition:')) {
    const f = exhibition[module.slice('exhibition:'.length)]
    if (!f) return Promise.reject(new Error('unknown exhibition model ' + module))
    return f()
  }
  const f = buildings[`./buildings/${module}.ts`]
  if (!f) return Promise.reject(new Error('unknown model ' + module))
  return f().then((m) => m.default)
}
