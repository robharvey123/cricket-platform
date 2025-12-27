import { useAuth } from './useAuth'

type Feature =
  | 'availability_polling'
  | 'team_selection'
  | 'club_payments'
  | 'ai_analyst'
  | 'mega_stats'
  | 'exportable_reports'
  | 'optimal_lineup_ai'

export function useFeatureFlag(feature: Feature): boolean {
  const { profile } = useAuth()
  const flags = profile?.organization?.feature_flags?.features
  return flags?.[feature] === true
}

export function useSubscriptionTier(): 'free' | 'pro' | 'premier' {
  const { profile } = useAuth()
  return profile?.organization?.feature_flags?.tier || 'free'
}

export function useFeatureLimit(limit: 'max_players' | 'max_teams'): number | null {
  const { profile } = useAuth()
  const flags = profile?.organization?.feature_flags
  return flags?.[limit] ?? (limit === 'max_players' ? 25 : 1)
}
