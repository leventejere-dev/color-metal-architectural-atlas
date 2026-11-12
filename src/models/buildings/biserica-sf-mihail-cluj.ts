/**
 * St. Michael's Roman Catholic Church (Biserica Sf. Mihail / Szent Mihály-templom),
 * Piața Unirii, Cluj-Napoca — OSM relation 12141980.
 *
 * Modelling specification (real metres) from the nine reference photographs
 * (drone shots 01–07 over Piața Unirii, 08 from the north, 09 south elevation),
 * calibrated on the OSM outline (72 × 45 m incl. tower, long axis 76°) and the
 * published dimensions (nave 50 × 24 m inside, choir 20 × 10 m, tower 76 m /
 * 80 m with the cross):
 *  - Gothic HALL (nave + aisles under one roof): 55 × 28.8 m outside, walls
 *    ~17.5 m to the eaves (photos 06–09 against the 80 m tower), light
 *    sandstone with a grey frieze under the eaves cornice. One huge HIPPED tile
 *    roof (~50°, ridge ≈ 34.7 m, both ends hipped — photos 07, 08, 09), small
 *    grey metal dormers, grey metal hips/valleys and gutters.
 *  - South elevation (Piața Unirii, photo 09): west bay with a high window,
 *    polygonal stair turret with a stone pyramid cap at the second buttress,
 *    four nave bays with wide traceried windows, the south portal under the
 *    third, two tall narrow windows in the east chapel bay; tall two-stage
 *    buttresses, diagonal at the corners.
 *  - West front: main portal between two deep buttresses, large window above.
 *  - CHOIR: 12.5 m wide, 5/8 apse, tall narrow lancets, radial buttresses;
 *    steeper (60°) tile roof with a lower ridge, running into the east hip of
 *    the hall roof (grey valleys, photo 01). Its axis follows the OSM outline,
 *    ~2.9 m south of the hall axis.
 *  - ROOF TURRET on the choir ridge just west of the apse (photos 01–04, 09):
 *    square shaft clad in brown copper with an arched louvred opening per face,
 *    bell-cast pyramid cap, onion, finial and cross in green-patinated copper.
 *    COLOR METAL supplied copper sheet for this church; the turret is the copper
 *    element visible in the photographs (MATERIAL view).
 *  - NEO-GOTHIC TOWER on the north side (photos 05–08): ~10.8 m square body
 *    with paired stepped corner buttresses up to the gallery (~35 m), pointed
 *    windows and oculi; pierced gallery parapet; narrower belfry stage with
 *    tall twin-light openings under gables (wimpergs), diagonal pinnacled
 *    buttresses, clock faces (~51 m), corbelled cornice + parapet with corner
 *    pinnacles (~55 m); dark octagonal spire with small lucarnes to 76 m;
 *    gilded cross to 80 m.
 *  - Low sacristy east of the tower (photos 06, 08) with a grey metal roof.
 * Approximations: eaves/ridge heights and roof pitches measured from photos;
 * bay positions partly from the OSM outline; window tracery, portals, frieze
 * and pinnacles simplified; the sacristy outline (OSM shows a notch there) and
 * the north elevation east of the tower are interpreted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, rectRing, hipRoof, gableRoof, helm, cross, seams } from '../kit'
import type { ModelModule } from '../registry'

/* ---------- frame: OSM-aligned (x east along the 76° axis, z = south) ---------- */
/** shift that puts the OSM footprint bounding-box centre at the origin */
const OX = 0.92
const OZ = 4.98

const D2R = Math.PI / 180
const tan = (d: number) => Math.tan(d * D2R)

const HALL = { x0: -34, x1: 21, zc: 0.4, hw: 14.4, h: 17.5, pitch: 50 }
const HXC = (HALL.x0 + HALL.x1) / 2
const HL = HALL.x1 - HALL.x0
const ZS = HALL.zc + HALL.hw // south wall plane
const ZN = HALL.zc - HALL.hw // north wall plane

const CH = { x0: HALL.x1, xEnd: 35, zc: 3.3, hw: 6.25, h: 17.5, pitch: 60 }
const RC = CH.hw / Math.sin(67.5 * D2R) // circumradius of the apse octagon
const XC = CH.xEnd - CH.hw // apse centre (east face at xEnd)
const C_RIDGE = CH.h + CH.hw * tan(CH.pitch)

const TW = { x: 0.7, hw: 5.4, z0: ZN } // tower body touching the hall's north wall
const TZ = TW.z0 - TW.hw
const BELL = { y0: 35, hw: 4.3, top: 54 }

const TURRET_X = XC - 1.6

const v2 = (x: number, y: number) => new THREE.Vector2(x, y)
const on = (m: THREE.Matrix4, l: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(m, l)
type V3 = THREE.Vector3

/* ---------------- wall frames (local x along the wall, y up, z outward) ---------------- */
const fS = (x: number, z = ZS) => mat(x, 0, z, 0)
const fN = (x: number, z = ZN) => mat(x, 0, z, Math.PI)
const fE = (x: number, z: number) => mat(x, 0, z, Math.PI / 2)
const fW = (x: number, z: number) => mat(x, 0, z, -Math.PI / 2)

/** Pointed Gothic window: moulded surround, dark glazing, mullions, tracery ring, sill. */
function gWindow(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, lights = 2, glass = 'glassC') {
  b.add('smStone', extrude(frameShape('pointed', w, h, 0.28, 0, y0), 0.24), m)
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10))), on(m, mat(0, 0, 0.05)))
  const hs = h - w * 0.8
  for (let i = 1; i < lights; i++) b.add('smStone', metricBox(0.13, hs, 0.14), on(m, mat(-w / 2 + (i * w) / lights, y0 + hs / 2, 0.11)))
  if (w > 1.6) b.add('smStone', new THREE.TorusGeometry(w * 0.2, 0.07, 5, 14), on(m, mat(0, y0 + h - w * 0.56, 0.11)))
  b.add('smStone', metricBox(w + 0.7, 0.2, 0.42), on(m, mat(0, y0 - 0.32, 0.14)))
}

/** Pointed portal with stepped (moulded) jambs. */
function portal(b: Builder, m: THREE.Matrix4, w: number, h: number, rings = 3) {
  for (let i = 0; i < rings; i++) {
    const ww = w + i * 0.5
    b.add(i % 2 ? 'smStoneDark' : 'smStone', extrude(frameShape('pointed', ww, h + i * 0.35, 0.26, 0, 0), 0.5 - i * 0.12), on(m, mat(0, 0, 0)))
  }
  b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, 0, 10))), on(m, mat(0, 0, 0.04)))
}

/** Stepped Gothic buttress at p on a wall with outward normal n; steps = [depth, topY][]. */
function buttress(b: Builder, p: V3, n: V3, w: number, steps: [number, number][], key = 'smStone') {
  const pts = [v2(-0.3, 0), v2(steps[0][0], 0)]
  steps.forEach(([d, y], i) => {
    pts.push(v2(d, y))
    const next = steps[i + 1]
    if (next) pts.push(v2(next[0], y + 0.7 * (d - next[0]) + 0.25))
  })
  const [dl, yl] = steps[steps.length - 1]
  pts.push(v2(-0.3, yl + dl * 1.1))
  const up = V(0, 1, 0)
  const nn = n.clone().normalize()
  const t = V().crossVectors(nn, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(nn, up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(w / 2)))
  b.add(key, extrude(new THREE.Shape(pts), w), basis)
  // plinth
  const pb = new THREE.Matrix4().makeBasis(nn, up, t).setPosition(p.clone().add(nn.clone().multiplyScalar(steps[0][0] / 2)).add(V(0, 0.6, 0)))
  b.add('smStoneDark', metricBox(steps[0][0] + 0.25, 1.2, w + 0.25), pb)
}

/** Square pinnacle: shaft + 4-sided spirelet + knob. */
function pinnacle(b: Builder, x: number, z: number, y0: number, s: number, shaft: number, cone: number, ry = 0) {
  b.add('smStone', metricBox(s, shaft, s), mat(x, y0 + shaft / 2, z, ry))
  b.add('smStone', new THREE.ConeGeometry(s * 0.72, cone, 4, 1), mat(x, y0 + shaft + cone / 2, z, Math.PI / 4 + ry))
  b.add('smStone', new THREE.SphereGeometry(s * 0.16, 8, 6), mat(x, y0 + shaft + cone, z))
}

/** Pierced parapet (rails + posts) around a square at height y. */
function parapet(b: Builder, cx: number, cz: number, hw: number, y: number, h = 1.0) {
  for (const s of [-1, 1]) {
    b.add('smStone', metricBox(2 * hw + 0.25, 0.22, 0.28), mat(cx, y + h - 0.11, cz + s * hw))
    b.add('smStone', metricBox(0.28, 0.22, 2 * hw + 0.25), mat(cx + s * hw, y + h - 0.11, cz))
    b.add('smStone', metricBox(2 * hw, 0.25, 0.32), mat(cx, y + 0.12, cz + s * hw))
    b.add('smStone', metricBox(0.32, 0.25, 2 * hw), mat(cx + s * hw, y + 0.12, cz))
    const n = Math.round((2 * hw) / 0.55)
    for (let i = 0; i <= n; i++) {
      const u = -hw + (i * 2 * hw) / n
      b.add('smStone', metricBox(0.14, h, 0.2), mat(cx + u, y + h / 2, cz + s * hw))
      b.add('smStone', metricBox(0.2, h, 0.14), mat(cx + s * hw, y + h / 2, cz + u))
    }
  }
}

/** Small grey-metal gabled dormer on a roof slope (front facing outward along n = ±z). */
function dormer(b: Builder, x: number, zFront: number, side: 1 | -1, yBase: number) {
  const w = 1.3
  const h = 1.25
  const d = 2.4
  const zc = zFront - side * (d / 2)
  b.add('helm', metricBox(w, h, d), mat(x, yBase + h / 2, zc))
  const ry = yBase + h + 0.7
  const zb = zFront - side * d
  facet(b, 'helm', [V(x - w / 2 - 0.12, yBase + h, zFront + side * 0.1), V(x - w / 2 - 0.12, yBase + h, zb), V(x, ry, zb), V(x, ry, zFront + side * 0.1)], { thickness: 0.05 })
  facet(b, 'helm', [V(x + w / 2 + 0.12, yBase + h, zb), V(x + w / 2 + 0.12, yBase + h, zFront + side * 0.1), V(x, ry, zFront + side * 0.1), V(x, ry, zb)], { thickness: 0.05 })
  const tri = new THREE.Shape([v2(-w / 2, 0), v2(w / 2, 0), v2(0, 0.7)])
  b.add('helm', extrude(tri, 0.06), mat(x, yBase + h, zFront - side * 0.06, side > 0 ? 0 : Math.PI))
  b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.55, 0.95, 0, 0.12, 6))), mat(x, yBase, zFront + side * 0.01, side > 0 ? 0 : Math.PI))
}


/** Tile roof face: planar facet + faint horizontal tile courses (darker strips) clipped to the polygon. */
function tileFace(b: Builder, pts: V3[], spacing = 0.62) {
  facet(b, 'smTile', pts, { thickness: 0.12 })
  let n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.y < 0) n = n.negate()
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of pts) {
    y0 = Math.min(y0, p.y)
    y1 = Math.max(y1, p.y)
  }
  for (let y = y0 + spacing * 0.6; y < y1 - spacing * 0.3; y += spacing) {
    const hits: V3[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if ((a.y - y) * (c.y - y) < 0) hits.push(a.clone().lerp(c, (y - a.y) / (c.y - a.y)))
    }
    if (hits.length < 2) continue
    const off = n.clone().multiplyScalar(0.025)
    b.beam('smTileDk', hits[0].clone().add(off), hits[1].clone().add(off), 0.07, 0.035, n)
  }
}

/* ------------------------------------------------------------------ */
/* Copper roof turret (COLOR METAL copper)                             */
/* ------------------------------------------------------------------ */
function roofTurret(b: Builder, x: number, z: number, yR: number) {
  // saddle flashing where the shaft meets the steep choir ridge (patinated)
  b.add('copperPatina', loft([rectRing(1.45, 1.3, yR - 2.3, x, z), rectRing(0.98, 0.98, yR + 0.8, x, z)], { capTop: true, flat: true }))
  // shaft clad in brown copper
  const s = 0.85
  const top = yR + 5.0
  b.add('copperBrown', metricBox(2 * s, top - (yR - 1), 2 * s), mat(x, (top + yR - 1) / 2, z))
  // vertical seams on the shaft
  for (const f of [-1, 1]) {
    for (const u of [-0.55, 0, 0.55]) {
      b.add('copperBrown', metricBox(0.04, top - yR - 1, 0.05), mat(x + u, (top + yR + 1) / 2, z + f * (s + 0.02)))
      b.add('copperBrown', metricBox(0.05, top - yR - 1, 0.04), mat(x + f * (s + 0.02), (top + yR + 1) / 2, z + u))
    }
  }
  // arched louvred openings, one per face
  const faces = [mat(x, 0, z + s, 0), mat(x, 0, z - s, Math.PI), mat(x + s, 0, z, Math.PI / 2), mat(x - s, 0, z, -Math.PI / 2)]
  for (const m of faces) {
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.66, 1.55, 0, yR + 1.9, 10))), on(m, mat(0, 0, 0.03)))
    b.add('copperBrown', extrude(frameShape('round', 0.66, 1.55, 0.1, 0, yR + 1.9), 0.08), m)
    for (let i = 0; i < 5; i++) b.add('copperBrown', metricBox(0.66, 0.05, 0.05), on(m, mat(0, yR + 2.1 + i * 0.24, 0.05, 0, 0.5)))
    b.add('copperBrown', metricBox(0.95, 0.07, 0.2), on(m, mat(0, yR + 1.82, 0.08)))
  }
  // cornice
  b.add('copperBrown', metricBox(2 * s + 0.3, 0.16, 2 * s + 0.3), mat(x, top + 0.08, z))
  // bell-cast pyramid cap (square), green patina
  const r2 = Math.SQRT2
  helm(b, 'copperPatina', { x, z, n: 4, phase: Math.PI / 4, flat: true, stations: [[1.2 * r2, top + 0.16], [1.12 * r2, top + 0.3], [0.9 * r2, top + 0.6], [0.58 * r2, top + 1.02], [0.3 * r2, top + 1.38], [0.22 * r2, top + 1.55]] })
  // onion, neck, small knob — lathe profile [r, y]
  const y0 = top + 1.55
  const prof: [number, number][] = [[0.2, 0], [0.26, 0.12], [0.5, 0.42], [0.66, 0.72], [0.66, 0.95], [0.52, 1.28], [0.3, 1.56], [0.12, 1.8], [0.09, 1.95], [0.17, 2.05], [0.19, 2.18], [0.12, 2.32], [0.05, 2.45], [0.0, 2.5]]
  b.add('copperPatina', lathe(prof, 24), mat(x, y0, z))
  cross(b, 'gilt', x, y0 + 2.4, z, 1.5, false, Math.PI / 2)
}

/* ------------------------------------------------------------------ */
/* North tower                                                         */
/* ------------------------------------------------------------------ */
function tower(b: Builder) {
  const x = TW.x
  const z = TZ
  const hw = TW.hw
  const gY = BELL.y0
  b.block('smStone', 2 * hw, gY, 2 * hw, x, 0, z)
  b.block('smStoneDark', 2 * hw + 0.4, 1.3, 2 * hw + 0.4, x, 0, z)
  // string courses
  for (const y of [12, 24]) b.block('smStoneDark', 2 * hw + 0.3, 0.35, 2 * hw + 0.3, x, y, z)
  // paired stepped corner buttresses (south ones only where clear of the hall)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const steps: [number, number][] = [
        [1.6, 12],
        [1.25, 23.5],
        [0.85, 32.4],
      ]
      buttress(b, V(x + sx * hw, 0, z + sz * (hw - 0.75)), V(sx, 0, 0), 1.35, steps)
      if (sz < 0) buttress(b, V(x + sx * (hw - 0.75), 0, z - hw), V(0, 0, -1), 1.35, steps)
      // pinnacle on top of the corner pair
      pinnacle(b, x + sx * (hw + 0.2), z + sz * (hw + (sz < 0 ? 0.2 : -0.4)), 33.3, 0.8, 1.6, 2.6)
    }
  }
  // windows & oculi on N, W, E faces; oculus above the hall roof on S
  const fr: [THREE.Matrix4, boolean][] = [
    [mat(x, 0, z - hw, Math.PI), true],
    [mat(x - hw, 0, z, -Math.PI / 2), true],
    [mat(x + hw, 0, z, Math.PI / 2), true],
    [mat(x, 0, z + hw, 0), false],
  ]
  for (const [m, low] of fr) {
    if (low) {
      gWindow(b, m, 2.1, 6.4, 4.8, 2)
      gWindow(b, m, 2.2, 7.0, 15.2, 2)
    }
    b.add('smStone', new THREE.TorusGeometry(1.35, 0.22, 8, 28), on(m, mat(0, 29.2, 0.14)))
    b.add('glassC', new THREE.CircleGeometry(1.32, 28), on(m, mat(0, 29.2, 0.04)))
    b.add('smStone', new THREE.TorusGeometry(0.55, 0.08, 5, 18), on(m, mat(0, 29.2, 0.14)))
  }
  // west door of the tower
  portal(b, mat(x - hw, 0, z + 2.6, -Math.PI / 2), 1.8, 3.8, 2)

  // gallery: corbelled cornice + pierced parapet
  b.block('smStoneDark', 2 * hw + 0.6, 0.45, 2 * hw + 0.6, x, gY - 0.9, z)
  b.block('smStone', 2 * hw + 1.2, 0.5, 2 * hw + 1.2, x, gY - 0.45, z)
  parapet(b, x, z, hw + 0.45, gY + 0.05, 1.05)

  // belfry / clock stage
  const bh = BELL.hw
  const top = BELL.top
  b.block('smStone', 2 * bh, top - gY, 2 * bh, x, gY, z)
  b.block('smStoneDark', 2 * bh + 0.25, 0.3, 2 * bh + 0.25, x, 47.3, z)
  // diagonal corner buttresses with pinnacles
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = x + sx * (bh + 0.15)
    const cz = z + sz * (bh + 0.15)
    b.add('smStone', metricBox(1.0, 12.4, 1.0), mat(cx, gY + 6.2, cz, Math.PI / 4))
    pinnacle(b, cx, cz, gY + 12.4, 0.95, 1.4, 3.4, Math.PI / 4)
  }
  const bf: THREE.Matrix4[] = [mat(x, 0, z - bh, Math.PI), mat(x - bh, 0, z, -Math.PI / 2), mat(x + bh, 0, z, Math.PI / 2), mat(x, 0, z + bh, 0)]
  for (const m of bf) {
    // tall twin-light belfry opening with louvres
    gWindow(b, m, 2.6, 8.4, 37.4, 2, 'black')
    for (let i = 0; i < 9; i++) b.add('wood', metricBox(2.5, 0.07, 0.1), on(m, mat(0, 38 + i * 0.62, 0.06, 0, 0.45)))
    // gable (wimperg) over the opening, flanked by slim pinnacles
    const g = new THREE.Shape([v2(-1.95, 0), v2(1.95, 0), v2(0, 4.6)])
    g.holes.push(new THREE.Path([v2(-1.45, 0.3), v2(0, 3.7), v2(1.45, 0.3)]))
    b.add('smStone', extrude(g, 0.28), on(m, mat(0, 44.6, 0.08)))
    for (const u of [-2.25, 2.25]) {
      b.add('smStone', metricBox(0.32, 5.4, 0.32), on(m, mat(u, 46.5 - 0.3, 0.3)))
      b.add('smStone', new THREE.ConeGeometry(0.28, 1.4, 4, 1), on(m, mat(u, 49.6, 0.3, Math.PI / 4)))
    }
    b.add('smStone', new THREE.SphereGeometry(0.22, 8, 6), on(m, mat(0, 49.3, 0.25)))
    // clock face
    b.add('trim', new THREE.CylinderGeometry(1.05, 1.05, 0.1, 28), on(m, mat(0, 51.2, 0.08, 0, Math.PI / 2)))
    b.add('black', new THREE.TorusGeometry(1.05, 0.08, 5, 28), on(m, mat(0, 51.2, 0.14)))
    b.add('black', metricBox(0.07, 0.75, 0.04), on(m, mat(0, 51.5, 0.16)))
    b.add('black', metricBox(0.55, 0.07, 0.04), on(m, mat(0.24, 51.2, 0.16)))
  }
  // corbel frieze + cornice + parapet with corner pinnacles
  for (let i = 0; i < 4; i++) {
    const m = bf[i]
    for (let k = -3; k <= 3; k++) b.add('smStone', metricBox(0.3, 0.45, 0.3), on(m, mat(k * 1.2, top - 0.3, 0.15)))
  }
  b.block('smStone', 2 * bh + 0.7, 0.55, 2 * bh + 0.7, x, top, z)
  parapet(b, x, z, bh + 0.2, top + 0.55, 0.95)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pinnacle(b, x + sx * (bh + 0.1), z + sz * (bh + 0.1), top + 0.55, 0.7, 1.2, 2.6)
  for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) pinnacle(b, x + sx * (bh + 0.1), z + sz * (bh + 0.1), top + 0.55, 0.45, 0.9, 1.6)

  // octagonal spire with flared foot (dark slate / metal)
  const sy = top + 0.8
  const R = (r: number) => r / Math.cos(Math.PI / 8)
  helm(b, 'slate', {
    x,
    z,
    n: 8,
    phase: Math.PI / 8,
    flat: true,
    stations: [
      [R(3.95), sy],
      [R(3.55), sy + 0.9],
      [R(3.3), sy + 2.0],
      [R(1.7), sy + 10.5],
      [R(0.35), sy + 19.0],
      [R(0.06), 76.0],
    ],
  })
  // edge rolls
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    const p0 = V(x + Math.cos(a) * R(3.3), sy + 2.0, z + Math.sin(a) * R(3.3))
    const p1 = V(x + Math.cos(a) * R(0.08), 75.8, z + Math.sin(a) * R(0.08))
    b.rod('slate', p0, p1, 0.07, 5)
  }
  // lucarnes on the four main faces
  for (const m of [mat(x, 0, z - 3.0, Math.PI), mat(x, 0, z + 3.0, 0), mat(x + 3.0, 0, z, Math.PI / 2), mat(x - 3.0, 0, z, -Math.PI / 2)]) {
    b.add('slate', metricBox(1.2, 1.6, 1.4), on(m, mat(0, sy + 3.2, 0.0)))
    const g = new THREE.Shape([v2(-0.75, 0), v2(0.75, 0), v2(0, 1.3)])
    b.add('slate', extrude(g, 1.5), on(m, mat(0, sy + 4.0, -0.8)))
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.5, 1.1, 0, sy + 2.7, 6))), on(m, mat(0, 0, 0.71)))
  }
  // knob + gilded cross (80 m)
  b.add('gilt', new THREE.SphereGeometry(0.32, 14, 10), mat(x, 76.15, z))
  b.rod('gilt', V(x, 75.8, z), V(x, 80, z), 0.09)
  b.add('gilt', metricBox(2.1, 0.2, 0.2), mat(x, 78.9, z))
  for (const s of [-1, 1]) b.add('gilt', new THREE.SphereGeometry(0.16, 8, 6), mat(x + s * 1.1, 78.9, z))
  b.add('gilt', new THREE.SphereGeometry(0.16, 8, 6), mat(x, 80.05, z))
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */
function build(): Builder {
  const g = new Builder()
  const H = HALL.h

  /* ---------------- hall walls ---------------- */
  g.block('smStone', HL, H, 2 * HALL.hw, HXC, 0, HALL.zc)
  g.block('smStoneDark', HL + 0.4, 1.2, 2 * HALL.hw + 0.4, HXC, 0, HALL.zc)
  g.block('smStoneDark', HL + 0.24, 0.8, 2 * HALL.hw + 0.24, HXC, H - 1.5, HALL.zc) // grey frieze
  g.block('smStone', HL + 0.8, 0.7, 2 * HALL.hw + 0.8, HXC, H - 0.7, HALL.zc) // eaves cornice

  /* ---------------- hall roof: one big hipped tile roof ---------------- */
  const hov = 0.65
  const hr = hipRoof(HXC, HALL.zc, HL + 2 * hov, 2 * HALL.hw + 2 * hov, H - hov * tan(HALL.pitch), HALL.pitch * D2R)
  for (const f of hr.facets) tileFace(g, f)
  for (const [a, c] of hr.lines) g.beam('helm', a.clone().add(V(0, 0.06, 0)), c.clone().add(V(0, 0.06, 0)), 0.24, 0.12)
  const hRidge = hr.top
  // grey gutters
  const gy = H - 0.65 * tan(HALL.pitch) - 0.12
  for (const s of [-1, 1]) {
    g.beam('helm', V(HALL.x0 - 0.75, gy, HALL.zc + s * (HALL.hw + 0.72)), V(HALL.x1 + 0.75, gy, HALL.zc + s * (HALL.hw + 0.72)), 0.24, 0.24)
    const xe = s < 0 ? HALL.x0 - 0.72 : HALL.x1 + 0.72
    g.beam('helm', V(xe, gy, ZN - 0.75), V(xe, gy, ZS + 0.75), 0.24, 0.24)
  }
  // dormers (grey metal), ~1/3 up the long slopes
  const dIn = 4.6
  const dY = H + dIn * tan(HALL.pitch) - 1.0
  for (const x of [-18, 1.5]) dormer(g, x, ZS - dIn, 1, dY)
  for (const x of [-21, -11]) dormer(g, x, ZN + dIn, -1, dY)
  // gilded finials on the ridge ends
  for (const xr of [HXC - (HL / 2 - HALL.hw), HXC + (HL / 2 - HALL.hw)]) {
    g.rod('gilt', V(xr, hRidge, HALL.zc), V(xr, hRidge + 1.4, HALL.zc), 0.05)
    g.add('gilt', new THREE.SphereGeometry(0.18, 10, 8), mat(xr, hRidge + 0.6, HALL.zc))
  }

  /* ---------------- choir + 5/8 apse ---------------- */
  const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(aDeg * D2R), y, CH.zc + r * Math.sin(aDeg * D2R))
  const ring = (y: number, grow = 0) => {
    const hw = CH.hw + grow
    const rc = RC + grow / Math.cos(22.5 * D2R)
    return [V(CH.x0 - 0.5, y, CH.zc - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(CH.x0 - 0.5, y, CH.zc + hw)]
  }
  g.add('smStone', loft([ring(0), ring(CH.h)], { capTop: true, flat: true }))
  g.add('smStoneDark', loft([ring(0, 0.2), ring(1.2, 0.2)], { capTop: true, flat: true }))
  g.add('smStoneDark', loft([ring(CH.h - 1.5, 0.12), ring(CH.h - 0.7, 0.12)], { capTop: true, flat: true }))
  g.add('smStone', loft([ring(CH.h - 0.7, 0.4), ring(CH.h, 0.4)], { capTop: true, flat: true }))

  // choir roof (60°), running into the east hip of the hall roof
  {
    const ov = 0.6
    const t = tan(CH.pitch)
    const eY = CH.h - ov * t
    const chw = CH.hw + ov
    const rcO = RC * (chw / CH.hw)
    const apex = V(XC, C_RIDGE, CH.zc)
    const cx0 = 11
    const vS = apsePt(67.5, rcO, eY)
    const vN = apsePt(-67.5, rcO, eY)
    tileFace(g, [V(cx0, eY, CH.zc + chw), vS, apex, V(cx0, C_RIDGE, CH.zc)])
    tileFace(g, [vN, V(cx0, eY, CH.zc - chw), V(cx0, C_RIDGE, CH.zc), apex])
    const angs = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) tileFace(g, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex])
    g.beam('helm', V(cx0, C_RIDGE + 0.06, CH.zc), V(apex.x, C_RIDGE + 0.06, CH.zc), 0.26, 0.14)
    for (const a of angs) g.beam('helm', apsePt(a, rcO, eY + 0.08), V(apex.x, apex.y + 0.08, CH.zc), 0.22, 0.12)
    // grey valleys where the choir slopes meet the hall's east hip
    const xv = HALL.x1 - (CH.hw * t) / tan(HALL.pitch)
    for (const s of [-1, 1]) g.beam('helm', V(HALL.x1, CH.h + 0.08, CH.zc + s * CH.hw), V(xv, C_RIDGE + 0.08, CH.zc), 0.5, 0.06)
    // gutters
    const gy2 = eY - 0.12
    for (const s of [-1, 1]) g.beam('helm', V(HALL.x1 + 0.7, gy2, CH.zc + s * (chw + 0.08)), apsePt(s * 67.5, rcO + 0.08, gy2), 0.22, 0.22)
    for (let i = 0; i < 3; i++) g.beam('helm', apsePt(angs[i], rcO + 0.08, gy2), apsePt(angs[i + 1], rcO + 0.08, gy2), 0.22, 0.22)
    // small dormers on the choir slopes
    const cdIn = 2.2
    for (const s of [-1, 1] as const) dormer(g, 25.2, CH.zc + s * (CH.hw - cdIn), s, CH.h + cdIn * t - 1.0)
  }

  /* ---------------- roof turret (copper) ---------------- */
  roofTurret(g, TURRET_X, CH.zc, C_RIDGE)

  /* ---------------- buttresses ---------------- */
  const hallSteps: [number, number][] = [
    [2.2, 8.5],
    [1.55, 14.6],
  ]
  // south wall (stair turret at -22.5 replaces a buttress)
  for (const x of [-11.5, -1, 9.5, 15.3]) buttress(g, V(x, 0, ZS), V(0, 0, 1), 1.3, hallSteps)
  // north wall (west of the tower)
  for (const x of [-22.5, -11.5]) buttress(g, V(x, 0, ZN), V(0, 0, -1), 1.3, hallSteps)
  // diagonal corner buttresses
  for (const [cx, cz] of [[HALL.x0, ZS], [HALL.x1, ZS], [HALL.x0, ZN], [HALL.x1, ZN]]) {
    const n = V(Math.sign(cx - HXC), 0, Math.sign(cz - HALL.zc)).normalize()
    buttress(g, V(cx, 0, cz), n, 1.35, [[2.3, 8.5], [1.6, 14.6]])
  }
  // west front: two deep buttresses flanking the portal (OSM)
  for (const z of [-6.8, 3.9]) buttress(g, V(HALL.x0, 0, z), V(-1, 0, 0), 1.6, [[2.6, 9], [1.8, 15]])
  // choir: side buttresses + radial apse buttresses
  const chSteps: [number, number][] = [
    [1.8, 8.5],
    [1.25, 14.6],
  ]
  for (const s of [-1, 1]) buttress(g, V(26.0, 0, CH.zc + s * CH.hw), V(0, 0, s), 1.15, chSteps)
  for (const a of [67.5, 22.5, -22.5, -67.5]) buttress(g, apsePt(a, RC, 0), V(Math.cos(a * D2R), 0, Math.sin(a * D2R)), 1.1, chSteps)

  /* ---------------- SW stair turret ---------------- */
  {
    const sx = -22.5
    const sz = ZS + 1.4
    const n = 8
    const r = 1.95
    g.add('smStone', loft([0, H - 0.6].map((y) => Array.from({ length: n }, (_, i) => V(sx + Math.cos((i / n) * Math.PI * 2 + Math.PI / 8) * r, y, sz + Math.sin((i / n) * Math.PI * 2 + Math.PI / 8) * r))), { capTop: true, flat: true }))
    helm(g, 'smStone', { x: sx, z: sz, n: 8, phase: Math.PI / 8, flat: true, stations: [[r + 0.25, H - 0.6], [r + 0.25, H - 0.2], [r * 0.95, H - 0.2], [0.12, H + 3.4]] })
    g.add('smStone', new THREE.SphereGeometry(0.2, 8, 6), mat(sx, H + 3.45, sz))
    for (const y of [5, 9, 13]) g.add('black', metricBox(0.25, 1.1, 0.05), mat(sx, y, sz + r * Math.cos(Math.PI / 8) + 0.01))
  }

  /* ---------------- windows & portals ---------------- */
  // south elevation (Piața Unirii)
  gWindow(g, fS(-28.3), 2.2, 4.6, 10.2, 2)
  for (const x of [-17, -6.25]) gWindow(g, fS(x), 3.7, 8.0, 6.2, 3)
  gWindow(g, fS(4.25), 3.7, 5.8, 8.6, 3)
  portal(g, fS(4.25), 2.8, 5.0)
  gWindow(g, fS(12.4), 3.0, 8.0, 6.2, 2)
  gWindow(g, fS(18.15), 1.9, 10.2, 3.6, 2)
  // north elevation (west of the tower)
  gWindow(g, fN(-28.3), 2.2, 4.6, 10.2, 2)
  gWindow(g, fN(-17), 3.4, 5.8, 8.6, 3)
  portal(g, fN(-17), 2.6, 4.8)
  gWindow(g, fN(-8.0), 2.2, 7.8, 6.4, 2)
  gWindow(g, fN(15.6), 2.0, 6.2, 9.8, 2)
  // west front: main double portal + large window
  portal(g, fW(HALL.x0, -1.45), 4.2, 7.0, 4)
  g.add('smStoneDark', metricBox(0.12, 6.0, 0.06), fW(HALL.x0 - 0.05, -1.45).multiply(mat(0, 3.0, 0.05)))
  gWindow(g, fW(HALL.x0, -1.45), 4.2, 6.2, 9.6, 3)
  for (const z of [-11, 10.5]) gWindow(g, fW(HALL.x0, z), 1.8, 5.2, 9.5, 2)
  // choir lancets (sides) and apse windows
  for (const s of [-1, 1]) {
    for (const x of [23.5, 28.65]) gWindow(g, s > 0 ? fS(x, CH.zc + CH.hw) : fN(x, CH.zc - CH.hw), 1.9, 10.4, 3.4, 2)
  }
  for (const a of [45, 0, -45]) {
    const p = V(XC + CH.hw * Math.cos(a * D2R), 0, CH.zc + CH.hw * Math.sin(a * D2R))
    gWindow(g, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 1.8, 10.0, 3.6, 2)
  }
  // east wall of the hall above/around the choir (chapel windows)
  for (const z of [-9.0, 12.2]) gWindow(g, fE(HALL.x1, z), 1.6, 7.0, 6.0, 2)

  /* ---------------- sacristy (north, east of the tower) ---------------- */
  {
    const x0 = 10.4
    const x1 = 20.4
    const z1 = ZN - 5.4
    const sh = 8.4
    const zc = (ZN + z1) / 2
    g.block('smStone', x1 - x0, sh, ZN - z1 + 0.6, (x0 + x1) / 2, 0, zc + 0.3)
    g.block('smStoneDark', x1 - x0 + 0.3, 1.0, ZN - z1 + 0.9, (x0 + x1) / 2, 0, zc + 0.3)
    gableRoof(g, 'zincSlate', { x: (x0 + x1) / 2, z: zc, w: x1 - x0, d: ZN - z1, y: sh, pitch: 45, ridge: 'x', overhang: 0.35, seams: seams('zincSlate', 0.55, 0.035, 0.04), wallKey: 'smStone' })
    for (const x of [13, 17.8]) gWindow(g, fN(x, z1), 1.3, 3.6, 2.6, 1)
    gWindow(g, fW(x0, zc), 1.3, 3.6, 2.6, 1)
  }

  /* ---------------- north tower ---------------- */
  tower(g)

  // into the footprint-centred frame
  const b = new Builder()
  b.merge(g, mat(OX, 0, OZ))
  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [TURRET_X + OX, C_RIDGE + 3, CH.zc + OZ],
  materials: () => ({
    smStone: new THREE.MeshStandardMaterial({ color: '#d2c4a3', roughness: 0.9 }),
    smStoneDark: new THREE.MeshStandardMaterial({ color: '#b9ab8b', roughness: 0.9 }),
    smTile: new THREE.MeshStandardMaterial({ color: '#6c3b2e', roughness: 0.88 }),
    smTileDk: new THREE.MeshStandardMaterial({ color: '#522a20', roughness: 0.9 }),
  }),
  notes:
    'Gothic hall church with the 80 m neo-Gothic north tower; hipped tile roofs; the copper-clad roof turret on the choir ridge is the COLOR METAL copper element. Heights and pitches measured from photos; tracery and ornament simplified.',
}
export default model
