import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@atendimento-ia/supabase'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronRight, AlertCircle, Brain } from 'lucide-react'

interface Order {
  id: string
  number: string
  customer_id: string
  customer_name?: string
  product_name?: string
  delivery_date: string
  total: number
  status: string
  payment_status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE'
  order_number?: number
  has_ai_suggestion?: boolean
  customer_obs?: string
}

interface OrderListProps {
  filters?: {
    status?: string | null
    paymentStatus?: string | null
    date?: string | null
    search?: string
  }
}

export const OrderList = React.memo(function OrderList({ filters = {} }: OrderListProps) {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoizar loadOrders com as dependências corretas
  const loadOrders = useCallback(async () => {
    try {
      // Silent Refresh: Só mostra loading se a lista estiver vazia
      if (orders.length === 0) {
        setLoading(true)
      }
      setError(null)

      console.log('🔄 Iniciando busca de pedidos...')

      let query = supabase
        .from('orders')
        .select(`
          id,
          number,
          order_number,
          customer_id,
          delivery_date,
          total,
          status,
          customer_obs,
          payment_status,
          customers:customer_id(id,name),
          order_items(id,product_id,quantity, products:product_id(name)),
          order_changes(id, status, is_ai_suggestion)
        `, { count: 'exact' })
        .neq('status', 'CANCELADO')
        .order('delivery_date', { ascending: true })
        .order('payment_status', { ascending: false })

      // Aplicar filtros
      if (filters.status) {
        console.log('📌 Aplicando filtro de status:', filters.status)
        query = query.eq('status', filters.status as any)
      }

      if (filters.paymentStatus) {
        console.log('📌 Aplicando filtro financeiro:', filters.paymentStatus)
        query = query.eq('payment_status', filters.paymentStatus as any)
      }

      if (filters.date) {
        console.log('📌 Aplicando filtro de data:', filters.date)
        query = query.eq('delivery_date', filters.date)
      }

      const { data, error: err } = await query
        .range(0, 49)

      if (err) {
        console.error('❌ Erro Supabase:', {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint
        })
        throw err
      }

      console.log('✅ Resposta Supabase recebida:', {
        totalRegistros: data?.length || 0,
        estruturaPrimeiro: data?.[0] ? Object.keys(data[0]) : 'sem dados'
      })

      // Processar dados e aplicar filtro de busca
      let processedOrders: Order[] = (data || []).map((order: any) => {
        const itemNames = order.order_items?.map((i: any) => i.products?.name).filter(Boolean) || [];
        const productName = itemNames.length === 1 
          ? itemNames[0] 
          : itemNames.length > 1 
            ? `${itemNames.length} itens (${itemNames[0]}...)`
            : 'N/A';

        return {
          id: order.id,
          number: order.order_number || order.number,
          customer_id: order.customer_id,
          customer_name: order.customers?.name || 'N/A',
          product_name: productName,
          delivery_date: order.delivery_date,
          total: order.total,
          status: order.status,
          payment_status: order.payment_status || 'SINAL_PENDENTE',
          order_number: order.order_number,
          customer_obs: order.customer_obs || '',
          has_ai_suggestion: order.order_changes?.some((oc: any) => oc.is_ai_suggestion && oc.status === 'PENDENTE')
        };
      })

      // Aplicar filtro de busca no lado do cliente (mais flexível para buscas em múltiplos campos)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        processedOrders = processedOrders.filter(order => 
          order.customer_name?.toLowerCase().includes(query) ||
          String(order.number).toLowerCase().includes(query) ||
          String(order.order_number || '').includes(query) ||
          order.product_name?.toLowerCase().includes(query)
        );
      }

      console.log('✅ Pedidos processados e prontos:', processedOrders.length)
      setOrders(processedOrders)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar pedidos'
      console.error('❌ Erro ao tentar buscar:', {
        mensagem: message,
        tipoErro: err instanceof Error ? 'Error' : typeof err,
        erroCompleto: err
      })
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.paymentStatus, filters.date, filters.search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Carregando pedidos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900 dark:text-red-200">Erro ao carregar pedidos</h3>
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Nenhum pedido encontrado</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              #Pedido
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Produto
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Entrega
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Total
            </th>
            {(profile?.role === 'ADMIN' || profile?.role === 'GERENTE') && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status Fin.
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                  #{order.order_number || String(order.number).slice(-4)}
                  {order.has_ai_suggestion && (
                    <span title="Sugestão da IA pendente"><Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" /></span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {order.customer_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{order.product_name}</div>
                  {order.customer_obs && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-500 italic mt-0.5 line-clamp-1" title={order.customer_obs}>
                      Obs: {order.customer_obs}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {order.total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </td>
              {(profile?.role === 'ADMIN' || profile?.role === 'GERENTE') && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <PaymentStatusBadge status={order.payment_status} showLabel={false} />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                    order.status === 'ENTREGUE' ? 'bg-green-100 text-green-800 border-green-200' : 
                    order.status === 'CONFIRMADO' || order.status === 'ACEITO' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' :
                    order.status === 'PREPARANDO' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    order.status === 'PRONTO' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    order.status === 'SAIU_ENTREGA' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    order.status === 'CANCELADO' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Ver detalhes"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
