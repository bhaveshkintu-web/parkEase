import React from "react"
import type { Metadata } from 'next'
// import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/lib/auth-context'
import { DataStoreProvider } from '@/lib/data-store'
import { BookingProvider } from '@/lib/booking-context'
import { SettingsProvider } from '@/lib/contexts/settings-context'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

// const _geist = Geist({ subsets: ["latin"] });
// const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'ParkEase | Find & Reserve Parking Near Airports, Events & More',
  description: 'Book affordable airport parking, event parking, and daily parking spots. Compare prices, read reviews, and reserve your spot in seconds.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <DataStoreProvider>
            <SettingsProvider>
              <BookingProvider
                  defaultCheckIn={new Date(Date.now() + 60 * 60 * 1000)} // Next hour
                  defaultCheckOut={new Date(Date.now() + 3 * 60 * 60 * 1000)} // +3 hours
                >
                {children}
                <Toaster />
              </BookingProvider>
            </SettingsProvider>
          </DataStoreProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
