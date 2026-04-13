import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageThread } from "./MessageThread";
import { MessageListItem } from "./MessageListItem";
import { OrderContextPanel } from "./OrderContextPanel";
import { ConversationKanban } from "./ConversationKanban";
import { AlertCircle, MessageSquare, RefreshCw, Search, LayoutList, Kanban } from "lucide-react";

interface MessageChat {
  customer_id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction: "INBOUND" | "OUTBOUND";
  status?: "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED";
  last_inbound_at?: string | null;
}

export const MessageInbox = React.memo(function MessageInbox() {
  const [chats, setChats] = useState<MessageChat[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [filter, setFilter] = useState<"ALL" | "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED">("NEW");

  // Carregar lista de chats
  const loadChats = useCallback(async () => {
    try {
      // Silent Refresh: Só mostra loading se a lista estiver vazia
      if (chats.length === 0) {
        setLoading(true);
      }
      setError(null);

      console.log("🔄 [MessageInbox] Carregando chats...");

      // Buscar último mensagem por customer E status da conversa
      const [messagesRes, convsRes] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "customer_id, phone, direction, content, created_at, is_read, customers:customer_id(name)"
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("conversations")
          .select("customer_id, status, last_inbound_at, is_blocked")
      ]);

      if (messagesRes.error) throw messagesRes.error;
      if (convsRes.error) throw convsRes.error;

      const data = messagesRes.data;
      const convs = convsRes.data || [];
      const convMap = new Map(convs.map((c) => [c.customer_id, c]));

      // Filtrar mensagens sem customer_id (ignorar órfãs - não vinculadas a nenhum cliente)
      const validMessages = data?.filter((msg: any) => msg.customer_id);

      // Agrupar por customer_id e calcular unread_count (INBOUNDs desde o último OUTBOUND)
      const chatMap = new Map<string, MessageChat>();

      validMessages?.forEach((msg: any) => {
        const customerId = msg.customer_id;
        const conv = convMap.get(customerId);
        
        // Pula se estiver congelada
        if (conv?.is_blocked) return;

        if (!chatMap.has(customerId)) {
          
          chatMap.set(customerId, {
            customer_id: customerId,
            phone: msg.phone,
            customer_name: msg.customers?.name || "Desconhecido",
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            direction: msg.direction,
            status: conv?.status || "RESOLVED",
            last_inbound_at: conv?.last_inbound_at,
          });
        }

        const chat = chatMap.get(customerId)!;

        // Contador simples baseado na flag is_read
        if (msg.direction === "INBOUND" && msg.is_read === false) {
          chat.unread_count += 1;
        }
      });

      const chatList = Array.from(chatMap.values());

      // Ordenar: primeiro NEW/IN_PROGRESS mais antigas (SLA), depois resto cronológico
      chatList.sort((a, b) => {
        if (a.status === "NEW" && b.status !== "NEW") return -1;
        if (b.status === "NEW" && a.status !== "NEW") return 1;
        if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
        if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;
        
        // Em caso de empate de status, as que estão aguardando há mais tempo sobem
        if (a.status === "NEW" || a.status === "IN_PROGRESS") {
           const timeA = a.last_inbound_at ? new Date(a.last_inbound_at!).getTime() : 0;
           const timeB = b.last_inbound_at ? new Date(b.last_inbound_at!).getTime() : 0;
           return timeA - timeB;
        }

        // Para as resolvidas, ordem cronológica inversa (mais recentes primeiro)
        const timeA = a.last_message_time ? new Date(a.last_message_time!).getTime() : 0;
        const timeB = b.last_message_time ? new Date(b.last_message_time!).getTime() : 0;
        return timeB - timeA;
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

    // Realtime subscription para messages e conversations
    const subMessages = supabase
      .channel("messages:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadChats()
      )
      .subscribe();

    const subConversations = supabase
      .channel("conversations:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadChats()
      )
      .subscribe();

    return () => {
      subMessages.unsubscribe();
      subConversations.unsubscribe();
    };
  }, [loadChats]);

  const filteredChats = chats.filter((chat) => {
    const matchesFilter = filter === "ALL" || chat.status === filter;
    const matchesSearch = chat.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          chat.phone.includes(searchTerm);
    return matchesFilter && matchesSearch;
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

  // ── Visão Kanban ──────────────────────────────────────────────────────────
  if (viewMode === "kanban") {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar mínima no Kanban: ícones de toggle */}
        <div className="w-14 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center pt-4 gap-3">
          <button
            onClick={() => setViewMode("list")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Voltar para Lista"
          >
            <LayoutList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            onClick={loadChats}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <ConversationKanban />
      </div>
    );
  }

  // ── Visão Lista (padrão) ───────────────────────────────────────────────────
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
            <div className="flex items-center gap-1">
              {/* Toggle: Lista / Kanban */}
              <button
                onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={viewMode === "list" ? "Alternar para Kanban" : "Alternar para Lista"}
              >
                {viewMode === "list" ? (
                  <Kanban className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <LayoutList className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button
                onClick={loadChats}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Busca por Nome */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros de Status */}
          <div className="flex gap-1 overflow-x-auto pb-2 hide-scrollbar">
            {[
              { label: "Novas", value: "NEW", icon: "📬" },
              { label: "Em Atend.", value: "IN_PROGRESS", icon: "💬" },
              { label: "Ag. Pedido", value: "WAITING_ORDER", icon: "📋" },
              { label: "Resolvidos", value: "RESOLVED", icon: "✅" },
              { label: "Todos", value: "ALL", icon: "📂" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-lg transition-colors ${
                  filter === f.value
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f.icon} {f.label}
                {f.value !== "ALL" && f.value !== "RESOLVED" && chats.filter(c => c.status === f.value).length > 0 && (
                  <span className="ml-1 bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
                    {chats.filter(c => c.status === f.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              {filter === "NEW" 
                ? "Nenhuma mensagem nova" 
                : filter === "IN_PROGRESS"
                ? "Nenhum atendimento em andamento"
                : "Nenhuma conversa encontrada"}
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

      {/* Painel de Contexto do Pedido (Lado Direito) */}
      <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hidden lg:block">
        <OrderContextPanel customerId={selectedCustomerId || ""} />
      </div>
    </div>
  );
});
