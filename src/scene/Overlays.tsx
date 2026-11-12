/**
 * Vector overlays draped on the terrain: county boundaries, rivers and the
 * national border edge. Lines live inside a group that follows the terrain's
 * vertical scale, and fade out when the camera is close to a building.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Line2 } from 'three-stdlib'
import type { Terrain, Vectors } from '../geo/terrain'
import { runtime } from './runtime'
import { useStore } from '../state/store'

function drape(t: Terrain, pts: [number, number][], lift: number, step = 1.5) {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i]
    if (i > 0) {
      const [px, pz] = pts[i - 1]
      const d = Math.hypot(x - px, z - pz)
      const n = Math.floor(d / step)
      for (let k = 1; k < n; k++) {
        const xx = px + ((x - px) * k) / n
        const zz = pz + ((z - pz) * k) / n
        out.push(new THREE.Vector3(xx, t.y(xx, zz) + lift, zz))
      }
    }
    out.push(new THREE.Vector3(x, t.y(x, z) + lift, z))
  }
  return out
}

function segments(lines: THREE.Vector3[][]) {
  const s: THREE.Vector3[] = []
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) s.push(l[i], l[i + 1])
  return s
}

export function Overlays({ terrain, vectors }: { terrain: Terrain; vectors: Vectors }) {
  const group = useRef<THREE.Group>(null!)
  const county = useRef<Line2>(null!)
  const riverA = useRef<Line2>(null!)
  const riverB = useRef<Line2>(null!)
  const edge = useRef<Line2>(null!)
  const context = useStore((s) => s.context)

  const data = useMemo(() => {
    const countyPts = segments(vectors.counties.map((l) => drape(terrain, l, 0.05)))
    const major = vectors.rivers.filter((r) => (r.rank ?? 9) <= 6 || r.name === 'Danube')
    const minor = vectors.rivers.filter((r) => !((r.rank ?? 9) <= 6 || r.name === 'Danube'))
    const riverMajor = segments(major.map((r) => drape(terrain, r.pts, 0.04)))
    const riverMinor = segments(minor.map((r) => drape(terrain, r.pts, 0.04)))
    const border = segments(vectors.border.map((r) => drape(terrain, r, 0.012, 0.8)))
    return { countyPts, riverMajor, riverMinor, border }
  }, [terrain, vectors])

  useFrame(() => {
    group.current.scale.y = runtime.yScale
    const d = runtime.distance
    const fade = THREE.MathUtils.smoothstep(d, 6, 30)
    const set = (l: Line2 | null, o: number) => {
      if (!l) return
      const m = l.material
      m.opacity = o
      l.visible = o > 0.01
    }
    set(county.current, 0.55 * fade)
    set(riverA.current, 0.85 * fade)
    set(riverB.current, 0.6 * fade * THREE.MathUtils.smoothstep(-d, -700, -250))
    set(edge.current, 0.55 * THREE.MathUtils.smoothstep(d, 2, 12))
  })

  return (
    <group ref={group} visible={context === 'geo'}>
      {data.countyPts.length > 0 && <Line ref={county} points={data.countyPts} segments color="#a99f8f" lineWidth={0.9} transparent depthWrite={false} dashed={false} />}
      {data.riverMajor.length > 0 && <Line ref={riverA} points={data.riverMajor} segments color="#8fadb9" lineWidth={1.6} transparent depthWrite={false} />}
      {data.riverMinor.length > 0 && <Line ref={riverB} points={data.riverMinor} segments color="#9db7c1" lineWidth={1.1} transparent depthWrite={false} />}
      {data.border.length > 0 && <Line ref={edge} points={data.border} segments color="#6f675b" lineWidth={1.1} transparent depthWrite={false} />}
    </group>
  )
}
