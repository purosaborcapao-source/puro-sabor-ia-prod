import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageReplyForm } from "./MessageReplyForm";
import { MessageBubble } from "./MessageBubble";
import { AlertCircle } from "lucide-react";

interface Message {
  id: string;
  direction: "INCOMING" | "OUTGOING" | "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT";
  created_at: string | null;
  payload?: any;
}

interface MessageThreadProps {
  customerId: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ customerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerName, setCustomerName] = useState("Cliente");
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
      setLoading(true);
      setError(null);

      // Buscar customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("name")
        .eq("id", customerId)
        .single();

      if (!customerError && customer) {
        setCustomerName(customer.name);
      }

      // Buscar mensagens
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("id, direction, content, type, created_at, payload")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      setMessages(data || []);
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
    try {
      // Inserir mensagem como OUTBOUND
      const { error } = await supabase.from("messages").insert({
        customer_id: customerId,
        phone: "", // Será preenchido pelo trigger
        direction: "OUTBOUND",
        type: "TEXT",
        content,
        payload: {
          manual_reply: true,
          sent_by_admin: true,
        },
      });

      if (error) {
        throw error;
      }

      // Recarregar mensagens
      await loadMessages();
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {customerName}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {messages.length} mensagens
        </p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
        <MessageReplyForm
          onSend={handleSendReply}
        />
      </div>
    </div>
  );
};
