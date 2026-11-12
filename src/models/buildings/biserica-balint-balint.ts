/**
 * Orthodox church «Învierea Domnului», Balinț (Timiș) — 1890, OSM node
 * 2424275140 (no building outline).
 *
 * Modelling specification (real metres, +X = liturgical east = the apse,
 * ≈ 72° — roof axis measured on Esri World Imagery around the OSM node;
 * the west front with the tower faces the village street):
 *  - Banat village hall church of the late 19th century: rectangular nave
 *    9.6 m wide and a full-width semicircular altar apse; overall length ≈
 *    18.6 m (walls) — the satellite image shows a ≈ 19.3 × 10.6 m light-grey
 *    roof including eaves; heights scaled from the door (≈ 2.9 m with
 *    transom) in the April 2012 Commons photo of the west front.
 *  - West front (photo 01): tower built into the façade as a shallow
 *    risalit; corner pilasters and broad pilasters flanking the central bay;
 *    white double door with transom under a large round-headed icon niche;
 *    two smaller icon niches in the outer bays; main cornice at ≈ 6.8 m;
 *    baroque gable wings with concave-convex shoulders rising to the tower.
 *  - Tower: lower stage with an oculus up to ≈ 10.7 m, narrower belfry stage
 *    with corner pilasters, one round-arched louvred opening and a clock per
 *    face, cornice raised into a segmental arch over each clock; octagonal
 *    baroque helm (bell, louvred lantern, onion, needle, ball and cross).
 *  - Nave sides (not photographed): three tall round-headed windows between
 *    pilasters per side, two in the apse — the regional type.
 *  - METAL: the 2012 photograph predates the works. COLOR METAL supplied
 *    elZinc natural titanium-zinc (2022) according to its records, so the
 *    nave and apse roofs and the tower helm are shown in natural zinc
 *    ('zincNatural') with standing seams ≈ 0.5 m (the 2012 helm was already
 *    light-grey sheet metal). Which surfaces were done is not documented.
 * Approximations: footprint (no OSM outline: satellite + photo scale),
 * all heights (one frontal photo, perspective-corrected), side and apse
 * elevations from the regional type, helm profile simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, polyRing, cross, faceFrame, seams } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XW = -9.3 // west façade
const HW = 4.8 // nave half width
const XA = 4.5 // apse centre (full-width semicircular apse)
const AR = HW // apse radius
const EAVE = 6.8
const PITCH = 40 * D2R
const TP = Math.tan(PITCH)
const RIDGE = EAVE + HW * TP
const OV = 0.45
const TW = { hw: 1.85, x0: XW - 0.25, x1: XW + 3.45, top1: 10.7, hwU: 1.72, top2: 15.8 }
const TX = (TW.x0 + TW.x1) / 2

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.04)
const WALL = 'balWall'
const TRIM = 'balTrim'

function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, o: { fill?: string; frame?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  const f = o.frame ?? 0.18
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, 0, y0), 0.08), m)
  if (o.sill !== false) b.add(TRIM, metricBox(w + 2 * f + 0.15, 0.1, 0.18), M(m, mat(0, y0 - f, 0.08)))
}

function pilaster(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.14, key = TRIM) {
  b.add(key, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave + apse walls ---------------- */
  const nl = XA - XW
  b.block(WALL, nl, EAVE, HW * 2, (XW + XA) / 2, 0, 0)
  b.add(WALL, new THREE.CylinderGeometry(AR, AR, EAVE, 40, 1, false, 0, Math.PI), mat(XA, EAVE / 2, 0))
  // plinth
  b.block('socle', nl + 0.16, 0.6, HW * 2 + 0.16, (XW + XA) / 2, 0, 0)
  b.add('socle', new THREE.CylinderGeometry(AR + 0.08, AR + 0.08, 0.6, 40, 1, false, 0, Math.PI), mat(XA, 0.3, 0))
  // main cornice (profiled: two steps)
  b.block(TRIM, nl, 0.22, HW * 2 + 0.3, (XW + XA) / 2, EAVE - 0.55, 0)
  b.block(TRIM, nl, 0.2, HW * 2 + 0.5, (XW + XA) / 2, EAVE - 0.33, 0)
  b.add(TRIM, new THREE.CylinderGeometry(AR + 0.15, AR + 0.15, 0.22, 40, 1, false, 0, Math.PI), mat(XA, EAVE - 0.44, 0))
  b.add(TRIM, new THREE.CylinderGeometry(AR + 0.25, AR + 0.25, 0.2, 40, 1, false, 0, Math.PI), mat(XA, EAVE - 0.23, 0))

  /* ---------------- side elevations ---------------- */
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * HW, s > 0 ? x : -x)
    for (const x of [-5.1, -1.0, 3.0]) win(b, at(x), 1.2, 2.9, 2.5)
    for (const x of [XW + 0.3, -7.05, -3.05, 1.0, XA - 0.2]) pilaster(b, at(x), 0, 0.55, 0.6, EAVE - 0.55)
    // gutter + downpipes
    b.rod(ZN, V(XW - 0.3, EAVE - OV * TP - 0.1, s * (HW + OV + 0.05)), V(XA, EAVE - OV * TP - 0.1, s * (HW + OV + 0.05)), 0.075, 8)
    b.rod(ZN, V(XW + 0.75, 0.3, s * (HW + 0.15)), V(XW + 0.75, EAVE - 0.45, s * (HW + 0.15)), 0.055, 8)
    b.rod(ZN, V(XA - 0.5, 0.3, s * (HW + 0.15)), V(XA - 0.5, EAVE - 0.45, s * (HW + 0.15)), 0.055, 8)
  }
  // apse: pilasters and two windows
  for (const a of [35, 90, 145]) {
    const r = a * D2R
    pilaster(b, mat(XA + AR * Math.sin(r), 0, AR * Math.cos(r), r), 0, 0.55, 0.6, EAVE - 0.55)
  }
  for (const a of [62, 118]) {
    const r = a * D2R
    win(b, mat(XA + AR * Math.sin(r), 0, AR * Math.cos(r), r), 1.1, 2.6, 2.7)
  }

  /* ---------------- west front ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    const mt = faceFrame('-x', TW.x0, 0)
    // corner pilasters and outer-bay pilasters
    for (const u of [-HW + 0.28, HW - 0.28]) pilaster(b, m, u, 0.56, 0.6, EAVE - 0.55, 0.16)
    // icon niches in the outer bays
    for (const u of [-3.0, 3.0]) {
      win(b, M(m, mat(u, 0, 0)), 1.0, 2.2, 3.6, { fill: 'balIcon', frame: 0.14 })
      // small canopy over the lamps / plaque below
      b.add(TRIM, metricBox(0.5, 0.5, 0.14), M(m, mat(u + 0.75 * Math.sign(u) * -1, 2.75, 0.07)))
    }
    // tower risalit (projects 0.25 m): broad pilasters flanking the central bay
    b.add(WALL, metricBox(TW.hw * 2, EAVE, 0.25), M(m, mat(0, EAVE / 2, -0.125 + 0.25)))
    for (const u of [-1.4, 1.4]) pilaster(b, mt, u, 0.9, 0.6, EAVE - 0.55, 0.14)
    // central icon niche and door
    win(b, mt, 1.9, 2.5, 3.55, { fill: 'balIcon', frame: 0.16 })
    b.add('balDoor', metricBox(1.5, 2.45, 0.06), M(mt, mat(0, 0.6 + 1.225, 0.03)))
    b.add('glassC', metricBox(1.5, 0.42, 0.05), M(mt, mat(0, 0.6 + 2.45 + 0.25, 0.03)))
    b.add(TRIM, extrude(frameShape('rect', 1.5, 2.95, 0.14, 0, 0.6), 0.1), mt)
    for (const u of [-0.38, 0.38]) b.add('glassC', metricBox(0.5, 1.6, 0.04), M(mt, mat(u, 1.95, 0.07)))
    // entrance step
    b.block('socle', 2.4, 0.3, 1.1, TW.x0 - 0.55, 0, 0)
    // cornice across the façade (returns around the risalit)
    b.block(TRIM, 0.5, 0.42, HW * 2 + 0.5, XW - 0.12, EAVE - 0.55, 0)
    b.block(TRIM, 0.6, 0.42, TW.hw * 2 + 0.3, TW.x0 - 0.05, EAVE - 0.55, 0)
    // baroque gable wings (concave–convex shoulders) up to the tower
    const g: [number, number][] = [
      [-HW, EAVE - 0.02],
      [-HW, EAVE + 1.0],
      [-4.35, EAVE + 1.12],
      [-3.85, EAVE + 1.35],
      [-3.4, EAVE + 1.75],
      [-2.95, EAVE + 2.05],
      [-2.45, EAVE + 2.25],
      [-TW.hw, EAVE + 2.8],
    ]
    for (const sg of [-1, 1]) {
      const pts = sg < 0 ? [...g, [-TW.hw, EAVE - 0.02] as [number, number]] : [...g.map(([u, y]) => [-u, y] as [number, number]), [TW.hw, EAVE - 0.02] as [number, number]].reverse()
      const shape = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u, y)))
      b.add(WALL, extrude(shape, 0.5), M(m, mat(0, 0, -0.5)))
      for (let i = 0; i < g.length - 1; i++) {
        const [u1, y1] = g[i]
        const [u2, y2] = g[i + 1]
        b.beam(TRIM, V(XW + 0.05, y1 + 0.07, -sg * u1), V(XW + 0.05, y2 + 0.07, -sg * u2), 0.16, 0.62, V(1, 0, 0))
      }
    }
  }

  /* ---------------- tower ---------------- */
  {
    const hw = TW.hw
    // lower stage (above the façade cornice), embedded in the nave roof
    b.block(WALL, TW.x1 - TW.x0, TW.top1 - EAVE, hw * 2, TX, EAVE, 0)
    // cornice between stages
    b.block(TRIM, TW.x1 - TW.x0 + 0.45, 0.22, hw * 2 + 0.45, TX, TW.top1 - 0.2, 0)
    b.block(TRIM, TW.x1 - TW.x0 + 0.65, 0.18, hw * 2 + 0.65, TX, TW.top1 + 0.02, 0)
    // oculus on the lower stage (west and side faces above the roof)
    for (const face of ['-x', '+z', '-z'] as const) {
      const plane = face === '-x' ? TW.x0 : face === '+z' ? hw : -hw
      const m = faceFrame(face, plane, face === '+z' ? TX : face === '-z' ? -TX : 0)
      if (face !== '-x') continue
      b.add('balLouvre', new THREE.CircleGeometry(0.42, 24), M(m, mat(0, 9.15, 0.03)))
      b.add(TRIM, new THREE.TorusGeometry(0.5, 0.09, 6, 24), M(m, mat(0, 9.15, 0.06)))
    }
    // upper (belfry) stage
    const hu = TW.hwU
    const y1 = TW.top1 + 0.2
    b.block(WALL, hu * 2, TW.top2 - y1, hu * 2, TX, y1, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? TX + (face[0] === '+' ? hu : -hu) : face[0] === '+' ? hu : -hu
      const u = face === '+z' ? TX : face === '-z' ? -TX : 0
      const m = faceFrame(face, plane, u)
      for (const su of [-1, 1]) pilaster(b, m, su * (hu - 0.25), 0.5, y1, TW.top2 - 0.1, 0.12)
      // louvred round-headed opening
      win(b, m, 0.85, 1.65, 11.75, { fill: 'balLouvre', frame: 0.16 })
      for (let y = 11.95; y < 13.0; y += 0.2) b.add(TRIM, metricBox(0.85, 0.04, 0.06), M(m, mat(0, y, 0.05)))
      // clock
      b.add('white', new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), M(m, mat(0, 14.45, 0.04, 0, Math.PI / 2)))
      b.add('clock', new THREE.CylinderGeometry(0.36, 0.36, 0.06, 24), M(m, mat(0, 14.45, 0.06, 0, Math.PI / 2)))
      b.add('white', metricBox(0.05, 0.28, 0.03), M(m, mat(0, 14.55, 0.1)))
      b.add('white', metricBox(0.2, 0.05, 0.03), M(m, mat(0.08, 14.45, 0.1)))
      // cornice raised into a segmental arch over the clock
      const eb = new THREE.Shape()
      eb.moveTo(-hu - 0.18, 0)
      eb.lineTo(hu + 0.18, 0)
      eb.lineTo(hu + 0.18, 0.32)
      eb.lineTo(0.75, 0.32)
      eb.quadraticCurveTo(0, 0.95, -0.75, 0.32)
      eb.lineTo(-hu - 0.18, 0.32)
      eb.lineTo(-hu - 0.18, 0)
      b.add(TRIM, extrude(eb, 0.32, 10), M(m, mat(0, TW.top2 - 0.05, -0.14)))
    }
    b.block(TRIM, hu * 2 + 0.25, 0.3, hu * 2 + 0.25, TX, TW.top2 - 0.05, 0)

    /* octagonal baroque helm in natural titanium-zinc */
    const y0 = TW.top2 + 0.25
    const st: [number, number][] = [
      [2.1, y0],
      [1.82, y0 + 0.22],
      [1.52, y0 + 0.5],
      [1.44, y0 + 0.78],
      [1.55, y0 + 1.05],
      [1.42, y0 + 1.32],
      [1.05, y0 + 1.55],
      [0.74, y0 + 1.66],
    ]
    helm(b, ZN, { x: TX, z: 0, n: 8, stations: st })
    const rings = st.map(([r, yy]) => polyRing(8, r + 0.015, yy, Math.PI / 8, TX, 0))
    for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 1; i++) b.beam(ZN, rings[i][k], rings[i + 1][k], 0.06, 0.05)
    // lantern with arched openings
    const ly = y0 + 1.66
    const lh = 1.15
    const lr = 0.74
    b.add(TRIM, new THREE.CylinderGeometry(lr, lr, lh, 8, 1, false, Math.PI / 8 - Math.PI / 2), mat(TX, ly + lh / 2, 0))
    for (let j = 0; j < 8; j += 2) {
      const a = (j * Math.PI) / 4
      const ap = lr * Math.cos(Math.PI / 8)
      const m = mat(TX + ap * Math.cos(a), 0, ap * Math.sin(a), Math.PI / 2 - a)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.32, 0.75, 0, ly + 0.2, 8))), M(m, mat(0, 0, 0.02)))
    }
    const st2: [number, number][] = [
      [0.92, ly + lh],
      [0.8, ly + lh + 0.14],
      [0.42, ly + lh + 0.3],
      [0.5, ly + lh + 0.45],
      [0.62, ly + lh + 0.65],
      [0.56, ly + lh + 0.88],
      [0.32, ly + lh + 1.08],
      [0.1, ly + lh + 1.25],
      [0.05, ly + lh + 1.6],
    ]
    helm(b, ZN, { x: TX, z: 0, n: 8, stations: st2 })
    const ty = ly + lh + 1.6
    b.add('gilt', new THREE.SphereGeometry(0.16, 12, 8), mat(TX, ty + 0.05, 0))
    cross(b, 'gilt', TX, ty + 0.05, 0, 1.4, false, Math.PI / 2)
  }

  /* ---------------- roofs (natural titanium-zinc standing seam) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = HW + OV
    const xa = XW + 0.4
    const xb = XA
    facet(b, ZN, [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ZN, [V(xb, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ZN, V(xa, RIDGE + 0.05, 0), V(xb, RIDGE + 0.05, 0), 0.24, 0.12)
    // half cone over the apse, apex on the ridge
    const apex = V(XA, RIDGE, 0)
    const n = 24
    const ring: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      ring.push(V(XA + Math.sin(a) * (AR + OV), ye, Math.cos(a) * (AR + OV)))
    }
    for (let i = 0; i < n; i++) {
      facet(b, ZN, [ring[i], ring[i + 1], apex], { thickness: 0.1 })
      if (i % 2 === 0) b.beam(ZN, ring[i].clone().add(V(0, 0.03, 0)), apex.clone().add(V(0, 0.03, 0)), 0.045, 0.045)
      b.rod(ZN, ring[i].clone().add(V(0, -0.1, 0)), ring[i + 1].clone().add(V(0, -0.1, 0)), 0.075, 8)
    }
    // ridge finial: small cross over the apse
    b.add(ZN, new THREE.ConeGeometry(0.16, 0.5, 8), mat(XA, RIDGE + 0.2, 0))
    cross(b, 'gilt', XA, RIDGE + 0.4, 0, 1.0, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-1, 8.6, 2.6],
  materials: () => ({
    balWall: new THREE.MeshStandardMaterial({ color: '#d4cec2', roughness: 0.9 }),
    balTrim: new THREE.MeshStandardMaterial({ color: '#e6e2d8', roughness: 0.86 }),
    balIcon: new THREE.MeshStandardMaterial({ color: '#b48a4e', roughness: 0.6, metalness: 0.1 }),
    balLouvre: new THREE.MeshStandardMaterial({ color: '#8e3a2c', roughness: 0.7 }),
    balDoor: new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.5 }),
  }),
  notes: 'No OSM outline: footprint from satellite imagery and the photo scale; only the west front photographed (2012); roof and helm shown in the natural titanium-zinc supplied by COLOR METAL according to its records.',
}
export default model
