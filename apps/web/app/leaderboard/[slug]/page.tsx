'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  player_name: string;
  player_id: string;
  total_runs?: number;
  innings_count?: number;
  batting_average?: number;
  strike_rate?: number;
  total_wickets?: number;
  bowling_average?: number;
  economy?: number;
  total_points?: number;
  batting_points?: number;
  bowling_points?: number;
  fielding_points?: number;
}

interface ClubData {
  name: string;
  slug: string;
  brand?: {
    primary?: string;
    secondary?: string;
    logo_url?: string;
  };
}

interface SeasonData {
  name: string;
  start_date: string;
  end_date: string;
}

export default function PublicLeaderboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tab = searchParams.get('tab') || 'points';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [club, setClub] = useState<ClubData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [slug, tab]);

  async function fetchLeaderboard() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/public/leaderboard?slug=${slug}&tab=${tab}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load leaderboard');
      }

      const data = await response.json();
      setClub(data.club);
      setSeason(data.season);
      setLeaderboard(data.leaderboard);
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
          <p className="text-gray-600">Loading leaderboard...</p>
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
            Error Loading Leaderboard
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = club?.brand?.primary || '#0ea5e9';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="bg-white border-b shadow-sm"
        style={{ borderBottomColor: primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {club?.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {season?.name} Season Leaderboard
              </p>
            </div>
            {club?.brand?.logo_url && (
              <img
                src={club.brand.logo_url}
                alt={`${club.name} logo`}
                className="h-16 w-16 object-contain"
              />
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {['points', 'batting', 'bowling'].map((tabName) => (
              <Link
                key={tabName}
                href={`/leaderboard/${slug}?tab=${tabName}`}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm capitalize
                  ${
                    tab === tabName
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tabName}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Leaderboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No data available for this season yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  {tab === 'batting' && (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Runs
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Innings
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SR
                      </th>
                    </>
                  )}
                  {tab === 'bowling' && (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wickets
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Economy
                      </th>
                    </>
                  )}
                  {tab === 'points' && (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batting
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bowling
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fielding
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.player_id}
                    className={index < 3 ? 'bg-yellow-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`
                            inline-flex items-center justify-center w-8 h-8 rounded-full
                            ${
                              index === 0
                                ? 'bg-yellow-400 text-yellow-900'
                                : index === 1
                                ? 'bg-gray-300 text-gray-900'
                                : index === 2
                                ? 'bg-orange-400 text-orange-900'
                                : 'bg-gray-100 text-gray-600'
                            }
                            font-semibold text-sm
                          `}
                        >
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.player_name}
                      </div>
                    </td>
                    {tab === 'batting' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {entry.total_runs || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.innings_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.batting_average?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.strike_rate?.toFixed(2) || '0.00'}
                        </td>
                      </>
                    )}
                    {tab === 'bowling' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {entry.total_wickets || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.bowling_average?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.economy?.toFixed(2) || '0.00'}
                        </td>
                      </>
                    )}
                    {tab === 'points' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {entry.total_points || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.batting_points || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.bowling_points || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                          {entry.fielding_points || 0}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            {season?.name} • {new Date(season?.start_date || '').getFullYear()}
          </p>
          <p className="mt-2">
            Powered by{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              Cricket Club Platform
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
