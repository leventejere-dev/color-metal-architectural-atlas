/**
 * A lifelike 1.76 m pedestrian for the walk-around mode, built procedurally (no
 * external assets): sculpted torso and shoulders, neck, head with face and hair,
 * jointed arms with hands and fingers, jointed legs, sneakers. He wears a
 * graphite COLOR METAL work jacket with the logo on the back (rendered from the
 * official logo file), jeans and sneakers. Faces +Z.
 * `pose(phase, gait, t)` drives the walk cycle (knee/elbow bend, counter-swing,
 * hip sway, torso counter-rotation, bob) and an idle stance (breathing, glances).
 */
import * as THREE from 'three'

const C = {
  jacket: '#2f3439',
  jacketTrim: '#23272b',
  zip: '#b99a5e',
  shirt: '#e8e4dc',
  jeans: '#3d4b5f',
  shoe: '#e9e6df',
  shoeTrim: '#5a4636',
  sole: '#c9c3b8',
  skin: '#d6ae93',
  lips: '#b98270',
  hair: '#3a2a20',
  eye: '#2a2522',
}

function lathe(profile: [number, number][], seg = 28) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)),
    seg,
  )
}

/** tapered limb hanging down from its joint (joint at y = 0), rounded at both ends */
function limb(r0: number, r1: number, len: number, mid = 0) {
  return lathe(
    [
      [0.0005, -len],
      [r1 * 0.75, -len + 0.006],
      [r1, -len + 0.03],
      [(r0 + r1) / 2 + 0.004 + mid, -len * 0.55],
      [r0 + mid * 0.5, -len * 0.2],
      [r0, -0.035],
      [r0 * 0.7, -0.01],
      [0.0005, 0],
    ],
    18,
  )
}

/** Torso radius (x) at chest-local height y — shared by the torso mesh and the back logo patch. */
const TORSO: [number, number][] = [
  [0.164, -0.08],
  [0.152, 0],
  [0.15, 0.08],
  [0.16, 0.18],
  [0.178, 0.3],
  [0.194, 0.4],
  [0.2, 0.46],
  [0.186, 0.51],
  [0.15, 0.545],
  [0.1, 0.565],
  [0.06, 0.578],
]
const DEPTH = 0.64 // z / x ratio of the torso cross-section
function torsoR(y: number) {
  for (let i = 1; i < TORSO.length; i++) {
    const [r1, y1] = TORSO[i]
    const [r0, y0] = TORSO[i - 1]
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)
  }
  return TORSO[TORSO.length - 1][0]
}

/** COLOR METAL wordmark, stacked ("COLOR" over "METAL"), on a transparent canvas. */
function logoTexture(onReady: () => void) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 400
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  fetch('color-metal-logo.svg')
    .then((r) => r.text())
    .then((svg) => {
      // keep the gold COLOR, lighten the grey METAL for contrast on the graphite jacket
      const light = svg.replace(/fill="(?!#c1a163)#[0-9a-fA-F]{6}"/g, 'fill="#e9e6e0"')
      const img = new Image()
      img.onload = () => {
        const W = 2148
        const H = 190
        const full = document.createElement('canvas')
        full.width = W
        full.height = H
        const fctx = full.getContext('2d')!
        fctx.drawImage(img, 0, 0, W, H)
        // find the gap between the two words (empty columns around the middle)
        const data = fctx.getImageData(0, 0, W, H).data
        const empty = (x: number) => {
          for (let y = 0; y < H; y += 2) if (data[(y * W + x) * 4 + 3] > 20) return false
          return true
        }
        let best = W / 2
        let bestRun = 0
        let run = 0
        for (let x = Math.floor(W * 0.3); x < W * 0.7; x++) {
          if (empty(x)) {
            run++
            if (run > bestRun) {
              bestRun = run
              best = x - run / 2
            }
          } else run = 0
        }
        const ctx = c.getContext('2d')!
        ctx.clearRect(0, 0, c.width, c.height)
        const w1 = best
        const w2 = W - best
        const scale = Math.min(940 / Math.max(w1, w2), 1)
        const lineH = H * scale
        ctx.drawImage(full, 0, 0, w1, H, (c.width - w1 * scale) / 2, 20, w1 * scale, lineH)
        ctx.drawImage(full, best, 0, w2, H, (c.width - w2 * scale) / 2, 40 + lineH, w2 * scale, lineH)
        // thin brass rule under the wordmark
        ctx.fillStyle = '#c1a163'
        ctx.fillRect(c.width * 0.3, 60 + lineH * 2, c.width * 0.4, 8)
        t.needsUpdate = true
        onReady()
      }
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(light)
    })
    .catch(() => {})
  return t
}

/** Curved patch on the back of the torso between chest-local heights y0..y1, spanning ±halfAngle. */
function backPatch(y0: number, y1: number, halfAngle: number) {
  const nu = 24
  const nv = 8
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= nv; j++) {
    const y = y0 + ((y1 - y0) * j) / nv
    const r = torsoR(y) + 0.004
    for (let i = 0; i <= nu; i++) {
      // u = 0 at the viewer's left when seen from behind (+x side)
      const a = -Math.PI / 2 + halfAngle - (2 * halfAngle * i) / nu
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r * DEPTH - 0.003)
      uv.push(i / nu, j / nv)
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i
      const b = a + nu + 1
      idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export interface Figure {
  root: THREE.Group
  pose: (phase: number, gait: number, t: number) => void
  dispose: () => void
}

export function makeFigure(): Figure {
  const rough: Partial<Record<keyof typeof C, number>> = { skin: 0.55, hair: 0.8, zip: 0.35, eye: 0.3, shoe: 0.6, jeans: 0.9 }
  const mats = Object.fromEntries(
    Object.entries(C).map(([k, color]) => [k, new THREE.MeshStandardMaterial({ color, roughness: rough[k as keyof typeof C] ?? 0.78, metalness: k === 'zip' ? 0.8 : 0 })]),
  ) as Record<keyof typeof C, THREE.MeshStandardMaterial>
  const geos: THREE.BufferGeometry[] = []
  const extra: THREE.Material[] = []
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => {
    geos.push(g)
    const o = new THREE.Mesh(g, m)
    o.castShadow = cast
    return o
  }

  const root = new THREE.Group()
  root.name = 'walker'
  const body = new THREE.Group()
  root.add(body)

  /* ---- pelvis (jeans) ---- */
  const pelvis = new THREE.Group()
  pelvis.position.y = 0.9
  body.add(pelvis)
  const hipGeo = lathe([
    [0.0005, -0.1],
    [0.13, -0.095],
    [0.165, -0.05],
    [0.172, 0.02],
    [0.162, 0.08],
  ])
  hipGeo.scale(1, 1, 0.7)
  pelvis.add(mesh(hipGeo, mats.jeans))

  /* ---- torso: jacket ---- */
  const chest = new THREE.Group()
  chest.position.y = 0.1
  pelvis.add(chest)
  const torsoGeo = lathe(TORSO, 36)
  torsoGeo.scale(1, 1, DEPTH)
  chest.add(mesh(torsoGeo, mats.jacket))
  // jacket hem band and zip
  const hemGeo = new THREE.CylinderGeometry(0.168, 0.168, 0.05, 32, 1, true)
  hemGeo.scale(1, 1, DEPTH * 1.005)
  const hem = mesh(hemGeo, mats.jacketTrim)
  hem.position.y = -0.055
  chest.add(hem)
  const zip = mesh(new THREE.BoxGeometry(0.012, 0.6, 0.006), mats.zip, false)
  zip.position.set(0, 0.24, torsoR(0.24) * DEPTH + 0.002)
  zip.rotation.x = -0.06
  chest.add(zip)
  // stand-up collar
  const collar = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 24, 1, true), mats.jacketTrim)
  collar.position.y = 0.575
  chest.add(collar)
  // COLOR METAL logo on the back
  const logoMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 })
  logoMat.map = logoTexture(() => (logoMat.needsUpdate = true))
  extra.push(logoMat)
  chest.add(mesh(backPatch(0.26, 0.47, 0.92), logoMat, false))

  /* ---- neck & head ---- */
  const neck = mesh(new THREE.CylinderGeometry(0.047, 0.054, 0.1, 16), mats.skin)
  neck.position.y = 0.6
  chest.add(neck)
  const headG = new THREE.Group()
  headG.position.y = 0.735
  chest.add(headG)
  const skull = new THREE.SphereGeometry(0.1, 32, 24)
  skull.scale(0.85, 1.08, 0.98)
  headG.add(mesh(skull, mats.skin))
  const jaw = new THREE.SphereGeometry(0.074, 24, 16)
  jaw.scale(0.92, 0.82, 1)
  const jawM = mesh(jaw, mats.skin)
  jawM.position.set(0, -0.048, 0.014)
  headG.add(jawM)
  const noseM = mesh(new THREE.ConeGeometry(0.013, 0.036, 10).rotateX(Math.PI / 2 - 0.25), mats.skin)
  noseM.position.set(0, -0.006, 0.099)
  headG.add(noseM)
  for (const s of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.022, 12, 10)
    ear.scale(0.42, 1, 0.78)
    const e = mesh(ear, mats.skin)
    e.position.set(0.086 * s, -0.004, -0.004)
    headG.add(e)
    const eye = mesh(new THREE.SphereGeometry(0.0085, 10, 8), mats.eye, false)
    eye.position.set(0.032 * s, 0.014, 0.088)
    headG.add(eye)
    const brow = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), mats.hair, false)
    brow.position.set(0.032 * s, 0.033, 0.091)
    brow.rotation.z = -0.12 * s
    headG.add(brow)
  }
  const mouth = mesh(new THREE.BoxGeometry(0.034, 0.006, 0.006), mats.lips, false)
  mouth.position.set(0, -0.052, 0.083)
  headG.add(mouth)
  const hairCap = new THREE.SphereGeometry(0.107, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)
  hairCap.scale(0.9, 1.08, 1.04)
  const hairM = mesh(hairCap, mats.hair)
  hairM.position.set(0, 0.014, -0.01)
  hairM.rotation.x = -0.22
  headG.add(hairM)
  const fringe = new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)
  fringe.scale(1.35, 0.45, 0.9)
  const fringeM = mesh(fringe, mats.hair)
  fringeM.position.set(0.005, 0.07, 0.05)
  fringeM.rotation.x = 0.35
  headG.add(fringeM)

  /* ---- arms ---- */
  const arm = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(0.205 * side, 0.475, 0)
    chest.add(shoulder)
    const cap = mesh(new THREE.SphereGeometry(0.062, 16, 12), mats.jacket)
    cap.scale.set(1, 0.9, 0.95)
    shoulder.add(cap)
    const upper = mesh(limb(0.056, 0.046, 0.3, 0.004), mats.jacket)
    upper.rotation.z = 0.05 * side
    shoulder.add(upper)
    const elbow = new THREE.Group()
    elbow.position.set(0.016 * side, -0.29, 0)
    shoulder.add(elbow)
    elbow.add(mesh(new THREE.SphereGeometry(0.047, 14, 10), mats.jacket))
    elbow.add(mesh(limb(0.046, 0.039, 0.25), mats.jacket))
    const cuff = mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.03, 14), mats.jacketTrim)
    cuff.position.y = -0.245
    elbow.add(cuff)
    // hand: palm, four fingers, thumb (thumb towards the body's front)
    const hand = new THREE.Group()
    hand.position.y = -0.27
    elbow.add(hand)
    const palm = mesh(new THREE.BoxGeometry(0.028, 0.085, 0.075), mats.skin)
    palm.position.y = -0.04
    hand.add(palm)
    const fingerGeo = new THREE.CapsuleGeometry(0.0125, 0.06, 4, 8)
    for (let f = 0; f < 4; f++) {
      const fm = mesh(fingerGeo, mats.skin)
      fm.position.set(0, -0.115 + Math.abs(f - 1.5) * 0.006, -0.027 + f * 0.018)
      fm.rotation.x = 0.1
      hand.add(fm)
    }
    const thumb = mesh(new THREE.CapsuleGeometry(0.0135, 0.04, 4, 8), mats.skin)
    thumb.position.set(-0.012 * side, -0.045, 0.042)
    thumb.rotation.set(0.7, 0, -0.35 * side)
    hand.add(thumb)
    return { shoulder, elbow }
  }
  const armL = arm(-1)
  const armR = arm(1)

  /* ---- legs: jeans and sneakers ---- */
  const leg = (side: number) => {
    const hip = new THREE.Group()
    hip.position.set(0.093 * side, -0.02, 0)
    pelvis.add(hip)
    hip.add(mesh(new THREE.SphereGeometry(0.082, 16, 12), mats.jeans))
    hip.add(mesh(limb(0.08, 0.058, 0.43, 0.006), mats.jeans))
    const knee = new THREE.Group()
    knee.position.y = -0.42
    hip.add(knee)
    knee.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), mats.jeans))
    knee.add(mesh(limb(0.058, 0.046, 0.41, 0.004), mats.jeans))
    const ankle = new THREE.Group()
    ankle.position.y = -0.41
    knee.add(ankle)
    const upperGeo = new THREE.CapsuleGeometry(0.046, 0.17, 6, 12).rotateX(Math.PI / 2)
    upperGeo.scale(1.05, 0.78, 1)
    const up = mesh(upperGeo, mats.shoe)
    up.position.set(0, -0.035, 0.052)
    ankle.add(up)
    const trim = mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), mats.shoeTrim)
    trim.position.set(0, -0.05, 0.045)
    ankle.add(trim)
    const sole = mesh(new THREE.BoxGeometry(0.102, 0.022, 0.272), mats.sole)
    sole.position.set(0, -0.072, 0.054)
    ankle.add(sole)
    return { hip, knee, ankle }
  }
  const legL = leg(-1)
  const legR = leg(1)

  for (const [a, s] of [
    [armL, -1],
    [armR, 1],
  ] as const) {
    a.shoulder.rotation.z = 0.08 * s
    a.elbow.rotation.x = -0.2
  }

  const pose = (phase: number, gait: number, t: number) => {
    const sw = Math.sin(phase)
    const cw = Math.cos(phase)
    const g = gait
    const idle = 1 - g
    const legPose = (l: typeof legL, ph: number) => {
      const s = Math.sin(ph)
      const c = Math.cos(ph)
      l.hip.rotation.x = -s * 0.46 * g
      l.knee.rotation.x = Math.max(0, c) * 0.9 * g + 0.04
      l.ankle.rotation.x = (-Math.max(0, -s) * 0.28 + Math.max(0, s) * 0.16) * g
    }
    legPose(legL, phase)
    legPose(legR, phase + Math.PI)
    armL.shoulder.rotation.x = sw * 0.42 * g
    armR.shoulder.rotation.x = -sw * 0.42 * g
    armL.elbow.rotation.x = -0.2 - Math.max(0, sw) * 0.5 * g
    armR.elbow.rotation.x = -0.2 - Math.max(0, -sw) * 0.5 * g
    pelvis.rotation.y = sw * 0.08 * g
    pelvis.rotation.z = cw * 0.025 * g
    chest.rotation.y = -sw * 0.14 * g
    chest.rotation.x = 0.05 * g
    // idle: breathing and slow glances around the building
    headG.rotation.y = sw * 0.06 * g + Math.sin(t * 0.35) * 0.45 * idle * Math.max(0, Math.sin(t * 0.13))
    headG.rotation.x = Math.sin(t * 0.21) * 0.05 * idle
    body.position.y = -Math.abs(cw) * 0.03 * g + 0.015 * g
    chest.scale.setScalar(1 + Math.sin(t * 1.6) * 0.006 * idle)
  }
  pose(0, 0, 0)

  return {
    root,
    pose,
    dispose() {
      geos.forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => m.dispose())
      extra.forEach((m) => {
        ;(m as THREE.MeshStandardMaterial).map?.dispose()
        m.dispose()
      })
    },
  }
}
