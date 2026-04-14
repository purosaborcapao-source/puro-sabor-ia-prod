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

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

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

    // Atomic creation: order + items in a single DB transaction via RPC
    const { data: result, error: rpcError } = await supabaseServer.rpc(
      'create_order_with_items',
      {
        p_customer_id:   customer_id,
        p_delivery_date: delivery_date,
        p_delivery_type: delivery_type || 'RETIRADA',
        p_address:       address || null,
        p_notes:         notes   || null,
        p_total:         total   || 0,
        p_sinal_valor:   sinal_valor || 0,
        p_conta_corrente: conta_corrente,
        p_items: items.map((item: any) => ({
          product_id:     item.product_id,
          quantity:       item.quantity || 1,
          unit_price:     item.unit_price || 0,
          customizations: item.customizations || {}
        }))
      }
    )

    if (rpcError) {
      return res.status(500).json({ error: `Failed to create order: ${rpcError.message}` })
    }

    // Log creation in audit trail
    await supabaseServer.from('order_changes').insert({
      order_id:   result.id,
      changed_by: userId,
      field:      'status' as any,
      old_value:  null,
      new_value:  'PENDENTE',
      reason:     'Order created'
    })

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Order created successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
