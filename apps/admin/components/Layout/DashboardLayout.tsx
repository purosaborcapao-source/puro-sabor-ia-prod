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

  // Se for página de autenticação (Login), renderiza o conteúdo puro
  if (isAuthPage) {
    return <>{children}</>
  }


  // Enquanto o login inicial acontece, mostramos um loader sutil e premium
  if (loading && !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="relative flex flex-col items-center">
          <div className="text-5xl mb-8 animate-pulse grayscale">🍞</div>
          <div className="w-48 h-[1px] bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-zinc-400 dark:bg-zinc-500 animate-[loading_2s_infinite_ease-in-out]" />
          </div>
          <div className="mt-6 text-[10px] font-semibold tracking-[0.4em] text-zinc-400 dark:text-zinc-500 uppercase">
            Sincronizando Sessão
          </div>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    )
  }

  // Se já temos o usuário (sessão), renderizamos a estrutura (Sidebar + Main)
  // O perfil pode carregar em background.
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
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
