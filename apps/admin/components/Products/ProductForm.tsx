import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, type Database } from '@atendimento-ia/supabase'
import { useState } from 'react'

type Product = Database['public']['Tables']['products']['Row']

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser maior que 0'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().min(0).optional(),
  prep_time: z.number().optional(),
  is_active: z.boolean().optional()
}).strict()

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: Product | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          price: initialData.price,
          category: initialData.category,
          description: initialData.description || '',
          prep_time: initialData.prep_time || 0,
          is_active: initialData.is_active ?? true
        }
      : {
          name: '',
          price: 0,
          category: '',
          description: '',
          prep_time: 0,
          is_active: true
        }
  })

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      if (initialData?.id) {
        // Update existing
        const { error: err } = await supabase
          .from('products')
          .update({
            name: data.name,
            price: data.price,
            category: data.category,
            description: data.description || null,
            prep_time: data.prep_time,
            is_active: data.is_active
          })
          .eq('id', initialData.id)

        if (err) throw err
      } else {
        // Create new
        const { error: err } = await supabase.from('products').insert({
          name: data.name,
          price: data.price,
          category: data.category,
          description: data.description || null,
          prep_time: data.prep_time,
          is_active: data.is_active
        })

        if (err) throw err
      }

      reset()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {initialData ? 'Editar Produto' : 'Novo Produto'}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Nome do produto"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preço (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoria *
            </label>
            <input
              type="text"
              {...register('category')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.category
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Ex: Bolos, Doces, etc"
              disabled={isSubmitting}
            />
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tempo de Preparo (min)
            </label>
            <input
              type="number"
              {...register('prep_time', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descrição
          </label>
          <textarea
            {...register('description')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descrição do produto"
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            disabled={isSubmitting}
          />
          <label
            htmlFor="is_active"
            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Produto ativo
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
