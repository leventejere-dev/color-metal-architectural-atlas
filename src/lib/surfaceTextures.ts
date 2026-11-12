/**
 * Procedural surface textures for the neutral building materials (generated at
 * runtime, no files): mottled lime plaster, coursed stone ashlar, beaver-tail
 * clay tiles, vertical timber boards. Each returns a colour map (sRGB, near
 * white so it modulates the material colour) and a matching bump map. UVs of
 * the Builder geometry are in metres; repeats are set by the caller.
 */
import * as THREE from 'three'
import { rng } from './geo'

function canvas(n: number) {
  const c = document.createElement('canvas')
  c.width = c.height = n
  return { c, ctx: c.getContext('2d')! }
}

function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

/** tileable value noise (sum of octaves) into a Float32Array n×n, 0..1 */
function noise(n: number, seed: number, octaves = 5, base = 4) {
  const r = rng(seed)
  const out = new Float32Array(n * n)
  let amp = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const g = base << o
    const grid = new Float32Array(g * g).map(() => r())
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const fx = (x / n) * g
        const fy = (y / n) * g
        const x0 = Math.floor(fx) % g
        const y0 = Math.floor(fy) % g
        const x1 = (x0 + 1) % g
        const y1 = (y0 + 1) % g
        const tx = fx - Math.floor(fx)
        const ty = fy - Math.floor(fy)
        const sx = tx * tx * (3 - 2 * tx)
        const sy = ty * ty * (3 - 2 * ty)
        const a = grid[y0 * g + x0] * (1 - sx) + grid[y0 * g + x1] * sx
        const b = grid[y1 * g + x0] * (1 - sx) + grid[y1 * g + x1] * sx
        out[y * n + x] += (a * (1 - sy) + b * sy) * amp
      }
    }
    total += amp
    amp *= 0.55
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

function toCanvas(n: number, f: (x: number, y: number) => [number, number, number]) {
  const { c, ctx } = canvas(n)
  const img = ctx.createImageData(n, n)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const [r, g, b] = f(x, y)
      const o = (y * n + x) * 4
      img.data[o] = r
      img.data[o + 1] = g
      img.data[o + 2] = b
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return c
}

export interface SurfaceTex {
  map: THREE.Texture
  bump: THREE.Texture
  /** metres covered by one texture tile (u, v) */
  size: [number, number]
}

/** Lime plaster: soft mottling, faint vertical weathering streaks. 1 tile = 4 m. */
export function plasterTex(seed = 7): SurfaceTex {
  const n = 512
  const nz = noise(n, seed, 6, 4)
  const fine = noise(n, seed + 9, 3, 64)
  const streak = noise(n, seed + 3, 3, 8)
  const col = toCanvas(n, (x, y) => {
    const v = 0.9 + nz[y * n + x] * 0.09 + (fine[y * n + x] - 0.5) * 0.04 - Math.max(0, streak[x] - 0.62) * 0.08 * (y / n)
    const k = Math.min(255, v * 255)
    return [k, k, k * 0.995]
  })
  const bmp = toCanvas(n, (x, y) => {
    const k = 128 + (fine[y * n + x] - 0.5) * 120 + (nz[y * n + x] - 0.5) * 40
    return [k, k, k]
  })
  return { map: tex(col, true), bump: tex(bmp, false), size: [4, 4] }
}

/** Coursed ashlar: 0.6 × 0.3 m blocks with recessed joints and per-block tone. 1 tile = 2.4 × 1.2 m. */
export function ashlarTex(seed = 21): SurfaceTex {
  const n = 512
  const r = rng(seed)
  const rows = 4
  const cols = 4
  const tones = Array.from({ length: rows * cols * 2 }, () => 0.9 + r() * 0.1)
  const fine = noise(n, seed + 1, 4, 32)
  const joint = 0.012
  const val = (x: number, y: number) => {
    const u = x / n
    const v = y / n
    const row = Math.floor(v * rows)
    const off = row % 2 ? 0.5 / cols : 0
    const uu = (u + off) % 1
    const col = Math.floor(uu * cols)
    const fu = uu * cols - col
    const fv = v * rows - row
    const isJoint = fu < joint * cols || fv < joint * rows * 2
    return { isJoint, tone: tones[row * cols * 2 + col] }
  }
  const col = toCanvas(n, (x, y) => {
    const { isJoint, tone } = val(x, y)
    const k = (isJoint ? 0.78 : tone) * (0.95 + fine[y * n + x] * 0.08) * 255
    return [Math.min(255, k), Math.min(255, k * 0.99), Math.min(255, k * 0.97)]
  })
  const bmp = toCanvas(n, (x, y) => {
    const { isJoint } = val(x, y)
    const k = isJoint ? 40 : 150 + (fine[y * n + x] - 0.5) * 60
    return [k, k, k]
  })
  return { map: tex(col, true), bump: tex(bmp, false), size: [2.4, 1.2] }
}

/** Beaver-tail clay tiles: staggered courses of 0.18 m wide tiles, rounded lower edges. 1 tile = 1.44 × 0.9 m. */
export function clayTileTex(seed = 33): SurfaceTex {
  const n = 512
  const r = rng(seed)
  const cols = 8
  const rows = 6
  const tones = Array.from({ length: cols * rows * 2 }, () => 0.82 + r() * 0.18)
  const fine = noise(n, seed + 4, 3, 32)
  const val = (x: number, y: number) => {
    const u = x / n
    const v = y / n
    const row = Math.floor(v * rows)
    const off = row % 2 ? 0.5 / cols : 0
    const uu = (u + off) % 1
    const col = Math.floor(uu * cols)
    const fu = uu * cols - col - 0.5
    const fv = v * rows - row
    // rounded tail: shading darker near the lower (v small) curved edge
    const edge = 0.12 + 0.18 * (fu * fu * 4)
    const shade = fv < edge ? 0.62 : 1 - (1 - fv) * 0.12
    const gap = Math.abs(fu) > 0.47
    return { tone: tones[row * cols * 2 + col], shade, gap }
  }
  const col = toCanvas(n, (x, y) => {
    const { tone, shade, gap } = val(x, y)
    const k = (gap ? 0.6 : tone * shade) * (0.94 + fine[y * n + x] * 0.1) * 255
    return [Math.min(255, k), Math.min(255, k * 0.97), Math.min(255, k * 0.95)]
  })
  const bmp = toCanvas(n, (x, y) => {
    const { shade, gap } = val(x, y)
    const k = gap ? 30 : shade * 200
    return [k, k, k]
  })
  return { map: tex(col, true), bump: tex(bmp, false), size: [1.44, 0.9] }
}

/** Vertical timber boards 0.14 m with grain. 1 tile = 1.12 × 2 m. */
export function timberTex(seed = 45): SurfaceTex {
  const n = 512
  const r = rng(seed)
  const boards = 8
  const tones = Array.from({ length: boards }, () => 0.85 + r() * 0.15)
  const grain = noise(n, seed + 2, 4, 16)
  const col = toCanvas(n, (x, y) => {
    const b = Math.floor((x / n) * boards)
    const fu = (x / n) * boards - b
    const g = grain[(Math.floor(y / 6) * n + x) % (n * n)]
    const k = (fu < 0.04 ? 0.55 : tones[b] * (0.88 + g * 0.2)) * 255
    return [Math.min(255, k), Math.min(255, k * 0.96), Math.min(255, k * 0.92)]
  })
  const bmp = toCanvas(n, (x) => {
    const fu = (x / n) * boards - Math.floor((x / n) * boards)
    const k = fu < 0.04 ? 30 : 160
    return [k, k, k]
  })
  return { map: tex(col, true), bump: tex(bmp, false), size: [1.12, 2] }
}

/** Fine neutral grain for anything left flat (applied by the finishing pass). */
export function grainTex(seed = 61): SurfaceTex {
  const n = 256
  const nz = noise(n, seed, 5, 8)
  const fine = noise(n, seed + 1, 2, 64)
  const col = toCanvas(n, (x, y) => {
    const k = (0.93 + nz[y * n + x] * 0.06 + (fine[y * n + x] - 0.5) * 0.03) * 255
    return [k, k, k]
  })
  const bmp = toCanvas(n, (x, y) => {
    const k = 128 + (fine[y * n + x] - 0.5) * 90
    return [k, k, k]
  })
  return { map: tex(col, true), bump: tex(bmp, false), size: [3, 3] }
}
