/**
 * Atlas material palette = the exhibition-table library (lib/materials.ts, kept
 * unchanged) + additional architectural metals and neutral building materials
 * used by the new reference models. Created once and shared by every model.
 *
 * METAL KEYS (standing-seam textures, UVs in metres):
 *   copperNew      freshly installed copper, bright salmon-orange
 *   copper         as-built copper a few years old, warm brown-red (exhibition)
 *   copperBrown    oxidised dark brown copper
 *   copperPatina   green patina (only where photographs show it)
 *   copperPrepat   pre-patinated copper (KME TECU® Patina), even blue-green
 *   zinc           elZinc Rainbow Gold (Sepsi OSK, exhibition)
 *   zincNatural    natural / bright titanium-zinc
 *   zincSlate      pre-weathered mid grey (elZinc Slate)
 *   zincGraphite   pre-weathered dark graphite (elZinc Graphite)
 *   zincOliva      pre-weathered olive-grey (elZinc Oliva)
 *   alu            anthracite coated aluminium (exhibition, PREFA anthracite)
 *   aluDarkGrey    dark grey coated aluminium (PREFA P10 dark grey)
 *   aluBronze      bronze coated aluminium (PREFA bronze)
 *   aluNatural     natural / silver aluminium sheet
 *   aluCopperline  copper-tone painted aluminium
 *   expMesh        gold-painted expanded aluminium (exhibition garage)
 *   expMeshGreen   green-painted expanded aluminium
 *   brass          architectural brass
 *   gilt           gilded ornament (crosses, globes)
 *   helm           light grey sheet metal (flashings, existing metal)
 * NEUTRAL KEYS: plasterWhite, plasterCream, plasterOchre, plasterYellow, plasterPink,
 *   plasterGrey, plasterSand, brick (texture), brickRed, stoneLight, stoneWarm, stoneGrey,
 *   concrete, concreteLight, timber, wood, shingle, tileRed, tileBrown, glassC (dark glazing),
 *   glassM, glassG (light reflective glazing), skylight, white, trim, iron, black, socle
 */
import * as THREE from 'three'
import { createMaterials, type Mats } from './materials'
import { brushedTexture, noiseTexture, panelTexture } from './textures'
import { expandedMeshTexture } from './siteTextures'
import { MESH_DIAMOND } from './materials'
import { ashlarTex, clayTileTex, grainTex, plasterTex, timberTex, type SurfaceTex } from './surfaceTextures'

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)
const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p)

function tiled(t: THREE.Texture, uMetres: number, vMetres: number) {
  const c = t.clone()
  c.repeat.set(1 / uMetres, 1 / vMetres)
  c.needsUpdate = true
  return c
}

let shared: { mats: Mats; dispose: () => void } | null = null
let surfaceGrain: SurfaceTex | null = null
let baseMaterials = new Set<THREE.Material>()

/**
 * Finishing pass for model-specific materials: flat, non-metal materials get a
 * fine surface grain and relief so nothing reads as plastic. The exhibition
 * table's own materials are left exactly as they were.
 */
export function finishMaterials(root: THREE.Object3D) {
  atlasMaterials()
  const g = surfaceGrain
  if (!g) return
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of list) {
      const m = mat as THREE.MeshStandardMaterial
      if (!m.isMeshStandardMaterial || baseMaterials.has(m) || m.userData.finished) continue
      m.userData.finished = true
      if (m.map || m.transparent || m.alphaMap) continue
      if (m.metalness < 0.45) {
        m.map = g.map
        m.bumpMap = g.bump
        m.bumpScale = 0.45
        m.needsUpdate = true
      }
    }
  })
}

/** Shared, lazily created palette. */
export function atlasMaterials() {
  if (shared) return shared
  const base = createMaterials()
  const textures: THREE.Texture[] = []
  const T = <X extends THREE.Texture>(t: X) => {
    textures.push(t)
    return t
  }
  const tray = 0.55
  const sheet = (seed: number, palette: string[], variation = 0.05, streaks = 0.03, seamShade = 0.78) =>
    T(tiled(T(panelTexture({ seed, strips: 32, palette, variation, streaks, seamShade })), 32 * tray, 7))
  const rough = (seed: number, s = 2.5) => T(tiled(T(noiseTexture(seed, 200, 36)), s, s))

  const metal = (map: THREE.Texture, metalness: number, roughness: number, roughSeed: number, env = 1.15) => {
    const m = std({ color: '#ffffff', map, metalness, roughness, envMapIntensity: env })
    m.roughnessMap = rough(roughSeed)
    return m
  }

  const mats: Mats = {
    ...base.mats,
    copperNew: metal(sheet(101, ['#c27a52', '#b86e48', '#cc8459', '#b06a45', '#c88158'], 0.08, 0.05), 1, 0.32, 102, 1.25),
    copperBrown: metal(sheet(103, ['#5e3a2c', '#6a4232', '#563427', '#714836'], 0.08, 0.05), 1, 0.44, 104),
    copperPatina: metal(sheet(105, ['#6f9a86', '#7aa491', '#628f7c', '#86ad99'], 0.07, 0.06, 0.85), 0.35, 0.62, 106, 0.8),
    copperPrepat: metal(sheet(107, ['#6c9488', '#729b8f', '#678f84', '#78a196'], 0.05, 0.04, 0.85), 0.3, 0.6, 108, 0.8),
    zincNatural: metal(sheet(111, ['#b3b7b9', '#aaaeb1', '#b9bcbe'], 0.035, 0.025, 0.8), 0.85, 0.4, 112),
    zincSlate: metal(sheet(113, ['#8b9095', '#868b90', '#8f9498'], 0.03, 0.02, 0.82), 0.7, 0.5, 114),
    zincGraphite: metal(sheet(115, ['#55585b', '#505356', '#595c60'], 0.03, 0.02, 0.85), 0.65, 0.48, 116),
    zincOliva: metal(sheet(117, ['#7d8072', '#77796c', '#828577'], 0.03, 0.02, 0.84), 0.62, 0.52, 118),
    aluDarkGrey: phys({ color: '#ffffff', map: sheet(121, ['#4b4f53', '#474b4f', '#4f5357'], 0.03, 0.015, 0.86), metalness: 0.5, roughness: 0.44, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 1.1 }),
    aluBronze: phys({ color: '#ffffff', map: sheet(123, ['#6d5947', '#675442', '#72604d'], 0.03, 0.015, 0.86), metalness: 0.55, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 1.1 }),
    aluNatural: metal(sheet(125, ['#c9cdd0', '#c3c7ca', '#ced2d4'], 0.02, 0.015, 0.84), 0.9, 0.34, 126, 1.2),
    aluCopperline: phys({ color: '#ffffff', map: sheet(127, ['#9c5f3f', '#a4654a', '#955a3c'], 0.03, 0.015, 0.85), metalness: 0.6, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 1.1 }),
    brass: std({ color: '#b99a5e', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    plasterWhite: std({ color: '#efece5', roughness: 0.9 }),
    plasterCream: std({ color: '#e9dfc6', roughness: 0.9 }),
    plasterOchre: std({ color: '#d9bb7c', roughness: 0.9 }),
    plasterYellow: std({ color: '#e6d39c', roughness: 0.9 }),
    plasterPink: std({ color: '#e2c3b2', roughness: 0.9 }),
    plasterGrey: std({ color: '#cfcbc3', roughness: 0.9 }),
    plasterSand: std({ color: '#dccfb2', roughness: 0.9 }),
    brickRed: std({ color: '#a4583f', roughness: 0.88 }),
    stoneLight: std({ color: '#ddd5c2', roughness: 0.86 }),
    stoneWarm: std({ color: '#cbb894', roughness: 0.86 }),
    stoneGrey: std({ color: '#a9a69f', roughness: 0.88 }),
    concreteLight: std({ color: '#dcd9d2', roughness: 0.9 }),
    timber: std({ color: '#9a7652', roughness: 0.8 }),
    shingle: std({ color: '#6e5b49', roughness: 0.9 }),
    tileRed: std({ color: '#a8573c', roughness: 0.82 }),
    tileBrown: std({ color: '#7e4a37', roughness: 0.84 }),
    black: std({ color: '#222427', roughness: 0.6, metalness: 0.2 }),
  }
  // green expanded aluminium (same construction as the gold mesh of the garage)
  const meshMap = T(tiled(T(expandedMeshTexture(false)), MESH_DIAMOND.lwd, MESH_DIAMOND.swd))
  const meshAlpha = T(tiled(T(expandedMeshTexture(true)), MESH_DIAMOND.lwd, MESH_DIAMOND.swd))
  const green = std({ color: '#3f8a5e', map: meshMap, alphaMap: meshAlpha, alphaToCoverage: true, side: THREE.DoubleSide, metalness: 0.45, roughness: 0.4, envMapIntensity: 1.1 })
  green.userData.noCast = true
  mats.expMeshGreen = green
  ;(mats.brass as THREE.MeshStandardMaterial).roughnessMap = T(tiled(T(brushedTexture(17, true)), 1.5, 1.5))

  // ---- surface textures for the neutral materials (UVs in metres) ----
  const surf = (st: SurfaceTex) => {
    for (const t of [st.map, st.bump]) {
      t.repeat.set(1 / st.size[0], 1 / st.size[1])
      textures.push(t)
    }
    return st
  }
  const plaster = surf(plasterTex(7))
  const ashlar = surf(ashlarTex(21))
  const tiles = surf(clayTileTex(33))
  const boards = surf(timberTex(45))
  const grain = surf(grainTex(61))
  const dress = (keys: string[], st: SurfaceTex, bump: number) => {
    for (const k of keys) {
      const m = mats[k] as THREE.MeshStandardMaterial
      if (!m) continue
      m.map = st.map
      m.bumpMap = st.bump
      m.bumpScale = bump
      m.needsUpdate = true
    }
  }
  dress(['plasterWhite', 'plasterCream', 'plasterOchre', 'plasterYellow', 'plasterPink', 'plasterGrey', 'plasterSand'], plaster, 0.6)
  dress(['stoneLight', 'stoneWarm', 'stoneGrey'], ashlar, 1.2)
  dress(['tileRed', 'tileBrown'], tiles, 1.6)
  dress(['timber', 'shingle'], boards, 1)
  dress(['concreteLight', 'brickRed', 'black'], grain, 0.5)
  surfaceGrain = grain
  baseMaterials = new Set(Object.values(base.mats))

  shared = {
    mats,
    dispose() {
      base.dispose()
      Object.values(mats).forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      shared = null
    },
  }
  return shared
}
