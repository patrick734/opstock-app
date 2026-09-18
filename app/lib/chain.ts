import { createPublicClient, http, defineChain } from 'viem'

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
    public:  { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' },
  },
})

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http('https://rpc.mainnet.chain.robinhood.com', {
    timeout: 10_000,
    retryCount: 2,
  }),
})

export const CONTRACTS = {
  OPSTOCK:       '0x3b8a62892873243ae18d1731ffd6e646f748ef80' as `0x${string}`,
  ORACLE_READER: '0x0d7e0148fc56b4f6601048ceb75d7904cba72bac' as `0x${string}`,
}

export const TOKENS = {
  USDG: { address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`, decimals: 6,  symbol: 'USDG' },
  NVDA: { address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' as `0x${string}`, decimals: 18, symbol: 'NVDA' },
  AAPL: { address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' as `0x${string}`, decimals: 18, symbol: 'AAPL' },
  TSLA: { address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d' as `0x${string}`, decimals: 18, symbol: 'TSLA' },
  COIN: { address: '0x6330D8C3178a418788dF01a47479c0ce7CCF450b' as `0x${string}`, decimals: 18, symbol: 'COIN' },
  SPY:  { address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C' as `0x${string}`, decimals: 18, symbol: 'SPY'  },
}

export const FEEDS = {
  NVDA: '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15' as `0x${string}`,
  AAPL: '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0' as `0x${string}`,
  TSLA: '0x4A1166a659A55625345e9515b32adECea5547C38' as `0x${string}`,
  COIN: '0xA3a468A452940B7D6b69991207B508c609a98Ef2' as `0x${string}`,
  SPY:  '0x319724394D3A0e3669269846abE664Cd621f9f6A' as `0x${string}`,
  ETH:  '0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9' as `0x${string}`,
}

export const CHAINLINK_ABI = [
  { name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [], outputs: [
    { name: 'roundId',         type: 'uint80'  },
    { name: 'answer',          type: 'int256'  },
    { name: 'startedAt',       type: 'uint256' },
    { name: 'updatedAt',       type: 'uint256' },
    { name: 'answeredInRound', type: 'uint80'  },
  ]},
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

export const OPSTOCK_ABI = [
  { name: 'writeCoveredCall',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'stockToken', type: 'address' }, { name: 'strikePrice', type: 'uint256' }, { name: 'expiry', type: 'uint256' }, { name: 'size', type: 'uint256' }, { name: 'premium', type: 'uint256' }], outputs: [{ name: 'id', type: 'uint256' }] },
  { name: 'writeCashSecuredPut', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'stockToken', type: 'address' }, { name: 'strikePrice', type: 'uint256' }, { name: 'expiry', type: 'uint256' }, { name: 'size', type: 'uint256' }, { name: 'premium', type: 'uint256' }], outputs: [{ name: 'id', type: 'uint256' }] },
  { name: 'writeBinary',         type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'stockToken', type: 'address' }, { name: 'targetPrice', type: 'uint256' }, { name: 'expiry', type: 'uint256' }, { name: 'betSize', type: 'uint256' }, { name: 'optionType', type: 'uint8' }], outputs: [{ name: 'id', type: 'uint256' }] },
  { name: 'buyOption',           type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'buyBinary',           type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'exercise',            type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'expireOption',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'settleBinary',        type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'getOption',           type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'opt', type: 'tuple', components: [
    { name: 'id', type: 'uint256' }, { name: 'optionType', type: 'uint8' }, { name: 'status', type: 'uint8' },
    { name: 'writer', type: 'address' }, { name: 'buyer', type: 'address' }, { name: 'stockToken', type: 'address' },
    { name: 'feed', type: 'address' }, { name: 'strikePrice', type: 'uint256' }, { name: 'expiry', type: 'uint256' },
    { name: 'size', type: 'uint256' }, { name: 'premium', type: 'uint256' }, { name: 'collateral', type: 'uint256' },
    { name: 'isCall', type: 'bool' },
  ]}]},
  { name: 'getBinary',           type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'b', type: 'tuple', components: [
    { name: 'id', type: 'uint256' }, { name: 'optionType', type: 'uint8' }, { name: 'status', type: 'uint8' },
    { name: 'writer', type: 'address' }, { name: 'buyer', type: 'address' }, { name: 'stockToken', type: 'address' },
    { name: 'feed', type: 'address' }, { name: 'strikePrice', type: 'uint256' }, { name: 'targetPrice', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }, { name: 'betSize', type: 'uint256' }, { name: 'payout', type: 'uint256' },
  ]}]},
  { name: 'getCurrentPrice',  type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalOptions',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'totalBinaries',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'supportedTokens',  type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'protocolFeeBps',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

export const SUPPORTED_TOKENS = [
  { symbol: 'NVDA', ...TOKENS.NVDA, feed: FEEDS.NVDA, name: 'NVIDIA' },
  { symbol: 'AAPL', ...TOKENS.AAPL, feed: FEEDS.AAPL, name: 'Apple' },
  { symbol: 'TSLA', ...TOKENS.TSLA, feed: FEEDS.TSLA, name: 'Tesla' },
  { symbol: 'COIN', ...TOKENS.COIN, feed: FEEDS.COIN, name: 'Coinbase' },
  { symbol: 'SPY',  ...TOKENS.SPY,  feed: FEEDS.SPY,  name: 'S&P 500 ETF' },
]

export async function getChainlinkPrice(feed: `0x${string}`): Promise<number> {
  const [roundData, dec] = await Promise.all([
    publicClient.readContract({ address: feed, abi: CHAINLINK_ABI, functionName: 'latestRoundData' }),
    publicClient.readContract({ address: feed, abi: CHAINLINK_ABI, functionName: 'decimals' }),
  ])
  return Number(roundData[1]) / 10 ** dec
}

export async function getTotalOptions(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.OPSTOCK,
      abi: OPSTOCK_ABI,
      functionName: 'totalOptions',
    })
    return Number(result)
  } catch { return 0 }
}

export async function getTotalBinaries(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.OPSTOCK,
      abi: OPSTOCK_ABI,
      functionName: 'totalBinaries',
    })
    return Number(result)
  } catch { return 0 }
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export function shortAddr(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
export async function getProtocolFee(): Promise<number> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.OPSTOCK,
      abi: OPSTOCK_ABI,
      functionName: 'protocolFeeBps',
    })
    return Number(result) / 100
  } catch { return 0.5 }
}
export async function getOpenOptions(fromId: number, toId: number): Promise<number> {
  try {
    let open = 0
    const calls = []
    for (let i = fromId; i < toId; i++) {
      calls.push(
        publicClient.readContract({
          address: CONTRACTS.OPSTOCK,
          abi: OPSTOCK_ABI,
          functionName: 'getOption',
          args: [BigInt(i)],
        })
      )
    }
    const results = await Promise.allSettled(calls)
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const opt = r.value as any
        if (opt.status === 0) open++ // 0 = OPEN
      }
    }
    return open
  } catch { return 0 }
}

export async function getOpenBinaries(fromId: number, toId: number): Promise<number> {
  try {
    let open = 0
    const calls = []
    for (let i = fromId; i < toId; i++) {
      calls.push(
        publicClient.readContract({
          address: CONTRACTS.OPSTOCK,
          abi: OPSTOCK_ABI,
          functionName: 'getBinary',
          args: [BigInt(i)],
        })
      )
    }
    const results = await Promise.allSettled(calls)
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const b = r.value as any
        if (b.status === 0) open++
      }
    }
    return open
  } catch { return 0 }
}
export async function getOptionsInRange(fromId: number, toId: number) {
  const calls = []
  for (let i = fromId; i < toId; i++) {
    calls.push(
      publicClient.readContract({
        address: CONTRACTS.OPSTOCK,
        abi: OPSTOCK_ABI,
        functionName: 'getOption',
        args: [BigInt(i)],
      }).catch(() => null)
    )
  }
  const results = await Promise.all(calls)
  return results.filter(Boolean)
}

export async function getBinariesInRange(fromId: number, toId: number) {
  const calls = []
  for (let i = fromId; i < toId; i++) {
    calls.push(
      publicClient.readContract({
        address: CONTRACTS.OPSTOCK,
        abi: OPSTOCK_ABI,
        functionName: 'getBinary',
        args: [BigInt(i)],
      }).catch(() => null)
    )
  }
  const results = await Promise.all(calls)
  return results.filter(Boolean)
}

export async function getProtocolStats(): Promise<{ totalVolume: number; totalPremiums: number }> {
  try {
    const block = await publicClient.getBlockNumber()
    const logs  = await publicClient.getLogs({
      address: CONTRACTS.OPSTOCK,
      fromBlock: 66400000n,
      toBlock: block,
    })

    // Count OptionBought events (topic: OptionBought)
    // topic0 for OptionBought from our contract
    const OPTION_BOUGHT  = '0x' // will update after first buy
    const BINARY_SETTLED = '0x' // will update after first settle

    return {
      totalVolume:   logs.length,
      totalPremiums: 0,
    }
  } catch { return { totalVolume: 0, totalPremiums: 0 } }
}
