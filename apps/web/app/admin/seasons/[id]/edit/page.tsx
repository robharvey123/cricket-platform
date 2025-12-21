'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../../lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditSeasonPage() {
  const params = useParams()
  const seasonId = params.id as string

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        const { data: season, error: fetchError } = await supabase
          .from('seasons')
          .select('*')
          .eq('id', seasonId)
          .single()

        if (fetchError) {
          setError('Season not found')
          return
        }

        if (season) {
          setName(season.name)
          setStartDate(season.start_date)
          setEndDate(season.end_date)
          setIsActive(season.is_active)
        }
      } catch (err) {
        setError('Failed to load season')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSeason()
  }, [seasonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate dates
      if (new Date(endDate) <= new Date(startDate)) {
        setError('End date must be after start date')
        return
      }

      // Update season
      const { error: updateError } = await supabase
        .from('seasons')
        .update({
          name: name,
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
        })
        .eq('id', seasonId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/admin/seasons')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      router.push('/admin/seasons')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Edit Season
        </h1>
        <p style={{ color: '#6b7280' }}>
          Update season details
        </p>
      </div>

      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Season Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2025 Season"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="startDate"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Start Date *
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="endDate"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              End Date *
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{
                  marginRight: '8px',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              Active Season
            </label>
            <p style={{ marginTop: '4px', marginLeft: '24px', fontSize: '12px', color: '#6b7280' }}>
              Only active seasons can have new matches added
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

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: saving ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/admin/seasons"
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Cancel
            </Link>
          </div>

          <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
              Deleting a season will also delete all associated matches and statistics.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Delete Season
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
