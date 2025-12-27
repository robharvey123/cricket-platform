import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubId = userRole.club_id;
    const { data: club } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .single();
    const clubName = club?.name || '';

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (!season) {
      return NextResponse.json({
        totalMatches: 0,
        totalPlayers: 0,
        recentMatches: [],
        topBatsmen: [],
        topBowlers: [],
        resultsBreakdown: { won: 0, lost: 0, tied: 0, draw: 0 },
      });
    }

    const { count: publishedMatchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('season_id', season.id)
      .eq('published', true);
    const { count: seasonMatchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('season_id', season.id);
    const useSeason = (seasonMatchCount || 0) > 0;
    const usePublished = (publishedMatchCount || 0) > 0;

    const applyMatchFilters = (query: any) => {
      let filtered = query.eq('club_id', clubId);
      if (useSeason) {
        filtered = filtered.eq('season_id', season.id);
      }
      if (usePublished) {
        filtered = filtered.eq('published', true);
      }
      return filtered;
    };

    // Get total players
    const { count: totalPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    // Get recent matches with aggregated stats
    const recentMatchesQuery = applyMatchFilters(
      supabase
        .from('matches')
        .select(
          `
          id,
          match_date,
          opponent_name,
          result
        `
        )
    )
      .order('match_date', { ascending: false })
      .limit(6);
    const { data: recentMatches } = await recentMatchesQuery;
    const effectiveRecentMatches = recentMatches || [];

    // For each match, get total runs and wickets
    const matchesWithStats = await Promise.all(
      (effectiveRecentMatches || []).map(async (match) => {
        // Get innings for this match
        const { data: innings } = await supabase
          .from('innings')
          .select('total_runs, wickets, batting_team')
          .eq('match_id', match.id);

        // Sum runs from our batting innings
        const ourInnings = innings?.filter((i) => i.batting_team === 'home') || [];
        const total_runs = ourInnings.reduce((sum, i) => sum + (i.total_runs || 0), 0);

        // Get wickets we took (from bowling cards)
        const { data: bowlingCards } = await supabase
          .from('bowling_cards')
          .select('wickets')
          .eq('match_id', match.id);

        const total_wickets = bowlingCards?.reduce(
          (sum, bc) => sum + (bc.wickets || 0),
          0
        ) || 0;

        return {
          ...match,
          total_runs,
          total_wickets,
        };
      })
    );

    // Get top batsmen
    const { data: topBatsmen } = await supabase
      .from('player_season_stats')
      .select(
        `
        runs_scored,
        players (
          first_name,
          last_name
        )
      `
      )
      .eq('season_id', season.id)
      .order('runs_scored', { ascending: false })
      .limit(5);

    const formattedBatsmen =
      topBatsmen?.map((stat: any) => ({
        player_name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
        runs: stat.runs_scored || 0,
      })) || [];

    // Get top bowlers
    const { data: topBowlers } = await supabase
      .from('player_season_stats')
      .select(
        `
        wickets,
        players (
          first_name,
          last_name
        )
      `
      )
      .eq('season_id', season.id)
      .order('wickets', { ascending: false })
      .limit(5);

    const formattedBowlers =
      topBowlers?.map((stat: any) => ({
        player_name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
        wickets: stat.wickets || 0,
      })) || [];

    // Get results breakdown
    const { data: allMatches } = await applyMatchFilters(
      supabase
        .from('matches')
        .select('result, opponent_name')
    );
    const effectiveAllMatches = allMatches || [];

    const { count: totalMatchCount } = await applyMatchFilters(
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
    );

    const normalizeResult = (value?: string | null, opponent?: string | null) => {
      const normalized = (value || '').toLowerCase().trim();
      if (!normalized) return null;
      if (['won', 'lost', 'tied', 'draw'].includes(normalized)) {
        return normalized as 'won' | 'lost' | 'tied' | 'draw';
      }
      if (normalized.includes('abandon')) return 'draw';
      if (normalized.includes('draw')) return 'draw';
      if (normalized.includes('tie')) return 'tied';
      if (normalized.includes('lost')) return 'lost';
      if (normalized.includes('win')) {
        const opponentName = (opponent || '').toLowerCase();
        const clubNameLower = clubName.toLowerCase();
        if (clubNameLower && normalized.includes(clubNameLower)) {
          return 'won';
        }
        if (opponentName && normalized.includes(opponentName)) {
          return 'lost';
        }
        return 'won';
      }
      return null;
    };

    const resultsBreakdown = {
      won: effectiveAllMatches?.filter((m) => normalizeResult(m.result, m.opponent_name) === 'won').length || 0,
      lost: effectiveAllMatches?.filter((m) => normalizeResult(m.result, m.opponent_name) === 'lost').length || 0,
      tied: effectiveAllMatches?.filter((m) => normalizeResult(m.result, m.opponent_name) === 'tied').length || 0,
      draw: effectiveAllMatches?.filter((m) => normalizeResult(m.result, m.opponent_name) === 'draw').length || 0,
    };

    return NextResponse.json({
      totalMatches: totalMatchCount || 0,
      totalPlayers: totalPlayers || 0,
      recentMatches: matchesWithStats,
      topBatsmen: formattedBatsmen,
      topBowlers: formattedBowlers,
      resultsBreakdown,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
