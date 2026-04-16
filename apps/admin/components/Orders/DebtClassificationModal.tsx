import React, { useState } from 'react';
import { X, AlertCircle, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@atendimento-ia/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DebtClassificationModalProps {
  orderId: string;
  balanceDue: number;
  onClose: () => void;
  onSuccess: (classification?: string, notes?: string) => void;
}

export function DebtClassificationModal({
  orderId,
  balanceDue,
  onClose,
  onSuccess
}: DebtClassificationModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'PAYMENT' | 'DEBT'>('PAYMENT');
  const [classification, setClassification] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para Registro de Pagamento Rápido
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'DEBITO' | 'CREDITO' | 'DINHEIRO'>('PIX');

  const classifications = [
    { id: 'CLIENTE_PAGARA_AMANHA', label: 'Cliente pagará amanhã' },
    { id: 'ERRO_OPERACIONAL', label: 'Erro operacional' },
    { id: 'FIADO', label: 'Fiado' },
    { id: 'ESQUECIMENTO', label: 'Esquecimento' },
    { id: 'RECLAMACAO_QUALIDADE', label: 'Reclamação de Qualidade' },
    { id: 'COMBINADO', label: 'Combinado' },
  ];

  const handleClassifyDebt = async () => {
    if (!classification) {
      setError('Selecione uma classificação para a pendência');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          status: 'ENTREGUE',
          debt_classification: classification,
          debt_notes: notes
        })
        .eq('id', orderId);

      if (updateErr) throw updateErr;

      // Auditoria: Documentar mudança de status e classificação de dívida
      await supabase.from('order_changes').insert({
        order_id: orderId,
        changed_by: user?.id,
        field: 'status',
        old_value: 'CONFIRMADO', // Assumindo que estava confirmado
        new_value: 'ENTREGUE',
        reason: `Finalização com pendência: ${classification}. Obs: ${notes || 'N/A'}`
      });

      onSuccess(classification, notes);
    } catch (err: any) {
      setError(err.message || 'Erro ao classificar pendência');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFullPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: orderId,
          type: 'SALDO',
          method: paymentMethod,
          valor: balanceDue,
          notes: 'Baixa total no ato da entrega'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao registrar pagamento');

      // Após o pagamento ser registrado (backend triga o balance_due para 0), 
      // atualizamos o status para ENTREGUE
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'ENTREGUE' })
        .eq('id', orderId);

      if (updateErr) throw updateErr;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Finalização de Entrega</h3>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-0.5">
              Saldo Pendente: {balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs/Mode Selection */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 m-6 rounded-xl">
          <button
            onClick={() => setMode('PAYMENT')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              mode === 'PAYMENT' 
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Recebi Agora
          </button>
          <button
            onClick={() => setMode('DEBT')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              mode === 'DEBT' 
                ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Deixar Pendente
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {mode === 'PAYMENT' ? (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-200">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Selecione o Meio de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'PIX', label: '📱 Pix' },
                  { id: 'DEBITO', label: '💳 Débito' },
                  { id: 'CREDITO', label: '💳 Crédito' },
                  { id: 'DINHEIRO', label: '💵 Dinheiro' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                      paymentMethod === m.id
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20 scale-[1.02]'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-500/50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 text-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                Ao confirmar, o saldo de <strong>{balanceDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> será baixado e o pedido marcado como ENTREGUE.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                Por que o saldo ficou pendente?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {classifications.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClassification(c.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold text-left transition-all border ${
                      classification === c.id
                        ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20 scale-[1.01]'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-orange-500/50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais (opcional)..."
                className="w-full h-24 p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={mode === 'PAYMENT' ? handleRegisterFullPayment : handleClassifyDebt}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'PAYMENT' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' 
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {mode === 'PAYMENT' ? 'Confirmar Recebimento' : 'Confirmar Pendência'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
