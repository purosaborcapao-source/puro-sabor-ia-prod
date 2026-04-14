import React from "react";
import { Mic } from "lucide-react";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VOICE";
  media_url?: string;
  created_at: string | null;
  payload?: any;
  sent_by_operator_name?: string | null;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isIncoming = message.direction === "INBOUND";
  const payload = message.payload as any;
  const intent = payload?.intent;

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 shadow-sm transition-all ${
          isIncoming
            ? "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl rounded-tl-sm"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tr-sm"
        }`}
      >
        {message.type === "IMAGE" && message.media_url ? (
          <div className="mb-2">
            <img
              src={message.media_url}
              alt="Imagem do WhatsApp"
              className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity border border-zinc-100 dark:border-zinc-700"
              onClick={() => window.open(message.media_url, "_blank")}
            />
            {message.content && message.content !== "[Imagem]" && (
              <p className="text-[14px] leading-relaxed break-words mt-2 opacity-90 whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ) : (message.type === "AUDIO" || message.type === "VOICE") && message.media_url ? (
          <div className="mb-2">
            <audio
              controls
              src={message.media_url}
              className="w-full max-w-[280px] h-10"
            />
            {message.content && message.content !== "[Áudio]" && message.content !== "[Voice Message]" && (
              <p className="text-[14px] leading-relaxed break-words mt-2 opacity-90 whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ) : (message.type === "AUDIO" && !message.media_url) ? (
          <div className="mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-500">Áudio</span>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
        )}

        <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/50">
          {/* Intent badge */}
          {/* Intent & Operador */}
          <div className="flex items-center gap-2">
            {isIncoming && intent ? (
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {intent}
              </span>
            ) : null}
            {!isIncoming && message.sent_by_operator_name ? (
              <span className="text-[9px] font-medium tracking-tight text-zinc-400 dark:text-zinc-500/60 border-l border-zinc-100 dark:border-zinc-800/50 pl-2 uppercase">
                {message.sent_by_operator_name.split(' ')[0]}
              </span>
            ) : null}
          </div>

          {/* Timestamp */}
          {message.created_at && (
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-tight">
              {formatTime(message.created_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
