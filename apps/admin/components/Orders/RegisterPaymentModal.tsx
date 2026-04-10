import React, { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface RegisterPaymentModalProps {
  orderId: string
  orderTotal: number
  sinalPago: number
  onClose: () => void
  onSuccess?: () => void
}

export function RegisterPaymentModal({
  orderId,
  orderTotal,
  sinalPago: _sinalPago, // Mantido por compatibilidade se necessário, mas usaremos saldo real
  onClose,
  onSuccess
}: RegisterPaymentModalProps) {
  const [paymentType, setPaymentType] = useState<'SINAL' | 'PARCIAL' | 'SALDO'>('SINAL')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // O saldo real deve ser calculado e passado via props ou buscado. 
  // Por enquanto, assumimos que orderTotal - sinalPago é o que falta, 
  // mas vamos permitir registrar qualquer valor até o total do pedido.
  const maxAmount = orderTotal // Permitir registrar até o total (o backend validará saldos complexos)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError(null)

      const numAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.'))

      if (!numAmount || numAmount <= 0) {
        setError('Valor inválido')
        return
      }

      if (numAmount > maxAmount) {
        setError(`Valor máximo permitido: ${maxAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
        return
      }

      setIsLoading(true)

      // Buscar token do localStorage (padrão do Supabase auth-helpers)
      const supabaseToken = localStorage.getItem('supabase-auth-token')
      let token = ''
      if (supabaseToken) {
        token = JSON.parse(supabaseToken).access_token
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: orderId,
          type: paymentType,
          valor: numAmount,
          notes: notes
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao registrar pagamento')
      }

      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar pagamento'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registrar Recebimento
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['SINAL', 'PARCIAL', 'SALDO'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPaymentType(type)
                    setAmount('')
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'SINAL' ? 'Sinal' : type === 'SALDO' ? 'Saldo' : 'Parcial'}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">R$</span>
              <input
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Máximo: {maxAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas (opcional)
            </label>
            <textarea
              placeholder="Ex: Pix, Transferência, Dinheiro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
