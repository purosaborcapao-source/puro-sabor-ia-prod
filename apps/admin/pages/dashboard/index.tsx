import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { PendenciasList, usePendencias } from '@/components/Dashboard/PendenciasList'
import { DayMetrics } from '@/components/Dashboard/DayMetrics'
import { SchedulingWidget } from '@/components/Dashboard/SchedulingWidget'
import { useEffect, useState } from 'react'
import { supabase } from '@atendimento-ia/supabase'

interface DayMetricsData {
  deliveryCount: number
  totalDue: number
  totalReceived: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const basePendencias = usePendencias()
  const [pendencias, setPendencias] = useState(basePendencias)
  const [dayMetrics, setDayMetrics] = useState<DayMetricsData | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      // Check if user has permission to access admin dashboard
      if (profile.role !== 'ADMIN' && profile.role !== 'GERENTE' && profile.role !== 'ATENDENTE') {
        router.push('/auth/login')
      }
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (!profile) return

    const loadPendenciasAndMetrics = async () => {
      try {
        // 1. Mensagens não respondidas (Simplificado para debug)
        const { data: mensagens, error: msgErr } = await supabase
          .from('messages')
          .select('id')
          .limit(10)

        if (msgErr) console.error('❌ Erro Mensagens:', msgErr)

        // 2. Pedidos pendentes
        const { data: pedidosPendentes } = await supabase
          .from('orders')
          .select('id')
          .eq('status', 'PENDENTE')

        // 3. Sinais a receber (próx. 3 dias)
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

        const { data: sinaisData } = await supabase
          .from('orders')
          .select('id')
          .neq('payment_status', 'QUITADO')
          .lte('delivery_date', threeDaysFromNow.toISOString().split('T')[0])
          .gte('delivery_date', new Date().toISOString().split('T')[0])

        const sinaisAReceber = sinaisData || []

        // 4. Alterações solicitadas (não processadas)
        const { data: changesData } = await supabase
          .from('order_changes')
          .select('id')
          .limit(10) // Mock por enquanto, mas tabela existe

        const alteracoes = changesData || []

        // 5. Pagamentos aguardando confirmação
        const { data: pagamentosData } = await supabase
          .from('payment_entries')
          .select('id')
          .eq('status', 'AGUARDANDO_CONFIRMACAO')

        const pagamentosAguardando = pagamentosData || []

        // Atualizar pendências
        const updatedPendencias = basePendencias.map((p) => {
          if (p.type === 'mensagens') return { ...p, count: mensagens?.length || 0 }
          if (p.type === 'pedidos') return { ...p, count: pedidosPendentes?.length || 0 }
          if (p.type === 'sinais') return { ...p, count: sinaisAReceber?.length || 0 }
          if (p.type === 'alteracoes') return { ...p, count: alteracoes?.length || 0 }
          if (p.type === 'pagamentos') return { ...p, count: pagamentosAguardando.length }
          return p
        })
        setPendencias(updatedPendencias)

        // Números do dia
        const todayStr = new Date().toISOString().split('T')[0]

        // a. Pedidos de hoje (Volume Operacional)
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('total, payment_status')
          .eq('delivery_date', todayStr)

        // b. Recebido hoje (Fluxo de Caixa)
        // Somar pagamentos confirmados com 'confirmed_at' hoje
        const { data: todayPayments } = await supabase
          .from('payment_entries')
          .select('valor')
          .eq('status', 'CONFIRMADO')
          .gte('confirmed_at', todayStr + 'T00:00:00')
          .lte('confirmed_at', todayStr + 'T23:59:59')

        const deliveryCount = todayOrders?.length || 0
        const totalVolume = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
        const totalReceived = todayPayments?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0
        
        // A receber hoje (Saldo dos pedidos de hoje)
        // Isso é complexo se não tivermos o total confirmado por pedido, 
        // mas vamos aproximar ou simplificar para: totalVolume - totalReceived_daqueles_pedidos
        const totalDue = Math.max(0, totalVolume - totalReceived)

        setDayMetrics({
          deliveryCount,
          totalDue,
          totalReceived
        })
      } catch (error) {
        console.error('Erro ao carregar pendências:', error)
      } finally {
        setMetricsLoading(false)
      }
    }

    loadPendenciasAndMetrics()
  }, [profile, basePendencias])

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
        {/* Header Ops Center */}
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

        {/* Main Content */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Top Tier: Day Metrics (HUD) */}
          <section>
            {dayMetrics && (
              <DayMetrics
                data={{
                  ...dayMetrics,
                  date: new Date().toISOString().split('T')[0]
                }}
              />
            )}
          </section>

          {/* Grid Layout (2 cols Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Lado Esquerdo: Pendências (Mission Critical) */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xs font-black tracking-widest uppercase text-red-600 dark:text-red-500 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-red-500"></span> AÇÕES CRÍTICAS
              </h2>
              <PendenciasList
                pendencias={pendencias}
                userRole={(profile?.role || 'ATENDENTE') as 'ADMIN' | 'GERENTE' | 'ATENDENTE'}
              />
            </div>

            {/* Lado Direito: Agendamento */}
            <div className="lg:col-span-5 space-y-4">
               <h2 className="text-xs font-black tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-gray-500"></span> CALENDÁRIO OPERACIONAL
              </h2>
              <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                <SchedulingWidget />
              </div>
            </div>
          </div>

          {/* Command Dock (Ações Rápidas) */}
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
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
