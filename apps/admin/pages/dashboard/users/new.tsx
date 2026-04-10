import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { UserForm } from '@/components/Users/UserForm'
import { useEffect } from 'react'

export default function NewUserPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

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

  if (loading || !user || !profile) {
    return null
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
        <title>Novo Usuário - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Novo Usuário
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <UserForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </main>
      </div>
    </>
  )
}
