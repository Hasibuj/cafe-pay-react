import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { ethers } from 'ethers'
import {
  X, Store, Upload, QrCode, Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  FileImage, DollarSign, Type, AlignLeft, Loader2, AlertCircle, Save, Ban
} from 'lucide-react'
import {
  setShopLogo, getShopTagline, setShopTagline,
  getItemNameOverride, getItemPriceOverride, getItemDesc,
  isItemDeleted, isItemAvailable, setItemAvailability,
  deleteItem as deleteItemStorage, setItemNameOverride,
  setItemPriceOverride, setItemDesc, setItemImage, setItemSizePrice,
} from '../utils/storage'
import { processImageFile } from '../utils/imageUtils'
import { CONTRACT_ADDRESS, ABI_CAFEPAY } from '../config/wagmi'

function OwnerModal({ isOpen, onClose }) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [menuItems, setMenuItems] = useState([])
  const [shopName, setShopName] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [regShopName, setRegShopName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemDesc, setItemDescInput] = useState('')
  const [shopLogoFile, setShopLogoFile] = useState(null)
  const [itemImageFile, setItemImageFile] = useState(null)
  const [taglineInput, setTaglineInput] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shopUrl, setShopUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  const cleanAddr = address ? ethers.getAddress(address) : null

  const { data: shopData, refetch: refetchShop } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'shops',
    args: cleanAddr ? [cleanAddr] : undefined,
    query: { enabled: !!cleanAddr && isOpen },
  })

  const { data: menuData, refetch: refetchMenu } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getShopMenu',
    args: cleanAddr ? [cleanAddr] : undefined,
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
  }, [menuData, cleanAddr])

  useEffect(() => {
    if (isOpen && cleanAddr) {
      const url = `${window.location.origin}${window.location.pathname}?shop=${cleanAddr}`
      setShopUrl(url)
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`)
      setTaglineInput(getShopTagline(cleanAddr))
    }
  }, [isOpen, cleanAddr])

  const handleRegisterShop = useCallback(async () => {
    if (!regShopName.trim()) { alert('Please enter a shop name.'); return }
    setIsSubmitting(true)
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'registerShop',
        args: [regShopName.trim()],
      })
      alert('Shop registered successfully!')
      setRegShopName('')
      refetchShop()
    } catch (err) {
      alert('Error: ' + (err.reason || err.message))
    } finally { setIsSubmitting(false) }
  }, [regShopName, writeContractAsync, refetchShop])

  const handleAddItem = useCallback(async () => {
    if (!itemName.trim() || !itemPrice.trim()) { alert('Please fill in item name and price.'); return }
    setIsSubmitting(true)
    try {
      const parsedPrice = ethers.parseUnits(itemPrice.trim(), 6)
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'addItem',
        args: [itemName.trim(), parsedPrice],
      })
      const menu = await refetchMenu()
      if (menu?.data?.length > 0) {
        const newItem = menu.data[menu.data.length - 1]
        if (itemDesc.trim()) setItemDesc(address, newItem.id, itemDesc.trim())
        if (itemImageFile) {
          const img = await processImageFile(itemImageFile)
          if (img) setItemImage(address, newItem.id, img)
        }
      }
      alert('Item added successfully!')
      setItemName(''); setItemPrice(''); setItemDescInput(''); setItemImageFile(null)
    } catch (err) {
      alert('Error: ' + (err.reason || err.message))
    } finally { setIsSubmitting(false) }
  }, [itemName, itemPrice, itemDesc, itemImageFile, address, writeContractAsync, refetchMenu])

  const handleUpdateLogo = useCallback(async () => {
    if (!address) { alert('Please connect wallet first.'); return }
    if (!shopLogoFile) { alert('Please select an image file.'); return }
    const logoUrl = await processImageFile(shopLogoFile)
    if (!logoUrl) { alert('Failed to process image.'); return }
    setShopLogo(address, logoUrl)
    alert('Shop logo updated successfully!')
    setShopLogoFile(null)
  }, [address, shopLogoFile])

  const handleUpdateTagline = useCallback(() => {
    if (!cleanAddr) return
    const val = taglineInput.trim()
    if (!val) { alert('Tagline cannot be empty.'); return }
    setShopTagline(cleanAddr, val)
    alert('Shop tagline updated successfully!')
  }, [cleanAddr, taglineInput])

  const handleToggleAvailability = useCallback((itemId) => {
    const current = isItemAvailable(cleanAddr, itemId)
    setItemAvailability(cleanAddr, itemId, !current)
    alert(current ? 'Item marked as Unavailable.' : 'Item is now Available!')
    refetchMenu()
  }, [cleanAddr, refetchMenu])

  const handleDeleteItem = useCallback((itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    deleteItemStorage(cleanAddr, itemId)
    alert('Item deleted successfully!')
    refetchMenu()
  }, [cleanAddr, refetchMenu])

  const handleSaveEdit = useCallback((item) => {
    if (!editName.trim() || !editPrice.trim()) { alert('Name and Price cannot be empty.'); return }
    setItemNameOverride(cleanAddr, item.id, editName.trim())
    setItemPriceOverride(cleanAddr, item.id, editPrice.trim())
    setItemDesc(cleanAddr, item.id, editDesc.trim())
    if (editName.toLowerCase().includes('pizza')) {
      const mp = prompt('Enter Medium size price (USDC):', parseFloat(editPrice) + 2)
      if (mp) setItemSizePrice(cleanAddr, item.id, 'medium', mp.trim())
      const lp = prompt('Enter Large size price (USDC):', parseFloat(editPrice) + 5)
      if (lp) setItemSizePrice(cleanAddr, item.id, 'large', lp.trim())
    }
    alert('Item updated successfully!')
    setEditingItem(null)
    refetchMenu()
  }, [cleanAddr, editName, editPrice, editDesc, refetchMenu])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Shop Owner Dashboard"
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl border max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-6" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'oklch(0.65 0.19 70 / 0.1)' }}
            >
              <Store size={18} style={{ color: 'var(--color-brand-500)' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Shop Owner Dashboard
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {isRegistered ? shopName : 'Manage your restaurant & menu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            aria-label="Close dashboard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Registration Section */}
        {!isRegistered ? (
          <div className="space-y-4 animate-fade-in">
            <div
              className="flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed"
              style={{
                background: 'oklch(0.65 0.19 70 / 0.06)',
                borderColor: 'oklch(0.65 0.19 70 / 0.15)',
                color: 'var(--color-brand-600)',
              }}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                You have not registered a shop yet on the blockchain. Register now to start adding menu items and accepting USDC payments.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                placeholder="e.g. Gourmet Burger Hub"
                value={regShopName}
                onChange={(e) => setRegShopName(e.target.value)}
                className="w-full text-xs rounded-xl px-3.5 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--color-brand-400)',
                }}
              />
            </div>

            <button
              onClick={handleRegisterShop}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
                color: 'white',
                boxShadow: '0 4px 12px oklch(0.65 0.19 70 / 0.2)',
              }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isSubmitting ? 'Registering...' : 'Register Shop on Blockchain'}
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Shop Settings */}
            <div
              className="p-5 rounded-xl border space-y-4"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}
            >
              <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Upload size={15} />
                Shop Settings & Logo
              </h4>
              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Update Shop Logo
                </label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setShopLogoFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs rounded-xl px-3 py-2 border"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleUpdateLogo}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Upload size={12} />
                    Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Add Menu Item */}
            <div
              className="p-5 rounded-xl border space-y-4"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}
            >
              <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Plus size={15} />
                Add New Menu Item
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Type size={11} /> Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Pepperoni Pizza"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full text-xs rounded-xl px-3.5 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-brand-400)',
                    }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <DollarSign size={11} /> Base Price (USDC)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10.0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full text-xs rounded-xl px-3.5 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-brand-400)',
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <AlignLeft size={11} /> Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freshly baked with extra mozzarella cheese"
                  value={itemDesc}
                  onChange={(e) => setItemDescInput(e.target.value)}
                  className="w-full text-xs rounded-xl px-3.5 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--color-brand-400)',
                  }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <FileImage size={11} /> Food Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setItemImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs rounded-xl px-3 py-2 border"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
                  color: 'white',
                  boxShadow: '0 4px 12px oklch(0.65 0.19 70 / 0.2)',
                }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isSubmitting ? 'Adding...' : 'Add Item to Menu'}
              </button>
            </div>

            {/* QR Code & Tagline */}
            <div
              className="p-5 rounded-xl border text-center space-y-4"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}
            >
              <h4 className="font-bold text-sm flex items-center justify-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <QrCode size={15} />
                Shop QR Code & Link
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Customers can scan this to view your menu directly.
              </p>
              <div className="flex justify-center">
                <img
                  src={qrUrl}
                  alt="Shop QR Code"
                  className="w-36 h-36 rounded-xl border p-2"
                  style={{ borderColor: 'var(--border-default)', background: 'white' }}
                />
              </div>
              <input
                type="text"
                readOnly
                value={shopUrl}
                onClick={(e) => e.target.select()}
                className="w-full text-xs rounded-xl px-3 py-2.5 border text-center font-mono select-all"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
                aria-label="Shop URL"
              />
              <div className="text-left space-y-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  <Tag size={11} /> Shop Tagline
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taglineInput}
                    onChange={(e) => setTaglineInput(e.target.value)}
                    className="flex-1 text-xs rounded-xl px-3 py-2.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      '--tw-ring-color': 'var(--color-brand-400)',
                    }}
                  />
                  <button
                    onClick={handleUpdateTagline}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: 'var(--color-brand-500)',
                      color: 'white',
                    }}
                  >
                    <Save size={12} />
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="border-t pt-5 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
              <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Store size={15} />
                Manage Menu Items
              </h4>
              {menuItems.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
                  No items added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const available = isItemAvailable(cleanAddr, item.id)
                    const currentName = getItemNameOverride(cleanAddr, item.id) || item.name
                    const currentPrice = getItemPriceOverride(cleanAddr, item.id) || ethers.formatUnits(item.price, 6)
                    const currentDesc = getItemDesc(cleanAddr, item.id)
                    const isEditing = editingItem === item.id

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border transition-colors"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-default)',
                        }}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Name</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full text-xs rounded-lg px-2.5 py-2 border"
                                  style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-default)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Price (USDC)</label>
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full text-xs rounded-lg px-2.5 py-2 border"
                                  style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-default)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Description</label>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full text-xs rounded-lg px-2.5 py-2 border"
                                style={{
                                  background: 'var(--bg-input)',
                                  borderColor: 'var(--border-default)',
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(item)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                style={{
                                  background: 'oklch(0.65 0.17 155 / 0.1)',
                                  color: 'var(--color-success)',
                                }}
                              >
                                <Save size={11} /> Save
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                style={{
                                  background: 'var(--bg-input)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <Ban size={11} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                                {currentName}
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                  style={available
                                    ? { background: 'oklch(0.65 0.17 155 / 0.1)', color: 'var(--color-success)' }
                                    : { background: 'oklch(0.60 0.18 25 / 0.1)', color: 'var(--color-error)' }
                                  }
                                >
                                  {available ? 'Available' : 'Unavailable'}
                                </span>
                              </p>
                              {currentDesc && (
                                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {currentDesc}
                                </p>
                              )}
                              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-brand-500)' }}>
                                {currentPrice} USDC
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleAvailability(item.id)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: available ? 'var(--color-warning)' : 'var(--color-success)' }}
                                title={available ? 'Mark Unavailable' : 'Mark Available'}
                                aria-label={available ? `Mark ${currentName} as unavailable` : `Mark ${currentName} as available`}
                              >
                                {available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItem(item.id)
                                  setEditName(currentName)
                                  setEditPrice(currentPrice)
                                  setEditDesc(currentDesc)
                                }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Edit item"
                                aria-label={`Edit ${currentName}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--color-error)' }}
                                title="Delete item"
                                aria-label={`Delete ${currentName}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerModal
