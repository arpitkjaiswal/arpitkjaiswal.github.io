# Arpit Jaiswal — Curiosity, made real.

A personal portfolio at **https://arpitkjaiswal.github.io/**. Built with HTML, CSS, vanilla JavaScript, Canvas, and Web Audio. No package installation or production build is required.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The repository root is the GitHub Pages publishing directory; `.nojekyll` keeps it a static site.

## Inside

- A particle hero that automatically morphs between a globe, torus, and helix; three color palettes; ambient stars; and a shared pause control.
- A live visual interface with Galaxy, Reactor, Vortex, and Aurora scenes, automatic transitions, fullscreen/expanded view, pointer and keyboard control, and energy pulses.
- Optional camera hand tracking and JARVIS-style voice commands, backed by a typed command interface.
- Nine curated projects with search, category filters, direct repository links, and detailed project panels.
- Public GitHub repository counts and update dates, with a labeled snapshot, a 20-minute browser cache, and graceful network failure handling.
- A five-note frequency playground, with optional synthesized sound and keyboard shortcuts.
- Responsive navigation, a searchable Ctrl/Cmd+K launcher, native dialogs, visible keyboard focus, and reduced-motion support.
- Original SVG project artwork, plus PNG social-sharing artwork.

Sound always starts muted. Canvas animations pause offscreen or when the tab is hidden. The site does not require accounts, private API keys, or credentials. Optional Google Fonts and public GitHub metadata require network access; local content and fallback fonts remain available without them. Camera mode downloads a pinned MediaPipe JS/WASM package and model only after activation. Browser speech recognition may use a remote speech service. Neither input is enabled automatically.

## Edit

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, biography, contact details, and metadata |
| `projects.js` | Curated project descriptions, stages, scope notes, tags, and source links |
| `script.js` | Gallery, dialogs, public GitHub refresh, sound, and Canvas art |
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
node --test scripts/interaction.test.mjs
```

This checks JavaScript syntax, local assets, SVG validity, internal links, project metadata, and image dimensions. Node.js is needed for JavaScript checks. Browser checks should cover search and reset, category filters, project dialogs and Escape, keyboard launcher, mobile navigation, note controls, sound mute, palette and motion controls, and contact copying.

## Hand and voice controls

Camera and voice start off on every page load and never reconnect automatically after the tab is hidden. Active inputs have a visible stop control. Camera tracks and speech recognition are stopped on explicit disable, page hide, or leaving the page. Late permission/model results are discarded and cleaned up after cancellation. Audio is never recorded or stored by the portfolio, and application code does not upload camera frames.

- **Hand:** move to steer, pinch to attract, open palm to repel, fist to hold, peace sign held for 650 ms to change scene. Release the peace sign to rearm. Two-hand separation adjusts scale. Heuristic poses are derived from MediaPipe landmarks; they are not a custom trained gesture classifier.
- **Voice:** enable voice, then say **“Jarvis, next scene”**, **“Jarvis, activate reactor”**, **“Jarvis, change color”**, **“Jarvis, burst”**, **“Jarvis, pause animations”**, **“Jarvis, resume animations”**, **“Jarvis, show projects”**, or **“Jarvis, stop all inputs”**. Only recognized, allowed site actions run. Speech cannot execute arbitrary code or control the visitor’s computer. Optional spoken confirmations follow the existing Sound setting.
- **Fallbacks:** all scenes and commands also work with buttons, mouse/touch, or typing. Focus the canvas and use arrow keys to steer or Space to send a pulse. Web Speech support varies by browser and its speech service.
- **Requirements:** camera access needs HTTPS, a camera, browser permission, and a working WebGL context for MediaPipe preprocessing, including when its inference delegate is CPU. No camera or microphone permission is requested by the automatic animations.

The SDK is pinned to `@mediapipe/tasks-vision@0.10.21` with matching WASM files, using Google's versioned Hand Landmarker model. Input images are processed on device. Review [MediaPipe's privacy notice](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md) for its metrics policy and [Web Speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) for browser service behavior.

### Verification limits

The Node suite covers command boundaries, geometric input invariance, scene coordinates, hold/release logic, canceled permission requests, late model initialization, tracker failure cleanup, speech-service failures, and stopped recognizers. These checks use controlled landmarks and injected lifecycle fakes; they are not physical sensor acceptance tests.

The managed browser rendered the four scenes and exercised typed commands, animation pause/resume, expanded view, and fallback controls. The SDK, WASM, and model downloaded during a runtime check, but inference could not complete because that browser could not create a WebGL context. Physical camera landmarks and live microphone transcription still need verification on the target Mac. The interface reports unavailable graphics, denied/busy/missing hardware, unsupported speech, and network errors without claiming an active connection.
