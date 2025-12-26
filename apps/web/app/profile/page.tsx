'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChartComponent, BarChartComponent } from '../../components/charts';
import { exportPlayerStatsCSV } from '../../lib/export-utils';

interface PlayerProfile {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  bio?: string;
  preferred_position?: string;
  jersey_number?: number;
  photo_url?: string;
}

interface SeasonStats {
  season_id: string;
  total_points: number;
  batting_average: number;
  batting_strike_rate: number;
  runs_scored: number;
  wickets: number;
  bowling_average: number;
  bowling_economy: number;
  catches: number;
  fifties: number;
  hundreds: number;
  three_fors: number;
  five_fors: number;
}

interface MatchPerformance {
  match_id: string;
  match_date: string;
  runs_scored: number;
  wickets_taken: number;
  total_points: number;
  matches: {
    opponent_name: string;
    result: string;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerTotals, setCareerTotals] = useState<any>(null);
  const [recentPerformances, setRecentPerformances] = useState<
    MatchPerformance[]
  >([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch('/api/players/me');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to load profile');
      }

      const data = await response.json();
      setPlayer(data.player);
      setSeasonStats(data.seasonStats);
      setCareerTotals(data.careerTotals);
      setRecentPerformances(data.recentPerformances || []);
      setActiveSeason(data.activeSeason);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!player) return;
    exportPlayerStatsCSV(
      player.name,
      seasonStats,
      careerTotals,
      recentPerformances
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Profile
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const pointsTrendData = recentPerformances
    .slice()
    .reverse()
    .map((perf, index) => ({
      match: index + 1,
      points: perf.total_points || 0,
      opponent: perf.matches?.opponent_name || 'Unknown',
    }));

  const contributionData = [
    {
      category: 'Batting',
      points: seasonStats?.total_points
        ? Math.round((seasonStats.runs_scored || 0) * 0.6)
        : 0,
    },
    {
      category: 'Bowling',
      points: seasonStats?.total_points
        ? Math.round((seasonStats.wickets || 0) * 15)
        : 0,
    },
    {
      category: 'Fielding',
      points: seasonStats?.total_points
        ? Math.round((seasonStats.catches || 0) * 5)
        : 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              {player?.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="h-24 w-24 rounded-full object-cover mr-6"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center mr-6">
                  <span className="text-3xl font-bold text-white">
                    {player?.first_name?.[0]}
                    {player?.last_name?.[0]}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {player?.name}
                </h1>
                {player?.jersey_number && (
                  <p className="text-gray-600 mt-1">
                    #{player.jersey_number}
                  </p>
                )}
                {player?.preferred_position && (
                  <p className="text-gray-600 mt-1">
                    {player.preferred_position}
                  </p>
                )}
                {player?.bio && (
                  <p className="text-gray-600 mt-2 max-w-2xl">{player.bio}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Export Stats
              </button>
              <button
                onClick={() => router.push('/admin/profile')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Season Stats Cards */}
        {activeSeason && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {activeSeason.name} Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Points"
                value={seasonStats?.total_points || 0}
                icon="🏆"
              />
              <StatCard
                title="Batting Average"
                value={seasonStats?.batting_average?.toFixed(2) || '0.00'}
                icon="🏏"
              />
              <StatCard
                title="Strike Rate"
                value={seasonStats?.batting_strike_rate?.toFixed(2) || '0.00'}
                icon="⚡"
              />
              <StatCard
                title="Wickets"
                value={seasonStats?.wickets || 0}
                icon="🎯"
              />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Points Trend */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Points Trend (Last 10 Matches)
            </h3>
            {pointsTrendData.length > 0 ? (
              <LineChartComponent
                data={pointsTrendData}
                xKey="match"
                lines={[
                  { dataKey: 'points', name: 'Points', color: '#0ea5e9' },
                ]}
                height={250}
                showGrid={true}
                showLegend={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No match data available
              </p>
            )}
          </div>

          {/* Points Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Points Breakdown
            </h3>
            {contributionData.some((d) => d.points > 0) ? (
              <BarChartComponent
                data={contributionData}
                xKey="category"
                bars={[
                  { dataKey: 'points', name: 'Points', color: '#10b981' },
                ]}
                height={250}
                showGrid={true}
                showLegend={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No points data available
              </p>
            )}
          </div>
        </div>

        {/* Career Totals */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Career Totals
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <CareerStat label="Runs" value={careerTotals?.runs_scored || 0} />
            <CareerStat
              label="Highest Score"
              value={careerTotals?.highest_score || 0}
            />
            <CareerStat label="50s" value={careerTotals?.fifties || 0} />
            <CareerStat label="100s" value={careerTotals?.hundreds || 0} />
            <CareerStat label="Wickets" value={careerTotals?.wickets || 0} />
            <CareerStat
              label="Best Bowling"
              value={careerTotals?.best_bowling_wickets || 0}
            />
            <CareerStat label="3-fors" value={careerTotals?.three_fors || 0} />
            <CareerStat label="5-fors" value={careerTotals?.five_fors || 0} />
            <CareerStat label="Catches" value={careerTotals?.catches || 0} />
            <CareerStat label="Stumpings" value={careerTotals?.stumpings || 0} />
            <CareerStat
              label="Batting Avg"
              value={careerTotals?.batting_average?.toFixed(2) || 'N/A'}
            />
            <CareerStat
              label="Bowling Avg"
              value={careerTotals?.bowling_average?.toFixed(2) || 'N/A'}
            />
          </div>
        </div>

        {/* Recent Performances */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Performances
          </h2>
          {recentPerformances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Opponent
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Runs
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Wickets
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentPerformances.map((perf) => (
                    <tr key={perf.match_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(perf.match_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {perf.matches?.opponent_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {perf.runs_scored || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {perf.wickets_taken || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {perf.total_points || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            perf.matches?.result === 'won'
                              ? 'bg-green-100 text-green-800'
                              : perf.matches?.result === 'lost'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {perf.matches?.result || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No recent performances available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function CareerStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
