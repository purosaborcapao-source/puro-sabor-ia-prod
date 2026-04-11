import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@atendimento-ia/supabase/server'

type ResponseData = {
  success?: boolean
  data?: any
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser()

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (req.method === 'GET') {
    return handleGetOrders(req, res, user.id)
  } else if (req.method === 'POST') {
    return handleCreateOrder(req, res, user.id)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetOrders(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  _userId: string
) {
  try {
    const { status, payment_status, customer_id, limit = 50, offset = 0 } = req.query

    let query = supabaseServer
      .from('orders')
      .select(`
        id,
        number,
        order_number,
        customer_id,
        delivery_date,
        total,
        status,
        payment_status,
        sinal_valor,
        sinal_confirmado,
        conta_corrente,
        created_at,
        updated_at,
        customers:customer_id(id,name,phone)
      `)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (payment_status) {
      query = query.eq('payment_status', payment_status)
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    // Pagination
    const limitNum = Math.min(parseInt(String(limit)) || 50, 100)
    const offsetNum = parseInt(String(offset)) || 0

    const { data: orders, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: count
        }
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleCreateOrder(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string
) {
  try {
    const {
      customer_id,
      total,
      delivery_date,
      delivery_type,
      address,
      notes,
      items = [],
      sinal_valor = 0,
      conta_corrente = false
    } = req.body

    // Validate required fields
    if (!customer_id || !delivery_date) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, delivery_date'
      })
    }

    // Generate order number (YYYY-MM-DD-XXXX format)
    const now = new Date().toISOString().split('T')[0]
    const { count } = await supabaseServer
      .from('orders')
      .select('*', { count: 'exact' })
      .gte('created_at', `${now}T00:00:00`)

    const orderNumber = `${now}-${String((count || 0) + 1).padStart(4, '0')}`

    // Create order
    const { data: newOrder, error: orderError } = await supabaseServer
      .from('orders')
      .insert({
        number: orderNumber,
        customer_id,
        total: total || 0,
        delivery_date,
        delivery_type: delivery_type || 'RETIRADA',
        address: address || null,
        notes: notes || null,
        payment_status: conta_corrente ? 'CONTA_CORRENTE' : 'SINAL_PENDENTE',
        sinal_valor: sinal_valor || 0,
        conta_corrente,
        status: 'PENDENTE'
      })
      .select()
      .single()

    if (orderError) {
      return res.status(500).json({ error: `Failed to create order: ${orderError.message}` })
    }

    // Insert order items if provided
    if (items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        customizations: item.customizations || null
      }))

      const { error: itemsError } = await supabaseServer
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        return res.status(500).json({ error: `Failed to create order items: ${itemsError.message}` })
      }
    }

    // Log change
    await supabaseServer.from('order_changes').insert({
      order_id: newOrder.id,
      changed_by: userId,
      field: 'status' as any,
      old_value: null,
      new_value: 'PENDENTE',
      reason: 'Order created'
    })

    return res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Order created successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
