/**
 * Zustand store holding the active design session.
 *
 * History strategy: full-scene snapshots pushed via beginChange() BEFORE a
 * mutation starts. Drag gestures snapshot once at pointer-down and then mutate
 * transiently (no per-frame history entries); discrete actions (add, delete,
 * slider stops) each snapshot themselves.
 *
 * Scene coordinates are feet-based world units (see core/domain/design.ts).
 * The store never touches persistence directly - DesignerView subscribes and
 * autosaves through features/projects/projectStorage.
 */

import { create } from 'zustand'
import { createEntityId } from '@core/ids'
import type { DesignScene, PhotoCalibration, Placement, SizeMode } from '@core/domain/design'
import type { Plant } from '@core/domain/plant'
import type { Project } from '@core/domain/project'
import {
  createEmptyHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from '@core/services/history'
import type { HistoryState } from '@core/services/history'

export type EditorTool = 'select' | 'pan' | 'calibrate'
export type ZShiftDirection = 'raise' | 'lower'

/** Arrow-key nudges within this window collapse into one undo step. */
const NUDGE_COALESCE_WINDOW_MS = 600
const DUPLICATE_OFFSET_FEET = 2

interface DesignerState {
  projectId: string | null
  projectName: string
  projectCreatedAtIso: string
  scene: DesignScene | null
  selectedPlacementId: string | null
  activeTool: EditorTool
  /** Species staged for click-to-place on the canvas. */
  armedPlant: Plant | null
  defaultSizeMode: SizeMode
  history: HistoryState<DesignScene>

  openProject: (project: Project) => void
  closeDesigner: () => void
  renameProject: (name: string) => void

  setActiveTool: (tool: EditorTool) => void
  setDefaultSizeMode: (sizeMode: SizeMode) => void
  setArmedPlant: (plant: Plant | null) => void
  setSelectedPlacementId: (placementId: string | null) => void

  beginChange: () => void
  addPlacement: (plant: Plant, centerXFeet: number, centerYFeet: number) => void
  updatePlacement: (
    placementId: string,
    partial: Partial<Placement>,
    options?: { transient?: boolean },
  ) => void
  removePlacement: (placementId: string) => void
  duplicatePlacement: (placementId: string) => void
  shiftPlacementZOrder: (placementId: string, direction: ZShiftDirection) => void
  nudgeSelectedPlacement: (deltaXFeet: number, deltaYFeet: number) => void
  setCalibration: (calibration: PhotoCalibration | null) => void

  undo: () => void
  redo: () => void
}

const INITIAL_STATE_PICK = {
  projectId: null,
  projectName: '',
  projectCreatedAtIso: '',
  scene: null,
  selectedPlacementId: null,
  activeTool: 'select' as EditorTool,
  armedPlant: null,
  defaultSizeMode: 'mature' as SizeMode,
  history: createEmptyHistory<DesignScene>(),
}

let lastNudgeTimestamp = 0

export const useDesignerStore = create<DesignerState>((set, get) => ({
  ...INITIAL_STATE_PICK,

  openProject: (project) => {
    const scene = project.scenes[0]
    if (!scene) {
      console.error(`Project "${project.name}" contains no scenes and cannot be opened.`)
      return
    }
    set({
      ...INITIAL_STATE_PICK,
      projectId: project.id,
      projectName: project.name,
      projectCreatedAtIso: project.createdAtIso,
      scene,
    })
  },

  closeDesigner: () => set({ ...INITIAL_STATE_PICK }),

  renameProject: (name) => set({ projectName: name }),

  setActiveTool: (activeTool) =>
    // Arming a plant only makes sense while placing; switching tools disarms.
    set({ activeTool, armedPlant: null }),

  setDefaultSizeMode: (defaultSizeMode) => set({ defaultSizeMode }),
  setArmedPlant: (armedPlant) => set({ armedPlant }),
  setSelectedPlacementId: (selectedPlacementId) => set({ selectedPlacementId }),

  beginChange: () => {
    const { scene, history } = get()
    if (!scene) return
    set({ history: pushHistory(scene, history) })
  },

  addPlacement: (plant, centerXFeet, centerYFeet) => {
    const { scene, history, defaultSizeMode } = get()
    if (!scene) return

    const placement: Placement = {
      id: createEntityId(),
      plantId: plant.id,
      centerXFeet,
      centerYFeet,
      rotationDegrees: 0,
      sizeScaleFactor: 1,
      sizeMode: defaultSizeMode,
    }
    set({
      history: pushHistory(scene, history),
      scene: { ...scene, placements: [...scene.placements, placement] },
      selectedPlacementId: placement.id,
    })
  },

  updatePlacement: (placementId, partial, options) => {
    const { scene, history } = get()
    if (!scene) return
    if (!options?.transient) {
      // Discrete edits snapshot themselves; drags already snapshotted at start.
      set({ history: pushHistory(scene, history) })
    }
    set({
      scene: {
        ...scene,
        placements: scene.placements.map((placement) =>
          placement.id === placementId ? { ...placement, ...partial } : placement,
        ),
      },
    })
  },

  removePlacement: (placementId) => {
    const { scene, history } = get()
    if (!scene) return
    set({
      history: pushHistory(scene, history),
      scene: { ...scene, placements: scene.placements.filter((p) => p.id !== placementId) },
      selectedPlacementId:
        get().selectedPlacementId === placementId ? null : get().selectedPlacementId,
    })
  },

  duplicatePlacement: (placementId) => {
    const { scene, history } = get()
    if (!scene) return
    const sourceIndex = scene.placements.findIndex((p) => p.id === placementId)
    if (sourceIndex === -1) return

    const source = scene.placements[sourceIndex]
    const copy: Placement = {
      ...source,
      id: createEntityId(),
      centerXFeet: source.centerXFeet + DUPLICATE_OFFSET_FEET,
      centerYFeet: source.centerYFeet + DUPLICATE_OFFSET_FEET,
    }
    const placements = [...scene.placements]
    placements.splice(sourceIndex + 1, 0, copy)
    set({
      history: pushHistory(scene, history),
      scene: { ...scene, placements },
      selectedPlacementId: copy.id,
    })
  },

  shiftPlacementZOrder: (placementId, direction) => {
    const { scene, history } = get()
    if (!scene) return
    const sourceIndex = scene.placements.findIndex((p) => p.id === placementId)
    const targetIndex = direction === 'raise' ? sourceIndex + 1 : sourceIndex - 1
    if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= scene.placements.length) return

    const placements = [...scene.placements]
    ;[placements[sourceIndex], placements[targetIndex]] = [
      placements[targetIndex],
      placements[sourceIndex],
    ]
    set({ history: pushHistory(scene, history), scene: { ...scene, placements } })
  },

  nudgeSelectedPlacement: (deltaXFeet, deltaYFeet) => {
    const state = get()
    const selected = state.scene?.placements.find((p) => p.id === state.selectedPlacementId)
    if (!selected) return

    const now = Date.now()
    const isRepeatNudge = now - lastNudgeTimestamp <= NUDGE_COALESCE_WINDOW_MS
    lastNudgeTimestamp = now

    state.updatePlacement(
      selected.id,
      {
        centerXFeet: selected.centerXFeet + deltaXFeet,
        centerYFeet: selected.centerYFeet + deltaYFeet,
      },
      { transient: isRepeatNudge },
    )
  },

  setCalibration: (calibration) => {
    const { scene, history } = get()
    if (!scene) return
    set({ history: pushHistory(scene, history), scene: { ...scene, calibration } })
  },

  undo: () => {
    const { scene, history } = get()
    if (!scene) return
    const outcome = undoHistory(scene, history)
    if (!outcome) return
    set({ scene: outcome.value, history: outcome.history, selectedPlacementId: null })
  },

  redo: () => {
    const { scene, history } = get()
    if (!scene) return
    const outcome = redoHistory(scene, history)
    if (!outcome) return
    set({ scene: outcome.value, history: outcome.history, selectedPlacementId: null })
  },
}))

/** Convenience selector for the currently selected placement object. */
export function selectSelectedPlacement(state: DesignerState): Placement | null {
  if (!state.scene || !state.selectedPlacementId) return null
  return state.scene.placements.find((p) => p.id === state.selectedPlacementId) ?? null
}
