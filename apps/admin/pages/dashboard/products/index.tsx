import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { ProductGallery } from '@/components/Products/ProductGallery'
import { Package, Plus, LayoutGrid, Search } from 'lucide-react'

export default function ProductsPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading || !user || !profile) {
    return null
  }

  const canEdit = ['ADMIN', 'GERENTE'].includes(profile.role)

  return (
    <>
      <Head>
        <title>Produtos - Admin</title>
      </Head>

      <div className="min-h-screen bg-white dark:bg-black">
        {/* Ops Center Header */}
        <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-blue-600" />
                <h1 className="text-sm font-black tracking-[0.2em] uppercase text-gray-900 dark:text-white">
                  The Product Vault
                </h1>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Gerenciamento de Ativos e Catálogo Premium
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="BUSCAR NO VAULT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-lg text-[10px] font-black tracking-widest uppercase focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              {canEdit && (
                <Link
                  href="/dashboard/products/new"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black tracking-widest uppercase rounded-lg transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Novo Ativo
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <ProductGallery
            searchTerm={searchTerm}
            canEdit={canEdit}
            onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </main>
      </div>
    </>
  )
}
