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

      {/* File Upload Section */}
      <div style={{
        background: 'white',
        padding: '32px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Step 1: Upload PDF
        </h2>
        
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{
            display: 'block',
            marginBottom: '16px',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '400px'
          }}
        />

        {file && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)}KB)
            </p>
          </div>
        )}

        <button
          onClick={handleParsePDF}
          disabled={!file || parsing}
          style={{
            padding: '10px 20px',
            background: file && !parsing ? '#7c3aed' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: file && !parsing ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {parsing ? '🤖 Parsing...' : '🤖 Parse with AI'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Parsed Data Preview */}
      {parsedData && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Step 2: Review & Import
          </h2>
          
          <div style={{
            background: '#f9fafb',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '16px',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <pre style={{ fontSize: '12px', margin: 0 }}>
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              padding: '10px 20px',
              background: importing ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {importing ? '⏳ Importing...' : '✓ Import Match'}
          </button>
        </div>
      )}
    </div>
  )
}

