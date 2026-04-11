import React, { useEffect, useState } from "react";

interface SLATimerProps {
  lastInboundAt: string | null;
  status: "NEW" | "IN_PROGRESS" | "WAITING_ORDER" | "RESOLVED";
}

export const SLATimer: React.FC<SLATimerProps> = ({
  lastInboundAt,
  status,
}) => {
  const [timeAgo, setTimeAgo] = useState<string>("");
  const [level, setLevel] = useState<"GREEN" | "YELLOW" | "RED">("GREEN");

  useEffect(() => {
    // Só mostramos o timer ativo para NEW e IN_PROGRESS (casos de prioridade)
    if (!lastInboundAt || status === "RESOLVED" || status === "WAITING_ORDER") {
      return;
    }

    const calculateSLA = () => {
      if (!lastInboundAt) return;
      const date = new Date(lastInboundAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      // Calculando cor pelo nível
      if (diffMins < 15) {
        setLevel("GREEN");
      } else if (diffMins < 30) {
        setLevel("YELLOW");
      } else {
        setLevel("RED");
      }

      // Formatando Label
      if (diffMins < 1) setTimeAgo("agora");
      else if (diffMins < 60) setTimeAgo(`${diffMins}m`);
      else setTimeAgo(`${diffHours}h ${diffMins % 60}m`);
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 30000); // 30 em 30 seg atualiza

    return () => clearInterval(interval);
  }, [lastInboundAt, status]);

  if (!lastInboundAt || status === "RESOLVED" || status === "WAITING_ORDER") {
    return null;
  }

  // Cores dinâmicas para o SLA level
  const colors = {
    GREEN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    YELLOW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 font-semibold",
    RED: "bg-red-500 text-white dark:bg-red-600 border border-red-600 dark:border-red-500 font-bold shadow-sm animate-pulse",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${colors[level]} transition-colors`}
      title="Tempo desde a última mensagem do cliente"
    >
      espera {timeAgo}
    </span>
  );
};
