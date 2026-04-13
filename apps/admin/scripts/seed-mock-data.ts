import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// PROTEÇÃO: Impedir execução fora do ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'development') {
  console.error('BLOQUEADO: Este script só pode ser executado em ambiente de desenvolvimento.')
  console.error('Defina NODE_ENV=development antes de executar.')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedData() {
  console.log('🌱 Iniciando semeação de dados mock...')

  // 1. Clientes
  const { data: customers, error: custErr } = await supabase.from('customers').upsert([
    { id: 'c1111111-1111-1111-1111-111111111111', name: 'João Silva', phone: '5511999999999' },
    { id: 'c2222222-2222-2222-2222-222222222222', name: 'Maria Oliveira', phone: '5511888888888' },
    { id: 'c3333333-3333-3333-3333-333333333333', name: 'Carlos Santos', phone: '5511777777777' }
  ]).select()

  if (custErr) throw custErr

  console.log('✅ Clientes criados')

  // 2. Mensagens
  const { error: msgErr } = await supabase.from('messages').insert([
    {
      customer_id: customers[0].id,
      phone: customers[0].phone,
      direction: 'INBOUND',
      content: 'Oi, gostaria de encomendar um bolo de chocolate para sábado às 15h.',
      payload: {
        intent: 'NEW_ORDER',
        extracted_data: {
          items: [{ product: 'Bolo de Chocolate', quantity: 1, price: 85 }],
          delivery_date: '2026-04-12',
          total: 85
        }
      }
    },
    {
      customer_id: customers[0].id,
      phone: customers[0].phone,
      direction: 'OUTBOUND',
      content: 'Olá João! Com certeza, temos disponibilidade. O valor fica R$ 85,00. Posso confirmar?',
    },
    {
      customer_id: customers[1].id,
      phone: customers[1].phone,
      direction: 'INBOUND',
      content: 'Preciso de 50 coxinhas e 20 brigadeiros para hoje!',
      payload: {
        intent: 'NEW_ORDER',
        extracted_data: {
          items: [
            { product: 'Coxinha', quantity: 50, price: 100 },
            { product: 'Brigadeiro', quantity: 20, price: 40 }
          ],
          delivery_date: '2026-04-10',
          total: 140
        }
      }
    }
  ])

  if (msgErr) throw msgErr
  console.log('✅ Mensagens criadas')

  // 3. Pedidos
  const { error: orderErr } = await supabase.from('orders').insert([
    {
      number: '1001',
      customer_id: customers[0].id,
      total: 85,
      delivery_date: '2026-04-12',
      status: 'PENDENTE',
      payment_status: 'SINAL_PENDENTE',
      sinal_valor: 40
    },
    {
      number: '1002',
      customer_id: customers[1].id,
      total: 140,
      delivery_date: '2026-04-10',
      status: 'CONFIRMADO',
      payment_status: 'SINAL_PAGO',
      sinal_valor: 70,
      sinal_confirmado: true
    },
    {
      number: '1003',
      customer_id: customers[2].id,
      total: 200,
      delivery_date: '2026-04-15',
      status: 'PENDENTE',
      payment_status: 'SINAL_PENDENTE',
      sinal_valor: 0 // Negociação pura
    }
  ])

  if (orderErr) throw orderErr
  console.log('✅ Pedidos criados')

  console.log('✨ Dados mock inseridos com sucesso!')
}

seedData().catch(console.error)
