import { beforeEach, describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderWithTheme } from '../../test/testUtils'
import { createNewProject } from '@features/projects/projectStorage'
import { useDesignerStore } from './designerStore'
import { DesignerView } from './DesignerView'

function openSampleProject(): void {
  const project = createNewProject('Front Yard', {
    photoDataUrl: 'data:image/jpeg;base64,AAAA',
    photoPixelWidth: 800,
    photoPixelHeight: 600,
    calibration: null,
    placements: [
      {
        id: 'placement-1',
        plantId: 'firebush',
        centerXFeet: 10,
        centerYFeet: 8,
        rotationDegrees: 0,
        sizeScaleFactor: 1,
        sizeMode: 'mature',
      },
    ],
  })
  act(() => useDesignerStore.getState().openProject(project))
}

describe('DesignerView', () => {
  beforeEach(() => {
    useDesignerStore.getState().closeDesigner()
    localStorage.clear()
  })

  it('guides the user to open a project when none is active', () => {
    renderWithTheme(<DesignerView />)

    expect(screen.getByText('No design open')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to projects/i })).toBeInTheDocument()
  })

  it('renders the editor shell (toolbar, palette, properties) for an open project', async () => {
    openSampleProject()
    renderWithTheme(<DesignerView />)

    expect(screen.getByDisplayValue('Front Yard')).toBeInTheDocument()
    expect(await screen.findByText('Firebush')).toBeInTheDocument()
    // No selection, so the inspector shows guidance rather than controls.
    expect(screen.getByText('Working tips')).toBeInTheDocument()
    expect(screen.queryByText('No design open')).not.toBeInTheDocument()
  })
})
