import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/public/leaderboard?slug=brookweald&tab=batting|bowling|points
 * Public endpoint for viewing club leaderboards without authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubSlug = searchParams.get('slug');
    const tab = searchParams.get('tab') || 'points';

    if (!clubSlug) {
      return NextResponse.json(
        { error: 'Club slug is required' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for public data access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get club by slug
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name, brand')
      .eq('slug', clubSlug)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('club_id', club.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (!season) {
      return NextResponse.json(
        { error: 'No active season found' },
        { status: 404 }
      );
    }

    let leaderboardData = [];

    if (tab === 'batting') {
      const { data } = await supabase
        .from('v_batting_leaderboard')
        .select('*')
        .eq('season_id', season.id)
        .order('total_runs', { ascending: false })
        .limit(50);

      leaderboardData = data || [];
    } else if (tab === 'bowling') {
      const { data } = await supabase
        .from('v_bowling_leaderboard')
        .select('*')
        .eq('season_id', season.id)
        .order('total_wickets', { ascending: false })
        .limit(50);

      leaderboardData = data || [];
    } else {
      // Points leaderboard (default)
      const { data } = await supabase
        .from('v_points_leaderboard')
        .select('*')
        .eq('season_id', season.id)
        .order('total_points', { ascending: false })
        .limit(50);

      leaderboardData = data || [];
    }

    return NextResponse.json({
      club: {
        name: club.name,
        slug: clubSlug,
        brand: club.brand,
      },
      season: {
        name: season.name,
        start_date: season.start_date,
        end_date: season.end_date,
      },
      leaderboard: leaderboardData,
      tab,
    });
  } catch (error: any) {
    console.error('Public leaderboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
