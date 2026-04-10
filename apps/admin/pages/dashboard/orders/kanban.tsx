import React, { useState, useEffect } from "react";
import Head from "next/head";
import { supabase } from "@atendimento-ia/supabase";
import { Layout, Users, Clock, CheckCircle, ArrowRight, Filter } from "lucide-react";
import Link from "next/link";

interface KanbanOrder {
  id: string;
  number: string;
  customer_name: string;
  total: number;
  delivery_date: string;
  status: string;
  sinal_valor: number;
  sinal_confirmado: boolean;
}

export default function OrderKanbanPage() {
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, 
          number, 
          customer_id, 
          total, 
          delivery_date, 
          status, 
          sinal_valor, 
          sinal_confirmado,
          customers(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedOrders = (data || []).map((o: any) => ({
        id: o.id,
        number: o.number,
        customer_name: o.customers?.name || "Desconhecido",
        total: o.total,
        delivery_date: o.delivery_date,
        status: o.status,
        sinal_valor: o.sinal_valor,
        sinal_confirmado: o.sinal_confirmado
      }));

      setOrders(formattedOrders);
    } catch (err) {
      console.error("Erro ao carregar kanban:", err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { id: "negotiating", title: "Em Negociação", icon: <Users className="w-4 h-4" />, filter: (o: KanbanOrder) => o.status === "PENDENTE" && o.sinal_valor === 0 },
    { id: "waiting_signal", title: "Aguardando Sinal", icon: <Clock className="w-4 h-4 text-orange-500" />, filter: (o: KanbanOrder) => o.status === "PENDENTE" && o.sinal_valor > 0 && !o.sinal_confirmado },
    { id: "confirmed", title: "Fechados (Próximos)", icon: <CheckCircle className="w-4 h-4 text-green-500" />, filter: (o: KanbanOrder) => o.status === "CONFIRMADO" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <Head>
        <title>Funil de Vendas - Kanban</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funil de Vendas (Kanban)</h1>
            <p className="text-gray-600 dark:text-gray-400">Organize seus pedidos em fechamento</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/orders" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium">
              Ver Lista
            </Link>
          </div>
        </div>

        {loading ? (
          <p>Carregando quadro...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {col.icon}
                    {col.title}
                  </h3>
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    {orders.filter(col.filter).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {orders.filter(col.filter).map((order) => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-blue-500 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-500">#{order.number}</span>
                        <Link href={`/dashboard/orders/${order.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                        </Link>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-3">{order.customer_name}</p>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-500">
                          <p>Entrega: {new Date(order.delivery_date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
