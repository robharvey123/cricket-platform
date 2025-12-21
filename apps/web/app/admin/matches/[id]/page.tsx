import { createClient } from '../../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const matchId = params.id

  // Fetch match with team and season
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      teams (
        name,
        seasons (
          name
        )
      )
    `)
    .eq('id', matchId)
    .single()

  if (!match) {
    notFound()
  }

  // Fetch innings with batting and bowling cards (with player names)
  const { data: innings } = await supabase
    .from('innings')
    .select(`
      *,
      batting_cards (
        *,
        players (
          first_name,
          last_name
        )
      ),
      bowling_cards (
        *,
        players (
          first_name,
          last_name
        )
      )
    `)
    .eq('match_id', matchId)
    .order('innings_number')

  const canPublish = !match.published && innings && innings.length > 0

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ marginBottom: '8px' }}>
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
            {match.teams?.name} vs {match.opponent_name}
          </h1>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            <span>{new Date(match.match_date).toLocaleDateString()}</span>
            {match.venue && <span> • {match.venue}</span>}
            {match.match_type && <span> • {match.match_type}</span>}
          </div>
          <div style={{ marginTop: '8px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '500',
              background: match.published ? '#d1fae5' : '#fef3c7',
              color: match.published ? '#065f46' : '#92400e'
            }}>
              {match.published ? 'Published' : 'Draft'}
            </span>
            {match.source && (
              <span style={{
                marginLeft: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '500',
                background: '#f3f4f6',
                color: '#374151'
              }}>
                {match.source === 'play-cricket' ? '📡 Play-Cricket' : match.source === 'csv' ? '📄 CSV Import' : '✏️ Manual'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {canPublish && (
            <Link
              href={`/admin/matches/${matchId}/publish`}
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
              Publish Match
            </Link>
          )}
          {!match.published && (
            <Link
              href={`/admin/matches/${matchId}/edit`}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Result */}
      {match.result && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
            {match.result}
          </h2>
        </div>
      )}

      {/* Innings Scorecards */}
      {innings && innings.length > 0 ? (
        innings.map((inn) => (
          <div key={inn.id} style={{ marginBottom: '32px' }}>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 24px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                  {inn.batting_team} - Innings {inn.innings_number}
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
                  {inn.total_runs}/{inn.wickets}
                  <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                    ({inn.overs} overs)
                  </span>
                </p>
              </div>

              {/* Batting Card */}
              <div style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
                  BATTING
                </h4>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Batsman</th>
                      <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Dismissal</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>R</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>B</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>4s</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>6s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inn.batting_cards?.map((card: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 0', fontWeight: '500' }}>
                          {card.players?.first_name} {card.players?.last_name}
                        </td>
                        <td style={{ padding: '12px 0', fontSize: '12px', color: '#6b7280' }}>
                          {card.is_out ? card.dismissal_type : 'not out'}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.runs}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.balls_faced}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.fours}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.sixes}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: '600' }}>
                      <td colSpan={2} style={{ padding: '12px 0' }}>
                        Extras
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>
                        {inn.extras || 0}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bowling Card */}
              {inn.bowling_cards && inn.bowling_cards.length > 0 && (
                <div style={{ padding: '0 24px 24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
                    BOWLING
                  </h4>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Bowler</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>O</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>M</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>R</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>W</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.bowling_cards.map((card: any, idx: number) => {
                        const economy = card.overs > 0 ? (card.runs_conceded / card.overs).toFixed(2) : '0.00'
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 0', fontWeight: '500' }}>
                              {card.players?.first_name} {card.players?.last_name}
                            </td>
                            <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.overs}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.maidens}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.runs_conceded}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right' }}>{card.wickets}</td>
                            <td style={{ padding: '12px 0', textAlign: 'right' }}>{economy}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div style={{
          background: 'white',
          padding: '48px 24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No innings data available for this match.
        </div>
      )}
    </div>
  )
}
