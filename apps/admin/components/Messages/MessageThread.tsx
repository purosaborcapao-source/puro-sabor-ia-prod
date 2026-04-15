import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageReplyForm } from "./MessageReplyForm";
import { MessageBubble } from "./MessageBubble";
import { AlertCircle, Ban, ShoppingCart, WifiOff } from "lucide-react";
import { useRouter } from "next/router";
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
  const router = useRouter();

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

      // Buscar mensagens (últimas 100 apenas)
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id, direction, content, type, media_url, created_at, payload, is_read, sent_by_operator_name, read_by_operator_name")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(100);

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

      // Verificar se há MAIS mensagens além das 100 carregadas
      const countRes = await supabase
        .from("messages")
        .select("id", { count: "exact" })
        .eq("customer_id", customerId);

      setHasOlderMessages((countRes.count || 0) > 100);

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
          })
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

    // Reset auto-assign flag quando customerId muda
    autoAssignDoneRef.current = false;

    safeLoad();

    const subMessages = supabase
      .channel(`messages:customer:${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          // Bloqueia realtime durante auto-assignment para evitar cascata
          if (!cancelled && !isAutoAssigningRef.current) loadMessages();
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
        () => {
          // Bloqueia realtime durante auto-assignment para evitar cascata
          if (!cancelled && !isAutoAssigningRef.current) loadMessages();
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
        .limit(100);

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
        // Se retornou menos de 100, não há mais mensagens antigas
        if (olderMessages.length < 100) {
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
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Carregando conversa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header Fixo */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {customerName}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {customerPhone || "Número não informado"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {realtimeDisconnected && (
            <span
              title="Conexão em tempo real perdida — atualizações automáticas pausadas"
              className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full font-semibold border border-yellow-200"
            >
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
          {convStatus && <ConversationStatusBadge status={convStatus} />}
          {lastInboundAt && convStatus && (
            <SLATimer status={convStatus} lastInboundAt={lastInboundAt} />
          )}
          {isBlocked && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold border border-red-200">
              CONGELADA
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const novo = !isBlocked;
              await supabase.from("conversations").update({ is_blocked: novo } as any).eq("customer_id", customerId);
              setIsBlocked(novo);
            }}
            title={isBlocked ? "Descongelar" : "Congelar conversa"}
            className={`p-2 rounded-lg transition border ${
              isBlocked 
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                : "bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:bg-gray-50"
            }`}
          >
            <Ban className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              router.push(`/dashboard/orders/new?customer_id=${customerId}&name=${encodeURIComponent(customerName)}&phone=${customerPhone || ''}`);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--primary-paprica)] hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Pedido</span>
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {hasOlderMessages && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingOlder ? "Carregando..." : "↑ Carregar mensagens anteriores"}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            Nenhuma mensagem nesta conversa
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <MessageReplyForm
          onSend={handleSendReply}
        />
      </div>
    </div>
  );
};
