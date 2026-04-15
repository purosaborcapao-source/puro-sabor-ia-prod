import { useState, useEffect } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Edit2, Trash2, Plus, X } from 'lucide-react'

interface SettingRow {
  key: string
  value: any
  type: 'String' | 'Number' | 'JSON' | 'Boolean'
  updated_at: string | null
}

interface EditingState {
  isOpen: boolean
  isNewConfig: boolean
  key: string | null
  value: any
  type: 'String' | 'Number' | 'JSON' | 'Boolean'
}

export function AdvancedSettingsTable() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<SettingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [editing, setEditing] = useState<EditingState>({
    isOpen: false,
    isNewConfig: false,
    key: null,
    value: '',
    type: 'String'
  })

  const canEdit = profile?.role === 'ADMIN'

  // Detect type from value
  const detectType = (value: any): 'String' | 'Number' | 'JSON' | 'Boolean' => {
    if (typeof value === 'boolean') return 'Boolean'
    if (typeof value === 'number') return 'Number'
    if (typeof value === 'object') return 'JSON'
    return 'String'
  }

  // Load settings from database
  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const { data, error: err } = await supabase
        .from('settings')
        .select('key, value, updated_at')
        .order('key', { ascending: true })

      if (err) throw err

      if (data) {
        const enrichedData: SettingRow[] = data.map(row => ({
          key: row.key,
          value: row.value,
          type: detectType(row.value),
          updated_at: row.updated_at
        }))
        setSettings(enrichedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open edit modal
  const handleEdit = (row: SettingRow) => {
    setEditing({
      isOpen: true,
      isNewConfig: false,
      key: row.key,
      value: row.value,
      type: row.type
    })
  }

  // Open new config modal
  const handleNewConfig = () => {
    setEditing({
      isOpen: true,
      isNewConfig: true,
      key: '',
      value: '',
      type: 'String'
    })
  }

  // Save setting (edit or new)
  const handleSave = async () => {
    try {
      if (!editing.key || editing.key.trim() === '') {
        setError('Chave não pode estar vazia')
        return
      }

      // Check if key already exists (for new configs)
      if (editing.isNewConfig) {
        const existingKey = settings.find(s => s.key === editing.key)
        if (existingKey) {
          setError(`Configuração "${editing.key}" já existe`)
          return
        }
      }

      // Parse value based on type
      let parsedValue: any = editing.value
      if (editing.type === 'Number') {
        parsedValue = parseFloat(editing.value)
        if (isNaN(parsedValue)) {
          setError('Valor inválido para tipo Número')
          return
        }
      } else if (editing.type === 'JSON') {
        try {
          parsedValue = JSON.parse(editing.value)
        } catch {
          setError('JSON inválido')
          return
        }
      } else if (editing.type === 'Boolean') {
        parsedValue = editing.value === 'true' || editing.value === true
      }

      setIsSubmitting(true)
      setError(null)

      const { error: err } = await supabase
        .from('settings')
        .upsert(
          { key: editing.key, value: parsedValue },
          { onConflict: 'key' }
        )

      if (err) throw err

      setSuccess(`Configuração "${editing.key}" salva com sucesso!`)
      setEditing({ isOpen: false, isNewConfig: false, key: null, value: '', type: 'String' })

      // Reload settings
      await loadSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete setting
  const handleDelete = async (key: string) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const { error: err } = await supabase
        .from('settings')
        .delete()
        .eq('key', key)

      if (err) throw err

      setSuccess(`Configuração "${key}" deletada com sucesso!`)
      setDeleteConfirm(null)

      // Reload settings
      await loadSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar configuração')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format value preview
  const formatValuePreview = (value: any, type: string): string => {
    if (type === 'JSON') {
      const str = JSON.stringify(value)
      return str.length > 100 ? str.substring(0, 100) + '...' : str
    }
    const str = String(value)
    return str.length > 100 ? str.substring(0, 100) + '...' : str
  }

  // Render value editor based on type
  const renderValueEditor = () => {
    switch (editing.type) {
      case 'Boolean':
        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing({ ...editing, value: true })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                editing.value === true || editing.value === 'true'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Verdadeiro
            </button>
            <button
              type="button"
              onClick={() => setEditing({ ...editing, value: false })}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                editing.value === false || editing.value === 'false'
                  ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Falso
            </button>
          </div>
        )

      case 'Number':
        return (
          <input
            type="number"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Digite um número"
          />
        )

      case 'JSON':
        return (
          <textarea
            value={typeof editing.value === 'string' ? editing.value : JSON.stringify(editing.value, null, 2)}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            placeholder="Digite JSON válido"
          />
        )

      case 'String':
      default:
        const isLongText = typeof editing.value === 'string' && editing.value.length > 100
        return isLongText ? (
          <textarea
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Digite o valor"
          />
        ) : (
          <input
            type="text"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Digite o valor"
          />
        )
    }
  }

  if (!canEdit) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Acesso Restrito</h3>
        <p className="text-gray-600 dark:text-gray-400">Apenas administradores podem acessar configurações avançadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Button to add new config */}
      <div className="flex justify-end">
        <button
          onClick={handleNewConfig}
          disabled={!canEdit || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nova Configuração
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Chave</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Valor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Carregando configurações...
                </td>
              </tr>
            ) : settings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma configuração encontrada
                </td>
              </tr>
            ) : (
              settings.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.key}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs max-w-xs truncate">
                    {formatValuePreview(row.value, row.type)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(row.key)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing.isNewConfig ? 'Nova Configuração' : `Editar: ${editing.key}`}
              </h3>
              <button
                onClick={() => setEditing({ ...editing, isOpen: false })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Key Input */}
              {editing.isNewConfig ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chave *
                  </label>
                  <input
                    type="text"
                    value={editing.key || ''}
                    onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Digite o nome da chave"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chave
                  </label>
                  <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    {editing.key}
                  </div>
                </div>
              )}

              {/* Type Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value as any, value: '' })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="String">String</option>
                  <option value="Number">Number</option>
                  <option value="JSON">JSON</option>
                  <option value="Boolean">Boolean</option>
                </select>
              </div>

              {/* Value Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor *
                </label>
                {renderValueEditor()}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing({ ...editing, isOpen: false })}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja deletar a configuração <span className="font-mono font-medium">{`&quot;${deleteConfirm}&quot;`}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Icon fallback if Lock is not available
function Lock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a3 3 0 00-3-3H9a3 3 0 00-3 3v4m6 0V7a3 3 0 00-3-3H9a3 3 0 00-3 3v4"
      />
    </svg>
  )
}
