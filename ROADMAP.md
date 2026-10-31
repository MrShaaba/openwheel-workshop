# Roadmap

Phases 1 to 3 are built: the workshop scene, camera and HUD; the part system with Guided and Free
Build; the materialise shader, procedural sound, info cards and Inspect mode. The items below are
specified but not built. The data model already carries what they need (`explodeVector` on every
part, the `livery` slice in the store, the `PartSource` union for GLB models).

## Phase 4: Exploded View, Assemble All, completion, save and resume

- [ ] **Exploded View.** Animate every installed part along its `explodeVector` from
      `src/parts/registry.ts` with a short stagger by stage, and back again. Toggle with the HUD
      button and the `E` key. Disable install and Inspect while exploded.
- [ ] **Assemble All.** A sequencer in the store that installs each remaining part in registry order
      with a fixed gap, flies the camera to a preset per stage (core: hero, power unit: rear,
      running gear: side, aero: front, controls: cockpit), and can be skipped with Esc.
- [ ] **Completion moment.** When the last part commits: platform ring and floor grid pulse
      brighter, `engineRev()` from `src/audio/synth.ts` plays, the camera does a slow hero sweep,
      and the HUD runs a "SYSTEMS ONLINE" typewriter sequence over the stage bar.
- [ ] **Save and resume.** Wrap the store in zustand `persist` through `src/state/persistence.ts`:
      a localStorage adapter in try/catch, a schema version key, and `partialize` to
      `installed`, `mode`, `muted` and `livery`. Hydrate before the boot screen clears.
- [ ] **Reset build.** HUD action with a confirmation dialog that clears the persisted build and
      returns the camera to the hero angle.

## Phase 5: livery customiser, polish, performance

- [ ] **Livery panel.** Unlocked when the build is complete. Primary, secondary and accent colours,
      a car number, and a few original pattern presets (solid, stripe, split, fade). Patterns are
      drawn to a `CanvasTexture` and applied to pieces with the `paint` finish; colours apply through
      material uniforms. Persisted with the build.
- [ ] **Responsive pass.** Tablet layout for the HUD at 1024 px and 820 px: collapse the stage
      checklist, stack the bottom bar, keep the objective readable.
- [ ] **Accessibility.** Visible focus rings on HUD controls, `aria-live` on the objective and
      toast, keyboard reachability for every HUD action.
- [ ] **Performance pass.** Merge static workshop geometry, instance the platform tick marks and
      ring holograms, audit `dispose()` on geometries and materials, confirm 60 fps on a modern
      laptop with the Chrome performance panel, tune bloom resolution and reflector resolution.
- [ ] **Visual polish.** Second pass on any part geometry that still reads as crude, platform
      under-glow, dust density by camera distance.

## Stretch goals (behind flags, after Phase 5)

- [ ] **Test-drive mode.** `VITE_ENABLE_TEST_DRIVE=true` shows a Drive button once the car is
      complete: flat track scene, keyboard controls (arrows or WASD), simple kinematic car model,
      engine pitch follows speed.
- [ ] **GLB model swap.** Drop a `.glb` into `public/models/`, change the part's `source` in
      `src/parts/registry.ts` to `{ kind: 'glb', url: '/models/<file>.glb', scale }`, and
      `InstalledPart` loads it with `useGLTF` inside Suspense instead of calling the geometry
      factory. The materialise shader attaches to the loaded meshes through the same finish map.
