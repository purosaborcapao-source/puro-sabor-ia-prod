import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { ProductForm } from '@/components/Products/ProductForm'
import { supabase, type Database } from '@atendimento-ia/supabase'
import { useEffect, useState } from 'react'

type Product = Database['public']['Tables']['products']['Row']

export default function EditProductPage() {
  const router = useRouter()
  const { id: rawId } = router.query
  const id = typeof rawId === 'string' ? rawId : undefined
  const { user, profile, loading } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [productLoading, setProductLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }

    if (!loading && user && profile) {
      if (!['ADMIN', 'GERENTE'].includes(profile.role)) {
        router.push('/dashboard/products')
      }
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (!id) return

    const fetchProduct = async () => {
      try {
        setProductLoading(true)
        const { data, error: err } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (err) throw err
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar produto')
      } finally {
        setProductLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading || productLoading || !user || !profile) {
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

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Produto não encontrado</p>
        </div>
      </div>
    )
  }

  const handleSuccess = () => {
    router.push('/dashboard/products')
  }

  const handleCancel = () => {
    router.push('/dashboard/products')
  }

  return (
    <>
      <Head>
        <title>Editar Produto - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Editar Produto
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProductForm
            initialData={product}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </main>
      </div>
    </>
  )
}
