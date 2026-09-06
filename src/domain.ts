export type ActionGroup = 'answer' | 'work' | 'behaviour'

export type ActionId =
  | 'correct'
  | 'incorrect'
  | 'almostCorrect'
  | 'unanswered'
  | 'focused'
  | 'offTask'
  | 'refusesWork'
  | 'device'
  | 'slowTempo'
  | 'normalTempo'
  | 'highTempo'
  | 'workFinished'
  | 'workUnfinished'
  | 'helps'
  | 'disrupts'
  | 'talking'
  | 'daydreaming'
  | 'warning'
  | 'warningFollowed'
  | 'warningIgnored'

export type ObservationAction = {
  id: ActionId
  label: string
  shortLabel: string
  group: ActionGroup
  points: number
}

export const ACTIONS: ObservationAction[] = [
  { id: 'correct', label: 'Goed antwoord', shortLabel: 'Goed', group: 'answer', points: 1 },
  { id: 'incorrect', label: 'Fout antwoord', shortLabel: 'Fout', group: 'answer', points: 0 },
  { id: 'almostCorrect', label: 'Bijna goed antwoord', shortLabel: 'Bijna goed', group: 'answer', points: 0 },
  { id: 'unanswered', label: 'Niet beantwoord', shortLabel: 'Geen antwoord', group: 'answer', points: 0 },
  { id: 'focused', label: 'Werkt geconcentreerd', shortLabel: 'Geconcentreerd', group: 'work', points: 1 },
  { id: 'offTask', label: 'Niet aan het werk', shortLabel: 'Niet aan werk', group: 'work', points: -1 },
  { id: 'refusesWork', label: 'Weigert werk', shortLabel: 'Weigert werk', group: 'work', points: -2 },
  { id: 'device', label: 'Afgeleid door device', shortLabel: 'Device-afleiding', group: 'work', points: -1 },
  { id: 'slowTempo', label: 'Laag werktempo', shortLabel: 'Laag tempo', group: 'work', points: -1 },
  { id: 'normalTempo', label: 'Normaal werktempo', shortLabel: 'Normaal tempo', group: 'work', points: 0 },
  { id: 'highTempo', label: 'Hoog werktempo', shortLabel: 'Hoog tempo', group: 'work', points: 1 },
  { id: 'workFinished', label: 'Werk afgekregen', shortLabel: 'Werk af', group: 'work', points: 1 },
  { id: 'workUnfinished', label: 'Werk niet afgekregen', shortLabel: 'Niet af', group: 'work', points: -1 },
  { id: 'helps', label: 'Helpt anderen', shortLabel: 'Helpt', group: 'behaviour', points: 1 },
  { id: 'disrupts', label: 'Verstoort de les', shortLabel: 'Verstoort', group: 'behaviour', points: -1 },
  { id: 'talking', label: 'Praat met buurleerling', shortLabel: 'Praat', group: 'behaviour', points: -1 },
  { id: 'daydreaming', label: 'Droomt weg / afgeleid', shortLabel: 'Droomt weg', group: 'behaviour', points: -1 },
  { id: 'warning', label: 'Waarschuwing gegeven', shortLabel: 'Waarschuwing', group: 'behaviour', points: 0 },
  { id: 'warningFollowed', label: 'Volgt waarschuwing op', shortLabel: 'Opgevolgd', group: 'behaviour', points: 1 },
  { id: 'warningIgnored', label: 'Volgt waarschuwing niet op', shortLabel: 'Niet opgevolgd', group: 'behaviour', points: -1 },
]

export type PreparationStatus = 'unchecked' | 'ok' | 'missing'
export type AttendanceStatus = 'present' | 'absent' | 'late'

export type Student = {
  id: string
  name: string
  initials: string
  present: boolean
  late: boolean
  score: number
  answerPoints: number
  turns: number
  correct: number
  incorrect: number
  unanswered: number
  homework: PreparationStatus
  materials: PreparationStatus
}

export type Observation = {
  id: string
  studentId: string
  classId?: string
  sessionId?: string
  actionId: ActionId
  points: number
  createdAt: string
  synced: boolean
}

export type LessonNote = {
  id: string
  studentId: string
  classId?: string
  sessionId?: string
  text: string
  important: boolean
  createdAt: string
  sessionStartedAt: string
}

export type ClassRecord = {
  id: string
  name: string
  schoolYear: string
  students: Student[]
  createdAt: string
}

export type LessonSession = {
  id: string
  classId: string
  startedAt: string
  endedAt?: string
}

export type ImportPreviewRow = {
  rowNumber: number
  name: string
  initials: string
  valid: boolean
  duplicate: boolean
  errors: string[]
}

export type StudentImportPreview = {
  rows: ImportPreviewRow[]
  canConfirm: boolean
  guardError?: string
}

import { operationFromObservation, type SyncOperation } from './syncQueue'

export type AppState = {
  className: string
  sessionStartedAt: string
  activeClassId: string
  activeSessionId: string
  classes: ClassRecord[]
  sessions: LessonSession[]
  students: Student[]
  observations: Observation[]
  notes: LessonNote[]
  syncQueue: SyncOperation[]
  pendingSync: number
}

const studentFixtures = [
  ['noah', 'Noah B.'], ['sara', 'Sara K.'], ['yassin', 'Yassin E.'], ['lina', 'Lina M.'],
  ['adam', 'Adam A.'], ['zoe', 'Zoë V.'], ['milan', 'Milan D.'], ['aya', 'Aya H.'],
  ['sam', 'Sam R.'], ['isa', 'Isa P.'], ['dani', 'Dani S.'], ['nora', 'Nora T.'],
  ['finn', 'Finn J.'], ['amina', 'Amina L.'], ['levi', 'Levi C.'], ['esra', 'Esra N.'],
  ['lucas', 'Lucas G.'], ['inaya', 'Inaya O.'], ['sem', 'Sem W.'], ['mae', 'Maë F.'],
  ['ryan', 'Ryan Z.'], ['lisa', 'Lisa Q.'], ['omar', 'Omar I.'], ['julia', 'Julia U.'],
  ['mees', 'Mees X.'], ['hana', 'Hana D.'], ['timo', 'Timo K.'], ['sofia', 'Sofia A.'],
  ['ilyas', 'Ilyas M.'], ['liv', 'Liv H.'], ['jayden', 'Jayden V.'], ['emma', 'Emma R.'],
] as const

function initialsFor(name: string) {
  return name.replace('.', '').split(/\s+/).map((part) => part[0]).join('').toUpperCase()
}

const sampleStudents: Student[] = studentFixtures.map(([id, name]) => ({
  id,
  name,
  initials: initialsFor(name),
  present: true,
  late: false,
  score: 0,
  answerPoints: 0,
  turns: 0,
  correct: 0,
  incorrect: 0,
  unanswered: 0,
  homework: 'unchecked',
  materials: 'unchecked',
}))

function cloneStudents(students: Student[]) {
  return students.map((student) => ({ ...student }))
}

function studentFromName(name: string, idPrefix = 'student'): Student {
  const cleanName = name.trim()
  const idBase = cleanName.toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || idPrefix
  return {
    id: idBase,
    name: cleanName,
    initials: initialsFor(cleanName),
    present: true,
    late: false,
    score: 0,
    answerPoints: 0,
    turns: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    homework: 'unchecked',
    materials: 'unchecked',
  }
}

function normalizeStoredStudent(value: Record<string, unknown>, fallbackId: string): Student {
  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'Test Leerling'
  const fallback = studentFromName(name, fallbackId)
  return {
    ...fallback,
    id: typeof value.id === 'string' && value.id ? value.id : fallback.id,
    initials: typeof value.initials === 'string' && value.initials ? value.initials : fallback.initials,
    present: typeof value.present === 'boolean' ? value.present : true,
    late: typeof value.late === 'boolean' ? value.late : false,
    score: typeof value.score === 'number' ? value.score : 0,
    answerPoints: typeof value.answerPoints === 'number' ? value.answerPoints : 0,
    turns: typeof value.turns === 'number' ? value.turns : 0,
    correct: typeof value.correct === 'number' ? value.correct : 0,
    incorrect: typeof value.incorrect === 'number' ? value.incorrect : 0,
    unanswered: typeof value.unanswered === 'number' ? value.unanswered : 0,
    homework: ['unchecked', 'ok', 'missing'].includes(String(value.homework)) ? value.homework as PreparationStatus : 'unchecked',
    materials: ['unchecked', 'ok', 'missing'].includes(String(value.materials)) ? value.materials as PreparationStatus : 'unchecked',
  }
}

function schoolYearFor(dateIso: string) {
  const date = new Date(dateIso)
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear()
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth()
  const start = month >= 7 ? year : year - 1
  return `${start}-${start + 1}`
}

function createSessionId(classId: string, startedAt: string) {
  return `${classId}-session-${startedAt}`
}

export function createInitialState(): AppState {
  const sessionStartedAt = new Date().toISOString()
  const classId = 'class-3m2-nask-2'
  const students = cloneStudents(sampleStudents)
  const sessionId = createSessionId(classId, sessionStartedAt)
  return {
    className: '3M2 · NaSk 2',
    sessionStartedAt,
    activeClassId: classId,
    activeSessionId: sessionId,
    classes: [{ id: classId, name: '3M2 · NaSk 2', schoolYear: schoolYearFor(sessionStartedAt), students: cloneStudents(students), createdAt: sessionStartedAt }],
    sessions: [{ id: sessionId, classId, startedAt: sessionStartedAt }],
    students,
    observations: [],
    notes: [],
    syncQueue: [],
    pendingSync: 0,
  }
}

function rebuildStudents(students: Student[], observations: Observation[]): Student[] {
  return students.map((original) => {
    const student = { ...original, score: 0, answerPoints: 0, turns: 0, correct: 0, incorrect: 0, unanswered: 0 }
    for (const observation of observations.filter((item) => item.studentId === student.id)) {
      student.score += observation.points
      if (['correct', 'incorrect', 'almostCorrect', 'unanswered'].includes(observation.actionId)) {
        student.turns += 1
        student.answerPoints += observation.points
      }
      if (observation.actionId === 'correct') student.correct += 1
      if (observation.actionId === 'incorrect') student.incorrect += 1
      if (observation.actionId === 'unanswered') student.unanswered += 1
    }
    return student
  })
}

function syncActiveClassStudents(state: AppState, students: Student[]): ClassRecord[] {
  return state.classes.map((classRecord) => classRecord.id === state.activeClassId ? { ...classRecord, students: cloneStudents(students) } : classRecord)
}

export function migrateStoredState(value: unknown): AppState {
  const defaults = createInitialState()
  if (!value || typeof value !== 'object') return defaults
  const source = value as Record<string, unknown>
  const rawStudents = Array.isArray(source.students) ? source.students.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
  const legacyById = new Map(rawStudents.filter((item) => typeof item.id === 'string').map((item) => [item.id as string, item]))
  const students = defaults.students.map((student) => {
    const legacy = legacyById.get(student.id)
    return legacy ? {
      ...student,
      ...legacy,
      id: student.id,
      name: typeof legacy.name === 'string' ? legacy.name : student.name,
      initials: typeof legacy.initials === 'string' ? legacy.initials : student.initials,
      present: typeof legacy.present === 'boolean' ? legacy.present : student.present,
      late: typeof legacy.late === 'boolean' ? legacy.late : false,
      homework: ['unchecked', 'ok', 'missing'].includes(String(legacy.homework)) ? legacy.homework as PreparationStatus : 'unchecked',
      materials: ['unchecked', 'ok', 'missing'].includes(String(legacy.materials)) ? legacy.materials as PreparationStatus : 'unchecked',
    } as Student : student
  })

  const validActionIds = new Set(ACTIONS.map((action) => action.id))
  const rawObservations = Array.isArray(source.observations) ? source.observations.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
  for (const item of rawObservations) {
    if ((item.actionId === 'homework' || item.actionId === 'materials') && typeof item.studentId === 'string') {
      const student = students.find((candidate) => candidate.id === item.studentId)
      if (student) student[item.actionId] = 'missing'
    }
  }
  const normalizedObservations = rawObservations.map((item) => item.actionId === 'neutral' ? { ...item, actionId: 'almostCorrect' } : item)
  const observations: Observation[] = normalizedObservations.filter((item) =>
    typeof item.id === 'string' &&
    typeof item.studentId === 'string' &&
    typeof item.actionId === 'string' &&
    validActionIds.has(item.actionId as ActionId) &&
    typeof item.points === 'number' &&
    typeof item.createdAt === 'string',
  ).map((item) => ({
    id: item.id as string,
    studentId: item.studentId as string,
    actionId: item.actionId as ActionId,
    points: item.points as number,
    createdAt: item.createdAt as string,
    synced: item.synced === true,
    ...(typeof item.classId === 'string' ? { classId: item.classId as string } : {}),
    ...(typeof item.sessionId === 'string' ? { sessionId: item.sessionId as string } : {}),
  }))
  const notes = Array.isArray(source.notes) ? source.notes.filter((item): item is Record<string, unknown> => {
    if (!item || typeof item !== 'object') return false
    const note = item as Record<string, unknown>
    return typeof note.id === 'string' && typeof note.studentId === 'string' && typeof note.text === 'string' && typeof note.createdAt === 'string' && typeof note.sessionStartedAt === 'string'
  }).map((item): LessonNote => ({
    id: item.id as string,
    studentId: item.studentId as string,
    ...(typeof item.classId === 'string' ? { classId: item.classId as string } : {}),
    ...(typeof item.sessionId === 'string' ? { sessionId: item.sessionId as string } : {}),
    text: item.text as string,
    important: item.important === true,
    createdAt: item.createdAt as string,
    sessionStartedAt: item.sessionStartedAt as string,
  })) : []

  const className = typeof source.className === 'string' ? source.className : defaults.className
  const sessionStartedAt = typeof source.sessionStartedAt === 'string' ? source.sessionStartedAt : defaults.sessionStartedAt
  const sourceClasses = Array.isArray(source.classes) ? source.classes.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
  const migratedStudents = rebuildStudents(students, observations)
  const classes: ClassRecord[] = sourceClasses.length ? sourceClasses.map((item, index) => {
    const classStudents = Array.isArray(item.students) ? item.students.filter((candidate): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === 'object').map((candidate, studentIndex) => normalizeStoredStudent(candidate, `student-${studentIndex + 1}`)) : []
    return {
      id: typeof item.id === 'string' ? item.id : `class-${index + 1}`,
      name: typeof item.name === 'string' ? item.name : className,
      schoolYear: typeof item.schoolYear === 'string' ? item.schoolYear : schoolYearFor(sessionStartedAt),
      students: classStudents,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : sessionStartedAt,
    }
  }) : [{ id: defaults.activeClassId, name: className, schoolYear: schoolYearFor(sessionStartedAt), students: migratedStudents, createdAt: sessionStartedAt }]
  const activeClassId = typeof source.activeClassId === 'string' && classes.some((item) => item.id === source.activeClassId) ? source.activeClassId : classes[0].id
  const sourceSessions = Array.isArray(source.sessions) ? source.sessions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
  const sessions: LessonSession[] = sourceSessions.length ? sourceSessions.map((item) => ({
    id: typeof item.id === 'string' ? item.id : createSessionId(activeClassId, typeof item.startedAt === 'string' ? item.startedAt : sessionStartedAt),
    classId: typeof item.classId === 'string' ? item.classId : activeClassId,
    startedAt: typeof item.startedAt === 'string' ? item.startedAt : sessionStartedAt,
    ...(typeof item.endedAt === 'string' ? { endedAt: item.endedAt } : {}),
  })) : [{ id: createSessionId(activeClassId, sessionStartedAt), classId: activeClassId, startedAt: sessionStartedAt }]
  const requestedActiveSession = typeof source.activeSessionId === 'string'
    ? sessions.find((item) => item.id === source.activeSessionId && item.classId === activeClassId && !item.endedAt)
    : undefined
  const activeSessionId = requestedActiveSession?.id ?? sessions.find((item) => item.classId === activeClassId && !item.endedAt)?.id ?? ''
  const observationsWithSession = observations.map((item) => ({ ...item, classId: item.classId ?? activeClassId, sessionId: item.sessionId ?? activeSessionId }))
  const notesWithSession = notes.map((item) => ({ ...item, classId: item.classId ?? activeClassId, sessionId: item.sessionId ?? activeSessionId }))
  const selectedClass = classes.find((item) => item.id === activeClassId) ?? classes[0]
  const selectedStudents = sourceClasses.length
    ? rebuildStudents(selectedClass.students, observationsWithSession.filter((item) => item.classId === activeClassId))
    : migratedStudents
  const migratedClasses = classes.map((item) => item.id === activeClassId ? { ...item, students: cloneStudents(selectedStudents) } : item)

  return {
    className: selectedClass.name,
    sessionStartedAt: sessions.find((item) => item.id === activeSessionId)?.startedAt ?? sessionStartedAt,
    activeClassId,
    activeSessionId,
    classes: migratedClasses,
    sessions,
    students: cloneStudents(selectedStudents),
    observations: observationsWithSession,
    notes: notesWithSession,
    syncQueue: Array.isArray(source.syncQueue) ? source.syncQueue.filter((item): item is SyncOperation => Boolean(item) && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string') : observationsWithSession.filter((item) => !item.synced).map(operationFromObservation),
    pendingSync: observationsWithSession.filter((item) => !item.synced).length,
  }
}

export function applyObservation(state: AppState, studentId: string, actionId: ActionId, createdAt = new Date().toISOString()): AppState {
  const action = ACTIONS.find((item) => item.id === actionId)
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId && session.classId === state.activeClassId && !session.endedAt)
  if (!action || !activeSession || !state.students.some((student) => student.id === studentId)) return state
  const observation: Observation = {
    id: `${studentId}-${createdAt}-${actionId}`,
    studentId,
    classId: state.activeClassId,
    sessionId: state.activeSessionId,
    actionId,
    points: action.points,
    createdAt,
    synced: false,
  }
  const observations = [...state.observations, observation]
  const syncQueue = state.syncQueue.some((item) => item.id === `observation:${observation.id}`) ? state.syncQueue : [...state.syncQueue, operationFromObservation(observation)]
  {
    const students = rebuildStudents(state.students, observations.filter((item) => item.classId === state.activeClassId))
    return { ...state, observations, syncQueue, students, classes: syncActiveClassStudents(state, students), pendingSync: syncQueue.length }
  }
}

export function undoLastObservation(state: AppState): AppState {
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId && session.classId === state.activeClassId && !session.endedAt)
  if (!activeSession) return state
  const targetIndex = state.observations.findLastIndex((item) => item.classId === state.activeClassId && item.sessionId === state.activeSessionId)
  if (targetIndex < 0) return state
  const target = state.observations[targetIndex]
  // A server-accepted observation needs an explicit delete mutation; silently
  // removing it locally would make the client and private store diverge.
  if (target.synced) return state
  const observations = state.observations.filter((_, index) => index !== targetIndex)
  const syncQueue = state.syncQueue.filter((operation) => operation.entityId !== target.id)
  {
    const students = rebuildStudents(state.students, observations.filter((item) => item.classId === state.activeClassId))
    return { ...state, observations, syncQueue, students, classes: syncActiveClassStudents(state, students), pendingSync: syncQueue.length }
  }
}

export function setAttendance(state: AppState, studentId: string, status: AttendanceStatus): AppState {
  const students = state.students.map((student) => student.id === studentId ? {
    ...student,
    present: status !== 'absent',
    late: status === 'late',
  } : student)
  return { ...state, students, classes: syncActiveClassStudents(state, students) }
}

export function toggleAttendance(state: AppState, studentId: string): AppState {
  const student = state.students.find((item) => item.id === studentId)
  if (!student) return state
  return setAttendance(state, studentId, student.present ? 'absent' : 'present')
}

export function setPreparationStatus(state: AppState, studentId: string, field: 'homework' | 'materials', status: PreparationStatus): AppState {
  const students = state.students.map((student) => student.id === studentId ? { ...student, [field]: status } : student)
  return { ...state, students, classes: syncActiveClassStudents(state, students) }
}

export function addLessonNote(state: AppState, studentId: string, text: string, createdAt = new Date().toISOString(), important = false): AppState {
  const cleanText = text.trim()
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId && session.classId === state.activeClassId && !session.endedAt)
  if (!cleanText || !activeSession || !state.students.some((student) => student.id === studentId)) return state
  const note: LessonNote = {
    id: `${studentId}-${createdAt}`,
    studentId,
    classId: state.activeClassId,
    sessionId: state.activeSessionId,
    text: cleanText,
    important,
    createdAt,
    sessionStartedAt: state.sessionStartedAt,
  }
  return { ...state, notes: [...state.notes, note] }
}


export function createClassRecord(state: AppState, name: string, schoolYear: string, createdAt = new Date().toISOString()): AppState {
  const cleanName = name.trim()
  if (!cleanName) return state
  const id = `class-${cleanName.toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  if (state.classes.some((classRecord) => classRecord.id === id)) return state
  return { ...state, classes: [...state.classes, { id, name: cleanName, schoolYear, students: [], createdAt }] }
}

export function selectClass(state: AppState, classId: string): AppState {
  const classRecord = state.classes.find((item) => item.id === classId)
  if (!classRecord) return state
  const activeSession = state.sessions.find((session) => session.classId === classId && !session.endedAt) ?? state.sessions.find((session) => session.classId === classId)
  return {
    ...state,
    activeClassId: classRecord.id,
    activeSessionId: activeSession && !activeSession.endedAt ? activeSession.id : '',
    className: classRecord.name,
    sessionStartedAt: activeSession?.startedAt ?? state.sessionStartedAt,
    students: cloneStudents(classRecord.students),
  }
}

export function startLessonSession(state: AppState, startedAt = new Date().toISOString()): AppState {
  const endedSessions = state.sessions.map((session) => session.id === state.activeSessionId && !session.endedAt ? { ...session, endedAt: startedAt } : session)
  const session: LessonSession = { id: createSessionId(state.activeClassId, startedAt), classId: state.activeClassId, startedAt }
  return { ...state, activeSessionId: session.id, sessionStartedAt: startedAt, sessions: [...endedSessions, session] }
}

export function endActiveLessonSession(state: AppState, endedAt = new Date().toISOString()): AppState {
  const session = state.sessions.find((item) => item.id === state.activeSessionId && item.classId === state.activeClassId && !item.endedAt)
  if (!session) return state
  return { ...state, activeSessionId: '', sessions: state.sessions.map((item) => item.id === session.id ? { ...item, endedAt } : item) }
}

function valueFromImportRow(row: Record<string, unknown>) {
  const nameKeys = ['naam', 'name', 'leerling', 'student']
  for (const key of nameKeys) {
    if (typeof row[key] === 'string') return row[key] as string
  }
  return ''
}

function looksFictitiousName(name: string) {
  return /^(test|demo|fictief|voorbeeld)\b/i.test(name.trim())
}

export function previewStudentImport(state: AppState, rows: Record<string, unknown>[], fictitiousConfirmed: boolean): StudentImportPreview {
  if (!fictitiousConfirmed) {
    return { rows: [], canConfirm: false, guardError: 'Bevestig dat dit fictieve testdata is voordat je een import kunt bekijken.' }
  }
  const existingNames = new Set(state.students.map((student) => student.name.trim().toLocaleLowerCase('nl-NL')))
  const seen = new Set<string>()
  const previewRows = rows.map((row, index): ImportPreviewRow => {
    const name = valueFromImportRow(row).trim()
    const key = name.toLocaleLowerCase('nl-NL')
    const duplicate = Boolean(name) && (existingNames.has(key) || seen.has(key))
    const errors: string[] = []
    if (!name) errors.push('Naam ontbreekt.')
    if (name && !looksFictitiousName(name)) errors.push('Gebruik alleen fictieve testnamen; echte leerlingnamen zijn geblokkeerd.')
    if (duplicate) errors.push('Dubbele leerlingnaam.')
    seen.add(key)
    return { rowNumber: index + 1, name, initials: initialsFor(name), valid: errors.length === 0, duplicate, errors }
  })
  return { rows: previewRows, canConfirm: previewRows.length > 0 && previewRows.every((row) => row.valid) }
}

export function confirmStudentImport(state: AppState, preview: StudentImportPreview): AppState {
  if (!preview.canConfirm) return state
  const importedStudents = preview.rows.filter((row) => row.valid).map((row, index) => ({ ...studentFromName(row.name, `import-${index + 1}`), id: `import-${row.name.toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` }))
  const students = [...state.students, ...importedStudents]
  return { ...state, students, classes: syncActiveClassStudents(state, students) }
}

export function getTopWorkSignals(state: AppState, studentId: string): string[] {
  const counts = new Map<ActionId, number>()
  for (const observation of state.observations) {
    const action = ACTIONS.find((item) => item.id === observation.actionId)
    if (observation.classId === state.activeClassId && observation.sessionId === state.activeSessionId && observation.studentId === studentId && action?.group === 'work') {
      counts.set(observation.actionId, (counts.get(observation.actionId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id, count]) => {
      const label = ACTIONS.find((action) => action.id === id)?.shortLabel ?? id
      return count > 1 ? `${label} ×${count}` : label
    })
}

export function chooseRandomStudent(state: AppState, random = Math.random): string | null {
  const present = state.students.filter((student) => student.present)
  if (present.length === 0) return null
  const maxTurns = Math.max(...present.map((student) => student.turns))
  const maxCorrect = Math.max(...present.map((student) => student.correct))
  const weighted = present.map((student) => ({
    student,
    weight: 1 + (maxTurns - student.turns) + (maxCorrect - student.correct),
  }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  let target = random() * total
  for (const item of weighted) {
    target -= item.weight
    if (target < 0) return item.student.id
  }
  return weighted.at(-1)?.student.id ?? null
}
