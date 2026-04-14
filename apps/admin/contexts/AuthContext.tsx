import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@atendimento-ia/supabase'
import { useRouter } from 'next/router'

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

const DEVICE_ID_KEY = 'puro-sabor-device-id';
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'unknown-device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const getDeviceName = () => {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  const os = /Mac/.test(ua) ? 'Mac' : /Win/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : /Android/.test(ua) ? 'Android' : /iOS|iPhone|iPad/.test(ua) ? 'iOS' : 'Unknown OS';
  
  return `${browser} on ${os}`;
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabaseClient = supabase
  const untypedClient = supabaseClient as any

  useEffect(() => {
    let isMounted = true
    let timeoutId: any

    const initAuth = async () => {
      try {
        console.log('🔐 AuthContext: Iniciando initAuth...')

        if (!supabaseClient || !supabaseClient.auth) {
          if (isMounted) setLoading(false)
          return
        }

        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            setLoading(false)
          }
        }, 5000)
        
        const { data, error: err } = await supabaseClient.auth.getSession()
        
        clearTimeout(timeoutId)

        if (err) console.error('🔐 AuthContext: Erro ao obter sessão:', err.message)

        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          fetchUserProfile(data.session.user.id)
          validateSessionStatus(data.session.user.id)
        }
      } catch (err) {
        console.error('🔥 AuthContext: Erro crítico:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!isMounted) return
        
        setSession(session)
        if (session?.user) {
          setUser(session.user)
          fetchUserProfile(session.user.id)
          if (event === 'SIGNED_IN') {
             await registerSession(session.user.id)
          }
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
      if (timeoutId) clearTimeout(timeoutId)
      authListener?.subscription.unsubscribe()
    }
  }, []) // eslint-disable-line

  // Sincronização multi-device via Realtime
  useEffect(() => {
    if (!user?.id) return;
    
    const deviceId = getDeviceId();
    
    // Heartbeat loop (every 5 min)
    const heartbeatInterval = setInterval(async () => {
        await untypedClient.from('operator_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
    }, 5 * 60 * 1000);

    const channel = supabaseClient.channel(`sessions_${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'operator_sessions' as any,
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        // Se a minha própria sessão for desativada (is_active = false)
        const updatedSession = payload.new as any;
        if (updatedSession.device_id === deviceId && updatedSession.is_active === false) {
           console.log("🔒 Sessão finalizada remotamente ou expirada");
           forceLocalSignOut();
        }
      })
      .subscribe();

    return () => {
      clearInterval(heartbeatInterval);
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id]); // eslint-disable-line

  const forceLocalSignOut = async () => {
     await supabaseClient.auth.signOut();
     setSession(null);
     setUser(null);
     setProfile(null);
     router.push('/auth/login');
  };

  const validateSessionStatus = async (userId: string) => {
      const deviceId = getDeviceId();
      const { data } = await untypedClient
        .from('operator_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .single();
        
      if (!data) {
        // Sem sessão gravada, registra
        await registerSession(userId);
      } else if (data.is_active === false || new Date() > new Date(data.expires_at)) {
        // Sessão inválida ou expirada (mais de 18 horas)
        
        if (data.is_active) {
            await untypedClient.from('operator_login_history').insert({
                user_id: userId,
                action: 'SESSION_EXPIRED',
                device_id: deviceId,
                device_name: data.device_name
            });
            await untypedClient.from('operator_sessions').update({ is_active: false }).eq('id', data.id);
        }
        
        forceLocalSignOut();
      } else {
        // Sessão válida, envia heartbeat inicial
        await untypedClient
          .from('operator_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', data.id);
      }
  };

  const registerSession = async (userId: string) => {
    try {
      const deviceId = getDeviceId();
      const deviceName = getDeviceName();
      
      // Inserir login hostory
      await untypedClient.from('operator_login_history').insert({
          user_id: userId,
          action: 'LOGIN',
          device_id: deviceId,
          device_name: deviceName,
          ip_address: 'CLIENT'
      });

      // Upsert operator_sessions
      const { data: existing } = await untypedClient
          .from('operator_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('device_id', deviceId)
          .single();
          
      if (existing) {
          await untypedClient.from('operator_sessions').update({
              is_active: true,
              last_seen_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
          }).eq('id', existing.id);
      } else {
          await untypedClient.from('operator_sessions').insert({
              user_id: userId,
              device_id: deviceId,
              device_name: deviceName,
              is_active: true,
              expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
          });
      }
    } catch (err: any) {
      console.error('🔥 AuthContext: registerSession falhou silenciosamente ->', err.message);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error: err } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (err) {
        console.error('🔥 AuthContext: Erro na query fetchUserProfile:', err.message, err.details)
        return
      }
      setProfile(data as UserProfile)
    } catch (err) {
      console.error('🔥 AuthContext: Exceção no fetchUserProfile:', err)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { error: err } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (err) throw err
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      throw err
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      
      if (user) {
          const deviceId = getDeviceId();
          // Desativa todas as sessoes deste user_id (Logout multi-device)
          await untypedClient
            .from('operator_sessions')
            .update({ is_active: false })
            .eq('user_id', user.id);
            
          await untypedClient.from('operator_login_history').insert({
            user_id: user.id,
            action: 'LOGOUT',
            device_id: deviceId,
            device_name: getDeviceName()
          });
      }

      const { error: err } = await supabaseClient.auth.signOut()

      if (err) throw err

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
