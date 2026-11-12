/**
 * Biserica „Sfinții Teodori” din Iași (Str. Sfântul Teodor 14, OSM way 203170871) —
 * Moldavian triconch church with a west tower and a naos tower; roofs and tower caps
 * shown in copper standing seam (copper supplied by COLOR METAL according to its
 * records; the reference photographs predate the works).
 *
 * Modelling specification (real metres; origin = footprint centre at ground):
 *  - Axis: the straight north and south walls of the OSM outline run at ≈ 107°
 *    (the minimum-rectangle axis 120° is skewed by the asymmetric lobes). +X = 107°
 *    towards the altar apse (ESE), the west front with the entrance at −X, +Z = 197°
 *    (south side, photos 01–03).
 *  - Plan after the OSM outline: nave (pronaos + narthex) 11.9 × 8.1 m; square naos
 *    bay with semicircular lateral apses projecting ≈ 3.4 m (overall width 14.9 m);
 *    semicircular altar apse as wide as the nave; overall length 23.5 m.
 *  - Walls ≈ 9.4 m to the top of a bracketed cornice, cream plaster on a stone socle:
 *    flat pilasters (lesenes) in a ≈ 2.3 m rhythm, keel-arched (ogee) blind niches
 *    and triangular relief panels between them, dentil band under the cornice;
 *    small windows in carved stone frames, west portal with an icon above (01, 04).
 *  - Low hipped copper roof (≈ 24°) with wide eaves; half-cone roofs over the altar
 *    and lateral apses rising to the ridge, so the eaves follow the apses (02, 03).
 *  - West tower on the west bay: chamfered-square belfry (≈ 6.8 m) with keel niches
 *    and a pointed louvred opening, bracketed cornice, flared eave and a ribbed
 *    bell-shaped copper cap, knob and cross (≈ 20 m).
 *  - Naos tower: two superposed eight-pointed star bases with copper caps, octagonal
 *    drum (≈ 5.1 m) with narrow arched windows and blind arcades, bracketed cornice,
 *    ribbed bell-shaped copper cap, cross (≈ 22.6 m).
 * Heights estimated from the photographs (door and window sizes, drum width as scale).
 * Approximations: north side mirrored from the south; niche counts, window frames and
 * the roof intersections around the lateral apses idealised; which surfaces received
 * copper is not documented — roofs and both tower caps are shown in copper.
 */
import * as THREE from 'three'
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, frameShape, polyRing, seams, cross } from '../kit'
import type { ModelModule } from '../registry'

const CU = 'copperBrown'
const WALL = 'tdWall'
const DECO = 'tdDeco'
const STONE = 'tdStone'
const SEAM = seams(CU, 0.6, 0.05, 0.045)
const D2R = Math.PI / 180
const M = (a: THREE.Matrix4, c: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, c)

/* plan */
const X0 = -11.75 // west front
const HW = 4.05 // nave half width
const XL = 4.15 // lateral apse centre (naos centre)
const RL = 3.45 // lateral apse radius
const XA = 7.75 // altar apse centre (radius = HW)
const WT = { x0: X0, x1: X0 + 6.8, hw: 3.4, ch: 1.0 } // west tower belfry (chamfered square)

/* heights */
const SOCLE = 0.9
const H = 9.4 // wall top (cornice)
const PITCH = 24
const T = Math.tan(PITCH * D2R)
const OV = 0.7
const LIFT = 0.25 // roof planes sit on the cornice
const EAVE = H + LIFT - OV * T
const RIDGE = EAVE + (HW + OV) * T

/** Outline of the walls (CCW from +X towards +Z), grown by g. */
function outline(y: number, g = 0): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const hw = HW + g
  const n = 12
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    pts.push(V(XA + Math.cos(a) * hw, y, Math.sin(a) * hw))
  }
  const rl = RL + g
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI
    pts.push(V(XL + Math.cos(a) * rl, y, HW + Math.sin(a) * rl - (i === 0 || i === n ? 0 : 0) + (i === 0 || i === n ? g : 0)))
  }
  pts.push(V(X0 - g, y, hw), V(X0 - g, y, -hw))
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI
    pts.push(V(XL + Math.cos(a) * rl, y, -HW + Math.sin(a) * rl - (i === 0 || i === n ? g : 0)))
  }
  return pts
}

/** Frame on a wall point with outward normal angle a (from +X towards +Z). */
const at = (x: number, z: number, a: number) => mat(x, 0, z, Math.atan2(Math.cos(a), Math.sin(a)))

/** Keel-arched (ogee) blind niche outline, bottom-centre at (0, y0). */
function keelShape(w: number, h: number, y0: number) {
  const s = new THREE.Shape()
  const hw = w / 2
  const ys = y0 + h - w * 0.75
  s.moveTo(-hw, y0)
  s.lineTo(hw, y0)
  s.lineTo(hw, ys)
  s.quadraticCurveTo(hw, ys + w * 0.45, 0.12 * w, ys + w * 0.55)
  s.lineTo(0, y0 + h)
  s.lineTo(-0.12 * w, ys + w * 0.55)
  s.quadraticCurveTo(-hw, ys + w * 0.45, -hw, ys)
  s.lineTo(-hw, y0)
  return s
}

/** One wall bay decoration: keel niche over a triangular relief with a small bracket. */
function bay(b: Builder, m: THREE.Matrix4, w: number, withTriangle = true) {
  const kw = Math.min(1.15, w * 0.55)
  const outer = keelShape(kw + 0.3, 1.85, 6.35)
  outer.holes.push(new THREE.Path(keelShape(kw, 1.6, 6.45).getPoints(16)))
  b.add(DECO, extrude(outer, 0.1, 8), M(m, mat(0, 0, 0)))
  b.add('tdShadow', new THREE.ShapeGeometry(keelShape(kw, 1.6, 6.45), 8), M(m, mat(0, 0, 0.01)))
  if (withTriangle) {
    const t = new THREE.Shape([new THREE.Vector2(-kw * 0.55, 0), new THREE.Vector2(kw * 0.55, 0), new THREE.Vector2(0, kw * 0.55)])
    const ti = new THREE.Path([new THREE.Vector2(-kw * 0.36, 0.1), new THREE.Vector2(kw * 0.36, 0.1), new THREE.Vector2(0, kw * 0.42)])
    t.holes.push(ti)
    b.add(DECO, extrude(t, 0.12), M(m, mat(0, 5.35, 0)))
    b.add(DECO, metricBox(kw * 0.6, 0.16, 0.16), M(m, mat(0, 5.25, 0.08)))
    b.add(DECO, metricBox(0.22, 0.3, 0.14), M(m, mat(0, 5.0, 0.07)))
  }
}

function pilaster(b: Builder, m: THREE.Matrix4, w = 0.55) {
  b.add(DECO, metricBox(w, H - SOCLE - 1.3, 0.14), M(m, mat(0, SOCLE + (H - SOCLE - 1.3) / 2, 0.07)))
  b.add(DECO, metricBox(w + 0.16, 0.3, 0.22), M(m, mat(0, H - 1.3, 0.1)))
}

function windowFrame(b: Builder, m: THREE.Matrix4, w: number, h: number, y0: number) {
  b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('rect', w, h, 0, y0))), M(m, mat(0, 0, 0.02)))
  b.add(STONE, extrude(frameShape('rect', w, h, 0.22, 0, y0), 0.12), M(m, mat(0, 0, 0)))
  // carved head and apron (photo 01)
  const head = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.25, 0), new THREE.Vector2(w / 2 + 0.25, 0), new THREE.Vector2(0.12, 0.42), new THREE.Vector2(0, 0.55), new THREE.Vector2(-0.12, 0.42)])
  b.add(STONE, extrude(head, 0.14), M(m, mat(0, y0 + h + 0.2, 0)))
  b.add(STONE, metricBox(w * 0.6, 0.35, 0.14), M(m, mat(0, y0 - 0.42, 0.07)))
  for (let i = 1; i < 3; i++) b.add('iron', metricBox(0.03, h, 0.03), M(m, mat(-w / 2 + (i * w) / 3, y0 + h / 2, 0.05)))
  for (let j = 1; j < 5; j++) b.add('iron', metricBox(w, 0.03, 0.03), M(m, mat(0, y0 + (j * h) / 5, 0.05)))
}

/** Eight-pointed star ring (two squares of half side s, one turned 45°). */
function starRing(s: number, y: number) {
  const out: THREE.Vector3[] = []
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8
    const r = k % 2 === 0 ? s * Math.SQRT2 : s / Math.cos(Math.PI / 8)
    out.push(V(XL + Math.cos(a) * r, y, Math.sin(a) * r))
  }
  return out
}

/** Bell-shaped ribbed copper cap on a round base of radius r at y. */
function bellCap(b: Builder, cx: number, y: number, r: number, h: number, ribs: number) {
  const prof: [number, number][] = [
    [1.0, 0],
    [1.0, 0.08],
    [0.98, 0.22],
    [0.93, 0.38],
    [0.82, 0.55],
    [0.64, 0.72],
    [0.42, 0.85],
    [0.22, 0.93],
    [0.12, 0.97],
    [0.07, 1.0],
  ]
  const pts = prof.map(([pr, py]) => [pr * r, py * h] as [number, number])
  b.add(CU, lathe(pts, 40), mat(cx, y, 0))
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * Math.PI * 2
    for (let i = 0; i < pts.length - 2; i++) {
      const [r0, y0] = pts[i]
      const [r1, y1] = pts[i + 1]
      b.beam(CU, V(cx + Math.cos(a) * (r0 + 0.02), y + y0, Math.sin(a) * (r0 + 0.02)), V(cx + Math.cos(a) * (r1 + 0.02), y + y1, Math.sin(a) * (r1 + 0.02)), 0.05, 0.05, V(Math.cos(a), 0, Math.sin(a)))
    }
  }
  // knob, small neck and cross
  const top = y + h
  b.add(CU, new THREE.CylinderGeometry(0.1, 0.18, 0.35, 12), mat(cx, top + 0.12, 0))
  b.add(CU, new THREE.SphereGeometry(0.24, 14, 10), mat(cx, top + 0.5, 0))
  cross(b, 'iron', cx, top + 0.62, 0, 1.6, true, Math.PI / 2)
}

/** Bracketed octagonal cornice (dark soffit with modillions) at y on ring radius r. */
function bracketCornice(b: Builder, ringAt: (r: number, y: number) => THREE.Vector3[], r: number, y: number, proj: number) {
  b.add(DECO, loft([ringAt(r + 0.05, y - 0.35), ringAt(r + 0.05, y - 0.15), ringAt(r + proj, y - 0.05), ringAt(r + proj, y + 0.12)], { capTop: true, capBottom: true, flat: true }))
}

function build(): Builder {
  const b = new Builder()

  /* ================= walls ================= */
  b.add(WALL, loft([outline(0), outline(H)], { capTop: true, flat: false }))
  b.add(STONE, loft([outline(0, 0.1), outline(SOCLE, 0.1)], { capTop: true, flat: false }))
  // dentil band and bracketed cornice
  b.add(DECO, loft([outline(H - 1.25, 0.08), outline(H - 0.95, 0.08)], { capTop: true, capBottom: true }))
  b.add(DECO, loft([outline(H - 0.55, 0.06), outline(H - 0.3, 0.3), outline(H, 0.42)], { capTop: true, capBottom: true }))
  {
    const ring = outline(H - 0.45, 0.12)
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const c = ring[(i + 1) % ring.length]
      const L = a.distanceTo(c)
      const n = Math.max(1, Math.round(L / 0.55))
      const d = c.clone().sub(a).normalize()
      const ry = Math.atan2(-d.z, d.x)
      for (let k = 0; k < n; k++) {
        const p = a.clone().lerp(c, (k + 0.5) / n)
        b.add(DECO, metricBox(0.14, 0.28, 0.4), mat(p.x, p.y, p.z, ry))
      }
    }
  }

  /* ---------- wall bays: pilasters + keel niches + triangles ---------- */
  // straight walls (south +Z / north −Z): from the west front to the lateral apse
  for (const s of [1, -1]) {
    const a = s > 0 ? Math.PI / 2 : -Math.PI / 2
    const xs = [X0 + 0.35, -9.2, -6.9, -4.6, -2.3, XL - RL - 0.05]
    for (const x of xs) pilaster(b, at(x, s * HW, a))
    for (let i = 0; i < xs.length - 1; i++) bay(b, at((xs[i] + xs[i + 1]) / 2, s * HW, a), xs[i + 1] - xs[i])
    // lateral apse: pilasters every 36°, niches between
    for (let k = 0; k <= 5; k++) {
      const t = (k / 5) * Math.PI
      const aa = s > 0 ? t : Math.PI + t
      pilaster(b, at(XL + Math.cos(aa) * RL, s * HW + Math.sin(aa) * RL, aa))
      if (k < 5) {
        const tm = ((k + 0.5) / 5) * Math.PI
        const am = s > 0 ? tm : Math.PI + tm
        bay(b, at(XL + Math.cos(am) * RL, s * HW + Math.sin(am) * RL, am), 2.0)
      }
    }
    // short wall piece between the lateral and altar apses
    pilaster(b, at(XA + 0.05, s * HW, a), 0.45)
    // windows: nave (third bay) and lateral apse (centre)
    windowFrame(b, at(-3.45, s * HW, a), 0.85, 1.55, 2.6)
    const am = s > 0 ? Math.PI / 2 : -Math.PI / 2
    windowFrame(b, at(XL + Math.cos(am) * RL, s * HW + Math.sin(am) * RL, am), 0.85, 1.55, 2.6)
  }
  // altar apse: pilasters every 30°, niches between, small axial window
  for (let k = 0; k <= 6; k++) {
    const aa = -Math.PI / 2 + (k / 6) * Math.PI
    pilaster(b, at(XA + Math.cos(aa) * HW, Math.sin(aa) * HW, aa))
    if (k < 6) {
      const am = -Math.PI / 2 + ((k + 0.5) / 6) * Math.PI
      bay(b, at(XA + Math.cos(am) * HW, Math.sin(am) * HW, am), 2.0)
    }
  }
  windowFrame(b, at(XA + HW, 0, 0), 0.6, 1.2, 3.0)
  // west front: portal, icon, two niche bays
  {
    const m = at(X0, 0, Math.PI)
    for (const u of [-3.7, -1.3, 1.3, 3.7]) pilaster(b, M(m, mat(u, 0, 0)))
    for (const u of [-2.5, 2.5]) bay(b, M(m, mat(u, 0, 0)), 2.3)
    b.add('tdDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 1.45, 2.75, 0, SOCLE, 12))), M(m, mat(0, 0, 0.03)))
    b.add(STONE, extrude(frameShape('round', 1.45, 2.75, 0.32, 0, SOCLE), 0.18), m)
    b.add(STONE, metricBox(2.4, 0.2, 0.4), M(m, mat(0, SOCLE + 3.15, 0.2)))
    // icon panel
    b.add(STONE, metricBox(0.9, 1.05, 0.12), M(m, mat(0, 5.1, 0.06)))
    b.add('tdIcon', metricBox(0.7, 0.85, 0.02), M(m, mat(0, 5.1, 0.13)))
    // steps
    for (let i = 0; i < 4; i++) b.block(STONE, 0.45, SOCLE - i * 0.22, 3.2, X0 - 0.25 - i * 0.45, 0, 0)
  }

  /* ================= roofs ================= */
  {
    const hw = HW + OV
    const xw = WT.x1 - 0.05 // the roof abuts the east face of the west tower
    // long faces from the tower to the altar-apse springing
    facet(b, CU, [V(xw, EAVE, hw), V(XA, EAVE, hw), V(XA, RIDGE, 0), V(xw, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    facet(b, CU, [V(XA, EAVE, -hw), V(xw, EAVE, -hw), V(xw, RIDGE, 0), V(XA, RIDGE, 0)], { seams: SEAM, thickness: 0.12 })
    b.beam(CU, V(xw, RIDGE + 0.06, 0), V(XA, RIDGE + 0.06, 0), 0.24, 0.12)
    // copper apron around the west bay at the foot of the tower (west and side eaves)
    {
      const y0 = EAVE
      const y1 = H + 0.62
      const xa = X0 - OV
      const xb = WT.x1
      facet(b, CU, [V(xa, y0, hw), V(xb, y0, hw), V(xb, y1, WT.hw), V(X0 + 0.0, y1, WT.hw)], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [V(xb, y0, -hw), V(xa, y0, -hw), V(X0, y1, -WT.hw), V(xb, y1, -WT.hw)], { seams: SEAM, thickness: 0.1 })
      facet(b, CU, [V(xa, y0, -hw), V(xa, y0, hw), V(X0, y1, WT.hw), V(X0, y1, -WT.hw)], { seams: SEAM, thickness: 0.1 })
    }
    // half cone over the altar apse
    const apex = V(XA, RIDGE, 0)
    const n = 18
    const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
      const p: THREE.Vector3[] = []
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n
        p.push(V(cx + Math.cos(a) * r, EAVE, cz + Math.sin(a) * r))
      }
      return p
    }
    const alt = arc(XA, 0, hw, -Math.PI / 2, Math.PI / 2)
    for (let i = 0; i < n; i++) facet(b, CU, [alt[i], alt[i + 1], apex], { seams: SEAM, thickness: 0.1 })
    for (let i = 0; i <= n; i += 3) b.beam(CU, alt[i].clone().setY(EAVE + 0.05), apex.clone().setY(RIDGE + 0.05), 0.08, 0.06)
    // half cones over the lateral apses, rising to the ridge
    for (const s of [1, -1]) {
      const lat = arc(XL, s * HW, RL + OV, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : 2 * Math.PI)
      const ap = V(XL, RIDGE - 0.02, 0)
      for (let i = 0; i < n; i++) facet(b, CU, [lat[i], lat[i + 1], ap], { seams: SEAM, thickness: 0.1 })
      for (let i = 3; i < n; i += 3) b.beam(CU, lat[i].clone().setY(EAVE + 0.05), ap.clone().setY(RIDGE + 0.03), 0.07, 0.05)
    }
    // eave gutter line along the whole outline (copper)
    const eo = outline(EAVE - 0.06, OV)
    for (let i = 0; i < eo.length; i++) b.beam(CU, eo[i], eo[(i + 1) % eo.length], 0.16, 0.14)
    // brick chimney on the south slope (photo 01)
    b.block('tdBrick', 0.55, 2.2, 0.55, XA - 1.2, RIDGE - 1.6, 2.2)
  }

  /* ================= west tower ================= */
  {
    const cx = (WT.x0 + WT.x1) / 2
    const ring = (r: number, y: number) => {
      const h = r
      const c = WT.ch * (r / WT.hw)
      return [V(cx + h, y, -h + c), V(cx + h, y, h - c), V(cx + h - c, y, h), V(cx - h + c, y, h), V(cx - h, y, h - c), V(cx - h, y, -h + c), V(cx - h + c, y, -h), V(cx + h - c, y, -h)]
    }
    const y0 = H + 0.3
    const yC = 14.6
    b.add(WALL, loft([ring(WT.hw, y0), ring(WT.hw, yC)], { capTop: true, flat: true }))
    // string course between the lower and upper zones
    b.add(DECO, loft([ring(WT.hw + 0.08, 12.85), ring(WT.hw + 0.08, 13.1)], { capTop: true, capBottom: true, flat: true }))
    bracketCornice(b, ring, WT.hw, yC, 0.55)
    // faces: pointed louvred opening on the four main faces, keel niches on chamfers and above
    const faces: [number, number, number][] = [
      [cx + WT.hw, 0, 0],
      [cx, WT.hw, Math.PI / 2],
      [cx - WT.hw, 0, Math.PI],
      [cx, -WT.hw, -Math.PI / 2],
    ]
    for (const [x, z, a] of faces) {
      const m = at(x, z, a)
      b.add('tdDoor', new THREE.ShapeGeometry(new THREE.Shape(opening('pointed', 0.95, 2.1, 0, 10.6, 10))), M(m, mat(0, 0, 0.02)))
      b.add(DECO, extrude(frameShape('pointed', 0.95, 2.1, 0.22, 0, 10.6), 0.12), m)
      for (const u of [-1.6, 1.6]) {
        b.add(DECO, metricBox(0.32, 2.9, 0.1), M(m, mat(u, 11.5, 0.05)))
      }
      // upper zone: three keel niches
      for (const u of [-1.05, 0, 1.05]) {
        const o = keelShape(0.62, 1.15, 13.25)
        o.holes.push(new THREE.Path(keelShape(0.44, 0.98, 13.33).getPoints(12)))
        b.add(DECO, extrude(o, 0.08, 6), M(m, mat(u, 0, 0)))
        b.add('tdShadow', new THREE.ShapeGeometry(keelShape(0.44, 0.98, 13.33), 6), M(m, mat(u, 0, 0.01)))
      }
    }
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const d = WT.hw - WT.ch / 2
      const a = Math.atan2(sz, sx)
      const m = at(cx + sx * d, sz * d, a)
      const o = keelShape(0.5, 1.9, 10.7)
      o.holes.push(new THREE.Path(keelShape(0.34, 1.7, 10.8).getPoints(12)))
      b.add(DECO, extrude(o, 0.08, 6), m)
      b.add('tdShadow', new THREE.ShapeGeometry(keelShape(0.34, 1.7, 10.8), 6), M(m, mat(0, 0, 0.01)))
    }
    // flared octagonal eave and bell cap
    b.add(CU, loft([ring(WT.hw + 0.62, yC + 0.12), ring(WT.hw + 0.25, yC + 0.45), ring(WT.hw - 0.05, yC + 0.62)], { capBottom: true, flat: false }))
    bellCap(b, cx, yC + 0.55, WT.hw - 0.1, 2.7, 32)
  }

  /* ================= naos tower ================= */
  {
    // two star tiers with copper caps
    const tiers: [number, number, number][] = [
      [3.05, 10.6, 12.1],
      [2.7, 12.1, 13.0],
    ]
    for (const [s, y0, y1] of tiers) {
      b.add(WALL, loft([starRing(s, y0), starRing(s, y1)], { capTop: false, flat: true }))
      // blind arcade frieze: small arches on each star face
      const ring = starRing(s, 0)
      for (let k = 0; k < 16; k++) {
        const a = ring[k]
        const c = ring[(k + 1) % 16]
        const mid = a.clone().add(c).multiplyScalar(0.5)
        const d = c.clone().sub(a)
        const L = d.length()
        const nrm = Math.atan2(-d.x, d.z) // outward for CCW ring
        const m = at(mid.x, mid.z, nrm)
        const cnt = L > 1.6 ? 2 : 1
        for (let i = 0; i < cnt; i++) {
          const u = (i - (cnt - 1) / 2) * (L / cnt)
          b.add('tdShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.42, (y1 - y0) * 0.55, u, y0 + (y1 - y0) * 0.2, 6))), M(m, mat(0, 0, 0.02)))
        }
      }
      b.add(CU, loft([starRing(s + 0.18, y1 - 0.04), starRing(s * 0.86, y1 + 0.38)], { capTop: true, capBottom: true, flat: true }))
    }
    // octagonal drum
    const R = 2.55 / Math.cos(Math.PI / 8)
    const ring = (r: number, y: number) => polyRing(8, r, y, Math.PI / 8, XL, 0)
    const yD0 = 13.0
    const yD1 = 17.3
    b.add(WALL, loft([ring(R, yD0), ring(R, yD1)], { capTop: true, flat: true }))
    b.add(DECO, loft([ring(R + 0.08, yD0), ring(R + 0.08, yD0 + 0.3)], { capTop: true, flat: true }))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const ap = 2.55
      const m = at(XL + Math.cos(a) * ap, Math.sin(a) * ap, a)
      if (k % 2 === 0) {
        b.add('glassC', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.42, 1.9, 0, 14.0, 8))), M(m, mat(0, 0, 0.02)))
        b.add(DECO, extrude(frameShape('round', 0.42, 1.9, 0.14, 0, 14.0), 0.1), m)
      } else {
        b.add('tdShadow', new THREE.ShapeGeometry(new THREE.Shape(opening('round', 0.9, 2.7, 0, 13.6, 10))), M(m, mat(0, 0, 0.02)))
      }
      b.add(DECO, extrude(frameShape('round', 1.25, 3.2, 0.12, 0, 13.4), 0.08), m)
      // corner colonnettes
      const ac = a + Math.PI / 8
      b.add(DECO, new THREE.CylinderGeometry(0.1, 0.1, yD1 - yD0 - 0.6, 8), mat(XL + Math.cos(ac) * (R + 0.02), (yD0 + yD1) / 2, Math.sin(ac) * (R + 0.02)))
    }
    bracketCornice(b, ring, R, yD1, 0.5)
    b.add(CU, loft([ring(R + 0.58, yD1 + 0.12), ring(R + 0.2, yD1 + 0.42), ring(R - 0.08, yD1 + 0.58)], { capBottom: true }))
    bellCap(b, XL, yD1 + 0.5, 2.5, 2.6, 32)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-0.6, 0.8],
  materialFocus: [4.15, 18.0, 1.5],
  materials: () => ({
    tdWall: new THREE.MeshStandardMaterial({ color: '#e9e2ce', roughness: 0.9 }),
    tdDeco: new THREE.MeshStandardMaterial({ color: '#f1ecdd', roughness: 0.86 }),
    tdShadow: new THREE.MeshStandardMaterial({ color: '#d6cdb6', roughness: 0.92 }),
    tdStone: new THREE.MeshStandardMaterial({ color: '#c9bc9f', roughness: 0.88 }),
    tdDoor: new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.7 }),
    tdIcon: new THREE.MeshStandardMaterial({ color: '#8a6a3c', roughness: 0.6 }),
    tdBrick: new THREE.MeshStandardMaterial({ color: '#a4583c', roughness: 0.85 }),
  }),
  notes:
    'Moldavian triconch church with west and naos towers; low hipped roof with half-cones over the apses and ribbed bell caps shown in copper; niche ornament simplified, north side mirrored.',
}
export default model
