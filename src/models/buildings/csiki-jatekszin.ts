/**
 * Csíki Játékszín theatre (former House of Culture), Miercurea Ciuc / Csíkszereda.
 *
 * Modelling specification. The Aug 2026 company photographs (12) show only the
 * roof works (new standing-seam metal being laid over black underlay on a large,
 * low-pitched roof; brick chimneys; the old grey-painted seamed roof; an adjoining
 * clay-tile slope). Massing and façades are therefore calibrated on the OSM outline
 * (way 217349806, 66 × 35 m, height tag 15 m, roof:shape hipped), public photographs
 * of the west front (Wikimedia Commons) and an aerial image (roof plan). Real metres,
 * +X = east (OSM long axis 84.8°), main front to the west (−X), facing the square
 * on Bd. Timișoarei.
 *  - West front: neoclassical temple front — wide flight of steps, podium, six
 *    square pillars with Ionic capitals, entablature and a low (≈ 18°) triangular
 *    pediment; five doors and five upper windows in the recessed wall behind.
 *  - Flanking wings (≈ 7 m) with large ceramic-mosaic murals on their front walls
 *    and hipped clay-tile roofs; front block 35 m wide.
 *  - Main block (auditorium/stage, 40.6 × 25.9 m): plain rendered walls; roof =
 *    tiled perimeter slopes rising to a curb at ≈ 13.3 m around a ≈ 35 × 15 m
 *    low-pitched (≈ 12°) hipped metal roof (grey in the aerial image) — the roof
 *    the company photographs show being re-clad. The pediment roof (metal) runs
 *    from the front back to this curb.
 *  - East annex (8.4 × 18.9 m) with a hipped tile roof.
 *  - NEW ROOF (as photographed, material not confirmed in the register): bright,
 *    natural silver standing-seam sheet (mill-finish look), pans ≈ 0.55 m, laid
 *    eave → ridge; modelled as completed. The pediment roof keeps the older grey
 *    metal finish.
 * Approximations: side and rear elevations not photographed (window rhythm
 * schematic); perimeter roof pitches, curb height and the extent of the new metal
 * roof (from a low-resolution aerial image and the roof-level photographs);
 * mosaic murals reduced to colour fields; chimney positions.
 */
import * as THREE from 'three'
import { Builder, V, extrude, facet, hipRoof, mat, metricBox, seams, window_, door } from '../kit'
import type { ModelModule } from '../registry'

const D2R = Math.PI / 180
const NEW = 'zincNatural' // elZinc Natural titanium-zinc (register, 2026), bright as photographed
const OLD = 'helm' // older grey sheet metal (pediment roof)
const SEAM_NEW = seams(NEW, 0.55, 0.05, 0.04)
const SEAM_OLD = seams(OLD, 0.55, 0.045, 0.04)

const ZP = -0.25 // axis of the portico / pediment (OSM portico strip z −10.5…10.3)
const PORT = { x0: -33.0, x1: -29.7, hw: 10.4 } // portico zone (column line near x0)
const FRONT = { x0: -29.7, x1: -16.0, hw: 17.6 } // front block incl. wings
const MAIN = { x0: -16.0, x1: 24.6, z0: -13.8, z1: 12.1, h: 9.3 }
const ANNEX = { x0: 24.6, x1: 33.0, z0: -9.8, z1: 9.1, h: 7.2 }
const CURB = { x0: -21.6, x1: 13.5, z0: -8.3, z1: 6.7, y: 13.3 }
const PODIUM = 1.05
const ENT = 8.5 // underside of the entablature
const ENT_TOP = 9.85
const PED_HW = 10.9 // half width of the pediment cornice
const PED_APEX = CURB.y

/** Four trapezoids between an outer eave rectangle (y0) and an inner curb rectangle (y1). */
function ringRoof(b: Builder, key: string, o: { x0: number; x1: number; z0: number; z1: number; y: number }, i: { x0: number; x1: number; z0: number; z1: number; y: number }, capKey: string) {
  const e = [V(o.x0, o.y, o.z0), V(o.x1, o.y, o.z0), V(o.x1, o.y, o.z1), V(o.x0, o.y, o.z1)]
  const c = [V(i.x0, i.y, i.z0), V(i.x1, i.y, i.z0), V(i.x1, i.y, i.z1), V(i.x0, i.y, i.z1)]
  const faces = [
    [e[3], e[2], c[2], c[3]],
    [e[1], e[0], c[0], c[1]],
    [e[0], e[3], c[3], c[0]],
    [e[2], e[1], c[1], c[2]],
  ]
  for (const f of faces) facet(b, key, f, { thickness: 0.15 })
  for (let k = 0; k < 4; k++) b.beam(capKey, e[k].clone().add(V(0, 0.1, 0)), c[k].clone().add(V(0, 0.1, 0)), 0.3, 0.2)
  return { e, c }
}

/** Ionic capital (abacus + volute pair) on a square pillar, facing ±X. */
function ionic(b: Builder, x: number, y: number, z: number, w: number) {
  b.block('csikStone', w + 0.25, 0.14, w + 0.25, x, y + 0.42, z) // abacus
  b.block('csikStone', w + 0.05, 0.3, w * 0.9, x, y + 0.12, z) // echinus block
  for (const sz of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.19, 0.19, w + 0.22, 14)
    b.add('csikStone', g, mat(x, y + 0.27, z + sz * (w / 2 + 0.04), 0, 0, Math.PI / 2))
  }
  b.block('csikStone', w + 0.14, 0.1, w + 0.14, x, y - 0.08, z) // necking
}

/** Ceramic mosaic mural on a west-facing wall: a grid of coloured tesserae with a few figure blobs. */
function mosaic(b: Builder, x: number, za: number, zb: number, y0: number, y1: number, seed: number) {
  let st = seed >>> 0
  const rnd = () => {
    st = (st * 1664525 + 1013904223) >>> 0
    return st / 4294967296
  }
  const cell = 0.58
  const z0 = Math.min(za, zb) + 0.3
  const z1 = Math.max(za, zb) - 0.3
  const nz = Math.floor((z1 - z0) / cell)
  const ny = Math.floor((y1 - y0) / cell)
  const blobs = [0, 1, 2, 3, 4].map((k) => ({
    z: z0 + rnd() * (z1 - z0),
    y: y0 + 1.2 + rnd() * (y1 - y0 - 2),
    r: 0.9 + rnd() * 1.4,
    key: ['csikMosaicGold', 'csikMosaicGold', 'csikMosaicBlue', 'csikMosaicRed', 'csikMosaicGold'][k],
  }))
  const g = new THREE.PlaneGeometry(cell * 0.94, cell * 0.94)
  for (let i = 0; i < nz; i++) {
    for (let j = 0; j < ny; j++) {
      const z = z0 + (i + 0.5) * cell
      const y = y0 + (j + 0.5) * cell
      let key = rnd() < 0.5 ? 'csikMosaic' : 'csikMosaicLight'
      for (const bl of blobs) if (Math.hypot(z - bl.z, (y - bl.y) * 0.7) < bl.r && rnd() < 0.8) key = bl.key
      if (key === 'csikMosaic' && rnd() < 0.06) key = 'csikMosaicBlue'
      b.add(key, g, mat(x, y, z, -Math.PI / 2))
    }
  }
}

function build(): Builder {
  const b = new Builder()

  /* ---------------- steps & podium ---------------- */
  const stepD = 0.34
  for (let i = 0; i < 7; i++) {
    const h = PODIUM * ((i + 1) / 7)
    const x0 = PORT.x0 - 7 * stepD + i * stepD
    b.block('csikStone', PORT.x0 - x0 + 0.01, h, 2 * (PORT.hw + 1.4), (x0 + PORT.x0) / 2, 0, ZP)
  }
  b.block('csikStone', PORT.x1 - PORT.x0 + 0.3, PODIUM, 2 * (PORT.hw + 1.4), (PORT.x0 + PORT.x1) / 2 - 0.15, 0, ZP)
  // cheek blocks at both ends of the stair
  for (const s of [-1, 1]) b.block('csikStone', 7 * stepD + 3.3, PODIUM + 0.25, 1.0, PORT.x0 - 7 * stepD / 2 + 1.1, 0, ZP + s * (PORT.hw + 1.9))

  /* ---------------- front block: recessed centre + mosaic wings ---------------- */
  const fx = (FRONT.x0 + FRONT.x1) / 2
  const fl = FRONT.x1 - FRONT.x0
  b.block('csikWall', fl, ENT_TOP, 2 * PORT.hw, fx, 0, ZP) // centre, up to the entablature
  for (const s of [-1, 1]) {
    const z0 = ZP + s * PORT.hw
    const z1 = s * FRONT.hw
    const zc = (z0 + z1) / 2
    const zw = Math.abs(z1 - z0)
    b.block('csikMosaic', fl, 8.6, zw, fx, 0, zc)
    b.block('csikStone', fl + 0.2, 0.9, zw + 0.2, fx, 0, zc)
    b.block('csikStone', fl + 0.5, 0.3, zw + 0.5, fx, 8.3, zc) // eaves band
    // ceramic mosaic mural on the west face (as photographed): coarse tessera grid
    mosaic(b, FRONT.x0 - 0.025, z0, z1, 1.0, 7.9, s > 0 ? 11 : 23)
    // hipped clay-tile roof of the wing
    const r = hipRoof(fx, zc, fl + 0.8, zw + 0.8, 8.6 - 0.4 * Math.tan(36 * D2R), 36 * D2R)
    r.facets.forEach((f) => facet(b, 'tileRed', f, { thickness: 0.12 }))
    r.lines.forEach(([p, q]) => b.beam('csikRidge', p.clone().add(V(0, 0.08, 0)), q.clone().add(V(0, 0.08, 0)), 0.26, 0.16))
  }
  // doors and upper windows in the recessed wall behind the pillars (five bays)
  const bay = (2 * (PORT.hw - 0.6)) / 5
  for (let i = 0; i < 5; i++) {
    const z = ZP - (PORT.hw - 0.6) + bay * (i + 0.5)
    door(b, '-x', FRONT.x0, z, { w: 1.7, h: 3.3, y0: PODIUM, leafKey: 'wood', frameKey: 'csikStone', frame: 0.18 })
    window_(b, '-x', FRONT.x0, z, PODIUM + 3.45, { w: 1.7, h: 0.6, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.12 })
    window_(b, '-x', FRONT.x0, z, 5.2, { w: 1.6, h: 2.3, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.16, bars: [2, 2] })
  }

  /* ---------------- portico: pillars, entablature, pediment ---------------- */
  const colX = PORT.x0 + 0.65
  const pw = 0.95
  const step = (2 * (PORT.hw - 0.55)) / 5
  for (let i = 0; i < 6; i++) {
    const z = ZP - (PORT.hw - 0.55) + i * step
    b.block('csikStone', pw + 0.3, 0.35, pw + 0.3, colX, PODIUM, z) // base
    b.block('csikStone', pw, ENT - 0.55 - PODIUM - 0.35, pw, colX, PODIUM + 0.35, z)
    ionic(b, colX, ENT - 0.55, z, pw)
  }
  // portico side walls (antae) against the wings
  for (const s of [-1, 1]) b.block('csikStone', PORT.x1 - PORT.x0, ENT - PODIUM, 0.5, (PORT.x0 + PORT.x1) / 2, PODIUM, ZP + s * (PORT.hw + 0.25))
  // entablature: architrave, frieze, cornice
  const ex0 = PORT.x0 - 0.05
  const ew = FRONT.x0 - ex0 + 0.4
  b.block('csikStone', ew, 0.6, 2 * PED_HW - 0.5, ex0 + ew / 2, ENT, ZP)
  b.block('csikStone', ew - 0.1, 0.5, 2 * PED_HW - 0.6, ex0 + ew / 2 + 0.05, ENT + 0.6, ZP)
  b.block('csikStone', ew + 0.45, 0.25, 2 * PED_HW, ex0 + ew / 2 - 0.2, ENT + 1.1, ZP)
  // pediment: tympanum + raking cornices
  const rise = PED_APEX - ENT_TOP
  const tri = new THREE.Shape([new THREE.Vector2(-PED_HW + 0.5, 0), new THREE.Vector2(PED_HW - 0.5, 0), new THREE.Vector2(0, rise - 0.35)])
  b.add('csikStone', extrude(tri, 1.2), mat(PORT.x0 + 0.95, ENT_TOP, ZP, -Math.PI / 2))
  for (const s of [-1, 1]) {
    const a = V(PORT.x0 - 0.35, ENT_TOP + 0.05, ZP + s * PED_HW)
    const c = V(PORT.x0 - 0.35, PED_APEX + 0.05, ZP)
    b.beam('csikStone', a, c, 0.42, 0.75, V(1, 0, 0))
  }

  /* ---------------- main block walls ---------------- */
  const mx = (MAIN.x0 + MAIN.x1) / 2
  const mz = (MAIN.z0 + MAIN.z1) / 2
  const ml = MAIN.x1 - MAIN.x0
  const md = MAIN.z1 - MAIN.z0
  b.block('csikWall', ml, MAIN.h, md, mx, 0, mz)
  b.block('csikStone', ml + 0.2, 0.9, md + 0.2, mx, 0, mz)
  b.block('csikStone', ml + 0.4, 0.35, md + 0.4, mx, MAIN.h - 0.35, mz)
  // schematic side-elevation windows (sides not photographed)
  for (const [face, plane] of [['+z', MAIN.z1], ['-z', MAIN.z0]] as const) {
    for (let i = 0; i < 8; i++) {
      const x = MAIN.x0 + 3.2 + i * 4.9
      const u = face === '+z' ? x : -x
      window_(b, face, plane, u, 1.6, { w: 1.5, h: 2.2, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.14, bars: [2, 2] })
      window_(b, face, plane, u, 5.3, { w: 1.5, h: 2.0, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.14, bars: [2, 2] })
    }
  }

  /* ---------------- east annex ---------------- */
  {
    const ax = (ANNEX.x0 + ANNEX.x1) / 2
    const az = (ANNEX.z0 + ANNEX.z1) / 2
    const al = ANNEX.x1 - ANNEX.x0
    const ad = ANNEX.z1 - ANNEX.z0
    b.block('csikWall', al + 0.3, ANNEX.h, ad, ax - 0.15, 0, az)
    b.block('csikStone', al + 0.4, 0.8, ad + 0.2, ax - 0.1, 0, az)
    const r = hipRoof(ax, az, al + 0.8, ad + 0.8, ANNEX.h - 0.4 * Math.tan(32 * D2R), 32 * D2R)
    r.facets.forEach((f) => facet(b, 'tileRed', f, { thickness: 0.12 }))
    r.lines.forEach(([p, q]) => b.beam('csikRidge', p.clone().add(V(0, 0.08, 0)), q.clone().add(V(0, 0.08, 0)), 0.26, 0.16))
    for (let i = 0; i < 4; i++) {
      const z = ANNEX.z0 + 2.4 + i * 4.7
      window_(b, '+x', ANNEX.x1, -z, 1.4, { w: 1.4, h: 1.8, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.12, bars: [2, 1] })
      window_(b, '+x', ANNEX.x1, -z, 4.4, { w: 1.4, h: 1.6, glassKey: 'glassC', frameKey: 'csikStone', frame: 0.12, bars: [2, 1] })
    }
    door(b, '+x', ANNEX.x1, -(az + 0.0), { w: 1.6, h: 2.6, leafKey: 'wood', frameKey: 'csikStone', frame: 0.15 })
  }

  /* ---------------- roofs ---------------- */
  // tiled perimeter slopes of the front block + main block, up to the curb
  const OUT = { x0: FRONT.x0 - 0.4, x1: MAIN.x1 + 0.4, z0: MAIN.z0 - 0.4, z1: MAIN.z1 + 0.4, y: MAIN.h - 0.3 }
  ringRoof(b, 'tileRed', OUT, CURB, 'csikRidge')
  // curb: metal edge between tiles and the metal roof
  b.add(NEW, metricBox(CURB.x1 - CURB.x0 + 0.5, 0.22, CURB.z1 - CURB.z0 + 0.5), mat((CURB.x0 + CURB.x1) / 2, CURB.y + 0.02, (CURB.z0 + CURB.z1) / 2))
  // low hipped metal roof over the hall — the re-clad roof (new natural metal standing seam)
  {
    const cx = (CURB.x0 + CURB.x1) / 2
    const cz = (CURB.z0 + CURB.z1) / 2
    const r = hipRoof(cx, cz, CURB.x1 - CURB.x0 + 0.3, CURB.z1 - CURB.z0 + 0.3, CURB.y + 0.12, 12 * D2R)
    r.facets.forEach((f) => facet(b, NEW, f, { seams: SEAM_NEW, thickness: 0.1 }))
    r.lines.forEach(([p, q]) => b.beam(NEW, p.clone().add(V(0, 0.07, 0)), q.clone().add(V(0, 0.07, 0)), 0.3, 0.12))
  }
  // pediment roof (older grey metal), from the pediment back to the curb
  {
    const xa = PORT.x0 - 0.6
    const xb = CURB.x0 + 0.2
    const hw = PED_HW + 0.15
    const ey = ENT_TOP + 0.15
    const ry = PED_APEX + 0.25
    for (const s of [-1, 1]) facet(b, OLD, [V(xa, ey, ZP + s * hw), V(xb, ey, ZP + s * hw), V(xb, ry, ZP), V(xa, ry, ZP)], { seams: SEAM_OLD, thickness: 0.12, hint: V(0, 1, s) })
    b.beam(OLD, V(xa, ry + 0.05, ZP), V(xb, ry + 0.05, ZP), 0.32, 0.14)
    for (const s of [-1, 1]) b.beam(OLD, V(xa - 0.05, ey + 0.02, ZP + s * hw), V(xa - 0.05, ry + 0.02, ZP), 0.25, 0.12, V(1, 0, 0))
  }

  /* ---------------- brick chimneys (as photographed) ---------------- */
  const yOnNorth = (z: number) => OUT.y + ((z - OUT.z0) / (CURB.z0 - OUT.z0)) * (CURB.y - OUT.y)
  for (const [x, z, h] of [
    [-6.0, CURB.z0 - 1.2, 2.6],
    [9.0, CURB.z0 - 1.6, 2.4],
  ] as [number, number, number][]) {
    const y0 = yOnNorth(z) - 0.5
    b.block('brickRed', 1.3, h + 0.5, 1.0, x, y0, z)
    b.block('csikStone', 1.45, 0.14, 1.15, x, y0 + h + 0.5, z)
  }

  return b
}

const model: ModelModule = {
  build,
  front: [-1, 0],
  materialFocus: [0, 14.55, -3.5],
  materials: () => ({
    csikWall: new THREE.MeshStandardMaterial({ color: '#ddd6c8', roughness: 0.9 }),
    csikStone: new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.88 }),
    csikMosaic: new THREE.MeshStandardMaterial({ color: '#c7c2b6', roughness: 0.7 }),
    csikMosaicLight: new THREE.MeshStandardMaterial({ color: '#d9d5cb', roughness: 0.65 }),
    csikMosaicGold: new THREE.MeshStandardMaterial({ color: '#c4a466', roughness: 0.6 }),
    csikMosaicBlue: new THREE.MeshStandardMaterial({ color: '#9aa8b3', roughness: 0.6 }),
    csikMosaicRed: new THREE.MeshStandardMaterial({ color: '#b46a52', roughness: 0.6 }),
    csikRidge: new THREE.MeshStandardMaterial({ color: '#9b4f37', roughness: 0.85 }),
  }),
  notes: 'Roof plan from an aerial image and the roof-level photographs, west front from public photographs; side and rear elevations, roof pitches and the extent of the new metal roof are approximate.',
}
export default model
