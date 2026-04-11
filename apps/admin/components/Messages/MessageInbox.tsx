import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageThread } from "./MessageThread";
import { MessageListItem } from "./MessageListItem";
import { OrderContextPanel } from "./OrderContextPanel";
import { AlertCircle, MessageSquare, RefreshCw } from "lucide-react";

interface MessageChat {
  customer_id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction: "INCOMING" | "OUTGOING";
}

export const MessageInbox = React.memo(function MessageInbox() {
  const [chats, setChats] = useState<MessageChat[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  // Carregar lista de chats
  const loadChats = useCallback(async () => {
    try {
      // Silent Refresh: Só mostra loading se a lista estiver vazia
      if (chats.length === 0) {
        setLoading(true);
      }
      setError(null);

      console.log("🔄 [MessageInbox] Carregando chats...");

      // Buscar último mensagem por customer
      const { data, error: err } = await supabase
        .from("messages")
        .select(
          "customer_id, phone, direction, content, created_at, customers:customer_id(name)"
        )
        .order("created_at", { ascending: false });

      if (err) {
        throw err;
      }

      // Agrupar por customer_id e pegar último
      const chatMap = new Map<string, MessageChat>();

      data?.forEach((msg: any) => {
        const customerId = msg.customer_id;
        if (!chatMap.has(customerId)) {
          chatMap.set(customerId, {
            customer_id: customerId,
            phone: msg.phone,
            customer_name: msg.customers?.name || "Desconhecido",
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: msg.direction === "INCOMING" ? 1 : 0,
            direction: msg.direction,
          });
        } else {
          const chat = chatMap.get(customerId)!;
          if (msg.direction === "INCOMING") {
            chat.unread_count += 1;
          }
        }
      });

      const chatList = Array.from(chatMap.values());

      // Ordenar: mensagens incoming (não lidas) primeiro
      chatList.sort((a, b) => {
        if (a.direction !== b.direction) {
          return a.direction === "INCOMING" ? -1 : 1;
        }
        return (
          new Date(b.last_message_time).getTime() -
          new Date(a.last_message_time).getTime()
        );
      });

      setChats(chatList);
      console.log("✅ [MessageInbox] Chats carregados:", chatList.length);

      // Auto-select primeiro chat se houver
      if (chatList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(chatList[0].customer_id);
      }
    } catch (err) {
      console.error("❌ [MessageInbox] Erro ao carregar chats:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mensagens"
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  // Carregar chats ao montar
  useEffect(() => {
    loadChats();

    // Realtime subscription
    const subscription = supabase
      .channel("messages:realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          console.log("📬 [MessageInbox] Nova mensagem recebida, atualizando...");
          loadChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadChats]);

  const filteredChats = chats.filter((chat) => {
    if (filter === "unread") {
      return chat.unread_count > 0;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Carregando mensagens...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900 dark:text-red-200">
            Erro ao carregar mensagens
          </h3>
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={loadChats}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar com lista de chats */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Mensagens
            </h2>
            <button
              onClick={loadChats}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === "unread"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Pendentes
              {chats.filter((c) => c.unread_count > 0).length > 0 && (
                <span className="ml-1 font-semibold">
                  ({chats.filter((c) => c.unread_count > 0).length})
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Todos ({chats.length})
            </button>
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              {filter === "unread"
                ? "Nenhuma mensagem pendente"
                : "Nenhuma mensagem"}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <MessageListItem
                key={chat.customer_id}
                chat={chat}
                isSelected={selectedCustomerId === chat.customer_id}
                onSelect={() => setSelectedCustomerId(chat.customer_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread de mensagens */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedCustomerId ? (
          <MessageThread customerId={selectedCustomerId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 dark:text-gray-400">
            <p>Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* NOVO: Painel de Contexto do Pedido (Lado Direito) */}
      <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hidden lg:block">
        <OrderContextPanel customerId={selectedCustomerId || ""} />
      </div>
    </div>
  );
});
