import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@atendimento-ia/supabase'

interface UserProfile {
  id: string
  name: string
  email?: string
  role: 'ADMIN' | 'GERENTE' | 'PRODUTOR' | 'ATENDENTE' | 'BOT'
  status: 'ATIVO' | 'INATIVO' | 'CONGELADO'
  avatar_url?: string
}

interface AuthContextType {
  session: Session | null
  user: SupabaseUser | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseClient = supabase

  useEffect(() => {
    let isMounted = true
    let timeoutId: any

    const initAuth = async () => {
      try {
        console.log('🔐 AuthContext: Iniciando initAuth...')

        // Proteção contra cliente não inicializado
        if (!supabaseClient || !supabaseClient.auth) {
          console.warn('⚠️ AuthContext: Supabase client ou auth não disponível.')
          if (isMounted) setLoading(false)
          return
        }

        // Safety timeout: se em 5 segundos não resolvermos a sessão, liberamos o loading
        // Isso permite que o usuário use o formulário mesmo se o getSession() travar
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('⚠️ AuthContext: Timeout de 5s atingido no getSession. Liberando UI...')
            setLoading(false)
          }
        }, 5000)

        console.log('🔐 AuthContext: Chamando getSession()...')
        
        // Tentar buscar sessão atual
        const { data, error: err } = await supabaseClient.auth.getSession()
        
        // Se chegarmos aqui, cancelamos o timeout de segurança
        clearTimeout(timeoutId)
        console.log('🔐 AuthContext: getSession() resolveu.')

        if (err) {
          console.error('🔐 AuthContext: Erro ao obter sessão:', err.message)
        }

        if (data.session) {
          console.log('✅ AuthContext: Sessão recuperada com sucesso.')
          setSession(data.session)
          setUser(data.session.user)
          await fetchUserProfile(data.session.user.id)
        } else {
          console.log('ℹ️ AuthContext: Nenhuma sessão ativa encontrada.')
        }
      } catch (err) {
        console.error('🔥 AuthContext: Erro crítico durante autenticação:', err)
      } finally {
        if (isMounted) {
          console.log('🔐 AuthContext: Finalizando initAuth (setting loading to false)')
          setLoading(false)
        }
      }
    }

    initAuth()

    console.log('🔐 AuthContext: Configurando onAuthStateChange...')
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log(`🔐 AuthContext: Evento de Auth alterado: ${event}`)
        if (!isMounted) return
        
        setSession(session)
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        
        setTimeout(() => {
          if (isMounted) {
            setLoading(false)
            setError(null)
          }
        }, 100)
      }
    )

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error: err } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (err) {
        console.error('Failed to fetch profile:', err)
        return
      }

      setProfile(data as UserProfile)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Tentando signIn com password...')
      setError(null)
      const { error: err } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (err) {
        console.error('🔐 AuthContext: Erro no signInWithPassword:', err.message)
        throw err
      }
      console.log('✅ AuthContext: signInWithPassword concluído com sucesso.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      throw err
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error: err } = await supabaseClient.auth.signOut()

      if (err) {
        throw err
      }

      setSession(null)
      setUser(null)
      setProfile(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      setError(message)
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        error,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
