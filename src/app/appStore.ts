/**
 * Top-level navigation state. Deliberately tiny: three views switched in-app
 * with no URL routing yet. When deep links are needed this graduates to a real
 * router without touching feature code.
 */

import { create } from 'zustand'

export type AppView = 'projects' | 'catalog' | 'designer'

interface AppState {
  view: AppView
  setView: (view: AppView) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'projects',
  setView: (view) => set({ view }),
}))
