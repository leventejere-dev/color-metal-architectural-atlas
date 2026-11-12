import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { loadTerrain, type Terrain, type Vectors } from './geo/terrain'
import { AtlasScene } from './scene/AtlasScene'
import { runtime } from './scene/runtime'
import { useStore, useT } from './state/store'
import { useHashRouting } from './state/router'
import { LabelLayer } from './ui/LabelLayer'
import { TopBar } from './ui/TopBar'
import { Directory } from './ui/Directory'
import { InfoPanel } from './ui/InfoPanel'
import { InspectBar } from './ui/InspectBar'
import { MapControls } from './ui/MapControls'
import { Gallery } from './ui/Gallery'
import { Intro } from './ui/Intro'
import { TourBar, TourController } from './ui/Tour'
import { About } from './ui/About'
import { Toast } from './ui/Toast'

const mobile = typeof window !== 'undefined' && (window.innerWidth < 760 || /Android|iPhone|iPad/i.test(navigator.userAgent))
const quality: 'high' | 'low' = mobile ? 'low' : 'high'

export function App() {
  const [geo, setGeo] = useState<{ terrain: Terrain; vectors: Vectors } | null>(null)
  const [error, setError] = useState(false)
  const t = useT()
  const lang = useStore((s) => s.lang)
  const compare = useStore((s) => s.gallery.open && s.gallery.compare)
  useHashRouting(!!geo)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    loadTerrain()
      .then((g) => {
        runtime.terrain = g.terrain
        runtime.vectors = g.vectors
        setGeo(g)
      })
      .catch((e) => {
        console.error(e)
        setError(true)
      })
  }, [])

  return (
    <div className={`app ${compare ? 'comparing' : ''}`}>
      <div className="stage">
        <Canvas
          shadows
          dpr={mobile ? [1, 1.5] : [1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
          camera={{ fov: 30, near: 1, far: 100000, position: [0, 1500, 900] }}
          onPointerMissed={() => useStore.getState().setHover(null)}
        >
          <Suspense fallback={null}>{geo && <AtlasScene terrain={geo.terrain} vectors={geo.vectors} quality={quality} />}</Suspense>
        </Canvas>
      </div>
      {geo && <LabelLayer vectors={geo.vectors} />}
      <TopBar />
      <Directory />
      <InfoPanel />
      <InspectBar />
      <MapControls />
      <TourBar />
      <TourController />
      <Gallery />
      <About />
      <Toast />
      <Intro ready={!!geo} />
      {error && <div className="fatal">{t.error}</div>}
    </div>
  )
}
