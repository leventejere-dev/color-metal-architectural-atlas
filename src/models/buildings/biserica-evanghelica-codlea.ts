/**
 * Biserica evanghelică fortificată din Codlea (Kirchenburg Zeiden) — church
 * (OSM way 178933892) and its detached bell tower (OSM way 178947916, man_made
 * = bell_tower) standing ≈40 m to the south-south-east in the fortification
 * ring. The COLOR METAL reference is the rehabilitation of the TOWER (elZinc
 * Slate), so the tower is modelled in its true position relative to the church;
 * the fortification walls between them are not modelled.
 *
 * Modelling specification (real metres). Origin = centre of the church outline,
 * +X = church axis towards the choir (89.8°, east), +Z = south.
 *  - Church after the OSM outline and photos 04–06 + the axonometric drawing
 *    (plan.jpg): low west annex (x −22.7…−17.6), broad plain nave 24.8 × 14 m
 *    (rebuilt hall: round-arched windows, oculi, neo-classical south porch with
 *    columns, a very large tiled roof ≈55° with small dormers), Gothic choir
 *    9.6 m wide with a polygonal east end, two-stage buttresses with tiled
 *    weatherings and tall pointed windows, a north sacristy, a low south annex
 *    with a grey sheet lean-to and a small pent-roofed annex at the nave/choir
 *    junction. Nave eave ≈9 m, ridge ≈19 m; choir eave ≈10.5 m, ridge ≈17.4 m.
 *    Church roofs: clay tiles as photographed (not COLOR METAL scope).
 *  - Bell tower (photos 01, 03, 07, plan.jpg): OSM base 10.6 × 11.8 m rotated
 *    ≈48° to the church; battered base storey to ≈8 m with a corbel-arch frieze,
 *    a gothic-revival portal on the side towards the church and a narrow skirt
 *    roof; ashlar-scored shaft 8.8 m square to the cornice at ≈24.4 m (belfry
 *    with paired lancets and small triple windows); four clock gables
 *    (wimpergs) on the cornice, steep pyramidal helm with four corner
 *    pinnacles, a small collar and needle spire with ball and cross at ≈40 m.
 *    Heights estimated from photos 01 and 03 (shaft width as the scale).
 *  - METAL (client rule): COLOR METAL's records list elZinc Slate titanium-zinc
 *    for the tower rehabilitation (2021); all photographs predate the works
 *    (old dark covering), so the helm, clock-gable roofs, pinnacles, collar,
 *    spire, skirt roof and cornice flashings are shown in elZinc Slate with
 *    standing seams ≈0.6 m. Which surfaces were re-covered is not documented.
 * Approximations: all heights, church north side and sacristy (not
 * photographed), tower rotation from OSM, window counts on hidden faces.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, polyRing, faceFrame, seams, cross, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const ZN = 'zincSlate'
const ZSEAM = seams(ZN, 0.6, 0.05, 0.045)
const TILE = 'tileRed'

const NAVE = { x0: -17.6, x1: 7.2, zN: -6.1, zS: 7.9, eave: 9.0, pitch: 55 }
const NHW = (NAVE.zS - NAVE.zN) / 2
const NZC = (NAVE.zS + NAVE.zN) / 2
const NRIDGE = NAVE.eave + NHW * Math.tan(NAVE.pitch * D2R)
const CH = { x0: 7.2, z: 1.5, hw: 4.8, eave: 10.5, pitch: 55 }
const RC = CH.hw / Math.sin(67.5 * D2R)
const XC = 17.85
const CRIDGE = CH.eave + CH.hw * Math.tan(CH.pitch * D2R)
const apsePt = (a: number, r: number, y: number) => V(XC + r * Math.cos(a * D2R), y, CH.z + r * Math.sin(a * D2R))
const TOWER = { x: 18.27, z: 40.08, ry: -48.5 * D2R }

const U = (face: Face, w: number) => (face === '+z' || face === '-x' ? w : -w)
const FF = (face: Face, plane: number, w: number) => faceFrame(face, plane, U(face, w), 0, 0)

function roundWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('codTrim', extrude(frameShape('round', w, h, 0.22, 0, y0), 0.12), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 12))), M(m, mat(0, 0, 0.04)))
  b.add('iron', metricBox(0.06, h - w / 2, 0.05), M(m, mat(0, y0 + (h - w / 2) / 2, 0.07)))
  for (let j = 1; j < 5; j++) b.add('iron', metricBox(w, 0.04, 0.05), M(m, mat(0, y0 + (j * (h - w / 2)) / 5, 0.07)))
}
function pointedWin(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, key = 'codTrim') {
  b.add(key, extrude(frameShape('pointed', w, h, 0.26, 0, y0), 0.14), m)
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.04)))
  b.add(key, metricBox(0.1, h - w * 0.7, 0.08), M(m, mat(0, y0 + (h - w * 0.7) / 2, 0.07)))
}
function oculus(b: Builder, m: THREE.Matrix4, r: number, y: number) {
  b.add('codTrim', new THREE.TorusGeometry(r, 0.12, 8, 24), M(m, mat(0, y, 0.06)))
  b.add('glassC', new THREE.CircleGeometry(r, 24), M(m, mat(0, y, 0.03)))
}

/** Two-stage buttress with tiled weatherings (photo 05). */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, width: number, depth: number, h: number) {
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(depth, 0),
    new THREE.Vector2(depth, h * 0.5),
    new THREE.Vector2(depth * 0.6, h * 0.62),
    new THREE.Vector2(depth * 0.6, h * 0.86),
    new THREE.Vector2(-0.3, h),
  ])
  const up = V(0, 1, 0)
  const nn = n.clone().normalize()
  const t = V().crossVectors(nn, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(nn, up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(width / 2)))
  b.add('codRender', extrude(prof, width), basis)
  const pt = (sx: number, y: number) => p.clone().add(nn.clone().multiplyScalar(sx)).add(V(0, y, 0))
  b.beam(TILE, pt(depth + 0.12, h * 0.5 + 0.08), pt(depth * 0.6, h * 0.62 + 0.08), width + 0.2, 0.12, up)
  b.beam(TILE, pt(depth * 0.6 + 0.12, h * 0.86 + 0.08), pt(-0.15, h + 0.08), width + 0.2, 0.12, up)
}

/** Gable roof with the ridge along X between xa and xb. */
function roofX(b: Builder, xa: number, xb: number, zc: number, hw: number, eave: number, pitch: number, ov = 0.45) {
  const t = Math.tan(pitch * D2R)
  const ridge = eave + hw * t
  const eY = eave - ov * t
  facet(b, TILE, [V(xa, eY, zc + hw + ov), V(xb, eY, zc + hw + ov), V(xb, ridge, zc), V(xa, ridge, zc)], { thickness: 0.12 })
  facet(b, TILE, [V(xb, eY, zc - hw - ov), V(xa, eY, zc - hw - ov), V(xa, ridge, zc), V(xb, ridge, zc)], { thickness: 0.12 })
  b.beam('tileBrown', V(xa, ridge + 0.07, zc), V(xb, ridge + 0.07, zc), 0.3, 0.18)
  for (const s of [-1, 1]) b.beam('helm', V(xa, eY - 0.1, zc + s * (hw + ov + 0.08)), V(xb, eY - 0.1, zc + s * (hw + ov + 0.08)), 0.18, 0.16)
  return ridge
}

function gableWall(b: Builder, face: Face, plane: number, wc: number, hw: number, eave: number, ridge: number, key = 'codRender') {
  const s = new THREE.Shape([new THREE.Vector2(-hw, eave - 0.02), new THREE.Vector2(hw, eave - 0.02), new THREE.Vector2(0, ridge - 0.05)])
  b.add(key, extrude(s, 0.5), M(FF(face, plane, wc), mat(0, 0, -0.5)))
}

/** Lean-to (shed) roof against a wall: high edge at the wall. */
function leanTo(b: Builder, key: string, x0: number, x1: number, zWall: number, zOut: number, yLow: number, yHigh: number) {
  const s = Math.sign(zOut - zWall)
  facet(b, key, [V(x0 - 0.25, yLow, zOut + s * 0.35), V(x1 + 0.25, yLow, zOut + s * 0.35), V(x1 + 0.25, yHigh, zWall), V(x0 - 0.25, yHigh, zWall)], { thickness: 0.1 })
}

function buildTower(): Builder {
  const b = new Builder()
  const BX = 5.3 // base half-extent along local X (OSM 10.6 m)
  const BZ = 5.9 // base half-extent along local Z (OSM 11.8 m)
  const BH = 8.0
  const S = 4.4 // shaft half-width
  const TOP = 24.4
  // battered base storey
  b.add('stoneWarm', loft([
    [V(-BX - 0.25, 0, -BZ - 0.25), V(BX + 0.25, 0, -BZ - 0.25), V(BX + 0.25, 0, BZ + 0.25), V(-BX - 0.25, 0, BZ + 0.25)],
    [V(-BX, 2.5, -BZ), V(BX, 2.5, -BZ), V(BX, 2.5, BZ), V(-BX, 2.5, BZ)],
    [V(-BX, BH, -BZ), V(BX, BH, -BZ), V(BX, BH, BZ), V(-BX, BH, BZ)],
  ], { capTop: true, flat: true }))
  // corbel-arch frieze band under the skirt roof (photo 07)
  b.block('codTrim', 2 * BX + 0.3, 0.35, 2 * BZ + 0.3, 0, BH - 0.35, 0)
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    const half = f.endsWith('x') ? BZ : BX
    const plane = f === '+x' ? BX : f === '-x' ? -BX : f === '+z' ? BZ : -BZ
    const m = faceFrame(f, plane, 0, 0, 0)
    for (let u = -half + 0.9; u <= half - 0.6; u += 1.25) b.add('codTrim', new THREE.TorusGeometry(0.5, 0.07, 4, 10, Math.PI), M(m, mat(u, BH - 1.15, 0.06)))
  }
  // skirt roof (elZinc Slate) from the base edge up to the shaft
  {
    const ov = 0.3
    const lo = BH - 0.1
    const hi = BH + 1.5
    const c = [V(-BX - ov, lo, -BZ - ov), V(BX + ov, lo, -BZ - ov), V(BX + ov, lo, BZ + ov), V(-BX - ov, lo, BZ + ov)]
    const d = [V(-S, hi, -S), V(S, hi, -S), V(S, hi, S), V(-S, hi, S)]
    for (let i = 0; i < 4; i++) {
      facet(b, ZN, [c[i], c[(i + 1) % 4], d[(i + 1) % 4], d[i]], { seams: ZSEAM, thickness: 0.08 })
      b.beam(ZN, c[i], d[i], 0.16, 0.1)
    }
  }
  // shaft
  b.block('stoneWarm', 2 * S, TOP - BH, 2 * S, 0, BH, 0)
  b.block('codTrim', 2 * S + 0.3, 0.4, 2 * S + 0.3, 0, 16.6, 0)
  b.add(ZN, loft([[V(-S - 0.2, 17.0, -S - 0.2), V(S + 0.2, 17.0, -S - 0.2), V(S + 0.2, 17.0, S + 0.2), V(-S - 0.2, 17.0, S + 0.2)], [V(-S, 17.25, -S), V(S, 17.25, -S), V(S, 17.25, S), V(-S, 17.25, S)]], { flat: true }))
  b.block('codTrim', 2 * S + 0.5, 0.55, 2 * S + 0.5, 0, TOP - 0.55, 0)
  b.add(ZN, loft([[V(-S - 0.3, TOP, -S - 0.3), V(S + 0.3, TOP, -S - 0.3), V(S + 0.3, TOP, S + 0.3), V(-S - 0.3, TOP, S + 0.3)], [V(-S - 0.05, TOP + 0.2, -S - 0.05), V(S + 0.05, TOP + 0.2, -S - 0.05), V(S + 0.05, TOP + 0.2, S + 0.05), V(-S - 0.05, TOP + 0.2, S + 0.05)]], { flat: true, capTop: true }))
  // openings per face
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    const m = faceFrame(f, f[0] === '+' ? S : -S, 0, 0, 0)
    for (const u of [-1.0, 1.0]) pointedWin(b, M(m, mat(u, 0, 0)), 0.95, 3.2, 18.4, 'codTrim')
    for (const u of [-0.55, 0, 0.55]) b.add('black', new THREE.PlaneGeometry(0.3, 0.85), M(m, mat(u, 22.6, 0.03)))
    b.add('black', new THREE.PlaneGeometry(0.4, 1.2), M(m, mat(0, 12.5, 0.03)))
    b.add('black', new THREE.PlaneGeometry(0.4, 1.2), M(m, mat(1.6, 14.4, 0.03)))
  }
  // portal towards the church (local −X), gothic-revival gabled frontispiece (photo 07)
  {
    const m = faceFrame('-x', -BX, 0, 0, 0)
    b.add('codTrim', metricBox(3.6, 5.2, 0.7), M(m, mat(0, 2.6, 0.35)))
    const g = new THREE.Shape([new THREE.Vector2(-1.9, 5.2), new THREE.Vector2(1.9, 5.2), new THREE.Vector2(0, 7.3)])
    b.add('codTrim', extrude(g, 0.7), M(m, mat(0, 0, 0)))
    b.add(ZN, metricBox(0.22, 2.35, 0.9), M(m, mat(-0.95, 6.3, 0.35, 0, 0, -0.84)))
    b.add(ZN, metricBox(0.22, 2.35, 0.9), M(m, mat(0.95, 6.3, 0.35, 0, 0, 0.84)))
    b.add('wood', new THREE.PlaneGeometry(1.7, 2.6), M(m, mat(0, 1.3, 0.72)))
    b.add('codRender', extrude(frameShape('pointed', 2.2, 4.4, 0.25, 0, 0.1), 0.1), M(m, mat(0, 0, 0.7)))
    oculus(b, M(m, mat(0, 0, 0.66)), 0.45, 3.5)
  }
  // clock gables (wimpergs) on each face with small gable roofs running into the helm
  const GH = 4.4 // gable rise
  const GW = 2.9 // gable half-width
  for (const f of ['+x', '-x', '+z', '-z'] as Face[]) {
    const m = faceFrame(f, f[0] === '+' ? S : -S, 0, 0, 0)
    const g = new THREE.Shape([new THREE.Vector2(-GW, TOP - 0.05), new THREE.Vector2(GW, TOP - 0.05), new THREE.Vector2(0, TOP + GH)])
    b.add('stoneWarm', extrude(g, 0.5), M(m, mat(0, 0, -0.5)))
    b.add('codClock', new THREE.CylinderGeometry(1.05, 1.05, 0.1, 28), M(m, mat(0, TOP + 1.55, 0.06, 0, Math.PI / 2)))
    b.add('codTrim', new THREE.TorusGeometry(1.08, 0.08, 6, 28), M(m, mat(0, TOP + 1.55, 0.1)))
    b.add('gilt', metricBox(0.07, 0.75, 0.03), M(m, mat(0.1, TOP + 1.85, 0.13, 0, 0, -0.4)))
    b.add('gilt', metricBox(0.07, 0.55, 0.03), M(m, mat(-0.15, TOP + 1.4, 0.13, 0, 0, -2.2)))
    // small gable roof: two facets from the gable back to the helm axis
    const L = (pt: [number, number, number]) => V(pt[0], pt[1], pt[2]).applyMatrix4(m)
    const ridgeY = TOP + GH + 0.15
    for (const s of [-1, 1]) {
      facet(b, ZN, [L([s * (GW + 0.25), TOP - 0.1, 0.3]), L([s * (GW + 0.25), TOP - 0.1, -S + 0.4]), L([0, ridgeY, -S + 0.4]), L([0, ridgeY, 0.3])], { seams: ZSEAM, thickness: 0.08, hint: L([s * 3, 1, 0]).sub(L([0, 0, 0])) })
    }
    b.beam(ZN, L([0, ridgeY + 0.06, 0.3]), L([0, ridgeY + 0.06, -S + 0.4]), 0.18, 0.12)
    b.add(ZN, new THREE.SphereGeometry(0.16, 10, 8), M(m, mat(0, ridgeY + 0.45, 0.25)))
    b.rod(ZN, L([0, ridgeY, 0.25]), L([0, ridgeY + 0.9, 0.25]), 0.03, 6)
  }
  // main helm: square pyramid, collar, needle spire
  const HT = 33.4
  const hb = S + 0.3
  const base = [V(-hb, TOP + 0.15, -hb), V(hb, TOP + 0.15, -hb), V(hb, TOP + 0.15, hb), V(-hb, TOP + 0.15, hb)]
  const topR = 0.85
  const top = [V(-topR, HT, -topR), V(topR, HT, -topR), V(topR, HT, topR), V(-topR, HT, topR)]
  for (let i = 0; i < 4; i++) {
    facet(b, ZN, [base[i], base[(i + 1) % 4], top[(i + 1) % 4], top[i]], { seams: ZSEAM, thickness: 0.1, hint: V(base[i].x + base[(i + 1) % 4].x, 0.5, base[i].z + base[(i + 1) % 4].z) })
    b.beam(ZN, base[i], top[i], 0.16, 0.12)
  }
  b.add(ZN, loft([polyRing(8, 1.05, HT - 0.05, Math.PI / 8), polyRing(8, 1.05, HT + 0.25, Math.PI / 8)], { capTop: true, capBottom: true, flat: true }))
  b.add('stoneWarm', loft([polyRing(8, 0.8, HT + 0.25, Math.PI / 8), polyRing(8, 0.8, HT + 1.3, Math.PI / 8)], { flat: true }))
  for (let k = 0; k < 8; k += 2) {
    const a = Math.PI / 8 + (k + 0.5) * (Math.PI / 4)
    b.add('black', new THREE.PlaneGeometry(0.22, 0.6), mat(Math.cos(a) * 0.76, HT + 0.8, Math.sin(a) * 0.76, Math.PI / 2 - a))
  }
  b.add(ZN, loft([polyRing(8, 1.0, HT + 1.3, Math.PI / 8), polyRing(8, 0.75, HT + 1.6, Math.PI / 8), polyRing(8, 0.02, HT + 6.2, Math.PI / 8)], { capBottom: true, flat: true }))
  b.add('gilt', new THREE.SphereGeometry(0.24, 14, 10), mat(0, HT + 6.3, 0))
  b.rod('iron', V(0, HT + 6.0, 0), V(0, HT + 7.4, 0), 0.04, 6)
  cross(b, 'iron', 0, HT + 6.6, 0, 1.3)
  // corner pinnacles
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = sx * (S - 0.2)
    const cz = sz * (S - 0.2)
    b.block('stoneWarm', 0.75, 0.9, 0.75, cx, TOP, cz)
    b.add(ZN, new THREE.CylinderGeometry(0.02, 0.5, 2.6, 4), mat(cx, TOP + 0.9 + 1.3, cz, Math.PI / 4))
    b.add(ZN, new THREE.SphereGeometry(0.14, 10, 8), mat(cx, TOP + 3.6, cz))
  }
  return b
}

function build(): Builder {
  const b = new Builder()

  /* ================= nave ================= */
  const nx = (NAVE.x0 + NAVE.x1) / 2
  b.block('codRender', NAVE.x1 - NAVE.x0, NAVE.eave, NAVE.zS - NAVE.zN, nx, 0, NZC)
  b.block('stoneGrey', NAVE.x1 - NAVE.x0 + 0.2, 0.7, NAVE.zS - NAVE.zN + 0.2, nx, 0, NZC)
  b.block('codTrim', NAVE.x1 - NAVE.x0 + 0.3, 0.3, NAVE.zS - NAVE.zN + 0.5, nx, NAVE.eave - 0.3, NZC)
  roofX(b, NAVE.x0 - 0.3, NAVE.x1 + 0.1, NZC, NHW, NAVE.eave, NAVE.pitch)
  gableWall(b, '-x', NAVE.x0, NZC, NHW, NAVE.eave, NRIDGE)
  gableWall(b, '+x', NAVE.x1, NZC, NHW, NAVE.eave, NRIDGE)
  // small dormers on both slopes (photos 04, 06)
  {
    const t = Math.tan(NAVE.pitch * D2R)
    for (const s of [-1, 1]) {
      for (const [x, dz] of [[-12.5, 3.2], [-4.0, 4.6], [3.0, 3.2]] as [number, number][]) {
        const z = NZC + s * (NHW - dz)
        const y = NAVE.eave + dz * t
        b.block('codRender', 1.3, 0.75, 1.0, x, y - 0.15, z)
        b.add('black', new THREE.PlaneGeometry(0.9, 0.4), mat(x, y + 0.25, z + s * 0.51, s > 0 ? 0 : Math.PI))
        b.add(TILE, metricBox(1.6, 0.08, 1.5), mat(x, y + 0.66, z - s * 0.1, 0, s * -0.25))
      }
    }
  }
  // south façade: porch, oculi, round-arched windows (photos 04, 06); north mirrored
  for (const face of ['+z', '-z'] as Face[]) {
    const plane = face === '+z' ? NAVE.zS : NAVE.zN
    for (const x of [-3.2, 0.6, 4.4]) roundWin(b, FF(face, plane, x), 1.7, 4.6, 2.9)
    roundWin(b, FF(face, plane, -14.6), 1.6, 4.2, 3.2)
    oculus(b, FF(face, plane, -6.6), 0.55, 6.6)
    oculus(b, FF(face, plane, -12.0), 0.55, 6.6)
  }
  {
    // neo-classical south porch
    const px = -8.3
    const z0 = NAVE.zS
    const z1 = NAVE.zS + 2.4
    b.block('codTrim', 3.6, 0.35, z1 - z0 + 0.3, px, 0, (z0 + z1) / 2)
    for (const sx of [-1.35, -0.75, 0.75, 1.35]) b.add('codTrim', new THREE.CylinderGeometry(0.15, 0.17, 2.7, 12), mat(px + sx, 0.35 + 1.35, z1 - 0.3))
    b.block('codTrim', 3.6, 1.6, 0.4, px, 3.05, z1 - 0.2)
    b.block('codTrim', 0.5, 3.05, z1 - z0, px - 1.55, 0.35, (z0 + z1) / 2)
    b.block('codTrim', 0.5, 3.05, z1 - z0, px + 1.55, 0.35, (z0 + z1) / 2)
    const g = new THREE.Shape([new THREE.Vector2(-1.95, 4.65), new THREE.Vector2(1.95, 4.65), new THREE.Vector2(0, 6.0)])
    b.add('codTrim', extrude(g, 0.4), mat(px, 0, z1 - 0.4))
    const t = Math.tan(34 * D2R)
    for (const s of [-1, 1]) facet(b, TILE, [V(px + s * 2.1, 4.55, z0), V(px + s * 2.1, 4.55, z1 + 0.2), V(px, 4.55 + 2.1 * t, z1 + 0.2), V(px, 4.55 + 2.1 * t, z0)], { thickness: 0.08, hint: V(s, 1, 0) })
    b.add('wood', new THREE.PlaneGeometry(1.4, 2.5), mat(px, 1.6, z0 + 0.02))
    oculus(b, mat(px, 0, z1, 0), 0.3, 4.0)
  }

  /* ================= west annex ================= */
  b.block('codRender', 5.1, 5.2, 12.2, -20.15, 0, -0.1)
  b.block('stoneGrey', 5.3, 0.6, 12.4, -20.15, 0, -0.1)
  roofX(b, -22.95, NAVE.x0, -0.1, 6.1, 5.2, 34, 0.3)
  gableWall(b, '-x', -22.7, -0.1, 6.1, 5.2, 5.2 + 6.1 * Math.tan(34 * D2R))
  for (const z of [-3.0, 3.0]) b.add('glassC', new THREE.PlaneGeometry(0.9, 1.3), mat(-22.72, 2.2, z, -Math.PI / 2))

  /* ================= north annex (nave) ================= */
  b.block('codRender', 9.1, 4.8, 4.0, 2.85, 0, -8.1)
  leanTo(b, TILE, -1.7, 7.4, NAVE.zN, -10.1, 4.6, 7.2)

  /* ================= Gothic choir ================= */
  const ring = (y: number, grow = 0) => {
    const hw = CH.hw + grow
    const rc = RC + grow / Math.cos(22.5 * D2R)
    return [V(CH.x0, y, CH.z - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(CH.x0, y, CH.z + hw)]
  }
  b.add('codRender', loft([ring(0), ring(CH.eave)], { capTop: true, flat: true }))
  b.add('stoneGrey', loft([ring(0, 0.12), ring(0.7, 0.12)], { capTop: true, flat: true }))
  b.add('codTrim', loft([ring(CH.eave - 0.3, 0.22), ring(CH.eave, 0.22)], { capTop: true, flat: true }))
  {
    const t = Math.tan(CH.pitch * D2R)
    const ov = 0.4
    const eY = CH.eave - ov * t
    const chw = CH.hw + ov
    const rcO = RC * (chw / CH.hw)
    const apex = V(XC, CRIDGE, CH.z)
    const cx0 = CH.x0 + 0.05
    facet(b, TILE, [V(cx0, eY, CH.z + chw), apsePt(67.5, rcO, eY), apex, V(cx0, CRIDGE, CH.z)], { thickness: 0.12 })
    facet(b, TILE, [apsePt(-67.5, rcO, eY), V(cx0, eY, CH.z - chw), V(cx0, CRIDGE, CH.z), apex], { thickness: 0.12 })
    const angs = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, TILE, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex], { thickness: 0.12 })
    b.beam('tileBrown', V(cx0, CRIDGE + 0.07, CH.z), V(apex.x, CRIDGE + 0.07, CH.z), 0.3, 0.18)
    for (const a of angs) b.beam('tileBrown', apsePt(a, rcO, eY + 0.08), V(apex.x, apex.y + 0.08, CH.z), 0.24, 0.15)
    const gut = [V(cx0, eY - 0.1, CH.z + chw + 0.08), ...angs.map((a) => apsePt(a, rcO + 0.08, eY - 0.1)), V(cx0, eY - 0.1, CH.z - chw - 0.08)]
    for (let i = 0; i < gut.length - 1; i++) b.beam('helm', gut[i], gut[i + 1], 0.18, 0.16)
    cross(b, 'iron', XC, CRIDGE + 0.1, CH.z, 1.6, false, Math.PI / 2)
  }
  for (const a of [-67.5, -22.5, 22.5, 67.5]) buttress(b, apsePt(a, RC, 0), V(Math.cos(a * D2R), 0, Math.sin(a * D2R)), 1.0, 1.6, 8.6)
  buttress(b, V(12.2, 0, CH.z + CH.hw), V(0, 0, 1), 1.0, 1.4, 8.2)
  for (const a of [45, 0, -45]) {
    const p = V(XC + CH.hw * Math.cos(a * D2R), 0, CH.z + CH.hw * Math.sin(a * D2R))
    pointedWin(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 1.3, 5.0, 3.8)
  }
  pointedWin(b, FF('+z', CH.z + CH.hw, 10.0), 1.7, 6.6, 3.2)
  pointedWin(b, FF('+z', CH.z + CH.hw, 15.0), 1.3, 4.0, 5.4)

  /* ================= choir annexes ================= */
  // north sacristy (lean-to, not photographed)
  b.block('codRender', 11.0, 4.6, 4.8, 12.9, 0, -5.7)
  leanTo(b, TILE, 7.4, 18.4, CH.z - CH.hw, -8.1, 4.4, 7.3)
  // low south annex with grey sheet lean-to and Gothic doors (photos 05, 06)
  b.block('codStone', 6.1, 3.9, 1.85, 15.75, 0, CH.z + CH.hw + 0.9)
  leanTo(b, 'helm', 12.7, 18.8, CH.z + CH.hw, 8.1, 3.8, 4.9)
  for (const [x, w, h] of [[14.3, 1.3, 2.6], [16.9, 1.0, 1.9]] as [number, number, number][]) {
    b.add('codTrim', extrude(frameShape('pointed', w, h, 0.12, 0, 0.4), 0.06), FF('+z', 8.1, x))
    b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, 0.4, 8))), M(FF('+z', 8.1, x), mat(0, 0, 0.03)))
  }
  // narrow pent-roofed annex at the nave/choir junction (photo 04)
  b.block('codRender', 2.2, 7.6, 2.0, 6.1, 0, NAVE.zS + 0.95)
  leanTo(b, TILE, 5.0, 7.2, NAVE.zS, NAVE.zS + 1.95, 7.2, 8.6)
  b.block(TILE, 2.6, 0.12, 0.6, 6.1, 5.0, NAVE.zS + 2.2)

  /* ================= detached bell tower (COLOR METAL: elZinc Slate) ================= */
  b.merge(buildTower(), mat(TOWER.x, 0, TOWER.z, TOWER.ry))

  return b
}

const model: ModelModule = {
  build,
  front: [0, 1],
  materialFocus: [TOWER.x, 29, TOWER.z],
  materials: () => ({
    codRender: new THREE.MeshStandardMaterial({ color: '#dcc28f', roughness: 0.9 }),
    codTrim: new THREE.MeshStandardMaterial({ color: '#e6d3a8', roughness: 0.85 }),
    codStone: new THREE.MeshStandardMaterial({ color: '#d4b57a', roughness: 0.88 }),
    codClock: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.5 }),
  }),
  notes:
    'Fortified church of Codlea: tiled nave and Gothic choir, with the detached bell tower in its true position; the tower helm, clock gables, spire and skirt roof are shown in elZinc Slate per the COLOR METAL register (photos predate the 2021 works).',
}
export default model
