/**
 * Old Orthodox church „Adormirea Maicii Domnului", Sadu (Sibiu) — the stone
 * church of the Sadu I parish, OSM way 356032358 (outline 28.7 × 10.5 m, long
 * axis 71.4°).
 *
 * Modelling specification (real metres; +X = 71.4°, towards the altar apse;
 * +Z = south side with the arcaded recesses, photo 01):
 *  - Plan after the OSM outline: hall nave 18.45 × 10.5 m (west wall x −9.55,
 *    apse junction x 8.9), a full-width five-sided altar apse 5.45 m deep, and
 *    a 5.3 m square west bell tower standing in front of the nave's west wall.
 *  - Nave walls ≈ 4.4 m to the eaves (window and door sizes as scale), lilac
 *    socle, ochre render; south side (photo 01): a broad white blind arch with
 *    a window, two open round-arched recesses (door / window inside), a narrower
 *    white arch with a window and an oculus under the eaves; north side (photo
 *    02): niche, deep recess with a window, arched main door, niche. A band of
 *    painted icon panels runs under the eaves all round.
 *  - Steep (≈ 45°) roof, ridge ≈ 9.7 m: a very steep hip against the tower at
 *    the west end, a five-facet hip over the apse with a cross finial, an
 *    eyebrow dormer on the north slope.
 *  - Tower: eaves ≈ 14.8 m (photo ratios: ≈ 2.7 × its width, ≈ 3.3 × the nave
 *    eaves). White corner pilasters and register bands; brick-relief
 *    ornament as photographed — interlaced red loops (lower register), a chain
 *    of white rings, a white blind arcade with a larger central arch and a
 *    small window, then the belfry with one round-arched opening and a clock
 *    per face. West face: door, icon in a pointed frame and a relief cross.
 *  - Helm: square skirt roof, octagonal onion bulb (Ø ≈ 4.4 m), neck, louvred
 *    octagonal lantern, small onion, ball and cross (top ≈ 23.5 m).
 *  - METAL (client rule): the only photographs (2010) predate the 2022 works
 *    and show a clay-tile nave roof and a grey sheet helm. COLOR METAL supplied
 *    natural titanium-zinc (elZinc Natural) and a rainwater system according to
 *    its records; which surfaces were re-covered is not documented, so the
 *    nave/apse roof, the tower skirt and the whole helm are shown in
 *    natural titanium-zinc standing seam (≈ 0.52 m pans), with zinc gutters
 *    and downpipes.
 * Approximations: all heights estimated from ground photographs (no survey);
 * apse windows and the west wall beside the tower not photographed; brick
 * ornament simplified to square-section ribs; icon frieze as coloured panels.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, loft, helm, cross, faceFrame, seams, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- plan ---------------- */
const XW = -9.55 // nave west wall
const XE = 8.9 // nave → apse
const HW = 5.25 // nave half width
const ARX = 5.45 // apse depth
const APSE_N = 5 // apse facets
const TCX = -11.75 // tower centre
const THW = 2.65 // tower half width
const WALL_T = 0.9 // thickness of the long walls (recess depth)

/* ---------------- heights ---------------- */
const SOCLE = 0.8
const EAVE = 4.4
const PITCH = 45
const T = Math.tan(PITCH * D2R)
const OV = 0.35
const EY = EAVE - OV * T // eave line at the overhang edge
const RIDGE = EAVE + HW * T
const XR0 = -8.1 // apex of the steep west hip
const TTOP = 14.8 // tower eaves
const TS = TTOP / 14.5 // vertical scale of the tower ornament (laid out for 14.5 m)
const HDY = TTOP - 14.5 // helm offset

const ROOF = 'zincNatural'
const SEAM = seams(ROOF, 0.52, 0.05, 0.045)
const WALL = 'saduOchre'
const TOWER = 'saduTower'
const WHITE = 'saduWhite'
const SOCLE_K = 'saduSocle'
const RED = 'saduRed'
const FRAME = 'saduFrame'

/** Apse ring (half-ellipse polygon), ordered for outward-facing loft sides. */
function apseRing(rx: number, rz: number, y: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= APSE_N; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / APSE_N
    pts.push(V(XE + Math.cos(a) * rx, y, Math.sin(a) * rz))
  }
  return pts
}

/** Face frame at world coordinate x (or z) along a nave façade. */
function F(face: Face, plane: number, w: number) {
  const u = face === '+z' ? w : face === '-z' ? -w : face === '+x' ? -w : w
  return faceFrame(face, plane, u, 0, 0)
}

/** Window with dark brown frame and a cross bar. */
function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.05)))
  b.add(FRAME, extrude(frameShape(type, w, h, 0.07, 0, y0), 0.08), M(m, mat(0, 0, 0.02)))
  b.add(FRAME, metricBox(0.05, h * 0.92, 0.05), M(m, mat(0, y0 + h * 0.46, 0.08)))
  b.add(FRAME, metricBox(w, 0.05, 0.05), M(m, mat(0, y0 + h * 0.6, 0.08)))
}

/** White blind arch (flat painted niche) with a window inside. */
function niche(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, ww: number, wh: number, wy: number) {
  b.add(WHITE, new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, SOCLE, 16))), M(m, mat(0, 0, 0.02)))
  win(b, m, 'rect', ww, wh, wy)
  b.add(WHITE, metricBox(ww + 0.3, 0.1, 0.18), M(m, mat(0, wy - 0.12, 0.09)))
}

/** Closed elliptical rib (brick relief) in a face frame. */
function ellipseRib(rx: number, ry: number, tube: number, seg = 26) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pts.push(V(Math.cos(a) * rx, Math.sin(a) * ry, 0))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), seg * 2, tube, 4, true)
}

/** Round-headed arch rib (two legs + half torus). */
function archRib(b: Builder, key: string, m: THREE.Matrix4, x: number, y0: number, w: number, legH: number, t = 0.07) {
  b.add(key, metricBox(2 * t, legH, 2 * t), M(m, mat(x - w / 2, y0 + legH / 2, t)))
  b.add(key, metricBox(2 * t, legH, 2 * t), M(m, mat(x + w / 2, y0 + legH / 2, t)))
  b.add(key, new THREE.TorusGeometry(w / 2, t, 4, 12, Math.PI), M(m, mat(x, y0 + legH, t)))
}

/** Clock face in a face frame. */
function clock(b: Builder, m: THREE.Matrix4, y: number, r = 0.42) {
  b.add(WHITE, new THREE.CircleGeometry(r, 24), M(m, mat(0, y, 0.04)))
  b.add('black', new THREE.TorusGeometry(r, 0.03, 4, 24), M(m, mat(0, y, 0.05)))
  b.add('black', metricBox(0.04, r * 0.75, 0.02), M(m, mat(0, y + r * 0.3, 0.06)))
  b.add('black', metricBox(r * 0.55, 0.04, 0.02), M(m, mat(r * 0.22, y, 0.06)))
}

const ICONS = ['saduIconA', 'saduIconB', 'saduIconC']

/** Icon frieze under the eaves along a straight wall piece (local x from u0 to u1). */
function frieze(b: Builder, m: THREE.Matrix4, u0: number, u1: number, skip: number[] = [], seed = 0) {
  const y0 = EAVE - 1.05
  b.add(WHITE, metricBox(u1 - u0, 0.62, 0.03), M(m, mat((u0 + u1) / 2, y0 + 0.31, 0.015)))
  const n = Math.floor((u1 - u0 - 0.2) / 0.58)
  const s0 = (u0 + u1) / 2 - ((n - 1) * 0.58) / 2
  for (let i = 0; i < n; i++) {
    const u = s0 + i * 0.58
    if (skip.some((k) => Math.abs(k - u) < 0.5)) continue
    b.add(ICONS[(i + seed) % 3], metricBox(0.44, 0.46, 0.03), M(m, mat(u, y0 + 0.31, 0.04)))
  }
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave walls (core + long walls with recesses) ---------------- */
  const nl = XE - XW
  b.block(WALL, nl, EAVE, 2 * (HW - WALL_T), (XW + XE) / 2, 0, 0)
  type Rec = { x: number; w: number; h: number }
  const southRec: Rec[] = [
    { x: -0.8, w: 2.5, h: 3.1 },
    { x: 2.3, w: 2.35, h: 3.1 },
  ]
  const northRec: Rec[] = [{ x: 2.4, w: 2.6, h: 3.1 }]
  const longWall = (recs: Rec[], z0: number) => {
    const s = new THREE.Shape([new THREE.Vector2(XW, 0), new THREE.Vector2(XE, 0), new THREE.Vector2(XE, EAVE), new THREE.Vector2(XW, EAVE)])
    for (const r of recs) s.holes.push(new THREE.Path(opening('round', r.w, r.h, r.x, 0.0, 16)))
    b.add(WALL, extrude(s, WALL_T, 16), mat(0, 0, z0))
  }
  longWall(southRec, HW - WALL_T)
  longWall(northRec, -HW)
  // recess details: white arch surround, step, opening at the back
  for (const [recs, face, plane] of [
    [southRec, '+z', HW],
    [northRec, '-z', -HW],
  ] as [Rec[], Face, number][]) {
    const back = face === '+z' ? HW - WALL_T : -(HW - WALL_T)
    for (const r of recs) {
      b.add(WHITE, extrude(frameShape('round', r.w, r.h, 0.2, 0, 0), 0.05), M(F(face, plane, r.x), mat(0, 0, 0)))
      b.block(WHITE, r.w, 0.18, WALL_T, r.x, 0, (plane + back) / 2)
    }
  }
  // south recess 1: door, recess 2: window; north recess: window
  {
    const m = F('+z', HW - WALL_T, -0.8)
    b.add(FRAME, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, 2.4, 0, 0.18, 12))), M(m, mat(0, 0, 0.03)))
    b.add(WHITE, extrude(frameShape('round', 1.2, 2.4, 0.12, 0, 0.18), 0.04), m)
    win(b, F('+z', HW - WALL_T, 2.3), 'round', 0.85, 1.45, 1.1)
    win(b, F('-z', -(HW - WALL_T), 2.4), 'round', 0.95, 1.5, 1.05)
  }

  /* ---------------- apse ---------------- */
  b.add(WALL, loft([apseRing(ARX, HW, 0), apseRing(ARX, HW, EAVE)], { capTop: true, flat: true }))
  b.add(SOCLE_K, loft([apseRing(ARX + 0.05, HW + 0.05, 0), apseRing(ARX + 0.05, HW + 0.05, SOCLE)], { capTop: true, flat: true }))
  const ring = apseRing(ARX, HW, 0)
  const apseFrames: { m: THREE.Matrix4; w: number }[] = []
  for (let i = 0; i < APSE_N; i++) {
    const p = ring[i]
    const q = ring[i + 1]
    const mid = p.clone().add(q).multiplyScalar(0.5)
    const d = q.clone().sub(p)
    const n = V(d.z, 0, -d.x).normalize() // outward (ring runs −z → +z on the +x side)
    apseFrames.push({ m: mat(mid.x, 0, mid.z, Math.atan2(n.x, n.z)), w: d.length() })
    // white corner pilasters
    if (i > 0) b.add(WHITE, metricBox(0.4, EAVE - SOCLE, 0.4), mat(p.x, SOCLE + (EAVE - SOCLE) / 2, p.z, Math.atan2(n.x, n.z)))
  }
  apseFrames.forEach(({ m, w }, i) => {
    frieze(b, m, -w / 2 + 0.15, w / 2 - 0.15, [], i)
    if (i === 1 || i === 3) niche(b, m, 'round', 1.7, 2.35, 0.8, 1.3, 1.45)
  })

  /* ---------------- socle, corner pilasters ---------------- */
  const socleRun = (face: Face, plane: number, recs: Rec[]) => {
    const cuts = recs.map((r) => [r.x - r.w / 2, r.x + r.w / 2]).sort((a, c) => a[0] - c[0])
    let x = XW
    const segs: [number, number][] = []
    for (const [c0, c1] of cuts) {
      segs.push([x, c0])
      x = c1
    }
    segs.push([x, XE])
    const zc = plane + (face === '+z' ? 0.03 : -0.03)
    for (const [x0, x1] of segs) b.block(SOCLE_K, x1 - x0, SOCLE, 0.06, (x0 + x1) / 2, 0, zc)
  }
  socleRun('+z', HW, southRec)
  socleRun('-z', -HW, northRec)
  for (const sz of [-1, 1]) b.block(WHITE, 0.45, EAVE - SOCLE, 0.08, XW + 0.3, SOCLE, sz * (HW + 0.04))
  // west wall beside the tower
  for (const sz of [-1, 1]) b.block(SOCLE_K, 0.06, SOCLE, HW - THW, XW - 0.03, 0, sz * (HW + THW) / 2)

  /* ---------------- south façade (photo 01) ---------------- */
  {
    const P = HW
    niche(b, F('+z', P, -5.65), 'segment', 4.3, 2.45, 1.15, 1.45, 1.3)
    niche(b, F('+z', P, 5.85), 'round', 2.75, 2.45, 1.05, 1.4, 1.3)
    // oculus under the eaves
    const mo = F('+z', P, -5.65)
    b.add(WHITE, new THREE.TorusGeometry(0.3, 0.07, 6, 18), M(mo, mat(0, EAVE - 0.75, 0.06)))
    b.add('glassC', new THREE.CircleGeometry(0.28, 18), M(mo, mat(0, EAVE - 0.75, 0.04)))
    frieze(b, F('+z', P, 0), XW + 0.4, XE - 0.15, [-5.65], 0)
    // painted icons on the wall (photo 01)
    for (const x of [4.25, 7.6]) b.add('saduIconA', metricBox(0.5, 0.7, 0.03), M(F('+z', P, x), mat(0, 2.6, 0.03)))
  }

  /* ---------------- north façade (photo 02) ---------------- */
  {
    const P = -HW
    niche(b, F('-z', P, 6.1), 'round', 2.6, 2.45, 1.0, 1.4, 1.3)
    niche(b, F('-z', P, -5.6), 'round', 2.7, 2.45, 1.05, 1.4, 1.3)
    // arched main door with fanlight in a white arch
    const md = F('-z', P, -1.2)
    b.add(WHITE, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.4, 2.75, 0, SOCLE - 0.3, 16))), M(md, mat(0, 0, 0.02)))
    b.add(FRAME, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.45, 2.85, 0, 0.35, 12))), M(md, mat(0, 0, 0.04)))
    b.add(WHITE, metricBox(1.45, 0.08, 0.04), M(md, mat(0, 2.62, 0.06)))
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 0.62, 0, 2.66, 12))), M(md, mat(0, 0, 0.05)))
    // steps up to the door
    for (let i = 0; i < 3; i++) b.block('concreteLight', 2.6 - i * 0.3, 0.35 - i * 0.12, 0.4, -1.2, 0, -HW - 0.2 - (2 - i) * 0.4)
    b.add('saduIconB', metricBox(0.6, 0.8, 0.03), M(F('-z', P, 4.3), mat(0, 2.7, 0.03)))
    frieze(b, F('-z', P, 0), -(XE - 0.15), -(XW + 0.4), [], 1)
  }

  /* ---------------- roof (natural titanium-zinc) ---------------- */
  {
    const hz = HW + OV
    const xw = XW - OV
    for (const sz of [-1, 1]) facet(b, ROOF, [V(xw, EY, sz * hz), V(XE, EY, sz * hz), V(XE, RIDGE, 0), V(XR0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [V(xw, EY, -hz), V(xw, EY, hz), V(XR0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    const apex = V(XE, RIDGE, 0)
    const er = apseRing(ARX + OV, hz, EY)
    for (let i = 0; i < APSE_N; i++) facet(b, ROOF, [er[i], er[i + 1], apex], { seams: SEAM, thickness: 0.12 })
    // ridge and hip rolls
    const up = V(0, 0.05, 0)
    b.beam(ROOF, V(XR0, RIDGE + 0.05, 0), V(XE, RIDGE + 0.05, 0), 0.22, 0.12)
    for (const sz of [-1, 1]) b.beam(ROOF, V(xw, EY, sz * hz).add(up), V(XR0, RIDGE, 0).add(up), 0.18, 0.1)
    for (let i = 0; i <= APSE_N; i++) b.beam(ROOF, er[i].clone().add(up), apex.clone().add(up), 0.18, 0.1)
    // gutters (half-round, simplified as boxes) and downpipes
    const gy = EY - 0.08
    for (const sz of [-1, 1]) b.beam(ROOF, V(xw, gy, sz * (hz + 0.06)), V(XE, gy, sz * (hz + 0.06)), 0.16, 0.14)
    b.beam(ROOF, V(xw - 0.06, gy, -hz), V(xw - 0.06, gy, hz), 0.16, 0.14)
    const eg = apseRing(ARX + OV + 0.06, hz + 0.06, gy)
    for (let i = 0; i < APSE_N; i++) b.beam(ROOF, eg[i], eg[i + 1], 0.16, 0.14)
    for (const [x, z] of [
      [XW + 0.15, HW + 0.12],
      [XW + 0.15, -HW - 0.12],
      [XE - 0.25, HW + 0.12],
      [XE - 0.25, -HW - 0.12],
      [XE + ARX + 0.1, 0.0],
    ]) {
      b.rod(ROOF, V(x, 0.15, z), V(x, gy, z), 0.05, 8)
    }
    // cross finial at the east end of the ridge
    b.rod('iron', V(XE, RIDGE, 0), V(XE, RIDGE + 0.6, 0), 0.03, 6)
    cross(b, 'iron', XE, RIDGE + 0.45, 0, 0.9, false, Math.PI / 2)
    // eyebrow dormer on the north slope (photo 02)
    const dx = -3.0
    const zf = -3.6 // front (downhill) end of the eyebrow
    const yf = EY + (HW + OV + zf) * T
    b.add(ROOF, new THREE.CylinderGeometry(0.75, 0.75, 1.8, 14, 1, false, Math.PI / 2, Math.PI), mat(dx, yf - 0.02, zf + 0.9, 0, Math.PI / 2, 0, 1.3, 1, 0.75))
    b.add('glassC', new THREE.PlaneGeometry(1.3, 0.34), mat(dx, yf + 0.2, zf - 0.01, Math.PI))
  }

  /* ---------------- west bell tower ---------------- */
  {
    const tw = 2 * THW
    b.block(SOCLE_K, tw + 0.3, SOCLE + 0.1, tw + 0.3, TCX, 0, 0)
    b.block(TOWER, tw, TTOP, tw, TCX, 0, 0)
    // register bands and top cornice (white)
    const bands: [number, number, number][] = [
      [4.25, 0.32, 0.14],
      [7.6, 0.16, 0.08],
      [9.9, 0.16, 0.08],
      [12.1, 0.14, 0.08],
    ]
    for (const [y, h, g] of bands) b.block(WHITE, tw + 2 * g, h, tw + 2 * g, TCX, y * TS, 0)
    b.block(WHITE, tw + 0.24, 0.25, tw + 0.24, TCX, TTOP - 0.45, 0)
    b.block(WHITE, tw + 0.5, 0.22, tw + 0.5, TCX, TTOP - 0.2, 0)
    // corner pilasters
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      b.block(WHITE, 0.45, TTOP - 0.45 - SOCLE, 0.08, TCX + sx * (THW - 0.225), SOCLE, sz * (THW + 0.04))
      b.block(WHITE, 0.08, TTOP - 0.45 - SOCLE, 0.45, TCX + sx * (THW + 0.04), SOCLE, sz * (THW - 0.225))
    }
    // faces: 0 = south (+z), 1 = west (−x), 2 = north (−z), 3 = east (+x)
    const ry = [0, -Math.PI / 2, Math.PI, Math.PI / 2]
    ry.forEach((r, k) => {
      const m = M(mat(TCX + Math.sin(r) * THW, 0, Math.cos(r) * THW, r), mat(0, 0, 0, 0, 0, 0, 1, TS, 1))
      // lower register: interlaced red loops
      const loops = k === 1 ? [-1.5, 1.5] : [-1.5, -0.5, 0.5, 1.5]
      for (const u of loops) b.add(RED, ellipseRib(0.66, 1.42, 0.07), M(m, mat(u, 5.95, 0.07)))
      b.add(RED, metricBox(4.2, 0.12, 0.12), M(m, mat(0, 4.72, 0.06)))
      if (k === 1) {
        // icon in a pointed white frame, relief cross above (photo 03)
        b.add('saduIconB', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.2, 2.0, 0, 4.75, 10))), M(m, mat(0, 0, 0.03)))
        b.add(WHITE, extrude(frameShape('pointed', 1.2, 2.0, 0.16, 0, 4.75), 0.1), m)
        b.add(WHITE, metricBox(0.16, 0.75, 0.1), M(m, mat(0, 7.2, 0.05)))
        b.add(WHITE, metricBox(0.5, 0.16, 0.1), M(m, mat(0, 7.35, 0.05)))
        // portal
        b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.35, 2.5, 0, 0.25, 12))), M(m, mat(0, 0, 0.03)))
        b.add(WHITE, extrude(frameShape('round', 1.35, 2.5, 0.22, 0, 0.25), 0.1), m)
      }
      // chain of white rings
      for (const u of [-1.8, -0.9, 0, 0.9, 1.8]) b.add(WHITE, ellipseRib(0.5, 0.86, 0.065), M(m, mat(u, 8.76, 0.07)))
      // blind arcade with a larger central arch and a small window
      for (const u of [-1.78, -1.08, 1.08, 1.78]) archRib(b, WHITE, m, u, 10.1, 0.52, 1.25, 0.065)
      archRib(b, WHITE, m, 0, 10.1, 1.15, 1.2, 0.07)
      b.add('black', metricBox(0.28, 0.3, 0.02), M(m, mat(0, 10.75, 0.03)))
      // belfry: round-arched opening, clock
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 1.5, 0, 12.35, 12))), M(m, mat(0, 0, 0.03)))
      b.add(WHITE, extrude(frameShape('round', 0.9, 1.5, 0.1, 0, 12.35), 0.06), m)
      clock(b, m, 13.92)
      // bottom zone details
      if (k === 0) {
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.85, 1.6, 0, 1.0, 12))), M(m, mat(0, 0, 0.03)))
        b.add(WHITE, extrude(frameShape('round', 0.85, 1.6, 0.25, 0, 1.0), 0.08), m)
        // white cornice rising in a segmental eyebrow (photo 01)
        b.add(WHITE, metricBox(4.4, 0.16, 0.12), M(m, mat(0, 3.55, 0.06)))
        b.add(WHITE, new THREE.TorusGeometry(1.3, 0.08, 4, 14, Math.PI * 0.62), M(m, mat(0, 2.62, 0.08, 0, 0, Math.PI * 0.19)))
      }
      if (k === 2) {
        b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 2.2, 0, 0.3, 12))), M(m, mat(0, 0, 0.03)))
        b.add(WHITE, extrude(frameShape('round', 1.1, 2.2, 0.18, 0, 0.3), 0.08), m)
      }
    })

    /* ---------------- helm (natural titanium-zinc) ---------------- */
    const eo = THW + 0.62
    b.block(ROOF, 2 * eo, 0.18, 2 * eo, TCX, TTOP - 0.02, 0)
    // gutters + downpipes on the tower
    for (const [ax, az, bx, bz] of [
      [-1, 1, 1, 1],
      [-1, -1, 1, -1],
      [-1, -1, -1, 1],
      [1, -1, 1, 1],
    ]) b.beam(ROOF, V(TCX + ax * (eo + 0.05), TTOP - 0.05, az * (eo + 0.05)), V(TCX + bx * (eo + 0.05), TTOP - 0.05, bz * (eo + 0.05)), 0.14, 0.13)
    for (const sz of [-1, 1]) b.rod(ROOF, V(TCX - THW - 0.12, 0.2, sz * (THW + 0.12)), V(TCX - THW - 0.12, TTOP - 0.05, sz * (THW + 0.12)), 0.05, 8)
    // square skirt roof
    const sk0 = TTOP + 0.16
    const sk1 = TTOP + 0.8
    const ht = 1.62
    const c0 = [V(TCX - eo, sk0, -eo), V(TCX + eo, sk0, -eo), V(TCX + eo, sk0, eo), V(TCX - eo, sk0, eo)]
    const c1 = [V(TCX - ht, sk1, -ht), V(TCX + ht, sk1, -ht), V(TCX + ht, sk1, ht), V(TCX - ht, sk1, ht)]
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, ROOF, [c0[i], c0[j], c1[j], c1[i]], { seams: SEAM, thickness: 0.1 })
      b.beam(ROOF, c0[i].clone().add(V(0, 0.04, 0)), c1[i].clone().add(V(0, 0.04, 0)), 0.12, 0.08)
    }
    b.block(ROOF, 2 * ht, 0.05, 2 * ht, TCX, sk1 - 0.02, 0)
    const h = new Builder()
    // octagonal onion bulb with standing seams
    const ph = Math.PI / 8
    const bulb: [number, number][] = [
      [1.72, 15.2],
      [2.02, 15.55],
      [2.2, 16.0],
      [2.18, 16.45],
      [1.95, 16.95],
      [1.5, 17.45],
      [1.0, 17.82],
      [0.66, 18.05],
      [0.6, 18.15],
    ]
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: bulb, phase: ph })
    const ribs = (st: [number, number][], n: number, per: number, rh: number) => {
      for (let k = 0; k < n; k++) {
        for (let f = 0; f < per; f++) {
          const a0 = ph + (k / n) * Math.PI * 2
          const a1 = ph + ((k + 1) / n) * Math.PI * 2
          const t = f / per
          for (let i = 0; i < st.length - 1; i++) {
            const pt = (r: number, y: number) => {
              const P0 = V(Math.cos(a0) * r, 0, Math.sin(a0) * r)
              const P1 = V(Math.cos(a1) * r, 0, Math.sin(a1) * r)
              const p = P0.lerp(P1, t)
              const out = p.clone().setY(0).normalize().multiplyScalar(rh * 0.5)
              return V(TCX + p.x + out.x, y, p.z + out.z)
            }
            h.beam(ROOF, pt(st[i][0], st[i][1]), pt(st[i + 1][0], st[i + 1][1]), f === 0 ? rh * 1.5 : rh, rh)
          }
        }
      }
    }
    ribs(bulb, 8, 3, 0.05)
    // neck and louvred lantern
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: [[0.6, 18.1], [0.55, 18.6]], phase: ph })
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: [[0.98, 18.6], [0.98, 18.76]], phase: ph, flat: true })
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: [[0.8, 18.76], [0.8, 19.76]], phase: ph, flat: true })
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + ph + Math.PI / 8
      const ap = 0.8 * Math.cos(Math.PI / 8)
      h.add('black', metricBox(0.34, 0.62, 0.02), mat(TCX + Math.cos(a) * (ap + 0.01), 19.27, Math.sin(a) * (ap + 0.01), Math.PI / 2 - a))
    }
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: [[1.06, 19.74], [1.06, 19.9], [0.72, 20.08]], phase: ph, flat: true })
    // small onion, ball, cross
    const top: [number, number][] = [
      [0.7, 20.05],
      [0.88, 20.28],
      [0.9, 20.5],
      [0.72, 20.74],
      [0.42, 20.93],
      [0.16, 21.08],
      [0.08, 21.2],
    ]
    helm(h, ROOF, { x: TCX, z: 0, n: 8, stations: top, phase: ph })
    ribs(top, 8, 1, 0.04)
    h.rod(ROOF, V(TCX, 21.15, 0), V(TCX, 21.55, 0), 0.06, 8)
    h.add(ROOF, new THREE.SphereGeometry(0.24, 14, 10), mat(TCX, 21.72, 0))
    cross(h, 'iron', TCX, 21.85, 0, 1.05, false, Math.PI / 2)
    b.merge(h, mat(0, HDY, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-2, 8.5, 2.6],
  materials: () => ({
    saduOchre: new THREE.MeshStandardMaterial({ color: '#dda35e', roughness: 0.9 }),
    saduTower: new THREE.MeshStandardMaterial({ color: '#e0ac6c', roughness: 0.9 }),
    saduWhite: new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.85 }),
    saduSocle: new THREE.MeshStandardMaterial({ color: '#b3a6b3', roughness: 0.9 }),
    saduRed: new THREE.MeshStandardMaterial({ color: '#a8483a', roughness: 0.85 }),
    saduFrame: new THREE.MeshStandardMaterial({ color: '#4a2f22', roughness: 0.65 }),
    saduIconA: new THREE.MeshStandardMaterial({ color: '#3f6688', roughness: 0.7 }),
    saduIconB: new THREE.MeshStandardMaterial({ color: '#c09444', roughness: 0.7 }),
    saduIconC: new THREE.MeshStandardMaterial({ color: '#8c3f33', roughness: 0.7 }),
  }),
  notes:
    'Old stone hall church with a full-width apse and a west bell tower with brick-relief ornament; roofs and the onion helm shown in natural titanium-zinc standing seam (COLOR METAL supply per its records; 2010 photos show tiles). Heights estimated.',
}
export default model
