import React from 'react'

interface DayMetricsData {
  ordersToday: number
  pendingOrders: number
  newMessages: number
  nextWeekOrders: number
}

interface DayMetricsProps {
  data: DayMetricsData
}

export function DayMetrics({ data }: DayMetricsProps) {
  return (
    <div className="w-full flex flex-col md:flex-row border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] mt-4 shadow-sm">
      {/* Bloco 1: PEDIDOS DE HOJE */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Pedidos Hoje
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-500 leading-none">
            {data.ordersToday}
          </p>
          <span className="text-xs font-medium text-gray-400">entregas</span>
        </div>
      </div>

      {/* Bloco 2: PENDENTES */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          A Confirmar
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-orange-600 dark:text-orange-500 leading-none">
            {data.pendingOrders}
          </p>
          <span className="text-xs font-medium text-gray-400">pendentes</span>
        </div>
      </div>

      {/* Bloco 3: MENSAGENS NOVAS */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Mensagens Novas
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-emerald-600 dark:text-emerald-500 leading-none">
            {data.newMessages}
          </p>
          <span className="text-xs font-medium text-gray-400">não lidas</span>
        </div>
      </div>

      {/* Bloco 4: PRÓXIMA SEMANA */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
          Próximos 7 Dias
        </h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-purple-600 dark:text-purple-500 leading-none">
            {data.nextWeekOrders}
          </p>
          <span className="text-xs font-medium text-gray-400">agendados</span>
        </div>
      </div>
    </div>
  )
}