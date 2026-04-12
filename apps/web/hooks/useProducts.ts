import { useEffect, useState } from 'react';
import { supabasePublic } from '../lib/supabase-public';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sale_unit: 'UNIDADE' | 'CENTO' | 'KG';
  min_qty: number;
  qty_step: number;
  has_decoration_option: boolean;
  custom_options: any;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error: err } = await supabasePublic
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (err) throw err;
        setProducts((data as any) || []);
      } catch (e: any) {
        console.error('Erro ao buscar produtos:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return { products, productsByCategory, loading, error };
}
