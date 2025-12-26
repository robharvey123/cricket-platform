'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from '../../../../components/charts';

interface TeamStats {
  team: {
    id: string;
    name: string;
  };
  season: {
    id: string;
    name: string;
  };
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  draws: number;
  totalRuns: number;
  totalWickets: number;
  topBatsmen: {
    player_name: string;
    runs: number;
  }[];
  topBowlers: {
    player_name: string;
    wickets: number;
  }[];
  recentMatches: {
    id: string;
    match_date: string;
    opponent_name: string;
    result: string;
    runs: number;
    wickets: number;
  }[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamStats();
  }, [teamId]);

  async function fetchTeamStats() {
    try {
      const response = await fetch(`/api/teams/${teamId}/stats`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load team stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4" />
          <p className="text-gray-600">Loading team stats...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Team Stats
          </h1>
          <p className="text-gray-600 mb-6">{error || 'Team not found'}</p>
          <button
            onClick={() => router.push('/admin/teams')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  const resultsData = [
    { name: 'Won', value: stats.wins },
    { name: 'Lost', value: stats.losses },
    { name: 'Tied', value: stats.ties },
    { name: 'Draw', value: stats.draws },
  ].filter((item) => item.value > 0);

  const matchTrendData = stats.recentMatches
    .slice()
    .reverse()
    .map((match, index) => ({
      match: index + 1,
      runs: match.runs || 0,
      wickets: match.wickets || 0,
      opponent: match.opponent_name,
    }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/teams"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Teams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{stats.team.name}</h1>
          <p className="text-gray-600 mt-1">
            {stats.season.name} Season Analytics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Matches</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalMatches}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Wins</p>
            <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Runs</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalRuns}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Wickets</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.totalWickets}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Results Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Season Results
            </h3>
            {resultsData.length > 0 ? (
              <PieChartComponent
                data={resultsData}
                nameKey="name"
                valueKey="value"
                height={300}
                showLegend={true}
                colors={['#10b981', '#ef4444', '#f59e0b', '#6b7280']}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No match results available
              </p>
            )}
          </div>

          {/* Runs Trend */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Runs per Match
            </h3>
            {matchTrendData.length > 0 ? (
              <LineChartComponent
                data={matchTrendData}
                xKey="match"
                lines={[{ dataKey: 'runs', name: 'Runs', color: '#0ea5e9' }]}
                height={300}
                showGrid={true}
                showLegend={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No match data available
              </p>
            )}
          </div>

          {/* Top Batsmen */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Batsmen (Season)
            </h3>
            {stats.topBatsmen.length > 0 ? (
              <BarChartComponent
                data={stats.topBatsmen.slice(0, 5)}
                xKey="player_name"
                bars={[{ dataKey: 'runs', name: 'Runs', color: '#8b5cf6' }]}
                height={300}
                layout="horizontal"
                showGrid={true}
                showLegend={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No batting data available
              </p>
            )}
          </div>

          {/* Top Bowlers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Bowlers (Season)
            </h3>
            {stats.topBowlers.length > 0 ? (
              <BarChartComponent
                data={stats.topBowlers.slice(0, 5)}
                xKey="player_name"
                bars={[
                  { dataKey: 'wickets', name: 'Wickets', color: '#10b981' },
                ]}
                height={300}
                layout="horizontal"
                showGrid={true}
                showLegend={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No bowling data available
              </p>
            )}
          </div>
        </div>

        {/* Recent Matches Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Matches
          </h3>
          {stats.recentMatches.length > 0 ? (
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(match.match_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <Link
                          href={`/admin/matches/${match.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          vs {match.opponent_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {match.runs || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {match.wickets || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            match.result === 'won'
                              ? 'bg-green-100 text-green-800'
                              : match.result === 'lost'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {match.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No matches available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
