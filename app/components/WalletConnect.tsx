'use client'

import { useState, useEffect } from 'react'

const RHC_CHAIN_ID = '0x1237'

export default function WalletConnect() {
  const [address, setAddress]   = useState<string | null>(null)
  const [chainId, setChainId]   = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading]   = useState(false)

  const isWrongNetwork = chainId && chainId !== RHC_CHAIN_ID

  function getProvider() {
    const w = window as any
    if (w.okxwallet) return w.okxwallet
    if (w.ethereum) return w.ethereum
    return null
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const eth = getProvider()
    if (!eth) return
    eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts[0]) setAddress(accounts[0])
    })
    eth.request({ method: 'eth_chainId' }).then(setChainId)
    eth.on('accountsChanged', (accounts: string[]) => setAddress(accounts[0] || null))
    eth.on('chainChanged', setChainId)
  }, [])

  async function connect() {
    const eth = getProvider()
    if (!eth) { alert('No wallet detected. Install OKX Wallet or MetaMask.'); return }
    setLoading(true)
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
      const chain = await eth.request({ method: 'eth_chainId' })
      setChainId(chain)
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function switchToRHC() {
    const eth = getProvider()
    if (!eth) return
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: RHC_CHAIN_ID }] })
    } catch {
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: RHC_CHAIN_ID, chainName: 'Robinhood Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'], blockExplorerUrls: ['https://robinhoodchain.blockscout.com'] }]
        })
      } catch(e) { console.error(e) }
    }
  }

  function disconnect() { setAddress(null); setShowMenu(false) }

  if (address) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isWrongNetwork && (
          <button onClick={switchToRHC} style={{ background: 'rgba(255,51,51,0.1)', border: '1px solid #ff3333', color: '#ff3333', padding: '6px 12px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 700 }}>
            SWITCH TO RHC
          </button>
        )}
        <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid var(--green)', color: 'var(--green)', padding: '6px 16px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.12em', fontWeight: 700 }}>
          {address.slice(0,6)}...{address.slice(-4)} ▾
        </button>
        {showMenu && (
          <div style={{ position: 'absolute', right: 0, top: '36px', background: 'var(--surface)', border: '1px solid var(--border2)', zIndex: 100, minWidth: '220px' }}>
            <div style={{ padding: '10px 14px', fontSize: '9px', color: 'var(--muted)', borderBottom: '1px solid var(--border)', letterSpacing: '0.1em' }}>
              CONNECTED · RHC {chainId === RHC_CHAIN_ID ? '✓' : '✗'}
            </div>
            <div style={{ padding: '10px 14px', fontSize: '10px', color: 'var(--muted2)', borderBottom: '1px solid var(--border)', wordBreak: 'break-all' }}>
              {address}
            </div>
            <a href={'https://robinhoodchain.blockscout.com/address/' + address} target="_blank" rel="noopener"
              style={{ display: 'block', padding: '10px 14px', fontSize: '10px', color: 'var(--blue)', textDecoration: 'none', borderBottom: '1px solid var(--border)', letterSpacing: '0.08em' }}>
              VIEW ON BLOCKSCOUT ↗
            </a>
            <button onClick={disconnect} style={{ width: '100%', padding: '10px 14px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', color: '#ff3333', textAlign: 'left', letterSpacing: '0.08em' }}>
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid var(--green)', color: 'var(--green)', padding: '6px 16px', fontSize: '10px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.12em', fontWeight: 700 }}
    >
      {loading ? 'CONNECTING...' : 'CONNECT →'}
    </button>
  )
}
