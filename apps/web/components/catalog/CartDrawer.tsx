import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from '../../hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (id: string) => void;
  total: number;
  sinalValor: number;
  onCheckout: () => void;
}

export function CartDrawer({ 
  isOpen, 
  onClose, 
  items, 
  onRemoveItem, 
  total, 
  sinalValor, 
  onCheckout 
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[var(--bg-creme)] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="p-6 bg-white border-b border-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-50 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-[var(--primary-paprica)]" />
             </div>
             <h2 className="text-xl font-black text-[var(--primary-dark)] uppercase tracking-tight">Seu Pedido</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
               <ShoppingBag className="w-16 h-16 text-orange-200" />
               <p className="text-sm font-bold uppercase tracking-widest text-orange-900">Seu carrinho está vazio</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm relative group animate-in slide-in-from-right-2">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-[var(--primary-dark)] text-sm uppercase tracking-tight pr-8">
                    {item.name}
                  </h4>
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 mb-4">
                  <p className="text-[10px] uppercase font-black text-orange-900/40 tracking-wider">
                    {item.quantity < 1000 ? `${item.quantity}g` : `${item.quantity / 1000}kg`} • {item.customizations?.flavor || 'Sabor não definido'}
                  </p>
                  {item.customizations?.decoration && (
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                      ✨ Decoração {item.customizations.decoration}
                    </p>
                  )}
                  {item.customizations?.notes && (
                    <p className="text-[10px] text-gray-400 italic font-medium leading-tight">
                      "{item.customizations.notes}"
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-orange-50">
                   <span className="text-xs font-black text-[var(--primary-paprica)]">
                      {(
                        item.sale_unit === 'KG' ? (item.price * item.quantity / 1000) :
                        item.sale_unit === 'CENTO' ? (item.price * item.quantity / 100) :
                        (item.price * item.quantity)
                      ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                   </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 bg-white border-t border-orange-50 space-y-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
            <div className="space-y-2">
               <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
               </div>
               <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-0.5">Sinal de Reserva (30%)</span>
                    <span className="text-xl font-black text-emerald-600">
                      {sinalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <CheckBadge />
               </div>
            </div>

            <button 
              onClick={onCheckout}
              className="w-full py-4 bg-[var(--primary-paprica)] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Finalizar Pedido <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
      <div className="text-white text-[10px] font-black">30%</div>
    </div>
  );
}
