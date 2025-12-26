import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { primaryPlayerId, duplicatePlayerId } = await request.json()

    if (!primaryPlayerId || !duplicatePlayerId) {
      return NextResponse.json({ error: 'Primary and duplicate player IDs are required' }, { status: 400 })
    }

    if (primaryPlayerId === duplicatePlayerId) {
      return NextResponse.json({ error: 'Players must be different' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's club and role
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: primaryPlayer, error: primaryError } = await supabase
      .from('players')
      .select('id, first_name, last_name, club_id, user_id')
      .eq('id', primaryPlayerId)
      .eq('club_id', userRole.club_id)
      .single()

    if (primaryError || !primaryPlayer) {
      return NextResponse.json({ error: 'Primary player not found' }, { status: 404 })
    }

    const { data: duplicatePlayer, error: duplicateError } = await supabase
      .from('players')
      .select('id, first_name, last_name, club_id, user_id')
      .eq('id', duplicatePlayerId)
      .eq('club_id', userRole.club_id)
      .single()

    if (duplicateError || !duplicatePlayer) {
      return NextResponse.json({ error: 'Duplicate player not found' }, { status: 404 })
    }

    if (primaryPlayer.user_id && duplicatePlayer.user_id && primaryPlayer.user_id !== duplicatePlayer.user_id) {
      return NextResponse.json(
        { error: 'Both players are linked to different users. Unlink one before merging.' },
        { status: 409 }
      )
    }

    if (!primaryPlayer.user_id && duplicatePlayer.user_id) {
      const { error: userLinkError } = await supabase
        .from('players')
        .update({ user_id: duplicatePlayer.user_id })
        .eq('id', primaryPlayer.id)

      if (userLinkError) {
        throw new Error(userLinkError.message)
      }
    }

    const updatePlayerRefs = async (table: string) => {
      const { error: updateError } = await supabase
        .from(table)
        .update({ player_id: primaryPlayerId })
        .eq('player_id', duplicatePlayerId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    await updatePlayerRefs('batting_cards')
    await updatePlayerRefs('bowling_cards')
    await updatePlayerRefs('fielding_cards')

    // Handle team_players unique constraint
    const { data: duplicateTeams } = await supabase
      .from('team_players')
      .select('team_id')
      .eq('player_id', duplicatePlayerId)

    if (duplicateTeams?.length) {
      const { data: primaryTeams } = await supabase
        .from('team_players')
        .select('team_id')
        .eq('player_id', primaryPlayerId)

      const primaryTeamIds = new Set((primaryTeams || []).map((row) => row.team_id))
      const duplicateTeamIds = (duplicateTeams || []).map((row) => row.team_id)
      const conflictTeams = duplicateTeamIds.filter((teamId) => primaryTeamIds.has(teamId))

      if (conflictTeams.length) {
        const { error: deleteTeamConflicts } = await supabase
          .from('team_players')
          .delete()
          .eq('player_id', duplicatePlayerId)
          .in('team_id', conflictTeams)

        if (deleteTeamConflicts) {
          throw new Error(deleteTeamConflicts.message)
        }
      }
    }

    const { error: updateTeamPlayersError } = await supabase
      .from('team_players')
      .update({ player_id: primaryPlayerId })
      .eq('player_id', duplicatePlayerId)

    if (updateTeamPlayersError) {
      throw new Error(updateTeamPlayersError.message)
    }

    // Handle squads unique constraint (if squads table exists)
    let squadsAvailable = true
    const { data: duplicateSquads, error: duplicateSquadsError } = await supabase
      .from('squads')
      .select('team_id, season_id')
      .eq('player_id', duplicatePlayerId)

    if (duplicateSquadsError) {
      if (duplicateSquadsError.message?.includes("table 'public.squads'")) {
        squadsAvailable = false
      } else {
        throw new Error(duplicateSquadsError.message)
      }
    }

    if (squadsAvailable && duplicateSquads?.length) {
      const { data: primarySquads, error: primarySquadsError } = await supabase
        .from('squads')
        .select('team_id, season_id')
        .eq('player_id', primaryPlayerId)

      if (primarySquadsError) {
        throw new Error(primarySquadsError.message)
      }

      const primarySquadKey = new Set(
        (primarySquads || []).map((row) => `${row.team_id}-${row.season_id}`)
      )
      const conflictSquads = (duplicateSquads || []).filter((row) =>
        primarySquadKey.has(`${row.team_id}-${row.season_id}`)
      )

      if (conflictSquads.length) {
        for (const conflict of conflictSquads) {
          const { error: deleteSquadConflicts } = await supabase
            .from('squads')
            .delete()
            .eq('player_id', duplicatePlayerId)
            .eq('team_id', conflict.team_id)
            .eq('season_id', conflict.season_id)

          if (deleteSquadConflicts) {
            throw new Error(deleteSquadConflicts.message)
          }
        }
      }
    }

    if (squadsAvailable) {
      const { error: updateSquadsError } = await supabase
        .from('squads')
        .update({ player_id: primaryPlayerId })
        .eq('player_id', duplicatePlayerId)

      if (updateSquadsError) {
        throw new Error(updateSquadsError.message)
      }
    }

    // Clear existing aggregated stats so they can be recalculated
    const { error: deleteSeasonStatsError } = await supabase
      .from('player_season_stats')
      .delete()
      .eq('club_id', userRole.club_id)
      .in('player_id', [primaryPlayerId, duplicatePlayerId])

    if (deleteSeasonStatsError) {
      throw new Error(deleteSeasonStatsError.message)
    }

    const { error: deleteMatchPerformanceError } = await supabase
      .from('player_match_performance')
      .delete()
      .eq('club_id', userRole.club_id)
      .in('player_id', [primaryPlayerId, duplicatePlayerId])

    if (deleteMatchPerformanceError) {
      throw new Error(deleteMatchPerformanceError.message)
    }

    const { error: deleteDuplicateError } = await supabase
      .from('players')
      .delete()
      .eq('id', duplicatePlayerId)
      .eq('club_id', userRole.club_id)

    if (deleteDuplicateError) {
      throw new Error(deleteDuplicateError.message)
    }

    await supabase.rpc('log_audit', {
      p_club_id: userRole.club_id,
      p_action: 'update',
      p_entity_type: 'player_merge',
      p_entity_id: primaryPlayerId,
      p_changes: {
        primary_player_id: primaryPlayerId,
        primary_name: `${primaryPlayer.first_name || ''} ${primaryPlayer.last_name || ''}`.trim(),
        duplicate_player_id: duplicatePlayerId,
        duplicate_name: `${duplicatePlayer.first_name || ''} ${duplicatePlayer.last_name || ''}`.trim()
      },
      p_metadata: {
        stats_cleared: true,
        requires_recalculation: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Players merged. Recalculate stats to refresh totals.'
    })
  } catch (error: any) {
    console.error('Merge players error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
