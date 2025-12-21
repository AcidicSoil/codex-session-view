import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import type { SessionExplorerFilterState } from './sessionExplorerTypes'
import { defaultFilterState } from './sessionExplorerTypes'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import {
  applySessionExplorerSearch,
  parseSessionExplorerSearch,
  sessionExplorerFiltersEqual,
} from '~/features/viewer/sessionExplorer.search'

const EMPTY_SEARCH: Record<string, unknown> = {}

function cloneFilters(input: SessionExplorerFilterState): SessionExplorerFilterState {
  return {
    ...input,
  }
}

export function useSessionExplorerFilterState() {
  const sessionExplorerState = useUiSettingsStore((state) => state.sessionExplorer)
  const updateSessionExplorer = useUiSettingsStore((state) => state.updateSessionExplorer)
  const router = useRouter()
  const locationState = useRouterState({ select: (state) => state.location })
  const searchSource = (locationState?.search as Record<string, unknown> | undefined) ?? EMPTY_SEARCH
  const [optimisticSearch, setOptimisticSearch] = useState<Record<string, unknown> | null>(null)
  const currentSearch = optimisticSearch ?? searchSource
  const filters = useMemo(() => parseSessionExplorerSearch(currentSearch), [currentSearch])

  const initialSearchAppliedRef = useRef(false)
  const lastSearchSourceRef = useRef(searchSource)
  useEffect(() => {
    if (lastSearchSourceRef.current !== searchSource) {
      lastSearchSourceRef.current = searchSource
      setOptimisticSearch(null)
    }
  }, [searchSource])

  useEffect(() => {
    if (initialSearchAppliedRef.current) return
    const persistedFilters = sessionExplorerState.filters ?? defaultFilterState
    if (!sessionExplorerFiltersEqual(persistedFilters, filters)) {
      initialSearchAppliedRef.current = true
      const nextSearch = applySessionExplorerSearch(currentSearch, () => cloneFilters(persistedFilters))
      void router.navigate({ search: nextSearch, replace: true })
      return
    }
    initialSearchAppliedRef.current = true
  }, [currentSearch, filters, router, sessionExplorerState.filters])

  useEffect(() => {
    updateSessionExplorer((state) => {
      if (sessionExplorerFiltersEqual(state.filters, filters)) {
        return state
      }
      return { ...state, filters: cloneFilters(filters) }
    })
  }, [filters, updateSessionExplorer])

  const commitFilters = useCallback(
    (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => {
      const nextSearch = applySessionExplorerSearch(currentSearch, updater)
      void router.navigate({ search: nextSearch, replace: true })
      setOptimisticSearch(nextSearch)
    },
    [currentSearch, router],
  )

  const updateFilter = useCallback(
    <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => {
      commitFilters((prev) => ({ ...prev, [key]: value }))
    },
    [commitFilters],
  )

  const resetFilters = useCallback(() => {
    commitFilters(() => cloneFilters(defaultFilterState))
  }, [commitFilters])

  return {
    filters,
    currentSearch,
    commitFilters,
    updateFilter,
    resetFilters,
  }
}
