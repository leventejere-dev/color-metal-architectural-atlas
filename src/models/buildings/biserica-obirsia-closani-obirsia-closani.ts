/**
 * Church «Sfântul Mare Mucenic Teodor Tiron», Obârșia-Cloșani (Mehedinți) —
 * masonry, 1936–1946; not mapped in OSM (village-centre coordinates).
 *
 * Modelling specification (real metres, +X = assumed liturgical east, the
 * entrance front with the three-arch porch at −X; the photographed long side
 * is the north side, to the left of the front):
 *  - Two near-identical Commons photographs (June 2010) of the west front and
 *    the north side, taken from the road; every other side is inferred from
 *    the regional type. Scale from the porch arches (≈ 2.3 m span) and the
 *    door: front 9.4 m wide, eaves ≈ 7.4 m, overall length assumed ≈ 19 m.
 *  - Plan: hall with an enclosed porch inside the west bay (three round
 *    arches on rust-red columns, glazed between the columns, central door),
 *    pronaos, naos with shallow rectangular lateral arms (≈ 1.9 m, seen on
 *    the north side with a window in their west face), narrower polygonal
 *    altar apse (half octagon) — the last one is not photographed.
 *  - Elevation: grey-brown roughcast with white corner pilasters, white
 *    archivolts, white cornice band at ≈ 5.4–6.0 m under a framed frieze and
 *    the top cornice; white socle with a step; a tall round-headed window
 *    lighting the porch and two narrow rectangular windows on the north side.
 *  - Roofs: low hipped roofs over the hall, the lateral arms and the apse,
 *    dark timber eaves fascia.
 *  - Towers: tall west tower over the porch/pronaos — square base stage with
 *    a pyramidal skirt roof, slimmer square belfry with a round-headed window
 *    and an oculus per face, deep cornice, octagonal bulbous cap and a
 *    triple-barred cross; small octagonal drum over the naos with arched
 *    windows and a ribbed cap.
 *  - METAL: the 2010 photographs predate the works (grey sheet roof). COLOR
 *    METAL supplied copper in 2020 according to its records, so all roof
 *    surfaces, the tower skirt roof and both caps are shown in weathered
 *    copper ('copperBrown'), standing seams ≈ 0.5 m, ribbed caps. Which
 *    surfaces were re-covered is not documented.
 * Approximations: length, the east part (lateral arms' depth, apse shape),
 * the south side (mirrored from the north) and all heights; orientation
 * assumed (apse east) because the church is not mapped.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, opening, frameShape, helm, polyRing, faceFrame, hipRoof, seams } from '../kit'
import type { ModelModule } from '../registry'

const M = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const D2R = Math.PI / 180

/* ---------------- plan ---------------- */
const XW = -10.0
const XE = 4.5 // east wall of the hall
const HW = 4.7
const ARM = { x0: -3.2, x1: 2.0, out: 1.9 } // lateral arms
const AHW = 3.5 // apse half width (apothem)
const AC = XE + 1.0 // apse octagon centre
const K = Math.tan(Math.PI / 8)
/* ---------------- heights ---------------- */
const SOCLE = 1.0
const BAND0 = 5.4
const BAND1 = 6.0
const TOPC = 7.0
const EAVE = 7.4
const PITCH = 28 * D2R
const OV = 0.6
const TW = { x: -6.6, hb: 2.2, baseTop: 11.1, hu: 1.5, upTop: 15.9 }
const DRUM = { x: (ARM.x0 + ARM.x1) / 2, ap: 1.6, top: 11.6 }

const CU = 'copperBrown'
const SEAM = seams(CU, 0.5, 0.045, 0.04)
const WALL = 'obiWall'
const WHITE = 'plasterWhite'

function frameWin(b: Builder, m: THREE.Matrix4, type: 'round' | 'rect', w: number, h: number, y0: number, f = 0.14, fill = 'glassC') {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening(type, w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  b.add(WHITE, extrude(frameShape(type, w, h, f, 0, y0), 0.08), m)
  b.add('obiFrame', extrude(frameShape(type, w - 0.04, h - 0.04, 0.05, 0, y0 + 0.02), 0.05), m)
}

/** White bands, socle and corner pilasters on one straight wall run (frame m, length L centred). */
function wallDress(b: Builder, m: THREE.Matrix4, L: number, corners = true) {
  b.add(WHITE, metricBox(L + 0.12, SOCLE, 0.12), M(m, mat(0, SOCLE / 2, 0.06)))
  b.add(WHITE, metricBox(L + 0.18, 0.22, 0.18), M(m, mat(0, 0.11, 0.12)))
  b.add(WHITE, metricBox(L + 0.14, BAND1 - BAND0, 0.14), M(m, mat(0, (BAND0 + BAND1) / 2, 0.07)))
  b.add(WHITE, metricBox(L + 0.2, 0.14, 0.2), M(m, mat(0, BAND1 - 0.07, 0.1)))
  b.add(WHITE, metricBox(L + 0.14, EAVE - 0.18 - TOPC, 0.14), M(m, mat(0, (TOPC + EAVE - 0.18) / 2, 0.07)))
  // framed frieze panel between the bands
  b.add(WHITE, metricBox(L - 1.2, 0.08, 0.06), M(m, mat(0, BAND1 + 0.18, 0.03)))
  b.add(WHITE, metricBox(L - 1.2, 0.08, 0.06), M(m, mat(0, TOPC - 0.18, 0.03)))
  if (corners) for (const s of [-1, 1]) b.add(WHITE, metricBox(0.42, EAVE - 0.18 - SOCLE, 0.12), M(m, mat(s * (L / 2 - 0.21), (SOCLE + EAVE - 0.18) / 2, 0.06)))
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- hall, lateral arms, apse ---------------- */
  b.block(WALL, XE - XW, EAVE, HW * 2, (XW + XE) / 2, 0, 0)
  const armW = ARM.x1 - ARM.x0
  const armX = (ARM.x0 + ARM.x1) / 2
  b.block(WALL, armW, EAVE, (HW + ARM.out) * 2, armX, 0, 0)
  // polygonal apse (stub + half octagon)
  const apse: [number, number][] = [
    [XE - 0.2, -AHW],
    [AC + K * AHW, -AHW],
    [AC + AHW, -K * AHW],
    [AC + AHW, K * AHW],
    [AC + K * AHW, AHW],
    [XE - 0.2, AHW],
  ]
  {
    const s = new THREE.Shape(apse.map(([x, z]) => new THREE.Vector2(x, -z)))
    b.add(WALL, extrude(s, EAVE), new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    const s2 = new THREE.Shape(apse.map(([x, z]) => new THREE.Vector2(x + (x > AC ? 0.06 : 0), -z * (1 + 0.06 / AHW))))
    b.add(WHITE, extrude(s2, SOCLE), new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    b.add(WHITE, extrude(s2, EAVE - 0.18 - TOPC), new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, TOPC, 0)))
    b.add(WHITE, extrude(s2, BAND1 - BAND0), new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, BAND0, 0)))
    // axial window
    frameWin(b, faceFrame('+x', AC + AHW, 0), 'round', 0.7, 1.8, 2.4)
    for (const sg of [-1, 1]) {
      const a = sg * 45 * D2R
      const ap = AHW
      frameWin(b, mat(AC + ap * Math.cos(a), 0, ap * Math.sin(a), Math.PI / 2 - a), 'rect', 0.45, 1.6, 2.6)
    }
  }

  /* ---------------- long sides (north photographed, south mirrored) ---------------- */
  for (const s of [-1, 1] as const) {
    const face = s > 0 ? '+z' : '-z'
    const at = (x: number, plane = s * HW) => faceFrame(face, plane, s > 0 ? x : -x)
    // west part of the side (porch + pronaos)
    const l1 = ARM.x0 - XW
    wallDress(b, at((XW + ARM.x0) / 2), l1)
    frameWin(b, at(XW + 1.35), 'round', 1.0, 3.0, 1.25, 0.16)
    frameWin(b, at(-6.3), 'rect', 0.42, 2.3, 1.75)
    frameWin(b, at(-4.6), 'rect', 0.42, 2.3, 1.75)
    // east part of the hall (between arm and apse)
    wallDress(b, at((ARM.x1 + XE) / 2), XE - ARM.x1)
    // lateral arm: outer face + west and east faces
    const pOut = s * (HW + ARM.out)
    wallDress(b, at(armX, pOut), armW)
    frameWin(b, at(armX, pOut), 'round', 0.8, 2.4, 2.0)
    const mW = faceFrame('-x', ARM.x0, s * (HW + ARM.out / 2))
    wallDress(b, mW, ARM.out, false)
    frameWin(b, mW, 'rect', 0.45, 1.6, 1.9)
    const mE = faceFrame('+x', ARM.x1, -s * (HW + ARM.out / 2))
    wallDress(b, mE, ARM.out, false)
    for (const x of [ARM.x0, ARM.x1]) b.add(WHITE, metricBox(0.42, EAVE - 0.18 - SOCLE, 0.42), mat(x, (SOCLE + EAVE - 0.18) / 2, s * (HW + ARM.out - 0.15)))
  }
  // east wall stubs beside the apse
  for (const s of [-1, 1]) b.add(WHITE, metricBox(0.14, EAVE - 0.18 - TOPC, HW - AHW), mat(XE + 0.07, (TOPC + EAVE - 0.18) / 2, s * (HW + AHW) / 2))

  /* ---------------- west front: enclosed three-arch porch ---------------- */
  {
    const m = faceFrame('-x', XW, 0)
    wallDress(b, m, HW * 2)
    const span = 2.25
    const pier = 0.55
    const spring = 3.05
    const us = [-(span + pier), 0, span + pier]
    // parapet (white) and rust-red columns at the piers
    b.add(WHITE, metricBox(3 * span + 2 * pier + 0.5, 1.0, 0.25), M(m, mat(0, 0.5 + 0.3, 0.12)))
    for (const u of us) {
      // arch opening: glazed, white archivolt
      b.add('obiGlass', new THREE.ShapeGeometry(new THREE.Shape(opening('round', span, spring + span / 2 - 1.3, u, 1.3, 14))), M(m, mat(0, 0, 0.03)))
      b.add(WHITE, extrude(frameShape('round', span, spring + span / 2 - 1.3, 0.3, u, 1.3), 0.2), m)
      // glazing bars
      for (const du of [-span / 4, span / 4]) b.add('obiBar', metricBox(0.05, spring - 1.3, 0.04), M(m, mat(u + du, (1.3 + spring) / 2, 0.06)))
      b.add('obiBar', metricBox(span, 0.05, 0.04), M(m, mat(u, spring, 0.06)))
    }
    for (const u of [-1.5 * span - pier, -span / 2 - pier / 2, span / 2 + pier / 2, 1.5 * span + pier]) {
      b.add('obiColumn', new THREE.CylinderGeometry(0.17, 0.19, spring - 1.3, 12), M(m, mat(u, (1.3 + spring) / 2, 0.12)))
      b.add(WHITE, metricBox(0.5, 0.18, 0.4), M(m, mat(u, spring + 0.05, 0.12)))
    }
    // central door (teal, glazed upper panels) in place of the middle parapet
    b.add('obiDoor', metricBox(1.35, 2.25, 0.08), M(m, mat(0, 0.15 + 1.125, 0.16)))
    b.add('obiGlass', metricBox(1.15, 0.9, 0.04), M(m, mat(0, 1.75, 0.21)))
    b.add(WHITE, metricBox(1.5, 0.6, 0.3), M(m, mat(0, 1.0, -0.02)))
    // entrance steps
    b.block(WHITE, 2.2, 0.15, 1.4, XW - 0.7, 0, 0)
    b.block(WHITE, 1.8, 0.15, 1.0, XW - 0.5, 0.15, 0)
  }

  /* ---------------- roofs (copper as supplied) ---------------- */
  const ye = EAVE - OV * Math.tan(PITCH)
  const roof = (cx: number, w: number, d: number) => {
    const r = hipRoof(cx, 0, w + 2 * OV, d + 2 * OV, ye, PITCH)
    for (const f of r.facets) facet(b, CU, f, { seams: SEAM, thickness: 0.12 })
    for (const [a, c] of r.lines) b.beam(CU, a.clone().add(V(0, 0.05, 0)), c.clone().add(V(0, 0.05, 0)), 0.18, 0.1)
    // dark timber fascia
    const ex = w / 2 + OV
    const ez = d / 2 + OV
    const cs = [V(cx - ex, ye - 0.12, -ez), V(cx + ex, ye - 0.12, -ez), V(cx + ex, ye - 0.12, ez), V(cx - ex, ye - 0.12, ez)]
    for (let i = 0; i < 4; i++) b.beam('obiFascia', cs[i], cs[(i + 1) % 4], 0.08, 0.26)
    return r.top
  }
  roof((XW + XE) / 2, XE - XW, HW * 2)
  roof(armX, armW, (HW + ARM.out) * 2)
  // apse: half-octagon hip, ridge running back into the main roof
  {
    const t = Math.tan(PITCH)
    const R = AHW + OV
    const apex = V(AC, ye + R * t, 0)
    const pts = [
      V(XE - 2.5, ye, -R),
      V(AC + K * R, ye, -R),
      V(AC + R, ye, -K * R),
      V(AC + R, ye, K * R),
      V(AC + K * R, ye, R),
      V(XE - 2.5, ye, R),
    ]
    const back = V(XE - 2.5, apex.y, 0)
    facet(b, CU, [pts[0], pts[1], apex, back], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [pts[4], pts[5], back, apex], { seams: SEAM, thickness: 0.12 })
    for (let i = 1; i < 4; i++) facet(b, CU, [pts[i], pts[i + 1], apex], { seams: SEAM, thickness: 0.12 })
    for (let i = 1; i < 5; i++) b.beam(CU, pts[i].clone().add(V(0, 0.05, 0)), apex.clone().add(V(0, 0.05, 0)), 0.16, 0.1)
    b.beam(CU, back.clone().add(V(0, 0.05, 0)), apex.clone().add(V(0, 0.05, 0)), 0.18, 0.1)
    for (let i = 0; i < 5; i++) b.beam('obiFascia', pts[i].clone().add(V(0, -0.12, 0)), pts[i + 1].clone().add(V(0, -0.12, 0)), 0.08, 0.26)
  }

  /* ---------------- west tower ---------------- */
  {
    const { x, hb, hu } = TW
    const yb = 7.0
    b.block(WALL, hb * 2, TW.baseTop - yb, hb * 2, x, yb, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? x + (face[0] === '+' ? hb : -hb) : face[0] === '+' ? hb : -hb
      const m = faceFrame(face, plane, face === '+z' ? x : face === '-z' ? -x : 0)
      for (const su of [-1, 1]) b.add(WHITE, metricBox(0.36, TW.baseTop - 8.4, 0.1), M(m, mat(su * (hb - 0.18), (8.4 + TW.baseTop) / 2, 0.05)))
      b.add(WHITE, metricBox(hb * 2 + 0.1, 0.2, 0.12), M(m, mat(0, TW.baseTop - 0.6, 0.06)))
    }
    b.block(WHITE, hb * 2 + 0.35, 0.25, hb * 2 + 0.35, x, TW.baseTop - 0.25, 0)
    // pyramidal skirt roof (copper) around the belfry stage
    {
      const o = hb + 0.45
      const yE = TW.baseTop - 0.05
      const yT = yE + (o - hu) * Math.tan(30 * D2R)
      const c1 = [V(x - o, yE, -o), V(x + o, yE, -o), V(x + o, yE, o), V(x - o, yE, o)]
      const c2 = [V(x - hu, yT, -hu), V(x + hu, yT, -hu), V(x + hu, yT, hu), V(x - hu, yT, hu)]
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        facet(b, CU, [c1[i], c1[j], c2[j], c2[i]], { seams: SEAM, thickness: 0.1 })
        b.beam(CU, c1[i], c2[i], 0.12, 0.08)
        b.beam('obiFascia', c1[i].clone().add(V(0, -0.1, 0)), c1[j].clone().add(V(0, -0.1, 0)), 0.07, 0.2)
      }
    }
    // belfry stage
    const y1 = TW.baseTop
    b.block(WALL, hu * 2, TW.upTop - y1, hu * 2, x, y1, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as const) {
      const plane = face.endsWith('x') ? x + (face[0] === '+' ? hu : -hu) : face[0] === '+' ? hu : -hu
      const m = faceFrame(face, plane, face === '+z' ? x : face === '-z' ? -x : 0)
      for (const su of [-1, 1]) b.add(WHITE, metricBox(0.3, TW.upTop - y1 - 0.3, 0.1), M(m, mat(su * (hu - 0.15), (y1 + TW.upTop - 0.3) / 2, 0.05)))
      frameWin(b, m, 'round', 0.5, 1.8, 12.75, 0.12)
      b.add(WHITE, new THREE.TorusGeometry(0.2, 0.06, 6, 18), M(m, mat(0, 15.1, 0.06)))
      b.add('glassC', new THREE.CircleGeometry(0.17, 18), M(m, mat(0, 15.1, 0.03)))
      b.add(WHITE, metricBox(hu * 2 + 0.1, 0.14, 0.12), M(m, mat(0, 12.5, 0.06)))
    }
    // deep cornice
    b.block(WHITE, hu * 2 + 0.3, 0.22, hu * 2 + 0.3, x, TW.upTop - 0.3, 0)
    b.block(WHITE, hu * 2 + 0.7, 0.3, hu * 2 + 0.7, x, TW.upTop - 0.08, 0)
    b.block('obiFascia', hu * 2 + 0.74, 0.08, hu * 2 + 0.74, x, TW.upTop + 0.22, 0)
    // octagonal bulbous cap
    const y0 = TW.upTop + 0.28
    const st: [number, number][] = [
      [1.9, y0],
      [1.75, y0 + 0.12],
      [1.55, y0 + 0.3],
      [1.62, y0 + 0.65],
      [1.52, y0 + 0.95],
      [1.2, y0 + 1.25],
      [0.72, y0 + 1.5],
      [0.25, y0 + 1.66],
      [0.08, y0 + 1.75],
    ]
    helm(b, CU, { x, z: 0, n: 8, stations: st })
    const rings = st.map(([r, yy]) => polyRing(8, r + 0.015, yy, Math.PI / 8, x, 0))
    for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 2; i++) b.beam(CU, rings[i][k], rings[i + 1][k], 0.06, 0.05)
    triCross(b, x, y0 + 1.75, 1.5)
  }

  /* ---------------- small drum over the naos ---------------- */
  {
    const { x, ap } = DRUM
    const R = ap / Math.cos(Math.PI / 8)
    const y0 = 8.4
    b.add(WALL, new THREE.CylinderGeometry(R, R, DRUM.top - y0, 8, 1, false, Math.PI / 8 - Math.PI / 2), mat(x, (y0 + DRUM.top) / 2, 0))
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4
      const m = mat(x + ap * Math.cos(a), 0, ap * Math.sin(a), Math.PI / 2 - a)
      if (j % 2 === 0) frameWin(b, m, 'round', 0.42, 1.3, 9.75, 0.1)
      b.add(WHITE, metricBox(0.16, DRUM.top - 9.2, 0.08), M(m, mat(ap * K - 0.05, (9.2 + DRUM.top) / 2, 0.02)))
    }
    b.add(WHITE, new THREE.CylinderGeometry(R + 0.3, R + 0.15, 0.32, 8, 1, false, Math.PI / 8 - Math.PI / 2), mat(x, DRUM.top - 0.05, 0))
    const y1 = DRUM.top + 0.12
    const st: [number, number][] = [
      [R + 0.35, y1],
      [R + 0.15, y1 + 0.15],
      [R + 0.05, y1 + 0.45],
      [R * 0.92, y1 + 0.85],
      [R * 0.7, y1 + 1.2],
      [R * 0.38, y1 + 1.48],
      [0.08, y1 + 1.6],
    ]
    helm(b, CU, { x, z: 0, n: 8, stations: st })
    const rings = st.map(([r, yy]) => polyRing(8, r + 0.015, yy, Math.PI / 8, x, 0))
    for (let k = 0; k < 8; k++) for (let i = 0; i < rings.length - 2; i++) b.beam(CU, rings[i][k], rings[i + 1][k], 0.06, 0.05)
    triCross(b, x, y1 + 1.6, 1.3)
  }

  return b
}

/** Triple-barred (patriarchal) cross with trefoil ends, as photographed. */
function triCross(b: Builder, x: number, y: number, s: number) {
  const t = 0.06
  b.add('helm', new THREE.SphereGeometry(0.1, 10, 8), mat(x, y + 0.06, 0))
  b.add('helm', metricBox(t, s, t), mat(x, y + s / 2, 0))
  for (const [yy, w] of [[0.5, 0.75], [0.72, 0.6], [0.88, 0.35]] as [number, number][]) {
    b.add('helm', metricBox(t, t, w * s * 0.75), mat(x, y + yy * s, 0))
    for (const sg of [-1, 1]) b.add('helm', new THREE.SphereGeometry(0.045, 6, 5), mat(x, y + yy * s, (sg * w * s * 0.75) / 2))
  }
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-2, 8.6, 3.2],
  materials: () => ({
    obiWall: new THREE.MeshStandardMaterial({ color: '#978a74', roughness: 0.95 }),
    obiFrame: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.7 }),
    obiFascia: new THREE.MeshStandardMaterial({ color: '#4a2e22', roughness: 0.8 }),
    obiColumn: new THREE.MeshStandardMaterial({ color: '#7c4b36', roughness: 0.8 }),
    obiDoor: new THREE.MeshStandardMaterial({ color: '#2f6c69', roughness: 0.6 }),
    obiGlass: new THREE.MeshStandardMaterial({ color: '#c9c6bd', roughness: 0.4, metalness: 0.1 }),
    obiBar: new THREE.MeshStandardMaterial({ color: '#3f6b5c', roughness: 0.6 }),
  }),
  notes: 'Two 2010 photographs of the west front and north side only: length, east end and south side inferred from the type; not mapped (apse assumed east). Roofs and caps shown in the copper supplied by COLOR METAL according to its records.',
}
export default model
