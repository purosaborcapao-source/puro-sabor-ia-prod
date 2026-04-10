import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { UserForm } from '@/components/Users/UserForm'
import { supabase, type Database } from '@atendimento-ia/supabase'
import { useEffect, useState } from 'react'

type UserProfile = Database['public']['Tables']['profiles']['Row']

export default function EditUserPage() {
  const router = useRouter()
  const { id: rawId } = router.query
  const id = typeof rawId === 'string' ? rawId : undefined
  const { user, profile, loading } = useAuth()
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      if (profile.role !== 'ADMIN') {
        router.push('/dashboard/users')
      }
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (!id) return

    const fetchUser = async () => {
      try {
        setUserLoading(true)
        const { data, error: err } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (err) throw err
        setUserData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar usuário')
      } finally {
        setUserLoading(false)
      }
    }

    fetchUser()
  }, [id])

  if (loading || userLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Usuário não encontrado</p>
        </div>
      </div>
    )
  }

  const handleSuccess = () => {
    router.push('/dashboard/users')
  }

  const handleCancel = () => {
    router.push('/dashboard/users')
  }

  return (
    <>
      <Head>
        <title>Editar Usuário - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Editar Usuário
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UserForm
            initialData={userData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </main>
      </div>
    </>
  )
}
