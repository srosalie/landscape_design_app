/**
 * Compact catalog card: mature artwork, names, and the metadata most useful
 * when scanning for candidates. Clicking opens the full detail dialog.
 */

import { Box, Card, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material'
import type { Plant, PlantCategory } from '@core/domain/plant'
import { formatBloomMonths, formatMatureSize } from '@core/services/formatting'

const CATEGORY_CHIP_COLOR: Partial<Record<PlantCategory, 'success' | 'secondary'>> = {
  native: 'success',
  edible: 'secondary',
}

interface PlantCardProps {
  plant: Plant
  onOpenDetails: (plant: Plant) => void
}

export function PlantCard({ plant, onOpenDetails }: PlantCardProps) {
  return (
    <Card
      sx={{ height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={() => onOpenDetails(plant)}
    >
      <CardMedia
        component="img"
        image={plant.images.matureUrl}
        alt={plant.commonName}
        sx={{ height: 170, objectFit: 'contain', bgcolor: 'grey.100', p: 1 }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" noWrap title={plant.commonName}>
            {plant.commonName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }} noWrap>
            {plant.scientificName}
          </Typography>
          <Box sx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                color={CATEGORY_CHIP_COLOR[plant.category] ?? 'default'}
                label={plant.category}
                variant={plant.category in CATEGORY_CHIP_COLOR ? 'filled' : 'outlined'}
              />
              <Chip size="small" variant="outlined" label={formatMatureSize(plant.matureHeightFeet, plant.matureSpreadFeet)} />
              <Chip size="small" variant="outlined" label={`Blooms ${formatBloomMonths(plant.bloomMonths)}`} />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
