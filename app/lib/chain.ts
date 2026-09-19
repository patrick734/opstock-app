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
  { symbol: 'NVDA',  address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' as `0x${string}`, decimals: 18, feed: '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15' as `0x${string}`, name: 'NVIDIA' },
  { symbol: 'AAPL',  address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' as `0x${string}`, decimals: 18, feed: '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0' as `0x${string}`, name: 'Apple' },
  { symbol: 'TSLA',  address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d' as `0x${string}`, decimals: 18, feed: '0x4A1166a659A55625345e9515b32adECea5547C38' as `0x${string}`, name: 'Tesla' },
  { symbol: 'COIN',  address: '0x6330D8C3178a418788dF01a47479c0ce7CCF450b' as `0x${string}`, decimals: 18, feed: '0xA3a468A452940B7D6b69991207B508c609a98Ef2' as `0x${string}`, name: 'Coinbase' },
  { symbol: 'SPY',   address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C' as `0x${string}`, decimals: 18, feed: '0x319724394D3A0e3669269846abE664Cd621f9f6A' as `0x${string}`, name: 'S&P 500 ETF' },
  { symbol: 'AMZN',  address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54' as `0x${string}`, decimals: 18, feed: '0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C' as `0x${string}`, name: 'Amazon' },
  { symbol: 'MSFT',  address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74' as `0x${string}`, decimals: 18, feed: '0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E' as `0x${string}`, name: 'Microsoft' },
  { symbol: 'GOOGL', address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3' as `0x${string}`, decimals: 18, feed: '0xF6f373a037c30F0e5010d854385cA89185AE638b' as `0x${string}`, name: 'Alphabet' },
  { symbol: 'META',  address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35' as `0x${string}`, decimals: 18, feed: '0x7C38C00C30BEe9378381E7B6135d7283356D71b1' as `0x${string}`, name: 'Meta' },
  { symbol: 'MSTR',  address: '0xec262a75e413fAfD0dF80480274532C79D42da09' as `0x${string}`, decimals: 18, feed: '0x396118bdFB181e6240E74D243F266B061c0edc3D' as `0x${string}`, name: 'MicroStrategy' },
  { symbol: 'AMD',   address: '0x86923f96303D656E4aa86D9d42D1e57ad2023fdC' as `0x${string}`, decimals: 18, feed: '0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72' as `0x${string}`, name: 'AMD' },
  { symbol: 'PLTR',  address: '0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A' as `0x${string}`, decimals: 18, feed: '0x820ABedFF239034956B7A9d2F0a331f9F075eB4c' as `0x${string}`, name: 'Palantir' },
  { symbol: 'ORCL',  address: '0xb0992820E760d836549ba69BC7598b4af75dEE03' as `0x${string}`, decimals: 18, feed: '0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844' as `0x${string}`, name: 'Oracle' },
  { symbol: 'TSM',   address: '0x58FfE4a942d3885bAa22D7520691F611EF09e7AA' as `0x${string}`, decimals: 18, feed: '0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F' as `0x${string}`, name: 'TSMC' },
  { symbol: 'GME',   address: '0x1b0E319c6A659F002271B69dB8A7df2F911c153E' as `0x${string}`, decimals: 18, feed: '0x27C71df6A64fB476468EdF256CF72c038baB5B67' as `0x${string}`, name: 'GameStop' },
  { symbol: 'INTC',  address: '0xc72b96e0E48ecd4DC75E1e45396e26300BC39681' as `0x${string}`, decimals: 18, feed: '0x3f390C5C24628Ac7C489515402235FeAD71D1913' as `0x${string}`, name: 'Intel' },
  { symbol: 'ASML',  address: '0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA' as `0x${string}`, decimals: 18, feed: '0xB4106147E8cce40b7d46124090d373A71b70f87D' as `0x${string}`, name: 'ASML' },
  { symbol: 'IONQ',  address: '0x558378E000D634A36593E338eBacdd6207640EfE' as `0x${string}`, decimals: 18, feed: '0x22EfeC4919baf55F360E0EDee4AbEB26DE4971eb' as `0x${string}`, name: 'IonQ' },
  { symbol: 'RKLB',  address: '0x3b14C39E89D60D627b42a1A4CA45b5bb45Fc12e2' as `0x${string}`, decimals: 18, feed: '0x045477BF65Aef6f4F2386ad0164579e48381CC74' as `0x${string}`, name: 'Rocket Lab' },
  { symbol: 'QQQ',   address: '0xD5f3879160bc7c32ebb4dC785F8a4F505888de68' as `0x${string}`, decimals: 18, feed: '0x80901d846d5D7B030F26B480776EE3b29374C2ae' as `0x${string}`, name: 'Nasdaq ETF' },
  { symbol: 'BABA',  address: '0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4' as `0x${string}`, decimals: 18, feed: '0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984' as `0x${string}`, name: 'Alibaba' },
  { symbol: 'DELL',  address: '0x941AE714EC6D8130c7B75d67160Ca08f1e7d11Dd' as `0x${string}`, decimals: 18, feed: '0x1C6c8cADBe02E19129c39dDB92281cE4c0bf206b' as `0x${string}`, name: 'Dell' },
  { symbol: 'SLV',   address: '0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f' as `0x${string}`, decimals: 18, feed: '0x209b73908e92Ae021826eD79609845451Ecba2ce' as `0x${string}`, name: 'Silver ETF' },
  { symbol: 'USO',   address: '0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344' as `0x${string}`, decimals: 18, feed: '0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c' as `0x${string}`, name: 'Oil ETF' },
  { symbol: 'SGOV',  address: '0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5' as `0x${string}`, decimals: 18, feed: '0xa0DF4ee0fFf975306345875E3548Fcc519577A11' as `0x${string}`, name: 'T-Bill ETF' },
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
