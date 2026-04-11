import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import Link from 'next/link'
import { ArrowLeftIcon, Phone, Calendar, ShoppingBag, MessageCircle } from 'lucide-react'
import { WhatsAppPanel } from '@/components/Orders/WhatsAppPanel'

interface Customer {
  id: string
  name: string
  phone: string
  created_at: string
}

interface Order {
  id: string
  number: string
  delivery_date: string
  total: number
  status: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, profile, loading: authLoading } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (id) {
      loadCustomerData()
    }
  }, [id, loadCustomerData])

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 1. Dados do Cliente
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (custErr) throw custErr
      setCustomer(custData)

      // 2. Histórico de Pedidos
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, number, delivery_date, total, status')
        .eq('customer_id', id)
        .order('delivery_date', { ascending: false })
      
      if (ordersErr) throw ordersErr
      setOrders(ordersData || [])

    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  if (loading || authLoading || !customer) {
    return <div className="p-8 text-center text-gray-500 uppercase font-black text-[10px] tracking-widest">Acessando registros...</div>
  }

  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <>
      <Head>
        <title>{customer.name} - Perfil do Cliente</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-6">
            <Link href="/dashboard/customers" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 dark:text-white uppercase">
                Customer Profile: <span className="text-emerald-600 dark:text-emerald-500">{customer.name}</span>
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Lado Esquerdo: Info e Pedidos */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Resumo HUD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Gasto (LTV)</p>
                  <p className="text-xl font-black text-emerald-600">
                    {totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Frequência</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{orders.length} Pedidos</p>
                </div>
                <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente desde</p>
                  <p className="text-xl font-black text-blue-600">{new Date(customer.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Detalhes de Contato
                </h2>
                <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   WhatsApp: <span className="text-emerald-500 font-mono tracking-tighter">{customer.phone}</span>
                </div>
              </div>

              {/* Histórico de Pedidos */}
              <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                   <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3 h-3" /> Histórico de Pedidos
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-gray-900/20 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                       <tr>
                         <th className="px-6 py-3 text-left">Nº Pedido</th>
                         <th className="px-6 py-3 text-left">Data Entrega</th>
                         <th className="px-6 py-3 text-left">Valor</th>
                         <th className="px-6 py-3 text-left">Status</th>
                         <th className="px-6 py-3 text-right">Ação</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-[#111] transition-all">
                          <td className="px-6 py-4 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tighter">#{order.number}</td>
                          <td className="px-6 py-4 text-[10px] text-gray-500 font-bold uppercase tracking-tight">{new Date(order.delivery_date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 text-xs font-black text-gray-900 dark:text-white">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase">{order.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Link href={`/dashboard/orders/${order.id}`} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Ver Pedido</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Lado Direito: Chat WhatsApp */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-8">
                 <WhatsAppPanel phone={customer.phone} customerId={customer.id} />
                 
                 <div className="mt-4 p-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MessageCircle className="w-3 h-3 text-blue-500" /> Notas de Atendimento
                    </h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed italic">
                      &quot;Cliente prefere contato após as 14h. Gosta de embalagens premium para presentes.&quot;
                    </p>
                 </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
