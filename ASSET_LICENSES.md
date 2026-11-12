# Source and licence inventory

| Asset | Source | Licence / terms | How it is used |
|---|---|---|---|
| Country, county, lake, river and populated-place vectors | [Natural Earth](https://www.naturalearthdata.com/) 1:10m (via github.com/nvkelso/natural-earth-vector) | Public domain | Border slab, county lines, rivers, city label positions (`public/geo/vectors.json`, `table.webp`, `shade.webp`) |
| Elevation | [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen "terrarium"), zoom 9 | Open data; attribution required to the underlying sources: SRTM (NASA, public domain), GMTED2010 (USGS), ETOPO1 (NOAA), EU-DEM (produced using Copernicus data and information funded by the European Union), and others listed at github.com/tilezen/joerd/blob/master/docs/attribution.md | Baked once into `public/geo/height.bin`, `normal.webp`, `shade.webp`, `mask.webp` |
| City label coordinates not in Natural Earth (Odorheiu Secuiesc, Blaj, Carei) | © OpenStreetMap contributors | ODbL 1.0 | Three label positions |
| Building identification, outlines, footprints, bearings | © OpenStreetMap contributors (osm.org API, Nominatim) | ODbL 1.0 — attribution "© OpenStreetMap contributors" | Positions, orientation, model calibration (`data/geo`), QA outline |
| Identification evidence | Wikipedia / Wikidata, LMI heritage register, official sites, press (URLs per project in `data/geo/*.json` and in the app) | Cited, not redistributed | Facts only |
| Montserrat typeface | @fontsource/montserrat (Julieta Ulanovsky et al.) | SIL Open Font License 1.1 | UI typography (same as the exhibition table) |
| COLOR METAL logo | COLOR METAL SRL (copied from the exhibition-table project) | © COLOR METAL SRL, used by the owner | Header, intro |
| Reference photographs | COLOR METAL archive (`M:/05_Arhitectura/Refernciák befrissítve`) | © COLOR METAL SRL / photographers commissioned by COLOR METAL | See below |
| Procedural textures, models | Generated in code (this repository, and the exhibition-table repository) | © COLOR METAL SRL | Everything 3D |
| three.js, React, React Three Fiber, drei, zustand, camera-controls | npm | MIT | Runtime |

## Photograph publication policy

Only optimised copies (WebP, ≤ 1600 px) are published, never the originals. A project's
photos are published only when its archive folder shows they were already published or
prepared for publication by COLOR METAL (`2. posztolva`, `1. előkészítve`, the printed
reference booklets, or company shoots whose project is marked *on website = DA* in the
register). Classification per project: `rights` in `data/sources/project-sources.json`.

* `published` — public gallery. On 12 Nov 2026 COLOR METAL approved publication of its own
  recent shoots as well (Satu Mare car park, Cluj St. Michael's drone frames, Csíki Játékszín
  and Delnița August 2026 shoots, Nisipeni, Vărșag). Individual sources can be kept
  modelling-only with `notPublic` glob patterns (used for the car-park images that are crops
  of a web gallery with its interface visible).
* `company-unreviewed` — COLOR METAL's own shoots awaiting approval (currently only the
  held-back Bodogaia folder): **used for modelling only, not published** until approved —
  change `rights` to `published` and re-run `npm run inventory && npm run db` to publish.
* `third-party` — web / partner images (Dragomirna, Putna, Tismana, BT Arena, Arcalia,
  Carei, Gherla, Bicaz refuge, tiny house): **never published**; used only as modelling
  reference.
* Public reference photographs collected for the register buildings without company photos
  (`work/web-ref/<id>/`, Wikimedia Commons with author/licence, otherwise press/official
  pages with their URL in `sources.json`): **never published**; modelling reference only.
