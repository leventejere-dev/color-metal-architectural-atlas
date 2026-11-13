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

/** Tileable ground grain (soil / grass speckle), multiplied into the satellite colour at close range. */
function groundDetail() {
  const n = 256
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(n, n)
  // periodic value noise (wraps at the tile edges)
  const lattice = (p: number, seed: number) => {
    const g = new Float32Array(p * p)
    let s = seed
    for (let i = 0; i < g.length; i++) {
      s = (s * 16807) % 2147483647
      g[i] = s / 2147483647
    }
    return (x: number, y: number) => {
      const xi = Math.floor(x) % p
      const yi = Math.floor(y) % p
      const xf = x - Math.floor(x)
      const yf = y - Math.floor(y)
      const u = xf * xf * (3 - 2 * xf)
      const v = yf * yf * (3 - 2 * yf)
      const a = g[yi * p + xi]
      const b = g[yi * p + ((xi + 1) % p)]
      const cc = g[((yi + 1) % p) * p + xi]
      const d = g[((yi + 1) % p) * p + ((xi + 1) % p)]
      return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v
    }
  }
  const o1 = lattice(8, 11)
  const o2 = lattice(32, 23)
  const o3 = lattice(128, 37)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const v = 0.55 * o1((x / n) * 8, (y / n) * 8) + 0.3 * o2((x / n) * 32, (y / n) * 32) + 0.15 * o3((x / n) * 128, (y / n) * 128)
      const k = 0.84 + v * 0.3
      const i = (y * n + x) * 4
      img.data[i] = Math.min(255, k * 236)
      img.data[i + 1] = Math.min(255, k * 240)
      img.data[i + 2] = Math.min(255, k * 228)
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function TerrainModel({ terrain, quality }: { terrain: Terrain; quality: 'high' | 'low' }) {
  const group = useRef<THREE.Group>(null!)
  // colour: the Sentinel-2 satellite mosaic when baked (scripts/build-satellite.py), else the ivory relief print
  const tx = terrain.meta.textures
  const colourFile = tx.satellite ? (quality === 'high' ? tx.satellite : tx.satelliteLow ?? tx.satellite) : tx.shade
  const [shade, normal, mask, table] = useLoader(THREE.TextureLoader, [
    BASE + colourFile,
    BASE + tx.normal,
    BASE + tx.mask,
    BASE + (terrain.meta.table.satFile ?? terrain.meta.table.file),
  ])
  const context = useStore((s) => s.context)
  const theme = useStore((s) => s.theme)

  const geometry = useMemo(() => buildTerrainGeometry(terrain, quality === 'high' ? 1 : 2), [terrain, quality])
  const walls = useMemo(() => buildWalls(terrain, runtime.vectors?.border ?? []), [terrain])

  const uniforms = useMemo(
    () => ({
      maskMap: { value: mask },
      uSite: { value: new THREE.Vector3(0, 0, 0) },
      uFlat: { value: 0 },
      uFlatR: { value: new THREE.Vector2(0.25, 0.9) },
      detailMap: { value: groundDetail() },
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
          uniform vec3 uSite; uniform float uFlat; uniform vec2 uFlatR; varying float vFlatK; varying vec2 vGround;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float dd = distance(position.xz, uSite.xz);
          vFlatK = uFlat * (1.0 - smoothstep(uFlatR.x, uFlatR.y, dd));
          transformed.y = mix(transformed.y, uSite.y, vFlatK);
          vGround = position.xz;`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D maskMap; uniform sampler2D detailMap; varying float vFlatK; varying vec2 vGround;`,
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          if (texture2D(maskMap, vMapUv).r < 0.5) discard;`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // close range: fine ground grain over the (coarse) satellite colour
          float gk = 1.0 - smoothstep(0.25, 1.6, length(vViewPosition));
          if (gk > 0.0) {
            vec3 g1 = texture2D(detailMap, vGround / 0.007).rgb;
            vec3 g2 = texture2D(detailMap, vGround / 0.041 + 0.37).rgb;
            diffuseColor.rgb *= mix(vec3(1.0), g1 * g2 * 1.12, gk);
          }`,
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
  useEffect(() => {
    const dark = theme === 'dark'
    wallMat.color.set(dark ? '#3a3b40' : '#d8d1c3')
    tableMat.color.set(dark ? '#5d5f66' : '#ffffff')
  }, [theme, wallMat, tableMat])

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
    // level a small plateau under the selected model (or, while driving, the building nearest
    // the truck) so it sits on a true base
    const stride = quality === 'high' ? 1 : 2
    runtime.terrainStride = stride
    const fs = runtime.flatSite
    const m = runtime.model
    const src = fs
      ? { cx: fs.center.x, cz: fs.center.z, sizeKm: fs.sizeKm }
      : m
        ? { cx: m.center.x, cz: m.center.z, sizeKm: (Math.max(m.sizeM.x, m.sizeM.z) / 1000) * Math.min(m.scale, 1.5) }
        : null
    const target = src && (fs || runtime.distance < 60) ? 1 : 0
    if (src) {
      // the plateau must cover whole mesh cells around the site, otherwise the rendered (linearly
      // interpolated) slope stays above the site height and buries the building / the walking figure
      const cell = terrain.meta.grid.spacingKm * stride
      const r = Math.max(0.12, src.sizeKm * 1.1, cell * 2.2)
      const moved = Math.hypot(site.current.x - src.cx, site.current.z - src.cz) > 1e-6
      // a new site while the old plateau is still raised: lower it first, then move it
      if (moved && uniforms.uFlat.value > 0.02) uniforms.uFlat.value = Math.max(0, uniforms.uFlat.value - 0.25)
      else {
        site.current.set(src.cx, terrain.meshY(src.cx, src.cz, stride), src.cz)
        uniforms.uSite.value.copy(site.current)
        uniforms.uFlatR.value.set(r, r + cell * 2.5)
        uniforms.uFlat.value += (target - uniforms.uFlat.value) * 0.08
      }
    } else uniforms.uFlat.value += (0 - uniforms.uFlat.value) * 0.08
    const f = runtime.flat
    f.x = uniforms.uSite.value.x
    f.y = uniforms.uSite.value.y
    f.z = uniforms.uSite.value.z
    f.k = uniforms.uFlat.value
    f.r0 = uniforms.uFlatR.value.x
    f.r1 = uniforms.uFlatR.value.y
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
