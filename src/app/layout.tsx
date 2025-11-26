import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MuiThemeProvider from '../components/MuiThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voyis Image Editor',
  description: 'Electron-based image editor tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MuiThemeProvider>
          {children}
        </MuiThemeProvider>
      </body>
    </html>
  )
}