/**
 * Orthodox parish church of Strâmtura (Maramureș) — masonry church with a
 * three-tower front, OSM way 816480176 (outline ≈ 39.1 × 18.6 m).
 *
 * Modelling specification (real metres). The OSM walls run at ≈ 44.5° (the
 * computed long-axis bearing 39.4° is skewed by the irregular outline);
 * +X = 224.5°, from the three-tower front (north-east, facing the road) to
 * the altar apse (south-west); +Z = 314.5°.
 *  - Front (the two 2009 photographs, both frontal): a tall central tower
 *    (shaft ≈ 4.8 m, projecting ≈ 3.8 m in front of the side towers, as in
 *    the OSM outline) between two slender side towers (≈ 3.6 m square) linked
 *    by short walls (≈ 1.6 m). The façade width (≈ 15.2 m) is the OSM width;
 *    heights were scaled from it: side-tower shafts ≈ 12.9 m, linking walls
 *    ≈ 11.7 m, central shaft ≈ 16.4 m, central cross ≈ 23 m, side crosses
 *    ≈ 19.9 m.
 *  - Each tower: square shaft with a projecting eave (dark timber soffit),
 *    a metal skirt, an octagonal drum with round-arched niches, white
 *    pilasters, louvred slit windows and a scalloped white cornice, a wide
 *    octagonal eave, then an onion dome (side towers) or a ribbed dome
 *    (central tower) with a spike, ball and cross.
 *  - Façade details: entrance, rose window in a large white arch, tall
 *    round-arched window in the central tower; triple slit windows, a white
 *    diamond band at ≈ 8.2–8.9 m and arched windows on the side towers and
 *    linking walls; grey render with white trims.
 *  - Body behind the front (NOT photographed — reconstructed from the OSM
 *    outline only): nave 11.2 m wide, then a naos 13.2 m wide with polygonal
 *    lateral apses projecting to ±9.3 m (trefoil plan) and a polygonal altar
 *    apse; eaves ≈ 8.5 m (so that, as in the photographs, no roof shows above
 *    the 11.7 m linking walls), gable roofs (≈ 34°) and polygonal lean-to roofs over
 *    the apses. A possible dome over the naos is not documented and is not
 *    modelled.
 *  - METAL (client rule): the 2009 photographs predate the 2023 works and
 *    show grey sheet roofs. COLOR METAL supplied copper strip according to
 *    its records; the covered surfaces are not documented, so the three tower
 *    helms and the main roofs are shown in new copper (standing seams
 *    ≈ 0.5 m, ribbed domes).
 * Approximations: everything behind the front façade (walls, windows, roof
 * shapes) is inferred from the outline and the typology; tower heights are
 * scaled from a frontal photograph (±10–15 %); the carved wooden gate and the
 * fence in front of the church are not part of the model.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, prismOutline, cross, seams, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- plan (+X towards the altar) ---------------- */
const XF = -19.0 // front face of the central tower
const XT = -15.2 // front face of the side towers / linking walls
const XB = -11.6 // back of the tower front
const XNA = -0.9 // nave → naos
const XAL = 16.3 // naos east wall (altar apse chord)
const CHW = 2.4 // central tower half width
const STW = 3.6 // side tower width
const SZ = CHW + 1.6 + STW / 2 // side tower centre |z|
const NHW = 5.6 // nave half width
const QHW = 6.6 // naos half width
const AHW = 5.0 // altar apse half width
const ADEP = 3.25 // altar apse depth

/* ---------------- heights ---------------- */
const EAVE = 8.5
const PITCH = 34
const T = Math.tan(PITCH * D2R)
const OV = 0.4
const LAT_H = 6.4 // lateral apse walls
const ALT_H = 7.0 // altar apse walls
const SIDE_TOP = 12.9
const LINK_TOP = 11.7
const CEN_TOP = 16.4

const CU = 'copperNew'
const SEAM = seams(CU, 0.5, 0.05, 0.045)
const WALL = 'strRender'
const WHITE = 'strWhite'
const SOFFIT = 'strSoffit'

/* ---------------- helpers ---------------- */

/** Frame for a vertical face: origin at (x, 0, z), local z = outward normal (angle ry). */
const FR = (x: number, z: number, ry: number) => mat(x, 0, z, ry)
const RY = { front: -Math.PI / 2, back: Math.PI / 2, pz: 0, nz: Math.PI }

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, frame = 0.18) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.04)))
  b.add(WHITE, extrude(frameShape(type, w, h, frame, 0, y0), 0.1), m)
  b.add(WHITE, metricBox(w + 2 * frame + 0.15, 0.1, 0.2), M(m, mat(0, y0 - frame - 0.02, 0.08)))
}

/** Louvred slit window (belfry). */
function louvre(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.03)))
  for (let y = y0 + 0.12; y < y0 + h - w / 2; y += 0.14) b.add(SOFFIT, metricBox(w, 0.04, 0.05), M(m, mat(0, y, 0.05, 0, 0.5)))
}

/** White diamond (zigzag) band on a face of width w at height y (grey ground). */
function diamondBand(b: Builder, m: THREE.Matrix4, w: number, y: number) {
  b.add(WHITE, metricBox(w, 0.12, 0.08), M(m, mat(0, y - 0.04, 0.04)))
  b.add(WHITE, metricBox(w, 0.12, 0.08), M(m, mat(0, y + 0.72, 0.04)))
  const n = Math.max(2, Math.round(w / 0.6))
  const s = w / n
  for (let i = 0; i < n; i++) b.add(WHITE, metricBox(s * 0.5, s * 0.5, 0.04), M(m, mat(-w / 2 + s * (i + 0.5), y + 0.34, 0.03, 0, 0, Math.PI / 4)))
}

/** Square tower eave: timber soffit + copper skirt up to an octagon of radius rTop. */
function squareEave(b: Builder, cx: number, cz: number, hw: number, ov: number, y: number, rTop: number, yTop: number) {
  const e = hw + ov
  b.block(SOFFIT, 2 * e, 0.22, 2 * e, cx, y - 0.22, cz)
  b.block(CU, 2 * e + 0.04, 0.06, 2 * e + 0.04, cx, y, cz)
  const c0 = [V(cx - e, y + 0.04, cz - e), V(cx + e, y + 0.04, cz - e), V(cx + e, y + 0.04, cz + e), V(cx - e, y + 0.04, cz + e)]
  const r = rTop * Math.cos(Math.PI / 8)
  const c1 = [V(cx - r, yTop, cz - r), V(cx + r, yTop, cz - r), V(cx + r, yTop, cz + r), V(cx - r, yTop, cz + r)]
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    facet(b, CU, [c0[i], c0[j], c1[j], c1[i]], { seams: SEAM, thickness: 0.08 })
    b.beam(CU, c0[i].clone().add(V(0, 0.03, 0)), c1[i].clone().add(V(0, 0.03, 0)), 0.1, 0.07)
  }
  b.block(CU, 2 * r, 0.04, 2 * r, cx, yTop - 0.03, cz)
}

/** Octagonal drum with niches, pilasters, louvres on selected faces and a scalloped cornice. */
function octDrum(b: Builder, cx: number, cz: number, r: number, y0: number, y1: number, louvres: number) {
  const ph = Math.PI / 8
  helm(b, WALL, { x: cx, z: cz, n: 8, stations: [[r, y0], [r, y1]], phase: ph, flat: true })
  const ap = r * Math.cos(Math.PI / 8)
  const fw = 2 * r * Math.sin(Math.PI / 8)
  const h = y1 - y0
  for (let k = 0; k < 8; k++) {
    const a = ph + (k / 8) * Math.PI * 2 // corner angle
    // pilaster at the corner
    b.add(WHITE, metricBox(0.16, h * 0.62, 0.16), mat(cx + Math.cos(a) * (r + 0.02), y0 + h * 0.31, cz + Math.sin(a) * (r + 0.02), Math.PI / 2 - a))
    const af = a + Math.PI / 8 // face centre
    const m = mat(cx + Math.cos(af) * ap, 0, cz + Math.sin(af) * ap, Math.PI / 2 - af)
    // arched niche (white archivolt) and scalloped cornice arc
    b.add(WHITE, extrude(frameShape('round', fw * 0.7, h * 0.72, 0.07, 0, y0 + 0.05), 0.06), m)
    b.add(WHITE, new THREE.TorusGeometry(fw * 0.45, 0.05, 4, 10, Math.PI), M(m, mat(0, y0 + h * 0.6, 0.05)))
    // louvres: every (8 / louvres)-th face, starting with the face towards −X
    const idx = (k + 8 - 3) % 8 // k = 3 faces −X (front)
    if (louvres > 0 && idx % Math.round(8 / louvres) === 0) louvre(b, m, fw * 0.28, h * 0.5, y0 + 0.2)
  }
  helm(b, WHITE, { x: cx, z: cz, n: 8, stations: [[r + 0.1, y1 - 0.18], [r + 0.1, y1]], phase: ph, flat: true })
}

/** Wide octagonal eave: timber soffit + copper skirt from R up to rTop. */
function octEave(b: Builder, cx: number, cz: number, R: number, y: number, rTop: number, yTop: number) {
  const ph = Math.PI / 8
  helm(b, SOFFIT, { x: cx, z: cz, n: 8, stations: [[R, y - 0.2], [R, y]], phase: ph, flat: true })
  const o = (rr: number, yy: number) => {
    const out: THREE.Vector3[] = []
    for (let k = 0; k < 8; k++) {
      const a = ph + (k / 8) * Math.PI * 2
      out.push(V(cx + Math.cos(a) * rr, yy, cz + Math.sin(a) * rr))
    }
    return out
  }
  const lo = o(R + 0.02, y)
  const hi = o(rTop, yTop)
  for (let k = 0; k < 8; k++) {
    const j = (k + 1) % 8
    facet(b, CU, [lo[k], lo[j], hi[j], hi[k]], { seams: SEAM, thickness: 0.06 })
    b.beam(CU, lo[k].clone().add(V(0, 0.03, 0)), hi[k].clone().add(V(0, 0.03, 0)), 0.09, 0.06)
  }
}

/** Ribbed octagonal dome / onion (helm stations) with seams per face. */
function ribbedHelm(b: Builder, cx: number, cz: number, st: [number, number][], per: number) {
  const ph = Math.PI / 8
  helm(b, CU, { x: cx, z: cz, n: 8, stations: st, phase: ph })
  for (let k = 0; k < 8; k++) {
    const a0 = ph + (k / 8) * Math.PI * 2
    const a1 = ph + ((k + 1) / 8) * Math.PI * 2
    for (let f = 0; f < per; f++) {
      const t = f / per
      for (let i = 0; i < st.length - 1; i++) {
        const pt = (rr: number, yy: number) => {
          const p = V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr).lerp(V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr), t)
          const n = p.clone().normalize().multiplyScalar(0.025)
          return V(cx + p.x + n.x, yy, cz + p.z + n.z)
        }
        if (st[i][0] < 0.05 && st[i + 1][0] < 0.05) continue
        b.beam(CU, pt(st[i][0], st[i][1]), pt(st[i + 1][0], st[i + 1][1]), f === 0 ? 0.07 : 0.045, 0.045)
      }
    }
  }
}

/** Spike, ball and cross on top of a helm. */
function finial(b: Builder, cx: number, cz: number, y: number, h: number, s: number) {
  b.add(CU, new THREE.ConeGeometry(0.2, h, 8), mat(cx, y + h / 2, cz))
  b.add('gilt', new THREE.SphereGeometry(0.16, 12, 8), mat(cx, y + h + 0.05, cz))
  cross(b, 'iron', cx, y + h + 0.1, cz, s, false, Math.PI / 2)
}

/** Square tower shaft with corner strips. */
function shaft(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number) {
  b.block(WALL, x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2)
  b.block('stoneGrey', x1 - x0 + 0.12, 0.6, z1 - z0 + 0.12, (x0 + x1) / 2, 0, (z0 + z1) / 2)
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()

  /* ---------------- body (from the OSM outline) ---------------- */
  // outline of nave + naos + lateral apses + altar apse (CCW seen from above)
  const lat = (s: number) => [
    [XNA, s * NHW],
    [3.0, s * 9.3],
    [7.5, s * 9.3],
    [11.0, s * QHW],
  ]
  const apsePts: [number, number][] = []
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4
    apsePts.push([XAL + Math.cos(a) * ADEP, Math.sin(a) * AHW])
  }
  // walls: nave & naos core at EAVE, lateral and altar apses lower
  b.block(WALL, XNA - XB + 0.2, EAVE, 2 * NHW, (XB + XNA) / 2, 0, 0)
  // naos core starts where the lateral-apse diagonals reach the naos width
  b.block(WALL, XAL - 0.15, EAVE, 2 * QHW, (0.15 + XAL) / 2, 0, 0)
  b.block(WALL, 1.1, EAVE, 2 * NHW, XNA + 0.5, 0, 0)
  for (const s of [-1, 1]) {
    const pts = lat(s) as [number, number][]
    const o: [number, number][] = s > 0 ? [[XNA, 0], ...pts, [11.0, 0]] : [[11.0, 0], ...pts.slice().reverse(), [XNA, 0]]
    prismOutline(b, WALL, o, 0, LAT_H)
  }
  prismOutline(b, WALL, [[XAL - 0.05, -AHW], ...apsePts, [XAL - 0.05, AHW]] as [number, number][], 0, ALT_H)
  // socle
  b.block('stoneGrey', XAL - XB + 0.12, 0.6, 2 * QHW + 0.12, (XB + XAL) / 2, 0, 0)

  /* ---------------- body roofs (copper) ---------------- */
  {
    const ey = EAVE - OV * T
    const gable = (x0: number, x1: number, hw: number, closeEast: boolean) => {
      const hz = hw + OV
      const r = EAVE + hw * T
      facet(b, CU, [V(x0, ey, hz), V(x1, ey, hz), V(x1, r, 0), V(x0, r, 0)], { seams: SEAM, thickness: 0.12 })
      facet(b, CU, [V(x1, ey, -hz), V(x0, ey, -hz), V(x0, r, 0), V(x1, r, 0)], { seams: SEAM, thickness: 0.12 })
      b.beam(CU, V(x0, r + 0.05, 0), V(x1, r + 0.05, 0), 0.22, 0.12)
      for (const sz of [-1, 1]) b.beam(CU, V(x0, ey - 0.07, sz * (hz + 0.05)), V(x1, ey - 0.07, sz * (hz + 0.05)), 0.14, 0.13)
      // gable wall(s)
      const tri = new THREE.Shape([new THREE.Vector2(-hw, EAVE - 0.02), new THREE.Vector2(hw, EAVE - 0.02), new THREE.Vector2(0, r - 0.06)])
      b.add(WALL, extrude(tri, 0.35), mat(x0 + (closeEast ? 0.35 : 0.35), 0, 0, -Math.PI / 2))
      if (closeEast) b.add(WALL, extrude(tri, 0.35), mat(x1 - OV - 0.35, 0, 0, Math.PI / 2))
      return r
    }
    gable(XF + 2 * CHW - 0.4, XNA + 0.3, NHW, false)
    gable(XNA, XAL + OV, QHW, true)
    // lateral apses: polygonal lean-to roofs against the naos walls
    for (const s of [-1, 1]) {
      const pts = lat(s)
      const lY = LAT_H - OV * 0.75
      const ring = pts.map(([x, z], i) => {
        const dx = i === 0 ? -0.2 : i === 3 ? 0.3 : 0
        return V(x + dx, lY, z + s * (i === 1 || i === 2 ? OV : 0.25))
      })
      const apexY = EAVE - 0.35
      const ax0 = V(XNA + 1.2, apexY, s * QHW)
      const ax1 = V(11.0 - 1.4, apexY, s * QHW)
      facet(b, CU, [ring[0], ring[1], ax0], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [ring[1], ring[2], ax1, ax0], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [ring[2], ring[3], ax1], { seams: SEAM, thickness: 0.1 })
      for (const [p, q] of [
        [ring[1], ax0],
        [ring[2], ax1],
      ]) b.beam(CU, p.clone().add(V(0, 0.04, 0)), q.clone().add(V(0, 0.04, 0)), 0.15, 0.09)
      b.beam(CU, ax0, ax1, 0.2, 0.1)
      for (let i = 0; i < 3; i++) b.beam(CU, ring[i].clone().add(V(0, -0.06, 0)), ring[i + 1].clone().add(V(0, -0.06, 0)), 0.13, 0.12)
    }
    // altar apse: polygonal half-pyramid
    {
      const apex = V(XAL, ALT_H + 2.5, 0)
      const ring: THREE.Vector3[] = []
      for (let i = 0; i <= 4; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 4
        ring.push(V(XAL + Math.cos(a) * (ADEP + OV), ALT_H - OV * 0.6, Math.sin(a) * (AHW + OV)))
      }
      for (let i = 0; i < 4; i++) {
        facet(b, CU, [ring[i], ring[i + 1], apex], { seams: SEAM, thickness: 0.1 })
        b.beam(CU, ring[i + 1].clone().add(V(0, 0.04, 0)), apex.clone().add(V(0, 0.04, 0)), 0.14, 0.09)
        b.beam(CU, ring[i].clone().add(V(0, -0.06, 0)), ring[i + 1].clone().add(V(0, -0.06, 0)), 0.13, 0.12)
      }
    }
    // downpipes
    for (const [x, z] of [
      [XB + 0.4, NHW + 0.12],
      [XB + 0.4, -NHW - 0.12],
      [XNA - 0.3, NHW + 0.12],
      [XNA - 0.3, -NHW - 0.12],
      [XAL - 0.3, QHW + 0.12],
      [XAL - 0.3, -QHW - 0.12],
    ]) b.rod(CU, V(x, 0.3, z), V(x, EAVE - OV * T - 0.07, z), 0.05, 8)
  }

  /* ---------------- body windows (inferred) ---------------- */
  for (const s of [-1, 1]) {
    const ry = s > 0 ? RY.pz : RY.nz
    for (const x of [-8.2, -4.4]) win(b, FR(x, s * NHW, ry), 'round', 1.0, 3.0, 2.9)
    win(b, FR(5.25, s * 9.3, ry), 'round', 1.0, 2.6, 2.4)
    win(b, FR(13.6, s * QHW, ry), 'round', 0.9, 2.6, 2.9)
  }
  win(b, FR(XAL + ADEP, 0, RY.back), 'round', 0.8, 2.2, 2.9)

  /* ---------------- tower front ---------------- */
  // central tower; behind it the nave continues to the tower's back face
  b.block(WALL, XB - XF - 2 * CHW + 0.4, EAVE, 2 * CHW + 0.2, (XF + 2 * CHW + XB) / 2, 0, 0)
  shaft(b, XF, XF + 2 * CHW, -CHW, CHW, CEN_TOP)
  // linking walls and side towers
  for (const s of [-1, 1]) {
    shaft(b, XT, XB + 0.3, s > 0 ? CHW - 0.05 : -(CHW + 1.6), s > 0 ? CHW + 1.6 : -CHW + 0.05, LINK_TOP)
    shaft(b, XT, XT + STW, s * SZ - STW / 2, s * SZ + STW / 2, SIDE_TOP)
  }
  // linking-wall cornices
  for (const s of [-1, 1]) {
    b.block(SOFFIT, XB - XT + 0.5, 0.2, 1.6 + 0.3, (XT + XB) / 2, LINK_TOP - 0.2, s * (CHW + 0.8))
    b.block(CU, XB - XT + 0.55, 0.06, 1.6 + 0.35, (XT + XB) / 2, LINK_TOP, s * (CHW + 0.8))
  }

  /* ---- central tower façade ---- */
  {
    const m = FR(XF, 0, RY.front)
    // entrance with a small canopy
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.9, 2.8, 0, 0.6, 12))), M(m, mat(0, 0, 0.03)))
    b.add(WHITE, extrude(frameShape('round', 1.9, 2.8, 0.25, 0, 0.6), 0.12), m)
    b.add(SOFFIT, metricBox(3.2, 0.18, 1.0), M(m, mat(0, 3.85, 0.5)))
    b.add(CU, metricBox(3.3, 0.06, 1.1), M(m, mat(0, 3.97, 0.52)))
    // rose window in a large white arch
    b.add(WHITE, extrude(frameShape('round', 2.9, 3.9, 0.25, 0, 5.8), 0.1), m)
    b.add(WHITE, new THREE.TorusGeometry(0.98, 0.14, 8, 32), M(m, mat(0, 8.1, 0.1)))
    b.add('glassC', new THREE.CircleGeometry(0.9, 32), M(m, mat(0, 8.1, 0.04)))
    for (let k = 0; k < 4; k++) b.add(WHITE, metricBox(1.8, 0.06, 0.05), M(m, mat(0, 8.1, 0.07, 0, 0, (k * Math.PI) / 4)))
    // white string course and corner strips of the shaft
    b.add(WHITE, metricBox(2 * CHW + 0.2, 0.25, 0.12), M(m, mat(0, 10.5, 0.06)))
    for (const u of [-CHW + 0.15, CHW - 0.15]) b.add(WHITE, metricBox(0.3, CEN_TOP - LINK_TOP - 0.4, 0.08), M(m, mat(u, (LINK_TOP + CEN_TOP - 0.4) / 2, 0.04)))
    // tall round-arched window
    win(b, m, 'round', 1.0, 2.9, 12.4, 0.26)
    // side faces of the central tower (upper part)
    for (const s of [-1, 1]) {
      const ms = FR(XF + CHW, s * CHW, s > 0 ? RY.pz : RY.nz)
      win(b, ms, 'round', 0.9, 2.6, 12.6, 0.24)
    }
    win(b, FR(XF + 2 * CHW, 0, RY.back), 'round', 0.9, 2.6, 12.6, 0.24)
    // eave, drum, eave, dome
    const cx = XF + CHW
    squareEave(b, cx, 0, CHW, 0.4, CEN_TOP, 2.05, CEN_TOP + 0.55)
    octDrum(b, cx, 0, 2.05, CEN_TOP + 0.5, 19.0, 8)
    octEave(b, cx, 0, 2.65, 19.15, 1.4, 19.95)
    ribbedHelm(
      b,
      cx,
      0,
      [
        [1.36, 19.9],
        [1.38, 20.25],
        [1.28, 20.6],
        [1.02, 20.95],
        [0.62, 21.22],
        [0.3, 21.4],
        [0.14, 21.55],
      ],
      3,
    )
    finial(b, cx, 0, 21.5, 0.75, 0.75)
  }

  /* ---- side towers and linking walls ---- */
  for (const s of [-1, 1]) {
    const cz = s * SZ
    const cx = XT + STW / 2
    const mf = FR(XT, cz, RY.front)
    // triple slit window (three stacked round-headed lights in one white frame)
    b.add(WHITE, extrude(frameShape('round', 0.75, 4.4, 0.18, 0, 2.9), 0.1), mf)
    for (const [y, h] of [
      [2.95, 1.1],
      [4.4, 1.25],
      [6.0, 1.25],
    ]) b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.42, h, 0, y, 10))), M(mf, mat(0, 0, 0.04)))
    b.add(WALL, metricBox(0.75, 4.4, 0.02), M(mf, mat(0, 2.9 + 2.2, 0.01)))
    diamondBand(b, mf, STW, 8.2)
    win(b, mf, 'round', 0.5, 1.3, 10.5, 0.18)
    // outer side face
    const ms = FR(cx, s * (SZ + STW / 2), s > 0 ? RY.pz : RY.nz)
    diamondBand(b, ms, STW, 8.2)
    win(b, ms, 'round', 0.5, 1.3, 10.5, 0.18)
    win(b, ms, 'round', 0.5, 1.6, 4.0, 0.16)
    // corner strips (upper stage)
    for (const u of [-STW / 2 + 0.12, STW / 2 - 0.12]) b.add(WHITE, metricBox(0.24, SIDE_TOP - 9.2, 0.06), M(mf, mat(u, (9.2 + SIDE_TOP) / 2 - 0.2, 0.03)))
    // linking wall: diamond band + arched window
    const ml = FR(XT, s * (CHW + 0.8), RY.front)
    diamondBand(b, ml, 1.6, 8.2)
    b.add(WHITE, extrude(frameShape('round', 0.9, 1.2, 0.14, 0, 9.6), 0.08), ml)
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 1.2, 0, 9.6, 10))), M(ml, mat(0, 0, 0.03)))
    // helm
    squareEave(b, cx, cz, STW / 2, 0.3, SIDE_TOP, 1.45, SIDE_TOP + 0.55)
    octDrum(b, cx, cz, 1.45, SIDE_TOP + 0.5, 15.1, 4)
    octEave(b, cx, cz, 1.95, 15.25, 0.98, 16.1)
    ribbedHelm(
      b,
      cx,
      cz,
      [
        [0.95, 16.05],
        [1.05, 16.4],
        [1.04, 16.75],
        [0.85, 17.1],
        [0.5, 17.45],
        [0.24, 17.75],
        [0.2, 17.85],
      ],
      2,
    )
    finial(b, cx, cz, 17.8, 1.1, 0.85)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [XF + CHW, 20.6, 0],
  materials: () => ({
    strRender: new THREE.MeshStandardMaterial({ color: '#c5c0b6', roughness: 0.9 }),
    strWhite: new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.85 }),
    strSoffit: new THREE.MeshStandardMaterial({ color: '#6b4a34', roughness: 0.75 }),
  }),
  notes:
    'Three-tower front (photographed) with octagonal drums and copper onion/ribbed domes; the body behind is reconstructed from the OSM outline only. Copper per COLOR METAL records (2009 photos predate it).',
}
export default model
