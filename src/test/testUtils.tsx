/**
 * Test helpers. Provides renderWithTheme so view smoke tests mount inside the
 * same MUI ThemeProvider the app uses, keeping snapshots/assertions realistic.
 */

import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { appTheme } from '@app/theme'

export function renderWithTheme(ui: ReactElement): RenderResult {
  return render(<ThemeProvider theme={appTheme}>{ui}</ThemeProvider>)
}
