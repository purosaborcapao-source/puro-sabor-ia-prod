import React, { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { supabase } from '@atendimento-ia/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ConfirmPaymentButtonProps {
  paymentEntryId: string
  orderId: string
  paymentType: 'SINAL' | 'SALDO' | 'PARCIAL' | 'ANTECIPADO'
  paymentAmount: number
  onSuccess?: () => void
  disabled?: boolean
}

export function ConfirmPaymentButton({
  paymentEntryId,
  orderId,
  paymentType,
  paymentAmount,
  onSuccess,
  disabled = false
}: ConfirmPaymentButtonProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleConfirm = async () => {
    try {
      setError(null)
      setIsLoading(true)

      console.log('💰 Confirmando pagamento:', { paymentEntryId, orderId, paymentAmount })

      // 1. Atualizar a entrada de pagamento
      const { error: updateErr } = await supabase
        .from('payment_entries')
        .update({
          status: 'CONFIRMADO',
          confirmed_by: user?.id,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', paymentEntryId)

      if (updateErr) throw updateErr

      if (updateErr) throw updateErr

      console.log('✅ Pagamento confirmado no banco.')

      // Success
      setShowConfirmation(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('❌ Erro ao confirmar pagamento:', err)
      const message = err instanceof Error ? err.message : 'Erro ao confirmar pagamento'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (showConfirmation) {
    const paymentLabel = 
      paymentType === 'SINAL' ? 'sinal' : 
      paymentType === 'PARCIAL' ? 'parcial' : 
      paymentType === 'ANTECIPADO' ? 'antecipado' : 'saldo'

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Confirmar Pagamento
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Confirmar {paymentLabel} no valor de{' '}
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
