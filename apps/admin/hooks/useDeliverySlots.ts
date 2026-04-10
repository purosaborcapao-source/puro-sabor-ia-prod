import { useEffect, useState } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { Tables } from '@atendimento-ia/supabase';

type DeliverySlot = Tables<'delivery_slots'>;

interface SlotValidation {
  isAvailable: boolean;
  message: string;
  slot: DeliverySlot | null;
}

const MIN_LEAD_TIME_HOURS = 48; // Prazo mínimo padrão

export function useDeliverySlots() {
  const [minLeadTime, setMinLeadTime] = useState(MIN_LEAD_TIME_HOURS);
  const [loading, setLoading] = useState(true);

  // Fetch min lead time from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'min_lead_time_hours')
          .single();

        if (data && typeof data.value === 'number') {
          setMinLeadTime(data.value);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /**
   * Valida se uma data de entrega é válida para novo pedido
   */
  const validateDeliveryDate = async (
    deliveryDate: string
  ): Promise<SlotValidation> => {
    try {
      // Check if date is at least minLeadTime hours in the future
      const now = new Date();
      const delivery = new Date(deliveryDate);
      const hoursAhead = (delivery.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursAhead < minLeadTime) {
        return {
          isAvailable: false,
          message: `Prazo mínimo é ${minLeadTime} horas. Próximas datas disponíveis a partir de ${new Date(now.getTime() + minLeadTime * 60 * 60 * 1000).toLocaleDateString('pt-BR')}.`,
          slot: null,
        };
      }

      // Fetch slot for this date
      const { data: slot, error } = await supabase
        .from('delivery_slots')
        .select('*')
        .eq('date', deliveryDate)
        .single();

      if (error) {
        return {
          isAvailable: false,
          message: 'Data não encontrada no calendário',
          slot: null,
        };
      }

      if (!slot) {
        return {
          isAvailable: false,
          message: 'Esta data não está disponível',
          slot: null,
        };
      }

      if (slot.blocked) {
        return {
          isAvailable: false,
          message: `Data indisponível: ${slot.blocked_reason || 'Bloqueado pelo administrador'}`,
          slot,
        };
      }

      // Check capacity
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('delivery_date', deliveryDate)
        .neq('status', 'CANCELADO');

      if ((ordersCount || 0) >= slot.max_orders) {
        return {
          isAvailable: false,
          message: `Capacidade atingida para ${new Date(deliveryDate).toLocaleDateString('pt-BR')}. Escolha outra data.`,
          slot,
        };
      }

      return {
        isAvailable: true,
        message: `✅ Disponível - ${slot.max_orders - (ordersCount || 0)} slots`,
        slot,
      };
    } catch (error) {
      console.error('Erro ao validar data:', error);
      return {
        isAvailable: false,
        message: 'Erro ao validar disponibilidade',
        slot: null,
      };
    }
  };

  /**
   * Atualiza o contador de pedidos quando um pedido é criado
   */
  const incrementSlotCount = async (deliveryDate: string): Promise<boolean> => {
    try {
      const { data: slot, error: slotError } = await supabase
        .from('delivery_slots')
        .select('current_orders')
        .eq('date', deliveryDate)
        .single();

      if (slotError) throw slotError;

      const { error: updateError } = await supabase
        .from('delivery_slots')
        .update({
          current_orders: (slot.current_orders || 0) + 1,
        })
        .eq('date', deliveryDate);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar slot:', error);
      return false;
    }
  };

  /**
   * Decrementa o contador quando um pedido é cancelado
   */
  const decrementSlotCount = async (deliveryDate: string): Promise<boolean> => {
    try {
      const { data: slot, error: slotError } = await supabase
        .from('delivery_slots')
        .select('current_orders')
        .eq('date', deliveryDate)
        .single();

      if (slotError) throw slotError;

      const newCount = Math.max(0, (slot.current_orders || 0) - 1);

      const { error: updateError } = await supabase
        .from('delivery_slots')
        .update({
          current_orders: newCount,
        })
        .eq('date', deliveryDate);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar slot:', error);
      return false;
    }
  };

  /**
   * Gets available dates (next 30 days)
   */
  const getAvailableDates = async (): Promise<string[]> => {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: slots, error } = await supabase
        .from('delivery_slots')
        .select('date, blocked, current_orders, max_orders')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', futureDate.toISOString().split('T')[0])
        .eq('blocked', false)
        .order('date');

      if (error) throw error;

      const availableDates = (slots || [])
        .filter((slot) => slot.current_orders < slot.max_orders)
        .map((slot) => slot.date);

      return availableDates;
    } catch (error) {
      console.error('Erro ao buscar datas disponíveis:', error);
      return [];
    }
  };

  return {
    loading,
    minLeadTime,
    validateDeliveryDate,
    incrementSlotCount,
    decrementSlotCount,
    getAvailableDates,
  };
}
