import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface CatalogHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
}

export function CatalogHeader({ cartCount, onOpenCart }: CatalogHeaderProps) {
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
          className="relative p-3 bg-white rounded-full shadow-sm border border-orange-100 hover:scale-105 transition-all"
        >
          <ShoppingBag className="w-5 h-5 text-[var(--primary-paprica)]" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary-paprica)] text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-300">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
