/**
 * The Engineer's Quiz: short multiple-choice questions built from the info cards, so every answer
 * is something the cards already say. A round mixes "which part" questions (from a role, a fact or
 * how it connects), "which stage" questions and a few numbers worth remembering.
 */
import { INFO_CARDS } from '../parts/infoCards'
import { PART_BY_ID, PARTS, STAGE_BY_ID, STAGES } from '../parts/registry'
import type { PartId, StageId } from '../parts/types'

export type QuestionKind = 'role' | 'fact' | 'connects' | 'stage' | 'number'

export interface Question {
  kind: QuestionKind
  /** The part the question is about, for the "from the card" line. */
  part: PartId
  prompt: string
  /** Quoted card text under the prompt, if any. */
  quote: string | null
  options: string[]
  answer: number
  /** Read out after answering, right or wrong. */
  explanation: string
}

export const ROUND_LENGTH = 8

interface NumberQuestion {
  part: PartId
  prompt: string
  answer: string
  wrong: [string, string, string]
}

/** Numbers and names lifted straight from the cards. */
export const NUMBER_QUESTIONS: readonly NumberQuestion[] = [
  {
    part: 'halo',
    prompt: 'The halo is made of titanium. About how much does it weigh?',
    answer: '7 kg',
    wrong: ['2 kg', '15 kg', '30 kg'],
  },
  {
    part: 'halo',
    prompt: 'The halo is tested to hold a static load of 125 kN. That is roughly the weight of…',
    answer: 'a double-decker bus',
    wrong: ['a family car', 'a bicycle', 'a loaded shopping trolley'],
  },
  {
    part: 'engine',
    prompt: 'What is the engine’s rev limit?',
    answer: '15,000 rpm',
    wrong: ['6,000 rpm', '9,000 rpm', '22,000 rpm'],
  },
  {
    part: 'engine',
    prompt: 'What kind of engine sits behind the driver?',
    answer: 'A 1.6 litre V6 turbo',
    wrong: ['A 3.0 litre V10', 'A 2.4 litre V8', 'A 1.0 litre three-cylinder'],
  },
  {
    part: 'mgu-k',
    prompt: 'Under the 2026 rules, how much power can the MGU-K deliver?',
    answer: '350 kW',
    wrong: ['50 kW', '120 kW', '800 kW'],
  },
  {
    part: 'turbocharger',
    prompt: 'How fast does the turbocharger’s shaft spin?',
    answer: 'Well over 100,000 rpm',
    wrong: ['About 1,000 rpm', 'About 15,000 rpm', 'About 40,000 rpm'],
  },
  {
    part: 'nose-cone',
    prompt: 'The FIA frontal impact test fires the nose into a barrier at what speed?',
    answer: '15 metres per second',
    wrong: ['2 metres per second', '50 metres per second', '100 metres per second'],
  },
  {
    part: 'gearbox',
    prompt: 'How many forward gears does the gearbox have?',
    answer: 'Eight',
    wrong: ['Five', 'Six', 'Twelve'],
  },
  {
    part: 'floor',
    prompt: 'How much may the plank under the floor wear over a race?',
    answer: 'No more than 1 mm',
    wrong: ['No more than 1 cm', 'No more than 5 cm', 'As much as it likes'],
  },
  {
    part: 'front-brakes',
    prompt: 'Carbon brakes only bite properly when hot. What temperature do they run at?',
    answer: '400 to 1,000 °C',
    wrong: ['40 to 100 °C', '150 to 250 °C', '2,000 to 3,000 °C'],
  },
  {
    part: 'front-brakes',
    prompt: 'Peak deceleration from high speed can exceed…',
    answer: '5 g',
    wrong: ['1 g', '2 g', '20 g'],
  },
  {
    part: 'wheel-fl',
    prompt: 'What size are the wheels?',
    answer: '18 inch',
    wrong: ['13 inch', '15 inch', '24 inch'],
  },
  {
    part: 'wheel-fl',
    prompt: 'Slick tyres work best in a narrow window around…',
    answer: '90 to 110 °C',
    wrong: ['20 to 30 °C', '50 to 60 °C', '200 to 250 °C'],
  },
  {
    part: 'exhaust',
    prompt: 'Exhaust gas leaves the turbine at well over…',
    answer: '900 °C',
    wrong: ['90 °C', '300 °C', '3,000 °C'],
  },
  {
    part: 'steering-wheel',
    prompt: 'About how many buttons and rotaries are on the steering wheel?',
    answer: 'Around 25',
    wrong: ['Around 4', 'Around 10', 'Around 80'],
  },
  {
    part: 'wheel-fl',
    prompt: 'How long does a wheel change take at a pit stop?',
    answer: 'Under two seconds',
    wrong: ['About ten seconds', 'About half a minute', 'About two minutes'],
  },
  {
    part: 'rear-wing',
    prompt: 'What replaced the old DRS system under the 2026 rules?',
    answer: 'Active aero that opens both wings',
    wrong: ['A bigger engine', 'A second rear wing', 'Nothing, DRS stayed'],
  },
  {
    part: 'energy-store',
    prompt: 'Where is the energy store mounted?',
    answer: 'Low inside the survival cell, under the fuel cell',
    wrong: ['On top of the engine cover', 'Inside the nose cone', 'Behind the rear wing'],
  },
]

const WHEELS = new Set<PartId>(['wheel-fl', 'wheel-fr', 'wheel-rl', 'wheel-rr'])

/** Parts whose role and connection text are their own; the four wheels share theirs. */
const DISTINCT_PARTS = PARTS.filter((part) => !WHEELS.has(part.id))

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Three other part names, preferring the same stage so the choice takes some thought. */
function partDistractors(part: PartId, random: () => number): string[] {
  const stage = PART_BY_ID[part].stage
  const sameStage = DISTINCT_PARTS.filter((p) => p.id !== part && p.stage === stage)
  const others = DISTINCT_PARTS.filter((p) => p.id !== part && p.stage !== stage)
  const picked = [...shuffle(sameStage, random).slice(0, 2), ...shuffle(others, random)]
  const names: string[] = []
  for (const candidate of picked) {
    if (names.length === 3) break
    if (!names.includes(candidate.name)) names.push(candidate.name)
  }
  return names
}

/** Hide the part's own name inside a quoted fact, so the fact is a clue and not the answer. */
export function redact(text: string, part: PartId): string {
  const names = [PART_BY_ID[part].name, INFO_CARDS[part].title]
  let result = text
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'this part')
  }
  return result
}

function withOptions(
  base: Omit<Question, 'options' | 'answer'>,
  correct: string,
  wrong: readonly string[],
  random: () => number,
): Question {
  const options = shuffle([correct, ...wrong], random)
  return { ...base, options, answer: options.indexOf(correct) }
}

function roleQuestion(part: PartId, random: () => number): Question {
  const card = INFO_CARDS[part]
  return withOptions(
    {
      kind: 'role',
      part,
      prompt: 'Which part does this job?',
      quote: redact(card.role, part),
      explanation: `${card.title}: ${card.role}`,
    },
    PART_BY_ID[part].name,
    partDistractors(part, random),
    random,
  )
}

function factQuestion(part: PartId, random: () => number): Question {
  const card = INFO_CARDS[part]
  const fact = card.facts[Math.floor(random() * card.facts.length)]
  return withOptions(
    {
      kind: 'fact',
      part,
      prompt: 'Which part is this engineering note about?',
      quote: redact(fact, part),
      explanation: `${card.title}: ${fact}`,
    },
    PART_BY_ID[part].name,
    partDistractors(part, random),
    random,
  )
}

function connectsQuestion(part: PartId, random: () => number): Question {
  const card = INFO_CARDS[part]
  return withOptions(
    {
      kind: 'connects',
      part,
      prompt: 'Which part connects like this?',
      quote: redact(card.connects, part),
      explanation: `${card.title}: ${card.connects}`,
    },
    PART_BY_ID[part].name,
    partDistractors(part, random),
    random,
  )
}

function stageQuestion(part: PartId, random: () => number): Question {
  const stage = STAGE_BY_ID[PART_BY_ID[part].stage]
  const others = shuffle(
    STAGES.filter((s) => s.id !== stage.id).map((s) => s.name),
    random,
  ).slice(0, 3)
  return withOptions(
    {
      kind: 'stage',
      part,
      prompt: `Which build stage is the ${PART_BY_ID[part].name} installed in?`,
      quote: null,
      explanation: `${PART_BY_ID[part].name} is installed in ${stage.code}, ${stage.name}. ${INFO_CARDS[part].role}`,
    },
    stage.name,
    others,
    random,
  )
}

/** The card fact behind a number question: the one that carries the answer's digits or last word. */
function factBehind(spec: NumberQuestion): string {
  const facts = INFO_CARDS[spec.part].facts
  const digits = spec.answer.replace(/\D/g, '')
  const byDigits = digits ? facts.find((f) => f.replace(/,/g, '').includes(digits)) : undefined
  if (byDigits) return byDigits
  const word = spec.answer.toLowerCase().split(' ').pop() ?? ''
  return facts.find((f) => f.toLowerCase().includes(word)) ?? facts[0]
}

function numberQuestion(spec: NumberQuestion, random: () => number): Question {
  const card = INFO_CARDS[spec.part]
  return withOptions(
    {
      kind: 'number',
      part: spec.part,
      prompt: spec.prompt,
      quote: null,
      explanation: `${card.title}: ${factBehind(spec)}`,
    },
    spec.answer,
    spec.wrong,
    random,
  )
}

/**
 * A round of eight: two parts from their role, two from a fact, one from how it connects, one stage
 * question and two numbers, each about a different part, in a shuffled order.
 */
export function createRound(random: () => number = Math.random): Question[] {
  const used = new Set<PartId>()
  const pick = (pool: readonly { id: PartId }[]): PartId => {
    const candidates = pool.filter((p) => !used.has(p.id))
    const chosen = candidates[Math.floor(random() * candidates.length)] ?? pool[0]
    used.add(chosen.id)
    return chosen.id
  }
  const questions: Question[] = []
  questions.push(roleQuestion(pick(DISTINCT_PARTS), random))
  questions.push(roleQuestion(pick(DISTINCT_PARTS), random))
  questions.push(factQuestion(pick(PARTS), random))
  questions.push(factQuestion(pick(PARTS), random))
  questions.push(connectsQuestion(pick(DISTINCT_PARTS), random))
  questions.push(stageQuestion(pick(PARTS), random))
  const numbers = shuffle(
    NUMBER_QUESTIONS.filter((q) => !used.has(q.part)),
    random,
  )
  const firstNumber = numbers[0] ?? NUMBER_QUESTIONS[0]
  used.add(firstNumber.part)
  questions.push(numberQuestion(firstNumber, random))
  const secondNumber = numbers.find((q) => q.part !== firstNumber.part) ?? NUMBER_QUESTIONS[1]
  questions.push(numberQuestion(secondNumber, random))
  return shuffle(questions, random).slice(0, ROUND_LENGTH)
}

export function stageName(id: StageId): string {
  return STAGE_BY_ID[id].name
}

export interface Verdict {
  title: string
  blurb: string
}

export function rateRound(score: number, total: number): Verdict {
  if (score === total)
    return {
      title: 'Perfect round',
      blurb: 'Every card read and remembered. That is race engineer material.',
    }
  if (score >= total - 1)
    return {
      title: 'Nearly perfect',
      blurb: 'One slipped past. Open that part’s card and go again.',
    }
  if (score >= total / 2)
    return {
      title: 'Good knowledge',
      blurb: 'More than half right. The cards on the parts you missed are a click away.',
    }
  return {
    title: 'Keep reading',
    blurb: 'Inspect a few parts in the workshop and the answers will come.',
  }
}
