# Mladá vlna redesign: where things stand

Working notes for whoever continues this redesign. Last updated 15 November 2026 (performance and loading pass).

## What this is

A redesign of mladavlna.github.io, the site of Mladá vlna, a Slovak civic association that runs Erasmus+ youth exchanges. The old site (Bootstrap 3 template) is untouched in the repository root. All new work is in `redesign/`, on the branch `redesign`. It is plain HTML, CSS and JavaScript with no build step; three.js loads from a CDN.

## The approved direction

`redesign/home2.html` is the page to keep building. The owner said of it: "we are finally on a good path".

- **Hero:** a scroll-driven 3D scene of a misty Slovak spruce forest full of litter, with a snow-capped mountain behind. Scrolling walks the visitor down a trail and the litter ahead lifts away, leaving the forest clean.
- **People:** five realistic volunteers walk to real litter pieces, crouch, pick them up with grabber sticks and carry rubbish bags.
- **The walk ends inside a tree:** the last fifth of the scroll turns you to a big spruce beside the end of the trail and walks you into its trunk, with a slight push in; the screen goes dark, and the dark carries on below the hero (`.hero-exit`) and lightens into the first section.
- **Volunteers wear hi-vis vests** (mostly yellow, one orange) with two reflective bands, **and dark work gloves.**
- **Style:** green and blue palette, heavy sans-serif headline (Bricolage Grotesque), pill menu, rounded cards, pale green content sections (about, projects, photo strip, how to join, questions, contact).

`redesign/index.html` is an older, rejected first homepage. Leave it unless asked.

## Files

| File | What it does |
|---|---|
| `home2.html`, `css/home2.css`, `js/home2.js` | The page, its styles, and the SK/EN switch, phone menu and scroll reveals |
| `js/hero-forest.js` | The forest scene: sky, mountain, ground, trees, plants, light, litter, scroll walk, quality control |
| `js/forest-volunteers.js` | Realistic rigged characters and their walk, idle and crouch behaviour (loads glTF with GLTFLoader + MeshoptDecoder) |
| `js/forest-people.js` | Simple hand-built figures, used only as a fallback if the character files fail to load |
| `models/*.glb` | Five Microsoft Rocketbox characters (MIT licence, text included) as meshopt-compressed glTF, mesh and skeleton only, 150–220 KB each |
| `models/anims.glb` | All motion in one file: idle, crouch down, stand up, female walk, male walk (bone rotations and hip position only) |
| `models/*.webp` | Character textures, 512 px WebP (body, head, and hair with alpha) |
| `img/hero-poster*.avif/.jpg` | Still of the opening view, shown before the 3D is ready and instead of it for visitors who get no 3D |
| `img/grain.png`, `img/litter.jpg`, `img/city.jpg` | Film grain tile; the last two are used only by the old `index.html` |

## Running it

Module scripts need a web server. From the repository root:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123/redesign/home2.html`.

Test switches on that address:

- `?debug` exposes `window.__forest` (litter pieces, people, scene, renderer, per-frame timings, and a `view` hook to move the camera).
- `?cold` makes every drawing program look new, to imitate a first-ever visit.
- `?tier=low`, `?tier=medium`, `?tier=high` force a quality tier (otherwise it is picked from the graphics chip, memory, cores and screen width). `window.__forest.tier` and `.gpu` show what was picked.
- `?ratio=1` pins the drawing resolution and turns off dynamic resolution (for screenshots).
- `?seed=N` makes the random layout of the forest repeat exactly, so two versions can be compared picture by picture. `?people=N` sets how many volunteers load (0 to 5). `?pbr` puts back the physically based material on bark, needles, plants, moss and stone (for comparing with the cheaper default).
- With `?debug`, `window.__forest.time = 12.5` freezes the wind and mist at that moment.
- With `?debug`, setting `window.__forest.snap = true` makes the camera jump to the scroll position at once (no easing), for screenshots along the walk and the dive.
- `?still` shows the poster only, as visitors with reduced motion, data saver or a 2G connection see it.
- With `?debug`, `window.__forest.ms` also reports `ratio` (current resolution), `locked` (true when held at a steady 30 fps), `frame` (smoothed ms per frame) and `refresh` (the screen's pace).

## How the hero stays light

- **Tiers** (top of `hero-forest.js`, `TIERS`): high = everything; medium (Intel, Apple, Mali/Adreno, ≤4 GB or ≤4 cores) = slightly fewer trees, plants and litter, resolution up to 1.25; low (old Intel HD/UHD 5xx–6xx, weak phone chips, software rendering, ≤2 GB) = fewer of everything, no people, no antialiasing, held at 30 fps. Phones narrower than 800 px keep the smaller counts they always had.
- **Dynamic resolution** replaces the old one-off quality steps: the pixel ratio moves between 0.6 and the tier's maximum in small steps, with a ceiling that drops if a step up didn't hold. If even a reduced picture can't keep up, it locks to a steady 30 fps.
- **Geometry:** spruces more than 13 m from the walk are about 300 triangles each (were about 1,900); those closer, and the last tree, use a finer shape (about 900) and are grouped in 12 m slices so slices behind you or outside the shadow area are skipped. Nothing is built more than 85 m from the walk (the mist hides it). Ferns and grass are sliced the same way.
- **Two passes:** the sky and the mountain are drawn first with their own deep camera; the forest camera stops at 110 m.
- **Cheaper lighting on rough surfaces:** bark, needles, ferns, grass, moss, ground and stones use Lambert lighting instead of the physically based material, with the faint environment light they used to get added back in the shader. Picture by picture against `?pbr` the difference is about 2 to 4% in average colour. Litter, people and the mountain keep their materials.
- **Shadows:** only trees, logs and people cast them; the shadow area is 68 m across (the mist hides shadows further out); the map is 2048 px on high, 1536 on medium, 1024 on low; it is redrawn every other frame and when the sun area steps along (PCF, not soft PCF).
- **People are culled** when off screen or outside the shadow area (a fixed, generous bounding sphere per body).
- **No forced layout per frame:** the hero's scroll length is measured on resize, and CSS variables are written only when they change.
- **No hitch when the volunteers appear:** their textures finish downloading and are uploaded to the graphics chip, and their drawing programs compiled, before they join the scene.
- **Litter** matrices are only recomputed when the walk moved, a piece is in the air, or a volunteer bagged one.
- **Loading:** the poster shows at once; the forest fades in over it; the volunteers (about 1.5 MB) load only after the forest is on screen, and not at all on the low tier or a 3G connection.
- **Measured in headless Chromium (software rendering, so no meaningful fps):** high tier about 0.55 million triangles and about 150 draw calls per frame, down from 1.71 million triangles. Hero download about 1.9 MB of local files (plus three.js from the CDN), down from about 14 MB.

## Known weak spots

- **The vest and gloves are painted in the shader** from which bones move each part of the body (chest and shoulders: vest; hands: gloves), so their edges follow the mesh, not a sewn seam. The hood of a hoodie partly turns vest-coloured. A modelled vest would be cleaner.
- **The dive into the tree uses a separate, finer bark texture** on a slightly wider trunk; it is painted at start-up like the other textures.
- **Frame rate after the November optimisation is unmeasured on real hardware.** The cloud has no graphics chip. Check on the owner's laptop (Intel Iris Xe, picked as the medium tier) with `?debug`: watch `__forest.ms.ratio`, `locked` and `frame`.
- **Tier detection is a guess from the graphics chip name.** Browsers that hide it (some Firefox and Safari settings) fall back to memory and core counts. Wrong guesses can be checked with `?tier=`.
- **Removing the far trees uncovers a little more of the mountain's base** than before; compare with the old build if it looks different.
- **Texture painting (floor, bark, needles, ferns) still runs on the main thread** at start-up; the low tier paints 40% of the strokes. Moving it to a worker with OffscreenCanvas was not done.
- **Intermittent collapses to 2 or 3 frames per second were seen during development** and could not be reproduced on demand. The scene now prepares its graphics in the background before showing, and overlay effects were lightened, but the original trigger was never proven.
- **Loading over a real network is still untested;** only the sizes were measured. The FBX files and original PNG/JPG textures were removed (they are in git history, commit 1de0b27).
- **The poster is a single random moment** (people placement differs per load). Re-render it after changing the scene with Playwright: load `?debug&tier=high&ratio=1` with the page overlays and `.hero__poster` hidden, screenshot `.hero__stage` at 1600×900 and 720×1280, then save AVIF and JPG under 100 KB with Pillow.
- **All Slovak and English wording was written during the redesign** and needs a native check. The stats (5 exchanges, 9 countries) were counted from the old site and need confirming.
- **Photos are the original large files** from `Projekty/`.
- **Inner pages** (each project, blog, documents) still use the old design.

## What the owner has asked for and rejected

- Wants it unique, polished, animated, detailed and fairly realistic.
- Rejected: cartoon low-poly objects, a realistic ocean, a tsunami intro, a wave of photos, a litter-to-city photo dissolve, a realistic trash wave, a glossy 3D wave of bottles, and hand-built human figures ("too weird").
- Reference sites the owner built and likes: cetplatformbg.com, iyacbulgaria.com, patrzglobalnie.org, initiative-sociale.ro. Mladá vlna should not copy them.

## Rules agreed with the owner

- Never push or merge to `main` unless explicitly asked, and confirm once more before doing it.
- Ask before downloading any file, stating the name, source and size.
- Image generation through Higgsfield is not available: the workspace has no credits.
