'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

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
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.backRow}>
          <Link href="/admin/matches" className={styles.backLink}>
            ← Back to Matches
          </Link>
        </div>

        <header className={styles.header}>
          <span className={styles.kicker}>Match Import</span>
          <h1 className={styles.title}>Import Match from PDF</h1>
          <p className={styles.subtitle}>
            Upload a match scorecard PDF and let AI extract the data automatically.
          </p>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Step 1: Upload PDF</h2>
            <p>Select a scorecard PDF to begin.</p>
          </div>

          <div className={styles.uploadRow}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className={styles.fileInput}
            />

            {file && (
              <div className={styles.fileMeta}>
                <span>Selected</span>
                <strong>{file.name}</strong>
                <span>{Math.round(file.size / 1024)}KB</span>
              </div>
            )}

            <button
              onClick={handleParsePDF}
              disabled={!file || parsing}
              className={styles.primaryButton}
            >
              {parsing ? 'Parsing with AI...' : 'Parse with AI'}
            </button>
          </div>
        </section>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {validationIssues.length > 0 && (
          <div
            className={`${styles.alert} ${hasErrors ? styles.alertError : styles.alertWarning}`}
          >
            <h3>{hasErrors ? 'Issues Found' : 'Warnings'}</h3>
            <ul>
              {validationIssues.map((issue, idx) => (
                <li
                  key={idx}
                  className={issue.type === 'error' ? styles.issueError : styles.issueWarning}
                >
                  <strong>{issue.field}:</strong> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {editedData && (
          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h2>Step 2: Review &amp; Edit</h2>
                <p>Make any quick adjustments before import.</p>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className={styles.ghostButton}
              >
                {showRawJson ? 'Show Form' : 'Show JSON'}
              </button>
            </div>

            {showRawJson ? (
              <div className={styles.codeBlock}>
                <pre>{JSON.stringify(editedData, null, 2)}</pre>
              </div>
            ) : (
              <>
                <div className={styles.section}>
                  <h3>Match Information</h3>
                  <div className={styles.formGrid}>
                    <label className={styles.fieldLabel}>
                      Opponent
                      <input
                        type="text"
                        value={editedData.match?.opponent_name || ''}
                        onChange={(e) => updateField('match.opponent_name', e.target.value)}
                        className={styles.field}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      Date
                      <input
                        type="date"
                        value={editedData.match?.match_date || ''}
                        onChange={(e) => updateField('match.match_date', e.target.value)}
                        className={styles.field}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      Match Type
                      <select
                        value={editedData.match?.match_type || 'league'}
                        onChange={(e) => updateField('match.match_type', e.target.value)}
                        className={styles.field}
                      >
                        <option value="league">League</option>
                        <option value="cup">Cup</option>
                        <option value="friendly">Friendly</option>
                      </select>
                    </label>
                    <label className={styles.fieldLabel}>
                      Venue
                      <input
                        type="text"
                        value={editedData.match?.venue || ''}
                        onChange={(e) => updateField('match.venue', e.target.value)}
                        className={styles.field}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      Result
                      <select
                        value={editedData.match?.result || 'won'}
                        onChange={(e) => updateField('match.result', e.target.value)}
                        className={styles.field}
                      >
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="tied">Tied</option>
                        <option value="draw">Draw</option>
                        <option value="abandoned">Abandoned</option>
                      </select>
                    </label>
                  </div>
                </div>

                {editedData.innings?.map((innings: any, inningsIdx: number) => (
                  <div key={inningsIdx} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3>
                        Innings {innings.innings_number} -{' '}
                        {innings.batting_team === 'home' ? 'Our Team' : 'Opposition'}
                      </h3>
                      <span className={styles.pill}>Scorecard</span>
                    </div>

                    <div className={styles.summaryRow}>
                      <strong>
                        {innings.total_runs}/{innings.wickets}
                      </strong>
                      <span>in {innings.overs} overs</span>
                      {innings.extras > 0 && (
                        <span className={styles.muted}>(Extras: {innings.extras})</span>
                      )}
                    </div>

                    {innings.batting_cards && innings.batting_cards.length > 0 && (
                      <div className={styles.tableBlock}>
                        <div className={styles.tableHeader}>
                          <h4>Batting</h4>
                          <span className={styles.muted}>
                            {innings.batting_cards.length} players
                          </span>
                        </div>
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Player</th>
                                <th>Runs</th>
                                <th>Balls</th>
                                <th>4s</th>
                                <th>6s</th>
                                <th>Dismissal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {innings.batting_cards.map((player: any, idx: number) => (
                                <tr key={idx}>
                                  <td>{player.player_name}</td>
                                  <td>{player.runs}</td>
                                  <td>{player.balls_faced || '-'}</td>
                                  <td>{player.fours || 0}</td>
                                  <td>{player.sixes || 0}</td>
                                  <td>{player.is_out ? player.dismissal_text : 'Not Out'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {innings.bowling_cards && innings.bowling_cards.length > 0 && (
                      <div className={styles.tableBlock}>
                        <div className={styles.tableHeader}>
                          <h4>Bowling</h4>
                          <span className={styles.muted}>
                            {innings.bowling_cards.length} players
                          </span>
                        </div>
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Player</th>
                                <th>Overs</th>
                                <th>Maidens</th>
                                <th>Runs</th>
                                <th>Wickets</th>
                                <th>Econ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {innings.bowling_cards.map((player: any, idx: number) => (
                                <tr key={idx}>
                                  <td>{player.player_name}</td>
                                  <td>{player.overs}</td>
                                  <td>{player.maidens || 0}</td>
                                  <td>{player.runs_conceded}</td>
                                  <td>{player.wickets}</td>
                                  <td>
                                    {player.overs > 0
                                      ? (player.runs_conceded / player.overs).toFixed(2)
                                      : '-'}
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

            <div className={styles.footerRow}>
              <button
                onClick={() => {
                  setParsedData(null)
                  setEditedData(null)
                  setValidationIssues([])
                }}
                className={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || hasErrors}
                className={styles.primaryButton}
              >
                {importing ? 'Importing...' : 'Import Match'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
