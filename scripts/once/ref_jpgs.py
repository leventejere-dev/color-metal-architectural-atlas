"""Make JPEG viewing copies (1400 px) + a contact sheet per project for modelling: work/ref/<id>/NN.jpg, work/ref/<id>/_sheet.jpg"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
root = Path('work/photos')
out = Path('work/ref')
for d in sorted(p for p in root.iterdir() if p.is_dir()):
    o = out / d.name
    o.mkdir(parents=True, exist_ok=True)
    ims = []
    for f in sorted(d.glob('*.webp')):
        im = Image.open(f).convert('RGB')
        im.thumbnail((1400, 1400))
        im.save(o / (f.stem + '.jpg'), quality=86)
        t = im.copy(); t.thumbnail((520, 390)); ims.append((f.stem, t))
    if ims:
        cols = 3
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 520, rows * 404), 'white')
        dr = ImageDraw.Draw(sheet)
        for i, (n, t) in enumerate(ims):
            x, y = (i % cols) * 520, (i // cols) * 404
            sheet.paste(t, (x + (520 - t.width) // 2, y))
            dr.text((x + 4, y + 390), n, fill='black')
        sheet.save(o / '_sheet.jpg', quality=80)
    print(d.name, len(ims))
