"""Convert Moody Mochi ad images to small WebP files the prototype can import.

Usage: python3 -I scripts/prep_ads.py <folder with .jpg/.png>
Writes src/assets/ads/<slot>.webp, where <slot> is the prefix before the first
underscore (r01_hero.jpg -> r01.webp). The app picks images up by slot, so new
files with the agreed prefixes appear without code changes.
"""
import sys, pathlib
from PIL import Image

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parent.parent / 'src/assets/ads'
out.mkdir(parents=True, exist_ok=True)
for f in sorted(src.iterdir()):
    if f.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
        continue
    slot = f.stem.split('_')[0].lower()
    im = Image.open(f).convert('RGB')
    im.thumbnail((720, 960))
    im.save(out / f'{slot}.webp', 'WEBP', quality=78, method=6)
    print(slot, im.size, (out / f'{slot}.webp').stat().st_size // 1024, 'KB')
