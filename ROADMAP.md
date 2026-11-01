# Roadmap

Phases 1 to 5 are built: the workshop scene, camera and HUD; the part system with Guided and Free
Build; the materialise shader, procedural sound, info cards and Inspect mode; Exploded View,
Assemble All, the completion sequence, save and resume, and Reset build; the paint shop, the tablet
layout, the accessibility and performance passes and a round of visual polish. Only the stretch goals
remain. The data model already carries what they need (the `PartSource` union covers GLB models).

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

## Phase 5: livery customiser, polish, performance (built)

- [x] **Paint shop.** `src/ui/LiveryPanel.tsx`, unlocked when the build is complete and toggled
      with `L`. Primary, secondary and accent colours, a car number and four patterns (solid,
      stripe, split, fade) plus four original schemes. `src/scene/liveryTextures.ts` draws two
      canvas masks (a plan/side pattern atlas and the number) that every `paint` material samples
      in car space through the materialise shader hook; the colours are uniforms, so a picker drag
      never redraws a canvas or rebuilds a material. Persisted with the build.
- [x] **Responsive pass.** The checklist collapses to a one-line summary below 1180 px; at 1024 px
      the bottom bar stacks; at 820 px the HUD is one column with right-anchored cards; camera
      presets back off on portrait aspects; touch screens get larger targets.
- [x] **Accessibility.** One keyboard focus ring for every control, a skip link, landmark labels,
      status live regions for the objective and toast, `aria-keyshortcuts` on buttons, checklist
      rows that install or inspect parts, focus moved in and restored for the info card, paint shop
      and confirm dialog, and reduced motion honoured in CSS, framer-motion and the scene.
- [x] **Performance pass.** One merged hologram geometry per part, one merged platform overlay,
      pixel ratio capped at 1.5 with SMAA only below it, reflector at 512 px, front-face light
      shafts, capped dust sprites, disposal audit, memoised parts and a car root that ignores hover.
      Measured at 60 fps in every state with the pixel ratio pinned at 1.5 and at 2.
- [x] **Visual polish.** Swept nose pylons, teardrop mirror pods, intake trumpets, bell housing and
      exhaust collectors on the engine, a shader under-glow that breathes and flares on completion,
      dust density that follows camera distance, and a fix for the materialise wipe leaving holes in
      faces at a part's top once it had finished.

## Stretch goals (behind flags, after Phase 5)

- [ ] **Test-drive mode.** `VITE_ENABLE_TEST_DRIVE=true` shows a Drive button once the car is
      complete: flat track scene, keyboard controls (arrows or WASD), simple kinematic car model,
      engine pitch follows speed.
- [ ] **GLB model swap.** Drop a `.glb` into `public/models/`, change the part's `source` in
      `src/parts/registry.ts` to `{ kind: 'glb', url: '/models/<file>.glb', scale }`, and
      `InstalledPart` loads it with `useGLTF` inside Suspense instead of calling the geometry
      factory. The materialise shader attaches to the loaded meshes through the same finish map.
