import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'OPSTOCK — On-chain Options on Tokenized Stocks',
  description: 'Covered calls, cash-secured puts, and binary options on Robinhood Stock Tokens. Powered by Chainlink.',
  openGraph: {
    title: 'OPSTOCK',
    description: 'On-chain options on tokenized stocks. Robinhood Chain.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
