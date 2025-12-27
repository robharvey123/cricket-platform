// Scoring Engine - Calculate points from performance stats

import type {
  ScoringFormula,
  BattingStats,
  BowlingStats,
  FieldingStats,
  PointsBreakdown,
  BattingPointsDetail,
  BowlingPointsDetail,
  FieldingPointsDetail,
} from './types'

// Re-export types for external use
export type { ScoringFormula, BattingStats, BowlingStats, FieldingStats, PointsBreakdown }

/**
 * Calculate batting points from stats
 */
export function calcBattingPoints(
  formula: ScoringFormula['batting'],
  stats: BattingStats
): { points: number; detail: BattingPointsDetail } {
  let total = 0
  const detail: BattingPointsDetail = {
    runs: 0,
    boundaries: 0,
    milestones: 0,
    penalties: 0,
  }

  // Base runs
  const runsPoints = stats.runs * formula.per_run
  detail.runs = runsPoints
  total += runsPoints

  // Boundaries
  const boundariesPoints =
    stats.fours * formula.boundary_4 + stats.sixes * formula.boundary_6
  detail.boundaries = boundariesPoints
  total += boundariesPoints

  // Milestones (50, 100, etc.)
  let milestonesPoints = 0
  for (const milestone of (formula.milestones || [])) {
    if (stats.runs >= milestone.at) {
      milestonesPoints += milestone.bonus
    }
  }
  detail.milestones = milestonesPoints
  total += milestonesPoints

  // Duck penalty
  if (
    stats.runs === 0 &&
    stats.balls > 0 &&
    stats.dismissal &&
    stats.dismissal.toLowerCase() !== 'did not bat' &&
    stats.dismissal.toLowerCase() !== 'not out'
  ) {
    detail.penalties = formula.duck_penalty
    total += formula.duck_penalty // negative value
  }

  return { points: total, detail }
}

/**
 * Calculate bowling points from stats
 */
export function calcBowlingPoints(
  formula: ScoringFormula['bowling'],
  stats: BowlingStats
): { points: number; detail: BowlingPointsDetail } {
  let total = 0
  const detail: BowlingPointsDetail = {
    wickets: 0,
    maidens: 0,
    milestones: 0,
    economy: 0,
  }

  // Wickets
  const wicketsPoints = stats.wickets * formula.per_wicket
  detail.wickets = wicketsPoints
  total += wicketsPoints

  // Maidens
  const maidensPoints = stats.maidens * formula.maiden_over
  detail.maidens = maidensPoints
  total += maidensPoints

  // Milestones (3-for, 5-for)
  let milestonesPoints = 0
  if (formula.three_for_bonus && stats.wickets >= 3) {
    milestonesPoints += formula.three_for_bonus
  }
  if (formula.five_for_bonus && stats.wickets >= 5) {
    milestonesPoints += formula.five_for_bonus
  }
  detail.milestones = milestonesPoints
  total += milestonesPoints

  // Economy bands
  if (stats.overs > 0 && formula.economy_bands) {
    const economy = stats.runs / stats.overs
    let economyPoints = 0

    for (const band of formula.economy_bands) {
      // Bonus for low economy
      if (band.max !== undefined && economy <= band.max && band.bonus) {
        economyPoints += band.bonus
      }
      // Penalty for high economy
      if (band.min !== undefined && economy >= band.min && band.penalty) {
        economyPoints += band.penalty // negative value
      }
    }

    detail.economy = economyPoints
    total += economyPoints
  }

  return { points: total, detail }
}

/**
 * Calculate fielding points from stats
 */
export function calcFieldingPoints(
  formula: ScoringFormula['fielding'],
  stats: FieldingStats
): { points: number; detail: FieldingPointsDetail } {
  let total = 0
  const detail: FieldingPointsDetail = {
    catches: 0,
    stumpings: 0,
    runouts: 0,
    penalties: 0,
  }

  // Catches
  const catchesPoints = stats.catches * formula.catch
  detail.catches = catchesPoints
  total += catchesPoints

  // Stumpings
  const stumpingsPoints = stats.stumpings * formula.stumping
  detail.stumpings = stumpingsPoints
  total += stumpingsPoints

  // Runouts
  const runoutsPoints = stats.runouts * formula.runout
  detail.runouts = runoutsPoints
  total += runoutsPoints

  // Penalties
  const penaltiesPoints =
    stats.drops * formula.drop_penalty +
    stats.misfields * formula.misfield_penalty
  detail.penalties = penaltiesPoints
  total += penaltiesPoints // negative values

  return { points: total, detail }
}

/**
 * Calculate total points for a player's match performance
 */
export function calcTotalPoints(
  formula: ScoringFormula,
  batting: BattingStats,
  bowling: BowlingStats,
  fielding: FieldingStats
): PointsBreakdown {
  const battingResult = calcBattingPoints(formula.batting, batting)
  const bowlingResult = calcBowlingPoints(formula.bowling, bowling)
  const fieldingResult = calcFieldingPoints(formula.fielding, fielding)

  return {
    batting: battingResult.points,
    bowling: bowlingResult.points,
    fielding: fieldingResult.points,
    total: battingResult.points + bowlingResult.points + fieldingResult.points,
    details: {
      batting: battingResult.detail,
      bowling: bowlingResult.detail,
      fielding: fieldingResult.detail,
    },
  }
}

/**
 * Default scoring formula (Brookweald CC standard)
 */
export const DEFAULT_FORMULA: ScoringFormula = {
  meta: {
    match_scope: 'all',
  },
  batting: {
    per_run: 1,
    boundary_4: 1,
    boundary_6: 2,
    milestones: [
      { at: 50, bonus: 10 },
      { at: 100, bonus: 25 },
    ],
    duck_penalty: -10,
  },
  bowling: {
    per_wicket: 15,
    maiden_over: 5,
    three_for_bonus: 10,
    five_for_bonus: 25,
    economy_bands: [
      { max: 3.0, bonus: 10 },
      { min: 8.0, penalty: -10 },
    ],
  },
  fielding: {
    catch: 5,
    stumping: 8,
    runout: 6,
    drop_penalty: -5,
    misfield_penalty: -2,
  },
}
