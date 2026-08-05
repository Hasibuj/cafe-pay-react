export function getShopLogo(ownerAddress) {
  return localStorage.getItem(`shop_logo_${ownerAddress}`) || null;
}

export function setShopLogo(ownerAddress, dataUrl) {
  localStorage.setItem(`shop_logo_${ownerAddress}`, dataUrl);
}

export function getShopTagline(ownerAddress) {
  return localStorage.getItem(`shop_tagline_${ownerAddress}`) || "Fresh food & delicious coffee served daily!";
}

export function setShopTagline(ownerAddress, tagline) {
  localStorage.setItem(`shop_tagline_${ownerAddress}`, tagline);
}

export function getItemMeta(ownerAddress, itemId, key) {
  return localStorage.getItem(`item_${key}_${ownerAddress}_${itemId}`);
}

export function setItemMeta(ownerAddress, itemId, key, value) {
  localStorage.setItem(`item_${key}_${ownerAddress}_${itemId}`, value);
}

export function isItemDeleted(ownerAddress, itemId) {
  return localStorage.getItem(`item_deleted_${ownerAddress}_${itemId}`) === 'true';
}

export function isItemAvailable(ownerAddress, itemId) {
  return localStorage.getItem(`item_available_${ownerAddress}_${itemId}`) !== 'false';
}

export function setItemAvailability(ownerAddress, itemId, available) {
  localStorage.setItem(`item_available_${ownerAddress}_${itemId}`, available.toString());
}

export function deleteItem(ownerAddress, itemId) {
  localStorage.setItem(`item_deleted_${ownerAddress}_${itemId}`, 'true');
}

export function getItemPriceMedium(ownerAddress, itemId) {
  const val = localStorage.getItem(`item_price_medium_${ownerAddress}_${itemId}`);
  return val ? parseFloat(val) : null;
}

export function getItemPriceLarge(ownerAddress, itemId) {
  const val = localStorage.getItem(`item_price_large_${ownerAddress}_${itemId}`);
  return val ? parseFloat(val) : null;
}

export function setItemSizePrice(ownerAddress, itemId, size, price) {
  localStorage.setItem(`item_price_${size}_${ownerAddress}_${itemId}`, price.toString());
}

export function setItemDesc(ownerAddress, itemId, desc) {
  localStorage.setItem(`item_desc_${ownerAddress}_${itemId}`, desc);
}

export function getItemDesc(ownerAddress, itemId) {
  return localStorage.getItem(`item_desc_${ownerAddress}_${itemId}`) || "";
}

export function setItemImage(ownerAddress, itemId, img) {
  localStorage.setItem(`item_img_${ownerAddress}_${itemId}`, img);
}

export function getItemImage(ownerAddress, itemId) {
  return localStorage.getItem(`item_img_${ownerAddress}_${itemId}`) || null;
}

export function setItemNameOverride(ownerAddress, itemId, name) {
  localStorage.setItem(`item_name_${ownerAddress}_${itemId}`, name);
}

export function getItemNameOverride(ownerAddress, itemId) {
  return localStorage.getItem(`item_name_${ownerAddress}_${itemId}`) || null;
}

export function setItemPriceOverride(ownerAddress, itemId, price) {
  localStorage.setItem(`item_price_${ownerAddress}_${itemId}`, price);
}

export function getItemPriceOverride(ownerAddress, itemId) {
  return localStorage.getItem(`item_price_${ownerAddress}_${itemId}`) || null;
}
