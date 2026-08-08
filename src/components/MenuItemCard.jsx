import { memo, useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { Minus, Plus, ShoppingCart, ImageOff, Crown } from 'lucide-react'
import {
  getItemNameOverride,
  getItemPriceOverride,
  getItemDesc,
  getItemImage,
  getItemPriceMedium,
  getItemPriceLarge,
} from '../utils/storage'
import { useMetaVersion } from '../hooks/useShopMeta'

function MenuItemCard({ item, shopOwnerAddress, onBuy }) {
  useMetaVersion()
  const itemName = getItemNameOverride(shopOwnerAddress, item.id) || item.name
  const overridePrice = getItemPriceOverride(shopOwnerAddress, item.id)
  const finalBasePrice = overridePrice
    ? parseFloat(overridePrice)
    : parseFloat(ethers.formatUnits(item.price, 6))
  const itemDesc = getItemDesc(shopOwnerAddress, item.id)
  const foodImgUrl = getItemImage(shopOwnerAddress, item.id)
  const isPizza = itemName.toLowerCase().includes('pizza')
  const isFamous = Boolean(item.isFamous)

  const [selectedSize, setSelectedSize] = useState('regular')
  const [quantity, setQuantity] = useState(1)
  const [tableNumber, setTableNumber] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [foodImgUrl])

  const getUnitPrice = useCallback(() => {
    if (selectedSize === 'medium') {
      const custom = getItemPriceMedium(shopOwnerAddress, item.id)
      return custom != null ? custom : finalBasePrice + 2
    }
    if (selectedSize === 'large') {
      const custom = getItemPriceLarge(shopOwnerAddress, item.id)
      return custom != null ? custom : finalBasePrice + 5
    }
    return finalBasePrice
  }, [selectedSize, finalBasePrice, shopOwnerAddress, item.id])

  const totalPrice = getUnitPrice() * quantity

  const canPay = !isFamous || (Number(tableNumber) > 0 && Number.isInteger(Number(tableNumber)))

  const handlePay = () => {
    onBuy(shopOwnerAddress, item.id, totalPrice, isFamous ? Number(tableNumber) : 0)
  }

  return (
    <article className="cp-card cp-menu-card">
      <div className="cp-menu-media">
        {foodImgUrl && !imgFailed ? (
          <img
            src={foodImgUrl}
            alt={itemName}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="cp-menu-placeholder">
            <ImageOff size={26} strokeWidth={1.5} />
            <span>No photo</span>
          </div>
        )}
        {isFamous && (
          <span className="cp-famous-badge" title="Famous item — served to your table">
            <Crown size={12} /> Famous
          </span>
        )}
      </div>

      <div className="cp-menu-body">
        <div className="cp-menu-info">
          <h4 className="cp-menu-title">{itemName}</h4>
          {itemDesc ? <p className="cp-menu-desc">{itemDesc}</p> : null}
        </div>

        {isPizza && (
          <div className="cp-menu-field">
            <label className="cp-menu-label" htmlFor={`size-${item.id}`}>
              Size
            </label>
            <select
              id={`size-${item.id}`}
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="cp-input cp-menu-select"
            >
              <option value="regular">Regular (base)</option>
              <option value="medium">Medium (+2 USDC)</option>
              <option value="large">Large (+5 USDC)</option>
            </select>
          </div>
        )}

        {isFamous && (
          <div className="cp-menu-field">
            <label className="cp-menu-label" htmlFor={`table-${item.id}`}>
              Table number
            </label>
            <input
              id={`table-${item.id}`}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 12"
              className="cp-input cp-menu-select"
            />
          </div>
        )}

        <div className="cp-menu-row">
          <span className="cp-menu-label">Qty</span>
          <div className="cp-qty" role="group" aria-label="Quantity">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="cp-qty-value">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="cp-menu-footer">
          <div>
            <p className="cp-menu-label">Total</p>
            <p className="cp-menu-price">
              {totalPrice.toFixed(2)}
              <span> USDC</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={!canPay}
            className="cp-btn cp-btn-primary cp-menu-pay"
          >
            <ShoppingCart size={15} />
            Pay USDC
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(MenuItemCard)
