# Geolocation report

Every map position in the atlas is backed by evidence. Research was done per building
(OpenStreetMap objects via the OSM API and Nominatim, Wikidata, ro/hu/en Wikipedia,
the Romanian heritage register (LMI) codes, official websites, municipal pages, press),
cross-checked against the archive photographs where the identity was ambiguous.

* Raw research records (with source URLs, OSM ids, outlines, notes): `data/geo/batch-a.json`,
  `batch-b.json`, `batch-c.json`.
* Manual decisions on top of the research: `data/geo/overrides.json`.
* Coordinates are the centroid of the OSM building outline (6 decimals, WGS84) unless the
  accuracy column says otherwise.

## Confidence levels

* **VERIFIED** — identity and position confirmed by ≥ 2 independent sources, or a clearly
  named OSM object plus one more source.
* **PROBABLE** — very likely, some doubt remains (stated in the notes).
* **UNRESOLVED** — not published on the map.

Accuracy: **building** (on the building), **site** (on the property/complex), **street**,
**locality** (town/village only — shown in the app as *approximate location*).

## Cases that needed judgement

| Project | Decision |
|---|---|
| Giroc (two folders) | Two different buildings, confirmed from the photos: the new cross-domed church *Pogorârea Duhului Sfânt* (begun 2016) and the old baroque church Sf. Dimitrie (1759) of the same Orthodox parish, ~70 m apart. Kept as two projects. Hungarian name of Giroc: Gyüreg. |
| Satu Mare cathedral (two folders) | Folders *Adormirea Maicii Domnului Satu Mare* and *Catedrala Ortodoxa Satu Mare* describe the same building (both post texts) — merged into one project. |
| Voluntari | Folder *Catedrala din Voluntari* = register row *Biserica Sfânta Cuvioasă Parascheva* (same patron saints in the post text) — merged. |
| Cluj-Napoca (`Kolozsvár` folder) | Drone frames DJI_0524–0531 show St. Michael's Church on Piața Unirii — merged with register row *Catedrala Sf. Mihail*. |
| Feliceni | `xxxx Fenti képek/Boldogfalva.JPG` = Felsőboldogfalva (Feliceni) — added to the Feliceni project. |
| Sepsi OSK stadium | Stadium is OSM way 763941868 (the separate *Sepsi Arena* hall is not the reference). Renamed *Sepsi Duna Aréna* in May 2025 — both names shown. |
| Satu Mare car park (exhibition model) | PROBABLE, site level: the new municipal multi-storey car park at Str. Mihail Kogălniceanu / Retezatului — the only multi-storey car park completed in Satu Mare by 2026; no source describes the gold mesh façade. Alternative: a second municipal car park on Str. Decebal. **Needs confirmation.** |
| Iulius Town entrance | Mall certain; the specific copper entrance not located — site level. |
| Water Museum, Timișoara | Site certain (Calea Urseni 26); building chosen from press about the new roof. |
| Obstetrics clinic, Timișoara | PROBABLE: the new maternity at Bd. Liviu Rebreanu 158A (2024) — the company post does not name the hospital. |
| Political Science faculty, Bucharest | PROBABLE: Casa P.P. Negulescu, Str. Spiru Haret 8; a source reports ceramic tiles after its 2020–22 restoration, so the location of the elZinc Oliva works must be confirmed. |
| Bojdeuca Ion Creangă | The historic house has a shingle roof; the elZinc Slate was likely used on another building of the memorial site — see the model note. |
| Residential building, Odorheiu Secuiesc | Street level only: *str Lejtő* = Strada Pantei; the building itself is not identified. |
| Holiday house, Vărșag | Private residence — deliberately shown at village level only. |
| Bicaz Gorges refuge | PROBABLE: Piatra Poienii panoramic cabin (2021, Neamț); an identical cabin exists at Gyilkos-kő (Harghita). |
| Bodogaia church | UNRESOLVED (three churches in Alsóboldogfalva/Bodogaia; the Reformed church, DN13C nr. 199, is the leading candidate). The project is also marked *not finished* in the archive → not published. |
| Delnița | OSM / miserend.hu position used; Wikidata/hu.wiki point to the cemetery chapel instead. |
| COLOR METAL headquarters | Str. Nicolae Bălcescu 95, Odorheiu Secuiesc (company registry / color-metal.ro contact page); OSM has only the whole warehouse outline. |
| Tisza Castle, Geszt | Outside Romania (Békés county, Hungary) — shown on the context table beyond the border. |

## Generated table (from `npm run db`)

<!-- GENERATED-TABLE:START -->
| id | name | town | county | lat, lon | accuracy | confidence | map |
|---|---|---|---|---|---|---|---|
| `sepsi-osk-arena` | Stadionul Sepsi OSK (Sepsi Duna Aréna) | Sfântu Gheorghe | Covasna | 45.883412, 25.807074 | building | VERIFIED | published |
| `biserica-reformata-tasnad` | Biserica Reformată din Tășnad | Tășnad | Satu Mare | 47.476075, 22.581752 | building | VERIFIED | published |
| `castelul-banffy-rascruci` | Castelul Bánffy din Răscruci | Răscruci | Cluj | 46.906441, 23.774263 | building | VERIFIED | published |
| `parcare-satu-mare` | Parcare supraetajată Satu Mare | Satu Mare | Satu Mare | 47.794398, 22.872045 | building | VERIFIED | published |
| `ansamblul-mitropolitan-iasi` | Catedrala Mitropolitană din Iași | Iași | Iași | 47.161515, 27.582045 | building | VERIFIED | published |
| `ateneul-roman` | Ateneul Român | București | București | 44.441346, 26.097359 | building | VERIFIED | published |
| `biblioteca-academiei-romane` | Biblioteca Academiei Române | București | București | 44.445287, 26.088995 | building | VERIFIED | published |
| `biblioteca-centrala-universitara-iasi` | Biblioteca Centrală Universitară „Mihai Eminescu” | Iași | Iași | 47.17023, 27.57775 | building | PROBABLE | published |
| `biserica-pogorarea-duhului-sfant-giroc` | Biserica „Pogorârea Duhului Sfânt”, Giroc | Giroc | Timiș | 45.699979, 21.235101 | building | VERIFIED | published |
| `parohia-ortodoxa-giroc` | Biserica Parohiei Ortodoxe Române Giroc | Giroc | Timiș | 45.700137, 21.234184 | site | VERIFIED | published |
| `biserica-amzei` | Biserica Amzei | București | București | 44.44441, 26.093857 | building | VERIFIED | published |
| `biserica-casin` | Biserica Cașin | București | București | 44.467621, 26.074855 | building | VERIFIED | published |
| `biserica-romano-catolica-tamasu` | Biserica Romano-Catolică din Tămașu | Tămașu | Harghita | 46.346975, 25.287685 | building | VERIFIED | published |
| `biserica-romano-catolica-zetea` | Biserica Romano-Catolică din Zetea | Zetea | Harghita | 46.387937, 25.365997 | building | VERIFIED | published |
| `biserica-domnita-balasa` | Biserica Domnița Bălașa | București | București | 44.428249, 26.100259 | building | VERIFIED | published |
| `biserica-reformata-feliceni` | Biserica Reformată din Feliceni | Feliceni | Harghita | 46.274055, 25.279849 | building | VERIFIED | published |
| `bojdeuca-ion-creanga` | Bojdeuca Ion Creangă | Iași | Iași | 47.174821, 27.582962 | building | PROBABLE | published |
| `casa-berthelot-iasi` | Casa General Henri Mathias Berthelot | Iași | Iași | 47.173827, 27.574347 | building | VERIFIED | published |
| `casa-macca` | Casa Macca | București | București | 44.447067, 26.092439 | building | VERIFIED | published |
| `casa-pogor` | Casa Pogor | Iași | Iași | 47.172052, 27.576269 | building | VERIFIED | published |
| `catedrala-ortodoxa-satu-mare` | Catedrala Ortodoxă „Adormirea Maicii Domnului” Satu Mare | Satu Mare | Satu Mare | 47.791093, 22.881314 | building | VERIFIED | published |
| `biserica-sf-mihail-cluj` | Biserica Romano-Catolică „Sfântul Mihail” | Cluj-Napoca | Cluj | 46.769949, 23.589516 | building | VERIFIED | published |
| `centrul-reformat-noul-mileniu` | Centrul Reformat „Noul Mileniu” | Timișoara | Timiș | 45.759669, 21.25798 | building | VERIFIED | published |
| `cladire-rezidentiala-odorheiu-secuiesc` | Clădire rezidențială, Odorheiu Secuiesc | Odorheiu Secuiesc | Harghita | 46.311355, 25.287355 | street | PROBABLE | published |
| `clinica-obstetrica-timisoara` | Clinicile de Obstetrică-Ginecologie și Neonatologie Timișoara | Timișoara | Timiș | 45.737518, 21.244105 | building | PROBABLE | published |
| `vila-constantin-geblescu` | Vila Constantin Geblescu | București | București | 44.44624, 26.103805 | building | PROBABLE | published |
| `intrare-iulius-town-timisoara` | Intrarea Iulius Town Timișoara | Timișoara | Timiș | 45.766602, 21.228339 | site | PROBABLE | published |
| `liceul-teoretic-ady-endre` | Liceul Teoretic „Ady Endre” | București | București | 44.443033, 26.126742 | building | VERIFIED | published |
| `manastirea-barnova` | Mănăstirea Bârnova | Bârnova | Iași | 47.0745, 27.627355 | building | VERIFIED | published |
| `manastirea-dragomirna` | Mănăstirea Dragomirna | Mitocu Dragomirnei | Suceava | 47.757945, 26.230057 | building | VERIFIED | published |
| `manastirea-frumoasa` | Mănăstirea Frumoasa | Iași | Iași | 47.139277, 27.587381 | building | VERIFIED | published |
| `manastirea-putna` | Mănăstirea Putna | Putna | Suceava | 47.866071, 25.596703 | building | VERIFIED | published |
| `manastirea-tazlau` | Mănăstirea Tazlău | Tazlău | Neamț | 46.725464, 26.462782 | building | VERIFIED | published |
| `manastirea-tismana` | Mănăstirea Tismana | Tismana | Gorj | 45.080523, 22.927124 | building | VERIFIED | published |
| `muzeul-istorie-arheologie-piatra-neamt` | Muzeul de Istorie și Arheologie Piatra-Neamț | Piatra Neamț | Neamț | 46.927967, 26.369418 | building | VERIFIED | published |
| `muzeul-apei-timisoara` | Muzeul Apei Timișoara | Timișoara | Timiș | 45.724353, 21.255402 | building | PROBABLE | published |
| `observatorul-astronomic-iasi` | Observatorul Astronomic Iași | Iași | Iași | 47.193101, 27.555433 | building | VERIFIED | published |
| `palatul-cultural-blaj` | Palatul Cultural din Blaj | Blaj | Alba | 46.173498, 23.92146 | building | VERIFIED | published |
| `palatul-principilor-alba-iulia` | Palatul Principilor, Alba Iulia | Alba Iulia | Alba | 46.066935, 23.57074 | building | VERIFIED | published |
| `scoala-95-bucuresti` | Școala Gimnazială nr. 95 | București | București | 44.415755, 26.123174 | building | VERIFIED | published |
| `bt-arena-cluj` | Sala Polivalentă BT Arena | Cluj-Napoca | Cluj | 46.767139, 23.570428 | building | VERIFIED | published |
| `facultatea-stiinte-politice-bucuresti` | Facultatea de Științe Politice, Universitatea din București | București | București | 44.440661, 26.090497 | building | VERIFIED | published |
| `castelul-tisza-geszt` | Castelul Tisza, Geszt | Geszt | Békés (HU) | 46.883543, 21.57885 | building | VERIFIED | published |
| `refugiu-piatra-talharului` | Refugiul montan Piatra Tâlharului | Piatra Tâlharului | Bihor | 46.673298, 22.741107 | building | VERIFIED | published |
| `catedrala-voluntari` | Catedrala din Voluntari | Voluntari | Ilfov | 44.493821, 26.182895 | building | VERIFIED | published |
| `conacul-berenczei-kovats-nisipeni` | Conacul Berenczei-Kováts, Nisipeni | Nisipeni (Satu Mare) | Satu Mare | 47.901661, 22.903644 | building | PROBABLE | published |
| `csiki-jatekszin` | Teatrul „Csíki Játékszín”, Miercurea Ciuc | Miercurea Ciuc | Harghita | 46.359134, 25.803738 | building | VERIFIED | published |
| `biserica-delnita` | Biserica Romano-Catolică „Sf. Ioan Botezătorul”, Delnița | Delnița | Harghita | 46.407076, 25.812978 | building | VERIFIED | published |
| `castelul-bethlen-arcalia` | Castelul Bethlen din Arcalia | Arcalia | Bistrița-Năsăud | 47.085461, 24.354089 | building | VERIFIED | published |
| `casa-de-vacanta-varsag` | Casă de vacanță, Varșag | Varșag | Harghita | 46.531555, 25.339001 | locality | PROBABLE | published |
| `manejul-carei` | Manejul Castelului Károlyi, Carei | Carei | Satu Mare | 47.683309, 22.46565 | building | PROBABLE | published |
| `refugiu-cheile-bicazului` | Refugiu montan, Cheile Bicazului | Cheile Bicazului | Neamț | 46.808744, 25.818644 | building | PROBABLE | published |
| `biserica-reformata-gherla` | Biserica Reformată din Gherla | Gherla | Cluj | 47.027524, 23.909574 | building | PROBABLE | published |
| `sediu-color-metal` | Sediul COLOR METAL | Odorheiu Secuiesc | Harghita | 46.319438, 25.307063 | building | VERIFIED | published |
| `palatul-nifon-bucuresti` | Palatul Nifon Mitropolitul | București | București | 44.434246, 26.098666 | building | VERIFIED | published |
| `biserica-luterana-bucuresti` | Biserica Evanghelică C.A. București (Biserica Luterană) | București | București | 44.440583, 26.093242 | building | VERIFIED | published |
| `hotel-bulevard-bucuresti` | Grand Hôtel du Boulevard (Corinthia Grand Hotel du Boulevard Bucharest) | București | București | 44.434523, 26.097818 | building | VERIFIED | published |
| `biserica-schitul-magureanu` | Biserica Schitul Măgureanu | București | București | 44.439216, 26.087345 | building | VERIFIED | published |
| `universitatea-de-muzica-bucuresti` | Universitatea Națională de Muzică București — clădirea principală (Corp A), Str. Știrbei Vodă 33 | București | București | 44.439413, 26.090572 | building | PROBABLE | published |
| `muzeul-taranului-roman` | Muzeul Național al Țăranului Român | București | București | 44.454359, 26.083589 | building | VERIFIED | published |
| `palatul-cesianu-racovita` | Palatul Cesianu-Racoviță | București | București | 44.440458, 26.09791 | building | VERIFIED | published |
| `biserica-varteju` | Biserica „Sfinții Ioachim și Ana” din Vârteju | Vârteju (Măgurele) | Ilfov | 44.355804, 25.989648 | building | VERIFIED | published |
| `conacul-bolomey` | Conacul Bolomey | Cosâmbești | Ialomița | 44.55585, 27.419551 | building | VERIFIED | published |
| `biserica-sf-gheorghe-mangalia` | Biserica „Sfântul Mare Mucenic Gheorghe” din Mangalia | Mangalia | Constanța | 43.812174, 28.582189 | building | VERIFIED | published |
| `catedrala-turnu-magurele` | Catedrala „Sfântul Haralambie” din Turnu Măgurele | Turnu Măgurele | Teleorman | 43.747073, 24.870202 | building | VERIFIED | published |
| `biblioteca-carianopol-caracal` | Biblioteca Municipală „Virgil Carianopol” Caracal | Caracal | Olt | 44.10925, 24.34835 | locality | PROBABLE | published |
| `teatrul-maria-filotti-braila` | Teatrul „Maria Filotti” Brăila | Brăila | Brăila | 45.271956, 27.973228 | building | VERIFIED | published |
| `manastirea-nucet` | Mănăstirea Nucet — biserica mănăstirii | Nucet | Dâmbovița | 44.782858, 25.541198 | building | VERIFIED | published |
| `biserica-sfanta-vineri-pitesti` | Biserica „Sfânta Vineri” din Pitești | Pitești | Argeș | 44.858425, 24.880441 | building | VERIFIED | published |
| `muzeul-judetean-arges` | Muzeul Județean Argeș (fostul Palat Administrativ / Prefectura Argeș) | Pitești | Argeș | 44.855392, 24.870834 | building | VERIFIED | published |
| `biserica-madona-dudu-craiova` | Biserica „Adormirea Maicii Domnului” – Maica Precista de la Dud (Madona Dudu) | Craiova | Dolj | 44.316723, 23.790082 | building | VERIFIED | published |
| `hotel-palace-craiova` | Fostul Hotel Palace (Pallace) din Craiova – azi pavilionul administrativ al Primăriei Craiova | Craiova | Dolj | 44.318501, 23.79493 | building | VERIFIED | published |
| `primaria-craiova` | Palatul Băncii Comerțului – Primăria Municipiului Craiova (sediul central) | Craiova | Dolj | 44.318753, 23.796584 | building | VERIFIED | published |
| `biblioteca-franceza-omnia-craiova` | Casa Ionel Pleșia – Biblioteca Franceză „Omnia” (filiala Bibliotecii Naționale a României) | Craiova | Dolj | 44.316054, 23.798662 | building | VERIFIED | published |
| `biserica-sf-gheorghe-vechi-craiova` | Biserica „Sf. Gheorghe-Vechi” („Cuvioasa Paraschiva”), Craiova | Craiova | Dolj | 44.316248, 23.801883 | building | VERIFIED | published |
| `manastirea-hurezi` | Mănăstirea Hurezi – Biserica mare „Sf. Împărați Constantin și Elena” (catholicon) | Horezu (Romanii de Jos) | Vâlcea | 45.169861, 24.007308 | building | VERIFIED | published |
| `primaria-oradea` | Palatul Primăriei Oradea | Oradea | Bihor | 47.055897, 21.927606 | building | VERIFIED | published |
| `spitalul-municipal-oradea` | Spitalul Clinic Municipal „Dr. Gavril Curteanu” Oradea – corpurile C1 (P+10E) și C2 (P+4E) | Oradea | Bihor | 47.074949, 21.917024 | building | PROBABLE | published |
| `fosta-biserica-unitariana-abrud` | Clădirea fostei Biserici Unitariene din Abrud – Centru recreativ și cultural | Abrud | Alba | 46.273842, 23.064171 | building | VERIFIED | published |
| `biserica-piarista-timisoara` | Biserica Piariștilor „Înălțarea Sfintei Cruci” din Timișoara | Timișoara | Timiș | 45.752298, 21.222915 | building | VERIFIED | published |
| `cazarma-piata-libertatii-timisoara` | Comenduirea Garnizoanei Timișoara (Generalatul Nou) – Muzeul Militar, Piața Libertății 5 | Timișoara | Timiș | 45.755036, 21.227299 | building | PROBABLE | published |
| `auto-schunn-arad` | Auto Schunn Arad – reprezentanță și service Mercedes-Benz | Arad | Arad | 46.175079, 21.370087 | site | PROBABLE | published |
| `manastirea-lainici` | Mănăstirea Lainici – Biserica nouă (cu trei turle) | Bumbești-Jiu | Gorj | 45.264178, 23.393188 | site | PROBABLE | published |
| `manastirea-hodos-bodrog` | Mănăstirea Hodoș-Bodrog („Adormirea Maicii Domnului”) | Bodrogu Nou (Zădăreni) | Arad | 46.133632, 21.183834 | site | VERIFIED | published |
| `manastirea-gai-arad` | Mănăstirea „Sfântul Simeon Stâlpnicul” Arad-Gai – biserica nouă („Acoperământul Maicii Domnului”) | Arad | Arad | 46.218399, 21.274636 | site | PROBABLE | published |
| `manastirea-sfanta-cruce-studina` | Mănăstirea Studina (register: Mănăstirea „Sfânta Cruce”, Studina) | Studinița (Studina) | Olt | 43.974336, 24.418086 | site | PROBABLE | published |
| `biserica-calvaria-cluj` | Biserica Calvaria de la Cluj-Mănăștur | Cluj-Napoca | Cluj | 46.761261, 23.557926 | building | VERIFIED | published |
| `muzeul-de-arta-cluj` | Palatul Bánffy din Cluj-Napoca (Muzeul de Artă Cluj-Napoca) | Cluj-Napoca | Cluj | 46.770617, 23.590664 | building | VERIFIED | published |
| `liceul-bolyai-farkas-targu-mures` | Liceul Teoretic „Bolyai Farkas” Târgu Mureș | Târgu Mureș | Mureș | 46.543597, 24.563754 | building | VERIFIED | published |
| `pensiunea-aster-campu-cetatii` | Pensiunea Aster | Câmpu Cetății | Mureș | 46.6704272, 25.0139733 | locality | PROBABLE | published |
| `catedrala-evanghelica-sibiu` | Catedrala Evanghelică „Sfânta Maria” din Sibiu | Sibiu | Sibiu | 45.797769, 24.150065 | building | VERIFIED | published |
| `sediu-sts-sibiu` | Sediul STS Sibiu - Centrul de servicii esențiale de comunicații și tehnologia informației (Direcția Județeană de Telecomunicații Speciale Sibiu) | Sibiu | Sibiu | 45.7836, 24.1494 | site | PROBABLE | published |
| `biserica-evanghelica-codlea` | Biserica evanghelică fortificată din Codlea | Codlea | Brașov | 45.699877, 25.446148 | building | VERIFIED | published |
| `biserica-evanghelica-maghiara-brasov` | Biserica Evanghelică Maghiară din Brașov - ansamblul clădirilor | Brașov | Brașov | 45.646019, 25.596592 | site | VERIFIED | published |
| `prefectura-maramures` | Palatul Administrativ Baia Mare (Instituția Prefectului – Județul Maramureș și Consiliul Județean Maramureș) | Baia Mare | Maramureș | 47.658257, 23.574669 | building | PROBABLE | published |
| `biserica-sf-treime-baia-mare` | Biserica romano-catolică „Sfânta Treime” din Baia Mare (fosta biserică iezuită) | Baia Mare | Maramureș | 47.658442, 23.583184 | building | PROBABLE | published |
| `manastirea-rohia` | Mănăstirea „Sfânta Ana” Rohia | Rohia | Maramureș | 47.41003, 23.881699 | site | PROBABLE | published |
| `manastirea-borsa-pietroasa` | Mănăstirea Borșa – Pietroasa | Borșa | Maramureș | 47.629598, 24.653215 | site | PROBABLE | published |
| `hotel-victoria-satu-mare` | Fostul Hotel Victoria, Satu Mare | Satu Mare | Satu Mare | 47.794099, 22.876768 | building | VERIFIED | published |
| `biserica-catolica-ciumani` | Biserica romano-catolică „Sfinții Apostoli Petru și Pavel” din Ciumani | Ciumani | Harghita | 46.679548, 25.516368 | building | VERIFIED | published |
| `pavilion-parc-central-miercurea-ciuc` | Pavilion în Parcul Central, Miercurea Ciuc (pavilion de apă potabilă / forrásház) | Miercurea Ciuc | Harghita | 46.358854, 25.802378 | building | VERIFIED | published |
| `hotel-tusnad` | Hotel Tușnad | Băile Tușnad | Harghita | 46.144252, 25.859442 | building | VERIFIED | published |
| `hotel-castel-daniel-varghis` | Castelul Daniel din Tălișoara – Castle Hotel Daniel | Tălișoara | Covasna | 46.10385, 25.586485 | site | PROBABLE | published |
| `biserica-catolica-tarnovita` | Biserica romano-catolică „Sfântul Ladislau” din Târnovița | Târnovița | Harghita | 46.371565, 25.359664 | building | VERIFIED | published |
| `biserica-reformata-taureni` | Biserica reformată din Tăureni | Tăureni | Harghita | 46.2672823, 25.259063 | locality | PROBABLE | published |
| `catedrala-nasterea-domnului-suceava` | Catedrala „Nașterea Domnului” din Suceava | Suceava | Suceava | 47.646997, 26.249277 | building | VERIFIED | published |
| `manastirea-sucevita` | Mănăstirea Sucevița – Biserica „Învierea Domnului” | Sucevița | Suceava | 47.778174, 25.711131 | site | PROBABLE | published |
| `manastirea-secu` | Mănăstirea Secu – Biserica „Tăierea Capului Sf. Ioan Botezătorul” | Vânători-Neamț | Neamț | 47.200338, 26.184792 | site | PROBABLE | published |
| `manastirea-varatec` | Mănăstirea Văratec – Biserica „Adormirea Maicii Domnului” | Văratec | Neamț | 47.139756, 26.268342 | site | PROBABLE | published |
| `manastirea-almas` | Mănăstirea Almaș | Almaș (Gârcina) | Neamț | 47.013016, 26.33047 | site | PROBABLE | published |
| `biserica-sf-teodori-iasi` | Biserica „Sfinții Teodori” din Iași | Iași | Iași | 47.167147, 27.587627 | building | VERIFIED | published |
| `turnul-barboi-iasi` | Turnul-clopotniță al Bisericii Bărboi, Iași | Iași | Iași | 47.162588, 27.593036 | building | VERIFIED | published |
| `biserica-abagerilor-barlad` | Biserica „Sf. Gheorghe” a breslei abagerilor din Bârlad | Bârlad | Vaslui | 46.22269, 27.670751 | building | VERIFIED | published |
| `catedrala-inaltarea-domnului-bacau` | Biserica (Catedrala) „Înălțarea Domnului” din Bacău | Bacău | Bacău | 46.570115, 26.91073 | building | VERIFIED | published |
| `catedrala-focsani` | Catedrala Ortodoxă „Sfânta Cuvioasa Parascheva” din Focșani | Focșani | Vrancea | 45.699812, 27.183065 | building | PROBABLE | published |
| `manastirea-ciolanu` | Mănăstirea Ciolanu | Tisău (Haleș) | Buzău | 45.2355227, 26.5472297 | site | PROBABLE | published |
| `manastirea-negru-voda-campulung` | Mănăstirea Negru Vodă – Biserica domnească „Adormirea Maicii Domnului”, Câmpulung | Câmpulung | Argeș | 45.263822, 25.040306 | site | PROBABLE | published |
| `parohia-nasterii-maicii-domnului-campulung-moldovenesc` | Biserica de lemn „Nașterea Maicii Domnului” din Câmpulung Moldovenesc (Capu Satului) | Câmpulung Moldovenesc | Suceava | 47.525125, 25.5751955 | building | PROBABLE | published |
| `biserica-sfantul-stefan-iasi` | Biserica „Sfântul Ștefan” (Str. Albineț), Iași | Iași | Iași | 47.1720079, 27.5893697 | building | PROBABLE | published |
| `schit-berca-berca` | Schitul Berca – Biserica «Sfinții Arhangheli Mihail și Gavriil» (fosta mănăstire Berca) | Berca | Buzău | 45.2895001, 26.6800617 | building | PROBABLE | published |
| `hotel-indigo-bucuresti-bucuresti` | One Plaza Athénée – clădirea nefinalizată din Str. Georges Clemenceau 8-10 (proiectul Hotel Indigo București, 2018-2019) | București | București | 44.44252, 26.0965657 | building | PROBABLE | published |
| `biserica-aparatorii-patriei-bucuresti` | Biserica Parohiei Apărătorii Patriei I | București | București | 44.3841464, 26.1364168 | building | PROBABLE | published |
| `manastirea-sitaru-sitaru` | Mănăstirea Sitaru (Balamuci) – Biserica «Sfântul Nicolae» | Sitaru | Ilfov | 44.6799078, 26.3176884 | building | VERIFIED | published |
| `biserica-incinta-centrul-de-odihna-si-meditatie-pantelimon-l-pantelimon` | Biserica Centrului Cultural-Misionar «Familia» (Complexul Lebăda, Pantelimon) | Pantelimon | Ilfov | 44.4453953, 26.2059455 | building | PROBABLE | published |
| `casa-dianu-craiova` | Casa Dianu (Muzeul Cărții și Exilului Românesc) | Craiova | Dolj | 44.314195, 23.7984318 | building | VERIFIED | published |
| `biserica-sf-gheorghe-manastirea-viforata-viforata` | Biserica „Nașterea Maicii Domnului” și „Sf. Mare Mucenic Gheorghe” a Mănăstirii Viforâta | Viforâta | Dâmbovița | 44.9736773, 25.4656819 | building | VERIFIED | published |
| `biserica-manastirea-manastirea` | Biserica „Sf. Dumitru și Sf. Nestor” din Mânăstirea | Mânăstirea | Călărași | 44.2113806, 26.9035065 | building | PROBABLE | published |
| `biserica-neptun-neptun` | Biserica „Adormirea Maicii Domnului” din Neptun | Neptun | Constanța | 43.8631855, 28.5983065 | building | PROBABLE | published |
| `biserica-vartop-vartop` | Biserica „Nașterea Maicii Domnului” din Vârtop | Vârtop | Constanța | 43.8176001, 28.3857169 | building | PROBABLE | published |
| `manastirea-tariceni-calarasi` | Schitul (Mănăstirea) Tăriceni – Biserica „Sf. Ierarh Nicolae” | Tăriceni | Călărași | 44.2999975, 26.8271399 | building | PROBABLE | published |
| `casa-armatei-constanta` | Cercul Militar Constanța (fosta Prefectură a județului Constanța) | Constanța | Constanța | 44.1752078, 28.6542861 | building | PROBABLE | published |
| `biserica-balint-balint` | Biserica Ortodoxă «Învierea Domnului» din Balinț | Balinț | Timiș | 45.8147077, 21.8566798 | building | PROBABLE | published |
| `biserica-jdioara-jdioara` | Biserica Ortodoxă «Sfinții Apostoli Petru și Pavel» din Jdioara | Jdioara | Timiș | 45.6210711, 22.1069194 | building | PROBABLE | published |
| `biserica-mosnita-veche-mosnita-veche` | Biserica Ortodoxă «Înălțarea Domnului» din Moșnița Veche | Moșnița Veche | Timiș | 45.7336519, 21.3341354 | building | PROBABLE | published |
| `parohia-ortodoxa-romana-sag-sag` | Biserica Ortodoxă «Adormirea Maicii Domnului» din Șag | Șag | Timiș | 45.6511095, 21.1627782 | building | PROBABLE | published |
| `parohia-ortodoxa-romana-timisoara-plopi-timisoara` | Biserica Ortodoxă «Sfinții Apostoli Petru și Pavel» – Plopi, Timișoara | Timișoara | Timiș | 45.7501036, 21.2818946 | building | PROBABLE | published |
| `biserica-tormac-tormac` | Biserica Reformată din Tormac | Tormac | Timiș | 45.5219438, 21.4928936 | building | PROBABLE | published |
| `biserica-iecea-mare-iecea-mare` | Biserica Ortodoxă «Sfinții Arhangheli Mihail și Gavriil» din Iecea Mare | Iecea Mare | Timiș | 45.850742, 20.893096 | locality | PROBABLE | published |
| `biserica-obirsia-closani-obirsia-closani` | Biserica „Sfântul Mare Mucenic Teodor Tiron” din Obârșia-Cloșani | Obârșia-Cloșani | Mehedinți | 45.023417, 22.683438 | locality | PROBABLE | published |
| `manastirea-sf-ioan-iacob-hozevitul-piatra-craiului` | Mănăstirea Piatra Craiului «Sfântul Ioan Iacob Hozevitul» | Bucea (comuna Negreni) | Cluj | 46.97948, 22.6943 | site | PROBABLE | published |
| `manastirea-sfanta-treime-farau` | Mănăstirea «Sfânta Treime» Fărău | Fărău | Alba | 46.340501, 24.04337 | building | PROBABLE | published |
| `parohia-buna-vestire-bistrita` | Biserica Greco-Catolică «Buna Vestire» Bistrița | Bistrița | Bistrița-Năsăud | 47.131998, 24.487518 | building | PROBABLE | published |
| `corp-manastirea-ponor-ponor` | Mănăstirea Ponor «Înălțarea Domnului» (building/wing not identified) | Ponor | Alba | 46.346892, 23.342837 | site | PROBABLE | published |
| `manastirea-buna-vestire-zlatna` | Mănăstirea «Buna Vestire» Pătrângeni (Negraia), Zlatna | Zlatna | Alba | 46.083629, 23.275766 | site | PROBABLE | published |
| `biserica-romano-catolica-foieni` | Biserica Romano-Catolică «Sfântul Arhanghel Mihail» din Foieni | Foieni | Satu Mare | 47.697069, 22.384796 | building | VERIFIED | published |
| `manastirea-oasa-sugag` | Mănăstirea Oașa – biserica nouă „Sfântul Mare Mucenic Pantelimon” | Șugag | Alba | 45.573067, 23.610447 | building | PROBABLE | published |
| `parohia-ortodoxa-romana-sadu-i-sadu` | Biserica Ortodoxă „Adormirea Maicii Domnului” din Sadu (biserica veche, Parohia Sadu I) | Sadu | Sibiu | 45.669429, 24.1798 | building | PROBABLE | published |
| `biserica-ortodoxa-stramtura-stramtura` | Biserica Ortodoxă din Strâmtura (biserica parohială de zid, Parohia Ortodoxă Strâmtura) | Strâmtura | Maramureș | 47.77323, 24.134768 | building | PROBABLE | published |
| `biserica-reformata-din-apahida-apahida` | Biserica Reformată din Apahida (biserică nouă în construcție, Parohia Reformată de Misiune Apahida) | Apahida | Cluj | 46.802172, 23.754639 | locality | VERIFIED | published |
| `biserica-bodogaia` | Biserica din Bodogaia | Bodogaia | Harghita | 46.27444, 24.996565 | locality | UNRESOLVED | held: status pending |
| `tiny-house-zenius` | Tiny house Zenius |  |  | — | locality | UNRESOLVED | held: status pending |
| `primaria-sector-5-bucuresti` | Primăria Sectorului 5 (building that received the roof not identified) | București | București | 44.415101, 26.09 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `spitalul-militar-bucuresti` | Spitalul Universitar de Urgență Militar Central „Dr. Carol Davila” (specific building not identified) | București | București | 44.442804, 26.074905 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `primaria-alexandria` | Primăria Municipiului Alexandria | Alexandria | Teleorman | 43.970665, 25.327702 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `muzeul-civilizatiei-dacice-orastie` | Muzeul Civilizației Dacice Orăștie (fostul spital orășenesc), str. Nicolae Bălcescu 16 | Orăștie | Hunedoara | 45.837674, 23.19612 | building | VERIFIED | held: no photograph (client decision: not shown without any photo) |
| `catedrala-deva` | catedrala-deva | Deva | Hunedoara | 45.88174, 22.900861 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `uad-cluj` | Universitatea de Artă și Design din Cluj-Napoca | Cluj-Napoca | Cluj | 46.7697101, 23.5908842 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `clinica-croitorilor-cluj` | Clinica Croitorilor (unidentified building on/near Strada Croitorilor) | Cluj-Napoca | Cluj | 46.7758467, 23.5930667 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-beica` | Biserica din Beica (unidentified; Beica de Jos commune, Mureș) | Beica de Jos | Mureș | 46.7337, 24.7968 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `consiliul-judetean-bistrita` | Palatul Administrativ Bistrița (Consiliul Județean Bistrița-Năsăud și Instituția Prefectului) | Bistrița | Bistrița-Năsăud | 47.1366, 24.5002 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `liceul-tamasi-aron-odorhei` | Liceul Teoretic „Tamási Áron” (campus) | Odorheiu Secuiesc | Harghita | 46.30158, 25.295638 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sf-ilie-suceava` | biserica-sf-ilie-suceava | Suceava | Suceava | 47.647001, 26.25226 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `umf-iasi` | Universitatea de Medicină și Farmacie „Grigore T. Popa” Iași – building not identified | Iași | Iași | 47.168363, 27.584467 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-bicaz` | Biserică din Bicaz (clădire neidentificată) | Bicaz | Neamț | 46.911228, 26.090348 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-grumazesti` | Biserică din comuna Grumăzești (clădire neidentificată) | Grumăzești | Neamț | 47.133606, 26.377268 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-probota` | Biserica Parohiei „Sf. Nicolae” – Ciulinești, sat Probota (clădire nelocalizată) | Probota | Iași | 47.3782519, 27.5064395 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-dobreni` | Biserica „Adormirea Maicii Domnului”, sat Dobreni (clădire nelocalizată) | Dobreni | Neamț | 47.0023767, 26.417557 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `episcopia-romanului-roman` | Arhiepiscopia Romanului și Bacăului – centrul eparhial din Roman (clădirea acoperită neidentificată) | Roman | Neamț | 46.9175579, 26.9300069 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-horodnic-de-jos` | Biserică din Horodnic de Jos (clădire neidentificată) | Horodnic de Jos | Suceava | 47.860868, 25.832513 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-deleni-vaslui` | Biserica nouă „Adormirea Maicii Domnului” a Parohiei Deleni II, sat Deleni (clădire nelocalizată) | Deleni | Vaslui | 46.5431357, 27.7439287 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-ortodoxa-balteni` | Biserica Ortodoxă „Adormirea Maicii Domnului” din Bălteni | Bălteni | Iași | 47.40036, 27.5004616 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-ortodoxa-andrieseni` | Biserica Parohiei „Sf. Nicolae” Andrieșeni (biserica nouă, în construcție; nelocalizată) | Andrieșeni | Iași | 47.529151, 27.2902192 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-comuna-vinderei` | Biserica „Sf. Prooroc Ilie Tesviteanul” din Vinderei (biserică nouă, în construcție 2019-2024) | Vinderei | Vaslui | 46.1544012, 27.8087166 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sat-scheia` | Biserică din satul Șcheia, jud. Suceava (clădire neidentificată) | Șcheia | Suceava | 47.6561, 26.226358 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `manastirea-sfantul-sava-berzunti` | Mănăstirea „Sfântul Sava” – Berzunți (sat Buda, fost Schitu Savu) | Buda (Berzunți) | Bacău | 46.4171, 26.5775 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `gradinita-cu-program-prelungit-nr-8-iasi` | Grădinița cu Program Prelungit nr. 8 Iași | Iași | Iași | 47.1738704, 27.5781292 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sf-ioan-suceava` | Biserica „Sf. Ioan”, Suceava (clădire neidentificată) | Suceava | Suceava | 47.647001, 26.25226 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sibiciu-sibiciu` | Biserica din Sibiciu (building not identified) | Sibiciu de Jos | Buzău | 45.318179, 26.377212 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `cladire-administrativa-a-bisericii-ramnicu-sarat-ramnicu-sarat` | Clădire administrativă a unei biserici din Râmnicu Sărat (building not identified) | Râmnicu Sărat | Buzău | 45.385446, 27.041701 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-urziceni-urziceni` | Biserica din Urziceni (building not identified) | Urziceni | Ialomița | 44.717002, 26.632407 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-snagov-snagov` | Biserica din comuna Snagov (building not identified) | Snagov | Ilfov | 44.707498, 26.172866 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-in-incinta-spitalului-colentina-bucuresti` | Biserica «Izvorul Tămăduirii» din incinta Spitalului Clinic Colentina | București | București | 44.4530512, 26.1147349 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `cladirea-administrativa-arhiepiscopia-buzaului-buzau` | Clădirea administrativă a Arhiepiscopiei Buzăului și Vrancei (building within the compound not identified) | Buzău | Buzău | 45.1574091, 26.8195518 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `clopotnita-urziceni-urziceni` | Clopotnița unei biserici din Urziceni (building not identified) | Urziceni | Ialomița | 44.717002, 26.632407 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-barbatesu-vechi-bucuresti` | Parohia «Bărbătescu Vechi» – Biserica «Sfântul Ierarh Nicolae» (old church or new parish church, not determined) | București | București | 44.41605, 26.08028 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-brebu-brebu` | Biserica din comuna Brebu, Prahova (building not identified) | Brebu | Prahova | 45.18252, 25.769463 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-rusetu-rusetu` | Biserica «Sfântul Ierarh Nicolae» din Rușețu | Rușețu | Buzău | 44.9650561, 27.2242237 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `imobil-in-incinta-arhiepiscopiei-buzaului-si-vrancei-buzau` | Imobil în incinta Arhiepiscopiei Buzăului și Vrancei (building within the compound not identified) | Buzău | Buzău | 45.1574091, 26.8195518 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-maracineni-maracineni` | Biserica din Mărăcineni, Buzău (building not identified) | Mărăcineni | Buzău | 45.176857, 26.824638 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-dragalina-dragalina` | Biserica „Sfinții Arhangheli Mihail și Gavriil” din Dragalina | Dragalina | Călărași | 44.4344918, 27.3332078 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-chilia-veche-chilia-veche` | Biserică (neidentificată) – Chilia Veche | Chilia Veche | Tulcea | 45.4141658, 29.2891938 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-parohia-sfantul-ioan-botezatorul-ramnicu-valcea` | Biserica Parohiei „Sfântul Ioan Botezătorul” din Râmnicu Vâlcea | Râmnicu Vâlcea | Vâlcea | 45.097887, 24.3634087 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `centrul-de-varstnici-turnu-magurele` | Centrul Recreativ pentru Persoane Vârstnice Turnu Măgurele (fostul imobil „Centru Administrativ”) | Turnu Măgurele | Teleorman | 43.74567, 24.86646 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `oficiul-de-cadastru-braila` | Oficiul de Cadastru și Publicitate Imobiliară Brăila (OCPI Brăila) | Brăila | Brăila | 45.2677335, 27.9732125 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `fostul-spital-orasenesc-muzeu-segarcea` | Fostul spital orășenesc transformat în muzeu (neidentificat) – Segarcea | Segarcea | Dolj | 44.093048, 23.746887 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-grumazesti-gurbanesti` | Biserica „Grumăzești” (neidentificată) – Gurbănești | Gurbănești | Călărași | 44.379553, 26.692303 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `episcopia-sloboziei-si-calarasilor-calarasi` | Episcopia Sloboziei și Călărașilor (clădire neidentificată) | Călărași | Călărași | 44.196165, 27.331323 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `foisor-in-parcul-tineretului-turnu-magurele` | Foișor în Parcul Tineretului (neidentificat) – Turnu Măgurele | Turnu Măgurele | Teleorman | 43.751831, 24.869172 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-lumina-lumina` | Biserică (neidentificată) – Lumina | Lumina | Constanța | 44.2939229, 28.5663032 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-costesti-costesti` | Biserică (neidentificată) – Costești | Costești | Argeș | 44.662023, 24.87701 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-draganesti-vlasca-draganesti-vlasca` | Biserică (neidentificată) – Drăgănești-Vlașca | Drăgănești-Vlașca | Teleorman | 44.102052, 25.599404 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sf-achim-si-ana-stefanesti` | Biserica „Sfinții Ioachim și Ana” (neidentificată) – Ștefănești, Ilfov | Ștefăneștii de Jos | Ilfov | 44.5331416, 26.2029838 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `ubc-timisoara-cladire-birouri-timisoara` | United Business Center (UBC) office buildings, Iulius Town Timișoara (specific building not identified) | Timișoara | Timiș | 45.765587, 21.228603 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-ortodoxa-romana-cebza-cebza` | Biserica Ortodoxă «Nașterea Sfântului Ioan Botezătorul» din Cebza | Cebza | Timiș | 45.552382, 21.066557 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-racovita-racovita` | biserica-racovita-racovita | Racovița | Timiș | 45.699739, 21.636334 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-honorici-honorici` | Biserica Ortodoxă «Nașterea Maicii Domnului» din Honorici | Honorici | Timiș | 45.6140613, 21.9115583 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-adormirea-maicii-domnului-ficatar` | Biserica Ortodoxă «Adormirea Maicii Domnului» din Ficătar | Ficătar | Timiș | 45.71526, 21.698049 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-bobda-bobda` | biserica-bobda-bobda | Bobda | Timiș | 45.734909, 20.94257 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-hitias-hitias` | biserica-hitias-hitias | Hitiaș | Timiș | 45.710629, 21.598631 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-hisias-hisias` | Biserica Ortodoxă «Sfântul Mare Mucenic Gheorghe» din Hisiaș | Hisiaș | Timiș | 45.8413432, 21.7268394 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `anexa-a-bisericii-caransebes` | Clădire anexă a unei biserici (neidentificată), lângă Caransebeș | Caransebeș (vicinity) | Caraș-Severin | 45.410611, 22.218223 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-sf-mucenic-sebastian-oradea` | Biserica Ortodoxă „Sfântul Mucenic Sebastian” (Parohia Sf. Mucenic Sebastian), Oradea | Oradea | Bihor | 47.054711, 21.91268 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-borosteni-borosteni` | Biserica Ortodoxă „Sfânta Cuvioasă Parascheva” din Boroșteni (Parohia Boroșteni) | Boroșteni (comuna Peștișani) | Gorj | 45.097106, 23.028056 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-arcani-arcani` | Biserică neidentificată, comuna Arcani | Arcani | Gorj | 45.073253, 23.13543 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-isvarna-pocruia` | Biserica „Sfântul Mare Mucenic Gheorghe” din Isvarna (filie a Parohiei Pocruia) | Isvarna (Tismana) | Gorj | 45.032724, 22.908334 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-hateg-hateg` | Biserică neidentificată, Hațeg | Hațeg | Hunedoara | 45.610447, 22.949396 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-ortodoxa-sohodol-sohodol` | Biserica ortodoxă din Sohodol (neidentificată cu certitudine; candidat: Biserica „Sfinții Voievozi”, Parohia Sohodol) | Sohodol (Tismana) | Gorj | 45.055313, 22.881939 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-glodeni-glodeni` | Biserică neidentificată, Glodeni (comuna Bălănești) | Glodeni (comuna Bălănești) | Gorj | 45.081678, 23.462682 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-nadlac-nadlac` | Biserică neidentificată, Nădlac | Nădlac | Arad | 46.166681, 20.749992 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-lunca-ilvei-lunca-ilvei` | Biserica Ortodoxă din Lunca Ilvei | Lunca Ilvei | Bistrița-Năsăud | 47.364071, 24.967003 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-dumbrava-dumbrava` | Biserica din Dumbrava, jud. Timiș (building not identified) | Dumbrava | Timiș | 45.8253697, 22.1168539 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-berchez-berchez` | Biserica din Berchez (building not identified) | Berchez | Maramureș | 47.5189241, 23.5056927 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-chechis-chechis` | Biserica Ortodoxă din Chechiș | Chechiș | Maramureș | 47.583022, 23.6019396 | site | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-ortodoxa-borcut-borcut` | Biserica Ortodoxă din Borcut | Borcut | Maramureș | 47.479616, 23.84288 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sat-cicarlau-cicarlau` | Biserica sat Cicârlău (clădire neidentificată) | Cicârlău | Maramureș | 47.691545, 23.403797 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-barsana-barsana` | Biserică, Bârsana (clădire neidentificată) | Bârsana | Maramureș | 47.816862, 24.057689 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-sasar-sasar` | Biserica Ortodoxă „Înălțarea Sfintei Cruci” din Săsar (Parohia Înălțarea Sfintei Cruci) | Săsar | Maramureș | 47.6458319, 23.4968753 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-ortodoxa-ungureni-ungureni` | Biserica Ortodoxă din Ungureni (biserica parohială de zid; Parohia Ortodoxă Ungureni) | Ungureni | Maramureș | 47.5489692, 23.9480454 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-sfintii-arhangheli-baia-mare` | Biserica Ortodoxă „Sfinții Arhangheli Mihail și Gavril” (Parohia Sfinții Arhangheli, cartier Vasile Alecsandri) | Baia Mare | Maramureș | 47.645155, 23.578664 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-ortodoxa-bozanta-mica-bozanta-mica` | Biserica Ortodoxă din Bozânta Mică (Parohia Ortodoxă Bozânta Mică) | Bozânta Mică | Maramureș | 47.6364268, 23.4205141 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `parohia-ortodoxa-romana-viseu-de-mijloc-viseu-de-mijloc` | Biserica Ortodoxă din Vișeu de Mijloc (Parohia Ortodoxă Română Vișeu de Mijloc) | Vișeu de Sus | Maramureș | 47.7161846, 24.4039556 | building | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `biserica-tulghes-tulghes` | Biserică, Tulgheș (clădire neidentificată) | Tulgheș | Harghita | 46.965407, 25.762642 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladiri-vechi-cluj-napoca-cluj-napoca` | Clădiri vechi, Cluj-Napoca | Cluj-Napoca | Cluj | 46.769379, 23.589954 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-monument-istoric-timisoara` | Monument istoric | Timișoara | Timiș | 45.753836, 21.225747 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladire-veche-cluj-napoca-cluj-napoca` | Clădire veche, Cluj-Napoca | Cluj-Napoca | Cluj | 46.769379, 23.589954 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-restaurant-bran-bran` | Restaurant, Bran | Bran | Brașov | 45.516329, 25.371567 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-manastirea-sfintii-martiri-brancoveni-crucea-iancului-marisel` | Mănăstirea Sfinții Martiri Brancoveni-crucea Iancului | Mărișel | Cluj | 46.683115, 23.115498 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladire-istorica-timisoara` | Clădire istorică | Timișoara | Timiș | 45.753836, 21.225747 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-restaurant-timisoara-timisoara` | Restaurant, Timișoara | Timișoara | Timiș | 45.753836, 21.225747 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-vila-istorica-bucuresti` | Vilă istorică | București | București | 44.436141, 26.10272 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-casa-armatei-um-02033-iasi` | Casa Armatei, UM 02033 | Iași | Iași | 47.16156, 27.583781 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladire-monument-istoric-timisoara-timisoara` | Clădire monument istoric, Timișoara | Timișoara | Timiș | 45.753836, 21.225747 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-turla-bisericii-arad-arad` | Turla bisericii, Arad | Arad | Arad | 46.175379, 21.319634 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-supermarket-blejoi-blejoi` | Supermarket, Blejoi | Blejoi | Prahova | 44.991851, 26.011628 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladire-timisoara-timisoara` | Clădire, Timișoara | Timișoara | Timiș | 45.753836, 21.225747 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-gradinita-iasi-iasi` | Grădinița, Iași | Iași | Iași | 47.16156, 27.583781 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-baza-de-agrement-go-kart-desag` | Baza de agrement Go Kart | Desag | Harghita | 46.444398, 25.46565 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-biserica-calarasi-calarasi` | Biserica Călărași | Călărași | Călărași | 44.196165, 27.331323 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-imobil-cluj-napoca-cluj-napoca` | Imobil, Cluj-Napoca | Cluj-Napoca | Cluj | 46.769379, 23.589954 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-hotel-poiana-brasov-poiana-brasov` | Hotel, Poiana Brașov | Poiana Brașov | Brașov | 45.59671, 25.556189 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-pavilion-nou-in-cazarma-398-parchet-militar-iasi` | Pavilion nou în cazarma 398 - Parchet Militar | Iași | Iași | 47.16156, 27.583781 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-unitate-militara-husi` | Unitate militară | Huși | Vaslui | 46.672003, 28.062091 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-showroom-targu-mures-targu-mures` | Showroom, Târgu Mureș | Târgu Mureș | Mureș | 46.544625, 24.561196 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-corp-nou-incinta-cazarma-398-iasi` | Corp nou incinta Cazarma 398 | Iași | Iași | 47.16156, 27.583781 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-manastire-arad-arad` | Mănăstire, Arad | Arad | Arad | 46.175379, 21.319634 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-parohia-ortodoxa-romana-sindresti-sindresti` | Parohia Ortodoxă Română Sindresti | Șindrești | Maramureș | 47.606595, 23.695133 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
| `reg-cladire-odorheiu-secuiesc-odorheiu-secuiesc` | Clădire, Odorheiu Secuiesc | Odorheiu Secuiesc | Harghita | 46.304746, 25.295026 | locality | PROBABLE | held: no photograph (client decision: not shown without any photo) |
<!-- GENERATED-TABLE:END -->
