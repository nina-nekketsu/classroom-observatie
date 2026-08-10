import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  ACTIONS,
  type ActionGroup,
  type AppState,
  type PreparationStatus,
  type Student,
  addLessonNote,
  applyObservation,
  chooseRandomStudent,
  createInitialState,
  getTopWorkSignals,
  migrateStoredState,
  setAttendance,
  setPreparationStatus,
  undoLastObservation,
} from './domain'

const STORAGE_KEY = 'lydia-classroom-observation-v2'
const LEGACY_STORAGE_KEY = 'lydia-classroom-observation-v1'
const GROUP_LABELS: Record<ActionGroup, string> = {
  answer: 'Antwoorden',
  work: 'Werkhouding & tempo',
  behaviour: 'Gedrag & waarschuwingen',
}
type View = 'attendance' | 'live' | 'preparation'

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    return stored ? migrateStoredState(JSON.parse(stored)) : createInitialState()
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

function StatusMark({ status }: { status: PreparationStatus }) {
  if (status === 'ok') return <span className="status-mark ok">Oké</span>
  if (status === 'missing') return <span className="status-mark missing">Mist</span>
  return <span className="status-mark">Niet gecheckt</span>
}

function StudentCard({ student, state, selected, highlighted, onSelect, onNotes }: {
  student: Student
  state: AppState
  selected: boolean
  highlighted: boolean
  onSelect: () => void
  onNotes: () => void
}) {
  const signals = getTopWorkSignals(state, student.id)
  const noteCount = state.notes.filter((note) => note.studentId === student.id).length
  return (
    <article className={`student-card ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${!student.present ? 'absent' : ''}`}>
      <button className="student-main" type="button" onClick={onSelect} aria-label={`${student.name} selecteren`}>
        <span className="avatar">{student.initials}</span>
        <span className="student-copy">
          <span className="name-line"><strong>{student.name}</strong>{student.late && <em>Te laat</em>}{!student.present && <em>Afwezig</em>}</span>
          <span className="answer-stats">
            <b>{student.turns}</b> beurt · <b>{student.correct}</b> goed · <b data-testid={`${student.id}-answer-points`}>{student.answerPoints}</b> punt
          </span>
          <span className="signal-line">{signals.length ? signals.join(' · ') : 'Nog geen werkhoudingssignalen'}</span>
        </span>
        <span className={`score ${scoreTone(student.score)}`} data-testid={`${student.id}-score`}>{student.score > 0 ? '+' : ''}{student.score}</span>
      </button>
      <button type="button" className="notes-link" onClick={onNotes} aria-label={`Notities van ${student.name}`}>Notities {noteCount ? `(${noteCount})` : ''}</button>
    </article>
  )
}

function AttendanceGrid({ state, onChange, onFinish }: {
  state: AppState
  onChange: (studentId: string, status: 'present' | 'absent' | 'late') => void
  onFinish: () => void
}) {
  return (
    <>
      <section className="section-heading compact-heading">
        <div><p className="eyebrow">Start van de les</p><h2>Aanwezigheid</h2></div>
        <button type="button" className="random" onClick={onFinish}>Aanwezigheid afronden</button>
      </section>
      <section className="attendance-grid">
        {state.students.map((student) => (
          <article className={`attendance-card ${!student.present ? 'absent' : ''}`} key={student.id}>
            <span className="avatar">{student.initials}</span>
            <strong>{student.name}</strong>
            {student.present ? (
              <button type="button" className="attendance-toggle" onClick={() => onChange(student.id, 'absent')} aria-label={`${student.name} afwezig melden`}>Aanwezig</button>
            ) : (
              <div className="attendance-options">
                <button type="button" onClick={() => onChange(student.id, 'present')} aria-label={`${student.name} aanwezig melden`}>Aanwezig</button>
                <button type="button" onClick={() => onChange(student.id, 'late')} aria-label={`${student.name} te laat melden`}>Te laat</button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  )
}

function PreparationGrid({ state, onChange }: {
  state: AppState
  onChange: (studentId: string, field: 'homework' | 'materials', status: PreparationStatus) => void
}) {
  return (
    <>
      <section className="section-heading compact-heading">
        <div><p className="eyebrow">Snelle controle</p><h2>Huiswerk & spullen</h2></div>
        <p>Tik alleen afwijkingen of bevestig wat je hebt gecontroleerd.</p>
      </section>
      <section className="preparation-grid">
        {state.students.map((student) => (
          <article className="preparation-card" key={student.id} data-testid={`${student.id}-preparation`}>
            <div className="prep-student"><span className="avatar">{student.initials}</span><strong>{student.name}</strong></div>
            <div className="prep-row"><span>Huiswerk</span><StatusMark status={student.homework} /><div>
              <button type="button" onClick={() => onChange(student.id, 'homework', 'ok')} aria-label={`${student.name} huiswerk in orde`}>✓</button>
              <button type="button" onClick={() => onChange(student.id, 'homework', 'missing')} aria-label={`${student.name} huiswerk niet in orde`}>×</button>
            </div></div>
            <div className="prep-row"><span>Spullen</span><StatusMark status={student.materials} /><div>
              <button type="button" onClick={() => onChange(student.id, 'materials', 'ok')} aria-label={`${student.name} spullen in orde`}>✓</button>
              <button type="button" onClick={() => onChange(student.id, 'materials', 'missing')} aria-label={`${student.name} spullen niet in orde`}>×</button>
            </div></div>
            <span className="sr-only">{student.homework === 'missing' ? 'Huiswerk mist' : student.homework === 'ok' ? 'Huiswerk oké' : ''} {student.materials === 'missing' ? 'Spullen missen' : student.materials === 'ok' ? 'Spullen oké' : ''}</span>
          </article>
        ))}
      </section>
    </>
  )
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [view, setView] = useState<View>('attendance')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [randomId, setRandomId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  const selected = state.students.find((student) => student.id === selectedId) ?? null
  const historyStudent = state.students.find((student) => student.id === historyId) ?? null
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
  const saveNote = () => {
    if (!selectedId || !noteText.trim()) return
    setState((current) => addLessonNote(current, selectedId, noteText))
    setNoteText('')
  }
  const openHistory = (studentId: string) => {
    setSelectedId(null)
    setHistoryId(studentId)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">Live les</p><h1>{state.className}</h1></div>
        <div className="top-actions">
          <div className={`sync-pill ${isOnline ? 'online' : 'offline'}`} data-testid="pending-sync"><span className="status-dot" />{isOnline ? `${state.pendingSync} wachtend` : `Offline · ${state.pendingSync} wachtend`}</div>
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

        <nav className="view-tabs" role="tablist" aria-label="Live weergaven">
          <button role="tab" aria-selected={view === 'attendance'} onClick={() => setView('attendance')}>Aanwezigheid</button>
          <button role="tab" aria-selected={view === 'live'} onClick={() => setView('live')}>Live observaties</button>
          <button role="tab" aria-label="Huiswerk & spullen" aria-selected={view === 'preparation'} onClick={() => setView('preparation')}>Huiswerk/spullen</button>
        </nav>

        {view === 'attendance' && <AttendanceGrid state={state} onChange={(id, status) => setState((current) => setAttendance(current, id, status))} onFinish={() => setView('live')} />}
        {view === 'preparation' && <PreparationGrid state={state} onChange={(id, field, status) => setState((current) => setPreparationStatus(current, id, field, status))} />}
        {view === 'live' && <>
          <section className="section-heading"><div><p className="eyebrow">Klasoverzicht</p><h2>Kies eerst een leerling</h2></div><p>Beurten, vraagpunten en opvallende werkhouding blijven in beeld.</p></section>
          <section className="student-grid">
            {state.students.map((student) => <StudentCard key={student.id} student={student} state={state} selected={student.id === selectedId} highlighted={student.id === randomId} onSelect={() => { setSelectedId(student.id); setRandomId(null) }} onNotes={() => openHistory(student.id)} />)}
          </section>
        </>}
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
            {!selected.present ? (
              <section className="return-panel"><p>Deze leerling staat afwezig. Herstel de aanwezigheid of registreer dat de leerling te laat binnenkwam.</p><div><button type="button" onClick={() => { setState((current) => setAttendance(current, selected.id, 'present')); setSelectedId(null) }}>Aanwezig</button><button type="button" className="random" onClick={() => { setState((current) => setAttendance(current, selected.id, 'late')); setSelectedId(null) }}>Aanwezig en te laat</button></div></section>
            ) : (
              <>
                <div className="action-groups">{groups.map(({ group, actions }) => <section key={group}><h3>{GROUP_LABELS[group]}</h3><div className="action-grid">{actions.map((action) => {
                  const count = state.observations.filter((observation) => observation.studentId === selected.id && observation.actionId === action.id).length
                  return <button key={action.id} type="button" className={`action-button points-${Math.sign(action.points)}`} onClick={() => record(action.id)} aria-label={action.label}><span>{action.shortLabel}{count > 0 && <small>{count}×</small>}</span><b>{action.points > 0 ? '+' : ''}{action.points}</b></button>
                })}</div></section>)}</div>
                <section className="note-composer"><label htmlFor="lesson-note">Lesnotitie</label><textarea id="lesson-note" aria-label="Lesnotitie" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Korte feitelijke notitie voor deze les…" /><div><button type="button" className="secondary" aria-label="Notitiegeschiedenis openen" onClick={() => openHistory(selected.id)}>Notities van {selected.name}</button><button type="button" className="random" onClick={saveNote} disabled={!noteText.trim()}>Notitie bewaren</button></div></section>
              </>
            )}
          </aside>
        </div>
      )}

      {historyStudent && (
        <div className="action-backdrop" onClick={() => setHistoryId(null)}>
          <aside className="history-panel" onClick={(event) => event.stopPropagation()} aria-label={`Notitiegeschiedenis van ${historyStudent.name}`}>
            <div className="panel-heading"><div className="selected-avatar">{historyStudent.initials}</div><div><p className="eyebrow">Notitiegeschiedenis</p><h2>{historyStudent.name}</h2></div><button type="button" className="close" onClick={() => setHistoryId(null)} aria-label="Sluiten">×</button></div>
            <div className="note-history">{state.notes.filter((note) => note.studentId === historyStudent.id).length ? state.notes.filter((note) => note.studentId === historyStudent.id).slice().reverse().map((note) => <article key={note.id}><time>{new Date(note.createdAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</time><p>{note.text}</p></article>) : <p className="empty-state">Nog geen notities.</p>}</div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
