import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: string
  roles?: string[]
}

export function Sidebar() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'PRODUTOR']
    },
    {
      label: 'Pedidos',
      href: '/dashboard/orders',
      icon: '📦',
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'PRODUTOR']
    },
    {
      label: 'Mensagens',
      href: '/dashboard/messages',
      icon: '💬',
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE']
    },
    {
      label: 'Produtos',
      href: '/dashboard/products',
      icon: '🍰',
      roles: ['ADMIN', 'GERENTE']
    },
    {
      label: 'Usuários',
      href: '/dashboard/users',
      icon: '👥',
      roles: ['ADMIN']
    },
    {
      label: 'Configurações',
      href: '/dashboard/settings',
      icon: '⚙️',
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE']
    }
  ]

  const visibleItems = navItems.filter((item) => {
    // Se não há requisitos de papel, o item é visível para todos
    if (!item.roles) return true;
    
    // Admin sempre vê tudo (fallback de segurança)
    if (profile?.role === 'ADMIN') return true;
    
    // Se ainda não temos o perfil, não mostramos nada por segurança 
    // (o AuthContext deve segurar o loading até carregar o perfil)
    if (!profile) return false;
    
    return item.roles.includes(profile.role);
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard'
    }
    return router.pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 md:hidden flex justify-between items-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Puro Sabor IA</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-20 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto transition-all shadow-sm">
        {/* Logo - Compacta */}
        <div className="h-20 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-3xl grayscale grayscale opacity-80" title="Puro Sabor IA">🍞</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col items-center">
          <ul className="space-y-4">
            {visibleItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                    isActive(item.href)
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none'
                      : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & Sign Out - Versão Mini */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-50 font-bold border border-zinc-200 dark:border-zinc-700" title={`${profile?.name} (${profile?.role})`}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleSignOut}
            title="Sair"
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-30 bg-white dark:bg-gray-800 md:hidden overflow-y-auto">
          <nav className="px-4 py-6">
            <ul className="space-y-2">
              {visibleItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
