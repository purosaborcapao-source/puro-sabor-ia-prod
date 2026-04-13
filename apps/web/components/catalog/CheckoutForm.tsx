import React, { useState } from 'react';
import { User, Phone, Calendar, Clock, ArrowLeft, Send } from 'lucide-react';

interface CheckoutFormProps {
  total: number;
  sinalValor: number;
  onBack: () => void;
  onSubmit: (data: CheckoutData) => void;
  isSubmitting: boolean;
}

export interface CheckoutData {
  date: string;
  time: string;
}

export function CheckoutForm({ total, sinalValor, onBack, onSubmit, isSubmitting }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutData>({
    date: '',
    time: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.date && formData.time;

  return (
    <div className="max-w-xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--primary-paprica)] font-black uppercase tracking-widest text-[10px] mb-8 hover:-translate-x-1 transition-transform"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </button>

      <div className="space-y-2 mb-10">
        <h2 className="text-3xl font-black text-[var(--primary-dark)] leading-none uppercase tracking-tight">Finalizar</h2>
        <p className="text-sm text-gray-400 font-medium">Preencha seus dados para agendar a retirada.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Agendamento */}
        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-900/30 mb-2">Agendamento de Retirada</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-200" />
              <input
                required
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-orange-50/50 rounded-2xl border border-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-sm font-medium"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-200" />
              <input
                required
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-orange-50/50 rounded-2xl border border-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="p-6 bg-[var(--primary-dark)] rounded-3xl text-white space-y-4 shadow-xl shadow-stone-900/20">
          <div className="flex justify-between items-center opacity-60">
            <span className="text-[10px] font-black uppercase tracking-widest">Total do Pedido</span>
            <span className="text-sm font-bold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-t border-white/10">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-orange-200 mb-0.5">Sinal para Reserva (30%)</span>
              <span className="text-2xl font-black">{sinalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="px-3 py-1 bg-emerald-500 rounded-full text-[9px] font-black uppercase">Obrigatório</div>
          </div>
          <p className="text-[9px] leading-relaxed opacity-50 italic">
            * Após o envio, nossa operadora entrará em contato para confirmar os detalhes e as formas de pagamento do sinal.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full py-5 bg-[var(--primary-paprica)] text-white rounded-3xl font-black uppercase tracking-[0.25em] text-xs shadow-2xl shadow-orange-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isSubmitting ? 'Enviando...' : 'Confirmar e Enviar'} <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
