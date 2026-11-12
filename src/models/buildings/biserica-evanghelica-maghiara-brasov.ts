/**
 * Biserica Evanghelică Maghiară, Brașov (Brassói magyar evangélikus templom),
 * Str. Iuliu Maniu 2 — church of 1783 (date laid in the roof tiles), OSM way
 * 272913008.
 *
 * Modelling specification (real metres). +X = OSM long axis 130.1° towards the
 * rounded (apse) end; +Z = 220° (south-west, porch side).
 *  - Plan after the OSM outline: 24.5 × 12.0 m single-nave hall whose east end
 *    is closed by three sides of an octagon (east face 5 m at x = 12.3, oblique
 *    faces from x = 8.8); slender west tower 4.4 m square set in the middle of
 *    the west front; small south porch with a baroque segmental pediment; small
 *    hipped sacristy on the north side near the tower (photo 02).
 *  - Heights from photo 01 (tower width and the 24.5 m length as the scale):
 *    eave ≈6.8 m with a profiled white cornice; nave roof ≈47° (ridge ≈13.2 m)
 *    with a hipped east end standing above the lower hipped apse roof (≈40°,
 *    apex ≈11.8 m) — two crosses on the roof (photos 01, 02); tower cornice
 *    ≈15.6 m (≈2.3 m above the ridge), green louvred belfry lantern to
 *    ≈17.6 m, bell-cast spire to ≈24 m, ball, rod and cross to ≈27 m.
 *  - Façades: cream render with white Ionic pilasters (paired at the corners),
 *    tall round-arched windows, an oculus above the porch, profiled cornice.
 *  - METAL (client rule): COLOR METAL's records list copper strip (2025) for
 *    the buildings of the parish ensemble; the available photographs (2014,
 *    2017) show red clay tiles, so the nave, apse, porch and sacristy roofs and
 *    the tower spire are shown in new copper with standing seams (0.5 m), copper
 *    gutters and downpipes. Which roofs the copper covers (the ensemble also
 *    includes a new parish centre) is not documented.
 * Approximations: heights, the west front and the north side (not or only
 * partly photographed), pilaster capitals simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, faceFrame, seams, cross, helm, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const CU = 'copperNew'
const SEAM = seams(CU, 0.5, 0.045, 0.04)

const X0 = -12.3
const HW = 6.0
const EAVE = 6.8
const XC = 6.3 // centre of the octagonal east end (inradius = HW)
const RC = HW / Math.cos(22.5 * D2R)
const XV = XC + RC * Math.cos(67.5 * D2R) // ≈ 8.78, start of the oblique faces
const NP = 47
const AP = 40
const R1 = EAVE + HW * Math.tan(NP * D2R)
const R2 = EAVE + HW * Math.tan(AP * D2R)
const TW = { x0: X0, hw: 2.2, top: 15.6 }
const apsePt = (a: number, r: number, y: number) => V(XC + r * Math.cos(a * D2R), y, r * Math.sin(a * D2R))

const U = (face: Face, w: number) => (face === '+z' || face === '-x' ? w : -w)
const FF = (face: Face, plane: number, w: number) => faceFrame(face, plane, U(face, w), 0, 0)

function archWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('bvWhite', extrude(frameShape('round', w, h, 0.2, 0, y0), 0.1), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(m, mat(0, 0, 0.03)))
  for (let j = 1; j < 5; j++) b.add('bvFrame', metricBox(w, 0.04, 0.04), M(m, mat(0, y0 + (j * (h - w / 2)) / 5, 0.06)))
  b.add('bvFrame', metricBox(0.05, h - w / 2, 0.04), M(m, mat(0, y0 + (h - w / 2) / 2, 0.06)))
  b.add('bvWhite', metricBox(w + 0.5, 0.12, 0.22), M(m, mat(0, y0 - 0.1, 0.08)))
}

/** Ionic pilaster: base, shaft, simplified volute capital. */
function pilaster(b: Builder, m: THREE.Matrix4, u: number, y0: number, y1: number, w = 0.55) {
  b.add('bvWhite', metricBox(w + 0.14, 0.4, 0.26), M(m, mat(u, y0 + 0.2, 0.13)))
  b.add('bvWhite', metricBox(w, y1 - y0 - 0.75, 0.16), M(m, mat(u, y0 + 0.4 + (y1 - y0 - 0.75) / 2, 0.08)))
  b.add('bvWhite', metricBox(w + 0.22, 0.2, 0.26), M(m, mat(u, y1 - 0.25, 0.13)))
  for (const s of [-1, 1]) b.add('bvWhite', new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), M(m, mat(u + s * (w / 2 + 0.02), y1 - 0.38, 0.15, 0, Math.PI / 2)))
  b.add('bvWhite', metricBox(w + 0.3, 0.1, 0.3), M(m, mat(u, y1 - 0.1, 0.15)))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls: straight nave + 3/8 east end ================= */
  const ring = (y: number, grow = 0) => {
    const hw = HW + grow
    const rc = RC + grow / Math.cos(22.5 * D2R)
    return [V(X0 - grow, y, -hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(X0 - grow, y, hw)]
  }
  b.add('bvRender', loft([ring(0), ring(EAVE)], { capTop: true, capBottom: false, flat: true }))
  b.add('bvSocle', loft([ring(0, 0.08), ring(0.6, 0.08)], { capTop: true, flat: true }))
  b.add('bvWhite', loft([ring(0.6, 0.05), ring(0.75, 0.05)], { capTop: true, flat: true }))
  // profiled eave cornice (three steps)
  b.add('bvWhite', loft([ring(EAVE - 0.75, 0.06), ring(EAVE - 0.45, 0.06)], { capTop: true, capBottom: true, flat: true }))
  b.add('bvWhite', loft([ring(EAVE - 0.45, 0.2), ring(EAVE - 0.2, 0.2)], { capTop: true, capBottom: true, flat: true }))
  b.add('bvWhite', loft([ring(EAVE - 0.2, 0.36), ring(EAVE, 0.36)], { capTop: true, capBottom: true, flat: true }))

  // pilasters: side walls and east-end corners
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? HW : -HW
    for (const x of [-11.95, -11.25, -2.0, 4.6]) pilaster(b, FF(face, plane, x), 0, 0.75, EAVE - 0.75)
  }
  for (const a of [67.5, 22.5, -22.5, -67.5]) {
    const p = apsePt(a, RC, 0)
    for (const s of [-1, 1]) {
      // pilaster pair straddling each polygon corner
      const fa = (a + s * 22.5) * D2R
      const m = mat(p.x, 0, p.z, Math.PI / 2 - fa)
      pilaster(b, m, -s * 0.38, 0.75, EAVE - 0.75, 0.42)
    }
  }
  // windows
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? HW : -HW
    archWin(b, FF(face, plane, -6.8), 1.35, 3.6, 2.2)
    archWin(b, FF(face, plane, 6.6), 1.35, 3.6, 2.2)
    if (face === '-z') archWin(b, FF(face, plane, 1.2), 1.35, 3.6, 2.2)
  }
  for (const a of [45, -45]) {
    const p = V(XC + HW * Math.cos(a * D2R), 0, HW * Math.sin(a * D2R))
    archWin(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 1.2, 3.6, 2.2)
  }
  {
    // oculus above the porch
    const m = FF('+z', HW, 1.2)
    b.add('bvWhite', new THREE.TorusGeometry(0.55, 0.11, 8, 24), M(m, mat(0, 5.2, 0.06)))
    b.add('glassC', new THREE.CircleGeometry(0.53, 24), M(m, mat(0, 5.2, 0.02)))
  }
  // door in the north-east oblique face (photo 02)
  {
    const p = V(XC + HW * Math.cos(-45 * D2R), 0, HW * Math.sin(-45 * D2R))
    const m = mat(p.x, 0, p.z, Math.PI / 2 + 45 * D2R)
    b.add('bvFrame', new THREE.PlaneGeometry(1.1, 2.3), M(m, mat(0, 1.15, 0.03)))
    b.add('bvWhite', extrude(frameShape('rect', 1.1, 2.3, 0.15, 0, 0), 0.08), m)
  }

  /* ================= roofs (copper, client rule) ================= */
  const ov = 0.5
  {
    // lower roof: full length, hipped over the octagonal east end (apex at XC)
    const t = Math.tan(AP * D2R)
    const eY = EAVE - ov * t
    const hw = HW + ov
    const rcO = RC * (hw / HW)
    const apex = V(XC, R2, 0)
    const xa = X0 + 0.3
    facet(b, CU, [V(xa, eY, hw), apsePt(67.5, rcO, eY), apex, V(xa, R2, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [apsePt(-67.5, rcO, eY), V(xa, eY, -hw), V(xa, R2, 0), apex], { seams: SEAM, thickness: 0.1 })
    const angs = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, CU, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex], { seams: SEAM, thickness: 0.1 })
    for (const a of angs) b.beam(CU, apsePt(a, rcO, eY + 0.06), V(apex.x, apex.y + 0.06, 0), 0.18, 0.1)
    b.beam(CU, V(xa, R2 + 0.06, 0), V(XC, R2 + 0.06, 0), 0.2, 0.12)
    const gut = [V(X0, eY - 0.08, hw + 0.06), ...angs.map((a) => apsePt(a, rcO + 0.06, eY - 0.08)), V(X0, eY - 0.08, -hw - 0.06)]
    for (let i = 0; i < gut.length - 1; i++) b.beam(CU, gut[i], gut[i + 1], 0.16, 0.14)
    for (const [x, z] of [[X0 + 0.9, HW + 0.2], [X0 + 0.9, -HW - 0.2], [XV + 0.2, HW + 0.2], [XV + 0.2, -HW - 0.2]]) b.rod(CU, V(x, 0.6, z), V(x, eY - 0.1, z), 0.05, 8)
    cross(b, 'bvCross', XC, R2 + 0.1, 0, 2.0, false, Math.PI / 2)
  }
  {
    // higher nave roof with a hipped east end (photo 02)
    const t = Math.tan(NP * D2R)
    const eY = EAVE - ov * t
    const hw = HW + ov
    const xa = X0 + 0.3
    const xr = 1.6 // east end of the ridge
    const xe = xr + hw // hip foot on the eave line
    facet(b, CU, [V(xa, eY, hw), V(xe, eY, hw), V(xr, R1, 0), V(xa, R1, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(xe, eY, -hw), V(xa, eY, -hw), V(xa, R1, 0), V(xr, R1, 0)], { seams: SEAM, thickness: 0.1 })
    facet(b, CU, [V(xe, eY, hw), V(xe, eY, -hw), V(xr, R1, 0)], { seams: SEAM, thickness: 0.1 })
    b.beam(CU, V(xa, R1 + 0.06, 0), V(xr, R1 + 0.06, 0), 0.22, 0.13)
    for (const s of [-1, 1]) b.beam(CU, V(xe, eY + 0.06, s * hw), V(xr, R1 + 0.06, 0), 0.18, 0.1)
    cross(b, 'bvCross', xr, R1 + 0.05, 0, 1.8, false, Math.PI / 2)
    // west gable wall
    const g = new THREE.Shape([new THREE.Vector2(-HW, EAVE - 0.02), new THREE.Vector2(HW, EAVE - 0.02), new THREE.Vector2(0, R1 - 0.05)])
    b.add('bvRender', extrude(g, 0.4), mat(X0, 0, 0, -Math.PI / 2 + Math.PI))
  }

  /* ================= west tower ================= */
  {
    const { x0, hw, top } = TW
    const tx = x0 + hw
    b.block('bvRender', 2 * hw, top, 2 * hw, tx, 0, 0)
    // corner pilaster strips
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.block('bvWhite', 0.45, top - 0.4, 0.12, tx + sx * (hw - 0.22), 0, sz * (hw + 0.05))
      b.block('bvWhite', 0.12, top - 0.4, 0.45, tx + sx * (hw + 0.05), 0, sz * (hw - 0.22))
    }
    b.block('bvWhite', 2 * hw + 0.3, 0.25, 2 * hw + 0.3, tx, EAVE - 0.6, 0)
    b.block('bvWhite', 2 * hw + 0.45, 0.4, 2 * hw + 0.45, tx, top - 0.4, 0)
    b.block(CU, 2 * hw + 0.55, 0.06, 2 * hw + 0.55, tx, top, 0)
    // west portal + window + oculi
    const mw = FF('-x', x0, 0)
    b.add('bvFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.5, 3.0, 0, 0.3, 12))), M(mw, mat(0, 0, 0.03)))
    b.add('bvWhite', extrude(frameShape('round', 1.5, 3.0, 0.25, 0, 0.3), 0.12), mw)
    archWin(b, mw, 0.9, 2.2, 5.4)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f === '+x' ? tx + hw : f === '-x' ? tx - hw : f === '+z' ? hw : -hw
      const m = FF(f, plane, f.endsWith('x') ? 0 : tx)
      b.add('bvWhite', new THREE.TorusGeometry(0.22, 0.06, 6, 16), M(m, mat(0, top - 1.9, 0.04)))
      b.add('black', new THREE.CircleGeometry(0.2, 16), M(m, mat(0, top - 1.9, 0.02)))
    }
    // green louvred belfry lantern
    const lw = 1.85
    b.block('bvGreen', 2 * lw, 1.9, 2 * lw, tx, top + 0.06, 0)
    for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = f === '+x' ? tx + lw : f === '-x' ? tx - lw : f === '+z' ? lw : -lw
      const m = FF(f, plane, f.endsWith('x') ? 0 : tx)
      for (const u of [-0.85, 0.85]) {
        b.add('bvGreenDk', new THREE.PlaneGeometry(1.4, 1.35), M(m, mat(u, top + 1.05, 0.02)))
        for (let k = 0; k < 6; k++) b.add('bvGreen', metricBox(1.4, 0.05, 0.08), M(m, mat(u, top + 0.5 + k * 0.22, 0.05, 0, 0.5)))
      }
      b.add('bvGreen', metricBox(0.14, 1.9, 0.1), M(m, mat(0, top + 1.0, 0.05)))
    }
    b.block('bvWhite', 2 * lw + 0.35, 0.18, 2 * lw + 0.35, tx, top + 1.96, 0)
    // bell-cast octagonal spire (copper, client rule)
    const y0 = top + 2.1
    const st: [number, number][] = [
      [2.55, y0],
      [2.15, y0 + 0.35],
      [1.7, y0 + 0.9],
      [1.35, y0 + 1.6],
      [1.05, y0 + 2.4],
      [0.75, y0 + 3.3],
      [0.48, y0 + 4.2],
      [0.24, y0 + 5.1],
      [0.04, y0 + 6.4],
    ]
    helm(b, CU, { x: tx, z: 0, n: 8, stations: st })
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4
      const pts = st.map(([r, y]) => V(tx + Math.cos(a) * r, y, Math.sin(a) * r))
      for (let i = 0; i < pts.length - 2; i++) b.beam(CU, pts[i], pts[i + 1], 0.07, 0.06)
    }
    const ty = y0 + 6.4
    b.rod('bvCross', V(tx, ty - 0.3, 0), V(tx, ty + 2.2, 0), 0.05, 8)
    b.add('bvCross', new THREE.SphereGeometry(0.28, 16, 12), mat(tx, ty + 0.6, 0))
    cross(b, 'bvCross', tx, ty + 1.8, 0, 1.2, false, Math.PI / 2)
  }

  /* ================= south porch with baroque pediment ================= */
  {
    const px = 1.2
    const z0 = HW
    const z1 = HW + 2.0
    const w = 4.4
    b.block('bvRender', w, 3.0, z1 - z0, px, 0, (z0 + z1) / 2)
    b.block('bvSocle', w + 0.1, 0.5, z1 - z0 + 0.05, px, 0, (z0 + z1) / 2)
    for (const s of [-1, 1]) pilaster(b, FF('+z', z1, px + s * (w / 2 - 0.3)), 0, 0.5, 3.0, 0.4)
    b.block('bvWhite', w + 0.4, 0.3, z1 - z0 + 0.3, px, 3.0, (z0 + z1) / 2)
    const m = FF('+z', z1, px)
    b.add('bvFrame', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.4, 2.2, 0, 0.5, 12))), M(m, mat(0, 0, 0.03)))
    b.add('bvWhite', extrude(frameShape('round', 1.4, 2.2, 0.18, 0, 0.5), 0.1), m)
    // segmental pediment (photo 01)
    const R = 3.3
    const s = new THREE.Shape()
    s.moveTo(-w / 2 - 0.2, 3.3)
    s.lineTo(w / 2 + 0.2, 3.3)
    s.absarc(0, 3.3 - Math.sqrt(R * R - (w / 2 + 0.2) ** 2), R, Math.asin(Math.sqrt(R * R - (w / 2 + 0.2) ** 2) / R), Math.PI - Math.asin(Math.sqrt(R * R - (w / 2 + 0.2) ** 2) / R), false)
    b.add('bvRender', extrude(s, 0.35, 16), M(m, mat(0, 0, -0.35)))
    // curved copper roof running back to the nave wall
    const rise = 3.3 - Math.sqrt(R * R - (w / 2 + 0.2) ** 2) + R - 3.3
    const n = 10
    for (let i = 0; i < n; i++) {
      const a0 = -1 + (2 * i) / n
      const a1 = -1 + (2 * (i + 1)) / n
      const ua = a0 * (w / 2 + 0.35)
      const ub = a1 * (w / 2 + 0.35)
      const ya = 3.3 + rise * (1 - a0 * a0) + 0.05
      const yb = 3.3 + rise * (1 - a1 * a1) + 0.05
      facet(b, CU, [V(px + ua, ya, z1 + 0.25), V(px + ub, yb, z1 + 0.25), V(px + ub, yb, z0), V(px + ua, ya, z0)], { seams: SEAM, thickness: 0.06 })
    }
  }

  /* ================= north sacristy (photo 02) ================= */
  {
    const sx0 = -9.6
    const sx1 = -5.4
    const z0 = -HW
    const z1 = -HW - 2.9
    const cx = (sx0 + sx1) / 2
    const cz = (z0 + z1) / 2
    b.block('bvRender', sx1 - sx0, 3.6, z0 - z1, cx, 0, cz)
    b.block('bvSocle', sx1 - sx0 + 0.1, 0.5, z0 - z1 + 0.1, cx, 0, cz)
    b.block('bvWhite', sx1 - sx0 + 0.4, 0.28, z0 - z1 + 0.2, cx, 3.35, cz - 0.1)
    for (const u of [sx0 + 0.3, sx1 - 0.3]) pilaster(b, FF('-z', z1, u), 0, 0.5, 3.35, 0.4)
    archWin(b, FF('-z', z1, cx), 0.9, 1.4, 1.7)
    const t = Math.tan(45 * D2R)
    const o = 0.3
    const hx = (sx1 - sx0) / 2 + o
    const hz = (z0 - z1) / 2 + o
    const top = 3.62 + Math.min(hx, hz) * t
    const ra = V(cx - (hx - hz), top, cz)
    const rb = V(cx + (hx - hz), top, cz)
    const e = (x: number, z: number) => V(x, 3.62, z)
    facet(b, CU, [e(cx - hx, cz - hz), e(cx + hx, cz - hz), rb, ra], { seams: SEAM, thickness: 0.06 })
    facet(b, CU, [e(cx - hx, cz - hz), ra, e(cx - hx, cz + hz)], { seams: SEAM, thickness: 0.06 })
    facet(b, CU, [e(cx + hx, cz - hz), e(cx + hx, cz + hz), rb], { seams: SEAM, thickness: 0.06 })
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [-3, 10.3, 3],
  materials: () => ({
    bvRender: new THREE.MeshStandardMaterial({ color: '#efd7ab', roughness: 0.9 }),
    bvWhite: new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.82 }),
    bvSocle: new THREE.MeshStandardMaterial({ color: '#d9cdb6', roughness: 0.9 }),
    bvFrame: new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 0.6 }),
    bvGreen: new THREE.MeshStandardMaterial({ color: '#2f6b47', roughness: 0.6 }),
    bvGreenDk: new THREE.MeshStandardMaterial({ color: '#1f4630', roughness: 0.7 }),
    bvCross: new THREE.MeshStandardMaterial({ color: '#c9ccce', roughness: 0.35, metalness: 0.8 }),
  }),
  notes:
    'Baroque hall church of 1783 with its slender west tower and green belfry lantern; roofs and spire shown in new copper per the COLOR METAL register (photos predate the 2025 works).',
}
export default model
