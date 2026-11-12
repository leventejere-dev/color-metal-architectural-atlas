/**
 * Astronomical Observatory of "Alexandru Ioan Cuza" University, Iași (1912–1913),
 * Aleea Sadoveanu 5–7, OSM way 206867564 (+ the round dome tower, mapped in
 * OSM as a separate 44 m² way). Restored 2021–2023.
 *
 * Modelling specification derived from the 8 drone photographs (04 = vertical
 * view used for the plan), calibrated on the OSM outline (20.2 × 14.7 m,
 * long axis 92.7°). Real metres. +X = east (long axis), +Z = south; the main
 * (south) front carries the entrance porch at the foot of the dome tower.
 *
 *  - PLAN: central block with a flat roof terrace (5.8 m wide, full depth);
 *    north-east wing (7.9 × 7.5 m) and south-west wing (6.6 × 8.4 m) with
 *    hipped roofs; round observation tower (Ø 7.2 m) at the south-east corner;
 *    open switch-back stair to the terrace on the north-west (exterior ramp
 *    and outbuildings not modelled).
 *  - ELEVATIONS: rough stone plinth with basement windows, two storeys of white
 *    plaster, string course, cornice at ~9.8 m. Arched ground-floor window
 *    with a wrought-iron sign above on the south front of the central block and
 *    on the east front of the NE wing; paired tall windows in the tower.
 *  - TOWER: cylinder to the main cornice (projecting copper-clad ring), the
 *    observing-room drum with pilaster panels and small windows, copper base
 *    ring, hemispherical ribbed dome (Ø 7 m) with the observation-slit
 *    shutter running from the north-west horizon over the zenith.
 *  - METAL (COLOR METAL scope: copper roofing + copper rainwater system):
 *    standing-seam copper on the hipped roofs, eaves fascias, cornice rings,
 *    terrace coping, window sills, half-round gutters and downpipes — shown
 *    aged dark brown as photographed; the dome is shown green-patinated, as
 *    in all photographs.
 * Approximations: storey heights and roof pitch (30°) estimated, the stair is
 * simplified to three flights, window counts on the north and west fronts are
 * partly hidden in the photographs, iron railings drawn as plain bars.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, lathe, dome, hippedRoof, window_, faceFrame, seams, type Face } from '../kit'
import type { ModelModule } from '../registry'

const WALL = 'plasterWhite'
const CU = 'cuRoof'
const PAT = 'cuPatina'
const SEAM = seams(CU, 0.5, 0.04, 0.04)
const H = { plinth: 1.2, string: 5.3, cornice: 9.3, eave: 9.8, parapet: 10.5, rail: 11.5 }
const TOWER = { x: 6.85, z: 4.8, r: 3.6 }
const C = { x0: -3.55, x1: 2.25, z0: -7.5, z1: 7.5 }
const NE = { x0: 2.25, x1: 10.15, z0: -7.5, z1: 1.2 }
const SW = { x0: -10.15, x1: -3.55, z0: -0.9, z1: 7.5 }

const U = (face: Face, x: number, z: number) => (face === '+z' ? x : face === '-z' ? -x : face === '+x' ? -z : z)
const onFace = (face: Face, plane: number, u: number, local: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(faceFrame(face, plane, u, 0, 0), local)
/** compass bearing (deg) → local horizontal unit vector (X east, Z south) */
const dirOf = (deg: number) => V(Math.sin((deg * Math.PI) / 180), 0, -Math.cos((deg * Math.PI) / 180))

/** Rectangular block with plinth, string course and cornice. */
function block(b: Builder, x0: number, x1: number, z0: number, z1: number, top = H.eave) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  b.block(WALL, w, top, d, cx, 0, cz)
  b.block('stoneWarm', w + 0.16, H.plinth, d + 0.16, cx, 0, cz)
  b.block(CU, w + 0.24, 0.06, d + 0.24, cx, H.plinth, cz)
  b.block(WALL, w + 0.12, 0.22, d + 0.12, cx, H.string, cz)
  b.block(WALL, w + 0.3, 0.3, d + 0.3, cx, H.cornice, cz)
  b.block(WALL, w + 0.5, top - H.cornice - 0.3, d + 0.5, cx, H.cornice + 0.3, cz)
}

/** Window with copper sill and plaster head. */
function win(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, type: 'rect' | 'round' = 'rect', bars: [number, number] = [2, 2]) {
  window_(b, face, plane, u, y0, { type, w, h, frame: 0.16, frameKey: WALL, bars, glassKey: 'glassC' })
  b.add(CU, metricBox(w + 0.5, 0.08, 0.32), onFace(face, plane, u, mat(0, y0 - 0.2, 0.14)))
  if (type === 'rect') b.add(WALL, metricBox(w + 0.5, 0.18, 0.14), onFace(face, plane, u, mat(0, y0 + h + 0.25, 0.07)))
}

/** Wrought-iron sign / balconette above the arched ground-floor windows. */
function ironSign(b: Builder, face: Face, plane: number, u: number, y: number, w: number) {
  b.add('iron', metricBox(w, 0.06, 0.06), onFace(face, plane, u, mat(0, y + 0.35, 0.22)))
  b.add('iron', metricBox(w, 0.06, 0.06), onFace(face, plane, u, mat(0, y, 0.22)))
  for (let i = 0; i <= 10; i++) b.add('iron', metricBox(0.04, 0.35, 0.04), onFace(face, plane, u, mat(-w / 2 + (i * w) / 10, y + 0.17, 0.22, 0, 0, i % 2 ? 0.5 : -0.5)))
  for (const s of [-1, 1]) b.add('iron', metricBox(0.05, 0.05, 0.45), onFace(face, plane, u, mat((s * w) / 2, y, 0.1)))
}

/** Iron railing along A→B (posts + two rails). */
function railing(b: Builder, A: THREE.Vector3, B: THREE.Vector3, h = 1.0) {
  b.beam('iron', A.clone().add(V(0, h, 0)), B.clone().add(V(0, h, 0)), 0.05, 0.05)
  b.beam('iron', A.clone().add(V(0, 0.12, 0)), B.clone().add(V(0, 0.12, 0)), 0.04, 0.04)
  const n = Math.max(1, Math.round(A.distanceTo(B) / 0.14))
  for (let i = 0; i <= n; i++) {
    const p = A.clone().lerp(B, i / n)
    b.add('iron', metricBox(0.025, h, 0.025), mat(p.x, p.y + h / 2, p.z))
  }
}

/** Copper eaves fascia + half-round gutter around a hipped wing. */
function eaves(b: Builder, x0: number, x1: number, z0: number, z1: number, ov: number, sides: ('n' | 's' | 'e' | 'w')[]) {
  const y = H.eave - ov * Math.tan((30 * Math.PI) / 180)
  const X0 = x0 - ov
  const X1 = x1 + ov
  const Z0 = z0 - ov
  const Z1 = z1 + ov
  const seg: Record<string, [THREE.Vector3, THREE.Vector3]> = {
    n: [V(X0, y, Z0), V(X1, y, Z0)],
    s: [V(X0, y, Z1), V(X1, y, Z1)],
    w: [V(X0, y, Z0), V(X0, y, Z1)],
    e: [V(X1, y, Z0), V(X1, y, Z1)],
  }
  for (const k of ['n', 's', 'e', 'w']) {
    const [a, c] = seg[k]
    b.beam(CU, a.clone().add(V(0, -0.18, 0)), c.clone().add(V(0, -0.18, 0)), 0.08, 0.42)
  }
  for (const k of sides) {
    const [a, c] = seg[k]
    const n = k === 'n' ? V(0, 0, -0.14) : k === 's' ? V(0, 0, 0.14) : k === 'e' ? V(0.14, 0, 0) : V(-0.14, 0, 0)
    b.rod(CU, a.clone().add(n).add(V(0, -0.2, 0)), c.clone().add(n).add(V(0, -0.2, 0)), 0.1, 8)
  }
  // soffit
  b.add(WALL, metricBox(X1 - X0 - 0.1, 0.06, Z1 - Z0 - 0.1), mat((X0 + X1) / 2, y - 0.38, (Z0 + Z1) / 2))
}

const downpipe = (b: Builder, x: number, z: number, top: number) => b.rod(CU, V(x, 0.3, z), V(x, top, z), 0.055, 8)

function build(): Builder {
  const b = new Builder()

  /* ---------------- blocks ---------------- */
  block(b, C.x0, C.x1, C.z0, C.z1)
  block(b, NE.x0, NE.x1, NE.z0, NE.z1)
  block(b, SW.x0, SW.x1, SW.z0, SW.z1)
  block(b, C.x1, 4.7, NE.z1, 7.3) // link between the central block and the tower

  /* ---------------- hipped copper roofs ---------------- */
  const ov = 0.55
  hippedRoof(b, CU, { x: (NE.x0 + NE.x1) / 2, z: (NE.z0 + NE.z1) / 2, w: NE.x1 - NE.x0, d: NE.z1 - NE.z0, y: H.eave, pitch: 30, overhang: ov, seams: SEAM })
  hippedRoof(b, CU, { x: (SW.x0 + SW.x1) / 2, z: (SW.z0 + SW.z1) / 2, w: SW.x1 - SW.x0, d: SW.z1 - SW.z0, y: H.eave, pitch: 30, overhang: ov, seams: SEAM })
  eaves(b, NE.x0, NE.x1, NE.z0, NE.z1, ov, ['n', 'e'])
  eaves(b, SW.x0, SW.x1, SW.z0, SW.z1, ov, ['s', 'w'])
  for (const [x, z] of [[NE.x1 + 0.2, NE.z0 + 0.3], [NE.x1 + 0.2, NE.z1 - 0.6], [NE.x0 + 0.6, NE.z0 - 0.2], [SW.x0 - 0.2, SW.z1 - 0.3], [SW.x0 + 0.3, SW.z1 + 0.2], [SW.x0 - 0.2, SW.z0 + 0.4]]) downpipe(b, x, z, H.eave - 0.45)

  /* ---------------- roof terrace on the central block + link ---------------- */
  {
    const tw = C.x1 - C.x0
    const td = C.z1 - C.z0
    const cx = (C.x0 + C.x1) / 2
    const floor = H.eave + 0.2
    b.block('plasterSand', tw, 0.2, td, cx, H.eave, 0) // terrace membrane
    // parapet walls with copper coping
    const pw = 0.3
    const e = 0.2 // parapet outer face beyond the wall plane (sits on the cornice)
    const par = (w: number, d: number, x: number, z: number) => {
      b.block(WALL, w, H.parapet - H.eave, d, x, H.eave, z)
      b.block(CU, w + 0.12, 0.08, d + 0.12, x, H.parapet, z)
    }
    par(tw + 2 * e, pw, cx, C.z0 - e + pw / 2)
    par(tw + 2 * e, pw, cx, C.z1 + e - pw / 2)
    par(pw, td + 2 * e, C.x0 - e + pw / 2, 0)
    par(pw, td + 2 * e, C.x1 + e - pw / 2, 0)
    const y = H.parapet + 0.08
    railing(b, V(C.x0 - e, y, C.z0 - e + 0.15), V(C.x1 + e, y, C.z0 - e + 0.15))
    railing(b, V(C.x0 - e, y, C.z1 + e - 0.15), V(C.x1 + e, y, C.z1 + e - 0.15))
    railing(b, V(C.x0 - e + 0.15, y, -0.9), V(C.x0 - e + 0.15, y, C.z1 + e))
    railing(b, V(C.x1 + e - 0.15, y, C.z0 - e), V(C.x1 + e - 0.15, y, NE.z1))
    // skylights
    for (const [sx, sz] of [[-2.0, -5.0], [-2.0, -1.8]]) {
      b.block(WALL, 1.5, 0.45, 1.5, sx, floor, sz)
      b.block('skylight', 1.2, 0.16, 1.2, sx, floor + 0.45, sz)
    }
    // link roof (copper) + two chimneys
    b.block(CU, 4.7 - C.x1 + 0.3, 0.1, 7.3 - NE.z1 + 0.3, (C.x1 + 4.7) / 2, H.eave, (NE.z1 + 7.3) / 2)
    for (const z of [2.4, 4.5]) {
      b.block(WALL, 0.8, 2.3, 0.8, 3.0, H.eave, z)
      b.block(CU, 1.0, 0.12, 1.0, 3.0, H.eave + 2.3, z)
      b.block(WALL, 0.5, 0.25, 0.5, 3.0, H.eave + 2.42, z)
    }
  }

  /* ---------------- façades ---------------- */
  // central block, south front: arched window, iron sign, upper window, basement windows
  {
    const f: Face = '+z'
    const u = U(f, -0.65, C.z1)
    window_(b, f, C.z1, u, 2.0, { type: 'round', w: 2.3, h: 2.7, frame: 0.3, frameKey: WALL, bars: [3, 3] })
    b.add(CU, metricBox(2.9, 0.08, 0.34), onFace(f, C.z1, u, mat(0, 1.82, 0.15)))
    ironSign(b, f, C.z1, u, 5.55, 3.2)
    win(b, f, C.z1, u, 6.3, 1.9, 1.9, 'rect', [3, 2])
    for (const du of [-1.2, 1.2]) window_(b, f, C.z1, u + du, 0.4, { type: 'rect', w: 0.8, h: 0.45, frame: 0.1, frameKey: 'stoneGrey' })
    // link (recessed) front: small windows
    win(b, f, 7.3, U(f, 3.5, 7.3), 2.3, 0.7, 1.8)
    win(b, f, 7.3, U(f, 3.5, 7.3), 6.4, 0.7, 1.8)
  }
  // NE wing, east front: arched window, iron sign, 3-light window
  {
    const f: Face = '+x'
    const u = U(f, NE.x1, (NE.z0 + NE.z1) / 2)
    window_(b, f, NE.x1, u, 2.0, { type: 'round', w: 2.2, h: 2.6, frame: 0.3, frameKey: WALL, bars: [3, 3] })
    b.add(CU, metricBox(2.8, 0.08, 0.34), onFace(f, NE.x1, u, mat(0, 1.82, 0.15)))
    ironSign(b, f, NE.x1, u, 5.5, 3.0)
    win(b, f, NE.x1, u, 6.3, 2.6, 1.9, 'rect', [3, 2])
    for (const du of [-1.3, 1.3]) window_(b, f, NE.x1, u + du, 0.4, { type: 'rect', w: 0.8, h: 0.45, frame: 0.1, frameKey: 'stoneGrey' })
    win(b, f, NE.x1, U(f, NE.x1, -6.2), 6.3, 1.1, 1.9)
    win(b, f, NE.x1, U(f, NE.x1, -6.2), 2.3, 1.1, 1.9)
  }
  // SW wing: two bays on the south and west fronts
  for (const x of [-8.4, -5.3]) {
    win(b, '+z', SW.z1, U('+z', x, SW.z1), 2.3, 1.3, 1.9)
    win(b, '+z', SW.z1, U('+z', x, SW.z1), 6.3, 1.3, 1.9)
    window_(b, '+z', SW.z1, U('+z', x, SW.z1), 0.4, { type: 'rect', w: 0.8, h: 0.45, frame: 0.1, frameKey: 'stoneGrey' })
  }
  for (const z of [1.6, 5.2]) {
    win(b, '-x', SW.x0, U('-x', SW.x0, z), 2.3, 1.3, 1.9)
    win(b, '-x', SW.x0, U('-x', SW.x0, z), 6.3, 1.3, 1.9)
  }
  // NE wing north front: blank (as photographed) — one small stair window
  win(b, '-z', NE.z0, U('-z', 7.4, NE.z0), 6.6, 0.8, 1.4)

  /* ---------------- dome tower ---------------- */
  {
    const { x, z, r } = TOWER
    b.add(WALL, new THREE.CylinderGeometry(r, r, H.eave, 48, 1, true), mat(x, H.eave / 2, z))
    b.add('stoneWarm', new THREE.CylinderGeometry(r + 0.1, r + 0.12, H.plinth, 48, 1, true), mat(x, H.plinth / 2, z))
    b.add(CU, new THREE.CylinderGeometry(r + 0.14, r + 0.14, 0.06, 48, 1, true), mat(x, H.plinth + 0.03, z))
    b.add(WALL, new THREE.CylinderGeometry(r + 0.07, r + 0.07, 0.22, 48, 1, true), mat(x, H.string + 0.11, z))
    // projecting copper-clad main cornice ring
    b.add(CU, lathe([[r - 0.05, 0], [r + 0.25, 0.0], [r + 0.75, 0.32], [r + 0.75, 0.5], [r + 0.3, 0.6], [r - 0.2, 0.62]], 48), mat(x, H.eave - 0.1, z))
    // observing-room drum with pilaster panels
    const rd = 3.45
    const y0 = H.eave + 0.5
    const y1 = 12.8
    b.add(WALL, new THREE.CylinderGeometry(rd, rd, y1 - y0, 48, 1, true), mat(x, (y0 + y1) / 2, z))
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2
      b.add(WALL, metricBox(0.32, y1 - y0 - 0.3, 0.12), mat(x + Math.cos(a) * (rd + 0.05), (y0 + y1) / 2 - 0.05, z + Math.sin(a) * (rd + 0.05), Math.atan2(Math.cos(a), Math.sin(a))))
    }
    b.add(WALL, new THREE.CylinderGeometry(rd + 0.12, rd + 0.12, 0.25, 48, 1, true), mat(x, y0 + 0.12, z))
    // copper dome base ring
    b.add(CU, lathe([[rd - 0.1, 0], [rd + 0.28, 0], [rd + 0.32, 0.25], [rd + 0.05, 0.36], [3.45, 0.38]], 48), mat(x, y1, z))
    // window pairs (ground + first floor) and the drum windows
    const ring = (deg: number, y: number, w: number, h: number, rr: number) => {
      const d = dirOf(deg)
      const ry = Math.atan2(d.x, d.z)
      const m = mat(x + d.x * (rr + 0.02), 0, z + d.z * (rr + 0.02), ry)
      b.add('glassC', new THREE.PlaneGeometry(w, h), new THREE.Matrix4().multiplyMatrices(m, mat(0, y + h / 2, 0.02)))
      b.add(WALL, metricBox(w + 0.3, 0.14, 0.18), new THREE.Matrix4().multiplyMatrices(m, mat(0, y + h + 0.1, 0.05)))
      b.add(CU, metricBox(w + 0.3, 0.07, 0.3), new THREE.Matrix4().multiplyMatrices(m, mat(0, y - 0.05, 0.12)))
      for (const s of [-1, 1]) b.add(WALL, metricBox(0.12, h, 0.12), new THREE.Matrix4().multiplyMatrices(m, mat((s * (w + 0.12)) / 2, y + h / 2, 0.05)))
    }
    for (const deg of [80, 190]) {
      for (const da of [-7.5, 7.5]) {
        ring(deg + da, 2.0, 0.75, 2.5, r)
        ring(deg + da, 6.0, 0.75, 2.4, r)
      }
    }
    for (const deg of [100, 190, 280]) ring(deg, 11.0, 0.8, 1.1, rd)
    // entrance porch on the south-east: door, copper canopy on brackets, steps
    const pd = dirOf(135)
    const pry = Math.atan2(pd.x, pd.z)
    const pm = (lx: number, ly: number, lz: number) => new THREE.Matrix4().multiplyMatrices(mat(x + pd.x * r, 0, z + pd.z * r, pry), mat(lx, ly, lz))
    b.add('wood', new THREE.PlaneGeometry(1.3, 2.5), pm(0, H.plinth + 1.25, 0.05))
    b.add(WALL, metricBox(1.8, 0.2, 0.3), pm(0, H.plinth + 2.6, 0.12))
    const cw = 2.6
    const cdp = 1.7
    const cy = H.plinth + 3.2
    facet(b, CU, [V().setFromMatrixPosition(pm(-cw / 2, cy, -0.1)), V().setFromMatrixPosition(pm(cw / 2, cy, -0.1)), V().setFromMatrixPosition(pm(cw / 2, cy - 0.6, cdp)), V().setFromMatrixPosition(pm(-cw / 2, cy - 0.6, cdp))], { seams: SEAM, thickness: 0.08 })
    for (const s of [-1, 1]) b.beam('iron', V().setFromMatrixPosition(pm((s * cw) / 2 - s * 0.15, cy - 1.0, 0.05)), V().setFromMatrixPosition(pm((s * cw) / 2 - s * 0.15, cy - 0.6, cdp - 0.1)), 0.06, 0.06)
    for (let i = 0; i < 5; i++) b.add('stoneWarm', metricBox(2.2, 0.24, 0.32 * (5 - i)), pm(0, 0.12 + i * 0.24, 0.16 * (5 - i) + 0.05))
    for (const s of [-1, 1]) b.add(WALL, metricBox(0.25, 1.3, 1.7), pm(s * 1.22, 0.65, 0.85))

    /* green-patinated ribbed dome with observation-slit shutter */
    const yd = y1 + 0.38
    const rD = 3.48
    dome(b, PAT, { x, y: yd, z, r: rD, h: rD, profile: 'hemi', seg: 48, ribs: 40, ribH: 0.035 })
    const dN = dirOf(315) // slit opens towards the north-west horizon
    const side = V(-dN.z, 0, dN.x)
    const P = (th: number, off: number, rr: number) => V(x, yd, z).add(dN.clone().multiplyScalar(Math.cos(th) * rr)).add(V(0, Math.sin(th) * rr, 0)).add(side.clone().multiplyScalar(off))
    const N = 18
    const th0 = 0.05
    const th1 = (122 * Math.PI) / 180
    for (let i = 0; i < N; i++) {
      const a0 = th0 + ((th1 - th0) * i) / N
      const a1 = th0 + ((th1 - th0) * (i + 1)) / N
      for (const off of [-0.72, 0.72]) b.beam(PAT, P(a0, off, rD + 0.1), P(a1, off, rD + 0.1), 0.16, 0.22, V(Math.cos((a0 + a1) / 2) * dN.x, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2) * dN.z))
      facet(b, PAT, [P(a0, -0.64, rD + 0.16), P(a0, 0.64, rD + 0.16), P(a1, 0.64, rD + 0.16), P(a1, -0.64, rD + 0.16)], { hint: V(Math.cos(a0) * dN.x, Math.sin(a0), Math.cos(a0) * dN.z), thickness: 0.05 })
    }
    // shutter hood and the cross tube at the top end
    const hp = P(th1, 0, rD + 0.3)
    b.add(PAT, metricBox(1.9, 0.5, 0.9), new THREE.Matrix4().makeRotationY(Math.atan2(dN.x, dN.z)).setPosition(hp))
    b.rod(PAT, P(th1 - 0.1, -1.3, rD + 0.55), P(th1 - 0.1, 1.3, rD + 0.55), 0.09, 8)
    b.add(PAT, new THREE.TorusGeometry(rD + 0.02, 0.07, 4, 48), mat(x, yd + 0.04, z, 0, Math.PI / 2))
  }

  /* ---------------- open switch-back stair to the terrace (NW) ---------------- */
  {
    const x0 = -11.0 // west end (beyond the SW wing, as photographed)
    const x1 = C.x0 - 0.2
    const lw = 1.6
    const zA = -4.7 // outer (north) lane
    const zB = zA + lw + 0.2 // inner lane
    const xl = x0 + 1.3 // west landing edge
    const xr = x1 - 1.1 // east landing edge
    const lv = [0, 3.5, 7.0, H.eave + 0.2]
    const KEY = 'concreteLight'
    const flight = (xa: number, xb: number, ya: number, yb: number, zc: number) => {
      const n = 14
      const dx = (xb - xa) / n
      for (let i = 0; i < n; i++) b.add(KEY, metricBox(Math.abs(dx) + 0.02, 0.17, lw), mat(xa + dx * (i + 0.5), ya + ((yb - ya) * (i + 1)) / n - 0.085, zc))
      b.beam(KEY, V(xa, Math.max(ya - 0.15, 0.15), zc), V(xb, yb - 0.15, zc), lw, 0.25, V(0, 1, 0))
      // white sloping parapet on the outer edge + iron handrail
      const zo = zc + (zc < zA + lw ? -lw / 2 - 0.1 : lw / 2 + 0.1)
      b.beam(WALL, V(xa, ya + 0.35, zo), V(xb, yb + 0.35, zo), 0.18, 0.9, V(0, 1, 0))
      b.beam('iron', V(xa, ya + 1.0, zc + (zo - zc) * 0.9), V(xb, yb + 1.0, zc + (zo - zc) * 0.9), 0.05, 0.05)
    }
    const landing = (xa: number, xb: number, y: number) => {
      b.block(KEY, xb - xa, 0.3, 2 * lw + 0.2, (xa + xb) / 2, y - 0.3, zA + lw + 0.1)
      b.block(WALL, 0.35, y - 0.3, 0.35, xa + 0.2, 0, zA + 0.2)
      b.block(WALL, 0.35, y - 0.3, 0.35, xa + 0.2, 0, zA + 2 * lw)
    }
    flight(xr, xl, lv[0], lv[1], zA + lw / 2)
    landing(x0, xl, lv[1])
    flight(xl, xr, lv[1], lv[2], zB + lw / 2)
    landing(xr, x1, lv[2])
    flight(xr, xl, lv[2], lv[3], zA + lw / 2)
    landing(x0, xl, lv[3])
    // top walkway back east to the terrace along the inner lane
    b.block(KEY, x1 - xl + 0.2, 0.3, lw, (xl + x1 + 0.2) / 2, lv[3] - 0.3, zB + lw / 2)
    railing(b, V(x0, lv[3], zA - 0.05), V(x0, lv[3], zB + lw))
    railing(b, V(x0, lv[3], zB + lw + 0.05), V(x1, lv[3], zB + lw + 0.05))
    railing(b, V(x0, lv[3], zA - 0.05), V(xl, lv[3], zA - 0.05))
    // white enclosure wall under the lower flight (stair base)
    b.block(WALL, xr - xl, 1.2, 0.2, (xl + xr) / 2, 0, zA - 0.1)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [6.85, 15.5, 4.8],
  materials: (base) => {
    const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
    m.color = new THREE.Color('#8b8388')
    m.metalness = 0.62
    m.roughness = 0.55
    const p = (base.copperPatina as THREE.MeshStandardMaterial).clone()
    p.color = new THREE.Color('#9db8a6')
    p.roughness = 0.58
    return { cuRoof: m, cuPatina: p }
  },
  notes: 'Astronomical Observatory, Iași: two-storey villa with a flat roof terrace, two hipped copper-roofed wings and a round tower with a green copper observation dome; copper gutters and downpipes. Storey heights, roof pitch and the exterior stair are approximated.',
}

export default model
