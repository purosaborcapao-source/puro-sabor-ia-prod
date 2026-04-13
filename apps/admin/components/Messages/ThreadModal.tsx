import React, { useEffect } from "react";
import { X } from "lucide-react";
import { MessageThread } from "./MessageThread";

interface ThreadModalProps {
  customerId: string | null;
  onClose: () => void;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({
  customerId,
  onClose,
}) => {
  // Fechar com ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!customerId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Fechar (ESC)"
        >
          <X className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
        </button>

        {/* Thread ocupando toda a altura do modal */}
        <div className="flex-1 min-h-0">
          <MessageThread customerId={customerId} />
        </div>
      </div>
    </div>
  );
};
