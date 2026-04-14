import { useCallback } from 'react';

/**
 * Hook stub — delivery_slots foi removido do sistema.
 * Mantido apenas para compatibilidade de imports legados.
 * @deprecated Use DeliveryDateSelector diretamente com datetime-local.
 */
export function useDeliverySlots() {
  const validateDeliveryDate = useCallback(async (_date: string) => {
    return { isAvailable: true, message: 'Data livre — sem slots de capacidade.', slot: null };
  }, []);

  const incrementSlotCount = useCallback(async (_date: string) => true, []);
  const decrementSlotCount = useCallback(async (_date: string) => true, []);
  const getAvailableDates = useCallback(async () => [] as string[], []);

  return {
    loading: false,
    minLeadTime: 0,
    validateDeliveryDate,
    incrementSlotCount,
    decrementSlotCount,
    getAvailableDates,
  };
}
