'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ImportPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setParsedData(null)
      setError(null)
    }
  }

  const handleParsePDF = async () => {
    if (!file) return

    setParsing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await fetch('/api/matches/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF')
      }

      setParsedData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parsedData) return

    setImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/matches/import-from-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import match')
      }

      // Redirect to the new match
      router.push(`/admin/matches/${data.matchId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/admin/matches"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Back to Matches
        </Link>
      </div>

      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        Import Match from PDF
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Upload a match scorecard PDF and let AI extract the data automatically
      </p>

      {/* Upload Section */}
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Step 1: Upload PDF
        </h2>

        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '6px',
            width: '100%',
            marginBottom: '16px'
          }}
        />

        {file && (
          <div style={{ marginBottom: '16px', color: '#6b7280' }}>
            Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        <button
          onClick={handleParsePDF}
          disabled={!file || parsing}
          style={{
            padding: '12px 24px',
            background: file && !parsing ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: file && !parsing ? 'pointer' : 'not-allowed'
          }}
        >
          {parsing ? '🔄 Parsing PDF...' : '🤖 Parse with AI'}
        </button>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Preview Section */}
      {parsedData && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Step 2: Review Extracted Data
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Match Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>Date:</strong> {parsedData.match?.match_date || 'N/A'}
              </div>
              <div>
                <strong>Opponent:</strong> {parsedData.match?.opponent_name || 'N/A'}
              </div>
              <div>
                <strong>Venue:</strong> {parsedData.match?.venue || 'N/A'}
              </div>
              <div>
                <strong>Result:</strong> {parsedData.match?.result || 'N/A'}
              </div>
            </div>
          </div>

          {parsedData.innings && parsedData.innings.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Innings Summary
              </h3>
              {parsedData.innings.map((inn: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    Innings {inn.innings_number}: {inn.batting_team}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {inn.total_runs}/{inn.wickets} in {inn.overs} overs
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                    {inn.batting_cards?.length || 0} batting cards, {inn.bowling_cards?.length || 0} bowling cards
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              padding: '12px 24px',
              background: importing ? '#9ca3af' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: importing ? 'not-allowed' : 'pointer'
            }}
          >
            {importing ? 'Importing...' : '✓ Import Match'}
          </button>
        </div>
      )}
    </div>
  )
}
