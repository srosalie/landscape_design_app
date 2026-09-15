/**
 * Projects home: list saved designs with thumbnails, open/delete them, and
 * create new ones from a property photo. Creating a project compresses and
 * embeds the photo immediately so everything downstream is self-contained.
 */

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useDesignerStore } from '@features/designer/designerStore'
import { useAppStore } from '@app/appStore'
import { compressImageFile, createThumbnail } from './imageUtils'
import type { CompressedPhoto } from './imageUtils'
import {
  createNewProject,
  deleteProject,
  listProjectSummaries,
  loadProject,
  saveProject,
} from './projectStorage'
import type { ProjectSummary } from '@core/domain/project'

const THUMBNAIL_HEIGHT_PX = 150

export function ProjectsView() {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const openInDesigner = useDesignerStore((state) => state.openProject)
  const setAppView = useAppStore((state) => state.setView)

  function refreshSummaries(): void {
    setSummaries(listProjectSummaries())
  }

  useEffect(refreshSummaries, [])

  async function handleOpen(summaryId: string): Promise<void> {
    const project = loadProject(summaryId)
    if (!project) return
    openInDesigner(project)
    setAppView('designer')
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!pendingDeleteId) return
    deleteProject(pendingDeleteId)
    setPendingDeleteId(null)
    refreshSummaries()
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center">
        <Typography variant="h5">Projects</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ ml: 'auto' }}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Project
        </Button>
      </Stack>

      {summaries.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          No projects yet. Create one from a property photo to start designing.
        </Typography>
      ) : (
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={2}>
          {summaries.map((summary) => (
            <Card key={summary.id}>
              <CardActionArea onClick={() => void handleOpen(summary.id)}>
                <CardMedia
                  component="img"
                  image={summary.thumbnailDataUrl}
                  alt={summary.name}
                  sx={{ height: THUMBNAIL_HEIGHT_PX, objectFit: 'cover' }}
                />
                <CardContent sx={{ pb: 0 }}>
                  <Typography variant="subtitle1" noWrap>{summary.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated {new Date(summary.updatedAtIso).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </CardActionArea>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Delete ${summary.name}`}
                  onClick={() => setPendingDeleteId(summary.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <NewProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => {
          refreshSummaries()
          setAppView('designer')
        }}
      />

      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Delete this project?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            The design and its placements will be permanently removed from this browser.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleConfirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function NewProjectDialog({ open, onClose, onCreated }: NewProjectDialogProps) {
  const openInDesigner = useDesignerStore((state) => state.openProject)

  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null)
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  function resetAndClose(): void {
    setName('')
    setPhoto(null)
    setThumbnailDataUrl('')
    setErrorText(null)
    onClose()
  }

  async function handlePhotoSelected(file: File | undefined): Promise<void> {
    if (!file) return
    setErrorText(null)
    try {
      const compressed = await compressImageFile(file)
      setPhoto(compressed)
      setThumbnailDataUrl(await createThumbnail(compressed.dataUrl))
    } catch (error) {
      console.error(error)
      setErrorText('That file could not be read as an image.')
    }
  }

  async function handleCreate(): Promise<void> {
    if (!photo) {
      setErrorText('Choose a property photo first.')
      return
    }
    setIsCreating(true)
    try {
      const project = createNewProject(name.trim() || 'Untitled design', {
        photoDataUrl: photo.dataUrl,
        photoPixelWidth: photo.widthPx,
        photoPixelHeight: photo.heightPx,
        calibration: null,
        placements: [],
      })
      saveProject(project, thumbnailDataUrl)
      openInDesigner(project)
      onCreated()
      resetAndClose()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Project</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Front yard redesign"
            fullWidth
          />
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            fullWidth
          >
            Choose property photo
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => void handlePhotoSelected(event.target.files?.[0])}
            />
          </Button>
          {photo && (
            <Box
              component="img"
              src={photo.dataUrl}
              alt="Property preview"
              sx={{ maxHeight: 220, width: '100%', objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 2 }}
            />
          )}
          {errorText && <Typography color="error" variant="body2">{errorText}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose}>Cancel</Button>
        <Button variant="contained" disabled={isCreating || !photo} onClick={() => void handleCreate()}>
          {isCreating ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
