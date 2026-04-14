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
  // Get the user's session to check if they're admin
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify the token by creating a client with it
  const { data: { user }, error: authError } = await createClient().auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check if user is admin by fetching their profile
  const { data: userProfile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only ADMIN can manage users' })
  }

  if (req.method === 'GET') {
    return handleGetUsers(res)
  } else if (req.method === 'POST') {
    return handleCreateUser(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGetUsers(res: NextApiResponse<ResponseData>) {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseServer
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      return res.status(500).json({ error: `Failed to fetch profiles: ${profilesError.message}` })
    }

    // Get all auth users to get emails
    const { data: authData, error: authError } = await supabaseServer.auth.admin.listUsers()

    if (authError) {
      return res.status(500).json({ error: `Failed to fetch auth users: ${authError.message}` })
    }

    // Merge auth user data with profiles
    const users = profiles?.map((profile) => {
      const authUser = authData?.users?.find((u) => u.id === profile.id)
      return {
        ...profile,
        email: authUser?.email || 'N/A'
      }
    }) || []

    return res.status(200).json({ success: true, data: users })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}

async function handleCreateUser(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { email, password, name, role } = req.body

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Validate role
    const validRoles = ['ADMIN', 'ATENDENTE']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return res.status(400).json({ error: `Failed to create auth user: ${authError.message}` })
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create auth user' })
    }

    // Create profile record
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        role: role || 'ATENDENTE',
        status: 'ATIVO'
      })
      .select()
      .single()

    if (profileError) {
      // Try to delete the auth user if profile creation fails
      await supabaseServer.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({ error: `Failed to create profile: ${profileError.message}` })
    }

    return res.status(201).json({
      success: true,
      data: {
        ...profile,
        email
      },
      message: 'User created successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
