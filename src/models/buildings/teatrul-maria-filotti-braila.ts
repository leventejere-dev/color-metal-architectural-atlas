/**
 * Teatrul „Maria Filotti”, Brăila (Piața Traian / Str. Mihai Eminescu 2,
 * OSM way 586666594) — neoclassical theatre complex (1896) with a curved
 * cloister-vault roof over the auditorium; restored roofs in pre-weathered
 * titanium-zinc (elZinc Slate) in square, slate-like tiles.
 *
 * Modelling specification (real metres, origin = centre of the OSM bounding
 * box in the east/south frame, +X = east (bearing 90°): the main façade on
 * Piața Traian is the +X face, +Z = south = Str. Mihai Eminescu):
 *  - Front wing along the square after the OSM edge (51 m), 13 m deep:
 *    three storeys, cornice ≈ 14.4 m (photo 01 is a frontal panorama:
 *    ≈ 23 px/m); 6 bays | risalit 13.9 m | 6 bays. Ground floor with arched
 *    windows, first floor with segmental shell hoods, second floor plain;
 *    risalit with three arched doors under iron canopies, paired arched
 *    windows between giant columns, an attic and a clock gable (≈ 19.2 m) and
 *    a small pavilion roof behind it (photo 02).
 *  - South side (photos 02, 03): the corner block (4 bays), the auditorium
 *    façade with three great arched blind panels and reliefs between paired
 *    giant pilasters, attic balustrade and a sculptural gable; a plainer
 *    three-storey wing further west.
 *  - Auditorium roof (photo 02): curved cloister vault (≈ 17.4 × 26.5 m at the
 *    eave ≈ 15.8 m, rise ≈ 7.2 m, flat top ≈ 5 × 14 m with railing and vent),
 *    ox-eye dormers. Low hipped roofs on the front wing, the stage block and
 *    the west street wing.
 *  - The rest of the OSM outline (north-east annex, back-stage block, west
 *    wing towards Str. Golești) as plain massing with flat roofs.
 *  - Roof metal: the photographs predate the 2016 works (02, 2006) or show the
 *    roof only as a night silhouette (01); following the records the pitched
 *    and curved roofs are shown in elZinc Slate, the vault with horizontal
 *    courses suggesting the square slate-style tiles.
 * Approximations: the layout behind the façades (auditorium position and
 * size, stage block, annexes) is inferred from photo 02 and the OSM outline;
 * heights of the back parts, dormer counts and the vault profile are estimated;
 * ornament (reliefs, sculpture, capitals, shells) simplified; the slight skew of
 * the OSM edges (< 0.5 m) is ignored.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, loft, rectRing, prismOutline, hippedRoof, truncatedHip, faceFrame, seams, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]

/* plan */
const EF = 13.95 // square façade plane (x)
const SF = 38.05 // Mihai Eminescu façade plane (z)
const FRONT = { x0: 1.0, z0: -12.76 } // front wing x0 … EF, z0 … SF
const RIS = { z0: 5.8, z1: 19.7, d: 0.4 }
const ZC = (RIS.z0 + RIS.z1) / 2
const AUD = { x0: -17, x1: 1.0, z0: 11 } // auditorium
const WW = { x0: -27.5, z0: 24.2 } // west street wing x0 … AUD.x0
const NORTH: P2[] = [[-27.8, -12.76], [-27.61, -20.78], [-17.42, -20.86], [-17.33, -24.66], [-8.7, -24.56], [-8.63, -28.11], [-4.65, -28.1], [-4.71, -32.64], [7.31, -32.54], [7.3, -12.76]]
const WEST: P2[] = [[-17, 24.2], [-27.36, 24.24], [-34.34, 24.31], [-41.31, 5.46], [-34.25, -2.82], [-27.94, -2.63], [-27.8, -12.76], [-17, -12.76]]
const NE_ANNEX: P2[] = [[7.3, -12.76], [7.31, -32.54], [7.25, -38.27], [30.69, -36.22], [38.28, -35.56], [41.31, -13.55], [13.68, -12.76]]

/* heights */
const GFB = 4.2
const CORN = 14.4
const ATTIC = 15.8
const ZS = 'zincSlate'
const SEAM = seams(ZS, 0.5, 0.04, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

type Crown = 'none' | 'cornice' | 'segment' | 'pediment'
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, crown: Crown = 'none', o: { type?: OpeningType; f?: number; bars?: [number, number]; sill?: boolean } = {}) {
  const type = o.type ?? 'rect'
  const f = o.f ?? 0.18
  const mm = faceFrame(face, plane, u, 0, 0)
  b.add('tmStucco', extrude(frameShape(type, w, h, f, 0, y0), 0.12), mm)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(mm, mat(0, 0, 0.025)))
  b.add('tmFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.06, 0, y0 + 0.03), 0.06), M(mm, mat(0, 0, 0.02)))
  const [nu, nv] = o.bars ?? [2, 2]
  for (let i = 1; i < nu; i++) b.add('tmFrame', metricBox(0.06, h - 0.1, 0.05), M(mm, mat(-w / 2 + (i * w) / nu, y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < nv; j++) b.add('tmFrame', metricBox(w - 0.1, 0.06, 0.05), M(mm, mat(0, y0 + (j * h * 0.75) / nv, 0.05)))
  if (o.sill !== false) b.add('tmStucco', metricBox(w + 2 * f + 0.2, 0.14, 0.26), M(mm, mat(0, y0 - f - 0.05, 0.12)))
  const yt = y0 + h + f
  if (crown === 'cornice') {
    b.add('tmStucco', metricBox(w + 2 * f + 0.4, 0.15, 0.28), M(mm, mat(0, yt + 0.2, 0.14)))
  } else if (crown === 'segment' || crown === 'pediment') {
    const pw = w + 2 * f + 0.5
    b.add('tmStucco', metricBox(w + 2 * f, 0.3, 0.1), M(mm, mat(0, yt + 0.15, 0.05)))
    const s = new THREE.Shape()
    if (crown === 'pediment') {
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      s.lineTo(0, 0.55)
      s.lineTo(-pw / 2, 0)
    } else {
      // segmental hood with a shell (photo 01: first-floor windows of the wings)
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      s.absarc(0, -0.2, pw / 2 + 0.05, Math.atan2(0.2, pw / 2), Math.PI - Math.atan2(0.2, pw / 2), false)
      s.lineTo(-pw / 2, 0)
    }
    b.add('tmStucco', extrude(s, 0.26), M(mm, mat(0, yt + 0.3, 0.02)))
    b.add('tmOrn', new THREE.SphereGeometry(0.3, 10, 6), M(mm, mat(0, yt + 0.5, 0.26, 0, 0, 0, 1.3, 1, 0.35)))
  }
}

function hBand(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, h: number, grow: number, key = 'tmStucco') {
  b.add(key, metricBox(x1 - x0 + 2 * grow, h, z1 - z0 + 2 * grow), mat((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2))
}

/** Box volume with socle, ground-floor band, frieze and modillion cornice. */
function block(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number, corn = true) {
  b.add('tmWall', metricBox(x1 - x0, h, z1 - z0), mat((x0 + x1) / 2, h / 2, (z0 + z1) / 2))
  hBand(b, x0, x1, z0, z1, 0, 0.6, 0.1, 'tmSocle')
  if (!corn) return
  hBand(b, x0, x1, z0, z1, GFB, 0.38, 0.22)
  hBand(b, x0, x1, z0, z1, 12.55, 0.25, 0.1)
  hBand(b, x0, x1, z0, z1, 13.35, 0.18, 0.35)
  hBand(b, x0, x1, z0, z1, 13.75, 0.6, 0.9)
  hBand(b, x0, x1, z0, z1, h - 0.05, 0.06, 0.95, ZS)
}

function modillions(b: Builder, face: Face, plane: number, u0: number, u1: number, y = 13.62) {
  for (let u = u0 + 0.3; u <= u1 - 0.25; u += 0.8) b.add('tmStucco', metricBox(0.2, 0.26, 0.75), M(faceFrame(face, plane, u, 0, 0), mat(0, y, 0.37)))
}

function giantPilaster(b: Builder, face: Face, plane: number, u: number, y0: number, y1: number, w = 0.6, round = false) {
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('tmStucco', metricBox(w + 0.25, 0.4, 0.5), M(m, mat(0, y0 + 0.2, 0.25)))
  if (round) b.add('tmStucco', new THREE.CylinderGeometry(w / 2, w / 2 + 0.03, y1 - y0 - 0.95, 14), M(m, mat(0, y0 + 0.4 + (y1 - y0 - 0.95) / 2, 0.38)))
  else b.add('tmStucco', metricBox(w, y1 - y0 - 0.95, 0.24), M(m, mat(0, y0 + 0.4 + (y1 - y0 - 0.95) / 2, 0.12)))
  b.add('tmOrn', metricBox(w + 0.2, 0.45, round ? 0.75 : 0.36), M(m, mat(0, y1 - 0.45, round ? 0.38 : 0.18)))
  b.add('tmStucco', metricBox(w + 0.4, 0.12, round ? 0.85 : 0.44), M(m, mat(0, y1 - 0.08, round ? 0.4 : 0.22)))
}

/** Ox-eye dormer pointing along n. */
function oxEye(b: Builder, p: THREE.Vector3, n: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n.clone().normalize())
  const m = new THREE.Matrix4().compose(p, q, V(1, 1, 1))
  b.add(ZS, new THREE.CylinderGeometry(0.6, 0.6, 1.4, 18, 1, true), m)
  b.add('glassC', new THREE.CircleGeometry(0.44, 18), M(m, mat(0, 0.66, 0, 0, -Math.PI / 2)))
  b.add('tmStucco', new THREE.TorusGeometry(0.54, 0.1, 6, 18), M(m, mat(0, 0.7, 0, 0, Math.PI / 2)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= front wing on Piața Traian ================= */
  block(b, FRONT.x0, EF, FRONT.z0, SF, CORN)
  // risalit projection
  b.add('tmWall', metricBox(RIS.d, CORN, RIS.z1 - RIS.z0), mat(EF + RIS.d / 2, CORN / 2, ZC))
  hBand(b, EF, EF + RIS.d, RIS.z0, RIS.z1, GFB, 0.38, 0.22)
  hBand(b, EF, EF + RIS.d, RIS.z0, RIS.z1, 13.75, 0.6, 0.9)
  modillions(b, '+x', EF, -SF, -FRONT.z0)
  modillions(b, '+z', SF, FRONT.x0, EF)
  {
    const F: Face = '+x'
    const south = [21.23, 24.29, 27.35, 30.41, 33.47, 36.53]
    const north = [4.25, 1.16, -1.93, -5.03, -8.12, -11.21]
    for (const z of [...south, ...north]) {
      win(b, F, EF, -z, 0.65, 1.45, 2.85, 'none', { type: 'round', f: 0.16 })
      win(b, F, EF, -z, 5.3, 1.3, 2.3, 'segment')
      win(b, F, EF, -z, 10.2, 1.25, 2.0, 'cornice', { f: 0.16 })
      // apron panels under the first-floor windows
      b.add('tmOrn', metricBox(1.4, 0.45, 0.06), M(faceFrame(F, EF, -z, 0, 0), mat(0, 4.85, 0.03)))
    }
    // channelled ground floor (bands between the arches)
    for (let y = 0.9; y < GFB - 0.2; y += 0.5) {
      for (const zs of [south, north]) {
        for (let k = 0; k < zs.length - 1; k++) {
          const za = Math.min(zs[k], zs[k + 1]) + 0.95
          const zb = Math.max(zs[k], zs[k + 1]) - 0.95
          b.add('tmWall', metricBox(0.05, 0.38, zb - za), mat(EF + 0.025, y, (za + zb) / 2))
        }
      }
    }
    // risalit: arched doors with iron canopies, paired arched windows, giant columns
    const RX = EF + RIS.d
    for (const dz of [-3.0, 0, 3.0]) {
      win(b, F, RX, -(ZC + dz), 0.3, 2.3, 3.5, 'none', { type: 'round', f: 0.25, bars: [2, 2], sill: false })
      for (const s of [-0.75, 0.75]) win(b, F, RX, -(ZC + dz + s), 5.45, 0.95, 2.75, 'none', { type: 'round', f: 0.12, bars: [1, 2] })
      win(b, F, RX, -(ZC + dz), 10.2, 1.7, 2.0, 'cornice', { f: 0.14, bars: [3, 2] })
      // canopy (iron and glass)
      const cm = faceFrame(F, RX, -(ZC + dz), 0, 0)
      b.add('iron', metricBox(2.9, 0.1, 1.7), M(cm, mat(0, 3.95, 0.85, 0, 0.16)))
      b.add('skylight', metricBox(2.7, 0.03, 1.6), M(cm, mat(0, 4.02, 0.85, 0, 0.16)))
      for (const s2 of [-1, 1]) b.beam('iron', V(s2 * 1.3, 3.0, 0).applyMatrix4(cm), V(s2 * 1.3, 3.9, 1.5).applyMatrix4(cm), 0.06, 0.06)
    }
    for (const dz of [-6.6, -6.0, -1.5, 1.5, 6.0, 6.6]) giantPilaster(b, F, RX, -(ZC + dz), 4.6, 12.55, 0.42, true)
    // balcony balustrade at the first floor of the risalit
    b.add('tmStucco', metricBox(0.5, 0.7, 12.4), mat(RX + 0.25, 4.95, ZC))
    // attic over the risalit with relief panels
    b.add('tmWall', metricBox(1.0, ATTIC - CORN, RIS.z1 - RIS.z0), mat(RX - 0.5, (CORN + ATTIC) / 2, ZC))
    b.add('tmStucco', metricBox(1.3, 0.2, RIS.z1 - RIS.z0 + 0.3), mat(RX - 0.5, ATTIC + 0.1, ZC))
    for (const dz of [-4.6, -1.5, 1.5, 4.6]) b.add('tmOrn', metricBox(0.08, 0.7, 2.2), mat(RX + 0.04, CORN + 0.7, ZC + dz))
    // clock gable (segmental crest, oculus clock, scrolls)
    const g = new THREE.Shape()
    g.moveTo(-3.6, 0)
    g.lineTo(3.6, 0)
    g.lineTo(3.6, 1.0)
    g.quadraticCurveTo(2.2, 1.1, 1.9, 2.4)
    g.absarc(0, 2.4, 1.9, 0, Math.PI, false)
    g.quadraticCurveTo(-2.2, 1.1, -3.6, 1.0)
    g.lineTo(-3.6, 0)
    b.add('tmWall', extrude(g, 0.7), mat(RX - 0.7, ATTIC + 0.2, ZC, Math.PI / 2))
    b.add('tmStucco', new THREE.TorusGeometry(1.0, 0.16, 8, 24), mat(RX + 0.02, ATTIC + 2.3, ZC, Math.PI / 2))
    b.add('tmStucco', new THREE.CylinderGeometry(0.85, 0.85, 0.1, 24), mat(RX - 0.02, ATTIC + 2.3, ZC, 0, 0, Math.PI / 2))
    b.add('clock', new THREE.CylinderGeometry(0.72, 0.72, 0.12, 24), mat(RX + 0.02, ATTIC + 2.3, ZC, 0, 0, Math.PI / 2))
    for (const s of [-1, 1]) b.add('tmOrn', new THREE.SphereGeometry(0.4, 10, 8), mat(RX - 0.1, ATTIC + 1.0, ZC + s * 2.7, 0, 0, 0, 0.5, 1.2, 1))
    b.add('tmOrn', new THREE.SphereGeometry(0.35, 10, 8), mat(RX - 0.3, ATTIC + 4.45, ZC))
  }
  // corner block on Str. Mihai Eminescu (4 bays)
  for (const x of [12.2, 9.0, 5.8, 2.6]) {
    win(b, '+z', SF, x, 0.65, 1.45, 2.85, 'none', { type: 'round', f: 0.16 })
    win(b, '+z', SF, x, 5.3, 1.3, 2.3, 'segment')
    win(b, '+z', SF, x, 10.2, 1.25, 2.0, 'cornice', { f: 0.16 })
  }

  /* ================= auditorium block and its south façade ================= */
  block(b, AUD.x0, AUD.x1, AUD.z0, SF, CORN)
  modillions(b, '+z', SF, AUD.x0, AUD.x1)
  {
    const F: Face = '+z'
    for (const x of [-14.5, -10.0, -5.5, -1.0]) win(b, F, SF, x, 0.6, 2.1, 3.0, 'none', { f: 0.14, bars: [2, 2], sill: false })
    for (let y = 0.8; y < GFB - 0.2; y += 0.5) b.add('tmWall', metricBox(AUD.x1 - AUD.x0, 0.06, 0.05), mat((AUD.x0 + AUD.x1) / 2, y, SF + 0.025))
    // three great arched blind panels with oval reliefs
    for (const x of [-2.6, -8.0, -13.4]) {
      const m = faceFrame(F, SF, x, 0, 0)
      b.add('tmStucco', extrude(frameShape('round', 3.4, 7.0, 0.3, 0, 4.95), 0.16), m)
      b.add('tmPanel', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.4, 7.0, 0, 4.95, 14))), M(m, mat(0, 0, 0.02)))
      b.add('tmOrn', new THREE.SphereGeometry(0.75, 12, 8), M(m, mat(0, 8.6, 0.08, 0, 0, 0, 0.7, 1.15, 0.25)))
      b.add('tmOrn', metricBox(1.9, 0.18, 0.2), M(m, mat(0, 7.0, 0.1)))
      b.add('tmStucco', metricBox(3.9, 0.6, 0.12), M(m, mat(0, 5.6, 0.06)))
      for (let k = -4; k <= 4; k++) b.add('tmStucco', new THREE.CylinderGeometry(0.07, 0.09, 0.5, 6), M(m, mat(k * 0.4, 5.15, 0.16)))
    }
    for (const x of [0.65, -0.05, -5.0, -5.6, -10.4, -11.0, -15.9, -16.5]) giantPilaster(b, F, SF, x, 4.6, 12.55, 0.48)
    // attic balustrade and sculptural gable
    const AY = CORN
    b.add('tmStucco', metricBox(AUD.x1 - AUD.x0, 0.2, 0.6), mat((AUD.x0 + AUD.x1) / 2, AY + 0.1, SF - 0.1))
    for (let x = AUD.x0 + 0.3; x < AUD.x1 - 0.2; x += 0.34) b.add('tmStucco', new THREE.CylinderGeometry(0.07, 0.09, 0.85, 6), mat(x, AY + 0.62, SF - 0.1))
    b.add('tmStucco', metricBox(AUD.x1 - AUD.x0, 0.18, 0.62), mat((AUD.x0 + AUD.x1) / 2, AY + 1.12, SF - 0.1))
    for (const x of [AUD.x1 - 0.2, -5.3, -10.7, AUD.x0 + 0.2]) b.add('tmStucco', metricBox(0.5, 1.2, 0.6), mat(x, AY + 0.6, SF - 0.1))
    const gab = new THREE.Shape()
    gab.moveTo(-3.2, 0)
    gab.lineTo(3.2, 0)
    gab.absarc(0, -2.4, 4.0, Math.atan2(2.4, 3.2), Math.PI - Math.atan2(2.4, 3.2), false)
    gab.lineTo(-3.2, 0)
    b.add('tmWall', extrude(gab, 0.6), mat(-8.0, AY + 1.2, SF - 0.6))
    b.add('tmOrn', new THREE.SphereGeometry(0.6, 10, 8), mat(-8.0, AY + 2.4, SF + 0.05, 0, 0, 0, 1.6, 1.1, 0.5))
    for (const s of [-1, 1]) b.add('tmOrn', new THREE.SphereGeometry(0.45, 10, 8), mat(-8.0 + s * 2.1, AY + 1.75, SF - 0.05, 0, 0, 0, 0.8, 1.2, 0.6))
  }

  /* ================= west street wing ================= */
  block(b, WW.x0, AUD.x0, WW.z0, SF - 0.15, CORN)
  modillions(b, '+z', SF - 0.15, WW.x0, AUD.x0)
  for (const x of [-19.6, -22.25, -24.9]) {
    win(b, '+z', SF - 0.15, x, 0.9, 1.3, 2.7, 'none', { f: 0.14 })
    win(b, '+z', SF - 0.15, x, 5.3, 1.3, 2.4, 'segment')
    win(b, '+z', SF - 0.15, x, 10.2, 1.25, 2.0, 'cornice', { f: 0.14 })
  }

  /* ================= stage block and plain back parts ================= */
  block(b, AUD.x0, AUD.x1, FRONT.z0, AUD.z0, 19.0, false)
  hBand(b, AUD.x0, AUD.x1, FRONT.z0, AUD.z0, 18.6, 0.4, 0.3)
  for (const [poly, h] of [
    [NORTH, 12.0],
    [WEST, 10.0],
    [NE_ANNEX, 13.0],
  ] as [P2[], number][]) {
    prismOutline(b, 'tmWallB', poly, 0, h)
    prismOutline(b, 'tmSocle', poly, 0, 0.5)
    // flat roof with parapet coping (cornice band)
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
    const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length
    const grown = poly.map(([px, pz]) => {
      const dx = px - cx
      const dz = pz - cz
      const L = Math.hypot(dx, dz)
      return [px + (dx / L) * 0.25, pz + (dz / L) * 0.25] as P2
    })
    prismOutline(b, 'tmStucco', grown, h - 0.5, 0.5)
    prismOutline(b, 'tmRoofFlat', poly, h, 0.08)
  }
  // simple window rows on the free faces of the back parts (frames built on the OSM edges)
  const edgeRows = (pa: P2, pc: P2, inside: P2, floors: number[], step = 3.3) => {
    const dx = pc[0] - pa[0]
    const dz = pc[1] - pa[1]
    const L = Math.hypot(dx, dz)
    const n = V(dz / L, 0, -dx / L)
    const mid = V((pa[0] + pc[0]) / 2, 0, (pa[1] + pc[1]) / 2)
    if (n.x * (inside[0] - mid.x) + n.z * (inside[1] - mid.z) > 0) n.negate()
    const m = new THREE.Matrix4().makeBasis(V(n.z, 0, -n.x), V(0, 1, 0), n).setPosition(mid)
    const k = Math.max(1, Math.floor((L - 1) / step))
    for (let i = 0; i < k; i++) {
      const u = -L / 2 + 0.5 + ((L - 1) / k) * (i + 0.5)
      for (const y of floors) {
        const mm = M(m, mat(u, 0, 0))
        b.add('tmStucco', extrude(frameShape('rect', 1.2, 2.1, 0.12, 0, y), 0.1), mm)
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.2, 2.1, 0, y, 4))), M(mm, mat(0, 0, 0.02)))
        b.add('tmFrame', metricBox(0.06, 2.0, 0.05), M(mm, mat(0, y + 1.05, 0.04)))
      }
    }
  }
  const NIN: P2 = [-10, -20]
  edgeRows([-27.8, -12.76], [-27.61, -20.78], NIN, [1.0, 4.8, 8.4])
  edgeRows([-27.61, -20.78], [-17.42, -20.86], NIN, [1.0, 4.8, 8.4])
  edgeRows([-17.33, -24.66], [-8.7, -24.56], NIN, [1.0, 4.8, 8.4])
  edgeRows([-4.71, -32.64], [7.31, -32.54], NIN, [1.0, 4.8, 8.4])
  const AIN: P2 = [25, -25]
  edgeRows([7.25, -38.27], [30.69, -36.22], AIN, [1.0, 4.8, 8.8])
  edgeRows([38.28, -35.56], [41.31, -13.55], AIN, [1.0, 4.8, 8.8])
  edgeRows([41.31, -13.55], [13.68, -12.76], AIN, [1.0, 4.8, 8.8])
  const WIN: P2 = [-30, 8]
  edgeRows([-27.36, 24.24], [-34.34, 24.31], WIN, [1.0, 5.0])
  edgeRows([-34.34, 24.31], [-41.31, 5.46], WIN, [1.0, 5.0])
  edgeRows([-41.31, 5.46], [-34.25, -2.82], WIN, [1.0, 5.0])
  edgeRows([-27.94, -2.63], [-27.8, -12.76], WIN, [1.0, 5.0])

  /* ================= roofs (elZinc Slate) ================= */
  // front wing: low hip behind the cornice
  hippedRoof(b, ZS, { x: (FRONT.x0 + EF) / 2 + 0.1, z: (FRONT.z0 + SF) / 2, w: EF - FRONT.x0 + 0.4, d: SF - FRONT.z0 + 0.4, y: CORN + 0.12, pitch: 20, overhang: 0.2, seams: SEAM })
  // pavilion roof over the risalit, behind the clock gable
  {
    const th = truncatedHip((FRONT.x0 + EF + RIS.d) / 2 + 0.5, ZC, EF + RIS.d - FRONT.x0 - 1.4, RIS.z1 - RIS.z0 - 0.4, ATTIC + 0.25, (62 * Math.PI) / 180, 3.0)
    for (const f of th.facets) facet(b, ZS, f, { seams: SEAM, thickness: 0.1 })
    for (const [p, q] of th.lines) b.beam(ZS, p, q, 0.14, 0.1)
    b.add(ZS, metricBox(th.curb.w, 0.1, th.curb.d), mat((FRONT.x0 + EF + RIS.d) / 2 + 0.5, th.curb.y + 0.05, ZC))
    b.add('tmWall', metricBox(EF + RIS.d - FRONT.x0 - 1.6, ATTIC + 0.25 - CORN, RIS.z1 - RIS.z0 - 0.6), mat((FRONT.x0 + EF + RIS.d) / 2 + 0.3, (CORN + ATTIC + 0.25) / 2, ZC))
  }
  // west street wing and stage block
  hippedRoof(b, ZS, { x: (WW.x0 + AUD.x0) / 2, z: (WW.z0 + SF) / 2, w: AUD.x0 - WW.x0 + 0.4, d: SF - WW.z0 + 0.2, y: CORN + 0.12, pitch: 22, overhang: 0.2, seams: SEAM })
  hippedRoof(b, ZS, { x: (AUD.x0 + AUD.x1) / 2, z: (FRONT.z0 + AUD.z0) / 2, w: AUD.x1 - AUD.x0 + 0.4, d: AUD.z0 - FRONT.z0 + 0.4, y: 19.0, pitch: 18, overhang: 0.3, seams: SEAM })
  // auditorium: curved cloister vault with horizontal courses (slate-style tiles)
  {
    const cx = (AUD.x0 + AUD.x1) / 2
    const cz = (AUD.z0 + SF) / 2 - 0.1
    const hx = (AUD.x1 - AUD.x0) / 2 - 0.3
    const hz = (SF - AUD.z0) / 2 - 0.55
    const y0 = ATTIC
    b.add('tmWall', metricBox(2 * hx + 0.6, ATTIC - CORN, 2 * hz + 0.9), mat(cx, (CORN + ATTIC) / 2, cz))
    const st: [number, number][] = []
    for (let i = 0; i <= 14; i++) {
      const t = i / 14
      const a = t * (Math.PI / 2)
      st.push([6.2 * (1 - Math.cos(a)) ** 1.15, 7.2 * Math.sin(a)])
    }
    b.add(ZS, loft(st.map(([ins, dy]) => rectRing(hx - ins, hz - ins, y0 + dy, cx, cz)), { capTop: true }))
    // courses every ≈ 0.6 m along the curve
    for (let i = 1; i < st.length; i++) {
      const [ins, dy] = st[i]
      const r = rectRing(hx - ins + 0.02, hz - ins + 0.02, y0 + dy + 0.01, cx, cz)
      for (let k = 0; k < 4; k++) b.beam(ZS, r[k], r[(k + 1) % 4], 0.05, 0.04)
    }
    for (const [hxx, hzz, dy] of [[hx, hz, 0]] as [number, number, number][]) {
      const r = rectRing(hxx + 0.05, hzz + 0.05, y0 + dy + 0.05, cx, cz)
      for (let k = 0; k < 4; k++) b.beam(ZS, r[k], r[(k + 1) % 4], 0.22, 0.14)
    }
    // ox-eye dormers on the lower curve
    const ins = 0.9
    const dy = 2.6
    for (const z of [cz - 6, cz + 6]) {
      oxEye(b, V(cx + hx - ins, y0 + dy, z), V(1, 0.3, 0))
      oxEye(b, V(cx - hx + ins, y0 + dy, z), V(-1, 0.3, 0))
    }
    oxEye(b, V(cx, y0 + dy, cz + hz - ins), V(0, 0.3, 1))
    oxEye(b, V(cx, y0 + dy, cz - hz + ins), V(0, 0.3, -1))
    // railing round the flat top and the round ventilator
    const yt = y0 + 7.2
    const top = rectRing(hx - 6.2, hz - 6.2, yt, cx, cz)
    for (let k = 0; k < 4; k++) {
      const p = top[k]
      const q = top[(k + 1) % 4]
      b.beam('iron', p.clone().setY(yt + 0.9), q.clone().setY(yt + 0.9), 0.05, 0.05)
      const L = p.distanceTo(q)
      for (let j = 0; j <= Math.floor(L / 1.5); j++) {
        const s = p.clone().lerp(q, j / Math.floor(L / 1.5))
        b.add('iron', metricBox(0.05, 0.9, 0.05), mat(s.x, yt + 0.45, s.z))
      }
    }
    b.add(ZS, new THREE.CylinderGeometry(0.7, 0.8, 0.9, 16), mat(cx, yt + 0.45, cz - 2))
    b.add(ZS, new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(cx, yt + 0.9, cz - 2))
  }
  // chimneys on the front wing
  for (const z of [-6, 2, 27, 33]) {
    b.block('tmWall', 0.7, 1.6, 1.1, 5.5, CORN + 1.2, z)
    b.block(ZS, 0.9, 0.1, 1.3, 5.5, CORN + 2.8, z)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [-8, 20, 24],
  materials: () => ({
    tmWall: new THREE.MeshStandardMaterial({ color: '#e6d6b2', roughness: 0.88 }),
    tmWallB: new THREE.MeshStandardMaterial({ color: '#ddd2bb', roughness: 0.9 }),
    tmStucco: new THREE.MeshStandardMaterial({ color: '#f1e8d3', roughness: 0.82 }),
    tmOrn: new THREE.MeshStandardMaterial({ color: '#f5efe2', roughness: 0.8 }),
    tmPanel: new THREE.MeshStandardMaterial({ color: '#e0cfa8', roughness: 0.88 }),
    tmSocle: new THREE.MeshStandardMaterial({ color: '#c9bb9c', roughness: 0.9 }),
    tmFrame: new THREE.MeshStandardMaterial({ color: '#4b3426', roughness: 0.6 }),
    tmRoofFlat: new THREE.MeshStandardMaterial({ color: '#8d8c88', roughness: 0.92 }),
  }),
  notes:
    'Neoclassical theatre on Piața Traian with a clock gable, an ornate auditorium façade and a curved cloister-vault roof over the auditorium in pre-weathered titanium-zinc (elZinc Slate); the back parts of the outline are plain massing.',
}
export default model
