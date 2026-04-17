import type { AppProps } from 'next/app'
import localFont from 'next/font/local'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatPresenceProvider } from '@/contexts/ChatPresenceContext'
import { DashboardLayout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '../styles/globals.css'

const geistSans = localFont({
  src: '../public/fonts/GeistSans.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: '../public/fonts/GeistMono.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable}`}>
      <ErrorBoundary>
        <AuthProvider>
          <ChatPresenceProvider>
            <DashboardLayout>
              <ErrorBoundary>
                <Component {...pageProps} />
              </ErrorBoundary>
            </DashboardLayout>
          </ChatPresenceProvider>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  )
}
