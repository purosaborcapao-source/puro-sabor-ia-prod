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

export default function PedidoPage() {
  const { productsByCategory, loading } = useProducts();

  const [sinalPct, setSinalPct] = useState(0.3);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { items, addItem, removeItem, total, sinalValor, clearCart } = useCart(sinalPct);

  // Carregar percentual do sinal a partir da tabela settings
  React.useEffect(() => {
    supabasePublic.from('settings').select('value').eq('key', 'sinal_pct').single()
      .then(({ data }) => {
        if (typeof data?.value === 'number') setSinalPct(data.value);
      });
  }, []);

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

  const generateOrderSummary = (data: CheckoutData): string => {
    // Formatar o resumo no padrão que o process-message espera via regex
    const itemsList = items
      .map(item => {
        // Quantidade com unidade (g ou x)
        const qty = item.sale_unit === 'KG'
          ? `${item.quantity}g`
          : `${item.quantity}x`;

        // Calcular valor total do item
        const itemTotal = item.quantity * item.price;
        const itemTotalFormatted = itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Customizações (sabor, decoração, observações)
        const customizations = item.customizations
          ? ` • ${[item.customizations.flavor, item.customizations.decoration, item.customizations.notes]
              .filter(Boolean)
              .join(' • ')}`
          : '';

        return `• ${qty} ${item.name} (R$ ${itemTotalFormatted})${customizations}`;
      })
      .join('\n');

    // Formatar o valor total no padrão pt-BR (com vírgula)
    const totalFormatted = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Calcular sinal (depósito sugerido)
    const sinalAmount = total * sinalPct;
    const sinalFormatted = sinalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Converter data de YYYY-MM-DD para DD/MM/YYYY
    const [year, month, day] = data.date.split('-');
    const dateFormatted = `${day}/${month}/${year}`;

    const summary = `📄 Resumo dos Itens:
${itemsList}
💰 Valor Total do Pedido: R$ ${totalFormatted}
🔸 Sinal Sugerido: R$ ${sinalFormatted} (para confirmar a data/produção)
📍 Tipo de Cesta: Retirada
📅 Data: ${dateFormatted}
🕐 Horário: ${data.time}`;

    return summary;
  };

  const submitOrderToDB = async (data: CheckoutData) => {
    // Validate date: must not be in the past
    const today = new Date().toISOString().split('T')[0];
    if (data.date < today) {
      alert('A data de retirada não pode ser no passado.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Gerar resumo do pedido
      const orderSummary = generateOrderSummary(data);

      // Redirecionar para WhatsApp com o resumo
      // O número é da Puro Sabor: 5551999056903
      const whatsappUrl = `https://wa.me/5551999056903?text=${encodeURIComponent(orderSummary)}`;

      // Limpar carrinho
      clearCart();

      // Redirecionar para WhatsApp
      window.location.href = whatsappUrl;

    } catch (error) {
      console.error("Erro ao gerar pedido: ", error);
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
        sinalValor={sinalValor}
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
