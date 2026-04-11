import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { OrderCard, OrderCompact } from './OrderCard';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderCalendarProps {
  filters?: {
    status?: string | null
    paymentStatus?: string | null
    search?: string
  }
}

export const OrderCalendar = React.memo(function OrderCalendar({ filters = {} }: OrderCalendarProps) {
  const [orders, setOrders] = useState<OrderCompact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de Semanas
  const [weekOffset, setWeekOffset] = useState(0);

  const getDaysArray = useCallback(() => {
    const arr = [];
    const baseDate = new Date();
    // Ajustar para segunda-feira
    const day = baseDate.getDay(),
      diff = baseDate.getDate() - day + (day == 0 ? -6: 1); // ajusta para segunda
    
    baseDate.setDate(diff + (weekOffset * 7));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekOffset]);

  const days = getDaysArray();
  const startDateStr = days[0].toISOString().split('T')[0];
  const endDateStr = days[6].toISOString().split('T')[0];

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('orders')
        .select(`
          id, number, customer_id, delivery_date, total, status, payment_status, sinal_valor,
          customers:customer_id(id,name),
          order_items(id,product_id,quantity),
          order_changes(id, status, is_ai_suggestion)
        `)
        .neq('status', 'CANCELADO')
        // Filtrar na janela de dias visualizados
        .gte('delivery_date', `${startDateStr}T00:00:00`)
        .lte('delivery_date', `${endDateStr}T23:59:59`)
        .order('delivery_date', { ascending: true });

      if (filters.status) query = query.eq('status', filters.status as any);
      if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus as any);

      const { data, error: err } = await query.range(0, 100);
      if (err) throw err;

      let processedOrders: OrderCompact[] = (data || []).map((order: any) => ({
        id: order.id,
        number: order.order_number || order.number,
        customer_name: order.customers?.name || 'N/A',
        product_name: order.order_items?.length > 0 ? `${order.order_items.length} item(s)` : 'N/A',
        delivery_date: order.delivery_date,
        total: order.total,
        status: order.status,
        payment_status: order.payment_status || 'SINAL_PENDENTE',
        has_ai_suggestion: order.order_changes?.some((oc: any) => oc.is_ai_suggestion && oc.status === 'PENDENTE')
      }));

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        processedOrders = processedOrders.filter(
          (o) => o.number.toLowerCase().includes(searchLower) || o.customer_name?.toLowerCase().includes(searchLower)
        );
      }

      setOrders(processedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar calendários');
    } finally {
      setLoading(false);
    }
  }, [filters, startDateStr, endDateStr]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const groupOrdersByDate = (dateObj: Date) => {
    const dtStr = dateObj.toLocaleDateString('pt-BR');
    return orders.filter(o => new Date(o.delivery_date).toLocaleDateString('pt-BR') === dtStr);
  };

  const getDayName = (dateObj: Date) => {
    return dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
  };
  const getDayNum = (dateObj: Date) => {
    return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
      <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          Visão Semanal ({getDayNum(days[0])} a {getDayNum(days[6])})
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
             onClick={() => setWeekOffset(0)}
             className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-50"
          >
            Hoje
          </button>
          <button 
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Carregando calendário...</div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-500 gap-2"><AlertCircle /> {error}</div>
      ) : (
        <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800 overflow-y-auto mt-4 border-t border-gray-200 dark:border-gray-800">
          {days.map((day, idx) => {
            const dayOrders = groupOrdersByDate(day);
            const isToday = new Date().toLocaleDateString('pt-BR') === day.toLocaleDateString('pt-BR');
            return (
              <div key={idx} className={`min-w-[150px] p-2 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                <div className="text-center mb-3">
                  <p className={`text-xs uppercase font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                    {getDayName(day)}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {day.getDate()}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {dayOrders.map(order => (
                     <OrderCard key={order.id} order={order} viewMode="calendar" />
                  ))}
                  {dayOrders.length === 0 && (
                     <div className="text-center py-4">
                       <p className="text-[10px] text-gray-400">Sem pedidos</p>
                     </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
});
