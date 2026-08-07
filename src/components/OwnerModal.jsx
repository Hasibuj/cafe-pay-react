import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { ethers } from 'ethers'
import {
  X, Store, Upload, QrCode, Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  FileImage, DollarSign, Type, AlignLeft, Loader2, AlertCircle, Save, Ban,
  CheckCircle2, Cloud, Camera,
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
import ImageUploadField from './ImageUploadField'

function StatusPill({ ok, label, okLabel }) {
  return (
    <span className={`cp-status-pill ${ok ? 'is-ok' : 'is-muted'}`}>
      {ok ? <CheckCircle2 size={12} /> : <Cloud size={12} />}
      {ok ? (okLabel || label) : label}
    </span>
  )
}

function OwnerModal({ isOpen, onClose }) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const toast = useToast()

  const [menuItems, setMenuItems] = useState([])
  const [shopName, setShopName] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [regShopName, setRegShopName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemDesc, setItemDescInput] = useState('')
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

  const cleanAddr = address ? ethers.getAddress(address) : null
  const { meta, reload: reloadMeta } = useShopMeta(isOpen ? cleanAddr : null)

  const { data: shopData, refetch: refetchShop } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'shops',
    args: cleanAddr ? [cleanAddr] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!cleanAddr && isOpen },
  })

  const { data: menuData, refetch: refetchMenu } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getShopMenu',
    args: cleanAddr ? [cleanAddr] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!cleanAddr && isOpen && isRegistered },
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
      const filtered = menuData.filter((item) => !isItemDeleted(cleanAddr, item.id))
      setMenuItems(filtered)
    }
  }, [menuData, cleanAddr, meta])

  useEffect(() => {
    if (isOpen && cleanAddr) {
      const url = `${window.location.origin}${window.location.pathname}?shop=${cleanAddr}`
      setShopUrl(url)
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`)
      fetchShopMeta(cleanAddr).then(() => {
        setTaglineInput(getShopTagline(cleanAddr))
        setLogoPreview(getShopLogo(cleanAddr))
      }).catch(() => {
        setTaglineInput(getShopTagline(cleanAddr))
        setLogoPreview(getShopLogo(cleanAddr))
      })
    }
  }, [isOpen, cleanAddr])

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
        args: [itemName.trim(), parsedPrice],
        chainId: arcTestnet.id,
      })

      // Wait briefly then refetch so we get the new item id
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
      setItemImageFile(null)
      setItemImageFieldKey((k) => k + 1)
    } catch (err) {
      toast.error('Could not add item', err.shortMessage || err.reason || err.message || String(err))
    } finally {
      setIsSubmitting(false)
      setBusyAction('')
    }
  }, [itemName, itemPrice, itemDesc, itemImageFile, address, writeContractAsync, refetchMenu, reloadMeta, toast])

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

  if (!isOpen) return null

  const logoSaved = cleanAddr ? hasSavedLogo(cleanAddr) : false

  return (
    <div
      className="cp-modal-overlay"
      style={{ zIndex: 60 }}
      role="dialog"
      aria-modal="true"
      aria-label="Shop Owner Dashboard"
    >
      <div className="cp-modal cp-modal-wide cp-owner-modal animate-scale-in">
        <div className="cp-owner-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="cp-owner-header-icon">
              <Store size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Owner dashboard
              </h3>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {isRegistered ? shopName : 'Register & manage your shop'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            aria-label="Close dashboard"
          >
            <X size={16} />
          </button>
        </div>

        {!isRegistered ? (
          <div className="cp-owner-stack animate-fade-in">
            <div className="cp-owner-callout">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                Register your shop on Arc Testnet to add menu items and accept USDC.
                Off-chain details (logos, taglines, photos) save to Turso + R2.
              </p>
            </div>
            <div className="cp-owner-section">
              <label className="cp-owner-label">Restaurant name</label>
              <input
                type="text"
                placeholder="e.g. Gourmet Burger Hub"
                value={regShopName}
                onChange={(e) => setRegShopName(e.target.value)}
                className="cp-input"
              />
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
        ) : (
          <div className="cp-owner-stack animate-fade-in">
            {/* Branding */}
            <section className="cp-owner-section">
              <div className="cp-owner-section-head">
                <h4>
                  <Upload size={15} />
                  Branding
                </h4>
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

              <label className="cp-owner-label flex items-center gap-1.5">
                <Tag size={12} /> Shop tagline
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={taglineInput}
                  onChange={(e) => setTaglineInput(e.target.value)}
                  className="cp-input flex-1"
                  placeholder="Fresh food & delicious coffee…"
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
            </section>

            {/* Add item */}
            <section className="cp-owner-section">
              <div className="cp-owner-section-head">
                <h4>
                  <Plus size={15} />
                  Add menu item
                </h4>
                <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
                  On-chain price · off-chain photo/desc
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="cp-owner-label flex items-center gap-1">
                    <Type size={11} /> Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pepperoni Pizza"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="cp-input !text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="cp-owner-label flex items-center gap-1">
                    <DollarSign size={11} /> Price (USDC)
                  </label>
                  <input
                    type="number"
                    placeholder="10.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="cp-input !text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 mt-3.5">
                <label className="cp-owner-label flex items-center gap-1">
                  <AlignLeft size={11} /> Description
                </label>
                <input
                  type="text"
                  placeholder="Short description for customers"
                  value={itemDesc}
                  onChange={(e) => setItemDescInput(e.target.value)}
                  className="cp-input !text-sm"
                />
              </div>

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

            {/* QR */}
            <section className="cp-owner-section cp-owner-section-center">
              <div className="cp-owner-section-head justify-center">
                <h4>
                  <QrCode size={15} />
                  Customer link
                </h4>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Share this so guests open your menu directly.
              </p>
              <img
                src={qrUrl}
                alt="Shop QR Code"
                className="w-36 h-36 rounded-xl border p-2 mx-auto"
                style={{ borderColor: 'var(--border-default)', background: 'white' }}
              />
              <input
                type="text"
                readOnly
                value={shopUrl}
                onClick={(e) => e.target.select()}
                className="cp-input !text-xs !text-center font-mono mt-3"
                aria-label="Shop URL"
              />
            </section>

            {/* Manage menu */}
            <section className="cp-owner-section">
              <div className="cp-owner-section-head">
                <h4>
                  <Store size={15} />
                  Your menu
                </h4>
                <span className="text-[0.7rem] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {menuItems.length} item{menuItems.length === 1 ? '' : 's'}
                </span>
              </div>

              {menuItems.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  No items yet — add one above.
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="cp-owner-label">Name</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="cp-input !text-sm !min-h-10"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="cp-owner-label">Price (USDC)</label>
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="cp-input !text-sm !min-h-10"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="cp-owner-label">Description</label>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="cp-input !text-sm !min-h-10"
                              />
                            </div>
                            {editName.toLowerCase().includes('pizza') && (
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <label className="cp-owner-label">Medium USDC</label>
                                  <input
                                    type="number"
                                    value={editMedium}
                                    onChange={(e) => setEditMedium(e.target.value)}
                                    className="cp-input !text-sm !min-h-10"
                                    placeholder="Optional"
                                  />
                                </div>
                                <div className="space-y-1">
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
                                Save to Turso
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
                                  No description in Turso
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
        )}
      </div>
    </div>
  )
}

export default OwnerModal
