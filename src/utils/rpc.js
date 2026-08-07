import { ethers } from 'ethers'
import {
  ARC_RPC_URLS,
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  ABI_CAFEPAY_ETHERS,
  ABI_ERC20_ETHERS,
} from '../config/wagmi'

let _provider = null

/** Shared public JSON-RPC provider — no wallet required. */
export function getPublicProvider() {
  if (!_provider) {
    // Detect network from Arc RPC; no injected wallet needed
    _provider = new ethers.JsonRpcProvider(ARC_RPC_URLS[0])
  }
  return _provider
}

export function getCafePayContract(provider = getPublicProvider()) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI_CAFEPAY_ETHERS, provider)
}

export function getUsdcContract(provider = getPublicProvider()) {
  return new ethers.Contract(USDC_ADDRESS, ABI_ERC20_ETHERS, provider)
}

/**
 * Load full shop directory from Arc RPC (no wallet).
 * @returns {Promise<{ address: string, name: string }[]>}
 */
export async function fetchShopDirectory() {
  const cafe = getCafePayContract()
  const addresses = await cafe.getAllShops()
  if (!addresses?.length) return []

  const results = await Promise.all(
    addresses.map(async (raw) => {
      try {
        const address = ethers.getAddress(raw)
        const shop = await cafe.shops(address)
        const exists = shop.exists ?? shop[2]
        const name = shop.shopName ?? shop[0]
        if (!exists || !name) return null
        return { address, name }
      } catch {
        return null
      }
    }),
  )

  return results.filter(Boolean)
}

/**
 * Read USDC ERC-20 balance for an address (6 decimals on Arc CafePay USDC).
 * @returns {Promise<{ formatted: string, symbol: string, value: bigint, decimals: number } | null>}
 */
export async function fetchUsdcBalance(ownerAddress) {
  if (!ownerAddress) return null
  try {
    const usdc = getUsdcContract()
    const [raw, decimals, symbol] = await Promise.all([
      usdc.balanceOf(ownerAddress),
      usdc.decimals().catch(() => 6),
      usdc.symbol().catch(() => 'USDC'),
    ])
    const dec = Number(decimals)
    const formatted = ethers.formatUnits(raw, dec)
    return {
      value: raw,
      decimals: dec,
      symbol: symbol || 'USDC',
      formatted,
    }
  } catch (err) {
    console.error('USDC balance read failed:', err)
    return null
  }
}
