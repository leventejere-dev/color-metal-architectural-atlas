/**
 * Palatul Primăriei Oradea (City Hall, Piața Unirii 1, OSM relation 6481078)
 * — eclectic palace around a courtyard, brown copper mansards and a domed
 * central pavilion, with the 50 m clock tower on the river-side wing.
 *
 * Modelling specification (real metres; +X = OSM long axis 17° (NNE),
 * +Z = 107° (ESE) = the Piața Unirii front with the domed pavilion):
 *  - Plan after the OSM multipolygon: courtyard block 50.4 × 50 m
 *    (x −43.2…7.0, z −16…34) around the OSM courtyard (x −31.2…−4.6,
 *    z −4.2…18); central pavilion 22 × 8.7 m projecting on the front;
 *    rear annexes after the outline (−X wing continued to z −42.8, block
 *    behind the +X wing); river wing (x 6.6…25) ending in the clock tower
 *    (OSM way 1207602388, ≈6.6 m square, turned 25° to the cardinal
 *    directions) and a short diagonal wing beyond it.
 *  - Heights scaled from photos 02/03 against the 50 m tower (OSM height):
 *    rusticated ground floor with granite socle to 6.4 m, piano nobile to
 *    12.6 m, second floor, entablature to 19 m, balustrade to 20.2 m.
 *  - Front: two corner pavilions (4 and 3 bays, giant Corinthian pilasters,
 *    paired arched windows on the 2nd floor, pedimented windows below) with
 *    their own copper mansards and ox-eye dormers; central pavilion with a
 *    three-arch entrance, six giant columns and three tall arched windows,
 *    attic storey with statue aedicules and a curved crest carrying the coat
 *    of arms, square bell-shaped copper roof with dormers, cresting and a
 *    square lantern with finial (photos 01, 02).
 *  - Courtyard wings: continuous copper mansard ring (≈68° lower slope,
 *    low deck), ox-eyes on the street sides; long −X façade (tram street,
 *    photo 01) with a giant-order risalit.
 *  - River wing: three storeys with a red tile hipped roof as photographed
 *    (photo 03); tower: shaft, clock stage with four dials and segmental
 *    pediments, loggia stage with paired arches, attic with balustrade and
 *    urns, small top lantern and flagpole (photos 03, 04).
 *  - COLOR METAL copper (register 2020/2021): all copper surfaces of the
 *    palace shown in the brown tone photographed in 2023–25.
 * Approximations: rear annexes and courtyard elevations not photographed
 * (simplified, copper roofs assumed); ornament, statues, window surrounds and
 * balustrades simplified; bay counts on the long sides estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, rectRing, extrude, frameShape, opening, window_, door, mansardRoof, hippedRoof, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const CU = 'copperBrown'
const SEAM = seams(CU, 0.52, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

interface Rect { x0: number; x1: number; z0: number; z1: number }
const grow = (r: Rect, g: number): Rect => ({ x0: r.x0 - g, x1: r.x1 + g, z0: r.z0 - g, z1: r.z1 + g })

/* plan */
const A: Rect = { x0: -43.2, x1: 7.0, z0: -16, z1: 34 } // courtyard block
const CY: Rect = { x0: -31.2, x1: -4.6, z0: -4.2, z1: 18 } // courtyard
const PAV = { x0: -27.4, x1: -5.4, z: 42.7 } // central pavilion front
const PCX = (PAV.x0 + PAV.x1) / 2
const CPL: Rect = { x0: -43.2, x1: -27.4, z0: 18, z1: 34 } // left corner pavilion
const CPR: Rect = { x0: -5.4, x1: 7.0, z0: 18, z1: 34 } // right corner pavilion

/* heights */
const SOCLE = 1.2
const GF = 6.4
const PN = 12.6
const ARCH = 17.2
const EAVE = 19.0
const BAL = 1.2

/** Ring of façade bands around a rectangle (only the listed sides). */
function bands(b: Builder, r: Rect, y: number, h: number, grow_: number, key: string) {
  b.add(key, metricBox(r.x1 - r.x0 + 2 * grow_, h, r.z1 - r.z0 + 2 * grow_), mat((r.x0 + r.x1) / 2, y + h / 2, (r.z0 + r.z1) / 2))
}

/** Palace wall block with socle, rustication grooves, string courses and entablature. */
function palaceBlock(b: Builder, r: Rect, top = EAVE, rich = true) {
  const w = r.x1 - r.x0
  const d = r.z1 - r.z0
  b.block('chRender', w, top, d, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)
  bands(b, r, 0, SOCLE, 0.14, 'chGranite')
  if (rich) for (let y = SOCLE + 0.55; y < GF - 0.2; y += 0.62) bands(b, r, y, 0.08, 0.04, 'chRender')
  bands(b, r, GF - 0.1, 0.55, 0.2, 'chTrim')
  bands(b, r, 7.55, 0.16, 0.08, 'chTrim')
  bands(b, r, PN - 0.1, 0.35, 0.1, 'chTrim')
  // entablature: architrave, frieze, cornice
  bands(b, r, top - 1.8, 0.4, 0.12, 'chTrim')
  bands(b, r, top - 0.75, 0.3, 0.32, 'chTrim')
  bands(b, r, top - 0.45, 0.45, 0.6, 'chTrim')
}

/** Balustrade along a straight line (posts + balusters + rails). */
function balustrade(b: Builder, a: THREE.Vector3, c: THREE.Vector3, h = BAL) {
  const L = a.distanceTo(c)
  const dir = V().subVectors(c, a).normalize()
  const ry = Math.atan2(-dir.z, dir.x)
  const n = Math.max(2, Math.floor(L / 0.36))
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(c, i / n)
    const post = i % 9 === 0
    b.add('chTrim', metricBox(post ? 0.42 : 0.15, h - 0.3, post ? 0.42 : 0.15), mat(p.x, p.y + 0.15 + (h - 0.3) / 2, p.z, ry))
  }
  b.beam('chTrim', a.clone().setY(a.y + 0.08), c.clone().setY(c.y + 0.08), 0.42, 0.16)
  b.beam('chTrim', a.clone().setY(a.y + h - 0.08), c.clone().setY(c.y + h - 0.08), 0.5, 0.16)
}

function rectBalustrade(b: Builder, r: Rect, y: number, skip: (side: number) => boolean = () => false) {
  const c = [V(r.x0, y, r.z0), V(r.x1, y, r.z0), V(r.x1, y, r.z1), V(r.x0, y, r.z1)]
  for (let i = 0; i < 4; i++) if (!skip(i)) balustrade(b, c[i], c[(i + 1) % 4])
}

type Bay = 'rich' | 'plain' | 'court'

/** One bay of windows on a façade (ground, piano nobile, 2nd floor). */
function bayWindows(b: Builder, face: Face, plane: number, u: number, kind: Bay) {
  const m = faceFrame(face, plane, u, 0, 0)
  if (kind === 'court') {
    for (const y0 of [2.6, 8.2, 13.8]) window_(b, face, plane, u, y0, { w: 1.2, h: 2.4, frame: 0.16, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, bars: [2, 2] })
    return
  }
  // ground floor
  window_(b, face, plane, u, 2.5, { w: 1.35, h: 2.5, frame: 0.2, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 2] })
  // piano nobile with hood / segmental pediment
  window_(b, face, plane, u, 8.1, { w: 1.45, h: 3.0, frame: 0.24, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 3] })
  b.add('chTrim', metricBox(2.3, 0.18, 0.36), M(m, mat(0, 11.55, 0.18)))
  if (kind === 'rich') {
    const s = new THREE.Shape()
    s.absarc(0, -0.9, 1.35, Math.asin(0.9 / 1.35), Math.PI - Math.asin(0.9 / 1.35), false)
    b.add('chTrim', extrude(s, 0.3, 10), M(m, mat(0, 11.65, 0.02)))
    // paired arched windows on the 2nd floor
    for (const du of [-0.5, 0.5]) window_(b, face, plane, u + du, 13.6, { type: 'round', w: 0.78, h: 2.55, frame: 0.16, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04 })
    b.add('chTrim', metricBox(2.2, 0.14, 0.3), M(m, mat(0, 13.45, 0.12)))
  } else {
    window_(b, face, plane, u, 13.7, { w: 1.3, h: 2.4, frame: 0.2, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 2] })
  }
}

/** Evenly spaced bays between u0 and u1. */
function bayRow(b: Builder, face: Face, plane: number, u0: number, u1: number, n: number, kind: Bay) {
  const s = (u1 - u0) / n
  for (let i = 0; i < n; i++) bayWindows(b, face, plane, u0 + s * (i + 0.5), kind)
}

/** Giant Corinthian pilasters (or engaged columns) between y0 and y1 at façade positions us. */
function giantOrder(b: Builder, face: Face, plane: number, us: number[], y0: number, y1: number, column = false, w = 0.75) {
  for (const u of us) {
    const m = faceFrame(face, plane, u, 0, 0)
    b.add('chTrim', metricBox(w + 0.3, 0.5, 0.5 + (column ? 0.5 : 0)), M(m, mat(0, y0 + 0.25, 0.25)))
    if (column) b.add('chTrim', new THREE.CylinderGeometry(w * 0.48, w * 0.55, y1 - y0 - 1.3, 16), M(m, mat(0, y0 + 0.5 + (y1 - y0 - 1.3) / 2, w * 0.62)))
    else b.add('chTrim', metricBox(w, y1 - y0 - 1.3, 0.3), M(m, mat(0, y0 + 0.5 + (y1 - y0 - 1.3) / 2, 0.15)))
    b.add('chTrim', metricBox(w + 0.35, 0.8, column ? 1.2 : 0.55), M(m, mat(0, y1 - 0.4, column ? 0.62 : 0.28)))
  }
}

/** Mansard ring over the courtyard wings: outer & courtyard lower slopes, low ridged deck. */
function ringMansard(b: Builder, O: Rect, I: Rect, eave: number, rise: number, pitch: number, deck: number) {
  const t = Math.tan(pitch * D2R)
  const run = rise / t
  const ov = 0.3
  const ey = eave - ov * t
  const Oe = grow(O, ov)
  const Oc = grow(O, -run)
  const Ie = grow(I, -ov)
  const Ic = grow(I, run)
  const cy = eave + rise
  const Mi: Rect = { x0: (Oc.x0 + Ic.x0) / 2, x1: (Oc.x1 + Ic.x1) / 2, z0: (Oc.z0 + Ic.z0) / 2, z1: (Oc.z1 + Ic.z1) / 2 }
  const my = cy + deck
  const C = (r: Rect, y: number) => [V(r.x0, y, r.z0), V(r.x1, y, r.z0), V(r.x1, y, r.z1), V(r.x0, y, r.z1)]
  const strip = (ra: Rect, ya: number, rb: Rect, yb: number, edge = false) => {
    const a = C(ra, ya)
    const c = C(rb, yb)
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, CU, [a[i], a[j], c[j], c[i]], { seams: SEAM, thickness: 0.1 })
      b.beam(CU, a[i].clone().setY(a[i].y + 0.04), c[i].clone().setY(c[i].y + 0.04), 0.2, 0.12)
      if (edge) b.beam(CU, a[i].clone().setY(a[i].y - 0.06), a[j].clone().setY(a[j].y - 0.06), 0.24, 0.22)
    }
  }
  strip(Oe, ey, Oc, cy, true)
  strip(Ie, ey, Ic, cy, true)
  strip(Oc, cy, Mi, my)
  strip(Ic, cy, Mi, my)
  // curb mouldings
  for (const r of [Oc, Ic]) {
    const c = C(r, cy + 0.04)
    for (let i = 0; i < 4; i++) b.beam(CU, c[i], c[(i + 1) % 4], 0.26, 0.2)
  }
  return { run, ey }
}

/** Ox-eye dormer on a mansard slope: copper drum pointing along the outward normal n (horizontal). */
function oxEye(b: Builder, p: THREE.Vector3, n: THREE.Vector3) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n.clone().normalize())
  const m = new THREE.Matrix4().compose(p, q, V(1, 1, 1))
  b.add(CU, new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12, 1, true), m)
  b.add(CU, new THREE.CylinderGeometry(0.6, 0.6, 0.14, 12, 1, false), M(m, mat(0, 0.55, 0)))
  b.add('glassC', new THREE.CircleGeometry(0.42, 12), M(m, mat(0, 0.63, 0, 0, -Math.PI / 2)))
}

/** Ox-eyes evenly along one side of a mansard (side outward normal n, slope from eave line). */
function oxEyeRow(b: Builder, a: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3, count: number, y: number, inset: number) {
  for (let i = 0; i < count; i++) {
    const p = a.clone().lerp(c, (i + 0.5) / count).add(n.clone().multiplyScalar(-inset)).setY(y)
    oxEye(b, p, n)
  }
}

/** Square-plan loft (bell roof, lantern) from [halfWidth, y] stations. */
function squareLoft(b: Builder, key: string, prof: [number, number][], cx: number, cz: number, hx = 1) {
  b.add(key, loft(prof.map(([hw, y]) => rectRing(hw * hx, hw, y, cx, cz)), { capBottom: true, capTop: true }))
}

function urn(b: Builder, x: number, y: number, z: number, s = 1) {
  b.add('chTrim', new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 0.3 * s, 10), mat(x, y + 0.15 * s, z))
  b.add('chTrim', new THREE.SphereGeometry(0.34 * s, 10, 8), mat(x, y + 0.6 * s, z))
  b.add('chTrim', new THREE.ConeGeometry(0.16 * s, 0.6 * s, 8), mat(x, y + 1.15 * s, z))
}

function build(): Builder {
  const b = new Builder()

  /* ================= courtyard palace (A) ================= */
  // wings as four blocks (courtyard left open)
  const wings: Rect[] = [
    { x0: A.x0, x1: CY.x0, z0: A.z0, z1: A.z1 }, // −X wing
    { x0: CY.x1, x1: A.x1, z0: A.z0, z1: A.z1 }, // +X wing
    { x0: CY.x0, x1: CY.x1, z0: A.z0, z1: CY.z0 }, // back wing
    { x0: CY.x0, x1: CY.x1, z0: CY.z1, z1: A.z1 }, // front wing
  ]
  wings.forEach((r) => palaceBlock(b, r))
  // street balustrades on the cornice (front handled by the pavilions)
  rectBalustrade(b, grow(A, 0.25), EAVE, (s) => s !== 3 && s !== 1)

  /* rear annexes (B): −X wing continued, block behind the +X wing — simplified, not photographed */
  const B1: Rect = { x0: A.x0, x1: CY.x0, z0: -42.8, z1: A.z0 + 0.01 }
  const B1b: Rect = { x0: CY.x0 - 0.01, x1: -29.6, z0: -42.8, z1: -25.6 }
  const B2: Rect = { x0: -10.8, x1: 6.1, z0: -39.4, z1: -26.9 }
  const B2b: Rect = { x0: -6.2, x1: 6.2, z0: -26.95, z1: A.z0 + 0.01 }
  for (const r of [B1, B1b, B2, B2b]) palaceBlock(b, r, 17.6, false)

  /* ================= corner pavilions ================= */
  for (const r of [CPL, CPR]) {
    palaceBlock(b, grow(r, 0.0), EAVE + 0.6)
  }

  /* ================= central pavilion ================= */
  const PV: Rect = { x0: PAV.x0, x1: PAV.x1, z0: CY.z1 + 2, z1: PAV.z }
  palaceBlock(b, PV, EAVE + 0.6)
  // attic storey (set back 1.1 m) with balustrade in front
  const AT: Rect = { x0: PAV.x0 + 0.8, x1: PAV.x1 - 0.8, z0: 24.0, z1: PAV.z - 1.1 }
  const atTop = 25.6
  b.block('chRender', AT.x1 - AT.x0, atTop - EAVE, AT.z1 - AT.z0, PCX, EAVE + 0.6, (AT.z0 + AT.z1) / 2)
  bands(b, AT, atTop - 0.6, 0.6, 0.3, 'chTrim')
  balustrade(b, V(PAV.x0 + 0.3, EAVE + 0.6, PAV.z + 0.3), V(PAV.x1 - 0.3, EAVE + 0.6, PAV.z + 0.3))

  /* ================= façades ================= */
  // --- front (+Z): corner pavilions
  bayRow(b, '+z', CPL.z1, CPL.x0, CPL.x1, 4, 'rich')
  giantOrder(b, '+z', CPL.z1, [CPL.x0 + 0.5, -39.2, -35.3, -31.4, CPL.x1 - 0.5], GF + 0.4, ARCH)
  bayRow(b, '+z', CPR.z1, CPR.x0, CPR.x1, 3, 'rich')
  giantOrder(b, '+z', CPR.z1, [CPR.x0 + 0.5, -1.27, 2.87, CPR.x1 - 0.5], GF + 0.4, ARCH)
  // corner-pavilion side elevations (4 bays) on −X and +X
  bayRow(b, '-x', A.x0, CPL.z0, CPL.z1, 4, 'rich')
  giantOrder(b, '-x', A.x0, [CPL.z0 + 0.5, 22, 26, 30, CPL.z1 - 0.5], GF + 0.4, ARCH)
  bayRow(b, '+x', A.x1, -CPR.z1, -CPR.z0, 4, 'rich')
  giantOrder(b, '+x', A.x1, [-CPR.z1 + 0.5, -30, -26, -22, -CPR.z0 - 0.5], GF + 0.4, ARCH)
  // balustrades on the corner pavilions
  rectBalustrade(b, grow(CPL, 0.25), EAVE + 0.6, (s) => s === 0 || s === 1)
  rectBalustrade(b, grow(CPR, 0.25), EAVE + 0.6, (s) => s === 0 || s === 3)

  // --- −X façade (tram street): wing + annex, giant-order risalit
  bayRow(b, '-x', A.x0, A.z0, CPL.z0, 8, 'rich')
  {
    // risalit (3 bays, engaged columns) in the middle of the −X wing
    const z0 = -5.2
    const z1 = 7.6
    b.block('chRender', 0.6, EAVE, z1 - z0, A.x0 - 0.3, 0, (z0 + z1) / 2)
    b.block('chTrim', 1.4, 0.45, z1 - z0 + 0.6, A.x0 - 0.3, EAVE - 0.45, (z0 + z1) / 2)
    giantOrder(b, '-x', A.x0 - 0.6, [z0 + 0.6, z0 + 4.4, z1 - 4.4, z1 - 0.6], GF + 0.4, ARCH, true, 0.8)
    // pediment-like raised attic over the risalit
    b.block('chRender', 0.8, 1.6, z1 - z0 - 1, A.x0 - 0.2, EAVE, (z0 + z1) / 2)
    b.block('chTrim', 1.1, 0.25, z1 - z0 - 0.6, A.x0 - 0.2, EAVE + 1.6, (z0 + z1) / 2)
  }
  bayRow(b, '-x', A.x0, B1.z0, A.z0, 7, 'plain')
  // --- +X façade (river side, plain section)
  bayRow(b, '+x', A.x1, -CPR.z0, 6.4, 6, 'plain')
  // --- back and annexes
  bayRow(b, '-z', A.z0, 6.2, 31.2, 6, 'plain')
  bayRow(b, '-z', B2.z0, -6.1, 10.8, 4, 'plain')
  bayRow(b, '+x', B2.x1, 26.9, 39.4, 3, 'plain')
  bayRow(b, '-x', B2.x0, -39.4, -26.9, 3, 'plain')
  bayRow(b, '-z', B1.z0, 29.6, 43.2, 3, 'plain')
  bayRow(b, '+x', B1b.x1, 25.6, 42.8, 4, 'plain')
  // --- courtyard elevations
  bayRow(b, '-z', CY.z1, -CY.x1, -CY.x0, 6, 'court')
  bayRow(b, '+z', CY.z0, CY.x0, CY.x1, 6, 'court')
  bayRow(b, '+x', CY.x0, -CY.z1, -CY.z0, 5, 'court')
  bayRow(b, '-x', CY.x1, CY.z0, CY.z1, 5, 'court')

  // --- central pavilion
  {
    const fz = PAV.z
    // ground floor: three entrance arches + outer windows
    for (const du of [-4.7, 0, 4.7]) {
      door(b, '+z', fz, PCX + du, { w: 2.7, h: 5.0, type: 'round', leafKey: 'chDoor', frameKey: 'chTrim', frame: 0.45, y0: SOCLE * 0.5 })
    }
    for (const du of [-8.9, 8.9]) window_(b, '+z', fz, PCX + du, 2.5, { w: 1.3, h: 2.5, frame: 0.2, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 2] })
    // giant columns on pedestals, tall arched windows, oculi
    const cols = [-10.6, -7.2, -2.3, 2.3, 7.2, 10.6]
    for (const du of cols) {
      const x = PCX + du
      b.block('chTrim', 1.35, 1.3, 1.35, x, GF + 0.15, fz + 0.75)
      b.add('chTrim', new THREE.CylinderGeometry(0.5, 0.58, ARCH - GF - 2.7, 20), mat(x, GF + 1.45 + (ARCH - GF - 2.7) / 2, fz + 0.75))
      // Corinthian capital (bell + abacus)
      b.add('chTrim', new THREE.CylinderGeometry(0.78, 0.52, 0.85, 16), mat(x, ARCH - 0.83, fz + 0.75))
      b.block('chTrim', 1.6, 0.25, 1.6, x, ARCH - 0.4, fz + 0.75)
    }
    // entablature break-forward over the columns
    b.block('chTrim', PAV.x1 - PAV.x0 + 0.6, 1.4, 1.7, PCX, ARCH - 0.15, fz + 0.75)
    b.block('chTrim', PAV.x1 - PAV.x0 + 1.0, 0.45, 2.1, PCX, ARCH + 1.25, fz + 0.75)
    for (const du of [-4.7, 0, 4.7]) {
      window_(b, '+z', fz, PCX + du, 7.9, { type: 'round', w: 3.0, h: 8.4, frame: 0.3, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, bars: [3, 5] })
      b.add('chTrim', metricBox(3.4, 0.5, 0.6), faceFrame('+z', fz, PCX + du, 7.6, 0.3))
    }
    for (const du of [-8.9, 8.9]) {
      b.add('chTrim', new THREE.TorusGeometry(0.62, 0.16, 6, 18), mat(PCX + du, 14.9, fz + 0.1))
      b.add('glassC', new THREE.CircleGeometry(0.6, 18), mat(PCX + du, 14.9, fz + 0.03))
      window_(b, '+z', fz, PCX + du, 8.6, { w: 1.2, h: 3.4, frame: 0.2, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true })
    }
    // pavilion side faces (±X): arch at ground, two storeys of windows
    for (const [face, plane, u] of [
      ['-x', PAV.x0, 38.5],
      ['+x', PAV.x1, -38.5],
    ] as [Face, number, number][]) {
      door(b, face, plane, u, { w: 2.6, h: 4.8, type: 'round', leafKey: 'chDoor', frameKey: 'chTrim', frame: 0.4, y0: SOCLE * 0.5 })
      window_(b, face, plane, u, 8.1, { w: 1.45, h: 3.0, frame: 0.24, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true, bars: [2, 3] })
      for (const du of [-0.5, 0.5]) window_(b, face, plane, u + du, 13.6, { type: 'round', w: 0.78, h: 2.55, frame: 0.16, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04 })
    }
    // attic storey: windows, aedicules with statues, curved crest with coat of arms
    const az = AT.z1
    for (const du of [-6.6, -5.2, -3.8, 3.8, 5.2, 6.6]) window_(b, '+z', az, PCX + du, EAVE + 1.9, { type: 'round', w: 0.85, h: 2.3, frame: 0.16, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04 })
    for (const du of [-9.3, 9.3]) {
      const x = PCX + du
      b.block('chRender', 3.0, 6.6, 1.8, x, EAVE + 0.6, az + 0.4)
      b.block('chTrim', 3.4, 0.4, 2.2, x, EAVE + 6.8, az + 0.4)
      // segmental crest of the aedicule
      const s = new THREE.Shape()
      s.absarc(0, -0.6, 1.6, Math.asin(0.6 / 1.6), Math.PI - Math.asin(0.6 / 1.6), false)
      b.add('chTrim', extrude(s, 0.6, 10), mat(x, EAVE + 7.2, az + 0.4))
      // statues flanking (simplified figures)
      for (const s2 of [-1, 1]) {
        b.add('chStatue', new THREE.CylinderGeometry(0.28, 0.36, 1.9, 8), mat(x + s2 * 1.85, EAVE + 1.55, az + 1.15))
        b.add('chStatue', new THREE.SphereGeometry(0.22, 8, 6), mat(x + s2 * 1.85, EAVE + 2.75, az + 1.15))
      }
    }
    // central crest with coat of arms and sculpture group
    {
      const w = 5.6
      const s = new THREE.Shape()
      s.moveTo(-w / 2, 0)
      s.lineTo(w / 2, 0)
      s.lineTo(w / 2, 6.4)
      s.absarc(0, 6.4, w / 2, 0, Math.PI, false)
      s.lineTo(-w / 2, 0)
      b.add('chRender', extrude(s, 1.4, 16), mat(PCX, EAVE + 0.6, az - 0.8))
      const rim = new THREE.Shape()
      rim.absarc(0, 6.4, w / 2 + 0.35, 0, Math.PI, false)
      rim.lineTo(-w / 2, 6.4)
      rim.absarc(0, 6.4, w / 2, Math.PI, 0, true)
      rim.lineTo(w / 2 + 0.35, 6.4)
      b.add('chTrim', extrude(rim, 1.7, 16), mat(PCX, EAVE + 0.6, az - 0.9))
      for (const s2 of [-1, 1]) b.block('chTrim', 0.5, 6.4, 0.5, PCX + s2 * (w / 2 + 0.1), EAVE + 0.6, az + 0.6)
      // shield in a cartouche
      b.add('chTrim', metricBox(2.0, 2.5, 0.2), mat(PCX, EAVE + 4.4, az + 0.62))
      b.add('chArms', metricBox(1.4, 1.8, 0.15), mat(PCX, EAVE + 4.4, az + 0.75))
      // sculpture group on the crest
      for (const s2 of [-0.9, 0, 0.9]) b.add('chStatue', new THREE.CylinderGeometry(0.32, 0.45, 1.7 + (s2 === 0 ? 0.6 : 0), 8), mat(PCX + s2, EAVE + 0.6 + 6.4 + 2.8 + 0.6 + (s2 === 0 ? 0.3 : 0), az - 0.1))
    }
  }

  /* ================= roofs (copper) ================= */
  ringMansard(b, A, CY, EAVE, 4.0, 68, 0.7)
  // ox-eyes on the street sides of the ring
  {
    const y = EAVE + 1.7
    const inset = 1.7 / Math.tan(68 * D2R) - 0.25
    oxEyeRow(b, V(A.x0, 0, A.z0 + 1), V(A.x0, 0, CPL.z0 - 1), V(-1, 0, 0), 8, y, inset)
    oxEyeRow(b, V(A.x1, 0, A.z0 + 1), V(A.x1, 0, CPR.z0 - 1), V(1, 0, 0), 6, y, inset)
    oxEyeRow(b, V(-30, 0, A.z0), V(-7.5, 0, A.z0), V(0, 0, -1), 5, y, inset)
  }
  // annex roofs: mansards on the −X annex, hipped copper on the rear block
  mansardRoof(b, CU, { x: (B1.x0 + B1.x1) / 2, z: (B1.z0 + B1.z1) / 2 - 0.2, w: B1.x1 - B1.x0, d: B1.z1 - B1.z0 - 0.4, y: 17.6, lowerPitch: 66, lowerRise: 3.6, upperPitch: 14, overhang: 0.3, seams: SEAM })
  hippedRoof(b, CU, { x: (B1b.x0 + B1b.x1) / 2 + 0.6, z: (B1b.z0 + B1b.z1) / 2, w: B1b.x1 - B1b.x0 + 1.2, d: B1b.z1 - B1b.z0, y: 17.6, pitch: 32, overhang: 0.3, seams: SEAM })
  hippedRoof(b, CU, { x: (B2.x0 + B2.x1) / 2, z: (B2.z0 + B2.z1) / 2, w: B2.x1 - B2.x0, d: B2.z1 - B2.z0, y: 17.6, pitch: 32, overhang: 0.4, seams: SEAM })
  hippedRoof(b, CU, { x: 0, z: (B2b.z0 + B2b.z1) / 2 - 0.5, w: B2b.x1 - B2b.x0, d: B2b.z1 - B2b.z0 + 1, y: 17.6, pitch: 32, overhang: 0.4, seams: SEAM })
  oxEyeRow(b, V(B1.x0, 0, B1.z0 + 1), V(B1.x0, 0, B1.z1 - 1), V(-1, 0, 0), 6, 17.6 + 1.6, 1.6 / Math.tan(66 * D2R) - 0.25)
  // corner-pavilion mansards (taller, own curb) with ox-eyes
  for (const [r, sx] of [
    [CPL, -1],
    [CPR, 1],
  ] as [Rect, number][]) {
    const ey = EAVE + 0.6
    mansardRoof(b, CU, { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, w: r.x1 - r.x0, d: r.z1 - r.z0, y: ey, lowerPitch: 70, lowerRise: 4.6, upperPitch: 14, overhang: 0.35, seams: SEAM })
    const inset = 1.9 / Math.tan(70 * D2R) - 0.3
    const n = r === CPL ? 3 : 3
    oxEyeRow(b, V(r.x0 + 1.5, 0, r.z1 + 0.35), V(r.x1 - 1.5, 0, r.z1 + 0.35), V(0, 0, 1), n, ey + 1.9, inset)
    const xs = sx < 0 ? r.x0 - 0.35 : r.x1 + 0.35
    oxEyeRow(b, V(xs, 0, r.z0 + 2), V(xs, 0, r.z1 - 2), V(sx, 0, 0), 3, ey + 1.9, inset)
    // finials on the curb corners
    const t = Math.tan(70 * D2R)
    const run = 4.6 / t
    for (const [cx, cz] of [
      [r.x0 + run, r.z0 + run],
      [r.x1 - run, r.z0 + run],
      [r.x1 - run, r.z1 - run],
      [r.x0 + run, r.z1 - run],
    ]) {
      b.rod(CU, V(cx, ey + 4.6, cz), V(cx, ey + 6.3, cz), 0.06, 6)
      b.add(CU, new THREE.SphereGeometry(0.2, 8, 6), mat(cx, ey + 5.4, cz))
    }
  }

  // central pavilion: square bell roof, dormers, cresting, lantern, finial
  {
    const cz = 32.6
    const y0 = 25.6
    const bell: [number, number][] = [
      [7.4, y0],
      [7.25, y0 + 0.6],
      [6.85, y0 + 1.7],
      [6.25, y0 + 3.0],
      [5.5, y0 + 4.4],
      [4.65, y0 + 5.7],
      [3.85, y0 + 6.8],
      [3.3, y0 + 7.6],
    ]
    squareLoft(b, CU, bell, PCX, cz, 1.12)
    // meridian ribs (standing seams) on the four faces
    for (const [ax, az] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const hxScale = ax !== 0 ? 1 : 1.12
      for (let k = -12; k <= 12; k++) {
        const f = k / 12.5
        for (let i = 0; i < bell.length - 1; i++) {
          const [h0, yA] = bell[i]
          const [h1, yB] = bell[i + 1]
          const p = (hw: number, y: number) => {
            const n = ax !== 0 ? hw : hw * hxScale
            const t = ax !== 0 ? hw : hw * 1.12
            return ax !== 0 ? V(PCX + ax * n * 1.12 + ax * 0.03, y, cz + f * t / 1.12) : V(PCX + f * hw * 1.12, y, cz + az * (hw + 0.03))
          }
          b.beam(CU, p(h0, yA), p(h1, yB), 0.05, 0.05)
        }
      }
    }
    // hip rolls
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      for (let i = 0; i < bell.length - 1; i++) {
        const [h0, yA] = bell[i]
        const [h1, yB] = bell[i + 1]
        b.beam(CU, V(PCX + sx * h0 * 1.12, yA + 0.05, cz + sz * h0), V(PCX + sx * h1 * 1.12, yB + 0.05, cz + sz * h1), 0.16, 0.14)
      }
    }
    // dormers: two on the front and back faces, one on each side
    const dorm = (x: number, z: number, ry: number) => {
      const g = new Builder()
      g.block(CU, 1.5, 1.7, 1.8, 0, 0, 0)
      g.add(CU, new THREE.CylinderGeometry(0.75, 0.75, 1.8, 14, 1, false, -Math.PI / 2, Math.PI), mat(0, 1.7, 0, 0, Math.PI / 2, 0))
      g.add('chTrim', extrude(frameShape('round', 0.9, 1.9, 0.14, 0, 0.2), 0.12), mat(0, 0, 0.9))
      g.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 1.9, 0, 0.2, 10))), mat(0, 0, 0.92))
      b.merge(g, mat(x, y0 + 1.6, z, ry))
    }
    for (const du of [-3.4, 3.4]) {
      dorm(PCX + du, cz + 6.2, 0)
      dorm(PCX + du, cz - 6.2, Math.PI)
    }
    dorm(PCX - 7.0, cz, -Math.PI / 2)
    dorm(PCX + 7.0, cz, Math.PI / 2)
    // top deck with cresting
    const ty = y0 + 7.6
    b.block(CU, 3.3 * 2 * 1.12 + 0.3, 0.3, 3.3 * 2 + 0.3, PCX, ty - 0.05, cz)
    {
      const hx = 3.3 * 1.12
      const hz = 3.3
      const c = [V(PCX - hx, ty + 0.25, cz - hz), V(PCX + hx, ty + 0.25, cz - hz), V(PCX + hx, ty + 0.25, cz + hz), V(PCX - hx, ty + 0.25, cz + hz)]
      for (let i = 0; i < 4; i++) {
        const a = c[i]
        const e = c[(i + 1) % 4]
        b.beam('iron', a.clone().setY(ty + 1.0), e.clone().setY(ty + 1.0), 0.06, 0.06)
        const L = a.distanceTo(e)
        const n = Math.floor(L / 0.3)
        for (let k = 0; k <= n; k++) {
          const p = a.clone().lerp(e, k / n)
          b.rod('iron', p, p.clone().setY(ty + (k % 4 === 0 ? 1.35 : 1.0)), 0.025, 4)
        }
      }
    }
    // lantern
    const ly = ty + 0.25
    b.block('chRender', 3.2, 3.4, 3.2, PCX, ly, cz)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) b.block('chTrim', 0.45, 3.4, 0.45, PCX + sx * 1.55, ly, cz + sz * 1.55)
    for (const [face, plane, u] of [
      ['+z', cz + 1.6, PCX],
      ['-z', cz - 1.6, -PCX],
      ['+x', PCX + 1.6, -cz],
      ['-x', PCX - 1.6, cz],
    ] as [Face, number, number][]) {
      window_(b, face, plane, u, ly + 0.7, { type: 'round', w: 1.1, h: 2.0, frame: 0.14, frameKey: 'chTrim', glassKey: 'black', inset: 0.03 })
    }
    b.block('chTrim', 3.7, 0.35, 3.7, PCX, ly + 3.4, cz)
    // lantern cap: small concave pyramid
    squareLoft(b, CU, [
      [1.75, ly + 3.75],
      [1.3, ly + 4.2],
      [0.75, ly + 4.9],
      [0.35, ly + 5.6],
      [0.12, ly + 6.1],
    ], PCX, cz)
    b.add(CU, new THREE.SphereGeometry(0.28, 10, 8), mat(PCX, ly + 6.3, cz))
    b.rod('iron', V(PCX, ly + 6.1, cz), V(PCX, ly + 8.2, cz), 0.05, 6)
  }

  /* ================= river wing (C, D) — tile roofs as photographed ================= */
  const C: Rect = { x0: A.x1 - 0.4, x1: 25.4, z0: -17.0, z1: -6.4 }
  {
    const top = 19.4
    palaceBlock(b, C, top, false)
    bayRow(b, '+z', C.z1, A.x1 + 0.4, 23.6, 6, 'plain')
    bayRow(b, '-z', C.z0, -23.6, -A.x1 - 0.4, 6, 'plain')
    hippedRoof(b, 'tileRed', { x: (C.x0 + C.x1) / 2, z: (C.z0 + C.z1) / 2, w: C.x1 - C.x0, d: C.z1 - C.z0, y: top, pitch: 30, overhang: 0.45, seams: false, capKey: 'tileBrown' })
    // diagonal wing beyond the tower
    const g = new Builder()
    const L = 18.8
    const W = 10.4
    const R: Rect = { x0: -L / 2, x1: L / 2, z0: -W / 2, z1: W / 2 }
    palaceBlock(g, R, top, false)
    bayRow(g, '+z', R.z1, -L / 2 + 1.5, L / 2, 5, 'plain')
    bayRow(g, '-z', R.z0, -L / 2, L / 2 - 1.5, 5, 'plain')
    bayRow(g, '+x', R.x1, -W / 2, W / 2, 2, 'plain')
    hippedRoof(g, 'tileRed', { w: L, d: W, y: top, pitch: 30, overhang: 0.45, seams: false, capKey: 'tileBrown' })
    b.merge(g, mat(33.8, 0, -21.6, 57.4 * D2R))
  }

  /* ================= clock tower ================= */
  {
    const T = new Builder()
    const hw = 3.3
    // shaft up to the clock stage (base slightly wider as a risalit of the wing)
    T.block('chRender', 2 * hw + 0.4, 20.2, 2 * hw + 0.4, 0, 0, 0)
    T.block('chGranite', 2 * hw + 0.7, SOCLE, 2 * hw + 0.7, 0, 0, 0)
    T.block('chTrim', 2 * hw + 0.9, 0.55, 2 * hw + 0.9, 0, GF - 0.1, 0)
    T.block('chTrim', 2 * hw + 1.2, 0.6, 2 * hw + 1.2, 0, 19.6, 0)
    T.block('chRender', 2 * hw, 30.3 - 20.2, 2 * hw, 0, 20.2, 0)
    T.block('chTrim', 2 * hw + 0.4, 0.4, 2 * hw + 0.4, 0, 25.6, 0)
    T.block('chTrim', 2 * hw + 0.6, 0.55, 2 * hw + 0.6, 0, 30.0, 0)
    // clock stage with corner pilasters
    T.block('chRender', 2 * hw - 0.2, 36.0 - 30.5, 2 * hw - 0.2, 0, 30.5, 0)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) T.block('chTrim', 0.7, 5.5, 0.7, sx * (hw - 0.3), 30.5, sz * (hw - 0.3))
    T.block('chTrim', 2 * hw + 0.5, 0.6, 2 * hw + 0.5, 0, 36.0, 0)
    const faces: [Face, number][] = [
      ['+z', hw - 0.1],
      ['-z', -(hw - 0.1)],
      ['+x', hw - 0.1],
      ['-x', -(hw - 0.1)],
    ]
    const sp = (f: Face, d: number) => (f[0] === '+' ? d : -d)
    for (const [f, pl] of faces) {
      const m = faceFrame(f, pl, 0, 0, 0)
      // entrance arch (front only), shaft windows
      if (f === '+z') {
        T.add('chDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 2.2, 4.2, 0, 0.6, 10))), M(faceFrame(f, sp(f, hw + 0.2), 0, 0, 0), mat(0, 0, 0.03)))
        T.add('chTrim', extrude(frameShape('round', 2.2, 4.2, 0.4, 0, 0.6), 0.15), faceFrame(f, sp(f, hw + 0.2), 0, 0, 0))
      }
      window_(T, f, sp(f, hw + 0.2), 0, 8.3, { w: 1.3, h: 2.8, frame: 0.24, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true })
      window_(T, f, sp(f, hw + 0.2), 0, 13.9, { w: 1.2, h: 2.4, frame: 0.2, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04, sill: true })
      window_(T, f, pl + sp(f, 0.1), 0, 22.4, { w: 0.7, h: 1.2, frame: 0.16, frameKey: 'chTrim', glassKey: 'glassC', inset: 0.04 })
      window_(T, f, pl + sp(f, 0.1), 0, 26.6, { type: 'round', w: 1.4, h: 2.4, frame: 0.22, frameKey: 'chTrim', glassKey: 'black', inset: 0.04, bars: [2, 1] })
      // clock dial + segmental pediment
      T.add('white', new THREE.CylinderGeometry(1.2, 1.2, 0.12, 28), M(m, mat(0, 33.2, 0.1, 0, Math.PI / 2)))
      T.add('chTrim', new THREE.TorusGeometry(1.25, 0.12, 6, 28), M(m, mat(0, 33.2, 0.14)))
      T.add('black', metricBox(0.08, 0.85, 0.04), M(m, mat(0, 33.55, 0.19)))
      T.add('black', metricBox(0.6, 0.08, 0.04), M(m, mat(0.25, 33.2, 0.19)))
      const s = new THREE.Shape()
      s.absarc(0, -1.2, 2.6, Math.asin(1.2 / 2.6), Math.PI - Math.asin(1.2 / 2.6), false)
      T.add('chTrim', extrude(s, 0.45, 12), M(m, mat(0, 36.55, -0.1)))
    }
    // loggia stage: paired arches on each face, balustrade
    const lh = 2.85
    T.block('chRender', 2 * lh, 43.6 - 36.6, 2 * lh, 0, 36.6, 0)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) T.block('chTrim', 0.8, 7.0, 0.8, sx * (lh - 0.3), 36.6, sz * (lh - 0.3))
    for (const [f] of faces) {
      for (const du of [-0.95, 0.95]) window_(T, f, sp(f, lh + 0.02), du, 38.6, { type: 'round', w: 1.4, h: 3.6, frame: 0.2, frameKey: 'chTrim', glassKey: 'black', inset: 0.03 })
      T.add('chTrim', metricBox(0.45, 3.4, 0.45), faceFrame(f, sp(f, lh), 0, 38.6 + 1.7, 0.2))
      T.add('chTrim', metricBox(2 * lh, 0.9, 0.3), faceFrame(f, sp(f, lh), 0, 37.9, 0.2))
    }
    T.block('chTrim', 2 * lh + 0.9, 0.6, 2 * lh + 0.9, 0, 43.6, 0)
    // attic stage with balustrade, corner urns, small top lantern
    T.block('chRender', 4.4, 3.2, 4.4, 0, 44.2, 0)
    T.block('chTrim', 5.0, 0.4, 5.0, 0, 47.4, 0)
    for (const [f] of faces) window_(T, f, sp(f, 2.22), 0, 44.9, { type: 'round', w: 1.0, h: 1.9, frame: 0.16, frameKey: 'chTrim', glassKey: 'black', inset: 0.03 })
    {
      const r = lh + 0.3
      const c = [V(-r, 44.2, -r), V(r, 44.2, -r), V(r, 44.2, r), V(-r, 44.2, r)]
      for (let i = 0; i < 4; i++) balustrade(T, c[i], c[(i + 1) % 4], 1.0)
      for (const p of c) urn(T, p.x, 45.2, p.z, 0.9)
    }
    T.block('chRender', 1.8, 1.5, 1.8, 0, 47.8, 0)
    T.block('chTrim', 2.2, 0.25, 2.2, 0, 49.3, 0)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) urn(T, sx * 2.2, 47.8, sz * 2.2, 0.7)
    T.rod('iron', V(0, 49.5, 0), V(0, 54.0, 0), 0.05, 6)
    b.merge(T, mat(28.5, 0, -11.5, 25.4 * D2R))
  }

  /* ================= copper downpipes on the front ================= */
  for (const x of [A.x0 + 0.3, CPL.x1 + 0.2, CPR.x0 - 0.2, A.x1 - 0.3]) b.rod(CU, V(x, 0.4, A.z1 + 0.18), V(x, EAVE - 0.4, A.z1 + 0.18), 0.07, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [PCX, 29.5, 34],
  materials: () => ({
    chRender: new THREE.MeshStandardMaterial({ color: '#ecd9a6', roughness: 0.88 }),
    chTrim: new THREE.MeshStandardMaterial({ color: '#f3ebd4', roughness: 0.82 }),
    chGranite: new THREE.MeshStandardMaterial({ color: '#9b746a', roughness: 0.6 }),
    chDoor: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.6 }),
    chStatue: new THREE.MeshStandardMaterial({ color: '#d9d4c8', roughness: 0.8 }),
    chArms: new THREE.MeshStandardMaterial({ color: '#2f5f9e', roughness: 0.6 }),
  }),
  notes:
    'Eclectic city hall around a courtyard: brown copper mansards, a square copper dome with lantern over the central pavilion, giant-order façades and the 50 m clock tower on the river wing (tile roof as photographed); ornament simplified.',
}
export default model
