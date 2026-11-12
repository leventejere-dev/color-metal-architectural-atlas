/**
 * Palatul Nifon Mitropolitul, Bucharest (Str. Doamnei 1 / Calea Victoriei,
 * OSM relation 14862831) — neoclassical corner palace (1890s) with a mansard
 * roof; restored mansard in pre-weathered titanium-zinc (elZinc Slate).
 *
 * Modelling specification (real metres, origin = centre of the OSM bounding
 * box, +X = OSM long axis 109.5° = along the Str. Doamnei façade (ESE),
 * +Z = 199.5°: the Doamnei façade is the +Z side, the Calea Victoriei façade
 * the (skewed) −X side, the courtyard opens to the north (−Z) towards the
 * Doamnei church; the ESE side is a party wall):
 *  - Plan = OSM outer ring (U-shaped, ≈ 50 × 34.5 m) with the two street
 *    corners rounded (R ≈ 3.2 m; OSM shows roundings at both west corners) and
 *    the semicircular courtyard bay (R ≈ 5.7 m, photo 03) as a separate volume.
 *  - Storeys (photos 01–02, people ≈ 1.7 m for scale): ground floor with arched
 *    shop windows to ≈ 6.6 m, a projecting slab (1.1 m) carrying a continuous
 *    balustraded balcony at ≈ 7.3 m, first floor with pedimented windows,
 *    second floor with corniced windows and iron balconettes, giant fluted
 *    pilasters grouping the bays 2-3-2 (Victoriei) and 2-2-2-2-2 (Doamnei),
 *    frieze and modillion cornice to ≈ 19.2 m.
 *  - Rounded corners: blind curved bays with horizontal bands flanked by
 *    fluted pilasters, the mansard follows the curve (dome-like corner cap with
 *    an ox-eye dormer, photos 01–02).
 *  - Mansard: steep lower slope (≈ 72°, rise 3.4 m) with ox-eye dormers on the
 *    street sides and arched dormers towards the courtyard (photo 03), flat
 *    upper deck; courtyard bay with a low half-cone roof; standing seams 0.5 m
 *    in elZinc Slate as photographed after the restoration (photo 03).
 * Approximations: the street photographs (01 2011, 02 2013) predate the
 * restoration; colours follow the restored courtyard façades (photo 03). Bay
 * counts on the Doamnei and north sides, the courtyard elevations, dormer
 * positions, the upper mansard deck and the party-wall side are estimated;
 * ornament (capitals, consoles, reliefs) simplified; shop signage omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, lathe, prismOutline, seams, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

/* plan: OSM outer ring with filleted street corners; apse chord closes the courtyard side */
const OUT: P2[] = [
  [10.22, -2.64], [9.82, -15.99], [19.98, -15.13], [25.3, 12.49], [21.55, 17.25], [-15.37, 17.27],
  [-16.05, 17.2], [-16.69, 16.99], [-17.28, 16.64], [-17.78, 16.18], [-18.17, 15.63], [-18.43, 15.01],
  [-25.24, -7.24], [-25.38, -7.97], [-25.34, -8.71], [-25.13, -9.43], [-24.76, -10.07], [-24.26, -10.62], [-23.64, -11.03],
  [-11.42, -17.27], [-7.45, -17.05], [-7.21, -2.68], [-4.08, -2.68], [7.39, -2.64],
]
const N = OUT.length
/* edge roles (edge i runs OUT[i] → OUT[i+1]) */
const PARTY = 2
const STREET = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
const ARC = new Set([5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17])
const APSE = { x: 1.66, z: -2.66, r: 5.74 }

/* heights */
const GF = 6.6
const SLAB = 7.3
const ARCHI = 17.0
const EAVE = 19.2
const MAN_RISE = 3.4
const MAN_IN = MAN_RISE / Math.tan((72 * Math.PI) / 180)
const DECK = EAVE + MAN_RISE

const ZS = 'zincSlate'
const SEAM = seams(ZS, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/** Façade frame of edge i: local x = right as seen from outside, y = up, z = outward. Origin at the edge midpoint. */
function edgeFrame(i: number) {
  const a = OUT[i]
  const c = OUT[(i + 1) % N]
  const dx = c[0] - a[0]
  const dz = c[1] - a[1]
  const L = Math.hypot(dx, dz)
  const n = V(dz / L, 0, -dx / L)
  const m = new THREE.Matrix4().makeBasis(V(-dx / L, 0, -dz / L), V(0, 1, 0), n)
  m.setPosition((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2)
  return { m, len: L, n }
}

/** Offset every edge of the outline by d[i] (positive = outwards) and intersect neighbours. */
function offsetPoly(poly: P2[], d: number[]): P2[] {
  const n = poly.length
  const lines = poly.map((a, i) => {
    const c = poly[(i + 1) % n]
    const dx = c[0] - a[0]
    const dz = c[1] - a[1]
    const L = Math.hypot(dx, dz)
    return { p: [a[0] + (dz / L) * d[i], a[1] - (dx / L) * d[i]] as P2, dir: [dx / L, dz / L] as P2 }
  })
  return poly.map((_, i) => {
    const l1 = lines[(i - 1 + n) % n]
    const l2 = lines[i]
    const cr = l1.dir[0] * l2.dir[1] - l1.dir[1] * l2.dir[0]
    if (Math.abs(cr) < 1e-4) return l2.p
    const t = ((l2.p[0] - l1.p[0]) * l2.dir[1] - (l2.p[1] - l1.p[1]) * l2.dir[0]) / cr
    return [l1.p[0] + l1.dir[0] * t, l1.p[1] + l1.dir[1] * t] as P2
  })
}
const grow = (street: number, court: number, party = 0) => OUT.map((_, i) => (i === PARTY ? party : STREET.has(i) ? street : court))

type Crown = 'none' | 'cornice' | 'pediment'
function win(b: Builder, m: THREE.Matrix4, u: number, y0: number, w: number, h: number, crown: Crown = 'none', o: { type?: OpeningType; f?: number; bars?: [number, number]; sill?: boolean; surround?: string; z?: number } = {}) {
  const type = o.type ?? 'rect'
  const f = o.f ?? 0.2
  const sk = o.surround ?? 'nfStucco'
  const mm = M(m, mat(u, 0, o.z ?? 0))
  b.add(sk, extrude(frameShape(type, w, h, f, 0, y0), 0.12), mm)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(mm, mat(0, 0, 0.025)))
  b.add('nfFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.07, 0, y0 + 0.03), 0.06), M(mm, mat(0, 0, 0.02)))
  const [nu, nv] = o.bars ?? [2, 3]
  for (let i = 1; i < nu; i++) b.add('nfFrame', metricBox(0.07, h - 0.1, 0.05), M(mm, mat(-w / 2 + (i * w) / nu, y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < nv; j++) b.add('nfFrame', metricBox(w - 0.1, 0.06, 0.05), M(mm, mat(0, y0 + (j * h * 0.78) / nv, 0.05)))
  if (o.sill !== false) b.add(sk, metricBox(w + 2 * f + 0.2, 0.14, 0.26), M(mm, mat(0, y0 - f - 0.05, 0.12)))
  const yt = y0 + h + f
  if (crown === 'cornice') {
    b.add(sk, metricBox(w + 2 * f, 0.38, 0.1), M(mm, mat(0, yt + 0.19, 0.05)))
    b.add(sk, metricBox(w + 2 * f + 0.45, 0.15, 0.3), M(mm, mat(0, yt + 0.45, 0.15)))
  } else if (crown === 'pediment') {
    const pw = w + 2 * f + 0.6
    b.add(sk, metricBox(w + 2 * f, 0.34, 0.1), M(mm, mat(0, yt + 0.17, 0.05)))
    for (const s of [-1, 1]) b.add(sk, metricBox(0.22, 0.7, 0.28), M(mm, mat(s * (w / 2 + f + 0.02), yt + 0.0, 0.14)))
    b.add(sk, metricBox(pw, 0.14, 0.36), M(mm, mat(0, yt + 0.41, 0.18)))
    const s = new THREE.Shape([new THREE.Vector2(-pw / 2, 0), new THREE.Vector2(pw / 2, 0), new THREE.Vector2(0, 0.72)])
    b.add(sk, extrude(s, 0.32), M(mm, mat(0, yt + 0.48, 0.02)))
  }
}

function baluster(h: number) {
  const prof: [number, number][] = [
    [0.0, 0],
    [0.09, 0],
    [0.05, 0.12],
    [0.1, 0.36],
    [0.04, 0.6],
    [0.07, 0.68],
    [0.0, 0.68],
  ]
  return lathe(prof.map(([r, y]) => [r, (y * h) / 0.68]), 6)
}

/** Fluted giant pilaster with base and simplified Corinthian capital (frame-local u, from y0 to y1). */
function giantPilaster(b: Builder, m: THREE.Matrix4, u: number, y0: number, y1: number, w = 0.78) {
  const mm = M(m, mat(u, 0, 0))
  b.add('nfStucco', metricBox(w + 0.2, 0.4, 0.34), M(mm, mat(0, y0 + 0.2, 0.17)))
  b.add('nfStucco', metricBox(w, y1 - y0 - 1.1, 0.22), M(mm, mat(0, y0 + 0.4 + (y1 - y0 - 1.1) / 2, 0.11)))
  for (const k of [-0.24, 0, 0.24]) b.add('nfWall', metricBox(0.07, y1 - y0 - 1.4, 0.05), M(mm, mat(k * w, y0 + 0.55 + (y1 - y0 - 1.4) / 2, 0.235)))
  b.add('nfStucco', metricBox(w + 0.18, 0.55, 0.36), M(mm, mat(0, y1 - 0.5, 0.18)))
  b.add('nfStucco', metricBox(w + 0.4, 0.16, 0.46), M(mm, mat(0, y1 - 0.12, 0.23)))
}

/** Ox-eye dormer pointing along n, centred at p. */
function oxEye(b: Builder, p: THREE.Vector3, n: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n.clone().normalize())
  const m = new THREE.Matrix4().compose(p, q, V(1, 1, 1))
  b.add(ZS, new THREE.CylinderGeometry(0.62, 0.62, 1.3, 18, 1, true), m)
  b.add('glassC', new THREE.CircleGeometry(0.46, 18), M(m, mat(0, 0.6, 0, 0, -Math.PI / 2)))
  b.add('nfStucco', new THREE.TorusGeometry(0.56, 0.11, 6, 18), M(m, mat(0, 0.64, 0, 0, Math.PI / 2)))
}

/** Arched dormer (courtyard side) standing on the lower mansard slope; m = facade frame, u = position. */
function archDormer(b: Builder, m: THREE.Matrix4, u: number) {
  const y0 = EAVE + 0.35
  const zf = 0.25 - (0.5 / MAN_RISE) * MAN_IN
  const mm = M(m, mat(u, 0, zf))
  b.add(ZS, metricBox(1.6, 1.65, 1.8), M(mm, mat(0, y0 + 0.825, -0.9)))
  b.add('nfStucco', extrude(frameShape('round', 1.0, 1.9, 0.26, 0, y0 + 0.15), 0.16), mm)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.0, 1.9, 0, y0 + 0.15, 10))), M(mm, mat(0, 0, 0.03)))
  b.add(ZS, new THREE.CylinderGeometry(0.86, 0.86, 1.9, 14, 1, false, Math.PI / 2, Math.PI), M(mm, mat(0, y0 + 1.65, -0.85, 0, Math.PI / 2, 0)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= main volume & horizontal members ================= */
  prismOutline(b, 'nfWall', OUT, 0, EAVE - 0.01)
  prismOutline(b, 'nfSocle', offsetPoly(OUT, grow(0.1, 0.1)), 0, 0.5)
  // ground-floor cornice / balcony slab (projects 1.1 m on the street sides)
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(0.35, 0.15)), GF - 0.35, 0.35)
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(1.1, 0.3)), GF, SLAB - GF)
  prismOutline(b, ZS, offsetPoly(OUT, grow(1.14, 0.32)), SLAB - 0.02, 0.05)
  // first-floor sill band, architrave, frieze, cornice with zinc capping
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(0.08, 0.06)), 12.25, 0.22)
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(0.18, 0.12)), ARCHI, 0.32)
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(0.45, 0.3)), 18.2, 0.18)
  prismOutline(b, 'nfStucco', offsetPoly(OUT, grow(0.95, 0.55)), 18.62, 0.5)
  prismOutline(b, ZS, offsetPoly(OUT, grow(1.0, 0.6)), EAVE - 0.06, 0.07)

  /* ================= façades ================= */
  for (let i = 0; i < N; i++) {
    if (i === PARTY) continue
    const { m, len } = edgeFrame(i)
    const street = STREET.has(i)
    // street ground floor: smooth grey cladding band
    if (street) b.add('nfBase', metricBox(len + 0.02, GF - 0.85, 0.08), M(m, mat(0, 0.5 + (GF - 0.85) / 2, 0.04)))
    // modillions under the cornice
    if (street || len > 8) for (let u = -len / 2 + 0.35; u <= len / 2 - 0.3; u += 0.85) b.add('nfStucco', metricBox(0.22, 0.32, 0.75), M(m, mat(u, 18.46, 0.38)))
    if (ARC.has(i)) {
      // blind curved corner: horizontal bands
      for (let y = SLAB + 0.6; y < ARCHI - 0.2; y += 0.55) b.add('nfStucco', metricBox(len + 0.05, 0.16, 0.1), M(m, mat(0, y, 0.05)))
    }
    if (street && !ARC.has(i)) {
      // balustrade along the slab edge
      for (let u = -len / 2 + 0.2; u <= len / 2 - 0.15; u += 0.33) b.add('nfStucco', baluster(0.8), M(m, mat(u, SLAB, 0.95)))
      b.add('nfStucco', metricBox(len + 0.1, 0.16, 0.3), M(m, mat(0, SLAB + 0.88, 0.95)))
    } else if (ARC.has(i)) {
      for (const u of [-len / 4, len / 4]) b.add('nfStucco', baluster(0.8), M(m, mat(u, SLAB, 0.95)))
      b.add('nfStucco', metricBox(len + 0.12, 0.16, 0.3), M(m, mat(0, SLAB + 0.88, 0.95)))
    }
  }

  // bays of the straight street faces
  const streetBays = (i: number, us: number[], pil: number[]) => {
    const { m } = edgeFrame(i)
    for (const u of us) {
      win(b, m, u, 0.55, 2.5, 4.8, 'none', { type: 'round', f: 0.28, bars: [2, 2], sill: false, surround: 'nfStone', z: 0.08 })
      win(b, m, u, 7.75, 1.45, 3.3, 'pediment')
      win(b, m, u, 12.95, 1.35, 2.75, 'cornice', { f: 0.18 })
      // iron balconette
      const mm = M(m, mat(u, 0, 0))
      b.add('iron', metricBox(1.65, 0.05, 0.05), M(mm, mat(0, 13.65, 0.32)))
      for (let k = -3; k <= 3; k++) b.add('iron', metricBox(0.025, 0.72, 0.025), M(mm, mat(k * 0.26, 13.28, 0.32)))
      b.add('nfStucco', metricBox(1.9, 0.14, 0.42), M(mm, mat(0, 12.85, 0.2)))
    }
    for (const u of pil) giantPilaster(b, m, u, SLAB, ARCHI)
  }
  // Calea Victoriei (edge 11, ≈ 24.2 m): 7 bays grouped 2-3-2
  streetBays(11, [-9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6], [-11.2, -4.8, 4.8, 11.2])
  // Str. Doamnei (edge 4, ≈ 37.4 m): 10 bays in pairs
  streetBays(4, [-15.1, -11.75, -8.4, -5.05, -1.7, 1.7, 5.05, 8.4, 11.75, 15.1], [-17.9, -10.1, -3.4, 3.4, 10.1, 17.9])
  // north face of the west wing (edge 18, ≈ 14.2 m) and its short continuation (edge 19)
  streetBays(18, [-4.8, -1.6, 1.6, 4.8], [6.4])
  streetBays(19, [0.2], [])
  // SE chamfer (edge 3, ≈ 6 m)
  streetBays(3, [0], [-2.55, 2.55])

  // courtyard faces (photo 03): banded ground floor, plain windows, pilaster strips
  const courtBays = (i: number, us: number[], ped: boolean[] = []) => {
    const { m, len } = edgeFrame(i)
    for (let y = 0.6; y < GF - 0.4; y += 0.5) b.add('nfStucco', metricBox(len, 0.08, 0.05), M(m, mat(0, y, 0.025)))
    us.forEach((u, k) => {
      win(b, m, u, 1.2, 1.5, 3.4, 'none', { f: 0.18, bars: [2, 2] })
      win(b, m, u, 8.0, 1.4, 3.2, ped[k] ? 'pediment' : 'cornice', { f: 0.18 })
      win(b, m, u, 13.1, 1.35, 2.7, 'none', { f: 0.18 })
    })
    for (const u of [-len / 2 + 0.45, len / 2 - 0.45]) b.add('nfStucco', metricBox(0.75, ARCHI - SLAB, 0.14), M(m, mat(u, (SLAB + ARCHI) / 2, 0.07)))
  }
  courtBays(0, [-4.8, -1.6, 1.6, 4.8])
  courtBays(1, [-2.2, 2.2], [true, false])
  courtBays(20, [-5.1, -1.7, 1.7, 5.1], [false, true, true, false])
  courtBays(21, [0])
  courtBays(23, [0])

  /* ================= courtyard bay (semicircular, photo 03) ================= */
  {
    const { x, z, r } = APSE
    const seg = 28
    const half = (rr: number, y0: number, h: number, key: string) =>
      b.add(key, new THREE.CylinderGeometry(rr, rr, h, seg, 1, false, Math.PI / 2, Math.PI), mat(x, y0 + h / 2, z))
    half(r, 0, EAVE - 0.01, 'nfWall')
    half(r + 0.1, 0, 0.5, 'nfSocle')
    half(r + 0.25, GF - 0.3, 0.3, 'nfStucco')
    half(r + 0.12, 12.25, 0.22, 'nfStucco')
    half(r + 0.18, ARCHI, 0.32, 'nfStucco')
    half(r + 0.45, 18.2, 0.18, 'nfStucco')
    half(r + 0.9, 18.62, 0.5, 'nfStucco')
    // balcony at the second floor
    half(r + 1.0, 12.0, 0.3, 'nfStucco')
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI + (k / 16) * Math.PI
      b.add('nfStucco', baluster(0.85), mat(x + Math.cos(a) * (r + 0.85), 12.3, z + Math.sin(a) * (r + 0.85)))
    }
    // windows around the curve: big arched opening in the axis, narrow windows either side
    const at = (ang: number) => {
      const p = V(x + Math.cos(ang) * r, 0, z + Math.sin(ang) * r)
      const m = new THREE.Matrix4().makeBasis(V(-Math.sin(ang), 0, Math.cos(ang)).negate(), V(0, 1, 0), V(Math.cos(ang), 0, Math.sin(ang)))
      m.setPosition(p)
      return m
    }
    for (const ang of [1.2 * Math.PI, 1.5 * Math.PI, 1.8 * Math.PI]) {
      const m = at(ang)
      win(b, m, 0, 7.9, 1.2, 3.4, 'none', { f: 0.16 })
      win(b, m, 0, 1.2, 1.3, 3.2, ang === 1.5 * Math.PI ? 'pediment' : 'none', { f: 0.16 })
    }
    win(b, at(1.5 * Math.PI), 0, 12.6, 2.6, 4.5, 'none', { type: 'round', f: 0.3, bars: [2, 3] })
    for (const ang of [1.25 * Math.PI, 1.75 * Math.PI]) win(b, at(ang), 0, 12.9, 1.1, 2.9, 'none', { f: 0.16 })
    // low half-cone roof with radial standing seams
    const rr = r + 0.5
    const rise = 2.2
    b.add(ZS, new THREE.LatheGeometry([new THREE.Vector2(rr, 0), new THREE.Vector2(0.4, rise)], seg, Math.PI / 2, Math.PI), mat(x, EAVE, z))
    const nRib = 30
    for (let k = 1; k < nRib; k++) {
      const a = Math.PI + (k / nRib) * Math.PI
      const c = Math.cos(a)
      const s = Math.sin(a)
      b.beam(ZS, V(x + c * rr, EAVE + 0.04, z + s * rr), V(x + c * 0.5, EAVE + rise - 0.05, z + s * 0.5), 0.045, 0.05)
    }
  }

  /* ================= mansard roof (elZinc Slate) ================= */
  {
    const outer = offsetPoly(OUT, grow(0.25, 0.2))
    const inner = offsetPoly(OUT, OUT.map((_, i) => (i === PARTY ? 0 : 0.2 - MAN_IN)))
    for (let i = 0; i < N; i++) {
      if (i === PARTY) continue
      const j = (i + 1) % N
      const pts = [V(outer[i][0], EAVE, outer[i][1]), V(outer[j][0], EAVE, outer[j][1]), V(inner[j][0], DECK, inner[j][1]), V(inner[i][0], DECK, inner[i][1])]
      facet(b, ZS, pts, { seams: ARC.has(i) ? undefined : SEAM, thickness: 0.1 })
      // hip / curb rolls
      b.beam(ZS, pts[0], pts[3], 0.12, 0.08)
    }
    // curb moulding and flat upper deck
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      b.beam(ZS, V(inner[i][0], DECK + 0.06, inner[i][1]), V(inner[j][0], DECK + 0.06, inner[j][1]), 0.26, 0.2)
    }
    // low upper slope (≈ 13°) above the curb, then a flat top with standing seams along X
    const UP_IN = 2.0
    const UP_RISE = 0.5
    const top = offsetPoly(OUT, OUT.map((_, i) => (i === PARTY ? 0 : 0.2 - MAN_IN - UP_IN)))
    for (let i = 0; i < N; i++) {
      if (i === PARTY) continue
      const j = (i + 1) % N
      const pts = [V(inner[i][0], DECK, inner[i][1]), V(inner[j][0], DECK, inner[j][1]), V(top[j][0], DECK + UP_RISE, top[j][1]), V(top[i][0], DECK + UP_RISE, top[i][1])]
      facet(b, ZS, pts, { seams: ARC.has(i) ? undefined : SEAM })
    }
    const yTop = DECK + UP_RISE
    const deck = new THREE.Shape(top.map(([px, pz]) => new THREE.Vector2(px, -pz)))
    b.add(ZS, new THREE.ShapeGeometry(deck), mat(0, yTop, 0, 0, -Math.PI / 2))
    // seams: scanlines z = const clipped to the (concave) top polygon
    let zmin = Infinity
    let zmax = -Infinity
    for (const [, pz] of top) {
      zmin = Math.min(zmin, pz)
      zmax = Math.max(zmax, pz)
    }
    for (let zz = zmin + 0.25; zz < zmax; zz += 0.5) {
      const xs: number[] = []
      for (let i = 0; i < N; i++) {
        const [ax, az] = top[i]
        const [cx, cz] = top[(i + 1) % N]
        if ((zz - az) * (zz - cz) < 0) xs.push(ax + ((zz - az) / (cz - az)) * (cx - ax))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > 0.4) b.add(ZS, metricBox(xs[k + 1] - xs[k], 0.045, 0.045), mat((xs[k] + xs[k + 1]) / 2, yTop + 0.022, zz))
    }
    // party-wall parapet (firewall) along the ESE side
    {
      const a = OUT[PARTY]
      const c = OUT[PARTY + 1]
      const L = Math.hypot(c[0] - a[0], c[1] - a[1])
      const ang = Math.atan2(-(c[1] - a[1]), c[0] - a[0])
      b.add('nfWall', metricBox(L, DECK + 0.6 - EAVE, 0.5), mat((a[0] + c[0]) / 2, (EAVE + DECK + 0.6) / 2, (a[1] + c[1]) / 2, ang))
      b.add(ZS, metricBox(L, 0.06, 0.6), mat((a[0] + c[0]) / 2, DECK + 0.63, (a[1] + c[1]) / 2, ang))
    }
    // dormers: ox-eyes on the street slopes (one on each rounded corner), arched dormers to the courtyard
    const onSlope = (i: number, u: number) => {
      const { m, n } = edgeFrame(i)
      const p = V(u, EAVE + 1.45, 0.25 - (1.45 / MAN_RISE) * MAN_IN + 0.2).applyMatrix4(m)
      return { p, n: n.clone().add(V(0, 0.18, 0)) }
    }
    const ox: [number, number][] = [
      [11, -6.4],
      [11, 0],
      [11, 6.4],
      [4, -13.4],
      [4, -6.7],
      [4, 0],
      [4, 6.7],
      [4, 13.4],
      [18, -3.2],
      [18, 3.2],
      [8, 0],
      [15, 0],
    ]
    for (const [i, u] of ox) {
      const { p, n } = onSlope(i, u)
      oxEye(b, p, n)
    }
    archDormer(b, edgeFrame(0).m, -3.2)
    archDormer(b, edgeFrame(0).m, 3.2)
    archDormer(b, edgeFrame(1).m, 0)
    archDormer(b, edgeFrame(20).m, -3.4)
    archDormer(b, edgeFrame(20).m, 3.4)
    // chimneys
    for (const [cx, cz] of [
      [-16.5, 8.5],
      [14.5, 6.0],
      [-17.0, -9.0],
    ]) {
      b.block('nfWall', 0.9, 2.2, 1.4, cx, DECK + 0.4, cz)
      b.block('nfStucco', 1.15, 0.2, 1.65, cx, DECK + 2.6, cz)
      b.block(ZS, 1.0, 0.1, 1.5, cx, DECK + 2.8, cz)
    }
  }

  /* ================= downpipes (courtyard) ================= */
  for (const [px, pz] of [
    [-7.0, -9.5],
    [9.6, -9.0],
    [-4.3, -2.45],
  ]) b.rod('zincNatural', V(px, 0.4, pz), V(px, EAVE - 0.2, pz), 0.065, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [-0.956, 0.293],
  materialFocus: [-16, 21, 15.5],
  materials: () => ({
    nfWall: new THREE.MeshStandardMaterial({ color: '#e7dcc2', roughness: 0.88 }),
    nfStucco: new THREE.MeshStandardMaterial({ color: '#f0e9d6', roughness: 0.82 }),
    nfStone: new THREE.MeshStandardMaterial({ color: '#d8d1c0', roughness: 0.85 }),
    nfBase: new THREE.MeshStandardMaterial({ color: '#9a968c', roughness: 0.88 }),
    nfSocle: new THREE.MeshStandardMaterial({ color: '#8a867d', roughness: 0.9 }),
    nfFrame: new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.6 }),
  }),
  notes:
    'Neoclassical corner palace with rounded street corners, a continuous balustraded balcony, giant fluted pilasters and a mansard roof with ox-eye dormers in pre-weathered titanium-zinc (elZinc Slate); courtyard bay with a low half-cone roof; ornament simplified.',
}
export default model
