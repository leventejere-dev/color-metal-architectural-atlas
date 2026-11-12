"""
Build the self-hosted geographic base of the atlas (run once; outputs are committed).

Inputs (downloaded into work/geo-src, see ASSET_LICENSES.md):
  - Natural Earth 1:10m vectors (public domain)
  - AWS Terrain Tiles / Mapzen "terrarium" elevation tiles, zoom 9

Projection: oblique stereographic on the sphere, origin 46°N 25°E, k0 = 0.99975
(the spherical form of Romania's national Stereo 70 system). Scene units are
kilometres: X = east, Z = south (three.js convention: north = -Z).

Outputs (public/geo):
  terrain.json        grid metadata, projection, exaggeration
  height.bin          Uint16 LE, decimetres above sea level, row 0 = north
  normal.webp         object-space normals (baked with the same exaggeration)
  shade.webp          ivory albedo with cavity shading, lakes
  mask.webp           signed-distance mask of Romania (128 = border)
  table.webp          context table: neighbouring countries, Black Sea
  vectors.json        border ring, county edges, rivers, labels
"""
from __future__ import annotations

import json
import math
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "work" / "geo-src"
OUT = ROOT / "public" / "geo"
OUT.mkdir(parents=True, exist_ok=True)

LAT0, LON0, R, K0 = 46.0, 25.0, 6371.0, 0.99975
EXAG = 5.0  # vertical exaggeration (visualisation choice, documented in the UI)
GRID_KM = 0.75  # mesh / height grid spacing
TEX_KM = 0.375  # normal / shade / mask texel size
DEM_Z = 9

phi0, lam0 = math.radians(LAT0), math.radians(LON0)


def project(lat, lon):
    """Forward oblique stereographic → (x east km, y north km). Works on numpy arrays."""
    phi, lam = np.radians(lat), np.radians(lon)
    dl = lam - lam0
    k = 2 * R * K0 / (1 + math.sin(phi0) * np.sin(phi) + math.cos(phi0) * np.cos(phi) * np.cos(dl))
    x = k * np.cos(phi) * np.sin(dl)
    y = k * (math.cos(phi0) * np.sin(phi) - math.sin(phi0) * np.cos(phi) * np.cos(dl))
    return x, y


def unproject(x, y):
    rho = np.hypot(x, y)
    c = 2 * np.arctan(rho / (2 * R * K0))
    with np.errstate(invalid="ignore", divide="ignore"):
        phi = np.arcsin(np.cos(c) * math.sin(phi0) + np.where(rho > 0, y * np.sin(c) * math.cos(phi0) / rho, 0))
        lam = lam0 + np.arctan2(x * np.sin(c), rho * math.cos(phi0) * np.cos(c) - y * math.sin(phi0) * np.sin(c))
    return np.degrees(phi), np.degrees(lam)


def load(name):
    return json.loads((SRC / "ne" / f"{name}.geojson").read_text(encoding="utf-8"))


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower().replace("-", " ").strip()


def rings_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


# ------------------------------------------------------------------ countries
countries = load("ne_10m_admin_0_countries")["features"]
ro = next(f for f in countries if f["properties"]["ADM0_A3"] == "ROU")
ro_polys = rings_of(ro["geometry"])
outer_rings = [p[0] for p in ro_polys]
allpts = np.array([pt for ring in outer_rings for pt in ring])
px, py = project(allpts[:, 1], allpts[:, 0])
MARGIN = 14.0
x0, x1 = math.floor(px.min() - MARGIN), math.ceil(px.max() + MARGIN)
y0, y1 = math.floor(py.min() - MARGIN), math.ceil(py.max() + MARGIN)
W_KM, H_KM = x1 - x0, y1 - y0
print("extent km", x0, x1, y0, y1, W_KM, H_KM)

# ------------------------------------------------------------------ DEM mosaic
tiles = sorted((SRC / f"dem{DEM_Z}").glob(f"{DEM_Z}_*_*.png"))
xs = sorted({int(t.stem.split("_")[1]) for t in tiles})
ys = sorted({int(t.stem.split("_")[2]) for t in tiles})
tx0, ty0 = xs[0], ys[0]
mosaic = np.zeros((len(ys) * 256, len(xs) * 256), dtype=np.float32)
for t in tiles:
    _, tx, ty = t.stem.split("_")
    a = np.asarray(Image.open(t).convert("RGB"), dtype=np.float32)
    h = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    oy, ox = (int(ty) - ty0) * 256, (int(tx) - tx0) * 256
    mosaic[oy : oy + 256, ox : ox + 256] = h
mosaic = np.maximum(mosaic, 0)  # sea / bathymetry → 0
N = 2**DEM_Z * 256


def sample_dem(lat, lon):
    mx = (lon + 180) / 360 * N - tx0 * 256
    s = np.sin(np.radians(lat))
    my = (0.5 - np.log((1 + s) / (1 - s)) / (4 * math.pi)) * N - ty0 * 256
    return ndimage.map_coordinates(mosaic, [my - 0.5, mx - 0.5], order=1, mode="nearest")


def grid(step):
    nx = int(round(W_KM / step)) + 1
    ny = int(round(H_KM / step)) + 1
    gx = x0 + np.arange(nx) * (W_KM / (nx - 1))
    gy = y1 - np.arange(ny) * (H_KM / (ny - 1))  # row 0 = north
    X, Y = np.meshgrid(gx, gy)
    return nx, ny, X, Y


# height grid (mesh)
nx, ny, GX, GY = grid(GRID_KM)
lat, lon = unproject(GX, GY)
H = sample_dem(lat, lon)
(OUT / "height.bin").write_bytes(np.clip(np.round(H * 10), 0, 65535).astype("<u2").tobytes())
print("height grid", nx, ny, "max m", float(H.max()))

# texture grid (normals, shading, mask)
tnx, tny, TX, TY = grid(TEX_KM)
tlat, tlon = unproject(TX, TY)
HT = sample_dem(tlat, tlon)
HT = ndimage.gaussian_filter(HT, 0.6)
dx = W_KM / (tnx - 1)
dy = H_KM / (tny - 1)
hz = HT / 1000.0 * EXAG  # km, exaggerated
gy_, gx_ = np.gradient(hz, dy, dx)  # gy_ = d/d(row) where row increases southwards
# object space: X east, Y up, Z south. dh/dX = gx_, dh/dZ = gy_ (rows go south)
nX, nY, nZ = -gx_, np.ones_like(hz), -gy_
ln = np.sqrt(nX**2 + nY**2 + nZ**2)
nrm = np.stack([nX / ln, nY / ln, nZ / ln], -1)
Image.fromarray(np.round((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save(OUT / "normal.webp", quality=92, method=6)

# ------------------------------------------------------------------ mask (SDF)
mask_img = Image.new("L", (tnx, tny), 0)
md = ImageDraw.Draw(mask_img)


def to_tex(lonlat):
    a = np.asarray(lonlat)
    x, y = project(a[:, 1], a[:, 0])
    return np.stack([(x - x0) / dx, (y1 - y) / dy], -1)


for poly in ro_polys:
    md.polygon([tuple(p) for p in to_tex(poly[0])], fill=255)
    for hole in poly[1:]:
        md.polygon([tuple(p) for p in to_tex(hole)], fill=0)
inside = np.asarray(mask_img) > 127
d_in = ndimage.distance_transform_edt(inside)
d_out = ndimage.distance_transform_edt(~inside)
sdf = np.where(inside, d_in - 0.5, -(d_out - 0.5))
Image.fromarray(np.clip(128 + sdf * 8, 0, 255).astype(np.uint8)).save(OUT / "mask.webp", lossless=True)

# ------------------------------------------------------------------ albedo / cavity shade
blur = ndimage.gaussian_filter(HT, 6)
cav = np.clip((blur - HT) / 140.0, -1, 1)  # >0 valley, <0 ridge
broad = ndimage.gaussian_filter(HT, 30)
cav2 = np.clip((broad - HT) / 400.0, -1, 1)
base = np.array([238, 233, 222], dtype=np.float32)  # warm ivory
alt = np.clip(HT / 2400.0, 0, 1)[..., None]
col = base * (1 - 0.035 * (1 - alt)) + np.array([3, 3, 4]) * alt  # lowlands faintly warmer
col = col * (1 - 0.16 * np.clip(cav, 0, 1)[..., None] - 0.08 * np.clip(cav2, 0, 1)[..., None]) + 8 * np.clip(-cav, 0, 1)[..., None]
shade = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
sd = ImageDraw.Draw(shade)
lake_col = (198, 210, 214)
for name in ("ne_10m_lakes", "ne_10m_lakes_europe"):
    for f in load(name)["features"]:
        for poly in rings_of(f["geometry"]):
            ring = np.asarray(poly[0])
            if not ((ring[:, 0] > 19.5) & (ring[:, 0] < 30.5) & (ring[:, 1] > 43) & (ring[:, 1] < 48.6)).any():
                continue
            sd.polygon([tuple(p) for p in to_tex(poly[0])], fill=lake_col)
shade.save(OUT / "shade.webp", quality=90)

# ------------------------------------------------------------------ table (context)
TB = {"x0": x0 - 900, "x1": x1 + 900, "y0": y0 - 900, "y1": y1 + 900}
TW = TB["x1"] - TB["x0"]
TH = TB["y1"] - TB["y0"]
TS = 3072
tscale = TS / max(TW, TH)
tw, th = int(TW * tscale), int(TH * tscale)
table = Image.new("RGB", (tw, th), (203, 207, 208))  # sea / outside
tdraw = ImageDraw.Draw(table)


def to_table(lonlat):
    a = np.asarray(lonlat)
    x, y = project(a[:, 1], a[:, 0])
    return [((xx - TB["x0"]) * tscale, (TB["y1"] - yy) * tscale) for xx, yy in zip(x, y)]


near = []
for f in countries:
    for poly in rings_of(f["geometry"]):
        ring = np.asarray(poly[0])
        if ((ring[:, 0] > 5) & (ring[:, 0] < 46) & (ring[:, 1] > 34) & (ring[:, 1] < 58)).any():
            tdraw.polygon(to_table(poly[0]), fill=(214, 210, 201))
            near.append(f["properties"]["ADM0_A3"])
for f in countries:
    for poly in rings_of(f["geometry"]):
        ring = np.asarray(poly[0])
        if ((ring[:, 0] > 5) & (ring[:, 0] < 46) & (ring[:, 1] > 34) & (ring[:, 1] < 58)).any():
            tdraw.line(to_table(poly[0]), fill=(192, 187, 177), width=2)
table = table.filter(ImageFilter.GaussianBlur(0.6))
# fade the table edges into the background colour (no hard rim at national scale)
ta = np.asarray(table, dtype=np.float32)
yy, xx = np.mgrid[0:th, 0:tw]
edge = np.minimum.reduce([xx / tw, (tw - xx) / tw, yy / th, (th - yy) / th])
f = np.clip(edge / 0.16, 0, 1)[..., None] ** 1.5
bgc = np.array([217, 213, 205], dtype=np.float32)
table = Image.fromarray((ta * f + bgc * (1 - f)).astype(np.uint8))
table.save(OUT / "table.webp", quality=88)

# ------------------------------------------------------------------ vectors
def proj_list(coords, nd=2):
    a = np.asarray(coords)
    x, y = project(a[:, 1], a[:, 0])
    return [[round(float(xx), nd), round(float(-yy), nd)] for xx, yy in zip(x, y)]  # [X, Z]


def densify(pts, step=1.0):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        d = math.dist(a, b)
        n = max(1, int(d / step))
        for i in range(1, n + 1):
            out.append([round(a[0] + (b[0] - a[0]) * i / n, 3), round(a[1] + (b[1] - a[1]) * i / n, 3)])
    return out


border = [densify(proj_list(r), 0.8) for r in outer_rings if len(r) > 20]

# counties: shared edges once, national border edges dropped
adm1 = [f for f in load("ne_10m_admin_1_states_provinces")["features"] if f["properties"].get("adm0_a3") == "ROU"]
edge_count: dict = {}
for f in adm1:
    for poly in rings_of(f["geometry"]):
        ring = poly[0]
        for a, b in zip(ring, ring[1:]):
            k = tuple(sorted((tuple(round(v, 6) for v in a), tuple(round(v, 6) for v in b))))
            edge_count[k] = edge_count.get(k, 0) + 1
inner = [k for k, c in edge_count.items() if c >= 2]
# chain edges into polylines
adj: dict = {}
for a, b in inner:
    adj.setdefault(a, []).append(b)
    adj.setdefault(b, []).append(a)
used = set()
lines = []
for a, b in inner:
    if (a, b) in used:
        continue
    line = [a, b]
    used.add((a, b)); used.add((b, a))
    for direction in (0, 1):
        while True:
            end = line[-1] if direction == 0 else line[0]
            nxt = [n for n in adj[end] if (end, n) not in used]
            if len(adj[end]) != 2 or not nxt:
                break
            n = nxt[0]
            used.add((end, n)); used.add((n, end))
            if direction == 0:
                line.append(n)
            else:
                line.insert(0, n)
    lines.append(proj_list([list(p) for p in line]))
print("county edge lines", len(lines))

# county labels at the pole of inaccessibility (raster)
counties = []
for f in adm1:
    p = f["properties"]
    im = Image.new("L", (tnx // 2, tny // 2), 0)
    dr = ImageDraw.Draw(im)
    for poly in rings_of(f["geometry"]):
        dr.polygon([(q[0] / 2, q[1] / 2) for q in to_tex(poly[0])], fill=255)
    dt = ndimage.distance_transform_edt(np.asarray(im) > 0)
    iy, ix = np.unravel_index(np.argmax(dt), dt.shape)
    X = x0 + ix * 2 * dx
    Z = -(y1 - iy * 2 * dy)
    counties.append({"name": p.get("name"), "nameHu": p.get("name_hu"), "nameEn": p.get("name_en"), "x": round(float(X), 2), "z": round(float(Z), 2), "area": int((np.asarray(im) > 0).sum())})

# rivers: keep segments inside / on Romania (mask test), major names only
inside_t = inside
def inside_pt(X, Z, tol=3):
    c = int(round((X - x0) / dx)); r = int(round((y1 + Z) / dy))
    if r < 0 or c < 0 or r >= tny or c >= tnx:
        return False
    return sdf[r, c] > -tol


rivers = []
seen = set()
for name in ("ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"):
    for f in load(name)["features"]:
        p = f["properties"]
        g = f["geometry"]
        if not g:
            continue
        parts = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        for part in parts:
            a = np.asarray(part)
            if not ((a[:, 0] > 20) & (a[:, 0] < 30) & (a[:, 1] > 43.5) & (a[:, 1] < 48.4)).any():
                continue
            pts = proj_list(part)
            run = []
            for q in pts:
                if inside_pt(q[0], q[1]):
                    run.append(q)
                else:
                    if len(run) > 1:
                        key = (round(run[0][0], 1), round(run[0][1], 1), len(run))
                        if key not in seen:
                            seen.add(key)
                            rivers.append({"name": p.get("name") or p.get("name_en"), "rank": p.get("scalerank", 9), "pts": densify(run, 1.2)})
                    run = []
            if len(run) > 1:
                key = (round(run[0][0], 1), round(run[0][1], 1), len(run))
                if key not in seen:
                    seen.add(key)
                    rivers.append({"name": p.get("name") or p.get("name_en"), "rank": p.get("scalerank", 9), "pts": densify(run, 1.2)})
print("river runs", len(rivers))

# cities (curated list; coordinates from Natural Earth populated places)
CITIES = [
    ("București", "Bukarest", 1), ("Cluj-Napoca", "Kolozsvár", 2), ("Timișoara", "Temesvár", 2), ("Iași", "Jászvásár", 2),
    ("Constanța", "Konstanca", 2), ("Craiova", "Craiova", 2), ("Brașov", "Brassó", 2), ("Galați", "Galac", 3),
    ("Ploiești", "Ploiești", 3), ("Oradea", "Nagyvárad", 2), ("Brăila", "Brăila", 3), ("Arad", "Arad", 3),
    ("Pitești", "Pitești", 3), ("Sibiu", "Nagyszeben", 2), ("Bacău", "Bákó", 3), ("Târgu Mureș", "Marosvásárhely", 2),
    ("Baia Mare", "Nagybánya", 3), ("Buzău", "Bodza", 4), ("Satu Mare", "Szatmárnémeti", 3), ("Suceava", "Szucsáva", 3),
    ("Piatra Neamț", "Karácsonkő", 4), ("Alba Iulia", "Gyulafehérvár", 3), ("Deva", "Déva", 4), ("Sfântu Gheorghe", "Sepsiszentgyörgy", 3),
    ("Miercurea Ciuc", "Csíkszereda", 3), ("Odorheiu Secuiesc", "Székelyudvarhely", 4), ("Bistrița", "Beszterce", 4), ("Zalău", "Zilah", 4),
    ("Reșița", "Resicabánya", 4), ("Drobeta-Turnu Severin", "Szörényvár", 4), ("Târgu Jiu", "Zsilvásárhely", 4), ("Râmnicu Vâlcea", "Râmnicu Vâlcea", 4),
    ("Tulcea", "Tulcea", 4), ("Focșani", "Foksány", 4), ("Botoșani", "Botoșani", 4), ("Târgoviște", "Târgoviște", 4),
    ("Vaslui", "Vaslui", 5), ("Slatina", "Szlatina", 5), ("Giurgiu", "Gyurgyevó", 5), ("Călărași", "Călărași", 5),
    ("Slobozia", "Slobozia", 5), ("Alexandria", "Alexandria", 5), ("Blaj", "Balázsfalva", 5), ("Carei", "Nagykároly", 5),
]
places = load("ne_10m_populated_places")["features"]
# Natural Earth spellings (incl. its typos) for the curated names
NE_ALIAS = {"București": "Bucharest", "Târgu Mureș": "Tirgu Mures", "Alba Iulia": "Alba Lulia", "Sfântu Gheorghe": "Sfintu-Gheorghe",
            "Miercurea Ciuc": "Miercurea Cuic", "Râmnicu Vâlcea": "Rimnicu Vilcea", "Piatra Neamț": "Piatra-Neamt"}
# not in Natural Earth: OpenStreetMap place nodes / admin centroids (ODbL), looked up 2026-11-12
OSM_CITY = {"Odorheiu Secuiesc": (46.3047462, 25.2950261, "osm relation 10748530"), "Blaj": (46.1741571, 23.9224826, "osm relation 10631057"),
            "Carei": (47.6829338, 22.4695102, "osm node 128555565")}
cities = []
for ro_name, hu, pr in CITIES:
    if ro_name in OSM_CITY:
        la_, lo_, srcid = OSM_CITY[ro_name]
        X, Y = project(np.array([la_]), np.array([lo_]))
        cities.append({"name": ro_name, "nameHu": hu, "prio": pr, "lat": la_, "lon": lo_, "x": round(float(X[0]), 2), "z": round(float(-Y[0]), 2), "src": srcid})
        continue
    n = norm(NE_ALIAS.get(ro_name, ro_name))
    cand = [f for f in places if f["properties"].get("ADM0NAME") == "Romania" and norm(f["properties"].get("NAME", "")) in (n, n.replace(" ", "-"))]
    if not cand:
        cand = [f for f in places if f["properties"].get("ADM0NAME") == "Romania" and norm(f["properties"].get("NAMEASCII", "")).replace("-", " ") == n]
    if not cand:
        print("  city not found in NE:", ro_name)
        continue
    lon_, lat_ = cand[0]["geometry"]["coordinates"]
    X, Y = project(np.array([lat_]), np.array([lon_]))
    cities.append({"name": ro_name, "nameHu": hu, "prio": pr, "lat": round(lat_, 5), "lon": round(lon_, 5), "x": round(float(X[0]), 2), "z": round(float(-Y[0]), 2)})

# geographic region labels (descriptive placement of regional names)
REGIONS = [
    ("Carpații Orientali", "Keleti-Kárpátok", "Eastern Carpathians", 47.0, 25.65),
    ("Carpații Meridionali", "Déli-Kárpátok", "Southern Carpathians", 45.45, 24.2),
    ("Munții Apuseni", "Erdélyi-szigethegység", "Apuseni Mountains", 46.55, 22.75),
    ("Podișul Transilvaniei", "Erdélyi-medence", "Transylvanian Plateau", 46.55, 24.3),
    ("Câmpia Română", "Román-alföld", "Romanian Plain", 44.35, 25.6),
    ("Podișul Moldovei", "Moldvai-fennsík", "Moldavian Plateau", 47.0, 27.2),
    ("Dobrogea", "Dobrudzsa", "Dobruja", 44.4, 28.35),
    ("Delta Dunării", "Duna-delta", "Danube Delta", 45.15, 29.25),
    ("Câmpia de Vest", "Nyugati-alföld", "Western Plain", 46.15, 21.2),
]
regions = []
for ro_name, hu, en, la, lo in REGIONS:
    X, Y = project(np.array([la]), np.array([lo]))
    regions.append({"name": ro_name, "nameHu": hu, "nameEn": en, "x": round(float(X[0]), 2), "z": round(float(-Y[0]), 2)})

NEIGH = [("Ungaria", "Magyarország", "Hungary", 47.1, 20.4), ("Ucraina", "Ukrajna", "Ukraine", 48.55, 25.0), ("Republica Moldova", "Moldova", "Moldova", 47.2, 28.7),
         ("Bulgaria", "Bulgária", "Bulgaria", 43.35, 25.4), ("Serbia", "Szerbia", "Serbia", 44.6, 20.75), ("Marea Neagră", "Fekete-tenger", "Black Sea", 44.0, 30.4)]
neighbours = []
for ro_name, hu, en, la, lo in NEIGH:
    X, Y = project(np.array([la]), np.array([lo]))
    neighbours.append({"name": ro_name, "nameHu": hu, "nameEn": en, "x": round(float(X[0]), 2), "z": round(float(-Y[0]), 2)})

vectors = {"border": border, "counties": lines, "countyLabels": counties, "rivers": rivers, "cities": cities, "regions": regions, "neighbours": neighbours}
(OUT / "vectors.json").write_text(json.dumps(vectors, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

meta = {
    "projection": {"type": "oblique-stereographic", "lat0": LAT0, "lon0": LON0, "R": R, "k0": K0, "units": "km", "axes": "X east, Z south"},
    "extent": {"x0": x0, "x1": x1, "z0": -y1, "z1": -y0},
    "grid": {"nx": nx, "ny": ny, "spacingKm": W_KM / (nx - 1), "file": "height.bin", "encoding": "uint16 LE decimetres, row 0 = north (z0)"},
    "textures": {"nx": tnx, "ny": tny, "normal": "normal.webp", "shade": "shade.webp", "mask": "mask.webp", "maskScale": 8},
    "table": {"x0": TB["x0"], "x1": TB["x1"], "z0": -TB["y1"], "z1": -TB["y0"], "w": tw, "h": th, "file": "table.webp"},
    "exaggeration": EXAG,
    "maxElevationM": round(float(H.max())),
    "sources": ["Natural Earth 1:10m (public domain)", "AWS Terrain Tiles (Mapzen terrarium), zoom 9 — see ASSET_LICENSES.md"],
}
(OUT / "terrain.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
for f in sorted(OUT.iterdir()):
    print(f"{f.stat().st_size/1e6:7.2f} MB  {f.name}")
