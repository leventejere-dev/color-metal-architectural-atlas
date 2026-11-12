"""
Import every won project of the internal register ('TOTAL Registru proiecte
arhitecturale', private copy in work/private) that is a locatable building, as a
public map entry at town level, without client data.

  python scripts/import-register.py            → data/sources/register-projects.json

Rules
  - only won projects (column 'Proiect castigat' = DA)
  - dropped: own stock, resellers, 'various projects', interiors, gutter-only /
    rainwater-only supplies, projects abroad, rows without a town
  - private houses without photographs or other information are left out entirely (client decision)
  - projects already in the atlas (project-sources.json) or researched
    individually (data/geo/batch-*.json 'registerName') are skipped here
  - towns are geocoded with OpenStreetMap Nominatim (cached in data/cache/geocode.json)
  - only product families are published (elZinc Slate, TECU Patina…), never
    thicknesses or quantities
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "work/private/total-register.json"
OUT = ROOT / "data/sources/register-projects.json"
CACHE = ROOT / "data/cache/geocode.json"

COUNTY = {
    "AB": "Alba", "AR": "Arad", "AG": "Argeș", "BC": "Bacău", "BH": "Bihor", "BN": "Bistrița-Năsăud", "BT": "Botoșani", "BR": "Brăila",
    "BV": "Brașov", "B": "București", "BZ": "Buzău", "CL": "Călărași", "CS": "Caraș-Severin", "CJ": "Cluj", "CT": "Constanța", "CV": "Covasna",
    "DB": "Dâmbovița", "DJ": "Dolj", "GL": "Galați", "GR": "Giurgiu", "GJ": "Gorj", "HR": "Harghita", "HD": "Hunedoara", "IL": "Ialomița",
    "IS": "Iași", "IF": "Ilfov", "MM": "Maramureș", "MH": "Mehedinți", "MS": "Mureș", "NT": "Neamț", "OT": "Olt", "PH": "Prahova",
    "SJ": "Sălaj", "SM": "Satu Mare", "SB": "Sibiu", "SV": "Suceava", "TR": "Teleorman", "TM": "Timiș", "TL": "Tulcea", "VL": "Vâlcea",
    "VS": "Vaslui", "VN": "Vrancea",
}
# Names of companies and persons never appear in this public script: they live in the private,
# git-ignored work/private/register-rules.json ({"drop": [...], "privateNames": [...], "companyNames": {...}}).
_RULES_PATH = ROOT / "work/private/register-rules.json"
_RULES = json.loads(_RULES_PATH.read_text(encoding="utf-8")) if _RULES_PATH.exists() else {}
_alt = lambda xs: "".join("|" + re.escape(x) for x in xs)  # noqa: E731
DROP_NAME = re.compile(r"stoc propriu|diverse|revanzator|^pf |interior|tavan|confectionare|^\W*$|sistem pluvial|jgheab|^cladirii$|^…|copertina deasupra" + _alt(_RULES.get("drop", [])), re.I)
ABROAD = re.compile(r"austria|viena|franta|ungaria|republica moldova|rep\. moldova|chisinau|hagimus", re.I)
PRIVATE = re.compile(r"casa particular|case particular|cladiri particular|locuint|imobil particular|casa fam|sistem pluvial imobil|asocia\w*\s+p\w*ietari|proprietate particular|,\s*particular\b" + _alt(_RULES.get("privateNames", [])), re.I)
# register lines that are existing atlas projects (photo archive) — (normalised name prefix, normalised town or None)
SAME_AS_EXISTING = [
    ("parcare etajata s p 2 pe strada mihail kogalniceanu", None),  # parcare-satu-mare
    ("biserica ortodoxa romana giroc", None), ("biserica", "giroc"),  # parohia-ortodoxa-giroc
    ("catedrala", "satu mare"),  # catedrala-ortodoxa-satu-mare (copper strip 2019)
    ("muzeul apei mosnita", None),  # muzeul-apei-timisoara
    ("centrul reformat", None),  # centrul-reformat-noul-mileniu
    ("parohia romano catolica sf mihail", None), ("catedrala sf mihail", None),  # biserica-sf-mihail-cluj
    ("catedrala mitropolitana iasi", None),  # ansamblul-mitropolitan-iasi
    ("biserica romano catolica sfantul ioan botezatorul din delnita", None),  # biserica-delnita
    ("csiki jatekszin", None), ("biserica bodogaia", None),
    ("biserica teius", None),  # rainwater system + valley only
    ("noua maternitate bega timisoara", None),  # clinica-obstetrica-timisoara
    ("imobil in incinta manastirii ciolanu", None),  # manastirea-ciolanu (researched)
]
TOWN_FROM_NAME = {"catedrala deva": "Deva"}
# names that are company names (client/contractor) or misspelt → neutral public names
NAME_FIX = {**_RULES.get("companyNames", {}),
            "spitalul orasensc transformat in muzeu": "Fostul spital orășenesc (muzeu)", "fatada hotel": "Hotel", "fatada imobil": "Imobil",
            "cladire istorica": "Clădire istorică", "reabilitare monument istoric": "Monument istoric", "invelitoare cladire anexa biserica": "Anexă a bisericii",
            "clopotnita biserica": "Clopotniță", "cladire noua birouri": "Clădire de birouri", "unitate militare": "Unitate militară",
            "centrul de varstnici": "Centrul de vârstnici", "schit": "Schit"}  # register location is the buyer's town, the name gives the site
# county names that are not also a town name: such locations cannot be placed honestly
COUNTY_ONLY = {"alba", "arges", "bihor", "bistrita nasaud", "caras severin", "covasna", "dambovita", "dolj", "gorj", "harghita", "ialomita",
               "ilfov", "maramures", "mehedinti", "mures", "neamt", "olt", "prahova", "salaj", "teleorman", "timis", "valcea", "vrancea",
               "moldova", "ardeal", "hargitha"} | {k.lower() for k in COUNTY if k != "B"}
GENERIC = {"biserica": "Biserică", "biserica ortodoxa": "Biserică ortodoxă", "biserica ortodoxa romana": "Biserică ortodoxă", "manastirea": "Mănăstire",
           "catedrala": "Catedrală", "primarie": "Primăria", "primaria": "Primăria", "sediu primarie": "Primăria", "cladire veche": "Clădire veche",
           "cladiri vechi": "Clădiri vechi", "turla biserica": "Turla bisericii", "imobil": "Imobil", "cladire administrativa a bisericii": "Clădire administrativă a bisericii",
           "cladire monument istoric": "Clădire monument istoric"}


ACRONYMS = {"UBC", "UM", "UMF", "CFR", "II", "III", "IV", "SRL"}
SMALL = {"si": "și", "și": "și", "de": "de", "din": "din", "la": "la", "cu": "cu", "a": "a", "al": "al", "lui": "lui", "in": "în", "în": "în", "sat": "sat", "nr.": "nr."}
DIAC = {"manastirea": "mănăstirea", "manastirii": "mănăstirii", "manastire": "mănăstire", "ortodoxa": "ortodoxă", "romana": "română", "sfanta": "sfânta", "sfinta": "sfânta",
        "sfantul": "sfântul", "sfintii": "sfinții", "nasterii": "nașterii", "nasterea": "nașterea", "gradinita": "grădinița", "cladirea": "clădirea", "cladire": "clădire",
        "buzaului": "buzăului", "aparatorii": "apărătorii", "odihna": "odihnă", "meditatie": "meditație", "foisor": "foișor", "calarasi": "călărași",
        "administrativa": "administrativă", "brancoveni": "brâncoveni", "tariceni": "țăriceni", "lebada": "lebăda", "botezatorul": "botezătorul",
        "andrieseni": "andrieșeni", "romano-catolica": "romano-catolică", "catolica": "catolică", "reformata": "reformată", "evanghelica": "evanghelică",
        "biserica": "biserica", "comuna": "comuna", "c-lung": "Câmpulung", "mold": "Moldovenesc", "timisoara": "Timișoara", "iasi": "Iași", "brasov": "Brașov",
        "buzau": "Buzău", "targu": "Târgu", "mures": "Mureș", "incinta": "incinta", "spitalului": "spitalului"}


def fix_word(w: str) -> str:
    """Normalise register capitalisation and restore common Romanian diacritics (first word keeps its capital)."""
    if w.upper() in ACRONYMS and w.isupper():
        return w
    lw = w.lower()
    if lw in SMALL:
        return SMALL[lw]
    if lw in DIAC:
        d = DIAC[lw]
        return d if d[:1].isupper() else (d[:1].upper() + d[1:] if w[:1].isupper() else d)
    if w.isupper() and len(w) >= 2 and any(c.isalpha() for c in w):
        return w[:1] + w[1:].lower()
    return w


def clean_name(name: str) -> str:
    s = re.sub(r"\s*…+\s*|\.{3,}", " ", name)
    s = re.sub(r"[\"„“”]", " ", s)
    s = re.sub(r"\(\s*\)", " ", s)
    s = re.sub(r"\(continuare\)|\bcontinuare\b|\bcompletare\b|\(.*partial.*\)|lucrari partiale|,\s*partial\b|\(completare\)", " ", s, flags=re.I)
    s = re.sub(r"^\s*(restaurare acoperis|construire)\s+", "", s, flags=re.I)
    s = re.sub(r"\s+(si|și)\s*$", "", s, flags=re.I)
    s = re.sub(r"\b(\w+)\s+\1\b", r"\1", s, flags=re.I)  # 'Biblioteca Biblioteca'
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r",?\s*din zona\s+\S+", "", s, flags=re.I)
    s = " ".join(fix_word(w) for w in s.split())
    s = re.sub(r"\s+", " ", s).strip(" ,.-")
    return s[:1].upper() + s[1:]


def display_name(name: str, town: str) -> str:
    """Public display name; generic register names become '<type>, <town>' (Primăria <town>)."""
    s = clean_name(name)
    n = norm(s)
    if n in NAME_FIX:
        s = NAME_FIX[n]
        n = norm(s)
        if n not in GENERIC and n not in ("cladire", "hotel", "imobil", "supermarket", "schit", "clopotnita"):
            return s
        return f"{s}, {town}"
    if n in GENERIC or len(n.split()) <= 1:
        g = GENERIC.get(n, title(s))
        return f"{g} {town}" if g == "Primăria" else f"{g}, {town}"
    return title(s)


def rkey(name: str) -> str:
    """One-way key of a register name (the public data never carries the register's own wording)."""
    import hashlib
    return hashlib.sha1(norm(clean_name(name)).encode("utf-8")).hexdigest()[:16]


def dedupe_key(disp: str, town: str) -> str:
    n = norm(disp).replace("primaria", "primarie")
    return n + "|" + norm(town)
GUTTER_ONLY = re.compile(r"^(sistem pluvial|jgheab|burlan|covor|teava|tevi|țevi)", re.I)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", norm(s)).strip("-")[:60]


def title(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip(" .,-")
    if s.isupper() or sum(c.isupper() for c in s) > 0.6 * sum(c.isalpha() for c in s):
        small = {"si", "și", "de", "din", "la", "cu", "a", "al", "lui", "în", "in"}
        words = s.lower().split(" ")
        s = " ".join(w if (i and w in small) else w[:1].upper() + w[1:] for i, w in enumerate(words))
    return s


def category(name: str) -> str:
    n = norm(name)
    if re.search(r"manastir|schit", n):
        return "monastery"
    if re.search(r"biseric|parohi|catedral|clopotnit|turla|turn biseric|episcop|arhiepiscop", n):
        return "church"
    if re.search(r"muzeu", n):
        return "museum"
    if re.search(r"bibliotec", n):
        return "library"
    if re.search(r"liceu|scoal|gradinit|universit|umf|facultat", n):
        return "education"
    if re.search(r"spital|clinic|maternit", n):
        return "healthcare"
    if re.search(r"hotel|pensiun|restaurant|showroom|sediu|supermarket|magazin|birouri|auto|baza de agrement", n):
        return "commercial"
    if re.search(r"teatr|palat cultural|casa armatei|centru", n):
        return "cultural"
    if re.search(r"primari|prefect|consiliul|cadastru|cazarm|unitat", n):
        return "historic"
    if PRIVATE.search(name):
        return "residential"
    if re.search(r"conac|castel|vila|casa ", n):
        return "historic"
    return "historic"


def metals(mat: str) -> list[str]:
    m = norm(mat)
    out = []
    if re.search(r"cupru|copper|cu dhp|tecu", m):
        out.append("copper")
    if re.search(r"zinc|elzinc|zn", m) and "zincat" not in m:
        out.append("titanium-zinc")
    if re.search(r"alumin|prefa|\bal\b|latem", m):
        out.append("aluminium")
    if re.search(r"alama|brass", m):
        out.append("brass")
    return out


def products(mat: str) -> list[str]:
    m = norm(mat)
    out = []
    for key, label in [
        (r"elzinc slate|ti zn slate|tizn slate|zinc slate", "elZinc® Slate"),
        (r"graphite", "elZinc® Graphite"),
        (r"oliva", "elZinc® Oliva"),
        (r"rainbow gold|elzinc gold", "elZinc® Rainbow Gold"),
        (r"rainbow brown", "elZinc® Rainbow Brown"),
        (r"rainbow green", "elZinc® Rainbow Green"),
        (r"elzinc natural|titan zinc natural|titanzinc natural|ti zn natural", "Titanium-zinc, natural"),
        (r"tecu patina oslo", "KME TECU® Patina Oslo"),
        (r"tecu patina hamburg", "KME TECU® Patina Hamburg"),
        (r"tecu oxid", "KME TECU® Oxid"),
        (r"prefa", "PREFA aluminium"),
        (r"copperline", "Aluminium, Copperline"),
        (r"expandat|expanded|soho|brera", "Expanded aluminium"),
        (r"perforat", "Perforated aluminium"),
        (r"cu dhp", "Cu-DHP copper"),
        (r"\bkme\b", "KME copper"),
    ]:
        if re.search(key, m) and label not in out:
            out.append(label)
    return out


TOWN_FIX = {"ghiroc": "Giroc", "timisoara mehala": "Timișoara", "timisoara plopi": "Timișoara", "marisel": "Mărișel", "tg mures": "Târgu Mureș", "hunedora": "Hunedoara", "in centrul clujului": "Cluj-Napoca", "cluj": "Cluj-Napoca", "barlad": "Bârlad",
            "c lung moldovenesc": "Câmpulung Moldovenesc", "c lung mold": "Câmpulung Moldovenesc", "dragannesti vlasca": "Drăgănești-Vlașca",
            "sf gheorghe": "Sfântu Gheorghe", "bistrita": "Bistrița", "tg mures": "Târgu Mureș", "marosvasarhely": "Târgu Mureș", "campina": "Câmpina"}


def parse_loc(loc: str):
    loc = re.sub(r"\s+", " ", loc or "").strip()
    loc = re.sub(r"^\d{5,6}\s+", "", loc)
    loc = re.sub(r"^(parohia\s+)?(ortodoxa\s+)?(romana\s+)?", "", loc, flags=re.I) if re.match(r"parohia", loc, re.I) else loc
    if not loc or loc in ("-", "…", "....", "…...") or loc.startswith("…"):
        return None, None
    code = None
    m = re.search(r",\s*([A-Z]{1,2})\s*$", loc)
    if m and m.group(1) in COUNTY:
        code = m.group(1)
        loc = loc[: m.start()].strip()
    loc = re.sub(r"^(sat|com\.?|comuna|localitatea|din zona|zona)\s+", "", loc, flags=re.I)
    loc = re.sub(r"^(langa|lângă|in apropiere de)\s+", "", loc, flags=re.I)
    loc = re.sub(r"\s+fn\b.*$", "", loc, flags=re.I)  # 'fără număr'
    m2 = re.search(r"\s*-?\s+([A-Za-z]{1,2})\s*$", loc)
    if m2 and m2.group(1).upper() in COUNTY and len(loc) > 4:
        code = code or m2.group(1).upper()
        loc = loc[: m2.start()].strip()
    loc = re.split(r",|\bstr\.|\bstrada\b|\bnr\.|\bjud\.", loc, flags=re.I)[0].strip()
    if re.match(r"^sector \d", loc, re.I):
        loc, code = "București", "B"
    if norm(loc) in ("bucuresti", "b"):
        loc, code = "București", "B"
    loc = re.sub(r"\bcom\.?\s+.*$", "", loc, flags=re.I).strip()
    if norm(loc) in TOWN_FIX:
        loc = TOWN_FIX[norm(loc)]
    if loc and loc.isupper():
        loc = title(loc)
    return (loc or None), (COUNTY.get(code) if code else None)


def geocode(cache: dict, town: str, county: str | None):
    hit = _geocode(cache, town, county)
    if county and (not hit or _ratio(hit, town) < 0.75):
        alt = _geocode(cache, town, None)  # the register's county code is sometimes wrong
        if alt and (not hit or _ratio(alt, town) > _ratio(hit, town)):
            hit = alt
    return hit


def _ratio(hit: dict, town: str) -> float:
    import difflib
    return difflib.SequenceMatcher(None, norm(hit.get("display", "").split(",")[0]), norm(town)).ratio()


def _geocode(cache: dict, town: str, county: str | None):
    key = f"{town}|{county or ''}"
    if cache.get(key):
        return cache[key]
    q = f"{town}, {county}, Romania" if county else f"{town}, Romania"
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "jsonv2", "limit": 1, "addressdetails": 1, "countrycodes": "ro", "featureType": "settlement"})
    req = urllib.request.Request(url, headers={"User-Agent": "architectural-atlas-build/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            res = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print("  geocode failed", q, e)
        res = []
    time.sleep(1.2)
    hit = None
    if res:
        a = res[0]
        addr = a.get("address", {})
        hit = {"lat": round(float(a["lat"]), 6), "lon": round(float(a["lon"]), 6), "county": (addr.get("county") or addr.get("state") or county or "").replace("Județul ", "").replace("Municipiul ", ""), "display": a.get("display_name", "")[:120], "osm": f"{a.get('osm_type')} {a.get('osm_id')}"}
    cache[key] = hit
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
    return hit


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    reg = json.loads(REG.read_text(encoding="utf-8"))
    src = json.loads((ROOT / "data/sources/project-sources.json").read_text(encoding="utf-8"))
    known = {norm(n) for p in src["projects"] for n in p.get("register", [])}
    known |= {norm(p["name"]) for p in src["projects"]}
    researched = set()
    researched_keys = set()
    researched_pairs: list[tuple[str, str]] = []
    researched_hash: set[str] = set()
    files = {f.name: f for f in (ROOT / "data/geo").glob("batch-*.json")}
    files.update({f.name: f for f in (ROOT / "work/private/geo").glob("batch-*.json")})  # raw research copies
    for f in files.values():
        try:
            for g in json.loads(f.read_text(encoding="utf-8")):
                researched_hash.update(g.get("registerKeys") or [])
                for alt in g.get("altRegisterNames") or []:
                    researched.add(norm(alt))
                    researched.add(norm(clean_name(alt)))
                if g.get("registerName"):
                    researched.add(norm(g["registerName"]))
                    t, _ = parse_loc(g.get("city") or "")
                    if t:
                        researched_keys.add(dedupe_key(display_name(g["registerName"], t), t))
                        researched_pairs.append((norm(clean_name(g["registerName"])), norm(t)))
        except Exception:
            pass
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    out: dict[str, dict] = {}
    dropped = {"lost": 0, "filter": 0, "abroad": 0, "gutter": 0, "known": 0, "noloc": 0}
    for r in reg:
        if r["won"].strip().lower() != "da":
            dropped["lost"] += 1
            continue
        name = r["name"].strip()
        mat = r["mat"]
        if DROP_NAME.search(name) and not PRIVATE.search(name):
            dropped["filter"] += 1
            continue
        if ABROAD.search(name + " " + r["loc"]):
            dropped["abroad"] += 1
            continue
        if GUTTER_ONLY.search(mat.strip()) or not metals(mat):
            dropped["gutter"] += 1
            continue
        nn = norm(name)
        if nn in known or nn in researched or norm(clean_name(name)) in researched or rkey(name) in researched_hash or any(k and (k in nn or (len(nn) > 12 and nn in k)) for k in known if len(k) > 12):
            dropped["known"] += 1
            continue
        town, county = parse_loc(r["loc"])
        cn = norm(clean_name(name))
        if cn in TOWN_FROM_NAME:
            town, county = TOWN_FROM_NAME[cn], None
        if not town and re.search(r"(?:din|,)\s*([A-ZĂÂÎȘȚ][\w\-ăâîșț]+)\s*$", name):
            town = re.search(r"(?:din|,)\s*([A-ZĂÂÎȘȚ][\w\-ăâîșț]+)\s*$", name).group(1)
        if town:
            m = re.match(r"^(.*?)\s*\((\w+)\)$", town)  # 'Dumbrava (Timis)'
            if m:
                town = m.group(1).strip()
        if not town or norm(town) in COUNTY_ONLY:
            dropped["noloc"] += 1  # county-only locations cannot be placed honestly
            continue
        if any(cn.startswith(p) and (t is None or norm(town) == t) for p, t in SAME_AS_EXISTING) or any(len(p) >= 12 and cn.startswith(p) and norm(town) == t for p, t in researched_pairs):
            dropped["known"] += 1
            continue
        private = bool(PRIVATE.search(name))
        if private:
            # client decision: private houses without photographs or other information are not shown at all
            dropped["private"] = dropped.get("private", 0) + 1
            continue
        name = clean_name(name)
        disp = "Locuință privată" if private else display_name(name, town)
        yrs = re.findall(r"(20\d\d)", r["offer"] + " " + r["buy"])
        if not private and dedupe_key(disp, town) in researched_keys:
            dropped["known"] += 1
            continue
        key = ("private-" + str(len(out)) + "|" + norm(town)) if private else dedupe_key(disp, town)
        if key in out:
            e = out[key]
            e["metals"] = sorted(set(e["metals"]) | set(metals(mat)))
            e["products"] = sorted(set(e["products"]) | set(products(mat)))
            if yrs:
                e["year"] = max(e.get("year") or "0", max(yrs))
            continue
        out[key] = {
            "name": disp,
            "town": town,
            "countyHint": county,
            "category": category(name + " " + disp),
            "metals": metals(mat),
            "products": products(mat),
            "year": max(yrs) if yrs else None,
            "private": private,
            "registerKey": rkey(name) if not private else None,
            "referenceFlag": r["ref"].strip().upper() in ("DA",),
        }
    print("candidates", len(out), "dropped", dropped)
    entries = []
    for e in out.values():
        g = geocode(cache, e["town"], e["countyHint"])
        if not g:
            print("  no geocode:", e["town"], e["countyHint"], "—", e["name"])
            continue
        osm_town = (g.get("display") or "").split(",")[0].strip()
        if osm_town and norm(osm_town) == norm(e["town"]) and osm_town != e["town"]:
            e["name"] = e["name"].replace(e["town"], osm_town)
            e["town"] = osm_town
        base = slug(e["name"] if not e["private"] else "locuinta-privata") + "-" + slug(e["town"])
        pid = "reg-" + base
        n = 2
        while any(x["id"] == pid for x in entries):
            pid = f"reg-{base}-{n}"
            n += 1
        entries.append({
            "id": pid,
            "name": e["name"],
            "city": e["town"],
            "county": g["county"] or e["countyHint"] or "",
            "lat": g["lat"],
            "lon": g["lon"],
            "category": e["category"],
            "metals": e["metals"],
            "products": e["products"],
            "year": e["year"],
            "private": e["private"],
            "registerKey": e["registerKey"],
            "geocodeSource": f"OpenStreetMap Nominatim: {g['osm']} ({g['display']})",
        })
    OUT.write_text(json.dumps({"_doc": "Generated by scripts/import-register.py from the private register copy — town-level entries, no client data.", "projects": entries}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("written", len(entries), "→", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
