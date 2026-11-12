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

* Every project stands on the map as its own architectural miniature on a small ivory plinth
  with a brass ring — from the national overview down to true scale. Far away each miniature
  keeps a readable on-screen size (it is symbolically enlarged; the factor is shown on screen);
  as the camera approaches it grows on screen and then settles at its real 1:1 size on its site.
* Cartographic priority instead of clusters: where enlarged miniatures would collide (Bucharest,
  Iași, Timișoara…), the more important one keeps its readable size — exhibition models, then models
  with published photographs, then other models — and the others stand compact on their own sites;
  small residual overlaps are pushed apart (≤ 1.6 radii, fine leader lines to the true site). Every
  miniature therefore stays at its town; as the camera approaches, the conflicts disappear and all
  grow to full size. No cluster badges.
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
