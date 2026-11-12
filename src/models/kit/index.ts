/**
 * Reusable architectural modelling kit (real metres, Y up).
 *
 * Every helper writes into a Builder (lib/geo.ts) under material keys from the
 * palette (lib/palette.ts). Helpers speed up production but do not impose a
 * style: proportions, pitches, profiles and details are always parameters, so
 * every building keeps its own identity.
 *
 * Conventions: origin = footprint centre at ground level (y = 0); +X = the
 * building's main axis; facades are addressed by their outward normal
 * ('+x' | '-x' | '+z' | '-z'). Sub-assemblies can be built in their own
 * Builder and merged with a transform: b.merge(sub, mat(x, y, z, ry)).
 */
import * as THREE from 'three'
import { Builder, V, extrude, facet, frameShape, hipRoof, lathe, loft, mat, metricBox, opening, polyRing, rectRing, truncatedHip, type OpeningType, type SeamSpec } from '../../lib/geo'

export { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, polyRing, rectRing, frameShape, hipRoof, truncatedHip }
export type { SeamSpec, OpeningType }

const D2R = Math.PI / 180

/** Standing-seam spec. Real seam spacing ≈ 0.43–0.6 m; keep h ≈ 0.025–0.08 so ribs stay subtle. */
export const seams = (key: string, spacing = 0.55, h = 0.06, w = 0.05): SeamSpec => ({ key, spacing, h, w })

/* ------------------------------------------------------------------ */
/* Volumes                                                             */
/* ------------------------------------------------------------------ */

export interface VolumeOpts {
  x?: number
  z?: number
  w: number // along X
  d: number // along Z
  h: number
  y0?: number
  ry?: number
  plinth?: { key: string; h: number; grow?: number }
  cornice?: { key: string; h: number; grow?: number }
  /** string courses: [y, h] bands */
  bands?: { key: string; at: number[]; h?: number; grow?: number }
}

/** Axis-aligned wall block with optional plinth, cornice and string courses. */
export function volume(b: Builder, key: string, o: VolumeOpts) {
  const { x = 0, z = 0, w, d, h, y0 = 0, ry = 0 } = o
  b.add(key, metricBox(w, h, d), mat(x, y0 + h / 2, z, ry))
  if (o.plinth) {
    const g = o.plinth.grow ?? 0.15
    b.add(o.plinth.key, metricBox(w + 2 * g, o.plinth.h, d + 2 * g), mat(x, y0 + o.plinth.h / 2, z, ry))
  }
  if (o.cornice) {
    const g = o.cornice.grow ?? 0.3
    b.add(o.cornice.key, metricBox(w + 2 * g, o.cornice.h, d + 2 * g), mat(x, y0 + h - o.cornice.h / 2, z, ry))
  }
  if (o.bands) {
    const g = o.bands.grow ?? 0.08
    const bh = o.bands.h ?? 0.25
    for (const y of o.bands.at) b.add(o.bands.key, metricBox(w + 2 * g, bh, d + 2 * g), mat(x, y0 + y, z, ry))
  }
  return y0 + h
}

/** Vertical prism over an arbitrary convex/concave outline (XZ points, CCW seen from above). */
export function prismOutline(b: Builder, key: string, outline: [number, number][], y0: number, h: number) {
  const s = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
  const g = extrude(s, h)
  // extrude goes along +Z in shape space; rotate so it rises along +Y
  b.add(key, g, new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, y0, 0)))
}

/** Regular polygonal prism (n sides; n ≥ 24 reads as round). */
export function prism(b: Builder, key: string, o: { x?: number; z?: number; n: number; r: number; y0?: number; h: number; phase?: number; rTop?: number }) {
  const { x = 0, z = 0, n, r, y0 = 0, h, phase = Math.PI / n, rTop = r } = o
  b.add(key, loft([polyRing(n, r, y0, phase, x, z), polyRing(n, rTop, y0 + h, phase, x, z)], { capTop: true, capBottom: false, flat: n < 20 }))
  return y0 + h
}

/** Horizontal moulding ring around a regular polygon / round drum. */
export function ringBand(b: Builder, key: string, o: { x?: number; z?: number; n: number; r: number; y: number; h?: number; grow?: number; phase?: number }) {
  const { x = 0, z = 0, n, r, y, h = 0.3, grow = 0.15, phase = Math.PI / n } = o
  b.add(key, loft([polyRing(n, r + grow, y, phase, x, z), polyRing(n, r + grow, y + h, phase, x, z)], { capTop: true, capBottom: true, flat: n < 20 }))
}

/* ------------------------------------------------------------------ */
/* Roofs                                                               */
/* ------------------------------------------------------------------ */

export interface RoofBase {
  x?: number
  z?: number
  w: number // wall extent along X
  d: number // wall extent along Z
  y: number // eave (wall top) height
  overhang?: number
  seams?: SeamSpec | false
  /** ridge / hip capping key (defaults to roof key) */
  capKey?: string
  thickness?: number
}

/** Gable roof. ridge 'x' = ridge parallel to X (gables at ±X). Adds triangular gable walls when wallKey is given. Returns ridge height. */
export function gableRoof(b: Builder, key: string, o: RoofBase & { pitch: number; ridge?: 'x' | 'z'; wallKey?: string; ridgeShift?: number }) {
  const { x = 0, z = 0, w, d, y, pitch, ridge = 'x', overhang = 0.4, thickness = 0.12 } = o
  const t = Math.tan(pitch * D2R)
  const span = ridge === 'x' ? d : w
  const len = ridge === 'x' ? w : d
  const hs = span / 2
  const rise = hs * t
  const ry = y + rise
  const ey = y - overhang * t
  const he = hs + overhang
  const hl = len / 2 + overhang * 0.6
  const sp = o.seams === false ? undefined : o.seams
  const P = (a: number, yy: number, c: number) => (ridge === 'x' ? V(x + a, yy, z + c) : V(x + c, yy, z + a))
  facet(b, key, [P(-hl, ey, he), P(hl, ey, he), P(hl, ry, 0), P(-hl, ry, 0)], { seams: sp, thickness })
  facet(b, key, [P(hl, ey, -he), P(-hl, ey, -he), P(-hl, ry, 0), P(hl, ry, 0)], { seams: sp, thickness })
  b.beam(o.capKey ?? key, P(-hl, ry + 0.06, 0), P(hl, ry + 0.06, 0), 0.28, 0.16)
  if (o.wallKey) {
    const tri = new THREE.Shape([new THREE.Vector2(-hs, y - 0.01), new THREE.Vector2(hs, y - 0.01), new THREE.Vector2(0, ry - 0.08)])
    const g = extrude(tri, 0.3)
    // triangle lies in local XY and is extruded 0.3 m along local +Z (inwards from each end wall)
    for (const s of [-1, 1]) {
      const at = s > 0 ? len / 2 - 0.3 : -len / 2
      if (ridge === 'x') b.add(o.wallKey, g, mat(x + at, 0, z, Math.PI / 2))
      else b.add(o.wallKey, g, mat(x, 0, z + at))
    }
  }
  return ry
}

/** Hipped roof with seams and hip caps. Returns ridge height. */
export function hippedRoof(b: Builder, key: string, o: RoofBase & { pitch: number }) {
  const { x = 0, z = 0, w, d, y, pitch, overhang = 0.4, thickness = 0.12 } = o
  const t = Math.tan(pitch * D2R)
  const r = hipRoof(x, z, w + 2 * overhang, d + 2 * overhang, y - overhang * t, pitch * D2R)
  const sp = o.seams === false ? undefined : o.seams
  for (const f of r.facets) facet(b, key, f, { seams: sp, thickness })
  for (const [a, c] of r.lines) b.beam(o.capKey ?? key, a.clone().add(V(0, 0.05, 0)), c.clone().add(V(0, 0.05, 0)), 0.22, 0.12)
  return r.top
}

/** Mansard: steep lower slopes up to a curb, then a shallow hip. */
export function mansardRoof(b: Builder, key: string, o: RoofBase & { lowerPitch: number; lowerRise: number; upperPitch: number; upperKey?: string }) {
  const { x = 0, z = 0, w, d, y, overhang = 0.3 } = o
  const lt = Math.tan(o.lowerPitch * D2R)
  const sp = o.seams === false ? undefined : o.seams
  const m = truncatedHip(x, z, w + 2 * overhang, d + 2 * overhang, y - overhang * lt, o.lowerPitch * D2R, o.lowerRise + overhang * lt)
  for (const f of m.facets) facet(b, key, f, { seams: sp, thickness: 0.12 })
  for (const [a, c] of m.lines) b.beam(o.capKey ?? key, a, c, 0.2, 0.12)
  const up = hipRoof(x, z, m.curb.w, m.curb.d, m.curb.y, o.upperPitch * D2R)
  for (const f of up.facets) facet(b, o.upperKey ?? key, f, { seams: sp })
  for (const [a, c] of up.lines) b.beam(o.capKey ?? key, a, c, 0.2, 0.1)
  b.add(o.capKey ?? key, metricBox(m.curb.w + 0.2, 0.18, m.curb.d + 0.2), mat(x, m.curb.y, z))
  return up.top
}

/** Pyramid / tent roof over a regular n-gon (n = 4 square, 6, 8 …). Returns apex height. */
export function tentRoof(b: Builder, key: string, o: { x?: number; z?: number; n?: number; r: number; y: number; h: number; phase?: number; seams?: SeamSpec | false; overhang?: number }) {
  const { x = 0, z = 0, n = 4, r, y, h, overhang = 0.3 } = o
  const phase = o.phase ?? Math.PI / n
  const R = r + overhang
  const ey = y - (overhang * h) / r
  const ring = polyRing(n, R, ey, phase, x, z)
  const apex = V(x, y + h, z)
  for (let i = 0; i < n; i++) {
    const a = ring[i]
    const c = ring[(i + 1) % n]
    facet(b, key, [a, c, apex], { seams: o.seams === false ? undefined : o.seams, thickness: 0.1 })
    b.beam(key, a, apex, 0.14, 0.1)
  }
  return y + h
}

/** Mono-pitch (shed) roof falling towards -Z by default. */
export function shedRoof(b: Builder, key: string, o: RoofBase & { pitch: number; fall?: '+z' | '-z' | '+x' | '-x' }) {
  const { x = 0, z = 0, w, d, y, pitch, overhang = 0.3, fall = '-z' } = o
  const t = Math.tan(pitch * D2R)
  const sp = o.seams === false ? undefined : o.seams
  const hw = w / 2 + overhang
  const hd = d / 2 + overhang
  const span = fall.endsWith('z') ? 2 * hd : 2 * hw
  const hi = y + span * t
  const pts =
    fall === '-z'
      ? [V(x - hw, y, z - hd), V(x + hw, y, z - hd), V(x + hw, hi, z + hd), V(x - hw, hi, z + hd)]
      : fall === '+z'
        ? [V(x - hw, hi, z - hd), V(x + hw, hi, z - hd), V(x + hw, y, z + hd), V(x - hw, y, z + hd)]
        : fall === '-x'
          ? [V(x - hw, y, z - hd), V(x + hw, hi, z - hd), V(x + hw, hi, z + hd), V(x - hw, y, z + hd)]
          : [V(x - hw, hi, z - hd), V(x + hw, y, z - hd), V(x + hw, y, z + hd), V(x - hw, hi, z + hd)]
  facet(b, key, pts, { seams: sp, thickness: 0.12 })
  return hi
}

/** Flat roof with parapet coping (metal) around a rectangle. */
export function flatRoof(b: Builder, o: { x?: number; z?: number; w: number; d: number; y: number; roofKey: string; copingKey?: string; parapet?: number; coping?: number }) {
  const { x = 0, z = 0, w, d, y, parapet = 0.6, coping = 0.35 } = o
  b.add(o.roofKey, metricBox(w - 0.2, 0.1, d - 0.2), mat(x, y + 0.05, z))
  if (o.copingKey) {
    const ck = o.copingKey
    b.add(ck, metricBox(w + 0.08, 0.12, coping), mat(x, y + parapet, z - d / 2 + coping / 2))
    b.add(ck, metricBox(w + 0.08, 0.12, coping), mat(x, y + parapet, z + d / 2 - coping / 2))
    b.add(ck, metricBox(coping, 0.12, d), mat(x - w / 2 + coping / 2, y + parapet, z))
    b.add(ck, metricBox(coping, 0.12, d), mat(x + w / 2 - coping / 2, y + parapet, z))
  }
}

/** Barrel (segmental) vault roof along X: span d across Z, rise. Seams run across the curve. */
export function barrelRoof(b: Builder, key: string, o: { x?: number; z?: number; w: number; d: number; y: number; rise: number; segs?: number; seams?: SeamSpec | false; overhang?: number }) {
  const { x = 0, z = 0, w, d, y, rise, segs = 16, overhang = 0.3 } = o
  const hd = d / 2 + overhang
  const R = (hd * hd + rise * rise) / (2 * rise)
  const a0 = Math.asin(hd / R)
  const hw = w / 2 + overhang * 0.5
  for (let i = 0; i < segs; i++) {
    const t0 = -a0 + (2 * a0 * i) / segs
    const t1 = -a0 + (2 * a0 * (i + 1)) / segs
    const p0 = [R * Math.sin(t0), y + rise - R + R * Math.cos(t0)]
    const p1 = [R * Math.sin(t1), y + rise - R + R * Math.cos(t1)]
    facet(b, key, [V(x - hw, p0[1], z + p0[0]), V(x + hw, p0[1], z + p0[0]), V(x + hw, p1[1], z + p1[0]), V(x - hw, p1[1], z + p1[0])], {
      seams: o.seams === false ? undefined : o.seams ? { ...o.seams, margin: 0.05 } : undefined,
      hint: V(0, Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2)),
      thickness: 0.1,
    })
  }
  return y + rise
}

/* ------------------------------------------------------------------ */
/* Domes, helms, spires                                                */
/* ------------------------------------------------------------------ */

export type DomeProfile = 'hemi' | 'onion' | 'bell' | 'cone' | 'saucer' | 'pear'

/** Radial profile [r, y] (unit radius, unit height) for common dome shapes. */
export function domeProfile(kind: DomeProfile, steps = 14): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let r: number
    switch (kind) {
      case 'hemi':
        r = Math.cos((t * Math.PI) / 2)
        break
      case 'saucer':
        r = Math.cos((t * Math.PI) / 2) ** 0.6
        break
      case 'cone':
        r = 1 - t
        break
      case 'bell':
        r = t < 0.35 ? 1 - 0.12 * Math.sin((t / 0.35) * Math.PI) : Math.cos(((t - 0.35) / 0.65) * (Math.PI / 2)) ** 0.8 * 0.95
        break
      case 'pear':
        r = Math.sin(Math.min(1, 0.35 + t * 0.9) * Math.PI) * (1 - t) ** 0.35 * 1.05
        break
      case 'onion':
      default:
        // swell above the drum, pinched neck and a long pointed tip
        r = t < 0.45 ? 0.82 + 0.3 * Math.sin((t / 0.45) * (Math.PI / 2)) : 1.12 * Math.cos(((t - 0.45) / 0.55) * (Math.PI / 2)) ** 1.6
        break
    }
    pts.push([Math.max(r, 0.002), t])
  }
  return pts
}

/** Lathe dome with optional meridian ribs (standing seams on a curved surface). */
export function dome(b: Builder, key: string, o: { x?: number; y: number; z?: number; r: number; h: number; profile?: DomeProfile | [number, number][]; seg?: number; ribs?: number; ribKey?: string; ribH?: number }) {
  const { x = 0, y, z = 0, r, h, seg = 36 } = o
  const prof = Array.isArray(o.profile) ? o.profile : domeProfile(o.profile ?? 'hemi')
  const pts = prof.map(([pr, py]) => [pr * r, py * h] as [number, number])
  b.add(key, lathe(pts, seg), mat(x, y, z))
  if (o.ribs) {
    const rk = o.ribKey ?? key
    const rh = o.ribH ?? Math.max(0.04, r * 0.012)
    for (let k = 0; k < o.ribs; k++) {
      const a = (k / o.ribs) * Math.PI * 2
      for (let i = 0; i < pts.length - 1; i++) {
        const [r0, y0] = pts[i]
        const [r1, y1] = pts[i + 1]
        if (r0 < r * 0.06 && r1 < r * 0.06) continue
        const A = V(x + Math.cos(a) * (r0 + rh / 2), y + y0, z + Math.sin(a) * (r0 + rh / 2))
        const B = V(x + Math.cos(a) * (r1 + rh / 2), y + y1, z + Math.sin(a) * (r1 + rh / 2))
        b.beam(rk, A, B, rh * 1.1, rh, V(Math.cos(a), 0, Math.sin(a)))
      }
    }
  }
  return y + h
}

/** Polygonal helm/spire (n sides) with optional seams on each face. */
export function spire(b: Builder, key: string, o: { x?: number; z?: number; y0: number; r: number; h: number; n?: number; phase?: number; seams?: SeamSpec | false }) {
  const { x = 0, z = 0, y0, r, h, n = 8, phase = Math.PI / n } = o
  const ring = polyRing(n, r, y0, phase, x, z)
  const apex = V(x, y0 + h, z)
  for (let i = 0; i < n; i++) facet(b, key, [ring[i], ring[(i + 1) % n], apex], { seams: o.seams === false ? undefined : o.seams })
  for (let i = 0; i < n; i++) b.beam(key, ring[i], apex, Math.max(0.06, r * 0.03), Math.max(0.05, r * 0.025))
  return y0 + h
}

/** Faceted helm from a list of [radius, y] stations on a regular n-gon (baroque helms, lanterns). */
export function helm(b: Builder, key: string, o: { x?: number; z?: number; n?: number; stations: [number, number][]; phase?: number; flat?: boolean }) {
  const { x = 0, z = 0, n = 8 } = o
  const phase = o.phase ?? Math.PI / n
  const rings = o.stations.map(([r, y]) => polyRing(n, Math.max(r, 0.004), y, phase, x, z))
  b.add(key, loft(rings, { capBottom: true, capTop: true, flat: o.flat ?? false }))
  return o.stations[o.stations.length - 1][1]
}

/** Latin (or Orthodox three-bar) cross on a small ball. s = cross height in metres. */
export function cross(b: Builder, key: string, x: number, y: number, z: number, s = 2, orthodox = false, ry = 0) {
  const t = s * 0.07
  const g = new Builder()
  g.add(key, new THREE.SphereGeometry(s * 0.12, 12, 8), mat(0, s * 0.1, 0))
  g.add(key, metricBox(t, s, t), mat(0, s * 0.62, 0))
  g.add(key, metricBox(s * 0.55, t, t), mat(0, s * 0.82, 0))
  if (orthodox) {
    g.add(key, metricBox(s * 0.28, t * 0.8, t), mat(0, s * 1.0, 0))
    g.add(key, metricBox(s * 0.4, t * 0.8, t), mat(0, s * 0.48, 0, 0, 0, 0.35))
  }
  b.merge(g, mat(x, y, z, ry))
}

/* ------------------------------------------------------------------ */
/* Facades: windows, doors, pilasters                                  */
/* ------------------------------------------------------------------ */

export type Face = '+x' | '-x' | '+z' | '-z'

/** Matrix mapping facade-local coords (u along facade left→right seen from outside, v up, n outward) to model space. */
export function faceFrame(face: Face, plane: number, u = 0, v = 0, n = 0) {
  switch (face) {
    case '+z':
      return mat(u, v, plane + n, 0)
    case '-z':
      return mat(-u, v, plane - n, Math.PI)
    case '+x':
      return mat(plane + n, v, -u, Math.PI / 2)
    case '-x':
    default:
      return mat(plane - n, v, u, -Math.PI / 2)
  }
}

export interface WindowSpec {
  type?: OpeningType
  w: number
  h: number
  glassKey?: string
  frameKey?: string
  /** frame width (m); 0 = no surround */
  frame?: number
  sill?: boolean
  /** mullion cross (u, v counts) */
  bars?: [number, number]
  /** outward offset of the glass from the wall plane */
  inset?: number
}

/** One window on a facade at facade-local (u, y0). */
export function window_(b: Builder, face: Face, plane: number, u: number, y0: number, s: WindowSpec) {
  const type = s.type ?? 'rect'
  const glassKey = s.glassKey ?? 'glassC'
  const frameKey = s.frameKey ?? 'trim'
  const f = s.frame ?? 0.22
  const m = faceFrame(face, plane, u, 0, 0)
  const glass = new THREE.ShapeGeometry(new THREE.Shape(opening(type, s.w, s.h, 0, y0, 10)))
  b.add(glassKey, glass, new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, s.inset ?? 0.03)))
  if (f > 0) b.add(frameKey, extrude(frameShape(type, s.w, s.h, f, 0, y0), 0.1), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.01)))
  if (s.sill) b.add(frameKey, metricBox(s.w + 2 * f + 0.2, 0.12, 0.28), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 - f - 0.04, 0.12)))
  if (s.bars) {
    const [nu, nv] = s.bars
    for (let i = 1; i < nu; i++) b.add(frameKey, metricBox(0.06, s.h * 0.94, 0.06), new THREE.Matrix4().multiplyMatrices(m, mat(-s.w / 2 + (i * s.w) / nu, y0 + s.h * 0.47, 0.06)))
    for (let j = 1; j < nv; j++) b.add(frameKey, metricBox(s.w, 0.06, 0.06), new THREE.Matrix4().multiplyMatrices(m, mat(0, y0 + (j * s.h) / nv, 0.06)))
  }
}

/** Row of identical windows centred on the facade: count windows evenly spaced between u0 and u1. */
export function windowRow(b: Builder, face: Face, plane: number, o: { u0: number; u1: number; count: number; y0: number } & WindowSpec) {
  if (o.count <= 0) return
  const step = (o.u1 - o.u0) / o.count
  for (let i = 0; i < o.count; i++) window_(b, face, plane, o.u0 + step * (i + 0.5), o.y0, o)
}

/** Grid of windows: floors × columns, centred between u0 and u1; floor sill heights listed. */
export function windowGrid(b: Builder, face: Face, plane: number, o: { u0: number; u1: number; cols: number; floors: number[] } & WindowSpec) {
  for (const y0 of o.floors) windowRow(b, face, plane, { ...o, count: o.cols, y0 })
}

/** Door / portal (dark leaf + surround). */
export function door(b: Builder, face: Face, plane: number, u: number, s: { w: number; h: number; type?: OpeningType; leafKey?: string; frameKey?: string; frame?: number; y0?: number }) {
  const m = faceFrame(face, plane, u, 0, 0)
  const type = s.type ?? 'rect'
  const y0 = s.y0 ?? 0
  b.add(s.leafKey ?? 'wood', new THREE.ShapeGeometry(new THREE.Shape(opening(type, s.w, s.h, 0, y0, 10))), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.03)))
  const f = s.frame ?? 0.3
  if (f > 0) b.add(s.frameKey ?? 'stoneLight', extrude(frameShape(type, s.w, s.h, f, 0, y0), 0.14), new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.01)))
}

/** Pilasters (flat vertical strips) on a facade between y0 and y1. */
export function pilasters(b: Builder, key: string, face: Face, plane: number, o: { us: number[]; y0?: number; y1: number; w?: number; depth?: number }) {
  const { y0 = 0, y1, w = 0.6, depth = 0.15 } = o
  for (const u of o.us) b.add(key, metricBox(w, y1 - y0, depth), new THREE.Matrix4().multiplyMatrices(faceFrame(face, plane, u, 0, 0), mat(0, (y0 + y1) / 2, depth / 2)))
}

/** Round columns (portico) on a line. */
export function columns(b: Builder, key: string, o: { pts: [number, number][]; y0?: number; h: number; r: number; capKey?: string }) {
  const { y0 = 0, h, r } = o
  for (const [x, z] of o.pts) {
    b.add(key, new THREE.CylinderGeometry(r * 0.88, r, h, 16), mat(x, y0 + h / 2, z))
    b.add(o.capKey ?? key, metricBox(r * 2.6, 0.3, r * 2.6), mat(x, y0 + h - 0.15, z))
    b.add(o.capKey ?? key, metricBox(r * 2.4, 0.25, r * 2.4), mat(x, y0 + 0.125, z))
  }
}

/** Triangular pediment on a facade (u0..u1 at height y, rise). */
export function pediment(b: Builder, key: string, face: Face, plane: number, o: { u: number; w: number; y: number; rise: number; depth?: number }) {
  const s = new THREE.Shape([new THREE.Vector2(-o.w / 2, 0), new THREE.Vector2(o.w / 2, 0), new THREE.Vector2(0, o.rise)])
  b.add(key, extrude(s, o.depth ?? 0.5), new THREE.Matrix4().multiplyMatrices(faceFrame(face, plane, o.u, 0, 0), mat(0, o.y, -0.1)))
}

/* ------------------------------------------------------------------ */
/* Composite church parts                                              */
/* ------------------------------------------------------------------ */

/**
 * Polygonal apse at the +X end of a nave/choir (half of a regular 2·sides-gon),
 * walls in wallKey, roof facets meeting at the ridge end in roofKey.
 * x0 = junction with the nave, hw = half width, y = eave height.
 */
export function polygonalApse(b: Builder, o: { x0: number; z?: number; hw: number; y: number; sides?: number; wallKey: string; roofKey: string; pitch: number; seams?: SeamSpec | false; overhang?: number; dir?: 1 | -1 }) {
  const { x0, z = 0, hw, y, sides = 3, pitch, overhang = 0.35, dir = 1 } = o
  const n = sides * 2
  const R = hw / Math.cos(Math.PI / n) // circumradius so that the side at the nave is flush
  const ring = (rr: number, yy: number) => {
    const pts: THREE.Vector3[] = [V(x0, yy, z - (hw * rr) / R)]
    for (let i = 0; i <= sides; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / sides
      pts.push(V(x0 + dir * Math.cos(a) * rr, yy, z + Math.sin(a) * rr))
    }
    pts.push(V(x0, yy, z + (hw * rr) / R))
    return dir === 1 ? pts : pts.reverse()
  }
  b.add(o.wallKey, loft([ring(R, 0), ring(R, y)], { capTop: true, flat: true }))
  const t = Math.tan(pitch * D2R)
  const Ro = R + overhang
  const ey = y - overhang * t
  const apex = V(x0, y + hw * t, z)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= sides; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / sides
    pts.push(V(x0 + dir * Math.cos(a) * Ro, ey, z + Math.sin(a) * Ro))
  }
  for (let i = 0; i < sides; i++) {
    facet(b, o.roofKey, [pts[i], pts[i + 1], apex], { seams: o.seams === false ? undefined : o.seams, thickness: 0.1 })
    b.beam(o.roofKey, pts[i], apex, 0.18, 0.1)
  }
  return apex.y
}

/** Square tower with stages (list of heights), cornices between stages, louvred belfry openings in the top stage. */
export function squareTower(b: Builder, o: { x?: number; z?: number; hw: number; stages: number[]; wallKey: string; corniceKey?: string; belfry?: { w: number; h: number; type?: OpeningType; count?: number } }) {
  const { x = 0, z = 0, hw } = o
  let y = 0
  o.stages.forEach((h, i) => {
    const inset = i * 0.12
    b.add(o.wallKey, metricBox(2 * (hw - inset), h, 2 * (hw - inset)), mat(x, y + h / 2, z))
    if (o.corniceKey) b.add(o.corniceKey, metricBox(2 * (hw - inset) + 0.5, 0.35, 2 * (hw - inset) + 0.5), mat(x, y + h - 0.17, z))
    y += h
  })
  if (o.belfry) {
    const top = o.stages[o.stages.length - 1]
    const yb = y - top + (top - o.belfry.h) / 2
    const hwT = hw - (o.stages.length - 1) * 0.12
    const count = o.belfry.count ?? 1
    for (const face of ['+x', '-x', '+z', '-z'] as Face[]) {
      const plane = face.endsWith('x') ? x + (face[0] === '+' ? hwT : -hwT) : z + (face[0] === '+' ? hwT : -hwT)
      const off = face.endsWith('x') ? -z * (face[0] === '+' ? 1 : -1) : x * (face[0] === '+' ? 1 : -1)
      windowRow(b, face, plane, { u0: off - hwT * 0.8, u1: off + hwT * 0.8, count, y0: yb, w: o.belfry.w, h: o.belfry.h, type: o.belfry.type ?? 'round', glassKey: 'black', frame: 0.25, frameKey: o.corniceKey ?? 'trim', bars: [1, 4] })
    }
  }
  return y
}

/** Presentation footprint board (thin, neutral) — use only when the model needs its own site base. */
export function siteBoard(b: Builder, key: string, w: number, d: number, h = 0.35) {
  b.block(key, w, h, d, 0, -h, 0)
}
