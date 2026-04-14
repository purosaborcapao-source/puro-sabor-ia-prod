import React, { useState, useEffect } from "react";
import { supabase } from "@atendimento-ia/supabase";
import {
  MessageSquare,
  Save,
  CheckCircle,
  MapPin,
  BookOpen,
  QrCode,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ShortcutLocation {
  key: "1";
  title: string;
  type: "location";
  message: string;
  maps_url: string;
  image_url: string;
  tips: string;
}

interface ShortcutLink {
  key: "2";
  title: string;
  type: "link";
  message: string;
  url: string;
  tips: string;
}

interface ShortcutPix {
  key: "3";
  title: string;
  type: "pix";
  message: string;
  pix_key: string;
  pix_instructions: string;
}

type Shortcut = ShortcutLocation | ShortcutLink | ShortcutPix;

interface BotGreetingConfig {
  enabled: boolean;
  only_when_offline: boolean;
  greeting_message: string;
  shortcuts: Shortcut[];
}

const defaultConfig: BotGreetingConfig = {
  enabled: false,
  only_when_offline: true,
  greeting_message:
    "Olá! 👋 Seja bem-vindo(a) à *Puro Sabor*!\n\nComo posso te ajudar? Escolha uma opção:\n\n1️⃣ Localização\n2️⃣ Cardápio\n3️⃣ PIX para Pagamento\n\nDigite o número da opção 😊",
  shortcuts: [
    {
      key: "1",
      title: "Localização",
      type: "location",
      message: "📍 *Nossa Localização*\n\nEstamos aqui, é fácil chegar!",
      maps_url: "",
      image_url: "",
      tips: "",
    },
    {
      key: "2",
      title: "Cardápio",
      type: "link",
      message: "🍰 *Nosso Cardápio*\n\nConfira todas as nossas delícias:",
      url: "",
      tips: "",
    },
    {
      key: "3",
      title: "PIX",
      type: "pix",
      message: "💸 *Pagamento via PIX*",
      pix_key: "",
      pix_instructions:
        "Após o pagamento, envie o comprovante aqui para confirmarmos seu pedido! ✅",
    },
  ],
};

const shortcutIcons = {
  "1": MapPin,
  "2": BookOpen,
  "3": QrCode,
};

const shortcutColors = {
  "1": "text-green-600 dark:text-green-400",
  "2": "text-blue-600 dark:text-blue-400",
  "3": "text-purple-600 dark:text-purple-400",
};

export const GreetingSettings: React.FC = () => {
  const [config, setConfig] = useState<BotGreetingConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedShortcut, setExpandedShortcut] = useState<string | null>("1");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "bot_greeting_config")
        .single();

      if (data?.value) {
        const loaded = data.value as BotGreetingConfig;
        // Merge with defaults to handle missing fields from older configs
        setConfig({
          ...defaultConfig,
          ...loaded,
          shortcuts: defaultConfig.shortcuts.map((def) => {
            const saved = loaded.shortcuts?.find((s) => s.key === def.key);
            return saved ? { ...def, ...saved } : def;
          }),
        });
      }
    } catch (err) {
      console.error("[GreetingSettings] Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await supabase
        .from("settings")
        .upsert({ key: "bot_greeting_config", value: config as any }, { onConflict: "key" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("[GreetingSettings] Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateShortcut = (key: string, updates: Partial<Shortcut>) => {
    setConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.map((s) =>
        s.key === key ? ({ ...s, ...updates } as Shortcut) : s
      ),
    }));
  };

  const getShortcut = (key: string) => config.shortcuts.find((s) => s.key === key);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          Saudação Automática & Atalhos Rápidos
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Quando ninguém estiver online, o bot responde automaticamente com um menu de opções.
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Ativar Bot de Saudação</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Envia uma saudação automática para novos contatos
          </p>
        </div>
        <button
          onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className="flex items-center gap-2"
        >
          {config.enabled ? (
            <ToggleRight className="w-10 h-10 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-400" />
          )}
        </button>
      </div>

      {/* Only When Offline Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            Apenas quando não houver operador online
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Se desativado, sempre envia a saudação para novos contatos
          </p>
        </div>
        <button
          onClick={() =>
            setConfig((prev) => ({ ...prev, only_when_offline: !prev.only_when_offline }))
          }
          className="flex items-center gap-2"
        >
          {config.only_when_offline ? (
            <ToggleRight className="w-10 h-10 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-400" />
          )}
        </button>
      </div>

      {/* Greeting Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mensagem de Saudação
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Esta mensagem é enviada quando um novo cliente manda a primeira mensagem. Use *negrito* para
          destaque.
        </p>
        <textarea
          value={config.greeting_message}
          onChange={(e) => setConfig((prev) => ({ ...prev, greeting_message: e.target.value }))}
          rows={8}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Olá! 👋 Seja bem-vindo(a)..."
        />
      </div>

      {/* Shortcuts */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Configuração dos Atalhos
        </h4>
        <div className="space-y-3">
          {(["1", "2", "3"] as const).map((key) => {
            const shortcut = getShortcut(key);
            if (!shortcut) return null;
            const Icon = shortcutIcons[key];
            const colorClass = shortcutColors[key];
            const isExpanded = expandedShortcut === key;

            return (
              <div
                key={key}
                className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden"
              >
                {/* Shortcut Header */}
                <button
                  onClick={() => setExpandedShortcut(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                      {key}
                    </span>
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {shortcut.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ({shortcut.type === "location" ? "Localização" : shortcut.type === "link" ? "Link" : "PIX"})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Shortcut Fields */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-gray-50 dark:bg-gray-700/30 space-y-4 border-t border-gray-200 dark:border-gray-600">
                    {/* Message intro text */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Texto da resposta
                      </label>
                      <textarea
                        value={shortcut.message}
                        onChange={(e) => updateShortcut(key, { message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        placeholder="Mensagem introdutória..."
                      />
                    </div>

                    {/* Location fields */}
                    {shortcut.type === "location" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Link do Google Maps
                          </label>
                          <input
                            type="url"
                            value={(shortcut as ShortcutLocation).maps_url}
                            onChange={(e) => updateShortcut(key, { maps_url: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="https://maps.google.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            URL da foto da fachada (opcional)
                          </label>
                          <input
                            type="url"
                            value={(shortcut as ShortcutLocation).image_url}
                            onChange={(e) => updateShortcut(key, { image_url: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Dicas para chegar (opcional)
                          </label>
                          <textarea
                            value={(shortcut as ShortcutLocation).tips}
                            onChange={(e) => updateShortcut(key, { tips: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Ex: Ficamos ao lado do mercado X, em frente à praça..."
                          />
                        </div>
                      </>
                    )}

                    {/* Link fields */}
                    {shortcut.type === "link" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            URL do Cardápio
                          </label>
                          <input
                            type="url"
                            value={(shortcut as ShortcutLink).url}
                            onChange={(e) => updateShortcut(key, { url: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="https://purosabor.com.br/cardapio"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Complemento (opcional)
                          </label>
                          <input
                            type="text"
                            value={(shortcut as ShortcutLink).tips}
                            onChange={(e) => updateShortcut(key, { tips: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Ex: Acesse para ver preços e promoções!"
                          />
                        </div>
                      </>
                    )}

                    {/* PIX fields */}
                    {shortcut.type === "pix" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Chave PIX
                          </label>
                          <input
                            type="text"
                            value={(shortcut as ShortcutPix).pix_key}
                            onChange={(e) => updateShortcut(key, { pix_key: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                            placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Instruções após a chave
                          </label>
                          <textarea
                            value={(shortcut as ShortcutPix).pix_instructions}
                            onChange={(e) => updateShortcut(key, { pix_instructions: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Ex: Após o pagamento, envie o comprovante aqui..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
          PRÉVIA DA SAUDAÇÃO
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-light">
            {config.greeting_message || "Nenhuma mensagem configurada"}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveConfig}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {saving ? (
          "Salvando..."
        ) : saved ? (
          <>
            <CheckCircle className="w-4 h-4" /> Salvo!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" /> Salvar Configurações
          </>
        )}
      </button>
    </div>
  );
};
