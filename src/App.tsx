import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createGoogleIdTokenProvider } from './googleIdentity'
import { resolveRuntimeConfig, type RuntimeConfig } from './runtimeConfig'
import { applySyncFailure, applySyncResponse, getSyncStatus } from './syncQueue'
import { createSyncTransport, type Fetcher, type TokenProvider } from './syncTransport'
import {
  ACTIONS,
  type ActionGroup,
  type AppState,
  type StudentImportPreview,
  type PreparationStatus,
  type Student,
  addLessonNote,
  applyObservation,
  confirmStudentImport,
  createClassRecord,
  chooseRandomStudent,
  createInitialState,
  getTopWorkSignals,
  migrateStoredState,
  previewStudentImport,
  selectClass,
  startLessonSession,
  endActiveLessonSession,
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
type MainView = 'live' | 'classes' | 'overview'

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

function firstLetter(student: Student) {
  return student.name.trim().charAt(0).toLocaleUpperCase('nl-NL')
}

function alphabetized(students: Student[]) {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nl-NL', { sensitivity: 'base' }))
}

function AlphabetNav({ students, prefix }: { students: Student[]; prefix: 'attendance' | 'preparation' }) {
  const letters = [...new Set(alphabetized(students).map(firstLetter))]
  return <nav className="alphabet-nav" aria-label="Alfabetische navigatie">{letters.map((letter) => <a key={letter} href={`#${prefix}-${letter}`} aria-label={letter}>{letter}</a>)}</nav>
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
  const studentNotes = state.notes.filter((note) => note.classId === state.activeClassId && note.studentId === student.id)
  const noteCount = studentNotes.length
  const hasImportantNote = studentNotes.some((note) => note.important)
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
      <button type="button" className={`notes-link ${hasImportantNote ? 'important' : ''}`} onClick={onNotes} aria-label={`Notities van ${student.name}`}>{hasImportantNote && <span aria-hidden="true">★ </span>}Notities {noteCount ? `(${noteCount})` : ''}</button>
    </article>
  )
}

function AttendanceGrid({ state, onChange, onFinish }: {
  state: AppState
  onChange: (studentId: string, status: 'present' | 'absent' | 'late') => void
  onFinish: () => void
}) {
  const students = alphabetized(state.students)
  return (
    <>
      <section className="section-heading compact-heading">
        <div><p className="eyebrow">Start van de les</p><h2>Aanwezigheid</h2></div>
        <button type="button" className="random" onClick={onFinish}>Aanwezigheid afronden</button>
      </section>
      <AlphabetNav students={students} prefix="attendance" />
      <section className="attendance-grid">
        {students.map((student, index) => {
          const letter = firstLetter(student)
          const startsLetter = index === 0 || firstLetter(students[index - 1]) !== letter
          return (
            <article id={startsLetter ? `attendance-${letter}` : undefined} className={`attendance-card ${!student.present ? 'absent' : ''}`} key={student.id}>
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
          )
        })}
      </section>
    </>
  )
}

function PreparationGrid({ state, onChange }: {
  state: AppState
  onChange: (studentId: string, field: 'homework' | 'materials', status: PreparationStatus) => void
}) {
  const students = alphabetized(state.students)
  return (
    <>
      <section className="section-heading compact-heading">
        <div><p className="eyebrow">Snelle controle</p><h2>Huiswerk & spullen</h2></div>
        <p>Tik alleen afwijkingen of bevestig wat je hebt gecontroleerd.</p>
      </section>
      <AlphabetNav students={students} prefix="preparation" />
      <section className="preparation-grid">
        {students.map((student, index) => {
          const letter = firstLetter(student)
          const startsLetter = index === 0 || firstLetter(students[index - 1]) !== letter
          return (
            <article id={startsLetter ? `preparation-${letter}` : undefined} className="preparation-card" key={student.id} data-testid={`${student.id}-preparation`}>
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
          )
        })}
      </section>
    </>
  )
}


function parseImportText(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const [headerLine, ...dataLines] = lines
  const headers = headerLine.split(/[;,\t]/).map((header) => header.trim().toLocaleLowerCase('nl-NL'))
  return dataLines.map((line) => {
    const cells = line.split(/[;,\t]/).map((cell) => cell.trim())
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  })
}


type AppProps = {
  runtimeConfig?: RuntimeConfig
  tokenProvider?: TokenProvider
  fetcher?: Fetcher
}

function App({ runtimeConfig: configuredRuntime, tokenProvider: configuredTokenProvider, fetcher }: AppProps = {}) {
  const runtimeConfig = useMemo(() => configuredRuntime ?? resolveRuntimeConfig(), [configuredRuntime])
  const tokenProvider = useMemo(() => configuredTokenProvider ?? (
    runtimeConfig.googleClientId ? createGoogleIdTokenProvider(runtimeConfig.googleClientId) : async () => null
  ), [configuredTokenProvider, runtimeConfig.googleClientId])
  const transport = useMemo(() => createSyncTransport(runtimeConfig, tokenProvider, fetcher), [runtimeConfig, tokenProvider, fetcher])
  const [state, setState] = useState<AppState>(loadState)
  const [mainView, setMainView] = useState<MainView>('live')
  const [view, setView] = useState<View>('attendance')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [showImportantNotes, setShowImportantNotes] = useState(false)
  const [randomId, setRandomId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteImportant, setNoteImportant] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [classNameDraft, setClassNameDraft] = useState('')
  const [schoolYearDraft, setSchoolYearDraft] = useState('2026-2027')
  const [importText, setImportText] = useState('naam\nTest Leerling 1\nNoah B.')
  const [importFictitious, setImportFictitious] = useState(false)
  const [importPreview, setImportPreview] = useState<StudentImportPreview | null>(null)
  const [overviewStudentId, setOverviewStudentId] = useState('')
  const [overviewSessionId, setOverviewSessionId] = useState('all')

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  useEffect(() => {
    setOverviewStudentId('')
    setOverviewSessionId('all')
  }, [state.activeClassId])
  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])
  useEffect(() => {
    const candidates = state.syncQueue.filter((operation) => operation.status === 'pending')
    if (!runtimeConfig.syncEnabled || !isOnline || !candidates.length) return
    let active = true
    void transport(candidates)
      .then((response) => { if (active) setState((current) => applySyncResponse(current, response)) })
      .catch((error) => { if (active) setState((current) => applySyncFailure(current, candidates.map((operation) => operation.id), error)) })
    return () => { active = false }
  }, [isOnline, runtimeConfig.syncEnabled, state, transport])

  const selected = state.students.find((student) => student.id === selectedId) ?? null
  const historyStudent = state.students.find((student) => student.id === historyId) ?? null
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId)
  const activeSessionObservations = state.observations.filter((observation) => observation.classId === state.activeClassId && observation.sessionId === state.activeSessionId)
  const latest = activeSessionObservations.at(-1)
  const latestStudent = state.students.find((student) => student.id === latest?.studentId)
  const latestAction = ACTIONS.find((action) => action.id === latest?.actionId)
  const groups = useMemo(() => (['answer', 'work', 'behaviour'] as ActionGroup[]).map((group) => ({ group, actions: ACTIONS.filter((action) => action.group === group) })), [])
  const importantNotes = state.notes.filter((note) => note.classId === state.activeClassId && note.important).slice().reverse()
  const syncStatus = getSyncStatus(state)
  const hasActiveSession = Boolean(activeSession && !activeSession.endedAt)
  const overviewSessions = state.sessions.filter((session) => session.classId === state.activeClassId)
  const overviewStudent = state.students.find((student) => student.id === overviewStudentId) ?? null
  const overviewObservations = state.observations.filter((observation) =>
    observation.classId === state.activeClassId &&
    observation.studentId === overviewStudentId &&
    (overviewSessionId === 'all' || observation.sessionId === overviewSessionId),
  )
  const overviewNotes = state.notes.filter((note) =>
    note.classId === state.activeClassId &&
    note.studentId === overviewStudentId &&
    (overviewSessionId === 'all' || note.sessionId === overviewSessionId),
  ).slice().reverse()
  const answerCount = (actionId: 'correct' | 'incorrect' | 'almostCorrect' | 'unanswered') => overviewObservations.filter((observation) => observation.actionId === actionId).length
  const overviewTurns = overviewObservations.filter((observation) => ['correct', 'incorrect', 'almostCorrect', 'unanswered'].includes(observation.actionId)).length

  const openObservation = (studentId: string) => {
    setNoteText('')
    setNoteImportant(false)
    setSelectedId(studentId)
  }

  const record = (actionId: Parameters<typeof applyObservation>[2]) => {
    if (!selectedId) return
    setState((current) => applyObservation(current, selectedId, actionId))
    setSelectedId(null)
  }
  const randomize = () => {
    const id = chooseRandomStudent(state)
    setRandomId(id)
    if (id) openObservation(id)
    else setSelectedId(null)
  }
  const saveNote = () => {
    if (!selectedId || !noteText.trim()) return
    setState((current) => addLessonNote(current, selectedId, noteText, undefined, noteImportant))
    setNoteText('')
    setNoteImportant(false)
  }
  const openHistory = (studentId: string) => {
    setSelectedId(null)
    setHistoryId(studentId)
  }
  const addClass = () => {
    setState((current) => createClassRecord(current, classNameDraft, schoolYearDraft))
    setClassNameDraft('')
  }
  const showImportPreview = () => {
    setImportPreview(previewStudentImport(state, parseImportText(importText), importFictitious))
  }
  const loadImportFile = async (file?: File) => {
    if (!file) return
    setImportText(await file.text())
    setImportPreview(null)
  }
  const confirmImport = () => {
    if (!importPreview) return
    setState((current) => confirmStudentImport(current, importPreview))
    setImportPreview(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">Live les</p><h1>{state.className}</h1></div>
        {mainView === 'live' && <div className="top-actions">
          <div className={`sync-pill ${isOnline ? 'online' : 'offline'}`} data-testid="pending-sync"><span className="status-dot" />{isOnline ? `${syncStatus.pending} wachtend` : `Offline · ${syncStatus.pending} wachtend`}{syncStatus.failed ? ` · ${syncStatus.failed} mislukt` : ''}{syncStatus.conflict ? ` · ${syncStatus.conflict} conflict` : ''}</div>
          {runtimeConfig.syncEnabled && syncStatus.failed > 0 && <button type="button" className="secondary" onClick={() => setState((current) => ({ ...current, syncQueue: current.syncQueue.map((operation) => operation.status === 'failed' ? { ...operation, status: 'pending' as const } : operation) }))}>Synchronisatie opnieuw proberen</button>}
          <button type="button" className="secondary important-overview-button" onClick={() => setShowImportantNotes(true)}>★ Belangrijke notities{importantNotes.length ? ` (${importantNotes.length})` : ''}</button>
          <button type="button" className="secondary" onClick={() => setState((current) => undoLastObservation(current))} disabled={!latest}>↶ Ongedaan maken</button>
          <button type="button" className="random" onClick={randomize}>✦ Kies leerling</button>
        </div>}
      </header>

      <nav className="main-nav" aria-label="Hoofdnavigatie">
        <button type="button" aria-current={mainView === 'live' ? 'page' : undefined} onClick={() => setMainView('live')}>Live</button>
        <button type="button" aria-current={mainView === 'classes' ? 'page' : undefined} onClick={() => setMainView('classes')}>Klassen</button>
        <button type="button" aria-current={mainView === 'overview' ? 'page' : undefined} onClick={() => setMainView('overview')}>Overzicht</button>
      </nav>

      <main>
        {mainView === 'live' && <>
        <section className="session-strip" aria-label="Lessessie">
          <div><strong>{hasActiveSession ? 'Actieve sessie' : 'Geen actieve sessie'}</strong><span>{new Date(state.sessionStartedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} gestart</span></div>
          <div><strong>{state.students.filter((student) => student.present).length}/{state.students.length}</strong><span>aanwezig</span></div>
          <div><strong>{activeSessionObservations.length}</strong><span>{activeSessionObservations.length === 1 ? 'observatie in deze sessie' : 'observaties in deze sessie'}</span></div>
          {latest && <div className="latest"><strong>Laatste</strong><span>{latestStudent?.name} · {latestAction?.shortLabel}</span></div>}
        </section>
        <div className="lesson-actions">
          <button type="button" className="secondary" onClick={() => setState((current) => endActiveLessonSession(current))} disabled={!hasActiveSession}>Les beëindigen</button>
          <button type="button" className="random" onClick={() => setState((current) => startLessonSession(current))}>Nieuwe les starten</button>
        </div>

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
            {state.students.filter((student) => student.present).map((student) => <StudentCard key={student.id} student={student} state={state} selected={student.id === selectedId} highlighted={student.id === randomId} onSelect={() => { openObservation(student.id); setRandomId(null) }} onNotes={() => openHistory(student.id)} />)}
          </section>
        </>}
        </>}
        {mainView === 'classes' && <section className="classes-view">
          <div className="section-heading"><div><p className="eyebrow">Beheer</p><h2>Klassen</h2></div><p>Gebruik hier uitsluitend fictieve testdata. De publieke prototype-opslag is niet bedoeld voor echte leerlinggegevens.</p></div>
          <section className="class-create">
            <label>Klasnaam<input aria-label="Klasnaam" value={classNameDraft} onChange={(event) => setClassNameDraft(event.target.value)} /></label>
            <label>Schooljaar<input aria-label="Schooljaar" value={schoolYearDraft} onChange={(event) => setSchoolYearDraft(event.target.value)} /></label>
            <button type="button" className="random" onClick={addClass} disabled={!classNameDraft.trim()}>Klas toevoegen</button>
          </section>
          <section className="class-list" aria-label="Klassenlijst">
            {state.classes.map((classRecord) => <article key={classRecord.id} className={classRecord.id === state.activeClassId ? 'selected-class' : ''}>
              <div><strong>{classRecord.name}</strong><span>{classRecord.schoolYear} · {classRecord.students.length} leerlingen</span></div>
              <button type="button" className="secondary" onClick={() => setState((current) => selectClass(current, classRecord.id))}>{classRecord.name} selecteren</button>
            </article>)}
          </section>
          <section className="import-panel">
            <h3>CSV/TSV import-preview</h3>
            <p className="warning-copy">Alleen fictieve testdata. Echte leerlinggegevens zijn geblokkeerd in deze publieke prototype-flow.</p>
            <label className="fictitious-check"><input type="checkbox" aria-label="Ik gebruik alleen fictieve testdata" checked={importFictitious} onChange={(event) => setImportFictitious(event.target.checked)} /> Ik gebruik alleen fictieve testdata</label>
            <label>CSV/TSV-bestand<input aria-label="CSV of TSV kiezen" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={(event) => void loadImportFile(event.target.files?.[0])} /></label>
            <p className="field-help">Excel: sla het werkblad eerst op als CSV. Rechtstreekse .xlsx-import volgt pas na goedkeuring van de benodigde parser.</p>
            <label>Importgegevens plakken of controleren<textarea aria-label="Importgegevens" value={importText} onChange={(event) => setImportText(event.target.value)} /></label>
            <button type="button" className="secondary" onClick={showImportPreview}>Import voorbeeld bekijken</button>
            {importPreview?.guardError && <p className="import-error">{importPreview.guardError}</p>}
            {importPreview && importPreview.rows.length > 0 && <div className="import-preview"><table><thead><tr><th>Rij</th><th>Naam</th><th>Status</th></tr></thead><tbody>{importPreview.rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.name}</td><td>{row.valid ? 'Geldig' : row.errors.map((error) => <span key={error}>{error}</span>)}</td></tr>)}</tbody></table><button type="button" className="random" onClick={confirmImport} disabled={!importPreview.canConfirm}>Import bevestigen</button></div>}
          </section>
        </section>}
        {mainView === 'overview' && <section className="overview-view">
          <div className="section-heading"><div><p className="eyebrow">Rapportage</p><h2>Leerlingoverzicht</h2></div><p>Iedere kleur en conclusie blijft herleidbaar tot de onderliggende observaties.</p></div>
          <section className="overview-filters" aria-label="Overzichtsfilters">
            <label>Leerling<select aria-label="Leerling" value={overviewStudentId} onChange={(event) => setOverviewStudentId(event.target.value)}><option value="">Kies een leerling</option>{alphabetized(state.students).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
            <label>Lessessie<select aria-label="Lessessie" value={overviewSessionId} onChange={(event) => setOverviewSessionId(event.target.value)}><option value="all">Alle lessen</option>{overviewSessions.map((session) => <option key={session.id} value={session.id}>Les van {new Date(session.startedAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</option>)}</select></label>
          </section>
          {overviewStudent ? <>
            <section className="overview-heading"><span className="selected-avatar">{overviewStudent.initials}</span><div><p className="eyebrow">Geselecteerde leerling</p><h3>{overviewStudent.name}</h3></div></section>
            <section className="overview-metrics" aria-label="Antwoordaantallen">
              <article><strong data-testid="overview-turns">{overviewTurns}</strong><span>Beurten</span></article>
              <article><strong data-testid="overview-correct">{answerCount('correct')}</strong><span>Goed</span></article>
              <article><strong data-testid="overview-incorrect">{answerCount('incorrect')}</strong><span>Fout</span></article>
              <article><strong data-testid="overview-almost-correct">{answerCount('almostCorrect')}</strong><span>Bijna goed</span></article>
              <article><strong data-testid="overview-unanswered">{answerCount('unanswered')}</strong><span>Geen antwoord</span></article>
            </section>
            <section className="overview-detail-grid">
              <div><h3>Observaties</h3>{overviewObservations.length ? <div className="overview-log">{overviewObservations.slice().reverse().map((observation) => <article key={observation.id}><time>{new Date(observation.createdAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</time><strong>{ACTIONS.find((action) => action.id === observation.actionId)?.label ?? observation.actionId}</strong><span>{observation.points > 0 ? '+' : ''}{observation.points} punt</span></article>)}</div> : <p className="empty-state">Geen observaties binnen deze selectie.</p>}</div>
              <div><h3>Notities</h3>{overviewNotes.length ? <div className="overview-log">{overviewNotes.map((note) => <article className={note.important ? 'important-note' : ''} key={note.id}><time>{new Date(note.createdAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</time><p>{note.text}</p></article>)}</div> : <p className="empty-state">Geen notities binnen deze selectie.</p>}</div>
            </section>
          </> : <p className="empty-state overview-empty">Kies een leerling om aantallen, bronobservaties en notities te bekijken.</p>}
        </section>}
      </main>

      {selected && (
        <div className="action-backdrop" onClick={() => setSelectedId(null)}>
          <aside className="action-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} aria-label={`Observatie voor ${selected.name}`}>
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
                  const count = activeSessionObservations.filter((observation) => observation.studentId === selected.id && observation.actionId === action.id).length
                  return <button key={action.id} type="button" className={`action-button points-${Math.sign(action.points)}`} onClick={() => record(action.id)} aria-label={action.label}><span>{action.shortLabel}{count > 0 && <small>{count}×</small>}</span><b>{action.points > 0 ? '+' : ''}{action.points}</b></button>
                })}</div></section>)}</div>
                <section className="note-composer">
                  <label htmlFor="lesson-note">Lesnotitie</label>
                  <textarea id="lesson-note" aria-label="Lesnotitie" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Korte feitelijke notitie voor deze les…" />
                  <label className={`important-toggle ${noteImportant ? 'checked' : ''}`}><input type="checkbox" aria-label="Belangrijke notitie" checked={noteImportant} onChange={(event) => setNoteImportant(event.target.checked)} /> <span>★ Belangrijke notitie</span><small>Markeer geel in het live-overzicht</small></label>
                  <div><button type="button" className="secondary" aria-label="Notitiegeschiedenis openen" onClick={() => openHistory(selected.id)}>Notities van {selected.name}</button><button type="button" className="random" onClick={saveNote} disabled={!noteText.trim()}>Notitie bewaren</button></div>
                </section>
              </>
            )}
          </aside>
        </div>
      )}

      {historyStudent && (
        <div className="action-backdrop" onClick={() => setHistoryId(null)}>
          <aside className="history-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} aria-label={`Notitiegeschiedenis van ${historyStudent.name}`}>
            <div className="panel-heading"><div className="selected-avatar">{historyStudent.initials}</div><div><p className="eyebrow">Notitiegeschiedenis</p><h2>{historyStudent.name}</h2></div><button type="button" className="close" onClick={() => setHistoryId(null)} aria-label="Sluiten">×</button></div>
            <div className="note-history">{state.notes.filter((note) => note.classId === state.activeClassId && note.studentId === historyStudent.id).length ? state.notes.filter((note) => note.classId === state.activeClassId && note.studentId === historyStudent.id).slice().reverse().map((note) => <article className={note.important ? 'important-note' : ''} key={note.id}><time>{new Date(note.createdAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</time>{note.important && <strong className="important-label">★ Belangrijk</strong>}<p>{note.text}</p></article>) : <p className="empty-state">Nog geen notities.</p>}</div>
          </aside>
        </div>
      )}

      {showImportantNotes && (
        <div className="action-backdrop" onClick={() => setShowImportantNotes(false)}>
          <aside className="history-panel important-overview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} aria-label="Belangrijke notities van de klas">
            <div className="panel-heading"><div className="selected-avatar">★</div><div><p className="eyebrow">Klasoverzicht</p><h2>Belangrijke notities</h2></div><button type="button" className="close" onClick={() => setShowImportantNotes(false)} aria-label="Sluiten">×</button></div>
            <div className="note-history">{importantNotes.length ? importantNotes.map((note) => {
              const student = state.students.find((candidate) => candidate.id === note.studentId)
              return <article className="important-note" key={note.id}><strong>{student?.name ?? 'Onbekende leerling'}</strong><time>{new Date(note.createdAt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}</time><p>{note.text}</p></article>
            }) : <p className="empty-state">Nog geen belangrijke notities.</p>}</div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
