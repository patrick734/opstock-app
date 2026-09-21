'use client'

import { useState, useEffect, useCallback } from 'react'
import { getChainlinkPrice, formatUSD, SUPPORTED_TOKENS, CONTRACTS, getTotalOptions, getTotalBinaries, getProtocolFee, getOpenOptions, getOpenBinaries, OPSTOCK_ABI, ERC20_ABI, TOKENS, getOptionsInRange, getBinariesInRange, robinhoodChain } from '../lib/chain'
import WalletConnect from '../components/WalletConnect'
import { getProtocolStats } from '../lib/indexer'
import { createWalletClient, custom, parseUnits } from 'viem'

const NAV = ['MARKETS', 'TRADE', 'BINARY', 'VAULT', 'POSITIONS']
const TOOLS = [
  { label: 'ORDERBOOK', href: '/orderbook' },
  { label: 'CALCULATOR', href: '/calculator' },
  { label: 'STAKING', href: '/staking' },
]
const OPTION_STATUS = ['OPEN', 'EXERCISED', 'EXPIRED', 'CANCELLED']

const S = {
  page:    { background:'#020204', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' },
  ticker:  { background:'#030508', borderBottom:'1px solid #0e1220', padding:'6px 12px', display:'flex', gap:'20px', overflowX:'auto' as const, alignItems:'center', WebkitOverflowScrolling:'touch' as any, scrollbarWidth:'none' as any },
  header:  { borderBottom:'1px solid #151c2e', background:'#060810' },
  headerIn:{ maxWidth:'1400px', margin:'0 auto', padding:'0 12px' },
  topRow:  { display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px', gap:'8px' },
  logo:    { display:'flex', alignItems:'center', gap:'8px' },
  hex:     { width:'22px', height:'22px', background:'#00ff41', clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', boxShadow:'0 0 8px rgba(0,255,65,0.4)', flexShrink:0 },
  brand:   { fontWeight:700, fontSize:'14px', letterSpacing:'0.2em', color:'#00ff41' },
  navRow:  { display:'flex', overflowX:'auto' as const, WebkitOverflowScrolling:'touch' as any, scrollbarWidth:'none' as any },
  navBtn:  (active:boolean) => ({ background:'none', border:'none', cursor:'pointer', padding:'10px 16px', fontSize:'10px', fontFamily:'inherit', letterSpacing:'0.12em', fontWeight:active?700:400, color:active?'#00ff41':'#3a4a5a', borderBottom:active?'2px solid #00ff41':'2px solid transparent', whiteSpace:'nowrap' as const }),
  main:    { maxWidth:'1400px', margin:'0 auto', padding:'20px 12px' },
  card:    { background:'#060810', border:'1px solid #0e1220', padding:'16px' },
  cardT:   { borderTop:'2px solid #00ff41' },
  label:   { fontSize:'9px', color:'#3a4a5a', letterSpacing:'0.12em', marginBottom:'6px', display:'block' },
  val:     { fontSize:'22px', fontWeight:700, color:'#d0d8e8', marginBottom:'2px' },
  sub:     { fontSize:'9px', color:'#5a6a7a' },
  input:   { width:'100%', padding:'10px 12px', fontSize:'16px', borderRadius:'0', background:'#060810', border:'1px solid #151c2e', color:'#d0d8e8', fontFamily:'inherit', outline:'none' },
  btn:     (color:string, bg:string) => ({ width:'100%', padding:'13px', fontSize:'11px', fontFamily:'inherit', letterSpacing:'0.12em', fontWeight:700, cursor:'pointer', background:bg, color, border:`1px solid ${color}` }),
  muted:   { color:'#3a4a5a' },
  green:   '#00ff41',
  amber:   '#ffb000',
  red:     '#ff3333',
  blue:    '#0088ff',
  white:   '#d0d8e8',
}

function getProvider() {
  if (typeof window==='undefined') return null
  const w=window as any
  return w.okxwallet||w.ethereum||null
}
async function getWalletClient() {
  const p=getProvider()
  if(!p) return null
  return createWalletClient({chain:robinhoodChain,transport:custom(p)})
}

function TxStatus({hash,error}:{hash:string|null,error:string|null}) {
  if(!hash&&!error) return null
  return <div style={{marginTop:'12px',padding:'10px',background:hash?'rgba(0,255,65,0.05)':'rgba(255,51,51,0.05)',border:`1px solid ${hash?'rgba(0,255,65,0.2)':'rgba(255,51,51,0.2)'}`,fontSize:'10px',color:hash?S.green:S.red,wordBreak:'break-all'}}>
    {hash?<>✓ TX: <a href={`https://robinhoodchain.blockscout.com/tx/${hash}`} target="_blank" rel="noopener" style={{color:S.blue}}>{hash.slice(0,20)}...</a></>:<>✗ {error}</>}
  </div>
}

export default function Home() {
  const [tab,setTab]           = useState('MARKETS')
  const [prices,setPrices]     = useState<Record<string,number>>({})
  const [loading,setLoading]   = useState(true)
  const [time,setTime]         = useState('')
  const [selToken,setToken]    = useState('NVDA')
  const [totalOpts,setTO]      = useState<number|null>(null)
  const [totalBins,setTB]      = useState<number|null>(null)
  const [openOpts,setOO]       = useState<number|null>(null)
  const [openBins,setOB]       = useState<number|null>(null)
  const [feePct,setFee]        = useState<number|null>(null)
  const [wallet,setWallet]     = useState<string|null>(null)
  const [protStats,setProto]   = useState<any>(null)
  const [menuOpen,setMenu]     = useState(false)

  useEffect(()=>{
    const p=getProvider(); if(!p) return
    p.request({method:'eth_accounts'}).then((a:string[])=>{ if(a[0]) setWallet(a[0]) })
    p.on('accountsChanged',(a:string[])=>setWallet(a[0]||null))
  },[])

  const fetchPrices=useCallback(async()=>{
    const p:Record<string,number>={}
    await Promise.all(SUPPORTED_TOKENS.map(async t=>{ try{p[t.symbol]=await getChainlinkPrice(t.feed)}catch{p[t.symbol]=0} }))
    setPrices(p); setLoading(false)
  },[])

  const fetchChain=useCallback(async()=>{
    const [o,b,f]=await Promise.all([getTotalOptions(),getTotalBinaries(),getProtocolFee()])
    setTO(o); setTB(b); setFee(f)
    if(o>0) setOO(await getOpenOptions(0,Math.min(o,50))); else setOO(0)
    if(b>0) setOB(await getOpenBinaries(0,Math.min(b,50))); else setOB(0)
    getProtocolStats().then(setProto)
  },[])

  useEffect(()=>{ fetchPrices(); fetchChain(); const i1=setInterval(fetchPrices,30000),i2=setInterval(fetchChain,60000); return()=>{clearInterval(i1);clearInterval(i2)} },[fetchPrices,fetchChain])
  useEffect(()=>{ setTime(new Date().toUTCString()); const i=setInterval(()=>setTime(new Date().toUTCString()),1000); return()=>clearInterval(i) },[])

  const STATS=[
    {label:'OPEN OPTIONS', value:openOpts===null?'...':openOpts.toString(), sub:'Active on-chain'},
    {label:'OPEN BINARIES',value:openBins===null?'...':openBins.toString(),sub:'Active on-chain'},
    {label:'PROTOCOL FEE', value:feePct===null?'...':feePct+'%',           sub:'From contract'},
    {label:'CHAIN',        value:'RHC 4663',                                sub:'Robinhood Chain'},
  ]

  return (
    <div style={S.page}>
      {/* Ticker */}
      <div style={S.ticker}>
        {SUPPORTED_TOKENS.map(t=>(
          <div key={t.symbol} style={{display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',cursor:'pointer',flexShrink:0}} onClick={()=>{setToken(t.symbol);setTab('TRADE')}}>
            <span style={{fontSize:'10px',fontWeight:700,color:S.green,letterSpacing:'0.1em'}}>{t.symbol}</span>
            <span style={{fontSize:'11px',color:S.white}}>{loading?'—':formatUSD(prices[t.symbol]||0)}</span>
          </div>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'5px',flexShrink:0}}>
          <span style={{width:'5px',height:'5px',borderRadius:'50%',background:S.green,display:'inline-block'}}/>
          <span style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.06em'}}>LIVE</span>
        </div>
      </div>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerIn}>
          <div style={S.topRow}>
            <div style={S.logo}>
              <div style={S.hex}/>
              <span style={S.brand}>OPSTOCK</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <a href={`https://robinhoodchain.blockscout.com/address/${CONTRACTS.OPSTOCK}`} target="_blank" rel="noopener"
                style={{color:'#5a6a7a',fontSize:'9px',textDecoration:'none',border:'1px solid #0e1220',padding:'4px 8px',display:'none'}}>
                CONTRACT ↗
              </a>
              <WalletConnect/>
            </div>
          </div>
          <div style={S.navRow}>
            {NAV.map(n=>(
              <button key={n} onClick={()=>setTab(n)} style={S.navBtn(tab===n)}>{n}</button>
            ))}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',flexShrink:0}}>
              {TOOLS.map(t=>(
                <a key={t.label} href={t.href} style={{padding:'10px 14px',fontSize:'10px',fontFamily:'inherit',letterSpacing:'0.12em',color:'#3a4a5a',textDecoration:'none',borderBottom:'2px solid transparent',whiteSpace:'nowrap',display:'block'}}>{t.label} ↗</a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={S.main}>

        {/* MARKETS */}
        {tab==='MARKETS'&&(
          <div>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',marginBottom:'20px',background:'#0e1220',border:'1px solid #0e1220'}}>
              {STATS.map(s=>(
                <div key={s.label} style={{background:'#060810',padding:'14px 12px'}}>
                  <div style={S.label}>{s.label}</div>
                  <div style={S.val}>{s.value}</div>
                  <div style={S.sub}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'10px'}}>// LIVE MARKETS · CHAINLINK</div>

            {/* Market cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'2px',marginBottom:'20px',background:'#0e1220'}}>
              {SUPPORTED_TOKENS.map(t=>{
                const price=prices[t.symbol]||0
                return (
                  <div key={t.symbol} style={{background:'#060810',padding:'14px',cursor:'pointer',borderTop:'2px solid #00ff41'}}
                    onClick={()=>{setToken(t.symbol);setTab('TRADE')}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontSize:'16px',fontWeight:700,color:S.green}}>{t.symbol}</span>
                      <span style={{fontSize:'9px',color:'#3a4a5a',border:'1px solid #0e1220',padding:'1px 5px'}}>24/5</span>
                    </div>
                    <div style={{fontSize:'20px',fontWeight:700,color:S.white,marginBottom:'4px'}}>{loading?'...':formatUSD(price)}</div>
                    <div style={{fontSize:'10px',color:'#3a4a5a',marginBottom:'10px'}}>{t.name}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                      <button onClick={e=>{e.stopPropagation();setToken(t.symbol);setTab('TRADE')}}
                        style={{background:'rgba(0,255,65,0.08)',border:'1px solid rgba(0,255,65,0.2)',color:S.green,padding:'5px 2px',fontSize:'8px',cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.08em',fontWeight:700}}>
                        WRITE
                      </button>
                      <button onClick={e=>{e.stopPropagation();setToken(t.symbol);setTab('BINARY')}}
                        style={{background:'rgba(255,176,0,0.08)',border:'1px solid rgba(255,176,0,0.2)',color:S.amber,padding:'5px 2px',fontSize:'8px',cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.08em',fontWeight:700}}>
                        BINARY
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Products */}
            <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'10px'}}>// PRODUCTS</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'2px',marginBottom:'20px',background:'#0e1220'}}>
              {[
                {title:'Covered Calls',icon:'↑',desc:'Lock stock tokens, earn USDG premium.',color:S.green,action:'TRADE'},
                {title:'Cash-Secured Puts',icon:'↓',desc:'Lock USDG, earn premium. Buy stock at a discount.',color:S.blue,action:'TRADE'},
                {title:'Binary Options',icon:'⟺',desc:'Bet UP or DOWN. Winner takes nearly 2× their bet.',color:S.amber,action:'BINARY'},
                {title:'Yield Vault',icon:'⬡',desc:'Deposit tokens. Auto-write calls. Earn USDG yield.',color:'#5a6a7a',action:'VAULT'},
              ].map(p=>(
                <div key={p.title} style={{background:'#060810',padding:'16px',cursor:'pointer'}} onClick={()=>setTab(p.action)}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                    <span style={{fontSize:'14px',color:p.color}}>{p.icon}</span>
                    <span style={{fontSize:'12px',fontWeight:700,color:p.color}}>{p.title}</span>
                  </div>
                  <p style={{fontSize:'11px',color:'#5a6a7a',lineHeight:1.6}}>{p.desc}</p>
                  <div style={{marginTop:'10px',fontSize:'9px',color:p.color,letterSpacing:'0.1em'}}>OPEN →</div>
                </div>
              ))}
            </div>

            {/* Contracts */}
            <div style={{background:'#060810',border:'1px solid #0e1220',padding:'12px',fontSize:'10px',color:'#3a4a5a'}}>
              <div style={{marginBottom:'4px',color:'#5a6a7a',letterSpacing:'0.1em'}}>// CONTRACTS</div>
              <div style={{wordBreak:'break-all',marginBottom:'4px'}}>OpStock: <a href={`https://robinhoodchain.blockscout.com/address/${CONTRACTS.OPSTOCK}`} target="_blank" rel="noopener" style={{color:S.blue}}>{CONTRACTS.OPSTOCK}</a></div>
              <div style={{wordBreak:'break-all'}}>Oracle: <a href={`https://robinhoodchain.blockscout.com/address/${CONTRACTS.ORACLE_READER}`} target="_blank" rel="noopener" style={{color:S.blue}}>{CONTRACTS.ORACLE_READER}</a></div>
            </div>
          </div>
        )}

        {tab==='TRADE'    &&<TradeTab prices={prices} loading={loading} selToken={selToken} setToken={setToken} feePct={feePct} wallet={wallet} totalOpts={totalOpts}/>}
        {tab==='BINARY'   &&<BinaryTab prices={prices} loading={loading} selToken={selToken} setToken={setToken} feePct={feePct} wallet={wallet} totalBins={totalBins}/>}
        {tab==='VAULT'    &&<VaultTab prices={prices} loading={loading} totalOpts={totalOpts} wallet={wallet} protStats={protStats}/>}
        {tab==='POSITIONS'&&<PositionsTab totalOpts={totalOpts} totalBins={totalBins} openOpts={openOpts} openBins={openBins} wallet={wallet}/>}
      </main>

      <footer style={{borderTop:'1px solid #0e1220',padding:'16px 12px',marginTop:'40px',background:'#060810'}}>
        <div style={{maxWidth:'1400px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{...S.hex,width:'16px',height:'16px'}}/>
            <span style={{fontSize:'11px',fontWeight:700,color:S.green,letterSpacing:'0.15em'}}>OPSTOCK</span>
          </div>
          <span style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.06em'}}>RHC (4663) · CHAINLINK</span>
        </div>
      </footer>
    </div>
  )
}

function TokenSelector({sel,setSel,color}:{sel:string,setSel:(s:string)=>void,color:string}) {
  return (
    <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'16px'}}>
      {SUPPORTED_TOKENS.map(t=>(
        <button key={t.symbol} onClick={()=>setSel(t.symbol)}
          style={{padding:'5px 10px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',letterSpacing:'0.08em',border:'1px solid',borderColor:sel===t.symbol?color:'#0e1220',background:sel===t.symbol?`rgba(${color==='#00ff41'?'0,255,65':'255,176,0'},0.1)`:'transparent',color:sel===t.symbol?color:'#5a6a7a',fontWeight:sel===t.symbol?700:400}}>
          {t.symbol}
        </button>
      ))}
    </div>
  )
}

function TradeTab({prices,loading,selToken,setToken,feePct,wallet,totalOpts}:any) {
  const [mode,setMode]       = useState<'write'|'browse'>('write')
  const [optType,setOptType] = useState<'call'|'put'>('call')
  const [strike,setStrike]   = useState('')
  const [expiry,setExpiry]   = useState('')
  const [size,setSize]       = useState('')
  const [premium,setPremium] = useState('')
  const [txHash,setTxHash]   = useState<string|null>(null)
  const [txError,setTxError] = useState<string|null>(null)
  const [txLoad,setTxLoad]   = useState(false)
  const [options,setOptions] = useState<any[]>([])
  const [optsLoad,setOptsLoad]=useState(false)

  const price  = prices[selToken]||0
  const feeStr = feePct!==null?feePct+'%':'...'
  const netPrem= premium&&feePct!==null?(parseFloat(premium)*(1-feePct/100)).toFixed(4):'—'
  const token  = SUPPORTED_TOKENS.find((t:any)=>t.symbol===selToken)!

  useEffect(()=>{
    if(mode!=='browse'||totalOpts===null) return
    setOptsLoad(true)
    getOptionsInRange(0,Math.min(totalOpts,50)).then(opts=>{
      setOptions((opts as any[]).filter((o:any)=>Number(o.status)===0))
      setOptsLoad(false)
    })
  },[mode,totalOpts])

  async function writeOption() {
    if(!wallet){alert('Connect wallet');return}
    if(!strike||!size||!premium||!expiry){alert('Fill all fields');return}
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const strikeWei=BigInt(Math.round(parseFloat(strike)*1e8))
      const expiryUnix=BigInt(Math.floor(new Date(expiry).getTime()/1000))
      const sizeWei=parseUnits(size,18)
      const premWei=parseUnits(premium,6)
      const approveAddr=optType==='call'?token.address:TOKENS.USDG.address
      await wc.writeContract({address:approveAddr,abi:ERC20_ABI,functionName:'approve',args:[CONTRACTS.OPSTOCK,optType==='call'?sizeWei:premWei],account:wallet as `0x${string}`,chain:robinhoodChain})
      const fn=optType==='call'?'writeCoveredCall':'writeCashSecuredPut'
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:fn,args:[token.address,strikeWei,expiryUnix,sizeWei,premWei],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function buyOption(id:number,prem:bigint) {
    if(!wallet){alert('Connect wallet');return}
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      await wc.writeContract({address:TOKENS.USDG.address,abi:ERC20_ABI,functionName:'approve',args:[CONTRACTS.OPSTOCK,prem],account:wallet as `0x${string}`,chain:robinhoodChain})
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'buyOption',args:[BigInt(id)],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function exerciseOption(id:number) {
    if(!wallet) return
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'exercise',args:[BigInt(id)],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function expireOption(id:number) {
    if(!wallet) return
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'expireOption',args:[BigInt(id)],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
        <div>
          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'3px'}}>// OPTIONS</div>
          <div style={{fontSize:'18px',fontWeight:700}}>Options Market</div>
        </div>
        <div style={{display:'flex',gap:'2px',background:'#0e1220'}}>
          <button onClick={()=>setMode('write')} style={{padding:'7px 14px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='write'?'rgba(0,255,65,0.1)':'#060810',color:mode==='write'?S.green:'#5a6a7a',letterSpacing:'0.1em',fontWeight:mode==='write'?700:400}}>WRITE</button>
          <button onClick={()=>setMode('browse')} style={{padding:'7px 14px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='browse'?'rgba(0,255,65,0.1)':'#060810',color:mode==='browse'?S.green:'#5a6a7a',letterSpacing:'0.1em',fontWeight:mode==='browse'?700:400}}>BROWSE</button>
        </div>
      </div>

      <TokenSelector sel={selToken} setSel={setToken} color={S.green}/>

      {mode==='write'&&(
        <div style={{display:'grid',gap:'12px'}}>
          {/* Live price */}
          <div style={{...S.card,...S.cardT}}>
            <div style={S.label}>// LIVE PRICE · {selToken}</div>
            <div style={{fontSize:'28px',fontWeight:700,color:S.white}}>{loading?'...':formatUSD(price)}</div>
            <div style={{fontSize:'9px',color:'#3a4a5a',marginTop:'3px'}}>Chainlink · 24/5</div>
          </div>

          {/* Option type */}
          <div style={S.card}>
            <div style={S.label}>OPTION TYPE</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',background:'#0e1220'}}>
              {(['call','put'] as const).map(t=>(
                <button key={t} onClick={()=>setOptType(t)} style={{padding:'12px',textAlign:'left',border:'none',cursor:'pointer',fontFamily:'inherit',background:optType===t?(t==='call'?'rgba(0,255,65,0.08)':'rgba(0,136,255,0.08)'):'#020204',borderLeft:optType===t?`3px solid ${t==='call'?S.green:S.blue}`:'3px solid transparent'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:optType===t?(t==='call'?S.green:S.blue):'#5a6a7a',letterSpacing:'0.06em'}}>{t==='call'?'COVERED CALL':'CASH-SECURED PUT'}</div>
                  <div style={{fontSize:'9px',color:'#3a4a5a',marginTop:'2px'}}>{t==='call'?'Lock tokens, earn premium':'Lock USDG, earn premium'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div style={S.card}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={S.label}>STRIKE (USD)</label>
                <input type="number" value={strike} onChange={e=>setStrike(e.target.value)} placeholder={price?price.toFixed(2):'0.00'} style={S.input}/>
                {price&&strike&&<div style={{fontSize:'9px',color:parseFloat(strike)>price?S.green:S.red,marginTop:'3px'}}>{parseFloat(strike)>price?'↑ OTM':'↓ ITM'}</div>}
              </div>
              <div>
                <label style={S.label}>{optType==='call'?`SIZE (${selToken})`:'COLLATERAL (USDG)'}</label>
                <input type="number" value={size} onChange={e=>setSize(e.target.value)} placeholder="0.00" style={S.input}/>
                {size&&price&&optType==='call'&&<div style={{fontSize:'9px',color:'#3a4a5a',marginTop:'3px'}}>≈{formatUSD(parseFloat(size)*price)}</div>}
              </div>
              <div>
                <label style={S.label}>EXPIRY</label>
                <input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} style={S.input}/>
              </div>
              <div>
                <label style={S.label}>PREMIUM (USDG)</label>
                <input type="number" value={premium} onChange={e=>setPremium(e.target.value)} placeholder="0.00" style={S.input}/>
                {premium&&feePct!==null&&<div style={{fontSize:'9px',color:'#3a4a5a',marginTop:'3px'}}>You keep: {netPrem} USDG</div>}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={S.card}>
            <div style={S.label}>// SUMMARY</div>
            {[['Type',optType==='call'?'Covered Call':'Put'],['Spot',loading?'...':formatUSD(price)],['Strike',strike?formatUSD(parseFloat(strike)):'—'],['You receive',netPrem!=='—'?netPrem+' USDG':'—'],['Fee',feeStr],['Wallet',wallet?(wallet.slice(0,6)+'...'+wallet.slice(-4)):'Not connected']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #0e1220',fontSize:'11px'}}>
                <span style={{color:'#3a4a5a'}}>{k}</span>
                <span style={{color:k==='You receive'?S.green:k==='Wallet'?S.amber:S.white,fontWeight:k==='You receive'?700:400}}>{v}</span>
              </div>
            ))}
          </div>

          <TxStatus hash={txHash} error={txError}/>
          <button onClick={writeOption} disabled={txLoad||!wallet}
            style={{...S.btn(wallet?S.green:'#3a4a5a',wallet?'rgba(0,255,65,0.1)':'rgba(60,60,60,0.2)'),cursor:txLoad||!wallet?'not-allowed':'pointer'}}>
            {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':'WRITE OPTION →'}
          </button>
        </div>
      )}

      {mode==='browse'&&(
        <div>
          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.12em',marginBottom:'12px'}}>// OPEN OPTIONS</div>
          {optsLoad?(
            <div style={{padding:'32px',textAlign:'center',color:'#3a4a5a',fontSize:'12px'}}>Loading from chain...</div>
          ):options.length===0?(
            <div style={{...S.card,textAlign:'center',padding:'32px'}}>
              <div style={{fontSize:'12px',color:'#3a4a5a',marginBottom:'12px'}}>No open options yet</div>
              <button onClick={()=>setMode('write')} style={{padding:'8px 20px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',background:'rgba(0,255,65,0.1)',color:S.green,border:`1px solid ${S.green}`,letterSpacing:'0.1em'}}>WRITE FIRST →</button>
            </div>
          ):(
            <div style={{display:'grid',gap:'2px',background:'#0e1220'}}>
              {options.map((opt:any)=>{
                const sym=SUPPORTED_TOKENS.find((t:any)=>t.address.toLowerCase()===opt.stockToken.toLowerCase())?.symbol||'?'
                const strike=Number(opt.strikePrice)/1e8
                const prem=Number(opt.premium)/1e6
                const expiry=new Date(Number(opt.expiry)*1000)
                const expired=expiry<new Date()
                const hasBuyer=opt.buyer!=='0x0000000000000000000000000000000000000000'
                const isBuyer=wallet&&opt.buyer.toLowerCase()===wallet.toLowerCase()
                const isWriter=wallet&&opt.writer.toLowerCase()===wallet.toLowerCase()
                return (
                  <div key={opt.id.toString()} style={{background:'#060810',padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'9px',color:'#3a4a5a',marginBottom:'2px'}}>#{opt.id.toString()} · {opt.isCall?'CALL':'PUT'}</div>
                        <div style={{fontSize:'16px',fontWeight:700,color:opt.isCall?S.green:S.blue}}>{sym}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'13px',fontWeight:700}}>{formatUSD(strike)}</div>
                        <div style={{fontSize:'11px',color:S.amber,marginTop:'2px'}}>{prem.toFixed(2)} USDG</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'6px'}}>
                      <div style={{fontSize:'10px',color:expired?S.red:'#5a6a7a'}}>{expiry.toLocaleDateString()} {expired?'· EXPIRED':''}</div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                        {!hasBuyer&&!isWriter&&(
                          <button onClick={()=>buyOption(Number(opt.id),opt.premium)} disabled={txLoad||!wallet}
                            style={{padding:'5px 12px',fontSize:'9px',fontFamily:'inherit',cursor:'pointer',background:'rgba(0,255,65,0.1)',color:S.green,border:`1px solid ${S.green}`,fontWeight:700,letterSpacing:'0.08em'}}>BUY</button>
                        )}
                        {isBuyer&&!expired&&(
                          <button onClick={()=>exerciseOption(Number(opt.id))} disabled={txLoad}
                            style={{padding:'5px 12px',fontSize:'9px',fontFamily:'inherit',cursor:'pointer',background:`rgba(0,136,255,0.1)`,color:S.blue,border:`1px solid ${S.blue}`,fontWeight:700,letterSpacing:'0.08em'}}>EXERCISE</button>
                        )}
                        {expired&&Number(opt.status)===0&&(
                          <button onClick={()=>expireOption(Number(opt.id))} disabled={txLoad}
                            style={{padding:'5px 12px',fontSize:'9px',fontFamily:'inherit',cursor:'pointer',background:`rgba(255,176,0,0.1)`,color:S.amber,border:`1px solid ${S.amber}`,fontWeight:700,letterSpacing:'0.08em'}}>EXPIRE</button>
                        )}
                        {(isWriter||isBuyer)&&<div style={{fontSize:'9px',color:'#3a4a5a',padding:'5px 0'}}>{isWriter?'YOURS':'BOUGHT'}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <TxStatus hash={txHash} error={txError}/>
        </div>
      )}
    </div>
  )
}

function BinaryTab({prices,loading,selToken,setToken,feePct,wallet,totalBins}:any) {
  const [mode,setMode]     = useState<'write'|'browse'>('write')
  const [dir,setDir]       = useState<'up'|'down'>('up')
  const [target,setTarget] = useState('')
  const [expiry,setExpiry] = useState('')
  const [betSize,setBet]   = useState('')
  const [txHash,setTxHash] = useState<string|null>(null)
  const [txError,setTxError]=useState<string|null>(null)
  const [txLoad,setTxLoad] = useState(false)
  const [bins,setBins]     = useState<any[]>([])
  const [binsLoad,setBLoad]=useState(false)

  const price  =prices[selToken]||0
  const feeRate=feePct!==null?feePct/100:0.005
  const payout =betSize?(parseFloat(betSize)*2*(1-feeRate)).toFixed(2):'0'
  const token  =SUPPORTED_TOKENS.find((t:any)=>t.symbol===selToken)!

  useEffect(()=>{
    if(mode!=='browse'||totalBins===null) return
    setBLoad(true)
    getBinariesInRange(0,Math.min(totalBins,50)).then(b=>{
      setBins((b as any[]).filter((x:any)=>Number(x.status)===0))
      setBLoad(false)
    })
  },[mode,totalBins])

  async function writeBinary() {
    if(!wallet){alert('Connect wallet');return}
    if(!target||!betSize||!expiry){alert('Fill all fields');return}
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const betWei=parseUnits(betSize,6)
      const targetWei=BigInt(Math.round(parseFloat(target)*1e8))
      const expiryUnix=BigInt(Math.floor(new Date(expiry).getTime()/1000))
      const optType=dir==='up'?2:3
      await wc.writeContract({address:TOKENS.USDG.address,abi:ERC20_ABI,functionName:'approve',args:[CONTRACTS.OPSTOCK,betWei],account:wallet as `0x${string}`,chain:robinhoodChain})
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'writeBinary',args:[token.address,targetWei,expiryUnix,betWei,optType],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function buyBinary(id:number,betSz:bigint) {
    if(!wallet){alert('Connect wallet');return}
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      await wc.writeContract({address:TOKENS.USDG.address,abi:ERC20_ABI,functionName:'approve',args:[CONTRACTS.OPSTOCK,betSz],account:wallet as `0x${string}`,chain:robinhoodChain})
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'buyBinary',args:[BigInt(id)],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function settleBinary(id:number) {
    if(!wallet) return
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'settleBinary',args:[BigInt(id)],account:wallet as `0x${string}`,chain:robinhoodChain})
      setTxHash(hash)
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
        <div>
          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'3px'}}>// BINARY OPTIONS</div>
          <div style={{fontSize:'18px',fontWeight:700}}>Binary Market</div>
        </div>
        <div style={{display:'flex',gap:'2px',background:'#0e1220'}}>
          <button onClick={()=>setMode('write')} style={{padding:'7px 14px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='write'?'rgba(255,176,0,0.1)':'#060810',color:mode==='write'?S.amber:'#5a6a7a',letterSpacing:'0.1em',fontWeight:mode==='write'?700:400}}>WRITE</button>
          <button onClick={()=>setMode('browse')} style={{padding:'7px 14px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='browse'?'rgba(255,176,0,0.1)':'#060810',color:mode==='browse'?S.amber:'#5a6a7a',letterSpacing:'0.1em',fontWeight:mode==='browse'?700:400}}>BROWSE</button>
        </div>
      </div>

      <TokenSelector sel={selToken} setSel={setToken} color={S.amber}/>

      {mode==='write'&&(
        <div style={{display:'grid',gap:'12px'}}>
          <div style={{...S.card,...S.cardT,borderTopColor:S.amber}}>
            <div style={S.label}>// LIVE PRICE · {selToken}</div>
            <div style={{fontSize:'28px',fontWeight:700,color:S.white}}>{loading?'...':formatUSD(price)}</div>
          </div>

          <div style={S.card}>
            <div style={S.label}>YOUR POSITION</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',background:'#0e1220'}}>
              {(['up','down'] as const).map(d=>(
                <button key={d} onClick={()=>setDir(d)} style={{padding:'16px',textAlign:'center',border:'none',cursor:'pointer',fontFamily:'inherit',background:dir===d?(d==='up'?'rgba(0,255,65,0.08)':'rgba(255,51,51,0.08)'):'#020204',borderLeft:dir===d?`3px solid ${d==='up'?S.green:S.red}`:'3px solid transparent'}}>
                  <div style={{fontSize:'20px',marginBottom:'4px',color:dir===d?(d==='up'?S.green:S.red):'#3a4a5a'}}>{d==='up'?'↑':'↓'}</div>
                  <div style={{fontSize:'11px',fontWeight:700,color:dir===d?(d==='up'?S.green:S.red):'#5a6a7a',letterSpacing:'0.06em'}}>{d==='up'?'BULLISH':'BEARISH'}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={S.label}>TARGET PRICE (USD)</label>
                <input type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder={price?price.toFixed(2):'0.00'} style={S.input}/>
                {target&&price&&<div style={{fontSize:'9px',color:'#3a4a5a',marginTop:'3px'}}>{((parseFloat(target)/price-1)*100).toFixed(2)}% from current</div>}
              </div>
              <div>
                <label style={S.label}>BET SIZE (USDG)</label>
                <input type="number" value={betSize} onChange={e=>setBet(e.target.value)} placeholder="100.00" style={S.input}/>
                {betSize&&<div style={{fontSize:'9px',color:S.green,marginTop:'3px'}}>Win: {payout} USDG</div>}
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={S.label}>EXPIRY</label>
                <input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} style={S.input}/>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.label}>// SUMMARY</div>
            {[['Direction',dir==='up'?'↑ Bullish':'↓ Bearish'],['Underlying',selToken],['Target',target?formatUSD(parseFloat(target)):'—'],['Your bet',betSize?betSize+' USDG':'—'],['Max payout',betSize?payout+' USDG':'—'],['Fee',feePct!==null?feePct+'%':'...'],['Wallet',wallet?(wallet.slice(0,6)+'...'+wallet.slice(-4)):'Not connected']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #0e1220',fontSize:'11px'}}>
                <span style={{color:'#3a4a5a'}}>{k}</span>
                <span style={{color:k==='Max payout'?S.green:k==='Wallet'?S.amber:S.white,fontWeight:k==='Max payout'?700:400}}>{v}</span>
              </div>
            ))}
          </div>

          <TxStatus hash={txHash} error={txError}/>
          <button onClick={writeBinary} disabled={txLoad||!wallet}
            style={{...S.btn(wallet?(dir==='up'?S.green:S.red):'#3a4a5a',wallet?(dir==='up'?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)'):'rgba(60,60,60,0.2)'),cursor:txLoad||!wallet?'not-allowed':'pointer'}}>
            {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET FIRST':`WRITE ${dir==='up'?'↑ BULLISH':'↓ BEARISH'} BET →`}
          </button>
        </div>
      )}

      {mode==='browse'&&(
        <div>
          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.12em',marginBottom:'12px'}}>// OPEN BINARY BETS</div>
          {binsLoad?(
            <div style={{padding:'32px',textAlign:'center',color:'#3a4a5a',fontSize:'12px'}}>Loading from chain...</div>
          ):bins.length===0?(
            <div style={{...S.card,textAlign:'center',padding:'32px'}}>
              <div style={{fontSize:'12px',color:'#3a4a5a',marginBottom:'12px'}}>No open binary bets yet</div>
              <button onClick={()=>setMode('write')} style={{padding:'8px 20px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',background:'rgba(255,176,0,0.1)',color:S.amber,border:`1px solid ${S.amber}`,letterSpacing:'0.1em'}}>WRITE FIRST →</button>
            </div>
          ):(
            <div style={{display:'grid',gap:'2px',background:'#0e1220'}}>
              {bins.map((b:any)=>{
                const sym=SUPPORTED_TOKENS.find((t:any)=>t.address.toLowerCase()===b.stockToken.toLowerCase())?.symbol||'?'
                const isUp=Number(b.optionType)===2
                const tgt=Number(b.targetPrice)/1e8
                const betSz=Number(b.betSize)/1e6
                const payout=Number(b.payout)/1e6
                const expiry=new Date(Number(b.expiry)*1000)
                const expired=expiry<new Date()
                const hasBuyer=b.buyer!=='0x0000000000000000000000000000000000000000'
                const isWriter=wallet&&b.writer.toLowerCase()===wallet.toLowerCase()
                const isBuyer=wallet&&b.buyer.toLowerCase()===wallet.toLowerCase()
                return (
                  <div key={b.id.toString()} style={{background:'#060810',padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'9px',color:'#3a4a5a',marginBottom:'2px'}}>#{b.id.toString()}</div>
                        <div style={{fontSize:'16px',fontWeight:700,color:isUp?S.green:S.red}}>{sym} {isUp?'↑':'↓'}</div>
                        <div style={{fontSize:'9px',color:isUp?S.green:S.red}}>{isUp?'BULLISH':'BEARISH'}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'13px',fontWeight:700}}>Target: {formatUSD(tgt)}</div>
                        <div style={{fontSize:'11px',color:'#5a6a7a',marginTop:'2px'}}>{betSz.toFixed(2)} → <span style={{color:S.green}}>{payout.toFixed(2)} USDG</span></div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'6px'}}>
                      <div style={{fontSize:'10px',color:expired?S.red:'#5a6a7a'}}>{expiry.toLocaleDateString()} {hasBuyer?'· MATCHED':expired?'· EXPIRED':'· Open'}</div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                        {!hasBuyer&&!isWriter&&(
                          <button onClick={()=>buyBinary(Number(b.id),b.betSize)} disabled={txLoad||!wallet}
                            style={{padding:'5px 12px',fontSize:'9px',fontFamily:'inherit',cursor:'pointer',background:'rgba(255,176,0,0.1)',color:S.amber,border:`1px solid ${S.amber}`,fontWeight:700}}>
                            TAKE {isUp?'↓':'↑'}
                          </button>
                        )}
                        {hasBuyer&&expired&&(
                          <button onClick={()=>settleBinary(Number(b.id))} disabled={txLoad}
                            style={{padding:'5px 12px',fontSize:'9px',fontFamily:'inherit',cursor:'pointer',background:`rgba(0,136,255,0.1)`,color:S.blue,border:`1px solid ${S.blue}`,fontWeight:700}}>
                            SETTLE
                          </button>
                        )}
                        {(isWriter||isBuyer)&&<div style={{fontSize:'9px',color:'#3a4a5a',padding:'5px 0'}}>{isWriter?'YOURS':'TOOK'}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <TxStatus hash={txHash} error={txError}/>
        </div>
      )}
    </div>
  )
}

function VaultTab({prices,loading,totalOpts,wallet,protStats}:any) {
  const [token,setToken]     = useState('NVDA')
  const [amount,setAmount]   = useState('')
  const [wAmount,setWAmount] = useState('')
  const [mode,setMode]       = useState<'deposit'|'withdraw'>('deposit')
  const [myDep,setMyDep]     = useState<string|null>(null)
  const [txHash,setTxHash]   = useState<string|null>(null)
  const [txError,setTxError] = useState<string|null>(null)
  const [txLoad,setTxLoad]   = useState(false)
  const price=prices[token]||0
  const tkn=SUPPORTED_TOKENS.find((t:any)=>t.symbol===token)!

  useEffect(()=>{
    if(!wallet) return
    import('../lib/chain').then(({publicClient,CONTRACTS,OPSTOCK_ABI})=>{
      publicClient.readContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'vaultDeposits',args:[wallet as any,tkn.address]}).then((v:any)=>setMyDep((Number(v)/1e18).toFixed(6))).catch(()=>setMyDep('0'))
    })
  },[wallet,token])

  async function deposit() {
    if(!wallet||!amount) return
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const amt=parseUnits(amount,18)
      await wc.writeContract({address:tkn.address,abi:ERC20_ABI,functionName:'approve',args:[CONTRACTS.OPSTOCK,amt],account:wallet as any,chain:robinhoodChain})
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'vaultDeposit',args:[tkn.address,amt],account:wallet as any,chain:robinhoodChain})
      setTxHash(hash);setAmount('')
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  async function withdraw() {
    if(!wallet||!wAmount) return
    setTxLoad(true);setTxHash(null);setTxError(null)
    try {
      const wc=await getWalletClient(); if(!wc) throw new Error('No wallet')
      const amt=parseUnits(wAmount,18)
      const hash=await wc.writeContract({address:CONTRACTS.OPSTOCK,abi:OPSTOCK_ABI,functionName:'vaultWithdraw',args:[tkn.address,amt],account:wallet as any,chain:robinhoodChain})
      setTxHash(hash);setWAmount('')
    } catch(e:any){setTxError(e.message?.slice(0,100)||'Failed')}
    setTxLoad(false)
  }

  return (
    <div>
      <div style={{marginBottom:'16px'}}>
        <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'3px'}}>// YIELD VAULT</div>
        <div style={{fontSize:'18px',fontWeight:700}}>Stock Token Yield Vault</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',marginBottom:'16px',background:'#0e1220',border:'1px solid #0e1220'}}>
        {[
          ['Options Written',totalOpts!==null?totalOpts.toString():'...'],
          ['USDG Earned',protStats?'$'+protStats.totalPremiumsUSDG.toFixed(2):'...'],
          ['Vault Deposits',protStats?protStats.totalVaultDeposits.toString():'...'],
          ['Your Balance',!wallet?'Connect wallet':myDep===null?'...':myDep+' '+token],
        ].map(([label,val])=>(
          <div key={label} style={{background:'#060810',padding:'14px'}}>
            <div style={S.label}>{label.toUpperCase()}</div>
            <div style={{fontSize:'16px',fontWeight:700,color:label==='Your Balance'?S.amber:S.white}}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{...S.card,marginBottom:'12px'}}>
        <div style={{display:'flex',gap:'2px',background:'#0e1220',marginBottom:'16px'}}>
          <button onClick={()=>setMode('deposit')} style={{flex:1,padding:'10px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='deposit'?'rgba(0,255,65,0.08)':'#020204',color:mode==='deposit'?S.green:'#5a6a7a',fontWeight:mode==='deposit'?700:400,letterSpacing:'0.1em'}}>DEPOSIT</button>
          <button onClick={()=>setMode('withdraw')} style={{flex:1,padding:'10px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'none',background:mode==='withdraw'?'rgba(255,51,51,0.08)':'#020204',color:mode==='withdraw'?S.red:'#5a6a7a',fontWeight:mode==='withdraw'?700:400,letterSpacing:'0.1em'}}>WITHDRAW</button>
        </div>

        <div style={S.label}>SELECT TOKEN</div>
        <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'16px'}}>
          {SUPPORTED_TOKENS.map((t:any)=>(
            <button key={t.symbol} onClick={()=>setToken(t.symbol)} style={{padding:'5px 10px',fontSize:'10px',fontFamily:'inherit',cursor:'pointer',border:'1px solid',borderColor:token===t.symbol?S.green:'#0e1220',background:token===t.symbol?'rgba(0,255,65,0.08)':'transparent',color:token===t.symbol?S.green:'#5a6a7a',fontWeight:token===t.symbol?700:400,letterSpacing:'0.06em'}}>{t.symbol}</button>
          ))}
        </div>
        <div style={{fontSize:'9px',color:'#3a4a5a',marginBottom:'12px'}}>Current: {loading?'...':formatUSD(price)}</div>

        {mode==='deposit'&&(
          <>
            <label style={S.label}>AMOUNT ({token})</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" style={{...S.input,marginBottom:'12px'}}/>
            {amount&&price&&<div style={{fontSize:'9px',color:'#3a4a5a',marginBottom:'12px'}}>≈ {formatUSD(parseFloat(amount)*price)}</div>}
            <TxStatus hash={txHash} error={txError}/>
            <button onClick={deposit} disabled={txLoad||!wallet||!amount} style={{...S.btn(wallet&&amount?S.green:'#3a4a5a',wallet&&amount?'rgba(0,255,65,0.1)':'rgba(60,60,60,0.2)'),marginTop:'8px',cursor:txLoad||!wallet||!amount?'not-allowed':'pointer'}}>
              {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET':`DEPOSIT ${amount||'?'} ${token} →`}
            </button>
          </>
        )}
        {mode==='withdraw'&&(
          <>
            <label style={S.label}>AMOUNT TO WITHDRAW ({token})</label>
            <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)} placeholder="0.00" style={{...S.input,marginBottom:'12px'}}/>
            <TxStatus hash={txHash} error={txError}/>
            <button onClick={withdraw} disabled={txLoad||!wallet||!wAmount} style={{...S.btn(wallet&&wAmount?S.red:'#3a4a5a',wallet&&wAmount?'rgba(255,51,51,0.1)':'rgba(60,60,60,0.2)'),marginTop:'8px',cursor:txLoad||!wallet||!wAmount?'not-allowed':'pointer'}}>
              {txLoad?'SUBMITTING...':!wallet?'CONNECT WALLET':`WITHDRAW ${wAmount||'?'} ${token} →`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PositionsTab({totalOpts,totalBins,openOpts,openBins,wallet}:any) {
  const [myOpts,setMyOpts]   = useState<any[]>([])
  const [myBins,setMyBins]   = useState<any[]>([])
  const [posLoad,setPosLoad] = useState(false)

  useEffect(()=>{
    if(!wallet||totalOpts===null||totalBins===null) return
    setPosLoad(true)
    Promise.all([
      getOptionsInRange(0,Math.min(totalOpts,50)),
      getBinariesInRange(0,Math.min(totalBins,50)),
    ]).then(([opts,bins])=>{
      setMyOpts((opts as any[]).filter((o:any)=>o.writer.toLowerCase()===wallet.toLowerCase()||o.buyer.toLowerCase()===wallet.toLowerCase()))
      setMyBins((bins as any[]).filter((b:any)=>b.writer.toLowerCase()===wallet.toLowerCase()||b.buyer.toLowerCase()===wallet.toLowerCase()))
      setPosLoad(false)
    })
  },[wallet,totalOpts,totalBins])

  return (
    <div>
      <div style={{marginBottom:'16px'}}>
        <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.15em',marginBottom:'3px'}}>// POSITIONS</div>
        <div style={{fontSize:'18px',fontWeight:700}}>Your Positions</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',marginBottom:'20px',background:'#0e1220',border:'1px solid #0e1220'}}>
        {[['Total Options',totalOpts!==null?totalOpts.toString():'...'],['Open Options',openOpts!==null?openOpts.toString():'...'],['Total Binaries',totalBins!==null?totalBins.toString():'...'],['Open Binaries',openBins!==null?openBins.toString():'...']].map(([label,val])=>(
          <div key={label} style={{background:'#060810',padding:'14px'}}>
            <div style={S.label}>{label.toUpperCase()}</div>
            <div style={{fontSize:'22px',fontWeight:700,color:S.white}}>{val}</div>
          </div>
        ))}
      </div>

      {!wallet?(
        <div style={{...S.card,textAlign:'center',padding:'48px'}}>
          <div style={{fontSize:'24px',marginBottom:'12px',color:'#3a4a5a'}}>⬡</div>
          <div style={{fontSize:'11px',color:'#3a4a5a',marginBottom:'16px',letterSpacing:'0.1em'}}>// WALLET NOT CONNECTED</div>
          <div style={{fontSize:'12px',color:'#5a6a7a',lineHeight:1.7}}>Connect your wallet to view your positions.</div>
        </div>
      ):posLoad?(
        <div style={{padding:'32px',textAlign:'center',color:'#3a4a5a',fontSize:'12px'}}>Loading positions from chain...</div>
      ):(
        <div>
          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.12em',marginBottom:'10px'}}>// YOUR OPTIONS ({myOpts.length})</div>
          {myOpts.length===0?(
            <div style={{...S.card,padding:'20px',textAlign:'center',fontSize:'11px',color:'#3a4a5a',marginBottom:'16px'}}>No options found</div>
          ):(
            <div style={{display:'grid',gap:'2px',background:'#0e1220',marginBottom:'16px'}}>
              {myOpts.map((opt:any)=>{
                const sym=SUPPORTED_TOKENS.find((t:any)=>t.address.toLowerCase()===opt.stockToken.toLowerCase())?.symbol||'?'
                const strike=Number(opt.strikePrice)/1e8
                const prem=Number(opt.premium)/1e6
                const expiry=new Date(Number(opt.expiry)*1000)
                const status=OPTION_STATUS[Number(opt.status)]||'UNKNOWN'
                const role=opt.writer.toLowerCase()===wallet.toLowerCase()?'WRITER':'BUYER'
                return (
                  <div key={opt.id.toString()} style={{background:'#060810',padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                          <span style={{fontSize:'9px',color:S.amber,fontWeight:700,border:'1px solid rgba(255,176,0,0.3)',padding:'1px 5px'}}>{role}</span>
                          <span style={{fontSize:'9px',color:'#3a4a5a'}}>#{opt.id.toString()} · {opt.isCall?'CALL':'PUT'}</span>
                        </div>
                        <div style={{fontSize:'15px',fontWeight:700,color:opt.isCall?S.green:S.blue}}>{sym}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'13px',fontWeight:700}}>{formatUSD(strike)}</div>
                        <div style={{fontSize:'11px',color:S.amber,marginTop:'2px'}}>{prem.toFixed(2)} USDG</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px'}}>
                      <span style={{color:'#5a6a7a'}}>{expiry.toLocaleDateString()}</span>
                      <span style={{color:status==='OPEN'?S.green:status==='EXERCISED'?S.blue:'#3a4a5a'}}>{status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{fontSize:'9px',color:'#3a4a5a',letterSpacing:'0.12em',marginBottom:'10px'}}>// YOUR BINARY BETS ({myBins.length})</div>
          {myBins.length===0?(
            <div style={{...S.card,padding:'20px',textAlign:'center',fontSize:'11px',color:'#3a4a5a',marginBottom:'16px'}}>No binary bets found</div>
          ):(
            <div style={{display:'grid',gap:'2px',background:'#0e1220',marginBottom:'16px'}}>
              {myBins.map((b:any)=>{
                const sym=SUPPORTED_TOKENS.find((t:any)=>t.address.toLowerCase()===b.stockToken.toLowerCase())?.symbol||'?'
                const isUp=Number(b.optionType)===2
                const tgt=Number(b.targetPrice)/1e8
                const betSz=Number(b.betSize)/1e6
                const payout=Number(b.payout)/1e6
                const expiry=new Date(Number(b.expiry)*1000)
                const status=OPTION_STATUS[Number(b.status)]||'UNKNOWN'
                const role=b.writer.toLowerCase()===wallet.toLowerCase()?'WRITER':'TAKER'
                return (
                  <div key={b.id.toString()} style={{background:'#060810',padding:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                          <span style={{fontSize:'9px',color:S.amber,fontWeight:700,border:'1px solid rgba(255,176,0,0.3)',padding:'1px 5px'}}>{role}</span>
                          <span style={{fontSize:'9px',color:'#3a4a5a'}}>#{b.id.toString()}</span>
                        </div>
                        <div style={{fontSize:'15px',fontWeight:700,color:isUp?S.green:S.red}}>{sym} {isUp?'↑':'↓'}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'13px',fontWeight:700}}>→ {formatUSD(tgt)}</div>
                        <div style={{fontSize:'11px',color:S.green,marginTop:'2px'}}>{betSz.toFixed(2)} → {payout.toFixed(2)} USDG</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px'}}>
                      <span style={{color:'#5a6a7a'}}>{expiry.toLocaleDateString()}</span>
                      <span style={{color:status==='OPEN'?S.amber:status==='EXERCISED'?S.green:'#3a4a5a'}}>{status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{textAlign:'right',marginTop:'8px'}}>
            <a href={`https://robinhoodchain.blockscout.com/address/${wallet}`} target="_blank" rel="noopener" style={{fontSize:'10px',color:S.blue}}>View all on Blockscout ↗</a>
          </div>
        </div>
      )}
    </div>
  )
}
