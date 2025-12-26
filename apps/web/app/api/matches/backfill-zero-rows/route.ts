import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { backfillZeroRowsForAllMatches } from '../../../../lib/match-utils';

/**
 * POST /api/matches/backfill-zero-rows
 * Backfills zero-row entries for all squad players who didn't bat/bowl
 * This ensures every player appears in stats and reports
 */
export async function POST(request: NextRequest) {
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

    // Get user's club and verify they're an admin
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    if (userRole.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can perform backfill operations' },
        { status: 403 }
      );
    }

    const clubId = userRole.club_id;

    // Run backfill
    const result = await backfillZeroRowsForAllMatches(supabase, clubId);

    return NextResponse.json({
      message: 'Backfill complete',
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Backfill zero-rows error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
