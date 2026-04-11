import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { supabase } from '@atendimento-ia/supabase';
import { Tables } from '@atendimento-ia/supabase';

type DeliverySlot = Tables<'delivery_slots'>;

interface SlotStatus extends DeliverySlot {
  ordersCount: number;
  capacity: number;
  dayName: string;
}

export function SchedulingWidget() {
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: slotsData, error } = await supabase
          .from('delivery_slots')
          .select('*')
          .gte('date', today.toISOString().split('T')[0])
          .lte('date', nextWeek.toISOString().split('T')[0])
          .order('date');

        if (error) throw error;

        // Get order counts for each slot
        const slotsWithCounts = await Promise.all(
          (slotsData || []).map(async (slot) => {
            const { count } = await supabase
              .from('orders')
              .select('id', { count: 'exact' })
              .eq('delivery_date', slot.date)
              .neq('status', 'CANCELADO');

            const slotDate = new Date(slot.date);
            const dayName = slotDate.toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });

            return {
              ...slot,
              ordersCount: count || 0,
              capacity: slot.max_orders - (count || 0),
              dayName,
            };
          })
        );

        setSlots(slotsWithCounts);
      } catch (error) {
        console.error('Erro ao buscar slots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {slots.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/10">
          <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs uppercase tracking-widest font-bold">Sem slots ativos</p>
        </div>
      ) : (
        slots.map((slot, idx) => {
          const isLast = idx === slots.length - 1;
          return (
            <div
              key={slot.id}
              className={`p-4 flex items-center justify-between bg-white dark:bg-[#0A0A0A] ${
                !isLast ? 'border-b border-gray-200 dark:border-gray-800' : ''
              } 
              ${slot.blocked 
                  ? 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10' 
                  : slot.capacity === 0
                    ? 'border-l-4 border-l-orange-500'
                    : 'border-l-4 border-l-emerald-500'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-center w-12 shrink-0">
                   <div className="font-black text-lg text-gray-900 dark:text-gray-100 leading-none">
                     {slot.dayName.split(',')[0]}
                   </div>
                </div>

                <div>
                  {slot.blocked ? (
                    <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                      BLOQUEADO // {slot.blocked_reason}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                      <span className="text-gray-900 dark:text-white">{slot.ordersCount}</span>/{slot.max_orders} VENDIDOS
                      {slot.capacity > 0 && <span className="text-emerald-600 dark:text-emerald-500 ml-2">[{slot.capacity} LIVRES]</span>}
                    </div>
                  )}
                </div>
              </div>
              
              {slot.capacity === 0 && !slot.blocked && (
                <div className="text-[10px] font-black px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 uppercase">
                  LOTADO
                </div>
              )}
            </div>
          );
        })
      )}

      <Link
        href="/dashboard/scheduling"
        className="block w-full p-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-center text-xs font-black tracking-widest uppercase text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        [ GERENCIAR SLOTS ]
      </Link>
    </div>
  );
}
