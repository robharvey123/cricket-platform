/**
 * Play-Cricket API Integration
 *
 * This module provides a TypeScript client for the Play-Cricket API v2,
 * along with utilities for transforming API data into our database schema.
 *
 * Usage:
 * ```typescript
 * import { PlayCricketClient, PlayCricketTransformer } from '@/lib/play-cricket'
 *
 * const client = new PlayCricketClient({
 *   siteId: 'your-site-id',
 *   apiToken: 'your-api-token'
 * })
 *
 * const matches = await client.getResultSummary({ season: '2025' })
 * const match = await client.getMatchDetail('12345')
 * const transformed = PlayCricketTransformer.transformMatch(match, clubId, seasonId, teamId, ourTeamId)
 * ```
 */

export { PlayCricketClient, createPlayCricketClient } from './client'
export { PlayCricketTransformer } from './transformer'
export type {
  PlayCricketConfig,
  ResultSummary,
  ResultSummaryResponse,
  MatchDetail,
  Team,
  Innings,
  BattingCard,
  BowlingCard,
  FieldingEvent,
  PlayCricketError,
  PlayerListItem,
  PlayerListResponse,
} from './types'
export type {
  TransformedMatch,
  TransformedInnings,
  TransformedBattingCard,
  TransformedBowlingCard,
} from './transformer'
