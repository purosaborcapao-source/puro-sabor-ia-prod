import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, type Database } from '@atendimento-ia/supabase'

type Product = Database['public']['Tables']['products']['Row']

interface ProductTableProps {
  searchTerm: string
  canEdit?: boolean
  onRefresh?: () => void
}

export function ProductTable({ searchTerm, canEdit = false, onRefresh }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from('products').select('*')

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const { data, error: err } = await query.order('created_at', {
        ascending: false
      })

      if (err) throw err

      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produtos')
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return

    try {
      const { error: err } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)

      if (err) throw err

      setProducts(products.filter((p) => p.id !== id))
      onRefresh?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar produto')
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Carregando produtos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
              Nome
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
              Preço
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
              Categoria
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
              Ativo
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {product.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                R$ {product.price.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {product.category}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    product.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {product.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm space-x-2">
                {canEdit && (
                  <>
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      Deletar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum produto encontrado
          </p>
        </div>
      )}
    </div>
  )
}
