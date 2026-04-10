import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/Layout'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <DashboardLayout>
        <Component {...pageProps} />
      </DashboardLayout>
    </AuthProvider>
  )
}
