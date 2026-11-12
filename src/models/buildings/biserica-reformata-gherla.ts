/**
 * Reformed Church, Gherla (Szamosújvár) — OSM way 263616472, built 1862–1877.
 *
 * TIER C — one reference photograph only (01: the tower front seen from the
 * street, from the left). Size and plan from the OSM outline (25.9 × 12.4 m,
 * long axis 122.7°, flat front at −X, polygonal east end at +X).
 *  - Front: classicist frontispiece the full width of the church (12.4 m):
 *    light-ochre pilaster strips framing white panels, three tall round-arched
 *    windows at gallery level, arched door in the centre, string courses and a
 *    main cornice at ~12 m (the nave eaves, visible on the left of the photo,
 *    meet the front at this height).
 *  - Above the cornice: corner piers with urn finials (~16.4 m) and lower
 *    attic panels with small arched windows either side of the tower.
 *  - Tower built into the centre of the front (flush, 5.4 m wide): middle stage
 *    with an arched window and dated plaque, dentilled cornice at ~17 m;
 *    narrower belfry with arched louvred openings and a panel–oculus–panel
 *    frieze, cornice at ~22.7 m; square bell-cast helm and tall pyramidal
 *    spire to ~31.5 m, ball finial.
 *  - Spire shown in silver-grey sheet metal as photographed (the photo sits in
 *    COLOR METAL's copper/KME reference selection; the exact product and which
 *    surfaces it covers are not documented).
 *  - Nave: plain gable roof (~45°), apse polygon following the OSM outline.
 * Approximations: everything not visible in the photo (side and east
 * elevations, window rhythm, roof pitch and covering) is interpreted; heights
 * are measured from a single perspective photo (±10–15 %).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, lathe, extrude, opening, frameShape, helm } from '../kit'
import type { ModelModule } from '../registry'

const X0 = -12.94 // front plane (OSM)
const HZ = 6.19 // half width (OSM)
const EAVE = 12.0
const PITCH = 45
const RIDGE = EAVE + HZ * Math.tan((PITCH * Math.PI) / 180)
const TW = { hw: 2.7, x0: X0, x1: X0 + 5.4 } // tower (front flush)
const TXC = (TW.x0 + TW.x1) / 2
const BEL = { hw: 2.3, y0: 17.3, y1: 22.7 }
/** apse polygon from the OSM outline (south → east → north) */
const APSE: [number, number][] = [
  [8.0, 6.19],
  [11.2, 4.6],
  [12.94, 1.6],
  [12.94, -1.6],
  [11.2, -4.6],
  [8.0, -6.19],
]
const APEX_X = 6.75

const on = (m: THREE.Matrix4, l: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(m, l)
const FRONT = (z: number, x = X0) => mat(x, 0, z, -Math.PI / 2) // local u along the front: +u → −z

function archWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, glass = 'glassC') {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), on(m, mat(0, 0, 0.04)))
  b.add('grOchre', extrude(frameShape('round', w, h, 0.16, 0, y0), 0.08), on(m, mat(0, 0, 0.01)))
}

function urn(b: Builder, x: number, y: number, z: number, s: number) {
  b.add('grOchre', lathe([[0, 0], [0.3, 0], [0.3, 0.12], [0.16, 0.22], [0.27, 0.5], [0.22, 0.75], [0.08, 0.95], [0.03, 1.15], [0, 1.2]].map(([r, h]) => [r * s, h * s] as [number, number]), 12), mat(x, y, z))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave ---------------- */
  const xa = X0
  const xb = APSE[0][0]
  b.block('grWhite', xb - xa, EAVE, 2 * HZ, (xa + xb) / 2, 0, 0)
  b.block('grOchre', xb - xa + 0.2, 0.9, 2 * HZ + 0.2, (xa + xb) / 2, 0, 0)
  b.block('grOchre', xb - xa, 0.55, 2 * HZ + 0.5, (xa + xb) / 2, EAVE - 0.55, 0)
  // apse walls (OSM polygon) + plinth + cornice
  {
    const ring = (y: number, grow = 0) =>
      [[xb - 0.4, HZ] as [number, number], ...APSE, [xb - 0.4, -HZ] as [number, number]].map(([x, z]) => {
        const d = Math.hypot(x - 7.5, z) || 1
        return V(x + ((x - 7.5) / d) * grow * (x > xb - 0.1 ? 1 : 0), y, z + (z / d) * grow)
      })
    const loftRing = (y0: number, y1: number, key: string, grow = 0) => {
      const r0 = ring(y0, grow)
      const r1 = ring(y1, grow)
      for (let i = 0; i < r0.length - 1; i++) {
        facet(b, key, [r0[i], r0[i + 1], r1[i + 1], r1[i]], { hint: V(r0[i].x - 7.5, 0, r0[i].z) })
      }
      const top = ring(y1, grow)
      facet(b, key, top, { hint: V(0, 1, 0) })
    }
    loftRing(0, EAVE, 'grWhite')
    loftRing(0, 0.9, 'grOchre', 0.1)
    loftRing(EAVE - 0.55, EAVE, 'grOchre', 0.25)
  }

  /* ---------------- roof (tiles assumed: covering not photographed) ---------------- */
  {
    const ov = 0.5
    const t = Math.tan((PITCH * Math.PI) / 180)
    const ey = EAVE - ov * t
    const hz = HZ + ov
    const apex = V(APEX_X, RIDGE, 0)
    const xf = X0 + 0.5
    facet(b, 'grRoof', [V(xf, ey, hz), V(xb, ey, hz), apex, V(xf, RIDGE, 0)], { thickness: 0.1 })
    facet(b, 'grRoof', [V(xb, ey, -hz), V(xf, ey, -hz), V(xf, RIDGE, 0), apex], { thickness: 0.1 })
    // apse facets: eave polygon grown outward
    const eav = APSE.map(([x, z]) => {
      const d = Math.hypot(x - 7.5, z)
      return V(x + ((x - 7.5) / d) * ov, ey, z + (z / d) * ov)
    })
    eav[0] = V(xb, ey, hz)
    eav[eav.length - 1] = V(xb, ey, -hz)
    for (let i = 0; i < eav.length - 1; i++) {
      facet(b, 'grRoof', [eav[i], eav[i + 1], apex], { thickness: 0.1 })
      b.beam('grRoofDk', eav[i].clone().add(V(0, 0.05, 0)), apex.clone().add(V(0, 0.05, 0)), 0.2, 0.1)
    }
    b.beam('grRoofDk', V(xf, RIDGE + 0.05, 0), apex.clone().add(V(0, 0.05, 0)), 0.26, 0.14)
    // gutters (red-brown, as photographed)
    for (const s of [-1, 1]) b.beam('grGutter', V(X0, ey - 0.08, s * (hz + 0.06)), V(xb, ey - 0.08, s * (hz + 0.06)), 0.16, 0.16)
  }

  /* ---------------- side & apse windows (interpreted) ---------------- */
  for (const s of [-1, 1]) {
    const m = (x: number) => (s > 0 ? mat(x, 0, HZ, 0) : mat(x, 0, -HZ, Math.PI))
    for (const x of [-4.4, -0.2, 4.0]) {
      archWin(b, m(x), 1.4, 4.6, 4.4)
      b.add('grOchre', metricBox(0.3, EAVE - 1.5, 0.12), on(m(x + 2.1), mat(0, 0.9 + (EAVE - 1.5) / 2, 0.06)))
    }
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 2.8, 0, 0, 10))), on(m(-8.0), mat(0, 0, 0.03)))
  }
  for (const i of [1, 2, 3]) {
    const [xA, zA] = APSE[i]
    const [xB, zB] = APSE[i + 1]
    const a = Math.atan2(xB - xA, zB - zA) // wall direction
    const m = mat((xA + xB) / 2, 0, (zA + zB) / 2, a - Math.PI / 2)
    archWin(b, m, 1.3, 4.2, 4.6)
  }

  /* ---------------- frontispiece ---------------- */
  const fx = X0
  // pilaster strips: corners and tower edges, full height to the cornice
  for (const u of [-HZ + 0.4, -TW.hw - 0.3, TW.hw + 0.3, HZ - 0.4]) b.add('grOchre', metricBox(0.8, EAVE - 0.9, 0.18), on(FRONT(-u, fx), mat(0, 0.9 + (EAVE - 0.9) / 2, 0.09)))
  // string courses + main cornice
  b.add('grOchre', metricBox(2 * HZ + 0.2, 0.35, 0.22), on(FRONT(0, fx), mat(0, 9.7, 0.11)))
  b.add('grOchre', metricBox(2 * HZ + 0.2, 0.35, 0.22), on(FRONT(0, fx), mat(0, 11.0, 0.11)))
  b.add('grOchre', metricBox(2 * HZ + 0.5, 0.6, 0.55), on(FRONT(0, fx), mat(0, EAVE - 0.3, 0.2)))
  // panel frames (white panels outlined in ochre) in the outer bays
  for (const u of [-4.55, 4.55]) {
    b.add('grOchre', metricBox(2.3, 0.18, 0.08), on(FRONT(-u, fx), mat(0, 9.2, 0.05)))
    b.add('grOchre', metricBox(2.3, 0.18, 0.08), on(FRONT(-u, fx), mat(0, 1.6, 0.05)))
  }
  // three tall arched windows (gallery level) + door
  for (const u of [-4.55, 0, 4.55]) archWin(b, FRONT(-u, fx), 1.3, 3.6, 4.9)
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.8, 3.2, 0, 0, 12))), on(FRONT(0, fx), mat(0, 0, 0.05)))
  b.add('grOchre', extrude(frameShape('round', 1.8, 3.2, 0.25, 0, 0.0), 0.12), on(FRONT(0, fx), mat(0, 0, 0.01)))

  // attic above the cornice: corner piers with urns, panels with small windows
  for (const s of [-1, 1]) {
    const zc = s * (HZ - 0.65)
    b.block('grOchre', 1.0, 4.4, 1.3, fx + 0.5, EAVE, zc)
    b.block('grOchre', 1.2, 0.3, 1.5, fx + 0.5, EAVE + 4.4, zc)
    urn(b, fx + 0.5, EAVE + 4.7, zc, 0.95)
    const pz0 = s * (TW.hw + 0.05)
    const pz1 = s * (HZ - 1.3)
    const pc = (pz0 + pz1) / 2
    const pw = Math.abs(pz1 - pz0)
    b.block('grWhite', 0.7, 3.6, pw, fx + 0.35, EAVE, pc)
    b.block('grOchre', 0.9, 0.3, pw + 0.1, fx + 0.4, EAVE + 3.55, pc)
    b.add('grOchre', metricBox(0.05, 3.2, 0.25), mat(fx - 0.02, EAVE + 1.8, pc - (s * pw) / 2 + s * 0.2))
    archWin(b, FRONT(pc, fx), 0.75, 1.6, EAVE + 1.0, 'glassC')
  }

  /* ---------------- tower ---------------- */
  {
    const x = TXC
    const hw = TW.hw
    // middle stage (above the cornice) — the lower stage is the frontispiece itself
    b.block('grOchre', 2 * hw, 17.0 - EAVE + 0.2, 2 * hw, x, EAVE - 0.2, 0)
    // white panels on the faces of the middle stage
    for (const [m, w] of [[FRONT(0, x - hw), 2 * hw - 1.4], [mat(x, 0, hw, 0), 2 * hw - 1.4], [mat(x, 0, -hw, Math.PI), 2 * hw - 1.4]] as [THREE.Matrix4, number][]) {
      b.add('grWhite', metricBox(w, 4.0, 0.06), on(m, mat(0, EAVE + 2.4, 0.03)))
      archWin(b, m, 1.0, 2.6, EAVE + 1.0, 'black')
    }
    // dated plaque under the window (front)
    b.add('grWhite', metricBox(0.75, 0.4, 0.08), on(FRONT(0, x - hw), mat(0, EAVE + 0.55, 0.08)))
    // dentilled cornice
    b.block('grOchre', 2 * hw + 0.7, 0.45, 2 * hw + 0.7, x, 17.0, 0)
    for (let i = -6; i <= 6; i++) {
      const u = (i * (2 * hw)) / 13
      for (const s of [-1, 1]) {
        b.add('grOchre', metricBox(0.22, 0.3, 0.3), mat(x + u, 16.85, s * (hw + 0.15)))
        b.add('grOchre', metricBox(0.3, 0.3, 0.22), mat(x + s * (hw + 0.15), 16.85, u))
      }
    }
    // belfry
    const bh = BEL.hw
    b.block('grWhite', 2 * bh, BEL.y1 - BEL.y0, 2 * bh, x, BEL.y0, 0)
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block('grOchre', 0.55, BEL.y1 - BEL.y0, 0.55, x + sx * (bh - 0.2), BEL.y0, sz * (bh - 0.2))
    }
    const faces = [FRONT(0, x - bh), mat(x + bh, 0, 0, Math.PI / 2), mat(x, 0, bh, 0), mat(x, 0, -bh, Math.PI)]
    for (const m of faces) {
      b.add('grOchre', metricBox(2 * bh - 1.0, 0.22, 0.12), on(m, mat(0, BEL.y0 + 3.75, 0.06)))
      archWin(b, m, 1.05, 2.5, BEL.y0 + 0.9, 'black')
      for (let i = 0; i < 6; i++) b.add('wood', metricBox(1.0, 0.06, 0.08), on(m, mat(0, BEL.y0 + 1.05 + i * 0.3, 0.07, 0, 0.5)))
      // panel – oculus – panel frieze
      for (const u of [-1.25, 1.25]) {
        b.add('grOchre', extrude(frameShape('rect', 0.65, 0.6, 0.08, u, BEL.y0 + 4.1), 0.06), on(m, mat(0, 0, 0.01)))
      }
      b.add('grOchre', new THREE.TorusGeometry(0.4, 0.07, 6, 20), on(m, mat(0, BEL.y0 + 4.42, 0.04)))
    }
    // top cornice
    b.block('grOchre', 2 * bh + 0.55, 0.45, 2 * bh + 0.55, x, BEL.y1 - 0.05, 0)
    b.block('grOchre', 2 * bh + 0.8, 0.2, 2 * bh + 0.8, x, BEL.y1 + 0.4, 0)
    // bell-cast square helm + tall square spire (silver-grey sheet, as photographed)
    const R = Math.SQRT2
    const y0 = BEL.y1 + 0.55
    helm(b, 'grSpire', {
      x,
      z: 0,
      n: 4,
      phase: Math.PI / 4,
      flat: true,
      stations: [
        [(bh + 0.55) * R, y0],
        [(bh + 0.1) * R, y0 + 0.35],
        [(bh - 0.45) * R, y0 + 0.8],
        [1.25 * R, y0 + 1.45],
        [0.06 * R, 31.4],
      ],
    })
    // hip rolls
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.rod('grSpire', V(x + sx * 1.25, y0 + 1.45, sz * 1.25), V(x + sx * 0.06, 31.3, sz * 0.06), 0.05, 5)
    b.add('grSpire', new THREE.SphereGeometry(0.28, 14, 10), mat(x, 31.65, 0))
    b.rod('grSpire', V(x, 31.3, 0), V(x, 32.6, 0), 0.04)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [TXC, 26, 0],
  materials: (base) => {
    // COLOR METAL copper (KME reference selection) on the helm and spire; the single web photo
    // shows the older silver-grey sheet, so the new copper covering is applied here
    const spire = (base.copper as THREE.MeshStandardMaterial).clone()
    return {
      grSpire: spire,
      grWhite: new THREE.MeshStandardMaterial({ color: '#f0ede5', roughness: 0.9 }),
      grOchre: new THREE.MeshStandardMaterial({ color: '#e0b67f', roughness: 0.88 }),
      grRoof: new THREE.MeshStandardMaterial({ color: '#7a4a3a', roughness: 0.85 }),
      grRoofDk: new THREE.MeshStandardMaterial({ color: '#5f3a2e', roughness: 0.85 }),
      grGutter: new THREE.MeshStandardMaterial({ color: '#8a3b30', roughness: 0.6, metalness: 0.3 }),
    }
  },
  notes:
    'Preliminary model from a single photograph of the tower front; side and east elevations, roof covering and window rhythm are interpreted. Spire shown silver-grey as photographed.',
}
export default model
