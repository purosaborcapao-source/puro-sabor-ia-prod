import React from 'react';
import Head from 'next/head';
import { CheckCircle2, MessageCircle, Home } from 'lucide-react';

export default function ConfirmacaoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <Head>
        <title>Pedido Enviado | Puro Sabor</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-2xl font-black text-[var(--primary-dark)] tracking-tight">
            Puro <span className="text-[var(--primary-paprica)] italic">Sabor</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-900/40">Pedido Recebido</p>
        </div>

        <div className="bg-emerald-500 p-8 rounded-3xl text-white shadow-xl shadow-emerald-500/20 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-200" />
          <h2 className="text-2xl font-black uppercase mb-2">Pedido Recebido!</h2>
          <p className="text-emerald-100 text-sm">
            Obrigado pelo seu pedido! Nossa equipe recebeu as informações e entrará em contato via WhatsApp para confirmar os detalhes.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100">
          <p className="text-sm text-gray-600 text-center">
            Agora é só aguardar! <span className="font-bold">Em breve você receberá uma mensagem</span> no WhatsApp com a confirmação do pedido e informações de pagamento.
          </p>
        </div>

        <div className="flex gap-4">
          <a 
            href="/cardapio"
            className="flex-1 py-4 bg-white border border-orange-100 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 flex items-center justify-center gap-3 hover:bg-orange-50 transition-colors"
          >
            <Home className="w-4 h-4" /> Novo Pedido
          </a>
          <a 
            href="https://wa.me/5551999056903"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}