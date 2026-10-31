# Roadmap

Phases 1 to 4 are built: the workshop scene, camera and HUD; the part system with Guided and Free
Build; the materialise shader, procedural sound, info cards and Inspect mode; Exploded View,
Assemble All, the completion sequence, save and resume, and Reset build. The items below are
specified but not built. The data model already carries what they need (the `livery` slice in the
store is persisted and validated, the `PartSource` union covers GLB models).

## Phase 4: Exploded View, Assemble All, completion, save and resume (built)

- [x] **Exploded View.** `E` or the HUD toggle slides every installed part along its `explodeVector`
      with a stagger by stage and a dashed tether to its home point. Install and Inspect are blocked
      until the car is collapsed.
- [x] **Assemble All.** `src/scene/AssemblyDirector.tsx` installs the remaining parts in registry
      order with a stage-specific camera move; `Esc` stops it, Skip to end finishes instantly.
- [x] **Completion moment.** Shockwave rings, a platform flare, the engine rev, a slow camera sweep
      and the SYSTEMS ONLINE banner when the last part locks in.
- [x] **Save and resume.** zustand `persist` through `src/state/persistence.ts` with a schema version,
      a try/catch storage adapter and field-by-field sanitising of whatever comes back.
- [x] **Reset build.** Confirmation dialog, clears the saved build, camera back to hero.

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
