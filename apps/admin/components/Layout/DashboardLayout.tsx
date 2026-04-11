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
      <div className="h-screen flex flex-col items-center justify-center bg-black">
        <div className="relative">
          <div className="text-4xl animate-pulse">🍞</div>
          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full scale-150 animate-ping"></div>
        </div>
        <div className="mt-8 text-[10px] font-black tracking-[0.3em] text-blue-500/50 uppercase">
          Authenticating Session
        </div>
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
