import React, { useState, useEffect } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FieldWithPermission } from '@/components/UI/FieldWithPermission';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { ConfirmPaymentButton } from './ConfirmPaymentButton';
import { WhatsAppPanel } from './WhatsAppPanel';
import { AISuggestionPanel } from './AISuggestionPanel';
import { OrderItemList } from './OrderItemList';
import { ProductCatalogDrawer } from './ProductCatalogDrawer';
import { AlertCircle, MessageCircle, LayoutGrid, Share2, FileText, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_date: string;
  delivery_type: string;
  status: string;
  payment_status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE';
  total: number;
  sinal_valor: number;
  sinal_confirmado: boolean;
  conta_corrente?: boolean;
  created_at: string | null;
}

interface PaymentEntry {
  id: string;
  payment_type: 'SINAL' | 'SALDO' | 'PARCIAL' | 'ANTECIPADO';
  amount: number;
  status: 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'REJEITADO';
  notes?: string;
  created_at: string;
}

interface OrderDetailProps {
  orderId: string;
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const canEditFinancial = profile?.role === 'ADMIN' || profile?.role === 'GERENTE';
  const canConfirmPayment = profile?.role === 'ADMIN' || profile?.role === 'GERENTE';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id(name, phone)
        `)
        .eq('id', orderId)
        .single();

      if (orderErr) {
        throw orderErr;
      }

      const processedOrder: Order = {
        id: orderData.id,
        number: orderData.number,
        customer_id: orderData.customer_id,
        customer_name: orderData.customers?.name || 'N/A',
        customer_phone: orderData.customers?.phone,
        delivery_date: orderData.delivery_date,
        delivery_type: orderData.delivery_type,
        status: orderData.status,
        payment_status: (orderData as any).payment_status || 'SINAL_PENDENTE',
        total: orderData.total,
        sinal_valor: (orderData as any).sinal_valor || 0,
        sinal_confirmado: (orderData as any).sinal_confirmado || false,
        conta_corrente: (orderData as any).conta_corrente || false,
        created_at: orderData.created_at
      };

      setOrder(processedOrder);

      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payment_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (paymentsErr) {
        console.error('Erro ao buscar pagamentos:', paymentsErr);
      } else {
        const processedPayments: PaymentEntry[] = (paymentsData || []).map((p: any) => ({
          id: p.id,
          payment_type: p.type as 'SINAL' | 'SALDO' | 'PARCIAL' | 'ANTECIPADO',
          amount: p.valor,
          status: p.status as 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'REJEITADO',
          notes: p.notes,
          created_at: p.registered_at || p.created_at
        }));
        setPaymentEntries(processedPayments);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      console.error('Erro ao carregar pedido:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const addItemToOrder = async (productId: string, price: number) => {
    try {
      if (!order) return;

      const { error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: productId,
          quantity: 1,
          unit_price: price
        });
      
      if (itemErr) throw itemErr;

      const newTotal = order.total + price;
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);
      
      if (orderErr) throw orderErr;

      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      setError('Falha ao adicionar item.');
    }
  };

  const handleSendSummaryToWhatsApp = async () => {
    if (!order || !order.customer_phone) return;
    
    try {
      setSendingWhatsApp(true);
      const customerUrl = 'https://puro-sabor-catalogo.vercel.app';
      const url = `${customerUrl}/pedido/confirmacao/${order.id}`;
      const text = `Olá ${order.customer_name}! Segue o link com o resumo do seu pedido #${order.number} e os dados para pagamento do sinal: ${url}`;
      
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'text', 
          phone: order.customer_phone, 
          message: text, 
          customerId: order.customer_id 
        }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      alert('Resumo enviado com sucesso via WhatsApp!');
    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
      alert('Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Carregando pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900 dark:text-red-200">Erro ao carregar pedido</h3>
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Pedido não encontrado</p>
      </div>
    );
  }

  const totalConfirmed = paymentEntries
    .filter((p) => p.status === 'CONFIRMADO')
    .reduce((sum, p) => sum + p.amount, 0);

  const saldoDue = Math.max(0, order.total - totalConfirmed);
  const pendingPayments = paymentEntries.filter((p) => p.status === 'AGUARDANDO_CONFIRMACAO');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Coluna Principal */}
      <div className="lg:col-span-8 space-y-6">
        <AISuggestionPanel orderId={orderId} onSuggestionApplied={() => setRefreshKey(k => k + 1)} />

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Pedido #{order.number}
                </h1>
                <button 
                  onClick={() => setIsCatalogOpen(true)}
                  className="px-3 py-1 bg-blue-600/10 border border-blue-600/20 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all flex items-center gap-2"
                >
                  <LayoutGrid className="w-3 h-3" /> Abrir Catálogo
                </button>
              </div>
              {order.created_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Criado em {new Date(order.created_at!).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <div className="text-right">
              <PaymentStatusBadge status={order.payment_status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                📋 Informações do Pedido
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                  {order.customer_phone && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">📞 {order.customer_phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Data de Entrega</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : 'N/A'} - {order.delivery_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' : 
                    order.status === 'CONFIRMADO' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                💰 Informações Financeiras
              </h3>
              <div className="space-y-3">
                <FieldWithPermission
                  label="Valor Total"
                  value={order.total}
                  variant="currency"
                  canEdit={canEditFinancial}
                  disabled={order.status === 'ENTREGUE'}
                />
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Recebido</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totalConfirmed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Saldo Devido</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {saldoDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <OrderItemList orderId={orderId} refreshKey={refreshKey} onItemRemoved={() => setRefreshKey(k => k + 1)} />
        </div>

        {pendingPayments.length > 0 && canConfirmPayment && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-4">⏳ Pagamentos Aguardando Confirmação</h3>
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200">
                  <div>
                    <p className="text-sm font-medium">
                      {payment.payment_type} - {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <ConfirmPaymentButton
                    paymentEntryId={payment.id}
                    orderId={orderId}
                    orderTotal={order.total}
                    paymentType={payment.payment_type}
                    paymentAmount={payment.amount}
                    onSuccess={() => setRefreshKey(k => k + 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💳 Gerenciar Pagamentos</h3>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={order.payment_status === 'QUITADO'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Registrar Recebimento
            </button>
          </div>
          <div className="space-y-3">
            {paymentEntries.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm">{payment.payment_type} - {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">{payment.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna Lateral */}
      <div className="lg:col-span-4 space-y-6">
        <div className="sticky top-8">
          <WhatsAppPanel phone={order.customer_phone || ''} customerId={order.customer_id} />
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 rounded-lg space-y-3">
            <div>
              <h4 className="text-[10px] font-black tracking-widest uppercase text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <MessageCircle className="w-3 h-3" /> Resumo do Atendimento
              </h4>
              <p className="text-xs text-emerald-900 dark:text-emerald-300">O cliente está aguardando confirmação do sinal.</p>
            </div>
            
            <button
              onClick={() => {
                const customerUrl = 'https://puro-sabor-catalogo.vercel.app';
                const url = `${customerUrl}/pedido/confirmacao/${order.id}`;
                const text = `Olá ${order.customer_name}! Segue o link com o resumo do seu pedido #${order.number} e os dados para pagamento do sinal: ${url}`;
                navigator.clipboard.writeText(text);
                alert('Link e resumo copiados para a área de transferência!');
              }}
              className="w-full py-2 bg-emerald-600/10 border border-emerald-600/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all"
            >
              <Share2 className="w-3 h-3" /> Copiar Link Resumo
            </button>

            <button
              onClick={handleSendSummaryToWhatsApp}
              disabled={sendingWhatsApp || !order.customer_phone}
              className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50"
            >
              {sendingWhatsApp ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <MessageCircle className="w-3 h-3" />
              )}
              Enviar via WhatsApp
            </button>
            
            <a
              href={`https://puro-sabor-catalogo.vercel.app/pedido/confirmacao/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-white dark:bg-gray-800 border border-emerald-200 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
            >
              <FileText className="w-3 h-3" /> Ver como Cliente
            </a>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <RegisterPaymentModal
          orderId={orderId}
          orderTotal={order.total}
          sinalPago={order.sinal_valor}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setRefreshKey(k => k + 1);
          }}
        />
      )}
      <ProductCatalogDrawer 
        isOpen={isCatalogOpen} 
        onClose={() => setIsCatalogOpen(false)} 
        onAddItem={addItemToOrder}
      />
    </div>
  );
}
