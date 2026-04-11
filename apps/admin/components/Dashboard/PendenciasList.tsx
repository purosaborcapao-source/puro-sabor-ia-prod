import React from 'react'
import { MessageCircle, Package, DollarSign, Edit2, AlertCircle } from 'lucide-react'

interface Pendencia {
  type:
    | 'mensagens'
    | 'pedidos'
    | 'sinais'
    | 'alteracoes'
    | 'pagamentos'
  count: number
  label: string
  icon: React.ReactNode
  color: string
  onViewAll?: () => void
  adminOnly?: boolean
}

interface PendenciasListProps {
  pendencias: Pendencia[]
  userRole?: 'ADMIN' | 'GERENTE' | 'ATENDENTE'
}

export function PendenciasList({
  pendencias,
  userRole
}: PendenciasListProps) {
  const filtered = pendencias.filter(
    (p) => !p.adminOnly || userRole === 'ADMIN' || userRole === 'GERENTE'
  )

  if (filtered.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 text-center">
        <p className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest text-sm">
          System Clear // Operação Estável
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] shadow-sm">
      {filtered.map((pendencia, index) => {
        const hasPendencias = pendencia.count > 0;
        const isNotLast = index < filtered.length - 1;

        return (
          <div
            key={pendencia.type}
            className={`flex items-center justify-between p-4 px-6 relative transition-colors ${
              hasPendencias
                ? 'bg-red-50/50 dark:bg-red-950/20 shadow-inner'
                : 'bg-transparent opacity-50 grayscale'
            } ${isNotLast ? 'border-b border-gray-200 dark:border-gray-800' : ''}`}
          >
            {/* Indicador de Severidade (Lateral) */}
            {hasPendencias && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 dark:bg-red-500" />
            )}

            <div className="flex items-center gap-4">
              <p
                className={`font-black text-2xl w-8 text-center ${
                  hasPendencias
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {pendencia.count}
              </p>
              
              <div>
                <p
                  className={`font-bold tracking-wide uppercase text-xs ${
                    hasPendencias
                      ? 'text-red-900 dark:text-red-400'
                      : 'text-gray-500'
                  }`}
                >
                  {pendencia.label}
                </p>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5 font-medium">
                  Status: {hasPendencias ? 'AÇÃO REQUERIDA' : 'CLEARED'}
                </div>
              </div>
            </div>

            {pendencia.onViewAll && hasPendencias && (
              <button
                onClick={pendencia.onViewAll}
                className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white uppercase font-bold tracking-widest transition-colors"
              >
                Resolver
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function usePendencias() {
  return React.useMemo(() => [
    {
      type: 'mensagens',
      count: 0,
      label: 'mensagens WhatsApp não respondidas',
      icon: <MessageCircle className="w-5 h-5 text-blue-600" />,
      color: 'blue'
    },
    {
      type: 'pedidos',
      count: 0,
      label: 'pedidos aguardando confirmação',
      icon: <Package className="w-5 h-5 text-purple-600" />,
      color: 'purple'
    },
    {
      type: 'sinais',
      count: 0,
      label: 'sinais a receber (próx. 3 dias)',
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      color: 'green'
    },
    {
      type: 'alteracoes',
      count: 0,
      label: 'alterações de pedido solicitadas',
      icon: <Edit2 className="w-5 h-5 text-orange-600" />,
      color: 'orange'
    },
    {
      type: 'pagamentos',
      count: 0,
      label: 'pagamentos aguardando confirmação',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      color: 'red',
      adminOnly: true
    }
  ], [])
}
