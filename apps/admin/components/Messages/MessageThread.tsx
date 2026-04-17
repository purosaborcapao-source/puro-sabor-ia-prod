import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageReplyForm } from "./MessageReplyForm";
import { MessageBubble } from "./MessageBubble";
import { AlertCircle, Ban, WifiOff } from "lucide-react";
import { ConversationStatusBadge, ConversationStatus } from "./ConversationStatusBadge";
import { SLATimer } from "./SLATimer";
import { useChatPresence } from "@/contexts/ChatPresenceContext";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT";
  media_url?: string;
  created_at: string | null;
  payload?: any;
  sent_by_operator_name?: string | null;
  read_by_operator_name?: string | null;
}

interface MessageThreadProps {
  customerId: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ customerId }) => {
  const { setOpenCustomer, clearOpenCustomer } = useChatPresence();
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerName, setCustomerName] = useState("Cliente");
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<ConversationStatus | null>(null);
  const [lastInboundAt, setLastInboundAt] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  
  const realtimeDisconnected = false;
  const handleRealtimeStatus = (_status: string) => {};
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Refs para controlar auto-assignment e bloquear realtime durante write
  const autoAssignDoneRef = useRef(false);
  const isAutoAssigningRef = useRef(false);

  // Carregar mensagens — estável para sempre
  const loadMessages = useCallback(async () => {
    try {
      // Silent refresh: só mostra loading se não houver mensagens
      if (messages.length === 0) {
        setLoading(true);
      }
      setError(null);

      // Buscar customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("name, phone")
        .eq("id", customerId)
        .single();

      if (!customerError && customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
      }

      // Buscar status da conversa
      const { data: convData } = await supabase
        .from("conversations")
        .select("status, last_inbound_at, is_blocked, assigned_operator_id, profiles:assigned_operator_id(name)")
        .eq("customer_id", customerId)
        .single();

      if (convData) {
        setConvStatus((convData as any).status as ConversationStatus);
        setLastInboundAt((convData as any).last_inbound_at);
        setIsBlocked((convData as any).is_blocked || false);
      }

      // Buscar mensagens (últimas 30 apenas)
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id, direction, content, type, media_url, created_at, payload, is_read, sent_by_operator_name, read_by_operator_name")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(30);

      if (messagesError) {
        throw messagesError;
      }

      // Type guard para filtrar erros de query
      const validMessages: Message[] = [];
      if (Array.isArray(data)) {
        for (const m of data) {
          if (m && typeof m === 'object' && 'id' in m && 'direction' in m) {
            validMessages.push(m as Message);
          }
        }
      }
      setMessages(validMessages);

      // Scroll para última mensagem apenas no primeiro carregamento
      if (isFirstLoadRef.current && validMessages.length > 0) {
        isFirstLoadRef.current = false;
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ block: "end" });
        }, 0);
      }

      // Verificar se há MAIS mensagens além das 30 carregadas
      const countRes = await supabase
        .from("messages")
        .select("id", { count: "exact" })
        .eq("customer_id", customerId);

      setHasOlderMessages((countRes.count || 0) > 30);

      // Marca mensagens não lidas como lidas e grava quem as visualizou
      const unreadIds = data
        .filter((m: any) => m.direction === "INBOUND" && m.is_read === false)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        // Usar getSession() (cache local, sem request de rede) para garantir
        // que o operador esteja disponível mesmo no primeiro render
        const { data: sessionData } = await supabase.auth.getSession();
        const operatorId = sessionData.session?.user?.id ?? null;

        // Buscar nome do operador
        let operatorName: string | null = null;
        if (operatorId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", operatorId)
            .single();
          if (profileData) operatorName = (profileData as any).name ?? null;
        }

        // Atualizar mensagens com informações do operador que leu
        const { error: updateError } = await supabase
          .from("messages")
          .update({
            is_read: true,
            read_by_operator_id: operatorId,
            read_by_operator_name: operatorName,
          } as any)
          .in("id", unreadIds);

        if (updateError) {
          console.error("❌ Erro ao marcar mensagens como lidas:", updateError);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao carregar mensagens:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mensagens"
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // Rastrear conversa aberta para atribuição de operador
  useEffect(() => {
    setOpenCustomer(customerId);
    return () => clearOpenCustomer();
  }, [customerId]); // eslint-disable-line

  // Carregar mensagens e setup realtime
  useEffect(() => {
    // Cancellation flag: prevents stale customer updates after effect cleanup
    let cancelled = false;

    const safeLoad = () => {
      if (!cancelled) loadMessages();
    };

    // Reset auto-assign flag e scroll ref quando customerId muda
    autoAssignDoneRef.current = false;
    isFirstLoadRef.current = false; // Permite novo scroll na próxima conversa

    safeLoad();

    const subMessages = supabase
      .channel(`messages:customer:${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          if (cancelled || isAutoAssigningRef.current) return;
          const msg = payload.new as Message;
          if (!msg?.id) return;
          // Adiciona incrementalmente sem recarregar tudo
          setMessages((prev) =>
            prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          setTimeout(
            () => messagesEndRef.current?.scrollIntoView({ block: "end" }),
            80
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          if (cancelled) return;
          const msg = payload.new as Message;
          if (!msg?.id) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
          );
        }
      )
      .subscribe(handleRealtimeStatus);

    const subConversations = supabase
      .channel(`conversations:customer:${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          if (cancelled || isAutoAssigningRef.current) return;
          if (!payload.new) return;
          const conv = payload.new as any;
          setConvStatus(conv.status as ConversationStatus);
          setLastInboundAt(conv.last_inbound_at ?? null);
          setIsBlocked(conv.is_blocked ?? false);
        }
      )
      .subscribe(handleRealtimeStatus);

    return () => {
      cancelled = true;
      subMessages.unsubscribe();
      subConversations.unsubscribe();
    };
  }, [customerId, loadMessages]);


  // Garantir que operador é atribuído ao abrir conversa
  useEffect(() => {
    if (!customerId || autoAssignDoneRef.current) return;

    autoAssignDoneRef.current = true;
    isAutoAssigningRef.current = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Se era NEW, atualizar para IN_PROGRESS
        if (convStatus === "NEW") {
          await supabase
            .from("conversations")
            .update({ status: "IN_PROGRESS" })
            .eq("customer_id", customerId);
          setConvStatus("IN_PROGRESS");
        }
      } catch (err) {
        console.error("❌ Erro ao atribuir operador:", err);
      } finally {
        isAutoAssigningRef.current = false;
      }
    })();
  }, [convStatus, customerId]);

  // Carregar mensagens mais antigas
  const loadOlderMessages = async () => {
    if (!messages.length || loadingOlder) return;

    setLoadingOlder(true);
    try {
      const oldestDate = messages[0].created_at;
      const { data: olderMessagesRaw, error } = await supabase
        .from("messages")
        .select("id, direction, content, type, media_url, created_at, payload, is_read, sent_by_operator_name, read_by_operator_name")
        .eq("customer_id", customerId)
        .lt("created_at", oldestDate)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(30);

      if (error) throw error;

      // Type guard para filtrar erros de query
      const olderMessages: Message[] = [];
      if (Array.isArray(olderMessagesRaw)) {
        for (const m of olderMessagesRaw) {
          if (m && typeof m === 'object' && 'id' in m && 'direction' in m) {
            olderMessages.push(m as Message);
          }
        }
      }

      if (olderMessages.length > 0) {
        setMessages([...olderMessages, ...messages]);
        // Se retornou menos de 30, não há mais mensagens antigas
        if (olderMessages.length < 30) {
          setHasOlderMessages(false);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao carregar mensagens antigas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens antigas");
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSendReply = async (
    content: string,
    attachment?: { type: string; url: string; fileName?: string }
  ) => {
    if (!customerPhone) {
      setError("Telefone do cliente não encontrado.");
      return;
    }

    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      let payload: Record<string, unknown> = {
        phone: customerPhone,
        customerId,
        operatorId: user?.id,
      };

      if (attachment) {
        if (attachment.type === "image") {
          payload = {
            ...payload,
            type: "image",
            imageUrl: attachment.url,
            caption: content,
          };
        } else if (attachment.type === "audio") {
          payload = {
            ...payload,
            type: "audio",
            audioUrl: attachment.url,
          };
        } else if (attachment.type === "document") {
          payload = {
            ...payload,
            type: "document",
            documentUrl: attachment.url,
            fileName: attachment.fileName,
            caption: content,
          };
        }
      } else {
        payload = {
          ...payload,
          type: "text",
          message: content,
        };
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao conectar com Z-API");
      }

      await supabase
        .from("conversations")
        .update({
          last_outbound_at: new Date().toISOString(),
          status: "IN_PROGRESS",
        })
        .eq("customer_id", customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-blue-500 animate-spin" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Carregando</p>
        </div>
      </div>
    );
  }

  const initialLetter = customerName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* Header compacto */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        {/* Esquerda: avatar + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-600 dark:text-zinc-300 shrink-0">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate leading-tight">{customerName}</p>
            <p className="text-[11px] text-zinc-400 font-mono leading-tight">{customerPhone || "—"}</p>
          </div>
        </div>

        {/* Direita: status + SLA + ações */}
        <div className="flex items-center gap-2 shrink-0">
          {realtimeDisconnected && (
            <span title="Realtime desconectado">
              <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            </span>
          )}
          {isBlocked && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black uppercase rounded-full border border-red-200 dark:border-red-800 tracking-widest">
              Congelada
            </span>
          )}
          {convStatus && <ConversationStatusBadge status={convStatus} />}
          {lastInboundAt && convStatus && (
            <SLATimer status={convStatus} lastInboundAt={lastInboundAt} />
          )}
          <button
            onClick={async () => {
              const novo = !isBlocked;
              await supabase.from("conversations").update({ is_blocked: novo } as any).eq("customer_id", customerId);
              setIsBlocked(novo);
            }}
            title={isBlocked ? "Descongelar conversa" : "Congelar conversa"}
            className={`p-1.5 rounded-lg transition-colors ${
              isBlocked
                ? "text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100"
                : "text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de mensagens — fundo diferenciado como um chat */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 bg-zinc-50 dark:bg-[#111113]">
        {error && (
          <div className="mx-4 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {hasOlderMessages && (
          <div className="flex justify-center mb-2 px-4">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="px-4 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loadingOlder ? "Carregando..." : "Carregar mensagens anteriores"}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-zinc-400 dark:text-zinc-600">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <MessageReplyForm onSend={handleSendReply} />
      </div>
    </div>
  );
};
