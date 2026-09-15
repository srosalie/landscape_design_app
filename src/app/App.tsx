/**
 * Application shell: header brand + view tabs, then the active feature view.
 * The Designer tab stays disabled until a project is open in the designer
 * store, which prevents landing on an empty editor by accident.
 */

import { lazy, Suspense, useState } from 'react'
import {
  AppBar,
  Box,
  CircularProgress,
  Container,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material'
import { useDesignerStore } from '@features/designer/designerStore'
import { useAppStore } from './appStore'
import type { AppView } from './appStore'

// Feature views are code-split so the shell loads instantly and MUI's heavier
// components (the editor especially) only download when first opened.
const ProjectsView = lazy(() =>
  import('@features/projects/ProjectsView').then((module) => ({ default: module.ProjectsView })),
)
const CatalogView = lazy(() =>
  import('@features/catalog/CatalogView').then((module) => ({ default: module.CatalogView })),
)
const DesignerView = lazy(() =>
  import('@features/designer/DesignerView').then((module) => ({ default: module.DesignerView })),
)

const VIEWS: Array<{ value: AppView; label: string }> = [
  { value: 'projects', label: 'Projects' },
  { value: 'catalog', label: 'Plant Catalog' },
  { value: 'designer', label: 'Designer' },
]

export function App() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const hasOpenProject = Boolean(useDesignerStore((state) => state.projectId))
  const [navigationHint, setNavigationHint] = useState<string | null>(null)

  /**
   * The Designer tab stays enabled, but selecting it without an open project
   * would land on an empty editor. Instead, bounce to Projects and explain why.
   * (Keeping Tab as a DIRECT child of Tabs is required: MUI reads each Tab's
   * `value` from the direct children, so wrapping it breaks value matching.)
   */
  function handleViewChange(nextView: AppView) {
    if (nextView === 'designer' && !hasOpenProject) {
      setView('projects')
      setNavigationHint('Open a project first to use the designer.')
      return
    }
    setView(nextView)
  }

  return (
    <Stack sx={{ height: '100vh' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Box component="img" src="/leaf.svg" alt="" sx={{ width: 28, height: 28, mr: 1.5 }} />
          <Typography variant="h6" noWrap sx={{ mr: 4 }}>
            Landscape Designer
          </Typography>
          <Tabs value={view} onChange={(_, next: AppView) => handleViewChange(next)}>
            {VIEWS.map(({ value, label }) => (
              <Tab key={value} value={value} label={label} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Suspense
          fallback={
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          }
        >
          {view === 'projects' && (
            <Container maxWidth="lg" sx={{ py: 3, overflowY: 'auto' }}>
              <ProjectsView />
            </Container>
          )}
          {view === 'catalog' && <CatalogView />}
          {view === 'designer' && <DesignerView />}
        </Suspense>
      </Box>

      <Snackbar
        open={navigationHint !== null}
        autoHideDuration={4000}
        onClose={() => setNavigationHint(null)}
        message={navigationHint}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}
