import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@atendimento-ia/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    // Check if user has permission to cancel orders
    if (
      profile.role !== 'ADMIN' &&
      profile.role !== 'GERENTE'
    ) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to cancel orders' });
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, delivery_date, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCELADO',
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Decrement slot count
    const { data: slot, error: slotError } = await supabase
      .from('delivery_slots')
      .select('current_orders')
      .eq('date', order.delivery_date)
      .single();

    if (!slotError && slot) {
      const newCount = Math.max(0, (slot.current_orders || 0) - 1);

      const { error: slotUpdateError } = await supabase
        .from('delivery_slots')
        .update({
          current_orders: newCount,
        })
        .eq('date', order.delivery_date);

      if (slotUpdateError) {
        console.error('Error updating slot:', slotUpdateError);
        // Don't fail the request, just log the error
      }
    }

    // Log the change
    const { error: logError } = await supabase.from('order_changes').insert({
      order_id: orderId,
      changed_by: user.id,
      field: 'status' as any,
      old_value: order.status,
      new_value: 'CANCELADO',
      reason: 'Order cancelled by user',
    });

    if (logError) {
      console.error('Error logging change:', logError);
      // Don't fail the request
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
