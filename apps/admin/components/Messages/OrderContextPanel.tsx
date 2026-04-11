import React, { useState, useEffect } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { ShoppingBag, Plus } from "lucide-react";
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
    } catch (err) {
      console.error("Erro ao carregar pedidos do contexto:", err);
    } finally {
      setLoading(false);
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
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                Novo Pedido
              </button>
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
                        <span>{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</span>
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

            {/* Info do Cliente */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Instruções de Pagamento
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Cliente prefere PIX. Sempre anexar comprovante do sinal.
              </p>
            </div>
          </>
        ) : (
          <div className="relative">
            <OrderDetail orderId={selectedOrderId!} />
          </div>
        )}
      </div>
    </div>
  );
};
