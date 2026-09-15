/**
 * Designer command bar: project name, active tool, undo/redo, placement size
 * mode, scale-calibration status, and autosave feedback. Canvas-local controls
 * (zoom fit, PNG export) float over the canvas itself since they need direct
 * access to the SVG element.
 */

import {
  AppBar,
  Chip,
  Divider,
  InputBase,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PanToolIcon from '@mui/icons-material/PanTool'
import NearMeIcon from '@mui/icons-material/NearMe'
import RedoIcon from '@mui/icons-material/Redo'
import StraightenIcon from '@mui/icons-material/Straighten'
import UndoIcon from '@mui/icons-material/Undo'
import { pixelsPerFoot } from '@core/domain/design'
import { useAppStore } from '@app/appStore'
import { selectSelectedPlacement, useDesignerStore } from './designerStore'

interface DesignerToolbarProps {
  saveStatusText: string
}

export function DesignerToolbar({ saveStatusText }: DesignerToolbarProps) {
  const scene = useDesignerStore((state) => state.scene)
  const projectName = useDesignerStore((state) => state.projectName)
  const activeTool = useDesignerStore((state) => state.activeTool)
  const defaultSizeMode = useDesignerStore((state) => state.defaultSizeMode)
  const history = useDesignerStore((state) => state.history)

  const renameProject = useDesignerStore((state) => state.renameProject)
  const setActiveTool = useDesignerStore((state) => state.setActiveTool)
  const setDefaultSizeMode = useDesignerStore((state) => state.setDefaultSizeMode)
  const undo = useDesignerStore((state) => state.undo)
  const redo = useDesignerStore((state) => state.redo)
  const hasSelection = Boolean(useDesignerStore(selectSelectedPlacement))
  const setAppView = useAppStore((state) => state.setView)

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Tooltip title="Back to projects">
          <ToggleButton size="small" value="back" onClick={() => setAppView('projects')} sx={{ border: 1, borderColor: 'divider' }}>
            <ArrowBackIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <InputBase
          value={projectName}
          onChange={(event) => renameProject(event.target.value)}
          sx={{ fontWeight: 600, fontSize: '1rem', maxWidth: 220 }}
          inputProps={{ 'aria-label': 'Project name' }}
        />

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <ToggleButtonGroup
          exclusive
          size="small"
          value={activeTool}
          onChange={(_, tool) => tool && setActiveTool(tool)}
        >
          <Tooltip title="Select, move, rotate (V)">
            <ToggleButton value="select"><NearMeIcon fontSize="small" /></ToggleButton>
          </Tooltip>
          <Tooltip title="Pan the view (H)">
            <ToggleButton value="pan"><PanToolIcon fontSize="small" /></ToggleButton>
          </Tooltip>
          <Tooltip title="Calibrate scale: drag across an object of known length">
            <ToggleButton value="calibrate"><StraightenIcon fontSize="small" /></ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <ToggleButtonGroup exclusive size="small" value={defaultSizeMode} onChange={(_, mode) => mode && setDefaultSizeMode(mode)}>
          <Tooltip title="New plants start at 1 gallon size">
            <ToggleButton value="juvenile">Juvenile</ToggleButton>
          </Tooltip>
          <Tooltip title="New plants start at mature spread">
            <ToggleButton value="mature">Mature</ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <ToggleButton size="small" value="undo" disabled={history.past.length === 0} onClick={undo} sx={{ border: 1, borderColor: 'divider' }}>
              <UndoIcon fontSize="small" />
            </ToggleButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <span>
            <ToggleButton size="small" value="redo" disabled={history.future.length === 0} onClick={redo} sx={{ border: 1, borderColor: 'divider' }}>
              <RedoIcon fontSize="small" />
            </ToggleButton>
          </span>
        </Tooltip>

        {scene && (
          scene.calibration ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`Scale ${pixelsPerFoot(scene).toFixed(1)} px/ft`}
              onClick={() => setActiveTool('calibrate')}
            />
          ) : (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label="Uncalibrated estimate - click to calibrate"
              onClick={() => setActiveTool('calibrate')}
            />
          )
        )}

        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }} alignItems="center">
          {hasSelection && (
            <Typography variant="caption" color="text.secondary">1 selected</Typography>
          )}
          <Typography variant="caption" color="text.secondary">{saveStatusText}</Typography>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
