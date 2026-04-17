import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isAuthPage = router.pathname.startsWith('/auth/')

  // Lê preferência do localStorage após montar (evita hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.replace('/auth/login')
    }
  }, [loading, user, isAuthPage, router])

  if (isAuthPage) {
    return <>{children}</>
  }

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

  if (!user) return null

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />

      <main
        className={`flex-1 overflow-y-auto transition-all duration-200 ${
          // Só aplica margem após montar para evitar flash
          mounted
            ? collapsed
              ? 'md:ml-16'
              : 'md:ml-52'
            : 'md:ml-52'
        }`}
      >
        <div className="md:hidden h-16" />
        {children}
      </main>
    </div>
  )
}
