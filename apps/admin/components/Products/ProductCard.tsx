import React, { useState } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { Edit3, Trash2, Package, TrendingUp, UploadCloud, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'

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

interface ProductCardProps {
  product: Product
  canEdit: boolean
  onQuickAdd?: (productId: string, price: number) => Promise<void>
  onRefresh: () => void
}

export function ProductCard({ product, canEdit, onQuickAdd, onRefresh }: ProductCardProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleQuickAddClick = async () => {
    if (!onQuickAdd) return
    setIsAdding(true)
    try {
      await onQuickAdd(product.id, product.price)
    } finally {
      setIsAdding(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${product.id}-${Math.random()}.${fileExt}`
      const filePath = `products/${fileName}`

      // 1. Upload para o bucket
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      // 3. Atualizar no banco
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', product.id)

      if (updateError) throw updateError
      
      onRefresh()
    } catch (err) {
      console.error('Erro no upload:', err)
      alert('Falha ao subir imagem.')
    } finally {
      setIsUploading(false)
    }
  }

  const isLowStock = product.current_stock <= product.min_stock

  return (
    <div className="group relative bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
      
      {/* Imagem do Produto com Overlay Glassmorphism */}
      <div className="relative h-48 sm:h-56 bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <Package className="w-12 h-12 mb-2 opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sem Imagem</span>
          </div>
        )}

        {/* HUD: Status e Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm border ${
              product.is_active 
                ? 'bg-emerald-500/90 border-emerald-400 text-white' 
                : 'bg-gray-500/90 border-gray-400 text-white'
            }`}>
              {product.is_active ? 'Ativo' : 'Offline'}
            </span>
            {isLowStock && (
              <span className="bg-red-600/90 border border-red-400 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-sm">
                <AlertCircle className="w-3 h-3" /> Baixo Estoque
              </span>
            )}
        </div>

        {/* Botão de Upload e Adição Rápida (In-Card) */}
        <div className="absolute top-3 right-3 flex gap-2">
            {onQuickAdd && (
              <button 
                onClick={handleQuickAddClick}
                disabled={isAdding}
                className="p-2 bg-blue-600 border border-blue-400 rounded-full text-white shadow-lg hover:bg-blue-700 transition-all active:scale-90"
              >
                <Plus className={`w-4 h-4 ${isAdding ? 'animate-spin' : ''}`} />
              </button>
            )}
            {canEdit && (
              <label className="p-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-black/60">
                <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            )}
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1">{product.category}</p>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">{product.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
              {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Métricas de Estoque HUD */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Disponível</p>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black dark:text-gray-200">{product.current_stock} un</span>
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (product.current_stock / (product.min_stock || 10)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Média Mensal</p>
                <div className="flex items-center justify-end gap-1 text-emerald-500 text-[10px] font-black">
                    <TrendingUp className="w-3 h-3" />
                    +12%
                </div>
            </div>
        </div>

        {/* Ações Rápidas */}
        {canEdit && (
          <div className="mt-5 flex gap-2">
            <Link 
              href={`/dashboard/products/${product.id}/edit`}
              className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 py-2 rounded font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Edit3 className="w-3 h-3" /> Editar
            </Link>
            <button className="px-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 py-2 rounded font-black text-[10px] uppercase transition-all flex items-center justify-center">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
