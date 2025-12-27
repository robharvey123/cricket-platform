/**
 * Play Cricket API Service
 * Handles integration with Play Cricket API for match and player data import
 */

export interface PlayCricketConfig {
  siteId: string
  apiToken: string
}

export interface PlayCricketMatch {
  id: number
  match_date: string
  match_type: string
  home_club_name: string
  away_club_name: string
  home_team_name: string
  away_team_name: string
  ground_name: string
  result: string
  result_description: string
  status: string
}

export interface PlayCricketMatchDetail {
  id: number
  match_date: string
  match_type: string
  home_club_name: string
  away_club_name: string
  home_team_name: string
  away_team_name: string
  ground_name: string
  result: string
  innings: PlayCricketInnings[]
  points: {
    home_points: number
    away_points: number
  }
}

export interface PlayCricketInnings {
  innings_number: number
  team_batting_name: string
  runs: number
  wickets: number
  overs: string
  declared: boolean
  forfeited: boolean
  bat: PlayCricketBatsman[]
  bowl: PlayCricketBowler[]
  fow: PlayCricketFallOfWicket[]
}

export interface PlayCricketBatsman {
  batsman_id: number
  batsman_name: string
  how_out: string
  fielder_name?: string
  bowler_name?: string
  runs: number
  fours: number
  sixes: number
  balls_faced?: number
  strike_rate?: number
  position: number
}

export interface PlayCricketBowler {
  bowler_id: number
  bowler_name: string
  overs: string
  maidens: number
  runs: number
  wickets: number
  wides: number
  no_balls: number
  economy?: number
}

export interface PlayCricketFallOfWicket {
  runs: number
  wickets: number
  batsman_name: string
  batsman_out_id: number
}

export interface SyncResult {
  success: boolean
  matchesFound: number
  matchesImported: number
  matchesUpdated: number
  matchesSkipped: number
  errors: Array<{ matchId?: number; error: string }>
}

export class PlayCricketService {
  private baseUrl = 'https://play-cricket.com/api/v2'

  /**
   * Test connection to Play Cricket API
   */
  async testConnection(config: PlayCricketConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/matches.json?site_id=${config.siteId}&season=${new Date().getFullYear()}&api_token=${config.apiToken}`
      )

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return Array.isArray(data.matches)
    } catch (error) {
      console.error('Play Cricket connection test failed:', error)
      return false
    }
  }

  /**
   * Fetch matches for a specific season
   */
  async fetchMatches(
    config: PlayCricketConfig,
    season: number,
    options?: {
      fromDate?: string
      toDate?: string
    }
  ): Promise<PlayCricketMatch[]> {
    const params = new URLSearchParams({
      site_id: config.siteId,
      season: season.toString(),
      api_token: config.apiToken,
    })

    if (options?.fromDate) {
      const formatted = this.formatDateForApi(options.fromDate)
      params.append('from_entry_date', formatted)
      params.append('from_date', formatted)
    }
    if (options?.toDate) {
      const formatted = this.formatDateForApi(options.toDate)
      params.append('to_entry_date', formatted)
      params.append('to_date', formatted)
    }

    const response = await fetch(`${this.baseUrl}/result_summary.json?${params}`)

    if (response.ok) {
      const data = await response.json()
      const matches = data.match_details || data.matches || []
      if (Array.isArray(matches) && matches.length > 0) {
        return matches
      }
    }

    const fallbackResponse = await fetch(`${this.baseUrl}/matches.json?${params}`)

    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch matches: ${fallbackResponse.statusText}`)
    }

    const fallbackData = await fallbackResponse.json()
    return fallbackData.matches || fallbackData.match_details || []
  }

  /**
   * Fetch detailed match information including full scorecard
   */
  async fetchMatchDetail(
    config: PlayCricketConfig,
    matchId: number
  ): Promise<PlayCricketMatchDetail> {
    const params = new URLSearchParams({
      match_id: matchId.toString(),
      api_token: config.apiToken,
    })

    const response = await fetch(`${this.baseUrl}/match_detail.json?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch match detail: ${response.statusText}`)
    }

    const data = await response.json()
    return data.match_details[0]
  }

  normalizeMatchType(matchType?: string | null): string | null {
    if (!matchType) return null
    const value = matchType.toLowerCase()
    if (value.includes('league')) return 'league'
    if (value.includes('cup')) return 'cup'
    if (value.includes('friendly') || value.includes('practice')) return 'friendly'
    return null
  }

  normalizeMatchResult(options: {
    resultCode?: string | null
    resultDescription?: string | null
    resultAppliedTo?: string | null
    homeTeamId?: string | null
    awayTeamId?: string | null
    clubTeamId?: string | null
    clubName?: string | null
  }): string | null {
    const {
      resultCode,
      resultDescription,
      resultAppliedTo,
      homeTeamId,
      awayTeamId,
      clubTeamId,
      clubName
    } = options

    const code = resultCode?.toLowerCase() || ''
    if (code === 'a') return 'abandoned'
    if (code === 't') return 'tied'
    if (code === 'd') return 'draw'

    if (resultAppliedTo && clubTeamId) {
      return resultAppliedTo === clubTeamId ? 'won' : 'lost'
    }

    if (resultAppliedTo && (homeTeamId || awayTeamId)) {
      const wonByHome = resultAppliedTo === homeTeamId
      const wonByAway = resultAppliedTo === awayTeamId
      if (wonByHome || wonByAway) {
        if (clubName && resultDescription?.toLowerCase().includes(clubName.toLowerCase())) {
          return resultDescription.toLowerCase().includes('win') ? 'won' : 'lost'
        }
        return wonByAway ? 'won' : 'lost'
      }
    }

    if (resultDescription) {
      const desc = resultDescription.toLowerCase()
      if (desc.includes('abandon')) return 'abandoned'
      if (desc.includes('draw')) return 'draw'
      if (desc.includes('tie')) return 'tied'
      if (desc.includes('win')) {
        if (clubName && desc.includes(clubName.toLowerCase())) {
          return 'won'
        }
        return 'lost'
      }
    }

    if (code === 'w') return 'won'
    if (code === 'l') return 'lost'

    return null
  }

  normalizeMatchSource(source?: string | null): string {
    if (!source) return 'manual'
    const value = source.toLowerCase()
    if (value.includes('play')) return 'play_cricket'
    if (value.includes('manual')) return 'manual'
    return 'manual'
  }

  normalizeMatchDate(rawDate?: string | null): string | null {
    if (!rawDate) return null
    const trimmed = rawDate.trim()
    if (!trimmed) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    const parts = trimmed.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      if (day && month && year) {
        const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        if (!Number.isNaN(Date.parse(iso))) return iso
      }
    }
    return null
  }

  formatDateForApi(rawDate: string): string {
    const normalized = this.normalizeMatchDate(rawDate)
    if (!normalized) return rawDate
    const [year, month, day] = normalized.split('-')
    return `${day}/${month}/${year}`
  }

  /**
   * Parse over string to decimal (e.g., "12.3" or "12")
   */
  parseOvers(oversString: string | number): number {
    if (typeof oversString === 'number') return oversString

    const parts = oversString.toString().split('.')
    if (parts.length === 1) return parseFloat(oversString)

    const overs = parseInt(parts[0])
    const balls = parseInt(parts[1] || '0')
    return parseFloat(`${overs}.${balls}`)
  }

  /**
   * Calculate strike rate
   */
  calculateStrikeRate(runs: number, balls: number): number | null {
    if (balls === 0) return null
    return parseFloat(((runs / balls) * 100).toFixed(2))
  }

  /**
   * Calculate economy rate
   */
  calculateEconomy(runs: number, overs: string): number | null {
    const oversDecimal = this.parseOvers(overs)
    if (oversDecimal === 0) return null

    const fullOvers = Math.floor(oversDecimal)
    const balls = (oversDecimal - fullOvers) * 10
    const totalBalls = (fullOvers * 6) + balls

    if (totalBalls === 0) return null
    return parseFloat((runs / (totalBalls / 6)).toFixed(2))
  }

  /**
   * Determine if a team is home or away based on club name
   */
  isHomeTeam(clubName: string, teamName: string, homeClubName: string): boolean {
    return clubName.toLowerCase().includes(homeClubName.toLowerCase()) ||
           teamName.toLowerCase().includes(homeClubName.toLowerCase())
  }

  /**
   * Parse dismissal text to get dismissal type
   */
  parseDismissalType(howOut: string): {
    dismissalType: string
    dismissalText: string
    isOut: boolean
  } {
    if (!howOut || howOut.toLowerCase() === 'not out') {
      return {
        dismissalType: 'not out',
        dismissalText: howOut || 'not out',
        isOut: false
      }
    }

    const lowerHowOut = howOut.toLowerCase()

    if (lowerHowOut === 'ct' || lowerHowOut.startsWith('ct ')) {
      return { dismissalType: 'caught', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut === 'b' || lowerHowOut.startsWith('b ')) {
      return { dismissalType: 'bowled', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut === 'st' || lowerHowOut.startsWith('st ')) {
      return { dismissalType: 'stumped', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('caught')) {
      return { dismissalType: 'caught', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('bowled')) {
      return { dismissalType: 'bowled', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('lbw')) {
      return { dismissalType: 'lbw', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('run out')) {
      return { dismissalType: 'run out', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('stumped')) {
      return { dismissalType: 'stumped', dismissalText: howOut, isOut: true }
    }
    if (lowerHowOut.includes('hit wicket')) {
      return { dismissalType: 'hit wicket', dismissalText: howOut, isOut: true }
    }

    return {
      dismissalType: howOut,
      dismissalText: howOut,
      isOut: true
    }
  }
}

export const playCricketService = new PlayCricketService()
