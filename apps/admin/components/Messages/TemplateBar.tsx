import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface QuickTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string;
}

interface TemplateBarProps {
  onSelectTemplate: (content: string) => void;
  quickSearchText?: string;
}

export const TemplateBar: React.FC<TemplateBarProps> = ({
  onSelectTemplate,
  quickSearchText = "",
}) => {
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from("quick_templates")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!error && data) {
          setTemplates(data as QuickTemplate[]);
        }
      } catch (err) {
        console.error("Erro ao carregar templates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  // Filtra templates se a pessoa estiver digitando algo após a "/" 
  // Exemplo: digitou "/car" -> mostra Cardápio
  const filteredTemplates = quickSearchText.startsWith("/")
    ? templates.filter(
        (t) =>
          t.shortcut.toLowerCase().includes(quickSearchText.toLowerCase()) ||
          t.title.toLowerCase().includes(quickSearchText.slice(1).toLowerCase())
      )
    : templates;

  if (loading || templates.length === 0) return null;

  return (
    <div className="w-full mb-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 font-medium mb-2 pl-1">
        ⚡ Respostas Rápidas (Atalho: <span className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">/</span>)
      </div>
      
      {/* Scroll horizontal de chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={(e) => {
              e.preventDefault();
              onSelectTemplate(template.content);
            }}
            className="flex flex-col items-start min-w-max px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-gray-200 dark:border-gray-600 rounded-md transition-colors group text-left"
          >
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
              {template.title}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              {template.shortcut}
            </span>
          </button>
        ))}
        {filteredTemplates.length === 0 && (
          <span className="text-xs text-gray-500 italic px-2">Nenhum template encontrado para "{quickSearchText}"</span>
        )}
      </div>
    </div>
  );
};
