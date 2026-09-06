import { describe, expect, it } from 'vitest'
import {
  addLessonNote,
  confirmStudentImport,
  createClassRecord,
  applyObservation,
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

describe('observation workflow', () => {
  it('records a scored observation and updates the student counters', () => {
    const state = createInitialState()
    const next = applyObservation(state, 'noah', 'correct', '2026-08-09T10:00:00.000Z')

    expect(next.students.find((student) => student.id === 'noah')).toMatchObject({
      score: 1,
      answerPoints: 1,
      turns: 1,
      correct: 1,
    })
    expect(next.observations).toHaveLength(1)
    expect(next.pendingSync).toBe(1)
  })

  it('undoes the latest observation without damaging earlier logs', () => {
    const state = createInitialState()
    const one = applyObservation(state, 'noah', 'correct', '2026-08-09T10:00:00.000Z')
    const two = applyObservation(one, 'noah', 'talking', '2026-08-09T10:01:00.000Z')
    const undone = undoLastObservation(two)

    expect(undone.observations).toHaveLength(1)
    expect(undone.syncQueue.map((item) => item.entityId)).toEqual([one.observations[0].id])
    expect(undone.pendingSync).toBe(1)
    expect(undone.students.find((student) => student.id === 'noah')?.score).toBe(1)
  })

  it('starts with a realistic class of 32 fictitious students', () => {
    expect(createInitialState().students).toHaveLength(32)
  })

  it('only chooses present students and weights fewer correct answers more heavily', () => {
    let state = createInitialState()
    state = {
      ...state,
      students: state.students.slice(0, 3).map((student, index) => ({
        ...student,
        present: index !== 2,
        turns: 4,
        correct: index === 0 ? 4 : 0,
      })),
    }

    expect(chooseRandomStudent(state, () => 0.3)).toBe('sara')
  })

  it('restores an absent student as present and records that they arrived late', () => {
    const absent = setAttendance(createInitialState(), 'noah', 'absent')
    const late = setAttendance(absent, 'noah', 'late')

    expect(late.students.find((student) => student.id === 'noah')).toMatchObject({ present: true, late: true })
  })

  it('stores dated lesson notes, importance, and preparation checks', () => {
    const state = addLessonNote(createInitialState(), 'noah', 'Had extra uitleg nodig.', '2026-08-10T09:15:00.000Z', true)
    const checked = setPreparationStatus(state, 'noah', 'homework', 'missing')

    expect(checked.notes[0]).toMatchObject({ studentId: 'noah', text: 'Had extra uitleg nodig.', important: true })
    expect(checked.students.find((student) => student.id === 'noah')?.homework).toBe('missing')
  })

  it('migrates v1 local data without losing observations and adds new defaults safely', () => {
    const legacy = {
      className: '3M2 · NaSk 2',
      sessionStartedAt: '2026-08-09T08:00:00.000Z',
      students: [{ id: 'noah', name: 'Noah B.', initials: 'NB', present: true, score: 1, turns: 1, correct: 1, incorrect: 0, unanswered: 0 }],
      observations: [
        { id: 'correct-1', studentId: 'noah', actionId: 'correct', points: 1, createdAt: '2026-08-09T08:10:00.000Z', synced: false },
        { id: 'homework-1', studentId: 'noah', actionId: 'homework', points: -1, createdAt: '2026-08-09T08:11:00.000Z', synced: false },
      ],
      pendingSync: 2,
    }

    const migrated = migrateStoredState(legacy)

    expect(migrated.students).toHaveLength(32)
    expect(migrated.students.find((student) => student.id === 'noah')).toMatchObject({ correct: 1, answerPoints: 1, homework: 'missing', late: false })
    expect(migrated.observations).toHaveLength(1)
    expect(migrated.notes).toEqual([])
    const migratedExistingNote = migrateStoredState({ ...legacy, notes: [{ id: 'n1', studentId: 'noah', text: 'Oud', createdAt: '2026-08-09T08:12:00.000Z', sessionStartedAt: '2026-08-09T08:00:00.000Z' }] })
    expect(migratedExistingNote.notes[0]).toMatchObject({ text: 'Oud', important: false })
    expect(migrated.pendingSync).toBe(1)
  })

  it('migrates legacy neutral answers to almost-correct answers', () => {
    const legacy = {
      students: [{ id: 'noah', name: 'Noah B.', initials: 'NB', present: true }],
      observations: [
        { id: 'neutral-1', studentId: 'noah', actionId: 'neutral', points: 0, createdAt: '2026-08-09T08:10:00.000Z', synced: false },
      ],
    }

    const migrated = migrateStoredState(legacy)

    expect(migrated.observations[0]).toMatchObject({ actionId: 'almostCorrect', points: 0 })
    expect(migrated.students.find((student) => student.id === 'noah')).toMatchObject({ turns: 1, answerPoints: 0 })
  })

  it('returns the two most frequent work-attitude signals for a tile', () => {
    let state = createInitialState()
    state = applyObservation(state, 'noah', 'focused', '2026-08-10T09:00:00.000Z')
    state = applyObservation(state, 'noah', 'focused', '2026-08-10T09:01:00.000Z')
    state = applyObservation(state, 'noah', 'slowTempo', '2026-08-10T09:02:00.000Z')
    state = applyObservation(state, 'noah', 'talking', '2026-08-10T09:03:00.000Z')

    expect(getTopWorkSignals(state, 'noah')).toEqual(['Geconcentreerd ×2', 'Laag tempo'])
  })
})


describe('post-live class and import workflow', () => {
  it('migrates the live prototype state into one active class and explicit lesson session', () => {
    const legacy = {
      className: '3M2 · NaSk 2',
      sessionStartedAt: '2026-08-09T08:00:00.000Z',
      students: [{ id: 'noah', name: 'Noah B.', initials: 'NB', present: true }],
      observations: [{ id: 'correct-1', studentId: 'noah', actionId: 'correct', points: 1, createdAt: '2026-08-09T08:10:00.000Z', synced: false }],
      notes: [{ id: 'n1', studentId: 'noah', text: 'Oud', important: true, createdAt: '2026-08-09T08:12:00.000Z', sessionStartedAt: '2026-08-09T08:00:00.000Z' }],
    }

    const migrated = migrateStoredState(legacy)

    expect(migrated.classes).toHaveLength(1)
    expect(migrated.classes[0]).toMatchObject({ name: '3M2 · NaSk 2', schoolYear: '2026-2027' })
    expect(migrated.activeClassId).toBe(migrated.classes[0].id)
    expect(migrated.sessions).toHaveLength(1)
    expect(migrated.activeSessionId).toBe(migrated.sessions[0].id)
    expect(migrated.observations[0]).toMatchObject({ classId: migrated.classes[0].id, sessionId: migrated.sessions[0].id })
    expect(migrated.notes[0]).toMatchObject({ classId: migrated.classes[0].id, sessionId: migrated.sessions[0].id })
  })

  it('creates and selects additional classes without losing the original class roster', () => {
    const state = createInitialState()
    const created = createClassRecord(state, '4H1 · Scheikunde', '2026-2027')
    const selected = selectClass(created, created.classes[1].id)

    expect(created.classes).toHaveLength(2)
    expect(created.classes[0].students).toHaveLength(32)
    expect(selected.activeClassId).toBe(created.classes[1].id)
    expect(selected.className).toBe('4H1 · Scheikunde')
    expect(selected.students).toEqual([])
    expect(selected.activeSessionId).toBe('')
  })

  it('preserves stored student ids and live status for every class during reload', () => {
    const state = createInitialState()
    const created = createClassRecord(state, 'Testklas', '2026-2027')
    const selected = selectClass(created, created.classes[1].id)
    const preview = previewStudentImport(selected, [{ naam: 'Test Leerling 1' }], true)
    const imported = confirmStudentImport(selected, preview)
    const absent = setAttendance(imported, imported.students[0].id, 'absent')

    const reloaded = migrateStoredState(absent)
    const storedStudent = reloaded.classes.find((item) => item.id === absent.activeClassId)?.students[0]

    expect(storedStudent).toMatchObject({ id: absent.students[0].id, name: 'Test Leerling 1', present: false })
  })

  it('does not record observations or notes without an active lesson session', () => {
    const state = endActiveLessonSession(createInitialState(), '2026-08-09T08:50:00.000Z')

    expect(applyObservation(state, 'noah', 'correct')).toBe(state)
    expect(addLessonNote(state, 'noah', 'Mag niet buiten een les vallen.')).toBe(state)
  })

  it('clears the active session and refuses undo after a lesson ends', () => {
    const observed = applyObservation(createInitialState(), 'noah', 'correct', '2026-08-09T08:10:00.000Z')
    const ended = endActiveLessonSession(observed, '2026-08-09T08:50:00.000Z')

    expect(ended.activeSessionId).toBe('')
    expect(undoLastObservation(ended)).toBe(ended)
    expect(ended.observations).toHaveLength(1)
  })

  it('preserves existing note class and session ids during reload', () => {
    const state = addLessonNote(createInitialState(), 'noah', 'Blijft bij de bronles.', '2026-08-09T08:12:00.000Z', true)
    const stored = state.notes[0]
    const switched = createClassRecord(state, 'Testklas', '2026-2027')
    const reloaded = migrateStoredState(selectClass(switched, switched.classes[1].id))

    expect(reloaded.notes[0]).toMatchObject({ classId: stored.classId, sessionId: stored.sessionId })
  })

  it('undoes only the latest observation in the active class and session', () => {
    let state = applyObservation(createInitialState(), 'noah', 'correct', '2026-08-09T08:10:00.000Z')
    const originalClassId = state.activeClassId
    const originalObservationId = state.observations[0].id
    state = createClassRecord(state, 'Testklas', '2026-2027')
    state = selectClass(state, state.classes[1].id)
    state = confirmStudentImport(state, previewStudentImport(state, [{ naam: 'Test Noah' }], true))
    state = startLessonSession(state, '2026-08-10T09:00:00.000Z')
    state = applyObservation(state, state.students[0].id, 'focused', '2026-08-10T09:05:00.000Z')
    const undone = undoLastObservation(state)

    expect(undone.observations).toHaveLength(1)
    expect(undone.observations[0]).toMatchObject({ id: originalObservationId, classId: originalClassId })
    expect(undone.students[0].score).toBe(0)
  })

  it('limits live work signals to the active class and session', () => {
    let state = applyObservation(createInitialState(), 'noah', 'focused', '2026-08-09T08:10:00.000Z')
    state = createClassRecord(state, 'Testklas', '2026-2027')
    state = selectClass(state, state.classes[1].id)
    state = confirmStudentImport(state, previewStudentImport(state, [{ naam: 'Test Noah' }], true))
    state = startLessonSession(state, '2026-08-10T09:00:00.000Z')

    expect(getTopWorkSignals(state, state.students[0].id)).toEqual([])
  })

  it('starts and ends explicit lesson sessions and binds observations to the active session', () => {
    let state = createInitialState()
    state = endActiveLessonSession(state, '2026-08-09T08:50:00.000Z')
    state = startLessonSession(state, '2026-08-10T09:00:00.000Z')
    state = applyObservation(state, 'noah', 'correct', '2026-08-10T09:05:00.000Z')

    expect(state.sessions).toHaveLength(2)
    expect(state.sessions[0].endedAt).toBe('2026-08-09T08:50:00.000Z')
    expect(state.activeSessionId).toBe(state.sessions[1].id)
    expect(state.observations[0]).toMatchObject({ sessionId: state.sessions[1].id, classId: state.activeClassId })
  })

  it('previews fictitious student imports with validation, duplicate detection, and a real-data guard', () => {
    const state = createInitialState()
    const preview = previewStudentImport(state, [
      { naam: 'Test Leerling 1' },
      { naam: 'Noah B.' },
      { naam: 'Jan Jansen' },
      { naam: '' },
    ], true)

    expect(preview.canConfirm).toBe(false)
    expect(preview.rows).toHaveLength(4)
    expect(preview.rows[0]).toMatchObject({ name: 'Test Leerling 1', valid: true, duplicate: false })
    expect(preview.rows[1]).toMatchObject({ duplicate: true })
    expect(preview.rows[2].errors).toContain('Gebruik alleen fictieve testnamen; echte leerlingnamen zijn geblokkeerd.')
    expect(preview.rows[3].errors).toContain('Naam ontbreekt.')

    const blocked = previewStudentImport(state, [{ naam: 'Test Leerling 2' }], false)
    expect(blocked.guardError).toContain('Bevestig dat dit fictieve testdata is')
  })

  it('confirms only valid fictitious import rows into the active class roster', () => {
    const state = createClassRecord(createInitialState(), 'Importklas', '2026-2027')
    const selected = selectClass(state, state.classes[1].id)
    const preview = previewStudentImport(selected, [{ naam: 'Test Leerling 1' }, { naam: 'Demo Student 2' }], true)
    const imported = confirmStudentImport(selected, preview)

    expect(imported.students.map((student) => student.name)).toEqual(['Test Leerling 1', 'Demo Student 2'])
    expect(imported.classes[1].students).toHaveLength(2)
  })
})
