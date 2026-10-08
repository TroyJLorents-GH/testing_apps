# Capabilities (checked 2026-10-08, cloud container)

| Need | Available | Used |
|---|---|---|
| Render HTML to frames | Playwright 1.56.1 + Chromium 1194, headless, CPU only (4 cores, no GPU) | yes, `render.mjs` |
| Encode / QA | ffmpeg 6.1.1 with libx264, libx265, prores_ks, zscale, ebur128 | yes |
| Fonts | Inter, JetBrains Mono via @fontsource (pinned) | yes |
| GSAP | 3.13.0 from npm (CDNs blocked by network policy) | yes |
| UseKnockout API / site | **blocked** by network policy (useknockout.com, useknockout--api.modal.run) | no; production code run locally instead |
| PSD tooling | psd-tools 1.24.0 (PyPI) | yes, encoder replica + inspection |
| Voice (ElevenLabs connector) | connected, spends credits | no (needs approval) |
| Blender / 3D | not installed | not needed |
