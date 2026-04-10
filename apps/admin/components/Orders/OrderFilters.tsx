import React, { useState } from 'react'
import { SearchIcon, FilterIcon, XIcon } from 'lucide-react'

interface OrderFiltersProps {
  onStatusChange: (status: string | null) => void
  onPaymentStatusChange: (status: string | null) => void
  onDateChange: (date: string | null) => void
  onSearchChange: (query: string) => void
  searchQuery?: string
  selectedStatus?: string | null
  selectedPaymentStatus?: string | null
  selectedDate?: string | null
}

export const OrderFilters = React.memo(function OrderFilters({
  onStatusChange,
  onPaymentStatusChange,
  onDateChange,
  onSearchChange,
  searchQuery = '',
  selectedStatus = null,
  selectedPaymentStatus = null,
  selectedDate = null
}: OrderFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClearFilters = () => {
    onStatusChange(null)
    onPaymentStatusChange(null)
    onDateChange(null)
    onSearchChange('')
  }

  const hasActiveFilters =
    selectedStatus || selectedPaymentStatus || selectedDate || searchQuery

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, número do pedido ou produto..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filtros - botão para mobile */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors md:hidden"
        >
          <FilterIcon className="w-4 h-4" />
          Filtros
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <XIcon className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Filtros - desktop view */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isOpen ? '' : 'hidden md:grid'}`}>
        {/* Status do Pedido */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status do Pedido
          </label>
          <select
            value={selectedStatus || ''}
            onChange={(e) => onStatusChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {/* Status Financeiro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status Financeiro
          </label>
          <select
            value={selectedPaymentStatus || ''}
            onChange={(e) => onPaymentStatusChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="SINAL_PENDENTE">Sinal Pendente</option>
            <option value="SINAL_PAGO">Sinal Pago</option>
            <option value="QUITADO">Quitado</option>
            <option value="CONTA_CORRENTE">Conta Corrente</option>
          </select>
        </div>

        {/* Data de Entrega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data de Entrega
          </label>
          <input
            type="date"
            value={selectedDate || ''}
            onChange={(e) => onDateChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
})
