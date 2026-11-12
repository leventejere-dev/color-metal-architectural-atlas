/**
 * Metropolitan Cathedral of Iași (Catedrala Mitropolitană), OSM way 203149116.
 *
 * Modelling specification derived from the 12 reference photographs, calibrated
 * on the OSM outline (55.8 × 37.6 m min. rectangle, long axis 60.2°) and the
 * published dimensions (56.7 m long, 34.15 m wide, towers 52.9 m). Real metres.
 * +X = main axis towards the altar end (NE, hexastyle portico + fountain);
 * the main entrance façade with the great painted loggia arch is at −X (SW).
 *
 *  - PLAN: a three-aisled nave block (29.2 × 28 m) between two transverse end
 *    blocks. Each end block = two tower bases ("corner blocks", 11 × 10.1 m,
 *    projecting 2.9 m beyond the nave walls) + a central bay 13.6 m wide.
 *  - ELEVATIONS (white plaster): channel-rusticated ground stage up to a
 *    Vitruvian-scroll frieze (~12.5 m), smooth upper stage, main entablature
 *    with dentils at 21.5 m (all blocks share it). Nave flanks: 4 bays with
 *    pilasters, round-arched windows below, horizontal oval windows above,
 *    balustrade along the roof walkway.
 *  - −X FAÇADE: tetrastyle prostyle porches with pediments in front of the two
 *    tower bases; between them the deep painted loggia under a great round
 *    arch (balcony balustrade, entrance door and two windows below); attic
 *    aedicule with relief and cross, flanked by two small copper domes.
 *  - +X FAÇADE: hexastyle Corinthian portico with pediment on the central bay,
 *    inscription bands, a tall attic with a relief panel, pedestal and cross.
 *  - TOWERS (4, axes at ±21.2 / ±11.85 m): attic on the tower base, square
 *    belfry with chamfered corners, paired columns and one arched opening per
 *    face, urns on the entablature; chamfered-octagonal drum with clock faces
 *    on the cardinal faces and oculi on the diagonals; 8-ribbed bulbous dome
 *    with lobed hems, concave neck, ball, spike and sun-ray cross (52.9 m).
 *  - ROOFS (COLOR METAL scope: KME copper): steep gable roof over the raised
 *    central nave (clerestory with lunettes) with iron/zinc fleuron cresting,
 *    lean-to aisle roofs (greener, more weathered), hipped roofs over the end
 *    bays, tower domes. The photographs show the copper dark brown (aged) on
 *    the domes and the main roof, green-brown on the low aisle strips.
 * Approximations: exact storey heights, roof pitch (36°), plan of the end-bay
 * roofs, tower axis spacing (±1 m), carved reliefs and capitals simplified,
 * rustication without vertical joints, interior of the loggia shown as a
 * plain painted surface.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, lathe, loft, extrude, opening, frameShape, dome, hippedRoof, window_, door, faceFrame, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180

/* ---------------- key dimensions ---------------- */
const H = {
  plinth: 0.8,
  frieze0: 12.0,
  frieze1: 12.6,
  arch0: 20.4, // architrave bottom
  cornice: 21.5, // top of the main entablature
  attic: 25.4, // tower-base attic top = belfry base
  col0: 26.2,
  col1: 31.8,
  belfryTop: 33.4,
  drumTop: 38.6,
  domeBase: 39.5,
}
const NAVE = { x: 14.6, hw: 14.0 }
const CB = { x0: 14.6, x1: 25.6, z0: 6.8, z1: 16.9 } // corner blocks (mirrored in x and z)
const TW = { x: 21.2, z: 11.85 } // tower axes (mirrored)
const ROOF = { x: 16.6, hw: 8.2, eave: 24.6, pitch: 36 }
const CU = 'cuRoof' // main / end-bay roofs
const CUD = 'cuDome' // tower domes, small domes
const SEAM = seams(CU, 0.55, 0.05, 0.05)
const WALL = 'plasterWhite'

/** Facade-local u coordinate for a world point (see kit faceFrame). */
function U(face: Face, x: number, z: number) {
  return face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z
}
/** Offset a facade plane outwards by n. */
const out = (face: Face, plane: number, n: number) => plane + (face[0] === '+' ? n : -n)
const onFace = (face: Face, plane: number, u: number, local: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(faceFrame(face, plane, u, 0, 0), local)

/** Chamfered square ring (8 points, loft-ordered). */
function chamferRing(hs: number, c: number, y: number, cx = 0, cz = 0) {
  return [
    V(cx - hs, y, cz - hs + c),
    V(cx - hs + c, y, cz - hs),
    V(cx + hs - c, y, cz - hs),
    V(cx + hs, y, cz - hs + c),
    V(cx + hs, y, cz + hs - c),
    V(cx + hs - c, y, cz + hs),
    V(cx - hs + c, y, cz + hs),
    V(cx - hs, y, cz + hs - c),
  ]
}
const slab = (hs: number, c: number, y0: number, y1: number, cx: number, cz: number) => loft([chamferRing(hs, c, y0, cx, cz), chamferRing(hs, c, y1, cx, cz)], { capTop: true, capBottom: true, flat: true })

/* ---------------- small parts ---------------- */

/** Classical column (base, slightly tapering shaft, flared capital, abacus). */
function column(b: Builder, x: number, z: number, y0: number, h: number, r: number, key = WALL) {
  const baseH = r * 0.55
  const capH = r * 1.6
  const shaftH = h - baseH - capH
  b.add(key, metricBox(r * 2.6, baseH * 0.55, r * 2.6), mat(x, y0 + baseH * 0.275, z))
  b.add(key, new THREE.CylinderGeometry(r * 1.12, r * 1.18, baseH * 0.45, 10, 1, true), mat(x, y0 + baseH * 0.775, z))
  b.add(key, new THREE.CylinderGeometry(r * 0.86, r, shaftH, 10, 1, true), mat(x, y0 + baseH + shaftH / 2, z))
  b.add(key, lathe([[r * 0.86, 0], [r * 1.0, capH * 0.35], [r * 1.25, capH * 0.65], [r * 1.38, capH * 0.78]], 10), mat(x, y0 + baseH + shaftH, z))
  b.add(key, metricBox(r * 2.9, capH * 0.22, r * 2.9), mat(x, y0 + h - capH * 0.11, z))
}

function urn(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [[0, 0], [0.3, 0], [0.3, 0.14], [0.16, 0.22], [0.3, 0.45], [0.32, 0.62], [0.2, 0.8], [0.1, 0.88], [0.14, 0.98], [0, 1.3]]
  b.add(WALL, lathe(prof.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
}

/** Orthodox sun-ray cross (iron): shaft, bar, ring at the crossing, trefoil ends. ry turns the cross plane. */
function rayCross(b: Builder, x: number, y: number, z: number, s: number, ry = 0) {
  const g = new Builder()
  const t = s * 0.05
  g.add('iron', metricBox(t, s, t), mat(0, s / 2, 0))
  g.add('iron', metricBox(s * 0.62, t, t), mat(0, s * 0.66, 0))
  g.add('iron', new THREE.TorusGeometry(s * 0.17, t * 0.4, 4, 16), mat(0, s * 0.66, 0))
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8
    g.add('iron', metricBox(t * 0.5, s * 0.16, t * 0.5), mat(Math.cos(a) * s * 0.15, s * 0.66 + Math.sin(a) * s * 0.15, 0, 0, 0, a - Math.PI / 2))
  }
  for (const [px, py] of [[0, s], [s * 0.31, s * 0.66], [-s * 0.31, s * 0.66]]) g.add('iron', new THREE.SphereGeometry(t * 1.1, 6, 4), mat(px, py, 0))
  b.merge(g, mat(x, y, z, ry))
}

/** Oculus in a square panel with radiating voussoirs, on a facade. */
function oculus(b: Builder, face: Face, plane: number, u: number, y: number, r: number) {
  b.add(WALL, metricBox(2 * r + 1.4, 2 * r + 1.4, 0.1), onFace(face, plane, u, mat(0, y, 0.05)))
  b.add('trim', new THREE.TorusGeometry(r + 0.1, 0.13, 4, 22), onFace(face, plane, u, mat(0, y, 0.13)))
  b.add('glassC', new THREE.CircleGeometry(r, 28), onFace(face, plane, u, mat(0, y, 0.11)))
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    const R = r + 0.5
    b.add('trim', metricBox(0.12, 0.42, 0.05), onFace(face, plane, u, mat(Math.cos(a) * R, y + Math.sin(a) * R, 0.12, 0, 0, a - Math.PI / 2)))
  }
}

/** Horizontal oval window in a raised panel (nave upper storey). */
function ovalWindow(b: Builder, face: Face, plane: number, u: number, y: number) {
  b.add(WALL, metricBox(3.6, 2.5, 0.08), onFace(face, plane, u, mat(0, y, 0.04)))
  const sx = 1.0
  const sy = 0.58
  b.add('glassC', new THREE.CircleGeometry(1.15, 28), onFace(face, plane, u, mat(0, y, 0.09, 0, 0, 0, sx, sy, 1)))
  b.add('trim', new THREE.TorusGeometry(1.25, 0.12, 4, 22), onFace(face, plane, u, mat(0, y, 0.12, 0, 0, 0, sx, sy, 1)))
}

/** Clock face (white dial, iron ring and hands). */
function clock(b: Builder, m: THREE.Matrix4, r: number) {
  b.add('trim', new THREE.TorusGeometry(r + 0.16, 0.12, 4, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.08)))
  b.add('white', new THREE.CircleGeometry(r, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.06)))
  b.add('iron', new THREE.TorusGeometry(r - 0.06, 0.035, 3, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.08)))
  b.add('iron', metricBox(0.06, r * 0.75, 0.03), new THREE.Matrix4().multiplyMatrices(m, mat(0, r * 0.32, 0.1)))
  b.add('iron', metricBox(r * 0.55, 0.06, 0.03), new THREE.Matrix4().multiplyMatrices(m, mat(r * 0.24, 0, 0.1)))
}

/** Balustrade along a horizontal segment A→B (base at A.y). */
function balustrade(b: Builder, A: THREE.Vector3, B: THREE.Vector3, h = 1.0, spacing = 0.32) {
  const d = V().subVectors(B, A)
  const L = d.length()
  b.beam(WALL, A.clone().add(V(0, 0.1, 0)), B.clone().add(V(0, 0.1, 0)), 0.42, 0.2)
  b.beam(WALL, A.clone().add(V(0, h - 0.08, 0)), B.clone().add(V(0, h - 0.08, 0)), 0.4, 0.16)
  const n = Math.max(1, Math.floor(L / spacing))
  const ry = Math.atan2(d.x, d.z)
  for (let i = 0; i < n; i++) {
    const p = A.clone().add(d.clone().multiplyScalar((i + 0.5) / n))
    b.add(WALL, metricBox(0.14, h - 0.36, 0.14), mat(p.x, p.y + 0.2 + (h - 0.36) / 2, p.z, ry))
  }
  const posts = Math.max(1, Math.round(L / 3.6))
  for (let i = 0; i <= posts; i++) {
    const p = A.clone().add(d.clone().multiplyScalar(i / posts))
    b.add(WALL, metricBox(0.42, h, 0.42), mat(p.x, p.y + h / 2, p.z, ry))
  }
}

/** Channel rustication: projecting courses around a rectangular block. */
function rustication(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, y1: number) {
  const pitch = 0.62
  for (let y = y0 + 0.06; y + 0.5 <= y1 + 0.01; y += pitch) b.add(WALL, metricBox(w + 0.1, 0.5, d + 0.1), mat(cx, y + 0.25, cz))
}

/** Standard horizontal articulation of a block: plinth, Vitruvian frieze, entablature with dentils. */
function entablature(b: Builder, cx: number, cz: number, w: number, d: number, frieze = true) {
  b.add('stoneLight', metricBox(w + 0.3, H.plinth, d + 0.3), mat(cx, H.plinth / 2, cz))
  if (frieze) {
    b.add(WALL, metricBox(w + 0.3, H.frieze1 - H.frieze0, d + 0.3), mat(cx, (H.frieze0 + H.frieze1) / 2, cz))
    b.add('stoneLight', metricBox(w + 0.34, 0.28, d + 0.34), mat(cx, H.frieze0 + 0.28, cz))
  }
  b.add(WALL, metricBox(w + 0.16, 0.4, d + 0.16), mat(cx, H.arch0 + 0.2, cz))
  b.add('trim', metricBox(w + 0.42, 0.24, d + 0.42), mat(cx, H.arch0 + 0.52, cz))
  b.add(WALL, metricBox(w + 1.2, 0.46, d + 1.2), mat(cx, H.cornice - 0.23, cz))
  b.add('helm', metricBox(w + 1.24, 0.05, d + 1.24), mat(cx, H.cornice + 0.02, cz))
}

/* ---------------- tower ---------------- */

const DOME_PROF: [number, number][] = [
  [1.0, 0],
  [1.03, 0.08],
  [1.045, 0.2],
  [1.03, 0.33],
  [0.99, 0.45],
  [0.92, 0.57],
  [0.82, 0.68],
  [0.68, 0.79],
  [0.52, 0.88],
  [0.4, 0.94],
  [0.33, 0.98],
  [0.31, 1.0],
]

function meridianRibs(b: Builder, key: string, cx: number, y0: number, cz: number, pts: [number, number][], count: number, rh: number, phase = 0) {
  for (let k = 0; k < count; k++) {
    const a = phase + (k / count) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < pts.length - 1; i++) {
      const [r0, h0] = pts[i]
      const [r1, h1] = pts[i + 1]
      const A = V(cx + c * (r0 + rh / 2), y0 + h0, cz + s * (r0 + rh / 2))
      const B2 = V(cx + c * (r1 + rh / 2), y0 + h1, cz + s * (r1 + rh / 2))
      b.beam(key, A, B2, rh * 1.2, rh, V(c, 0, s))
    }
  }
}

function tower(b: Builder, cx: number, cz: number) {
  /* belfry podium & core */
  b.add(WALL, slab(4.75, 1.0, H.attic, H.col0 - 0.25, cx, cz))
  b.add(WALL, slab(4.9, 1.05, H.col0 - 0.25, H.col0, cx, cz))
  b.add(WALL, loft([chamferRing(3.8, 0.9, H.col0, cx, cz), chamferRing(3.8, 0.9, H.col1, cx, cz)], { flat: true }))
  /* entablature + cornice */
  b.add(WALL, slab(4.55, 1.05, H.col1, H.col1 + 0.5, cx, cz))
  b.add('trim', slab(4.62, 1.07, H.col1 + 0.5, H.col1 + 0.8, cx, cz))
  b.add(WALL, slab(4.95, 1.15, H.col1 + 0.8, H.belfryTop, cx, cz))
  // sloping grey flashing from the cornice up to the drum
  b.add('helm', loft([chamferRing(4.95, 1.15, H.belfryTop, cx, cz), chamferRing(3.7, 1.55, H.belfryTop + 0.55, cx, cz)], { flat: true }))

  const faces: { face: Face; plane: number; u: number }[] = [
    { face: '+x', plane: cx + 3.8, u: U('+x', cx, cz) },
    { face: '-x', plane: cx - 3.8, u: U('-x', cx, cz) },
    { face: '+z', plane: cz + 3.8, u: U('+z', cx, cz) },
    { face: '-z', plane: cz - 3.8, u: U('-z', cx, cz) },
  ]
  for (const f of faces) {
    // arched (louvred) opening with frame and impost
    window_(b, f.face, f.plane, f.u, H.col0 + 1.0, { type: 'round', w: 1.6, h: 3.7, frame: 0.24, frameKey: 'trim', glassKey: 'glassC', bars: [2, 3], sill: true })
    // paired columns either side, standing 0.45 m proud of the core
    for (const du of [-2.55, -1.65, 1.65, 2.55]) {
      const p = new THREE.Vector3().setFromMatrixPosition(onFace(f.face, f.plane, f.u + du, mat(0, 0, 0.45)))
      column(b, p.x, p.z, H.col0, H.col1 - H.col0, 0.25)
    }
  }
  // corner columns on the chamfers + urns on the entablature corners
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const d = 3.8 - 0.45 + 0.42
    column(b, cx + sx * d, cz + sz * d, H.col0, H.col1 - H.col0, 0.25)
    urn(b, cx + sx * 4.3, H.belfryTop, cz + sz * 4.3, 1.15)
  }

  /* drum (chamfered octagon) with clocks and oculi */
  const d0 = H.belfryTop
  b.add(WALL, loft([chamferRing(3.5, 1.5, d0, cx, cz), chamferRing(3.5, 1.5, H.drumTop, cx, cz)], { flat: true }))
  b.add(WALL, slab(3.62, 1.55, d0 + 0.55, d0 + 0.95, cx, cz))
  b.add(WALL, slab(3.68, 1.57, H.drumTop - 0.55, H.drumTop - 0.2, cx, cz))
  b.add('trim', slab(3.95, 1.68, H.drumTop - 0.2, H.drumTop + 0.3, cx, cz))
  b.add('helm', loft([chamferRing(3.95, 1.68, H.drumTop + 0.3, cx, cz), chamferRing(3.8, 1.62, H.domeBase, cx, cz)], { flat: true }))
  const yc = (d0 + 0.95 + H.drumTop - 0.55) / 2
  for (const f of faces) {
    const plane = f.plane + (f.face[0] === '+' ? -0.3 : 0.3)
    clock(b, onFace(f.face, plane, f.u, mat(0, yc, 0)), 0.75)
    // pilaster strips framing the cardinal face
    for (const du of [-1.75, 1.75]) b.add(WALL, metricBox(0.4, H.drumTop - d0 - 1.5, 0.12), onFace(f.face, plane, f.u + du, mat(0, (d0 + 0.95 + H.drumTop - 0.55) / 2, 0.06)))
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const o = 3.5 - 0.75
    const ry = Math.atan2(sx, sz)
    const m = mat(cx + sx * (o + 0.02), yc, cz + sz * (o + 0.02), ry)
    b.add('glassC', new THREE.CircleGeometry(0.52, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.02)))
    b.add('trim', new THREE.TorusGeometry(0.6, 0.1, 6, 20), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.05)))
  }

  /* bulbous 8-ribbed dome */
  const R = 3.75
  const Hd = 6.5
  dome(b, CUD, { x: cx, y: H.domeBase, z: cz, r: R, h: Hd, profile: DOME_PROF, seg: 40, ribs: 8, ribH: 0.11 })
  const prof = DOME_PROF.map(([r, y]) => [r * R, y * Hd] as [number, number])
  meridianRibs(b, CUD, cx, H.domeBase, cz, prof.slice(0, -1), 8, 0.05, Math.PI / 8)
  // lobed hems between the main ribs
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2
    const rr = R * 1.04 + 0.04
    const m = mat(cx + Math.cos(a) * rr, H.domeBase + 0.55, cz + Math.sin(a) * rr, Math.atan2(Math.cos(a), Math.sin(a)))
    b.add(CUD, new THREE.TorusGeometry(0.95, 0.06, 4, 12, Math.PI), m)
    b.add(CUD, new THREE.SphereGeometry(0.12, 6, 4), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0.95, 0)))
  }
  b.add(CUD, new THREE.TorusGeometry(R * 1.0 + 0.05, 0.1, 4, 40), mat(cx, H.domeBase + 0.05, cz, 0, Math.PI / 2))
  /* neck, ball, spike, cross */
  const y0 = H.domeBase + Hd
  // short concave neck on a ledge, stem, ball, spike
  b.add(CUD, lathe([[1.2, 0], [1.24, 0.1], [1.12, 0.2], [0.8, 0.36], [0.52, 0.62], [0.38, 0.95], [0.33, 1.25], [0.44, 1.33], [0.44, 1.43], [0.3, 1.52], [0.24, 1.75], [0.0, 1.77]], 20), mat(cx, y0, cz))
  b.add(CUD, new THREE.SphereGeometry(0.52, 14, 10), mat(cx, y0 + 2.25, cz))
  b.add(CUD, lathe([[0.16, 0], [0.1, 0.5], [0.05, 0.8], [0.0, 0.85]], 10), mat(cx, y0 + 2.7, cz))
  rayCross(b, cx, y0 + 3.3, cz, 3.55, Math.PI / 2)
}

/* ---------------- build ---------------- */

function build(): Builder {
  const b = new Builder()

  /* ======== nave block ======== */
  b.block(WALL, 2 * NAVE.x, H.cornice, 2 * NAVE.hw, 0, 0, 0)
  entablature(b, 0, 0, 2 * NAVE.x, 2 * NAVE.hw)
  rustication(b, 0, 0, 2 * NAVE.x, 2 * NAVE.hw, H.plinth, H.frieze0)
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? NAVE.hw : -NAVE.hw
    // rusticated piers (stage 1) and pilasters (stage 2) between the 4 bays
    for (const x of [-7.3, 0, 7.3]) {
      b.add(WALL, metricBox(1.3, H.frieze0 - H.plinth, 0.16), onFace(face, plane, U(face, x, 0), mat(0, (H.frieze0 + H.plinth) / 2, 0.08)))
      b.add(WALL, metricBox(1.1, H.arch0 - H.frieze1, 0.14), onFace(face, plane, U(face, x, 0), mat(0, (H.arch0 + H.frieze1) / 2, 0.07)))
    }
    for (const x of [-10.95, -3.65, 3.65, 10.95]) {
      const u = U(face, x, 0)
      window_(b, face, out(face, plane, 0.05), u, 4.4, { type: 'round', w: 2.2, h: 5.4, frame: 0.32, frameKey: 'trim', bars: [2, 4], sill: true })
      b.add('trim', metricBox(0.5, 0.75, 0.14), onFace(face, out(face, plane, 0.05), u, mat(0, 4.4 + 5.4 + 0.25, 0.08)))
      ovalWindow(b, face, plane, u, 16.6)
    }
  }
  // roof walkway and balustrades over the aisle cornices
  for (const s of [-1, 1]) {
    b.add(WALL, metricBox(2 * NAVE.x, 0.45, 2.4), mat(0, H.cornice + 0.22, s * (NAVE.hw - 1.2)))
    balustrade(b, V(-NAVE.x, H.cornice + 0.45, s * (NAVE.hw - 0.2)), V(NAVE.x, H.cornice + 0.45, s * (NAVE.hw - 0.2)), 1.0)
  }

  /* ======== clerestory, aisle roofs, main roof ======== */
  b.block(WALL, 2 * ROOF.x, ROOF.eave - H.cornice, 2 * ROOF.hw, 0, H.cornice, 0)
  b.add('trim', metricBox(2 * ROOF.x, 0.3, 2 * ROOF.hw + 0.5), mat(0, ROOF.eave - 0.15, 0))
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? ROOF.hw : -ROOF.hw
    for (const x of [-10.95, -3.65, 3.65, 10.95]) window_(b, face, plane, U(face, x, 0), H.cornice + 1.55, { type: 'segment', w: 1.5, h: 0.75, frame: 0.14, frameKey: 'trim' })
  }
  // lean-to aisle roofs (weathered green-brown copper)
  for (const s of [-1, 1]) {
    const zo = s * (NAVE.hw - 2.35)
    const zi = s * ROOF.hw
    const y0 = H.cornice + 0.48
    const y1 = H.cornice + 1.2
    facet(b, 'cuAisle', [V(-NAVE.x, y0, zo), V(NAVE.x, y0, zo), V(NAVE.x, y1, zi), V(-NAVE.x, y1, zi)], { seams: seams('cuAisle', 0.55, 0.04, 0.05), thickness: 0.1 })
  }
  // steep gable roof over the central nave
  const t = Math.tan(ROOF.pitch * D2R)
  const ov = 0.35
  const eY = ROOF.eave - ov * t
  const ridge = ROOF.eave + ROOF.hw * t
  const rx = ROOF.x + 0.3
  const rz = ROOF.hw + ov
  facet(b, CU, [V(-rx, eY, rz), V(rx, eY, rz), V(rx, ridge, 0), V(-rx, ridge, 0)], { seams: SEAM, thickness: 0.12 })
  facet(b, CU, [V(rx, eY, -rz), V(-rx, eY, -rz), V(-rx, ridge, 0), V(rx, ridge, 0)], { seams: SEAM, thickness: 0.12 })
  b.beam(CU, V(-rx, ridge + 0.08, 0), V(rx, ridge + 0.08, 0), 0.34, 0.22)
  for (const s of [-1, 1]) b.beam(CU, V(-rx, eY - 0.08, s * (rz + 0.06)), V(rx, eY - 0.08, s * (rz + 0.06)), 0.22, 0.2)
  // ridge cresting (zinc fleurons) — iron-dark as photographed
  const fleur = new THREE.Shape([
    new THREE.Vector2(-0.04, 0),
    new THREE.Vector2(0.04, 0),
    new THREE.Vector2(0.04, 0.28),
    new THREE.Vector2(0.17, 0.4),
    new THREE.Vector2(0.06, 0.46),
    new THREE.Vector2(0.0, 0.74),
    new THREE.Vector2(-0.06, 0.46),
    new THREE.Vector2(-0.17, 0.4),
    new THREE.Vector2(-0.04, 0.28),
  ])
  const fg = extrude(fleur, 0.04, 2)
  for (let x = -ROOF.x + 0.3; x <= ROOF.x - 0.2; x += 0.62) b.add('iron', fg, mat(x, ridge + 0.18, -0.02, Math.PI / 2))
  b.beam('iron', V(-ROOF.x, ridge + 0.55, 0), V(ROOF.x, ridge + 0.55, 0), 0.04, 0.04)
  // gable walls with oculus and cross ornament at both ends of the nave roof
  for (const s of [-1, 1]) {
    const tri = new THREE.Shape([new THREE.Vector2(-ROOF.hw, ROOF.eave - 0.01), new THREE.Vector2(ROOF.hw, ROOF.eave - 0.01), new THREE.Vector2(0, ridge - 0.06)])
    const gx = s * ROOF.x
    b.add(WALL, extrude(tri, 0.6), mat(gx - s * 0.6, 0, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2))
    for (const sz of [-1, 1]) b.beam('trim', V(gx + s * 0.15, ROOF.eave, sz * (ROOF.hw + 0.25)), V(gx + s * 0.15, ridge + 0.1, 0), 0.4, 0.45, V(1, 0, 0))
    const face: Face = s > 0 ? '+x' : '-x'
    b.add('trim', new THREE.TorusGeometry(0.75, 0.13, 6, 24), onFace(face, gx, 0, mat(0, ROOF.eave + 2.0, 0.1)))
    b.add('glassC', new THREE.CircleGeometry(0.68, 24), onFace(face, gx, 0, mat(0, ROOF.eave + 2.0, 0.04)))
    rayCross(b, gx + s * 0.2, ridge + 0.1, 0, 1.6, Math.PI / 2)
  }

  /* ======== corner blocks (tower bases) ======== */
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = (sx * (CB.x0 + CB.x1)) / 2
      const cz = (sz * (CB.z0 + CB.z1)) / 2
      const w = CB.x1 - CB.x0
      const d = CB.z1 - CB.z0
      b.block(WALL, w, H.cornice, d, cx, 0, cz)
      entablature(b, cx, cz, w, d)
      rustication(b, cx, cz, w, d, H.plinth, H.frieze0)
      // attic with a raised panel and cornice
      b.block(WALL, w, H.attic - H.cornice - 0.4, d, cx, H.cornice, cz)
      b.add(WALL, metricBox(w + 0.5, 0.4, d + 0.5), mat(cx, H.attic - 0.2, cz))
      b.add('helm', metricBox(w + 0.54, 0.05, d + 0.54), mat(cx, H.attic + 0.02, cz))
      urn(b, cx + sx * (w / 2 - 0.35), H.attic, sz * (CB.z1 - 0.35), 1.2)
      urn(b, cx + sx * (w / 2 - 0.35), H.attic, sz * (CB.z0 + 0.35), 1.2)

      // end face (±x)
      const ef: Face = sx > 0 ? '+x' : '-x'
      const ep = sx * CB.x1
      const eu = U(ef, ep, cz)
      // balustraded panel in the attic below the belfry
      b.add('plasterGrey', metricBox(5.4, 1.15, 0.03), onFace(ef, ep, eu, mat(0, H.cornice + 1.5, 0.015)))
      b.add(WALL, metricBox(5.8, 0.18, 0.2), onFace(ef, ep, eu, mat(0, H.cornice + 0.88, 0.1)))
      b.add(WALL, metricBox(5.8, 0.18, 0.2), onFace(ef, ep, eu, mat(0, H.cornice + 2.12, 0.1)))
      for (let i = 0; i < 15; i++) b.add(WALL, metricBox(0.15, 0.95, 0.12), onFace(ef, ep, eu, mat(-2.45 + i * 0.35, H.cornice + 1.5, 0.08)))
      oculus(b, ef, ep, eu, 16.6, 0.85)
      if (sx > 0) {
        window_(b, ef, out(ef, ep, 0.05), eu, 5.4, { type: 'round', w: 2.1, h: 4.6, frame: 0.3, frameKey: 'trim', bars: [2, 4], sill: true })
        window_(b, ef, out(ef, ep, 0.05), eu, 2.0, { type: 'rect', w: 1.3, h: 1.7, frame: 0.2, frameKey: 'trim', bars: [2, 2] })
      } else {
        window_(b, ef, out(ef, ep, 0.05), eu, 1.9, { type: 'rect', w: 1.3, h: 2.3, frame: 0.2, frameKey: 'trim', bars: [2, 3] })
        window_(b, ef, out(ef, ep, 0.05), eu, 5.7, { type: 'rect', w: 1.3, h: 2.6, frame: 0.2, frameKey: 'trim', bars: [2, 3] })
      }
      // side face (±z): door with aedicule, arched window, oculus
      const sf: Face = sz > 0 ? '+z' : '-z'
      const sp = sz * CB.z1
      const su = U(sf, sx * 19.0, sp)
      b.add(WALL, metricBox(w - 1.6, 2.2, 0.08), onFace(sf, sp, U(sf, cx, sp), mat(0, H.cornice + 1.8, 0.04)))
      oculus(b, sf, sp, su, 16.6, 0.85)
      window_(b, sf, out(sf, sp, 0.05), su, 6.2, { type: 'round', w: 2.0, h: 5.0, frame: 0.28, frameKey: 'trim', bars: [2, 4], sill: true })
      door(b, sf, out(sf, sp, 0.05), su, { w: 1.9, h: 3.4, type: 'rect', frame: 0.22, frameKey: 'trim', y0: H.plinth })
      for (const du of [-1.55, 1.55]) {
        const p = new THREE.Vector3().setFromMatrixPosition(onFace(sf, sp, su + du, mat(0, 0, 0.4)))
        column(b, p.x, p.z, H.plinth, 4.0, 0.22)
      }
      b.add(WALL, metricBox(4.1, 0.55, 0.9), onFace(sf, sp, su, mat(0, H.plinth + 4.0 + 0.27, 0.42)))
      b.add('helm', metricBox(4.2, 0.05, 0.95), onFace(sf, sp, su, mat(0, H.plinth + 4.57, 0.42)))
    }
  }

  /* ======== central end bays ======== */
  for (const sx of [-1, 1]) {
    const x0 = sx * NAVE.x
    const x1 = sx * CB.x1
    const cx = (x0 + x1) / 2
    const w = Math.abs(x1 - x0)
    const d = 2 * CB.z0
    if (sx > 0) {
      b.block(WALL, w, H.cornice, d, cx, 0, 0)
    } else {
      // body behind the loggia + front wall pierced by the great arch
      const xb = -23.1
      b.block(WALL, Math.abs(xb - x0), H.cornice, d, (xb + x0) / 2, 0, 0)
      const s = new THREE.Shape([new THREE.Vector2(-CB.z0, 0), new THREE.Vector2(CB.z0, 0), new THREE.Vector2(CB.z0, H.cornice), new THREE.Vector2(-CB.z0, H.cornice)])
      s.holes.push(new THREE.Path(opening('round', 11.0, 9.1, 0, 8.6, 24)))
      b.add(WALL, extrude(s, Math.abs(x1 - xb), 24), mat(xb, 0, 0, -Math.PI / 2))
      // painted loggia interior (frescoed back wall and vault)
      b.add('fresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 11.0, 9.1, 0, 8.6, 24))), mat(xb - 0.02, 0, 0, -Math.PI / 2))
      // archivolt
      b.add('trim', extrude(frameShape('round', 11.0, 9.1, 0.55, 0, 8.6), 0.2, 24), mat(x1, 0, 0, -Math.PI / 2))
      b.add('trim', metricBox(0.25, 0.8, 1.1), mat(x1 - 0.12, 17.6, 0))
      // loggia balcony + balustrade
      b.add(WALL, metricBox(0.9, 0.35, 11.2), mat(x1 - 0.3, 8.42, 0))
      balustrade(b, V(x1 - 0.3, 8.6, -5.4), V(x1 - 0.3, 8.6, 5.4), 1.05, 0.34)
      // ground floor: arched portal and two windows
      door(b, '-x', x1, 0, { w: 2.6, h: 4.8, type: 'round', frame: 0.4, frameKey: 'trim', y0: 0.9 })
      for (const z of [-3.6, 3.6]) window_(b, '-x', x1, U('-x', x1, z), 2.8, { type: 'round', w: 1.4, h: 3.0, frame: 0.25, frameKey: 'trim', bars: [2, 3], sill: true })
      // aedicule with relief, segmental pediment and cross above the main cornice
      b.block(WALL, 1.6, 3.6, 6.8, x1 + 0.55, H.cornice, 0)
      b.add('stoneLight', metricBox(0.1, 2.4, 4.0), mat(x1 - 0.27, H.cornice + 1.75, 0))
      for (const z of [-2.85, 2.85]) b.add(WALL, metricBox(0.25, 3.6, 0.6), mat(x1 - 0.3, H.cornice + 1.8, z))
      const seg = new THREE.Shape(opening('segment', 7.4, 1.6, 0, 0, 16))
      b.add('trim', extrude(seg, 1.8, 16), mat(x1 + 1.45, H.cornice + 3.55, 0, -Math.PI / 2))
      b.add(WALL, metricBox(1.4, 1.1, 1.6), mat(x1 + 0.6, H.cornice + 3.55 + 1.6 + 0.4, 0))
      rayCross(b, x1 + 0.6, H.cornice + 3.55 + 1.6 + 0.95, 0, 2.6, Math.PI / 2)
      for (const s of [-1, 1]) balustrade(b, V(x1 + 0.4, H.cornice + 0.06, s * 3.5), V(x1 + 0.4, H.cornice + 0.06, s * 6.7), 1.0)
      // two small copper domes flanking the aedicule
      for (const s of [-1, 1]) {
        const dx = -24.0
        const dz = s * 5.1
        b.add(WALL, new THREE.CylinderGeometry(1.15, 1.15, 1.7, 24), mat(dx, H.cornice + 0.85, dz))
        b.add('trim', new THREE.CylinderGeometry(1.32, 1.32, 0.25, 24), mat(dx, H.cornice + 1.7, dz))
        dome(b, CUD, { x: dx, y: H.cornice + 1.82, z: dz, r: 1.25, h: 1.35, profile: 'hemi', seg: 24, ribs: 8, ribH: 0.04 })
        b.add(CUD, new THREE.SphereGeometry(0.16, 10, 8), mat(dx, H.cornice + 3.3, dz))
      }
    }
    entablature(b, cx, 0, w, d, sx > 0)
    // hipped copper roof over the end bay
    hippedRoof(b, CU, { x: sx * 20.9, z: 0, w: 8.6, d: d - 0.2, y: H.cornice + 0.05, pitch: 30, overhang: 0.15, seams: SEAM })
  }

  /* ======== −X side porches (tetrastyle, on the tower bases) ======== */
  for (const sz of [-1, 1]) {
    const zc = sz * TW.z
    const xf = -27.9
    b.block('stoneLight', 2.6, 0.9, 10.6, -26.6, 0, zc)
    for (const dz of [-4.1, -2.1, 2.1, 4.1]) column(b, xf + 0.55, zc + dz, 0.9, 9.6, 0.42)
    // entablature, pediment, metal-capped raking cornices
    b.block(WALL, 2.3, 1.4, 10.2, -26.75, 10.5, zc)
    b.add('trim', metricBox(2.5, 0.3, 10.5), mat(-26.75, 11.75, zc))
    const ped = new THREE.Shape([new THREE.Vector2(-5.25, 0), new THREE.Vector2(5.25, 0), new THREE.Vector2(0, 2.55)])
    b.add(WALL, extrude(ped, 2.3), mat(-25.6, 11.9, zc, -Math.PI / 2))
    for (const s of [-1, 1]) facet(b, 'helm', [V(xf - 0.05, 11.9, zc + s * 5.35), V(-25.6, 11.9, zc + s * 5.35), V(-25.6, 14.5, zc), V(xf - 0.05, 14.5, zc)], { thickness: 0.08 })
    window_(b, '-x', xf, U('-x', 0, zc), 12.4, { type: 'round', w: 0.9, h: 0.9, frame: 0.12, frameKey: 'trim' })
  }
  // podium / steps along the −X front
  b.block('stoneLight', 2.3, 0.6, 13.6, -26.75, 0, 0)

  /* ======== +X hexastyle portico ======== */
  {
    const xw = CB.x1
    const xf = 28.1
    b.block('stoneLight', xf - xw, 1.2, 15.4, (xf + xw) / 2, 0, 0)
    for (const z of [-6.55, -3.93, -1.31, 1.31, 3.93, 6.55]) column(b, xf - 0.65, z, 1.2, 9.4, 0.5)
    b.block(WALL, xf - xw, 1.4, 15.0, (xf + xw) / 2, 10.6, 0)
    b.add('trim', metricBox(xf - xw + 0.3, 0.3, 15.4), mat((xf + xw) / 2, 11.85, 0))
    const ped = new THREE.Shape([new THREE.Vector2(-7.7, 0), new THREE.Vector2(7.7, 0), new THREE.Vector2(0, 3.45)])
    b.add(WALL, extrude(ped, xf - xw + 0.15), mat(xw, 12.0, 0, Math.PI / 2))
    for (const s of [-1, 1]) facet(b, 'helm', [V(xf + 0.2, 12.0, s * 7.8), V(xw, 12.0, s * 7.8), V(xw, 15.5, 0), V(xf + 0.2, 15.5, 0)], { thickness: 0.08 })
    b.add('trim', new THREE.TorusGeometry(0.55, 0.08, 6, 20), mat(xf + 0.17, 13.4, 0, Math.PI / 2))
    // wall behind the columns: two arched windows, blind niches, door
    for (const z of [-2.6, 2.6]) window_(b, '+x', xw, U('+x', xw, z), 4.6, { type: 'round', w: 1.4, h: 4.0, frame: 0.22, frameKey: 'trim', bars: [2, 4] })
    for (const z of [-5.2, 5.2]) window_(b, '+x', xw, U('+x', xw, z), 3.2, { type: 'round', w: 1.6, h: 5.0, frame: 0.18, frameKey: 'trim', glassKey: 'plasterGrey' })
    door(b, '+x', xw, 0, { w: 2.2, h: 4.4, type: 'rect', frame: 0.3, frameKey: 'trim', y0: 1.2 })
    // inscription bands under the main cornice
    b.add('black', metricBox(0.06, 0.55, 9.0), mat(xw + 0.04, 18.9, 0))
    b.add('black', metricBox(0.06, 0.55, 7.6), mat(xw + 0.04, 18.1, 0))
    // tall attic with relief, inscription and cross pedestal
    b.block(WALL, 1.4, 4.2, 10.8, xw - 0.5, H.cornice, 0)
    b.add('stoneLight', metricBox(0.12, 2.0, 8.4), mat(xw + 0.25, H.cornice + 1.6, 0))
    b.add('black', metricBox(0.06, 0.4, 6.6), mat(xw + 0.23, H.cornice + 3.25, 0))
    b.add(WALL, metricBox(1.8, 0.45, 11.4), mat(xw - 0.5, H.cornice + 4.4, 0))
    b.add('helm', metricBox(1.84, 0.05, 11.44), mat(xw - 0.5, H.cornice + 4.65, 0))
    b.block(WALL, 1.4, 1.6, 2.6, xw - 0.5, H.cornice + 4.65, 0)
    b.block(WALL, 1.6, 0.3, 2.9, xw - 0.5, H.cornice + 6.25, 0)
    rayCross(b, xw - 0.5, H.cornice + 6.55, 0, 3.0, Math.PI / 2)
  }

  /* ======== towers ======== */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(b, sx * TW.x, sz * TW.z)

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-6, 28.5, 4.5],
  materials: (base) => {
    // KME copper as photographed: aged dark brown (domes slightly mauve, nave roof greyer),
    // the low aisle strips already turning green-brown.
    const cu = (tint: string, metalness: number, roughness: number) => {
      const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
      m.color = new THREE.Color(tint)
      m.metalness = metalness
      m.roughness = roughness
      return m
    }
    return {
      cuDome: cu('#8e8590', 0.8, 0.45),
      cuRoof: cu('#8a8a92', 0.7, 0.55),
      cuAisle: cu('#b9c2a6', 0.5, 0.6),
      fresco: new THREE.MeshStandardMaterial({ color: '#a9875e', roughness: 0.85 }),
    }
  },
  notes: 'Metropolitan Cathedral of Iași: four towers with ribbed copper domes, steep copper nave roof with cresting, painted loggia (−X) and hexastyle portico (+X). Storey heights, roof pitch and tower spacing estimated from photographs; reliefs, capitals and rustication simplified.',
}

export default model
