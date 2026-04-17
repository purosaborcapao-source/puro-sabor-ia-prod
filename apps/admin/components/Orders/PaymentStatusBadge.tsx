import React from 'react'
import { AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react'

interface PaymentStatusBadgeProps {
  status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE'
  showLabel?: boolean
}

const statusConfig = {
  SINAL_PENDENTE: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    label: 'Sinal Pendente',
    Icon: AlertCircle
  },
  SINAL_PAGO: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Sinal Pago',
    Icon: Clock
  },
  QUITADO: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    label: 'Quitado',
    Icon: CheckCircle2
  },
  CONTA_CORRENTE: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    label: 'Conta Corrente',
    Icon: RefreshCw
  }
}

export const PaymentStatusBadge = React.memo(function PaymentStatusBadge({ status, showLabel = true }: PaymentStatusBadgeProps) {
  const config = statusConfig[status]
  const { Icon } = config

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}
      title={config.label}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
})
