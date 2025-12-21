/**
 * Play-Cricket API v2 Client
 *
 * Usage:
 * const client = new PlayCricketClient({
 *   siteId: 'your-site-id',
 *   apiToken: 'your-api-token'
 * })
 *
 * const matches = await client.getResultSummary()
 * const match = await client.getMatchDetail('12345')
 */

import type {
  PlayCricketConfig,
  ResultSummaryResponse,
  MatchDetail,
  PlayerListResponse,
  PlayCricketError,
} from './types'

export class PlayCricketClient {
  private siteId: string
  private apiToken: string
  private baseUrl: string

  constructor(config: PlayCricketConfig) {
    this.siteId = config.siteId
    this.apiToken = config.apiToken
    this.baseUrl = config.baseUrl || 'https://www.play-cricket.com/api/v2'
  }

  /**
   * Fetch result summary (list of matches)
   * @param options Optional filters
   * @returns List of matches with basic info
   */
  async getResultSummary(options?: {
    season?: string
    teamId?: string
    from?: string // YYYY-MM-DD
    to?: string // YYYY-MM-DD
  }): Promise<ResultSummaryResponse> {
    const params = new URLSearchParams({
      site_id: this.siteId,
      api_token: this.apiToken,
    })

    if (options?.season) params.append('season', options.season)
    if (options?.teamId) params.append('team_id', options.teamId)
    if (options?.from) params.append('from_entry_date', options.from)
    if (options?.to) params.append('to_entry_date', options.to)

    const url = `${this.baseUrl}/result_summary.json?${params.toString()}`
    return this.fetch<ResultSummaryResponse>(url)
  }

  /**
   * Fetch detailed match information (full scorecard)
   * @param matchId The Play-Cricket match ID
   * @returns Full match details with innings, batting, bowling
   */
  async getMatchDetail(matchId: string): Promise<MatchDetail> {
    const params = new URLSearchParams({
      site_id: this.siteId,
      api_token: this.apiToken,
      match_id: matchId,
    })

    const url = `${this.baseUrl}/match_detail.json?${params.toString()}`
    return this.fetch<MatchDetail>(url)
  }

  /**
   * Fetch player list for the site
   * @returns List of registered players
   */
  async getPlayers(): Promise<PlayerListResponse> {
    const params = new URLSearchParams({
      site_id: this.siteId,
      api_token: this.apiToken,
    })

    const url = `${this.baseUrl}/players.json?${params.toString()}`
    return this.fetch<PlayerListResponse>(url)
  }

  /**
   * Internal fetch wrapper with error handling
   */
  private async fetch<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 5 minutes to avoid rate limiting
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        const error: PlayCricketError = {
          code: `HTTP_${response.status}`,
          message: `Play-Cricket API error: ${response.statusText}`,
          details: await response.text().catch(() => null),
        }
        throw error
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if ((error as PlayCricketError).code) {
        throw error
      }

      const wrappedError: PlayCricketError = {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch from Play-Cricket API',
        details: error,
      }
      throw wrappedError
    }
  }

  /**
   * Helper to validate configuration
   */
  static validateConfig(config: Partial<PlayCricketConfig>): boolean {
    return !!(config.siteId && config.apiToken)
  }

  /**
   * Parse a Play-Cricket match URL to extract match ID
   * Example: https://www.play-cricket.com/matches/123456 → "123456"
   */
  static parseMatchUrl(url: string): string | null {
    const patterns = [
      /play-cricket\.com\/matches\/(\d+)/,
      /play-cricket\.com\/website\/results\/(\d+)/,
      /match[_-]?id[=:](\d+)/i,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    // If it's just a number, assume it's the match ID
    if (/^\d+$/.test(url.trim())) {
      return url.trim()
    }

    return null
  }
}

/**
 * Create a client instance from environment variables
 */
export function createPlayCricketClient(): PlayCricketClient | null {
  const siteId = process.env.PLAY_CRICKET_SITE_ID
  const apiToken = process.env.PLAY_CRICKET_API_TOKEN

  if (!siteId || !apiToken) {
    console.warn('Play-Cricket credentials not configured')
    return null
  }

  return new PlayCricketClient({ siteId, apiToken })
}
