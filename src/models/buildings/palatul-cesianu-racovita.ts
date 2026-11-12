/**
 * Palatul Cesianu-Racoviță, Bucharest (Str. C. A. Rosetti 5, OSM way 1171678982)
 * — two-storey eclectic town palace (seat of the Artmark auction house); the low
 * hipped roof behind the heavy cornice is shown in natural titanium-zinc.
 *
 * Modelling specification (real metres, origin = centre of the OSM rectangle,
 * +X = OSM long axis 154.2° (SSE) = towards Str. C. A. Rosetti, so the street
 * façade is the +X face; +Z = 244.2° (WSW) = the side towards the gate and the
 * entrance porch; the −Z side is a party wall towards the neighbour for its
 * street half):
 *  - Footprint after the OSM outline: 26.2 × 21.0 m (street front 21 m).
 *  - Heights scaled from photos 01–03 (person / statue on its pedestal, window
 *    proportions): socle 0.6 m, raised ground floor to the string course at
 *    ≈ 5.6 m, piano nobile to the architrave at ≈ 10.6 m, a 1.4 m frieze with
 *    stucco reliefs, cornice with modillions to ≈ 13.35 m.
 *  - Both storeys in channelled rustication (horizontal bands).
 *  - Street façade: slightly projecting corner risalit (≈ 4.9 m) with one
 *    window and a triangular pediment; five bays with segmental pediments over
 *    the first-floor windows and a balcony on consoles with a carved parapet;
 *    shop windows on the ground floor.
 *  - Gate side: blind rusticated corner pier, a recessed three-window section
 *    framed by herm pilasters above the entrance porch (two columns, small
 *    pediment roof in titanium-zinc), a second pier and the plainer rear part.
 *  - Roof: low hip (≈ 17°) behind the cornice, natural titanium-zinc standing
 *    seams 0.5 m, hip rolls, zinc cornice capping; two chimneys.
 * Approximations: the roof is barely visible in the photographs (only its edge
 * above the cornice) — pitch and ridge height are estimated; the rear and the
 * north-east elevations are not photographed (simple window rhythm); stucco
 * reliefs, herms and consoles are simplified to blocks and discs; awnings and
 * signage omitted.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, lathe, faceFrame, hippedRoof, seams, type Face, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

/* plan */
const X0 = -13.1
const X1 = 13.1 // street façade
const Z0 = -10.5 // party wall side (front half)
const Z1 = 10.5 // gate / porch side
const PARTY_X = -1.8 // the neighbour covers the −Z side from here to the street

/* heights */
const SOCLE = 0.6
const STRING = 5.25
const ARCH = 10.6
const FRIEZE_TOP = 12.3
const EAVE = 13.35

const ZN = 'zincNatural'
const SEAM = seams(ZN, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

type Crown = 'none' | 'cornice' | 'pediment' | 'segment'

/** Window with stucco surround, dark frame, glazing bars, sill and crown. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, crown: Crown = 'none', o: { type?: OpeningType; f?: number; bars?: [number, number]; sill?: boolean } = {}) {
  const type = o.type ?? 'rect'
  const f = o.f ?? 0.2
  const m = faceFrame(face, plane, u, 0, 0)
  b.add('csStucco', extrude(frameShape(type, w, h, f, 0, y0), 0.12), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 10))), M(m, mat(0, 0, 0.025)))
  b.add('csFrame', extrude(frameShape(type, w - 0.1, h - 0.06, 0.07, 0, y0 + 0.03), 0.06), M(m, mat(0, 0, 0.02)))
  const [nu, nv] = o.bars ?? [2, 3]
  for (let i = 1; i < nu; i++) b.add('csFrame', metricBox(0.07, h - 0.1, 0.05), M(m, mat(-w / 2 + (i * w) / nu, y0 + (h - 0.1) / 2, 0.05)))
  for (let j = 1; j < nv; j++) b.add('csFrame', metricBox(w - 0.1, 0.06, 0.05), M(m, mat(0, y0 + (j * h * 0.8) / nv, 0.05)))
  if (o.sill !== false) b.add('csStucco', metricBox(w + 2 * f + 0.2, 0.14, 0.26), M(m, mat(0, y0 - f - 0.05, 0.12)))
  const yt = y0 + h + f
  if (crown === 'cornice') {
    b.add('csStucco', metricBox(w + 2 * f, 0.4, 0.1), M(m, mat(0, yt + 0.2, 0.05)))
    b.add('csStucco', metricBox(w + 2 * f + 0.5, 0.16, 0.32), M(m, mat(0, yt + 0.48, 0.16)))
  } else if (crown === 'pediment' || crown === 'segment') {
    const pw = w + 2 * f + 0.55
    // frieze with console brackets
    b.add('csStucco', metricBox(w + 2 * f, 0.36, 0.1), M(m, mat(0, yt + 0.18, 0.05)))
    for (const s of [-1, 1]) b.add('csStucco', metricBox(0.2, 0.55, 0.26), M(m, mat(s * (w / 2 + f), yt + 0.1, 0.13)))
    b.add('csStucco', metricBox(pw, 0.14, 0.34), M(m, mat(0, yt + 0.43, 0.17)))
    const s = new THREE.Shape()
    if (crown === 'pediment') {
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      s.lineTo(0, 0.62)
      s.lineTo(-pw / 2, 0)
    } else {
      const rise = 0.6
      const R = ((pw / 2) ** 2 + rise ** 2) / (2 * rise)
      const a0 = Math.asin(pw / 2 / R)
      s.moveTo(-pw / 2, 0)
      s.lineTo(pw / 2, 0)
      for (let i = 0; i <= 12; i++) {
        const a = a0 - (2 * a0 * i) / 12
        s.lineTo(R * Math.sin(a), rise - R + R * Math.cos(a))
      }
    }
    b.add('csStucco', extrude(s, 0.3), M(m, mat(0, yt + 0.5, 0.02)))
    // relief in the tympanum
    b.add('csRelief', new THREE.SphereGeometry(0.22, 10, 6), M(m, mat(0, yt + 0.72, 0.3, 0, 0, 0, 1.4, 0.9, 0.35)))
  }
}

/** Horizontal channelled rustication on a façade strip, interrupted by openings [u0, u1, y0, y1]. */
function rustication(b: Builder, face: Face, plane: number, u0: number, u1: number, y0: number, y1: number, gaps: [number, number, number, number][], key = 'csWall') {
  const course = 0.46
  for (let y = y0; y + course <= y1 + 0.01; y += course) {
    const ya = y + 0.05
    const yb = y + course
    // cut the band where it overlaps an opening
    let segs: [number, number][] = [[u0, u1]]
    for (const [ga, gb, gy0, gy1] of gaps) {
      if (yb <= gy0 || ya >= gy1) continue
      const next: [number, number][] = []
      for (const [a, c] of segs) {
        if (gb <= a || ga >= c) next.push([a, c])
        else {
          if (ga > a) next.push([a, ga])
          if (gb < c) next.push([gb, c])
        }
      }
      segs = next
    }
    for (const [a, c] of segs) {
      if (c - a < 0.08) continue
      b.add(key, metricBox(c - a, yb - ya, 0.07), M(faceFrame(face, plane, (a + c) / 2, 0, 0), mat(0, (ya + yb) / 2, 0.035)))
    }
  }
}

function baluster(h: number) {
  const prof: [number, number][] = [
    [0.0, 0],
    [0.09, 0],
    [0.09, 0.07],
    [0.05, 0.13],
    [0.1, 0.36],
    [0.085, 0.5],
    [0.04, 0.6],
    [0.07, 0.68],
    [0.0, 0.68],
  ]
  return lathe(prof.map(([r, y]) => [r, (y * h) / 0.68]), 7)
}

/** Simplified stucco relief: cartouche + garlands along a frieze strip. */
function friezeRelief(b: Builder, face: Face, plane: number, u0: number, u1: number, y: number) {
  const n = Math.max(1, Math.round((u1 - u0) / 1.6))
  const step = (u1 - u0) / n
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    const m = faceFrame(face, plane, u, 0, 0)
    // cartouche / shell with two putti-like masses and a hanging garland
    b.add('csRelief', new THREE.SphereGeometry(0.34, 10, 6), M(m, mat(0, y + 0.05, 0.05, 0, 0, 0, 0.9, 1.3, 0.3)))
    for (const s of [-1, 1]) b.add('csRelief', new THREE.SphereGeometry(0.22, 8, 6), M(m, mat(s * 0.45, y - 0.1, 0.05, 0, 0, 0, 1.2, 1.0, 0.35)))
    b.add('csRelief', new THREE.TorusGeometry(step * 0.28, 0.08, 5, 10, Math.PI), M(m, mat(step / 2, y + 0.3, 0.06, 0, 0, Math.PI)))
    b.add('csRelief', new THREE.SphereGeometry(0.16, 8, 6), M(m, mat(step / 2, y + 0.3, 0.06, 0, 0, 0, 1, 1, 0.5)))
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= main volume ================= */
  const W = X1 - X0
  const D = Z1 - Z0
  b.block('csWall', W, ARCH, D, 0, 0, 0)
  b.block('csSocle', W + 0.16, SOCLE, D + 0.16, 0, 0, 0)
  // corner risalit (street / gate corner) and the second pier of the gate side
  const RIS = { x0: 9.3, x1: X1 + 0.25, z0: 5.6, z1: Z1 + 0.25 }
  b.block('csWall', RIS.x1 - RIS.x0, ARCH, RIS.z1 - RIS.z0, (RIS.x0 + RIS.x1) / 2, 0, (RIS.z0 + RIS.z1) / 2)
  b.block('csSocle', RIS.x1 - RIS.x0 + 0.16, SOCLE, RIS.z1 - RIS.z0 + 0.16, (RIS.x0 + RIS.x1) / 2, 0, (RIS.z0 + RIS.z1) / 2)
  const PIER = { x0: 0.5, x1: 3.0 }
  b.block('csWall', PIER.x1 - PIER.x0, ARCH, 0.5, (PIER.x0 + PIER.x1) / 2, 0, Z1)
  // string course (balcony level) and architrave
  b.block('csStucco', W + 0.3, 0.38, D + 0.3, 0, STRING, 0)
  b.block('csStucco', RIS.x1 - RIS.x0 + 0.3, 0.38, RIS.z1 - RIS.z0 + 0.3, (RIS.x0 + RIS.x1) / 2, STRING, (RIS.z0 + RIS.z1) / 2)
  b.block('csStucco', W + 0.62, 0.3, D + 0.62, 0, ARCH, 0)
  // frieze (flush with the risalit) and cornice
  b.block('csWall', W + 0.5, FRIEZE_TOP - ARCH - 0.3, D + 0.5, 0, ARCH + 0.3, 0)
  b.block('csStucco', W + 1.0, 0.2, D + 1.0, 0, FRIEZE_TOP, 0)
  b.block('csStucco', W + 1.5, 0.12, D + 1.5, 0, FRIEZE_TOP + 0.2, 0)
  // modillions
  for (const [face, len] of [
    ['+x', D],
    ['-x', D],
    ['+z', W],
    ['-z', W],
  ] as [Face, number][]) {
    const plane = face.endsWith('x') ? (face[0] === '+' ? X1 + 0.25 : X0 - 0.25) : face[0] === '+' ? Z1 + 0.25 : Z0 - 0.25
    for (let u = -len / 2 - 0.1; u <= len / 2 + 0.15; u += 0.62) b.add('csStucco', metricBox(0.2, 0.3, 0.8), M(faceFrame(face, plane, u, 0, 0), mat(0, FRIEZE_TOP + 0.47, 0.4)))
  }
  b.block('csStucco', W + 2.1, 0.38, D + 2.1, 0, FRIEZE_TOP + 0.62, 0)
  b.block(ZN, W + 2.2, 0.06, D + 2.2, 0, EAVE - 0.06, 0)
  for (const [face, plane, u0, u1] of [
    ['+x', X1 + 0.25, -D / 2, D / 2],
    ['+z', Z1 + 0.25, -W / 2, W / 2],
  ] as [Face, number, number, number][]) friezeRelief(b, face, plane, u0 + 0.4, u1 - 0.4, (ARCH + FRIEZE_TOP) / 2 + 0.1)

  /* ================= street façade (+X) ================= */
  {
    const F: Face = '+x'
    // face u = −z
    const risU0 = -RIS.z1
    const risU1 = -RIS.z0
    const risUc = (risU0 + risU1) / 2
    // corner risalit: one bay
    win(b, F, RIS.x1, risUc, 6.3, 1.35, 3.1, 'pediment')
    win(b, F, RIS.x1, risUc, 1.0, 2.3, 3.4, 'none', { f: 0.15, bars: [2, 2], sill: false })
    rustication(b, F, RIS.x1, risU0, risU1, SOCLE, STRING, [[risUc - 1.3, risUc + 1.3, 0.8, 4.6]])
    rustication(b, F, RIS.x1, risU0, risU1, STRING + 0.4, ARCH, [[risUc - 0.95, risUc + 0.95, 5.9, 10.7]])
    // main part: five bays
    const us = [-3.85, -0.65, 2.55, 5.75, 8.95]
    for (const u of us) {
      win(b, F, X1, u, 6.3, 1.3, 3.1, 'segment')
      win(b, F, X1, u, 1.0, 2.35, 3.4, 'none', { f: 0.15, bars: [2, 2], sill: false })
    }
    rustication(b, F, X1, risU1, -Z0, SOCLE, STRING, us.map((u) => [u - 1.33, u + 1.33, 0.8, 4.6] as [number, number, number, number]))
    rustication(b, F, X1, risU1, -Z0, STRING + 0.4, ARCH, us.map((u) => [u - 0.92, u + 0.92, 5.9, 10.7] as [number, number, number, number]))
    // balcony on consoles with carved parapet and baluster panels
    const bu0 = -4.95
    const bu1 = 10.25
    const fm = faceFrame(F, X1, 0, 0, 0)
    const bc = (bu0 + bu1) / 2
    b.add('csStucco', metricBox(bu1 - bu0, 0.36, 1.05), M(fm, mat(bc, STRING + 0.38 + 0.18, 0.52)))
    for (let k = 0; k <= 5; k++) {
      const u = bu0 + 0.4 + (k * (bu1 - bu0 - 0.8)) / 5
      b.add('csStucco', metricBox(0.32, 0.75, 0.9), M(fm, mat(u, STRING + 0.0, 0.45)))
    }
    const py = STRING + 0.74
    // solid carved parapet in front of the middle bays, balusters in front of the windows
    for (let i = 0; i < us.length; i++) {
      const u = us[i]
      for (let k = -2; k <= 2; k++) b.add('csStucco', baluster(0.8), M(fm, mat(u + k * 0.27, py, 0.95)))
      if (i < us.length - 1) {
        const ua = u + 0.7
        const ub = us[i + 1] - 0.7
        b.add('csStucco', metricBox(ub - ua, 0.8, 0.22), M(fm, mat((ua + ub) / 2, py + 0.4, 0.95)))
        b.add('csRelief', new THREE.SphereGeometry(0.32, 10, 6), M(fm, mat((ua + ub) / 2, py + 0.4, 1.06, 0, 0, 0, 1.6, 0.9, 0.3)))
      }
    }
    b.add('csStucco', metricBox(bu1 - bu0 + 0.1, 0.14, 0.34), M(fm, mat(bc, py + 0.86, 0.95)))
    for (const u of [bu0 + 0.15, bu1 - 0.15]) b.add('csStucco', metricBox(0.32, 0.86, 0.32), M(fm, mat(u, py + 0.43, 0.95)))
    b.add(ZN, metricBox(bu1 - bu0 + 0.12, 0.03, 1.08), M(fm, mat(bc, STRING + 0.76, 0.52)))
  }

  /* ================= gate side (+Z) ================= */
  {
    const F: Face = '+z'
    // u = +x ; corner pier (blind), recessed three-window section, second pier, rear part
    rustication(b, F, RIS.z1, RIS.x0, RIS.x1, SOCLE, ARCH, [[RIS.x0 + 0.1, RIS.x0 + 0.3, 0, 0]])
    // recessed section between x 3.0 … 9.3 with herm pilasters
    const ws = [4.2, 6.15, 8.1]
    for (const x of ws) win(b, F, Z1, x, 6.3, 1.1, 3.25, 'none', { f: 0.14 })
    for (const x of [3.2, 5.18, 7.12, 9.1]) {
      const m = faceFrame(F, Z1, x, 0, 0)
      b.add('csStucco', metricBox(0.42, 3.0, 0.22), M(m, mat(0, 7.0, 0.11)))
      b.add('csRelief', new THREE.SphereGeometry(0.2, 8, 6), M(m, mat(0, 8.85, 0.22, 0, 0, 0, 1, 1.3, 0.8)))
      b.add('csStucco', metricBox(0.6, 0.32, 0.36), M(m, mat(0, 9.45, 0.18)))
      b.add('csStucco', metricBox(0.55, 0.3, 0.3), M(m, mat(0, 5.85, 0.15)))
    }
    b.add('csStucco', metricBox(6.4, 0.3, 0.3), M(faceFrame(F, Z1, 6.15, 0, 0), mat(0, 9.75, 0.15)))
    b.add('csRelief', metricBox(5.6, 0.55, 0.08), M(faceFrame(F, Z1, 6.15, 0, 0), mat(0, 10.15, 0.04)))
    // second pier (blind) and the rear part with four bays
    rustication(b, F, Z1 + 0.25, PIER.x0, PIER.x1, SOCLE, ARCH, [])
    const rx = [-1.4, -4.8, -8.2, -11.6]
    for (const x of rx) {
      win(b, F, Z1, x, 6.3, 1.25, 3.0, 'cornice')
      win(b, F, Z1, x, 1.6, 1.2, 2.6, 'none', { f: 0.15 })
    }
    rustication(b, F, Z1, X0, PIER.x0, SOCLE, STRING, rx.map((x) => [x - 0.8, x + 0.8, 1.3, 4.4] as [number, number, number, number]))
    rustication(b, F, Z1, X0, PIER.x0, STRING + 0.4, ARCH, rx.map((x) => [x - 0.85, x + 0.85, 5.9, 10.3] as [number, number, number, number]))
    // ground floor of the recessed section: entrance door behind the porch
    const dm = faceFrame(F, Z1, 6.15, 0, 0)
    b.add('csFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 1.7, 3.0, 0, 1.05, 4))), M(dm, mat(0, 0, 0.03)))
    b.add('csStucco', extrude(frameShape('rect', 1.7, 3.0, 0.25, 0, 1.05), 0.14), dm)
    for (const x of [4.3, 8.0]) win(b, F, Z1, x, 1.6, 0.9, 2.4, 'none', { f: 0.12, bars: [1, 2] })
    // porch: podium, two columns + pilasters, entablature, small pediment roof in zinc
    const pz0 = Z1
    const pz1 = Z1 + 2.3
    const px0 = 4.0
    const px1 = 8.3
    const pc = (px0 + px1) / 2
    b.block('csSocle', px1 - px0 + 0.6, 1.0, pz1 - pz0 + 0.2, pc, 0, (pz0 + pz1) / 2 + 0.1)
    for (let i = 0; i < 4; i++) b.block('csSocle', 2.0, 1.0 - (i + 1) * 0.22, 0.32, pc, 0, pz1 + 0.26 + i * 0.32)
    const colH = 3.1
    for (const x of [px0 + 0.35, px1 - 0.35]) {
      b.add('csStucco', new THREE.CylinderGeometry(0.2, 0.23, colH, 14), mat(x, 1.0 + colH / 2, pz1 - 0.3))
      b.block('csStucco', 0.55, 0.22, 0.55, x, 1.0, pz1 - 0.3)
      b.block('csStucco', 0.6, 0.25, 0.6, x, 1.0 + colH - 0.25, pz1 - 0.3)
      b.block('csStucco', 0.45, colH, 0.2, x, 1.0, pz0 + 0.1)
    }
    const ey = 1.0 + colH
    b.block('csStucco', px1 - px0 + 0.3, 0.5, pz1 - pz0 + 0.1, pc, ey, (pz0 + pz1) / 2)
    b.block('csStucco', px1 - px0 + 0.6, 0.14, pz1 - pz0 + 0.4, pc, ey + 0.5, (pz0 + pz1) / 2 + 0.15)
    // pediment gable facing +z and zinc saddle roof running back to the wall
    const pw = px1 - px0 + 0.6
    const rise = 0.95
    const tri = new THREE.Shape([new THREE.Vector2(-pw / 2, 0), new THREE.Vector2(pw / 2, 0), new THREE.Vector2(0, rise)])
    b.add('csStucco', extrude(tri, 0.25), mat(pc, ey + 0.64, pz1 + 0.3 - 0.25))
    const yE = ey + 0.64
    const zf = pz1 + 0.35
    for (const s of [-1, 1]) {
      const p0 = V(pc + (s * pw) / 2, yE, zf)
      const p1 = V(pc, yE + rise, zf)
      facet(b, ZN, [p0, p1, p1.clone().setZ(pz0), p0.clone().setZ(pz0)], { thickness: 0.06 })
      b.beam(ZN, p0.clone().add(V(0, 0.05, 0)), p1.clone().add(V(0, 0.05, 0)), 0.1, 0.1, V(0, 0, 1))
    }
    b.beam(ZN, V(pc, yE + rise + 0.05, zf), V(pc, yE + rise + 0.05, pz0), 0.12, 0.1)
  }

  /* ================= rear (−X) and party side (−Z) ================= */
  {
    const zs = [-8.2, -4.1, 0, 4.1, 8.2]
    for (const z of zs) {
      win(b, '-x', X0, z, 6.3, 1.2, 3.0, 'cornice', { f: 0.16 })
      win(b, '-x', X0, z, 1.6, 1.2, 2.6, 'none', { f: 0.15 })
    }
    rustication(b, '-x', X0, Z0, Z1, SOCLE, ARCH, zs.flatMap((z) => [[z - 0.8, z + 0.8, 1.3, 4.4], [z - 0.8, z + 0.8, 5.9, 10.3]] as [number, number, number, number][]))
    // −Z: only the rear half is free (u = −x)
    const xs = [-4.6, -8.2, -11.6]
    for (const x of xs) {
      win(b, '-z', Z0, -x, 6.3, 1.2, 3.0, 'cornice', { f: 0.16 })
      win(b, '-z', Z0, -x, 1.6, 1.2, 2.6, 'none', { f: 0.15 })
    }
    rustication(b, '-z', Z0, -PARTY_X, -X0, SOCLE, ARCH, xs.flatMap((x) => [[-x - 0.8, -x + 0.8, 1.3, 4.4], [-x - 0.8, -x + 0.8, 5.9, 10.3]] as [number, number, number, number][]))
  }

  /* ================= roof (natural titanium-zinc) ================= */
  const oh = 0.55
  const pitch = 12
  hippedRoof(b, ZN, { w: W + 0.5, d: D + 0.5, y: EAVE + oh * Math.tan((pitch * Math.PI) / 180), pitch, overhang: oh, seams: SEAM })
  // chimneys
  for (const [x, z] of [
    [-4.5, -4.0],
    [5.5, 3.0],
  ]) {
    b.block('csWall', 0.9, 3.4, 1.3, x, EAVE, z)
    b.block('csStucco', 1.15, 0.22, 1.55, x, EAVE + 3.4, z)
    b.block(ZN, 1.0, 0.12, 1.4, x, EAVE + 3.62, z)
  }
  // downpipes on the gate side
  for (const x of [0.25, X0 + 0.3]) b.rod(ZN, V(x, 0.4, Z1 + 0.18), V(x, EAVE - 0.3, Z1 + 0.18), 0.06, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [3, 15.5, 3],
  materials: () => ({
    csWall: new THREE.MeshStandardMaterial({ color: '#e5d29b', roughness: 0.88 }),
    csStucco: new THREE.MeshStandardMaterial({ color: '#eee2bd', roughness: 0.82 }),
    csRelief: new THREE.MeshStandardMaterial({ color: '#f2ecd8', roughness: 0.8 }),
    csSocle: new THREE.MeshStandardMaterial({ color: '#cdbf98', roughness: 0.9 }),
    csFrame: new THREE.MeshStandardMaterial({ color: '#4a3326', roughness: 0.6 }),
  }),
  notes:
    'Two-storey eclectic palace in channelled rustication with a stucco frieze and a modillion cornice; the low hipped roof behind the cornice is shown in natural titanium-zinc; ornament simplified.',
}
export default model
