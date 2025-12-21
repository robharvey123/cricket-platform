'use client'

import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        width: '100%',
        padding: '12px 24px',
        background: 'transparent',
        color: '#9ca3af',
        border: 'none',
        fontSize: '14px',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      Sign Out
    </button>
  )
}
