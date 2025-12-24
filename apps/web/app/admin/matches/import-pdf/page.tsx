'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ValidationIssue = {
  type: 'warning' | 'error'
  field: string
  message: string
}

export default function ImportPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [editedData, setEditedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [showRawJson, setShowRawJson] = useState(false)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setParsedData(null)
      setEditedData(null)
      setError(null)
      setValidationIssues([])
    }
  }

  const validateParsedData = (data: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = []

    // Validate match info
    if (!data.match?.opponent_name || data.match.opponent_name.trim() === '') {
      issues.push({ type: 'error', field: 'opponent', message: 'Opponent name is missing' })
    }
    if (!data.match?.match_date) {
      issues.push({ type: 'error', field: 'date', message: 'Match date is missing' })
    }

    // Validate innings exist
    if (!data.innings || data.innings.length === 0) {
      issues.push({ type: 'error', field: 'innings', message: 'No innings data found' })
      return issues
    }

    // Validate batting and bowling for each innings
    data.innings.forEach((innings: any, inningsIdx: number) => {
      const battingCards = innings.batting_cards || []
      const bowlingCards = innings.bowling_cards || []

      if (battingCards.length === 0) {
        issues.push({ type: 'error', field: `innings[${inningsIdx}].batting`, message: 'No batting data found' })
      }

      battingCards.forEach((player: any, idx: number) => {
        if (!player.player_name || player.player_name.trim() === '') {
          issues.push({ type: 'error', field: `batting[${idx}]`, message: 'Player name missing' })
        }
        if (player.runs > 200) {
          issues.push({ type: 'warning', field: `batting[${idx}]`, message: `Unusually high score: ${player.runs} runs` })
        }
      })

      bowlingCards.forEach((player: any, idx: number) => {
        if (!player.player_name || player.player_name.trim() === '') {
          issues.push({ type: 'error', field: `bowling[${idx}]`, message: 'Player name missing' })
        }
        if (player.wickets > 10) {
          issues.push({ type: 'warning', field: `bowling[${idx}]`, message: `Unusually high wickets: ${player.wickets}` })
        }
      })
    })

    return issues
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
      setEditedData(JSON.parse(JSON.stringify(data))) // Deep clone

      // Validate
      const issues = validateParsedData(data)
      setValidationIssues(issues)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  const updateField = (path: string, value: any) => {
    setEditedData((prev: any) => {
      const newData = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const handleImport = async () => {
    if (!editedData) return

    // Re-validate before import
    const issues = validateParsedData(editedData)
    const errors = issues.filter(i => i.type === 'error')

    if (errors.length > 0) {
      setError('Please fix all errors before importing')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/matches/import-from-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
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

  const hasErrors = validationIssues.some(i => i.type === 'error')

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
          {parsing ? '🤖 Parsing with AI...' : '🤖 Parse with AI'}
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
          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div style={{
          background: hasErrors ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${hasErrors ? '#ef4444' : '#f59e0b'}`,
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            color: hasErrors ? '#dc2626' : '#d97706',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            {hasErrors ? '⚠️ Issues Found' : '⚡ Warnings'}
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationIssues.map((issue, idx) => (
              <li key={idx} style={{
                color: issue.type === 'error' ? '#dc2626' : '#d97706',
                fontSize: '13px',
                marginBottom: '4px'
              }}>
                <strong>{issue.field}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parsed Data Preview */}
      {editedData && (
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Step 2: Review & Edit
            </h2>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {showRawJson ? 'Show Form' : 'Show JSON'}
            </button>
          </div>

          {showRawJson ? (
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '16px',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <pre style={{ fontSize: '12px', margin: 0 }}>
                {JSON.stringify(editedData, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Match Info */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Match Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Opponent
                    </label>
                    <input
                      type="text"
                      value={editedData.match?.opponent_name || ''}
                      onChange={(e) => updateField('match.opponent_name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={editedData.match?.match_date || ''}
                      onChange={(e) => updateField('match.match_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Match Type
                    </label>
                    <select
                      value={editedData.match?.match_type || 'league'}
                      onChange={(e) => updateField('match.match_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="league">League</option>
                      <option value="cup">Cup</option>
                      <option value="friendly">Friendly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Venue
                    </label>
                    <input
                      type="text"
                      value={editedData.match?.venue || ''}
                      onChange={(e) => updateField('match.venue', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                      Result
                    </label>
                    <select
                      value={editedData.match?.result || 'won'}
                      onChange={(e) => updateField('match.result', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="tied">Tied</option>
                      <option value="draw">Draw</option>
                      <option value="abandoned">Abandoned</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Innings */}
              {editedData.innings?.map((innings: any, inningsIdx: number) => (
                <div key={inningsIdx} style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#7c3aed' }}>
                    Innings {innings.innings_number} - {innings.batting_team === 'home' ? 'Our Team' : 'Opposition'}
                  </h3>

                  {/* Innings Summary */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    <strong>{innings.total_runs}/{innings.wickets}</strong> in {innings.overs} overs
                    {innings.extras > 0 && <span style={{ marginLeft: '12px', color: '#6b7280' }}>
                      (Extras: {innings.extras})
                    </span>}
                  </div>

                  {/* Batting Card */}
                  {innings.batting_cards && innings.batting_cards.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Batting ({innings.batting_cards.length} players)
                      </h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Runs</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Balls</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>4s</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>6s</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Dismissal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {innings.batting_cards.map((player: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px' }}>{player.player_name}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.runs}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.balls_faced || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.fours || 0}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.sixes || 0}</td>
                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                  {player.is_out ? player.dismissal_text : 'Not Out'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bowling Card */}
                  {innings.bowling_cards && innings.bowling_cards.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Bowling ({innings.bowling_cards.length} players)
                      </h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Overs</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Maidens</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Runs</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Wickets</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Econ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {innings.bowling_cards.map((player: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px' }}>{player.player_name}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.overs}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.maidens || 0}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.runs_conceded}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{player.wickets}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  {player.overs > 0 ? (player.runs_conceded / player.overs).toFixed(2) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setParsedData(null)
                setEditedData(null)
                setValidationIssues([])
              }}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#1f2937',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || hasErrors}
              style={{
                padding: '10px 20px',
                background: importing || hasErrors ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: importing || hasErrors ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {importing ? '⏳ Importing...' : '✓ Import Match'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
