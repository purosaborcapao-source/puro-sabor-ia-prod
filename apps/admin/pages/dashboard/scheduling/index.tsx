'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { supabase } from '@atendimento-ia/supabase';

interface OrderEntry {
  id: string;
  number: string;
  delivery_date: string;
  status: string;
  total: number;
  customer_name: string;
}

/** Página de agenda — visualiza pedidos por mês/dia. Sem slots de capacidade. */
export default function SchedulingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, number, delivery_date, status, total,
          customers:customer_id(name)
        `)
        .gte('delivery_date', startDate.toISOString())
        .lte('delivery_date', endDate.toISOString())
        .neq('status', 'CANCELADO')
        .order('delivery_date');

      if (error) throw error;

      setOrders(
        (data || []).map((o: any) => ({
          id: o.id,
          number: o.number,
          delivery_date: o.delivery_date,
          status: o.status,
          total: o.total,
          customer_name: o.customers?.name || 'Desconhecido',
        }))
      );
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getOrdersForDay = (day: number) =>
    orders.filter((o) => {
      const d = new Date(o.delivery_date);
      return (
        d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getDate() === day
      );
    });

  const selectedDayOrders = selectedDay ? getOrdersForDay(selectedDay) : [];

  const statusColors: Record<string, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    CONFIRMADO: 'bg-blue-100 text-blue-800',
    PRODUCAO: 'bg-purple-100 text-purple-800',
    PRONTO: 'bg-teal-100 text-teal-800',
    ENTREGUE: 'bg-green-100 text-green-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📅 Agenda de Pedidos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Visualize os pedidos por data — sem limite de capacidade.</p>
          </div>
          <Link
            href="/dashboard/orders/new"
            className="px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition"
          >
            + Novo Pedido
          </Link>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold capitalize text-gray-900">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="py-3 text-center text-xs font-black uppercase tracking-widest text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 bg-gray-50/50" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayOrders = loading ? [] : getOrdersForDay(day);
              const isToday =
                new Date().getFullYear() === currentDate.getFullYear() &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getDate() === day;
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-24 p-2.5 border-t border-l border-gray-100 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 ring-2 ring-inset ring-blue-400'
                      : dayOrders.length > 0
                      ? 'bg-emerald-50/40 hover:bg-emerald-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span
                      className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-black text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {day}
                    </span>
                    {dayOrders.length > 0 && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        {dayOrders.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayOrders.slice(0, 2).map((o) => (
                      <p key={o.id} className="text-[9px] font-semibold text-gray-600 truncate leading-tight">
                        {new Date(o.delivery_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h {o.customer_name.split(' ')[0]}
                      </p>
                    ))}
                    {dayOrders.length > 2 && (
                      <p className="text-[9px] text-gray-400 font-bold">+{dayOrders.length - 2} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedDay && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
              {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {' '}— {selectedDayOrders.length} pedido{selectedDayOrders.length !== 1 ? 's' : ''}
            </h3>

            {selectedDayOrders.length === 0 ? (
              <div className="flex items-center gap-3 text-gray-400 py-4">
                <Package className="w-5 h-5" />
                <p className="text-sm">Nenhum pedido para este dia.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono w-14 shrink-0">
                        {new Date(o.delivery_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{o.customer_name}</p>
                        <p className="text-xs text-gray-400">#{String(o.number).slice(-4)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
