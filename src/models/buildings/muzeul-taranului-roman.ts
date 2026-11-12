/**
 * Muzeul Național al Țăranului Român, Bucharest (Șos. Pavel D. Kiseleff 3,
 * OSM relation 2552618) — neo-Romanian brick building with stone dressings, a
 * square tower with a top loggia, corner pavilions with curved (bell) gables
 * and steep tiled hipped roofs with deep timber eaves.
 *
 * Modelling specification (real metres, origin = centre of the OSM outline,
 * +X = OSM long axis 68° (ENE) = towards Șos. Kiseleff: the main façade with
 * the tower is the +X face; +Z = 158° (SSE), −Z = the Str. Monetăriei side):
 *  - Perimeter block after the OSM multipolygon: 93.4 × 78.3 m with the
 *    stepped long sides (2.3 m central projections) and the inner courtyard
 *    (≈ 23 × 47 m) of the OSM inner ring.
 *  - Kiseleff front (73.6 m, photos 02–04): central square tower (8.6 m,
 *    entrance porch with balcony, plain shaft with stone bands, arcaded top
 *    loggia, deep eaves, tent roof to ≈ 38 m), arcaded first-floor loggia wings
 *    (seven arches) with eaves at ≈ 16.5 m, and corner pavilions (eave ≈ 20 m)
 *    with a large two-light arched window on each face and a curved bell
 *    gable over a four-arch loggia on the side faces (photos 01, 03, 04).
 *  - Side and rear wings two storeys over a raised stone socle (eave ≈ 14 m),
 *    paired windows; rows of small arched windows under the eaves.
 *  - Roofs: hips of 30–45°, deep timber eaves (≈ 1.3 m) on brackets, dark
 *    grey tiles as photographed (including the tower roof).
 *  - Copper (Cu-DHP semi-hard according to the records): no copper roof
 *    surface is visible in the photographs — the tower roof is tiled like the
 *    rest — so the copper is shown where semi-hard sheet is typically used:
 *    eave gutters, downpipes, hip and ridge cappings and the tower finial,
 *    weathered brown.
 * Approximations: the rear, the courtyard and most of the side elevations are
 * not photographed (window rhythm assumed); roof pitches, the layout of the
 * roofs behind the front range, tower height (≈ 38 m) and eave depths are
 * estimated from the photographs; brick ornament, tracery and capitals
 * simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, hippedRoof, faceFrame, helm, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

/* plan */
const XF = 46.7 // Kiseleff façade
const XB = -46.7 // rear
const XR = 30.0 // back of the front range / pavilions
const ZP = 22.0 // pavilion inner edge
const ZF = 36.8 // pavilions' outer faces
const ZW = 37.0 // side wings
const ZR = 39.15 // side projections (x −5.5 … 18.75)
const CY = { x0: -19.9, x1: 3.4, z: 23.7 } // courtyard
const TW = { x0: 38.4, x1: 47.0, h: 4.3 } // tower half-width h

/* heights */
const SOCLE = 2.2
const E_WING = 16.5
const E_PAV = 20.0
const E_SIDE = 14.0
const OH = 1.3

const TILE = 'mtTile'
const CU = 'copperBrown'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

function winA(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: OpeningType = 'rect', f = 0.2, bars: [number, number] = [2, 2]) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('mtStone', extrude(frameShape(type, w, h, f, 0, y0), 0.12), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(m, mat(0, 0, 0.025)))
  b.add('mtFrame', extrude(frameShape(type, w - 0.08, h - 0.05, 0.06, 0, y0 + 0.02), 0.05), M(m, mat(0, 0, 0.02)))
  for (let i = 1; i < bars[0]; i++) b.add('mtFrame', metricBox(0.06, h - 0.1, 0.05), M(m, mat(-w / 2 + (i * w) / bars[0], y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < bars[1]; j++) b.add('mtFrame', metricBox(w - 0.08, 0.06, 0.05), M(m, mat(0, y0 + (j * h * 0.7) / bars[1], 0.05)))
  b.add('mtStone', metricBox(w + 2 * f + 0.15, 0.14, 0.24), M(m, mat(0, y0 - f - 0.05, 0.12)))
}

/** Row of small arched windows (brick arcature under the eaves). */
function arcature(b: Builder, face: Face, plane: number, u0: number, u1: number, n: number, y0: number, w = 0.55, h = 1.25) {
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) winA(b, face, plane, u0 + step * (i + 0.5), y0, w, h, 'round', 0.1, [1, 1])
  b.add('mtStone', metricBox(Math.abs(u1 - u0), 0.16, 0.18), M(faceFrame(face, plane, (u0 + u1) / 2, 0, 0), mat(0, y0 - 0.25, 0.09)))
}

/** Wall block on a raised stone socle, with a stone band at the first-floor level. */
function walls(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number) {
  b.add('mtBrick', metricBox(x1 - x0, h, z1 - z0), mat((x0 + x1) / 2, h / 2, (z0 + z1) / 2))
  b.add('mtSocle', metricBox(x1 - x0 + 0.24, SOCLE, z1 - z0 + 0.24), mat((x0 + x1) / 2, SOCLE / 2, (z0 + z1) / 2))
  b.add('mtStone', metricBox(x1 - x0 + 0.3, 0.22, z1 - z0 + 0.3), mat((x0 + x1) / 2, SOCLE + 0.11, (z0 + z1) / 2))
  b.add('mtStone', metricBox(x1 - x0 + 0.16, 0.3, z1 - z0 + 0.16), mat((x0 + x1) / 2, 6.55, (z0 + z1) / 2))
  b.add('mtStone', metricBox(x1 - x0 + 0.12, 0.2, z1 - z0 + 0.12), mat((x0 + x1) / 2, h - 2.9, (z0 + z1) / 2))
}

/** Tiled hipped roof with deep eaves, timber soffit and brackets, copper gutters and hip caps. */
function roof(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, pitch: number, oh = OH, sides: Face[] = ['+x', '-x', '+z', '-z']) {
  const t = Math.tan((pitch * Math.PI) / 180)
  hippedRoof(b, TILE, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y: y + oh * t, pitch, overhang: oh, seams: false, capKey: CU })
  const W = x1 - x0 + 2 * oh
  const D = z1 - z0 + 2 * oh
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  // soffit boards
  b.add('wood', metricBox(W, 0.05, oh), mat(cx, y - 0.04, z0 - oh / 2))
  b.add('wood', metricBox(W, 0.05, oh), mat(cx, y - 0.04, z1 + oh / 2))
  b.add('wood', metricBox(oh, 0.05, D - 2 * oh), mat(x0 - oh / 2, y - 0.04, cz))
  b.add('wood', metricBox(oh, 0.05, D - 2 * oh), mat(x1 + oh / 2, y - 0.04, cz))
  // copper gutters along the eaves
  for (const [a, c] of [
    [V(x0 - oh, y - 0.02, z0 - oh), V(x1 + oh, y - 0.02, z0 - oh)],
    [V(x0 - oh, y - 0.02, z1 + oh), V(x1 + oh, y - 0.02, z1 + oh)],
    [V(x0 - oh, y - 0.02, z0 - oh), V(x0 - oh, y - 0.02, z1 + oh)],
    [V(x1 + oh, y - 0.02, z0 - oh), V(x1 + oh, y - 0.02, z1 + oh)],
  ]) b.beam(CU, a, c, 0.2, 0.2)
  // brackets
  for (const face of sides) {
    const alongX = face.endsWith('z')
    const len = alongX ? x1 - x0 : z1 - z0
    const n = Math.floor(len / 1.1)
    for (let i = 0; i <= n; i++) {
      const s = -len / 2 + (len * i) / n
      if (alongX) b.add('wood', metricBox(0.14, 0.24, oh), mat(cx + s, y - 0.18, face === '+z' ? z1 + oh / 2 : z0 - oh / 2))
      else b.add('wood', metricBox(oh, 0.24, 0.14), mat(face === '+x' ? x1 + oh / 2 : x0 - oh / 2, y - 0.18, cz + s))
    }
  }
}

function downpipe(b: Builder, x: number, z: number, y1: number) {
  b.rod(CU, V(x, 0.3, z), V(x, y1, z), 0.075, 8)
}

function build(): Builder {
  const b = new Builder()

  /* ================= volumes ================= */
  walls(b, XR, XF, -ZP, ZP, E_WING) // front range (loggia wings)
  for (const s of [-1, 1]) {
    walls(b, XR, XF, s > 0 ? ZP : -ZF, s > 0 ? ZF : -ZP, E_PAV) // corner pavilions
    walls(b, -27, XR, s > 0 ? CY.z : -ZW, s > 0 ? ZW : -CY.z, E_SIDE) // side wings
    walls(b, -5.5, 18.75, s > 0 ? ZW - 0.5 : -ZR, s > 0 ? ZR : -(ZW - 0.5), E_SIDE + 1.0) // side projections
  }
  walls(b, XB, CY.x0, -32.3, 32.7, E_SIDE) // rear wing
  walls(b, CY.x1, XR, -CY.z, CY.z, E_SIDE) // inner east range

  /* ================= Kiseleff façade (+X, u = −z) ================= */
  {
    const F: Face = '+x'
    // corner pavilions: two-light arched window, ground-floor pairs, small arcature
    for (const s of [-1, 1]) {
      const uc = -s * (ZP + ZF) / 2
      winA(b, F, XF, uc, 8.6, 3.4, 7.0, 'round', 0.32, [2, 4])
      b.add('mtStone', new THREE.TorusGeometry(0.62, 0.09, 6, 16), M(faceFrame(F, XF, uc, 0, 0), mat(0, 14.5, 0.12)))
      for (const d of [-2.7, 2.7]) for (const e of [-0.6, 0.6]) winA(b, F, XF, uc + d + e, 3.2, 1.0, 2.4, 'rect', 0.16)
      arcature(b, F, XF, uc - 5.5, uc + 5.5, 7, 17.4)
      for (const d of [-3.5, 3.5]) winA(b, F, XF, uc + d, 9.4, 0.6, 1.6, 'round', 0.12, [1, 1])
    }
    // loggia wings: seven arches on columns over a balustrade
    for (const s of [-1, 1]) {
      const z0 = TW.h
      const z1 = ZP
      const n = 7
      const step = (z1 - z0) / n
      for (let i = 0; i < n; i++) {
        const z = s * (z0 + step * (i + 0.5))
        const m = faceFrame(F, XF, -z, 0, 0)
        b.add('mtStone', extrude(frameShape('round', 1.95, 3.9, 0.18, 0, 7.6), 0.14), m)
        b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.95, 3.9, 0, 7.6, 10))), M(m, mat(0, 0, 0.02)))
        winA(b, F, XF, -z, 3.2, 1.05, 2.4, 'rect', 0.16)
        winA(b, F, XF, -z, 13.9, 0.55, 1.3, 'round', 0.1, [1, 1])
        // balustrade panel
        b.add('mtStone', metricBox(step - 0.3, 0.75, 0.2), M(m, mat(0, 7.25, 0.1)))
      }
      for (let i = 0; i <= n; i++) {
        const z = s * (z0 + step * i)
        b.add('mtStone', new THREE.CylinderGeometry(0.17, 0.2, 2.9, 10), mat(XF + 0.25, 7.6 + 1.45, z))
        b.add('mtStone', metricBox(0.5, 0.3, 0.5), mat(XF + 0.25, 10.5 + 0.15, z))
        b.add('mtStone', metricBox(0.45, 0.3, 0.45), mat(XF + 0.25, 7.45, z))
      }
      b.add('mtStone', metricBox(0.6, 0.2, ZP - TW.h), mat(XF + 0.25, 6.95, s * (ZP + TW.h) / 2))
    }
    // basement windows
    for (let z = -35; z <= 35; z += 2.6) if (Math.abs(z) > TW.h + 0.5) winA(b, F, XF, -z, 0.5, 0.9, 0.9, 'rect', 0.1, [1, 1])
  }

  /* ================= tower ================= */
  {
    const cx = (TW.x0 + TW.x1) / 2
    const hw = TW.h
    const SH = 27.5
    b.add('mtBrick', metricBox(TW.x1 - TW.x0, SH, 2 * hw), mat(cx, SH / 2, 0))
    b.add('mtSocle', metricBox(TW.x1 - TW.x0 + 0.3, SOCLE, 2 * hw + 0.3), mat(cx, SOCLE / 2, 0))
    for (const y of [6.6, 12.8, 16.6, 21.4]) b.add('mtStone', metricBox(TW.x1 - TW.x0 + 0.2, 0.28, 2 * hw + 0.2), mat(cx, y, 0))
    // quoins
    for (const sx of [TW.x0, TW.x1]) for (const sz of [-hw, hw]) for (let y = SOCLE + 0.4; y < SH; y += 1.4) b.add('mtStone', metricBox(0.7, 0.4, 0.7), mat(sx, y, sz))
    // entrance portal, window above, coat-of-arms panel, slit window
    const m = faceFrame('+x', TW.x1, 0, 0, 0)
    winA(b, '+x', TW.x1, 0, 7.4, 3.0, 4.6, 'round', 0.35, [2, 3])
    b.add('mtStone', metricBox(3.4, 0.9, 0.15), M(m, mat(0, 6.9, 0.08)))
    winA(b, '+x', TW.x1, 0, 18.4, 0.4, 1.8, 'rect', 0.15, [1, 1])
    b.add('mtStone', metricBox(1.4, 1.4, 0.12), M(m, mat(0, 23.2, 0.06)))
    b.add('mtStone', metricBox(1.6, 1.6, 0.14), M(m, mat(0, 14.6, 0.07)))
    for (const face of ['+z', '-z'] as Face[]) {
      const plane = face === '+z' ? hw : -hw
      winA(b, face, plane, face === '+z' ? cx : -cx, 14.0, 0.5, 1.8, 'round', 0.15, [1, 1])
      winA(b, face, plane, face === '+z' ? cx : -cx, 22.4, 0.5, 1.8, 'round', 0.15, [1, 1])
    }
    // stone balustrade band, arcaded loggia, top cornice
    b.add('mtStone', metricBox(TW.x1 - TW.x0 + 0.6, 0.9, 2 * hw + 0.6), mat(cx, SH + 0.45, 0))
    const LY = SH + 0.9
    const LH = 3.2
    for (const face of ['+x', '-x', '+z', '-z'] as Face[]) {
      const isX = face.endsWith('x')
      const plane = isX ? (face === '+x' ? TW.x1 : TW.x0) : face === '+z' ? hw : -hw
      const uc = isX ? 0 : face === '+z' ? cx : -cx
      const fm = faceFrame(face, plane, uc, 0, 0)
      for (let k = -2; k <= 2; k++) {
        b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, LH - 0.2, 0, LY, 10))), M(fm, mat(k * 1.6, 0, 0.03)))
        b.add('mtStone', extrude(frameShape('round', 1.2, LH - 0.2, 0.12, 0, LY), 0.1), M(fm, mat(k * 1.6, 0, 0.02)))
      }
      for (let k = -3; k <= 3; k += 2) b.add('mtStone', new THREE.CylinderGeometry(0.13, 0.15, LH - 0.6, 8), M(fm, mat(k * 0.8, LY + (LH - 0.6) / 2, 0.25)))
    }
    b.add('mtBrick', metricBox(TW.x1 - TW.x0 - 0.1, LH, 2 * hw - 0.1), mat(cx, LY + LH / 2, 0))
    b.add('mtStone', metricBox(TW.x1 - TW.x0 + 0.4, 0.35, 2 * hw + 0.4), mat(cx, LY + LH + 0.17, 0))
    // deep eaves and tiled tent roof with copper finial
    const ey = LY + LH + 0.35
    const R = hw + 1.6
    helm(b, TILE, { x: cx, z: 0, n: 4, phase: Math.PI / 4, stations: [[R * Math.SQRT2, ey], [R * Math.SQRT2 * 0.93, ey + 0.6], [R * Math.SQRT2 * 0.55, ey + 3.6], [0.25, ey + 6.6]], flat: true })
    b.add('wood', metricBox(2 * R, 0.06, 2 * R), mat(cx, ey - 0.03, 0))
    for (const s of [-1, 1]) {
      for (let k = -4; k <= 4; k++) {
        b.add('wood', metricBox(1.6, 0.22, 0.14), mat(cx + s * (hw + 0.8), ey - 0.15, k * 1.0))
        b.add('wood', metricBox(0.14, 0.22, 1.6), mat(cx + k * 1.0, ey - 0.15, s * (hw + 0.8)))
      }
    }
    for (const [ax, az] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) b.beam(CU, V(cx + ax * R, ey + 0.02, az * R), V(cx, ey + 6.62, 0), 0.16, 0.1)
    b.add(CU, new THREE.SphereGeometry(0.28, 12, 8), mat(cx, ey + 6.85, 0))
    b.add(CU, new THREE.CylinderGeometry(0.04, 0.07, 3.0, 8), mat(cx, ey + 8.4, 0))
    downpipe(b, TW.x1 + 0.15, -hw - 0.2, ey)
    // entrance porch with balcony
    const px0 = TW.x1
    const px1 = TW.x1 + 2.8
    b.add('mtStone', metricBox(px1 - px0, 6.3, 7.0), mat((px0 + px1) / 2, 3.15, 0))
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.0, 4.6, 0, 0.6, 12))), mat(px1 + 0.02, 0, 0, Math.PI / 2))
    b.add('mtStone', extrude(frameShape('round', 3.0, 4.6, 0.35, 0, 0.6), 0.16), mat(px1, 0, 0, Math.PI / 2))
    b.add('mtStone', metricBox(px1 - px0 + 0.4, 0.3, 7.4), mat((px0 + px1) / 2 + 0.1, 6.45, 0))
    for (let z = -3.4; z <= 3.41; z += 0.34) b.add('mtStone', new THREE.CylinderGeometry(0.07, 0.09, 0.8, 6), mat(px1 + 0.1, 7.0, z))
    b.add('mtStone', metricBox(0.3, 0.15, 7.2), mat(px1 + 0.1, 7.45, 0))
    for (let i = 0; i < 4; i++) b.add('mtSocle', metricBox(1.0, 0.6 - i * 0.15, 5.0), mat(px1 + 0.5 + i * 0.5, (0.6 - i * 0.15) / 2, 0))
    for (const z of [-2.4, 0, 2.4]) b.rod('iron', V(px1 + 0.1, 7.5, z), V(px1 + 1.4, 10.5, z), 0.03, 6)
  }

  /* ================= side façades (±Z) ================= */
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const U = (x: number) => (s > 0 ? x : -x) // u along the face as seen from outside
    // pavilion outer face: curved gable over a four-arch loggia, big arched window
    const xc = (XR + XF) / 2
    const pm = faceFrame(face, s * ZF, U(xc), 0, 0)
    winA(b, face, s * ZF, U(xc), 8.6, 3.4, 6.8, 'round', 0.32, [2, 4])
    for (const d of [-2.7, 2.7]) for (const e of [-0.6, 0.6]) winA(b, face, s * ZF, U(xc) + d + e, 3.2, 1.0, 2.4, 'rect', 0.16)
    for (const d of [-6.0, 6.0]) {
      winA(b, face, s * ZF, U(xc) + d, 9.0, 0.9, 2.8, 'round', 0.14, [1, 2])
      winA(b, face, s * ZF, U(xc) + d, 17.4, 0.55, 1.3, 'round', 0.1, [1, 1])
    }
    // arched gable wall rising above the eave
    const ar = 4.6
    const gs = new THREE.Shape()
    gs.moveTo(-ar, 0)
    gs.lineTo(ar, 0)
    gs.absarc(0, 0, ar, 0, Math.PI, false)
    b.add('mtBrick', extrude(gs, 0.6), M(pm, mat(0, E_PAV, -0.6)))
    b.add('mtStone', new THREE.TorusGeometry(0.75, 0.1, 6, 18), M(pm, mat(0, E_PAV + 2.3, 0.04)))
    b.add('mtStone', new THREE.CircleGeometry(0.65, 18), M(pm, mat(0, E_PAV + 2.3, 0.02)))
    // four-arch loggia under the gable
    for (let k = 0; k < 4; k++) {
      const u = -2.4 + k * 1.6
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.15, 2.4, 0, 17.2, 10))), M(pm, mat(u, 0, 0.03)))
      b.add('mtStone', extrude(frameShape('round', 1.15, 2.4, 0.1, 0, 17.2), 0.1), M(pm, mat(u, 0, 0.02)))
    }
    for (let k = 0; k <= 4; k++) b.add('mtStone', new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), M(pm, mat(-3.2 + k * 1.6, 17.2 + 1.1, 0.22)))
    b.add('mtStone', metricBox(7.2, 0.3, 0.4), M(pm, mat(0, 16.9, 0.2)))
    // curved eave hood following the arch (tiles on top, timber soffit below, copper edge)
    const hood = (rr: number, key: string, len: number) =>
      b.add(key, new THREE.CylinderGeometry(rr, rr, len, 28, 1, true, Math.PI / 2, Math.PI), M(pm, mat(0, E_PAV, 0.4, 0, Math.PI / 2, 0)))
    hood(ar + 1.25, TILE, 1.9)
    hood(ar + 1.05, 'wood', 1.85)
    b.add(CU, new THREE.TorusGeometry(ar + 1.27, 0.07, 6, 28, Math.PI), M(pm, mat(0, E_PAV, 1.35)))
    // side wing façade: paired windows, arched first-floor windows
    const wingX: number[] = []
    for (let x = -24.5; x < XR - 1; x += 4.0) wingX.push(x)
    for (const x of wingX) {
      const zp = x > -5.5 && x < 18.75 ? s * ZR : s * ZW
      for (const e of [-0.6, 0.6]) {
        winA(b, face, zp, U(x) + e, 3.0, 0.95, 2.3, 'rect', 0.15)
        winA(b, face, zp, U(x) + e, 7.3, 0.95, 2.9, 'round', 0.15, [1, 2])
      }
      winA(b, face, zp, U(x), 0.5, 1.0, 0.9, 'rect', 0.1, [1, 1])
    }
    for (const x of [-24, -6, 18, XR - 0.4]) downpipe(b, x, s * (ZW + 0.2), E_SIDE)
    downpipe(b, XF - 0.3, s * (ZF + 0.2), E_PAV)
  }

  /* ================= rear (−X) and courtyard faces ================= */
  for (let z = -30; z <= 30; z += 4.0) {
    for (const e of [-0.6, 0.6]) {
      winA(b, '-x', XB, z + e, 3.0, 0.95, 2.3, 'rect', 0.15)
      winA(b, '-x', XB, z + e, 7.3, 0.95, 2.9, 'round', 0.15, [1, 2])
    }
  }
  for (let z = -21; z <= 21; z += 4.2) {
    winA(b, '+x', CY.x0, -z, 3.0, 1.2, 2.3, 'rect', 0.14)
    winA(b, '+x', CY.x0, -z, 7.3, 1.2, 2.9, 'round', 0.14)
    winA(b, '-x', CY.x1, z, 3.0, 1.2, 2.3, 'rect', 0.14)
    winA(b, '-x', CY.x1, z, 7.3, 1.2, 2.9, 'round', 0.14)
  }
  for (let x = CY.x0 + 2; x < CY.x1 - 1; x += 4.2) {
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '-z' : '+z'
      const u = s > 0 ? -x : x
      winA(b, face, s * CY.z, u, 3.0, 1.2, 2.3, 'rect', 0.14)
      winA(b, face, s * CY.z, u, 7.3, 1.2, 2.9, 'round', 0.14)
    }
  }

  /* ================= roofs (tiles as photographed, copper rainwater goods) ================= */
  roof(b, XR, XF, -ZP, ZP, E_WING, 38)
  for (const s of [-1, 1]) {
    roof(b, XR, XF, s > 0 ? ZP : -ZF, s > 0 ? ZF : -ZP, E_PAV, 45, 1.4)
    roof(b, -27, XR, s > 0 ? CY.z : -ZW, s > 0 ? ZW : -CY.z, E_SIDE, 40)
    roof(b, -5.5, 18.75, s > 0 ? 30 : -ZR, s > 0 ? ZR : -30, E_SIDE + 1.0, 40)
  }
  roof(b, XB, CY.x0, -32.3, 32.7, E_SIDE, 30)
  roof(b, CY.x1, XR, -CY.z, CY.z, E_SIDE, 30)
  for (const z of [-ZP + 1, ZP - 1]) downpipe(b, XF + OH - 0.2, z, E_WING)

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [47.6, 18.6, 37.6],
  materials: (base) => {
    const tile = (base.slate as THREE.MeshStandardMaterial).clone()
    tile.color.set('#8a8d92')
    return {
    mtTile: tile,
    mtBrick: new THREE.MeshStandardMaterial({ color: '#a95f44', roughness: 0.88 }),
    mtStone: new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.84 }),
    mtSocle: new THREE.MeshStandardMaterial({ color: '#9b978e', roughness: 0.92 }),
    mtFrame: new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.7 }),
    }
  },
  notes:
    'Neo-Romanian brick museum with a square loggia tower, corner pavilions with curved gables and arcaded loggias; tiled hipped roofs with deep timber eaves as photographed; the copper is shown on gutters, downpipes, hip cappings and the tower finial.',
}
export default model
