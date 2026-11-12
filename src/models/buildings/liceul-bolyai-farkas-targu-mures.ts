/**
 * Liceul Teoretic „Bolyai Farkas” Târgu Mureș — main school building of the
 * former Reformed College, Str. Bolyai 3 (OSM way 31530698).
 *
 * Modelling specification (real metres). +X = azimuth 44.2° (along the main
 * façade, towards Str. Bolyai), +Z = 134.2° = the main façade on the park
 * (photos 01, 02); the plan is the V-shaped OSM outline: main wing 48.4 m ×
 * 13.1 m with rounded outer corners, a south-west arm (≈ 38 m × 11.8 m) and a
 * north-east arm along Str. Bolyai (≈ 25 m × 13.4 m) splaying back around the
 * rear courtyard.
 *  - Storeys (photo 02): socle with basement windows 0–1.4 m, ground floor to
 *    5.6 m, first floor to 10.0 m, tall second floor to 15.6 m, cornice with
 *    the grey Secession frieze, eave 16.2 m.
 *  - Main façade: five-bay centre with a three-bay risalit crowned by the
 *    curved Secession gable (coat-of-arms medallion, twin windows, finial),
 *    big round-arched windows on the second floor, arched entrance portal;
 *    a narrow corner bay towards Str. Bolyai rising above the eave and capped
 *    by a bell-shaped helm (photo 01); rounded corners as in the OSM outline.
 *  - Roofs: hipped, pitch 45°, red tile on the main wing and the south-west
 *    arm as photographed in 2023 (photo 01); the arm along Str. Bolyai in
 *    natural titanium-zinc standing seam (pans 0.55 m) as described for the
 *    2023 photographs of the Bolyai-street wing; the turret helm, gable
 *    copings, cornice cappings and flashings in the same grey titanium-zinc.
 * Approximations: bay widths (≈ 4 m) and storey heights estimated from
 * photos 01–02; the rear (courtyard) façades, the round stair projections of
 * the OSM courtyard side and the outer façades of the arms are simplified to
 * regular window rows; which roof planes received titanium-zinc is not
 * documented beyond the photographs; ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, window_, faceFrame, hippedRoof, seams, prismOutline, lathe, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const X0 = -20.3
const X1 = 28.1
const ZB = 9.5
const ZF = 22.6
const R_SW = 4.0
const R_NE = 3.0
const AXIS = 4.5 // gable axis
const BAY = 4.0
const RIS = { x0: AXIS - 6, x1: AXIS + 6, d: 0.45 }

/* heights */
const SOCLE = 1.4
const F1 = 5.6
const F2 = 10.0
const CORN = 15.6
const EAVE = 16.2
const PITCH = 45
const T = Math.tan(PITCH * D2R)
const OV = 0.45

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.55, 0.05, 0.045)

/** Main-wing plan outline with two rounded front corners, grown by g. */
function outline(g: number): [number, number][] {
  const pts: [number, number][] = []
  const x0 = X0 - g
  const z0 = ZB - g
  pts.push([x0, z0], [X1 + g, z0])
  // NE corner (centre at X1 - R_NE, ZF - R_NE)
  const cxe = X1 - R_NE
  const cze = ZF - R_NE
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    pts.push([cxe + Math.cos(a) * (R_NE + g), cze + Math.sin(a) * (R_NE + g)])
  }
  const cxw = X0 + R_SW
  const czw = ZF - R_SW
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push([cxw + Math.cos(a) * (R_SW + g), czw + Math.sin(a) * (R_SW + g)])
  }
  return pts
}

function arWindow(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: 'rect' | 'round' | 'segment' = 'rect') {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.2, frameKey: 'bolStucco', glassKey: 'glassC', inset: 0.04, sill: true })
  window_(b, face, plane, u, y0, { type, w: w - 0.08, h: h - 0.05, frame: 0.06, frameKey: 'bolFrame', glassKey: 'glassC', inset: 0.05, bars: [type === 'round' ? 3 : 2, 3] })
}

/** Grey Secession ornament: a vertical row of small discs/drops beside a window. */
function drops(b: Builder, m: THREE.Matrix4, u: number, y0: number, n: number) {
  for (let i = 0; i < n; i++) b.add('bolOrn', new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10), M(m, mat(u, y0 + i * 0.42, 0.04, 0, Math.PI / 2)))
}

/** Straight wing in a local frame: along local X from 0 to L, width W (z from -W/2 to W/2), outer face at -Z. */
function armGeo(L: number, W: number, roofKey: string, seamSpec: typeof SEAM | undefined): Builder {
  const a = new Builder()
  a.block('bolWall', L, EAVE - 0.5, W, L / 2, 0, 0)
  a.block('bolSocle', L + 0.12, SOCLE, W + 0.12, L / 2, 0, 0)
  a.block('bolStucco', L + 0.2, 0.3, W + 0.2, L / 2, F1 - 0.3, 0)
  a.block('bolOrn', L + 0.5, 0.45, W + 0.5, L / 2, CORN - 0.45, 0)
  a.block('bolStucco', L + 0.8, 0.3, W + 0.8, L / 2, CORN, 0)
  a.block(ZN, L + 0.84, 0.05, W + 0.84, L / 2, CORN + 0.3, 0)
  const n = Math.floor((L - 7) / 3.8)
  for (const face of ['-z', '+z'] as Face[]) {
    const plane = face === '-z' ? -W / 2 : W / 2
    for (let i = 0; i < n; i++) {
      const x = 7 + (i + 0.5) * ((L - 7) / n)
      const u = face === '-z' ? -x : x
      arWindow(a, face, plane, u, 0.35, 1.0, 0.6)
      arWindow(a, face, plane, u, 2.2, 1.6, 2.5)
      arWindow(a, face, plane, u, 6.4, 1.6, 2.6)
      arWindow(a, face, plane, u, 10.8, 1.6, 3.0)
    }
  }
  // end face windows
  for (const z of [-W / 4, W / 4]) {
    arWindow(a, '+x', L, -z, 2.2, 1.5, 2.5)
    arWindow(a, '+x', L, -z, 6.4, 1.5, 2.6)
    arWindow(a, '+x', L, -z, 10.8, 1.5, 3.0)
  }
  hippedRoof(a, roofKey, { x: L / 2 + 2.5, w: L - 5, d: W, y: EAVE, pitch: PITCH, overhang: OV, seams: seamSpec || false, capKey: roofKey === 'tileRed' ? 'tileBrown' : ZN })
  return a
}

function build(): Builder {
  const b = new Builder()

  /* ================= main wing ================= */
  prismOutline(b, 'bolWall', outline(0), 0, EAVE - 0.4)
  prismOutline(b, 'bolSocle', outline(0.08), 0, SOCLE)
  prismOutline(b, 'bolStucco', outline(0.12), F1 - 0.3, 0.3)
  prismOutline(b, 'bolStucco', outline(0.08), F2 - 0.2, 0.2)
  prismOutline(b, 'bolOrn', outline(0.25), CORN - 0.5, 0.5)
  prismOutline(b, 'bolStucco', outline(0.45), CORN, 0.3)
  prismOutline(b, ZN, outline(0.48), CORN + 0.3, 0.05)

  // central risalit block
  b.block('bolWall', RIS.x1 - RIS.x0, EAVE - 0.4, RIS.d + 0.1, AXIS, 0, ZF + RIS.d / 2 - 0.05)
  b.block('bolSocle', RIS.x1 - RIS.x0 + 0.12, SOCLE, RIS.d + 0.2, AXIS, 0, ZF + RIS.d / 2)
  b.block('bolOrn', RIS.x1 - RIS.x0 + 0.5, 0.5, RIS.d + 0.5, AXIS, CORN - 0.5, ZF + RIS.d / 2)
  b.block('bolStucco', RIS.x1 - RIS.x0 + 0.9, 0.3, RIS.d + 0.9, AXIS, CORN, ZF + RIS.d / 2)

  /* ---- main façade (+Z) ---- */
  const FZ = ZF + RIS.d
  const face: Face = '+z'
  // risalit: entrance portal + windows
  {
    const m = faceFrame(face, FZ, AXIS, 0, 0)
    b.add('bolStucco', extrude(frameShape('round', 2.5, 4.0, 0.55, 0, 0.6), 0.3), m)
    b.add('bolOrn', extrude(frameShape('round', 3.6, 4.6, 0.18, 0, 0.6), 0.36), m)
    b.add('bolFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.5, 4.0, 0, 0.6, 12))), M(m, mat(0, 0, 0.03)))
    for (let s = 0; s < 4; s++) b.block('bolSocle', 3.6 - s * 0.3, 0.2, 0.4, AXIS, s * 0.2, FZ + 1.4 - s * 0.35)
    for (const dx of [-BAY, BAY]) arWindow(b, face, FZ, AXIS + dx, 2.0, 2.0, 2.8, 'rect')
    for (const dx of [-BAY, 0, BAY]) {
      arWindow(b, face, FZ, AXIS + dx, 6.3, 1.9, 3.0, 'round')
      arWindow(b, face, FZ, AXIS + dx, 10.6, 2.1, 3.9, 'round')
      // stucco arch surrounds of the second floor
      b.add('bolStucco', extrude(frameShape('round', 2.5, 4.3, 0.22, 0, 10.4), 0.14), M(faceFrame(face, FZ, AXIS + dx, 0, 0), mat(0, 0, 0.02)))
    }
    for (const dx of [-2, 2]) {
      drops(b, faceFrame(face, FZ, AXIS, 0, 0), dx, 11.0, 7)
      b.add('bolOrn', metricBox(0.5, 1.4, 0.08), M(faceFrame(face, FZ, AXIS + dx * 1.0, 0, 0), mat(0, 7.6, 0.04)))
    }
    // inscription bands (grey) under the gable
    for (const dx of [-3.4, 3.4]) b.add('bolOrn', metricBox(3.2, 0.35, 0.05), M(faceFrame(face, FZ, AXIS + dx, 0, 0), mat(0, CORN - 0.9, 0.06)))
  }
  // side bays of the main façade
  const sideBays = [AXIS - 2 * BAY, AXIS - 3 * BAY, AXIS - 4 * BAY + 0.4, AXIS + 2 * BAY, AXIS + 3 * BAY - 0.2]
  for (const x of sideBays) {
    arWindow(b, face, ZF, x, 0.35, 1.2, 0.7)
    arWindow(b, face, ZF, x, 2.0, 1.9, 2.8, 'rect')
    arWindow(b, face, ZF, x, 6.3, 1.9, 3.0, x === AXIS - 2 * BAY || x === AXIS + 2 * BAY ? 'round' : 'rect')
    arWindow(b, face, ZF, x, 10.6, 2.0, 3.8, 'round')
    drops(b, faceFrame(face, ZF, x, 0, 0), -1.45, 11.2, 6)
  }
  // rounded corners: windows on the curves (SW r = 4, NE r = 3) + one bay beside the turret
  for (const x of [23.5]) {
    arWindow(b, face, ZF, x, 2.0, 1.4, 2.8)
    arWindow(b, face, ZF, x, 6.3, 1.4, 2.8)
    arWindow(b, face, ZF, x, 10.6, 1.4, 3.4)
  }
  const corners: [number, number, number, number][] = [
    [X0 + R_SW, ZF - R_SW, R_SW, Math.PI / 2 + 0.45],
    [X0 + R_SW, ZF - R_SW, R_SW, Math.PI / 2 + 1.1],
    [X1 - R_NE, ZF - R_NE, R_NE, Math.PI / 4],
  ]
  for (const [cx, cz, rr, ang] of corners) {
    const p = V(cx + Math.cos(ang) * rr, 0, cz + Math.sin(ang) * rr)
    const ry = Math.atan2(Math.cos(ang), Math.sin(ang))
    const m = mat(p.x, 0, p.z, ry)
    for (const [y0, h] of [
      [2.0, 2.6],
      [6.3, 2.8],
      [10.6, 3.4],
    ]) {
      b.add('bolStucco', extrude(frameShape('rect', 1.3, h, 0.18, 0, y0), 0.12), m)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.3, h, 0, y0))), M(m, mat(0, 0, 0.05)))
    }
  }

  /* ---- corner bay with turret (towards Str. Bolyai) ---- */
  const TX = 20.0
  const TW = 3.6
  const TD = 1.0
  const TTOP = 18.6
  {
    b.block('bolWall', TW, TTOP, TD + 0.1, TX, 0, ZF + TD / 2 - 0.05)
    b.block('bolSocle', TW + 0.12, SOCLE, TD + 0.2, TX, 0, ZF + TD / 2)
    b.block('bolOrn', TW + 0.4, 0.5, TD + 0.4, TX, CORN - 0.5, ZF + TD / 2)
    b.block('bolStucco', TW + 0.6, 0.25, TD + 0.6, TX, CORN, ZF + TD / 2)
    b.block('bolStucco', TW + 0.5, 0.3, TD + 0.5, TX, TTOP - 0.3, ZF + TD / 2)
    b.block(ZN, TW + 0.55, 0.05, TD + 0.55, TX, TTOP, ZF + TD / 2)
    const fz = ZF + TD
    for (const dx of [-0.75, 0.75]) {
      arWindow(b, face, fz, TX + dx, 2.0, 1.0, 2.8)
      arWindow(b, face, fz, TX + dx, 6.3, 1.0, 2.8)
      arWindow(b, face, fz, TX + dx, 10.6, 1.0, 3.2)
    }
    arWindow(b, face, fz, TX, 16.3, 0.7, 1.6, 'round')
    // turret walls continue back over the roof (square tower top)
    b.block('bolWall', TW, TTOP - 13, TW, TX, 13, ZF + TD - TW / 2)
    // bell-shaped titanium-zinc helm
    const hy = TTOP + 0.05
    const hz = ZF + TD - TW / 2
    const st: [number, number][] = [
      [TW / 2 + 0.25, hy],
      [TW / 2 + 0.05, hy + 0.35],
      [TW / 2 - 0.45, hy + 1.1],
      [TW / 2 - 1.0, hy + 1.9],
      [TW / 2 - 1.35, hy + 2.6],
      [0.32, hy + 3.1],
      [0.42, hy + 3.4],
      [0.22, hy + 3.7],
      [0.02, hy + 4.4],
    ]
    const rings = st.map(([h, y]) => [V(TX - h, y, hz - h), V(TX + h, y, hz - h), V(TX + h, y, hz + h), V(TX - h, y, hz + h)])
    for (let i = 0; i < rings.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const a0 = rings[i][k]
        const a1 = rings[i][(k + 1) % 4]
        const c1 = rings[i + 1][(k + 1) % 4]
        const c0 = rings[i + 1][k]
        const out = V((a0.x + a1.x) / 2 - TX, 0.4, (a0.z + a1.z) / 2 - hz)
        facet(b, ZN, [a0, a1, c1, c0], { hint: out })
      }
    }
    for (let k = 0; k < 4; k++) for (let i = 0; i < rings.length - 1; i++) b.beam(ZN, rings[i][k], rings[i + 1][k], 0.07, 0.07)
    b.add('bolOrn', new THREE.SphereGeometry(0.2, 10, 8), mat(TX, hy + 4.5, hz))
  }

  /* ---- curved Secession gable over the risalit ---- */
  {
    const prof: [number, number][] = [
      [-6.2, 0],
      [-6.2, 1.5],
      [-5.6, 1.9],
      [-5.0, 1.4],
      [-3.6, 1.2],
      [-3.0, 1.6],
      [-2.7, 3.4],
      [-2.2, 3.9],
      [-1.2, 4.2],
      [-0.6, 4.7],
      [0, 4.9],
    ]
    const pts = [...prof, ...prof.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])]
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
    b.add('bolWall', extrude(s, 0.7), mat(AXIS, CORN + 0.3, FZ - 0.7))
    // titanium-zinc coping along the curved top
    for (let i = 1; i < pts.length - 1; i++) {
      const [xa, ya] = pts[i]
      const [xc, yc] = pts[i + 1]
      if (i === pts.length - 2) continue
      b.beam(ZN, V(AXIS + xa, CORN + 0.36 + ya, FZ - 0.35), V(AXIS + xc, CORN + 0.36 + yc, FZ - 0.35), 0.12, 0.9, V(0, 0, 1))
    }
    // medallion with coat of arms, twin windows, finial
    const gm = mat(AXIS, 0, FZ)
    b.add('bolOrn', new THREE.CylinderGeometry(0.85, 0.85, 0.12, 20), M(gm, mat(0, CORN + 3.45, 0.06, 0, Math.PI / 2)))
    b.add('bolBlue', new THREE.CylinderGeometry(0.68, 0.68, 0.14, 20), M(gm, mat(0, CORN + 3.45, 0.08, 0, Math.PI / 2)))
    b.add('bolStucco', new THREE.SphereGeometry(0.3, 10, 8), M(gm, mat(0, CORN + 3.45, 0.12, 0, 0, 0, 1, 1.3, 0.3)))
    for (const dx of [-0.45, 0.45]) {
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.5, 1.2, dx, CORN + 1.35))), M(gm, mat(0, 0, 0.03)))
      b.add('bolOrn', extrude(frameShape('round', 0.5, 1.2, 0.08, dx, CORN + 1.35), 0.05), gm)
    }
    b.add('bolOrn', lathe([[0, 0], [0.22, 0], [0.18, 0.25], [0.3, 0.5], [0.22, 0.75], [0.06, 0.95], [0.04, 1.4], [0, 1.6]], 10), mat(AXIS, CORN + 0.3 + 4.85, FZ - 0.35))
    // cross roof behind the gable (tile) running into the main roof
    const ry = CORN + 4.6
    const ey = EAVE - 0.2
    const zf = FZ - 0.5
    const zb = ZB + 5.0
    facet(b, 'tileRed', [V(AXIS - 6.2, ey, zf), V(AXIS - 6.2, ey, zb), V(AXIS, ry, zb), V(AXIS, ry, zf)], { thickness: 0.1 })
    facet(b, 'tileRed', [V(AXIS + 6.2, ey, zb), V(AXIS + 6.2, ey, zf), V(AXIS, ry, zf), V(AXIS, ry, zb)], { thickness: 0.1 })
    b.beam('tileBrown', V(AXIS, ry + 0.05, zf), V(AXIS, ry + 0.05, zb), 0.28, 0.14)
  }

  /* ---- main wing roof (tile) ---- */
  {
    const w = X1 - X0
    const top = hippedRoof(b, 'tileRed', { x: (X0 + X1) / 2, z: (ZB + ZF) / 2, w, d: ZF - ZB, y: EAVE, pitch: PITCH, overhang: OV, seams: false, capKey: 'tileBrown' })
    // titanium-zinc gutters along the eaves
    const ey = EAVE - OV * T - 0.06
    const c = [V(X0 - OV, ey, ZB - OV), V(X1 + OV, ey, ZB - OV), V(X1 + OV, ey, ZF + OV), V(X0 - OV, ey, ZF + OV)]
    for (let i = 0; i < 4; i++) b.beam(ZN, c[i], c[(i + 1) % 4], 0.26, 0.22)
    // chimneys
    for (const x of [-8, 14]) {
      b.block('bolWall', 0.9, 2.4, 0.9, x, top - 1.2, (ZB + ZF) / 2)
      b.block(ZN, 1.1, 0.08, 1.1, x, top + 1.2, (ZB + ZF) / 2)
    }
  }

  /* ================= arms ================= */
  // south-west arm (tile), from inside the main wing towards the rear
  {
    const p0 = V(-14.5, 0, 14.8)
    const p1 = V(-20.9, 0, -27.5)
    const L = p0.distanceTo(p1)
    const dx = (p1.x - p0.x) / L
    const dz = (p1.z - p0.z) / L
    const ry = Math.atan2(-dz, dx)
    b.merge(armGeo(L, 11.8, 'tileRed', undefined), mat(p0.x, 0, p0.z, ry))
  }
  // north-east arm along Str. Bolyai (titanium-zinc standing seam)
  {
    const p0 = V(21.6, 0, 18.0)
    const p1 = V(29.9, 0, -15.1)
    const L = p0.distanceTo(p1)
    const dx = (p1.x - p0.x) / L
    const dz = (p1.z - p0.z) / L
    const ry = Math.atan2(-dz, dx)
    b.merge(armGeo(L, 13.4, ZN, SEAM), mat(p0.x, 0, p0.z, ry))
  }

  /* ================= rear (courtyard) façade of the main wing ================= */
  for (let i = 0; i < 8; i++) {
    const x = -8 + i * 3.6
    const u = -x
    arWindow(b, '-z', ZB, u, 2.2, 1.5, 2.4)
    arWindow(b, '-z', ZB, u, 6.4, 1.5, 2.6)
    arWindow(b, '-z', ZB, u, 10.8, 1.5, 3.0)
  }

  /* ================= downpipes ================= */
  for (const x of [AXIS - 6.6, AXIS + 6.6, X0 + 5.5]) b.rod(ZN, V(x, 0.3, ZF + 0.2), V(x, EAVE - 0.5, ZF + 0.2), 0.07, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [28.5, 19.5, 2],
  materials: () => ({
    bolWall: new THREE.MeshStandardMaterial({ color: '#ece3cf', roughness: 0.9 }),
    bolStucco: new THREE.MeshStandardMaterial({ color: '#f4efe3', roughness: 0.85 }),
    bolSocle: new THREE.MeshStandardMaterial({ color: '#bdb6a8', roughness: 0.9 }),
    bolOrn: new THREE.MeshStandardMaterial({ color: '#8f969c', roughness: 0.7 }),
    bolFrame: new THREE.MeshStandardMaterial({ color: '#6c7a6a', roughness: 0.6 }),
    bolBlue: new THREE.MeshStandardMaterial({ color: '#3f6fa8', roughness: 0.5 }),
  }),
  notes:
    'Secession school building with red-tile hipped roofs, curved central gable and a corner turret; natural titanium-zinc on the Bolyai-street arm, the turret helm and the cappings; ornament simplified.',
}
export default model
