import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithTheme } from '../test/testUtils'
import { createNewProject } from '@features/projects/projectStorage'
import { useDesignerStore } from '@features/designer/designerStore'
import { App } from './App'
import { useAppStore } from './appStore'

const EMPTY_PROJECTS_TEXT =
  'No projects yet. Create one from a property photo to start designing.'

function openSampleProject(): void {
  const project = createNewProject('Front Yard', {
    photoDataUrl: 'data:image/jpeg;base64,AAAA',
    photoPixelWidth: 800,
    photoPixelHeight: 600,
    calibration: null,
    placements: [],
  })
  useDesignerStore.getState().openProject(project)
}

describe('App shell', () => {
  beforeEach(() => {
    useAppStore.getState().setView('projects')
    useDesignerStore.getState().closeDesigner()
    localStorage.clear()
  })

  it('switches views when a tab is selected', async () => {
    renderWithTheme(<App />)
    expect(await screen.findByText(EMPTY_PROJECTS_TEXT)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Plant Catalog' }))

    expect(await screen.findByRole('heading', { name: 'Plant Catalog' })).toBeInTheDocument()
  })

  it('keeps the user on Projects and explains why when Designer is opened with no project', async () => {
    renderWithTheme(<App />)
    await screen.findByText(EMPTY_PROJECTS_TEXT)

    fireEvent.click(screen.getByRole('tab', { name: 'Designer' }))

    expect(
      await screen.findByText('Open a project first to use the designer.'),
    ).toBeInTheDocument()
    // Still on Projects rather than an empty editor.
    expect(screen.getByText(EMPTY_PROJECTS_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Plant Catalog' })).not.toBeInTheDocument()
  })

  it('opens the designer when a project is active', async () => {
    openSampleProject()
    renderWithTheme(<App />)

    fireEvent.click(screen.getByRole('tab', { name: 'Designer' }))

    expect(await screen.findByDisplayValue('Front Yard')).toBeInTheDocument()
  })
})
