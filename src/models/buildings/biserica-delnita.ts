/**
 * Roman Catholic church of St John the Baptist, Csíkdelne / Delnița (Harghita).
 *
 * Modelling specification derived from the Aug 2026 company photographs (drone
 * obliques 01–02, vertical drone shot 03, ground views 04–10), calibrated on the
 * OSM outline (way 117513254, 31.9 × 15.1 m, axis E–W) and hu.wikipedia
 * (tower 30 m, exterior wall height 8.50 m). Real metres, +X = east.
 *  - Single-cell medieval hall: nave and sanctuary under one roof, ≈ 28 × 9.4 m
 *    (the OSM outline, 10.7 m wide, follows the roof edge; width scaled on drone
 *    photo 03 against the ≈ 44 × 41 m churchyard wall),
 *    eave 8.5 m, closed to the east by a shallow three-sided (chamfered) end.
 *    Steep (≈ 52°) roof of hand-made beaver-tail clay tiles: west end gabled
 *    against the tower, east end hipped over the polygon; tiled ridge and hips,
 *    plaster cove cornice. South slope lighter red, north slope darker/mossy.
 *  - West tower ≈ 5 m square, almost on the nave axis, partly embedded in the
 *    nave's west gable; plain rendered shaft to ≈ 19.4 m with a moulded cornice,
 *    one pointed belfry window per face, slit windows, west door; two-stage
 *    diagonal buttresses with tile caps at both west corners.
 *  - Tower roof: broach spire — low square "skirt" with bell-cast eaves over the
 *    cornice, broaches to an octagon, slender octagonal needle to ≈ 30 m, thin
 *    finial rod. Clad in silver-grey sheet metal laid in horizontal lapped courses
 *    (not standing seam) — the visible METAL surfaces, together with the bright
 *    galvanised-looking gutters and downpipes along all eaves.
 *  - North sacristy (lean-to, tiled, hipped to the east), small tiled pent roof
 *    over the pointed south portal, buttresses at the nave's west corners and on
 *    the south wall, small pointed windows on the south side and east end;
 *    north wall blank.
 * Not modelled: the fortified oval churchyard wall (way 117513284), graves, trees.
 * Approximations: nave width, tower size and position across the nave (±0.5 m),
 * spire profile, window
 * count/positions on the south and east (partly hidden by trees), buttress count,
 * tile texture (flat colour with course lines).
 */
import * as THREE from 'three'
import { Builder, V, extrude, facet, frameShape, mat, metricBox, opening, window_, door, prismOutline } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZC = 2.2 // nave axis (OSM outline: south wall z = 7.54, north wall z = −3.15)
const HW = 4.7 // nave half width (photo 03 scaled on the churchyard wall; the OSM outline follows the roof edge)
const XW = -12.4 // nave west gable wall
const XS = 13.7 // end of the straight side walls
const XE = 15.7 // east facet of the chamfered end
const HE = 2.7 // half width of the east facet
const EAVE = 8.5
const PITCH = 52
const TP = Math.tan(PITCH * D2R)
const OV = 0.45
const RIDGE = EAVE + HW * TP
const TW = { x0: -15.8, x1: -10.8, zc: ZC + 0.3, hw: 2.5, top: 19.0 }

type P2 = [number, number]

/** Wall polyline of the south side → east end → north side (x, z), clockwise seen from above. */
const WALL: P2[] = [
  [XW, ZC + HW],
  [XS, ZC + HW],
  [XE, ZC + HE],
  [XE, ZC - HE],
  [XS, ZC - HW],
  [XW, ZC - HW],
]

/** Offset an open polyline outward (to the left of the travel direction in x/z, i.e. normal (−dz, dx)). */
function offsetLine(pts: P2[], d: number): P2[] {
  const nrm = (a: P2, c: P2): P2 => {
    const dx = c[0] - a[0]
    const dz = c[1] - a[1]
    const l = Math.hypot(dx, dz)
    return [-dz / l, dx / l]
  }
  return pts.map((p, i) => {
    const na = i > 0 ? nrm(pts[i - 1], p) : null
    const nb = i < pts.length - 1 ? nrm(p, pts[i + 1]) : null
    if (!na) return [p[0] + nb![0] * d, p[1] + nb![1] * d]
    if (!nb) return [p[0] + na[0] * d, p[1] + na[1] * d]
    const k = d / (1 + na[0] * nb[0] + na[1] * nb[1])
    return [p[0] + (na[0] + nb[0]) * k, p[1] + (na[1] + nb[1]) * k]
  })
}

/** Horizontal lapped-sheet courses across a planar facet (every dy metres). */
function courses(b: Builder, key: string, pts: THREE.Vector3[], dy: number, y0: number, outward: THREE.Vector3) {
  const ys = pts.map((p) => p.y)
  const ymin = Math.min(...ys)
  const ymax = Math.max(...ys)
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.dot(outward) < 0) n.negate()
  for (let y = y0 + Math.ceil((ymin + 0.08 - y0) / dy) * dy; y < ymax - 0.12; y += dy) {
    const hits: THREE.Vector3[] = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const c = pts[(i + 1) % pts.length]
      if ((a.y - y) * (c.y - y) < 0) hits.push(a.clone().lerp(c, (y - a.y) / (c.y - a.y)))
    }
    if (hits.length < 2) continue
    const off = n.clone().multiplyScalar(0.012)
    b.beam(key, hits[0].clone().add(off), hits[1].clone().add(off), 0.03, 0.022, n)
  }
}

/** Two-stage buttress at ground point p on a wall with outward normal n; tiled weatherings. */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, o: { w: number; d: number; h1: number; h2: number; key: string; capKey: string }) {
  const { w, d, h1, h2 } = o
  const d2 = d * 0.58
  const s1 = (d - d2) * 0.9
  const s2 = (d2 + 0.3) * 0.9
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(d, 0),
    new THREE.Vector2(d, h1),
    new THREE.Vector2(d2, h1 + s1),
    new THREE.Vector2(d2, h2),
    new THREE.Vector2(-0.3, h2 + s2),
  ])
  const up = V(0, 1, 0)
  const nn = n.clone().normalize()
  const t = V().crossVectors(nn, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(nn, up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(w / 2)))
  b.add(o.key, extrude(prof, w), basis)
  const pt = (s: number, y: number) => p.clone().add(nn.clone().multiplyScalar(s)).add(V(0, y, 0))
  // tiled (or stone) weatherings: small saddle caps following both sloped tops
  const cap = (s0: number, y0: number, s1_: number, y1_: number) => {
    const a = pt(s0 + 0.1, y0 + 0.04)
    const c = pt(s1_, y1_ + 0.04)
    const along = V().subVectors(c, a)
    const side = t.clone().multiplyScalar(w / 2 + 0.1)
    const ridgeUp = V(0, 0.16, 0)
    facet(b, o.capKey, [a.clone().add(side), c.clone().add(side), c.clone().add(ridgeUp), a.clone().add(ridgeUp)], { hint: t.clone().add(V(0, 1, 0)) })
    facet(b, o.capKey, [a.clone().sub(side), c.clone().sub(side), c.clone().add(ridgeUp), a.clone().add(ridgeUp)], { hint: t.clone().negate().add(V(0, 1, 0)) })
    b.beam(o.capKey, a.clone().add(ridgeUp), c.clone().add(ridgeUp), 0.08, 0.06, V().crossVectors(along, t).normalize())
  }
  cap(d, h1, d2 - 0.02, h1 + s1)
  cap(d2, h2, -0.28, h2 + s2)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave + sanctuary (one prism) ---------------- */
  prismOutline(b, 'plasterWhite', WALL, 0, EAVE)
  prismOutline(b, 'stoneLight', offsetLine(WALL, 0.08), 0, 0.55)
  // plaster cove cornice under the eaves
  const corn = offsetLine(WALL, 0.12)
  for (let i = 0; i < corn.length - 1; i++) {
    const [ax, az] = corn[i]
    const [cx, cz] = corn[i + 1]
    b.beam('plasterWhite', V(ax, EAVE - 0.18, az), V(cx, EAVE - 0.18, cz), 0.3, 0.36)
    b.beam('plasterWhite', V(ax, EAVE - 0.45, az), V(cx, EAVE - 0.45, cz), 0.14, 0.2)
  }
  // west gable wall (seen beside the tower)
  const gable = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.01), new THREE.Vector2(HW, EAVE - 0.01), new THREE.Vector2(0, RIDGE - 0.05)])
  b.add('plasterWhite', extrude(gable, 0.9), mat(XW + 0.9, 0, ZC, -Math.PI / 2))

  /* ---------------- roof: beaver-tail tiles ---------------- */
  const eY = EAVE - OV * TP
  const eave = offsetLine(WALL, OV)
  const xw = XW - 0.32
  const A = V(XE + OV - (RIDGE - eY) / TP, RIDGE, ZC) // hip apex over the east end
  const ev = (i: number) => V(eave[i][0], eY, eave[i][1])
  const zS = ZC + HW + OV
  const zN = ZC - HW - OV
  const southF = [V(xw, eY, zS), ev(1), A, V(xw, RIDGE, ZC)]
  const northF = [ev(4), V(xw, eY, zN), V(xw, RIDGE, ZC), A]
  const endF = [
    [ev(1), ev(2), A],
    [ev(2), ev(3), A],
    [ev(3), ev(4), A],
  ]
  facet(b, 'tileRed', southF, { thickness: 0.14 })
  facet(b, 'delnitaTileN', northF, { thickness: 0.14 })
  endF.forEach((f, i) => facet(b, i === 2 ? 'delnitaTileN' : 'tileRed', f, { thickness: 0.14 }))
  // tile course lines (beaver-tail rows read as fine horizontal banding)
  const tiles: [THREE.Vector3[], string][] = [[southF, 'delnitaTileLineS'], [northF, 'delnitaTileLineN'], ...endF.map((f, i) => [f, i === 2 ? 'delnitaTileLineN' : 'delnitaTileLineS'] as [THREE.Vector3[], string])]
  for (const [f, k] of tiles) {
    const c = f.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / f.length)
    courses(b, k, f, 0.62, eY, V(c.x - A.x, 0, c.z - ZC).normalize().add(V(0, 1, 0)))
  }
  // ridge and hip tiles
  b.beam('delnitaRidge', V(xw, RIDGE + 0.1, ZC), V(A.x, RIDGE + 0.1, ZC), 0.32, 0.24)
  for (const i of [1, 2, 3, 4]) b.beam('delnitaRidge', ev(i).add(V(0, 0.12, 0)), A.clone().add(V(0, 0.1, 0)), 0.28, 0.2)
  // verge tiles on the west gable
  for (const z of [zS, zN]) b.beam('delnitaRidge', V(xw, eY + 0.08, z), V(xw, RIDGE + 0.08, ZC), 0.26, 0.16)

  /* ---------------- gutters & downpipes (bright galvanised) ---------------- */
  const gut = offsetLine(WALL, OV + 0.08)
  const gy = eY - 0.1
  for (let i = 0; i < gut.length - 1; i++) {
    const p = V(i === 0 ? xw : gut[i][0], gy, gut[i][1])
    const q = V(i === gut.length - 2 ? xw : gut[i + 1][0], gy, gut[i + 1][1])
    b.rod('delnitaGalv', p, q, 0.075, 10)
  }
  // downpipes: [x, z] on the wall face + outward normal
  const nSE = [HW - HE, XE - XS]
  const lSE = Math.hypot(nSE[0], nSE[1])
  const dps: [number, number, number, number][] = [
    [XW + 0.7, ZC + HW, 0, 1],
    [5.6, ZC + HW, 0, 1],
    [(XS + XE) / 2, ZC + (HW + HE) / 2, nSE[0] / lSE, nSE[1] / lSE],
    [(XS + XE) / 2, ZC - (HW + HE) / 2, nSE[0] / lSE, -nSE[1] / lSE],
    [XW + 0.7, ZC - HW, 0, -1],
  ]
  for (const [x, z, nx, nz] of dps) {
    const p = V(x + nx * 0.16, 0.25, z + nz * 0.16)
    const top = V(x + nx * 0.16, gy - 0.35, z + nz * 0.16)
    b.rod('delnitaGalv', p, top, 0.055, 8)
    b.beam('delnitaGalv', top, V(x + nx * (OV + 0.08), gy, z + nz * (OV + 0.08)), 0.1, 0.1)
  }

  /* ---------------- south side: portal, pent roof, windows, buttresses ---------------- */
  const zSW = ZC + HW
  {
    const px = -4.4
    door(b, '+z', zSW, px, { w: 1.35, h: 2.85, type: 'pointed', leafKey: 'wood', frameKey: 'stoneGrey', frame: 0.28 })
    // small tiled pent roof on two timber brackets
    const y1 = 4.15
    const y0 = 3.55
    facet(b, 'tileRed', [V(px - 1.45, y0, zSW + 1.15), V(px + 1.45, y0, zSW + 1.15), V(px + 1.45, y1, zSW), V(px - 1.45, y1, zSW)], { thickness: 0.12 })
    for (const s of [-1, 1]) b.beam('wood', V(px + s * 1.25, 2.95, zSW), V(px + s * 1.25, y0 - 0.05, zSW + 1.05), 0.14, 0.14)
  }
  const PW = { type: 'pointed' as const, glassKey: 'glassC', frameKey: 'stoneGrey', frame: 0.16, sill: false }
  for (const x of [-8.6, -0.6, 4.4, 9.6]) window_(b, '+z', zSW, x, 4.3, { ...PW, w: 0.95, h: 2.5 })
  // east end windows: SE diagonal facet and east facet
  {
    const dx = XE - XS
    const dz = HW - HE
    const ang = Math.atan2(dx, dz) // outward normal of the SE facet, angle from +x towards +z
    const cxD = (XS + XE) / 2
    const czD = ZC + (HW + HE) / 2
    const m = mat(cxD, 0, czD, Math.PI / 2 - ang)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.9, 2.5, 0, 4.4, 10))), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.03)))
    b.add('stoneGrey', extrude(frameShape('pointed', 0.9, 2.5, 0.16, 0, 4.4), 0.1), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.01)))
    window_(b, '+x', XE, -ZC, 4.4, { ...PW, w: 1.0, h: 2.7 })
  }
  // buttresses: nave SW corner (diagonal, tile caps), south wall east of the portal, NW corner (bare stone)
  buttress(b, V(XW, 0, ZC + HW), V(-0.7, 0, 0.7), { w: 1.0, d: 1.5, h1: 3.4, h2: 5.6, key: 'plasterWhite', capKey: 'tileRed' })
  buttress(b, V(-2.3, 0, ZC + HW), V(0, 0, 1), { w: 0.95, d: 1.3, h1: 3.0, h2: 5.2, key: 'stoneGrey', capKey: 'stoneGrey' })
  buttress(b, V(XW, 0, ZC - HW), V(-0.7, 0, -0.7), { w: 1.0, d: 1.4, h1: 3.6, h2: 6.2, key: 'stoneGrey', capKey: 'stoneGrey' })

  /* ---------------- north sacristy (lean-to, hipped east end) ---------------- */
  {
    const x0 = 3.2
    const x1 = 9.5
    const zw = ZC - HW // nave north wall
    const zn = -7.25
    const h = 4.0
    const hi = 6.7
    b.block('plasterWhite', x1 - x0, h, zw - zn, (x0 + x1) / 2, 0, (zw + zn) / 2)
    b.block('stoneLight', x1 - x0 + 0.16, 0.45, zw - zn + 0.16, (x0 + x1) / 2, 0, (zw + zn) / 2 - 0.08)
    const tri = new THREE.Shape([new THREE.Vector2(zn, h - 0.01), new THREE.Vector2(zw, h - 0.01), new THREE.Vector2(zw, hi)])
    // triangle drawn in (z, y) → extrude along x
    b.add('plasterWhite', extrude(tri, 0.4), new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(x0 + 0.4, 0, 0))
    const t = (hi - h) / (zw - zn)
    const ov = 0.35
    const yLo = h - ov * t
    const run = 1.7 // short, steep hipped east end (photo 01)
    const xa = x0 - 0.25
    const xb = x1 + ov
    const apex = V(xb - run, hi, zw)
    facet(b, 'delnitaTileN', [V(xa, yLo, zn - ov), V(xb, yLo, zn - ov), apex, V(xa, hi, zw)], { thickness: 0.12 })
    facet(b, 'tileRed', [V(xb, yLo, zn - ov), V(xb, yLo, zw), apex], { thickness: 0.12, hint: V(1, 1, 0) })
    b.beam('delnitaRidge', V(xb, yLo + 0.1, zn - ov), apex.clone().add(V(0, 0.08, 0)), 0.24, 0.16)
    b.rod('delnitaGalv', V(xa, yLo - 0.1, zn - ov - 0.08), V(xb, yLo - 0.1, zn - ov - 0.08), 0.07, 10)
    b.rod('delnitaGalv', V(x1 - 0.3, 0.25, zn - 0.12), V(x1 - 0.3, yLo - 0.15, zn - 0.12), 0.05, 8)
    window_(b, '-x', x0, (zn + zw) / 2, 1.5, { type: 'rect', w: 0.6, h: 0.9, glassKey: 'glassC', frameKey: 'stoneGrey', frame: 0.12 })
  }

  /* ---------------- west tower ---------------- */
  const tx = (TW.x0 + TW.x1) / 2
  const tz = TW.zc
  const thw = TW.hw
  b.block('plasterWhite', 2 * thw, TW.top, 2 * thw, tx, 0, tz)
  b.block('stoneLight', 2 * thw + 0.2, 0.6, 2 * thw + 0.2, tx, 0, tz)
  // moulded top cornice
  b.block('plasterWhite', 2 * thw + 0.24, 0.22, 2 * thw + 0.24, tx, TW.top, tz)
  b.block('plasterWhite', 2 * thw + 0.44, 0.2, 2 * thw + 0.44, tx, TW.top + 0.22, tz)
  const yTop = TW.top + 0.42
  // bare medieval masonry patch at the foot of the north face (as photographed)
  b.add('stoneGrey', metricBox(2.4, 3.4, 0.06), mat(XW - 1.35, 1.7, tz - thw - 0.03))
  // openings
  const BELF = { type: 'pointed' as const, w: 0.9, h: 1.95, glassKey: 'black', frameKey: 'plasterWhite', frame: 0.14 }
  window_(b, '-x', TW.x0, tz, 16.0, BELF)
  window_(b, '+x', TW.x1, -tz, 16.0, BELF)
  window_(b, '+z', tz + thw, tx, 16.0, BELF)
  window_(b, '-z', tz - thw, -tx, 16.0, BELF)
  door(b, '-x', TW.x0, tz - 0.45, { w: 1.05, h: 2.2, y0: 0.15, leafKey: 'wood', frameKey: 'stoneGrey', frame: 0.22 })
  const SLIT = { type: 'rect' as const, w: 0.22, h: 0.85, glassKey: 'black', frame: 0.08, frameKey: 'stoneLight' }
  window_(b, '-x', TW.x0, tz + 0.3, 10.4, SLIT)
  window_(b, '+z', tz + thw, tx + 0.4, 5.6, SLIT)
  window_(b, '-z', tz - thw, -(tx - 0.3), 11.2, SLIT)
  // diagonal two-stage buttresses at both west corners (tile caps)
  for (const s of [-1, 1]) buttress(b, V(TW.x0 + 0.25, 0, tz + s * (thw - 0.25)), V(-0.7, 0, s * 0.7), { w: 0.95, d: 1.35, h1: 4.6, h2: 9.2, key: 'plasterWhite', capKey: 'tileRed' })

  /* ---------------- broach spire (silver sheet metal, horizontal courses) ---------------- */
  const SP = 'delnitaSpire'
  const ye = yTop - 0.12
  const he = thw + 0.42 // skirt eave half width
  const yo = ye + 1.3 // octagon base
  const ao = 1.22 // octagon apothem
  const Ro = ao / Math.cos(22.5 * D2R)
  const yk = yo + 1.4 // slight kink (bell-cast lower needle)
  const ak = ao * 0.82
  const Rk = ak / Math.cos(22.5 * D2R)
  const yTip = 30.0
  const oct = (R: number, y: number) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => V(tx + R * Math.cos((22.5 + 45 * k) * D2R), y, tz + R * Math.sin((22.5 + 45 * k) * D2R)))
  const O = oct(Ro, yo)
  const K = oct(Rk, yk)
  const E = [V(tx + he, ye, tz + he), V(tx - he, ye, tz + he), V(tx - he, ye, tz - he), V(tx + he, ye, tz - he)] // corners at 45°, 135°, 225°, 315°
  const tip = V(tx, yTip, tz)
  const out = (p: THREE.Vector3) => V(p.x - tx, 0.4, p.z - tz)
  const spireFacets: THREE.Vector3[][] = []
  // skirt trapezoids (faces +x, +z, −x, −z) and broach triangles at the corners
  const faceIdx: [number, number, number, number][] = [
    [3, 0, 7, 0], // +x: corners E3(315°)→E0(45°), octagon 337.5°(7) → 22.5°(0)
    [0, 1, 1, 2], // +z: E0(45°)→E1(135°), octagon 67.5°(1) → 112.5°(2)
    [1, 2, 3, 4], // −x
    [2, 3, 5, 6], // −z
  ]
  for (const [e0, e1, o0, o1] of faceIdx) spireFacets.push([E[e0], E[e1], O[o1], O[o0]])
  for (let c = 0; c < 4; c++) spireFacets.push([E[c], O[(2 * c + 1) % 8], O[2 * c % 8]])
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8
    spireFacets.push([O[k], O[k2], K[k2], K[k]])
    spireFacets.push([K[k], K[k2], tip])
  }
  for (const f of spireFacets) {
    const c = f.reduce((s, p) => s.add(p), V()).multiplyScalar(1 / f.length)
    facet(b, SP, f, { hint: out(c), thickness: 0.05 })
    courses(b, 'delnitaSpireLine', f, 0.42, ye, out(c))
  }
  // bell-cast drip edge of the skirt and the hip rolls
  for (let c = 0; c < 4; c++) {
    b.beam(SP, E[c].clone().add(V(0, -0.05, 0)), E[(c + 1) % 4].clone().add(V(0, -0.05, 0)), 0.1, 0.14)
    for (const o of [O[(2 * c) % 8], O[(2 * c + 1) % 8]]) b.beam(SP, E[c], o, 0.05, 0.05)
  }
  for (let k = 0; k < 8; k++) b.beam(SP, K[k], tip, 0.06, 0.05)
  // finial: knob + thin rod
  b.add('copper', new THREE.SphereGeometry(0.13, 12, 8), mat(tx, yTip + 0.05, tz))
  b.rod('copper', V(tx, yTip, tz), V(tx, yTip + 2.0, tz), 0.03, 6)

  return b
}

const model: ModelModule = {
  build,
  front: [-0.55, 0.835],
  materialFocus: [(TW.x0 + TW.x1) / 2, 22.5, TW.zc + 1.2],
  materials: () => ({
    delnitaSpire: new THREE.MeshStandardMaterial({ color: '#b3b8ba', metalness: 0.78, roughness: 0.36, envMapIntensity: 1.15 }),
    delnitaSpireLine: new THREE.MeshStandardMaterial({ color: '#8f9496', metalness: 0.7, roughness: 0.45 }),
    delnitaGalv: new THREE.MeshStandardMaterial({ color: '#c6cacc', metalness: 0.85, roughness: 0.3, envMapIntensity: 1.2 }),
    delnitaTileN: new THREE.MeshStandardMaterial({ color: '#86503d', roughness: 0.9 }),
    delnitaTileLineS: new THREE.MeshStandardMaterial({ color: '#8c4630', roughness: 0.9 }),
    delnitaTileLineN: new THREE.MeshStandardMaterial({ color: '#653a2c', roughness: 0.9 }),
    delnitaRidge: new THREE.MeshStandardMaterial({ color: '#b56a4c', roughness: 0.85 }),
  }),
  notes: 'Proportions from the drone photographs and the OSM outline (tower 30 m and wall height 8.5 m per published data); window count on the south/east sides and the exact tower position across the nave approximated.',
}
export default model
