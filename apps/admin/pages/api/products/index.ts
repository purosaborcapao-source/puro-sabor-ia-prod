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
    return handleGetProducts(req, res)
  } else if (req.method === 'POST') {
    return handleCreateProduct(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetProducts(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { category, is_active, limit = 50, offset = 0 } = req.query

    let query = supabaseServer
      .from('products')
      .select('*')

    if (category) {
      query = query.eq('category', category)
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    const limitNum = Math.min(parseInt(String(limit)) || 50, 100)
    const offsetNum = parseInt(String(offset)) || 0

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      data: {
        products,
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

async function handleCreateProduct(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const {
      name,
      description,
      price,
      cost_price,
      prep_time = 60,
      category = 'geral',
      image_url,
      custom_options,
      is_active = true
    } = req.body

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        error: 'Missing required fields: name, price'
      })
    }

    // Create product
    const { data: newProduct, error: productError } = await supabaseServer
      .from('products')
      .insert({
        name,
        description: description || null,
        price: parseFloat(price),
        cost_price: cost_price ? parseFloat(cost_price) : null,
        prep_time: parseInt(prep_time),
        category,
        image_url: image_url || null,
        custom_options: custom_options || null,
        is_active
      })
      .select()
      .single()

    if (productError) {
      return res.status(500).json({ error: `Failed to create product: ${productError.message}` })
    }

    return res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
