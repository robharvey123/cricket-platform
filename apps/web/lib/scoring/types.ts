// Scoring System Types

export interface ScoringFormula {
  batting: BattingFormula
  bowling: BowlingFormula
  fielding: FieldingFormula
}

export interface BattingFormula {
  per_run: number
  boundary_4: number
  boundary_6: number
  milestones: Milestone[]
  duck_penalty: number
}

export interface BowlingFormula {
  per_wicket: number
  maiden_over: number
  three_for_bonus?: number
  five_for_bonus?: number
  economy_bands?: EconomyBand[]
}

export interface FieldingFormula {
  catch: number
  stumping: number
  runout: number
  drop_penalty: number
  misfield_penalty: number
}

export interface Milestone {
  at: number
  bonus: number
}

export interface EconomyBand {
  min?: number
  max?: number
  bonus?: number
  penalty?: number
}

export interface BattingStats {
  runs: number
  balls: number
  fours: number
  sixes: number
  dismissal?: string
}

export interface BowlingStats {
  overs: number
  maidens: number
  runs: number
  wickets: number
}

export interface FieldingStats {
  catches: number
  stumpings: number
  runouts: number
  drops: number
  misfields: number
}

export interface PointsBreakdown {
  batting: number
  bowling: number
  fielding: number
  total: number
  details: {
    batting?: BattingPointsDetail
    bowling?: BowlingPointsDetail
    fielding?: FieldingPointsDetail
  }
}

export interface BattingPointsDetail {
  runs: number
  boundaries: number
  milestones: number
  penalties: number
}

export interface BowlingPointsDetail {
  wickets: number
  maidens: number
  milestones: number
  economy: number
}

export interface FieldingPointsDetail {
  catches: number
  stumpings: number
  runouts: number
  penalties: number
}
