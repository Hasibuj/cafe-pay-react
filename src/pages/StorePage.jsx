import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi'
import { ethers } from 'ethers'
import {
  ArrowLeft, Coffee, CreditCard, ImageOff, ShoppingCart,
  Loader2, Table2, CheckCircle2, XCircle,
} from 'lucide-react'
import MenuItemCard from '../components/MenuItemCard'
import ReceiptModal from '../components/ReceiptModal'
import OrderTracker from '../components/OrderTracker'
import {
  getShopLogo, getShopTagline, isItemDeleted, isItemAvailable, fetchShopMeta,
} from '../utils/storage'
import {
  CONTRACT_ADDRESS, USDC_ADDRESS, ABI_CAFEPAY, ABI_ERC20, arcTestnet,
} from '../config/wagmi'
import { getCafePayContract, getUsdcContract } from '../utils/rpc'
import { useMetaVersion } from '../hooks/useShopMeta'
import { useOrderTracker } from '../hooks/useOrders'
import { createOrder, updateOrderPayment } from '../utils/orders'

function StorePage({ shopOwnerAddress, onBackToDirectory }) {
  const { address: userAddress, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()

  const [shopName, setShopName] = useState('Loading Shop...')
  const [shopTagline, setShopTagline] = useState('Fresh food & delicious coffee served daily!')
  const [menuItems, setMenuItems] = useState([])
  const [menuData, setMenuData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)
  const [logoFailed, setLogoFailed] = useState(false)

  const [cart, setCart] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState(null)
  const [activeOrderId, setActiveOrderId] = useState(null)

  useMetaVersion()
  const { order: activeOrder } = useOrderTracker(activeOrderId, userAddress)

  let cleanOwner = null
  try {
    cleanOwner = shopOwnerAddress ? ethers.getAddress(shopOwnerAddress) : null
  } catch {
    cleanOwner = null
  }

  // Read optional ?table=NN (e.g. from a table QR code)
  useEffect(() => {
    const table = new URLSearchParams(window.location.search).get('table')
    if (table && /^\d{1,3}$/.test(table)) setTableNumber(table)
  }, [])

  useEffect(() => {
    if (!cleanOwner) {
      setLoading(false)
      setShopName('Invalid shop')
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const cafe = getCafePayContract()
        const [shop, menu] = await Promise.all([
          cafe.shops(cleanOwner),
          cafe.getShopMenu(cleanOwner),
        ])
        if (cancelled) return

        const exists = shop.exists ?? shop[2]
        const name = shop.shopName ?? shop[0]
        setShopName(exists ? (name || 'Shop') : 'Shop not found')
        setMenuData(menu)

        try {
          await fetchShopMeta(cleanOwner)
        } catch {
          /* Turso optional offline */
        }
        if (cancelled) return

        setShopTagline(getShopTagline(cleanOwner))

        const visible = (menu || []).filter((item) => {
          if (isItemDeleted(cleanOwner, item.id)) return false
          if (!isItemAvailable(cleanOwner, item.id)) return false
          if (item.active === false) return false
          return true
        })
        setMenuItems(visible)
      } catch (err) {
        console.error('Store load failed:', err)
        if (!cancelled) {
          setShopName('Failed to load shop')
          setMenuItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [cleanOwner])

  const handleAdd = useCallback((line) => {
    const key = `${line.itemId}:${line.size || 'regular'}`
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.key === key)
      if (idx === -1) return [...prev, { ...line, key }]
      const next = [...prev]
      next[idx] = { ...next[idx], qty: next[idx].qty + line.qty }
      return next
    })
  }, [])

  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart])
  const hasFamous = useMemo(() => cart.some((l) => l.isFamous), [cart])
  const tableNum = Number(tableNumber)
  const tableOk = tableNum > 0 && Number.isInteger(tableNum)

  const handlePlaceOrder = useCallback(async () => {
    setPlaceError(null)
    if (!userAddress) {
      setPlaceError('Please connect your wallet to pay with USDC.')
      return
    }
    if (cart.length === 0) return
    if (!tableOk) {
      setPlaceError('Please enter your table number.')
      return
    }
    if (hasFamous && !tableOk) {
      setPlaceError('A table number is required for famous items.')
      return
    }

    try {
      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id })
        } catch {
          setPlaceError('Please switch your wallet to Arc Testnet.')
          return
        }
      }

      const items = cart.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        size: l.size && l.size !== 'regular' ? l.size : null,
        qty: l.qty,
        unitPrice: Number(l.unitPrice),
        isFamous: Boolean(l.isFamous),
      }))

      setPlacing(true)

      // 1. Create the order (payment starts Pending)
      const created = await createOrder({
        shopOwner: cleanOwner,
        buyer: userAddress,
        tableNumber: tableNum,
        items,
        totalUsd: Number(cartTotal.toFixed(2)),
        paymentMethod: 'USDC',
        paymentStatus: 'Pending',
      })
      const order = created.order
      setActiveOrderId(order.id)
      setCart([])

      // 2. Approve USDC + settle on-chain for every unit ordered
      const cafe = getCafePayContract()
      const menu = menuData || await cafe.getShopMenu(cleanOwner)
      const usdc = getUsdcContract()

      // On-chain charge is the item's on-chain price per unit
      let chargeTotal = 0n
      const linesOnChain = cart.map((l) => {
        const itemObj = menu.find((i) => Number(i.id) === Number(l.itemId))
        const unit = itemObj?.price != null
          ? BigInt(itemObj.price.toString())
          : ethers.parseUnits(l.unitPrice.toFixed(6), 6)
        chargeTotal += unit * BigInt(l.qty)
        return { itemId: l.itemId, qty: l.qty, unit }
      })

      const allowance = await usdc.allowance(userAddress, CONTRACT_ADDRESS)
      if (allowance < chargeTotal) {
        await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ABI_ERC20,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, chargeTotal],
          chainId: arcTestnet.id,
        })
        await new Promise((resolve) => setTimeout(resolve, 2500))
      }

      let lastHash = null
      for (const line of linesOnChain) {
        for (let i = 0; i < line.qty; i++) {
          lastHash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ABI_CAFEPAY,
            functionName: 'buyItem',
            args: [cleanOwner, BigInt(line.itemId), BigInt(tableNum)],
            chainId: arcTestnet.id,
          })
        }
      }

      // 3. Mark payment Successful only after the on-chain txs settle
      await updateOrderPayment(order.id, 'Successful', lastHash)

      const shop = await cafe.shops(cleanOwner)
      setReceipt({
        shopName: shop.shopName || shop[0] || 'CafePay Shop',
        itemName: items.length === 1 ? items[0].name : `${items.length} items`,
        finalAmount: cartTotal,
        txHash: lastHash,
        tableNumber: tableNum,
      })
      setPlaceError(null)
    } catch (err) {
      console.error('Place order failed:', err)
      setPlaceError('Transaction failed: ' + (err.shortMessage || err.reason || err.message))
      // Keep the order visible but mark payment failed
      if (activeOrderId && userAddress) {
        try {
          await updateOrderPayment(activeOrderId, 'Failed')
        } catch {
          /* ignore */
        }
      }
    } finally {
      setPlacing(false)
    }
  }, [
    userAddress, chainId, cart, cartTotal, cleanOwner, menuData,
    writeContractAsync, switchChainAsync, tableOk, hasFamous, tableNum,
    activeOrderId,
  ])

  const logoUrl = cleanOwner ? getShopLogo(cleanOwner) : null

  useEffect(() => {
    setLogoFailed(false)
  }, [logoUrl])

  return (
    <section className="cp-store animate-fade-in">
      <div className="cp-store-nav">
        <button
          type="button"
          onClick={onBackToDirectory}
          className="cp-back-btn"
        >
          <ArrowLeft size={16} strokeWidth={2.25} />
          <span>Back to directory</span>
        </button>
      </div>

      <div className="cp-panel cp-store-banner">
        <div className="cp-store-logo">
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Coffee size={28} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          )}
        </div>

        <div className="cp-store-banner-text">
          <h2 className="cp-h2 text-balance" style={{ color: 'var(--text-primary)' }}>
            {shopName}
          </h2>
          <p className="cp-store-tagline">{shopTagline}</p>
        </div>

        <div className="cp-store-pay-badge">
          <span className="cp-store-pay-label">Payments</span>
          <span className="cp-store-pay-value">
            <CreditCard size={13} aria-hidden />
            USDC · Arc
          </span>
        </div>
      </div>

      {activeOrder && <OrderTracker order={activeOrder} />}

      <div className="cp-store-menu-section">
        <div className="cp-store-menu-head">
          <h3 className="cp-h3" style={{ color: 'var(--text-primary)' }}>
            Menu
          </h3>
          {!loading && menuItems.length > 0 && (
            <span className="cp-store-menu-count">
              {menuItems.length} item{menuItems.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="cp-grid-menu">
          {loading ? (
            <div className="cp-empty">
              <div className="cp-spinner" aria-hidden />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Loading menu from Arc RPC…
              </p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="cp-empty">
              <ImageOff size={30} strokeWidth={1.5} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No menu items available right now.
              </p>
            </div>
          ) : (
            menuItems.map((item) => (
              <MenuItemCard
                key={String(item.id)}
                item={item}
                shopOwnerAddress={cleanOwner}
                onAdd={handleAdd}
              />
            ))
          )}
        </div>
      </div>

      {cart.length > 0 && !placing && (
        <div className="cp-cart-bar">
          <div className="cp-container cp-cart-bar-inner">
            <div className="cp-cart-bar-title">
              <ShoppingCart size={16} style={{ color: 'var(--color-brand-400)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {cartCount} item{cartCount === 1 ? '' : 's'}
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
                {cartTotal.toFixed(2)} USDC
              </span>
            </div>

            <div className="cp-cart-actions">
              <label className="cp-cart-table">
                <Table2 size={14} style={{ color: 'var(--text-secondary)' }} />
                <span className="sr-only">Table number</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Table #"
                  className="cp-cart-table-input"
                />
              </label>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placing}
                className="cp-btn cp-btn-primary cp-cart-checkout"
              >
                {placing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {placing ? 'Placing…' : `Place order · ${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {placing && (
        <div className="cp-cart-bar is-placing" role="status">
          <div className="cp-container cp-cart-bar-inner justify-center">
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-brand-400)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Ordering on-chain… you'll be notified when the restaurant confirms.
            </span>
          </div>
        </div>
      )}

      {placeError && (
        <div className="cp-container cp-place-error" role="alert">
          <XCircle size={15} />
          {placeError}
        </div>
      )}

      <ReceiptModal receipt={receipt} />
    </section>
  )
}

export default StorePage
