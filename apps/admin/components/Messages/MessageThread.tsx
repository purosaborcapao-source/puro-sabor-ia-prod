import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageReplyForm } from "./MessageReplyForm";
import { MessageBubble } from "./MessageBubble";
import { AlertCircle } from "lucide-react";

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

      // Buscar mensagens
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id, direction, content, type, media_url, created_at, payload")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      setMessages(data as Message[] || []);
    } catch (err) {
      console.error("❌ Erro ao carregar mensagens:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mensagens"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (content: string) => {
    if (!customerPhone) {
      setError("Telefone do cliente não encontrado.");
      return;
    }

    try {
      setError(null);
      // Chamar API de envio que já lida com Z-API e gravação no banco
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          phone: customerPhone,
          message: content,
          customerId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Falha ao enviar via API");
      }

      // O realtime já pegará a inserção e atualizará a lista
    } catch (err) {
      console.error("❌ Erro ao enviar resposta:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao enviar mensagem"
      );
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
      {/* Header */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {customerName}
            </h3>
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
              {messages.length} MENSAGENS NO HISTÓRICO
            </p>
          </div>
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
