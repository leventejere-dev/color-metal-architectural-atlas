# Information requiring confirmation by COLOR METAL

The atlas never invents business information. Everything below is either left blank in
the app or shown with an explicit *approximate / probable* label until confirmed.

## Business data intentionally not published

The internal register (*Referinte Sol Arh*) also lists clients, general contractors,
architects, quantities (kg / m²), sales teams and offer dates. **None of this is published.**
The public site shows only the metal type and product line (e.g. *elZinc® Slate*,
*KME TECU® Patina Oslo*) and, where a COLOR METAL post text states it, the application
(roofing, façade, tower). Approve explicitly if any of these fields should be added.

## Projects whose COLOR METAL contribution is unconfirmed

Not in the January 2026 register — the app shows *Not specified*:

* Csíki Játékszín theatre, Miercurea Ciuc (folder `2026 aug csik szinhaz`)
* St John the Baptist church, Delnița (folder `2026 aug delne`)
* Berenczei-Kováts manor, Nisipeni (folder `Nisipeni - Satu Mare`)
* Bethlen castle, Arcalia (folder `Castel Arcalia`)
* *Biserica Pogorârea Duhului Sfânt*, Giroc — register row has no material

Listed only in a reference booklet / curated selection (shown as *featured in the
reference booklet*, not as *supplied*): Putna monastery, Reformed church Gherla, Károlyi
riding hall Carei, Bicaz Gorges refuge, COLOR METAL headquarters.

## Questions per project

| Project | Question |
|---|---|
| Giroc | The register lists copper under *Parohia ortodoxa Giroc*. Photos of that folder show the old church with a grey roof, while the new domed church has dark standing-seam domes. Which building received the copper? |
| Political Science faculty, Bucharest | Which building (Spiru Haret 8 or another faculty building) carries the elZinc Oliva? |
| Bojdeuca Ion Creangă, Iași | Which building of the memorial site carries the elZinc Slate (the historic house has shingles)? |
| Library of the Romanian Academy | Which wing received the titanium-zinc? |
| Palatul Principilor, Alba Iulia | Which bodies (A–G) of the complex received copper / zinc? |
| Metropolitan ensemble, Iași | The register says *ensemble*; the atlas shows the cathedral. Confirm (or add Sf. Gheorghe church / Metropolitan Palace). |
| Iulius Town, Timișoara | Which entrance is copper-clad? |
| Obstetrics clinic, Timișoara | Confirm it is the new maternity at Bd. Liviu Rebreanu 158A. |
| Water Museum, Timișoara | Confirm which building of the pumping-station site has the new elZinc roof. |
| Residential building, Odorheiu Secuiesc | Exact building / number on Strada Pantei (or keep street-level for privacy). |
| Bicaz Gorges refuge | Piatra Poienii (Neamț) or Gyilkos-kő (Harghita) cabin? |
| Bodogaia church | Which church (Reformed DN13C 199 is the leading candidate)? Folder is marked *not finished* — re-shoot after completion, then publish. |
| Tiny house *Zenius* | Location / whether it should be a map reference at all (mobile building, Facebook images). |
| Vila Constantin Geblescu | RA-APPS administration could not be confirmed online (location PROBABLE). |
| Sepsi OSK stadium, Banffy castle | Which long side carries the main stand / entrance façade (affects model orientation only). |

## Photograph approvals

COLOR METAL approved its own recent photos for publication (12 Nov 2026): St Michael's Cluj
(drone), Csíki Játékszín, Delnița, Nisipeni, Vărșag, Satu Mare car park — now in the galleries.
Still awaiting approval: Bodogaia (folder marked *not finished*). Vărșag: the finished-house
photos of the company post (2 Sept.) are not in the archive yet — add them to the folder to show
them in the gallery (the archive frames show the house under construction).
Projects with third-party photos only (never published): Dragomirna, Putna, Tismana,
BT Arena, Arcalia, Carei, Gherla, Bicaz refuge, tiny house. See `ASSET_LICENSES.md`.

## Register projects without company photographs

All won register projects that are locatable buildings were researched (`scripts/import-register.py`,
`data/geo/batch-d…n.json`). Buildings identified and photographed (public reference photographs, never
published) were modelled and are on the map. **Rows without any photograph are not shown** (client
decision, 12 Nov 2026) — ≈ 120 rows, mostly "Biserica, <village>" entries whose exact church is not
named, plus private houses. A photo (or the exact building) from COLOR METAL would bring any of them
onto the map: add the photos to the archive folder or `work/web-ref/<id>/` and re-run
`npm run db`. The full list is in the held-back section of `GEOLOCATION_REPORT.md`.

Needs COLOR METAL's input (building not identifiable from public sources — shown at town level):

| Register project | Question |
|---|---|
| Primăria Sectorului 5, București | The town hall (Fabrica de Chibrituri 9-11) is a plain modern block — which building was roofed? |
| UAD Cluj (Ti-Zn Slate, 2025) | Which of the university's buildings? |
| Clinic, Str. Croitorilor, Cluj | Which building (Croitorilor 19-21 complex is a candidate)? |
| Beica church | Reformed, Roman Catholic or wooden church, Beica de Jos or de Sus? |
| Catedrala Deva (2023, copper; register location Sibiu) | Episcopal cathedral Sf. Ierarh Nicolae or Adormirea Maicii Domnului? |
| Parohia Sf. Ilie, Suceava (2026, copper) | No such parish in Suceava city — Sfântu Ilie (Șcheia)? |
| UMF Iași (elZinc Slate, 2022) | Which building? |
| Liceul Tamási Áron, Odorheiu Secuiesc (zinc, 2024) | Which building of the campus (the 1912 main building still has tiles)? |
| Spitalul Militar Central, București | Which pavilion? (campus placed, no model) |
| Biblioteca Carianopol, Caracal | Building not in OpenStreetMap — exact position (Str. Iancu Jianu 18A, ±150 m). |
| Generic rows ("Biserica", "Primărie", "Clădire veche" …) | ≈ 100 rows name only the town — the exact building would allow a model. |
| Not geocodable | Biserica Voitești (Gorj), Parohia Valea Borcutului, Parohia Șindrești — village names to check. |

Research notes worth checking (location or surface uncertain): Rohia (Steinhardt centre vs. main church),
Văratec (zinc quantities suggest more than one building), Sucevița / Secu / Almaș / Ciolanu / Lainici / Gai /
Hurezi / Negru Vodă (which building of the monastery), Hotel Castel Daniel (register says Vârghiș; the hotel
is the Daniel castle in Tălișoara, Covasna — brass on details), Secu (register location Pipirig = neighbouring
commune), Muzeul Țăranului Român (tiled roofs — copper on details/tower), Sibiu Evangelical Cathedral (copper
location undocumented), Auto Schunn Arad and Spitalul Municipal Oradea (window sills / details, not roofing).

## Findings from the photo-based modelling (to confirm)

The modellers compared every model with its photographs; these observations affect what the
atlas can claim and are documented in each model's public note:

| Project | Observation |
|---|---|
| St. Michael's Church, Cluj | Company drone photos show glazed-tile main roofs; the only visible copper is the roof turret on the choir ridge. Register: copper sheet + ventilation mat. Which surfaces are COLOR METAL copper? |
| Palatul Principilor, Alba Iulia | Company drone photos show ceramic tiles on the palace wings; visible metal is limited to zinc vent dormers, copper gutters/downpipes and a zinc lean-to. The blue-grey metal roofs in photos 01/02 belong to the neighbouring St. Michael's Cathedral — check whether the reference set mixes the two buildings. |
| Iași Metropolitan Cathedral | Photos show four domed towers over a copper gable roof (no central dome) — modelled as photographed. |
| Observatorul Astronomic Iași | Dome green-patinated, hipped roofs aged brown: is the dome new COLOR METAL copper or restored original sheet? |
| Biblioteca Centrală Universitară, Iași | Photos show the 5-storey block with corner tower on Str. Vasile Conta (not the historic palace) — position moved there (PROBABLE). |
| Bojdeuca Ion Creangă | elZinc Slate is on the museum pavilion (pyramid roof ≈150 m²), not on the shingle-roofed memorial house — position moved to the pavilion. |
| Biblioteca Academiei Române | Zinc roofs belong to the central courtyard wing (OSM way 405546991) — position moved there. |
| Facultatea de Științe Politice | Photos match Spiru Haret 8 and show zinc (low hipped roof, attic); no tiles visible — VERIFIED. |
| Centrul Reformat Noul Mileniu | Community-centre wing roofs read as natural slate; zinc/copper modelled where visible. |
| Old Orthodox church, Giroc | Main roof is mid-grey standing seam; only the tower helm looks like copper (register: copper). |
| New church Pogorârea Duhului Sfânt, Giroc | Roofs dark-brown aged-copper look; main dome grey flat-lock shingles — material not in the register. |
| Nisipeni manor | A COLOR METAL product card (elZinc Natural strip) is in the archive folder; zinc visible on spire, corner dome, flashings and gutters — recorded as titanium-zinc. |
| Csíki Játékszín | Resolved by the total register: elZinc Natural titanium-zinc (2026). |
| Delnița church | Register: elZinc Natural strip (delivered April 2026) — on the broach spire (horizontal lapped courses) and gutters; nave roofs are clay tile. |
| Holiday house, Vărșag | Register: PREFA bronze; COLOR METAL's own photos of the finished house (company post, 2 Sept.) show a light-grey standing seam — modelled as photographed; check the register. |
| Tisza Castle, Geszt | Photos are construction details only (new brick walls); the finished building is never shown. |
| Piatra Tâlharului refuge | PREFA anthracite on the roof (down to ~1.2 m); walls are dark-stained timber. |
| Bicaz Gorges refuge | PREFA DS.19 shingles, P.10 stone grey — matches the PREFA "Bivouac" reference; still Piatra Poienii or Gyilkos-kő? |
| Tismana, Putna, Dragomirna, Gherla | Only web photos predating the works: the roofs are shown in the register's copper (Tismana/Dragomirna aged copper, Putna aged copper, Gherla helm and spire). |
| Obstetrics clinic, Timișoara | The total register row "Noua Maternitate Bega Timișoara" (expanded aluminium SOHO) is this project — consistent with the location. |
