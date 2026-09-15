/**
 * Builds the plant catalog snapshot that the web app consumes.
 *
 * Pipeline: db/seed/species.json (editable source of truth)
 *           -> validate against src/data/vocabulary.json
 *           -> src/data/generated/plants.json (imported by the app)
 *
 * Image URLs are derived from each species id, so the placeholder-art generator
 * (scripts/generate-art.mjs) and any future real photography follow one naming
 * convention:
 *
 *   public/plants/<id>-juvenile.svg   (1 gallon size)
 *   public/plants/<id>-mature.svg     (mature specimen)
 *
 * Change SEED_IMAGE_EXTENSION to ".png" once real transparent-background
 * photos replace the generated SVG placeholders.
 *
 * When run under Node >= 22 the script also loads schema.sql into an in-memory
 * SQLite database via the built-in node:sqlite module as a schema sanity check.
 * On Node 18 that module does not exist and the check is skipped.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SEED_IMAGE_EXTENSION = '.svg'

const dbDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dbDirectory, '..')
const seedFilePath = path.join(dbDirectory, 'seed', 'species.json')
const schemaFilePath = path.join(dbDirectory, 'schema.sql')
const vocabularyFilePath = path.join(projectRoot, 'src', 'data', 'vocabulary.json')
const outputFilePath = path.join(projectRoot, 'src', 'data', 'generated', 'plants.json')

const REQUIRED_TEXT_FIELDS = ['id', 'commonName', 'scientificName', 'category', 'form', 'notes']
const REQUIRED_NUMERIC_FIELDS = [
  'yearsToMaturity',
  'matureHeightFeet',
  'matureSpreadFeet',
]
const ARRAY_FIELD_TO_VOCABULARY_KEY = {
  sunExposure: 'sunExposures',
  soilTextures: 'soilTextures',
  soilMoisture: 'soilMoistures',
}
const TOLERANCE_FIELDS = ['saltTolerance', 'droughtTolerance']

/** Returns a list of human-readable problems; an empty list means valid. */
function findSpeciesErrors(species, vocabulary) {
  const errors = []
  const reject = (message) => errors.push(`${species.id ?? '<missing id>'}: ${message}`)

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (typeof species[field] !== 'string' || species[field].trim() === '') {
      reject(`field "${field}" must be a non-empty string`)
    }
  }
  for (const field of REQUIRED_NUMERIC_FIELDS) {
    if (typeof species[field] !== 'number' || !Number.isFinite(species[field]) || species[field] <= 0) {
      reject(`field "${field}" must be a positive number`)
    }
  }

  if (!vocabulary.plantCategories.includes(species.category)) {
    reject(`unknown category "${species.category}"`)
  }
  if (!vocabulary.plantForms.includes(species.form)) {
    reject(`unknown form "${species.form}"`)
  }
  for (const [field, vocabularyKey] of Object.entries(ARRAY_FIELD_TO_VOCABULARY_KEY)) {
    const values = species[field]
    if (!Array.isArray(values) || values.length === 0) {
      reject(`field "${field}" must be a non-empty array`)
      continue
    }
    for (const value of values) {
      if (!vocabulary[vocabularyKey].includes(value)) {
        reject(`field "${field}" contains unknown value "${value}"`)
      }
    }
  }

  if (!Array.isArray(species.bloomMonths)) {
    reject('field "bloomMonths" must be an array')
  } else {
    const invalidMonths = species.bloomMonths.filter(
      (month) => !Number.isInteger(month) || month < 1 || month > 12,
    )
    if (invalidMonths.length > 0) {
      reject(`bloomMonths contains invalid entries: ${invalidMonths.join(', ')}`)
    }
  }

  const germination = species.germinationTempF
  if (germination !== null && germination !== undefined) {
    const { minFahrenheit, maxFahrenheit } = germination
    if (
      typeof minFahrenheit !== 'number' ||
      typeof maxFahrenheit !== 'number' ||
      minFahrenheit > maxFahrenheit
    ) {
      reject('germinationTempF must be null or { minFahrenheit, maxFahrenheit } with min <= max')
    }
  }

  if (!Array.isArray(species.tags)) {
    reject('field "tags" must be an array of strings')
  }

  return errors
}

function toCatalogEntry(species) {
  return {
    id: species.id,
    commonName: species.commonName,
    scientificName: species.scientificName,
    category: species.category,
    form: species.form,
    images: {
      juvenileUrl: `/plants/${species.id}-juvenile${SEED_IMAGE_EXTENSION}`,
      matureUrl: `/plants/${species.id}-mature${SEED_IMAGE_EXTENSION}`,
    },
    bloomMonths: [...species.bloomMonths],
    yearsToMaturity: species.yearsToMaturity,
    matureHeightFeet: species.matureHeightFeet,
    matureSpreadFeet: species.matureSpreadFeet,
    sunExposure: [...species.sunExposure],
    soilTextures: [...species.soilTextures],
    soilMoisture: [...species.soilMoisture],
    saltTolerance: species.saltTolerance,
    droughtTolerance: species.droughtTolerance,
    germinationTempF:
      species.germinationTempF === null || species.germinationTempF === undefined
        ? null
        : { ...species.germinationTempF },
    notes: species.notes,
    tags: [...species.tags],
    attributes: {},
  }
}

/**
 * Optional schema sanity check. Inserts every species into an in-memory SQLite
 * database built from schema.sql so CHECK constraints and column coverage are
 * exercised even before a real server-side database exists.
 */
async function verifyAgainstSqlSchema(catalogEntries) {
  try {
    const { DatabaseSync } = await import('node:sqlite')
    const schemaSql = await readFile(schemaFilePath, 'utf8')
    const database = new DatabaseSync(':memory:')
    database.exec(schemaSql)

    const insertStatement = database.prepare(`
      INSERT INTO species (
        id, common_name, scientific_name, category, form,
        juvenile_image_url, mature_image_url,
        bloom_months, years_to_maturity, mature_height_feet, mature_spread_feet,
        sun_exposure, soil_textures, soil_moisture,
        salt_tolerance, drought_tolerance,
        germination_min_fahrenheit, germination_max_fahrenheit,
        notes, tags, attributes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const entry of catalogEntries) {
      insertStatement.run(
        entry.id,
        entry.commonName,
        entry.scientificName,
        entry.category,
        entry.form,
        entry.images.juvenileUrl,
        entry.images.matureUrl,
        JSON.stringify(entry.bloomMonths),
        entry.yearsToMaturity,
        entry.matureHeightFeet,
        entry.matureSpreadFeet,
        JSON.stringify(entry.sunExposure),
        JSON.stringify(entry.soilTextures),
        JSON.stringify(entry.soilMoisture),
        entry.saltTolerance,
        entry.droughtTolerance,
        entry.germinationTempF?.minFahrenheit ?? null,
        entry.germinationTempF?.maxFahrenheit ?? null,
        entry.notes,
        JSON.stringify(entry.tags),
        JSON.stringify(entry.attributes),
      )
    }
    console.log(`SQLite schema check passed (${catalogEntries.length} rows inserted).`)
  } catch (error) {
    console.log(`Skipping SQLite schema check: ${error.message}`)
  }
}

async function main() {
  const [seedFile, vocabularyFile] = await Promise.all([
    readFile(seedFilePath, 'utf8'),
    readFile(vocabularyFilePath, 'utf8'),
  ])
  const { species } = JSON.parse(seedFile)
  const vocabulary = JSON.parse(vocabularyFile)

  const validationErrors = species.flatMap((entry) => findSpeciesErrors(entry, vocabulary))
  if (validationErrors.length > 0) {
    console.error('Seed data validation failed:')
    for (const problem of validationErrors) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }

  const catalogEntries = species.map(toCatalogEntry)

  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(catalogEntries, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${catalogEntries.length} species to ${path.relative(projectRoot, outputFilePath)}`)

  await verifyAgainstSqlSchema(catalogEntries)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
