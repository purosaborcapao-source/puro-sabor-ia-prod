import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useDeliverySlots } from '@/hooks/useDeliverySlots';

interface DeliveryDateSelectorProps {
  value: string;
  onChange: (date: string) => void;
  error?: string;
}

export function DeliveryDateSelector({
  value,
  onChange,
  error,
}: DeliveryDateSelectorProps) {
  const { validateDeliveryDate, getAvailableDates, loading } =
    useDeliverySlots();
  const [validation, setValidation] = useState<{
    isAvailable: boolean;
    message: string;
  } | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Fetch available dates on mount
  useEffect(() => {
    const fetchAvailable = async () => {
      const dates = await getAvailableDates();
      setAvailableDates(dates);
    };
    fetchAvailable();
  }, [getAvailableDates]);

  // Validate selected date
  useEffect(() => {
    if (!value) {
      setValidation(null);
      return;
    }

    const validateDate = async () => {
      const result = await validateDeliveryDate(value);
      setValidation(result);
    };

    validateDate();
  }, [value, validateDeliveryDate]);

  const isToday = (dateStr: string) => {
    const today = new Date();
    const selected = new Date(dateStr);
    return (
      today.getDate() === selected.getDate() &&
      today.getMonth() === selected.getMonth() &&
      today.getFullYear() === selected.getFullYear()
    );
  };

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const selected = new Date(dateStr);
    return (
      tomorrow.getDate() === selected.getDate() &&
      tomorrow.getMonth() === selected.getMonth() &&
      tomorrow.getFullYear() === selected.getFullYear()
    );
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    let prefix = '';

    if (isToday(dateStr)) {
      prefix = 'Hoje - ';
    } else if (isTomorrow(dateStr)) {
      prefix = 'Amanhã - ';
    }

    return (
      prefix +
      date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      })
    );
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700 mb-2 block">
          Data de Entrega
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            error || (validation && !validation.isAvailable)
              ? 'border-red-300'
              : 'border-gray-300'
          }`}
        >
          <option value="">Selecione uma data</option>
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {formatDateLabel(date)}
            </option>
          ))}
        </select>
      </label>

      {/* Validation Message */}
      {validation && (
        <div
          className={`flex items-start gap-3 p-3 rounded-lg ${
            validation.isAvailable
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {validation.isAvailable ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={
              validation.isAvailable
                ? 'text-green-700 text-sm'
                : 'text-red-700 text-sm'
            }
          >
            {validation.message}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Prazo mínimo de 48 horas a partir de agora
        </p>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
}
