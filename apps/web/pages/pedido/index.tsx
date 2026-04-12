import React, { useState } from 'react';
import Head from 'next/head';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CategoryTabs } from '../../components/catalog/CategoryTabs';
import { ProductCard } from '../../components/catalog/ProductCard';
import { ProductModal } from '../../components/catalog/ProductModal';
import { CartDrawer } from '../../components/catalog/CartDrawer';
import { useProducts, Product } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';

export default function PedidoPage() {
  const { productsByCategory, loading } = useProducts();
  const { items, addItem, removeItem, total } = useCart();

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  return (
    <div className="min-h-screen pb-32">
      <Head>
        <title>Puro Sabor | Cardápio</title>
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
            {(productsByCategory[activeCategory] || []).map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
              />
            ))}
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
        onCheckout={() => {}}
      />
    </div>
  );
}
