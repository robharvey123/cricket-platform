'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type PointsTrend = {
  match_date: string
  player_name: string
  cumulative_points: number
}

type CategoryBreakdown = {
  category: string
  points: number
}

type TopPerformer = {
  player_name: string
  points: number
}

const COLORS = ['#2563eb', '#059669', '#dc2626', '#f59e0b', '#8b5cf6']

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [pointsTrend, setPointsTrend] = useState<PointsTrend[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [topBatters, setTopBatters] = useState<TopPerformer[]>([])
  const [topBowlers, setTopBowlers] = useState<TopPerformer[]>([])
  const [topFielders, setTopFielders] = useState<TopPerformer[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userRole } = await supabase
          .from('user_org_roles')
          .select('club_id')
          .eq('user_id', user?.id)
          .single()

        if (!userRole?.club_id) return

        // Get all published matches
        const { data: matches } = await supabase
          .from('matches')
          .select('id, match_date')
          .eq('club_id', userRole.club_id)
          .eq('published', true)
          .order('match_date')

        const matchIds = matches?.map(m => m.id) || []

        // Get all points events
        const { data: events } = await supabase
          .from('points_events')
          .select(`
            player_id,
            match_id,
            category,
            points,
            players (first_name, last_name),
            matches (match_date)
          `)
          .in('match_id', matchIds.length > 0 ? matchIds : ['00000000-0000-0000-0000-000000000000'])

        if (!events) return

        // Calculate cumulative points trend (top 5 players)
        const playerTotals = new Map<string, number>()
        events.forEach((e: any) => {
          const total = playerTotals.get(e.player_id) || 0
          playerTotals.set(e.player_id, total + e.points)
        })

        const top5Players = Array.from(playerTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id)

        const trendData: any[] = []
        const playerCumulativePoints = new Map<string, number>()

        matches?.forEach((match) => {
          const matchEvents = events.filter((e: any) => e.match_id === match.id)

          matchEvents.forEach((event: any) => {
            if (!top5Players.includes(event.player_id)) return

            const current = playerCumulativePoints.get(event.player_id) || 0
            const newTotal = current + event.points
            playerCumulativePoints.set(event.player_id, newTotal)

            trendData.push({
              match_date: new Date(match.match_date).toLocaleDateString(),
              player_name: `${event.players.first_name} ${event.players.last_name}`,
              cumulative_points: newTotal,
              player_id: event.player_id,
            })
          })
        })

        setPointsTrend(trendData)

        // Category breakdown (total across all players)
        const categoryTotals = new Map<string, number>()
        events.forEach((e: any) => {
          const total = categoryTotals.get(e.category) || 0
          categoryTotals.set(e.category, total + e.points)
        })

        setCategoryBreakdown([
          { category: 'Batting', points: categoryTotals.get('batting') || 0 },
          { category: 'Bowling', points: categoryTotals.get('bowling') || 0 },
          { category: 'Fielding', points: categoryTotals.get('fielding') || 0 },
        ])

        // Top performers by category
        const battingPoints = new Map<string, { name: string; points: number }>()
        const bowlingPoints = new Map<string, { name: string; points: number }>()
        const fieldingPoints = new Map<string, { name: string; points: number }>()

        events.forEach((e: any) => {
          const name = `${e.players.first_name} ${e.players.last_name}`

          if (e.category === 'batting') {
            const current = battingPoints.get(e.player_id)
            battingPoints.set(e.player_id, {
              name,
              points: (current?.points || 0) + e.points,
            })
          } else if (e.category === 'bowling') {
            const current = bowlingPoints.get(e.player_id)
            bowlingPoints.set(e.player_id, {
              name,
              points: (current?.points || 0) + e.points,
            })
          } else if (e.category === 'fielding') {
            const current = fieldingPoints.get(e.player_id)
            fieldingPoints.set(e.player_id, {
              name,
              points: (current?.points || 0) + e.points,
            })
          }
        })

        setTopBatters(
          Array.from(battingPoints.values())
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map(p => ({ player_name: p.name, points: p.points }))
        )

        setTopBowlers(
          Array.from(bowlingPoints.values())
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map(p => ({ player_name: p.name, points: p.points }))
        )

        setTopFielders(
          Array.from(fieldingPoints.values())
            .sort((a, b) => b.points - a.points)
            .slice(0, 5)
            .map(p => ({ player_name: p.name, points: p.points }))
        )
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading analytics...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          Analytics & Statistics
        </h1>
        <p style={{ color: '#6b7280' }}>
          Visual insights into player performance and team statistics
        </p>
      </div>

      {/* Points Accumulation Trend */}
      {pointsTrend.length > 0 && (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Points Accumulation Over Time (Top 5 Players)
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={pointsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="match_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Array.from(new Set(pointsTrend.map(d => d.player_name))).map((name, idx) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey="cumulative_points"
                  data={pointsTrend.filter(d => d.player_name === name)}
                  name={name}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.some(c => c.points > 0) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Points Distribution by Category
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="points"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Points by Category (Bar Chart)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {topBatters.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#2563eb' }}>
              🏏 Top Batters
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topBatters} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="player_name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="points" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {topBowlers.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#059669' }}>
              🎯 Top Bowlers
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topBowlers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="player_name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="points" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {topFielders.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#dc2626' }}>
              🧤 Top Fielders
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topFielders} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="player_name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="points" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {pointsTrend.length === 0 && (
        <div style={{
          background: 'white',
          padding: '48px 24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No Data Available Yet
          </div>
          <div style={{ marginBottom: '16px' }}>
            Publish some matches to see beautiful analytics and charts!
          </div>
        </div>
      )}
    </div>
  )
}
