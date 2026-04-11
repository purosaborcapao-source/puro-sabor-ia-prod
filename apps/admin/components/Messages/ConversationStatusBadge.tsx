import React from "react";

export type ConversationStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_ORDER"
  | "RESOLVED";

interface ConversationStatusBadgeProps {
  status: ConversationStatus;
}

export const ConversationStatusBadge: React.FC<
  ConversationStatusBadgeProps
> = ({ status }) => {
  switch (status) {
    case "NEW":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Nova
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-md text-xs font-medium">
          💬 Em Atendimento
        </span>
      );
    case "WAITING_ORDER":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-md text-xs font-medium">
          📋 Aguarda Pedido
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-md text-xs font-medium border border-green-200 dark:border-green-800">
          ✅ Resolvido
        </span>
      );
    default:
      return null;
  }
};
