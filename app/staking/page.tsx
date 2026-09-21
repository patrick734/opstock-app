'use client'

import { useState, useEffect, useCallback } from 'react'
import { createWalletClient, custom, parseUnits, formatUnits } from 'viem'
import { publicClient, robinhoodChain, CONTRACTS, formatUSD } from '../lib/chain'

const STAKING_ADDRESS = '0x3C110398D728f54b3B36593d0e3368AA06A787CC' as `0x${string}`
const OPST_ADDRESS    = '0xf4f297a6BC55Ae3c71F704290E74b1A5ED4D3226' as `0x${string}`
const USDG_ADDRESS    = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`

const STAKING_ABI = [
  { name: 'stake',           type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'unstake',         type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claim',           type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unstakeAndClaim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'depositRewards',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'earned',          type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'stakes',          type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'amount', type: 'uint256' }, { name: 'unlockTime', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }, { name: 'pending', type: 'uint256' }] },
  { name: 'totalStaked',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'rewardPerTokenStored', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

function getProvider() {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.okxwallet || w.ethereum || null
}

async function getWalletClient() {
  const p = getProvider()
  if (!p) return null
  return createWalletClient({ chain: robinhoodChain, transport: custom(p) })
}

function fmt(n: bigint | undefined | null, decimals: number = 18, display: number = 4): string {
  if (!n && n !== 0n) return '0.0000'
  try { return parseFloat(formatUnits(n, decimals)).toFixed(display) } catch { return '0.0000' }
}

function timeLeft(unlockTime: bigint | undefined): string {
  if (!unlockTime) return '—'
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (unlockTime <= now) return 'Unlocked'
  const diff = Number(unlockTime - now)
  const days = Math.floor(diff / 86400)
  const hrs  = Math.floor((diff % 86400) / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  if (days > 0) return `${days}d ${hrs}h remaining`
  if (hrs > 0)  return `${hrs}h ${mins}m remaining`
  return `${mins}m remaining`
}

export default function Staking() {
  const [wallet, setWallet]         = useState<string | null>(null)
  const [stakeAmount, setStakeAmt]  = useState('')
  const [opstBalance, setOpstBal]   = useState<bigint>(0n)
  const [usdgBalance, setUsdgBal]   = useState<bigint>(0n)
  const [stakeInfo, setStakeInfo]   = useState<{ amount: bigint; unlockTime: bigint; rewardDebt: bigint; pending: bigint } | null>(null)
  const [earned, setEarned]         = useState<bigint>(0n)
  const [totalStaked, setTotal]     = useState<bigint>(0n)
  const [txHash, setTxHash]         = useState<string | null>(null)
  const [txError, setTxError]       = useState<string | null>(null)
  const [txLoad, setTxLoad]         = useState(false)
  const [tab, setTab]               = useState<'stake' | 'unstake'>('stake')

  useEffect(() => {
    const p = getProvider(); if (!p) return
    p.request({ method: 'eth_accounts' }).then((a: string[]) => { if (a[0]) setWallet(a[0]) })
    p.on('accountsChanged', (a: string[]) => setWallet(a[0] || null))
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [total] = await Promise.all([
        publicClient.readContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'totalStaked' }),
      ])
      setTotal(total as bigint)
    } catch {}

    if (!wallet) return
    try {
      const [opstBal, usdgBal, info, earnedAmt] = await Promise.all([
        publicClient.readContract({ address: OPST_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet as `0x${string}`] }),
        publicClient.readContract({ address: USDG_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet as `0x${string}`] }),
        publicClient.readContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stakes', args: [wallet as `0x${string}`] }),
        publicClient.readContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'earned', args: [wallet as `0x${string}`] }),
      ])
      setOpstBal(opstBal as bigint)
      setUsdgBal(usdgBal as bigint)
      setStakeInfo(info as any)
      setEarned(earnedAmt as bigint)
    } catch {}
  }, [wallet])

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv) }, [fetchData])

  async function doStake() {
    if (!wallet || !stakeAmount) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc  = await getWalletClient(); if (!wc) throw new Error('No wallet')
      const amt = parseUnits(stakeAmount, 18)
      await wc.writeContract({ address: OPST_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [STAKING_ADDRESS, amt], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [amt], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setStakeAmt(''); setTimeout(fetchData, 3000)
    } catch(e: any) { setTxError(e.message?.slice(0,120) || 'Failed') }
    setTxLoad(false)
  }

  async function doUnstakeAndClaim() {
    if (!wallet) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient(); if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'unstakeAndClaim', args: [], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setTimeout(fetchData, 3000)
    } catch(e: any) { setTxError(e.message?.slice(0,120) || 'Failed') }
    setTxLoad(false)
  }

  async function doClaim() {
    if (!wallet) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient(); if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'claim', args: [], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setTimeout(fetchData, 3000)
    } catch(e: any) { setTxError(e.message?.slice(0,120) || 'Failed') }
    setTxLoad(false)
  }

  async function connectWallet() {
    const p = getProvider()
    if (!p) { alert('Install OKX Wallet or MetaMask'); return }
    const accounts = await p.request({ method: 'eth_requestAccounts' })
    setWallet(accounts[0])
  }

  const canUnstake = stakeInfo && stakeInfo.amount > 0n && BigInt(Math.floor(Date.now()/1000)) >= stakeInfo.unlockTime
  const isLocked   = stakeInfo && stakeInfo.amount > 0n && BigInt(Math.floor(Date.now()/1000)) < stakeInfo.unlockTime

  const S = {
    page:  { background: '#020204', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#d0d8e8' },
    card:  { background: '#060810', border: '1px solid #0e1220', padding: '20px' },
    label: { display: 'block' as const, fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', fontSize: '16px', borderRadius: '0', background: '#020204', border: '1px solid #151c2e', color: '#d0d8e8', fontFamily: 'inherit', outline: 'none' },
    row:   { display: 'flex' as const, justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0e1220', fontSize: '12px' },
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #0e1220', background: '#060810', padding: '0 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/app" style={{ color: '#3a4a5a', fontSize: '10px', textDecoration: 'none', letterSpacing: '0.08em' }}>← BACK</a>
            <span style={{ color: '#0e1220' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#00ff41', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
              <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.15em', color: '#00ff41' }}>OPSTOCK</span>
              <span style={{ color: '#3a4a5a', fontSize: '11px' }}>/ STAKING</span>
            </div>
          </div>
          {wallet ? (
            <span style={{ fontSize: '10px', color: '#ffb000', border: '1px solid rgba(255,176,0,0.3)', padding: '4px 10px' }}>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
          ) : (
            <button onClick={connectWallet} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff41', color: '#00ff41', padding: '6px 16px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.12em', fontWeight: 700 }}>CONNECT →</button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.15em', marginBottom: '4px' }}>// $OPST STAKING</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Stake $OPST. Earn USDG.</div>
          <div style={{ fontSize: '12px', color: '#5a6a7a' }}>50% of all protocol fees distributed to stakers. 7 day lock period.</div>
        </div>

        {/* Protocol stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', marginBottom: '20px', background: '#0e1220', border: '1px solid #0e1220' }}>
          {[
            ['TOTAL STAKED', fmt(totalStaked) + ' $OPST'],
            ['LOCK PERIOD', '7 DAYS'],
            ['FEE SHARE', '50% TO STAKERS'],
            ['REWARD TOKEN', 'USDG'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#060810', padding: '16px 14px' }}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: label === 'FEE SHARE' ? '#00ff41' : '#d0d8e8' }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Left — Stake/Unstake */}
          <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>

            {/* Tab */}
            <div style={{ display: 'flex', gap: '2px', background: '#0e1220' }}>
              <button onClick={() => setTab('stake')} style={{ flex: 1, padding: '10px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: tab === 'stake' ? 'rgba(0,255,65,0.08)' : '#060810', color: tab === 'stake' ? '#00ff41' : '#3a4a5a', letterSpacing: '0.1em', fontWeight: tab === 'stake' ? 700 : 400 }}>STAKE</button>
              <button onClick={() => setTab('unstake')} style={{ flex: 1, padding: '10px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: tab === 'unstake' ? 'rgba(255,51,51,0.08)' : '#060810', color: tab === 'unstake' ? '#ff3333' : '#3a4a5a', letterSpacing: '0.1em', fontWeight: tab === 'unstake' ? 700 : 400 }}>UNSTAKE</button>
            </div>

            {tab === 'stake' && (
              <div style={S.card}>
                <label style={S.label}>AMOUNT ($OPST)</label>
                <input type="number" value={stakeAmount} onChange={e => setStakeAmt(e.target.value)} placeholder="0.00" style={S.input}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '9px', color: '#3a4a5a' }}>Balance: {fmt(opstBalance)} $OPST</span>
                  <button onClick={() => setStakeAmt(fmt(opstBalance, 18, 6))} style={{ fontSize: '9px', color: '#00ff41', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>MAX</button>
                </div>
                <div style={{ fontSize: '10px', color: '#3a4a5a', padding: '10px', background: '#020204', border: '1px solid #0e1220', marginBottom: '16px', lineHeight: 1.6 }}>
                  Your $OPST will be locked for <span style={{ color: '#ffb000' }}>7 days</span>. Claim USDG rewards anytime. Unstake after lock expires.
                </div>
                <button onClick={doStake} disabled={txLoad || !wallet || !stakeAmount}
                  style={{ width: '100%', padding: '13px', fontSize: '11px', fontFamily: 'inherit', letterSpacing: '0.12em', fontWeight: 700, cursor: txLoad || !wallet || !stakeAmount ? 'not-allowed' : 'pointer', background: wallet && stakeAmount ? 'rgba(0,255,65,0.1)' : 'rgba(60,60,60,0.2)', color: wallet && stakeAmount ? '#00ff41' : '#3a4a5a', border: `1px solid ${wallet && stakeAmount ? '#00ff41' : '#0e1220'}` }}>
                  {txLoad ? 'SUBMITTING...' : !wallet ? 'CONNECT WALLET' : `STAKE ${stakeAmount || '?'} $OPST →`}
                </button>
              </div>
            )}

            {tab === 'unstake' && (
              <div style={S.card}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={S.label}>YOUR STAKE</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: stakeInfo && stakeInfo.amount > 0n ? '#d0d8e8' : '#3a4a5a' }}>
                    {stakeInfo ? fmt(stakeInfo.amount) : '0.0000'} $OPST
                  </div>
                  {stakeInfo && stakeInfo.amount > 0n && (
                    <div style={{ fontSize: '10px', color: canUnstake ? '#00ff41' : '#ffb000', marginTop: '4px' }}>
                      {canUnstake ? '✓ Unlocked — ready to unstake' : timeLeft(stakeInfo.unlockTime)}
                    </div>
                  )}
                </div>

                {isLocked && (
                  <div style={{ padding: '12px', background: 'rgba(255,176,0,0.05)', border: '1px solid rgba(255,176,0,0.15)', fontSize: '10px', color: '#ffb000', marginBottom: '16px', lineHeight: 1.6 }}>
                    ⏳ Still locked. You can claim rewards now but must wait to unstake.
                  </div>
                )}

                <div style={{ display: 'grid', gap: '8px' }}>
                  <button onClick={doClaim} disabled={txLoad || !wallet || earned === 0n}
                    style={{ width: '100%', padding: '12px', fontSize: '11px', fontFamily: 'inherit', letterSpacing: '0.12em', fontWeight: 700, cursor: txLoad || !wallet || earned === 0n ? 'not-allowed' : 'pointer', background: earned > 0n ? 'rgba(0,136,255,0.1)' : 'rgba(60,60,60,0.2)', color: earned > 0n ? '#0088ff' : '#3a4a5a', border: `1px solid ${earned > 0n ? '#0088ff' : '#0e1220'}` }}>
                    {txLoad ? 'SUBMITTING...' : `CLAIM ${fmt(earned, 6)} USDG`}
                  </button>
                  <button onClick={doUnstakeAndClaim} disabled={txLoad || !wallet || !canUnstake}
                    style={{ width: '100%', padding: '12px', fontSize: '11px', fontFamily: 'inherit', letterSpacing: '0.12em', fontWeight: 700, cursor: txLoad || !wallet || !canUnstake ? 'not-allowed' : 'pointer', background: canUnstake ? 'rgba(255,51,51,0.1)' : 'rgba(60,60,60,0.2)', color: canUnstake ? '#ff3333' : '#3a4a5a', border: `1px solid ${canUnstake ? '#ff3333' : '#0e1220'}` }}>
                    {txLoad ? 'SUBMITTING...' : 'UNSTAKE + CLAIM ALL'}
                  </button>
                </div>
              </div>
            )}

            {/* TX status */}
            {(txHash || txError) && (
              <div style={{ padding: '10px 12px', background: txHash ? 'rgba(0,255,65,0.05)' : 'rgba(255,51,51,0.05)', border: `1px solid ${txHash ? 'rgba(0,255,65,0.2)' : 'rgba(255,51,51,0.2)'}`, fontSize: '10px', color: txHash ? '#00ff41' : '#ff3333', wordBreak: 'break-all' }}>
                {txHash ? <>✓ TX: <a href={`https://robinhoodchain.blockscout.com/tx/${txHash}`} target="_blank" rel="noopener" style={{ color: '#0088ff' }}>{txHash.slice(0,24)}...</a></> : <>✗ {txError}</>}
              </div>
            )}
          </div>

          {/* Right — Your stats */}
          <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>

            {/* Rewards card */}
            <div style={{ ...S.card, borderTop: '3px solid #ffb000', textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '8px' }}>// PENDING REWARDS</div>
              <div style={{ fontSize: '44px', fontWeight: 900, color: '#ffb000', marginBottom: '4px', lineHeight: 1 }}>
                {fmt(earned, 6, 6)}
              </div>
              <div style={{ fontSize: '14px', color: '#5a6a7a' }}>USDG earned</div>
            </div>

            {/* Account stats */}
            <div style={S.card}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '12px' }}>// YOUR POSITION</div>
              {[
                ['$OPST Balance', fmt(opstBalance) + ' $OPST'],
                ['USDG Balance', fmt(usdgBalance, 6, 4) + ' USDG'],
                ['Staked', stakeInfo ? fmt(stakeInfo.amount) + ' $OPST' : '0 $OPST'],
                ['Unlock Time', stakeInfo && stakeInfo.amount > 0n ? timeLeft(stakeInfo.unlockTime) : '—'],
                ['Pending USDG', fmt(earned, 6, 6) + ' USDG'],
                ['Status', !wallet ? 'Not connected' : stakeInfo && stakeInfo.amount > 0n ? (canUnstake ? 'Unlocked ✓' : 'Locked 🔒') : 'Not staking'],
              ].map(([k, v]) => (
                <div key={k} style={S.row}>
                  <span style={{ color: '#3a4a5a' }}>{k}</span>
                  <span style={{ color: k === 'Pending USDG' ? '#ffb000' : k === 'Status' && v === 'Unlocked ✓' ? '#00ff41' : '#d0d8e8', fontWeight: k === 'Pending USDG' ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ ...S.card, background: 'rgba(0,255,65,0.02)', borderColor: 'rgba(0,255,65,0.08)' }}>
              <div style={{ fontSize: '9px', color: '#00ff41', letterSpacing: '0.1em', marginBottom: '10px' }}>// HOW IT WORKS</div>
              {[
                '1. Stake $OPST — locked for 7 days',
                '2. Protocol collects 0.5% fee on every trade',
                '3. 50% of fees flow to the staking pool',
                '4. Claim USDG rewards anytime',
                '5. Unstake after 7 days',
              ].map(s => (
                <div key={s} style={{ padding: '6px 0', borderBottom: '1px solid #0e1220', fontSize: '10px', color: '#5a6a7a', lineHeight: 1.5 }}>{s}</div>
              ))}
            </div>

            {/* Contract */}
            <div style={{ fontSize: '9px', color: '#3a4a5a', lineHeight: 1.8 }}>
              <div>Staking: <a href={`https://robinhoodchain.blockscout.com/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener" style={{ color: '#0088ff' }}>{STAKING_ADDRESS}</a></div>
              <div>$OPST: <a href={`https://robinhoodchain.blockscout.com/address/${OPST_ADDRESS}`} target="_blank" rel="noopener" style={{ color: '#0088ff' }}>{OPST_ADDRESS}</a></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
