import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PC_API_TOKEN = Deno.env.get('PC_API_TOKEN')!

serve(async (req) => {
  const { action, siteId, orgId, season } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  switch (action) {
    case 'test_connection': {
      const response = await fetch(
        `https://www.play-cricket.com/api/v2/sites/${siteId}/teams.json`,
        { headers: { 'api-token': PC_API_TOKEN } }
      )

      if (!response.ok) {
        return new Response(JSON.stringify({
          connected: false,
          message: 'Invalid Site ID'
        }), { status: 400 })
      }

      const data = await response.json()
      return new Response(JSON.stringify({
        connected: true,
        clubName: data.site_name,
        teams: data.teams
      }))
    }

    case 'import_matches': {
      const response = await fetch(
        `https://www.play-cricket.com/api/v2/sites/${siteId}/matches.json?season=${season}`,
        { headers: { 'api-token': PC_API_TOKEN } }
      )

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to fetch matches'
        }), { status: 400 })
      }

      const data = await response.json()
      let imported = 0

      for (const match of data.matches || []) {
        const { error } = await supabase.from('matches').upsert({
          org_id: orgId,
          pc_match_id: match.id.toString(),
          opponent: match.opposition_team_name,
          date: match.match_date,
          venue: match.ground_name,
          is_home: match.home_away === 'Home',
          status: match.status === 'Completed' ? 'completed' : 'scheduled',
          result: match.result,
        }, { onConflict: 'pc_match_id' })

        if (!error) imported++
      }

      // Update last sync time
      await supabase
        .from('organizations')
        .update({ pc_last_sync_at: new Date().toISOString() })
        .eq('id', orgId)

      return new Response(JSON.stringify({
        success: true,
        totalMatches: data.matches?.length || 0,
        imported
      }))
    }

    case 'import_stats': {
      // Import player statistics from Play-Cricket
      const response = await fetch(
        `https://www.play-cricket.com/api/v2/sites/${siteId}/matches/${req.body.matchId}.json`,
        { headers: { 'api-token': PC_API_TOKEN } }
      )

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to fetch match stats'
        }), { status: 400 })
      }

      // This would parse batting and bowling data from Play-Cricket API
      // Implementation depends on API response structure

      return new Response(JSON.stringify({
        success: true,
        message: 'Stats import feature coming soon'
      }))
    }

    default:
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  }
})
