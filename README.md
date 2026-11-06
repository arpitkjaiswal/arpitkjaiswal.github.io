# Arpit Jaiswal — Enter the Build Universe

A personal portfolio at **https://arpitkjaiswal.github.io/**. Built with HTML, CSS, vanilla JavaScript, Canvas, and Web Audio. No package installation or production build is required.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The repository root is the GitHub Pages publishing directory; `.nojekyll` keeps it a static site.

## Inside

- A default full-viewport command deck with nine spotlight project portals, generative constellations, a target scanner, and a controllable ship cursor.
- Point-and-pinch project navigation, global WASD/arrow selection, 1–9 quick-open, / for project search, Escape to stop active inputs outside dialogs, and session-local discovery XP. XP is a playful exploration counter, not a professional statistic.

- A particle hero that automatically morphs between a globe, torus, and helix; three color palettes; ambient stars; and a shared pause control.
- A live visual interface with Galaxy, Reactor, Vortex, and Aurora scenes, automatic transitions, fullscreen/expanded view, pointer and keyboard control, and energy pulses.
- Optional camera hand tracking and JARVIS-style voice commands, backed by a typed command interface.
- Nine reviewed project writeups plus an automatically growing public repository catalog. The searchable archive has category filters, newest/star/name sorting, complete project cards, and direct source links. The checked snapshot contains 44 eligible builds after excluding the profile and portfolio repos.
- Public GitHub repository counts and update dates, with a labeled public snapshot, a five-minute browser cache, paginated refresh, and graceful network failure handling. Refreshes run while visible and when returning to the page.
- A five-note frequency playground, with optional synthesized sound and keyboard shortcuts.
- Responsive navigation, a searchable Ctrl/Cmd+K launcher, native dialogs, visible keyboard focus, and reduced-motion support.
- Original SVG project artwork, plus PNG social-sharing artwork.

Sound always starts muted. Canvas animations pause offscreen or when the tab is hidden. The site does not require accounts, private API keys, or credentials. Optional Google Fonts and public GitHub metadata require network access; local content and fallback fonts remain available without them. Camera mode downloads a pinned MediaPipe JS/WASM package and model only after activation. Browser speech recognition may use a remote speech service. Neither input is enabled automatically.

## Edit

The HTML entry points and local ES-module imports share a release query (`v=20261106-ux2`). Bump it together when changing browser code so returning visitors load a consistent release from GitHub Pages.

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, biography, contact details, and metadata |
| `projects.js` | Curated project descriptions, stages, scope notes, tags, and source links |
| `script.js` | Gallery, dialogs, public GitHub refresh, sound, and Canvas art |
| `command-deck.mjs` | Game interface, portals, project scanner, navigation, and discovery progress |
| `deck-core.mjs` | Pure project aliases, selection gate, keyboard movement, and XP rules |
| `hand-navigation.mjs` | Landmark pointer, visible-target hit testing, pinch selection, and scrolling |
| `command-deck.css` | Command deck HUD, responsive map, gesture cursor, and project file styling |
| `experience.css` | Readable controls, guidance, phone layouts, and the full project archive |
| `catalog-data.js` | Public-only GitHub metadata fallback snapshot |
| `catalog-core.mjs` | Repo validation, filtering, curated merge, spotlight selection, and pagination |
| `project-catalog.mjs` | Shared live refresh, bounded cache, and catalog events |
| `project-library.mjs` | Searchable project archive, category controls, sorting, and sync status |
| `visual-studio.mjs` | Generative scenes, ambient art, hand/voice integration, and immersive view |
| `interaction-core.mjs` | Pure gesture interpretation, bounded voice commands, and scene geometry |
| `input-controllers.mjs` | Opt-in camera and microphone lifecycle, cancellation, and failure handling |
| `style.css` | Layout, typography, colors, responsiveness, and motion preferences |
| `assets/` | Original project illustrations and social card |
| `scripts/generate-artwork.py` | Rebuild the SVG illustrations without dependencies |

Project descriptions were checked against public repository READMEs on **6 November 2026**. Keep the distinction between prototypes, research previews, and released software when updating them. Live metadata refreshes counts and dates, not these curated descriptions. The LEXA project intentionally links to the documented Apple Silicon companion branch. Open-source forks are included in the public repository count but are not presented as original portfolio projects.

## Check

```sh
python3 scripts/check.py
node --test scripts/*.test.mjs
```

This checks JavaScript syntax, local assets, SVG validity, internal links, project metadata, and image dimensions. Node.js is needed for JavaScript checks. Browser checks should cover search and reset, category filters, project dialogs and Escape, keyboard launcher, mobile navigation, note controls, sound mute, palette and motion controls, and contact copying.

## Automatically showing new repos

Original public repos appear without editing `projects.js`. The current checked snapshot has 44 eligible projects; public counts can change as GitHub changes. The live API refresh follows up to ten 100-repo pages, excludes forks, archived/disabled repos, and the profile/portfolio repos, and retains the prior complete catalog if a refresh fails. The client never contains a GitHub token. The static integrity check rejects nonpublic snapshot metadata.

- Add the GitHub topic **`portfolio-featured`** to promote an important repo into the nine-slot main constellation. Other reviewed builds fill the remaining slots; every eligible repo stays searchable in the archive.
- Add **`portfolio-hidden`** to omit a repo. Private repos are never admitted to the live catalog.
- A repo's description, main language, topics, stars, and dates supply its card. Unreviewed repos are labeled **From GitHub** / **GitHub repository** and receive no fabricated demo, feature list, or release status.
- Updates use a five-minute cache. A visible page checks periodically, returning to the tab checks stale data, and **Refresh GitHub** forces a check with a 45-second cooldown. This is a visitor-side refresh; a closed page does not run a background job.
- Voice and quick navigation resolve against the current catalog. Project numbers 1–9 follow the visible spotlight order. An unknown or ambiguous name runs no action.

## Hand and voice controls

Camera and voice start off on every page load and never reconnect automatically after the tab is hidden. Active inputs have a visible stop control. Camera tracks and speech recognition are stopped on explicit disable, page hide, or leaving the page. Late permission/model results are discarded and cleaned up after cancellation. Audio is never recorded or stored by the portfolio, and application code does not upload camera frames.

- **Command deck:** open the root URL or `#deck`. Click **Enable camera**, allow browser permission, and raise an open hand. Point your index finger at a portal, then pinch once to open it. Release before selecting again. A visible ring shows selection progress; hand loss disarms the next pinch. Open-palm edge scrolling works in project files and the mobile map. Hold a peace sign for the next project. The source/demo buttons open their verified destinations in the same tab when selected by hand. The classic portfolio remains at `#home`.
- **Project commands:** say **“Jarvis, open LEXA”**, **“Jarvis, open project two”**, **“Jarvis, next project”**, **“Jarvis, open selected project”**, **“Jarvis, close project”**, **“Jarvis, play Orbit Warden”**, or **“Jarvis, source for LEXA”**. Only known portfolio projects resolve. Typed commands use the same allowlisted parser and do not require the wake word. Desktop-only apps open their project file when no browser demo exists.
- **Visual lab hand controls:** move to steer, pinch to attract, open palm to repel, fist to hold, peace sign held for 650 ms to change scene. Release the peace sign to rearm. Two-hand separation adjusts scale. Heuristic poses are derived from MediaPipe landmarks; they are not a custom trained gesture classifier.
- **Voice:** enable voice, then say **“Jarvis, next scene”**, **“Jarvis, activate reactor”**, **“Jarvis, change color”**, **“Jarvis, burst”**, **“Jarvis, pause animations”**, **“Jarvis, resume animations”**, **“Jarvis, show projects”**, or **“Jarvis, stop all inputs”**. Only recognized, allowed site actions run. Speech cannot execute arbitrary code or control the visitor’s computer. Optional spoken confirmations follow the existing Sound setting.
- **Fallbacks:** all scenes and commands also work with buttons, mouse/touch, or typing. Focus the canvas and use arrow keys to steer or Space to send a pulse. Web Speech support varies by browser and its speech service.
- **Requirements:** camera access needs HTTPS, a camera, browser permission, and a working WebGL context for MediaPipe preprocessing, including when its inference delegate is CPU. No camera or microphone permission is requested by the automatic animations.

The SDK is pinned to `@mediapipe/tasks-vision@0.10.21` with matching WASM files, using Google's versioned Hand Landmarker model. Input images are processed on device. Review [MediaPipe's privacy notice](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md) for its metrics policy and [Web Speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) for browser service behavior.

### Verification limits

The Node suite covers command boundaries, geometric input invariance, scene coordinates, hold/release logic, canceled permission requests, late model initialization, tracker failure cleanup, speech-service failures, and stopped recognizers. These checks use controlled landmarks and injected lifecycle fakes; they are not physical sensor acceptance tests.

All 42 Node tests passed, including project aliases and wake-word boundaries, mirrored fingertip mapping, selection hold/release, target changes under a held pinch, hand-loss rearming, unique discoveries, and keyboard wrapping.

The managed browser exercised the command deck at 320, 390, and 768 px widths and compact 568 px heights, project clicks, typed project commands, global keyboard selection, unique XP, search/empty/reset states, category filters, sorting, raw GitHub project files, sound/mute, pause/resume, and classic navigation. A temporary same-origin fixture sent explicitly simulated hand events through the real page: point and pinch opened LEXA, a held pinch over the modal close button did not close it, releasing and pinching closed it, and tracking loss hid the cursor. A simulated new featured repository appeared automatically in the spotlight and library. A simulated SpeechRecognition lifecycle exercised enable, transcript handling, Escape stop, microphone-denial messaging, and ignored late transcripts. Native fullscreen was rejected by the managed browser, so the rejection feedback was verified. These integration checks do not establish physical tracking or microphone accuracy.

The managed browser rendered the four scenes and exercised typed commands, animation pause/resume, expanded view, and fallback controls. The SDK, WASM, and model downloaded during a runtime check, but inference could not complete because that browser could not create a WebGL context. Physical camera landmarks and live microphone transcription still need verification on the target Mac. The interface reports unavailable graphics, denied/busy/missing hardware, unsupported speech, and network errors without claiming an active connection.
