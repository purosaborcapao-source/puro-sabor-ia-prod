import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'ADMIN' | 'GERENTE' | 'PRODUTOR' | 'ATENDENTE'
  status: 'ATIVO' | 'INATIVO' | 'CONGELADO'
  created_at?: string
}

interface UserTableProps {
  searchTerm: string
  onRefresh?: () => void
}

export function UserTable({ searchTerm, onRefresh }: UserTableProps) {
  const { session } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setIsSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    if (!session) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar usuários')
      }

      const data = await response.json()
      setUsers(data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const deleteUser = async (userId: string) => {
    if (!session) return

    if (!confirm('Tem certeza que deseja deletar este usuário?')) {
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar usuário')
      }

      // Remove the user from the list or update status
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'INATIVO' } : u)))
      onRefresh?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      alert(`Erro: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter users by search term
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Carregando usuários...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      {filteredUsers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {users.length === 0 ? 'Nenhum usuário encontrado' : 'Nenhum usuário corresponde à busca'}
          </p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Função
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Email */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {user.email}
                </td>

                {/* Name */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {user.name}
                </td>

                {/* Role */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                    {user.role}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      user.status === 'ATIVO'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : user.status === 'INATIVO'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {user.status === 'ATIVO' ? 'Ativo' : user.status === 'INATIVO' ? 'Inativo' : 'Congelado'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-sm space-x-2">
                  <Link
                    href={`/dashboard/users/${user.id}/edit`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
