import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithTheme } from '../../test/testUtils'
import { CatalogView } from './CatalogView'

describe('CatalogView', () => {
  it('loads the catalog and renders species cards', async () => {
    renderWithTheme(<CatalogView />)

    expect(await screen.findByText('Firebush')).toBeInTheDocument()
    expect(screen.getByText('Loquat')).toBeInTheDocument()
    expect(screen.getByText(/20 species/)).toBeInTheDocument()
  })

  it('filters the grid to matches as the user types a search term', async () => {
    renderWithTheme(<CatalogView />)
    await screen.findByText('Firebush')

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'muhly' } })

    expect(screen.getByText('Muhly Grass')).toBeInTheDocument()
    expect(screen.queryByText('Firebush')).not.toBeInTheDocument()
    expect(screen.queryByText('Loquat')).not.toBeInTheDocument()
  })

  it('opens the species detail dialog from a card', async () => {
    renderWithTheme(<CatalogView />)
    fireEvent.click(await screen.findByText('Firebush'))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Hamelia patens')).toBeInTheDocument()
    expect(within(dialog).getByText('Year-round')).toBeInTheDocument()
    expect(within(dialog).getByText(/1 gallon size/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Mature specimen/)).toBeInTheDocument()
  })
})
