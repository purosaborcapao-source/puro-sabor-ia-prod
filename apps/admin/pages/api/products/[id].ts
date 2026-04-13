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
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  if (req.method === 'GET') {
    return handleGetProduct(req, res, id)
  } else if (req.method === 'PUT') {
    return handleUpdateProduct(req, res, id)
  } else if (req.method === 'DELETE') {
    return handleDeleteProduct(req, res, id)
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetProduct(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string
) {
  try {
    const { data: product, error } = await supabaseServer
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.status(200).json({
      success: true,
      data: product
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleUpdateProduct(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string
) {
  try {
    const {
      name,
      description,
      price,
      cost_price,
      prep_time,
      category,
      image_url,
      custom_options,
      is_active
    } = req.body

    // Fetch current product
    const { data: currentProduct, error: fetchError } = await supabaseServer
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(price)
    if (cost_price !== undefined) updateData.cost_price = cost_price ? parseFloat(cost_price) : null
    if (prep_time !== undefined) updateData.prep_time = parseInt(prep_time)
    if (category !== undefined) updateData.category = category
    if (image_url !== undefined) updateData.image_url = image_url
    if (custom_options !== undefined) updateData.custom_options = custom_options
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updatedProduct, error: updateError } = await supabaseServer
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: `Failed to update product: ${updateError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleDeleteProduct(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  id: string
) {
  try {
    // Check if product is in any orders
    const { data: orderItems, error: checkError } = await supabaseServer
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1)

    if (checkError) {
      return res.status(500).json({ error: checkError.message })
    }

    if (orderItems && orderItems.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete product. It is referenced in existing orders.'
      })
    }

    // Delete product
    const { error: deleteError } = await supabaseServer
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return res.status(500).json({ error: `Failed to delete product: ${deleteError.message}` })
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
