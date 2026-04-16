import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { OrderCard, OrderCompact } from './OrderCard';
import { AlertCircle } from 'lucide-react';

interface OrderTimelineProps {
  filters?: {
    status?: string | null
    paymentStatus?: string | null
    date?: string | null
    search?: string
  }
}

const COLUMNS = [
  { id: 'PENDENTE', label: 'Aguardando Aprovação' },
  { id: 'CONFIRMADO', label: 'Aceito' },
  { id: 'PREPARANDO', label: 'Em Preparo' },
  { id: 'PRONTO', label: 'Pronto / Aguardando' },
  { id: 'ENTREGUE', label: 'Entregue' } // simplificado para o board principal
];

export const OrderTimeline = React.memo(function OrderTimeline({ filters = {} }: OrderTimelineProps) {
  const [orders, setOrders] = useState<OrderCompact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      if (orders.length === 0) setLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select(`
          id, number, order_number, customer_id, delivery_date, total, status, payment_status, customer_obs,
          customers:customer_id(id, name),
          order_items(id,product_id,quantity, products:product_id(name)),
          order_changes(id, status, is_ai_suggestion)
        `)
        .neq('status', 'CANCELADO')
        .order('delivery_date', { ascending: true });

      if (filters.status) query = query.eq('status', filters.status as any);
      if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus as any);
      if (filters.date) query = query.eq('delivery_date', filters.date);

      // Limitar a quantidade de itens no board para manter performance
      const { data, error: err } = await query.range(0, 100);
      if (err) throw err;

      let processedOrders: OrderCompact[] = (data || []).map((order: any) => {
        const itemNames = order.order_items?.map((i: any) => i.products?.name).filter(Boolean) || [];
        const productName = itemNames.length === 1 
          ? itemNames[0] 
          : itemNames.length > 1 
            ? `${itemNames.length} itens (${itemNames[0]}...)`
            : 'N/A';

        return {
          id: order.id,
          number: order.order_number || order.number,
          customer_name: order.customers?.name || 'N/A',
          product_name: productName,
          delivery_date: order.delivery_date,
          total: order.total,
          status: order.status,
          payment_status: order.payment_status || 'SINAL_PENDENTE',
          customer_obs: order.customer_obs || '',
          has_ai_suggestion: order.order_changes?.some((oc: any) => oc.is_ai_suggestion && oc.status === 'PENDENTE')
        };
      });

      if (filters.search) {
        const query = filters.search.toLowerCase();
        processedOrders = processedOrders.filter(o => 
          o.customer_name?.toLowerCase().includes(query) ||
          String(o.number).toLowerCase().includes(query) ||
          o.product_name?.toLowerCase().includes(query)
        );
      }

      setOrders(processedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando quadro...</div>;
  if (error) return <div className="p-8 text-red-500 flex items-center justify-center gap-2"><AlertCircle /> {error}</div>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)] min-h-[500px] hide-scrollbar">
      {COLUMNS.map(col => {
        const colOrders = orders.filter(o => {
          // Tratar mapeamento de ENUM se os status do banco fugirem desses IDs
          if (col.id === 'PENDENTE' && o.status === 'NOVO') return true;
          if (col.id === 'CONFIRMADO' && o.status === 'ACEITO') return true;
          return o.status === col.id;
        });

        return (
          <div key={col.id} className="min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800 p-3 h-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{col.label}</h3>
              <span className="bg-white dark:bg-gray-800 text-gray-500 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                {colOrders.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
              {colOrders.map(order => (
                <OrderCard key={order.id} order={order} viewMode="kanban" />
              ))}
              {colOrders.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg h-24 flex items-center justify-center">
                  <p className="text-xs text-gray-400">Nenhum pedido</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  );
});
