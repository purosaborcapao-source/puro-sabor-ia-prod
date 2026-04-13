import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle2, Clock, MapPin, Printer, MessageCircle, AlertCircle } from 'lucide-react';
import { supabasePublic } from '../../../lib/supabase-public';

export default function ConfirmacaoPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchOrder() {
      try {
        const { data: orderData, error: orderErr } = await supabasePublic
          .from('orders')
          .select(`
            *,
            customers:customer_id(name, phone)
          `)
          .eq('id', String(id))
          .single();

        if (orderErr) throw orderErr;
        setOrder(orderData);

        const { data: itemsData, error: itemsErr } = await supabasePublic
          .from('order_items')
          .select(`
            *,
            products:product_id(name, image_url, sale_unit)
          `)
          .eq('order_id', String(id));

        if (itemsErr) throw itemsErr;
        setItems(itemsData);
      } catch (err) {
        console.error('Erro ao buscar pedido:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold uppercase tracking-widest text-orange-200">Carregando Recibo...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center font-bold text-red-400">Pedido não encontrado.</div>;

  const isConfirmed = order?.payment_status === 'SINAL_PAGO' || order?.payment_status === 'QUITADO' || order?.sinal_confirmado;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <Head>
        <title>Recibo #{order.number} | Puro Sabor</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6 print:space-y-4">
        {/* Branding (Hidden in print usually, but here we want it) */}
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-2xl font-black text-[var(--primary-dark)] tracking-tight">
            Puro <span className="text-[var(--primary-paprica)] italic">Sabor</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-900/40">Resumo do Pedido</p>
        </div>

        {/* Status Card */}
        <div className={`p-6 rounded-3xl text-white shadow-xl ${isConfirmed ? 'bg-emerald-600' : 'bg-[var(--primary-paprica)]'}`}>
           <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Status do Pedido</p>
                <h2 className="text-2xl font-black uppercase">{order.payment_status?.replace('_', ' ') || 'AGUARDANDO SINAL'}</h2>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                {isConfirmed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
           </div>
           
           {!isConfirmed && (
             <div className="p-4 bg-white/10 rounded-2xl text-[11px] font-medium leading-relaxed border border-white/10">
                ⚠️ <strong>Atenção:</strong> Sua reserva só será confirmada após o pagamento do sinal de 30%. Nossa equipe entrará em contato via WhatsApp.
             </div>
           )}
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden print:border-none print:shadow-none">
           <div className="p-6 bg-orange-50/50 border-b border-orange-50">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-xs font-black text-[var(--primary-dark)] uppercase tracking-widest">Detalhes da Retirada</span>
                 <span className="text-[10px] font-bold text-[var(--primary-paprica)]">#{order.number}</span>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-orange-200" />
                    <span className="font-bold">{new Date(order.delivery_date).toLocaleDateString('pt-BR')} às {new Date(order.delivery_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-orange-200" />
                    <span className="font-medium">Retirada no Balcão (Puro Sabor)</span>
                 </div>
              </div>
           </div>

           <div className="p-6 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Itens do Pedido</h3>
              <div className="divide-y divide-orange-50">
                 {items.map((item) => (
                   <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-black text-[var(--primary-dark)] uppercase tracking-tight">{item.products.name}</span>
                        <span className="text-sm font-bold">{item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {item.quantity < 1000 ? `${item.quantity}g` : `${item.quantity / 1000}kg`} • {item.customizations?.flavor}
                        </span>
                        {item.customizations?.decoration && (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                            {item.customizations.decoration}
                          </span>
                        )}
                      </div>
                      {item.customizations?.notes && (
                        <p className="mt-2 text-[10px] text-gray-400 italic">&quot;{item.customizations.notes}&quot;</p>
                      )}
                   </div>
                 ))}
              </div>

              {/* Finance */}
              <div className="pt-6 border-t-2 border-dashed border-orange-100 space-y-3">
                 <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                    <span>Subtotal</span>
                    <span>{Number(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Sinal (30%)</span>
                      {!isConfirmed && <AlertCircle className="w-3 h-3 text-emerald-400 animate-pulse" />}
                    </div>
                    <span className="text-xl font-black text-emerald-600">{Number(order.sinal_valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 opacity-30 text-[10px] font-bold uppercase tracking-widest">
                    <span>Saldo Restante na Retirada</span>
                    <span>{(order.total - order.sinal_valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 print:hidden">
           <button 
             onClick={() => window.print()}
             className="flex-1 py-4 bg-white border border-orange-100 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 flex items-center justify-center gap-3 hover:bg-orange-50 transition-colors"
           >
              <Printer className="w-4 h-4" /> Imprimir / PDF
           </button>
           <a 
             href={`https://wa.me/5551999056903?text=${encodeURIComponent(`Olá! Gostaria de falar sobre o meu pedido #${order.number}`)}`} 
             target="_blank"
             rel="noopener noreferrer"
             className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
           >
              <MessageCircle className="w-4 h-4" /> Suporte WhatsApp
           </a>
        </div>
      </div>
    </div>
  );
}
