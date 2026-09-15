-- Canonical database schema for the plant catalog.
--
-- The web application consumes a JSON snapshot emitted from db/seed/species.json
-- (see db/seed.mjs), but this schema remains the authoritative relational model.
-- It is ready to be loaded into SQLite today and extended for a server-side
-- database later without breaking changes:
--
--   * New catalog categories (materials, water features, non-native ornamentals)
--     require NO migration: they extend the `category` vocabulary and may add
--     their own nullable columns or live entirely inside `attributes` JSON.
--   * Future feature-specific tables (projects, users, scenes) join on ids and
--     never alter this table's existing columns.
--
-- JSON-valued columns hold arrays/objects serialized as TEXT. SQLite treats
-- them opaquely; json_extract() is available when querying becomes necessary.

CREATE TABLE species (
    id                        TEXT PRIMARY KEY,
    common_name               TEXT NOT NULL,
    scientific_name           TEXT NOT NULL,

    -- Vocabulary: see src/data/vocabulary.json (single source of truth).
    category                  TEXT NOT NULL
        CHECK (category IN ('native', 'edible', 'ornamental', 'material', 'water')),
    form                      TEXT NOT NULL
        CHECK (form IN ('tree', 'shrub', 'palm', 'grass', 'groundcover', 'vine', 'herb')),

    juvenile_image_url        TEXT NOT NULL,
    mature_image_url          TEXT NOT NULL,

    bloom_months              TEXT NOT NULL,            -- JSON: number[] (1-12); empty = non-blooming
    years_to_maturity         REAL NOT NULL,
    mature_height_feet        REAL NOT NULL,
    mature_spread_feet        REAL NOT NULL,

    sun_exposure              TEXT NOT NULL,            -- JSON: ('full'|'part'|'shade')[]
    soil_textures             TEXT NOT NULL,            -- JSON: ('sand'|'loam'|'clay')[]
    soil_moisture             TEXT NOT NULL,            -- JSON: ('dry'|'moist'|'wet')[]
    salt_tolerance            TEXT NOT NULL
        CHECK (salt_tolerance IN ('none', 'low', 'moderate', 'high')),
    drought_tolerance         TEXT NOT NULL
        CHECK (drought_tolerance IN ('none', 'low', 'moderate', 'high')),

    germination_min_fahrenheit REAL,                    -- NULL = not grown from seed
    germination_max_fahrenheit REAL,

    notes                     TEXT NOT NULL DEFAULT '',
    tags                      TEXT NOT NULL,            -- JSON: string[]
    attributes                TEXT NOT NULL DEFAULT '{}' -- JSON: open-ended future fields
);

CREATE INDEX idx_species_category ON species (category);
CREATE INDEX idx_species_form ON species (form);
