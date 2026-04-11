import React, { useState } from 'react'
import { X, Search, Package, ShoppingCart } from 'lucide-react'
import { ProductGallery } from '../Products/ProductGallery'

interface ProductCatalogDrawerProps {
  isOpen: boolean
  onClose: () => void
  onAddItem: (productId: string, price: number) => Promise<void>
}

export function ProductCatalogDrawer({ isOpen, onClose, onAddItem: _onAddItem }: ProductCatalogDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-black z-[101] shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-black tracking-[0.2em] uppercase text-gray-900 dark:text-white">
                Quick Order Vault
              </h2>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Selecione itens para adicionar ao pedido
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Search HUD */}
        <div className="p-4 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-900">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="BUSCAR PRODUTO..."
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-xl text-xs font-black tracking-widest uppercase focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
           </div>
        </div>

        {/* Content - Compact Gallery */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
          <ProductGallery 
            searchTerm={searchTerm} 
            canEdit={true} 
            onRefresh={() => {}} 
            // Injetar modo de seleção compacto aqui seria ideal, 
            // mas por enquanto vamos usar a galeria padrão e customizar via CSS ou props se necessário
          />
        </div>

        {/* Footer / Info */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50">
           <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl text-blue-700 dark:text-blue-400">
              <Package className="w-5 h-5" />
              <p className="text-[10px] font-bold uppercase tracking-tight">
                Clique no &quot;+&quot; de qualquer produto para adicionar 1 unidade ao pedido ativo.
              </p>
           </div>
        </div>
      </div>
    </>
  )
}
