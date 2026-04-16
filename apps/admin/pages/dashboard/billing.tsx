import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@atendimento-ia/supabase'
import { ArrowLeftIcon, Search, Filter, AlertTriangle, MessageCircle, ChevronRight, DollarSign, Calendar, User, Loader2 } from 'lucide-react'
import { PaymentStatusBadge } from '@/components/Orders/PaymentStatusBadge'

interface OrderDebt {
  id: string
  number: string
  order_number?: number
  delivery_date: string
  total: number
  balance_due: number
  debt_classification: string
  debt_notes: string
  status: string
  customers: {
    name: string
    phone: string
  }
}

export default function BillingPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState<OrderDebt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL')

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('orders')
        .select(`
          id,
          number,
          order_number,
          delivery_date,
          total,
          balance_due,
          status,
          debt_classification,
          debt_notes,
          customers:customer_id(name, phone)
        `)
        .eq('status', 'ENTREGUE')
        .gt('balance_due', 0)
        .order('delivery_date', { ascending: false })

      if (selectedClassification !== 'ALL') {
        query = query.eq('debt_classification', selectedClassification)
      }

      const { data, error: err } = await query

      if (err) throw err

      setOrders((data as any[]) || [])
    } catch (err: any) {
      console.error('Erro ao carregar dados de cobrança:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassification])

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  const filteredOrders = orders.filter(o => 
    o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.number?.toLowerCase().includes(search.toLowerCase()) ||
    String(o.order_number || '').includes(search)
  )

  const stats = {
    totalDue: orders.reduce((sum, o) => sum + (o.balance_due || 0), 0),
    count: orders.length
  }

  if (!user) return null

  return (
    <>
      <Head>
        <title>Central de Cobrança - Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                    Central de Cobrança
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gestão de pedidos entregues com saldo pendente (Pós-Venda)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total na Rua</p>
                    <p className="text-xl font-black text-red-600 dark:text-red-400">
                      {stats.totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pedidos</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">
                      {stats.count}
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm appearance-none"
              >
                <option value="ALL">Todas as Classificações</option>
                <option value="CLIENTE_PAGARA_AMANHA">Cliente pagará amanhã</option>
                <option value="ERRO_OPERACIONAL">Erro operacional</option>
                <option value="FIADO">Fiado</option>
                <option value="ESQUECIMENTO">Esquecimento</option>
                <option value="RECLAMACAO_QUALIDADE">Reclamação de Qualidade</option>
                <option value="COMBINADO">Combinado</option>
              </select>
            </div>

            <button 
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄'} 
              Atualizar Lista
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pedido</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Entrega</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo Devedor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Classificação</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Carregando dados...</td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhuma pendência encontrada.</td>
                    </tr>
                  ) : filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.order_number || order.number.slice(-4)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{order.customers?.name}</span>
                          <span className="text-xs text-gray-500">{order.customers?.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(order.delivery_date).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-red-600 dark:text-red-400">
                          {order.balance_due.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <p className="text-[10px] text-gray-400 uppercase">Total: {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-[10px] font-bold uppercase border border-orange-200 dark:border-orange-800">
                            <AlertTriangle className="w-3 h-3" />
                            {order.debt_classification?.replace(/_/g, ' ')}
                          </span>
                          {order.debt_notes && (
                            <p className="text-[10px] text-gray-500 italic max-w-[200px] truncate" title={order.debt_notes}>
                            &quot;{order.debt_notes}&quot;
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Ir para o Pedido"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Link>
                          <a
                            href={`https://wa.me/${order.customers?.phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
