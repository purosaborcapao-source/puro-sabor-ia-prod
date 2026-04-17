import React from "react";
import { SLATimer } from "./SLATimer";

interface MessageChat {
  customer_id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  direction: "INBOUND" | "OUTBOUND";
  status?: "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED";
  last_inbound_at?: string | null;
}

interface MessageListItemProps {
  chat: MessageChat;
  isSelected: boolean;
  onSelect: () => void;
}

const STATUS_BORDER: Record<string, string> = {
  NEW:           'border-l-amber-400',
  IN_PROGRESS:   'border-l-blue-500',
  WAITING_ORDER: 'border-l-orange-400',
  RESOLVED:      'border-l-zinc-300 dark:border-l-zinc-600',
}

const AVATAR_COLOR: Record<string, string> = {
  NEW:           'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  IN_PROGRESS:   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  WAITING_ORDER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  RESOLVED:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

export const MessageListItem: React.FC<MessageListItemProps> = ({ chat, isSelected, onSelect }) => {
  const timeAgo = formatTimeAgo(chat.last_message_time)
  const hasUnread = chat.unread_count > 0
  const status = chat.status || 'RESOLVED'
  const initial = chat.customer_name.charAt(0).toUpperCase()
  const borderCls = STATUS_BORDER[status] ?? STATUS_BORDER.RESOLVED
  const avatarCls = AVATAR_COLOR[status] ?? AVATAR_COLOR.RESOLVED

  // Limpar preview: remover prefixos de tipo
  const preview = chat.last_message
    .replace(/^\[(Imagem|Áudio|Documento|Voice Message)\]/i, '')
    .trim()
    .substring(0, 55) || '—'

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border-l-4 ${borderCls} transition-colors relative ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/30'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
      }`}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5 ${avatarCls}`}>
          {initial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className={`text-sm truncate ${hasUnread ? 'font-bold text-zinc-900 dark:text-zinc-50' : 'font-semibold text-zinc-700 dark:text-zinc-300'}`}>
              {chat.customer_name}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasUnread && (
                <span className="min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {chat.unread_count > 9 ? '9+' : chat.unread_count}
                </span>
              )}
              <span className="text-[10px] text-zinc-400 font-mono">{timeAgo}</span>
            </div>
          </div>

          {/* SLA para conversas ativas */}
          {chat.last_inbound_at && (status === 'NEW' || status === 'IN_PROGRESS') && (
            <div className="mb-1">
              <SLATimer status={status} lastInboundAt={chat.last_inbound_at} />
            </div>
          )}

          {/* Preview */}
          <p className={`text-xs leading-snug line-clamp-1 ${
            hasUnread
              ? 'text-zinc-700 dark:text-zinc-300'
              : 'text-zinc-400 dark:text-zinc-500'
          }`}>
            {chat.direction === 'OUTBOUND' && (
              <span className="text-zinc-400 dark:text-zinc-500 mr-1">Você:</span>
            )}
            {preview}
          </p>
        </div>
      </div>
    </button>
  )
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "agora"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}
