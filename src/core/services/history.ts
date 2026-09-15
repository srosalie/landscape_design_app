/**
 * Undo/redo history built on full-state snapshots.
 *
 * Snapshots beat command objects here because DesignScene documents are small
 * (a handful of placements), structural sharing keeps copies cheap, and any
 * future automation (AI-generated designs) can reuse the same store actions
 * that push history. Generic so other features can adopt it unchanged.
 */

export interface HistoryState<T> {
  /** Previous states, most recent first. */
  past: T[]
  /** States undone since the last new change, most recent first. */
  future: T[]
}

/** Bounds memory usage; oldest snapshots fall off beyond this depth. */
export const HISTORY_LIMIT = 60

export function createEmptyHistory<T>(): HistoryState<T> {
  return { past: [], future: [] }
}

/**
 * Records `currentState` as an undo point. Call BEFORE mutating state, which
 * keeps drag interactions simple: snapshot once at pointer-down, mutate freely,
 * and never touch history during pointer-move.
 */
export function pushHistory<T>(currentState: T, history: HistoryState<T>): HistoryState<T> {
  const past = [currentState, ...history.past].slice(0, HISTORY_LIMIT)
  return { past, future: [] }
}

export function undoHistory<T>(
  currentState: T,
  history: HistoryState<T>,
): { value: T; history: HistoryState<T> } | null {
  const [previousState, ...remainingPast] = history.past
  if (previousState === undefined) return null
  return {
    value: previousState,
    history: { past: remainingPast, future: [currentState, ...history.future] },
  }
}

export function redoHistory<T>(
  currentState: T,
  history: HistoryState<T>,
): { value: T; history: HistoryState<T> } | null {
  const [nextState, ...remainingFuture] = history.future
  if (nextState === undefined) return null
  return {
    value: nextState,
    history: { past: [currentState, ...history.past], future: remainingFuture },
  }
}
