import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DashboardLayout>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </DashboardLayout>
      </AuthProvider>
    </ErrorBoundary>
  )
}
