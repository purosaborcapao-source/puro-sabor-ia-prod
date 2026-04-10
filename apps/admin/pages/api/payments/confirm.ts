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
  // Get the user's session to check if they're admin or gerente
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify the token by creating a client with it
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser()

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check if user is admin or gerente by fetching their profile
  const { data: userProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['ADMIN', 'GERENTE'].includes(userProfile?.role)) {
    return res.status(403).json({ error: 'Only ADMIN or GERENTE can confirm payments' })
  }

  if (req.method === 'POST') {
    return handleConfirmPayment(req, res, user.id)
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleConfirmPayment(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string
) {
  try {
    const { payment_entry_id, confirm } = req.body

    // Validate input
    if (!payment_entry_id || confirm === undefined) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: payment_entry_id, confirm' })
    }

    // 1. Fetch the payment entry to get order_id
    const { data: paymentEntry, error: fetchError } = await supabaseServer
      .from('payment_entries')
      .select('*, orders(total_valor)')
      .eq('id', payment_entry_id)
      .single()

    if (fetchError || !paymentEntry) {
      return res.status(404).json({ error: 'Payment entry not found' })
    }

    // 2. Update payment_entry status
    const newStatus = confirm ? 'CONFIRMADO' : 'REJEITADO'
    const { data: updatedPayment, error: updateError } = await supabaseServer
      .from('payment_entries')
      .update({
        status: newStatus,
        confirmed_by: userId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', payment_entry_id)
      .select()
      .single()

    if (updateError) {
      return res
        .status(500)
        .json({ error: `Failed to update payment entry: ${updateError.message}` })
    }

    // 3. Calculate new order payment status
    const { data: allPayments, error: paymentsError } = await supabaseServer
      .from('payment_entries')
      .select('*')
      .eq('order_id', paymentEntry.order_id)
      .eq('status', 'CONFIRMADO')

    if (paymentsError) {
      return res.status(500).json({ error: `Failed to fetch payments: ${paymentsError.message}` })
    }

    // Calculate total confirmed amount
    const totalConfirmed = allPayments?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0
    const orderTotal = paymentEntry.orders?.total_valor || 0

    // Determine new payment status
    let newPaymentStatus = 'SINAL_PENDENTE'

    if (totalConfirmed >= orderTotal) {
      newPaymentStatus = 'QUITADO'
    } else if (totalConfirmed > 0 && totalConfirmed < orderTotal) {
      newPaymentStatus = 'SINAL_PAGO'
    }

    // 4. Update order payment_status
    const { data: updatedOrder, error: orderError } = await supabaseServer
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentEntry.order_id)
      .select()
      .single()

    if (orderError) {
      return res
        .status(500)
        .json({ error: `Failed to update order: ${orderError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: {
        payment: updatedPayment,
        order: updatedOrder,
        totalConfirmed,
        orderTotal,
        paymentStatus: newPaymentStatus
      },
      message: `Payment ${newStatus.toLowerCase()} successfully`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
