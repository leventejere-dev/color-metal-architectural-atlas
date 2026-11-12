/**
 * Roman Catholic church of St Michael, Foieni / Mezőfény (Satu Mare), 1780–85 —
 * late-Baroque single-nave hall church with an engaged front tower.
 *
 * Modelling specification (real metres; origin = OSM outline centre at ground):
 *  - Axis: OSM way 381785929 (36.6 × 14.6 m) runs at 101.9°/281.9°. The outline has
 *    a broad, flattened round end at the WNW and a 4.9 m tower stub at the ESE, so the
 *    sanctuary lies to the west (unusual orientation). +X = 281.9° towards the
 *    sanctuary; the tower front faces −X (front = [−1, 0]); +Z = 11.9° (NNE).
 *  - Plan after the outline: nave 23.1 × 14.7 m; sanctuary 0.75 m narrower each side
 *    (13.2 m), 6 m straight plus a flattened polygonal end of four facets (outline
 *    nodes used directly); tower 4.9 m square projecting 2.7 m from the front.
 *  - Heights scaled from photos 01–03 (tower width ≈ 4.6–4.9 m as the module):
 *    red-brown socle 0.9 m, main cornice ≈ 10 m (wraps around the tower), tower
 *    stage 2 to 14.5 m (it meets the gable rake there, photo 02), belfry with arched
 *    louvred openings and clock faces under raised "eyebrow" cornices to ≈ 21.6 m,
 *    copper bulb (≈ 4 m wide, 3.6 m tall), octagonal lantern (2 m), small onion cap,
 *    ball and cross at ≈ 32 m — about three times the eave height.
 *  - Front: tower with white corner pilasters, door with a small canopy, inscription
 *    cartouche and arched window; façade wings with white corner pilasters and a
 *    Baroque gable (volute shoulders, recessed triangular panels) whose rakes follow
 *    the roof and die into the tower; metal-capped gable copings (photo 01).
 *  - Roof: gable roof ≈ 42° over the nave, slightly lower over the sanctuary with a
 *    hipped polygonal end; standing seams 0.55 m; gutters, downpipes.
 *  - METAL (as photographed, Aug 2023): the nave roof is brown standing-seam sheet and
 *    the tower bulb, lantern and cap are dark brown — consistent with the copper
 *    supplied by COLOR METAL according to its records (2020–2021). The roof is shown
 *    in a weathered copper tone, the helm in darker oxidised copper.
 * Approximations: the side and sanctuary elevations are not photographed (window
 * count/positions, pilaster rhythm and the sanctuary roof form are interpreted);
 * Baroque ornament (window ears, cartouche, volutes) simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, lathe, loft, polyRing, window_, door, seams, faceFrame, frameShape, opening, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* materials */
const WALL = 'foiWall'
const TRIM = 'foiTrim'
const SOCLE = 'foiSocle'
const ROOF = 'foiCu' // nave roof: weathered brown copper (lighter, as photographed)
const HELM = 'foiHelm' // tower helm: darker oxidised copper
const FRAME = 'foiFrame'
const SEAM = seams(ROOF, 0.55, 0.05, 0.045)

/* plan (OSM outline in the model frame) */
const XF = -15.6 // front (façade) wall
const XS = 7.46 // nave / sanctuary junction
const XA = 13.5 // start of the apse curve
const HWN = 7.33 // nave half width
const HWS = 6.6 // sanctuary half width
const APSE: [number, number][] = [
  [XA, HWS],
  [16.9, 4.2],
  [18.27, 0],
  [16.9, -4.2],
  [XA, -HWS],
]
const TW = { x0: -18.27, x1: -13.37, hw: 2.45 }
const TX = (TW.x0 + TW.x1) / 2

/* heights */
const PL = 0.9
const COR = 10.0 // top of the main cornice
const PITCH = 42
const T = Math.tan(PITCH * D2R)
const OV = 0.5

function archWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, louvre = false) {
  window_(b, face, plane, u, y0, { type: 'round', w: w + 0.12, h: h + 0.06, frame: 0.26, frameKey: TRIM, glassKey: louvre ? 'black' : 'glassC', inset: 0.04, sill: true })
  if (louvre) {
    const m = faceFrame(face, plane, u, 0, 0)
    for (let i = 0; i < 6; i++) b.add(FRAME, metricBox(w, 0.07, 0.12), M(m, mat(0, y0 + 0.35 + i * 0.32, 0.08, 0, 0.5)))
  } else {
    window_(b, face, plane, u, y0 + 0.03, { type: 'round', w, h, frame: 0.06, frameKey: FRAME, glassKey: 'glassC', inset: 0.05, bars: [2, 4] })
  }
  // keystone
  const m = faceFrame(face, plane, u, 0, 0)
  b.add(TRIM, metricBox(0.32, 0.42, 0.16), M(m, mat(0, y0 + h + 0.2, 0.08)))
}

function rectWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number) {
  window_(b, face, plane, u, y0, { type: 'rect', w: w + 0.1, h: h + 0.1, frame: 0.22, frameKey: TRIM, glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0 + 0.05, { type: 'rect', w, h, frame: 0.05, frameKey: FRAME, glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
}

/** Moulded cornice band along a straight wall segment (a→b, outward normal n). */
function corniceRun(b: Builder, a: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3, y: number) {
  const ax = a.clone().setY(y)
  const cx = c.clone().setY(y)
  const off = (d: number, dy: number) => [ax.clone().add(n.clone().multiplyScalar(d)).setY(y + dy), cx.clone().add(n.clone().multiplyScalar(d)).setY(y + dy)]
  const [p1, q1] = off(0.1, -0.55)
  b.beam(TRIM, p1, q1, 0.3, 0.22)
  const [p2, q2] = off(0.25, -0.3)
  b.beam(TRIM, p2, q2, 0.55, 0.2)
  const [p3, q3] = off(0.4, -0.1)
  b.beam(TRIM, p3, q3, 0.85, 0.2)
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  // nave
  b.block(WALL, XS - XF, COR, 2 * HWN, (XF + XS) / 2, 0, 0)
  b.block(SOCLE, XS - XF + 0.14, PL, 2 * HWN + 0.14, (XF + XS) / 2, 0, 0)
  // sanctuary (straight part + flattened polygonal end) as one prism
  const ring = (y: number, grow = 0) => {
    const pts = [V(XS - 0.2, y, -HWS - grow), ...APSE.slice().reverse().map(([x, z]) => V(x + (x > XA + 0.1 ? grow * 0.8 : 0) + (x === 18.27 ? grow * 0.2 : 0), y, z + Math.sign(z) * grow)), V(XS - 0.2, y, HWS + grow)]
    return pts
  }
  b.add(WALL, loft([ring(0), ring(COR)], { capTop: true, flat: true }))
  b.add(SOCLE, loft([ring(0, 0.07), ring(PL, 0.07)], { capTop: true, flat: true }))

  // main cornice around nave + sanctuary
  corniceRun(b, V(XF, 0, HWN), V(XS, 0, HWN), V(0, 0, 1), COR)
  corniceRun(b, V(XS, 0, -HWN), V(XF, 0, -HWN), V(0, 0, -1), COR)
  corniceRun(b, V(XS, 0, HWN), V(XS, 0, HWS), V(1, 0, 0), COR)
  corniceRun(b, V(XS, 0, -HWS), V(XS, 0, -HWN), V(1, 0, 0), COR)
  {
    // go around the sanctuary from +z side through the apse to −z side
    const path: [number, number][] = [[XS, HWS], [XA, HWS], [16.9, 4.2], [18.27, 0], [16.9, -4.2], [XA, -HWS], [XS, -HWS]]
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i]
      const [x1, z1] = path[i + 1]
      const d = V(x1 - x0, 0, z1 - z0).normalize()
      const n = V(-d.z, 0, d.x)
      corniceRun(b, V(x0, 0, z0), V(x1, 0, z1), n, COR)
    }
  }
  // front cornice (both façade wings, under the gable)
  corniceRun(b, V(XF, 0, -HWN), V(XF, 0, -TW.hw), V(-1, 0, 0), COR)
  corniceRun(b, V(XF, 0, TW.hw), V(XF, 0, HWN), V(-1, 0, 0), COR)

  // pilasters: front corners (broad, white), side bays, sanctuary corners
  const pil = (x: number, z: number, w: number, d: number, h = COR - 0.6) => b.block(TRIM, w, h - PL, d, x, PL, z)
  for (const s of [-1, 1]) {
    pil(XF + 0.55, s * (HWN + 0.06), 1.1, 0.14) // side face of the front corner
    pil(XF - 0.06, s * (HWN - 0.6), 0.14, 1.2) // front face of the corner
    pil(XF - 0.06, s * (TW.hw + 0.35), 0.14, 0.7) // façade next to the tower
    for (const x of [-11.2, -4.6, 2.0]) pil(x, s * (HWN + 0.05), 0.8, 0.12)
    pil(XS - 0.4, s * (HWN + 0.05), 0.8, 0.12)
    pil(XA - 0.2, s * (HWS + 0.05), 0.8, 0.12)
  }
  // plinth cap moulding
  b.block(TRIM, XS - XF + 0.22, 0.12, 2 * HWN + 0.22, (XF + XS) / 2, PL, 0)

  /* ================= side & sanctuary windows ================= */
  for (const [face, plane] of [['+z', HWN], ['-z', -HWN]] as [Face, number][]) {
    const sgn = face === '+z' ? 1 : -1
    for (const x of [-7.9, -1.3, 4.9]) archWin(b, face, plane, sgn * x, 4.4, 1.5, 3.6)
    archWin(b, face, plane === HWN ? HWS : -HWS, sgn * 10.6, 4.4, 1.4, 3.4)
  }
  // near the front: small barred window above a side door (south side, photo 01); window only on the north
  rectWin(b, '-z', -HWN, 13.4, 5.6, 0.95, 1.3)
  rectWin(b, '+z', HWN, -13.4, 5.6, 0.95, 1.3)
  door(b, '-z', -HWN, 13.4, { w: 1.3, h: 2.5, y0: 0.15, leafKey: FRAME, frameKey: TRIM, frame: 0.2 })
  {
    // little canopy over the side door
    const m = faceFrame('-z', -HWN, 13.4, 0, 0)
    b.add('foiTin', metricBox(2.0, 0.06, 1.0), M(m, mat(0, 2.95, 0.5, 0, -0.25)))
  }
  // apse facets: one arched window on the axis facets
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = APSE[i]
    const [x1, z1] = APSE[i + 1]
    if (i === 0 || i === 3) continue
    const c = V((x0 + x1) / 2, 0, (z0 + z1) / 2)
    const ry = Math.atan2(-(z1 - z0), x1 - x0)
    const m = mat(c.x, 0, c.z, ry)
    b.add(TRIM, extrude(frameShape('round', 1.3, 3.2, 0.26, 0, 4.5), 0.1), M(m, mat(0, 0, 0.0)))
    b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 3.2, 0, 4.5))), M(m, mat(0, 0, 0.04)))
  }

  /* ================= front façade gable ================= */
  {
    const yb = COR - 0.05
    const yt = (z: number) => COR + 0.25 + (HWN - z) * T // rake follows the roof
    const s = new THREE.Shape()
    s.moveTo(-HWN - 0.2, yb)
    // volute shoulder (S-curve)
    s.lineTo(-HWN - 0.2, yb + 0.55)
    s.quadraticCurveTo(-HWN + 0.1, yb + 0.6, -HWN + 0.35, yb + 1.0)
    s.quadraticCurveTo(-HWN + 0.5, yb + 1.45, -HWN + 1.05, yt(HWN - 1.05) + 0.1)
    s.lineTo(-TW.hw, yt(TW.hw) + 0.1)
    s.lineTo(TW.hw, yt(TW.hw) + 0.1)
    s.lineTo(HWN - 1.05, yt(HWN - 1.05) + 0.1)
    s.quadraticCurveTo(HWN - 0.5, yb + 1.45, HWN - 0.35, yb + 1.0)
    s.quadraticCurveTo(HWN - 0.1, yb + 0.6, HWN + 0.2, yb + 0.55)
    s.lineTo(HWN + 0.2, yb)
    s.lineTo(-HWN - 0.2, yb)
    // gable wall in the YZ plane at the façade, 0.6 m thick
    b.add(WALL, extrude(s, 0.6, 10), mat(XF, 0, 0, Math.PI / 2))
    // copper coping along the rakes and the volutes
    for (const sz of [-1, 1]) {
      const a = V(XF + 0.3, yt(HWN - 1.05) + 0.16, sz * (HWN - 1.05))
      const c = V(XF + 0.3, yt(TW.hw) + 0.16, sz * TW.hw)
      b.beam(ROOF, a, c, 0.85, 0.1, V(0, 1, 0))
      b.beam(ROOF, V(XF + 0.3, yb + 0.62, sz * (HWN + 0.2)), V(XF + 0.3, yb + 1.05, sz * (HWN - 0.35)), 0.8, 0.08, V(0, 1, 0))
      b.beam(ROOF, V(XF + 0.3, yb + 1.05, sz * (HWN - 0.35)), a, 0.8, 0.08, V(0, 1, 0))
      // recessed triangular panel with white frame on each wing
      const zc = sz * (TW.hw + (HWN - TW.hw) * 0.42)
      const tri = new THREE.Shape([new THREE.Vector2(-1.5, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(sz > 0 ? -1.5 : 1.5, 1.5 * T + 0.2)])
      b.add(TRIM, extrude(tri, 0.12), mat(XF - 0.08, COR + 0.55, zc, -Math.PI / 2))
      const tri2 = new THREE.Shape([new THREE.Vector2(-1.2, 0.18), new THREE.Vector2(1.2, 0.18), new THREE.Vector2(sz > 0 ? -1.2 : 1.2, 1.3 * T + 0.1)])
      b.add(WALL, extrude(tri2, 0.05), mat(XF - 0.13, COR + 0.55, zc, -Math.PI / 2))
      // façade-wing window (narrow, photo 01)
      rectWin(b, '-x', XF, -sz * 4.9, 5.0, 0.7, 1.6)
    }
  }

  /* ================= roofs ================= */
  {
    const eY = COR + 0.12 - OV * T
    const hwN = HWN + OV
    const rN = COR + 0.12 + HWN * T
    const xa = XF + 0.55
    const xb = XS + 0.35
    facet(b, ROOF, [V(xa, eY, hwN), V(xb, eY, hwN), V(xb, rN, 0), V(xa, rN, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [V(xb, eY, -hwN), V(xa, eY, -hwN), V(xa, rN, 0), V(xb, rN, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(ROOF, V(xa, rN + 0.06, 0), V(xb, rN + 0.06, 0), 0.3, 0.16)
    // east (sanctuary-side) gable of the nave roof
    const g = new THREE.Shape([new THREE.Vector2(-HWN, COR - 0.01), new THREE.Vector2(HWN, COR - 0.01), new THREE.Vector2(0, rN - 0.06)])
    b.add(WALL, extrude(g, 0.35), mat(XS + 0.1, 0, 0, Math.PI / 2))
    for (const sz of [-1, 1]) b.beam(ROOF, V(XS + 0.32, eY, sz * hwN), V(XS + 0.32, rN + 0.04, 0), 0.22, 0.14, V(1, 0, 0))

    // sanctuary roof: lower ridge, hipped polygonal end
    const hwS = HWS + OV
    const rS = COR + 0.12 + HWS * T
    const apexX = 18.27 - HWS // same pitch on the end facet
    const x0 = XS + 0.1
    const ov = (x: number, z: number): THREE.Vector3 => {
      // offset the apse polygon outwards by OV (approximate: radial from the apex)
      const d = V(x - apexX, 0, z)
      const k = (d.length() + OV) / d.length()
      return V(apexX + d.x * k, eY, d.z * k)
    }
    const pS = ov(XA, HWS).setZ(hwS)
    const nS = ov(XA, -HWS).setZ(-hwS)
    facet(b, ROOF, [V(x0, eY, hwS), pS, V(apexX, rS, 0), V(x0, rS, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, ROOF, [nS, V(x0, eY, -hwS), V(x0, rS, 0), V(apexX, rS, 0)], { seams: SEAM, thickness: 0.12 })
    const apsePts = [pS, ov(16.9, 4.2), ov(18.27, 0), ov(16.9, -4.2), nS]
    const apex = V(apexX, rS, 0)
    for (let i = 0; i < apsePts.length - 1; i++) {
      facet(b, ROOF, [apsePts[i], apsePts[i + 1], apex], { seams: SEAM, thickness: 0.12 })
      b.beam(ROOF, apsePts[i].clone().setY(eY + 0.05), apex.clone().setY(rS + 0.05), 0.2, 0.12)
    }
    b.beam(ROOF, apsePts[4].clone().setY(eY + 0.05), apex.clone().setY(rS + 0.05), 0.2, 0.12)
    b.beam(ROOF, V(x0, rS + 0.06, 0), V(apexX, rS + 0.06, 0), 0.28, 0.15)

    // gutters
    for (const sz of [-1, 1]) {
      b.beam(ROOF, V(xa, eY - 0.08, sz * (hwN + 0.06)), V(xb, eY - 0.08, sz * (hwN + 0.06)), 0.18, 0.16)
      b.beam(ROOF, V(x0, eY - 0.08, sz * (hwS + 0.06)), sz > 0 ? pS.clone().setY(eY - 0.08) : nS.clone().setY(eY - 0.08), 0.18, 0.16)
    }
    for (let i = 0; i < apsePts.length - 1; i++) b.beam(ROOF, apsePts[i].clone().setY(eY - 0.08), apsePts[i + 1].clone().setY(eY - 0.08), 0.18, 0.16)
    // downpipes
    for (const [x, z] of [[XF + 1.3, HWN + 0.2], [XF + 1.3, -HWN - 0.2], [XS - 0.9, HWN + 0.2], [XS - 0.9, -HWN - 0.2], [16.9, 4.4], [16.9, -4.4]]) b.rod(ROOF, V(x, 0.2, z), V(x, eY - 0.1, z), 0.06, 8)
  }

  /* ================= tower ================= */
  {
    const st1 = { y0: 0, y1: COR, hw: TW.hw }
    const st2 = { y0: COR, y1: 14.7, hw: TW.hw - 0.15 }
    const st3 = { y0: 14.7, y1: 20.9, hw: TW.hw - 0.25 }
    const xc = TX
    for (const s of [st1, st2, st3]) {
      b.block(WALL, 2 * s.hw, s.y1 - s.y0, 2 * s.hw, xc, s.y0, 0)
      // white corner pilasters (both faces of each corner)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          b.block(TRIM, 0.7, s.y1 - s.y0 - 0.3, 0.12, xc + sx * (s.hw - 0.35), s.y0 + (s === st1 ? PL : 0.15), sz * (s.hw + 0.05))
          b.block(TRIM, 0.12, s.y1 - s.y0 - 0.3, 0.7, xc + sx * (s.hw + 0.05), s.y0 + (s === st1 ? PL : 0.15), sz * (s.hw - 0.35))
        }
    }
    b.block(SOCLE, 2 * TW.hw + 0.14, PL, 2 * TW.hw + 0.14, xc, 0, 0)
    // cornices between the stages
    const cor = (y: number, hw: number) => {
      b.block(TRIM, 2 * hw + 0.3, 0.22, 2 * hw + 0.3, xc, y - 0.5, 0)
      b.block(TRIM, 2 * hw + 0.55, 0.2, 2 * hw + 0.55, xc, y - 0.28, 0)
      b.block(TRIM, 2 * hw + 0.85, 0.2, 2 * hw + 0.85, xc, y - 0.1, 0)
    }
    cor(COR + 0.05, TW.hw)
    cor(14.8, st2.hw)
    // faces of the tower: -x (front), ±z (sides); +x only above the nave roof
    const faces: [Face, number, number][] = [
      ['-x', -1, 0],
      ['+z', 0, 1],
      ['-z', 0, -1],
      ['+x', 1, 0],
    ]
    for (const [f, sx, sz] of faces) {
      const plane = (hw: number) => (sx !== 0 ? xc + sx * hw : sz * hw)
      const u0 = f === '-x' ? 0 : f === '+x' ? 0 : sz > 0 ? xc : -xc
      if (f === '-x') {
        door(b, f, plane(TW.hw), 0, { w: 1.6, h: 2.9, y0: 0.15, type: 'segment', leafKey: FRAME, frameKey: TRIM, frame: 0.25 })
        const m = faceFrame(f, plane(TW.hw), 0, 0, 0)
        b.add('foiTin', metricBox(2.6, 0.07, 1.3), M(m, mat(0, 3.45, 0.62, 0, -0.22)))
        for (const su of [-1, 1]) b.add(FRAME, metricBox(0.06, 0.8, 0.06), M(m, mat(su * 1.2, 3.0, 1.15, 0, 0)))
        // inscription cartouche + arched window
        b.add(TRIM, new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20), M(m, mat(0, 4.4, 0.05, 0, Math.PI / 2, 0, 1.25, 1, 0.75)))
        archWin(b, f, plane(TW.hw), 0, 5.6, 0.95, 2.6)
      } else if (f !== '+x') {
        archWin(b, f, plane(TW.hw), u0, 5.4, 0.85, 2.5)
      }
      if (f !== '+x') archWin(b, f, plane(st2.hw), u0, 11.1, 1.0, 2.1)
      // belfry: arched louvred opening + clock under a raised segmental cornice
      archWin(b, f, plane(st3.hw), u0, 15.7, 1.1, 2.5, true)
      const m3 = faceFrame(f, plane(st3.hw), u0, 0, 0)
      b.add('foiClock', new THREE.CylinderGeometry(0.62, 0.62, 0.08, 28), M(m3, mat(0, 19.55, 0.06, 0, Math.PI / 2)))
      b.add(TRIM, new THREE.TorusGeometry(0.66, 0.08, 6, 28), M(m3, mat(0, 19.55, 0.1)))
      b.add('gilt', metricBox(0.05, 0.45, 0.03), M(m3, mat(0.0, 19.7, 0.12, 0, 0, 0.5)))
      b.add('gilt', metricBox(0.04, 0.32, 0.03), M(m3, mat(0.1, 19.5, 0.12, 0, 0, -1.4)))
      // segmental "eyebrow" cornice over the clock (photo 02)
      const arc = new THREE.Shape()
      const R = 1.35
      arc.absarc(0, 0, R + 0.28, Math.PI * 0.12, Math.PI * 0.88, false)
      arc.absarc(0, 0, R, Math.PI * 0.88, Math.PI * 0.12, true)
      b.add(TRIM, extrude(arc, 0.5, 16), M(m3, mat(0, 19.7, -0.15)))
    }
    // top cornice of the belfry
    b.block(TRIM, 2 * st3.hw + 0.3, 0.25, 2 * st3.hw + 0.3, xc, 20.7, 0)
    b.block(TRIM, 2 * st3.hw + 0.6, 0.22, 2 * st3.hw + 0.6, xc, 20.95, 0)

    /* ---------- copper helm: skirt, bulb, lantern, cap, ball & cross ---------- */
    const y0 = 21.17
    // square skirt rising to the octagonal bulb base
    const sq = polyRing(8, 1, y0, Math.PI / 8, xc, 0).map((p) => {
      const dx = p.x - xc
      const k = (st3.hw + 0.35) / Math.max(Math.abs(dx), Math.abs(p.z))
      return V(xc + dx * k, y0, p.z * k)
    })
    b.add(HELM, loft([sq, polyRing(8, 1.92, y0 + 0.6, Math.PI / 8, xc, 0)], { capBottom: true, flat: true }))
    const bulb: [number, number][] = [
      [1.92, 0.6],
      [2.02, 0.85],
      [2.0, 1.25],
      [1.8, 1.7],
      [1.4, 2.2],
      [0.98, 2.6],
      [0.76, 2.88],
      [0.7, 3.1],
    ]
    b.add(HELM, loft(bulb.map(([r, y]) => polyRing(8, r, y0 + y, Math.PI / 8, xc, 0)), { flat: false }))
    // ribs on the bulb (octagon arrises)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      for (let i = 0; i < bulb.length - 1; i++) {
        const [r0, h0] = bulb[i]
        const [r1, h1] = bulb[i + 1]
        b.beam(HELM, V(xc + Math.cos(a) * r0 * 1.0, y0 + h0, Math.sin(a) * r0), V(xc + Math.cos(a) * r1, y0 + h1, Math.sin(a) * r1), 0.07, 0.06, V(Math.cos(a), 0, Math.sin(a)))
      }
    }
    // lantern
    const yl = y0 + 3.1
    b.add(HELM, loft([polyRing(8, 0.95, yl, Math.PI / 8, xc, 0), polyRing(8, 0.95, yl + 1.9, Math.PI / 8, xc, 0)], { capBottom: true, flat: true }))
    b.add(HELM, loft([polyRing(8, 1.12, yl + 1.9, Math.PI / 8, xc, 0), polyRing(8, 1.12, yl + 2.08, Math.PI / 8, xc, 0)], { capBottom: true, capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = ((k + 1) / 8) * Math.PI * 2 // face centres of a polyRing with phase π/8
      const ap = 0.95 * Math.cos(Math.PI / 8)
      const m = mat(xc + Math.cos(a) * ap, 0, Math.sin(a) * ap, Math.PI / 2 - a)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.18, yl + 0.55), new THREE.Vector2(0.18, yl + 0.55), new THREE.Vector2(0.18, yl + 1.35), new THREE.Vector2(0, yl + 1.5), new THREE.Vector2(-0.18, yl + 1.35)])), M(m, mat(0, 0, 0.02)))
    }
    // onion cap
    const yc = yl + 2.08
    const cap: [number, number][] = [
      [1.05, 0],
      [1.12, 0.3],
      [0.95, 0.75],
      [0.6, 1.15],
      [0.3, 1.45],
      [0.12, 1.75],
      [0.05, 1.95],
    ]
    b.add(HELM, lathe(cap.map(([r, y]) => [r, y] as [number, number]), 16), mat(xc, yc, 0))
    // finial: ball, rod, cross
    const yf = yc + 1.95
    b.rod('iron', V(xc, yf - 0.1, 0), V(xc, yf + 2.9, 0), 0.05, 6)
    b.add('gilt', new THREE.SphereGeometry(0.27, 14, 10), mat(xc, yf + 0.55, 0))
    b.add('iron', metricBox(0.08, 1.3, 0.08), mat(xc, yf + 2.35, 0))
    b.add('iron', metricBox(0.08, 0.08, 0.75), mat(xc, yf + 2.6, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 13.5, 4.5],
  materials: (base) => {
    const cu = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    cu.color.setRGB(1.12, 1.28, 1.45) // dull grey-brown as photographed on the nave roof
    cu.roughness = 0.58
    const helm = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    helm.color.setRGB(0.78, 0.85, 0.98) // darker oxidised bulb and lantern
    helm.roughness = 0.55
    return {
      foiCu: cu,
      foiHelm: helm,
      foiWall: new THREE.MeshStandardMaterial({ color: '#e9c983', roughness: 0.9 }),
      foiTrim: new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.85 }),
      foiSocle: new THREE.MeshStandardMaterial({ color: '#9d5741', roughness: 0.9 }),
      foiFrame: new THREE.MeshStandardMaterial({ color: '#4a3426', roughness: 0.65 }),
      foiTin: new THREE.MeshStandardMaterial({ color: '#7c6a5e', metalness: 0.5, roughness: 0.5 }),
      foiClock: new THREE.MeshStandardMaterial({ color: '#1f2226', roughness: 0.5 }),
    }
  },
  notes: 'Late-Baroque hall church with an engaged front tower; brown standing-seam copper roof and dark copper bulb helm as photographed (2023). Side and sanctuary elevations interpreted.',
}
export default model
