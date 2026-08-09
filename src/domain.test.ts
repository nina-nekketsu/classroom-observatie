import { describe, expect, it } from 'vitest'
import { applyObservation, createInitialState, undoLastObservation } from './domain'

describe('observation workflow', () => {
  it('records a scored observation and updates the student counters', () => {
    const state = createInitialState()
    const next = applyObservation(state, 'noah', 'correct', '2026-08-09T10:00:00.000Z')

    expect(next.students.find((student) => student.id === 'noah')).toMatchObject({
      score: 1,
      turns: 1,
      correct: 1,
    })
    expect(next.observations).toHaveLength(1)
    expect(next.pendingSync).toBe(1)
  })

  it('undoes the latest observation without damaging earlier logs', () => {
    const state = createInitialState()
    const one = applyObservation(state, 'noah', 'correct', '2026-08-09T10:00:00.000Z')
    const two = applyObservation(one, 'noah', 'disrupts', '2026-08-09T10:01:00.000Z')
    const undone = undoLastObservation(two)

    expect(undone.observations).toHaveLength(1)
    expect(undone.students.find((student) => student.id === 'noah')?.score).toBe(1)
  })
})
