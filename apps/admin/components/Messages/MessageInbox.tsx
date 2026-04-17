import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { MessageThread } from "./MessageThread";
import { MessageListItem } from "./MessageListItem";
import { OrderContextPanel } from "./OrderContextPanel";
import { ConversationKanban } from "./ConversationKanban";
import { AlertCircle, RefreshCw, Search, LayoutList, Kanban, WifiOff, MessageSquareDot } from "lucide-react";

interface MessageChat {
  customer_id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  content: string;
  type: string;
  last_message_time: string;
  unread_count: number;
  direction: "INBOUND" | "OUTBOUND";
  status?: "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED";
  last_inbound_at?: string | null;
  assigned_operator_name?: string | null;
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
  const [realtimeDisconnected, setRealtimeDisconnected] = useState(false);

  // Refs para controlar auto-select e debounce realtime
  const hasAutoSelectedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Função auxiliar: construir chat object a partir de mensagens + conversa
  const buildChatObject = (
    customerId: string,
    messages: any[],
    conversation: any
  ): MessageChat | null => {
    if (messages.length === 0) return null;

    // Ordenar por created_at DESC para pegar a última mensagem
    const sortedMessages = messages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestMsg = sortedMessages[0];

    // Calcular unread_count
    let unreadCount = 0;
    sortedMessages.forEach((msg) => {
      if (msg.direction === "INBOUND" && msg.is_read === false) {
        unreadCount += 1;
      }
    });

    return {
      customer_id: customerId,
      phone: latestMsg.phone,
      customer_name: latestMsg.customers?.name || "Desconhecido",
      last_message: latestMsg.content,
      content: latestMsg.content,
      type: latestMsg.type || "text",
      last_message_time: latestMsg.created_at,
      unread_count: unreadCount,
      direction: latestMsg.direction,
      status: conversation?.status || "RESOLVED",
      last_inbound_at: conversation?.last_inbound_at,
      assigned_operator_name: conversation?.profiles?.name,
    };
  };

  // Delta Update: atualizar apenas um chat específico (realtime optimization)
  const updateChatDelta = useCallback(
    async (customerId: string) => {
      try {
        // Buscar apenas mensagens deste customer
        const [messagesRes, convRes] = await Promise.all([
          supabase
            .from("messages")
            .select(
              "customer_id, phone, direction, content, created_at, is_read, customers:customer_id(name)"
            )
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false }),
          supabase
            .from("conversations")
            .select("customer_id, status, last_inbound_at, is_blocked, profiles:assigned_operator_id(name)")
            .eq("customer_id", customerId)
            .single(),
        ]);

        if (messagesRes.error) throw messagesRes.error;
        // Conversa pode não existir ainda, não é erro

        const messages = messagesRes.data || [];
        const conversation = convRes.data as any;

        // Se congelada, remover da lista
        if (conversation?.is_blocked) {
          setChats((prev) => prev.filter((c) => c.customer_id !== customerId));
          return;
        }

        // Construir novo chat object
        const newChat = buildChatObject(customerId, messages, conversation);

        if (!newChat) {
          // Nenhuma mensagem para este customer, remover se existia
          setChats((prev) => prev.filter((c) => c.customer_id !== customerId));
          return;
        }

        // Atualizar apenas este chat
        setChats((prev) => {
          const exists = prev.some((c) => c.customer_id === customerId);
          if (!exists) {
            // Novo chat: adicionar ao início
            return [newChat, ...prev];
          }
          // Chat existente: atualizar
          return prev.map((c) => (c.customer_id === customerId ? newChat : c));
        });

        console.log(`✅ [Delta] Chat ${customerId} atualizado`);
      } catch (err) {
        console.error(`❌ [Delta] Erro ao atualizar chat ${customerId}:`, err);
      }
    },
    []
  );

  // Carregar lista de chats — estável para sempre (callback não recria)
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
          .select("customer_id, status, last_inbound_at, is_blocked, profiles:assigned_operator_id(name)")
      ]);

      if (messagesRes.error) throw messagesRes.error;
      if (convsRes.error) throw convsRes.error;

      const data = messagesRes.data;
      const convs = convsRes.data as any || [];
      const convMap = new Map(convs.map((c: any) => [c.customer_id, c]));

      // Filtrar mensagens sem customer_id (ignorar órfãs - não vinculadas a nenhum cliente)
      const validMessages = data?.filter((msg: any) => msg.customer_id);

      // Agrupar por customer_id e calcular unread_count (INBOUNDs desde o último OUTBOUND)
      const chatMap = new Map<string, MessageChat>();

      validMessages?.forEach((msg: any) => {
        const customerId = msg.customer_id;
        const conv = convMap.get(customerId) as any;

        // Pula se estiver congelada
        if (conv?.is_blocked) return;

        if (!chatMap.has(customerId)) {

          chatMap.set(customerId, {
            customer_id: customerId,
            phone: msg.phone,
            customer_name: msg.customers?.name || "Desconhecido",
            last_message: msg.content,
            content: msg.content,
            type: msg.type || "text",
            last_message_time: msg.created_at,
            unread_count: 0,
            direction: msg.direction,
            status: conv?.status || "RESOLVED",
            last_inbound_at: conv?.last_inbound_at,
            assigned_operator_name: conv?.profiles?.name,
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

      // Auto-select primeiro chat apenas uma vez (via ref)
      if (chatList.length > 0 && !hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true;
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
  }, []);

  // Carregar chats ao montar e configurar realtime
  useEffect(() => {
    loadChats();

    const handleRealtimeStatus = (status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setRealtimeDisconnected(true);
      } else if (status === "SUBSCRIBED") {
        setRealtimeDisconnected(false);
      }
    };

    // Handler com debounce para delta update (atualizar apenas o chat afetado)
    const handleChange = (payload: any) => {
      // Extrair customer_id do payload realtime
      const customerId = payload.new?.customer_id || payload.old?.customer_id;

      if (!customerId) {
        console.warn("⚠️ [Realtime] Payload sem customer_id:", payload);
        return;
      }

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        console.log(`🔄 [Realtime] Mudança em ${payload.table}:`, customerId);
        updateChatDelta(customerId);
      }, 300);
    };

    // Subscription única com 3 tables monitoradas
    const sub = supabase
      .channel("inbox:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        handleChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        handleChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        handleChange
      )
      .subscribe(handleRealtimeStatus);

    return () => {
      clearTimeout(debounceRef.current);
      sub.unsubscribe();
    };
  }, [loadChats, updateChatDelta]);

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

  const filters = [
    { label: "Novas",       value: "NEW",           dot: "bg-amber-400",   activeText: "text-amber-700 dark:text-amber-300" },
    { label: "Atendimento", value: "IN_PROGRESS",   dot: "bg-blue-500",    activeText: "text-blue-700 dark:text-blue-300" },
    { label: "Ag. Pedido",  value: "WAITING_ORDER", dot: "bg-orange-400",  activeText: "text-orange-700 dark:text-orange-300" },
    { label: "Resolvidos",  value: "RESOLVED",      dot: "bg-zinc-400",    activeText: "text-zinc-600 dark:text-zinc-300" },
    { label: "Todos",       value: "ALL",            dot: "bg-zinc-300",    activeText: "text-zinc-600 dark:text-zinc-300" },
  ] as const

  const counts = {
    NEW:           chats.filter(c => c.status === "NEW").length,
    IN_PROGRESS:   chats.filter(c => c.status === "IN_PROGRESS").length,
    WAITING_ORDER: chats.filter(c => c.status === "WAITING_ORDER").length,
    RESOLVED:      chats.filter(c => c.status === "RESOLVED").length,
    ALL:           chats.length,
  }

  // ── Visão Kanban ──────────────────────────────────────────────────────────
  if (viewMode === "kanban") {
    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="w-12 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center pt-3 gap-2">
          <button
            onClick={() => setViewMode("list")}
            className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="Voltar para Lista"
          >
            <LayoutList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            onClick={loadChats}
            className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
        <ConversationKanban />
      </div>
    )
  }

  // ── Visão Lista ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">

      {/* ── Painel esquerdo: lista de conversas ── */}
      <div className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">

        {/* Topo: busca + ações */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setViewMode("kanban")}
              title="Visualização Kanban"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            >
              <Kanban className="w-4 h-4 text-zinc-400" />
            </button>
            <button
              onClick={loadChats}
              title="Atualizar"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            {realtimeDisconnected && (
              <span title="Realtime desconectado" className="shrink-0">
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </span>
            )}
          </div>

          {/* Filtros verticais */}
          <nav className="space-y-0.5">
            {filters.map((f) => {
              const count = counts[f.value]
              const isActive = filter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as typeof filter)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${f.dot}`} />
                    <span className={`font-medium ${isActive ? f.activeText : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {f.label}
                    </span>
                  </div>
                  {count > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-6 text-center">
              <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                {filter === "NEW" ? "Nenhuma mensagem nova" :
                 filter === "IN_PROGRESS" ? "Nenhum atendimento ativo" :
                 filter === "WAITING_ORDER" ? "Nenhuma aguardando pedido" :
                 "Sem conversas"}
              </p>
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

      {/* ── Thread central ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
        {selectedCustomerId ? (
          <MessageThread customerId={selectedCustomerId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageSquareDot className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Nenhuma conversa selecionada</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Escolha uma conversa no painel ao lado</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Painel de contexto ── */}
      <div className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden lg:block">
        <OrderContextPanel customerId={selectedCustomerId || ""} />
      </div>
    </div>
  )
});
