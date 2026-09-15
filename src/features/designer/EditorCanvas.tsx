/**
 * The interactive design surface: an SVG scene with the property photo as the
 * bottom layer and plant placements above it.
 *
 * Interaction model (all pointer logic centralized on the <svg> element and
 * dispatched through a single gesture ref, which keeps handlers simple):
 *
 *   select   - click to select, drag to move, corner handle scales, top handle rotates
 *   pan      - drag to pan; also middle-mouse drag in any tool
 *   calibrate- drag a line across a known distance, then enter its real length
 *   wheel    - zoom toward the cursor (always active)
 *
 * All geometry math happens in scene coordinates: pointer positions convert to
 * photo-pixel space via getScreenCTM(), then to feet via pixelsPerFoot(). That
 * means moves/scales/rotates behave identically at every zoom level.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, IconButton, Stack, TextField, Tooltip } from '@mui/material'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import DownloadIcon from '@mui/icons-material/Download'
import {
  MAX_SIZE_SCALE_FACTOR,
  MIN_SIZE_SCALE_FACTOR,
  pixelsPerFoot,
  placementSizeFeet,
} from '@core/domain/design'
import type { Placement } from '@core/domain/design'
import type { Plant } from '@core/domain/plant'
import {
  angleFromCenterDegrees,
  clampValue,
  distanceBetween,
  normalizeAngleDegrees,
} from '@core/services/geometry'
import type { Point2D } from '@core/services/geometry'
import { selectSelectedPlacement, useDesignerStore } from './designerStore'
import { exportSceneAsPng } from './exportPng'

/** Wheel zoom multiplier per notch. */
const ZOOM_STEP = 1.15
/** Viewport width bounds relative to the full photo size. */
const MIN_ZOOM_VIEWPORT_FRACTION = 0.08
const MAX_ZOOM_VIEWPORT_FRACTION = 3
/** Selection handle hit area in screen pixels, zoom-compensated at render time. */
const HANDLE_SCREEN_PX = 11
const HANDLE_OFFSET_SCREEN_PX = 14

interface Viewport {
  x: number
  y: number
  width: number
  height: number
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'pan'; startViewport: Viewport; startClient: Point2D }
  | { kind: 'dragPlacement'; placementId: string; grabOffsetFeet: Point2D }
  | {
      kind: 'scalePlacement'
      placementId: string
      centerFeet: Point2D
      startDistanceFeet: number
      startScaleFactor: number
    }
  | {
      kind: 'rotatePlacement'
      placementId: string
      centerFeet: Point2D
      startPointerAngleDegrees: number
      startRotationDegrees: number
    }
  | { kind: 'calibrateLine'; startPixel: Point2D }

interface CalibrationDraft {
  startPixel: Point2D
  currentPixel: Point2D
}

export function EditorCanvas({ plantsById }: { plantsById: Map<string, Plant> }) {
  const scene = useDesignerStore((state) => state.scene)
  const selectedPlacement = useDesignerStore(selectSelectedPlacement)
  const activeTool = useDesignerStore((state) => state.activeTool)
  const armedPlant = useDesignerStore((state) => state.armedPlant)
  const defaultSizeMode = useDesignerStore((state) => state.defaultSizeMode)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture>({ kind: 'none' })

  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const [ghostPositionFeet, setGhostPositionFeet] = useState<Point2D | null>(null)
  const [calibrationDraft, setCalibrationDraft] = useState<CalibrationDraft | null>(null)
  const [pendingCalibrationPixelLength, setPendingCalibrationPixelLength] = useState<number | null>(null)
  const [calibrationFeetInput, setCalibrationFeetInput] = useState('10')

  const photoWidth = scene?.photoPixelWidth ?? 0
  const photoHeight = scene?.photoPixelHeight ?? 0

  /** Converts a browser event position into photo-pixel (viewBox) space. */
  const clientToSvgPixel = useCallback(
    (clientX: number, clientY: number): Point2D | null => {
      const svg = svgRef.current
      // jsdom (and some embedded runtimes) do not implement the SVG screen-CTM
      // geometry or DOMPoint; bail out rather than throwing on mount/interaction.
      if (
        !svg ||
        typeof svg.getScreenCTM !== 'function' ||
        typeof DOMPoint === 'undefined'
      ) {
        return null
      }
      const screenTransform = svg.getScreenCTM()
      if (!screenTransform) return null
      const point = new DOMPoint(clientX, clientY).matrixTransform(screenTransform.inverse())
      return { x: point.x, y: point.y }
    },
    [],
  )

  const svgPixelToSceneFeet = useCallback(
    (pixel: Point2D): Point2D => {
      if (!scene) return { x: 0, y: 0 }
      const scale = pixelsPerFoot(scene)
      return { x: pixel.x / scale, y: pixel.y / scale }
    },
    [scene],
  )

  // Track container width so handle sizes stay constant on screen and zoom
  // math can translate client-pixel drags into viewport units.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const observer = new ResizeObserver(([entry]) =>
      setContainerWidthPx(entry.contentRect.width),
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Fit the full photo into view whenever a new scene loads.
  useEffect(() => {
    if (scene) setViewport({ x: 0, y: 0, width: photoWidth, height: photoHeight })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.photoDataUrl])

  // React attaches wheel listeners passively in some paths; bind manually so
  // preventDefault reliably stops page scroll while zooming.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !scene) return undefined
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = clientToSvgPixel(event.clientX, event.clientY)
      if (!anchor || !viewport) return
      const direction = event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      const newWidth = clampValue(
        viewport.width * direction,
        photoWidth * MIN_ZOOM_VIEWPORT_FRACTION,
        photoWidth * MAX_ZOOM_VIEWPORT_FRACTION,
      )
      const ratio = newWidth / viewport.width
      setViewport({
        width: newWidth,
        height: viewport.height * ratio,
        x: anchor.x - (anchor.x - viewport.x) * ratio,
        y: anchor.y - (anchor.y - viewport.y) * ratio,
      })
    }
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [scene, viewport, photoWidth, clientToSvgPixel])

  if (!scene || !viewport) return <Box ref={containerRef} sx={{ flex: 1 }} />

  const scale = pixelsPerFoot(scene)
  const store = useDesignerStore.getState()
  const cursor =
    activeTool === 'pan'
      ? 'grab'
      : activeTool === 'calibrate'
        ? 'crosshair'
        : armedPlant
          ? 'crosshair'
          : 'default'

  function findPlacementById(placementId: string): Placement | undefined {
    return scene?.placements.find((placement) => placement.id === placementId)
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!scene || !viewport) return
    const target = event.target as Element

    // Middle-button drag pans regardless of the active tool.
    if (event.button === 1 || activeTool === 'pan') {
      gestureRef.current = {
        kind: 'pan',
        startViewport: viewport,
        startClient: { x: event.clientX, y: event.clientY },
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (event.button !== 0) return

    if (activeTool === 'calibrate') {
      const startPixel = clientToSvgPixel(event.clientX, event.clientY)
      if (!startPixel) return
      setCalibrationDraft({ startPixel, currentPixel: startPixel })
      gestureRef.current = { kind: 'calibrateLine', startPixel }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    const handleElement = target.closest('[data-placement-handle]')
    if (handleElement) {
      startHandleDrag(handleElement as HTMLElement, event)
      return
    }

    const placementElement = target.closest('[data-placement-id]')
    if (placementElement) {
      startPlacementDrag((placementElement as HTMLElement).dataset.placementId ?? '', event)
      return
    }

    // Background click: either place the armed species or deselect.
    const pixel = clientToSvgPixel(event.clientX, event.clientY)
    if (!pixel) return
    if (armedPlant) {
      const feet = svgPixelToSceneFeet(pixel)
      store.addPlacement(armedPlant, feet.x, feet.y)
    } else {
      store.setSelectedPlacementId(null)
    }
  }

  function startPlacementDrag(placementId: string, event: React.PointerEvent<SVGSVGElement>) {
    const placement = findPlacementById(placementId)
    const pixel = clientToSvgPixel(event.clientX, event.clientY)
    if (!placement || !pixel) return

    const pointerFeet = svgPixelToSceneFeet(pixel)
    store.setSelectedPlacementId(placementId)
    // One snapshot covers the entire drag; moves below mutate transiently.
    store.beginChange()
    gestureRef.current = {
      kind: 'dragPlacement',
      placementId,
      grabOffsetFeet: {
        x: pointerFeet.x - placement.centerXFeet,
        y: pointerFeet.y - placement.centerYFeet,
      },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function startHandleDrag(handleElement: HTMLElement, event: React.PointerEvent<SVGSVGElement>) {
    const placementId = handleElement.dataset.placementId ?? ''
    const handleKind = handleElement.dataset.placementHandle
    const placement = findPlacementById(placementId)
    const pixel = clientToSvgPixel(event.clientX, event.clientY)
    if (!placement || !pixel) return

    const centerFeet = { x: placement.centerXFeet, y: placement.centerYFeet }
    const pointerFeet = svgPixelToSceneFeet(pixel)
    store.setSelectedPlacementId(placementId)
    store.beginChange()

    if (handleKind === 'scale') {
      gestureRef.current = {
        kind: 'scalePlacement',
        placementId,
        centerFeet,
        startDistanceFeet: Math.max(distanceBetween(pointerFeet, centerFeet), 0.01),
        startScaleFactor: placement.sizeScaleFactor,
      }
    } else {
      gestureRef.current = {
        kind: 'rotatePlacement',
        placementId,
        centerFeet,
        startPointerAngleDegrees: angleFromCenterDegrees(pointerFeet, centerFeet),
        startRotationDegrees: placement.rotationDegrees,
      }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!viewport) return
    const gesture = gestureRef.current
    const pixel = clientToSvgPixel(event.clientX, event.clientY)

    switch (gesture.kind) {
      case 'pan': {
        const clientPerViewportUnit = viewport.width / Math.max(containerWidthPx, 1)
        setViewport({
          x: gesture.startViewport.x - (event.clientX - gesture.startClient.x) * clientPerViewportUnit,
          y: gesture.startViewport.y - (event.clientY - gesture.startClient.y) * clientPerViewportUnit,
          width: gesture.startViewport.width,
          height: gesture.startViewport.height,
        })
        return
      }
      case 'dragPlacement': {
        if (!pixel) return
        const feet = svgPixelToSceneFeet(pixel)
        store.updatePlacement(
          gesture.placementId,
          { centerXFeet: feet.x - gesture.grabOffsetFeet.x, centerYFeet: feet.y - gesture.grabOffsetFeet.y },
          { transient: true },
        )
        return
      }
      case 'scalePlacement': {
        if (!pixel) return
        const feet = svgPixelToSceneFeet(pixel)
        const growth = distanceBetween(feet, gesture.centerFeet) / gesture.startDistanceFeet
        store.updatePlacement(
          gesture.placementId,
          { sizeScaleFactor: clampValue(gesture.startScaleFactor * growth, MIN_SIZE_SCALE_FACTOR, MAX_SIZE_SCALE_FACTOR) },
          { transient: true },
        )
        return
      }
      case 'rotatePlacement': {
        if (!pixel) return
        const feet = svgPixelToSceneFeet(pixel)
        const delta = angleFromCenterDegrees(feet, gesture.centerFeet) - gesture.startPointerAngleDegrees
        store.updatePlacement(
          gesture.placementId,
          { rotationDegrees: normalizeAngleDegrees(gesture.startRotationDegrees + delta) },
          { transient: true },
        )
        return
      }
      case 'calibrateLine': {
        if (!pixel) return
        setCalibrationDraft({ startPixel: gesture.startPixel, currentPixel: pixel })
        return
      }
      case 'none':
        break
    }

    if (armedPlant && pixel) {
      setGhostPositionFeet(svgPixelToSceneFeet(pixel))
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const gesture = gestureRef.current

    if (gesture.kind === 'calibrateLine') {
      const endPixel = clientToSvgPixel(event.clientX, event.clientY)
      if (endPixel) {
        const pixelLength = distanceBetween(gesture.startPixel, endPixel)
        if (pixelLength > 8) {
          setPendingCalibrationPixelLength(pixelLength)
          setCalibrationFeetInput('10')
        }
      }
      setCalibrationDraft(null)
    }

    gestureRef.current = { kind: 'none' }
  }

  function confirmCalibration() {
    const feetLength = Number.parseFloat(calibrationFeetInput)
    if (
      pendingCalibrationPixelLength &&
      Number.isFinite(feetLength) &&
      feetLength > 0
    ) {
      store.setCalibration({ pixelLength: pendingCalibrationPixelLength, feetLength })
    }
    setPendingCalibrationPixelLength(null)
  }

  function renderPlacement(placement: Placement) {
    const plant = plantsById.get(placement.plantId)
    if (!plant) return null
    const size = placementSizeFeet(plant, placement)
    const widthPx = size.widthFeet * scale
    const heightPx = size.heightFeet * scale

    return (
      <g
        key={placement.id}
        data-placement-id={placement.id}
        transform={`translate(${placement.centerXFeet * scale} ${placement.centerYFeet * scale}) rotate(${placement.rotationDegrees})`}
        style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
      >
        <image
          href={placement.sizeMode === 'juvenile' ? plant.images.juvenileUrl : plant.images.matureUrl}
          x={-widthPx / 2}
          y={-heightPx / 2}
          width={widthPx}
          height={heightPx}
        />
      </g>
    )
  }

  const selection = selectedPlacement
  let selectionOverlay = null
  if (selection) {
    const plant = plantsById.get(selection.plantId)
    if (plant) {
      const size = placementSizeFeet(plant, selection)
      const widthPx = size.widthFeet * scale
      const heightPx = size.heightFeet * scale
      const centerXPx = selection.centerXFeet * scale
      const centerYPx = selection.centerYFeet * scale
      const handleRadius = HANDLE_SCREEN_PX * (viewport.width / Math.max(containerWidthPx, 1))
      const handleOffset = HANDLE_OFFSET_SCREEN_PX * (viewport.width / Math.max(containerWidthPx, 1))

      selectionOverlay = (
        <g data-export-exclude>
          <g transform={`translate(${centerXPx} ${centerYPx}) rotate(${selection.rotationDegrees})`}>
            <rect
              x={-widthPx / 2 - 4}
              y={-heightPx / 2 - 4}
              width={widthPx + 8}
              height={heightPx + 8}
              rx={6}
              fill="none"
              stroke="#fb8c00"
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {/* Scale handle: bottom-right of the unrotated box. */}
          <circle
            data-placement-handle="scale"
            data-placement-id={selection.id}
            cx={centerXPx + widthPx / 2 + handleOffset}
            cy={centerYPx + heightPx / 2 + handleOffset}
            r={handleRadius}
            fill="#fb8c00"
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'nwse-resize' }}
          />
          {/* Rotation handle: floats above the box with a connector stem. */}
          <line
            x1={centerXPx}
            y1={centerYPx - heightPx / 2}
            x2={centerXPx}
            y2={centerYPx - heightPx / 2 - handleOffset}
            stroke="#fb8c00"
            strokeWidth={2}
          />
          <circle
            data-placement-handle="rotate"
            data-placement-id={selection.id}
            cx={centerXPx}
            cy={centerYPx - heightPx / 2 - handleOffset}
            r={handleRadius}
            fill="#1565c0"
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'grab' }}
          />
        </g>
      )
    }
  }

  let calibrationOverlay = null
  if (calibrationDraft) {
    const { startPixel, currentPixel } = calibrationDraft
    const estimatedFeet = distanceBetween(currentPixel, startPixel) / scale
    calibrationOverlay = (
      <g data-export-exclude>
        <line
          x1={startPixel.x}
          y1={startPixel.y}
          x2={currentPixel.x}
          y2={currentPixel.y}
          stroke="#fdd835"
          strokeWidth={3}
          strokeDasharray="8 5"
        />
        <circle cx={startPixel.x} cy={startPixel.y} r={6} fill="#fdd835" />
        <circle cx={currentPixel.x} cy={currentPixel.y} r={6} fill="#fdd835" />
        <text
          x={(startPixel.x + currentPixel.x) / 2}
          y={(startPixel.y + currentPixel.y) / 2 - 12}
          textAnchor="middle"
          fontSize={Math.max(viewport.width / 60, 10)}
          fill="#fff"
          stroke="#000"
          strokeWidth={0.5}
          paintOrder="stroke"
        >
          {estimatedFeet.toFixed(1)} ft (estimate)
        </text>
      </g>
    )
  }

  const armedPlantImage = (() => {
    if (!armedPlant || !ghostPositionFeet) return null
    const baseSpread = defaultSizeMode === 'juvenile' ? 1 : armedPlant.matureSpreadFeet
    return (
      <image
        data-export-exclude
        href={defaultSizeMode === 'juvenile' ? armedPlant.images.juvenileUrl : armedPlant.images.matureUrl}
        x={(ghostPositionFeet.x - baseSpread / 2) * scale}
        y={(ghostPositionFeet.y - (baseSpread * 0.7) / 2) * scale}
        width={baseSpread * scale}
        height={baseSpread * 0.7 * scale}
        opacity={0.55}
        style={{ pointerEvents: 'none' }}
      />
    )
  })()

  return (
    <Box ref={containerRef} sx={{ flex: 1, overflow: 'hidden', bgcolor: '#3c4043', display: 'flex', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <image href={scene.photoDataUrl} x={0} y={0} width={photoWidth} height={photoHeight} />
        {scene.placements.map(renderPlacement)}
        {selectionOverlay}
        {calibrationOverlay}
        {armedPlantImage}
      </svg>

      <Stack spacing={1} sx={{ position: 'absolute', top: 12, right: 12 }}>
        <Tooltip title="Fit photo in view">
          <IconButton
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
            onClick={() => setViewport({ x: 0, y: 0, width: photoWidth, height: photoHeight })}
          >
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export design as PNG">
          <IconButton
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
            onClick={() => {
              if (svgRef.current && scene) {
                void exportSceneAsPng(
                  svgRef.current,
                  photoWidth,
                  photoHeight,
                  useDesignerStore.getState().projectName || 'landscape-design',
                )
              }
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Dialog open={pendingCalibrationPixelLength !== null} onClose={() => setPendingCalibrationPixelLength(null)}>
        <DialogContent>
          <DialogContentText>
            How long is the line you just drew, in real-world feet? This sets the
            scene scale so plants render true to size.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Length (feet)"
            type="number"
            fullWidth
            value={calibrationFeetInput}
            onChange={(event) => setCalibrationFeetInput(event.target.value)}
            slotProps={{ htmlInput: { min: 0.1, step: 0.5 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingCalibrationPixelLength(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmCalibration}>Set scale</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
