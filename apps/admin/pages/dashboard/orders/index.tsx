import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { OrderList } from '@/components/Orders/OrderList'
import { OrderTimeline } from '@/components/Orders/OrderTimeline'
import { OrderCalendar } from '@/components/Orders/OrderCalendar'
import { OrderFilters } from '@/components/Orders/OrderFilters'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, Plus, LayoutList, Kanban, Calendar as CalendarIcon } from 'lucide-react'

export default function OrdersPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [filters, setFilters] = useState({
    status: null as string | null,
    paymentStatus: null as string | null,
    date: null as string | null,
    search: ''
  })
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "calendar">("timeline")

  // Callbacks para filtros - nunca recreadas
  const handleStatusChange = useCallback((status: string | null) => {
    setFilters((prev) => ({ ...prev, status }))
  }, [])

  const handlePaymentStatusChange = useCallback((paymentStatus: string | null) => {
    setFilters((prev) => ({ ...prev, paymentStatus }))
  }, [])

  const handleDateChange = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, date }))
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      if (profile.role !== 'ADMIN' && profile.role !== 'GERENTE' && profile.role !== 'ATENDENTE') {
        router.push('/auth/login')
      }
    }
  }, [user, profile, loading, router])

  // O DashboardLayout garante o user básico.
  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Pedidos - Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Voltar"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    📦 Pedidos
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {profile?.role === 'ADMIN' || profile?.role === 'GERENTE'
                      ? 'Gerenciar todos os pedidos e pagamentos'
                      : 'Consultar pedidos'}
                  </p>
                </div>
              </div>
              {(profile?.role === 'ADMIN' || profile?.role === 'GERENTE') && (
                <Link
                  href="/dashboard/orders/new"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Novo Pedido
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔍 Filtros
            </h2>
            <OrderFilters
              onStatusChange={handleStatusChange}
              onPaymentStatusChange={handlePaymentStatusChange}
              onDateChange={handleDateChange}
              onSearchChange={handleSearchChange}
              searchQuery={filters.search}
              selectedStatus={filters.status}
              selectedPaymentStatus={filters.paymentStatus}
              selectedDate={filters.date}
            />
          </div>

          {/* Visualização de Pedidos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pedidos
              </h2>
              <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                <button
                   onClick={() => setViewMode('timeline')}
                   className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <Kanban className="w-4 h-4" /> Timeline
                </button>
                <button
                   onClick={() => setViewMode('calendar')}
                   className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <CalendarIcon className="w-4 h-4" /> Calendário
                </button>
                <button
                   onClick={() => setViewMode('list')}
                   className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <LayoutList className="w-4 h-4" /> Lista
                </button>
              </div>
            </div>
            
            <div className={`overflow-hidden ${viewMode !== 'list' ? 'p-4' : ''}`}>
              {viewMode === 'list' && <OrderList filters={filters} />}
              {viewMode === 'timeline' && <OrderTimeline filters={filters} />}
              {viewMode === 'calendar' && <OrderCalendar filters={filters} />}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
