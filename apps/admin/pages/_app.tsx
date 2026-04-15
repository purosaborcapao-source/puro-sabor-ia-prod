import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatPresenceProvider } from '@/contexts/ChatPresenceContext'
import { DashboardLayout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
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
  )
}
