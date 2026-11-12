"""
Public copies of the geolocation research batches.

The research agents write data/geo/batch-*.json with the internal register's
names, material lines (thicknesses, quantities) and free-text notes. Those raw
files are kept privately in work/private/geo (git-ignored); data/geo keeps the
public version:

  - registerName / altRegisterNames  → registerKeys (one-way hash of the
    normalised name, used only to match register rows when importing)
  - registerMaterial                → registerMetals + registerProducts
    (product families only, as everywhere in the atlas)
  - registerYear                    → dropped
  - verificationNotes / heightHints → sentences mentioning the register,
    clients, contractors/builders, prices or metal quantities are dropped

  python scripts/sanitize-geo.py                 # every batch whose raw copy exists or that is still raw
  python scripts/sanitize-geo.py batch-h batch-i # only these
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "data/geo"
PRIV = ROOT / "work/private/geo"

_spec = importlib.util.spec_from_file_location("import_register", ROOT / "scripts/import-register.py")
IR = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(IR)  # type: ignore[union-attr]

RAW_FIELDS = ("registerName", "altRegisterNames", "registerMaterial", "registerYear")
SENSITIVE = re.compile(
    r"regist|client|beneficiar|contractor|constructor|builder|antrepren|executant|installer|instalator|roofer|subcontract|supplier|furniz|"
    r"price|pre[tț]|\bcost|\blei\b|\beuro|€|\bron\b|\bkg\b|tonn?e|\b\d[\d.,]*\s*t\b|invoice|factur|ofert|offer\b|quantit|cantit|"
    r"color[- ]?metal|delivery|livrar|ordered|comand|\bS\.?\s?R\.?\s?L\b|\bS\.\s?C\.|\bS\.?A\.\s|investor|permit|"
    r"\b\d[.,]\d+\s*x\s*\d+",
    re.I,
)
METAL_QTY = re.compile(r"\d[\d.,]*\s*(m²|m2|sqm|mp)\b.{0,40}(copper|cupru|zinc|ti-?zn|titan|alumin|prefa|tecu|elzinc|sheet|tabl|strip|band)|"
                       r"(copper|cupru|zinc|ti-?zn|titan|alumin|prefa|tecu|elzinc).{0,40}\d[\d.,]*\s*(m²|m2|sqm|mp)\b", re.I)


def key(name: str) -> str:
    return IR.rkey(name)


def clean_text(s: str | None) -> str | None:
    if not s:
        return s
    parts = re.split(r"(?<=[.;!?])\s+", s)
    keep = [p for p in parts if not SENSITIVE.search(p) and not METAL_QTY.search(p)]
    out = " ".join(keep).strip()
    return out or None


def sanitize(rec: dict) -> dict:
    r = {k: v for k, v in rec.items() if k not in RAW_FIELDS}
    # OSM tags may carry contact data (phone, e-mail, fax) — not needed for the atlas
    osm = r.get("osm")
    if isinstance(osm, dict) and isinstance(osm.get("tags"), dict):
        r["osm"] = {**osm, "tags": {k: v for k, v in osm["tags"].items()
                                    if not re.search(r"phone|mobile|fax|email", k, re.I) and not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", str(v))}}
    names = [rec.get("registerName")] + list(rec.get("altRegisterNames") or [])
    keys = [key(n) for n in names if n]
    if keys:
        r["registerKeys"] = keys
    mat = rec.get("registerMaterial") or ""
    if mat:
        r["registerMetals"] = IR.metals(mat)
        r["registerProducts"] = IR.products(mat)
    for f in ("verificationNotes", "heightHints", "metalVisibleInPhotos"):
        if f in r:
            r[f] = clean_text(r[f])
    return r


def is_raw(recs: list) -> bool:
    return any(any(f in x for f in RAW_FIELDS) or "registerKeys" not in x and x.get("verificationNotes") and SENSITIVE.search(x["verificationNotes"]) for x in recs)


def main(names: list[str]):
    PRIV.mkdir(parents=True, exist_ok=True)
    files = [PUB / f"{n}.json" for n in names] if names else sorted(PUB.glob("batch-*.json"))
    for f in files:
        recs = json.loads(f.read_text(encoding="utf-8"))
        raw_path = PRIV / f.name
        if is_raw(recs):
            raw_path.write_text(json.dumps(recs, ensure_ascii=False, indent=1), encoding="utf-8")
        if not raw_path.exists():
            print("  skip (no raw copy):", f.name)
            continue
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        pub = [sanitize(x) for x in raw]
        f.write_text(json.dumps(pub, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  {f.name}: {len(pub)} records sanitised")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:])
