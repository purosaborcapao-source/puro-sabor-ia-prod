import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { ShoppingBag, Plus, Save } from "lucide-react";
import { OrderDetail } from "../Orders/OrderDetail";
import { InlineOrderForm } from "../Orders/InlineOrderForm";

interface OrderContextPanelProps {
  customerId: string;
}

export const OrderContextPanel: React.FC<OrderContextPanelProps> = ({
  customerId,
}) => {
  const [activeTab, setActiveTab] = useState<"order" | "history" | "management">("order");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Notas e Contexto
  const [customerName, setCustomerName] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerSince, setCustomerSince] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [convStatus, setConvStatus] = useState<"NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED" | null>(null);

  // Carrega apenas pedidos (leve — não reseta selectedOrderId se já existe um válido)
  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, customers:customer_id(name)`)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const fetchedOrders = data || [];
      setOrders(fetchedOrders);

      // Seleciona automaticamente só se não houver seleção atual válida
      setSelectedOrderId((prev) => {
        const stillExists = prev && fetchedOrders.find((o) => o.id === prev);
        if (stillExists) return prev; // mantém seleção atual

        const activeOrder = fetchedOrders.find(
          (o) => o.status === "PENDENTE" || o.status === "CONFIRMADO"
        );
        if (activeOrder) {
          setActiveTab("order");
          return activeOrder.id;
        }
        if (fetchedOrders.length > 0) {
          setActiveTab("order");
          return fetchedOrders[0].id;
        }
        return null;
      });
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    }
  }, [customerId]);

  // Carga completa inicial (pedidos + dados do cliente + conversa)
  const loadAll = useCallback(async () => {
    try {
      const [ordersRes, customerRes, convRes] = await Promise.all([
        supabase
          .from("orders")
          .select(`*, customers:customer_id(name)`)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("customers")
          .select("name, notes, phone, created_at")
          .eq("id", customerId)
          .single(),
        supabase
          .from("conversations")
          .select("status, internal_notes")
          .eq("customer_id", customerId)
          .single(),
      ]);

      const fetchedOrders = ordersRes.data || [];
      setOrders(fetchedOrders);

      const activeOrder = fetchedOrders.find(
        (o) => o.status === "PENDENTE" || o.status === "CONFIRMADO"
      );
      if (activeOrder) {
        setSelectedOrderId(activeOrder.id);
        setActiveTab("order");
      } else if (fetchedOrders.length > 0) {
        setSelectedOrderId(fetchedOrders[0].id);
        setActiveTab("order");
      } else {
        setActiveTab("management");
      }

      if (customerRes.data) {
        setCustomerName(customerRes.data.name || "");
        setCustomerNotes(customerRes.data.notes || "Sem instruções gerais do cliente.");
        setCustomerPhone(customerRes.data.phone);
        setCustomerSince(
          customerRes.data.created_at
            ? new Date(customerRes.data.created_at).toLocaleDateString("pt-BR", {
                month: "short",
                year: "numeric",
              })
            : "N/A"
        );
      }

      if (convRes.data) {
        setConvStatus(convRes.data.status);
        setInternalNotes(convRes.data.internal_notes || "");
      }
    } catch (err) {
      console.error("Erro ao carregar contexto:", err);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    loadAll();

    const subOrders = supabase
      .channel(`orders:panel:${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${customerId}`,
        },
        () => loadOrders()
      )
      .subscribe();

    const subConversations = supabase
      .channel(`conversations:panel:${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload: any) => {
          if (!payload.new) return;
          setConvStatus(payload.new.status);
          if (!savingNotes) setInternalNotes(payload.new.internal_notes || "");
        }
      )
      .subscribe();

    return () => {
      subOrders.unsubscribe();
      subConversations.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);
  const handleSaveInternalNotes = async () => {
      try {
        setSavingNotes(true);
        await supabase
          .from("conversations")
          .update({ internal_notes: internalNotes })
          .eq("customer_id", customerId);
      } catch (err) {
        console.error("Erro ao salvar notas", err);
      } finally {
        setSavingNotes(false);
      }
  };

  const handleUpdateStatus = async (newStatus: "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED") => {
    try {
      setConvStatus(newStatus);
      await supabase
        .from("conversations")
        .update({ status: newStatus })
        .eq("customer_id", customerId);
    } catch (err) {
      console.error("Erro ao mudar status", err);
    }
  };
  if (!customerId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
        <p>Selecione uma conversa para ver o contexto do pedido.</p>
      </div>
    );
  }

  // Quando pedido é criado com sucesso: seleciona e sai do modo criação
  const handleOrderCreated = (orderId: string) => {
    setIsCreating(false);
    setSelectedOrderId(orderId);
    setActiveTab("order");
    loadOrders();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Modo Criar Pedido — substitui todo o painel */}
      {isCreating ? (
        <InlineOrderForm
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
          onSuccess={handleOrderCreated}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
      <>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setActiveTab("order")}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "order"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Pedido
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Histórico
        </button>
        <button
          onClick={() => setActiveTab("management")}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "management"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Lead
        </button>
        {/* Botão "+ Pedido" sempre visível */}
        <button
          onClick={() => setIsCreating(true)}
          title="Criar novo pedido"
          className="px-3 py-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b-2 border-transparent"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "order" ? (
          <div className="space-y-4">
            {selectedOrderId ? (
              <>
                <OrderDetail key={selectedOrderId} orderId={selectedOrderId} isCompact={true} />
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar Novo Pedido
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">Nenhum pedido ativo para este cliente.</p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Criar Pedido Agora
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Histórico de Pedidos
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 italic">Nenhum pedido anterior.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setActiveTab("order");
                    }}
                    className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition-all cursor-pointer hover:shadow-md ${selectedOrderId === order.id ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        #{order.order_number || order.number}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{order.delivery_date
                        ? (() => {
                            const dt = new Date(order.delivery_date);
                            return `${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`;
                          })()
                        : 'Sem data'
                      }</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info do Cliente Rápida */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <p className="text-sm font-semibold text-gray-900 dark:text-white">Perfil do Cliente</p>
                   <p className="text-xs text-gray-500">{customerPhone}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] text-gray-400 uppercase">Cliente desde</p>
                   <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">{customerSince}</p>
                 </div>
               </div>
               {customerNotes && (
                 <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                   <p className="text-[10px] text-gray-400 uppercase mb-1">Notas Gerais do Lead</p>
                   <p className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900 rounded italic">
                      {customerNotes}
                   </p>
                 </div>
               )}
            </div>

            {/* Ações de Estado do Atendimento */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-bold">
                Status da Conversa
              </h3>
              <div className="grid grid-cols-1 gap-2">
                 <button
                   onClick={() => handleUpdateStatus('IN_PROGRESS')}
                   className={`text-xs py-2 px-3 rounded text-left transition-colors font-medium border ${convStatus === 'IN_PROGRESS' || convStatus === 'NEW' ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                 >
                   💬 Em Atendimento
                 </button>
                 <button
                   onClick={() => handleUpdateStatus('WAITING_ORDER')}
                   className={`text-xs py-2 px-3 rounded text-left transition-colors font-medium border ${convStatus === 'WAITING_ORDER' ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                 >
                   📋 Aguardando Cliente
                 </button>
                 <button
                   onClick={() => handleUpdateStatus('RESOLVED')}
                   className={`text-xs py-2 px-3 rounded text-left transition-colors font-medium border ${convStatus === 'RESOLVED' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                 >
                   ✅ Resolvido / Finalizado
                 </button>
              </div>
            </div>

            {/* Notas Internas Editáveis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notas Internas
                </h3>
                <button 
                  onClick={handleSaveInternalNotes}
                  disabled={savingNotes}
                  className="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" /> {savingNotes ? "..." : "Salvar"}
                </button>
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Anotações internas sobre este lead..."
                className="w-full h-32 p-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
