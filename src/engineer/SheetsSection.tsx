import { useId, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { formatLap } from '../drive/session'
import { CIRCUIT_DEFINITIONS } from '../drive/track'
import { predictSetup, type SetupPrediction } from '../drive/tuning'
import { brakeBiasPercent, TYRES, type CarSetup } from '../state/setup'
import {
  decodeSetup,
  encodeSetup,
  MAX_SHEET_NAME,
  MAX_SHEETS,
  sameSetup,
  setupLink,
  sheetsFromFile,
  sheetsToFile,
} from '../state/sheets'
import { useWorkshop, type SetupSheet } from '../state/store'

const MAX_COMPARE = 3

interface Column {
  key: string
  title: string
  setup: CarSetup
  bestMs: number | null
  prediction: SetupPrediction
  sheet: SetupSheet | null
}

interface Row {
  label: string
  value: (column: Column) => string
  /** Which direction is better, for the highlight; undefined rows are not scored. */
  best?: (column: Column) => number
  higherIsBetter?: boolean
}

const ROWS: readonly Row[] = [
  { label: 'Front wing', value: (c) => `${c.setup.frontWing} / 10` },
  { label: 'Rear wing', value: (c) => `${c.setup.rearWing} / 10` },
  { label: 'Ride height', value: (c) => `${c.setup.rideHeight} / 10` },
  { label: 'Brake bias', value: (c) => `${brakeBiasPercent(c.setup.brakeBias)}% front` },
  { label: 'Tyres', value: (c) => TYRES[c.setup.tyre].name },
  {
    label: 'Top speed',
    value: (c) => `${c.prediction.topSpeed} km/h`,
    best: (c) => c.prediction.topSpeed,
    higherIsBetter: true,
  },
  {
    label: 'Turn 1',
    value: (c) => `${c.prediction.cornerSpeed} km/h`,
    best: (c) => c.prediction.cornerSpeed,
    higherIsBetter: true,
  },
  {
    label: 'Tyre life',
    value: (c) => `${c.prediction.tyreLaps} laps`,
    best: (c) => c.prediction.tyreLaps,
    higherIsBetter: true,
  },
  {
    label: 'Stop from 200',
    value: (c) => `${c.prediction.brakingDistance} m`,
    best: (c) => c.prediction.brakingDistance,
    higherIsBetter: false,
  },
  {
    label: 'Best lap',
    value: (c) => (c.bestMs === null ? 'no lap yet' : formatLap(c.bestMs)),
    best: (c) => c.bestMs ?? Infinity,
    higherIsBetter: false,
  },
]

function download(name: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Setup sheets: save the current setup under a name for this circuit, load one back, compare up
 * to three against what is on the car now (settings, predictions and the best lap each has set),
 * and carry a setup elsewhere as a short code, a link or a JSON file.
 */
export function SheetsSection() {
  const setup = useWorkshop((state) => state.setup)
  const circuit = useWorkshop((state) => state.circuit)
  const sheets = useWorkshop((state) => state.setupSheets)
  const saveSheet = useWorkshop((state) => state.saveSheet)
  const loadSheet = useWorkshop((state) => state.loadSheet)
  const renameSheet = useWorkshop((state) => state.renameSheet)
  const deleteSheet = useWorkshop((state) => state.deleteSheet)
  const importSheets = useWorkshop((state) => state.importSheets)
  const setSetup = useWorkshop((state) => state.setSetup)
  const notify = useWorkshop((state) => state.notify)
  const [name, setName] = useState('')
  const [allCircuits, setAllCircuits] = useState(false)
  const [compare, setCompare] = useState<string[]>([])
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null)
  const [code, setCode] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const id = useId()

  const shown = sheets
    .filter((sheet) => allCircuits || sheet.circuit === circuit)
    .sort((a, b) => b.savedAt - a.savedAt)
  const currentCode = encodeSetup(setup)
  const matching = sheets.find(
    (sheet) => sheet.circuit === circuit && sameSetup(sheet.setup, setup),
  )
  const selected = compare
    .map((sheetId) => sheets.find((sheet) => sheet.id === sheetId))
    .filter((sheet): sheet is SetupSheet => sheet !== undefined)
  const columns: Column[] = [
    {
      key: 'now',
      title: 'On the car now',
      setup,
      bestMs: matching?.bestMs ?? null,
      prediction: predictSetup(setup),
      sheet: null,
    },
    ...selected.map((sheet) => ({
      key: sheet.id,
      title: sheet.name,
      setup: sheet.setup,
      bestMs: sheet.bestMs,
      prediction: predictSetup(sheet.setup),
      sheet,
    })),
  ]

  const save = () => {
    const saved = saveSheet(name)
    if (saved) setName('')
  }

  const toggleCompare = (sheetId: string) =>
    setCompare((list) =>
      list.includes(sheetId)
        ? list.filter((entry) => entry !== sheetId)
        : list.length >= MAX_COMPARE
          ? [...list.slice(1), sheetId]
          : [...list, sheetId],
    )

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`${what} copied`, 'success')
    } catch {
      notify(`Could not copy. The ${what.toLowerCase()} is ${text}`, 'denied')
    }
  }

  const applyCode = () => {
    const decoded = decodeSetup(code)
    if (!decoded) {
      notify('That is not a setup code. They look like f7r8h2b6s.', 'denied')
      return
    }
    setSetup(decoded)
    setCode('')
    notify(`Setup ${encodeSetup(decoded)} loaded`, 'success')
  }

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const parsed = sheetsFromFile(await file.text())
    if (!parsed) {
      notify('That file is not a setup-sheets export', 'denied')
      return
    }
    const added = importSheets(parsed)
    notify(
      added === 0 ? 'Nothing new in that file' : `Imported ${added} sheet${added === 1 ? '' : 's'}`,
      added === 0 ? 'info' : 'success',
    )
  }

  return (
    <section className="sheets" aria-labelledby={`${id}-title`}>
      <div className="setup-row-head">
        <span id={`${id}-title`}>Setup sheets · {CIRCUIT_DEFINITIONS[circuit].name}</span>
        <span className="setup-value">
          {sheets.length} / {MAX_SHEETS}
        </span>
      </div>

      <div className="sheet-save">
        <input
          className="sheet-input"
          type="text"
          maxLength={MAX_SHEET_NAME}
          placeholder={`Name this setup (Setup ${sheets.length + 1})`}
          aria-label="Sheet name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              save()
            }
          }}
        />
        <button type="button" className="hud-btn active" onClick={save}>
          Save sheet
        </button>
        <label className="sheet-toggle">
          <input
            type="checkbox"
            checked={allCircuits}
            onChange={(event) => setAllCircuits(event.target.checked)}
          />
          Show all circuits
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="setup-help">
          No sheets {allCircuits ? 'yet' : 'for this circuit yet'}. Dial in a setup above, name it
          and save it; set a clean lap with it and the lap time is kept on the sheet.
        </p>
      ) : (
        <ul className="sheet-list">
          {shown.map((sheet) => {
            const current = sheet.circuit === circuit && sameSetup(sheet.setup, setup)
            const comparing = compare.includes(sheet.id)
            return (
              <li key={sheet.id} className={`sheet-row ${current ? 'current' : ''}`}>
                <label className="sheet-check" title="Compare">
                  <input
                    type="checkbox"
                    checked={comparing}
                    onChange={() => toggleCompare(sheet.id)}
                    aria-label={`Compare ${sheet.name}`}
                  />
                </label>
                <span
                  className="tyre-dot"
                  style={{ '--tyre': TYRES[sheet.setup.tyre].colour } as CSSProperties}
                  aria-hidden="true"
                />
                {renaming?.id === sheet.id ? (
                  <input
                    className="sheet-input sheet-rename"
                    type="text"
                    maxLength={MAX_SHEET_NAME}
                    value={renaming.draft}
                    autoFocus
                    aria-label="New sheet name"
                    onChange={(event) => setRenaming({ id: sheet.id, draft: event.target.value })}
                    onBlur={() => {
                      renameSheet(sheet.id, renaming.draft)
                      setRenaming(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === 'Escape') {
                        event.preventDefault()
                        if (event.key === 'Enter') renameSheet(sheet.id, renaming.draft)
                        setRenaming(null)
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="sheet-name"
                    title="Rename"
                    onClick={() => setRenaming({ id: sheet.id, draft: sheet.name })}
                  >
                    {sheet.name}
                    {current ? <span className="sheet-current"> · on the car</span> : null}
                  </button>
                )}
                <span className="sheet-meta">
                  {allCircuits ? `${CIRCUIT_DEFINITIONS[sheet.circuit].name} · ` : ''}
                  <code>{encodeSetup(sheet.setup)}</code>
                </span>
                <span className="sheet-lap">
                  {sheet.bestMs === null ? '--:--.---' : formatLap(sheet.bestMs)}
                </span>
                <button
                  type="button"
                  className="hud-btn tiny"
                  disabled={current}
                  onClick={() => loadSheet(sheet.id)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="hud-btn tiny danger"
                  aria-label={`Delete ${sheet.name}`}
                  onClick={() => {
                    deleteSheet(sheet.id)
                    setCompare((list) => list.filter((entry) => entry !== sheet.id))
                    notify(`Sheet "${sheet.name}" deleted`)
                  }}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <table className="compare-table">
          <caption className="visually-hidden">
            Compare setups: the car now against the sheets ticked above
          </caption>
          <thead>
            <tr>
              <th scope="col" />
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.title}
                  {column.sheet && !sameSetup(column.sheet.setup, setup) ? (
                    <button
                      type="button"
                      className="hud-btn tiny"
                      onClick={() => loadSheet(column.sheet?.id ?? '')}
                    >
                      Load
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const scores = row.best ? columns.map(row.best) : null
              const target = scores
                ? row.higherIsBetter
                  ? Math.max(...scores)
                  : Math.min(...scores)
                : null
              const ties = scores ? scores.filter((score) => score === target).length : 0
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {columns.map((column, index) => {
                    const highlight =
                      scores !== null &&
                      ties < columns.length &&
                      scores[index] === target &&
                      Number.isFinite(target)
                    return (
                      <td key={column.key} className={highlight ? 'best' : ''}>
                        {row.value(column)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="share-row">
        <span className="label">Share</span>
        <code className="share-code">{currentCode}</code>
        <button type="button" className="hud-btn tiny" onClick={() => copy(currentCode, 'Code')}>
          Copy code
        </button>
        <button
          type="button"
          className="hud-btn tiny"
          onClick={() => copy(setupLink(setup), 'Link')}
        >
          Copy link
        </button>
        <input
          className="sheet-input share-input"
          type="text"
          placeholder="Paste a code, e.g. f7r8h2b6s"
          aria-label="Setup code to load"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applyCode()
            }
          }}
        />
        <button type="button" className="hud-btn tiny" disabled={!code.trim()} onClick={applyCode}>
          Load code
        </button>
        <span className="share-spacer" />
        <button
          type="button"
          className="hud-btn tiny"
          disabled={sheets.length === 0}
          onClick={() => download('open-wheel-workshop-setups.json', sheetsToFile(sheets))}
        >
          Export JSON
        </button>
        <button type="button" className="hud-btn tiny" onClick={() => fileInput.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onImport}
        />
      </div>
    </section>
  )
}
