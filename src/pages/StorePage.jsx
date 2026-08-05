import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { ethers } from 'ethers'
import { ArrowLeft, Coffee, CreditCard, ImageOff } from 'lucide-react'
import MenuItemCard from '../components/MenuItemCard'
import ReceiptModal from '../components/ReceiptModal'
import {
  getShopLogo, getShopTagline, isItemDeleted, isItemAvailable,
  getItemNameOverride,
} from '../utils/storage'
import { CONTRACT_ADDRESS, USDC_ADDRESS, ABI_CAFEPAY, ABI_ERC20 } from '../config/wagmi'

function StorePage({ shopOwnerAddress, onBackToDirectory }) {
  const { address: userAddress } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [shopName, setShopName] = useState('Loading Shop...')
  const [shopTagline, setShopTagline] = useState('Fresh food & delicious coffee served daily!')
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)

  const cleanOwner = shopOwnerAddress ? ethers.getAddress(shopOwnerAddress) : null

  const { data: shopData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'shops',
    args: cleanOwner ? [cleanOwner] : undefined,
    query: { enabled: !!cleanOwner },
  })

  const { data: menuData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getShopMenu',
    args: cleanOwner ? [cleanOwner] : undefined,
    query: { enabled: !!cleanOwner },
  })

  useEffect(() => {
    if (shopData) {
      setShopName(shopData[0] || shopData.shopName || 'Shop Not Found')
      if (cleanOwner) setShopTagline(getShopTagline(cleanOwner))
    }
  }, [shopData, cleanOwner])

  useEffect(() => {
    if (menuData && cleanOwner) {
      setLoading(false)
      if (!menuData || menuData.length === 0) { setMenuItems([]); return }
      const visible = menuData.filter((item) => {
        if (isItemDeleted(cleanOwner, item.id)) return false
        if (!isItemAvailable(cleanOwner, item.id)) return false
        return true
      })
      setMenuItems(visible)
    }
  }, [menuData, cleanOwner])

  const handleBuy = useCallback(async (shopOwner, itemIndex, finalAmount) => {
    if (!userAddress) { alert('Please connect wallet to buy.'); return }
    try {
      const menu = menuData || await (async () => {
        const readOnlyProvider = new (await import('ethers')).ethers.JsonRpcProvider('https://rpc.blockdaemon.testnet.arc.io')
        const c = new (await import('ethers')).ethers.Contract(CONTRACT_ADDRESS, ABI_CAFEPAY, readOnlyProvider)
        return c.getShopMenu(shopOwner)
      })()
      const itemObj = menu.find((i) => Number(i.id) === Number(itemIndex))
      const itemName = getItemNameOverride(shopOwner, itemIndex) || itemObj?.name || 'Item'

      const parsedAmount = ethers.parseUnits(finalAmount.toString(), 6)

      const allowance = await (async () => {
        const readOnlyProvider = new (await import('ethers')).ethers.JsonRpcProvider('https://rpc.blockdaemon.testnet.arc.io')
        const usdc = new (await import('ethers')).ethers.Contract(USDC_ADDRESS, ABI_ERC20, readOnlyProvider)
        return usdc.allowance(userAddress, CONTRACT_ADDRESS)
      })()

      if (allowance < parsedAmount) {
        await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ABI_ERC20,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, parsedAmount],
        })
        // Wait for approval to be mined
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      const buyHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI_CAFEPAY,
        functionName: 'buyItem',
        args: [shopOwner, itemIndex],
      })

      const shop = await (async () => {
        const readOnlyProvider = new (await import('ethers')).ethers.JsonRpcProvider('https://rpc.blockdaemon.testnet.arc.io')
        const c = new (await import('ethers')).ethers.Contract(CONTRACT_ADDRESS, ['function shops(address) external view returns (string, address, bool)'], readOnlyProvider)
        return c.shops(shopOwner)
      })()

      setReceipt({
        shopName: shop[0] || shop.shopName || 'CafePay Shop',
        itemName,
        finalAmount,
        txHash: buyHash,
      })
    } catch (err) {
      alert('Transaction failed: ' + (err.reason || err.message))
    }
  }, [userAddress, menuData, writeContractAsync])

  const logoUrl = cleanOwner ? getShopLogo(cleanOwner) : null

  return (
    <section className="space-y-6 animate-fade-in">
      <button
        onClick={onBackToDirectory}
        className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        <ArrowLeft size={14} />
        Back to Restaurant Directory
      </button>

      {/* Store Banner */}
      <div
        className="rounded-2xl p-6 md:p-8 border flex flex-col md:flex-row items-center gap-6"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl border overflow-hidden shrink-0"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Shop logo" className="w-full h-full object-cover" />
          ) : (
            <Coffee size={28} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="text-xl md:text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {shopName}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {shopTagline}
          </p>
        </div>
        <div
          className="px-4 py-3 rounded-xl border text-center shrink-0"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Accepted Token
          </span>
          <span className="text-xs font-bold flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-brand-500)' }}>
            <CreditCard size={12} />
            USDC (Arc Testnet)
          </span>
        </div>
      </div>

      {/* Menu */}
      <div>
        <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          Menu Items
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div
              className="col-span-3 flex flex-col items-center justify-center py-20 gap-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-brand-500)' }} />
              <p className="text-sm font-medium">Loading menu…</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div
              className="col-span-3 flex flex-col items-center justify-center py-20 gap-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ImageOff size={32} />
              <p className="text-sm font-medium">No menu items available.</p>
            </div>
          ) : (
            menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
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
