'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const [siteId, setSiteId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [clubName, setClubName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id, clubs(name, play_cricket_site_id, play_cricket_api_token)')
          .eq('user_id', user?.id)
          .single()

        if (userRole?.clubs) {
          setClubName(userRole.clubs.name)
          setSiteId(userRole.clubs.play_cricket_site_id || '')
          setApiToken(userRole.clubs.play_cricket_api_token || '')
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/settings/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          play_cricket_site_id: siteId,
          play_cricket_api_token: apiToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setSuccess('Settings saved successfully!')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!siteId || !apiToken) {
      setError('Please enter both Site ID and API Token first')
      return
    }

    setTesting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/settings/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          api_token: apiToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test credentials')
      }

      setSuccess(`✓ Credentials verified! Found ${data.matchCount || 0} matches in your Play-Cricket account.`)
    } catch (err: any) {
      setError(`✗ Test failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading settings...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Club Settings
        </h1>
        <p style={{ color: '#6b7280' }}>
          Configure Play-Cricket integration for {clubName}
        </p>
      </div>

      {/* Play-Cricket Setup Guide */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1e40af' }}>
          📘 How to Get Your Play-Cricket Credentials
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#1e40af', fontSize: '14px' }}>
          <li>Go to <a href="https://www.play-cricket.com" target="_blank" style={{ textDecoration: 'underline' }}>play-cricket.com</a> and sign in to your club account</li>
          <li>Navigate to your club's admin area</li>
          <li>Look for <strong>API Settings</strong> or <strong>Data Integration</strong></li>
          <li>Find your <strong>Site ID</strong> (usually a number like 12345)</li>
          <li>Generate or copy your <strong>API Token</strong> (a long alphanumeric string)</li>
          <li>Paste them below and click "Test Connection"</li>
        </ol>
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#1e40af' }}>
          💡 Don't have API access? Contact Play-Cricket support or your club administrator.
        </p>
      </div>

      {/* Settings Form */}
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
          Play-Cricket API Credentials
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="siteId"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Site ID *
          </label>
          <input
            id="siteId"
            type="text"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            placeholder="e.g., 12345"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
            Your club's unique Play-Cricket site identifier
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="apiToken"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            API Token *
          </label>
          <input
            id="apiToken"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Enter your API token"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
            Your secure API access token (kept private)
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            background: '#d1fae5',
            border: '1px solid #86efac',
            borderRadius: '6px',
            color: '#065f46',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleTest}
            disabled={testing || !siteId || !apiToken}
            style={{
              padding: '10px 20px',
              background: testing || !siteId || !apiToken ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: testing || !siteId || !apiToken ? 'not-allowed' : 'pointer'
            }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !siteId || !apiToken}
            style={{
              padding: '10px 20px',
              background: saving || !siteId || !apiToken ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving || !siteId || !apiToken ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Credentials'}
          </button>
        </div>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
            Once your credentials are saved and tested, you can:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#6b7280', lineHeight: '1.8' }}>
            <li>Import matches directly from Play-Cricket</li>
            <li>Automatically sync match scorecards</li>
            <li>Keep player statistics up to date</li>
          </ul>
          <Link
            href="/admin/matches/import"
            style={{
              marginTop: '16px',
              display: 'inline-block',
              color: '#2563eb',
              textDecoration: 'underline',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Go to Match Import →
          </Link>
        </div>
      </div>
    </div>
  )
}
