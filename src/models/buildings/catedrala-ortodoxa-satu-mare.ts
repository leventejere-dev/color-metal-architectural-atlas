/**
 * Orthodox Cathedral "Adormirea Maicii Domnului" (Dormition of the Theotokos),
 * Satu Mare — OSM way 534845460 (crude 31.6 × 19.3 m rectangle, axis 106.3°).
 *
 * Modelling specification (real metres) from the three reference photographs
 * (01 west front from a raised point, 02–03 drone views of a lateral façade):
 *  - Neo-Byzantine cross-in-square: main block ~22.4 × 19.2 m, cream plaster,
 *    light grey pilasters and a blind-arcade frieze, cornice at ~14 m covered
 *    with a sloping copper skirt.
 *  - Four CORNER TOWERS (5.2 m square bases, attic to ~17 m with corner urns),
 *    octagonal drums with an arched window on every face, white arcaded
 *    cornice, ribbed helmet domes, crosses (~28 m).
 *  - Cross ARMS ending in tall arched gables (top ~22.6 m) set back ~3 m behind
 *    the façade; in front of each gable a steep copper pent roof spanning the
 *    central bay (photos 01, 03). Copper barrel roofs over the arms.
 *  - CENTRAL DRUM over the crossing: octagonal copper-roofed pedestal, 12-sided
 *    drum (Ø ≈ 7.8 m) with tall arched windows, arcaded cornice, ribbed helmet
 *    dome, knob and Orthodox cross (~45 m).
 *  - West PORTICO (exonarthex): five round arches on columns, raised on steps,
 *    small copper roof with an octagonal lantern dome.
 *  - Lateral façades: mosaic band under the cornice, two rows of small windows
 *    in the central bay, slit windows in the tower bays (photo 03).
 *  - Polygonal east APSE with a half-pyramid copper roof.
 *  - COLOR METAL copper (verified): all roofs and domes — domes dark-brown
 *    oxidised, lower roofs warmer copper, as photographed.
 * Approximations: plan dimensions from the crude OSM rectangle and photo
 * ratios; heights from photo 01; the east elevation and apse are not
 * photographed (interpreted); ornament, mosaics and dome patterns simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, polyRing, ringBand, barrelRoof, dome, cross, seams } from '../kit'
import type { ModelModule } from '../registry'

const SEAM = seams('copper', 0.5, 0.04, 0.04)

const MB = { x0: -10.6, x1: 11.8, hz: 9.6, h: 14.0 } // main block
const MXC = (MB.x0 + MB.x1) / 2
const TS = 5.2 // corner tower base size
const ARM_X = MB.hz - TS // half-width of the W/E arms (z)  = 4.4
const ARM_Z = (MB.x1 - MB.x0) / 2 - TS // half-width of the N/S arms (x) = 6.0
const SET = 3.0 // arched gables set back behind the façade
const GABLE_TOP = 22.6
const PORT = { x0: -14.8, x1: MB.x0, hz: 5.6, floor: 1.2, h: 8.6 }
const APSE = { xc: MB.x1, r: 4.0, h: 11.0 }
const DRUM = { x: MXC, r: 3.9, y0: 25.4, y1: 34.6 }

const v2 = (x: number, y: number) => new THREE.Vector2(x, y)
const on = (m: THREE.Matrix4, l: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(m, l)

/** Byzantine helmet dome profile [r, y] (unit radius / unit height). */
const HELMET: [number, number][] = [
  [1.0, 0],
  [1.02, 0.1],
  [1.0, 0.24],
  [0.94, 0.4],
  [0.83, 0.56],
  [0.66, 0.72],
  [0.45, 0.85],
  [0.24, 0.94],
  [0.1, 0.99],
  [0.02, 1.0],
]

/** Arched (round-headed) window with light surround on a frame m (local z outward). */
function archWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, glass = 'glassC', f = 0.14) {
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), on(m, mat(0, 0, 0.03)))
  if (f > 0) b.add('scTrim', extrude(frameShape('round', w, h, f, 0, y0), 0.08), on(m, mat(0, 0, 0.01)))
}

/** Polygonal drum with an arched window on each face, pilasters, arcaded cornice and ribbed helmet dome. */
function domedDrum(b: Builder, o: { x: number; z: number; n: number; r: number; y0: number; y1: number; win: [number, number]; domeR: number; domeH: number; ribs: number; crossS: number }) {
  const { x, z, n, r, y0, y1 } = o
  const R = r / Math.cos(Math.PI / n) // circumradius for apothem r
  const phase = Math.PI / n
  b.add('scPlaster', loft([polyRing(n, R, y0, phase, x, z), polyRing(n, R, y1, phase, x, z)], { capTop: true, flat: true }))
  ringBand(b, 'scTrim', { x, z, n, r: R, y: y0, h: 0.35, grow: 0.12, phase })
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase + Math.PI / n // face normal direction
    const fx = x + Math.cos(a) * r
    const fz = z + Math.sin(a) * r
    const m = mat(fx, 0, fz, Math.PI / 2 - a)
    archWin(b, m, o.win[0], o.win[1], y0 + (y1 - y0 - o.win[1]) * 0.45, 'glassC', 0.12)
    // pilaster at the corner
    const ca = (i / n) * Math.PI * 2 + phase
    b.add('scTrim', metricBox(0.32, y1 - y0, 0.32), mat(x + Math.cos(ca) * (R - 0.05), (y0 + y1) / 2, z + Math.sin(ca) * (R - 0.05), -ca))
  }
  // arcaded (dentil) cornice
  ringBand(b, 'scTrim', { x, z, n, r: R, y: y1, h: 0.55, grow: 0.22, phase })
  const teeth = n * 3
  for (let k = 0; k < teeth; k++) {
    const a = (k / teeth) * Math.PI * 2
    b.add('scTrim', metricBox(0.16, 0.3, 0.12), mat(x + Math.cos(a) * (R + 0.08), y1 - 0.15, z + Math.sin(a) * (R + 0.08), -a))
  }
  // dome (oxidised copper) with meridian ribs, knob, cross
  const dy = y1 + 0.55
  b.add('scDome', loft([polyRing(32, o.domeR + 0.05, dy - 0.05, 0, x, z), polyRing(32, o.domeR, dy + 0.02, 0, x, z)], { capTop: false }))
  const top = dome(b, 'scDome', { x, y: dy, z, r: o.domeR, h: o.domeH, profile: HELMET, seg: 32, ribs: o.ribs, ribH: Math.max(0.05, o.domeR * 0.018) })
  b.add('scDome', lathe([[0.0, 0], [o.domeR * 0.09, 0], [o.domeR * 0.07, o.domeR * 0.09], [o.domeR * 0.12, o.domeR * 0.17], [o.domeR * 0.06, o.domeR * 0.28], [0, o.domeR * 0.3]], 16), mat(x, top - 0.05, z))
  cross(b, 'gilt', x, top + o.domeR * 0.22, z, o.crossS, true, Math.PI / 2)
}

/** Arched gable wall in the plane of local XY (span w, springing ys, semicircular), extruded t. */
function archGable(b: Builder, m: THREE.Matrix4, w: number, yBase: number, ys: number, t: number) {
  const hw = w / 2
  const pts = [v2(-hw, yBase), v2(hw, yBase)]
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI
    pts.push(v2(Math.cos(a) * hw, ys + Math.sin(a) * hw))
  }
  b.add('scPlaster', extrude(new THREE.Shape(pts), t), m)
  // raised arch moulding + recessed tympanum ledge
  const ring = new THREE.Shape()
  ring.absarc(0, ys, hw + 0.05, 0, Math.PI, false)
  ring.lineTo(-hw + 0.55, ys)
  ring.absarc(0, ys, hw - 0.55, Math.PI, 0, true)
  ring.lineTo(hw + 0.05, ys)
  b.add('scTrim', extrude(ring, 0.25), on(m, mat(0, 0, t)))
  for (const s of [-1, 1]) b.add('scTrim', metricBox(0.5, ys - yBase, 0.25), on(m, mat(s * (hw - 0.25), (ys + yBase) / 2, t + 0.12)))
  b.add('scTrim', metricBox(w - 1.1, 0.25, 0.35), on(m, mat(0, ys - 0.6, t + 0.15)))
  // slightly recessed, darker tympanum inside the arch
  const tym = new THREE.Shape()
  tym.moveTo(-(hw - 0.55), ys - 0.45)
  tym.lineTo(hw - 0.55, ys - 0.45)
  tym.absarc(0, ys, hw - 0.55, 0, Math.PI, false)
  b.add('scPlasterDk', new THREE.ShapeGeometry(tym, 16), on(m, mat(0, 0, t + 0.02)))
}

function build(): Builder {
  const b = new Builder()
  const H = MB.h
  const L = MB.x1 - MB.x0

  /* ---------------- main block ---------------- */
  b.block('scPlaster', L, H, 2 * MB.hz, MXC, 0, 0)
  b.block('socle', L + 0.3, 1.0, 2 * MB.hz + 0.3, MXC, 0, 0)
  b.block('scTrim', L + 0.25, 0.4, 2 * MB.hz + 0.25, MXC, H - 2.2, 0) // frieze base
  b.block('scTrim', L + 0.5, 0.45, 2 * MB.hz + 0.5, MXC, H - 0.45, 0) // cornice
  // copper skirt roof over the cornice
  {
    const o = 0.85
    const y0 = H - 0.25
    const y1 = H + 0.45
    const xa = MB.x0 - o
    const xb = MB.x1 + o
    const za = MB.hz + o
    const xi0 = MB.x0 + 0.2
    const xi1 = MB.x1 - 0.2
    const zi = MB.hz - 0.2
    facet(b, 'copper', [V(xa, y0, za), V(xb, y0, za), V(xi1, y1, zi), V(xi0, y1, zi)], { seams: SEAM, thickness: 0.06 })
    facet(b, 'copper', [V(xb, y0, -za), V(xa, y0, -za), V(xi0, y1, -zi), V(xi1, y1, -zi)], { seams: SEAM, thickness: 0.06 })
    facet(b, 'copper', [V(xb, y0, za), V(xb, y0, -za), V(xi1, y1, -zi), V(xi1, y1, zi)], { seams: SEAM, thickness: 0.06 })
    facet(b, 'copper', [V(xa, y0, -za), V(xa, y0, za), V(xi0, y1, zi), V(xi0, y1, -zi)], { seams: SEAM, thickness: 0.06 })
    b.block('copper', L - 0.4, 0.12, 2 * MB.hz - 0.4, MXC, y1 - 0.05, 0)
  }
  // pilasters at the tower-bay edges and corners (all four sides)
  for (const s of [-1, 1]) {
    for (const x of [MB.x0 + 0.3, MB.x0 + TS, MB.x1 - TS, MB.x1 - 0.3]) b.add('scTrim', metricBox(0.6, H - 1.0, 0.2), mat(x, 1.0 + (H - 1.0) / 2, s * (MB.hz + 0.1)))
    for (const z of [MB.hz - 0.3, MB.hz - TS, -MB.hz + TS, -MB.hz + 0.3]) {
      const xx = s < 0 ? MB.x0 - 0.1 : MB.x1 + 0.1
      b.add('scTrim', metricBox(0.2, H - 1.0, 0.6), mat(xx, 1.0 + (H - 1.0) / 2, z))
    }
  }
  // blind-arcade frieze under the cornice (small arched niches)
  const nicheRow = (m: THREE.Matrix4, u0: number, u1: number) => {
    const n = Math.max(2, Math.round((u1 - u0) / 1.15))
    for (let i = 0; i < n; i++) {
      const u = u0 + ((i + 0.5) * (u1 - u0)) / n
      b.add('plasterSand', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.75, 1.3, u, H - 1.75, 8))), on(m, mat(0, 0, 0.02)))
    }
  }
  for (const s of [-1, 1]) {
    const m = s > 0 ? mat(0, 0, MB.hz, 0) : mat(0, 0, -MB.hz, Math.PI)
    const sgn = s > 0 ? 1 : -1
    nicheRow(m, sgn * (MB.x0 + 0.6), sgn * (MB.x0 + TS - 0.3))
    nicheRow(m, sgn * (MB.x1 - TS + 0.3), sgn * (MB.x1 - 0.6))
  }

  /* ---------------- lateral façades (N/S): mosaic band, windows ---------------- */
  for (const s of [-1, 1]) {
    const m = s > 0 ? mat(0, 0, MB.hz, 0) : mat(0, 0, -MB.hz, Math.PI)
    const u = (x: number) => (s > 0 ? x : -x)
    // mosaic band in the central bay
    b.add('scMosaic', metricBox(2 * ARM_Z - 1.0, 1.5, 0.08), on(m, mat(u(MXC), H - 1.6, 0.05)))
    for (let k = 0; k < 7; k++) b.add('gilt', metricBox(0.08, 1.3, 0.1), on(m, mat(u(MXC - ARM_Z + 0.5 + (k * (2 * ARM_Z - 1)) / 6), H - 1.6, 0.07)))
    // two rows of six small windows
    for (const y0 of [5.6, 8.6]) {
      for (let i = 0; i < 6; i++) {
        const x = MXC - ARM_Z + 1.0 + (i + 0.5) * ((2 * ARM_Z - 2.0) / 6)
        b.add('glassC', metricBox(0.6, 1.2, 0.05), on(m, mat(u(x), y0 + 0.6, 0.03)))
        b.add('scTrim', metricBox(0.85, 0.1, 0.16), on(m, mat(u(x), y0 - 0.05, 0.06)))
      }
    }
    b.add('scTrim', metricBox(2 * ARM_Z - 0.6, 0.25, 0.18), on(m, mat(u(MXC), 11.2, 0.08)))
    // tower bays: paired slit windows
    for (const xc of [MB.x0 + TS / 2, MB.x1 - TS / 2]) {
      for (const du of [-0.7, 0.7]) {
        archWin(b, m.clone().multiply(mat(u(xc + du), 0, 0)), 0.55, 3.2, 3.0)
        archWin(b, m.clone().multiply(mat(u(xc + du), 0, 0)), 0.55, 2.4, 8.0)
      }
    }
    // side door into the west tower bay
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.6, 3.0, 0, 0, 10))), on(m, mat(u(MB.x0 + TS / 2), 0, 0.03)))
  }
  // west façade tower bays & east façade
  for (const zc of [-(MB.hz - TS / 2), MB.hz - TS / 2]) {
    for (const du of [-0.7, 0.7]) {
      archWin(b, mat(MB.x0, 0, zc + du, -Math.PI / 2), 0.55, 3.2, 3.0)
      archWin(b, mat(MB.x0, 0, zc + du, -Math.PI / 2), 0.55, 2.4, 8.0)
      archWin(b, mat(MB.x1, 0, zc + du, Math.PI / 2), 0.55, 3.2, 3.0)
      archWin(b, mat(MB.x1, 0, zc + du, Math.PI / 2), 0.55, 2.4, 8.0)
    }
  }
  b.add('scMosaic', metricBox(0.08, 1.5, 2 * ARM_X - 1.0), mat(MB.x0 - 0.05, H - 1.6, 0))

  /* ---------------- arms: pent roofs, arched gables, barrel roofs ---------------- */
  const yPent = H + 0.45
  const pentRise = 2.4
  const yB = yPent + pentRise // gable base
  // W & E arms (span 2·ARM_X across z)
  for (const s of [-1, 1]) {
    const xf = s < 0 ? MB.x0 : MB.x1 // façade plane
    const xg = xf - s * SET // gable plane
    facet(b, 'copper', [V(xf + s * 0.5, yPent - 0.3, -ARM_X - 0.1), V(xf + s * 0.5, yPent - 0.3, ARM_X + 0.1), V(xg, yB, ARM_X + 0.1), V(xg, yB, -ARM_X - 0.1)], { seams: SEAM, thickness: 0.08 })
    // arm walls above the main block between the gable and the crossing
    b.block('scPlaster', SET + 0.2, yB - H, 2 * ARM_X, xf - s * SET / 2, H, 0)
    const ys = GABLE_TOP - ARM_X
    archGable(b, mat(xg, 0, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2), 2 * ARM_X, yB - 0.05, ys, 0.5)
    // barrel roof from the gable into the crossing
    const x0 = xg
    const x1 = MXC - s * 1.0
    const sub = new Builder()
    barrelRoof(sub, 'copper', { x: (x0 + x1) / 2, z: 0, w: Math.abs(x1 - x0), d: 2 * ARM_X, y: ys, rise: ARM_X, segs: 14, overhang: 0.25, seams: SEAM })
    b.merge(sub)
    b.block('scPlaster', Math.abs(x1 - x0), ys - yB, 2 * ARM_X - 0.1, (x0 + x1) / 2, yB, 0)
  }
  // N & S arms (span 2·ARM_Z across x)
  for (const s of [-1, 1]) {
    const zf = s * MB.hz
    const zg = zf - s * SET
    facet(b, 'copper', [V(MXC - ARM_Z - 0.1, yPent - 0.3, zf + s * 0.5), V(MXC + ARM_Z + 0.1, yPent - 0.3, zf + s * 0.5), V(MXC + ARM_Z + 0.1, yB, zg), V(MXC - ARM_Z - 0.1, yB, zg)], { seams: SEAM, thickness: 0.08 })
    b.block('scPlaster', 2 * ARM_Z, yB - H, SET + 0.2, MXC, H, zf - s * SET / 2)
    const ys = GABLE_TOP - ARM_Z
    archGable(b, mat(MXC, 0, zg, s < 0 ? Math.PI : 0), 2 * ARM_Z, yB - 0.05, ys, 0.5)
    const z0 = zg
    const z1 = -s * 1.0
    const sub = new Builder()
    barrelRoof(sub, 'copper', { x: 0, z: 0, w: Math.abs(z1 - z0), d: 2 * ARM_Z, y: ys, rise: ARM_Z, segs: 16, overhang: 0.25, seams: SEAM })
    b.merge(sub, mat(MXC, 0, (z0 + z1) / 2, Math.PI / 2))
    b.block('scPlaster', 2 * ARM_Z - 0.1, ys - yB, Math.abs(z1 - z0), MXC, yB, (z0 + z1) / 2)
  }

  /* ---------------- crossing: octagonal pedestal + central drum & dome ---------------- */
  {
    const n = 8
    const ph = Math.PI / 8
    const Rp = 5.0
    b.add('scPlaster', loft([polyRing(n, Rp, GABLE_TOP - 1.0, ph, DRUM.x, 0), polyRing(n, Rp, GABLE_TOP + 1.3, ph, DRUM.x, 0)], { capTop: true, flat: true }))
    ringBand(b, 'scTrim', { x: DRUM.x, z: 0, n, r: Rp, y: GABLE_TOP + 1.0, h: 0.35, grow: 0.15, phase: ph })
    // sloping copper roof of the pedestal up to the drum
    const lo = polyRing(n, Rp + 0.45, GABLE_TOP + 1.25, ph, DRUM.x, 0)
    const hi = polyRing(n, DRUM.r / Math.cos(Math.PI / 12) + 0.1, DRUM.y0 + 0.1, ph, DRUM.x, 0)
    for (let i = 0; i < n; i++) facet(b, 'copper', [lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]], { seams: SEAM, thickness: 0.06 })
    domedDrum(b, { x: DRUM.x, z: 0, n: 12, r: DRUM.r, y0: DRUM.y0 - 0.3, y1: DRUM.y1, win: [0.72, 6.0], domeR: 4.15, domeH: 5.2, ribs: 16, crossS: 2.6 })
  }

  /* ---------------- four corner towers ---------------- */
  const ty = 17.1
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx < 0 ? MB.x0 + TS / 2 : MB.x1 - TS / 2
      const z = sz * (MB.hz - TS / 2)
      // attic of the square base above the main cornice
      b.block('scPlaster', TS, ty - H, TS, x, H, z)
      b.block('scTrim', TS + 0.4, 0.35, TS + 0.4, x, ty - 0.35, z)
      b.block('copper', TS + 0.7, 0.12, TS + 0.7, x, ty, z)
      for (const [ux, uz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        b.add('scTrim', lathe([[0, 0], [0.32, 0], [0.32, 0.15], [0.2, 0.3], [0.34, 0.65], [0.2, 0.95], [0.08, 1.05], [0, 1.15]], 10), mat(x + ux * (TS / 2 - 0.25), ty + 0.1, z + uz * (TS / 2 - 0.25)))
      }
      // small windows in the attic (outer faces) with arched heads
      archWin(b, mat(x, 0, z + sz * TS / 2, sz > 0 ? 0 : Math.PI), 0.7, 0.9, H + 1.1, 'glassC', 0.12)
      archWin(b, mat(x + sx * TS / 2, 0, z, sx > 0 ? Math.PI / 2 : -Math.PI / 2), 0.7, 0.9, H + 1.1, 'glassC', 0.12)
      // segmental arch mouldings crowning the attic faces
      for (const m of [mat(x, 0, z + sz * TS / 2, sz > 0 ? 0 : Math.PI), mat(x + sx * TS / 2, 0, z, sx > 0 ? Math.PI / 2 : -Math.PI / 2)]) {
        const arc = new THREE.Shape()
        arc.absarc(0, ty - 2.6, 2.1, Math.PI * 0.18, Math.PI * 0.82, false)
        arc.absarc(0, ty - 2.6, 1.85, Math.PI * 0.82, Math.PI * 0.18, true)
        b.add('scTrim', extrude(arc, 0.12), on(m, mat(0, 0, 0.0)))
      }
      domedDrum(b, { x, z, n: 8, r: 2.3, y0: ty + 0.1, y1: 22.4, win: [0.62, 3.2], domeR: 2.7, domeH: 3.3, ribs: 8, crossS: 1.8 })
    }
  }

  /* ---------------- west portico (exonarthex) ---------------- */
  {
    const { x0, x1, hz, floor, h } = PORT
    const d = x1 - x0
    const xc = (x0 + x1) / 2
    // podium + steps
    b.block('stoneLight', d + 0.4, floor, 2 * hz + 0.6, xc, 0, 0)
    for (let i = 0; i < 5; i++) b.block('stoneLight', 0.32, floor - i * 0.24, 2 * hz + 1.0, x0 - 0.16 - i * 0.32 + 0.0, 0, 0)
    // front arcade: wall with five round arches
    const wallShape = (w: number, count: number, ow: number, oh: number) => {
      const s = new THREE.Shape([v2(-w / 2, 0), v2(w / 2, 0), v2(w / 2, h - floor), v2(-w / 2, h - floor)])
      for (let i = 0; i < count; i++) {
        const u = -w / 2 + ((i + 0.5) * w) / count
        s.holes.push(new THREE.Path(opening('round', ow, oh, u, 0, 10)))
      }
      return s
    }
    b.add('scPlaster', extrude(wallShape(2 * hz, 5, 1.6, 5.6), 0.55), mat(x0 + 0.55, floor, 0, -Math.PI / 2))
    for (const s of [-1, 1]) b.add('scPlaster', extrude(wallShape(d - 0.2, 1, 1.8, 5.6), 0.45), mat(xc, floor, s * hz + (s > 0 ? -0.45 : 0.45), s > 0 ? 0 : Math.PI))
    // columns in front of the piers
    for (let i = 0; i <= 5; i++) {
      const z = -hz + (i * 2 * hz) / 5
      b.add('scTrim', new THREE.CylinderGeometry(0.22, 0.25, 5.0, 14), mat(x0 - 0.15, floor + 2.5, z))
      b.add('scTrim', metricBox(0.62, 0.35, 0.62), mat(x0 - 0.15, floor + 5.15, z))
      b.add('scTrim', metricBox(0.6, 0.3, 0.6), mat(x0 - 0.15, floor + 0.15, z))
    }
    // entablature with crosses band and cornice
    b.block('scTrim', d + 0.6, 0.9, 2 * hz + 0.6, xc - 0.15, h - 0.9, 0)
    for (let i = 0; i < 6; i++) {
      const z = -hz + 0.9 + (i * (2 * hz - 1.8)) / 5
      b.add('gilt', metricBox(0.06, 0.5, 0.08), mat(x0 - 0.47, h - 0.45, z))
      b.add('gilt', metricBox(0.06, 0.08, 0.35), mat(x0 - 0.47, h - 0.36, z))
    }
    // dark doors in the back (into the narthex)
    for (const z of [-2.2, 0, 2.2]) b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 3.6, 0, floor, 10))), mat(x1 - 0.02, 0, z, -Math.PI / 2))
    // low copper hipped roof
    const ry = h + 0.05
    const ox0 = x0 - 0.65
    const ox1 = x1
    const oz = hz + 0.6
    const top = ry + 1.3
    facet(b, 'copper', [V(ox0, ry, oz), V(ox1, ry, oz), V(ox1, top, oz - 1.6), V(ox0 + 1.6, top, oz - 1.6)], { seams: SEAM, thickness: 0.06 })
    facet(b, 'copper', [V(ox1, ry, -oz), V(ox0, ry, -oz), V(ox0 + 1.6, top, -oz + 1.6), V(ox1, top, -oz + 1.6)], { seams: SEAM, thickness: 0.06 })
    facet(b, 'copper', [V(ox0, ry, -oz), V(ox0, ry, oz), V(ox0 + 1.6, top, oz - 1.6), V(ox0 + 1.6, top, -oz + 1.6)], { seams: SEAM, thickness: 0.06 })
    b.block('copper', ox1 - ox0 - 1.6, 0.1, 2 * oz - 3.2, (ox0 + 1.6 + ox1) / 2, top - 0.05, 0)
    // octagonal lantern with small dome
    const lx = xc - 0.4
    b.add('scPlaster', loft([polyRing(8, 1.35, top, Math.PI / 8, lx, 0), polyRing(8, 1.35, top + 1.4, Math.PI / 8, lx, 0)], { capTop: true, flat: true }))
    ringBand(b, 'scTrim', { x: lx, z: 0, n: 8, r: 1.35, y: top + 1.4, h: 0.25, grow: 0.12, phase: Math.PI / 8 })
    const lt = dome(b, 'copper', { x: lx, y: top + 1.65, z: 0, r: 1.45, h: 1.7, profile: HELMET, seg: 24, ribs: 8 })
    cross(b, 'gilt', lx, lt, 0, 1.2, true, Math.PI / 2)
  }

  /* ---------------- east apse ---------------- */
  {
    const { xc, r, h } = APSE
    const n = 4 // half of an octagon: 4 facets
    const R = r / Math.cos(Math.PI / 8)
    const pts = (rr: number, y: number) => {
      const out: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n
        out.push(V(xc + Math.cos(a) * rr, y, Math.sin(a) * rr))
      }
      return out
    }
    b.add('scPlaster', loft([pts(R, 0), pts(R, h)], { capTop: true, flat: true }))
    b.add('socle', loft([pts(R + 0.15, 0), pts(R + 0.15, 1.0)], { capTop: true, flat: true }))
    b.add('scTrim', loft([pts(R + 0.25, h - 0.4), pts(R + 0.25, h)], { capTop: true, flat: true }))
    const eav = pts(R + 0.6, h - 0.15)
    const apex = V(xc, h + 3.6, 0)
    for (let i = 0; i < n; i++) facet(b, 'copper', [eav[i], eav[i + 1], apex], { seams: SEAM, thickness: 0.06 })
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) * Math.PI) / n
      if (Math.abs(a) > 1.2) continue
      const p = V(xc + Math.cos(a) * r, 0, Math.sin(a) * r)
      archWin(b, mat(p.x, 0, p.z, Math.PI / 2 - a), 0.7, 3.6, 4.2)
    }
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [DRUM.x, 37.5, 0],
  materials: (base) => ({
    // oxidised copper domes: palette copperBrown, slightly more matte as photographed
    scDome: Object.assign((base.copperBrown as THREE.MeshStandardMaterial).clone(), { roughness: 0.62 }),
    scMosaic: new THREE.MeshStandardMaterial({ color: '#7d8aa0', roughness: 0.5, metalness: 0.25 }),
    scPlaster: new THREE.MeshStandardMaterial({ color: '#e2d0a2', roughness: 0.9 }),
    scPlasterDk: new THREE.MeshStandardMaterial({ color: '#d4c08f', roughness: 0.9 }),
    scTrim: new THREE.MeshStandardMaterial({ color: '#dedad0', roughness: 0.85 }),
  }),
  notes:
    'Neo-Byzantine cross-in-square cathedral with a central drum dome and four corner towers; copper roofs and domes (COLOR METAL). Plan from a crude OSM rectangle and photo ratios; east end interpreted.',
}
export default model
