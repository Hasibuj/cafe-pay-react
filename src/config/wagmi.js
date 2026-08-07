import { http, createConfig, injected } from 'wagmi'
import { defineChain } from 'viem'

/** Arc Testnet — CafePay + USDC payments */
export const arcTestnet = defineChain({
  id: 0x4cef52,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.blockdaemon.testnet.arc.io',
        'https://rpc.drpc.testnet.arc.io',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

export const ARC_RPC_URLS = [
  'https://rpc.blockdaemon.testnet.arc.io',
  'https://rpc.drpc.testnet.arc.io',
]

export const CONTRACT_ADDRESS = '0xF83506D10f4416953a6b7CF4cdC5a970CE49B52e'

/** CafePay contract hardcodes this USDC (6 decimals for menu prices). */
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

/**
 * JSON ABI matching the deployed CafePay contract.
 * View methods work via public RPC without a connected wallet.
 */
export const ABI_CAFEPAY = [
  {
    type: 'function',
    name: 'registerShop',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_shopName', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'addItem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_price', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'buyItem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_shopOwner', type: 'address' },
      { name: '_itemIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getShopMenu',
    stateMutability: 'view',
    inputs: [{ name: '_shopOwner', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'shops',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'shopName', type: 'string' },
      { name: 'ownerAddress', type: 'address' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getAllShops',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'allShops',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
]

/** Minimal ERC-20 used by CafePay.buyItem → transferFrom */
export const ABI_ERC20 = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
]

/** Human-readable fragments for ethers.Contract when needed */
export const ABI_CAFEPAY_ETHERS = [
  'function registerShop(string _shopName)',
  'function addItem(string _name, uint256 _price)',
  'function buyItem(address _shopOwner, uint256 _itemIndex)',
  'function getShopMenu(address _shopOwner) view returns (tuple(uint256 id, string name, uint256 price, bool active)[])',
  'function shops(address) view returns (string shopName, address ownerAddress, bool exists)',
  'function getAllShops() view returns (address[])',
]

export const ABI_ERC20_ETHERS = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arcTestnet.id]: http(ARC_RPC_URLS[0], {
      batch: true,
      retryCount: 2,
    }),
  },
  ssr: false,
})
