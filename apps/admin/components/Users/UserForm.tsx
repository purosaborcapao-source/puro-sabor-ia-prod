import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Database } from '@atendimento-ia/supabase'

type UserProfile = Database['public']['Tables']['profiles']['Row']

const userFormSchema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
  name: z.string().min(2, 'Nome é obrigatório'),
  role: z.enum(['ADMIN', 'GERENTE', 'PRODUTOR', 'ATENDENTE']),
  status: z.enum(['ATIVO', 'INATIVO', 'CONGELADO']).optional()
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  initialData?: UserProfile | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function UserForm({ initialData, onSuccess, onCancel }: UserFormProps) {
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          role: initialData.role as any,
          status: (initialData.status || 'ATIVO') as any
        }
      : {
          email: '',
          password: '',
          name: '',
          role: 'ATENDENTE',
          status: 'ATIVO'
        }
  })

  const onSubmit = async (data: UserFormData) => {
    if (!session) {
      setSubmitError('Sessão expirada. Faça login novamente.')
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      if (initialData?.id) {
        // Update existing user
        const updateData: any = {
          name: data.name,
          role: data.role,
          status: data.status || 'ATIVO'
        }

        const { error: err } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', initialData.id)

        if (err) throw err
      } else {
        // Create new user
        if (!data.email || !data.password) {
          throw new Error('Email e senha são obrigatórios para criar novo usuário')
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao criar usuário')
        }
      }

      reset()
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {initialData ? 'Editar Usuário' : 'Novo Usuário'}
      </h2>

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-red-800 dark:text-red-200">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email - only for creation */}
        {!initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="user@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
        )}

        {/* Password - only for creation */}
        {!initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senha *
            </label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
        )}

        {/* Name */}
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
            placeholder="Nome do usuário"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Função *
          </label>
          <select
            {...register('role')}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={isLoading}
          >
            <option value="">Selecione uma função</option>
            <option value="ADMIN">Admin</option>
            <option value="GERENTE">Gerente</option>
            <option value="PRODUTOR">Produtor</option>
            <option value="ATENDENTE">Atendente</option>
          </select>
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
          )}
        </div>

        {/* Status - only for edit */}
        {initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="CONGELADO">Congelado</option>
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar Usuário'}
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
