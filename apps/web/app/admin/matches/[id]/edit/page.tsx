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
  dismissal_fielder_id?: string | null
  dismissal_bowler_id?: string | null
  dismissal_bowler_name?: string | null
  dismissal_fielder_name?: string | null
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

interface FieldingCard {
  id: string
  player_id: string
  catches: number
  stumpings: number
  runouts: number
  drops: number
  misfields: number
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
  fielding_cards: FieldingCard[]
  team_players: Array<{
    player_id: string
    players: Player
  }>
}

export default function EditMatchPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldingLoading, setFieldingLoading] = useState(false)
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
      newInnings[inningsIdx] = { ...newInnings[inningsIdx], [field]: value } as Innings
      return { ...prev, innings: newInnings }
    })
  }

  const updateBattingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const innings = newInnings[inningsIdx]
      if (!innings) return prev
      const newCards = [...innings.batting_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value } as BattingCard
      newInnings[inningsIdx] = { ...innings, batting_cards: newCards } as Innings
      return { ...prev, innings: newInnings }
    })
  }

  const updateBowlingCard = (inningsIdx: number, cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newInnings = [...prev.innings]
      const innings = newInnings[inningsIdx]
      if (!innings) return prev
      const newCards = [...innings.bowling_cards]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value } as BowlingCard
      newInnings[inningsIdx] = { ...innings, bowling_cards: newCards } as Innings
      return { ...prev, innings: newInnings }
    })
  }

  const handleGenerateFieldingRows = async () => {
    setFieldingLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/matches/${matchId}/fielding`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate fielding rows')
      }
      await fetchMatch()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setFieldingLoading(false)
    }
  }

  const parseDismissalNames = (text: string | null | undefined) => {
    if (!text) return { bowler: '', fielder: '' }
    const lower = text.toLowerCase()
    let bowler = ''
    let fielder = ''
    const bowlerMatch = lower.includes(' b ')
      ? text.split(/ b /i).slice(1).join(' b ').trim()
      : ''
    if (bowlerMatch) {
      bowler = bowlerMatch
    }
    const caughtMatch = text.match(/c(?:t)?\s+([^b]+?)\s+b\s+/i)
    if (caughtMatch?.[1]) {
      fielder = caughtMatch[1].trim()
    }
    const stumpedMatch = text.match(/st\s+([^b]+?)\s+b\s+/i)
    if (stumpedMatch?.[1]) {
      fielder = stumpedMatch[1].trim()
    }
    const runOutMatch = text.match(/run out\s*\(([^)]+)\)/i)
    if (runOutMatch?.[1]) {
      fielder = runOutMatch[1].trim()
    }
    return { bowler, fielder }
  }

  const updateFieldingCard = (cardIdx: number, field: string, value: any) => {
    setMatch(prev => {
      if (!prev) return null
      const newCards = [...(prev.fielding_cards || [])]
      newCards[cardIdx] = { ...newCards[cardIdx], [field]: value } as FieldingCard
      return { ...prev, fielding_cards: newCards }
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

  const teamPlayers = (match.team_players || [])
    .map((row) => row.players)
    .filter(Boolean)

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
                          <th>Type</th>
                          <th>Bowler</th>
                          <th>Fielder</th>
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
                              <select
                                value={card.dismissal_type || ''}
                                onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'dismissal_type', e.target.value || null)}
                                className={styles.tableInput}
                                disabled={!card.is_out || innings.batting_team === 'home'}
                              >
                                <option value="">-</option>
                                <option value="caught">Caught</option>
                                <option value="bowled">Bowled</option>
                                <option value="lbw">LBW</option>
                                <option value="run out">Run Out</option>
                                <option value="stumped">Stumped</option>
                                <option value="hit wicket">Hit Wicket</option>
                                <option value="retired">Retired</option>
                              </select>
                            </td>
                            <td>
                              {innings.batting_team === 'home' ? (
                                <span className={styles.muted}>
                                  {card.dismissal_bowler_name ||
                                    parseDismissalNames(card.dismissal_text).bowler ||
                                    '-'}
                                </span>
                              ) : (
                                <select
                                  value={card.dismissal_bowler_id || ''}
                                  onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'dismissal_bowler_id', e.target.value || null)}
                                  className={styles.tableInput}
                                  disabled={!card.is_out}
                                >
                                  <option value="">-</option>
                                  {teamPlayers.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.first_name} {player.last_name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td>
                              {innings.batting_team === 'home' ? (
                                <span className={styles.muted}>
                                  {card.dismissal_fielder_name ||
                                    parseDismissalNames(card.dismissal_text).fielder ||
                                    '-'}
                                </span>
                              ) : (
                                <select
                                  value={card.dismissal_fielder_id || ''}
                                  onChange={(e) => updateBattingCard(inningsIdx, cardIdx, 'dismissal_fielder_id', e.target.value || null)}
                                  className={styles.tableInput}
                                  disabled={!card.is_out}
                                >
                                  <option value="">-</option>
                                  {teamPlayers.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.first_name} {player.last_name}
                                    </option>
                                  ))}
                                </select>
                              )}
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

        {match.fielding_cards?.length > 0 && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Fielding</h2>
              <div className={styles.fieldingHeader}>
                <span className={styles.muted}>Record dropped catches before publishing.</span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleGenerateFieldingRows}
                  disabled={fieldingLoading}
                >
                  {fieldingLoading ? 'Generating...' : 'Generate fielding rows'}
                </button>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Catches</th>
                    <th>Stumpings</th>
                    <th>Run Outs</th>
                    <th>Drops</th>
                    <th>Misfields</th>
                  </tr>
                </thead>
                <tbody>
                  {match.fielding_cards.map((card, cardIdx) => (
                    <tr key={card.id}>
                      <td>
                        {card.players.first_name} {card.players.last_name}
                      </td>
                      <td>
                        <input
                          type="number"
                          value={card.catches ?? 0}
                          onChange={(e) => updateFieldingCard(cardIdx, 'catches', parseInt(e.target.value) || 0)}
                          className={styles.tableInput}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={card.stumpings ?? 0}
                          onChange={(e) => updateFieldingCard(cardIdx, 'stumpings', parseInt(e.target.value) || 0)}
                          className={styles.tableInput}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={card.runouts ?? 0}
                          onChange={(e) => updateFieldingCard(cardIdx, 'runouts', parseInt(e.target.value) || 0)}
                          className={styles.tableInput}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={card.drops ?? 0}
                          onChange={(e) => updateFieldingCard(cardIdx, 'drops', parseInt(e.target.value) || 0)}
                          className={styles.tableInput}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={card.misfields ?? 0}
                          onChange={(e) => updateFieldingCard(cardIdx, 'misfields', parseInt(e.target.value) || 0)}
                          className={styles.tableInput}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(!match.fielding_cards || match.fielding_cards.length === 0) && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Fielding</h2>
              <span className={styles.muted}>No fielding rows yet.</span>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGenerateFieldingRows}
              disabled={fieldingLoading}
            >
              {fieldingLoading ? 'Generating...' : 'Generate fielding rows'}
            </button>
          </section>
        )}

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
