import React, { useState, useEffect } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { Bot, Save, CheckCircle, HelpCircle } from "lucide-react";

export const AISettings: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState("");
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
        .eq("key", "ai_system_prompt")
        .single();
      
      if (data) setSystemPrompt(data.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await supabase.from("settings").upsert({ 
        key: "ai_system_prompt", 
        value: systemPrompt 
      }, { onConflict: 'key' });
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
          <Bot className="w-5 h-5 text-purple-500" />
          Configurações da IA (Claude)
        </h3>
        <p className="text-sm text-gray-500">Ajuste o comportamento do "Cérebro" que atende seus clientes.</p>
      </div>

      <div className="space-y-4 max-w-4xl">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            System Prompt (Instruções Principais)
            <HelpCircle className="w-4 h-4 text-gray-400" title="Estas são as regras que a IA deve seguir." />
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={15}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Você é um assistente de vendas da padaria Puro Sabor..."
          />
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> Salvar Prompt</>}
        </button>
      </div>
    </div>
  );
};
