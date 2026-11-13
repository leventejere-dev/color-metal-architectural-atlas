/**
 * Mutable per-frame runtime shared by scene components (kept out of React state
 * to avoid re-rendering on every frame).
 */
import * as THREE from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import type { Terrain, Vectors } from '../geo/terrain'
import { project, convergence } from '../geo/projection'
import type { Project } from '../data/types'

export const runtime = {
  terrain: null as Terrain | null,
  vectors: null as Vectors | null,
  controls: null as CameraControlsImpl | null,
  /** current vertical scale of the terrain group relative to the baked exaggeration */
  yScale: 1,
  /** current effective exaggeration (baked × yScale) */
  exaggeration: 5,
  distance: 1000,
  /** label anchors above each miniature (scene km) and visibility, written by Miniatures */
  miniLabels: new Map<string, THREE.Vector3>(),
  miniVisible: new Map<string, boolean>(),
  /** selected model placement, for camera framing (center = true-scale centre of the composition on its site) */
  model: null as null | { id: string; sizeM: THREE.Vector3; center: THREE.Vector3; rotY: number; front: [number, number]; materialFocus?: [number, number, number]; scale: number },
  /** the levelled plateau as currently rendered (written by TerrainModel; y in baked-exaggeration km) */
  flat: { x: 0, y: 0, z: 0, k: 0, r0: 0.25, r1: 0.9 },
  /** terrain mesh stride (1 = full resolution) */
  terrainStride: 1,
  /** while driving: the building whose ground is levelled (overrides the selected model) */
  flatSite: null as null | { id: string; center: THREE.Vector3; sizeKm: number },
  /** driving: chase-distance multiplier (wheel / pinch / zoom buttons) */
  driveZoom: 1,
  /** driving: the building nearest the truck (drive bar: distance, direction relative to the view) */
  driveNear: null as null | { id: string; distM: number; bearing: number },
  /** driving: the building the truck is racing to (hyperlapse) */
  driveAuto: null as null | string,
  /** "+N" badges: shown miniatures that stand for overlapping neighbours */
  miniClusters: [] as { id: string; ids: string[]; anchor: THREE.Vector3; rPx: number }[],
}

/** Rendered ground height (scene km, current exaggeration) at (x, z), including the levelled plateau; null off the relief. */
export function groundY(x: number, z: number): number | null {
  const t = runtime.terrain
  if (!t || !t.inside(x, z)) return null
  let h = t.meshY(x, z, runtime.terrainStride)
  const f = runtime.flat
  if (f.k > 0.001) {
    const dd = Math.hypot(x - f.x, z - f.z)
    const k = f.k * (1 - THREE.MathUtils.smoothstep(dd, f.r0, f.r1))
    h += (f.y - h) * k
  }
  return h * runtime.yScale
}

/** Effective exaggeration as a function of camera distance (km): strong nationally, near-true locally. */
export function exaggerationFor(d: number, baked = 5) {
  const t = THREE.MathUtils.smoothstep(d, 2, 160)
  return 1.25 + (baked - 1.25) * t
}

/** Scene position (km) of a project, on the terrain surface (current exaggeration). */
export function projectPosition(p: Pick<Project, 'lat' | 'lon'>, target = new THREE.Vector3()) {
  const t = runtime.terrain
  const q = project(p.lat, p.lon)
  if (!t) return target.set(q.x, 0, q.z)
  const inside = t.inside(q.x, q.z)
  return target.set(q.x, inside ? t.y(q.x, q.z) * runtime.yScale : -3.2, q.z)
}

/** Rotation about Y that aligns the model's +X axis with the real bearing (deg from true north). */
export function rotationFor(p: Pick<Project, 'lat' | 'lon' | 'bearingDeg'>) {
  const gamma = (convergence(p.lat, p.lon) * 180) / Math.PI
  return THREE.MathUtils.degToRad(90 - (p.bearingDeg + gamma))
}
