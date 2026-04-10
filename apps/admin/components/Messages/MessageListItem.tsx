import React from "react";

interface MessageChat {
  customer_id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction: "INCOMING" | "OUTGOING";
}

interface MessageListItemProps {
  chat: MessageChat;
  isSelected: boolean;
  onSelect: () => void;
}

export const MessageListItem: React.FC<MessageListItemProps> = ({
  chat,
  isSelected,
  onSelect,
}) => {
  const timeAgo = formatTimeAgo(chat.last_message_time);
  const preview = chat.last_message.substring(0, 50);

  return (
    <button
      onClick={onSelect}
      className={`w-full px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-left transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p
            className={`text-sm font-medium ${
              chat.unread_count > 0
                ? "text-gray-900 dark:text-white font-semibold"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {chat.customer_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {chat.phone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </p>
          {chat.unread_count > 0 && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
              {chat.unread_count}
            </span>
          )}
        </div>
      </div>

      {/* Indicador de direção + Preview */}
      <div className="flex items-center gap-1">
        <span
          className={`text-xs font-medium ${
            chat.direction === "INCOMING"
              ? "text-blue-600 dark:text-blue-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {chat.direction === "INCOMING" ? "📥" : "📤"}
        </span>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
          {preview}
          {chat.last_message.length > 50 ? "..." : ""}
        </p>
      </div>
    </button>
  );
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString("pt-BR");
}
