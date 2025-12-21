'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateSampleButton() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async () => {
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/matches/create-sample', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sample match')
      }

      // Redirect to the new match
      router.push(`/admin/matches/${data.matchId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setCreating(false)
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={handleCreate}
        disabled={creating}
        style={{
          padding: '10px 20px',
          background: creating ? '#9ca3af' : '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: creating ? 'not-allowed' : 'pointer'
        }}
      >
        {creating ? 'Creating...' : '🎲 Create Sample Match'}
      </button>
      {error && (
        <div style={{
          position: 'absolute',
          marginTop: '8px',
          padding: '8px 12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 10
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
