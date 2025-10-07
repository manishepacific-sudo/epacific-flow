import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

// TypeScript interfaces
interface ActionRequest {
  action: 'get' | 'create' | 'update' | 'delete'
  payload?: any
}

interface CreateSettingPayload {
  category: string
  key: string
  value: any
  description?: string // Optional description field
}

interface UpdateSettingPayload {
  category: string
  key: string
  value: any
  description?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Create a Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false // Don't persist auth state
  }
})

async function handleGet(req: Request, userId: string) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const keys = url.searchParams.get('keys')?.split(',').filter(Boolean)

  let query = supabase
    .from('system_settings')
    .select('*')

  if (category) {
    query = query.eq('category', category)
  }

  if (keys && keys.length > 0) {
    query = query.in('key', keys)
  }

  const { data, error } = await query

  if (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch settings',
      details: error.message,
      category,
      keys
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePost(payload: CreateSettingPayload, userId: string) {
  const { category, key, value } = payload

  if (!category || !key) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields for creating setting',
      required: ['category', 'key'],
      provided: { category: !!category, key: !!key }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await supabase
    .from('system_settings')
    .insert([{ 
      category, 
      key, 
      value, 
      updated_by: userId,
      description: payload.description // Will be undefined if not provided
    }])
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to create setting',
      details: error.message,
      category,
      key
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePut(payload: UpdateSettingPayload, userId: string) {
  const { category, key, value, description } = payload

  if (!category || !key) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields for updating setting',
      required: ['category', 'key'],
      provided: { category: !!category, key: !!key }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Build update payload, including description only if provided
  const updateData: { value: any; updated_by: string; description?: string } = {
    value,
    updated_by: userId
  }
  if (description !== undefined) {
    updateData.description = description
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
      details: error.message,
      category,
      key
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleDelete(req: Request, userId: string) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const key = url.searchParams.get('key')

  if (!category || !key) {
    return new Response(JSON.stringify({
      error: 'Missing required fields for deleting setting',
      required: ['category', 'key'],
      provided: { category: !!category, key: !!key }
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // First check if the setting exists
  const { data: existingSettings } = await supabase
    .from('system_settings')
    .select('id')
    .match({ category, key })
    .maybeSingle()

  if (!existingSettings) {
    return new Response(JSON.stringify({
      error: 'Setting not found',
      category,
      key
    }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { error } = await supabase
    .from('system_settings')
    .delete()
    .match({ category, key })

  if (error) {
    return new Response(JSON.stringify({
      error: 'Failed to delete setting',
      details: error.message,
      category,
      key
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Log the deletion event with the acting admin's ID
  await supabase.rpc('log_security_event', {
    event_type_param: 'setting_deleted',
    target_user_id_param: userId,
    details_param: { key, category }
  })

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the JWT token from the request header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // WARNING: Using get_current_user_role() with service-role client may cause auth.uid() to be NULL
    // Consider using get_user_role() with explicit user.id if 403 errors occur
    const { data: role, error: roleErr } = await supabase.rpc('get_current_user_role');
    if (roleErr) {
      return new Response(JSON.stringify({
        error: 'Failed to resolve current user role',
        details: roleErr.message,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Admin role required. User does not have admin privileges in user_roles table.'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let requestBody: any = null

    // Parse request body once if it's not GET
    if (req.method !== 'GET') {
      try {
        requestBody = await req.json()
      } catch (err) {
        console.error('Failed to parse request body:', err)
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Handle action-based routing for POST requests
    if (req.method === 'POST' && requestBody && 'action' in requestBody) {
      const actionRequest = requestBody as ActionRequest
      switch (actionRequest.action) {
        case 'get': {
          // Handle GET via query parameters
          const queryParams = new URLSearchParams()
          if (actionRequest.payload?.category) {
            queryParams.set('category', actionRequest.payload.category)
          }
          if (actionRequest.payload?.keys) {
            queryParams.set('keys', actionRequest.payload.keys.join(','))
          }
          const mockReq = new Request(`${req.url}?${queryParams.toString()}`, {
            headers: req.headers
          })
          return handleGet(mockReq, user.id)
        }
        case 'create': {
          if (!actionRequest.payload) {
            return new Response(JSON.stringify({ error: 'Missing payload' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          return handlePost(actionRequest.payload as CreateSettingPayload, user.id)
        }
        case 'update': {
          if (!actionRequest.payload) {
            return new Response(JSON.stringify({ error: 'Missing payload' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          return handlePut(actionRequest.payload as UpdateSettingPayload, user.id)
        }
        case 'delete': {
          if (!actionRequest.payload?.category || !actionRequest.payload?.key) {
            return new Response(JSON.stringify({ error: 'Missing category or key' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          const queryParams = new URLSearchParams()
          queryParams.set('category', actionRequest.payload.category)
          queryParams.set('key', actionRequest.payload.key)
          const mockReq = new Request(`${req.url}?${queryParams.toString()}`, {
            headers: req.headers
          })
          return handleDelete(mockReq, user.id)
        }
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
    }

    // Handle HTTP verb-based routing
    switch (req.method) {
      case 'GET':
        return handleGet(req, user.id)
      case 'POST':
        if (!requestBody) {
          return new Response(JSON.stringify({ error: 'Missing request body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return handlePost(requestBody as CreateSettingPayload, user.id)
      case 'PUT':
        if (!requestBody) {
          return new Response(JSON.stringify({ error: 'Missing request body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return handlePut(requestBody as UpdateSettingPayload, user.id)
      case 'DELETE':
        return handleDelete(req, user.id)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (err) {
    console.error('Error processing request:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})