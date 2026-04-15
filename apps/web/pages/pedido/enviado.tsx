import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';

export default function EnviadoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-orange-50 py-12 px-6">
      <Head>
        <title>Pedido Enviado | Puro Sabor</title>
      </Head>

      <div className="max-w-xl mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl font-black text-[var(--primary-dark)] leading-tight uppercase tracking-tight">
            Seu Pedido foi Enviado! 🎉
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Recebemos seu pedido com sucesso. Nossa equipe vai revisar e entrará em contato pelo WhatsApp em breve para confirmar os detalhes e formas de pagamento do sinal (depósito).
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-emerald-100 p-8 mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-black text-[var(--primary-dark)] uppercase text-sm mb-1">Próximos Passos</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Seu pedido foi recebido</li>
                <li>✓ Você receberá uma mensagem via WhatsApp</li>
                <li>✓ Confirme os detalhes e realize o pagamento do sinal</li>
                <li>✓ Seu pedido será agendado para produção</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <a
            href="https://wa.me/5551999056903"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-[0.25em] text-xs shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-emerald-600"
          >
            <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
          </a>

          <button
            onClick={() => router.push('/pedido')}
            className="w-full py-5 bg-white border-2 border-orange-100 text-[var(--primary-dark)] rounded-3xl font-black uppercase tracking-[0.25em] text-xs active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-[11px] text-blue-800 leading-relaxed text-center">
            💡 <strong>Dica:</strong> Guarde o número de nosso WhatsApp ({'+55 51 99905-6903'}) nos seus contatos para futuras compras!
          </p>
        </div>
      </div>
    </div>
  );
}
