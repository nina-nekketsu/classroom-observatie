import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ACTIONS, type ActionGroup, type AppState, type Student, applyObservation, chooseRandomStudent, createInitialState, toggleAttendance, undoLastObservation } from './domain'

const STORAGE_KEY = 'lydia-classroom-observation-v1'
const GROUP_LABELS: Record<ActionGroup, string> = {
  answer: 'Antwoord',
  work: 'Werkhouding',
  behaviour: 'Gedrag & voorbereiding',
}

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as AppState : createInitialState()
  } catch {
    return createInitialState()
  }
}

function scoreTone(score: number) {
  if (score >= 2) return 'positive'
  if (score <= -2) return 'negative'
  if (score < 0) return 'warning'
  return 'neutral'
}

function StudentCard({ student, selected, highlighted, onSelect, onAttendance }: {
  student: Student
  selected: boolean
  highlighted: boolean
  onSelect: () => void
  onAttendance: () => void
}) {
  return (
    <article className={`student-card ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${!student.present ? 'absent' : ''}`}>
      <button className="student-main" type="button" onClick={onSelect} aria-label={`${student.name} selecteren`} disabled={!student.present}>
        <span className="avatar">{student.initials}</span>
        <span className="student-copy">
          <strong>{student.name}</strong>
          <span>{student.turns} beurten · {student.correct} goed</span>
        </span>
        <span className={`score ${scoreTone(student.score)}`} data-testid={`${student.id}-score`}>{student.score > 0 ? '+' : ''}{student.score}</span>
      </button>
      <button type="button" className="attendance" onClick={onAttendance} aria-label={`${student.name} ${student.present ? 'afwezig melden' : 'aanwezig melden'}`}>
        {student.present ? 'Aanwezig' : 'Afwezig'}
      </button>
    </article>
  )
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [randomId, setRandomId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const selected = state.students.find((student) => student.id === selectedId) ?? null
  const latest = state.observations.at(-1)
  const latestStudent = state.students.find((student) => student.id === latest?.studentId)
  const latestAction = ACTIONS.find((action) => action.id === latest?.actionId)
  const groups = useMemo(() => (['answer', 'work', 'behaviour'] as ActionGroup[]).map((group) => ({ group, actions: ACTIONS.filter((action) => action.group === group) })), [])

  const record = (actionId: Parameters<typeof applyObservation>[2]) => {
    if (!selectedId) return
    setState((current) => applyObservation(current, selectedId, actionId))
    setSelectedId(null)
  }

  const randomize = () => {
    const id = chooseRandomStudent(state)
    setRandomId(id)
    setSelectedId(id)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Live les</p>
          <h1>{state.className}</h1>
        </div>
        <div className="top-actions">
          <div className={`sync-pill ${isOnline ? 'online' : 'offline'}`} data-testid="pending-sync">
            <span className="status-dot" />
            {isOnline ? `${state.pendingSync} wachtend` : `Offline · ${state.pendingSync} wachtend`}
          </div>
          <button type="button" className="secondary" onClick={() => setState((current) => undoLastObservation(current))} disabled={!latest}>↶ Ongedaan maken</button>
          <button type="button" className="random" onClick={randomize}>✦ Kies leerling</button>
        </div>
      </header>

      <main>
        <section className="session-strip" aria-label="Lessessie">
          <div><strong>Vandaag</strong><span>{new Date(state.sessionStartedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} gestart</span></div>
          <div><strong>{state.students.filter((student) => student.present).length}/{state.students.length}</strong><span>aanwezig</span></div>
          <div><strong>{state.observations.length}</strong><span>observaties</span></div>
          {latest && <div className="latest"><strong>Laatste</strong><span>{latestStudent?.name} · {latestAction?.shortLabel}</span></div>}
        </section>

        <section className="section-heading">
          <div><p className="eyebrow">Klasoverzicht</p><h2>Kies eerst een leerling</h2></div>
          <p>Tik daarna op één observatie. Geen administratie-acrobatiek.</p>
        </section>

        <section className="student-grid">
          {state.students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              selected={student.id === selectedId}
              highlighted={student.id === randomId}
              onSelect={() => { setSelectedId(student.id); setRandomId(null) }}
              onAttendance={() => { setState((current) => toggleAttendance(current, student.id)); if (selectedId === student.id) setSelectedId(null) }}
            />
          ))}
        </section>
      </main>

      {selected && (
        <div className="action-backdrop" onClick={() => setSelectedId(null)}>
          <aside className="action-panel" onClick={(event) => event.stopPropagation()} aria-label={`Observatie voor ${selected.name}`}>
            <div className="panel-handle" />
            <div className="panel-heading">
              <div className="selected-avatar">{selected.initials}</div>
              <div><p className="eyebrow">Observatie vastleggen</p><h2>{selected.name}</h2></div>
              <button type="button" className="close" onClick={() => setSelectedId(null)} aria-label="Sluiten">×</button>
            </div>
            <div className="action-groups">
              {groups.map(({ group, actions }) => (
                <section key={group}>
                  <h3>{GROUP_LABELS[group]}</h3>
                  <div className="action-grid">
                    {actions.map((action) => (
                      <button key={action.id} type="button" className={`action-button points-${Math.sign(action.points)}`} onClick={() => record(action.id)} aria-label={action.label}>
                        <span>{action.shortLabel}</span><b>{action.points > 0 ? '+' : ''}{action.points}</b>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
