import { publicClient, CONTRACTS } from './chain'

const TOPICS = {
  OptionWritten:  '0x25516c5ff17911f06dbbf45e79fbefda33e86df523f8654a2ee1bd7641b3b331',
  OptionBought:   '0x23ad4783d95ee2d3730fae4843757e102bd28a58ef48e2c6f8fe93aef120f5fb',
  OptionExercised:'0x4596c154c182e8f70aa23d7334caf575c608e8bb46b16ba48782961cbca9312e',
  OptionExpired:  '0x04d03607ff2d12a2aef0938dbebbfbb423182f741164e646928a49a5a728f9c6',
  BinaryWritten:  '0x977b631a7f29d6fac8bcc3073bd01257f860a65b05a250fc9e191356c1514f17',
  BinaryBought:   '0x7bdfe84db6781934b8971b9ddab1a210aba73bac90a681cb0323bed6bba49053',
  BinarySettled:  '0x616dab1668f6671dadee33f17778b963c91d6f716f771afacdb4d3bfa763978f',
  VaultDeposit:   '0x2790b90165fd3973ad7edde4eca71b4f8808dd4857a2a3a3e8ae5642a5cb196e',
  VaultWithdraw:  '0xc44aeefa68e8b9c1ad5f7be4b0dd194580f81f5c362862e72196503a320eb7a1',
}

const DEPLOY_BLOCK = 66406900n

export interface ProtocolStats {
  totalOptionsWritten: number
  totalOptionsBought:  number
  totalBinariesWritten: number
  totalBinariesSettled: number
  totalVaultDeposits:  number
  totalPremiumsUSDG:   number
  totalVolumeUSDG:     number
}

export interface WalletStats {
  optionsWritten:  number
  optionsBought:   number
  binariesWritten: number
  binariesTaken:   number
  vaultDeposited:  number
  premiumsEarned:  number
}

async function getAllLogs() {
  try {
    const block = await publicClient.getBlockNumber()
    const logs  = await publicClient.getLogs({
      address: CONTRACTS.OPSTOCK as `0x${string}`,
      fromBlock: DEPLOY_BLOCK,
      toBlock: block,
    })
    return logs
  } catch { return [] }
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  const logs = await getAllLogs()

  let totalOptionsWritten  = 0
  let totalOptionsBought   = 0
  let totalBinariesWritten = 0
  let totalBinariesSettled = 0
  let totalVaultDeposits   = 0
  let totalPremiumsUSDG    = 0
  let totalVolumeUSDG      = 0

  for (const log of logs) {
    const topic = log.topics[0]
    switch(topic) {
      case TOPICS.OptionWritten:
        totalOptionsWritten++
        // premium is last param in data — 6 decimals USDG
        try {
          const data  = log.data.slice(2)
          const prem  = BigInt('0x' + data.slice(data.length - 64))
          totalPremiumsUSDG += Number(prem) / 1e6
        } catch {}
        break
      case TOPICS.OptionBought:
        totalOptionsBought++
        try {
          const data = log.data.slice(2)
          const prem = BigInt('0x' + data.slice(data.length - 64))
          totalVolumeUSDG += Number(prem) / 1e6
        } catch {}
        break
      case TOPICS.BinaryWritten:  totalBinariesWritten++; break
      case TOPICS.BinarySettled:  totalBinariesSettled++; break
      case TOPICS.VaultDeposit:   totalVaultDeposits++;   break
    }
  }

  return {
    totalOptionsWritten,
    totalOptionsBought,
    totalBinariesWritten,
    totalBinariesSettled,
    totalVaultDeposits,
    totalPremiumsUSDG,
    totalVolumeUSDG,
  }
}

export async function getWalletStats(wallet: string): Promise<WalletStats> {
  const logs = await getAllLogs()
  const w    = wallet.toLowerCase()

  let optionsWritten  = 0
  let optionsBought   = 0
  let binariesWritten = 0
  let binariesTaken   = 0
  let vaultDeposited  = 0
  let premiumsEarned  = 0

  for (const log of logs) {
    const topic = log.topics[0]
    // writer is topics[1] for OptionWritten and BinaryWritten
    // buyer is topics[1] for OptionBought and BinaryBought
    const indexed1 = ('0x' + (log.topics[1]?.slice(26) || '')).toLowerCase()
    const indexed2 = ('0x' + (log.topics[2]?.slice(26) || '')).toLowerCase()

    switch(topic) {
      case TOPICS.OptionWritten:
        if (indexed2 === w) {
          optionsWritten++
          try {
            const data = log.data.slice(2)
            const prem = BigInt('0x' + data.slice(data.length - 64))
            premiumsEarned += Number(prem) / 1e6
          } catch {}
        }
        break
      case TOPICS.OptionBought:
        if (indexed1 === w) optionsBought++
        break
      case TOPICS.BinaryWritten:
        if (indexed2 === w) binariesWritten++
        break
      case TOPICS.BinaryBought:
        if (indexed1 === w) binariesTaken++
        break
      case TOPICS.VaultDeposit:
        if (indexed1 === w) vaultDeposited++
        break
    }
  }

  return { optionsWritten, optionsBought, binariesWritten, binariesTaken, vaultDeposited, premiumsEarned }
}
