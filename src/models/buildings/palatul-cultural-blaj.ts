/**
 * Palatul Cultural, Blaj (Piața 1848) — cultural palace / theatre, inaugurated 1936,
 * rebuilt after the 1995 fire. Copper roofs (COLOR METAL).
 *
 * Modelling specification derived from the nine reference photographs (drone
 * views 01–07, street views 08–09) and the OSM outline (way 545039254,
 * 51.9 × 21.8 m, long axis 30.6°). Real metres; +X = long axis pointing to the
 * main façade (NNE, towards the square), +Z = ESE side, −Z = WNW street side.
 *
 *  - Three bodies along the axis: a front block (~9 m deep) with the main façade,
 *    the auditorium hall (~32 m) and the stage (fly) tower at the back (~12 m),
 *    which is the tallest volume. Two-storey side volumes with flat roofs run
 *    along the WNW street side; a one-storey annex on the ESE side.
 *  - Main façade (symmetrical about the central block): tall central block with
 *    the inscription "PALATVL CVLTVRAL", three arched windows with colonnettes
 *    over a balcony with a circle-pattern balustrade, two entrance doors; two
 *    flanking sections (3 arched windows above, 2 below) with parapet roofs;
 *    a lower wing on the ESE end with a hipped mono-pitch roof falling to the
 *    square; a polygonal corner bay on the WNW corner with a polygonal hip roof.
 *  - Cream render, beige socle, ochre window surrounds, ochre (zig-zag) friezes
 *    under every cornice, dark brown copper downpipes with rainwater heads.
 *  - Copper (aged, very dark grey-brown with traces of patina, as photographed):
 *    flat parapet roofs of the front block, the hipped wing roof, the corner bay
 *    roof, every parapet coping, the low-pitch gable roofs of the hall and of
 *    the stage tower. The WNW slopes of the hall and stage roofs show light
 *    joint strips in a running-bond grid (photos 02, 04, 07) — modelled as light
 *    joint strips; the ESE slopes are plain. Continuous glazed roof-light bands
 *    run along both eaves of the hall.
 * Approximations: absolute heights (from photo proportions: flanks ≈ 11.8 m,
 * central block ≈ 15.4 m, hall eave ≈ 14.6 m, stage tower ≈ 21.6 m), depth of
 * the front block, the corner bay drawn as a regular polygon, ESE and rear
 * elevations (barely visible: plain walls), friezes and balustrade simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, prism, ringBand, tentRoof, seams, window_, door, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'cuAged'
const JOINT = 'cuJoint'
const WALL = 'plasterWhite'
const SOCLE = 'plasterSand'
const FRIEZE = 'plasterOchre'
const SURR = 'stoneWarm'
const PIPE = 'copperBrown'
const SEAM = seams(CU, 0.55, 0.035, 0.045)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- plan (m) ---------------- */
const FRONT = 26.0 // façade plane of the flanks / wing
const FRONT_C = 26.35 // central block projects slightly
const HALL = { x0: -14.0, x1: 18.0, z0: -7.3, z1: 7.6, eave: 14.6, pitch: 12 }
const STAGE = { x0: -25.9, x1: -14.0, z0: -7.6, z1: 6.6, eave: 21.2, pitch: 7 }
const CEN = { x0: 17.0, z0: -3.3, z1: 2.6, roof: 14.0, top: 15.4 }
const FLANK_L = { x0: 17.4, z0: 2.6, z1: 6.8, roof: 11.0, top: 11.8 }
const FLANK_R = { x0: 17.4, z0: -7.5, z1: -3.3, roof: 11.0, top: 11.8 }
const WING = { x0: 16.5, z0: 6.8, z1: 10.9, eave: 9.6 }
const SIDE = { z0: -11.0, z1: -7.3 } // two-storey side volumes along the WNW street
const BAY = { x: 22.0, z: -7.5, r: 3.5, eave: 9.7 }

/** Plain wall body with beige socle. */
function body(b: Builder, x0: number, x1: number, z0: number, z1: number, h: number, socle = true) {
  const w = x1 - x0
  const d = z1 - z0
  b.block(WALL, w, h, d, (x0 + x1) / 2, 0, (z0 + z1) / 2)
  if (socle) b.block(SOCLE, w + 0.12, 1.15, d + 0.12, (x0 + x1) / 2, 0, (z0 + z1) / 2)
}

/** Rectangular perimeter band (4 boxes) from y to y+h, grown outward by `grow`, `th` deep. */
function band(b: Builder, key: string, x0: number, x1: number, z0: number, z1: number, y: number, h: number, grow: number, th = 0.45) {
  const X0 = x0 - grow
  const X1 = x1 + grow
  const Z0 = z0 - grow
  const Z1 = z1 + grow
  const t = th + grow
  b.block(key, X1 - X0, h, t, (X0 + X1) / 2, y, Z0 + t / 2)
  b.block(key, X1 - X0, h, t, (X0 + X1) / 2, y, Z1 - t / 2)
  b.block(key, t, h, Z1 - Z0 - 2 * t, X0 + t / 2, y, (Z0 + Z1) / 2)
  b.block(key, t, h, Z1 - Z0 - 2 * t, X1 - t / 2, y, (Z0 + Z1) / 2)
}

/** Ochre frieze + white cornice moulding ending at y (just under the coping / eave). */
function cornice(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, grow = 0.22) {
  band(b, FRIEZE, x0, x1, z0, z1, y - 0.82, 0.42, 0.03)
  band(b, WALL, x0, x1, z0, z1, y - 0.4, 0.12, grow * 0.6)
  band(b, WALL, x0, x1, z0, z1, y - 0.28, 0.28, grow)
}

/** Flat copper roof inside a parapet: roof slab at yr, parapet ring to yt with copper coping. */
function parapetRoof(b: Builder, x0: number, x1: number, z0: number, z1: number, yr: number, yt: number, t = 0.3) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  const ph = yt - yr
  b.block(WALL, w, ph, t, cx, yr, z0 + t / 2)
  b.block(WALL, w, ph, t, cx, yr, z1 - t / 2)
  b.block(WALL, t, ph, d, x0 + t / 2, yr, cz)
  b.block(WALL, t, ph, d, x1 - t / 2, yr, cz)
  // copper roof field, very slight fall (flat-lock panels -> fine seams)
  facet(b, CU, [V(x0 + t, yr + 0.05, z1 - t), V(x1 - t, yr + 0.05, z1 - t), V(x1 - t, yr + 0.05, z0 + t), V(x0 + t, yr + 0.05, z0 + t)], { seams: seams(CU, 1.1, 0.02, 0.04) })
  // copper coping (wide, overhanging the cornice)
  const c = 0.55
  b.block(CU, w + 0.2, 0.12, c, cx, yt, z0 + c / 2 - 0.1)
  b.block(CU, w + 0.2, 0.12, c, cx, yt, z1 - c / 2 + 0.1)
  b.block(CU, c, 0.12, d + 0.2, x0 + c / 2 - 0.1, yt, cz)
  b.block(CU, c, 0.12, d + 0.2, x1 - c / 2 + 0.1, yt, cz)
}

/** Arched window with ochre surround and a light sill. */
function arch(b: Builder, face: Face, plane: number, u: number, y0: number, w = 0.9, h = 2.1) {
  window_(b, face, plane, u, y0, { type: 'round', w, h, glassKey: 'glassC', frameKey: SURR, frame: 0.17, inset: 0.04 })
  b.add(SURR, metricBox(w + 0.5, 0.1, 0.22), M(faceFrame(face, plane, u, 0, 0), mat(0, y0 - 0.12, 0.1)))
  b.add('wood', metricBox(0.05, h - w / 2, 0.04), M(faceFrame(face, plane, u, 0, 0), mat(0, y0 + (h - w / 2) / 2, 0.06)))
}

/** Copper downpipe with a rainwater head on a façade. */
function downpipe(b: Builder, face: Face, plane: number, u: number, top: number) {
  const m = faceFrame(face, plane, u, 0, 0)
  const a = V(0, 0.2, 0.16).applyMatrix4(m)
  const c = V(0, top - 0.7, 0.16).applyMatrix4(m)
  b.rod(PIPE, a, c, 0.075, 8)
  b.add(PIPE, metricBox(0.36, 0.45, 0.3), M(m, mat(0, top - 0.5, 0.2)))
}

/** Low-pitch copper gable roof along X with optional light joint grid on the −Z slope and eave glazing bands. */
function lowGable(
  b: Builder,
  o: { x0: number; x1: number; z0: number; z1: number; eave: number; pitch: number; glass?: number; frontGable?: boolean; backGable?: boolean },
) {
  const t = Math.tan(o.pitch * D2R)
  const zc = (o.z0 + o.z1) / 2
  const hs = (o.z1 - o.z0) / 2
  const yR = o.eave + hs * t
  const yAt = (z: number) => o.eave + (hs - Math.abs(z - zc)) * t
  const g = o.glass ?? 0
  const e = 0.35 // coping inset
  const P = (x: number, z: number, lift = 0) => V(x, yAt(z) + lift, z)
  for (const s of [1, -1]) {
    const zE = s > 0 ? o.z1 - e : o.z0 + e
    const zG = zE - s * g
    if (g > 0) {
      facet(b, 'glassG', [P(o.x0, zE), P(o.x1, zE), P(o.x1, zG), P(o.x0, zG)])
      // glazing bars across the band and a longitudinal bar
      for (let x = o.x0 + 1.2; x < o.x1 - 0.3; x += 1.2) b.beam('helm', P(x, zE, 0.04), P(x, zG, 0.04), 0.07, 0.07)
      b.beam('helm', P(o.x0, zG + s * 0.05, 0.05), P(o.x1, zG + s * 0.05, 0.05), 0.12, 0.08)
      b.beam('helm', P(o.x0, (zE + zG) / 2, 0.05), P(o.x1, (zE + zG) / 2, 0.05), 0.06, 0.06)
    }
    const pts = [P(o.x0, zG), P(o.x1, zG), P(o.x1, zc), P(o.x0, zc)]
    if (s > 0) {
      facet(b, CU, pts, { seams: SEAM, thickness: 0.08 })
    } else {
      // WNW slope: copper with light joint strips in a running-bond grid
      facet(b, CU, pts, { seams: seams(JOINT, 0.92, 0.025, 0.07), thickness: 0.08 })
      const run = Math.abs(zG - zc)
      const step = 1.75
      let col = 0
      for (let x = o.x0 + 0.46; x < o.x1 - 0.5; x += 0.92, col++) {
        for (let s0 = (col % 2) * (step / 2) + step / 2; s0 < run - 0.3; s0 += step) {
          const z = zG + s0
          b.beam(JOINT, P(x, z, 0.02), P(Math.min(x + 0.92, o.x1 - 0.1), z, 0.02), 0.07, 0.025)
        }
      }
    }
    // eave coping
    b.beam(CU, V(o.x0 - 0.2, o.eave + 0.08, s > 0 ? o.z1 - 0.2 : o.z0 + 0.2), V(o.x1 + 0.2, o.eave + 0.08, s > 0 ? o.z1 - 0.2 : o.z0 + 0.2), 0.62, 0.22)
  }
  b.beam(CU, V(o.x0, yR + 0.07, zc), V(o.x1, yR + 0.07, zc), 0.3, 0.14)
  // gable walls with copper rake copings
  for (const [x, on] of [
    [o.x0, o.backGable ?? true],
    [o.x1, o.frontGable ?? true],
  ] as [number, boolean][]) {
    if (!on) continue
    const tri = new THREE.Shape([new THREE.Vector2(-hs, 0), new THREE.Vector2(hs, 0), new THREE.Vector2(0, yR - o.eave)])
    const dir = x === o.x1 ? 1 : -1
    b.add(WALL, extrude(tri, 0.4), mat(x - (dir > 0 ? 0.4 : 0), o.eave, zc, Math.PI / 2))
    for (const s of [1, -1]) b.beam(CU, V(x, o.eave + 0.12, zc + s * (hs + 0.15)), V(x, yR + 0.14, zc), 0.6, 0.16, V(0, 1, 0))
  }
  return yR
}

function build(): Builder {
  const b = new Builder()

  /* ================= auditorium hall ================= */
  body(b, HALL.x0, HALL.x1, HALL.z0, HALL.z1, HALL.eave)
  cornice(b, HALL.x0, HALL.x1, HALL.z0, HALL.z1, HALL.eave)
  lowGable(b, { ...HALL, glass: 2.1, backGable: false })

  /* ================= stage (fly) tower ================= */
  body(b, STAGE.x0, STAGE.x1, STAGE.z0, STAGE.z1, STAGE.eave)
  cornice(b, STAGE.x0, STAGE.x1, STAGE.z0, STAGE.z1, STAGE.eave, 0.16)
  lowGable(b, { ...STAGE })
  // small high windows of the stage tower (rear wall) and side
  for (const u of [-3.2, 3.2]) window_(b, '-x', STAGE.x0, u, 15.5, { w: 0.9, h: 1.3, frame: 0.12, frameKey: SURR })

  /* ================= side volumes along the WNW street (−Z) ================= */
  const sides: [number, number, number][] = [
    [-23.6, -14.0, 9.3],
    [-14.0, 4.5, 10.4],
    [4.5, 19.6, 10.4],
  ]
  for (const [x0, x1, h] of sides) {
    body(b, x0, x1, SIDE.z0, SIDE.z1, h - 0.8)
    cornice(b, x0, x1, SIDE.z0, SIDE.z1, h - 0.1, 0.16)
    parapetRoof(b, x0, x1, SIDE.z0, SIDE.z1, h - 0.8, h)
  }
  // street elevation: arched windows in two storeys, downpipes
  for (let x = -21.6; x <= 16.5; x += 3.15) {
    if (x > -14.6 && x < -13.4) continue
    const u = -x
    const top = x < -14 ? 8.4 : 9.4
    arch(b, '-z', SIDE.z0, u, 1.6, 0.9, 2.15)
    if (x > -14) arch(b, '-z', SIDE.z0, u, 5.9, 0.9, 2.15)
    else window_(b, '-z', SIDE.z0, u, 5.4, { w: 0.9, h: 1.6, frame: 0.15, frameKey: SURR })
    if (Math.round((x + 21.6) / 3.15) % 3 === 1) downpipe(b, '-z', SIDE.z0, u + 1.57, top)
  }
  // rear end of the side volumes
  window_(b, '-x', -23.6, 9.2, 1.8, { w: 0.9, h: 1.6, frame: 0.15, frameKey: SURR })

  /* ================= ESE annex (one storey) ================= */
  body(b, -4.0, 16.6, HALL.z1, 10.9, 4.0)
  parapetRoof(b, -4.0, 16.6, HALL.z1, 10.9, 4.0, 4.6)
  for (let x = -1.5; x < 15; x += 3.4) window_(b, '+z', 10.9, x, 1.4, { w: 1.0, h: 1.4, frame: 0.12, frameKey: SURR })

  /* ================= front block ================= */
  // central block
  body(b, CEN.x0, FRONT_C, CEN.z0, CEN.z1, CEN.roof)
  cornice(b, CEN.x0, FRONT_C, CEN.z0, CEN.z1, CEN.top - 0.1, 0.26)
  parapetRoof(b, CEN.x0, FRONT_C, CEN.z0, CEN.z1, CEN.roof, CEN.top, 0.35)
  // flanking sections
  for (const f of [FLANK_L, FLANK_R]) {
    body(b, f.x0, FRONT, f.z0, f.z1, f.roof)
    cornice(b, f.x0, FRONT, f.z0, f.z1, f.top - 0.1)
    parapetRoof(b, f.x0, FRONT, f.z0, f.z1, f.roof, f.top)
  }
  // lower ESE wing with hipped mono-pitch roof falling to the square
  {
    const { x0, z0, z1, eave } = WING
    body(b, x0, FRONT, z0, z1, eave)
    cornice(b, x0, FRONT, z0, z1, eave, 0.18)
    const t1 = Math.tan(15 * D2R)
    const t2 = Math.tan(48 * D2R)
    const o = 0.35
    const xe = FRONT + o
    const ze = z1 + o
    const e = eave - o * t1
    const rise = (xe - x0) * t1
    const zh = ze - rise / t2
    facet(b, CU, [V(xe, e, z0), V(xe, e, ze), V(x0, e + rise, zh), V(x0, e + rise, z0)], { seams: SEAM, thickness: 0.08 })
    facet(b, CU, [V(xe, e, ze), V(x0, e, ze), V(x0, e + rise, zh)], { seams: SEAM, thickness: 0.08, hint: V(0, 1, 0) })
    b.beam(CU, V(xe, e + 0.05, ze), V(x0, e + rise + 0.05, zh), 0.2, 0.12)
    b.beam(CU, V(xe, e - 0.06, z0), V(xe, e - 0.06, ze), 0.2, 0.2)
    // back wall closing the mono-pitch under the higher roofs behind
    b.block(WALL, 0.3, rise + 0.2, zh - z0 + 0.3, x0 + 0.15, eave - 0.2, (z0 + zh) / 2)
  }
  // polygonal corner bay (WNW corner)
  {
    const n = 10
    prism(b, WALL, { x: BAY.x, z: BAY.z, n, r: BAY.r, h: BAY.eave })
    prism(b, SOCLE, { x: BAY.x, z: BAY.z, n, r: BAY.r + 0.06, h: 1.15 })
    ringBand(b, FRIEZE, { x: BAY.x, z: BAY.z, n, r: BAY.r, y: BAY.eave - 0.8, h: 0.42, grow: 0.03 })
    ringBand(b, WALL, { x: BAY.x, z: BAY.z, n, r: BAY.r, y: BAY.eave - 0.3, h: 0.28, grow: 0.16 })
    tentRoof(b, CU, { x: BAY.x, z: BAY.z, n, r: BAY.r, y: BAY.eave, h: 1.45, seams: SEAM, overhang: 0.32 })
    // windows on the outward facets (normals at -36°, -72°, -108°)
    const ap = BAY.r * Math.cos(Math.PI / n)
    for (const deg of [-36, -72, -108]) {
      const a = deg * D2R
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      const ry = Math.atan2(nx, nz)
      const fm = mat(BAY.x + nx * ap, 0, BAY.z + nz * ap, ry)
      for (const [y0, h] of [
        [1.6, 2.1],
        [5.9, 2.1],
      ]) {
        b.add('glassC', new THREE.PlaneGeometry(0.82, h - 0.41), M(fm, mat(0, y0 + (h - 0.41) / 2, 0.04)))
        b.add('glassC', new THREE.CircleGeometry(0.41, 10, 0, Math.PI), M(fm, mat(0, y0 + h - 0.41, 0.04)))
        b.add(SURR, metricBox(1.1, 0.14, 0.12), M(fm, mat(0, y0 + h + 0.04, 0.06)))
        b.add(SURR, metricBox(1.1, 0.1, 0.2), M(fm, mat(0, y0 - 0.1, 0.1)))
      }
    }
  }

  /* ---------------- main façade (+X) ---------------- */
  const FF: Face = '+x'
  // ESE wing (u = -z)
  for (const du of [-1.25, 0, 1.25]) arch(b, FF, FRONT, -8.85 + du, 6.2, 0.85, 1.95)
  for (const du of [-0.8, 0.8]) arch(b, FF, FRONT, -8.85 + du, 1.6, 0.95, 2.3)
  // flanking sections
  for (const uc of [-4.7, 5.4]) {
    for (const du of [-1.2, 0, 1.2]) arch(b, FF, FRONT, uc + du, 6.3, 0.85, 2.05)
    for (const du of [-0.8, 0.8]) arch(b, FF, FRONT, uc + du, 1.6, 0.95, 2.35)
  }
  // central block: three tall arched windows with colonnettes, balcony, two doors, inscription
  {
    const uc = 0.35
    const fm = faceFrame(FF, FRONT_C, uc, 0, 0)
    for (const du of [-1.35, 0, 1.35]) {
      window_(b, FF, FRONT_C, uc + du, 6.25, { type: 'round', w: 1.0, h: 2.7, glassKey: 'glassC', frameKey: SURR, frame: 0.16, inset: 0.04 })
      b.add('wood', metricBox(0.06, 2.1, 0.04), M(fm, mat(du, 6.25 + 1.05, 0.06)))
    }
    for (const du of [-0.67, 0.67]) {
      b.add(SURR, new THREE.CylinderGeometry(0.1, 0.11, 2.1, 10), M(fm, mat(du, 6.25 + 1.05, 0.14)))
      b.add(SURR, metricBox(0.32, 0.22, 0.3), M(fm, mat(du, 8.45, 0.14)))
    }
    // balcony: slab, ochre bracket frieze, balustrade with three roundel panels
    b.add(SOCLE, metricBox(4.9, 0.28, 1.05), M(fm, mat(0, 5.55, 0.52)))
    b.add(FRIEZE, metricBox(4.5, 0.42, 0.6), M(fm, mat(0, 5.22, 0.3)))
    b.add(WALL, metricBox(4.9, 0.95, 0.16), M(fm, mat(0, 6.17, 0.98)))
    for (const s of [-1, 1]) b.add(WALL, metricBox(0.16, 0.95, 1.05), M(fm, mat(s * 2.37, 6.17, 0.52)))
    b.add(WALL, metricBox(5.0, 0.12, 1.15), M(fm, mat(0, 6.7, 0.54)))
    for (const du of [-1.5, 0, 1.5]) {
      b.add(FRIEZE, metricBox(1.15, 0.42, 0.04), M(fm, mat(du, 6.17, 1.07)))
      for (const k of [-0.39, -0.13, 0.13, 0.39]) b.add(WALL, new THREE.TorusGeometry(0.11, 0.025, 4, 12), M(fm, mat(du + k, 6.17, 1.1)))
    }
    // entrance doors with entablature, and the inscription band
    for (const du of [-1.2, 1.2]) door(b, FF, FRONT_C, uc + du, { w: 1.3, h: 2.75, y0: 0.25, leafKey: 'wood', frameKey: SURR, frame: 0.22 })
    b.add(SURR, metricBox(4.6, 0.3, 0.3), M(fm, mat(0, 3.42, 0.12)))
    b.add(SOCLE, metricBox(5.4, 0.25, 1.6), M(fm, mat(0, 0.12, 0.8)))
    const letters = (n: number, y: number) => {
      for (let i = 0; i < n; i++) b.add('brass', metricBox(0.22, 0.42, 0.04), M(fm, mat((i - (n - 1) / 2) * 0.36, y, 0.03)))
    }
    letters(7, 11.85)
    letters(8, 11.15)
  }
  // façade downpipes between the sections (top at each cornice)
  downpipe(b, FF, FRONT, -6.8, WING.eave)
  downpipe(b, FF, FRONT, -2.6, FLANK_L.roof)
  downpipe(b, FF, FRONT, 3.3, FLANK_R.roof)
  downpipe(b, FF, FRONT, 7.45, FLANK_R.roof)
  // ESE end of the wing
  for (const x of [19.0, 23.0]) {
    arch(b, '+z', WING.z1, x, 6.2, 0.85, 1.95)
    arch(b, '+z', WING.z1, x, 1.6, 0.95, 2.3)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [2, 15.5, 3],
  materials: (base) => {
    // Aged copper as photographed: very dark grey-brown (built on the graphite sheet texture, warmed)
    const cu = (base.zincGraphite as THREE.MeshStandardMaterial).clone()
    cu.color.set('#b4a89f')
    cu.metalness = 0.5
    cu.roughness = 0.56
    const joint = new THREE.MeshStandardMaterial({ color: '#dcdcd6', roughness: 0.55, metalness: 0.15 })
    return { [CU]: cu, [JOINT]: joint }
  },
  notes: 'Massing, heights and the side/rear elevations interpreted from drone photographs; ornament simplified.',
}
export default model
