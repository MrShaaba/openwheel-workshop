# Roadmap

## Built so far

Phases 1 to 6 are built and verified in a real browser. In short:

- **Phases 1 to 3.** The holographic workshop scene, camera rig and HUD; the part system with
  Guided and Free Build over a dependency graph; click, drag and keyboard installs with the
  materialise shader; procedural sound; info cards and Inspect mode.
- **Phase 4.** Exploded View, Assemble All with per-stage camera moves, the completion sequence,
  save and resume through a versioned, sanitised `localStorage` adapter, and Reset build.
- **Phase 5.** The paint shop (patterns, colours, number, original schemes) painted in car space
  from shared canvas masks; the tablet layout; accessibility and performance passes; visual polish.
- **Test drive (behind `VITE_ENABLE_TEST_DRIVE`).** A fade to a 715 m night circuit built from
  straights and circular fillets, the finished car on an arcade bicycle model, a chase camera, lap
  timing, a HUD with speed, gear, revs and a minimap, and an engine voice in the synth.
- **Phase 6: Race engineer.** Car setup (wing angles, tyre compound with wear, ride height, brake
  bias, each with a plain one-line explanation and a prediction of what the driver will feel) that
  the physics turns into aero grip and drag, understeer and oversteer, a scraping floor and tyres
  that fall off a cliff. A pit-stop challenge with prompts, penalties, a saved best and the Pit crew
  badge. An Engineer's Quiz drawn from the info cards with a best score and the Race engineer badge.
  A time trial with three sectors, splits against the best lap, a hologram ghost replaying it, a
  local top-ten leaderboard filed under a driver tag, and the Hot lap badge. Photo mode with a free
  camera, depth of field, a turntable, hidden UI and a PNG download. Gamepad driving with analogue
  triggers and stick.

## Phase 7: the next 20-plus hours

Concrete items, each with the work it breaks into, how it is accepted, and an honest estimate. No
real team, driver or sponsor names anywhere: every design, era and circuit is original. Total: about
38 hours.

### 7.1 GLB parts library (6 h)

Swap any procedural part for a glTF model dropped into `public/models/`, with the same materialise
wipe, livery paint and hologram passes.

- [ ] `useGLTF` loader behind Suspense in `InstalledPart`, `FloatingPart`, `GhostTarget` and the
      drive car, keyed on `PartSource.kind === 'glb'`; the procedural factory stays as the fallback
      while the file loads or if it fails. (1.5 h)
- [ ] Finish mapping: a loaded mesh takes its `Finish` from its material name (`paint`, `carbon`,
      `metal`, `rubber`, `glass`, `emissive`) or from an optional per-part override table; unknown
      names fall back to `carbon`. The materialise and livery shader hooks attach to every mesh
      through `createFinishMaterial`, so the wipe and the paint work unchanged. (1.5 h)
- [ ] Pivot and bounds: the loaded scene is re-centred on the registry pivot, scaled by
      `source.scale`, and its merged bounds feed the hologram and wipe uniforms. A dev-only
      alignment overlay (toggle in `window.__workshop`) draws the procedural ghost over the GLB so a
      scale or offset can be read off and written into the registry entry. (1.5 h)
- [ ] Proof without downloads: a build script exports two procedural parts (front wing, halo) to
      `public/models/*.glb` with `GLTFExporter`, and the registry points those two parts at the
      files. The hologram thumbnails in the inventory ring are built from the loaded geometry. (1 h)
- [ ] `public/models/README.md` with the material-name contract and the alignment workflow. (0.5 h)

Accepted when: both exported parts load from GLB with identical placement to the procedural
versions, materialise and take the livery, the inventory ring shows them as holograms, and the
build is unchanged in size when no GLB is referenced.

### 7.2 Second circuit with elevation (5 h)

A second original circuit chosen from the Time trial tab, with gentle hills so the car is not always
on a plane.

- [ ] Generalise `track.ts` into `circuits.ts`: a `CircuitDefinition` (corners, start fraction,
      width, kerb threshold, a height function over lap distance) and `buildCircuit(definition)`
      producing points, tangents, curvature and now heights; `CIRCUIT` becomes the selected one. (1.5 h)
- [ ] "Ridge" circuit: longer main straight, a climbing esses section, a blind crest into a downhill
      hairpin, 900 to 1000 m, with its own minimap and grid pose. Heights capped at a gradient the
      arcade model handles without leaving the ground. (1 h)
- [ ] Physics on slopes: longitudinal gravity term from the local gradient, the car's `y` and pitch
      from the surface, and the chase camera following the height. (1.5 h)
- [ ] Records per circuit: the time-trial store keys best lap, sectors, leaderboard and ghost by
      circuit id; the panel shows a circuit switcher and the HUD names the circuit. (1 h)

Accepted when: both circuits lap cleanly with the in-page autopilot, the ghost replays on the right
circuit, and switching circuits keeps each leaderboard intact.

### 7.3 Guided narrated build tour (5 h)

A sit-back tour of the car for a child who would rather listen than read: every part in order, the
camera framing it, a short spoken explanation, captions on screen.

- [ ] Tour script generated from the info cards (role plus one fact per part, a one-line intro per
      stage) in `src/tour/script.ts`, with a plain-language pass over the longer sentences. (1 h)
- [ ] Narration through the Web Speech API (`speechSynthesis`), so no audio files: voice picker
      limited to the browser's English voices, rate and volume controls, and a caption track that
      stays in sync by starting each caption on the utterance's `start` event. Falls back to
      captions only where speech is unavailable. (1.5 h)
- [ ] Tour player in `src/tour/TourPlayer.tsx`: play, pause, next, previous, a chapter list by
      stage, auto-advance, and a progress bar; the camera uses the existing `focus` request per part
      and the Assemble All director to install the part as it is introduced when the build is
      incomplete. `Esc` stops the tour. (2 h)
- [ ] Accessibility: captions as a live region, the player fully keyboard operable, reduced motion
      skips the camera flights. (0.5 h)

Accepted when: a complete tour runs unattended from an empty platform to the finished car with
narration and captions in sync, and can be paused and resumed at any chapter.

### 7.4 Car eras as original designs (7 h)

Three original era designs that teach how open-wheel engineering changed, selectable in the
workshop and carried onto the track. None copies a real car.

- [ ] Era packs in `src/parts/eras/`: each is a full set of 31 geometry factories (sharing helpers
      where shapes are alike) plus era-specific card copy. The registry gains `era` as a dimension,
      the model cache keys on it, and the livery atlas extents adapt per era. (2.5 h)
- [ ] "Cigar" era: a slim tube body, front engine cover bulge, exposed suspension, narrow treaded
      tyres, no wings; cards explain why grip came from the tyres alone. (1.5 h)
- [ ] "Ground effect" era: wide sidepods with sliding skirts, a tall rear wing on a pylon, a slender
      nose; cards explain how the floor started doing the work. (1.5 h)
- [ ] "High nose" era: the raised nose, bargeboards, a narrow track; cards explain airflow under the
      car and the first hybrid ideas. (1 h)
- [ ] Era picker in the workshop header with a one-line blurb each; the setup panel hides the wing
      sliders for the wingless era and explains why; a build is saved per era. (0.5 h)

Accepted when: each era builds from an empty platform to completion, materialises, paints and
drives, and the quiz draws questions from the era's own cards.

### 7.5 Race weekend (4 h)

- [ ] Qualifying: three timed laps, best counts, grid position against five hologram rivals seeded
      from the player's own best laps scaled by a difficulty setting. (1.5 h)
- [ ] Five-lap race against those ghosts with positions on the HUD, a start-light sequence, and a
      podium screen; collisions are ignored (ghosts), so it stays friendly. (2 h)
- [ ] Pit window: tyre wear makes a stop sensible on softs; the pit-stop game runs when the car
      enters the pit lane and the stop time is added to the race time. (0.5 h)

### 7.6 Telemetry overlay (3 h)

- [ ] Record speed, throttle, brake, steer and gear per trace sample on every lap. (0.5 h)
- [ ] A telemetry tab drawing the last lap against the best lap as SVG traces over lap distance,
      with sector lines and a hover readout; coloured by which lap was faster where. (2 h)
- [ ] Plain-language notes generated from the traces: "You braked 18 m earlier into turn 3 than
      your best lap." (0.5 h)

### 7.7 Setup sheets and sharing (2 h)

- [ ] Save named setups per circuit, with the predicted numbers alongside. (1 h)
- [ ] Export and import a setup as JSON and as a short code in the URL hash, sanitised on the way
      in. (1 h)

### 7.8 Sound and feel (2 h)

- [ ] Gear-shift blip and a brief torque dip on upshifts; a backfire crackle on downshifts. (1 h)
- [ ] Kerb rumble strips as a pitched buzz that follows wheel speed, and a wind gust layer at
      the crest of the second circuit. (1 h)

### 7.9 Accessibility and performance for the new panels (4 h)

- [ ] Screen-reader pass over the Race engineer tabs, the pit stop (live prompts), the quiz and the
      leaderboard; a visible focus order check with a keyboard-only run through every feature. (1.5 h)
- [ ] Reduced motion: the ghost fades without scanlines, the turntable is off, flashes become
      static messages. (0.5 h)
- [ ] Track performance: instanced kerb blocks and posts, a distance cut for the ghost's wireframe
      pass, and a frame-time budget check with the pixel ratio pinned at 1.5 on the track scene
      with the ghost and photo-mode depth of field on. (2 h)
