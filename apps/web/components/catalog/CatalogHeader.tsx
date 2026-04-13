import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface CatalogHeaderProps {
  cartCount: number;
  totalValue: number;
  onOpenCart: () => void;
}

export function CatalogHeader({ cartCount, totalValue, onOpenCart }: CatalogHeaderProps) {
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <header className="glass-header">
      <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary-dark)] tracking-tight">
            Puro <span className="text-[var(--primary-paprica)] italic">Sabor</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-900/40">
            Confeitaria Artesanal
          </p>
        </div>

        <button 
          onClick={onOpenCart}
          className="flex items-center gap-3 pl-4 pr-3 py-2 bg-white rounded-full shadow-sm border border-orange-100 hover:scale-105 transition-all active:scale-95"
        >
          {totalValue > 0 && (
            <span className="text-xs font-black text-[var(--primary-dark)]">
              {formatPrice(totalValue)}
            </span>
          )}
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-[var(--primary-paprica)]" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--primary-paprica)] text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
