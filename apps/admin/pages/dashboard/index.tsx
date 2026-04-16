import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { PendenciasList, usePendencias, Pendencia } from '@/components/Dashboard/PendenciasList'
import { DayMetrics } from '@/components/Dashboard/DayMetrics'
import { RecentMessages } from '@/components/Dashboard/RecentMessages'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@atendimento-ia/supabase'

interface DayMetricsData {
  ordersToday: number
  pendingOrders: number
  newMessages: number
  nextWeekOrders: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const basePendencias = usePendencias()
  const [pendencias, setPendencias] = useState<Pendencia[]>(basePendencias)
  const [dayMetrics, setDayMetrics] = useState<DayMetricsData | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

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

  const loadPendenciasAndMetrics = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]

      // 1. Mensagens não respondidas (conversas com status NEW)
      const { data: newConversas } = await supabase
        .from('conversations')
        .select('id')
        .eq('status', 'NEW')

      // 2. Pedidos pendentes
      const { data: pedidosPendentes } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'PENDENTE')

      // 3. Alterações solicitadas (não processadas - últimas 24h)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const { data: changesData } = await supabase
        .from('order_changes')
        .select('id')
        .gte('created_at', yesterday.toISOString())
        .limit(10)

      // 4. Pedidos com saldo devedor (ENTREGUE com balance_due > 0)
      const { data: pedidosInadimplentes } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'ENTREGUE')
        .gt('balance_due', 0)

      // Atualizar pendências (apenas as que têm query válida)
      const updatedPendencias = basePendencias.map((p) => {
        if (p.type === 'mensagens') return { ...p, count: newConversas?.length || 0 }
        if (p.type === 'pedidos') return { ...p, count: pedidosPendentes?.length || 0 }
        if (p.type === 'alteracoes') return { ...p, count: changesData?.length || 0 }
        if (p.type === 'problemas') return { 
          ...p, 
          count: pedidosInadimplentes?.length || 0, 
          label: 'Pendências Fin.',
          onViewAll: () => router.push('/dashboard/billing')
        }
        return p
      })
      setPendencias(updatedPendencias)

      // Métricas do dia
      const { data: ordersToday } = await supabase
        .from('orders')
        .select('id')
        .eq('delivery_date', todayStr)
        .neq('status', 'CANCELADO')

      const { data: ordersPending } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'PENDENTE')

      const { data: messagesNew } = await supabase
        .from('conversations')
        .select('id')
        .eq('status', 'NEW')

      const { data: nextWeekOrders } = await supabase
        .from('orders')
        .select('id')
        .gte('delivery_date', todayStr)
        .lte('delivery_date', nextWeekStr)
        .neq('status', 'CANCELADO')

      setDayMetrics({
        ordersToday: ordersToday?.length || 0,
        pendingOrders: ordersPending?.length || 0,
        newMessages: messagesNew?.length || 0,
        nextWeekOrders: nextWeekOrders?.length || 0
      })
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setMetricsLoading(false)
    }
  }, [basePendencias])

  useEffect(() => {
    if (!profile) return
    loadPendenciasAndMetrics()
  }, [profile, loadPendenciasAndMetrics])

  if (loading || metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Ops Center - Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h1 className="text-xs font-bold tracking-widest text-gray-900 dark:text-white uppercase">
                System: <span className="text-emerald-600 dark:text-emerald-400">Online</span>
              </h1>
            </div>
            <div className="text-[10px] sm:text-xs font-bold tracking-widest text-gray-400 uppercase">
              Opr: {profile?.name || 'Vazio'} <span className="hidden sm:inline">{'//'} {new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <section>
            {dayMetrics && (
              <DayMetrics
                data={{
                  ordersToday: dayMetrics.ordersToday,
                  pendingOrders: dayMetrics.pendingOrders,
                  newMessages: dayMetrics.newMessages,
                  nextWeekOrders: dayMetrics.nextWeekOrders
                }}
              />
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xs font-black tracking-widest uppercase text-orange-600 dark:text-orange-500 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-orange-500"></span> ATENÇÃO OPERACIONAL
              </h2>
              <PendenciasList
                pendencias={pendencias}
                userRole={(profile?.role || 'ATENDENTE') as 'ADMIN' | 'GERENTE' | 'ATENDENTE'}
              />
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-xs font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-500"></span> MENSAGENS RECENTES
              </h2>
              <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 shadow-sm">
                <RecentMessages />
              </div>
            </div>
          </div>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-800 mt-8">
            <h2 className="text-[10px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-500 mb-4">
              &gt;_ QUICK COMMANDS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/dashboard/orders"
                className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs">/PEDIDOS</div>
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 font-bold">→</div>
              </Link>
              
              <Link
                href="/dashboard/messages"
                className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs">/MENSAGENS</div>
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 font-bold">→</div>
              </Link>

              <Link
                href="/dashboard/products"
                className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs">/PRODUTOS</div>
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 font-bold">→</div>
              </Link>

              <Link
                href="/dashboard/customers"
                className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs">/CLIENTES</div>
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 font-bold">→</div>
              </Link>

              {(profile?.role === 'ADMIN' || profile?.role === 'GERENTE') && (
                <Link
                  href="/dashboard/users"
                  className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-500 flex items-center justify-between group transition-all shadow-sm"
                >
                  <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs text-red-600 dark:text-red-500">/SISTEMA</div>
                  <div className="text-gray-300 dark:text-gray-600 group-hover:text-red-500 font-bold">→</div>
                </Link>
              )}

              <Link
                href="/dashboard/billing"
                className="p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-500 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="text-gray-900 dark:text-white uppercase font-black tracking-wider text-xs text-emerald-600 dark:text-emerald-500">/COBRANCA</div>
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 font-bold">→</div>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}