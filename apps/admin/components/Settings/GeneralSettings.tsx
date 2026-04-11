import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@atendimento-ia/supabase'

const settingsSchema = z.object({
  bakery_name: z.string().min(1, 'Nome da padaria é obrigatório'),
  bakery_phone: z.string().min(1, 'Telefone é obrigatório'),
  opening_hours: z.record(z.string(), z.string()).optional(),
  min_lead_time_hours: z.number().min(0, 'Prazo mínimo deve ser >= 0'),
  max_orders_day: z.number().min(1, 'Máximo de pedidos deve ser >= 1'),
  ai_prompt: z.string().optional()
})

type SettingsFormData = z.infer<typeof settingsSchema>

interface GeneralSettingsProps {
  canEdit?: boolean
}

export function GeneralSettings({ canEdit = false }: GeneralSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      bakery_name: '',
      bakery_phone: '',
      opening_hours: undefined,
      min_lead_time_hours: 24,
      max_orders_day: 50,
      ai_prompt: ''
    }
  })

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingKeys = ['bakery_name', 'bakery_phone', 'opening_hours', 'min_lead_time_hours', 'max_orders_day', 'ai_prompt']
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', settingKeys)

        if (data) {
          const settingsMap = data.reduce((acc: any, row: any) => {
            acc[row.key] = row.value
            return acc
          }, {})

          reset({
            bakery_name: settingsMap.bakery_name || '',
            bakery_phone: settingsMap.bakery_phone || '',
            opening_hours: settingsMap.opening_hours || undefined,
            min_lead_time_hours: settingsMap.min_lead_time_hours || 24,
            max_orders_day: settingsMap.max_orders_day || 50,
            ai_prompt: settingsMap.ai_prompt || ''
          })
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [reset])

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      // Upsert each setting as a separate row
      const settingsToSave = [
        { key: 'bakery_name', value: data.bakery_name },
        { key: 'bakery_phone', value: data.bakery_phone },
        { key: 'opening_hours', value: (data.opening_hours || null) as unknown as string },
        { key: 'min_lead_time_hours', value: data.min_lead_time_hours },
        { key: 'max_orders_day', value: data.max_orders_day },
        { key: 'ai_prompt', value: data.ai_prompt || null }
      ]

      for (const setting of settingsToSave) {
        const { error: err } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' })

        if (err) throw err
      }

      setSuccess('Configurações salvas com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setIsSubmitting(false)
    }
  }

  const daysOfWeek = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

  if (isLoading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando configurações...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informações da Padaria
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome da Padaria *
              </label>
              <input
                type="text"
                {...register('bakery_name')}
                disabled={!canEdit || isSubmitting}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 ${
                  errors.bakery_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.bakery_name && (
                <p className="text-red-500 text-sm mt-1">{errors.bakery_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                {...register('bakery_phone')}
                disabled={!canEdit || isSubmitting}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 ${
                  errors.bakery_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.bakery_phone && (
                <p className="text-red-500 text-sm mt-1">{errors.bakery_phone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Operational Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configurações Operacionais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prazo Mínimo (horas) *
              </label>
              <input
                type="number"
                {...register('min_lead_time_hours', { valueAsNumber: true })}
                disabled={!canEdit || isSubmitting}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 ${
                  errors.min_lead_time_hours ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.min_lead_time_hours && (
                <p className="text-red-500 text-sm mt-1">{errors.min_lead_time_hours.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Máximo de Pedidos/Dia *
              </label>
              <input
                type="number"
                {...register('max_orders_day', { valueAsNumber: true })}
                disabled={!canEdit || isSubmitting}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 ${
                  errors.max_orders_day ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.max_orders_day && (
                <p className="text-red-500 text-sm mt-1">{errors.max_orders_day.message}</p>
              )}
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Horário de Funcionamento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {daysOfWeek.map((day) => (
                <div key={day}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                    {day}
                  </label>
                  <input
                    type="text"
                    {...register(`opening_hours.${day as any}`)}
                    disabled={!canEdit || isSubmitting}
                    placeholder="Ex: 08:00-18:00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Prompt */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Prompt da IA
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Define como a IA processa as mensagens do WhatsApp
          </p>
          <textarea
            {...register('ai_prompt')}
            disabled={!canEdit || isSubmitting}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 font-mono text-sm"
            placeholder="Digite o prompt que a IA usará para processar pedidos..."
          />
        </div>

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
