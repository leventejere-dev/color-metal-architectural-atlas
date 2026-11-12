/**
 * Drinking-water pavilion ("forrásház") in Parcul Central, Miercurea Ciuc
 * (OSM way 1223823422, round building ≈ 4 m across, height tag 3 m; built
 * 2022–23).
 *
 * Modelling specification (real metres, origin = centre of the round OSM
 * outline at ground; the pavilion is rotationally symmetric, +X = OSM bearing
 * 71.6° only as a reference):
 *  - Six glulam Y-columns on a ring of r ≈ 2.2 m (photo 01 as built; renderings
 *    02–03): dark steel pedestal ≈ 1.15 m, short trunk, two curved arms rising
 *    to the timber ring beam at ≈ 2.75 m, so that neighbouring arms frame
 *    pointed openings between the columns.
 *  - Eaves at ≈ 3.0 m (OSM height 3): dark metal eaves band r ≈ 2.65 m with a
 *    downward pointed scallop at each of the six rib feet (photo 01).
 *  - Bell-shaped dome, base r ≈ 2.5 m: lower two thirds in red beaver-tail clay
 *    tiles between six dark metal ribs; upper collar in standing-seam metal,
 *    from which the six ribs rise into an ogee-pointed open lantern with a
 *    louvred core and a small finial, top ≈ 7.0 m (photo 01 proportions:
 *    eave height ≈ 0.57 × eave diameter).
 *  - Decorative steel gates with arched vertical bars in the six bays, round
 *    paved floor with the central drinking-water post (renderings 02–03).
 *  - COLOR METAL scope: TECU Oxid pre-oxidised copper (register 2023) on the
 *    ribs, eaves band, collar and lantern — as photographed in Oct 2023 (dark
 *    brown: palette 'copperBrown', toned down); the tiles are clay as built.
 * Approximations: absolute size (OSM outline 4 m vs ≈ 20 m² in the press;
 * model ≈ 5.3 m over the eaves), Y-arm curvature, gate ornament simplified to
 * bars and two sweeping curves per bay, lantern profile interpreted from one
 * photograph and the renderings.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, helm, opening, frameShape } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const N_COL = 6
const RC = 2.32 // column ring
const PED_H = 1.2 // steel pedestal
const FORK = 1.9 // Y fork height
const RING_Y = 2.92 // underside of ring beam
const EAVE_Y0 = 3.1
const EAVE_Y1 = 3.45
const R_BAND = 2.66
const PHASE = 0 // first column on +X

/** Lathe with UVs in metres (u along the circumference at the local radius, v along the profile). */
function latheMetric(profile: [number, number][], seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg)
  const arc: number[] = [0]
  for (let j = 1; j < profile.length; j++) arc.push(arc[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]))
  const uv = g.attributes.uv as THREE.BufferAttribute
  const np = profile.length
  for (let i = 0; i <= seg; i++) {
    for (let j = 0; j < np; j++) {
      const idx = i * np + j
      uv.setXY(idx, (i / seg) * Math.PI * 2 * profile[j][0], arc[j])
    }
  }
  return g
}

/** Flat annulus / band between radii and heights, built from four single-face lathes (crisp corners). */
function ringSolid(b: Builder, key: string, rIn: number, rOut: number, y0: number, y1: number, seg = 48) {
  const L = (p: [number, number][]) => b.add(key, new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), seg))
  L([[rIn, y0], [rOut, y0]])
  L([[rOut, y0], [rOut, y1]])
  L([[rOut, y1], [rIn, y1]])
  L([[rIn, y1], [rIn, y0]])
}

const polar = (a: number, r: number, y: number) => V(Math.cos(a) * r, y, Math.sin(a) * r)

/** Beam between two points with a right-handed basis (w across, h along `up`). */
function beam(b: Builder, key: string, p: THREE.Vector3, q: THREE.Vector3, w: number, h: number, up = V(0, 1, 0)) {
  const d = V().subVectors(q, p)
  const L = d.length()
  if (L < 1e-5) return
  d.normalize()
  let side = V().crossVectors(up, d)
  if (side.lengthSq() < 1e-6) side = V().crossVectors(V(1, 0, 0), d)
  side.normalize()
  const up2 = V().crossVectors(d, side).normalize()
  const m = new THREE.Matrix4().makeBasis(side, up2, d).setPosition(V().addVectors(p, q).multiplyScalar(0.5))
  b.add(key, metricBox(w, h, L), m)
}

function build(): Builder {
  const b = new Builder()
  const colA = (k: number) => PHASE + (k / N_COL) * Math.PI * 2

  /* ---------------- paved round floor + drinking-water post ---------------- */
  ringSolid(b, 'pavPaving', 0, 3.15, 0, 0.1, 48)
  ringSolid(b, 'pavPavingDark', 2.55, 2.75, 0.1, 0.115, 48)
  ringSolid(b, 'pavPavingDark', 0.45, 0.85, 0.1, 0.115, 32)
  b.add('pavSteel', new THREE.CylinderGeometry(0.09, 0.11, 1.0, 12), mat(0, 0.6, 0))
  b.add('pavSteel', new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), mat(0, 1.12, 0))
  b.add('black', new THREE.CircleGeometry(0.42, 24), mat(0, 0.112, 0, 0, -Math.PI / 2))

  /* ---------------- six Y-columns ---------------- */
  for (let k = 0; k < N_COL; k++) {
    const a = colA(k)
    const c = polar(a, RC, 0)
    // dark steel pedestal with cap
    b.add('pavSteel', metricBox(0.36, PED_H, 0.36), mat(c.x, 0.1 + PED_H / 2, c.z, -a))
    b.add('pavSteel', metricBox(0.46, 0.08, 0.46), mat(c.x, 0.1 + PED_H + 0.04, c.z, -a))
    // timber trunk
    b.add('pavTimber', metricBox(0.3, FORK - PED_H - 0.12, 0.26), mat(c.x, 0.1 + PED_H + 0.08 + (FORK - PED_H - 0.12) / 2, c.z, -a))
    // two curved arms (quadratic curve from the fork to the eaves), almost meeting mid-bay
    for (const s of [-1, 1]) {
      const p0 = polar(a, RC, FORK)
      const p2 = polar(a + s * 26.5 * D2R, RC + 0.12, RING_Y)
      const p1 = polar(a + s * 6 * D2R, RC + 0.03, FORK + 0.7)
      const n = 6
      let prev = p0
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const q = p0.clone().multiplyScalar((1 - t) * (1 - t)).add(p1.clone().multiplyScalar(2 * t * (1 - t))).add(p2.clone().multiplyScalar(t * t))
        const radial = V(Math.cos(a), 0, Math.sin(a))
        beam(b, 'pavTimber', prev, q, 0.2 - 0.04 * t, 0.24, radial)
        prev = q
      }
    }
  }

  /* ---------------- ring beam, soffit, TECU Oxid eaves band ---------------- */
  ringSolid(b, 'pavTimber', 2.1, 2.5, RING_Y, EAVE_Y0, 48)
  ringSolid(b, 'pavSoffit', 2.3, R_BAND - 0.02, EAVE_Y0 - 0.03, EAVE_Y0, 48)
  ringSolid(b, 'pavTecu', R_BAND - 0.08, R_BAND, EAVE_Y0, EAVE_Y1, 64)
  // brim at the top of the band
  ringSolid(b, 'pavOxid', 2.3, R_BAND + 0.06, EAVE_Y1 - 0.04, EAVE_Y1 + 0.01, 64)
  // pointed scallops under the rib feet
  for (let k = 0; k < N_COL; k++) {
    const a = colA(k)
    const tri = new THREE.Shape([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0, -0.36)])
    const p = polar(a, R_BAND - 0.02, EAVE_Y0 + 0.02)
    b.add('pavOxid', extrude(tri, 0.07), mat(p.x, p.y, p.z, Math.PI / 2 - a))
  }

  /* ---------------- dome: clay tiles + TECU Oxid collar ---------------- */
  const tileProf: [number, number][] = [
    [2.36, EAVE_Y1],
    [2.44, 3.6],
    [2.48, 3.85],
    [2.44, 4.08],
    [2.32, 4.3],
    [2.14, 4.5],
    [1.95, 4.64],
  ]
  b.add('tileRed', latheMetric(tileProf, 48))
  const collarProf: [number, number][] = [
    [1.99, 4.61],
    [1.72, 4.76],
    [1.46, 4.9],
    [1.26, 5.03],
    [1.12, 5.15],
    [1.07, 5.24],
  ]
  // standing seams (≈ 0.5 m apart at the base of the collar)
  b.add('pavTecu', latheMetric(collarProf, 48))
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + 0.13
    const radial = V(Math.cos(a), 0, Math.sin(a))
    for (let i = 0; i < collarProf.length - 1; i++) {
      const [r0, y0] = collarProf[i]
      const [r1, y1] = collarProf[i + 1]
      beam(b, 'pavOxid', polar(a, r0 + 0.015, y0), polar(a, r1 + 0.015, y1), 0.035, 0.035, radial)
    }
  }
  ringSolid(b, 'pavOxid', 1.9, 2.04, 4.6, 4.68, 48)

  /* ---------------- lantern: closed hexagonal ogee bell with louvred pointed openings ---------------- */
  const lantern: [number, number][] = [
    [1.07, 5.24],
    [1.02, 5.42],
    [0.92, 5.68],
    [0.78, 5.96],
    [0.62, 6.22],
    [0.46, 6.45],
    [0.3, 6.64],
    [0.14, 6.78],
    [0.02, 6.84],
  ]
  helm(b, 'pavTecu', { n: N_COL, phase: PHASE, stations: lantern })
  for (let k = 0; k < N_COL; k++) {
    // face centre direction (between two ribs)
    const a = colA(k) + Math.PI / N_COL
    const cs = Math.cos(Math.PI / N_COL)
    const pA = polar(a, 1.0 * cs, 5.36)
    const pB = polar(a, 0.44 * cs, 6.46)
    const tilt = Math.atan2(1.0 * cs - 0.44 * cs, 6.46 - 5.36) // lean back from vertical
    const len = pA.distanceTo(pB)
    const m = new THREE.Matrix4().multiplyMatrices(mat(pA.x, pA.y, pA.z, Math.PI / 2 - a), mat(0, 0, 0.06, 0, -tilt))
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.5, len, 0, 0, 10))), m)
    b.add('pavOxid', extrude(frameShape('pointed', 0.5, len, 0.05, 0, 0), 0.05), m)
    for (let i = 1; i < 9; i++) {
      const v = (i / 9) * (len - 0.3)
      b.add('pavLouvre', metricBox(0.48, 0.035, 0.05), new THREE.Matrix4().multiplyMatrices(m, mat(0, v, 0.02, 0, 0.5)))
    }
  }

  /* ---------------- six wide ribs over the dome and the lantern corners ---------------- */
  const ribPath: [number, number][] = [
    ...tileProf.map(([r, y]) => [r + 0.06, y] as [number, number]),
    ...collarProf.slice(1).map(([r, y]) => [r + 0.06, y] as [number, number]),
    ...lantern.slice(1, -1).map(([r, y]) => [r + 0.05, y] as [number, number]),
  ]
  for (let k = 0; k < N_COL; k++) {
    const a = colA(k)
    const radial = V(Math.cos(a), 0, Math.sin(a))
    for (let i = 0; i < ribPath.length - 1; i++) {
      const [r0, y0] = ribPath[i]
      const [r1, y1] = ribPath[i + 1]
      const w = Math.max(0.12, Math.min(0.3, r0 * 0.14))
      beam(b, 'pavOxid', polar(a, r0, y0), polar(a, r1, y1), w, 0.1, radial)
      if (w > 0.2) beam(b, 'pavOxid', polar(a, r0 + 0.06, y0), polar(a, r1 + 0.06, y1), 0.04, 0.05, radial)
    }
    // rib foot over the scallop
    beam(b, 'pavOxid', polar(a, R_BAND + 0.03, EAVE_Y0 + 0.05), polar(a, 2.44, EAVE_Y1 + 0.05), 0.3, 0.1, radial)
  }
  // finial
  b.add('pavOxid', new THREE.SphereGeometry(0.08, 12, 8), mat(0, 6.9, 0))
  b.rod('pavOxid', V(0, 6.8, 0), V(0, 7.15, 0), 0.025, 6)

  /* ---------------- decorative steel gates in the six bays ---------------- */
  for (let k = 0; k < N_COL; k++) {
    const a0 = colA(k) + 7 * D2R
    const a1 = colA(k + 1) - 7 * D2R
    const R = RC - 0.02
    const nb = 13
    const top = (t: number) => 1.95 + 0.95 * Math.pow(Math.sin(Math.PI * t), 0.6) // follows the Y arms
    for (let i = 0; i <= nb; i++) {
      const t = i / nb
      const a = a0 + (a1 - a0) * t
      const p = polar(a, R, 0)
      const h = top(t)
      b.add('iron', metricBox(0.025, h - 0.12, 0.025), mat(p.x, 0.12 + (h - 0.12) / 2, p.z))
    }
    // bottom rail + arched top rail + two sweeping curves
    const pts = (f: (t: number) => number, y0 = 0) => Array.from({ length: 15 }, (_, i) => {
      const t = i / 14
      const a = a0 + (a1 - a0) * t
      return polar(a, R, y0 + f(t))
    })
    const rail = (ps: THREE.Vector3[]) => {
      for (let i = 0; i < ps.length - 1; i++) beam(b, 'iron', ps[i], ps[i + 1], 0.03, 0.035, V(0, 1, 0))
    }
    rail(pts(() => 0.16))
    rail(pts((t) => top(t)))
    rail(pts((t) => 0.55 + 1.1 * t * t))
    rail(pts((t) => 0.55 + 1.1 * (1 - t) * (1 - t)))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [0, 5.0, 1.6],
  materials: (base) => ({
    // TECU Oxid details (ribs, scallops, louvres): the palette's oxidised copper without the sheet texture
    pavOxid: (() => {
      const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
      m.map = null
      m.roughnessMap = null
      m.color.set('#5a3b2c')
      m.metalness = 0.75
      m.roughness = 0.55
      return m
    })(),
    // TECU Oxid sheet surfaces: the palette's oxidised copper, toned down to the matt dark brown of photo 01
    pavTecu: (() => {
      const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
      m.color.set('#a39890')
      m.roughness = 0.56
      m.metalness = 0.8
      return m
    })(),
    pavLouvre: new THREE.MeshStandardMaterial({ color: '#8a7a68', roughness: 0.6, metalness: 0.4 }),
    pavTimber: new THREE.MeshStandardMaterial({ color: '#9e8b72', roughness: 0.78 }),
    pavSoffit: new THREE.MeshStandardMaterial({ color: '#7b6650', roughness: 0.8 }),
    pavSteel: new THREE.MeshStandardMaterial({ color: '#3a3c3f', roughness: 0.55, metalness: 0.45 }),
    pavPaving: new THREE.MeshStandardMaterial({ color: '#c9c6bf', roughness: 0.92 }),
    pavPavingDark: new THREE.MeshStandardMaterial({ color: '#9b9891', roughness: 0.92 }),
  }),
  notes:
    'Round drinking-water pavilion: six glulam Y-columns, clay-tile bell dome with TECU Oxid copper ribs, eaves band, collar and lantern (as built 2023); size and lantern profile estimated from one photograph and the design renderings.',
}
export default model
