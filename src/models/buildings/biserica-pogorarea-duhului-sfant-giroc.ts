/**
 * New Orthodox church „Pogorârea Sfântului Duh", Giroc (Timiș) — begun 2016,
 * OSM way 930266394 (41.5 × 24.8 m, long axis 70.1°).
 *
 * Modelling specification derived from the 10 reference photographs (drone +
 * ground) and the OSM outline (real metres, +X = liturgical east = 70.1°):
 *  - Cross-in-square body 33 × 16.8 m (eave ≈ 11.9 m) under a 23° copper
 *    roof: hipped at the west end (behind the porch), gabled at the east end.
 *  - Transept: one barrel vault (axis across the church, springing at the
 *    eave) running over the crossing and projecting ≈ 4 m on both sides; each
 *    end is a deep canopy carried by a thick projecting archivolt on two tall
 *    round columns, sheltering a semicircular side apse with tall narrow
 *    arched windows. The east (altar) arm repeats the same motif, a little
 *    lower; the west porch repeats it between the two towers, with a mosaic
 *    tympanum (Pentecost), inscription lintel and a curved gallery balcony.
 *  - Crossing: copper skirt with radial seams around the drum foot; white
 *    drum with 10 round-headed windows framed by engaged columns and blind
 *    arches; broad flared eave; tall bell-shaped dome in dark grey flat-lock
 *    shingles with 20 roll ribs; stainless Orthodox cross.
 *  - Two west towers (7.2 × 6.6 m) on a raised entrance platform with steps:
 *    plain rendered shaft with string course and icon niche, copper pent
 *    roof, square belfry with one brick-framed round-arched louvred opening
 *    per face, steel railing, short white lantern, ribbed copper bell dome.
 *  - METAL (as photographed, product not confirmed in the register): all
 *    roofs, vaults, skirts, tower domes, gutters and downpipes in dark-brown
 *    aged copper standing seam (~0.5 m); the main dome in dark slate-grey
 *    shingles with roll ribs (rendered with the graphite zinc swatch).
 *  - Walls: grey unfinished render (the church was still being finished
 *    when photographed; cranes and scaffolding ignored).
 * Approximations: all heights estimated from the photos (no survey); OSM
 * outline symmetrised; north elevation mirrored from the south; window and
 * rib counts estimated; the printed icon banners are shown as gold panels.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, prism, ringBand, dome, cross, faceFrame, seams, prismOutline } from '../kit'
import type { OpeningType, SeamSpec } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)

/* ---------------- main dimensions (m) ---------------- */
const NHW = 8.4 // nave half width (|z|)
const XW = -17.2 // west (narthex) wall
const XE = 15.8 // east gable wall
const EAVE = 11.9
const TP = Math.tan((23 * Math.PI) / 180) // main roof pitch 23°
const RIDGE = EAVE + NHW * TP
const XC = 6.7 // crossing / dome centre
const TR = { r: 4.55, zEnd: 12.4, colR: 0.38 } // transept vault
const EA = { x1: 20.75, r: 4.5, y: 10.5 } // east (altar) arm
const TW = { x0: -17.8, x1: -10.6, z0: 5.0, z1: 11.6, top: 13.5, bel: 5.2, belTop: 19.0 } // towers
const PO = { x: -20.6, y: 9.6, r: 4.7, legs: 0.4 } // west porch (stilted arch)
const PLAT = 1.1 // entrance platform height
const DRUM = { r: 4.55, foot: 15.8, y0: 17.0, y1: 20.95, n: 10, eave: 5.8 }

const SEAM: SeamSpec = seams('giroCopper', 0.5, 0.05, 0.045)
const WALL = 'giroRender'
const TRIM = 'giroTrim'

/** Opening (glass + thin frame + optional surround) on a wall frame m (local x along wall, z outward). */
function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; frame?: string; surround?: string; sw?: number } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(o.frame ?? 'wood', extrude(frameShape(type, w - 0.02, h - 0.02, 0.07, 0, y0), 0.07), m)
  if (o.surround) b.add(o.surround, extrude(frameShape(type, w + 0.1, h + 0.05, o.sw ?? 0.18, 0, y0 - 0.05), 0.1), m)
}

/** Barrel vault roof (semicircular), axis along X or Z, standing seams following the curve. */
function vault(b: Builder, key: string, o: { axis: 'x' | 'z'; a0: number; a1: number; c: number; y: number; r: number; segs?: number }) {
  const segs = o.segs ?? 16
  const drip = 0.05
  const P = (t: number, a: number) => {
    const u = o.r * Math.cos(t)
    const v = o.y + o.r * Math.sin(t)
    return o.axis === 'x' ? V(a, v, o.c + u) : V(o.c + u, v, a)
  }
  const t0 = -drip
  const t1 = Math.PI + drip
  for (let i = 0; i < segs; i++) {
    const ta = t0 + ((t1 - t0) * i) / segs
    const tb = t0 + ((t1 - t0) * (i + 1)) / segs
    const tm = (ta + tb) / 2
    const hint = o.axis === 'x' ? V(0, Math.sin(tm), Math.cos(tm)) : V(Math.cos(tm), Math.sin(tm), 0)
    facet(b, key, [P(ta, o.a0), P(ta, o.a1), P(tb, o.a1), P(tb, o.a0)], { seams: { ...SEAM, margin: 0.05 }, hint, thickness: 0.1 })
  }
}

/** Half annulus (archivolt) in local XY, centre at the springing midpoint; optional straight legs below (stilted arch). */
function halfRing(R: number, r: number, legs = 0) {
  const s = new THREE.Shape()
  s.moveTo(R, -legs)
  s.lineTo(R, 0)
  s.absarc(0, 0, R, 0, Math.PI, false)
  s.lineTo(-R, -legs)
  s.lineTo(-r, -legs)
  s.lineTo(-r, 0)
  s.absarc(0, 0, r, Math.PI, 0, true)
  s.lineTo(r, -legs)
  s.lineTo(R, -legs)
  return s
}

function halfDisc(r: number, legs = 0) {
  const s = new THREE.Shape()
  s.moveTo(r, -legs)
  s.lineTo(r, 0)
  s.absarc(0, 0, r, 0, Math.PI, false)
  s.lineTo(-r, -legs)
  s.lineTo(r, -legs)
  return s
}

/** Tall round column with square base and capital. */
function column(b: Builder, x: number, z: number, y0: number, y1: number, r: number) {
  const h = y1 - y0 - 0.55
  b.add(TRIM, new THREE.CylinderGeometry(r * 0.93, r, h, 18), mat(x, y0 + 0.3 + h / 2, z))
  b.block(TRIM, r * 2.5, 0.3, r * 2.5, x, y0, z)
  b.block(TRIM, r * 2.7, 0.25, r * 2.7, x, y1 - 0.25, z)
}

/** Semicircular apse wall (half cylinder) with tall narrow windows. th0/thLen: cylinder angles (x = r sinθ, z = r cosθ). */
function apse(b: Builder, cx: number, cz: number, r: number, h: number, th0: number, wins: number[], corniceY: number) {
  b.add(WALL, new THREE.CylinderGeometry(r, r, h, 28, 1, true, th0, Math.PI), mat(cx, h / 2, cz))
  b.add('concrete', new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.8, 28, 1, true, th0, Math.PI), mat(cx, 0.4, cz))
  b.add(TRIM, new THREE.CylinderGeometry(r + 0.18, r + 0.18, 0.35, 28, 1, true, th0, Math.PI), mat(cx, corniceY, cz))
  for (const th of wins) {
    const m = mat(cx + r * Math.sin(th), 0, cz + r * Math.cos(th), th)
    win(b, m, 'round', 0.9, 4.6, 4.0, { surround: TRIM, sw: 0.14 })
  }
}

/** Thick projecting archivolt + its two columns. m: local origin at the springing midpoint, local z = extrusion (outwards). */
function archEnd(b: Builder, m: THREE.Matrix4, rIn: number, rOut: number, depth: number, colPos: [number, number][], ySpring: number, colR: number, y0 = 0, legs = 0) {
  b.add(TRIM, extrude(halfRing(rOut, rIn, legs), depth, 28), m)
  for (const [x, z] of colPos) column(b, x, z, y0, ySpring - legs, colR)
}

function tower(b: Builder, sz: 1 | -1) {
  const cx = (TW.x0 + TW.x1) / 2
  const cz = (sz * (TW.z0 + TW.z1)) / 2
  const w = TW.x1 - TW.x0
  const d = TW.z1 - TW.z0
  /* shaft */
  b.block(WALL, w, TW.top, d, cx, 0, cz)
  b.block('concrete', w + 0.24, 0.8, d + 0.24, cx, 0, cz)
  b.block(TRIM, w + 0.3, 0.35, d + 0.3, cx, 11.0, cz)
  b.block(TRIM, w + 0.22, 0.22, d + 0.22, cx, TW.top - 0.75, cz)
  b.block(TRIM, w + 0.5, 0.32, d + 0.5, cx, TW.top - 0.4, cz)
  // west face: icon niche (printed icon banner shown as a gold panel)
  {
    const m = faceFrame('-x', TW.x0, cz)
    win(b, m, 'round', 1.45, 6.2, 3.0, { fill: 'giroMosaic', frame: TRIM, surround: TRIM, sw: 0.14 })
  }
  // outer side: tall narrow window + small upper window; icon niche as on the front
  {
    const face = sz > 0 ? '+z' : '-z'
    const m = faceFrame(face, sz * TW.z1, sz > 0 ? cx : -cx)
    win(b, M(m, mat(1.6, 0, 0)), 'round', 0.62, 4.6, 4.2, { surround: TRIM, sw: 0.12 })
    win(b, M(m, mat(1.6, 0, 0)), 'round', 0.62, 1.3, 9.6, { surround: TRIM, sw: 0.12 })
    win(b, M(m, mat(-1.4, 0, 0)), 'round', 1.3, 5.6, 3.2, { fill: 'giroMosaic', frame: TRIM, surround: TRIM, sw: 0.12 })
  }
  // east face (part beyond the nave wall)
  {
    const m = faceFrame('+x', TW.x1, -sz * 10.0)
    win(b, m, 'round', 0.6, 3.6, 4.6, { surround: TRIM, sw: 0.12 })
  }
  /* copper pent roof around the belfry foot */
  const hx = w / 2 + 0.4
  const hz = d / 2 + 0.4
  const bi = TW.bel / 2
  const ye = TW.top - 0.12
  const yt = TW.top + 0.72
  const E = (sx: number, sz2: number) => V(cx + sx * hx, ye, cz + sz2 * hz)
  const I = (sx: number, sz2: number) => V(cx + sx * bi, yt, cz + sz2 * bi)
  const pent: THREE.Vector3[][] = [
    [E(-1, 1), E(1, 1), I(1, 1), I(-1, 1)],
    [E(1, -1), E(-1, -1), I(-1, -1), I(1, -1)],
    [E(1, 1), E(1, -1), I(1, -1), I(1, 1)],
    [E(-1, -1), E(-1, 1), I(-1, 1), I(-1, -1)],
  ]
  for (const f of pent) facet(b, 'giroCopper', f, { seams: SEAM, thickness: 0.08 })
  const ring: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  ring.forEach(([sx, s2], i) => {
    const [nx, nz] = ring[(i + 1) % 4]
    b.beam('giroCopper', E(sx, s2).add(V(0, 0.04, 0)), I(sx, s2).add(V(0, 0.04, 0)), 0.14, 0.1)
    b.beam('giroCopper', E(sx, s2).add(V(0, -0.06, 0)), E(nx, nz).add(V(0, -0.06, 0)), 0.14, 0.14)
  })
  /* belfry */
  const bt = TW.belTop
  b.block(WALL, TW.bel, bt - (TW.top - 0.2), TW.bel, cx, TW.top - 0.2, cz)
  b.block(TRIM, TW.bel + 0.25, 0.22, TW.bel + 0.25, cx, bt - 0.5, cz)
  b.block(TRIM, TW.bel + 0.45, 0.3, TW.bel + 0.45, cx, bt - 0.3, cz)
  for (const face of ['+x', '-x', '+z', '-z'] as const) {
    const plane = face.endsWith('x') ? cx + (face[0] === '+' ? bi : -bi) : cz + (face[0] === '+' ? bi : -bi)
    const u = face === '+z' ? cx : face === '-z' ? -cx : face === '+x' ? -cz : cz
    const m = faceFrame(face, plane, u)
    win(b, m, 'round', 2.2, 3.05, 14.8, { fill: 'wood', frame: 'black' })
    b.add('brickRed', extrude(frameShape('round', 2.2, 3.05, 0.34, 0, 14.8), 0.12), m)
    b.add(TRIM, metricBox(2.9, 0.16, 0.3), M(m, mat(0, 14.62, 0.12)))
  }
  // steel railing on the belfry top
  const rh = bi - 0.05
  const ry0 = bt
  const corners = [V(cx - rh, ry0, cz - rh), V(cx + rh, ry0, cz - rh), V(cx + rh, ry0, cz + rh), V(cx - rh, ry0, cz + rh)]
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const c = corners[(i + 1) % 4]
    b.beam('galv', a.clone().add(V(0, 0.95, 0)), c.clone().add(V(0, 0.95, 0)), 0.05, 0.05)
    for (let k = 0; k < 4; k++) {
      const p = a.clone().lerp(c, k / 4)
      b.rod('galv', p, p.clone().add(V(0, 0.95, 0)), 0.025, 5)
    }
  }
  /* lantern + bell dome + cross (dome eave as wide as the belfry, rise ≈ eave radius — photo 01) */
  const lh = 1.4
  prism(b, WALL, { x: cx, z: cz, n: 28, r: 1.95, y0: bt, h: lh })
  ringBand(b, TRIM, { x: cx, z: cz, n: 28, r: 1.95, y: bt, h: 0.2, grow: 0.08 })
  b.add(TRIM, new THREE.LatheGeometry([new THREE.Vector2(1.93, bt + lh - 0.2), new THREE.Vector2(2.3, bt + lh - 0.05), new THREE.Vector2(2.62, bt + lh + 0.04)], 28), mat(cx, 0, cz))
  const DR = 2.62
  const DH = 2.58
  const prof: [number, number][] = [
    [1.0, 0],
    [0.86, 0.11],
    [0.76, 0.27],
    [0.71, 0.49],
    [0.63, 0.7],
    [0.43, 0.88],
    [0.18, 0.97],
    [0.0, 1.0],
  ]
  const dy = bt + lh + 0.04
  dome(b, 'giroCopper', { x: cx, y: dy, z: cz, r: DR, h: DH, profile: prof, seg: 32, ribs: 12, ribH: 0.07 })
  b.add('giroCopper', new THREE.TorusGeometry(DR - 0.02, 0.05, 5, 32), mat(cx, dy + 0.02, cz, 0, Math.PI / 2))
  b.add('galv', new THREE.CylinderGeometry(0.12, 0.2, 0.35, 10), mat(cx, dy + DH + 0.1, cz))
  cross(b, 'galv', cx, dy + DH + 0.15, cz, 1.9, true, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- entrance platform & steps (west) ---------------- */
  b.block(TRIM, XW + 21.1, PLAT, 23.6, (XW - 21.1) / 2, 0, 0)
  for (let k = 1; k <= 5; k++) b.block(TRIM, 0.4 * k, (PLAT * (6 - k)) / 6, 18, -21.1 - 0.2 * k, 0, 0)

  /* ---------------- main body ---------------- */
  const L = XE - XW
  const xm = (XE + XW) / 2
  b.block(WALL, L, EAVE, NHW * 2, xm, 0, 0)
  b.block('concrete', L + 0.24, 0.8, NHW * 2 + 0.24, xm, 0, 0)
  b.block(TRIM, L + 0.3, 0.38, NHW * 2 + 0.3, xm, EAVE - 0.45, 0)

  /* ---------------- towers ---------------- */
  tower(b, 1)
  tower(b, -1)

  /* ---------------- main roof: west hip, east gable, copper standing seam ---------------- */
  {
    const ov = 0.35
    const ye = EAVE - ov * TP
    const he = NHW + ov
    const xa = XW - ov
    const xr0 = xa + he
    const xb = XE + ov
    facet(b, 'giroCopper', [V(xa, ye, he), V(xb, ye, he), V(xb, RIDGE, 0), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, 'giroCopper', [V(xb, ye, -he), V(xa, ye, -he), V(xr0, RIDGE, 0), V(xb, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, 'giroCopper', [V(xa, ye, -he), V(xa, ye, he), V(xr0, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam('giroCopper', V(xr0, RIDGE + 0.05, 0), V(xb, RIDGE + 0.05, 0), 0.26, 0.14)
    for (const s of [-1, 1]) b.beam('giroCopper', V(xa, ye + 0.05, s * he), V(xr0, RIDGE + 0.05, 0), 0.2, 0.12)
    // east gable wall + rake flashing
    const tri = new THREE.Shape([new THREE.Vector2(-NHW, EAVE - 0.01), new THREE.Vector2(NHW, EAVE - 0.01), new THREE.Vector2(0, RIDGE - 0.06)])
    b.add(WALL, extrude(tri, 0.4), mat(XE - 0.4, 0, 0, Math.PI / 2))
    for (const s of [-1, 1]) b.beam('giroCopper', V(xb - 0.05, ye + 0.02, s * he), V(xb - 0.05, RIDGE + 0.06, 0), 0.12, 0.3, V(1, 0, 0))
    // gutters (interrupted by the transept arms)
    for (const s of [-1, 1]) {
      b.beam('giroCopper', V(xa, ye - 0.08, s * (he + 0.05)), V(XC - TR.r - 0.1, ye - 0.08, s * (he + 0.05)), 0.16, 0.16)
      b.beam('giroCopper', V(XC + TR.r + 0.1, ye - 0.08, s * (he + 0.05)), V(xb, ye - 0.08, s * (he + 0.05)), 0.16, 0.16)
    }
  }

  /* ---------------- transept: barrel over the crossing, canopies, side apses ---------------- */
  vault(b, 'giroCopper', { axis: 'z', a0: -12.0, a1: 12.0, c: XC, y: EAVE, r: TR.r, segs: 16 })
  for (const s of [-1, 1] as const) {
    const zf = s * TR.zEnd
    const m = mat(XC, EAVE, s > 0 ? zf - 0.8 : zf, 0)
    const cxz = TR.r - 0.13
    archEnd(b, m, TR.r - 0.5, TR.r + 0.27, 0.8, [[XC - cxz, s * (TR.zEnd - 0.4)], [XC + cxz, s * (TR.zEnd - 0.4)]], EAVE, TR.colR)
    // gutters along the canopy springings
    for (const sx of [-1, 1]) b.beam('giroCopper', V(XC + sx * (TR.r + 0.1), EAVE - 0.06, s * (NHW + 0.4)), V(XC + sx * (TR.r + 0.1), EAVE - 0.06, s * (TR.zEnd - 0.8)), 0.15, 0.15)
    // side apse under the canopy (θ range: +z half = -π/2…π/2)
    apse(b, XC, s * NHW, 3.3, 13.0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? [-0.75, 0, 0.75] : [Math.PI - 0.75, Math.PI, Math.PI + 0.75], EAVE - 1.0)
  }

  /* ---------------- east (altar) arm ---------------- */
  vault(b, 'giroCopper', { axis: 'x', a0: XE - 0.3, a1: EA.x1 - 0.35, c: 0, y: EA.y, r: EA.r, segs: 16 })
  {
    const m = mat(EA.x1 - 0.8, EA.y, 0, Math.PI / 2)
    const cz = EA.r - 0.13
    archEnd(b, m, EA.r - 0.5, EA.r + 0.25, 0.8, [[EA.x1 - 0.4, -cz], [EA.x1 - 0.4, cz]], EA.y, TR.colR)
    for (const s of [-1, 1]) b.beam('giroCopper', V(XE + 0.4, EA.y - 0.06, s * (EA.r + 0.1)), V(EA.x1 - 0.8, EA.y - 0.06, s * (EA.r + 0.1)), 0.15, 0.15)
    apse(b, XE, 0, 3.4, 12.2, 0, [Math.PI / 2 - 0.8, Math.PI / 2, Math.PI / 2 + 0.8], EA.y - 1.0)
  }

  /* ---------------- west porch between the towers ---------------- */
  {
    const fx = PO.x
    const cz = PO.r - 0.13
    // archivolt (local z → +x) and columns
    archEnd(b, mat(fx, PO.y, 0, Math.PI / 2), PO.r - 0.5, PO.r + 0.25, 0.9, [[fx + 0.45, -cz], [fx + 0.45, cz]], PO.y, 0.4, PLAT, PO.legs)
    // tympanum with the Pentecost mosaic and the inscription lintel
    b.add(WALL, extrude(halfDisc(PO.r - 0.5, PO.legs), 0.25, 24), mat(fx + 0.35, PO.y, 0, Math.PI / 2))
    b.add('giroMosaic', new THREE.ShapeGeometry(halfDisc(PO.r - 0.52, PO.legs - 0.02), 24), mat(fx + 0.33, PO.y, 0, -Math.PI / 2))
    b.block('plasterPink', 0.45, 0.72, 2 * (PO.r - 0.5), fx + 0.5, PO.y - PO.legs - 0.72, 0)
    // copper barrel over the porch; its back end rises above the nave hip (photo 04)
    const xBack = -14.6
    vault(b, 'giroCopper', { axis: 'x', a0: fx + 0.25, a1: xBack, c: 0, y: PO.y, r: PO.r, segs: 16 })
    b.add(WALL, new THREE.CircleGeometry(PO.r - 0.05, 24, 0, Math.PI), mat(xBack, PO.y, 0, Math.PI / 2))
    // narthex front: door, icon panels, three gallery windows
    const m = faceFrame('-x', XW, 0)
    win(b, m, 'rect', 2.1, 3.2, PLAT, { fill: 'wood', frame: 'black', surround: TRIM, sw: 0.22 })
    for (const u of [-2.6, 2.6]) win(b, M(m, mat(u, 0, 0)), 'rect', 1.1, 2.5, PLAT + 0.5, { fill: 'giroMosaic', frame: TRIM })
    for (const [u, w] of [[-2.3, 0.9], [0, 1.25], [2.3, 0.9]]) win(b, M(m, mat(u, 0, 0)), 'round', w, 1.6, 7.0)
    // curved gallery balcony with the folk-pattern band
    const pts: [number, number][] = []
    const N = 12
    for (let i = 0; i <= N; i++) {
      const t = -1 + (2 * i) / N
      pts.push([XW - 1.25 * (1 - t * t), 4.2 * t])
    }
    prismOutline(b, TRIM, pts, 5.6, 0.25)
    for (let i = 0; i < N; i++) {
      const [x1, z1] = pts[i]
      const [x2, z2] = pts[i + 1]
      b.beam('giroMosaic', V(x1, 6.35, z1), V(x2, 6.35, z2), 0.16, 1.0)
    }
  }

  /* ---------------- drum, copper skirt, dome ---------------- */
  {
    // copper skirt around the drum foot (radial standing seams)
    const skirt: [number, number][] = [
      [6.4, 13.3],
      [5.75, 14.6],
      [5.2, 15.35],
      [4.85, DRUM.foot + 0.25],
    ]
    b.add('giroCopper', new THREE.LatheGeometry(skirt.map(([r, y]) => new THREE.Vector2(r, y)), 64), mat(XC, 0, 0))
    const nRib = 64
    for (let k = 0; k < nRib; k++) {
      const a = (k / nRib) * Math.PI * 2
      for (let i = 0; i < skirt.length - 1; i++) {
        const [r0, y0] = skirt[i]
        const [r1, y1] = skirt[i + 1]
        b.beam('giroCopper', V(XC + Math.sin(a) * (r0 + 0.03), y0, Math.cos(a) * (r0 + 0.03)), V(XC + Math.sin(a) * (r1 + 0.03), y1, Math.cos(a) * (r1 + 0.03)), 0.045, 0.05, V(Math.sin(a), 0, Math.cos(a)))
      }
    }
    // drum: plain foot band, ledge, arcade of windows, top band (proportions from photo 01)
    prism(b, 'plasterWhite', { x: XC, n: 40, r: 4.8, y0: DRUM.foot, h: DRUM.y0 - DRUM.foot })
    prism(b, 'plasterWhite', { x: XC, n: 40, r: DRUM.r, y0: DRUM.y0, h: DRUM.y1 - DRUM.y0 })
    ringBand(b, 'plasterWhite', { x: XC, n: 40, r: DRUM.r, y: DRUM.y0, h: 0.3, grow: 0.45 })
    ringBand(b, 'plasterWhite', { x: XC, n: 40, r: DRUM.r, y: DRUM.y1 - 0.38, h: 0.38, grow: 0.25 })
    const step = (2 * Math.PI) / DRUM.n
    const rc = DRUM.r + 0.2
    const half = rc * Math.sin(step / 2)
    const rise = 0.72
    const arcR = (half * half + rise * rise) / (2 * rise)
    const alpha = Math.asin(half / arcR)
    const ySpring = 19.85
    for (let k = 0; k < DRUM.n; k++) {
      const th = k * step + Math.PI / 2
      const m = mat(XC + DRUM.r * Math.sin(th), 0, DRUM.r * Math.cos(th), th)
      win(b, m, 'round', 1.1, 2.2, 17.6, { surround: 'plasterWhite', sw: 0.12 })
      b.add('plasterWhite', metricBox(1.45, 0.12, 0.3), M(m, mat(0, 17.47, 0.12)))
      // engaged column between windows + segmental blind arch over the bay
      const tc = th + step / 2
      const cx = XC + rc * Math.sin(tc)
      const cz = rc * Math.cos(tc)
      b.add('plasterWhite', new THREE.CylinderGeometry(0.19, 0.21, ySpring - 17.45, 12), mat(cx, (17.3 + ySpring - 0.15) / 2, cz))
      b.add('plasterWhite', metricBox(0.46, 0.16, 0.46), mat(cx, ySpring - 0.08, cz, tc))
      const ra = rc * Math.cos(step / 2) + 0.04
      b.add('plasterWhite', new THREE.TorusGeometry(arcR, 0.12, 6, 14, 2 * alpha), mat(XC + ra * Math.sin(th), ySpring + rise - arcR, ra * Math.cos(th), th, 0, Math.PI / 2 - alpha))
    }
    // flared eave soffit
    const ER = DRUM.eave
    const ey = DRUM.y1 + 0.3
    b.add('plasterWhite', new THREE.LatheGeometry([new THREE.Vector2(DRUM.r + 0.2, DRUM.y1 - 0.05), new THREE.Vector2(5.1, ey - 0.16), new THREE.Vector2(5.6, ey - 0.05), new THREE.Vector2(ER + 0.02, ey)], 48), mat(XC, 0, 0))
    b.add('giroCopper', new THREE.TorusGeometry(ER, 0.07, 6, 48), mat(XC, ey, 0, 0, Math.PI / 2))
    // helmet dome (concave flared skirt, convex cap), dark grey flat-lock shingles with roll ribs — profile traced on photo 01
    const H = 0.91 * ER
    const prof: [number, number][] = [
      [1.0, 0],
      [0.906, 0.094 / 0.91],
      [0.81, 0.17 / 0.91],
      [0.736, 0.283 / 0.91],
      [0.66, 0.47 / 0.91],
      [0.566, 0.62 / 0.91],
      [0.45, 0.77 / 0.91],
      [0.3, 0.87 / 0.91],
      [0.11, 0.905 / 0.91],
      [0.0, 1.0],
    ]
    const dy = ey
    const R = ER
    dome(b, 'giroDome', { x: XC, y: dy, z: 0, r: R, h: H, profile: prof, seg: 48, ribs: 20, ribH: 0.13, ribKey: 'giroDomeRib' })
    b.add('galv', new THREE.CylinderGeometry(0.22, 0.3, 0.4, 12), mat(XC, dy + H + 0.1, 0))
    cross(b, 'galv', XC, dy + H + 0.2, 0, 2.6, true, Math.PI / 2)
  }

  /* ---------------- side elevations ---------------- */
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * NHW, s > 0 ? x : -x)
    // nave between tower and transept: two tall windows, pilaster strips
    for (const x of [-6.6, -2.0]) win(b, at(x), 'round', 1.1, 5.0, 4.0, { surround: TRIM, sw: 0.15 })
    for (const x of [-9.9, -4.3, 1.5]) b.add(TRIM, metricBox(0.7, EAVE - 1.3, 0.12), M(at(x), mat(0, 0.8 + (EAVE - 1.3) / 2, 0.06)))
    // corner block between transept and altar arm: door and narrow windows
    win(b, at(13.0), 'rect', 1.1, 2.4, 0.8, { fill: 'wood', frame: 'black', surround: TRIM, sw: 0.15 })
    win(b, at(14.7), 'rect', 0.45, 2.6, 1.3, { surround: TRIM, sw: 0.1 })
    for (const x of [12.6, 14.4]) win(b, at(x), 'round', 0.5, 3.0, 6.0, { surround: TRIM, sw: 0.1 })
    // east face of the corner blocks
    const em = faceFrame('+x', XE, -s * 6.6)
    win(b, em, 'round', 0.5, 3.4, 5.2, { surround: TRIM, sw: 0.1 })
    // copper downpipes
    for (const x of [-10.35, 1.95, 11.45, XE - 0.2]) b.rod('giroCopper', V(x, 0.8, s * (NHW + 0.12)), V(x, EAVE - 0.2, s * (NHW + 0.12)), 0.06, 8)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [XC, 15.5, 10.5],
  materials: (base) => {
    // aged dark-brown copper as photographed: the palette's bronze sheet swatch, re-toned to bare metal
    const cu = (base.aluBronze as THREE.MeshPhysicalMaterial).clone()
    cu.color = new THREE.Color('#ad9483')
    cu.metalness = 0.66
    cu.roughness = 0.5
    cu.clearcoat = 0
    // main dome: dark slate-grey shingles (graphite swatch, a little darker)
    const slate = (base.zincGraphite as THREE.MeshStandardMaterial).clone()
    slate.color = new THREE.Color('#d4d8de')
    slate.roughness = 0.58
    return {
      giroCopper: cu,
      giroDome: slate,
      giroDomeRib: new THREE.MeshStandardMaterial({ color: '#34383d', metalness: 0.6, roughness: 0.38 }),
      giroRender: new THREE.MeshStandardMaterial({ color: '#aaa7a0', roughness: 0.92 }),
      giroTrim: new THREE.MeshStandardMaterial({ color: '#c3c0b9', roughness: 0.88 }),
      giroMosaic: new THREE.MeshStandardMaterial({ color: '#c39a4c', roughness: 0.5, metalness: 0.25 }),
    }
  },
  notes: 'Heights estimated from photographs; OSM outline symmetrised; north side mirrored; icon banners shown as gold panels.',
}
export default model
