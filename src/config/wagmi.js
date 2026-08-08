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

export const CONTRACT_ADDRESS = '0x7315a3321fb8935f51Bb6AB6fB51302B266eD5c4'

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
      { name: '_isFamous', type: 'bool' },
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
      { name: '_tableNumber', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'payMonthlyFee',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawFees',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isShopActive',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getSubscriptionStatus',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'expiry', type: 'uint256' },
      { name: 'secondsRemaining', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getShopDetails',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [
      { name: 'shopName', type: 'string' },
      { name: 'ownerAddress', type: 'address' },
      { name: 'exists', type: 'bool' },
      { name: 'active', type: 'bool' },
      { name: 'subscriptionExpiry', type: 'uint256' },
      { name: 'itemCount', type: 'uint256' },
      { name: 'totalOrders', type: 'uint256' },
    ],
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
          { name: 'isFamous', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getActiveMenu',
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
          { name: 'isFamous', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getMenuItem',
    stateMutability: 'view',
    inputs: [
      { name: '_shopOwner', type: 'address' },
      { name: '_itemIndex', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'isFamous', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getMenuItemCount',
    stateMutability: 'view',
    inputs: [{ name: '_shopOwner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
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
      { name: 'subscriptionExpiry', type: 'uint256' },
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
    name: 'getTotalShopCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getShopOrderIds',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getBuyerOrderIds',
    stateMutability: 'view',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getOrderDetails',
    stateMutability: 'view',
    inputs: [{ name: '_orderId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'orderId', type: 'uint256' },
          { name: 'buyer', type: 'address' },
          { name: 'shopOwner', type: 'address' },
          { name: 'itemId', type: 'uint256' },
          { name: 'itemName', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'tableNumber', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  { type: 'function', name: 'orderCounter', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
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
  'function addItem(string _name, uint256 _price, bool _isFamous)',
  'function buyItem(address _shopOwner, uint256 _itemIndex, uint256 _tableNumber) returns (uint256)',
  'function payMonthlyFee()',
  'function withdrawFees(uint256 _amount)',
  'function isShopActive(address _owner) view returns (bool)',
  'function getSubscriptionStatus(address _owner) view returns (bool active, uint256 expiry, uint256 secondsRemaining)',
  'function getShopDetails(address _owner) view returns (string shopName, address ownerAddress, bool exists, bool active, uint256 subscriptionExpiry, uint256 itemCount, uint256 totalOrders)',
  'function getShopMenu(address _shopOwner) view returns (tuple(uint256 id, string name, uint256 price, bool active, bool isFamous)[])',
  'function getActiveMenu(address _shopOwner) view returns (tuple(uint256 id, string name, uint256 price, bool active, bool isFamous)[])',
  'function getMenuItem(address _shopOwner, uint256 _itemIndex) view returns (tuple(uint256 id, string name, uint256 price, bool active, bool isFamous))',
  'function getMenuItemCount(address _shopOwner) view returns (uint256)',
  'function shops(address) view returns (string shopName, address ownerAddress, bool exists, uint256 subscriptionExpiry)',
  'function getAllShops() view returns (address[])',
  'function getTotalShopCount() view returns (uint256)',
  'function getShopOrderIds(address _owner) view returns (uint256[])',
  'function getBuyerOrderIds(address _buyer) view returns (uint256[])',
  'function getOrderDetails(uint256 _orderId) view returns (tuple(uint256 orderId, address buyer, address shopOwner, uint256 itemId, string itemName, uint256 price, uint256 tableNumber, uint256 timestamp))',
  'function orderCounter() view returns (uint256)',
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
