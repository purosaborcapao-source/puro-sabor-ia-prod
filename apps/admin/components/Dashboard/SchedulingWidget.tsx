import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { supabase } from '@atendimento-ia/supabase';

interface DayGroup {
  date: string;       // ISO date string
  dayLabel: string;   // "seg, 14 abr"
  orders: { id: string; number: string; customer_name: string; delivery_date: string }[];
}

/** Widget de agenda — mostra pedidos agrupados por data (próximos 7 dias). Sem slots. */
export function SchedulingWidget() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, number, delivery_date,
            customers:customer_id(name)
          `)
          .gte('delivery_date', today.toISOString())
          .lte('delivery_date', nextWeek.toISOString())
          .neq('status', 'CANCELADO')
          .order('delivery_date');

        if (error) throw error;

        // Group by local date
        const map = new Map<string, DayGroup>();
        (data || []).forEach((o: any) => {
          const d = new Date(o.delivery_date);
          const key = d.toLocaleDateString('pt-BR');
          if (!map.has(key)) {
            map.set(key, {
              date: key,
              dayLabel: d.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }),
              orders: [],
            });
          }
          map.get(key)!.orders.push({
            id: o.id,
            number: o.number,
            customer_name: o.customers?.name || 'Desconhecido',
            delivery_date: o.delivery_date,
          });
        });

        setGroups(Array.from(map.values()));
      } catch (error) {
        console.error('Erro ao buscar pedidos da agenda:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/10">
          <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs uppercase tracking-widest font-bold">Sem pedidos nos próximos 7 dias</p>
        </div>
      ) : (
        groups.map((group, idx) => {
          const isLast = idx === groups.length - 1;
          return (
            <div
              key={group.date}
              className={`p-4 bg-white dark:bg-[#0A0A0A] border-l-4 border-l-emerald-500 ${
                !isLast ? 'border-b border-gray-200 dark:border-gray-800' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {group.dayLabel}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  {group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {group.orders.map((o) => (
                  <p key={o.id} className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                    {new Date(o.delivery_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h — {o.customer_name}
                  </p>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Link
        href="/dashboard/orders"
        className="block w-full p-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-center text-xs font-black tracking-widest uppercase text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        [ VER TODOS OS PEDIDOS ]
      </Link>
    </div>
  );
}
