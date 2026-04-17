import type { AppProps } from 'next/app'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatPresenceProvider } from '@/contexts/ChatPresenceContext'
import { DashboardLayout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
