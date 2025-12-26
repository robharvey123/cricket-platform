'use client'

import { useEffect, useState } from 'react'
import { useUserRole } from '../../../lib/hooks/useUserRole'
import styles from './page.module.css'

interface AuditLog {
  id: string
  user_email: string
  user_role: string
  action: string
  entity_type: string
  entity_id: string
  changes: any
  metadata: any
  created_at: string
}

export default function AuditLogPage() {
  const { permissions } = useUserRole()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    entityType: 'all',
    action: 'all',
    limit: 50
  })

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.entityType !== 'all') params.append('entityType', filter.entityType)
      if (filter.action !== 'all') params.append('action', filter.action)
      params.append('limit', filter.limit.toString())

      const response = await fetch(`/api/audit?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }

      setLogs(data.logs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return '#059669'
      case 'update': return '#3b82f6'
      case 'delete': return '#dc2626'
      default: return '#64748b'
    }
  }

  const formatEntityType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (!permissions?.canEditScoringConfig) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.alert}>
            You do not have permission to access audit logs.
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading audit logs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Activity Tracking</span>
            <h1 className={styles.title}>Audit Log</h1>
            <p className={styles.subtitle}>
              View all changes and actions made in your club
            </p>
          </div>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Entity Type</label>
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="match">Matches</option>
              <option value="player">Players</option>
              <option value="season">Seasons</option>
              <option value="team">Teams</option>
              <option value="user_role">User Roles</option>
              <option value="scoring_config">Scoring Config</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Action</label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Show</label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter({ ...filter, limit: parseInt(e.target.value) })}
              className={styles.filterSelect}
            >
              <option value="25">Last 25</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="250">Last 250</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Activity History ({logs.length})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.timestamp}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>{log.user_email || 'System'}</td>
                    <td>
                      <span className={styles.roleBadge}>
                        {log.user_role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={styles.actionBadge}
                        style={{ background: getActionColor(log.action) }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className={styles.entityType}>
                      {formatEntityType(log.entity_type)}
                    </td>
                    <td className={styles.details}>
                      {log.changes && (
                        <details className={styles.detailsExpand}>
                          <summary>View Changes</summary>
                          <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                        </details>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className={styles.detailsExpand}>
                          <summary>View Metadata</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className={styles.emptyState}>
              No audit logs found matching your filters.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
