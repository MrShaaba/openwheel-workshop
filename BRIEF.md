# Brief: Open-Wheel Workshop

The full specification is below. Read these three notes first. They take priority over the spec
where the two differ.

## 1. First pass scope

- Build **Phases 1 to 3** of the spec now: the scaffold, workshop scene, camera and HUD; the part
  system with Guided Build; and the materialize shader, sound, info cards and Inspect mode.
- Leave **Phases 4 and 5** for later, along with the optional test-drive stretch goal and the GLB
  model swap. Write them up in `ROADMAP.md` as concrete items. Do not build them now.
- In plan mode, propose the plan for all five phases so the architecture supports them, but
  implement only Phases 1 to 3.

## 2. Naming and branding

- Call the app **Open-Wheel Workshop**. Do not use "F1" or "Formula 1" in the app name, the
  package name, the page title or any logo. Those are trademarks. The info cards can say the
  car is in the style of a modern Formula 1 car, as plain descriptive text.
- No real team names, sponsors, liveries or driver names anywhere.

## 3. Repo basics (in addition to the spec)

- The repo is already initialised with git. Commit each phase, and each working step inside a
  phase, with a clear message.
- Add a README (what it is, who it is for, stack, how to run it and a screenshot), an MIT
  LICENSE under "Bello Mohammed", `.gitignore` (including `.env`), and a GitHub Actions workflow
  that runs lint and build.
- Ignore any global instructions about AWS, tagging, alarms or infrastructure-as-code for this
  repository. It is a frontend-only project.

---

# Project: Build an open-wheel race car part by part

## Vision
Build a frontend-only, interactive 3D web app where the user assembles a modern Formula 1 car component by component inside a futuristic holographic workshop, in the spirit of Tony Stark building the Iron Man suit. The experience should feel cinematic and tactile. Parts float as glowing blue wireframe holograms, the user grabs or selects them, and they fly into place on the chassis with satisfying animation, light and sound. As each part locks in, it "materializes" from hologram into a solid, shaded component. The finished result should feel like a polished, playful engineering sandbox that is also educational.

## Tech stack (use exactly this unless there's a strong reason not to; explain if you deviate)
- Vite + React + TypeScript (strict mode)
- Three.js via @react-three/fiber and @react-three/drei
- @react-three/postprocessing for bloom, vignette and chromatic aberration (the hologram look depends on bloom)
- zustand for app state
- framer-motion (or react-spring) for UI and part fly-in animations
- Web Audio API for procedurally generated sound effects (no external audio files)
- No backend. Persist progress in localStorage, wrapped in try/catch.
- ESLint + Prettier; npm scripts for dev, build, preview, lint

## The car
Model a generic modern F1 car (2026-regulation era). Use no real team names, logos or liveries. Build every part procedurally from Three.js primitives, extruded shapes and lathe/tube geometry so the project needs no external assets. Architect the part system so any part can later be swapped for a GLB model by dropping a file into /public/models and updating one config entry.

Parts, grouped into build stages. Each part needs an id, name, stage, dependencies (which parts must already be installed), a target transform on the car, a geometry factory, and an info card.

1. Core: survival cell/monocoque, cockpit and seat, halo, nose cone and crash structure
2. Power unit: internal combustion engine, turbocharger, MGU-K, energy store (battery), exhaust, gearbox
3. Suspension and running gear: front and rear push/pull-rod suspension, uprights, brakes (discs and calipers), four wheels with tyres
4. Aerodynamics: floor, diffuser, sidepods, engine cover with shark fin, front wing, rear wing with DRS flap, bargeboard/side elements
5. Controls: steering wheel (with simple button/display detail), mirrors, rain light

Dependencies must be enforced in Guided mode. For example, wheels require uprights, uprights require suspension, and the rear wing requires the engine cover and gearbox.

## Environment
- A dark holographic workshop: a reflective floor with a glowing grid, a circular build platform that slowly rotates when idle, volumetric-looking light shafts, and floating particle dust.
- A parts "inventory" ring or side panel showing the remaining parts as rotating holographic thumbnails.
- OrbitControls with sensible limits, plus smooth camera fly-to presets: Front, Side, Top, Rear, Cockpit, and a "Hero" angle.
- A HUD overlay in a sleek sci-fi style: stage progress, part count (e.g. 14/32), current objective, and mode toggles. Use monospace accents, thin cyan lines and subtle scanline animation.

## Interaction modes
1. **Guided Build (default):** the app highlights the next valid part, shows a ghost outline where it goes, and the user clicks or drags it in. Wrong placements bounce back with a short "denied" sound and effect.
2. **Free Build:** any part whose dependencies are met can be installed in any order.
3. **Exploded View:** a toggle that animates every installed part outward along sensible vectors so the internals are visible, then back again.
4. **Assemble All:** a one-click cinematic sequence that installs every remaining part in order, with camera moves timed to each stage.
5. **Inspect:** clicking any installed part isolates it (others fade to wireframe), opens an info card, and lets the user detach it.

Placement: drag in 3D with snap-to-target when within a tolerance radius, plus a click-to-install fallback. Animate installs along a curved path with an eased "magnetic snap" and a brief flash when the part locks in. Then run a hologram-to-solid material transition: a shader-driven dissolve or scanline wipe from emissive wireframe to a PBR material.

## Info cards
Each part gets a concise card: what it does, one or two real, accurate F1 engineering facts (e.g. weight, temperatures, materials such as carbon fibre composite), and a "how it connects" line. Keep the language clear and engaging, without dumbing it down. Store all copy in a single typed data file.

## Extras
- **Livery customizer** (unlocked once the car is complete): primary, secondary and accent colours, a car number, and a few original pattern presets. Apply via material colours or a generated canvas texture.
- **Sound:** synthesized UI blips, a servo whir during part travel, a metallic clunk on lock-in, and an engine fire-up rev when the car is finished. Include a mute toggle.
- **Completion moment:** when the last part installs, the platform lights up, the engine sound plays, the camera does a hero sweep, and a "SYSTEMS ONLINE" HUD sequence appears.
- **Save/resume:** installed parts, mode and livery persist in localStorage. Include a "Reset build" action with a confirmation.
- **Optional stretch (behind a flag, don't build until the core is done):** a simple test-drive mode on a flat track with keyboard controls.

## Architecture expectations
- /src/parts: part definitions (config), geometry factories and an info-card data file
- /src/scene: workshop, lighting, car root, part component, ghost targets, effects
- /src/ui: HUD, inventory, info card, mode controls, livery panel
- /src/state: a zustand store (installed parts, mode, selection, livery, camera target) with selectors
- /src/audio: a small Web Audio synth module
- /src/shaders: the hologram and materialize shaders
- A single source of truth for part metadata. Adding a part should take one config entry plus one geometry function.
- Keep components small and typed; no `any`.

## Performance and quality
- Hold 60fps on a modern laptop. Use instancing or merged geometry where it helps, memoize geometries and materials, and dispose of them correctly.
- Use adaptive DPR, Suspense for anything async, and a loading screen styled as a boot sequence.
- Make the layout responsive. Desktop is primary, but the HUD shouldn't break on a tablet.
- Make it keyboard-accessible where practical (space = install next part, E = exploded view, R = reset camera).

## How to work
1. Start in plan mode. Propose the file structure, part list with dependencies, state shape and a phased roadmap. Wait for my approval before writing code.
2. Build in phases, each one runnable and committed (git) before moving on:
   - Phase 1: Vite scaffold, workshop scene, camera, HUD shell, bloom
   - Phase 2: part system, geometry for all parts, Guided Build with snap/install animation
   - Phase 3: hologram → solid materialize shader, sound, info cards, Inspect mode
   - Phase 4: Exploded View, Assemble All, completion sequence, save/resume
   - Phase 5: livery customizer, polish, performance pass
3. After each phase, run `npm run build` and `npm run lint`, fix all errors, and tell me exactly what to look at in the browser.
4. Favour visual quality and feel. If a placeholder looks crude, say so and improve it before moving on.

## Definition of done
`npm install && npm run dev` launches the workshop. I can build the full car in Guided mode, inspect and detach parts, toggle Exploded View, run Assemble All, customize the livery, reload the page and resume where I left off. Everything runs client-side with no console errors.
