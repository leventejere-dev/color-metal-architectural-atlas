/**
 * Model QA sheet (development only, not part of the production build):
 *   /snap.html?id=<project id>[&module=<module>]
 * Renders one model in the studio language from four directions
 * (front 3/4, rear 3/4, top, side elevation). Used by scripts/snap.mjs.
 */
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { atlasMaterials, finishMaterials } from './lib/palette'
import { loadModel, type ModelModule } from './models/registry'
import db from './data/projects.json'

const params = new URLSearchParams(location.search)
const id = params.get('id') ?? ''
const proj = (db as unknown as { projects: { id: string; model: { module?: string } }[] }).projects.find((p) => p.id === id)
const moduleName = params.get('module') ?? proj?.model.module ?? id

interface Built {
  group: THREE.Group
  size: THREE.Vector3
  center: THREE.Vector3
  mod: ModelModule
}

let readyCount = 0

function Rig({ built, az, el, label }: { built: Built; az: number; el: number; label: string }) {
  const { camera } = useThree()
  const frames = useMemo(() => ({ n: 0 }), [])
  useEffect(() => {
    const s = built.size
    const r = Math.max(s.x, s.z, s.y) * 0.5
    const cam = camera as THREE.PerspectiveCamera
    const d = (r / Math.tan((cam.fov * Math.PI) / 360)) * 1.25
    const t = new THREE.Vector3(0, s.y * 0.38, 0)
    const elr = (el * Math.PI) / 180
    cam.position.set(t.x + Math.sin(az) * Math.cos(elr) * d, t.y + Math.sin(elr) * d, t.z + Math.cos(az) * Math.cos(elr) * d)
    if (el > 85) cam.up.set(Math.sin(az + Math.PI), 0, Math.cos(az + Math.PI))
    cam.near = d / 50
    cam.far = d * 20
    cam.lookAt(t)
    cam.updateProjectionMatrix()
  }, [built, az, el, camera])
  useFrame(() => {
    frames.n++
    if (frames.n === 8) {
      readyCount++
      if (readyCount >= 4) (window as unknown as { __snapReady: boolean }).__snapReady = true
    }
  })
  return (
    <>
      <primitive object={built.group.clone()} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[Math.max(built.size.x, built.size.z) * 1.5, 64]} />
        <meshStandardMaterial color="#ebe7df" roughness={0.95} />
      </mesh>
      <Studio size={Math.max(built.size.x, built.size.z, built.size.y)} />
      {label && null}
    </>
  )
}

function Studio({ size }: { size: number }) {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#8f8c87']} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[9, 9, 1]} />
        {[45, 135, 225, 315].map((a, i) => {
          const th = (a * Math.PI) / 180
          return <Lightformer key={a} form="rect" intensity={2.6} color={i % 2 ? '#f1f5fb' : '#fff5e8'} position={[Math.sin(th) * 6.5, 2.2, Math.cos(th) * 6.5]} rotation={[0, th + Math.PI, 0]} scale={[1.3, 7, 1]} />
        })}
        <Lightformer form="rect" intensity={0.35} color="#f4efe6" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
      </Environment>
      <hemisphereLight args={['#ffffff', '#ddd6c9', 0.8]} />
      <directionalLight
        castShadow
        intensity={2.5}
        color="#fff8ee"
        position={[-size * 0.9, size * 1.3, -size * 0.8]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={size * 0.1}
        shadow-camera-far={size * 5}
        shadow-bias={-0.0003}
      />
      <directionalLight intensity={0.6} position={[size, size * 0.8, size]} />
    </>
  )
}

function App() {
  const [built, setBuilt] = useState<Built | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    loadModel(moduleName)
      .then((mod) => {
        const pal = atlasMaterials().mats
        const extra = mod.materials ? mod.materials(pal) : {}
        const g = mod.build().build({ ...pal, ...extra }, id)
        finishMaterials(g)
        const box = new THREE.Box3().setFromObject(g)
        const c = box.getCenter(new THREE.Vector3())
        if (mod.recentre) g.position.set(-c.x, -box.min.y, -c.z)
        const box2 = new THREE.Box3().setFromObject(g)
        const wrap = new THREE.Group()
        wrap.add(g)
        setBuilt({ group: wrap, size: box2.getSize(new THREE.Vector3()), center: box2.getCenter(new THREE.Vector3()), mod })
      })
      .catch((e) => {
        console.error(e)
        setErr(String(e))
        ;(window as unknown as { __snapReady: boolean }).__snapReady = true
      })
  }, [])
  if (err) return <pre style={{ color: 'crimson', padding: 20 }}>{err}</pre>
  if (!built) return <p style={{ padding: 20 }}>loading {moduleName}…</p>
  const [fx, fz] = built.mod.front ?? [0, 1]
  const f = Math.atan2(fx, fz)
  const views: [number, number, string][] = [
    [f + 0.6, 24, 'front 3/4'],
    [f + Math.PI + 0.6, 24, 'rear 3/4'],
    [f, 89.5, 'top'],
    [f + Math.PI / 2, 4, 'side'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100vw', height: '100vh', gap: 2, background: '#bbb' }}>
      {views.map(([az, el, label]) => (
        <div key={label} style={{ position: 'relative', background: '#efece6' }}>
          <Canvas shadows dpr={1} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }} camera={{ fov: 30 }} style={{ position: 'absolute', inset: 0 }}>
            <color attach="background" args={['#efece6']} />
            <Rig built={built} az={az} el={el} label={label} />
          </Canvas>
          <span style={{ position: 'absolute', left: 8, top: 6, font: '12px sans-serif', color: '#555' }}>
            {id} · {label} · {built.size.x.toFixed(1)} × {built.size.z.toFixed(1)} × {built.size.y.toFixed(1)} m
          </span>
        </div>
      ))}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
