import { useState, useCallback, useMemo } from 'react';
import { Product } from './useProducts';

export interface CartItem {
  id: string; // Unique ID for the item in the cart (considering variations)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sale_unit: 'UNIDADE' | 'KG';
  customizations?: {
    flavor?: string;
    decoration?: 'PADRAO' | 'PERSONALIZADA';
    notes?: string;
  };
}

export function useCart(sinalPct = 0.3) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number, customizations?: CartItem['customizations']) => {
    // Para simplificar, vamos tratar cada adição como um novo item se houver customizações.
    // Assim o cliente pode ter duas tortas de sabores diferentes no carrinho.
    const cartItemId = `${product.id}-${Date.now()}`;
    
    const newItem: CartItem = {
      id: cartItemId,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      sale_unit: product.sale_unit,
      customizations
    };

    setItems(prev => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(item => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Cálculo do total considerando a unidade de venda
  // Preço por CENTO: (price * quantity / 100)
  // Preço por KG: (price * quantity / 1000) - assumindo que quantity está em gramas no hooks/BD
  // Preço por UNIDADE: (price * quantity)
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.sale_unit === 'KG') {
        // Se quantity for em gramas (ex: 500, 1000)
        return sum + (item.price * (item.quantity / 1000));
      }
      return sum + (item.price * item.quantity);
    }, 0);
  }, [items]);

  // Regra de negócio: sinal configurável (%), arredondado para múltiplos de R$50
  // (preferência por arredondar para baixo; arredonda para cima só se o resto >= R$40)
  const sinalValor = useMemo(() => {
    if (total === 0) return 0;
    const target = total * sinalPct;
    const remainder = target % 50;
    const rounded = remainder < 40 ? target - remainder : target - remainder + 50;
    return rounded === 0 ? 50 : rounded;
  }, [total, sinalPct]);

  return {
    items,
    addItem,
    removeItem,
    clearCart,
    total,
    sinalValor,
    itemCount: items.length
  };
}
