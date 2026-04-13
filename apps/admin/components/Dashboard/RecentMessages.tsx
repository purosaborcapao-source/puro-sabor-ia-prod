import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@atendimento-ia/supabase'

interface RecentMessage {
  id: string
  customer_id: string
  customer_name: string
  phone: string
  content: string
  created_at: string
  is_read: boolean
  status: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function RecentMessages() {
  const [messages, setMessages] = useState<RecentMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            customer_id,
            phone,
            content,
            created_at,
            is_read,
            customers:customer_id(name)
          `)
          .eq('direction', 'INBOUND')
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) throw error

        const { data: convsData } = await supabase
          .from('conversations')
          .select('customer_id, status')
          
        const convMap = new Map(convsData?.map(c => [c.customer_id, c.status]))

        const formattedMessages: RecentMessage[] = (data || []).map((msg: any) => ({
          id: msg.id,
          customer_id: msg.customer_id,
          customer_name: msg.customers?.name || 'Desconhecido',
          phone: msg.phone,
          content: msg.content,
          created_at: msg.created_at,
          is_read: msg.is_read,
          status: convMap.get(msg.customer_id) || 'UNKNOWN'
        }))

        setMessages(formattedMessages)
      } catch (error) {
        console.error('Erro ao buscar mensagens recentes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentMessages()
  }, [])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs uppercase tracking-widest font-bold">Nenhuma mensagem</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {messages.map((msg, index) => {
        const isNotLast = index < messages.length - 1
        const needsAttention = msg.status === 'NEW'

        return (
          <Link
            key={msg.id}
            href="/dashboard/messages"
            className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
              isNotLast ? 'border-b border-gray-100 dark:border-gray-800' : ''
            } ${needsAttention ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                needsAttention 
                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                <MessageCircle className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-bold text-sm truncate ${
                    needsAttention 
                      ? 'text-orange-900 dark:text-orange-300' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {msg.customer_name}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatTimeAgo(msg.created_at)}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {truncateText(msg.content, 60)}
                </p>
                
                {needsAttention && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded uppercase tracking-wider">
                    NÃO LIDO
                  </span>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
            </div>
          </Link>
        )
      })}

      <Link
        href="/dashboard/messages"
        className="block w-full p-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-center text-xs font-black tracking-widest uppercase text-blue-600 dark:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        VER TODAS →
      </Link>
    </div>
  )
}