/**
 * Full-species dialog showing both required images (1 gallon and mature) plus
 * every catalog field. Also reachable from the designer's properties panel.
 */

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'
import type { Plant } from '@core/domain/plant'
import {
  formatBloomMonths,
  formatGerminationRange,
  formatMatureSize,
  formatTolerance,
  formatYearsToMaturity,
} from '@core/services/formatting'

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

interface ImageFigureProps {
  url: string
  caption: string
}

function ImageFigure({ url, caption }: ImageFigureProps) {
  return (
    <Stack spacing={1} alignItems="center">
      <Box component="img" src={url} alt={caption} sx={{ width: '100%', aspectRatio: '1', objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 2 }} />
      <Typography variant="caption" color="text.secondary">{caption}</Typography>
    </Stack>
  )
}

interface PlantDetailDialogProps {
  plant: Plant | null
  onClose: () => void
}

export function PlantDetailDialog({ plant, onClose }: PlantDetailDialogProps) {
  if (!plant) return null

  const metadataRows: Array<[string, string]> = [
    ['Category', capitalize(plant.category)],
    ['Growth form', capitalize(plant.form)],
    ['Bloom time', formatBloomMonths(plant.bloomMonths)],
    ['Time to maturity', formatYearsToMaturity(plant.yearsToMaturity)],
    ['Mature size', formatMatureSize(plant.matureHeightFeet, plant.matureSpreadFeet)],
    ['Sun', plant.sunExposure.map(capitalize).join(', ')],
    ['Soil texture', plant.soilTextures.map(capitalize).join(', ')],
    ['Soil moisture', plant.soilMoisture.map(capitalize).join(', ')],
    ['Salt tolerance', formatTolerance(plant.saltTolerance)],
    ['Drought tolerance', formatTolerance(plant.droughtTolerance)],
    ['Germination soil temp', formatGerminationRange(plant.germinationTempF)],
  ]

  return (
    <Dialog open={Boolean(plant)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="baseline" useFlexGap flexWrap="wrap">
          <Typography variant="h6" component="span">{plant.commonName}</Typography>
          <Typography variant="body2" color="text.secondary" component="span" fontStyle="italic">
            {plant.scientificName}
          </Typography>
          <Chip size="small" color={plant.category === 'native' ? 'success' : 'secondary'} label={plant.category} />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={2}>
              <ImageFigure url={plant.images.juvenileUrl} caption="1 gallon size" />
              <ImageFigure url={plant.images.matureUrl} caption="Mature specimen" />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Table size="small">
              <TableBody>
                {metadataRows.map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell component="th" scope="row" sx={{ width: '45%', color: 'text.secondary' }}>
                      {label}
                    </TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Notes</Typography>
            <Typography variant="body2">{plant.notes}</Typography>
            {plant.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                {plant.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  )
}
