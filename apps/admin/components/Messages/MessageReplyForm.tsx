import React, { useState, useRef, useEffect } from "react";
import { Send, Image, FileText, Mic, X } from "lucide-react";
import { TemplateBar } from "./TemplateBar";
import { supabase } from "@atendimento-ia/supabase";

interface Attachment {
  file: File;
  preview: string;
  type: "image" | "audio" | "document";
}

interface MessageReplyFormProps {
  onSend: (message: string, attachment?: { type: string; url: string; fileName?: string }) => Promise<void>;
}

export const MessageReplyForm: React.FC<MessageReplyFormProps> = ({ onSend }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [maxSizeMb, setMaxSizeMb] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    supabase.from("settings").select("value").eq("key", "upload_max_size_mb").single()
      .then(({ data }) => {
        if (typeof data?.value === "number") setMaxSizeMb(data.value);
      });
  }, []);

  const handleSelectTemplate = (content: string) => {
    setMessage(content);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "audio" | "document"
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (const file of files) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`Arquivo muito grande: ${file.name} (max ${maxSizeMb}MB)`);
        continue;
      }

      const preview =
        type === "image"
          ? URL.createObjectURL(file)
          : type === "audio"
          ? "🎤 Áudio"
          : `📄 ${file.name}`;

      newAttachments.push({ file, preview, type });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      if (updated[index].type === "image") {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    const nameWithoutSpacing = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : "audio_capture.webm";
    const fileName = `${Date.now()}-${nameWithoutSpacing}`;
    const bucketPath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(bucketPath, file, {
        cacheControl: "public, max-age=31536000",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Erro ao fazer upload");
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(bucketPath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && attachments.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const attachment = attachments[0];
      if (attachment) {
        setUploading(true);
        const url = await uploadFile(attachment.file);

        await onSend(message.trim(), {
          type: attachment.type,
          url,
          fileName: attachment.file.name,
        });
      } else {
        await onSend(message.trim());
      }

      setMessage("");
      setAttachments([]);
    } catch (err) {
      console.error("❌ Erro ao enviar mensagem:", err);
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TemplateBar onSelectTemplate={handleSelectTemplate} quickSearchText={message} />

      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              {att.type === "image" ? (
                <img
                  src={att.preview}
                  alt=""
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <span className="text-sm">{att.preview}</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="flex gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Anexar imagem"
            >
              <Image className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, "image")}
            />

            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*,video/webm";
                input.capture = "microphone";
                input.onchange = (ev) =>
                  handleFileSelect(ev as unknown as React.ChangeEvent<HTMLInputElement>, "audio");
                input.click();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Gravar/enviar áudio"
            >
              <Mic className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf";
                input.onchange = (ev) =>
                  handleFileSelect(ev as unknown as React.ChangeEvent<HTMLInputElement>, "document");
                input.click();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Anexar PDF"
            >
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

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
            disabled={loading || (!message.trim() && attachments.length === 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading || uploading ? "Enviando..." : "Enviar"}
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 Use / para ver os seus templates salvos | 📎 Clique nos ícones para anexar
        </p>
      </form>
    </div>
  );
};