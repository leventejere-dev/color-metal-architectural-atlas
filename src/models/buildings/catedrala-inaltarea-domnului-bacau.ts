/**
 * Catedrala „Înălțarea Domnului”, Bacău (Bd. Unirii, OSM way 164832003) — large
 * modern Byzantine-revival cathedral (built 1991–2018): cream stone-clad cross plan
 * with a central drum and dome, two west bell towers, a narthex dome, barrel-vaulted
 * arms with huge semicircular gables framing half-domed exedrae; all domes, half-domes
 * and roofs in copper, dark brown as photographed (copper supplied by COLOR METAL
 * according to its records).
 *
 * Modelling specification (real metres; origin = outline centre at ground):
 *  - Axis: OSM outline 76.2 × 43.9 m at 76.9°; +X points ENE to the altar apse, the
 *    west front (porch) at −X, +Z = 166.9° = the south side seen in photos 01–03.
 *  - Plan after the OSM outline: west porch (x −38 … −35), west block 9 m deep with
 *    the two corner bell towers (≈ 8.5 m square) and a central narthex dome; nave
 *    with side aisles (36 m wide); crossing (≈ 23.6 m square tower base); lateral
 *    exedrae r ≈ 6.4 m on N and S; east corner blocks and the altar apse r ≈ 6.3 m.
 *  - Heights (ro.wikipedia: 70 m to the top of the 7 m main cross; photo 01 scaled
 *    with that total): lower cornice ≈ 19 m; barrel-vaulted arms with semicircular
 *    gables to ≈ 29 m; crossing base with three arched gables per face to ≈ 37 m;
 *    16-sided drum (Ø ≈ 14.5 m) with tall arched windows to ≈ 48 m; ribbed dome to
 *    ≈ 60 m, lantern ≈ 63 m, cross 70 m. West towers ≈ 35.5 m (shaft), round belfry
 *    with arched openings, small dome, cross ≈ 45 m. Narthex dome ≈ 29.5 m.
 *  - Half-domes over the exedrae and the altar apse, glazed lunettes between them and
 *    the gable arches (photos 02, 03); lean-to copper roofs over the aisles below the
 *    clerestory, low nave roof.
 * Approximations: the west front and the north side are not photographed (north
 * mirrored from the south, west front interpreted); window rhythm, balconies and
 * cladding courses simplified; the exact plan of the upper volumes is interpreted.
 * The domes and roofs are dark oxidised copper in the photographs (2019, 2026);
 * shown as photographed (copperBrown, darkened).
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, polyRing, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'bcCopper' // copperBrown darkened to the near-black oxidised tone of the photographs
const WALL = 'bcStone'
const TRIM = 'bcTrim'
const SEAM = seams(CU, 0.55, 0.06, 0.05)
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)
const at = (x: number, z: number, a: number) => mat(x, 0, z, Math.atan2(Math.cos(a), Math.sin(a)))

/* plan */
const XW = -35.2 // west block front
const XN0 = -23.4 // nave start
const XC = 14.1 // crossing centre
const CB = 11.8 // crossing base half size
const EX = { r: 6.4, z: 15.6 } // lateral exedrae (centre on the gable line)
const AP = { x: 31.8, r: 6.3 } // altar apse
const TOW = { x0: XW, x1: XW + 8.5, z0: 5.7, z1: 14.2 } // west towers (|z|)

/* heights */
const H = 19.0 // lower cornice
const SOCLE = 1.2

/** Lower block outline (CCW from +X towards +Z), grown by g. */
function lower(y: number, g = 0): THREE.Vector3[] {
  const p: THREE.Vector3[] = []
  const n = 14
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    p.push(V(AP.x + Math.cos(a) * (AP.r + g), y, Math.sin(a) * (AP.r + g)))
  }
  const half: [number, number][] = [
    [AP.x, 11.1],
    [34.2, 11.1],
    [34.2, 15.6],
    [30.0, 15.6],
    [30.0, 18.2],
    [24.4, 18.2],
    [24.4, 15.6],
    [XC + EX.r, 15.6],
  ]
  const south: THREE.Vector3[] = half.map(([x, z]) => V(x, y, z))
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI
    south.push(V(XC + Math.cos(a) * (EX.r + g), y, EX.z + Math.sin(a) * (EX.r + g)))
  }
  const west: [number, number][] = [
    [4.0, 15.6],
    [4.0, 18.0],
    [XN0, 18.0],
    [XN0, 15.6],
    [-26.2, 15.6],
    [-26.2, 14.2],
    [XW, 14.2],
  ]
  for (const [x, z] of west) south.push(V(x, y, z))
  // grow the straight parts outward (approximate: scale z and x extremes)
  const grown = south.map((v, i) => (i >= half.length && i <= half.length + n ? v : V(v.x + (v.x === XW ? -g : v.x === 34.2 ? g : 0), y, v.z + Math.sign(v.z) * g)))
  p.push(...grown)
  const north = grown.map((v) => V(v.x, y, -v.z)).reverse()
  p.push(...north)
  return p
}

function arched(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number, fill = 'glassC', f = 0.3) {
  b.add(fill, new THREE.ShapeGeometry(new THREE.Shape(opening('round', w, h, 0, y0, 10))), M(m, mat(0, 0, 0.02)))
  if (f > 0) b.add(TRIM, extrude(frameShape('round', w, h, f, 0, y0), 0.14), m)
}

/** Ribbed copper dome of radius r and rise h at (cx, y, cz). */
function dome(b: Builder, cx: number, y: number, cz: number, r: number, h: number, ribs: number, ribW = 0.12) {
  const prof: [number, number][] = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    prof.push([Math.max(0.05, r * Math.cos((t * Math.PI) / 2)), h * Math.sin((t * Math.PI) / 2)])
  }
  b.add(CU, lathe(prof, 48), mat(cx, y, cz))
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * Math.PI * 2
    for (let i = 0; i < prof.length - 2; i++) {
      const [r0, y0] = prof[i]
      const [r1, y1] = prof[i + 1]
      b.beam(CU, V(cx + Math.cos(a) * (r0 + ribW / 2), y + y0, cz + Math.sin(a) * (r0 + ribW / 2)), V(cx + Math.cos(a) * (r1 + ribW / 2), y + y1, cz + Math.sin(a) * (r1 + ribW / 2)), ribW, ribW * 0.8, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  return y + h
}

/** Half dome over a semicircular apse: centre (cx, cz), facing direction angle dir. */
function halfDome(b: Builder, cx: number, y: number, cz: number, r: number, h: number, dir: number, ribs: number) {
  const g = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI, 0, Math.PI / 2)
  // SphereGeometry phi 0..π spans +X→−X through −Z? orient so that the bulge faces dir
  b.add(CU, g, mat(cx, y, cz, Math.PI / 2 - dir, 0, 0, r, h, r))
  for (let k = 1; k < ribs; k++) {
    const a = dir - Math.PI / 2 + (k / ribs) * Math.PI
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * (Math.PI / 2)
      pts.push(V(cx + Math.cos(a) * (r * Math.cos(t) + 0.05), y + h * Math.sin(t), cz + Math.sin(a) * (r * Math.cos(t) + 0.05)))
    }
    for (let i = 0; i < 8; i++) b.beam(CU, pts[i], pts[i + 1], 0.09, 0.07, V(Math.cos(a), 0, Math.sin(a)))
  }
}

function build(): Builder {
  const b = new Builder()

  /* ================= lower block ================= */
  b.add(WALL, loft([lower(0), lower(H)], { capTop: true }))
  b.add('bcSocle', loft([lower(0, 0.12), lower(SOCLE, 0.12)], { capTop: true }))
  b.add(TRIM, loft([lower(H - 0.6, 0.05), lower(H - 0.3, 0.35), lower(H, 0.55)], { capTop: true, capBottom: true }))
  b.add(TRIM, loft([lower(10.6, 0.25), lower(11.0, 0.25)], { capTop: true, capBottom: true }))
  // cladding courses
  for (let y = 2.6; y < H - 1; y += 1.8) if (Math.abs(y - 10.8) > 0.6) b.add('bcJoint', loft([lower(y, 0.012), lower(y + 0.05, 0.012)], {}))

  /* ---------- south / north façade details (mirrored) ---------- */
  for (const s of [1, -1]) {
    const face = s > 0 ? Math.PI / 2 : -Math.PI / 2
    // aisle wall: pilasters, two window rows, balcony slabs
    for (let i = 0; i < 6; i++) {
      const x = XN0 + 2.3 + i * 4.4
      const m = at(x, s * 18.0, face)
      arched(b, m, 1.3, 3.2, 3.6, 'glassC', 0.25)
      b.add('glassC', metricBox(1.4, 4.2, 0.04), M(m, mat(0, 13.8, 0.02)))
      b.add(TRIM, extrude(frameShape('rect', 1.4, 4.2, 0.22, 0, 11.7), 0.12), m)
      b.add(TRIM, metricBox(0.9, H - SOCLE - 0.6, 0.35), M(m, mat(2.2, SOCLE + (H - SOCLE - 0.6) / 2, 0.17)))
    }
    // west block side wall with the tower: slit windows and a balcony
    {
      const m = at(-30.7, s * 14.2, face)
      for (const u of [-2.2, 0, 2.2]) b.add('glassC', metricBox(0.8, 6.0, 0.04), M(m, mat(u, 4.5, 0.02)))
      b.add(TRIM, metricBox(9.6, 0.4, 1.4), M(m, mat(0, 10.8, 0.7)))
      b.add(TRIM, metricBox(9.6, 1.1, 0.12), M(m, mat(0, 11.75, 1.35)))
      for (const u of [-3.4, -1.1, 1.1, 3.4]) b.add('glassC', metricBox(1.3, 4.6, 0.04), M(m, mat(u, 13.8, 0.02)))
    }
    // exedra wall: windows, portal
    for (let k = 0; k < 5; k++) {
      const a = (s > 0 ? 0 : Math.PI) + ((k + 0.5) / 5) * Math.PI
      const m = at(XC + Math.cos(a) * EX.r, s * EX.z + Math.sin(a) * EX.r, a)
      b.add('glassC', metricBox(1.1, 6.5, 0.04), M(m, mat(0, 11.8, 0.02)))
      if (k === 2) {
        arched(b, m, 3.2, 5.6, SOCLE, 'bcDoor', 0.45)
        b.add('gilt', extrude(frameShape('round', 3.2, 5.6, 0.2, 0, SOCLE), 0.18), M(m, mat(0, 0, 0.1)))
      } else b.add('glassC', metricBox(1.1, 5.0, 0.04), M(m, mat(0, 4.4, 0.02)))
    }
    // east corner block: tall windows
    {
      const m = at(27.2, s * 18.2, face)
      for (const u of [-1.4, 1.4]) b.add('glassC', metricBox(0.9, 11.0, 0.04), M(m, mat(u, 6.0, 0.02)))
    }
    // aisle lean-to roof rising to the clerestory
    const ye = H + 0.4
    const yt = 23.6
    facet(b, CU, [V(XN0 - 0.4, ye, s * 18.6), V(4.4, ye, s * 18.6), V(4.4, yt, s * CB), V(XN0 - 0.4, yt, s * CB)], { seams: SEAM, thickness: 0.15 })
  }

  /* ================= nave clerestory and roof ================= */
  {
    const x0 = XN0 - 0.5
    const x1 = XC - CB + 0.2
    const top = 27.5
    b.block(WALL, x1 - x0, top - H, 2 * CB, (x0 + x1) / 2, H, 0)
    b.block(TRIM, x1 - x0 + 0.6, 0.45, 2 * CB + 0.6, (x0 + x1) / 2, top - 0.45, 0)
    for (const s of [1, -1]) {
      for (let i = 0; i < 6; i++) {
        const x = x0 + 2.2 + i * ((x1 - x0 - 4.4) / 5)
        const m = at(x, s * CB, s > 0 ? Math.PI / 2 : -Math.PI / 2)
        b.add(TRIM, metricBox(1.6, top - 23.6, 0.3), M(m, mat(0, (top + 23.6) / 2, 0.15)))
        if (i < 5) b.add('glassC', metricBox(1.0, 2.2, 0.04), M(m, mat((x1 - x0 - 4.4) / 10, 24.4, 0.02)))
      }
    }
    const t = Math.tan((12 * Math.PI) / 180)
    const ye = top + 0.1
    const rt = ye + (CB + 0.4) * t
    facet(b, CU, [V(x0 - 0.4, ye, CB + 0.4), V(x1, ye, CB + 0.4), V(x1, rt, 0), V(x0 - 0.4, rt, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(x1, ye, -CB - 0.4), V(x0 - 0.4, ye, -CB - 0.4), V(x0 - 0.4, rt, 0), V(x1, rt, 0)], { seams: SEAM, thickness: 0.12 })
  }

  /* ================= barrel arms with semicircular gables ================= */
  const R = 10.0 // gable arch radius
  const barrel = (orient: 'z' | 'x', s: number) => {
    // barrel vault from the crossing base to the gable plane
    const n = 20
    const outer: THREE.Vector3[] = []
    const c0 = orient === 'z' ? CB - 0.2 : XC + CB - 0.2
    const c1 = orient === 'z' ? EX.z : AP.x
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      outer.push(V(Math.cos(a) * (R + 0.5), H + Math.sin(a) * (R + 0.5), 0))
    }
    for (let i = 0; i < n; i++) {
      const p = outer[i]
      const q = outer[i + 1]
      const P = (v: THREE.Vector3, d: number) => (orient === 'z' ? V(XC + v.x, v.y, s * d) : V(d, v.y, v.x))
      facet(b, CU, [P(p, c0), P(q, c0), P(q, c1 + 0.6), P(p, c1 + 0.6)], { seams: SEAM, hint: orient === 'z' ? V(p.x + q.x, p.y + q.y - 2 * H, 0) : V(0, p.y + q.y - 2 * H, p.x + q.x), thickness: 0.15 })
    }
    // gable wall: ring archivolt + glazed lunette
    const ring = new THREE.Shape()
    ring.moveTo(-R - 1.2, H)
    ring.absarc(0, H, R + 1.2, Math.PI, 0, true)
    ring.lineTo(R - 0.3, H)
    ring.absarc(0, H, R - 0.3, 0, Math.PI, false)
    ring.lineTo(-R - 1.2, H)
    const m = orient === 'z' ? at(XC, s * c1, s > 0 ? Math.PI / 2 : -Math.PI / 2) : at(c1, 0, 0)
    b.add(TRIM, extrude(ring, 1.4, 24), M(m, mat(0, 0, -0.7)))
    const lun = new THREE.Shape()
    lun.moveTo(-R + 0.3, H)
    lun.absarc(0, H, R - 0.3, Math.PI, 0, true)
    lun.lineTo(-R + 0.3, H)
    b.add('bcGlass', new THREE.ShapeGeometry(lun, 24), M(m, mat(0, 0, -0.6)))
    // glazing bars radiating
    for (let k = 1; k < 12; k++) {
      const a = (k / 12) * Math.PI
      b.add(TRIM, metricBox(0.12, R - 0.3, 0.1), M(m, mat(Math.cos(a) * (R - 0.3) * 0.5, H + Math.sin(a) * (R - 0.3) * 0.5, -0.5, 0, 0, a - Math.PI / 2)))
    }
  }
  for (const s of [1, -1]) barrel('z', s)
  barrel('x', 1)
  // half domes over the exedrae and the altar apse (in front of the glazed lunettes)
  for (const s of [1, -1]) halfDome(b, XC, H + 0.3, s * EX.z, EX.r + 0.55, 6.6, s > 0 ? Math.PI / 2 : -Math.PI / 2, 16)
  halfDome(b, AP.x, H + 0.3, 0, AP.r + 0.55, 6.4, 0, 16)
  // east corner blocks: flat copper caps
  for (const s of [1, -1]) {
    b.block(CU, 6.0, 0.3, 3.0, 27.2, H + 0.3, s * 16.9)
    b.block(CU, 4.6, 0.3, 4.9, 32.1, H + 0.3, s * 13.35)
  }

  /* ================= crossing tower ================= */
  {
    const y0 = H
    const y1 = 33.4
    b.block(WALL, 2 * CB, y1 - y0, 2 * CB, XC, y0, 0)
    b.block(TRIM, 2 * CB + 0.6, 0.5, 2 * CB + 0.6, XC, y1 - 0.5, 0)
    // three arched gables per face
    const wA = (2 * CB) / 3
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = at(XC + nx * CB, nz * CB, Math.atan2(nz, nx))
      for (let i = 0; i < 3; i++) {
        const u = -CB + wA * (i + 0.5)
        const g = new THREE.Shape()
        g.moveTo(u - wA / 2, y1)
        g.lineTo(u + wA / 2, y1)
        g.absarc(u, y1, wA / 2, 0, Math.PI, false)
        b.add(WALL, extrude(g, 0.8, 14), M(m, mat(0, 0, -0.8)))
        b.add(TRIM, extrude(frameShape('round', wA - 0.4, wA / 2 - 0.2, 0.35, u, y1), 0.12), M(m, mat(0, 0, 0)))
        b.add('glassC', metricBox(0.9, 3.0, 0.04), M(m, mat(u, y1 - 1.2, 0.02)))
        b.add(TRIM, metricBox(0.5, y1 - 29.8, 0.3), M(m, mat(u + wA / 2, (y1 + 29.8) / 2, 0.15)))
      }
      // copper capping on the gable arches
      for (let i = 0; i < 3; i++) {
        const u = -CB + wA * (i + 0.5)
        const cap = new THREE.Shape()
        cap.moveTo(u - wA / 2 - 0.15, y1)
        cap.absarc(u, y1, wA / 2 + 0.15, Math.PI, 0, true)
        cap.lineTo(u + wA / 2 - 0.05, y1)
        cap.absarc(u, y1, wA / 2 - 0.05, 0, Math.PI, false)
        b.add(CU, extrude(cap, 1.0, 14), M(m, mat(0, 0, -0.9)))
      }
    }
    // roof behind the gables
    b.block(CU, 2 * CB - 1.0, 0.3, 2 * CB - 1.0, XC, y1 + 0.6, 0)
    // 16-sided drum with tall arched windows
    const n = 16
    const ap = 7.25
    const Rd = ap / Math.cos(Math.PI / n)
    const yd0 = y1 + 0.6
    const yd1 = 48.0
    b.add(WALL, loft([polyRing(n, Rd, yd0, Math.PI / n, XC, 0), polyRing(n, Rd, yd1, Math.PI / n, XC, 0)], { capTop: true, flat: true }))
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      const m = at(XC + Math.cos(a) * ap, Math.sin(a) * ap, a)
      if (k % 2 === 0) arched(b, m, 1.4, 6.2, yd0 + 2.6, 'glassC', 0.22)
      else b.add('bcJoint', new THREE.CircleGeometry(0.45, 16), M(m, mat(0, yd1 - 1.6, 0.02)))
      const ac = a + Math.PI / n
      b.add(TRIM, metricBox(0.55, yd1 - yd0, 0.4), mat(XC + Math.cos(ac) * (Rd + 0.05), (yd0 + yd1) / 2, Math.sin(ac) * (Rd + 0.05), Math.PI / 2 - ac))
    }
    b.add(TRIM, loft([polyRing(n, Rd + 0.1, yd1 - 0.5, Math.PI / n, XC, 0), polyRing(n, Rd + 0.6, yd1 - 0.1, Math.PI / n, XC, 0), polyRing(n, Rd + 0.6, yd1 + 0.3, Math.PI / n, XC, 0)], { capTop: true, capBottom: true, flat: true }))
    // main dome with 16 major ribs and a ring, lantern, cross
    const top = dome(b, XC, yd1 + 0.3, 0, Rd + 0.2, 11.6, 16, 0.3)
    b.add(CU, new THREE.TorusGeometry(Rd + 0.15, 0.18, 6, 48), mat(XC, yd1 + 1.4, 0, 0, Math.PI / 2))
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2
      b.beam(CU, V(XC + Math.cos(a) * (Rd + 0.25), yd1 + 0.5, Math.sin(a) * (Rd + 0.25)), V(XC + Math.cos(a) * (Rd * 0.72), yd1 + 0.3 + 11.6 * 0.69, Math.sin(a) * (Rd * 0.72)), 0.05, 0.05, V(Math.cos(a), 0, Math.sin(a)))
    }
    const yl = top - 0.4
    b.add(WALL, new THREE.CylinderGeometry(1.7, 1.7, 2.4, 16), mat(XC, yl + 1.2, 0))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      b.add('glassC', metricBox(0.5, 1.4, 0.05), mat(XC + Math.cos(a) * 1.71, yl + 1.25, Math.sin(a) * 1.71, Math.PI / 2 - a))
    }
    dome(b, XC, yl + 2.4, 0, 2.0, 1.6, 8, 0.1)
    b.add('gilt', new THREE.SphereGeometry(0.45, 14, 10), mat(XC, yl + 4.3, 0))
    cross(b, 'gilt', XC, yl + 4.5, 0, 7.0 * 0.88, false, Math.PI / 2)
  }

  /* ================= west block, narthex dome, porch ================= */
  {
    // narthex dome on a square base between the towers
    const cx = (TOW.x0 + TOW.x1) / 2
    b.block(WALL, TOW.x1 - TOW.x0, 23.6 - H, 2 * TOW.z0, cx, H, 0)
    b.block(TRIM, TOW.x1 - TOW.x0 + 0.5, 0.4, 2 * TOW.z0 + 0.5, cx, 23.2, 0)
    b.add(WALL, new THREE.CylinderGeometry(4.6, 4.6, 1.2, 32), mat(cx, 24.2, 0))
    dome(b, cx, 24.8, 0, 4.75, 4.6, 16, 0.12)
    b.add('gilt', new THREE.SphereGeometry(0.3, 12, 8), mat(cx, 29.6, 0))
    cross(b, 'gilt', cx, 29.7, 0, 2.6, false, Math.PI / 2)
    // roof between the narthex base and the nave
    b.block(CU, XN0 - TOW.x1 + 0.6, 0.3, 2 * TOW.z1, (XN0 + TOW.x1) / 2, H + 0.3, 0)
    // west porch with a curved copper roof
    const px0 = -38.1
    b.block(WALL, XW - px0, 12.0, 17.4, (px0 + XW) / 2, 0, 0)
    b.block('bcSocle', XW - px0 + 1.5, SOCLE, 19.0, (px0 + XW) / 2 - 0.7, 0, 0)
    const n = 10
    const prof: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * (Math.PI / 2)
      prof.push(V(XW - Math.sin(t) * (XW - px0 + 0.5), 12.0 + Math.cos(t) * (H - 12.0), 0))
    }
    for (let i = 0; i < n; i++) facet(b, CU, [V(prof[i].x, prof[i].y, 9.2), V(prof[i + 1].x, prof[i + 1].y, 9.2), V(prof[i + 1].x, prof[i + 1].y, -9.2), V(prof[i].x, prof[i].y, -9.2)], { seams: SEAM, thickness: 0.12 })
    const mw = at(px0, 0, Math.PI)
    for (const u of [-5.4, 0, 5.4]) arched(b, M(mw, mat(u, 0, 0)), 2.8, 7.4, SOCLE, u === 0 ? 'bcDoor' : 'glassC', 0.35)
    // west front of the block: windows
    const mf = at(XW, 0, Math.PI)
    for (const u of [-3.5, 0, 3.5]) b.add('glassC', metricBox(1.4, 4.6, 0.04), M(mf, mat(u, 15.0, 0.02)))
  }

  /* ================= west bell towers ================= */
  for (const s of [1, -1]) {
    const cx = (TOW.x0 + TOW.x1) / 2
    const cz = s * (TOW.z0 + TOW.z1) / 2
    const hw = (TOW.x1 - TOW.x0) / 2
    const yT = 35.5
    b.block(WALL, 2 * hw, yT - H, 2 * hw, cx, H, cz)
    b.block(TRIM, 2 * hw + 0.6, 0.5, 2 * hw + 0.6, cx, yT - 0.5, cz)
    b.block(TRIM, 2 * hw + 0.4, 0.4, 2 * hw + 0.4, cx, 27.4, cz)
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const m = at(cx + nx * hw, cz + nz * hw, Math.atan2(nz, nx))
      b.add('glassC', metricBox(0.9, 7.5, 0.04), M(m, mat(-1.6, 23.5, 0.02)))
      for (const u of [0.6, 1.6, 2.6]) b.add('glassC', metricBox(0.55, 1.5, 0.04), M(m, mat(u, 30.6, 0.02)))
      b.add(TRIM, metricBox(0.45, yT - H, 0.25), M(m, mat(hw - 0.22, (H + yT) / 2, 0.12)))
      b.add(TRIM, metricBox(0.45, yT - H, 0.25), M(m, mat(-hw + 0.22, (H + yT) / 2, 0.12)))
    }
    // round belfry with arched openings
    const rb = 3.1
    b.add(WALL, new THREE.CylinderGeometry(rb, rb, 4.2, 32), mat(cx, yT + 2.1, cz))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const m = at(cx + Math.cos(a) * rb, cz + Math.sin(a) * rb, a)
      arched(b, m, 1.0, 2.6, yT + 0.7, 'black', 0.14)
    }
    b.add(TRIM, new THREE.CylinderGeometry(rb + 0.45, rb + 0.2, 0.45, 32), mat(cx, yT + 4.3, cz))
    dome(b, cx, yT + 4.5, cz, rb + 0.3, 2.9, 16, 0.08)
    b.add('gilt', new THREE.SphereGeometry(0.3, 12, 8), mat(cx, yT + 7.55, cz))
    cross(b, 'gilt', cx, yT + 7.65, cz, 2.5, false, Math.PI / 2)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-0.45, 0.89],
  materialFocus: [14.1, 54.0, 5.0],
  materials: (base) => ({
    bcCopper: (() => {
      const m = (base.copperBrown as THREE.MeshStandardMaterial).clone()
      m.color.setRGB(0.5, 0.8, 1.1)
      m.metalness = 0.8
      m.roughness = 0.5
      return m
    })(),
    bcStone: new THREE.MeshStandardMaterial({ color: '#e6dcc3', roughness: 0.86 }),
    bcTrim: new THREE.MeshStandardMaterial({ color: '#efe8d6', roughness: 0.82 }),
    bcJoint: new THREE.MeshStandardMaterial({ color: '#cfc4a9', roughness: 0.9 }),
    bcSocle: new THREE.MeshStandardMaterial({ color: '#b9a585', roughness: 0.88 }),
    bcDoor: new THREE.MeshStandardMaterial({ color: '#4a3527', roughness: 0.65 }),
    bcGlass: new THREE.MeshStandardMaterial({ color: '#2f4f78', roughness: 0.25, metalness: 0.4 }),
  }),
  notes:
    'Modern cross-plan cathedral: central drum and dome, two west bell towers, narthex dome, barrel arms with glazed semicircular gables over half-domed exedrae; dark copper domes and roofs as photographed; west front and north side interpreted.',
}
export default model
