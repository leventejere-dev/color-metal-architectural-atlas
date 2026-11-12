"""
Bake a satellite colour texture for the terrain slab (Romania) and the context table,
in the atlas projection (oblique stereographic 46°N 25°E), from

  EOxCloudless 2016 — https://cloudless.eox.at by EOX IT Services GmbH
  (Contains modified Copernicus Sentinel data 2016), CC BY 4.0
  (the later yearly mosaics are CC BY-NC-SA and are NOT used)

  python scripts/build-satellite.py   → public/geo/satellite.webp (+ satellite-2k.webp), table-sat.webp

Tiles are cached in work/cache/s2 (git-ignored). The slab texture uses exactly the extent
and orientation of shade.webp (north up), so the terrain UVs need no change.
"""
from __future__ import annotations

import concurrent.futures as cf
import io
import json
import math
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
GEO = ROOT / "public/geo"
CACHE = ROOT / "work/cache/s2"
URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"
UA = {"User-Agent": "architectural-atlas-build/1.0"}

meta = json.loads((GEO / "terrain.json").read_text(encoding="utf-8"))
P = meta["projection"]
LAT0, LON0, R, K0 = P["lat0"], P["lon0"], P["R"], P["k0"]
phi0, lam0 = math.radians(LAT0), math.radians(LON0)


def unproject(x, y):
    rho = np.hypot(x, y)
    c = 2 * np.arctan(rho / (2 * R * K0))
    with np.errstate(invalid="ignore", divide="ignore"):
        phi = np.arcsin(np.cos(c) * math.sin(phi0) + np.where(rho > 0, y * np.sin(c) * math.cos(phi0) / rho, 0))
        lam = lam0 + np.arctan2(x * np.sin(c), rho * math.cos(phi0) * np.cos(c) - y * math.sin(phi0) * np.sin(c))
    return np.degrees(phi), np.degrees(lam)


def merc_px(lat, lon, z):
    n = 256 * 2**z
    x = (lon + 180.0) / 360.0 * n
    s = np.sin(np.radians(np.clip(lat, -85, 85)))
    y = (0.5 - np.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


def fetch(z, x, y):
    f = CACHE / str(z) / str(y) / f"{x}.jpg"
    if f.exists() and f.stat().st_size > 0:
        return f
    f.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(5):
        try:
            req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            Image.open(io.BytesIO(data)).verify()
            f.write_bytes(data)
            return f
        except Exception as e:  # noqa: BLE001
            time.sleep(1.5 * (attempt + 1))
            err = e
    print("  tile failed", z, x, y, err)
    return None


def bake(X, Y, z, need, label):
    """X, Y: km grids (east, north). need: bool grid of pixels that must be filled."""
    lat, lon = unproject(X, Y)
    px, py = merc_px(lat, lon, z)
    tx, ty = (px // 256).astype(int), (py // 256).astype(int)
    tiles = sorted(set(zip(tx[need].ravel().tolist(), ty[need].ravel().tolist())))
    print(f"{label}: {len(tiles)} tiles at z{z}")
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(lambda t: fetch(z, t[0], t[1]), tiles))
    xs = [t[0] for t in tiles]
    ys = [t[1] for t in tiles]
    mx0, my0 = min(xs), min(ys)
    W, H = (max(xs) - mx0 + 1) * 256, (max(ys) - my0 + 1) * 256
    mosaic = np.zeros((H, W, 3), np.uint8)
    for (x, y) in tiles:
        f = CACHE / str(z) / str(y) / f"{x}.jpg"
        if f.exists():
            mosaic[(y - my0) * 256:(y - my0 + 1) * 256, (x - mx0) * 256:(x - mx0 + 1) * 256] = np.asarray(Image.open(f).convert("RGB"))
    cy = py - my0 * 256 - 0.5
    cx = px - mx0 * 256 - 0.5
    out = np.stack([ndimage.map_coordinates(mosaic[..., c].astype(np.float32), [cy, cx], order=1, mode="nearest") for c in range(3)], -1)
    return out


def grade(img, lift=1.0, sat=1.0):
    """Gentle grading: S2 cloudless is dark and a little cold for a light exhibition look."""
    v = np.clip(img / 255.0, 0, 1)
    v = v ** 0.86 * 1.06 * lift
    lum = (v * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    v = lum + (v - lum) * sat
    v = v * [1.02, 1.0, 0.97]  # a touch warmer
    return np.clip(v * 255, 0, 255).astype(np.uint8)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ext = meta["extent"]
    x0, x1, z0, z1 = ext["x0"], ext["x1"], ext["z0"], ext["z1"]
    y1, y0 = -z0, -z1  # north / south (Z points south)
    tex = meta["textures"]
    NX, NY = (tex["nx"] - 1) * 2 + 1, (tex["ny"] - 1) * 2 + 1
    xs = np.linspace(x0, x1, NX)
    ys = np.linspace(y1, y0, NY)
    X, Y = np.meshgrid(xs, ys)
    m = np.asarray(Image.open(GEO / tex["mask"]).convert("L").resize((NX, NY), Image.BILINEAR)).astype(np.float32)
    need = m > 96  # inside the border + ≈1.5 km
    sat = bake(X, Y, 10, need, "slab")
    img = grade(sat)
    Image.fromarray(img).save(GEO / "satellite.webp", quality=84, method=6)
    Image.fromarray(img).resize(((NX + 1) // 2, (NY + 1) // 2), Image.LANCZOS).save(GEO / "satellite-2k.webp", quality=82, method=6)
    print("satellite.webp", NX, NY)

    # context table: the neighbouring countries, softer and paler so Romania stands out
    tb = meta["table"]
    TW, TH = tb["w"], tb["h"]
    txs = np.linspace(tb["x0"], tb["x1"], TW)
    tys = np.linspace(-tb["z0"], -tb["z1"], TH)
    TX, TY = np.meshgrid(txs, tys)
    tneed = np.ones_like(TX, dtype=bool)
    tsat = bake(TX, TY, 7, tneed, "table")
    timg = grade(tsat, lift=1.06, sat=0.72).astype(np.float32)
    # fade towards the background at the table edge
    u = np.minimum(np.minimum(np.arange(TW) / TW, 1 - np.arange(TW) / TW)[None, :], np.minimum(np.arange(TH) / TH, 1 - np.arange(TH) / TH)[:, None])
    fade = np.clip(u / 0.12, 0, 1)[..., None]
    bg = np.array([217, 213, 205], np.float32)
    timg = timg * fade + bg * (1 - fade)
    Image.fromarray(np.clip(timg, 0, 255).astype(np.uint8)).save(GEO / "table-sat.webp", quality=80, method=6)
    print("table-sat.webp", TW, TH)
    meta["textures"]["satellite"] = "satellite.webp"
    meta["textures"]["satelliteLow"] = "satellite-2k.webp"
    meta["table"]["satFile"] = "table-sat.webp"
    (GEO / "terrain.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
