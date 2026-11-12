/**
 * Biserica Calvaria de la Cluj-Mănăștur (Kolozsmonostori Kálvária-templom),
 * Str. Primăverii 60, Cluj-Napoca — OSM way 91738616.
 *
 * Modelling specification (real metres). +X = the church axis towards the
 * polygonal choir (east-south-east). The OSM minimum rectangle gives 96.5°, but
 * the long walls of the outline run at ≈106°, so the model uses 106° (the
 * sacristy on the north side skews the bounding rectangle). +Z = south.
 *  - Plan after the OSM outline: 19th-century nave 19.6 × 14.0 m (west front at
 *    x = −17.6), narrower Gothic choir 9.7 m wide (12.75 m straight + a 5/8
 *    polygonal apse, total length 35.2 m), low sacristy 7.4 × 6.1 m against the
 *    north side of the choir. The axis of nave and choir lies 1.75 m south of
 *    the footprint centre.
 *  - Heights (no published dimensions — estimated from photos 01–04, door ≈
 *    3.6 m, window rhythm): nave eave 15.0 m, choir eave 13.8 m, very steep
 *    roofs (≈58°) → nave ridge ≈ 26.2 m, choir ridge ≈ 21.6 m; stone gables
 *    with coping rise above the roof at both ends of the nave (photos 01, 02).
 *  - West front (photos 02, 03): pointed portal with crocketed hood and two
 *    pinnacles, statue of the Virgin on a console under a canopy, two tall
 *    lancet windows, two small square windows low down, two slit windows in the
 *    gable, stepped corner buttresses.
 *  - Long sides: two tall lancets per nave side, two per choir side, one in
 *    each apse face (photo 04: two-light windows with tracery heads); plinth,
 *    sill course and eave cornice in dressed stone; corner pilasters on the apse.
 *  - Bell turret (1922) on the nave ridge against the east gable: timber-boarded
 *    square body with louvred openings, steep saddle roof with its ridge across
 *    the nave and a needle spire at each end of the ridge (photos 01, 02, 04 —
 *    the two spires read close together from the south and wide apart from the
 *    east).
 *  - METAL (client rule): COLOR METAL's records list copper strip supplied in
 *    2026; every available photograph (2009–2014) shows the old tile roof and
 *    red-painted spires, so the roofs of nave, choir/apse, sacristy, the turret
 *    roof and spires are shown in new copper (standing seams 0.5 m), with copper
 *    gutters and downpipes. Which surfaces the copper actually covers is not
 *    documented.
 * Approximations: all heights, roof pitch, north elevation and sacristy roof
 * (not photographed), window tracery and portal ornament simplified.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, extrude, frameShape, opening, loft, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const ZC = 1.75
const NAVE = { x0: -17.6, x1: 2.0, hw: 7.0, eave: 15.0 }
const CHOIR = { x0: 2.0, hw: 4.85, eave: 13.8 }
const RC = CHOIR.hw / Math.sin(67.5 * D2R)
const XC = 12.75 // apse centre; east face of the apse at XC + hw = 17.6
const XV = XC + RC * Math.cos(67.5 * D2R)
const PITCH = 58
const T = Math.tan(PITCH * D2R)
const NRIDGE = NAVE.eave + NAVE.hw * T
const CRIDGE = CHOIR.eave + CHOIR.hw * T
const CU = 'copperNew'
const SEAM = seams(CU, 0.5, 0.05, 0.045)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const apsePt = (a: number, r: number, y: number) => V(XC + r * Math.cos(a * D2R), y, ZC + r * Math.sin(a * D2R))

/** Pointed two-light Gothic window on a wall frame m (local x along the wall, z outward). */
function lancet(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, lights = 2) {
  b.add('calvDress', extrude(frameShape('pointed', w, h, 0.32, 0, y0), 0.18), m)
  b.add('calvDress', extrude(frameShape('pointed', w - 0.1, h - 0.06, 0.12, 0, y0), 0.08), M(m, mat(0, 0, -0.04)))
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.05)))
  for (let i = 1; i < lights; i++) b.add('calvDress', metricBox(0.12, h - w * 0.75, 0.1), M(m, mat(-w / 2 + (i * w) / lights, y0 + (h - w * 0.75) / 2, 0.09)))
  for (let j = 1; j < 5; j++) b.add('lead', metricBox(w - 0.05, 0.04, 0.05), M(m, mat(0, y0 + (j * (h - w * 0.8)) / 5, 0.08)))
  b.add('calvDress', new THREE.TorusGeometry(w * 0.17, 0.035, 6, 16), M(m, mat(0, y0 + h - w * 0.55, 0.09)))
  b.add('calvDress', metricBox(w + 0.6, 0.16, 0.4), M(m, mat(0, y0 - 0.2, 0.12)))
}

/** Stepped buttress at p on a wall with outward normal n (two set-offs, stone weatherings). */
function buttress(b: Builder, p: THREE.Vector3, n: THREE.Vector3, width: number, depth: number, h: number) {
  const prof = new THREE.Shape([
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(depth, 0),
    new THREE.Vector2(depth, h * 0.45),
    new THREE.Vector2(depth * 0.65, h * 0.53),
    new THREE.Vector2(depth * 0.65, h * 0.86),
    new THREE.Vector2(-0.3, h),
  ])
  const up = V(0, 1, 0)
  const nn = n.clone().normalize()
  const t = V().crossVectors(nn, up).normalize()
  const basis = new THREE.Matrix4().makeBasis(nn, up, t)
  basis.setPosition(p.clone().sub(t.clone().multiplyScalar(width / 2)))
  b.add('calvStone', extrude(prof, width), basis)
  b.add('calvDress', metricBox(depth + 0.2, 0.8, width + 0.2), new THREE.Matrix4().makeBasis(nn, up, t).setPosition(p.clone().add(nn.clone().multiplyScalar(depth / 2)).add(V(0, 0.4, 0))))
}

/** Stone gable wall across the nave at x (extruded thickness th towards dir), rising pr above the roof planes. */
function gableWall(b: Builder, x: number, hw: number, eave: number, ridge: number, th: number, dir: 1 | -1, pr = 0.45) {
  const s = new THREE.Shape([
    new THREE.Vector2(-hw - 0.15, eave - 0.01),
    new THREE.Vector2(hw + 0.15, eave - 0.01),
    new THREE.Vector2(hw + 0.15, eave + pr),
    new THREE.Vector2(0, ridge + pr / Math.cos(PITCH * D2R)),
    new THREE.Vector2(-hw - 0.15, eave + pr),
  ])
  // shape in local XY (x → −Z after the rotation), extruded along local +Z → model +X (ry = π/2)
  b.add('calvStone', extrude(s, th), mat(dir > 0 ? x : x - th, 0, ZC, Math.PI / 2))
  // coping along the two rakes
  const top = ridge + pr / Math.cos(PITCH * D2R) + 0.06
  for (const sz of [-1, 1]) b.beam('calvDress', V(x + (dir * th) / 2, eave + pr + 0.06, ZC + sz * (hw + 0.2)), V(x + (dir * th) / 2, top, ZC), th + 0.16, 0.18, V(1, 0, 0))
  b.add('calvDress', new THREE.ConeGeometry(0.35, 1.0, 4), mat(x + (dir * th) / 2, top + 0.5, ZC, Math.PI / 4))
}

function build(): Builder {
  const b = new Builder()
  const ov = 0.4

  /* ================= nave ================= */
  const nx = (NAVE.x0 + NAVE.x1) / 2
  const nl = NAVE.x1 - NAVE.x0
  b.block('calvStone', nl, NAVE.eave, 2 * NAVE.hw, nx, 0, ZC)
  b.block('calvDress', nl + 0.3, 0.9, 2 * NAVE.hw + 0.3, nx, 0, ZC)
  b.block('calvDress', nl + 0.1, 0.4, 2 * NAVE.hw + 0.5, nx, NAVE.eave - 0.4, ZC)
  b.block('calvDress', nl + 0.06, 0.16, 2 * NAVE.hw + 0.2, nx, 4.6, ZC)
  gableWall(b, NAVE.x0, NAVE.hw, NAVE.eave, NRIDGE, 0.9, 1)
  gableWall(b, NAVE.x1, NAVE.hw, NAVE.eave, NRIDGE, 0.9, -1)

  /* ================= choir + 5/8 apse ================= */
  const ring = (y: number, grow = 0) => {
    const hw = CHOIR.hw + grow
    const rc = RC + grow / Math.cos(22.5 * D2R)
    return [V(CHOIR.x0, y, ZC - hw), apsePt(-67.5, rc, y), apsePt(-22.5, rc, y), apsePt(22.5, rc, y), apsePt(67.5, rc, y), V(CHOIR.x0, y, ZC + hw)]
  }
  b.add('calvStone', loft([ring(0), ring(CHOIR.eave)], { capTop: true, flat: true }))
  b.add('calvDress', loft([ring(0, 0.15), ring(1.2, 0.15)], { capTop: true, flat: true }))
  b.add('calvDress', loft([ring(4.6, 0.08), ring(4.76, 0.08)], { capTop: true, flat: true }))
  b.add('calvDress', loft([ring(CHOIR.eave - 0.4, 0.25), ring(CHOIR.eave, 0.25)], { capTop: true, flat: true }))
  // apse corner pilasters (stepped quoins, photo 04)
  for (const a of [-67.5, -22.5, 22.5, 67.5]) {
    const p = apsePt(a, RC + 0.05, 0)
    b.add('calvDress', metricBox(0.9, CHOIR.eave - 1.6, 0.9), mat(p.x, 1.2 + (CHOIR.eave - 1.6) / 2, p.z, -a * D2R))
  }

  /* ================= sacristy (north of the choir) ================= */
  const SAC = { x0: 5.7, x1: 13.1, z0: -9.2, z1: ZC - CHOIR.hw, eave: 5.2 }
  b.block('calvStone', SAC.x1 - SAC.x0, SAC.eave, SAC.z1 - SAC.z0, (SAC.x0 + SAC.x1) / 2, 0, (SAC.z0 + SAC.z1) / 2)
  b.block('calvDress', SAC.x1 - SAC.x0 + 0.3, 0.9, SAC.z1 - SAC.z0 + 0.15, (SAC.x0 + SAC.x1) / 2, 0, (SAC.z0 + SAC.z1) / 2)
  {
    const t = Math.tan(30 * D2R)
    const zl = SAC.z0 - 0.35
    const yl = SAC.eave - 0.35 * t
    const yh = SAC.eave + (SAC.z1 - SAC.z0) * t
    facet(b, CU, [V(SAC.x0 - 0.3, yl, zl), V(SAC.x1 + 0.3, yl, zl), V(SAC.x1 + 0.3, yh, SAC.z1), V(SAC.x0 - 0.3, yh, SAC.z1)], { seams: SEAM, thickness: 0.1 })
    // side walls under the lean-to
    for (const x of [SAC.x0, SAC.x1]) {
      const s = new THREE.Shape([new THREE.Vector2(0, SAC.eave), new THREE.Vector2(SAC.z1 - SAC.z0, SAC.eave), new THREE.Vector2(SAC.z1 - SAC.z0, yh - 0.1)])
      b.add('calvStone', extrude(s, 0.6), mat(x - 0.3, 0, SAC.z0, -Math.PI / 2))
    }
    b.beam(CU, V(SAC.x0 - 0.3, yl - 0.08, zl - 0.08), V(SAC.x1 + 0.3, yl - 0.08, zl - 0.08), 0.2, 0.18)
    b.rod(CU, V(SAC.x1 + 0.1, 0.3, zl), V(SAC.x1 + 0.1, yl - 0.1, zl), 0.055, 8)
    for (const x of [7.6, 11.2]) lancet(b, mat(x, 0, SAC.z0, Math.PI), 0.9, 2.2, 2.0, 1)
  }

  /* ================= roofs (new copper, client rule) ================= */
  {
    const eY = NAVE.eave - ov * T
    const nhw = NAVE.hw + ov
    const xa = NAVE.x0 + 0.85
    const xb = NAVE.x1 - 0.85
    facet(b, CU, [V(xa, eY, ZC + nhw), V(xb, eY, ZC + nhw), V(xb, NRIDGE, ZC), V(xa, NRIDGE, ZC)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(xb, eY, ZC - nhw), V(xa, eY, ZC - nhw), V(xa, NRIDGE, ZC), V(xb, NRIDGE, ZC)], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(xa, NRIDGE + 0.07, ZC), V(xb, NRIDGE + 0.07, ZC), 0.3, 0.18)
    for (const sz of [-1, 1]) {
      b.beam(CU, V(NAVE.x0 - 0.1, eY - 0.1, ZC + sz * (nhw + 0.08)), V(NAVE.x1 + 0.1, eY - 0.1, ZC + sz * (nhw + 0.08)), 0.22, 0.2)
      for (const x of [NAVE.x0 + 0.5, NAVE.x1 - 0.6]) b.rod(CU, V(x, 0.4, ZC + sz * (NAVE.hw + 0.25)), V(x, eY - 0.15, ZC + sz * (NAVE.hw + 0.25)), 0.06, 8)
    }
  }
  {
    const eY = CHOIR.eave - ov * T
    const chw = CHOIR.hw + ov
    const rcO = RC * (chw / CHOIR.hw)
    const apex = V(XC, CRIDGE, ZC)
    const cx0 = CHOIR.x0 + 0.05
    const vS = apsePt(67.5, rcO, eY)
    const vN = apsePt(-67.5, rcO, eY)
    facet(b, CU, [V(cx0, eY, ZC + chw), vS, apex, V(cx0, CRIDGE, ZC)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [vN, V(cx0, eY, ZC - chw), V(cx0, CRIDGE, ZC), apex], { seams: SEAM, thickness: 0.12 })
    const angs = [67.5, 22.5, -22.5, -67.5]
    for (let i = 0; i < 3; i++) facet(b, CU, [apsePt(angs[i], rcO, eY), apsePt(angs[i + 1], rcO, eY), apex], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(cx0, CRIDGE + 0.07, ZC), V(apex.x, CRIDGE + 0.07, ZC), 0.28, 0.18)
    for (const a of angs) b.beam(CU, apsePt(a, rcO, eY + 0.08), V(apex.x, apex.y + 0.08, ZC), 0.24, 0.15)
    // gutters around choir + apse, downpipes
    const gut = [V(cx0, eY - 0.1, ZC + chw + 0.08), apsePt(67.5, rcO + 0.08, eY - 0.1), apsePt(22.5, rcO + 0.08, eY - 0.1), apsePt(-22.5, rcO + 0.08, eY - 0.1), apsePt(-67.5, rcO + 0.08, eY - 0.1), V(cx0, eY - 0.1, ZC - chw - 0.08)]
    for (let i = 0; i < gut.length - 1; i++) b.beam(CU, gut[i], gut[i + 1], 0.2, 0.18)
    for (const a of [67.5, -22.5]) {
      const p = apsePt(a, RC + 0.3, 0)
      b.rod(CU, V(p.x, 1.2, p.z), V(p.x, eY - 0.15, p.z), 0.06, 8)
    }
    // apex cross (photo 04)
    cross(b, 'iron', XC, CRIDGE + 0.1, ZC, 1.6, false, Math.PI / 2)
  }

  /* ================= buttresses ================= */
  for (const sz of [-1, 1]) {
    // west corners: two orthogonal buttresses each
    buttress(b, V(NAVE.x0 + 0.7, 0, ZC + sz * NAVE.hw), V(0, 0, sz), 1.0, 1.3, 10.5)
    buttress(b, V(NAVE.x0, 0, ZC + sz * (NAVE.hw - 0.7)), V(-1, 0, 0), 1.0, 1.3, 10.5)
    // mid-nave
    buttress(b, V(-8.4, 0, ZC + sz * NAVE.hw), V(0, 0, sz), 1.0, 1.2, 10.0)
  }
  // choir/apse junction (south, photo 04)
  buttress(b, V(XV - 0.4, 0, ZC + CHOIR.hw), V(0, 0, 1), 0.95, 1.1, 9.5)

  /* ================= windows ================= */
  for (const sz of [-1, 1]) {
    const ry = sz > 0 ? 0 : Math.PI
    for (const x of [-12.8, -3.6]) lancet(b, mat(x, 0, ZC + sz * NAVE.hw, ry), 1.9, 7.4, 5.6)
    if (sz > 0) for (const x of [6.0, 11.0]) lancet(b, mat(x, 0, ZC + sz * CHOIR.hw, ry), 1.6, 6.0, 5.2)
  }
  lancet(b, mat(3.6, 0, ZC - CHOIR.hw, Math.PI), 1.4, 5.0, 6.2) // north choir wall west of the sacristy
  for (const a of [45, 0, -45]) {
    const p = V(XC + CHOIR.hw * Math.cos(a * D2R), 0, ZC + CHOIR.hw * Math.sin(a * D2R))
    lancet(b, mat(p.x, 0, p.z, Math.PI / 2 - a * D2R), 1.5, 6.0, 5.2)
  }

  /* ================= west front (photos 02, 03) ================= */
  {
    const wm = (u: number) => mat(NAVE.x0, 0, ZC + u, -Math.PI / 2) // local x = u (→ +Z), local z → −X
    const m0 = wm(0)
    // portal
    b.add('calvDress', extrude(frameShape('pointed', 2.0, 3.7, 0.5, 0, 0.2), 0.3), m0)
    b.add('wood', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 2.0, 3.7, 0, 0.2, 10))), M(m0, mat(0, 0, 0.04)))
    b.add('calvDress', extrude(frameShape('pointed', 3.2, 5.4, 0.18, 0, 0.2), 0.42), m0)
    for (const u of [-1.75, 1.75]) {
      b.add('calvDress', metricBox(0.42, 6.6, 0.42), M(m0, mat(u, 3.4, 0.25)))
      b.add('calvDress', new THREE.ConeGeometry(0.34, 1.3, 4), M(m0, mat(u, 7.35, 0.25, Math.PI / 4)))
    }
    b.add('calvDress', new THREE.ConeGeometry(0.25, 1.1, 4), M(m0, mat(0, 6.2, 0.3, Math.PI / 4)))
    // statue on a console under a canopy
    b.add('calvDress', new THREE.CylinderGeometry(0.5, 0.25, 0.9, 8), M(m0, mat(0, 8.0, 0.4)))
    b.add('calvDress', new THREE.CylinderGeometry(0.28, 0.36, 1.9, 10), M(m0, mat(0, 9.4, 0.42)))
    b.add('calvDress', new THREE.SphereGeometry(0.2, 10, 8), M(m0, mat(0, 10.5, 0.42)))
    b.add('calvDress', new THREE.CylinderGeometry(0.25, 0.55, 1.0, 8), M(m0, mat(0, 11.4, 0.45)))
    b.add('calvDress', new THREE.ConeGeometry(0.3, 1.4, 6), M(m0, mat(0, 12.6, 0.45)))
    // two tall lancets, two small square windows, two gable slits
    for (const u of [-3.4, 3.4]) {
      lancet(b, wm(u), 1.7, 6.4, 6.6)
      b.add('calvDress', extrude(frameShape('rect', 0.6, 0.6, 0.15, 0, 2.6), 0.12), wm(u * 1.35))
      b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', 0.6, 0.6, 0, 2.6))), M(wm(u * 1.35), mat(0, 0, 0.04)))
    }
    for (const u of [-1.3, 1.3]) {
      b.add('calvDress', extrude(frameShape('pointed', 0.4, 2.6, 0.14, 0, 16.6), 0.12), wm(u))
      b.add('black', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.4, 2.6, 0, 16.6, 8))), M(wm(u), mat(0, 0, 0.04)))
    }
  }

  /* ================= bell turret (timber, 1922) ================= */
  {
    const tx = NAVE.x1 - 2.6
    const hw = 1.6
    const y0 = NRIDGE - 3.4
    const top = NRIDGE + 4.6
    b.block('calvBoards', 2 * hw, top - y0, 2 * hw, tx, y0, ZC)
    // vertical battens
    for (const [nx_, nz_] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let i = -4; i <= 4; i++) {
        const u = i * 0.36
        const x = tx + nx_ * (hw + 0.02) + (nz_ !== 0 ? u : 0)
        const z = ZC + nz_ * (hw + 0.02) + (nx_ !== 0 ? u : 0)
        b.block('calvBatten', nz_ !== 0 ? 0.07 : 0.05, top - y0, nz_ !== 0 ? 0.05 : 0.07, x, y0, z)
      }
      // louvred opening near the top
      const m = mat(tx + nx_ * (hw + 0.05), 0, ZC + nz_ * (hw + 0.05), Math.atan2(nx_, nz_))
      b.add('black', new THREE.PlaneGeometry(0.8, 1.6), M(m, mat(0, top - 1.75, 0.02)))
      for (let k = 0; k < 6; k++) b.add('calvBatten', metricBox(0.84, 0.05, 0.1), M(m, mat(0, top - 2.45 + k * 0.28, 0.06, 0, 0.5)))
      b.add('calvBatten', metricBox(1.0, 0.1, 0.12), M(m, mat(0, top - 0.88, 0.06)))
    }
    b.block('calvBatten', 2 * hw + 0.3, 0.18, 2 * hw + 0.3, tx, top - 0.18, ZC)
    // steep saddle roof, ridge across the nave (along Z), spires at both ridge ends
    const o = 0.3
    const rt = Math.tan(62 * D2R)
    const ey = top - o * rt
    const ry = top + hw * rt
    const za = ZC - hw - o
    const zb = ZC + hw + o
    const tS = seams(CU, 0.45, 0.04, 0.04)
    facet(b, CU, [V(tx - hw - o, ey, zb), V(tx - hw - o, ey, za), V(tx, ry, za), V(tx, ry, zb)], { seams: tS, thickness: 0.08 })
    facet(b, CU, [V(tx + hw + o, ey, za), V(tx + hw + o, ey, zb), V(tx, ry, zb), V(tx, ry, za)], { seams: tS, thickness: 0.08 })
    // boarded gable triangles
    const g = new THREE.Shape([new THREE.Vector2(-hw, top - 0.01), new THREE.Vector2(hw, top - 0.01), new THREE.Vector2(0, ry - 0.1)])
    for (const sz of [-1, 1]) {
      b.add('calvBoards', extrude(g, 0.2), mat(tx, 0, sz > 0 ? ZC + hw - 0.2 : ZC - hw))
      b.add('black', new THREE.PlaneGeometry(0.5, 0.9), mat(tx, top + 1.0, ZC + sz * (hw + 0.01), sz > 0 ? 0 : Math.PI))
    }
    // needle spires
    for (const z of [za + 0.25, zb - 0.25]) {
      const base = ry - 1.6
      const tip = ry + 4.4
      b.add(CU, new THREE.CylinderGeometry(0.02, 0.62, tip - base, 4, 1), mat(tx, (base + tip) / 2, z, Math.PI / 4))
      b.add(CU, metricBox(0.9, 0.12, 0.9), mat(tx, base + 0.4, z))
      cross(b, 'iron', tx, tip - 0.1, z, 1.3, false, Math.PI / 2)
    }
    b.beam(CU, V(tx, ry + 0.06, za + 0.5), V(tx, ry + 0.06, zb - 0.5), 0.2, 0.12)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [-8, 20, ZC + 4],
  materials: () => ({
    calvStone: new THREE.MeshStandardMaterial({ color: '#cdb98f', roughness: 0.9 }),
    calvDress: new THREE.MeshStandardMaterial({ color: '#dccaa2', roughness: 0.85 }),
    calvBoards: new THREE.MeshStandardMaterial({ color: '#6f675d', roughness: 0.9 }),
    calvBatten: new THREE.MeshStandardMaterial({ color: '#5b544b', roughness: 0.9 }),
  }),
  notes:
    'Gothic choir with 5/8 apse and 19th-century nave in sandstone, steep roofs and the timber bell turret with twin spires; roofs shown in new copper per the COLOR METAL register (photos predate the 2026 works).',
}
export default model
