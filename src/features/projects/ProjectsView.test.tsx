import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithTheme } from '../../test/testUtils'
import { ProjectsView } from './ProjectsView'

describe('ProjectsView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the empty state when there are no projects', () => {
    renderWithTheme(<ProjectsView />)

    expect(
      screen.getByText('No projects yet. Create one from a property photo to start designing.'),
    ).toBeInTheDocument()
  })

  it('opens the New Project dialog with Create disabled until a photo is chosen', async () => {
    renderWithTheme(<ProjectsView />)

    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText('New Project')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled()
  })
})
