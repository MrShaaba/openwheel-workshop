# Open-Wheel Workshop

Build a modern open-wheel race car part by part inside a holographic workshop. Parts float around
the build platform as glowing blue holograms. Click or drag one onto the chassis and it flies into
place, locks in with a flash, and materialises from wireframe into solid carbon and metal. Every part
comes with a short engineering card explaining what it does and how it connects to the rest of the
car.

![Open-Wheel Workshop](docs/screenshot.png)

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
| State | zustand                                                            |
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

| Input                   | Action                                                |
| ----------------------- | ----------------------------------------------------- |
| Click a hologram        | Install that part (Guided: the highlighted one)       |
| Drag a hologram         | Move it near its ghost outline to snap it in          |
| Click an installed part | Inspect it and open its info card                     |
| Space                   | Install the next part                                 |
| 1 to 6                  | Camera presets: front, side, top, rear, cockpit, hero |
| R                       | Reset the camera to the hero angle                    |
| M                       | Mute or unmute                                        |
| Esc                     | Leave Inspect mode                                    |
| Mouse drag / wheel      | Orbit and zoom                                        |

## Project layout

```
src/
  parts/     part definitions, dependency graph, geometry factories, info-card copy
  scene/     workshop environment, camera rig, car root, part meshes, effects
  shaders/   hologram and materialize GLSL
  state/     zustand store and selectors
  audio/     Web Audio synth
  ui/        HUD, inventory, info card, mode controls, loading screen
```

Part metadata has one source of truth in `src/parts/registry.ts`. Adding a part takes one entry
there, one geometry function in `src/parts/geometry/` and one card in `src/parts/infoCards.ts`.

## Roadmap

Phases 1 to 3 (workshop, Guided Build, materialise shader, sound, info cards, Inspect) are built.
See [ROADMAP.md](ROADMAP.md) for Exploded View, Assemble All, save and resume, the livery
customiser and the stretch goals.

## License

MIT, Bello Mohammed. See [LICENSE](LICENSE).
