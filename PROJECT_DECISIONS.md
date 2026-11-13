# Project decisions

## Architecture: one geographic Three.js scene + in-place inspection (option D, unified)

* **React + TypeScript + Vite + three.js / React Three Fiber / drei + zustand** — the same
  stack as the exhibition table, so the four exhibition models and the material/texture
  library are reused *unchanged* as code (`src/models/exhibition`, `src/lib`).
* No MapLibre / Cesium: the atlas does not need streets, tiles or a globe, and a single
  custom scene gives full control of the museum-model look, the lighting of the metals and
  continuous camera transitions. Everything is static → GitHub Pages.
* **Geography**: Romania is a sculpted terrain *slab* (real AWS Terrain Tiles elevation,
  zoom 9, baked once) cut along the national border with a signed-distance mask, with side
  walls and a brass base line, standing on a light table that prints the neighbouring
  countries and the Black Sea. Projection: oblique stereographic 46°N 25°E (spherical form
  of Stereo 70); 1 scene unit = 1 km. Grid convergence is applied to building bearings.
* **Relief exaggeration** is a declared visualisation choice: ×5 at national scale, easing
  to ×1.25 at building scale (the UI always shows the current factor), applied as a
  group Y-scale so normals stay correct.
* **Levels of detail**: national (pins + clusters + regions), regional (more labels,
  counties, clusters split), local (selected model loaded on demand, symbolically enlarged
  with an on-screen factor while far away), inspection (true 1:1 scale on its presentation
  base; orbit / top / roof / façade / material views; geographic ↔ isolated context;
  photo comparison). The site under the model is levelled into a small plateau so the
  base sits true.
* **Fly-to**: van Wijk & Nuij smooth zoom-and-pan path (zooms out while travelling),
  duration scaled with path length, interruptible by any input, instant with reduced
  motion; re-targets smoothly when the model's real size becomes known.
* **Lazy loading**: each model is a dynamic `import()` (one small JS chunk per building);
  an LRU cache keeps 4 built models and disposes evicted geometry. Photos load only in the
  info panel / gallery (thumbnails first).
* **Routing**: hash routes `#/project/<id>` (GitHub Pages compatible), `?lang=ro|hu|en`.

## Miniatures instead of pins (client decision, 12 Nov 2026)

* Every project stands on the map as its own architectural miniature (third round: directly on the
  ground, no plinth — see below) — from the national overview down to true scale. Far away each miniature
  keeps a readable on-screen size (it is symbolically enlarged; the factor is shown on screen);
  as the camera approaches it grows on screen and then settles at its real 1:1 size on its site.
* Cartographic priority instead of clusters: where enlarged miniatures would collide (Bucharest,
  Iași, Timișoara…), the more important one keeps its readable size — exhibition models, then models
  with published photographs, then other models — and the others stand compact on their own sites;
  small residual overlaps are pushed apart (≤ 1.6 radii, fine leader lines to the true site). Every
  miniature therefore stays at its town; as the camera approaches, the conflicts disappear and all
  grow to full size. (Third round: replaced by "+N" badges and fixed positions — see below.)
* Level of detail: a light far version of every model (thin parts such as seams, mullions and
  small ornaments dropped) is built progressively after the intro; the full model is built for the
  selected building and for miniatures that are large on screen (LRU cache of 6).
* A project whose model is still pending shows a small standing-seam roof sample in its metal —
  honest and symbolic, never a fake building (drawn instanced).
* Only projects with at least one photograph are shown (client decision, 12 Nov 2026): COLOR
  METAL's own photos, or the public reference photos a model was built from. The four exhibition
  models are always shown. Register rows that could not be tied to a photographed building stay
  in the data (held back, listed in `MISSING_INFORMATION.md`) but are not on the map.

## Walk-around mode (client request)

* A lifelike 1.76 m pedestrian in a COLOR METAL work jacket (logo on the back, rendered from the
  official logo file) explores the selected building at true scale: click/tap to walk, W A S D /
  arrows, Shift to run, drag to look, eye-level option, 55° street-view-like lens.
* Collisions: the model is sliced at 0.4 m and 1.2 m into a 20 cm occupancy grid — the figure
  walks around walls, not through them, and stays on the presentation base.

## Visual finishing

* Procedural surface textures (lime plaster, coursed ashlar, beaver-tail tiles, timber boards,
  fine grain) with relief bump for the neutral palette, and a finishing pass that gives any
  flat, non-metal model material a fine grain; the exhibition models keep their original materials.
* Screen-space ambient occlusion (N8AO) and ACES tone mapping in the close-up inspection and
  walk views on desktop.
* Where the only photographs predate COLOR METAL's work, the roofs are shown in the register's
  new metal (client instruction) and the public model note says so. Copper supplied up to 2022 is
  shown weathered brown, later copper bright; titanium-zinc and coated aluminium in their product colour.
* Buildings without company photographs (client instruction): every register project that could be
  identified individually was researched (location evidence, OSM outline) and modelled from public
  reference photographs (Wikimedia Commons first, otherwise press/official pages). These photographs
  are modelling references only — never published in the app; their sources are listed per building
  in `work/web-ref/<id>/sources.json`.

## Models

* Procedural, photo-interpreted architectural miniatures built with the exhibition's
  Builder API (merged per material → few draw calls) plus a reusable kit (roofs with
  standing seams, domes with ribs, helms, apses, towers, openings). No photogrammetry:
  the archive sets are not overlapping capture sets.
* Exhibition models are reused unchanged; only placement metadata was added. The stadium
  remains the exhibition half-section (stated in the app).
* Quality tiers A–D and statuses are stored per model in `data/models/<id>.json` and shown
  in the app; approximations are written in the public model note.

## Data

* Total register import: every won project that is a locatable building was researched —
  identified buildings with location evidence and web reference photos for modelling (never
  published) are on the map; rows without any photograph are held back (client decision).
  Dropped: own stock, resellers, interiors, gutter-only supplies, projects abroad, and private
  houses without photographs or other information (client decision). Private houses that do have
  company material (Vărșag, Odorheiu Secuiesc) are shown without owner data, at village/street level.
  Company names that appear in register rows instead of a building name are replaced by a neutral
  building type; the public research data carries register names only as one-way keys.
* Photographs: COLOR METAL's own photos are published (approved 12 Nov 2026); third-party and web
  reference photos are modelling references only (`ASSET_LICENSES.md`).
* One unique building = one project (deduplicated by folder semantics, name equivalence,
  identical files and photo comparison). 56 unique buildings from 29 top-level folders
  (~2 050 images, 418 redundant copies).
* Public data contains no client / contractor / quantity / price information.
* Hungarian names only where they are established names (no invented translations).
* Statistics on the map are computed from the database at runtime.

## Deployment

* GitHub repository `color-metal-architectural-atlas`, published from the `gh-pages`
  branch (same method as the exhibition table; the GitHub token has no `workflow` scope,
  so an Actions workflow is provided in `deploy/` for later use).

## Client decisions of 12 Nov 2026 (second round)

* **Realistic world**: the ivory relief print is replaced by satellite imagery (EOxCloudless 2016,
  Sentinel-2, CC BY 4.0 — the only commercially usable year of that mosaic) on the slab and the
  context table, with the baked normal map keeping the sculpted relief lighting; map labels use light
  text with a dark halo. The ivory print stays as a fallback when no satellite texture is baked.
* ~~Zoom-driven mode switch~~ — withdrawn in the third round (see below).
* **Drive mode**: a COLOR METAL car (arcade bicycle model, handbrake drift, turbo, skid marks) next to
  the walking figure; while walking/driving the building stands on the levelled ground without its
  base, and the terrain levelling covers whole mesh cells so nothing sinks into the relief.
* **Only modelled buildings with photographs are shown**; no placeholder markers.
* **Romanian-only interface**, hideable project list, light/dark mode (follows the system on first
  visit), no slogan in the header.
* **Sepsi Arena complete** — third round: the opposite long stand is plain (dark cladding on exposed
  steel frames, like the end stands), not a mirror of the zinc-clad main side.
* **Ensembles**: ancillary buildings with the same metal are modelled with the main building
  (e.g. Tazlău, Văratec, Rohia, Secu); base and camera centre on the whole composition.

## Client decisions of 13 Nov 2026 (third round)

* **Click to open, no zoom-driven switch**: a building's model view opens only on a click (or from the
  list / search); the map's closest zoom is 2.2 km so it never dives into the blurred ground. The
  camera frames the building's true-scale site (not its enlarged map miniature), and a safety net keeps
  it above the rendered ground — this fixes the empty/black model views of the second round.
* **No plinths, no counters, no swarming**: miniatures stand directly on the satellite ground with a
  soft contact shadow, and every building is always drawn. Where enlarged miniatures would overlap,
  they are arranged on a hex grid around their town — the most important first, each in the free cell
  nearest its real site, dense towns drawn proportionally smaller so they stay compact — with a fine
  brass leader line and a dot on the true location. The arrangement depends only on the zoom step
  (×1.3 steps with hysteresis), never on panning or rotating; it reflows smoothly between steps. The
  enlargement fades out near the ground, so neighbours a few hundred metres apart separate. (An
  intermediate "+N" badge version was withdrawn at the client's request.)
* **Flatbed truck, real size**: the drive mode uses a COLOR METAL flatbed pickup (5.9 m) loaded with
  copper and aluminium bars, tubes and sheet offcuts that slide, roll and knock against the sides under
  acceleration, braking, cornering and drifts. Truck and buildings always stay at 1:1 while driving
  (an intermediate "travel scale" that enlarged the truck was withdrawn at the client's request). The
  wheel / pinch zooms the camera onto the truck (≈6–600 m), dragging orbits around it. It drives
  anywhere on the relief (the slab edge is the only boundary) and collides with the buildings; for long
  distances a building picked in the list / search or the drive bar is reached by a fast hyperlapse
  drive (2–9 s, the camera rising like a following drone), arriving beside its main façade. The drive
  bar shows the nearest building with distance and direction. Walking has no invisible limit either.
* **Sepsi Arena**: the opposite long stand is plain — dark cladding on exposed steel frames with a
  white base and gates — as photographed; the gold-tone elZinc landmarks stay on the main side.

## COLOR METAL headquarters — whole site (13 Nov 2026)

* At the client's request the headquarters (`sediu-color-metal`) shows the whole site, not only the
  office block: the green expanded-aluminium office with its loggia and lettering, the 145 m warehouse
  hall (dock canopies, PV field), the second building with the green-mesh street end, and a light yard
  (paving, planted beds and island, ball trees, pergola, barrier). Modelled from the company's 26
  photographs (drone + ground) on the OSM outline (way 1360982485); bearing 73.4° confirmed by OSM.
* Unlike other single buildings the model is not re-centred: its origin is the project's geo point at the
  office front and the hall and second building sit at their measured positions (the atlas frames the
  whole composition as for ensembles).
* Its gallery comes from the marketing share via `extraFolders` (curated copies in
  `work/supplementary/sediu-color-metal`, duplicates and grey originals of the re-graded drone shots
  left out); cover = the frontal view of the office (photo 02).
