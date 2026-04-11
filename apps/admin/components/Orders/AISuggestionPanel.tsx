import React, { useState, useEffect } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import { Brain, Check, X } from 'lucide-react'

interface AISuggestion {
  id: string
  order_id: string
  reason: string
  suggestion_data: {
    delivery_date?: string
    suggested_total?: number
    change_reason?: string
  }
}

interface AISuggestionPanelProps {
  orderId: string
  onSuggestionApplied: () => void
}

export function AISuggestionPanel({ orderId, onSuggestionApplied }: AISuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_changes')
        .select('*')
        .eq('order_id', orderId)
        .eq('status' as any, 'PENDENTE')
        .eq('is_ai_suggestion' as any, true)

      if (error) throw error
      setSuggestions(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'APROVADO' | 'REJEITADO', suggestionData?: any) => {
    try {
      // 1. Atualizar status da sugestão
      const { error: updateErr } = await supabase
        .from('order_changes')
        .update({ status: action } as any)
        .eq('id', id)
      
      if (updateErr) throw updateErr

      // 2. Se aprovado, aplicar mudanças no pedido
      if (action === 'APROVADO' && suggestionData) {
        const updates: any = {}
        if (suggestionData.delivery_date) updates.delivery_date = suggestionData.delivery_date
        if (suggestionData.suggested_total) updates.total = suggestionData.suggested_total

        const { error: orderErr } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', orderId)
        
        if (orderErr) throw orderErr
      }

      onSuggestionApplied()
      loadSuggestions()
    } catch (err) {
      console.error('❌ Erro ao processar sugestão:', err)
      alert('Falha ao processar ação.')
    }
  }

  if (loading || suggestions.length === 0) return null

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-[10px] font-black tracking-widest uppercase text-purple-600 dark:text-purple-400 flex items-center gap-2">
        <Brain className="w-3.5 h-3.5" /> IA Suggestion Radar
      </h3>
      
      {suggestions.map((s) => (
        <div key={s.id} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 p-4 rounded-lg shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200 leading-relaxed mb-2">
                {s.reason}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-black tracking-tight text-purple-700 dark:text-purple-400">
                {s.suggestion_data.delivery_date && (
                  <div className="flex items-center gap-1">
                    <span className="opacity-50">NOVA DATA:</span> {new Date(s.suggestion_data.delivery_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {s.suggestion_data.suggested_total && (
                  <div className="flex items-center gap-1">
                    <span className="opacity-50">NOVO TOTAL:</span> R$ {s.suggestion_data.suggested_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleAction(s.id, 'REJEITADO')}
                className="p-1.5 rounded bg-white dark:bg-black border border-purple-200 dark:border-purple-800 text-purple-400 hover:text-red-500 transition-colors"
                title="Descartar"
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleAction(s.id, 'APROVADO', s.suggestion_data)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded text-[10px] font-black tracking-widest uppercase hover:bg-purple-700 transition-all shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5" /> Aplicar Alteração
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
