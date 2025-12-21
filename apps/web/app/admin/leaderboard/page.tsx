import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'
import { LeaderboardFilters } from './filters'

type LeaderboardEntry = {
  player_id: string
  player_name: string
  total_points: number
  batting_points: number
  bowling_points: number
  fielding_points: number
  matches_played: number
  avg_points: number
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { season?: string; team?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: userRole } = await supabase
    .from('user_org_roles')
    .select('club_id')
    .eq('user_id', user?.id)
    .single()

  // Get seasons for filter
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('club_id', userRole?.club_id)
    .order('start_date', { ascending: false })

  // Get teams for filter
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, season_id')
    .eq('club_id', userRole?.club_id)
    .order('name')

  // Build query to get points
  let matchesQuery = supabase
    .from('matches')
    .select('id')
    .eq('club_id', userRole?.club_id)
    .eq('published', true)

  // Apply filters
  if (searchParams.season) {
    matchesQuery = matchesQuery.eq('season_id', searchParams.season)
  }
  if (searchParams.team) {
    matchesQuery = matchesQuery.eq('team_id', searchParams.team)
  }

  const { data: matches } = await matchesQuery

  const matchIds = matches?.map(m => m.id) || []

  // Get all points events for these matches
  const { data: pointsEvents } = await supabase
    .from('points_events')
    .select(`
      player_id,
      match_id,
      category,
      points,
      players (
        first_name,
        last_name
      )
    `)
    .in('match_id', matchIds.length > 0 ? matchIds : ['00000000-0000-0000-0000-000000000000'])

  // Aggregate points by player
  const leaderboard: Map<string, LeaderboardEntry> = new Map()

  pointsEvents?.forEach((event: any) => {
    if (!event.player_id) return

    const playerName = event.players
      ? `${event.players.first_name} ${event.players.last_name}`
      : 'Unknown Player'

    if (!leaderboard.has(event.player_id)) {
      leaderboard.set(event.player_id, {
        player_id: event.player_id,
        player_name: playerName,
        total_points: 0,
        batting_points: 0,
        bowling_points: 0,
        fielding_points: 0,
        matches_played: 0,
        avg_points: 0,
      })
    }

    const entry = leaderboard.get(event.player_id)!
    entry.total_points += event.points

    if (event.category === 'batting') {
      entry.batting_points += event.points
    } else if (event.category === 'bowling') {
      entry.bowling_points += event.points
    } else if (event.category === 'fielding') {
      entry.fielding_points += event.points
    }
  })

  // Calculate matches played per player
  const matchesByPlayer: Map<string, Set<string>> = new Map()
  pointsEvents?.forEach((event: any) => {
    if (!event.player_id) return
    if (!matchesByPlayer.has(event.player_id)) {
      matchesByPlayer.set(event.player_id, new Set())
    }
    matchesByPlayer.get(event.player_id)!.add(event.match_id)
  })

  // Update matches played and calculate average
  leaderboard.forEach((entry, playerId) => {
    const matchCount = matchesByPlayer.get(playerId)?.size || 0
    entry.matches_played = matchCount
    entry.avg_points = matchCount > 0 ? Math.round(entry.total_points / matchCount) : 0
  })

  // Sort by total points descending
  const sortedLeaderboard = Array.from(leaderboard.values()).sort(
    (a, b) => b.total_points - a.total_points
  )

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            Leaderboard
          </h1>
          <p style={{ color: '#6b7280' }}>
            Player rankings based on published matches
          </p>
        </div>
        <Link
          href="/admin/leaderboard/export"
          style={{
            padding: '10px 20px',
            background: '#059669',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Export to CSV
        </Link>
      </div>

      {/* Filters */}
      <LeaderboardFilters seasons={seasons || []} teams={teams || []} />

      {/* Leaderboard Table */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '60px' }}>
                Rank
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Player
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Total Points
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Batting
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Bowling
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Fielding
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Matches
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Avg/Match
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLeaderboard.length > 0 ? (
              sortedLeaderboard.map((entry, index) => (
                <tr key={entry.player_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#f59e0b' : '#f3f4f6',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: '600' }}>
                    {entry.player_name}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                    {entry.total_points}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: '#6b7280' }}>
                    {entry.batting_points}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: '#6b7280' }}>
                    {entry.bowling_points}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: '#6b7280' }}>
                    {entry.fielding_points}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: '#6b7280' }}>
                    {entry.matches_played}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>
                    {entry.avg_points}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ marginBottom: '16px' }}>
                    No points data available yet.
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Import and publish a match to see player rankings.
                  </div>
                  <Link
                    href="/admin/matches/import"
                    style={{
                      marginTop: '16px',
                      display: 'inline-block',
                      color: '#059669',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Import a match →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      {sortedLeaderboard.length > 0 && (
        <div style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Total Players
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {sortedLeaderboard.length}
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Total Points Awarded
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              {sortedLeaderboard.reduce((sum, e) => sum + e.total_points, 0)}
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Published Matches
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {matchIds.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
