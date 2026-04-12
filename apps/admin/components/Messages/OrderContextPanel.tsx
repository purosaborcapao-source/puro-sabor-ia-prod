import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { supabase } from "@atendimento-ia/supabase";
import { ShoppingBag, Plus, Save } from "lucide-react";
import { OrderDetail } from "../Orders/OrderDetail";

interface OrderContextPanelProps {
  customerId: string;
}

export const OrderContextPanel: React.FC<OrderContextPanelProps> = ({
  customerId,
}) => {
  const [activeTab, setActiveTab] = useState<"orders" | "details">("orders");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notas e Contexto
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerSince, setCustomerSince] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [convStatus, setConvStatus] = useState<"NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED" | null>(null);

  useEffect(() => {
    if (customerId) {
      loadCustomerOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadCustomerOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers:customer_id(name)
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);

      // Buscar clientes e notas
      const { data: customerData } = await supabase
        .from("customers")
        .select("notes, phone, created_at")
        .eq("id", customerId)
        .single();
        
      if (customerData) {
        setCustomerNotes(customerData.notes || "Sem instruções gerais do cliente.");
        setCustomerPhone(customerData.phone);
        setCustomerSince(customerData.created_at ? new Date(customerData.created_at).toLocaleDateString("pt-BR", { month: 'short', year: 'numeric' }) : 'N/A');
      }

      // Buscar conversa
      const { data: convData } = await supabase
        .from("conversations")
        .select("status, internal_notes")
        .eq("customer_id", customerId)
        .single();

      if (convData) {
        setConvStatus(convData.status);
        setInternalNotes(convData.internal_notes || "");
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do contexto:", err);
    } finally {
      setLoading(false);
    }
  };
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

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Resumo do Lead
        </button>
        {selectedOrderId && (
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Detalhes do Pedido
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === "orders" ? (
          <>
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
                 <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                   <span className="font-semibold">Notas Gerais:</span> {customerNotes}
                 </p>
               )}
            </div>

            {/* Ações de Estado do Atendimento */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-900 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Estado do Atendimento
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
                   📋 Aguardando Cliente (Decisão/Pedido)
                 </button>
                 <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      className={`flex-1 text-xs py-2 px-3 rounded text-center transition-colors font-medium border ${convStatus === 'RESOLVED' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      ✅ Resolvido
                    </button>
                    <Link 
                      href={`/dashboard/orders/new?customer=${customerId}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                      target="_blank"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Pedido
                    </Link>
                 </div>
              </div>
            </div>

            {/* Pedidos Recentes */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Pedidos Recentes
              </h3>
              {loading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : orders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-sm text-gray-500">Nenhum pedido encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setActiveTab("details");
                      }}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          #{order.number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                        <span>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("pt-BR") : 'N/A'}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {order.total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas Internas Editáveis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notas Internas (Para Operadoras)
                </h3>
                <button 
                  onClick={handleSaveInternalNotes}
                  disabled={savingNotes}
                  className="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1 disabled:opacity-50"
                  title="Salvar"
                >
                  <Save className="w-3 h-3" /> {savingNotes ? "..." : "Salvar"}
                </button>
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Anotações do plantão, preferências momentâneas, etc..."
                className="w-full h-24 p-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        ) : (
          <div className="relative">
            <OrderDetail orderId={selectedOrderId!} isCompact={true} />
          </div>
        )}
      </div>
    </div>
  );
};
