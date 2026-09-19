'use client'

import { useState, useEffect, useCallback } from 'react'
import { getChainlinkPrice, formatUSD, SUPPORTED_TOKENS, CONTRACTS, getTotalOptions, getTotalBinaries, getProtocolFee, getOpenOptions, getOpenBinaries, OPSTOCK_ABI, ERC20_ABI, TOKENS, getOptionsInRange, getBinariesInRange, robinhoodChain } from './lib/chain'
import WalletConnect from './components/WalletConnect'
import { getProtocolStats, getWalletStats } from './lib/indexer'
import { createWalletClient, custom, parseUnits } from 'viem'

const NAV = ['MARKETS', 'TRADE', 'BINARY', 'VAULT', 'POSITIONS']
const OPTION_STATUS = ['OPEN', 'EXERCISED', 'EXPIRED', 'CANCELLED']
const OPTION_TYPE   = ['COVERED CALL', 'PUT', 'BINARY UP', 'BINARY DOWN']

function getProvider() {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.okxwallet || w.ethereum || null
}

async function getWalletClient() {
  const provider = getProvider()
  if (!provider) return null
  return createWalletClient({ chain: robinhoodChain, transport: custom(provider) })
}

export default function Home() {
  const [tab, setTab]             = useState('MARKETS')
  const [prices, setPrices]       = useState<Record<string, number>>({})
  const [loading, setLoading]     = useState(true)
  const [time, setTime]           = useState('')
  const [selectedToken, setToken] = useState('NVDA')
  const [totalOpts, setTotalOpts] = useState<number | null>(null)
  const [totalBins, setTotalBins] = useState<number | null>(null)
  const [openOpts, setOpenOpts]   = useState<number | null>(null)
  const [openBins, setOpenBins]   = useState<number | null>(null)
  const [feePct, setFeePct]       = useState<number | null>(null)
  const [wallet, setWallet]       = useState<string | null>(null)
  const [protStats, setProtStats] = useState<any>(null)

  useEffect(() => {
    const provider = getProvider()
    if (!provider) return
    provider.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts[0]) setWallet(accounts[0])
    })
    provider.on('accountsChanged', (accounts: string[]) => setWallet(accounts[0] || null))
  }, [])

  const fetchPrices = useCallback(async () => {
    const p: Record<string, number> = {}
    await Promise.all(SUPPORTED_TOKENS.map(async t => {
      try { p[t.symbol] = await getChainlinkPrice(t.feed) } catch { p[t.symbol] = 0 }
    }))
    setPrices(p)
    setLoading(false)
  }, [])

  const fetchContractData = useCallback(async () => {
    const [opts, bins, fee] = await Promise.all([getTotalOptions(), getTotalBinaries(), getProtocolFee()])
    setTotalOpts(opts)
    setTotalBins(bins)
    setFeePct(fee)
    if (opts > 0) setOpenOpts(await getOpenOptions(0, Math.min(opts, 50)))
    else setOpenOpts(0)
    if (bins > 0) setOpenBins(await getOpenBinaries(0, Math.min(bins, 50)))
    else setOpenBins(0)
  }, [])

  useEffect(() => {
    fetchPrices()
    fetchContractData()
    getProtocolStats().then(setProtStats)
    const iv1 = setInterval(fetchPrices, 30000)
    const iv2 = setInterval(fetchContractData, 60000)
    return () => { clearInterval(iv1); clearInterval(iv2) }
  }, [fetchPrices, fetchContractData])

  useEffect(() => {
    setTime(new Date().toUTCString())
    const iv = setInterval(() => setTime(new Date().toUTCString()), 1000)
    return () => clearInterval(iv)
  }, [])

  const STATS = [
    { label: 'Total Volume',   value: protStats ? '$' + protStats.totalVolumeUSDG.toFixed(2) : '...', sub: 'USDG premiums paid' },
    { label: 'Options Written', value: protStats ? protStats.totalOptionsWritten.toString() : '...', sub: 'All time' },
    { label: 'Protocol Fee',   value: feePct === null ? '...' : feePct + '%', sub: 'Read from contract' },
    { label: 'Network',        value: 'RHC 4663', sub: 'Robinhood Chain' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ background: '#030508', borderBottom: '1px solid var(--border)', padding: '6px 24px', display: 'flex', gap: '32px', overflowX: 'auto', alignItems: 'center' }}>
        {SUPPORTED_TOKENS.map(t => (
          <div key={t.symbol} style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', cursor: 'pointer' }}
            onClick={() => { setToken(t.symbol); setTab('TRADE') }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em' }}>{t.symbol}</span>
            <span style={{ fontSize: '11px', color: 'var(--white)' }}>{loading ? '—' : formatUSD(prices[t.symbol] || 0)}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff41', display: 'inline-block' }} />
          <span style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em' }}>CHAINLINK LIVE</span>
        </div>
      </div>

      <header style={{ borderBottom: '1px solid var(--border2)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '26px', height: '26px', background: 'var(--green)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', boxShadow: '0 0 10px rgba(0,255,65,0.4)' }} />
                <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 8px rgba(0,255,65,0.3)' }}>OPSTOCK</span>
              </div>
              <span style={{ color: 'var(--border2)' }}>|</span>
              <span style={{ color: 'var(--muted)', fontSize: '9px', letterSpacing: '0.1em' }}>ON-CHAIN OPTIONS · ROBINHOOD CHAIN · CHAINLINK ORACLES</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '9px' }}>{time}</span>
              <a href={'https://robinhoodchain.blockscout.com/address/' + CONTRACTS.OPSTOCK} target="_blank" rel="noopener"
                style={{ color: 'var(--muted2)', fontSize: '9px', textDecoration: 'none', border: '1px solid var(--border2)', padding: '4px 10px', letterSpacing: '0.08em' }}>CONTRACT ↗</a>
              <WalletConnect />
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            {NAV.map(n => (
              <button key={n} onClick={() => setTab(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 22px', fontSize: '10px', fontFamily: 'inherit', letterSpacing: '0.15em', fontWeight: tab === n ? 700 : 400, color: tab === n ? 'var(--green)' : 'var(--muted)', borderBottom: tab === n ? '2px solid var(--green)' : '2px solid transparent', transition: 'color 0.15s' }}>{n}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 24px' }}>
        {tab === 'MARKETS' && (
          <div className="fade-up">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', marginBottom: '28px', background: 'var(--border2)', border: '1px solid var(--border2)' }}>
              {STATS.map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', padding: '16px 20px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '6px' }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--white)', marginBottom: '2px' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: 'var(--muted2)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em', marginBottom: '3px' }}>// TOKENIZED EQUITIES · CHAINLINK PRICE FEEDS</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Live Markets</div>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--muted)' }}>Auto-refresh every 30s</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '2px', marginBottom: '28px', background: 'var(--border)' }}>
              {SUPPORTED_TOKENS.map(t => {
                const price = prices[t.symbol] || 0
                return (
                  <div key={t.symbol} style={{ background: 'var(--surface)', padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--green)' }}
                    onClick={() => { setToken(t.symbol); setTab('TRADE') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em' }}>{t.symbol}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{t.name}</div>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--muted)', border: '1px solid var(--border2)', padding: '2px 6px' }}>24/5</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--white)', marginBottom: '14px' }}>
                      {loading ? <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading...</span> : formatUSD(price)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button onClick={e => { e.stopPropagation(); setToken(t.symbol); setTab('TRADE') }}
                        style={{ background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', color: 'var(--green)', padding: '7px', fontSize: '9px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.12em', fontWeight: 700 }}>WRITE OPTION</button>
                      <button onClick={e => { e.stopPropagation(); setToken(t.symbol); setTab('BINARY') }}
                        style={{ background: 'rgba(255,176,0,0.08)', border: '1px solid rgba(255,176,0,0.25)', color: 'var(--amber)', padding: '7px', fontSize: '9px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.12em', fontWeight: 700 }}>BINARY BET</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.15em', marginBottom: '12px' }}>// PRODUCTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '2px', background: 'var(--border)' }}>
                {[
                  { title:'Covered Calls', icon:'↑', desc:'Lock stock tokens. Earn USDG premium. If buyer exercises, sell at your chosen strike. Keep premium regardless.', color:'var(--green)', action:'TRADE' },
                  { title:'Cash-Secured Puts', icon:'↓', desc:'Lock USDG. Earn premium for agreeing to buy stock at your strike. If assigned, acquire stock at a discount.', color:'var(--blue)', action:'TRADE' },
                  { title:'Binary Options', icon:'⟺', desc:'Pick UP or DOWN and a target price. Chainlink settles at expiry. Winner gets nearly 2× their bet.', color:'var(--amber)', action:'BINARY' },
                  { title:'Yield Vault', icon:'⬡', desc:'Deposit stock tokens. Vault auto-writes covered calls. USDG yield compounds into your position.', color:'var(--muted2)', action:'VAULT' },
                ].map(p => (
                  <div key={p.title} style={{ background:'var(--surface)', padding:'20px', cursor:'pointer' }} onClick={() => setTab(p.action)}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                      <span style={{ fontSize:'16px', color:p.color }}>{p.icon}</span>
                      <span style={{ fontSize:'12px', fontWeight:700, color:p.color, letterSpacing:'0.05em' }}>{p.title}</span>
                    </div>
                    <p style={{ fontSize:'11px', color:'var(--muted2)', lineHeight:1.7 }}>{p.desc}</p>
                    <div style={{ marginTop:'12px', fontSize:'9px', color:p.color, letterSpacing:'0.1em' }}>OPEN →</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'14px 20px', fontSize:'10px', color:'var(--muted)', display:'flex', alignItems:'center', gap:'24px', flexWrap:'wrap' }}>
              <span style={{ color:'var(--muted2)', letterSpacing:'0.1em' }}>// VERIFIED CONTRACTS</span>
              <span>OpStock: <a href={'https://robinhoodchain.blockscout.com/address/' + CONTRACTS.OPSTOCK} target="_blank" rel="noopener" style={{ color:'var(--blue)' }}>{CONTRACTS.OPSTOCK}</a></span>
              <span>Oracle: <a href={'https://robinhoodchain.blockscout.com/address/' + CONTRACTS.ORACLE_READER} target="_blank" rel="noopener" style={{ color:'var(--blue)' }}>{CONTRACTS.ORACLE_READER}</a></span>
            </div>
          </div>
        )}
        {tab === 'TRADE'     && <TradeTab prices={prices} loading={loading} selectedToken={selectedToken} setSelectedToken={setToken} feePct={feePct} wallet={wallet} totalOpts={totalOpts} />}
        {tab === 'BINARY'    && <BinaryTab prices={prices} loading={loading} selectedToken={selectedToken} setSelectedToken={setToken} feePct={feePct} wallet={wallet} totalBins={totalBins} />}
        {tab === 'VAULT'     && <VaultTab prices={prices} loading={loading} totalOpts={totalOpts} wallet={wallet} protStats={protStats} />}
        {tab === 'POSITIONS' && <PositionsTab totalOpts={totalOpts} totalBins={totalBins} openOpts={openOpts} openBins={openBins} wallet={wallet} prices={prices} />}
      </main>

      <footer style={{ borderTop:'1px solid var(--border)', padding:'20px 24px', marginTop:'60px', background:'var(--surface)' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'18px', height:'18px', background:'var(--green)', clipPath:'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            <span style={{ fontSize:'11px', fontWeight:700, color:'var(--green)', letterSpacing:'0.15em' }}>OPSTOCK</span>
          </div>
          <span style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.08em' }}>ROBINHOOD CHAIN (4663) · CHAINLINK ORACLES · ON-CHAIN OPTIONS</span>
        </div>
      </footer>
    </div>
  )
}

function TxStatus({ hash, error }: { hash: string|null; error: string|null }) {
  if (!hash && !error) return null
  return (
    <div style={{ marginTop:'16px', padding:'12px', background: hash ? 'rgba(0,255,65,0.05)' : 'rgba(255,51,51,0.05)', border: '1px solid ' + (hash ? 'rgba(0,255,65,0.2)' : 'rgba(255,51,51,0.2)'), fontSize:'10px', color: hash ? 'var(--green)' : '#ff3333' }}>
      {hash ? <>✓ TX: <a href={'https://robinhoodchain.blockscout.com/tx/' + hash} target="_blank" rel="noopener" style={{ color:'var(--blue)' }}>{hash.slice(0,20)}...</a></> : <>✗ {error}</>}
    </div>
  )
}

function TradeTab({ prices, loading, selectedToken, setSelectedToken, feePct, wallet, totalOpts }: any) {
  const [mode, setMode]         = useState<'write'|'browse'>('write')
  const [optType, setOptType]   = useState<'call'|'put'>('call')
  const [strike, setStrike]     = useState('')
  const [expiry, setExpiry]     = useState('')
  const [size, setSize]         = useState('')
  const [premium, setPremium]   = useState('')
  const [txHash, setTxHash]     = useState<string|null>(null)
  const [txError, setTxError]   = useState<string|null>(null)
  const [txLoading, setTxLoad]  = useState(false)
  const [options, setOptions]   = useState<any[]>([])
  const [optsLoading, setOptsLoad] = useState(false)

  const price   = prices[selectedToken] || 0
  const feeStr  = feePct !== null ? feePct + '%' : '...'
  const netPrem = premium && feePct !== null ? (parseFloat(premium)*(1-feePct/100)).toFixed(4) : '—'
  const token   = SUPPORTED_TOKENS.find((t:any) => t.symbol === selectedToken)!

  useEffect(() => {
    if (mode !== 'browse' || totalOpts === null) return
    setOptsLoad(true)
    getOptionsInRange(0, Math.min(totalOpts, 50)).then(opts => {
      setOptions((opts as any[]).filter((o:any) => Number(o.status) === 0))
      setOptsLoad(false)
    })
  }, [mode, totalOpts])

  async function writeOption() {
    if (!wallet) { alert('Connect wallet first'); return }
    if (!strike || !size || !premium || !expiry) { alert('Fill all fields'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const strikeWei  = BigInt(Math.round(parseFloat(strike) * 1e8))
      const expiryUnix = BigInt(Math.floor(new Date(expiry).getTime() / 1000))
      const sizeWei    = parseUnits(size, 18)
      const premiumWei = parseUnits(premium, 6)
      const approveTarget = optType === 'call' ? token.address : TOKENS.USDG.address
      const approveAmount = optType === 'call' ? sizeWei : premiumWei
      await wc.writeContract({ address: approveTarget, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, approveAmount], account: wallet as `0x${string}`, chain: robinhoodChain })
      const fn = optType === 'call' ? 'writeCoveredCall' : 'writeCashSecuredPut'
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: fn, args: [token.address, strikeWei, expiryUnix, sizeWei, premiumWei], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  async function buyOption(id: number, premium: bigint) {
    if (!wallet) { alert('Connect wallet first'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      await wc.writeContract({ address: TOKENS.USDG.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, premium], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'buyOption', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  async function exerciseOption(id: number) {
    if (!wallet) { alert('Connect wallet first'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'exercise', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  async function expireOption(id: number) {
    if (!wallet) { alert('Connect wallet first'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'expireOption', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'4px' }}>// OPTIONS</div>
          <div style={{ fontSize:'20px', fontWeight:700 }}>Options Market</div>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'2px', background:'var(--border)' }}>
            <button onClick={() => setMode('write')} style={{ padding:'7px 16px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='write'?'rgba(0,255,65,0.1)':'var(--bg)', color:mode==='write'?'var(--green)':'var(--muted2)', letterSpacing:'0.1em', fontWeight:mode==='write'?700:400 }}>WRITE</button>
            <button onClick={() => setMode('browse')} style={{ padding:'7px 16px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='browse'?'rgba(0,255,65,0.1)':'var(--bg)', color:mode==='browse'?'var(--green)':'var(--muted2)', letterSpacing:'0.1em', fontWeight:mode==='browse'?700:400 }}>BROWSE</button>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {SUPPORTED_TOKENS.map((t:any) => (
              <button key={t.symbol} onClick={() => setSelectedToken(t.symbol)} style={{ padding:'6px 12px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', letterSpacing:'0.08em', border:'1px solid', borderColor:selectedToken===t.symbol?'var(--green)':'var(--border2)', background:selectedToken===t.symbol?'rgba(0,255,65,0.1)':'transparent', color:selectedToken===t.symbol?'var(--green)':'var(--muted2)', fontWeight:selectedToken===t.symbol?700:400 }}>{t.symbol}</button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'write' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'2px', background:'var(--border)' }}>
          <div style={{ background:'var(--surface)', padding:'28px' }}>
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'8px' }}>OPTION TYPE</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px', background:'var(--border)' }}>
                {([['call','COVERED CALL','Lock stock tokens, earn premium'],['put','CASH-SECURED PUT','Lock USDG, earn premium']] as const).map(([t,label,sub]) => (
                  <button key={t} onClick={() => setOptType(t)} style={{ padding:'14px 16px', textAlign:'left', border:'none', cursor:'pointer', fontFamily:'inherit', background:optType===t?(t==='call'?'rgba(0,255,65,0.08)':'rgba(0,136,255,0.08)'):'var(--bg)', borderLeft:optType===t?('3px solid ' + (t==='call'?'var(--green)':'var(--blue)')):'3px solid transparent' }}>
                    <div style={{ fontSize:'11px', fontWeight:700, color:optType===t?(t==='call'?'var(--green)':'var(--blue)'):'var(--muted2)', marginBottom:'3px', letterSpacing:'0.08em' }}>{label}</div>
                    <div style={{ fontSize:'9px', color:'var(--muted)' }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>STRIKE PRICE (USD)</div>
                <input type="number" value={strike} onChange={e=>setStrike(e.target.value)} placeholder={price?price.toFixed(2):'0.00'} style={{ width:'100%', padding:'10px 12px', fontSize:'13px', borderRadius:'0' }} />
                {price&&strike&&<div style={{ fontSize:'9px', color:parseFloat(strike)>price?'var(--green)':'#ff3333', marginTop:'4px' }}>{parseFloat(strike)>price?'↑ OTM':'↓ ITM'}</div>}
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>{optType==='call'?('SIZE (' + selectedToken + ')'):'COLLATERAL (USDG)'}</div>
                <input type="number" value={size} onChange={e=>setSize(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'10px 12px', fontSize:'13px', borderRadius:'0' }} />
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>EXPIRY DATE & TIME</div>
                <input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} style={{ width:'100%', padding:'10px 12px', fontSize:'12px', borderRadius:'0' }} />
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>PREMIUM (USDG)</div>
                <input type="number" value={premium} onChange={e=>setPremium(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'10px 12px', fontSize:'13px', borderRadius:'0' }} />
                {premium&&feePct!==null&&<div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'4px' }}>You keep: {netPrem} USDG</div>}
              </div>
            </div>
            <TxStatus hash={txHash} error={txError} />
            <button onClick={writeOption} disabled={txLoading||!wallet}
              style={{ width:'100%', marginTop:'16px', padding:'14px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.15em', fontWeight:700, cursor:txLoading||!wallet?'not-allowed':'pointer', background:wallet?'rgba(0,255,65,0.1)':'rgba(60,60,60,0.3)', color:wallet?'var(--green)':'var(--muted)', border:('1px solid ' + (wallet?'var(--green)':'var(--border2)')) }}>
              {txLoading?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':('WRITE ' + (optType==='call'?'COVERED CALL':'PUT') + ' →')}
            </button>
          </div>
          <div style={{ background:'var(--bg)', padding:'24px', display:'flex', flexDirection:'column', gap:'2px' }}>
            <div style={{ background:'var(--surface)', padding:'16px', marginBottom:'2px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'10px' }}>// LIVE PRICE · {selectedToken}</div>
              <div style={{ fontSize:'32px', fontWeight:700, color:'var(--white)', marginBottom:'4px' }}>{loading?'...':formatUSD(price)}</div>
              <div style={{ fontSize:'9px', color:'var(--muted)' }}>Chainlink · 24/5 · 8 decimals</div>
            </div>
            <div style={{ background:'var(--surface)', padding:'16px', flex:1 }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'12px' }}>// SUMMARY</div>
              {[['Type',optType==='call'?'Covered Call':'Put'],['Spot',loading?'...':formatUSD(price)],['Strike',strike?formatUSD(parseFloat(strike)):'—'],['Collateral',size?(size+' '+(optType==='call'?selectedToken:'USDG')):'—'],['Premium',premium?(premium+' USDG'):'—'],['You receive',netPrem!=='—'?(netPrem+' USDG'):'—'],['Fee',feeStr],['Wallet',wallet?(wallet.slice(0,6)+'...'+wallet.slice(-4)):'Not connected']].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:'11px' }}>
                  <span style={{ color:'var(--muted)' }}>{k}</span>
                  <span style={{ color:k==='You receive'?'var(--green)':k==='Wallet'?'var(--amber)':'var(--white)', fontWeight:k==='You receive'?700:400 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'browse' && (
        <div>
          <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'16px' }}>// OPEN OPTIONS — BUY OR EXERCISE</div>
          {optsLoading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'var(--muted)', fontSize:'12px' }}>Loading options from chain...</div>
          ) : options.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', background:'var(--surface)', border:'1px solid var(--border2)' }}>
              <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'8px' }}>No open options yet</div>
              <button onClick={() => setMode('write')} style={{ padding:'8px 20px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', background:'rgba(0,255,65,0.1)', color:'var(--green)', border:'1px solid var(--green)', letterSpacing:'0.1em' }}>WRITE THE FIRST ONE →</button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'2px', background:'var(--border)' }}>
              {options.map((opt:any) => {
                const sym = SUPPORTED_TOKENS.find((t:any) => t.address.toLowerCase() === opt.stockToken.toLowerCase())?.symbol || 'UNKNOWN'
                const isCall = opt.isCall
                const strike = Number(opt.strikePrice) / 1e8
                const prem   = Number(opt.premium) / 1e6
                const sz     = Number(opt.size) / 1e18
                const expiry = new Date(Number(opt.expiry) * 1000)
                const expired = expiry < new Date()
                const isBuyer = wallet && opt.buyer.toLowerCase() === wallet.toLowerCase()
                const isWriter = wallet && opt.writer.toLowerCase() === wallet.toLowerCase()
                const hasBuyer = opt.buyer !== '0x0000000000000000000000000000000000000000'

                return (
                  <div key={opt.id.toString()} style={{ background:'var(--surface)', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:'16px', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>#{opt.id.toString()} · {isCall?'COVERED CALL':'PUT'}</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:isCall?'var(--green)':'var(--blue)' }}>{sym}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>STRIKE</div>
                      <div style={{ fontSize:'14px', fontWeight:700 }}>{formatUSD(strike)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>PREMIUM</div>
                      <div style={{ fontSize:'14px', color:'var(--amber)' }}>{prem.toFixed(2)} USDG</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>EXPIRY</div>
                      <div style={{ fontSize:'11px', color:expired?'#ff3333':'var(--muted2)' }}>{expiry.toLocaleDateString()}</div>
                      <div style={{ fontSize:'9px', color:expired?'#ff3333':'var(--dim)' }}>{expired?'EXPIRED':'Active'}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      {!hasBuyer && !isWriter && (
                        <button onClick={() => buyOption(Number(opt.id), opt.premium)} disabled={txLoading||!wallet}
                          style={{ padding:'6px 14px', fontSize:'9px', fontFamily:'inherit', cursor:'pointer', background:'rgba(0,255,65,0.1)', color:'var(--green)', border:'1px solid var(--green)', letterSpacing:'0.08em', fontWeight:700 }}>
                          BUY
                        </button>
                      )}
                      {isBuyer && !expired && (
                        <button onClick={() => exerciseOption(Number(opt.id))} disabled={txLoading}
                          style={{ padding:'6px 14px', fontSize:'9px', fontFamily:'inherit', cursor:'pointer', background:'rgba(0,136,255,0.1)', color:'var(--blue)', border:'1px solid var(--blue)', letterSpacing:'0.08em', fontWeight:700 }}>
                          EXERCISE
                        </button>
                      )}
                      {expired && Number(opt.status) === 0 && (
                        <button onClick={() => expireOption(Number(opt.id))} disabled={txLoading}
                          style={{ padding:'6px 14px', fontSize:'9px', fontFamily:'inherit', cursor:'pointer', background:'rgba(255,176,0,0.1)', color:'var(--amber)', border:'1px solid var(--amber)', letterSpacing:'0.08em', fontWeight:700 }}>
                          EXPIRE
                        </button>
                      )}
                      {(isWriter || isBuyer) && (
                        <div style={{ fontSize:'9px', color:'var(--muted)', textAlign:'center' }}>{isWriter?'YOUR OPTION':'YOU BOUGHT'}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <TxStatus hash={txHash} error={txError} />
        </div>
      )}
    </div>
  )
}

function BinaryTab({ prices, loading, selectedToken, setSelectedToken, feePct, wallet, totalBins }: any) {
  const [mode, setMode]         = useState<'write'|'browse'>('write')
  const [direction, setDir]     = useState<'up'|'down'>('up')
  const [target, setTarget]     = useState('')
  const [expiry, setExpiry]     = useState('')
  const [betSize, setBet]       = useState('')
  const [txHash, setTxHash]     = useState<string|null>(null)
  const [txError, setTxError]   = useState<string|null>(null)
  const [txLoading, setTxLoad]  = useState(false)
  const [binaries, setBinaries] = useState<any[]>([])
  const [binsLoading, setBinsLoad] = useState(false)

  const price   = prices[selectedToken] || 0
  const feeRate = feePct!==null?feePct/100:0.005
  const payout  = betSize?(parseFloat(betSize)*2*(1-feeRate)).toFixed(2):'0'
  const feeStr  = feePct!==null?(feePct+'%'):'...'
  const token   = SUPPORTED_TOKENS.find((t:any) => t.symbol === selectedToken)!

  useEffect(() => {
    if (mode !== 'browse' || totalBins === null) return
    setBinsLoad(true)
    getBinariesInRange(0, Math.min(totalBins, 50)).then(bins => {
      setBinaries((bins as any[]).filter((b:any) => Number(b.status) === 0))
      setBinsLoad(false)
    })
  }, [mode, totalBins])

  async function writeBinary() {
    if (!wallet) { alert('Connect wallet first'); return }
    if (!target || !betSize || !expiry) { alert('Fill all fields'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const betWei     = parseUnits(betSize, 6)
      const targetWei  = BigInt(Math.round(parseFloat(target) * 1e8))
      const expiryUnix = BigInt(Math.floor(new Date(expiry).getTime() / 1000))
      const optType    = direction === 'up' ? 2 : 3
      await wc.writeContract({ address: TOKENS.USDG.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, betWei], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'writeBinary', args: [token.address, targetWei, expiryUnix, betWei, optType], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  async function buyBinary(id: number, betSize: bigint) {
    if (!wallet) { alert('Connect wallet first'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      await wc.writeContract({ address: TOKENS.USDG.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, betSize], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'buyBinary', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  async function settleBinary(id: number) {
    if (!wallet) { alert('Connect wallet first'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'settleBinary', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
    } catch(e:any) { setTxError(e.message?.slice(0,100) || 'Failed') }
    setTxLoad(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'4px' }}>// BINARY OPTIONS</div>
          <div style={{ fontSize:'20px', fontWeight:700 }}>Binary Market</div>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'2px', background:'var(--border)' }}>
            <button onClick={() => setMode('write')} style={{ padding:'7px 16px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='write'?'rgba(255,176,0,0.1)':'var(--bg)', color:mode==='write'?'var(--amber)':'var(--muted2)', letterSpacing:'0.1em', fontWeight:mode==='write'?700:400 }}>WRITE</button>
            <button onClick={() => setMode('browse')} style={{ padding:'7px 16px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='browse'?'rgba(255,176,0,0.1)':'var(--bg)', color:mode==='browse'?'var(--amber)':'var(--muted2)', letterSpacing:'0.1em', fontWeight:mode==='browse'?700:400 }}>BROWSE</button>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {SUPPORTED_TOKENS.map((t:any) => (
              <button key={t.symbol} onClick={() => setSelectedToken(t.symbol)} style={{ padding:'6px 12px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', letterSpacing:'0.08em', border:'1px solid', borderColor:selectedToken===t.symbol?'var(--amber)':'var(--border2)', background:selectedToken===t.symbol?'rgba(255,176,0,0.1)':'transparent', color:selectedToken===t.symbol?'var(--amber)':'var(--muted2)', fontWeight:selectedToken===t.symbol?700:400 }}>{t.symbol}</button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'write' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'2px', background:'var(--border)' }}>
          <div style={{ background:'var(--surface)', padding:'28px' }}>
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'8px' }}>YOUR POSITION</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px', background:'var(--border)' }}>
                {([['up','↑ BULLISH','Price reaches target or above'],['down','↓ BEARISH','Price reaches target or below']] as const).map(([d,label,sub]) => (
                  <button key={d} onClick={() => setDir(d)} style={{ padding:'18px', textAlign:'center', border:'none', cursor:'pointer', fontFamily:'inherit', background:direction===d?(d==='up'?'rgba(0,255,65,0.08)':'rgba(255,51,51,0.08)'):'var(--bg)', borderLeft:direction===d?('3px solid ' + (d==='up'?'var(--green)':'#ff3333')):'3px solid transparent' }}>
                    <div style={{ fontSize:'20px', marginBottom:'4px', color:direction===d?(d==='up'?'var(--green)':'#ff3333'):'var(--muted)' }}>{d==='up'?'↑':'↓'}</div>
                    <div style={{ fontSize:'11px', fontWeight:700, color:direction===d?(d==='up'?'var(--green)':'#ff3333'):'var(--muted2)', letterSpacing:'0.08em', marginBottom:'3px' }}>{label}</div>
                    <div style={{ fontSize:'9px', color:'var(--muted)' }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>TARGET PRICE (USD)</div>
                <input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder={price?price.toFixed(2):'0.00'} style={{ width:'100%', padding:'10px 12px', fontSize:'13px', borderRadius:'0' }} />
                {target&&price&&<div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'4px' }}>{((parseFloat(target)/price-1)*100).toFixed(2)}% from current</div>}
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>BET SIZE (USDG)</div>
                <input type="number" value={betSize} onChange={e=>setBet(e.target.value)} placeholder="100.00" style={{ width:'100%', padding:'10px 12px', fontSize:'13px', borderRadius:'0' }} />
                {betSize&&<div style={{ fontSize:'9px', color:'var(--green)', marginTop:'4px' }}>Max win: {payout} USDG</div>}
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>EXPIRY DATE & TIME</div>
                <input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} style={{ width:'100%', padding:'10px 12px', fontSize:'12px', borderRadius:'0' }} />
              </div>
            </div>
            <TxStatus hash={txHash} error={txError} />
            <button onClick={writeBinary} disabled={txLoading||!wallet}
              style={{ width:'100%', marginTop:'20px', padding:'14px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.15em', fontWeight:700, cursor:txLoading||!wallet?'not-allowed':'pointer', background:wallet?(direction==='up'?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)'):'rgba(60,60,60,0.3)', color:wallet?(direction==='up'?'var(--green)':'#ff3333'):'var(--muted)', border:('1px solid ' + (wallet?(direction==='up'?'var(--green)':'#ff3333'):'var(--border2)')) }}>
              {txLoading?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':('WRITE ' + (direction==='up'?'↑ BULLISH':'↓ BEARISH') + ' BET →')}
            </button>
          </div>
          <div style={{ background:'var(--bg)', padding:'24px' }}>
            <div style={{ background:'var(--surface)', padding:'16px', marginBottom:'2px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'10px' }}>// LIVE PRICE · {selectedToken}</div>
              <div style={{ fontSize:'28px', fontWeight:700, color:'var(--white)' }}>{loading?'...':formatUSD(price)}</div>
            </div>
            <div style={{ background:'var(--surface)', padding:'16px' }}>
              <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'12px' }}>// BET SUMMARY</div>
              {[['Direction',direction==='up'?'↑ Bullish':'↓ Bearish'],['Underlying',selectedToken],['Current',loading?'...':formatUSD(price)],['Target',target?formatUSD(parseFloat(target)):'—'],['Your bet',betSize?(betSize+' USDG'):'—'],['Max payout',betSize?(payout+' USDG'):'—'],['Fee',feeStr],['Wallet',wallet?(wallet.slice(0,6)+'...'+wallet.slice(-4)):'Not connected']].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:'11px' }}>
                  <span style={{ color:'var(--muted)' }}>{k}</span>
                  <span style={{ color:k==='Max payout'?'var(--green)':k==='Wallet'?'var(--amber)':'var(--white)', fontWeight:k==='Max payout'?700:400 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'browse' && (
        <div>
          <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'16px' }}>// OPEN BINARY BETS — TAKE THE OTHER SIDE OR SETTLE</div>
          {binsLoading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'var(--muted)', fontSize:'12px' }}>Loading binaries from chain...</div>
          ) : binaries.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', background:'var(--surface)', border:'1px solid var(--border2)' }}>
              <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'8px' }}>No open binary bets yet</div>
              <button onClick={() => setMode('write')} style={{ padding:'8px 20px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', background:'rgba(255,176,0,0.1)', color:'var(--amber)', border:'1px solid var(--amber)', letterSpacing:'0.1em' }}>WRITE THE FIRST ONE →</button>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'2px', background:'var(--border)' }}>
              {binaries.map((b:any) => {
                const sym      = SUPPORTED_TOKENS.find((t:any) => t.address.toLowerCase() === b.stockToken.toLowerCase())?.symbol || 'UNKNOWN'
                const isUp     = Number(b.optionType) === 2
                const target   = Number(b.targetPrice) / 1e8
                const betSz    = Number(b.betSize) / 1e6
                const payout   = Number(b.payout) / 1e6
                const expiry   = new Date(Number(b.expiry) * 1000)
                const expired  = expiry < new Date()
                const hasBuyer = b.buyer !== '0x0000000000000000000000000000000000000000'
                const isWriter = wallet && b.writer.toLowerCase() === wallet.toLowerCase()
                const isBuyer  = wallet && b.buyer.toLowerCase() === wallet.toLowerCase()

                return (
                  <div key={b.id.toString()} style={{ background:'var(--surface)', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:'16px', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>#{b.id.toString()}</div>
                      <div style={{ fontSize:'16px', fontWeight:700, color:isUp?'var(--green)':'#ff3333' }}>{sym} {isUp?'↑':'↓'}</div>
                      <div style={{ fontSize:'9px', color:isUp?'var(--green)':'#ff3333' }}>{isUp?'BULLISH':'BEARISH'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>TARGET</div>
                      <div style={{ fontSize:'14px', fontWeight:700 }}>{formatUSD(target)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>BET / PAYOUT</div>
                      <div style={{ fontSize:'12px' }}>{betSz.toFixed(2)} / <span style={{ color:'var(--green)' }}>{payout.toFixed(2)} USDG</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'4px' }}>EXPIRY</div>
                      <div style={{ fontSize:'11px', color:expired?'#ff3333':'var(--muted2)' }}>{expiry.toLocaleDateString()}</div>
                      <div style={{ fontSize:'9px', color:hasBuyer?'var(--amber)':expired?'#ff3333':'var(--dim)' }}>{hasBuyer?'MATCHED':expired?'EXPIRED':'Open'}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      {!hasBuyer && !isWriter && (
                        <button onClick={() => buyBinary(Number(b.id), b.betSize)} disabled={txLoading||!wallet}
                          style={{ padding:'6px 14px', fontSize:'9px', fontFamily:'inherit', cursor:'pointer', background:'rgba(255,176,0,0.1)', color:'var(--amber)', border:'1px solid var(--amber)', letterSpacing:'0.08em', fontWeight:700 }}>
                          TAKE {isUp?'↓ BEARISH':'↑ BULLISH'}
                        </button>
                      )}
                      {hasBuyer && expired && (
                        <button onClick={() => settleBinary(Number(b.id))} disabled={txLoading}
                          style={{ padding:'6px 14px', fontSize:'9px', fontFamily:'inherit', cursor:'pointer', background:'rgba(0,136,255,0.1)', color:'var(--blue)', border:'1px solid var(--blue)', letterSpacing:'0.08em', fontWeight:700 }}>
                          SETTLE
                        </button>
                      )}
                      {(isWriter || isBuyer) && (
                        <div style={{ fontSize:'9px', color:'var(--muted)', textAlign:'center' }}>{isWriter?'YOUR BET':'YOU TOOK'}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <TxStatus hash={txHash} error={txError} />
        </div>
      )}
    </div>
  )
}

function VaultTab({ prices, loading, totalOpts, wallet, protStats }: any) {
  const [token, setToken]       = useState('NVDA')
  const [amount, setAmount]     = useState('')
  const [wAmount, setWAmount]   = useState('')
  const [txHash, setTxHash]     = useState<string|null>(null)
  const [txError, setTxError]   = useState<string|null>(null)
  const [txLoading, setTxLoad]  = useState(false)
  const [mode, setMode]         = useState<'deposit'|'withdraw'>('deposit')
  const [myDeposit, setDeposit] = useState<string|null>(null)

  const price = prices[token] || 0
  const value = amount&&price?parseFloat(amount)*price:0
  const tkn   = SUPPORTED_TOKENS.find((t:any) => t.symbol === token)!

  useEffect(() => {
    if (!wallet) return
    const tkn2 = SUPPORTED_TOKENS.find((t) => t.symbol === token)
    if (!tkn2) return
    import('./lib/chain').then(({ publicClient, CONTRACTS, OPSTOCK_ABI }) => {
      publicClient.readContract({
        address: CONTRACTS.OPSTOCK,
        abi: OPSTOCK_ABI,
        functionName: 'vaultDeposits',
        args: [wallet, tkn2.address],
      }).then((v) => setDeposit((Number(v)/1e18).toFixed(6))).catch(() => setDeposit('0'))
    })
  }, [wallet, token])

  async function deposit() {
    if (!wallet || !amount) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const amt = parseUnits(amount, 18)
      await wc.writeContract({ address: tkn.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, amt], account: wallet as any, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'vaultDeposit', args: [tkn.address, amt], account: wallet as any, chain: robinhoodChain })
      setTxHash(hash)
      setAmount('')
    } catch(e:any) { setTxError(e.message?.slice(0,100)||'Failed') }
    setTxLoad(false)
  }

  async function withdraw() {
    if (!wallet || !wAmount) return
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient()
      if (!wc) throw new Error('No wallet')
      const amt = parseUnits(wAmount, 18)
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'vaultWithdraw', args: [tkn.address, amt], account: wallet as any, chain: robinhoodChain })
      setTxHash(hash)
      setWAmount('')
    } catch(e:any) { setTxError(e.message?.slice(0,100)||'Failed') }
    setTxLoad(false)
  }

  return (
    <div className="fade-up">
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'4px' }}>// YIELD VAULT</div>
        <div style={{ fontSize:'20px', fontWeight:700 }}>Stock Token Yield Vault</div>
        <div style={{ fontSize:'11px', color:'var(--muted2)', marginTop:'4px' }}>Deposit stock tokens. Auto-write covered calls. Earn passive USDG yield.</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1px', marginBottom:'2px', background:'var(--border2)' }}>
        {[
          ['Options Written', totalOpts!==null?totalOpts.toString():'...', 'All time'],
          ['Premiums Earned', protStats?'$'+protStats.totalPremiumsUSDG.toFixed(2):'...', 'USDG collected'],
          ['Vault Deposits', protStats?protStats.totalVaultDeposits.toString():'...', 'Total deposit txs'],
          ['Your Balance', !wallet?'Connect wallet':myDeposit===null?'...':myDeposit+' '+token, 'Read from contract'],
        ].map(([label,val,sub]) => (
          <div key={label} style={{ background:'var(--surface)', padding:'20px' }}>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>{label.toUpperCase()}</div>
            <div style={{ fontSize:'18px', fontWeight:700, marginBottom:'3px', color:label==='Total Options Written'?'var(--white)':'var(--muted2)' }}>{val}</div>
            <div style={{ fontSize:'9px', color:'var(--dim)' }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'2px', background:'var(--border)' }}>
        <div style={{ background:'var(--surface)', padding:'28px' }}>
          <div style={{ display:'flex', gap:'2px', background:'var(--border)', marginBottom:'20px' }}>
            <button onClick={() => setMode('deposit')} style={{ flex:1, padding:'10px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='deposit'?'rgba(0,255,65,0.08)':'var(--bg)', color:mode==='deposit'?'var(--green)':'var(--muted2)', fontWeight:mode==='deposit'?700:400, letterSpacing:'0.1em' }}>DEPOSIT</button>
            <button onClick={() => setMode('withdraw')} style={{ flex:1, padding:'10px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', border:'none', background:mode==='withdraw'?'rgba(255,51,51,0.08)':'var(--bg)', color:mode==='withdraw'?'#ff3333':'var(--muted2)', fontWeight:mode==='withdraw'?700:400, letterSpacing:'0.1em' }}>WITHDRAW</button>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>SELECT TOKEN</div>
            <div style={{ display:'flex', gap:'2px', background:'var(--border)' }}>
              {SUPPORTED_TOKENS.map((t:any) => (
                <button key={t.symbol} onClick={() => setToken(t.symbol)} style={{ flex:1, padding:'10px', fontSize:'10px', fontFamily:'inherit', cursor:'pointer', letterSpacing:'0.08em', border:'none', background:token===t.symbol?'rgba(0,255,65,0.08)':'var(--bg)', color:token===t.symbol?'var(--green)':'var(--muted2)', fontWeight:token===t.symbol?700:400 }}>{t.symbol}</button>
              ))}
            </div>
            <div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'6px' }}>Current: {loading?'...':formatUSD(price)}</div>
          </div>

          {mode === 'deposit' && (
            <>
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>AMOUNT ({token})</div>
                <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'12px 14px', fontSize:'14px', borderRadius:'0' }} />
                {amount&&price&&<div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'4px' }}>≈ {formatUSD(value)}</div>}
              </div>
              <TxStatus hash={txHash} error={txError} />
              <button onClick={deposit} disabled={txLoading||!wallet||!amount}
                style={{ width:'100%', padding:'14px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.15em', fontWeight:700, cursor:txLoading||!wallet||!amount?'not-allowed':'pointer', background:wallet&&amount?'rgba(0,255,65,0.1)':'rgba(60,60,60,0.3)', color:wallet&&amount?'var(--green)':'var(--muted)', border:('1px solid '+(wallet&&amount?'var(--green)':'var(--border2)')) }}>
                {txLoading?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':('DEPOSIT ' + (amount||'?') + ' ' + token + ' →')}
              </button>
            </>
          )}

          {mode === 'withdraw' && (
            <>
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'6px' }}>AMOUNT TO WITHDRAW ({token})</div>
                <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'12px 14px', fontSize:'14px', borderRadius:'0' }} />
                {wAmount&&price&&<div style={{ fontSize:'9px', color:'var(--muted)', marginTop:'4px' }}>≈ {formatUSD(parseFloat(wAmount)*price)}</div>}
              </div>
              <TxStatus hash={txHash} error={txError} />
              <button onClick={withdraw} disabled={txLoading||!wallet||!wAmount}
                style={{ width:'100%', padding:'14px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.15em', fontWeight:700, cursor:txLoading||!wallet||!wAmount?'not-allowed':'pointer', background:wallet&&wAmount?'rgba(255,51,51,0.1)':'rgba(60,60,60,0.3)', color:wallet&&wAmount?'#ff3333':'var(--muted)', border:('1px solid '+(wallet&&wAmount?'#ff3333':'var(--border2)')) }}>
                {txLoading?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':('WITHDRAW ' + (wAmount||'?') + ' ' + token + ' →')}
              </button>
            </>
          )}
        </div>
        <div style={{ background:'var(--bg)', padding:'24px' }}>
          <div style={{ background:'var(--surface)', padding:'16px' }}>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'12px' }}>// HOW THE VAULT WORKS</div>
            {['1. Deposit stock tokens into the vault','2. Vault auto-writes covered calls at optimal strikes','3. Premium collected in USDG is your yield','4. If exercised, vault reinvests at market price','5. Withdraw anytime when no active calls on your deposit'].map(s => (
              <div key={s} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:'10px', color:'var(--muted2)', lineHeight:1.5 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PositionsTab({ totalOpts, totalBins, openOpts, openBins, wallet, prices }: any) {
  const [myOptions, setMyOptions]   = useState<any[]>([])
  const [myBinaries, setMyBinaries] = useState<any[]>([])
  const [posLoading, setPosLoad]    = useState(false)

  useEffect(() => {
    if (!wallet || totalOpts === null || totalBins === null) return
    setPosLoad(true)
    Promise.all([
      getOptionsInRange(0, Math.min(totalOpts, 50)),
      getBinariesInRange(0, Math.min(totalBins, 50)),
    ]).then(([opts, bins]) => {
      setMyOptions((opts as any[]).filter((o:any) => o.writer.toLowerCase() === wallet.toLowerCase() || o.buyer.toLowerCase() === wallet.toLowerCase()))
      setMyBinaries((bins as any[]).filter((b:any) => b.writer.toLowerCase() === wallet.toLowerCase() || b.buyer.toLowerCase() === wallet.toLowerCase()))
      setPosLoad(false)
    })
  }, [wallet, totalOpts, totalBins])

  return (
    <div className="fade-up">
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'4px' }}>// POSITIONS</div>
        <div style={{ fontSize:'20px', fontWeight:700 }}>Your Positions</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1px', background:'var(--border2)', marginBottom:'24px' }}>
        {[
          ['Total Options', totalOpts!==null?totalOpts.toString():'...', 'On-chain'],
          ['Open Options', openOpts!==null?openOpts.toString():'...', 'Active'],
          ['Total Binaries', totalBins!==null?totalBins.toString():'...', 'On-chain'],
          ['Open Binaries', openBins!==null?openBins.toString():'...', 'Active'],
        ].map(([label,val,sub]) => (
          <div key={label} style={{ background:'var(--surface)', padding:'20px' }}>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.1em', marginBottom:'8px' }}>{label.toUpperCase()}</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'var(--white)' }}>{val}</div>
            <div style={{ fontSize:'9px', color:'var(--muted2)', marginTop:'4px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {!wallet ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', padding:'60px', textAlign:'center' }}>
          <div style={{ fontSize:'28px', marginBottom:'12px', color:'var(--muted)' }}>⬡</div>
          <div style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'16px', letterSpacing:'0.1em' }}>// WALLET NOT CONNECTED</div>
          <div style={{ fontSize:'12px', color:'var(--muted2)', lineHeight:1.7 }}>Connect your wallet to view your positions.</div>
        </div>
      ) : posLoading ? (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--muted)', fontSize:'12px' }}>Loading your positions from chain...</div>
      ) : (
        <div>
          {/* My Options */}
          <div style={{ marginBottom:'24px' }}>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'12px' }}>// YOUR OPTIONS ({myOptions.length})</div>
            {myOptions.length === 0 ? (
              <div style={{ padding:'24px', background:'var(--surface)', border:'1px solid var(--border)', fontSize:'11px', color:'var(--muted)', textAlign:'center' }}>No options found for your wallet</div>
            ) : (
              <div style={{ display:'grid', gap:'2px', background:'var(--border)' }}>
                {myOptions.map((opt:any) => {
                  const sym    = SUPPORTED_TOKENS.find((t:any) => t.address.toLowerCase() === opt.stockToken.toLowerCase())?.symbol || '?'
                  const strike = Number(opt.strikePrice) / 1e8
                  const prem   = Number(opt.premium) / 1e6
                  const expiry = new Date(Number(opt.expiry) * 1000)
                  const status = OPTION_STATUS[Number(opt.status)] || 'UNKNOWN'
                  const role   = opt.writer.toLowerCase() === wallet.toLowerCase() ? 'WRITER' : 'BUYER'
                  return (
                    <div key={opt.id.toString()} style={{ background:'var(--surface)', padding:'14px 20px', display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr 1fr', gap:'16px', alignItems:'center' }}>
                      <div style={{ fontSize:'9px', color:'var(--amber)', fontWeight:700, border:'1px solid rgba(255,176,0,0.3)', padding:'2px 6px' }}>{role}</div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>#{opt.id.toString()} · {opt.isCall?'CALL':'PUT'}</div>
                        <div style={{ fontSize:'14px', fontWeight:700, color:'var(--green)' }}>{sym}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>STRIKE</div>
                        <div style={{ fontSize:'13px' }}>{formatUSD(strike)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>PREMIUM</div>
                        <div style={{ fontSize:'13px', color:'var(--amber)' }}>{prem.toFixed(2)} USDG</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>EXPIRY</div>
                        <div style={{ fontSize:'11px' }}>{expiry.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>STATUS</div>
                        <div style={{ fontSize:'11px', color:status==='OPEN'?'var(--green)':status==='EXERCISED'?'var(--blue)':'var(--muted)' }}>{status}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* My Binaries */}
          <div>
            <div style={{ fontSize:'9px', color:'var(--muted)', letterSpacing:'0.15em', marginBottom:'12px' }}>// YOUR BINARY BETS ({myBinaries.length})</div>
            {myBinaries.length === 0 ? (
              <div style={{ padding:'24px', background:'var(--surface)', border:'1px solid var(--border)', fontSize:'11px', color:'var(--muted)', textAlign:'center' }}>No binary bets found for your wallet</div>
            ) : (
              <div style={{ display:'grid', gap:'2px', background:'var(--border)' }}>
                {myBinaries.map((b:any) => {
                  const sym    = SUPPORTED_TOKENS.find((t:any) => t.address.toLowerCase() === b.stockToken.toLowerCase())?.symbol || '?'
                  const isUp   = Number(b.optionType) === 2
                  const target = Number(b.targetPrice) / 1e8
                  const betSz  = Number(b.betSize) / 1e6
                  const payout = Number(b.payout) / 1e6
                  const expiry = new Date(Number(b.expiry) * 1000)
                  const status = OPTION_STATUS[Number(b.status)] || 'UNKNOWN'
                  const role   = b.writer.toLowerCase() === wallet.toLowerCase() ? 'WRITER' : 'TAKER'
                  return (
                    <div key={b.id.toString()} style={{ background:'var(--surface)', padding:'14px 20px', display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr 1fr', gap:'16px', alignItems:'center' }}>
                      <div style={{ fontSize:'9px', color:'var(--amber)', fontWeight:700, border:'1px solid rgba(255,176,0,0.3)', padding:'2px 6px' }}>{role}</div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>#{b.id.toString()}</div>
                        <div style={{ fontSize:'14px', fontWeight:700, color:isUp?'var(--green)':'#ff3333' }}>{sym} {isUp?'↑':'↓'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>TARGET</div>
                        <div style={{ fontSize:'13px' }}>{formatUSD(target)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>BET</div>
                        <div style={{ fontSize:'13px' }}>{betSz.toFixed(2)} USDG</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>PAYOUT</div>
                        <div style={{ fontSize:'13px', color:'var(--green)' }}>{payout.toFixed(2)} USDG</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', color:'var(--muted)', marginBottom:'2px' }}>STATUS</div>
                        <div style={{ fontSize:'11px', color:status==='OPEN'?'var(--amber)':status==='EXERCISED'?'var(--green)':'var(--muted)' }}>{status}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop:'16px', fontSize:'10px', color:'var(--muted)', textAlign:'right' }}>
            <a href={'https://robinhoodchain.blockscout.com/address/' + wallet} target="_blank" rel="noopener" style={{ color:'var(--blue)' }}>View all transactions on Blockscout ↗</a>
          </div>
        </div>
      )}
    </div>
  )
}
