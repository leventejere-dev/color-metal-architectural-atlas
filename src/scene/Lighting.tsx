/**
 * Lighting shared by the map and the inspection view (same language as the
 * exhibition table): a lightformer studio environment for metal reflections,
 * a north-west key light (classic cartographic hillshade direction) whose
 * shadow frustum follows the selected model, and soft fill.
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { runtime } from './runtime'
import { useStore } from '../state/store'

const KEY_DIR = new THREE.Vector3(-0.52, 0.72, -0.46).normalize()
const FILL_DIR = new THREE.Vector3(0.6, 0.45, 0.66).normalize()

export function Lighting({ quality }: { quality: 'high' | 'low' }) {
  const key = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const target = useRef(new THREE.Object3D())
  const { scene } = useThree()
  const context = useStore((s) => s.context)

  useEffect(() => {
    scene.add(target.current)
    key.current.target = target.current
    fill.current.target = target.current
    const s = quality === 'high' ? 4096 : 2048
    key.current.shadow.mapSize.set(s, s)
    key.current.shadow.bias = -0.0002
    key.current.shadow.normalBias = 0.0015
    return () => {
      scene.remove(target.current)
    }
  }, [scene, quality])

  useFrame(() => {
    const c = runtime.controls
    if (!c) return
    const t = c.getTarget(new THREE.Vector3())
    const m = runtime.model
    const d = runtime.distance
    const shadowOn = !!m && d < 12
    const focus = shadowOn && m ? m.center : t
    target.current.position.copy(focus)
    target.current.updateMatrixWorld()
    const r = shadowOn && m ? (Math.hypot(m.sizeM.x, m.sizeM.z) / 1000) * m.scale * 0.75 + 0.01 : d
    key.current.position.copy(focus).addScaledVector(KEY_DIR, r * 6 + 0.05)
    fill.current.position.copy(focus).addScaledVector(FILL_DIR, r * 6 + 0.05)
    key.current.castShadow = shadowOn
    if (shadowOn) {
      const cam = key.current.shadow.camera as THREE.OrthographicCamera
      if (Math.abs(cam.right - r) / r > 0.02) {
        cam.left = -r
        cam.right = r
        cam.top = r
        cam.bottom = -r
        cam.near = r * 0.5
        cam.far = r * 14
        cam.updateProjectionMatrix()
        key.current.shadow.normalBias = r * 0.0004
      }
    }
  })

  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={context === 'studio' ? 1.05 : 0.9}>
        <color attach="background" args={['#8f8c87']} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[9, 9, 1]} />
        {[45, 135, 225, 315, 0].map((a, i) => {
          const r = 6.5
          const th = (a * Math.PI) / 180
          return (
            <Lightformer
              key={a}
              form="rect"
              intensity={i === 4 ? 1.4 : 2.6}
              color={i % 2 ? '#f1f5fb' : '#fff5e8'}
              position={[Math.sin(th) * r, 2.2, Math.cos(th) * r]}
              rotation={[0, th + Math.PI, 0]}
              scale={i === 4 ? [9, 0.9, 1] : [1.3, 7, 1]}
            />
          )
        })}
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[0, 2, -8]} scale={[16, 5, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#f4efe6" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
      </Environment>
      <hemisphereLight args={['#ffffff', '#cfc6b6', 0.55]} />
      <directionalLight ref={key} intensity={3.1} color="#fff8ee" />
      <directionalLight ref={fill} intensity={0.35} color="#f2f5fa" />
    </>
  )
}
