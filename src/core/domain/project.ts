/**
 * Project persistence types and schema migration entry point.
 *
 * Projects are self-contained JSON documents (photo embedded as a data URL)
 * stored in browser localStorage today; the same shape can be persisted to a
 * server database later without changes. Bump PROJECT_SCHEMA_VERSION whenever
 * the shape changes incompatibly and extend migrateProject() to convert older
 * documents forward instead of breaking users' saved work.
 */

import type { DesignScene } from './design'

export const PROJECT_SCHEMA_VERSION = 1

export interface Project {
  schemaVersion: number
  id: string
  name: string
  createdAtIso: string
  updatedAtIso: string
  /** MVP uses exactly one scene; the array exists for multi-view designs later. */
  scenes: DesignScene[]
}

/** Lightweight row for project listing screens. */
export interface ProjectSummary {
  id: string
  name: string
  updatedAtIso: string
  thumbnailDataUrl: string
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

/**
 * Converts a parsed localStorage payload into a current Project, migrating old
 * schema versions forward. Returns null for unrecognizable or newer-than-app
 * payloads rather than throwing, so one bad entry cannot break the app.
 */
export function migrateProject(raw: unknown): Project | null {
  if (!isRecord(raw)) return null

  const schemaVersion = raw.schemaVersion
  if (schemaVersion === PROJECT_SCHEMA_VERSION) {
    return raw as unknown as Project
  }

  // Future migrations chain here, e.g.:
  //   if (schemaVersion === 1) return migrateV1ToV2(raw)
  console.error(`Cannot load project with schema version ${String(schemaVersion)}`)
  return null
}
