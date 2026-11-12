/**
 * Biserica „Sfântul Arhidiacon Ștefan” (Țicău), Str. Albineț 44, Iași — OSM way 203167029.
 *
 * Modelling specification (real metres, +X = OSM long axis 76.7° pointing to the
 * semicircular altar apse in the ENE; +Z = 166.7°, the south side). Sources: the
 * OSM outline and one public photograph of the west front (photo 01, 2023), which
 * already shows the new copper roof.
 *  - Plan after the OSM outline: rectangular body 15.7 × 8.8 m (x −9.6 … 6.1),
 *    semicircular altar apse r ≈ 3.0 m on a 0.8 m straight neck (to x ≈ 9.9),
 *    1.4 m shoulders between body and apse.
 *  - Walls clad in split-face beige stone with smooth light ashlar corner
 *    pilasters, plinth and window/door surrounds; white eaves fascia ≈ 0.65 m
 *    with rounded corners; eaves ≈ 6.1 m (scaled from door/window sizes).
 *  - West front (photo 01): carved stone door frame with double door, two
 *    round-headed windows, painted icon panel (Annunciation) above the door.
 *  - Roof (COLOR METAL copper, as photographed): standing-seam copper with
 *    radial pans over the rounded hip ends; pitch ≈ 33°, ridge ≈ 9.3 m; copper
 *    half-round gutters and downpipes. Lower half-cone apse roof.
 *  - Square stone-clad tower (≈ 4 m) rising from the ridge over the narthex:
 *    one round-headed window per face with an iron cross, white cornice, low
 *    copper pyramid skirt and a small square ogee bell, iron cross (≈ 15 m).
 * Approximations: only the west front is photographed — side and east elevations
 * (window count and size, east roof end) are typological; tower size and all
 * heights are estimated from the photograph's proportions.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, rectRing, prismOutline, window_, door, faceFrame, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180

/* plan */
const XW = -9.6 // west front
const XE = 6.1 // east wall of the body (apse shoulders)
const HW = 4.4 // half width of the body
const AX = 6.9 // centre of the apse semicircle
const AR = 3.0 // apse radius (also half width of the apse neck)

/* heights */
const PLINTH = 0.45
const FASCIA0 = 5.5
const EAVE = 6.15
const PITCH = 33
const TP = Math.tan(PITCH * D2R)
const OV = 0.45 // roof overhang from the wall face
const RC = 0.9 // plan radius of the rounded eave corners
const HWE = HW + OV
const RIDGE = EAVE + HWE * TP
const XA = XW - OV + HWE // west hip apex (on the ridge)
const XB = XE + OV - HWE // east hip apex

/* tower */
const TX = XA + 2.0 // tower centre (west face on the west hip apex)
const THW = 2.0
const TCOR = RIDGE + 2.4 // cornice bottom

const CU = 'copper'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

type P2 = [number, number]

/** Plan outline of body + apse grown by g, body corners rounded with radius r (west and east shoulders). */
function planOutline(g: number, r = 0): P2[] {
  const pts: P2[] = []
  const arc = (cx: number, cz: number, rad: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      pts.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad])
    }
  }
  const x0 = XW - g
  const x1 = XE + g
  const z1 = HW + g
  const n = 6
  // north-west corner → north side → north-east shoulder
  if (r > 0) arc(x0 + r, -z1 + r, r, Math.PI, Math.PI * 1.5, n)
  else pts.push([x0, -z1])
  if (r > 0) arc(x1 - r, -z1 + r, r, -Math.PI / 2, 0, n)
  else pts.push([x1, -z1])
  pts.push([x1, -AR - g], [AX, -AR - g])
  arc(AX, 0, AR + g, -Math.PI / 2, Math.PI / 2, 16)
  pts.push([x1, AR + g])
  if (r > 0) arc(x1 - r, z1 - r, r, 0, Math.PI / 2, n)
  else pts.push([x1, z1])
  if (r > 0) arc(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, n)
  else pts.push([x0, z1])
  return pts
}

/** Triangle fan from an apex to an eave polyline with radial standing seams (copper cone / rounded hip). */
function fan(b: Builder, apex: THREE.Vector3, eave: THREE.Vector3[], stopAt = 0.97) {
  for (let i = 0; i < eave.length - 1; i++) facet(b, CU, [apex, eave[i], eave[i + 1]], { thickness: 0.1 })
  let acc = 0.25
  for (let i = 1; i < eave.length - 1; i++) {
    acc += eave[i].distanceTo(eave[i - 1])
    if (acc < 0.5) continue
    acc = 0
    const p = eave[i].clone().add(V(0, 0.04, 0))
    const q = p.clone().lerp(apex.clone().add(V(0, 0.04, 0)), stopAt)
    b.beam(CU, p, q, 0.045, 0.05)
  }
}

/** Rounded hip end: side-plane triangles with parallel seams, then a radial fan over corners and end. */
function hipEnd(b: Builder, apexX: number, dir: 1 | -1) {
  const xo = dir > 0 ? XE + OV : XW - OV // outer eave line of the end
  const apex = V(apexX, RIDGE, 0)
  const cxr = xo - dir * RC // x of the corner-arc centres
  // side triangles (in the side planes): from the apex section to the start of the corner arc
  for (const s of [-1, 1]) {
    facet(b, CU, [V(apexX, EAVE, s * HWE), V(cxr, EAVE, s * HWE), apex], { seams: SEAM, thickness: 0.1 })
  }
  // fan: corner arc (north) → end eave → corner arc (south)
  const eave: THREE.Vector3[] = []
  const n = 8
  const a0 = dir > 0 ? -Math.PI / 2 : -Math.PI / 2
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = dir > 0 ? a0 + t * (Math.PI / 2) : a0 - t * (Math.PI / 2)
    eave.push(V(cxr + Math.cos(a) * RC, EAVE, -HWE + RC + Math.sin(a) * RC))
  }
  const zs = HWE - RC
  for (let i = 1; i < 12; i++) eave.push(V(xo, EAVE, -zs + (2 * zs * i) / 12))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = dir > 0 ? 0 + t * (Math.PI / 2) : Math.PI - t * (Math.PI / 2)
    eave.push(V(cxr + Math.cos(a) * RC, EAVE, HWE - RC + Math.sin(a) * RC))
  }
  fan(b, apex, eave, dir > 0 ? 0.93 : 1)
  return eave
}

/** Round-headed window with smooth stone surround on a façade. */
function archWin(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, f = 0.2) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, frame: f, frameKey: 'stoneLight', glassKey: 'glassC', inset: 0.04 })
  // timber frame line inside the glazing
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('wood', extrude(frameShape('round', w - 0.12, h - 0.06, 0.06, 0, y0 + 0.03), 0.05), M(m, mat(0, 0, 0.03)))
  b.add('stoneLight', metricBox(w + 2 * f + 0.1, 0.1, 0.22), M(m, mat(0, y0 - f - 0.02, 0.1)))
}

/** Window on a curved apse wall at plan angle a (radians, 0 = +X). */
function apseWin(b: Builder, a: number, y0: number, w: number, h: number) {
  const r = AR
  const p = V(AX + Math.cos(a) * r, 0, Math.sin(a) * r)
  // local frame: +z outward along the radius
  const m = mat(p.x, 0, p.z, Math.PI / 2 - a)
  b.add('stoneLight', extrude(frameShape('round', w, h, 0.18, 0, y0), 0.12), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.03)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  prismOutline(b, 'stoneWarm', planOutline(0), 0, FASCIA0)
  prismOutline(b, 'stoneLight', planOutline(0.08), 0, PLINTH)
  // white eaves fascia with rounded corners (photo 01)
  prismOutline(b, 'plasterWhite', planOutline(0.3, 0.55), FASCIA0, EAVE + 0.05 - FASCIA0)
  prismOutline(b, 'plasterWhite', planOutline(0.36, 0.6), FASCIA0 - 0.05, 0.12)

  // smooth ashlar corner pilasters on the body and the apse shoulders
  const pil = (x: number, z: number, wx: number, wz: number) => b.block('stoneLight', wx, FASCIA0 - PLINTH, wz, x, PLINTH, z)
  for (const s of [-1, 1]) {
    pil(XW + 0.4, s * (HW + 0.03), 0.85, 0.1)
    pil(XW - 0.03, s * (HW - 0.4), 0.1, 0.85)
    pil(XE - 0.36, s * (HW + 0.03), 0.78, 0.1)
    pil(XE + 0.03, s * (HW - 0.55), 0.1, 1.1)
  }

  /* ================= west front (photo 01) ================= */
  const W: Face = '-x'
  door(b, W, XW, 0, { w: 1.7, h: 2.5, y0: 0.3, leafKey: 'wood', frameKey: 'stoneLight', frame: 0.34 })
  // carved lintel band of the door frame
  b.add('stoneLight', metricBox(2.5, 0.38, 0.22), M(faceFrame(W, XW, 0, 0, 0), mat(0, 2.95, 0.11)))
  b.add('stoneLight', new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16), M(faceFrame(W, XW, 0, 0, 0), mat(0, 2.98, 0.26, 0, Math.PI / 2)))
  // two steps and landing in front of the door
  b.block('stoneLight', 3.4, 0.15, 1.6, XW - 0.8, 0, 0)
  b.block('stoneLight', 3.0, 0.15, 0.9, XW - 0.45, 0.15, 0)
  for (const u of [-2.35, 2.35]) archWin(b, W, XW, u, 1.35, 0.8, 2.7, 0.22)
  // painted icon panel (Annunciation) above the door
  {
    const m = faceFrame(W, XW, 0, 0, 0)
    b.add('stefIconFrame', metricBox(2.0, 2.55, 0.06), M(m, mat(0, 3.15 + 1.275, 0.03)))
    b.add('stefIconGold', metricBox(1.84, 2.39, 0.04), M(m, mat(0, 3.15 + 1.275, 0.065)))
    b.add('stefIconRed', metricBox(0.42, 1.55, 0.02), M(m, mat(-0.5, 3.45 + 0.78, 0.09)))
    b.add('stefIconBlue', metricBox(0.4, 1.6, 0.02), M(m, mat(0.52, 3.4 + 0.8, 0.09)))
    b.add('stefIconFrame', extrude(frameShape('round', 0.46, 0.85, 0.05, 0, 3.4), 0.03), M(m, mat(0, 0, 0.08)))
    b.add('stefIconRed', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.46, 0.85, 0, 3.4, 10))), M(m, mat(0, 0, 0.09)))
  }

  /* ================= side and apse windows (typological) ================= */
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? HW : -HW
    const sgn = face === '+z' ? 1 : -1
    // facade u runs left→right seen from outside: on +z that is +x, on -z it is −x
    for (const x of [-7.6, -3.0, 0.8, 4.2]) archWin(b, face, plane, sgn * x, 1.6, 0.85, 2.0)
  }
  for (const a of [-Math.PI / 3, 0, Math.PI / 3]) apseWin(b, a, 1.9, 0.6, 1.6)

  /* ================= roof (copper, as photographed) ================= */
  // side planes between the two hip apexes
  for (const s of [-1, 1]) facet(b, CU, [V(XA, EAVE, s * HWE), V(XB, EAVE, s * HWE), V(XB, RIDGE, 0), V(XA, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
  const eW = hipEnd(b, XA, -1)
  const eE = hipEnd(b, XB, 1)
  b.beam(CU, V(XA, RIDGE + 0.06, 0), V(XB, RIDGE + 0.06, 0), 0.22, 0.12)

  // apse: lower ridge running into the east hip, then a half cone
  const AOV = 0.4
  const ARE = AR + AOV
  const ARIDGE = EAVE + ARE * TP
  const XV = XE + OV - (ARIDGE - EAVE) / TP // where the apse ridge meets the east hip
  for (const s of [-1, 1]) facet(b, CU, [V(XV - 0.4, EAVE, s * ARE), V(AX, EAVE, s * ARE), V(AX, ARIDGE, 0), V(XV - 0.4, ARIDGE, 0)], { seams: SEAM, thickness: 0.1 })
  b.beam(CU, V(XV, ARIDGE + 0.05, 0), V(AX, ARIDGE + 0.05, 0), 0.18, 0.1)
  const apseEave: THREE.Vector3[] = []
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI
    apseEave.push(V(AX + Math.cos(a) * ARE, EAVE, Math.sin(a) * ARE))
  }
  fan(b, V(AX, ARIDGE, 0), apseEave, 0.9)

  /* gutters & downpipes (copper) */
  const gut = (pts: THREE.Vector3[]) => {
    for (let i = 0; i < pts.length - 1; i++) b.rod(CU, pts[i].clone().add(V(0, -0.06, 0)), pts[i + 1].clone().add(V(0, -0.06, 0)), 0.075, 6)
  }
  gut(eW)
  // east end: only the parts beside the apse roof are exposed
  gut(eE.filter((p) => p.z < -ARE + 0.05))
  gut(eE.filter((p) => p.z > ARE - 0.05))
  gut(apseEave)
  for (const s of [-1, 1]) gut([V(XW - OV + RC, EAVE, s * HWE), V(XE + OV - RC, EAVE, s * HWE)])
  for (const [x, z] of [
    [XW - 0.25, -HW - 0.25],
    [XW - 0.25, HW + 0.25],
    [XE + 0.25, -HW - 0.25],
    [XE + 0.25, HW + 0.25],
    [AX + 0.2, -AR - 0.25],
    [AX + 0.2, AR + 0.25],
  ]) b.rod(CU, V(x, 0.2, z), V(x, EAVE - 0.1, z), 0.055, 8)

  /* ================= tower over the narthex ================= */
  const y0 = EAVE // hidden below the roof
  b.block('stoneWarm', 2 * THW, TCOR - y0, 2 * THW, TX, y0, 0)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.block('stoneLight', 0.5, TCOR - y0, 0.08, TX + sx * (THW - 0.25), y0, sz * (THW + 0.03))
    b.block('stoneLight', 0.08, TCOR - y0, 0.5, TX + sx * (THW + 0.03), y0, sz * (THW - 0.25))
  }
  const tfaces: [Face, number][] = [
    ['-x', TX - THW],
    ['+x', TX + THW],
    ['+z', THW],
    ['-z', -THW],
  ]
  for (const [face, plane] of tfaces) {
    const u = face === '+z' ? TX : face === '-z' ? -TX : 0
    const wy = RIDGE - 0.55
    window_(b, face, plane, u, wy, { type: 'round', w: 0.62, h: 2.25, frame: 0.17, frameKey: 'stoneLight', glassKey: 'glassC', inset: 0.04 })
    // ornamental iron cross in front of the window
    const m = faceFrame(face, plane, u, 0, 0)
    b.add('iron', metricBox(0.05, 2.15, 0.05), M(m, mat(0, wy + 1.35, 0.14)))
    b.add('iron', metricBox(1.2, 0.05, 0.05), M(m, mat(0, wy + 2.05, 0.14)))
    b.add('iron', new THREE.TorusGeometry(0.16, 0.02, 4, 16), M(m, mat(0, wy + 2.05, 0.14)))
  }
  // white cornice
  b.block('plasterWhite', 2 * THW + 0.4, 0.5, 2 * THW + 0.4, TX, TCOR, 0)
  b.block('plasterWhite', 2 * THW + 0.5, 0.08, 2 * THW + 0.5, TX, TCOR + 0.5, 0)
  // copper skirt (low pyramid frustum, seamed)
  const sk0 = THW + 0.32
  const sk1 = 1.2
  const skY0 = TCOR + 0.56
  const skY1 = skY0 + (sk0 - sk1) * Math.tan(30 * D2R)
  const lo = rectRing(sk0, sk0, skY0, TX, 0)
  const hi = rectRing(sk1, sk1, skY1, TX, 0)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    const out = V(lo[i].x + lo[j].x - 2 * TX, 0, lo[i].z + lo[j].z).normalize()
    facet(b, CU, [lo[i], lo[j], hi[j], hi[i]], { seams: SEAM, hint: out.add(V(0, 1, 0)), thickness: 0.08 })
    b.beam(CU, lo[i].clone().add(V(0, 0.04, 0)), hi[i].clone().add(V(0, 0.04, 0)), 0.08, 0.07)
  }
  // square ogee bell
  const bell: [number, number][] = [
    [1.2, skY1],
    [1.16, skY1 + 0.1],
    [1.1, skY1 + 0.2],
    [1.02, skY1 + 0.32],
    [0.86, skY1 + 0.45],
    [0.62, skY1 + 0.57],
    [0.36, skY1 + 0.66],
    [0.12, skY1 + 0.72],
    [0.04, skY1 + 0.74],
  ]
  b.add(CU, loft(bell.map(([r, y]) => rectRing(r, r, y, TX, 0)), { capBottom: true, capTop: true, flat: true }))
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let i = 0; i < bell.length - 1; i++) {
      const [r0, ya] = bell[i]
      const [r1, yb] = bell[i + 1]
      b.beam(CU, V(TX + sx * r0, ya, sz * r0), V(TX + sx * r1, yb, sz * r1), 0.07, 0.06)
    }
  }
  // finial and iron cross (≈ 2 m)
  const fy = skY1 + 0.74
  b.add(CU, new THREE.SphereGeometry(0.1, 12, 8), mat(TX, fy + 0.05, 0))
  b.rod('iron', V(TX, fy, 0), V(TX, fy + 2.1, 0), 0.035, 6)
  b.add('iron', metricBox(1.0, 0.05, 0.05), mat(TX, fy + 1.55, 0, Math.PI / 2))
  b.add('iron', new THREE.TorusGeometry(0.14, 0.018, 4, 16), mat(TX, fy + 1.55, 0, Math.PI / 2))

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [XW + 1.5, EAVE + 1.4, 0],
  materials: () => ({
    stefIconGold: new THREE.MeshStandardMaterial({ color: '#c99f45', roughness: 0.55, metalness: 0.25 }),
    stefIconFrame: new THREE.MeshStandardMaterial({ color: '#8a3b22', roughness: 0.7 }),
    stefIconRed: new THREE.MeshStandardMaterial({ color: '#8c3a3f', roughness: 0.8 }),
    stefIconBlue: new THREE.MeshStandardMaterial({ color: '#2f5f73', roughness: 0.8 }),
  }),
  notes:
    'Small stone-clad Orthodox church in Țicău with a copper standing-seam roof (rounded hip ends, half-cone apse roof) and a square tower over the narthex with a copper skirt and ogee bell; only the west front is photographed, side and east elevations are typological.',
}
export default model
