'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.css'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface BattingCard {
  id: string
  player_id: string
  position: number | null
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissal_type: string | null
  dismissal_text: string | null
  is_out: boolean
  players: Player
}

interface BowlingCard {
  id: string
  player_id: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  players: Player
}

interface Innings {
  id: string
  innings_number: number
  batting_team: string
  total_runs: number | null
  wickets: number | null
  overs: number | null
  extras: number | null
  batting_cards: BattingCard[]
  bowling_cards: BowlingCard[]
}

interface Match {
  id: string
  match_date: string
  opponent_name: string
  venue: string | null
  match_type: string
  result: string
  published: boolean
  innings: Innings[]
}

export default function EditMatchPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch match')
      }

      setMatch(data.match)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!match) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save match')
      }

      router.push(`/admin/matches/${matchId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateMatchField = (field: string, value: any) => {
    setMatch(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updateInningsField = (inningsIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], [field]: value }
      return { ...prev, innings: newInnings }
    })
  }

  const updateBattingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const newCards = [...newInnings[inningsIdx].batting_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value }
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], batting_cards: newCards }
      return { ...prev, innings: newInnings }
    })
  }

  const updateBowlingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const newCards = [...newInnings[inningsIdx].bowling_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value }
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], bowling_cards: newCards }
      return { ...prev, innings: newInnings }
    })
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading}>Loading match...</div>
        </div>
      </div>
    )
  }

  if (error && !match) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/admin/matches" className={styles.backLink}>
            ← Back to Matches
          </Link>
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!match) return null

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <Link href={`/admin/matches/${matchId}`} className={styles.backLink}>
            ← Back to Match
          </Link>
          <div className={styles.actionGroup}>
            <button
              onClick={() => router.push(`/admin/matches/${matchId}`)}
              className={styles.secondaryButton}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={styles.primaryButton}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <header className={styles.header}>
          <span className={styles.kicker}>Match Editing</span>
          <h1 className={styles.title}>Edit Match</h1>
          <p className={styles.subtitle}>Update fixtures, innings, and scorecards.</p>
        </header>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Match Details</h2>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.fieldLabel}>
              Opponent
              <input
                type="text"
                value={match.opponent_name}
                onChange={(e) => updateMatchField('opponent_name', e.target.value)}
                className={styles.field}
              />
            </label>
            <label className={styles.fieldLabel}>
              Date
              <input
                type="date"
                value={match.match_date}
                onChange={(e) => updateMatchField('match_date', e.target.value)}
                className={styles.field}
              />
            </label>
            <label className={styles.fieldLabel}>
              Venue
              <input
                type="text"
                value={match.venue || ''}
                onChange={(e) => updateMatchField('venue', e.target.value)}
                className={styles.field}
              />
            </label>
            <label className={styles.fieldLabel}>
              Match Type
              <select
                value={match.match_type}
                onChange={(e) => updateMatchField('match_type', e.target.value)}
                className={styles.field}
              >
                <option value="league">League</option>
                <option value="cup">Cup</option>
                <option value="friendly">Friendly</option>
              </select>
            </label>
            <label className={styles.fieldLabel}>
              Result
              <select
                value={match.result}
                onChange={(e) => updateMatchField('result', e.target.value)}
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
        </section>

        {match.innings
          .sort((a, b) => a.innings_number - b.innings_number)
          .map((innings, inningsIdx) => (
            <section key={innings.id} className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2>
                  Innings {innings.innings_number} -{' '}
                  {innings.batting_team === 'home' ? 'Brookweald CC' : match.opponent_name}
                </h2>
                <span className={styles.pill}>Scorecard</span>
              </div>

              <div className={styles.inningsGrid}>
                <label className={styles.fieldLabel}>
                  Batting Team
                  <select
                    value={innings.batting_team}
                    onChange={(e) => updateInningsField(inningsIdx, 'batting_team', e.target.value)}
                    className={styles.field}
                  >
                    <option value="home">Brookweald CC</option>
                    <option value="away">Opposition</option>
                  </select>
                </label>
                <label className={styles.fieldLabel}>
                  Total Runs
                  <input
                    type="number"
                    value={innings.total_runs || 0}
                    onChange={(e) => updateInningsField(inningsIdx, 'total_runs', parseInt(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Wickets
                  <input
                    type="number"
                    value={innings.wickets || 0}
                    onChange={(e) => updateInningsField(inningsIdx, 'wickets', parseInt(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Overs
                  <input
                    type="number"
                    step="0.1"
                    value={innings.overs || 0}
                    onChange={(e) => updateInningsField(inningsIdx, 'overs', parseFloat(e.target.value))}
                    className={styles.field}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Extras
                  <input
                    type="number"
                    value={innings.extras || 0}
                    onChange={(e) => updateInningsField(inningsIdx, 'extras', parseInt(e.target.value))}
                    className={styles.field}
                  />
                </label>
              </div>

              {innings.batting_cards.length > 0 && (
                <div className={styles.tableBlock}>
                  <div className={styles.tableHeader}>
                    <h3>Batting</h3>
                    <span className={styles.muted}>Edit batting card values.</span>
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
                          <th>Out</th>
                          <th>Dismissal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.batting_cards.map((card, cardIdx) => (
                          <tr key={card.id}>
                            <td>
                              {card.players.first_name} {card.players.last_name}
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.runs}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'runs', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.balls_faced}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'balls_faced', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.fours}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'fours', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.sixes}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'sixes', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td className={styles.checkboxCell}>
                              <input
                                type="checkbox"
                                checked={card.is_out}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'is_out', e.target.checked)}
                                className={styles.checkbox}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={card.dismissal_text || ''}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'dismissal_text', e.target.value)}
                                placeholder="e.g., c Smith b Jones"
                                className={styles.tableInput}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {innings.bowling_cards.length > 0 && (
                <div className={styles.tableBlock}>
                  <div className={styles.tableHeader}>
                    <h3>Bowling</h3>
                    <span className={styles.muted}>Edit bowling card values.</span>
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
                          <th>Wides</th>
                          <th>No Balls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.bowling_cards.map((card, cardIdx) => (
                          <tr key={card.id}>
                            <td>
                              {card.players.first_name} {card.players.last_name}
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                value={card.overs}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'overs', parseFloat(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.maidens}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'maidens', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.runs_conceded}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'runs_conceded', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.wickets}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'wickets', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.wides}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'wides', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={card.no_balls}
                                onChange={(e) => updateBowlingCard(inningsIdx, cardIdx, 'no_balls', parseInt(e.target.value))}
                                className={styles.tableInput}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ))}

        <div className={styles.footerActions}>
          <button
            onClick={() => router.push(`/admin/matches/${matchId}`)}
            className={styles.secondaryButton}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.primaryButton}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
