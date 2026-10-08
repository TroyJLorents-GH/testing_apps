"""Brand prep: trim the logo and put fictional account details on the real Design Studio capture.

Run: python3 -I tools/prep_brand.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent

# Logo: trim the white margin so it can be placed precisely.
logo = Image.open(ROOT / "brand/logo-primary.png").convert("RGB")
ink = np.asarray(logo).min(axis=2) < 235
ys, xs = np.where(ink)
pad = 6
trim = np.asarray(logo.crop((xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad))).astype(np.float32) / 255
# White -> alpha with colour unmultiply (GIMP "colour to alpha"), so the logo sits on any ground.
alpha = (1 - trim).max(axis=2, keepdims=True)
rgb = np.where(alpha > 0, (trim - (1 - alpha)) / np.maximum(alpha, 1e-6), 0)
rgba = np.concatenate([np.clip(rgb, 0, 1), alpha], axis=2)
Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA").save(ROOT / "brand/logo-trim.png")

# Design Studio capture: the toolbar shows a real key prefix. Replace it with a fictional workspace.
# Source: useknockout/landing-page public/assets/canvas/effects.png (not kept in this repo; only the patched copy is).
src = ROOT / "screens/effects.png"
if not src.exists():
    print("logo-trim.png written; screens/design-studio.png kept (copy effects.png into screens/ to re-patch)")
    raise SystemExit(0)
cap = Image.open(src).convert("RGB")
d = ImageDraw.Draw(cap)
font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
# Workspace selector box spans roughly x 1230-1405, y 8-37 at native size.
d.rectangle((1234, 11, 1384, 34), fill=(255, 255, 255))
d.text((1240, 14), "Workspace · Demo Shop", fill=(17, 24, 39), font=font)
cap.save(ROOT / "screens/design-studio.png")
print("logo-trim.png and design-studio.png written")
