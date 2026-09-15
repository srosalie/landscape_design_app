# Landscape Designer

A React web app for planning Florida-native and Florida-friendly edible
landscapes directly on the user's own property photo. Users browse a searchable,
filterable plant catalog, upload a photo, calibrate a scale, and place species at
true-to-scale mature (or 1-gallon) size on an interactive canvas.

Built for extensibility from the ground up: the core domain is platform-agnostic
(React Native-ready), the data layer sits behind a repository interface, catalog
domains can grow without migrations, and an AI `DesignAdvisor` boundary is ready
for real model-backed recommendations.

> This is a standalone project owned by its maintainers. It does not share code
> with any other product.

## Tech stack

Vite 6 · React 19 · TypeScript (strict) · MUI 7 · Zustand · Vitest + Testing Library. `node >= 18` (Node 22 enables an optional SQLite schema sanity check).

## Quickstart

```bash
npm install
npm run data      # regenerate catalog snapshot + placeholder artwork (already committed, safe to skip)
npm run dev       # http://localhost:5173
```

Create a project from a photo, then (recommended order):

1. Open the **Plant Catalog** tab to explore species.
2. **New Project** → upload a property photo.
3. In the **Designer**, pick a species on the left and click the photo to place it.
4. Use the **ruler** tool to drag a line over a driveway/wall of known length and
   set the scale, so plants render true to size.
5. Drag to move, corner handle to scale, top handle to rotate; `Ctrl+Z`/`Ctrl+Y`
   to undo/redo; **Export PNG** to share the plan.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npm run build` | `tsc -b` + production build |
| `npm run preview` | Serve the built bundle |
| `npm run seed` | Validate `db/seed/species.json`, write JSON snapshot, optional SQLite check |
| `npm run art` | Generate placeholder SVGs into `public/plants/` |
| `npm run data` | `seed` + `art` |

## How the data pipeline works

```
db/seed/species.json        editable source of truth (~20 starter species)
        │  npm run seed  (validates against src/data/vocabulary.json)
        ▼
src/data/generated/plants.json   JSON snapshot bundled with the app (never hand-edit)
        │  npm run art
        ▼
public/plants/<id>-{juvenile|mature}.svg   deterministic placeholder artwork
```

Each species in the catalog carries an extensible schema: id, common + scientific
names, category (`native`/`edible`/`ornamental`/`material`/`water`), growth form,
two transparent-background images (1-gallon + mature), bloom months, years to
maturity, mature height/spread, sun, soil texture + moisture, salt and drought
tolerance, germination temperature, notes, tags, and an open `attributes` bag.

## Architecture

# **TODO: change 'repositories' to 'stores'- less confusing

```
src/
├── core/            React-free, mobile-extractable
│   ├── domain/      Plant, Placement, DesignScene/Project types + domain logic
│   ├── repositories/ PlantRepository interface + JSON-snapshot implementation
│   └── services/    geometry, snapshot-based undo/redo, formatting
├── data/            vocabulary.json (canonical vocab) + generated/ (artifacts)
├── features/
│   ├── catalog/     browse/search/filter + species details dialog
│   ├── projects/    localStorage persistence, photo compression
│   ├── designer/    SVG canvas editor (store, canvas, panels, toolbar, PNG export)
│   └── ai/          DesignAdvisor interface + rule-based implementation
└── app/             shell, theme, navigation, global store
```

Design notes:
- Coordinates are stored in **feet** (world units), not pixels — recalibrating the
  photo rescales the drawing automatically, and it keeps the door open to
  GIS/CAD interchange (GeoJSON/DXF).
- Undo/redo uses scene snapshots; drag gestures snapshot once and mutate
  transiently, so a drag is a single undo step.
- The three feature views are **code-split** (React.lazy) so the MUI-heavy editor
  only downloads on first open.

## Extending

# **TODO: 'React-free'?

See `AGENTS.md` for the detailed recipes. Highlights:

- **Add species / swap in real photos** — edit the seed, run `npm run data`; set
  `SEED_IMAGE_EXTENSION = '.png'` and provide `<id>-{juvenile|mature}.png`.
- **Add a catalog domain** (water features, mulch, wall stone...) — extend
  vocabulary.json, `PLANT_CATEGORIES`, and the schema CHECKs together; extras go
  in `attributes` until they need their own field.
- **Backend / user accounts** — implement `PlantRepository` and swap the factory
  in `usePlantCatalog`; replace `features/projects/projectStorage` with a
  server-backed module.
- **Mobile** — `core/` is React-free and designed to share with a React Native
  client.
- **AI features** — replace the rule-based `designAdvisor` with an API-backed
  implementation behind the same `DesignAdvisor` interface.

## Testing

Vitest covers the pure core (geometry, history, filters, repository, advisor) and
localStorage CRUD. React component smoke tests sit in `src/features/*/*.test.tsx`
where relevant. Run the full gate before committing: `npm run test && npm run lint && npm run build`.

## License

Private / internal project. Not licensed for public redistribution.
