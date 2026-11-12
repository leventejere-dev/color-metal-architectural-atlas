# Adding new reference projects

The archive stays read-only; the pipeline copies what it needs. Automatic steps and
human/expert steps are separated on purpose — accurate 3D models cannot be generated
automatically from a few photos.

| # | Step | How | Automatic? |
|---|---|---|---|
| 1 | Add the new folder to the archive (`M:/05_Arhitectura/Refernciák befrissítve`) | any structure | — |
| 2 | Scan | `python scripts/inventory.py --rescan --skip-photos` → the new folder appears under *unmapped folders* | yes |
| 3 | Map the folder to a building | add an entry to `data/sources/project-sources.json` (id, official name, town, county, category, folders, register name, `rights`, `status`). If it is the same building as an existing project, add the folder to that project's `folders` / `duplicates` instead | manual (5 min) |
| 4 | Export photos | `python scripts/inventory.py --only <id>` → `public/photos/<id>` (published only) and `work/photos/<id>` | yes |
| 5 | Material data | add `data/curation/projects.json` → `<id>`: metals, products, application, contribution source (register / company text) | manual, from the register |
| 6 | Company text | add the cleaned post text to `data/curation/texts.json` (optional) | manual |
| 7 | Geolocation research | add a record to a `data/geo/batch-*.json` file (schema in `GEOLOCATION_REPORT.md`; OSM outline, sources, confidence) | research (can be delegated to an AI agent with web access) |
| 8 | Build the database | `npm run db` → `src/data/projects.json`, reports updated | yes |
| 9 | Model | follow `docs/MODELING_GUIDE.md`: `src/models/buildings/<id>.ts` + `data/models/<id>.json`, QA with `npm run snap -- model <id>`; until then the project is *Tier D (location & photos)* | expert work |
| 10 | Check & publish | `npm run dev` → review; `npm run build`; `npm run deploy` | yes |

Photograph rights: set `rights` to `published` only for photos COLOR METAL has approved
for publication (see `ASSET_LICENSES.md`).
