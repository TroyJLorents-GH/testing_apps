# Sources

Every product claim, label and image in the film, and where it comes from. All of these were checked against code at useknockout/landing-page `38adcdf` and useknockout/api `eb7c37e`.

| On screen | Source |
|---|---|
| Original photo | landing-page `public/assets/examples/eval-shoe-before.jpg` (1024×1024) |
| Cutout | landing-page `public/assets/examples/eval-shoe-after.png`, a real /remove output, pixel-aligned with the original (mean diff 0.51/255) |
| Studio shot | api `main.py` /studio-shot defaults (`bg_color=#FFFFFF`, `aspect=1:1`, `padding=48`, `shadow=True`) and `_composite_shadow(offset=(8,12), blur=14, opacity=0.35)`, replicated in `tools/make_assets.py` |
| PSD: "1 layer", "Cutout", "transparent pixel layer", "1024 × 1024" | api `main.py` `_encode_psd`: `PSDImage.new(mode="RGB")` + one `create_pixel_layer(name="Cutout")`. Replica re-opened with psd-tools 1.24.0; see `assets/layout.json` -> `psd.layers` |
| "Remove Background" | landing-page `lib/workspace/tools.ts` (id `remove`, label) |
| "Studio Shot" | `lib/workspace/tools.ts` (id `studio-shot`, label) |
| "Photoshop File" | `lib/workspace/tools.ts` (id `psd`, label) |
| "Design Studio" at /workspace | `components/TopNav.tsx` (`{ label: "Design Studio", href: "/workspace" }`), `components/workspace/TopBar.tsx` |
| (cut) Design Studio capture | landing-page `public/assets/canvas/effects.png`, patched copy kept in `screens/`; not shown in the film |
| Logo | landing-page `public/logo-primary.png`, trimmed |
| Brand green #57C985, Inter, JetBrains Mono | the brief; landing-page `app/globals.css` (Inter, JetBrains Mono) |

There are no numbers on screen other than the PSD's pixel size and layer count, which both come from the file.
