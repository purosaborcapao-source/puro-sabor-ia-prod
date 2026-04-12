import React, { useState } from 'react';
import Head from 'next/head';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CategoryTabs } from '../../components/catalog/CategoryTabs';
import { ProductCard } from '../../components/catalog/ProductCard';
import { ProductModal } from '../../components/catalog/ProductModal';
import { CartDrawer } from '../../components/catalog/CartDrawer';
import { CheckoutForm, CheckoutData } from '../../components/catalog/CheckoutForm';
import { SuccessScreen } from '../../components/catalog/SuccessScreen';
import { useProducts, Product } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';
import { supabasePublic } from '../../lib/supabase-public';

type AppState = 'CATALOG' | 'CHECKOUT' | 'SUCCESS';

export default function PedidoPage() {
  const { products, productsByCategory, loading, error } = useProducts();
  const { items, addItem, removeItem, clearCart, total, sinalValor } = useCart();
  
  const [state, setState] = useState<AppState>('CATALOG');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ number: string; name: string } | null>(null);

  // Define categoria inicial após carregar
  React.useEffect(() => {
    if (Object.keys(productsByCategory).length > 0 && !activeCategory) {
      setActiveCategory(Object.keys(productsByCategory)[0]);
    }
  }, [productsByCategory]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleConfirmProduct = (quantity: number, customizations: any) => {
    if (selectedProduct) {
      addItem(selectedProduct, quantity, customizations);
    }
  };

  const handleCheckoutSubmit = async (formData: CheckoutData) => {
    try {
      setIsSubmitting(true);

      // 1. Upsert Customer (vincular pelo telefone)
      const { data: customer, error: customerErr } = await supabasePublic
        .from('customers')
        .upsert({ 
          name: formData.name, 
          phone: formData.phone 
        }, { onConflict: 'phone' })
        .select()
        .single();

      if (customerErr) throw customerErr;

      // 2. Create Order
      // Gerar um número de pedido amigável (timestamp reduzido + random)
      const orderNumber = `PS-${Math.floor(Date.now() / 1000).toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      const { data: order, error: orderErr } = await supabasePublic
        .from('orders')
        .insert({
          number: orderNumber,
          customer_id: customer.id,
          delivery_date: `${formData.date}T${formData.time}:00`,
          delivery_type: 'RETIRADA',
          status: 'PENDENTE',
          payment_status: 'SINAL_PENDENTE',
          total: total,
          sinal_valor: sinalValor,
          notes: `Pedido via catálogo online por ${formData.name}.`
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 3. Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        customizations: item.customizations
      }));

      const { error: itemsErr } = await supabasePublic
        .from('order_items')
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      // Sucesso!
      setOrderDetails({ number: orderNumber, name: formData.name });
      clearCart();
      setState('SUCCESS');
    } catch (err: any) {
      console.error('Erro ao finalizar pedido:', err);
      alert('Ops! Ocorreu um erro ao enviar seu pedido. Por favor, tente novamente ou nos chame no WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'SUCCESS' && orderDetails) {
    return <SuccessScreen orderNumber={orderDetails.number} customerName={orderDetails.name} />;
  }

  if (state === 'CHECKOUT') {
    return (
      <CheckoutForm 
        total={total} 
        sinalValor={sinalValor} 
        onBack={() => setState('CATALOG')} 
        onSubmit={handleCheckoutSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <Head>
        <title>Puro Sabor | Catálogo de Pedidos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <CatalogHeader 
        cartCount={items.length} 
        onOpenCart={() => setIsCartOpen(true)} 
      />

      <main className="max-w-xl mx-auto px-6 py-8 space-y-8">
        {/* Intro */}
        <section className="space-y-2">
          <h2 className="text-3xl font-black text-[var(--primary-dark)] leading-tight uppercase tracking-tight">
            Nossas <span className="text-[var(--primary-paprica)] italic">Delícias</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium">Selecione os itens e personalize como desejar.</p>
        </section>

        {/* Categories */}
        {loading ? (
          <div className="animate-pulse flex gap-4 overflow-hidden">
            {[1,2,3].map(i => <div key={i} className="h-10 w-24 bg-orange-100 rounded-full shrink-0" />)}
          </div>
        ) : (
          <CategoryTabs 
            categories={Object.keys(productsByCategory)} 
            activeCategory={activeCategory} 
            onSelectCategory={setActiveCategory} 
          />
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-orange-50 rounded-2xl animate-pulse" />)
          ) : (
            productsByCategory[activeCategory]?.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onSelect={handleSelectProduct} 
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Cart Button (Desktop or Mobile Overlay) */}
      {items.length > 0 && state === 'CATALOG' && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-40 animate-in slide-in-from-bottom-8">
           <button 
             onClick={() => setIsCartOpen(true)}
             className="max-w-xl mx-auto w-full py-4 bg-[var(--primary-paprica)] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center justify-center gap-4 group"
           >
              Ver Carrinho ({items.length}) • {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
           </button>
        </div>
      )}

      {/* Modals */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          isOpen={!!selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onConfirm={handleConfirmProduct}
        />
      )}

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        onRemoveItem={removeItem}
        total={total}
        sinalValor={sinalValor}
        onCheckout={() => {
          setIsCartOpen(false);
          setState('CHECKOUT');
        }}
      />
    </div>
  );
}
