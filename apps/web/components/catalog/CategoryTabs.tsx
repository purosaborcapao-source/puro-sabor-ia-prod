import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelectCategory }: CategoryTabsProps) {
  // Mapeamento de nomes amigáveis
  const formatCategoryName = (cat: string) => {
    const maps: Record<string, string> = {
      'tortas': '🎂 tortas',
      'tortas frias': '❄️ tortas frias',
      'docinhos': '🧁 docinhos',
      'salgadinhos': '🥐 salgadinhos'
    };
    return maps[cat.toLowerCase()] || cat.toLowerCase();
  };

  return (
    <div className="overflow-x-auto hide-scrollbar -mx-6 px-6 py-2">
      <div className="flex gap-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeCategory === category
                ? 'bg-[var(--primary-paprica)] text-white border-[var(--primary-paprica)] shadow-lg shadow-orange-900/10 scale-105'
                : 'bg-white text-gray-400 border-orange-100 hover:border-orange-200'
            }`}
          >
            {formatCategoryName(category)}
          </button>
        ))}
      </div>
    </div>
  );
}
