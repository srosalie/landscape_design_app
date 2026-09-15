/**
 * Catalog browser: searchable, filterable grid of the plant database with a
 * detail dialog. Filters combine additively; result count is always visible
 * so narrowing is easy to follow.
 */

import { useMemo, useState } from 'react'
import {
  Box,
  Container,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { Plant, PlantCategory, SunExposure, ToleranceLevel } from '@core/domain/plant'
import { MONTH_NAMES_ABBREVIATED } from '@core/services/formatting'
import { EMPTY_CATALOG_FILTERS, filterPlants } from './filterPlants'
import type { CatalogFilters } from './filterPlants'
import { PlantCard } from './PlantCard'
import { PlantDetailDialog } from './PlantDetailDialog'
import { usePlantCatalog } from './usePlantCatalog'

const SEARCH_FIELD_WIDTH_PX = 240

function buildMonthMenuItems() {
  return MONTH_NAMES_ABBREVIATED.map((name, index) => (
    <MenuItem key={name} value={index + 1}>{name}</MenuItem>
  ))
}

export function CatalogView() {
  const { plants, loadError } = usePlantCatalog()
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS)
  const [detailPlant, setDetailPlant] = useState<Plant | null>(null)

  const filteredPlants = useMemo(() => filterPlants(plants, filters), [plants, filters])

  const patchFilters = (partial: Partial<CatalogFilters>) =>
    setFilters((current) => ({ ...current, ...partial }))

  if (loadError) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="error">
          The plant catalog failed to load. Try regenerating it with `npm run data`.
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Plant Catalog</Typography>

        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            label="Search"
            placeholder="Name or tag..."
            value={filters.searchText}
            onChange={(event) => patchFilters({ searchText: event.target.value })}
            sx={{ width: SEARCH_FIELD_WIDTH_PX }}
          />
          <ToggleButtonGroup
            size="small"
            value={filters.categories}
            onChange={(_, selected: PlantCategory[]) => patchFilters({ categories: selected })}
          >
            <ToggleButton value="native">Native</ToggleButton>
            <ToggleButton value="edible">Edible</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            select
            size="small"
            label="Sun"
            value={filters.sunExposure ?? ''}
            onChange={(event) => patchFilters({ sunExposure: (event.target.value || null) as SunExposure | null })}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="full">Full sun</MenuItem>
            <MenuItem value="part">Part sun</MenuItem>
            <MenuItem value="shade">Shade</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Drought tolerance"
            value={filters.minimumDroughtTolerance ?? ''}
            onChange={(event) =>
              patchFilters({ minimumDroughtTolerance: (event.target.value || null) as ToleranceLevel | null })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="moderate">Moderate+</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Salt tolerance"
            value={filters.minimumSaltTolerance ?? ''}
            onChange={(event) =>
              patchFilters({ minimumSaltTolerance: (event.target.value || null) as ToleranceLevel | null })
            }
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="moderate">Moderate+</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Blooming in"
            value={filters.bloomMonth ?? ''}
            onChange={(event) =>
              patchFilters({ bloomMonth: event.target.value ? Number(event.target.value) : null })
            }
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">Any</MenuItem>
            {buildMonthMenuItems()}
          </TextField>
          <Box sx={{ ml: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              {filteredPlants.length} of {plants.length} species
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          {filteredPlants.map((plant) => (
            <Grid key={plant.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <PlantCard plant={plant} onOpenDetails={setDetailPlant} />
            </Grid>
          ))}
        </Grid>
      </Stack>

      <PlantDetailDialog plant={detailPlant} onClose={() => setDetailPlant(null)} />
    </Container>
  )
}
