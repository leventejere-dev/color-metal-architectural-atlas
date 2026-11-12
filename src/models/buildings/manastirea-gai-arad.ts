/**
 * Mănăstirea „Sf. Simeon Stâlpnicul” Arad-Gai — the new church (OSM way
 * 1070339700, unnamed place of worship east of the 18th-century complex).
 * Copper per the COLOR METAL records (2021).
 *
 * Modelling specification (real metres; origin = OSM bbox centre at ground,
 * +X = 35.5° (NE) = direction of the straight OSM side walls, towards the altar;
 * +Z = 125.5°; the open porch faces −X / south-west, towards the gate tower).
 * Sources: two drone photographs by the Arad tourist information centre (01, 02:
 * the church seen from above the gate tower, i.e. from the south) and the OSM
 * outline (52.6 × 25.7 m). The outline is traced along the broad roof eaves
 * (≈ 2 m), so the walls are set ≈ 2 m inside it; its rounded south-west end is
 * not confirmed by the photographs, which show a straight porch front.
 *  - Body 48 × 14 m (walls ≈ 10 m) with a gallery frieze of small arched
 *    niches under the eaves, tall slender blind arcades on the side walls.
 *  - Open porch at the south-west end: three tall round arches on the front,
 *    one on each side, frescoed interior, semicircular front steps (01, 02).
 *  - Roofs: a tall bell-cast hipped roof over the porch, narthex and pronaos
 *    (≈ 48° with a flared ≈ 2 m eave), a lower bell-cast roof over the naos and
 *    the altar; lateral conchs as round turrets with tall conical roofs and
 *    crosses (the "small spires" of 01, 02).
 *  - Tower over the naos: square base with blind arcades and a skirt roof,
 *    octagonal drum with arched windows and an arcade frieze, flared eave and a
 *    tall octagonal spire with a gilded cross (01, 02).
 *  - METAL: the photographs show dark brown metal roofs, consistent with
 *    weathered copper; all roofs, the spire and the conch cones are modelled in
 *    copperBrown (standing seams ≈ 0.5 m).
 * Approximations: heights estimated from the drone views (eave ≈ 10 m, cross
 * ≈ 40 m); the north-west side and the altar end are not photographed (flat
 * east end after OSM, north side mirrored); ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, extrude, opening, frameShape, facet, hipRoof, loft, polyRing, prism, ringBand, seams, faceFrame } from '../kit'
import type { Face, OpeningType } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'plasterWhite'
const TRIM = 'stoneLight'
const SOFF = 'soffit'
const SEAM = seams(CU, 0.5, 0.045, 0.045)
const D2R = Math.PI / 180

const BODY = { x0: -24.0, x1: 24.0, hw: 7.0, top: 10.0 }
const XF = 4.0 // end of the tall front roof
const PORCH = { x1: -20.2, imp: 4.6 }
const CONCH = { x: 12.0, z: 8.6, r: 3.5, top: 9.4, coneH: 8.6 }
const TOWER = { x: 12.0, base: 7.4, yb: 17.6, r: 3.3, yd: 25.0, spire: 13.5 }

const mul = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const wallAt = (x: number, z: number, a: number) => mat(x, 0, z, Math.PI / 2 - a)

function op(b: Builder, m: THREE.Matrix4, o: { w: number; h: number; y0: number; u?: number; type?: OpeningType; glass?: string; frame?: number; frameKey?: string; off?: number }) {
  const type = o.type ?? 'round'
  const u = o.u ?? 0
  const f = o.frame ?? 0.12
  const off = o.off ?? 0
  b.add(o.glass ?? 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening(type, o.w, o.h, u, o.y0, 10))), mul(m, mat(0, 0, off + 0.02)))
  if (f > 0) b.add(o.frameKey ?? TRIM, extrude(frameShape(type, o.w, o.h, f, u, o.y0), 0.1, 8), mul(m, mat(0, 0, off)))
}

/**
 * Bell-cast roof over a wall rectangle: upper slopes at p1, a flatter flared
 * eave (p2, overhang ov) with a dark timber soffit. hipW/hipE: hipped upper
 * ends (otherwise the slopes run on to x0/x1, e.g. into a taller roof);
 * flareW/flareE: flared eave across that end (otherwise the side eaves stop at
 * fx0/fx1).
 */
function bellRoof(b: Builder, o: { x0: number; x1: number; hw: number; y: number; p1: number; p2: number; ov: number; hipW?: boolean; hipE?: boolean; flareW?: boolean; flareE?: boolean; fx0?: number; fx1?: number }) {
  const t1 = Math.tan(o.p1 * D2R)
  const t2 = Math.tan(o.p2 * D2R)
  const { x0, x1, hw, y, ov } = o
  const wh = o.hipW ?? true
  const eh = o.hipE ?? true
  const fw = o.flareW ?? wh
  const fe = o.flareE ?? eh
  const he = hw + ov
  const yF = y - ov * t2
  const yR = y + hw * t1
  const dn = V(0, -0.15, 0)
  if (wh && eh) {
    const r = hipRoof((x0 + x1) / 2, 0, x1 - x0, 2 * hw, y, o.p1 * D2R)
    for (const f of r.facets) facet(b, CU, f, { seams: SEAM, thickness: 0.1 })
    for (const [a, c] of r.lines) b.rod(CU, a.clone().add(V(0, 0.05, 0)), c.clone().add(V(0, 0.05, 0)), 0.07)
  } else {
    const xa = wh ? x0 + hw : x0
    const xb = eh ? x1 - hw : x1
    for (const s of [-1, 1]) {
      facet(b, CU, [V(x0, y, s * hw), V(x1, y, s * hw), V(xb, yR, 0), V(xa, yR, 0)], { seams: SEAM, thickness: 0.1 })
      if (wh) b.rod(CU, V(x0, y + 0.05, s * hw), V(xa, yR + 0.05, 0), 0.07)
      if (eh) b.rod(CU, V(x1, y + 0.05, s * hw), V(xb, yR + 0.05, 0), 0.07)
    }
    if (wh) facet(b, CU, [V(x0, y, -hw), V(x0, y, hw), V(xa, yR, 0)], { seams: SEAM, thickness: 0.1 })
    if (eh) facet(b, CU, [V(x1, y, hw), V(x1, y, -hw), V(xb, yR, 0)], { seams: SEAM, thickness: 0.1 })
    b.rod(CU, V(xa, yR + 0.06, 0), V(xb, yR + 0.06, 0), 0.08)
  }
  const ia = fw ? x0 : o.fx0 ?? x0
  const ib = fe ? x1 : o.fx1 ?? x1
  const sa = fw ? x0 - ov : ia
  const sb = fe ? x1 + ov : ib
  const q: THREE.Vector3[][] = []
  for (const s of [-1, 1]) q.push([V(sa, yF, s * he), V(sb, yF, s * he), V(ib, y, s * hw), V(ia, y, s * hw)])
  if (fw) q.push([V(sa, yF, he), V(sa, yF, -he), V(x0, y, -hw), V(x0, y, hw)])
  if (fe) q.push([V(sb, yF, -he), V(sb, yF, he), V(x1, y, hw), V(x1, y, -hw)])
  for (const p of q) {
    facet(b, CU, p, { seams: SEAM, thickness: 0.08 })
    facet(b, SOFF, p.map((v) => v.clone().add(dn)), { hint: V(0, -1, 0), thickness: 0.03 })
  }
  for (const s of [-1, 1]) {
    if (fw) b.rod(CU, V(sa, yF + 0.05, s * he), V(x0, y + 0.05, s * hw), 0.06)
    if (fe) b.rod(CU, V(sb, yF + 0.05, s * he), V(x1, y + 0.05, s * hw), 0.06)
    b.beam(CU, V(sa, yF - 0.08, s * (he + 0.03)), V(sb, yF - 0.08, s * (he + 0.03)), 0.1, 0.2)
  }
  if (fw) b.beam(CU, V(sa - 0.03, yF - 0.08, -he), V(sa - 0.03, yF - 0.08, he), 0.1, 0.2)
  if (fe) b.beam(CU, V(sb + 0.03, yF - 0.08, -he), V(sb + 0.03, yF - 0.08, he), 0.1, 0.2)
  return yR
}

/** Gallery frieze of small arched niches (alternately dark and painted). */
function niches(b: Builder, face: Face, plane: number, u0: number, u1: number, y0: number, w = 0.55, h = 0.85) {
  const n = Math.max(1, Math.floor((u1 - u0) / (w + 0.3)))
  const step = (u1 - u0) / n
  const m = faceFrame(face, plane, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const u = u0 + step * (i + 0.5)
    b.add(i % 3 === 1 ? 'fresco' : 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, u, y0, 8))), mul(m, mat(0, 0, 0.02)))
    b.add(TRIM, extrude(frameShape('round', w, h, 0.08, u, y0), 0.06, 6), m)
  }
}

/** Tall slender blind arches on a wall. */
function blindArcade(b: Builder, face: Face, plane: number, us: number[], y0: number, w: number, h: number) {
  const m = faceFrame(face, plane, 0, 0, 0)
  for (const u of us) b.add(WALL, extrude(frameShape('round', w, h, 0.14, u, y0), 0.1, 8), mul(m, mat(0, 0, 0.01)))
}

function cross(b: Builder, x: number, y: number, z: number, s: number, key = 'gilt') {
  const g = new Builder()
  const t = s * 0.06
  g.add(key, new THREE.SphereGeometry(s * 0.1, 12, 8), mat(0, s * 0.06, 0))
  g.add(key, metricBox(t, s, t), mat(0, s * 0.55, 0))
  g.add(key, metricBox(s * 0.62, t, t), mat(0, s * 0.72, 0))
  for (const sx of [-1, 1]) g.add(key, new THREE.SphereGeometry(t * 1.3, 8, 6), mat(sx * s * 0.31, s * 0.72, 0))
  g.add(key, new THREE.SphereGeometry(t * 1.3, 8, 6), mat(0, s * 1.05, 0))
  b.merge(g, mat(x, y, z, Math.PI / 2))
}

function build(): Builder {
  const b = new Builder()
  const { x0, x1, hw, top } = BODY

  /* ---------------- body walls ---------------- */
  const xm = (x0 + x1) / 2
  b.block(WALL, x1 - PORCH.x1, top, 2 * hw, (PORCH.x1 + x1) / 2, 0, 0)
  b.block('socle', x1 - x0 + 0.3, 0.6, 2 * hw + 0.3, xm, 0, 0)
  b.box(TRIM, x1 - x0 + 0.25, 0.18, 2 * hw + 0.25, xm, 8.15, 0)
  b.box(WALL, x1 - x0 + 0.4, 0.3, 2 * hw + 0.4, xm, top - 0.45, 0)
  for (const s of [-1, 1]) {
    const face: Face = s > 0 ? '+z' : '-z'
    const plane = s * hw
    const u0 = s > 0 ? x0 + 0.3 : -x1 + 0.3
    const u1 = s > 0 ? x1 - 0.3 : -x0 - 0.3
    niches(b, face, plane, u0, u1, 8.45)
    const us: number[] = []
    for (let x = PORCH.x1 + 1.6; x < x1 - 0.8; x += 2.1) if (Math.abs(x - CONCH.x) > CONCH.r + 0.9) us.push(s * x)
    blindArcade(b, face, plane, us, 1.2, 1.2, 6.3)
    for (const x of [-16.5, -10.2, -3.9, 2.4, 19.2]) op(b, faceFrame(face, plane, s * x, 0, 0), { w: 0.7, h: 2.6, y0: 3.4, off: 0.02 })
  }
  niches(b, '+x', x1, -hw + 0.3, hw - 0.3, 8.45)
  blindArcade(b, '+x', x1, [-4.2, -2.1, 0, 2.1, 4.2], 1.2, 1.2, 6.3)
  op(b, faceFrame('+x', x1, 0, 0, 0), { w: 0.8, h: 2.8, y0: 3.4, off: 0.02 })

  /* ---------------- open porch (south-west) ---------------- */
  {
    const px1 = PORCH.x1
    const imp = PORCH.imp
    // front arcade: three tall arches
    const pts: THREE.Vector2[] = [new THREE.Vector2(-hw, 0.6)]
    const arches: [number, number][] = [[-4.1, 3.1], [0, 3.3], [4.1, 3.1]]
    for (const [c, w] of arches) {
      pts.push(new THREE.Vector2(c - w / 2, 0.6), new THREE.Vector2(c - w / 2, imp))
      for (let i = 1; i < 14; i++) {
        const a = Math.PI - (i / 14) * Math.PI
        pts.push(new THREE.Vector2(c + Math.cos(a) * (w / 2), imp + Math.sin(a) * (w / 2)))
      }
      pts.push(new THREE.Vector2(c + w / 2, imp), new THREE.Vector2(c + w / 2, 0.6))
    }
    pts.push(new THREE.Vector2(hw, 0.6), new THREE.Vector2(hw, top), new THREE.Vector2(-hw, top))
    const fm = faceFrame('-x', x0, 0, 0, 0)
    b.add(WALL, extrude(new THREE.Shape(pts), 0.7, 4), mul(fm, mat(0, 0, -0.7)))
    for (const [c, w] of arches) {
      b.add(TRIM, extrude(frameShape('round', w, imp - 0.6 + w / 2, 0.16, c, 0.6), 0.08, 8), mul(fm, mat(0, 0, 0.01)))
      for (const s of [-1, 1]) {
        const z = c + s * (w / 2 - 0.25)
        b.add(TRIM, new THREE.CylinderGeometry(0.2, 0.22, imp - 1.0, 12), mat(x0 - 0.1, 0.6 + (imp - 1.0) / 2 + 0.15, z))
        b.add(TRIM, metricBox(0.55, 0.3, 0.55), mat(x0 - 0.1, imp - 0.1, z))
        b.add(TRIM, metricBox(0.55, 0.3, 0.55), mat(x0 - 0.1, 0.75, z))
      }
    }
    // side arches
    for (const s of [-1, 1]) {
      const face: Face = s > 0 ? '+z' : '-z'
      const sp: THREE.Vector2[] = []
      const c = s * ((x0 + 0.7 + px1) / 2)
      const w = 2.2
      const ua = s > 0 ? x0 : -px1
      const ub = s > 0 ? px1 : -x0
      sp.push(new THREE.Vector2(ua, 0.6), new THREE.Vector2(c - w / 2, 0.6), new THREE.Vector2(c - w / 2, imp))
      for (let i = 1; i < 14; i++) {
        const a = Math.PI - (i / 14) * Math.PI
        sp.push(new THREE.Vector2(c + Math.cos(a) * (w / 2), imp + Math.sin(a) * (w / 2)))
      }
      sp.push(new THREE.Vector2(c + w / 2, imp), new THREE.Vector2(c + w / 2, 0.6), new THREE.Vector2(ub, 0.6), new THREE.Vector2(ub, top), new THREE.Vector2(ua, top))
      const m = faceFrame(face, s * hw, 0, 0, 0)
      b.add(WALL, extrude(new THREE.Shape(sp), 0.6, 4), mul(m, mat(0, 0, -0.6)))
      b.add(TRIM, extrude(frameShape('round', w, imp - 0.6 + w / 2, 0.14, c, 0.6), 0.08, 8), mul(m, mat(0, 0, 0.01)))
    }
    // frescoed interior, door, platform with semicircular steps
    b.box('fresco', px1 - x0 - 1.2, 0.2, 2 * hw - 1.2, (x0 + px1) / 2 + 0.3, imp + 1.8, 0)
    b.add('fresco', metricBox(0.05, imp + 1.0, 2 * hw - 1.3), mat(px1 - 0.03, 0.6 + (imp + 1.0) / 2, 0))
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.8, 3.4, 0, 0.6, 10))), faceFrame('-x', px1 - 0.06, 0, 0, 0))
    b.block(TRIM, px1 - x0, 0.6, 2 * hw, (x0 + px1) / 2, 0, 0)
    for (let k = 1; k <= 3; k++) {
      const r = 3.6 + k * 0.5
      b.add(TRIM, new THREE.CylinderGeometry(r, r, 0.6 - k * 0.15, 32, 1, false, Math.PI, Math.PI), mat(x0, (0.6 - k * 0.15) / 2, 0))
    }
  }

  /* ---------------- conch turrets ---------------- */
  for (const s of [-1, 1]) {
    const { x: cx, r, top: ct, coneH } = CONCH
    const cz = s * CONCH.z
    prism(b, WALL, { x: cx, z: cz, n: 32, r, y0: 0, h: ct })
    ringBand(b, 'socle', { x: cx, z: cz, n: 32, r, y: 0, h: 0.6, grow: 0.15 })
    ringBand(b, TRIM, { x: cx, z: cz, n: 32, r, y: 7.95, h: 0.18, grow: 0.1 })
    ringBand(b, WALL, { x: cx, z: cz, n: 32, r, y: ct - 0.4, h: 0.3, grow: 0.2 })
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2
      if (Math.sin(a) * s < -0.3) continue
      const m = wallAt(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a)
      b.add(k % 3 === 1 ? 'fresco' : 'glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.5, 0.8, 0, 8.3, 8))), mul(m, mat(0, 0, 0.04)))
      if (k % 2 === 0) op(b, m, { w: 0.55, h: 2.0, y0: 3.6, off: 0.03 })
    }
    // flared conical roof
    const ro = r + 1.3
    b.add(SOFF, loft([polyRing(32, ro - 0.05, ct - 0.42), polyRing(32, r + 0.05, ct - 0.02)].map((ring) => ring.map((p) => p.add(V(cx, 0, cz)))), { flat: false }))
    const prof: [number, number][] = [[ro, ct - 0.35], [ro - 0.05, ct - 0.25], [r, ct + 0.25], [r * 0.55, ct + coneH * 0.5], [0.05, ct + coneH]]
    b.add(CU, new THREE.LatheGeometry(prof.map(([rr, y]) => new THREE.Vector2(rr, y)), 32), mat(cx, 0, cz))
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      const d = V(Math.cos(a), 0, Math.sin(a))
      for (let i = 0; i < prof.length - 2; i++) b.beam(CU, V(cx + d.x * (prof[i][0] + 0.02), prof[i][1] + 0.03, cz + d.z * (prof[i][0] + 0.02)), V(cx + d.x * (prof[i + 1][0] + 0.02), prof[i + 1][1] + 0.03, cz + d.z * (prof[i + 1][0] + 0.02)), 0.04, 0.04)
    }
    cross(b, cx, ct + coneH - 0.1, cz, 1.4)
  }

  /* ---------------- roofs ---------------- */
  bellRoof(b, { x0, x1: XF, hw, y: top, p1: 48, p2: 20, ov: 2.0, flareE: false })
  bellRoof(b, { x0: -1.0, x1, hw, y: top, p1: 34, p2: 20, ov: 2.0, hipW: false, fx0: XF })

  /* ---------------- naos tower ---------------- */
  {
    const { x: tx, base, yb, r, yd, spire } = TOWER
    b.block(WALL, base, yb - 9.0, base, tx, 9.0, 0)
    b.box(WALL, base + 0.4, 0.3, base + 0.4, tx, yb - 0.35, 0)
    for (const face of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = face.endsWith('x') ? tx + (face[0] === '+' ? base / 2 : -base / 2) : face[0] === '+' ? base / 2 : -base / 2
      const off = face.endsWith('x') ? 0 : face === '+z' ? tx : -tx
      const m = faceFrame(face, plane, 0, 0, 0)
      for (let i = 0; i < 7; i++) {
        const u = off - base / 2 + 0.55 + (i * (base - 1.1)) / 6
        b.add(i % 2 ? 'glassC' : 'fresco', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.45, 1.0, u, yb - 1.8, 8))), mul(m, mat(0, 0, 0.02)))
        b.add(TRIM, extrude(frameShape('round', 0.45, 1.0, 0.07, u, yb - 1.8), 0.05, 6), m)
      }
    }
    bellRoof(b, { x0: tx - base / 2, x1: tx + base / 2, hw: base / 2, y: yb, p1: 30, p2: 18, ov: 0.6 })
    const dy0 = yb + 0.4
    prism(b, WALL, { x: tx, n: 8, r, y0: dy0 - 0.8, h: yd - dy0 + 0.8 })
    ringBand(b, TRIM, { x: tx, n: 8, r, y: dy0 + 0.2, h: 0.2, grow: 0.1 })
    ringBand(b, TRIM, { x: tx, n: 8, r, y: yd - 1.75, h: 0.16, grow: 0.08 })
    ringBand(b, WALL, { x: tx, n: 8, r, y: yd - 0.35, h: 0.35, grow: 0.18 })
    const ap = r * Math.cos(Math.PI / 8)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      const m = wallAt(tx + Math.cos(a) * ap, Math.sin(a) * ap, a)
      op(b, m, { w: 0.55, h: 2.6, y0: dy0 + 0.7, off: 0.01 })
      b.add(WALL, extrude(frameShape('round', 1.5, 3.9, 0.12, 0, dy0 + 0.45), 0.08, 8), mul(m, mat(0, 0, 0.01)))
      for (const u of [-0.55, 0, 0.55]) {
        b.add(TRIM, extrude(frameShape('round', 0.36, 0.7, 0.06, u, yd - 1.45), 0.05, 6), mul(m, mat(0, 0, 0.01)))
      }
    }
    // flared eave + tall octagonal spire
    const R0 = r + 1.25
    b.add(SOFF, loft([polyRing(8, R0 - 0.05, yd - 0.12, Math.PI / 8, tx, 0), polyRing(8, r + 0.02, yd + 0.15, Math.PI / 8, tx, 0)], { flat: true }))
    const st: [number, number][] = [[R0, yd - 0.05], [R0 - 0.1, yd + 0.08], [r + 0.15, yd + 0.85], [r * 0.82, yd + 2.0], [0.32, yd + spire - 0.6], [0.06, yd + spire]]
    b.add(CU, loft(st.map(([rr, y]) => polyRing(8, rr, y, Math.PI / 8, tx, 0)), { capBottom: true, capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const c = Math.PI / 8 + (k * Math.PI) / 4
      for (let i = 0; i < st.length - 1; i++) {
        b.rod(CU, V(tx + Math.cos(c) * st[i][0], st[i][1] + 0.03, Math.sin(c) * st[i][0]), V(tx + Math.cos(c) * st[i + 1][0], st[i + 1][1] + 0.03, Math.sin(c) * st[i + 1][0]), 0.05, 4)
      }
      // standing seams on each spire face (parallel to the face centre line)
      const c0 = Math.PI / 8 + (k * Math.PI) / 4
      const c1 = c0 + Math.PI / 4
      for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        const pa = (i: number) => {
          const ax = Math.cos(c0) * (1 - f) + Math.cos(c1) * f
          const az = Math.sin(c0) * (1 - f) + Math.sin(c1) * f
          return V(tx + ax * st[i][0] * 1.005, st[i][1] + 0.02, az * st[i][0] * 1.005)
        }
        for (let i = 1; i < st.length - 2; i++) b.beam(CU, pa(i), pa(i + 1), 0.04, 0.035)
      }
    }
    b.add('gilt', new THREE.SphereGeometry(0.28, 12, 8), mat(tx, yd + spire + 0.15, 0))
    cross(b, tx, yd + spire + 0.3, 0, 2.6)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-12, 14, 5],
  materials: () => ({
    fresco: new THREE.MeshStandardMaterial({ color: '#8d6a48', roughness: 0.85 }),
    soffit: new THREE.MeshStandardMaterial({ color: '#4c3a2e', roughness: 0.8 }),
  }),
  notes:
    'New church interpreted from two drone photographs and the OSM outline (traced along the eaves); heights estimated, north-west side and altar end interpreted. Dark brown roofs as photographed, in copper per the 2021 project record.',
}
export default model
