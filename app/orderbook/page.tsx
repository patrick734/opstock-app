'use client'

import { useState, useEffect, useCallback } from 'react'
import { publicClient, CONTRACTS, OPSTOCK_ABI, SUPPORTED_TOKENS, formatUSD, getChainlinkPrice } from '../lib/chain'
import { createWalletClient, custom, parseUnits } from 'viem'
import { robinhoodChain, ERC20_ABI, TOKENS } from '../lib/chain'

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

const OPTION_STATUS = ['OPEN', 'EXERCISED', 'EXPIRED', 'CANCELLED']

export default function Orderbook() {
  const [options, setOptions]   = useState<any[]>([])
  const [binaries, setBinaries] = useState<any[]>([])
  const [prices, setPrices]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [wallet, setWallet]     = useState<string | null>(null)
  const [tab, setTab]           = useState<'options' | 'binaries'>('options')
  const [filter, setFilter]     = useState('ALL')
  const [txHash, setTxHash]     = useState<string | null>(null)
  const [txError, setTxError]   = useState<string | null>(null)
  const [txLoad, setTxLoad]     = useState(false)
  const [sortBy, setSortBy]     = useState<'expiry' | 'premium' | 'strike'>('expiry')

  useEffect(() => {
    const p = getProvider(); if (!p) return
    p.request({ method: 'eth_accounts' }).then((a: string[]) => { if (a[0]) setWallet(a[0]) })
    p.on('accountsChanged', (a: string[]) => setWallet(a[0] || null))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch prices
      const p: Record<string, number> = {}
      await Promise.all(SUPPORTED_TOKENS.map(async t => {
        try { p[t.symbol] = await getChainlinkPrice(t.feed) } catch { p[t.symbol] = 0 }
      }))
      setPrices(p)

      // Fetch total options + binaries
      const [totalOpts, totalBins] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'totalOptions' }),
        publicClient.readContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'totalBinaries' }),
      ])

      // Fetch all options
      const optCalls = []
      for (let i = 0; i < Math.min(Number(totalOpts), 100); i++) {
        optCalls.push(publicClient.readContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'getOption', args: [BigInt(i)] }).catch(() => null))
      }
      const optResults = await Promise.all(optCalls)
      setOptions(optResults.filter((o: any) => o && Number(o.status) === 0))

      // Fetch all binaries
      const binCalls = []
      for (let i = 0; i < Math.min(Number(totalBins), 100); i++) {
        binCalls.push(publicClient.readContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'getBinary', args: [BigInt(i)] }).catch(() => null))
      }
      const binResults = await Promise.all(binCalls)
      setBinaries(binResults.filter((b: any) => b && Number(b.status) === 0))
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

  async function buyOption(id: number, premium: bigint) {
    if (!wallet) { alert('Connect wallet'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient(); if (!wc) throw new Error('No wallet')
      await wc.writeContract({ address: TOKENS.USDG.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, premium], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'buyOption', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
      setTimeout(fetchData, 3000)
    } catch(e: any) { setTxError(e.message?.slice(0, 100) || 'Failed') }
    setTxLoad(false)
  }

  async function buyBinary(id: number, betSize: bigint) {
    if (!wallet) { alert('Connect wallet'); return }
    setTxLoad(true); setTxHash(null); setTxError(null)
    try {
      const wc = await getWalletClient(); if (!wc) throw new Error('No wallet')
      await wc.writeContract({ address: TOKENS.USDG.address, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACTS.OPSTOCK, betSize], account: wallet as `0x${string}`, chain: robinhoodChain })
      const hash = await wc.writeContract({ address: CONTRACTS.OPSTOCK, abi: OPSTOCK_ABI, functionName: 'buyBinary', args: [BigInt(id)], account: wallet as `0x${string}`, chain: robinhoodChain })
      setTxHash(hash)
      setTimeout(fetchData, 3000)
    } catch(e: any) { setTxError(e.message?.slice(0, 100) || 'Failed') }
    setTxLoad(false)
  }

  const allSymbols = ['ALL', ...SUPPORTED_TOKENS.map(t => t.symbol)]

  const filteredOptions = options
    .filter(o => filter === 'ALL' || SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === o.stockToken.toLowerCase())?.symbol === filter)
    .sort((a, b) => {
      if (sortBy === 'expiry') return Number(a.expiry) - Number(b.expiry)
      if (sortBy === 'premium') return Number(b.premium) - Number(a.premium)
      if (sortBy === 'strike') return Number(a.strikePrice) - Number(b.strikePrice)
      return 0
    })

  const filteredBinaries = binaries
    .filter(b => filter === 'ALL' || SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === b.stockToken.toLowerCase())?.symbol === filter)

  return (
    <div style={{ background: '#020204', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#d0d8e8' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #0e1220', background: '#060810', padding: '0 16px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a href="/app" style={{ color: '#3a4a5a', fontSize: '10px', textDecoration: 'none', letterSpacing: '0.08em' }}>← BACK</a>
              <span style={{ color: '#0e1220' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', background: '#00ff41', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
                <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.15em', color: '#00ff41' }}>OPSTOCK</span>
                <span style={{ color: '#3a4a5a', fontSize: '11px' }}>/ ORDERBOOK</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={fetchData} style={{ background: 'none', border: '1px solid #0e1220', color: '#3a4a5a', padding: '5px 10px', fontSize: '9px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.08em' }}>↻ REFRESH</button>
              {wallet ? (
                <span style={{ fontSize: '10px', color: '#ffb000', border: '1px solid rgba(255,176,0,0.3)', padding: '4px 10px' }}>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
              ) : (
                <button onClick={async () => { const p = getProvider(); if (p) { const a = await p.request({ method: 'eth_requestAccounts' }); setWallet(a[0]) }}} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff41', color: '#00ff41', padding: '5px 14px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 700 }}>CONNECT</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1px', marginBottom: '20px', background: '#0e1220', border: '1px solid #0e1220' }}>
          {[
            ['OPEN OPTIONS', loading ? '...' : filteredOptions.length.toString()],
            ['OPEN BINARIES', loading ? '...' : filteredBinaries.length.toString()],
            ['MARKETS', '28'],
            ['CHAIN', 'RHC 4663'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#060810', padding: '14px 12px' }}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '2px', background: '#0e1220', marginBottom: '16px', width: 'fit-content' }}>
          <button onClick={() => setTab('options')} style={{ padding: '8px 20px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: tab === 'options' ? 'rgba(0,255,65,0.1)' : '#060810', color: tab === 'options' ? '#00ff41' : '#3a4a5a', letterSpacing: '0.1em', fontWeight: tab === 'options' ? 700 : 400 }}>OPTIONS ({loading ? '...' : options.length})</button>
          <button onClick={() => setTab('binaries')} style={{ padding: '8px 20px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: tab === 'binaries' ? 'rgba(255,176,0,0.1)' : '#060810', color: tab === 'binaries' ? '#ffb000' : '#3a4a5a', letterSpacing: '0.1em', fontWeight: tab === 'binaries' ? 700 : 400 }}>BINARIES ({loading ? '...' : binaries.length})</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', marginRight: '4px' }}>FILTER:</span>
          {allSymbols.slice(0, 15).map(sym => (
            <button key={sym} onClick={() => setFilter(sym)} style={{ padding: '4px 8px', fontSize: '9px', fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: filter === sym ? '#00ff41' : '#0e1220', background: filter === sym ? 'rgba(0,255,65,0.08)' : 'transparent', color: filter === sym ? '#00ff41' : '#3a4a5a', letterSpacing: '0.06em', fontWeight: filter === sym ? 700 : 400 }}>{sym}</button>
          ))}
        </div>

        {/* Sort (options only) */}
        {tab === 'options' && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', marginRight: '4px' }}>SORT:</span>
            {(['expiry', 'premium', 'strike'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: '4px 10px', fontSize: '9px', fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: sortBy === s ? '#00ff41' : '#0e1220', background: sortBy === s ? 'rgba(0,255,65,0.08)' : 'transparent', color: sortBy === s ? '#00ff41' : '#3a4a5a', letterSpacing: '0.06em', fontWeight: sortBy === s ? 700 : 400 }}>{s.toUpperCase()}</button>
            ))}
          </div>
        )}

        {/* TX Status */}
        {(txHash || txError) && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', background: txHash ? 'rgba(0,255,65,0.05)' : 'rgba(255,51,51,0.05)', border: `1px solid ${txHash ? 'rgba(0,255,65,0.2)' : 'rgba(255,51,51,0.2)'}`, fontSize: '10px', color: txHash ? '#00ff41' : '#ff3333', wordBreak: 'break-all' }}>
            {txHash ? <>✓ TX: <a href={`https://robinhoodchain.blockscout.com/tx/${txHash}`} target="_blank" rel="noopener" style={{ color: '#0088ff' }}>{txHash}</a></> : <>✗ {txError}</>}
          </div>
        )}

        {/* OPTIONS TABLE */}
        {tab === 'options' && (
          <div>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#3a4a5a', fontSize: '12px' }}>Loading options from chain...</div>
            ) : filteredOptions.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', background: '#060810', border: '1px solid #0e1220' }}>
                <div style={{ fontSize: '12px', color: '#3a4a5a', marginBottom: '12px' }}>No open options{filter !== 'ALL' ? ` for ${filter}` : ''}</div>
                <a href="/app" style={{ color: '#00ff41', fontSize: '11px', textDecoration: 'none', border: '1px solid rgba(0,255,65,0.3)', padding: '8px 16px' }}>WRITE AN OPTION →</a>
              </div>
            ) : (
              <>
                {/* Desktop header */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 100px 100px 90px 90px 1fr', gap: '8px', padding: '8px 16px', fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', borderBottom: '1px solid #0e1220', background: '#060810' }}>
                  <span>#</span><span>STOCK</span><span>TYPE</span><span>STRIKE</span><span>SPOT</span><span>PREMIUM</span><span>EXPIRY</span><span>ACTION</span>
                </div>
                <div style={{ display: 'grid', gap: '1px', background: '#0e1220' }}>
                  {filteredOptions.map((opt: any) => {
                    const sym = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === opt.stockToken.toLowerCase())?.symbol || '?'
                    const strike = Number(opt.strikePrice) / 1e8
                    const prem = Number(opt.premium) / 1e6
                    const spot = prices[sym] || 0
                    const expiry = new Date(Number(opt.expiry) * 1000)
                    const expired = expiry < new Date()
                    const isCall = opt.isCall
                    const itm = isCall ? spot > strike : spot < strike
                    const hasBuyer = opt.buyer !== '0x0000000000000000000000000000000000000000'
                    const isWriter = wallet && opt.writer.toLowerCase() === wallet.toLowerCase()
                    const isBuyer = wallet && opt.buyer.toLowerCase() === wallet.toLowerCase()

                    return (
                      <div key={opt.id.toString()} style={{ background: '#060810', padding: '12px 16px', display: 'grid', gridTemplateColumns: '60px 80px 80px 100px 100px 90px 90px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#3a4a5a', fontSize: '10px' }}>#{opt.id.toString()}</span>
                        <span style={{ fontWeight: 700, color: '#00ff41' }}>{sym}</span>
                        <span style={{ fontSize: '10px', color: isCall ? '#00ff41' : '#0088ff', border: `1px solid ${isCall ? 'rgba(0,255,65,0.2)' : 'rgba(0,136,255,0.2)'}`, padding: '2px 6px', width: 'fit-content' }}>{isCall ? 'CALL' : 'PUT'}</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>{formatUSD(strike)}</div>
                          {spot > 0 && <div style={{ fontSize: '9px', color: itm ? '#00ff41' : '#3a4a5a', marginTop: '1px' }}>{itm ? 'ITM' : 'OTM'}</div>}
                        </div>
                        <span style={{ color: '#d0d8e8' }}>{spot > 0 ? formatUSD(spot) : '...'}</span>
                        <span style={{ color: '#ffb000', fontWeight: 700 }}>{prem.toFixed(2)} USDG</span>
                        <div>
                          <div style={{ fontSize: '10px', color: expired ? '#ff3333' : '#5a6a7a' }}>{expiry.toLocaleDateString()}</div>
                          {expired && <div style={{ fontSize: '9px', color: '#ff3333' }}>EXPIRED</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {!hasBuyer && !isWriter && !expired && (
                            <button onClick={() => buyOption(Number(opt.id), opt.premium)} disabled={txLoad || !wallet}
                              style={{ padding: '5px 14px', fontSize: '9px', fontFamily: 'inherit', cursor: txLoad || !wallet ? 'not-allowed' : 'pointer', background: 'rgba(0,255,65,0.1)', color: '#00ff41', border: '1px solid #00ff41', fontWeight: 700, letterSpacing: '0.08em', opacity: txLoad || !wallet ? 0.5 : 1 }}>
                              BUY {prem.toFixed(2)} USDG
                            </button>
                          )}
                          {hasBuyer && !expired && <span style={{ fontSize: '9px', color: '#3a4a5a', padding: '5px 0' }}>MATCHED</span>}
                          {expired && <span style={{ fontSize: '9px', color: '#ff3333', padding: '5px 0' }}>EXPIRED</span>}
                          {isWriter && <span style={{ fontSize: '9px', color: '#ffb000', padding: '5px 0' }}>YOUR OPTION</span>}
                          {isBuyer && <span style={{ fontSize: '9px', color: '#0088ff', padding: '5px 0' }}>YOU BOUGHT</span>}
                          {!wallet && !hasBuyer && !expired && (
                            <span style={{ fontSize: '9px', color: '#3a4a5a' }}>Connect wallet to buy</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* BINARIES TABLE */}
        {tab === 'binaries' && (
          <div>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#3a4a5a', fontSize: '12px' }}>Loading binaries from chain...</div>
            ) : filteredBinaries.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', background: '#060810', border: '1px solid #0e1220' }}>
                <div style={{ fontSize: '12px', color: '#3a4a5a', marginBottom: '12px' }}>No open binary bets{filter !== 'ALL' ? ` for ${filter}` : ''}</div>
                <a href="/app" style={{ color: '#ffb000', fontSize: '11px', textDecoration: 'none', border: '1px solid rgba(255,176,0,0.3)', padding: '8px 16px' }}>WRITE A BINARY BET →</a>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 100px 100px 100px 90px 1fr', gap: '8px', padding: '8px 16px', fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.1em', borderBottom: '1px solid #0e1220', background: '#060810' }}>
                  <span>#</span><span>STOCK</span><span>DIR</span><span>TARGET</span><span>SPOT</span><span>BET/PAYOUT</span><span>EXPIRY</span><span>ACTION</span>
                </div>
                <div style={{ display: 'grid', gap: '1px', background: '#0e1220' }}>
                  {filteredBinaries.map((b: any) => {
                    const sym = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === b.stockToken.toLowerCase())?.symbol || '?'
                    const isUp = Number(b.optionType) === 2
                    const target = Number(b.targetPrice) / 1e8
                    const betSz = Number(b.betSize) / 1e6
                    const payout = Number(b.payout) / 1e6
                    const spot = prices[sym] || 0
                    const expiry = new Date(Number(b.expiry) * 1000)
                    const expired = expiry < new Date()
                    const hasBuyer = b.buyer !== '0x0000000000000000000000000000000000000000'
                    const isWriter = wallet && b.writer.toLowerCase() === wallet.toLowerCase()
                    const isBuyer = wallet && b.buyer.toLowerCase() === wallet.toLowerCase()

                    return (
                      <div key={b.id.toString()} style={{ background: '#060810', padding: '12px 16px', display: 'grid', gridTemplateColumns: '60px 80px 80px 100px 100px 100px 90px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#3a4a5a', fontSize: '10px' }}>#{b.id.toString()}</span>
                        <span style={{ fontWeight: 700, color: isUp ? '#00ff41' : '#ff3333' }}>{sym}</span>
                        <span style={{ fontSize: '10px', color: isUp ? '#00ff41' : '#ff3333', border: `1px solid ${isUp ? 'rgba(0,255,65,0.2)' : 'rgba(255,51,51,0.2)'}`, padding: '2px 6px', width: 'fit-content' }}>{isUp ? '↑ UP' : '↓ DOWN'}</span>
                        <span style={{ fontWeight: 700 }}>{formatUSD(target)}</span>
                        <span>{spot > 0 ? formatUSD(spot) : '...'}</span>
                        <div>
                          <div style={{ fontSize: '11px' }}>{betSz.toFixed(2)} USDG</div>
                          <div style={{ fontSize: '10px', color: '#00ff41' }}>→ {payout.toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: expired ? '#ff3333' : '#5a6a7a' }}>{expiry.toLocaleDateString()}</div>
                          {hasBuyer && <div style={{ fontSize: '9px', color: '#ffb000' }}>MATCHED</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {!hasBuyer && !isWriter && !expired && (
                            <button onClick={() => buyBinary(Number(b.id), b.betSize)} disabled={txLoad || !wallet}
                              style={{ padding: '5px 14px', fontSize: '9px', fontFamily: 'inherit', cursor: txLoad || !wallet ? 'not-allowed' : 'pointer', background: 'rgba(255,176,0,0.1)', color: '#ffb000', border: '1px solid #ffb000', fontWeight: 700, letterSpacing: '0.08em', opacity: txLoad || !wallet ? 0.5 : 1 }}>
                              TAKE {isUp ? '↓' : '↑'} {betSz.toFixed(2)} USDG
                            </button>
                          )}
                          {hasBuyer && <span style={{ fontSize: '9px', color: '#3a4a5a', padding: '5px 0' }}>MATCHED</span>}
                          {expired && !hasBuyer && <span style={{ fontSize: '9px', color: '#ff3333', padding: '5px 0' }}>EXPIRED</span>}
                          {isWriter && <span style={{ fontSize: '9px', color: '#ffb000', padding: '5px 0' }}>YOUR BET</span>}
                          {isBuyer && <span style={{ fontSize: '9px', color: '#0088ff', padding: '5px 0' }}>YOU TOOK</span>}
                          {!wallet && !hasBuyer && !expired && (
                            <span style={{ fontSize: '9px', color: '#3a4a5a' }}>Connect wallet to take</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '9px', color: '#3a4a5a', textAlign: 'right' }}>
          Auto-refreshes every 60s · <a href={`https://robinhoodchain.blockscout.com/address/${CONTRACTS.OPSTOCK}`} target="_blank" rel="noopener" style={{ color: '#0088ff' }}>View contract ↗</a>
        </div>
      </main>
    </div>
  )
}
