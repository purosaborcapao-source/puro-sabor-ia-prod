import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageReplyForm } from "./MessageReplyForm";
import { MessageBubble } from "./MessageBubble";
import { AlertCircle } from "lucide-react";
import { ConversationStatusBadge, ConversationStatus } from "./ConversationStatusBadge";
import { SLATimer } from "./SLATimer";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT";
  media_url?: string;
  created_at: string | null;
  payload?: any;
}

interface MessageThreadProps {
  customerId: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ customerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerName, setCustomerName] = useState("Cliente");
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<ConversationStatus | null>(null);
  const [lastInboundAt, setLastInboundAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll para o final quando novas mensagens chegam
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Carregar mensagens
  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const subscription = supabase
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
          console.log("📬 Nova mensagem no thread");
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Scroll ao atualizar mensagens
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
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
        .select("status, last_inbound_at")
        .eq("customer_id", customerId)
        .single();
        
      if (convData) {
        setConvStatus(convData.status as ConversationStatus);
        setLastInboundAt(convData.last_inbound_at);
        
        // Auto-atribuir para Em Atendimento se for Nova
        if (convData.status === "NEW") {
          await supabase
            .from("conversations")
            .update({ status: "IN_PROGRESS" })
            .eq("customer_id", customerId);
          setConvStatus("IN_PROGRESS");
        }
      }

      // Buscar mensagens
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id, direction, content, type, media_url, created_at, payload, is_read")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      setMessages((data as Message[]) || []);

      // Marca mensagens não lidas como lidas
      const unreadIds = data
        .filter((m: any) => m.direction === "INBOUND" && m.is_read === false)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (err) {
      console.error("❌ Erro ao carregar mensagens:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mensagens"
      );
    } finally {
      setLoading(false);
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

      let payload: Record<string, unknown> = {
        phone: customerPhone,
        customerId,
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
          {convStatus && <ConversationStatusBadge status={convStatus} />}
          {lastInboundAt && convStatus && (
            <SLATimer status={convStatus} lastInboundAt={lastInboundAt} />
          )}
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
