'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateSampleButton() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<any>(null)
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
        // Store the full error data object
        setError(data)
        setCreating(false)
        return
      }

      // Redirect to the new match
      router.push(`/admin/matches/${data.matchId}`)
      router.refresh()
    } catch (err: any) {
      setError({ error: err.message })
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
          padding: '12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '12px',
          maxWidth: '500px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 10,
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            {error.error || 'Error'}
          </div>
          {error.details && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Details:</strong> {error.details}
            </div>
          )}
          {error.code && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Code:</strong> {error.code}
            </div>
          )}
          {error.hint && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Hint:</strong> {error.hint}
            </div>
          )}
          {error.stack && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#fef2f2',
              borderRadius: '4px',
              fontSize: '10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              <strong>Stack:</strong><br />
              {error.stack}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
