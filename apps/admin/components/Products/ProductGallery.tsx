import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { ProductCard } from './ProductCard'
import { Search, Grid, RefreshCcw } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  category: string
  image_url?: string
  current_stock: number
  min_stock: number
  is_active: boolean
}

interface ProductGalleryProps {
  searchTerm: string
  canEdit?: boolean
  onQuickAdd?: (productId: string, price: number) => Promise<void>
  onRefresh?: () => void
}

export function ProductGallery({ searchTerm, canEdit = false, onQuickAdd, onRefresh }: ProductGalleryProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  
  const categories = Array.from(new Set(products.map(p => p.category)))

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('products').select('*')

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      if (filterCategory) {
        query = query.eq('category', filterCategory)
      }

      const { data, error } = await query.order('name', { ascending: true })
      if (error) throw error
      setProducts(data || [])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterCategory])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[400px] bg-gray-100 dark:bg-gray-900 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filtros e Controles HUD */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button 
            onClick={() => setFilterCategory(null)}
            className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
              !filterCategory ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                filterCategory === cat ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-gray-400">
           <div className="text-[10px] font-black uppercase tracking-widest">
              Total: <span className="text-gray-900 dark:text-white">{products.length} itens</span>
           </div>
           <button onClick={() => fetchProducts()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all">
              <RefreshCcw className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Grid de Cards */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Search className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Nenhum tesouro encontrado no Vault.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              canEdit={canEdit} 
              onQuickAdd={onQuickAdd}
              onRefresh={() => {
                fetchProducts()
                onRefresh?.()
              }} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
