/**
 * Shop/item meta accessors — Turso-backed cache (+ R2 URL fallbacks).
 * Call fetchShopMeta(owner) before relying on data for a shop.
 */
import {
  getCachedMeta,
  getCachedItem,
  fetchShopMeta,
  saveShopFields,
  saveItemFields,
} from './metaCache'

const PUBLIC_BASE = (import.meta.env.VITE_R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '')
const DEFAULT_TAGLINE = 'Fresh food & delicious coffee served daily!'

function normalizeAddr(ownerAddress) {
  return ownerAddress ? String(ownerAddress).toLowerCase() : ''
}

export { fetchShopMeta, saveShopFields, saveItemFields }

export function getShopLogo(ownerAddress) {
  const cached = getCachedMeta(ownerAddress)?.logoUrl
  if (cached) return cached
  if (PUBLIC_BASE && ownerAddress) {
    return `${PUBLIC_BASE}/logos/${normalizeAddr(ownerAddress)}.jpg`
  }
  return null
}

/** @deprecated prefer saveShopFields — kept for gradual migration */
export async function setShopLogo(ownerAddress, logoUrl) {
  return saveShopFields(ownerAddress, { logoUrl })
}

export function getShopTagline(ownerAddress) {
  const cached = getCachedMeta(ownerAddress)?.tagline
  if (cached) return cached
  return DEFAULT_TAGLINE
}

export async function setShopTagline(ownerAddress, tagline) {
  return saveShopFields(ownerAddress, { tagline })
}

export function isItemDeleted(ownerAddress, itemId) {
  return Boolean(getCachedItem(ownerAddress, itemId)?.deleted)
}

export function isItemAvailable(ownerAddress, itemId) {
  const item = getCachedItem(ownerAddress, itemId)
  if (!item) return true
  return item.available !== false
}

export async function setItemAvailability(ownerAddress, itemId, available) {
  return saveItemFields(ownerAddress, { itemId: String(itemId), available: Boolean(available) })
}

export async function deleteItem(ownerAddress, itemId) {
  return saveItemFields(ownerAddress, { itemId: String(itemId), deleted: true, available: false })
}

export function getItemPriceMedium(ownerAddress, itemId) {
  const v = getCachedItem(ownerAddress, itemId)?.priceMedium
  return v != null ? Number(v) : null
}

export function getItemPriceLarge(ownerAddress, itemId) {
  const v = getCachedItem(ownerAddress, itemId)?.priceLarge
  return v != null ? Number(v) : null
}

export async function setItemSizePrice(ownerAddress, itemId, size, price) {
  const num = price === '' || price == null ? null : Number(price)
  if (size === 'medium') {
    return saveItemFields(ownerAddress, { itemId: String(itemId), priceMedium: num })
  }
  return saveItemFields(ownerAddress, { itemId: String(itemId), priceLarge: num })
}

export async function setItemDesc(ownerAddress, itemId, desc) {
  return saveItemFields(ownerAddress, { itemId: String(itemId), description: desc })
}

export function getItemDesc(ownerAddress, itemId) {
  return getCachedItem(ownerAddress, itemId)?.description || ''
}

export async function setItemImage(ownerAddress, itemId, img) {
  return saveItemFields(ownerAddress, { itemId: String(itemId), imageUrl: img })
}

export function getItemImage(ownerAddress, itemId) {
  const cached = getCachedItem(ownerAddress, itemId)?.imageUrl
  if (cached) return cached
  if (PUBLIC_BASE && ownerAddress && itemId != null) {
    return `${PUBLIC_BASE}/items/${normalizeAddr(ownerAddress)}/${itemId}.jpg`
  }
  return null
}

export async function setItemNameOverride(ownerAddress, itemId, name) {
  return saveItemFields(ownerAddress, { itemId: String(itemId), nameOverride: name })
}

export function getItemNameOverride(ownerAddress, itemId) {
  return getCachedItem(ownerAddress, itemId)?.nameOverride || null
}

export async function setItemPriceOverride(ownerAddress, itemId, price) {
  return saveItemFields(ownerAddress, {
    itemId: String(itemId),
    priceOverride: price == null ? null : String(price),
  })
}

export function getItemPriceOverride(ownerAddress, itemId) {
  return getCachedItem(ownerAddress, itemId)?.priceOverride || null
}

/** True if Turso has an image URL recorded for this item. */
export function hasSavedItemImage(ownerAddress, itemId) {
  return Boolean(getCachedItem(ownerAddress, itemId)?.imageUrl)
}

export function hasSavedLogo(ownerAddress) {
  return Boolean(getCachedMeta(ownerAddress)?.logoUrl)
}
