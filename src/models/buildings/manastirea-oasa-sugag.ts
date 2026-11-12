/**
 * Oașa Monastery (Șugag, Alba) — the new masonry church „Sf. Mare Mucenic
 * Pantelimon", OSM way 1081850116 (outline 32.3 × 19.0 m, long axis 90.4°).
 *
 * Modelling specification (real metres; +X = 90.4°, towards the altar apse;
 * +Z = south). Plan taken from the OSM outline (re-centred on the axis):
 *  - Narthex 12.0 × 15.3 m (x −16.15…−4.15), wider than the church body.
 *  - Naos/sanctuary body 12.1 m wide: west bay (x −4.15…0.45), crossing
 *    6.9 m square (x 0.45…7.35) with semicircular side apses (r 3.45 m,
 *    projecting to ±9.5 m), sanctuary bay (x 7.35…12.76) and a semicircular
 *    altar apse (r 3.4 m) — a Serbo-Byzantine cross-in-square / trefoil plan.
 *  - Massing (from the three 2020 drone photographs): low outer walls
 *    ≈ 7.0 m with lean-to and hipped roofs (narthex hipped all round); raised
 *    cross arms 7.0 m wide, eaves ≈ 9.6 m — long west arm with a gable rising
 *    out of the narthex roof, east arm with a gable over the altar apse,
 *    north/south arms ending in arched (barrel) gables above the side apses;
 *    apses ≈ 8.6 m with half-cone roofs; square crossing base ≈ 12.9 m,
 *    cylindrical drum (Ø 6.1 m, 8 round-arched windows, colonnettes) to
 *    ≈ 16.9 m, slightly flattened dome (top ≈ 19.8 m) and cross (≈ 21.8 m).
 *  - Walls white with thin grey banding (stone/brick courses as seen in the
 *    photos), blind round arches with narrow arched windows, stone cornices,
 *    grey stone socle; main portal in the west front.
 *  - METAL (client rule): the 2020 drone photographs predate the 2022 order
 *    and show blue-grey sheet roofs. COLOR METAL supplied copper sheet
 *    according to its records; which surfaces were covered is not documented,
 *    so all roofs and the dome are shown in weathered copper (copper supplied
 *    ≤ 2022 → aged brown), standing seams ≈ 0.5 m, ribbed dome.
 * Approximations: all heights estimated from oblique drone photographs (no
 * survey; ±10–15 %); window counts and the north and east elevations
 * partly inferred (symmetry); banding schematic; minor roof junctions
 * simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, hippedRoof, barrelRoof, dome, cross, faceFrame, seams, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- plan ---------------- */
const X0 = -16.15 // west front
const XN = -4.15 // narthex → naos
const NHW = 7.65 // narthex half width
const HW = 6.05 // naos half width
const XC0 = 0.45 // crossing
const XC1 = 7.35
const XCC = (XC0 + XC1) / 2
const XS = 12.76 // east wall (apse chord)
const AHW = 3.5 // cross-arm half width
const SAR = 3.45 // side apse radius
const EAR = 3.4 // altar apse radius
const XARM = -12.0 // west gable of the raised west arm

/* ---------------- heights ---------------- */
const LOW = 7.0
const ARM = 9.6
const APSE_H = 8.6
const ARM_PITCH = 34.4
const AT = Math.tan(ARM_PITCH * D2R)
const ARM_RIDGE = ARM + AHW * AT
const LOW_PITCH = 22
const LT = Math.tan(LOW_PITCH * D2R)
const BASE_TOP = 12.9
const DRUM_R = 3.05
const DRUM0 = 13.1
const DRUM1 = 16.9
const OV = 0.4

const ROOF = 'copperBrown'
const SEAM = seams(ROOF, 0.5, 0.05, 0.045)
const WALL = 'oasaWall'
const BAND = 'oasaBand'
const STONE = 'oasaStone'
const SOCLE = 'stoneGrey'

/* ---------------- helpers ---------------- */

/** Wall block with stone socle, grey banding and a cornice; faces listed get the bands. */
function wallBlock(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number, bandFaces: Face[] = ['+x', '-x', '+z', '-z'], y0 = 0) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  b.block(WALL, w, h - y0, d, cx, y0, cz)
  if (y0 === 0) b.block(SOCLE, w + 0.14, 0.7, d + 0.14, cx, 0, cz)
  for (const f of bandFaces) {
    for (let y = Math.max(y0 + 0.4, 1.3); y < h - 0.5; y += 0.75) {
      if (f === '+z') b.block(BAND, w, 0.07, 0.03, cx, y, z1 + 0.012)
      if (f === '-z') b.block(BAND, w, 0.07, 0.03, cx, y, z0 - 0.012)
      if (f === '+x') b.block(BAND, 0.03, 0.07, d, x1 + 0.012, y, cz)
      if (f === '-x') b.block(BAND, 0.03, 0.07, d, x0 - 0.012, y, cz)
    }
  }
  // cornice (stone)
  b.block(STONE, w + 0.3, 0.26, d + 0.3, cx, h - 0.5, cz)
}

/** Narrow round-arched window with stone surround. */
function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, type: OpeningType = 'round') {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.04)))
  b.add(STONE, extrude(frameShape(type, w, h, 0.16, 0, y0), 0.1), M(m, mat(0, 0, 0.0)))
  b.add(STONE, metricBox(w + 0.5, 0.12, 0.22), M(m, mat(0, y0 - 0.2, 0.08)))
}

/** Blind round arch (archivolt + jambs in stone) on a façade. */
function blindArch(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add(STONE, extrude(frameShape('round', w, h, 0.24, 0, y0), 0.12), m)
  b.add(WALL, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 16))), M(m, mat(0, 0, -0.005)))
}

function F(face: Face, plane: number, w: number) {
  const u = face === '+z' ? w : face === '-z' ? -w : face === '+x' ? -w : w
  return faceFrame(face, plane, u, 0, 0)
}

/** Semicircular apse (walls, socle, banding, cornice, half-cone roof with radial seams). */
function apse(b: Builder, cx: number, cz: number, r: number, th0: number, roofTop: number, windows: number[]) {
  const h = APSE_H
  const half = (rr: number, hh: number, y: number, key: string, open = true) =>
    b.add(key, new THREE.CylinderGeometry(rr, rr, hh, 36, 1, open, th0, Math.PI), mat(cx, y + hh / 2, cz))
  half(r, h, 0, WALL)
  half(r + 0.07, 0.7, 0, SOCLE)
  for (let y = 1.3; y < h - 0.5; y += 0.75) half(r + 0.012, 0.07, y, BAND)
  half(r + 0.16, 0.26, h - 0.5, STONE, false)
  // half-cone roof
  const R = r + OV
  const rise = roofTop - h
  const coneH = rise * (R / r)
  b.add(ROOF, new THREE.CylinderGeometry(0.02, R, coneH, 36, 1, true, th0, Math.PI), mat(cx, roofTop - coneH / 2, cz))
  const n = Math.round((Math.PI * R) / 0.5)
  for (let i = 1; i < n; i++) {
    const a = th0 + (i / n) * Math.PI
    const p = V(cx + Math.sin(a) * (R + 0.02), roofTop - coneH + 0.02, cz + Math.cos(a) * (R + 0.02))
    b.beam(ROOF, p, V(cx, roofTop + 0.02, cz), 0.045, 0.05)
  }
  // windows (angles relative to the apse axis)
  for (const da of windows) {
    const a = th0 + Math.PI / 2 + da * D2R
    const m = mat(cx + Math.sin(a) * (r + 0.01), 0, cz + Math.cos(a) * (r + 0.01), a)
    blindArch(b, m, 1.5, 5.4, 0.7)
    win(b, m, 0.62, 1.9, 3.1)
  }
}

/** Lean-to roof between an inner wall line (zi, top yi) and an outer eave (zo); fall towards ±z. */
function leanTo(b: Builder, x0: number, x1: number, zi: number, zo: number, hipEast = false) {
  const s = Math.sign(zo)
  const zoe = zo + s * OV
  const ye = LOW - OV * LT
  const yi = ye + Math.abs(zoe - zi) * LT
  const xe = hipEast ? x1 + OV : x1
  const xi = hipEast ? xe - Math.abs(zoe - zi) : x1
  facet(b, ROOF, [V(x0, ye, zoe), V(xe, ye, zoe), V(xi, yi, zi), V(x0, yi, zi)], { seams: SEAM, thickness: 0.1 })
  if (hipEast) {
    facet(b, ROOF, [V(xe, ye, zoe), V(xe, ye, zi), V(xi, yi, zi)], { seams: SEAM, thickness: 0.1 })
    b.beam(ROOF, V(xe, ye + 0.04, zoe), V(xi, yi + 0.04, zi), 0.16, 0.09)
  }
  b.beam(ROOF, V(x0, ye - 0.07, zoe + s * 0.05), V(xe, ye - 0.07, zoe + s * 0.05), 0.14, 0.13)
  return yi
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()

  /* ---------------- outer (low) walls ---------------- */
  wallBlock(b, X0, XN, -NHW, NHW, LOW)
  wallBlock(b, XN, XC0, -HW, HW, LOW, ['+z', '-z'])
  wallBlock(b, XC1, XS, -HW, HW, LOW, ['+z', '-z', '+x'])

  /* ---------------- raised cross arms ---------------- */
  wallBlock(b, XARM, XC0, -AHW, AHW, ARM, ['+z', '-z', '-x'], LOW - 1.0)
  wallBlock(b, XC1, XS, -AHW, AHW, ARM, ['+z', '-z', '+x'], LOW - 1.0)
  for (const sz of [-1, 1]) {
    const z0 = sz > 0 ? AHW - 0.05 : -HW
    const z1 = sz > 0 ? HW : -AHW + 0.05
    wallBlock(b, XC0, XC1, z0, z1, ARM + 0.68, [sz > 0 ? '+z' : '-z'])
  }
  // crossing base
  wallBlock(b, XC0, XC1, -AHW, AHW, BASE_TOP, ['+x', '-x', '+z', '-z'], ARM - 0.5)

  // gable walls of the west and east arms (triangles above the eaves)
  {
    const tri = new THREE.Shape([new THREE.Vector2(-AHW, ARM - 0.02), new THREE.Vector2(AHW, ARM - 0.02), new THREE.Vector2(0, ARM_RIDGE - 0.06)])
    b.add(WALL, extrude(tri, 0.4), mat(XARM + 0.4, 0, 0, -Math.PI / 2))
    b.add(WALL, extrude(tri, 0.4), mat(XS - 0.4, 0, 0, Math.PI / 2))
    // raking stone cornices
    for (const [x, s] of [
      [XARM - 0.08, -1],
      [XS + 0.08, 1],
    ]) {
      for (const sz of [-1, 1]) b.beam(STONE, V(x, ARM - 0.1, sz * (AHW + 0.2)), V(x, ARM_RIDGE + 0.05, 0), 0.26, 0.24, V(s, 0, 0))
    }
  }

  /* ---------------- arm roofs ---------------- */
  {
    const ey = ARM - OV * AT
    const hz = AHW + OV
    const roofArm = (xa: number, xb: number) => {
      facet(b, ROOF, [V(xa, ey, hz), V(xb, ey, hz), V(xb, ARM_RIDGE, 0), V(xa, ARM_RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
      facet(b, ROOF, [V(xb, ey, -hz), V(xa, ey, -hz), V(xa, ARM_RIDGE, 0), V(xb, ARM_RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
      b.beam(ROOF, V(xa, ARM_RIDGE + 0.05, 0), V(xb, ARM_RIDGE + 0.05, 0), 0.22, 0.12)
      for (const sz of [-1, 1]) b.beam(ROOF, V(xa, ey - 0.07, sz * (hz + 0.05)), V(xb, ey - 0.07, sz * (hz + 0.05)), 0.14, 0.13)
    }
    roofArm(XARM - OV, XC0 + 0.1)
    roofArm(XC1 - 0.1, XS + OV)
    // north / south arms: barrel roofs with arched gables
    const rise = 2.7
    for (const sz of [-1, 1]) {
      const sub = new Builder()
      barrelRoof(sub, ROOF, { w: 2.65, d: XC1 - XC0, y: ARM, rise, overhang: 0.3, segs: 14, seams: SEAM })
      b.merge(sub, mat(XCC, 0, sz * ((AHW + HW) / 2 + 0.15), Math.PI / 2))
      // arched gable wall following the barrel curve + archivolt band
      const hs = (XC1 - XC0) / 2
      const hd = hs + 0.3
      const R = (hd * hd + rise * rise) / (2 * rise)
      const yc = ARM + rise - R
      const a1 = Math.asin(hs / R)
      const g = new THREE.Shape()
      g.moveTo(-hs, ARM - 0.5)
      g.lineTo(hs, ARM - 0.5)
      for (let i = 0; i <= 20; i++) {
        const a = a1 - (2 * a1 * i) / 20
        g.lineTo(R * Math.sin(a), yc + R * Math.cos(a) - 0.06)
      }
      const zf = sz * HW
      b.add(WALL, extrude(g, 0.4), mat(XCC, 0, sz > 0 ? zf - 0.4 : zf + 0.4, sz > 0 ? 0 : Math.PI))
      const pts: THREE.Vector2[] = []
      const ro = R - 0.08
      const ri = R - 0.42
      for (let i = 0; i <= 20; i++) {
        const a = a1 - (2 * a1 * i) / 20
        pts.push(new THREE.Vector2(ro * Math.sin(a), yc + ro * Math.cos(a)))
      }
      const a2 = Math.asin((hs - 0.3) / ri)
      for (let i = 20; i >= 0; i--) {
        const a = a2 - (2 * a2 * i) / 20
        pts.push(new THREE.Vector2(ri * Math.sin(a), yc + ri * Math.cos(a)))
      }
      b.add(STONE, extrude(new THREE.Shape(pts), 0.14), mat(XCC, 0, zf, sz > 0 ? 0 : Math.PI))
      // bifora window in the gable
      const mg = mat(XCC, 0, zf + sz * 0.02, sz > 0 ? 0 : Math.PI)
      for (const u of [-0.55, 0.55]) win(b, M(mg, mat(u, 0, 0)), 0.6, 1.45, ARM + 0.15)
    }
  }

  /* ---------------- lower roofs ---------------- */
  hippedRoof(b, ROOF, { x: (X0 + XN) / 2, z: 0, w: XN - X0, d: 2 * NHW, y: LOW, pitch: LOW_PITCH, overhang: OV, seams: SEAM })
  for (const sz of [-1, 1]) {
    leanTo(b, XN - 2.8, XC0, sz * AHW, sz * HW)
    leanTo(b, XC1, XS, sz * AHW, sz * HW, true)
  }
  // narthex gutters
  {
    const gy = LOW - OV * LT - 0.07
    const hx = (XN - X0) / 2 + OV + 0.05
    const hz = NHW + OV + 0.05
    const cx = (X0 + XN) / 2
    const c = [V(cx - hx, gy, -hz), V(cx + hx, gy, -hz), V(cx + hx, gy, hz), V(cx - hx, gy, hz)]
    for (let i = 0; i < 4; i++) b.beam(ROOF, c[i], c[(i + 1) % 4], 0.14, 0.13)
    for (const [x, z] of [
      [X0 + 0.1, NHW + 0.12],
      [X0 + 0.1, -NHW - 0.12],
      [XN - 0.1, NHW + 0.12],
      [XN - 0.1, -NHW - 0.12],
      [XS - 0.1, HW + 0.12],
      [XS - 0.1, -HW - 0.12],
    ]) b.rod(ROOF, V(x, 0.3, z), V(x, LOW - OV * LT - 0.07, z), 0.05, 8)
  }

  /* ---------------- apses ---------------- */
  apse(b, XCC, HW - 0.02, SAR, -Math.PI / 2, ARM + 0.55, [-50, 0, 50])
  apse(b, XCC, -HW + 0.02, SAR, Math.PI / 2, ARM + 0.55, [-50, 0, 50])
  apse(b, XS - 0.02, 0, EAR, 0, ARM + 0.6, [-45, 0, 45])

  /* ---------------- crossing: skirt, drum, dome ---------------- */
  {
    const sx = (XC1 - XC0) / 2 + 0.3
    const sz = AHW + 0.3
    const y0 = BASE_TOP - 0.05
    const y1 = DRUM0 + 0.25
    const ti = DRUM_R - 0.05
    const c0 = [V(XCC - sx, y0, -sz), V(XCC + sx, y0, -sz), V(XCC + sx, y0, sz), V(XCC - sx, y0, sz)]
    const c1 = [V(XCC - ti, y1, -ti), V(XCC + ti, y1, -ti), V(XCC + ti, y1, ti), V(XCC - ti, y1, ti)]
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, ROOF, [c0[i], c0[j], c1[j], c1[i]], { seams: SEAM, thickness: 0.1 })
      b.beam(ROOF, c0[i].clone().add(V(0, 0.04, 0)), c1[i].clone().add(V(0, 0.04, 0)), 0.14, 0.08)
    }
    b.block(ROOF, 2 * ti, 0.06, 2 * ti, XCC, y1 - 0.04, 0)
    // drum
    b.add(WALL, new THREE.CylinderGeometry(DRUM_R, DRUM_R, DRUM1 - DRUM0, 40, 1, true), mat(XCC, (DRUM0 + DRUM1) / 2, 0))
    b.add(STONE, new THREE.CylinderGeometry(DRUM_R + 0.12, DRUM_R + 0.12, 0.25, 40), mat(XCC, DRUM0 + 0.35, 0))
    for (let y = DRUM0 + 0.9; y < DRUM1 - 0.6; y += 0.75) b.add(BAND, new THREE.CylinderGeometry(DRUM_R + 0.012, DRUM_R + 0.012, 0.07, 40, 1, true), mat(XCC, y, 0))
    b.add(STONE, new THREE.CylinderGeometry(DRUM_R + 0.3, DRUM_R + 0.2, 0.32, 40), mat(XCC, DRUM1 - 0.12, 0))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8
      const m = mat(XCC + Math.cos(a) * (DRUM_R + 0.1), 0, Math.sin(a) * (DRUM_R + 0.1), Math.PI / 2 - a)
      blindArch(b, m, 1.35, 3.0, DRUM0 + 0.5)
      win(b, m, 0.7, 2.0, DRUM0 + 0.95)
      const ac = a + Math.PI / 8
      b.add(STONE, new THREE.CylinderGeometry(0.1, 0.1, DRUM1 - DRUM0 - 0.6, 8), mat(XCC + Math.cos(ac) * (DRUM_R + 0.08), (DRUM0 + DRUM1) / 2, Math.sin(ac) * (DRUM_R + 0.08)))
    }
    // dome with standing seams (meridian ribs) and cross
    const top = dome(b, ROOF, { x: XCC, y: DRUM1 + 0.02, z: 0, r: DRUM_R + 0.15, h: 2.9, profile: 'hemi', seg: 48, ribs: 40, ribH: 0.05 })
    b.add(ROOF, new THREE.CylinderGeometry(0.22, 0.3, 0.45, 12), mat(XCC, top + 0.15, 0))
    b.add('gilt', new THREE.SphereGeometry(0.22, 12, 8), mat(XCC, top + 0.5, 0))
    cross(b, 'gilt', XCC, top + 0.55, 0, 1.6, false, Math.PI / 2)
    // gutter of the skirt
  }

  /* ---------------- façades ---------------- */
  // narthex long sides: three blind arches, windows, south door
  for (const [face, plane] of [
    ['+z', NHW],
    ['-z', -NHW],
  ] as [Face, number][]) {
    for (const x of [-14.1, -10.15, -6.2]) {
      const m = F(face, plane, x)
      blindArch(b, m, 3.0, 5.6, 0.7)
      if (face === '+z' && x === -10.15) {
        b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 2.9, 0, 0.7, 12))), M(m, mat(0, 0, 0.04)))
        b.add(STONE, extrude(frameShape('round', 1.5, 2.9, 0.2, 0, 0.7), 0.12), m)
        win(b, m, 0.55, 1.2, 4.3)
      } else win(b, m, 0.75, 2.2, 2.6)
    }
    // corner pilasters
    for (const x of [X0 + 0.35, XN - 0.35]) b.add(STONE, metricBox(0.7, LOW - 0.7, 0.12), M(F(face, plane, x), mat(0, 0.7 + (LOW - 0.7) / 2, 0.06)))
  }
  // west front: portal + two arches
  {
    const face: Face = '-x'
    for (const z of [-4.6, 4.6]) {
      const m = F(face, X0, z)
      blindArch(b, m, 2.6, 5.4, 0.7)
      win(b, m, 0.7, 2.1, 2.6)
    }
    const m = F(face, X0, 0)
    b.add(STONE, extrude(frameShape('round', 3.6, 6.0, 0.35, 0, 0.7), 0.2), m)
    b.add(WALL, new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.6, 6.0, 0, 0.7, 16))), M(m, mat(0, 0, -0.005)))
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.0, 3.3, 0, 0.7, 12))), M(m, mat(0, 0, 0.04)))
    b.add(STONE, extrude(frameShape('round', 2.0, 3.3, 0.22, 0, 0.7), 0.14), m)
    // icon niche in the tympanum
    b.add('oasaIcon', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 1.7, 0, 4.4, 12))), M(m, mat(0, 0, 0.03)))
    b.add(STONE, extrude(frameShape('round', 1.4, 1.7, 0.12, 0, 4.4), 0.08), m)
    // steps
    for (let i = 0; i < 3; i++) b.block(STONE, 0.45, 0.18 * (3 - i), 5.0, X0 - 0.25 - i * 0.45, 0, 0)
    // window in the west gable of the raised arm
    win(b, F(face, XARM, 0), 0.7, 1.5, ARM - 0.2)
  }
  // west bay and sanctuary side walls
  for (const [face, plane] of [
    ['+z', HW],
    ['-z', -HW],
  ] as [Face, number][]) {
    for (const x of [-1.85, 10.05]) {
      const m = F(face, plane, x)
      blindArch(b, m, 2.4, 5.4, 0.7)
      win(b, m, 0.7, 2.1, 2.6)
    }
  }
  // clerestory windows of the raised arms
  for (const [face, plane] of [
    ['+z', AHW],
    ['-z', -AHW],
  ] as [Face, number][]) {
    for (const x of [-9.4, -5.4, -1.6, 10.05]) win(b, F(face, plane, x), 0.5, 0.55, ARM - 0.88, 'rect')
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [XCC, 18.2, 2.0],
  materials: () => ({
    oasaWall: new THREE.MeshStandardMaterial({ color: '#efede7', roughness: 0.88 }),
    oasaBand: new THREE.MeshStandardMaterial({ color: '#a8a39a', roughness: 0.9 }),
    oasaStone: new THREE.MeshStandardMaterial({ color: '#d8d3c7', roughness: 0.86 }),
    oasaIcon: new THREE.MeshStandardMaterial({ color: '#b48a45', roughness: 0.6, metalness: 0.2 }),
  }),
  notes:
    'Serbo-Byzantine cross-in-square church with a wide narthex, trefoil apses, raised cross arms and a drum with dome; roofs and dome shown in weathered copper (COLOR METAL supply per its records; the 2020 photos predate it). Heights estimated from drone photos.',
}
export default model
