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
    return handleGetPayments(req, res)
  } else if (req.method === 'POST') {
    return handleRegisterPayment(req, res, user.id)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetPayments(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { order_id, status, limit = 50, offset = 0 } = req.query

    let query = supabaseServer
      .from('payment_entries')
      .select(`
        *,
        orders(*),
        profiles:registered_by(name),
        confirmed_by_profile:confirmed_by(name)
      `)

    if (order_id) {
      query = query.eq('order_id', order_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const limitNum = Math.min(parseInt(String(limit)) || 50, 100)
    const offsetNum = parseInt(String(offset)) || 0

    const { data: payments, error, count } = await query
      .order('registered_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      data: {
        payments,
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

async function handleRegisterPayment(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string
) {
  try {
    const { order_id, type, valor, method, notes } = req.body

    // Validate required fields
    if (!order_id || !type || !valor || !method) {
      return res.status(400).json({
        error: 'Missing required fields: order_id, type, valor, method'
      })
    }

    // Validate type enum
    const validTypes = ['SINAL', 'SALDO', 'ANTECIPADO', 'PARCIAL']
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      })
    }

    // Validate method enum
    const validMethods = ['PIX', 'DEBITO', 'CREDITO', 'DINHEIRO']
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        error: `Invalid method. Must be one of: ${validMethods.join(', ')}`
      })
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Trava de valor excedente (tolerância configurável via settings)
    const [{ data: existingPayments }, { data: toleranceSetting }] = await Promise.all([
      supabaseServer
        .from('payment_entries')
        .select('valor')
        .eq('order_id', order_id)
        .eq('status', 'CONFIRMADO'),
      supabaseServer
        .from('settings')
        .select('value')
        .eq('key', 'payment_overpayment_tolerance_pct')
        .single()
    ])

    const tolerance = typeof toleranceSetting?.value === 'number' ? toleranceSetting.value : 0.01
    const totalPaid = (existingPayments || []).reduce((acc, p) => acc + (p.valor || 0), 0)
    const newAmount = parseFloat(valor)

    if (totalPaid + newAmount > (order.total * (1 + tolerance))) {
      return res.status(400).json({ 
        error: `O valor excede o saldo devedor do pedido. Total Pago: R$ ${totalPaid}, Restante: R$ ${order.total - totalPaid}` 
      })
    }

    // Auto-confirm payment immediately
    const now = new Date().toISOString()

    // Create payment entry with CONFIRMADO status
    const { data: newPayment, error: paymentError } = await supabaseServer
      .from('payment_entries')
      .insert({
        order_id,
        type,
        method,
        valor: newAmount,
        registered_by: userId,
        status: 'CONFIRMADO',
        confirmed_by: userId,
        confirmed_at: now,
        notes: notes || null,
        registered_at: now
      })
      .select()
      .single()

    if (paymentError) {
      return res.status(500).json({ error: `Failed to register payment: ${paymentError.message}` })
    }

    // Log change in order_changes
    await supabaseServer.from('order_changes').insert({
      order_id,
      changed_by: userId,
      field: 'payment_registered',
      old_value: null,
      new_value: `${type} via ${method}: R$ ${valor}`,
      reason: `Pagamento registrado e confirmado automaticamente`
    })

    return res.status(201).json({
      success: true,
      data: newPayment,
      message: 'Pagamento registrado e confirmado com sucesso'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
