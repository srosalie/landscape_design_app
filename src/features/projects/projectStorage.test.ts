import { beforeEach, describe, expect, it } from 'vitest'
import type { DesignScene } from '@core/domain/design'
import { createNewProject, deleteProject, listProjectSummaries, loadProject, saveProject } from './projectStorage'

const sampleScene: DesignScene = {
  photoDataUrl: 'data:image/jpeg;base64,AAAA',
  photoPixelWidth: 800,
  photoPixelHeight: 600,
  calibration: null,
  placements: [],
}

describe('projectStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a project through save and load', () => {
    const project = createNewProject('Front yard', sampleScene)
    saveProject(project, 'data:image/jpeg;base64,THUMB')

    expect(loadProject(project.id)).toEqual(project)
    const [summary] = listProjectSummaries()
    expect(summary.name).toBe('Front yard')
    expect(summary.thumbnailDataUrl).toBe('data:image/jpeg;base64,THUMB')
  })

  it('lists most recently saved projects first', () => {
    const older = createNewProject('Older', sampleScene)
    const newer = createNewProject('Newer', sampleScene)
    // Stamp distinct times so ordering does not depend on clock resolution.
    newer.updatedAtIso = new Date(Date.now() + 60_000).toISOString()
    saveProject(older, '')
    saveProject(newer, '')

    expect(listProjectSummaries().map((summary) => summary.name)).toEqual(['Newer', 'Older'])
  })

  it('deletes both the document and the index entry', () => {
    const project = createNewProject('Doomed', sampleScene)
    saveProject(project, '')
    deleteProject(project.id)

    expect(loadProject(project.id)).toBeNull()
    expect(listProjectSummaries()).toHaveLength(0)
  })

  it('returns null instead of throwing for missing or corrupt documents', () => {
    expect(loadProject('never-existed')).toBeNull()

    localStorage.setItem(
      'landscape-designer.project.corrupt',
      '{ this is not json',
    )
    expect(loadProject('corrupt')).toBeNull()
  })

  it('survives a corrupt index without losing stored projects', () => {
    const project = createNewProject('Survivor', sampleScene)
    saveProject(project, '')
    localStorage.setItem('landscape-designer.projects.index', 'not-json')

    expect(listProjectSummaries()).toEqual([])
    expect(loadProject(project.id)).toEqual(project)
  })
})
