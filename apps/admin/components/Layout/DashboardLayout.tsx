import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  const isAuthPage = router.pathname.startsWith('/auth/')

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.replace('/auth/login')
    }
  }, [loading, user, isAuthPage, router])

  // Don't show layout on auth pages
  if (isAuthPage) {
    return <>{children}</>
  }

  // Enquanto o login inicial acontece, mostramos um loader sutil
  if (loading && !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Se já temos o usuário (sessão), renderizamos a estrutura (Sidebar + Main)
  // O perfil pode carregar em background.
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-20 overflow-y-auto">
        {/* Top padding for mobile */}
        <div className="md:hidden h-16" />

        {/* Content */}
        {children}
      </main>
    </div>
  )
}
