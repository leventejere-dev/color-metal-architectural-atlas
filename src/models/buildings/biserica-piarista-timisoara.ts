/**
 * Biserica Piariștilor „Înălțarea Sfintei Cruci”, Timișoara (Bd. Regele
 * Ferdinand I 3, OSM way 98109224) — church of the Piarist ensemble, set into
 * the corner between the two school wings, with a tall front tower and two
 * round corner turrets; bright titanium-zinc helm and turret spires.
 *
 * Modelling specification (real metres). The OSM outline is irregular
 * (tower, turrets, diagonal link wings), so its minimum-rectangle axis (21.6°)
 * runs diagonally through the church; the model axis is taken from the
 * parallel nave/choir walls of the outline: +X = 348.6° (towards the
 * three-sided choir, NNW), tower and main front at −X facing 168.6°.
 *  - Plan after the outline: tower 6.2 m square with a projecting Gothic
 *    portal (x −20.5…−13.6); nave 13.7 m wide (x −13…4.6) with rounded
 *    front corners carrying the turrets; short transept / side chapels
 *    18.7 m wide (x 4.6…11.2); choir with a three-sided end to x 20.5;
 *    two-storey diagonal link wings towards the school wings (OSM stubs).
 *  - Tower (photos 01–05): Gothic portal with gable, sloped spurs at the
 *    base, three small arched windows, rose window in a round-arched panel,
 *    balcony on corbels, tall arched belfry window, clock, arched corbel
 *    table and parapet stage with small arcades and corner pinnacles; total
 *    ≈41 m to the cross, scaled from the 6.2 m tower width in photos 03/04.
 *  - Helm: square-to-octagonal flared bell drawn into a tall needle spire,
 *    bright natural titanium-zinc with vertical seams (photos 01–05, 2019–23).
 *  - Turrets: round shafts with an arcaded upper drum, tiled ring roof,
 *    small lantern drum and a conical bright-zinc spire with cross; small
 *    rear stair turrets with zinc caps (photos 05, 06).
 *  - Nave, transept, choir and link wings: red tile roofs as photographed
 *    (photo 06, behind the tower).
 *  - COLOR METAL titanium-zinc (elZinc natural, 2021): helm, turret spires and
 *    turret caps, as photographed.
 * Approximations: nave/choir elevations and roofs are not photographed
 * (hidden by the school wings) — interpreted from the outline; heights scaled
 * from photos; ornament (tracery, corbel tables, carvings) simplified; the
 * school wings are not part of the model.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, polyRing, extrude, frameShape, opening, window_, hippedRoof, gableRoof, faceFrame, cross, type Face } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZN = 'zincNatural'
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const TW = { x0: -19.6, x1: -13.4, hw: 3.1 } // tower shaft
const NAVE = { x0: -13.0, x1: 4.6, z0: -6.5, z1: 7.2 }
const NZ = (NAVE.z0 + NAVE.z1) / 2
const TR = { x0: 4.6, x1: 11.2, z0: -8.9, z1: 9.8 }
const CH = { x0: 11.2, x1: 15.4, z0: -5.9, z1: 6.3, xe: 20.5, ze: 2.65 }
const CHZ = (CH.z0 + CH.z1) / 2

/* heights */
const NAVE_EAVE = 11.5
const PITCH = 40
const TOWER_TOP = 28.5

function arch(b: Builder, face: Face, plane: number, u: number, y0: number, w: number, h: number, key = 'glassC') {
  window_(b, face, plane, u, y0, { type: 'round', w, h, frame: 0.22, frameKey: 'piTrim', glassKey: key, inset: 0.04, sill: true })
}

/** Round turret: shaft, arcaded drum, ring roof, lantern drum, zinc cone, cross. */
function turret(b: Builder, x: number, z: number, r: number, yTop: number, coneH: number, big = true) {
  const n = 20
  b.add('piWall', loft([polyRing(n, r, 0, 0, x, z), polyRing(n, r, yTop - (big ? 4.4 : 2.0), 0, x, z)], { capTop: true }))
  b.add('piStone', loft([polyRing(n, r + 0.12, 0, 0, x, z), polyRing(n, r + 0.12, 1.0, 0, x, z)], { capTop: true }))
  let y = yTop - (big ? 4.4 : 2.0)
  b.add('piTrim', loft([polyRing(n, r + 0.18, y - 0.3, 0, x, z), polyRing(n, r + 0.18, y, 0, x, z)], { capTop: true, capBottom: true }))
  if (big) {
    // arcaded drum
    b.add('piWall', loft([polyRing(n, r, y, 0, x, z), polyRing(n, r, y + 2.6, 0, x, z)], { capTop: true }))
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3
      const m = mat(x + Math.cos(a) * (r - 0.02), 0, z + Math.sin(a) * (r - 0.02), Math.PI / 2 - a)
      b.add('piTrim', extrude(frameShape('round', 0.5, 1.5, 0.1, 0, y + 0.5), 0.08), m)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.5, 1.5, 0, y + 0.5, 8))), M(m, mat(0, 0, 0.03)))
    }
    y += 2.6
    // tiled ring roof with zinc flashing
    b.add('tileRed', loft([polyRing(n, r + 0.35, y, 0, x, z), polyRing(n, r - 0.35, y + 0.7, 0, x, z)], { capTop: true, capBottom: true }))
    b.add(ZN, loft([polyRing(n, r + 0.38, y - 0.05, 0, x, z), polyRing(n, r + 0.38, y + 0.05, 0, x, z)], { capTop: true, capBottom: true }))
    y += 0.7
    // lantern drum with small windows
    const r2 = r - 0.35
    b.add('piWall', loft([polyRing(n, r2, y, 0, x, z), polyRing(n, r2, y + 1.4, 0, x, z)], { capTop: true }))
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6
      const m = mat(x + Math.cos(a) * (r2 + 0.01), 0, z + Math.sin(a) * (r2 + 0.01), Math.PI / 2 - a)
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.32, 0.8, 0, y + 0.3, 6))), M(m, mat(0, 0, 0.02)))
    }
    y += 1.4
    b.add('piTrim', loft([polyRing(n, r2 + 0.2, y - 0.15, 0, x, z), polyRing(n, r2 + 0.2, y + 0.1, 0, x, z)], { capTop: true, capBottom: true }))
    y += 0.1
    cone(b, x, z, r2 + 0.22, y, coneH)
    cross(b, 'iron', x, y + coneH - 0.05, z, 1.2)
  } else {
    // small stair turret: lantern + zinc cap
    b.add('piWall', loft([polyRing(n, r * 0.8, y, 0, x, z), polyRing(n, r * 0.8, y + 1.2, 0, x, z)], { capTop: true }))
    y += 1.2
    cone(b, x, z, r * 0.95, y, coneH, 0.35)
    b.rod('iron', V(x, y + coneH * 0.9, z), V(x, y + coneH + 0.6, z), 0.04, 6)
  }
}

/** Conical zinc spire with standing-seam ribs (slightly bell-shaped foot). */
function cone(b: Builder, x: number, z: number, r: number, y: number, h: number, flare = 0.15) {
  const prof: [number, number][] = [
    [r + flare, 0],
    [r, h * 0.08],
    [r * 0.82, h * 0.25],
    [r * 0.55, h * 0.5],
    [r * 0.28, h * 0.75],
    [0.03, h],
  ]
  const n = 24
  b.add(ZN, loft(prof.map(([rr, yy]) => polyRing(n, rr, y + yy, 0, x, z)), { capBottom: true }))
  const ribs = Math.max(8, Math.round((2 * Math.PI * r) / 0.45))
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * Math.PI * 2
    for (let i = 0; i < prof.length - 2; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(ZN, V(x + Math.cos(a) * (r0 + 0.015), y + y0, z + Math.sin(a) * (r0 + 0.015)), V(x + Math.cos(a) * (r1 + 0.015), y + y1, z + Math.sin(a) * (r1 + 0.015)), 0.035, 0.035)
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= nave, transept, choir ================= */
  // nave body (front corners rounded towards the turrets)
  {
    const front: [number, number][] = []
    // rounded front corners: quarter arcs from the tower side to the side walls
    const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + ((a1 - a0) * i) / 6
        front.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
      }
    }
    front.push([NAVE.x1, NAVE.z0])
    arc(-8.2, NAVE.z0 + 4.4, 4.4, -Math.PI / 2, -Math.PI)
    arc(-8.2, NAVE.z1 - 4.4, 4.4, Math.PI, Math.PI / 2)
    front.push([NAVE.x1, NAVE.z1])
    // outline CCW seen from above for prismOutline: build via loft of two rings
    const ring = (y: number, g = 0) => front.map(([x, z]) => V(x - (x < -8 ? g : 0), y, z + (z > NZ ? g : -g)))
    b.add('piWall', loft([ring(0), ring(NAVE_EAVE)], { capTop: true, flat: true }))
    b.add('piStone', loft([ring(0, 0.12), ring(1.0, 0.12)], { capTop: true, flat: true }))
    b.add('piTrim', loft([ring(NAVE_EAVE - 0.5, 0.25), ring(NAVE_EAVE, 0.25)], { capTop: true, capBottom: true, flat: true }))
  }
  // transept / side chapels
  b.block('piWall', TR.x1 - TR.x0, NAVE_EAVE, TR.z1 - TR.z0, (TR.x0 + TR.x1) / 2, 0, (TR.z0 + TR.z1) / 2)
  b.block('piStone', TR.x1 - TR.x0 + 0.24, 1.0, TR.z1 - TR.z0 + 0.24, (TR.x0 + TR.x1) / 2, 0, (TR.z0 + TR.z1) / 2)
  b.block('piTrim', TR.x1 - TR.x0 + 0.5, 0.5, TR.z1 - TR.z0 + 0.5, (TR.x0 + TR.x1) / 2, NAVE_EAVE - 0.5, (TR.z0 + TR.z1) / 2)
  // choir with three-sided end
  const choirRing = (y: number, g = 0) => [
    V(CH.x0, y, CH.z0 - g),
    V(CH.x1, y, CH.z0 - g),
    V(CH.xe + g * 0.5, y, CHZ - CH.ze - g * 0.5),
    V(CH.xe + g * 0.5, y, CHZ + CH.ze + g * 0.5),
    V(CH.x1, y, CH.z1 + g),
    V(CH.x0, y, CH.z1 + g),
  ]
  const CH_EAVE = 11.0
  b.add('piWall', loft([choirRing(0), choirRing(CH_EAVE)], { capTop: true, flat: true }))
  b.add('piStone', loft([choirRing(0, 0.12), choirRing(1.0, 0.12)], { capTop: true, flat: true }))
  b.add('piTrim', loft([choirRing(CH_EAVE - 0.45, 0.25), choirRing(CH_EAVE, 0.25)], { capTop: true, capBottom: true, flat: true }))

  /* windows: paired round-arched windows on the exposed nave bays, transept ends, choir */
  for (const [f, pl] of [
    ['+z', NAVE.z1],
    ['-z', NAVE.z0],
  ] as [Face, number][]) {
    const sgn = f === '+z' ? 1 : -1
    for (const x of [-1.6, 2.2]) for (const du of [-0.55, 0.55]) arch(b, f, pl, sgn * x + du, 4.6, 0.9, 4.0)
  }
  for (const [f, pl] of [
    ['+z', TR.z1],
    ['-z', TR.z0],
  ] as [Face, number][]) {
    const u = f === '+z' ? (TR.x0 + TR.x1) / 2 : -(TR.x0 + TR.x1) / 2
    for (const du of [-1.3, 0, 1.3]) arch(b, f, pl, u + du, 3.6, 0.95, du === 0 ? 4.6 : 3.8)
    const m = faceFrame(f, pl, u, 0, 0)
    b.add('piTrim', new THREE.TorusGeometry(1.0, 0.18, 6, 24), M(m, mat(0, 11.0, 0.12)))
    b.add('glassC', new THREE.CircleGeometry(0.95, 24), M(m, mat(0, 11.0, 0.03)))
    // gable wall of the transept arm
  }
  for (const [f, pl] of [
    ['+z', CH.z1],
    ['-z', CH.z0],
  ] as [Face, number][]) arch(b, f, pl, f === '+z' ? 13.3 : -13.3, 3.6, 1.2, 4.6)
  {
    // apse facets
    const pts = choirRing(0)
    for (const [i, j] of [
      [1, 2],
      [2, 3],
      [3, 4],
    ]) {
      const a = pts[i]
      const c = pts[j]
      const mid = a.clone().lerp(c, 0.5)
      const t = V().subVectors(c, a).normalize()
      const n = V(t.z, 0, -t.x)
      const ry = Math.atan2(n.x, n.z)
      const m = mat(mid.x, 0, mid.z, ry)
      b.add('piTrim', extrude(frameShape('round', 1.2, 4.6, 0.22, 0, 3.6), 0.1), m)
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.2, 4.6, 0, 3.6, 10))), M(m, mat(0, 0, 0.03)))
    }
  }

  /* ================= roofs (tile, as photographed) ================= */
  const t = Math.tan(PITCH * D2R)
  const nhw = (NAVE.z1 - NAVE.z0) / 2
  const ridge = NAVE_EAVE + nhw * t
  {
    const ov = 0.45
    const ey = NAVE_EAVE - ov * t
    const xa = -9.6
    const xb = TR.x1
    const zh = nhw + ov
    facet(b, 'tileRed', [V(xa, ey, NZ + zh), V(xb, ey, NZ + zh), V(xb, ridge, NZ), V(xa + nhw, ridge, NZ)], { thickness: 0.12 })
    facet(b, 'tileRed', [V(xb, ey, NZ - zh), V(xa, ey, NZ - zh), V(xa + nhw, ridge, NZ), V(xb, ridge, NZ)], { thickness: 0.12 })
    // hipped front end over the rounded front
    facet(b, 'tileRed', [V(xa - 3.0, ey, NZ - zh + 1.6), V(xa - 3.0, ey, NZ + zh - 1.6), V(xa, ey, NZ + zh), V(xa + nhw, ridge, NZ), V(xa, ey, NZ - zh)], { thickness: 0.12 })
    b.beam('tileBrown', V(xa + nhw, ridge + 0.08, NZ), V(xb, ridge + 0.08, NZ), 0.3, 0.2)
    for (const s of [-1, 1]) b.beam('tileBrown', V(xa, ey + 0.05, NZ + s * zh), V(xa + nhw, ridge + 0.05, NZ), 0.24, 0.15)
  }
  // transept: cross gable (ridge along Z) with gable walls
  gableRoof(b, 'tileRed', { x: (TR.x0 + TR.x1) / 2, z: (TR.z0 + TR.z1) / 2, w: TR.x1 - TR.x0, d: TR.z1 - TR.z0, y: NAVE_EAVE, pitch: PITCH + 8, ridge: 'z', overhang: 0.35, seams: false, wallKey: 'piWall', capKey: 'tileBrown' })
  // choir roof with three-sided hipped end
  {
    const ov = 0.4
    const ey = CH_EAVE - ov * t
    const hw = (CH.z1 - CH.z0) / 2 + ov
    const cr = CH_EAVE + ((CH.z1 - CH.z0) / 2) * t
    const apex = V(CH.x1 + 0.6, cr, CHZ)
    const x0 = TR.x1 - 0.2
    const e1 = V(CH.xe + ov * 0.6, ey, CHZ - CH.ze - ov * 0.4)
    const e2 = V(CH.xe + ov * 0.6, ey, CHZ + CH.ze + ov * 0.4)
    const s1 = V(CH.x1 + 0.2, ey, CHZ - hw)
    const s2 = V(CH.x1 + 0.2, ey, CHZ + hw)
    facet(b, 'tileRed', [V(x0, ey, CHZ + hw), s2, apex, V(x0, cr, CHZ)], { thickness: 0.12 })
    facet(b, 'tileRed', [s1, V(x0, ey, CHZ - hw), V(x0, cr, CHZ), apex], { thickness: 0.12 })
    facet(b, 'tileRed', [s1, apex, e1], { thickness: 0.12, hint: V(0.3, 1, -1) })
    facet(b, 'tileRed', [e1, apex, e2], { thickness: 0.12 })
    facet(b, 'tileRed', [e2, apex, s2], { thickness: 0.12, hint: V(0.3, 1, 1) })
    b.beam('tileBrown', V(x0, cr + 0.08, CHZ), apex.clone().setY(cr + 0.08), 0.28, 0.2)
    for (const p of [s1, e1, e2, s2]) b.beam('tileBrown', p.clone().setY(p.y + 0.05), apex.clone().setY(apex.y + 0.05), 0.22, 0.14)
    // small zinc finial on the apse apex
    b.rod(ZN, apex, apex.clone().setY(apex.y + 1.4), 0.05, 6)
    b.add(ZN, new THREE.SphereGeometry(0.16, 8, 6), mat(apex.x, apex.y + 0.5, apex.z))
  }

  /* ================= diagonal link wings (towards the school wings) ================= */
  {
    const links: [number, number][][] = [
      [[-9.31, -9.38], [-1.8, -15.2], [1.9, -11.44], [-5.17, -6.66]],
      [[-5.0, 7.38], [1.61, 11.32], [-1.35, 15.2], [-9.43, 9.02]],
    ]
    for (const [li, q] of links.entries()) {
      const ring = (y: number) => q.map(([x, z]) => V(x, y, z))
      b.add('piWall', loft([ring(0), ring(11.2)], { capTop: true, flat: true }))
      // eave cornice + hipped tile roof (simplified as a ridge along the long side)
      const P = q.map(([x, z]) => V(x, 11.2, z))
      const c = P.reduce((s, p) => s.add(p), V()).multiplyScalar(0.25)
      const ax = V().subVectors(P[1], P[0])
      const L = ax.length()
      ax.normalize()
      const nrm = V(ax.z, 0, -ax.x)
      const W = Math.abs(V().subVectors(P[3], P[0]).dot(nrm))
      const ry = Math.atan2(-ax.z, ax.x)
      const g = new Builder()
      hippedRoof(g, 'tileRed', { w: L, d: W, y: 0, pitch: 40, overhang: 0.35, seams: false, capKey: 'tileBrown' })
      g.block('piTrim', L + 0.4, 0.35, W + 0.4, 0, -0.35, 0)
      b.merge(g, mat(c.x, 11.2, c.z, ry))
      // two storeys of round-arched windows on the front-facing side
      const [ia, ib] = li === 0 ? [0, 1] : [3, 2]
      const fa = V(q[ia][0], 0, q[ia][1])
      const fb = V(q[ib][0], 0, q[ib][1])
      const along = V().subVectors(fb, fa)
      const len = along.length()
      along.normalize()
      let out = V(along.z, 0, -along.x)
      if (out.dot(V().subVectors(fa, c.clone().setY(0))) < 0) out = out.negate()
      const ryw = Math.atan2(out.x, out.z)
      for (let i = 0; i < 3; i++) {
        const p = fa.clone().add(along.clone().multiplyScalar((len * (i + 0.6)) / 3.4))
        for (const [y0, h] of [
          [1.8, 3.0],
          [6.6, 3.2],
        ]) {
          for (const du of [-0.45, 0.45]) {
            const m = M(mat(p.x, 0, p.z, ryw), mat(du, 0, 0.02))
            b.add('piTrim', extrude(frameShape('round', 0.7, h, 0.14, 0, y0), 0.08), m)
            b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.7, h, 0, y0, 8))), M(m, mat(0, 0, 0.03)))
          }
        }
      }
    }
  }

  /* ================= corner turrets & stair turrets ================= */
  turret(b, -10.0, NAVE.z0 + 0.5, 1.75, 14.6, 6.0)
  turret(b, -10.0, NAVE.z1 - 0.5, 1.75, 14.6, 6.0)
  turret(b, -4.6, NAVE.z0 - 1.0, 1.1, 12.6, 2.2, false)
  turret(b, -4.6, NAVE.z1 + 1.0, 1.1, 12.6, 2.2, false)

  /* ================= front tower ================= */
  {
    const tx = (TW.x0 + TW.x1) / 2
    const hw = TW.hw
    const F = TW.x0 // front face plane (−X)
    // shaft with plinth, sloped spurs to the nave front
    b.block('piTower', 2 * hw, TOWER_TOP - 1.5, 2 * hw, tx, 0, NZ)
    b.block('piStone', 2 * hw + 0.3, 1.0, 2 * hw + 0.3, tx, 0, NZ)
    for (const s of [-1, 1]) {
      // spur: wedge rising from the nave front along the tower sides
      const z0 = NZ + s * hw
      const z1 = NZ + s * (hw + 1.6)
      const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.6, 0), new THREE.Vector2(1.6, 6.0), new THREE.Vector2(0, 11.0)])
      const g = extrude(sh, TW.x1 - TW.x0 + 0.4)
      // shape x → outward (z), shape y → up; extrude along local z → model −x
      const m = new THREE.Matrix4().makeBasis(V(0, 0, s), V(0, 1, 0), V(-1, 0, 0)).setPosition(V(TW.x1 + 0.2, 0, z0))
      b.add('piTower', g, m)
      void z1
    }
    // projecting portal with pointed arch and gable
    {
      const px = F - 0.9
      b.block('piTower', 1.0, 6.2, 4.4, F - 0.45, 0, NZ)
      const m = mat(px, 0, NZ, -Math.PI / 2)
      b.add('piStone', extrude(frameShape('pointed', 1.9, 3.9, 0.55, 0, 0.6), 0.25), m)
      b.add('piDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 1.9, 3.9, 0, 0.6, 10))), M(m, mat(0, 0, 0.03)))
      const gs = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 2.0)])
      b.add('piTower', extrude(gs, 1.0), M(mat(F - 0.95, 6.2, NZ, -Math.PI / 2), mat(0, 0, 0)))
      for (const s of [-1, 1]) {
        b.add('piStone', new THREE.CylinderGeometry(0.22, 0.22, 3.6, 10), mat(px - 0.1, 2.4, NZ + s * 1.55))
        b.block('piTower', 0.7, 7.6, 0.7, F - 0.6, 0, NZ + s * 2.15)
        b.add(ZN, new THREE.ConeGeometry(0.42, 1.0, 4), mat(F - 0.6, 8.1, NZ + s * 2.15, Math.PI / 4))
      }
    }
    const faces: [Face, number, number][] = [
      ['-x', F, NZ],
      ['+z', NZ + hw, tx],
      ['-z', NZ - hw, -tx],
      ['+x', TW.x1, -NZ],
    ]
    for (const [f, pl, u] of faces) {
      const front = f === '-x'
      const m = faceFrame(f, pl, u, 0, 0)
      if (front) {
        for (const du of [-1.0, 0, 1.0]) arch(b, f, pl, u + du, 9.0, 0.6, 1.7)
        // rose window in a round-arched recessed panel
        b.add('piTrim', extrude(frameShape('round', 3.4, 5.6, 0.25, 0, 11.6), 0.1), m)
        b.add('piTrim', new THREE.TorusGeometry(1.3, 0.22, 6, 24), M(m, mat(0, 14.6, 0.12)))
        b.add('glassC', new THREE.CircleGeometry(1.25, 24), M(m, mat(0, 14.6, 0.03)))
        for (let k = 0; k < 4; k++) b.add('piTrim', metricBox(2.4, 0.1, 0.08), M(m, mat(0, 14.6, 0.06, 0, 0, (k * Math.PI) / 4)))
      }
      if (!(f === '+x')) {
        // belfry: tall arched window with balcony on corbels
        arch(b, f, pl, u, 19.4, 1.4, 4.0, 'black')
        if (front) {
          b.add('piStone', metricBox(2.6, 0.3, 1.0), M(m, mat(0, 19.0, 0.5)))
          b.add('piStone', metricBox(2.6, 0.9, 0.12), M(m, mat(0, 19.6, 0.95)))
          for (const du of [-0.9, 0, 0.9]) b.add('piStone', metricBox(0.3, 0.7, 0.8), M(m, mat(du, 18.5, 0.4)))
        }
      } else arch(b, f, pl, u, 19.4, 1.4, 4.0, 'black')
      // clock
      b.add('white', new THREE.CylinderGeometry(0.75, 0.75, 0.1, 24), M(m, mat(0, 24.9, 0.08, 0, Math.PI / 2)))
      b.add('piTrim', new THREE.TorusGeometry(0.8, 0.1, 6, 24), M(m, mat(0, 24.9, 0.12)))
      b.add('black', metricBox(0.06, 0.5, 0.03), M(m, mat(0, 25.1, 0.15)))
      b.add('black', metricBox(0.4, 0.06, 0.03), M(m, mat(0.15, 24.9, 0.15)))
      // arched corbel table
      for (let k = -2; k <= 2; k++) {
        b.add('piTrim', extrude(frameShape('round', 0.75, 0.6, 0.1, 0, 26.0), 0.12), M(m, mat(k * 1.15, 0, 0)))
        b.add('piTrim', metricBox(0.14, 0.4, 0.2), M(m, mat(k * 1.15 + 0.57, 25.8, 0.1)))
      }
    }
    // cornice, parapet stage with small arcades, corner pinnacles
    const cy = TOWER_TOP - 1.5
    b.block('piTrim', 2 * hw + 0.7, 0.45, 2 * hw + 0.7, tx, cy - 0.1, NZ)
    b.block('piTower', 2 * hw + 0.3, 1.5, 2 * hw + 0.3, tx, cy + 0.35, NZ)
    b.block('piTrim', 2 * hw + 0.6, 0.3, 2 * hw + 0.6, tx, TOWER_TOP - 0.1, NZ)
    for (const [f, pl, u] of [
      ['-x', F - 0.15, NZ],
      ['+z', NZ + hw + 0.15, tx],
      ['-z', NZ - hw - 0.15, -tx],
      ['+x', TW.x1 + 0.15, -NZ],
    ] as [Face, number, number][]) {
      for (let k = -2; k <= 2; k++) window_(b, f, pl, u + k * 1.1, cy + 0.55, { type: 'round', w: 0.5, h: 0.85, frame: 0.08, frameKey: 'piTrim', glassKey: 'black', inset: 0.02 })
    }
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      b.block('piTower', 0.55, 1.0, 0.55, tx + sx * (hw + 0.05), TOWER_TOP, NZ + sz * (hw + 0.05))
      b.add(ZN, new THREE.ConeGeometry(0.36, 1.1, 4), mat(tx + sx * (hw + 0.05), TOWER_TOP + 1.55, NZ + sz * (hw + 0.05), Math.PI / 4))
    }

    /* zinc helm: flared square-octagonal bell drawn into a needle spire */
    const y0 = TOWER_TOP + 0.2
    const st: [number, number][] = [
      [2.8, y0],
      [2.88, y0 + 0.5],
      [2.75, y0 + 1.3],
      [2.35, y0 + 2.2],
      [1.75, y0 + 3.1],
      [1.15, y0 + 4.0],
      [0.74, y0 + 5.0],
      [0.5, y0 + 6.2],
      [0.33, y0 + 7.6],
      [0.19, y0 + 9.2],
      [0.08, y0 + 10.8],
      [0.025, y0 + 11.8],
    ]
    const n = 8
    const ph = Math.PI / 8
    // corner radius of a regular octagon whose flats match the square tower faces
    const R = (r: number) => r / Math.cos(Math.PI / n)
    b.add(ZN, loft(st.map(([r, y]) => polyRing(n, R(r), y, ph, tx, NZ)), { capBottom: true }))
    // vertical seams on each face + corner rolls
    for (let k = 0; k < n; k++) {
      const a0 = ph + (k / n) * Math.PI * 2
      const a1 = ph + ((k + 1) / n) * Math.PI * 2
      for (const f of [0, 0.2, 0.4, 0.6, 0.8]) {
        for (let i = 0; i < st.length - 2; i++) {
          const pt = (r: number, y: number) => {
            const rr = R(r) + 0.02
            const p0 = V(Math.cos(a0) * rr, 0, Math.sin(a0) * rr)
            const p1 = V(Math.cos(a1) * rr, 0, Math.sin(a1) * rr)
            return p0.lerp(p1, f).add(V(tx, y, NZ))
          }
          b.beam(ZN, pt(st[i][0], st[i][1]), pt(st[i + 1][0], st[i + 1][1]), f === 0 ? 0.09 : 0.035, f === 0 ? 0.07 : 0.035)
        }
      }
    }
    // small ornamental dormers (oculi) on the four main faces of the bell
    for (const [ax, az] of [
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const p = V(tx + ax * 2.45, y0 + 1.6, NZ + az * 2.45)
      const ry = Math.atan2(ax, az)
      b.add(ZN, new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14, 1, false), M(mat(p.x, p.y, p.z, ry), mat(0, 0, 0, Math.PI / 2)))
      b.add('black', new THREE.CircleGeometry(0.3, 14), M(mat(p.x, p.y, p.z, ry), mat(0, 0, 0.36)))
      b.add(ZN, new THREE.ConeGeometry(0.5, 0.6, 4), M(mat(p.x, p.y + 0.62, p.z, ry), mat(0, 0, 0, 0, Math.PI / 4)))
    }
    cross(b, 'iron', tx, y0 + 11.7, NZ, 1.5)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [(TW.x0 + TW.x1) / 2, 32, NZ],
  materials: () => ({
    piWall: new THREE.MeshStandardMaterial({ color: '#dcc28c', roughness: 0.9 }),
    piTower: new THREE.MeshStandardMaterial({ color: '#d2bc92', roughness: 0.88 }),
    piTrim: new THREE.MeshStandardMaterial({ color: '#e6d7b4', roughness: 0.85 }),
    piStone: new THREE.MeshStandardMaterial({ color: '#b9a582', roughness: 0.88 }),
    piDoor: new THREE.MeshStandardMaterial({ color: '#2e2a26', roughness: 0.6 }),
  }),
  notes:
    'Piarist church with a tall front tower crowned by a bright titanium-zinc helm and two round corner turrets with zinc spires; nave, transept and choir under red tiles; the adjoining school wings are not modelled.',
}
export default model
