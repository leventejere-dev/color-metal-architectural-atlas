/**
 * Biserica reformată din Tăureni / Bikafalvi református templom (Tăureni 103,
 * LMI HR-II-m-B-12985; church of 1680/84, rebuilt 1851, west tower 1776).
 * No OSM outline exists: the size is read from the photographs.
 *
 * Modelling specification (real metres, origin = estimated footprint centre at
 * ground, +X = main axis towards the polygonal east end, tower at −X;
 * the W–E orientation is assumed, as usual for the Reformed churches of the
 * region):
 *  - Broad hall ≈ 19.5 × 11.4 m closed by a regular 3/8 polygonal end of the
 *    same width (facets ≈ 4.7 m, one window each); eaves ≈ 6.6 m. Scale: clock face ≈ 1 m →
 *    tower ≈ 5.2 m square; the apse facets carry one round-headed window each
 *    and are ≈ 5 window widths wide (photos 01–03).
 *  - White lime render, corner lesenes on every facet, recessed wall panels,
 *    frieze and profiled cornice; round-headed windows with stucco surround,
 *    sill with apron and a small tablet above (photo 03).
 *  - Steep (≈ 46°) red plain-tile roof, west gable against the tower, three hip
 *    facets over the polygonal end meeting in one apex (photos 01–02).
 *  - Small tile-roofed porch on the south side near the tower (photo 01).
 *  - West tower 5.2 m square: plain shaft with corner lesenes, string course,
 *    oculus and clock (≈ 14–15.5 m), belfry with two small round-arched
 *    openings per face, profiled top cornice ≈ 18.3 m.
 *  - COLOR METAL scope: copper sheet supplied in 2022, most likely used to
 *    re-clad the needle spire (the 2017 photographs still show the earlier
 *    grey sheet). Shown per the client rule in weathered copper
 *    ('copperBrown'): bell-cast skirt over the cornice, tall octagonal
 *    needle with flat-lock courses, finial rod and ball, top ≈ 33 m.
 * Approximations: all dimensions (no outline or survey; ±15 %), the north
 * side and the west front (not photographed), window count of the side walls,
 * the porch, and the exact surfaces clad with the 2022 copper.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, extrude, opening, frameShape, helm } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const NAVE = { x0: -5.6, hw: 5.7, h: 6.6 }
const RC = NAVE.hw / Math.sin(67.5 * D2R) // circumradius of the octagon end
const XC = 5.0 // octagon centre (= roof apex)
const PITCH = 46
const TP = Math.tan(PITCH * D2R)
const OV = 0.45
const RIDGE = NAVE.h + NAVE.hw * TP
const TW = { x: -8.2, hw: 2.6, band: 12.9, top: 18.3 }
const WALL = 'tauWall'
const TRIM = 'tauTrim'
const CU = 'copperBrown'

const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b)
const apsePt = (aDeg: number, r: number, y: number) => V(XC + r * Math.cos(aDeg * D2R), y, r * Math.sin(aDeg * D2R))

/** Beam between two points with a right-handed basis (w across, h along `up`). */
function beam(b: Builder, key: string, p: THREE.Vector3, q: THREE.Vector3, w: number, h: number, up = V(0, 1, 0)) {
  const d = V().subVectors(q, p)
  const L = d.length()
  if (L < 1e-5) return
  d.normalize()
  let side = V().crossVectors(up, d)
  if (side.lengthSq() < 1e-6) side = V().crossVectors(V(1, 0, 0), d)
  side.normalize()
  const up2 = V().crossVectors(d, side).normalize()
  b.add(key, metricBox(w, h, L), new THREE.Matrix4().makeBasis(side, up2, d).setPosition(V().addVectors(p, q).multiplyScalar(0.5)))
}

function hallRing(y: number, grow = 0) {
  const hw = NAVE.hw + grow
  const rc = RC + grow / Math.cos(22.5 * D2R)
  return [V(NAVE.x0 - grow, y, -hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(NAVE.x0 - grow, y, hw)]
}

/** Round-headed window with stucco surround, sill + apron and a tablet above (photo 03). */
function win(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), mul(m, mat(0, 0, 0.03)))
  b.add('tauFrame', extrude(frameShape('round', w - 0.04, h - 0.02, 0.07, 0, y0), 0.05), mul(m, mat(0, 0, 0.02)))
  b.add('tauFrame', metricBox(0.07, h - w / 2, 0.04), mul(m, mat(0, y0 + (h - w / 2) / 2, 0.05)))
  b.add('tauFrame', metricBox(w, 0.07, 0.04), mul(m, mat(0, y0 + h - w / 2, 0.05)))
  b.add(TRIM, extrude(frameShape('round', w, h, 0.16, 0, y0), 0.06), mul(m, mat(0, 0, 0.0)))
  b.add(TRIM, metricBox(w + 0.6, 0.12, 0.18), mul(m, mat(0, y0 - 0.12, 0.08)))
  b.add(TRIM, metricBox(w + 0.4, 0.3, 0.06), mul(m, mat(0, y0 - 0.33, 0.03)))
  b.add(TRIM, metricBox(w + 0.5, 0.5, 0.05), mul(m, mat(0, y0 + h + 0.5, 0.02)))
}

function build(): Builder {
  const b = new Builder()
  const { x0, hw, h } = NAVE

  /* ---------------- hall (nave + 3/8 east end) ---------------- */
  b.add(WALL, loft([hallRing(0), hallRing(h)], { capTop: true, flat: true }))
  b.add('tauSocle', loft([hallRing(0, 0.05), hallRing(0.45, 0.05)], { capTop: true, flat: true }))
  // frieze + profiled cornice
  b.add(TRIM, loft([hallRing(h - 0.95, 0.04), hallRing(h - 0.85, 0.04)], { capTop: true, capBottom: true, flat: true }))
  b.add(TRIM, loft([hallRing(h - 0.38, 0.1), hallRing(h - 0.18, 0.1)], { capTop: true, capBottom: true, flat: true }))
  b.add(TRIM, loft([hallRing(h - 0.18, 0.22), hallRing(h, 0.22)], { capTop: true, capBottom: true, flat: true }))
  // lesenes at every corner of the polygonal end and at the nave corners
  for (const a of [67.5, 22.5, -22.5, -67.5]) {
    const p = apsePt(a, RC + 0.02, 0)
    b.add(TRIM, metricBox(0.75, h - 1.4, 0.75), mat(p.x, 0.45 + (h - 1.4) / 2, p.z, -a * D2R + Math.PI / 4))
  }
  for (const s of [-1, 1]) b.block(TRIM, 0.7, h - 1.4, 0.08, x0 + 0.35, 0.45, s * (hw + 0.03))
  // west gable wall (beside the tower)
  const gable = new THREE.Shape([new THREE.Vector2(-hw, h - 0.01), new THREE.Vector2(hw, h - 0.01), new THREE.Vector2(0, RIDGE - 0.08)])
  b.add(WALL, extrude(gable, 0.5), mat(x0 + 0.5, 0, 0, -Math.PI / 2))

  /* ---------------- windows ---------------- */
  for (const a of [45, 0, -45]) {
    const ap = hw // apothem
    const p = V(XC + ap * Math.cos(a * D2R), 0, ap * Math.sin(a * D2R))
    const m = mat(p.x, 0, p.z, Math.PI / 2 - a * D2R)
    win(b, m, 0.95, 2.2, 2.9)
    // recessed panel suggested by a thin frame on every facet
    b.add(TRIM, extrude(frameShape('rect', 3.2, h - 2.0, 0.08, 0, 0.75), 0.03), mul(m, mat(0, 0, 0.0)))
  }
  for (const s of [-1, 1]) {
    const ry = s > 0 ? 0 : Math.PI
    for (const x of [-1.8, 2.4]) win(b, mat(x, 0, s * hw, ry), 0.95, 2.2, 2.9)
  }

  /* ---------------- tile roof ---------------- */
  {
    const eY = h - OV * TP
    const nhw = hw + OV
    const rcO = RC * (nhw / hw)
    const xa = x0 - 0.35
    const apex = V(XC, RIDGE, 0)
    facet(b, 'tileRed', [V(xa, eY, nhw), apsePt(67.5, rcO, eY), apex, V(xa, RIDGE, 0)], { thickness: 0.16 })
    facet(b, 'tileRed', [apsePt(-67.5, rcO, eY), V(xa, eY, -nhw), V(xa, RIDGE, 0), apex], { thickness: 0.16 })
    const aa = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, 'tileRed', [apsePt(aa[i], rcO, eY), apsePt(aa[i + 1], rcO, eY), apex], { thickness: 0.16 })
    beam(b, 'tauTileCap', V(xa, RIDGE + 0.07, 0), apex.clone().add(V(0, 0.07, 0)), 0.3, 0.2)
    for (const a of aa) beam(b, 'tauTileCap', apsePt(a, rcO, eY + 0.07), apex.clone().add(V(0, 0.07, 0)), 0.26, 0.16)
    for (const s of [-1, 1]) beam(b, 'tauTileCap', V(xa + 0.05, eY + 0.05, s * nhw), V(xa + 0.05, RIDGE + 0.05, 0), 0.2, 0.24, V(1, 0, 0))
    // galvanised gutters and downpipes (photos 01–03)
    b.rod('helm', V(xa, eY - 0.1, nhw + 0.05), apsePt(67.5, rcO + 0.05, eY - 0.1), 0.07, 6)
    b.rod('helm', V(xa, eY - 0.1, -nhw - 0.05), apsePt(-67.5, rcO + 0.05, eY - 0.1), 0.07, 6)
    for (let i = 0; i < 3; i++) b.rod('helm', apsePt(aa[i], rcO + 0.05, eY - 0.1), apsePt(aa[i + 1], rcO + 0.05, eY - 0.1), 0.07, 6)
    for (const a of aa) {
      const p = apsePt(a, rcO, 0)
      b.rod('helm', V(p.x, 0.4, p.z), V(p.x, eY - 0.1, p.z), 0.05, 6)
    }
  }

  /* ---------------- south porch ---------------- */
  {
    const px = -3.3
    const pw = 3.6
    const pd = 2.8
    const ph = 3.3
    const z0 = hw
    const z1 = hw + pd
    b.block(WALL, pw, ph, pd, px, 0, (z0 + z1) / 2)
    b.block('tauSocle', pw + 0.1, 0.4, pd + 0.1, px, 0, (z0 + z1) / 2)
    b.block(TRIM, pw + 0.2, 0.2, pd + 0.1, px, ph - 0.2, (z0 + z1) / 2 + 0.05)
    const fm = mat(px, 0, z1, 0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.4, 0, 0.3, 12))), mul(fm, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.3, 2.4, 0.15, 0, 0.3), 0.05), mul(fm, mat(0, 0, 0.01)))
    // hipped tile roof running into the nave wall
    const pt = Math.tan(42 * D2R)
    const o = 0.3
    const ey = ph - o * pt
    const rh = (pw / 2 + o) * pt
    const A = V(px - pw / 2 - o, ey, z1 + o)
    const B = V(px + pw / 2 + o, ey, z1 + o)
    const R1 = V(px, ey + rh, z1 + o - (pw / 2 + o))
    const R2 = V(px, ey + rh, z0)
    facet(b, 'tileRed', [A, B, R1], { thickness: 0.12 })
    facet(b, 'tileRed', [B, V(px + pw / 2 + o, ey, z0), R2, R1], { thickness: 0.12 })
    facet(b, 'tileRed', [V(px - pw / 2 - o, ey, z0), A, R1, R2], { thickness: 0.12 })
    beam(b, 'tauTileCap', R1.clone().add(V(0, 0.06, 0)), R2.clone().add(V(0, 0.06, 0)), 0.24, 0.14)
    for (const p of [A, B]) beam(b, 'tauTileCap', p.clone().add(V(0, 0.06, 0)), R1.clone().add(V(0, 0.06, 0)), 0.2, 0.12)
  }

  /* ---------------- west tower ---------------- */
  const tx = TW.x
  const thw = TW.hw
  b.block(WALL, 2 * thw, TW.top, 2 * thw, tx, 0, 0)
  b.block('tauSocle', 2 * thw + 0.12, 0.6, 2 * thw + 0.12, tx, 0, 0)
  // corner lesenes
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.block(WALL, 0.55, TW.top - 0.6, 0.06, tx + sx * (thw - 0.275), 0.6, sz * (thw + 0.03))
    b.block(WALL, 0.06, TW.top - 0.6, 0.55, tx + sx * (thw + 0.03), 0.6, sz * (thw - 0.275))
  }
  // string course under the clock stage and below the belfry
  for (const [y, g] of [[TW.band, 0.14], [16.0, 0.1]] as [number, number][]) {
    b.block(TRIM, 2 * thw + 2 * g, 0.28, 2 * thw + 2 * g, tx, y, 0)
  }
  // profiled top cornice
  b.block(TRIM, 2 * thw + 0.2, 0.25, 2 * thw + 0.2, tx, TW.top - 0.55, 0)
  b.block(TRIM, 2 * thw + 0.45, 0.18, 2 * thw + 0.45, tx, TW.top - 0.3, 0)
  b.block(TRIM, 2 * thw + 0.7, 0.14, 2 * thw + 0.7, tx, TW.top - 0.14, 0)
  const faceM = (f: 'nx' | 'pz' | 'nz' | 'px') =>
    f === 'nx' ? mat(tx - thw, 0, 0, -Math.PI / 2) : f === 'px' ? mat(tx + thw, 0, 0, Math.PI / 2) : f === 'pz' ? mat(tx, 0, thw, 0) : mat(tx, 0, -thw, Math.PI)
  for (const f of ['nx', 'pz', 'nz', 'px'] as const) {
    const m = faceM(f)
    // oculus + clock
    if (f !== 'px') {
      b.add('glassC', new THREE.CircleGeometry(0.38, 20), mul(m, mat(0, 13.95, 0.02)))
      b.add(TRIM, new THREE.TorusGeometry(0.4, 0.06, 5, 20), mul(m, mat(0, 13.95, 0.03)))
    }
    const cy = 15.25
    b.add('white', new THREE.CylinderGeometry(0.52, 0.52, 0.06, 24), mul(m, mat(0, cy, 0.04, 0, Math.PI / 2)))
    b.add('clock', new THREE.TorusGeometry(0.52, 0.035, 5, 24), mul(m, mat(0, cy, 0.08)))
    b.add('clock', metricBox(0.04, 0.34, 0.03), mul(m, mat(0, cy + 0.12, 0.09)))
    b.add('clock', metricBox(0.26, 0.04, 0.03), mul(m, mat(0.1, cy, 0.09)))
    // belfry: two small round-arched openings
    for (const u of [-0.75, 0.75]) {
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.62, 1.25, u, 16.55, 10))), mul(m, mat(0, 0, 0.02)))
      b.add(TRIM, extrude(frameShape('round', 0.62, 1.25, 0.1, u, 16.55), 0.05), mul(m, mat(0, 0, 0.0)))
    }
    // stucco ornaments at the belfry corners (photo 01)
    for (const u of [-1.9, 1.9]) b.add(TRIM, metricBox(0.32, 0.5, 0.06), mul(m, mat(u, 17.2, 0.04)))
  }
  // west portal and slit window
  {
    const wm = faceM('nx')
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.3, 2.5, 0, 0.6, 12))), mul(wm, mat(0, 0, 0.03)))
    b.add(TRIM, extrude(frameShape('round', 1.3, 2.5, 0.18, 0, 0.6), 0.06), mul(wm, mat(0, 0, 0.01)))
    for (const f of ['nx', 'pz', 'nz'] as const) b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.3, 1.1, 0, 8.6, 8))), mul(faceM(f), mat(0, 0, 0.02)))
  }

  /* ---------------- copper needle spire (COLOR METAL, client rule) ---------------- */
  {
    const y0 = TW.top
    const c8 = Math.cos(Math.PI / 8)
    // bell-cast skirt: square eave ring → octagon at the needle foot (stations as square/octagon blend)
    const blend = (a: number, t: number, y: number) => {
      // t = 0 square of half-width a, t = 1 regular octagon of apothem a (8 points)
      const pts: THREE.Vector3[] = []
      for (let k = 0; k < 8; k++) {
        const ang = Math.PI / 8 + (k / 8) * Math.PI * 2
        const ro = a / c8 // octagon vertex radius
        // square: map the octagon vertex direction onto the square boundary
        const cx = Math.cos(ang)
        const cz = Math.sin(ang)
        const rs = a / Math.max(Math.abs(cx), Math.abs(cz))
        const r = rs + (ro - rs) * t
        pts.push(V(tx + cx * r, y, cz * r))
      }
      return pts
    }
    const skirt: [number, number, number][] = [
      [thw + 0.55, 0, 0],
      [thw + 0.25, 0.22, 0.05],
      [thw - 0.15, 0.55, 0.15],
      [thw - 0.65, 0.95, 0.35],
      [1.75, 1.35, 0.6],
      [1.45, 1.75, 0.85],
      [1.32, 2.05, 1],
    ]
    b.add(CU, loft(skirt.map(([a, y, t]) => blend(a, t, y0 + y)), { capBottom: true }))
    const yN = y0 + 2.05
    const yTip = yN + 11.2
    helm(b, CU, { n: 8, x: tx, z: 0, stations: [[1.32 / c8, yN], [0.95 / c8, yN + 3.2], [0.55 / c8, yN + 6.6], [0.22 / c8, yN + 9.6], [0.05, yTip]] })
    // flat-lock courses and arris rolls on the needle
    for (let y = yN + 0.9; y < yTip - 1.2; y += 0.9) {
      const t = (y - yN) / (yTip - yN)
      const a = 1.32 * (1 - t) + 0.05 * t
      b.add(CU, new THREE.CylinderGeometry(a / c8 + 0.01, a / c8 + 0.01, 0.035, 8, 1, true, Math.PI / 8), mat(tx, y, 0, 0))
    }
    for (let k = 0; k < 8; k++) {
      const ang = Math.PI / 8 + (k / 8) * Math.PI * 2
      const p = V(tx + (Math.cos(ang) * 1.32) / c8, yN, (Math.sin(ang) * 1.32) / c8)
      beam(b, CU, p, V(tx, yTip, 0), 0.05, 0.04, V(Math.cos(ang), 0, Math.sin(ang)))
    }
    // knob, rod, small ball, spike
    b.add(CU, new THREE.SphereGeometry(0.2, 14, 10), mat(tx, yTip - 0.6, 0, 0, 0, 0, 1, 1.3, 1))
    b.rod(CU, V(tx, yTip - 0.3, 0), V(tx, yTip + 1.4, 0), 0.05, 8)
    b.add(CU, new THREE.SphereGeometry(0.16, 14, 10), mat(tx, yTip + 0.8, 0))
    b.add(CU, new THREE.ConeGeometry(0.07, 0.6, 8), mat(tx, yTip + 1.7, 0))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [TW.x, 24, 0],
  materials: () => ({
    tauWall: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.9 }),
    tauTrim: new THREE.MeshStandardMaterial({ color: '#f7f4ea', roughness: 0.86 }),
    tauSocle: new THREE.MeshStandardMaterial({ color: '#c9c4b8', roughness: 0.92 }),
    tauFrame: new THREE.MeshStandardMaterial({ color: '#6b3f22', roughness: 0.65 }),
    tauTileCap: new THREE.MeshStandardMaterial({ color: '#b5552f', roughness: 0.82 }),
  }),
  notes:
    'Tăureni Reformed church: broad hall with 3/8 east end and tile roof, south porch, west tower with clock and paired belfry openings; needle spire shown in weathered copper per COLOR METAL records (photos predate the 2022 works). No outline available: dimensions estimated from photographs.',
}
export default model
