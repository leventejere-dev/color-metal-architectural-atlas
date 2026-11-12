/**
 * Biserica „Sfânta Vineri”, Pitești (Str. Sfânta Vineri 44; built 1904–1908,
 * Byzantine-revival; EU-funded rehabilitation 2013–2015 including the roofs).
 * Roofs and domes shown in the KME copper sheet supplied by COLOR METAL in 2015.
 *
 * Modelling specification (real metres, +X = towards the altar along the OSM
 * long axis 76.8°, the west front with the porch faces −X; OSM way 319485731,
 * 33.8 × 19.5 m, porch outside the traced outline):
 *  - Plan after the OSM outline and photo 03 (from the south): west block
 *    (narthex with the two tower bays) 7.1 × 16.8 m; a short nave bay and the
 *    domed crossing 11.6 m wide; two lateral conches (r ≈ 4.2 m) at the
 *    crossing; altar bay and semicircular altar apse to the east.
 *  - West front (photos 01, 02, 04): two corner tower bays with big
 *    semicircular arched gables and tall cross-headed windows, a higher
 *    straight central part with three small attic windows; tetrastyle porch
 *    with three arches (wider centre), columns on pedestals, a tall
 *    entablature with roundels and cresting.
 *  - Two west towers: square base, octagonal drum with one tall arched window
 *    per face, cornice, octagonal bulb dome, cross (≈ 26 m).
 *  - Crossing: cruciform barrel roofs ending in semicircular arched gables
 *    (over the conches), square base and larger octagonal drum with arched
 *    windows, octagonal bulb dome, cross (≈ 29 m).
 *  - Conches and altar apse with half-domes; white render with grey-blue
 *    ornamental bands (simplified to string courses and arch mouldings).
 *  - COLOR METAL scope (client rule): all available photographs (2010–2011 and
 *    an early-20th-century postcard) predate the 2013–2015 works and show grey
 *    painted sheet; roofs, half-domes, tower and central domes are therefore
 *    shown in weathered copper (copperBrown) with standing seams / meridian
 *    ribs. Which surfaces were re-covered is not documented.
 * Approximations: heights scaled from the frontal photographs (towers/dome
 * foreshortened), east end and north side (not photographed) mirrored from the
 * south, ornament and window tracery strongly simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, window_, door, seams, barrelRoof, helm, cross } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const W = 'vinRender'
const ORN = 'vinOrn'
const TR = 'vinTrim'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const WB = { x0: -16.9, x1: -9.8, hz: 8.4 } // west block
const BAY = 5.6 // tower bay (square)
const TOWER_X = WB.x0 + BAY / 2 // -14.1
const TOWER_Z = WB.hz - BAY / 2 // ±5.6
const NAOS = { x0: -9.8, x1: 10.0, hz: 5.8 }
const CROSS_X = 3.5
const CONCH_R = 4.2
const APSE = { x0: 10.0, cx: 12.5, r: 4.4 }
const PORCH = { x0: -19.5, x1: WB.x0, hz: 4.9 }

/* heights */
const WB_EAVE = 11.5
const WB_TOP = 13.6
const NAOS_EAVE = 12.0
const ARM_R = 4.2 // radius of the cruciform barrels / arched gables
const LOW_EAVE = 10.5 // conches, altar bay, apse

/** Barrel roof along Z (built along X and rotated). */
function barrelZ(b: Builder, x: number, z: number, len: number, span: number, y: number, rise: number) {
  const sub = new Builder()
  barrelRoof(sub, CU, { x: 0, z: 0, w: len, d: span, y, rise, segs: 16, seams: SEAM, overhang: 0.25 })
  b.merge(sub, mat(x, 0, z, Math.PI / 2))
}

/** Semicircular arched gable wall (springing y, radius r) on a facade frame m, with arch moulding. */
function archGable(b: Builder, m: THREE.Matrix4, r: number, y: number, depth = 0.4) {
  const s = new THREE.Shape()
  s.moveTo(-r, y)
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI
    s.lineTo(Math.cos(a) * r, y + Math.sin(a) * r)
  }
  s.lineTo(r, y)
  b.add(W, new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 12 }), M(m, mat(0, 0, -depth + 0.02)))
  // outer arch moulding + inner arch band (grey-blue ornament)
  const ring = (r0: number, r1: number) => {
    const sh = new THREE.Shape()
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - (i / 24) * Math.PI
      const p = [Math.cos(a) * r1, y + Math.sin(a) * r1]
      if (i === 0) sh.moveTo(p[0], p[1])
      else sh.lineTo(p[0], p[1])
    }
    for (let i = 24; i >= 0; i--) {
      const a = Math.PI - (i / 24) * Math.PI
      sh.lineTo(Math.cos(a) * r0, y + Math.sin(a) * r0)
    }
    return sh
  }
  b.add(TR, new THREE.ExtrudeGeometry(ring(r - 0.05, r + 0.3), { depth: 0.22, bevelEnabled: false }), M(m, mat(0, 0, 0.0)))
  b.add(ORN, new THREE.ExtrudeGeometry(ring(r - 0.75, r - 0.3), { depth: 0.08, bevelEnabled: false }), M(m, mat(0, 0, 0.02)))
}

/** Tall cross-headed window (west front): slender arched light with a quatrefoil top. */
function crossWindow(b: Builder, m: THREE.Matrix4, u: number, y0: number, h: number) {
  const mm = M(m, mat(u, 0, 0))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(openingRound(0.62, h, y0))), M(mm, mat(0, 0, 0.04)))
  b.add('glassC', new THREE.CircleGeometry(0.4, 16), M(mm, mat(0, y0 + h + 0.15, 0.04)))
  for (const s of [-1, 1]) b.add('glassC', new THREE.CircleGeometry(0.3, 12), M(mm, mat(s * 0.5, y0 + h - 0.15, 0.04)))
  const fr = new THREE.Shape(openingRound(0.95, h + 0.2, y0 - 0.15))
  fr.holes.push(new THREE.Path(openingRound(0.62, h, y0)))
  b.add(ORN, new THREE.ExtrudeGeometry(fr, { depth: 0.08, bevelEnabled: false }), mm)
  b.add(TR, metricBox(0.75, 0.14, 0.22), M(mm, mat(0, y0 - 0.08, 0.1)))
}
function openingRound(w: number, h: number, y0: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, y0), new THREE.Vector2(w / 2, y0)]
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI
    pts.push(new THREE.Vector2(Math.cos(a) * (w / 2), y0 + h - w / 2 + Math.sin(a) * (w / 2)))
  }
  return pts
}

/** Octagonal drum with arched windows, cornice, octagonal bulb dome, finial and cross. */
function domeTower(b: Builder, cx: number, cz: number, r: number, y0: number, y1: number, domeH: number, winW: number, winH: number, crossS: number) {
  const ph = Math.PI / 8
  helm(b, W, { x: cx, z: cz, n: 8, stations: [[r, y0], [r, y1]], phase: ph, flat: true })
  // base moulding and cornice
  helm(b, TR, { x: cx, z: cz, n: 8, stations: [[r + 0.18, y0], [r + 0.18, y0 + 0.35]], phase: ph, flat: true })
  helm(b, ORN, { x: cx, z: cz, n: 8, stations: [[r + 0.06, y1 - 1.0], [r + 0.06, y1 - 0.45]], phase: ph, flat: true })
  helm(b, TR, { x: cx, z: cz, n: 8, stations: [[r + 0.15, y1 - 0.45], [r + 0.45, y1 - 0.1], [r + 0.45, y1]], phase: ph, flat: true })
  // corner colonnettes
  for (let k = 0; k < 8; k++) {
    const a = ph + (k / 8) * Math.PI * 2
    b.add(TR, new THREE.CylinderGeometry(0.13, 0.13, y1 - y0 - 1.4, 8), mat(cx + Math.cos(a) * (r + 0.05), (y0 + y1 - 1.0) / 2 + 0.2, cz + Math.sin(a) * (r + 0.05)))
  }
  // windows: one per face, centred on the face normals
  const ap = r * Math.cos(Math.PI / 8)
  const wy = y0 + (y1 - y0 - winH) * 0.45
  for (let k = 0; k < 8; k++) {
    const th = (k / 8) * Math.PI * 2
    const m = mat(cx + Math.cos(th) * ap, 0, cz + Math.sin(th) * ap, Math.PI / 2 - th)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(openingRound(winW, winH, wy))), M(m, mat(0, 0, 0.04)))
    const fr = new THREE.Shape(openingRound(winW + 0.36, winH + 0.24, wy - 0.18))
    fr.holes.push(new THREE.Path(openingRound(winW, winH, wy)))
    b.add(ORN, new THREE.ExtrudeGeometry(fr, { depth: 0.1, bevelEnabled: false }), m)
  }
  // octagonal bulb dome (photos 01–03): short vertical band, swelling bulb, neck
  const R = r + 0.45
  const st: [number, number][] = [
    [R, y1],
    [R * 0.98, y1 + domeH * 0.12],
    [R * 1.02, y1 + domeH * 0.3],
    [R * 0.92, y1 + domeH * 0.5],
    [R * 0.68, y1 + domeH * 0.72],
    [R * 0.36, y1 + domeH * 0.9],
    [R * 0.14, y1 + domeH],
  ]
  helm(b, CU, { x: cx, z: cz, n: 8, stations: st, phase: ph })
  // roll caps on the dome edges
  for (let k = 0; k < 8; k++) {
    const a = ph + (k / 8) * Math.PI * 2
    for (let i = 0; i < st.length - 1; i++) {
      const p = V(cx + Math.cos(a) * (st[i][0] + 0.03), st[i][1], cz + Math.sin(a) * (st[i][0] + 0.03))
      const q = V(cx + Math.cos(a) * (st[i + 1][0] + 0.03), st[i + 1][1], cz + Math.sin(a) * (st[i + 1][0] + 0.03))
      b.beam(CU, p, q, 0.09, 0.07, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  // decorative band at the base of the bulb
  helm(b, CU, { x: cx, z: cz, n: 8, stations: [[R + 0.06, y1 + domeH * 0.08], [R + 0.06, y1 + domeH * 0.2]], phase: ph, flat: true })
  // small lantern finial + cross
  const yt = y1 + domeH
  b.add(CU, new THREE.CylinderGeometry(0.12, R * 0.16, 0.5, 8), mat(cx, yt + 0.25, cz))
  b.add(CU, new THREE.SphereGeometry(0.22, 10, 8), mat(cx, yt + 0.62, cz))
  cross(b, 'iron', cx, yt + 0.62, cz, crossS, false, 0)
}

/** Half-dome (quarter sphere) of radius r at (cx, y, cz) opening towards direction angle th (x = cos, z = sin). */
function halfDome(b: Builder, cx: number, y: number, cz: number, r: number, th: number) {
  const prof: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2)
    prof.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * r), Math.sin(a) * r * 0.62))
  }
  // LatheGeometry: x = r·sin(phi), z = r·cos(phi); centre phi on direction th
  const phiC = Math.atan2(Math.cos(th), Math.sin(th))
  b.add(CU, new THREE.LatheGeometry(prof, 20, phiC - Math.PI / 2, Math.PI), mat(cx, y, cz))
  // meridian ribs (standing seams)
  for (let k = 1; k < 10; k++) {
    const phi = phiC - Math.PI / 2 + (k / 10) * Math.PI
    const d = V(Math.sin(phi), 0, Math.cos(phi))
    for (let i = 0; i < 10; i++) {
      const p = prof[i]
      const q = prof[i + 1]
      b.beam(CU, V(cx + d.x * (p.x + 0.02), y + p.y, cz + d.z * (p.x + 0.02)), V(cx + d.x * (q.x + 0.02), y + q.y, cz + d.z * (q.x + 0.02)), 0.05, 0.05, d)
    }
  }
}

/** Half-cylinder wall (conch/apse) with base moulding and cornice, opening towards th. */
function halfDrum(b: Builder, cx: number, cz: number, r: number, h: number, th: number) {
  const phiC = Math.atan2(Math.cos(th), Math.sin(th))
  const t0 = phiC - Math.PI / 2
  b.add(W, new THREE.CylinderGeometry(r, r, h, 24, 1, false, t0, Math.PI), mat(cx, h / 2, cz))
  b.add('vinSocle', new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.9, 24, 1, true, t0, Math.PI), mat(cx, 0.45, cz))
  b.add(ORN, new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.5, 24, 1, true, t0, Math.PI), mat(cx, h - 0.9, cz))
  b.add(TR, new THREE.CylinderGeometry(r + 0.32, r + 0.12, 0.45, 24, 1, true, t0, Math.PI), mat(cx, h - 0.22, cz))
}

function build(): Builder {
  const b = new Builder()

  /* ================= west block ================= */
  const wbx = (WB.x0 + WB.x1) / 2
  const wbl = WB.x1 - WB.x0
  b.block(W, wbl, WB_EAVE, 2 * WB.hz, wbx, 0, 0)
  b.block('vinSocle', wbl + 0.2, 0.9, 2 * WB.hz + 0.2, wbx, 0, 0)
  b.block(ORN, wbl + 0.1, 0.35, 2 * WB.hz + 0.1, wbx, 4.9, 0)
  // higher central part between the tower bays with attic cornice
  b.block(W, wbl, WB_TOP - WB_EAVE + 0.01, 2 * (WB.hz - BAY), wbx, WB_EAVE - 0.01, 0)
  b.block(ORN, 0.12, 0.5, 2 * (WB.hz - BAY), WB.x0 - 0.05, WB_TOP - 1.1, 0)
  b.block(TR, wbl + 0.5, 0.35, 2 * (WB.hz - BAY) + 0.3, wbx, WB_TOP - 0.35, 0)
  b.block(CU, wbl + 0.55, 0.05, 2 * (WB.hz - BAY) + 0.35, wbx, WB_TOP, 0)
  for (const u of [-1.6, 0, 1.6]) b.add('glassC', metricBox(0.45, 0.75, 0.04), mat(WB.x0 - 0.02, WB_TOP - 1.95, u))
  // cornice of the west block at the springing level
  b.block(TR, wbl + 0.5, 0.32, 2 * WB.hz + 0.5, wbx, WB_EAVE - 0.32, 0)

  // tower bays: arched gables on the west and outer faces, cross barrels, square tower base
  for (const sz of [-1, 1]) {
    const tz = sz * TOWER_Z
    archGable(b, mat(WB.x0, 0, tz, -Math.PI / 2), BAY / 2, WB_EAVE)
    archGable(b, mat(TOWER_X, 0, sz * WB.hz, sz > 0 ? 0 : Math.PI), BAY / 2, WB_EAVE)
    barrelRoof(b, CU, { x: TOWER_X, z: tz, w: BAY, d: BAY, y: WB_EAVE, rise: BAY / 2, segs: 14, seams: SEAM, overhang: 0.15 })
    barrelZ(b, TOWER_X, tz, BAY, BAY, WB_EAVE, BAY / 2)
    // east half of the bay towards the nave: flat copper roof at the springing
    b.block(CU, WB.x1 - (WB.x0 + BAY), 0.08, BAY, (WB.x0 + BAY + WB.x1) / 2, WB_EAVE, tz)
    // square tower base with cornice
    const tb = 2.3
    b.block(W, 2 * tb, 15.6 - 13.0, 2 * tb, TOWER_X, 13.0, tz)
    b.block(ORN, 2 * tb + 0.08, 0.4, 2 * tb + 0.08, TOWER_X, 14.6, tz)
    b.block(TR, 2 * tb + 0.6, 0.35, 2 * tb + 0.6, TOWER_X, 15.25, tz)
    b.block(CU, 2 * tb + 0.64, 0.05, 2 * tb + 0.64, TOWER_X, 15.6, tz)
    domeTower(b, TOWER_X, tz, 2.0, 15.6, 20.9, 3.2, 0.62, 2.9, 1.7)
    // cross-headed windows in the bay fronts
    crossWindow(b, mat(WB.x0, 0, tz, -Math.PI / 2), 0, 5.6, 4.4)
    crossWindow(b, mat(TOWER_X, 0, sz * WB.hz, sz > 0 ? 0 : Math.PI), 0, 5.6, 4.4)
    // lower small windows
    window_(b, sz > 0 ? '+z' : '-z', sz * WB.hz, sz > 0 ? TOWER_X : -TOWER_X, 2.0, { type: 'round', w: 0.7, h: 1.8, frame: 0.14, frameKey: ORN, glassKey: 'glassC' })
  }
  // flat copper roof over the narthex behind the central part
  b.block(CU, wbl - BAY + 0.2, 0.06, 2 * (WB.hz - BAY), (WB.x0 + BAY + WB.x1) / 2, WB_TOP + 0.01, 0)

  /* ================= naos ================= */
  const nx = (NAOS.x0 + NAOS.x1) / 2
  const nl = NAOS.x1 - NAOS.x0
  b.block(W, nl, NAOS_EAVE, 2 * NAOS.hz, nx, 0, 0)
  b.block('vinSocle', nl + 0.2, 0.9, 2 * NAOS.hz + 0.2, nx, 0, 0)
  b.block(ORN, nl + 0.1, 0.35, 2 * NAOS.hz + 0.1, nx, 4.9, 0)
  b.block(ORN, nl + 0.08, 0.45, 2 * NAOS.hz + 0.08, nx, NAOS_EAVE - 1.0, 0)
  b.block(TR, nl + 0.5, 0.32, 2 * NAOS.hz + 0.5, nx, NAOS_EAVE - 0.32, 0)
  // flat copper roofs on the corners of the cross
  b.block(CU, nl + 0.4, 0.06, 2 * NAOS.hz + 0.4, nx, NAOS_EAVE, 0)
  // cruciform barrels: E–W over the whole naos, N–S over the crossing
  barrelRoof(b, CU, { x: nx, z: 0, w: nl, d: 2 * ARM_R, y: NAOS_EAVE, rise: ARM_R, segs: 18, seams: SEAM, overhang: 0.25 })
  barrelZ(b, CROSS_X, 0, 2 * NAOS.hz, 2 * ARM_R, NAOS_EAVE, ARM_R)
  // arched gables at the N/S ends of the crossing arm (above the conches) and at the east end
  for (const sz of [-1, 1]) archGable(b, mat(CROSS_X, 0, sz * NAOS.hz, sz > 0 ? 0 : Math.PI), ARM_R, NAOS_EAVE, 0.5)
  archGable(b, mat(NAOS.x1, 0, 0, Math.PI / 2), ARM_R, NAOS_EAVE, 0.5)
  // nave windows (west arm) and arched windows in the arched gables
  for (const sz of [-1, 1]) {
    const f = sz > 0 ? '+z' : '-z'
    for (const x of [-7.2, -3.4]) {
      const u = sz > 0 ? x : -x
      window_(b, f, sz * NAOS.hz, u, 5.6, { type: 'round', w: 1.2, h: 4.2, frame: 0.2, frameKey: ORN, glassKey: 'glassC', sill: true })
      window_(b, f, sz * NAOS.hz, u, 1.9, { type: 'round', w: 0.9, h: 2.0, frame: 0.16, frameKey: ORN, glassKey: 'glassC' })
    }
    const u = sz > 0 ? CROSS_X : -CROSS_X
    window_(b, f, sz * NAOS.hz, u, NAOS_EAVE + 0.6, { type: 'round', w: 1.1, h: 2.2, frame: 0.18, frameKey: ORN, glassKey: 'glassC' })
  }
  // central tower: square base over the crossing, octagonal drum, bulb dome
  b.block(W, 2 * 3.4, 17.0 - 14.4, 2 * 3.4, CROSS_X, 14.4, 0)
  b.block(ORN, 2 * 3.4 + 0.08, 0.4, 2 * 3.4 + 0.08, CROSS_X, 16.0, 0)
  b.block(TR, 2 * 3.4 + 0.6, 0.35, 2 * 3.4 + 0.6, CROSS_X, 16.65, 0)
  b.block(CU, 2 * 3.4 + 0.64, 0.05, 2 * 3.4 + 0.64, CROSS_X, 17.0, 0)
  domeTower(b, CROSS_X, 0, 2.9, 17.0, 22.6, 4.2, 0.85, 3.3, 2.0)

  /* ================= conches ================= */
  for (const sz of [-1, 1]) {
    const th = sz > 0 ? Math.PI / 2 : -Math.PI / 2
    halfDrum(b, CROSS_X, sz * NAOS.hz, CONCH_R, LOW_EAVE, th)
    halfDome(b, CROSS_X, LOW_EAVE, sz * NAOS.hz, CONCH_R + 0.35, th)
    // three arched windows
    for (const a of [-50, 0, 50]) {
      const t = th + (a * Math.PI) / 180
      const m = mat(CROSS_X + Math.cos(t) * CONCH_R, 0, sz * NAOS.hz + Math.sin(t) * CONCH_R, Math.PI / 2 - t)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(openingRound(1.0, 3.6, 5.4))), M(m, mat(0, 0, 0.05)))
      const fr = new THREE.Shape(openingRound(1.4, 3.85, 5.2))
      fr.holes.push(new THREE.Path(openingRound(1.0, 3.6, 5.4)))
      b.add(ORN, new THREE.ExtrudeGeometry(fr, { depth: 0.1, bevelEnabled: false }), M(m, mat(0, 0, 0.02)))
    }
  }

  /* ================= altar bay + apse ================= */
  {
    const l = APSE.cx - APSE.x0
    b.block(W, l + 0.01, LOW_EAVE, 2 * APSE.r, (APSE.x0 + APSE.cx) / 2, 0, 0)
    b.block(ORN, l, 0.5, 2 * APSE.r + 0.08, (APSE.x0 + APSE.cx) / 2, LOW_EAVE - 0.9, 0)
    b.block(TR, l, 0.4, 2 * APSE.r + 0.5, (APSE.x0 + APSE.cx) / 2, LOW_EAVE - 0.4, 0)
    barrelRoof(b, CU, { x: (APSE.x0 + APSE.cx) / 2 - 0.2, z: 0, w: l + 0.4, d: 2 * APSE.r, y: LOW_EAVE, rise: 1.6, segs: 12, seams: SEAM, overhang: 0.3 })
    halfDrum(b, APSE.cx, 0, APSE.r, LOW_EAVE, 0)
    halfDome(b, APSE.cx, LOW_EAVE, 0, APSE.r + 0.35, 0)
    for (const a of [-55, 0, 55]) {
      const t = (a * Math.PI) / 180
      const m = mat(APSE.cx + Math.cos(t) * APSE.r, 0, Math.sin(t) * APSE.r, Math.PI / 2 - t)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(openingRound(0.9, 3.2, 5.4))), M(m, mat(0, 0, 0.05)))
      const fr = new THREE.Shape(openingRound(1.3, 3.45, 5.2))
      fr.holes.push(new THREE.Path(openingRound(0.9, 3.2, 5.4)))
      b.add(ORN, new THREE.ExtrudeGeometry(fr, { depth: 0.1, bevelEnabled: false }), M(m, mat(0, 0, 0.02)))
    }
  }

  /* ================= west porch ================= */
  {
    const { x0, x1, hz } = PORCH
    const xc = (x0 + x1) / 2
    const depth = x1 - x0
    const H = 8.0
    // podium + steps
    b.block('vinStone', depth + 0.2, 0.75, 2 * hz + 0.2, xc, 0, 0)
    for (let i = 0; i < 3; i++) b.block('vinStone', 0.36, 0.75 - (i + 1) * 0.25, 6.0, x0 - 0.18 - i * 0.36, 0, 0)
    // columns on pedestals (front and back corners), three arches on the front, two on the sides
    const cols = [-4.1, -1.65, 1.65, 4.1]
    for (const z of cols) {
      for (const x of z === cols[0] || z === cols[3] ? [x0 + 0.4, x1 - 0.4] : [x0 + 0.4]) {
        b.block('vinStone', 0.75, 0.9, 0.75, x, 0.75, z)
        b.add(TR, new THREE.CylinderGeometry(0.27, 0.3, 2.9, 14), mat(x, 1.65 + 1.45, z))
        b.add(TR, new THREE.CylinderGeometry(0.42, 0.28, 0.45, 12), mat(x, 4.78, z))
        b.block(TR, 0.85, 0.16, 0.85, x, 5.0, z)
      }
    }
    // arcade walls: front with a wide central arch, sides with one arch each
    const arcade = (m: THREE.Matrix4, L: number, spans: [number, number][]) => {
      const sh = new THREE.Shape()
      sh.moveTo(-L / 2, 5.16)
      for (const [u0, u1] of spans) {
        const r = (u1 - u0) / 2
        const c = (u0 + u1) / 2
        sh.lineTo(u0, 5.16)
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI - (i / 12) * Math.PI
          sh.lineTo(c + Math.cos(a) * r, 5.16 + Math.sin(a) * r * 0.9)
        }
        sh.lineTo(u1, 5.16)
      }
      sh.lineTo(L / 2, 5.16)
      sh.lineTo(L / 2, H - 0.6)
      sh.lineTo(-L / 2, H - 0.6)
      b.add(W, new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }), M(m, mat(0, 0, -0.45)))
    }
    arcade(mat(x0, 0, 0, -Math.PI / 2), 2 * hz, [
      [-3.75, -2.0],
      [-1.3, 1.3],
      [2.0, 3.75],
    ])
    for (const sz of [-1, 1]) arcade(mat(xc, 0, sz * hz, sz > 0 ? 0 : Math.PI), depth, [[-0.85, 0.85]])
    // entablature with roundels, cornice, cresting, flat copper roof
    b.block(TR, depth + 0.3, 0.3, 2 * hz + 0.3, xc, H - 0.6, 0)
    b.block(ORN, 0.1, 0.42, 2 * hz - 0.4, x0 - 0.22, H - 1.25, 0)
    for (let z = -hz + 0.6; z <= hz - 0.5; z += 0.72) b.add(TR, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12), mat(x0 - 0.27, H - 1.05, z, 0, 0, Math.PI / 2))
    b.block(TR, depth + 0.55, 0.22, 2 * hz + 0.55, xc, H - 0.3, 0)
    b.block(CU, depth + 0.45, 0.06, 2 * hz + 0.45, xc, H - 0.08, 0)
    for (let z = -hz + 0.2; z <= hz - 0.1; z += 0.55) {
      b.add(ORN, new THREE.ConeGeometry(0.13, 0.42, 4), mat(x0 - 0.12, H + 0.17, z))
    }
    // back wall: main door
    door(b, '-x', WB.x0, 0, { w: 1.9, h: 3.8, y0: 0.75, leafKey: 'vinDoor', frameKey: ORN, frame: 0.2 })
    // shadowed porch interior
    b.block('vinShade', 0.05, 4.2, 2 * hz - 1.2, WB.x0 - 0.03, 0.75, 0)
  }

  /* ================= gutters / downpipes ================= */
  for (const sz of [-1, 1]) {
    b.rod(CU, V(NAOS.x0 + 0.3, 0.3, sz * (NAOS.hz + 0.1)), V(NAOS.x0 + 0.3, NAOS_EAVE - 0.3, sz * (NAOS.hz + 0.1)), 0.06, 8)
    b.rod(CU, V(WB.x1 - 0.3, 0.3, sz * (WB.hz + 0.1)), V(WB.x1 - 0.3, WB_EAVE - 0.3, sz * (WB.hz + 0.1)), 0.06, 8)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [3.5, 24, 0],
  materials: () => ({
    vinRender: new THREE.MeshStandardMaterial({ color: '#f0eee8', roughness: 0.88 }),
    vinTrim: new THREE.MeshStandardMaterial({ color: '#f7f6f2', roughness: 0.8 }),
    vinOrn: new THREE.MeshStandardMaterial({ color: '#8f9aa8', roughness: 0.85 }),
    vinSocle: new THREE.MeshStandardMaterial({ color: '#c9c6bf', roughness: 0.9 }),
    vinStone: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.85 }),
    vinDoor: new THREE.MeshStandardMaterial({ color: '#3b3f46', roughness: 0.6 }),
    vinShade: new THREE.MeshStandardMaterial({ color: '#6f7480', roughness: 0.95 }),
  }),
  notes:
    'Byzantine-revival church with two west towers, a domed crossing with lateral conches, altar apse and a three-arched west porch; roofs, half-domes and domes shown in weathered copper per the COLOR METAL records (available photographs predate the 2013–2015 works).',
}
export default model
