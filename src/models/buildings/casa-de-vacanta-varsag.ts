/**
 * Holiday house, Vărșag (Székelyvarság), Harghita — PREFA coated aluminium roof.
 *
 * Modelling specification derived from COLOR METAL's own photographs of the
 * finished house (public company post, 2 Sept.; drone views incl. one vertical
 * shot, gable elevation, roof close-ups) and the earlier construction photos of
 * the archive. Real metres; no OSM outline (private house, village-level only):
 *  - Nearly square main volume ≈ 12.4 m (along the ridge, +X) × 11.4 m (span):
 *    in the vertical drone shot the roof outline is ≈ 270 × 290 px with ≈ 24
 *    standing-seam pans (≈ 0.55 m) along the eave.
 *  - Light-grey rendered ground storey (≈ 2.85 m, fully exposed on the downhill
 *    side), a larch-clad upper storey up to the eave (≈ 5.75 m) and an attic in
 *    the roof; vertical larch battens ≈ 11 cm apart on a dark backing, light
 *    aluminium drip flashings at both storey lines, deep light-grey metal window
 *    surrounds, anthracite frames.
 *  - Symmetrical gable roof, pitch ≈ 42°, slim overhangs (eave ≈ 0.38 m, verge
 *    ≈ 0.32 m), light-grey PREFA standing seam (as photographed — the register
 *    lists PREFA bronze), one transverse joint and one row of tube snow guards
 *    per slope, half-round gutters with downpipes, black stainless flue near the
 *    ridge, lightning-rod mast with tripod on the ridge.
 *  - Downhill gable (+X): recessed attic loggia in the left corner under the
 *    rake (≈ 3.8 × 2.6 m) with a slatted larch balustrade.
 *  - Carport / covered walkway on the uphill long side (−Z): ≈ 9.4 × 6.4 m,
 *    larch posts, extensive sedum green roof edged by a sage-grey metal fascia
 *    with a pressed fan ornament on its outer face; round hot tub beside it.
 * Approximations: absolute size (pans and vehicles as scale), storey heights,
 * opening positions on the façades not seen in the photographs, orientation
 * (unknown), terrain (shown flat — the site slopes down towards the loggia gable).
 */
import * as THREE from 'three'
import { Builder, V, extrude, facet, faceFrame, mat, metricBox, seams, window_, door } from '../kit'
import type { Face } from '../kit'
import type { ModelModule } from '../registry'

const L = 12.4 // along X (ridge)
const W = 11.4 // along Z (span)
const HX = L / 2
const HZ = W / 2
const BASE = 2.85 // top of the rendered ground storey
const EAVE = 5.75 // top of the timber-clad walls
const PITCH = 42
const T = Math.tan((PITCH * Math.PI) / 180)
const RT = 0.28 // roof build-up thickness (vertical)
const OV_E = 0.38
const OV_G = 0.32
const ROOF = 'varsagRoof'
const SEAM = seams(ROOF, 0.55, 0.045, 0.035)
const LZ0 = 1.9 // loggia: z ∈ [LZ0, HZ] on the +X gable
const LX = 2.6 // loggia depth

const yTop = (d: number) => EAVE + RT + (HZ - d) * T
const RIDGE = yTop(0)

/* battens */
const BW = 0.05
const BD = 0.032
const SP = 0.11
interface Op { u: number; y0: number; w: number; h: number }

function build(): Builder {
  const b = new Builder()
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

  /** vertical larch battens on a face between u0..u1, from yBot to top(u), interrupted by openings */
  const battens = (face: Face, plane: number, u0: number, u1: number, yBot: number, top: (u: number) => number, ops: Op[] = []) => {
    for (let u = u0 + SP / 2; u < u1 - 0.02; u += SP) {
      const yt = top(u)
      if (yt - yBot < 0.06) continue
      let segs: [number, number][] = [[yBot, yt]]
      for (const o of ops) {
        if (Math.abs(u - o.u) > o.w / 2 + 0.09) continue
        const c0 = o.y0 - 0.1
        const c1 = o.y0 + o.h + 0.09
        segs = segs.flatMap(([a, z]): [number, number][] => (z <= c0 || a >= c1 ? [[a, z]] : ([[a, Math.min(z, c0)], [Math.max(a, c1), z]] as [number, number][]).filter(([p, q]) => q - p > 0.06)))
      }
      const key = rnd() < 0.5 ? 'varsagTimber' : 'varsagTimber2'
      for (const [a, z] of segs) b.add(key, metricBox(BW, z - a, BD), faceFrame(face, plane, u, (a + z) / 2, BD / 2))
    }
  }

  /** window in the timber cladding: anthracite frame, glass and a deep light-grey metal surround */
  const win = (face: Face, plane: number, o: Op, bars?: [number, number]) => {
    window_(b, face, plane, o.u, o.y0, { w: o.w, h: o.h, glassKey: 'glassC', frameKey: 'varsagFrame', frame: 0.07, bars, inset: 0.02 })
    const t = 0.05
    const dp = 0.12
    const f = (u: number, v: number, w: number, h: number) => b.add('varsagFlash', metricBox(w, h, dp), faceFrame(face, plane, u, v, dp / 2))
    f(o.u, o.y0 + o.h + 0.07 + t / 2, o.w + 0.28, t)
    f(o.u - o.w / 2 - 0.07 - t / 2, o.y0 + o.h / 2, t, o.h + 0.14)
    f(o.u + o.w / 2 + 0.07 + t / 2, o.y0 + o.h / 2, t, o.h + 0.14)
    b.add('varsagFlash', metricBox(o.w + 0.34, 0.04, 0.2), faceFrame(face, plane, o.u, o.y0 - 0.09, 0.1)) // sill
  }
  /** window in the rendered storey: frame + metal sill only */
  const winP = (face: Face, plane: number, o: Op, bars?: [number, number]) => {
    window_(b, face, plane, o.u, o.y0, { w: o.w, h: o.h, glassKey: 'glassC', frameKey: 'varsagFrame', frame: 0.07, bars, inset: 0.02 })
    b.add('varsagFlash', metricBox(o.w + 0.16, 0.04, 0.16), faceFrame(face, plane, o.u, o.y0 - 0.06, 0.08))
  }

  /* ---------------- volumes ---------------- */
  b.block('varsagSocle', L + 0.06, 0.32, W + 0.06, 0, 0, 0)
  b.block('varsagPlaster', L, BASE - 0.32, W, 0, 0.32, 0)
  b.block('varsagBack', L - 0.02, EAVE - BASE, W - 0.02, 0, BASE, 0)
  // drip flashings at the storey line and along the gables at eave level
  b.block('varsagFlash', L + 0.12, 0.06, W + 0.12, 0, BASE - 0.02, 0)
  for (const s of [-1, 1]) b.block('varsagFlash', 0.1, 0.05, W + 0.1, s * (HX + 0.02), EAVE - 0.02, 0)

  // gable backing walls (shape x = −z after the π/2 rotation)
  const gh = HZ * T
  const P = (z: number, y: number) => new THREE.Vector2(-z, y)
  const rear = new THREE.Shape([P(-HZ, 0), P(HZ, 0), P(0, gh)])
  b.add('varsagBack', extrude(rear, 0.3), mat(-HX, EAVE - 0.01, 0, Math.PI / 2))
  const hL = (HZ - LZ0) * T
  const front = new THREE.Shape([P(-HZ, 0), P(LZ0, 0), P(LZ0, hL), P(0, gh)])
  b.add('varsagBack', extrude(front, 0.3), mat(HX - 0.3, EAVE - 0.01, 0, Math.PI / 2))
  // loggia: back wall, side wall, deck
  const lback = new THREE.Shape([P(LZ0, 0), P(HZ, 0), P(LZ0, hL)])
  b.add('varsagBack', extrude(lback, 0.3), mat(HX - LX - 0.3, EAVE - 0.01, 0, Math.PI / 2))
  b.block('varsagBack', LX, hL, 0.3, HX - LX / 2, EAVE - 0.01, LZ0 - 0.15)
  b.block('varsagDeck', LX, 0.07, HZ - LZ0, HX - LX / 2, EAVE, (LZ0 + HZ) / 2)

  /* ---------------- openings ---------------- */
  const yW = 3.55
  // +X gable (u = −z)
  const pxT: Op[] = [{ u: -3.6, y0: yW, w: 0.9, h: 1.25 }, { u: -0.9, y0: yW, w: 0.9, h: 1.25 }, { u: 2.4, y0: yW, w: 1.1, h: 1.25 }]
  const pxA: Op[] = [{ u: 0.3, y0: 6.15, w: 0.85, h: 1.55 }, { u: 3.3, y0: 6.25, w: 0.55, h: 0.85 }]
  pxT.forEach((o) => win('+x', HX, o))
  pxA.forEach((o) => win('+x', HX, o))
  door(b, '+x', HX, -0.6, { w: 1.0, h: 2.2, y0: 0.32, leafKey: 'varsagFrame', frameKey: 'varsagFlash', frame: 0.06 })
  for (const u of [-3.0, 2.6]) winP('+x', HX, { u, y0: 1.0, w: 1.4, h: 1.2 }, [2, 1])
  // loggia glazing on its back wall
  const lgW: Op = { u: -(LZ0 + HZ) / 2 - 0.1, y0: EAVE + 0.12, w: 2.0, h: 2.05 }
  window_(b, '+x', HX - LX, lgW.u, lgW.y0, { w: lgW.w, h: lgW.h, glassKey: 'glassC', frameKey: 'varsagFrame', frame: 0.07, bars: [2, 1], inset: 0.02 })
  // −X gable (u = z)
  const nxT: Op[] = [{ u: -3.0, y0: yW, w: 1.0, h: 1.25 }, { u: 0.4, y0: yW, w: 1.0, h: 1.25 }, { u: 3.2, y0: yW, w: 0.9, h: 1.25 }]
  const nxA: Op[] = [{ u: -1.5, y0: 6.2, w: 0.9, h: 1.3 }, { u: 1.5, y0: 6.2, w: 0.9, h: 1.3 }, { u: 0, y0: 8.55, w: 0.6, h: 0.6 }]
  nxT.forEach((o) => win('-x', -HX, o))
  nxA.forEach((o) => win('-x', -HX, o))
  for (const u of [-1.5, 2.6]) winP('-x', -HX, { u, y0: 1.0, w: 1.2, h: 1.2 }, [2, 1])
  // +Z long side (u = x)
  const pzT: Op[] = [{ u: -4.2, y0: yW, w: 1.25, h: 1.25 }, { u: -0.8, y0: yW, w: 1.25, h: 1.25 }, { u: 3.0, y0: yW, w: 1.8, h: 1.25 }]
  pzT.forEach((o) => win('+z', HZ, o, o.w > 1.5 ? [2, 1] : undefined))
  winP('+z', HZ, { u: -3.5, y0: 1.0, w: 1.2, h: 1.2 }, [2, 1])
  winP('+z', HZ, { u: 1.5, y0: 0.9, w: 2.2, h: 1.3 }, [2, 1])
  // −Z long side (u = −x): walkway side with the entrance
  const nzT: Op[] = [{ u: 3.6, y0: 3.85, w: 1.3, h: 0.95 }, { u: 1.0, y0: 3.85, w: 1.3, h: 0.95 }, { u: -3.4, y0: yW, w: 1.0, h: 1.25 }]
  nzT.forEach((o) => win('-z', -HZ, o))
  door(b, '-z', -HZ, 2.2, { w: 1.0, h: 2.25, y0: 0.32, leafKey: 'varsagFrame', frameKey: 'varsagFlash', frame: 0.06 })
  winP('-z', -HZ, { u: -1.8, y0: 1.0, w: 1.2, h: 1.2 }, [2, 1])
  winP('-z', -HZ, { u: 5.0, y0: 1.4, w: 0.8, h: 0.9 })

  /* ---------------- larch cladding ---------------- */
  const y0 = BASE + 0.05
  const y1 = EAVE - 0.03
  battens('+z', HZ, -HX, HX, y0, () => y1, pzT)
  battens('-z', -HZ, -HX, HX, y0, () => y1, nzT)
  battens('+x', HX, -HZ, HZ, y0, () => y1, pxT)
  battens('-x', -HX, -HZ, HZ, y0, () => y1, nxT)
  const rake = (z: number) => EAVE + (HZ - Math.abs(z)) * T - 0.03
  battens('-x', -HX, -HZ, HZ, EAVE + 0.04, (u) => rake(u), nxA)
  battens('+x', HX, -HZ, HZ, EAVE + 0.04, (u) => (-u > LZ0 - 0.02 ? 0 : rake(-u)), pxA)
  battens('+x', HX - LX, -HZ, -LZ0, EAVE + 0.08, (u) => rake(-u), [lgW])
  battens('+z', LZ0, HX - LX, HX, EAVE + 0.08, () => EAVE + hL - 0.04)

  // loggia balustrade: slatted larch between two rails
  {
    const za = LZ0 + 0.06
    const zb = HZ - 0.08
    const yb = EAVE + 0.07
    for (let z = za + 0.05; z < zb; z += 0.1) b.add('varsagTimber', metricBox(0.04, 1.0, 0.05), mat(HX - 0.06, yb + 0.5, z))
    b.add('varsagTimber2', metricBox(0.09, 0.06, zb - za), mat(HX - 0.06, yb + 1.03, (za + zb) / 2))
    b.add('varsagTimber2', metricBox(0.09, 0.05, zb - za), mat(HX - 0.06, yb + 0.06, (za + zb) / 2))
  }

  /* ---------------- roof (PREFA standing seam) ---------------- */
  const xa = -HX - OV_G
  const xb = HX + OV_G
  const ze = HZ + OV_E
  const ye = yTop(ze)
  for (const s of [-1, 1]) {
    facet(b, ROOF, [V(xa, ye, s * ze), V(xb, ye, s * ze), V(xb, RIDGE, 0), V(xa, RIDGE, 0)], { seams: SEAM, hint: V(0, 1, s) })
    facet(b, 'varsagSoffit', [V(xa, ye - RT, s * ze), V(xb, ye - RT, s * ze), V(xb, RIDGE - RT, 0), V(xa, RIDGE - RT, 0)], { hint: V(0, -1, -s * 0.2) })
    b.add(ROOF, metricBox(xb - xa + 0.02, RT + 0.05, 0.035), mat(0, ye - RT / 2 + 0.01, s * (ze + 0.018)))
    for (const x of [xa, xb]) {
      b.beam(ROOF, V(x, ye - RT / 2 + 0.02, s * ze), V(x, RIDGE - RT / 2 + 0.02, 0), 0.045, RT + 0.08)
      facet(b, ROOF, [V(x, ye, s * ze), V(x, RIDGE, 0), V(x, RIDGE - RT, 0), V(x, ye - RT, s * ze)], { hint: V(Math.sign(x), 0, 0) })
    }
    // transverse joint at ≈ 1/3 of the slope and one row of tube snow guards below it
    const at = (d: number, lift: number) => yTop(d) + lift
    const dJ = ze * 0.64
    b.beam(ROOF, V(xa + 0.05, at(dJ, 0.012), s * dJ), V(xb - 0.05, at(dJ, 0.012), s * dJ), 0.035, 0.03, V(0, 1, s * T).normalize())
    const dS = dJ + 0.55
    const yS = at(dS, 0.1)
    for (const dz of [0, 0.075]) b.rod('helm', V(xa + 0.1, yS + dz * 0.62, s * (dS - dz)), V(xb - 0.1, yS + dz * 0.62, s * (dS - dz)), 0.016, 6)
    for (let x = xa + 0.35; x < xb - 0.2; x += 1.1) b.beam('helm', V(x, yTop(dS) + 0.02, s * dS), V(x, yS + 0.06, s * (dS - 0.03)), 0.035, 0.03)
    // half-round gutter and downpipes
    const gz = s * (ze + 0.1)
    const gy = ye - RT - 0.02
    b.rod('varsagFlash', V(xa + 0.02, gy, gz), V(xb - 0.02, gy, gz), 0.075, 10)
    for (const x of [xa + 0.3, xb - 0.3]) {
      b.rod('varsagFlash', V(x, gy - 0.05, gz), V(x, gy - 0.45, s * (HZ + 0.08)), 0.045, 8)
      b.rod('varsagFlash', V(x, gy - 0.45, s * (HZ + 0.08)), V(x, 0.15, s * (HZ + 0.08)), 0.045, 8)
    }
  }
  b.block(ROOF, xb - xa + 0.04, 0.08, 0.36, 0, RIDGE - 0.02, 0)
  b.block(ROOF, xb - xa + 0.04, 0.05, 0.26, 0, RIDGE + 0.06, 0)

  /* ---------------- flue, vent, lightning rod ---------------- */
  {
    const x = -1.0
    const d = 0.75
    const yb = yTop(d)
    b.add('varsagDark', new THREE.CylinderGeometry(0.12, 0.12, RIDGE + 1.25 - yb, 18), mat(x, (yb + RIDGE + 1.25) / 2, d))
    b.add(ROOF, new THREE.CylinderGeometry(0.16, 0.28, 0.34, 18), mat(x, yb + 0.1, d))
    b.add('varsagDark', new THREE.CylinderGeometry(0.15, 0.13, 0.12, 18), mat(x, RIDGE + 1.3, d))
    const vd = 1.5
    b.add('varsagDark', new THREE.CylinderGeometry(0.06, 0.06, 0.65, 12), mat(-0.35, yTop(vd) + 0.28, vd))
    // mast with a tripod on the ridge near the uphill gable
    const mx = -HX + 1.6
    b.rod('helm', V(mx, RIDGE + 0.1, 0), V(mx, RIDGE + 3.4, 0), 0.022, 8)
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) b.rod('helm', V(mx + Math.cos(a) * 0.55, RIDGE + 0.05 - Math.abs(Math.sin(a)) * 0.45, Math.sin(a) * 0.55), V(mx, RIDGE + 0.85, 0), 0.014, 6)
  }

  /* ---------------- AC unit on the downhill long side ---------------- */
  b.add('varsagAC', metricBox(0.85, 0.62, 0.32), mat(HX - 1.4, 0.65, HZ + 0.2))
  b.add('varsagDark', new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), mat(HX - 1.55, 0.65, HZ + 0.37).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)))

  /* ---------------- carport / covered walkway with green roof ---------------- */
  {
    const X0 = -HX - 1.4
    const X1 = X0 + 9.4
    const CZ0 = -HZ - 0.6
    const CZ1 = CZ0 - 6.4
    const yT = 3.05
    const FH = 0.42
    const cx = (X0 + X1) / 2
    const cz = (CZ0 + CZ1) / 2
    const lx = X1 - X0
    const lz = CZ0 - CZ1
    // roof slab + sage metal fascia
    b.block('varsagBack', lx - 0.1, FH - 0.08, lz - 0.1, cx, yT - FH + 0.04, cz)
    b.block('varsagFascia', lx, FH, 0.05, cx, yT - FH, CZ0 - 0.025)
    b.block('varsagFascia', lx, FH, 0.05, cx, yT - FH, CZ1 + 0.025)
    b.block('varsagFascia', 0.05, FH, lz, X0 + 0.025, yT - FH, cz)
    b.block('varsagFascia', 0.05, FH, lz, X1 - 0.025, yT - FH, cz)
    b.block('varsagFascia', lx + 0.04, 0.04, 0.12, cx, yT, CZ0 - 0.04)
    b.block('varsagFascia', lx + 0.04, 0.04, 0.12, cx, yT, CZ1 + 0.04)
    b.block('varsagFascia', 0.12, 0.04, lz, X0 + 0.04, yT, cz)
    b.block('varsagFascia', 0.12, 0.04, lz, X1 - 0.04, yT, cz)
    // panel joints on the fascia
    for (let x = X0 + 1.18; x < X1 - 0.3; x += 1.18) for (const z of [CZ0 + 0.01, CZ1 - 0.01]) b.add('varsagFascia', metricBox(0.03, FH, 0.03), mat(x, yT - FH / 2, z))
    // pressed fan ornament on the outer face (face −z: model x = −u)
    {
      const base = faceFrame('-z', CZ1 - 0.0, -cx, 0, 0)
      for (let i = -4; i <= 4; i++) {
        const a = (i * 13 * Math.PI) / 180
        const len = 0.34 - Math.abs(i) * 0.012
        const m = new THREE.Matrix4().multiplyMatrices(base, mat(0, yT - FH + 0.04, 0.0)).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(mat(0, len / 2, 0.012))
        b.add('varsagFascia', metricBox(0.045, len, 0.024), m)
      }
    }
    // sedum surface in patches
    for (let x = X0 + 0.12; x < X1 - 0.12; x += 0.62) {
      for (let z = CZ1 + 0.12; z < CZ0 - 0.12; z += 0.62) {
        const w = Math.min(0.62, X1 - 0.12 - x)
        const d = Math.min(0.62, CZ0 - 0.12 - z)
        b.add(rnd() < 0.55 ? 'varsagSedum' : 'varsagSedum2', metricBox(w, 0.05 + rnd() * 0.04, d), mat(x + w / 2, yT - 0.02, z + d / 2))
      }
    }
    // larch posts
    for (const z of [CZ0 - 0.14, CZ1 + 0.14]) for (let i = 0; i < 4; i++) b.block('varsagTimber', 0.15, yT - FH, 0.15, X0 + 0.2 + (i * (lx - 0.4)) / 3, 0, z)
    // round hot tub beside the carport
    b.add('varsagTub', new THREE.CylinderGeometry(1.0, 1.0, 0.95, 28), mat(X1 + 1.2, 0.475, CZ0 - 1.5))
    b.add('varsagDark', new THREE.CylinderGeometry(1.02, 1.02, 0.06, 28), mat(X1 + 1.2, 0.98, CZ0 - 1.5))
  }

  return b
}

const model: ModelModule = {
  build,
  front: [1, 0],
  materialFocus: [1.5, 8.6, 2.6],
  materials: (base) => {
    const alu = (color: string, metalness: number, roughness: number) => {
      const m = (base.aluNatural as THREE.MeshStandardMaterial).clone()
      m.color.set(color)
      m.metalness = metalness
      m.roughness = roughness
      return m
    }
    const std = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    return {
      varsagRoof: alu('#b9bdbc', 0.5, 0.46),
      varsagFlash: alu('#b3b7b8', 0.55, 0.42),
      varsagFascia: alu('#8b9686', 0.35, 0.5),
      varsagSocle: std('#77746f', 0.92),
      varsagBack: std('#3a2618', 0.92),
      varsagTimber: std('#a6652f', 0.74),
      varsagTimber2: std('#8f5427', 0.76),
      varsagDeck: std('#8a5a32', 0.8),
      varsagSoffit: std('#9c6a3c', 0.85),
      varsagFrame: std('#34373b', 0.55, 0.2),
      varsagDark: std('#222326', 0.4, 0.6),
      // darker than the photo swatch: the top faces get the full key light
      varsagSedum: std('#4a661c', 1),
      varsagSedum2: std('#5d7b24', 1),
      varsagPlaster: (() => {
        const p = (base.plasterGrey as THREE.MeshStandardMaterial).clone()
        p.color.set('#b3ada3')
        return p
      })(),
      varsagTub: std('#4a3a2c', 0.85),
      varsagAC: std('#dcdbd6', 0.6),
    }
  },
  notes: 'Size, roof pitch and storey heights scaled from the drone photographs (no outline available); façades not seen in the photographs are interpreted.',
}
export default model
