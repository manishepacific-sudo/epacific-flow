import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Validation schemas
const GetSettingSchema = z.object({
  category: z.string().trim().max(50).optional(),
  keys: z.array(z.string().trim().max(100)).optional()
})

const CreateSettingSchema = z.object({
  category: z.string().trim().min(1).max(50).regex(/^[a-z_]+$/, 'Category must contain only lowercase letters and underscores'),
  key: z.string().trim().min(1).max(100),
  value: z.union([
    z.string().max(5000),
    z.number(),
    z.boolean(),
    z.record(z.unknown())
  ]).refine(val => JSON.stringify(val).length < 10000, 'Value too large'),
  description: z.string().max(500).optional()
})

const UpdateSettingSchema = z.object({
  category: z.string().trim().min(1).max(50),
  key: z.string().trim().min(1).max(100),
  value: z.union([
    z.string().max(5000),
    z.number(),
    z.boolean(),
    z.record(z.unknown())
  ]).refine(val => JSON.stringify(val).length < 10000, 'Value too large'),
  description: z.string().max(500).optional()
})

const DeleteSettingSchema = z.object({
  category: z.string().trim().min(1).max(50),
  key: z.string().trim().min(1).max(100)
})

interface ActionRequest {
  action: 'get' | 'create' | 'update' | 'delete'
  payload?: Record<string, unknown>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
})

async function handleGet(payload: Record<string, unknown>) {
  const validation = GetSettingSchema.safeParse(payload)
  if (!validation.success) {
    return new Response(JSON.stringify({ 
      error: 'Invalid input',
      details: validation.error.issues
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { category, keys } = validation.data
  let query = supabase
    .from('system_settings')
    .select('key, value, category, description')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  if (keys && keys.length > 0) {
    query = query.in('key', keys)
  }

  const { data, error } = await query

  if (error) {
    console.error('[manage-settings] Query error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch settings',
      details: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePost(payload: Record<string, unknown>, userId: string) {
  const validation = CreateSettingSchema.safeParse(payload)
  if (!validation.success) {
    return new Response(JSON.stringify({ 
      error: 'Invalid input',
      details: validation.error.issues
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { category, key, value, description } = validation.data

  const { data, error } = await supabase
    .from('system_settings')
    .insert([{ 
      category, 
      key, 
      value, 
      updated_by: userId,
      description
    }])
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to create setting',
      details: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePut(payload: Record<string, unknown>, userId: string) {
  const validation = UpdateSettingSchema.safeParse(payload)
  if (!validation.success) {
    return new Response(JSON.stringify({ 
      error: 'Invalid input',
      details: validation.error.issues
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { category, key, value, description } = validation.data

  const updateData = {
    value,
    updated_by: userId,
    description
  }

  const { data, error } = await supabase
    .from('system_settings')
    .update(updateData)
    .match({ category, key })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({
      error: 'Failed to update setting',
      details: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleDelete(payload: Record<string, unknown>) {
  const validation = DeleteSettingSchema.safeParse(payload)
  if (!validation.success) {
    return new Response(JSON.stringify({ 
      error: 'Invalid input',
      details: validation.error.issues
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { category, key } = validation.data

  const { data, error } = await supabase
    .from('system_settings')
    .delete()
    .match({ category, key })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({
      error: 'Failed to delete setting',
      details: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!data) {
    return new Response(JSON.stringify({
      error: 'Setting not found'
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? '')

    if (authError || !user) {
      console.error('[manage-settings] Auth error:', authError)
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Authentication required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let requestBody: ActionRequest | null = null
    try {
      requestBody = await req.json()
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, payload } = requestBody ?? {}

    // GET is allowed for all authenticated users
    if (action === 'get') {
      return await handleGet(payload ?? {})
    }

    // For write operations (create, update, delete), check admin role
    const userRolesResponse = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    const isAdmin = !!userRolesResponse.data

    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Admin role required for this operation'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle admin operations
    switch (action) {
      case 'create':
        return await handlePost(payload ?? {}, user.id)
      case 'update':
        return await handlePut(payload ?? {}, user.id)
      case 'delete':
        return await handleDelete(payload ?? {})
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (err) {
    console.error('[manage-settings] Error:', err)
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
