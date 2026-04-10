import React, { useState } from 'react'
import { LockIcon, CheckIcon, XIcon } from 'lucide-react'

interface FieldWithPermissionProps {
  label: string
  value: string | number | null
  canEdit: boolean
  onEdit?: (newValue: string | number) => Promise<void>
  variant?: 'text' | 'currency' | 'number'
  disabled?: boolean
  error?: string
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'))
}

export function FieldWithPermission({
  label,
  value,
  canEdit,
  onEdit,
  variant = 'text',
  disabled = false,
  error
}: FieldWithPermissionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(
    variant === 'currency' && typeof value === 'number'
      ? formatCurrency(value)
      : String(value ?? '')
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setSaveError(null)
      setIsSaving(true)

      const numValue =
        variant === 'currency' ? parseCurrency(editValue) : editValue

      if (onEdit) {
        await onEdit(numValue)
      }

      setIsEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(
      variant === 'currency' && typeof value === 'number'
        ? formatCurrency(value)
        : String(value ?? '')
    )
    setIsEditing(false)
    setSaveError(null)
  }

  const displayValue =
    variant === 'currency' && typeof value === 'number'
      ? formatCurrency(value)
      : value

  if (!canEdit || disabled) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-900 dark:text-white">
            {displayValue ?? '—'}
          </span>
          <LockIcon className="w-4 h-4 text-gray-400" />
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="flex gap-2">
          {variant === 'currency' ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="R$ 0,00"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type={variant === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Salvar"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Cancelar"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        {(saveError || error) && (
          <p className="text-red-500 text-sm mt-1">{saveError || error}</p>
        )}
      </div>
    )
  }

  return (
    <div
      className="mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 p-2 rounded transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-gray-900 dark:text-white font-medium">
          {displayValue ?? '—'}
        </span>
        <span className="text-gray-400 text-xs">clique para editar</span>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
