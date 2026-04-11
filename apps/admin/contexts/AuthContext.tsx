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

    const initAuth = async () => {
      if (!supabaseClient) {
        setLoading(false)
        return
      }

      try {
        console.log('🔐 AuthContext: Iniciando autenticação...')

        // Tentar buscar sessão atual
        const { data, error: err } = await supabaseClient.auth.getSession()

        if (err) {
          console.error('🔐 AuthContext: Erro ao obter sessão:', err.message)
          setLoading(false)
          return
        }

        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          // Busca o perfil ANTES de desativar o loading se possível, 
          // ou garante que o loading espere a resposta básica
          await fetchUserProfile(data.session.user.id)
          setLoading(false)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('🔐 AuthContext: Erro durante autenticação:', err)
        setLoading(false)
      }
    }

    initAuth()

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (!isMounted) return
        setSession(session)
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
        setError(null)
      }
    )

    return () => {
      isMounted = false
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
      setError(null)
      const { error: err } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (err) {
        throw err
      }
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
