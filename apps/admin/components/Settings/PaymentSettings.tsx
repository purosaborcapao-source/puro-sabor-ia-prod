import React, { useState, useEffect } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { CreditCard, Save, CheckCircle } from "lucide-react";

export const PaymentSettings: React.FC = () => {
  const [pixKey, setPixKey] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["payment_pix_key", "payment_bank_info"]);
      
      data?.forEach(s => {
        if (s.key === "payment_pix_key") setPixKey(s.value as string);
        if (s.key === "payment_bank_info") setBankInfo(s.value as string);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await supabase.from("settings").upsert([
        { key: "payment_pix_key", value: pixKey },
        { key: "payment_bank_info", value: bankInfo }
      ], { onConflict: 'key' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500" />
          Configurações de Pagamento
        </h3>
        <p className="text-sm text-gray-500">Defina como seus clientes devem pagar os pedidos.</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chave PIX Principal
          </label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="CNPJ, E-mail ou Celular"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Informações Bancárias / Instruções
          </label>
          <textarea
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ex: Banco X, Agência Y, Conta Z..."
          />
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> Salvar Alterações</>}
        </button>
      </div>
    </div>
  );
};
