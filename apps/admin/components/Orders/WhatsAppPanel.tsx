import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@atendimento-ia/supabase'
import {
  MessageCircle,
  Brain,
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  FileText,
  Zap,
  X,
  Loader2,
  CheckCheck,
  LayoutGrid,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'VIDEO'
type Direction = 'INBOUND' | 'OUTBOUND'

interface Message {
  id: string
  direction: Direction
  type: MessageType
  content: string
  media_url?: string | null
  created_at: string | null
  zapi_status?: string | null
  payload?: {
    intent?: string
    confidence?: number
    suggested_response?: string
  }
}

interface WhatsAppPanelProps {
  phone: string
  customerId: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function WhatsAppPanel({ phone, customerId }: WhatsAppPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [attachMode, setAttachMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Load & Realtime ────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('id, direction, type, content, media_url, created_at, zapi_status, payload')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages((data as unknown as Message[]) || [])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`wapp_${customerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${customerId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `customer_id=eq.${customerId}` },
        (payload) => setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? { ...m, ...(payload.new as Message) } : m))
        )
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [customerId, loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── Send Text ──────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', phone, message: trimmed, customerId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setText('')
      textareaRef.current?.focus()
    } catch (err) {
      console.error('❌ Envio falhou:', err)
      alert('Falha ao enviar mensagem. Verifique se a instância está conectada.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Use AI Suggestion ──────────────────────────────────────────────────────

  const useSuggestion = (suggestion: string) => {
    setText(suggestion)
    textareaRef.current?.focus()
    setAttachMode(false)
  }

  // ── Analyze Chat ───────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true)
      const { data, error } = await supabase.functions.invoke('analyze-chat', {
        body: { customer_id: customerId },
      })
      if (error) throw error
      console.log('✅ Análise IA:', data)
    } catch (err) {
      console.error('❌ Análise falhou:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSendCatalog = async () => {
    if (sending) return
    setSending(true)
    try {
      const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'https://puro-sabor-ia-prod.vercel.app';
      const message = `Olá! Segue nosso cardápio completo: ${customerUrl}/pedido. Qualquer dúvida estou à disposição! 🍰`
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', phone, message, customerId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      alert('Cardápio enviado com sucesso!')
    } catch (err) {
      console.error('❌ Envio de cardápio falhou:', err)
      alert('Falha ao enviar cardápio.')
    } finally {
      setSending(false)
    }
  }

  // ── File Upload (image / document) ────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const type = isImage ? 'image' : 'document'
    
    setSending(true)
    try {
      // Upload to Supabase Storage
      const path = `whatsapp/${customerId}/${Date.now()}_${file.name}`
      const { data: _uploaded, error: uploadErr } = await supabase.storage
        .from('media')
        .upload(path, file, { contentType: file.type, upsert: false })
      
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)

      const body: Record<string, string> = {
        type,
        phone,
        customerId,
        ...(isImage
          ? { imageUrl: publicUrl, caption: '' }
          : { documentUrl: publicUrl, fileName: file.name }),
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch (err) {
      console.error('❌ Upload falhou:', err)
      alert('Falha ao enviar arquivo.')
    } finally {
      setSending(false)
      setAttachMode(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[600px] border border-gray-200 dark:border-gray-800 overflow-hidden bg-[#F0F2F5] dark:bg-[#080808]"
      style={{ borderRadius: '2px' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0D0D0D] px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-black tracking-widest text-gray-900 dark:text-white uppercase">WhatsApp</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono">
              +{phone.replace(/\D/g, '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-analyze-ai"
            onClick={handleAnalyze}
            disabled={analyzing}
            title="Sincronizar IA"
            className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-black tracking-widest uppercase transition-all ${
              analyzing
                ? 'border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed'
                : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
            style={{ borderRadius: '1px' }}
          >
            <Brain className={`w-3 h-3 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analisando...' : 'IA'}
          </button>
          <button
            onClick={handleSendCatalog}
            disabled={sending}
            title="Enviar Cardápio"
            className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-black tracking-widest uppercase transition-all ${
              sending
                ? 'border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed'
                : 'border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
            }`}
            style={{ borderRadius: '1px' }}
          >
            <LayoutGrid className="w-3 h-3" />
            {sending ? 'Enviando...' : 'Cardápio'}
          </button>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-black tracking-widest uppercase" style={{ borderRadius: '2px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-gray-300 dark:text-gray-700 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <MessageCircle className="w-10 h-10 text-gray-400" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhuma atividade</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onUseSuggestion={useSuggestion} />
          ))
        )}
      </div>

      {/* ── Attach options ──────────────────────────────────────────────────── */}
      {attachMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0D0D0D] border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => { fileRef.current?.click() }}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all"
            style={{ borderRadius: '1px' }}
          >
            <ImageIcon className="w-3 h-3" /> Imagem
          </button>
          <button
            onClick={() => { if (fileRef.current) { fileRef.current.accept = '*/*'; fileRef.current.click() } }}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            style={{ borderRadius: '1px' }}
          >
            <FileText className="w-3 h-3" /> Documento
          </button>
          <button
            onClick={() => setAttachMode(false)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0D0D0D] px-3 py-3 border-t border-gray-200 dark:border-gray-800 flex items-end gap-2 shrink-0">
        <button
          id="btn-attach"
          onClick={() => setAttachMode((p) => !p)}
          title="Anexar"
          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          id="whatsapp-message-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem… (Enter para enviar)"
          rows={1}
          className="flex-1 resize-none bg-[#F0F2F5] dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-emerald-600/50 transition-colors overflow-hidden leading-relaxed"
          style={{ borderRadius: '2px', maxHeight: 120, minHeight: 38 }}
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = `${Math.min(t.scrollHeight, 120)}px`
          }}
        />

        <button
          id="btn-send-whatsapp"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          title="Enviar"
          className={`p-2.5 transition-all ${
            text.trim() && !sending
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          style={{ borderRadius: '2px' }}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onUseSuggestion,
}: {
  message: Message
  onUseSuggestion: (s: string) => void
}) {
  const isIncoming = message.direction === 'INBOUND'
  const hasSuggestion = isIncoming && message.payload?.suggested_response

  return (
    <div className={`flex flex-col gap-1 ${isIncoming ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
          isIncoming
            ? 'bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
            : 'bg-emerald-700 text-white'
        }`}
        style={{ borderRadius: '2px' }}
      >
        {/* Media rendering */}
        {message.type === 'IMAGE' && message.media_url && (
          <a href={message.media_url} target="_blank" rel="noreferrer" className="block mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.media_url}
              alt="Imagem"
              className="max-w-full max-h-48 object-contain"
              style={{ borderRadius: '1px' }}
            />
          </a>
        )}

        {message.type === 'AUDIO' && message.media_url && (
          <div className="mb-2 flex items-center gap-2">
            <Mic className="w-4 h-4 text-current opacity-60 shrink-0" />
            <audio controls src={message.media_url} className="h-7 w-full" />
          </div>
        )}

        {message.type === 'DOCUMENT' && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2 underline underline-offset-2"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">{message.content}</span>
          </a>
        )}

        {/* Text content */}
        {(message.type === 'TEXT' || message.type === 'VIDEO') && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {message.type === 'IMAGE' && message.content && message.content !== '[Imagem]' && (
          <p className="mt-1 text-[10px] opacity-70 italic">{message.content}</p>
        )}

        {/* AI intent badge */}
        {isIncoming && message.payload?.intent && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-tighter">
              {message.payload.intent}
              {message.payload.confidence !== undefined &&
                ` · ${Math.round(message.payload.confidence * 100)}%`}
            </span>
          </div>
        )}
      </div>

      {/* AI suggestion */}
      {hasSuggestion && (
        <div
          className="max-w-[85%] px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2"
          style={{ borderRadius: '2px' }}
        >
          <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">
              Sugestão IA
            </p>
            <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap break-words">
              {message.payload!.suggested_response}
            </p>
          </div>
          <button
            id={`btn-use-suggestion-${message.id}`}
            onClick={() => onUseSuggestion(message.payload!.suggested_response!)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[9px] font-black uppercase tracking-widest transition-all"
            style={{ borderRadius: '1px' }}
            title="Usar sugestão"
          >
            <Send className="w-2.5 h-2.5" /> Usar
          </button>
        </div>
      )}

      {/* Timestamp + status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
          {message.created_at ? new Date(message.created_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
        </span>
        {!isIncoming && (
          <CheckCheck
            className={`w-3 h-3 ${
              message.zapi_status === 'READ' ? 'text-blue-500' : 'text-gray-400'
            }`}
          />
        )}
      </div>
    </div>
  )
}
