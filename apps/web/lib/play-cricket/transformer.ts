/**
 * Transform Play-Cricket API data into our database schema format
 */

import type { MatchDetail, Innings, BattingCard, BowlingCard } from './types'

export interface TransformedMatch {
  // Match level
  match: {
    club_id: string
    season_id: string
    team_id: string
    match_date: Date
    opponent: string
    venue: string | null
    competition: string | null
    result: string | null
    source: 'play-cricket'
    source_match_id: string
    published: false
    raw_data: unknown
  }
  // Innings data
  innings: TransformedInnings[]
}

export interface TransformedInnings {
  innings_number: number
  batting_team: string
  total_runs: number
  total_wickets: number
  overs: number
  balls: number
  extras_byes: number
  extras_leg_byes: number
  extras_wides: number
  extras_no_balls: number
  extras_penalties: number
  declared: boolean
  forfeited: boolean
  batting_cards: TransformedBattingCard[]
  bowling_cards: TransformedBowlingCard[]
}

export interface TransformedBattingCard {
  player_name: string
  external_player_id: string | null
  position: number
  how_out: string
  fielder_name: string | null
  bowler_name: string | null
  runs: number
  balls: number
  fours: number
  sixes: number
  minutes: number | null
  derived: false
}

export interface TransformedBowlingCard {
  player_name: string
  external_player_id: string | null
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  derived: false
}

export class PlayCricketTransformer {
  /**
   * Transform a Play-Cricket MatchDetail into our database format
   */
  static transformMatch(
    pcMatch: MatchDetail,
    clubId: string,
    seasonId: string,
    teamId: string,
    ourTeamId: string // The Play-Cricket team_id that represents our team
  ): TransformedMatch {
    // Determine opponent and venue
    const isHomeMatch = pcMatch.home_team.team_id === ourTeamId
    const opponent = isHomeMatch
      ? pcMatch.away_team.team_name
      : pcMatch.home_team.team_name
    const venue = pcMatch.ground_name || null

    return {
      match: {
        club_id: clubId,
        season_id: seasonId,
        team_id: teamId,
        match_date: new Date(pcMatch.match_date),
        opponent,
        venue,
        competition: pcMatch.competition_name || null,
        result: pcMatch.result || null,
        source: 'play-cricket',
        source_match_id: pcMatch.id,
        published: false,
        raw_data: pcMatch,
      },
      innings: pcMatch.innings.map((innings) =>
        this.transformInnings(innings)
      ),
    }
  }

  /**
   * Transform a Play-Cricket Innings into our format
   */
  private static transformInnings(pcInnings: Innings): TransformedInnings {
    return {
      innings_number: pcInnings.innings_number,
      batting_team: pcInnings.team_batting_name,
      total_runs: pcInnings.total_runs,
      total_wickets: pcInnings.total_wickets,
      overs: pcInnings.overs,
      balls: pcInnings.balls,
      extras_byes: pcInnings.extras.byes,
      extras_leg_byes: pcInnings.extras.leg_byes,
      extras_wides: pcInnings.extras.wides,
      extras_no_balls: pcInnings.extras.no_balls,
      extras_penalties: pcInnings.extras.penalties,
      declared: pcInnings.declared,
      forfeited: pcInnings.forfeited,
      batting_cards: pcInnings.batting.map((card) =>
        this.transformBattingCard(card)
      ),
      bowling_cards: pcInnings.bowling.map((card) =>
        this.transformBowlingCard(card)
      ),
    }
  }

  /**
   * Transform a Play-Cricket BattingCard
   */
  private static transformBattingCard(
    pcCard: BattingCard
  ): TransformedBattingCard {
    return {
      player_name: pcCard.batsman_name,
      external_player_id: pcCard.batsman_id || null,
      position: pcCard.position,
      how_out: pcCard.how_out,
      fielder_name: pcCard.fielder_name || null,
      bowler_name: pcCard.bowler_name || null,
      runs: pcCard.runs,
      balls: pcCard.balls,
      fours: pcCard.fours,
      sixes: pcCard.sixes,
      minutes: pcCard.minutes || null,
      derived: false,
    }
  }

  /**
   * Transform a Play-Cricket BowlingCard
   */
  private static transformBowlingCard(
    pcCard: BowlingCard
  ): TransformedBowlingCard {
    return {
      player_name: pcCard.bowler_name,
      external_player_id: pcCard.bowler_id || null,
      overs: pcCard.overs,
      maidens: pcCard.maidens,
      runs_conceded: pcCard.runs,
      wickets: pcCard.wickets,
      wides: pcCard.wides || 0,
      no_balls: pcCard.no_balls || 0,
      derived: false,
    }
  }

  /**
   * Helper: Calculate economy rate
   */
  static calculateEconomy(overs: number, runs: number): number {
    if (overs === 0) return 0
    return runs / overs
  }

  /**
   * Helper: Check if a batsman scored a duck
   */
  static isDuck(runs: number, howOut: string): boolean {
    return runs === 0 && howOut !== 'not out' && howOut !== 'did not bat'
  }

  /**
   * Helper: Check if a batsman reached a milestone
   */
  static getMilestone(runs: number): 50 | 100 | null {
    if (runs >= 100) return 100
    if (runs >= 50) return 50
    return null
  }

  /**
   * Helper: Check if a bowler reached a wicket milestone
   */
  static getWicketMilestone(wickets: number): 3 | 5 | null {
    if (wickets >= 5) return 5
    if (wickets >= 3) return 3
    return null
  }
}
