import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@atendimento-ia/supabase'
import { ChevronRight, AlertCircle, User, Phone } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string
  orders_count: number
  total_spent: number
  last_order_date?: string
}

interface CustomerListProps {
  filters?: {
    search?: string
  }
}

export const CustomerList = React.memo(function CustomerList({ filters = {} }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Query para buscar clientes e agregar dados de pedidos
      // Nota: Em um sistema maior, usaríamos uma view ou função RPC para o LTV
      const { data: customersData, error: err } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          orders(id, total, delivery_date)
        `)
        .order('name', { ascending: true })

      if (err) throw err

      // Processar dados para calcular LTV e contagem de pedidos
      let processed: Customer[] = (customersData || []).map((c: any) => {
        const orders = c.orders || []
        const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
        const lastOrderDate = orders.length > 0 
          ? orders.sort((a: any, b: any) => {
              const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
              const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
              return dateB - dateA;
            })[0].delivery_date 
          : undefined

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          orders_count: orders.length,
          total_spent: totalSpent,
          last_order_date: lastOrderDate
        }
      })

      // Aplicar filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        processed = processed.filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.phone.toLowerCase().includes(searchLower)
        )
      }

      setCustomers(processed)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar clientes'
      console.error('❌ Erro ao buscar clientes:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters.search])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-gray-600 dark:text-gray-400 font-medium">Sincronizando base de dados...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-6 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-1" />
        <div>
          <h3 className="font-bold text-red-900 dark:text-red-400">Erro Operacional</h3>
          <p className="text-sm text-red-800 dark:text-red-400/80">{error}</p>
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-dashed border-gray-300 dark:border-gray-800">
        <User className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">Nenhum cliente identificado no sistema.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
            <th className="px-6 py-4 text-left text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              Cliente
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              Identificador (WhatsApp)
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              Pedidos
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              LTV (Total Gasto)
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              Último Contato
            </th>
            <th className="px-6 py-4 text-right text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-500 uppercase">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="group hover:bg-gray-50 dark:hover:bg-[#0A0A0A] transition-all"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                    {customer.name.substring(0, 2)}
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                    {customer.name}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 font-mono">
                  <Phone className="w-3 h-3 text-emerald-500" />
                  {customer.phone}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs font-bold text-gray-900 dark:text-gray-300">
                  {customer.orders_count} <span className="text-[10px] font-normal text-gray-500 uppercase">pedidos</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-500">
                  {customer.total_spent.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase">
                  {customer.last_order_date 
                    ? new Date(customer.last_order_date!).toLocaleDateString('pt-BR')
                    : 'Sem histórico'
                  }
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all"
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
