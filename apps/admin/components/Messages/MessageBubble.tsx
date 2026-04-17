import React from "react";
import { Mic, FileText } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VOICE";
  media_url?: string;
  created_at: string | null;
  payload?: any;
  sent_by_operator_name?: string | null;
  read_by_operator_name?: string | null;
}

interface MessageBubbleProps {
  message: Message;
}

function formatTime(dateString: string | null): string {
  if (!dateString) return ""
  return new Date(dateString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isIncoming = message.direction === "INBOUND"
  const operatorName = isIncoming
    ? message.read_by_operator_name?.split(" ")[0]
    : message.sent_by_operator_name?.split(" ")[0]

  return (
    <div className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-2 px-4`}>
      <div
        className={`max-w-[78%] relative ${
          isIncoming
            ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-2xl rounded-tl-sm shadow-sm border border-zinc-200/60 dark:border-zinc-700/50"
            : "bg-zinc-800 dark:bg-zinc-700 text-zinc-50 rounded-2xl rounded-tr-sm"
        }`}
      >
        {/* Conteúdo */}
        <div className="px-3.5 pt-2.5 pb-1">
          {message.type === "IMAGE" && message.media_url ? (
            <div>
              <img
                src={message.media_url}
                alt="Imagem"
                className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(message.media_url, "_blank")}
              />
              {message.content && !["[Imagem]"].includes(message.content) && (
                <p className="text-[14px] leading-relaxed break-words mt-2 whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ) : (message.type === "AUDIO" || message.type === "VOICE") && message.media_url ? (
            <div>
              <AudioPlayer src={message.media_url} className={`w-full max-w-[260px] ${isIncoming ? '' : '[&_*]:text-zinc-100'}`} />
              {message.content && !["[Áudio]", "[Voice Message]"].includes(message.content) && (
                <p className="text-[14px] leading-relaxed break-words mt-2 whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ) : message.type === "AUDIO" && !message.media_url ? (
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 opacity-50" />
              <span className="text-sm opacity-60">Áudio</span>
            </div>
          ) : message.type === "DOCUMENT" && message.media_url ? (
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 py-0.5 underline-offset-2 hover:underline ${isIncoming ? 'text-blue-600 dark:text-blue-400' : 'text-blue-300'}`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium truncate">{message.content || "Documento"}</span>
            </a>
          ) : (
            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Footer: operador + horário */}
        <div className={`flex items-center justify-end gap-2 px-3.5 pb-2 ${operatorName ? 'justify-between' : 'justify-end'}`}>
          {operatorName && (
            <span className={`text-[10px] font-medium opacity-50`}>{operatorName}</span>
          )}
          <span className={`text-[10px] font-mono opacity-50 tabular-nums`}>
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
