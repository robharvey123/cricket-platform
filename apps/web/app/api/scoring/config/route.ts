import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ScoringFormula } from '../../../../lib/scoring/types'

/**
 * GET /api/scoring/config
 * Fetch the active scoring configuration for the user's club
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club
    const { data: membership } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No club found for user' }, { status: 404 })
    }

    // Get active scoring config for this club
    const { data: config, error } = await supabase
      .from('scoring_configs')
      .select('*')
      .eq('club_id', membership.club_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching scoring config:', error)
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }

    // If no config exists, return null (frontend will use default)
    if (!config) {
      return NextResponse.json({ config: null })
    }

    return NextResponse.json({
      config: {
        id: config.id,
        name: config.name,
        version: config.version,
        formula: config.formula_json as ScoringFormula,
        effectiveFrom: config.effective_from,
        createdAt: config.created_at,
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/scoring/config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/scoring/config
 * Save a new version of the scoring configuration
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club
    const { data: membership } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No club found for user' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { name, formula } = body as { name: string; formula: ScoringFormula }

    if (!name || !formula) {
      return NextResponse.json({ error: 'Missing name or formula' }, { status: 400 })
    }

    // Get the latest version number for this club
    const { data: latestConfig } = await supabase
      .from('scoring_configs')
      .select('version')
      .eq('club_id', membership.club_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = latestConfig ? latestConfig.version + 1 : 1

    // Deactivate all existing configs for this club
    await supabase
      .from('scoring_configs')
      .update({ is_active: false })
      .eq('club_id', membership.club_id)

    // Insert new config
    const { data: newConfig, error: insertError } = await supabase
      .from('scoring_configs')
      .insert({
        club_id: membership.club_id,
        name,
        version: nextVersion,
        formula_json: formula,
        is_active: true,
        effective_from: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting scoring config:', insertError)
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
    }

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      club_id: membership.club_id,
      actor: user.id,
      action: 'scoring_config_updated',
      details: {
        config_id: newConfig.id,
        name,
        version: nextVersion,
        previous_version: latestConfig?.version || 0,
      },
    })

    return NextResponse.json({
      success: true,
      config: {
        id: newConfig.id,
        name: newConfig.name,
        version: newConfig.version,
        formula: newConfig.formula_json as ScoringFormula,
        effectiveFrom: newConfig.effective_from,
        createdAt: newConfig.created_at,
      },
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/scoring/config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
