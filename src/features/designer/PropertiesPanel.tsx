/**
 * Right panel: inspects and edits the selected placement (size mode, size
 * scale, rotation, stacking order) or shows tips when nothing is selected.
 *
 * Slider pattern: pointer-down on the slider pushes one undo snapshot, every
 * move applies a transient update, so a full scrub collapses to ONE history
 * entry while still previewing live.
 */

import { useState } from 'react'
import {
  Box,
  Button,
  Divider,
  IconButton,
  Slider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  MAX_SIZE_SCALE_FACTOR,
  MIN_SIZE_SCALE_FACTOR,
  placementSizeFeet,
} from '@core/domain/design'
import type { SizeMode } from '@core/domain/design'
import { formatMatureSize } from '@core/services/formatting'
import type { Plant } from '@core/domain/plant'
import { PlantDetailDialog } from '@features/catalog/PlantDetailDialog'
import { selectSelectedPlacement, useDesignerStore } from './designerStore'

const PANEL_WIDTH_PX = 300

const TIPS = [
  'Pick a species on the left, then click the photo to place it.',
  'Calibrate scale: drag the ruler tool across a driveway or wall of known length.',
  'Drag the orange corner handle to resize; blue handle rotates.',
  'Ctrl+Z / Ctrl+Y step backward and forward through changes.',
  'Arrow keys nudge the selection (hold Shift for bigger steps).',
]

export function PropertiesPanel({ plantsById }: { plantsById: Map<string, Plant> }) {
  const scene = useDesignerStore((state) => state.scene)
  const selection = useDesignerStore(selectSelectedPlacement)

  const beginChange = useDesignerStore((state) => state.beginChange)
  const updatePlacement = useDesignerStore((state) => state.updatePlacement)
  const removePlacement = useDesignerStore((state) => state.removePlacement)
  const duplicatePlacement = useDesignerStore((state) => state.duplicatePlacement)
  const shiftPlacementZOrder = useDesignerStore((state) => state.shiftPlacementZOrder)

  const [detailPlant, setDetailPlant] = useState<Plant | null>(null)
  const plant = selection ? plantsById.get(selection.plantId) : undefined

  return (
    <Box sx={{ width: PANEL_WIDTH_PX, borderLeft: 1, borderColor: 'divider', p: 2, overflowY: 'auto' }}>
      {!scene || !selection || !plant ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Working tips</Typography>
          {TIPS.map((tip) => (
            <Typography key={tip} variant="body2" color="text.secondary">
              - {tip}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>{plant.commonName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {formatMatureSize(plant.matureHeightFeet, plant.matureSpreadFeet)} at maturity
              </Typography>
            </Box>
            <Tooltip title="Species details">
              <IconButton size="small" onClick={() => setDetailPlant(plant)} sx={{ ml: 'auto' }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider />

          <Box>
            <Typography gutterBottom variant="body2" color="text.secondary">Displayed as</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={selection.sizeMode}
              onChange={(_, mode: SizeMode | null) =>
                mode && updatePlacement(selection.id, { sizeMode: mode })
              }
            >
              <ToggleButton value="juvenile">Juvenile</ToggleButton>
              <ToggleButton value="mature">Mature</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box
            onPointerDown={() => beginChange()}
          >
            <Typography gutterBottom variant="body2" color="text.secondary">
              Size x{selection.sizeScaleFactor.toFixed(2)}
            </Typography>
            <Slider
              min={MIN_SIZE_SCALE_FACTOR}
              max={MAX_SIZE_SCALE_FACTOR}
              step={0.05}
              marks={[{ value: 1, label: '1x' }]}
              value={selection.sizeScaleFactor}
              onChange={(_, value) => updatePlacement(selection.id, { sizeScaleFactor: value as number }, { transient: true })}
              valueLabelDisplay="auto"
            />
          </Box>

          <Box onPointerDown={() => beginChange()}>
            <Typography gutterBottom variant="body2" color="text.secondary">
              Rotation {Math.round(selection.rotationDegrees)} degrees
            </Typography>
            <Slider
              min={-180}
              max={180}
              step={5}
              value={selection.rotationDegrees}
              onChange={(_, value) => updatePlacement(selection.id, { rotationDegrees: value as number }, { transient: true })}
            />
          </Box>

          <Divider />

          <Stack direction="row" spacing={1}>
            <Tooltip title="Bring forward">
              <IconButton onClick={() => shiftPlacementZOrder(selection.id, 'raise')}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send backward">
              <IconButton onClick={() => shiftPlacementZOrder(selection.id, 'lower')}>
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate (offset 2 ft)">
              <IconButton onClick={() => duplicatePlacement(selection.id)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete (Del)">
              <IconButton color="error" sx={{ ml: 'auto' }} onClick={() => removePlacement(selection.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {(() => {
            const rendered = placementSizeFeet(plant, selection)
            return (
              <Typography variant="caption" color="text.secondary">
                Currently drawn at {rendered.widthFeet.toFixed(1)} ft wide x {rendered.heightFeet.toFixed(1)} ft tall
              </Typography>
            )
          })()}

          <Button size="small" onClick={() => useDesignerStore.getState().setSelectedPlacementId(null)}>
            Deselect
          </Button>
        </Stack>
      )}

      <PlantDetailDialog plant={detailPlant} onClose={() => setDetailPlant(null)} />
    </Box>
  )
}
