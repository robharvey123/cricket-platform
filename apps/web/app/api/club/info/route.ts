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
      .select('club_id, clubs(id, name, slug, brand)')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const club = (userRole as any).clubs;

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        brand: club.brand,
      },
    });
  } catch (error: any) {
    console.error('Club info error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
