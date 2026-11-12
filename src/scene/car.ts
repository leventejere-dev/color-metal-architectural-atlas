/**
 * A true-scale (4.7 × 1.9 m) COLOR METAL car for the drive-around mode: graphite metallic
 * body with a brass side stripe and the company wordmark on both doors, glass cabin,
 * steerable / spinning wheels with brass rims, head and brake lights. Local +Z = forward.
 */
import * as THREE from 'three'
import { logoTexture } from './figure'

export interface Car {
  root: THREE.Group
  /** steer (rad, + = left) and wheel spin angle (rad) */
  update: (steer: number, spin: number, braking: boolean) => void
  dispose: () => void
}

const L = 4.7
const HALF_W = 0.93

function sideShape(pts: [number, number][]) {
  return new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)))
}

export function makeCar(): Car {
  const root = new THREE.Group()
  const geos: THREE.BufferGeometry[] = []
  const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x)
  const paint = new THREE.MeshPhysicalMaterial({ color: '#2a2e34', metalness: 0.65, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 })
  const brass = new THREE.MeshStandardMaterial({ color: '#c1a163', metalness: 1, roughness: 0.28, envMapIntensity: 1.2 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#141820', metalness: 0.4, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.6 })
  const rubber = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.92 })
  const dark = new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 0.6, metalness: 0.2 })
  const headL = new THREE.MeshStandardMaterial({ color: '#f4f1e8', emissive: '#fff6dc', emissiveIntensity: 0.9 })
  const tailL = new THREE.MeshStandardMaterial({ color: '#5a0d0d', emissive: '#ff2a1a', emissiveIntensity: 0.35 })
  const mats: THREE.Material[] = [paint, brass, glass, rubber, dark, headL, tailL]

  // body: side profile (z, y) extruded across the width, with rounded edges
  const body = sideShape([
    [-2.35, 0.3],
    [2.3, 0.3],
    [2.36, 0.52],
    [2.28, 0.76],
    [1.25, 0.95],
    [-1.25, 0.99],
    [-2.25, 0.93],
    [-2.37, 0.66],
  ])
  const bodyG = g(new THREE.ExtrudeGeometry(body, { depth: HALF_W * 2 - 0.16, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 8 }))
  bodyG.rotateY(-Math.PI / 2).translate(HALF_W - 0.08, 0, 0)
  // ExtrudeGeometry extrudes along +z of the shape plane; after rotateY(-π/2) the shape's x → model z
  root.add(new THREE.Mesh(bodyG, paint))

  // cabin glass + painted roof
  const cabin = sideShape([
    [-1.62, 0.96],
    [1.18, 0.96],
    [0.42, 1.4],
    [-0.95, 1.42],
  ])
  const cabG = g(new THREE.ExtrudeGeometry(cabin, { depth: 1.34, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }))
  cabG.rotateY(-Math.PI / 2).translate(0.67, 0, 0)
  root.add(new THREE.Mesh(cabG, glass))
  const roof = new THREE.Mesh(g(new THREE.BoxGeometry(1.36, 0.05, 1.28)), paint)
  roof.position.set(0, 1.45, -0.27)
  root.add(roof)
  // B-pillars
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(g(new THREE.BoxGeometry(0.06, 0.44, 0.12)), paint)
    p.position.set(s * 0.71, 1.18, -0.2)
    p.rotation.x = -0.06
    root.add(p)
  }

  // brass stripe, sills, bumpers, grille
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(g(new THREE.BoxGeometry(0.02, 0.05, 4.1)), brass)
    stripe.position.set(s * (HALF_W + 0.012), 0.6, 0)
    root.add(stripe)
    const sill = new THREE.Mesh(g(new THREE.BoxGeometry(0.06, 0.1, 2.6)), dark)
    sill.position.set(s * (HALF_W - 0.02), 0.34, 0)
    root.add(sill)
    const mirror = new THREE.Mesh(g(new THREE.BoxGeometry(0.2, 0.1, 0.12)), paint)
    mirror.position.set(s * (HALF_W + 0.08), 1.05, 0.95)
    root.add(mirror)
  }
  const grille = new THREE.Mesh(g(new THREE.BoxGeometry(1.1, 0.16, 0.04)), dark)
  grille.position.set(0, 0.5, L / 2 + 0.03)
  root.add(grille)
  const rearDiff = new THREE.Mesh(g(new THREE.BoxGeometry(1.5, 0.14, 0.05)), dark)
  rearDiff.position.set(0, 0.36, -L / 2 - 0.03)
  root.add(rearDiff)

  // lights
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(g(new THREE.BoxGeometry(0.42, 0.08, 0.05)), headL)
    hl.position.set(s * 0.6, 0.72, L / 2 - 0.02)
    hl.rotation.x = -0.2
    root.add(hl)
    const tl = new THREE.Mesh(g(new THREE.BoxGeometry(0.5, 0.07, 0.05)), tailL)
    tl.position.set(s * 0.56, 0.84, -L / 2 + 0.01)
    root.add(tl)
  }

  // COLOR METAL wordmark on both doors
  const logoMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 })
  mats.push(logoMat)
  const tex = logoTexture(() => (logoMat.needsUpdate = true))
  logoMat.map = tex
  for (const s of [-1, 1]) {
    const decal = new THREE.Mesh(g(new THREE.PlaneGeometry(1.0, 0.39)), logoMat)
    decal.position.set(s * (HALF_W + 0.015), 0.78, -0.2)
    decal.rotation.y = (s * Math.PI) / 2
    root.add(decal)
  }

  // wheels: steer pivot (front) → spin group → tyre + rim
  const tyreG = g(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28).rotateZ(Math.PI / 2))
  const rimG = g(new THREE.CylinderGeometry(0.23, 0.23, 0.25, 20).rotateZ(Math.PI / 2))
  const spokeG = g(new THREE.BoxGeometry(0.255, 0.04, 0.4))
  const wheels: { steer: THREE.Group; spin: THREE.Group; front: boolean }[] = []
  for (const [x, z] of [
    [HALF_W - 0.12, 1.42],
    [-(HALF_W - 0.12), 1.42],
    [HALF_W - 0.12, -1.42],
    [-(HALF_W - 0.12), -1.42],
  ]) {
    const steer = new THREE.Group()
    steer.position.set(x, 0.34, z)
    const spin = new THREE.Group()
    spin.add(new THREE.Mesh(tyreG, rubber))
    spin.add(new THREE.Mesh(rimG, brass))
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(spokeG, dark)
      sp.rotation.x = (k * Math.PI) / 3
      spin.add(sp)
    }
    steer.add(spin)
    root.add(steer)
    wheels.push({ steer, spin, front: z > 0 })
  }
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.castShadow = true
      m.receiveShadow = true
    }
  })

  return {
    root,
    update(steer, spin, braking) {
      for (const w of wheels) {
        if (w.front) w.steer.rotation.y = steer
        w.spin.rotation.x = spin
      }
      tailL.emissiveIntensity = braking ? 2.2 : 0.35
    },
    dispose() {
      geos.forEach((x) => x.dispose())
      mats.forEach((m) => m.dispose())
      tex.dispose()
    },
  }
}
