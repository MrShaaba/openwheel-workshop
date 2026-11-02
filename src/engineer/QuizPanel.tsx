import { useCallback, useEffect, useRef, useState } from 'react'
import { synth } from '../audio/synth'
import { useWorkshop } from '../state/store'
import { createRound, rateRound, ROUND_LENGTH, type Question } from './quiz'

type Phase = 'ready' | 'asking' | 'answered' | 'done'

const OPTION_KEYS = ['1', '2', '3', '4']
const KEYS = new Set([...OPTION_KEYS, ' ', 'Enter'])

/**
 * The Engineer's Quiz: eight questions drawn from the info cards, answered with 1 to 4 or a click,
 * each followed by the card's own words. A perfect round earns the Race engineer badge.
 */
export function QuizPanel() {
  const quizBest = useWorkshop((state) => state.quizBest)
  const recordQuiz = useWorkshop((state) => state.recordQuiz)
  const [phase, setPhase] = useState<Phase>('ready')
  const [round, setRound] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const cta = useRef<HTMLButtonElement>(null)

  // Whatever Space should do next (start, next question, new round) is the focused button.
  useEffect(() => {
    if (phase !== 'asking') cta.current?.focus()
  }, [phase, index])

  const begin = useCallback(() => {
    setRound(createRound())
    setIndex(0)
    setChosen(null)
    setScore(0)
    setStreak(0)
    setPhase('asking')
    synth.blip(700)
  }, [])

  const answer = useCallback(
    (option: number) => {
      if (phase !== 'asking') return
      const question = round[index]
      if (!question || option >= question.options.length) return
      const right = option === question.answer
      setChosen(option)
      setPhase('answered')
      if (right) {
        setScore((s) => s + 1)
        setStreak((s) => s + 1)
        synth.blip(1500)
      } else {
        setStreak(0)
        synth.denied()
      }
    },
    [phase, round, index],
  )

  const next = useCallback(() => {
    if (phase !== 'answered') return
    if (index + 1 >= round.length) {
      recordQuiz(score, round.length)
      setPhase('done')
      return
    }
    setIndex((i) => i + 1)
    setChosen(null)
    setPhase('asking')
  }, [phase, index, round.length, recordQuiz, score])

  const feed = useCallback(
    (key: string) => {
      if (key === ' ' || key === 'Enter') {
        if (phase === 'ready' || phase === 'done') begin()
        else if (phase === 'answered') next()
        return
      }
      const option = OPTION_KEYS.indexOf(key)
      if (option >= 0) answer(option)
    },
    [phase, begin, next, answer],
  )

  // The quiz keys are taken before anything else sees them; Esc and Tab pass through.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (!KEYS.has(event.key)) return
      // Space on a focused button is that button's click.
      if (event.key === ' ' && event.target instanceof HTMLButtonElement) return
      event.preventDefault()
      event.stopPropagation()
      feed(event.key)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [feed])

  const question = round[index]
  const verdict = phase === 'done' ? rateRound(score, round.length) : null
  const perfect = phase === 'done' && score === round.length

  return (
    <div className="quiz">
      <div className="quiz-top">
        <div className="quiz-score">
          <span className="label">Score</span>
          <span className="quiz-score-value">
            {score}
            <small>/ {phase === 'ready' ? ROUND_LENGTH : round.length}</small>
          </span>
        </div>
        <div className="quiz-score">
          <span className="label">Best</span>
          <span className="quiz-score-value">
            {quizBest === null ? '–' : quizBest}
            <small>/ {ROUND_LENGTH}</small>
          </span>
        </div>
        {streak >= 3 && phase !== 'done' && (
          <span className="quiz-streak" role="status">
            {streak} in a row
          </span>
        )}
        <div
          className="quiz-progress"
          aria-label={`Question ${Math.min(index + 1, round.length)} of ${round.length}`}
        >
          {Array.from({ length: phase === 'ready' ? ROUND_LENGTH : round.length }, (_, i) => (
            <i
              key={i}
              className={
                i < index || (i === index && phase === 'answered')
                  ? 'done'
                  : i === index && phase === 'asking'
                    ? 'now'
                    : ''
              }
            />
          ))}
        </div>
      </div>

      {phase === 'ready' && (
        <div className="quiz-card">
          <p className="quiz-title">Engineer&apos;s quiz</p>
          <p className="quiz-text">
            {ROUND_LENGTH} questions, all answered somewhere on the part cards: what a part does,
            which stage it belongs to, and a few numbers worth knowing. Press <kbd>1</kbd> to{' '}
            <kbd>4</kbd> or click an answer, then <kbd>SPACE</kbd> for the next one.
          </p>
          <p className="quiz-text">A perfect round earns the Race engineer badge.</p>
          <button ref={cta} type="button" className="hud-btn active quiz-cta" onClick={begin}>
            Start the round
            <kbd aria-hidden="true">SPACE</kbd>
          </button>
        </div>
      )}

      {(phase === 'asking' || phase === 'answered') && question && (
        <div className="quiz-card">
          <span className="label">
            Question {index + 1} of {round.length}
          </span>
          <p className="quiz-question">{question.prompt}</p>
          {question.quote && <blockquote className="quiz-quote">“{question.quote}”</blockquote>}
          <div className="quiz-options" role="group" aria-label="Answers">
            {question.options.map((option, i) => {
              const state =
                phase === 'answered'
                  ? i === question.answer
                    ? 'right'
                    : i === chosen
                      ? 'wrong'
                      : 'dim'
                  : ''
              return (
                <button
                  key={option}
                  type="button"
                  className={`hud-btn quiz-option ${state}`}
                  disabled={phase === 'answered'}
                  onClick={() => answer(i)}
                >
                  <kbd aria-hidden="true">{OPTION_KEYS[i]}</kbd>
                  <span>{option}</span>
                </button>
              )
            })}
          </div>
          {phase === 'answered' && chosen !== null && (
            <div
              className={`quiz-feedback ${chosen === question.answer ? 'right' : 'wrong'}`}
              role="status"
            >
              <p className="quiz-verdict">
                {chosen === question.answer
                  ? 'Correct'
                  : `Not quite: it is ${question.options[question.answer]}`}
              </p>
              <p className="quiz-text">
                <span className="label">From the card</span> {question.explanation}
              </p>
              <button ref={cta} type="button" className="hud-btn active quiz-cta" onClick={next}>
                {index + 1 >= round.length ? 'See the result' : 'Next question'}
                <kbd aria-hidden="true">SPACE</kbd>
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && verdict && (
        <div className={`quiz-card ${perfect ? 'perfect' : ''}`}>
          <p className="quiz-title">{verdict.title}</p>
          <p className="quiz-result">
            {score} <small>out of {round.length}</small>
          </p>
          <p className="quiz-text">{verdict.blurb}</p>
          {!perfect && (
            <p className="quiz-text">Get all {round.length} for the Race engineer badge.</p>
          )}
          <button ref={cta} type="button" className="hud-btn active quiz-cta" onClick={begin}>
            New round
            <kbd aria-hidden="true">SPACE</kbd>
          </button>
        </div>
      )}
    </div>
  )
}
