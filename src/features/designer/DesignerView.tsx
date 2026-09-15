/**
 * Designer screen layout: toolbar on top, species palette left, canvas center,
 * properties inspector right. Also owns the two cross-cutting behaviors that
 * need whole-store visibility: keyboard shortcuts and autosave.
 */

import { useEffect, useRef, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useAppStore } from '@app/appStore'
import { PROJECT_SCHEMA_VERSION } from '@core/domain/project'
import { createThumbnail } from '@features/projects/imageUtils'
import { saveProject } from '@features/projects/projectStorage'
import { usePlantCatalog } from '@features/catalog/usePlantCatalog'
import { selectSelectedPlacement, useDesignerStore } from './designerStore'
import { EditorCanvas } from './EditorCanvas'
import { DesignerToolbar } from './DesignerToolbar'
import { PalettePanel } from './PalettePanel'
import { PropertiesPanel } from './PropertiesPanel'

const AUTOSAVE_DEBOUNCE_MS = 700
const NUDGE_STEP_FEET = 0.5
const NUDGE_FAST_MULTIPLIER = 4

function isTextEntryTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  )
}

/** Persists the live designer state back to localStorage as a full Project. */
async function persistActiveProject(): Promise<void> {
  const store = useDesignerStore.getState()
  if (!store.projectId || !store.scene) return
  const thumbnailDataUrl = await createThumbnail(store.scene.photoDataUrl).catch(() => '')
  saveProject(
    {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: store.projectId,
      name: store.projectName,
      createdAtIso: store.projectCreatedAtIso,
      updatedAtIso: new Date().toISOString(),
      scenes: [store.scene],
    },
    thumbnailDataUrl,
  )
}

export function DesignerView() {
  const { plantsById } = usePlantCatalog()
  const projectId = useDesignerStore((state) => state.projectId)
  const scene = useDesignerStore((state) => state.scene)
  const setAppView = useAppStore((state) => state.setView)

  const [saveStatusText, setSaveStatusText] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcuts: delete, undo/redo, escape, arrow nudges.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const store = useDesignerStore.getState()
      if (!store.scene || isTextEntryTarget(event.target)) return

      const selected = selectSelectedPlacement(store)
      if (event.key === 'Escape') {
        store.setSelectedPlacementId(null)
        store.setArmedPlant(null)
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault()
        store.removePlacement(selected.id)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        store.redo()
        return
      }
      if (selected && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? NUDGE_STEP_FEET * NUDGE_FAST_MULTIPLIER : NUDGE_STEP_FEET
        switch (event.key) {
          case 'ArrowLeft': store.nudgeSelectedPlacement(-step, 0); break
          case 'ArrowRight': store.nudgeSelectedPlacement(step, 0); break
          case 'ArrowUp': store.nudgeSelectedPlacement(0, -step); break
          case 'ArrowDown': store.nudgeSelectedPlacement(0, step); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Autosave: any store change (scene edits, renames) schedules a debounced persist.
  useEffect(() => {
    if (!projectId) return undefined

    const scheduleSave = () => {
      setSaveStatusText('Editing...')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void persistActiveProject().then(() => {
          setSaveStatusText(
            `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          )
        })
      }, AUTOSAVE_DEBOUNCE_MS)
    }

    if (useDesignerStore.getState().scene) scheduleSave()
    return useDesignerStore.subscribe(scheduleSave)
  }, [projectId])

  if (!projectId || !scene) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Card sx={{ maxWidth: 420 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6">No design open</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Create a project from a property photo to start placing plants.
              </Typography>
              <Button variant="contained" onClick={() => setAppView('projects')}>
                Go to Projects
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <DesignerToolbar saveStatusText={saveStatusText} />
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PalettePanel />
        <EditorCanvas plantsById={plantsById} />
        <PropertiesPanel plantsById={plantsById} />
      </Box>
    </Box>
  )
}
