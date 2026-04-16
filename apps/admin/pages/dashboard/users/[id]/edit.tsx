import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { UserForm } from '@/components/Users/UserForm'
import { supabase, type Database } from '@atendimento-ia/supabase'
import { useEffect, useState, useRef } from 'react'

type UserProfile = Database['public']['Tables']['profiles']['Row']

export default function EditUserPage() {
  const router = useRouter()
  const { id: rawId } = router.query
  const id = typeof rawId === 'string' ? rawId : undefined
  const { user, profile, loading } = useAuth()
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const pwSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (newPassword.length < 6) {
      setPwError('Senha deve ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('As senhas não conferem')
      return
    }
    setPwLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao alterar senha')

      setNewPassword('')
      setConfirmPassword('')
      setPwSuccess(true)
      if (pwSuccessTimer.current) clearTimeout(pwSuccessTimer.current)
      pwSuccessTimer.current = setTimeout(() => setPwSuccess(false), 4000)
    } catch (err: any) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
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
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <UserForm
            initialData={userData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />

          {/* Alterar Senha */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1">
              🔑 Alterar Senha
            </h2>
            <p className="text-xs text-gray-400 mb-5">A nova senha será aplicada imediatamente via Supabase Auth.</p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={pwLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  disabled={pwLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {pwError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ Senha alterada com sucesso!</p>
              )}

              <button
                type="submit"
                disabled={pwLoading || !newPassword || !confirmPassword}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all"
              >
                {pwLoading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  )
}
