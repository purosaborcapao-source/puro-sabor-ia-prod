import React from "react";

interface Message {
  id: string;
  direction: "INCOMING" | "OUTGOING" | "INBOUND" | "OUTBOUND";
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT";
  created_at: string | null;
  payload?: any;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isIncoming = message.direction === "INCOMING";
  const payload = message.payload as any;
  const intent = payload?.intent;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-2`}
    >
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          isIncoming
            ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
            : "bg-blue-500 text-white"
        }`}
      >
        <p className="text-sm break-words">{message.content}</p>

        {/* Intent badge (apenas para mensagens recebidas processadas) */}
        {isIncoming && intent && (
          <div className="mt-1 text-xs opacity-75">
            <span className="inline-block bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-0.5 rounded">
              {intent}
            </span>
          </div>
        )}

        {/* Timestamp */}
        {message.created_at && (
          <p
            className={`text-xs mt-1 ${
              isIncoming
                ? "text-gray-600 dark:text-gray-400"
                : "text-blue-100"
            }`}
          >
            {formatTime(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
};
