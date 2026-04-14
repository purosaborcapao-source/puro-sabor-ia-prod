import React from 'react';
import { Calendar } from 'lucide-react';

interface DeliveryDateSelectorProps {
  value: string; // ISO datetime string (datetime-local format: YYYY-MM-DDTHH:mm)
  onChange: (date: string) => void;
  error?: string;
}

/**
 * Seletor de data e hora para entrega/retirada.
 * Sem slots — operadora define livremente a data e hora.
 * Mínimo: 1 hora a partir de agora (apenas UI, sem validação de capacidade).
 */
export function DeliveryDateSelector({ value, onChange, error }: DeliveryDateSelectorProps) {
  // Mínimo: agora + 1h, arredondado para próxima hora cheia
  const minDatetime = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    // Formato esperado pelo input datetime-local: YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Data e Hora de Entrega / Retirada
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="datetime-local"
          value={value}
          min={minDatetime}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-200 focus:border-blue-500'
          }`}
        />
      </div>

      {value && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ✅ {new Date(value).toLocaleString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <p className="text-xs text-gray-400">
        Defina a data e hora conforme combinado com a cliente.
      </p>
    </div>
  );
}
