import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi'
import { ethers } from 'ethers'
import { ArrowLeft, Coffee, CreditCard, ImageOff } from 'lucide-react'
import MenuItemCard from '../components/MenuItemCard'
import ReceiptModal from '../components/ReceiptModal'
import {
  getShopLogo, getShopTagline, isItemDeleted, isItemAvailable,
  getItemNameOverride, fetchShopMeta,
} from '../utils/storage'
import {
  CONTRACT_ADDRESS, USDC_ADDRESS, ABI_CAFEPAY, ABI_ERC20, arcTestnet,
} from '../config/wagmi'
import { getCafePayContract, getUsdcContract } from '../utils/rpc'
import { useMetaVersion } from '../hooks/useShopMeta'

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
  useMetaVersion()

  let cleanOwner = null
  try {
    cleanOwner = shopOwnerAddress ? ethers.getAddress(shopOwnerAddress) : null
  } catch {
    cleanOwner = null
  }

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

  const handleBuy = useCallback(async (shopOwner, itemIndex, finalAmount) => {
    if (!userAddress) {
      alert('Please connect your wallet to pay with USDC.')
      return
    }

    try {
      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id })
        } catch {
          alert('Please switch your wallet to Arc Testnet.')
          return
        }
      }

      const cafe = getCafePayContract()
      const menu = menuData || await cafe.getShopMenu(shopOwner)
      const itemObj = menu.find((i) => Number(i.id) === Number(itemIndex))
      const itemName = getItemNameOverride(shopOwner, itemIndex) || itemObj?.name || 'Item'

      const onChainPrice = itemObj?.price != null
        ? BigInt(itemObj.price.toString())
        : ethers.parseUnits(finalAmount.toString(), 6)

      const usdc = getUsdcContract()
      const allowance = await usdc.allowance(userAddress, CONTRACT_ADDRESS)

      if (allowance < onChainPrice) {
        await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ABI_ERC20,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, onChainPrice],
          chainId: arcTestnet.id,
        })
        await new Promise((resolve) => setTimeout(resolve, 2500))
      }

      const buyHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'buyItem',
        args: [shopOwner, BigInt(itemIndex)],
        chainId: arcTestnet.id,
      })

      const shop = await cafe.shops(shopOwner)
      const paidUsdc = Number(ethers.formatUnits(onChainPrice, 6))

      setReceipt({
        shopName: shop.shopName || shop[0] || 'CafePay Shop',
        itemName,
        finalAmount: paidUsdc,
        txHash: buyHash,
      })
    } catch (err) {
      alert('Transaction failed: ' + (err.shortMessage || err.reason || err.message))
    }
  }, [userAddress, chainId, menuData, writeContractAsync, switchChainAsync])

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
                onBuy={handleBuy}
              />
            ))
          )}
        </div>
      </div>

      <ReceiptModal receipt={receipt} />
    </section>
  )
}

export default StorePage
