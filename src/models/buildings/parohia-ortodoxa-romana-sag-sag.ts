/**
 * Orthodox church „Adormirea Maicii Domnului", Șag (Timiș) — brick church of
 * 1776 (commune history page), OSM way 1035939649 (19-point outline 26.1 ×
 * 10.3 m, long axis 90°, height tag 10 m).
 *
 * Modelling specification derived from four public reference photographs
 * (a 2020 overall view from the street with the tower under scaffolding and
 * three 2026 views of the south/north side, the choir apse and a side portal)
 * and the OSM outline; real metres, +X = east (altar apse), tower at −X:
 *  - Hall nave 10.3 m wide, a narrower choir (8.7 m) closed by a semicircular
 *    apse (rounded end of the outline).
 *  - Nave elevations articulated by broad white pilasters carrying large
 *    blind arches; round-arched windows with brown frames sit inside the
 *    arches, one bay per side carries a mosaic icon niche, one a portal with
 *    an icon above; dark red-brown socle, cream plaster.
 *  - Roofs: red clay-tile roof (as photographed 2026), hipped at the east
 *    end of the nave; the lower choir roof runs into the hip and ends in a
 *    tiled half-cone over the apse; brown gutters and downpipes.
 *  - West tower (4.4 m square) rising from the façade: belfry stage with
 *    stepped white corner pilasters, louvred arched openings under a
 *    segmental „eyebrow" pediment, round clocks above; baroque helm: squat
 *    ogee bell, octagonal lantern with arched openings, small cap, slender
 *    spire, globe and cross (≈25.7 m).
 *  - METAL: the roofs are tiled; the register of COLOR METAL lists copper
 *    strip for this parish (2022). The only plausible copper element on the
 *    photographed church is the tower helm (and flashings/gutters), which no
 *    available photograph shows after 2022 — it is therefore shown in
 *    weathered (dark brown) copper with standing ribs, and this is an
 *    interpretation, not a documented fact.
 * Approximations: heights from the OSM height tag and the photographs (eave
 * 6.3 m, ridge ≈10.6 m, tower cornice ≈16.5 m); west façade not photographed
 * (typical Banat gable with shoulders and a central tower door assumed);
 * helm profile from one distant 2020 photograph; bay rhythm mirrored on the
 * unphotographed side.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, cross, faceFrame, polyRing, loft } from '../kit'
import type { OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- dimensions (m) ---------------- */
const XW = -13.05 // west façade
const XN = 6.9 // nave → choir
const XA = 8.7 // apse centre (choir straight part ends)
const NHW = 5.17
const CHW = 4.35
const EAVE = 6.3
const CEAVE = 6.0
const PITCH = 42
const TP = Math.tan(PITCH * D2R)
const RIDGE = EAVE + NHW * TP
const CRIDGE = CEAVE + CHW * TP
const OV = 0.45
const TW = { x0: XW, x1: XW + 4.4, hw: 2.2, top: 17.0 }

const WALL = 'plasterCream'
const WHITE = 'plasterWhite'
const TILE = 'tileRed'
const CU = 'copperBrown'

function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number, o: { fill?: string; frame?: string; surround?: number; sill?: boolean } = {}) {
  b.add(o.fill ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(o.frame ?? 'sgFrame', extrude(frameShape(type, w - 0.02, h - 0.02, 0.08, 0, y0), 0.06), m)
  const sw = o.surround ?? 0.16
  if (sw > 0) b.add(WHITE, extrude(frameShape(type, w + 0.06, h + 0.04, sw, 0, y0 - 0.04), 0.08), m)
  if (o.sill !== false) b.add(WHITE, metricBox(w + 2 * sw + 0.15, 0.1, 0.2), M(m, mat(0, y0 - sw - 0.02, 0.08)))
}

function pil(b: Builder, m: THREE.Matrix4, u: number, w: number, y0: number, y1: number, d = 0.16) {
  b.add(WHITE, metricBox(w, y1 - y0, d), M(m, mat(u, (y0 + y1) / 2, d / 2)))
}

/** Blind arch (white archivolt) between two pilasters, springing at ys. */
function blindArch(b: Builder, m: THREE.Matrix4, u0: number, u1: number, ys: number) {
  const r = (u1 - u0) / 2
  const sh = new THREE.Shape()
  const seg = 18
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI - (i / seg) * Math.PI
    const p = [(u0 + u1) / 2 + Math.cos(a) * (r + 0.16), ys + Math.sin(a) * (r + 0.16)]
    if (i === 0) sh.moveTo(p[0], p[1])
    else sh.lineTo(p[0], p[1])
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    sh.lineTo((u0 + u1) / 2 + Math.cos(a) * (r - 0.14), ys + Math.sin(a) * (r - 0.14))
  }
  b.add(WHITE, extrude(sh, 0.13), m)
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- walls ---------------- */
  const nl = XN - XW
  b.block(WALL, nl, EAVE, NHW * 2, (XW + XN) / 2, 0, 0)
  b.block(WALL, XA - XN + 0.01, CEAVE, CHW * 2, (XN + XA) / 2, 0, 0)
  b.add(WALL, new THREE.CylinderGeometry(CHW, CHW, CEAVE, 40, 1, false, 0, Math.PI), mat(XA, CEAVE / 2, 0))
  // socle (dark red-brown)
  b.block('sgSocle', nl + 0.16, 0.6, NHW * 2 + 0.16, (XW + XN) / 2, 0, 0)
  b.block('sgSocle', XA - XN, 0.6, CHW * 2 + 0.16, (XN + XA) / 2, 0, 0)
  b.add('sgSocle', new THREE.CylinderGeometry(CHW + 0.08, CHW + 0.08, 0.6, 40, 1, false, 0, Math.PI), mat(XA, 0.3, 0))
  // cornices
  b.block(WHITE, nl + 0.3, 0.32, NHW * 2 + 0.34, (XW + XN) / 2, EAVE - 0.4, 0)
  b.block(WHITE, XA - XN, 0.3, CHW * 2 + 0.32, (XN + XA) / 2, CEAVE - 0.38, 0)
  b.add(WHITE, new THREE.CylinderGeometry(CHW + 0.16, CHW + 0.16, 0.3, 40, 1, false, 0, Math.PI), mat(XA, CEAVE - 0.23, 0))

  /* ---------------- nave sides: pilasters, blind arches, windows ---------------- */
  const pils = [XW + 0.3, -9.4, -5.3, -1.2, 2.9, XN - 0.3]
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number) => faceFrame(face, s * NHW, s > 0 ? x : -x)
    const base = faceFrame(face, s * NHW, 0)
    const mirror = (x: number) => (s > 0 ? x : -x)
    for (const x of pils) pil(b, at(x), 0, 0.75, 0.6, EAVE - 0.4)
    for (let i = 0; i < pils.length - 1; i++) {
      const u0 = pils[i] + 0.38
      const u1 = pils[i + 1] - 0.38
      const xm = (pils[i] + pils[i + 1]) / 2
      // archivolt in façade-local u (mirrored for the −z face)
      const a0 = Math.min(mirror(u0), mirror(u1))
      const a1 = Math.max(mirror(u0), mirror(u1))
      blindArch(b, base, a0, a1, Math.max(3.0, EAVE - 0.55 - (u1 - u0) / 2))
      if (i === 2) {
        // middle bay: portal (south) or mosaic icon niche (north)
        if (s > 0) {
          win(b, at(xm), 'round', 1.6, 2.7, 0.15, { fill: 'wood', sill: false, surround: 0.2 })
          win(b, at(xm), 'round', 1.0, 1.5, 3.4, { fill: 'sgMosaic', sill: false, surround: 0.1 })
        } else win(b, at(xm), 'round', 1.0, 1.9, 2.4, { fill: 'sgMosaic', surround: 0.12 })
      } else win(b, at(xm), 'round', 1.2, 2.5, 2.3)
    }
    // choir: one window per side
    const cm = faceFrame(face, s * CHW, s > 0 ? (XN + XA) / 2 : -(XN + XA) / 2)
    win(b, cm, 'round', 1.0, 2.1, 2.4)
    // gutters + downpipes (brown copper)
    const gy = EAVE - OV * TP - 0.08
    b.beam(CU, V(XW - 0.1, gy, s * (NHW + OV + 0.05)), V(XN + OV, gy, s * (NHW + OV + 0.05)), 0.14, 0.14)
    for (const x of [XW + 0.7, XN - 0.7]) b.rod(CU, V(x, 0.3, s * (NHW + 0.12)), V(x, gy, s * (NHW + 0.12)), 0.055, 8)
  }
  // apse: white pilaster strips
  for (const a of [Math.PI / 2 - 0.7, Math.PI / 2, Math.PI / 2 + 0.7]) {
    const m = mat(XA + CHW * Math.sin(a), 0, CHW * Math.cos(a), a)
    pil(b, m, 0, 0.6, 0.6, CEAVE - 0.38, 0.12)
  }

  /* ---------------- west façade & gable ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    for (const u of [-NHW + 0.35, NHW - 0.35, -TW.hw - 0.3, TW.hw + 0.3]) pil(b, m, u, 0.7, 0.6, EAVE - 0.4)
    win(b, m, 'round', 1.6, 2.9, 0.15, { fill: 'wood', sill: false, surround: 0.22 })
    win(b, m, 'round', 1.0, 1.6, 3.6, { fill: 'sgMosaic', sill: false, surround: 0.12 })
    for (const u of [-3.7, 3.7]) win(b, M(m, mat(u, 0, 0)), 'round', 1.0, 2.2, 2.6)
    // gable with curved shoulders against the tower
    const g: [number, number][] = [
      [-NHW - 0.05, EAVE - 0.05],
      [-4.1, EAVE + 0.55],
      [-3.4, EAVE + 1.4],
      [-2.75, EAVE + 2.1],
      [-TW.hw, EAVE + 2.9],
    ]
    const pts = [...g, [-TW.hw, EAVE - 0.05] as [number, number]]
    for (const sg of [-1, 1]) {
      const shape = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(sg * u, y)))
      b.add(WALL, extrude(shape, 0.5), M(m, mat(0, 0, -0.5)))
      for (let i = 0; i < g.length - 1; i++) {
        const [u1, y1] = g[i]
        const [u2, y2] = g[i + 1]
        b.beam(WHITE, V(XW - 0.1, y1 + 0.08, -sg * u1), V(XW - 0.1, y2 + 0.08, -sg * u2), 0.18, 0.32, V(-1, 0, 0))
      }
    }
  }

  /* ---------------- roofs (red clay tile) ---------------- */
  {
    const ye = EAVE - OV * TP
    const he = NHW + OV
    const xa = XW + 0.3
    const apexX = XN - NHW // east hip apex (same pitch)
    const xe = XN + OV
    facet(b, TILE, [V(xa, ye, he), V(xe, ye, he), V(apexX, RIDGE, 0), V(xa, RIDGE, 0)], { thickness: 0.12 })
    facet(b, TILE, [V(xe, ye, -he), V(xa, ye, -he), V(xa, RIDGE, 0), V(apexX, RIDGE, 0)], { thickness: 0.12 })
    facet(b, TILE, [V(xe, ye, he), V(xe, ye, -he), V(apexX, RIDGE, 0)], { thickness: 0.12, hint: V(1, 1, 0) })
    b.beam('sgRidge', V(xa, RIDGE + 0.08, 0), V(apexX, RIDGE + 0.08, 0), 0.28, 0.2)
    for (const sz of [-1, 1]) b.beam('sgRidge', V(xe, ye + 0.08, sz * he), V(apexX, RIDGE + 0.08, 0), 0.26, 0.18)
    // choir roof running into the nave hip
    const cye = CEAVE - OV * TP
    const che = CHW + OV
    const cx0 = apexX + (RIDGE - CRIDGE) / TP
    facet(b, TILE, [V(cx0, cye, che), V(XA, cye, che), V(XA, CRIDGE, 0), V(cx0, CRIDGE, 0)], { thickness: 0.1 })
    facet(b, TILE, [V(XA, cye, -che), V(cx0, cye, -che), V(cx0, CRIDGE, 0), V(XA, CRIDGE, 0)], { thickness: 0.1 })
    b.beam('sgRidge', V(cx0, CRIDGE + 0.07, 0), V(XA, CRIDGE + 0.07, 0), 0.26, 0.18)
    // half-cone over the apse
    const apex = V(XA, CRIDGE, 0)
    const n = 24
    const ring: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      ring.push(V(XA + Math.sin(a) * che, cye, Math.cos(a) * che))
    }
    for (let i = 0; i < n; i++) facet(b, TILE, [ring[i], ring[i + 1], apex], { thickness: 0.08 })
    for (let i = 0; i < n; i++) b.beam(CU, ring[i].clone().add(V(0, -0.08, 0)), ring[i + 1].clone().add(V(0, -0.08, 0)), 0.13, 0.13)
    for (const sz of [-1, 1]) b.beam(CU, V(XN, cye - 0.08, sz * (che + 0.04)), V(XA, cye - 0.08, sz * (che + 0.04)), 0.13, 0.13)
    // small finial cross over the apse
    b.add(CU, new THREE.SphereGeometry(0.16, 12, 8), mat(XA, CRIDGE + 0.2, 0))
    cross(b, 'gilt', XA, CRIDGE + 0.2, 0, 1.0, false, Math.PI / 2)
  }

  /* ---------------- tower ---------------- */
  {
    const cx = (TW.x0 + TW.x1) / 2
    const hw = TW.hw
    const yb = EAVE - 0.4
    b.block(WALL, hw * 2, TW.top - yb, hw * 2, cx, yb, 0)
    // plinth band at ridge level, belfry band, cornice
    b.block(WHITE, hw * 2 + 0.3, 0.45, hw * 2 + 0.3, cx, RIDGE + 0.1, 0)
    b.block(WHITE, hw * 2 + 0.24, 0.3, hw * 2 + 0.24, cx, 14.15, 0)
    b.block(WHITE, hw * 2 + 0.3, 0.3, hw * 2 + 0.3, cx, TW.top - 0.3, 0)
    b.block(WHITE, hw * 2 + 0.6, 0.22, hw * 2 + 0.6, cx, TW.top, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? cx + (face[0] === '+' ? hw : -hw) : face[0] === '+' ? hw : -hw
      const m = faceFrame(face, plane, face === '+z' ? cx : face === '-z' ? -cx : 0)
      const y0 = RIDGE + 0.55
      for (const su of [-1, 1]) {
        pil(b, m, su * (hw - 0.28), 0.55, y0, TW.top - 0.3, 0.12)
        pil(b, m, su * (hw - 0.68), 0.25, y0 + 0.3, TW.top - 0.6, 0.06)
      }
      // louvred belfry opening with an eyebrow pediment
      win(b, m, 'round', 1.0, 2.1, 11.95, { fill: 'black', surround: 0.16 })
      for (let k = 0; k < 4; k++) b.add('wood', metricBox(0.95, 0.06, 0.1), M(m, mat(0, 12.25 + k * 0.38, 0.05, 0, 0.5)))
      const eb = new THREE.Shape()
      eb.moveTo(-0.85, 0)
      eb.lineTo(0.85, 0)
      eb.quadraticCurveTo(0, 0.75, -0.85, 0)
      b.add(WHITE, extrude(eb, 0.18, 10), M(m, mat(0, 14.45, 0)))
      // clock
      b.add('clock', new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24), M(m, mat(0, 15.75, 0.05, 0, Math.PI / 2)))
      b.add(WHITE, new THREE.TorusGeometry(0.52, 0.05, 4, 24), M(m, mat(0, 15.75, 0.09)))
      b.add('gilt', metricBox(0.05, 0.38, 0.03), M(m, mat(0, 15.87, 0.12)))
      b.add('gilt', metricBox(0.28, 0.05, 0.03), M(m, mat(0.11, 15.75, 0.12)))
    }

    /* baroque helm in (weathered) copper */
    const y0 = TW.top + 0.22
    const bell: [number, number][] = [
      [1.95, y0],
      [1.9, y0 + 0.2],
      [1.72, y0 + 0.55],
      [1.42, y0 + 0.9],
      [1.1, y0 + 1.15],
      [0.95, y0 + 1.3],
    ]
    helm(b, CU, { x: cx, z: 0, n: 8, stations: bell })
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k / 8) * Math.PI * 2
      for (let i = 0; i < bell.length - 1; i++) {
        const [r0, h0] = bell[i]
        const [r1, h1] = bell[i + 1]
        b.beam(CU, V(cx + Math.cos(a) * r0, h0, Math.sin(a) * r0), V(cx + Math.cos(a) * r1, h1, Math.sin(a) * r1), 0.07, 0.07)
      }
    }
    // lantern
    const ly = y0 + 1.3
    const lr = 0.9
    const lh = 2.0
    b.add(CU, loft([polyRing(8, lr, ly, Math.PI / 8, cx, 0), polyRing(8, lr, ly + lh, Math.PI / 8, cx, 0)], { capTop: true, flat: true }))
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2
      const ap = lr * Math.cos(Math.PI / 8)
      const m = mat(cx + Math.cos(a) * ap, 0, Math.sin(a) * ap, Math.PI / 2 - a)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.38, 1.1, 0, ly + 0.4, 8))), M(m, mat(0, 0, 0.02)))
    }
    b.add(CU, loft([polyRing(8, lr + 0.22, ly + lh, Math.PI / 8, cx, 0), polyRing(8, lr + 0.22, ly + lh + 0.16, Math.PI / 8, cx, 0)], { capTop: true, capBottom: true, flat: true }))
    // small cap, spire
    const cy = ly + lh + 0.16
    const cap: [number, number][] = [
      [1.0, cy],
      [0.85, cy + 0.25],
      [0.55, cy + 0.5],
      [0.32, cy + 0.65],
      [0.3, cy + 0.8],
      [0.26, cy + 1.0],
      [0.03, cy + 3.3],
    ]
    helm(b, CU, { x: cx, z: 0, n: 8, stations: cap })
    const top = cy + 3.3
    b.add('gilt', new THREE.SphereGeometry(0.2, 14, 10), mat(cx, top + 0.05, 0))
    cross(b, 'gilt', cx, top + 0.05, 0, 1.3, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-10.85, 18.5, 0],
  materials: () => ({
    sgSocle: new THREE.MeshStandardMaterial({ color: '#7d3f33', roughness: 0.85 }),
    sgFrame: new THREE.MeshStandardMaterial({ color: '#7a4a2c', roughness: 0.6 }),
    sgRidge: new THREE.MeshStandardMaterial({ color: '#9a4a33', roughness: 0.8 }),
    sgMosaic: new THREE.MeshStandardMaterial({ color: '#b58a48', roughness: 0.5, metalness: 0.25 }),
  }),
  notes: 'Tiled roofs as photographed; the copper of the register is shown only on the tower helm and gutters (interpretation). West façade and helm detail assumed.',
}
export default model
