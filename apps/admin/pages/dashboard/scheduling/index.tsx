'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { supabase } from '@atendimento-ia/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@atendimento-ia/supabase';

type DeliverySlot = Tables<'delivery_slots'>;

interface SlotWithCount extends DeliverySlot {
  ordersCount: number;
  capacity: number;
}

export default function SchedulingPage() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<SlotWithCount[]>([]);
  const [, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithCount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'GERENTE';

  // Fetch slots for the month
  const fetchSlots = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const { data: slotsData, error: slotsError } = await supabase
        .from('delivery_slots')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (slotsError) throw slotsError;

      // Get order counts for each slot
      const slotsWithCounts = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact' })
            .eq('delivery_date', slot.date)
            .neq('status', 'CANCELADO');

          return {
            ...slot,
            ordersCount: count || 0,
            capacity: slot.max_orders - (count || 0),
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

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handleBlockSlot = async () => {
    if (!selectedSlot) return;

    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({
          blocked: true,
          blocked_reason: blockReason || 'Bloqueado',
        })
        .eq('id', selectedSlot.id);

      if (error) throw error;

      setBlockReason('');
      setShowModal(false);
      await fetchSlots();
    } catch (error) {
      console.error('Erro ao bloquear slot:', error);
    }
  };

  const handleUnblockSlot = async () => {
    if (!selectedSlot) return;

    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({
          blocked: false,
          blocked_reason: null,
        })
        .eq('id', selectedSlot.id);

      if (error) throw error;

      setShowModal(false);
      await fetchSlots();
    } catch (error) {
      console.error('Erro ao desbloquear slot:', error);
    }
  };

  const handleUpdateCapacity = async (newMax: number) => {
    if (!selectedSlot) return;

    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({ max_orders: newMax })
        .eq('id', selectedSlot.id);

      if (error) throw error;

      await fetchSlots();
    } catch (error) {
      console.error('Erro ao atualizar capacidade:', error);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const getDaySlot = (day: number): SlotWithCount | null => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split('T')[0];

    return slots.find((s) => s.date === dateStr) || null;
  };

  const getStatusColor = (slot: SlotWithCount | null, day: number) => {
    if (!slot || day === 0) return 'bg-gray-50';
    if (slot.blocked) return 'bg-red-100';
    if (slot.capacity === 0) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  const getStatusIcon = (slot: SlotWithCount | null) => {
    if (!slot) return null;
    if (slot.blocked) return '🚫';
    if (slot.capacity === 0) return '⚠️';
    return '✅';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📅 Agendamento de Entregas
          </h1>
          <p className="text-gray-600">
            Gerencie a disponibilidade de datas para entrega
          </p>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold capitalize">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0 border-b">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div
                key={day}
                className="p-4 text-center font-semibold text-gray-700 bg-gray-100"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-32 bg-gray-50"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const slot = getDaySlot(day);
              const bgColor = getStatusColor(slot, day);
              const icon = getStatusIcon(slot);

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (slot) {
                      setSelectedSlot(slot);
                      setShowModal(true);
                    }
                  }}
                  className={`min-h-32 p-3 border border-gray-200 cursor-pointer hover:shadow-md transition ${bgColor} ${
                    slot ? 'hover:bg-opacity-75' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900">{day}</span>
                    {icon && <span className="text-lg">{icon}</span>}
                  </div>

                  {slot && (
                    <div className="text-sm">
                      {slot.blocked ? (
                        <div className="text-red-700 font-semibold flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          Bloqueado
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-700 font-semibold">
                            {slot.ordersCount}/{slot.max_orders}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {slot.capacity} slots
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
            <div className="w-6 h-6 bg-green-100 rounded"></div>
            <div>
              <div className="font-semibold text-gray-900">Disponível</div>
              <div className="text-sm text-gray-600">Há slots disponíveis</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
            <div className="w-6 h-6 bg-yellow-100 rounded"></div>
            <div>
              <div className="font-semibold text-gray-900">Cheio</div>
              <div className="text-sm text-gray-600">Capacidade atingida</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
            <div className="w-6 h-6 bg-red-100 rounded"></div>
            <div>
              <div className="font-semibold text-gray-900">Bloqueado</div>
              <div className="text-sm text-gray-600">Data indisponível</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              {new Date(selectedSlot.date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            {selectedSlot.blocked ? (
              <div className="mb-4">
                <div className="bg-red-50 p-3 rounded-lg mb-4">
                  <p className="text-red-700 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {selectedSlot.blocked_reason || 'Bloqueado'}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleUnblockSlot}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Desbloquear Data
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Pedidos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedSlot.ordersCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacidade</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedSlot.max_orders}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Atualizar capacidade máxima
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      defaultValue={selectedSlot.max_orders}
                      onChange={(e) =>
                        handleUpdateCapacity(parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {isAdmin && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mt-4">
                      Motivo para bloquear (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Feriado, manutenção..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <button
                      onClick={handleBlockSlot}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
                    >
                      Bloquear Data
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowModal(false);
                setBlockReason('');
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
