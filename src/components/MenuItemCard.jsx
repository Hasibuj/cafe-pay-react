import { memo, useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { Minus, Plus, ShoppingCart, ImageOff } from 'lucide-react'
import {
  getItemNameOverride,
  getItemPriceOverride,
  getItemDesc,
  getItemImage,
  getItemPriceMedium,
  getItemPriceLarge,
} from '../utils/storage'

function MenuItemCard({ item, shopOwnerAddress, onBuy }) {
  const itemName = getItemNameOverride(shopOwnerAddress, item.id) || item.name
  const overridePrice = getItemPriceOverride(shopOwnerAddress, item.id)
  const finalBasePrice = overridePrice ? parseFloat(overridePrice) : parseFloat(ethers.formatUnits(item.price, 6))
  const itemDesc = getItemDesc(shopOwnerAddress, item.id)
  const foodImgUrl = getItemImage(shopOwnerAddress, item.id)
  const isPizza = itemName.toLowerCase().includes('pizza')

  const [selectedSize, setSelectedSize] = useState('regular')
  const [quantity, setQuantity] = useState(1)

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

  return (
    <article
      className="flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div>
        {foodImgUrl ? (
          <img
            src={foodImgUrl}
            alt={itemName}
            className="w-full h-40 object-cover rounded-xl mb-4 border"
            style={{ borderColor: 'var(--border-default)' }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-40 rounded-xl mb-4 flex items-center justify-center border"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border-default)',
            }}
          >
            <ImageOff size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        <h4 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {itemName}
        </h4>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          {itemDesc}
        </p>

        {isPizza && (
          <div className="mb-4">
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Select Size
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full text-xs rounded-xl px-3 py-2.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--color-brand-400)',
              }}
            >
              <option value="regular">Regular (Base Price)</option>
              <option value="medium">Medium (+$2)</option>
              <option value="large">Large (+$5)</option>
            </select>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Quantity
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          Total Price:{' '}
          <span className="font-black text-base" style={{ color: 'var(--color-brand-500)' }}>
            {totalPrice.toFixed(2)}
          </span>{' '}
          USDC
        </div>
      </div>

      <button
        onClick={() => onBuy(shopOwnerAddress, item.id, totalPrice)}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
          color: 'white',
          boxShadow: '0 4px 12px oklch(0.65 0.19 70 / 0.2)',
        }}
      >
        <ShoppingCart size={14} />
        Pay with USDC
      </button>
    </article>
  )
}

export default memo(MenuItemCard)
