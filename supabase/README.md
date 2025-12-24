# Supabase Database Setup

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migrations/20241224_multi_tenant_foundation.sql`
4. Click **Run**
5. Then run `seed.sql` to create Brookweald CC

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## After Migration

### 1. Create Your First Club
Run the seed file or manually insert:
```sql
INSERT INTO public.clubs (name, slug, brand, tier, billing_status)
VALUES (
  'Brookweald Cricket Club',
  'brookweald',
  '{"primary_color": "#0ea5e9", "secondary_color": "#1e293b"}'::jsonb,
  'club',
  'active'
) RETURNING id;
```

### 2. Link Your User to the Club
```sql
-- Replace <your-user-id> with your actual auth user ID
-- Replace <club-id> with the ID returned from step 1
INSERT INTO public.user_org_roles (user_id, club_id, role)
VALUES ('<your-user-id>', '<club-id>', 'org_admin');
```

### 3. Create a Team
```sql
INSERT INTO public.teams (club_id, name, competition)
VALUES ('<club-id>', '1st XI', 'Saturday League')
RETURNING id;
```

### 4. Create a Season
```sql
INSERT INTO public.seasons (club_id, name, start_date, end_date, is_active)
VALUES ('<club-id>', '2025 Season', '2025-04-01', '2025-09-30', TRUE)
RETURNING id;
```

### 5. Create Default Scoring Config
```sql
INSERT INTO public.scoring_configs (club_id, name, version, formula_json, is_active)
VALUES ('<club-id>', 'Default Scoring', 1, '{
  "batting": {
    "per_run": 1,
    "boundary_4": 1,
    "boundary_6": 2,
    "milestones": [
      {"at": 50, "bonus": 10},
      {"at": 100, "bonus": 25}
    ],
    "duck_penalty": -10
  },
  "bowling": {
    "per_wicket": 15,
    "maiden_over": 5,
    "three_for_bonus": 10,
    "five_for_bonus": 25,
    "economy_bands": [
      {"max": 3.0, "bonus": 10},
      {"min": 8.0, "penalty": -10}
    ]
  },
  "fielding": {
    "catch": 5,
    "stumping": 8,
    "runout": 6,
    "drop_penalty": -5,
    "misfield_penalty": -2
  }
}'::jsonb, TRUE);
```

## Schema Overview

### Multi-Tenancy
- **clubs**: Organizations (tenants)
- **user_org_roles**: User membership in clubs
- All data is scoped by `club_id` with RLS policies

### Core Entities
- **teams**: Club teams (1st XI, 2nd XI, etc.)
- **seasons**: Cricket seasons
- **players**: Club players
- **squads**: Team membership per season
- **matches**: Match records
- **innings**: Innings data
- **batting_cards**, **bowling_cards**, **fielding_cards**: Performance stats

### Scoring System
- **scoring_configs**: Versioned points formulas (JSON)
- **points_events**: Atomic points tracking

### Zero-Rows Rule
All cards have a `derived` boolean field. When TRUE, it means the row was auto-generated for a player who didn't bat/bowl but was in the squad. This ensures all squad members appear in reports.

## RLS Policies

All tables are protected by Row Level Security (RLS). Users can only see/edit data for clubs they're members of. The helper function `auth.user_club_id()` returns the user's club ID.

## Next Steps

After running the migration:
1. Sign up in your app
2. Get your user ID from Supabase Auth
3. Link yourself to the club using `user_org_roles`
4. Create a team and season
5. Start importing matches!
