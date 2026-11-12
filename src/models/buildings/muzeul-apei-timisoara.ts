/**
 * Muzeul Apei Timișoara — the round former pumping-station building ("OZN" /
 * "flying saucer", OSM way 943810404) of the Urseni water works, Calea Urseni 26.
 *
 * The reference photographs (4 drone views, 5 close-ups of the round building)
 * show this building's new elZinc Natural roofs, so the geolocated building is
 * the photographed one. Modelling specification (real metres):
 *  - Low outer ring, Ø 14.7 m (OSM), 1.6 m high grey plaster wall with small
 *    windows; its roof is a shallow cone of radial standing seams rising to the
 *    central drum, pierced by nine round "porthole" skylights with bars, edged by
 *    a half-round gutter.
 *  - Central white drum Ø 9.2 m, ≈2.2 m high: twelve small windows in deep
 *    reveals alternating with short lesenes under a moulded cornice; a low safety
 *    railing on the ring roof at its foot.
 *  - Main dome, Ø ≈ 9.8 m at the gutter, rise ≈ 0.8 R, natural titanium-zinc with
 *    radial standing seams; a small octagonal collar with a copper cap on top.
 *  - Entrance arm (+X): a short radial wing 3.6 m wide with a barrel roof ending
 *    in a semicircular apse under a half-dome (both elZinc Natural, seams), a
 *    black double door between two banded round columns, gutters and downpipes.
 * Approximations: heights are estimated from the photographs (door ≈ 2.2 m used
 *  as scale); window count and positions, the drum detailing and the rear of the
 *  building (not photographed up close) are simplified; the landscaped pit,
 *  water channels and benches around the building are not modelled.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape } from '../kit'
import type { ModelModule } from '../registry'

type P2 = [number, number]
const D2R = Math.PI / 180

/* ---------------- dimensions ---------------- */
const RING = { r: 7.15, eaveR: 7.45, h: 1.6 } // outer ring wall + roof eave
const DRUM = { r: 4.6, y0: 2.35, y1: 4.55 }
const DOME = { r: 4.9, rise: 3.85 }
const ARM = { hw: 1.8, r0: 4.2, rc: 6.85, wallH: 2.66 } // half width, start, apse centre, eave
const RING_ROOF_TOP = 2.45 // ring roof meets the drum

/* ---------------- helpers ---------------- */

/** Grid surface with smooth normals and outward orientation. */
function gridSurface(rows: THREE.Vector3[][], uvs: P2[][], outward: (p: THREE.Vector3) => THREE.Vector3) {
  const nc = rows[0].length
  const pos: number[] = []
  const uv: number[] = []
  rows.forEach((r, j) =>
    r.forEach((p, i) => {
      pos.push(p.x, p.y, p.z)
      uv.push(uvs[j][i][0], uvs[j][i][1])
    }),
  )
  const idx: number[] = []
  let flip: boolean | null = null
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < nc - 1; i++) {
      const a = j * nc + i
      const b = a + 1
      const c = (j + 1) * nc + i + 1
      const d = (j + 1) * nc + i
      if (flip === null) {
        const A = rows[j][i]
        const n = V().subVectors(rows[j][i + 1], A).cross(V().subVectors(rows[j + 1][i + 1], A))
        if (n.lengthSq() > 1e-10) flip = n.dot(outward(A)) < 0
      }
      idx.push(a, b, c, a, c, d)
    }
  }
  if (flip) for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Lathe around (cx, cz) with metric UVs; optional partial sweep a0..a1 (radians, from +X towards +Z). */
function latheM(b: Builder, key: string, prof: P2[], seg = 64, a0 = 0, a1 = Math.PI * 2, cx = 0, cz = 0, inward = false) {
  const rows: THREE.Vector3[][] = []
  const uvs: P2[][] = []
  let v = 0
  prof.forEach(([r, y], j) => {
    if (j > 0) v += Math.hypot(r - prof[j - 1][0], y - prof[j - 1][1])
    const row: THREE.Vector3[] = []
    const ur: P2[] = []
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg
      row.push(V(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r))
      ur.push([a * prof[0][0], v])
    }
    rows.push(row)
    uvs.push(ur)
  })
  const s = inward ? -1 : 1
  b.add(key, gridSurface(rows, uvs, (p) => V((p.x - cx) * s, 0, (p.z - cz) * s)))
}

/** Radial standing seams over a lathe profile, skipping angular gaps. */
function radialSeams(b: Builder, key: string, prof: P2[], n: number, skip: (a: number) => boolean = () => false, rh = 0.035, cx = 0, cz = 0) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    if (skip(a)) continue
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      if (r0 < 0.5 && r1 < 0.5) continue
      b.beam(key, V(cx + c * (r0 + rh / 2), y0 + 0.01, cz + s * (r0 + rh / 2)), V(cx + c * (r1 + rh / 2), y1 + 0.01, cz + s * (r1 + rh / 2)), rh, rh, V(c, 0.4, s).normalize())
    }
  }
}

/** Half-round gutter (as a ring of short rods) at radius r, height y. */
function ringGutter(b: Builder, key: string, r: number, y: number, a0 = 0, a1 = Math.PI * 2, n = 72, rad = 0.09, cx = 0, cz = 0) {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n
    b.rod(key, V(cx + Math.cos(t0) * r, y, cz + Math.sin(t0) * r), V(cx + Math.cos(t1) * r, y, cz + Math.sin(t1) * r), rad, 6)
  }
}

/** Element on the outer face of a round wall: local z = outward normal at angle a. */
const onRound = (r: number, a: number, y = 0) => mat(Math.cos(a) * r, y, Math.sin(a) * r, Math.atan2(Math.cos(a), Math.sin(a)))

function windowOnRound(b: Builder, r: number, a: number, y0: number, w: number, h: number, reveal = 0.18, glass = 'glassC') {
  const m = onRound(r, a)
  b.add(glass, new THREE.ShapeGeometry(new THREE.Shape(opening('rect', w, h, 0, y0))), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.02)))
  b.add('plasterWhite', extrude(frameShape('rect', w, h, reveal, 0, y0), 0.12), m)
  // mullion + transom
  b.add('iron', metricBox(0.04, h, 0.04), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + h / 2, 0.05)))
  b.add('iron', metricBox(w, 0.04, 0.04), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + h * 0.62, 0.05)))
}

/* ================================================================== */

function build(): Builder {
  const b = new Builder()
  const armHalf = Math.atan2(ARM.hw + 0.2, RING.r) // angular half-width of the arm at the ring
  const inArm = (a: number) => {
    const d = Math.atan2(Math.sin(a), Math.cos(a))
    return Math.abs(d) < armHalf
  }

  /* ---------- outer ring ---------- */
  latheM(b, 'plasterGrey', [[RING.r, 0], [RING.r, RING.h]], 96)
  latheM(b, 'socle', [[RING.r + 0.06, 0], [RING.r + 0.06, 0.45]], 96)
  // small windows in the ring wall (between the portholes)
  for (let k = 0; k < 9; k++) {
    const a = (36 + k * 36 + 18) * D2R
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 24 * D2R) continue
    windowOnRound(b, RING.r, a, 0.6, 0.9, 0.6, 0.1, 'glassG')
  }
  // ring roof: shallow cone of radial seams
  const ringRoof: P2[] = [
    [RING.eaveR, RING.h + 0.02],
    [6.2, RING.h + 0.36],
    [5.2, RING.h + 0.62],
    [DRUM.r - 0.02, RING_ROOF_TOP],
  ]
  latheM(b, 'zincNatural', ringRoof, 128)
  radialSeams(b, 'zincNatural', ringRoof, 96, (a) => inArm(a), 0.035)
  ringGutter(b, 'zincNatural', RING.eaveR + 0.05, RING.h - 0.02, 0, Math.PI * 2, 96, 0.09)
  // porthole skylights with bars
  for (let k = 1; k <= 9; k++) {
    const a = k * 36 * D2R
    const r = 6.05
    const y = RING.h + 0.36 + 0.02
    const slope = Math.atan2(0.36, 1.25)
    const m = new THREE.Matrix4().compose(V(Math.cos(a) * r, y + 0.06, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -slope, 'YXZ')), V(1, 1, 1))
    b.add('helm', new THREE.CylinderGeometry(0.5, 0.52, 0.16, 24), m)
    b.add('skylight', new THREE.CylinderGeometry(0.43, 0.43, 0.18, 24), m)
    for (const u of [-0.24, -0.08, 0.08, 0.24]) b.add('helm', metricBox(0.8, 0.05, 0.035), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0.12, u)))
  }

  /* ---------- central drum ---------- */
  latheM(b, 'plasterWhite', [[DRUM.r, DRUM.y0 - 0.1], [DRUM.r, DRUM.y1]], 96)
  // sill band, cornice, gutter
  latheM(b, 'plasterWhite', [[DRUM.r + 0.12, DRUM.y0 + 0.22], [DRUM.r + 0.12, DRUM.y0 + 0.36]], 96)
  latheM(b, 'plasterWhite', [[DRUM.r + 0.1, DRUM.y1 - 0.42], [DRUM.r + 0.22, DRUM.y1 - 0.2], [DRUM.r + 0.3, DRUM.y1 - 0.02], [DRUM.r, DRUM.y1 - 0.02]], 96)
  for (let k = 0; k < 12; k++) {
    const a = (k * 30 + 15) * D2R
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 22 * D2R) continue
    windowOnRound(b, DRUM.r, a, DRUM.y0 + 0.62, 0.62, 0.86, 0.13)
    // lesene under the cornice between the windows
    const m = onRound(DRUM.r, a + 15 * D2R)
    b.add('plasterWhite', metricBox(0.42, 0.85, 0.16), new THREE.Matrix4().multiplyMatrices(m, mat(0, DRUM.y1 - 0.85, 0.08)))
  }
  // low safety railing on the ring roof
  const railR = DRUM.r + 0.45
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2
    if (inArm(a)) continue
    const a2 = ((k + 1) / 48) * Math.PI * 2
    const y = RING_ROOF_TOP - 0.05
    b.rod('helm', V(Math.cos(a) * railR, y, Math.sin(a) * railR), V(Math.cos(a) * railR, y + 0.55, Math.sin(a) * railR), 0.02, 4)
    if (!inArm(a2)) b.rod('helm', V(Math.cos(a) * railR, y + 0.55, Math.sin(a) * railR), V(Math.cos(a2) * railR, y + 0.55, Math.sin(a2) * railR), 0.025, 4)
  }

  /* ---------- main dome ---------- */
  const unit: P2[] = [
    [1, 0],
    [0.985, 0.13],
    [0.94, 0.3],
    [0.86, 0.48],
    [0.74, 0.65],
    [0.58, 0.8],
    [0.4, 0.91],
    [0.2, 0.98],
    [0.12, 1.0],
  ]
  const domeProf: P2[] = unit.map(([r, y]) => [r * DOME.r, DRUM.y1 + y * DOME.rise])
  latheM(b, 'zincNatural', domeProf, 96)
  radialSeams(b, 'zincNatural', domeProf, 52, () => false, 0.04)
  ringGutter(b, 'zincNatural', DOME.r + 0.08, DRUM.y1 + 0.04, 0, Math.PI * 2, 96, 0.1)
  // octagonal collar with a copper cap
  const top = DRUM.y1 + DOME.rise
  b.add('plasterWhite', new THREE.CylinderGeometry(0.62, 0.66, 0.26, 8), mat(0, top + 0.08, 0))
  b.add('copper', new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0, top + 0.2, 0, 0, 0, 0, 1, 0.7, 1))

  /* ---------- entrance arm (+X) ---------- */
  const { hw, r0, rc, wallH } = ARM
  // side walls of the arm and the apse wall
  b.add('plasterGrey', metricBox(rc - r0, wallH, hw * 2), mat((r0 + rc) / 2, wallH / 2, 0))
  latheM(b, 'plasterGrey', [[hw, 0], [hw, wallH]], 24, -Math.PI / 2, Math.PI / 2, rc, 0)
  // white frieze under the gutter
  latheM(b, 'plasterWhite', [[hw + 0.04, wallH - 0.5], [hw + 0.04, wallH]], 24, -Math.PI / 2, Math.PI / 2, rc, 0)
  for (const s of [-1, 1]) b.add('plasterWhite', metricBox(rc - r0, 0.5, 0.08), mat((r0 + rc) / 2, wallH - 0.25, s * (hw + 0.04)))
  // barrel roof (flattened semicircle), seams across the barrel
  const ov = 0.18
  const barrelRows: THREE.Vector3[][] = []
  const barrelUv: P2[][] = []
  const nb = 16
  const rise = 1.45
  const prof: P2[] = []
  for (let i = 0; i <= nb; i++) {
    const t = Math.PI - (i / nb) * Math.PI
    prof.push([Math.cos(t) * (hw + ov), wallH - 0.05 + Math.sin(t) * rise])
  }
  for (const x of [r0 - 0.2, rc]) {
    barrelRows.push(prof.map(([z, y]) => V(x, y, z)))
    let acc = 0
    barrelUv.push(prof.map(([z, y], i) => [x, (acc += i ? Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]) : 0)]))
  }
  b.add('zincNatural', gridSurface(barrelRows, barrelUv, (p) => V(0, p.y - wallH + 0.6, p.z)))
  for (let x = r0 + 0.35; x < rc; x += 0.55) {
    for (let i = 0; i < nb; i++) {
      const [z0, y0] = prof[i]
      const [z1, y1] = prof[i + 1]
      b.beam('zincNatural', V(x, y0 + 0.02, z0 * 1.004), V(x, y1 + 0.02, z1 * 1.004), 0.035, 0.035, V(0, y0 - wallH + 0.6, z0).normalize())
    }
  }
  // half-dome over the apse (quarter sphere, flattened to the barrel rise), radial seams
  const hd: P2[] = []
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    hd.push([(hw + ov) * Math.cos(t) + 0.001, wallH - 0.05 + rise * Math.sin(t)])
  }
  latheM(b, 'zincNatural', hd, 24, -Math.PI / 2, Math.PI / 2, rc, 0)
  for (let k = 1; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * Math.PI
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < hd.length - 2; i++) {
      const [ra, ya] = hd[i]
      const [rb, yb] = hd[i + 1]
      b.beam('zincNatural', V(rc + c * (ra + 0.02), ya + 0.01, s * (ra + 0.02)), V(rc + c * (rb + 0.02), yb + 0.01, s * (rb + 0.02)), 0.035, 0.035, V(c, 0.5, s).normalize())
    }
  }
  // gutters of the arm + downpipes
  ringGutter(b, 'zincNatural', hw + ov + 0.06, wallH - 0.08, -Math.PI / 2, Math.PI / 2, 16, 0.08, rc, 0)
  for (const s of [-1, 1]) {
    b.rod('zincNatural', V(r0 - 0.2, wallH - 0.08, s * (hw + ov + 0.06)), V(rc, wallH - 0.08, s * (hw + ov + 0.06)), 0.08, 6)
    b.rod('zincNatural', V(rc - 0.2, wallH - 0.1, s * (hw + 0.12)), V(rc - 0.2, 0.15, s * (hw + 0.12)), 0.06, 6)
  }
  // portal: black double door between two banded round columns
  const xf = rc + hw // apse front
  b.add('black', metricBox(0.1, 2.2, 1.55), mat(xf + 0.02, 0.15 + 1.1, 0))
  b.add('plasterWhite', metricBox(0.14, 0.1, 1.75), mat(xf + 0.02, 2.4, 0))
  b.add('plasterWhite', metricBox(0.12, 2.3, 0.1), mat(xf + 0.02, 1.3, 0.83))
  b.add('plasterWhite', metricBox(0.12, 2.3, 0.1), mat(xf + 0.02, 1.3, -0.83))
  for (let r = 0; r < 2; r++) for (const s of [-1, 1]) for (const u of [0.18, 0.42]) b.add('gilt', metricBox(0.03, 0.17, 0.17), mat(xf + 0.08, 1.85 + r * 0.25, s * u))
  for (const s of [-1, 1]) {
    const cz = s * 1.18
    const cx = rc + Math.sqrt(Math.max(0, hw * hw - cz * cz)) + 0.12
    b.add('plasterGrey', new THREE.CylinderGeometry(0.3, 0.3, 2.08, 20), mat(cx, 0.32 + 1.04, cz))
    for (let k = 1; k < 8; k++) b.add('plasterWhite', new THREE.CylinderGeometry(0.305, 0.305, 0.035, 20), mat(cx, 0.32 + k * 0.26, cz))
    b.add('stoneGrey', metricBox(0.75, 0.32, 0.75), mat(cx, 0.16, cz))
    b.add('plasterWhite', new THREE.CylinderGeometry(0.36, 0.32, 0.18, 20), mat(cx, 2.48, cz))
  }
  // entrance step
  b.add('stoneGrey', metricBox(0.7, 0.15, 2.6), mat(xf + 0.3, 0.075, 0))
  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [2.2, 7.6, 1.2],
  notes: 'Round pumping station of the Water Museum: heights estimated from the photographs (door used as scale); windows and drum detailing simplified; landscaping not modelled.',
}
export default model
