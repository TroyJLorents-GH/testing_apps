"""Build every product image the film shows, from real UseKnockout output, using the production code paths.

- assets/cutout.png      real /remove output from useknockout.com's examples (input, not regenerated)
- assets/studio-shot.png the /studio-shot compositing step from useknockout/api main.py, run on that cutout
- assets/shoe.psd        the /psd encoder (_encode_psd) from main.py, run on that cutout
- assets/layout.json     geometry the animation needs (subject bbox, studio paste position, PSD layers)

Run: python3 -I tools/make_assets.py   (needs pillow, numpy, psd-tools>=1.11)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "assets"

original = Image.open(A / "original.jpg").convert("RGB")
cutout = Image.open(A / "cutout.png").convert("RGBA")
if original.size != cutout.size:
    sys.exit(f"cutout {cutout.size} does not match original {original.size}")

# 1. Alignment: the cutout must be the same pixels in the same place as the original.
o = np.asarray(original).astype(np.int16)
c = np.asarray(cutout).astype(np.int16)
solid = c[..., 3] > 250
diff = np.abs(o[solid] - c[..., :3][solid]).mean()
print(f"alignment: mean RGB diff inside subject = {diff:.2f} over {solid.sum()} px")
if diff > 6:
    sys.exit("cutout is not pixel-aligned with the original")


# 2. /studio-shot, copied from main.py (_bounding_box, canvas math, _composite_shadow).
def bounding_box(mask, threshold=10):
    arr = np.asarray(mask.convert("L"))
    rows, cols = np.any(arr > threshold, axis=1), np.any(arr > threshold, axis=0)
    top, bottom = int(np.argmax(rows)), int(len(rows) - np.argmax(rows[::-1]))
    left, right = int(np.argmax(cols)), int(len(cols) - np.argmax(cols[::-1]))
    return left, top, right, bottom


def composite_shadow(cutout_rgba, mask, bg, offset=(8, 12), blur=14, opacity=0.45, shadow_color=(0, 0, 0)):
    w, h = bg.size
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_mask = mask.convert("L").filter(ImageFilter.GaussianBlur(radius=blur))
    a = int(round(opacity * 255))
    shadow_full = Image.merge("RGBA", (*Image.new("RGB", (w, h), shadow_color).split(), shadow_mask.point(lambda p: min(p, a))))
    shadow_layer.alpha_composite(shadow_full, dest=offset)
    out = bg.convert("RGBA")
    out.alpha_composite(shadow_layer)
    out.alpha_composite(cutout_rgba)
    return out.convert("RGB")


# Endpoint defaults: bg_color=#FFFFFF, aspect=1:1, padding=48, shadow=True.
aw, ah, pad = 1, 1, 48
mask = cutout.getchannel("A")
left, top, right, bottom = bounding_box(mask)
sw, sh = right - left, bottom - top
base_w, base_h = sw + pad * 2, sh + pad * 2
tw = max(base_w, int(round(base_h * aw / ah)))
th = max(base_h, int(round(tw * ah / aw)))
if round(tw * ah / aw) != th:
    tw = int(round(th * aw / ah))
bg = Image.new("RGB", (tw, th), (255, 255, 255))
px, py = (tw - sw) // 2, (th - sh) // 2
full_mask = Image.new("L", (tw, th), 0)
full_mask.paste(mask.crop((left, top, right, bottom)), (px, py))
full_cut = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
full_cut.paste(cutout.crop((left, top, right, bottom)), (px, py))
studio = composite_shadow(full_cut, full_mask, bg, offset=(8, 12), blur=14, opacity=0.35)
studio.save(A / "studio-shot.png")
# Shadow alone, for animating it in under the moving cutout (same parameters).
sh_layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
blurred = full_mask.filter(ImageFilter.GaussianBlur(radius=14)).point(lambda p: min(p, int(round(0.35 * 255))))
sh_layer.alpha_composite(Image.merge("RGBA", (*Image.new("RGB", (tw, th), (0, 0, 0)).split(), blurred)), dest=(8, 12))
sh_layer.save(A / "studio-shadow.png")
print(f"studio-shot: {tw}x{th}, subject bbox {left},{top},{right},{bottom}, pasted at {px},{py}")

# 3. /psd encoder, copied from main.py _encode_psd, then re-opened and inspected.
psd = PSDImage.new(mode="RGB", size=cutout.size, depth=8)
psd.create_pixel_layer(cutout, name="Cutout", top=0, left=0, opacity=255)
psd.save(A / "shoe.psd")
check = PSDImage.open(A / "shoe.psd")
layers = [{"name": l.name, "kind": l.kind, "bbox": list(l.bbox), "visible": l.visible, "opacity": l.opacity} for l in check]
print(f"psd: {check.width}x{check.height}, {len(layers)} layer(s): {layers}")

json.dump({
    "image": list(cutout.size),
    "subject": [left, top, right, bottom],
    "studio": {"size": [tw, th], "paste": [px, py], "bg": "#FFFFFF", "padding": pad, "shadow": {"offset": [8, 12], "blur": 14, "opacity": 0.35}},
    "psd": {"size": [check.width, check.height], "layers": layers},
}, open(A / "layout.json", "w"), indent=2)
