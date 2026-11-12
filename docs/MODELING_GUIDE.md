# Architectural model production guide

How every reference building of the COLOR METAL Architectural Atlas is modelled. The
four models of the COLOR METAL exhibition table (`src/models/exhibition/*`) are the
**minimum visual benchmark** — read `src/models/exhibition/church.ts` and `manor.ts`
before starting: real metres, a specification comment at the top, deliberate
proportions, standing seams that follow the roof geometry, restrained detail.

## 1. Scope — only the reference building

Model **only the COLOR METAL reference building** (all of its structurally connected
volumes). Never model neighbouring buildings, streets, trees, cars, people, fences,
parking, landscaping or street furniture. If the photos show scaffolding, cranes or
vehicles, ignore them. The building stands alone, like a museum scale model; the app
adds the neutral round presentation base.

## 2. Inputs

| What | Where |
|---|---|
| Reference photos (JPEG copies, 1400 px) | `work/ref/<id>/NN.jpg`, overview sheet `work/ref/<id>/_sheet.jpg` |
| Location, OSM outline, footprint dims, long-axis bearing, height hints | `data/geo/batch-*.json` (entry with `"id": "<id>"`) |
| Verified metal / product (what COLOR METAL supplied) | `data/curation/projects.json` |
| Archive mapping, notes | `data/sources/project-sources.json` |

The **photographs are the primary modelling source**. The OSM outline gives the true
footprint size and orientation; use it to calibrate proportions measured in the photos
(count window bays, compare heights to the footprint length, use people/doors ≈ 2.1–2.4 m).
Public sources (Wikipedia, heritage register) may clarify identity, heights or hidden
sides, but never replace the photos.

## 3. Conventions

* Units: **metres**, Y up. Origin = footprint centre at ground level (y = 0).
* **+X = the building's main axis** (the OSM long axis, `footprintDims.bearingDeg`).
  Decide which end +X points to (e.g. towards the apse/altar of a church, the tower at −X)
  and record the compass azimuth of +X (0–360°, clockwise from north) as `bearingDeg`
  in the sidecar. If the OSM long axis bearing is *b*, +X points to *b* or *b + 180*.
  Orthodox and Catholic churches normally have the altar to the east; verify with aerial photos.
* `front`: local (x, z) direction of the main façade (default `[0, 1]`). Used by the
  FACADE view and the default 3/4 view.
* `materialFocus`: local point (m) on the main COLOR METAL surface (roof / cladding /
  dome) for the MATERIAL close-up view.
* Keep the model within ±15 % of the OSM footprint dimensions unless the photos
  clearly show the outline is wrong (say so in the sidecar).

## 4. API

```ts
import { Builder, V, mat, metricBox, facet, loft, lathe, extrude, opening, polyRing, rectRing,
  volume, prism, prismOutline, ringBand, gableRoof, hippedRoof, mansardRoof, tentRoof, shedRoof,
  flatRoof, barrelRoof, dome, domeProfile, spire, helm, cross, window_, windowRow, windowGrid,
  door, pilasters, columns, pediment, polygonalApse, squareTower, faceFrame, seams } from '../kit'
import type { ModelModule } from '../registry'

function build(): Builder { const b = new Builder(); /* … */ return b }
const model: ModelModule = { build, front: [0, 1], materialFocus: [0, 14, 4], notes: '…' }
export default model
```

* `Builder.add(key, geometry, matrix?)`, `.box`, `.block` (bottom at y0), `.beam(a, b, w, h)`,
  `.rod(a, b, r)`, `.merge(sub, matrix)`. Geometry is merged per material key (one draw
  call per material) — always build through the Builder.
* `facet(b, key, points, { seams, thickness })` — planar polygon; with `seams` it adds
  standing seams running up the slope, clipped to the polygon. Use for every metal roof face.
* Kit helpers are documented in `src/models/kit/index.ts` (gable/hip/mansard/tent/shed/
  barrel roofs, domes with meridian ribs, spires, baroque helms from stations, polygonal
  apses, windows/doors/pilasters/pediments on façades addressed as `'+x' | '-x' | '+z' | '-z'`).
* Standing seams: real spacing 0.43–0.60 m (`seams('copperNew', 0.5)`), rib height
  0.025–0.08 m. Never oversized decorative ribs.
* Building-specific materials: `materials: (base) => ({ myPlaster: new THREE.MeshStandardMaterial({ color: '#…', roughness: 0.9 }) })`.

### Palette keys (`src/lib/palette.ts`)

Metals — `copperNew` (bright new), `copper` (few years, warm brown-red), `copperBrown`
(dark oxidised), `copperPatina` (green, only if the photos show it), `copperPrepat`
(pre-patinated), `zincNatural`, `zincSlate`, `zincGraphite`, `zincOliva`, `zinc`
(elZinc Rainbow Gold), `alu` (anthracite), `aluDarkGrey`, `aluBronze`, `aluNatural`,
`aluCopperline`, `expMesh` (gold expanded mesh), `expMeshGreen`, `brass`, `gilt`, `helm`
(light grey flashing). Neutral — `plasterWhite`, `plasterCream`, `plasterOchre`,
`plasterYellow`, `plasterPink`, `plasterGrey`, `plasterSand`, `brick` (textured),
`brickRed`, `stoneLight`, `stoneWarm`, `stoneGrey`, `stone`, `concrete`, `concreteLight`,
`timber`, `wood`, `shingle`, `tileRed`, `tileBrown`, `glassC` (dark glazing), `glassM`,
`glassG` (light reflective), `skylight`, `white`, `trim`, `iron`, `black`, `socle`.

**Metal surfaces**: the metal type comes from the verified data (`data/curation`), the
*appearance* (new / aged / pre-patinated / colour) from the photographs. Copper is not
automatically green; zinc is not chrome.

## 5. Quality tiers

* **A** premium: highly recognisable, detailed roof geometry, refined façades.
* **B** recognisable: correct silhouette and proportions, the important roof forms,
  essential façade rhythm (default target).
* **C** preliminary: few/poor photos — simplified but honest massing.
* **D** no model (location & photos only).

Statuses for the sidecar: `detailed` (A), `preview` (B), `reference-limited` (C).

## 6. Workflow per building

1. Study all photos (`_sheet.jpg`, then individual images) and the OSM outline. Write a
   specification comment at the top of the file: volumes, roof forms, openings rhythm,
   metal surfaces, what is approximated (same style as the exhibition models).
2. Write `src/models/buildings/<id>.ts`.
3. Type-check: `npx tsc --noEmit -p tsconfig.json` (ignore errors in other people's files).
4. Render the QA sheet (dev server on :5174 must be running):
   `node scripts/snap.mjs model <id>` → `work/snaps/model-<id>.png`
   (front 3/4, rear 3/4, top, side). Compare with the photos. **Iterate at least twice**:
   proportions, roof pitch, tower/dome heights, window rhythm, materials.
5. Write the sidecar `data/models/<id>.json`:

```json
{
  "tier": "B",
  "status": "preview",
  "bearingDeg": 92.5,
  "bearingSource": "OSM long axis 92.5°; apse to the east (aerial photo 03)",
  "cover": "03",
  "photosUsed": 9,
  "approximations": "north side not photographed — mirrored from south; dome rib count estimated",
  "note": {
    "ro": "Machetă interpretată după fotografiile de referință; …",
    "hu": "A referenciafotók alapján értelmezett makett; …",
    "en": "Scale model interpreted from the reference photographs; …"
  }
}
```

`cover` = the best exterior photo number for the project card. `note` is shown to the
public: one or two honest sentences about what is approximated.

## 7. Performance

* Aim for < 120 k triangles per model (exhibition models: 40–150 k). Lathe/round
  segments 24–48; windows as framed dark panels, not boolean holes, on large façades.
* No textures other than the palette; no external files.
* Never build per-frame; everything happens once in `build()`.

## 8. Do not

* Do not edit shared files (`src/models/kit`, `src/lib`, `src/models/registry.ts`, other
  buildings, `src/data/projects.json`). Copy a helper into your own file if it needs changes.
* Do not invent COLOR METAL's contribution, dates, dimensions presented as exact, or
  architect names. Approximations are fine when the sidecar says so.
* Do not model the surroundings.
