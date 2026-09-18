const { createPublicClient, http } = require('viem')
const client = createPublicClient({
  chain: { id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } },
  transport: http('https://rpc.mainnet.chain.robinhood.com')
})

async function main() {
  const block = await client.getBlockNumber()
  const OPSTOCK = '0x3b8a62892873243ae18d1731ffd6e646f748ef80'

  // Get ALL events from contract since deployment
  const logs = await client.getLogs({
    address: OPSTOCK,
    fromBlock: 66400000n,
    toBlock: block,
  })

  console.log('Total events:', logs.length)

  // Get unique topics
  const topics = {}
  logs.forEach(l => {
    const t = l.topics[0]
    if (!topics[t]) topics[t] = 0
    topics[t]++
  })

  console.log('\nEvent topics:')
  Object.entries(topics).forEach(([t, count]) => {
    console.log(count, 'x', t)
  })

  console.log('\nAll logs:')
  logs.forEach(l => {
    console.log('Block:', l.blockNumber.toString(), '| Topic:', l.topics[0])
    console.log('  Data:', l.data?.slice(0,100))
  })
}
main().catch(console.error)
