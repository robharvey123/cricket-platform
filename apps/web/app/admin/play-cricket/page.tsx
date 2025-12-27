'use client'

import { useEffect, useState } from 'react'
import { useUserRole } from '../../../lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Club {
  id: string
  name: string
  play_cricket_site_id: string | null
  play_cricket_api_token: string | null
  play_cricket_sync_enabled: boolean
  play_cricket_last_sync: string | null
}

interface SyncLog {
  id: string
  sync_type: string
  season_year: number
  status: string
  matches_found: number
  matches_imported: number
  matches_updated: number
  matches_skipped: number
  errors: any[]
  started_at: string
  completed_at: string | null
}

export default function PlayCricketPage() {
  const router = useRouter()
  const { role, clubId, loading: roleLoading } = useUserRole()
  const [club, setClub] = useState<Club | null>(null)
  const [siteId, setSiteId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [season, setSeason] = useState(new Date().getFullYear())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/admin')
    }
  }, [role, roleLoading, router])

  useEffect(() => {
    if (!roleLoading) {
      fetchClubConfig()
    }
  }, [roleLoading])

  useEffect(() => {
    if (clubId) {
      fetchSyncLogs()
    }
  }, [clubId])

  async function fetchClubConfig() {
    try {
      const response = await fetch('/api/club/info')
      if (response.ok) {
        const data = await response.json()
        setClub(data.club)
        setSiteId(data.club.play_cricket_site_id || '')
        // Don't set API token for security - it's stored but not displayed
        return
      }
      const fallback = await fetch('/api/onboarding/status')
      if (fallback.ok) {
        const data = await fallback.json()
        setClub(data.club)
      }
    } catch (error) {
      console.error('Failed to fetch club config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSyncLogs() {
    if (!clubId) return

    try {
      const response = await fetch(`/api/play-cricket/sync-logs?clubId=${clubId}`)
      if (response.ok) {
        const data = await response.json()
        setSyncLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error)
    }
  }

  async function handleTestConnection() {
    if (!siteId || !apiToken) {
      setMessage({ type: 'error', text: 'Please enter both Site ID and API Token' })
      return
    }

    setTestingConnection(true)
    setMessage(null)

    try {
      const response = await fetch('/api/play-cricket/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, apiToken, clubId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Connection successful! Your credentials have been saved.' })
        fetchClubConfig()
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' })
    } finally {
      setTestingConnection(false)
    }
  }

  async function handleImport() {
    if (!clubId || !season) {
      setMessage({ type: 'error', text: 'Please select a season' })
      return
    }

    if (!club?.play_cricket_site_id || !club?.play_cricket_api_token) {
      setMessage({ type: 'error', text: 'Please configure Play Cricket credentials first' })
      return
    }

    setImporting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/play-cricket/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          season,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Import complete! Found ${data.matchesFound} matches, imported ${data.matchesImported}, skipped ${data.matchesSkipped}`,
        })
        fetchSyncLogs()
      } else {
        setMessage({ type: 'error', text: data.error || 'Import failed' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to import matches' })
    } finally {
      setImporting(false)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  const isConfigured = club?.play_cricket_site_id && club?.play_cricket_api_token

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Integration</p>
            <h1 className={styles.title}>Play Cricket Import</h1>
            <p className={styles.subtitle}>
              Import match data and scorecards from Play Cricket using your club's Site ID
            </p>
          </div>
        </div>

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {/* Configuration Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuration</h2>
          <p className={styles.sectionDescription}>
            Enter your Play Cricket credentials. You can find your Site ID in the URL when viewing your club on play-cricket.com
          </p>

          <div className={styles.configForm}>
            <div className={styles.formGroup}>
              <label htmlFor="siteId" className={styles.label}>
                Play Cricket Site ID
              </label>
              <input
                id="siteId"
                type="text"
                className={styles.input}
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="e.g., 1234"
                disabled={testingConnection}
              />
              <p className={styles.hint}>
                Find this in your Play Cricket club URL: play-cricket.com/website/club_info.asp?id=<strong>XXXX</strong>
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="apiToken" className={styles.label}>
                API Token
              </label>
              <input
                id="apiToken"
                type="password"
                className={styles.input}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your API token"
                disabled={testingConnection}
              />
              <p className={styles.hint}>
                Contact Play Cricket support to obtain an API token for your club
              </p>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !siteId || !apiToken}
              className={styles.primaryButton}
            >
              {testingConnection ? 'Testing Connection...' : isConfigured ? 'Update & Test Connection' : 'Test Connection'}
            </button>

            {isConfigured && (
              <div className={styles.configStatus}>
                ✓ Play Cricket integration is configured
                {club.play_cricket_last_sync && (
                  <p>Last sync: {new Date(club.play_cricket_last_sync).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Import Section */}
        {isConfigured && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Import Matches</h2>
            <p className={styles.sectionDescription}>
              Select a season and optional date range to import matches from Play Cricket
            </p>

            <div className={styles.importForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="season" className={styles.label}>
                    Season Year
                  </label>
                  <select
                    id="season"
                    className={styles.select}
                    value={season}
                    onChange={(e) => setSeason(parseInt(e.target.value))}
                    disabled={importing}
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fromDate" className={styles.label}>
                    From Date (Optional)
                  </label>
                  <input
                    id="fromDate"
                    type="date"
                    className={styles.input}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={importing}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="toDate" className={styles.label}>
                    To Date (Optional)
                  </label>
                  <input
                    id="toDate"
                    type="date"
                    className={styles.input}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={importing}
                  />
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className={styles.primaryButton}
              >
                {importing ? 'Importing Matches...' : 'Import Matches'}
              </button>

              {importing && (
                <div className={styles.importingMessage}>
                  <div className={styles.spinner} />
                  <p>Importing matches... This may take a few minutes.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync History */}
        {syncLogs.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Import History</h2>
            <div className={styles.logsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Season</th>
                    <th>Status</th>
                    <th>Found</th>
                    <th>Imported</th>
                    <th>Skipped</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.started_at).toLocaleString()}</td>
                      <td>{log.season_year}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${log.status}`]}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.matches_found}</td>
                      <td>{log.matches_imported}</td>
                      <td>{log.matches_skipped}</td>
                      <td>{log.errors.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h3>How to Get Your API Token</h3>
          <ol>
            <li>Contact Play Cricket support at support@ecb.co.uk</li>
            <li>Request API access for your club</li>
            <li>Sign the API agreement</li>
            <li>Receive your API token</li>
          </ol>
          <p>
            <strong>Note:</strong> Your Site ID can be found in the URL when you visit your club page on play-cricket.com
          </p>
        </div>
      </div>
    </div>
  )
}
