"""Crop the rendered model views (work/thumbs-raw/<id>.png) to the building and save
240 px WebP thumbnails in public/thumbs/<id>.webp (used by the project list and card)."""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "work/thumbs-raw"
OUT = ROOT / "public/thumbs"
OUT.mkdir(parents=True, exist_ok=True)
n = 0
for f in sorted(RAW.glob("*.png")):
    im = np.asarray(Image.open(f).convert("RGB")).astype(np.int16)
    h, w, _ = im.shape
    # background varies by row (sky / ground gradient): estimate it from the left/right edges
    edge = np.concatenate([im[:, :6], im[:, -6:]], axis=1)
    bg = np.median(edge, axis=1)[:, None, :]
    diff = np.abs(im - bg).max(axis=2)
    mask = diff > 22
    mask[:40] = False  # label strip
    ys, xs = np.nonzero(mask)
    if len(xs) < 50:
        continue
    x0, x1 = np.percentile(xs, [0.3, 99.7])
    y0, y1 = np.percentile(ys, [0.3, 99.7])
    mx, my = (x1 - x0) * 0.07 + 6, (y1 - y0) * 0.07 + 6
    l, r = int(max(0, x0 - mx)), int(min(w, x1 + mx))
    t, b = int(max(0, y0 - my)), int(min(h, y1 + my))
    src = Image.open(f).convert("RGB")
    crop = src.crop((l, t, r, b))
    side = max(crop.width, crop.height)
    corner = tuple(int(v) for v in np.median(np.concatenate([im[:8, :8].reshape(-1, 3), im[:8, -8:].reshape(-1, 3)]), axis=0))
    sq = Image.new("RGB", (side, side), corner)
    sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    sq.resize((240, 240), Image.LANCZOS).save(OUT / f"{f.stem}.webp", quality=82, method=6)
    n += 1
print("thumbs", n)
