import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry, Float32BufferAttribute, Line, LineDashedMaterial, type Group } from 'three'
import { easeInOutCubic } from '../lib/easing'
import { clamp01, damp, lerp } from '../lib/math'
import { getPartModel } from '../parts/model'
import { PART_BY_ID, PARTS_BY_STAGE, STAGE_BY_ID, STAGES } from '../parts/registry'
import type { PartId } from '../parts/types'
import { applyMaterialize, createMaterializeUniforms } from '../shaders/materialize'
import { useWorkshop } from '../state/store'
import { HOLO_COLOR_SOFT, toVector3 } from './constants'
import { freshInstalls } from '../state/session'
import { markInteraction } from './interaction'
import { getLiveryUniforms } from './liveryTextures'
import { createFinishMaterial, createHologramPair, disposeHologramPair } from './materials'
import { hashString } from './ring'

interface InstalledPartProps {
  id: PartId
}

const MATERIALIZE_SECONDS = 0.95
/** How far a non-inspected part fades back towards hologram while another part is inspected. */
const DIMMED_PROGRESS = 0.1

const EXPLODE_SECONDS = 0.9
/** Exploded View stagger: inner stages lead on the way out, outer stages lead on the way back. */
const STAGE_STAGGER = 0.07
const PART_STAGGER = 0.025
const TETHER_OPACITY = 0.42

interface ExplodeTween {
  start: number
  from: number
  to: number
}

/** Dashed line from a part's home point to where it floats in Exploded View. */
function createTether(): Line {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3))
  const material = new LineDashedMaterial({
    color: HOLO_COLOR_SOFT,
    dashSize: 0.1,
    gapSize: 0.08,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  })
  const line = new Line(geometry, material)
  line.frustumCulled = false
  line.visible = false
  return line
}

/**
 * A part locked into the car. Fresh installs materialise from hologram to solid with a rising
 * wipe; while another part is inspected this one fades most of the way back to hologram; in
 * Exploded View it slides out along its explode vector with a dashed tether back to its home.
 */
export function InstalledPart({ id }: InstalledPartProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const [fresh] = useState(() => freshInstalls.has(id))
  useEffect(() => {
    freshInstalls.delete(id)
  }, [id])

  const uniforms = useMemo(
    () => createMaterializeUniforms(model.bounds, definition.transform.position),
    [model, definition],
  )
  // Paint pieces sample the shared livery masks, so a livery change never rebuilds a material.
  const materials = useMemo(
    () =>
      model.pieces.map((piece) => {
        const material = createFinishMaterial(piece.finish)
        applyMaterialize(
          material,
          uniforms,
          piece.finish === 'paint' ? getLiveryUniforms() : undefined,
        )
        return material
      }),
    [model, uniforms],
  )
  const hologram = useMemo(() => createHologramPair(model.bounds), [model])
  const tether = useMemo(() => createTether(), [])

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  useEffect(() => () => disposeHologramPair(hologram), [hologram])
  useEffect(
    () => () => {
      tether.geometry.dispose()
      ;(tether.material as LineDashedMaterial).dispose()
    },
    [tether],
  )

  const home = useMemo(() => toVector3(definition.transform.position), [definition])
  const explodeVector = useMemo(() => toVector3(definition.explodeVector), [definition])
  const stageIndex = STAGE_BY_ID[definition.stage].index
  const indexInStage = PARTS_BY_STAGE[definition.stage].findIndex((part) => part.id === id)
  const seed = useMemo(() => hashString(id), [id])

  const progress = useRef(fresh ? 0 : 1)
  const explode = useRef<{ k: number; seen: boolean; tween: ExplodeTween | null }>({
    k: 0,
    seen: false,
    tween: null,
  })
  const root = useRef<Group>(null)
  const hologramGroup = useRef<Group>(null)

  useFrame(({ clock }, dt) => {
    const state = useWorkshop.getState()
    const time = clock.elapsedTime
    const dimmed = state.inspecting !== null && state.inspecting !== id
    const current = progress.current
    // Fade down smoothly when another part is inspected; rise with the wipe otherwise.
    const next = dimmed
      ? damp(current, DIMMED_PROGRESS, 6, dt)
      : Math.min(1, current + dt / MATERIALIZE_SECONDS)
    progress.current = next

    uniforms.uProgress.value = next
    hologram.shell.progress = next
    hologram.wire.progress = next
    hologram.shell.time = time
    hologram.wire.time = time
    // While dimmed the part is a faint wireframe; the bright wipe band only shows on fresh installs.
    const edge = dimmed ? 0 : 1
    hologram.shell.alpha = damp(
      hologram.shell.uniforms.uOpacity.value as number,
      dimmed ? 0.05 : 0.6,
      6,
      dt,
    )
    hologram.wire.alpha = damp(
      hologram.wire.uniforms.uOpacity.value as number,
      dimmed ? 0.12 : 0.5,
      6,
      dt,
    )
    hologram.shell.edge = edge
    hologram.wire.edge = edge
    uniforms.uEdge.value = edge
    if (hologramGroup.current) hologramGroup.current.visible = next < 0.995

    const highlightTarget =
      state.inspecting === id
        ? 0.6 + 0.4 * Math.sin(time * 3)
        : state.hovered === id && !state.inspecting
          ? 0.4
          : 0
    uniforms.uHighlight.value = damp(uniforms.uHighlight.value, highlightTarget, 8, dt)

    // Exploded View: tween out or back with a per-stage stagger.
    const e = explode.current
    if (state.exploded !== e.seen) {
      e.seen = state.exploded
      const stageDelay = state.exploded ? stageIndex : STAGES.length - 1 - stageIndex
      e.tween = {
        start: time + stageDelay * STAGE_STAGGER + indexInStage * PART_STAGGER,
        from: e.k,
        to: state.exploded ? 1 : 0,
      }
    }
    if (e.tween) {
      const p = clamp01((time - e.tween.start) / EXPLODE_SECONDS)
      e.k = lerp(e.tween.from, e.tween.to, easeInOutCubic(p))
      if (p >= 1) e.tween = null
    }
    const k = e.k
    const node = root.current
    if (node) {
      const bob = Math.sin(time * 1.3 + seed * 6) * 0.02 * k
      node.position.set(
        home.x + explodeVector.x * k,
        home.y + explodeVector.y * k + bob,
        home.z + explodeVector.z * k,
      )
      const attribute = tether.geometry.getAttribute('position') as Float32BufferAttribute
      attribute.setXYZ(0, home.x, home.y, home.z)
      attribute.setXYZ(1, node.position.x, node.position.y, node.position.z)
      attribute.needsUpdate = true
      tether.computeLineDistances()
    }
    ;(tether.material as LineDashedMaterial).opacity = TETHER_OPACITY * k
    tether.visible = k > 0.01
  })

  // A part that finishes materialising stops being "fresh" so later dimming can ease back up.
  useEffect(() => {
    if (!fresh) return
    const timer = window.setTimeout(
      () => {
        progress.current = Math.max(progress.current, 1)
      },
      MATERIALIZE_SECONDS * 1000 + 50,
    )
    return () => window.clearTimeout(timer)
  }, [fresh])

  const rotation = definition.transform.rotation ?? [0, 0, 0]

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const state = useWorkshop.getState()
    if (
      state.installing ||
      state.dragging ||
      state.exploded ||
      state.assembling ||
      state.inspecting === id
    )
      return
    markInteraction()
    state.inspect(id)
    state.focusPart(id)
  }

  return (
    <>
      <group
        ref={root}
        name={`part:${id}`}
        position={home}
        rotation={[rotation[0], rotation[1], rotation[2]]}
        onPointerOver={(event) => {
          event.stopPropagation()
          useWorkshop.getState().hover(id)
        }}
        onPointerOut={() => {
          const state = useWorkshop.getState()
          if (state.hovered === id) state.hover(null)
        }}
        onClick={onClick}
      >
        {model.pieces.map((piece, index) => (
          <mesh key={piece.finish} geometry={piece.geometry} material={materials[index]} />
        ))}
        <group ref={hologramGroup} visible={fresh}>
          {model.pieces.map((piece) => (
            <group key={piece.finish}>
              <mesh geometry={piece.geometry} material={hologram.shell} raycast={() => null} />
              <mesh geometry={piece.geometry} material={hologram.wire} raycast={() => null} />
            </group>
          ))}
        </group>
      </group>
      <primitive object={tether} />
    </>
  )
}
