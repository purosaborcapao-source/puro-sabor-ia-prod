import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Product } from '../../hooks/useProducts';
import { QuantitySelector } from '../ui/QuantitySelector';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, customizations: any) => void;
}

export function ProductModal({ product, isOpen, onClose, onConfirm }: ProductModalProps) {
  const [quantity, setQuantity] = useState(product.min_qty);
  const [flavor, setFlavor] = useState('');
  const [decoration, setDecoration] = useState<'PADRAO' | 'PERSONALIZADA'>('PADRAO');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setQuantity(product.min_qty);
    setFlavor('');
    setDecoration('PADRAO');
    setNotes('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  const currentPrice = 
    product.sale_unit === 'CENTO' ? (product.price * (quantity / 100)) :
    product.sale_unit === 'KG' ? (product.price * (quantity / 1000)) :
    (product.price * quantity);

  const handleConfirm = () => {
    onConfirm(quantity, {
      flavor,
      decoration,
      notes
    });
    onClose();
  };

  const flavors = product.custom_options?.find((opt: any) => opt.label === 'Recheio' || opt.label === 'Sabor')?.options || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500">
        {/* Header */}
        <div className="p-6 border-b border-orange-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--primary-dark)] uppercase tracking-tight">
              {product.name}
            </h2>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">
              Configurar Pedido
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quantity Section */}
          <section>
            <h3 className="text-xs font-black text-[var(--primary-dark)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-[2px] bg-[var(--primary-paprica)]" /> Passo 1: Quanto deseja?
            </h3>
            <QuantitySelector 
              value={quantity} 
              onChange={setQuantity}
              unit={product.sale_unit}
              minQty={product.min_qty}
              step={product.qty_step}
            />
          </section>

          {/* Sabor Section (if applicable) */}
          {flavors.length > 0 && (
            <section>
              <h3 className="text-xs font-black text-[var(--primary-dark)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-[var(--primary-paprica)]" /> Passo 2: Escolha o Sabor
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {flavors.map((f: string) => (
                  <button
                    key={f}
                    onClick={() => setFlavor(f)}
                    className={`px-4 py-2 text-left rounded-xl text-xs font-bold border transition-all ${
                      flavor === f
                        ? 'bg-orange-50 border-[var(--primary-paprica)] text-[var(--primary-paprica)]'
                        : 'bg-white border-orange-100 text-gray-500'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Decoration Section (if applicable) */}
          {product.has_decoration_option && (
            <section>
              <h3 className="text-xs font-black text-[var(--primary-dark)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-[var(--primary-paprica)]" /> Decoração da Torta
              </h3>
              <div className="flex gap-2">
                {(['PADRAO', 'PERSONALIZADA'] as const).map((dec) => (
                  <button
                    key={dec}
                    onClick={() => setDecoration(dec)}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-all text-center ${
                      decoration === dec
                        ? 'bg-orange-50 border-[var(--primary-paprica)] text-[var(--primary-paprica)]'
                        : 'bg-white border-orange-100 text-gray-500'
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase tracking-widest mb-0.5">{dec}</span>
                    <span className="text-[9px] opacity-60">
                      {dec === 'PADRAO' ? 'Conforme catálogo' : 'Solicitar tema'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-xs font-black text-[var(--primary-dark)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-[2px] bg-[var(--primary-paprica)]" /> Observações Extras
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Nome no topo, cores específicas, sem glúten..."
              className="w-full p-4 bg-gray-50 rounded-xl border border-orange-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 min-h-[100px]"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-orange-50 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total Parcial</span>
            <span className="text-xl font-black text-[var(--primary-paprica)]">
              {currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <button 
            disabled={flavors.length > 0 && !flavor}
            onClick={handleConfirm}
            className="px-8 py-3 bg-[var(--primary-paprica)] text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-orange-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            Adicionar <Check className="w-3 h-3 inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
