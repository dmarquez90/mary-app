import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
})