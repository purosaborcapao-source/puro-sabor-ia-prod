import React from 'react'
import { MessageCircle, Package, Edit2, AlertTriangle } from 'lucide-react'

export interface Pendencia {
  type:
    | 'mensagens'
    | 'pedidos'
    | 'alteracoes'
    | 'problemas'
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

  const pendingCount = filtered.reduce((sum, p) => sum + (p.count > 0 ? 1 : 0), 0)

  if (pendingCount === 0) {
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
        const hasPendencias = pendencia.count > 0
        const isNotLast = index < filtered.length - 1

        const colorMap: Record<string, string> = {
          mensagens: 'bg-blue-500',
          pedidos: 'bg-orange-500',
          alteracoes: 'bg-purple-500',
          problemas: 'bg-red-500'
        }

        return (
          <div
            key={pendencia.type}
            className={`flex items-center justify-between p-4 px-6 relative transition-colors ${
              hasPendencias
                ? 'bg-orange-50/50 dark:bg-orange-950/10'
                : 'bg-transparent opacity-40'
            } ${isNotLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
          >
            {hasPendencias && (
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorMap[pendencia.type] || 'bg-gray-400'}`} />
            )}

            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                hasPendencias 
                  ? 'bg-orange-100 dark:bg-orange-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                {hasPendencias ? (
                  <span className="font-black text-lg text-orange-600 dark:text-orange-400">
                    {pendencia.count}
                  </span>
                ) : (
                  <span className="text-gray-400">✓</span>
                )}
              </div>
              
              <div>
                <p className={`font-bold tracking-wide uppercase text-xs ${
                  hasPendencias
                    ? 'text-orange-900 dark:text-orange-300'
                    : 'text-gray-500'
                }`}>
                  {pendencia.label}
                </p>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5 font-medium">
                  Status: {hasPendencias ? 'ATENÇÃO REQUERIDA' : 'OK'}
                </div>
              </div>
            </div>

            {pendencia.onViewAll && hasPendencias && (
              <button
                onClick={pendencia.onViewAll}
                className="text-xs px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white uppercase font-bold tracking-widest transition-colors"
              >
                Ver
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function usePendencias() {
  return React.useMemo<Pendencia[]>(() => [
    {
      type: 'mensagens',
      count: 0,
      label: 'Mensagens não respondidas',
      icon: <MessageCircle className="w-5 h-5 text-blue-600" />,
      color: 'blue'
    },
    {
      type: 'pedidos',
      count: 0,
      label: 'Pedidos pendentes',
      icon: <Package className="w-5 h-5 text-orange-600" />,
      color: 'orange'
    },
    {
      type: 'alteracoes',
      count: 0,
      label: 'Alterações solicitadas',
      icon: <Edit2 className="w-5 h-5 text-purple-600" />,
      color: 'purple'
    },
    {
      type: 'problemas',
      count: 0,
      label: 'Pedidos com problema',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      color: 'red',
      adminOnly: false
    }
  ], [])
}