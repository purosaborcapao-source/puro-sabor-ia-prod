import React from 'react'
import Link from 'next/link'

interface DayMetricsData {
  ordersToday: number
  pendingOrders: number
  newMessages: number
  nextWeekOrders: number
}

interface DayMetricsProps {
  data: DayMetricsData
}

const dividerCls = 'border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800'
const baseCls = 'flex-1 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]'

export function DayMetrics({ data }: DayMetricsProps) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="w-full flex flex-col md:flex-row border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] mt-4 shadow-sm">
      {/* Pedidos Hoje */}
      <Link href={`/dashboard/orders?date=${today}`} className={`${baseCls} ${dividerCls}`}>
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">Pedidos Hoje</h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-500 leading-none group-hover:opacity-80 transition-opacity">{data.ordersToday}</p>
          <span className="text-xs font-medium text-gray-400">entregas</span>
        </div>
      </Link>

      {/* A Confirmar */}
      <Link href="/dashboard/orders?status=PENDENTE" className={`${baseCls} ${dividerCls}`}>
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">A Confirmar</h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-orange-600 dark:text-orange-500 leading-none group-hover:opacity-80 transition-opacity">{data.pendingOrders}</p>
          <span className="text-xs font-medium text-gray-400">pendentes</span>
        </div>
      </Link>

      {/* Mensagens Novas */}
      <Link href="/dashboard/messages" className={`${baseCls} ${dividerCls}`}>
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">Mensagens Novas</h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-emerald-600 dark:text-emerald-500 leading-none group-hover:opacity-80 transition-opacity">{data.newMessages}</p>
          <span className="text-xs font-medium text-gray-400">não lidas</span>
        </div>
      </Link>

      {/* Próximos 7 Dias */}
      <Link href="/dashboard/orders" className={baseCls}>
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
        <h4 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">Próximos 7 Dias</h4>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-black tracking-tighter text-purple-600 dark:text-purple-500 leading-none group-hover:opacity-80 transition-opacity">{data.nextWeekOrders}</p>
          <span className="text-xs font-medium text-gray-400">agendados</span>
        </div>
      </Link>
    </div>
  )
}