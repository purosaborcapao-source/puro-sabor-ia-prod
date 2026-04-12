import React from 'react';
import { X, Trash2, ShoppingBag, MessageCircle } from 'lucide-react';
import { CartItem } from '../../hooks/useCart';

const WHATSAPP_NUMBER = '5551999056903';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (id: string) => void;
  total: number;
  onCheckout: () => void;
}

function buildWhatsAppMessage(items: CartItem[], total: number): string {
  const lines = items.map((item) => {
    const qty =
      item.sale_unit === 'KG'
        ? item.quantity < 1000
          ? `${item.quantity}g`
          : `${item.quantity / 1000}kg`
        : `${item.quantity}x`;
    const flavor = item.customizations?.flavor ? ` (${item.customizations.flavor})` : '';
    const notes = item.customizations?.notes ? ` - ${item.customizations.notes}` : '';
    return `• ${qty} ${item.name}${flavor}${notes}`;
  });

  const totalFormatted = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    `Olá! Gostaria de fazer um pedido:\n\n` +
    lines.join('\n') +
    `\n\nTotal: ${totalFormatted}\n\nAguardo confirmação! 🍰`
  );
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  total,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const message = buildWhatsAppMessage(items, total);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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
                    {item.sale_unit === 'KG'
                      ? item.quantity < 1000 ? `${item.quantity}g` : `${item.quantity / 1000}kg`
                      : `${item.quantity} unid`}{' '}
                    • {item.customizations?.flavor || 'Sabor não definido'}
                  </p>
                  {item.customizations?.decoration && (
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                      ✨ Decoração {item.customizations.decoration}
                    </p>
                  )}
                  {item.customizations?.notes && (
                    <p className="text-[10px] text-gray-400 italic font-medium leading-tight">
                      &quot;{item.customizations.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-orange-50">
                  <span className="text-xs font-black text-[var(--primary-paprica)]">
                    {(
                      item.sale_unit === 'KG'
                        ? item.price * item.quantity / 1000
                        : item.price * item.quantity
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
                <span>Total</span>
                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <button
              onClick={handleWhatsApp}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar Pedido pelo WhatsApp
            </button>

            <p className="text-[9px] text-center text-gray-400 leading-relaxed">
              Você será redirecionado ao WhatsApp com o resumo do pedido.<br />
              Nossa equipe confirmará os detalhes em seguida.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


