# Arpit Jaiswal — Curiosity, made real.

A personal portfolio at **https://arpitkjaiswal.github.io/**. Built with HTML, CSS, vanilla JavaScript, Canvas, and Web Audio. No package installation or production build is required.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The repository root is the GitHub Pages publishing directory; `.nojekyll` keeps it a static site.

## Inside

- A procedural 3D particle globe, three color palettes, and a pause control.
- Nine curated projects with search, category filters, direct repository links, and detailed project panels.
- Public GitHub repository counts and update dates, with a labeled snapshot, a 20-minute browser cache, and graceful network failure handling.
- A five-note frequency playground, with optional synthesized sound and keyboard shortcuts.
- Responsive navigation, a searchable Ctrl/Cmd+K launcher, native dialogs, visible keyboard focus, and reduced-motion support.
- Original SVG project artwork, plus PNG social-sharing artwork.

Sound always starts muted. Canvas animations pause offscreen or when the tab is hidden. The site does not require accounts, private APIs, analytics, or credentials. Optional Google Fonts and public GitHub metadata require network access; local content and fallback fonts remain available without them.

## Edit

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, biography, contact details, and metadata |
| `projects.js` | Curated project descriptions, stages, scope notes, tags, and source links |
| `script.js` | Gallery, dialogs, public GitHub refresh, sound, and Canvas art |
| `style.css` | Layout, typography, colors, responsiveness, and motion preferences |
| `assets/` | Original project illustrations and social card |
| `scripts/generate-artwork.py` | Rebuild the SVG illustrations without dependencies |

Project descriptions were checked against public repository READMEs on **6 November 2026**. Keep the distinction between prototypes, research previews, and released software when updating them. Live metadata refreshes counts and dates, not these curated descriptions. The LEXA project intentionally links to the documented Apple Silicon companion branch. Open-source forks are included in the public repository count but are not presented as original portfolio projects.

## Check

```sh
python3 scripts/check.py
```

This checks JavaScript syntax, local assets, SVG validity, internal links, project metadata, and image dimensions. Node.js is needed for JavaScript checks. Browser checks should cover search and reset, category filters, project dialogs and Escape, keyboard launcher, mobile navigation, note controls, sound mute, palette and motion controls, and contact copying.
