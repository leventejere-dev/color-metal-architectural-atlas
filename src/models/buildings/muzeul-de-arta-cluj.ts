/**
 * Muzeul de Artă Cluj-Napoca — Palatul Bánffy, Piața Unirii 30 (OSM relation
 * 15427149). Late-Baroque town palace of two storeys built around a
 * rectangular courtyard; tall red-tile roofs with baroque dormers.
 *
 * Modelling specification (real metres). +X = azimuth 246.8° (the OSM long
 * axis 66.8° flipped) = towards Piața Unirii, so the main façade on the square
 * is the +X face; +Z = 336.8° (NNW).
 *  - Footprint after the OSM outer ring: 66.5 m deep × 47.2 m along the square,
 *    plus the shallow central risalit (14.4 m wide, 1.6 m proud) of the
 *    square façade. Courtyard ≈ 38.5 × 27.2 m (satellite view and panorama 05).
 *  - Wings: front wing 15.2 m deep, rear wing 12.8 m, side wings 10 m, each
 *    with the courtyard galleries on the side and rear wings (photos 04, 05):
 *    ground-floor arcade on piers, open upper gallery of Tuscan columns over
 *    a balustrade.
 *  - Square façade (photos 01–03): rusticated socle storey to the string
 *    course at 6.0 m with segment-headed windows, upper floor with pilasters,
 *    blind balustrade panels and hooded windows, entablature at 12.0–13.2 m
 *    and an attic balustrade carrying statues and urns; 5 window bays either
 *    side of the risalit. Risalit: three arched portals below, a columned
 *    loggia with balcony above, the curved hood roof in front of the main
 *    roof and the coat-of-arms group with griffins on top.
 *  - Roofs: hipped red-tile roofs, pitch ≈ 48°, front ridge ≈ 22 m; dormers
 *    with segmental pediments (2 per half-façade on the square, rows on the
 *    side and rear wings).
 *  - COLOR METAL copper (register 2021): the available photographs (2012–2019)
 *    predate the works. The published scope of the façade and roof
 *    rehabilitation names the roof coverings, the sheet-metal aprons at the
 *    eaves and the coverings of the dormers, so the copper is shown on the
 *    dormer roofs and cheeks, the eave aprons, gutters and downpipes and on the
 *    sheet-metal hood of the central risalit — as weathered copper
 *    (copperBrown); the large roof planes stay red tile as photographed.
 * Approximations: wing depths and all heights estimated from the photos;
 * courtyard bay counts, the outer elevations of the side and rear wings and
 * the dormer count on the hidden slopes are inferred; ornament (statues,
 * cartouche, capitals, window hoods) simplified; the 2 m asymmetry of the OSM
 * risalit is ignored (façade drawn symmetrical as photographed).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, window_, faceFrame, hipRoof, lathe, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const XF = 32.2 // square façade
const XR = -34.3 // rear façade
const ZN = 23.6
const ZS = -23.6
const XFI = 17.0 // front wing, courtyard wall
const XRI = -21.5 // rear wing, courtyard (arcade) plane
const ZNI = 13.6 // side wings, courtyard (arcade) plane
const GAL = 2.8 // gallery depth
const RIS = { hz: 7.2, x: XF + 1.6 }

/* heights */
const STRING = 6.0
const ENT = 12.0 // entablature bottom
const CORN = 13.2 // cornice top (front)
const EAVE_F = 13.4
const EAVE_C = 13.0
const PITCH = 48
const T = Math.tan(PITCH * D2R)
const OV = 0.45

const CU = 'copperBrown'

/* ------------------------------------------------------------------ */

function statue(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [
    [0.0, 0],
    [0.36, 0],
    [0.4, 0.15],
    [0.34, 0.6],
    [0.27, 1.0],
    [0.24, 1.25],
    [0.27, 1.42],
    [0.22, 1.52],
    [0.09, 1.56],
    [0.0, 1.57],
  ]
  b.add('banStone', lathe(prof.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
  b.add('banStone', new THREE.SphereGeometry(0.15 * s, 10, 8), mat(x, y + 1.7 * s, z))
  b.add('banStone', metricBox(0.14 * s, 0.75 * s, 0.14 * s), mat(x + 0.25 * s, y + 1.3 * s, z, 0, 0, -0.5))
}

function urn(b: Builder, x: number, y: number, z: number, s = 1) {
  const prof: [number, number][] = [
    [0.0, 0],
    [0.22, 0],
    [0.22, 0.1],
    [0.1, 0.2],
    [0.26, 0.45],
    [0.28, 0.62],
    [0.15, 0.78],
    [0.2, 0.86],
    [0.06, 1.0],
    [0.0, 1.15],
  ]
  b.add('banStone', lathe(prof.map(([r, yy]) => [r * s, yy * s]), 10), mat(x, y, z))
}

/** Balusters + rails between a and c (horizontal). */
function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = 1.0, spacing = 0.32, key = 'banStone') {
  const L = a.distanceTo(c)
  const n = Math.max(2, Math.floor(L / spacing))
  const prof: [number, number][] = [
    [0.0, 0],
    [0.09, 0],
    [0.09, 0.06],
    [0.05, 0.12],
    [0.1, 0.32],
    [0.08, 0.46],
    [0.04, 0.55],
    [0.07, 0.62],
    [0.0, 0.62],
  ]
  const g = lathe(prof.map(([r, y]) => [r, (y * (h - 0.28)) / 0.62]), 6)
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    b.add(key, g, mat(p.x, p.y + 0.12, p.z))
  }
  b.beam(key, a.clone().setY(a.y + 0.06), c.clone().setY(c.y + 0.06), 0.32, 0.12)
  b.beam(key, a.clone().setY(a.y + h - 0.08), c.clone().setY(c.y + h - 0.08), 0.38, 0.16)
}

/** Baroque dormer, local front facing +Z, sitting with its front foot at the origin. */
function dormerGeo(w = 1.5, h = 2.3, depth = 3.2): Builder {
  const d = new Builder()
  // plastered front and copper cheeks
  d.add('banWall', metricBox(w, h, 0.25), mat(0, h / 2, -0.12))
  d.add(CU, metricBox(0.06, h, depth), mat(-w / 2 + 0.03, h / 2, -depth / 2))
  d.add(CU, metricBox(0.06, h, depth), mat(w / 2 - 0.03, h / 2, -depth / 2))
  d.add('banWall', metricBox(w - 0.12, h - 0.1, depth - 0.3), mat(0, (h - 0.1) / 2, -depth / 2 - 0.1))
  // arched window with stucco surround
  const fm = mat(0, 0, 0.01)
  d.add('banStone', extrude(frameShape('round', 0.72, 1.35, 0.14, 0, 0.45), 0.08), fm)
  d.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.72, 1.35, 0, 0.45, 10))), mat(0, 0, 0.02))
  d.add('banFrame', metricBox(0.05, 1.2, 0.04), mat(0, 1.05, 0.04))
  // segmental pediment
  const s = new THREE.Shape()
  s.moveTo(-w / 2 - 0.12, 0)
  s.lineTo(w / 2 + 0.12, 0)
  s.absarc(0, -0.95, Math.hypot(w / 2 + 0.12, 0.95), Math.atan2(0.95, w / 2 + 0.12), Math.PI - Math.atan2(0.95, w / 2 + 0.12), false)
  d.add('banStone', extrude(s, 0.3, 10), mat(0, h - 0.05, -0.18))
  // copper roof: small gable running back into the main roof
  const rr = 0.62
  const y0 = h + 0.05
  for (const sx of [-1, 1]) {
    facet(d, CU, [V(sx * (w / 2 + 0.18), y0, 0.25), V(sx * (w / 2 + 0.18), y0, -depth), V(0, y0 + rr, -depth), V(0, y0 + rr, 0.25)], { thickness: 0.05 })
  }
  d.beam(CU, V(0, y0 + rr + 0.03, 0.25), V(0, y0 + rr + 0.03, -depth), 0.1, 0.08)
  // finial
  d.add(CU, new THREE.SphereGeometry(0.1, 8, 6), mat(0, y0 + rr + 0.2, 0.15))
  return d
}
const DORMER = dormerGeo()

function placeDormer(b: Builder, x: number, y: number, z: number, nx: number, nz: number) {
  b.merge(DORMER, mat(x, y, z, Math.atan2(nx, nz)))
}

/** Chimney on a roof at (x, z), base height y. */
function chimney(b: Builder, x: number, y: number, z: number, h = 2.2) {
  b.block('banWall', 0.9, h, 1.3, x, y, z)
  b.block('banStone', 1.1, 0.2, 1.5, x, y + h, z)
  b.block(CU, 1.0, 0.06, 1.4, x, y + h + 0.2, z)
}

/** Window bay with stucco surround (upper floor) on a façade. */
function upperWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w = 1.45, h = 2.6, panel = true) {
  window_(b, face, plane, u, y0, { type: 'rect', w, h, frame: 0.2, frameKey: 'banStone', glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0, { type: 'rect', w: w - 0.1, h: h - 0.06, frame: 0.06, frameKey: 'banFrame', glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  // hood with a small segmental crest
  b.add('banStone', metricBox(w + 0.7, 0.18, 0.3), M(m, mat(0, y0 + h + 0.35, 0.12)))
  const s = new THREE.Shape()
  s.moveTo(-w / 2 - 0.2, 0)
  s.lineTo(w / 2 + 0.2, 0)
  s.absarc(0, -0.6, Math.hypot(w / 2 + 0.2, 0.6), Math.atan2(0.6, w / 2 + 0.2), Math.PI - Math.atan2(0.6, w / 2 + 0.2), false)
  b.add('banStone', extrude(s, 0.16, 8), M(m, mat(0, y0 + h + 0.44, 0.02)))
  if (panel) {
    // blind balustrade panel under the window
    b.add('banStone', metricBox(w + 0.4, 0.95, 0.08), M(m, mat(0, y0 - 0.75, 0.04)))
    for (let i = 0; i < 4; i++) b.add('banWall', metricBox(0.16, 0.6, 0.06), M(m, mat(-w / 2 + 0.05 + (i + 0.5) * ((w - 0.1) / 4), y0 - 0.75, 0.1)))
  }
}

function lowerWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w = 1.4, h = 2.3) {
  window_(b, face, plane, u, y0, { type: 'segment', w, h, frame: 0.22, frameKey: 'banStone', glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0, { type: 'segment', w: w - 0.1, h: h - 0.06, frame: 0.06, frameKey: 'banFrame', glassKey: 'glassC', inset: 0.05, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('banStone', metricBox(0.4, 0.5, 0.14), M(m, mat(0, y0 + h + 0.12, 0.06)))
}

/** Plain wall block with plinth, string course and cornice. */
function wing(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  b.block('banWall', x1 - x0, h, z1 - z0, cx, 0, cz)
  b.block('banSocle', x1 - x0 + 0.16, 0.8, z1 - z0 + 0.16, cx, 0, cz)
  b.block('banStone', x1 - x0 + 0.2, 0.3, z1 - z0 + 0.2, cx, STRING - 0.3, cz)
  b.block('banStone', x1 - x0 + 0.5, 0.3, z1 - z0 + 0.5, cx, h - 0.6, cz)
  b.block('banStone', x1 - x0 + 0.8, 0.3, z1 - z0 + 0.8, cx, h - 0.3, cz)
}

/** Courtyard gallery: ground arcade + upper column gallery along a line, arcade plane facing `face`. */
function gallery(b: Builder, face: Face, plane: number, u0: number, u1: number, bays: number, passage = -1) {
  const L = u1 - u0
  const bw = L / bays
  const m = faceFrame(face, plane, (u0 + u1) / 2, 0, 0)
  // ground arcade: one extruded wall with arched holes
  const holes: THREE.Vector2[][] = []
  for (let i = 0; i < bays; i++) {
    const u = -L / 2 + bw * (i + 0.5)
    const ow = i === passage ? bw - 0.8 : bw - 1.15
    holes.push(opening('round', ow, i === passage ? 4.6 : 4.1, u, 0.0, 12))
  }
  const s = new THREE.Shape([new THREE.Vector2(-L / 2, 0), new THREE.Vector2(L / 2, 0), new THREE.Vector2(L / 2, 5.8), new THREE.Vector2(-L / 2, 5.8)])
  for (const h of holes) s.holes.push(new THREE.Path(h))
  b.add('banWall', extrude(s, 0.7, 10), M(m, mat(0, 0, -0.7)))
  // pier strips (white pilasters as in photo 05) and string course
  for (let i = 0; i <= bays; i++) {
    const u = -L / 2 + bw * i
    b.add('banStone', metricBox(0.55, 5.6, 0.12), M(m, mat(u, 2.8, 0.06)))
  }
  b.add('banStone', metricBox(L + 0.2, 0.35, 0.3), M(m, mat(0, 5.85, 0.05)))
  // dark gallery interior behind the arches
  b.add('banShade', metricBox(L - 0.3, 5.4, 0.05), M(m, mat(0, 2.7, -GAL + 0.05)))
  // upper gallery floor, balustrade, columns, architrave
  b.add('banWall', metricBox(L, 0.4, GAL), M(m, mat(0, 5.9, -GAL / 2)))
  for (let i = 0; i < bays; i++) {
    const ua = -L / 2 + bw * i + 0.3
    const ub = -L / 2 + bw * (i + 1) - 0.3
    const pa = V().setFromMatrixPosition(M(m, mat(ua, 6.1, -0.25)))
    const pc = V().setFromMatrixPosition(M(m, mat(ub, 6.1, -0.25)))
    balustrade(b, pa, pc, 1.0, 0.34)
  }
  for (let i = 0; i <= bays; i++) {
    const u = -L / 2 + bw * i
    const p = V().setFromMatrixPosition(M(m, mat(u, 0, -0.3)))
    b.add('banStone', new THREE.CylinderGeometry(0.2, 0.24, 4.5, 12), mat(p.x, 6.1 + 0.2 + 2.25, p.z))
    b.block('banStone', 0.6, 0.2, 0.6, p.x, 6.1, p.z)
    b.block('banStone', 0.6, 0.22, 0.6, p.x, 10.75, p.z)
  }
  b.add('banStone', metricBox(L + 0.2, 0.5, 0.6), M(m, mat(0, 11.2, -0.3)))
  b.add('banWall', metricBox(L, 1.2, 0.3), M(m, mat(0, 12.05, -0.15)))
  b.add('banStone', metricBox(L + 0.3, 0.3, 0.7), M(m, mat(0, EAVE_C - 0.3, -0.2)))
  // back wall openings (upper windows + ground doors / windows)
  for (let i = 0; i < bays; i++) {
    const u = (u0 + u1) / 2 + (-L / 2 + bw * (i + 0.5))
    if (i === passage) continue
    const backPlane = face[0] === '+' ? plane - GAL : plane + GAL
    window_(b, face, backPlane, u, 7.0, { type: 'segment', w: 1.3, h: 2.4, frame: 0.16, frameKey: 'banStone', glassKey: 'glassC', inset: 0.03, bars: [2, 3] })
  }
}

/** Gable roof over a side wing (ridge along X), ends buried in the front / rear roofs. */
function sideRoof(b: Builder, x0: number, x1: number, zc: number, hd: number) {
  const ey = EAVE_C - OV * T
  const he = hd + OV
  const ry = ey + he * T
  facet(b, 'tileRed', [V(x0, ey, zc + he), V(x1, ey, zc + he), V(x1, ry, zc), V(x0, ry, zc)], { thickness: 0.12 })
  facet(b, 'tileRed', [V(x1, ey, zc - he), V(x0, ey, zc - he), V(x0, ry, zc), V(x1, ry, zc)], { thickness: 0.12 })
  b.beam('tileBrown', V(x0, ry + 0.06, zc), V(x1, ry + 0.06, zc), 0.3, 0.16)
  for (const s of [-1, 1]) b.beam(CU, V(x0, ey - 0.05, zc + s * (he + 0.05)), V(x1, ey - 0.05, zc + s * (he + 0.05)), 0.28, 0.22)
  return { ey, ry }
}

function build(): Builder {
  const b = new Builder()

  /* ================= wall volumes ================= */
  // front wing
  wing(b, XFI, XF, ZS, ZN, CORN)
  // rear wing (solid part behind its gallery)
  wing(b, XR, XRI - GAL, ZS, ZN, EAVE_C)
  // side wings (solid part behind the galleries)
  wing(b, XRI - GAL, XFI, ZNI + GAL, ZN, EAVE_C)
  wing(b, XRI - GAL, XFI, ZS, -ZNI - GAL, EAVE_C)
  // gallery corner piers
  for (const sz of [-1, 1]) {
    b.block('banWall', GAL, EAVE_C, GAL, XRI - GAL / 2, 0, sz * (ZNI + GAL / 2))
  }

  /* ================= courtyard galleries ================= */
  // side wings: arcade planes at z = ±ZNI, along x from XRI to XFI
  gallery(b, '-z', ZNI, -XFI, -XRI, 10) // north wing, facing -Z (u = -x)
  gallery(b, '+z', -ZNI, XRI, XFI, 10) // south wing, facing +Z
  // rear wing: arcade plane x = XRI facing +X; u = -z; central carriage passage
  gallery(b, '+x', XRI, -ZNI, ZNI, 7, 3)
  // front wing courtyard wall: windows and the gateway
  {
    const face: Face = '-x'
    for (const z of [-11.2, -7.6, -4.0, 4.0, 7.6, 11.2]) {
      lowerWindow(b, face, XFI, z, 1.8, 1.3, 2.2)
      upperWindow(b, face, XFI, z, 7.4, 1.3, 2.4, false)
    }
    const m = faceFrame(face, XFI, 0, 0, 0)
    b.add('banStone', extrude(frameShape('round', 3.6, 4.8, 0.35, 0, 0), 0.2), m)
    b.add('banShade', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 3.6, 4.8, 0, 0, 12))), M(m, mat(0, 0, 0.03)))
    upperWindow(b, face, XFI, 0, 7.4, 1.3, 2.4, false)
  }

  /* ================= square façade (+X) ================= */
  const face: Face = '+x'
  const bayW = (ZN - RIS.hz) / 5
  // rusticated ground storey: horizontal joints
  for (const sz of [-1, 1]) {
    const zc = sz * (RIS.hz + (ZN - RIS.hz) / 2)
    for (let y = 1.3; y < STRING - 0.4; y += 0.55) b.block('banStone', 0.06, 0.06, ZN - RIS.hz, XF + 0.03, y, zc)
  }
  for (let i = 0; i < 5; i++) {
    for (const sz of [-1, 1]) {
      const z = sz * (RIS.hz + bayW * (i + 0.5))
      lowerWindow(b, face, XF, -z, 1.8)
      upperWindow(b, face, XF, -z, 7.6)
    }
  }
  // pilasters: rusticated below, with capitals above
  for (let i = 0; i <= 5; i++) {
    for (const sz of [-1, 1]) {
      const z = sz * (RIS.hz + bayW * i)
      const w = i === 5 ? 0.9 : 0.62
      for (let y = 0.8; y < STRING - 0.4; y += 0.55) b.block('banStone', 0.18, 0.46, w + 0.1, XF + 0.09, y, z)
      b.block('banStone', 0.16, ENT - STRING - 0.6, w, XF + 0.08, STRING + 0.1, z)
      b.block('banStone', 0.3, 0.45, w + 0.2, XF + 0.15, ENT - 0.5, z)
    }
  }
  // entablature, cornice, attic with balustrade, statues, urns
  b.block('banStone', 0.3, 0.6, ZN * 2, XF + 0.15, ENT, 0)
  b.block('banStone', 0.7, 0.35, ZN * 2 + 0.6, XF + 0.3, ENT + 0.6, 0)
  b.block('banStone', 1.0, 0.25, ZN * 2 + 0.9, XF + 0.4, CORN - 0.25, 0)
  b.block(CU, 1.04, 0.04, ZN * 2 + 0.94, XF + 0.42, CORN, 0)
  b.block('banWall', 0.5, 1.05, ZN * 2, XF - 0.1, CORN, 0)
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const za = sz * (RIS.hz + bayW * i + 0.35)
      const zb = sz * (RIS.hz + bayW * (i + 1) - 0.35)
      balustrade(b, V(XF + 0.25, CORN, za), V(XF + 0.25, CORN, zb), 0.95, 0.3)
    }
    for (let i = 0; i <= 5; i++) {
      const z = sz * (RIS.hz + bayW * i)
      b.block('banStone', 0.6, 1.05, 0.6, XF + 0.25, CORN, z)
      if (i === 0 || i === 3 || i === 5) statue(b, XF + 0.25, CORN + 1.05, z, 1.25)
      else urn(b, XF + 0.25, CORN + 1.05, z, 1.0)
    }
  }

  /* ================= central risalit ================= */
  {
    const xr = RIS.x
    const hz = RIS.hz
    // ground storey block (rusticated) with three arched portals
    b.block('banWall', xr - XF + 0.02, STRING, hz * 2, (XF + xr) / 2, 0, 0)
    b.block('banSocle', xr - XF + 0.18, 0.8, hz * 2 + 0.16, (XF + xr) / 2, 0, 0)
    for (let y = 1.3; y < STRING - 0.2; y += 0.55) b.block('banStone', 0.06, 0.06, hz * 2, xr + 0.03, y, 0)
    const fm = faceFrame(face, xr, 0, 0, 0)
    const portals: [number, number, number][] = [
      [0, 3.6, 5.0],
      [-4.4, 1.6, 3.8],
      [4.4, 1.6, 3.8],
    ]
    for (const [u, w, h] of portals) {
      b.add('banStone', extrude(frameShape('round', w, h, 0.4, u, 0), 0.25), fm)
      b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, 0, 12))), M(fm, mat(0, 0, 0.03)))
      // wrought-iron fanlight bars
      for (let k = -2; k <= 2; k++) b.add('iron', metricBox(0.04, w * 0.42, 0.04), M(fm, mat(u + k * (w / 6), h - w * 0.28, 0.06)))
    }
    for (const u of [-6.5, -2.4, 2.4, 6.5]) for (let y = 0.8; y < STRING - 0.3; y += 0.55) b.add('banStone', metricBox(0.9, 0.46, 0.18), M(fm, mat(u, y + 0.23, 0.09)))
    // balcony slab + balustrade
    b.block('banStone', xr - XF + 0.5, 0.4, hz * 2 + 0.4, (XF + xr) / 2 + 0.25, STRING - 0.2, 0)
    for (const [za, zb] of [
      [-hz + 0.2, -3.6],
      [-2.8, 2.8],
      [3.6, hz - 0.2],
    ])
      balustrade(b, V(xr + 0.25, STRING + 0.2, za), V(xr + 0.25, STRING + 0.2, zb), 1.0, 0.3)
    // loggia: recessed wall with four arched French windows, columns in front
    b.block('banWall', 0.3, ENT - STRING, hz * 2, XF + 0.15, STRING, 0)
    for (const z of [-4.8, -1.6, 1.6, 4.8]) {
      window_(b, face, XF + 0.3, -z, STRING + 0.5, { type: 'round', w: 1.5, h: 3.6, frame: 0.2, frameKey: 'banStone', glassKey: 'glassC', inset: 0.04 })
      window_(b, face, XF + 0.3, -z, STRING + 0.5, { type: 'round', w: 1.4, h: 3.55, frame: 0.06, frameKey: 'banFrame', glassKey: 'glassC', inset: 0.05, bars: [2, 4] })
    }
    b.block('banShade', xr - XF - 0.3, 0.05, hz * 2 - 0.4, (XF + xr) / 2 + 0.15, ENT - 0.05, 0)
    const colZ = [-6.75, -6.05, -3.2, 0, 3.2, 6.05, 6.75]
    for (const z of colZ) {
      const x = xr - 0.35
      b.add('banStone', new THREE.CylinderGeometry(0.21, 0.25, ENT - STRING - 1.1, 14), mat(x, STRING + 0.55 + (ENT - STRING - 1.1) / 2, z))
      b.block('banStone', 0.62, 0.35, 0.62, x, STRING + 0.2, z)
      b.add('banStone', new THREE.CylinderGeometry(0.34, 0.22, 0.4, 12), mat(x, ENT - 0.55, z))
      b.block('banStone', 0.72, 0.15, 0.72, x, ENT - 0.38, z)
    }
    // entablature + cornice of the risalit
    b.block('banStone', xr - XF + 0.1, 0.62, hz * 2 + 0.3, (XF + xr) / 2, ENT - 0.22, 0)
    b.block('banStone', xr - XF + 0.9, 0.35, hz * 2 + 0.9, (XF + xr) / 2 + 0.3, ENT + 0.4, 0)
    b.block('banStone', xr - XF + 1.2, 0.3, hz * 2 + 1.2, (XF + xr) / 2 + 0.4, CORN - 0.45, 0)
    b.block(CU, xr - XF + 1.24, 0.04, hz * 2 + 1.24, (XF + xr) / 2 + 0.4, CORN - 0.15, 0)

    // curved copper hood (bell profile) rising from the risalit cornice into the main roof
    const xb = 26.5
    const st: [number, number, number][] = [
      [xr + 0.75, hz + 0.6, CORN - 0.12],
      [xr + 0.7, hz + 0.56, CORN + 0.45],
      [xr + 0.45, hz + 0.42, CORN + 1.05],
      [xr + 0.0, hz + 0.12, CORN + 1.55],
      [xr - 0.7, hz - 0.35, CORN + 2.0],
      [xr - 1.6, hz - 0.95, CORN + 2.35],
      [xr - 2.8, hz - 1.75, CORN + 2.6],
      [xr - 4.0, hz - 2.6, CORN + 2.7],
    ]
    const rings = st.map(([x, h, y]) => [V(xb, y, -h), V(x, y, -h), V(x, y, h), V(xb, y, h)])
    const hood = new Builder()
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i]
      const c = rings[i + 1]
      facet(hood, CU, [a[1], a[2], c[2], c[1]], { hint: V(1, 0.3, 0) })
      facet(hood, CU, [a[2], a[3], c[3], c[2]], { hint: V(0, 0.3, 1) })
      facet(hood, CU, [a[0], a[1], c[1], c[0]], { hint: V(0, 0.3, -1) })
    }
    const top = rings[rings.length - 1]
    facet(hood, CU, top)
    b.merge(hood)
    // standing seams on the front face of the hood
    for (let k = -12; k <= 12; k++) {
      const z = k * 0.5
      for (let i = 0; i < st.length - 1; i++) {
        const [x0, h0, y0] = st[i]
        const [x1, h1, y1] = st[i + 1]
        if (Math.abs(z) > Math.min(h0, h1) - 0.15) continue
        b.beam(CU, V(x0 + 0.03, y0, z), V(x1 + 0.03, y1, z), 0.04, 0.05, V(1, 0.4, 0))
      }
    }
    // coat-of-arms group with griffins on the cornice, in front of the hood
    const gx = xr + 0.3
    const gy = CORN - 0.1
    b.block('banStone', 1.0, 0.8, 4.2, gx, gy, 0)
    b.block('banStone', 1.2, 0.15, 4.4, gx, gy + 0.8, 0)
    b.add('banStone', new THREE.SphereGeometry(1.0, 16, 12), mat(gx, gy + 2.25, 0, 0, 0, 0, 0.32, 1.25, 0.95))
    b.add('banStone', new THREE.TorusGeometry(0.95, 0.09, 6, 20), mat(gx + 0.25, gy + 2.25, 0, Math.PI / 2, 0, 0, 1, 1.25, 1))
    b.add('banStone', new THREE.SphereGeometry(0.45, 12, 10), mat(gx - 0.05, gy + 3.7, 0, 0, 0, 0, 0.8, 0.75, 1.0))
    for (const sz of [-1, 1]) {
      b.add('banStone', new THREE.SphereGeometry(0.55, 12, 10), mat(gx, gy + 1.45, sz * 1.45, 0, 0, 0, 0.8, 1.15, 0.9))
      b.add('banStone', new THREE.SphereGeometry(0.28, 10, 8), mat(gx + 0.1, gy + 2.35, sz * 1.25))
      b.add('banStone', metricBox(0.14, 1.2, 0.8), mat(gx - 0.1, gy + 2.1, sz * 1.75, 0, sz * 0.45, 0))
    }
  }

  /* ================= roofs ================= */
  // front wing: hipped, red tile
  {
    const ey = EAVE_F - OV * T
    const r = hipRoof((XFI + XF) / 2, 0, XF - XFI + 2 * OV, ZN * 2 + 2 * OV, ey, PITCH * D2R)
    for (const f of r.facets) facet(b, 'tileRed', f, { thickness: 0.12 })
    for (const [a, c] of r.lines) b.beam('tileBrown', a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.3, 0.16)
    // copper eave apron + gutter all round
    const x0 = XFI - OV
    const x1 = XF + OV
    const z0 = ZS - OV
    const z1 = ZN + OV
    const e = [V(x0, ey - 0.06, z0), V(x1, ey - 0.06, z0), V(x1, ey - 0.06, z1), V(x0, ey - 0.06, z1)]
    for (let i = 0; i < 4; i++) b.beam(CU, e[i], e[(i + 1) % 4], 0.3, 0.24)
    // dormers on the square slope: two per half-façade
    for (const sz of [-1, 1]) {
      for (const i of [1, 3]) {
        const z = sz * (RIS.hz + bayW * (i + 0.5))
        const xd = XF - 1.4
        placeDormer(b, xd, ey + (x1 - xd) * T - 0.05, z, 1, 0)
      }
    }
    // courtyard slope dormers
    for (const z of [-10, -4, 4, 10]) {
      const xd = XFI + 1.4
      placeDormer(b, xd, ey + (xd - x0) * T - 0.05, z, -1, 0)
    }
    chimney(b, (XFI + XF) / 2, r.top - 0.6, 7.5)
    chimney(b, (XFI + XF) / 2, r.top - 0.6, -7.5)
  }
  // rear wing: hipped, red tile
  {
    const ey = EAVE_C - OV * T
    const x0 = XR - OV
    const x1 = XRI - GAL + OV + GAL // eave over the gallery
    const r = hipRoof((x0 + x1) / 2, 0, x1 - x0, ZN * 2 + 2 * OV, ey, PITCH * D2R)
    for (const f of r.facets) facet(b, 'tileRed', f, { thickness: 0.12 })
    for (const [a, c] of r.lines) b.beam('tileBrown', a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.3, 0.16)
    const z0 = ZS - OV
    const z1 = ZN + OV
    const e = [V(x0, ey - 0.06, z0), V(x1, ey - 0.06, z0), V(x1, ey - 0.06, z1), V(x0, ey - 0.06, z1)]
    for (let i = 0; i < 4; i++) b.beam(CU, e[i], e[(i + 1) % 4], 0.3, 0.24)
    for (const z of [-7.8, 0, 7.8]) {
      const xd = x1 - 1.5
      placeDormer(b, xd, ey + (x1 - xd) * T - 0.05, z, 1, 0)
    }
    for (const z of [-14, -4.5, 4.5, 14]) {
      const xd = x0 + 1.5
      placeDormer(b, xd, ey + (xd - x0) * T - 0.05, z, -1, 0)
    }
    chimney(b, (x0 + x1) / 2, r.top - 0.6, 12)
    chimney(b, (x0 + x1) / 2, r.top - 0.6, -12)
  }
  // side wings: gable roofs (over solid part + gallery) running into the front and rear roofs
  for (const sz of [-1, 1]) {
    const zc = sz * ((ZNI + ZN) / 2)
    const hd = (ZN - ZNI) / 2
    const { ey } = sideRoof(b, XRI - 5, XFI + 5.0, zc, hd)
    // dormers on the outer and courtyard slopes
    for (const x of [-15, -7.5, 0, 7.5]) {
      const zo = sz * (ZN + OV - 1.5)
      placeDormer(b, x, ey + 1.5 * T - 0.05, zo, 0, sz)
      if (x !== -15) {
        const zi = sz * (ZNI - OV + 1.5)
        placeDormer(b, x + 3.75, ey + 1.5 * T - 0.05, zi, 0, -sz)
      }
    }
    chimney(b, -3.5, EAVE_C + 3.6, zc + sz * 1.0)
  }

  /* ================= outer elevations of side and rear wings ================= */
  for (const sz of [-1, 1]) {
    const f: Face = sz > 0 ? '+z' : '-z'
    const plane = sz * ZN
    for (let i = 0; i < 15; i++) {
      const x = XR + 2.6 + i * 4.3
      if (x > XF - 2) break
      const u = sz > 0 ? x : -x
      lowerWindow(b, f, plane, u, 1.9, 1.3, 2.2)
      upperWindow(b, f, plane, u, 7.5, 1.3, 2.4, false)
    }
  }
  for (let i = -4; i <= 4; i++) {
    const z = i * 4.9
    lowerWindow(b, '-x', XR, z, 1.9, 1.3, 2.2)
    upperWindow(b, '-x', XR, z, 7.5, 1.3, 2.4, false)
  }

  /* ================= copper downpipes ================= */
  for (const z of [ZS + 0.4, -RIS.hz - 0.35, RIS.hz + 0.35, ZN - 0.4]) b.rod(CU, V(XF + 0.2, 0.3, z), V(XF + 0.2, EAVE_F - 0.4, z), 0.07, 8)
  for (const x of [XR + 0.4, XFI - 2]) for (const sz of [-1, 1]) b.rod(CU, V(x, 0.3, sz * (ZN + 0.2)), V(x, EAVE_C - 0.4, sz * (ZN + 0.2)), 0.07, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [33.0, 15.0, 0],
  materials: () => ({
    banWall: new THREE.MeshStandardMaterial({ color: '#e3d3a8', roughness: 0.9 }),
    banStone: new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.85 }),
    banSocle: new THREE.MeshStandardMaterial({ color: '#cfc3a4', roughness: 0.9 }),
    banFrame: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.6 }),
    banShade: new THREE.MeshStandardMaterial({ color: '#4a4339', roughness: 0.95 }),
  }),
  notes:
    'Late-Baroque courtyard palace with red-tile hipped roofs; copper shown on the dormers, eave aprons, gutters and the hood of the central risalit (register 2021, photographs predate the works); ornament simplified.',
}
export default model
