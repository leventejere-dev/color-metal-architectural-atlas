/**
 * Catedrala Ortodoxă „Sfânta Cuvioasa Parascheva”, Focșani (Str. Republicii, OSM way
 * 1143659827) — large new triconch cathedral with two west towers and a wide central
 * tower; domes and roofs shown in copper (copper supplied by COLOR METAL according to
 * its records; the available photographs predate that delivery).
 *
 * Modelling specification (real metres; origin = outline centre at ground):
 *  - Axis: the straight narthex walls of the OSM outline run at ≈ 90.3° (the minimum-
 *    rectangle axis 101.8° of the research record is skewed by the lobes). +X points
 *    east to the altar apse, the west front with the porch at −X, +Z = south.
 *  - Plan after the outline (53.9 × 38.5 m): west porch 13.5 m wide; narthex block
 *    22 × 24.3 m with the two west towers on its corners; naos with two semicircular
 *    lateral apses (r ≈ 8.4 m) and a wide semicircular altar apse (r ≈ 9.6 m).
 *  - Photos 02–05 (contractor's gallery, 2016, finished white plaster façades, new
 *    copper domes) and 01 (earlier construction stage): narthex cornice ≈ 16 m, apses
 *    ≈ 18 m; west front with tall slit windows in the tower bays, a triple window and
 *    a round-arched gable with a mosaic in the centre, a gabled porch with a tall arched
 *    entrance; ornamental pilaster strips; blind arcades with roundels on the apses.
 *  - West towers: square upper stage with three small arched niches per face, round
 *    drums (Ø ≈ 6.4 m) with arched windows between pilasters, cornice, ribbed copper
 *    domes, knob and cross (≈ 30.5 m).
 *  - Central tower: square base over the crossing, wide 12-sided drum (Ø ≈ 11.5 m) with
 *    recessed arched windows, cornice, ribbed copper dome, lantern and cross (≈ 39 m).
 *  - Roofs: low copper hipped roof on the narthex, copper roofs over the apses rising to
 *    the tower base, gabled porch roof.
 * Heights scaled from photos 02 and 04 with the outline width as reference (cars as a
 * cross-check) — approximate. The north side mirrors the south; ornament simplified.
 * Which surfaces received the copper is not itemised: domes and roofs are shown in
 * copper.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, polyRing, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'fcWall'
const DECO = 'fcDeco'
const SEAM = seams(CU, 0.6, 0.06, 0.05)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const at = (x: number, z: number, a: number) => mat(x, 0, z, Math.atan2(Math.cos(a), Math.sin(a)))

/* plan */
const XP0 = -26.9 // porch front
const XN0 = -21.5 // narthex west wall
const XN1 = 0.5 // narthex east wall / naos start
const NHW = 12.15 // narthex half width
const PHW = 6.75 // porch half width
const XC = 8.9 // crossing / lateral apse centre
const LZ = 10.8 // lateral apse centre |z|
const LR = 8.4
const XA = 17.3 // altar apse centre
const AR = 9.6
const TW = { x0: XN0, x1: XN0 + 7.6, hz: 3.8 } // west tower bays (|z| = NHW - hz .. NHW)

/* heights */
const HN = 16.0 // narthex cornice
const HA = 18.0 // apses cornice
const SOCLE = 0.8

/** Naos outline: lateral apses, crossing and altar apse (CCW), grown by g. */
function naos(y: number, g = 0): THREE.Vector3[] {
  const p: THREE.Vector3[] = []
  const n = 16
  // altar apse from north to south through east
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    p.push(V(XA + Math.cos(a) * (AR + g), y, Math.sin(a) * (AR + g)))
  }
  // south lateral apse (east → west)
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI
    p.push(V(XC + Math.cos(a) * (LR + g), y, LZ + Math.sin(a) * (LR + g)))
  }
  p.push(V(XN1 - 1.0, y, LZ), V(XN1 - 1.0, y, -LZ))
  // north lateral apse (west → east)
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI
    p.push(V(XC + Math.cos(a) * (LR + g), y, -LZ + Math.sin(a) * (LR + g)))
  }
  return p
}

function arched(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, fill = 'glassC', f = 0.25) {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.02)))
  b.add(DECO, extrude(frameShape('round', w, h, f, 0, y0), 0.12), m)
}

/** Ribbed copper dome (lathe) with knob and cross. */
function copperDome(b: Builder, cx: number, y: number, r: number, h: number, ribs: number, crossS: number, lantern = false) {
  const prof: [number, number][] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    prof.push([Math.max(0.04, r * Math.cos((t * Math.PI) / 2) ** 0.85), h * Math.sin((t * Math.PI) / 2)])
  }
  b.add(CU, lathe(prof, 40), mat(cx, y, 0))
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * Math.PI * 2
    for (let i = 0; i < prof.length - 2; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(CU, V(cx + Math.cos(a) * (r0 + 0.03), y + y0, Math.sin(a) * (r0 + 0.03)), V(cx + Math.cos(a) * (r1 + 0.03), y + y1, Math.sin(a) * (r1 + 0.03)), 0.06, 0.06, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  let top = y + h
  if (lantern) {
    b.add(WALL, new THREE.CylinderGeometry(0.9, 0.9, 1.6, 16), mat(cx, top + 0.6, 0))
    b.add(CU, lathe([[1.1, 0], [1.05, 0.25], [0.6, 0.75], [0.08, 1.0]], 20), mat(cx, top + 1.4, 0))
    top += 2.4
  }
  b.add(CU, new THREE.SphereGeometry(0.3, 12, 8), mat(cx, top + 0.15, 0))
  cross(b, 'gilt', cx, top + 0.3, 0, crossS, true, Math.PI / 2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= narthex block ================= */
  const cxN = (XN0 + XN1) / 2
  b.block(WALL, XN1 - XN0, HN, 2 * NHW, cxN, 0, 0)
  b.block('fcSocle', XN1 - XN0 + 0.2, SOCLE, 2 * NHW + 0.2, cxN, 0, 0)
  b.block(DECO, XN1 - XN0 + 0.7, 0.45, 2 * NHW + 0.7, cxN, HN - 0.45, 0)
  b.block(DECO, XN1 - XN0 + 0.3, 0.3, 2 * NHW + 0.3, cxN, HN - 1.2, 0)
  b.block(DECO, XN1 - XN0 + 0.2, 0.3, 2 * NHW + 0.2, cxN, 7.6, 0)

  /* ================= naos ================= */
  b.add(WALL, loft([naos(0), naos(HA)], { capTop: true }))
  b.add('fcSocle', loft([naos(0, 0.1), naos(SOCLE, 0.1)], { capTop: true }))
  b.add(DECO, loft([naos(HA - 0.5, 0.05), naos(HA - 0.2, 0.3), naos(HA, 0.45)], { capTop: true, capBottom: true }))
  b.add(DECO, loft([naos(7.6, 0.05), naos(7.9, 0.05)], { capTop: true, capBottom: true }))
  // apse decoration: blind arcade with roundels above, windows below (photo 03)
  const apseDeco = (cx: number, cz: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5) / n) * (a1 - a0)
      const m = at(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a)
      arched(b, m, 1.5, 4.6, 11.4, i % 2 === 0 ? 'glassC' : 'fcShadow', 0.28)
      b.add(DECO, new THREE.CylinderGeometry(0.6, 0.6, 0.12, 16), M(m, mat(0, 16.7, 0.06, 0, Math.PI / 2)))
      arched(b, m, 1.1, 2.6, 3.6, 'glassC', 0.2)
      // pilaster between bays
      const ap = a0 + (i / n) * (a1 - a0)
      if (i > 0) b.add(DECO, metricBox(0.7, HA - SOCLE - 1.0, 0.14), M(at(cx + Math.cos(ap) * r, cz + Math.sin(ap) * r, ap), mat(0, SOCLE + (HA - SOCLE - 1.0) / 2, 0.07)))
    }
  }
  apseDeco(XC, LZ, LR, 0.15, Math.PI - 0.15, 6)
  apseDeco(XC, -LZ, LR, Math.PI + 0.15, 2 * Math.PI - 0.15, 6)
  apseDeco(XA, 0, AR, -Math.PI / 2 + 0.55, Math.PI / 2 - 0.55, 5)

  /* ================= west front, towers' lower bays, side walls ================= */
  for (const s of [1, -1]) {
    const zc = s * (NHW - TW.hz)
    // corner bays: tall slit windows on west and side faces, ornamental strips
    const mw = at(XN0, zc, Math.PI)
    arched(b, mw, 1.1, 8.6, 3.4, 'glassC', 0.22)
    for (const u of [-3.1, 3.1]) b.add('fcOrn', metricBox(0.7, HN - SOCLE - 1.5, 0.12), M(mw, mat(u, SOCLE + (HN - SOCLE - 1.5) / 2, 0.06)))
    const ms = at((TW.x0 + TW.x1) / 2, s * NHW, s > 0 ? Math.PI / 2 : -Math.PI / 2)
    arched(b, ms, 1.1, 8.6, 3.4, 'glassC', 0.22)
    for (const u of [-3.1, 3.1]) b.add('fcOrn', metricBox(0.7, HN - SOCLE - 1.5, 0.12), M(ms, mat(u, SOCLE + (HN - SOCLE - 1.5) / 2, 0.06)))
    // narthex side wall: three bays, two window rows, side entrance annex
    for (const x of [-11.2, -7.2, -3.2]) {
      const m = at(x, s * NHW, s > 0 ? Math.PI / 2 : -Math.PI / 2)
      arched(b, m, 1.15, 2.6, 9.0, 'glassC', 0.24)
      b.add('glassC', metricBox(1.15, 2.2, 0.03), M(m, mat(0, 4.4, 0.02)))
      b.add(DECO, extrude(frameShape('rect', 1.15, 2.2, 0.2, 0, 3.3), 0.1), m)
      b.add(DECO, metricBox(1.7, 0.16, 0.3), M(m, mat(0, 8.75, 0.12)))
      // blind arcade under the cornice
      for (const u of [-1.2, 0, 1.2]) b.add('fcShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 1.6, u, 12.7, 8))), M(m, mat(0, 0, 0.015)))
    }
    // side entrance annex with a small gabled copper roof (photo 03)
    {
      const x0 = -1.0
      const x1 = 4.2
      const z0 = s * NHW
      const d = 3.2
      b.block(WALL, x1 - x0, 5.6, d, (x0 + x1) / 2, 0, z0 + s * d / 2)
      b.block(DECO, x1 - x0 + 0.3, 0.3, d + 0.3, (x0 + x1) / 2, 5.3, z0 + s * d / 2)
      const ye = 5.75
      const rise = 1.4
      const zz = z0 + s * (d + 0.4)
      facet(b, CU, [V(x0 - 0.4, ye, z0), V(x0 - 0.4, ye, zz), V((x0 + x1) / 2, ye + rise, zz), V((x0 + x1) / 2, ye + rise, z0)], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [V(x1 + 0.4, ye, zz), V(x1 + 0.4, ye, z0), V((x0 + x1) / 2, ye + rise, z0), V((x0 + x1) / 2, ye + rise, zz)], { seams: SEAM, thickness: 0.1 })
      const m = at((x0 + x1) / 2, zz - s * 0.4, s > 0 ? Math.PI / 2 : -Math.PI / 2)
      b.add('fcDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 3.2, 0, SOCLE, 10))), M(m, mat(0, 0, 0.02)))
    }
  }
  // central bay: triple window, round-arched gable with mosaic
  {
    const m = at(XN0, 0, Math.PI)
    for (const u of [-1.6, 0, 1.6]) arched(b, M(m, mat(u, 0, 0)), 1.15, 3.6, 10.6, 'glassC', 0.2)
    const g = new THREE.Shape()
    g.moveTo(-3.6, HN - 0.4)
    g.lineTo(3.6, HN - 0.4)
    g.absarc(0, HN + 0.4, 3.6, 0, Math.PI, false)
    g.lineTo(-3.6, HN - 0.4)
    b.add(WALL, extrude(g, 1.2, 20), M(m, mat(0, 0, -1.2)))
    b.add(DECO, extrude(frameShape('round', 7.2, 4.8, 0.35, 0, HN - 0.4), 0.2), M(m, mat(0, 0, 0)))
    b.add('fcMosaic', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 5.0, 4.2, 0, HN - 0.2, 14))), M(m, mat(0, 0, 0.03)))
    b.add(CU, extrude(frameShape('round', 7.2, 4.8, 0.45, 0, HN - 0.4), 0.3), M(m, mat(0, 0.12, -0.9)))
  }

  /* ================= porch ================= */
  {
    const cx = (XP0 + XN0) / 2
    const L = XN0 - XP0
    const HP = 11.0
    b.block(WALL, L, HP, 2 * PHW, cx, 0, 0)
    b.block(DECO, L + 0.5, 0.4, 2 * PHW + 0.5, cx, HP - 0.4, 0)
    b.block('fcSocle', L + 1.6, SOCLE, 2 * PHW + 1.0, cx - 0.6, 0, 0)
    const m = at(XP0, 0, Math.PI)
    b.add('fcShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 4.4, 8.2, 0, SOCLE, 16))), M(m, mat(0, 0, 0.03)))
    b.add(DECO, extrude(frameShape('round', 4.4, 8.2, 0.5, 0, SOCLE), 0.2), m)
    for (const s of [1, -1]) {
      const ms = at(cx, s * PHW, s > 0 ? Math.PI / 2 : -Math.PI / 2)
      arched(b, ms, 2.6, 6.2, SOCLE, 'fcShadow', 0.35)
    }
    // low gable roof running into the narthex front
    const pitch = 16 * D2R
    const ye = HP + 0.15
    const ov = 0.6
    const rise = (PHW + ov) * Math.tan(pitch)
    facet(b, CU, [V(XP0 - ov, ye, PHW + ov), V(XN0, ye, PHW + ov), V(XN0, ye + rise, 0), V(XP0 - ov, ye + rise, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(XN0, ye, -PHW - ov), V(XP0 - ov, ye, -PHW - ov), V(XP0 - ov, ye + rise, 0), V(XN0, ye + rise, 0)], { seams: SEAM, thickness: 0.12 })
    const gs = new THREE.Shape([new THREE.Vector2(-PHW, 0), new THREE.Vector2(PHW, 0), new THREE.Vector2(0, rise)])
    b.add(WALL, extrude(gs, 0.3), M(m, mat(0, ye, -0.3)))
    b.add('fcIcon', new THREE.CircleGeometry(0.9, 20), M(m, mat(0, ye + 0.9, 0.02)))
  }

  /* ================= roofs ================= */
  // narthex: low hipped copper roof
  {
    const pitch = 18 * D2R
    const t = Math.tan(pitch)
    const ov = 0.6
    const ye = HN + 0.2 - ov * t
    const hw = NHW + ov
    const x0 = XN0 - ov
    const x1 = XN1 + 3.0
    const top = ye + hw * t
    facet(b, CU, [V(x0, ye, hw), V(x1, ye, hw), V(x1, top, 0), V(x0 + hw, top, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(x1, ye, -hw), V(x0, ye, -hw), V(x0 + hw, top, 0), V(x1, top, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(x0, ye, -hw), V(x0, ye, hw), V(x0 + hw, top, 0)], { seams: SEAM, thickness: 0.12 })
    for (const s of [1, -1]) b.beam(CU, V(x0, ye + 0.05, s * hw), V(x0 + hw, top + 0.05, 0), 0.2, 0.1)
  }
  // apses: ruled copper roofs from the apse eaves up to the base of the central tower
  const TB = { hw: 6.6, y0: HA, y1: 22.0 } // square tower base over the crossing
  const apY = TB.y0 + 2.6
  {
    const ov = 0.6
    const ye = HA + 0.2
    const ruled = (eave: THREE.Vector3[], line: THREE.Vector3[]) => {
      for (let i = 0; i < eave.length - 1; i++) {
        facet(b, CU, [eave[i], eave[i + 1], line[i + 1]], { seams: SEAM, thickness: 0.1 })
        facet(b, CU, [eave[i], line[i + 1], line[i]], { seams: SEAM, thickness: 0.1 })
      }
      for (let i = 0; i < eave.length - 1; i++) b.beam(CU, eave[i].clone().setY(ye - 0.06), eave[i + 1].clone().setY(ye - 0.06), 0.2, 0.18)
    }
    const n = 16
    for (const s of [1, -1]) {
      const eave: THREE.Vector3[] = []
      const line: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const a = s > 0 ? (i / n) * Math.PI : Math.PI + (i / n) * Math.PI
        eave.push(V(XC + Math.cos(a) * (LR + ov), ye, s * LZ + Math.sin(a) * (LR + ov)))
        line.push(V(XC + Math.cos(a) * TB.hw, apY, s * TB.hw))
      }
      ruled(eave, line)
    }
    const eave: THREE.Vector3[] = []
    const line: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI
      eave.push(V(XA + Math.cos(a) * (AR + ov), ye, Math.sin(a) * (AR + ov)))
      line.push(V(XC + TB.hw, apY, Math.sin(a) * TB.hw))
    }
    ruled(eave, line)
    // west slope of the crossing between the narthex roof and the tower base
    facet(b, CU, [V(XN1 - 1.0, HA + 0.2, LZ + 0.4), V(XN1 - 1.0, HA + 0.2, -LZ - 0.4), V(XC - TB.hw, apY, -TB.hw), V(XC - TB.hw, apY, TB.hw)], { seams: SEAM, thickness: 0.1 })
  }

  /* ================= west towers ================= */
  for (const s of [1, -1]) {
    const cx = (TW.x0 + TW.x1) / 2
    const cz = s * (NHW - TW.hz)
    const hs = 3.3
    const y0 = HN
    const y1 = 20.0
    b.block(WALL, 2 * hs, y1 - y0 + 0.4, 2 * hs, cx, y0 - 0.4, cz)
    b.block(DECO, 2 * hs + 0.6, 0.4, 2 * hs + 0.6, cx, y1 - 0.4, cz)
    b.block(DECO, 2 * hs + 0.3, 0.3, 2 * hs + 0.3, cx, y0 + 0.3, cz)
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = at(cx + nx * hs, cz + nz * hs, Math.atan2(nz, nx))
      for (const u of [-1.7, 0, 1.7]) b.add('fcShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 2.0, u, 17.1, 8))), M(m, mat(0, 0, 0.02)))
    }
    // round drum with arched windows between pilasters
    const r = 3.2
    const yd0 = y1
    const yd1 = 25.2
    b.add(WALL, new THREE.CylinderGeometry(r, r, yd1 - yd0, 32), mat(cx, (yd0 + yd1) / 2, cz))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const m = at(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a)
      arched(b, m, 0.75, 2.6, yd0 + 1.0, 'glassC', 0.16)
      b.add(WALL, extrude(frameShape('round', 1.25, 3.4, 0.14, 0, yd0 + 0.7), 0.08), m)
      const ac = a + Math.PI / 8
      b.add(DECO, metricBox(0.4, yd1 - yd0 - 0.4, 0.3), mat(cx + Math.cos(ac) * (r + 0.1), (yd0 + yd1) / 2 - 0.2, cz + Math.sin(ac) * (r + 0.1), Math.PI / 2 - ac))
    }
    b.add(DECO, new THREE.CylinderGeometry(r + 0.5, r + 0.2, 0.45, 32), mat(cx, yd1 + 0.1, cz))
    // dome
    const sub = new Builder()
    copperDome(sub, 0, yd1 + 0.32, r + 0.35, 2.9, 28, 2.0)
    b.merge(sub, mat(cx, 0, cz))
  }

  /* ================= central tower ================= */
  {
    b.block(WALL, 2 * TB.hw, TB.y1 - TB.y0 + 0.5, 2 * TB.hw, XC, TB.y0 - 0.5, 0)
    b.block(DECO, 2 * TB.hw + 0.7, 0.45, 2 * TB.hw + 0.7, XC, TB.y1 - 0.45, 0)
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = at(XC + nx * TB.hw, nz * TB.hw, Math.atan2(nz, nx))
      for (const u of [-3.6, 0, 3.6]) b.add('fcShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.1, 1.5, u, 20.0, 8))), M(m, mat(0, 0, 0.02)))
    }
    const n = 12
    const R = 5.75 / Math.cos(Math.PI / n)
    const yd0 = TB.y1
    const yd1 = 31.0
    b.add(WALL, loft([polyRing(n, R, yd0, Math.PI / n, XC, 0), polyRing(n, R, yd1, Math.PI / n, XC, 0)], { capTop: true, flat: true }))
    b.add(DECO, loft([polyRing(n, R + 0.15, yd0, Math.PI / n, XC, 0), polyRing(n, R + 0.15, yd0 + 0.5, Math.PI / n, XC, 0)], { capTop: true, flat: true }))
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      const ap = 5.75
      const m = at(XC + Math.cos(a) * ap, Math.sin(a) * ap, a)
      b.add('fcShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.2, 6.6, 0, yd0 + 1.1, 10))), M(m, mat(0, 0, 0.015)))
      b.add(DECO, extrude(frameShape('round', 2.2, 6.6, 0.2, 0, yd0 + 1.1), 0.12), m)
      arched(b, m, 0.85, 3.4, yd0 + 2.6, 'glassC', 0.14)
    }
    b.add(DECO, loft([polyRing(n, R + 0.1, yd1 - 0.4, Math.PI / n, XC, 0), polyRing(n, R + 0.55, yd1 - 0.05, Math.PI / n, XC, 0), polyRing(n, R + 0.55, yd1 + 0.3, Math.PI / n, XC, 0)], { capTop: true, capBottom: true, flat: true }))
    copperDome(b, XC, yd1 + 0.28, 5.9, 4.2, 40, 2.6, true)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [8.9, 33.0, 3.0],
  materials: () => ({
    fcWall: new THREE.MeshStandardMaterial({ color: '#f0eee8', roughness: 0.9 }),
    fcDeco: new THREE.MeshStandardMaterial({ color: '#f7f6f1', roughness: 0.85 }),
    fcShadow: new THREE.MeshStandardMaterial({ color: '#d4d2cb', roughness: 0.92 }),
    fcSocle: new THREE.MeshStandardMaterial({ color: '#c8c3b6', roughness: 0.9 }),
    fcOrn: new THREE.MeshStandardMaterial({ color: '#e3e0d6', roughness: 0.92 }),
    fcDoor: new THREE.MeshStandardMaterial({ color: '#4c3a2c', roughness: 0.7 }),
    fcMosaic: new THREE.MeshStandardMaterial({ color: '#b48a3a', roughness: 0.5, metalness: 0.2 }),
    fcIcon: new THREE.MeshStandardMaterial({ color: '#8a6d3b', roughness: 0.6 }),
  }),
  notes:
    'New triconch cathedral with two west towers and a wide central tower; copper domes and roofs; heights and the north side approximated from 2016 construction-gallery photographs.',
}
export default model
