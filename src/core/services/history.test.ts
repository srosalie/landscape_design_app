import { describe, expect, it } from 'vitest'
import { createEmptyHistory, HISTORY_LIMIT, pushHistory, redoHistory, undoHistory } from './history'

describe('snapshot history', () => {
  it('undoes back to the previous snapshot', () => {
    let history = createEmptyHistory<string>()
    history = pushHistory('first', history)

    const outcome = undoHistory('second', history)
    expect(outcome?.value).toBe('first')
  })

  it('redo restores what undo removed', () => {
    let history = createEmptyHistory<number>()
    history = pushHistory(1, history)

    const undone = undoHistory(2, history)!
    const redone = redoHistory(1, undone.history)!
    expect(redone.value).toBe(2)
  })

  it('a new change clears the redo stack', () => {
    let history = createEmptyHistory<string>()
    history = pushHistory('a', history)
    const undone = undoHistory('b', history)!

    const branched = pushHistory('c', undone.history)
    expect(branched.future).toHaveLength(0)
    expect(redoHistory('c', branched)).toBeNull()
  })

  it('caps memory at HISTORY_LIMIT snapshots', () => {
    let history = createEmptyHistory<number>()
    const totalPushes = HISTORY_LIMIT + 10
    for (let index = 0; index < totalPushes; index += 1) {
      history = pushHistory(index, history)
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT)
    // Oldest entries fall off first: survivors are the last HISTORY_LIMIT pushes.
    expect(history.past[0]).toBe(totalPushes - 1)
    expect(history.past.at(-1)).toBe(totalPushes - HISTORY_LIMIT)
  })

  it('undo on empty history is a no-op', () => {
    expect(undoHistory('anything', createEmptyHistory<string>())).toBeNull()
  })
})
