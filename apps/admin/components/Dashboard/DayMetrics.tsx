import React from 'react'

interface DayMetricsData {
  deliveryCount: number
  totalDue: number
  totalReceived: number
  date: string
}

interface DayMetricsProps {
  data: DayMetricsData
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export function DayMetrics({ data }: DayMetricsProps) {
  return (
    <div className="w-full flex flex-col md:flex-row border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] mt-4 shadow-sm">
      {/* Bloco 1: ENTREGAS */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Entregas Ativas
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-500 leading-none">
            {data.deliveryCount}
          </p>
          <span className="text-xs font-medium text-gray-400">/HOJE</span>
        </div>
      </div>

      {/* Bloco 2: A RECEBER */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Saldo Pendente
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-orange-600 dark:text-orange-500 leading-none">
            {formatCurrency(data.totalDue)}
          </p>
          <span className="text-xs font-medium text-gray-400">/SINAIS</span>
        </div>
      </div>

      {/* Bloco 3: RECEBIDO */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Fluxo Confirmado
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-green-600 dark:text-emerald-500 leading-none">
            {formatCurrency(data.totalReceived)}
          </p>
          <span className="text-xs font-medium text-gray-400">/CAIXA</span>
        </div>
      </div>
    </div>
  )
}
