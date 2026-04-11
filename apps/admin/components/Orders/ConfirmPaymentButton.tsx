import React, { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

interface ConfirmPaymentButtonProps {
  paymentEntryId: string
  paymentType: 'SINAL' | 'SALDO' | 'PARCIAL'
  paymentAmount: number
  onSuccess?: () => void
  disabled?: boolean
}

export function ConfirmPaymentButton({
  paymentEntryId: _paymentEntryId,
  paymentType,
  paymentAmount,
  onSuccess,
  disabled = false
}: ConfirmPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleConfirm = async () => {
    try {
      setError(null)
      setIsLoading(true)

      // TODO: Implementar quando as tabelas payment_entries forem criadas em FASE 2.1
      // Por enquanto, simular sucesso
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Success
      setShowConfirmation(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao confirmar pagamento'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Confirmar Pagamento
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Confirmar {paymentType === 'SINAL' ? 'sinal' : paymentType === 'PARCIAL' ? 'parcial' : 'saldo'} no valor de{' '}
            <strong>
              {paymentAmount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </strong>
            ?
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirmation(true)}
      disabled={disabled || isLoading}
      className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
      title="Confirmar pagamento"
    >
      <Check className="w-4 h-4" />
      Confirmar
    </button>
  )
}
