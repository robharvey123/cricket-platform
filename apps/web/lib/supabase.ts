import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For server-side operations (API routes, Edge Functions)
export const createServerClient = (supabaseAccessToken?: string) => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: supabaseAccessToken
          ? { Authorization: `Bearer ${supabaseAccessToken}` }
          : {}
      }
    }
  )
}
