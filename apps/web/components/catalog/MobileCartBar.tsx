import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface MobileCartBarProps {
  itemCount: number;
  totalValue: number;
  onOpenCart: () => void;
}

export function MobileCartBar({ itemCount, totalValue, onOpenCart }: MobileCartBarProps) {
  if (itemCount === 0) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden animate-in slide-in-from-bottom-10 duration-500">
      <button
        onClick={onOpenCart}
        className="w-full bg-[var(--primary-dark)] text-white p-4 rounded-2xl shadow-2xl shadow-orange-900/40 flex items-center justify-between group active:scale-95 transition-all border border-white/10 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary-paprica)] p-2 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase font-bold text-orange-200/60 tracking-widest leading-none mb-1">
              Sua Sacola
            </p>
            <p className="text-sm font-black">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'} • {formatPrice(totalValue)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl group-hover:bg-white/20 transition-colors">
          <span className="text-[10px] font-black uppercase tracking-wider">Ver Sacola</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
