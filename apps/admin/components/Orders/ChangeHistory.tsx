import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface OrderChange {
  id: string
  created_at: string
  change_type: string
  details: any
  user_id?: string
  user_name?: string
}

interface ChangeHistoryProps {
  orderId: string
}

const getChangeLabel = (changeType: string, details: any): string => {
  switch (changeType) {
    case 'PAGAMENTO_REGISTRADO':
      return `Pagamento registrado: ${details?.payment_type || 'N/A'} ${details?.amount ? `- R$ ${(details.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`
    case 'PAGAMENTO_CONFIRMADO':
      return `Pagamento confirmado: ${details?.payment_type || 'N/A'}`
    case 'DATA_ALTERADA':
      return `Data alterada: ${details?.old_date} → ${details?.new_date}`
    case 'STATUS_ALTERADO':
      return `Status alterado: ${details?.old_status} → ${details?.new_status}`
    case 'PEDIDO_CRIADO':
      return 'Pedido criado'
    default:
      return changeType.replace(/_/g, ' ')
  }
}

export function ChangeHistory({ orderId }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<OrderChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChanges()
  }, [orderId])

  const loadChanges = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implementar quando a tabela order_changes for criada em FASE 2.1
      // Por enquanto, retorna lista vazia
      setChanges([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico'
      console.error('Erro ao carregar histórico:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Carregando histórico...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900 dark:text-red-200">Erro ao carregar histórico</h3>
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Nenhuma alteração registrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {changes.map((change) => (
        <div
          key={change.id}
          className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <span className="text-blue-600 dark:text-blue-400 text-lg">📝</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getChangeLabel(change.change_type, change.details)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(change.created_at).toLocaleString('pt-BR')}
            </p>
            {change.user_name && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                por {change.user_name}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
