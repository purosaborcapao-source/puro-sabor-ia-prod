import React from 'react'

interface PaymentStatusBadgeProps {
  status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE'
  showLabel?: boolean
}

const statusConfig = {
  SINAL_PENDENTE: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    label: 'Sinal Pendente',
    icon: '🔴'
  },
  SINAL_PAGO: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    label: 'Sinal Pago',
    icon: '🔵'
  },
  QUITADO: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    label: 'Quitado',
    icon: '🟢'
  },
  CONTA_CORRENTE: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    label: 'Conta Corrente',
    icon: '🟣'
  }
}

export const PaymentStatusBadge = React.memo(function PaymentStatusBadge({ status, showLabel = true }: PaymentStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      title={config.label}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
})
