import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@atendimento-ia/supabase/server'
import { createClient } from '@atendimento-ia/supabase'

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
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  // Get the user's session to check if they're admin
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify the token
  const { data: { user }, error: authError } = await createClient().auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check if user is admin
  const { data: userProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only ADMIN can manage users' })
  }

  if (req.method === 'PATCH') {
    return handleUpdateUser(id, req, res)
  } else if (req.method === 'DELETE') {
    return handleDeleteUser(id, res)
  } else {
    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleUpdateUser(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { role, status, name, phone } = req.body

    // Validate role if provided
    const validRoles = ['ADMIN', 'GERENTE', 'PRODUTOR', 'ATENDENTE']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    // Validate status if provided
    const validStatuses = ['ATIVO', 'INATIVO', 'CONGELADO']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    // Update profile
    const { data: profile, error: updateError } = await supabaseServer
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: `Failed to update user: ${updateError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: profile,
      message: 'User updated successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleDeleteUser(
  id: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Soft delete - set status to INATIVO
    const { data: profile, error: updateError } = await supabaseServer
      .from('profiles')
      .update({ status: 'INATIVO' })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: `Failed to delete user: ${updateError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: profile,
      message: 'User deleted successfully (soft delete)'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
