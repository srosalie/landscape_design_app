# AGENTS.md — Landscape Designer

Guidance for AI-assisted development on this repo. Read this before editing code.
Standards for human-readable code live in `.opencode/skills/readable-code/` (loaded
automatically); the short version is: descriptive comments welcome (explain *why*,
docstring exported functions), no commented-out code, strict naming.

## Project

A React web app for designing Florida-native and edible landscapes on a property
photo. Users browse a plant catalog, upload a photo, and place species to scale
on an interactive canvas. Built for extensibility (mobile later); keep the bundle
lean and the layers clean.

## Commands

| Command        | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `npm run dev`  | Dev server                                                     |
| `npm run test` | Vitest (headless single run)                                   |
| `npm run lint` | ESLint (flat config)                                           |
| `npm run build`| `tsc -b` strict type-check + production Vite build             |
| `npm run data` | Regenerate catalog snapshot + placeholder artwork              |
| `npm run seed` | Validate `db/seed/species.json`, write `src/data/generated/plants.json` |
| `npm run art`  | Emit SVG silhouettes into `public/plants/`                     |

Always run `npm run test && npm run lint && npm run build` before handing off.
Build must be clean: `tsc -b` catches errors vitest transpiles past.

## Architecture rules

```
src/
├── core/     platform-agnostic: domain types, repositories, services. NO react, NO @mui, NO @features imports.
├── data/     vocabulary.json (shared vocab) + generated/ (plants.json, hand-edited never).
├── features/ feature slices (catalog, projects, designer, ai). May import core. Cross-feature: import another feature's PUBLIC hook/component only.
└── app/      shell, theme, routing, global stores. Composes features.
```

- **`core/` is the mobile-ready seam.** Keep it React-free so a React Native
  client can share it. Revisit the boundary if you're tempted to import MUI or a
  React hook there.
- **Features talk through stores and the repository**, not through each other's
  internals. The catalog is the one shared data feature; others depend on
  `usePlantCatalog()`.
- **Never hand-edit generated files.** `src/data/generated/plants.json` and
  `public/plants/*.svg` are build artifacts — edit the seed and re-run `npm run data`.
- **Extend via the seams, not by rewiring.** New catalog domains → new
  `PlantCategory`; new persistent data → repository interface; new AI surface →
  `DesignAdvisor`.

## Adding a species

1. Add an entry to `db/seed/species.json` matching the required fields (see the
   `Plant` type and the schema). Include both real `bloomMonths` and tolerances.
2. Run `npm run data`. It validates against `src/data/vocabulary.json`, writes the
   snapshot, and generates the two placeholder SVGs.
3. `npm run dev` → Plant Catalog tab shows the new species.

To use real photography instead of silhouettes:
1. Place transparent PNGs at `public/plants/<id>-juvenile.png` and `-mature.png`.
2. In `db/seed.mjs`, set `SEED_IMAGE_EXTENSION = '.png'` and re-run `npm run seed`.
3. Remove the entry from the `npm run art` wiring (or keep it for species still
   using placeholders) — the generator is only needed for SVG species.

## Adding a catalog domain (e.g. mulch, rock, water features)

1. Add the value to `src/data/vocabulary.json` → `plantCategories`.
2. Add the matching literal to `PLANT_CATEGORIES` in `src/core/domain/plant.ts`
   and the `CHECK` constraint in `db/schema.sql`. (A unit test enforces that
   vocabulary.json and the TS literals stay in sync.)
3. Species-specific extras go in the `attributes` bag until they warrant their own
   field/column. Feature tables join on ids and never mutate existing columns.

## Swapping the data source

The app touches plants only through `PlantRepository`. To move to a server:
1. Implement `PlantRepository` (REST/SQLite/whatever).
2. Change the factory call in `src/features/catalog/usePlantCatalog.ts`.
Nothing else changes. Projects currently use localStorage via
`features/projects/projectStorage.ts` (five exported functions); replace that
module with a server-backed one for synchronization.

## Enabling AI features

Everything hangs off `DesignAdvisor` (`src/features/ai/designAdvisor.ts`). The
rule-based implementation is both the MVP and the no-API fallback. To add real
AI: implement the interface with an API call, keep the rule-based class for
offline, and swap the exported singleton.

## Standards

- TypeScript strict; no `any` leaks (JSON imports cast through `unknown` at the
  boundary, documented).
- No default exports from components unless needed for lazy-loading `.then` maps.
- Named constants over magic numbers; guard clauses and early returns.
- Descriptive comments/docstrings on exported functions and non-obvious logic;
  no narrating-the-syntax, no commented-out code.
- Prettier formatting; run `npm run format` if in doubt.
