# Open-Wheel Workshop

Build a modern open-wheel race car part by part inside a holographic workshop. Parts float around
the build platform as glowing blue holograms. Click or drag one onto the chassis and it flies into
place, locks in with a flash, and materialises from wireframe into solid carbon and metal. Every part
comes with a short engineering card explaining what it does and how it connects to the rest of the
car. Pull the finished car apart in Exploded View, let the workshop assemble it for you, and come
back later: the build is saved in the browser.

![Open-Wheel Workshop](docs/screenshot.png)

## Features

- **Guided and Free Build.** Guided walks the 31 parts in order; Free lets you install anything whose
  dependencies are in place. Wheels need brakes, brakes need uprights, the rear wing needs the engine
  cover and gearbox. A wrong part lunges, bounces back and tells you what is missing.
- **Click, drag or press Space.** Parts fly in along an arc with a magnetic snap, a lock-in flash and a
  servo-and-clunk sound, then materialise with a rising wipe.
- **Inspect and detach.** Click any installed part: the camera frames it, the rest of the car fades to
  wireframe and a card shows its role, two engineering notes and how it connects. Detaching cascades
  to dependent parts.
- **Exploded View.** Press `E` to slide every installed part out along its own vector with a stagger
  by stage, each tethered to its home point. Hover parts to identify them.
- **Assemble All.** Sit back while the workshop installs the remaining parts, moving the camera to a
  new angle for each stage. Stop it with `Esc` or skip to the finished car.
- **Completion moment.** When the last part locks in, shockwaves cross the floor, the platform flares,
  the engine fires up, the camera sweeps the car and the HUD types out SYSTEMS ONLINE.
- **Save and resume.** The installed parts, build mode, sound setting and livery are stored in the
  browser and restored on the next visit. Reset build clears them after a confirmation.
- **Procedural everything.** No models, textures, fonts or audio files. Geometry is built from
  primitives, lathes and extrusions; every sound is synthesised with the Web Audio API.

![Exploded View](docs/exploded.png)

## Who it is for

- People who enjoy motorsport engineering and want to see how a modern single-seater goes together.
- Anyone who wants a tactile, cinematic 3D toy that runs in a browser tab with nothing to install.
- Developers looking for a worked example of React Three Fiber, custom GLSL materials,
  postprocessing, procedural audio and zustand in a strict TypeScript project.

## Stack

| Layer | Choice                                                             |
| ----- | ------------------------------------------------------------------ |
| Build | Vite 8, TypeScript 5.9 in strict mode, ESLint 10, Prettier         |
| UI    | React 19, framer-motion for HUD and panel animation                |
| 3D    | Three.js through @react-three/fiber and @react-three/drei          |
| Post  | @react-three/postprocessing: bloom, vignette, chromatic aberration |
| State | zustand with the persist middleware over localStorage              |
| Audio | Web Audio API, every sound synthesised at runtime                  |

No backend and no external assets. Every part is built from Three.js primitives, lathe and extrude
geometry. The part system can swap any part for a GLB model later by dropping a file into
`public/models` and changing one config entry.

## Run it

Requires Node 20.19 or newer (Node 22.12 or newer also works).

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server with hot reload |
| `npm run build`   | Type-check and build to `dist/`      |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Run ESLint over the project          |
| `npm run format`  | Format the project with Prettier     |

## Controls

| Input                   | Action                                                   |
| ----------------------- | -------------------------------------------------------- |
| Click a hologram        | Install that part (Guided: the highlighted one)          |
| Drag a hologram         | Move it near its ghost outline to snap it in             |
| Click an installed part | Inspect it and open its info card                        |
| Space                   | Install the next part                                    |
| E                       | Toggle Exploded View                                     |
| 1 to 6                  | Camera presets: front, side, top, rear, cockpit, hero    |
| R                       | Reset the camera to the hero angle                       |
| M                       | Mute or unmute                                           |
| Esc                     | Leave Inspect, stop Assemble All, or close a dialog      |
| Mouse drag / wheel      | Orbit and zoom                                           |
| Assemble all (HUD)      | Install every remaining part automatically               |
| Reset build (HUD)       | Clear the build and its saved copy, after a confirmation |

## Save and resume

The build is written to `localStorage` under the key `open-wheel-workshop:build` with a schema
version. On load the saved list is checked against the part registry: unknown ids, duplicates and
parts whose dependencies are missing are dropped, and a value that cannot be parsed is discarded,
so the app always boots to a consistent car. Storage that is blocked (private windows, quota) falls
back to memory for the session.

## Project layout

```
src/
  parts/     part definitions, dependency graph, geometry factories, info-card copy
  scene/     workshop environment, camera rig, car root, part meshes, effects, assembly director
  shaders/   hologram and materialize GLSL
  state/     zustand store, selectors, persistence adapter
  audio/     Web Audio synth
  ui/        HUD, inventory, info card, mode controls, dialogs, loading screen
```

Part metadata has one source of truth in `src/parts/registry.ts`. Adding a part takes one entry
there, one geometry function in `src/parts/geometry/` and one card in `src/parts/infoCards.ts`.

## Roadmap

Phases 1 to 4 are built: workshop, Guided and Free Build, the materialise shader, sound, info cards,
Inspect, Exploded View, Assemble All, the completion sequence and save and resume. See
[ROADMAP.md](ROADMAP.md) for the livery customiser, the polish and performance pass, and the
stretch goals.

## License

MIT, Bello Mohammed. See [LICENSE](LICENSE).
