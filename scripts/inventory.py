"""
COLOR METAL Architectural Atlas — archive inventory & photo pipeline.

Reads the reference archive (read-only), the curated project map
(data/sources/project-sources.json) and the internal register (xlsx), then:

  1. indexes every file of the archive (cached in work/archive-index.tsv),
  2. assigns photos to unique projects, detects exact duplicates
     (same name + size) and near-duplicates (perceptual dHash),
  3. lists archive folders with photos that are not mapped to any project
     (new folders to review -> import workflow),
  4. exports optimised photos:
        work/photos/<id>/NN.webp          (1800 px, every rights class; modelling reference, git-ignored)
        public/photos/<id>/NN.webp + NN-t.webp   (only rights == "published")
  5. writes PROJECT_INVENTORY.json (public, no business data) and
     work/private/register-extract.json (git-ignored, raw register rows).

Usage:
  python scripts/inventory.py [--rescan] [--skip-photos] [--only id1,id2] [--max 12]

Original files are never modified, moved or renamed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "data" / "sources" / "project-sources.json"
WORK = ROOT / "work"
INDEX = WORK / "archive-index.tsv"
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".jfif"}
SKIP_EXT = {".db", ".tmp"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def scan_archive(root: Path) -> list[tuple[int, str]]:
    out = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            p = Path(dirpath) / f
            try:
                size = p.stat().st_size
            except OSError:
                continue
            out.append((size, p.relative_to(root).as_posix()))
    return out


def load_index(root: Path, rescan: bool) -> list[tuple[int, str]]:
    WORK.mkdir(exist_ok=True)
    if INDEX.exists() and not rescan:
        rows = []
        for line in INDEX.read_text(encoding="utf-8").splitlines():
            s, p = line.split("\t", 1)
            rows.append((int(s), p))
        return rows
    print("scanning archive (slow on network drives)...", flush=True)
    rows = scan_archive(root)
    INDEX.write_text("\n".join(f"{s}\t{p}" for s, p in rows), encoding="utf-8")
    return rows


def read_register(path: Path) -> list[dict]:
    try:
        import openpyxl
    except ImportError:
        print("openpyxl missing — register skipped")
        return []
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or "").strip() for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not r or not r[1]:
            continue
        rec = {head[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(r) if i < len(head) and head[i]}
        out.append(rec)
    return out


def dhash(img, size: int = 8) -> int:
    g = img.convert("L").resize((size + 1, size), 1)
    px = list(g.getdata())
    bits = 0
    for y in range(size):
        for x in range(size):
            bits = (bits << 1) | (px[y * (size + 1) + x] > px[y * (size + 1) + x + 1])
    return bits


def ham(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rescan", action="store_true")
    ap.add_argument("--skip-photos", action="store_true")
    ap.add_argument("--only", default="")
    ap.add_argument("--max", type=int, default=12)
    args = ap.parse_args()

    src = json.loads(SOURCES.read_text(encoding="utf-8"))
    archive = Path(src["archiveRoot"])
    rows = load_index(archive, args.rescan)
    files = {p: s for s, p in rows}
    images = [(s, p) for s, p in rows if Path(p).suffix.lower() in IMG_EXT]

    # ---------- exact duplicate groups (name + size) ----------
    groups: dict[tuple[str, int], list[str]] = defaultdict(list)
    for s, p in images:
        groups[(Path(p).name.lower(), s)].append(p)
    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}

    # ---------- register ----------
    reg_path = archive / src["register"]
    register = read_register(reg_path) if reg_path.exists() else []
    reg_by_name = {norm(r.get("Denumire proiect", "")): r for r in register}

    projects = src["projects"]
    only = set(filter(None, args.only.split(",")))

    covered_prefixes: list[str] = []
    for pr in projects:
        covered_prefixes += pr.get("folders", []) + pr.get("duplicates", [])
    for ex in src.get("excluded", []):
        covered_prefixes.append(ex["folder"])

    def under(p: str, prefix: str) -> bool:
        return p == prefix or p.startswith(prefix.rstrip("/") + "/")

    # ---------- unmapped folders (import workflow) ----------
    mapped_files = {f for pr in projects for f in pr.get("files", [])}
    unmapped = defaultdict(int)
    for _s, p in images:
        if p in mapped_files or any(under(p, pre) for pre in covered_prefixes):
            continue
        folder = str(Path(p).parent.as_posix())
        # collections of loose single files are reported per folder
        unmapped[folder] += 1

    # ---------- per-project assembly ----------
    from PIL import Image, ImageOps  # noqa: E402

    Image.MAX_IMAGE_PIXELS = None
    inv_projects = []
    private_register = {}
    for pr in projects:
        pid = pr["id"]
        cands: list[str] = []
        for pre in pr.get("folders", []):
            in_folder = sorted(p for _s, p in images if under(p, pre))
            cands += in_folder
        cands += [f for f in pr.get("files", []) if f in files]
        # supplementary material outside the archive (e.g. photos supplied in an earlier project),
        # paths relative to the atlas repository; never published unless rights == "published"
        for extra in pr.get("extraFolders", []):
            for f in sorted((ROOT / extra).glob("*")):
                if f.suffix.lower() in IMG_EXT:
                    key = "@" + f.relative_to(ROOT).as_posix()
                    files[key] = f.stat().st_size
                    cands.append(key)
        # exact dedup within the project
        seen, uniq, exact_dupes = set(), [], 0
        for p in cands:
            key = (Path(p).name.lower(), files[p])
            if key in seen:
                exact_dupes += 1
                continue
            seen.add(key)
            uniq.append(p)
        # publishable sources first, so modelling-only material never takes the photo slots
        _np = pr.get("notPublic", [])
        uniq.sort(key=lambda p: any(__import__("fnmatch").fnmatch(p, pat) for pat in _np))
        dup_copies = 0
        for p in uniq:
            dup_copies += len(groups[(Path(p).name.lower(), files[p])]) - 1

        reg = None
        for name in pr.get("register", []):
            reg = reg_by_name.get(norm(name)) or reg
        if reg:
            private_register[pid] = reg

        rec = {
            "id": pid,
            "name": pr["name"],
            "status": pr["status"],
            "rights": pr["rights"],
            "sourceFolders": pr.get("folders", []),
            "sourceFiles": pr.get("files", []),
            "duplicateFolders": pr.get("duplicates", []),
            "mergeNote": pr.get("mergedFolders"),
            "photosFound": len(cands),
            "photosUnique": len(uniq),
            "exactDuplicatesInSelection": exact_dupes,
            "archiveCopiesOfSelectedPhotos": dup_copies,
            # only whether the internal register has the project; business columns stay private
            "register": {"matched": bool(reg)},
            "note": pr.get("note"),
            "photos": [],
        }

        if not args.skip_photos and (not only or pid in only) and uniq:
            out_work = WORK / "photos" / pid
            out_pub = ROOT / "public" / "photos" / pid
            out_work.mkdir(parents=True, exist_ok=True)
            hashes: list[int] = []
            n = 0
            for p in uniq:
                if n >= args.max:
                    break
                try:
                    im = Image.open(ROOT / p[1:] if p.startswith("@") else archive / p)
                    im.draft("RGB", (3600, 3600))
                    im = ImageOps.exif_transpose(im).convert("RGB")
                except Exception as e:  # unreadable / unsupported
                    print("  skip", p, e)
                    continue
                if min(im.size) < 240:
                    continue
                h = dhash(im)
                if any(ham(h, o) <= 6 for o in hashes):
                    continue  # near-duplicate of an already selected frame
                hashes.append(h)
                n += 1
                name = f"{n:02d}"
                big = im.copy()
                big.thumbnail((1800, 1800), Image.LANCZOS)
                big.save(out_work / f"{name}.webp", quality=82, method=5)
                entry = {
                    "file": name,
                    "w": big.width,
                    "h": big.height,
                    "source": p,
                    "kind": "drone" if Path(p).name.upper().startswith("DJI_") else "photo",
                    "dhash": f"{h:016x}",
                    # 'notPublic': glob patterns of sources that stay modelling-only (e.g. web-gallery screenshots)
                    "public": pr["rights"] == "published" and pr["status"] == "public"
                    and not any(__import__("fnmatch").fnmatch(p, pat) for pat in pr.get("notPublic", [])),
                }
                if entry["public"]:
                    out_pub.mkdir(parents=True, exist_ok=True)
                    pub = im.copy()
                    pub.thumbnail((1600, 1600), Image.LANCZOS)
                    pub.save(out_pub / f"{name}.webp", quality=80, method=5)
                    th = im.copy()
                    th.thumbnail((480, 480), Image.LANCZOS)
                    th.save(out_pub / f"{name}-t.webp", quality=74, method=5)
                rec["photos"].append(entry)
            print(f"{pid}: {n} photos ({len(uniq)} unique candidates)", flush=True)
            (out_work / "manifest.json").write_text(json.dumps(rec["photos"], ensure_ascii=False, indent=1), encoding="utf-8")
        elif args.skip_photos or (only and pid not in only):
            mf = WORK / "photos" / pid / "manifest.json"
            if mf.exists():
                rec["photos"] = json.loads(mf.read_text(encoding="utf-8"))
        inv_projects.append(rec)

    # ---------- cross-project near-duplicate check ----------
    cross = []
    allh = [(r["id"], ph["file"], int(ph["dhash"], 16)) for r in inv_projects for ph in r["photos"]]
    for i in range(len(allh)):
        for j in range(i + 1, len(allh)):
            if allh[i][0] != allh[j][0] and ham(allh[i][2], allh[j][2]) <= 5:
                cross.append({"a": f"{allh[i][0]}/{allh[i][1]}", "b": f"{allh[j][0]}/{allh[j][1]}", "distance": ham(allh[i][2], allh[j][2])})

    top_folders = sorted({p.split("/")[0] for _s, p in rows if "/" in p})
    inventory = {
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "archiveRoot": src["archiveRoot"],
        "totals": {
            "archiveFiles": len(rows),
            "archiveImages": len(images),
            "topLevelFolders": len(top_folders),
            "exactDuplicateImageGroups": len(dup_groups),
            "redundantImageCopies": sum(len(v) - 1 for v in dup_groups.values()),
            "uniqueProjects": len(projects),
            "publicProjects": sum(1 for p in projects if p["status"] == "public"),
            "pendingProjects": sum(1 for p in projects if p["status"] == "pending"),
            "registerRows": len(register),
            "registerMatched": len(private_register),
        },
        "projects": inv_projects,
        "crossProjectSimilarPhotos": cross,
        "excludedFolders": src.get("excluded", []),
        "unmappedFolders": [{"folder": k, "images": v} for k, v in sorted(unmapped.items())],
    }
    (ROOT / "PROJECT_INVENTORY.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=1), encoding="utf-8")
    priv = WORK / "private"
    priv.mkdir(parents=True, exist_ok=True)
    (priv / "register-extract.json").write_text(json.dumps(private_register, ensure_ascii=False, indent=1), encoding="utf-8")
    (priv / "register-all.json").write_text(json.dumps(register, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(inventory["totals"], indent=1))
    print("unmapped folders:", len(inventory["unmappedFolders"]))
    for u in inventory["unmappedFolders"]:
        print("   ", u["images"], u["folder"])
    print("cross-project similar photos:", len(cross))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
