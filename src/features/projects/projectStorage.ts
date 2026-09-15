/**
 * localStorage-backed project persistence.
 *
 * Layout:
 *   landscape-designer.projects.index        -> ProjectSummary[] (fast listing)
 *   landscape-designer.project.<projectId>   -> full Project JSON
 *
 * All failures are contained: corrupt entries are logged and skipped rather
 * than thrown, so one bad document cannot take down the projects screen.
 * Swapping this module for server storage later means reimplementing these
 * five functions only.
 */

import type { DesignScene } from '@core/domain/design'
import { migrateProject, PROJECT_SCHEMA_VERSION } from '@core/domain/project'
import type { Project, ProjectSummary } from '@core/domain/project'

const PROJECT_INDEX_STORAGE_KEY = 'landscape-designer.projects.index'
const PROJECT_KEY_PREFIX = 'landscape-designer.project.'

function readIndex(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ProjectSummary[]) : []
  } catch (error) {
    console.error('Project index is unreadable; starting fresh.', error)
    return []
  }
}

function writeIndex(summaries: ProjectSummary[]): void {
  localStorage.setItem(PROJECT_INDEX_STORAGE_KEY, JSON.stringify(summaries))
}

/** Inserts or updates a project and refreshes its index entry. */
export function saveProject(project: Project, thumbnailDataUrl: string): void {
  const updatedProject: Project = { ...project, schemaVersion: PROJECT_SCHEMA_VERSION }
  localStorage.setItem(
    `${PROJECT_KEY_PREFIX}${project.id}`,
    JSON.stringify(updatedProject),
  )

  const index = readIndex().filter((summary) => summary.id !== project.id)
  index.unshift({
    id: project.id,
    name: project.name,
    updatedAtIso: project.updatedAtIso,
    thumbnailDataUrl,
  })
  writeIndex(index)
}

export function listProjectSummaries(): ProjectSummary[] {
  return readIndex().sort((first, second) => second.updatedAtIso.localeCompare(first.updatedAtIso))
}

export function loadProject(projectId: string): Project | null {
  try {
    const raw = localStorage.getItem(`${PROJECT_KEY_PREFIX}${projectId}`)
    if (!raw) return null
    return migrateProject(JSON.parse(raw))
  } catch (error) {
    console.error(`Project "${projectId}" could not be loaded.`, error)
    return null
  }
}

export function deleteProject(projectId: string): void {
  localStorage.removeItem(`${PROJECT_KEY_PREFIX}${projectId}`)
  writeIndex(readIndex().filter((summary) => summary.id !== projectId))
}

/** Convenience factory for a brand-new single-scene project. */
export function createNewProject(name: string, initialScene: DesignScene): Project {
  const nowIso = new Date().toISOString()
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    scenes: [initialScene],
  }
}
