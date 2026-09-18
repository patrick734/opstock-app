const { createPublicClient, http } = require('viem')
const client = createPublicClient({
  chain: { id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } },
  transport: http('https://rpc.mainnet.chain.robinhood.com')
})

async function main() {
  const block = await client.getBlockNumber()
  console.log('Current block:', block.toString())

  // OptionWritten event topic
  const OPSTOCK = '0x3b8a62892873243ae18d1731ffd6e646f748ef80'

  const logs = await client.getLogs({
    address: OPSTOCK,
    fromBlock: block - 100000n,
    toBlock: block,
  })

  console.log('Total events:', logs.length)
  logs.forEach(l => {
    console.log('Topic0:', l.topics[0]?.slice(0,20), '| Block:', l.blockNumber.toString())
  })
}
main().catch(console.error)
