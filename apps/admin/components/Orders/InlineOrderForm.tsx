import React, { useState, useEffect } from "react";
import { supabase } from "@atendimento-ia/supabase";
import { AlertCircle, CheckCircle, X, Minus, Plus } from "lucide-react";
import { DeliveryDateSelector } from "./DeliveryDateSelector";

interface InlineOrderFormProps {
  customerId: string;
  customerName: string;
  customerPhone: string;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const InlineOrderForm: React.FC<InlineOrderFormProps> = ({
  customerId,
  customerName,
  customerPhone,
  onSuccess,
  onCancel,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryType, setDeliveryType] = useState<"ENTREGA" | "RETIRADA">("ENTREGA");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sinalValor, setSinalValor] = useState(0);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, category")
      .order("name")
      .then(({ data }) => {
        setProducts(data || []);
        setLoadingProducts(false);
      });
  }, []);

  useEffect(() => {
    const t = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    setTotal(t);
    setSinalValor(Math.round(t * 0.3));
  }, [items]);

  const handleQty = (productId: string, delta: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter((i) => i.product_id !== productId);
        return prev.map((i) =>
          i.product_id === productId ? { ...i, quantity: newQty } : i
        );
      } else if (delta > 0) {
        const product = products.find((p) => p.id === productId);
        if (!product) return prev;
        return [
          ...prev,
          { product_id: productId, quantity: delta, unit_price: product.price, notes: "" },
        ];
      }
      return prev;
    });
  };

  const setExactQty = (productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.product_id !== productId);
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) return prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i));
      const product = products.find((p) => p.id === productId);
      if (!product) return prev;
      return [...prev, { product_id: productId, quantity, unit_price: product.price, notes: "" }];
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!deliveryDate) e.delivery_date = "Selecione uma data";
    if (items.length === 0) e.items = "Adicione pelo menos um produto";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const deliveryDateISO = new Date(deliveryDate).toISOString();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          number: `MANUAL-${Date.now().toString().slice(-6)}`,
          customer_id: customerId,
          delivery_date: deliveryDateISO,
          delivery_type: deliveryType,
          address: address || null,
          total,
          sinal_valor: sinalValor,
          status: "PENDENTE",
          payment_status: "SINAL_PENDENTE",
          notes: notes || null,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          notes: i.notes,
        }))
      );
      if (itemsError) throw itemsError;

      setSuccess(true);
      setTimeout(() => onSuccess(order.id), 1200);
    } catch (err: any) {
      console.error("Erro ao criar pedido:", err);
      setErrors({ submit: "Erro ao criar pedido. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-green-700 dark:text-green-400 font-semibold">Pedido criado com sucesso!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Novo Pedido</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{customerName}</p>
          {customerPhone && (
            <p className="text-xs text-gray-500">{customerPhone}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {errors.submit && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errors.submit}
          </div>
        )}

        {/* Agendamento */}
        <div>
          <DeliveryDateSelector
            value={deliveryDate}
            onChange={setDeliveryDate}
            error={errors.delivery_date}
          />
        </div>

        {/* Tipo de entrega */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tipo de Entrega
          </label>
          <div className="flex gap-3">
            {(["ENTREGA", "RETIRADA"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  value={t}
                  checked={deliveryType === t}
                  onChange={() => setDeliveryType(t)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t === "ENTREGA" ? "Entrega" : "Retirada"}
                </span>
              </label>
            ))}
          </div>
          {deliveryType === "ENTREGA" && (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço de entrega..."
              className="mt-2 w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Produtos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Produtos
            </label>
            {items.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">
                {items.length} selecionado{items.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {errors.items && (
            <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.items}
            </p>
          )}

          <input
            type="text"
            placeholder="Buscar produto..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-[280px] overflow-y-auto">
            {loadingProducts ? (
              <p className="text-sm text-gray-400 text-center py-6">Carregando...</p>
            ) : (
              products
                .filter((p) =>
                  p.name.toLowerCase().includes(productSearch.toLowerCase())
                )
                .map((product) => {
                  const item = items.find((i) => i.product_id === product.id);
                  const qty = item?.quantity ?? 0;
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                        qty > 0 ? "bg-blue-50/40 dark:bg-blue-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${qty > 0 ? "text-blue-900 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          R$ {product.price.toFixed(2)}
                        </p>
                        {qty > 0 && (
                          <input
                            type="text"
                            placeholder="Observação (ex: sem recheio)..."
                            value={item?.notes ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.product_id === product.id
                                    ? { ...i, notes: val }
                                    : i
                                )
                              );
                            }}
                            className="mt-1 w-full px-2 py-1 text-[10px] bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                      <div className="shrink-0">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleQty(product.id, 1)}
                            className="px-3 py-1 bg-gray-100 hover:bg-black hover:text-white dark:bg-gray-700 dark:hover:bg-white dark:hover:text-black text-gray-700 dark:text-gray-200 text-xs font-bold rounded-full transition-all"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 rounded-full h-7 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQty(product.id, -1)}
                              className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={(e) => setExactQty(product.id, parseInt(e.target.value) || 0)}
                              className="w-8 h-full text-center text-sm font-black text-blue-700 dark:text-blue-300 bg-transparent focus:outline-none p-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQty(product.id, 1)}
                              className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Valores */}
        {items.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">
                {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Sinal (R$)
              </label>
              <input
                type="number"
                value={sinalValor}
                onChange={(e) => setSinalValor(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {total > 0 ? ((sinalValor / total) * 100).toFixed(0) : 0}% do total
              </p>
            </div>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Observações do Pedido
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes adicionais..."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Footer - fixed at bottom */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="flex-1 py-2.5 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 text-white dark:text-black font-bold rounded-xl transition text-sm"
        >
          {submitting ? "Criando..." : "Finalizar Pedido"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
