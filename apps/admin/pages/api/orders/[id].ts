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

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' })
  }

  if (req.method === 'GET') {
    return handleGetOrder(req, res, id)
  } else if (req.method === 'PUT') {
    return handleUpdateOrder(req, res, id, user.id)
  } else if (req.method === 'DELETE') {
    return handleDeleteOrder(req, res, id, user.id)
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetOrder(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string
) {
  try {
    const { data: order, error } = await supabaseServer
      .from('orders')
      .select(`
        id,
        number,
        order_number,
        customer_id,
        delivery_date,
        delivery_type,
        address,
        notes,
        total,
        status,
        payment_status,
        sinal_valor,
        sinal_confirmado,
        conta_corrente,
        created_at,
        updated_at,
        customers:customer_id(id,name,phone),
        order_items(id,product_id,quantity,unit_price,customizations),
        payment_entries(id,payment_type,amount,status,notes,created_at),
        order_changes(id,field,old_value,new_value,reason,changed_at)
      `)
      .eq('id', id)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    return res.status(200).json({
      success: true,
      data: order
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleUpdateOrder(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string,
  userId: string
) {
  try {
    const {
      status,
      total,
      delivery_date,
      delivery_type,
      address,
      notes,
      payment_status,
      sinal_valor,
      sinal_confirmado,
      conta_corrente,
      reason = 'Order updated'
    } = req.body

    // Fetch current order to track changes
    const { data: currentOrder, error: fetchError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrder) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const updateData: any = {}
    const changes: any[] = []

    // Track changes for audit trail
    if (status !== undefined && status !== currentOrder.status) {
      updateData.status = status
      changes.push({
        field: 'status' as any,
        old_value: currentOrder.status,
        new_value: status,
        reason
      })
    }
    if (total !== undefined && total !== currentOrder.total) {
      updateData.total = total
      changes.push({
        field: 'total',
        old_value: currentOrder.total.toString(),
        new_value: total.toString(),
        reason
      })
    }
    if (delivery_date !== undefined && delivery_date !== currentOrder.delivery_date) {
      updateData.delivery_date = delivery_date
      changes.push({
        field: 'delivery_date',
        old_value: currentOrder.delivery_date,
        new_value: delivery_date,
        reason
      })
    }
    if (delivery_type !== undefined && delivery_type !== currentOrder.delivery_type) {
      updateData.delivery_type = delivery_type
      changes.push({
        field: 'delivery_type',
        old_value: currentOrder.delivery_type,
        new_value: delivery_type,
        reason
      })
    }
    if (address !== undefined && address !== currentOrder.address) {
      updateData.address = address
      changes.push({
        field: 'address',
        old_value: currentOrder.address,
        new_value: address,
        reason
      })
    }
    if (notes !== undefined && notes !== currentOrder.notes) {
      updateData.notes = notes
      changes.push({
        field: 'notes',
        old_value: currentOrder.notes,
        new_value: notes,
        reason
      })
    }
    if (payment_status !== undefined && payment_status !== currentOrder.payment_status) {
      updateData.payment_status = payment_status
      changes.push({
        field: 'payment_status',
        old_value: currentOrder.payment_status,
        new_value: payment_status,
        reason
      })
    }
    if (sinal_valor !== undefined && sinal_valor !== currentOrder.sinal_valor) {
      updateData.sinal_valor = sinal_valor
      changes.push({
        field: 'sinal_valor',
        old_value: currentOrder.sinal_valor.toString(),
        new_value: sinal_valor.toString(),
        reason
      })
    }
    if (sinal_confirmado !== undefined && sinal_confirmado !== currentOrder.sinal_confirmado) {
      updateData.sinal_confirmado = sinal_confirmado
      changes.push({
        field: 'sinal_confirmado',
        old_value: currentOrder.sinal_confirmado.toString(),
        new_value: sinal_confirmado.toString(),
        reason
      })
    }
    if (conta_corrente !== undefined && conta_corrente !== currentOrder.conta_corrente) {
      updateData.conta_corrente = conta_corrente
      changes.push({
        field: 'conta_corrente',
        old_value: currentOrder.conta_corrente.toString(),
        new_value: conta_corrente.toString(),
        reason
      })
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updateData.updated_at = new Date().toISOString()

    // Update order
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: `Failed to update order: ${updateError.message}` })
    }

    // Log changes
    if (changes.length > 0) {
      const changesData = changes.map(change => ({
        order_id: id,
        changed_by: userId,
        ...change
      }))

      await supabaseServer.from('order_changes').insert(changesData)
    }

    return res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleDeleteOrder(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string,
  userId: string
) {
  try {
    // Check if order exists and is not already cancelled
    const { data: order, error: fetchError } = await supabaseServer
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    if (order.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Order is already cancelled' })
    }

    // Soft-delete: set status to CANCELADO to preserve financial history
    const { error: updateError } = await supabaseServer
      .from('orders')
      .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: `Failed to cancel order: ${updateError.message}` })
    }

    // Log the cancellation
    await supabaseServer.from('order_changes').insert({
      order_id:   id,
      changed_by: userId,
      field:      'status' as any,
      old_value:  order.status,
      new_value:  'CANCELADO',
      reason:     'Order cancelled'
    })

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
