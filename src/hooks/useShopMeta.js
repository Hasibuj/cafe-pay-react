import { useEffect, useSyncExternalStore, useCallback } from 'react'
import {
  subscribeMeta,
  getMetaVersion,
  getCachedMeta,
  fetchShopMeta,
} from '../utils/metaCache'

/**
 * Load + subscribe to Turso-backed shop meta for an owner address.
 */
export function useShopMeta(ownerAddress) {
  const version = useSyncExternalStore(subscribeMeta, getMetaVersion, () => 0)

  useEffect(() => {
    if (!ownerAddress) return
    fetchShopMeta(ownerAddress).catch((err) => {
      console.error('useShopMeta', err)
    })
  }, [ownerAddress])

  const meta = ownerAddress ? getCachedMeta(ownerAddress) : null

  const reload = useCallback(() => {
    if (!ownerAddress) return Promise.resolve(null)
    return fetchShopMeta(ownerAddress)
  }, [ownerAddress])

  return {
    meta,
    version,
    loading: Boolean(ownerAddress) && meta == null,
    reload,
  }
}

/** Subscribe only (e.g. force re-render when any meta changes). */
export function useMetaVersion() {
  return useSyncExternalStore(subscribeMeta, getMetaVersion, () => 0)
}
