import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ESS Tax Calculator',
  description: 'Australian Employee Share Scheme tax calculation utilities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
