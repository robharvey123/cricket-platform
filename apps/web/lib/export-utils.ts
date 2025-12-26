/**
 * Export utilities for generating CSV and PDF downloads
 */

/**
 * Convert data to CSV format
 */
export function convertToCSV(
  data: any[],
  headers: { key: string; label: string }[]
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headerRow = headers.map((h) => h.label).join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    return headers
      .map((h) => {
        const value = row[h.key];
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in strings
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(
  data: any[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export leaderboard to CSV
 */
export function exportLeaderboardCSV(
  data: any[],
  type: 'batting' | 'bowling' | 'points',
  seasonName: string
): void {
  let headers: { key: string; label: string }[] = [];
  let filename = '';

  if (type === 'batting') {
    headers = [
      { key: 'rank', label: 'Rank' },
      { key: 'player_name', label: 'Player' },
      { key: 'total_runs', label: 'Runs' },
      { key: 'innings_count', label: 'Innings' },
      { key: 'batting_average', label: 'Average' },
      { key: 'strike_rate', label: 'Strike Rate' },
      { key: 'highest_score', label: 'Highest Score' },
      { key: 'fifties', label: '50s' },
      { key: 'hundreds', label: '100s' },
      { key: 'fours', label: '4s' },
      { key: 'sixes', label: '6s' },
    ];
    filename = `batting-leaderboard-${seasonName}.csv`;
  } else if (type === 'bowling') {
    headers = [
      { key: 'rank', label: 'Rank' },
      { key: 'player_name', label: 'Player' },
      { key: 'total_wickets', label: 'Wickets' },
      { key: 'overs_bowled', label: 'Overs' },
      { key: 'bowling_average', label: 'Average' },
      { key: 'economy', label: 'Economy' },
      { key: 'bowling_strike_rate', label: 'Strike Rate' },
      { key: 'best_bowling', label: 'Best Bowling' },
      { key: 'three_fors', label: '3-fors' },
      { key: 'five_fors', label: '5-fors' },
      { key: 'maidens', label: 'Maidens' },
    ];
    filename = `bowling-leaderboard-${seasonName}.csv`;
  } else {
    headers = [
      { key: 'rank', label: 'Rank' },
      { key: 'player_name', label: 'Player' },
      { key: 'total_points', label: 'Total Points' },
      { key: 'batting_points', label: 'Batting Points' },
      { key: 'bowling_points', label: 'Bowling Points' },
      { key: 'fielding_points', label: 'Fielding Points' },
      { key: 'matches_played', label: 'Matches' },
    ];
    filename = `points-leaderboard-${seasonName}.csv`;
  }

  downloadCSV(data, headers, filename);
}

/**
 * Export player stats to CSV
 */
export function exportPlayerStatsCSV(
  playerName: string,
  seasonStats: any,
  careerTotals: any,
  recentMatches: any[]
): void {
  // Season stats
  const seasonData = [
    { metric: 'Season', value: seasonStats?.season_name || 'Current Season' },
    { metric: 'Total Points', value: seasonStats?.total_points || 0 },
    {
      metric: 'Batting Average',
      value: seasonStats?.batting_average?.toFixed(2) || '0.00',
    },
    {
      metric: 'Strike Rate',
      value: seasonStats?.batting_strike_rate?.toFixed(2) || '0.00',
    },
    { metric: 'Runs Scored', value: seasonStats?.runs_scored || 0 },
    { metric: 'Wickets', value: seasonStats?.wickets || 0 },
    {
      metric: 'Bowling Average',
      value: seasonStats?.bowling_average?.toFixed(2) || '0.00',
    },
    {
      metric: 'Economy',
      value: seasonStats?.bowling_economy?.toFixed(2) || '0.00',
    },
  ];

  const seasonCSV = convertToCSV(seasonData, [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ]);

  // Recent matches
  const matchHeaders = [
    { key: 'match_date', label: 'Date' },
    { key: 'opponent', label: 'Opponent' },
    { key: 'runs_scored', label: 'Runs' },
    { key: 'wickets_taken', label: 'Wickets' },
    { key: 'total_points', label: 'Points' },
    { key: 'result', label: 'Result' },
  ];

  const matchData = recentMatches.map((m) => ({
    match_date: new Date(m.match_date).toLocaleDateString(),
    opponent: m.matches?.opponent_name || 'Unknown',
    runs_scored: m.runs_scored || 0,
    wickets_taken: m.wickets_taken || 0,
    total_points: m.total_points || 0,
    result: m.matches?.result || 'N/A',
  }));

  const matchCSV = convertToCSV(matchData, matchHeaders);

  // Combine both sections
  const fullCSV = `${playerName} - Season Statistics\n\n${seasonCSV}\n\n\nRecent Match Performances\n\n${matchCSV}`;

  const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${playerName.replace(/\s+/g, '-')}-stats.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
