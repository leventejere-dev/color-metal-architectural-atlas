# Modelling progress

Production method and quality bar: `docs/MODELING_GUIDE.md`. Each model is a procedural
TypeScript module (`src/models/buildings/<id>.ts`, exhibition models in
`src/models/exhibition`) with a sidecar `data/models/<id>.json` (tier, status, bearing,
approximations, public note). QA renders: `npm run snap -- model <id>` (four views).

Tiers: **A** premium detailed · **B** recognisable · **C** preliminary (few photos) ·
**D** location & photos only. Statuses: *existing-verified* (exhibition table), *detailed*,
*preview*, *reference-limited*, *pending-photos*, *none*.

## Continuation plan

1. Models flagged *reference-limited* (tier C) improve as soon as better photographs exist —
   add the folder, re-run the inventory, refine the module.
2. Exhibition stadium: only the half-section of the exhibition table exists; a full-stadium
   model (all four stands) would be the next upgrade.
3. Projects held back (`biserica-bodogaia` — not finished; `tiny-house-zenius` — no fixed
   site) stay in the inventory until COLOR METAL confirms them.

## Generated table (from `npm run db`)

<!-- GENERATED-TABLE:START -->
| id | name | tier | status | module | public photos | photos analysed |
|---|---|---|---|---|---|---|
| `sepsi-osk-arena` | Stadionul Sepsi OSK (Sepsi Duna Aréna) | A | existing-verified | exhibition:stadium-full | 12 | exhibition-table reference set |
| `biserica-reformata-tasnad` | Biserica Reformată din Tășnad | A | existing-verified | exhibition:church | 0 | exhibition-table reference set |
| `castelul-banffy-rascruci` | Castelul Bánffy din Răscruci | A | existing-verified | exhibition:manor | 12 | exhibition-table reference set |
| `parcare-satu-mare` | Parcare supraetajată Satu Mare | A | existing-verified | exhibition:garage | 7 | 18 |
| `ansamblul-mitropolitan-iasi` | Catedrala Mitropolitană din Iași | A | detailed | ansamblul-mitropolitan-iasi | 12 | 12 |
| `ateneul-roman` | Ateneul Român | A | detailed | ateneul-roman | 12 | 12 |
| `biblioteca-academiei-romane` | Biblioteca Academiei Române | C | reference-limited | biblioteca-academiei-romane | 12 | 12 |
| `biblioteca-centrala-universitara-iasi` | Biblioteca Centrală Universitară „Mihai Eminescu” | B | preview | biblioteca-centrala-universitara-iasi | 12 | 12 |
| `biserica-pogorarea-duhului-sfant-giroc` | Biserica „Pogorârea Duhului Sfânt”, Giroc | A | detailed | biserica-pogorarea-duhului-sfant-giroc | 10 | 10 |
| `parohia-ortodoxa-giroc` | Biserica Parohiei Ortodoxe Române Giroc | B | preview | parohia-ortodoxa-giroc | 8 | 8 |
| `biserica-amzei` | Biserica Amzei | B | preview | biserica-amzei | 7 | 7 |
| `biserica-casin` | Biserica Cașin | A | detailed | biserica-casin | 12 | 12 |
| `biserica-romano-catolica-tamasu` | Biserica Romano-Catolică din Tămașu | A | detailed | biserica-romano-catolica-tamasu | 9 | 9 |
| `biserica-romano-catolica-zetea` | Biserica Romano-Catolică din Zetea | A | detailed | biserica-romano-catolica-zetea | 12 | 12 |
| `biserica-domnita-balasa` | Biserica Domnița Bălașa | A | detailed | biserica-domnita-balasa | 12 | 12 |
| `biserica-reformata-feliceni` | Biserica Reformată din Feliceni | B | preview | biserica-reformata-feliceni | 12 | 12 |
| `bojdeuca-ion-creanga` | Bojdeuca Ion Creangă | B | preview | bojdeuca-ion-creanga | 11 | 11 |
| `casa-berthelot-iasi` | Casa General Henri Mathias Berthelot | A | detailed | casa-berthelot-iasi | 12 | 12 |
| `casa-macca` | Casa Macca | C | reference-limited | casa-macca | 12 | 12 |
| `casa-pogor` | Casa Pogor | A | detailed | casa-pogor | 12 | 12 |
| `catedrala-ortodoxa-satu-mare` | Catedrala Ortodoxă „Adormirea Maicii Domnului” Satu Mare | B | preview | catedrala-ortodoxa-satu-mare | 3 | 3 |
| `biserica-sf-mihail-cluj` | Biserica Romano-Catolică „Sfântul Mihail” | A | detailed | biserica-sf-mihail-cluj | 9 | 9 |
| `centrul-reformat-noul-mileniu` | Centrul Reformat „Noul Mileniu” | A | detailed | centrul-reformat-noul-mileniu | 12 | 12 |
| `cladire-rezidentiala-odorheiu-secuiesc` | Clădire rezidențială, Odorheiu Secuiesc | B | preview | cladire-rezidentiala-odorheiu-secuiesc | 12 | 12 |
| `clinica-obstetrica-timisoara` | Clinicile de Obstetrică-Ginecologie și Neonatologie Timișoara | B | preview | clinica-obstetrica-timisoara | 4 | 4 |
| `vila-constantin-geblescu` | Vila Constantin Geblescu | C | reference-limited | vila-constantin-geblescu | 12 | 12 |
| `intrare-iulius-town-timisoara` | Intrarea Iulius Town Timișoara | C | reference-limited | intrare-iulius-town-timisoara | 2 | 2 |
| `liceul-teoretic-ady-endre` | Liceul Teoretic „Ady Endre” | B | preview | liceul-teoretic-ady-endre | 12 | 12 |
| `manastirea-barnova` | Mănăstirea Bârnova | B | preview | manastirea-barnova | 12 | 12 |
| `manastirea-dragomirna` | Mănăstirea Dragomirna | B | preview | manastirea-dragomirna | 0 | 2 |
| `manastirea-frumoasa` | Mănăstirea Frumoasa | B | preview | manastirea-frumoasa | 12 | 10 |
| `manastirea-putna` | Mănăstirea Putna | C | reference-limited | manastirea-putna | 0 | 2 |
| `manastirea-tazlau` | Mănăstirea Tazlău | A | detailed | manastirea-tazlau | 12 | 12 |
| `manastirea-tismana` | Mănăstirea Tismana | C | reference-limited | manastirea-tismana | 0 | 3 |
| `muzeul-istorie-arheologie-piatra-neamt` | Muzeul de Istorie și Arheologie Piatra-Neamț | A | detailed | muzeul-istorie-arheologie-piatra-neamt | 8 | 8 |
| `muzeul-apei-timisoara` | Muzeul Apei Timișoara | B | preview | muzeul-apei-timisoara | 11 | 9 |
| `observatorul-astronomic-iasi` | Observatorul Astronomic Iași | B | preview | observatorul-astronomic-iasi | 8 | 8 |
| `palatul-cultural-blaj` | Palatul Cultural din Blaj | B | preview | palatul-cultural-blaj | 9 | 9 |
| `palatul-principilor-alba-iulia` | Palatul Principilor, Alba Iulia | C | reference-limited | palatul-principilor-alba-iulia | 3 | 3 |
| `scoala-95-bucuresti` | Școala Gimnazială nr. 95 | B | preview | scoala-95-bucuresti | 5 | 5 |
| `bt-arena-cluj` | Sala Polivalentă BT Arena | B | preview | bt-arena-cluj | 0 | 2 |
| `facultatea-stiinte-politice-bucuresti` | Facultatea de Științe Politice, Universitatea din București | B | preview | facultatea-stiinte-politice-bucuresti | 8 | 8 |
| `castelul-tisza-geszt` | Castelul Tisza, Geszt | C | reference-limited | castelul-tisza-geszt | 11 | 9 |
| `refugiu-piatra-talharului` | Refugiul montan Piatra Tâlharului | A | detailed | refugiu-piatra-talharului | 12 | 12 |
| `catedrala-voluntari` | Catedrala din Voluntari | B | preview | catedrala-voluntari | 6 | 6 |
| `conacul-berenczei-kovats-nisipeni` | Conacul Berenczei-Kováts, Nisipeni | B | preview | conacul-berenczei-kovats-nisipeni | 7 | 6 |
| `csiki-jatekszin` | Teatrul „Csíki Játékszín”, Miercurea Ciuc | C | reference-limited | csiki-jatekszin | 12 | 12 |
| `biserica-delnita` | Biserica Romano-Catolică „Sf. Ioan Botezătorul”, Delnița | B | preview | biserica-delnita | 10 | 10 |
| `castelul-bethlen-arcalia` | Castelul Bethlen din Arcalia | C | reference-limited | castelul-bethlen-arcalia | 0 | 1 |
| `casa-de-vacanta-varsag` | Casă de vacanță, Varșag | B | preview | casa-de-vacanta-varsag | 12 | 24 |
| `manejul-carei` | Manejul Castelului Károlyi, Carei | C | reference-limited | manejul-carei | 0 | 1 |
| `refugiu-cheile-bicazului` | Refugiu montan, Cheile Bicazului | C | reference-limited | refugiu-cheile-bicazului | 0 | 1 |
| `biserica-reformata-gherla` | Biserica Reformată din Gherla | C | reference-limited | biserica-reformata-gherla | 0 | 1 |
| `sediu-color-metal` | Sediul COLOR METAL | A | detailed | sediu-color-metal | 17 | 26 |
| `palatul-nifon-bucuresti` | Palatul Nifon Mitropolitul | B | preview | palatul-nifon-bucuresti | 0 | 3 |
| `biserica-luterana-bucuresti` | Biserica Evanghelică C.A. București (Biserica Luterană) | B | preview | biserica-luterana-bucuresti | 0 | 4 |
| `hotel-bulevard-bucuresti` | Grand Hôtel du Boulevard (Corinthia Grand Hotel du Boulevard Bucharest) | B | preview | hotel-bulevard-bucuresti | 0 | 4 |
| `biserica-schitul-magureanu` | Biserica Schitul Măgureanu | B | preview | biserica-schitul-magureanu | 0 | 3 |
| `universitatea-de-muzica-bucuresti` | Universitatea Națională de Muzică București — clădirea principală (Corp A), Str. Știrbei Vodă 33 | B | preview | universitatea-de-muzica-bucuresti | 0 | 3 |
| `muzeul-taranului-roman` | Muzeul Național al Țăranului Român | B | preview | muzeul-taranului-roman | 0 | 4 |
| `palatul-cesianu-racovita` | Palatul Cesianu-Racoviță | B | preview | palatul-cesianu-racovita | 0 | 3 |
| `biserica-varteju` | Biserica „Sfinții Ioachim și Ana” din Vârteju | C | preview | biserica-varteju | 0 | 2 |
| `conacul-bolomey` | Conacul Bolomey | B | preview | conacul-bolomey | 0 | 5 |
| `biserica-sf-gheorghe-mangalia` | Biserica „Sfântul Mare Mucenic Gheorghe” din Mangalia | B | preview | biserica-sf-gheorghe-mangalia | 0 | 4 |
| `catedrala-turnu-magurele` | Catedrala „Sfântul Haralambie” din Turnu Măgurele | B | preview | catedrala-turnu-magurele | 0 | 5 |
| `biblioteca-carianopol-caracal` | Biblioteca Municipală „Virgil Carianopol” Caracal | C | preview | biblioteca-carianopol-caracal | 0 | 1 |
| `teatrul-maria-filotti-braila` | Teatrul „Maria Filotti” Brăila | B | preview | teatrul-maria-filotti-braila | 0 | 3 |
| `manastirea-nucet` | Mănăstirea Nucet — biserica mănăstirii | B | preview | manastirea-nucet | 0 | 4 |
| `biserica-sfanta-vineri-pitesti` | Biserica „Sfânta Vineri” din Pitești | B | preview | biserica-sfanta-vineri-pitesti | 0 | 4 |
| `muzeul-judetean-arges` | Muzeul Județean Argeș (fostul Palat Administrativ / Prefectura Argeș) | B | preview | muzeul-judetean-arges | 0 | 4 |
| `biserica-madona-dudu-craiova` | Biserica „Adormirea Maicii Domnului” – Maica Precista de la Dud (Madona Dudu) | B | preview | biserica-madona-dudu-craiova | 0 | 3 |
| `hotel-palace-craiova` | Fostul Hotel Palace (Pallace) din Craiova – azi pavilionul administrativ al Primăriei Craiova | B | preview | hotel-palace-craiova | 0 | 3 |
| `primaria-craiova` | Palatul Băncii Comerțului – Primăria Municipiului Craiova (sediul central) | B | preview | primaria-craiova | 0 | 3 |
| `biblioteca-franceza-omnia-craiova` | Casa Ionel Pleșia – Biblioteca Franceză „Omnia” (filiala Bibliotecii Naționale a României) | B | preview | biblioteca-franceza-omnia-craiova | 0 | 3 |
| `biserica-sf-gheorghe-vechi-craiova` | Biserica „Sf. Gheorghe-Vechi” („Cuvioasa Paraschiva”), Craiova | B | preview | biserica-sf-gheorghe-vechi-craiova | 0 | 4 |
| `manastirea-hurezi` | Mănăstirea Hurezi – Biserica mare „Sf. Împărați Constantin și Elena” (catholicon) | B | preview | manastirea-hurezi | 0 | 3 |
| `primaria-oradea` | Palatul Primăriei Oradea | B | preview | primaria-oradea | 0 | 4 |
| `spitalul-municipal-oradea` | Spitalul Clinic Municipal „Dr. Gavril Curteanu” Oradea – corpurile C1 (P+10E) și C2 (P+4E) | C | reference-limited | spitalul-municipal-oradea | 0 | 1 |
| `fosta-biserica-unitariana-abrud` | Clădirea fostei Biserici Unitariene din Abrud – Centru recreativ și cultural | B | preview | fosta-biserica-unitariana-abrud | 0 | 5 |
| `biserica-piarista-timisoara` | Biserica Piariștilor „Înălțarea Sfintei Cruci” din Timișoara | B | preview | biserica-piarista-timisoara | 0 | 6 |
| `cazarma-piata-libertatii-timisoara` | Comenduirea Garnizoanei Timișoara (Generalatul Nou) – Muzeul Militar, Piața Libertății 5 | B | preview | cazarma-piata-libertatii-timisoara | 0 | 3 |
| `auto-schunn-arad` | Auto Schunn Arad – reprezentanță și service Mercedes-Benz | C | reference-limited | auto-schunn-arad | 0 | 2 |
| `manastirea-lainici` | Mănăstirea Lainici – Biserica nouă (cu trei turle) | B | preview | manastirea-lainici | 0 | 4 |
| `manastirea-hodos-bodrog` | Mănăstirea Hodoș-Bodrog („Adormirea Maicii Domnului”) | C | reference-limited | manastirea-hodos-bodrog | 0 | 2 |
| `manastirea-gai-arad` | Mănăstirea „Sfântul Simeon Stâlpnicul” Arad-Gai – biserica nouă („Acoperământul Maicii Domnului”) | B | preview | manastirea-gai-arad | 0 | 2 |
| `manastirea-sfanta-cruce-studina` | Mănăstirea Studina (register: Mănăstirea „Sfânta Cruce”, Studina) | C | reference-limited | manastirea-sfanta-cruce-studina | 0 | 2 |
| `biserica-calvaria-cluj` | Biserica Calvaria de la Cluj-Mănăștur | B | preview | biserica-calvaria-cluj | 0 | 4 |
| `muzeul-de-arta-cluj` | Palatul Bánffy din Cluj-Napoca (Muzeul de Artă Cluj-Napoca) | B | preview | muzeul-de-arta-cluj | 0 | 5 |
| `liceul-bolyai-farkas-targu-mures` | Liceul Teoretic „Bolyai Farkas” Târgu Mureș | B | preview | liceul-bolyai-farkas-targu-mures | 0 | 4 |
| `pensiunea-aster-campu-cetatii` | Pensiunea Aster | C | reference-limited | pensiunea-aster-campu-cetatii | 0 | 2 |
| `catedrala-evanghelica-sibiu` | Catedrala Evanghelică „Sfânta Maria” din Sibiu | B | preview | catedrala-evanghelica-sibiu | 0 | 5 |
| `sediu-sts-sibiu` | Sediul STS Sibiu - Centrul de servicii esențiale de comunicații și tehnologia informației (Direcția Județeană de Telecomunicații Speciale Sibiu) | C | reference-limited | sediu-sts-sibiu | 0 | 2 |
| `biserica-evanghelica-codlea` | Biserica evanghelică fortificată din Codlea | B | preview | biserica-evanghelica-codlea | 0 | 7 |
| `biserica-evanghelica-maghiara-brasov` | Biserica Evanghelică Maghiară din Brașov - ansamblul clădirilor | B | preview | biserica-evanghelica-maghiara-brasov | 0 | 2 |
| `prefectura-maramures` | Palatul Administrativ Baia Mare (Instituția Prefectului – Județul Maramureș și Consiliul Județean Maramureș) | C | reference-limited | prefectura-maramures | 0 | 1 |
| `biserica-sf-treime-baia-mare` | Biserica romano-catolică „Sfânta Treime” din Baia Mare (fosta biserică iezuită) | B | preview | biserica-sf-treime-baia-mare | 0 | 2 |
| `manastirea-rohia` | Mănăstirea „Sfânta Ana” Rohia | B | preview | manastirea-rohia | 0 | 6 |
| `manastirea-borsa-pietroasa` | Mănăstirea Borșa – Pietroasa | B | preview | manastirea-borsa-pietroasa | 0 | 6 |
| `hotel-victoria-satu-mare` | Fostul Hotel Victoria, Satu Mare | C | reference-limited | hotel-victoria-satu-mare | 0 | 3 |
| `biserica-catolica-ciumani` | Biserica romano-catolică „Sfinții Apostoli Petru și Pavel” din Ciumani | B | preview | biserica-catolica-ciumani | 0 | 2 |
| `pavilion-parc-central-miercurea-ciuc` | Pavilion în Parcul Central, Miercurea Ciuc (pavilion de apă potabilă / forrásház) | B | preview | pavilion-parc-central-miercurea-ciuc | 0 | 3 |
| `hotel-tusnad` | Hotel Tușnad | C | preview | hotel-tusnad | 0 | 2 |
| `hotel-castel-daniel-varghis` | Castelul Daniel din Tălișoara – Castle Hotel Daniel | B | preview | hotel-castel-daniel-varghis | 0 | 3 |
| `biserica-catolica-tarnovita` | Biserica romano-catolică „Sfântul Ladislau” din Târnovița | B | preview | biserica-catolica-tarnovita | 0 | 4 |
| `biserica-reformata-taureni` | Biserica reformată din Tăureni | C | preview | biserica-reformata-taureni | 0 | 3 |
| `catedrala-nasterea-domnului-suceava` | Catedrala „Nașterea Domnului” din Suceava | B | preview | catedrala-nasterea-domnului-suceava | 0 | 7 |
| `manastirea-sucevita` | Mănăstirea Sucevița – Biserica „Învierea Domnului” | B | preview | manastirea-sucevita | 0 | 5 |
| `manastirea-secu` | Mănăstirea Secu – Biserica „Tăierea Capului Sf. Ioan Botezătorul” | B | preview | manastirea-secu | 0 | 5 |
| `manastirea-varatec` | Mănăstirea Văratec – Biserica „Adormirea Maicii Domnului” | B | preview | manastirea-varatec | 0 | 4 |
| `manastirea-almas` | Mănăstirea Almaș | B | preview | manastirea-almas | 0 | 3 |
| `biserica-sf-teodori-iasi` | Biserica „Sfinții Teodori” din Iași | B | preview | biserica-sf-teodori-iasi | 0 | 4 |
| `turnul-barboi-iasi` | Turnul-clopotniță al Bisericii Bărboi, Iași | B | preview | turnul-barboi-iasi | 0 | 3 |
| `biserica-abagerilor-barlad` | Biserica „Sf. Gheorghe” a breslei abagerilor din Bârlad | C | reference-limited | biserica-abagerilor-barlad | 0 | 2 |
| `catedrala-inaltarea-domnului-bacau` | Biserica (Catedrala) „Înălțarea Domnului” din Bacău | B | preview | catedrala-inaltarea-domnului-bacau | 0 | 3 |
| `catedrala-focsani` | Catedrala Ortodoxă „Sfânta Cuvioasa Parascheva” din Focșani | B | preview | catedrala-focsani | 0 | 5 |
| `manastirea-ciolanu` | Mănăstirea Ciolanu | B | preview | manastirea-ciolanu | 0 | 5 |
| `manastirea-negru-voda-campulung` | Mănăstirea Negru Vodă – Biserica domnească „Adormirea Maicii Domnului”, Câmpulung | C | reference-limited | manastirea-negru-voda-campulung | 0 | 3 |
| `parohia-nasterii-maicii-domnului-campulung-moldovenesc` | Biserica de lemn „Nașterea Maicii Domnului” din Câmpulung Moldovenesc (Capu Satului) | B | preview | parohia-nasterii-maicii-domnului-campulung-moldovenesc | 0 | 4 |
| `biserica-sfantul-stefan-iasi` | Biserica „Sfântul Ștefan” (Str. Albineț), Iași | C | preview | biserica-sfantul-stefan-iasi | 0 | 1 |
| `schit-berca-berca` | Schitul Berca – Biserica «Sfinții Arhangheli Mihail și Gavriil» (fosta mănăstire Berca) | B | preview | schit-berca-berca | 0 | 5 |
| `hotel-indigo-bucuresti-bucuresti` | One Plaza Athénée – clădirea nefinalizată din Str. Georges Clemenceau 8-10 (proiectul Hotel Indigo București, 2018-2019) | C | preview | hotel-indigo-bucuresti-bucuresti | 0 | 2 |
| `biserica-aparatorii-patriei-bucuresti` | Biserica Parohiei Apărătorii Patriei I | B | preview | biserica-aparatorii-patriei-bucuresti | 0 | 4 |
| `manastirea-sitaru-sitaru` | Mănăstirea Sitaru (Balamuci) – Biserica «Sfântul Nicolae» | B | preview | manastirea-sitaru-sitaru | 0 | 5 |
| `biserica-incinta-centrul-de-odihna-si-meditatie-pantelimon-l-pantelimon` | Biserica Centrului Cultural-Misionar «Familia» (Complexul Lebăda, Pantelimon) | B | preview | biserica-incinta-centrul-de-odihna-si-meditatie-pantelimon-l-pantelimon | 0 | 4 |
| `casa-dianu-craiova` | Casa Dianu (Muzeul Cărții și Exilului Românesc) | B | preview | casa-dianu-craiova | 0 | 5 |
| `biserica-sf-gheorghe-manastirea-viforata-viforata` | Biserica „Nașterea Maicii Domnului” și „Sf. Mare Mucenic Gheorghe” a Mănăstirii Viforâta | B | preview | biserica-sf-gheorghe-manastirea-viforata-viforata | 0 | 5 |
| `biserica-manastirea-manastirea` | Biserica „Sf. Dumitru și Sf. Nestor” din Mânăstirea | B | preview | biserica-manastirea-manastirea | 0 | 7 |
| `biserica-neptun-neptun` | Biserica „Adormirea Maicii Domnului” din Neptun | B | preview | biserica-neptun-neptun | 0 | 4 |
| `biserica-vartop-vartop` | Biserica „Nașterea Maicii Domnului” din Vârtop | C | preview | biserica-vartop-vartop | 0 | 2 |
| `manastirea-tariceni-calarasi` | Schitul (Mănăstirea) Tăriceni – Biserica „Sf. Ierarh Nicolae” | B | preview | manastirea-tariceni-calarasi | 0 | 2 |
| `casa-armatei-constanta` | Cercul Militar Constanța (fosta Prefectură a județului Constanța) | C | reference-limited | casa-armatei-constanta | 0 | 1 |
| `biserica-balint-balint` | Biserica Ortodoxă «Învierea Domnului» din Balinț | C | reference-limited | biserica-balint-balint | 0 | 1 |
| `biserica-jdioara-jdioara` | Biserica Ortodoxă «Sfinții Apostoli Petru și Pavel» din Jdioara | C | reference-limited | biserica-jdioara-jdioara | 0 | 1 |
| `biserica-mosnita-veche-mosnita-veche` | Biserica Ortodoxă «Înălțarea Domnului» din Moșnița Veche | C | reference-limited | biserica-mosnita-veche-mosnita-veche | 0 | 3 |
| `parohia-ortodoxa-romana-sag-sag` | Biserica Ortodoxă «Adormirea Maicii Domnului» din Șag | B | preview | parohia-ortodoxa-romana-sag-sag | 0 | 4 |
| `parohia-ortodoxa-romana-timisoara-plopi-timisoara` | Biserica Ortodoxă «Sfinții Apostoli Petru și Pavel» – Plopi, Timișoara | C | reference-limited | parohia-ortodoxa-romana-timisoara-plopi-timisoara | 0 | 4 |
| `biserica-tormac-tormac` | Biserica Reformată din Tormac | B | preview | biserica-tormac-tormac | 0 | 3 |
| `biserica-iecea-mare-iecea-mare` | Biserica Ortodoxă «Sfinții Arhangheli Mihail și Gavriil» din Iecea Mare | C | reference-limited | biserica-iecea-mare-iecea-mare | 0 | 1 |
| `biserica-obirsia-closani-obirsia-closani` | Biserica „Sfântul Mare Mucenic Teodor Tiron” din Obârșia-Cloșani | C | reference-limited | biserica-obirsia-closani-obirsia-closani | 0 | 2 |
| `manastirea-sf-ioan-iacob-hozevitul-piatra-craiului` | Mănăstirea Piatra Craiului «Sfântul Ioan Iacob Hozevitul» | C | preview | manastirea-sf-ioan-iacob-hozevitul-piatra-craiului | 0 | 3 |
| `manastirea-sfanta-treime-farau` | Mănăstirea «Sfânta Treime» Fărău | B | preview | manastirea-sfanta-treime-farau | 0 | 5 |
| `parohia-buna-vestire-bistrita` | Biserica Greco-Catolică «Buna Vestire» Bistrița | C | preview | parohia-buna-vestire-bistrita | 0 | 3 |
| `corp-manastirea-ponor-ponor` | Mănăstirea Ponor «Înălțarea Domnului» (building/wing not identified) | C | preview | corp-manastirea-ponor-ponor | 0 | 2 |
| `manastirea-buna-vestire-zlatna` | Mănăstirea «Buna Vestire» Pătrângeni (Negraia), Zlatna | B | preview | manastirea-buna-vestire-zlatna | 0 | 3 |
| `biserica-romano-catolica-foieni` | Biserica Romano-Catolică «Sfântul Arhanghel Mihail» din Foieni | B | preview | biserica-romano-catolica-foieni | 0 | 3 |
| `manastirea-oasa-sugag` | Mănăstirea Oașa – biserica nouă „Sfântul Mare Mucenic Pantelimon” | B | preview | manastirea-oasa-sugag | 0 | 3 |
| `parohia-ortodoxa-romana-sadu-i-sadu` | Biserica Ortodoxă „Adormirea Maicii Domnului” din Sadu (biserica veche, Parohia Sadu I) | B | preview | parohia-ortodoxa-romana-sadu-i-sadu | 0 | 3 |
| `biserica-ortodoxa-stramtura-stramtura` | Biserica Ortodoxă din Strâmtura (biserica parohială de zid, Parohia Ortodoxă Strâmtura) | C | preview | biserica-ortodoxa-stramtura-stramtura | 0 | 2 |
| `biserica-reformata-din-apahida-apahida` | Biserica Reformată din Apahida (biserică nouă în construcție, Parohia Reformată de Misiune Apahida) | C | preview | biserica-reformata-din-apahida-apahida | 0 | 4 |
| `biserica-bodogaia` | Biserica din Bodogaia | D | none | — | 0 | — |
| `tiny-house-zenius` | Tiny house Zenius | D | none | — | 0 | — |
| `primaria-sector-5-bucuresti` | Primăria Sectorului 5 (building that received the roof not identified) | D | none | — | 0 | — |
| `spitalul-militar-bucuresti` | Spitalul Universitar de Urgență Militar Central „Dr. Carol Davila” (specific building not identified) | D | none | — | 0 | — |
| `primaria-alexandria` | Primăria Municipiului Alexandria | D | preview | primaria-alexandria | 0 | 0 |
| `muzeul-civilizatiei-dacice-orastie` | Muzeul Civilizației Dacice Orăștie (fostul spital orășenesc), str. Nicolae Bălcescu 16 | D | reference-limited | muzeul-civilizatiei-dacice-orastie | 0 | 0 |
| `catedrala-deva` | catedrala-deva | D | none | — | 0 | — |
| `uad-cluj` | Universitatea de Artă și Design din Cluj-Napoca | D | none | — | 0 | — |
| `clinica-croitorilor-cluj` | Clinica Croitorilor (unidentified building on/near Strada Croitorilor) | D | none | — | 0 | — |
| `biserica-beica` | Biserica din Beica (unidentified; Beica de Jos commune, Mureș) | D | none | — | 0 | — |
| `consiliul-judetean-bistrita` | Palatul Administrativ Bistrița (Consiliul Județean Bistrița-Năsăud și Instituția Prefectului) | D | reference-limited | consiliul-judetean-bistrita | 0 | 0 |
| `liceul-tamasi-aron-odorhei` | Liceul Teoretic „Tamási Áron” (campus) | D | none | — | 0 | — |
| `biserica-sf-ilie-suceava` | biserica-sf-ilie-suceava | D | none | — | 0 | — |
| `umf-iasi` | Universitatea de Medicină și Farmacie „Grigore T. Popa” Iași – building not identified | D | none | — | 0 | — |
| `biserica-bicaz` | Biserică din Bicaz (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-grumazesti` | Biserică din comuna Grumăzești (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-probota` | Biserica Parohiei „Sf. Nicolae” – Ciulinești, sat Probota (clădire nelocalizată) | D | none | — | 0 | — |
| `biserica-dobreni` | Biserica „Adormirea Maicii Domnului”, sat Dobreni (clădire nelocalizată) | D | none | — | 0 | — |
| `episcopia-romanului-roman` | Arhiepiscopia Romanului și Bacăului – centrul eparhial din Roman (clădirea acoperită neidentificată) | D | none | — | 0 | — |
| `biserica-horodnic-de-jos` | Biserică din Horodnic de Jos (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-deleni-vaslui` | Biserica nouă „Adormirea Maicii Domnului” a Parohiei Deleni II, sat Deleni (clădire nelocalizată) | D | none | — | 0 | — |
| `biserica-ortodoxa-balteni` | Biserica Ortodoxă „Adormirea Maicii Domnului” din Bălteni | D | none | — | 0 | — |
| `biserica-ortodoxa-andrieseni` | Biserica Parohiei „Sf. Nicolae” Andrieșeni (biserica nouă, în construcție; nelocalizată) | D | none | — | 0 | — |
| `biserica-comuna-vinderei` | Biserica „Sf. Prooroc Ilie Tesviteanul” din Vinderei (biserică nouă, în construcție 2019-2024) | D | none | — | 0 | — |
| `biserica-sat-scheia` | Biserică din satul Șcheia, jud. Suceava (clădire neidentificată) | D | none | — | 0 | — |
| `manastirea-sfantul-sava-berzunti` | Mănăstirea „Sfântul Sava” – Berzunți (sat Buda, fost Schitu Savu) | D | none | — | 0 | — |
| `gradinita-cu-program-prelungit-nr-8-iasi` | Grădinița cu Program Prelungit nr. 8 Iași | D | none | — | 0 | — |
| `biserica-sf-ioan-suceava` | Biserica „Sf. Ioan”, Suceava (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-sibiciu-sibiciu` | Biserica din Sibiciu (building not identified) | D | none | — | 0 | — |
| `cladire-administrativa-a-bisericii-ramnicu-sarat-ramnicu-sarat` | Clădire administrativă a unei biserici din Râmnicu Sărat (building not identified) | D | none | — | 0 | — |
| `biserica-urziceni-urziceni` | Biserica din Urziceni (building not identified) | D | none | — | 0 | — |
| `biserica-snagov-snagov` | Biserica din comuna Snagov (building not identified) | D | none | — | 0 | — |
| `biserica-in-incinta-spitalului-colentina-bucuresti` | Biserica «Izvorul Tămăduirii» din incinta Spitalului Clinic Colentina | D | none | — | 0 | — |
| `cladirea-administrativa-arhiepiscopia-buzaului-buzau` | Clădirea administrativă a Arhiepiscopiei Buzăului și Vrancei (building within the compound not identified) | D | none | — | 0 | — |
| `clopotnita-urziceni-urziceni` | Clopotnița unei biserici din Urziceni (building not identified) | D | none | — | 0 | — |
| `parohia-barbatesu-vechi-bucuresti` | Parohia «Bărbătescu Vechi» – Biserica «Sfântul Ierarh Nicolae» (old church or new parish church, not determined) | D | none | — | 0 | — |
| `biserica-brebu-brebu` | Biserica din comuna Brebu, Prahova (building not identified) | D | none | — | 0 | — |
| `biserica-rusetu-rusetu` | Biserica «Sfântul Ierarh Nicolae» din Rușețu | D | none | — | 0 | — |
| `imobil-in-incinta-arhiepiscopiei-buzaului-si-vrancei-buzau` | Imobil în incinta Arhiepiscopiei Buzăului și Vrancei (building within the compound not identified) | D | none | — | 0 | — |
| `biserica-maracineni-maracineni` | Biserica din Mărăcineni, Buzău (building not identified) | D | none | — | 0 | — |
| `biserica-dragalina-dragalina` | Biserica „Sfinții Arhangheli Mihail și Gavriil” din Dragalina | D | none | — | 0 | — |
| `biserica-chilia-veche-chilia-veche` | Biserică (neidentificată) – Chilia Veche | D | none | — | 0 | — |
| `biserica-parohia-sfantul-ioan-botezatorul-ramnicu-valcea` | Biserica Parohiei „Sfântul Ioan Botezătorul” din Râmnicu Vâlcea | D | none | — | 0 | — |
| `centrul-de-varstnici-turnu-magurele` | Centrul Recreativ pentru Persoane Vârstnice Turnu Măgurele (fostul imobil „Centru Administrativ”) | D | none | — | 0 | — |
| `oficiul-de-cadastru-braila` | Oficiul de Cadastru și Publicitate Imobiliară Brăila (OCPI Brăila) | D | none | — | 0 | — |
| `fostul-spital-orasenesc-muzeu-segarcea` | Fostul spital orășenesc transformat în muzeu (neidentificat) – Segarcea | D | none | — | 0 | — |
| `biserica-grumazesti-gurbanesti` | Biserica „Grumăzești” (neidentificată) – Gurbănești | D | none | — | 0 | — |
| `episcopia-sloboziei-si-calarasilor-calarasi` | Episcopia Sloboziei și Călărașilor (clădire neidentificată) | D | none | — | 0 | — |
| `foisor-in-parcul-tineretului-turnu-magurele` | Foișor în Parcul Tineretului (neidentificat) – Turnu Măgurele | D | none | — | 0 | — |
| `biserica-lumina-lumina` | Biserică (neidentificată) – Lumina | D | none | — | 0 | — |
| `biserica-costesti-costesti` | Biserică (neidentificată) – Costești | D | none | — | 0 | — |
| `biserica-draganesti-vlasca-draganesti-vlasca` | Biserică (neidentificată) – Drăgănești-Vlașca | D | none | — | 0 | — |
| `biserica-sf-achim-si-ana-stefanesti` | Biserica „Sfinții Ioachim și Ana” (neidentificată) – Ștefănești, Ilfov | D | none | — | 0 | — |
| `ubc-timisoara-cladire-birouri-timisoara` | United Business Center (UBC) office buildings, Iulius Town Timișoara (specific building not identified) | D | none | — | 0 | — |
| `parohia-ortodoxa-romana-cebza-cebza` | Biserica Ortodoxă «Nașterea Sfântului Ioan Botezătorul» din Cebza | D | none | — | 0 | — |
| `biserica-racovita-racovita` | biserica-racovita-racovita | D | none | — | 0 | — |
| `biserica-honorici-honorici` | Biserica Ortodoxă «Nașterea Maicii Domnului» din Honorici | D | none | — | 0 | — |
| `biserica-adormirea-maicii-domnului-ficatar` | Biserica Ortodoxă «Adormirea Maicii Domnului» din Ficătar | D | none | — | 0 | — |
| `biserica-bobda-bobda` | biserica-bobda-bobda | D | none | — | 0 | — |
| `biserica-hitias-hitias` | biserica-hitias-hitias | D | none | — | 0 | — |
| `biserica-hisias-hisias` | Biserica Ortodoxă «Sfântul Mare Mucenic Gheorghe» din Hisiaș | D | none | — | 0 | — |
| `anexa-a-bisericii-caransebes` | Clădire anexă a unei biserici (neidentificată), lângă Caransebeș | D | none | — | 0 | — |
| `parohia-sf-mucenic-sebastian-oradea` | Biserica Ortodoxă „Sfântul Mucenic Sebastian” (Parohia Sf. Mucenic Sebastian), Oradea | D | none | — | 0 | — |
| `biserica-borosteni-borosteni` | Biserica Ortodoxă „Sfânta Cuvioasă Parascheva” din Boroșteni (Parohia Boroșteni) | D | none | — | 0 | — |
| `biserica-arcani-arcani` | Biserică neidentificată, comuna Arcani | D | none | — | 0 | — |
| `biserica-isvarna-pocruia` | Biserica „Sfântul Mare Mucenic Gheorghe” din Isvarna (filie a Parohiei Pocruia) | D | none | — | 0 | — |
| `biserica-hateg-hateg` | Biserică neidentificată, Hațeg | D | none | — | 0 | — |
| `biserica-ortodoxa-sohodol-sohodol` | Biserica ortodoxă din Sohodol (neidentificată cu certitudine; candidat: Biserica „Sfinții Voievozi”, Parohia Sohodol) | D | none | — | 0 | — |
| `biserica-glodeni-glodeni` | Biserică neidentificată, Glodeni (comuna Bălănești) | D | none | — | 0 | — |
| `biserica-nadlac-nadlac` | Biserică neidentificată, Nădlac | D | none | — | 0 | — |
| `biserica-lunca-ilvei-lunca-ilvei` | Biserica Ortodoxă din Lunca Ilvei | D | none | — | 0 | — |
| `biserica-dumbrava-dumbrava` | Biserica din Dumbrava, jud. Timiș (building not identified) | D | none | — | 0 | — |
| `biserica-berchez-berchez` | Biserica din Berchez (building not identified) | D | none | — | 0 | — |
| `biserica-chechis-chechis` | Biserica Ortodoxă din Chechiș | D | none | — | 0 | — |
| `biserica-ortodoxa-borcut-borcut` | Biserica Ortodoxă din Borcut | D | none | — | 0 | — |
| `biserica-sat-cicarlau-cicarlau` | Biserica sat Cicârlău (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-barsana-barsana` | Biserică, Bârsana (clădire neidentificată) | D | none | — | 0 | — |
| `biserica-sasar-sasar` | Biserica Ortodoxă „Înălțarea Sfintei Cruci” din Săsar (Parohia Înălțarea Sfintei Cruci) | D | none | — | 0 | — |
| `parohia-ortodoxa-ungureni-ungureni` | Biserica Ortodoxă din Ungureni (biserica parohială de zid; Parohia Ortodoxă Ungureni) | D | none | — | 0 | — |
| `parohia-sfintii-arhangheli-baia-mare` | Biserica Ortodoxă „Sfinții Arhangheli Mihail și Gavril” (Parohia Sfinții Arhangheli, cartier Vasile Alecsandri) | D | none | — | 0 | — |
| `parohia-ortodoxa-bozanta-mica-bozanta-mica` | Biserica Ortodoxă din Bozânta Mică (Parohia Ortodoxă Bozânta Mică) | D | none | — | 0 | — |
| `parohia-ortodoxa-romana-viseu-de-mijloc-viseu-de-mijloc` | Biserica Ortodoxă din Vișeu de Mijloc (Parohia Ortodoxă Română Vișeu de Mijloc) | D | none | — | 0 | — |
| `biserica-tulghes-tulghes` | Biserică, Tulgheș (clădire neidentificată) | D | none | — | 0 | — |
| `reg-cladiri-vechi-cluj-napoca-cluj-napoca` | Clădiri vechi, Cluj-Napoca | D | none | — | 0 | — |
| `reg-monument-istoric-timisoara` | Monument istoric | D | none | — | 0 | — |
| `reg-cladire-veche-cluj-napoca-cluj-napoca` | Clădire veche, Cluj-Napoca | D | none | — | 0 | — |
| `reg-restaurant-bran-bran` | Restaurant, Bran | D | none | — | 0 | — |
| `reg-manastirea-sfintii-martiri-brancoveni-crucea-iancului-marisel` | Mănăstirea Sfinții Martiri Brancoveni-crucea Iancului | D | none | — | 0 | — |
| `reg-cladire-istorica-timisoara` | Clădire istorică | D | none | — | 0 | — |
| `reg-restaurant-timisoara-timisoara` | Restaurant, Timișoara | D | none | — | 0 | — |
| `reg-vila-istorica-bucuresti` | Vilă istorică | D | none | — | 0 | — |
| `reg-casa-armatei-um-02033-iasi` | Casa Armatei, UM 02033 | D | none | — | 0 | — |
| `reg-cladire-monument-istoric-timisoara-timisoara` | Clădire monument istoric, Timișoara | D | none | — | 0 | — |
| `reg-turla-bisericii-arad-arad` | Turla bisericii, Arad | D | none | — | 0 | — |
| `reg-supermarket-blejoi-blejoi` | Supermarket, Blejoi | D | none | — | 0 | — |
| `reg-cladire-timisoara-timisoara` | Clădire, Timișoara | D | none | — | 0 | — |
| `reg-gradinita-iasi-iasi` | Grădinița, Iași | D | none | — | 0 | — |
| `reg-baza-de-agrement-go-kart-desag` | Baza de agrement Go Kart | D | none | — | 0 | — |
| `reg-biserica-calarasi-calarasi` | Biserica Călărași | D | none | — | 0 | — |
| `reg-imobil-cluj-napoca-cluj-napoca` | Imobil, Cluj-Napoca | D | none | — | 0 | — |
| `reg-hotel-poiana-brasov-poiana-brasov` | Hotel, Poiana Brașov | D | none | — | 0 | — |
| `reg-pavilion-nou-in-cazarma-398-parchet-militar-iasi` | Pavilion nou în cazarma 398 - Parchet Militar | D | none | — | 0 | — |
| `reg-unitate-militara-husi` | Unitate militară | D | none | — | 0 | — |
| `reg-showroom-targu-mures-targu-mures` | Showroom, Târgu Mureș | D | none | — | 0 | — |
| `reg-corp-nou-incinta-cazarma-398-iasi` | Corp nou incinta Cazarma 398 | D | none | — | 0 | — |
| `reg-manastire-arad-arad` | Mănăstire, Arad | D | none | — | 0 | — |
| `reg-parohia-ortodoxa-romana-sindresti-sindresti` | Parohia Ortodoxă Română Sindresti | D | none | — | 0 | — |
| `reg-cladire-odorheiu-secuiesc-odorheiu-secuiesc` | Clădire, Odorheiu Secuiesc | D | none | — | 0 | — |
<!-- GENERATED-TABLE:END -->
