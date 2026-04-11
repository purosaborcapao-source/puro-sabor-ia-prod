import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { TemplateBar } from "./TemplateBar";

interface MessageReplyFormProps {
  onSend: (message: string) => Promise<void>;
}

export const MessageReplyForm: React.FC<MessageReplyFormProps> = ({
  onSend,
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca no input ao carregar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelectTemplate = (content: string) => {
    setMessage(content);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSend(message.trim());

      // Limpar input após envio bem-sucedido
      setMessage("");
    } catch (err) {
      console.error("❌ Erro ao enviar mensagem:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar mensagem"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TemplateBar onSelectTemplate={handleSelectTemplate} quickSearchText={message} />
      
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua resposta ou digite / para atalhos..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </div>

        {/* Dica rápida */}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 Use / para ver os seus templates salvos
        </p>
      </form>
    </div>
  );
};
