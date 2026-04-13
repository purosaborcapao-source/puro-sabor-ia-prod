import React, { useState, useEffect } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { AlertCircle, History, User, Info, CheckCircle2 } from 'lucide-react'

interface OrderChange {
  id: string
  created_at: string
  field: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  is_ai_suggestion: boolean
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  profiles: {
    name: string
  }
}

interface ChangeHistoryProps {
  orderId: string
  refreshKey?: number
}

const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    status: 'Status do Pedido',
    payment_status: 'Status Financeiro',
    delivery_date: 'Data de Entrega',
    delivery_type: 'Tipo de Entrega',
    address: 'Endereço',
    total: 'Valor Total',
    notes: 'Observações'
  }
  return labels[field] || field
}

export function ChangeHistory({ orderId, refreshKey = 0 }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<OrderChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChanges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshKey])

  const loadChanges = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('order_changes')
        .select(`
          id,
          created_at,
          field,
          old_value,
          new_value,
          reason,
          is_ai_suggestion,
          status,
          profiles:changed_by (name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setChanges((data as any) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico'
      console.error('Erro ao carregar histórico:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && changes.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consultando Auditoria...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-black text-red-900 dark:text-red-200 uppercase tracking-widest">Falha na Auditoria</h3>
          <p className="text-[11px] text-red-800 dark:text-red-300 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
        <History className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhuma alteração registrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-blue-600" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Histórico de Alterações (Audit Log)</h3>
      </div>

      <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-gray-200 dark:before:bg-gray-800">
        {changes.map((change) => (
          <div key={change.id} className="relative pl-12 group">
            <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-4 border-white dark:border-[#0A0A0A] flex items-center justify-center transition-all shadow-sm ${
              change.is_ai_suggestion 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' 
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
            }`}>
              {change.is_ai_suggestion ? (
                <span className="text-xs">🤖</span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 transition-all group-hover:border-blue-500/30 group-hover:shadow-lg group-hover:shadow-blue-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">
                    {change.profiles?.name || 'Sistema'}
                  </p>
                  {change.is_ai_suggestion && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] font-black uppercase tracking-tighter rounded">Sugestão IA</span>
                  )}
                  {change.status === 'APROVADO' && (
                    <span className="text-[10px] text-green-500"><CheckCircle2 className="w-3 h-3" /></span>
                  )}
                </div>
                <time className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                  {new Date(change.created_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </time>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {getFieldLabel(change.field)}
                </p>
                
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg line-through opacity-60">
                    {change.old_value || 'Vazio'}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg font-black">
                    {change.new_value || 'Vazio'}
                  </span>
                </div>

                {change.reason && (
                  <div className="mt-3 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                    <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 italic font-medium">
                      &quot;{change.reason}&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
