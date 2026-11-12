/**
 * Former Hotel Victoria, Satu Mare (Strada Horea 6, OSM way 705396484) —
 * Secession hotel of 1910: ground floor with large shop/café openings, two
 * upper floors, corner pavilions with swept attic gables and a steep roof
 * that originally carried a diamond-pattern covering.
 *
 * Modelling specification (real metres; +X = 106.1° = OSM long axis,
 * the street front on Strada Horea is the +X end, facing ESE):
 *  - Plan after the OSM outline: street block 12.4 × 26.2 m (x 7.9…20.3,
 *    z −13.1…13.0) and a 3-storey rear wing ≈28 × 15 m (skewed as in OSM).
 *  - Street façade (photos 01–03, 1909–1911 and a coloured postcard): six
 *    bays — 5.0 m corner pavilions with paired pilaster strips and a swept
 *    segmental attic gable, four middle bays of ≈4 m with three small curved
 *    attic gables between them; large shop openings on the ground floor,
 *    1st-floor windows with two small balconies in the bays next to the
 *    pavilions, 2nd-floor windows, ornamental frieze with square tiles,
 *    dentil cornice at ≈15.9 m (heights scaled from the 6.0 m pavilion width).
 *  - Roofs: steep hipped street roof (≈48°), hipped rear wing (≈35°).
 *  - COLOR METAL titanium-zinc: no current photograph was found, so the roofs
 *    are shown in elZinc Slate as supplied by COLOR METAL according to its
 *    records (2025): square diamond shingles on the street slope — the
 *    pattern seen in the 1909 photograph — and standing seam elsewhere, with
 *    zinc gutters and downpipes.
 * Approximations: only historic images of the street front exist; the rear
 * wing, courtyard and side elevations are interpreted from the outline;
 * ornament, ironwork and shop fronts simplified; heights estimated.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, window_, hippedRoof, hipRoof, seams, faceFrame, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZS = 'zincSlate'
const SEAM = seams(ZS, 0.5, 0.045, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const FB = { x0: 7.9, x1: 20.3, z0: -13.1, z1: 13.0 } // street block
const FZ = (FB.z0 + FB.z1) / 2
const REAR: [number, number][] = [
  [8.2, 6.16],
  [-20.32, 8.74],
  [-19.84, -6.56],
  [8.2, -8.2],
]
const RC = V(-5.94, 0, 0.04)

/* heights */
const GF = 5.8
const CORNICE = 15.9
const REAR_EAVE = 14.6

/** Diamond (square shingles laid on the diagonal) grid of shallow joints on a planar convex facet. */
function diamondGrid(b: Builder, key: string, pts: THREE.Vector3[], spacing: number) {
  const n = V().subVectors(pts[1], pts[0]).cross(V().subVectors(pts[2], pts[0])).normalize()
  if (n.y < 0) n.negate()
  const vdir = V(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize()
  const udir = V().crossVectors(vdir, n).normalize()
  const o = pts[0]
  const P = pts.map((p) => [V().subVectors(p, o).dot(udir), V().subVectors(p, o).dot(vdir)] as [number, number])
  const clip = (dx: number, dy: number, c: number): [number, number][] | null => {
    // line {p : p·(dy,-dx) = c} parametrised p = c*nrm + t*(dx,dy)
    const L = Math.hypot(dx, dy)
    const ux = dx / L
    const uy = dy / L
    const nx = uy
    const ny = -ux
    let t0 = -Infinity
    let t1 = Infinity
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i]
      const [bx, by] = P[(i + 1) % P.length]
      // inward normal of edge (polygon CCW or CW handled via centroid test)
      const ex = bx - ax
      const ey = by - ay
      let inx = -ey
      let iny = ex
      const cx = P.reduce((s, p) => s + p[0], 0) / P.length
      const cy = P.reduce((s, p) => s + p[1], 0) / P.length
      if ((cx - ax) * inx + (cy - ay) * iny < 0) {
        inx = -inx
        iny = -iny
      }
      // point(t) = (c*nx + t*ux, c*ny + t*uy); require (point - a)·in >= 0
      const base = (c * nx - ax) * inx + (c * ny - ay) * iny
      const slope = ux * inx + uy * iny
      if (Math.abs(slope) < 1e-9) {
        if (base < 0) return null
        continue
      }
      const t = -base / slope
      if (slope > 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
    }
    if (!(t1 - t0 > 0.05)) return null
    return [
      [c * nx + t0 * ux, c * ny + t0 * uy],
      [c * nx + t1 * ux, c * ny + t1 * uy],
    ]
  }
  const W = (p: [number, number]) => o.clone().add(udir.clone().multiplyScalar(p[0])).add(vdir.clone().multiplyScalar(p[1])).add(n.clone().multiplyScalar(0.03))
  const ext = P.reduce((m, p) => Math.max(m, Math.abs(p[0]) + Math.abs(p[1])), 0) + 1
  for (const [dx, dy] of [
    [1, 1],
    [1, -1],
  ]) {
    const step = spacing
    for (let c = -ext; c <= ext; c += step) {
      const s = clip(dx, dy, c)
      if (s) b.beam(key, W(s[0]), W(s[1]), 0.035, 0.035, n)
    }
  }
}

function bayWindows(b: Builder, face: Face, plane: number, u: number, w = 1.55) {
  window_(b, face, plane, u, 7.4, { w, h: 2.8, frame: 0.2, frameKey: 'hvTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 3] })
  window_(b, face, plane, u, 12.0, { w, h: 3.0, frame: 0.2, frameKey: 'hvTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 3] })
  const m = faceFrame(face, plane, u, 0, 0)
  // Secession ornament: small square tiles above the windows
  for (const du of [-0.45, 0, 0.45]) b.add('hvOrn', metricBox(0.28, 0.28, 0.06), M(m, mat(du, 10.75, 0.04, 0, 0, Math.PI / 4)))
  b.add('hvTrim', metricBox(w + 0.9, 0.2, 0.18), M(m, mat(0, 10.35, 0.09)))
}

function build(): Builder {
  const b = new Builder()
  const F = FB.x1 // street façade plane

  /* ================= volumes ================= */
  b.block('hvRender', FB.x1 - FB.x0, CORNICE, FB.z1 - FB.z0, (FB.x0 + FB.x1) / 2, 0, FZ)
  b.block('hvBase', FB.x1 - FB.x0 + 0.12, 0.6, FB.z1 - FB.z0 + 0.12, (FB.x0 + FB.x1) / 2, 0, FZ)
  {
    const ring = (y: number, g = 0) => REAR.map(([x, z]) => V(x - (x < 0 ? g : 0), y, z + (z > 0 ? g : -g)))
    b.add('hvRender', loft([ring(0), ring(REAR_EAVE)], { capTop: true, flat: true }))
    b.add('hvTrim', loft([ring(REAR_EAVE - 0.45, 0.3), ring(REAR_EAVE, 0.3)], { capTop: true, capBottom: true, flat: true }))
    b.add('hvBase', loft([ring(0, 0.06), ring(0.6, 0.06)], { capTop: true, flat: true }))
  }
  // corner pavilions project slightly on the street front
  const PW = 5.0
  const pav = [FB.z1 - PW / 2, FB.z0 + PW / 2]
  for (const z of pav) b.block('hvRender', 0.35, CORNICE, PW, F + 0.17, 0, z)
  // horizontal bands: ground-floor cornice, sill bands, frieze, main cornice with dentils
  const bandX = (y: number, h: number, g: number, key = 'hvTrim') => b.block(key, FB.x1 - FB.x0 + 2 * g + 0.35, h, FB.z1 - FB.z0 + 2 * g, (FB.x0 + FB.x1) / 2 + 0.17, y, FZ)
  bandX(GF, 0.45, 0.25)
  bandX(7.15, 0.14, 0.12)
  bandX(11.75, 0.14, 0.12)
  bandX(CORNICE - 1.2, 0.5, 0.1)
  bandX(CORNICE - 0.45, 0.45, 0.45)
  for (let z = FB.z0 + 0.3; z <= FB.z1 - 0.2; z += 0.55) b.block('hvTrim', 0.3, 0.22, 0.18, F + 0.5, CORNICE - 0.68, z)

  /* ================= street façade ================= */
  const midU0 = FB.z0 + PW
  const midU1 = FB.z1 - PW
  const bays: number[] = [] // façade u (= −z) of the six bays
  bays.push(-(FB.z1 - PW / 2))
  for (let i = 0; i < 4; i++) bays.push(-(midU1 - ((midU1 - midU0) * (i + 0.5)) / 4))
  bays.push(-(FB.z0 + PW / 2))
  bays.forEach((u, i) => {
    const pavBay = i === 0 || i === 5
    const plane = pavBay ? F + 0.35 : F
    // ground floor: large shop / café openings with dark frames
    const m = faceFrame('+x', plane, u, 0, 0)
    const w = pavBay ? 3.2 : 2.9
    b.add('hvShop', metricBox(w, 4.6, 0.08), M(m, mat(0, 0.6 + 2.3, 0.02)))
    b.add('glassC', metricBox(w - 0.3, 3.0, 0.04), M(m, mat(0, 0.75 + 1.5, 0.07)))
    b.add('hvShop', metricBox(w, 0.08, 0.1), M(m, mat(0, 3.4, 0.08)))
    b.add('hvTrim', metricBox(w + 0.4, 0.3, 0.2), M(m, mat(0, 5.35, 0.1)))
    bayWindows(b, '+x', plane, u, pavBay ? 1.75 : 1.55)
  })
  // pilaster strips between the bays (ground floor piers + upper lesenes)
  const piers = [-(FB.z1), -(FB.z1 - PW), ...[1, 2, 3].map((k) => -(midU1 - ((midU1 - midU0) * k) / 4)), -(FB.z0 + PW), -FB.z0]
  for (const u of piers) {
    const pavEdge = Math.abs(Math.abs(u) - Math.abs(FB.z1)) < 0.2 || Math.abs(u + FB.z0) < 0.2 || Math.abs(u + FB.z1 - PW) < 0.2 || Math.abs(u + FB.z0 + PW) < 0.2
    const plane = pavEdge ? F + 0.35 : F
    const m = faceFrame('+x', plane, u, 0, 0)
    b.add('hvTrim', metricBox(pavEdge ? 0.9 : 0.7, GF - 0.6, 0.2), M(m, mat(0, 0.6 + (GF - 0.6) / 2, 0.1)))
    if (pavEdge) {
      for (const du of [-0.22, 0.22]) b.add('hvTrim', metricBox(0.3, CORNICE - GF - 1.3, 0.14), M(m, mat(du, GF + 0.45 + (CORNICE - GF - 1.3) / 2, 0.07)))
      b.add('hvTrim', new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16), M(m, mat(0, CORNICE + 1.1, 0.1, 0, Math.PI / 2)))
    } else {
      b.add('hvTrim', metricBox(0.5, CORNICE - GF - 1.3, 0.08), M(m, mat(0, GF + 0.45 + (CORNICE - GF - 1.3) / 2, 0.04)))
      for (const yy of [8.7, 13.4]) b.add('hvOrn', metricBox(0.32, 0.32, 0.06), M(m, mat(0, yy, 0.1, 0, 0, Math.PI / 4)))
    }
  }
  // balconies in the bays next to the pavilions (first floor)
  for (const u of [bays[1], bays[4]]) {
    const m = faceFrame('+x', F, u, 0, 0)
    b.add('hvTrim', metricBox(2.4, 0.25, 0.9), M(m, mat(0, 7.15, 0.45)))
    b.add('hvTrim', metricBox(2.4, 0.9, 0.12), M(m, mat(0, 7.75, 0.86)))
    for (const s of [-1, 1]) b.add('hvTrim', metricBox(0.12, 0.9, 0.8), M(m, mat(s * 1.14, 7.75, 0.45)))
    b.add('hvOrn', metricBox(0.4, 0.4, 0.05), M(m, mat(0, 7.75, 0.93, 0, 0, Math.PI / 4)))
    for (const du of [-0.8, 0.8]) b.add('hvTrim', metricBox(0.25, 0.55, 0.6), M(m, mat(du, 6.8, 0.3)))
  }
  // swept attic gables on the pavilions
  for (const z of pav) {
    const s = new THREE.Shape()
    const hw = PW / 2 + 0.2
    s.moveTo(-hw, 0)
    s.lineTo(hw, 0)
    s.lineTo(hw, 2.4)
    s.quadraticCurveTo(hw - 0.2, 3.4, hw - 0.9, 3.6)
    s.absarc(0, 1.6, 2.25, Math.asin(2.0 / 2.25) - 0.3, Math.PI - Math.asin(2.0 / 2.25) + 0.3, false)
    s.quadraticCurveTo(-hw + 0.2, 3.4, -hw, 2.4)
    s.lineTo(-hw, 0)
    b.add('hvRender', extrude(s, 0.6, 16), M(mat(F + 0.35, CORNICE, z, Math.PI / 2), mat(0, 0, -0.6)))
    // moulded edge
    const rim = new THREE.Shape()
    rim.absarc(0, 1.6, 2.45, 0.25, Math.PI - 0.25, false)
    rim.absarc(0, 1.6, 2.2, Math.PI - 0.25, 0.25, true)
    b.add('hvGableCap', extrude(rim, 0.75, 16), M(mat(F + 0.4, CORNICE, z, Math.PI / 2), mat(0, 0, -0.75)))
    // window in the gable
    window_(b, '+x', F + 0.36, -z, CORNICE + 0.7, { type: 'round', w: 1.2, h: 2.2, frame: 0.14, frameKey: 'hvTrim', glassKey: 'glassC', inset: 0.04 })
  }
  // three small curved attic gables over the middle bays
  for (let k = 1; k <= 3; k++) {
    const z = midU1 - ((midU1 - midU0) * k) / 4
    const s = new THREE.Shape()
    s.moveTo(-1.5, 0)
    s.lineTo(1.5, 0)
    s.lineTo(1.5, 1.4)
    s.absarc(0, 0.5, 1.8, Math.asin(0.9 / 1.8), Math.PI - Math.asin(0.9 / 1.8), false)
    s.lineTo(-1.5, 0)
    b.add('hvRender', extrude(s, 0.5, 12), M(mat(F - 0.1, CORNICE, z, Math.PI / 2), mat(0, 0, -0.5)))
    const rim = new THREE.Shape()
    rim.absarc(0, 0.5, 1.95, 0.5, Math.PI - 0.5, false)
    rim.absarc(0, 0.5, 1.78, Math.PI - 0.5, 0.5, true)
    b.add('hvGableCap', extrude(rim, 0.6, 12), M(mat(F - 0.05, CORNICE, z, Math.PI / 2), mat(0, 0, -0.6)))
    b.add('glassC', metricBox(0.04, 1.1, 1.2), mat(F - 0.07, CORNICE + 1.1, z))
  }

  /* ================= other elevations (interpreted) ================= */
  // street block sides (±Z): three bays
  for (const [f, pl] of [
    ['+z', FB.z1],
    ['-z', FB.z0],
  ] as [Face, number][]) {
    for (const x of [10.6, 14.1, 17.6]) {
      const u = f === '+z' ? x : -x
      window_(b, f, pl, u, 1.6, { w: 1.4, h: 2.6, frame: 0.18, frameKey: 'hvTrim', glassKey: 'glassC', inset: 0.05, sill: true, bars: [2, 2] })
      bayWindows(b, f, pl, u, 1.4)
    }
  }
  // rear wing: three storeys of plain windows on both long sides and the end
  {
    const longSides: [THREE.Vector3, THREE.Vector3][] = [
      [V(REAR[0][0], 0, REAR[0][1]), V(REAR[1][0], 0, REAR[1][1])],
      [V(REAR[2][0], 0, REAR[2][1]), V(REAR[3][0], 0, REAR[3][1])],
      [V(REAR[1][0], 0, REAR[1][1]), V(REAR[2][0], 0, REAR[2][1])],
    ]
    for (const [a, c] of longSides) {
      const d = V().subVectors(c, a)
      const L = d.length()
      d.normalize()
      const out = V(d.z, 0, -d.x)
      const mid = a.clone().lerp(c, 0.5)
      if (out.dot(V().subVectors(mid, RC)) < 0) out.negate()
      const ry = Math.atan2(out.x, out.z)
      const n = Math.max(2, Math.floor(L / 3.6))
      for (let i = 0; i < n; i++) {
        const p = a.clone().add(d.clone().multiplyScalar((L * (i + 0.5)) / n))
        for (const y0 of [1.4, 6.1, 10.4]) {
          const m = mat(p.x + out.x * 0.05, 0, p.z + out.z * 0.05, ry)
          b.add('glassC', metricBox(1.3, 2.4, 0.04), M(m, mat(0, y0 + 1.2, 0)))
          b.add('hvTrim', metricBox(1.6, 0.14, 0.24), M(m, mat(0, y0 - 0.07, 0.08)))
        }
      }
    }
  }

  /* ================= roofs (elZinc Slate, after COLOR METAL's records) ================= */
  {
    const pitch = 48
    const ov = 0.4
    const t = Math.tan(pitch * D2R)
    const r = hipRoof((FB.x0 + FB.x1) / 2, FZ, FB.x1 - FB.x0 + 2 * ov, FB.z1 - FB.z0 + 2 * ov, CORNICE - ov * t, pitch * D2R)
    for (const f of r.facets) {
      // street slope (normal towards +X): square diamond shingles; other slopes standing seam
      const nrm = V().subVectors(f[1], f[0]).cross(V().subVectors(f[2], f[0])).normalize()
      if (nrm.y < 0) nrm.negate()
      if (nrm.x > 0.5) {
        facet(b, ZS, f, { thickness: 0.12 })
        diamondGrid(b, 'hvZincJoint', f, 0.4)
      } else facet(b, ZS, f, { seams: SEAM, thickness: 0.12 })
    }
    for (const [a, c] of r.lines) b.beam(ZS, a.clone().setY(a.y + 0.05), c.clone().setY(c.y + 0.05), 0.24, 0.14)
    // chimneys (photo 01)
    for (const [x, z] of [
      [12.5, -9.5],
      [12.5, -2.0],
      [12.5, 5.5],
      [16.0, 10.5],
    ]) {
      b.block('hvRender', 0.8, 2.6, 1.2, x, r.top - 1.6, z)
      b.block('hvTrim', 1.0, 0.2, 1.4, x, r.top + 1.0, z)
    }
  }
  // rear wing roof
  {
    const g = new Builder()
    hippedRoof(g, ZS, { w: 28.4, d: 14.8, y: REAR_EAVE, pitch: 35, overhang: 0.4, seams: SEAM })
    b.merge(g, mat(-5.94, 0, 0.04, 0.0743))
  }
  // gutters & downpipes
  b.beam(ZS, V(F + 0.5, CORNICE - 0.15, FB.z0), V(F + 0.5, CORNICE - 0.15, FB.z1), 0.2, 0.18)
  for (const z of [FB.z0 + 0.25, FB.z1 - 0.25]) b.rod(ZS, V(F + 0.55, 0.3, z), V(F + 0.55, CORNICE - 0.2, z), 0.065, 8)

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [17.5, 18.5, 0],
  materials: (base) => {
    const joint = (base.zincSlate as THREE.MeshStandardMaterial).clone()
    joint.color = new THREE.Color('#9fa3a8')
    return {
      hvZincJoint: joint,
      hvRender: new THREE.MeshStandardMaterial({ color: '#e9dfbf', roughness: 0.9 }),
      hvTrim: new THREE.MeshStandardMaterial({ color: '#f3ecd6', roughness: 0.85 }),
      hvBase: new THREE.MeshStandardMaterial({ color: '#b8ae98', roughness: 0.9 }),
      hvShop: new THREE.MeshStandardMaterial({ color: '#3b2f27', roughness: 0.7 }),
      hvOrn: new THREE.MeshStandardMaterial({ color: '#5f7d74', roughness: 0.7 }),
      hvGableCap: (base.zincSlate as THREE.MeshStandardMaterial).clone(),
    }
  },
  notes:
    'Secession former hotel with corner pavilions and swept attic gables; the roofs are shown in elZinc Slate (diamond shingles on the street slope, standing seam elsewhere) after COLOR METAL records, since only historic photographs were available.',
}
export default model
