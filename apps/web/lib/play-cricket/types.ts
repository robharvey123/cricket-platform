/**
 * Play-Cricket API v2 TypeScript Types
 * Based on: https://www.play-cricket.com/api/docs
 */

export interface PlayCricketConfig {
  siteId: string
  apiToken: string
  baseUrl?: string
}

// Result Summary Types (list of matches)
export interface ResultSummary {
  id: string
  match_date: string
  competition_name: string
  competition_type: string
  match_type: string
  home_team_name: string
  away_team_name: string
  home_team_id: string
  away_team_id: string
  result: string
  result_applied_to?: string
  status: string
  last_updated: string
}

export interface ResultSummaryResponse {
  results: ResultSummary[]
}

// Match Detail Types (full scorecard)
export interface MatchDetail {
  id: string
  match_date: string
  match_type: string
  status: string
  result: string
  result_applied_to?: string
  home_team: Team
  away_team: Team
  innings: Innings[]
  players: MatchPlayer[]
  last_updated: string
  ground_name?: string
  competition_name?: string
}

export interface Team {
  team_id: string
  team_name: string
  captain?: string
  wicket_keeper?: string
}

export interface Innings {
  innings_number: number
  team_batting_id: string
  team_batting_name: string
  total_runs: number
  total_wickets: number
  overs: number
  balls: number
  declared: boolean
  forfeited: boolean
  extras: Extras
  batting: BattingCard[]
  bowling: BowlingCard[]
  fow: FallOfWicket[]
}

export interface Extras {
  byes: number
  leg_byes: number
  wides: number
  no_balls: number
  penalties: number
  total: number
}

export interface BattingCard {
  batsman_name: string
  batsman_id?: string
  position: number
  how_out: string
  fielder_name?: string
  bowler_name?: string
  runs: number
  balls: number
  fours: number
  sixes: number
  minutes?: number
}

export interface BowlingCard {
  bowler_name: string
  bowler_id?: string
  overs: number
  maidens: number
  runs: number
  wickets: number
  wides?: number
  no_balls?: number
  economy?: number
}

export interface FallOfWicket {
  wicket_number: number
  runs: number
  batsman_out_name: string
  overs: number
  balls: number
}

export interface MatchPlayer {
  player_id: string
  player_name: string
  team_id: string
  captain: boolean
  wicket_keeper: boolean
}

// Player List Types
export interface PlayerListItem {
  player_id: string
  player_name: string
  last_name?: string
  first_name?: string
}

export interface PlayerListResponse {
  players: PlayerListItem[]
}

// Fielding Event Types (parsed from match narrative or derived)
export interface FieldingEvent {
  player_name: string
  player_id?: string
  event_type: 'catch' | 'stumping' | 'run_out' | 'drop' | 'misfield'
  innings_number: number
}

// Error Types
export interface PlayCricketError {
  code: string
  message: string
  details?: unknown
}
