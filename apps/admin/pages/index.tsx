import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard/messages')
    }
  }, [user, loading, router])

  return (
    <>
      <Head>
        <title>Puro Sabor IA - Carregando...</title>
      </Head>

      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">🍞</div>
          <div className="text-xs font-black tracking-[0.2em] text-blue-500 uppercase">
            Iniciando Ops Center...
          </div>
          <div className="w-48 h-1 bg-gray-900 mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
          </div>
        </div>

        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </main>
    </>
  )
}
