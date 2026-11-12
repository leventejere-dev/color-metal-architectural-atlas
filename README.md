# COLOR METAL — Architectural Atlas

**Interactive 3D architectural reference map of Romania.** COLOR METAL's reference
buildings — copper, titanium-zinc and aluminium roofs and façades — at their real
locations on a sculpted terrain model of Romania, each with a recognisable architectural
miniature, the original reference photographs and the verified material information.

*Discover architecture through metal.* · RO (default) / HU / EN

**Live:** https://leventejere-dev.github.io/color-metal-architectural-atlas/
**Companion:** [COLOR METAL exhibition table](https://leventejere-dev.github.io/color-metal-exhibition/) — the four exhibition models are reused here unchanged.

## What it does

* **Terrain** — Romania as an ivory relief slab (real elevation, cut along the border,
  brass base line) on a light table with the neighbouring countries; county boundaries,
  rivers, cities, regions. Relief exaggeration ×5 nationally, easing to ×1.25 locally (shown on screen).
* **Architectural miniatures everywhere** — every building stands on the map as its own 3D
  miniature on a plinth, readable from the national view and growing as you approach until it
  stands at true 1:1 scale on its real site (enlargement always stated on screen). Close groups
  spread apart with leader lines to their true sites.
* **Walk-around mode** — a lifelike 1.76 m figure in a COLOR METAL jacket walks around the selected
  building at true scale (click/tap to walk, W A S D, eye-level view); walls block the way.
* **Fly-to** — smooth zoom-out/travel/zoom-in camera path, interruptible, reduced-motion aware.
* **Inspection** — orbit, zoom, reset / top / roof / façade / material views, ambient-occlusion
  close-ups, geographic or
  isolated studio context, model ↔ reality comparison next to the photographs.
* **Directory** — search (RO/HU names, towns, counties, products) and filters (metal,
  category, county, 3D model) that update list and map together.
* **Project card** — metal, product, application and COLOR METAL's contribution (only verified
  data), company text, location with accuracy & confidence, identification sources, gallery.
* **Share** — every project has its own URL: `#/project/<id>` (e.g. `#/project/casa-pogor`).
* **Guided tour** — presentation mode by route (all models, by metal, by region): pause,
  resume, previous, next, exit. Never starts automatically.
* Responsive: desktop panels; mobile full-screen map with bottom-sheet card.

## Data & documentation

| File | Content |
|---|---|
| `PROJECT_INVENTORY.json` | Archive audit: files, duplicates, folders → unique buildings, photos, register match |
| `GEOLOCATION_REPORT.md` | Identification method, confidence, every decision, full location table |
| `MODELING_PROGRESS.md` | Model tier/status per building, continuation plan |
| `MISSING_INFORMATION.md` | Everything COLOR METAL needs to confirm |
| `ASSET_LICENSES.md` | Sources, licences, photograph publication policy |
| `PROJECT_DECISIONS.md` | Architecture and design decisions |
| `docs/MODELING_GUIDE.md` | How models are made (conventions, API, palette, QA) |
| `docs/IMPORT_WORKFLOW.md` | Adding new reference projects |

Inputs: `data/sources` (archive → buildings), `data/geo` (research), `data/curation`
(verified material data & texts), `data/models` (model sidecars). Generated:
`src/data/projects.json` (`npm run db`), `public/geo` (`npm run geodata`),
`public/photos` (`npm run inventory`).

## Develop

```bash
npm install
npm run dev            # http://localhost:5174
npm run build          # type-check + production build (dist/)
npm run deploy         # build and publish dist/ to the gh-pages branch
npm run snap -- model <id>          # 4-view model QA sheet (dev server running, Chrome installed)
npm run snap -- atlas <projectId>   # screenshot of the atlas at a project
```

`?qa=1` shows the real OSM building outline under the selected model.

## Tech

React 19 · TypeScript · Vite · three.js · React Three Fiber · drei · zustand. Procedural
models and textures (no model files), self-hosted geodata, hash routing, relative base
path — static hosting on GitHub Pages.

© COLOR METAL SRL — Partner in Engineering. Geographic data © Natural Earth, AWS Terrain
Tiles sources, © OpenStreetMap contributors (see `ASSET_LICENSES.md`).
