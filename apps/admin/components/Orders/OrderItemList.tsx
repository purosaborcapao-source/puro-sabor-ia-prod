import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { Package, Trash2, Hash, Pencil, Check, X } from 'lucide-react'

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
  disabled?: boolean
}

export function OrderItemList({ orderId, refreshKey, onItemRemoved, disabled = false }: OrderItemListProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: string; field: 'qty' | 'price'; value: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshKey])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

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
      await recalcOrderTotal()
      onItemRemoved()
      loadItems()
    } catch (err) {
      console.error('Erro ao remover item:', err)
      alert('Falha ao remover item.')
    }
  }

  const recalcOrderTotal = async (overrideItems?: OrderItem[]) => {
    const source = overrideItems ?? items
    const total = source.reduce((sum, it) => {
      const isKG = it.products?.sale_unit === 'KG'
      return sum + (isKG ? (it.quantity / 1000) * it.unit_price : it.quantity * it.unit_price)
    }, 0)
    await supabase.from('orders').update({ total } as any).eq('id', orderId)
  }

  const startEdit = (id: string, field: 'qty' | 'price', rawValue: number, isKG: boolean) => {
    if (disabled) return
    const display = field === 'qty' && isKG
      ? (rawValue / 1000).toString()
      : rawValue.toString()
    setEditing({ id, field, value: display })
  }

  const cancelEdit = () => setEditing(null)

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const item = items.find(i => i.id === editing.id)
      if (!item) return
      const isKG = item.products?.sale_unit === 'KG'
      const parsed = parseFloat(editing.value.replace(',', '.'))
      if (isNaN(parsed) || parsed <= 0) { cancelEdit(); return }

      const update = editing.field === 'qty'
        ? { quantity: isKG ? Math.round(parsed * 1000) : Math.round(parsed) }
        : { unit_price: parsed }

      const { error } = await supabase
        .from('order_items')
        .update(update)
        .eq('id', editing.id)
      if (error) throw error

      // Optimistically update local state for recalc
      const updated = items.map(i =>
        i.id === editing.id ? { ...i, ...update } : i
      )
      setItems(updated)
      await recalcOrderTotal(updated)
      onItemRemoved() // triggers parent refresh (order total display)
      setEditing(null)
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
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

        const isEditingQty = editing?.id === item.id && editing.field === 'qty'
        const isEditingPrice = editing?.id === item.id && editing.field === 'price'

        return (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-gray-800 rounded-xl group hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-4">
              {/* Quantity badge — click to edit */}
              {isEditingQty ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="number"
                    step={isKG ? '0.1' : '1'}
                    min={isKG ? '0.1' : '1'}
                    value={editing.value}
                    onChange={e => setEditing({ ...editing, value: e.target.value })}
                    onKeyDown={handleKeyDown}
                    onBlur={saveEdit}
                    disabled={saving}
                    className="w-16 h-8 text-center text-xs font-black bg-blue-50 dark:bg-blue-900/30 border border-blue-400 rounded outline-none"
                  />
                  <span className="text-[9px] text-gray-400">{isKG ? 'kg' : 'un'}</span>
                  <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
                  <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(item.id, 'qty', item.quantity, isKG)}
                  disabled={disabled}
                  title={disabled ? undefined : 'Clique para editar quantidade'}
                  className={`w-8 h-8 rounded bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-[10px] font-black text-gray-500 ${!disabled ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 cursor-pointer' : ''} transition-all`}
                >
                  {qtyDisplay}
                </button>
              )}

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
                {/* Unit price — click to edit */}
                {isEditingPrice ? (
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className="text-[9px] text-gray-400">R$</span>
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={editing.value}
                      onChange={e => setEditing({ ...editing, value: e.target.value })}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      disabled={saving}
                      className="w-16 text-right text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 border border-blue-400 rounded outline-none px-1"
                    />
                    <button onClick={saveEdit} disabled={saving} className="p-0.5 text-emerald-600"><Check className="w-3 h-3" /></button>
                    <button onClick={cancelEdit} className="p-0.5 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(item.id, 'price', item.unit_price, isKG)}
                    disabled={disabled}
                    title={disabled ? undefined : 'Clique para editar preço unitário'}
                    className={`text-[9px] font-bold text-gray-400 uppercase tracking-tight ${!disabled ? 'hover:text-blue-500 cursor-pointer' : ''} transition-all flex items-center gap-1`}
                  >
                    {item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{isKG ? 'kg' : 'un'}
                    {!disabled && <Pencil className="w-2 h-2 opacity-0 group-hover:opacity-60" />}
                  </button>
                )}
              </div>
              {!disabled && (
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
