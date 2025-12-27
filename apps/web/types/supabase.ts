export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          pc_site_id: string | null
          pc_last_sync_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          feature_flags: Json
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          pc_site_id?: string | null
          pc_last_sync_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          feature_flags?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          pc_site_id?: string | null
          pc_last_sync_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          feature_flags?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          avatar_url: string | null
          org_id: string | null
          role: string
          can_keep_wicket: boolean
          preferred_batting_position: number | null
          bowling_type: string | null
          stripe_customer_id: string | null
          payment_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          org_id?: string | null
          role?: string
          can_keep_wicket?: boolean
          preferred_batting_position?: number | null
          bowling_type?: string | null
          stripe_customer_id?: string | null
          payment_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          org_id?: string | null
          role?: string
          can_keep_wicket?: boolean
          preferred_batting_position?: number | null
          bowling_type?: string | null
          stripe_customer_id?: string | null
          payment_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          org_id: string
          name: string
          short_name: string | null
          is_primary: boolean
          season: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          short_name?: string | null
          is_primary?: boolean
          season?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          short_name?: string | null
          is_primary?: boolean
          season?: string | null
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          org_id: string
          team_id: string | null
          opponent: string
          date: string
          time: string | null
          venue: string | null
          is_home: boolean
          pc_match_id: string | null
          status: string
          result: string | null
          availability_deadline: string | null
          selection_status: string
          match_fee_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          team_id?: string | null
          opponent: string
          date: string
          time?: string | null
          venue?: string | null
          is_home?: boolean
          pc_match_id?: string | null
          status?: string
          result?: string | null
          availability_deadline?: string | null
          selection_status?: string
          match_fee_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          team_id?: string | null
          opponent?: string
          date?: string
          time?: string | null
          venue?: string | null
          is_home?: boolean
          pc_match_id?: string | null
          status?: string
          result?: string | null
          availability_deadline?: string | null
          selection_status?: string
          match_fee_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          org_id: string
          email: string
          role: string
          invited_by: string
          token: string
          status: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email: string
          role: string
          invited_by: string
          token?: string
          status?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          role?: string
          invited_by?: string
          token?: string
          status?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          match_id: string
          profile_id: string
          status: string
          reason: string | null
          responded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          profile_id: string
          status: string
          reason?: string | null
          responded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          profile_id?: string
          status?: string
          reason?: string | null
          responded_at?: string
          created_at?: string
        }
      }
      selections: {
        Row: {
          id: string
          match_id: string
          profile_id: string
          batting_position: number | null
          role: string | null
          is_reserve: boolean
          status: string
          notified_at: string | null
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          profile_id: string
          batting_position?: number | null
          role?: string | null
          is_reserve?: boolean
          status?: string
          notified_at?: string | null
          confirmed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          profile_id?: string
          batting_position?: number | null
          role?: string | null
          is_reserve?: boolean
          status?: string
          notified_at?: string | null
          confirmed_at?: string | null
          created_at?: string
        }
      }
      payment_requests: {
        Row: {
          id: string
          org_id: string
          profile_id: string
          match_id: string | null
          type: string
          description: string | null
          amount: number
          due_date: string | null
          status: string
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          profile_id: string
          match_id?: string | null
          type: string
          description?: string | null
          amount: number
          due_date?: string | null
          status?: string
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          profile_id?: string
          match_id?: string | null
          type?: string
          description?: string | null
          amount?: number
          due_date?: string | null
          status?: string
          created_at?: string
          paid_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          org_id: string
          profile_id: string
          payment_request_id: string | null
          stripe_payment_id: string | null
          stripe_invoice_id: string | null
          amount: number
          method: string
          status: string
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          profile_id: string
          payment_request_id?: string | null
          stripe_payment_id?: string | null
          stripe_invoice_id?: string | null
          amount: number
          method?: string
          status?: string
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          profile_id?: string
          payment_request_id?: string | null
          stripe_payment_id?: string | null
          stripe_invoice_id?: string | null
          amount?: number
          method?: string
          status?: string
          notes?: string | null
          recorded_by?: string | null
          created_at?: string
        }
      }
      player_stats: {
        Row: {
          id: string
          org_id: string
          profile_id: string
          match_id: string
          runs_scored: number
          balls_faced: number
          fours: number
          sixes: number
          batting_position: number | null
          how_out: string | null
          overs_bowled: number
          runs_conceded: number
          wickets_taken: number
          maidens: number
          wides: number
          no_balls: number
          catches: number
          run_outs: number
          stumpings: number
          mvp_points: number
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          profile_id: string
          match_id: string
          runs_scored?: number
          balls_faced?: number
          fours?: number
          sixes?: number
          batting_position?: number | null
          how_out?: string | null
          overs_bowled?: number
          runs_conceded?: number
          wickets_taken?: number
          maidens?: number
          wides?: number
          no_balls?: number
          catches?: number
          run_outs?: number
          stumpings?: number
          mvp_points?: number
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          profile_id?: string
          match_id?: string
          runs_scored?: number
          balls_faced?: number
          fours?: number
          sixes?: number
          batting_position?: number | null
          how_out?: string | null
          overs_bowled?: number
          runs_conceded?: number
          wickets_taken?: number
          maidens?: number
          wides?: number
          no_balls?: number
          catches?: number
          run_outs?: number
          stumpings?: number
          mvp_points?: number
          source?: string
          created_at?: string
        }
      }
      player_season_stats: {
        Row: {
          id: string
          org_id: string
          profile_id: string
          season: string
          matches_batted: number
          innings: number
          not_outs: number
          runs_total: number
          highest_score: number
          batting_average: number | null
          strike_rate: number | null
          fifties: number
          hundreds: number
          overs_total: number
          wickets_total: number
          runs_conceded_total: number
          bowling_average: number | null
          economy_rate: number | null
          best_bowling: string | null
          five_wicket_hauls: number
          catches_total: number
          run_outs_total: number
          stumpings_total: number
          mvp_points_total: number
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          profile_id: string
          season: string
          matches_batted?: number
          innings?: number
          not_outs?: number
          runs_total?: number
          highest_score?: number
          batting_average?: number | null
          strike_rate?: number | null
          fifties?: number
          hundreds?: number
          overs_total?: number
          wickets_total?: number
          runs_conceded_total?: number
          bowling_average?: number | null
          economy_rate?: number | null
          best_bowling?: string | null
          five_wicket_hauls?: number
          catches_total?: number
          run_outs_total?: number
          stumpings_total?: number
          mvp_points_total?: number
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          profile_id?: string
          season?: string
          matches_batted?: number
          innings?: number
          not_outs?: number
          runs_total?: number
          highest_score?: number
          batting_average?: number | null
          strike_rate?: number | null
          fifties?: number
          hundreds?: number
          overs_total?: number
          wickets_total?: number
          runs_conceded_total?: number
          bowling_average?: number | null
          economy_rate?: number | null
          best_bowling?: string | null
          five_wicket_hauls?: number
          catches_total?: number
          run_outs_total?: number
          stumpings_total?: number
          mvp_points_total?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalculate_season_stats: {
        Args: {
          p_profile_id: string
          p_season: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
