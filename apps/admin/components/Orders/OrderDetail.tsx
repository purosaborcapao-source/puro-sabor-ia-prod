import React, { useState, useEffect } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useChatPresence } from '@/contexts/ChatPresenceContext';
import { FieldWithPermission } from '@/components/UI/FieldWithPermission';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { DebtClassificationModal } from './DebtClassificationModal';
import { WhatsAppPanel } from './WhatsAppPanel';
import { AISuggestionPanel } from './AISuggestionPanel';
import { OrderItemList } from './OrderItemList';
import { ProductCatalogDrawer } from './ProductCatalogDrawer';
import { ReferenceImages } from './ReferenceImages';
import { ChangeHistory } from './ChangeHistory';
import { generatePixPayload, getPixQrCodeUrl } from '../../utils/pix';
import { AlertCircle, MessageCircle, LayoutGrid, Loader2, QrCode, CreditCard, Clock, CheckCircle2, AlertTriangle, StickyNote } from 'lucide-react';

interface OrderItem {
  quantity: number;
  unit_price: number;
  product?: { name: string; sale_unit?: string };
  notes?: string | null;
  sale_unit?: string;
}

interface Order {
  id: string;
  number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_date: string;
  delivery_type: string;
  status: string;
  items?: OrderItem[];
  updated_at: string;
  payment_status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE';
  total: number;
  notes?: string | null;
  customer_obs?: string | null;
  created_at: string | null;
  discount?: number;
  discount_reason?: string;
  delivery_fee?: number;
  total_received?: number;
  balance_due?: number;
}

interface PaymentEntry {
  id: string;
  payment_type: 'SINAL' | 'SALDO' | 'PARCIAL' | 'ANTECIPADO';
  amount: number;
  status: 'CONFIRMADO' | 'REJEITADO';
  notes?: string;
  created_at: string;
}

interface OrderDetailProps {
  orderId: string;
  isCompact?: boolean;
}

export function OrderDetail({ orderId, isCompact = false }: OrderDetailProps) {
  const { profile } = useAuth();
  const { openCustomerId } = useChatPresence();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [showMiniEscolha, setShowMiniEscolha] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [sugestedSinal, setSugestedSinal] = useState('');

  const canEditFinancial = profile?.role === 'ADMIN' || profile?.role === 'GERENTE';

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
          customers:customer_id(name, phone),
          order_items (
            quantity,
            unit_price,
            notes,
            products(name, sale_unit)
          )
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
        customer_obs: (orderData as any).customer_obs || '',
        customer_name: orderData.customers?.name || 'N/A',
        customer_phone: orderData.customers?.phone,
        delivery_date: orderData.delivery_date,
        delivery_type: orderData.delivery_type || 'RETIRADA',
        status: orderData.status,
        updated_at: orderData.updated_at || new Date().toISOString(),
        payment_status: (orderData as any).payment_status || 'SINAL_PENDENTE',
        total: orderData.total,
        notes: (orderData as any).notes || '',
        created_at: orderData.created_at,
        discount: (orderData as any).discount || 0,
        discount_reason: (orderData as any).discount_reason || '',
        delivery_fee: (orderData as any).delivery_fee || 0,
        total_received: (orderData as any).total_received || 0,
        balance_due: (orderData as any).balance_due || 0,
items: (orderData as any).order_items?.map((item: any) => ({
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
            product: item.products,
            sale_unit: item.products?.sale_unit
          })) || []
      };

      setOrder(processedOrder);

      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payment_entries')
        .select('*')
        .eq('order_id', orderId)
        .order('registered_at', { ascending: false });

      if (paymentsErr) {
        console.error('Erro ao buscar pagamentos:', paymentsErr);
      } else {
        const processedPayments: PaymentEntry[] = (paymentsData || []).map((p: any) => ({
          id: p.id,
          payment_type: p.type as 'SINAL' | 'SALDO' | 'PARCIAL' | 'ANTECIPADO',
          amount: p.valor,
          status: p.status as 'CONFIRMADO' | 'REJEITADO',
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

  const handleUpdateOrderField = async (field: keyof Order, value: any) => {
    // Interceptação para Status ENTREGUE
    if (field === 'status' && value === 'ENTREGUE' && order && order.balance_due > 0) {
      setIsDebtModalOpen(true);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const oldStatus = order?.status;

      const { error } = await supabase
        .from('orders')
        .update({ [field]: value } as any)
        .eq('id', orderId);
      
      if (error) throw error;

      // Auditoria: Documentar mudança de status
      if (field === 'status' && oldStatus !== value) {
        await supabase.from('order_changes').insert({
          order_id: orderId,
          changed_by: user?.id,
          field: 'status',
          old_value: oldStatus,
          new_value: value,
          reason: `Alteração manual de status na página de detalhes`
        });
      }

      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert('Erro ao atualizar campo: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
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

  const handleSendSummaryToWhatsApp = async (sugestedDownPayment: number, silentConfirmation: boolean = false) => {
    if (!order || !order.customer_phone) return;
    
    try {
      setSendingWhatsApp(true);
      
      // Montagem do Payload PIX
      // CNPJ, Nome, Capão da Canoa
      // Passamos amount como undefinied para deixar o valor em aberto, conforme solictado ("valor sugestivo, nao fechado")
      const pixPayloadStr = generatePixPayload(
        '42380994000169',
        'Puro Sabor Confeitaria LTDA',
        'Capao da Canoa',
        order.number.slice(-6)
      );
      
      const qrCodeUrl = getPixQrCodeUrl(pixPayloadStr);

      // Montagem da lista de produtos
      const itemsList = order.items?.map(item => {
        const isKG = item.sale_unit === 'KG'
        const qtyDisplay = isKG
          ? `${(item.quantity / 1000).toFixed(1).replace('.', ',')}kg`
          : `${item.quantity}x`
        const itemTotal = isKG
          ? (item.quantity / 1000) * item.unit_price
          : item.quantity * item.unit_price
        return `• ${qtyDisplay} ${item.product?.name} (R$ ${itemTotal.toFixed(2)})`
      }).join('\n') || '';

      const deliveryDt = order.delivery_date ? new Date(order.delivery_date) : null;
      const deliveryFormatted = deliveryDt
        ? `${deliveryDt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${deliveryDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`
        : '';

      const totalFinal = (order.total || 0) + (order.delivery_fee || 0) - (order.discount || 0);

      const text = `🎉 *Pedido #${order.number.slice(-4)} Confirmado!*
Olá ${order.customer_name}! Seu pedido foi recebido e está confirmado para produção com muito carinho.

*📄 Resumo dos Itens:*
${itemsList}

💰 *Valor Total do Pedido:* R$ ${totalFinal.toFixed(2)}
🔸 *Sinal Sugerido:* R$ ${sugestedDownPayment.toFixed(2)} (para confirmar a data/produção)
📍 *Tipo:* ${order.delivery_type === 'ENTREGA' ? 'Entrega' : 'Retirada'}
${deliveryFormatted ? `📅 *Data e Hora:* ${deliveryFormatted}` : ''}

⬇️ *PAGAMENTO DO SINAL* ⬇️
Você pode usar a aba "PIX Copia e Cola" no seu banco usando o código longo abaixo, ou escanear a imagem do QR Code que estou te enviando! O valor fica sugerido, mas como combinamos, não é travado. 😉

${pixPayloadStr}

Obrigado por escolher a Puro Sabor! Qualquer dúvida estou aqui.`;

      // Só atribui ao operador se ele estiver com a conversa do cliente aberta no chat
      const operatorId = openCustomerId === order.customer_id ? profile?.id : undefined

      // 1. Enviar primeiro o texto (que inclui o copia e cola do Pix)
      const resText = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          phone: order.customer_phone,
          message: text,
          customerId: order.customer_id,
          operatorId,
        }),
      });

      const dataText = await resText.json();
      if (!dataText.success) throw new Error(dataText.error);

      // 2. Enviar Imagem do QR Code
      const resImage = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          phone: order.customer_phone,
          imageUrl: qrCodeUrl,
          caption: "Seu QR Code PIX ☝️",
          customerId: order.customer_id,
          operatorId,
        }),
      });

      // 3. Atualizar Status da Conversa no CRM
      await supabase
        .from('conversations')
        .update({ status: 'WAITING_ORDER' })
        .eq('customer_id', order.customer_id);

      const dataImage = await resImage.json();
      if (!dataImage.success) console.warn("Erro ao enviar imagem do QRCode", dataImage.error); // Continua mesmo se falhar a imagem

      if (!silentConfirmation) {
        alert('Resumo completo com PIX Copia e Cola enviado com sucesso via WhatsApp!');
      }
    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
      if (!silentConfirmation) alert('Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.');
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

  // Use values from database (synced via triggers) instead of calculating in frontend
  const totalConfirmed = order.total_received || 0;
  const saldoDue = order.balance_due || 0;

  return (
    <div className={isCompact ? "flex flex-col gap-6" : "grid grid-cols-1 lg:grid-cols-12 gap-8"}>
      {/* Coluna Principal */}
      <div className={isCompact ? "w-full space-y-6" : "lg:col-span-8 space-y-6"}>
        {!isCompact && (
          <AISuggestionPanel orderId={orderId} onSuggestionApplied={() => setRefreshKey(k => k + 1)} />
        )}

        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isCompact ? 'p-4' : 'p-6'}`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`${isCompact ? 'text-xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
                  Pedido #{String(order.number).slice(-4)}
                </h1>
                <button 
                  onClick={() => setIsCatalogOpen(true)}
                  className="px-3 py-1 bg-blue-600/10 border border-blue-600/20 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all flex items-center gap-2"
                >
                  <LayoutGrid className="w-3 h-3" /> Catálogo
                </button>
              </div>
              {!isCompact && order.created_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Criado em {new Date(order.created_at!).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <div className="text-right">
              <PaymentStatusBadge status={order.payment_status} />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${isCompact ? 'gap-6' : 'md:grid-cols-2 gap-6'} border-t border-gray-200 dark:border-gray-700 pt-6`}>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                📋 Informações do Pedido
              </h3>
              <div className="space-y-3">
                {!isCompact && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">📞 {order.customer_phone}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Data de Entrega</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {order.delivery_date
                      ? (() => {
                          const dt = new Date(order.delivery_date);
                          return `${dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`;
                        })()
                      : 'N/A'}{' '}
                    — {order.delivery_type}
                  </p>
                </div>
                <div className="relative group">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status do Pedido</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={order.status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handleUpdateOrderField('status', e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border outline-none transition-all cursor-pointer disabled:opacity-50 ${
                        order.status === 'ENTREGUE' ? 'bg-green-100 text-green-800 border-green-200' : 
                        order.status === 'CONFIRMADO' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        order.status === 'CANCELADO' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      <option value="PENDENTE">🟡 PENDENTE</option>
                      <option value="CONFIRMADO">🔵 CONFIRMADO</option>
                      <option value="ENTREGUE">✅ ENTREGUE</option>
                      <option value="CANCELADO">❌ CANCELADO</option>
                    </select>
                    {isUpdatingStatus && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {order.status === 'CONFIRMADO' && (
                      <button
                        onClick={() => handleUpdateOrderField('status', 'ENTREGUE')}
                        disabled={isUpdatingStatus}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-900/10 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Concluir Entrega
                      </button>
                    )}
                    {order.status === 'PENDENTE' && (
                      <button
                        onClick={() => {
                          const sugValue = (order.total * 0.3).toFixed(2);
                          setSugestedSinal(sugValue);
                          setShowConfirmModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 shadow-sm text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                      >
                        Confirmar Pedido (Z-API)
                      </button>
                    )}
                  </div>
                </div>
                {/* Customer Observations */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <FieldWithPermission
                    label="📝 Observações do Cliente"
                    value={order.customer_obs || ''}
                    canEdit={true} // Todos podem ver/editar as notas do cliente
                    onEdit={(val) => handleUpdateOrderField('customer_obs', val)}
                    placeholder="Ex: Sem merengue, embalagem para presente..."
                  />
                </div>

                {/* Notes Edit */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <FieldWithPermission
                    label="Resumo / Notas Internas"
                    value={order.notes || ''}
                    canEdit={canEditFinancial} // reusando nível de acesso
                    onEdit={(val) => handleUpdateOrderField('notes', val)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                💰 Informações Financeiras
              </h3>
              <div className="space-y-3">
                <FieldWithPermission
                  label="Valor Inicial dos Itens"
                  value={order.total}
                  variant="currency"
                  canEdit={canEditFinancial}
                  disabled={order.status === 'ENTREGUE'}
                  onEdit={(val) => handleUpdateOrderField('total', val)}
                />
                
                <FieldWithPermission
                  label="Taxa de Entrega / Acréscimos"
                  value={order.delivery_fee || 0}
                  variant="currency"
                  canEdit={canEditFinancial}
                  disabled={order.status === 'ENTREGUE'}
                  onEdit={(val) => handleUpdateOrderField('delivery_fee', val)}
                />
                
                <FieldWithPermission
                  label="Desconto Aplicado"
                  value={order.discount || 0}
                  variant="currency"
                  canEdit={canEditFinancial}
                  disabled={order.status === 'ENTREGUE'}
                  onEdit={(val) => handleUpdateOrderField('discount', val)}
                />

                <FieldWithPermission
                  label="Motivo do Desconto"
                  value={order.discount_reason || ''}
                  canEdit={canEditFinancial}
                  disabled={order.status === 'ENTREGUE'}
                  onEdit={(val) => handleUpdateOrderField('discount_reason', val)}
                />

                <div className="p-3 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-lg mt-4 flex justify-between">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">TOTAL FINAL PEDIDO:</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {((order.total || 0) + (order.delivery_fee || 0) - (order.discount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                </div>

                {order.balance_due > 0 && (order as any).debt_classification && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg mt-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pendência Financeira</span>
                    </div>
                    <p className="text-xs font-bold text-red-900 dark:text-red-200">
                      {(order as any).debt_classification.replace(/_/g, ' ')}
                    </p>
                    {(order as any).debt_notes && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-1 border-t border-red-100 dark:border-red-900/30 pt-1">
                      &quot;{(order as any).debt_notes}&quot;
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Recebido</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totalConfirmed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Saldo Devido</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {Math.max(0, ((order.total || 0) + (order.delivery_fee || 0) - (order.discount || 0)) - totalConfirmed).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <OrderItemList orderId={orderId} refreshKey={refreshKey} onItemRemoved={() => setRefreshKey(k => k + 1)} />
        </div>

        <ReferenceImages orderId={orderId} customerId={order.customer_id} />

        {/* Histórico de Alterações (Oculto no Modo Compacto) */}
        {!isCompact && (
          <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-gray-800 rounded-3xl p-6">
            <ChangeHistory orderId={orderId} refreshKey={refreshKey} />
          </div>
        )}


        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">💳 Gerenciar Pagamentos</h3>
            <div className="flex gap-2 relative">
              {showMiniEscolha ? (
                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 flex flex-col gap-2 min-w-[180px] z-20 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Escolha o Meio</p>
                  {[
                    { id: 'PIX', label: '📱 Pix', bg: 'bg-emerald-600 hover:bg-emerald-700' },
                    { id: 'DEBITO', label: '💳 Débito', bg: 'bg-blue-600 hover:bg-blue-700' },
                    { id: 'CREDITO', label: '💳 Crédito', bg: 'bg-indigo-600 hover:bg-indigo-700' },
                    { id: 'DINHEIRO', label: '💵 Dinheiro', bg: 'bg-amber-600 hover:bg-amber-700' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={async () => {
                        try {
                          // Obter token via Supabase Auth
                          const { data: { session } } = await supabase.auth.getSession()
                          const token = session?.access_token || ''

                          if (!token) {
                            throw new Error('Sessão expirada. Faça login novamente.')
                          }

                          const response = await fetch('/api/payments', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              order_id: orderId,
                              type: saldoDue >= order.total ? 'SINAL' : 'SALDO',
                              method: m.id,
                              valor: saldoDue,
                              notes: 'Baixa Expressa (Mini Escolha)'
                            })
                          })

                          if (!response.ok) {
                            const err = await response.json()
                            throw new Error(err.error || 'Erro ao registrar pagamento')
                          }

                          setShowMiniEscolha(false);
                          setRefreshKey(k => k + 1);
                        } catch (err: any) {
                          alert('Erro ao confirmar pagamento: ' + err.message);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 ${m.bg} text-white rounded text-xs font-bold transition-all hover:scale-[1.02]`}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowMiniEscolha(false)}
                    className="mt-1 text-[10px] text-gray-400 uppercase font-black tracking-widest text-center"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}

              <button
                onClick={() => setShowMiniEscolha(true)}
                disabled={order.payment_status === 'QUITADO' || saldoDue === 0}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-2"
              >
                + Baixar {saldoDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={order.payment_status === 'QUITADO'}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs font-bold uppercase tracking-widest shadow-sm"
              >
                Outro Valor
              </button>
            </div>
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
      <div className={isCompact ? "w-full space-y-6" : "lg:col-span-4 space-y-6"}>
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
                const sugg = prompt('Qual valor sugerido para o sinal?', (order.total * 0.3).toFixed(2));
                if (sugg) handleSendSummaryToWhatsApp(parseFloat(sugg));
              }}
              disabled={sendingWhatsApp || !order.customer_phone}
              className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50"
            >
              {sendingWhatsApp ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <QrCode className="w-3 h-3" />
              )}
              Re-enviar Resumo + PIX
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <RegisterPaymentModal
          orderId={orderId}
          orderTotal={order.total}
          sinalPago={paymentEntries
            .filter(p => p.status === 'CONFIRMADO')
            .reduce((sum, p) => sum + p.amount, 0)}
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

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirma a produção?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Qual o valor sugerido do sinal a ser cobrado&quest; &lpar;Será enviado no resumo com chave copiável do PIX e QR Code&rpar;.
            </p>
            <div className="relative mb-6">
              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
              <input
                type="text"
                autoFocus
                value={sugestedSinal}
                onChange={(e) => setSugestedSinal(e.target.value.replace(/[^0-9,.]/g, ''))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0,00"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    setShowConfirmModal(false);
                    const { error } = await supabase
                      .from('orders')
                      .update({ status: 'CONFIRMADO' })
                      .eq('id', orderId);
                    if (error) throw error;
                    // Format comma to dot if user typed it
                    const valParsed = parseFloat(sugestedSinal.replace(',', '.'));
                    await handleSendSummaryToWhatsApp(valParsed || 0, true);
                    setRefreshKey(k => k + 1);
                  } catch (err: any) {
                    alert('Erro: ' + err.message);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {isDebtModalOpen && order && (
        <DebtClassificationModal
          orderId={order.id}
          balanceDue={order.balance_due || 0}
          onClose={() => setIsDebtModalOpen(false)}
          onSuccess={() => {
            setIsDebtModalOpen(false);
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}
