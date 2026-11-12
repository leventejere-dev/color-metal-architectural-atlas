/**
 * Ateneul Român (Romanian Athenaeum), Bucharest — concert hall, 1888.
 *
 * Modelling specification derived from the 12 reference photographs, calibrated
 * on the OSM outline (way 16291602: 67.3 × 50.2 m incl. portico, long axis 55.2°)
 * and the documented total height of 41 m (OSM / Wikidata). Real metres; origin =
 * footprint centre at ground; +X = OSM long axis pointing NE (55.2°), the portico
 * faces −X (south-west, towards the garden). Rotunda centred on the origin.
 *
 *  - ROTUNDA DRUM (Ø ≈ 28.8 m wall, 18 bays of 20°): an oculus bay sits on the
 *    portico axis. Each bay: square stone panel with a round oculus, beaded
 *    ring, grey-metal laurel wreath and lyre grille; bays separated by 18
 *    pilasters with composite capitals. Entablature with a names frieze
 *    (VIRGILIUS, MICHELANGELO, PERICLE …, text omitted), modillion cornice
 *    (top ≈ 25.9 m) and a low metal balustrade/cresting band at the dome base.
 *    Below the pilasters: a fluted sloping weathering over a lower, wider ring
 *    (Ø 32 m) with a glazed opening rhythm, rising just above the wing roofs.
 *  - THE DOME (COLOR METAL scope, natural titanium-zinc — the photographs show
 *    it weathered to a blue-grey): a low spherical cap from r 14.6 m (25.9 m) to
 *    the crown ring (r 4.8 m, 31.2 m). 18 heavy ribs on the pilaster axes:
 *    palmette pedestal standing on the parapet, a sloping console with rosettes
 *    bridging the lower dome, a volute, then a half-round roll to the crown.
 *    Between the ribs, tapering pans with 8 standing seams per bay.
 *  - CROWN & FINIAL (metal): crown ring with consoles and hanging swags, flared
 *    cornice, acanthus/ball cresting; a vase-shaped finial with eight C-scrolls,
 *    a small open lantern cage and a lightning rod reaching 41 m.
 *  - PORTICO (−X): Ionic hexastyle, columns ≈ 11.4 m on a stepped stylobate,
 *    one return column each side, entablature with the ATHENEUL ROMAN panel,
 *    pediment (≈ 19°) with palmette acroterion and griffins at the corners.
 *    Behind: three glazed timber doors and five round gold mosaic medallions.
 *  - WINGS: two-storey block (≈ 48 × 49 m, cornice ≈ 14 m) round the rotunda,
 *    rusticated ground floor, grille windows; four corner pavilions with low
 *    grey-metal hipped roofs (as photographed beside the portico).
 * Approximations: wing side/rear elevations and rear corner roofs are not
 * photographed (mirrored from the front); the OSM rear edge is skewed — the
 * rear is modelled square; ornament (wreaths, lyres, scrolls, acanthus,
 * griffins) simplified to primitives; dome profile from photo silhouettes.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, lathe, extrude, hippedRoof, seams, window_, door, faceFrame } from '../kit'
import type { ModelModule } from '../registry'

const N = 18 // drum bays / dome ribs
const BAY = (2 * Math.PI) / N
/** bay (oculus) centres at k·20° — one on the −X portico axis; ribs/pilasters half a bay off */
const ribAngle = (k: number) => (k + 0.5) * BAY
const bayAngle = (k: number) => k * BAY

const R_WALL = 14.4 // drum wall
const R_LOW = 16.0 // lower ring
const Y_ENT = 24.2 // architrave bottom
const Y_COR = 25.9 // cornice top / parapet base
// dome: spherical cap centred on the axis
const YC = 10.6
const RS = 21.15
const R_BASE = 14.6
const R_TOP = 4.8
const yDome = (r: number) => YC + Math.sqrt(RS * RS - r * r)

const WING_H = 14.0
const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
/** frame on a round wall: local +Z = outward radial at angle a, local +X tangential, origin at radius r on y = 0 */
const radFrame = (a: number, r: number) => mat(r * Math.cos(a), 0, r * Math.sin(a), Math.PI / 2 - a)

/** Stepped surface of revolution: vertical runs → cylinders, horizontal runs → annuli, slopes → frusta. */
function stack(b: Builder, key: string, prof: [number, number][], seg = 72) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i]
    const [r1, y1] = prof[i + 1]
    if (Math.abs(y1 - y0) < 1e-6) {
      if (Math.abs(r1 - r0) < 1e-6) continue
      const g = new THREE.RingGeometry(Math.min(r0, r1), Math.max(r0, r1), seg, 1)
      b.add(key, g, mat(0, y0, 0, 0, r1 < r0 ? -Math.PI / 2 : Math.PI / 2))
    } else {
      const top = y1 > y0 ? r1 : r0
      const bot = y1 > y0 ? r0 : r1
      b.add(key, new THREE.CylinderGeometry(top, bot, Math.abs(y1 - y0), seg, 1, true), mat(0, (y0 + y1) / 2, 0))
    }
  }
}

function palmetteShape(w: number, h: number, lobes = 7) {
  const s = new THREE.Shape()
  s.moveTo(-w * 0.16, 0)
  s.lineTo(w * 0.16, 0)
  for (let i = 0; i <= lobes * 2; i++) {
    const t = i / (lobes * 2)
    const ang = (0.06 + 0.88 * t) * Math.PI
    const rr = i % 2 === 0 ? 1 : 0.7
    s.lineTo(Math.cos(ang) * (w / 2) * rr, h * 0.22 + Math.sin(ang) * h * 0.78 * rr)
  }
  s.closePath()
  return s
}

function leafShape(w: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.quadraticCurveTo(-w * 0.62, h * 0.62, 0, h)
  s.quadraticCurveTo(w * 0.62, h * 0.62, w / 2, 0)
  s.closePath()
  return s
}

/* ------------------------------------------------------------------ */
/* Drum bay elements (built once in a local wall frame, then merged)   */
/* ------------------------------------------------------------------ */

const YO = 21.35 // oculus centre

function oculusBay(): Builder {
  const p = new Builder()
  // square panel with raised border
  p.add('atStone', metricBox(3.55, 3.7, 0.12), mat(0, YO, 0.06))
  for (const s of [-1, 1]) {
    p.add('atTrim', metricBox(3.55, 0.14, 0.2), mat(0, YO + s * 1.85, 0.1))
    p.add('atTrim', metricBox(0.14, 3.7, 0.2), mat(s * 1.77, YO, 0.1))
  }
  // beaded stone ring, glass, metal wreath
  p.add('atTrim', new THREE.TorusGeometry(1.44, 0.15, 5, 28), mat(0, YO, 0.16))
  p.add('atTrim', new THREE.TorusGeometry(1.66, 0.055, 3, 28), mat(0, YO, 0.14))
  p.add('glassC', new THREE.CircleGeometry(1.32, 32), mat(0, YO, 0.12))
  p.add('atOrn', new THREE.TorusGeometry(1.14, 0.1, 4, 24), mat(0, YO, 0.2))
  // lyre grille (light grey metal)
  const L = (x: number, y: number) => V(x, YO + y, 0.2)
  const up = V(0, 0, 1)
  for (const s of [-1, 1]) {
    const arm = [L(s * 0.24, -0.78), L(s * 0.55, -0.35), L(s * 0.6, 0.15), L(s * 0.45, 0.58), L(s * 0.56, 0.82)]
    for (let i = 0; i < arm.length - 1; i++) p.beam('helm', arm[i], arm[i + 1], 0.09, 0.07, up)
  }
  p.beam('helm', L(-0.48, 0.56), L(0.48, 0.56), 0.08, 0.07, up)
  p.beam('helm', L(-0.32, -0.78), L(0.32, -0.78), 0.14, 0.08, up)
  for (let i = 0; i < 5; i++) {
    const x = -0.24 + i * 0.12
    p.beam('helm', L(x, -0.74), L(x, 0.54), 0.03, 0.04, up)
  }
  // corner rosettes
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) p.add('atTrim', new THREE.CylinderGeometry(0.17, 0.17, 0.1, 10), mat(sx * 1.45, YO + sy * 1.52, 0.17, 0, Math.PI / 2))
  // apron below the panel
  p.add('atTrim', metricBox(2.4, 0.5, 0.12), mat(0, YO - 2.25, 0.08))
  return p
}

function pilaster(): Builder {
  const p = new Builder()
  p.add('atTrim', metricBox(1.6, 0.4, 0.62), mat(0, 18.9 + 0.2, 0.25))
  p.add('atTrim', metricBox(1.45, 0.2, 0.52), mat(0, 19.4, 0.24))
  p.add('atTrim', metricBox(1.3, 23.35 - 19.5, 0.42), mat(0, (19.5 + 23.35) / 2, 0.21))
  // composite capital: bell, volutes, abacus
  p.add('atTrim', metricBox(1.4, 0.55, 0.5), mat(0, 23.62, 0.25))
  for (const s of [-1, 1]) p.add('atTrim', new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), mat(s * 0.66, 23.85, 0.42, 0, Math.PI / 2))
  p.add('atTrim', metricBox(1.75, 0.3, 0.66), mat(0, 24.05, 0.33))
  // entablature ressaut above the pilaster (architrave + frieze)
  p.add('atTrim', metricBox(1.8, 1.05, 0.72), mat(0, Y_ENT + 0.52, 0.36))
  return p
}

/** One dome rib in a local frame: +Z radial, +Y up, +X tangential. */
function rib(): Builder {
  const p = new Builder()
  const rOut = 14.55
  const rIn = 10.4
  // palmette pedestal on the parapet
  p.add('atOrn', metricBox(1.15, 2.1, 1.15), mat(0, Y_COR + 1.05, 15.05))
  p.add('atOrn', metricBox(1.35, 0.22, 1.35), mat(0, Y_COR + 2.18, 15.05))
  p.add('atOrn', metricBox(1.3, 0.3, 1.3), mat(0, Y_COR + 0.15, 15.05))
  p.add('atOrn', extrude(palmetteShape(0.95, 1.25), 0.08), mat(0, Y_COR + 0.55, 15.62))
  // console bridging the lower dome
  const topO = Y_COR + 2.35
  const topI = 29.72
  const s = new THREE.Shape()
  s.moveTo(rOut, topO)
  s.lineTo(rIn + 0.35, topI)
  s.lineTo(rIn, topI - 0.15)
  for (let i = 0; i <= 8; i++) {
    const r = rIn + ((rOut - rIn) * i) / 8
    s.lineTo(r, yDome(r) - 0.12)
  }
  s.closePath()
  const w = 0.88
  p.add('atOrn', extrude(s, w, 2), mat(w / 2, 0, 0, -Math.PI / 2))
  p.beam('atOrn', V(0, topO + 0.1, rOut + 0.1), V(0, topI + 0.1, rIn + 0.3), 1.04, 0.22)
  // rosettes on the console flanks
  for (const r of [13.6, 12.5, 11.4]) {
    const t = (rOut - r) / (rOut - rIn)
    const yTop = topO + (topI - topO) * t
    const y = (yTop + yDome(r)) / 2 + 0.1
    for (const sx of [-1, 1]) p.add('atOrn', new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), mat(sx * (w / 2 + 0.03), y, r, 0, 0, Math.PI / 2))
  }
  // volutes at the inner end
  for (const sx of [-1, 1]) p.add('atOrn', new THREE.TorusGeometry(0.3, 0.11, 6, 14, Math.PI * 1.5), mat(sx * 0.3, topI - 0.38, rIn + 0.12, Math.PI / 2))
  // upper rib: half-round roll on a flat fillet up to the crown
  const th0 = Math.asin((rIn + 0.1) / RS)
  const th1 = Math.asin((R_TOP + 0.15) / RS)
  const n = 9
  for (let i = 0; i < n; i++) {
    const ta = th0 + ((th1 - th0) * i) / n
    const tb = th0 + ((th1 - th0) * (i + 1)) / n
    const P = (t: number, off: number) => V(0, YC + (RS + off) * Math.cos(t), (RS + off) * Math.sin(t))
    const nrm = V(0, Math.cos((ta + tb) / 2), Math.sin((ta + tb) / 2))
    p.beam('atOrn', P(ta, 0.04), P(tb, 0.04), 0.78, 0.09, nrm)
    p.rod('atOrn', P(ta, 0.2), P(tb, 0.2), 0.21, 8)
  }
  // small block where the roll starts
  p.add('atOrn', metricBox(0.7, 0.55, 0.6), mat(0, yDome(rIn - 0.2) + 0.3, rIn - 0.2))
  return p
}

/* ------------------------------------------------------------------ */
/* Dome shell with tapering pans and standing seams                    */
/* ------------------------------------------------------------------ */

function domeShell(b: Builder) {
  const th0 = Math.asin(R_BASE / RS)
  const th1 = Math.asin((R_TOP - 0.05) / RS)
  const rings = 16
  const sub = 9 // pans per bay → 8 seams between the ribs
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const P = (a: number, t: number) => V(RS * Math.sin(t) * Math.cos(a), YC + RS * Math.cos(t), RS * Math.sin(t) * Math.sin(a))
  const Nn = (a: number, t: number) => V(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a))
  const push = (p: THREE.Vector3, n: THREE.Vector3, u: number, v: number) => {
    pos.push(p.x, p.y, p.z)
    nor.push(n.x, n.y, n.z)
    uv.push(u, v)
  }
  for (let k = 0; k < N; k++) {
    const aS = ribAngle(k)
    for (let j = 0; j < sub; j++) {
      const a0 = aS + (j / sub) * BAY
      const a1 = aS + ((j + 1) / sub) * BAY
      for (let i = 0; i < rings; i++) {
        const t0 = th0 + ((th1 - th0) * i) / rings
        const t1 = th0 + ((th1 - th0) * (i + 1)) / rings
        const q = [
          [a0, t0, j * 0.55],
          [a1, t0, (j + 1) * 0.55],
          [a1, t1, (j + 1) * 0.55],
          [a0, t1, j * 0.55],
        ] as const
        const tri = (A: (typeof q)[number], B: (typeof q)[number], C: (typeof q)[number]) => {
          const pa = P(A[0], A[1])
          const pb = P(B[0], B[1])
          const pc = P(C[0], C[1])
          const n = V().subVectors(pb, pa).cross(V().subVectors(pc, pa))
          const out = Nn((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)
          const list = n.dot(out) >= 0 ? [A, B, C] : [A, C, B]
          for (const Q of list) push(P(Q[0], Q[1]), Nn(Q[0], Q[1]), Q[2], (th0 - Q[1]) * RS)
        }
        tri(q[0], q[1], q[2])
        tri(q[0], q[2], q[3])
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  b.add('atZinc', g)
  // standing seams (8 per bay), following the meridians
  const segs = 6
  for (let k = 0; k < N; k++) {
    for (let j = 1; j < sub; j++) {
      const a = ribAngle(k) + (j / sub) * BAY
      for (let i = 0; i < segs; i++) {
        const t0 = th0 + ((th1 - th0) * i) / segs
        const t1 = th0 + ((th1 - th0) * (i + 1)) / segs
        const S = (t: number) => V((RS + 0.025) * Math.sin(t) * Math.cos(a), YC + (RS + 0.025) * Math.cos(t), (RS + 0.025) * Math.sin(t) * Math.sin(a))
        b.beam('atZinc', S(t0), S(t1), 0.045, 0.05, Nn(a, (t0 + t1) / 2))
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Portico                                                             */
/* ------------------------------------------------------------------ */

function ionicColumn(b: Builder, x: number, z: number, y0: number, h: number, r: number) {
  b.block('atTrim', 2.5 * r, 0.24, 2.5 * r, x, y0, z)
  b.add('atTrim', new THREE.TorusGeometry(r * 1.02, r * 0.17, 5, 20), mat(x, y0 + 0.36, z, 0, Math.PI / 2))
  b.add('atTrim', new THREE.TorusGeometry(r * 0.94, r * 0.12, 4, 20), mat(x, y0 + 0.6, z, 0, Math.PI / 2))
  const ys = y0 + 0.5
  const ye = y0 + h - 0.62
  b.add('atTrim', new THREE.CylinderGeometry(r * 0.86, r, ye - ys, 20), mat(x, (ys + ye) / 2, z))
  // capital: echinus, volute bolsters (axes towards the viewer, −X), abacus
  b.add('atTrim', new THREE.TorusGeometry(r * 0.88, r * 0.15, 5, 20), mat(x, ye + 0.08, z, 0, Math.PI / 2))
  b.add('atTrim', metricBox(1.9 * r, 0.22, 2.3 * r), mat(x, ye + 0.3, z))
  for (const s of [-1, 1]) b.rod('atTrim', V(x - r * 0.95, ye + 0.22, z + s * r * 1.08), V(x + r * 0.95, ye + 0.22, z + s * r * 1.08), 0.27, 12)
  b.add('atTrim', metricBox(2.45 * r, 0.16, 2.45 * r), mat(x, y0 + h - 0.08, z))
}

function portico(b: Builder) {
  const xW = -24 // façade wall behind the portico
  const xF = -32.2 // entablature front
  const hw = 10.9 // entablature half-width
  const yS = 1.0 // stylobate
  const yA = 12.4 // architrave bottom
  // stepped stylobate
  for (let i = 0; i < 4; i++) b.block('atStone', 9.8 - i * 0.4, 0.25 * (i + 1), 2 * (12.2 - i * 0.2), xW - (9.8 - i * 0.4) / 2, 0, 0)
  // columns: front row of six, one return column on each side
  const zs = [-9.75, -5.85, -1.95, 1.95, 5.85, 9.75]
  for (const z of zs) ionicColumn(b, -31.4, z, yS, yA - yS, 0.62)
  for (const z of [-9.75, 9.75]) ionicColumn(b, -27.6, z, yS, yA - yS, 0.62)
  // antae at the wall
  for (const z of [-10.35, 10.35]) b.block('atTrim', 0.6, yA - yS, 1.3, xW - 0.3, yS, z)
  // entablature (solid block forms the portico ceiling)
  b.block('atTrim', xW - xF, 0.95, 2 * hw - 0.2, (xW + xF) / 2, yA, 0)
  b.block('atStone', xW - xF - 0.1, 0.95, 2 * hw - 0.4, (xW + xF) / 2 + 0.05, yA + 0.95, 0)
  b.add('atTrim', metricBox(0.08, 0.62, 9.6), mat(xF + 0.02, yA + 1.42, 0)) // ATHENEUL ROMAN panel
  b.block('atTrim', xW - xF + 0.6, 0.55, 2 * hw + 0.6, (xW + xF) / 2 - 0.3, yA + 1.9, 0)
  b.block('atTrim', xW - xF + 0.9, 0.5, 2 * hw + 1.2, (xW + xF) / 2 - 0.45, yA + 2.45, 0)
  // dentils
  for (let z = -hw + 0.2; z <= hw - 0.2; z += 0.42) b.add('atTrim', metricBox(0.22, 0.24, 0.2), mat(xF - 0.14, yA + 1.78, z))
  // pediment
  const yP = yA + 2.95
  const rise = 3.95
  const phw = hw + 0.5
  const tri = new THREE.Shape([new THREE.Vector2(-phw + 0.6, 0), new THREE.Vector2(phw - 0.6, 0), new THREE.Vector2(0, rise - 0.35)])
  b.add('atStone', extrude(tri, xW - xF + 6, 1), mat(xF + 0.35, yP, 0, Math.PI / 2))
  for (const s of [-1, 1]) {
    const a = V(xF - 0.55, yP - 0.05, s * (phw + 0.1))
    const c = V(xF - 0.55, yP + rise + 0.12, 0)
    b.beam('atTrim', a, c, 0.62, 1.3, V(1, 0, 0))
  }
  b.block('atTrim', 1.2, 0.3, 2 * phw + 0.2, xF - 0.15, yP - 0.05, 0)
  // portico roof (grey metal) running back into the rotunda
  const ov = 0.35
  const yE = yP + 0.1
  const yR = yP + rise + 0.15
  const xr0 = xF - 0.3
  const xr1 = -11.2
  facet(b, 'atZinc', [V(xr0, yE, phw + ov), V(xr1, yE, phw + ov), V(xr1, yR, 0), V(xr0, yR, 0)], { seams: seams('atZinc', 0.55, 0.04, 0.04), thickness: 0.1 })
  facet(b, 'atZinc', [V(xr1, yE, -phw - ov), V(xr0, yE, -phw - ov), V(xr0, yR, 0), V(xr1, yR, 0)], { seams: seams('atZinc', 0.55, 0.04, 0.04), thickness: 0.1 })
  b.beam('atOrn', V(xr0, yR + 0.05, 0), V(xr1, yR + 0.05, 0), 0.3, 0.16)
  // apex palmette acroterion and corner griffins (simplified)
  b.block('atStone', 1.0, 0.5, 1.2, xF - 0.3, yP + rise - 0.1, 0)
  b.add('atOrn', extrude(palmetteShape(1.7, 1.9, 9), 0.2), mat(xF - 0.4, yP + rise + 0.38, 0, -Math.PI / 2))
  for (const s of [-1, 1]) {
    const z = s * (phw - 0.4)
    b.block('atStone', 1.1, 0.55, 1.3, xF - 0.2, yP - 0.05, z)
    b.add('atOrn', metricBox(1.3, 0.75, 0.55), mat(xF - 0.2, yP + 0.95, z))
    b.add('atOrn', new THREE.SphereGeometry(0.3, 10, 8), mat(xF - 0.85, yP + 1.45, z))
    b.add('atOrn', metricBox(0.9, 1.1, 0.12), mat(xF + 0.05, yP + 1.55, z, 0, 0, -0.5))
  }
  // back wall: three glazed doors with transoms, five gold mosaic medallions
  for (const z of [-3.9, 0, 3.9]) {
    door(b, '-x', xW, z, { w: 2.2, h: 4.8, y0: yS, leafKey: 'wood', frameKey: 'atTrim', frame: 0.32 })
    window_(b, '-x', xW, z, yS + 5.25, { w: 2.2, h: 1.3, frame: 0.2, frameKey: 'atTrim', bars: [3, 1] })
  }
  for (const z of [-7.8, -3.9, 0, 3.9, 7.8]) {
    const m = faceFrame('-x', xW, z, 0, 0)
    b.add('gilt', new THREE.CircleGeometry(0.82, 24), M(m, mat(0, 9.6, 0.06)))
    b.add('atTrim', new THREE.TorusGeometry(0.9, 0.1, 5, 24), M(m, mat(0, 9.6, 0.08)))
    b.add('wood', new THREE.CircleGeometry(0.42, 16), M(m, mat(0, 9.55, 0.07, 0, 0, 0, 0.8, 1.2, 1)))
  }
  // panel frames on the portico back wall
  for (const z of [-7.8, 7.8]) window_(b, '-x', xW, z, 2.4, { w: 1.8, h: 4.0, frame: 0.18, frameKey: 'atTrim', glassKey: 'atStone' })
}

/* ------------------------------------------------------------------ */
/* Wings (block round the rotunda)                                     */
/* ------------------------------------------------------------------ */

const BX = 24 // half length (X)
const BZ = 24.5 // half width (Z)
const PAV = { x0: 12.5, z0: 13.0, out: 0.3 } // corner pavilions |x| ≥ x0, |z| ≥ z0, projecting `out`

function wings(b: Builder) {
  // main block and projecting corner pavilions
  b.block('atStone', 2 * BX, WING_H, 2 * BZ, 0, 0, 0)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = BX - PAV.x0 + PAV.out
      const d = BZ - PAV.z0 + PAV.out
      b.block('atStone', w, WING_H, d, sx * (PAV.x0 + w / 2), 0, sz * (PAV.z0 + d / 2))
    }
  }
  // socle, rustication, belt, entablature
  const ring = (y: number, h: number, grow: number, key: string) => {
    b.block(key, 2 * BX + 2 * grow, h, 2 * BZ + 2 * grow, 0, y, 0)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const w = BX - PAV.x0 + PAV.out + grow
        const d = BZ - PAV.z0 + PAV.out + grow
        b.block(key, w, h, d, sx * (PAV.x0 + w / 2), y, sz * (PAV.z0 + d / 2))
      }
    }
  }
  ring(0, 1.0, 0.2, 'stoneWarm')
  for (let y = 1.6; y < 6.0; y += 0.62) ring(y, 0.1, 0.04, 'atTrim')
  ring(6.0, 0.55, 0.12, 'atTrim')
  ring(12.55, 0.5, 0.1, 'atTrim')
  ring(13.05, 0.4, 0.05, 'atStone')
  ring(13.45, 0.55, 0.5, 'atTrim')
  // roofs: flat (grey) between the pavilions, low hipped roofs on the four pavilions
  b.block('atFlat', 2 * BX - 0.4, 0.15, 2 * BZ - 0.4, 0, WING_H, 0)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = BX - PAV.x0 + PAV.out
      const d = BZ - PAV.z0 + PAV.out
      hippedRoof(b, 'atZinc', { x: sx * (PAV.x0 + w / 2), z: sz * (PAV.z0 + d / 2), w: w + 0.4, d: d + 0.4, y: WING_H, pitch: 22, overhang: 0.25, seams: seams('atZinc', 0.55, 0.04, 0.04), capKey: 'atOrn' })
    }
  }
  // windows — ground floor (rusticated) and upper floor (square grille windows)
  const ground = { w: 1.5, h: 3.0, frame: 0.22, frameKey: 'atTrim', sill: true, bars: [2, 3] as [number, number] }
  const upper = { w: 1.9, h: 1.9, frame: 0.26, frameKey: 'atTrim', sill: true, bars: [4, 4] as [number, number] }
  const tall = { w: 1.7, h: 3.4, frame: 0.24, frameKey: 'atTrim', sill: true, type: 'round' as const, bars: [2, 4] as [number, number] }
  const pavPlaneX = BX + PAV.out
  const pavPlaneZ = BZ + PAV.out
  for (const sz of [-1, 1]) {
    // front (−X) and rear (+X) faces of the pavilions
    for (const face of ['-x', '+x'] as const) {
      for (const zz of [16.2, 21.4]) {
        const u = face === '-x' ? sz * zz : -sz * zz
        window_(b, face, face === '-x' ? -pavPlaneX : pavPlaneX, u, 2.0, ground)
        window_(b, face, face === '-x' ? -pavPlaneX : pavPlaneX, u, 8.2, upper)
      }
    }
    // narrow tall window next to the portico
    window_(b, '-x', -BX, sz * 11.9, 7.0, { w: 0.8, h: 4.2, frame: 0.18, frameKey: 'atTrim', bars: [1, 4] })
  }
  // side faces (±Z): pavilions + five tall bays between
  for (const face of ['+z', '-z'] as const) {
    const plane = face === '+z' ? pavPlaneZ : -pavPlaneZ
    const sgn = face === '+z' ? 1 : -1
    for (const xx of [-21.0, -15.8, 15.8, 21.0]) {
      window_(b, face, plane, sgn * xx, 2.0, ground)
      window_(b, face, plane, sgn * xx, 8.2, upper)
    }
    for (const xx of [-9.6, -4.8, 0, 4.8, 9.6]) {
      window_(b, face, face === '+z' ? BZ : -BZ, sgn * xx, 1.8, ground)
      window_(b, face, face === '+z' ? BZ : -BZ, sgn * xx, 7.4, tall)
    }
  }
  // rear (+X) central part
  for (const zz of [-8.2, -4.1, 0, 4.1, 8.2]) {
    window_(b, '+x', BX, -zz, 1.8, ground)
    window_(b, '+x', BX, -zz, 7.4, tall)
  }
}

/* ------------------------------------------------------------------ */
/* Rotunda                                                             */
/* ------------------------------------------------------------------ */

function rotunda(b: Builder) {
  // lower ring rising above the wing roofs, glazed opening rhythm
  stack(b, 'atStone', [
    [R_LOW, 13.5],
    [R_LOW, 16.6],
  ])
  stack(b, 'atTrim', [
    [R_LOW + 0.25, WING_H + 0.1],
    [R_LOW + 0.25, WING_H + 0.6],
    [R_LOW, WING_H + 0.75],
  ])
  stack(b, 'atTrim', [
    [R_LOW, 16.6],
    [R_LOW + 0.2, 16.65],
    [R_LOW + 0.35, 16.85],
    [R_LOW + 0.45, 16.95],
    [R_LOW + 0.45, 17.2],
    [R_LOW - 0.05, 17.2],
  ])
  const lowWin = new Builder()
  window_(lowWin, '+z', 0, 0, 15.0, { w: 1.45, h: 1.45, frame: 0.12, frameKey: 'atTrim', bars: [2, 1] })
  lowWin.add('atTrim', metricBox(0.5, 2.0, 0.2), mat(-1.4, 15.7, 0.08))
  for (let k = 0; k < 2 * N; k++) b.merge(lowWin, radFrame(((k + 0.5) * BAY) / 2, R_LOW))
  // fluted sloping weathering up to the drum
  stack(b, 'atTrim', [
    [R_LOW - 0.05, 17.2],
    [R_WALL + 0.25, 18.2],
    [R_WALL + 0.25, 18.9],
    [R_WALL, 18.9],
  ])
  for (let k = 0; k < 4 * N; k++) {
    const a = (k / (4 * N)) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    b.beam('atStone', V(c * (R_LOW - 0.1), 17.27, s * (R_LOW - 0.1)), V(c * (R_WALL + 0.3), 18.24, s * (R_WALL + 0.3)), 0.07, 0.07, V(c, 1.6, s))
  }
  // drum wall
  stack(b, 'atStone', [
    [R_WALL, 18.0],
    [R_WALL, Y_ENT],
  ])
  // bays and pilasters
  const bay = oculusBay()
  const pil = pilaster()
  for (let k = 0; k < N; k++) {
    b.merge(bay, radFrame(bayAngle(k), R_WALL))
    b.merge(pil, radFrame(ribAngle(k), R_WALL))
  }
  // entablature: architrave, names frieze, modillion cornice
  stack(b, 'atTrim', [
    [R_WALL, Y_ENT],
    [R_WALL + 0.45, Y_ENT],
    [R_WALL + 0.45, Y_ENT + 0.45],
    [R_WALL + 0.35, Y_ENT + 0.45],
    [R_WALL + 0.35, Y_ENT + 1.05],
    [R_WALL + 0.55, Y_ENT + 1.1],
    [R_WALL + 0.65, Y_ENT + 1.25],
    [R_WALL + 1.05, Y_ENT + 1.32],
    [R_WALL + 1.1, Y_COR],
    [R_WALL - 0.2, Y_COR],
  ])
  for (let k = 0; k < 4 * N; k++) {
    const a = ((k + 0.5) / (4 * N)) * Math.PI * 2
    b.add('atTrim', metricBox(0.22, 0.2, 0.55), M(radFrame(a, R_WALL + 0.6), mat(0, Y_ENT + 1.2, 0.1)))
  }
  // parapet: metal balustrade band at the dome base
  stack(b, 'atOrn', [
    [15.2, Y_COR],
    [15.2, Y_COR + 0.14],
    [15.05, Y_COR + 0.14],
  ])
  stack(b, 'atOrn', [
    [14.85, Y_COR],
    [14.85, Y_COR + 0.62],
  ])
  stack(b, 'atOrn', [
    [15.1, Y_COR + 0.62],
    [15.2, Y_COR + 0.7],
    [15.2, Y_COR + 0.8],
    [14.8, Y_COR + 0.8],
  ])
  for (let k = 0; k < 12 * N; k++) {
    const a = ((k + 0.5) / (12 * N)) * Math.PI * 2
    b.add('atOrn', metricBox(0.1, 0.48, 0.1), mat(15.08 * Math.cos(a), Y_COR + 0.38, 15.08 * Math.sin(a), -a))
  }
  // gutter line where the dome meets the parapet
  stack(b, 'atOrn', [
    [R_BASE + 0.3, Y_COR - 0.05],
    [R_BASE + 0.3, Y_COR + 0.15],
    [R_BASE - 0.05, Y_COR + 0.15],
  ])
}

/* ------------------------------------------------------------------ */
/* Crown ring, finial, lantern                                         */
/* ------------------------------------------------------------------ */

function crown(b: Builder) {
  const y0 = yDome(R_TOP) - 0.25
  stack(b, 'atOrn', [
    [5.1, y0],
    [5.1, y0 + 0.3],
    [4.92, y0 + 0.35],
    [4.92, 32.2],
    [5.2, 32.25],
    [5.3, 32.4],
    [5.7, 32.5],
    [5.75, 32.78],
    [5.25, 32.8],
  ], 54)
  for (let k = 0; k < N; k++) {
    // consoles under the cornice on the rib axes, swags between them
    b.add('atOrn', metricBox(0.3, 0.55, 0.42), M(radFrame(ribAngle(k), 4.95), mat(0, 31.95, 0.12)))
    b.add('atOrn', new THREE.TorusGeometry(0.62, 0.075, 5, 12, Math.PI), M(radFrame(bayAngle(k), 4.97), mat(0, 32.12, 0.08, 0, 0, Math.PI)))
    b.add('atOrn', new THREE.SphereGeometry(0.12, 8, 6), M(radFrame(bayAngle(k), 5.0), mat(0, 31.82, 0.1)))
    // cresting: acanthus leaf on the rib axis, ball between
    b.add('atOrn', extrude(leafShape(0.62, 0.95), 0.14, 4), M(radFrame(ribAngle(k), 5.32), mat(0, 32.8, -0.07, 0, 0.28)))
    b.add('atOrn', new THREE.SphereGeometry(0.2, 10, 8), M(radFrame(bayAngle(k), 5.25), mat(0, 33.12, 0)))
  }
  b.add('atOrn', new THREE.TorusGeometry(5.12, 0.2, 8, 72), mat(0, 32.98, 0, 0, Math.PI / 2))
  // top cover
  b.add('atOrn', new THREE.CylinderGeometry(1.75, 5.15, 0.55, 54, 1, false), mat(0, 33.05, 0))
  // vase-shaped finial with C-scrolls
  const prof: [number, number][] = [
    [1.8, 33.25],
    [1.85, 33.42],
    [1.55, 33.55],
    [1.38, 33.95],
    [1.22, 34.6],
    [1.16, 35.05],
    [1.3, 35.3],
    [1.5, 35.55],
    [1.5, 35.72],
    [1.05, 35.82],
    [0.78, 36.1],
    [0.66, 36.55],
    [0.86, 36.72],
    [0.86, 36.95],
    [0.3, 37.02],
    [0.001, 37.04],
  ]
  b.add('atOrn', lathe(prof, 28), mat(0, 0, 0))
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    b.add('atOrn', new THREE.TorusGeometry(0.4, 0.1, 6, 14, Math.PI * 1.55), M(radFrame(a, 1.62), mat(0, 35.35, 0.1, Math.PI / 2, 0, -0.3)))
    b.add('atOrn', extrude(leafShape(0.5, 1.05), 0.1, 4), M(radFrame(a + Math.PI / 8, 1.3), mat(0, 33.55, 0.02, 0, -0.12)))
  }
  // open lantern cage, cap, lightning rod
  b.add('atOrn', new THREE.CylinderGeometry(0.62, 0.62, 0.14, 20), mat(0, 37.08, 0))
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    b.rod('atOrn', V(0.45 * Math.cos(a), 37.1, 0.45 * Math.sin(a)), V(0.45 * Math.cos(a), 38.55, 0.45 * Math.sin(a)), 0.05, 6)
  }
  for (const y of [37.8, 38.55]) b.add('atOrn', new THREE.TorusGeometry(0.46, 0.045, 4, 20), mat(0, y, 0, 0, Math.PI / 2))
  b.add('atOrn', lathe([[0.64, 38.55], [0.64, 38.66], [0.42, 38.8], [0.14, 39.0], [0.07, 39.1], [0.001, 39.14]], 20))
  b.rod('atOrn', V(0, 39.0, 0), V(0, 41.0, 0), 0.045, 6)
  b.add('atOrn', new THREE.SphereGeometry(0.11, 8, 6), mat(0, 39.6, 0))
}

function build(): Builder {
  const b = new Builder()
  wings(b)
  portico(b)
  rotunda(b)
  domeShell(b)
  const r = rib()
  for (let k = 0; k < N; k++) b.merge(r, mat(0, 0, 0, Math.PI / 2 - ribAngle(k)))
  crown(b)
  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-9.6, 29.4, -3.2],
  materials: (base) => {
    const zinc = (base.zincSlate as THREE.MeshStandardMaterial).clone()
    zinc.color.set('#9ea7b2')
    return {
      atZinc: zinc,
      atOrn: new THREE.MeshStandardMaterial({ color: '#6a727c', metalness: 0.55, roughness: 0.46 }),
      atStone: new THREE.MeshStandardMaterial({ color: '#dccfb2', roughness: 0.86 }),
      atTrim: new THREE.MeshStandardMaterial({ color: '#e7ddc6', roughness: 0.8 }),
      atFlat: new THREE.MeshStandardMaterial({ color: '#767b80', metalness: 0.15, roughness: 0.85 }),
    }
  },
  notes: 'Rotunda, 18-rib natural titanium-zinc dome, crown and Ionic portico from the photographs; wing side/rear elevations not photographed (mirrored), ornament simplified.',
}
export default model
