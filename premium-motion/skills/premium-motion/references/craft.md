# Craft defaults

These are starting values. Override any of them when the concept needs it, and log the reason in `DECISIONS.md`.

## Visual system
- Turn `./brand` into tokens before drawing anything: type scale, palette, spacing grid, radii, surfaces, borders, shadows, light, depth, grain, easing.
- Default palette: a warm neutral ground, one accent, and ink in two weights. Neon, monochrome, expressive color, organic forms and 3D are all legitimate when the concept justifies them.
- Prefer real UI, real data and clean diagrams over illustration.
- **Depth:** build each scene from 3-5 layers: ground, content plane, focal element, UI chrome, overlay.
- **Shadows:** layer them. One tight contact shadow (1-2 px blur, 8-12% opacity) plus one wide ambient shadow (40-60 px blur, -12 px spread, 15-25%). Tint both from the ground color, never pure black.
- **Light:** one light direction for the whole piece. Allow one slow light sweep across a surface, on the key reveal only.
- **Texture:** 1.5-4% seeded film grain over the whole frame (a fixed noise tile, offset per frame). It hides gradient banding and keeps flat color from looking digital.
- **Surfaces:** product UI sits in accurate device or window frames with correct radii and a 1 px inner border at 6-8% opacity.

### Avoid by default
These are the clichés that make AI-made motion look generic. Use one only when the concept really demands it, and log why.
Gradient title cards, decorative particle blankets, stock 3D blobs, glow on everything, lens flares, glitch transitions, a constant slow zoom, text-card slideshows, a whoosh on every move, fake dashboards and metrics, and transitions unrelated to the content.

### Effects vocabulary
Pick a small, compatible set per piece. Do not demonstrate every effect.
Typographic choreography, editorial layouts, vector masks, shape morphs, match cuts, depth-aware parallax, motivated camera moves, physically plausible glass and materials, controlled reflections, volumetric light (only with a real light source in frame), purposeful simulation, tactile texture, data-driven motion, and selective grain or lens treatment. When complexity rises, keep the focal hierarchy clean.

## Typography
- Use variable fonts. Animate the weight or optical-size axis only for meaningful emphasis.
- Use `font-variant-numeric: tabular-nums` for every changing number so digits do not jitter.
- Reveal text by line or word behind a mask (GSAP SplitText with `mask: "lines"`): 8-14 px rise or 100-110% of line height, 40-60 ms stagger, expo.out over 600-700 ms.
- On-screen copy: at most 2 lines and 8 words per line. Hold each line for at least 0.4 s + 0.3 s per word.
- Hang punctuation and optically align round glyphs. Check at 100% zoom.
- Text that holds still sits on whole pixels at its final scale. Never scale rasterized text up; set the font size instead.
- Kinetic type should express the meaning of the words (weight for stress, spacing for tension), not decorate them.

## Motion
- Motion carries meaning: it shows grouping, order, cause, scale or state change.
- One focal action at a time; everything else holds or moves secondarily.
- Keep objects alive across scenes and transform them instead of replacing them (GSAP Flip for shared elements: position, size and radius in one move).
- **Easing tokens:**
  - enter: `expo.out` / `cubic-bezier(0.16, 1, 0.3, 1)`, 500-700 ms
  - exit: about 70% of the enter duration, `power2.in`
  - move: `power3.inOut`, or a critically damped spring solved in closed form (deterministic)
  - emphasis: a 2-4% scale lift and release
  - overshoot: allowed only when the concept is playful; default is none
- **Overlap:** the next action starts 80-150 ms before the previous one settles. Never stack dead stops.
- **Stagger:** 30-60 ms for lists. Use slightly irregular (seeded) or asymmetric stagger for organic groups.
- **Anticipation and follow-through:** a 2-4% counter-move before large moves; secondary elements arrive 1-2 frames late.
- **Stillness is a tool.** Hold on the key frame long enough for it to be understood.
- Diagrams: MorphSVG for shape changes, DrawSVG for strokes, MotionPath for anything that travels.

## Camera
- A virtual camera with position, zoom and focus, applied to a stage wrapper.
- Push-ins of 3-8% per beat. One deep zoom into UI detail per act.
- **Focus pull:** non-focal layers get a 2-6 px blur and about -8% brightness when attention moves.
- **Parallax:** layers move at 1.0 / 0.85 / 0.7 of camera motion.
- Ease camera acceleration in and out. A constant-speed camera reads as robotic.
- The camera never moves while a line is being read.

## Product UI demos
- Rebuild interactions in HTML from real screenshots and real UI states instead of screen recordings. They stay sharp at 4K and can be retimed.
- Use real product versions and plausible sample data, and remove private information.
- Label editorial time compression. Never imply a simulated interaction proves a feature works.
- **Cursor:** a macOS-style cursor that follows eased bezier arcs and slows into targets. On click it scales to 0.88-0.9 for 80 ms, the target shows its hover state, and a small ripple plays.
- **Follow zoom:** the camera follows the cursor into the region being changed, then pulls back (Screen Studio style).
- **Typing:** per-character timing with seeded human variance; the caret blinks at 530 ms.

## Transitions
- Allowed: match cuts on shape or position, shared-element morphs, masks that follow a real edge, a camera push through a surface, and hard cuts on the beat.
- Each transition carries meaning from one idea into the next. A transition with nothing to carry is a cut.

## Craft pass checklist (step 7)
- [ ] Motion blur on every fast move (render `--blur 8-16`); none on stills
- [ ] No dead stops; actions overlap by 80-150 ms
- [ ] Anticipation on large moves; secondary elements trail by 1-2 frames
- [ ] One focal action per moment; the focus pull follows attention
- [ ] Parallax on camera moves; the camera is still while text is read
- [ ] Layered, tinted shadows; one light direction
- [ ] Grain applied; no gradient banding visible at 100%
- [ ] Tabular numbers; text on whole pixels at rest; no scaled raster text
- [ ] Cursor arcs, click feedback and follow-zoom on UI shots
- [ ] Safe areas respected in every ratio; recomposed, not cropped
- [ ] Opening frame and final frame work as stills (poster, thumbnail)
- [ ] The signature sequence gets the most polish time
