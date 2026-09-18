const { createPublicClient, http, keccak256, toHex } = require('viem')

// Calculate event topics from our contract
const events = [
  'OptionWritten(uint256,uint8,address,address,uint256,uint256,uint256)',
  'OptionBought(uint256,address,uint256)',
  'OptionExercised(uint256,address,uint256)',
  'OptionExpired(uint256)',
  'BinaryWritten(uint256,uint8,address,address,uint256,uint256,uint256)',
  'BinaryBought(uint256,address)',
  'BinarySettled(uint256,bool,uint256)',
  'VaultDeposit(address,address,uint256)',
  'VaultWithdraw(address,address,uint256)',
]

const { keccak256: k, toBytes } = require('viem')

events.forEach(e => {
  const topic = k(toBytes(e))
  console.log(topic, '|', e.split('(')[0])
})
