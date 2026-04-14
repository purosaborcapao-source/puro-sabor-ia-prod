import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { SLATimer } from "./SLATimer";
import { ThreadModal } from "./ThreadModal";
import { Eye, EyeOff } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ConvStatus = "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED";

interface KanbanCard {
  customer_id: string;
  customer_name: string;
  phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction: "INBOUND" | "OUTBOUND";
  status: ConvStatus;
  last_inbound_at: string | null;
  // Campos de pagamento
  has_pending_payment?: boolean;
  pending_order_total?: number;
  pending_order_id?: string;
}

// ─── Configuração das colunas ─────────────────────────────────────────────────

const COLUMNS: Array<{
  id: ConvStatus | "PAYMENT_PENDING";
  label: string;
  icon: string;
  color: string;
  headerColor: string;
}> = [
  {
    id: "NEW",
    label: "Novas",
    icon: "📬",
    color: "border-t-amber-400",
    headerColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "IN_PROGRESS",
    label: "Em Atendimento",
    icon: "💬",
    color: "border-t-blue-400",
    headerColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "WAITING_ORDER",
    label: "Ag. Pedido",
    icon: "📋",
    color: "border-t-orange-400",
    headerColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    id: "PAYMENT_PENDING",
    label: "Pag. Pendente",
    icon: "💰",
    color: "border-t-red-400",
    headerColor: "bg-red-50 dark:bg-red-950/30",
  },
];

// ─── Card individual ──────────────────────────────────────────────────────────

const KanbanCardItem: React.FC<{
  card: KanbanCard;
  onClick: () => void;
}> = ({ card, onClick }) => {
  const preview = card.last_message.substring(0, 60);
  const timeAgo = formatTimeAgo(card.last_message_time);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {card.customer_name}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
            {card.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-zinc-400">{timeAgo}</span>
          {card.unread_count > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
              {card.unread_count}
            </span>
          )}
        </div>
      </div>

      {/* Preview da mensagem */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
        {card.direction === "OUTBOUND" && (
          <span className="text-zinc-400 dark:text-zinc-500 mr-1">Você:</span>
        )}
        {preview}
        {card.last_message.length > 60 ? "..." : ""}
      </p>

      {/* Operadora Atribuída */}
      {(card as any).assigned_operator_name && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
            👤 {(card as any).assigned_operator_name}
          </span>
        </div>
      )}

      {/* Footer do card: SLA + pagamento */}
      <div className="flex items-center gap-2 flex-wrap">
        {(card.status === "NEW" || card.status === "IN_PROGRESS") &&
          card.last_inbound_at && (
            <SLATimer
              status={card.status}
              lastInboundAt={card.last_inbound_at}
            />
          )}

        {card.has_pending_payment && card.pending_order_total && (
          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
            💰 R$ {card.pending_order_total.toFixed(2)}
          </span>
        )}
      </div>
    </button>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const ConversationKanban: React.FC = () => {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedCards, setResolvedCards] = useState<KanbanCard[]>([]);

  const loadData = useCallback(async () => {
    try {
      if (cards.length === 0) setLoading(true);

      const [messagesRes, convsRes, ordersRes] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "customer_id, phone, direction, content, created_at, is_read, customers:customer_id(name)"
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("conversations")
          .select("customer_id, status, last_inbound_at, is_blocked, profiles:assigned_operator_id(name)"),
        supabase
          .from("orders")
          .select("customer_id, total, id, payment_status")
          .in("payment_status", ["SINAL_PENDENTE"]),
      ]);

      if (messagesRes.error) throw messagesRes.error;

      const data = messagesRes.data || [];
      const convs = convsRes.data as any || [];
      const orders = ordersRes.data || [];

      const convMap = new Map(convs.map((c: any) => [c.customer_id, c]));

      // Mapa de pedidos com pagamento pendente por customer
      const pendingPaymentMap = new Map<
        string,
        { total: number; id: string }
      >();
      orders.forEach((o) => {
        if (!pendingPaymentMap.has(o.customer_id)) {
          pendingPaymentMap.set(o.customer_id, { total: o.total, id: o.id });
        }
      });

      const validMessages = data.filter((m: any) => m.customer_id);
      const chatMap = new Map<string, KanbanCard>();

      validMessages.forEach((msg: any) => {
        const cid = msg.customer_id;
        const conv = convMap.get(cid) as any;
        
        // Pula conversas bloqueadas
        if (conv?.is_blocked) return;

        if (!chatMap.has(cid)) {
          const pending = pendingPaymentMap.get(cid);
          chatMap.set(cid, {
            customer_id: cid,
            customer_name: msg.customers?.name || "Desconhecido",
            phone: msg.phone,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            direction: msg.direction,
            status: (conv?.status as ConvStatus) || "RESOLVED",
            last_inbound_at: conv?.last_inbound_at ?? null,
            has_pending_payment: !!pending,
            pending_order_total: pending?.total,
            pending_order_id: pending?.id,
            assigned_operator_name: conv?.profiles?.name,
          });
        }

        const card = chatMap.get(cid)!;
        if (msg.direction === "INBOUND" && msg.is_read === false) {
          card.unread_count += 1;
        }
      });

      const allCards = Array.from(chatMap.values());

      // Separa resolvidos
      setResolvedCards(allCards.filter((c) => c.status === "RESOLVED"));
      setCards(allCards.filter((c) => c.status !== "RESOLVED"));
    } catch (err) {
      console.error("❌ [Kanban] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [cards.length]);

  useEffect(() => {
    loadData();

    const sub1 = supabase
      .channel("kanban:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        loadData
      )
      .subscribe();

    const sub2 = supabase
      .channel("kanban:conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        loadData
      )
      .subscribe();

    const sub3 = supabase
      .channel("kanban:orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        loadData
      )
      .subscribe();

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
    };
  }, []);

  // Distribui cards nas colunas
  const getCardsForColumn = (colId: string): KanbanCard[] => {
    if (colId === "PAYMENT_PENDING") {
      return cards.filter((c) => c.has_pending_payment);
    }
    return cards.filter((c) => c.status === colId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">Carregando kanban...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Conversas — Visão Kanban
        </h3>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {showResolved ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {showResolved ? "Ocultar" : "Mostrar"} Resolvidos ({resolvedCards.length})
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colCards = getCardsForColumn(col.id);
            return (
              <div
                key={col.id}
                className="w-72 shrink-0 flex flex-col gap-2 h-full"
              >
                {/* Header da coluna */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border-t-2 ${col.color} ${col.headerColor}`}
                >
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {col.icon} {col.label}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {colCards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {colCards.length === 0 ? (
                    <div className="text-center text-xs text-zinc-400 dark:text-zinc-600 py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Nenhuma conversa
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <KanbanCardItem
                        key={card.customer_id}
                        card={card}
                        onClick={() => setSelectedCustomerId(card.customer_id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Coluna de Resolvidas (toggle) */}
          {showResolved && (
            <div className="w-72 shrink-0 flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border-t-2 border-t-zinc-400 bg-zinc-100 dark:bg-zinc-800/50">
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  ✅ Resolvidos
                </span>
                <span className="text-xs font-bold text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {resolvedCards.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {resolvedCards.map((card) => (
                  <KanbanCardItem
                    key={card.customer_id}
                    card={card}
                    onClick={() => setSelectedCustomerId(card.customer_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de thread */}
      {selectedCustomerId && (
        <ThreadModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR");
}
