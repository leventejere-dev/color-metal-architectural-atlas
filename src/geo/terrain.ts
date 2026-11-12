/**
 * Terrain data access: loads the baked height grid and answers height queries
 * in scene units. Heights are real elevations (m); the scene shows them with a
 * documented vertical exaggeration (terrain.json → exaggeration).
 */
import * as THREE from 'three'
import { project } from './projection'

export interface TerrainMeta {
  extent: { x0: number; x1: number; z0: number; z1: number }
  grid: { nx: number; ny: number; spacingKm: number; file: string }
  textures: { nx: number; ny: number; normal: string; shade: string; mask: string; maskScale: number }
  table: { x0: number; x1: number; z0: number; z1: number; w: number; h: number; file: string }
  exaggeration: number
  maxElevationM: number
}

export interface Vectors {
  border: [number, number][][]
  counties: [number, number][][]
  countyLabels: { name: string; nameHu?: string; nameEn?: string; x: number; z: number; area: number }[]
  rivers: { name: string | null; rank: number; pts: [number, number][] }[]
  cities: { name: string; nameHu: string; prio: number; x: number; z: number }[]
  regions: { name: string; nameHu: string; nameEn: string; x: number; z: number }[]
  neighbours: { name: string; nameHu: string; nameEn: string; x: number; z: number }[]
}

/** Thickness of the terrain slab below sea level (km, scene units). */
export const SLAB = 3.2

export class Terrain {
  meta: TerrainMeta
  heights: Float32Array // metres
  mask: Uint8ClampedArray | null = null
  maskW = 0
  maskH = 0

  constructor(meta: TerrainMeta, heights: Float32Array) {
    this.meta = meta
    this.heights = heights
  }

  get exag() {
    return this.meta.exaggeration
  }

  /** Bilinear elevation (m) at scene (x, z). */
  elevation(x: number, z: number): number {
    const { extent, grid } = this.meta
    const fx = ((x - extent.x0) / (extent.x1 - extent.x0)) * (grid.nx - 1)
    const fy = ((z - extent.z0) / (extent.z1 - extent.z0)) * (grid.ny - 1)
    const cx = Math.min(Math.max(fx, 0), grid.nx - 1.001)
    const cy = Math.min(Math.max(fy, 0), grid.ny - 1.001)
    const ix = Math.floor(cx)
    const iy = Math.floor(cy)
    const tx = cx - ix
    const ty = cy - iy
    const h = this.heights
    const i = iy * grid.nx + ix
    const a = h[i] * (1 - tx) + h[i + 1] * tx
    const b = h[i + grid.nx] * (1 - tx) + h[i + grid.nx + 1] * tx
    return a * (1 - ty) + b * ty
  }

  /** Scene height (km, exaggerated) at (x, z). Matches the rendered mesh closely. */
  y(x: number, z: number): number {
    return (this.elevation(x, z) / 1000) * this.exag
  }

  toScene(lat: number, lon: number, target = new THREE.Vector3()) {
    const p = project(lat, lon)
    return target.set(p.x, this.inside(p.x, p.z) ? this.y(p.x, p.z) : -SLAB, p.z)
  }

  /** Signed distance to the Romanian border in km (positive inside). */
  borderDistance(x: number, z: number): number {
    if (!this.mask) return 1
    const { extent, textures } = this.meta
    const fx = ((x - extent.x0) / (extent.x1 - extent.x0)) * (this.maskW - 1)
    const fy = ((z - extent.z0) / (extent.z1 - extent.z0)) * (this.maskH - 1)
    if (fx < 0 || fy < 0 || fx > this.maskW - 1 || fy > this.maskH - 1) return -100
    const v = this.mask[(Math.round(fy) * this.maskW + Math.round(fx)) * 4]
    const px = (v - 128) / textures.maskScale
    return px * ((extent.x1 - extent.x0) / (this.maskW - 1))
  }

  inside(x: number, z: number) {
    return this.borderDistance(x, z) > -0.05
  }
}

async function loadImageData(url: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

export async function loadTerrain(base = 'geo/'): Promise<{ terrain: Terrain; vectors: Vectors }> {
  const [meta, buf, vectors] = await Promise.all([
    fetch(base + 'terrain.json').then((r) => r.json() as Promise<TerrainMeta>),
    fetch(base + 'height.bin').then((r) => r.arrayBuffer()),
    fetch(base + 'vectors.json').then((r) => r.json() as Promise<Vectors>),
  ])
  const raw = new Uint16Array(buf)
  const heights = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) heights[i] = raw[i] / 10
  const terrain = new Terrain(meta, heights)
  const mask = await loadImageData(base + meta.textures.mask)
  terrain.mask = mask.data
  terrain.maskW = mask.width
  terrain.maskH = mask.height
  return { terrain, vectors }
}
