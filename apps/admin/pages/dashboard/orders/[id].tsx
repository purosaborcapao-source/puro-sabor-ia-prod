import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { OrderDetail } from '@/components/Orders/OrderDetail'
import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      if (profile.role !== 'ADMIN' && profile.role !== 'GERENTE' && profile.role !== 'ATENDENTE') {
        router.push('/auth/login')
      }
    }
  }, [user, profile, loading, router])

  if (loading || !user || !profile || !id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Detalhe do Pedido - Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/orders"
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📦 Detalhe do Pedido
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {typeof id === 'string' && <OrderDetail orderId={id} />}
        </main>
      </div>
    </>
  )
}
