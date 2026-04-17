import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: string
  roles?: string[]
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

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
    if (!item.roles) return true
    if (profile?.role === 'ADMIN') return true
    if (!profile) return false
    return item.roles.includes(profile.role)
  })

  const isActive = (href: string) => {
    if (href === '/dashboard') return router.pathname === '/dashboard'
    return router.pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 md:hidden flex justify-between items-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Puro Sabor IA</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 shadow-sm z-30 ${
          collapsed ? 'w-16' : 'w-52'
        }`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
          <span className="text-2xl grayscale opacity-80 shrink-0">🍞</span>
          {!collapsed && (
            <span className="text-sm font-black tracking-widest text-zinc-900 dark:text-zinc-50 uppercase whitespace-nowrap overflow-hidden">
              Puro Sabor
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
            {visibleItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-xl transition-all ${
                    collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-3 py-2.5'
                  } ${
                    isActive(item.href)
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50'
                  }`}
                >
                  <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-sm font-semibold whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Toggle + User + Sign Out */}
        <div className={`border-t border-zinc-200 dark:border-zinc-800 shrink-0 ${collapsed ? 'p-2 flex flex-col items-center gap-3' : 'p-4'}`}>
          {/* Toggle collapse button */}
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`flex items-center justify-center rounded-lg transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              collapsed ? 'w-10 h-10' : 'w-full py-2 gap-2 mb-3'
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-semibold">Recolher</span>
              </>
            )}
          </button>

          {!collapsed && (
            <div className="flex items-center justify-between gap-3">
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
          )}

          {collapsed && (
            <>
              <div
                title={`${profile?.name} (${profile?.role})`}
                className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-50 font-bold text-sm border border-zinc-200 dark:border-zinc-700 cursor-default"
              >
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                title="Sair"
                aria-label="Sair"
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileOpen && (
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
                    onClick={() => setMobileOpen(false)}
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
