import { describe, expect, it } from 'vitest'
import {
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
