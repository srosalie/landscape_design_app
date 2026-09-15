/**
 * Generates deterministic placeholder artwork for every species in the seed
 * data: simple SVG silhouettes drawn per plant "form" (tree, shrub, palm,
 * grass, groundcover, vine, herb), in two variants each:
 *
 *   public/plants/<id>-juvenile.svg   small plant in a 1 gallon nursery pot
 *   public/plants/<id>-mature.svg     full-grown specimen sized to its spread
 *
 * Output is deterministic (seeded by species id), so re-running the script
 * never produces diffs for unchanged species. The canvas aspect ratio of each
 * mature image matches the species' height/spread ratio (clamped), and the
 * editor stretches images by that same ratio so plants render true to scale.
 *
 * To replace placeholders with real photography, drop transparent-background
 * PNGs at the same paths (switch SEED_IMAGE_EXTENSION to ".png" in db/seed.mjs)
 * and re-run `npm run seed`. The generator can be retired at that point.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CANVAS_WIDTH = 400
const MIN_ASPECT_RATIO = 0.7
const MAX_ASPECT_RATIO = 1.7
const JUVENILE_CANVAS_SIZE = 220

const LEAF_COLORS = ['#3d6b45', '#4a7a52', '#587e46', '#6b9159', '#2f5c3a']
const TRUNK_COLOR = '#7a5636'
const POT_BODY_COLOR = '#c07a50'
const POT_RIM_COLOR = '#a96a44'
const SHADOW_COLOR = 'rgba(40, 50, 35, 0.12)'

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptsDirectory, '..')
const seedFilePath = path.join(projectRoot, 'db', 'seed', 'species.json')
const outputDirectory = path.join(projectRoot, 'public', 'plants')

/** FNV-1a: stable 32-bit string hash used as the RNG seed per species. */
function hashString(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: tiny deterministic PRNG; adequate for decorative variation. */
function createRandom(seed) {
  let state = seed
  return function nextRandom() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)]
}

function between(random, minimum, maximum) {
  return minimum + random() * (maximum - minimum)
}

function round(value) {
  return Number(value.toFixed(1))
}

/** Season-tinted bloom color derived from the first month the plant blooms. */
function bloomColorForMonth(month) {
  if ([12, 1, 2].includes(month)) return '#e8e3d5'
  if ([3, 4, 5].includes(month)) return '#ec9bbf'
  if ([6, 7, 8].includes(month)) return '#eda63d'
  return '#cf7f43'
}

/**
 * Every draw* function returns an array of SVG element strings laid out inside
 * a CANVAS_WIDTH x height viewBox, anchored to bottom-center.
 */
function drawTree(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const groundY = height - 12
  const canopyCenterY = height * 0.32
  const elements = []

  const trunkTopY = canopyCenterY + height * 0.06
  elements.push(
    `<path d="M ${round(centerX - width * 0.03)} ${groundY} Q ${centerX - width * 0.01} ${round((groundY + trunkTopY) / 2)} ${centerX - width * 0.015} ${trunkTopY} L ${centerX + width * 0.015} ${trunkTopY} Q ${centerX + width * 0.02} ${round((groundY + trunkTopY) / 2)} ${centerX + width * 0.04} ${groundY} Z" fill="${TRUNK_COLOR}"/>`,
  )

  const puffCount = 6
  for (let index = 0; index < puffCount; index += 1) {
    const angle = (index / puffCount) * Math.PI * 2 + random()
    const radius = width * between(random, 0.10, 0.16)
    const offsetX = Math.cos(angle) * width * 0.16
    const offsetY = Math.sin(angle) * height * 0.09
    const shade = pick(random, [leafColor, leafColor, '#54855c'])
    elements.push(
      `<circle cx="${round(centerX + offsetX)}" cy="${round(canopyCenterY + offsetY)}" r="${round(radius)}" fill="${shade}"/>`,
    )
  }

  if (hasBlooms) {
    for (let index = 0; index < 14; index += 1) {
      elements.push(
        `<circle cx="${round(centerX + between(random, -width * 0.24, width * 0.24))}" cy="${round(canopyCenterY + between(random, -height * 0.12, height * 0.12))}" r="3.5" fill="${bloomColor}" opacity="0.9"/>`,
      )
    }
  }
  return elements
}

function drawShrub(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const groundY = height - 12
  const moundCenterY = height * 0.62
  const elements = []

  for (let index = 0; index < 3; index += 1) {
    const stemX = centerX + between(random, -width * 0.08, width * 0.08)
    elements.push(
      `<line x1="${round(stemX)}" y1="${groundY}" x2="${round(stemX + between(random, -12, 12))}" y2="${round(moundCenterY)}" stroke="${TRUNK_COLOR}" stroke-width="4" stroke-linecap="round"/>`,
    )
  }

  const clusterCount = 6
  for (let index = 0; index < clusterCount; index += 1) {
    const fraction = index / (clusterCount - 1) - 0.5
    const ellipseX = centerX + fraction * width * 0.56
    const radiusX = width * between(random, 0.13, 0.18)
    const radiusY = height * between(random, 0.13, 0.19)
    const centerY = moundCenterY - Math.abs(fraction) * height * 0.05 + between(random, -6, 6)
    const shade = pick(random, LEAF_COLORS)
    elements.push(
      `<ellipse cx="${round(ellipseX)}" cy="${round(centerY)}" rx="${round(radiusX)}" ry="${round(radiusY)}" fill="${shade}"/>`,
    )
  }

  if (hasBlooms) {
    for (let index = 0; index < 9; index += 1) {
      elements.push(
        `<circle cx="${round(centerX + between(random, -width * 0.26, width * 0.26))}" cy="${round(moundCenterY + between(random, -height * 0.14, height * 0.08))}" r="4" fill="${bloomColor}" opacity="0.95"/>`,
      )
    }
  }
  return elements
}

function drawPalm(width, height, random, leafColor, bloomColor, hasBlooms) {
  const groundY = height - 12
  const crownX = width / 2 + width * 0.07
  const crownY = height * 0.20
  const trunkBendX = width * 0.42
  const elements = [
    `<path d="M ${round(width * 0.46)} ${groundY} Q ${round(trunkBendX)} ${round(height * 0.45)} ${round(crownX)} ${round(crownY)}" stroke="${TRUNK_COLOR}" stroke-width="${round(width * 0.045)}" fill="none" stroke-linecap="round"/>`,
  ]

  const frondCount = 7
  for (let index = 0; index < frondCount; index += 1) {
    const angle = Math.PI + (index / (frondCount - 1)) * Math.PI
    const frondLength = width * between(random, 0.22, 0.30)
    const tipX = crownX + Math.cos(angle) * frondLength
    const tipY = crownY + Math.sin(angle) * frondLength * 0.75 + height * 0.06
    const controlX = crownX + Math.cos(angle) * frondLength * 0.6
    const controlY = crownY + Math.sin(angle) * frondLength * 0.15 - height * 0.05
    elements.push(
      `<path d="M ${round(crownX)} ${round(crownY)} Q ${round(controlX)} ${round(controlY)} ${round(tipX)} ${round(tipY)}" stroke="${pick(random, LEAF_COLORS)}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    )
  }

  elements.push(`<circle cx="${round(crownX - 7)}" cy="${round(crownY + 8)}" r="6" fill="#8a6b45"/>`)
  elements.push(`<circle cx="${round(crownX + 6)}" cy="${round(crownY + 11)}" r="6" fill="#8a6b45"/>`)

  if (hasBlooms) {
    elements.push(
      `<circle cx="${round(crownX)}" cy="${round(crownY + 16)}" r="5" fill="${bloomColor}" opacity="0.9"/>`,
    )
  }
  return elements
}

function drawGrass(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const groundY = height - 12
  const elements = []
  const bladeCount = 16

  for (let index = 0; index < bladeCount; index += 1) {
    const baseX = centerX + between(random, -width * 0.14, width * 0.14)
    const tipX = baseX + between(random, -width * 0.16, width * 0.16)
    const tipY = groundY - height * between(random, 0.45, 0.72)
    const controlX = (baseX + tipX) / 2 + between(random, -14, 14)
    const controlY = (groundY + tipY) / 2
    elements.push(
      `<path d="M ${round(baseX)} ${groundY} Q ${round(controlX)} ${round(controlY)} ${round(tipX)} ${round(tipY)}" stroke="${pick(random, LEAF_COLORS)}" stroke-width="${round(between(random, 3, 5.5))}" fill="none" stroke-linecap="round"/>`,
    )
    if (hasBlooms && index % 3 === 0) {
      elements.push(
        `<ellipse cx="${round(tipX)}" cy="${round(tipY - 10)}" rx="5" ry="14" fill="${bloomColor}" opacity="0.85" transform="rotate(${round(between(random, -18, 18))} ${round(tipX)} ${round(tipY - 10)})"/>`,
      )
    }
  }
  return elements
}

function drawGroundcover(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const moundCenterY = height * 0.78
  const elements = []
  const clumpCount = 9

  for (let index = 0; index < clumpCount; index += 1) {
    const fraction = index / (clumpCount - 1) - 0.5
    const circleX = centerX + fraction * width * 0.62
    const circleRadius = width * between(random, 0.06, 0.10)
    const circleY = moundCenterY - Math.abs(fraction) * height * 0.06 + between(random, -5, 5)
    elements.push(
      `<circle cx="${round(circleX)}" cy="${round(circleY)}" r="${round(circleRadius)}" fill="${pick(random, LEAF_COLORS)}"/>`,
    )
  }

  if (hasBlooms) {
    for (let index = 0; index < 7; index += 1) {
      elements.push(
        `<circle cx="${round(centerX + between(random, -width * 0.28, width * 0.28))}" cy="${round(moundCenterY - between(random, 0, height * 0.12))}" r="3.5" fill="${bloomColor}"/>`,
      )
    }
  }
  return elements
}

function drawVine(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const moundCenterY = height * 0.60
  const elements = []

  for (let index = 0; index < 5; index += 1) {
    const fraction = index / 4 - 0.5
    elements.push(
      `<ellipse cx="${round(centerX + fraction * width * 0.44)}" cy="${round(moundCenterY + Math.abs(fraction) * height * 0.08)}" rx="${round(width * between(random, 0.11, 0.15))}" ry="${round(height * between(random, 0.10, 0.14))}" fill="${pick(random, LEAF_COLORS)}"/>`,
    )
  }

  for (const direction of [-1, 1]) {
    const startX = centerX + direction * width * 0.30
    elements.push(
      `<path d="M ${round(startX)} ${round(moundCenterY)} q ${direction * width * 0.14} ${height * 0.10} ${direction * width * 0.20} ${height * 0.24}" stroke="${leafColor}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    )
  }

  if (hasBlooms) {
    for (let index = 0; index < 8; index += 1) {
      elements.push(
        `<circle cx="${round(centerX + between(random, -width * 0.30, width * 0.30))}" cy="${round(moundCenterY + between(random, -height * 0.10, height * 0.14))}" r="4.5" fill="${bloomColor}" opacity="0.95"/>`,
      )
    }
  }
  return elements
}

function drawHerb(width, height, random, leafColor, bloomColor, hasBlooms) {
  const centerX = width / 2
  const groundY = height - 12
  const elements = []
  const stemCount = 5

  for (let index = 0; index < stemCount; index += 1) {
    const fraction = index / (stemCount - 1) - 0.5
    const stemBaseX = centerX + fraction * width * 0.30
    const stemTipX = stemBaseX + fraction * width * 0.10
    const stemTipY = groundY - height * between(random, 0.38, 0.62)
    elements.push(
      `<line x1="${round(stemBaseX)}" y1="${groundY}" x2="${round(stemTipX)}" y2="${round(stemTipY)}" stroke="${leafColor}" stroke-width="4" stroke-linecap="round"/>`,
    )

    const flowerY = stemTipY
    if (index % 2 === 0 || !hasBlooms) {
      elements.push(
        `<ellipse cx="${round((stemBaseX + stemTipX) / 2 - 6)}" cy="${round((groundY + flowerY) / 2)}" rx="10" ry="5" fill="${pick(random, LEAF_COLORS)}" transform="rotate(${round(between(random, -35, 35))} ${round((stemBaseX + stemTipX) / 2 - 6)} ${round((groundY + flowerY) / 2)})"/>`,
      )
    }
    if (hasBlooms) {
      elements.push(
        `<circle cx="${round(stemTipX)}" cy="${round(flowerY)}" r="12" fill="${bloomColor}" opacity="0.55"/>`,
        `<circle cx="${round(stemTipX)}" cy="${round(flowerY)}" r="7" fill="${bloomColor}"/>`,
        `<circle cx="${round(stemTipX)}" cy="${round(flowerY)}" r="2.5" fill="#6b4a2f"/>`,
      )
    }
  }
  return elements
}

const FORM_DRAW_FUNCTIONS = {
  tree: drawTree,
  shrub: drawShrub,
  palm: drawPalm,
  grass: drawGrass,
  groundcover: drawGroundcover,
  vine: drawVine,
  herb: drawHerb,
}

function buildSvg(viewWidth, viewHeight, bodyElements) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}">`,
    ...bodyElements.map((element) => `  ${element}`),
    '</svg>',
    '',
  ].join('\n')
}

function renderMatureSvg(species) {
  const rawRatio = species.matureHeightFeet / species.matureSpreadFeet
  const ratio = Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, rawRatio))
  const width = CANVAS_WIDTH
  const height = Math.round(CANVAS_WIDTH * ratio)

  const random = createRandom(hashString(`${species.id}-mature`))
  const leafColor = pick(random, LEAF_COLORS)
  const hasBlooms = species.bloomMonths.length > 0
  const bloomColor = hasBlooms ? bloomColorForMonth(species.bloomMonths[0]) : ''

  const shadow = `<ellipse cx="${width / 2}" cy="${height - 10}" rx="${width * 0.30}" ry="8" fill="${SHADOW_COLOR}"/>`
  const drawForm = FORM_DRAW_FUNCTIONS[species.form]
  const bodyElements = [shadow, ...drawForm(width, height, random, leafColor, bloomColor, hasBlooms)]

  return buildSvg(width, height, bodyElements)
}

function renderJuvenileSvg(species) {
  // Reuse the mature drawing scaled down, sitting in a nursery pot, so the two
  // variants clearly read as "same plant, earlier in life".
  const matureRatio = Math.min(
    MAX_ASPECT_RATIO,
    Math.max(MIN_ASPECT_RATIO, species.matureHeightFeet / species.matureSpreadFeet),
  )
  const matureWidth = CANVAS_WIDTH
  const matureHeight = Math.round(CANVAS_WIDTH * matureRatio)

  const random = createRandom(hashString(`${species.id}-juvenile`))
  const leafColor = pick(random, LEAF_COLORS)
  const hasBlooms = species.bloomMonths.length > 0
  const bloomColor = hasBlooms ? bloomColorForMonth(species.bloomMonths[0]) : ''

  const size = JUVENILE_CANVAS_SIZE
  const scale = 0.52
  const rimTopY = size * 0.66
  const translateX = (size - matureWidth * scale) / 2
  const translateY = rimTopY - matureHeight * scale + 8

  const drawForm = FORM_DRAW_FUNCTIONS[species.form]
  const plantGroup =
    `<g transform="translate(${round(translateX)} ${round(translateY)}) scale(${scale})">` +
    drawForm(matureWidth, matureHeight, random, leafColor, bloomColor, hasBlooms).join('') +
    '</g>'

  const potLeft = size * 0.34
  const potRight = size * 0.66
  const potBottomRim = size - 14
  const bodyElements = [
    `<path d="M ${potLeft} ${rimTopY} L ${potRight} ${rimTopY} L ${round(potRight - 10)} ${potBottomRim} L ${round(potLeft + 10)} ${potBottomRim} Z" fill="${POT_BODY_COLOR}"/>`,
    `<rect x="${round(potLeft - 5)}" y="${round(rimTopY - 9)}" width="${round(potRight - potLeft + 10)}" height="10" rx="3" fill="${POT_RIM_COLOR}"/>`,
    plantGroup,
  ]

  return buildSvg(size, size, bodyElements)
}

async function main() {
  const seedFile = await readFile(seedFilePath, 'utf8')
  const { species } = JSON.parse(seedFile)

  await mkdir(outputDirectory, { recursive: true })
  for (const entry of species) {
    await writeFile(path.join(outputDirectory, `${entry.id}-mature.svg`), renderMatureSvg(entry), 'utf8')
    await writeFile(path.join(outputDirectory, `${entry.id}-juvenile.svg`), renderJuvenileSvg(entry), 'utf8')
  }
  console.log(`Wrote ${species.length * 2} placeholder SVGs to ${path.relative(projectRoot, outputDirectory)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
