import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { DeliveryDateSelector } from '@/components/Orders/DeliveryDateSelector';
import { useDeliverySlots } from '@/hooks/useDeliverySlots';
import { supabase } from '@atendimento-ia/supabase';
import { ArrowLeftIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface FormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_date: string;
  delivery_type: 'RETIRADA' | 'ENTREGA';
  address: string;
  total: number;
  sinal_valor: number;
  notes: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { validateDeliveryDate, incrementSlotCount } = useDeliverySlots();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  // true quando o pedido foi iniciado a partir um lead/cliente específico
  const [isLinkedToLead, setIsLinkedToLead] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    delivery_date: '',
    delivery_type: 'ENTREGA',
    address: '',
    total: 0,
    sinal_valor: 0,
    notes: '',
    items: [],
  });

  // Load customers and products
  useEffect(() => {
    if (!authLoading && !profile) {
      // router.push('/auth/login'); // Removido por enquanto para facilitar testes
      // return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Load customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, name, phone')
          .order('name');

        if (customersError) {
          console.error('Erro carregando customers:', customersError);
        } else {
          setCustomers(customersData || []);
        }

        // Load all products (remove is_active filter temporarily)
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, category')
          .order('name');

        console.log('📦 Products loaded:', productsData?.length, productsError);

        if (productsError) {
          console.error('Erro carregando produtos:', productsError);
        } else {
          setProducts(productsData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setErrors({ load: 'Erro ao carregar dados' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, profile, router.isReady]); // router is tracked to catch query

  // Se vier customer_id pela URL, vincula automaticamente ao lead
  useEffect(() => {
    if (!router.isReady) return;

    const cid = router.query.customer_id as string;
    const cname = router.query.name as string || '';
    const cphone = router.query.phone as string || '';

    if (!cid) return;

    // Marca que este pedido está vinculado a um lead específico
    setIsLinkedToLead(true);

    // Tenta encontrar na lista já carregada (customer pode ainda não ter carregado)
    const found = customers.find(c => c.id === cid);
    if (found) {
      setFormData(prev => ({
        ...prev,
        customer_id: found.id,
        customer_name: found.name,
        customer_phone: found.phone
      }));
    } else if (cname) {
      // Fallback imediato com os dados da query string
      setFormData(prev => ({
        ...prev,
        customer_id: cid,
        customer_name: cname,
        customer_phone: cphone
      }));
    }
  }, [router.isReady, router.query, customers]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find((c) => c.id === customerId);

    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
      }));
      setErrors((prev) => ({ ...prev, customer_id: '' }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customer_id: '',
        customer_name: '',
        customer_phone: '',
      }));
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Preencha nome e telefone");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomer.name,
          phone: newCustomer.phone,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({
        ...prev,
        customer_id: data.id,
        customer_name: data.name,
        customer_phone: data.phone,
      }));
      setShowNewCustomerModal(false);
      setNewCustomer({ name: '', phone: '' });
    } catch (err) {
      console.error("Erro ao criar cliente:", err);
      alert("Erro ao criar cliente. Verifique se o telefone já existe.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliveryDateChange = (date: string) => {
    setFormData((prev) => ({
      ...prev,
      delivery_date: date,
    }));
    setErrors((prev) => ({ ...prev, delivery_date: '' }));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setFormData((prev) => {
      const existing = prev.items.find((i) => i.product_id === productId);
      let newItems = [...prev.items];
      
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          newItems = newItems.filter((i) => i.product_id !== productId);
        } else {
          newItems = newItems.map((i) =>
            i.product_id === productId ? { ...i, quantity: newQty } : i
          );
        }
      } else if (delta > 0) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          newItems.push({
            product_id: productId,
            quantity: delta,
            unit_price: product.price,
          });
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const setExactQuantity = (productId: string, quantity: number) => {
    setFormData((prev) => {
      let newItems = [...prev.items];
      if (quantity <= 0) {
        newItems = newItems.filter((i) => i.product_id !== productId);
      } else {
        const existing = newItems.find((i) => i.product_id === productId);
        if (existing) {
          newItems = newItems.map((i) =>
            i.product_id === productId ? { ...i, quantity } : i
          );
        } else {
          const product = products.find((p) => p.id === productId);
          if (product) {
            newItems.push({
              product_id: productId,
              quantity,
              unit_price: product.price,
            });
          }
        }
      }
      return { ...prev, items: newItems };
    });
  };

  useEffect(() => {
    updateTotal();
  }, [formData.items]);

  const updateTotal = () => {
    const total = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    setFormData((prev) => ({
      ...prev,
      total,
      sinal_valor: Math.round(total * 0.3), // 30% default
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) newErrors.customer_id = 'Selecione um cliente';
    if (!formData.delivery_date)
      newErrors.delivery_date = 'Selecione uma data';
    if (formData.items.length === 0) newErrors.items = 'Adicione pelo menos um produto';
    if (formData.total === 0) newErrors.total = 'Total deve ser maior que 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Validate delivery date
      const validation = await validateDeliveryDate(formData.delivery_date);
      if (!validation.isAvailable) {
        setErrors({ delivery_date: validation.message });
        return;
      }

      // Generate order number
      // Generate order number (Internal ID, the public one is order_number from sequence)
      const orderNumber = `MANUAL-${Date.now().toString().slice(-6)}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          number: orderNumber,
          customer_id: formData.customer_id,
          delivery_date: formData.delivery_date,
          delivery_type: formData.delivery_type,
          address: formData.address || null,
          total: formData.total,
          sinal_valor: formData.sinal_valor,
          status: 'PENDENTE',
          payment_status: 'SINAL_PENDENTE',
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = formData.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Increment slot count
      await incrementSlotCount(formData.delivery_date);

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/orders/${order.id}`);
      }, 2000);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setErrors({ submit: 'Erro ao criar pedido' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <Head>
        <title>Novo Pedido - Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/orders"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Criar e agendar novo pedido
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700 font-semibold">
                Pedido criado com sucesso! Redirecionando...
              </p>
            </div>
          )}

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-semibold">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  👤 Cliente
                </h2>
                {!isLinkedToLead && (
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 underline"
                  >
                    + Novo Cliente
                  </button>
                )}
              </div>

              {isLinkedToLead ? (
                /* Quando vinculado a um lead: exibe o cliente fixo, sem seleção */
                <div className="flex items-center gap-4 p-4 bg-green-50/50 border border-green-200 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-green-900">{formData.customer_name}</p>
                    {formData.customer_phone && (
                      <p className="text-sm font-medium text-green-700">{formData.customer_phone}</p>
                    )}
                  </div>
                  <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold uppercase tracking-wider">
                    Vinculado
                  </span>
                </div>
              ) : (
                /* Seleção manual de cliente */
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar clientes por nome ou telefone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center mb-2 pointer-events-none">
                      <span className="text-gray-400">🔍</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Cliente
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={handleCustomerChange}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${
                        errors.customer_id
                          ? 'border-red-300'
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Selecione um cliente</option>
                      {customers
                        .filter(c => 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                          c.phone.includes(customerSearch)
                        )
                        .map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} ({customer.phone})
                          </option>
                        ))}
                    </select>
                    {errors.customer_id && (
                      <p className="text-red-600 text-sm mt-1">{errors.customer_id}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Agendamento */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
                📅 Agendamento
              </h2>

              <DeliveryDateSelector
                value={formData.delivery_date}
                onChange={handleDeliveryDateChange}
                error={errors.delivery_date}
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Entrega
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="ENTREGA"
                      checked={formData.delivery_type === 'ENTREGA'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          delivery_type: e.target.value as 'ENTREGA' | 'RETIRADA',
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-700">Entrega</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="RETIRADA"
                      checked={formData.delivery_type === 'RETIRADA'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          delivery_type: e.target.value as 'ENTREGA' | 'RETIRADA',
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-gray-700">Retirada</span>
                  </label>
                </div>
              </div>

              {formData.delivery_type === 'ENTREGA' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Ex: Av. Central, 100 - Apto 302"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
              )}
            </div>

            {/* Produtos */}
            {/* Produtos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  🧁 Produtos
                </h2>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {formData.items.length} Selecionados
                </div>
              </div>

              {errors.items && (
                <div className="p-3 mb-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.items}
                </div>
              )}

              {/* Campo de busca requintado */}
              <div className="relative mb-6 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar sabor ou nome da cesta..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-blue-500 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                />
              </div>

              {/* Lista Principal de Produtos com Controle Integrado */}
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                <div className="max-h-[350px] overflow-y-auto">
                  {products
                    .filter(p =>
                      p.name.toLowerCase().includes(productSearch.toLowerCase())
                    )
                    .map((product) => {
                      const item = formData.items.find(i => i.product_id === product.id);
                      const qty = item ? item.quantity : 0;
                      
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                            qty > 0 ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold truncate ${qty > 0 ? 'text-blue-900' : 'text-gray-900'}`}>
                              {product.name}
                            </h3>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-end shrink-0 w-32">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(product.id, 1)}
                                className="px-4 py-1.5 bg-gray-100 hover:bg-black hover:text-white text-gray-800 text-xs font-bold uppercase tracking-wider rounded-full transition-all"
                              >
                                Adicionar
                              </button>
                            ) : (
                              <div className="flex items-center bg-white shadow-sm border border-gray-200 rounded-full h-8 overflow-hidden select-none">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, -1)}
                                  className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-lg leading-none focus:outline-none"
                                >
                                  -
                                </button>
                                <input 
                                  type="number"
                                  min="0"
                                  className="w-10 h-full text-center text-sm font-black text-blue-700 bg-transparent focus:outline-none p-0 border-none hide-arrows"
                                  value={qty}
                                  onChange={(e) => setExactQuantity(product.id, parseInt(e.target.value) || 0)}
                                  style={{ MozAppearance: 'textfield' }} // Para Firefox, já que Chrome a classe corta
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, 1)}
                                  className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors font-bold text-lg leading-none focus:outline-none"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <style dangerouslySetInnerHTML={{__html: `
                .hide-arrows::-webkit-outer-spin-button,
                .hide-arrows::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
              `}} />
            </div>

            {/* Valores */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
                💰 Valores
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    R$ {formData.total.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Sinal
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-bold">R$</span>
                    </div>
                    <input
                      type="number"
                      value={formData.sinal_valor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sinal_valor: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {((formData.sinal_valor / formData.total) * 100 || 0).toFixed(0)}% do
                    total
                  </p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                📝 Observações do Pedido
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Anotações adicionais..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-black/20"
              >
                {submitting ? 'Criando...' : 'Finalizar Pedido'}
              </button>
              <Link
                href="/dashboard/orders"
                className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 rounded-xl transition"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </main>

        {/* Modal Novo Cliente */}
        {showNewCustomerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cadastrar Novo Cliente</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Maria Oliveira"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 5511999999999"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateCustomer}
                    disabled={submitting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  >
                    Salvar Cliente
                  </button>
                  <button
                    onClick={() => setShowNewCustomerModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
