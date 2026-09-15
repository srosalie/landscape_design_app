/**
 * Global MUI theme. System font stack keeps the bundle free of webfont
 * downloads; the palette is generic Material green/amber, chosen to be
 * replaced by project branding later via this single file.
 */

import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    primary: { main: '#2e7d32' },
    secondary: { main: '#ef6c00' },
    background: { default: '#fafaf7' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
})
