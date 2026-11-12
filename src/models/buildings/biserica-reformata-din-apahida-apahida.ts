/**
 * New Reformed church of Apahida (Cluj) — under construction in 2026; not in
 * OpenStreetMap, no published survey.
 *
 * The model shows the FINISHED state as far as the public sources show it:
 * the published design elevation (photo 04: white render, stone-clad raised
 * basement, clay-tile nave roof, timber belfry, metal spire) combined with the
 * construction photographs of 29 April 2026 (photos 01–03: brick shell of the
 * nave and corner tower, spire and pinnacles already clad in bright
 * standing-seam titanium-zinc, waiting to be lifted on).
 *
 * Modelling specification (real metres; +X assumed = east, tower at the west
 * end; ±0.00 = church floor = 0.9 m above the model ground):
 *  - Hall nave ≈ 20.3 × 9.2 m (length scaled on the elevation, ridge +10.10
 *    and eaves ≈ +4.4 as dimensioned; width from the gable slope in photo 01
 *    — the tower occupies half the gable end, its edge at the apex).
 *  - Steep (≈ 51°) clay-tile roof between gable walls with low parapets and
 *    metal copings; gutters and downpipes.
 *  - Long side (elevation): two + two pointed-arch windows with dark frames
 *    and a central timber entrance porch with a gabled roof and a pointed
 *    door; ramp with a railing along the wall; stone-clad plinth.
 *  - West end: covered timber porch (≈ 3.7 m deep, ridge ≈ +4.1) in front of
 *    the half of the gable not occupied by the tower; two narrow windows in
 *    the gable.
 *  - Corner tower ≈ 4.3 m square: rendered shaft to +12.75 with slit
 *    windows, open dark timber belfry with arched braces to ≈ +14.3, flared
 *    square skirt, octagonal needle spire to +20.5 with horizontal-seam
 *    cladding and hip rolls, four corner pinnacles (louvred boxes with small
 *    skirts and pyramids) and a Bethlehem-star finial (≈ +21.9).
 *  - METAL (as photographed / client rule): COLOR METAL supplied natural
 *    titanium-zinc strip (elZinc Natural) according to its records; the
 *    photographs show it on the spire, skirt and pinnacles, so these — plus
 *    gutters, downpipes and copings — are shown in natural titanium-zinc. The
 *    nave roof keeps the clay tiles of the design drawing.
 * Approximations: no outline or orientation data (bearing assumed); width,
 * tower openings, gable windows and the porch width estimated; the sloping
 * site (basement storey exposed at the east end) is not reproduced — a
 * uniform 0.9 m stone plinth is shown; finishes follow the design drawing as
 * the building was still unrendered in the photographs.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, type OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* ---------------- dimensions ---------------- */
const PL = 0.9 // floor level above model ground (stone plinth)
const HL = 10.15 // nave half length
const HW = 4.6 // nave half width
const EAVE = PL + 4.4
const RIDGE = PL + 10.1
const T = (RIDGE - EAVE) / HW
const OV = 0.45
const TW = 4.3
const TCX = -HL + TW / 2
const TCZ = -HW + TW / 2
const SHAFT = PL + 12.75
const BELFRY = PL + 14.3
const SPIRE0 = PL + 14.86
const SPIRE1 = PL + 20.5

const ZN = 'zincNatural'
const WALL = 'apaRender'
const STONE = 'stoneWarm'
const FRAME = 'apaFrame'
const TIMBER = 'apaTimber'
const TILE = 'tileRed'

/** Pointed window with dark frame, transom and sill. */
function win(b: Builder, m: THREE.Matrix4, type: OpeningType, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.04)))
  b.add(FRAME, extrude(frameShape(type, w, h, 0.09, 0, y0), 0.08), M(m, mat(0, 0, 0.02)))
  if (h > 1.6) b.add(FRAME, metricBox(w, 0.07, 0.06), M(m, mat(0, y0 + h - w * 0.95, 0.07)))
  b.add(ZN, metricBox(w + 0.25, 0.05, 0.22), M(m, mat(0, y0 - 0.1, 0.1)))
}

/** Square-section horizontal ring on an octagon at height y (radius r = circumradius). */
function octRing(b: Builder, cx: number, cz: number, r: number, y: number, w: number) {
  const ph = Math.PI / 8
  for (let k = 0; k < 8; k++) {
    const a0 = ph + (k / 8) * Math.PI * 2
    const a1 = ph + ((k + 1) / 8) * Math.PI * 2
    b.beam(ZN, V(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r), V(cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r), w, w)
  }
}

/** Corner pinnacle: louvred zinc box, small flared skirt, slender pyramid. */
function pinnacle(b: Builder, x: number, z: number) {
  const y0 = PL + 14.7
  b.block(ZN, 0.55, 0.85, 0.55, x, y0, z)
  for (const [dx, dz, ry] of [
    [0.28, 0, Math.PI / 2],
    [-0.28, 0, -Math.PI / 2],
    [0, 0.28, 0],
    [0, -0.28, Math.PI],
  ]) for (let i = 0; i < 4; i++) b.add(FRAME, metricBox(0.36, 0.035, 0.03), mat(x + dx, y0 + 0.2 + i * 0.15, z + dz, ry, 0.4))
  const ys = y0 + 0.85
  b.add(ZN, new THREE.CylinderGeometry(0.3, 0.52, 0.22, 4, 1, false, Math.PI / 4), mat(x, ys + 0.11, z))
  b.add(ZN, new THREE.ConeGeometry(0.3, PL + 17.2 - ys - 0.22, 4, 1, false, Math.PI / 4), mat(x, ys + 0.22 + (PL + 17.2 - ys - 0.22) / 2, z))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- nave ---------------- */
  b.block(STONE, 2 * HL + 0.12, PL, 2 * HW + 0.12, 0, 0, 0)
  b.block(WALL, 2 * HL, EAVE, 2 * HW, 0, 0, 0)
  b.block(STONE, 2 * HL + 0.18, 0.08, 2 * HW + 0.18, 0, PL - 0.04, 0) // plinth capping
  // gable walls with low parapets and zinc copings
  const PAR = 0.28
  for (const sx of [-1, 1]) {
    const s = new THREE.Shape([
      new THREE.Vector2(-HW - 0.05, EAVE - 0.02),
      new THREE.Vector2(HW + 0.05, EAVE - 0.02),
      new THREE.Vector2(HW + 0.05, EAVE + PAR),
      new THREE.Vector2(0, RIDGE + PAR),
      new THREE.Vector2(-HW - 0.05, EAVE + PAR),
    ])
    b.add(WALL, extrude(s, 0.4), mat(sx * (HL - 0.4), 0, 0, sx > 0 ? Math.PI / 2 : -Math.PI / 2))
    for (const sz of [-1, 1]) b.beam(ZN, V(sx * (HL - 0.2), EAVE + PAR + 0.02, sz * (HW + 0.1)), V(sx * (HL - 0.2), RIDGE + PAR + 0.04, 0), 0.5, 0.06)
  }

  /* ---------------- clay-tile roof, gutters ---------------- */
  {
    const ey = EAVE - OV * T
    const x0 = -HL + 0.38
    const x1 = HL - 0.38
    for (const sz of [-1, 1]) {
      // north slope: the eave stops at the corner tower (its faces are flush with the nave walls)
      const xa = sz < 0 ? TCX + TW / 2 : x0
      facet(b, TILE, [V(xa, ey, sz * (HW + OV)), V(x1, ey, sz * (HW + OV)), V(x1, RIDGE, 0), V(xa, RIDGE, 0)], { thickness: 0.14 })
      if (sz < 0) {
        const zA = -1.0 // strip between the tower's inner face and the ridge
        facet(b, TILE, [V(x0, RIDGE + zA * T, zA), V(xa, RIDGE + zA * T, zA), V(xa, RIDGE, 0), V(x0, RIDGE, 0)], { thickness: 0.1 })
      }
    }
    b.beam('tileBrown', V(x0, RIDGE + 0.06, 0), V(x1, RIDGE + 0.06, 0), 0.32, 0.16)
    for (const sz of [-1, 1]) {
      const xs = sz < 0 ? TCX + TW / 2 : -HL // north eave starts at the tower
      b.beam(ZN, V(xs, ey - 0.08, sz * (HW + OV + 0.08)), V(HL, ey - 0.08, sz * (HW + OV + 0.08)), 0.17, 0.15)
      for (const x of [xs + 0.25, HL - 0.25]) b.rod(ZN, V(x, 0.2, sz * (HW + 0.12)), V(x, ey - 0.08, sz * (HW + 0.12)), 0.055, 8)
    }
  }

  /* ---------------- long sides ---------------- */
  for (const sz of [-1, 1]) {
    const ry = sz > 0 ? 0 : Math.PI
    for (const x of [-6.85, -3.1, 4.35, 8.05]) if (sz > 0 || x > TCX + TW / 2) win(b, mat(x, 0, sz * HW, ry), 'pointed', 1.2, 2.65, PL + 1.25)
  }
  // entrance porch (south side, centre ≈ x 0.65)
  {
    const px = 0.65
    const pw = 3.3
    const pd = 1.7
    const z0 = HW
    const z1 = HW + pd
    const ye = PL + 2.45
    const yr = PL + 4.1
    // pointed double door in the wall
    b.add(FRAME, new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.6, 2.7, 0, PL, 12))), mat(px, 0, z0 + 0.03))
    b.add(WALL, extrude(frameShape('pointed', 1.6, 2.7, 0.15, 0, PL), 0.06), mat(px, 0, z0))
    // posts, beams, bargeboards (timber) and tile roof
    for (const sx of [-1, 1]) {
      b.block(TIMBER, 0.2, ye - PL, 0.2, px + sx * (pw / 2 - 0.1), PL, z1 - 0.1)
      b.block(TIMBER, 0.2, ye - PL, 0.2, px + sx * (pw / 2 - 0.1), PL, z0 + 0.1)
      b.beam(TIMBER, V(px + sx * (pw / 2 - 0.1), ye, z0), V(px + sx * (pw / 2 - 0.1), ye, z1), 0.2, 0.22)
      b.beam('apaWood', V(px + sx * (pw / 2 + 0.25), ye - 0.25, z1 + 0.3), V(px, yr + 0.05, z1 + 0.3), 0.3, 0.06, V(0, 0, 1))
    }
    b.beam(TIMBER, V(px - pw / 2, ye, z1 - 0.1), V(px + pw / 2, ye, z1 - 0.1), 0.2, 0.22)
    const t2 = (yr - ye) / (pw / 2)
    for (const sx of [-1, 1]) {
      const xe = px + sx * (pw / 2 + 0.3)
      facet(b, TILE, [V(xe, ye - 0.3 * t2, z0), V(xe, ye - 0.3 * t2, z1 + 0.3), V(px, yr, z1 + 0.3), V(px, yr, z0)], { thickness: 0.1 })
      b.beam(ZN, V(xe + sx * 0.06, ye - 0.3 * t2 - 0.07, z0), V(xe + sx * 0.06, ye - 0.3 * t2 - 0.07, z1 + 0.3), 0.12, 0.11)
    }
    b.beam('tileBrown', V(px, yr + 0.05, z0), V(px, yr + 0.05, z1 + 0.3), 0.24, 0.12)
    // floor and steps
    b.block(STONE, pw, PL, pd, px, 0, (z0 + z1) / 2)
    // ramp terrace with railing towards the west end (elevation)
    b.block(STONE, 9.3, PL, 1.4, -5.6, 0, HW + 0.7)
    b.beam(FRAME, V(-HL + 0.1, PL + 1.0, HW + 1.35), V(px - pw / 2, PL + 1.0, HW + 1.35), 0.05, 0.05)
    for (let x = -HL + 0.1; x < px - pw / 2; x += 1.2) b.rod(FRAME, V(x, PL, HW + 1.35), V(x, PL + 1.0, HW + 1.35), 0.025, 6)
  }

  /* ---------------- west end: covered porch, gable windows ---------------- */
  {
    const pz0 = TCZ + TW / 2 // tower inner face
    const pz1 = HW
    const pcz = (pz0 + pz1) / 2
    const phw = (pz1 - pz0) / 2 + 0.05
    const x1 = -HL
    const x0 = -HL - 3.7
    const ye = PL + 2.3
    const yr = PL + 4.1
    const t3 = (yr - ye) / phw
    b.block(STONE, x1 - x0, PL, 2 * phw, (x0 + x1) / 2, 0, pcz)
    for (let i = 0; i < 2; i++) b.block(STONE, 0.4, PL * (1 - (i + 1) / 3), 2 * phw, x0 - 0.2 - i * 0.4, 0, pcz)
    for (const sz of [-1, 1]) {
      for (const x of [x0 + 0.12, x1 - 0.2]) b.block(TIMBER, 0.22, ye - PL, 0.22, x, PL, pcz + sz * (phw - 0.12))
      b.beam(TIMBER, V(x0, ye, pcz + sz * (phw - 0.12)), V(x1, ye, pcz + sz * (phw - 0.12)), 0.2, 0.24)
      const ze = pcz + sz * (phw + 0.3)
      facet(b, TILE, [V(x0 - 0.3, ye - 0.3 * t3, ze), V(x1, ye - 0.3 * t3, ze), V(x1, yr, pcz), V(x0 - 0.3, yr, pcz)], { thickness: 0.1 })
      b.beam(ZN, V(x0 - 0.3, ye - 0.3 * t3 - 0.07, ze + sz * 0.06), V(x1, ye - 0.3 * t3 - 0.07, ze + sz * 0.06), 0.12, 0.11)
      b.beam('apaWood', V(x0 - 0.3, ye - 0.3 * t3 - 0.1, ze), V(x0 - 0.3, yr + 0.05, pcz), 0.3, 0.06, V(-1, 0, 0))
    }
    b.beam(TIMBER, V(x0 + 0.12, ye, pcz - phw), V(x0 + 0.12, ye, pcz + phw), 0.2, 0.24)
    b.beam('tileBrown', V(x0 - 0.3, yr + 0.05, pcz), V(x1, yr + 0.05, pcz), 0.24, 0.12)
    // main door under the porch
    b.add(FRAME, new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.7, 2.9, 0, PL, 12))), mat(-HL - 0.03, 0, pcz, -Math.PI / 2))
    b.add(WALL, extrude(frameShape('pointed', 1.7, 2.9, 0.16, 0, PL), 0.06), mat(-HL, 0, pcz, -Math.PI / 2))
    // two narrow windows in the gable (photo 01), one pair in the east gable
    for (const dz of [-0.55, 0.55]) {
      win(b, mat(-HL, 0, pcz + dz, -Math.PI / 2), 'pointed', 0.5, 1.9, PL + 5.3)
      win(b, mat(HL, 0, dz, Math.PI / 2), 'pointed', 0.5, 1.9, PL + 5.5)
    }
    win(b, mat(HL, 0, 0, Math.PI / 2), 'pointed', 1.2, 2.65, PL + 1.25)
  }

  /* ---------------- corner tower ---------------- */
  {
    b.block(STONE, TW + 0.12, PL, TW + 0.12, TCX, 0, TCZ)
    b.block(WALL, TW, SHAFT, TW, TCX, 0, TCZ)
    b.block(FRAME, TW + 0.1, 0.14, TW + 0.1, TCX, SHAFT - 0.14, TCZ)
    // slit windows (as on the shell, photo 01)
    const faces: [number, number, number][] = [
      [TCX - TW / 2, TCZ, -Math.PI / 2], // west
      [TCX, TCZ - TW / 2, Math.PI], // north
      [TCX + TW / 2, TCZ, Math.PI / 2], // east (above the roof only)
      [TCX, TCZ + TW / 2, 0], // south (above the roof only)
    ]
    faces.forEach(([x, z, ry], k) => {
      const m = mat(x, 0, z, ry)
      const levels = k < 2 ? [PL + 2.4, PL + 5.6, PL + 8.6, PL + 11.0] : [PL + 11.0]
      levels.forEach((y, i) => {
        const us = k < 2 && i === 1 ? [-0.6, 0.6] : [0]
        for (const u of us) win(b, M(m, mat(u, 0, 0)), 'rect', 0.42, 1.35, y)
      })
    })
    // open timber belfry: corner posts, top ring beam, arched braces, mesh
    const hb = TW / 2 - 0.12
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) b.block(TIMBER, 0.24, BELFRY - SHAFT, 0.24, TCX + sx * hb, SHAFT, TCZ + sz * hb)
    b.block(TIMBER, TW + 0.05, 0.22, TW + 0.05, TCX, BELFRY - 0.22, TCZ)
    b.block(TIMBER, TW - 0.4, 0.06, TW - 0.4, TCX, SHAFT + 0.02, TCZ)
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const m = mat(TCX + Math.sin(ry) * hb, 0, TCZ + Math.cos(ry) * hb, ry)
      const span = 2 * hb - 0.24
      b.add(TIMBER, new THREE.TorusGeometry(span / 2, 0.07, 4, 14, Math.PI), M(m, mat(0, BELFRY - 0.22 - span / 2 * 0.62, 0, 0, 0, 0, 1, 0.62, 1)))
      b.add('apaMesh', new THREE.PlaneGeometry(span, BELFRY - SHAFT - 0.22), M(m, mat(0, (SHAFT + BELFRY - 0.22) / 2, -0.02)))
    }
    b.block('black', TW - 1.2, BELFRY - SHAFT - 0.3, TW - 1.2, TCX, SHAFT + 0.05, TCZ)

    /* ---- zinc skirt, spire, pinnacles, star ---- */
    const sk = 2.35
    const ph = Math.PI / 8
    const rs = 1.5 // spire octagon circumradius
    const ap = rs * Math.cos(ph)
    b.block(ZN, 2 * sk, 0.12, 2 * sk, TCX, BELFRY - 0.04, TCZ)
    const c0 = [V(TCX - sk, BELFRY + 0.06, TCZ - sk), V(TCX + sk, BELFRY + 0.06, TCZ - sk), V(TCX + sk, BELFRY + 0.06, TCZ + sk), V(TCX - sk, BELFRY + 0.06, TCZ + sk)]
    const c1 = [V(TCX - ap, SPIRE0, TCZ - ap), V(TCX + ap, SPIRE0, TCZ - ap), V(TCX + ap, SPIRE0, TCZ + ap), V(TCX - ap, SPIRE0, TCZ + ap)]
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      facet(b, ZN, [c0[i], c0[j], c1[j], c1[i]], { thickness: 0.08 })
      b.beam(ZN, c0[i].clone().add(V(0, 0.03, 0)), c1[i].clone().add(V(0, 0.03, 0)), 0.09, 0.07)
      // horizontal seams on the skirt
      for (let t = 0.3; t < 1; t += 0.3) {
        const a = c0[i].clone().lerp(c1[i], t).add(V(0, 0.025, 0))
        const c = c0[j].clone().lerp(c1[j], t).add(V(0, 0.025, 0))
        b.beam(ZN, a, c, 0.04, 0.04)
      }
    }
    b.block(ZN, 2 * ap, 0.04, 2 * ap, TCX, SPIRE0 - 0.03, TCZ)
    // octagonal needle spire with horizontal flat-lock seams and hip rolls
    helm(b, ZN, { x: TCX, z: TCZ, n: 8, stations: [[rs, SPIRE0], [0.06, SPIRE1]], phase: ph, flat: true })
    for (let y = SPIRE0 + 0.6; y < SPIRE1 - 0.35; y += 0.6) {
      const r = rs * (1 - (y - SPIRE0) / (SPIRE1 - SPIRE0)) + 0.012
      octRing(b, TCX, TCZ, r, y, 0.03)
    }
    for (let k = 0; k < 8; k++) {
      const a = ph + (k / 8) * Math.PI * 2
      b.beam(ZN, V(TCX + Math.cos(a) * (rs + 0.02), SPIRE0, TCZ + Math.sin(a) * (rs + 0.02)), V(TCX, SPIRE1, TCZ), 0.06, 0.05)
    }
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) pinnacle(b, TCX + sx * 1.6, TCZ + sz * 1.6)
    // finial rod and eight-pointed (Bethlehem) star, lightning rod
    b.rod(ZN, V(TCX, SPIRE1 - 0.2, TCZ), V(TCX, SPIRE1 + 1.05, TCZ), 0.05, 8)
    const sy = SPIRE1 + 1.05
    b.add(ZN, new THREE.SphereGeometry(0.1, 10, 8), mat(TCX, sy, TCZ))
    const spike = (dir: THREE.Vector3) => {
      const L = 0.42
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize())
      const m = new THREE.Matrix4().compose(V(TCX, sy, TCZ).add(dir.clone().normalize().multiplyScalar(L / 2)), q, V(1, 1, 1))
      b.add(ZN, new THREE.ConeGeometry(0.05, L, 6), m)
    }
    for (let k = 0; k < 8; k++) spike(V(Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4), 0))
    for (const d of [V(0, 0, 1), V(0, 0, -1), V(0.7, 0.7, 0.7), V(-0.7, 0.7, -0.7)]) spike(d)
    b.rod(ZN, V(TCX + 0.35, SPIRE1 - 1.2, TCZ), V(TCX + 0.35, SPIRE1 + 0.9, TCZ), 0.02, 6)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-8.0, 18.0, -2.45],
  materials: () => ({
    apaRender: new THREE.MeshStandardMaterial({ color: '#f2f0eb', roughness: 0.9 }),
    apaFrame: new THREE.MeshStandardMaterial({ color: '#3c4146', roughness: 0.6 }),
    apaTimber: new THREE.MeshStandardMaterial({ color: '#4a4d51', roughness: 0.75 }),
    apaWood: new THREE.MeshStandardMaterial({ color: '#7a5a3f', roughness: 0.75 }),
    apaMesh: new THREE.MeshStandardMaterial({ color: '#2f3336', roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.35, depthWrite: false }),
  }),
  notes:
    'New Reformed church shown finished as far as the design drawing and the April 2026 construction photos show it: white hall with a clay-tile roof, corner tower with timber belfry and a natural titanium-zinc needle spire with pinnacles. Dimensions and orientation estimated.',
}
export default model
