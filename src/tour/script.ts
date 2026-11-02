/**
 * The narrated build tour as plain text: a welcome, an introduction to each stage, one chapter per
 * part (its card's title, role and first engineering note) and a sign-off. Everything a chapter
 * says about a part comes from `infoCards.ts`, so the tour never tells a child anything the cards
 * do not.
 */
import { INFO_CARDS } from '../parts/infoCards'
import { PARTS, STAGE_BY_ID, STAGES } from '../parts/registry'
import type { PartId, StageId } from '../parts/types'

export type TourChapter =
  | { kind: 'welcome'; title: string; text: string }
  | { kind: 'stage'; stage: StageId; title: string; text: string }
  | { kind: 'part'; stage: StageId; part: PartId; title: string; text: string }
  | { kind: 'finish'; title: string; text: string }

const STAGE_INTROS: Record<StageId, string> = {
  core: 'Every race car starts with its core: the strong carbon tub the driver sits in, the seat, the halo over the cockpit, the roll hoop behind it and the nose in front. Everything else bolts onto these.',
  'power-unit':
    'Next comes the power unit. A small turbocharged engine and an electric motor work together, with a battery to store energy and a gearbox to put it all onto the road.',
  'running-gear':
    'The running gear is how the car touches the ground: suspension arms, the hubs they hold, brakes that glow red hot, and four wheels with slick tyres.',
  aero: 'Now the aerodynamics. The floor, wings and bodywork shape the air so it pushes the car onto the track. The faster the car goes, the harder the air presses down.',
  controls:
    'Finally the controls and the details: the steering wheel with all its buttons, the mirrors, and the red light on the tail.',
}

export const TOUR: readonly TourChapter[] = [
  {
    kind: 'welcome',
    title: 'Welcome to the workshop',
    text: 'Welcome to the open-wheel workshop. We are going to build a race car together, one part at a time, and I will tell you what each part does along the way. Sit back, or press the arrow keys to move at your own pace.',
  },
  ...STAGES.flatMap((stage): TourChapter[] => [
    { kind: 'stage', stage: stage.id, title: stage.name, text: STAGE_INTROS[stage.id] },
    ...PARTS.filter((part) => part.stage === stage.id).map((part): TourChapter => {
      const card = INFO_CARDS[part.id]
      return {
        kind: 'part',
        stage: stage.id,
        part: part.id,
        title: card.title,
        text: `${card.title}. ${card.role} ${card.facts[0]}`,
      }
    }),
  ]),
  {
    kind: 'finish',
    title: 'Systems online',
    text: 'And that is the whole car: thirty-one parts, every one with a job to do. Now it is yours. Paint it in the paint shop, pull it apart in the exploded view, or take it out onto the circuit.',
  },
]

export function chapterStageName(chapter: TourChapter): string {
  return 'stage' in chapter ? STAGE_BY_ID[chapter.stage].name : ''
}

/** How long a caption stays up when nothing is spoken: reading pace, never under a few seconds. */
export function readingMs(text: string): number {
  return Math.max(3000, text.length * 55)
}
