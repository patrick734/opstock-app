'use client'

import { useState, useEffect, useCallback } from 'react'
import { createWalletClient, custom, parseUnits, formatUnits } from 'viem'
import { publicClient, robinhoodChain, formatUSD, getChainlinkPrice } from '../lib/chain'

const VAULT_ADDRESS = '0xF854177aB1b6beA2aEe1026136Aa93dF6B95b3B4' as `0x${string}`
const USDG_ADDRESS  = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`

const VAULT_TOKENS = [
  { symbol: 'NVDA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC' as `0x${string}`, feed: '0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15' as `0x${string}`, name: 'NVIDIA' },
  { symbol: 'AAPL', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' as `0x${string}`, feed: '0x6B22A786bAa607d76728168703a39Ea9C99f2cD0' as `0x${string}`, name: 'Apple' },
  { symbol: 'TSLA', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d' as `0x${string}`, feed: '0x4A1166a659A55625345e9515b32adECea5547C38' as `0x${string}`, name: 'Tesla' },
  { symbol: 'COIN', address: '0x6330D8C3178a418788dF01a47479c0ce7CCF450b' as `0x${string}`, feed: '0xA3a468A452940B7D6b69991207B508c609a98Ef2' as `0x${string}`, name: 'Coinbase' },
  { symbol: 'MSFT', address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74' as `0x${string}`, feed: '0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E' as `0x${string}`, name: 'Microsoft' },
  { symbol: 'AMZN', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54' as `0x${string}`, feed: '0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C' as `0x${string}`, name: 'Amazon' },
  { symbol: 'GOOGL',address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3' as `0x${string}`, feed: '0xF6f373a037c30F0e5010d854385cA89185AE638b' as `0x${string}`, name: 'Alphabet' },
  { symbol: 'META', address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35' as `0x${string}`, feed: '0x7C38C00C30BEe9378381E7B6135d7283356D71b1' as `0x${string}`, name: 'Meta' },
]

const VAULT_ABI = [
  { name: 'deposit',          type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw',         type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'claimRewards',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }], outputs: [] },
  { name: 'pendingRewards',   type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'vaults',           type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: 'active', type: 'bool' }, { name: 'totalDeposited', type: 'uint256' }, { name: 'rewardPerShare', type: 'uint256' }, { name: 'lastWriteTime', type: 'uint256' }] },
  { name: 'userInfo',         type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ name: 'amount', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }, { name: 'pendingRewards', type: 'uint256' }] },
] as const

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

function getProvider() {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.okxwallet || w.ethereum || null
}

async function getWC() {
  const p = getProvider(); if (!p) return null
  return createWalletClient({ chain: robinhoodChain, transport: custom(p) })
}

function fmt(n: bigint | undefined, dec = 18, dp = 4) {
  if (!n && n !== 0n) return '0.0000'
  try { return parseFloat(formatUnits(n, dec)).toFixed(dp) } catch { return '0.0000' }
}

export default function VaultPage() {
  const [wallet, setWallet]       = useState<string|null>(null)
  const [prices, setPrices]       = useState<Record<string,number>>({})
  const [selToken, setSel]        = useState(VAULT_TOKENS[0])
  const [amount, setAmount]       = useState('')
  const [wAmount, setWAmount]     = useState('')
  const [mode, setMode]           = useState<'deposit'|'withdraw'>('deposit')
  const [tokenBal, setTokenBal]   = useState<bigint>(0n)
  const [userDep, setUserDep]     = useState<bigint>(0n)
  const [vaultTotal, setVTotal]   = useState<bigint>(0n)
  const [pending, setPending]     = useState<bigint>(0n)
  const [txHash, setTxHash]       = useState<string|null>(null)
  const [txError, setTxError]     = useState<string|null>(null)
  const [txLoad, setTxLoad]       = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const p = getProvider(); if (!p) return
    p.request({ method: 'eth_accounts' }).then((a: string[]) => { if (a[0]) setWallet(a[0]) })
    p.on('accountsChanged', (a: string[]) => setWallet(a[0]||null))
  }, [])

  const fetchPrices = useCallback(async () => {
    const p: Record<string,number> = {}
    await Promise.all(VAULT_TOKENS.map(async t => {
      try { p[t.symbol] = await getChainlinkPrice(t.feed) } catch { p[t.symbol] = 0 }
    }))
    setPrices(p)
    setLoading(false)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const vaultInfo = await publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'vaults', args: [selToken.address] })
      setVTotal((vaultInfo as any)[1])
    } catch {}
    if (!wallet) return
    try {
      const [bal, ui, pen] = await Promise.all([
        publicClient.readContract({ address: selToken.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet as `0x${string}`] }),
        publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'userInfo', args: [selToken.address, wallet as `0x${string}`] }),
        publicClient.readContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'pendingRewards', args: [selToken.address, wallet as `0x${string}`] }),
      ])
      setTokenBal(bal as bigint)
      setUserDep((ui as any)[0])
      setPending(pen as bigint)
    } catch {}
  }, [wallet, selToken])

  useEffect(() => { fetchPrices(); const iv = setInterval(fetchPrices, 30000); return () => clearInterval(iv) }, [fetchPrices])
  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv) }, [fetchData])

  async function doDeposit() {
    if (!wallet || !amount) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWC(); if (!wc) throw new Error('No wallet')
      const amt = parseUnits(amount, 18)
      await wc.writeContract({ address: selToken.address, abi: ERC20_ABI, functionName: 'approve', args: [VAULT_ADDRESS, amt], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'deposit', args: [selToken.address, amt], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setAmount(''); setTimeout(fetchData, 3000)
    } catch(e:any) { setTxError(e.message?.slice(0,120)||'Failed') }
    setTxLoad(false)
  }

  async function doWithdraw() {
    if (!wallet || !wAmount) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWC(); if (!wc) throw new Error('No wallet')
      const amt = parseUnits(wAmount, 18)
      const hash = await wc.writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'withdraw', args: [selToken.address, amt], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setWAmount(''); setTimeout(fetchData, 3000)
    } catch(e:any) { setTxError(e.message?.slice(0,120)||'Failed') }
    setTxLoad(false)
  }

  async function doClaim() {
    if (!wallet) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWC(); if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'claimRewards', args: [selToken.address], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash); setTimeout(fetchData, 3000)
    } catch(e:any) { setTxError(e.message?.slice(0,120)||'Failed') }
    setTxLoad(false)
  }

  async function connect() {
    const p = getProvider(); if (!p) { alert('Install OKX Wallet'); return }
    const a = await p.request({ method: 'eth_requestAccounts' }); setWallet(a[0])
  }

  const spot   = prices[selToken.symbol] || 0
  const depVal = spot && userDep ? parseFloat(formatUnits(userDep, 18)) * spot : 0
  const tvl    = spot && vaultTotal ? parseFloat(formatUnits(vaultTotal, 18)) * spot : 0

  const S = {
    page:  { background: '#020204', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#d0d8e8' },
    card:  { background: '#060810', border: '1px solid #0e1220', padding: '20px' },
    label: { display: 'block' as const, fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', fontSize: '16px', borderRadius: '0', background: '#020204', border: '1px solid #151c2e', color: '#d0d8e8', fontFamily: 'inherit', outline: 'none' },
    row:   { display: 'flex' as const, justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0e1220', fontSize: '12px' },
  }

  return (
    <div style={S.page}>
      <header style={{ borderBottom: '1px solid #0e1220', background: '#060810', padding: '0 16px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/app" style={{ color: '#3a4a5a', fontSize: '10px', textDecoration: 'none', letterSpacing: '0.08em' }}>← BACK</a>
            <span style={{ color: '#0e1220' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#00ff41', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }}/>
              <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.15em', color: '#00ff41' }}>OPSTOCK</span>
              <span style={{ color: '#3a4a5a', fontSize: '11px' }}>/ YIELD VAULT</span>
            </div>
          </div>
          {wallet
            ? <span style={{ fontSize: '10px', color: '#ffb000', border: '1px solid rgba(255,176,0,0.3)', padding: '4px 10px' }}>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
            : <button onClick={connect} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff41', color: '#00ff41', padding: '6px 16px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.12em', fontWeight: 700 }}>CONNECT →</button>
          }
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.15em', marginBottom: '4px' }}>// COVERED CALL VAULT</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Deposit. Earn USDG Yield.</div>
          <div style={{ fontSize: '12px', color: '#5a6a7a' }}>Deposit stock tokens. Vault writes weekly covered calls. You earn USDG premium automatically.</div>
        </div>

        {/* Token selector */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {VAULT_TOKENS.map(t => (
            <button key={t.symbol} onClick={() => { setSel(t); setAmount(''); setWAmount('') }}
              style={{ padding: '8px 14px', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: selToken.symbol===t.symbol?'#00ff41':'#0e1220', background: selToken.symbol===t.symbol?'rgba(0,255,65,0.08)':'transparent', color: selToken.symbol===t.symbol?'#00ff41':'#3a4a5a', fontWeight: selToken.symbol===t.symbol?700:400, letterSpacing: '0.06em' }}>
              {t.symbol}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1px', marginBottom: '20px', background: '#0e1220', border: '1px solid #0e1220' }}>
          {[
            ['VAULT TVL', tvl > 0 ? formatUSD(tvl) : '—'],
            ['YOUR DEPOSIT', depVal > 0 ? formatUSD(depVal) : '—'],
            ['PENDING USDG', fmt(pending, 6, 4) + ' USDG'],
            ['STRATEGY', '5% OTM WEEKLY'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#060810', padding: '14px 12px' }}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: label==='PENDING USDG'?'#ffb000':'#d0d8e8' }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Left — deposit/withdraw */}
          <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>

            {/* Live price */}
            <div style={{ ...S.card, borderTop: '2px solid #00ff41' }}>
              <div style={S.label}>// LIVE PRICE · {selToken.symbol}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#d0d8e8' }}>{loading?'...':formatUSD(spot)}</div>
              <div style={{ fontSize: '9px', color: '#3a4a5a', marginTop: '3px' }}>{selToken.name} · Chainlink · 24/5</div>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: '2px', background: '#0e1220' }}>
              <button onClick={()=>setMode('deposit')} style={{ flex:1, padding:'10px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='deposit'?'rgba(0,255,65,0.08)':'#060810', color:mode==='deposit'?'#00ff41':'#3a4a5a', letterSpacing:'0.1em', fontWeight:mode==='deposit'?700:400 }}>DEPOSIT</button>
              <button onClick={()=>setMode('withdraw')} style={{ flex:1, padding:'10px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='withdraw'?'rgba(255,51,51,0.08)':'#060810', color:mode==='withdraw'?'#ff3333':'#3a4a5a', letterSpacing:'0.1em', fontWeight:mode==='withdraw'?700:400 }}>WITHDRAW</button>
            </div>

            {mode==='deposit' && (
              <div style={S.card}>
                <label style={S.label}>AMOUNT ({selToken.symbol})</label>
                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={S.input}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px', marginBottom:'16px' }}>
                  <span style={{ fontSize:'9px', color:'#3a4a5a' }}>Balance: {fmt(tokenBal)} {selToken.symbol}</span>
                  <button onClick={()=>setAmount(fmt(tokenBal,18,6))} style={{ fontSize:'9px', color:'#00ff41', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>MAX</button>
                </div>
                {amount && spot && <div style={{ fontSize:'9px', color:'#3a4a5a', marginBottom:'12px' }}>≈ {formatUSD(parseFloat(amount)*spot)}</div>}
                <button onClick={doDeposit} disabled={txLoad||!wallet||!amount}
                  style={{ width:'100%', padding:'13px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.12em', fontWeight:700, cursor:txLoad||!wallet||!amount?'not-allowed':'pointer', background:wallet&&amount?'rgba(0,255,65,0.1)':'rgba(60,60,60,0.2)', color:wallet&&amount?'#00ff41':'#3a4a5a', border:`1px solid ${wallet&&amount?'#00ff41':'#0e1220'}` }}>
                  {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET':`DEPOSIT ${amount||'?'} ${selToken.symbol} →`}
                </button>
              </div>
            )}

            {mode==='withdraw' && (
              <div style={S.card}>
                <label style={S.label}>AMOUNT TO WITHDRAW ({selToken.symbol})</label>
                <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)} placeholder="0.00" style={S.input}/>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px', marginBottom:'16px' }}>
                  <span style={{ fontSize:'9px', color:'#3a4a5a' }}>Deposited: {fmt(userDep)} {selToken.symbol}</span>
                  <button onClick={()=>setWAmount(fmt(userDep,18,6))} style={{ fontSize:'9px', color:'#ff3333', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>MAX</button>
                </div>
                <button onClick={doWithdraw} disabled={txLoad||!wallet||!wAmount}
                  style={{ width:'100%', padding:'13px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.12em', fontWeight:700, cursor:txLoad||!wallet||!wAmount?'not-allowed':'pointer', background:wallet&&wAmount?'rgba(255,51,51,0.1)':'rgba(60,60,60,0.2)', color:wallet&&wAmount?'#ff3333':'#3a4a5a', border:`1px solid ${wallet&&wAmount?'#ff3333':'#0e1220'}` }}>
                  {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET':`WITHDRAW ${wAmount||'?'} ${selToken.symbol} →`}
                </button>
              </div>
            )}

            {/* Claim rewards */}
            <div style={S.card}>
              <div style={S.label}>PENDING REWARDS</div>
              <div style={{ fontSize:'24px', fontWeight:700, color:'#ffb000', marginBottom:'12px' }}>{fmt(pending,6,6)} USDG</div>
              <button onClick={doClaim} disabled={txLoad||!wallet||pending===0n}
                style={{ width:'100%', padding:'12px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.12em', fontWeight:700, cursor:txLoad||!wallet||pending===0n?'not-allowed':'pointer', background:pending>0n?'rgba(255,176,0,0.1)':'rgba(60,60,60,0.2)', color:pending>0n?'#ffb000':'#3a4a5a', border:`1px solid ${pending>0n?'#ffb000':'#0e1220'}` }}>
                {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET':'CLAIM USDG REWARDS'}
              </button>
            </div>

            {/* TX status */}
            {(txHash||txError) && (
              <div style={{ padding:'10px 12px', background:txHash?'rgba(0,255,65,0.05)':'rgba(255,51,51,0.05)', border:`1px solid ${txHash?'rgba(0,255,65,0.2)':'rgba(255,51,51,0.2)'}`, fontSize:'10px', color:txHash?'#00ff41':'#ff3333', wordBreak:'break-all' }}>
                {txHash?<>✓ TX: <a href={`https://robinhoodchain.blockscout.com/tx/${txHash}`} target="_blank" rel="noopener" style={{color:'#0088ff'}}>{txHash.slice(0,24)}...</a></>:<>✗ {txError}</>}
              </div>
            )}
          </div>

          {/* Right — info */}
          <div style={{ display:'grid', gap:'12px', alignContent:'start' }}>

            {/* Your position */}
            <div style={S.card}>
              <div style={{ fontSize:'9px', color:'#3a4a5a', letterSpacing:'0.12em', marginBottom:'12px' }}>// YOUR POSITION · {selToken.symbol}</div>
              {[
                ['Wallet Balance', fmt(tokenBal)+' '+selToken.symbol],
                ['Deposited', fmt(userDep)+' '+selToken.symbol],
                ['Deposit Value', depVal>0?formatUSD(depVal):'—'],
                ['Pending Rewards', fmt(pending,6,6)+' USDG'],
                ['Vault TVL', tvl>0?formatUSD(tvl):'—'],
                ['Total in Vault', fmt(vaultTotal)+' '+selToken.symbol],
              ].map(([k,v])=>(
                <div key={k} style={S.row}>
                  <span style={{color:'#3a4a5a'}}>{k}</span>
                  <span style={{color:k==='Pending Rewards'?'#ffb000':'#d0d8e8',fontWeight:k==='Pending Rewards'?700:400}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Strategy */}
            <div style={{ ...S.card, background:'rgba(0,255,65,0.02)', borderColor:'rgba(0,255,65,0.08)' }}>
              <div style={{ fontSize:'9px', color:'#00ff41', letterSpacing:'0.1em', marginBottom:'10px' }}>// VAULT STRATEGY</div>
              {[
                '1. Deposit your stock tokens',
                '2. Vault writes weekly covered calls at 5% OTM strike',
                '3. Buyers pay USDG premium for those calls',
                '4. Premium distributed proportionally to depositors',
                '5. Claim your USDG yield anytime',
                '6. Withdraw your tokens anytime',
              ].map(s=>(
                <div key={s} style={{ padding:'6px 0', borderBottom:'1px solid #0e1220', fontSize:'10px', color:'#5a6a7a', lineHeight:1.5 }}>{s}</div>
              ))}
            </div>

            {/* Risk */}
            <div style={{ ...S.card, background:'rgba(255,176,0,0.02)', borderColor:'rgba(255,176,0,0.08)' }}>
              <div style={{ fontSize:'9px', color:'#ffb000', letterSpacing:'0.1em', marginBottom:'10px' }}>// RISK NOTE</div>
              <div style={{ fontSize:'10px', color:'#5a6a7a', lineHeight:1.7 }}>
                If the stock price rises above the strike, the option may be exercised. Your tokens may be sold at the strike price. You keep the premium regardless. This is the standard covered call risk.
              </div>
            </div>

            {/* Contract */}
            <div style={{ fontSize:'9px', color:'#3a4a5a', lineHeight:1.8 }}>
              <div>Vault: <a href={`https://robinhoodchain.blockscout.com/address/${VAULT_ADDRESS}`} target="_blank" rel="noopener" style={{color:'#0088ff'}}>{VAULT_ADDRESS}</a></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
