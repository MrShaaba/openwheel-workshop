import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { damp } from '../lib/math'
import { getPartModel } from '../parts/model'
import { PART_BY_ID } from '../parts/registry'
import type { PartId } from '../parts/types'
import { applyMaterialize, createMaterializeUniforms } from '../shaders/materialize'
import { useWorkshop } from '../state/store'
import { toVector3 } from './constants'
import { freshInstalls } from './effectsBus'
import { markInteraction } from './interaction'
import { createFinishMaterial, createHologramPair, disposeHologramPair } from './materials'

interface InstalledPartProps {
  id: PartId
}

const MATERIALIZE_SECONDS = 0.95
/** How far a non-inspected part fades back towards hologram while another part is inspected. */
const DIMMED_PROGRESS = 0.1

/**
 * A part locked into the car. Fresh installs materialise from hologram to solid with a rising
 * wipe; while another part is inspected this one fades most of the way back to hologram.
 */
export function InstalledPart({ id }: InstalledPartProps) {
  const definition = PART_BY_ID[id]
  const model = getPartModel(id)
  const livery = useWorkshop((state) => state.livery)
  const [fresh] = useState(() => freshInstalls.has(id))
  useEffect(() => {
    freshInstalls.delete(id)
  }, [id])

  const uniforms = useMemo(() => createMaterializeUniforms(model.bounds), [model])
  const materials = useMemo(
    () =>
      model.pieces.map((piece) => {
        const material = createFinishMaterial(piece.finish, livery)
        applyMaterialize(material, uniforms)
        return material
      }),
    [model, livery, uniforms],
  )
  const hologram = useMemo(() => createHologramPair(model.bounds), [model])

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  useEffect(() => () => disposeHologramPair(hologram), [hologram])

  const progress = useRef(fresh ? 0 : 1)
  const hologramGroup = useRef<Group>(null)

  useFrame(({ clock }, dt) => {
    const state = useWorkshop.getState()
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
    hologram.shell.time = clock.elapsedTime
    hologram.wire.time = clock.elapsedTime
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
        ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 3)
        : state.hovered === id && !state.inspecting
          ? 0.4
          : 0
    uniforms.uHighlight.value = damp(uniforms.uHighlight.value, highlightTarget, 8, dt)
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

  const position = useMemo(() => toVector3(definition.transform.position), [definition])
  const rotation = definition.transform.rotation ?? [0, 0, 0]

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const state = useWorkshop.getState()
    if (state.installing || state.dragging || state.inspecting === id) return
    markInteraction()
    state.inspect(id)
    state.focusPart(id)
  }

  return (
    <group
      name={`part:${id}`}
      position={position}
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
  )
}
