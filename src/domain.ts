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
  | 'helps'
  | 'disrupts'
  | 'materials'
  | 'homework'

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
  { id: 'helps', label: 'Helpt anderen', shortLabel: 'Helpt', group: 'behaviour', points: 1 },
  { id: 'disrupts', label: 'Stoort', shortLabel: 'Stoort', group: 'behaviour', points: -1 },
  { id: 'materials', label: 'Spullen niet op orde', shortLabel: 'Spullen', group: 'behaviour', points: -1 },
  { id: 'homework', label: 'Huiswerk niet gemaakt', shortLabel: 'Huiswerk', group: 'behaviour', points: -1 },
]

export type Student = {
  id: string
  name: string
  initials: string
  present: boolean
  score: number
  turns: number
  correct: number
  incorrect: number
  unanswered: number
}

export type Observation = {
  id: string
  studentId: string
  actionId: ActionId
  points: number
  createdAt: string
  synced: boolean
}

export type AppState = {
  className: string
  sessionStartedAt: string
  students: Student[]
  observations: Observation[]
  pendingSync: number
}

const sampleStudents: Student[] = [
  ['noah', 'Noah B.', 'NB'], ['sara', 'Sara K.', 'SK'], ['yassin', 'Yassin E.', 'YE'],
  ['lina', 'Lina M.', 'LM'], ['adam', 'Adam A.', 'AA'], ['zoe', 'Zoë V.', 'ZV'],
  ['milan', 'Milan D.', 'MD'], ['aya', 'Aya H.', 'AH'], ['sam', 'Sam R.', 'SR'],
  ['isa', 'Isa P.', 'IP'], ['dani', 'Dani S.', 'DS'], ['nora', 'Nora T.', 'NT'],
].map(([id, name, initials]) => ({ id, name, initials, present: true, score: 0, turns: 0, correct: 0, incorrect: 0, unanswered: 0 }))

export function createInitialState(): AppState {
  return {
    className: '3M2 · NaSk 2',
    sessionStartedAt: new Date().toISOString(),
    students: sampleStudents.map((student) => ({ ...student })),
    observations: [],
    pendingSync: 0,
  }
}

function rebuildStudents(students: Student[], observations: Observation[]): Student[] {
  return students.map((original) => {
    const student = { ...original, score: 0, turns: 0, correct: 0, incorrect: 0, unanswered: 0 }
    for (const observation of observations.filter((item) => item.studentId === student.id)) {
      student.score += observation.points
      if (['correct', 'incorrect', 'neutral', 'unanswered'].includes(observation.actionId)) student.turns += 1
      if (observation.actionId === 'correct') student.correct += 1
      if (observation.actionId === 'incorrect') student.incorrect += 1
      if (observation.actionId === 'unanswered') student.unanswered += 1
    }
    return student
  })
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

export function toggleAttendance(state: AppState, studentId: string): AppState {
  return { ...state, students: state.students.map((student) => student.id === studentId ? { ...student, present: !student.present } : student) }
}

export function chooseRandomStudent(state: AppState, random = Math.random): string | null {
  const present = state.students.filter((student) => student.present)
  if (present.length === 0) return null
  const fewestTurns = Math.min(...present.map((student) => student.turns))
  const fairPool = present.filter((student) => student.turns === fewestTurns)
  return fairPool[Math.floor(random() * fairPool.length)]?.id ?? null
}
