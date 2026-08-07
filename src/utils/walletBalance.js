import { USDC_ADDRESS, ARC_RPC_URLS } from '../config/wagmi'

const BALANCE_OF_SELECTOR = '0x70a08231' // balanceOf(address)
const DECIMALS_SELECTOR = '0x313ce567' // decimals()
const SYMBOL_SELECTOR = '0x95d89b41' // symbol()

function padAddress(addr) {
  return String(addr).toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

function decodeUint(hex) {
  if (!hex || hex === '0x') return 0n
  return BigInt(hex)
}

function decodeString(hex) {
  if (!hex || hex === '0x' || hex.length < 66) return null
  try {
    // dynamic ABI string or bytes32 symbol
    const data = hex.slice(2)
    if (data.length === 64) {
      // bytes32
      const bytes = []
      for (let i = 0; i < 64; i += 2) {
        const code = parseInt(data.slice(i, i + 2), 16)
        if (code === 0) break
        bytes.push(code)
      }
      return String.fromCharCode(...bytes)
    }
    const offset = Number(BigInt('0x' + data.slice(0, 64)))
    const start = offset * 2
    const len = Number(BigInt('0x' + data.slice(start, start + 64)))
    const strHex = data.slice(start + 64, start + 64 + len * 2)
    let out = ''
    for (let i = 0; i < strHex.length; i += 2) {
      out += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16))
    }
    return out || null
  } catch {
    return null
  }
}

function formatUnits(value, decimals) {
  const neg = value < 0n
  const v = neg ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = v % base
  let fracStr = frac.toString().padStart(decimals, '0')
  fracStr = fracStr.replace(/0+$/, '')
  const num = fracStr ? `${whole}.${fracStr}` : whole.toString()
  return neg ? `-${num}` : num
}

async function ethCall(provider, to, data) {
  return provider.request({
    method: 'eth_call',
    params: [{ to, data }, 'latest'],
  })
}

async function publicEthCall(to, data) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to, data }, 'latest'],
  }
  let lastErr
  for (const rpc of ARC_RPC_URLS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message || 'RPC error')
      return json.result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('All RPCs failed')
}

/**
 * Read USDC balance using eth_call (wallet provider preferred, public RPC fallback).
 * Also reads eth_getBalance (native) for diagnostics — CafePay pays with ERC-20 USDC.
 */
export async function fetchWalletUsdcBalance(ownerAddress) {
  if (!ownerAddress) return null

  const balanceData = BALANCE_OF_SELECTOR + padAddress(ownerAddress)
  const provider = typeof window !== 'undefined' ? window.ethereum : null

  let rawHex
  let decimalsHex
  let symbolHex
  let nativeHex = null

  try {
    if (provider?.request) {
      ;[rawHex, decimalsHex, symbolHex, nativeHex] = await Promise.all([
        ethCall(provider, USDC_ADDRESS, balanceData),
        ethCall(provider, USDC_ADDRESS, DECIMALS_SELECTOR).catch(() => null),
        ethCall(provider, USDC_ADDRESS, SYMBOL_SELECTOR).catch(() => null),
        provider
          .request({ method: 'eth_getBalance', params: [ownerAddress, 'latest'] })
          .catch(() => null),
      ])
    } else {
      ;[rawHex, decimalsHex, symbolHex] = await Promise.all([
        publicEthCall(USDC_ADDRESS, balanceData),
        publicEthCall(USDC_ADDRESS, DECIMALS_SELECTOR).catch(() => null),
        publicEthCall(USDC_ADDRESS, SYMBOL_SELECTOR).catch(() => null),
      ])
    }
  } catch (err) {
    console.error('Balance eth_call failed:', err)
    // Public RPC only for USDC
    try {
      rawHex = await publicEthCall(USDC_ADDRESS, balanceData)
      decimalsHex = await publicEthCall(USDC_ADDRESS, DECIMALS_SELECTOR).catch(() => null)
      symbolHex = await publicEthCall(USDC_ADDRESS, SYMBOL_SELECTOR).catch(() => null)
    } catch (e2) {
      console.error('Public USDC balance failed:', e2)
      return null
    }
  }

  const raw = decodeUint(rawHex)
  let decimals = 6
  if (decimalsHex) {
    try {
      decimals = Number(decodeUint(decimalsHex))
    } catch {
      decimals = 6
    }
  }

  const symbol = decodeString(symbolHex) || 'USDC'
  const formatted = formatUnits(raw, decimals)

  let nativeFormatted = null
  if (nativeHex != null) {
    try {
      // Arc native often also USDC with 18 decimals
      nativeFormatted = formatUnits(decodeUint(nativeHex), 18)
    } catch {
      nativeFormatted = null
    }
  }

  return {
    value: raw,
    decimals,
    symbol,
    formatted,
    nativeFormatted,
    source: provider ? 'wallet-eth_call' : 'public-rpc',
  }
}
