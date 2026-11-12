import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Terrain, Vectors } from '../geo/terrain'
import { PROJECTS, useStore } from '../state/store'
import { CameraDirector } from './CameraDirector'
import { Lighting } from './Lighting'
import { Overlays } from './Overlays'
import { Miniatures } from './Miniatures'
import { Walker } from './Walker'
import { PostFX } from './PostFX'
import { TerrainModel, BG } from './TerrainModel'
import { labelState, projectLabels } from './labels'

const STUDIO_BG = new THREE.Color('#efece6')
const MAP_BG = new THREE.Color(BG)

function LabelProjector() {
  const { camera, size } = useThree()
  useFrame(() => projectLabels(camera, size.width, size.height))
  return null
}

function Background() {
  const { scene } = useThree()
  const context = useStore((s) => s.context)
  useEffect(() => {
    scene.background = (context === 'studio' ? STUDIO_BG : MAP_BG).clone()
  }, [context, scene])
  return null
}

function ReadyHandle() {
  const three = useThree()
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __three: three, __store: useStore, __labels: labelState })
  }, [three])
  return null
}

export function AtlasScene({ terrain, vectors, quality }: { terrain: Terrain; vectors: Vectors; quality: 'high' | 'low' }) {
  return (
    <>
      <Background />
      <Lighting quality={quality} />
      <TerrainModel terrain={terrain} quality={quality} />
      <Overlays terrain={terrain} vectors={vectors} />
      <Miniatures projects={PROJECTS} />
      <Walker />
      <PostFX quality={quality} />
      <CameraDirector />
      <LabelProjector />
      <ReadyHandle />
    </>
  )
}
