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
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

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

    // 1. Fetch the payment entry (campo correto: total, não total_valor)
    const { data: paymentEntry, error: fetchError } = await supabaseServer
      .from('payment_entries')
      .select('*, orders(id, total, payment_status)')
      .eq('id', payment_entry_id)
      .single()

    if (fetchError || !paymentEntry) {
      return res.status(404).json({ error: 'Payment entry not found' })
    }

    // Impedir confirmação de pagamento já finalizado
    if (paymentEntry.status === 'CONFIRMADO' && confirm) {
      return res.status(400).json({ error: 'Pagamento já está confirmado' })
    }

    // 2. Atualizar status do pagamento
    // NOTA: O trigger sync_order_payment_status cuida de atualizar orders.payment_status
    // automaticamente. Não fazemos isso manualmente aqui para evitar conflito.
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

    // 3. Buscar order atualizado (o trigger já atualizou payment_status)
    const { data: updatedOrder, error: orderError } = await supabaseServer
      .from('orders')
      .select('id, total, payment_status')
      .eq('id', paymentEntry.order_id)
      .single()

    if (orderError) {
      return res
        .status(500)
        .json({ error: `Failed to fetch updated order: ${orderError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: {
        payment: updatedPayment,
        order: updatedOrder,
        paymentStatus: updatedOrder.payment_status
      },
      message: `Pagamento ${newStatus === 'CONFIRMADO' ? 'confirmado' : 'rejeitado'} com sucesso`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
