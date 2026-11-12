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
  /** selected model placement, for camera framing */
  model: null as null | { id: string; sizeM: THREE.Vector3; center: THREE.Vector3; rotY: number; front: [number, number]; materialFocus?: [number, number, number]; scale: number },
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
