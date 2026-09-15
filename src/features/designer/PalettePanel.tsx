/**
 * Left panel: searchable species palette. Clicking a species "arms" it; the
 * next canvas click places it (the canvas shows a ghost preview under the
 * cursor while armed).
 */

import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { PlantCategory } from '@core/domain/plant'
import { usePlantCatalog } from '@features/catalog/usePlantCatalog'
import { useDesignerStore } from './designerStore'

const PALETTE_WIDTH_PX = 280

const TAB_CATEGORIES: Array<{ label: string; category: PlantCategory | null }> = [
  { label: 'All', category: null },
  { label: 'Native', category: 'native' },
  { label: 'Edible', category: 'edible' },
]

export function PalettePanel() {
  const { plants } = usePlantCatalog()
  const armedPlant = useDesignerStore((state) => state.armedPlant)
  const setArmedPlant = useDesignerStore((state) => state.setArmedPlant)

  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const visiblePlants = useMemo(() => {
    const activeCategory = TAB_CATEGORIES[activeTab].category
    const needle = searchText.trim().toLowerCase()
    return plants.filter((plant) => {
      const inCategory = !activeCategory || plant.category === activeCategory
      const matchesSearch =
        needle === '' ||
        `${plant.commonName} ${plant.scientificName}`.toLowerCase().includes(needle)
      return inCategory && matchesSearch
    })
  }, [plants, searchText, activeTab])

  return (
    <Box sx={{ width: PALETTE_WIDTH_PX, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Tabs value={activeTab} onChange={(_, index) => setActiveTab(index)} variant="fullWidth">
        {TAB_CATEGORIES.map((tab) => (
          <Tab key={tab.label} label={tab.label} />
        ))}
      </Tabs>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1 }}>
        <SearchIcon fontSize="small" color="action" />
        <InputBase
          fullWidth
          size="small"
          placeholder="Search species..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </Stack>

      <List dense disablePadding sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {visiblePlants.map((plant) => (
          <ListItemButton
            key={plant.id}
            selected={armedPlant?.id === plant.id}
            onClick={() => setArmedPlant(armedPlant?.id === plant.id ? null : plant)}
          >
            <Box
              component="img"
              src={plant.images.matureUrl}
              alt=""
              sx={{ width: 40, height: 40, objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 1, mr: 1.5 }}
            />
            <ListItemText
              primary={plant.commonName}
              secondary={`${plant.matureSpreadFeet} ft spread`}
              primaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
        ))}
        {visiblePlants.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No species match this search.
          </Typography>
        )}
      </List>

      <Chip
        size="small"
        label={armedPlant ? `Placing ${armedPlant.commonName} - click map` : 'Pick a species to place'}
        color={armedPlant ? 'primary' : 'default'}
        variant={armedPlant ? 'filled' : 'outlined'}
        sx={{ m: 1 }}
      />
    </Box>
  )
}
