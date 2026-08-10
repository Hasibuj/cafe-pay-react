import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { ethers } from 'ethers'
import {
  Store, Upload, QrCode, Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  FileImage, DollarSign, Type, AlignLeft, Loader2, AlertCircle, Save, Ban,
  CheckCircle2, Cloud, Camera, Crown, Clock, LayoutDashboard, UtensilsCrossed,
  Bell, ArrowLeft, Copy, Check, ExternalLink, Image as ImageIcon, Menu, History,
} from 'lucide-react'
import {
  getShopTagline, getShopLogo, hasSavedLogo, hasSavedItemImage,
  getItemNameOverride, getItemPriceOverride, getItemDesc, getItemImage,
  isItemDeleted, isItemAvailable, setItemAvailability,
  deleteItem as deleteItemStorage, setItemNameOverride,
  setItemPriceOverride, setItemDesc, setItemImage, setItemSizePrice,
  setShopLogo, setShopTagline, fetchShopMeta,
} from '../utils/storage'
import { uploadImage, shopLogoKey, itemImageKey, formatBytes } from '../utils/imageUtils'
import { CONTRACT_ADDRESS, ABI_CAFEPAY, arcTestnet } from '../config/wagmi'
import { useShopMeta } from '../hooks/useShopMeta'
import { useToast } from '../context/ToastContext'
import ImageUploadField from '../components/ImageUploadField'
import OwnerOrdersPanel from '../components/OwnerOrdersPanel'
import OwnerOrderHistoryPanel from '../components/OwnerOrderHistoryPanel'
import OwnerNotificationsPanel from '../components/OwnerNotificationsPanel'
import { useNewOrderSignal, useOrderFeed, useNotifications } from '../hooks/useOrders'
import { isActiveOrder, buildSalesSummary } from '../utils/orders'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: UtensilsCrossed },
  { id: 'history', label: 'History', icon: History },
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'branding', label: 'Branding', icon: ImageIcon },
  { id: 'share', label: 'Share', icon: QrCode },
  { id: 'notifications', label: 'Alerts', icon: Bell },
]

function StatusPill({ ok, label, okLabel }) {
  return (
    <span className={`cp-status-pill ${ok ? 'is-ok' : 'is-muted'}`}>
      {ok ? <CheckCircle2 size={12} /> : <Cloud size={12} />}
      {ok ? (okLabel || label) : label}
    </span>
  )
}

function SubDurationBar({ active, secondsRemaining }) {
  const total = 30 * 86400
  const secs = Math.max(0, Number(secondsRemaining) || 0)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const pct = active ? Math.min(100, Math.round((secs / total) * 100)) : 0
  const tone = !active ? 'is-expired' : days <= 3 ? 'is-warn' : 'is-ok'

  return (
    <div className="cp-dash-duration">
      <div className="cp-dash-duration-meta">
        <span className={`cp-status-pill ${active ? (days <= 3 ? 'is-warn' : 'is-ok') : 'is-muted'}`}>
          {active ? 'Active' : 'Expired'}
        </span>
        <span className="cp-dash-duration-text">
          {active
            ? `${days}d ${hours}h remaining · 5 USDC / 30 days`
            : 'Renew to keep the shop visible in the directory'}
        </span>
      </div>
      <div className="cp-dash-duration-track" aria-hidden>
        <div className={`cp-dash-duration-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OwnerDashboardPage({ onBack }) {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const toast = useToast()

  const [section, setSection] = useState('overview')
  const [menuItems, setMenuItems] = useState([])
  const [shopName, setShopName] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [regShopName, setRegShopName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemDesc, setItemDescInput] = useState('')
  const [itemFamous, setItemFamous] = useState(false)
  const [shopLogoFile, setShopLogoFile] = useState(null)
  const [logoCompressInfo, setLogoCompressInfo] = useState(null)
  const [logoFieldKey, setLogoFieldKey] = useState(0)
  const [itemImageFile, setItemImageFile] = useState(null)
  const [itemImageFieldKey, setItemImageFieldKey] = useState(0)
  const [taglineInput, setTaglineInput] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editMedium, setEditMedium] = useState('')
  const [editLarge, setEditLarge] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [shopUrl, setShopUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [itemPhotoBusyId, setItemPhotoBusyId] = useState(null)
  const [viewOrderId, setViewOrderId] = useState(null)
  const [urlCopied, setUrlCopied] = useState(false)

  const cleanAddr = address ? ethers.getAddress(address) : null
  const { meta, reload: reloadMeta } = useShopMeta(cleanAddr)
  const newOrderSignal = useNewOrderSignal(cleanAddr, !!cleanAddr && isRegistered)
  const { orders } = useOrderFeed(isRegistered ? cleanAddr : null)
  const { unread } = useNotifications(cleanAddr, 'owner', !!cleanAddr && isRegistered)

  useEffect(() => {
    if (!newOrderSignal?.order?.id) return
    const o = newOrderSignal.order
    const table = o.tableNumber ? `Table ${String(o.tableNumber).padStart(2, '0')} · ` : ''
    toast.success(
      'NEW ORDER RECEIVED',
      `${o.id} · ${table}${(o.items || []).map((l) => `${l.qty} × ${l.name}`).join(', ')} · ${o.totalUsd} USDC`,
    )
    setViewOrderId(o.id)
    setSection('orders')
  }, [newOrderSignal, toast])

  const { data: shopData, refetch: refetchShop } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'shops',
    args: cleanAddr ? [cleanAddr] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!cleanAddr },
  })

  const { data: subData, refetch: refetchSub } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getSubscriptionStatus',
    args: cleanAddr ? [cleanAddr] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!cleanAddr && isRegistered },
  })

  const { data: menuData, refetch: refetchMenu } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getShopMenu',
    args: cleanAddr ? [cleanAddr] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!cleanAddr && isRegistered },
  })

  useEffect(() => {
    if (shopData) {
      const exists = shopData[2] || shopData.exists
      setIsRegistered(!!exists)
      setShopName(shopData[0] || shopData.shopName || '')
    }
  }, [shopData])

  useEffect(() => {
    if (menuData && cleanAddr) {
      setMenuItems(menuData.filter((item) => !isItemDeleted(cleanAddr, item.id)))
    }
  }, [menuData, cleanAddr, meta])

  useEffect(() => {
    if (!cleanAddr) return
    const url = `${window.location.origin}${window.location.pathname}?shop=${cleanAddr}`
    setShopUrl(url)
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`)
    fetchShopMeta(cleanAddr).then(() => {
      setTaglineInput(getShopTagline(cleanAddr))
      setLogoPreview(getShopLogo(cleanAddr))
    }).catch(() => {
      setTaglineInput(getShopTagline(cleanAddr))
      setLogoPreview(getShopLogo(cleanAddr))
    })
  }, [cleanAddr])

  const subActive = Boolean(subData && (subData[0] || subData.active))
  const subSeconds = subData ? Number(subData[2] || subData.secondsRemaining || 0) : 0
  const logoSaved = cleanAddr ? hasSavedLogo(cleanAddr) : false
  const availableCount = useMemo(() => {
    const itemsMeta = meta?.items
    return menuItems.filter((it) => {
      const id = String(it.id)
      if (itemsMeta?.[id]?.available === false) return false
      return isItemAvailable(cleanAddr, it.id)
    }).length
  }, [menuItems, cleanAddr, meta])
  const openOrders = useMemo(
    () => (orders || []).filter(isActiveOrder).length,
    [orders],
  )

  const sales = useMemo(() => buildSalesSummary(orders || []), [orders])

  const handleRegisterShop = useCallback(async () => {
    if (!regShopName.trim()) {
      toast.error('Shop name required', 'Enter a restaurant name to register on-chain.')
      return
    }
    setIsSubmitting(true)
    setBusyAction('register')
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'registerShop',
        args: [regShopName.trim()],
        chainId: arcTestnet.id,
      })
      toast.success('Shop registered', 'Your shop is on Arc Testnet. You can add menu items now.')
      setRegShopName('')
      refetchShop()
    } catch (err) {
      toast.error('Registration failed', err.shortMessage || err.reason || err.message)
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [regShopName, writeContractAsync, refetchShop, toast])

  const handleAddItem = useCallback(async () => {
    if (!itemName.trim() || !itemPrice.trim()) {
      toast.error('Missing fields', 'Item name and price (USDC) are required.')
      return
    }
    setIsSubmitting(true)
    setBusyAction('add-item')
    try {
      const parsedPrice = ethers.parseUnits(itemPrice.trim(), 6)
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'addItem',
        args: [itemName.trim(), parsedPrice, itemFamous],
        chainId: arcTestnet.id,
      })

      await new Promise((r) => setTimeout(r, 1500))
      const menu = await refetchMenu()
      const list = menu?.data || []
      const newItem = list.length ? list[list.length - 1] : null

      const savedBits = ['On-chain item']
      if (newItem && address) {
        const itemId = String(newItem.id)
        if (itemDesc.trim()) {
          await setItemDesc(address, itemId, itemDesc.trim())
          savedBits.push('description')
        }
        if (itemImageFile) {
          setBusyAction('upload-image')
          const { url: imgUrl, compression } = await uploadImage(itemImageFile, {
            key: itemImageKey(address, itemId),
            preset: 'food',
          })
          await setItemImage(address, itemId, imgUrl)
          savedBits.push(
            compression?.savedPercent > 0
              ? `image (−${compression.savedPercent}%)`
              : 'image',
          )
        }
        await reloadMeta()
      }

      toast.success(
        'Menu item saved',
        `${savedBits.join(' · ')} stored. ${newItem ? `Item #${newItem.id}` : ''}`.trim(),
      )
      setItemName('')
      setItemPrice('')
      setItemDescInput('')
      setItemFamous(false)
      setItemImageFile(null)
      setItemImageFieldKey((k) => k + 1)
    } catch (err) {
      toast.error('Could not add item', err.shortMessage || err.reason || err.message || String(err))
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [itemName, itemPrice, itemDesc, itemFamous, itemImageFile, address, writeContractAsync, refetchMenu, reloadMeta, toast])

  const handlePayMonthlyFee = useCallback(async () => {
    if (!address) {
      toast.error('Wallet required', 'Connect your wallet first.')
      return
    }
    setIsSubmitting(true)
    setBusyAction('subscription')
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'payMonthlyFee',
        args: [],
        chainId: arcTestnet.id,
      })
      toast.success('Subscription renewed', 'Your shop is active for another 30 days.')
      refetchSub()
    } catch (err) {
      toast.error('Subscription payment failed', err.shortMessage || err.reason || err.message)
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [address, writeContractAsync, refetchSub, toast])

  const handleUpdateLogo = useCallback(async () => {
    if (!address) {
      toast.error('Wallet required', 'Connect your wallet first.')
      return
    }
    if (!shopLogoFile) {
      toast.error('No image selected', 'Pick or change a logo first.')
      return
    }
    setIsSubmitting(true)
    setBusyAction('logo')
    try {
      const { url: logoUrl, compression } = await uploadImage(shopLogoFile, {
        key: shopLogoKey(address),
        preset: 'logo',
      })
      await setShopLogo(address, logoUrl)
      setLogoPreview(`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)
      setShopLogoFile(null)
      setLogoCompressInfo(null)
      setLogoFieldKey((k) => k + 1)
      const sizeNote = compression
        ? `Compressed ${formatBytes(compression.originalBytes)} → ${formatBytes(compression.compressedBytes)}.`
        : ''
      toast.success('Logo updated', `${sizeNote} Saved to R2 + Turso — visible to all customers.`.trim())
      await reloadMeta()
    } catch (err) {
      toast.error('Logo upload failed', err.message || String(err))
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [address, shopLogoFile, reloadMeta, toast])

  const handleChangeItemPhoto = useCallback(async (itemId, file) => {
    if (!address || !file) return
    setItemPhotoBusyId(String(itemId))
    try {
      const { url, compression } = await uploadImage(file, {
        key: itemImageKey(address, itemId),
        preset: 'food',
      })
      await setItemImage(address, itemId, url)
      await reloadMeta()
      toast.success(
        'Photo updated',
        compression?.savedPercent > 0
          ? `Saved (−${compression.savedPercent}% size). Customers see the new image.`
          : 'Saved to R2 + Turso.',
      )
    } catch (err) {
      toast.error('Photo upload failed', err.message || String(err))
    } finally {
      setItemPhotoBusyId(null)
    }
  }, [address, reloadMeta, toast])

  const handleUpdateTagline = useCallback(async () => {
    if (!cleanAddr) return
    const val = taglineInput.trim()
    if (!val) {
      toast.error('Empty tagline', 'Write a short line for your shop.')
      return
    }
    setIsSubmitting(true)
    setBusyAction('tagline')
    try {
      await setShopTagline(cleanAddr, val)
      toast.success('Tagline saved', 'Stored in Turso for all visitors.')
      await reloadMeta()
    } catch (err) {
      toast.error('Could not save tagline', err.message || String(err))
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [cleanAddr, taglineInput, reloadMeta, toast])

  const handleToggleAvailability = useCallback(async (itemId) => {
    if (!cleanAddr) return
    const current = isItemAvailable(cleanAddr, itemId)
    try {
      await setItemAvailability(cleanAddr, itemId, !current)
      toast.success(
        current ? 'Marked unavailable' : 'Marked available',
        'Visibility saved to Turso (on-chain item still exists).',
      )
      await reloadMeta()
      refetchMenu()
    } catch (err) {
      toast.error('Update failed', err.message)
    }
  }, [cleanAddr, reloadMeta, refetchMenu, toast])

  const handleDeleteItem = useCallback(async (itemId) => {
    if (!cleanAddr) return
    if (!window.confirm('Hide this item from your public menu? (Soft-delete in Turso; on-chain data remains.)')) return
    try {
      await deleteItemStorage(cleanAddr, itemId)
      toast.success('Item removed', 'Hidden from customers via Turso.')
      await reloadMeta()
      refetchMenu()
    } catch (err) {
      toast.error('Delete failed', err.message)
    }
  }, [cleanAddr, reloadMeta, refetchMenu, toast])

  const handleSaveEdit = useCallback(async (item) => {
    if (!cleanAddr) return
    if (!editName.trim() || !editPrice.trim()) {
      toast.error('Name & price required', 'Fill both fields before saving.')
      return
    }
    setIsSubmitting(true)
    setBusyAction(`edit-${item.id}`)
    try {
      await setItemNameOverride(cleanAddr, item.id, editName.trim())
      await setItemPriceOverride(cleanAddr, item.id, editPrice.trim())
      await setItemDesc(cleanAddr, item.id, editDesc.trim())
      if (editName.toLowerCase().includes('pizza')) {
        if (editMedium !== '') await setItemSizePrice(cleanAddr, item.id, 'medium', editMedium)
        if (editLarge !== '') await setItemSizePrice(cleanAddr, item.id, 'large', editLarge)
      }
      toast.success('Item updated', 'Overrides saved to Turso.')
      setEditingItem(null)
      await reloadMeta()
      refetchMenu()
    } catch (err) {
      toast.error('Save failed', err.message)
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [cleanAddr, editName, editPrice, editDesc, editMedium, editLarge, reloadMeta, refetchMenu, toast])

  const copyShopUrl = useCallback(async () => {
    if (!shopUrl) return
    try {
      await navigator.clipboard.writeText(shopUrl)
      setUrlCopied(true)
      toast.success('Link copied', 'Share it with customers or print the QR.')
      setTimeout(() => setUrlCopied(false), 2000)
    } catch {
      toast.error('Copy failed', 'Select the URL field and copy manually.')
    }
  }, [shopUrl, toast])

  const goToOrder = useCallback((id) => {
    setViewOrderId(id)
    const match = (orders || []).find((o) => o.id === id)
    setSection(match && !isActiveOrder(match) ? 'history' : 'orders')
  }, [orders])

  // ── Not connected ──
  if (!isConnected || !cleanAddr) {
    return (
      <div className="cp-dash animate-fade-in">
        <div className="cp-dash-empty">
          <Store size={28} strokeWidth={1.5} />
          <h2 className="font-display text-xl font-semibold">Owner dashboard</h2>
          <p>Connect your wallet to register a shop or manage an existing one.</p>
          <button type="button" onClick={onBack} className="cp-btn cp-btn-ghost mt-2">
            <ArrowLeft size={14} /> Back to shops
          </button>
        </div>
      </div>
    )
  }

  // ── Registration gate ──
  if (!isRegistered) {
    return (
      <div className="cp-dash animate-fade-in">
        <div className="cp-dash-topbar">
          <button type="button" onClick={onBack} className="cp-btn cp-btn-ghost !min-h-9 !px-2.5 !text-xs">
            <ArrowLeft size={14} /> Directory
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold truncate">Owner dashboard</h2>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>Register your shop on Arc Testnet</p>
          </div>
        </div>

        <div className="cp-dash-register">
          <div className="cp-owner-callout">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              Register your shop on-chain to add menu items and accept USDC.
              Logos, taglines, and photos save to Turso + R2 after registration.
            </p>
          </div>
          <div className="cp-owner-section">
            <label className="cp-owner-label" htmlFor="reg-shop-name">Restaurant name</label>
            <input
              id="reg-shop-name"
              type="text"
              placeholder="e.g. Gourmet Burger Hub"
              value={regShopName}
              onChange={(e) => setRegShopName(e.target.value)}
              className="cp-input"
              autoComplete="organization"
            />
            <p className="cp-field-hint">This name is stored on the CafePay contract and shown in the directory.</p>
            <button
              type="button"
              onClick={handleRegisterShop}
              disabled={isSubmitting}
              className="cp-btn cp-btn-primary w-full mt-4"
            >
              {busyAction === 'register' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {busyAction === 'register' ? 'Registering…' : 'Register shop on-chain'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sectionTitle = NAV.find((n) => n.id === section)?.label || 'Dashboard'

  return (
    <div className="cp-dash animate-fade-in">
      <div className="cp-dash-topbar">
        <button type="button" onClick={onBack} className="cp-btn cp-btn-ghost !min-h-9 !px-2.5 !text-xs shrink-0">
          <ArrowLeft size={14} /> Directory
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight truncate">
            {shopName || 'Owner dashboard'}
          </h2>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {sectionTitle} · manage shop, menu, and live orders
          </p>
        </div>
        {logoPreview && logoSaved ? (
          <img src={logoPreview} alt="" className="cp-dash-top-logo" />
        ) : (
          <div className="cp-owner-header-icon shrink-0">
            <Store size={18} />
          </div>
        )}
      </div>

      <div className="cp-dash-layout">
        {/* Side / mobile nav */}
        <nav className="cp-dash-nav" aria-label="Owner sections">
          {NAV.map(({ id, label, icon: Icon }) => {
            const badge =
              id === 'orders' && openOrders > 0 ? openOrders
                : id === 'notifications' && unread > 0 ? unread
                  : null
            return (
              <button
                key={id}
                type="button"
                className={`cp-dash-nav-item ${section === id ? 'is-active' : ''}`}
                onClick={() => setSection(id)}
                aria-current={section === id ? 'page' : undefined}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge != null && <span className="cp-dash-nav-badge">{badge}</span>}
              </button>
            )
          })}
        </nav>

        <div className="cp-dash-content">
          {/* ── Overview ── */}
          {section === 'overview' && (
            <div className="cp-dash-panel cp-dash-overview">
              <div className="cp-dash-stats">
                <button type="button" className="cp-dash-stat" onClick={() => setSection('orders')}>
                  <span className="cp-dash-stat-label">Open orders</span>
                  <span className="cp-dash-stat-value tabular-nums">{openOrders}</span>
                  <span className="cp-dash-stat-hint">Live kitchen queue</span>
                </button>
                <button type="button" className="cp-dash-stat" onClick={() => setSection('history')}>
                  <span className="cp-dash-stat-label">Sold today</span>
                  <span className="cp-dash-stat-value cp-dash-stat-value--money tabular-nums">
                    {sales.todayUsd.toFixed(2)}
                  </span>
                  <span className="cp-dash-stat-hint">
                    USDC · {sales.todayCount} paid · History
                  </span>
                </button>
                <button type="button" className="cp-dash-stat" onClick={() => setSection('menu')}>
                  <span className="cp-dash-stat-label">Menu items</span>
                  <span className="cp-dash-stat-value tabular-nums">{menuItems.length}</span>
                  <span className="cp-dash-stat-hint">{availableCount} available to customers</span>
                </button>
                <button type="button" className="cp-dash-stat" onClick={() => setSection('notifications')}>
                  <span className="cp-dash-stat-label">Unread alerts</span>
                  <span className="cp-dash-stat-value tabular-nums">{unread}</span>
                  <span className="cp-dash-stat-hint">Dismiss anytime · orders kept</span>
                </button>
              </div>

              <section className="cp-owner-section cp-owner-section-spaced">
                <div className="cp-owner-section-head">
                  <h4><Clock size={15} /> Subscription</h4>
                  <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>Duration on-chain</span>
                </div>
                {subData ? (
                  <div className="cp-sub-block">
                    <SubDurationBar active={subActive} secondsRemaining={subSeconds} />
                    <div className="cp-sub-actions">
                      <button
                        type="button"
                        onClick={handlePayMonthlyFee}
                        disabled={isSubmitting}
                        className="cp-btn cp-btn-primary"
                      >
                        {busyAction === 'subscription'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Crown size={14} />}
                        {busyAction === 'subscription' ? 'Renewing…' : 'Renew (5 USDC · +30 days)'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Reading subscription status…</p>
                )}
              </section>

              <section className="cp-owner-section cp-owner-section-spaced">
                <div className="cp-owner-section-head">
                  <h4><DollarSign size={15} /> Sales snapshot</h4>
                  <button
                    type="button"
                    className="cp-btn cp-btn-ghost !min-h-8 !px-2.5 !text-[0.65rem]"
                    onClick={() => setSection('history')}
                  >
                    Full history
                  </button>
                </div>
                <div className="cp-sales-strip cp-sales-strip--compact">
                  <div className="cp-sales-card">
                    <span className="cp-dash-stat-label">Today</span>
                    <span className="cp-sales-value tabular-nums">{sales.todayUsd.toFixed(2)} USDC</span>
                    <span className="cp-dash-stat-hint">{sales.todayCount} orders</span>
                  </div>
                  <div className="cp-sales-card">
                    <span className="cp-dash-stat-label">7 days</span>
                    <span className="cp-sales-value tabular-nums">{sales.weekUsd.toFixed(2)} USDC</span>
                    <span className="cp-dash-stat-hint">{sales.weekCount} orders</span>
                  </div>
                  <div className="cp-sales-card">
                    <span className="cp-dash-stat-label">All time</span>
                    <span className="cp-sales-value tabular-nums">{sales.totalUsd.toFixed(2)} USDC</span>
                    <span className="cp-dash-stat-hint">Paid · not cancelled</span>
                  </div>
                </div>
              </section>

              <section className="cp-owner-section cp-owner-section-spaced">
                <div className="cp-owner-section-head">
                  <h4>Quick actions</h4>
                </div>
                <div className="cp-dash-quick">
                  <button type="button" className="cp-dash-quick-btn" onClick={() => setSection('menu')}>
                    <Plus size={16} /> Add menu item
                  </button>
                  <button type="button" className="cp-dash-quick-btn" onClick={() => setSection('branding')}>
                    <Upload size={16} /> Update branding
                  </button>
                  <button type="button" className="cp-dash-quick-btn" onClick={() => setSection('share')}>
                    <QrCode size={16} /> Customer QR
                  </button>
                  <button type="button" className="cp-dash-quick-btn" onClick={() => setSection('orders')}>
                    <UtensilsCrossed size={16} /> Live orders
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ── Orders ── */}
          {section === 'orders' && (
            <div className="cp-dash-panel">
              <OwnerOrdersPanel
                ownerAddress={cleanAddr}
                enabled={!!cleanAddr}
                expandedId={viewOrderId}
                onExpandedChange={setViewOrderId}
              />
            </div>
          )}

          {/* ── History ── */}
          {section === 'history' && (
            <div className="cp-dash-panel">
              <OwnerOrderHistoryPanel
                ownerAddress={cleanAddr}
                expandedId={viewOrderId}
                onExpandedChange={setViewOrderId}
              />
            </div>
          )}

          {/* ── Menu ── */}
          {section === 'menu' && (
            <div className="cp-dash-panel">
              <div className="cp-dash-menu-grid">
                <section className="cp-owner-section">
                  <div className="cp-owner-section-head">
                    <h4><Plus size={15} /> Add menu item</h4>
                    <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
                      On-chain price · off-chain photo/desc
                    </span>
                  </div>

                  <div className="cp-field-grid">
                    <div className="cp-field">
                      <label className="cp-owner-label" htmlFor="add-item-name">
                        <Type size={11} /> Name
                      </label>
                      <input
                        id="add-item-name"
                        type="text"
                        placeholder="e.g. Pepperoni Pizza"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="cp-input !text-sm"
                      />
                      <p className="cp-field-hint">Shown on the public menu. Pizza names unlock size prices when editing.</p>
                    </div>
                    <div className="cp-field">
                      <label className="cp-owner-label" htmlFor="add-item-price">
                        <DollarSign size={11} /> Price (USDC)
                      </label>
                      <input
                        id="add-item-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="10.00"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        className="cp-input !text-sm"
                      />
                      <p className="cp-field-hint">Stored on-chain with 6 decimals. Customers pay this amount in USDC.</p>
                    </div>
                  </div>

                  <div className="cp-field mt-3.5">
                    <label className="cp-owner-label" htmlFor="add-item-desc">
                      <AlignLeft size={11} /> Description
                    </label>
                    <input
                      id="add-item-desc"
                      type="text"
                      placeholder="Short description for customers"
                      value={itemDesc}
                      onChange={(e) => setItemDescInput(e.target.value)}
                      className="cp-input !text-sm"
                    />
                    <p className="cp-field-hint">Optional. Saved to Turso (not on-chain).</p>
                  </div>

                  <label className="cp-toggle-row mt-3.5">
                    <input
                      type="checkbox"
                      checked={itemFamous}
                      onChange={(e) => setItemFamous(e.target.checked)}
                    />
                    <span className="cp-toggle-track" aria-hidden />
                    <span>
                      <span className="cp-owner-label !mb-0 flex items-center gap-1">
                        <Crown size={12} /> Famous item
                      </span>
                      <span className="text-[0.65rem] block" style={{ color: 'var(--text-tertiary)' }}>
                        Customers must enter a table number so staff can serve it.
                      </span>
                    </span>
                  </label>

                  <div className="mt-3.5">
                    <ImageUploadField
                      key={itemImageFieldKey}
                      label="Food photo"
                      hint="Optional. Max 5MB — compressed before upload."
                      preset="food"
                      aspect="16 / 10"
                      disabled={isSubmitting}
                      busy={busyAction === 'upload-image'}
                      busyLabel="Uploading…"
                      onFileReady={(file) => setItemImageFile(file)}
                      onClearPending={() => setItemImageFile(null)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={isSubmitting}
                    className="cp-btn cp-btn-primary w-full mt-4"
                  >
                    {(busyAction === 'add-item' || busyAction === 'upload-image')
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Plus size={14} />}
                    {busyAction === 'upload-image'
                      ? 'Uploading image…'
                      : busyAction === 'add-item'
                        ? 'Saving on-chain…'
                        : 'Add item (chain + cloud)'}
                  </button>
                </section>

                <section className="cp-owner-section">
                  <div className="cp-owner-section-head">
                    <h4><Store size={15} /> Your menu</h4>
                    <span className="text-[0.7rem] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {menuItems.length} item{menuItems.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {menuItems.length === 0 ? (
                    <p className="text-xs text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
                      No items yet — use the form to add your first dish.
                    </p>
                  ) : (
                    <ul className="cp-owner-item-list">
                      {menuItems.map((item) => {
                        const available = isItemAvailable(cleanAddr, item.id)
                        const currentName = getItemNameOverride(cleanAddr, item.id) || item.name
                        const currentPrice = getItemPriceOverride(cleanAddr, item.id) || ethers.formatUnits(item.price, 6)
                        const currentDesc = getItemDesc(cleanAddr, item.id)
                        const imgOk = hasSavedItemImage(cleanAddr, item.id)
                        const imgUrl = getItemImage(cleanAddr, item.id)
                        const isEditing = editingItem === item.id
                        const editingBusy = busyAction === `edit-${item.id}`

                        return (
                          <li key={String(item.id)} className="cp-owner-item">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="cp-field-grid">
                                  <div className="cp-field">
                                    <label className="cp-owner-label">Name</label>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="cp-input !text-sm !min-h-10"
                                    />
                                  </div>
                                  <div className="cp-field">
                                    <label className="cp-owner-label">Price (USDC)</label>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(e.target.value)}
                                      className="cp-input !text-sm !min-h-10"
                                    />
                                  </div>
                                </div>
                                <div className="cp-field">
                                  <label className="cp-owner-label">Description</label>
                                  <input
                                    type="text"
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="cp-input !text-sm !min-h-10"
                                  />
                                </div>
                                {editName.toLowerCase().includes('pizza') && (
                                  <div className="cp-field-grid">
                                    <div className="cp-field">
                                      <label className="cp-owner-label">Medium USDC</label>
                                      <input
                                        type="number"
                                        value={editMedium}
                                        onChange={(e) => setEditMedium(e.target.value)}
                                        className="cp-input !text-sm !min-h-10"
                                        placeholder="Optional"
                                      />
                                      <p className="cp-field-hint">Size price override (Turso).</p>
                                    </div>
                                    <div className="cp-field">
                                      <label className="cp-owner-label">Large USDC</label>
                                      <input
                                        type="number"
                                        value={editLarge}
                                        onChange={(e) => setEditLarge(e.target.value)}
                                        className="cp-input !text-sm !min-h-10"
                                        placeholder="Optional"
                                      />
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(item)}
                                    disabled={editingBusy}
                                    className="cp-btn cp-btn-primary !min-h-9 !text-xs"
                                  >
                                    {editingBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="cp-btn cp-btn-ghost !min-h-9 !text-xs"
                                  >
                                    <Ban size={12} /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <label className="cp-owner-item-thumb is-editable" title="Change photo">
                                  {itemPhotoBusyId === String(item.id) ? (
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-brand-400)' }} />
                                  ) : imgUrl && imgOk ? (
                                    <img src={imgUrl} alt="" />
                                  ) : (
                                    <FileImage size={16} style={{ color: 'var(--text-tertiary)' }} />
                                  )}
                                  <span className="cp-owner-item-thumb-badge">
                                    <Camera size={11} />
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    disabled={itemPhotoBusyId != null}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      e.target.value = ''
                                      if (f) handleChangeItemPhoto(item.id, f)
                                    }}
                                  />
                                </label>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                      {currentName}
                                    </p>
                                    <span className={`cp-mini-badge ${available ? 'is-on' : 'is-off'}`}>
                                      {available ? 'Available' : 'Hidden'}
                                    </span>
                                    <StatusPill ok={imgOk} label="No image" okLabel="Image saved" />
                                  </div>
                                  {currentDesc ? (
                                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                      {currentDesc}
                                    </p>
                                  ) : (
                                    <p className="text-[0.65rem] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                      No description yet
                                    </p>
                                  )}
                                  <p className="text-xs font-semibold mt-1.5 tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
                                    {currentPrice} USDC
                                  </p>
                                </div>
                                <div className="flex items-start gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAvailability(item.id)}
                                    className="p-2 rounded-lg"
                                    style={{ color: available ? 'var(--color-warning)' : 'var(--color-success)' }}
                                    title={available ? 'Hide item' : 'Show item'}
                                    aria-label={available ? `Hide ${currentName}` : `Show ${currentName}`}
                                  >
                                    {available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItem(item.id)
                                      setEditName(currentName)
                                      setEditPrice(String(currentPrice))
                                      setEditDesc(currentDesc)
                                      setEditMedium('')
                                      setEditLarge('')
                                    }}
                                    className="p-2 rounded-lg"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title="Edit"
                                    aria-label={`Edit ${currentName}`}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-2 rounded-lg"
                                    style={{ color: 'var(--color-error)' }}
                                    title="Remove from menu"
                                    aria-label={`Delete ${currentName}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* ── Branding ── */}
          {section === 'branding' && (
            <div className="cp-dash-panel">
              <section className="cp-owner-section">
                <div className="cp-owner-section-head">
                  <h4><Upload size={15} /> Branding</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill ok={logoSaved} label="Logo not saved" okLabel="Logo saved" />
                    <StatusPill
                      ok={Boolean(meta?.tagline)}
                      label="Tagline not set"
                      okLabel="Tagline saved"
                    />
                  </div>
                </div>

                <div className="cp-owner-brand-grid">
                  <ImageUploadField
                    key={logoFieldKey}
                    label="Shop logo"
                    hint="Click Change anytime to replace. Max 5MB — we compress automatically."
                    valueUrl={logoPreview}
                    preset="logo"
                    aspect="1 / 1"
                    disabled={isSubmitting}
                    busy={busyAction === 'logo'}
                    busyLabel="Saving…"
                    onFileReady={(file, result) => {
                      setShopLogoFile(file)
                      setLogoCompressInfo(result || null)
                      if (result?.dataUrl) setLogoPreview(result.dataUrl)
                    }}
                    onClearPending={() => {
                      setShopLogoFile(null)
                      setLogoCompressInfo(null)
                      setLogoPreview(getShopLogo(cleanAddr))
                    }}
                  />
                  <div className="cp-owner-brand-actions">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Logo is stored in R2 and indexed in Turso so every visitor sees the same branding.
                      {logoCompressInfo ? (
                        <>
                          {' '}Ready: {formatBytes(logoCompressInfo.originalBytes)}
                          {logoCompressInfo.savedPercent > 0
                            ? ` → ${formatBytes(logoCompressInfo.compressedBytes)} (−${logoCompressInfo.savedPercent}%)`
                            : ''}
                          .
                        </>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      onClick={handleUpdateLogo}
                      disabled={isSubmitting || !shopLogoFile}
                      className="cp-btn cp-btn-primary w-full"
                    >
                      {busyAction === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {busyAction === 'logo'
                        ? 'Uploading…'
                        : logoSaved
                          ? 'Save new logo'
                          : 'Upload & save logo'}
                    </button>
                  </div>
                </div>

                <div className="cp-owner-divider" />

                <div className="cp-field">
                  <label className="cp-owner-label flex items-center gap-1.5" htmlFor="shop-tagline">
                    <Tag size={12} /> Shop tagline
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="shop-tagline"
                      type="text"
                      value={taglineInput}
                      onChange={(e) => setTaglineInput(e.target.value)}
                      className="cp-input flex-1"
                      placeholder="Fresh food & delicious coffee…"
                      maxLength={120}
                    />
                    <button
                      type="button"
                      onClick={handleUpdateTagline}
                      disabled={isSubmitting}
                      className="cp-btn cp-btn-primary shrink-0"
                    >
                      {busyAction === 'tagline' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save tagline
                    </button>
                  </div>
                  <p className="cp-field-hint">One short line under your shop name (max 120 characters).</p>
                </div>
              </section>
            </div>
          )}

          {/* ── Share ── */}
          {section === 'share' && (
            <div className="cp-dash-panel">
              <section className="cp-owner-section cp-owner-section-center">
                <div className="cp-owner-section-head justify-center">
                  <h4><QrCode size={15} /> Customer link</h4>
                </div>
                <p className="text-xs mb-4 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  Print this QR or share the link so guests open your menu directly — no directory search needed.
                </p>
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Shop QR Code"
                    className="w-44 h-44 rounded-xl border p-2.5 mx-auto"
                    style={{ borderColor: 'var(--border-default)', background: 'white' }}
                  />
                ) : null}
                <div className="cp-field mt-4 max-w-lg mx-auto text-left">
                  <label className="cp-owner-label" htmlFor="shop-url">Shop URL</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="shop-url"
                      type="text"
                      readOnly
                      value={shopUrl}
                      onClick={(e) => e.target.select()}
                      className="cp-input !text-xs font-mono flex-1"
                      aria-label="Shop URL"
                    />
                    <button type="button" onClick={copyShopUrl} className="cp-btn cp-btn-primary shrink-0">
                      {urlCopied ? <Check size={14} /> : <Copy size={14} />}
                      {urlCopied ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>
                {shopUrl ? (
                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cp-btn cp-btn-ghost mt-3 inline-flex"
                  >
                    <ExternalLink size={14} /> Open public menu
                  </a>
                ) : null}
              </section>
            </div>
          )}

          {/* ── Notifications ── */}
          {section === 'notifications' && (
            <div className="cp-dash-panel">
              <OwnerNotificationsPanel
                ownerAddress={cleanAddr}
                enabled={!!cleanAddr}
                onViewOrder={goToOrder}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
