import React, { useState } from 'react';
import Head from 'next/head';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CategoryTabs } from '../../components/catalog/CategoryTabs';
import { ProductCard } from '../../components/catalog/ProductCard';
import { ProductModal } from '../../components/catalog/ProductModal';
import { CartDrawer } from '../../components/catalog/CartDrawer';
import { MobileCartBar } from '../../components/catalog/MobileCartBar';
import { useProducts, Product } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';
import { CheckoutForm, CheckoutData } from '../../components/catalog/CheckoutForm';
import { supabasePublic } from '../../lib/supabase-public';
import { useRouter } from 'next/router';

export default function PedidoPage() {
  const { productsByCategory, loading } = useProducts();
  const { items, addItem, removeItem, total, sinalValor, clearCart } = useCart();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define categoria inicial após carregar
  React.useEffect(() => {
    const categories = Object.keys(productsByCategory || {});
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [productsByCategory, activeCategory]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleConfirmProduct = (quantity: number, customizations: any) => {
    if (selectedProduct) {
      addItem(selectedProduct, quantity, customizations);
    }
  };

  const handleGoToCheckout = () => {
    if (items.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutMode(true);
    window.scrollTo(0, 0);
  };

  const submitOrderToDB = async (data: CheckoutData) => {
    setIsSubmitting(true);
    try {
      // 2. Criar Pedido (Order)
      // Ajuste o Date para bater com timestamp da entrega
      const [year, month, day] = data.date.split('-');
      const targetDate = new Date(`${year}-${month}-${day}T${data.time}:00`);

      const { data: orderParams, error: orderErr } = await supabasePublic
        .from('orders')
        .insert({
          total: total,
          sinal_valor: sinalValor,
          payment_status: 'SINAL_PENDENTE',
          delivery_date: targetDate.toISOString()
        })
        .select('id')
        .single();
        
      if (orderErr) throw orderErr;
      const orderId = orderParams.id;

      // 3. Criar Order Items
      const orderItemsToInsert = items.map(item => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        customizations: item.customizations || {}
      }));

      const { error: itemsErr } = await supabasePublic
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsErr) throw itemsErr;

      // 4. Limpar e rotear!
      clearCart();
      router.push(`/pedido/confirmacao/${orderId}`);

    } catch (error) {
      console.error("Erro ao salvar pedido: ", error);
      alert("Ocorreu um erro ao gerar seu pedido. Tente novamente ou chame no WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckoutMode) {
    return (
      <div className="min-h-screen pb-12 bg-gray-50">
        <Head>
          <title>Finalizar Pedido | Puro Sabor</title>
        </Head>
        <CheckoutForm
          total={total}
          sinalValor={sinalValor}
          isSubmitting={isSubmitting}
          onBack={() => setIsCheckoutMode(false)}
          onSubmit={submitOrderToDB}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <Head>
        <title>Puro Sabor | Cardápio</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <CatalogHeader
        cartCount={items.length}
        totalValue={total}
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
            {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-orange-100 rounded-full shrink-0" />)}
          </div>
        ) : (
          <CategoryTabs
            categories={Object.keys(productsByCategory || {})}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        )}

        {/* Products */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-orange-50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <section className="space-y-3">
            {(productsByCategory[activeCategory] || []).map((product: Product) => {
              const quantity = items
                .filter(item => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  onSelect={handleSelectProduct}
                />
              );
            })}
          </section>
        )}
      </main>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(qty, custom) => {
            handleConfirmProduct(qty, custom);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        onRemoveItem={removeItem}
        total={total}
        onCheckout={handleGoToCheckout}
      />

      {/* Fixed Mobile Bar */}
      <MobileCartBar
        itemCount={items.length}
        totalValue={total}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
}
