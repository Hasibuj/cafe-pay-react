import { http, createConfig, injected } from 'wagmi'
import { defineChain } from 'viem'
import { mainnet } from 'wagmi/chains'

export const arcTestnet = defineChain({
  id: 0x4cef52,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.blockdaemon.testnet.arc.io', 'https://rpc.drpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

export const CONTRACT_ADDRESS = '0xF83506D10f4416953a6b7CF4cdC5a970CE49B52e'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

export const ABI_CAFEPAY = [
  'function registerShop(string memory _shopName) external',
  'function addItem(string memory _name, uint256 _price) external',
  'function buyItem(address _shopOwner, uint256 _itemIndex) external',
  'function getShopMenu(address _shopOwner) external view returns (tuple(uint256 id, string name, uint256 price, bool active)[])',
  'function shops(address) external view returns (string shopName, address ownerAddress, bool exists)',
  'function getAllShops() external view returns (address[] memory)',
]

export const ABI_ERC20 = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

export const config = createConfig({
  chains: [arcTestnet, mainnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
})
