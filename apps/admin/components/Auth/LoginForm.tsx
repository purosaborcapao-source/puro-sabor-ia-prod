import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const { signIn, loading, error, profile } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  // Redireciona para dashboard após login bem-sucedido ou caso o usuário abra e já possua profile carregado
  useEffect(() => {
    if (profile) {
      const allowed = ['ADMIN', 'GERENTE', 'ATENDENTE', 'PRODUTOR']
      if (allowed.includes(profile.role)) {
        router.push('/dashboard')
      } else {
        setErrorMessage(
          'Acesso negado. Você não tem permissão para acessar este painel.'
        )
      }
    }
  }, [profile, router])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setErrorMessage(null)
      setIsSubmitting(true)

      await signIn(data.email, data.password)
      
      // Fusível de segurança: se após 5 segundos não redirecionar, destrava o botão
      setTimeout(() => {
        setIsSubmitting(false)
      }, 5000)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao fazer login'
      setErrorMessage(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-[#050505]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-zinc-900 dark:bg-[#0A0A0A] border-r border-zinc-800 p-12">
        <div className="flex items-center gap-3">
          <span className="text-2xl grayscale opacity-80">🍞</span>
          <span className="text-sm font-black tracking-widest text-zinc-50 uppercase">Puro Sabor IA</span>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase mb-3">Sistema Operacional</p>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            Central de pedidos, mensagens e produção para a operação da confeitaria.
          </p>
        </div>
        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
          v2.0 — {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <span className="text-xl grayscale opacity-70">🍞</span>
          <span className="text-sm font-black tracking-widest text-zinc-900 dark:text-zinc-50 uppercase">Puro Sabor IA</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase mb-2">Acesso Restrito</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Entrar no painel
            </h1>
          </div>

          {(errorMessage || error) && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300 text-sm font-medium">
                {errorMessage || error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className={`w-full px-4 py-3 border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                  errors.email ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                }`}
                placeholder="operador@purosabor.com"
                disabled={isSubmitting || loading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">
                Senha
              </label>
              <input
                type="password"
                {...register('password')}
                className={`w-full px-4 py-3 border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                  errors.password ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                }`}
                placeholder="••••••••"
                disabled={isSubmitting || loading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:-translate-y-px mt-2"
            >
              {isSubmitting || loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-zinc-400 text-xs mt-8">
            Esqueceu a senha?{' '}
            <a href="/auth/reset-password" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Redefinir acesso
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
