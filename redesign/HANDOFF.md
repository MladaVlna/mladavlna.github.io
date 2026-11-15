# Mladá vlna redesign: where things stand

Working notes for whoever continues this redesign. Last updated 15 November 2026.

## What this is

A redesign of mladavlna.github.io, the site of Mladá vlna, a Slovak civic association that runs Erasmus+ youth exchanges. The old site (Bootstrap 3 template) is untouched in the repository root. All new work is in `redesign/`, on the branch `redesign`. It is plain HTML, CSS and JavaScript with no build step; three.js loads from a CDN.

## The approved direction

`redesign/home2.html` is the page to keep building. The owner said of it: "we are finally on a good path".

- **Hero:** a scroll-driven 3D scene of a misty Slovak spruce forest full of litter, with a snow-capped mountain behind. Scrolling walks the visitor down a trail and the litter ahead lifts away, leaving the forest clean.
- **People:** five realistic volunteers walk to real litter pieces, crouch, pick them up with grabber sticks and carry rubbish bags.
- **A brown bear** roams between the trees in the background.
- **Style:** green and blue palette, heavy sans-serif headline (Bricolage Grotesque), pill menu, rounded cards, pale green content sections (about, projects, photo strip, how to join, questions, contact).

`redesign/index.html` is an older, rejected first homepage. Leave it unless asked.

## Files

| File | What it does |
|---|---|
| `home2.html`, `css/home2.css`, `js/home2.js` | The page, its styles, and the SK/EN switch, phone menu and scroll reveals |
| `js/hero-forest.js` | The forest scene: sky, mountain, ground, trees, plants, light, litter, scroll walk, quality control |
| `js/forest-volunteers.js` | Realistic rigged characters and their walk, idle and crouch behaviour |
| `js/forest-people.js` | Simple hand-built figures, used only as a fallback if the character files fail to load |
| `js/forest-bear.js` | The bear |
| `models/` | Five characters and five animations from Microsoft Rocketbox (MIT licence, text included), textures converted from TGA |
| `img/grain.png`, `img/litter.jpg`, `img/city.jpg` | Film grain tile; the last two are used only by the old `index.html` |

## Running it

Module scripts need a web server. From the repository root:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123/redesign/home2.html`.

Test switches on that address:

- `?debug` exposes `window.__forest` (litter pieces, people, bear, scene, renderer, per-frame timings, and a `view` hook to move the camera).
- `?cold` makes every drawing program look new, to imitate a first-ever visit.

## Known weak spots

- **The bear is hand-built from rounded shapes** and looks blobby up close. The Rocketbox library has no bear; a realistic one needs a model from elsewhere.
- **Volunteers have no hi-vis vests.** They wear their own clothes.
- **Desktop runs at about 30 frames per second on Intel integrated graphics,** not 60. The scene is about 1.7 million triangles with shadows.
- **Intermittent collapses to 2 or 3 frames per second were seen during development** and could not be reproduced on demand. The scene now prepares its graphics in the background before showing, and overlay effects were lightened, but the original trigger was never proven.
- **Loading over a real network is untested.** The character files total about 14 MB.
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
