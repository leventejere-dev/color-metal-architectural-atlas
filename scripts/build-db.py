"""
Build the public project database (src/data/projects.json) and the generated
status reports from the curated inputs:

  data/sources/project-sources.json   archive folders → unique buildings
  data/geo/*.json                     geolocation research (evidence, OSM outline)
  data/curation/projects.json         verified material data (register / company texts)
  data/curation/texts.json            company post texts (RO, sometimes EN)
  data/models/<id>.json               model sidecars (tier, status, notes, bearing)
  work/photos/<id>/manifest.json      exported photos (inventory.py)

Only projects with status == "public", a geolocation that is not UNRESOLVED
are published. Everything else is listed in the generated sections of
GEOLOCATION_REPORT.md / MODELING_PROGRESS.md.

Usage: python scripts/build-db.py
"""
from __future__ import annotations

import datetime as dt
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TODAY = dt.date.today().isoformat()

APPLICATION = {
    "roof": {"ro": "Învelitoare (acoperiș)", "hu": "Tetőfedés", "en": "Roofing"},
    "facade": {"ro": "Placare de fațadă", "hu": "Homlokzatburkolat", "en": "Façade cladding"},
    "tower": {"ro": "Învelitoarea turnului", "hu": "Toronyfedés", "en": "Tower roofing"},
    "entrance": {"ro": "Placarea intrării", "hu": "Bejárat burkolata", "en": "Entrance cladding"},
}
METAL = {
    "copper": {"ro": "cupru", "hu": "réz", "en": "copper"},
    "titanium-zinc": {"ro": "titan-zinc", "hu": "titáncink", "en": "titanium-zinc"},
    "aluminium": {"ro": "aluminiu", "hu": "alumínium", "en": "aluminium"},
    "brass": {"ro": "alamă", "hu": "sárgaréz", "en": "brass"},
}


def contribution(cur: dict) -> dict | None:
    src = cur.get("contributionSource")
    metals = cur.get("metals", [])
    prods = cur.get("products", [])
    if not src or not metals:
        return None
    m = {l: " / ".join(METAL[x][l] for x in metals) for l in ("ro", "hu", "en")}
    p = ", ".join(prods)
    if src == "booklet":
        return {
            "ro": f"Proiect prezentat în broșura de referințe COLOR METAL ({m['ro']}).",
            "hu": f"Szerepel a COLOR METAL referenciafüzetében ({m['hu']}).",
            "en": f"Featured in COLOR METAL's reference booklet ({m['en']}).",
        }
    if p:
        return {
            "ro": f"COLOR METAL a furnizat materialul: {p} ({m['ro']}).",
            "hu": f"A COLOR METAL szállította az anyagot: {p} ({m['hu']}).",
            "en": f"COLOR METAL supplied the material: {p} ({m['en']}).",
        }
    return {
        "ro": f"COLOR METAL a furnizat {m['ro']}.",
        "hu": f"A COLOR METAL {m['hu']} anyagot szállított.",
        "en": f"COLOR METAL supplied {m['en']}.",
    }


def _register_parsers():
    """metals()/products() keyword parsers shared with scripts/import-register.py"""
    import importlib.util
    spec = importlib.util.spec_from_file_location("import_register", ROOT / "scripts" / "import-register.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.metals, mod.products


def local_footprint(fp, lat0, lon0):
    if not fp:
        return None
    k = math.cos(math.radians(lat0))
    return [[round((lon - lon0) * 111320 * k, 2), round((lat - lat0) * 110574, 2)] for lat, lon in fp]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    src = json.loads((ROOT / "data/sources/project-sources.json").read_text(encoding="utf-8"))
    cur_all = json.loads((ROOT / "data/curation/projects.json").read_text(encoding="utf-8"))["projects"]
    texts = json.loads((ROOT / "data/curation/texts.json").read_text(encoding="utf-8"))["texts"]
    geo: dict[str, dict] = {}
    for f in sorted((ROOT / "data/geo").glob("batch-*.json")):
        try:
            for g in json.loads(f.read_text(encoding="utf-8")):
                geo[g["id"]] = g
        except Exception as e:  # partially written research file
            print("  geo file unreadable:", f.name, e)
    overrides = {}
    ov = ROOT / "data/geo/overrides.json"
    if ov.exists():
        overrides = json.loads(ov.read_text(encoding="utf-8")).get("overrides", {})

    models_dir = ROOT / "data/models"
    published, held = [], []
    parse_metals, parse_products = _register_parsers()

    # ---- buildings researched from the total register (data/geo batch d–g), not in the photo archive ----
    known_ids = {p["id"] for p in src["projects"]}
    for gid, g in list(geo.items()):
        if gid in known_ids or not (g.get("registerKeys") or g.get("registerName")):
            continue
        if overrides.get(gid, {}).get("exclude"):
            continue  # not a building / not executed in metal (see overrides.json); its register row stays off the map too
        mat = g.get("registerMaterial") or ""
        if g.get("identificationConfidence") == "UNRESOLVED" and g.get("city") and g.get("lat") is not None:
            # the building could not be singled out, but the town is certain (register) → town level, like other register entries
            g["geographicAccuracy"] = "locality"
            g["identificationConfidence"] = "PROBABLE"
            g["verificationNotes"] = "Building not individually identified — shown at town level. " + (g.get("verificationNotes") or "")
            g["footprint"] = None
            g["footprintDims"] = None
        src["projects"].append({
            "id": gid, "name": g.get("officialName") or gid, "nameEn": None, "city": g.get("city", ""), "county": g.get("county", ""),
            "country": g.get("country") or "Romania", "category": g.get("category") or "historic", "status": "public", "rights": "third-party",
            "folders": [], "files": [], "register": list(g.get("registerKeys") or []), "nameHuVerified": True,
        })
        cur_all.setdefault(gid, {"metals": g.get("registerMetals") or parse_metals(mat), "products": g.get("registerProducts") or parse_products(mat), "contributionSource": "register"})
        known_ids.add(gid)

    # ---- town-level entries imported from the total register ----
    regp = ROOT / "data/sources/register-projects.json"
    reg_entries = json.loads(regp.read_text(encoding="utf-8"))["projects"] if regp.exists() else []
    researched_keys = {k for g in geo.values() for k in (g.get("registerKeys") or [])}
    for e in reg_entries:
        if e["id"] in known_ids or e.get("registerKey") in researched_keys:
            continue
        src["projects"].append({
            "id": e["id"], "name": e["name"], "city": e["city"], "county": e["county"], "country": "Romania",
            "category": e["category"], "status": "public", "rights": "none", "folders": [], "files": [], "register": [],
            "fromRegister": True,
        })
        geo[e["id"]] = {
            "lat": e["lat"], "lon": e["lon"], "geographicAccuracy": "locality", "identificationConfidence": "PROBABLE",
            "sourceUrls": [], "verificationNotes": "Town from the COLOR METAL project register; the building itself is not individually identified. " + e.get("geocodeSource", ""),
        }
        cur_all.setdefault(e["id"], {"metals": e["metals"], "products": e["products"], "contributionSource": "register"})
        known_ids.add(e["id"])
    for pr in src["projects"]:
        pid = pr["id"]
        cur = cur_all.get(pid, {})
        g = {**geo.get(pid, {}), **overrides.get(pid, {})}
        side_path = models_dir / f"{pid}.json"
        side = json.loads(side_path.read_text(encoding="utf-8")) if side_path.exists() else {}
        module = None
        if pr.get("model", "").startswith("exhibition:"):
            module = pr["model"]
        elif (ROOT / "src/models/buildings" / f"{pid}.ts").exists():
            module = pid
        conf = g.get("identificationConfidence", "UNRESOLVED")
        reason = None
        if pr["status"] != "public":
            reason = f"status {pr['status']}"
        elif not g:
            reason = "awaiting geolocation research"
        elif conf == "UNRESOLVED" or g.get("lat") is None:
            reason = "location unresolved"
        manifest = ROOT / "work/photos" / pid / "manifest.json"
        photos = []
        archived = 0
        if manifest.exists():
            archived = len(json.loads(manifest.read_text(encoding="utf-8")))
            for ph in json.loads(manifest.read_text(encoding="utf-8")):
                if ph.get("public") and (ROOT / "public/photos" / pid / f"{ph['file']}.webp").exists():
                    photos.append({"file": ph["file"], "w": ph["w"], "h": ph["h"], "kind": ph["kind"]})
        # client decision (12 Nov 2026): a project with no photograph at all (neither company photos
        # nor public reference photos used for its model) is not shown on the map
        webref_dir = ROOT / "work/web-ref" / pid
        webref = len([f for f in webref_dir.glob("*.jpg") if re.fullmatch(r"\d+", f.stem)]) if webref_dir.exists() else 0
        # (the four exhibition-table models were built from the exhibition project's own photographs)
        if reason is None and archived == 0 and webref == 0 and not (module or "").startswith("exhibition:"):
            reason = "no photograph (client decision: not shown without any photo)"
        # client decision (12 Nov 2026): the map shows architectural models only — no placeholder markers
        if reason is None and not module:
            reason = "no 3D model yet (client decision: only modelled buildings are shown)"
        # the cover must be one of the published photos (a sidecar may name an archive frame that is not public)
        cover = side.get("cover") if any(ph["file"] == side.get("cover") for ph in photos) else (photos[0]["file"] if photos else None)
        if cover and photos:
            photos.sort(key=lambda p: p["file"] != cover)
        tier = side.get("tier") or cur.get("tier") or ("B" if module else "D")
        status = side.get("status") or cur.get("status") or ("preview" if module else "none")
        if not module:
            tier, status = "D", "none"
        bearing = side.get("bearingDeg", cur.get("bearingDeg", (g.get("footprintDims") or {}).get("bearingDeg", 0)))
        thumb = f"thumbs/{pid}.webp" if (ROOT / "public/thumbs" / f"{pid}.webp").exists() else None
        rec = {
            "id": pid,
            "name": pr["name"],
            "nameHu": g.get("nameHu") or (pr.get("nameHu") if pr.get("nameHuVerified") else None),
            "nameEn": pr.get("nameEn"),  # descriptive English name for the EN interface (official name always shown too)
            "city": pr.get("city") or g.get("city", ""),
            "cityHu": pr.get("cityHu"),
            "county": pr.get("county") or g.get("county", ""),
            "country": pr.get("country") or g.get("country") or "Romania",
            "lat": g.get("lat"),
            "lon": g.get("lon"),
            "geographicAccuracy": g.get("geographicAccuracy", "locality"),
            "identificationConfidence": conf,
            "bearingDeg": round(float(bearing or 0), 1),
            "bearingSource": side.get("bearingSource") or ("OSM outline long axis" if g.get("footprintDims") else None),
            "category": pr["category"],
            "metals": cur.get("metals", []),
            "products": cur.get("products", []),
            "application": APPLICATION.get(cur.get("application")) if cur.get("application") else None,
            "contribution": contribution(cur),
            "description": texts.get(pid),
            "photos": photos,
            "photoStatus": "published" if photos else ("reference" if webref or pr.get("rights") == "third-party" else ("unapproved" if archived else "none")),
            "cover": cover,
            "thumb": thumb,
            "model": {"tier": tier, "status": status, **({"module": module} if module else {}), **({"note": side["note"]} if side.get("note") else {})},
            "sourceUrls": g.get("sourceUrls", []),
            "footprint": local_footprint(g.get("footprint"), g["lat"], g["lon"]) if g.get("footprint") and g.get("lat") else None,
            "lastUpdated": TODAY,
        }
        rec = {k: v for k, v in rec.items() if v is not None}
        (held if reason else published).append((rec, reason, pr, g, side))

    db = {"generated": TODAY, "projects": [r for r, *_ in published]}
    (ROOT / "src/data/projects.json").write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"published {len(published)} projects, held back {len(held)}")
    for r, why, *_ in held:
        print("   held:", r["id"], "—", why)

    # ---------------- generated report sections ----------------
    rows = []
    for r, why, pr, g, side in published + held:
        rows.append(
            f"| `{r['id']}` | {r['name']} | {r.get('city','')} | {r.get('county','')} | "
            f"{(str(r['lat'])+', '+str(r['lon'])) if r.get('lat') is not None else '—'} | {r.get('geographicAccuracy','—')} | "
            f"{r.get('identificationConfidence','—')} | {'published' if not why else 'held: '+why} |"
        )
    geo_table = "\n".join(["| id | name | town | county | lat, lon | accuracy | confidence | map |", "|---|---|---|---|---|---|---|---|", *rows])
    write_section(ROOT / "GEOLOCATION_REPORT.md", "GENERATED-TABLE", geo_table)

    mrows = []
    for r, why, pr, g, side in published + held:
        m = r["model"]
        mrows.append(f"| `{r['id']}` | {r['name']} | {m['tier']} | {m['status']} | {m.get('module','—')} | {len(r.get('photos', []))} | {side.get('photosUsed', '—') if side else '—'} |")
    model_table = "\n".join(["| id | name | tier | status | module | public photos | photos analysed |", "|---|---|---|---|---|---|---|", *mrows])
    write_section(ROOT / "MODELING_PROGRESS.md", "GENERATED-TABLE", model_table)
    n_models = sum(1 for r, *_ in published if r["model"].get("module"))
    print(f"models available: {n_models}")

    # ---------------- progress tracker inside PROJECT_INVENTORY.json ----------------
    inv_path = ROOT / "PROJECT_INVENTORY.json"
    if inv_path.exists():
        inv = json.loads(inv_path.read_text(encoding="utf-8"))
        by_id = {r["id"]: (r, why, side) for r, why, pr, g, side in published + held}
        for rec in inv.get("projects", []):
            r, why, side = by_id.get(rec["id"], (None, "unknown", {}))
            if not r:
                continue
            m = r["model"]
            rec["progress"] = {
                "discovered": True,
                "photographsAnalysed": bool(side.get("photosUsed")) if side else False,
                "identified": r.get("identificationConfidence") in ("VERIFIED", "PROBABLE"),
                "coordinatesVerified": r.get("identificationConfidence") == "VERIFIED" and r.get("geographicAccuracy") in ("building", "site"),
                "metadataComplete": bool(r.get("metals")) and bool(r.get("contribution")),
                "mapMarker": not why,
                "modelStatus": m["status"],
                "modelTier": m["tier"],
                "modelComplete": bool(m.get("module")) and m["status"] in ("existing-verified", "detailed", "preview", "reference-limited"),
                "integrated": bool(m.get("module")) and not why,
                "published": not why,
                "heldBackReason": why,
            }
        allp = [x.get("progress", {}) for x in inv.get("projects", [])]
        inv["progressTotals"] = {
            "topLevelFolders": inv.get("totals", {}).get("topLevelFolders"),
            "uniqueProjects": len(allp),
            "duplicateFoldersConsolidated": sum(len(x.get("duplicateFolders", [])) for x in inv.get("projects", [])) + sum(1 for x in inv.get("projects", []) if x.get("mergeNote")),
            "verifiedCoordinates": sum(1 for x in allp if x.get("coordinatesVerified")),
            "awaitingGeolocationConfirmation": sum(1 for x in allp if not x.get("coordinatesVerified")),
            "completedModels": sum(1 for x in allp if x.get("modelComplete")),
            "modelsInDevelopment": sum(1 for x in allp if x.get("modelStatus") == "in-development"),
            "modelsNeedingMorePhotos": sum(1 for x in allp if x.get("modelTier") == "C" or x.get("modelStatus") == "pending-photos"),
            "publishedProjects": sum(1 for x in allp if x.get("published")),
        }
        inv_path.write_text(json.dumps(inv, ensure_ascii=False, indent=1), encoding="utf-8")
        print("progress:", inv["progressTotals"])


def write_section(path: Path, tag: str, body: str):
    start, end = f"<!-- {tag}:START -->", f"<!-- {tag}:END -->"
    text = path.read_text(encoding="utf-8") if path.exists() else f"{start}\n{end}\n"
    if start not in text:
        text += f"\n{start}\n{end}\n"
    a = text.index(start) + len(start)
    b = text.index(end)
    path.write_text(text[:a] + "\n" + body + "\n" + text[b:], encoding="utf-8")


if __name__ == "__main__":
    main()
