import React, { useState, useEffect } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { Package, Trash2, Hash } from 'lucide-react'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  products: {
    name: string
    category: string
    sale_unit: string
  }
  notes?: string | null
}

interface OrderItemListProps {
  orderId: string
  refreshKey: number
  onItemRemoved: () => void
}

export function OrderItemList({ orderId, refreshKey, onItemRemoved }: OrderItemListProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshKey])

  const loadItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          notes,
          products:product_id(name, category, sale_unit)
        `)
        .eq('order_id', orderId)

      if (error) throw error
      setItems(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (itemId: string) => {
    if (!confirm('Remover este item do pedido?')) return

    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      onItemRemoved()
      loadItems()
    } catch (err) {
      console.error('Erro ao remover item:', err)
      alert('Falha ao remover item.')
    }
  }

  if (loading && items.length === 0) {
    return <div className="animate-pulse space-y-3">
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
    </div>
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
        <Package className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum item adicionado</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-2">
        <Hash className="w-3 h-3" /> Itens do Pedido ({items.length})
      </h3>
      
      {items.map((item) => {
        const isKG = item.products?.sale_unit === 'KG'
        const qtyDisplay = isKG
          ? `${(item.quantity / 1000).toFixed(1).replace('.', ',')}kg`
          : `${item.quantity}x`
        const itemTotal = isKG
          ? (item.quantity / 1000) * item.unit_price
          : item.quantity * item.unit_price

        return (
        <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-gray-800 rounded-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-[10px] font-black text-gray-500">
              {qtyDisplay}
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-0.5">
                {item.products?.category}
              </p>
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {item.products?.name}
              </h4>
              {item.notes && (
                <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-0.5 italic">
                  obs: {item.notes}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                {item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{isKG ? 'kg' : 'un'}
              </p>
            </div>
            <button 
              onClick={() => handleRemove(item.id)}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )})}
    </div>
  )
}
