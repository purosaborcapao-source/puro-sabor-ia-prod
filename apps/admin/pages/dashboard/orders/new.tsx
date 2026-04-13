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

  // Se vier customer_id pela URL, inicializamos a busca
  useEffect(() => {
    if (router.isReady && router.query.customer_id && customers.length > 0) {
      const cid = router.query.customer_id as string;
      const cname = router.query.name as string || '';
      const cphone = router.query.phone as string || '';
      
      const found = customers.find(c => c.id === cid);
      if (found) {
        setFormData(prev => ({
          ...prev,
          customer_id: found.id,
          customer_name: found.name,
          customer_phone: found.phone
        }));
      } else if (cid && cname) {
        // Fallback: mesmo sem carregar a lista (ex: cliente recem criado e não refletiu)
        setFormData(prev => ({
          ...prev,
          customer_id: cid,
          customer_name: cname,
          customer_phone: cphone
        }));
      }
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

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = formData.items.find((i) => i.product_id === productId);

    if (existingItem) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            product_id: productId,
            quantity: 1,
            unit_price: product.price,
          },
        ],
      }));
    }

    updateTotal();
  };

  const handleRemoveProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.product_id !== productId),
    }));
    updateTotal();
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    }));
    updateTotal();
  };

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

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Cliente */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  👤 Cliente
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(true)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  + Novo Cliente
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar clientes por nome ou telefone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Cliente
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={handleCustomerChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.customer_id
                        ? 'border-red-300'
                        : 'border-gray-300'
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
            </div>

            {/* Agendamento */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                    placeholder="Rua, número, complemento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Produtos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🍰 Produtos
              </h2>

              {errors.items && (
                <p className="text-red-600 text-sm mb-4">{errors.items}</p>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar Produtos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product.id)}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        R$ {product.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              {formData.items.length > 0 && (
                <div className="space-y-3 border-t pt-6">
                  {formData.items.map((item) => {
                    const product = products.find((p) => p.id === item.product_id);
                    return (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {product?.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            R$ {item.unit_price.toFixed(2)} x {item.quantity} =
                            R$ {(item.unit_price * item.quantity).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.product_id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.product_id)}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Valores */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                  <input
                    type="number"
                    value={formData.sinal_valor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sinal_valor: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    {((formData.sinal_valor / formData.total) * 100 || 0).toFixed(0)}% do
                    total
                  </p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {submitting ? 'Criando...' : 'Criar Pedido'}
              </button>
              <Link
                href="/dashboard/orders"
                className="flex-1 text-center bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition"
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
