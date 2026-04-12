import React from 'react';
import { CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SuccessScreenProps {
  orderNumber: string;
  customerName: string;
}

export function SuccessScreen({ orderNumber, customerName }: SuccessScreenProps) {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center animate-in fade-in zoom-in duration-700">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20 scale-150" />
          <CheckCircle2 className="w-24 h-24 text-emerald-500 relative z-10" />
        </div>
      </div>

      <h2 className="text-3xl font-black text-[var(--primary-dark)] uppercase tracking-tight mb-4">
        Pedido Recebido!
      </h2>
      <p className="text-sm text-gray-500 font-medium mb-12">
        Olá <span className="text-[var(--primary-dark)] font-bold">{customerName}</span>, seu pedido <span className="bg-orange-100 px-2 py-0.5 rounded text-[var(--primary-paprica)] font-bold">#{orderNumber}</span> foi enviado com sucesso para nossa central.
      </p>

      <div className="space-y-4">
        <div className="p-6 bg-white rounded-3xl border border-orange-100 shadow-sm text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-12 -mt-12 opacity-50" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-900/40 mb-3 relative">Próximos Passos</h3>
          <ul className="space-y-4 relative">
             <li className="flex gap-4 items-start">
                <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                <p className="text-xs text-gray-600 leading-relaxed">Nossa operadora irá revisar os detalhes da sua personalização.</p>
             </li>
             <li className="flex gap-4 items-start">
                <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                <p className="text-xs text-gray-600 leading-relaxed">Você receberá no WhatsApp os dados para pagamento do <strong>sinal de 30%</strong>.</p>
             </li>
             <li className="flex gap-4 items-start">
                <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                <p className="text-xs text-gray-600 leading-relaxed">Após a confirmação do sinal, sua reserva estará garantida!</p>
             </li>
          </ul>
        </div>

        <Link 
          href="/"
          className="w-full py-5 bg-[var(--primary-dark)] text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Voltar ao Início <ArrowRight className="w-4 h-4" />
        </Link>
        
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8 flex items-center justify-center gap-2">
          <MessageSquare className="w-3 h-3" /> Dúvidas? Chame no Whats
        </p>
      </div>
    </div>
  );
}
