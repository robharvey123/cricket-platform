import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures all squad players have zero-row entries for batting, bowling, and fielding
 * This guarantees every player appears in stats/reports even if they didn't bat/bowl
 */
export async function ensureZeroRowsForSquad(
  supabase: SupabaseClient,
  matchId: string,
  teamId: string,
  seasonId: string
): Promise<void> {
  // Get all squad players for this team/season
  const { data: squadPlayers, error: squadError } = await supabase
    .from('squads')
    .select('player_id')
    .eq('team_id', teamId)
    .eq('season_id', seasonId);

  if (squadError || !squadPlayers || squadPlayers.length === 0) {
    console.warn('No squad players found for zero-row backfill', { teamId, seasonId });
    return;
  }

  const playerIds = squadPlayers.map((sp) => sp.player_id);

  // Get existing batting cards for this match
  const { data: existingBatting } = await supabase
    .from('batting_cards')
    .select('player_id')
    .eq('match_id', matchId);

  const existingBattingPlayerIds = new Set(
    existingBatting?.map((bc) => bc.player_id) || []
  );

  // Get existing bowling cards for this match
  const { data: existingBowling } = await supabase
    .from('bowling_cards')
    .select('player_id')
    .eq('match_id', matchId);

  const existingBowlingPlayerIds = new Set(
    existingBowling?.map((bc) => bc.player_id) || []
  );

  // Get existing fielding cards for this match
  const { data: existingFielding } = await supabase
    .from('fielding_cards')
    .select('player_id')
    .eq('match_id', matchId);

  const existingFieldingPlayerIds = new Set(
    existingFielding?.map((fc) => fc.player_id) || []
  );

  // Create zero-row entries for missing players
  const battingInserts = playerIds
    .filter((playerId) => !existingBattingPlayerIds.has(playerId))
    .map((playerId) => ({
      match_id: matchId,
      player_id: playerId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strike_rate: 0,
      dismissal: 'Did not bat',
      derived: true, // Flag to indicate this was auto-generated
    }));

  const bowlingInserts = playerIds
    .filter((playerId) => !existingBowlingPlayerIds.has(playerId))
    .map((playerId) => ({
      match_id: matchId,
      player_id: playerId,
      overs: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      derived: true,
    }));

  const fieldingInserts = playerIds
    .filter((playerId) => !existingFieldingPlayerIds.has(playerId))
    .map((playerId) => ({
      match_id: matchId,
      player_id: playerId,
      catches: 0,
      stumpings: 0,
      run_outs: 0,
      drops: 0,
      misfields: 0,
      derived: true,
    }));

  // Insert in batches
  if (battingInserts.length > 0) {
    const { error: battingError } = await supabase
      .from('batting_cards')
      .insert(battingInserts);

    if (battingError) {
      console.error('Error inserting zero-row batting cards:', battingError);
    }
  }

  if (bowlingInserts.length > 0) {
    const { error: bowlingError } = await supabase
      .from('bowling_cards')
      .insert(bowlingInserts);

    if (bowlingError) {
      console.error('Error inserting zero-row bowling cards:', bowlingError);
    }
  }

  if (fieldingInserts.length > 0) {
    const { error: fieldingError } = await supabase
      .from('fielding_cards')
      .insert(fieldingInserts);

    if (fieldingError) {
      console.error('Error inserting zero-row fielding cards:', fieldingError);
    }
  }

  console.log('Zero-rows backfill complete', {
    matchId,
    battingInserts: battingInserts.length,
    bowlingInserts: bowlingInserts.length,
    fieldingInserts: fieldingInserts.length,
  });
}

/**
 * Backfills zero-rows for all existing matches
 * Run this once to fix historical data
 */
export async function backfillZeroRowsForAllMatches(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Get all matches for the club
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, team_id, season_id')
    .eq('club_id', clubId);

  if (matchesError) {
    errors.push(`Failed to fetch matches: ${matchesError.message}`);
    return { processed, errors };
  }

  if (!matches || matches.length === 0) {
    return { processed, errors };
  }

  // Process each match
  for (const match of matches) {
    try {
      await ensureZeroRowsForSquad(
        supabase,
        match.id,
        match.team_id,
        match.season_id
      );
      processed++;
    } catch (error: any) {
      errors.push(`Match ${match.id}: ${error.message}`);
    }
  }

  return { processed, errors };
}
