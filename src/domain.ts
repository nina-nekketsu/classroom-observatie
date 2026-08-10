export type ActionGroup = 'answer' | 'work' | 'behaviour'

export type ActionId =
  | 'correct'
  | 'incorrect'
  | 'neutral'
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
  { id: 'neutral', label: 'Neutraal / niet beoordeeld', shortLabel: 'Neutraal', group: 'answer', points: 0 },
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
  actionId: ActionId
  points: number
  createdAt: string
  synced: boolean
}

export type LessonNote = {
  id: string
  studentId: string
  text: string
  important: boolean
  createdAt: string
  sessionStartedAt: string
}

export type AppState = {
  className: string
  sessionStartedAt: string
  students: Student[]
  observations: Observation[]
  notes: LessonNote[]
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

export function createInitialState(): AppState {
  return {
    className: '3M2 · NaSk 2',
    sessionStartedAt: new Date().toISOString(),
    students: sampleStudents.map((student) => ({ ...student })),
    observations: [],
    notes: [],
    pendingSync: 0,
  }
}

function rebuildStudents(students: Student[], observations: Observation[]): Student[] {
  return students.map((original) => {
    const student = { ...original, score: 0, answerPoints: 0, turns: 0, correct: 0, incorrect: 0, unanswered: 0 }
    for (const observation of observations.filter((item) => item.studentId === student.id)) {
      student.score += observation.points
      if (['correct', 'incorrect', 'neutral', 'unanswered'].includes(observation.actionId)) {
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
  const observations = rawObservations.filter((item) =>
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
  }))
  const notes = Array.isArray(source.notes) ? source.notes.filter((item): item is Record<string, unknown> => {
    if (!item || typeof item !== 'object') return false
    const note = item as Record<string, unknown>
    return typeof note.id === 'string' && typeof note.studentId === 'string' && typeof note.text === 'string' && typeof note.createdAt === 'string' && typeof note.sessionStartedAt === 'string'
  }).map((item): LessonNote => ({
    id: item.id as string,
    studentId: item.studentId as string,
    text: item.text as string,
    important: item.important === true,
    createdAt: item.createdAt as string,
    sessionStartedAt: item.sessionStartedAt as string,
  })) : []

  return {
    className: typeof source.className === 'string' ? source.className : defaults.className,
    sessionStartedAt: typeof source.sessionStartedAt === 'string' ? source.sessionStartedAt : defaults.sessionStartedAt,
    students: rebuildStudents(students, observations),
    observations,
    notes,
    pendingSync: observations.filter((item) => !item.synced).length,
  }
}

export function applyObservation(state: AppState, studentId: string, actionId: ActionId, createdAt = new Date().toISOString()): AppState {
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!action || !state.students.some((student) => student.id === studentId)) return state
  const observation: Observation = {
    id: `${studentId}-${createdAt}-${actionId}`,
    studentId,
    actionId,
    points: action.points,
    createdAt,
    synced: false,
  }
  const observations = [...state.observations, observation]
  return { ...state, observations, students: rebuildStudents(state.students, observations), pendingSync: observations.filter((item) => !item.synced).length }
}

export function undoLastObservation(state: AppState): AppState {
  if (state.observations.length === 0) return state
  const observations = state.observations.slice(0, -1)
  return { ...state, observations, students: rebuildStudents(state.students, observations), pendingSync: observations.filter((item) => !item.synced).length }
}

export function setAttendance(state: AppState, studentId: string, status: AttendanceStatus): AppState {
  return {
    ...state,
    students: state.students.map((student) => student.id === studentId ? {
      ...student,
      present: status !== 'absent',
      late: status === 'late',
    } : student),
  }
}

export function toggleAttendance(state: AppState, studentId: string): AppState {
  const student = state.students.find((item) => item.id === studentId)
  if (!student) return state
  return setAttendance(state, studentId, student.present ? 'absent' : 'present')
}

export function setPreparationStatus(state: AppState, studentId: string, field: 'homework' | 'materials', status: PreparationStatus): AppState {
  return { ...state, students: state.students.map((student) => student.id === studentId ? { ...student, [field]: status } : student) }
}

export function addLessonNote(state: AppState, studentId: string, text: string, createdAt = new Date().toISOString(), important = false): AppState {
  const cleanText = text.trim()
  if (!cleanText || !state.students.some((student) => student.id === studentId)) return state
  const note: LessonNote = {
    id: `${studentId}-${createdAt}`,
    studentId,
    text: cleanText,
    important,
    createdAt,
    sessionStartedAt: state.sessionStartedAt,
  }
  return { ...state, notes: [...state.notes, note] }
}

export function getTopWorkSignals(state: AppState, studentId: string): string[] {
  const counts = new Map<ActionId, number>()
  for (const observation of state.observations) {
    const action = ACTIONS.find((item) => item.id === observation.actionId)
    if (observation.studentId === studentId && action?.group === 'work') {
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
