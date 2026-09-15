/**
 * Collision-resistant id generation shared across entities.
 *
 * Uses the platform UUID when available (browsers, modern Node, React Native)
 * and falls back to a timestamp+random composite so tests and exotic runtimes
 * still produce unique ids without pulling in a dependency.
 */

export function createEntityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
