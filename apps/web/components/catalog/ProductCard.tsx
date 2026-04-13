import React from 'react';
import { Product } from '../../hooks/useProducts';
import { Plus, Info } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, quantity, onSelect }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const unitLabel = {
    'UNIDADE': 'un',
    'KG': 'kg'
  }[product.sale_unit];

  return (
    <div className="card-premium flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Imagem Placeholder ou Real */}
      <div className="relative aspect-square bg-orange-50 overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-orange-200">
            <Info className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          <div className="bg-[var(--primary-dark)] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
            {product.category}
          </div>
          {quantity > 0 && (
            <div className="bg-[var(--primary-paprica)] text-white text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-lg shadow-md border-2 border-white animate-in zoom-in duration-300">
              {quantity}x
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-black text-[var(--primary-dark)] mb-1 leading-tight uppercase tracking-tight">
          {product.name}
        </h3>
        <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {product.description || 'Produto artesanal feito com ingredientes selecionados.'}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-sm font-black text-[var(--primary-paprica)]">
              {formatPrice(product.price)}
            </span>
            <span className="text-[9px] uppercase font-bold text-gray-400 ml-1">
              / {unitLabel}
            </span>
          </div>

          <button 
            onClick={() => onSelect(product)}
            className="p-2 bg-orange-50 border border-orange-100 rounded-lg text-[var(--primary-paprica)] hover:bg-[var(--primary-paprica)] hover:text-white transition-all shadow-sm active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
