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
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE', 'PRODUTOR']
    },
    {
      label: 'Clientes',
      href: '/dashboard/customers',
      icon: '👤',
      roles: ['ADMIN', 'GERENTE', 'ATENDENTE']
    },
    {
      label: 'Cobranças',
      href: '/dashboard/billing',
      icon: '💰',
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
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-52 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto transition-all shadow-sm">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-2xl grayscale opacity-80">🍞</span>
          <span className="text-sm font-black tracking-widest text-zinc-900 dark:text-zinc-50 uppercase">Puro Sabor</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col">
          <ul className="space-y-1 px-3">
            {visibleItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50'
                  }`}
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & Sign Out */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-50 font-bold text-sm border border-zinc-200 dark:border-zinc-700">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">{profile?.name}</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sair"
            aria-label="Sair"
            className="p-2 shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-30 bg-white dark:bg-zinc-900 md:hidden overflow-y-auto">
          <nav className="px-4 py-6">
            <ul className="space-y-1">
              {visibleItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive(item.href)
                        ? 'bg-zinc-900 text-white font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-xl w-6 text-center">{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
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
