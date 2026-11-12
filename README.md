# COLOR METAL — Architectural Atlas

**Interactive 3D architectural reference map of Romania.** COLOR METAL's reference
buildings — copper, titanium-zinc and aluminium roofs and façades — at their real
locations on a satellite-textured relief of Romania, each as a recognisable architectural
model, with the company's photographs and the verified material information.

*Discover architecture through metal.* · Romanian interface · light & dark mode

**Live:** https://leventejere-dev.github.io/color-metal-architectural-atlas/
**Companion:** [COLOR METAL exhibition table](https://leventejere-dev.github.io/color-metal-exhibition/) — the four exhibition models are reused here (the stadium completed to the whole bowl).

## What it does

* **Terrain** — Romania as a relief slab (real elevation, cut along the border, brass base line)
  draped with the EOxCloudless 2016 Sentinel-2 satellite mosaic, on a satellite context table with
  the neighbouring countries; county boundaries, rivers, cities, regions. Relief exaggeration ×5
  nationally, easing to ×1.25 locally (shown on screen).
* **Architectural models everywhere** — every reference building (≈150, each with photographs) is a
  3D model on the map, readable from the national view and growing as you approach until it stands
  at true 1:1 scale on its real site; important models keep their size in dense areas. Monastery and
  palace ensembles include the ancillary buildings that carry the same metal.
* **Zoom like a map** — zooming in on a building switches to its model view (like entering Street
  View); zooming back out returns to the map.
* **Walk & drive** — a lifelike 1.76 m figure in a COLOR METAL jacket (walk / fast run, eye level) or a
  COLOR METAL car (throttle, brake, turbo, handbrake drift with skid marks, chase or cockpit view)
  around the selected building at true scale; walls block the way.
* **Fly-to** — smooth zoom-out/travel/zoom-in camera path, interruptible, reduced-motion aware.
* **Inspection** — orbit, zoom, reset / top / roof / façade / material views, ambient-occlusion
  close-ups, geographic or isolated studio context, model ↔ reality comparison next to the photographs.
* **Directory** — hideable list with search (names, towns, counties, products) and filters (metal,
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

Inputs: `data/sources` (archive → buildings), `data/geo` (research, public sanitised copies), `data/curation`
(verified material data & texts), `data/models` (model sidecars). Generated:
`src/data/projects.json` (`npm run db`), `public/geo` (`npm run geodata`),
`public/photos` (`npm run inventory`), `public/geo/satellite*.webp` (`python scripts/build-satellite.py`).

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
Tiles sources, satellite imagery EOxCloudless 2016 by EOX IT Services GmbH (contains modified
Copernicus Sentinel data 2016, CC BY 4.0), © OpenStreetMap contributors (see `ASSET_LICENSES.md`).
