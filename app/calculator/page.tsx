'use client'

import { useState, useEffect, useCallback } from 'react'
import { getChainlinkPrice, formatUSD, SUPPORTED_TOKENS } from '../lib/chain'

function calcPremium(spot: number, strike: number, daysToExpiry: number, type: 'call' | 'put'): number {
  if (!spot || !strike || !daysToExpiry) return 0
  
  // Simplified Black-Scholes approximation
  // Using implied vol of ~40% for stock tokens (volatile assets)
  const vol = 0.40
  const T = daysToExpiry / 365
  const sqrtT = Math.sqrt(T)
  
  // Moneyness
  const moneyness = type === 'call' 
    ? Math.max(0, spot - strike) // Intrinsic value
    : Math.max(0, strike - spot)
  
  // Time value component
  const timeValue = spot * vol * sqrtT * 0.4
  
  // Premium = intrinsic + time value adjusted for moneyness
  const otmFactor = type === 'call'
    ? Math.max(0.1, 1 - Math.max(0, (strike - spot) / spot))
    : Math.max(0.1, 1 - Math.max(0, (spot - strike) / spot))
  
  const premium = (moneyness + timeValue * otmFactor)
  
  // Return in USDG (6 decimals display)
  return Math.max(0.01, premium)
}

function calcBreakeven(spot: number, strike: number, premium: number, type: 'call' | 'put'): number {
  if (type === 'call') return strike + premium
  return strike - premium
}

export default function Calculator() {
  const [prices, setPrices]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [token, setToken]       = useState('NVDA')
  const [optType, setOptType]   = useState<'call' | 'put'>('call')
  const [strike, setStrike]     = useState('')
  const [days, setDays]         = useState('7')
  const [size, setSize]         = useState('1')
  const [customPrem, setCustom] = useState('')

  const fetchPrices = useCallback(async () => {
    const p: Record<string, number> = {}
    await Promise.all(SUPPORTED_TOKENS.map(async t => {
      try { p[t.symbol] = await getChainlinkPrice(t.feed) } catch { p[t.symbol] = 0 }
    }))
    setPrices(p)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrices(); const iv = setInterval(fetchPrices, 30000); return () => clearInterval(iv) }, [fetchPrices])

  const spot       = prices[token] || 0
  const strikeNum  = parseFloat(strike) || spot
  const daysNum    = parseInt(days) || 7
  const sizeNum    = parseFloat(size) || 1
  const suggested  = spot ? calcPremium(spot, strikeNum, daysNum, optType) : 0
  const activePrem = parseFloat(customPrem) || suggested
  const breakeven  = spot ? calcBreakeven(spot, strikeNum, activePrem, optType) : 0
  const totalPrem  = activePrem * sizeNum
  const annualYield= spot && sizeNum ? (activePrem / (optType === 'call' ? spot * sizeNum : strikeNum * sizeNum)) * (365 / daysNum) * 100 : 0
  const itm        = optType === 'call' ? spot > strikeNum : spot < strikeNum
  const otmPct     = spot ? Math.abs(strikeNum - spot) / spot * 100 : 0

  const S = {
    page:  { background: '#020204', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#d0d8e8' },
    card:  { background: '#060810', border: '1px solid #0e1220', padding: '20px' },
    label: { display: 'block' as const, fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', fontSize: '16px', borderRadius: '0', background: '#060810', border: '1px solid #151c2e', color: '#d0d8e8', fontFamily: 'inherit', outline: 'none' },
    row:   { display: 'flex' as const, justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0e1220', fontSize: '12px' },
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #0e1220', background: '#060810', padding: '0 16px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/app" style={{ color: '#3a4a5a', fontSize: '10px', textDecoration: 'none', letterSpacing: '0.08em' }}>← BACK</a>
            <span style={{ color: '#0e1220' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#00ff41', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
              <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.15em', color: '#00ff41' }}>OPSTOCK</span>
              <span style={{ color: '#3a4a5a', fontSize: '11px' }}>/ PREMIUM CALCULATOR</span>
            </div>
          </div>
          <span style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.08em' }}>Prices update every 30s</span>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.15em', marginBottom: '4px' }}>// OPTION PREMIUM CALCULATOR</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>How much should you charge?</div>
          <div style={{ fontSize: '12px', color: '#5a6a7a' }}>Get a suggested premium based on live Chainlink prices. Adjust to your preference.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Left — Inputs */}
          <div style={{ display: 'grid', gap: '12px' }}>

            {/* Option type */}
            <div style={S.card}>
              <label style={S.label}>OPTION TYPE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: '#0e1220' }}>
                {(['call', 'put'] as const).map(t => (
                  <button key={t} onClick={() => setOptType(t)} style={{ padding: '12px', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: optType === t ? (t === 'call' ? 'rgba(0,255,65,0.08)' : 'rgba(0,136,255,0.08)') : '#020204', borderLeft: optType === t ? `3px solid ${t === 'call' ? '#00ff41' : '#0088ff'}` : '3px solid transparent' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: optType === t ? (t === 'call' ? '#00ff41' : '#0088ff') : '#5a6a7a', letterSpacing: '0.08em' }}>{t === 'call' ? 'COVERED CALL' : 'CASH-SECURED PUT'}</div>
                    <div style={{ fontSize: '9px', color: '#3a4a5a', marginTop: '2px' }}>{t === 'call' ? 'Lock tokens, earn premium' : 'Lock USDG, earn premium'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Token */}
            <div style={S.card}>
              <label style={S.label}>UNDERLYING STOCK</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {SUPPORTED_TOKENS.slice(0, 10).map(t => (
                  <button key={t.symbol} onClick={() => { setToken(t.symbol); setStrike('') }} style={{ padding: '5px 10px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: token === t.symbol ? '#00ff41' : '#0e1220', background: token === t.symbol ? 'rgba(0,255,65,0.08)' : 'transparent', color: token === t.symbol ? '#00ff41' : '#3a4a5a', fontWeight: token === t.symbol ? 700 : 400 }}>{t.symbol}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {SUPPORTED_TOKENS.slice(10).map(t => (
                  <button key={t.symbol} onClick={() => { setToken(t.symbol); setStrike('') }} style={{ padding: '5px 10px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: token === t.symbol ? '#00ff41' : '#0e1220', background: token === t.symbol ? 'rgba(0,255,65,0.08)' : 'transparent', color: token === t.symbol ? '#00ff41' : '#3a4a5a', fontWeight: token === t.symbol ? 700 : 400 }}>{t.symbol}</button>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#5a6a7a' }}>
                Live price: <span style={{ color: '#00ff41', fontWeight: 700 }}>{loading ? '...' : formatUSD(spot)}</span>
              </div>
            </div>

            {/* Strike + Days */}
            <div style={S.card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={S.label}>STRIKE PRICE (USD)</label>
                  <input type="number" value={strike} onChange={e => setStrike(e.target.value)} placeholder={spot ? spot.toFixed(2) : '0.00'} style={S.input} />
                  {spot && strikeNum && (
                    <div style={{ fontSize: '9px', color: itm ? '#00ff41' : '#ffb000', marginTop: '4px' }}>
                      {itm ? '↓ ITM' : '↑ OTM'} · {otmPct.toFixed(2)}% from spot
                    </div>
                  )}
                </div>
                <div>
                  <label style={S.label}>DAYS TO EXPIRY</label>
                  <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="7" style={S.input} min="1" max="365" />
                  <div style={{ fontSize: '9px', color: '#3a4a5a', marginTop: '4px' }}>
                    {daysNum < 7 ? 'Very short term' : daysNum < 30 ? 'Weekly' : daysNum < 90 ? 'Monthly' : 'Long term'}
                  </div>
                </div>
              </div>
              <div>
                <label style={S.label}>POSITION SIZE ({optType === 'call' ? token : 'USDG'})</label>
                <input type="number" value={size} onChange={e => setSize(e.target.value)} placeholder="1" style={S.input} />
              </div>
            </div>

            {/* Custom premium override */}
            <div style={S.card}>
              <label style={S.label}>YOUR PREMIUM (USDG) — OPTIONAL OVERRIDE</label>
              <input type="number" value={customPrem} onChange={e => setCustom(e.target.value)} placeholder={suggested ? suggested.toFixed(4) : '0.00'} style={S.input} />
              <div style={{ fontSize: '9px', color: '#3a4a5a', marginTop: '6px' }}>
                Leave blank to use suggested premium of <span style={{ color: '#00ff41' }}>{suggested.toFixed(4)} USDG</span>
              </div>
            </div>
          </div>

          {/* Right — Results */}
          <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>

            {/* Suggested premium — big display */}
            <div style={{ ...S.card, borderTop: '3px solid #00ff41', textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '8px' }}>// SUGGESTED PREMIUM</div>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#00ff41', marginBottom: '4px', lineHeight: 1 }}>
                {suggested > 0 ? suggested.toFixed(4) : '—'}
              </div>
              <div style={{ fontSize: '14px', color: '#5a6a7a', marginBottom: '16px' }}>USDG per {optType === 'call' ? token : 'USDG'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#020204', padding: '10px', border: '1px solid #0e1220' }}>
                  <div style={{ fontSize: '9px', color: '#3a4a5a', marginBottom: '4px' }}>TOTAL PREMIUM</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffb000' }}>{totalPrem.toFixed(4)} USDG</div>
                </div>
                <div style={{ background: '#020204', padding: '10px', border: '1px solid #0e1220' }}>
                  <div style={{ fontSize: '9px', color: '#3a4a5a', marginBottom: '4px' }}>EST. ANNUAL YIELD</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0088ff' }}>{annualYield.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div style={S.card}>
              <div style={{ fontSize: '9px', color: '#3a4a5a', letterSpacing: '0.12em', marginBottom: '12px' }}>// TRADE ANALYSIS</div>
              {[
                ['Option Type', optType === 'call' ? 'Covered Call' : 'Cash-Secured Put'],
                ['Underlying', token],
                ['Live Spot', loading ? '...' : formatUSD(spot)],
                ['Strike', strikeNum ? formatUSD(strikeNum) : '—'],
                ['Moneyness', spot && strikeNum ? (itm ? `ITM (${otmPct.toFixed(2)}%)` : `OTM (${otmPct.toFixed(2)}%)`) : '—'],
                ['Days to Expiry', daysNum.toString()],
                ['Suggested Premium', suggested > 0 ? suggested.toFixed(4) + ' USDG' : '—'],
                ['Your Premium', activePrem ? activePrem.toFixed(4) + ' USDG' : '—'],
                ['Breakeven', spot && activePrem ? formatUSD(breakeven) : '—'],
                ['Total Premium', totalPrem > 0 ? totalPrem.toFixed(4) + ' USDG' : '—'],
                ['Est. Annual Yield', annualYield > 0 ? annualYield.toFixed(2) + '%' : '—'],
                ['Protocol Fee', '0.5%'],
                ['You Receive', totalPrem > 0 ? (totalPrem * 0.995).toFixed(4) + ' USDG' : '—'],
              ].map(([k, v]) => (
                <div key={k} style={S.row}>
                  <span style={{ color: '#3a4a5a' }}>{k}</span>
                  <span style={{ color: k === 'Suggested Premium' || k === 'You Receive' ? '#00ff41' : k === 'Est. Annual Yield' ? '#0088ff' : '#d0d8e8', fontWeight: k === 'Suggested Premium' || k === 'You Receive' ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Payoff explanation */}
            <div style={{ ...S.card, background: 'rgba(0,255,65,0.03)', borderColor: 'rgba(0,255,65,0.1)' }}>
              <div style={{ fontSize: '9px', color: '#00ff41', letterSpacing: '0.1em', marginBottom: '8px' }}>// PAYOFF AT EXPIRY</div>
              <div style={{ fontSize: '11px', color: '#5a6a7a', lineHeight: 1.7 }}>
                {optType === 'call' ? (
                  <>
                    <strong style={{ color: '#d0d8e8' }}>If price ≤ {strikeNum ? formatUSD(strikeNum) : 'strike'}:</strong> Option expires worthless. You keep your {token} tokens + {activePrem.toFixed(4)} USDG premium.<br/><br/>
                    <strong style={{ color: '#d0d8e8' }}>If price &gt; {strikeNum ? formatUSD(strikeNum) : 'strike'}:</strong> Buyer exercises. You sell {size} {token} at the strike price. You keep the premium regardless.
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#d0d8e8' }}>If price ≥ {strikeNum ? formatUSD(strikeNum) : 'strike'}:</strong> Option expires worthless. You keep your USDG collateral + {activePrem.toFixed(4)} USDG premium.<br/><br/>
                    <strong style={{ color: '#d0d8e8' }}>If price &lt; {strikeNum ? formatUSD(strikeNum) : 'strike'}:</strong> Buyer exercises. You buy {size} {token} at the strike price. You keep the premium regardless.
                  </>
                )}
              </div>
            </div>

            <a href="/app" style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'rgba(0,255,65,0.1)', color: '#00ff41', border: '1px solid #00ff41', textDecoration: 'none', fontSize: '11px', fontFamily: 'inherit', letterSpacing: '0.15em', fontWeight: 700 }}>
              WRITE THIS OPTION →
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
