import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
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

    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('club_id', clubId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (!season) {
      return NextResponse.json({
        team,
        season: null,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        draws: 0,
        totalRuns: 0,
        totalWickets: 0,
        topBatsmen: [],
        topBowlers: [],
        recentMatches: [],
      });
    }

    // Get all matches for this team in the active season
    const { data: matches } = await supabase
      .from('matches')
      .select('id, match_date, opponent_name, result')
      .eq('team_id', teamId)
      .eq('season_id', season.id)
      .order('match_date', { ascending: false });

    const totalMatches = matches?.length || 0;
    const wins = matches?.filter((m) => m.result === 'won').length || 0;
    const losses = matches?.filter((m) => m.result === 'lost').length || 0;
    const ties = matches?.filter((m) => m.result === 'tied').length || 0;
    const draws = matches?.filter((m) => m.result === 'draw').length || 0;

    // Get total runs and wickets for recent matches
    const matchesWithStats = await Promise.all(
      (matches || []).map(async (match) => {
        // Get batting innings for this match
        const { data: innings } = await supabase
          .from('innings')
          .select('runs, is_batting')
          .eq('match_id', match.id);

        const ourInnings = innings?.filter((i) => i.is_batting) || [];
        const runs = ourInnings.reduce((sum, i) => sum + (i.runs || 0), 0);

        // Get wickets from bowling cards
        const { data: bowlingCards } = await supabase
          .from('bowling_cards')
          .select('wickets')
          .eq('match_id', match.id);

        const wickets = bowlingCards?.reduce(
          (sum, bc) => sum + (bc.wickets || 0),
          0
        ) || 0;

        return {
          ...match,
          runs,
          wickets,
        };
      })
    );

    const totalRuns = matchesWithStats.reduce(
      (sum, m) => sum + (m.runs || 0),
      0
    );
    const totalWickets = matchesWithStats.reduce(
      (sum, m) => sum + (m.wickets || 0),
      0
    );

    // Get top batsmen for this team in the active season
    const { data: squadPlayers } = await supabase
      .from('squads')
      .select('player_id')
      .eq('team_id', teamId)
      .eq('season_id', season.id);

    const playerIds = squadPlayers?.map((sp) => sp.player_id) || [];

    // Get batting stats for squad players
    const { data: battingStats } = await supabase
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
      .in('player_id', playerIds)
      .order('runs_scored', { ascending: false })
      .limit(5);

    const topBatsmen =
      battingStats?.map((stat: any) => ({
        player_name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
        runs: stat.runs_scored || 0,
      })) || [];

    // Get bowling stats for squad players
    const { data: bowlingStats } = await supabase
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
      .in('player_id', playerIds)
      .order('wickets', { ascending: false })
      .limit(5);

    const topBowlers =
      bowlingStats?.map((stat: any) => ({
        player_name: `${stat.players?.first_name || ''} ${stat.players?.last_name || ''}`.trim(),
        wickets: stat.wickets || 0,
      })) || [];

    return NextResponse.json({
      team,
      season,
      totalMatches,
      wins,
      losses,
      ties,
      draws,
      totalRuns,
      totalWickets,
      topBatsmen,
      topBowlers,
      recentMatches: matchesWithStats.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Team stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
