/**
 * Romania as a sculpted terrain slab on a light table: real elevation (AWS
 * Terrain Tiles), cut along the national border (signed-distance mask), with
 * side walls, a slim brass base line and the neighbouring countries printed on
 * the table. Relief exaggeration is applied through the group's Y scale so
 * that normals stay consistent.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { SLAB, type Terrain } from '../geo/terrain'
import { runtime } from './runtime'
import { useStore } from '../state/store'

const BASE = 'geo/'
export const BG = '#d9d5cd'

function buildTerrainGeometry(t: Terrain, stride: number) {
  const { extent, grid } = t.meta
  const nx = Math.floor((grid.nx - 1) / stride) + 1
  const ny = Math.floor((grid.ny - 1) / stride) + 1
  const pos = new Float32Array(nx * ny * 3)
  const uv = new Float32Array(nx * ny * 2)
  const keep = new Uint8Array(nx * ny)
  const sx = (extent.x1 - extent.x0) / (grid.nx - 1)
  const sz = (extent.z1 - extent.z0) / (grid.ny - 1)
  for (let j = 0; j < ny; j++) {
    const gj = Math.min(j * stride, grid.ny - 1)
    for (let i = 0; i < nx; i++) {
      const gi = Math.min(i * stride, grid.nx - 1)
      const k = j * nx + i
      const x = extent.x0 + gi * sx
      const z = extent.z0 + gj * sz
      pos[k * 3] = x
      pos[k * 3 + 1] = (t.heights[gj * grid.nx + gi] / 1000) * t.exag
      pos[k * 3 + 2] = z
      uv[k * 2] = gi / (grid.nx - 1)
      uv[k * 2 + 1] = 1 - gj / (grid.ny - 1)
      keep[k] = t.borderDistance(x, z) > -3 * stride ? 1 : 0
    }
  }
  const idx: number[] = []
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i
      const b = a + 1
      const c = a + nx
      const d = c + 1
      if (!(keep[a] || keep[b] || keep[c] || keep[d])) continue
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nx * ny * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  g.setIndex(nx * ny > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1))
  g.computeBoundingSphere()
  return g
}

function buildWalls(t: Terrain, rings: [number, number][][]) {
  const pos: number[] = []
  const nor: number[] = []
  const band: number[] = []
  const bandN: number[] = []
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i]
      const [bx, bz] = ring[i + 1]
      const dx = bx - ax
      const dz = bz - az
      const L = Math.hypot(dx, dz)
      if (L < 1e-6) continue
      let nx = dz / L
      let nz = -dx / L
      const mx = (ax + bx) / 2
      const mz = (az + bz) / 2
      if (t.borderDistance(mx + nx * 0.6, mz + nz * 0.6) > 0) {
        nx = -nx
        nz = -nz
      }
      const ay = t.y(ax, az) + 0.004
      const by = t.y(bx, bz) + 0.004
      const y0 = -SLAB + 0.12
      // quad a-b top to bottom (two triangles), oriented outward
      const quad = [ax, ay, az, bx, by, bz, bx, y0, bz, ax, ay, az, bx, y0, bz, ax, y0, az]
      pos.push(...quad)
      for (let k = 0; k < 6; k++) nor.push(nx, 0, nz)
      const b0 = -SLAB
      const b1 = -SLAB + 0.12
      band.push(ax, b1, az, bx, b1, bz, bx, b0, bz, ax, b1, az, bx, b0, bz, ax, b0, az)
      for (let k = 0; k < 6; k++) bandN.push(nx, 0, nz)
    }
  }
  const mk = (p: number[], n: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
    return g
  }
  return { wall: mk(pos, nor), band: mk(band, bandN) }
}

export function TerrainModel({ terrain, quality }: { terrain: Terrain; quality: 'high' | 'low' }) {
  const group = useRef<THREE.Group>(null!)
  const [shade, normal, mask, table] = useLoader(THREE.TextureLoader, [
    BASE + terrain.meta.textures.shade,
    BASE + terrain.meta.textures.normal,
    BASE + terrain.meta.textures.mask,
    BASE + terrain.meta.table.file,
  ])
  const context = useStore((s) => s.context)

  const geometry = useMemo(() => buildTerrainGeometry(terrain, quality === 'high' ? 1 : 2), [terrain, quality])
  const walls = useMemo(() => buildWalls(terrain, runtime.vectors?.border ?? []), [terrain])

  const uniforms = useMemo(
    () => ({
      maskMap: { value: mask },
      uSite: { value: new THREE.Vector3(0, 0, 0) },
      uFlat: { value: 0 },
      uFlatR: { value: new THREE.Vector2(0.25, 0.9) },
    }),
    [mask],
  )

  const material = useMemo(() => {
    shade.colorSpace = THREE.SRGBColorSpace
    shade.anisotropy = 8
    normal.colorSpace = THREE.NoColorSpace
    normal.anisotropy = 8
    mask.colorSpace = THREE.NoColorSpace
    const m = new THREE.MeshStandardMaterial({
      map: shade,
      normalMap: normal,
      normalMapType: THREE.ObjectSpaceNormalMap,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.35,
    })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uSite; uniform float uFlat; uniform vec2 uFlatR; varying float vFlatK;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float dd = distance(position.xz, uSite.xz);
          vFlatK = uFlat * (1.0 - smoothstep(uFlatR.x, uFlatR.y, dd));
          transformed.y = mix(transformed.y, uSite.y, vFlatK);`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D maskMap; varying float vFlatK;`,
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          if (texture2D(maskMap, vMapUv).r < 0.5) discard;`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          normal = normalize(mix(normal, normalize(normalMatrix * vec3(0.0, 1.0, 0.0)), vFlatK));`,
        )
    }
    return m
  }, [shade, normal, mask, uniforms])

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d1c3', roughness: 0.92, metalness: 0 }), [])
  const bandMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b99a5e', roughness: 0.32, metalness: 1 }), [])
  const tableMat = useMemo(() => {
    table.colorSpace = THREE.SRGBColorSpace
    table.anisotropy = 8
    return new THREE.MeshStandardMaterial({ map: table, roughness: 1, metalness: 0, envMapIntensity: 0.2 })
  }, [table])

  useEffect(
    () => () => {
      geometry.dispose()
      walls.wall.dispose()
      walls.band.dispose()
      material.dispose()
      wallMat.dispose()
      bandMat.dispose()
      tableMat.dispose()
    },
    [geometry, walls, material, wallMat, bandMat, tableMat],
  )

  const tb = terrain.meta.table
  const site = useRef(new THREE.Vector3())

  useFrame(() => {
    group.current.scale.y = runtime.yScale
    // level a small plateau under the selected model so it sits on a true base
    const m = runtime.model
    const target = m && runtime.distance < 60 ? 1 : 0
    uniforms.uFlat.value += (target - uniforms.uFlat.value) * 0.08
    if (m) {
      site.current.set(m.center.x, terrain.y(m.center.x, m.center.z), m.center.z)
      uniforms.uSite.value.copy(site.current)
      const r = Math.max(0.12, (Math.max(m.sizeM.x, m.sizeM.z) / 1000) * m.scale * 1.1)
      uniforms.uFlatR.value.set(r, r * 3 + 0.6)
    }
  })

  const visible = context === 'geo'
  return (
    <group ref={group} visible={visible}>
      <mesh geometry={geometry} material={material} receiveShadow name="terrain" />
      <mesh geometry={walls.wall} material={wallMat} />
      <mesh geometry={walls.band} material={bandMat} />
      <mesh position={[(tb.x0 + tb.x1) / 2, -SLAB - 0.002, (tb.z0 + tb.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={tableMat}>
        <planeGeometry args={[tb.x1 - tb.x0, tb.z1 - tb.z0]} />
      </mesh>
    </group>
  )
}
