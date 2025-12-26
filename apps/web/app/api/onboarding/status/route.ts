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
      .select('club_id, clubs(id, name, slug)')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubId = userRole.club_id;
    const club = (userRole as any).clubs;

    // Check if has teams
    const { count: teamsCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    const hasTeams = (teamsCount || 0) > 0;

    // Check if has active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .single();

    const hasSeason = !!activeSeason;

    // Check number of players
    const { count: playersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    // Check if has captains
    const { count: captainsCount } = await supabase
      .from('team_captains')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    const hasCaptains = (captainsCount || 0) > 0;

    // Check if has matches
    const { count: matchesCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    const hasMatches = (matchesCount || 0) > 0;

    return NextResponse.json({
      club,
      progress: {
        hasTeams,
        hasSeason,
        hasPlayers: playersCount || 0,
        hasCaptains,
        hasMatches,
      },
    });
  } catch (error: any) {
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
